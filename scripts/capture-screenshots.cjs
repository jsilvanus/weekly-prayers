/**
 * Automated Screenshot Capture for Weekly Prayers App
 * Run with: node scripts/capture-screenshots.cjs
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('../frontend/node_modules/puppeteer-core');

const ARTIFACT_DIR = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/09b6cb1a-1fc2-458c-b10b-8b4a513f1aa5';
const REPO_SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

// Ensure output directories exist
[ARTIFACT_DIR, REPO_SCREENSHOTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const mockData = {
  week: 45,
  year: 2026,
  settings: {
    parish_name: 'Tuomiokirkkoseurakunta',
    parish_subtitle: 'Viikon 45/2026 rukousaiheet',
    color_palette: 'cathedral_blue',
    custom_color: '#1e3a5f',
    show_church_logo: 'true',
    show_parish_logo: 'true',
    church_logo_url: '',
    parish_logo_url: '',
    bishop_name: 'Matti Repo',
    bishop_diocese: 'Tampereen hiippakunta',
    bishop_crest_url: '/tampere_piispan_vaakuna.png',
    pastor_logo_url: '',
    daily_word_enabled: 'true',
    daily_word_title: 'Päivän sana',
    daily_word_verse: 'Ps. 103:1–4',
    daily_word_content: 'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.',
    daily_word_reflection: 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan. Hän antaa anteeksi syntisi ja parantaa sairautesi.'
  },
  prayers: {
    bishop: [
      {
        id: 'bishop-1',
        content: 'Rukoilemme hiippakuntamme seurakuntien ja kaikkien kirkon työntekijöiden ja vapaaehtoisten puolesta. Vahvistakoon Pyhä Henki meitä julistamaan toivoa ja elämään todeksi Kristuksen rakkautta arjessamme.',
        authorName: 'Hiippakunnan piispa',
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        createdAt: '2026-11-01T09:00:00Z',
        isApproved: true,
        logoUrl: '' // Uses default episcopal crest
      }
    ],
    pastor: [
      {
        id: 'pastor-1',
        content: 'Rukoilemme tällä viikolla rauhan puolesta maailmassa ja seurakuntamme ikäihmisten ja yksinäisten puolesta. Anna heille toivoa, lohtua ja lähimmäisen läsnäoloa syksyn pimeydessä.',
        startDate: '2026-11-02',
        endDate: '2026-11-08',
        createdAt: '2026-11-02T08:00:00Z',
        isApproved: true,
        authorName: 'Matti Meikäläinen (Kirkkoherra)',
        logoUrl: ''
      }
    ],
    staff: [
      {
        id: 'staff-1',
        content: 'Nuorisotyön puolesta: viikonloppuna alkava syysrippikoulu ja nuortenillan vapaaehtoiset vastuunkantajat.',
        authorName: 'Johannes (Nuorisotyönohjaaja)',
        ministryGroup: 'local',
        ministryTag: 'Nuorisotyö',
        highlightPriority: 25,
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        createdAt: '2026-11-03T10:15:00Z',
        isApproved: true
      },
      {
        id: 'staff-2',
        content: 'Diakoniakeskuksen ruokakassijakelun perheet ja taloudellisessa ahdingossa kamppailevat lähimmäiset.',
        authorName: 'Anna (Diakoni)',
        ministryGroup: 'local',
        ministryTag: 'Diakonia',
        highlightPriority: 15,
        startDate: '2026-11-01',
        endDate: '2026-11-20',
        createdAt: '2026-11-03T11:45:00Z',
        isApproved: true
      },
      {
        id: 'staff-3',
        content: 'Kansainvälinen vastuu: Kumppanuusseurakuntamme Namibiassa ja siellä toimivat opettajat ja terveydenhoitajat.',
        authorName: 'Lähetyssihteeri',
        ministryGroup: 'international',
        ministryTag: 'Lähetystyö',
        highlightPriority: 5,
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        createdAt: '2026-11-04T08:30:00Z',
        isApproved: true
      },
      {
        id: 'staff-4',
        content: 'Musiikkityön puolesta: Bach-konsertin harjoitukset ja kirkkokuoron uudet laulajat.',
        authorName: 'Kanttori',
        ministryGroup: 'local',
        ministryTag: 'Musiikkityö',
        highlightPriority: 0,
        startDate: '2026-11-02',
        endDate: '2026-11-08',
        createdAt: '2026-11-04T12:00:00Z',
        isApproved: true
      }
    ],
    public: [
      {
        id: 'pub-1',
        content: 'Rukousta läheisen toipumisen puolesta leikkauksen jälkeen ja perheelle jaksamista toipilasaikana.',
        authorName: 'Seurakuntalainen',
        highlightPriority: 20,
        startDate: '2026-11-02',
        endDate: '2026-11-16',
        createdAt: '2026-11-04T09:20:00Z',
        isApproved: true,
        aiFlagged: false
      },
      {
        id: 'pub-2',
        content: 'Voimia pitkään jatkuneeseen työnhakuun ja luottamusta huomiseen uuden edessä.',
        authorName: 'Seurakuntalainen',
        highlightPriority: 0,
        startDate: '2026-11-01',
        endDate: '2026-11-08',
        createdAt: '2026-11-04T14:05:00Z',
        isApproved: true,
        aiFlagged: false
      },
      {
        id: 'pub-3',
        content: 'Yksinäisyyden keskelle toivoa ja ystävällisiä kohtaamisia arjessa.',
        authorName: 'Seurakuntalainen',
        highlightPriority: 0,
        startDate: '2026-11-01',
        endDate: '2026-11-08',
        createdAt: '2026-11-05T09:15:00Z',
        isApproved: true,
        aiFlagged: false
      },
      {
        id: 'pub-4',
        content: 'Kiitos rukousvastauksesta ja toipumisesta pitkän sairausjakson jälkeen!',
        authorName: 'Seurakuntalainen',
        highlightPriority: 0,
        startDate: '2026-11-01',
        endDate: '2026-11-08',
        createdAt: '2026-11-05T12:00:00Z',
        isApproved: true,
        aiFlagged: false
      },
      {
        id: 'pub-5',
        content: 'Rukousapua koulukiusatulle lapselle ja viisautta koulun henkilökunnalle puuttua asiaan.',
        originalContent: 'Rukoilkaa poikani Villen puolesta Jokelan koulussa, häntä kiusataan joka päivä.',
        authorName: 'Huolestunut äiti',
        highlightPriority: 0,
        startDate: '2026-11-02',
        endDate: '2026-11-08',
        createdAt: '2026-11-05T16:30:00Z',
        isApproved: false,
        aiFlagged: true,
        aiFlagReason: 'Sisältää henkilönimen ja koulun nimen (yksityisyydensuoja) - moderoitu seurakunnan esirukouskäyttöön'
      }
    ]
  },
  count: 154,
  users: [
    {
      id: 'usr-coord',
      name: 'Maria Koordinaattori',
      email: 'maria.koordinaattori@tuomiokirkkoseurakunta.fi',
      role: 'coordinator',
      created_at: '2025-02-01T08:00:00Z',
      last_login: '2026-11-07T13:45:00Z'
    },
    {
      id: 'usr-admin',
      name: 'Matti Meikäläinen (Kirkkoherra)',
      email: 'matti.kirkkoherra@tuomiokirkkoseurakunta.fi',
      role: 'admin',
      created_at: '2025-01-10T08:00:00Z',
      last_login: '2026-11-07T12:30:00Z'
    },
    {
      id: 'usr-worker',
      name: 'Anna Virtanen (Diakoni)',
      email: 'anna.virtanen@tuomiokirkkoseurakunta.fi',
      role: 'worker',
      created_at: '2025-03-15T09:20:00Z',
      last_login: '2026-11-06T15:10:00Z'
    },
    {
      id: 'usr-parishioner',
      name: 'Kerttu Mäkelä (Seurakuntalainen)',
      email: 'kerttu.makela@gmail.com',
      role: 'user',
      created_at: '2025-09-20T11:30:00Z',
      last_login: '2026-11-07T11:00:00Z'
    },
    {
      id: 'usr-bishop',
      name: 'Matti Repo (Piispa)',
      email: 'matti.repo@tampereenhiippakunta.fi',
      role: 'bishop',
      created_at: '2025-01-01T08:00:00Z',
      last_login: '2026-11-08T06:00:00Z'
    },
    {
      id: 'usr-bishop-assistant',
      name: 'Sanna Ora-Tuominen (Piispan sihteeri)',
      email: 'sanna.ora@evl.fi',
      role: 'bishop',
      created_at: '2025-01-01T08:00:00Z',
      last_login: '2026-11-08T06:00:00Z'
    },
    {
      id: 'usr-prayer-group',
      name: 'Tuula Rukoilija (Rukousryhmä)',
      email: 'tuula.rukoilija@tuomiokirkkoseurakunta.fi',
      role: 'prayer_group',
      created_at: '2025-04-01T09:00:00Z',
      last_login: '2026-11-08T07:15:00Z'
    }
  ]
};

let currentMockUser = mockData.users[0];
let includeBishopInFeed = true;
const tampereCrestBase64 = fs.existsSync(path.join(__dirname, '../frontend/public/tampere_piispan_vaakuna.png'))
  ? 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../frontend/public/tampere_piispan_vaakuna.png')).toString('base64')
  : '';

function generateExportHtml(highlightsOnly = false, initialMode = 'print') {
  const bishopSection = (includeBishopInFeed && mockData.prayers.bishop.length > 0) ? `
    <div class="bishop-section" data-prayer-id="bishop-0" onclick="togglePrayerCheck('bishop-0')">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
        <div>
          <h2 style="color: #6b21a8; margin: 0; font-size: 13pt; text-transform: uppercase;">☩ Piispan rukousaihe</h2>
          <span style="font-size: 10pt; color: #6b21a8; font-weight: 500;">Piispa ${mockData.settings.bishop_name}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="toggle-badge" id="badge-bishop-0">⚪ Merkitse</span>
          <span style="font-size: 9pt; background:#f3e8ff; color:#6b21a8; padding:2px 8px; border-radius:12px; font-weight:600;">Piispa</span>
          <img src="${tampereCrestBase64}" alt="Tampereen piispan vaakuna" style="max-height: 48px; max-width: 60px; object-fit: contain;" />
        </div>
      </div>
      <p style="margin: 4px 0;">${mockData.prayers.bishop[0].content}</p>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esirukous - Viikko ${mockData.week}/${mockData.year}</title>
  <style>
    @page { margin: 2cm; }
    @media print {
      body { font-size: 12pt; background: #fff !important; }
      .no-print { display: none !important; }
      .page-container { margin: 0; padding: 0; box-shadow: none !important; max-width: 100% !important; }
      .toggle-badge, .toggle-progress-bar { display: none !important; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #faf8f5;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #2c2c2c;
      -webkit-font-smoothing: antialiased;
    }
    .toolbar {
      position: relative;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      z-index: 100;
    }
    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .view-mode-group, .toggle-group {
      display: inline-flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
    }
    .toggle-btn, .view-mode-btn {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 14px;
      border: none;
      background: transparent;
      color: #475569;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .toggle-btn.active, .view-mode-btn.active {
      background: #ffffff;
      color: #1e3a5f;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .view-mode-btn.active {
      background: #1e3a5f;
      color: #ffffff;
    }
    .print-btn {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 7px 16px;
      background: #1e3a5f;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .reset-btn {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 6px 12px;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }
    .page-container {
      max-width: 800px;
      margin: 24px auto 40px;
      background: #ffffff;
      padding: 44px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      transition: all 0.2s ease;
    }

    /* Toggle / Mobile View Styles */
    body.is-toggle-mode {
      background: #f8fafc;
    }
    body.is-toggle-mode .page-container {
      max-width: 680px;
      padding: 20px 16px 48px;
      background: transparent;
      box-shadow: none;
      margin-top: 8px;
    }
    .toggle-progress-bar {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .progress-track {
      height: 8px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      width: 0%;
      transition: width 0.3s ease;
    }
    .progress-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #334155;
      font-weight: 600;
    }

    h1 {
      text-align: center;
      color: #1e3a5f;
      margin-bottom: 4px;
      font-size: 26pt;
      font-weight: normal;
    }
    body.is-toggle-mode h1 {
      font-size: 20pt;
      margin-top: 8px;
    }
    .date-range {
      text-align: center;
      color: #64748b;
      margin-bottom: 24px;
      font-size: 11pt;
    }
    .filter-indicator {
      display: inline-block;
      font-size: 10pt;
      background: #fef3c7;
      color: #92400e;
      padding: 2px 10px;
      border-radius: 12px;
      margin-top: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
    }
    h2 {
      color: #1e3a5f;
      margin-top: 28px;
      margin-bottom: 12px;
      font-size: 13pt;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    body.is-toggle-mode h2 {
      border-bottom: none;
      padding-bottom: 0;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 12pt;
    }

    .pastor-section {
      background: #fdfaf2;
      padding: 16px 20px;
      border-left: 4px solid #c9a227;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
      transition: all 0.2s;
    }
    .pastor-section h2 { margin-top: 0; }
    .prayer-item {
      margin: 14px 0;
      padding: 8px 0;
      border-bottom: 1px dotted #e2e8f0;
      transition: all 0.2s ease;
    }

    /* Toggle Mode Card Styles */
    body.is-toggle-mode .bishop-section,
    body.is-toggle-mode .pastor-section,
    body.is-toggle-mode .prayer-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      cursor: pointer;
      user-select: none;
      position: relative;
    }
    body.is-toggle-mode .bishop-section { border-left: 5px solid #7e22ce; }
    body.is-toggle-mode .pastor-section { border-left: 5px solid #ca8a04; }
    body.is-toggle-mode .prayer-item:hover {
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.05);
    }

    /* Checked / Read State */
    .toggle-badge {
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #64748b;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    body.is-toggle-mode .toggle-badge {
      display: inline-flex;
    }
    body.is-toggle-mode .is-checked {
      background: #f0fdf4 !important;
      border-color: #86efac !important;
      opacity: 0.95;
    }
    body.is-toggle-mode .is-checked .toggle-badge {
      background: #10b981;
      border-color: #059669;
      color: #ffffff;
    }

    .highlight-badge {
      display: inline-block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9pt;
      font-weight: 600;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 1px 6px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .ministry-tag {
      display: inline-block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9pt;
      font-weight: 500;
      color: #1e40af;
      background: #eff6ff;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
    }
  </style>
</head>
<body class="${initialMode === 'toggle' ? 'is-toggle-mode' : ''}">
  <!-- Controls Toolbar -->
  <div class="toolbar no-print">
    <div class="toolbar-left">
      <div class="view-mode-group">
        <button id="btn-mode-print" class="view-mode-btn ${initialMode === 'print' ? 'active' : ''}" onclick="setViewMode('print')">
          📄 Tulostus (Print)
        </button>
        <button id="btn-mode-toggle" class="view-mode-btn ${initialMode === 'toggle' ? 'active' : ''}" onclick="setViewMode('toggle')">
          📱 Mobiili / Kuittauslista
        </button>
      </div>

      <div class="toggle-group">
        <button id="btn-all" class="toggle-btn ${!highlightsOnly ? 'active' : ''}" onclick="setFilterMode('all')">
          Kaikki
        </button>
        <button id="btn-highlights" class="toggle-btn ${highlightsOnly ? 'active' : ''}" onclick="setFilterMode('highlights')">
          ⭐ Vain nostot
        </button>
      </div>
    </div>

    <div class="toolbar-right">
      <button id="btn-reset-checks" class="reset-btn" style="display: ${initialMode === 'toggle' ? 'inline-block' : 'none'};" onclick="resetChecks()">
        ↺ Nollaa luetut
      </button>
      <button id="btn-print" class="print-btn" onclick="window.print()" style="display: ${initialMode === 'print' ? 'inline-flex' : 'none'};">
        🖨️ Tulosta
      </button>
    </div>
  </div>

  <div class="page-container">
    <!-- Progress Bar for Toggle View -->
    <div id="toggle-progress" class="toggle-progress-bar" style="display: ${initialMode === 'toggle' ? 'block' : 'none'};">
      <div class="progress-stats">
        <span>🕊️ Rukoiltu / läpikäyty:</span>
        <span id="progress-text">0 / 0 (0%)</span>
      </div>
      <div class="progress-track">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
        Napauta rukouskorttia merkitäksesi sen luetuksi. Tieto säilyy laitteellasi.
      </div>
    </div>

    <h1>Esirukous</h1>
    <div class="date-range">
      ${mockData.settings.parish_name} &bull; Viikko ${mockData.week}/${mockData.year} (2.11. - 8.11.2026)
      <div id="mode-indicator" class="filter-indicator" style="display: ${highlightsOnly ? 'inline-block' : 'none'};">
        Vain nostetut aiheet (Highlights)
      </div>
    </div>

    ${bishopSection}

    <div class="pastor-section" data-prayer-id="pastor-0" onclick="togglePrayerCheck('pastor-0')">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <h2>Kirkkoherran aihe</h2>
        <span class="toggle-badge" id="badge-pastor-0">⚪ Merkitse</span>
      </div>
      <p>${mockData.prayers.pastor[0].content}</p>
    </div>

    <div id="section-staff">
      <h2>Työalojen rukousaiheet</h2>
      <div class="prayer-item is-highlight" data-prayer-id="staff-0" onclick="togglePrayerCheck('staff-0')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div><span class="highlight-badge">⭐ Nosto</span><span class="ministry-tag">🏷️ Nuorisotyö</span></div>
          <span class="toggle-badge" id="badge-staff-0">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.staff[0].content}</p>
      </div>
      <div class="prayer-item is-highlight" data-prayer-id="staff-1" onclick="togglePrayerCheck('staff-1')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div><span class="highlight-badge">⭐ Nosto</span><span class="ministry-tag">🏷️ Diakonia</span></div>
          <span class="toggle-badge" id="badge-staff-1">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.staff[1].content}</p>
      </div>
      <div class="prayer-item is-highlight" data-prayer-id="staff-2" onclick="togglePrayerCheck('staff-2')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div><span class="highlight-badge">⭐ Nosto</span><span class="ministry-tag">🏷️ Lähetystyö</span></div>
          <span class="toggle-badge" id="badge-staff-2">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.staff[2].content}</p>
      </div>
      <div class="prayer-item is-regular" data-prayer-id="staff-3" onclick="togglePrayerCheck('staff-3')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div><span class="ministry-tag">🏷️ Musiikkityö</span></div>
          <span class="toggle-badge" id="badge-staff-3">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.staff[3].content}</p>
      </div>
    </div>

    <div id="section-public">
      <h2>Seurakuntalaisten rukousaiheet</h2>
      <div class="prayer-item is-highlight" data-prayer-id="public-0" onclick="togglePrayerCheck('public-0')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="highlight-badge">⭐ Nosto</span>
          <span class="toggle-badge" id="badge-public-0">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.public[0].content}</p>
      </div>
      <div class="prayer-item is-regular" data-prayer-id="public-1" onclick="togglePrayerCheck('public-1')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span></span>
          <span class="toggle-badge" id="badge-public-1">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.public[1].content}</p>
      </div>
      <div class="prayer-item is-regular" data-prayer-id="public-2" onclick="togglePrayerCheck('public-2')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span></span>
          <span class="toggle-badge" id="badge-public-2">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.public[2].content}</p>
      </div>
      <div class="prayer-item is-regular" data-prayer-id="public-3" onclick="togglePrayerCheck('public-3')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span></span>
          <span class="toggle-badge" id="badge-public-3">⚪ Merkitse</span>
        </div>
        <p>${mockData.prayers.public[3].content}</p>
      </div>
    </div>
  </div>

  <script>
    const storageKey = 'mock_prayers_checked_w' + ${mockData.week} + '_' + ${mockData.year};
    let checkedPrayers = new Set();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) checkedPrayers = new Set(JSON.parse(saved));
    } catch (e) {}

    let currentMode = '${initialMode}';

    function setViewMode(mode) {
      currentMode = mode;
      document.body.classList.toggle('is-toggle-mode', mode === 'toggle');
      document.getElementById('btn-mode-print').classList.toggle('active', mode === 'print');
      document.getElementById('btn-mode-toggle').classList.toggle('active', mode === 'toggle');
      document.getElementById('toggle-progress').style.display = mode === 'toggle' ? 'block' : 'none';
      document.getElementById('btn-reset-checks').style.display = mode === 'toggle' ? 'inline-block' : 'none';
      document.getElementById('btn-print').style.display = mode === 'print' ? 'inline-flex' : 'none';
      updateProgress();
    }

    function setFilterMode(mode) {
      const isHighlightsOnly = mode === 'highlights';
      document.getElementById('btn-all').classList.toggle('active', !isHighlightsOnly);
      document.getElementById('btn-highlights').classList.toggle('active', isHighlightsOnly);
      document.getElementById('mode-indicator').style.display = isHighlightsOnly ? 'inline-block' : 'none';

      document.querySelectorAll('.is-regular').forEach(function(el) {
        el.style.display = isHighlightsOnly ? 'none' : 'block';
      });
      updateProgress();
    }

    function togglePrayerCheck(id) {
      if (currentMode !== 'toggle') return;
      if (checkedPrayers.has(id)) {
        checkedPrayers.delete(id);
      } else {
        checkedPrayers.add(id);
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(checkedPrayers)));
      } catch (e) {}
      applyCheckedState();
    }

    function resetChecks() {
      if (confirm('Haluatko varmasti nollata kaikki rukouskuittaukset?')) {
        checkedPrayers.clear();
        try { localStorage.removeItem(storageKey); } catch (e) {}
        applyCheckedState();
      }
    }

    function applyCheckedState() {
      document.querySelectorAll('[data-prayer-id]').forEach(function(el) {
        const id = el.getAttribute('data-prayer-id');
        const isChecked = checkedPrayers.has(id);
        el.classList.toggle('is-checked', isChecked);
        const badge = document.getElementById('badge-' + id);
        if (badge) {
          badge.textContent = isChecked ? '✓ Rukoiltu' : '⚪ Merkitse';
        }
      });
      updateProgress();
    }

    function updateProgress() {
      const visibleItems = Array.from(document.querySelectorAll('[data-prayer-id]')).filter(function(el) {
        return el.offsetParent !== null || getComputedStyle(el).display !== 'none';
      });
      const total = visibleItems.length;
      const checked = visibleItems.filter(function(el) {
        return checkedPrayers.has(el.getAttribute('data-prayer-id'));
      }).length;
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

      const txt = document.getElementById('progress-text');
      const fill = document.getElementById('progress-fill');
      if (txt) txt.textContent = checked + ' / ' + total + ' (' + percent + '%)';
      if (fill) fill.style.width = percent + '%';
    }

    applyCheckedState();
    ${highlightsOnly ? "setFilterMode('highlights');" : ''}
    ${initialMode === 'toggle' ? "setViewMode('toggle');" : ''}
  </script>
