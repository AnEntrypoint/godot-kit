'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { execSync } = require('child_process');

const GODOT_VERSION = '4.6-stable';
const CFG_DIR = path.join(os.homedir(), '.godot-kit');
const CFG_PATH = path.join(CFG_DIR, 'config.json');
const PLATFORM_ASSETS = {
  win32: `Godot_v${GODOT_VERSION}_win64.exe.zip`,
  linux: `Godot_v${GODOT_VERSION}_linux.x86_64.zip`,
  darwin: `Godot_v${GODOT_VERSION}_macos.universal.zip`
};

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')); } catch { return {}; }
}

function writeConfig(cfg) {
  fs.mkdirSync(CFG_DIR, { recursive: true });
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function findGodot(explicitPath) {
  if (explicitPath && explicitPath !== 'godot') return explicitPath;
  const cfg = readConfig();
  if (cfg.godotPath && fs.existsSync(cfg.godotPath)) return cfg.godotPath;
  const exeName = process.platform === 'win32' ? 'godot.exe' : 'godot';
  const p = path.join(CFG_DIR, exeName);
  if (fs.existsSync(p)) return p;
  try { execSync('godot --version', { stdio: 'pipe' }); return 'godot'; } catch {}
  try { execSync('godot4 --version', { stdio: 'pipe' }); return 'godot4'; } catch {}
  return null;
}

function followRedirect(url, cb, depth = 0) {
  if (depth > 10) return cb(new Error('Too many redirects'), null);
  const u = new URL(url);
  https.get({ hostname: u.hostname, path: u.pathname + (u.search || ''), headers: { 'User-Agent': 'godot-kit/1.0' } }, (res) => {
    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
      res.destroy();
      const loc = res.headers.location.startsWith('http') ? res.headers.location : `https://${u.hostname}${res.headers.location}`;
      followRedirect(loc, cb, depth + 1);
    } else if (res.statusCode >= 400) {
      res.destroy();
      cb(new Error(`HTTP ${res.statusCode} for ${url}`), null);
    } else cb(null, res);
  }).on('error', e => cb(e, null));
}

const SPINNER = ['|', '/', '-', '\\'];
let _lastPct = -1;
let _spinIdx = 0;
const _isTTY = process.stdout.isTTY;
const _milestones = new Set();
const mb = n => (n / 1024 / 1024).toFixed(1);

function renderProgress(label, received, total) {
  if (total > 0) {
    const pct = Math.floor(received / total * 100);
    if (pct === _lastPct) return;
    _lastPct = pct;
    const filled = Math.floor(pct / 5);
    const bar = '='.repeat(filled) + (pct < 100 ? '>' : '=') + ' '.repeat(Math.max(0, 19 - filled));
    if (_isTTY) {
      process.stdout.write(`\r\x1b[KDownloading ${label} [${bar}] ${pct}% (${mb(received)}/${mb(total)} MB)`);
    } else {
      const milestone = Math.floor(pct / 25) * 25;
      if (milestone > 0 && !_milestones.has(milestone)) { _milestones.add(milestone); console.log(`Downloading ${label} ${milestone}% (${mb(received)}/${mb(total)} MB)`); }
    }
  } else {
    _spinIdx = (_spinIdx + 1) % 4;
    if (_isTTY) {
      process.stdout.write(`\r\x1b[KDownloading ${label} ${SPINNER[_spinIdx]} ${mb(received)} MB received`);
    } else {
      const mibReceived = Math.floor(received / 1024 / 1024);
      if (mibReceived > 0 && mibReceived % 50 === 0 && !_milestones.has(mibReceived)) { _milestones.add(mibReceived); console.log(`Downloading ${label} ${mibReceived} MB received`); }
    }
  }
}

async function downloadEngine() {
  const assetFile = PLATFORM_ASSETS[process.platform];
  if (!assetFile) throw new Error(`Unsupported platform: ${process.platform}`);
  const url = `https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/${assetFile}`;
  const zipPath = path.join(CFG_DIR, assetFile);
  fs.mkdirSync(CFG_DIR, { recursive: true });
  _lastPct = -1; _spinIdx = 0; _milestones.clear();
  await new Promise((resolve, reject) => {
    followRedirect(url, (err, res) => {
      if (err || !res) return reject(err || new Error('No response'));
      const total = parseInt(res.headers['content-length'] || '0');
      let received = 0;
      const out = fs.createWriteStream(zipPath);
      res.on('data', (chunk) => { received += chunk.length; out.write(chunk); renderProgress(`Godot ${GODOT_VERSION}`, received, total); });
      res.on('end', () => { out.end(); resolve(); });
      res.on('error', reject);
    });
  });
  if (_isTTY) process.stdout.write('\n');
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${CFG_DIR}' -Force"`, { stdio: 'ignore' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${CFG_DIR}"`, { stdio: 'ignore' });
  }
  fs.unlinkSync(zipPath);
  const files = fs.readdirSync(CFG_DIR).filter(f => {
    const p = path.join(CFG_DIR, f);
    return fs.statSync(p).isFile() && (f.startsWith('Godot') || f === 'godot.exe' || f === 'godot');
  });
  const godotPath = files.length ? path.join(CFG_DIR, files[0]) : null;
  if (!godotPath) throw new Error('Could not find extracted Godot executable.');
  if (process.platform !== 'win32') execSync(`chmod +x "${godotPath}"`);
  const cfg = readConfig();
  cfg.godotPath = godotPath;
  writeConfig(cfg);
  console.log(`Downloaded to ${godotPath}`);
  return godotPath;
}

async function downloadExportTemplates() {
  const url = `https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/Godot_v${GODOT_VERSION}_export_templates.tpz`;
  const tpzPath = path.join(CFG_DIR, `Godot_v${GODOT_VERSION}_export_templates.tpz`);
  fs.mkdirSync(CFG_DIR, { recursive: true });
  _lastPct = -1; _spinIdx = 0; _milestones.clear();
  await new Promise((resolve, reject) => {
    followRedirect(url, (err, res) => {
      if (err || !res) return reject(err || new Error('No response'));
      const total = parseInt(res.headers['content-length'] || '0');
      let received = 0;
      const out = fs.createWriteStream(tpzPath);
      res.on('data', (chunk) => { received += chunk.length; out.write(chunk); renderProgress(`Godot ${GODOT_VERSION} export templates`, received, total); });
      res.on('end', () => { out.end(); resolve(); });
      res.on('error', reject);
    });
  });
  if (_isTTY) process.stdout.write('\n');
  const home = os.homedir();
  const templatesBase = process.platform === 'win32'
    ? path.join(home, 'AppData', 'Roaming', 'Godot', 'export_templates')
    : process.platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support', 'Godot', 'export_templates')
      : path.join(home, '.local', 'share', 'godot', 'export_templates');
  const destDir = path.join(templatesBase, GODOT_VERSION);
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${tpzPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'ignore' });
  } else {
    execSync(`unzip -o "${tpzPath}" -d "${destDir}"`, { stdio: 'ignore' });
  }
  fs.unlinkSync(tpzPath);
  const subdir = path.join(destDir, 'templates');
  if (fs.existsSync(subdir)) {
    for (const f of fs.readdirSync(subdir)) fs.renameSync(path.join(subdir, f), path.join(destDir, f));
    fs.rmdirSync(subdir);
  }
  console.log(`Downloaded to ${destDir}`);
}

module.exports = { GODOT_VERSION, CFG_DIR, CFG_PATH, readConfig, writeConfig, findGodot, downloadEngine, downloadExportTemplates };
