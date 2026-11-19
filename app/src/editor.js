// VICEFRAME editor: wires the sidebar controls to the cover renderer,
// owns the photo library (built-in samples plus the user's uploads), panel
// selection with drag-to-pan cropping, and one-click PNG export.

import { LAYOUTS, GRADES, renderCover, layoutPanelRects, pointInPanel, tracePanelPath } from './render.js';

const SAMPLE_PHOTOS = [
  { name: 'Neon Street', src: 'samples/neon.jpg' },
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Beach', src: 'samples/beach.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
  { name: 'Heist Crew', src: 'samples/heist.jpg' },
  { name: 'Getaway', src: 'samples/chase.jpg' },
  { name: 'Nightclub', src: 'samples/club.jpg' },
  { name: 'Biker', src: 'samples/biker.jpg' },
];

// The samples are an illustrated character set: cel-shaded poster art, no photographs.

const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350' },
  '1080x1920': { w: 1080, h: 1920, label: '1080 × 1920' },
  '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080' },
};

const SURPRISE_TITLES = [
  ['VICE CITY', 'SUMMER IN THE SUN'],
  ['NEON NIGHTS', 'OCEAN DRIVE AFTER DARK'],
  ['PALM HEAT', 'WHERE THE SUN NEVER SETS'],
  ['SUNSET RUN', 'TOP DOWN, FULL SEND'],
  ['VICE LIFE', 'EVERY NIGHT IS A POSTER'],
  ['HEIST CREW', 'EVERY SCORE HAS A PRICE'],
  ['GETAWAY', 'TOP DOWN, FULL SEND'],
  ['WANTED', 'FIVE STARS AND COUNTING'],
  ['OUTLAW RUN', 'RIDE OR DIE IN VICE CITY'],
];

/** One-click title presets: title, subtitle, grade and wanted stars in one tap. */
const PRESETS = [
  { id: 'vice-city', label: 'Vice City', title: 'VICE CITY', subtitle: 'SUMMER IN THE SUN', grade: 'sunset', wanted: false },
  { id: 'heist-crew', label: 'Heist Crew', title: 'HEIST CREW', subtitle: 'EVERY SCORE HAS A PRICE', grade: 'heist', wanted: true },
  { id: 'getaway', label: 'Getaway', title: 'GETAWAY', subtitle: 'TOP DOWN, FULL SEND', grade: 'ocean', wanted: true },
  { id: 'neon-nights', label: 'Neon Nights', title: 'NEON NIGHTS', subtitle: 'OCEAN DRIVE AFTER DARK', grade: 'neon', wanted: false },
  { id: 'wanted', label: 'Wanted', title: 'WANTED', subtitle: 'FIVE STARS AND COUNTING', grade: 'midnight', wanted: true },
  { id: 'outlaw-run', label: 'Outlaw Run', title: 'OUTLAW RUN', subtitle: 'RIDE OR DIE IN VICE CITY', grade: 'sunset', wanted: false },
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
  wanted: false,
  sizeId: '1920x1080',
  selectedPanel: 0,
  panels: [0, 1, 2, 3, 4, 5].map(() => ({ photo: null, zoom: 1, rot: 0, dx: 0, dy: 0 })),
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

/** Detect the largest face in an image with the browser's FaceDetector API.
 *  Returns the face box in image pixels, or null when the API is missing
 *  (headless browsers, older browsers), the detector throws, or no face is
 *  found. Never throws and never logs: the caller falls back to a centre crop. */
let faceDetector = null;
let faceDetectorTried = false;
function detectFace(image) {
  if (faceDetectorTried && !faceDetector) return Promise.resolve(null);
  if (!faceDetector) {
    faceDetectorTried = true;
    try {
      if (typeof FaceDetector === 'undefined') return Promise.resolve(null);
      faceDetector = new FaceDetector({ fastMode: true });
    } catch (err) {
      return Promise.resolve(null);
    }
  }
  return faceDetector.detect(image).then((faces) => {
    if (!faces || faces.length === 0) return null;
    // Largest face wins: it is the subject.
    return faces.reduce((big, face) => {
      const box = face.boundingBox;
      const area = box.width * box.height;
      const bigBox = big.boundingBox;
      return area > bigBox.width * bigBox.height ? face : big;
    }).boundingBox;
  }).catch(() => null);
}

/** Pan a panel's crop so a detected face sits at the panel's centre. */
function centerFaceInPanel(panelIndex, image, faceBox) {
  const rect = currentRects[panelIndex];
  if (!rect || !image || !image.naturalWidth) return;
  const panel = state.panels[panelIndex];
  if (!panel || panel.photo !== image) return;
  const base = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const fx = (faceBox.x + faceBox.width / 2) / image.naturalWidth;
  const fy = (faceBox.y + faceBox.height / 2) / image.naturalHeight;
  // The renderer clamps the pan to the photo's real overflow, so the ideal
  // pan is safe to set even when the face sits near an edge.
  panel.dx = (0.5 - fx) * (dw / rect.w);
  panel.dy = (0.5 - fy) * (dh / rect.h);
  render();
}

/** After a photo lands in a panel, centre its face when one is detected. */
function faceCenterPhoto(panelIndex, image) {
  detectFace(image).then((faceBox) => {
    if (faceBox) centerFaceInPanel(panelIndex, image, faceBox);
  });
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
    tracePanelPath(previewCtx, rect);
    previewCtx.stroke();
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
  const panelIndex = state.selectedPanel;
  state.panels[panelIndex] = { photo: entry.image, ...defaultCrop() };
  document.querySelectorAll('.thumb').forEach((el, i) => {
    el.classList.toggle('is-picked', i === libraryIndex);
  });
  refreshPanelControls();
  render();
  faceCenterPhoto(panelIndex, entry.image);
}

/** Fill every panel of the current layout with the picked photo. */
function fillAllPanels() {
  const entry = library[pickedPhoto];
  if (!entry) return;
  state.panels = state.panels.map(() => ({ photo: entry.image, ...defaultCrop() }));
  refreshPanelControls();
  render();
  const count = (LAYOUTS[state.layout] || LAYOUTS['hero-strip']).panelCount;
  for (let i = 0; i < count; i++) faceCenterPhoto(i, entry.image);
}

/** Apply a title preset: caption, grade and wanted stars in one tap. */
function applyPreset(presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  state.grade = preset.grade;
  state.wanted = preset.wanted;
  syncControls();
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
  state.wanted = Math.random() < 0.3;
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
  $('wantedChip').classList.toggle('is-on', !!state.wanted);
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

/** Which panel, if any, holds a canvas point (polygon-aware for slanted panels). */
function panelAt(point) {
  return currentRects.findIndex((rect) => pointInPanel(point, rect));
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
  document.querySelectorAll('#presetBtns .preset-btn').forEach((el) => {
    el.addEventListener('click', () => applyPreset(el.dataset.preset));
  });
  $('wantedChip').addEventListener('click', () => {
    state.wanted = !state.wanted;
    $('wantedChip').classList.toggle('is-on', state.wanted);
    render();
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
  // Panels 5 and 6 (heist crew, getaway) wait for the six-panel comic grid.
  const order = [0, 1, 2, 3, 4, 5];
  const defaultPans = [
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0.35 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0.18 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
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
window.__viceframe = { state, render, selectPanel, assignPhotoToSelected, applyPreset, exportCoverPNG, library, PRESETS };

initEditor();
