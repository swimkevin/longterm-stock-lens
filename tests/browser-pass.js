'use strict';
// Real-browser pass for the deployed bundle, per playbook rule 8 (VISUAL-QA FALLBACK).
// Self-contained: launches the VM's Chromium on a free remote-debugging port,
// loads file://<bundle>/index.html as the launch URL (never Page.navigate —
// Chrome 152 blocks localhost navigations initiated over CDP), drives the
// page via Runtime.evaluate, asserts zero console errors, and kills Chrome
// on exit. Screenshots land in $LENS_SHOTS_DIR (default /tmp/lens-shots)
// only when LENS_SHOTS=1.
// Usage: npm run browser-pass [bundle-dir]   (default: repo root)
// Screenshots land in $LENS_SHOTS_DIR (default /tmp/lens-shots) only when LENS_SHOTS=1.
//
// Selector gotchas, learned the hard way (2026-10-23):
// - The quick-add button is labeled "Add idea" and needs a name in #qa-name
//   first, or it correctly refuses to create the idea.
// - The belief textarea is textarea.thesis-belief, NOT the first textarea in
//   the detail (the first is #trend-why); filling the wrong one and clicking
//   Save correctly triggers the "write what you think first" validation.
// - Idea rows are .idea-row; counting wider selectors inflates the total.
// - quick-add opens the draft detail directly (documented fineprint); seal is
//   the Save button [data-action="thesis-save"], and success = .sealed-words.

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE = path.resolve(process.argv[2] || ROOT);
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 19310 + (process.pid % 500);
const PROFILE = path.join('/tmp', 'lens-profile-' + process.pid);
const SAVE_SHOTS = process.env.LENS_SHOTS === '1';

for (const f of ['index.html', 'app.js', 'styles.css']) {
  if (!fs.existsSync(path.join(BUNDLE, f))) {
    console.error('browser-pass: missing ' + f + ' in ' + BUNDLE);
    process.exit(2);
  }
}

function getJson(route) {
  return new Promise((resolve, reject) => {
    http.get({ port: PORT, path: route }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
function waitFor(cond, timeoutMs, label) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function tick() {
      Promise.resolve().then(cond).then((v) => {
        if (v) return resolve(v);
        if (Date.now() - start > timeoutMs) return reject(new Error('timed out: ' + label));
        setTimeout(tick, 250);
      }).catch(() => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timed out: ' + label));
        setTimeout(tick, 250);
      });
    })();
  });
}

