const DB_NAME = 'erp-offline';
const STORE   = 'attendance';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function savePendingRollCall(payload) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req  = store.add({ ...payload, savedAt: new Date().toISOString() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function getPendingRollCalls() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req  = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function deletePendingRollCall(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req  = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

export async function clearAllPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req  = store.clear();
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}
