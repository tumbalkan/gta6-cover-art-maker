// VICEFRAME cover renderer: layouts, colour grades, effects and caption
// lettering, all drawn on a 2D canvas. Pure functions of the editor state —
// the same code draws the live preview and the exported PNG, so what you see
// is exactly what you share.

/** Panel layouts: each one maps the cover size to its panel rectangles. */
export const LAYOUTS = {
  'hero-strip': {
    label: 'Hero + strip',
    panelCount: 4,
    rects(w, h, gap) {
      const heroH = Math.round(h * 0.62) - gap;
      const stripY = Math.round(h * 0.62) + gap;
      const stripH = h - stripY;
      const third = Math.round(w / 3);
      return [
        { x: 0, y: 0, w, h: heroH },
        { x: 0, y: stripY, w: third - gap, h: stripH },
        { x: third + gap, y: stripY, w: third - gap * 2, h: stripH },
        { x: third * 2 + gap, y: stripY, w: w - third * 2 - gap, h: stripH },
      ];
    },
  },
  'poster-split': {
    label: 'Poster split',
    panelCount: 3,
    rects(w, h, gap) {
      const leftW = Math.round(w * 0.58) - gap;
      const rightX = Math.round(w * 0.58) + gap;
      const rightW = w - rightX;
      const half = Math.round(h / 2);
      return [
        { x: 0, y: 0, w: leftW, h },
        { x: rightX, y: 0, w: rightW, h: half - gap },
        { x: rightX, y: half + gap, w: rightW, h: h - half - gap },
      ];
    },
  },
  triptych: {
    label: 'Triptych',
    panelCount: 3,
    rects(w, h, gap) {
      const third = Math.round(w / 3);
      return [
        { x: 0, y: 0, w: third - gap, h },
        { x: third + gap, y: 0, w: third - gap * 2, h },
        { x: third * 2 + gap, y: 0, w: w - third * 2 - gap, h },
      ];
    },
  },
  quad: {
    label: 'Quad',
    panelCount: 4,
    rects(w, h, gap) {
      const halfW = Math.round(w / 2);
      const halfH = Math.round(h / 2);
      return [
        { x: 0, y: 0, w: halfW - gap, h: halfH - gap },
        { x: halfW + gap, y: 0, w: w - halfW - gap, h: halfH - gap },
        { x: 0, y: halfH + gap, w: halfW - gap, h: h - halfH - gap },
        { x: halfW + gap, y: halfH + gap, w: w - halfW - gap, h: h - halfH - gap },
      ];
    },
  },
};

/** Colour grades: a canvas filter for the photos plus a tinted overlay. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.28) contrast(1.08) sepia(0.18) brightness(1.02)',
    overlay: { from: '#ff7a18', to: '#ff2e63', composite: 'soft-light', alpha: 0.55 },
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.55) contrast(1.16) brightness(0.96) hue-rotate(12deg)',
    overlay: { from: '#ff2ea6', to: '#22d3ee', composite: 'overlay', alpha: 0.4 },
  },
  ocean: {
    label: 'Ocean Drive',
    filter: 'saturate(1.22) contrast(1.06) hue-rotate(-18deg)',
    overlay: { from: '#0ea5b7', to: '#1d4ed8', composite: 'soft-light', alpha: 0.5 },
  },
  pastel: {
    label: 'Pastel Vice',
    filter: 'saturate(1.12) brightness(1.09) contrast(0.94)',
    overlay: { from: '#f9a8d4', to: '#c4b5fd', composite: 'screen', alpha: 0.28 },
  },
  noir: {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.03)',
    overlay: null,
  },
};

/** Small deterministic PRNG so the film grain looks the same in preview and export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles for a layout at a given cover size (shared with the editor for hit-testing). */
export function layoutPanelRects(layoutId, width, height) {
  const layout = LAYOUTS[layoutId] || LAYOUTS['hero-strip'];
  const gap = Math.max(4, Math.round(width * 0.006));
  return layout.rects(width, height, gap);
}

