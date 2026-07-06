---
name: godot-dev
description: Debug and control a running Godot 4.x project via HTTP without a plugin marketplace or CLI binary — inspect/mutate the live scene tree, eval GDScript at runtime, drive the editor, lint/format/migrate GDScript. Use when working on any Godot project or .gd/.tscn/.tres/project.godot file, or when asked to debug, inspect, or control a running Godot game or editor.
license: MIT
---

# godot-dev

Construct two small HTTP servers inside the target Godot project (below), then talk to them with plain HTTP. No CLI binary, no editor plugin marketplace install — you write the GDScript once, Godot runs it.

## Setup (one-time per project)

1. Write `addons/repl_bridge/repl_bridge.gd` from `assets/repl_bridge.gd` (game-runtime HTTP server, port 6009).
2. Add to `project.godot` `[autoload]` section: `ReplBridge="*res://addons/repl_bridge/repl_bridge.gd"`.
3. Write `addons/godot_kit_bridge/plugin.cfg` and `.../editor_http.gd` and `.../plugin.gd` from `assets/` (editor HTTP server, port 6008).
4. Add to `project.godot` `[editor_plugins]` section: `enabled=PackedStringArray("res://addons/godot_kit_bridge/plugin.cfg")`.
5. Re-open the project in the editor (or `editor plugin-reload` if already open) so the autoload/plugin activate.

Full GDScript source for both servers: `assets/repl_bridge.gd`, `assets/editor_http.gd`, `assets/plugin.gd`, `assets/plugin.cfg`. Copy verbatim — don't reimplement from the endpoint tables below, they're a lookup, not a spec.

## Ports

| Port | Server | Active when |
|------|--------|-------------|
| 6009 | ReplBridge (game runtime) | game is running, ReplBridge autoload loaded |
| 6008 | GodotKitBridge (editor) | editor open, plugin enabled in `[editor_plugins]` |
| 6007 | Godot's own remote debugger (TCP, not HTTP) | game launched with `--remote-debug tcp://127.0.0.1:6007` |

Both HTTP servers can be active at once; they control different processes (running game vs. open editor).

## Talking to the servers

Plain HTTP, JSON body, JSON response. No auth, localhost only.

```bash
curl -s http://127.0.0.1:6009/tree                              # GET, no body
curl -s -X POST http://127.0.0.1:6009/eval -d '{"expr":"get_tree().paused"}'
curl -s -X POST http://127.0.0.1:6009/set -d '{"path":"/root/Level/Player","prop":"speed","value":500}'
```

Full endpoint list: `references/game-api.md` (port 6009), `references/editor-api.md` (port 6008).

## Launching the game with a remote debugger

```bash
godot --path <project-dir> --remote-debug tcp://127.0.0.1:6007 --verbose <scene.tscn>
godot --path <project-dir> --headless --script <file.gd> --quit   # run a script headlessly, no window
```

`godot` must be on PATH, or set `GODOT_BIN=/path/to/godot(.exe)`. No binary installed: download from https://godotengine.org/download matching the project's Godot version (check `project.godot`'s `config/features` array), or via the platform package manager (`scoop install godot`, `brew install godot`, `apt install godot`). Headless scripts need `extends SceneTree`, a `func _init():` entrypoint, and must call `quit()` themselves — the process does not exit on its own otherwise.

## Code quality

```bash
gdlint <file_or_dir>                    # lint; install: pip3 install --upgrade "gdtoolkit==4.*"
gdformat <file_or_dir>                  # autoformat in place
gdformat --check <file_or_dir>          # check only, no write
```

`gdlint`/`gdformat` are gdtoolkit console scripts. On Windows they may not resolve via a bare `execFileSync`-style spawn (no shell) — invoke through a shell (`cmd /c gdlint ...` or a shell:true spawn) since they're `.cmd`/`.exe` shims, not raw binaries.

## Gotchas

- Editor hot-reloads `.gd` file edits automatically when the editor is open. A **running game** does not — call `POST /reload` (port 6009) or the scene keeps stale code.
- New files need editor import before they're visible via `res://` — check `GET /import-status` (port 6008); if `scanning: true`, poll until false before touching the new file's node.
- `game eval` / `POST /eval` runs single expressions only, in `ReplBridge`'s own node context (`/root/ReplBridge`). Multi-statement logic: write a method on a node, then `POST /call` it.
- Node paths from these APIs always start with `/root/` (the actual scene tree root), not `res://`. Discover paths with `GET /tree` before guessing.
- `Expression.execute()` (what `/eval` and `/run-gdscript` use under the hood) cannot call private (`_`-prefixed) methods or access script-local statics the same way normal GDScript can — if an eval mysteriously returns null/errors on something that works in a real script, move the logic into a real method and `/call` it instead.
- A headless `godot --headless --script x.gd --quit` script that never calls `quit()` hangs forever — the flag alone does not terminate the process.
- Input actions (`ui_left`, `ui_accept`, custom actions) must exist in the project's `[input]` section of `project.godot` before `POST /input-action` (port 6009) or `Input.is_action_pressed()` will silently no-op on an unknown action name.

## Godot 3.x -> 4.6 migration

Full table: `references/migration-4x.md`. Quick hits: `.instance()` -> `.instantiate()`, `File`/`Directory` -> `FileAccess`/`DirAccess`, `KinematicBody2D` -> `CharacterBody2D`, `emit_signal("x")` -> `x.emit()`, `yield(sig)` -> `await sig`, `.empty()` -> `.is_empty()`.

## GDScript 4.6 reference

Full syntax/API reference (annotations, signals, physics, tweens, node lifecycle): `references/gdscript-4.6.md`. Load it when writing non-trivial GDScript in an unfamiliar area — skip it for routine edits you already know how to make.
