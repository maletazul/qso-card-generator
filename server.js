import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import xml2js from 'xml2js';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
const upload = multer({ dest: path.join(process.cwd(), 'data', 'uploads') });
if (!fs.existsSync(path.join(process.cwd(), 'data', 'uploads'))) fs.mkdirSync(path.join(process.cwd(), 'data', 'uploads'), { recursive: true });

dotenv.config();

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const settings = JSON.parse(raw);
      if (settings.station) {
        if (settings.station.callsign) process.env.STATION_CALLSIGN = settings.station.callsign;
        if (settings.station.callsign) process.env.QRZ_USERNAME = settings.station.callsign;
        if (settings.station.operator) process.env.STATION_OPERATOR = settings.station.operator;
        if (settings.station.qth) process.env.STATION_QTH = settings.station.qth;
      }
      if (settings.qrz) {
        if (settings.qrz.username) process.env.QRZ_USERNAME = settings.qrz.username;
        if (settings.qrz.password) process.env.QRZ_PASSWORD = settings.qrz.password;
      }
      if (settings.email) {
        if (settings.email.address) process.env.EMAIL_ADDRESS = settings.email.address;
        if (settings.email.password) process.env.EMAIL_PASSWORD = settings.email.password;
        if (settings.email.service) process.env.EMAIL_SERVICE = settings.email.service;
      }
      if (settings.azure) {
        if (settings.azure.tenantId) process.env.AZURE_TENANT_ID = settings.azure.tenantId;
        if (settings.azure.clientId) process.env.AZURE_CLIENT_ID = settings.azure.clientId;
        if (settings.azure.clientSecret) process.env.AZURE_CLIENT_SECRET = settings.azure.clientSecret;
      }
      console.log('Settings loaded from', SETTINGS_PATH);
      return settings;
    }
  } catch (err) {
    console.error('Error loading settings:', err.message);
  }
  return null;
}

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch {}
  return {
    station: { callsign: process.env.STATION_CALLSIGN || process.env.QRZ_USERNAME || '', operator: process.env.STATION_OPERATOR || '', qth: process.env.STATION_QTH || '' },
    qrz: { username: process.env.QRZ_USERNAME || '', password: process.env.QRZ_PASSWORD || '' },
    email: { address: process.env.EMAIL_ADDRESS || '', password: process.env.EMAIL_PASSWORD || '', service: process.env.EMAIL_SERVICE || 'gmail' },
    azure: { tenantId: process.env.AZURE_TENANT_ID || '', clientId: process.env.AZURE_CLIENT_ID || '', clientSecret: process.env.AZURE_CLIENT_SECRET || '' }
  };
}

function maskSettings(settings) {
  const s = JSON.parse(JSON.stringify(settings));
  if (s.qrz?.password) s.qrz.password = '***';
  if (s.email?.password) s.email.password = '***';
  if (s.azure?.clientSecret) s.azure.clientSecret = '***';
  return s;
}

function saveSettings(newSettings) {
  const current = getSettings();
  if (!newSettings.qrz?.password || newSettings.qrz.password === '***') {
    newSettings.qrz.password = current.qrz?.password || '';
  }
  if (!newSettings.email?.password || newSettings.email.password === '***') {
    newSettings.email.password = current.email?.password || '';
  }
  if (!newSettings.azure?.clientSecret || newSettings.azure.clientSecret === '***') {
    newSettings.azure.clientSecret = current.azure?.clientSecret || '';
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(newSettings, null, 2));
  if (newSettings.station?.callsign) { process.env.STATION_CALLSIGN = newSettings.station.callsign; process.env.QRZ_USERNAME = newSettings.station.callsign; }
  if (newSettings.station?.operator) process.env.STATION_OPERATOR = newSettings.station.operator;
  if (newSettings.station?.qth) process.env.STATION_QTH = newSettings.station.qth;
  if (newSettings.qrz?.username) process.env.QRZ_USERNAME = newSettings.qrz.username;
  if (newSettings.qrz?.password) process.env.QRZ_PASSWORD = newSettings.qrz.password;
  if (newSettings.email?.address) process.env.EMAIL_ADDRESS = newSettings.email.address;
  if (newSettings.email?.password) process.env.EMAIL_PASSWORD = newSettings.email.password;
  if (newSettings.email?.service) process.env.EMAIL_SERVICE = newSettings.email.service;
  if (newSettings.azure?.tenantId) process.env.AZURE_TENANT_ID = newSettings.azure.tenantId;
  if (newSettings.azure?.clientId) process.env.AZURE_CLIENT_ID = newSettings.azure.clientId;
  if (newSettings.azure?.clientSecret) process.env.AZURE_CLIENT_SECRET = newSettings.azure.clientSecret;
  cachedGraphToken = null;
  tokenExpiry = null;
  qrzSessionKey = null;
  qrzSessionExpiry = null;
  return newSettings;
}

