import { query } from '../db/index.js';
import { getTenantBySlugOrId, getTenantHierarchy } from './tenantService.js';
import { fetchDayFromAnno } from './annoService.js';

/**
 * Format Date to YYYY-MM-DD
 */
export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolve tenant ID from slug, identifier, or fallback to default
 */
async function resolveTenantId(tenantSlugOrId) {
  if (tenantSlugOrId) {
    const t = await getTenantBySlugOrId(tenantSlugOrId);
    if (t) return t.id;
  }
  const hierarchy = await getTenantHierarchy(null);
  return hierarchy?.tenant?.id || null;
}

/**
 * Get devotion for a specific calendar date (defaults to today)
 * Always returns exactly one devotion (custom or serene liturgical fallback)
 */
export async function getDevotionForDate(tenantSlugOrId, dateStr = null, options = {}) {
  const targetDate = dateStr || getTodayDateString();
  const tenantId = await resolveTenantId(tenantSlugOrId);

  if (tenantId) {
    const sql = `
      SELECT d.*, 
             u_creator.name as created_by_name,
             u_creator.email as created_by_email,
             u_author.name as author_user_name,
             u_author.email as author_user_email
      FROM devotions d
      LEFT JOIN users u_creator ON d.created_by_user_id = u_creator.id
      LEFT JOIN users u_author ON d.author_user_id = u_author.id
      WHERE d.tenant_id = $1 
        AND d.target_date = $2
        AND d.is_published = TRUE
      LIMIT 1
    `;
    const res = await query(sql, [tenantId, targetDate]);

    if (res.rows[0]) {
      const row = res.rows[0];
      const isStaffOrAdmin = options.includeAudit === true;

      return {
        id: row.id,
        tenant_id: row.tenant_id,
        target_date: row.target_date,
        title: row.title,
        format: row.format,
        content: row.content,
        liturgical_day: row.liturgical_day,
        scripture_reference: row.scripture_reference,
        scripture_text: row.scripture_text,
        meditation_content: row.meditation_content,
        closing_prayer: row.closing_prayer,
        hymn_suggestion: row.hymn_suggestion,
        audio_url: row.audio_url,
        youtube_url: row.youtube_url,
        pieces_order: row.pieces_order ? (typeof row.pieces_order === 'string' ? JSON.parse(row.pieces_order) : row.pieces_order) : ['scripture', 'meditation', 'prayer', 'hymn'],
        is_published: row.is_published,
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
          type: row.author_type,
          name: row.author_name,
          title: row.author_title,
          imageUrl: row.author_image_url
        },
        // Audit information strictly for authenticated staff / admin
        audit: isStaffOrAdmin ? {
          created_by_user_id: row.created_by_user_id,
          created_by_name: row.created_by_name,
          author_user_id: row.author_user_id,
          author_user_name: row.author_user_name
        } : undefined,
        isCustom: true,
        isFallback: false
      };
    }
  }

  // Graceful liturgical fallback when no custom devotion is entered for this date
  const dayData = await fetchDayFromAnno(targetDate);
  const holyDay = dayData.holyDay || {};
  const dailyVerse = dayData.dailyVerse || {};

  return {
    id: `fallback-${targetDate}`,
    tenant_id: tenantId,
    target_date: targetDate,
    title: holyDay.name ? `Päivän hartaus: ${holyDay.name}` : 'Päivän hartaus',
    format: 'structured',
    liturgical_day: holyDay.name || 'Kirkkovuosi',
    scripture_reference: dailyVerse.reference || 'Ps. 103:1–4',
    scripture_text: dailyVerse.text || 'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.',
    meditation_content: dailyVerse.meditation || 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan. Hän parantaa haavamme ja antaa meille uuden voiman.',
    closing_prayer: 'Kaikkivaltias, iankaikkinen Jumala, sinä olet johdattanut meidät tähän päivään. Anna sanasi olla lamppuna jaloillemme ja valona teillämme. Siunaa meidän työmme, lepomme ja lähimmäisemme. Tätä pyydämme Herramme Jeesuksen Kristuksen kautta. Aamen.',
    hymn_suggestion: 'Virsi 341 (Kiitos sulle, Jumalani) tai kirkkovuoden päivän virsi',
    audio_url: null,
    youtube_url: null,
    pieces_order: ['scripture', 'meditation', 'prayer', 'hymn'],
    is_published: true,
    author: {
      type: 'custom_text',
      name: 'Kirkkovuosi & Päivän sana',
      title: 'Evankeliumikirja'
    },
    isCustom: false,
    isFallback: true
  };
}

