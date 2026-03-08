# godot-kit

Agentic Godot 4.x development boilerplate. Provides CLI tools, a remote REPL/debugger bridge, an EditorPlugin HTTP API, a game runtime HTTP API, GDScript linting/formatting, and auto-installs skill files for AI coding agents (Claude Code, Cursor, Windsurf, Aider, Continue).

## Demo

Run the capability demo to verify everything works on your system:

```bash
node demo.js
# or
npm run demo
# or
godot-dev demo
```

Expected output (all sections pass):

```
[1/8] Engine Detection      PASS  Godot 4.6-stable found
[2/8] Project Scaffolding   PASS  16 files created
[3/8] Protocol Layer        PASS  7/7 variant types encode/decode correctly
[4/8] Compat Checker        PASS  6 Godot 3.x deprecated patterns detected
[5/8] Skill Installation    PASS  ~/.claude/skills/godot-dev.md written
[6/8] CLI Commands          PASS  10/10 CLI commands present in --help
[7/8] Headless Run          PASS  Godot ran headlessly, exit 0
```

## Install

```bash
npm install -g godot-kit
npx godot-kit <my-project>    # scaffold new project
godot-dev download-engine     # download Godot 4.x
godot-dev setup               # install gdtoolkit + agent skills
```

## CLI Commands

### Launch & Debug (Debugger port 6007)
```bash
godot-dev launch [scene]      # launch game with remote debugger
godot-dev repl                # interactive REPL via debugger
godot-dev inspect             # dump scene tree (one-shot)
godot-dev logs                # stream Godot output
```

### Code Quality
```bash
godot-dev lint [files...]     # GDScript lint via gdtoolkit
godot-dev format [files...]   # GDScript format
godot-dev validate            # validate all .gd file syntax
```

### Test / Export / Watch
```bash
godot-dev test <script.gd>    # run GDScript headlessly, report pass/fail
godot-dev export <preset>     # export project by preset name
godot-dev watch               # watch .gd files, hot-reload running game
```

### Editor HTTP API (port 6008)
Requires `godot_kit_bridge` EditorPlugin (scaffolded automatically). Open the Godot editor first.

```bash
godot-dev editor tree                            # scene tree JSON
godot-dev editor select <node-path>              # select node in editor
godot-dev editor run-script <file.gd>            # run GDScript in editor
godot-dev editor open <res://scene.tscn>         # open scene
godot-dev editor save                            # save current scene
godot-dev editor files                           # list project files
godot-dev editor property <node> <prop> <val>    # set node property
godot-dev editor create <type> <parent> <name>   # create node
godot-dev editor delete <node-path>              # delete node
godot-dev editor signals                         # list signals
godot-dev editor autoloads                       # list autoloads
```

### Game Runtime HTTP API (port 6009)
Injected via `ReplBridge` autoload. Start the game with `godot-dev launch`.

```bash
godot-dev game tree                              # runtime scene tree
godot-dev game eval "<GDScript expression>"      # evaluate expression
godot-dev game globals                           # list autoloads + root children
godot-dev game fps                               # FPS + performance metrics
godot-dev game set <node-path> <prop> <val>      # set node property at runtime
godot-dev game call <node-path> <method> [args]  # call method on node
godot-dev game node <node-path>                  # get node info
godot-dev game pause                             # toggle pause
godot-dev game reload                            # reload current scene
godot-dev game input                             # show pause/input state
```

## Agent Skill Installation

`godot-dev setup` and `npx godot-kit` automatically install skill/rule files for detected AI coding agents:

| Agent | File |
|-------|------|
| Claude Code | `~/.claude/skills/godot-dev.md` |
| Cursor | `.cursor/rules/godot-dev.mdc` |
| Windsurf | `.windsurf/rules/godot-dev.md` |
| Aider | `.aider.conf.yml` |
| Continue | `.continue/config.json` |

## Scaffolded Project Structure

```
my-project/
  project.godot                        # Godot project config
  scenes/main.tscn                     # main scene
  scripts/main.gd                      # main script
  addons/
    repl_bridge/
      repl_bridge.gd                   # autoload: game runtime HTTP (6009) + debugger bridge
      plugin.cfg
    godot_kit_bridge/
      plugin.gd                        # EditorPlugin: starts HTTP server (6008)
      editor_http.gd                   # REST API routes for editor control
      plugin.cfg
  .vscode/                             # VSCode + Godot Tools config
  .cursor/rules/godot-dev.mdc          # Cursor AI rules
  .windsurf/rules/godot-dev.md         # Windsurf AI rules
```

## Ports

| Service | Port |
|---------|------|
| Remote Debugger | 6007 |
| Editor HTTP API | 6008 |
| Game Runtime HTTP | 6009 |
| LSP | 6005 |
| DAP | 6006 |

## Common Workflows

### Inspect running game
```bash
godot-dev launch &
sleep 2
godot-dev game tree
godot-dev game eval "Engine.get_frames_per_second()"
```

### Set property at runtime
```bash
godot-dev game set /root/Main speed 200
```

### Run a test
```bash
godot-dev test tests/test_math.gd
```

### Hot reload on file change
```bash
godot-dev launch &
godot-dev watch
```

## Requirements

- Node.js 18+
- Python + pip (for gdtoolkit)
- Godot 4.x (`godot-dev download-engine`)
