import React, { useState, useEffect, useRef, useCallback } from 'react';

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f5f7fa; --bg2: #ffffff; --bg3: #e8ecf1; --text: #1a1a2e; --text2: #555; --text3: #888;
    --primary: #1E90FF; --primary-hover: #1670cc; --danger: #e74c3c; --danger-hover: #c0392b;
    --success: #27ae60; --warning: #f39c12; --border: #ddd; --shadow: 0 2px 8px rgba(0,0,0,0.1);
    --radius: 8px; --radius-lg: 12px;
  }
  .dark {
    --bg: #0f1117; --bg2: #1a1d28; --bg3: #252836; --text: #e0e0e0; --text2: #aaa; --text3: #666;
    --primary: #4da6ff; --primary-hover: #3399ff; --danger: #ff6b6b; --danger-hover: #ee5a5a;
    --success: #2ecc71; --warning: #f1c40f; --border: #333; --shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  
  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: var(--bg2); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
  .header h1 { font-size: 1.4rem; font-weight: 700; color: var(--primary); }
  .header-actions { display: flex; align-items: center; gap: 12px; }
  
  /* Tabs */
  .tabs { display: flex; gap: 4px; padding: 12px 24px 0; background: var(--bg2); border-bottom: 1px solid var(--border); overflow-x: auto; }
  .tab { padding: 10px 18px; border: none; background: none; color: var(--text2); cursor: pointer; font-size: 0.9rem; border-bottom: 2px solid transparent; white-space: nowrap; transition: all 0.2s; }
  .tab:hover { color: var(--primary); }
  .tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
  
  /* Content */
  .content { flex: 1; padding: 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
  
  /* Cards */
  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow); }
  .card h3 { margin-bottom: 16px; font-size: 1.1rem; color: var(--text); }
  
  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.2s; text-decoration: none; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: var(--primary); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
  .btn-danger { background: var(--danger); color: #fff; }
  .btn-danger:hover:not(:disabled) { background: var(--danger-hover); }
  .btn-success { background: var(--success); color: #fff; }
  .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
  .btn-outline:hover { background: var(--bg3); }
  .btn-sm { padding: 5px 10px; font-size: 0.8rem; }
  .btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
  
  /* Inputs */
  .input, .select, textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); color: var(--text); font-size: 0.9rem; transition: border 0.2s; }
  .input:focus, .select:focus, textarea:focus { outline: none; border-color: var(--primary); }
  textarea { min-height: 120px; resize: vertical; font-family: monospace; font-size: 0.8rem; }
  .select { cursor: pointer; }
  
  /* Form groups */
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; margin-bottom: 4px; font-size: 0.85rem; font-weight: 500; color: var(--text2); }
  .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  
  /* Table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); }
  th { background: var(--bg3); font-weight: 600; color: var(--text2); cursor: pointer; white-space: nowrap; user-select: none; }
  th:hover { color: var(--primary); }
  td { white-space: nowrap; }
  tr:hover td { background: var(--bg3); }
  .table-actions { display: flex; gap: 4px; }
  
  /* Status pills */
  .pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .pill-green { background: #d4edda; color: #155724; }
  .pill-red { background: #f8d7da; color: #721c24; }
  .pill-amber { background: #fff3cd; color: #856404; }
  .dark .pill-green { background: #1a3a2a; color: #2ecc71; }
  .dark .pill-red { background: #3a1a1a; color: #ff6b6b; }
  .dark .pill-amber { background: #3a3010; color: #f1c40f; }
  
  /* Template grid */
  .template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .template-card { border: 2px solid var(--border); border-radius: var(--radius-lg); padding: 16px; cursor: pointer; transition: all 0.2s; background: var(--bg2); }
  .template-card:hover { box-shadow: var(--shadow); }
  .template-card.selected { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(30,144,255,0.2); }
  .template-card h4 { margin-bottom: 8px; }
  .color-bar { display: flex; gap: 4px; margin: 8px 0; }
  .color-swatch { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border); }
  .template-card .tpl-actions { margin-top: 12px; display: flex; gap: 4px; flex-wrap: wrap; }
  
  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .modal { background: var(--bg2); border-radius: var(--radius-lg); padding: 24px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
  .modal h3 { margin-bottom: 16px; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
  
  /* Toast */
  .toast-container { position: fixed; top: 16px; right: 16px; z-index: 300; display: flex; flex-direction: column; gap: 8px; }
  .toast { padding: 12px 20px; border-radius: var(--radius); color: #fff; font-size: 0.85rem; box-shadow: var(--shadow); animation: slideIn 0.3s ease; min-width: 250px; }
  .toast-success { background: var(--success); }
  .toast-error { background: var(--danger); }
  .toast-info { background: var(--primary); }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  
  /* Dark mode toggle */
  .toggle { position: relative; width: 44px; height: 24px; background: var(--border); border-radius: 12px; cursor: pointer; border: none; transition: background 0.3s; }
  .toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: transform 0.3s; }
  .dark .toggle { background: var(--primary); }
  .dark .toggle::after { transform: translateX(20px); }
  
  /* Pagination */
  .pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; }
  .pagination .btn { min-width: 36px; justify-content: center; }
  .page-info { font-size: 0.85rem; color: var(--text2); }
  
  /* Checkbox */
  input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary); }
  
  /* Color picker */
  input[type="color"] { width: 40px; height: 32px; border: 1px solid var(--border); border-radius: var(--radius); padding: 2px; cursor: pointer; background: var(--bg); }
  
  /* Password field wrapper */
  .password-wrap { position: relative; }
  .password-wrap input { padding-right: 40px; }
  .password-toggle { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text3); font-size: 0.8rem; }
  
  /* Confirm dialog */
  .confirm-text { margin-bottom: 16px; color: var(--text2); }
  
  /* PDF preview */
  .pdf-preview { width: 100%; height: 70vh; border: none; border-radius: var(--radius); }
  
  /* Responsive */
  @media (max-width: 768px) {
    .content { padding: 12px; }
    .header { padding: 10px 16px; }
    .header h1 { font-size: 1.1rem; }
    .tab { padding: 8px 12px; font-size: 0.8rem; }
    .modal { padding: 16px; }
    .form-row { grid-template-columns: 1fr; }
    .template-grid { grid-template-columns: 1fr; }
  }
  
  /* Loading spinner */
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  /* Section headers */
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .search-input { width: 250px; }
  
  /* Badge */
  .badge { display: inline-block; padding: 2px 8px; background: var(--primary); color: #fff; border-radius: 10px; font-size: 0.75rem; margin-left: 8px; }
`;

function App() {
  // Toast system
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Theme
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('qso-dark') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    document.body.className = darkMode ? 'dark' : '';
    try { localStorage.setItem('qso-dark', darkMode); } catch {}
  }, [darkMode]);

  // Tabs
  const [activeTab, setActiveTab] = useState('import');

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // QSOs
  const [qsos, setQsos] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedQsos, setSelectedQsos] = useState(new Set());

  // History
  const [history, setHistory] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');

  // Template editor
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [tplName, setTplName] = useState('');
  const [tplColors, setTplColors] = useState({ primary: '#1E90FF', secondary: '#000080', accent: '#FFD700', text: '#333333' });
  const [tplLayout, setTplLayout] = useState('classic');
  const [tplLogo, setTplLogo] = useState('');
  const [tplSaving, setTplSaving] = useState(false);
  const bgInputRef = useRef(null);

  // Preview
  const [previewQso, setPreviewQso] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  // Status checks
  const [qrzAuthenticated, setQrzAuthenticated] = useState(false);
  const [qrzChecking, setQrzChecking] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [testSending, setTestSending] = useState(false);

  // Settings
  const [settings, setSettings] = useState({
    station: { callsign: '', operatorName: '', qth: '' },
    qrz: { username: '', password: '' },
    email: { address: '', password: '', service: 'gmail' },
    azure: { tenantId: '', clientId: '', clientSecret: '' }
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ qrz: false, email: false, azure: false });

  // Fetch templates on mount
  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setTemplates(d); if (d.length > 0) setSelectedTemplate(d[0].id); }
    }).catch(() => addToast('Failed to load templates', 'error'));
    checkEmailStatus();
  }, []);

  const checkEmailStatus = () => {
    setEmailChecking(true);
    fetch('/api/email/status').then(r => r.json()).then(d => setEmailConfigured(d.configured || false)).catch(() => {}).finally(() => setEmailChecking(false));
  };

  // Sort QSOs
  const getSortedQsos = () => {
    let filtered = qsos;
    if (searchFilter) {
      const f = searchFilter.toLowerCase();
      filtered = filtered.filter(q =>
        (q.call || '').toLowerCase().includes(f) ||
        (q.name || '').toLowerCase().includes(f) ||
        (q.band || '').toLowerCase().includes(f) ||
        (q.mode || '').toLowerCase().includes(f) ||
        (q.date || '').includes(f)
      );
    }
    return [...filtered].sort((a, b) => {
      const va = (a[sortField] || '').toString();
      const vb = (b[sortField] || '').toString();
      return sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  };

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  // ADIF parse
  const handleParseAdif = async (adifText) => {
    if (!adifText.trim()) return;
    try {
      const r = await fetch('/api/adif/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adifText }) });
      const d = await r.json();
      if (d.qsos) {
        setQsos(d.qsos);
        addToast(`Parsed ${d.count} QSOs`, 'success');
        setActiveTab('qsos');
      } else {
        addToast(d.error || 'Parse failed', 'error');
      }
    } catch (e) { addToast('Network error parsing ADIF', 'error'); }
  };

  // ADIF file upload
  const handleAdifUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/adif/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.qsos) {
        setQsos(d.qsos);
        addToast(`Loaded ${d.count} QSOs from ${d.filename}`, 'success');
        setActiveTab('qsos');
      } else {
        addToast(d.error || 'Upload failed', 'error');
      }
    } catch (err) { addToast('Network error uploading ADIF', 'error'); }
    e.target.value = '';
  };

  // Generate PDF for single QSO
  const generatePdf = async (qso, download = false) => {
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) { addToast('Select a template first', 'error'); return; }
    try {
      const r = await fetch('/api/card/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qsoData: qso, template: tpl.id })
      });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = url; a.download = `QSO_${qso.call || 'unknown'}.pdf`; a.click();
        URL.revokeObjectURL(url);
        addToast('PDF downloaded', 'success');
      } else {
        setPreviewQso(qso);
        setPreviewUrl(url);
      }
    } catch (err) { addToast('Failed to generate PDF', 'error'); }
  };



  // Preview template with sample QSO
  const previewTemplate = async (tpl) => {
    const sampleQSO = {
      call: 'CT1ABC',
      qso_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      time_on: new Date().toISOString().slice(11, 16).replace(':', ''),
      band: '20m',
      mode: 'SSB',
      rst_sent: '59',
      rst_rcvd: '59',
      name: 'Sample Station',
      city: 'Lisbon',
      country: 'Portugal',
      grid: 'IM58',
      freq: '14.200',
      qth: 'Lisbon, Portugal',
      station_callsign: 'CR7BUI'
    };
    try {
      addToast('Generating preview...', 'info');
      const r = await fetch('/api/card/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qsoData: sampleQSO, template: tpl.id })
      });
      if (!r.ok) throw new Error('PDF generation failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setPreviewQso(sampleQSO);
      setPreviewUrl(url);
    } catch (err) { addToast('Preview failed: ' + err.message, 'error'); }
  };

  // Batch process
  const handleBatchProcess = () => {
    const sel = qsos.filter(q => selectedQsos.has(q._id || q.id || JSON.stringify(q)));
    if (sel.length === 0) { addToast('No QSOs selected', 'error'); return; }
    if (!selectedTemplate) { addToast('Select a template first', 'error'); return; }
    setConfirmText(`Process ${sel.length} QSO(s) and send emails?`);
    setConfirmAction(() => async () => {
      const tpl = templates.find(t => t.id === selectedTemplate);
      try {
        const r = await fetch('/api/cards/process-batch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qsos: sel, template: tpl.id })
        });
        const d = await r.json();
        if (d.results) {
          const ok = d.results.filter(x => x.success).length;
          addToast(`Batch done: ${ok}/${sel.length} successful`, ok === sel.length ? 'success' : 'info');
        } else {
          addToast(d.error || 'Batch failed', 'error');
        }
      } catch (err) { addToast('Batch processing error', 'error'); }
      setSelectedQsos(new Set());
    });
    setConfirmOpen(true);
  };

  // Template CRUD
  const openTemplateEditor = (tpl = null) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setTplName(tpl.name);
      setTplColors(tpl.colors || { primary: '#1E90FF', secondary: '#000080', accent: '#FFD700', text: '#333333' });
      setTplLayout(tpl.layout || 'classic');
      setTplLogo(tpl.logo || '');
    } else {
      setEditingTemplate(null);
      setTplName('');
      setTplColors({ primary: '#1E90FF', secondary: '#000080', accent: '#FFD700', text: '#333333' });
      setTplLayout('classic');
      setTplLogo('');
    }
    setShowTemplateEditor(true);
  };

  const saveTemplate = async () => {
    if (!tplName.trim()) { addToast('Template name is required', 'error'); return; }
    setTplSaving(true);
    try {
      const body = { name: tplName, colors: tplColors, layout: tplLayout, logo: tplLogo };
      const r = editingTemplate
        ? await fetch(`/api/templates/${editingTemplate.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.id || d.success) {
        addToast(editingTemplate ? 'Template updated' : 'Template created', 'success');
        const tr = await fetch('/api/templates');
        const td = await tr.json();
        if (Array.isArray(td)) setTemplates(td);
        if (d.id) setSelectedTemplate(d.id);
        setShowTemplateEditor(false);
      } else {
        addToast(d.error || 'Save failed', 'error');
      }
    } catch (err) { addToast('Template save error', 'error'); }
    setTplSaving(false);
  };

  const deleteTemplate = async (tpl) => {
    if (tpl.builtIn) { addToast('Cannot delete built-in templates', 'error'); return; }
    try {
      const r = await fetch(`/api/templates/${tpl.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success || d.id) {
        addToast('Template deleted', 'success');
        setTemplates(prev => prev.filter(t => t.id !== tpl.id));
        if (selectedTemplate === tpl.id) setSelectedTemplate(templates[0]?.id || null);
      } else { addToast(d.error || 'Delete failed', 'error'); }
    } catch (err) { addToast('Delete error', 'error'); }
  };

  // Background image
  const handleBgUpload = async (tplId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`/api/templates/${tplId}/background`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success || d.backgroundUrl) {
        addToast('Background uploaded', 'success');
        const tr = await fetch('/api/templates');
        const td = await tr.json();
        if (Array.isArray(td)) setTemplates(td);
      } else { addToast(d.error || 'Upload failed', 'error'); }
    } catch (err) { addToast('Background upload error', 'error'); }
    e.target.value = '';
  };

  const removeBg = async (tplId) => {
    try {
      await fetch(`/api/templates/${tplId}/background`, { method: 'DELETE' });
      addToast('Background removed', 'success');
      setTemplates(prev => prev.map(t => t.id === tplId ? { ...t, backgroundUrl: null } : t));
    } catch (err) { addToast('Remove background error', 'error'); }
  };

  // History
  useEffect(() => {
    if (activeTab !== 'history') return;
    const params = new URLSearchParams({ page: historyPage, limit: 20, search: historySearch });
    fetch(`/api/history?${params}`).then(r => r.json()).then(d => {
      if (d.items || d.results || Array.isArray(d)) setHistory(d);
    }).catch(() => addToast('Failed to load history', 'error'));
  }, [activeTab, historyPage, historySearch]);

  // Settings
  useEffect(() => {
    if (activeTab !== 'settings') return;
    setSettingsLoading(true);
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d && (d.station || d.qrz || d.email || d.azure)) {
        setSettings(prev => ({
          station: { ...prev.station, ...d.station },
          qrz: { ...prev.qrz, ...d.qrz },
          email: { ...prev.email, ...d.email },
          azure: { ...prev.azure, ...d.azure }
        }));
      }
    }).catch(() => {}).finally(() => setSettingsLoading(false));
  }, [activeTab]);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const d = await r.json();
      if (d.success) addToast('Settings saved', 'success');
      else addToast(d.error || 'Save failed', 'error');
    } catch (err) { addToast('Settings save error', 'error'); }
    setSettingsSaving(false);
  };

  const testQrz = async () => {
    setQrzChecking(true);
    try {
      const r = await fetch('/api/auth/qrz-server', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: settings.qrz.username, password: settings.qrz.password }) });
      const d = await r.json();
      setQrzAuthenticated(d.success || false);
      addToast(d.success ? 'QRZ authenticated' : 'QRZ auth failed', d.success ? 'success' : 'error');
    } catch (err) { addToast('QRZ test error', 'error'); }
    setQrzChecking(false);
  };

  const testEmail = async () => {
    const recipient = settings.email.address || settings.station.callsign;
    if (!recipient) { addToast('Set email address first', 'error'); return; }
    setTestSending(true);
    try {
      const r = await fetch('/api/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient, template: selectedTemplate }) });
      const d = await r.json();
      addToast(d.success ? `Test email sent via ${d.method || 'SMTP'}` : d.detail || 'Email failed', d.success ? 'success' : 'error');
      if (d.success) checkEmailStatus();
    } catch (err) { addToast('Email test error', 'error'); }
    setTestSending(false);
  };

  // Toggle select all QSOs
  const toggleSelectAll = () => {
    const sorted = getSortedQsos();
    if (selectedQsos.size === sorted.length && sorted.length > 0) {
      setSelectedQsos(new Set());
    } else {
      setSelectedQsos(new Set(sorted.map(q => q._id || q.id || JSON.stringify(q))));
    }
  };

  const toggleQso = (qso) => {
    const key = qso._id || qso.id || JSON.stringify(qso);
    setSelectedQsos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Render helpers
  const sortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const PW = ({ field, value, onChange, showKey }) => (
    <div className="password-wrap">
      <input type={showPasswords[showKey] ? 'text' : 'password'} className="input" value={value} onChange={e => onChange(e.target.value)} />
      <button type="button" className="password-toggle" onClick={() => setShowPasswords(p => ({ ...p, [showKey]: !p[showKey] }))}>
        {showPasswords[showKey] ? '🙈' : '👁️'}
      </button>
    </div>
  );

  const renderTable = (data, columns, keyFn, rowActions) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} onClick={() => c.sortable && handleSort(c.key)}>
                {c.label}{c.sortable ? sortIcon(c.key) : ''}
              </th>
            ))}
            {rowActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length + (rowActions ? 1 : 0)} style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>No data</td></tr>
          ) : data.map((row, i) => (
            <tr key={keyFn(row, i)}>
              {columns.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key] || ''}</td>)}
              {rowActions && <td className="table-actions">{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Tab content
  const renderImportTab = () => (
    <div>
      <div className="card">
        <h3>📥 Paste ADIF Data</h3>
        <textarea className="input" placeholder="Paste ADIF records here..." style={{ minHeight: '150px' }} id="adif-textarea" />
        <div className="btn-group" style={{ marginTop: '12px' }}>
          <button className="btn btn-primary" onClick={() => {
            const el = document.getElementById('adif-textarea');
            if (el) handleParseAdif(el.value);
          }}>Parse ADIF</button>
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            📁 Upload .adi File
            <input type="file" accept=".adi,.adif,.txt" style={{ display: 'none' }} onChange={handleAdifUpload} />
          </label>
        </div>
      </div>
      {qsos.length > 0 && (
        <div className="card">
          <div className="section-header">
            <h3>Parsed QSOs ({qsos.length})</h3>
            <div className="btn-group">
              <button className="btn btn-primary" disabled={selectedQsos.size === 0} onClick={handleBatchProcess}>
                📧 Generate & Send ({selectedQsos.size} selected)
              </button>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <strong>Template:</strong>
            <select className="select" style={{ width: 'auto', minWidth: '200px' }} value={selectedTemplate || ''} onChange={e => setSelectedTemplate(e.target.value)}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.builtIn ? ' (built-in)' : ''}</option>)}
            </select>
          </label>
          {renderTable(getSortedQsos(), [
            { key: '_select', label: <input type="checkbox" checked={selectedQsos.size === getSortedQsos().length && getSortedQsos().length > 0} onChange={toggleSelectAll} />, render: row => <input type="checkbox" checked={selectedQsos.has(row._id || row.id || JSON.stringify(row))} onChange={() => toggleQso(row)} /> },
            { key: 'date', label: 'Date', sortable: true },
            { key: 'time', label: 'Time', sortable: true },
            { key: 'call', label: 'Call', sortable: true },
            { key: 'name', label: 'Name', sortable: true },
            { key: 'band', label: 'Band', sortable: true },
            { key: 'mode', label: 'Mode', sortable: true },
            { key: 'rst_sent', label: 'RST S', sortable: true },
            { key: 'rst_rcvd', label: 'RST R', sortable: true },
          ], (r, i) => r._id || r.id || i, row => (
            <>
              <button className="btn btn-sm btn-outline" onClick={() => generatePdf(row)}>👁 Preview</button>
              <button className="btn btn-sm btn-primary" onClick={() => generatePdf(row, true)}>📥 PDF</button>
            </>
          ))}
        </div>
      )}
    </div>
  );

  const renderTemplatesTab = () => (
    <div>
      <div className="section-header">
        <h3>🎨 Templates ({templates.length})</h3>
        <button className="btn btn-primary" onClick={() => openTemplateEditor()}>+ Add Template</button>
      </div>
      <div className="template-grid">
        {templates.map(tpl => (
          <div key={tpl.id} className={`template-card${selectedTemplate === tpl.id ? ' selected' : ''}`} onClick={() => setSelectedTemplate(tpl.id)}>
            <h4>{tpl.name} {tpl.builtIn ? '' : <span className="badge">Custom</span>}</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Layout: {tpl.layout || 'classic'}</div>
            {tpl.backgroundUrl && <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>🖼 Has background</div>}
            <div className="color-bar">
              <div className="color-swatch" style={{ background: tpl.colors?.primary || '#1E90FF' }} title="Primary" />
              <div className="color-swatch" style={{ background: tpl.colors?.secondary || '#000080' }} title="Secondary" />
              <div className="color-swatch" style={{ background: tpl.colors?.accent || '#FFD700' }} title="Accent" />
              <div className="color-swatch" style={{ background: tpl.colors?.text || '#333' }} title="Text" />
            </div>
            {tpl.logo && <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Logo: {tpl.logo}</div>}
            <div className="tpl-actions">
              <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); previewTemplate(tpl); }}>👁</button>
              <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); openTemplateEditor(tpl); }}>✏️</button>
              {!tpl.builtIn && <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteTemplate(tpl); }}>🗑</button>}
              <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                🖼 BG
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleBgUpload(tpl.id, e)} />
              </label>
              {tpl.backgroundUrl && <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); removeBg(tpl.id); }}>❌ BG</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQsosTab = () => (
    <div className="card">
      <div className="section-header">
        <h3>📋 Imported QSOs ({qsos.length})</h3>
        <div className="btn-group">
          <input className="input search-input" placeholder="🔍 Search..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
          <button className="btn btn-primary" disabled={selectedQsos.size === 0} onClick={handleBatchProcess}>
            📧 Process ({selectedQsos.size})
          </button>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <strong>Template:</strong>
        <select className="select" style={{ width: 'auto', minWidth: '200px' }} value={selectedTemplate || ''} onChange={e => setSelectedTemplate(e.target.value)}>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {renderTable(getSortedQsos(), [
        { key: '_select', label: <input type="checkbox" checked={selectedQsos.size === getSortedQsos().length && getSortedQsos().length > 0} onChange={toggleSelectAll} />, render: row => <input type="checkbox" checked={selectedQsos.has(row._id || row.id || JSON.stringify(row))} onChange={() => toggleQso(row)} /> },
        { key: 'date', label: 'Date', sortable: true },
        { key: 'time', label: 'Time', sortable: true },
        { key: 'call', label: 'Call', sortable: true },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'band', label: 'Band', sortable: true },
        { key: 'mode', label: 'Mode', sortable: true },
        { key: 'freq', label: 'Freq', sortable: true },
        { key: 'qth', label: 'QTH', sortable: true },
        { key: 'grid', label: 'Grid', sortable: true },
      ], (r, i) => r._id || r.id || i, row => (
        <>
          <button className="btn btn-sm btn-outline" onClick={() => generatePdf(row)}>👁</button>
          <button className="btn btn-sm btn-primary" onClick={() => generatePdf(row, true)}>📥</button>
        </>
      ))}
    </div>
  );

  const renderHistoryTab = () => {
    const items = history?.items || history?.results || (Array.isArray(history) ? history : []);
    const total = history?.total || history?.count || items.length;
    const pages = Math.ceil(total / 20);
    return (
      <div className="card">
        <div className="section-header">
          <h3>📜 History ({total})</h3>
          <input className="input search-input" placeholder="🔍 Search..." value={historySearch} onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }} />
        </div>
        {renderTable(items, [
          { key: 'date', label: 'Date', sortable: true, render: r => r.date || r.createdAt || '' },
          { key: 'call', label: 'Call', sortable: true, render: r => r.call || r.callsign || '' },
          { key: 'name', label: 'Name', render: r => r.name || '' },
          { key: 'band', label: 'Band', render: r => r.band || '' },
          { key: 'mode', label: 'Mode', render: r => r.mode || '' },
          { key: 'status', label: 'Status', render: r => r.status ? <span className={`pill ${r.status === 'sent' ? 'pill-green' : r.status === 'failed' ? 'pill-red' : 'pill-amber'}`}>{r.status}</span> : '-' },
          { key: 'method', label: 'Method', render: r => r.method || '' },
        ], (r, i) => r._id || r.id || i)}
        {pages > 1 && (
          <div className="pagination">
            <button className="btn btn-sm btn-outline" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)}>◀</button>
            <span className="page-info">Page {historyPage} / {pages}</span>
            <button className="btn btn-sm btn-outline" disabled={historyPage >= pages} onClick={() => setHistoryPage(p => p + 1)}>▶</button>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div>
      {/* Status */}
      <div className="card">
        <h3>📊 Status</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>QRZ.com: <span className={`pill ${qrzAuthenticated ? 'pill-green' : 'pill-red'}`}>{qrzAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}</span></div>
          <div>Email: <span className={`pill ${emailConfigured ? 'pill-green' : 'pill-amber'}`}>{emailChecking ? '⏳ Checking...' : emailConfigured ? '✅ Configured' : '⚠️ Not configured'}</span></div>
        </div>
        <div className="btn-group" style={{ marginTop: '12px' }}>
          <button className="btn btn-outline" disabled={qrzChecking} onClick={testQrz}>
            {qrzChecking ? <span className="spinner" /> : '🔍'} Test QRZ
          </button>
          <button className="btn btn-outline" disabled={testSending} onClick={testEmail}>
            {testSending ? <span className="spinner" /> : '📧'} Send Test Email
          </button>
        </div>
      </div>

      {/* Station Info */}
      <div className="card">
        <h3>📻 Station Info</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Callsign</label>
            <input className="input" value={settings.station.callsign} onChange={e => setSettings(s => ({ ...s, station: { ...s.station, callsign: e.target.value } }))} />
          </div>
          <div className="form-group">
            <label>Operator Name</label>
            <input className="input" value={settings.station.operatorName} onChange={e => setSettings(s => ({ ...s, station: { ...s.station, operatorName: e.target.value } }))} />
          </div>
          <div className="form-group">
            <label>QTH</label>
            <input className="input" value={settings.station.qth} onChange={e => setSettings(s => ({ ...s, station: { ...s.station, qth: e.target.value } }))} />
          </div>
        </div>
      </div>

      {/* QRZ.com */}
      <div className="card">
        <h3>🔍 QRZ.com</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Username</label>
            <input className="input" value={settings.qrz.username} onChange={e => setSettings(s => ({ ...s, qrz: { ...s.qrz, username: e.target.value } }))} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <PW field="qrz" value={settings.qrz.password} onChange={v => setSettings(s => ({ ...s, qrz: { ...s.qrz, password: v } }))} showKey="qrz" />
          </div>
        </div>
      </div>

      {/* Email SMTP */}
      <div className="card">
        <h3>📧 Email (SMTP)</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input className="input" value={settings.email.address} onChange={e => setSettings(s => ({ ...s, email: { ...s.email, address: e.target.value } }))} />
          </div>
          <div className="form-group">
            <label>Password / App Password</label>
            <PW field="email" value={settings.email.password} onChange={v => setSettings(s => ({ ...s, email: { ...s.email, password: v } }))} showKey="email" />
          </div>
          <div className="form-group">
            <label>Service</label>
            <select className="select" value={settings.email.service} onChange={e => setSettings(s => ({ ...s, email: { ...s.email, service: e.target.value } }))}>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook / Office 365</option>
              <option value="yahoo">Yahoo</option>
              <option value="custom">Custom SMTP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Email OAuth2 */}
      <div className="card">
        <h3>🔐 Email OAuth2 (Microsoft 365)</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Tenant ID</label>
            <input className="input" value={settings.azure.tenantId} onChange={e => setSettings(s => ({ ...s, azure: { ...s.azure, tenantId: e.target.value } }))} />
          </div>
          <div className="form-group">
            <label>Client ID</label>
            <input className="input" value={settings.azure.clientId} onChange={e => setSettings(s => ({ ...s, azure: { ...s.azure, clientId: e.target.value } }))} />
          </div>
          <div className="form-group">
            <label>Client Secret</label>
            <PW field="azure" value={settings.azure.clientSecret} onChange={v => setSettings(s => ({ ...s, azure: { ...s.azure, clientSecret: v } }))} showKey="azure" />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ textAlign: 'right' }}>
        <button className="btn btn-primary" disabled={settingsSaving} onClick={saveSettings}>
          {settingsSaving ? <span className="spinner" /> : '💾'} Save Settings
        </button>
      </div>
    </div>
  );

  const tabs = [
    { key: 'import', label: '📥 Import ADIF' },
    { key: 'templates', label: '🎨 Templates' },
    { key: 'qsos', label: `📋 QSOs${qsos.length > 0 ? ` (${qsos.length})` : ''}` },
    { key: 'history', label: '📜 History' },
    { key: 'settings', label: '⚙️ Settings' },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>)}
        </div>

        {/* Header */}
        <header className="header">
          <h1>⚡ QSO Card Generator</h1>
          <div className="header-actions">
            <button className="toggle" onClick={() => setDarkMode(!darkMode)} title="Toggle dark mode" />
          </div>
        </header>

        {/* Tabs */}
        <nav className="tabs">
          {tabs.map(t => <button key={t.key} className={`tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>)}
        </nav>

        {/* Content */}
        <main className="content">
          {activeTab === 'import' && renderImportTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'qsos' && renderQsosTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </main>
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <div className="modal-overlay" onClick={() => setShowTemplateEditor(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingTemplate ? '✏️ Edit Template' : '➕ New Template'}</h3>
            <div className="form-group">
              <label>Name</label>
              <input className="input" value={tplName} onChange={e => setTplName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Colors</label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {['primary', 'secondary', 'accent', 'text'].map(key => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{key}:</span>
                    <input type="color" value={tplColors[key]} onChange={e => setTplColors(c => ({ ...c, [key]: e.target.value }))} />
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Layout</label>
              <select className="select" value={tplLayout} onChange={e => setTplLayout(e.target.value)}>
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
                <option value="photo">Photo Card</option>
              </select>
            </div>
            <div className="form-group">
              <label>Logo URL</label>
              <input className="input" value={tplLogo} onChange={e => setTplLogo(e.target.value)} placeholder="https://..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowTemplateEditor(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={tplSaving} onClick={saveTemplate}>
                {tplSaving ? <span className="spinner" /> : '💾'} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="modal-overlay" onClick={() => { setPreviewUrl(''); setPreviewQso(null); }}>
          <div className="modal" style={{ maxWidth: '900px', padding: '12px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0 }}>📄 Preview - {previewQso?.call || 'QSO'}</h3>
              <div className="btn-group">
                <button className="btn btn-sm btn-primary" onClick={() => generatePdf(previewQso, true)}>📥 Download</button>
                <button className="btn btn-sm btn-outline" onClick={() => { setPreviewUrl(''); setPreviewQso(null); }}>✕ Close</button>
              </div>
            </div>
            <iframe src={previewUrl} className="pdf-preview" title="PDF Preview" />
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmOpen && (
        <div className="modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h3>⚠️ Confirm</h3>
            <p className="confirm-text">{confirmText}</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setConfirmOpen(false); if (confirmAction) confirmAction(); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
