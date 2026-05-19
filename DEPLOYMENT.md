# 🚀 QSO Card Generator — Deployment Guide

Guia completo para colocar o QSO Card Generator em produção.

## Pre-Deployment Checklist

- [ ] Node.js 16+ instalado
- [ ] QRZ.com account com subscription XML Logbook Data
- [ ] Email app password configurada (Gmail ou outro serviço)
- [ ] Credenciais de QRZ e email testadas localmente
- [ ] ADIF test file preparada para validação
- [ ] Backend `.env` criado com todas as variáveis
- [ ] Frontend `VITE_API_URL` configurada para backend

## Local Testing

Antes de fazer deploy em produção:

```bash
# 1. Instalar dependências
npm install

# 2. Criar .env e preencher credenciais
cp .env.example .env
# Edit .env com valores reais

# 3. Iniciar backend
npm run dev
# Confirmação esperada: "🚀 QSO Card Generator Backend running on port 3000"

# 4. Testar health check
curl http://localhost:3000/health
# Output: {"status":"OK","message":"QSO Card Generator Backend running"}

# 5. Testar QRZ auth
curl -X POST http://localhost:3000/api/auth/qrz \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_CALL","password":"YOUR_PASS"}'
# Output: {"success":true,"sessionKey":"...","message":"Logged in as..."}

# 6. Testar ADIF parse
curl -X POST http://localhost:3000/api/adif/parse \
  -H "Content-Type: application/json" \
  -d '{"adifText":"<call:4>W5XY<qso_date:8>20240115<eor>"}'
# Output: {"success":true,"qsos":[...],"count":1}

# 7. Testar geração de PDF
curl -X POST http://localhost:3000/api/card/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"qsoData":{"call":"W5XY","qso_date":"20240115","time_on":"1530","band":"20m","mode":"SSB","freq":"14.234"},"template":"classic"}' \
  --output test.pdf
# Deve gerar ficheiro PDF válido

# ✓ Se todos os testes passarem, está pronto para deploy!
```

## Docker Deployment

### Build Local Image

```bash
# Build image
docker build -t qso-card-generator:latest .

# Test image locally
docker run -p 3000:3000 \
  -e QRZ_USERNAME=YOUR_CALL \
  -e QRZ_PASSWORD=your_password \
  -e EMAIL_ADDRESS=your@email.com \
  -e EMAIL_PASSWORD=app_password \
  qso-card-generator:latest
```

### Deploy to Heroku

```bash
# 1. Login to Heroku
heroku login

# 2. Create app
heroku create qso-card-generator

# 3. Set environment variables
heroku config:set QRZ_USERNAME=YOUR_CALL
heroku config:set QRZ_PASSWORD=your_password
heroku config:set EMAIL_ADDRESS=your@email.com
heroku config:set EMAIL_PASSWORD=app_password
heroku config:set PORT=3000
heroku config:set NODE_ENV=production

# 4. Deploy
git push heroku main

# 5. View logs
heroku logs --tail

# 6. Test production
curl https://qso-card-generator.herokuapp.com/health
```

**Procfile** (required for Heroku):
```
web: node server.js
```

### Docker Compose (Local + Production)

```bash
# Create .env file
cp .env.example .env
# Edit .env com valores

# Start services
docker-compose up

# Visit http://localhost:5173 (frontend) or http://localhost:3000 (API)

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## AWS Deployment (EC2)

```bash
# 1. SSH into EC2 instance
ssh -i key.pem ubuntu@your-instance-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 (process manager)
sudo npm install -g pm2

# 4. Clone or upload code
git clone https://github.com/yourrepo/qso-card-generator.git
cd qso-card-generator

# 5. Install dependencies
npm install --production

# 6. Create .env
cp .env.example .env
# Edit with production values

# 7. Start with PM2
pm2 start server.js --name "qso-cards"
pm2 startup
pm2 save

