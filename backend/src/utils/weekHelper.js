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
 * @returns {{ startDate: Date, endDate: Date }}
 */
export function getWeekDates(week, year) {
  // Find the first Thursday of the year (ISO week 1 contains the first Thursday)
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;

  // Calculate the Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  // Calculate the Monday of the requested week
  const startDate = new Date(week1Monday);
  startDate.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  // Calculate Sunday (end of week)
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);

  return { startDate, endDate };
}

/**
 * Get current week info
 * @returns {{ week: number, year: number, startDate: Date, endDate: Date }}
 */
export function getCurrentWeekInfo() {
  const now = new Date();
  const week = getWeekNumber(now);
  const year = getWeekYear(now);
  const { startDate, endDate } = getWeekDates(week, year);

  return { week, year, startDate, endDate };
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date falls within a week
 * @param {Date} date - The date to check
 * @param {number} week - The week number
 * @param {number} year - The year
 * @returns {boolean}
 */
export function isDateInWeek(date, week, year) {
  const { startDate, endDate } = getWeekDates(week, year);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return d >= startDate && d <= endDate;
}
