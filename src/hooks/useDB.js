/**
 * useDB — Capa de persistencia con IndexedDB
 * Stores:
 *   books        { id, title, author, emoji, grad, addedAt, fileData (ArrayBuffer), fileType }
 *   progress     { bookId, page, percent, lastRead }
 *   annotations  { bookId, page, imageData }
 *   bookmarks    { id, bookId, page, note, createdAt }
 *   settings     { key, value }
 */

const DB_NAME    = 'leonidas_db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('books')) {
        const books = db.createObjectStore('books', { keyPath: 'id' });
        books.createIndex('addedAt', 'addedAt');
      }
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'bookId' });
      }
      if (!db.objectStoreNames.contains('annotations')) {
        const ann = db.createObjectStore('annotations', { keyPath: ['bookId', 'page'] });
        ann.createIndex('bookId', 'bookId');
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bm = db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true });
        bm.createIndex('bookId', 'bookId');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Generic helpers ────────────────────────────────────────────────────────────
function tx(db, stores, mode = 'readonly') {
  const t = db.transaction(stores, mode);
  return t;
}

function promisify(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

// ── Books ──────────────────────────────────────────────────────────────────────
export async function saveBook(book) {
  const db = await openDB();
  const t  = tx(db, 'books', 'readwrite');
  return promisify(t.objectStore('books').put(book));
}

export async function getAllBooks() {
  const db    = await openDB();
  const store = tx(db, 'books').objectStore('books');
  const idx   = store.index('addedAt');
  return new Promise((res, rej) => {
    const req = idx.getAll();
    req.onsuccess = () => res(req.result.reverse()); // newest first
    req.onerror   = () => rej(req.error);
  });
}

export async function getBook(id) {
  const db = await openDB();
  return promisify(tx(db, 'books').objectStore('books').get(id));
}

export async function deleteBook(id) {
  const db = await openDB();
  const t  = tx(db, ['books','progress','annotations','bookmarks'], 'readwrite');
  t.objectStore('books').delete(id);
  t.objectStore('progress').delete(id);
  // Delete all annotations for this book
  const annIdx = t.objectStore('annotations').index('bookId');
  const annReq = annIdx.getAllKeys(IDBKeyRange.only(id));
  annReq.onsuccess = () => annReq.result.forEach(k => t.objectStore('annotations').delete(k));
  // Delete all bookmarks for this book
  const bmIdx = t.objectStore('bookmarks').index('bookId');
  const bmReq = bmIdx.getAllKeys(IDBKeyRange.only(id));
  bmReq.onsuccess = () => bmReq.result.forEach(k => t.objectStore('bookmarks').delete(k));
  return new Promise((res, rej) => { t.oncomplete = res; t.onerror = rej; });
}

// ── Progress ───────────────────────────────────────────────────────────────────
export async function saveProgress(bookId, page, percent) {
  const db = await openDB();
  const t  = tx(db, 'progress', 'readwrite');
  return promisify(t.objectStore('progress').put({ bookId, page, percent, lastRead: Date.now() }));
}

export async function getProgress(bookId) {
  const db = await openDB();
  return promisify(tx(db, 'progress').objectStore('progress').get(bookId));
}

// ── Annotations ───────────────────────────────────────────────────────────────
export async function saveAnnotation(bookId, page, imageData) {
  const db = await openDB();
  const t  = tx(db, 'annotations', 'readwrite');
  return promisify(t.objectStore('annotations').put({ bookId, page, imageData, savedAt: Date.now() }));
}

export async function getAnnotation(bookId, page) {
  const db = await openDB();
  return promisify(tx(db, 'annotations').objectStore('annotations').get([bookId, page]));
}

export async function getAllAnnotationsForBook(bookId) {
  const db  = await openDB();
  const idx = tx(db, 'annotations').objectStore('annotations').index('bookId');
  return new Promise((res, rej) => {
    const req = idx.getAll(IDBKeyRange.only(bookId));
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
export async function addBookmark(bookId, page, note = '') {
  const db = await openDB();
  const t  = tx(db, 'bookmarks', 'readwrite');
  return promisify(t.objectStore('bookmarks').add({ bookId, page, note, createdAt: Date.now() }));
}

export async function getBookmarksForBook(bookId) {
  const db  = await openDB();
  const idx = tx(db, 'bookmarks').objectStore('bookmarks').index('bookId');
  return new Promise((res, rej) => {
    const req = idx.getAll(IDBKeyRange.only(bookId));
    req.onsuccess = () => res(req.result.sort((a, b) => a.page - b.page));
    req.onerror   = () => rej(req.error);
  });
}

export async function deleteBookmark(id) {
  const db = await openDB();
  return promisify(tx(db, 'bookmarks', 'readwrite').objectStore('bookmarks').delete(id));
}

// ── Settings ──────────────────────────────────────────────────────────────────
export async function saveSetting(key, value) {
  const db = await openDB();
  return promisify(tx(db, 'settings', 'readwrite').objectStore('settings').put({ key, value }));
}

export async function getSetting(key, defaultValue = null) {
  const db  = await openDB();
  const rec = await promisify(tx(db, 'settings').objectStore('settings').get(key));
  return rec ? rec.value : defaultValue;
}

export async function getAllSettings() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = tx(db, 'settings').objectStore('settings').getAll();
    req.onsuccess = () => {
      const map = {};
      req.result.forEach(r => { map[r.key] = r.value; });
      res(map);
    };
    req.onerror = () => rej(req.error);
  });
}

// ── Storage estimate ──────────────────────────────────────────────────────────
export async function getStorageInfo() {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usedMB: (usage / 1024 / 1024).toFixed(1), totalMB: (quota / 1024 / 1024).toFixed(0) };
}
