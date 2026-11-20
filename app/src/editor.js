// VICEFRAME editor: wires the sidebar controls to the cover renderer,
// owns the photo library (built-in samples plus the user's uploads), panel
// selection with drag-to-pan cropping, and one-click PNG export.

import { LAYOUTS, GRADES, renderCover, layoutPanelRects, pointInPanel, tracePanelPath } from './render.js';

const SAMPLE_PHOTOS = [
  { name: 'Surfer', src: 'samples/surfer.jpg' },
  { name: 'Singer', src: 'samples/singer.jpg' },
  { name: 'Racer', src: 'samples/racer.jpg' },
  { name: 'Lifeguard', src: 'samples/lifeguard.jpg' },
  { name: 'Detective', src: 'samples/detective.jpg' },
  { name: 'Speedboat', src: 'samples/speedboat.jpg' },
  { name: 'Bartender', src: 'samples/bartender.jpg' },
  { name: 'Courier', src: 'samples/courier.jpg' },
];

// The samples are a photorealistic photo set: eight new AI-generated
// characters, a different cast from the illustrated rounds — no photographs
// of real people.

const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350' },
  '1080x1920': { w: 1080, h: 1920, label: '1080 × 1920' },
  '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080' },
};

const SURPRISE_TITLES = [
  ['VICE CITY', 'Summer in the Sun'],
  ['NEON NIGHTS', 'Ocean Drive After Dark'],
  ['PALM HEAT', 'Where the Sun Never Sets'],
  ['SUNSET RUN', 'Top Down, Full Send'],
  ['VICE LIFE', 'Every Night Is a Poster'],
  ['NIGHT SHIFT', 'The City Never Sleeps'],
  ['GETAWAY', 'Top Down, Full Send'],
  ['WANTED', 'Five Stars and Counting'],
  ['OUTLAW RUN', 'Ride or Die in Vice City'],
];

/** One-click title presets: title, script subtitle, tagline, quote, grade
 *  and wanted stars in one tap. All quote and tagline wording is original. */
const PRESETS = [
  { id: 'vice-city', label: 'Vice City', title: 'VICE CITY', subtitle: 'Summer in the Sun', grade: 'sunset', wanted: false, tagline: 'ONE LAST SUMMER · NO WAY HOME', quote: 'SUNSET, SWEAT AND BAD DECISIONS', source: 'THE VICE HERALD' },
  { id: 'night-shift', label: 'Night Shift', title: 'NIGHT SHIFT', subtitle: 'The City Never Sleeps', grade: 'neon', wanted: true, tagline: 'NEON · RAIN · NO WITNESSES', quote: 'EVERY STREET HAS A STORY', source: 'PALM CITY POST' },
  { id: 'getaway', label: 'Getaway', title: 'GETAWAY', subtitle: 'Top Down, Full Send', grade: 'ocean', wanted: true, tagline: 'TOP DOWN · FULL SEND · NO BRAKES', quote: 'FULL THROTTLE FROM THE FIRST FRAME', source: 'SUNSET TRIBUNE' },
  { id: 'neon-nights', label: 'Neon Nights', title: 'NEON NIGHTS', subtitle: 'Ocean Drive After Dark', grade: 'neon', wanted: false, tagline: 'THE NIGHT BELONGS TO US', quote: 'THE CITY GLOWS AFTER DARK', source: 'THE NEON REVIEW' },
  { id: 'wanted', label: 'Wanted', title: 'WANTED', subtitle: 'Five Stars and Counting', grade: 'midnight', wanted: true, tagline: 'RUN FAST · SHINE BRIGHT · NEVER CAUGHT', quote: 'FIVE STARS AND STILL RUNNING', source: 'VICE CITY CHRONICLE' },
  { id: 'outlaw-run', label: 'Outlaw Run', title: 'OUTLAW RUN', subtitle: 'Ride or Die in Vice City', grade: 'sunset', wanted: false, tagline: 'RIDE HARD · DIE FREE · VICE CITY', quote: 'NO BRAKES, NO REGRETS, NO WAY BACK', source: 'OCEAN DRIVE DAILY' },
];

