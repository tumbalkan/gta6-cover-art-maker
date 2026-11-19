// VICEFRAME editor: wires the sidebar controls to the cover renderer,
// owns the photo library (built-in samples plus the user's uploads), panel
// selection with drag-to-pan cropping, and one-click PNG export.

import { LAYOUTS, GRADES, renderCover, layoutPanelRects } from './render.js';

const SAMPLE_PHOTOS = [
  { name: 'Neon Street', src: 'samples/neon.jpg' },
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Beach', src: 'samples/beach.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

// The samples are an illustrated character set: cel-shaded poster art, no photographs.

const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080' },
};

const SURPRISE_TITLES = [
  ['VICE CITY', 'SUMMER IN THE SUN'],
  ['NEON NIGHTS', 'OCEAN DRIVE AFTER DARK'],
  ['PALM HEAT', 'WHERE THE SUN NEVER SETS'],
  ['SUNSET RUN', 'TOP DOWN, FULL SEND'],
  ['VICE LIFE', 'EVERY NIGHT IS A POSTER'],
];

/** The editor's whole state: one object the renderer reads. */
const state = {
  layout: 'hero-strip',
  grade: 'sunset',
  effects: { vignette: true, grain: true, halftone: false },
  title: 'VICE CITY',
  subtitle: 'SUMMER IN THE SUN',
  titleSize: 100,
  titlePos: 'bottom',
  titleColor: '#ffffff',
  sizeId: '1920x1080',
  selectedPanel: 0,
  panels: [0, 1, 2, 3].map(() => ({ photo: null, zoom: 1, rot: 0, dx: 0, dy: 0 })),
};

/** Every photo the editor knows: built-in samples first, uploads appended. */
const library = [];

