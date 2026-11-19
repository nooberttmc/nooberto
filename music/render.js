// Renders undertow_requiem.js offline in headless Chromium, writes WAV, then MP3 via ffmpeg.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'undertow_requiem.js'), 'utf8') });
  const r = await pg.evaluate(() => renderSong());
  await b.close();
  if (errs.length) { console.log(errs); process.exit(1); }
  const wav = path.join(__dirname, 'undertow_requiem.wav'), mp3 = path.join(__dirname, 'Undertow Requiem.mp3');
  fs.writeFileSync(wav, Buffer.from(r.wav, 'base64'));
  execSync(`ffmpeg -y -loglevel error -i "${wav}" -af "volume=3dB,alimiter=limit=0.89:level=false" -codec:a libmp3lame -b:a 192k -metadata title="Undertow Requiem" -metadata artist="Emberwake" "${mp3}"`);
  fs.unlinkSync(wav);
  console.log('rendered', r.seconds.toFixed(1) + 's', 'raw peak', r.peak.toFixed(2), '->', mp3);
})();
