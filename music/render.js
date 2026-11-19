// Renders a song file offline in headless Chromium, then encodes it to MP3 with ffmpeg.
// usage: node render.js <song.js> "<Title>" [--events out.json] [--stem name=file.wav ...]
//   The song file defines async renderSong(); it may also define guitarEvents() (exported with --events).
//   Breaks from music/breaks/*.mp3 (+ break_info.json) and any --stem audio are served to the page as raw float PCM.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const args = process.argv.slice(2), file = args[0], title = args[1];
const opt = { stems: {} };
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--events') opt.events = args[++i];
  else if (args[i] === '--stem') { const [k, v] = args[++i].split('='); opt.stems[k] = v; }
  else if (args[i] === '--gain') opt.gain = +args[++i];
}
const pcm = p => execSync(`ffmpeg -loglevel error -i "${p}" -ac 1 -ar 44100 -f f32le -`, { maxBuffer: 1 << 30 });
(async () => {
  const assets = {};
  const bdir = path.join(__dirname, 'breaks');
  if (fs.existsSync(bdir)) for (const f of fs.readdirSync(bdir)) if (f.endsWith('.mp3')) assets['break/' + f.replace('.mp3', '')] = pcm(path.join(bdir, f));
  for (const [k, v] of Object.entries(opt.stems)) assets['stem/' + k] = pcm(v);
  const info = fs.existsSync(path.join(bdir, 'break_info.json')) ? fs.readFileSync(path.join(bdir, 'break_info.json'), 'utf8') : '{}';
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.route('http://song.local/**', r => {
    const u = r.request().url().replace('http://song.local/', '');
    if (u === '' || u === 'index.html') return r.fulfill({ body: '<!doctype html><title>render</title>', contentType: 'text/html' });
    const a = assets[decodeURIComponent(u)]; return a ? r.fulfill({ body: a, contentType: 'application/octet-stream' }) : r.fulfill({ status: 404 });
  });
  await pg.goto('http://song.local/');
  await pg.evaluate(([names, info]) => { window.ASSET_NAMES = names; window.BREAK_INFO = JSON.parse(info); }, [Object.keys(assets), info]);
  await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, file), 'utf8') + `
    async function loadAsset(name, ctx) { // raw mono float PCM -> AudioBuffer
      const r = await fetch('http://song.local/' + encodeURIComponent(name)); const f = new Float32Array(await r.arrayBuffer());
      const b = ctx.createBuffer(1, f.length, 44100); b.copyToChannel(f, 0); return b;
    }` });
  if (opt.events) {
    const ev = await pg.evaluate(() => guitarEvents());
    fs.writeFileSync(opt.events, JSON.stringify(ev)); await b.close(); console.log('wrote', opt.events); return;
  }
  const r = await pg.evaluate(() => renderSong());
  await b.close();
  if (errs.length) { console.log(errs); process.exit(1); }
  if (r.drums) fs.writeFileSync(path.join(__dirname, 'stems', 'drums.json'), JSON.stringify(r.drums));
  const wav = path.join(__dirname, file.replace(/\.js$/, '.wav')), mp3 = path.join(__dirname, title + '.mp3');
  fs.writeFileSync(wav, Buffer.from(r.wav, 'base64'));
  execSync(`ffmpeg -y -loglevel error -i "${wav}" -af "volume=${opt.gain == null ? 3 : opt.gain}dB,alimiter=limit=0.89:level=false" -codec:a libmp3lame -b:a 192k -metadata title="${title}" -metadata artist="Emberwake" "${mp3}"`);
  fs.unlinkSync(wav);
  console.log('rendered', r.seconds.toFixed(1) + 's', 'raw peak', r.peak.toFixed(2), '->', mp3);
})();
