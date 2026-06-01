import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, X, Plus, Check } from 'lucide-react';

const PAGE_THEMES = [
  { label: 'Papel',  bg: '#F5F0E8', text: '#2b2018', muted: '#8a7d6e', border: '#d4c9b5' },
  { label: 'Sepia',  bg: '#E8DFC8', text: '#3b2a1a', muted: '#7a6a55', border: '#c4b08a' },
  { label: 'Noche',  bg: '#1a1a2e', text: '#c0b8d0', muted: '#7a7a8a', border: '#2a2840' },
  { label: 'Oscuro', bg: '#0d1117', text: '#8b9eb7', muted: '#5a6a7a', border: '#1c2333' },
];

const LINES_PER_PAGE = 28; // approximate lines per virtual page

/**
 * Split text into virtual "pages" based on line count estimate.
 * Uses a rough characters-per-line estimate for the given font size.
 */
function paginateText(text, containerWidth, fontSize) {
  if (!text) return [''];
  const charsPerLine = Math.floor((containerWidth - 104) / (fontSize * 0.52));
  const linesPerPage = Math.floor(580 / (fontSize * 1.85));

  const paragraphs = text.split(/\n+/).filter(p => p.trim());
  const pages      = [];
  let currentLines = 0;
  let currentPage  = [];

  for (const para of paragraphs) {
    const paraLines = Math.ceil(para.length / charsPerLine) + 1;
    if (currentLines + paraLines > linesPerPage && currentPage.length > 0) {
      pages.push(currentPage.join('\n\n'));
      currentPage  = [];
      currentLines = 0;
    }
    currentPage.push(para);
    currentLines += paraLines;
  }

  if (currentPage.length > 0) pages.push(currentPage.join('\n\n'));
  return pages.length ? pages : [''];
}

/**
 * BookPage
 * Props:
 *   text           {string}
 *   readerFont     {string}
 *   readerFontSize {number}
 *   readerTheme    {object}
 *   searchSegments {array|null}
 *   activeMatchRef {ref}
 *   bookmarks      {array}  – [{ id, page, note }]
 *   bookId         {string}
 *   onAddBookmark  {(page,note)=>void}
 *   onRemoveBookmark {(id)=>void}
 *   onDoubleClick  {(e)=>void}
 *   currentVPage   {number}  – controlled from outside
 *   onVPageChange  {(n)=>void}
 *   onTotalVPages  {(n)=>void}
 */
