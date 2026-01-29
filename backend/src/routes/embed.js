import { Router } from 'express';
import { getPrayersForWeek } from '../services/prayerService.js';
import { getCurrentWeekInfo, getWeekDates, formatDate } from '../utils/weekHelper.js';

const router = Router();

// CORS middleware for embed routes
const embedCors = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};

router.use(embedCors);

// GET /api/embed/data - Get prayer data for embedding (CORS enabled)
router.get('/data', async (req, res, next) => {
  try {
    const { week, year } = getCurrentWeekInfo();
    const { startDate, endDate } = getWeekDates(week, year);

    const prayers = await getPrayersForWeek(week, year, {
      includeUnapproved: false,
      includeOriginal: false
    });

    res.json({
      week,
      year,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      prayers: {
        pastor: prayers.pastor.map(p => ({ content: p.content })),
        staff: prayers.staff.map(p => ({ content: p.content })),
        public: prayers.public.filter(p => p.isApproved).map(p => ({ content: p.content }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/embed/widget.js - Embeddable JavaScript widget
router.get('/widget.js', (req, res) => {
  const baseUrl = process.env.BASE_URL || '';

  const widgetJs = `
(function() {
  var container = document.getElementById('weekly-prayers-widget');
  if (!container) {
    console.error('Weekly Prayers: Container element #weekly-prayers-widget not found');
    return;
  }

  var apiUrl = '${baseUrl}/api/embed/data';

  fetch(apiUrl)
    .then(function(response) { return response.json(); })
    .then(function(data) {
      var html = '<div class="wp-widget">';
      html += '<h3 class="wp-title">Rukousaiheet - Viikko ' + data.week + '/' + data.year + '</h3>';

      if (data.prayers.pastor.length > 0) {
        html += '<div class="wp-section wp-pastor">';
        html += '<h4>Kirkkoherran aihe</h4>';
        data.prayers.pastor.forEach(function(p) {
          html += '<p>' + escapeHtml(p.content) + '</p>';
        });
        html += '</div>';
      }

      if (data.prayers.staff.length > 0) {
        html += '<div class="wp-section wp-staff">';
        html += '<h4>Työntekijöiden aiheet</h4>';
        data.prayers.staff.forEach(function(p) {
          html += '<p>' + escapeHtml(p.content) + '</p>';
        });
        html += '</div>';
      }

      if (data.prayers.public.length > 0) {
        html += '<div class="wp-section wp-public">';
        html += '<h4>Seurakunnan aiheet</h4>';
        data.prayers.public.forEach(function(p) {
          html += '<p>' + escapeHtml(p.content) + '</p>';
        });
        html += '</div>';
      }

      html += '</div>';
      container.innerHTML = html;

      // Add default styles if not already present
      if (!document.getElementById('wp-widget-styles')) {
        var style = document.createElement('style');
        style.id = 'wp-widget-styles';
        style.textContent = '.wp-widget { font-family: system-ui, sans-serif; max-width: 600px; } .wp-title { color: #1e3a5f; border-bottom: 2px solid #c9a227; padding-bottom: 8px; } .wp-section { margin: 16px 0; } .wp-section h4 { color: #1e3a5f; margin-bottom: 8px; } .wp-section p { margin: 8px 0; line-height: 1.5; } .wp-pastor { background: #f8f4e8; padding: 16px; border-left: 4px solid #c9a227; }';
        document.head.appendChild(style);
      }
    })
    .catch(function(error) {
      container.innerHTML = '<p style="color: #999;">Rukousaiheiden lataus epäonnistui.</p>';
      console.error('Weekly Prayers Widget Error:', error);
    });

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
`;

  res.setHeader('Content-Type', 'application/javascript');
  res.send(widgetJs);
});

// GET /api/embed/iframe - Embeddable iframe content
router.get('/iframe', async (req, res, next) => {
  try {
    const { week, year } = getCurrentWeekInfo();
    const { startDate, endDate } = getWeekDates(week, year);

    const prayers = await getPrayersForWeek(week, year, {
      includeUnapproved: false,
      includeOriginal: false
    });

    const html = `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rukousaiheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; line-height: 1.6; color: #333; }
    h2 { color: #1e3a5f; border-bottom: 2px solid #c9a227; padding-bottom: 8px; margin-bottom: 16px; }
    h3 { color: #1e3a5f; font-size: 1rem; margin: 16px 0 8px; }
    .pastor { background: #f8f4e8; padding: 16px; border-left: 4px solid #c9a227; margin: 16px 0; }
    .prayer { margin: 8px 0; padding: 8px 0; border-bottom: 1px dotted #eee; }
    .prayer:last-child { border-bottom: none; }
    .empty { color: #999; font-style: italic; }
  </style>
</head>
<body>
  <h2>Viikko ${week}/${year}</h2>

  ${prayers.pastor.length > 0 ? `
    <div class="pastor">
      <h3>Kirkkoherran aihe</h3>
      ${prayers.pastor.map(p => `<p>${escapeHtml(p.content)}</p>`).join('')}
    </div>
  ` : ''}

  ${prayers.staff.length > 0 ? `
    <h3>Työntekijöiden aiheet</h3>
    ${prayers.staff.map(p => `<div class="prayer">${escapeHtml(p.content)}</div>`).join('')}
  ` : ''}

  ${prayers.public.filter(p => p.isApproved).length > 0 ? `
    <h3>Seurakunnan aiheet</h3>
    ${prayers.public.filter(p => p.isApproved).map(p => `<div class="prayer">${escapeHtml(p.content)}</div>`).join('')}
  ` : ''}

  ${prayers.pastor.length === 0 && prayers.staff.length === 0 && prayers.public.filter(p => p.isApproved).length === 0 ? `
    <p class="empty">Ei rukousaiheita tälle viikolle.</p>
  ` : ''}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

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
