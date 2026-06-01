import { useState, useEffect, useCallback } from 'react';
import {
  getAllBooks, saveBook, deleteBook,
  getProgress, saveProgress,
  getBookmarksForBook, addBookmark, deleteBookmark,
  getAllAnnotationsForBook, saveAnnotation,
  getAllSettings, saveSetting,
} from './useDB.js';

/**
 * useLibrary — manages library state + persistence
 * Returns everything the app needs to read/write the library.
 */
export function useLibrary() {
  const [books,     setBooks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [settings,  setSettings]  = useState({
    darkMode:      true,
    readerFont:    "'EB Garamond', Georgia, serif",
    readerFontSize: 17,
    readerThemeName: 'Papel',
  });

  // ── Load all books + settings on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [allBooks, allSettings] = await Promise.all([getAllBooks(), getAllSettings()]);
        setBooks(allBooks);
        if (Object.keys(allSettings).length > 0) setSettings(prev => ({ ...prev, ...allSettings }));
      } catch (err) {
        console.warn('IndexedDB unavailable, using memory only:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Add a book from file ───────────────────────────────────────────────────
  const addBookFromFile = useCallback(async (file) => {
    const id       = `book_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fileData = await file.arrayBuffer();
    const ext      = file.name.split('.').pop().toLowerCase();
    const fileType = file.type === 'application/pdf' ? 'pdf'
                   : file.type.startsWith('image/')  ? 'image'
                   : (ext === 'docx' || ext === 'doc') ? 'word'
                   : 'unknown';

    const book = {
      id,
      title:     file.name.replace(/\.[^.]+$/, ''),
      author:    '',
      emoji:     fileType === 'pdf' ? '📄' : fileType === 'image' ? '🖼️' : '📝',
      grad:      ['#2a2318', '#3a3025'],
      fileType,
      fileSize:  file.size,
      addedAt:   Date.now(),
      totalPages: 1,
      fileData,  // stored as ArrayBuffer in IndexedDB
    };

    await saveBook(book);
    setBooks(prev => [book, ...prev]);
    return book;
  }, []);

  // ── Add a demo book (no file) ─────────────────────────────────────────────
  const addDemoBook = useCallback(async (demoData) => {
    const existing = books.find(b => b.id === demoData.id);
    if (existing) return existing;
    await saveBook({ ...demoData, addedAt: Date.now() });
    setBooks(prev => {
      if (prev.find(b => b.id === demoData.id)) return prev;
      return [demoData, ...prev];
    });
    return demoData;
  }, [books]);

  // ── Remove a book ─────────────────────────────────────────────────────────
  const removeBook = useCallback(async (bookId) => {
    await deleteBook(bookId);
    setBooks(prev => prev.filter(b => b.id !== bookId));
  }, []);

  // ── Update book metadata (title, author, totalPages, etc.) ───────────────
  const updateBook = useCallback(async (bookId, updates) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...updates } : b));
    const current = books.find(b => b.id === bookId);
    if (current) await saveBook({ ...current, ...updates });
  }, [books]);

  // ── Progress ──────────────────────────────────────────────────────────────
  const loadProgress = useCallback(async (bookId) => {
    return getProgress(bookId);
  }, []);

  const persistProgress = useCallback(async (bookId, page, percent) => {
    await saveProgress(bookId, page, percent);
    // Update the book's cached progress
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, progress: percent, lastPage: page } : b));
  }, []);

  // ── Annotations ───────────────────────────────────────────────────────────
  const loadAnnotations = useCallback(async (bookId) => {
    const rows = await getAllAnnotationsForBook(bookId);
    const map  = {};
    rows.forEach(r => { map[r.page] = r.imageData; });
    return map;
  }, []);

  const persistAnnotation = useCallback(async (bookId, page, imageData) => {
    await saveAnnotation(bookId, page, imageData);
  }, []);

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  const loadBookmarks = useCallback(async (bookId) => {
    return getBookmarksForBook(bookId);
  }, []);

  const createBookmark = useCallback(async (bookId, page, note = '') => {
    const id = await addBookmark(bookId, page, note);
    return { id, bookId, page, note, createdAt: Date.now() };
  }, []);

  const removeBookmark = useCallback(async (id) => {
    await deleteBookmark(id);
  }, []);

  // ── Settings ─────────────────────────────────────────────────────────────
  const updateSetting = useCallback(async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await saveSetting(key, value);
  }, []);

  return {
    books, loading, settings,
    addBookFromFile, addDemoBook, removeBook, updateBook,
    loadProgress, persistProgress,
    loadAnnotations, persistAnnotation,
    loadBookmarks, createBookmark, removeBookmark,
    updateSetting,
  };
}
