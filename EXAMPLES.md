# 📖 QSO Card Generator — Examples & Recipes

Exemplos práticos e receitas para usar o QSO Card Generator.

## Exemplo 1: Processamento Simples de ADIF

### Export de WSJT-X

1. Abre WSJT-X
2. Menu → File → Export All
3. Seleciona formato ADIF
4. Copia o conteúdo para a aplicação

### Script Node.js para testar

```javascript
const axios = require('axios');

async function testQSOProcessing() {
  const adifData = `
    <call:4>W5XY<band:3>20m<mode:3>SSB<qso_date:8>20240115<time_on:4>1530<freq:7>14.234<rst_sent:3>59<rst_rcvd:3>59<eor>
    <call:5>EA1AA<band:3>40m<mode:2>CW<qso_date:8>20240115<time_on:4>1600<freq:7>7.030<rst_sent:3>589<rst_rcvd:3>599<eor>
  `;

  // Parse ADIF
  const parseRes = await axios.post('http://localhost:3000/api/adif/parse', {
    adifText: adifData
  });

  console.log(`✓ Parsed ${parseRes.data.qsos.length} QSOs`);
  
  // Authenticate QRZ
  const authRes = await axios.post('http://localhost:3000/api/auth/qrz', {
    username: 'YOUR_CALLSIGN',
    password: 'YOUR_PASSWORD'
  });

  if (!authRes.data.success) {
    console.error('QRZ auth failed:', authRes.data.error);
    return;
  }

  console.log('✓ QRZ authenticated');

  // Process batch
  const batchRes = await axios.post('http://localhost:3000/api/cards/process-batch', {
    qsos: parseRes.data.qsos,
    qrzUsername: 'YOUR_CALLSIGN',
    qrzPassword: 'YOUR_PASSWORD',
    emailConfig: {
      service: 'gmail',
      email: 'your@email.com',
      password: 'your_app_password'
    },
    template: 'classic'
  });

  console.log('Batch results:', batchRes.data);
}

testQSOProcessing().catch(console.error);
```

## Exemplo 2: Geração de PDF sem Email

Se queres gerar PDFs mas não enviar email (p.ex. para imprimir):

```javascript
const fs = require('fs');
const axios = require('axios');

async function generatePDFsOnly() {
  const qso = {
    call: 'W5XYZ',
    name: 'John Smith',
    qso_date: '20240115',
    time_on: '1530',
    band: '20m',
    mode: 'SSB',
    freq: '14.234',
    rst_sent: '59',
    rst_rcvd: '59',
    city: 'Dallas',
    state: 'TX',
    country: 'USA',
    station_callsign: 'CT3AAN'
  };

  try {
    const response = await axios.post(
      'http://localhost:3000/api/card/generate-pdf',
      {
        qsoData: qso,
        template: 'retro'
      },
      {
        responseType: 'arraybuffer'
      }
    );

    const filename = `QSO-${qso.call}-${qso.qso_date}.pdf`;
    fs.writeFileSync(filename, response.data);
    console.log(`✓ Generated ${filename}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

generatePDFsOnly();
```

## Exemplo 3: Integração com Home Assistant

Se tens Home Assistant e queres guardar histórico de QSOs:

```javascript
// Script para correr no Home Assistant
const axios = require('axios');