// Load settings on startup (source of truth, .env is seed)
loadSettings();


const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const QRZ_API_URL = 'https://www.qrz.com/xml/current/';
let qrzSessionKey = null;
let qrzSessionExpiry = null;

const CARD_TEMPLATES = {
  classic: {
    name: 'Classic Blue',
    colors: { primary: '#1E90FF', secondary: '#F0F8FF', text: '#000000', textLight: '#505050' },
    layout: 'two-column',
    logo: 'CT3AAN'
  },
  minimal: {
    name: 'Minimal Black',
    colors: { primary: '#000000', secondary: '#FFFFFF', text: '#000000', textLight: '#808080' },
    layout: 'single-column',
    logo: null
  },
  retro: {
    name: 'Retro Vintage',
    colors: { primary: '#8B4513', secondary: '#FFF8DC', text: '#8B4513', textLight: '#A0826D' },
    layout: 'two-column',
    logo: '\uD83D\uDCFB'
  },
  neon: {
    name: 'Neon Purple',
    colors: { primary: '#9D4EDD', secondary: '#F3E5FF', text: '#3A0CA3', textLight: '#7209B7' },
    layout: 'two-column',
    logo: '\u26A1'
  }
};

const TEMPLATE_BG_DIR = path.join(process.cwd(), 'data', 'template-bg');
if (!fs.existsSync(TEMPLATE_BG_DIR)) fs.mkdirSync(TEMPLATE_BG_DIR, { recursive: true });

function getAllTemplates() {
  const custom = {};
  const cp = path.join(process.cwd(), 'data', 'custom-templates.json');
  if (fs.existsSync(cp)) {
    try { Object.assign(custom, JSON.parse(fs.readFileSync(cp, 'utf8'))); } catch(e) {}
  }
  return { ...CARD_TEMPLATES, ...custom };
}

function getCustomTemplates() {
  const cp = path.join(process.cwd(), 'data', 'custom-templates.json');
  if (fs.existsSync(cp)) {
    try { return JSON.parse(fs.readFileSync(cp, 'utf8')); } catch(e) {}
  }
  return {};
}

function saveCustomTemplates(tpls) {
  const cp = path.join(process.cwd(), 'data', 'custom-templates.json');
  fs.writeFileSync(cp, JSON.stringify(tpls, null, 2));
}

// ============================================================================
// AUTENTICAÇÃO QRZ
// ============================================================================

async function authenticateQRZ(username, password) {
  try {
    const response = await axios.get(QRZ_API_URL, {
      params: { username, password },
      maxRedirects: 5,
      headers: { 'User-Agent': 'QSOCardGenerator/1.0 (CT3AAN)' }
    });
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    const session = result?.QRZDatabase?.Session?.[0];
    if (!session) return { success: false, error: 'Invalid QRZ response - check credentials' };
    if (session.Error) throw new Error(session.Error[0]);
    qrzSessionKey = session.Key?.[0];
    qrzSessionExpiry = Date.now() + (12 * 60 * 60 * 1000);
    return { success: true, sessionKey: qrzSessionKey, message: `Logged in as ${session.User?.[0] || username}` };
  } catch (error) { return { success: false, error: error.message }; }
}

async function ensureQRZSession(username, password) {
  if (!qrzSessionKey || Date.now() > qrzSessionExpiry) {
    const auth = await authenticateQRZ(username, password);
    if (!auth.success) throw new Error(auth.error);
  }
  return qrzSessionKey;
}

