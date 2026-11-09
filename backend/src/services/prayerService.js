import { query } from '../db/index.js';
import { getWeekDates, formatDate } from '../utils/weekHelper.js';

/**
 * Get prayers for a specific week
 */
export async function getPrayersForWeek(week, year, options = {}) {
  const { includeUnapproved = false, includeOriginal = false, tenantId = null, tenantSlug = null } = options;
  const { startDate, endDate } = getWeekDates(week, year);

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

  let sql = `
    SELECT
      pr.id,
      pr.type,
      ${includeOriginal ? 'pr.original_content,' : ''}
      COALESCE(pr.sanitized_content, pr.original_content) as content,
      pr.ai_flagged,
      ${includeOriginal ? 'pr.ai_flag_reason,' : ''}
      pr.start_date,
      pr.end_date,
      pr.is_approved,
      pr.highlight_priority,
      pr.ministry_group,
      pr.ministry_tag,
      pr.logo_url,
      pr.is_yhtyma_wide,
      pr.tenant_id,
      pr.created_at,
      pr.updated_at,
      u.name as author_name,
      t.name as tenant_name
    FROM prayer_requests pr
    LEFT JOIN users u ON pr.user_id = u.id
    LEFT JOIN tenants t ON pr.tenant_id = t.id
    WHERE pr.start_date <= $1 AND pr.end_date >= $2
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
  }

  sql += ` ORDER BY pr.type, pr.highlight_priority DESC, pr.created_at DESC`;

  const result = await query(sql, params);

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
      ministryGroup: row.ministry_group || 'local',
      ministryTag: row.ministry_tag || null,
      logoUrl: row.logo_url || null,
      isYhtymaWide: !!row.is_yhtyma_wide,
      tenantId: row.tenant_id || null,
      tenantName: row.tenant_name || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: row.author_name
    };

    if (includeOriginal) {
      prayer.originalContent = row.original_content;
      prayer.aiFlagged = row.ai_flagged;
      prayer.aiFlagReason = row.ai_flag_reason;
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
 * Create a new prayer request
 */
export async function createPrayer({
  userId,
  type,
  originalContent,
  sanitizedContent,
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
  tenantId = null
}) {
  const result = await query(
    `INSERT INTO prayer_requests
     (user_id, type, original_content, sanitized_content, ai_flagged, ai_flag_reason, start_date, end_date, is_approved, highlight_priority, ministry_group, ministry_tag, logo_url, is_yhtyma_wide, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [userId, type, originalContent, sanitizedContent, aiFlagged, aiFlagReason, startDate, endDate, isApproved, highlightPriority, ministryGroup, ministryTag, logoUrl, isYhtymaWide, tenantId]
  );
  return result.rows[0];
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
  ministryGroup,
  ministryTag,
  logoUrl,
  isYhtymaWide,
  tenantId
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
 * Update prayer highlight priority (z-value)
 */
export async function updatePrayerHighlight(id, highlightPriority) {
  return updatePrayer(id, { highlightPriority: parseInt(highlightPriority, 10) || 0 });
}
