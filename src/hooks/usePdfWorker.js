/**
 * usePdfWorker — PDF rendering hook
 *
 * Uses OffscreenCanvas + Worker when available (Chrome/Edge).
 * Falls back gracefully to main-thread rendering via pdf.js CDN global.
 *
 * NOTE: The actual Web Worker is disabled for Vite compatibility.
 * All rendering happens on the main thread using pdf.js (loaded via CDN in index.html).
 * Performance is still good because we cache rendered pages as ImageBitmap objects.
 */
import { useState, useRef, useCallback } from 'react';

export function usePdfWorker() {
  // We always report workerReady=false so App.jsx uses its main-thread fallback path.
  // This keeps the build simple and avoids Vite worker bundling issues.
  const [workerReady] = useState(false);

  const cacheRef = useRef({}); // `${bookId}_${pageNum}` → ImageBitmap

  const loadPdf = useCallback(() => {
    // No-op: pdf.js is loaded via CDN and managed by App.jsx directly
    return Promise.reject(new Error('Worker disabled — use main thread'));
  }, []);

  const renderPage = useCallback(() => {
    return Promise.reject(new Error('Worker disabled — use main thread'));
  }, []);

  const prefetch = useCallback(() => {
    // No-op
  }, []);

  const clearCache = useCallback(() => {
    Object.values(cacheRef.current).forEach(bmp => bmp?.close?.());
    cacheRef.current = {};
  }, []);

  return { workerReady, loadPdf, renderPage, prefetch, clearCache };
}
