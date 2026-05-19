# 📻 QSO Card Generator

Professional QSO card generation with QRZ integration, customizable templates, and automated email delivery.

## Features

✅ **ADIF Import** — Parse logs from any amateur radio logger (WSJT-X, N1MM, TQSL, etc.)  
✅ **QRZ Integration** — Real-time callsign lookup with auto-enrichment (name, address, email)  
✅ **PDF Generation** — Beautiful, customizable QSO cards with multiple design templates  
✅ **Email Delivery** — Automatic sending to correspondents with PDF attachments  
✅ **Batch Processing** — Process hundreds of QSOs in one operation  
✅ **Template System** — 4 built-in themes (Classic, Minimal, Retro, Neon) with custom colors  

## Architecture

```
┌─────────────────────────────┐
│   React Frontend            │
│   (QSOCardGeneratorApp.jsx) │
└────────────┬────────────────┘
             │ HTTP/REST
             ↓
┌─────────────────────────────┐
│   Node.js Backend           │
│   (server.js)               │
├─────────────────────────────┤
│ • ADIF Parser               │
│ • QRZ API Client            │
│ • PDF Generator (PDFKit)    │
│ • Email Service (Nodemailer)│
└─────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- QRZ.com account with XML Logbook Data subscription (~$36/year)
- Gmail or email service with app passwords

### 1. Backend Setup

```bash
# Clone or download the files
cd qso-card-generator

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required in `.env`:**
```
QRZ_USERNAME=your_qrz_callsign
QRZ_PASSWORD=your_qrz_password
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
PORT=3000
```

**For Gmail:**
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Generate an app-specific password
3. Use this password in `.env`, NOT your main Gmail password

### 2. Start Backend

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server should be running at `http://localhost:3000`

### 3. Frontend Setup

If using as a separate React app (Vite):

```bash
# Create Vite project
npm create vite@latest qso-cards -- --template react
cd qso-cards
npm install

# Copy QSOCardGeneratorApp.jsx to src/
cp QSOCardGeneratorApp.jsx src/App.jsx

# Add to vite.config.js:
export default {
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000')
  }
}

# Run
npm run dev
```

Then open `http://localhost:5173`

## API Endpoints

### Authentication
- **POST** `/api/auth/qrz` — Authenticate with QRZ
- **POST** `/api/qrz/lookup` — Lookup single callsign

### ADIF Processing
- **POST** `/api/adif/parse` — Parse ADIF text

### PDF Generation
- **POST** `/api/card/generate-pdf` — Generate single PDF card
- **POST** `/api/cards/process-batch` — Process batch with QRZ enrichment & email

### Templates
- **GET** `/api/templates` — List available card templates

### Health
- **GET** `/health` — Server status

## Usage Workflow

### 1. Authenticate with QRZ
- Enter QRZ username & password
- System tests connection and creates session
- Session valid for 12 hours

### 2. Import ADIF
- Export log from your logging software (WSJT-X, N1MM, etc.)
- Paste ADIF text or upload file
- Parser extracts callsign, date, time, freq, mode, RST, band

### 3. Select Template
- Choose card design (Classic, Minimal, Retro, Neon)
- Preview color scheme
- Templates are fully customizable

### 4. Configure Email
- Enter email address & app password
- Supported: Gmail, Outlook, Yahoo, custom SMTP
- Security: credentials only used during processing, never stored

### 5. Process Batch
- System queries QRZ for each callsign
- Auto-enriches with name, address, location, email
- Generates PDF with selected template
- Sends email with PDF attachment
- Tracks success/failure per QSO

## Card Templates

### Classic Blue
Professional design with blue header, two-column layout
- Primary: `#1E90FF` (Dodger Blue)
- Secondary: `#F0F8FF` (Alice Blue)

### Minimal Black
Clean, minimalist single-column design
- Primary: `#000000`
- Secondary: `#FFFFFF`

### Retro Vintage
Vintage amateur radio aesthetic
- Primary: `#8B4513` (Saddle Brown)
- Secondary: `#FFF8DC` (Cornsilk)

### Neon Purple
Modern, vibrant design
- Primary: `#9D4EDD`
- Secondary: `#F3E5FF`

### Custom Templates

To add your own template, edit `CARD_TEMPLATES` in `server.js`:

```javascript
const CARD_TEMPLATES = {
  mytemplate: {
    name: 'My Custom Template',
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

## ADIF Format

The ADIF (Amateur Data Interchange Format) is the standard for ham radio logs.

**Example ADIF:**
```
<call:4>W5XY<band:3>20m<mode:3>SSB<qso_date:8>20240115<time_on:4>1530<freq:7>14.234<rst_sent:3>59<rst_rcvd:3>59<comment:15>Great signal OM!<eor>
```

**Common fields extracted:**
- `call` — Correspondent's callsign
- `qso_date` — Date (YYYYMMDD)
- `time_on` — Time UTC (HHMM)
- `band` — Radio band (20m, 40m, etc.)
- `freq` — Frequency in MHz
- `mode` — Mode (SSB, CW, FT8, etc.)
- `rst_sent` / `rst_rcvd` — Signal reports
- `comment` — Notes

## Configuration

### Email Services

#### Gmail
```env
EMAIL_SERVICE=gmail
EMAIL_ADDRESS=your.email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # App-specific password
```

#### Outlook
```env
EMAIL_SERVICE=outlook
EMAIL_ADDRESS=your.email@outlook.com
EMAIL_PASSWORD=your_password
```

#### Custom SMTP
```env
EMAIL_SERVICE=smtp
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
```

### Environment Variables

```bash
# QRZ
QRZ_USERNAME=your_callsign      # QRZ login
QRZ_PASSWORD=your_password      # QRZ password

# Email
EMAIL_SERVICE=gmail             # Service provider
EMAIL_ADDRESS=your@email.com    # Sender email
EMAIL_PASSWORD=app_password     # App password (not main password!)

# Server
PORT=3000                       # Server port
NODE_ENV=development            # Environment

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Batch Processing Example

```javascript
const batch = {
  qsos: [
    {
      call: 'W5XYZ',
      qso_date: '20240115',
      time_on: '1530',
      band: '20m',
      mode: 'SSB',
      freq: '14.234',
      rst_sent: '59',
      rst_rcvd: '59'
    }
    // ... more QSOs
  ],
  qrzUsername: 'CT3AAN',
  qrzPassword: 'secret',
  emailConfig: {
    service: 'gmail',
    email: 'my@email.com',
    password: 'app_password'
  },
  template: 'classic'
};

const response = await fetch('http://localhost:3000/api/cards/process-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(batch)
});

const result = await response.json();
console.log(`Generated: ${result.summary.totalGenerated}`);
console.log(`Sent: ${result.summary.totalSent}`);
```

## Troubleshooting

### QRZ Authentication Fails
- **Issue**: "Password incorrect"
- **Solution**: Double-check credentials at qrz.com
- Ensure you have XML Logbook Data subscription
- Check that username is your callsign, not email

### Email Not Sending
- **Gmail**: Use App Password from myaccount.google.com/apppasswords
- **Outlook**: Enable "Less secure apps" or use app password
- **Check**: Firewall/network blocking port 587 (SMTP)

### ADIF Parse Error
- Ensure all fields have proper format: `<fieldname:length>value`
- Every record must end with `<eor>`
- Check for special characters in notes that need escaping

### PDF Quality Issues
- Adjust colors in template definition
- PDFKit has font limitations — use standard fonts (Helvetica, Times, Courier)
- For images: convert to base64 and embed

## Security Considerations

⚠️ **Important:**

- Credentials are **only used during batch processing** and not stored
- Frontend never has direct access to QRZ/email passwords
- All communication over HTTPS in production
- Use `.env` for secrets, never commit to version control
- Email passwords should be app-specific, not main account passwords

## Development

### Project Structure

```
├── server.js                 # Express backend
├── QSOCardGeneratorApp.jsx  # React frontend
├── package.json             # Dependencies
├── .env.example             # Template for environment
└── README.md               # This file
```

### Dependencies

**Backend:**
- `express` — Web framework
- `axios` — HTTP client for QRZ API
- `xml2js` — XML parsing for QRZ responses
- `pdfkit` — PDF generation
- `nodemailer` — Email delivery
- `cors` — Cross-origin requests
- `dotenv` — Environment variable loading

**Frontend:**
- `react` — UI library
- `vite` — Build tool

### API Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL) for log storage
- [ ] Automatic LoTW integration
- [ ] QSO card printer support (thermal printer)
- [ ] Mobile app (React Native)
- [ ] Webhook integration (external services)
- [ ] Batch email with tracking
- [ ] PDF watermarking with call sign
- [ ] Multi-language support (pt-PT, en-US, etc.)

## Support

For issues or questions:
1. Check QRZ credentials are correct
2. Verify email app password is set up
3. Review server logs: `npm run dev`
4. Check browser console for errors
5. Test ADIF format validity

## License

MIT — Feel free to use and modify for your amateur radio station!

## Credits

Built for radioamateurs by radioamateurs.

**73!**

---

**Last updated:** May 2026  
**Author:** CR7BUI - Associação de Radioamadores do Oeste (ARADO)
