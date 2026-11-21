import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getPrayersForWeek,
  createPrayer,
  getPrayerById,
  approvePrayer,
  updatePrayerHighlight
} from '../services/prayerService.js';
import { getCurrentWeekInfoForTenant, getWeekDates, formatDate } from '../utils/weekHelper.js';
import { getAllSettings, updateSettings } from '../services/settingsService.js';
import { getAllTenants, getTenantHierarchy } from '../services/tenantService.js';
import { getBibleForDate } from '../services/bibleService.js';
import { sanitizePrayerContent } from '../services/aiSanitizer.js';
import { query } from '../db/index.js';

function result(data) {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      }
    ]
  };
}

function errorResult(message) {
  return {
    content: [{ type: 'text', text: `Virhe / Error: ${message}` }],
    isError: true
  };
}

function authError(publicUrl, message = 'Tämä toiminto vaatii kirjautumisen seurakunnan tunnuksella (kirjaudu työntekijänä tai ylläpitäjänä).') {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
    _meta: {
      'mcp/www_authenticate': [
        `Bearer resource_metadata="${publicUrl}/.well-known/oauth-protected-resource/mcp", scope="mcp", error="insufficient_scope", error_description="${message}"`
      ]
    }
  };
}

export function createMcpServer({ publicUrl, user }) {
  const server = new McpServer({
    name: 'weekly-prayers-mcp',
    version: '1.2.0'
  });

  const isStaff = user && ['worker', 'coordinator', 'bishop', 'admin'].includes(user.role);
  const isCoordinator = user && ['coordinator', 'admin'].includes(user.role);
  const isAdmin = user && user.role === 'admin';
  const isBishopOrAdmin = user && ['bishop', 'admin'].includes(user.role);
  const isPrayerListUser = user && ['worker', 'coordinator', 'bishop', 'prayer_group', 'admin'].includes(user.role);

  // ─────────────────────────────────────────────────────────────
  // 1. PUBLIC TOOLS (Available to anonymous parishioners & all users)
  // ─────────────────────────────────────────────────────────────

  // Tool: get_current_prayers
  server.registerTool(
    'get_current_prayers',
    {
      description: 'Hae tämänhetkisen rukousviikon aiheet (piispan aihe, kirkkoherran aihe, työalojen aiheet ja seurakuntalaisten aiheet) ja viikon tiedot, vastaa sitä mitä näkyy verkkosovelluksen etusivulla. Get current week prayer requests and week information as displayed on the main page.',
      inputSchema: {
        tenant: z.string().optional().describe('Seurakunnan tai yhtymän slug (esim. "riihimaki", "tuomiokirkko"). Jos tyhjä, käytetään oletusseurakuntaa.')
      }
    },
    async (args) => {
      try {
        const tenantSlug = args.tenant || null;
        const weekInfo = await getCurrentWeekInfoForTenant(tenantSlug);
        const prayers = await getPrayersForWeek(weekInfo.week, weekInfo.year, {
          includeUnapproved: isStaff,
          includeOriginal: isStaff,
          tenantSlug
        });

        return result({
          week: weekInfo.week,
          year: weekInfo.year,
          startDate: formatDate(weekInfo.startDate),
          endDate: formatDate(weekInfo.endDate),
          prayers: {
            bishop: prayers.bishop.map(p => ({ id: p.id, content: p.content, diocese: p.diocese })),
            pastor: prayers.pastor.map(p => ({ id: p.id, content: p.content })),
            staff: prayers.staff.map(p => ({
              id: p.id,
              content: p.content,
              group: p.ministryGroup,
              tag: p.ministryTag,
              isHighlighted: (p.highlightPriority || 0) > 0,
              highlightPriority: p.highlightPriority
            })),
            public: prayers.public.filter(p => isStaff || p.isApproved).map(p => ({
              id: p.id,
              content: p.content,
              isApproved: p.isApproved,
              isHighlighted: (p.highlightPriority || 0) > 0,
              highlightPriority: p.highlightPriority
            }))
          }
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: get_prayers_for_week
  server.registerTool(
    'get_prayers_for_week',
    {
      description: 'Hae tietyn viikon rukousaiheet viikkonumeron ja vuoden perusteella. Get prayers for a specific calendar week number and year.',
      inputSchema: {
        week: z.number().int().min(1).max(53).describe('Viikon numero (1-53)'),
        year: z.number().int().min(2020).max(2100).describe('Vuosi (esim. 2026)'),
        tenant: z.string().optional().describe('Seurakunnan slug')
      }
    },
    async (args) => {
      try {
        const prayers = await getPrayersForWeek(args.week, args.year, {
          includeUnapproved: isStaff,
          includeOriginal: isStaff,
          tenantSlug: args.tenant || null
        });
        return result({ week: args.week, year: args.year, prayers });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: get_daily_word
  server.registerTool(
    'get_daily_word',
    {
      description: 'Hae tämän päivän Päivän sana (raamatunjae, viite ja mietiskelyteksti) tai kirkkovuosikalenterin lukukappaleet. Get today\'s Daily Word scripture reading and reflection.',
      inputSchema: {}
    },
    async () => {
      try {
        const settings = await getAllSettings();
        const todayStr = new Date().toISOString().split('T')[0];
        const bibleData = await getBibleForDate(todayStr).catch(() => null);

        return result({
          dailyWord: {
            enabled: settings.daily_word_enabled === 'true',
            title: settings.daily_word_title || 'Päivän sana',
            verse: settings.daily_word_verse || 'Ps. 103:1–4',
            content: settings.daily_word_content || '',
            reflection: settings.daily_word_reflection || ''
          },
          lectionary: bibleData
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: get_prayer_counts
  server.registerTool(
    'get_prayer_counts',
    {
      description: 'Hae rukouslaskurin lukema tälle viikolle. Näyttää montako kertaa seurakuntalaiset ovat painaneet "Rukoilin tämän puolesta" -painiketta. Get total prayer count for the current week.',
      inputSchema: {
        tenant: z.string().optional().describe('Seurakunnan slug')
      }
    },
    async (args) => {
      try {
        const weekInfo = await getCurrentWeekInfoForTenant(args.tenant || null);
        const countRes = await query(
          'SELECT count FROM prayer_counts WHERE week_number = $1 AND year = $2',
          [weekInfo.week, weekInfo.year]
        );
        return result({
          week: weekInfo.week,
          year: weekInfo.year,
          count: countRes.rows[0]?.count || 0
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: increment_prayer_count
  server.registerTool(
    'increment_prayer_count',
    {
      description: 'Ilmoita rukoilleesi viikon aiheiden puolesta ("Rukoilin"-painike). Kasvattaa seurakunnan viikoittaista rukouslaskuria yhdellä. Register that you prayed for this week\'s prayer topics, incrementing the counter by 1.',
      inputSchema: {
        tenantId: z.string().optional().describe('Seurakunnan UUID')
      }
    },
    async (args) => {
      try {
        const weekInfo = await getCurrentWeekInfoForTenant(args.tenantId || null);
        const res = await query(
          `INSERT INTO prayer_counts (week_number, year, count, updated_at)
           VALUES ($1, $2, 1, NOW())
           ON CONFLICT (week_number, year)
           DO UPDATE SET count = prayer_counts.count + 1, updated_at = NOW()
           RETURNING count`,
          [weekInfo.week, weekInfo.year]
        );
        return result({
          message: 'Rukouksesi on rekisteröity! Kiitos esirukouksesta.',
          week: weekInfo.week,
          year: weekInfo.year,
          newCount: res.rows[0].count
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: submit_public_prayer
  server.registerTool(
    'submit_public_prayer',
    {
      description: 'Lähetä julkinen seurakuntalaisen rukouspyyntö. Aihe tarkastetaan tekoälyn ja työntekijöiden toimesta ennen esillepanoa. Submit a public prayer request from a parishioner.',
      inputSchema: {
        content: z.string().min(3).max(2000).describe('Rukouspyynnön teksti / Prayer request text'),
        startDate: z.string().optional().describe('Alkamispäivämäärä (YYYY-MM-DD), oletus: nykyinen viikko'),
        endDate: z.string().optional().describe('Päättymispäivämäärä (YYYY-MM-DD), oletus: nykyinen viikko')
      }
    },
    async (args) => {
      try {
        let sDate = args.startDate;
        let eDate = args.endDate;
        if (!sDate || !eDate) {
          const current = await getCurrentWeekInfoForTenant();
          sDate = sDate || formatDate(current.startDate);
          eDate = eDate || formatDate(current.endDate);
        }

        const aiResult = await sanitizePrayerContent(args.content.trim());
        const prayer = await createPrayer({
          userId: user && !user.isAnonymous ? user.id : null,
          type: 'public',
          originalContent: args.content.trim(),
          sanitizedContent: aiResult.sanitizedContent,
          aiFlagged: aiResult.flagged,
          aiFlagReason: aiResult.flagReason,
          startDate: sDate,
          endDate: eDate,
          isApproved: false
        });

        return result({
          message: 'Rukouspyyntö vastaanotettu. Se siirtyy työntekijöiden tarkastukseen ennen julkaisua.',
          prayerId: prayer.id,
          startDate: sDate,
          endDate: eDate
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: list_parishes
  server.registerTool(
    'list_parishes',
    {
      description: 'Listaa sovelluksen seurakunnat ja seurakuntayhtymät (nimet, slugit, hiippakunnat ja verkkotunnukset). List available parishes and parish unions.',
      inputSchema: {}
    },
    async () => {
      try {
        const tenants = await getAllTenants();
        return result({
          parishes: tenants.map(t => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            type: t.type,
            diocese: t.diocese,
            domain: t.domain,
            weekRolloverDay: t.week_rollover_day || 'thursday',
            weekCycleMode: t.week_cycle_mode || 'thursday_cycle'
          }))
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // ─────────────────────────────────────────────────────────────
  // 2. REGISTERED / STAFF TOOLS (Worker, Coordinator, Bishop, Admin)
  // ─────────────────────────────────────────────────────────────

  // Tool: get_pending_prayers
  server.registerTool(
    'get_pending_prayers',
    {
      description: 'Hae työntekijöiden tarkastusta ja hyväksyntää odottavat seurakuntalaisten rukouspyynnöt. Vaatii työntekijän roolin. (Staff only) Get prayer requests awaiting approval.',
      inputSchema: {}
    },
    async () => {
      if (!isStaff) return authError(publicUrl);
      try {
        const res = await query(
          `SELECT pr.*, u.name as author_name, t.name as tenant_name
           FROM prayer_requests pr
           LEFT JOIN users u ON pr.user_id = u.id
           LEFT JOIN tenants t ON pr.tenant_id = t.id
           WHERE pr.type = 'public' AND pr.is_approved = false
           ORDER BY pr.created_at ASC`
        );
        return result({
          pendingCount: res.rows.length,
          prayers: res.rows.map(r => ({
            id: r.id,
            content: r.sanitized_content || r.original_content,
            originalContent: r.original_content,
            aiFlagged: r.ai_flagged,
            aiFlagReason: r.ai_flag_reason,
            startDate: r.start_date,
            endDate: r.end_date,
            createdAt: r.created_at
          }))
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: approve_prayer
  server.registerTool(
    'approve_prayer',
    {
      description: 'Hyväksy tai hylkää seurakuntalaisen rukouspyyntö. (Staff only) Approve or reject a pending prayer request.',
      inputSchema: {
        id: z.string().describe('Rukouspyynnön UUID'),
        isApproved: z.boolean().describe('true = hyväksy julkaistavaksi, false = hylkää')
      }
    },
    async (args) => {
      if (!isStaff) return authError(publicUrl);
      try {
        const updated = await approvePrayer(args.id, args.isApproved);
        if (!updated) return errorResult('Rukouspyyntöä ei löytynyt.');
        return result({
          message: args.isApproved ? 'Rukouspyyntö hyväksytty julkaistavaksi.' : 'Rukouspyyntö hylätty.',
          id: updated.id,
          isApproved: updated.is_approved
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: set_prayer_highlight
  server.registerTool(
    'set_prayer_highlight',
    {
      description: 'Nosta rukousaihe esille (Z-prioriteetti) ja aseta sille aktiivinen nostoaika. Korkeimman Z-arvon aiheet näkyvät kärkinostoina (Top 1–4). Nostoaika oletuksena 1 viikko. Z=0 poistaa noston. (Coordinator+) Set prayer highlight priority and date range.',
      inputSchema: {
        id: z.string().describe('Rukouspyynnön UUID'),
        highlightPriority: z.number().int().min(0).max(999).describe('Z-prioriteettiarvo (esim. 10 tai 20; 0 poistaa noston)'),
        startDate: z.string().optional().describe('Nostoajan alkupäivä (YYYY-MM-DD), oletus: tänään'),
        endDate: z.string().optional().describe('Nostoajan loppupäivä (YYYY-MM-DD), oletus: tänään + 6 pv (1 vko)')
      }
    },
    async (args) => {
      if (!isCoordinator) return authError(publicUrl, 'Vain koordinaattori tai ylläpitäjä voi hallita nostoja.');
      try {
        let sDate = args.startDate;
        let eDate = args.endDate;
        if (args.highlightPriority > 0 && (!sDate || !eDate)) {
          const now = new Date();
          const end = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
          sDate = sDate || formatDate(now);
          eDate = eDate || formatDate(end);
        }

        const updated = await updatePrayerHighlight(args.id, args.highlightPriority, sDate, eDate);
        if (!updated) return errorResult('Rukousta ei löytynyt.');

        return result({
          message: args.highlightPriority > 0
            ? `Rukous nostettu esille prioriteetilla Z=${args.highlightPriority} (${sDate} – ${eDate}).`
            : 'Nosto poistettu rukoukselta.',
          id: updated.id,
          highlightPriority: updated.highlight_priority,
          highlightStartDate: updated.highlight_start_date,
          highlightEndDate: updated.highlight_end_date
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: create_staff_prayer
  server.registerTool(
    'create_staff_prayer',
    {
      description: 'Luo työalan rukousaihe (esim. nuorisotyö, diakonia, lähetystyö). (Staff only) Create ministry prayer request.',
      inputSchema: {
        content: z.string().min(3).describe('Rukousaiheen teksti'),
        ministryGroup: z.enum(['local', 'international']).default('local').describe('Ryhmä 1 (local = Paikallinen seurakuntatyö) tai Ryhmä 2 (international = Kansainvälinen/lähetystyö)'),
        ministryTag: z.string().optional().describe('Työalan tunniste (esim. "Diakonia", "Nuoriso", "Lähetys")'),
        isYhtymaWide: z.boolean().default(false).describe('Onko aihe yhteinen koko seurakuntayhtymälle'),
        startDate: z.string().optional().describe('Alkamispäivämäärä (YYYY-MM-DD)'),
        endDate: z.string().optional().describe('Päättymispäivämäärä (YYYY-MM-DD)')
      }
    },
    async (args) => {
      if (!isStaff) return authError(publicUrl);
      try {
        let sDate = args.startDate;
        let eDate = args.endDate;
        if (!sDate || !eDate) {
          const current = await getCurrentWeekInfoForTenant(user.tenantId);
          sDate = sDate || formatDate(current.startDate);
          eDate = eDate || formatDate(current.endDate);
        }

        const prayer = await createPrayer({
          userId: user.id,
          type: 'staff',
          originalContent: args.content.trim(),
          sanitizedContent: args.content.trim(),
          aiFlagged: false,
          ministryGroup: args.ministryGroup,
          ministryTag: args.ministryTag || null,
          isYhtymaWide: !!args.isYhtymaWide,
          tenantId: user.tenantId,
          startDate: sDate,
          endDate: eDate,
          isApproved: true
        });

        return result({
          message: 'Työalan rukousaihe luotu onnistuneesti.',
          id: prayer.id,
          startDate: sDate,
          endDate: eDate
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: create_pastor_prayer
  server.registerTool(
    'create_pastor_prayer',
    {
      description: 'Aseta seurakunnan kirkkoherran viikoittainen rukousaihe. (Admin only) Create or update pastor prayer topic.',
      inputSchema: {
        content: z.string().min(3).describe('Kirkkoherran aiheen teksti'),
        startDate: z.string().optional().describe('Alkamispäivämäärä (YYYY-MM-DD)'),
        endDate: z.string().optional().describe('Päättymispäivämäärä (YYYY-MM-DD)')
      }
    },
    async (args) => {
      if (!isAdmin) return authError(publicUrl, 'Vain ylläpitäjä voi asettaa kirkkoherran aiheen.');
      try {
        let sDate = args.startDate;
        let eDate = args.endDate;
        if (!sDate || !eDate) {
          const current = await getCurrentWeekInfoForTenant(user.tenantId);
          sDate = sDate || formatDate(current.startDate);
          eDate = eDate || formatDate(current.endDate);
        }

        const prayer = await createPrayer({
          userId: user.id,
          type: 'pastor',
          originalContent: args.content.trim(),
          sanitizedContent: args.content.trim(),
          aiFlagged: false,
          tenantId: user.tenantId,
          startDate: sDate,
          endDate: eDate,
          isApproved: true
        });

        return result({
          message: 'Kirkkoherran aihe tallennettu onnistuneesti.',
          id: prayer.id,
          startDate: sDate,
          endDate: eDate
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: create_bishop_prayer
  server.registerTool(
    'create_bishop_prayer',
    {
      description: 'Aseta hiippakunnan piispan rukousaihe. Huom: piispan aiheen yhteydessä ei näytetä käyttäjän nimeä. (Bishop/Admin only) Create bishop prayer topic.',
      inputSchema: {
        content: z.string().min(3).describe('Piispan aiheen teksti'),
        startDate: z.string().optional().describe('Alkamispäivämäärä (YYYY-MM-DD)'),
        endDate: z.string().optional().describe('Päättymispäivämäärä (YYYY-MM-DD)')
      }
    },
    async (args) => {
      if (!isBishopOrAdmin) return authError(publicUrl, 'Vain piispa tai ylläpitäjä voi lisätä piispan aiheen.');
      try {
        let sDate = args.startDate;
        let eDate = args.endDate;
        if (!sDate || !eDate) {
          const current = await getCurrentWeekInfoForTenant();
          sDate = sDate || formatDate(current.startDate);
          eDate = eDate || formatDate(current.endDate);
        }

        const prayer = await createPrayer({
          userId: user.id,
          type: 'bishop',
          originalContent: args.content.trim(),
          sanitizedContent: args.content.trim(),
          aiFlagged: false,
          startDate: sDate,
          endDate: eDate,
          isApproved: true
        });

        return result({
          message: 'Piispan rukousaihe tallennettu onnistuneesti.',
          id: prayer.id,
          startDate: sDate,
          endDate: eDate
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: get_intercession_list
  server.registerTool(
    'get_intercession_list',
    {
      description: 'Hae sunnuntain jumalanpalveluksen esirukouslista (saarnatuolilista/esilukijan lista). Sisältää piispan ja kirkkoherran aiheet, nostetut aiheet sekä seurakunnan ja seurakuntalaisten aiheet jäsenneltynä. (Staff & Prayer Group only) Get Sunday service intercessions.',
      inputSchema: {
        week: z.number().int().optional().describe('Viikon numero (oletus: kuluva viikko)'),
        year: z.number().int().optional().describe('Vuosi (oletus: kuluva vuosi)'),
        highlightsOnly: z.boolean().default(false).describe('Hae vain nostetut aiheet'),
        tenant: z.string().optional().describe('Seurakunnan slug')
      }
    },
    async (args) => {
      if (!isPrayerListUser) return authError(publicUrl, 'Esirukouslistan katselu vaatii työntekijän, esirukousryhmän tai ylläpitäjän oikeudet.');
      try {
        let week = args.week;
        let year = args.year;
        if (!week || !year) {
          const current = await getCurrentWeekInfoForTenant(args.tenant || null);
          week = week || current.week;
          year = year || current.year;
        }

        const prayers = await getPrayersForWeek(week, year, {
          includeUnapproved: false,
          includeOriginal: false,
          tenantSlug: args.tenant || null
        });

        const filterHighlights = (list) => args.highlightsOnly ? list.filter(p => (p.highlightPriority || 0) > 0) : list;

        return result({
          week,
          year,
          title: `Sunnuntain esirukouslista – Viikko ${week}/${year}`,
          bishopPrayer: prayers.bishop.map(p => p.content),
          pastorPrayer: prayers.pastor.map(p => p.content),
          highlights: prayers.staff.concat(prayers.public).filter(p => (p.highlightPriority || 0) > 0).map(p => ({
            id: p.id,
            content: p.content,
            zValue: p.highlightPriority,
            category: p.type === 'staff' ? 'Työala' : 'Seurakuntalainen'
          })),
          ministryPrayers: filterHighlights(prayers.staff).map(p => ({
            id: p.id,
            content: p.content,
            group: p.ministryGroup,
            tag: p.ministryTag
          })),
          parishionerPrayers: filterHighlights(prayers.public).map(p => ({
            id: p.id,
            content: p.content
          }))
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: get_parish_settings
  server.registerTool(
    'get_parish_settings',
    {
      description: 'Hae seurakunnan ilme-, väripaletti-, viikkosykli- ja logoasetukset. (Admin only) Get parish settings and branding.',
      inputSchema: {}
    },
    async () => {
      if (!isAdmin) return authError(publicUrl, 'Vain ylläpitäjä voi tarkastella seurakunnan asetuksia.');
      try {
        const settings = await getAllSettings();
        return result({ settings });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  // Tool: update_parish_settings
  server.registerTool(
    'update_parish_settings',
    {
      description: 'Päivitä seurakunnan ilme- ja toiminta-asetuksia, kuten viikon vaihtumispäivä (week_rollover_day), viikkosykli (week_cycle_mode), seurakunnan nimi tai väripaletti. (Admin only) Update parish settings.',
      inputSchema: {
        week_rollover_day: z.enum(['thursday', 'wednesday', 'friday', 'monday']).optional().describe('Viikon vaihtumispäivä (oletus: "thursday")'),
        week_cycle_mode: z.enum(['thursday_cycle', 'rollover', 'calendar']).optional().describe('Rukousviikon sykli ("thursday_cycle" = To–Ke, "rollover" = ennakoiva, "calendar" = Ma–Su)'),
        parish_name: z.string().optional().describe('Seurakunnan nimi'),
        color_palette: z.string().optional().describe('Kirkon väripaletti')
      }
    },
    async (args) => {
      if (!isAdmin) return authError(publicUrl, 'Vain ylläpitäjä voi muuttaa seurakunnan asetuksia.');
      try {
        const updated = await updateSettings(args);
        return result({
          message: 'Seurakunnan asetukset päivitetty onnistuneesti.',
          settings: updated
        });
      } catch (err) {
        return errorResult(err.message);
      }
    }
  );

  return server;
}
