import { Router } from 'express';
import { getPrayersForWeek } from '../services/prayerService.js';
import { getCurrentWeekInfo, getWeekDates, formatDate } from '../utils/weekHelper.js';
import { requireAuth } from '../middleware/authenticate.js';
import { requireWorker } from '../middleware/authorize.js';

const router = Router();

// GET /api/export/intercession - Get intercession printout (HTML)
router.get('/intercession', requireAuth, requireWorker, async (req, res, next) => {
  try {
    let { week, year } = req.query;

    if (!week || !year) {
      const current = getCurrentWeekInfo();
      week = week || current.week;
      year = year || current.year;
    }

    week = parseInt(week, 10);
    year = parseInt(year, 10);

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
      prayers
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

function generateIntercessionHTML({ week, year, startDate, endDate, prayers }) {
  const formatDateFi = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' });
  };

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esirukous - Viikko ${week}/${year}</title>
  <style>
    @page { margin: 2cm; }
    @media print {
      body { font-size: 12pt; }
      .no-print { display: none; }
    }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      text-align: center;
      color: #1e3a5f;
      border-bottom: 2px solid #c9a227;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e3a5f;
      margin-top: 30px;
      font-size: 1.2em;
    }
    .date-range {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }
    .pastor-section {
      background: #f8f4e8;
      padding: 20px;
      border-left: 4px solid #c9a227;
      margin: 20px 0;
    }
    .prayer-item {
      margin: 15px 0;
      padding: 10px 0;
      border-bottom: 1px dotted #ddd;
    }
    .prayer-item:last-child {
      border-bottom: none;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #1e3a5f;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    .print-button:hover {
      background: #2d4a6f;
    }
    .empty {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Tulosta</button>

  <h1>Esirukous</h1>
  <p class="date-range">Viikko ${week}/${year} (${formatDateFi(startDate)} - ${formatDateFi(endDate)})</p>

  ${prayers.pastor.length > 0 ? `
    <div class="pastor-section">
      <h2>Kirkkoherran aihe</h2>
      ${prayers.pastor.map(p => `<p>${escapeHtml(p.content)}</p>`).join('')}
    </div>
  ` : ''}

  ${prayers.staff.length > 0 ? `
    <h2>Työntekijöiden rukousaiheet</h2>
    ${prayers.staff.map(p => `
      <div class="prayer-item">
        <p>${escapeHtml(p.content)}</p>
      </div>
    `).join('')}
  ` : ''}

  ${prayers.public.filter(p => p.isApproved).length > 0 ? `
    <h2>Seurakunnan rukousaiheet</h2>
    ${prayers.public.filter(p => p.isApproved).map(p => `
      <div class="prayer-item">
        <p>${escapeHtml(p.content)}</p>
      </div>
    `).join('')}
  ` : ''}

  ${prayers.pastor.length === 0 && prayers.staff.length === 0 && prayers.public.filter(p => p.isApproved).length === 0 ? `
    <p class="empty">Ei rukousaiheita tälle viikolle.</p>
  ` : ''}

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