/** Default caption tag per built-in sample, in SAMPLE_PHOTOS order. */
const SAMPLE_CAPTIONS = [
  { mode: 'role', text: 'THE SURFER', show: true },
  { mode: 'role', text: 'THE SINGER', show: true },
  { mode: 'role', text: 'THE RACER', show: true },
  { mode: 'role', text: 'THE LIFEGUARD', show: true },
  { mode: 'role', text: 'THE DETECTIVE', show: true },
  { mode: 'role', text: 'THE CAPTAIN', show: true },
  { mode: 'role', text: 'THE BARTENDER', show: true },
  { mode: 'role', text: 'THE COURIER', show: true },
];

/** The caption a library photo carries when it lands in a panel. */
function defaultCaptionFor(libraryIndex) {
  const preset = SAMPLE_CAPTIONS[libraryIndex];
  return preset ? { ...preset } : { mode: 'role', text: 'THE STAR', show: true };
}

/** The editor's whole state: one object the renderer reads. */
const state = {
  layout: 'hero-strip',
  grade: 'sunset',
  effects: { vignette: true, grain: true, halftone: true },
  title: 'VICE CITY',
  subtitle: 'Summer in the Sun',
  titleSize: 100,
  titlePos: 'bottom',
  titleColor: '#ffffff',
  titleStyle: 'chrome',
  wanted: false,
  furniture: {
    on: true,
    quote: 'SUNSET, SWEAT AND BAD DECISIONS',
    source: 'THE VICE HERALD',
    vol: 'VOL. 01',
    tagline: 'ONE LAST SUMMER · NO WAY HOME',
    billing: 'VICEFRAME · A VICEFRAME ORIGINAL · STARRING YOU · MADE OFFLINE IN YOUR BROWSER · PRINTED IN VICE CITY',
  },
  look: { paint: 25, halftone: 15, grain: 20, glow: 20 },
  sizeId: '1920x1080',
  selectedPanel: 0,
  panels: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(() => ({ photo: null, zoom: 1, rot: 0, dx: 0, dy: 0, caption: { mode: 'role', text: '', show: false } })),
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

/** Refresh the Selected panel section from the current panel's crop and caption. */
function refreshPanelControls() {
  const panel = state.panels[state.selectedPanel];
  const photo = panel.photo;
  const name = photo ? (library.find((entry) => entry.image === photo)?.name || 'Photo') : 'Empty panel';
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} — ${name}`;
  $('zoomInput').value = Math.round(panel.zoom * 100);
  $('rotateInput').value = Math.round(panel.rot);
  const caption = panel.caption || { mode: 'role', text: '', show: false };
  $('captionText').value = caption.text || '';
  document.querySelectorAll('#captionModeBtns .seg-btn').forEach((el) => {
    const active = !caption.show ? el.dataset.cmode === 'off' : el.dataset.cmode === caption.mode;
    el.classList.toggle('is-active', active);
  });
  const presetSelect = $('captionPreset');
  const known = [...presetSelect.options].some((opt) => opt.value === caption.text);
  presetSelect.value = known && caption.text ? caption.text : 'custom';
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
  state.panels[panelIndex] = { photo: entry.image, ...defaultCrop(), caption: defaultCaptionFor(libraryIndex) };
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
  const caption = defaultCaptionFor(pickedPhoto);
  state.panels = state.panels.map(() => ({ photo: entry.image, ...defaultCrop(), caption: { ...caption } }));
  refreshPanelControls();
  render();
  const count = (LAYOUTS[state.layout] || LAYOUTS['hero-strip']).panelCount;
  for (let i = 0; i < count; i++) faceCenterPhoto(i, entry.image);
}

/** Apply a title preset: caption, tagline, quote, grade and wanted stars in one tap. */
function applyPreset(presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  state.grade = preset.grade;
  state.wanted = preset.wanted;
  state.furniture.tagline = preset.tagline;
  state.furniture.quote = preset.quote;
  state.furniture.source = preset.source;
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
  document.querySelectorAll('#titleStyleBtns .seg-btn').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.tstyle === state.titleStyle);
  });
  $('wantedChip').classList.toggle('is-on', !!state.wanted);
  $('furnitureChip').classList.toggle('is-on', !!state.furniture.on);
  $('quoteInput').value = state.furniture.quote;
  $('quoteSourceInput').value = state.furniture.source;
  $('taglineInput').value = state.furniture.tagline;
  $('volInput').value = state.furniture.vol;
  ['paint', 'halftone', 'grain', 'glow'].forEach((key) => {
    $(`${key}Slider`).value = state.look[key];
    $(`${key}Value`).textContent = state.look[key];
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
  $('furnitureChip').addEventListener('click', () => {
    state.furniture.on = !state.furniture.on;
    $('furnitureChip').classList.toggle('is-on', state.furniture.on);
    render();
  });
  $('quoteInput').addEventListener('input', (event) => {
    state.furniture.quote = event.target.value;
    render();
  });
  $('quoteSourceInput').addEventListener('input', (event) => {
    state.furniture.source = event.target.value;
    render();
  });
  $('taglineInput').addEventListener('input', (event) => {
    state.furniture.tagline = event.target.value;
    render();
  });
  $('volInput').addEventListener('input', (event) => {
    state.furniture.vol = event.target.value;
    render();
  });
  ['paint', 'halftone', 'grain', 'glow'].forEach((key) => {
    $(`${key}Slider`).addEventListener('input', (event) => {
      state.look[key] = Number(event.target.value);
      $(`${key}Value`).textContent = state.look[key];
      render();
    });
  });
  document.querySelectorAll('#titleStyleBtns .seg-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state.titleStyle = el.dataset.tstyle;
      document.querySelectorAll('#titleStyleBtns .seg-btn').forEach((b) => {
        b.classList.toggle('is-active', b === el);
      });
      render();
    });
  });
  document.querySelectorAll('#captionModeBtns .seg-btn').forEach((el) => {
    el.addEventListener('click', () => {
      const panel = state.panels[state.selectedPanel];
      const mode = el.dataset.cmode;
      if (mode === 'off') {
        panel.caption.show = false;
      } else {
        panel.caption.mode = mode;
        panel.caption.show = true;
      }
      refreshPanelControls();
      render();
    });
  });
  $('captionText').addEventListener('input', (event) => {
    const panel = state.panels[state.selectedPanel];
    panel.caption.text = event.target.value;
    render();
  });
  $('captionPreset').addEventListener('change', (event) => {
    if (event.target.value === 'custom') return;
    const panel = state.panels[state.selectedPanel];
    panel.caption.text = event.target.value;
    panel.caption.mode = 'role';
    panel.caption.show = true;
    refreshPanelControls();
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
  // Default cover: surfer hero, singer / racer / lifeguard in the strip.
  // The strip pans frame the faces, which sit near the top of those photos.
  // Panels 5–9 (detective, speedboat, bartender, courier, surfer again) wait
  // for the six-panel comic grid and the nine-panel Cover layout.
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 0];
  const defaultPans = [
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0.35 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0.18 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0.1 },
    { dx: 0, dy: 0 },
  ];
  state.panels = state.panels.map((panel, i) => ({
    ...panel,
    photo: library[order[i]] ? library[order[i]].image : null,
    dx: defaultPans[i].dx,
    dy: defaultPans[i].dy,
    caption: defaultCaptionFor(order[i]),
  }));
  rebuildThumbs();
  wireControls();
  syncControls();
  refreshPanelControls();
  render();
  // Re-render once the display fonts arrive so the lettering uses Anton and Pacifico.
  if (document.fonts && document.fonts.ready) {
    document.fonts.load('100px Anton').catch(() => {});
    document.fonts.load('100px Pacifico').catch(() => {});
    document.fonts.ready.then(() => render());
  }
}

// Automation hook for screenshots and testing: drive the editor from a script.
window.__viceframe = { state, render, selectPanel, assignPhotoToSelected, applyPreset, exportCoverPNG, library, PRESETS };

initEditor();
