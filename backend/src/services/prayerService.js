import { query } from '../db/index.js';
import { getWeekDates, formatDate, getWeekSettingsForTenant } from '../utils/weekHelper.js';

/**
 * Get prayers for a specific week
 */
export async function getPrayersForWeek(week, year, options = {}) {
  const { includeUnapproved = false, includeOriginal = false, tenantId = null, tenantSlug = null } = options;

  let targetTenantId = tenantId;
  let targetTenantParentId = null;

  if (!targetTenantId && tenantSlug) {
    const tRes = await query('SELECT id, parent_id FROM tenants WHERE slug = $1 LIMIT 1', [tenantSlug]);
    if (tRes.rows[0]) {
      targetTenantId = tRes.rows[0].id;
      targetTenantParentId = tRes.rows[0].parent_id;
    }
  } else if (targetTenantId) {
    const tRes = await query('SELECT id, parent_id FROM tenants WHERE id = $1 LIMIT 1', [targetTenantId]);
    if (tRes.rows[0]) {
      targetTenantParentId = tRes.rows[0].parent_id;
    }
  }

  const weekSettings = await getWeekSettingsForTenant(targetTenantId || tenantSlug);
  const { startDate, endDate } = getWeekDates(week, year, {
    cycleMode: weekSettings.week_cycle_mode,
    rolloverDay: weekSettings.week_rollover_day
  });

  let sql = `
    SELECT
      pr.id,
      pr.type,
      ${includeOriginal ? 'pr.original_content, pr.redacted_content, pr.redaction_status, pr.redaction_source, pr.moderation_findings,' : ''}
      CASE
        WHEN pr.type = 'public' THEN pr.redacted_content
        ELSE COALESCE(pr.sanitized_content, pr.original_content)
      END as content,
      pr.ai_flagged,
      ${includeOriginal ? 'pr.ai_flag_reason,' : ''}
      pr.start_date,
      pr.end_date,
      pr.is_approved,
      pr.highlight_priority,
      pr.highlight_start_date,
      pr.highlight_end_date,
      pr.ministry_group,
      pr.ministry_tag,
      pr.logo_url,
      pr.is_yhtyma_wide,
      pr.tenant_id,
      pr.portal_position,
      pr.portal_order,
      pr.created_at,
      pr.updated_at,
      u.name as author_name,
      t.name as tenant_name
    FROM prayer_requests pr
    LEFT JOIN users u ON pr.user_id = u.id
    LEFT JOIN tenants t ON pr.tenant_id = t.id
    WHERE (
      (pr.start_date <= $1 AND pr.end_date >= $2)
      OR (
        pr.highlight_priority > 0
        AND pr.highlight_start_date IS NOT NULL
        AND pr.highlight_start_date <= $1
        AND pr.highlight_end_date >= $2
      )
    )
  `;

  const params = [formatDate(endDate), formatDate(startDate)];
  let paramIdx = 3;

  if (targetTenantId) {
    if (targetTenantParentId) {
      // Parish is part of an yhtymä: include parish's own prayers AND any yhtymä-wide prayers from the union or sister parishes
      sql += ` AND (pr.tenant_id = $${paramIdx} OR (pr.is_yhtyma_wide = true AND (pr.tenant_id = $${paramIdx + 1} OR pr.tenant_id IN (SELECT id FROM tenants WHERE parent_id = $${paramIdx + 1}))))`;
      params.push(targetTenantId, targetTenantParentId);
      paramIdx += 2;
    } else {
      // Standalone parish or direct tenant match
      sql += ` AND (pr.tenant_id = $${paramIdx} OR pr.tenant_id IS NULL)`;
      params.push(targetTenantId);
      paramIdx++;
    }
  }

  if (!includeUnapproved) {
    sql += ` AND (pr.is_approved = true OR pr.type != 'public')`;
    // Public requests are shown only in their redacted form; never without one.
    sql += ` AND (pr.type != 'public' OR pr.redacted_content IS NOT NULL)`;
  }

  sql += ` ORDER BY pr.type, pr.highlight_priority DESC, pr.created_at DESC`;

  let result;
  try {
    result = await query(sql, params);
  } catch (err) {
    if (err.message && err.message.includes('portal_position')) {
      const fallbackSql = sql
        .replace('pr.portal_position,', '')
        .replace('pr.portal_order,', '');
      result = await query(fallbackSql, params);
    } else {
      throw err;
    }
  }

  // Group by type
  const grouped = {
    bishop: [],
    pastor: [],
    staff: [],
    public: []
  };

  for (const row of result.rows) {
    const prayer = {
      id: row.id,
      type: row.type,
      content: row.content,
      startDate: row.start_date,
      endDate: row.end_date,
      isApproved: row.is_approved,
      highlightPriority: row.highlight_priority || 0,
      highlightStartDate: row.highlight_start_date || null,
      highlightEndDate: row.highlight_end_date || null,
      ministryGroup: row.ministry_group || 'local',
      ministryTag: row.ministry_tag || null,
      logoUrl: row.logo_url || null,
      isYhtymaWide: !!row.is_yhtyma_wide,
      tenantId: row.tenant_id || null,
      tenantName: row.tenant_name || null,
      portalPosition: row.portal_position || null,
      portalOrder: row.portal_order || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: row.type === 'staff' ? row.author_name : null
    };

    if (includeOriginal) {
      // Staff-only fields. originalContent of public requests is never shown publicly.
      prayer.originalContent = row.original_content;
      prayer.aiFlagged = row.ai_flagged;
      prayer.aiFlagReason = row.ai_flag_reason;
      prayer.redactedContent = row.type === 'public' ? (row.redacted_content ?? null) : null;
      prayer.redactionStatus = row.type === 'public' ? (row.redaction_status ?? null) : null;
      prayer.redactionSource = row.type === 'public' ? (row.redaction_source ?? null) : null;
      prayer.moderationFindings = row.type === 'public' ? (row.moderation_findings ?? null) : null;
    }

    if (grouped[row.type]) {
      grouped[row.type].push(prayer);
    }
  }

  return grouped;
}

