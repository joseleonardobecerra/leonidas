import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, Loader2, Volume2, ExternalLink, AlertCircle } from 'lucide-react';

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
  red:     '#7f1d1d',
};

const POS_LABELS = {
  noun:        'sustantivo',
  verb:        'verbo',
  adjective:   'adjetivo',
  adverb:      'adverbio',
  pronoun:     'pronombre',
  preposition: 'preposición',
  conjunction: 'conjunción',
  interjection:'interjección',
  article:     'artículo',
  exclamation: 'exclamación',
};

const POS_COLORS = {
  noun:        '#3b82f6',
  verb:        '#10b981',
  adjective:   '#f59e0b',
  adverb:      '#8b5cf6',
  pronoun:     '#ec4899',
  preposition: '#6b7280',
  conjunction: '#6b7280',
  interjection:'#ef4444',
};

async function fetchDefinition(word) {
  // 1. Try Free Dictionary API (English/multilingual)
  // 2. For Spanish words → uses es language endpoint
  const cleanWord = word.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '');
  if (!cleanWord) throw new Error('Palabra inválida');

  // Try Spanish first
  const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(cleanWord)}`);
  if (resp.ok) {
    const data = await resp.json();
    return { source: 'es', data };
  }

  // Fallback to English
  const respEn = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
  if (respEn.ok) {
    const data = await respEn.json();
    return { source: 'en', data };
  }

  throw new Error('No encontrada');
}

function parseDictData(result) {
  const { source, data } = result;
  const entry = data[0];
  if (!entry) throw new Error('Sin datos');

  const word       = entry.word;
  const phonetic   = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
  const audioUrl   = entry.phonetics?.find(p => p.audio)?.audio || '';
  const origins    = entry.origin ? [entry.origin] : [];

  const meanings = (entry.meanings || []).map(m => ({
    pos: m.partOfSpeech,
    definitions: (m.definitions || []).slice(0, 4).map(d => ({
      def:      d.definition,
      example:  d.example,
      synonyms: (d.synonyms || []).slice(0, 5),
    })),
  }));

  return { word, phonetic, audioUrl, origins, meanings, source };
}

/**
 * DictionaryPanel
 * Props:
 *   selectedWord {string | null}  – word to look up (set by parent on double-click)
 *   isOpen       {boolean}
 *   onClose      {()=>void}
 *   readerTheme  { bg, text, border, muted }
 */
export default function DictionaryPanel({ selectedWord, isOpen, onClose, readerTheme }) {
  const [word,     setWord]     = useState('');
  const [inputVal, setInputVal] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');
  const inputRef  = useRef(null);
  const audioRef  = useRef(null);

  // ── Lookup when selectedWord changes ────────────────────────────────────────
  useEffect(() => {
    if (selectedWord && isOpen) {
      setInputVal(selectedWord);
      lookup(selectedWord);
    }
  }, [selectedWord, isOpen]);

  // ── Focus input on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  const lookup = async (w) => {
    const clean = (w || inputVal).trim();
    if (!clean) return;
    setWord(clean);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const raw = await fetchDefinition(clean);
      setResult(parseDictData(raw));
    } catch (e) {
      setError(`No se encontró definición para "${clean}". Intenta con otra forma de la palabra.`);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (result?.audioUrl) {
      if (audioRef.current) { audioRef.current.src = result.audioUrl; audioRef.current.play(); }
      else { new Audio(result.audioUrl).play(); }
    }
  };

  if (!isOpen) return null;

  const rt = readerTheme || { bg: '#F5F0E8', text: '#2b2018', border: '#d4c9b5', muted: '#8a7d6e' };
  const isLight = rt.bg !== '#0d0b08' && rt.bg !== '#1a1a2e';

  const panelBg     = isLight ? rt.bg     : D.surface;
  const panelBorder = isLight ? rt.border : D.border;
  const panelText   = isLight ? rt.text   : D.text;
  const panelMuted  = isLight ? rt.muted  : D.muted2;
  const inputBg     = isLight ? 'rgba(0,0,0,0.04)' : D.card;

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 'min(340px, 100%)',
      background: panelBg,
      borderLeft: `1px solid ${panelBorder}`,
      display: 'flex', flexDirection: 'column',
      zIndex: 40,
      fontFamily: "'Jost', sans-serif",
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${panelBorder}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <BookOpen size={15} color={D.sienna} />
        <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: panelMuted, flex: 1 }}>
          Diccionario
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: panelMuted, cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}>
          <X size={14} />
        </button>
      </div>

      {/* ── Search input ── */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${panelBorder}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={inputRef}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="Buscar palabra…"
            style={{
              flex: 1, background: inputBg,
              border: `1px solid ${panelBorder}`,
              borderRadius: 6, padding: '7px 10px',
              fontSize: 13, color: panelText, outline: 'none',
              fontFamily: "'Jost', sans-serif",
            }}
          />
          <button onClick={() => lookup()} disabled={loading}
            style={{
              background: D.sienna, border: 'none', color: '#f5f0e8',
              borderRadius: 6, padding: '0 14px', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Buscar'}
          </button>
        </div>
        <p style={{ fontSize: 10, color: panelMuted, marginTop: 6 }}>
          Doble clic sobre cualquier palabra para buscarla automáticamente
        </p>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="no-sb">

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 12 }}>
            <Loader2 size={28} style={{ color: D.sienna, animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 12, color: panelMuted }}>Buscando definición…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ background: isLight ? 'rgba(127,29,29,0.06)' : 'rgba(127,29,29,0.2)', border: `1px solid rgba(127,29,29,0.3)`, borderRadius: 8, padding: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: panelText, lineHeight: 1.5, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div>
            {/* Word + phonetic */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 26, fontWeight: 700,
                  color: panelText, margin: 0,
                }}>
                  {result.word}
                </h2>
                {result.audioUrl && (
                  <button onClick={playAudio} title="Escuchar pronunciación"
                    style={{ background: 'none', border: `1px solid ${panelBorder}`, color: panelMuted, borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Volume2 size={13} />
                  </button>
                )}
              </div>
              {result.phonetic && (
                <span style={{ fontSize: 13, color: D.sienna, fontFamily: "'EB Garamond', serif", fontStyle: 'italic' }}>
                  {result.phonetic}
                </span>
              )}
              {result.source === 'en' && (
                <span style={{ display: 'inline-block', marginLeft: 8, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: panelMuted, background: isLight ? 'rgba(0,0,0,0.06)' : D.card, padding: '2px 6px', borderRadius: 4 }}>
                  EN
                </span>
              )}
            </div>

            {/* Origin */}
            {result.origins?.length > 0 && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: isLight ? 'rgba(139,69,19,0.06)' : 'rgba(139,69,19,0.12)', borderRadius: 6, borderLeft: `2px solid ${D.sienna}` }}>
                <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.sienna, marginBottom: 4 }}>Etimología</p>
                <p style={{ fontSize: 12, color: panelText, lineHeight: 1.6, margin: 0, fontFamily: "'EB Garamond', serif" }}>{result.origins[0]}</p>
              </div>
            )}

            {/* Meanings */}
            {result.meanings.map((m, mi) => (
              <div key={mi} style={{ marginBottom: 18 }}>
                {/* POS badge */}
                <div style={{ marginBottom: 10 }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: 10, fontStyle: 'italic',
                    color: POS_COLORS[m.pos] || D.muted2,
                    borderBottom: `1px solid ${POS_COLORS[m.pos] || D.border}`,
                    paddingBottom: 2,
                  }}>
                    {POS_LABELS[m.pos] || m.pos}
                  </span>
                </div>

                {/* Definitions list */}
                <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {m.definitions.map((def, di) => (
                    <li key={di} style={{ marginBottom: 12, paddingLeft: 16, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: 2, fontSize: 10, color: D.sienna, fontWeight: 600 }}>
                        {di + 1}.
                      </span>
                      <p style={{ fontSize: 13, color: panelText, lineHeight: 1.65, margin: 0, fontFamily: "'EB Garamond', serif" }}>
                        {def.def}
                      </p>
                      {def.example && (
                        <p style={{ fontSize: 12, color: panelMuted, fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.5, fontFamily: "'EB Garamond', serif" }}>
                          "{def.example}"
                        </p>
                      )}
                      {def.synonyms?.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {def.synonyms.map(s => (
                            <button key={s} onClick={() => { setInputVal(s); lookup(s); }}
                              style={{
                                background: isLight ? 'rgba(139,69,19,0.08)' : D.card,
                                border: `1px solid ${isLight ? 'rgba(139,69,19,0.2)' : D.border}`,
                                color: D.sienna, borderRadius: 20,
                                padding: '2px 8px', fontSize: 10,
                                cursor: 'pointer', fontFamily: "'Jost', sans-serif",
                              }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}

            {/* External link */}
            <a href={`https://dle.rae.es/${encodeURIComponent(result.word)}`} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: D.sienna, textDecoration: 'none', marginTop: 4 }}>
              <ExternalLink size={11} /> Ver en la RAE
            </a>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !result && (
          <div style={{ textAlign: 'center', paddingTop: 40, color: panelMuted }}>
            <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
            <p style={{ fontSize: 13, fontFamily: "'EB Garamond', serif", fontStyle: 'italic', lineHeight: 1.6 }}>
              Escribe una palabra o haz doble clic sobre cualquier término en el texto para ver su definición.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
