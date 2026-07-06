# godot-kit

Installs an [Agent Skill](https://agentskills.io) into an existing Godot 4.x project so any AI coding agent can debug it: live scene-tree inspection, runtime GDScript eval, editor control — all over plain HTTP, no CLI binary, no editor plugin marketplace.

## Install

```bash
npx godot-kit .
```

Run inside an existing Godot project directory (where `project.godot` lives). This writes:

- `.claude/skills/godot-dev/` — the skill (`SKILL.md` + reference docs + GDScript source), read by any agent that supports the Agent Skills spec
- `addons/repl_bridge/repl_bridge.gd` — game-runtime HTTP server (port 6009), auto-wired as a `project.godot` autoload
- `addons/godot_kit_bridge/` — editor HTTP server (port 6008), auto-wired as an enabled editor plugin

Re-open the project in Godot afterward so the autoload/plugin activate.

## What the agent can then do

- `GET http://127.0.0.1:6009/tree` — full live scene tree of the running game
- `POST http://127.0.0.1:6009/eval {"expr":"..."}` — evaluate GDScript in the running game
- `GET http://127.0.0.1:6008/scene-tree` — scene tree of the open editor scene
- `POST http://127.0.0.1:6008/property {"path":"...","prop":"...","value":...}` — set a property via the editor's UndoRedo (undoable)

Full endpoint tables in `.claude/skills/godot-dev/references/`.

No separate CLI to install or keep updated — the agent talks HTTP directly, and constructs/reads the GDScript itself when asked to extend the bridges.

## License

MIT
