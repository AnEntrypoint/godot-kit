'use strict';

const { gameGet } = require('./http-client');

const LOG_H = 8;

function cls() { process.stdout.write('\x1b[2J\x1b[H'); }
function mv(r, c) { process.stdout.write(`\x1b[${r};${c}H`); }
function wr(s) { process.stdout.write(s); }
function box(r, c, w, h, title) {
  mv(r, c); wr('\x1b[36m+' + ('-'.repeat(w - 2)) + '+\x1b[0m');
  mv(r, c + 2); wr(`\x1b[36;1m ${title} \x1b[0m`);
  for (let i = 1; i < h - 1; i++) { mv(r + i, c); wr('\x1b[36m|\x1b[0m'); mv(r + i, c + w - 1); wr('\x1b[36m|\x1b[0m'); }
  mv(r + h - 1, c); wr('\x1b[36m+' + ('-'.repeat(w - 2)) + '+\x1b[0m');
}

function truncate(s, n) { return String(s).slice(0, n); }

function dims() {
  const W = process.stdout.columns || 120;
  const H = process.stdout.rows || 30;
  return { W, H, HALF: Math.floor(W / 2), TREE_H: H - LOG_H - 4 };
}

function renderTree(node, lines, depth, max, half) {
  if (lines.length >= max) return;
  const indent = '  '.repeat(depth);
  lines.push(truncate(`${indent}[${node.class}] ${node.name}`, half - 4));
  (node.children || []).forEach(c => renderTree(c, lines, depth + 1, max, half));
}

function renderPerf(perf, half) {
  const keys = ['fps','process_ms','physics_ms','memory_static','objects','nodes','draw_calls','video_mem'];
  return keys.map(k => truncate(`${k}: ${typeof perf[k] === 'number' ? perf[k].toFixed(1) : (perf[k] || 'N/A')}`, half - 4));
}

async function runDashboard() {
  if (!process.stdout.isTTY) { console.error('Dashboard requires a TTY terminal'); process.exit(1); }

  let treeLines = ['(loading...)'];
  let perfLines = ['(loading...)'];
  let logLines = ['(loading...)'];
  const seenLogs = new Set();
  const seenErrs = new Set();

  async function refresh() {
    try {
      const { HALF, TREE_H } = dims();
      const [tree, perf, logs, errs] = await Promise.all([
        gameGet('/tree').catch(() => null),
        gameGet('/perf').catch(() => null),
        gameGet('/logs').catch(() => null),
        gameGet('/errors').catch(() => null),
      ]);
      if (tree && tree.tree) { treeLines = []; renderTree(tree.tree, treeLines, 0, TREE_H - 2, HALF); }
      if (perf) perfLines = renderPerf(perf, HALF);
      if (logs && logs.logs) {
        logs.logs.forEach(l => { if (!seenLogs.has(l)) { seenLogs.add(l); logLines.push(l); } });
      }
      if (errs && errs.errors) {
        errs.errors.forEach(l => { if (!seenErrs.has(l)) { seenErrs.add(l); logLines.push('\x1b[31m' + l + '\x1b[0m'); } });
      }
      if (logLines.length > LOG_H - 2) logLines = logLines.slice(-(LOG_H - 2));
    } catch {}
    draw();
  }

  function draw() {
    const { W, H, HALF, TREE_H } = dims();
    cls();
    box(1, 1, HALF, TREE_H, 'Scene Tree');
    treeLines.slice(0, TREE_H - 2).forEach((l, i) => { mv(2 + i, 2); wr(truncate(l, HALF - 3)); });
    box(1, HALF + 1, HALF - 1, TREE_H, 'Performance');
    perfLines.slice(0, TREE_H - 2).forEach((l, i) => { mv(2 + i, HALF + 2); wr(truncate(l, HALF - 5)); });
    box(TREE_H + 1, 1, W - 1, LOG_H, 'Logs');
    logLines.slice(0, LOG_H - 2).forEach((l, i) => { mv(TREE_H + 2 + i, 2); wr(truncate(l, W - 5)); });
    mv(H - 1, 1); wr('\x1b[90m[q]uit  [r]efresh  godot-kit dashboard\x1b[0m');
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key) => {
    if (key === 'q' || key === '\u0003') {
      process.stdout.write('\x1b[?25h\x1b[2J\x1b[H');
      process.stdin.setRawMode(false);
      process.exit(0);
    }
    if (key === 'r') refresh();
  });

  if (process.platform !== 'win32') {
    process.on('SIGWINCH', () => draw());
  }

  process.stdout.write('\x1b[?25l');
  process.on('exit', () => process.stdout.write('\x1b[?25h'));

  await refresh();
  setInterval(refresh, 500);
}

module.exports = { runDashboard };
