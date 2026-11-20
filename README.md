# VICEFRAME — GTA-style Cover Art Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tumbalkan/gta6-cover-art-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tumbalkan/gta6-cover-art-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo into a striking multi-panel poster in the style of GTA 6 cover
art — entirely offline, in your browser. No uploads, no account, no build step.

## What it does

- **Multi-panel posters** — nine layouts: Hero + strip, Poster split,
  Triptych, Quad, Slanted (diagonal dividers like GTA 6 key art), Key-art
  slash (title slashed across the art), Full-bleed hero, a six-panel Comic
  grid and Cover (nine panels around a central title block, the official GTA
  cover structure). Fill several panels with one photo or a different photo
  per panel.
- **Any photo** — drop in your own photos (read on your machine only) or use
  the eight built-in Vice City samples: neon street, boulevard, beach, pier,
  heist crew, getaway chase, nightclub and biker. Click a panel to select it,
  drag to pan the photo, zoom and rotate with sliders. When the browser
  supports face detection, auto-fill centres the subject's face in its panel.
  Every panel carries an editable caption tag — a role tag (THE DRIVER,
  THE HEIST…) or a place/time caption (OCEAN DRIVE · 6:42 PM).
- **Bold lettering** — a chrome 3D title (striped sunset-gradient letters
  with a dark outline and extruded shadow, or a flat solid style), a neon
  pink script subtitle (Pacifico, SIL Open Font License), and a tagline
  ribbon. Title, subtitle, tagline, size, position and colour are all
  editable. One-click presets (Vice City, Heist Crew, Getaway, Neon Nights,
  Wanted, Outlaw Run) set the caption, tagline, quote, grade and five-star
  wanted decoration together.
- **Poster furniture** — the movie-poster dressing: a critic quote bar with
  five stars, a VOL badge, a gold ORIGINAL COVER ART seal, a billing block,
  a barcode, a palm silhouette strip and COMING SOON. Toggleable as one
  switch; quote, source, tagline and VOL text are editable.
- **Vice City grades + Look** — seven colour grades: Sunset, Neon Night,
  Ocean Drive, Pastel Vice, Mono Noir, Heist (teal-orange cinematic) and
  Midnight, plus vignette, and four stylization sliders that turn any photo
  into poster art: Paint (posterize), Halftone, Grain and Glow.
- **One-click export** — PNG at 1080 × 1080, 1080 × 1350, 1080 × 1920 or
  1920 × 1080. The live preview is rendered by the same code as the export,
  so what you see is exactly what you share.

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
font is used. The display fonts are Anton and Pacifico under the SIL Open
Font License 1.1 (see `app/fonts/OFL.txt` and `app/fonts/OFL-Pacifico.txt`).

<!-- Sample photos: an illustrated character set (cel-shaded GTA-poster style) — no photographs.
     Touch-up: wanted stars resized small; heist sample now shows the crew with US dollar cash.
     Round 3: Cover layout, chrome title, script subtitle, poster furniture, caption tags, Look sliders. -->
