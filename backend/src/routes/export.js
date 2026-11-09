import { Router } from 'express';
import { getPrayersForWeek } from '../services/prayerService.js';
import { getCurrentWeekInfo, getWeekDates, formatDate } from '../utils/weekHelper.js';
import { requireAuth } from '../middleware/authenticate.js';
import { requirePrayerListAccess } from '../middleware/authorize.js';

const router = Router();

// GET /api/export/intercession - Get Sunday mass intercession / prayer list (HTML)
// Accessible by admin, coordinator, worker, bishop, and prayer_group
router.get('/intercession', requireAuth, requirePrayerListAccess, async (req, res, next) => {
  try {
    let { week, year, highlightsOnly, mode } = req.query;

    if (!week || !year) {
      const current = getCurrentWeekInfo();
      week = week || current.week;
      year = year || current.year;
    }

    week = parseInt(week, 10);
    year = parseInt(year, 10);
    const isHighlightsOnly = highlightsOnly === 'true' || highlightsOnly === '1';
    const initialMode = (mode === 'toggle' || mode === 'mobile') ? 'toggle' : 'print';

    const prayers = await getPrayersForWeek(week, year, {
      includeUnapproved: false,
      includeOriginal: false
    });

    const { startDate, endDate } = getWeekDates(week, year);

    const html = generateIntercessionHTML({
      week,
      year,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      prayers,
      initialHighlightsOnly: isHighlightsOnly,
      initialMode
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

function generateIntercessionHTML({ week, year, startDate, endDate, prayers, initialHighlightsOnly = false, initialMode = 'print' }) {
  const formatDateFi = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' });
  };

  const hasBishop = prayers.bishop && prayers.bishop.length > 0;
  const hasPastor = prayers.pastor && prayers.pastor.length > 0;
  const staffPrayers = prayers.staff || [];
  const publicPrayers = (prayers.public || []).filter((p) => p.isApproved);

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esirukous - Viikko ${week}/${year}</title>
  <style>
    @page { margin: 2cm; }
    @media print {
      body { font-size: 12pt; background: #fff !important; }
      .no-print { display: none !important; }
      .page-container { margin: 0; padding: 0; box-shadow: none !important; max-width: 100% !important; }
      .toggle-badge, .toggle-progress-bar { display: none !important; }
      .prayer-item { page-break-inside: avoid; }
    }
    * {
      box-sizing: border-box;
    }
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
      transition: background 0.15s;
    }
    .print-btn:hover {
      background: #2d4a6f;
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
      transition: all 0.15s;
    }
    .reset-btn:hover {
      background: #fecaca;
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
      padding: 24px 20px 48px;
      background: transparent;
      box-shadow: none;
      margin-top: 12px;
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
      letter-spacing: 0.5px;
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
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    body.is-toggle-mode h2 {
      border-bottom: none;
      padding-bottom: 0;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 12pt;
    }

    .bishop-section {
      background: #faf5ff;
      padding: 16px 20px;
      border-left: 4px solid #7e22ce;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
      transition: all 0.2s;
    }
    .pastor-section {
      background: #fefce8;
      padding: 16px 20px;
      border-left: 4px solid #ca8a04;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
      transition: all 0.2s;
    }
    .prayer-item {
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px dotted #cbd5e1;
      position: relative;
      transition: all 0.2s ease;
    }
    .prayer-item:last-child {
      border-bottom: none;
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
    body.is-toggle-mode .bishop-section {
      border-left: 5px solid #7e22ce;
    }
    body.is-toggle-mode .pastor-section {
      border-left: 5px solid #ca8a04;
    }
    body.is-toggle-mode .prayer-item:hover {
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.05);
    }
    body.is-toggle-mode .prayer-item:active {
      transform: scale(0.99);
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
      opacity: 0.92;
    }
    body.is-toggle-mode .is-checked .toggle-badge {
      background: #10b981;
      border-color: #059669;
      color: #ffffff;
    }
    body.is-toggle-mode .is-checked p {
      color: #374151;
    }

    .prayer-item p, .bishop-section p, .pastor-section p {
      margin: 6px 0;
      font-size: 11.5pt;
      line-height: 1.55;
    }
    .highlight-badge {
      display: inline-block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fef3c7;
      color: #92400e;
      font-size: 9pt;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      margin-right: 6px;
    }
    .ministry-tag {
      display: inline-block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 9pt;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .empty {
      text-align: center;
      color: #64748b;
      font-style: italic;
      margin: 40px 0;
    }

    @media (max-width: 640px) {
      .toolbar { padding: 8px 12px; }
      .page-container { padding: 16px 12px; }
      h1 { font-size: 18pt; }
      .toggle-btn, .view-mode-btn { padding: 5px 10px; font-size: 12px; }
    }
  </style>
</head>
<body class="${initialMode === 'toggle' ? 'is-toggle-mode' : ''}">

  <!-- Controls (hidden on print) -->
  <div class="toolbar no-print">
    <div class="toolbar-left">
      <!-- 1. View Mode: Print vs Mobile Toggle -->
      <div class="view-mode-group">
        <button id="btn-mode-print" class="view-mode-btn ${initialMode === 'print' ? 'active' : ''}" onclick="setViewMode('print')">
          📄 Tulostus (Print)
        </button>
        <button id="btn-mode-toggle" class="view-mode-btn ${initialMode === 'toggle' ? 'active' : ''}" onclick="setViewMode('toggle')">
          📱 Mobiili / Kuittauslista
        </button>
      </div>

      <!-- 2. Highlights Filter -->
      <div class="toggle-group">
        <button id="btn-all" class="toggle-btn ${!initialHighlightsOnly ? 'active' : ''}" onclick="setFilterMode('all')">
          Kaikki
        </button>
        <button id="btn-highlights" class="toggle-btn ${initialHighlightsOnly ? 'active' : ''}" onclick="setFilterMode('highlights')">
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
    <!-- Interactive Progress Bar for Toggle / Mobile View -->
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
      Viikko ${week}/${year} (${formatDateFi(startDate)} - ${formatDateFi(endDate)})
      <div id="mode-indicator" class="filter-indicator" style="display: ${initialHighlightsOnly ? 'inline-block' : 'none'};">
        Vain nostetut aiheet (Highlights)
      </div>
    </div>

    <!-- Optional Bishop's Prayer (only included if added) -->
    ${hasBishop ? `
      <div id="prayer-bishop-0" class="bishop-section" data-prayer-id="bishop-0" onclick="togglePrayerCard('bishop-0')">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div>
            <h2 style="margin: 0; border: none; padding: 0;">☩ Piispan rukousaihe</h2>
            <span style="font-size: 10pt; color: #6b21a8; font-weight: 500;">Piispa Matti Repo</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="toggle-badge" id="badge-bishop-0">⚪ Merkitse</span>
            <span style="font-size: 9pt; background:#f3e8ff; color:#6b21a8; padding:2px 8px; border-radius:12px; font-weight:600;">Piispa</span>
            <img src="/tampere_piispan_vaakuna.png" alt="Piispan vaakuna" style="max-height: 48px; max-width: 60px; object-fit: contain;" />
          </div>
        </div>
        ${prayers.bishop.map(p => `<p>${escapeHtml(p.content)}</p>`).join('')}
      </div>
    ` : ''}

    <!-- Pastor's Prayer Topic -->
    ${hasPastor ? `
      <div id="prayer-pastor-0" class="pastor-section" data-prayer-id="pastor-0" onclick="togglePrayerCard('pastor-0')">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <h2 style="margin: 0; border: none; padding: 0;">Kirkkoherran aihe</h2>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="toggle-badge" id="badge-pastor-0">⚪ Merkitse</span>
            ${prayers.pastor[0].logoUrl ? `<img src="${prayers.pastor[0].logoUrl}" alt="Seurakunnan logo" style="max-height: 44px; max-width: 56px; object-fit: contain;" />` : ''}
          </div>
        </div>
        ${prayers.pastor.map(p => `<p>${escapeHtml(p.content)}</p>`).join('')}
      </div>
    ` : ''}

    <!-- Ministry Prayers (Työalojen rukousaiheet) -->
    <div id="section-staff" ${staffPrayers.length === 0 ? 'style="display:none"' : ''}>
      <h2>Työalojen rukousaiheet</h2>
      <div id="staff-prayers-container">
        ${staffPrayers.map((p, idx) => {
          const isHighlighted = (p.highlightPriority || 0) > 0;
          const pid = 'staff-' + (p.id || idx);
          return `
            <div id="prayer-${pid}" class="prayer-item ${isHighlighted ? 'is-highlight' : 'is-regular'}" data-highlight="${isHighlighted ? '1' : '0'}" data-prayer-id="${pid}" onclick="togglePrayerCard('${pid}')">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  ${isHighlighted ? '<span class="highlight-badge">⭐ Nosto</span>' : ''}
                  ${p.ministryTag ? `<span class="ministry-tag">🏷️ ${escapeHtml(p.ministryTag)}</span>` : ''}
                </div>
                <span class="toggle-badge" id="badge-${pid}">⚪ Merkitse</span>
              </div>
              <p>${escapeHtml(p.content)}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Parishioner Prayers (Seurakuntalaisten rukousaiheet) -->
    <div id="section-public" ${publicPrayers.length === 0 ? 'style="display:none"' : ''}>
      <h2>Seurakuntalaisten rukousaiheet</h2>
      <div id="public-prayers-container">
        ${publicPrayers.map((p, idx) => {
          const isHighlighted = (p.highlightPriority || 0) > 0;
          const pid = 'public-' + (p.id || idx);
          return `
            <div id="prayer-${pid}" class="prayer-item ${isHighlighted ? 'is-highlight' : 'is-regular'}" data-highlight="${isHighlighted ? '1' : '0'}" data-prayer-id="${pid}" onclick="togglePrayerCard('${pid}')">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  ${isHighlighted ? '<span class="highlight-badge">⭐ Nosto</span>' : ''}
                </div>
                <span class="toggle-badge" id="badge-${pid}">⚪ Merkitse</span>
              </div>
              <p>${escapeHtml(p.content)}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div id="empty-notice" class="empty" style="display: ${(!hasBishop && !hasPastor && staffPrayers.length === 0 && publicPrayers.length === 0) ? 'block' : 'none'};">
      Ei rukousaiheita tälle viikolle.
    </div>
  </div>

  <script>
    const STORAGE_KEY = 'weekly_prayers_checked_w${week}_${year}';
    let currentMode = '${initialMode}';
    let checkedPrayers = {};

    try {
      checkedPrayers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      checkedPrayers = {};
    }

    function setViewMode(mode) {
      currentMode = mode;
      const isToggle = mode === 'toggle';
      document.body.classList.toggle('is-toggle-mode', isToggle);

      document.getElementById('btn-mode-print').classList.toggle('active', !isToggle);
      document.getElementById('btn-mode-toggle').classList.toggle('active', isToggle);

      document.getElementById('btn-print').style.display = isToggle ? 'none' : 'inline-flex';
      document.getElementById('btn-reset-checks').style.display = isToggle ? 'inline-block' : 'none';
      document.getElementById('toggle-progress').style.display = isToggle ? 'block' : 'none';

      updateProgress();
    }

    function setFilterMode(filter) {
      const isHighlightsOnly = filter === 'highlights';
      document.getElementById('btn-all').classList.toggle('active', !isHighlightsOnly);
      document.getElementById('btn-highlights').classList.toggle('active', isHighlightsOnly);
      document.getElementById('mode-indicator').style.display = isHighlightsOnly ? 'inline-block' : 'none';

      // Hide or show regular prayer items
      document.querySelectorAll('.is-regular').forEach(function(el) {
        el.style.display = isHighlightsOnly ? 'none' : 'block';
      });

      // Update section visibility if all items inside are hidden
      ['section-staff', 'section-public'].forEach(function(secId) {
        const sec = document.getElementById(secId);
        if (!sec) return;
        if (isHighlightsOnly) {
          const hasVisible = sec.querySelectorAll('.is-highlight').length > 0;
          sec.style.display = hasVisible ? 'block' : 'none';
        } else {
          sec.style.display = 'block';
        }
      });

      updateProgress();
    }

    function togglePrayerCard(prayerId) {
      if (currentMode !== 'toggle') return;

      checkedPrayers[prayerId] = !checkedPrayers[prayerId];
      if (!checkedPrayers[prayerId]) {
        delete checkedPrayers[prayerId];
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedPrayers));
      } catch (e) {}

      renderCardCheckState(prayerId);
      updateProgress();
    }

    function renderCardCheckState(prayerId) {
      const el = document.getElementById('prayer-' + prayerId);
      const badge = document.getElementById('badge-' + prayerId);
      const isChecked = !!checkedPrayers[prayerId];

      if (el) {
        el.classList.toggle('is-checked', isChecked);
      }
      if (badge) {
        badge.textContent = isChecked ? '✓ Rukoiltu' : '⚪ Merkitse';
      }
    }

    function updateProgress() {
      // Count visible cards
      const allCards = document.querySelectorAll('[data-prayer-id]');
      let visibleCount = 0;
      let checkedCount = 0;

      allCards.forEach(function(card) {
        if (card.style.display !== 'none' && card.offsetParent !== null) {
          visibleCount++;
          const pid = card.getAttribute('data-prayer-id');
          if (checkedPrayers[pid]) {
            checkedCount++;
          }
        }
      });

      const pct = visibleCount > 0 ? Math.round((checkedCount / visibleCount) * 100) : 0;
      const textEl = document.getElementById('progress-text');
      const fillEl = document.getElementById('progress-fill');

      if (textEl) {
        textEl.textContent = checkedCount + ' / ' + visibleCount + ' (' + pct + '%)';
      }
      if (fillEl) {
        fillEl.style.width = pct + '%';
      }
    }

    function resetChecks() {
      if (confirm('Haluatko varmasti nollata luettujen rukousten merkinnät?')) {
        checkedPrayers = {};
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}

        document.querySelectorAll('[data-prayer-id]').forEach(function(card) {
          const pid = card.getAttribute('data-prayer-id');
          renderCardCheckState(pid);
        });
        updateProgress();
      }
    }

    // Initialize all cards check states on load
    document.addEventListener('DOMContentLoaded', function() {
      Object.keys(checkedPrayers).forEach(function(pid) {
        renderCardCheckState(pid);
      });
      updateProgress();
    });

    // Run on direct load
    Object.keys(checkedPrayers).forEach(function(pid) {
      renderCardCheckState(pid);
    });
    updateProgress();

    ${initialHighlightsOnly ? "setFilterMode('highlights');" : ''}
  </script>
</body>
</html>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

export default router;
