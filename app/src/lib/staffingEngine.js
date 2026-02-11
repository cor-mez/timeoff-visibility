/**
 * Staffing Engine — computes hour-by-hour gap analysis.
 *
 * Pipeline:
 * 1. Per-employee availability (from parseAvailability)
 * 2. Apply tier-based effectiveness per employee per hour
 * 3. Time-off hourly deductions (from time-off records)
 * 4. Subtract time-off from effective availability
 * 5. Compare against staffing needs → gap
 */

import { HOURS, hourLabel } from "./parseAvailability.js";

/** Default staffing needs per hour (typical CFA). */
export const DEFAULT_STAFFING_NEEDS = {
  boh: {
    "5AM": 4, "6AM": 5, "7AM": 5, "8AM": 6, "9AM": 8, "10AM": 8,
    "11AM": 9, "12PM": 11, "1PM": 10, "2PM": 7, "3PM": 7, "4PM": 7,
    "5PM": 7, "6PM": 3, "7PM": 4, "8PM": 4, "9PM": 7, "10PM": 4, "11PM": 4,
  },
  foh: {
    "5AM": 4, "6AM": 4, "7AM": 6, "8AM": 6, "9AM": 8, "10AM": 7,
    "11AM": 10, "12PM": 10, "1PM": 11, "2PM": 8, "3PM": 9, "4PM": 7,
    "5PM": 6, "6PM": 4, "7PM": 5, "8PM": 5, "9PM": 6, "10PM": 5, "11PM": 6,
  },
};

/** Default tier effectiveness rates. */
export const DEFAULT_TIER_RATES = {
  full: 0.70,
  part: 0.45,
  limited: 0.20,
};

const DATE_RE = /(\d{1,2}\/\d{1,2}\/\d{2})/g;
const THROUGH_RE = /\bThrough\b/i;
const MIDNIGHT_END_RE = /ends\s+12:00\s*AM/i;
const ALL_DAY_RE = /all\s+day/i;
const STARTS_RE = /starts\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
const ENDS_RE = /ends\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i;

/**
 * Parse M/D/YY to ISO date string.
 */