async function queryQRZCallsign(callsign, sessionKey) {
  try {
    const response = await axios.get(QRZ_API_URL, {
      params: { s: sessionKey, callsign: callsign.toUpperCase() },
      headers: { 'User-Agent': 'QSOCardGenerator/1.0 (CT3AAN)' }
    });
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    if (result.QRZDatabase.Callsign) {
      const c = result.QRZDatabase.Callsign[0];
      const fn = c.fname?.[0] || '';
      const ln = c.name?.[0] || '';
      return {
        success: true,
        data: {
          call: c.call[0], name: fn ? `${fn} ${ln}` : (ln || ''),
          addr1: c.addr1?.[0] || '', addr2: c.addr2?.[0] || '',
          city: c.city?.[0] || '', state: c.state?.[0] || '',
          zip: c.zip?.[0] || '', country: c.country?.[0] || '',
          email: c.email?.[0] || '', web: c.web?.[0] || '',
          lat: c.lat?.[0] || null, lon: c.lon?.[0] || null,
          grid_square: c.grid?.[0] || ''
        }
      };
    }
    return { success: false, error: 'Callsign not found' };
  } catch (error) { return { success: false, error: error.message }; }
}

// ============================================================================
// QRZ ENRICHMENT
// ============================================================================

async function enrichQSOsFromQRZ(qsos) {
  const qrzUsername = process.env.STATION_CALLSIGN || process.env.QRZ_USERNAME;
  const qrzPassword = process.env.QRZ_PASSWORD;
  if (!qrzUsername || !qrzPassword) return 0;
  let enriched = 0;
  try {
    const sessionKey = await ensureQRZSession(qrzUsername, qrzPassword);
    for (const qso of qsos) {
      if (qso.name && qso.country) continue;
      const result = await queryQRZCallsign(qso.call, sessionKey);
      if (result.success) {
        const d = result.data;
        let changed = false;
        const fields = ['name','addr1','addr2','city','state','country','zip','email','lat','lon','grid_square'];
        for (const f of fields) {
          if (!qso[f] && d[f]) { qso[f] = d[f]; changed = true; }
        }
        if (changed) enriched++;
      }
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (err) { console.error('QRZ enrichment error:', err.message); }
  return enriched;
}

// ============================================================================
// PDF GENERATOR - GLASSMORPHISM
// ============================================================================

function hexToRGB(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

function formatDate(dateStr, timeStr) {
  if (!dateStr || dateStr.length !== 8) return 'N/A';
  const y = dateStr.substr(0, 4), m = dateStr.substr(4, 2), d = dateStr.substr(6, 2);
  let t = '';
  if (timeStr && timeStr.length >= 4) t = ` ${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)} UTC`;
  return `${d}/${m}/${y}${t}`;
}

function generateCardPDF(qsoData, templateName) {
  const allTemplates = getAllTemplates();
  const template = allTemplates[templateName] || allTemplates.classic;
  const colors = template.colors;
  const tplBgUrl = template.background_image;
  const hasBg = !!(tplBgUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [595, 420], margin: 0,
      info: { Title: `QSO Card - ${qsoData.call || ''}`, Author: qsoData.station_callsign || 'QSO Card Generator' }
    });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = 595, H = 420, pad = 20, pY = 120;

    // Background
    if (hasBg) {
      const allBgFiles = fs.readdirSync(TEMPLATE_BG_DIR).filter(f => f.startsWith(templateName + '.'));
        const bgFiles = allBgFiles.filter(f => f.endsWith('.png')).concat(allBgFiles.filter(f => !f.endsWith('.png')));
      if (bgFiles.length > 0) {
        const bgFilePath = path.join(TEMPLATE_BG_DIR, bgFiles[0]);
        doc.rect(0, 0, W, H).fill(colors.secondary);
        try { doc.image(bgFilePath, 0, 0, { width: W, height: H }); } catch(e) { console.error('BG draw error:', e.message); }
      } else {
        doc.rect(0, 0, W, H).fill(colors.secondary);
      }
    } else {
      doc.rect(0, 0, W, H).fill(colors.secondary);
    }

    const txtC = hasBg ? '#FFFFFF' : colors.text;
    const txtLC = hasBg ? '#DDDDDD' : colors.textLight;
    const gBg = colors.secondary;

    function glassPanel(x, y, w, h) {
      doc.save(); doc.roundedRect(x, y, w, h, 6);
      if (hasBg) {
        doc.fillOpacity(0.3);
        doc.fill('#000000');
        doc.fillOpacity(1);
      } else {
        doc.fill(gBg);
      }
      doc.restore();
    }

    // Text shadow for BG readability
    function txtStroke() {
      if (!hasBg) return;
      doc.save();
      doc.fillOpacity(0.4);
      doc.fillColor('#000000');
      doc.fillOpacity(1);
      doc.restore();
    }

    // Big callsign - upper left
    doc.fillColor(txtC).fontSize(42).font('Helvetica-Bold').text(qsoData.call || 'N/A', pad, pad + 20, { width: W - pad * 2 - 180 });

    // Header right panel
    const stCall = process.env.STATION_CALLSIGN || process.env.QRZ_USERNAME || qsoData.station_callsign || '';
    const stOp = process.env.STATION_OPERATOR || stCall || '';
    const stQTH = process.env.STATION_QTH || '';
    const hX = W - pad - 170, hY = pad, hW = 170;
    glassPanel(hX, hY, hW, 56);
    doc.fillColor(txtC).fontSize(10).font('Helvetica-Bold').text(stCall || qsoData.call || 'N/A', hX + 10, hY + 8, { width: hW - 20 });
    doc.fillColor(txtLC).fontSize(7).font('Helvetica');
    doc.text(stOp, hX + 10, hY + 22, { width: hW - 20 });
    doc.text(stQTH, hX + 10, hY + 34, { width: hW - 20 });

    // Date badge
    const dateStr = formatDate(qsoData.qso_date, qsoData.time_on);
    const bW = 130, bX = hX + (hW - bW) / 2, ty = hY + 56 + 4;
    glassPanel(bX, ty, bW, 14);
    doc.fillColor(txtC).fontSize(8).font('Helvetica-Bold').text(dateStr, bX, ty + 5, { width: bW, align: 'center' });

    // Glass panel for QSO details
    const gpX = pad, gpW = W - pad * 2, gpH = 175;
    glassPanel(gpX, pY, gpW, gpH);

    // Fields
    const fX = gpX + 14, fW = (gpW - 14 * 2 - 20) / 2;
    let fY = pY + 14;
    const rowH = 34;

    function field(label, value, x, yp) {
      doc.fillColor(txtLC).fontSize(6.5).font('Helvetica').text(label, x, yp, { width: fW });
      doc.fillColor(txtC).fontSize(9).font('Helvetica-Bold').text(String(value || 'N/A'), x, yp + 10, { width: fW });
    }

    field('DATE / TIME', dateStr, fX, fY);
    field('BAND', qsoData.band || 'N/A', fX + fW + 20, fY); fY += rowH;
    field('FREQUENCY', qsoData.freq ? `${qsoData.freq} MHz` : (qsoData.band || 'N/A'), fX, fY);
    field('MODE', qsoData.mode || 'N/A', fX + fW + 20, fY); fY += rowH;
    field('RST SENT', qsoData.rst_sent || '59', fX, fY);
    field('RST RCVD', qsoData.rst_rcvd || '59', fX + fW + 20, fY); fY += rowH;
    field('NAME', qsoData.name || '', fX, fY);
    field('COUNTRY', qsoData.country || '', fX + fW + 20, fY); fY += rowH;
    const qthParts = [qsoData.addr1, qsoData.addr2, qsoData.city, qsoData.state, qsoData.grid_square].filter(Boolean);
    field('QTH', qthParts.join(', '), fX, fY); fY += rowH;

    // Notes
    if (qsoData.notes || qsoData.comment) {
      const nT = qsoData.notes || qsoData.comment || '';
      glassPanel(fX, fY, gpW - 28, 48);
      doc.fillColor(txtLC).fontSize(6.5).font('Helvetica').text('NOTES', fX + 10, fY + 8, { width: gpW - 48 });
      doc.fillColor(txtC).fontSize(7.5).font('Helvetica').text(String(nT), fX + 10, fY + 20, { width: gpW - 48, lineGap: 1 });
    }

    doc.end();
  });
}


