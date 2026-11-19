// VICEFRAME cover renderer: eight layouts (including slanted key-art panels
// and a six-panel comic grid), seven colour grades, effects, caption
// lettering and the five-star wanted decoration, all drawn on a 2D canvas.
// Pure functions of the editor state — the same code draws the live preview
// and the exported PNG, so what you see is exactly what you share. The
// built-in samples are illustrated characters in the same cel-shaded poster
// style, never photographs.

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
  slanted: {
    label: 'Slanted',
    panelCount: 3,
    rects(w, h, gap) {
      // Diagonal dividers, GTA key-art style: each panel is a quadrilateral
      // whose inner edge leans. poly holds the absolute clip points; x/y/w/h
      // are the panel's bounding box, which the photo cover-fits into.
      const s = Math.round(w * 0.07);
      const t1 = Math.round(w / 3);
      const t2 = Math.round((w * 2) / 3);
      const quad = (points) => {
        const xs = points.map((p) => p[0]);
        const ys = points.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, poly: points };
      };
      return [
        quad([[0, 0], [t1 + s - gap, 0], [t1 - s - gap, h], [0, h]]),
        quad([[t1 + s + gap, 0], [t2 + s - gap, 0], [t2 - s - gap, h], [t1 - s + gap, h]]),
        quad([[t2 + s + gap, 0], [w, 0], [w, h], [t2 - s + gap, h]]),
      ];
    },
  },
  'key-art': {
    label: 'Key-art slash',
    panelCount: 3,
    // The whole caption block slashes across the cover at this angle.
    titleAngle: -3,
    rects(w, h, gap) {
      // One big slanted hero on the left, two stacked panels on the right,
      // with the divider leaning from the top to the bottom of the cover.
      const s = Math.round(w * 0.06);
      const split = Math.round(w * 0.6);
      const mid = Math.round(h / 2);
      const slantX = (y) => split + s - ((2 * s * y) / h);
      const quad = (points) => {
        const xs = points.map((p) => p[0]);
        const ys = points.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, poly: points };
      };
      return [
        quad([[0, 0], [slantX(0) - gap, 0], [slantX(h) - gap, h], [0, h]]),
        quad([[slantX(0) + gap, 0], [w, 0], [w, mid - gap], [slantX(mid - gap) + gap, mid - gap]]),
        quad([[slantX(mid + gap) + gap, mid + gap], [w, mid + gap], [w, h], [slantX(h) + gap, h]]),
      ];
    },
  },
  'full-bleed': {
    label: 'Full-bleed hero',
    panelCount: 1,
    rects(w, h) {
      return [{ x: 0, y: 0, w, h }];
    },
  },
  'comic-grid': {
    label: 'Comic grid',
    panelCount: 6,
    rects(w, h, gap) {
      // Six panels: 3 columns by 2 rows in landscape, 2 by 3 in portrait.
      const cols = w >= h ? 3 : 2;
      const rows = w >= h ? 2 : 3;
      const rects = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = Math.round((w * c) / cols);
          const x1 = c === cols - 1 ? w : Math.round((w * (c + 1)) / cols);
          const y0 = Math.round((h * r) / rows);
          const y1 = r === rows - 1 ? h : Math.round((h * (r + 1)) / rows);
          const x = x0 + (c === 0 ? 0 : gap);
          const y = y0 + (r === 0 ? 0 : gap);
          rects.push({
            x,
            y,
            w: x1 - (c === cols - 1 ? 0 : gap) - x,
            h: y1 - (r === rows - 1 ? 0 : gap) - y,
          });
        }
      }
      return rects;
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
  heist: {
    label: 'Heist',
    filter: 'saturate(1.35) contrast(1.12) sepia(0.22) hue-rotate(-10deg)',
    overlay: { from: '#0d9488', to: '#f97316', composite: 'soft-light', alpha: 0.5 },
  },
  midnight: {
    label: 'Midnight',
    filter: 'saturate(1.15) contrast(1.14) brightness(0.9) hue-rotate(16deg)',
    overlay: { from: '#0c1e5e', to: '#312e81', composite: 'overlay', alpha: 0.42 },
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

/** Does a canvas point fall inside a panel (polygon-aware for slanted panels)? */
export function pointInPanel(point, rect) {
  if (!rect.poly) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }
  // Ray casting over the panel's polygon.
  let inside = false;
  const pts = rect.poly;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > point.y) !== (yj > point.y) && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Trace a panel's outline (polygon or rectangle) onto a path for stroking. */
export function tracePanelPath(ctx, rect) {
  ctx.beginPath();
  if (rect.poly) {
    rect.poly.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
}

/** Draw one photo into its panel: cover-fit, with the panel's zoom, rotation and pan. */
function drawPhotoPanel(ctx, image, rect, crop, filter) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  if (rect.poly) {
    // Slanted panel: clip to its quadrilateral instead of its bounding box.
    rect.poly.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
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

  // Key-art layouts slash the whole caption block at an angle, GTA key-art style.
  const layout = LAYOUTS[state.layout] || LAYOUTS['hero-strip'];
  const angle = ((layout.titleAngle || 0) * Math.PI) / 180;
  ctx.save();
  if (angle) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);
    ctx.translate(-width / 2, -height / 2);
  }

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
  ctx.restore();
}

/** Five gold wanted stars in the top-right corner, GTA style. Kept small
    (about half the original size) so they decorate without dominating. */
function drawWantedStars(ctx, width) {
  const starR = Math.max(7, Math.round(width * 0.012));
  const gap = starR * 0.35;
  const margin = Math.round(width * 0.025);
  const total = starR * 2 * 5 + gap * 4;
  let cx = width - margin - total + starR;
  const cy = margin + starR;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, cx, cy, starR);
    cx += starR * 2 + gap;
  }
  ctx.restore();
}

/** One five-pointed star: gold fill, dark outline, soft shadow. */
function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + radius * Math.cos(a);
    const py = cy + radius * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = r * 0.3;
  ctx.shadowOffsetY = r * 0.12;
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#101014';
  ctx.stroke();
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
  if (state.wanted) drawWantedStars(ctx, width);
  return rects;
}
