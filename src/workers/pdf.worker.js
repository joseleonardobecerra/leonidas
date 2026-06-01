/**
 * pdf.worker.js — Web Worker for PDF rendering
 * Runs pdf.js page rendering off the main thread.
 *
 * Messages received:
 *   { type: 'RENDER_PAGE', pageNum, scale, bookId }
 *
 * Messages sent:
 *   { type: 'PAGE_READY',  pageNum, bitmap, width, height, bookId }
 *   { type: 'PAGE_ERROR',  pageNum, error, bookId }
 *   { type: 'PDF_LOADED',  totalPages, bookId }
 *   { type: 'PDF_ERROR',   error, bookId }
 */

// Load pdf.js inside the worker
importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
self.pdfjsLib.GlobalWorkerOptions.workerSrc = ''; // already inside a worker

let pdfDoc    = null;
let currentId = null;

self.onmessage = async (e) => {
  const { type, data, pageNum, scale = 2.5, bookId } = e.data;

  // ── Load PDF from ArrayBuffer ──────────────────────────────────────────────
  if (type === 'LOAD_PDF') {
    currentId = bookId;
    try {
      pdfDoc = await self.pdfjsLib.getDocument({ data }).promise;
      self.postMessage({ type: 'PDF_LOADED', totalPages: pdfDoc.numPages, bookId });
    } catch (err) {
      self.postMessage({ type: 'PDF_ERROR', error: err.message, bookId });
    }
    return;
  }

  // ── Render a single page to an OffscreenCanvas → ImageBitmap ─────────────
  if (type === 'RENDER_PAGE') {
    if (!pdfDoc) {
      self.postMessage({ type: 'PAGE_ERROR', pageNum, error: 'PDF not loaded', bookId });
      return;
    }
    try {
      const page     = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const ctx    = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Transfer as ImageBitmap (zero-copy transfer)
      const bitmap = canvas.transferToImageBitmap();
      self.postMessage(
        { type: 'PAGE_READY', pageNum, bitmap, width: viewport.width, height: viewport.height, bookId },
        [bitmap] // transferable — no clone
      );
    } catch (err) {
      self.postMessage({ type: 'PAGE_ERROR', pageNum, error: err.message, bookId });
    }
    return;
  }

  // ── Prefetch adjacent pages ───────────────────────────────────────────────
  if (type === 'PREFETCH') {
    if (!pdfDoc) return;
    const { pages, scale: sc = 2.5 } = e.data;
    for (const pn of pages) {
      try {
        const page     = await pdfDoc.getPage(pn);
        const viewport = page.getViewport({ scale: sc });
        const canvas   = new OffscreenCanvas(viewport.width, viewport.height);
        const ctx      = canvas.getContext('2d');
        ctx.fillStyle  = '#fff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const bitmap = canvas.transferToImageBitmap();
        self.postMessage(
          { type: 'PAGE_READY', pageNum: pn, bitmap, width: viewport.width, height: viewport.height, bookId },
          [bitmap]
        );
      } catch { /* skip failed prefetch silently */ }
    }
  }
};
