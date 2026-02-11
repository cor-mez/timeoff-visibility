import { ref, set, get, onValue } from "firebase/database";
import { db } from "./firebase.js";
import { generateStoreId, generateManagementKey } from "./utils.js";

/**
 * Create a new store in Firebase.
 * @param {string} storeName
 * @returns {{ storeId: string, managementKey: string }}
 */
export async function createStore(storeName) {
  const storeId = generateStoreId(storeName);
  const managementKey = generateManagementKey();
  const now = new Date().toISOString();

  await set(ref(db, `stores/${storeId}`), {
    name: storeName,
    managementKey,
    createdAt: now,
    lastUpdated: now,
    calendar: {},
  });

  return { storeId, managementKey };
}

/**
 * Get store metadata (name, lastUpdated, createdAt).
 * managementKey is not readable per security rules.
 * @param {string} storeId
 * @returns {Promise<{name: string, lastUpdated: string, createdAt: string} | null>}
 */
export async function getStoreMeta(storeId) {
  const nameSnap = await get(ref(db, `stores/${storeId}/name`));
  if (!nameSnap.exists()) return null;

  const lastUpdatedSnap = await get(ref(db, `stores/${storeId}/lastUpdated`));
  const createdAtSnap = await get(ref(db, `stores/${storeId}/createdAt`));

  return {
    name: nameSnap.val(),
    lastUpdated: lastUpdatedSnap.val(),
    createdAt: createdAtSnap.val(),
  };
}

/**
 * Subscribe to a store's calendar data in real-time.
 * @param {string} storeId
 * @param {(data: Object | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToCalendar(storeId, callback) {
  const calRef = ref(db, `stores/${storeId}/calendar`);
  const unsub = onValue(calRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsub;
}

/**
 * Subscribe to store metadata in real-time.
 * @param {string} storeId
 * @param {(meta: {name: string, lastUpdated: string}) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToMeta(storeId, callback) {
  const nameRef = ref(db, `stores/${storeId}/name`);
  const lastUpdatedRef = ref(db, `stores/${storeId}/lastUpdated`);

  let meta = { name: "", lastUpdated: "" };

  const unsub1 = onValue(nameRef, (snap) => {
    meta = { ...meta, name: snap.val() || "" };
    callback(meta);
  });

  const unsub2 = onValue(lastUpdatedRef, (snap) => {
    meta = { ...meta, lastUpdated: snap.val() || "" };
    callback(meta);
  });

  return () => {
    unsub1();
    unsub2();
  };
}

/**
 * Update a store's calendar data + lastUpdated.
 * Includes the managementKey for write validation.
 * @param {string} storeId
 * @param {string} managementKey
 * @param {string} storeName
 * @param {Object} calendarData
 */
export async function updateStore(storeId, managementKey, storeName, calendarData) {
  const storeRef = ref(db, `stores/${storeId}`);

  // Read createdAt so we don't overwrite it
  const createdAtSnap = await get(ref(db, `stores/${storeId}/createdAt`));
  const createdAt = createdAtSnap.val() || new Date().toISOString();

  await set(storeRef, {
    name: storeName,
    managementKey,
    createdAt,
    lastUpdated: new Date().toISOString(),
    calendar: calendarData,
  });
}

/**
 * Validate a management key by attempting a lightweight write.
 * If the key is wrong, Firebase security rules will reject it.
 * @param {string} storeId
 * @param {string} managementKey
 * @returns {Promise<{valid: boolean, storeName: string}>}
 */
export async function validateManagementKey(storeId, managementKey) {
  const meta = await getStoreMeta(storeId);
  if (!meta) return { valid: false, storeName: "" };

  try {
    // Attempt a write with the key — security rules reject if key doesn't match
    const storeRef = ref(db, `stores/${storeId}`);
    await set(storeRef, {
      name: meta.name,
      managementKey,
      createdAt: meta.createdAt,
      lastUpdated: meta.lastUpdated,
      calendar: (await get(ref(db, `stores/${storeId}/calendar`))).val() || {},
    });
    return { valid: true, storeName: meta.name };
  } catch {
    return { valid: false, storeName: "" };
  }
}

// ─── Staffing / Settings ──────────────────────────────────

/**
 * Subscribe to a store's staffing data in real-time.
 */
export function subscribeToStaffing(storeId, callback) {
  const staffRef = ref(db, `stores/${storeId}/staffing`);
  const unsub = onValue(staffRef, (snap) => {
    callback(snap.val());
  });
  return unsub;
}

/**
 * Get store settings (effectiveness rates, staffing needs).
 */
export async function getStoreSettings(storeId) {
  const snap = await get(ref(db, `stores/${storeId}/settings`));
  return snap.val();
}

/**
 * Subscribe to store settings in real-time.
 */
export function subscribeToSettings(storeId, callback) {
  const settingsRef = ref(db, `stores/${storeId}/settings`);
  const unsub = onValue(settingsRef, (snap) => {
    callback(snap.val());
  });
  return unsub;
}

/**
 * Read all persisted fields for a store (used internally to preserve data on writes).
 */
async function readStoreFields(storeId) {
  const [nameSnap, createdAtSnap, calSnap, staffSnap, settingsSnap, tiersSnap] =
    await Promise.all([
      get(ref(db, `stores/${storeId}/name`)),
      get(ref(db, `stores/${storeId}/createdAt`)),
      get(ref(db, `stores/${storeId}/calendar`)),
      get(ref(db, `stores/${storeId}/staffing`)),
      get(ref(db, `stores/${storeId}/settings`)),
      get(ref(db, `stores/${storeId}/employeeTiers`)),
    ]);
  return {
    name: nameSnap.val() || "",
    createdAt: createdAtSnap.val() || new Date().toISOString(),
    calendar: calSnap.val() || {},
    staffing: staffSnap.val() || {},
    settings: settingsSnap.val() || {},
    employeeTiers: tiersSnap.val() || {},
  };
}

/**
 * Save store settings. Uses the full store write with managementKey for auth.
 */
export async function saveStoreSettings(storeId, managementKey, settings) {
  const fields = await readStoreFields(storeId);
  await set(ref(db, `stores/${storeId}`), {
    ...fields,
    managementKey,
    lastUpdated: new Date().toISOString(),
    settings,
  });
}

/**
 * Update staffing data in Firebase.
 */
export async function updateStaffing(storeId, managementKey, staffingData) {
  const fields = await readStoreFields(storeId);
  await set(ref(db, `stores/${storeId}`), {
    ...fields,
    managementKey,
    lastUpdated: new Date().toISOString(),
    staffing: {
      ...staffingData,
      lastUpdated: new Date().toISOString(),
    },
  });
}

/**
 * Get employee tiers for a store.
 */
export async function getEmployeeTiers(storeId) {
  const snap = await get(ref(db, `stores/${storeId}/employeeTiers`));
  return snap.val() || {};
}

/**
 * Save employee tiers.
 */
export async function saveEmployeeTiers(storeId, managementKey, employeeTiers) {
  const fields = await readStoreFields(storeId);
  await set(ref(db, `stores/${storeId}`), {
    ...fields,
    managementKey,
    lastUpdated: new Date().toISOString(),
    employeeTiers,
  });
}
