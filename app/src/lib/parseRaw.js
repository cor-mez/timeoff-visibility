/**
 * Port of build/parse_raw.py — parses raw HotSchedules paste data
 * into an array of { name, dateAndTime, status } records.
 */

const HEADER_MARKER = "Date and Time\tType\t";
const DATE_PATTERN = /\d{1,2}\/\d{1,2}\/\d{2}/;

/**
 * Parse raw HotSchedules paste text into structured records.
 * @param {string} rawText - The raw pasted text
 * @returns {Array<{name: string, dateAndTime: string, status: string}>}
 */
export function parseRaw(rawText) {
  // Strip BOM
  const text = rawText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(HEADER_MARKER)) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    return [];
  }

  const dataLines = lines.slice(headerIdx + 1);
  const records = [];
  let currentName = null;
  let datePrefix = null;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const parts = line.split("\t");

    // Data row: 6+ tab-separated columns
    if (parts.length >= 6) {
      if (currentName === null) {
        datePrefix = null;
        continue;
      }

      let dateAndTime = parts[0].trim();
      const status = parts[5].trim();

      // Merge date prefix if present (e.g. "Mon 3/16/26 Through" + "Fri 3/20/26")
      if (datePrefix) {
        dateAndTime = datePrefix + " " + dateAndTime;
        datePrefix = null;
      }

      if (dateAndTime && status) {
        records.push({ name: currentName, dateAndTime, status });
      }
      continue;
    }

    // Standalone line (no tabs or fewer than 6 columns)
    const candidate = line.trim();
    if (!candidate) continue;

    // If it contains a date pattern → date prefix (Through/starts continuation)
    if (DATE_PATTERN.test(candidate)) {
      datePrefix = candidate;
    } else {
      // Name row
      currentName = candidate;
      datePrefix = null;
    }
  }

  return records;
}
