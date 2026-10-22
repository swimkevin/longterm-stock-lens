'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function runSuite(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'tests', file)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    let okCount = 0;
    let failed = false;
    const consume = (data) => {
      buf += data.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        process.stdout.write(line + '\n');
        if (/^ {0,3}ok - /.test(line)) okCount++;
      }
    };
    child.stdout.on('data', consume);
    child.stderr.on('data', (d) => { failed = true; process.stderr.write(d.toString()); });
    child.on('close', (code) => {
      if (buf.length) {
        process.stdout.write(buf + '\n');
        if (/^ {0,3}ok - /.test(buf)) okCount++;
      }
      resolve({ file, okCount, failed: failed || code !== 0, code });
    });
  });
}

(async () => {
  const results = [];
  for (const f of ['smoke.js', 'edge-probe.js']) results.push(await runSuite(f));
  const total = results.reduce((n, r) => n + r.okCount, 0);
  const [smoke, edge] = results;

  if (results.some(r => r.failed)) {
    console.error('RUNNER: suite failed — badge/count checks skipped');
    process.exit(1);
  }

  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const badge = readme.match(/tests-(\d+)%20assertions/);
  const split = readme.match(/\(smoke (\d+) \+ edge probes (\d+)\)/);
  const problems = [];
  if (!badge) problems.push('tests badge missing from README');
  else if (parseInt(badge[1], 10) !== total) problems.push('badge says ' + badge[1] + ', suites counted ' + total);
  if (!split) problems.push('per-suite split missing from README');
  else if (parseInt(split[1], 10) !== smoke.okCount || parseInt(split[2], 10) !== edge.okCount) {
    problems.push('README split (' + split[1] + '+' + split[2] + ') disagrees with suites (' + smoke.okCount + '+' + edge.okCount + ')');
  }
  if (problems.length) {
    problems.forEach(p => console.error('RUNNER FAIL - ' + p));
    process.exit(1);
  }
  console.log('RUNNER: README badge and split match runtime counts (' + total + ' = ' + smoke.okCount + ' + ' + edge.okCount + ')');
})().catch((e) => { console.error(e); process.exit(1); });
