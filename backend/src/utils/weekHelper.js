import { query } from '../db/index.js';

export const DAY_MAP = {
  sunday: 0,
  sun: 0,
  su: 0,
  monday: 1,
  mon: 1,
  ma: 1,
  tuesday: 2,
  tue: 2,
  ti: 2,
  wednesday: 3,
  wed: 3,
  ke: 3,
  thursday: 4,
  thu: 4,
  to: 4,
  friday: 5,
  fri: 5,
  pe: 5,
  saturday: 6,
  sat: 6,
  la: 6
};

/**
 * Get ISO week number for a given date
 * @param {Date} date - The date to get week number for
 * @returns {number} The ISO week number (1-53)
 */
export function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get the year for a given ISO week
 * @param {Date} date - The date to get year for
 * @returns {number} The year
 */
export function getWeekYear(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Get start and end dates for a given week
 * @param {number} week - The week number
 * @param {number} year - The year
 * @param {object} [options] - Options { cycleMode, rolloverDay }
 * @returns {{ startDate: Date, endDate: Date }}
 */
export function getWeekDates(week, year, options = {}) {
  const cycleMode = options.cycleMode || options.week_cycle_mode || 'thursday_cycle';
  const rolloverDay = (options.rolloverDay || options.week_rollover_day || 'thursday').toLowerCase();

  // Find the first Thursday of the year (ISO week 1 contains the first Thursday)
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;

  // Calculate the Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  // Calculate the Monday of the requested week
  const isoMonday = new Date(week1Monday);
  isoMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  // Calculate Sunday of the requested week
  const isoSunday = new Date(isoMonday);
  isoSunday.setUTCDate(isoMonday.getUTCDate() + 6);

  if (cycleMode === 'thursday_cycle' || rolloverDay === 'thursday') {
    // Thursday-to-Wednesday cycle where the anchor Sunday of this week is in the middle:
    // Cycle starts on Thursday (3 days before Sunday) and ends on Wednesday (3 days after Sunday)
    const startDate = new Date(isoSunday);
    startDate.setUTCDate(isoSunday.getUTCDate() - 3);

    const endDate = new Date(isoSunday);
    endDate.setUTCDate(isoSunday.getUTCDate() + 3);

    return { startDate, endDate };
  }

  // Standard calendar week (Monday to Sunday)
  return { startDate: isoMonday, endDate: isoSunday };
}

/**
 * Get current week info for a given date and options
 * @param {Date|object} [dateOrOptions] - Optional date or options object
 * @param {object} [options] - Optional settings { cycleMode, rolloverDay }
 * @returns {{ week: number, year: number, startDate: Date, endDate: Date }}
 */
export function getCurrentWeekInfo(dateOrOptions = new Date(), options = {}) {
  let now = dateOrOptions instanceof Date ? dateOrOptions : new Date();
  let opts = options;

  if (dateOrOptions && !(dateOrOptions instanceof Date) && typeof dateOrOptions === 'object') {
    opts = dateOrOptions;
    now = opts.date ? new Date(opts.date) : new Date();
  }

  const cycleMode = opts.cycleMode || opts.week_cycle_mode || 'thursday_cycle';
  const rolloverDay = (opts.rolloverDay || opts.week_rollover_day || 'thursday').toLowerCase();
  const startDayNum = DAY_MAP[rolloverDay] ?? 4; // Default to Thursday (4)

  if (cycleMode === 'thursday_cycle' || rolloverDay === 'thursday') {
    // 7-day cycle starting on startDayNum (e.g. Thursday = 4):
    const currentDay = now.getUTCDay();
    const diffToStart = (currentDay + 7 - startDayNum) % 7;

    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - diffToStart,
      0, 0, 0, 0
    ));

    const endDate = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate() + 6,
      23, 59, 59, 999
    ));

    // Anchor Sunday for week numbering is in the cycle
    const anchorSunday = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate() + ((7 - startDayNum) % 7)
    ));

    const week = getWeekNumber(anchorSunday);
    const year = getWeekYear(anchorSunday);

    return { week, year, startDate, endDate };
  }

  if (cycleMode === 'rollover') {
    // Standard ISO week dates, but shifts forward on or after rolloverDay
    const currentDay = now.getUTCDay();
    const shouldRollOver = (startDayNum === 4 && (currentDay >= 4 || currentDay === 0));

    let effectiveDate = new Date(now);
    if (shouldRollOver) {
      effectiveDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 7
      ));
    }

    const week = getWeekNumber(effectiveDate);
    const year = getWeekYear(effectiveDate);
    const { startDate, endDate } = getWeekDates(week, year, { cycleMode: 'calendar' });

    return { week, year, startDate, endDate };
  }

  // Fallback: standard Monday-Sunday ISO week
  const week = getWeekNumber(now);
  const year = getWeekYear(now);
  const { startDate, endDate } = getWeekDates(week, year, { cycleMode: 'calendar' });

  return { week, year, startDate, endDate };
}

/**
 * Fetch week settings for a tenant or from site_settings fallback
 * @param {string} [tenantIdentifier] - Tenant ID or slug
 * @returns {Promise<{ week_rollover_day: string, week_cycle_mode: string }>}
 */
export async function getWeekSettingsForTenant(tenantIdentifier = null) {
  try {
    if (tenantIdentifier) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdentifier);
      const sql = isUuid
        ? 'SELECT week_rollover_day, week_cycle_mode FROM tenants WHERE id = $1 LIMIT 1'
        : 'SELECT week_rollover_day, week_cycle_mode FROM tenants WHERE slug = $1 LIMIT 1';
      const res = await query(sql, [tenantIdentifier]);
      if (res.rows.length > 0 && res.rows[0].week_rollover_day) {
        return {
          week_rollover_day: res.rows[0].week_rollover_day || 'thursday',
          week_cycle_mode: res.rows[0].week_cycle_mode || 'thursday_cycle'
        };
      }
    }

    // Fallback to site_settings
    const res = await query(
      "SELECT key, value FROM site_settings WHERE key IN ('week_rollover_day', 'week_cycle_mode')"
    );
    const settings = {
      week_rollover_day: 'thursday',
      week_cycle_mode: 'thursday_cycle'
    };
    for (const row of res.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  } catch (err) {
    return {
      week_rollover_day: 'thursday',
      week_cycle_mode: 'thursday_cycle'
    };
  }
}

/**
 * Get current week info resolving tenant configuration
 * @param {string} [tenantIdentifier] - Tenant ID or slug
 * @param {Date} [now] - Current date
 * @returns {Promise<{ week: number, year: number, startDate: Date, endDate: Date, settings: object }>}
 */
export async function getCurrentWeekInfoForTenant(tenantIdentifier = null, now = new Date()) {
  const settings = await getWeekSettingsForTenant(tenantIdentifier);
  const weekInfo = getCurrentWeekInfo(now, {
    cycleMode: settings.week_cycle_mode,
    rolloverDay: settings.week_rollover_day
  });

  return { ...weekInfo, settings };
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date.split('T')[0];
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date falls within a week
 * @param {Date} date - The date to check
 * @param {number} week - The week number
 * @param {number} year - The year
 * @param {object} [options] - Options for week calculation
 * @returns {boolean}
 */
export function isDateInWeek(date, week, year, options = {}) {
  const { startDate, endDate } = getWeekDates(week, year, options);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return d >= startDate && d <= endDate;
}
