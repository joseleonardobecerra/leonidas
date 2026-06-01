import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, X } from 'lucide-react';
import { getStorageInfo } from '../hooks/useDB.js';

const D = {
  surface: '#110e0a', card: '#1e1a14', border: '#2a2318',
  text: '#c9b99a', muted: '#5a4d3c', muted2: '#7a6a55',
  gold: '#c8860a', sienna: '#8b4513', red: '#ef4444',
};

export default function StorageInfo({ books, onDeleteBook, onClose }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getStorageInfo().then(setInfo).catch(() => {});
  }, [books]);

  const fmt = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const usedPct = info ? Math.min(100, Math.round((+info.usedMB / +info.totalMB) * 100)) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, fontFamily: "'Jost', sans-serif" }}>
      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, width: 'min(480px,95vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 16px 64px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <HardDrive size={16} color={D.gold} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: D.text }}>Almacenamiento local</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.muted, cursor: 'pointer', padding: 4 }}><X size={15}/></button>
        </div>

        {/* Storage bar */}
        {info && (
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: D.muted2 }}>Usado: {info.usedMB} MB</span>
              <span style={{ fontSize: 11, color: D.muted2 }}>Total: {info.totalMB} MB</span>
            </div>
            <div style={{ height: 6, background: D.card, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: usedPct + '%', background: usedPct > 80 ? D.red : `linear-gradient(90deg,${D.sienna},${D.gold})`, borderRadius: 3, transition: 'width .4s' }} />
            </div>
            <p style={{ fontSize: 10, color: D.muted, marginTop: 6 }}>
              Los archivos se guardan en tu navegador (IndexedDB). Limpiar caché del navegador los elimina.
            </p>
          </div>
        )}

        {/* Book list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {books.length === 0 ? (
            <p style={{ textAlign: 'center', color: D.muted, fontSize: 13, padding: 32 }}>No hay libros guardados.</p>
          ) : books.map(book => (
            <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 8, borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{book.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: D.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</div>
                <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>
                  {fmt(book.fileSize)} · {book.fileType?.toUpperCase()} · {book.totalPages || 1} pág.
                </div>
              </div>
              <button onClick={() => onDeleteBook?.(book.id)} title="Eliminar libro"
                style={{ background: 'none', border: `1px solid ${D.border}`, color: D.muted, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = D.red; e.currentTarget.style.color = D.red; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.muted; }}>
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
