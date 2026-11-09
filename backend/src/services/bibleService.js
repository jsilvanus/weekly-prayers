import pool from '../db/index.js';
import { fetchDayFromAnno, fetchLectionaryFromAnno, getNearestHourName } from './annoService.js';
import { getSetting } from './settingsService.js';

/**
 * Format a date object into YYYY-MM-DD
 */
function toDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date string falls within a date range (inclusive)
 */
function isDateInRange(dateStr, startDate, endDate) {
  if (!startDate || !endDate) return false;
  return dateStr >= startDate && dateStr <= endDate;
}

/**
 * Check if a date matches a schedule definition:
 * schedule: { dates: ["YYYY-MM-DD", ...], ranges: [{ startDate, endDate }, ...] }
 */
export function matchesSchedule(schedule, dateStr) {
  if (!schedule) return false;

  const dates = Array.isArray(schedule.dates) ? schedule.dates : [];
  if (dates.includes(dateStr)) {
    return true;
  }

  const ranges = Array.isArray(schedule.ranges) ? schedule.ranges : [];
  for (const range of ranges) {
    if (isDateInRange(dateStr, range.startDate, range.endDate)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all scheduled manual overrides
 */
export async function getAllOverrides() {
  const result = await pool.query(
    'SELECT * FROM bible_overrides ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Create a new manual Bible override
 */
export async function createOverride({ title, verse_reference, verse_text, meditation, commentary, schedule, is_active = true }) {
  const validSchedule = typeof schedule === 'object' && schedule !== null 
    ? schedule 
    : { dates: [], ranges: [] };

  const result = await pool.query(
    `INSERT INTO bible_overrides 
      (title, verse_reference, verse_text, meditation, commentary, schedule, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [title || '', verse_reference, verse_text, meditation || '', commentary || '', JSON.stringify(validSchedule), is_active]
  );
  return result.rows[0];
}

/**
 * Update a manual Bible override
 */
export async function updateOverride(id, { title, verse_reference, verse_text, meditation, commentary, schedule, is_active }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
  if (verse_reference !== undefined) { fields.push(`verse_reference = $${idx++}`); values.push(verse_reference); }
  if (verse_text !== undefined) { fields.push(`verse_text = $${idx++}`); values.push(verse_text); }
  if (meditation !== undefined) { fields.push(`meditation = $${idx++}`); values.push(meditation); }
  if (commentary !== undefined) { fields.push(`commentary = $${idx++}`); values.push(commentary); }
  if (schedule !== undefined) { fields.push(`schedule = $${idx++}`); values.push(JSON.stringify(schedule)); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE bible_overrides SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Delete a manual override
 */
export async function deleteOverride(id) {
  const result = await pool.query(
    'DELETE FROM bible_overrides WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Get unified Bible data for a specific date:
 * Includes Daily Verse (manual override or anno-api fetched) and Liturgy of the Hours.
 */
export async function getBibleForDate(targetDate) {
  const dateStr = targetDate || toDateString();
  const todayStr = toDateString();
  const isToday = dateStr === todayStr;

  // 1. Check for an active manual override matching dateStr
  const overridesResult = await pool.query(
    'SELECT * FROM bible_overrides WHERE is_active = TRUE ORDER BY updated_at DESC'
  );

  let manualMatch = null;
  for (const row of overridesResult.rows) {
    const sched = typeof row.schedule === 'string' ? JSON.parse(row.schedule) : row.schedule;
    if (matchesSchedule(sched, dateStr)) {
      manualMatch = row;
      break;
    }
  }

  // 2. Fetch liturgical day and lectionary from Anno API (or fallback)
  const { data: dayData, source: daySource } = await fetchDayFromAnno(dateStr);
  const { lectionary: hoursData, source: lectionarySource } = await fetchLectionaryFromAnno(dateStr);

  // 3. Resolve Daily Verse
  let dailyVerse = null;
  if (manualMatch) {
    dailyVerse = {
      isManual: true,
      id: manualMatch.id,
      title: manualMatch.title || 'Päivän sana',
      reference: manualMatch.verse_reference,
      text: manualMatch.verse_text,
      meditation: manualMatch.meditation,
      commentary: manualMatch.commentary,
      source: 'manual'
    };
  } else {
    // Extract from Anno API / liturgical day
    const holyDay = dayData.holyDay || dayData.weekdayMaterial || dayData;
    const texts = holyDay.texts || {};
    const gospel = texts.gospel;
    const firstReading = texts.firstReading;
    const psalm = holyDay.psalm;

    const reference = gospel?.reference || firstReading?.reference || psalm?.reference || 'Ps. 103:1–4';
    const text = gospel?.text || firstReading?.text || psalm?.text || 
      'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.';
    const meditation = holyDay.theme 
      ? `Päivän aihe: ${holyDay.theme}. ${holyDay.description || ''}`
      : 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan.';

    dailyVerse = {
      isManual: false,
      title: holyDay.name || 'Päivän sana',
      reference,
      text,
      meditation,
      source: daySource
    };
  }

  // 4. Liturgy of the Hours & nearest hour
  const nearestHourKey = getNearestHourName();
  const nearestHour = hoursData[nearestHourKey] || hoursData.morning;

  const liturgicalInfo = {
    date: dateStr,
    dayName: dayData.holyDay?.name || dayData.weekdayMaterial?.name || 'Kirkkovuosi',
    theme: dayData.holyDay?.theme || dayData.weekdayMaterial?.theme || '',
    season: dayData.season || dayData.period || '',
    color: dayData.liturgicalColor || { color: 'vihreä', english: 'green' }
  };

  return {
    date: dateStr,
    isToday,
    dailyVerse,
    liturgyOfTheHours: hoursData,
    nearestHourKey,
    nearestHour,
    liturgicalInfo,
    annoApiSource: daySource
  };
}