# 8. Setup reverse proxy (Nginx)
sudo apt-get install -y nginx

# Create /etc/nginx/sites-available/qso-cards:
sudo tee /etc/nginx/sites-available/qso-cards > /dev/null << 'EOF'
upstream qso_backend {
  server localhost:3000;
}

server {
  listen 80;
  server_name qso-cards.example.com;

  location / {
    proxy_pass http://qso_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
EOF

# 9. Enable site
sudo ln -s /etc/nginx/sites-available/qso-cards /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. SSL with Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d qso-cards.example.com
```

## Railway Deployment

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Add environment variables
railway variables add QRZ_USERNAME YOUR_CALL
railway variables add QRZ_PASSWORD your_password
railway variables add EMAIL_ADDRESS your@email.com
railway variables add EMAIL_PASSWORD app_password

# 5. Deploy
railway up

# 6. Get URL
railway variables show
# URL will be in logs
```

## Vercel Deployment (Frontend Only)

Se quiseres hospedar o frontend em Vercel e backend separadamente:

```bash
# 1. Create Vite project
npm create vite@latest qso-cards-ui -- --template react
cd qso-cards-ui
npm install

# 2. Copy React component
cp QSOCardGeneratorApp.jsx src/App.jsx

# 3. Create vercel.json
cat > vercel.json << 'EOF'
{
  "env": {
    "VITE_API_URL": "@api_url"
  }
}
EOF

# 4. Deploy
vercel

# 5. Configure environment variable in Vercel dashboard
# VITE_API_URL = https://your-backend.herokuapp.com
```

## Production Environment Variables

**.env (Production)**
```env
# QRZ — MANTER SECRETO!
QRZ_USERNAME=your_callsign
QRZ_PASSWORD=very_secure_password

# Email — app-specific password
EMAIL_SERVICE=gmail
EMAIL_ADDRESS=your@gmail.com
EMAIL_PASSWORD=app_specific_password

# Server
PORT=3000
NODE_ENV=production

# CORS — apenas dominios autorizados
ALLOWED_ORIGINS=https://qso-cards.example.com,https://app.example.com

# Rate Limiting (optional)
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

## Security Hardening

### 1. Environment Variables

✅ **Never commit `.env` to git:**
```bash
echo ".env" >> .gitignore
echo "*.log" >> .gitignore
```

✅ **Use secrets manager:**
- Heroku Config Vars
- AWS Secrets Manager
- Railway Variables
- Vercel Environment Variables

### 2. HTTPS Only

Em produção, SEMPRE use HTTPS:

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});
```

### 3. CORS Configuration

Whitelist apenas dominios confiáveis:

```javascript
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 4. Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máx 100 requests por IP
});

app.use('/api/', limiter);
```

### 5. Input Validation

```bash
npm install joi
```

```javascript
import Joi from 'joi';

const adifSchema = Joi.object({
  adifText: Joi.string().max(1000000).required()
});

app.post('/api/adif/parse', (req, res) => {
  const { error, value } = adifSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // ... process
});
```

### 6. Logging & Monitoring

```bash
npm install winston
```

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log every API request
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
  next();
});
```

## Monitoring & Health Checks

### PM2 Monitoring

```bash
# Install PM2+
npm install -g pm2-plus

# Start PM2 monitoring
pm2 plus

# View dashboard at app.pm2.io
```

### Custom Health Check

```javascript
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node: process.version
  };
  res.json(health);
});

// Heroku health check
// Configure in app.json or Procfile
```

### Sentry for Error Tracking

```bash
npm install @sentry/node
```

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.requestHandler());
// ... your routes ...
app.use(Sentry.Handlers.errorHandler());
```

## Troubleshooting Production

### Backend não responde

```bash
# 1. Check status
heroku ps (Heroku)
pm2 status (PM2)
docker logs qso-card-generator (Docker)

# 2. View logs
heroku logs --tail
pm2 logs qso-cards
docker-compose logs -f api

# 3. Restart
heroku restart
pm2 restart qso-cards
docker-compose restart api
```

