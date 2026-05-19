# ⚡ QSO Card Generator — Quick Start (5 minutos)

## Step 1️⃣ Clonar ou descarregar ficheiros

```bash
# Ou descarrega os ficheiros:
# - server.js
# - package.json
# - .env.example
# - QSOCardGeneratorApp.jsx

git clone https://github.com/yourusername/qso-card-generator.git
cd qso-card-generator
```

## Step 2️⃣ Configurar credenciais

```bash
# Copia template .env
cp .env.example .env

# Edita com os teus dados:
nano .env
```

Preenche com:
```env
QRZ_USERNAME=CT3AAN          # Teu callsign
QRZ_PASSWORD=securepass      # Tua password QRZ
EMAIL_ADDRESS=your@email.com
EMAIL_PASSWORD=your_app_pass # App password do Gmail
PORT=3000
```

**ℹ️ Gmail App Password:**
1. Vai a https://myaccount.google.com/apppasswords
2. Seleciona Mail + Windows/Mac/Linux
3. Copia a password gerada
4. Cola em EMAIL_PASSWORD

## Step 3️⃣ Instalar e iniciar backend

```bash
# Instala dependências
npm install

# Inicia servidor
npm run dev
```

Output esperado:
```
🚀 QSO Card Generator Backend running on port 3000
Available templates: classic, minimal, retro, neon
```

## Step 4️⃣ (Opcional) Iniciar frontend local

Em outro terminal:

```bash
# Se tens Vite project setup:
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

Ou apenas testa o backend com curl:

```bash
# Health check
curl http://localhost:3000/health
# Output: {"status":"OK","message":"QSO Card Generator Backend running"}

# Listar templates
curl http://localhost:3000/api/templates
# Output: [{"id":"classic","name":"Classic Blue",...}]
```

## Step 5️⃣ Testar com ADIF

### Opção A: Usar cURL (rápido)

```bash
curl -X POST http://localhost:3000/api/adif/parse \
  -H "Content-Type: application/json" \
  -d '{"adifText":"<call:4>W5XY<band:3>20m<mode:3>SSB<qso_date:8>20240115<time_on:4>1530<eor>"}'
```

### Opção B: Usar Node.js script

Cria `test.js`:

```javascript
const axios = require('axios');

async function test() {
  try {
    // 1. Parse ADIF
    const parseRes = await axios.post('http://localhost:3000/api/adif/parse', {
      adifText: '<call:4>W5XY<band:3>20m<mode:3>SSB<qso_date:8>20240115<time_on:4>1530<eor>'
    });
    console.log('✓ Parsed:', parseRes.data.qsos.length, 'QSOs');

    // 2. Authenticate QRZ
    const authRes = await axios.post('http://localhost:3000/api/auth/qrz', {
      username: 'YOUR_CALLSIGN',
      password: 'YOUR_PASSWORD'
    });
    console.log('✓ QRZ:', authRes.data.message);

    // 3. Generate PDF
    const pdfRes = await axios.post(
      'http://localhost:3000/api/card/generate-pdf',
      {
        qsoData: {
          call: 'W5XY',
          name: 'John Smith',
          qso_date: '20240115',
          time_on: '1530',
          band: '20m',
          mode: 'SSB',
          freq: '14.234',
          rst_sent: '59',
          rst_rcvd: '59',
          station_callsign: 'CT3AAN'
        },
        template: 'classic'
      },
      { responseType: 'arraybuffer' }
    );
    
    const fs = require('fs');
    fs.writeFileSync('test-card.pdf', pdfRes.data);
    console.log('✓ PDF generated: test-card.pdf');
  } catch (error) {
    console.error('❌', error.response?.data || error.message);
  }
}

test();
```

Corre:
```bash
node test.js
```

## Troubleshooting Rápido

### ❌ "Cannot find module 'express'"
```bash
npm install
```

### ❌ "QRZ Password incorrect"
- Verifica credentials em QRZ.com
- Confirma que tens XML Logbook Data subscription
- Username é o teu callsign (ex: CT3AAN)

### ❌ "Gmail auth failed"
- Vai a https://myaccount.google.com/apppasswords
- Gera novo App Password
- Usa ESSE password, não o da conta principal

### ❌ "Port 3000 already in use"
```bash
# Muda PORT em .env:
PORT=3001

# Ou mata o processo:
lsof -i :3000
kill -9 <PID>
```

### ❌ ADIF Parse error
Confirma formato:
```
<fieldname:length>value<fieldname:length>value<eor>
```

Sem espaços! Cada record termina com `<eor>`.

## Próximos Passos

### 🎨 Customizar Templates

Edit `server.js`, função `CARD_TEMPLATES`:

```javascript
const CARD_TEMPLATES = {
  mytemplate: {
    name: 'My Custom',
    colors: {
      primary: '#FF0000',
      secondary: '#FFCCCC',
      text: '#000000',
      textLight: '#666666'
    },
    layout: 'two-column',
    logo: '📻'
  }
}
```

### 📧 Customizar Email

Edit função `sendQSOCard()` em `server.js` para mudar conteúdo do email HTML.

### 🐳 Deploy com Docker

```bash
# Build image
docker build -t qso-card-generator .

# Run
docker run -p 3000:3000 \
  -e QRZ_USERNAME=CT3AAN \
  -e QRZ_PASSWORD=secret \
  -e EMAIL_ADDRESS=your@email.com \
  -e EMAIL_PASSWORD=apppass \
  qso-card-generator
```

Ou com docker-compose:
```bash
docker-compose up
```

### ☁️ Deploy em Heroku

```bash
heroku create qso-cards
heroku config:set QRZ_USERNAME=CT3AAN
heroku config:set QRZ_PASSWORD=secret
heroku config:set EMAIL_ADDRESS=your@email.com
heroku config:set EMAIL_PASSWORD=apppass
git push heroku main
```

## Documentação Completa

- **README.md** — Setup detalhado, configuração, deployment
- **EXAMPLES.md** — Scripts, receitas, integrações
- **server.js** — Backend com comentários
- **QSOCardGeneratorApp.jsx** — Frontend React

## Suporte Rápido

| Problema | Solução |
|----------|---------|
| Backend não inicia | Verifica `npm install` e PORT disponível |
| QRZ falha | Confirma username=callsign, password correcta |
| Email não envia | Gera App Password Gmail, verifica SMTP |
| PDF vazio | Confirma qsoData tem campos obrigatórios |
| ADIF parse erro | Valida formato com `<eor>` no final |

## Demo Rápida (sem backend)

Teste a UI React em modo estático:

```bash
# Instala dependências
npm install react

# Cria arquivo React teste
cat > demo.html << 'EOF'
<div id="root"></div>
<script type="importmap">
{"imports": {"react": "https://cdn.jsdelivr.net/npm/react@18/+esm"}}
</script>
<script type="module">
  import React from 'react';
  const App = () => <div>QSO Card Generator Demo</div>;
  document.getElementById('root').innerHTML = '<h1>Ready!</h1>';
</script>
EOF

# Abre em browser
open demo.html
```

---

**Pronto!** 🚀

Tens um sistema completo de geração e envio automático de cartões QSO.

Para questões detalhadas, ver **README.md** ou **EXAMPLES.md**.

**73!** — CT3AAN