/**
 * Get a single prayer by ID
 */
export async function getPrayerById(id) {
  const result = await query(
    `SELECT pr.*, u.name as author_name, t.name as tenant_name
     FROM prayer_requests pr
     LEFT JOIN users u ON pr.user_id = u.id
     LEFT JOIN tenants t ON pr.tenant_id = t.id
     WHERE pr.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Text that may be shown for a prayer row. Public requests expose only redacted_content.
 * Other types keep the existing sanitised-or-original behaviour.
 * @param {{ type: string, redacted_content?: string|null, sanitized_content?: string|null, original_content?: string|null }} row
 * @returns {string|null}
 */
export function displayContent(row) {
  if (!row) return null;
  if (row.type === 'public') return row.redacted_content ?? null;
  return row.sanitized_content || row.original_content || null;
}

/**
 * Create a new prayer request.
 * Public requests pass redactedContent / redactionStatus / redactionSource / moderationFindings
 * and leave sanitizedContent empty. Other types are unchanged.
 */
export async function createPrayer({
  userId,
  type,
  originalContent,
  sanitizedContent = null,
  aiFlagged,
  aiFlagReason,
  startDate,
  endDate,
  isApproved = false,
  highlightPriority = 0,
  ministryGroup = 'local',
  ministryTag = null,
  logoUrl = null,
  isYhtymaWide = false,
  tenantId = null,
  portalPosition = null,
  portalOrder = 0,
  redactedContent = null,
  redactionStatus = null,
  redactionSource = null,
  moderationFindings = null
}) {
  const normalizedPortalPos = ['above', 'below'].includes(portalPosition) ? portalPosition : null;
  const normalizedPortalOrder = parseInt(portalOrder, 10) || 0;
  const findingsJson = moderationFindings ? JSON.stringify(moderationFindings) : null;

  try {
    const result = await query(
      `INSERT INTO prayer_requests
       (user_id, type, original_content, sanitized_content, ai_flagged, ai_flag_reason, start_date, end_date, is_approved, highlight_priority, ministry_group, ministry_tag, logo_url, is_yhtyma_wide, tenant_id, portal_position, portal_order, redacted_content, redaction_status, redaction_source, moderation_findings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [userId, type, originalContent, sanitizedContent, aiFlagged, aiFlagReason, startDate, endDate, isApproved, highlightPriority, ministryGroup, ministryTag, logoUrl, isYhtymaWide, tenantId, normalizedPortalPos, normalizedPortalOrder, redactedContent, redactionStatus, redactionSource, findingsJson]
    );
    return result.rows[0];
  } catch (err) {
    // Fallback if migration 022 hasn't been executed yet (portal columns only).
    // Moderation columns (024) are not dropped here: a missing 024 fails closed.
    if (err.message && err.message.includes('portal_position')) {
      const result = await query(
        `INSERT INTO prayer_requests
         (user_id, type, original_content, sanitized_content, ai_flagged, ai_flag_reason, start_date, end_date, is_approved, highlight_priority, ministry_group, ministry_tag, logo_url, is_yhtyma_wide, tenant_id, redacted_content, redaction_status, redaction_source, moderation_findings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING *`,
        [userId, type, originalContent, sanitizedContent, aiFlagged, aiFlagReason, startDate, endDate, isApproved, highlightPriority, ministryGroup, ministryTag, logoUrl, isYhtymaWide, tenantId, redactedContent, redactionStatus, redactionSource, findingsJson]
      );
      return result.rows[0];
    }
    throw err;
  }
}

/**
 * Update a prayer request
 */
