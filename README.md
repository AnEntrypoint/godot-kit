# godot-kit

Godot 4.6 project. Uses [godot-kit](https://github.com/AnEntrypoint/godot-kit) for CLI-driven development.

## First-time setup
```bash
godot-dev download-engine    # download Godot 4.6-stable
godot-dev setup              # install gdtoolkit (needs Python)
```

## Boilerplate
- **scenes/level.tscn** — main level with platforms, spikes, coins, goal
- **scenes/player.tscn** — CharacterBody2D with jump/dash/wall-slide
- **scripts/** — game.gd, player.gd, moving_platform.gd, spike.gd, collectible.gd, goal.gd
- **addons/repl_bridge** — HTTP API on port 6009 (runtime control)
- **addons/godot_kit_bridge** — HTTP API on port 6008 (editor control)

## Daily commands
```bash
godot-dev launch             # launch game (debugger on :6007)
godot-dev game tree          # dump live scene tree
godot-dev game eval "expr"   # run GDScript in running game
godot-dev game set /root/Level/Player speed 500
godot-dev lint && godot-dev format
godot-dev validate           # lint + Godot 3.x compat check
```

See CLAUDE.md for full CLI reference and real-world workflow notes.
