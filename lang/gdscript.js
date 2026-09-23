'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

function isSingleExpr(code) {
	const t = code.trim();
	return !t.includes('\n') && !/\b(func|var|const|if|for|while|match|class|extends|return)\b/.test(t);
}

function httpPost(port, urlPath, body) {
	return new Promise((resolve, reject) => {
		const data = JSON.stringify(body);
		const opts = { hostname: '127.0.0.1', port, path: urlPath, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
		const req = http.request(opts, (res) => { let raw = ''; res.on('data', c => { raw += c; }); res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); } }); });
		req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
		req.on('error', reject);
		req.write(data);
		req.end();
	});
}

function godotBin() {
	return process.env.GODOT_BIN || (process.platform === 'win32' ? 'godot.exe' : 'godot');
}

async function run(code, cwd) {
	try {
		if (isSingleExpr(code)) {
			try {
				const res = await httpPost(6009, '/eval', { expr: code.trim() });
				return String(res.result !== undefined ? res.result : res.raw || JSON.stringify(res));
			} catch (_) {}
		}
		const tmp = path.join(os.tmpdir(), `gd_exec_${Date.now()}.gd`);
		const indented = code.trim().split('\n').map(l => '\t' + l).join('\n');
		fs.writeFileSync(tmp, `extends SceneTree\nfunc _init():\n${indented}\n\tquit()\n`);
		const ac = new AbortController();
		const timer = setTimeout(() => ac.abort(), 10000);
		try {
			const out = execFileSync(godotBin(), ['--headless', '--script', tmp, '--quit'], { cwd, signal: ac.signal, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
			return out;
		} finally {
			clearTimeout(timer);
			try { fs.unlinkSync(tmp); } catch (_) {}
		}
	} catch (e) {
		return String(e.message || e);
	}
}

function check(code, cwd) {
	const tmp = path.join(os.tmpdir(), `gdlint_${Math.random().toString(36).slice(2)}.gd`);
	try {
		fs.writeFileSync(tmp, code);
		let out = '';
		let errText = '';
		try { execFileSync('gdlint', [tmp], { encoding: 'utf8', shell: process.platform === 'win32' }); } catch (e) { out = e.stdout || ''; errText = e.stderr || e.message || ''; }
		const diagnostics = out.split('\n').reduce((acc, line) => {
			const m = line.match(/^.+:(\d+):\s+([EW])\d+:\s+(.+)$/);
			if (m) acc.push({ line: parseInt(m[1]), col: 0, severity: m[2] === 'E' ? 'error' : 'warning', message: m[3].trim() });
			return acc;
		}, []);
		if (!diagnostics.length && errText) {
			const pm = errText.match(/^(.*Unexpected token.+?at line (\d+), column (\d+)\.?)$/m);
			if (pm) diagnostics.push({ line: parseInt(pm[2]), col: parseInt(pm[3]), severity: 'error', message: pm[1].trim() });
		}
		return diagnostics;
	} catch (_) {
		return [];
	} finally {
		try { fs.unlinkSync(tmp); } catch (_) {}
	}
}

module.exports = {
	id: 'gdscript',
	extensions: ['.gd'],
	exec: {
		match: /^exec:gdscript/,
		run,
	},
	lsp: { check },
	context: `=== GDScript exec: support ===
exec:gdscript
<single expression or multi-line GDScript>

Single expressions are evaluated via game HTTP bridge (port 6009).
Multi-line code runs headlessly via the godot binary (--headless --script ... --quit).
Requires: game running for eval, or Godot binary on PATH (or GODOT_BIN env var) for headless.`,
};

