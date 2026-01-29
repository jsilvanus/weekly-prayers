import { query } from '../db/index.js';
import { getWeekDates, formatDate } from '../utils/weekHelper.js';

/**
 * Get prayers for a specific week
 */
export async function getPrayersForWeek(week, year, options = {}) {
  const { includeUnapproved = false, includeOriginal = false } = options;
  const { startDate, endDate } = getWeekDates(week, year);

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
      pr.created_at,
      pr.updated_at,
      u.name as author_name
    FROM prayer_requests pr
    LEFT JOIN users u ON pr.user_id = u.id
    WHERE pr.start_date <= $1 AND pr.end_date >= $2
  `;

  const params = [formatDate(endDate), formatDate(startDate)];

  if (!includeUnapproved) {
    sql += ` AND (pr.is_approved = true OR pr.type != 'public')`;
  }

  sql += ` ORDER BY pr.type, pr.created_at DESC`;

  const result = await query(sql, params);

  // Group by type
  const grouped = {
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: row.author_name
    };

    if (includeOriginal) {
      prayer.originalContent = row.original_content;
      prayer.aiFlagged = row.ai_flagged;
      prayer.aiFlagReason = row.ai_flag_reason;
    }

    grouped[row.type].push(prayer);
  }

  return grouped;
}

/**
 * Get a single prayer by ID
 */
export async function getPrayerById(id) {
  const result = await query(
    `SELECT pr.*, u.name as author_name
     FROM prayer_requests pr
     LEFT JOIN users u ON pr.user_id = u.id
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
  isApproved = false
}) {
  const result = await query(
    `INSERT INTO prayer_requests
     (user_id, type, original_content, sanitized_content, ai_flagged, ai_flag_reason, start_date, end_date, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [userId, type, originalContent, sanitizedContent, aiFlagged, aiFlagReason, startDate, endDate, isApproved]
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
  isApproved
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