/** Draw one photo into its panel: cover-fit, with the panel's zoom, rotation and pan. */
function drawPhotoPanel(ctx, image, rect, crop, filter) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!image || !image.naturalWidth) {
    const fallback = ctx.createLinearGradient(x, y, x + w, y + h);
    fallback.addColorStop(0, '#2a1b3d');
    fallback.addColorStop(1, '#0e2a3d');
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const base = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const scale = base * (crop.zoom || 1);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  // Clamp the pan to the photo's real overflow, so no drag can ever expose
  // the dark background at a panel's edge.
  const maxDx = Math.max(0, (dw - w) / 2 / w);
  const maxDy = Math.max(0, (dh - h) / 2 / h);
  const panX = Math.max(-maxDx, Math.min(maxDx, crop.dx || 0));
  const panY = Math.max(-maxDy, Math.min(maxDy, crop.dy || 0));
  const cx = x + w / 2 + panX * w;
  const cy = y + h / 2 + panY * h;
  ctx.translate(cx, cy);
  ctx.rotate(((crop.rot || 0) * Math.PI) / 180);
  ctx.filter = filter || 'none';
  ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** Wash the colour grade's tinted gradient over the finished panels. */
function applyGradeOverlay(ctx, width, height, grade) {
  if (!grade.overlay) return;
  const { from, to, composite, alpha } = grade.overlay;
  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, from);
  wash.addColorStop(1, to);
  ctx.save();
  ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Darken the cover's corners so the middle pops. */
function drawVignette(ctx, width, height) {
  const radius = Math.hypot(width, height) / 2;
  const shade = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.45,
    width / 2, height / 2, radius * 0.95,
  );
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

/** Scatter deterministic film grain over the cover. */
function drawFilmGrain(ctx, width, height) {
  const random = mulberry32(1337);
  const dots = Math.floor((width * height) / 900);
  ctx.save();
  for (let i = 0; i < dots; i++) {
    const px = random() * width;
    const py = random() * height;
    const light = random() > 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(px, py, 1.6, 1.6);
  }
  ctx.restore();
}

/** Print-style halftone dot screen over the cover. */
function drawHalftone(ctx, width, height) {
  const step = Math.max(10, Math.round(width / 140));
  const path = new Path2D();
  for (let gy = step / 2; gy < height; gy += step) {
    for (let gx = step / 2; gx < width; gx += step) {
      path.rect(gx, gy, 1.8, 1.8);
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000000';
  ctx.fill(path);
  ctx.restore();
}

/** Big display lettering: Anton, outlined, shadowed, fitted to the cover width. */
function drawCaptionLettering(ctx, width, height, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const unit = Math.min(width, height);
  let size = unit * 0.115 * ((state.titleSize || 100) / 100);
  const maxWidth = width * 0.92;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    while (size > 24 && ctx.measureText(title).width > maxWidth) {
      size *= 0.94;
      ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    }
  }
  const subSize = Math.max(16, size * 0.3);
  const gapAfterTitle = size * 0.42;
  const blockHeight = (title ? size : 0) + (subtitle ? gapAfterTitle + subSize : 0);
  let blockTop;
  if (state.titlePos === 'top') blockTop = height * 0.05;
  else if (state.titlePos === 'center') blockTop = height / 2 - blockHeight / 2;
  else blockTop = height * 0.96 - blockHeight;

  // Soft dark scrim behind the lettering so it reads over any photo.
  const scrimTop = Math.max(0, blockTop - size * 0.35);
  const scrimBottom = Math.min(height, blockTop + blockHeight + size * 0.35);
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, scrimBottom);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(0.5, 'rgba(0,0,0,0.42)');
  scrim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, width, scrimBottom - scrimTop);

  const cx = width / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  if (title) {
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.13);
    ctx.strokeStyle = '#101014';
    ctx.strokeText(title, cx, blockTop + size * 0.92);
    ctx.fillStyle = state.titleColor || '#ffffff';
    ctx.fillText(title, cx, blockTop + size * 0.92);
  }
  if (subtitle) {
    ctx.font = `${subSize}px Anton, "Arial Black", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`; } catch (err) { /* older canvas: no letter spacing */ }
    ctx.lineWidth = Math.max(1.5, subSize * 0.16);
    ctx.strokeStyle = '#101014';
    const subY = blockTop + size + gapAfterTitle + subSize * 0.8;
    ctx.strokeText(subtitle, cx, subY);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(subtitle, cx, subY);
    try { ctx.letterSpacing = '0px'; } catch (err) { /* ignore */ }
  }
  ctx.restore();
}

/**
 * Render the whole cover onto a canvas at the requested size.
 * Returns the panel rectangles, so the editor can hit-test clicks on them.
 */
export function renderCover(canvas, state, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutPanelRects(state.layout, width, height);
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, width, height);
  rects.forEach((rect, i) => {
    const panel = (state.panels || [])[i] || {};
    drawPhotoPanel(ctx, panel.photo || null, rect, panel, grade.filter);
  });
  applyGradeOverlay(ctx, width, height, grade);
  if (state.effects && state.effects.vignette) drawVignette(ctx, width, height);
  if (state.effects && state.effects.halftone) drawHalftone(ctx, width, height);
  if (state.effects && state.effects.grain) drawFilmGrain(ctx, width, height);
  drawCaptionLettering(ctx, width, height, state);
  return rects;
}
