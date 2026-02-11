/**
 * Parse HotSchedules Availability CSV (pasted text) into hourly
 * availability counts per day.
 *
 * Input: CSV text with headers like "Employees,Mon  2/16/26,Tue  2/17/26,..."
 * Cell values: "Available All Day", "Unavailable All Day",
 *   "Partially Available 4:00 PM - 10:00 PM",
 *   "Partially Available 7:00 AM - 12:00 PM, 3:00 PM - 10:00 PM"
 */

const DAY_ABBRS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const ALL_DAY_START = 5;
const ALL_DAY_END = 23;

/**
 * Parse 12h time string to 24h hour number.
 * "4:00 PM" → 16, "12:00 AM" → 0, "12:00 PM" → 12, "5:30 AM" → 5
 */
function parseTime12h(s) {
  const match = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "AM" && h === 12) h = 0;
  else if (ampm === "PM" && h !== 12) h += 12;
  return h;
}

/**
 * Parse a single availability range "4:00 PM - 10:00 PM" → Set of hours.
 * Start is inclusive, end is exclusive (person leaves at end time).
 * "12:00 AM" as end = midnight = through end of day (hour 23 inclusive).
 */
function parseRange(rangeStr) {
  const hours = new Set();
  const parts = rangeStr.trim().split(/\s*-\s*/);
  if (parts.length !== 2) return hours;

  const startH = parseTime12h(parts[0]);
  const endH = parseTime12h(parts[1]);
  if (startH === null || endH === null) return hours;

  // "12:00 AM" as end means through end of day
  const effectiveEnd = endH === 0 ? 24 : endH;

  for (let h = startH; h < effectiveEnd; h++) {
    if (h >= ALL_DAY_START && h <= 23) {
      hours.add(h);
    }
  }
  return hours;
}

/**
 * Parse a cell value into a Set of available hours (5-23).
 */
function parseCell(cellValue) {
  const val = (cellValue || "").trim();

  if (!val || /unavailable\s+all\s+day/i.test(val)) {
    return new Set();
  }

  if (/^available\s+all\s+day$/i.test(val)) {
    const hours = new Set();
    for (let h = ALL_DAY_START; h <= ALL_DAY_END; h++) hours.add(h);
    return hours;
  }

  // "Partially Available ..."
  const paMatch = val.match(/partially\s+available\s+(.*)/i);
  if (paMatch) {
    const rangesPart = paMatch[1];
    // Split on comma for multiple ranges
    const ranges = rangesPart.split(",");
    const hours = new Set();
    for (const r of ranges) {
      for (const h of parseRange(r)) hours.add(h);
    }
    return hours;
  }

  return new Set();
}

/**
 * Parse a date from a column header like "Mon  2/16/26".
 * Returns { dayAbbr, dateStr, isoDate } or null.
 */
function parseColumnHeader(header) {
  const h = header.trim().replace(/^"/, "").replace(/"$/, "");
  const match = h.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (!match) return null;
  const dayAbbr = match[1].slice(0, 3).toLowerCase();
  const dateStr = match[2];
  const [m, d, y] = dateStr.split("/").map(Number);
  const fullYear = y < 100 ? 2000 + y : y;
  const isoDate = `${fullYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { dayAbbr, dateStr, isoDate };
}

/**
 * Split a line respecting CSV quoting.
 * Handles both comma-separated (with quotes) and tab-separated.
 */
function splitCSVLine(line) {
  // Try tab-separated first
  if (line.includes("\t")) {
    return line.split("\t").map((s) => s.replace(/^"|"$/g, "").trim());
  }

  // CSV with quoted fields
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse pasted availability CSV text.
 *
 * Returns both aggregate hourly counts AND per-employee availability grids
 * (needed for tier-based effectiveness weighting).
 *
 * @param {string} text - Raw pasted CSV text
 * @returns {{
 *   weekDates: Array<{dayAbbr: string, isoDate: string}>,
 *   hourlyAvailability: Object,       // { "5AM": { mon: count, ... }, ... }
 *   employeeAvailability: Object,     // { "Name": { "5AM": { mon: true, ... }, ... } }
 *   employeeNames: string[],          // Sorted list of all employee names
 *   employeeCount: number
 * }}
 */
export function parseAvailability(text) {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    return { weekDates: [], hourlyAvailability: {}, employeeAvailability: {}, employeeNames: [], employeeCount: 0 };
  }

  // Parse header row to find day columns
  const headerFields = splitCSVLine(lines[0]);
  const dayColumns = []; // { index, dayAbbr, isoDate }

  for (let i = 0; i < headerFields.length; i++) {
    const parsed = parseColumnHeader(headerFields[i]);
    if (parsed) {
      dayColumns.push({ index: i, ...parsed });
    }
  }

  if (dayColumns.length === 0) {
    return { weekDates: [], hourlyAvailability: {}, employeeAvailability: {}, employeeNames: [], employeeCount: 0 };
  }

  const weekDates = dayColumns.map((dc) => ({
    dayAbbr: dc.dayAbbr,
    isoDate: dc.isoDate,
  }));

  // Initialize hourly counts: hour → day → count
  const hourlyCounts = {};
  for (const h of HOURS) {
    const label = hourLabel(h);
    hourlyCounts[label] = {};
    for (const dc of dayColumns) {
      hourlyCounts[label][dc.dayAbbr] = 0;
    }
  }

  const employeeAvailability = {};  // name → hourLabel → dayAbbr → boolean
  const employeeNames = [];
  let employeeCount = 0;

  // Parse each data row
  for (let r = 1; r < lines.length; r++) {
    const fields = splitCSVLine(lines[r]);
    if (fields.length <= 1) continue;

    // First field is employee name
    const name = fields[0].replace(/^"|"$/g, "").trim();
    if (!name) continue;
    employeeCount++;
    employeeNames.push(name);

    // Initialize per-employee grid
    employeeAvailability[name] = {};
    for (const h of HOURS) {
      const label = hourLabel(h);
      employeeAvailability[name][label] = {};
      for (const dc of dayColumns) {
        employeeAvailability[name][label][dc.dayAbbr] = false;
      }
    }

    // Parse each day column
    for (const dc of dayColumns) {
      const cellValue = dc.index < fields.length ? fields[dc.index] : "";
      const availableHours = parseCell(cellValue);

      for (const h of availableHours) {
        const label = hourLabel(h);
        if (hourlyCounts[label] && hourlyCounts[label][dc.dayAbbr] !== undefined) {
          hourlyCounts[label][dc.dayAbbr]++;
        }
        if (employeeAvailability[name][label]) {
          employeeAvailability[name][label][dc.dayAbbr] = true;
        }
      }
    }
  }

  employeeNames.sort();

  return { weekDates, hourlyAvailability: hourlyCounts, employeeAvailability, employeeNames, employeeCount };
}

/**
 * Convert 24h hour number to label: 5 → "5AM", 13 → "1PM", 12 → "12PM"
 */
export function hourLabel(h) {
  if (h === 0 || h === 24) return "12AM";
  if (h < 12) return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
}

/**
 * Convert label back to 24h hour: "5AM" → 5, "1PM" → 13
 */
export function labelToHour(label) {
  const match = label.match(/^(\d{1,2})(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const period = match[2].toUpperCase();
  if (period === "AM" && h === 12) return 0;
  if (period === "PM" && h !== 12) return h + 12;
  return h;
}

export { HOURS, DAY_ABBRS };