export async function updatePrayer(id, {
  originalContent,
  sanitizedContent,
  aiFlagged,
  aiFlagReason,
  startDate,
  endDate,
  isApproved,
  highlightPriority,
  highlightStartDate,
  highlightEndDate,
  ministryGroup,
  ministryTag,
  logoUrl,
  isYhtymaWide,
  tenantId,
  portalPosition,
  portalOrder,
  redactedContent,
  redactionStatus,
  redactionSource
}) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (originalContent !== undefined) {
    updates.push(`original_content = $${paramIndex++}`);
    values.push(originalContent);
  }
  if (sanitizedContent !== undefined) {
    updates.push(`sanitized_content = $${paramIndex++}`);
    values.push(sanitizedContent);
  }
  if (aiFlagged !== undefined) {
    updates.push(`ai_flagged = $${paramIndex++}`);
    values.push(aiFlagged);
  }
  if (aiFlagReason !== undefined) {
    updates.push(`ai_flag_reason = $${paramIndex++}`);
    values.push(aiFlagReason);
  }
  if (startDate !== undefined) {
    updates.push(`start_date = $${paramIndex++}`);
    values.push(startDate);
  }
  if (endDate !== undefined) {
    updates.push(`end_date = $${paramIndex++}`);
    values.push(endDate);
  }
  if (isApproved !== undefined) {
    updates.push(`is_approved = $${paramIndex++}`);
    values.push(isApproved);
  }
  if (highlightPriority !== undefined) {
    updates.push(`highlight_priority = $${paramIndex++}`);
    values.push(highlightPriority);
  }
  if (highlightStartDate !== undefined) {
    updates.push(`highlight_start_date = $${paramIndex++}`);
    values.push(highlightStartDate);
  }
  if (highlightEndDate !== undefined) {
    updates.push(`highlight_end_date = $${paramIndex++}`);
    values.push(highlightEndDate);
  }
  if (ministryGroup !== undefined) {
    updates.push(`ministry_group = $${paramIndex++}`);
    values.push(ministryGroup);
  }
  if (ministryTag !== undefined) {
    updates.push(`ministry_tag = $${paramIndex++}`);
    values.push(ministryTag);
  }
  if (logoUrl !== undefined) {
    updates.push(`logo_url = $${paramIndex++}`);
    values.push(logoUrl);
  }
  if (isYhtymaWide !== undefined) {
    updates.push(`is_yhtyma_wide = $${paramIndex++}`);
    values.push(isYhtymaWide);
  }
  if (tenantId !== undefined) {
    updates.push(`tenant_id = $${paramIndex++}`);
    values.push(tenantId);
  }
  if (portalPosition !== undefined) {
    const normalizedPos = ['above', 'below'].includes(portalPosition) ? portalPosition : null;
    updates.push(`portal_position = $${paramIndex++}`);
    values.push(normalizedPos);
  }
  if (portalOrder !== undefined) {
    updates.push(`portal_order = $${paramIndex++}`);
    values.push(parseInt(portalOrder, 10) || 0);
  }
  if (redactedContent !== undefined) {
    updates.push(`redacted_content = $${paramIndex++}`);
    values.push(redactedContent);
  }
  if (redactionStatus !== undefined) {
    updates.push(`redaction_status = $${paramIndex++}`);
    values.push(redactionStatus);
  }
  if (redactionSource !== undefined) {
    updates.push(`redaction_source = $${paramIndex++}`);
    values.push(redactionSource);
  }

  if (updates.length === 0) {
    return getPrayerById(id);
  }

  values.push(id);

  const result = await query(
    `UPDATE prayer_requests
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete a prayer request
 */
export async function deletePrayer(id) {
  const result = await query(
    'DELETE FROM prayer_requests WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Approve or reject a prayer request
 */
export async function approvePrayer(id, approved) {
  return updatePrayer(id, { isApproved: approved });
}

/**
 * Update prayer highlight priority (z-value) and active date range
 */
export async function updatePrayerHighlight(id, highlightPriority, highlightStartDate = null, highlightEndDate = null) {
  const priority = parseInt(highlightPriority, 10) || 0;
  const updates = {
    highlightPriority: priority,
    highlightStartDate: priority > 0 ? (highlightStartDate || null) : null,
    highlightEndDate: priority > 0 ? (highlightEndDate || null) : null,
  };
  return updatePrayer(id, updates);
}

/**
 * Update prayer portal position ('above' | 'below' | null) and order on the root portal page
 */
export async function updatePrayerPortalPlacement(id, portalPosition = null, portalOrder = 0) {
  const normalizedPos = ['above', 'below'].includes(portalPosition) ? portalPosition : null;
  const normalizedOrder = parseInt(portalOrder, 10) || 0;
  return updatePrayer(id, {
    portalPosition: normalizedPos,
    portalOrder: normalizedOrder
  });
}
