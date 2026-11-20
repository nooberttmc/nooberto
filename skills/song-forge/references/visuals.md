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
- Filenames: drop a trailing period ("apricity." -> apricity.mp3), keep it in the title tag.
