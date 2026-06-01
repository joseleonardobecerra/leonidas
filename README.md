# 📖 LEONIDAS v3 — Biblioteca de Lectura Personal

> Lector tipo Kindle con persistencia local, OCR, anotaciones permanentes,  
> búsqueda, diccionario, PDF en Web Worker y paginación real con notas marginales.

[![Deploy](https://github.com/TU_USUARIO/leonidas/actions/workflows/deploy.yml/badge.svg)](https://github.com/TU_USUARIO/leonidas/actions)

---

## 🚀 Inicio rápido

```bash
git clone https://github.com/TU_USUARIO/leonidas.git
cd leonidas
npm install
npm run dev
# → http://localhost:5173/leonidas/
```

---

## 🌐 Deploy en GitHub Pages (automático)

```bash
# 1. Sube a GitHub
git init && git add . && git commit -m "🚀 LEONIDAS v3"
git remote add origin https://github.com/TU_USUARIO/leonidas.git
git push -u origin main

# 2. Activa GitHub Pages
# Settings → Pages → Source: GitHub Actions
# Cada git push despliega automáticamente
```

> URL final: `https://TU_USUARIO.github.io/leonidas/`  
> ⚠️ Si tu repo tiene otro nombre, cambia `base:` en `vite.config.js`

---

## ✨ Características v3

### 💾 Persistencia completa (IndexedDB)
| Qué se guarda | Dónde |
|---|---|
| Archivos completos (PDF, imagen, Word) | IndexedDB — `books` store |
| Progreso de lectura por libro | IndexedDB — `progress` store |
| Anotaciones dibujadas por página | IndexedDB — `annotations` store |
| Marcadores con notas | IndexedDB — `bookmarks` store |
| Preferencias (fuente, tema, modo oscuro) | IndexedDB — `settings` store |

- Todo persiste entre sesiones y recargas
- Indicador de almacenamiento usado (MB) en la biblioteca
- Gestión de libros desde panel de almacenamiento (eliminar individuales)

### ⚡ Rendimiento
- **PDF Web Worker** — renderizado en hilo separado usando `OffscreenCanvas`
  - Cero bloqueo del hilo principal durante el renderizado
  - Transferencia de `ImageBitmap` sin clonar datos (zero-copy)
  - Prefetch automático de páginas adyacentes
  - Fallback automático a hilo principal si el browser no soporta OffscreenCanvas
- **Caché de páginas** — páginas renderizadas guardadas en memoria, no se re-renderizan
- Lazy loading de la biblioteca desde IndexedDB

### 📖 Modo Libro mejorado
- **Paginación real** — el texto se divide en páginas virtuales según el tamaño de fuente y el ancho del contenedor
- **Animación de voltear página** — transición suave al pasar páginas
- **Notas marginales ancladas** — agrega notas a páginas específicas con icono visual
  - Las notas se guardan en IndexedDB ligadas a cada libro
- **Navegación** — botones, teclado (←→) y swipe táctil
- **Letra capital** en la primera página

### 🔍 Búsqueda dentro del texto
- Resaltado de todas las coincidencias en tiempo real
- Coincidencia activa en dorado sólido con scroll automático
- Opciones: mayúsculas/minúsculas, palabra completa
- Contador `3 / 17` · navegación con ↑↓ o Enter/Shift+Enter
- `Ctrl+F` para abrir · `Esc` para cerrar

### 📚 Diccionario integrado
- **Doble clic** sobre cualquier palabra para buscarla automáticamente
- API gratuita: español primero, inglés como fallback
- Muestra: definición, categoría gramatical, ejemplos, sinónimos, etimología, fonética + audio 🔊
- Sinónimos son clickeables (busca la siguiente palabra)
- Enlace directo a la RAE
- `Ctrl+D` para abrir/cerrar

### ✏️ Anotaciones
- Bolígrafo, resaltador, texto, rectángulo, círculo, borrador
- Historial de deshacer por página
- **Guardado automático** al terminar cada trazo (IndexedDB)
- Exportación PDF con anotaciones incrustadas en HD

### 🎨 Personalización
- 3 fuentes: Garamond, Palatino, Georgia
- Tamaño de fuente 14–24px (persiste entre sesiones)
- Grosor del trazo 1–12
- 4 temas de página: Papel · Sepia · Noche · Oscuro (persisten)
- Modo oscuro/claro de la interfaz (persiste)

---

## 🏗️ Arquitectura

```
leonidas/
├── .github/workflows/deploy.yml   ← Auto-deploy GitHub Pages
├── public/
│   ├── favicon.svg
│   └── manifest.json              ← PWA
├── src/
│   ├── App.jsx                    ← Orquestador principal (1100 líneas)
│   ├── SearchPanel.jsx            ← Búsqueda con highlight
│   ├── DictionaryPanel.jsx        ← Diccionario con API
│   ├── components/
│   │   ├── BookPage.jsx           ← Paginación real + notas marginales
│   │   └── StorageInfo.jsx        ← Panel de almacenamiento
│   ├── hooks/
│   │   ├── useDB.js               ← IndexedDB (CRUD completo)
│   │   ├── useLibrary.js          ← Estado de biblioteca + persistencia
│   │   └── usePdfWorker.js        ← Gestión del Web Worker
│   ├── workers/
│   │   └── pdf.worker.js          ← Web Worker: renderizado PDF
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🛠️ Stack tecnológico

| | Librería | Uso |
|---|---|---|
| UI | React 18 + Vite 5 | Framework + bundler |
| Estilos | Tailwind CSS 3 | Utilidades |
| Persistencia | **IndexedDB** (nativo) | Biblioteca, anotaciones, progreso |
| PDF | pdf.js 2.16 | Renderizado (Web Worker) |
| OCR | Tesseract.js 5 | Extracción de texto |
| Word | mammoth.js 1.4 | Lectura de .docx |
| Exportación | jsPDF 2.5 + html2canvas | PDF anotado |
| Diccionario | dictionaryapi.dev | Definiciones ES/EN |
| Íconos | Lucide React 0.383 | Iconografía |

---

## 📱 PWA — Instalar en móvil

1. Abre la app en Chrome/Safari
2. Menú → "Añadir a pantalla de inicio"
3. La app se instala como aplicación nativa

---

## 🗺️ Roadmap sugerido (próximas versiones)

- [ ] **v4 — Backend** · Supabase auth (Google/email) + sincronización multi-dispositivo
- [ ] **v5 — Nativo** · Capacitor (iOS/Android) o Tauri (escritorio)
- [ ] **v6 — Social** · Compartir anotaciones, colecciones públicas

---

## 📄 Licencia

MIT © 2025
