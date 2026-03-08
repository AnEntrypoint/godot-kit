# godot-kit

Agentic Godot 4.x development boilerplate. Single command setup, REPL/CLI debugging, gdtoolkit integration, DAP support, scene inspector, profiler, and live log streaming.

## Quick Start

```bash
# Create a new Godot project
npx godot-kit my-game

# Download Godot 4.6 automatically
godot-dev download-engine

# Install gdtoolkit
godot-dev setup

# Launch Godot with remote debugger
godot-dev launch

# Connect interactive REPL
godot-dev repl
```

## What it creates

```
my-game/
├── project.godot           # Godot 4.x project config
├── scenes/main.tscn        # Main scene
├── scripts/main.gd         # Main script
├── addons/repl_bridge/     # REPL autoload (GDScript)
│   ├── repl_bridge.gd      # Debug bridge with eval, scene dump, logs
│   └── plugin.cfg
├── .gdlintrc               # gdtoolkit lint config
├── .gdformatrc             # gdtoolkit format config
├── .vscode/
│   ├── launch.json         # DAP debug config
│   ├── settings.json       # Godot LSP settings
│   └── extensions.json     # Recommends Godot Tools
├── Makefile                # Task shortcuts
└── README.md
```

## CLI Commands

```bash
godot-dev repl                  # Interactive debugger REPL
godot-dev inspect               # Dump scene tree (one-shot)
godot-dev logs                  # Stream Godot output logs
godot-dev lint [files]          # Run gdlint
godot-dev format [files]        # Run gdformat
godot-dev launch [scene]        # Launch Godot with debugger
godot-dev setup                 # Install gdtoolkit (requires Python)
godot-dev download-engine       # Download Godot 4.6 for current platform
```

## Godot Engine Auto-Download

`godot-dev download-engine` downloads Godot 4.6-stable from the official GitHub releases:

- **Windows**: downloads `Godot_v4.6-stable_win64.exe.zip`, extracts `.exe`
- **Linux**: downloads `Godot_v4.6-stable_linux.x86_64.zip`, extracts binary, `chmod +x`
- **macOS**: downloads `Godot_v4.6-stable_macos.universal.zip`

The engine is saved to `~/.godot-kit/godot[.exe]` and the path is stored in `~/.godot-kit/config.json`. The `launch` command reads this config automatically — no `--godot` flag needed after downloading.

```bash
# Download once
godot-dev download-engine

# Launch uses ~/.godot-kit/config.json automatically
godot-dev launch
```

When scaffolding a new project with `npx godot-kit`, it will detect whether Godot is installed and prompt you to run `godot-dev download-engine` if not found.

## REPL Commands

| Command | Description |
|---------|-------------|
| `tree` | Dump scene tree |
| `inspect <id>` | Inspect object properties |
| `stack` | Show call stack |
| `vars <frame>` | Show variables at stack frame |
| `c` / `continue` | Continue execution |
| `n` / `next` | Step over |
| `s` / `step` | Step into |
| `b` / `break` | Pause execution |
| `bp <file> <line>` | Set/clear breakpoint |
| `quit` | Exit |

## Debug Architecture

```
Godot 4 Game
  └─ --remote-debug tcp://127.0.0.1:6007
       └─ Binary Variant Protocol (TCP)
            └─ godot-dev repl / inspect / logs
                 └─ lib/debugger-client.js
                      └─ lib/protocol.js (encode/decode Godot variants)
```

### Protocol Details

Godot 4.x remote debugger uses a binary TCP protocol:
- Each packet: `uint32_LE(payload_size) + uint32_LE(param_count) + [variants...]`
- First variant is always the command string
- Remaining variants are parameters
- Types: NIL, BOOL, INT (32/64), FLOAT (32/64), STRING, VECTOR2/3/4, COLOR, ARRAY, DICTIONARY, OBJECT, etc.

### Ports

| Service | Port | Protocol |
|---------|------|----------|
| Remote Debugger (game) | 6007 | Binary TCP |
| Language Server (LSP) | 6005 | JSON-RPC TCP |
| Debug Adapter (DAP) | 6006 | DAP over TCP |

## gdtoolkit

```bash
# Install (requires Python 3.7+)
pip install "gdtoolkit==4.*"

# Or via pipx
pipx install "gdtoolkit==4.*"
```

Provides `gdlint` and `gdformat` for GDScript linting and formatting.

## VSCode Integration

1. Install [Godot Tools](https://marketplace.visualstudio.com/items?itemName=geequlim.godot-tools)
2. Set Godot 4 executable path in VSCode settings
3. Press `F5` to launch with DAP debugger

## Programmatic API

```js
const { GodotDebuggerClient } = require('godot-kit');

const client = new GodotDebuggerClient('127.0.0.1', 6007);
await client.connect();

client.on('break', (params) => console.log('Paused at', params));
client.on('output', (params) => console.log('[godot]', params));

client.requestSceneTree();
client.on('message', (msg) => {
  if (msg.command === 'scene:scene_tree_parse_end') {
    // msg.params contains scene tree data
  }
});
```

## License

MIT