</body>
</html>`;
}

function createMockServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Settings
    if (url.pathname === '/api/settings' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ settings: mockData.settings }));
      return;
    }

    if (url.pathname === '/api/settings' && req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          mockData.settings = { ...mockData.settings, ...(parsed.settings || parsed) };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ settings: mockData.settings }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
        }
      });
      return;
    }

    if (url.pathname === '/api/auth/me') {
      const auth = req.headers.authorization;
      if (auth && auth.includes('Bearer')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: currentMockUser }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Authentication required' } }));
      }
      return;
    }

    if (url.pathname === '/api/prayers' || url.pathname.startsWith('/api/prayers/week')) {
      const auth = req.headers.authorization;
      const isStaff = !!auth;

      const publicPrayers = isStaff 
        ? mockData.prayers.public 
        : mockData.prayers.public.filter(p => p.isApproved);

      const bishopPrayers = includeBishopInFeed ? mockData.prayers.bishop : [];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        week: mockData.week,
        year: mockData.year,
        prayers: {
          bishop: bishopPrayers,
          pastor: mockData.prayers.pastor,
          staff: mockData.prayers.staff,
          public: publicPrayers
        }
      }));
      return;
    }

    if (url.pathname === '/api/prayers/bishop' && req.method === 'POST') {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Bishop prayer topic created successfully.',
        prayer: mockData.prayers.bishop[0]
      }));
      return;
    }

    if (url.pathname === '/api/prayers/pastor' && req.method === 'POST') {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Pastor prayer topic created successfully.',
        prayer: mockData.prayers.pastor[0]
      }));
      return;
    }

    if (url.pathname.endsWith('/highlight') && req.method === 'PUT') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (url.pathname.startsWith('/api/counts/week')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ week: mockData.week, year: mockData.year, count: mockData.count }));
      return;
    }

    if (url.pathname === '/api/counts/increment' && req.method === 'POST') {
      mockData.count++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ week: mockData.week, year: mockData.year, count: mockData.count }));
      return;
    }

    if (url.pathname === '/api/users') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ users: mockData.users }));
      return;
    }

    if (url.pathname === '/api/export/intercession') {
      const highlightsOnly = url.searchParams.get('highlightsOnly') === 'true';
      const mode = url.searchParams.get('mode') || 'print';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateExportHtml(highlightsOnly, mode));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveScreenshot(page, filename) {
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  const repoPath = path.join(REPO_SCREENSHOTS_DIR, filename);

  await page.screenshot({ path: artifactPath, fullPage: true });
  fs.copyFileSync(artifactPath, repoPath);
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Starting Mock Server on port 3000...');
  const server = createMockServer();
  await new Promise(r => server.listen(3000, r));

  console.log('Starting Vite server...');
  const viteProcess = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: path.join(__dirname, '..', 'frontend'),
    stdio: 'ignore'
  });

  await wait(3000);

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1240, height: 980 }
  });

  const page = await browser.newPage();

  try {
    // 1. Homepage with EVL Branding: General Church circle logo, Parish logo, Martti font, DailyWord collapsible, Bishop with crest, Pastor topic, Ministry pills
    console.log('1. Capturing Homepage with EVL graphical identity and branding...');
    includeBishopInFeed = true;
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
    await wait(800);

    const fiBtn = await page.$('header button');
    if (fiBtn) {
      const text = await (await fiBtn.getProperty('textContent')).jsonValue();
      if (text.trim() === 'FI') await fiBtn.click();
    }
    await wait(600);
    await saveScreenshot(page, '01_weekly_prayers_home_evl_branding.png');

    // 2. Expand "Päivän sana" (Word of the day / Bible reading) collapsible
    console.log('2. Expanding Päivän sana (Word of the day) collapsible...');
    const dailyWordToggle = await page.$('[data-testid="daily-word-section"] button');
    if (dailyWordToggle) {
      await dailyWordToggle.click();
      await wait(500);
    }
    await saveScreenshot(page, '02_daily_word_expanded.png');

    // 3. Open "Jätä rukouspyyntö" modal dialog via the top button
    console.log('3. Clicking top button to open prayer modal dialog with calendar...');
    currentMockUser = mockData.users[3]; // Kerttu Mäkelä (parishioner)
    await page.evaluate(() => {
      sessionStorage.setItem('token', 'mock-parishioner-jwt');
    });
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
    await wait(800);

    const openBtn = await page.$('button.rounded-full');
    if (openBtn) {
      await openBtn.click();
      await wait(600);
    }

    await page.evaluate(() => {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.value = 'Rukoilemme läheisen toipumisen ja perheen jaksamisen puolesta leikkauksen jälkeen.';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(400);
    await saveScreenshot(page, '03_prayer_submission_modal_dialog.png');

    // Close modal
    const closeBtn = await page.$('button[title="Sulje"]');
    if (closeBtn) await closeBtn.click();
    await wait(400);

    // 4. Coordinator - Highlights Dashboard (with Z-values & groups)
    console.log('4. Capturing Coordinator Highlights Dashboard...');
    currentMockUser = mockData.users[0]; // Maria Koordinaattori
    await page.evaluate(() => {
      sessionStorage.setItem('token', 'mock-coord-jwt');
    });
    await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
    await wait(800);

    const tabs = await page.$$('nav button');
    for (const tab of tabs) {
      const text = await (await tab.getProperty('textContent')).jsonValue();
      if (text.includes('Rukousnostot') || text.includes('Highlights')) {
        await tab.click();
        await wait(600);
        break;
      }
    }
    await saveScreenshot(page, '04_coordinator_prayer_highlights.png');

    // 5. Admin - Parish Settings & Appearance (Seurakunnan ilme, EVL väripaletit, oma paikallisväri, logot)
    console.log('5. Capturing Admin Parish Settings & Appearance (EVL color palettes, custom color, logos)...');
    currentMockUser = mockData.users[1]; // Matti Meikäläinen (Admin)
    await page.evaluate(() => {
      sessionStorage.setItem('token', 'mock-admin-jwt');
    });
    await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
    await wait(800);

    const adminTabs = await page.$$('nav button');
    for (const tab of adminTabs) {
      const text = await (await tab.getProperty('textContent')).jsonValue();
      if (text.includes('ilme') || text.includes('asetukset') || text.includes('Settings')) {
        await tab.click();
        await wait(600);
        break;
      }
    }
    await saveScreenshot(page, '05_admin_parish_settings_and_palettes.png');

    // 6. Admin - Bishop Prayer Form (with uploadable Bishop Crest PNG)
    console.log('6. Capturing Admin Bishop Prayer Form with Crest upload...');
    const bTabs = await page.$$('nav button');
    for (const tab of bTabs) {
      const text = await (await tab.getProperty('textContent')).jsonValue();
      if (text.includes('Piispan aihe') || text.includes("Bishop's Topic")) {
        await tab.click();
        await wait(600);
        break;
      }
    }
    await saveScreenshot(page, '06_admin_bishop_prayer_form.png');

    // 7. Admin - Pastor Prayer Form (with optional Pastor Logo upload)
    console.log('7. Capturing Admin Pastor Prayer Form with optional logo upload...');
    const pTabs = await page.$$('nav button');
    for (const tab of pTabs) {
      const text = await (await tab.getProperty('textContent')).jsonValue();
      if (text.includes('Kirkkoherran aihe') || text.includes("Pastor's Topic")) {
        await tab.click();
        await wait(600);
        break;
      }
    }
    await saveScreenshot(page, '07_admin_pastor_prayer_form.png');

    // 8. Sunday Mass Printout - All prayers (with Bishop crest, Pastor seal, no liturgical additions, view toggle)
    console.log('8. Capturing Sunday Mass Printout - All prayers...');
    await page.goto('http://127.0.0.1:3000/api/export/intercession', { waitUntil: 'networkidle0' });
    await wait(400);
    await saveScreenshot(page, '08_intercession_printout_all.png');

    // 9. Sunday Mass Printout - Highlights only toggle
    console.log('9. Capturing Sunday Mass Printout - Highlights Only mode...');
    const highlightsBtn = await page.$('#btn-highlights');
    if (highlightsBtn) {
      await highlightsBtn.click();
      await wait(400);
    }
    await saveScreenshot(page, '09_intercession_printout_highlights_only.png');

    // 10. Bishop User Role Login - Restricted admin view (only Bishop's topic tab, no highlights)
    console.log('10. Capturing Bishop User Role view (restricted to bishop prayer, no highlights)...');
    currentMockUser = mockData.users.find(u => u.role === 'bishop'); // Matti Repo (Piispa)
    await page.evaluate(() => {
      sessionStorage.setItem('token', 'mock-bishop-jwt');
    });
    await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
    await wait(800);
    await saveScreenshot(page, '10_bishop_role_dashboard.png');

    // 11. Homepage when Bishop prayer is not present (strictly hidden)
    console.log('11. Capturing Homepage without Bishop prayer (strictly hidden)...');
    includeBishopInFeed = false;
    mockData.prayers.bishop = [];
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
    await wait(800);
    await saveScreenshot(page, '11_weekly_prayers_home_no_bishop.png');

    // 12. Prayer Group Mobile Toggle View (checklist with progress tracking)
    console.log('12. Capturing Mobile Toggle View (Kuittauslista) with checklist and progress tracking...');
    await page.setViewport({ width: 412, height: 915 });
    includeBishopInFeed = true;
    mockData.prayers.bishop = [{
      id: 'mock-bishop-topic',
      content: 'Rukoilemme seurakuntien työntekijöiden ja vapaaehtoisten jaksamisen puolesta syksyn pimeydessä sekä kirkolliskokouksen tulevien päätösten viisauden puolesta.',
      category: 'bishop',
      isHighlight: true
    }];
    await page.goto('http://127.0.0.1:3000/api/export/intercession?mode=toggle', { waitUntil: 'networkidle0' });
    await wait(500);

    // Click Bishop card and two ministry cards to demonstrate checked state and progress bar
    const bCard = await page.$('[data-prayer-id="bishop-0"]');
    if (bCard) await bCard.click();
    await wait(200);

    const sCard0 = await page.$('[data-prayer-id="staff-0"]');
    if (sCard0) await sCard0.click();
    await wait(200);

    const sCard1 = await page.$('[data-prayer-id="staff-1"]');
    if (sCard1) await sCard1.click();
    await wait(400);

    await saveScreenshot(page, '12_prayer_group_mobile_toggle_view.png');

    // Restore desktop viewport
    await page.setViewport({ width: 1280, height: 800 });

    // 13. Admin User Management showing Prayer Group role
    console.log('13. Capturing Admin User Management with Prayer Group role...');
    currentMockUser = mockData.users[1]; // Matti Meikäläinen (Admin)
    await page.evaluate(() => {
      sessionStorage.setItem('token', 'mock-admin-jwt');
    });
    await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
    await wait(800);

    const userTabs = await page.$$('nav button');
    for (const tab of userTabs) {
      const text = await (await tab.getProperty('textContent')).jsonValue();
      if (text.includes('Käyttäjä') || text.includes('Users')) {
        await tab.click();
        await wait(600);
        break;
      }
    }
    await saveScreenshot(page, '13_user_management_with_prayer_group.png');

    console.log('All screenshots completed successfully!');
  } finally {
    await browser.close();
    viteProcess.kill();
    server.close();
  }
}

run().catch((err) => {
  console.error('Error in screenshot execution:', err);
  process.exit(1);
});
