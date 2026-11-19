// Renders a song file offline in headless Chromium, then encodes it to MP3 with ffmpeg.
// usage: node render.js <song.js> "<Title>"   (the song file must define async renderSong())
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const file = process.argv[2] || 'undertow_requiem.js', title = process.argv[3] || 'Undertow Requiem';
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, file), 'utf8') });
  const r = await pg.evaluate(() => renderSong());
  await b.close();
  if (errs.length) { console.log(errs); process.exit(1); }
  const wav = path.join(__dirname, file.replace(/\.js$/, '.wav')), mp3 = path.join(__dirname, title + '.mp3');
  fs.writeFileSync(wav, Buffer.from(r.wav, 'base64'));
  execSync(`ffmpeg -y -loglevel error -i "${wav}" -af "volume=3dB,alimiter=limit=0.89:level=false" -codec:a libmp3lame -b:a 192k -metadata title="${title}" -metadata artist="Emberwake" "${mp3}"`);
  fs.unlinkSync(wav);
  console.log('rendered', r.seconds.toFixed(1) + 's', 'raw peak', r.peak.toFixed(2), '->', mp3);
})();
