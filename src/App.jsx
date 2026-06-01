import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, PenTool, Highlighter, Eraser,
  ChevronLeft, ChevronRight, Trash2, Loader2,
  Undo2, Type, Square, Circle,
  Moon, Sun, Hand, ScanText, X, Copy, BookOpen,
  Menu, Bookmark, FileText, Settings,
  ArrowLeft, Plus, Download, Minus, Search,
  BookMarked, HardDrive, AlertTriangle
} from 'lucide-react';

import SearchPanel, { buildSegments } from './SearchPanel.jsx';
import DictionaryPanel                from './DictionaryPanel.jsx';
import BookPage                       from './components/BookPage.jsx';
import StorageInfo                    from './components/StorageInfo.jsx';
import { useLibrary }                 from './hooks/useLibrary.js';
import { usePdfWorker }               from './hooks/usePdfWorker.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const RENDER_SCALE = 2.5;

const COLORS = [
  { name: 'Ámbar',  hex: '#F59E0B' },
  { name: 'Rojo',   hex: '#EF4444' },
  { name: 'Azul',   hex: '#3B82F6' },
  { name: 'Verde',  hex: '#10B981' },
  { name: 'Rosa',   hex: '#EC4899' },
  { name: 'Tinta',  hex: '#1a1410' },
  { name: 'Blanco', hex: '#F5F0E8' },
];

const FONT_OPTIONS = [
  { label: 'Garamond', value: "'EB Garamond', Georgia, serif" },
  { label: 'Palatino', value: "'Palatino Linotype', Palatino, serif" },
  { label: 'Georgia',  value: 'Georgia, serif' },
];

const PAGE_THEMES = [
  { label: 'Papel',  bg: '#F5F0E8', text: '#2b2018', muted: '#8a7d6e', border: '#d4c9b5' },
  { label: 'Sepia',  bg: '#E8DFC8', text: '#3b2a1a', muted: '#7a6a55', border: '#c4b08a' },
  { label: 'Noche',  bg: '#1a1a2e', text: '#c0b8d0', muted: '#7a7a8a', border: '#2a2840' },
  { label: 'Oscuro', bg: '#0d1117', text: '#8b9eb7', muted: '#5a6a7a', border: '#1c2333' },
];

const SAMPLE_TEXT = `¿Cuántos han desmeritado tu experiencia e infravalorado tus logros? ¿Se habrán detenido siquiera a pensar en lo que representa tu esencia y la luz que evocas?

—¡Querido! No me están buscando, porque ya tienen, ¿por qué me irían a llamar? Lo preguntó ella con la carga de la resignación que llevaba aquel día puesta.

—Lástima que no puedas ver cuántos hoy entregarían todo para que estuvieras en sus días —y sí, hablaba en verdad de muchos, pero especialmente de él.

—¿Qué hago con usted señor poeta? —dijo aquella dama que seguía corriendo.

—¿Cómo le hago? Si me hace feliz el que te guste... Si hasta atrevido soy al mencionar... aquello del honor de saber que me deseas —dijo el poeta corriendo al lado.

—¿Acaso es tan difícil lograr que puedas amar de nuevo? —le dijo en susurros, así frotando su aliento cálido sobre su piel.

—No me gusta cuando te vas —dijo la dama.

—A mí me revive el verte llegar cada mañana —dijo el poeta.

—Casi en todos, en los que me dejo llevar —dijo la dama con los ojos más brillantes que las lunas de Júpiter.

El poeta entonces miró a sus ojos, y voló como ya era costumbre: encontró en ellos galaxias que ningún astrónomo había cartografiado, constelaciones que latían al ritmo de algo que no era simplemente sangre sino historia, promesa, el eco de palabras que aún no se habían pronunciado.

La dama se detuvo al fin. Respiró profundo. Y dijo algo que el poeta tardó años en comprender: que el amor no es un lugar al que se llega, sino una manera de caminar.`;

const DEMO_BOOKS = [
  { id: 'demo_1', title: 'El Poeta y su Reloj de Arena', author: 'Anónimo',               emoji: '🏛️', grad: ['#3b2a1a','#7c5020'], fileType: 'demo', totalPages: 1 },
  { id: 'demo_2', title: 'Cien Años de Soledad',         author: 'Gabriel García Márquez',emoji: '🌊', grad: ['#0f2a3b','#1a5a6e'], fileType: 'demo', totalPages: 1 },
  { id: 'demo_3', title: 'Ficciones',                    author: 'Jorge Luis Borges',     emoji: '⚡', grad: ['#1e1a3b','#3d1a6e'], fileType: 'demo', totalPages: 1 },
  { id: 'demo_4', title: 'La Vorágine',                  author: 'José Eustasio Rivera',  emoji: '🌿', grad: ['#0f2a1e','#1a6e3d'], fileType: 'demo', totalPages: 1 },
];