/**
 * List devotions for management / calendar scheduling
 */
export async function listDevotions(tenantSlugOrId, options = {}) {
  const tenantId = await resolveTenantId(tenantSlugOrId);
  if (!tenantId) return [];

  const { startDate, endDate, limit = 60, offset = 0 } = options;

  let sql = `
    SELECT d.*, 
           u_creator.name as created_by_name,
           u_creator.email as created_by_email,
           u_author.name as author_user_name,
           u_author.email as author_user_email
    FROM devotions d
    LEFT JOIN users u_creator ON d.created_by_user_id = u_creator.id
    LEFT JOIN users u_author ON d.author_user_id = u_author.id
    WHERE d.tenant_id = $1
  `;
  const values = [tenantId];
  let idx = 2;

  if (startDate) {
    sql += ` AND d.target_date >= $${idx++}`;
    values.push(startDate);
  }
  if (endDate) {
    sql += ` AND d.target_date <= $${idx++}`;
    values.push(endDate);
  }

  sql += ` ORDER BY d.target_date DESC LIMIT $${idx++} OFFSET $${idx++}`;
  values.push(limit, offset);

  const res = await query(sql, values);
  return res.rows.map(row => ({
    ...row,
    audit: {
      created_by_name: row.created_by_name,
      created_by_email: row.created_by_email,
      author_user_name: row.author_user_name,
      author_user_email: row.author_user_email
    }
  }));
}

/**
 * Save / Upsert a devotion
 */