async function saveQSOToHomeAssistant(qso, haToken) {
  const payload = {
    call: qso.call,
    date: qso.qso_date,
    time: qso.time_on,
    band: qso.band,
    mode: qso.mode,
    frequency: qso.freq,
    rst_sent: qso.rst_sent,
    rst_rcvd: qso.rst_rcvd,
    name: qso.name,
    country: qso.country,
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(
      'http://192.168.216.10:8123/api/states/sensor.qso_log',
      {
        state: qso.call,
        attributes: payload
      },
      {
        headers: {
          'Authorization': `Bearer ${haToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✓ QSO saved to Home Assistant: ${qso.call}`);
  } catch (error) {
    console.error('Error saving to HA:', error.message);
  }
}
```

## Exemplo 4: Batch Processing via CLI

Script Node.js para processar logs directo do terminal:

```bash
#!/usr/bin/env node

const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function processBatch(adifFile, options) {
  const adifText = fs.readFileSync(adifFile, 'utf-8');

  console.log('🚀 QSO Card Generator — Batch Processing\n');
  console.log(`📋 File: ${path.basename(adifFile)}`);

  // Parse
  const parseRes = await axios.post('http://localhost:3000/api/adif/parse', {
    adifText
  });

  console.log(`✓ Parsed ${parseRes.data.qsos.length} QSOs\n`);

  // Authenticate
  const authRes = await axios.post('http://localhost:3000/api/auth/qrz', {
    username: options.qrzUsername,
    password: options.qrzPassword
  });

  if (!authRes.data.success) {
    console.error('❌ QRZ authentication failed');
    process.exit(1);
  }

  console.log('✓ QRZ authenticated\n');

  // Process
  console.log(`🔄 Processing ${parseRes.data.qsos.length} QSOs...`);
  const startTime = Date.now();

  const batchRes = await axios.post('http://localhost:3000/api/cards/process-batch', {
    qsos: parseRes.data.qsos,
    qrzUsername: options.qrzUsername,
    qrzPassword: options.qrzPassword,
    emailConfig: {
      service: options.emailService,
      email: options.emailAddress,
      password: options.emailPassword
    },
    template: options.template || 'classic'
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✓ Completed in ${duration}s\n`);
  console.log(`📊 Summary:`);
  console.log(`   PDFs Generated: ${batchRes.data.summary.totalGenerated}`);
  console.log(`   Emails Sent: ${batchRes.data.summary.totalSent}`);
  console.log(`   Errors: ${batchRes.data.summary.errors.length}`);

  if (batchRes.data.summary.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    batchRes.data.summary.errors.forEach(e => {
      console.log(`   ${e.call}: ${e.errors.join(', ')}`);
    });
  }
}

// CLI
const yargs = require('yargs');
yargs
  .command(
    'process <file>',
    'Process ADIF file and send QSO cards',
    (y) => y.positional('file', { describe: 'ADIF file path' }),
    async (argv) => {
      await processBatch(argv.file, {
        qrzUsername: process.env.QRZ_USERNAME,
        qrzPassword: process.env.QRZ_PASSWORD,
        emailService: process.env.EMAIL_SERVICE || 'gmail',
        emailAddress: process.env.EMAIL_ADDRESS,
        emailPassword: process.env.EMAIL_PASSWORD,
        template: argv.template || 'classic'
      });
    }
  )
  .option('template', {
    alias: 't',
    describe: 'Card template (classic, minimal, retro, neon)',
    default: 'classic'
  })
  .demandCommand()
  .argv;
```

Use assim:
```bash
chmod +x qso-batch.js
./qso-batch.js process mylog.adif --template retro
```

## Exemplo 5: Custom Email Template

Modificar o corpo do email em `server.js`:

```javascript
const mailOptions = {
  from: emailConfig.email,
  to: recipient,
  subject: `QSO Card - ${qsoData.call} (${formatDate(qsoData.qso_date, qsoData.time_on)})`,
  html: `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #1E90FF;">📻 QSO Card</h1>
        
        <p>Dear <strong>${qsoData.name || 'OM/YL'}</strong>,</p>
        
        <p>Thank you for the <strong>QSO</strong> on 
        <span style="background: #F0F8FF; padding: 2px 6px; border-radius: 3px;">
          ${formatDate(qsoData.qso_date, qsoData.time_on)}
        </span></p>

        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #F0F8FF;">
            <td style="padding: 8px; border: 1px solid #1E90FF; font-weight: bold;">Frequency</td>
            <td style="padding: 8px; border: 1px solid #1E90FF;">${qsoData.freq || qsoData.band}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #1E90FF; font-weight: bold;">Mode</td>
            <td style="padding: 8px; border: 1px solid #1E90FF;">${qsoData.mode}</td>
          </tr>
          <tr style="background: #F0F8FF;">
            <td style="padding: 8px; border: 1px solid #1E90FF; font-weight: bold;">RST</td>
            <td style="padding: 8px; border: 1px solid #1E90FF;">${qsoData.rst_sent || '59'} / ${qsoData.rst_rcvd || '59'}</td>
          </tr>
        </table>

        <p>Please find your QSO card attached as PDF. Print it and add to your QSL collection!</p>

        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          <strong>73,</strong><br/>
          ${qsoData.station_callsign || 'CT3AAN'}<br/>
          <em>Generated by QSO Card Generator</em>
        </p>
      </body>
    </html>
  `,
  attachments: [...]
};
```

## Exemplo 6: Template Customizado

Adicionar novo template visual:

```javascript
const CARD_TEMPLATES = {
  // ... existing templates
  
  custom_purple: {
    name: 'Custom Purple Theme',
    colors: {
      primary: '#6A0DAD',      // Purple
      secondary: '#F3E5FB',    // Light Purple
      text: '#3D0066',         // Dark Purple
      textLight: '#9D7BBC'     // Medium Purple
    },
    layout: 'two-column',
    logo: '⚡'
  }
};

// Depois use assim:
// POST /api/card/generate-pdf
// { qsoData: {...}, template: 'custom_purple' }
```

## Exemplo 7: Scheduled Processing com Node Cron

Para processar logs automaticamente em horários específicos:

```javascript
const cron = require('node-cron');
const fs = require('fs');
const axios = require('axios');

// Corre todos os dias às 22h (10 PM)
cron.schedule('0 22 * * *', async () => {
  console.log('📻 Starting scheduled QSO processing...');

  const logFile = 'daily_qsos.adif';
  
  if (!fs.existsSync(logFile)) {
    console.log('ℹ️  No log file found, skipping');
    return;
  }

  try {
    const adifText = fs.readFileSync(logFile, 'utf-8');

    // Parse
    const parseRes = await axios.post('http://localhost:3000/api/adif/parse', {
      adifText
    });

    if (parseRes.data.qsos.length === 0) {
      console.log('ℹ️  No QSOs to process');
      return;
    }

    // Process batch
    const batchRes = await axios.post('http://localhost:3000/api/cards/process-batch', {
      qsos: parseRes.data.qsos,
      qrzUsername: process.env.QRZ_USERNAME,
      qrzPassword: process.env.QRZ_PASSWORD,
      emailConfig: {
        service: 'gmail',
        email: process.env.EMAIL_ADDRESS,
        password: process.env.EMAIL_PASSWORD
      },
      template: 'classic'
    });

    console.log(`✓ Processed ${batchRes.data.summary.totalSent} QSOs`);

    // Archive the file
    fs.renameSync(logFile, `archive/qsos-${new Date().toISOString()}.adif`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
});
```

## Exemplo 8: Webhook para N1MM Logger+

Integração com N1MM Logger+ para capturar QSOs em tempo real:

```javascript
// Em server.js, adiciona endpoint:
app.post('/api/qso/incoming', async (req, res) => {
  const qsoData = req.body;

  // Enrich com QRZ
  const sessionKey = await ensureQRZSession(process.env.QRZ_USERNAME, process.env.QRZ_PASSWORD);
  const qrzResult = await queryQRZCallsign(qsoData.call, sessionKey);

  if (qrzResult.success) {
    qsoData.name = qsoData.name || qrzResult.data.name;
    qsoData.country = qsoData.country || qrzResult.data.country;
    qsoData.email = qsoData.email || qrzResult.data.email;
  }

  // Gerar PDF
  const pdfBuffer = await generateCardPDF(qsoData, 'classic');

  // Enviar email
  if (qsoData.email) {
    await sendQSOCard(emailConfig, qsoData.email, qsoData, pdfBuffer);
  }

  res.json({ success: true, call: qsoData.call });
});

// N1MM Logger+ configuração:
// http://localhost:3000/api/qso/incoming (POST request format)
```

## Exemplo 9: Relatório de Processamento

Gerar relatório em JSON após batch:

```javascript
async function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      pdfGenerated: results.filter(r => r.pdfGenerated).length,
      emailSent: results.filter(r => r.emailSent).length
    },
    details: results,
    stats: {
      successRate: (results.filter(r => r.success).length / results.length * 100).toFixed(1) + '%',
      averageTime: 'N/A'
    }
  };

  fs.writeFileSync(`report-${Date.now()}.json`, JSON.stringify(report, null, 2));
  console.log('✓ Report saved');
}
```

## Exemplo 10: Docker Deployment em Heroku

```bash
# 1. Create Heroku app
heroku create qso-card-generator

# 2. Set environment variables
heroku config:set QRZ_USERNAME=YOUR_CALL
heroku config:set QRZ_PASSWORD=YOUR_PASS
heroku config:set EMAIL_ADDRESS=your@email.com
heroku config:set EMAIL_PASSWORD=app_password

# 3. Deploy
git push heroku main

# 4. View logs
heroku logs --tail
```

**Procfile:**
```
web: node server.js
```

---

Mais exemplos e integrações: aberto para contribuições! 📬

**73!** — CT3AAN