const $ = (id) => document.getElementById(id);
const previewCanvas = $('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
let currentRects = [];
let pickedPhoto = 0;
let drag = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

/** Fresh default crop for a panel. */
function defaultCrop() {
  return { zoom: 1, rot: 0, dx: 0, dy: 0 };
}

/** Draw the cover, then outline the selected panel on the preview only. */
function render() {
  const size = EXPORT_SIZES[state.sizeId];
  currentRects = renderCover(previewCanvas, state, size.w, size.h);
  const rect = currentRects[state.selectedPanel];
  if (rect) {
    previewCtx.save();
    previewCtx.strokeStyle = '#22d3ee';
    previewCtx.lineWidth = Math.max(3, size.w * 0.004);
    previewCtx.setLineDash([size.w * 0.012, size.w * 0.008]);
    previewCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    previewCtx.restore();
  }
}

/** Refresh the Selected panel section from the current panel's crop. */
function refreshPanelControls() {
  const panel = state.panels[state.selectedPanel];
  const photo = panel.photo;
  const name = photo ? (library.find((entry) => entry.image === photo)?.name || 'Photo') : 'Empty panel';
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} — ${name}`;
  $('zoomInput').value = Math.round(panel.zoom * 100);
  $('rotateInput').value = Math.round(panel.rot);
}

function selectPanel(index) {
  const count = (LAYOUTS[state.layout] || LAYOUTS['hero-strip']).panelCount;
  state.selectedPanel = Math.max(0, Math.min(index, count - 1));
  refreshPanelControls();
  render();
}

/** Put a library photo into the selected panel and reset its crop. */
function assignPhotoToSelected(libraryIndex) {
  const entry = library[libraryIndex];
  if (!entry) return;
  pickedPhoto = libraryIndex;
  state.panels[state.selectedPanel] = { photo: entry.image, ...defaultCrop() };
  document.querySelectorAll('.thumb').forEach((el, i) => {
    el.classList.toggle('is-picked', i === libraryIndex);
  });
  refreshPanelControls();
  render();
}

/** Fill every panel of the current layout with the picked photo. */
function fillAllPanels() {
  const entry = library[pickedPhoto];
  if (!entry) return;
  state.panels = state.panels.map(() => ({ photo: entry.image, ...defaultCrop() }));
  refreshPanelControls();
  render();
}

/** Rebuild the photo thumbnail strip from the library. */
function rebuildThumbs() {
  const strip = $('photoThumbs');
  strip.innerHTML = '';
  library.forEach((entry, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `thumb${i === pickedPhoto ? ' is-picked' : ''}`;
    button.title = entry.name;
    const img = document.createElement('img');
    img.src = entry.src;
    img.alt = entry.name;
    const label = document.createElement('span');
    label.className = 'thumb-name';
    label.textContent = entry.name;
    button.append(img, label);
    button.addEventListener('click', () => assignPhotoToSelected(i));
    strip.appendChild(button);
  });
}

/** Read uploaded files into the library, then drop the first into the selected panel. */
async function handleUpload(files) {
  const added = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const src = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    try {
      const image = await loadImage(src);
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Upload';
      library.push({ name, src, image });
      added.push(library.length - 1);
    } catch (err) {
      console.warn('Skipped an unreadable upload:', file.name);
    }
  }
  if (added.length > 0) {
    rebuildThumbs();
    assignPhotoToSelected(added[0]);
  }
}

/** Randomise layout, grade, photos and caption for a one-click fresh cover. */
function surpriseMe() {
  const layoutIds = Object.keys(LAYOUTS);
  const gradeIds = Object.keys(GRADES);
  state.layout = layoutIds[Math.floor(Math.random() * layoutIds.length)];
  state.grade = gradeIds[Math.floor(Math.random() * gradeIds.length)];
  const [title, subtitle] = SURPRISE_TITLES[Math.floor(Math.random() * SURPRISE_TITLES.length)];
  state.title = title;
  state.subtitle = subtitle;
  state.panels = state.panels.map(() => {
    const entry = library[Math.floor(Math.random() * library.length)];
    return { photo: entry ? entry.image : null, ...defaultCrop() };
  });
  syncControls();
  render();
}

/** Make every control show the current state (used after Surprise me). */
function syncControls() {
  document.querySelectorAll('#layoutBtns .layout-btn').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeBtns .grade-btn').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.grade === state.grade);
  });
  document.querySelectorAll('#effectChips .chip').forEach((el) => {
    el.classList.toggle('is-on', !!state.effects[el.dataset.effect]);
  });
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('titleSize').value = state.titleSize;
  document.querySelectorAll('#posBtns .seg-btn').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.pos === state.titlePos);
  });
  document.querySelectorAll('#colorBtns .color-btn').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.color === state.titleColor);
  });
  refreshPanelControls();
}

/** Export the cover at the chosen size as a PNG download. */
function exportCoverPNG() {
  const size = EXPORT_SIZES[state.sizeId];
  const offscreen = document.createElement('canvas');
  renderCover(offscreen, state, size.w, size.h);
  offscreen.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `viceframe-${size.w}x${size.h}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

/** Convert a pointer event on the preview into canvas coordinates. */
function canvasPoint(event) {
  const box = previewCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * previewCanvas.width,
    y: ((event.clientY - box.top) / box.height) * previewCanvas.height,
  };
}

/** Which panel, if any, holds a canvas point. */
function panelAt(point) {
  return currentRects.findIndex(
    (rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h,
  );
}

function wirePointer() {
  previewCanvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = panelAt(point);
    if (index < 0) return;
    selectPanel(index);
    const rect = currentRects[index];
    drag = { moved: false, lastX: point.x, lastY: point.y, rect };
    previewCanvas.setPointerCapture(event.pointerId);
  });
  previewCanvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    const dx = point.x - drag.lastX;
    const dy = point.y - drag.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    if (!drag.moved) return;
    const panel = state.panels[state.selectedPanel];
    panel.dx = Math.max(-0.5, Math.min(0.5, panel.dx + dx / drag.rect.w));
    panel.dy = Math.max(-0.5, Math.min(0.5, panel.dy + dy / drag.rect.h));
    drag.lastX = point.x;
    drag.lastY = point.y;
    render();
  });
  const endDrag = () => { drag = null; };
  previewCanvas.addEventListener('pointerup', endDrag);
  previewCanvas.addEventListener('pointercancel', endDrag);
}

