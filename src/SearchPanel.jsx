import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

// ─── dark palette (mirrors App.jsx) ──────────────────────────────────────────
const D = {
  bg:      '#0d0b08',
  surface: '#110e0a',
  card:    '#1e1a14',
  border:  '#2a2318',
  border2: '#3a3025',
  text:    '#c9b99a',
  muted:   '#5a4d3c',
  muted2:  '#7a6a55',
  gold:    '#c8860a',
  sienna:  '#8b4513',
};

/**
 * SearchPanel
 * Props:
 *   text        {string}   – full text content to search in
 *   isOpen      {boolean}
 *   onClose     {()=>void}
 *   onMatchChange {(index, total, segments) => void}
 *                          – called whenever match list changes or navigation moves;
 *                            parent uses `segments` to render highlighted text
 */
export default function SearchPanel({ text = '', isOpen, onClose, onMatchChange }) {
  const [query,       setQuery]       = useState('');
  const [matchIndex,  setMatchIndex]  = useState(0);
  const [matches,     setMatches]     = useState([]);   // array of { start, end }
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord,   setWholeWord]   = useState(false);
  const inputRef = useRef(null);

  // ── Focus input when panel opens ────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
    else { setQuery(''); setMatches([]); setMatchIndex(0); }
  }, [isOpen]);

  // ── Build match list whenever query / options / text change ─────────────────
  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setMatchIndex(0);
      onMatchChange?.(0, 0, null);
      return;
    }

    try {
      let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex
      if (wholeWord) pattern = `\\b${pattern}\\b`;
      const flags = caseSensitive ? 'g' : 'gi';
      const re    = new RegExp(pattern, flags);

      const found = [];
      let m;
      while ((m = re.exec(text)) !== null) {
        found.push({ start: m.index, end: m.index + m[0].length });
        if (found.length > 500) break; // safety cap
      }

      setMatches(found);
      const newIdx = found.length > 0 ? 0 : -1;
      setMatchIndex(newIdx >= 0 ? newIdx : 0);
      notifyParent(found, newIdx >= 0 ? newIdx : 0);
    } catch {
      // invalid regex while typing – ignore
    }
  }, [query, text, caseSensitive, wholeWord]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const go = useCallback((dir) => {
    if (!matches.length) return;
    const next = (matchIndex + dir + matches.length) % matches.length;
    setMatchIndex(next);
    notifyParent(matches, next);
  }, [matches, matchIndex]);

  const notifyParent = (found, idx) => {
    if (!onMatchChange) return;
    if (!found.length) { onMatchChange(0, 0, null); return; }
    // Build segment array for rendering highlighted text
    const segs = buildSegments(text, found, idx);
    onMatchChange(idx + 1, found.length, segs);
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key === 'Enter') { e.shiftKey ? go(-1) : go(1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, go, onClose]);

  if (!isOpen) return null;

  const hasResults = matches.length > 0;
  const noResults  = query.trim() && !hasResults;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
      background: D.surface,
      borderBottom: `1px solid ${D.border}`,
      padding: '10px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      fontFamily: "'Jost', sans-serif",
    }}>
      {/* ── Search row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={15} color={D.muted} style={{ flexShrink: 0 }} />

        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar en el texto…"
          style={{
            flex: 1, background: D.card, border: `1px solid ${noResults ? '#7f1d1d' : D.border}`,
            borderRadius: 6, padding: '6px 10px', fontSize: 13,
            color: D.text, outline: 'none', fontFamily: "'Jost', sans-serif",
          }}
        />

        {/* Match counter */}
        <span style={{ fontSize: 11, color: noResults ? '#ef4444' : D.muted2, whiteSpace: 'nowrap', minWidth: 52, textAlign: 'right' }}>
          {noResults ? 'Sin resultados' : hasResults ? `${matchIndex + 1} / ${matches.length}` : ''}
        </span>

        {/* Prev / Next */}
        <button onClick={() => go(-1)} disabled={!hasResults}
          style={{ background: 'none', border: 'none', color: hasResults ? D.muted2 : D.muted, cursor: hasResults ? 'pointer' : 'default', padding: 4, display: 'flex', borderRadius: 4 }}>
          <ChevronUp size={16} />
        </button>
        <button onClick={() => go(1)} disabled={!hasResults}
          style={{ background: 'none', border: 'none', color: hasResults ? D.muted2 : D.muted, cursor: hasResults ? 'pointer' : 'default', padding: 4, display: 'flex', borderRadius: 4 }}>
          <ChevronDown size={16} />
        </button>

        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: D.muted, cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}>
          <X size={15} />
        </button>
      </div>

      {/* ── Options row ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {[
          { label: 'Aa  Mayús.', active: caseSensitive, fn: () => setCaseSensitive(v => !v) },
          { label: '\\b  Palabra completa', active: wholeWord, fn: () => setWholeWord(v => !v) },
        ].map(opt => (
          <button key={opt.label} onClick={opt.fn}
            style={{
              background: opt.active ? D.border2 : 'transparent',
              border: `1px solid ${opt.active ? D.gold : D.border}`,
              color: opt.active ? D.gold : D.muted,
              borderRadius: 4, padding: '2px 8px', fontSize: 10,
              cursor: 'pointer', fontFamily: "'Jost', sans-serif",
              letterSpacing: '0.04em',
            }}>
            {opt.label}
          </button>
        ))}
        {hasResults && (
          <span style={{ fontSize: 10, color: D.muted, marginLeft: 'auto' }}>
            ↵ siguiente · ⇧↵ anterior · Esc cerrar
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Segment builder ──────────────────────────────────────────────────────────
// Returns array of { text, highlight: bool, active: bool }
export function buildSegments(text, matches, activeIdx) {
  if (!matches?.length) return [{ text, highlight: false, active: false }];
  const segs = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) segs.push({ text: text.slice(cursor, m.start), highlight: false, active: false });
    segs.push({ text: text.slice(m.start, m.end), highlight: true, active: i === activeIdx });
    cursor = m.end;
  });
  if (cursor < text.length) segs.push({ text: text.slice(cursor), highlight: false, active: false });
  return segs;
}