function parseMDYYtoISO(s) {
  const [m, d, y] = s.split("/").map(Number);
  const fullYear = y < 100 ? 2000 + y : y;
  return `${fullYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Parse 12h time to 24h hour.
 */
function parseTime(s) {
  const match = s.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "AM" && h === 12) h = 0;
  else if (ampm === "PM" && h !== 12) h += 12;
  return h;
}

/**
 * Generate ISO dates from start to end (exclusive).
 */
function isoDateRange(startISO, endISO) {
  const dates = [];
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  while (cur < end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Convert time-off records into hourly deduction counts per day.
 *
 * @param {Array<{name, dateAndTime, status}>} records - Parsed time-off records
 * @param {Array<string>} weekISO - Array of ISO dates for the week
 * @returns {Object} - { "5AM": { "2026-02-16": count, ... }, ... }
 */
export function buildTimeOffHourly(records, weekISO) {
  const weekSet = new Set(weekISO);

  // hour → isoDate → Set of names
  const hourlyNames = {};
  for (const h of HOURS) {
    const label = hourLabel(h);
    hourlyNames[label] = {};
    for (const d of weekISO) {
      hourlyNames[label][d] = new Set();
    }
  }

  for (const { name, dateAndTime, status } of records) {
    const s = status.toLowerCase();
    if (!s.includes("approved") && !s.includes("pending")) continue;

    const dateMatches = dateAndTime.match(DATE_RE);
    if (!dateMatches) continue;

    let dates = [...dateMatches];

    if (MIDNIGHT_END_RE.test(dateAndTime)) {
      dates = dates.slice(0, -1);
    }
    if (dates.length === 0) continue;

    let isoDates;
    if (THROUGH_RE.test(dateAndTime) && dates.length >= 2) {
      const startISO = parseMDYYtoISO(dates[0]);
      const endISO = parseMDYYtoISO(dates[dates.length - 1]);
      isoDates = isoDateRange(startISO, endISO);
    } else {
      isoDates = [parseMDYYtoISO(dates[0])];
    }

    let offHours;
    if (ALL_DAY_RE.test(dateAndTime)) {
      offHours = HOURS;
    } else {
      const startsMatch = STARTS_RE.exec(dateAndTime);
      const endsMatch = ENDS_RE.exec(dateAndTime);
      if (startsMatch && endsMatch) {
        const startH = parseTime(startsMatch[1]);
        const endH = parseTime(endsMatch[1]);
        if (startH !== null && endH !== null) {
          const effectiveEnd = endH === 0 ? 24 : endH;
          offHours = HOURS.filter((h) => h >= startH && h < effectiveEnd);
        } else {
          offHours = HOURS;
        }
      } else if (startsMatch) {
        const startH = parseTime(startsMatch[1]);
        offHours = startH !== null ? HOURS.filter((h) => h >= startH) : HOURS;
      } else if (endsMatch) {
        const endH = parseTime(endsMatch[1]);
        const effectiveEnd = endH === 0 ? 24 : endH;
        offHours = endH !== null ? HOURS.filter((h) => h < effectiveEnd) : HOURS;
      } else {
        offHours = HOURS;
      }
    }

    for (const isoDate of isoDates) {
      if (!weekSet.has(isoDate)) continue;
      for (const h of offHours) {
        const label = hourLabel(h);
        if (hourlyNames[label]?.[isoDate]) {
          hourlyNames[label][isoDate].add(name);
        }
      }
    }
  }

  // Convert Sets to counts
  const hourlyCounts = {};
  for (const label of Object.keys(hourlyNames)) {
    hourlyCounts[label] = {};
    for (const d of weekISO) {
      hourlyCounts[label][d] = hourlyNames[label][d].size;
    }
  }
  return hourlyCounts;
}

/**
 * Compute tier-weighted effective availability per hour per day.
 *
 * For each hour, sums the tier rate for each available employee:
 *   Full-time person available = 0.70
 *   Part-time person available = 0.45
 *   Limited person available = 0.20
 *
 * @param {Object} employeeAvailability - { "Name": { "5AM": { mon: true, ... } } }
 * @param {Object} employeeTiers - { "Name": "full"|"part"|"limited" }
 * @param {Object} tierRates - { full: 0.70, part: 0.45, limited: 0.20 }
 * @param {Array<{dayAbbr}>} weekDates
 * @returns {Object} - { "5AM": { mon: 8.2, tue: 11.4, ... }, ... }
 */
export function computeEffectiveAvailability(employeeAvailability, employeeTiers, tierRates, weekDates) {
  const rates = { ...DEFAULT_TIER_RATES, ...tierRates };
  const effective = {};

  for (const h of HOURS) {
    const label = hourLabel(h);
    effective[label] = {};

    for (const { dayAbbr } of weekDates) {
      let sum = 0;
      for (const [name, grid] of Object.entries(employeeAvailability)) {
        if (grid[label]?.[dayAbbr]) {
          const tier = employeeTiers[name] || "part";
          sum += rates[tier] || rates.part;
        }
      }
      effective[label][dayAbbr] = sum;
    }
  }

  return effective;
}

/**
 * Compute the full staffing gap analysis using tier-weighted availability.
 *
 * @param {Object} params
 * @param {Object} params.rawAvailability - { "5AM": { mon: 14, ... } }  (headcount)
 * @param {Object} params.effective       - { "5AM": { mon: 8.2, ... } } (tier-weighted)
 * @param {Object} params.timeoff         - { "5AM": { "2026-02-16": 2, ... } }
 * @param {Array<{dayAbbr, isoDate}>} params.weekDates
 * @param {Object} params.staffingNeeds   - { "5AM": 4, ... }
 * @returns {Object} - { "5AM": { mon: { raw, effective, timeoff, net, need, gap }, ... }, ... }
 */
export function computeStaffingGap({ rawAvailability, effective, timeoff, weekDates, staffingNeeds }) {
  const result = {};

  for (const h of HOURS) {
    const label = hourLabel(h);
    result[label] = {};

    for (const { dayAbbr, isoDate } of weekDates) {
      const raw = rawAvailability[label]?.[dayAbbr] || 0;
      const eff = effective[label]?.[dayAbbr] || 0;
      const effRounded = Math.round(eff);
      const toDeduct = timeoff[label]?.[isoDate] || 0;
      const net = effRounded - toDeduct;
      const need = staffingNeeds[label] || 0;
      const gap = net - need;

      result[label][dayAbbr] = {
        raw,
        effective: effRounded,
        effectiveExact: Math.round(eff * 10) / 10,
        timeoff: toDeduct,
        net,
        need,
        gap,
      };
    }
  }

  return result;
}

/**
 * Get staffing color class based on gap value.
 * Green: gap >= +2 (comfortable surplus)
 * Yellow: gap is -1 to +1 (tight)
 * Orange: gap is -2 or -3 (getting short)
 * Red: gap <= -4 (critically understaffed)
 */
export function staffingColor(gap) {
  if (gap >= 2) return "staffing-green";
  if (gap >= -1) return "staffing-yellow";
  if (gap >= -3) return "staffing-orange";
  return "staffing-red";
}

/**
 * Format hour-by-hour data to CSV string (for download).
 * @param {Object} hourlyData - { "5AM": { mon: val, tue: val, ... }, ... }
 * @param {Array<{dayAbbr}>} weekDates
 * @returns {string}
 */
export function toCSV(hourlyData, weekDates) {
  const dayHeaders = weekDates.map((d) => d.dayAbbr.charAt(0).toUpperCase() + d.dayAbbr.slice(1));
  const rows = ["Hour," + dayHeaders.join(",")];

  for (const h of HOURS) {
    const label = hourLabel(h);
    const displayLabel = `${h > 12 ? h - 12 : h === 0 ? 12 : h} ${h >= 12 ? "PM" : "AM"}`;
    const vals = weekDates.map((d) => hourlyData[label]?.[d.dayAbbr] ?? 0);
    rows.push(displayLabel + "," + vals.join(","));
  }

  return rows.join("\n");
}

/**
 * Trigger a CSV download in the browser.
 */
export function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
