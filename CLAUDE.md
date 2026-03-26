# godot-kit

npm package: `godot-kit` (bin: godot-kit scaffolder) + `godot-dev` (bin: CLI).
Published automatically on push to master via .github/workflows/publish.yml.

## Structure
- `bin/create.js` — scaffold entrypoint (`bunx godot-kit <dir>`)
- `bin/cli.js` — `godot-dev` CLI (all commands)
- `lib/templates.js` — all boilerplate files written to new projects (includes CLAUDE.md)
- `lib/gd-repl-bridge.js` — GDScript autoload: game HTTP API on port 6009
- `lib/gd-editor-http.js` — GDScript editor plugin HTTP server on port 6008
- `lib/gd-plugin.js` — GDScript EditorPlugin wrapper
- `lib/engine.js` — Godot download/locate (~/.godot-kit/config.json)
- `lib/cli-game.js` — `godot-dev game *` commands (port 6009)
- `lib/cli-editor.js` — `godot-dev editor *` commands (port 6008)
- `lib/cli-debugger.js` — `godot-dev repl/inspect/logs/attach` (port 6007)
- `lib/http-client.js` — HTTP helpers for ports 6008/6009
- `lib/skills.js` — writes SKILL.md + IDE configs to scaffolded projects
- `lib/compat-checker.js` — Godot 3.x deprecated API scanner

## Ports
| Port | What | Source |
|------|------|--------|
| 6007 | TCP debugger | Godot built-in |
| 6008 | Editor HTTP API | lib/gd-editor-http.js |
| 6009 | Game HTTP API | lib/gd-repl-bridge.js |

## Editing GDScript templates
`lib/gd-*.js` files are JS strings containing GDScript. Tabs must be `\t` (escaped). Backticks and `${}` in GDScript content must be escaped.

Verify template output after changes:
```bash
node -e "const t=require('./lib/templates')('test'); console.log(Object.keys(t).join('\n'))"
```

## Tests
`npm test` runs `node --test test/*.test.js` (Node.js built-in test runner, no dependencies).
262 tests across 13 suites covering: protocol encode/decode, compat-checker patterns, scene-tree, templates, engine config, lang plugins, http-client, connection, debugger-client, gd-plugin, skills install, CLI help, and project scaffolding.

Caveat: `protocol.js` encodes large integers (>2^31) as 64-bit; `decodeVariant` returns `BigInt` for these — use `Number()` if you need a JS number, but beware precision loss.

## Publish
Push to master. CI bumps version to `1.0.<timestamp>`, commits `package.json` + `package-lock.json`, publishes to npm. Requires `NPM_TOKEN` secret in GitHub repo settings.

## Language Plugins (lang/)
Project-local language plugins extend gm-cc with `exec:<lang>` runtime support and LSP context.

- `lang/SPEC.md` — plugin interface specification
- `lang/loader.js` — `loadLangPlugins(projectDir)` used by hooks
- `lang/gdscript.js` — GDScript plugin: `exec:gdscript` routes to `godot-dev game eval` (single expr) or headless Godot (multi-line); LSP via gdlint

Plugin shape: `{ id, exec: { match, run }, lsp?, context?, extensions? }`

Hooks auto-discover plugins: pre-tool-use intercepts `exec:<lang>`, prompt-submit injects context + LSP diagnostics.