import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'

let pdfDoc    = null;
let currentId = null;

// pdf.js worker must be set even inside a worker context
// We point it to an empty string since we are already in a worker
pdfjsLib.GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions || {};
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

self.onmessage = async (e) => {
  const { type, data, pageNum, scale = 2.5, bookId, pages } = e.data;

  if (type === 'LOAD_PDF') {
    currentId = bookId;
    try {
      pdfDoc = await pdfjsLib.getDocument({ data }).promise;
      self.postMessage({ type: 'PDF_LOADED', totalPages: pdfDoc.numPages, bookId });
    } catch (err) {
      self.postMessage({ type: 'PDF_ERROR', error: err.message, bookId });
    }
    return;
  }

  if (type === 'RENDER_PAGE') {
    if (!pdfDoc) {
      self.postMessage({ type: 'PAGE_ERROR', pageNum, error: 'PDF not loaded', bookId });
      return;
    }
    try {
      const page     = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas   = new OffscreenCanvas(viewport.width, viewport.height);
      const ctx      = canvas.getContext('2d');
      ctx.fillStyle  = '#ffffff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const bitmap = canvas.transferToImageBitmap();
      self.postMessage(
        { type: 'PAGE_READY', pageNum, bitmap, width: viewport.width, height: viewport.height, bookId },
        [bitmap]
      );
    } catch (err) {
      self.postMessage({ type: 'PAGE_ERROR', pageNum, error: err.message, bookId });
    }
    return;
  }

  if (type === 'PREFETCH') {
    if (!pdfDoc) return;
    for (const pn of (pages || [])) {
      try {
        const page     = await pdfDoc.getPage(pn);
        const viewport = page.getViewport({ scale });
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
      } catch { /* skip */ }
    }
  }
};