### QRZ connection fails

```bash
# 1. Verify credentials in production
heroku config:get QRZ_USERNAME
heroku config:get QRZ_PASSWORD

# 2. Test manually
curl -X POST https://qso-cards.example.com/api/auth/qrz \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_CALL","password":"YOUR_PASSWORD"}'

# 3. Check firewall/network
# Ensure port 443 (HTTPS) is allowed to qrz.com
```

### Email not sending

```bash
# 1. Verify credentials
heroku config:get EMAIL_ADDRESS
heroku config:get EMAIL_PASSWORD

# 2. Check email service logs
# Gmail: check browser.google.com for "less secure access"
# Setup app-specific password

# 3. Test SMTP connection
telnet smtp.gmail.com 587
# Should connect, then: quit
```

### Memory issues

```bash
# Check memory usage
pm2 monit

# Increase Node memory
export NODE_OPTIONS=--max-old-space-size=512
node server.js

# Or in Procfile:
web: node --max-old-space-size=512 server.js
```

## Database Integration (Future)

Se quiser guardar histórico de QSOs:

```bash
npm install mongoose dotenv
```

```javascript
import mongoose from 'mongoose';

const qsoSchema = new mongoose.Schema({
  call: String,
  date: Date,
  band: String,
  mode: String,
  frequency: Number,
  rstSent: String,
  rstRcvd: String,
  createdAt: { type: Date, default: Date.now }
});

const QSO = mongoose.model('QSO', qsoSchema);

// Connect
mongoose.connect(process.env.MONGODB_URI);

// Save QSO
app.post('/api/qso/save', async (req, res) => {
  const qso = new QSO(req.body);
  await qso.save();
  res.json({ success: true });
});
```

## Performance Optimization

### 1. Caching

```bash
npm install redis
```

```javascript
import redis from 'redis';

const client = redis.createClient({ url: process.env.REDIS_URL });
await client.connect();

// Cache QRZ lookups (1 hora)
app.post('/api/qrz/lookup', async (req, res) => {
  const cacheKey = `qrz:${req.body.callsign}`;
  const cached = await client.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  // ... lookup QRZ ...
  
  await client.setEx(cacheKey, 3600, JSON.stringify(result));
  res.json(result);
});
```

### 2. PDF Generation Optimization

```javascript
// Process em background com Bull queue
import Bull from 'bull';

const pdfQueue = new Bull('pdf-generation', process.env.REDIS_URL);

pdfQueue.process(async (job) => {
  const pdf = await generateCardPDF(job.data);
  return { success: true, pdf };
});

// Queue job
app.post('/api/cards/generate-async', async (req, res) => {
  const job = await pdfQueue.add(req.body);
  res.json({ jobId: job.id });
});
```

### 3. Load Balancing

```javascript
// app.js or Procfile
// Para Heroku: escala automaticamente
heroku ps:scale web=3

// Para AWS: use Elastic Load Balancing
// Para Railway: automático com múltiplas replicas
```

## Backup & Recovery

```bash
# Backup environment variables
heroku config -s > backup.env  # NUNCA commit!

# Backup database (se usando MongoDB)
mongodump --uri="mongodb+srv://..." --out ./backup

# Backup logs
heroku logs -n 10000 > production.log

# Database snapshots
# MongoDB Atlas: automatic daily backups
# AWS RDS: automatic daily snapshots
```

## Roadmap — Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] User accounts & authentication
- [ ] API key management
- [ ] QSL card image upload
- [ ] Integration com TQSL (LoTW)
- [ ] Mobile app (React Native)
- [ ] Scheduled batch processing
- [ ] Export para múltiplos formatos
- [ ] Analytics & reporting

---

**Production ready!** 🎉

Se tiveres questões, ver README.md ou EXAMPLES.md.

**73!** — CT3AAN