function wireControls() {
  document.querySelectorAll('#layoutBtns .layout-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state.layout = el.dataset.layout;
      syncControls();
      selectPanel(0);
    });
  });
  document.querySelectorAll('#sizeBtns .seg-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state.sizeId = el.dataset.size;
      document.querySelectorAll('#sizeBtns .seg-btn').forEach((b) => {
        b.classList.toggle('is-active', b === el);
      });
      render();
    });
  });
  document.querySelectorAll('#gradeBtns .grade-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state.grade = el.dataset.grade;
      document.querySelectorAll('#gradeBtns .grade-btn').forEach((b) => {
        b.classList.toggle('is-active', b === el);
      });
      render();
    });
  });
  document.querySelectorAll('#effectChips .chip').forEach((el) => {
    el.addEventListener('click', () => {
      const key = el.dataset.effect;
      state.effects[key] = !state.effects[key];
      el.classList.toggle('is-on', state.effects[key]);
      render();
    });
  });
  $('titleInput').addEventListener('input', (event) => {
    state.title = event.target.value;
    render();
  });
  $('subtitleInput').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    render();
  });
  $('titleSize').addEventListener('input', (event) => {
    state.titleSize = Number(event.target.value);
    render();
  });
  document.querySelectorAll('#posBtns .seg-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state.titlePos = el.dataset.pos;
      document.querySelectorAll('#posBtns .seg-btn').forEach((b) => {
        b.classList.toggle('is-active', b === el);
      });
      render();
    });
  });
  document.querySelectorAll('#colorBtns .color-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state.titleColor = el.dataset.color;
      document.querySelectorAll('#colorBtns .color-btn').forEach((b) => {
        b.classList.toggle('is-active', b === el);
      });
      render();
    });
  });
  $('zoomInput').addEventListener('input', (event) => {
    state.panels[state.selectedPanel].zoom = Number(event.target.value) / 100;
    render();
  });
  $('rotateInput').addEventListener('input', (event) => {
    state.panels[state.selectedPanel].rot = Number(event.target.value);
    render();
  });
  $('resetCropBtn').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    Object.assign(panel, defaultCrop());
    refreshPanelControls();
    render();
  });
  $('uploadInput').addEventListener('change', (event) => {
    handleUpload(event.target.files);
    event.target.value = '';
  });
  $('fillAllBtn').addEventListener('click', fillAllPanels);
  $('surpriseBtn').addEventListener('click', surpriseMe);
  $('exportBtn').addEventListener('click', exportCoverPNG);
  wirePointer();
}

/** Boot: load the sample photos, seed the panels, wire the controls, render. */
async function initEditor() {
  for (const sample of SAMPLE_PHOTOS) {
    try {
      const image = await loadImage(sample.src);
      library.push({ name: sample.name, src: sample.src, image });
    } catch (err) {
      console.warn('Sample photo failed to load:', sample.src);
    }
  }
  // Default cover: neon street hero, boulevard / beach / pier in the strip.
  // The strip pans frame the faces, which sit near the top of those photos.
  const order = [0, 1, 2, 3];
  const defaultPans = [
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0.35 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0.18 },
  ];
  state.panels = state.panels.map((panel, i) => ({
    ...panel,
    photo: library[order[i]] ? library[order[i]].image : null,
    dx: defaultPans[i].dx,
    dy: defaultPans[i].dy,
  }));
  rebuildThumbs();
  wireControls();
  refreshPanelControls();
  render();
  // Re-render once the display font arrives so the lettering uses Anton.
  if (document.fonts && document.fonts.ready) {
    document.fonts.load('100px Anton').catch(() => {});
    document.fonts.ready.then(() => render());
  }
}

// Automation hook for screenshots and testing: drive the editor from a script.
window.__viceframe = { state, render, selectPanel, assignPhotoToSelected, exportCoverPNG, library };

initEditor();
