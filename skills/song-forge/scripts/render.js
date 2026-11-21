// song-forge renderer: runs a song file's renderSong() in headless Chromium (Web Audio, OfflineAudioContext) and
// writes a finished MP3 (or a raw WAV for stem export).
//
// usage: node render.js <song.js> "<Title>" [options]
//   --events FILE          export the song's notes (guitarEvents()) as JSON and stop
//   --stem NAME=FILE       serve a recorded stem to the song as 'stem/NAME' (repeat)
//   --breaks DIR           breakbeat folder (*.mp3 + break_info.json); default: <song dir>/breaks
//   --out DIR              where the MP3 goes; default: the song's folder
//   --gain DB              output gain before the final limiter (default 3)
//   --level FROM:UNTIL     run the slow leveler (level.py) on the mix between those seconds
//   --dip FROM:UNTIL:DB    leveler: keep that section DB quieter (repeat)
//   --ceiling DB           final limiter ceiling in dBFS (default -2; -2.5 for more true-peak headroom)
//   --free FROM:UNTIL      leveler: hands off there, the mix shapes it (repeat)
//   --artist NAME --album NAME   tags for the MP3
//   --solo PART|all|drums  stem export: render one part (master compressor bypassed)
//   --norm X               stem export: fixed output scale (shared by all stems)
//   --wav-out FILE         write the raw 16-bit WAV there and stop (no leveler, no limiter, no MP3)
// Stereo stems are also served per channel as 'stem/NAME@L' and 'stem/NAME@R' (mono 'stem/NAME' as before).
// The page gets: window.ASSET_NAMES, window.BREAK_INFO, window.SOLO, window.SOLO_NORM, and loadAsset(name, ctx).
// If renderSong() returns { drums }, it is written to <song dir>/stems/drums.json (for visualize.py / export_midi.py).
// If it returns { dives: [[t0, t1], ...] }, those windows get a tape-stop pitch dive (tapestop.py) before the limiter.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync, execFileSync } = require('child_process');
const args = process.argv.slice(2), file = path.resolve(args[0]), title = args[1] || path.basename(file, '.js');
const songDir = path.dirname(file);
const opt = { stems: {}, dips: [], free: [] };
for (let i = 2; i < args.length; i++) {
  const a = args[i], v = () => args[++i];
  if (a === '--events') opt.events = v();
  else if (a === '--stem') { const [k, f] = v().split('='); opt.stems[k] = f; }
  else if (a === '--breaks') opt.breaks = v();
  else if (a === '--out') opt.out = v();
  else if (a === '--gain') opt.gain = +v();
  else if (a === '--level') opt.level = v();
  else if (a === '--dip') opt.dips.push(v());
  else if (a === '--ceiling') opt.ceiling = parseFloat(v());
  else if (a === '--free') opt.free.push(v());
  else if (a === '--artist') opt.artist = v();
  else if (a === '--album') opt.album = v();
  else if (a === '--solo') opt.solo = v();
  else if (a === '--norm') opt.norm = +v();
  else if (a === '--wav-out') opt.wavOut = v();
  else { console.error('unknown option', a); process.exit(2); }
}
const pcm = p => execSync(`ffmpeg -loglevel error -i "${p}" -ac 1 -ar 44100 -f f32le -`, { maxBuffer: 1 << 30 });
// one channel of a stereo file (for 'stem/NAME@L' / '@R': stereo instruments keep their image)
const pcmCh = (p, ch) => execSync(`ffmpeg -loglevel error -i "${p}" -af "pan=mono|c0=${ch}" -ar 44100 -f f32le -`, { maxBuffer: 1 << 30 });
const channels = p => { try { return +execSync(`ffprobe -v error -select_streams a:0 -show_entries stream=channels -of csv=p=0 "${p}"`).toString().trim(); } catch (e) { return 1; } };
(async () => {
  const assets = {};
  const bdir = path.resolve(opt.breaks || path.join(songDir, 'breaks'));
  if (fs.existsSync(bdir)) for (const f of fs.readdirSync(bdir)) if (/\.(mp3|wav|flac|ogg)$/i.test(f)) assets['break/' + f.replace(/\.[^.]+$/, '')] = pcm(path.join(bdir, f));
  for (const [k, f] of Object.entries(opt.stems)) { assets['stem/' + k] = pcm(path.resolve(f));
    if (channels(path.resolve(f)) === 2) { assets['stem/' + k + '@L'] = pcmCh(path.resolve(f), 'c0'); assets['stem/' + k + '@R'] = pcmCh(path.resolve(f), 'c1'); } }
  const info = fs.existsSync(path.join(bdir, 'break_info.json')) ? fs.readFileSync(path.join(bdir, 'break_info.json'), 'utf8') : '{}';
  const b = await chromium.launch();
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e.stack || e)));
  await pg.route('http://song.local/**', r => {
    const u = r.request().url().replace('http://song.local/', '');
    if (u === '' || u === 'index.html') return r.fulfill({ body: '<!doctype html><title>render</title>', contentType: 'text/html' });
    const a = assets[decodeURIComponent(u)]; return a ? r.fulfill({ body: a, contentType: 'application/octet-stream' }) : r.fulfill({ status: 404 });
  });
  await pg.goto('http://song.local/');
  await pg.evaluate(([names, info, solo, norm]) => { window.ASSET_NAMES = names; window.BREAK_INFO = JSON.parse(info); window.SOLO = solo; window.SOLO_NORM = norm; },
    [Object.keys(assets), info, opt.solo || null, opt.norm || null]);
  await pg.addScriptTag({ content: fs.readFileSync(file, 'utf8') + `
    async function loadAsset(name, ctx) { // raw mono float PCM -> AudioBuffer
      const r = await fetch('http://song.local/' + encodeURIComponent(name)); const f = new Float32Array(await r.arrayBuffer());
      const b = ctx.createBuffer(1, Math.max(1, f.length), 44100); b.copyToChannel(f, 0); return b;
    }` });
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  if (opt.events) {
    const ev = await pg.evaluate(() => guitarEvents());
    fs.writeFileSync(path.resolve(opt.events), JSON.stringify(ev)); await b.close(); console.log('wrote', opt.events); return;
  }
  const r = await pg.evaluate(() => renderSong());
  await b.close();
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  if (r.drums && !opt.solo) { const sd = path.join(songDir, 'stems'); if (fs.existsSync(sd)) fs.writeFileSync(path.join(sd, 'drums.json'), JSON.stringify(r.drums)); }
  if (opt.wavOut) { fs.writeFileSync(path.resolve(opt.wavOut), Buffer.from(r.wav, 'base64')); console.log('wrote', opt.wavOut, 'peak', r.peak.toFixed(3)); return; }
  const outDir = path.resolve(opt.out || songDir), wav = path.join(outDir, '.render_tmp.wav'), mp3 = path.join(outDir, title.replace(/[\\/:*?"<>|]/g, '').replace(/\.$/, '') + '.mp3');
  fs.writeFileSync(wav, Buffer.from(r.wav, 'base64'));
  if (r.dives && r.dives.length) execSync(`python3 "${path.join(__dirname, 'tapestop.py')}" "${wav}" "${wav}" ${r.dives.map(([a, b]) => a.toFixed(3) + ':' + b.toFixed(3)).join(' ')}`, { stdio: 'inherit' });   // tape-stop dives the song asked for
  if (opt.level) {
    const [a0, a1] = opt.level.split(':');
    execSync(`python3 "${path.join(__dirname, 'level.py')}" "${wav}" "${wav}" --hold-from ${a0} --hold-until ${a1}` +
      opt.dips.map(d => ' --dip ' + d).join('') + opt.free.map(d => ' --free ' + d).join(''), { stdio: 'inherit' });
  }
  // tags go to ffmpeg as plain arguments (no shell), so a title with $ or ` is written as typed
  const tags = ['-metadata', 'title=' + title, ...(opt.artist ? ['-metadata', 'artist=' + opt.artist] : []), ...(opt.album ? ['-metadata', 'album=' + opt.album] : [])];
  // limiter ceiling (default -2 dBFS; --ceiling DB): MP3/AAC encoding adds ~1 dB of inter-sample peaks, so -2 to -2.5 dBFS
  // keeps true peaks at or under -1 dBTP
  const lim = Math.pow(10, (opt.ceiling == null ? -2 : opt.ceiling) / 20).toFixed(4);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', `volume=${opt.gain == null ? 3 : opt.gain}dB,alimiter=limit=${lim}:level=false`, '-codec:a', 'libmp3lame', '-b:a', '192k', ...tags, mp3]);
  fs.unlinkSync(wav);
  console.log('rendered', r.seconds.toFixed(1) + 's', 'raw peak', r.peak.toFixed(2), '->', mp3);
})();
