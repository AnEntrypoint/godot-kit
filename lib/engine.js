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
    } else cb(null, res);
  }).on('error', e => cb(e, null));
}

async function downloadEngine() {
  const assetFile = PLATFORM_ASSETS[process.platform];
  if (!assetFile) throw new Error(`Unsupported platform: ${process.platform}`);
  const url = `https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/${assetFile}`;
  const zipPath = path.join(CFG_DIR, assetFile);
  fs.mkdirSync(CFG_DIR, { recursive: true });
  console.log(`Downloading Godot ${GODOT_VERSION}...`);
  console.log(`From: ${url}`);
  await new Promise((resolve, reject) => {
    followRedirect(url, (err, res) => {
      if (err || !res) return reject(err || new Error('No response'));
      const total = parseInt(res.headers['content-length'] || '0');
      let received = 0;
      const out = fs.createWriteStream(zipPath);
      res.on('data', (chunk) => {
        received += chunk.length;
        out.write(chunk);
        if (total > 0) {
          const pct = Math.round(received / total * 100);
          process.stdout.write(`\rProgress: ${pct}% (${Math.round(received/1024/1024)}/${Math.round(total/1024/1024)} MB)  `);
        }
      });
      res.on('end', () => { out.end(); console.log('\nDownload complete.'); resolve(); });
      res.on('error', reject);
    });
  });
  console.log('Extracting...');
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${CFG_DIR}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${CFG_DIR}"`, { stdio: 'inherit' });
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
  console.log(`Godot installed to: ${godotPath}`);
  console.log(`Config: ${CFG_PATH}`);
  return godotPath;
}

module.exports = { GODOT_VERSION, CFG_DIR, CFG_PATH, readConfig, writeConfig, findGodot, downloadEngine };
