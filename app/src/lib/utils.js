/**
 * Slugify a store name and append 4 random hex chars.
 * e.g. "CFA Gateway" → "cfa-gateway-a8f2"
 */
export function generateStoreId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const hex = Math.random().toString(16).slice(2, 6);
  return `${slug}-${hex}`;
}

/**
 * Generate a management key in xxxx-xxxx-xxxx format.
 */
export function generateManagementKey() {
  const seg = () => Math.random().toString(16).slice(2, 6);
  return `${seg()}-${seg()}-${seg()}`;
}

/**
 * Return a heat-level class name based on count.
 * 4 tiers: low (1-2), medium (3-4), high (5-6), critical (7+)
 */
export function heatLevel(count) {
  if (count <= 0) return "";
  if (count <= 2) return "heat-low";
  if (count <= 4) return "heat-medium";
  if (count <= 6) return "heat-high";
  return "heat-critical";
}

/**
 * Format an ISO date string for display.
 * "2026-02-14" → "Feb 14, 2026"
 */
export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