export async function saveDevotion(data, user) {
  if (!user || !user.id) {
    throw new Error('Authentication required');
  }

  const {
    id,
    tenant_id,
    tenant_slug,
    target_date,
    title,
    format = 'single_block',
    content,
    liturgical_day,
    scripture_reference,
    scripture_text,
    meditation_content,
    closing_prayer,
    hymn_suggestion,
    audio_url,
    youtube_url = null,
    pieces_order = null,
    status = null,
    is_published,
    author_type = 'self',
    author_user_id = null,
    author_custom_text = null,
    author_title = null,
    author_image_url = null
  } = data;

  if (!target_date) {
    throw new Error('Target date (YYYY-MM-DD) is required');
  }
  if (!title || !title.trim()) {
    throw new Error('Title is required');
  }

  const resolvedTenantId = tenant_id || await resolveTenantId(tenant_slug);
  if (!resolvedTenantId) {
    throw new Error('Valid tenant required');
  }

  // Author resolution logic
  let resolvedAuthorName = user.name;
  let resolvedAuthorTitle = author_title || 'Pastori';
  let resolvedAuthorUserId = null;
  let resolvedCustomText = null;

  if (author_type === 'other_user') {
    if (!author_user_id) {
      throw new Error('Designated author user ID is required when attributing to another user');
    }
    const uRes = await query('SELECT id, name, role FROM users WHERE id = $1', [author_user_id]);
    if (!uRes.rows[0]) {
      throw new Error('Designated author user account not found');
    }
    resolvedAuthorUserId = uRes.rows[0].id;
    resolvedAuthorName = uRes.rows[0].name;
    resolvedAuthorTitle = author_title || (uRes.rows[0].role === 'priest' ? 'Pastori' : 'Seurakunnan työntekijä');
  } else if (author_type === 'custom_text') {
    resolvedCustomText = (author_custom_text || 'Iäkäs seurakuntalainen').trim();
    resolvedAuthorName = resolvedCustomText;
    resolvedAuthorTitle = author_title ? author_title.trim() : null;
    resolvedAuthorUserId = null;
  } else {
    // Default: 'self'
    resolvedAuthorUserId = user.id;
    resolvedAuthorName = user.name;
    resolvedAuthorTitle = author_title ? author_title.trim() : (user.role === 'priest' ? 'Pastori' : 'Seurakunnan työntekijä');
  }

  const resolvedPiecesOrder = pieces_order
    ? (typeof pieces_order === 'string' ? pieces_order : JSON.stringify(pieces_order))
    : JSON.stringify(['scripture', 'meditation', 'prayer', 'hymn']);

  const sql = `
    INSERT INTO devotions (
      id, tenant_id, created_by_user_id, author_type, author_user_id,
      author_name, author_title, author_custom_text, author_image_url,
      title, format, content, liturgical_day, scripture_reference,
      scripture_text, meditation_content, closing_prayer, hymn_suggestion,
      audio_url, youtube_url, pieces_order, target_date, is_published, created_at, updated_at
    ) VALUES (
      COALESCE($1, gen_random_uuid()), $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13, $14,
      $15, $16, $17, $18,
      $19, $20, $21, $22, $23, NOW(), NOW()
    )
    ON CONFLICT (tenant_id, target_date) DO UPDATE SET
      author_type = EXCLUDED.author_type,
      author_user_id = EXCLUDED.author_user_id,
      author_name = EXCLUDED.author_name,
      author_title = EXCLUDED.author_title,
      author_custom_text = EXCLUDED.author_custom_text,
      author_image_url = EXCLUDED.author_image_url,
      title = EXCLUDED.title,
      format = EXCLUDED.format,
      content = EXCLUDED.content,
      liturgical_day = EXCLUDED.liturgical_day,
      scripture_reference = EXCLUDED.scripture_reference,
      scripture_text = EXCLUDED.scripture_text,
      meditation_content = EXCLUDED.meditation_content,
      closing_prayer = EXCLUDED.closing_prayer,
      hymn_suggestion = EXCLUDED.hymn_suggestion,
      audio_url = EXCLUDED.audio_url,
      youtube_url = EXCLUDED.youtube_url,
      pieces_order = EXCLUDED.pieces_order,
      is_published = EXCLUDED.is_published,
      updated_at = NOW()
    RETURNING *
  `;

  const values = [
    id || null,
    resolvedTenantId,
    user.id,
    author_type,
    resolvedAuthorUserId,
    resolvedAuthorName,
    resolvedAuthorTitle,
    resolvedCustomText,
    author_image_url || null,
    title.trim(),
    format,
    content || null,
    liturgical_day ? liturgical_day.trim() : null,
    scripture_reference ? scripture_reference.trim() : null,
    scripture_text || null,
    meditation_content || null,
    closing_prayer || null,
    hymn_suggestion ? hymn_suggestion.trim() : null,
    audio_url ? audio_url.trim() : null,
    youtube_url ? youtube_url.trim() : null,
    resolvedPiecesOrder,
    target_date,
    status !== null && status !== undefined ? status === 'published' : (is_published !== false)
  ];

  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Delete a devotion
 */
export async function deleteDevotion(id, user) {
  if (!user || !user.id) {
    throw new Error('Authentication required');
  }

  const existingRes = await query('SELECT * FROM devotions WHERE id = $1', [id]);
  const devotion = existingRes.rows[0];
  if (!devotion) return null;

  // Permissions: Admin can delete any; authors can delete their own
  const isAdmin = user.role === 'admin';
  const isCreator = devotion.created_by_user_id === user.id || devotion.author_user_id === user.id;

  if (!isAdmin && !isCreator) {
    throw new Error('Not authorized to delete this devotion');
  }

  const result = await query('DELETE FROM devotions WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}