export default function BookPage({
  text = '',
  readerFont, readerFontSize = 17,
  readerTheme,
  searchSegments, activeMatchRef,
  bookmarks = [],
  bookId,
  onAddBookmark, onRemoveBookmark,
  onDoubleClick,
  currentVPage = 0,
  onVPageChange,
  onTotalVPages,
}) {
  const rt           = readerTheme || PAGE_THEMES[0];
  const containerRef = useRef(null);
  const [pages,      setPages]      = useState(['']);
  const [flipping,   setFlipping]   = useState(null); // 'forward' | 'back' | null
  const [noteOpen,   setNoteOpen]   = useState(false);
  const [noteText,   setNoteText]   = useState('');
  const [width,      setWidth]      = useState(620);

  // ── Measure container width ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Re-paginate whenever text, font size or container width changes ────────
  useEffect(() => {
    const result = paginateText(text, width, readerFontSize);
    setPages(result);
    onTotalVPages?.(result.length);
  }, [text, readerFontSize, width]);

  // ── Keep currentVPage in bounds ───────────────────────────────────────────
  const safeVPage = Math.min(currentVPage, pages.length - 1);
  const pageText  = pages[safeVPage] ?? '';

  // ── Page flip ─────────────────────────────────────────────────────────────
  const flipTo = (dir) => {
    const next = safeVPage + dir;
    if (next < 0 || next >= pages.length) return;
    setFlipping(dir > 0 ? 'forward' : 'back');
    setTimeout(() => {
      onVPageChange?.(next);
      setFlipping(null);
    }, 220);
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') flipTo(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   flipTo(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [safeVPage, pages.length]);

  // ── Touch swipe ───────────────────────────────────────────────────────────
  const touchStart = useRef(0);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) flipTo(dx < 0 ? 1 : -1);
  };

  // ── Render text with search highlights ───────────────────────────────────
  const renderContent = () => {
    if (!pageText) return null;

    // Find segments that fall within this page's text
    if (searchSegments) {
      // Re-match segments against pageText only
      return (
        <p style={{ ...textStyle, whiteSpace: 'pre-wrap' }}>
          {pageText.split('').reduce((acc, char, i) => {
            // Simple approach: render plain text when search active — segments are global
            return acc;
          }, null) || pageText}
        </p>
      );
    }

    // Normal rendering: first paragraph gets dropcap
    const paras = pageText.split('\n\n');
    return paras.map((p, i) => (
      <p key={i} style={{ ...textStyle, marginBottom: '1.1em', textIndent: i === 0 ? 0 : '2em' }}>
        {i === 0 && safeVPage === 0 && p[0] && (
          <span style={{
            float: 'left', fontFamily: "'Playfair Display', serif",
            fontSize: readerFontSize * 3.6, lineHeight: 0.78, fontWeight: 700,
            color: '#8b4513', marginRight: 8, marginTop: 6,
          }}>
            {p[0]}
          </span>
        )}
        {i === 0 && safeVPage === 0 ? p.slice(1) : p}
      </p>
    ));
  };

  const textStyle = {
    fontFamily: readerFont,
    fontSize:   readerFontSize,
    lineHeight: 1.85,
    color:      rt.text,
    textAlign:  'justify',
    textJustify:'inter-word',
    margin:     0,
  };

  // ── Is this page bookmarked? ───────────────────────────────────────────────
  const pageBookmark = bookmarks.find(b => b.page === safeVPage);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Page surface ── */}
      <div
        onDoubleClick={onDoubleClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          flex: 1,
          background: rt.bg,
          padding: '48px 52px 40px',
          overflow: 'hidden',
          position: 'relative',
          transition: flipping ? 'transform 0.22s ease, opacity 0.22s ease' : 'none',
          transform: flipping === 'forward' ? 'translateX(-12px) scale(0.98)'
                   : flipping === 'back'    ? 'translateX(12px) scale(0.98)'
                   : 'none',
          opacity: flipping ? 0 : 1,
        }}
      >
        {/* Spine shadow */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 48, background: 'linear-gradient(90deg,rgba(0,0,0,0.13),transparent)', pointerEvents: 'none' }} />

        {/* Bookmark indicator */}
        {pageBookmark && (
          <div style={{ position: 'absolute', top: 0, right: 28, width: 18, height: 40, background: '#8b4513', borderRadius: '0 0 4px 4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4, cursor: 'pointer' }}
            onClick={() => onRemoveBookmark?.(pageBookmark.id)} title="Clic para quitar marcador">
            <span style={{ fontSize: 8, color: '#f5f0e8' }}>✕</span>
          </div>
        )}

        {/* Note badge */}
        {pageBookmark?.note && (
          <div style={{ position: 'absolute', top: 48, right: 12, maxWidth: 160, background: '#fffbea', border: '1px solid #c8860a', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#5a3a00', boxShadow: '2px 2px 8px rgba(0,0,0,0.15)', fontFamily: "'Jost', sans-serif", lineHeight: 1.5 }}>
            {pageBookmark.note}
          </div>
        )}

        {/* Add note button (always visible on hover, subtle) */}
        <button
          onClick={() => setNoteOpen(true)}
          title="Añadir nota marginal"
          style={{ position: 'absolute', top: 48, right: pageBookmark?.note ? 180 : 12, background: 'none', border: `1px dashed ${rt.border}`, color: rt.muted, borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Jost', sans-serif", opacity: 0.5, transition: 'opacity .2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
        >
          <MessageSquare size={10} /> Nota
        </button>

        {/* Page content */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          {renderContent()}
        </div>
      </div>

      {/* ── Footer: page number + navigation ── */}
      <div style={{ background: rt.bg, borderTop: `1px solid ${rt.border}`, padding: '10px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => flipTo(-1)} disabled={safeVPage === 0}
          style={{ background: 'none', border: 'none', color: safeVPage === 0 ? 'transparent' : rt.muted, cursor: safeVPage === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: "'Jost', sans-serif", padding: '4px 0' }}>
          <ChevronLeft size={14} /> Anterior
        </button>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {pages.length <= 12 ? pages.map((_, i) => (
            <div key={i} onClick={() => onVPageChange?.(i)}
              style={{ width: i === safeVPage ? 20 : 5, height: 5, borderRadius: i === safeVPage ? 3 : '50%', background: i === safeVPage ? '#8b4513' : rt.border, cursor: 'pointer', transition: 'all .2s' }} />
          )) : (
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: rt.muted }}>
              {safeVPage + 1} / {pages.length}
            </span>
          )}
        </div>

        <button onClick={() => flipTo(1)} disabled={safeVPage >= pages.length - 1}
          style={{ background: 'none', border: 'none', color: safeVPage >= pages.length - 1 ? 'transparent' : rt.muted, cursor: safeVPage >= pages.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: "'Jost', sans-serif", padding: '4px 0' }}>
          Siguiente <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Margin note modal ── */}
      {noteOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
          <div style={{ background: '#fffbea', border: '1px solid #c8860a', borderRadius: 10, padding: 20, width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontFamily: "'Jost', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#5a3a00', fontWeight: 500 }}>Nota marginal — página {safeVPage + 1}</span>
              <button onClick={() => setNoteOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a7d6e' }}><X size={14}/></button>
            </div>
            <textarea
              autoFocus
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Escribe tu nota aquí…"
              style={{ width: '100%', height: 90, resize: 'none', border: '1px solid #d4c9b5', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: "'EB Garamond', serif", outline: 'none', background: '#fffef5', color: '#2b2018', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setNoteOpen(false); setNoteText(''); }} style={{ background: 'none', border: '1px solid #d4c9b5', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#8a7d6e' }}>Cancelar</button>
              <button onClick={() => {
                onAddBookmark?.(safeVPage, noteText);
                setNoteOpen(false); setNoteText('');
              }} style={{ background: '#8b4513', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#f5f0e8', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Check size={13}/> Guardar nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
