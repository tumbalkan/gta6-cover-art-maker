// VICEFRAME cover renderer: nine layouts (including slanted key-art panels,
// a six-panel comic grid and a nine-panel Cover around a central title
// block), seven colour grades, a stylization engine (paint posterize,
// halftone, film grain, glow), chrome 3D lettering with a script subtitle,
// poster furniture (quote bar, VOL badge, tagline ribbon, seal, billing,
// barcode, palm strip), per-panel caption tags and the five-star wanted
// decoration, all drawn on a 2D canvas. Pure functions of the editor state —
// the same code draws the live preview and the exported PNG, so what you see
// is exactly what you share. The built-in samples are illustrated characters
// in the same cel-shaded poster style, never photographs.

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
  cover: {
    label: 'Cover',
    panelCount: 9,
    // The official GTA cover structure: nine panels around a central title
    // block. Top row three leads, middle row two flanks with the title block
    // between them, bottom row four scenes. titleBlock names the central
    // rectangle the caption lettering centres itself in.
    titleBlock(w, h, gap) {
      const r1 = Math.round(h / 3);
      const r2 = Math.round((h * 2) / 3);
      return {
        x: Math.round(w * 0.25) + gap,
        y: r1 + gap,
        w: Math.round(w * 0.5) - gap * 2,
        h: r2 - r1 - gap * 2,
      };
    },
    rects(w, h, gap) {
      const r1 = Math.round(h / 3);
      const r2 = Math.round((h * 2) / 3);
      const c1 = Math.round(w / 3);
      const c2 = Math.round((w * 2) / 3);
      const q = Math.round(w / 4);
      const topH = r1 - gap;
      const midY = r1 + gap;
      const midH = r2 - r1 - gap * 2;
      const botY = r2 + gap;
      const botH = h - r2 - gap;
      return [
        { x: 0, y: 0, w: c1 - gap, h: topH },
        { x: c1 + gap, y: 0, w: c2 - c1 - gap * 2, h: topH },
        { x: c2 + gap, y: 0, w: w - c2 - gap, h: topH },
        { x: 0, y: midY, w: Math.round(w * 0.25) - gap, h: midH },
        { x: Math.round(w * 0.75) + gap, y: midY, w: w - Math.round(w * 0.75) - gap, h: midH },
        { x: 0, y: botY, w: q - gap, h: botH },
        { x: q + gap, y: botY, w: q - gap * 2, h: botH },
        { x: q * 2 + gap, y: botY, w: q - gap * 2, h: botH },
        { x: q * 3 + gap, y: botY, w: w - q * 3 - gap, h: botH },
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

/** Posterize the canvas: quantize every channel through a lookup table, so a
 *  photo flattens into a few bold colour levels like printed poster art.
 *  amount 0 is a no-op; 100 leaves about three levels per channel. */
function posterize(ctx, width, height, amount) {
  if (!amount || amount <= 0) return;
  const levels = Math.max(3, Math.round(26 - amount * 0.23));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.round((Math.round((v / 255) * (levels - 1)) / (levels - 1)) * 255);
  }
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
  ctx.putImageData(image, 0, 0);
}

/** Soft bloom: a blurred copy of the canvas composited back additively.
 *  A module-level offscreen canvas is reused so exports do not allocate
 *  a fresh full-size buffer on every render. */
let glowCanvas = null;
function drawGlow(ctx, canvas, width, height, amount) {
  if (!amount || amount <= 0) return;
  if (!glowCanvas) glowCanvas = document.createElement('canvas');
  glowCanvas.width = width;
  glowCanvas.height = height;
  const off = glowCanvas.getContext('2d');
  off.clearRect(0, 0, width, height);
  off.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (amount / 100) * 0.4;
  try {
    ctx.filter = `blur(${Math.max(8, Math.round(width * 0.012))}px)`;
  } catch (err) { /* older canvas: unblurred bloom still reads */ }
  ctx.drawImage(glowCanvas, 0, 0);
  ctx.restore();
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

/** Scatter deterministic film grain over the cover; amount 0–100 sets the
 *  density and strength. The seeded PRNG keeps preview and export identical. */
function drawFilmGrain(ctx, width, height, amount = 50) {
  if (!amount || amount <= 0) return;
  const random = mulberry32(1337);
  const dots = Math.floor(((width * height) / 900) * (0.4 + (amount / 100) * 1.2));
  const lightAlpha = 0.02 + (amount / 100) * 0.05;
  const darkAlpha = 0.025 + (amount / 100) * 0.06;
  ctx.save();
  for (let i = 0; i < dots; i++) {
    const px = random() * width;
    const py = random() * height;
    const light = random() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${lightAlpha})` : `rgba(0,0,0,${darkAlpha})`;
    ctx.fillRect(px, py, 1.6, 1.6);
  }
  ctx.restore();
}

/** Print-style halftone dot screen over the cover; amount 0–100 grows the
 *  dots and deepens the screen. */
function drawHalftone(ctx, width, height, amount = 50) {
  if (!amount || amount <= 0) return;
  const step = Math.max(8, Math.round(width / 160));
  const dot = 1.2 + (amount / 100) * 2.6;
  const path = new Path2D();
  for (let gy = step / 2; gy < height; gy += step) {
    for (let gx = step / 2; gx < width; gx += step) {
      path.rect(gx, gy, dot, dot);
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.05 + (amount / 100) * 0.3;
  ctx.fillStyle = '#000000';
  ctx.fill(path);
  ctx.restore();
}

/** Sunset-striped gradient for the chrome title: hard bands from pale
 *  yellow through orange and pink to violet, like a Vice City sunset. */
function chromeGradient(ctx, y0, y1) {
  const bands = ['#fff7ae', '#ffe259', '#ffb347', '#ff7a18', '#ff5e62', '#ff2e88', '#c026d3', '#7c3aed'];
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  bands.forEach((color, i) => {
    gradient.addColorStop(i / bands.length, color);
    gradient.addColorStop((i + 1) / bands.length, color);
  });
  return gradient;
}

/** Big display lettering: a chrome 3D title (striped sunset-gradient fill,
 *  dark outline, extruded shadow) or a flat solid title, a neon-pink script
 *  subtitle in Pacifico, and a tagline ribbon — all fitted to the cover
 *  width, never overflowing. On the Cover layout the whole block centres
 *  itself in the layout's central title block. */
function drawCaptionLettering(ctx, width, height, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const furniture = state.furniture || {};
  const tagline = furniture.on ? (furniture.tagline || '').trim().toUpperCase() : '';
  if (!title && !subtitle && !tagline) return;
  const layout = LAYOUTS[state.layout] || LAYOUTS['hero-strip'];
  const unit = Math.min(width, height);
  const gap = Math.max(4, Math.round(width * 0.006));
  const block = layout.titleBlock ? layout.titleBlock(width, height, gap) : null;
  const maxWidth = block ? block.w * 0.96 : width * 0.92;

  let size = unit * 0.115 * ((state.titleSize || 100) / 100);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    while (size > 24 && ctx.measureText(title).width > maxWidth) {
      size *= 0.94;
      ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    }
  }
  const subSize = Math.max(16, size * 0.42);
  let scriptSize = subSize;
  if (subtitle) {
    ctx.font = `${scriptSize}px Pacifico, cursive`;
    while (scriptSize > 14 && ctx.measureText(subtitle).width > maxWidth) {
      scriptSize *= 0.94;
      ctx.font = `${scriptSize}px Pacifico, cursive`;
    }
  }
  const ribbonSize = Math.max(11, size * 0.16);
  const gapAfterTitle = size * 0.3;
  const gapAfterSub = size * 0.22;
  const ribbonH = tagline ? ribbonSize * 2.1 + gapAfterSub : 0;
  const blockHeight = (title ? size : 0)
    + (subtitle ? gapAfterTitle + scriptSize : 0)
    + ribbonH;

  let blockTop;
  if (block) {
    blockTop = block.y + (block.h - blockHeight) / 2;
  } else if (state.titlePos === 'top') blockTop = height * 0.05;
  else if (state.titlePos === 'center') blockTop = height / 2 - blockHeight / 2;
  else blockTop = height * (furniture.on ? 0.925 : 0.96) - blockHeight;

  // Key-art layouts slash the whole caption block at an angle, GTA key-art style.
  const angle = ((layout.titleAngle || 0) * Math.PI) / 180;
  ctx.save();
  if (angle) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);
    ctx.translate(-width / 2, -height / 2);
  }

  if (block) {
    // The central title block gets its own deep-violet ground so the chrome
    // lettering sits on something deliberate, not on bare background.
    const ground = ctx.createLinearGradient(0, block.y, 0, block.y + block.h);
    ground.addColorStop(0, '#1c1229');
    ground.addColorStop(1, '#0a0a0f');
    ctx.fillStyle = ground;
    ctx.fillRect(block.x, block.y, block.w, block.h);
  }

  // Soft dark scrim behind the lettering so it reads over any photo.
  const scrimTop = Math.max(0, blockTop - size * 0.35);
  const scrimBottom = Math.min(height, blockTop + blockHeight + size * 0.35);
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, scrimBottom);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(0.5, 'rgba(0,0,0,0.42)');
  scrim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(block ? block.x : 0, scrimTop, block ? block.w : width, scrimBottom - scrimTop);

  const cx = block ? block.x + block.w / 2 : width / 2;
  const chrome = (state.titleStyle || 'chrome') === 'chrome';
  if (title) {
    const titleY = blockTop + size * 0.92;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.13);
    if (chrome) {
      // Extruded 3D offset in deep violet, then the striped sunset fill.
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.16;
      ctx.shadowOffsetY = size * 0.05;
      ctx.fillStyle = '#2a0a4a';
      ctx.fillText(title, cx + size * 0.035, titleY + size * 0.05);
      ctx.fillStyle = chromeGradient(ctx, blockTop, blockTop + size);
      ctx.fillText(title, cx, titleY);
      ctx.restore();
      ctx.strokeStyle = '#101014';
      ctx.strokeText(title, cx, titleY);
    } else {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.16;
      ctx.shadowOffsetY = size * 0.05;
      ctx.strokeStyle = '#101014';
      ctx.strokeText(title, cx, titleY);
      ctx.fillStyle = state.titleColor || '#ffffff';
      ctx.fillText(title, cx, titleY);
      ctx.restore();
    }
  }
  if (subtitle) {
    // Neon script subtitle, tucked close under the title, glowing pink.
    const subY = blockTop + size + gapAfterTitle + scriptSize * 0.85;
    ctx.save();
    ctx.font = `${scriptSize}px Pacifico, cursive`;
    ctx.shadowColor = 'rgba(255,46,136,0.85)';
    ctx.shadowBlur = scriptSize * 0.35;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, scriptSize * 0.12);
    ctx.strokeStyle = '#1a0510';
    ctx.strokeText(subtitle, cx, subY);
    ctx.fillStyle = '#ff5ea8';
    ctx.fillText(subtitle, cx, subY);
    ctx.restore();
  }
  if (tagline) {
    // Tagline ribbon: a dark pill with a pink edge, centred under the subtitle.
    const ribbonY = blockTop + size + (subtitle ? gapAfterTitle + scriptSize : 0) + gapAfterSub;
    ctx.font = `${ribbonSize}px Anton, "Arial Black", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(ribbonSize * 0.28)}px`; } catch (err) { /* older canvas */ }
    const textW = ctx.measureText(tagline).width;
    const padX = ribbonSize * 1.1;
    const pillW = Math.min(maxWidth, textW + padX * 2);
    const pillH = ribbonSize * 2.1;
    const pillX = cx - pillW / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(8,8,14,0.88)';
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(1.5, ribbonSize * 0.12);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(pillX, ribbonY, pillW, pillH, pillH / 2);
    else ctx.rect(pillX, ribbonY, pillW, pillH);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillText(tagline, cx, ribbonY + pillH * 0.72);
    ctx.restore();
    try { ctx.letterSpacing = '0px'; } catch (err) { /* ignore */ }
  }
  ctx.restore();
}

/** Five gold wanted stars in the top-right corner, GTA style. Kept small
 *  (about half the original size) so they decorate without dominating. When
 *  the poster furniture is on, they sit below the quote bar so they never
 *  collide with the VOL badge. */
function drawWantedStars(ctx, width, furnitureOn) {
  const starR = Math.max(7, Math.round(width * 0.012));
  const gap = starR * 0.35;
  const margin = Math.round(width * 0.025);
  const total = starR * 2 * 5 + gap * 4;
  let cx = width - margin - total + starR;
  const cy = margin + starR + (furnitureOn ? Math.round(width * 0.032) : 0);
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

/** One palm silhouette: a leaning trunk and six drooping fronds, drawn as
 *  dark strokes so it reads as a cut-out against the sunset strip. */
function drawPalm(ctx, x, baseY, s) {
  ctx.save();
  ctx.strokeStyle = '#0d0618';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + s * 0.08, baseY - s * 0.55, x + s * 0.22, baseY - s * 0.9);
  ctx.stroke();
  const topX = x + s * 0.22;
  const topY = baseY - s * 0.9;
  ctx.lineWidth = Math.max(1, s * 0.06);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.15 + (i / 5) * 0.7);
    const ex = topX + Math.cos(a) * s * 0.55;
    const ey = topY - Math.sin(a) * s * 0.28 + s * 0.3;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.3, topY - s * 0.22, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** A drawn barcode: deterministic pseudo-random bars with a number line. */
function drawBarcode(ctx, x, y, w, h) {
  const random = mulberry32(20240);
  ctx.save();
  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(x, y, w, h);
  let bx = x + w * 0.06;
  const barTop = y + h * 0.12;
  const barBottom = y + h * 0.68;
  ctx.fillStyle = '#111111';
  while (bx < x + w * 0.94) {
    const bw = 1 + random() * w * 0.02;
    if (random() > 0.35) ctx.fillRect(bx, barTop, bw, barBottom - barTop);
    bx += bw + 1 + random() * w * 0.015;
  }
  ctx.fillStyle = '#111111';
  ctx.font = `${Math.max(7, h * 0.18)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('8 901234 567890', x + w / 2, y + h * 0.92);
  ctx.restore();
}

/** Gold starburst seal: a many-point star with the ORIGINAL COVER ART text. */
function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * 0.8;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const px = radius * Math.cos(a);
    const py = radius * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = r * 0.2;
  ctx.shadowOffsetY = r * 0.08;
  ctx.fillStyle = '#f5b301';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a2503';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd94d';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a2503';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(8, r * 0.22)}px Anton, "Arial Black", sans-serif`;
  ctx.fillText('ORIGINAL', 0, -r * 0.16);
  ctx.fillText('COVER ART', 0, r * 0.14);
  ctx.font = `${Math.max(7, r * 0.18)}px Anton, sans-serif`;
  ctx.fillText('★ ★ ★', 0, r * 0.42);
  ctx.restore();
}

/** Poster furniture: critic quote bar with stars, VOL badge, gold seal,
 *  billing line, barcode, palm strip and COMING SOON. Everything scales
 *  with the export size and stays out of the title's way. */
function drawFurniture(ctx, width, height, state) {
  const furniture = state.furniture || {};
  if (!furniture.on) return;
  const margin = Math.round(width * 0.02);
  const bandH = Math.max(26, Math.round(height * 0.042));

  // Critic quote bar across the top, over a translucent dark band.
  ctx.save();
  ctx.fillStyle = 'rgba(8,8,14,0.72)';
  ctx.fillRect(0, 0, width, bandH);
  const starR = Math.max(6, bandH * 0.26);
  let sx = margin + starR;
  const sy = bandH / 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx, sy, starR);
    sx += starR * 2 + starR * 0.3;
  }
  const quote = (furniture.quote || '').trim();
  const source = (furniture.source || '').trim();
  const volText = (furniture.vol || 'VOL. 01').trim();
  let quoteSize = Math.max(11, Math.round(bandH * 0.42));
  ctx.font = `${quoteSize}px Anton, "Arial Black", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // VOL badge first, so the quote knows how much room it has.
  let badgeW = 0;
  if (volText) {
    ctx.font = `${Math.max(11, Math.round(bandH * 0.4))}px Anton, "Arial Black", sans-serif`;
    badgeW = ctx.measureText(volText).width + bandH * 0.9;
  }
  const quoteX = sx + starR;
  const quoteMax = width - badgeW - margin * 2 - quoteX;
  const quoteLine = quote ? `"${quote.toUpperCase()}"` : '';
  if (quoteLine && quoteMax > 60) {
    ctx.font = `${quoteSize}px Anton, "Arial Black", sans-serif`;
    while (quoteSize > 9 && ctx.measureText(quoteLine).width > quoteMax * 0.8) {
      quoteSize -= 1;
      ctx.font = `${quoteSize}px Anton, "Arial Black", sans-serif`;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(quoteLine, quoteX, sy + 1);
    if (source) {
      const srcX = quoteX + ctx.measureText(quoteLine).width + quoteSize * 0.8;
      ctx.font = `${Math.max(9, quoteSize * 0.72)}px Anton, "Arial Black", sans-serif`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`— ${source.toUpperCase()}`, srcX, sy + 1);
    }
  }
  if (volText) {
    const badgeH = bandH * 0.78;
    const badgeX = width - margin - badgeW;
    const badgeY = (bandH - badgeH) / 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    else ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();
    ctx.fillStyle = '#1a1206';
    ctx.font = `${Math.max(11, Math.round(bandH * 0.4))}px Anton, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(volText.toUpperCase(), badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
  }
  ctx.restore();

  // Palm silhouette strip along the very bottom edge.
  const palmH = Math.max(22, Math.round(height * 0.038));
  const stripTop = height - palmH;
  const strip = ctx.createLinearGradient(0, stripTop, 0, height);
  strip.addColorStop(0, 'rgba(26,11,46,0.95)');
  strip.addColorStop(1, 'rgba(255,46,136,0.55)');
  ctx.fillStyle = strip;
  ctx.fillRect(0, stripTop, width, palmH);
  const palmCount = Math.max(4, Math.round(width / (palmH * 3.2)));
  for (let i = 0; i < palmCount; i++) {
    const px = margin + ((width - margin * 2) * (i + 0.5)) / palmCount;
    drawPalm(ctx, px, height - 1, palmH * (0.9 + ((i * 37) % 3) * 0.12));
  }

  // A soft dark footer band above the palm strip, so the billing line,
  // COMING SOON and the barcode read over any photo instead of fighting it.
  const footerH = Math.max(30, Math.round(height * 0.05));
  const footer = ctx.createLinearGradient(0, stripTop - footerH, 0, stripTop);
  footer.addColorStop(0, 'rgba(8,8,14,0)');
  footer.addColorStop(1, 'rgba(8,8,14,0.78)');
  ctx.fillStyle = footer;
  ctx.fillRect(0, stripTop - footerH, width, footerH);

  // Billing micro-text, centred just above the palm strip.
  const billing = (furniture.billing || '').trim();
  if (billing) {
    const billSize = Math.max(8, Math.round(width * 0.0075));
    ctx.save();
    ctx.font = `${billSize}px Anton, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText(billing.toUpperCase(), width / 2, stripTop - billSize * 0.9);
    ctx.restore();
  }

  // COMING SOON, bottom-left above the palm strip.
  ctx.save();
  ctx.font = `${Math.max(11, Math.round(width * 0.016))}px Anton, "Arial Black", sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, Math.round(width * 0.004))}px`; } catch (err) { /* older canvas */ }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255,46,136,0.8)';
  ctx.shadowBlur = width * 0.008;
  ctx.fillStyle = '#ff5ea8';
  ctx.fillText('COMING SOON', margin, stripTop - Math.max(10, height * 0.012));
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch (err) { /* ignore */ }

  // Barcode, bottom-right above the palm strip.
  const bcW = Math.max(64, Math.round(width * 0.062));
  const bcH = Math.max(26, Math.round(height * 0.032));
  drawBarcode(ctx, width - margin - bcW, stripTop - bcH - Math.max(6, height * 0.008), bcW, bcH);

  // Gold seal, right side, clear of the barcode and the title.
  const sealR = Math.max(30, Math.round(width * 0.042));
  drawSeal(ctx, width - margin - sealR * 1.15, height * 0.68, sealR);
}

/** One panel's caption tag: a black tag with a pink edge. It sits in the
 *  panel's bottom-left corner — except when the panel reaches the cover's
 *  footer (palm strip, billing, barcode, COMING SOON), where it moves to
 *  the top-left corner, below the quote bar, so nothing covers it. Role
 *  tags print in caps; place captions print as typed. */
function drawPanelCaption(ctx, rect, caption, height, furnitureOn) {
  if (!caption || !caption.show) return;
  const text = (caption.text || '').trim();
  if (!text) return;
  const label = caption.mode === 'place' ? text : text.toUpperCase();
  let size = Math.max(10, Math.min(26, Math.round(rect.w * 0.052)));
  ctx.save();
  ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  const maxW = rect.w * 0.86;
  while (size > 9 && ctx.measureText(label).width > maxW) {
    size -= 1;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  }
  const padX = size * 0.7;
  const tagW = ctx.measureText(label).width + padX * 2 + size * 0.35;
  const tagH = size * 1.9;
  const tagX = rect.x + Math.max(6, rect.w * 0.03);
  const margin = Math.max(6, rect.h * 0.03);
  let tagY = rect.y + rect.h - tagH - margin;
  if (furnitureOn && rect.y + rect.h > height * 0.9) {
    // Bottom-row panel: the footer would cover a bottom tag, so pin it to
    // the top of the panel, clear of the quote bar.
    const bandH = Math.max(26, Math.round(height * 0.042));
    tagY = Math.max(rect.y + margin, bandH + margin);
  }
  ctx.fillStyle = 'rgba(8,8,12,0.88)';
  ctx.fillRect(tagX, tagY, tagW, tagH);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(tagX, tagY, Math.max(2, size * 0.28), tagH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, tagX + padX + size * 0.35, tagY + tagH / 2 + 1);
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
  const look = state.look || {};
  const rects = layoutPanelRects(state.layout, width, height);
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, width, height);
  rects.forEach((rect, i) => {
    const panel = (state.panels || [])[i] || {};
    drawPhotoPanel(ctx, panel.photo || null, rect, panel, grade.filter);
  });
  applyGradeOverlay(ctx, width, height, grade);
  posterize(ctx, width, height, look.paint || 0);
  if (state.effects && state.effects.vignette) drawVignette(ctx, width, height);
  if (state.effects && state.effects.halftone) drawHalftone(ctx, width, height, look.halftone || 0);
  if (state.effects && state.effects.grain) drawFilmGrain(ctx, width, height, look.grain || 0);
  drawGlow(ctx, canvas, width, height, look.glow || 0);
  rects.forEach((rect, i) => {
    const panel = (state.panels || [])[i] || {};
    drawPanelCaption(ctx, rect, panel.caption, height, !!(state.furniture && state.furniture.on));
  });
  drawFurniture(ctx, width, height, state);
  drawCaptionLettering(ctx, width, height, state);
  if (state.wanted) drawWantedStars(ctx, width, !!(state.furniture && state.furniture.on));
  return rects;
}
