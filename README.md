# VICEFRAME — GTA-style Cover Art Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tumbalkan/gta6-cover-art-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tumbalkan/gta6-cover-art-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo into a striking multi-panel poster in the style of GTA 6 cover
art — entirely offline, in your browser. No uploads, no account, no build step.

## What it does

- **Multi-panel posters** — four layouts: Hero + strip, Poster split, Triptych
  and Quad. Fill several panels with one photo or a different photo per panel.
- **Any photo** — drop in your own photos (read on your machine only) or use
  the four built-in Vice City samples. Click a panel to select it, drag to pan
  the photo, zoom and rotate with sliders.
- **Bold lettering** — big display type (Anton, SIL Open Font License) with
  outline, drop shadow and an auto-fit that never overflows the cover. Title,
  subtitle, size, position and colour are all editable.
- **Vice City grades** — five colour grades: Sunset, Neon Night, Ocean Drive,
  Pastel Vice and Mono Noir, plus vignette, film grain and halftone effects.
- **One-click export** — PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.
  The live preview is rendered by the same code as the export, so what you see
  is exactly what you share.

## Run it

Serve the `app/` folder with any static server and open `index.html`:

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080 — pick a photo, a layout and a grade, write
your caption, and hit **Export PNG**.

## Entry

Built for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01)
on make.fun. Original work: no Rockstar logo, wordmark, artwork, character or
font is used. The display font is Anton under the SIL Open Font License 1.1
(see `app/fonts/OFL.txt`).
