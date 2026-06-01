import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePdfWorker — renders PDF pages in a Web Worker with page cache.
 * Falls back to main-thread rendering if OffscreenCanvas is unavailable.
 */
export function usePdfWorker() {
  const workerRef    = useRef(null);
  const cacheRef     = useRef({}); // pageNum → ImageBitmap
  const pendingRef   = useRef({}); // pageNum → Promise
  const [workerReady, setWorkerReady] = useState(false);

  // ── Init worker ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Check if OffscreenCanvas is supported
    if (typeof OffscreenCanvas === 'undefined') {
      setWorkerReady(false);
      return;
    }
    const worker = new Worker(new URL('./pdf.worker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setWorkerReady(true);

    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  // ── Load PDF into worker ───────────────────────────────────────────────────
  const loadPdf = useCallback((arrayBuffer, bookId) => {
    cacheRef.current   = {};
    pendingRef.current = {};
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject(new Error('Worker not available'));
      const handler = (e) => {
        if (e.data.bookId !== bookId) return;
        if (e.data.type === 'PDF_LOADED') {
          workerRef.current.removeEventListener('message', handler);
          resolve(e.data.totalPages);
        }
        if (e.data.type === 'PDF_ERROR') {
          workerRef.current.removeEventListener('message', handler);
          reject(new Error(e.data.error));
        }
      };
      workerRef.current.addEventListener('message', handler);
      // Transfer the buffer — zero copy
      workerRef.current.postMessage({ type: 'LOAD_PDF', data: arrayBuffer, bookId }, [arrayBuffer]);
    });
  }, []);

  // ── Render a page (returns ImageBitmap, cached) ───────────────────────────
  const renderPage = useCallback((pageNum, scale = 2.5, bookId) => {
    const key = `${bookId}_${pageNum}`;

    // Already cached?
    if (cacheRef.current[key]) return Promise.resolve(cacheRef.current[key]);

    // Already in flight?
    if (pendingRef.current[key]) return pendingRef.current[key];

    const promise = new Promise((resolve, reject) => {
      if (!workerRef.current) return reject(new Error('Worker not available'));
      const handler = (e) => {
        if (e.data.bookId !== bookId || e.data.pageNum !== pageNum) return;
        if (e.data.type === 'PAGE_READY') {
          workerRef.current.removeEventListener('message', handler);
          cacheRef.current[key] = e.data.bitmap;
          delete pendingRef.current[key];
          resolve({ bitmap: e.data.bitmap, width: e.data.width, height: e.data.height });
        }
        if (e.data.type === 'PAGE_ERROR') {
          workerRef.current.removeEventListener('message', handler);
          delete pendingRef.current[key];
          reject(new Error(e.data.error));
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'RENDER_PAGE', pageNum, scale, bookId });
    });

    pendingRef.current[key] = promise;
    return promise;
  }, []);

  // ── Prefetch adjacent pages ───────────────────────────────────────────────
  const prefetch = useCallback((pages, scale = 2.5, bookId) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'PREFETCH', pages, scale, bookId });
  }, []);

  // ── Clear cache (on book change) ──────────────────────────────────────────
  const clearCache = useCallback(() => {
    // Close existing ImageBitmaps to free GPU memory
    Object.values(cacheRef.current).forEach(bmp => bmp?.close?.());
    cacheRef.current   = {};
    pendingRef.current = {};
  }, []);

  return { workerReady, loadPdf, renderPage, prefetch, clearCache };
}
