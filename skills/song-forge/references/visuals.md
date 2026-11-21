# Visuals: video, thumbnail, artist images

## Visualizer video (`scripts/visualize.py`)
A DAW-style playlist view (instrument names on the left, clip strips, notes scrolling past a playhead at the left
edge), modelled on a reference video the user liked. Learned from feedback:
- Clip strips are drawn per bar, so a strip scrolls off the left edge with its notes (not deleted when the last note
  passes).
- No volume/automation lane, no song title on top (both removed on request).
- Section colours change smoothly; set `colors` per section in the song's guitarEvents() export or a `--theme` file.
- Render 1080p natively with `scale 1.5` (everything redrawn larger), 60 fps.
- The background is a generic DAW look; don't copy a specific product's interface/branding.

## Thumbnails, profile pictures, banners (pixel art)
Example scripts (for the "apricity." release by "sunkensol"): `references/examples/art/thumbnail.py`, `pfp.py`,
`banner.py`. Adapt the drawing functions for a new icon. Rules that came out of the feedback:
- Style reference: glitchy breakcore covers (e.g. Mongopsy): one centred pixel icon that resembles the song, a
  duotone palette, ornament/arrangement view behind it, dark.
- Draw the icon on a small grid (40 -> 80 px when "too pixelated"), scale up with NEAREST. Use clean shapes: rays as
  solid polygons (thick PIL lines leave hooks), then a 2x2 morphological opening to delete stray single pixels;
  continuous waves (gentle sine, 1 px rise) that fade at their ends instead of breaking off.
- Pixel-art gradients and glow: build them on the SAME grid as the art, quantise to colour steps, and dither only at
  the seams between bands (Bayer 4x4, ~45% strength). Full-strength dither everywhere reads as noise.
- Keep colours in the song's palette (the user rejected an off-palette violet).
- No random glitch lines over the image if the user dislikes them; faint even scanlines are fine.
- Profile picture: 1024x1024, everything important inside the central circle (platforms crop round); check it at
  ~96 px. YouTube banner: 2560x1440 with the name and icon inside the 1546x423 centre safe area; trim each pixel-font
  letter to its own width for even spacing.
- Embed the thumbnail as MP3 cover art: `ffmpeg -i song.mp3 -i cover.png -map 0:a -map 1:v -c:a copy -c:v mjpeg
  -disposition:v attached_pic -id3v2_version 3 -metadata title=... -metadata artist=... out.mp3`.
- Single-colour variant ("crucible.", `references/examples/art/thumbnail_flat.py`): one hue on black, NO gradients
  (no glow, no vignette, no shaded fills); the arrangement view recoloured in two flat dim steps of the hue; details as
  cut-outs (negative space); no box or outline around the icon (a black outline was removed). A glow is fine as
  STEPPED flat bands of the same hue (no smooth gradient) on the icon's pixel grid. The listener preferred a CIRCLE:
  three concentric rings centred on the icon (~0.20 / 0.13 / 0.07 of the colour) over a halo following the shape;
  never glow the small sparks (they grew glowing bubbles).
- Watch for accidental readings at icon size and fix them before sending: two cut-out bubbles in a pot read as eyes
  (a face); hollow flames open at the bottom read as legs or letters ("MAA"); round flames under a vessel read as
  wheels (a mine cart); stepped flame sides read as a bar graph; a drip beside a wall reads as a handle. What worked:
  flame tongues narrowing to a point along curved sides, leaning as they rise, on an ember bed, tips clear of the grate.
- Pick an icon everyone recognises: the listener swapped a crucible (most people don't know the word) for a campfire.
  The campfire that worked: a main flame flickering in an S, two shorter side tongues leaning out, a hollow inner flame
  with a core (negative space), two wisps breaking off the top, thin crossed logs under a 1 px gap (`flame()` in
  thumbnail_flat.py). Check it at sidebar size (~240 px wide).
- Filenames: drop a trailing period ("apricity." -> apricity.mp3), keep it in the title tag.