// ─── DARK PALETTE ─────────────────────────────────────────────────────────────
const D = {
  bg: '#0d0b08', surface: '#110e0a', card: '#1e1a14',
  border: '#2a2318', border2: '#3a3025',
  text: '#c9b99a', muted: '#5a4d3c', muted2: '#7a6a55',
  gold: '#c8860a', sienna: '#8b4513',
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [view, setView]                   = useState('library');

  // ── Library + persistence ────────────────────────────────────────────────────
  const {
    books, loading: libLoading, settings,
    addBookFromFile, addDemoBook, removeBook, updateBook,
    loadProgress, persistProgress,
    loadAnnotations, persistAnnotation,
    loadBookmarks, createBookmark, removeBookmark,
    updateSetting,
  } = useLibrary();

  // ── PDF Worker ────────────────────────────────────────────────────────────────
  const { workerReady, loadPdf, renderPage, prefetch, clearCache } = usePdfWorker();

  // ── Active book state ─────────────────────────────────────────────────────────
  const [activeBook,    setActiveBook]    = useState(null);
  const [file,          setFile]          = useState(null);
  const [fileType,      setFileType]      = useState(null);
  const [pdfDoc,        setPdfDoc]        = useState(null); // fallback for non-worker
  const [currentPage,   setCurrentPage]   = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [bookmarksList, setBookmarksList] = useState([]);
  const [readProgress,  setReadProgress]  = useState(0);

  // ── Canvas / Drawing ─────────────────────────────────────────────────────────
  const bgCanvasRef   = useRef(null);
  const drawCanvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const drawingsRef   = useRef({});   // { page → dataURL }
  const historyRef    = useRef({});
  const isDrawingRef  = useRef(false);
  const startPosRef   = useRef({ x: 0, y: 0 });
  const lastPosRef    = useRef({ x: 0, y: 0 });

  // ── Tools ─────────────────────────────────────────────────────────────────────
  const [activeTool,  setActiveTool]  = useState('pan');
  const [activeColor, setActiveColor] = useState('#F59E0B');
  const [brushSize,   setBrushSize]   = useState(4);
  const [textInput,   setTextInput]   = useState(null);
  const [zoom,        setZoom]        = useState(100);

  // ── UI ────────────────────────────────────────────────────────────────────────
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [storageOpen,   setStorageOpen]   = useState(false);
  const [isDragging,    setIsDragging]    = useState(false);
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [processMsg,    setProcessMsg]    = useState('');

  // ── OCR / Reader ──────────────────────────────────────────────────────────────
  const [extractedText, setExtractedText] = useState('');
  const [docTitle,      setDocTitle]      = useState('');
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [isExtracting,  setIsExtracting]  = useState(false);
  const [ocrProgress,   setOcrProgress]   = useState(0);

  // ── Reader appearance (from persisted settings) ──────────────────────────────
  const [darkMode,       setDarkModeState] = useState(true);
  const [readerFont,     setReaderFontState]     = useState(FONT_OPTIONS[0].value);
  const [readerFontSize, setReaderFontSizeState] = useState(17);
  const [readerTheme,    setReaderThemeState]    = useState(PAGE_THEMES[0]);

  // Virtual page (within Book Mode text pagination)
  const [vPage,       setVPage]       = useState(0);
  const [totalVPages, setTotalVPages] = useState(1);

  // ── Search ───────────────────────────────────────────────────────────────────
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchSegments, setSearchSegments] = useState(null);
  const [searchMatchInfo,setSearchMatchInfo]= useState({ current: 0, total: 0 });
  const activeMatchRef = useRef(null);

  // ── Dictionary ────────────────────────────────────────────────────────────────
  const [dictOpen, setDictOpen] = useState(false);
  const [dictWord, setDictWord] = useState('');

  // ── Persisted setting setters ────────────────────────────────────────────────
  const setDarkMode       = (v) => { setDarkModeState(v);       updateSetting('darkMode', v); };
  const setReaderFont     = (v) => { setReaderFontState(v);     updateSetting('readerFont', v); };
  const setReaderFontSize = (v) => { setReaderFontSizeState(v); updateSetting('readerFontSize', v); };
  const setReaderTheme    = (v) => { setReaderThemeState(v);    updateSetting('readerThemeName', v.label); };

  // ── Apply loaded settings ────────────────────────────────────────────────────
  useEffect(() => {
    if (settings.darkMode       !== undefined) setDarkModeState(settings.darkMode);
    if (settings.readerFont)                   setReaderFontState(settings.readerFont);
    if (settings.readerFontSize)               setReaderFontSizeState(+settings.readerFontSize);
    if (settings.readerThemeName) {
      const t = PAGE_THEMES.find(x => x.label === settings.readerThemeName);
      if (t) setReaderThemeState(t);
    }
  }, [settings]);

  // ── Load CDN scripts ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const cdns = [
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.21/mammoth.browser.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
      ];
      for (const src of cdns) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = src; s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      setScriptsLoaded(true);
    })().catch(console.error);
  }, []);

  // ── Inject global styles ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement('style');
    el.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; height: 100%; background: #0d0b08; overflow: hidden; }
      #root { height: 100%; }
      .no-sb::-webkit-scrollbar { display: none; }
      .no-sb { -ms-overflow-style: none; scrollbar-width: none; }
      input[type=range] { accent-color: #c8860a; cursor: pointer; width: 100%; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .spin { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(el);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && showTextPanel) {
        e.preventDefault(); setSearchOpen(true); setDictOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && showTextPanel) {
        e.preventDefault(); setDictOpen(o => !o); setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTextPanel]);

  // ─── History ──────────────────────────────────────────────────────────────────
  const saveHistory = useCallback(() => {
    if (!drawCanvasRef.current) return;
    const state = drawCanvasRef.current.toDataURL('image/png');
    if (!historyRef.current[currentPage]) historyRef.current[currentPage] = [];
    historyRef.current[currentPage].push(state);
    drawingsRef.current[currentPage] = state;
  }, [currentPage]);

  const undo = () => {
    const hist = historyRef.current[currentPage];
    if (!hist?.length) return;
    hist.pop();
    const prev = hist[hist.length - 1] ?? null;
    drawingsRef.current[currentPage] = prev;
    const ctx = drawCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    if (prev) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = prev; }
  };

  const saveDrawing = useCallback(async () => {
    if (!drawCanvasRef.current || !activeBook) return;
    const imageData = drawCanvasRef.current.toDataURL('image/png');
    drawingsRef.current[currentPage] = imageData;
    await persistAnnotation(activeBook.id, currentPage, imageData);
  }, [currentPage, activeBook, persistAnnotation]);

  const restoreDrawing = useCallback((pageNum) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (drawingsRef.current[pageNum]) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = drawingsRef.current[pageNum];
    } else { saveHistory(); }
  }, [saveHistory]);

  // ─── Open a book ──────────────────────────────────────────────────────────────
  const openBook = useCallback(async (book) => {
    setActiveBook(book);
    setCurrentPage(1);
    setVPage(0);
    setZoom(100);
    setExtractedText('');
    setShowTextPanel(false);
    setSearchOpen(false);
    setDictOpen(false);
    setSearchSegments(null);
    drawingsRef.current = {};
    historyRef.current  = {};

    // Load persisted annotations
    const ann = await loadAnnotations(book.id);
    drawingsRef.current = ann;

    // Load persisted bookmarks
    const bms = await loadBookmarks(book.id);
    setBookmarksList(bms);

    // Load progress
    const prog = await loadProgress(book.id);
    if (prog) {
      setCurrentPage(prog.page || 1);
      setReadProgress(prog.percent || 0);
    } else {
      setReadProgress(book.progress || 0);
    }

    setView('reader');
  }, [loadAnnotations, loadBookmarks, loadProgress]);

  // ─── File processing ──────────────────────────────────────────────────────────
  const processFile = async (f) => {
    if (!f) return;
    setIsProcessing(true);
    setProcessMsg('Procesando documento...');
    setDocTitle(f.name?.replace(/\.[^.]+$/, '') ?? '');

    try {
      // Save to library first
      const book = await addBookFromFile(f);

      if (f.type === 'application/pdf') {
        setFileType('pdf');
        // Try worker first, fallback to main thread
        const ab = book.fileData || (await f.arrayBuffer());
        if (workerReady) {
          setProcessMsg('Cargando PDF en worker...');
          try {
            const pages = await loadPdf(ab.slice(0), book.id);
            await updateBook(book.id, { totalPages: pages });
            setTotalPages(pages);
            setFile(book);
            await openBook({ ...book, totalPages: pages });
            return;
          } catch { /* fall through to main thread */ }
        }
        // Main-thread fallback
        setProcessMsg('Renderizando PDF...');
        const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        await updateBook(book.id, { totalPages: pdf.numPages });
        setFile(book);
        await openBook({ ...book, totalPages: pdf.numPages });
      } else if (f.type.startsWith('image/')) {
        setFileType('image');
        const url = URL.createObjectURL(f);
        setFile(url);
        setTotalPages(1);
        await openBook(book);
        await renderImage(url);
      } else {
        // Word doc
        setFileType('word');
        setProcessMsg('Convirtiendo Word...');
        const ab = book.fileData || (await f.arrayBuffer());
        const { value } = await window.mammoth.convertToHtml({ arrayBuffer: ab });
        const div = document.createElement('div');
        div.innerHTML = value;
        Object.assign(div.style, { width:'900px', padding:'60px', background:'white', position:'absolute', left:'-9999px', top:'0', color:'black', fontFamily:'sans-serif', lineHeight:'1.6', fontSize:'18px' });
        document.body.appendChild(div);
        const canvas = await window.html2canvas(div, { scale: 3 });
        document.body.removeChild(div);
        const url = canvas.toDataURL('image/png');
        setFile(url);
        setTotalPages(1);
        await openBook(book);
        await renderImage(url);
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar el archivo: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e) => processFile(e.target.files[0]);
  const handleDragOver   = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave  = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop       = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const loadDemo = useCallback(async () => {
    const book = await addDemoBook(DEMO_BOOKS[0]);
    setExtractedText(SAMPLE_TEXT);
    setShowTextPanel(true);
    await openBook(book);
  }, [addDemoBook, openBook]);

  // ─── Canvas rendering ─────────────────────────────────────────────────────────
  const syncTemp = () => {
    if (bgCanvasRef.current && tempCanvasRef.current) {
      tempCanvasRef.current.width  = bgCanvasRef.current.width;
      tempCanvasRef.current.height = bgCanvasRef.current.height;
    }
  };

  const renderImage = (url) => new Promise(resolve => {
    if (!url || url === 'sample') return resolve();
    const img = new Image();
    img.onload = () => {
      const bg = bgCanvasRef.current, dw = drawCanvasRef.current;
      const baseW = 1000;
      let w = img.width, h = img.height;
      if (w > baseW) { h = (h * baseW) / w; w = baseW; }
      bg.width = w * RENDER_SCALE; bg.height = h * RENDER_SCALE;
      dw.width = w * RENDER_SCALE; dw.height = h * RENDER_SCALE;
      syncTemp();
      const ctx = bg.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, bg.width, bg.height);
      ctx.drawImage(img, 0, 0, bg.width, bg.height);
      restoreDrawing(1); resolve();
    };
    img.src = url;
  });

  // ─── PDF page rendering (uses worker bitmap or fallback) ──────────────────────
  const renderPdfPageCanvas = useCallback(async (pageNum) => {
    const bg = bgCanvasRef.current, dw = drawCanvasRef.current;
    if (!bg || !dw) return;
    setIsProcessing(true); setProcessMsg(`Cargando página ${pageNum}...`);
    try {
      if (workerReady && activeBook?.id) {
        // Worker path — get ImageBitmap
        try {
          const { bitmap, width, height } = await renderPage(pageNum, RENDER_SCALE, activeBook.id);
          bg.width = width; bg.height = height;
          dw.width = width; dw.height = height;
          syncTemp();
          const ctx = bg.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
          ctx.drawImage(bitmap, 0, 0);
          restoreDrawing(pageNum);
          // Prefetch neighbours
          const neighbours = [];
          if (pageNum > 1)           neighbours.push(pageNum - 1);
          if (pageNum < totalPages)  neighbours.push(pageNum + 1);
          if (neighbours.length)     prefetch(neighbours, RENDER_SCALE, activeBook.id);
          return;
        } catch { /* fall through */ }
      }
      // Main-thread fallback
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(pageNum);
      const vp   = page.getViewport({ scale: RENDER_SCALE });
      bg.width = vp.width; bg.height = vp.height;
      dw.width = vp.width; dw.height = vp.height;
      syncTemp();
      const ctx = bg.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, vp.width, vp.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      restoreDrawing(pageNum);
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  }, [pdfDoc, workerReady, activeBook, renderPage, prefetch, restoreDrawing, totalPages]);

  useEffect(() => {
    if (fileType === 'pdf' && (pdfDoc || (workerReady && activeBook))) {
      renderPdfPageCanvas(currentPage);
    }
  }, [currentPage, pdfDoc, fileType, workerReady]);

  // ─── Persist progress whenever page changes ───────────────────────────────────
  useEffect(() => {
    if (!activeBook) return;
    const pct = totalPages > 1 ? Math.round((currentPage / totalPages) * 100) : readProgress;
    persistProgress(activeBook.id, currentPage, pct).catch(console.warn);
  }, [currentPage, activeBook, totalPages]);

  // ─── Drawing ──────────────────────────────────────────────────────────────────
  const getPos = (e) => {
    const c = drawCanvasRef.current;
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy, cw: c.width, ch: c.height };
  };

  const paintShape = (ctx, x1, y1, x2, y2) => {
    ctx.beginPath();
    if      (activeTool === 'rectangle') { ctx.rect(x1, y1, x2-x1, y2-y1); }
    else if (activeTool === 'circle')    { const rx=(x2-x1)/2, ry=(y2-y1)/2; ctx.ellipse(x1+rx,y1+ry,Math.abs(rx),Math.abs(ry),0,0,Math.PI*2); }
    else if (activeTool === 'line')      { ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); }
    ctx.stroke();
  };

  const onStart = (e) => {
    if (activeTool === 'pan') return;
    if (e.cancelable && activeTool !== 'text') e.preventDefault();
    const pos = getPos(e);
    if (activeTool === 'text') { setTextInput({ px:(pos.x/pos.cw)*100, py:(pos.y/pos.ch)*100, cx:pos.x, cy:pos.y }); return; }
    isDrawingRef.current = true;
    startPosRef.current = lastPosRef.current = pos;
  };

  const onMove = (e) => {
    if (activeTool==='pan'||!isDrawingRef.current||activeTool==='text') return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    if (['pen','highlighter','eraser'].includes(activeTool)) {
      const ctx = drawCanvasRef.current.getContext('2d');
      ctx.beginPath(); ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y); ctx.lineTo(pos.x, pos.y);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 40*RENDER_SCALE; ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (activeTool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply'; ctx.lineWidth = 18*RENDER_SCALE;
        const h=activeColor.replace('#',''); ctx.strokeStyle=`rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},0.35)`;
      } else {
        ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = brushSize*RENDER_SCALE; ctx.strokeStyle = activeColor;
      }
      ctx.stroke(); lastPosRef.current = pos;
    } else {
      const tc=tempCanvasRef.current, ctx=tc.getContext('2d');
      ctx.clearRect(0,0,tc.width,tc.height); ctx.globalCompositeOperation='source-over';
      ctx.lineWidth=brushSize*RENDER_SCALE; ctx.strokeStyle=activeColor; ctx.lineCap='round'; ctx.lineJoin='round';
      paintShape(ctx,startPosRef.current.x,startPosRef.current.y,pos.x,pos.y);
    }
  };

  const onEnd = (e) => {
    if (activeTool==='pan'||!isDrawingRef.current) return;
    if (!['pen','highlighter','eraser','text'].includes(activeTool)) {
      const dc=drawCanvasRef.current, tc=tempCanvasRef.current, ctx=dc.getContext('2d');
      ctx.globalCompositeOperation='source-over'; ctx.lineWidth=brushSize*RENDER_SCALE; ctx.strokeStyle=activeColor; ctx.lineCap='round'; ctx.lineJoin='round';
      let fp=lastPosRef.current;
      if (e?.changedTouches?.[0]) fp=getPos({clientX:e.changedTouches[0].clientX,clientY:e.changedTouches[0].clientY});
      else if (e?.clientX) fp=getPos(e);
      paintShape(ctx,startPosRef.current.x,startPosRef.current.y,fp.x,fp.y);
      tc.getContext('2d').clearRect(0,0,tc.width,tc.height);
    }
    isDrawingRef.current=false; saveHistory(); saveDrawing();
  };

  const commitText = (text) => {
    if (text.trim() && textInput) {
      const ctx = drawCanvasRef.current.getContext('2d');
      ctx.globalCompositeOperation='source-over'; ctx.font=`bold ${16*RENDER_SCALE}px 'EB Garamond',serif`; ctx.fillStyle=activeColor;
      ctx.fillText(text, textInput.cx, textInput.cy+14*RENDER_SCALE);
      saveHistory(); saveDrawing();
    }
    setTextInput(null);
  };

  const clearPage = () => {
    if (!confirm('¿Borrar todas las anotaciones de esta página?')) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    ctx.clearRect(0,0,drawCanvasRef.current.width,drawCanvasRef.current.height);
    saveHistory(); saveDrawing();
  };

  const changePage = (offset) => {
    const np = currentPage + offset;
    if (np < 1 || np > totalPages) return;
    saveDrawing();
    setCurrentPage(np);
  };

  // ─── Bookmarks ────────────────────────────────────────────────────────────────
  const handleAddBookmark = useCallback(async (page, note = '') => {
    if (!activeBook) return;
    const bm = await createBookmark(activeBook.id, page, note);
    setBookmarksList(prev => [...prev, bm].sort((a,b)=>a.page-b.page));
  }, [activeBook, createBookmark]);

  const handleRemoveBookmark = useCallback(async (id) => {
    await removeBookmark(id);
    setBookmarksList(prev => prev.filter(b => b.id !== id));
  }, [removeBookmark]);

  // ─── OCR ──────────────────────────────────────────────────────────────────────
  const extractText = async () => {
    if (!bgCanvasRef.current) return;
    setIsExtracting(true); setShowTextPanel(true); setOcrProgress(0);
    setExtractedText('Preparando motor OCR...');
    try {
      const tc = document.createElement('canvas');
      const sf = 1/RENDER_SCALE;
      tc.width = bgCanvasRef.current.width*sf; tc.height = bgCanvasRef.current.height*sf;
      const ctx = tc.getContext('2d');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,tc.width,tc.height);
      ctx.drawImage(bgCanvasRef.current,0,0,tc.width,tc.height);
      const worker = await window.Tesseract.createWorker({
        logger: m => {
          if (m.status==='recognizing text') { setOcrProgress(Math.round(m.progress*100)); setExtractedText(`Reconociendo texto... ${Math.round(m.progress*100)}%`); }
          else if (m.status==='loading language traineddata') setExtractedText('Descargando diccionario español...');
          else if (m.status==='initializing api')              setExtractedText('Iniciando motor OCR...');
          else if (m.status==='loading tesseract core')        setExtractedText('Cargando inteligencia artificial...');
        },
      });
      await worker.loadLanguage('spa'); await worker.initialize('spa');
      const { data: { text } } = await worker.recognize(tc.toDataURL('image/jpeg',0.85));
      setExtractedText(text.trim()||'No se detectó texto en esta página.');
      await worker.terminate();
    } catch (err) {
      console.error(err); setExtractedText('Error al extraer texto. Verifica tu conexión.');
    } finally { setIsExtracting(false); }
  };

  const copyText = async () => {
    try { await navigator.clipboard.writeText(extractedText); }
    catch { const t=document.createElement('textarea'); t.value=extractedText; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    alert('¡Texto copiado!');
  };

  // ─── Search ───────────────────────────────────────────────────────────────────
  const handleSearchMatch = (current, total, segments) => {
    setSearchMatchInfo({ current, total });
    setSearchSegments(segments);
    setTimeout(()=>activeMatchRef.current?.scrollIntoView({behavior:'smooth',block:'center'}),80);
  };

  // ─── Dictionary ───────────────────────────────────────────────────────────────
  const handleTextDoubleClick = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.split(/\s+/).length <= 3) {
      setDictWord(sel.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]/g,'').trim());
      setDictOpen(true);
    }
  };

  // ─── Export ───────────────────────────────────────────────────────────────────
  const getPageImage = async (pageNum) => {
    const tc=document.createElement('canvas'), ctx=tc.getContext('2d');
    let wo, ho;
    if (fileType==='pdf') {
      const page=await pdfDoc.getPage(pageNum);
      const vpO=page.getViewport({scale:1}), vpH=page.getViewport({scale:RENDER_SCALE});
      tc.width=vpH.width; tc.height=vpH.height; wo=vpO.width; ho=vpO.height;
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,tc.width,tc.height);
      await page.render({canvasContext:ctx,viewport:vpH}).promise;
    } else {
      tc.width=bgCanvasRef.current.width; tc.height=bgCanvasRef.current.height;
      wo=tc.width/RENDER_SCALE; ho=tc.height/RENDER_SCALE;
      ctx.drawImage(bgCanvasRef.current,0,0);
    }
    if (drawingsRef.current[pageNum]) {
      await new Promise(r=>{const img=new Image();img.onload=()=>{ctx.drawImage(img,0,0);r();};img.src=drawingsRef.current[pageNum];});
    }
    return { url: tc.toDataURL('image/jpeg',0.95), wo, ho };
  };

  const exportPDF = async () => {
    saveDrawing(); setIsProcessing(true); setProcessMsg('Generando PDF...');
    try {
      const { jsPDF }=window.jspdf; let pdf=null;
      const pages=fileType==='pdf'?totalPages:1;
      for (let i=1;i<=pages;i++) {
        setProcessMsg(`Exportando página ${i}/${pages}...`);
        const {url,wo,ho}=await getPageImage(i);
        if (!pdf) pdf=new jsPDF({orientation:wo>ho?'landscape':'portrait',unit:'px',format:[wo,ho]});
        else pdf.addPage([wo,ho],wo>ho?'landscape':'portrait');
        pdf.addImage(url,'JPEG',0,0,wo,ho);
      }
      pdf.save(`${docTitle||activeBook?.title||'leonidas'}_anotado.pdf`);
    } catch(err){console.error(err);alert('Error al exportar: '+err.message);}
    finally{setIsProcessing(false);}
  };

  // ─── Loading screen ───────────────────────────────────────────────────────────
  if (!scriptsLoaded || libLoading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:D.bg,fontFamily:"'Jost',sans-serif"}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>📖</div>
        <Loader2 size={32} style={{color:D.gold,display:'block',margin:'0 auto 12px',animation:'spin 1s linear infinite'}}/>
        <p style={{color:D.muted,fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase'}}>
          {libLoading ? 'Cargando biblioteca...' : 'Iniciando Leonidas...'}
        </p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // LIBRARY VIEW
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'library') {
    const libBg      = darkMode ? D.bg      : '#f0ebe2';
    const libSurface = darkMode ? D.surface : '#faf7f2';
    const libBorder  = darkMode ? D.border  : '#e0d9ce';
    const libText    = darkMode ? D.text    : '#2b2018';
    const libMuted   = darkMode ? D.muted   : '#7a6a55';

    // Find most recently read book
    const recentBook = [...books].sort((a,b)=>(b.lastRead||0)-(a.lastRead||0))[0];

    return (
      <div style={{minHeight:'100vh',background:libBg,fontFamily:"'Jost',sans-serif",overflowY:'auto'}}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

        <header style={{background:libSurface,borderBottom:`1px solid ${libBorder}`,padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:20}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,background:'linear-gradient(135deg,#8b4513,#c8860a)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>📖</div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:libText,letterSpacing:'0.03em'}}>LEONIDAS</div>
              <div style={{fontSize:9,color:libMuted,letterSpacing:'0.18em',textTransform:'uppercase'}}>Biblioteca Personal</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button onClick={()=>setStorageOpen(true)} title="Almacenamiento" style={{background:'none',border:`1px solid ${libBorder}`,color:libMuted,padding:'7px 10px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center'}}>
              <HardDrive size={15}/>
            </button>
            <button onClick={()=>setDarkMode(!darkMode)} style={{background:'none',border:`1px solid ${libBorder}`,color:libMuted,padding:'7px 10px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center'}}>
              {darkMode?<Sun size={15}/>:<Moon size={15}/>}
            </button>
            <label style={{cursor:'pointer',background:D.gold,color:'#0d0b08',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:6}}>
              <Plus size={14}/> Agregar libro
              <input type="file" accept=".pdf,.docx,.doc,image/*" style={{display:'none'}} onChange={handleFileUpload}/>
            </label>
          </div>
        </header>

        <main style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px'}}>

          {/* Hero: continuar leyendo */}
          {recentBook && (
            <div style={{marginBottom:40}}>
              <div style={{fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:libMuted,marginBottom:14}}>
                {recentBook.id.startsWith('demo') ? 'Prueba la app' : 'Continuar leyendo'}
              </div>
              <div style={{background:libSurface,border:`1px solid ${libBorder}`,borderRadius:14,padding:'24px 28px',display:'flex',alignItems:'center',gap:24,cursor:'pointer'}}
                onClick={()=>recentBook.id.startsWith('demo') ? loadDemo() : openBook(recentBook)}>
                <div style={{width:68,height:96,background:`linear-gradient(160deg,${(recentBook.grad||['#3b2a1a','#7c5020'])[0]},${(recentBook.grad||['#3b2a1a','#7c5020'])[1]})`,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:34,flexShrink:0,boxShadow:'3px 3px 14px rgba(0,0,0,0.5)'}}>
                  {recentBook.emoji||'📄'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:libText,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{recentBook.title}</div>
                  <div style={{fontSize:12,color:libMuted,marginBottom:14}}>{recentBook.author||'Sin autor'} · {recentBook.totalPages||1} pág.</div>
                  <div style={{height:3,background:libBorder,borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',width:(recentBook.progress||0)+'%',background:'linear-gradient(90deg,#8b4513,#c8860a)',borderRadius:2}}/>
                  </div>
                  <div style={{fontSize:11,color:libMuted,marginTop:5}}>{recentBook.progress||0}% completado</div>
                </div>
                <div style={{background:D.gold,color:'#0d0b08',padding:'10px 22px',borderRadius:8,fontSize:13,fontWeight:500,flexShrink:0,display:'flex',alignItems:'center',gap:6}}>
                  <BookOpen size={14}/> Continuar
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          <div style={{fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:libMuted,marginBottom:14}}>Tu biblioteca</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:20}}>

            {/* Demo books (if library is empty, show them) */}
            {books.filter(b=>!b.id.startsWith('demo')).length===0 && DEMO_BOOKS.map(book=>(
              <div key={book.id} onClick={loadDemo} style={{cursor:'pointer'}}>
                <div style={{height:216,background:`linear-gradient(160deg,${book.grad[0]},${book.grad[1]})`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,marginBottom:10,boxShadow:'3px 3px 18px rgba(0,0,0,0.6)',position:'relative'}}>
                  {book.emoji}
                  <div style={{position:'absolute',bottom:8,left:10,right:10}}>
                    <div style={{height:2,background:'rgba(255,255,255,0.12)',borderRadius:1}}>
                      <div style={{height:'100%',width:'0%',background:'rgba(200,134,10,0.8)',borderRadius:1}}/>
                    </div>
                  </div>
                  <div style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.4)',borderRadius:4,padding:'2px 6px',fontSize:8,color:'rgba(255,255,255,0.7)',letterSpacing:'0.1em',textTransform:'uppercase'}}>Demo</div>
                </div>
                <div style={{fontSize:12,color:libText,fontWeight:500,lineHeight:1.35,marginBottom:2}}>{book.title}</div>
                <div style={{fontSize:11,color:libMuted}}>{book.author}</div>
              </div>
            ))}

            {/* Real library books */}
            {books.filter(b=>!b.id.startsWith('demo')).map(book=>(
              <div key={book.id} onClick={()=>openBook(book)} style={{cursor:'pointer'}}>
                <div style={{height:216,background:`linear-gradient(160deg,${(book.grad||['#2a2318','#3a3025'])[0]},${(book.grad||['#2a2318','#3a3025'])[1]})`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,marginBottom:10,boxShadow:'3px 3px 18px rgba(0,0,0,0.6)',position:'relative'}}>
                  {book.emoji||'📄'}
                  <div style={{position:'absolute',bottom:8,left:10,right:10}}>
                    <div style={{height:2,background:'rgba(255,255,255,0.12)',borderRadius:1}}>
                      <div style={{height:'100%',width:(book.progress||0)+'%',background:'rgba(200,134,10,0.8)',borderRadius:1}}/>
                    </div>
                  </div>
                </div>
                <div style={{fontSize:12,color:libText,fontWeight:500,lineHeight:1.35,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{book.title}</div>
                <div style={{fontSize:11,color:libMuted}}>{book.author||'Sin autor'}</div>
              </div>
            ))}

            {/* Upload card */}
            <label style={{cursor:'pointer',display:'block'}}>
              <div style={{height:216,background:libSurface,border:`1px dashed ${libBorder}`,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,marginBottom:10}}>
                <Plus size={22} color={libMuted}/><span style={{fontSize:11,color:libMuted}}>Agregar libro</span>
              </div>
              <input type="file" accept=".pdf,.docx,.doc,image/*" style={{display:'none'}} onChange={handleFileUpload}/>
            </label>
          </div>
        </main>

        {/* Storage modal */}
        {storageOpen && (
          <StorageInfo
            books={books.filter(b=>!b.id.startsWith('demo'))}
            onDeleteBook={async(id)=>{await removeBook(id);}}
            onClose={()=>setStorageOpen(false)}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // READER VIEW
  // ═══════════════════════════════════════════════════════════════════
  const rt = readerTheme;
  const hasCanvas = file && file !== 'sample' && typeof file !== 'object';

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',background:D.bg,fontFamily:"'Jost',sans-serif"}}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

      {/* ── TOP BAR ───────────────────────────────────────────────────────────── */}
      <header style={{height:52,background:D.surface,borderBottom:`1px solid ${D.border}`,display:'flex',alignItems:'center',padding:'0 16px',gap:10,flexShrink:0,position:'relative',zIndex:40}}>
        <button onClick={()=>{ saveDrawing(); setView('library'); clearCache(); }}
          style={{background:'none',border:`1px solid ${D.border}`,color:D.muted2,padding:'5px 10px',borderRadius:7,cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:12}}>
          <ArrowLeft size={14}/> <span>Biblioteca</span>
        </button>
        <div style={{width:1,height:20,background:D.border}}/>
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:'none',border:'none',color:D.muted,cursor:'pointer',padding:6,borderRadius:5,display:'flex',alignItems:'center'}}>
          <Menu size={17}/>
        </button>
        <div style={{flex:1,fontFamily:"'Playfair Display',serif",fontSize:13,color:D.muted,fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {activeBook?.title ?? docTitle ?? 'Sin título'}
        </div>

        {/* Progress pill */}
        <div style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:20,padding:'4px 12px',fontSize:11,color:D.muted,whiteSpace:'nowrap'}}>
          <span style={{color:D.gold,fontWeight:500}}>{readProgress}%</span> completado
        </div>
        <div style={{width:1,height:20,background:D.border}}/>

        {/* Icons */}
        {[
          { icon:<Bookmark size={14}/>, title:'Marcar página', fn:()=>handleAddBookmark(currentPage) },
          { icon: darkMode?<Sun size={14}/>:<Moon size={14}/>, title:'Tema UI', fn:()=>setDarkMode(!darkMode) },
          { icon:<Settings size={14}/>, title:'Ajustes', fn:()=>setSettingsOpen(o=>!o) },
        ].map((btn,i)=>(
          <button key={i} onClick={btn.fn} title={btn.title}
            style={{background:'none',border:'none',color:D.muted,cursor:'pointer',padding:6,borderRadius:5,display:'flex',alignItems:'center'}}>
            {btn.icon}
          </button>
        ))}

        {/* Search + Dict (only in reader mode) */}
        {showTextPanel && (<>
          <div style={{width:1,height:20,background:D.border}}/>
          <button onClick={()=>{setSearchOpen(o=>!o);setDictOpen(false);}} title="Buscar (Ctrl+F)"
            style={{background:searchOpen?D.border2:'none',border:'none',color:searchOpen?D.gold:D.muted,cursor:'pointer',padding:6,borderRadius:5,display:'flex',alignItems:'center'}}>
            <Search size={14}/>
          </button>
          {searchMatchInfo.total>0 && (
            <span style={{fontSize:10,color:D.gold,background:'rgba(200,134,10,0.15)',border:'1px solid rgba(200,134,10,0.3)',borderRadius:20,padding:'2px 8px'}}>
              {searchMatchInfo.current}/{searchMatchInfo.total}
            </span>
          )}
          <button onClick={()=>{setDictOpen(o=>!o);setSearchOpen(false);}} title="Diccionario (Ctrl+D)"
            style={{background:dictOpen?D.border2:'none',border:'none',color:dictOpen?D.gold:D.muted,cursor:'pointer',padding:6,borderRadius:5,display:'flex',alignItems:'center'}}>
            <BookMarked size={14}/>
          </button>
        </>)}

        {/* Settings panel */}
        {settingsOpen && (
          <div style={{position:'absolute',top:56,right:12,width:240,background:D.surface,border:`1px solid ${D.border}`,borderRadius:10,padding:16,zIndex:60,boxShadow:'0 8px 36px rgba(0,0,0,0.7)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:D.muted,marginBottom:8}}>Fuente</div>
            <div style={{display:'flex',gap:4,marginBottom:14}}>
              {FONT_OPTIONS.map(f=>(
                <button key={f.value} onClick={()=>setReaderFont(f.value)}
                  style={{flex:1,padding:'6px 4px',background:readerFont===f.value?D.border2:D.card,border:`1px solid ${D.border}`,borderRadius:5,color:readerFont===f.value?D.gold:D.muted2,fontSize:10,cursor:'pointer'}}>
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:D.muted,marginBottom:6}}>Tamaño: {readerFontSize}px</div>
            <input type="range" min="14" max="24" value={readerFontSize} onChange={e=>setReaderFontSize(+e.target.value)} style={{marginBottom:14}}/>
            <div style={{fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:D.muted,marginBottom:6}}>Grosor del trazo: {brushSize}</div>
            <input type="range" min="1" max="12" value={brushSize} onChange={e=>setBrushSize(+e.target.value)} style={{marginBottom:14}}/>
            <div style={{fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:D.muted,marginBottom:8}}>Tema de página</div>
            <div style={{display:'flex',gap:8}}>
              {PAGE_THEMES.map(t=>(
                <div key={t.label} onClick={()=>setReaderTheme(t)} title={t.label}
                  style={{width:28,height:28,borderRadius:'50%',background:t.bg,cursor:'pointer',border:`2px solid ${readerTheme.label===t.label?D.gold:D.border}`}}/>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── ANNOTATION TOOLBAR ───────────────────────────────────────────────── */}
      {(file && file !== 'sample') && (
        <div style={{background:D.surface,borderBottom:`1px solid ${D.border}`,overflowX:'auto',flexShrink:0}} className="no-sb">
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',minWidth:'max-content'}}>
            {[
              {id:'pan',       icon:<Hand size={16}/>,        label:'Navegar'},
              {id:'pen',       icon:<PenTool size={16}/>,     label:'Bolígrafo'},
              {id:'highlighter',icon:<Highlighter size={16}/>,label:'Resaltador'},
              {id:'text',      icon:<Type size={16}/>,        label:'Texto'},
              {id:'rectangle', icon:<Square size={16}/>,      label:'Rectángulo'},
              {id:'circle',    icon:<Circle size={16}/>,      label:'Círculo'},
              {id:'eraser',    icon:<Eraser size={16}/>,      label:'Borrador'},
            ].map(t=>(
              <button key={t.id} onClick={()=>setActiveTool(t.id)} title={t.label}
                style={{background:activeTool===t.id?D.border2:'transparent',border:'none',color:activeTool===t.id?D.gold:D.muted,padding:'6px 8px',borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center',transition:'all .15s'}}>
                {t.icon}
              </button>
            ))}
            <div style={{width:1,height:18,background:D.border,margin:'0 4px'}}/>
            {!['eraser','pan'].includes(activeTool) && COLORS.map(c=>(
              <button key={c.hex} onClick={()=>setActiveColor(c.hex)} title={c.name}
                style={{width:18,height:18,borderRadius:'50%',background:c.hex,border:`2px solid ${activeColor===c.hex?D.gold:'transparent'}`,cursor:'pointer',flexShrink:0,transform:activeColor===c.hex?'scale(1.2)':'scale(1)',transition:'transform .15s'}}/>
            ))}
            <div style={{width:1,height:18,background:D.border,margin:'0 4px'}}/>
            <button onClick={undo} title="Deshacer" style={{background:'none',border:'none',color:D.muted,padding:6,borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center'}}><Undo2 size={15}/></button>
            <button onClick={clearPage} title="Limpiar" style={{background:'none',border:'none',color:D.muted,padding:6,borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center'}}><Trash2 size={15}/></button>
            <div style={{width:1,height:18,background:D.border,margin:'0 4px'}}/>
            <button onClick={extractText} disabled={isExtracting}
              style={{background:'#5b2fa0',color:'#fff',border:'none',padding:'6px 14px',borderRadius:8,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontWeight:500}}>
              {isExtracting?<Loader2 size={13} className="spin"/>:<ScanText size={13}/>} Modo Libro
            </button>
            <button onClick={exportPDF}
              style={{background:'transparent',border:`1px solid ${D.border}`,color:D.muted2,padding:'6px 12px',borderRadius:7,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
              <Download size={13}/> PDF
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main style={{flex:1,display:'flex',overflow:'hidden',position:'relative'}}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={{width:252,background:D.surface,borderRight:`1px solid ${D.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
            <div style={{padding:'14px 16px 8px',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:D.muted}}>Capítulos</div>
            <div style={{flex:1,overflowY:'auto',padding:'0 8px 8px'}} className="no-sb">
              {['Prólogo','I · La Dama que Corría','II · El Primer Encuentro','III · Lluvia de Silencios','IV · Cartas sin Destino','V · El Jardín Olvidado','VI · Constelaciones','VII · La Gran Espera','VIII · Ecos del Pasado','IX · El Poeta Errante','X · Noches de Arena','XI · La Decisión','XII · Umbrales','XIII · El Reloj de Arena','XIV · El Amanecer','Epílogo'].map((ch,i)=>(
                <div key={i} style={{padding:'7px 12px',borderRadius:6,cursor:'pointer',marginBottom:1,background:i===13?D.card:'transparent',borderLeft:i===13?`2px solid ${D.gold}`:'2px solid transparent'}}>
                  <div style={{fontSize:11,color:i===13?D.text:D.muted,lineHeight:1.4}}>{ch}</div>
                </div>
              ))}
            </div>
            {bookmarksList.length>0&&(
              <>
                <div style={{padding:'10px 16px 6px',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:D.muted,borderTop:`1px solid ${D.border}`}}>Marcadores guardados</div>
                <div style={{padding:'0 8px 8px',maxHeight:180,overflowY:'auto'}} className="no-sb">
                  {bookmarksList.map(bm=>(
                    <div key={bm.id} style={{padding:'6px 12px',background:D.card,borderRadius:6,marginBottom:3,fontSize:11,color:D.muted2,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}
                      onClick={()=>setCurrentPage(bm.page+1)}>
                      <Bookmark size={10}/> Pág. {bm.page+1}
                      {bm.note&&<span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:10}}> — {bm.note}</span>}
                      <button onClick={e=>{e.stopPropagation();handleRemoveBookmark(bm.id);}}
                        style={{background:'none',border:'none',color:D.muted,cursor:'pointer',padding:2,display:'flex'}}>
                        <X size={10}/>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{padding:10,borderTop:`1px solid ${D.border}`}}>
              <label style={{cursor:'pointer',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:D.card,border:`1px solid ${D.border}`,borderRadius:8,color:D.muted,fontSize:11}}>
                <Upload size={13}/> Abrir archivo
                <input type="file" accept=".pdf,.docx,.doc,image/*" style={{display:'none'}} onChange={handleFileUpload}/>
              </label>
            </div>
          </aside>
        )}

        {/* Canvas area */}
        <div style={{flex:1,overflowY:'auto',display:'flex',justifyContent:'center',padding:'28px 20px 80px',background:D.bg}} className="no-sb"
          onClick={()=>{if(settingsOpen)setSettingsOpen(false);}}>

          {!file && !isProcessing && (
            <div style={{margin:'auto',maxWidth:460,textAlign:'center',padding:48,background:D.surface,border:isDragging?`1px solid ${D.gold}`:`1px solid ${D.border}`,borderRadius:16}}>
              <div style={{fontSize:52,marginBottom:20}}>📖</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:D.text,marginBottom:10}}>Abre un documento</div>
              <p style={{fontSize:13,color:D.muted,lineHeight:1.7,marginBottom:28}}>
                Sube un <strong style={{color:D.muted2}}>PDF, Word o imagen</strong>. Tus anotaciones se guardan automáticamente.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'center'}}>
                <label style={{cursor:'pointer',background:D.gold,color:'#0d0b08',padding:'10px 28px',borderRadius:9,fontSize:14,fontWeight:500,display:'flex',alignItems:'center',gap:8}}>
                  <Upload size={15}/> Subir archivo
                  <input type="file" accept=".pdf,.docx,.doc,image/*" style={{display:'none'}} onChange={handleFileUpload}/>
                </label>
                <button onClick={loadDemo} style={{background:'transparent',border:`1px solid ${D.border}`,color:D.muted,padding:'10px 28px',borderRadius:9,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                  <ScanText size={15}/> Probar ejemplo
                </button>
              </div>
            </div>
          )}

          {(file && file!=='sample' && typeof file!=='object') && (
            <div style={{position:'relative',width:`${zoom}%`,maxWidth:900*(zoom/100),flexShrink:0,opacity:isProcessing?.5:1,cursor:activeTool==='pan'?'grab':'crosshair',touchAction:activeTool==='pan'?'auto':'none'}}>
              <canvas ref={bgCanvasRef}   style={{display:'block',width:'100%',height:'auto',pointerEvents:'none'}}/>
              <canvas ref={drawCanvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'auto',pointerEvents:'none'}}/>
              <canvas ref={tempCanvasRef}
                style={{position:'absolute',top:0,left:0,width:'100%',height:'auto',touchAction:activeTool==='pan'?'auto':'none',pointerEvents:activeTool==='pan'?'none':'auto'}}
                onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseOut={onEnd}
                onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}/>
              {textInput&&(
                <input autoFocus type="text" placeholder="Escribe y pulsa Enter..."
                  style={{position:'absolute',left:textInput.px+'%',top:textInput.py+'%',background:'rgba(13,11,8,0.9)',border:`1px solid ${D.gold}`,color:D.text,padding:'4px 10px',borderRadius:5,fontSize:14,fontFamily:"'EB Garamond',serif",outline:'none',zIndex:10}}
                  onKeyDown={e=>{if(e.key==='Enter')commitText(e.target.value);if(e.key==='Escape')setTextInput(null);}}
                  onBlur={e=>commitText(e.target.value)}/>
              )}
            </div>
          )}
        </div>

        {/* BOOK MODE PANEL */}
        {showTextPanel && (
          <div style={{width:'100%',maxWidth:660,height:'100%',display:'flex',flexDirection:'column',background:rt.bg,flexShrink:0,position:'relative',overflow:'hidden',boxShadow:'4px 0 24px rgba(0,0,0,0.7),-2px 0 10px rgba(0,0,0,0.5)'}}>

            {/* Search panel */}
            <SearchPanel
              text={extractedText}
              isOpen={searchOpen}
              onClose={()=>{setSearchOpen(false);setSearchSegments(null);setSearchMatchInfo({current:0,total:0});}}
              onMatchChange={handleSearchMatch}
            />

            {/* Dictionary panel */}
            <DictionaryPanel
              selectedWord={dictWord}
              isOpen={dictOpen}
              onClose={()=>setDictOpen(false)}
              readerTheme={rt}
            />

            {/* Reader header */}
            <div style={{padding:'14px 28px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${rt.border}`,flexShrink:0}}>
              <span style={{fontFamily:"'Jost',sans-serif",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:rt.muted,display:'flex',alignItems:'center',gap:6}}>
                <BookOpen size={11}/> Modo Lectura
              </span>
              {searchMatchInfo.total>0&&(
                <span style={{fontSize:10,color:'#8b4513',background:'rgba(139,69,19,0.1)',border:'1px solid rgba(139,69,19,0.3)',borderRadius:20,padding:'2px 8px'}}>
                  {searchMatchInfo.current}/{searchMatchInfo.total} coincidencias
                </span>
              )}
              <div style={{display:'flex',gap:4,marginLeft:'auto'}}>
                <button onClick={copyText} title="Copiar texto" style={{background:'none',border:'none',color:rt.muted,cursor:'pointer',padding:6,borderRadius:4,display:'flex'}}><Copy size={14}/></button>
                <button onClick={()=>{setShowTextPanel(false);setSearchOpen(false);setDictOpen(false);setSearchSegments(null);if(file==='sample')setFile(null);}} title="Cerrar" style={{background:'none',border:'none',color:rt.muted,cursor:'pointer',padding:6,borderRadius:4,display:'flex'}}><X size={14}/></button>
              </div>
            </div>

            {/* Chapter header */}
            {!isExtracting&&(
              <div style={{padding:'24px 52px 8px',textAlign:'center',flexShrink:0}}>
                <div style={{fontFamily:"'Jost',sans-serif",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:rt.muted,marginBottom:8}}>{docTitle||activeBook?.title||'Documento'}</div>
                <div style={{display:'flex',alignItems:'center',gap:12,margin:'12px 0 0'}}>
                  <div style={{flex:1,height:1,background:rt.border}}/>
                  <div style={{width:5,height:5,background:'#8b4513',transform:'rotate(45deg)'}}/>
                  <div style={{flex:1,height:1,background:rt.border}}/>
                </div>
              </div>
            )}

            {/* Text body — uses BookPage component for pagination */}
            <div style={{flex:1,overflow:'hidden',position:'relative'}}>
              {isExtracting?(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:18,textAlign:'center',padding:24}}>
                  <Loader2 size={38} style={{color:'#8b4513',animation:'spin 1s linear infinite'}}/>
                  <div>
                    <p style={{fontFamily:"'EB Garamond',serif",fontSize:17,color:rt.text,marginBottom:10}}>{extractedText}</p>
                    <div style={{width:200,height:3,background:rt.border,borderRadius:2,overflow:'hidden',margin:'0 auto'}}>
                      <div style={{height:'100%',width:ocrProgress+'%',background:'#8b4513',borderRadius:2,transition:'width .3s'}}/>
                    </div>
                    <p style={{fontSize:11,color:rt.muted,marginTop:8}}>{ocrProgress}%</p>
                  </div>
                </div>
              ):(
                <BookPage
                  text={extractedText}
                  readerFont={readerFont}
                  readerFontSize={readerFontSize}
                  readerTheme={rt}
                  searchSegments={searchSegments}
                  activeMatchRef={activeMatchRef}
                  bookmarks={bookmarksList}
                  bookId={activeBook?.id}
                  onAddBookmark={handleAddBookmark}
                  onRemoveBookmark={handleRemoveBookmark}
                  onDoubleClick={handleTextDoubleClick}
                  currentVPage={vPage}
                  onVPageChange={setVPage}
                  onTotalVPages={setTotalVPages}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM BAR ───────────────────────────────────────────────────────── */}
      {(file && file!=='sample') && (
        <footer style={{height:50,background:D.surface,borderTop:`1px solid ${D.border}`,display:'flex',alignItems:'center',padding:'0 14px',gap:10,flexShrink:0,zIndex:20}}>
          <button onClick={()=>changePage(-1)} disabled={currentPage===1}
            style={{background:D.card,border:`1px solid ${D.border}`,color:D.muted2,padding:'5px 11px',borderRadius:6,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4,opacity:currentPage===1?.4:1}}>
            <ChevronLeft size={13}/> Ant.
          </button>
          <div style={{display:'flex',alignItems:'center',gap:3,background:D.card,border:`1px solid ${D.border}`,borderRadius:6,padding:'4px 8px'}}>
            <button onClick={()=>setZoom(z=>Math.max(50,z-25))} style={{background:'none',border:'none',color:D.muted,cursor:'pointer',display:'flex'}}><Minus size={13}/></button>
            <span style={{fontSize:11,color:D.muted2,minWidth:30,textAlign:'center'}}>{zoom}%</span>
            <button onClick={()=>setZoom(z=>Math.min(300,z+25))} style={{background:'none',border:'none',color:D.muted,cursor:'pointer',display:'flex'}}><Plus size={13}/></button>
          </div>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:D.muted,whiteSpace:'nowrap'}}>{readProgress}%</span>
            <div style={{flex:1,height:3,background:D.border,borderRadius:2,cursor:'pointer',position:'relative'}}
              onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const p=Math.round((e.clientX-r.left)/r.width*100);setReadProgress(p);if(activeBook)persistProgress(activeBook.id,currentPage,p);}}>
              <div style={{height:'100%',width:readProgress+'%',background:`linear-gradient(90deg,#8b4513,${D.gold})`,borderRadius:2}}/>
            </div>
            {totalPages>1&&<span style={{fontSize:10,color:D.muted,whiteSpace:'nowrap'}}>p. {currentPage}/{totalPages}</span>}
          </div>
          <button onClick={()=>changePage(1)} disabled={currentPage===totalPages}
            style={{background:D.card,border:`1px solid ${D.border}`,color:D.muted2,padding:'5px 11px',borderRadius:6,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4,opacity:currentPage===totalPages?.4:1}}>
            Sig. <ChevronRight size={13}/>
          </button>
        </footer>
      )}

      {/* Processing overlay */}
      {isProcessing&&!isExtracting&&(
        <div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.72)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:D.surface,border:`1px solid ${D.border}`,borderRadius:14,padding:'28px 36px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
            <Loader2 size={34} style={{color:D.gold,animation:'spin 1s linear infinite'}}/>
            <p style={{color:D.text,fontSize:14}}>{processMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
