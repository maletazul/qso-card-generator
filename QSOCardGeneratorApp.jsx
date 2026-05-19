import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function QSOCardGeneratorApp() {
  // Auth
  const [qrzUsername, setQrzUsername] = useState('');
  const [qrzPassword, setQrzPassword] = useState('');
  const [qrzAuthenticated, setQrzAuthenticated] = useState(false);

  // Email
  const [emailService, setEmailService] = useState('gmail');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // ADIF & QSOs
  const [adifText, setAdifText] = useState('');
  const [qsos, setQsos] = useState([]);
  const [filteredQsos, setFilteredQsos] = useState([]);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');

  // UI State
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('import');
  const [previewQso, setPreviewQso] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Buscar templates ao iniciar
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Filtrar QSOs por busca
  useEffect(() => {
    if (!searchFilter.trim()) {
      setFilteredQsos(qsos);
    } else {
      const search = searchFilter.toLowerCase();
      setFilteredQsos(qsos.filter(q => 
        q.call.toLowerCase().includes(search) ||
        (q.name && q.name.toLowerCase().includes(search)) ||
        (q.country && q.country.toLowerCase().includes(search))
      ));
    }
  }, [searchFilter, qsos]);

  async function fetchTemplates() {
    try {
      const response = await fetch(`${API_BASE}/api/templates`);
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }

  async function authenticateQRZ() {
    if (!qrzUsername || !qrzPassword) {
      setStatus('❌ Username and password required');
      return;
    }

    setProcessing(true);
    setStatus('Authenticating with QRZ...');

    try {
      const response = await fetch(`${API_BASE}/api/auth/qrz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: qrzUsername, password: qrzPassword })
      });

      const data = await response.json();

      if (data.success) {
        setQrzAuthenticated(true);
        setStatus(`✓ ${data.message}`);
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function parseADIF() {
    if (!adifText.trim()) {
      setStatus('❌ Please paste ADIF data');
      return;
    }

    setProcessing(true);
    setStatus('Parsing ADIF...');

    try {
      const response = await fetch(`${API_BASE}/api/adif/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adifText })
      });

      const data = await response.json();

      if (data.success) {
        setQsos(data.qsos);
        setStatus(`✓ Loaded ${data.count} QSOs`);
        setActiveTab('qsos');
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function processBatch() {
    if (qsos.length === 0) {
      setStatus('❌ No QSOs loaded');
      return;
    }

    if (!qrzAuthenticated) {
      setStatus('❌ Please authenticate with QRZ first');
      return;
    }

    if (!emailAddress || !emailPassword) {
      setStatus('❌ Email configuration required');
      return;
    }

    setProcessing(true);
    setStatus('Processing batch...');

    try {
      const response = await fetch(`${API_BASE}/api/cards/process-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qsos,
          qrzUsername,
          qrzPassword,
          emailConfig: {
            service: emailService,
            email: emailAddress,
            password: emailPassword
          },
          template: selectedTemplate
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`✓ ${data.summary.totalGenerated} PDFs generated, ${data.summary.totalSent} emails sent`);
        
        // Atualizar status dos QSOs
        const updatedQsos = qsos.map(q => {
          const result = data.results.find(r => r.call === q.call);
          return {
            ...q,
            pdfGenerated: result?.pdfGenerated,
            emailSent: result?.emailSent
          };
        });
        setQsos(updatedQsos);
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function downloadPDF(qso) {
    try {
      const response = await fetch(`${API_BASE}/api/card/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qsoData: qso, template: selectedTemplate })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QSO-${qso.call}-${qso.qso_date}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setStatus(`❌ Error downloading PDF: ${error.message}`);
    }
  }

  function formatDate(dateStr, timeStr) {
    if (!dateStr || dateStr.length !== 8) return 'N/A';
    const year = dateStr.substr(0, 4);
    const month = dateStr.substr(4, 2);
    const day = dateStr.substr(6, 2);
    let time = '';
    if (timeStr && timeStr.length >= 4) {
      time = ` ${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)} UTC`;
    }
    return `${day}/${month}/${year}${time}`;
  }

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '0.5rem' }}>📻 QSO Card Generator</h1>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>Professional QSO cards with QRZ integration and email delivery</p>

      {/* Status */}
      {status && (
        <div style={{
          padding: '12px 16px',
          background: status.includes('✓') ? '#E8F5E9' : '#FFEBEE',
          color: status.includes('✓') ? '#2E7D32' : '#C62828',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '14px',
          border: `1px solid ${status.includes('✓') ? '#A5D6A7' : '#EF9A9A'}`
        }}>
          {status}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', borderBottom: '1px solid #E0E0E0' }}>
        {[
          { id: 'auth', label: '🔐 QRZ Auth' },
          { id: 'import', label: '📥 Import ADIF' },
          { id: 'templates', label: '🎨 Templates' },
          { id: 'qsos', label: `📋 QSOs (${qsos.length})` },
          { id: 'email', label: '📧 Email Config' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              background: activeTab === tab.id ? '#1976D2' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#666',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderBottom: activeTab === tab.id ? '3px solid #1976D2' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Auth Tab */}
      {activeTab === 'auth' && (
        <div style={{ background: '#F5F5F5', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>QRZ XML Data Service Authentication</h2>
          
          <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                QRZ Username
              </label>
              <input
                type="text"
                value={qrzUsername}
                onChange={(e) => setQrzUsername(e.target.value)}
                placeholder="Your QRZ callsign"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #CCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                Requires QRZ XML Logbook Data subscription (~$36/year)
              </small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                QRZ Password
              </label>
              <input
                type="password"
                value={qrzPassword}
                onChange={(e) => setQrzPassword(e.target.value)}
                placeholder="Your QRZ password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #CCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={authenticateQRZ}
              disabled={processing}
              style={{
                padding: '10px 20px',
                background: qrzAuthenticated ? '#4CAF50' : '#1976D2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                opacity: processing ? 0.6 : 1
              }}
            >
              {processing ? '⏳ Authenticating...' : qrzAuthenticated ? '✓ Authenticated' : '🔐 Authenticate'}
            </button>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'white', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
            <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>ℹ️ About QRZ Integration:</p>
            <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>QRZ XML service provides real-time callsign lookup</li>
              <li>Automatically enriches QSO data with name, address, country</li>
              <li>Enables accurate email delivery to correspondents</li>
              <li>Session valid for 12 hours</li>
            </ul>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div style={{ background: '#F5F5F5', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>Import ADIF Log</h2>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              ADIF Data (paste your log export)
            </label>
            <textarea
              value={adifText}
              onChange={(e) => setAdifText(e.target.value)}
              placeholder="<call:5>W5XYZ<band:3>20m<mode:3>SSB<qso_date:8>20240115<time_on:4>1530<eor>"
              style={{
                width: '100%',
                height: '250px',
                padding: '12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px',
                boxSizing: 'border-box',
                marginBottom: '16px'
              }}
            />

            <button
              onClick={parseADIF}
              disabled={processing || !adifText.trim()}
              style={{
                padding: '10px 20px',
                background: '#1976D2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                opacity: processing || !adifText.trim() ? 0.6 : 1
              }}
            >
              {processing ? '⏳ Parsing...' : '📥 Parse ADIF'}
            </button>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'white', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
            <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>📋 ADIF Format Support:</p>
            <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Exported from WSJT-X, N1MM Logger+, TQSL, or any ADIF logger</li>
              <li>Standard ADIF format with &lt;eor&gt; record terminators</li>
              <li>Extracts: callsign, date, time, frequency, mode, RST, band</li>
            </ul>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div style={{ background: '#F5F5F5', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>Card Templates</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '2rem' }}>
            {templates.map(template => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                style={{
                  padding: '16px',
                  background: 'white',
                  border: selectedTemplate === template.id ? '2px solid #1976D2' : '1px solid #DDD',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div
                  style={{
                    width: '100%',
                    height: '120px',
                    background: template.colors.secondary,
                    border: `2px solid ${template.colors.primary}`,
                    borderRadius: '4px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: template.colors.primary
                  }}
                >
                  QSO CARD
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>{template.name}</h3>
                <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                  Layout: {template.layout}
                </p>
                {selectedTemplate === template.id && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#1976D2', fontWeight: 600 }}>
                    ✓ Selected
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedTemplateObj && (
            <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', fontSize: '13px' }}>
              <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>Color Scheme:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <div>
                  <div style={{ width: '100%', height: '30px', background: selectedTemplateObj.colors.primary, borderRadius: '4px', marginBottom: '4px' }}></div>
                  <small>Primary</small>
                </div>
                <div>
                  <div style={{ width: '100%', height: '30px', background: selectedTemplateObj.colors.secondary, border: '1px solid #DDD', borderRadius: '4px', marginBottom: '4px' }}></div>
                  <small>Secondary</small>
                </div>
                <div>
                  <div style={{ width: '100%', height: '30px', background: selectedTemplateObj.colors.text, borderRadius: '4px', marginBottom: '4px' }}></div>
                  <small>Text</small>
                </div>
                <div>
                  <div style={{ width: '100%', height: '30px', background: selectedTemplateObj.colors.textLight, borderRadius: '4px', marginBottom: '4px' }}></div>
                  <small>Text Light</small>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QSOs Tab */}
      {activeTab === 'qsos' && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>Loaded QSOs</h2>

          {qsos.length > 0 && (
            <>
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Search by callsign, name, or country..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #CCC',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={processBatch}
                  disabled={processing || !qrzAuthenticated}
                  style={{
                    padding: '10px 20px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    opacity: processing || !qrzAuthenticated ? 0.6 : 1
                  }}
                >
                  {processing ? '⏳ Processing...' : '🚀 Process All'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {filteredQsos.map((qso, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #E0E0E0',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setPreviewQso(qso)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F9F9F9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{qso.call}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {formatDate(qso.qso_date, qso.time_on)} • {qso.mode} • {qso.band}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {qso.pdfGenerated && <span style={{ fontSize: '12px', color: '#4CAF50', fontWeight: 600 }}>✓ PDF</span>}
                      {qso.emailSent && <span style={{ fontSize: '12px', color: '#4CAF50', fontWeight: 600 }}>✓ Sent</span>}
                      <span style={{ color: '#999' }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {qsos.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No QSOs loaded. Start by importing an ADIF file.
            </div>
          )}
        </div>
      )}

      {/* Email Config Tab */}
      {activeTab === 'email' && (
        <div style={{ background: '#F5F5F5', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>Email Configuration</h2>
          
          <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                Email Service
              </label>
              <select
                value={emailService}
                onChange={(e) => setEmailService(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #CCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="yahoo">Yahoo</option>
                <option value="smtp">Custom SMTP</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="your.email@gmail.com"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #CCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                Email Password / App Password
              </label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="For Gmail: use App Password, not account password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #CCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                Gmail: Generate at myaccount.google.com/apppasswords
              </small>
            </div>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'white', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
            <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>⚠️ Security Notice:</p>
            <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Credentials are only used during batch processing</li>
              <li>Never stored in backend or browser</li>
              <li>Use App Passwords instead of your main password</li>
              <li>All communication is over HTTPS in production</li>
            </ul>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQso && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{previewQso.call}</h3>
              <button
                onClick={() => setPreviewQso(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '1.5rem', fontSize: '13px' }}>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Callsign</label>
                <div style={{ fontWeight: 600 }}>{previewQso.call}</div>
              </div>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Date/Time</label>
                <div style={{ fontWeight: 600 }}>{formatDate(previewQso.qso_date, previewQso.time_on)}</div>
              </div>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Frequency</label>
                <div style={{ fontWeight: 600 }}>{previewQso.freq || previewQso.band}</div>
              </div>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Mode</label>
                <div style={{ fontWeight: 600 }}>{previewQso.mode}</div>
              </div>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Name</label>
                <div style={{ fontWeight: 600 }}>{previewQso.name || 'N/A'}</div>
              </div>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Location</label>
                <div style={{ fontWeight: 600 }}>{previewQso.city || ''} {previewQso.country || ''}</div>
              </div>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Email</label>
                <div style={{ fontWeight: 600 }}>{previewQso.email || 'N/A'}</div>
              </div>
              <div>
                <label style={{ color: '#999', display: 'block', marginBottom: '4px', fontWeight: 600 }}>RST</label>
                <div style={{ fontWeight: 600 }}>{previewQso.rst_sent || '59'} / {previewQso.rst_rcvd || '59'}</div>
              </div>
            </div>

            <button
              onClick={() => downloadPDF(previewQso)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1976D2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              ⬇️ Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
