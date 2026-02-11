/**
 * Port of build/extract_timeoff.py — converts parsed records
 * into a calendar structure grouped by date.
 */

const DATE_RE = /(\d{1,2}\/\d{1,2}\/\d{2})/g;
const THROUGH_RE = /\bThrough\b/i;
const MIDNIGHT_END_RE = /ends\s+12:00\s*AM/i;

/**
 * Parse M/D/YY string into a Date object.
 */
function parseMDYY(s) {
  const [m, d, y] = s.split("/").map(Number);
  const fullYear = y < 50 ? 2000 + y : 1900 + y;
  return new Date(fullYear, m - 1, d);
}

/**
 * Format a Date object to YYYY-MM-DD.
 */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Generate dates from start (inclusive) to end (exclusive).
 */
function* dateRange(start, end) {
  const cur = new Date(start);
  while (cur < end) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

/**
 * Normalize status string → "approved", "pending", or null.
 */
function normalizeStatus(raw) {
  const s = raw.toLowerCase();
  if (s.includes("approved")) return "approved";
  if (s.includes("pending")) return "pending";
  return null;
}

/**
 * Ensure calendar[dateKey][bucket][status] exists as a Set.
 */
function ensureEntry(calendar, dateKey, bucket) {
  if (!calendar[dateKey]) {
    calendar[dateKey] = {
      foh: { approved: new Set(), pending: new Set() },
      boh: { approved: new Set(), pending: new Set() },
    };
  }
}

/**
 * Extract calendar data from parsed records.
 * @param {Array<{name: string, dateAndTime: string, status: string}>} records
 * @param {"foh"|"boh"} bucket
 * @param {Object} calendar - Mutable calendar accumulator
 */
export function extractFromRecords(records, bucket, calendar) {
  for (const { name, dateAndTime, status: rawStatus } of records) {
    const status = normalizeStatus(rawStatus);
    if (!name || !status) continue;

    const dateMatches = dateAndTime.match(DATE_RE);
    if (!dateMatches) continue;

    let dates = [...dateMatches];

    // Handle "ends 12:00 AM" — drop last date
    if (MIDNIGHT_END_RE.test(dateAndTime)) {
      dates = dates.slice(0, -1);
    }

    if (dates.length === 0) continue;

    if (THROUGH_RE.test(dateAndTime) && dates.length >= 2) {
      // Range: expand start through end (exclusive)
      const start = parseMDYY(dates[0]);
      const end = parseMDYY(dates[dates.length - 1]);
      for (const d of dateRange(start, end)) {
        const key = toISO(d);
        ensureEntry(calendar, key, bucket);
        calendar[key][bucket][status].add(name);
      }
    } else {
      // Single date
      const d = parseMDYY(dates[0]);
      const key = toISO(d);
      ensureEntry(calendar, key, bucket);
      calendar[key][bucket][status].add(name);
    }
  }
}

/**
 * Build final calendar output from the accumulated calendar object.
 * Computes "all" as union of foh + boh, converts Sets to sorted arrays.
 * @param {Object} calendar - The accumulated calendar
 * @returns {Object} - { "2026-02-14": { all: {...}, foh: {...}, boh: {...} } }
 */
export function buildCalendarOutput(calendar) {
  const out = {};

  for (const date of Object.keys(calendar).sort()) {
    const foh = calendar[date].foh;
    const boh = calendar[date].boh;

    const approvedAll = new Set([...foh.approved, ...boh.approved]);
    const pendingAll = new Set([...foh.pending, ...boh.pending]);

    out[date] = {
      all: {
        approved: [...approvedAll].sort(),
        pending: [...pendingAll].sort(),
        count: approvedAll.size + pendingAll.size,
      },
      foh: {
        approved: [...foh.approved].sort(),
        pending: [...foh.pending].sort(),
        count: foh.approved.size + foh.pending.size,
      },
      boh: {
        approved: [...boh.approved].sort(),
        pending: [...boh.pending].sort(),
        count: boh.approved.size + boh.pending.size,
      },
    };
  }

  return out;
}
