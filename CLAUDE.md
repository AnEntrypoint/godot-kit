# godot-kit

npm package: `godot-kit` (bin: `godot-kit` -> `bin/install.js`). Installs an Agent Skill into an existing Godot project — no CLI binary, no scaffolded demo game.
Published automatically on push to master via `.github/workflows/publish.yml`.

## Structure
- `bin/install.js` — installs `.claude/skills/godot-dev/` + `addons/repl_bridge/` + `addons/godot_kit_bridge/` into the target project, wires `project.godot`
- `skills/godot-dev/SKILL.md` — agent-facing instructions (Agent Skills spec: https://agentskills.io)
- `skills/godot-dev/assets/repl_bridge.gd` — game-runtime HTTP server GDScript (port 6009), copied verbatim by install.js
- `skills/godot-dev/assets/editor_http.gd`, `plugin.gd`, `plugin.cfg` — editor HTTP server GDScript (port 6008)
- `skills/godot-dev/references/game-api.md` — port 6009 endpoint table
- `skills/godot-dev/references/editor-api.md` — port 6008 endpoint table
- `skills/godot-dev/references/gdscript-4.6.md` — GDScript 4.6 syntax/API reference
- `skills/godot-dev/references/migration-4x.md` — Godot 3.x -> 4.6 migration tables
- `lang/gdscript.js` — gm-skill lang plugin: `exec:gdscript` routes to game HTTP bridge (single expr) or headless `godot` binary (multi-line); LSP via gdlint

## Ports
| Port | What | Source |
|------|------|--------|
| 6007 | Godot's own TCP remote debugger | Godot built-in |
| 6008 | Editor HTTP API | skills/godot-dev/assets/editor_http.gd |
| 6009 | Game HTTP API | skills/godot-dev/assets/repl_bridge.gd |

## Editing the GDScript assets
`skills/godot-dev/assets/*.gd` are the canonical source — real `.gd` files, not JS-embedded strings. Edit them directly; `install.js` copies them byte-for-byte into the target project. `references/game-api.md`/`editor-api.md` are hand-maintained lookup tables of their HTTP routes — keep in sync when adding/removing an endpoint.

Verify install.js output after changes:
```bash
node -e "
const fs=require('fs'),os=require('os'),path=require('path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gk-'));
fs.writeFileSync(path.join(tmp,'project.godot'),'[application]\nconfig/features=PackedStringArray(\"4.6\")\n');
require('child_process').execFileSync(process.execPath,['bin/install.js',tmp],{stdio:'inherit'});
console.log(fs.readdirSync(tmp));
"
```

## Tests
`npm test` runs `node test.js` — one real-execution witness (no mocks): installs into a fresh temp dir, asserts every file lands and `project.godot` gets wired, then (if a `godot`/`GODOT_BIN` binary is reachable) runs real GDScript headlessly through it and checks the output. No `test/` directory, no assertion framework — see `test.js` at repo root.

## Publish
Push to master. CI bumps version to `1.0.<timestamp>`, commits `package.json` + `package-lock.json`, publishes to npm. Requires `NPM_TOKEN` secret in GitHub repo settings.

## Language Plugins (lang/)
`lang/gdscript.js` extends gm-skill with `exec:gdscript` runtime support and LSP context, for driving a Godot project from within gm-skill sessions (separate from the `godot-dev` Agent Skill above, which targets any agent via the Agent Skills spec).

- `lang/SPEC.md` — plugin interface specification
- `lang/loader.js` — `loadLangPlugins(projectDir)` used by hooks
- `lang/gdscript.js` — single-expr routes to game HTTP bridge port 6009; multi-line writes a `SceneTree`/`_init()`/`quit()` wrapper and runs it via `godot --headless --script ... --quit` (binary resolved from PATH or `GODOT_BIN` env var — no bundled downloader)

Plugin shape: `{ id, exec: { match, run }, lsp?, context?, extensions? }`

Windows note: `gdlint`/`gdformat`/`godot` may be `.cmd`/`.exe` PATH shims (npm/pip console scripts) that a bare `execFileSync(name, args)` can't resolve without `shell: true` — every spawn in `lang/gdscript.js` sets `shell: process.platform === 'win32'`.