const HISTORY_PATH = path.join(process.cwd(), 'data', 'history.json');

function loadHistory() {
  if (fs.existsSync(HISTORY_PATH)) {
    try { return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); } catch(e) {}
  }
  return [];
}

function saveHistoryEntry(entry) {
  const h = loadHistory();
  h.unshift({ ...entry, _id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), timestamp: new Date().toISOString() });
  if (h.length > 500) h.length = 500; // keep last 500
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(h, null, 2));
  return h;
}

// ============================================================================
// EMAIL - OAUTH2 MICROSOFT GRAPH API + SMTP FALLBACK
// ============================================================================

let cachedGraphToken = null, tokenExpiry = null;

async function getGraphAccessToken(tenantId, clientId, clientSecret) {
  if (cachedGraphToken && tokenExpiry && Date.now() < tokenExpiry) return cachedGraphToken;
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://graph.microsoft.com/.default' }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    cachedGraphToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return cachedGraphToken;
  } catch (error) {
    throw new Error(`Failed to get Graph token: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

function buildEmailHtml(qsoData) {
  const ds = formatDate(qsoData.qso_date, qsoData.time_on);
  const sc = qsoData.station_callsign || process.env.STATION_CALLSIGN || 'CT3AAN';
  const so = process.env.STATION_OPERATOR || sc;
  const sq = process.env.STATION_QTH || '';
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">'
    + '<div style="background:linear-gradient(135deg,#1E90FF,#9D4EDD);padding:24px;border-radius:8px 8px 0 0;">'
    + '<h1 style="color:#fff;margin:0;">QSO Card Confirmation</h1>'
    + '<p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;">' + sc + ' - ' + so + '</p></div>'
    + '<div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;">'
    + '<p>Dear ' + (qsoData.name || 'OM/YL') + ',</p>'
    + '<p>Thank you for the QSO on <strong>' + ds + '</strong>!</p>'
    + '<table style="width:100%;border-collapse:collapse;margin:16px 0;">'
    + '<tr><td style="padding:6px 0;color:#666;">Frequency:</td><td><strong>' + (qsoData.freq || qsoData.band || 'N/A') + '</strong></td></tr>'
    + '<tr><td style="padding:6px 0;color:#666;">Mode:</td><td><strong>' + (qsoData.mode || 'N/A') + '</strong></td></tr>'
    + '<tr><td style="padding:6px 0;color:#666;">RST Sent:</td><td><strong>' + (qsoData.rst_sent || '59') + '</strong></td></tr>'
    + '<tr><td style="padding:6px 0;color:#666;">RST Rcvd:</td><td><strong>' + (qsoData.rst_rcvd || '59') + '</strong></td></tr>'
    + (qsoData.name ? '<tr><td style="padding:6px 0;color:#666;">Name:</td><td><strong>' + qsoData.name + '</strong></td></tr>' : '')
    + (qsoData.qth || qsoData.city ? '<tr><td style="padding:6px 0;color:#666;">QTH:</td><td><strong>' + (qsoData.qth || qsoData.city || '') + '</strong></td></tr>' : '')
    + '</table><p>Please find your QSO card attached.</p>'
    + '<p>73,<br><strong>' + sc + '</strong></p></div></div>';
}

function getEmailConfig() {
  return {
    service: process.env.EMAIL_SERVICE, email: process.env.EMAIL_ADDRESS, password: process.env.EMAIL_PASSWORD,
    azureTenantId: process.env.AZURE_TENANT_ID, azureClientId: process.env.AZURE_CLIENT_ID, azureClientSecret: process.env.AZURE_CLIENT_SECRET
  };
}

async function sendQSOCard(emailConfig, recipient, qsoData, pdfBuffer) {
  // Try Graph API first
  if (emailConfig.azureTenantId && emailConfig.azureClientId && emailConfig.azureClientSecret) {
    try {
      const token = await getGraphAccessToken(emailConfig.azureTenantId, emailConfig.azureClientId, emailConfig.azureClientSecret);
      const dateStr = formatDate(qsoData.qso_date, qsoData.time_on);
      const filename = 'QSO-' + (qsoData.call || 'unknown') + '-' + (qsoData.qso_date || 'nodate') + '.pdf';
      const graphBody = {
        message: {
          subject: 'QSO Card - ' + (qsoData.call || '') + ' (' + dateStr + ')',
          body: { contentType: 'HTML', content: buildEmailHtml(qsoData) },
          toRecipients: [{ emailAddress: { address: recipient } }],
          attachments: [{ "@odata.type": "#microsoft.graph.fileAttachment", name: filename, contentType: 'application/pdf', contentBytes: pdfBuffer.toString('base64') }]
        },
        saveToSentItems: true
      };
      await axios.post(
        'https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(emailConfig.email) + '/sendMail',
        graphBody,
        { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } }
      );
      return { success: true, method: 'graph-api' };
    } catch (error) {
      console.error('Graph API email failed, falling back to SMTP:', error.message);
      console.error('Graph error details:', error.stack || error);
    }
  }
  // Fallback SMTP
  try {
    const transporter = nodemailer.createTransport({ service: emailConfig.service || 'gmail', auth: { user: emailConfig.email, pass: emailConfig.password } });
    const dateStr = formatDate(qsoData.qso_date, qsoData.time_on);
    const result = await transporter.sendMail({
      from: emailConfig.email, to: recipient,
      subject: 'QSO Card - ' + (qsoData.call || '') + ' (' + dateStr + ')',
      html: buildEmailHtml(qsoData),
      attachments: [{ filename: 'QSO-' + (qsoData.call || 'unknown') + '-' + (qsoData.qso_date || 'nodate') + '.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
    });
    return { success: true, method: 'smtp', messageId: result.messageId };
  } catch (error) { return { success: false, error: error.message }; }
}

// ============================================================================
// PARSE ADIF
// ============================================================================

function parseADIF(adifText) {
  const records = [];
  for (const line of adifText.split('<eor>')) {
    if (!line.trim()) continue;
    const record = {};
    const re = /<(\w+):(\d+)>/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      record[m[1].toLowerCase()] = line.substr(m.index + m[0].length, parseInt(m[2])).trim();
    }
    if (Object.keys(record).length > 0) records.push(record);
  }
  return records;
}

// ============================================================================
// ROTAS API
// ============================================================================

app.post('/api/auth/qrz', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  res.json(await authenticateQRZ(username, password));
});

app.post('/api/qrz/lookup', async (req, res) => {
  const { callsign, qrzUsername, qrzPassword } = req.body;
  if (!callsign || !qrzUsername || !qrzPassword) return res.status(400).json({ error: 'Callsign and QRZ credentials required' });
  try {
    const sessionKey = await ensureQRZSession(qrzUsername, qrzPassword);
    res.json(await queryQRZCallsign(callsign, sessionKey));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/adif/parse', async (req, res) => {
  const { adifText } = req.body;
  if (!adifText) return res.status(400).json({ error: 'ADIF text required' });
  try {
    const qsos = parseADIF(adifText);
    const enriched = await enrichQSOsFromQRZ(qsos);
    res.json({ success: true, qsos, count: qsos.length, enriched });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/adif/upload', upload.single('file'), async (req, res) => {
  try {
    let adifText = '';
    if (req.file) {
      adifText = fs.readFileSync(req.file.path, 'utf8');
    } else if (req.body.adifText) {
      adifText = req.body.adifText;
    }
    if (!adifText || !adifText.trim()) return res.status(400).json({ error: 'ADIF text required' });
    const qsos = parseADIF(adifText);
    const enriched = await enrichQSOsFromQRZ(qsos);
    res.json({ success: true, qsos, count: qsos.length, enriched, filename: req.file?.originalname || 'adi-paste' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/card/generate-pdf', async (req, res) => {
  const { qsoData, template = 'classic' } = req.body;
  if (!qsoData || !qsoData.call) return res.status(400).json({ error: 'QSO data with callsign required' });
  const allTemplates = getAllTemplates();
  if (!allTemplates[template]) return res.status(400).json({ error: 'Template "' + template + '" not found' });
  try {
    const pdfBuffer = await generateCardPDF(qsoData, template);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="QSO-' + (qsoData.call || '') + '-' + (qsoData.qso_date || '') + '.pdf"');
    res.send(pdfBuffer);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/cards/process-batch', async (req, res) => {
  const { qsos, template = 'classic' } = req.body;
  if (!qsos || !qsos.length) return res.status(400).json({ error: 'QSOs required' });
  const qrzUsername = process.env.QRZ_USERNAME || '';
  const qrzPassword = process.env.QRZ_PASSWORD || '';
  const emailConfig = getEmailConfig();
  if (!emailConfig.email && !emailConfig.azureTenantId) return res.status(400).json({ error: 'Email not configured. Go to Settings to set up email.' });
  try {
    const sessionKey = await ensureQRZSession(qrzUsername, qrzPassword);
    const results = [];
    for (const qso of qsos) {
      const r = { call: qso.call, success: false, pdfGenerated: false, emailSent: false, errors: [] };
      if (!qso.email) {
        const qr = await queryQRZCallsign(qso.call, sessionKey);
        if (qr.success && qr.data.email) {
          qso.email = qr.data.email;
          qso.name = qso.name || qr.data.name;
          qso.city = qso.city || qr.data.city;
          qso.country = qso.country || qr.data.country;
        }
      }
      try {
        const pdfBuffer = await generateCardPDF(qso, template);
        r.pdfGenerated = true;
        if (qso.email) {
          const er = await sendQSOCard(emailConfig, qso.email, qso, pdfBuffer);
          if (er.success) { r.emailSent = true; r.success = true; }
          else r.errors.push('Email error: ' + er.error);
        } else { r.errors.push('No email address found'); }
      } catch (e) { r.errors.push('PDF error: ' + e.message); }
      results.push(r);
    }
    // Log failed QSOs
    const failed = results.filter(r => !r.success);
    if (failed.length) console.log('Batch failed QSOs:', JSON.stringify(failed.map(r => ({ call: r.call, errors: r.errors }))));
    // Save to history
    for (const r of results) {
      saveHistoryEntry({ call: r.call, success: r.success, pdfGenerated: r.pdfGenerated, emailSent: r.emailSent, errors: r.errors, template, date: new Date().toISOString() });
    }
    console.log('Batch done:', results.filter(r => r.success).length + '/' + results.length + ' successful');
    res.json({
      success: true, processed: results.length, results,
      summary: {
        totalGenerated: results.filter(r => r.pdfGenerated).length,
        totalSent: results.filter(r => r.emailSent).length,
        errors: results.filter(r => r.errors.length > 0)
      }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/templates', (req, res) => {
  const all = getAllTemplates();
  res.json(Object.entries(all).map(([k, v]) => ({ id: k, name: v.name, colors: v.colors, layout: v.layout, logo: v.logo, background_image: v.background_image || null, is_builtin: !!(CARD_TEMPLATES[k]) })));
});

app.post('/api/templates', (req, res) => {
  try {
    const { name, colors, layout, logo } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Template name required' });
    const id = 'custom-' + Date.now();
    const custom = getCustomTemplates();
    custom[id] = { name: name.trim(), colors: colors || { primary: '#1E90FF', secondary: '#F0F8FF', text: '#000000', textLight: '#505050' }, layout: layout || 'two-column', logo: logo || '' };
    saveCustomTemplates(custom);
    res.json({ success: true, id, template: custom[id] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, colors, layout, logo } = req.body;
    const all = getAllTemplates();
    let custom = getCustomTemplates();
    let targetId = id;

    // If built-in, copy to custom first
    if (!custom[id] && all[id]) {
      targetId = 'custom-' + Date.now();
      custom[targetId] = { ...all[id] };
      // Copy bg image if exists
      const srcFiles = fs.readdirSync(TEMPLATE_BG_DIR).filter(f => f.startsWith(id + '.'));
      for (const f of srcFiles) {
        const ext = f.substring(id.length);
        fs.copyFileSync(path.join(TEMPLATE_BG_DIR, f), path.join(TEMPLATE_BG_DIR, targetId + ext));
      }
      if (all[id].background_image) {
        custom[targetId].background_image = '/api/templates/' + targetId + '/background';
      }
    }

    if (!custom[targetId]) return res.status(404).json({ error: 'Template not found' });
    if (name) custom[targetId].name = name.trim();
    if (colors) custom[targetId].colors = colors;
    if (layout) custom[targetId].layout = layout;
    if (logo !== undefined) custom[targetId].logo = logo;
    saveCustomTemplates(custom);
    res.json({ success: true, id: targetId, template: custom[targetId] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (CARD_TEMPLATES[id]) return res.status(400).json({ error: 'Cannot delete built-in template' });
    const custom = getCustomTemplates();
    if (!custom[id]) return res.status(404).json({ error: 'Template not found' });
    delete custom[id];
    saveCustomTemplates(custom);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/templates/:id/background', upload.single('file'), (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const bgPath = path.join(TEMPLATE_BG_DIR, id + ext);
    // Move from multer temp
    fs.rename(req.file.path, bgPath, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      const bgUrl = '/api/templates/' + id + '/background';
      const custom = getCustomTemplates();
      if (custom[id]) { custom[id].background_image = bgUrl; saveCustomTemplates(custom); }
      res.json({ success: true, url: bgUrl });
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/templates/:id/background', (req, res) => {
  const { id } = req.params;
  const files = fs.readdirSync(TEMPLATE_BG_DIR).filter(f => f.startsWith(id + '.'));
  if (files.length === 0) return res.status(404).send('Not found');
  res.sendFile(path.join(TEMPLATE_BG_DIR, files[0]));
});

app.delete('/api/templates/:id/background', (req, res) => {
  try {
    const { id } = req.params;
    const files = fs.readdirSync(TEMPLATE_BG_DIR).filter(f => f.startsWith(id + '.'));
    files.forEach(f => fs.unlinkSync(path.join(TEMPLATE_BG_DIR, f)));
    const custom = getCustomTemplates();
    if (custom[id]) { delete custom[id].background_image; saveCustomTemplates(custom); }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// History API
app.get('/api/history', (req, res) => {
  try {
    const all = loadHistory();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = (req.query.search || '').toLowerCase();
    let filtered = all;
    if (search) filtered = all.filter(h => (h.call || '').toLowerCase().includes(search));
    const total = filtered.length;
    const start = (page - 1) * limit;
    res.json({ items: filtered.slice(start, start + limit), total, page, limit, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/history', (req, res) => {
  try {
    fs.writeFileSync(HISTORY_PATH, '[]');
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/test-email', async (req, res) => {
  const config = getEmailConfig();
  const hasOAuth = !!(config.azureTenantId && config.azureClientId && config.azureClientSecret);
  const hasSMTP = !!(config.email && config.password);
  if (!hasOAuth && !hasSMTP) return res.status(400).json({ success: false, error: 'No email configuration found.' });
  const method = (hasOAuth && hasSMTP) ? 'OAuth2 (Microsoft Graph) with SMTP fallback' : (hasOAuth ? 'OAuth2 (Microsoft Graph)' : 'SMTP');
  const recipient = req.body?.recipient;
  if (recipient) {
    try {
      const testQSO = { call: 'TEST', qso_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''), time_on: new Date().toISOString().slice(11, 16).replace(':', ''), band: '2m', mode: 'FM', rst_sent: '59', rst_rcvd: '59', name: 'Test Contact', station_callsign: process.env.STATION_CALLSIGN || process.env.QRZ_USERNAME || 'CT3AAN' };
      const template = req.body.template || 'classic';
      const testPdf = await generateCardPDF(testQSO, template);
      const result = await sendQSOCard(config, recipient, testQSO, testPdf);
      return res.json({ success: result.success, method, template: template, detail: result });
    } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  }
  res.json({ success: true, method, configured: true, message: 'Email configured (' + method + '). Provide { "recipient": "email@example.com" } to test.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'QSO Card Generator Backend running' });
});


// ============================================================================
// SETTINGS API
// ============================================================================

app.get('/api/settings', (req, res) => {
  try {
    const settings = getSettings();
    res.json(maskSettings(settings));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---- Auth status endpoints (frontend compatibility) ----
app.post('/api/auth/qrz-server', async (req, res) => {
  try {
    const user = process.env.QRZ_USERNAME;
    const pass = process.env.QRZ_PASSWORD;
    if (!user || !pass) return res.json({ success: false, error: 'QRZ not configured' });
    const key = await ensureQRZSession(user, pass);
    res.json({ success: true, sessionKey: key });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.get('/api/email/status', (req, res) => {
  const hasOauth = !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
  const hasSmtp = !!(process.env.EMAIL_ADDRESS && process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD !== '***');
  res.json({ configured: hasOauth || hasSmtp, method: hasOauth ? 'OAuth2' : 'SMTP' });
});



app.put('/api/settings', (req, res) => {
  try {
    const updated = saveSettings(req.body);
    res.json({ success: true, settings: maskSettings(updated) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

const PORT = process.env.PORT || 3000;
const ec = getEmailConfig();
const hO = !!(ec.azureTenantId && ec.azureClientId && ec.azureClientSecret);
const hS = !!(ec.email && ec.password);
const em = (hO && hS) ? 'OAuth2 (Microsoft Graph) + SMTP fallback' : (hO ? 'OAuth2 (Microsoft Graph)' : (hS ? 'SMTP' : 'NOT configured'));

app.listen(PORT, () => {
  console.log('QSO Card Generator Backend running on port ' + PORT);
  console.log('Email: ' + em);
  console.log('Available templates: ' + Object.keys(getAllTemplates()).join(', '));
});