let ws, msgId = 0;
const pending = {};
function send(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending[id] = { resolve, reject };
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const errors = [];
function evalJS(expr) {
  return send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error('JS exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  });
}

const results = [];
function check(name, fnBody) {
  return evalJS('(' + fnBody + ')()').then((v) => {
    const pass = !!(v && v.pass);
    results.push({ name, pass, detail: pass ? (v.note || 'ok') : JSON.stringify(v).slice(0, 400) });
  }).catch((e) => results.push({ name, pass: false, detail: 'eval error: ' + String(e.message).slice(0, 200) }));
}

function tabCheck(name) {
  return check('tab renders: ' + name, `function () {
    var tabs = Array.from(document.querySelectorAll('button')).filter(function (el) { return el.textContent.trim() === '${name}'; });
    if (!tabs.length) return { pass: false, note: 'tab button not found' };
    tabs[0].click();
    var h = document.querySelector('main h1');
    return { pass: true, note: h ? h.textContent.trim().slice(0, 60) : 'clicked' };
  }`);
}

let chrome = null;
function stopChrome() {
  try {
    if (chrome && !chrome.killed) chrome.kill('SIGKILL');
  } catch (e) { /* already gone */ }
  try {
    const pids = execFileSync('pgrep', ['-f', '[c]hrome.*' + PORT]).toString().trim().split('\n').filter(Boolean);
    pids.forEach((p) => { try { process.kill(Number(p), 'SIGKILL'); } catch (e) {} });
  } catch (e) { /* none left */ }
}

(async () => {
  chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE,
    'file://' + path.join(BUNDLE, 'index.html'),
  ], { stdio: 'ignore' });
  process.on('exit', stopChrome);

  const list = await waitFor(() => getJson('/json/list').then((l) => {
    const p = l.find((x) => x.type === 'page' && x.url.indexOf('file://') === 0);
    return p || null;
  }), 30000, 'chrome debugger page');
  ws = new WebSocket(list.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && pending[m.id]) {
      const p = pending[m.id]; delete pending[m.id];
      if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
    } else if (m.method === 'Runtime.consoleAPICalled') {
      const vals = (m.params.args || []).map((a) => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
      errors.push('CONSOLE-' + m.params.type + ': ' + vals.slice(0, 300));
    } else if (m.method === 'Runtime.exceptionThrown') {
      errors.push('EXCEPTION: ' + String(m.params.exceptionDetails.text || m.params.exceptionDetails).slice(0, 300));
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise((r) => setTimeout(r, 1500));

  for (const t of ['Profile', 'Ideas', 'Check-ins', 'Scorecard', 'Learn']) {
    await tabCheck(t);
  }

  await check('ideas wisdom quote present', `function () {
    var b = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Ideas'; });
    if (b) b.click();
    var q = document.querySelector('[class*=wisdom i], blockquote');
    return { pass: !!q, note: q ? q.textContent.trim().slice(0, 80) : 'no quote element' };
  }`);

  await check('quick-add opens draft detail, seal read-only', `function () {
    var b = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Ideas'; });
    if (b) b.click();
    var qa = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Add idea'; });
    if (!qa) return { pass: false, note: 'quick-add button not found' };
    var qaName = document.querySelector('#qa-name');
    if (!qaName) return { pass: false, note: '#qa-name input not found' };
    qaName.value = 'Browser Pass Test';
    qaName.dispatchEvent(new Event('input', { bubbles: true }));
    qa.click();
    var belief = document.querySelector('textarea.thesis-belief');
    if (!belief) return { pass: false, note: 'belief textarea not found in draft detail' };
    belief.value = 'Browser pass thesis: this stock looks durable.';
    belief.dispatchEvent(new Event('input', { bubbles: true }));
    var saveBtn = document.querySelector('[data-action="thesis-save"]');
    if (!saveBtn) return { pass: false, note: 'thesis save button not found' };
    saveBtn.click();
    var sealed = document.querySelector('.sealed-words');
    return { pass: !!sealed, note: sealed ? 'sealed read-only block visible' : 'sealed block missing' };
  }`);

  await check('ideas filter narrows and restores', `function () {
    var b = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Ideas'; });
    if (b) b.click();
    var filter = document.querySelector('#idea-filter');
    if (!filter) return { pass: false, note: 'filter input not found' };
    function rows() { return document.querySelectorAll('.idea-row').length; }
    var before = rows();
    filter.value = 'zzz-no-match-zzz';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    var narrowed = rows();
    filter.value = '';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    var restored = rows();
    return { pass: narrowed === 0 && restored === before && before >= 1, note: 'before=' + before + ' narrowed=' + narrowed + ' restored=' + restored };
  }`);

  await check('check-ins tab renders, badge element', `function () {
    var b = Array.from(document.querySelectorAll('button')).find(function (x) { return /check.?ins/i.test(x.textContent.trim()); });
    if (!b) return { pass: false, note: 'check-ins tab not found' };
    b.click();
    var badge = document.querySelector('#reviews-badge');
    var hidden = badge && badge.classList.contains('hidden');
    return { pass: !!badge, note: badge ? ('badge element present, hidden=' + hidden + ' (due count) | check-in content: ' + (document.body.textContent.indexOf('Check-in') >= 0)) : 'no #reviews-badge' };
  }`);

  await check('learn renders, accounts section reachable', `function () {
    var b = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Learn'; });
    if (!b) return { pass: false, note: 'learn tab not found' };
    b.click();
    var hasRoth = /Roth|Accounts/i.test(document.body.textContent);
    return { pass: hasRoth, note: hasRoth ? 'Roth/accounts copy present' : 'accounts section missing' };
  }`);

  await check('no sec.gov links, footer version present', `function () {
    var bad = Array.from(document.querySelectorAll('a')).filter(function (a) { return /sec\\.gov/i.test(a.href); });
    var ver = /v?\\d+\\.\\d+\\.\\d+/.test(document.body.textContent);
    return { pass: bad.length === 0 && ver, note: 'sec.gov links=' + bad.length + ' versionFound=' + ver };
  }`);

  await check('scorecard renders', `function () {
    var b = Array.from(document.querySelectorAll('button')).find(function (x) { return x.textContent.trim() === 'Scorecard'; });
    if (!b) return { pass: false, note: 'scorecard tab not found' };
    b.click();
    return { pass: true, note: 'scorecard opened' };
  }`);

  if (SAVE_SHOTS) {
    const dir = process.env.LENS_SHOTS_DIR || '/tmp/lens-shots';
    fs.mkdirSync(dir, { recursive: true });
    try {
      await evalJS(`(function(){var b=Array.from(document.querySelectorAll('button')).find(function(x){return x.textContent.trim()==='Profile';}); if(b)b.click(); return true;})()`);
      await new Promise((r) => setTimeout(r, 400));
      for (const name of ['profile', 'ideas', 'checkins', 'scorecard', 'learn']) {
        const want = name === 'checkins' ? 'check-ins' : name;
        await evalJS(`(function(){var b=Array.from(document.querySelectorAll('button')).find(function(x){return x.textContent.trim().toLowerCase()==='${want}';}); if(b)b.click(); return true;})()`);
        await new Promise((r) => setTimeout(r, 250));
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(shot.data, 'base64'));
      }
    } catch (e) {
      console.error('  WARN - screenshot pass failed: ' + String(e.message).slice(0, 200));
    }
  }

  ws.close();
  stopChrome();
  const passed = results.filter((r) => r.pass).length;
  console.log('BROWSER-PASS: ' + passed + '/' + results.length + ' checks, console errors: ' + errors.length);
  results.forEach((r) => console.log((r.pass ? '  ok' : '  FAIL') + ' - ' + r.name + ' | ' + r.detail));
  errors.slice(0, 10).forEach((e) => console.log('  ERR - ' + e));
  process.exit(results.every((r) => r.pass) && errors.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('BROWSER-PASS FATAL: ' + e.message);
  try { ws && ws.close(); } catch (x) {}
  stopChrome();
  process.exit(2);
});
