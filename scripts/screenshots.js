'use strict';
// README screenshots: real renders of the app, never mockups.
// Loads the local bundle (byte-identical to deployed) via file:// — the VM
// Chromium cannot reach the live site (egress proxy auth), so the live URL
// route is dead in this environment. Mobile (390px): Ideas tab on a fresh
// profile. Desktop (1440px): Scorecard tab after driving three sample ideas
// through the REAL UI (quick-add, seal, check in) — the Scorecard is empty
// on a fresh profile, so sample check-ins demonstrate the breakdown. The
// README caption discloses the sample data. The file:// save-failure banner
// (storage is unavailable on file://) is dismissed before the desktop shot —
// it is a file:// artifact, not part of the real product.
// Usage: node scripts/screenshots.js

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 19320 + (process.pid % 500);
const PROFILE = path.join('/tmp', 'lens-shots-profile-' + process.pid);
const BUNDLE_URL = 'file://' + path.join(ROOT, 'index.html');

function getJson(route) {
  return new Promise((resolve, reject) => {
    http.get({ port: PORT, path: route }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
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
function evalJS(expr) {
  return send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error('JS exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(expr, label, timeoutMs) {
  const start = Date.now();
  for (;;) {
    try { if (await evalJS(expr)) return; } catch (e) {}
    if (Date.now() - start > timeoutMs) throw new Error('timed out: ' + label);
    await sleep(250);
  }
}
function clickNav(label) {
  return evalJS(`(function(){var b=Array.from(document.querySelectorAll('button')).find(function(x){return x.textContent.trim()==='${label}';}); if(b){b.click(); return true;} return false;})()`);
}
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

async function driveIdea(name, tickers, belief, falsify, spot, conv, reason, outcome, note, priceNow) {
  await evalJS(`(function(){var n=document.getElementById('qa-name'); var t=document.getElementById('qa-tickers'); if(!n) return false; n.value='${esc(name)}'; t.value='${esc(tickers)}'; return true;})()`);
  await clickNav('Add idea');
  await waitFor(`!!document.querySelector('textarea.thesis-belief')`, 'detail opens', 5000);
  await evalJS(`(function(){var b=document.querySelector('textarea.thesis-belief'); var f=document.querySelector('.thesis-falsify'); var p=document.querySelector('.thesis-price'); if(!b||!f) return false; b.value='${esc(belief)}'; b.dispatchEvent(new Event('input',{bubbles:true})); f.value='${esc(falsify)}'; f.dispatchEvent(new Event('input',{bubbles:true})); if(p){p.value='${spot}'; p.dispatchEvent(new Event('input',{bubbles:true}));} return true;})()`);
  await sleep(1000);
  await evalJS(`(function(){var cs=document.querySelectorAll('.conv-btn'); if(cs.length<${conv}) return false; cs[${conv - 1}].click(); return true;})()`);
  await evalJS(`(function(){var s=document.querySelector('[data-action="thesis-save"]'); if(!s) return false; s.click(); return true;})()`);
  await waitFor(`!!document.querySelector('.sealed-words')`, 'seal', 5000);
  await evalJS(`(function(){var b=document.querySelector('#idea-detail [data-action="checkin-now"]'); if(!b) return false; b.click(); return true;})()`);
  await waitFor(`!!document.querySelector('#idea-detail .review-form')`, 'review form', 5000);
  await evalJS(`(function(){var f=document.querySelector('#idea-detail .review-form'); if(!f) return false; var rc=Array.from(f.querySelectorAll('.chip')).find(function(c){return c.textContent.indexOf('${reason}')===0;}); if(rc) rc.click(); var oc=Array.from(f.querySelectorAll('.chip')).find(function(c){return c.textContent.indexOf('${outcome}')===0;}); if(oc) oc.click(); var ta=f.querySelector('textarea'); if(ta){ta.value='${esc(note)}';} var pi=f.querySelector('input[type="number"]'); if(pi){pi.value='${priceNow}'; pi.dispatchEvent(new Event('input',{bubbles:true}));} return true;})()`);
  await evalJS(`(function(){var f=document.querySelector('#idea-detail .review-form'); var s=Array.from(f.querySelectorAll('button')).find(function(b){return b.textContent.trim()==='Save check-in';}); if(!s) return false; s.click(); return true;})()`);
  await sleep(400);
  await clickNav('Ideas');
  await sleep(400);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, BUNDLE_URL,
  ], { stdio: 'ignore' });
  const stop = () => { try { chrome.kill('SIGKILL'); } catch (e) {} };
  try {
    let targets;
    for (let i = 0; i < 40 && !(targets || []).some((t) => t.type === 'page' && t.url.startsWith('file://')); i++) {
      await sleep(250);
      try { targets = await getJson('/json/list'); } catch (e) {}
    }
    const page = (targets || []).find((t) => t.type === 'page' && t.url.startsWith('file://'));
    if (!page) throw new Error('bundle page target not found');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending[m.id]) { const p = pending[m.id]; delete pending[m.id]; p.resolve(m.result); }
    };
    await new Promise((r) => { ws.onopen = r; });
    await send('Page.enable', {});
    await send('Runtime.enable', {});
    await waitFor(`Array.from(document.querySelectorAll('button')).some(function(b){return b.textContent.trim()==='Ideas';})`, 'app boot', 15000);

    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await clickNav('Ideas');
    await sleep(600);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'mobile.png'), Buffer.from(shot.data, 'base64'));
    console.log('wrote mobile.png (390px, Ideas, fresh profile)');

    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await clickNav('Ideas');
    await sleep(400);
    await driveIdea('Sample: Northwind AI', 'NWA', 'Sample thesis: AI infrastructure keeps compounding.', 'Sample falsify: growth stalls for two quarters.', 120, 5, 'Yes', 'Still holds up', 'Still holds up.', 168);
    await driveIdea('Sample: Harbor Robotics', 'HBR', 'Sample thesis: warehouse robots go mainstream.', 'Sample falsify: unit economics never work.', 85, 4, 'It moved', 'Still holds up', 'Moved, but for other reasons.', 79);
    await driveIdea('Sample: Bluepeak Energy', 'BLE', 'Sample thesis: grid storage demand grows.', 'Sample falsify: policy support reverses.', 210, 3, 'Yes', 'Done with this one', 'Question answered.', 245);
    await evalJS(`(function(){var n=document.getElementById('save-failure-notice'); if(n){var b=Array.from(n.querySelectorAll('button')).find(function(x){return x.textContent.trim()==='Dismiss';}); if(b) b.click();} return true;})()`);
    await clickNav('Scorecard');
    await sleep(600);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'desktop.png'), Buffer.from(shot.data, 'base64'));
    console.log('wrote desktop.png (1440px, Scorecard, sample data via real UI)');

    ws.close();
    stop();
    console.log('screenshots done');
  } catch (e) {
    console.error('screenshots FAILED: ' + e.message);
    stop();
    process.exit(1);
  }
})();
