'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const MIGRATION_GUIDE = `
## Godot Upgrade Skill: Manual Migration Guide (3.x to 4.6)

This document provides the explicit, manual find-and-replace instructions required to upgrade Godot projects from version 3.x through 4.6. Do not rely on automated tools; execute these exact changes in your script editor.

### Godot 3 to 4.0

#### Global & Core API
| Old Godot 3 API | New Godot 4 API |
| :--- | :--- |
| \`instance()\` | \`instantiate()\` |
| \`File\` / \`Directory\` | \`FileAccess\` / \`DirAccess\` (Use static methods, e.g., \`FileAccess.open()\`) |
| \`OS\` Screen/Window methods | \`DisplayServer\` (e.g., \`DisplayServer.screen_get_size()\`) |
| \`OS\` Time/Date methods | \`Time\` singleton (e.g., \`Time.get_ticks_msec()\`) |
| Virtual Methods | Add leading underscore (e.g., \`AnimationNode.process()\` ➔ \`_process()\`) |

#### Node Method Renames
| Class | Old Method | New Method |
| :--- | :--- | :--- |
| **AcceptDialog** | \`set_autowrap()\` | \`set_autowrap_mode()\` |
| **AnimationPlayer** | \`add_animation()\` | \`add_animation_library()\` |
| **AnimationTree** | \`set_process_mode()\` | \`set_process_callback()\` |
| **Array** | \`empty()\` | \`is_empty()\` |
| **Array** | \`invert()\` | \`reverse()\` |
| **Array** | \`remove()\` | \`remove_at()\` |
| **AStar2D / 3D** | \`get_points()\` | \`get_points_id()\` |
| **BaseButton** | \`set_event()\` | \`set_shortcut()\` |
| **Camera2D** | \`get_h_offset()\` | \`get_drag_horizontal_offset()\` |
| **Camera2D** | \`get_v_offset()\` | \`get_drag_vertical_offset()\` |
| **Camera2D** | \`set_h_offset()\` | \`set_drag_horizontal_offset()\` |
| **Camera2D** | \`set_v_offset()\` | \`set_drag_vertical_offset()\` |
| **CanvasItem** | \`raise()\` | \`move_to_front()\` |
| **CanvasItem** | \`update()\` | \`queue_redraw()\` |
| **Control** | \`get_stylebox()\` | \`get_theme_stylebox()\` |

#### Class & Resource Renames
| Old Godot 3 Name | New Godot 4 Name |
| :--- | :--- |
| \`AnimatedSprite\` | \`AnimatedSprite2D\` |
| \`ARVR*\` | \`XR*\` |
| \`BoxShape\` / \`CapsuleShape\` / \`PlaneShape\` | \`BoxShape3D\` / \`CapsuleShape3D\` / \`WorldBoundaryShape3D\` |
| \`CubeMesh\` | \`BoxMesh\` |
| \`GIProbe\` / \`GIProbeData\` | \`VoxelGI\` / \`VoxelGIData\` |
| \`KinematicBody\` / \`KinematicBody2D\` | \`CharacterBody3D\` / \`CharacterBody2D\` |
| \`NavigationMeshInstance\` | \`NavigationRegion3D\` |
| \`NavigationPolygonInstance\` | \`NavigationRegion2D\` |
| \`PanoramaSky\` | \`Sky\` |
| \`Particles\` / \`Particles2D\` | \`GPUParticles3D\` / \`GPUParticles2D\` |
| \`ParticlesMaterial\` | \`ParticleProcessMaterial\` |
| \`Position2D\` / \`Position3D\` | \`Marker2D\` / \`Marker3D\` |
| \`Spatial\` | \`Node3D\` |
| \`SpatialMaterial\` | \`StandardMaterial3D\` |
| \`Sprite\` | \`Sprite2D\` |
| \`StreamTexture\` | \`CompressedTexture2D\` |

### Godot 4.0 to 4.1
* **AnimationNode**: \`_process()\` and \`blend_input()\` add optional \`test_only\` parameter.
* **PathFollow2D**: \`lookahead\` property removed entirely.
* **NavigationAgent2D & 3D**: Replace \`set_velocity()\` with \`velocity\` property. Split \`time_horizon\` into \`time_horizon_agents\` and \`time_horizon_obstacles\`.
* **NavigationAgent3D**: Rename \`agent_height_offset\` to \`path_height_offset\`. Remove \`ignore_y\`.
* **AnimationTrackEditPlugin**: Class removed entirely.
* **EditorInterface**: Now inherits \`Object\`. Replace \`set_movie_maker_enabled()\` with \`movie_maker_enabled\` property.

### Godot 4.1 to 4.2
* **Node**: \`NOTIFICATION_NODE_RECACHE_REQUESTED\` removed.
* **GraphNode** now inherits \`GraphElement\` (not \`Control\`).
* **AnimationMixer** new base class — methods moved: \`add_animation_library\`, \`advance\`, \`clear_caches\`, \`find_animation\`, \`get_animation\`, \`get_animation_list\`, \`has_animation\`. Renamed: \`method_call_mode\` → \`callback_mode_method\`, \`playback_active\` → \`active\`.

### Godot 4.2 to 4.3
* **BoneAttachment3D**: Replace \`on_bone_pose_update\` with \`on_skeleton_update\`.
* **EditorSceneFormatImporterFBX** renamed to \`EditorSceneFormatImporterFBX2GLTF\`.
* **GDExtension**: \`close_library\`, \`initialize_library\`, \`open_library\` removed.
* **NavigationRegion2D**: \`avoidance_layers\` and \`constrain_avoidance\` removed.
* **Skeleton3D**: \`add_bone\` returns \`int32\`. Replace \`bone_pose_changed\` with \`skeleton_updated\`.
* **RenderingDevice**: \`compute_list_begin\` removed \`allow_draw_overlap\`. \`draw_list_begin\` removed \`storage_textures\`. Removed \`post_barrier\` from 8 methods.

### Godot 4.3 to 4.4
* **FileAccess**: \`open_encrypted()\` added optional \`iv\`. All 14 \`store_*\` methods return \`bool\`.
* **GraphEdit**: \`connect_node()\` added optional \`keep_alive\`.
* **RenderingDevice**: \`draw_list_begin()\` added optional \`breadcrumb\`.

### Godot 4.4 to 4.5
* **CanvasItem / Font**: Added optional \`oversampling\` to all draw methods.
* **Physics (Jolt 3D)**: \`Area3D\` and \`StaticBody3D\` overlaps reported by default.
* **RichTextLabel**: \`add_image\` adds \`alt_text\`, \`width_in_percent\`, \`height_in_percent\`.

### Godot 4.5 to 4.6
* **AnimationPlayer**: \`assigned_animation\`, \`autoplay\`, \`current_animation\` are now \`StringName\`.
* **Control**: \`grab_focus()\` added optional \`hide_focus\`.
* **EditorFileDialog**: \`add_side_menu()\` removed. 18 methods moved to base \`FileDialog\`.
* **Environment**: Default \`glow_blend_mode\` is 1, \`glow_intensity\` is 0.3.
* **FileAccess**: \`create_temp()\` mode flag is \`FileAccess.ModeFlags\`. \`get_as_text()\` removed \`skip_cr\`.
* **MeshInstance3D**: \`skeleton\` property default is \`""\`.
`;

const GDLINTRC_CONTENT = `max-line-length: 120
max-returns: 10
excluded_directories: !!set
  .git: null
  addons: null
disable:
- class-definitions-order
`;

const CHEATSHEET = `
## Godot 4.6 GDScript Cheatsheet (Code Perspective)

### 1. Script Structure & Annotations
\`\`\`gdscript
@icon("res://icon.svg")
@tool
class_name MyClass
extends Node2D

@export var health: int = 100
@onready var sprite = $Sprite2D
@rpc("any_peer") func sync_position(): pass
@warning_ignore("unused_variable")
\`\`\`

Full Annotations:
- \`@export\` - Inspector editable: \`@export var speed := 200\`
- \`@export_category\` - Groups: \`@export_category("Stats")\`
- \`@export_group\` / \`@export_subgroup\` - Hierarchical: \`@export_group("Movement")\`
- \`@export_range\` - Slider: \`@export_range(0, 100, 5) var damage\`
- \`@export_enum\` / \`@export_flags\` - Dropdown: \`@export_enum("Idle","Run") var state\`
- \`@export_file\` / \`@export_dir\` - File picker: \`@export_file("*.png") var texture_path\`
- \`@export_node_path\` - NodePath: \`@export_node_path("Sprite2D") var target\`
- \`@export_tool_button\` - Inspector button: \`@export_tool_button("Test") var btn = test_func\`
- \`@onready\` - Before _ready(): \`@onready var player = $Player\`
- \`@tool\` - Runs in editor
- \`@rpc\` - Multiplayer: \`@rpc("authority", "call_remote") func foo()\`
- \`@abstract\` - Must subclass: \`@abstract class Shape:\`
- \`@icon\` - Scene icon: \`@icon("res://icon.svg")\`
- \`@warning_ignore\` - Suppress: \`@warning_ignore("return_value_discarded")\`

Initialization order: static defaults → variable initializers → _init() → exported values → @onready → _ready()

### 2. Variables, Types & Constants
\`\`\`gdscript
var a = 5                     # Variant (dynamic)
var b: int = 10               # Typed
var c := Vector2(1, 2)        # Inferred
const MAX_HEALTH = 100
var arr: Array[int] = [1, 2, 3]
var dict: Dictionary[String, int]
var bytes := PackedByteArray([1, 2, 3])
\`\`\`

### 3. Control Flow
\`\`\`gdscript
match value:
    1, 2, 3: print("small")
    var x when x > 10: print("big")
    [1, ..]: print("starts with 1")
    {"health": var h}: print("health = ", h)
    _: print("default")

for i: int in range(10):
    pass
\`\`\`

### 4. Functions & Classes
\`\`\`gdscript
func shoot(damage: int = 10) -> void:
    pass

class Bullet:
    var speed := 300

func _init(p_name := "Player"):
    print("Created ", p_name)

func _ready():
    super()
\`\`\`

### 5. Signals & await
\`\`\`gdscript
signal health_changed(old: int, new: int)

func take_damage(amount):
    var old = health
    health -= amount
    health_changed.emit(old, health)

button.pressed.connect(_on_button_pressed)
health_changed.connect(_on_health_changed.bind("Player"))

func wait_for_input():
    await $Button.button_up
    return true
\`\`\`

### 6. Node Lifecycle
Order: _enter_tree() → _ready() → _exit_tree()

- \`_process(delta)\` - every frame
- \`_physics_process(delta)\` - fixed physics tick
- \`_input(event)\` - all input
- \`_unhandled_input(event)\` - gameplay input
- \`_draw()\` - custom drawing
- \`_get_configuration_warnings()\` - editor warnings
- \`_gui_input(event)\` - Control UI

### 7. Physics / CharacterBody2D
\`\`\`gdscript
func _physics_process(delta):
    if not is_on_floor():
        velocity.y += GRAVITY * delta
    velocity.x = Input.get_axis("move_left", "move_right") * SPEED
    move_and_slide()
\`\`\`

### 8. Input
\`\`\`gdscript
if Input.is_action_just_pressed("jump"):
    velocity.y = JUMP_FORCE
if Input.is_action_pressed("move_right"):
    velocity.x = SPEED
var dir := Input.get_vector("left", "right", "up", "down")
\`\`\`

### 9. Scene Management
\`\`\`gdscript
get_tree().change_scene_to_file("res://level2.tscn")
get_tree().change_scene_to_packed(preload("res://level2.tscn"))
get_tree().reload_current_scene()

var extra = preload("res://ui.tscn").instantiate()
get_tree().root.add_child(extra)
\`\`\`

### 10. Node Shortcuts
\`\`\`gdscript
var player = $Player
var enemy = %Enemy            # unique name
var sprite = get_node(^"../Sprite")
var scene = preload("res://enemy.tscn")
var texture = load("res://icon.png")
\`\`\`

Quick Tips:
- Use typed variables for performance and warnings
- \`await\` replaced old \`yield\`
- Always multiply movement by \`delta\`
- Use \`@onready\` for node references
- \`match\` with patterns + guards is powerful
`;

const CODEBASESEARCH_SECTION = `
## Searching the Codebase
Use codebasesearch to find code semantically:
  npx codebasesearch "player jump logic"
  npx codebasesearch "collision detection"
  npx codebasesearch "scene transitions"
`;

const SKILL_CONTENT = `---
name: godot-dev
description: Godot 4.x agentic development CLI - editor control, game runtime, REPL, debugger, scene management
triggers: [godot, gd, gdscript, ".gd", ".tscn", scene tree, game debug, repl_bridge, godot-dev, godot-kit]
tools: [Bash, Read, Write, Edit]
---

# godot-dev — Godot 4.6 CLI

## Scaffold a new project
\`\`\`bash
bunx godot-kit <project-dir>       # scaffold boilerplate, installs CLAUDE.md + all configs
godot-dev download-engine          # download Godot 4.6-stable to ~/.godot-kit/
godot-dev setup                    # install gdtoolkit via pip3 (needs Python 3)
godot-dev download-export-templates # only needed before first export
\`\`\`

## Ports
| Service | Port | When active |
|---------|------|-------------|
| Remote Debugger (TCP) | 6007 | game launched via godot-dev launch |
| Editor HTTP API | 6008 | editor open + GodotKitBridge plugin enabled |
| Game HTTP API | 6009 | game running + ReplBridge autoload active |
| LSP | 6005 | editor open |
| DAP | 6006 | editor open |

Use \`game\` commands when game is running. Use \`editor\` commands when editor is open. Both can be active simultaneously.

## Launch
\`\`\`bash
godot-dev launch                             # start game, debugger :6007, game HTTP :6009
godot-dev launch res://scenes/other.tscn     # launch specific scene
godot-dev attach                             # auto-detect running Godot (TCP or HTTP) -> REPL
\`\`\`

## Game runtime (port 6009 — game must be running)
\`\`\`bash
godot-dev game tree                          # full scene tree: [Class] name @ /path
godot-dev game tree --depth 2                # limit depth
godot-dev game tree --filter CharacterBody2D # only nodes of that class
godot-dev game node /root/Level/Player       # all exported properties of one node
godot-dev game eval "get_tree().paused"      # any GDScript expression (ReplBridge context)
godot-dev game set /root/Level/Player speed 500      # set exported property (auto-parses JSON)
godot-dev game call /root/Level/Player perform_jump  # call method
godot-dev game call /root/Level/Player move_toward '[100,200]'  # args as JSON array
godot-dev game signal /root/Level/Player jump        # emit signal on node
godot-dev game globals                       # all autoloads (root children)
godot-dev game perf                          # fps, memory, draw_calls, physics objects
godot-dev game fps                           # just fps
godot-dev game logs                          # buffered print() output
godot-dev game logs --follow                 # stream new logs every 500ms
godot-dev game errors                        # buffered push_error() output
godot-dev game groups                        # all groups -> member paths
godot-dev game watch "velocity"              # poll expression every 500ms -> returns id
godot-dev game watches                       # current values of all watches
godot-dev game input                         # pause state + connected joypads
godot-dev game pause                         # toggle get_tree().paused
godot-dev game reload                        # reload_current_scene()
godot-dev game repl                          # interactive GDScript REPL (Ctrl+C exits)
godot-dev dashboard                          # live terminal: scene tree + perf + logs
\`\`\`

## Editor API (port 6008 — editor open + GodotKitBridge plugin active)
\`\`\`bash
godot-dev editor tree                        # scene tree of open scene
godot-dev editor tree --depth 2
godot-dev editor selected                    # currently selected nodes
godot-dev editor select /root/Level/Player   # select node in editor
godot-dev editor inspector                   # selected node's exported properties
godot-dev editor files                       # all res:// project files
godot-dev editor autoloads                   # autoloads from project.godot
godot-dev editor plugins                     # active editor plugins
godot-dev editor import-status               # true if editor is scanning/importing
godot-dev editor open res://scenes/level.tscn  # open scene
godot-dev editor save                        # save current scene
godot-dev editor play                        # press Play (main scene)
godot-dev editor stop                        # press Stop
godot-dev editor create /root/Level Node2D MyNode    # create node (parent, type, name)
godot-dev editor delete /root/Level/MyNode   # delete node
godot-dev editor property /root/Level/Player speed 500  # set via UndoRedo
godot-dev editor signals /root/Level/Player  # list all signals on node
godot-dev editor run "get_tree().root.get_class()"  # run GDScript in editor context
godot-dev editor repl                        # interactive editor GDScript REPL
\`\`\`

## Debugger (TCP port 6007)
\`\`\`bash
godot-dev repl                               # TCP debugger REPL
godot-dev inspect                            # one-shot scene tree via TCP
godot-dev logs                               # stream all print() in real time via TCP
\`\`\`

## Code quality
\`\`\`bash
godot-dev lint                               # gdlint all .gd files
godot-dev lint scripts/player.gd            # specific file
godot-dev format                             # gdformat all .gd files (rewrites in place)
godot-dev format --check                     # check without writing
godot-dev validate                           # lint + Godot 3.x deprecated API scan
\`\`\`

## Scene and asset management
\`\`\`bash
godot-dev scene new res://scenes/enemy.tscn         # .tscn with Node2D root
godot-dev scene new res://scenes/ui.tscn Control    # specific root type
godot-dev wait-import                               # wait for editor import (30s timeout)
godot-dev wait-import --timeout 60000
godot-dev input-map list                            # list [input] actions from project.godot
\`\`\`

## Test and export
\`\`\`bash
godot-dev test scripts/test_math.gd         # headless run, exit 0=PASS 1=FAIL
godot-dev export "Windows Desktop"          # export by preset name (must match exactly)
godot-dev export "Web" --output ./build/web
godot-dev watch                             # watch .gd files, auto-reload game on change
\`\`\`

## Real-world rules

### Node paths
- Always start with /root/. Discover with \`game tree\` or \`editor tree\`.
- Player spawns as /root/Level/Player (spawned by game.gd into level.tscn).
- ReplBridge autoload is at /root/ReplBridge.

### After writing .gd files
- Editor hot-reloads scripts automatically when open.
- Running game does NOT reload scripts — use \`game reload\` to restart the scene.
- Use \`watch\` to auto-reload on every .gd save.
- New files need editor import first. Check: \`editor import-status\`. Wait: \`wait-import\`.

### game eval context
- Runs inside ReplBridge node at /root/ReplBridge. Single expressions only.
- Access tree: get_tree().root. Find nodes: get_node("/root/Level/Player").
- For multi-step ops: write a method in a script, call it with \`game call\`.

### Input actions
- Built-in: ui_left, ui_right, ui_accept (Enter/Space), ui_focus_next (Tab).
- Player dash uses ui_focus_next. Remap in [input] section of project.godot.
- Check: \`godot-dev input-map list\`.

### Export
- Define presets in Godot editor -> Project -> Export -> saved to export_presets.cfg.
- Install templates first: \`godot-dev download-export-templates\`.
- Preset name is case-sensitive and must match exactly.

## GDScript 4.6 — key patterns
\`\`\`gdscript
@export var speed := 300.0           # typed export
signal jumped                        # declare
jumped.emit()                        # emit (not emit_signal)
await jumped                         # wait (not yield)
var node = get_node_or_null("/root/Level/Player")
var scene = load("res://scenes/enemy.tscn").instantiate()
FileAccess.open("res://data.json", FileAccess.READ)
Time.get_ticks_msec()                # not OS.get_ticks_msec()
CharacterBody2D + velocity + move_and_slide()
\`\`\`

## Godot 3->4 migration
| Godot 3 | Godot 4 |
|---------|---------|
| instance() | instantiate() |
| KinematicBody2D | CharacterBody2D |
| File.new() | FileAccess.open() |
| OS.get_ticks_msec() | Time.get_ticks_msec() |
| emit_signal("name") | name.emit() |
| yield(sig) | await sig |
| Sprite | Sprite2D |
| Spatial | Node3D |
| SpatialMaterial | StandardMaterial3D |
| Particles | GPUParticles3D |
| .empty() | .is_empty() |
| .remove(i) | .remove_at(i) |
| CanvasItem.update() | queue_redraw() |
${CHEATSHEET}${CODEBASESEARCH_SECTION}`;

const CURSOR_CONTENT = `---
description: Godot 4.x agentic development with godot-dev CLI
globs: ["**/*.gd", "**/*.tscn", "**/*.tres", "**/project.godot"]
alwaysApply: false
---

# godot-dev CLI

Use \`godot-dev\` for all Godot interactions. Editor bridge runs on :6008, game runtime on :6009.

Key commands:
- \`godot-dev launch\` - start game with debugger
- \`godot-dev game eval "<expr>"\` - evaluate GDScript at runtime
- \`godot-dev game tree\` - dump scene tree
- \`godot-dev editor tree\` - editor scene tree
- \`godot-dev editor property <node> <prop> <val>\` - set property
- \`godot-dev test <script.gd>\` - headless test
- \`godot-dev watch\` - hot reload on file change
- \`godot-dev lint\` / \`godot-dev format\` / \`godot-dev validate\` - code quality
${MIGRATION_GUIDE}${CHEATSHEET}${CODEBASESEARCH_SECTION}`;

const WINDSURF_CONTENT = `# godot-dev CLI

godot-dev is the CLI for Godot 4.x agentic development. Always use it instead of running Godot directly.

- Editor HTTP API: port 6008 (requires godot_kit_bridge plugin enabled in editor)
- Game HTTP API: port 6009 (injected via ReplBridge autoload)
- Debugger: port 6007

Run \`godot-dev --help\` for full command list.
${MIGRATION_GUIDE}${CHEATSHEET}${CODEBASESEARCH_SECTION}`;

const CLINE_CONTENT = `# godot-dev (godot-kit) — Godot 4.x Agentic Development

When working on Godot projects, use the \`godot-dev\` CLI for all interactions.

## Commands
- \`godot-dev launch\` — launch game with TCP debugger on :6007
- \`godot-dev game tree\` — runtime scene tree (HTTP :6009)
- \`godot-dev game eval "<expr>"\` — evaluate GDScript expression
- \`godot-dev editor tree\` — editor scene tree (HTTP :6008)
- \`godot-dev editor save\` — save current scene
- \`godot-dev validate\` — lint + compat check all .gd files
- \`godot-dev watch\` — hot-reload on file change
- \`godot-dev test <script.gd>\` — headless test

## Ports
| Service | Port |
|---------|------|
| TCP Debugger | 6007 |
| Editor HTTP | 6008 |
| Game HTTP | 6009 |

## GDScript Conventions (Godot 4.6)
- Use \`CharacterBody2D\` not \`KinematicBody2D\`
- Use \`FileAccess.open()\` not \`File.new()\`
- Use \`Time.get_ticks_msec()\` not \`OS.get_ticks_msec()\`
- Use \`await\` not \`yield\`
- All node classes need \`2D\`/\`3D\` suffix (e.g. \`Sprite2D\`, \`AnimatedSprite2D\`)
${MIGRATION_GUIDE}${CHEATSHEET}${CODEBASESEARCH_SECTION}`;

const COPILOT_CONTENT = `# Godot 4.x Development with godot-kit

This project uses the \`godot-dev\` CLI for agentic Godot development.

## Available Commands
- \`godot-dev launch\` — launch game with remote debugger (:6007)
- \`godot-dev game tree\` — inspect runtime scene tree (:6009)
- \`godot-dev game eval "<expr>"\` — evaluate GDScript at runtime
- \`godot-dev editor tree\` — inspect editor scene tree (:6008)
- \`godot-dev editor save\` — save current scene
- \`godot-dev validate\` — lint + Godot 3→4 migration check
- \`godot-dev watch\` — hot-reload .gd files on change
- \`godot-dev test <script.gd>\` — headless script test

## GDScript Conventions (Godot 4.6)
- Typed variables: \`var speed: float = 300.0\`
- Export: \`@export var max_speed := 300.0\`
- Signals: \`signal jumped\`, \`jumped.emit()\`
- \`CharacterBody2D\` (not KinematicBody2D)
- \`move_and_slide()\` uses \`velocity\` property
- \`await\` (not \`yield\`)
- \`FileAccess.open()\` (not \`File.new()\`)
${MIGRATION_GUIDE}${CHEATSHEET}${CODEBASESEARCH_SECTION}`;

const ZED_ASSISTANT_CONTENT = `godot-dev CLI for Godot 4.x: launch game (port 6007), game HTTP API (port 6009), editor HTTP API (port 6008). Commands: godot-dev launch, game tree, game eval, editor tree, editor save, validate, watch, test. GDScript: use CharacterBody2D, await, FileAccess.open(), @export, typed vars.`;

function tryWrite(filePath, content, label) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [skills] Installed ${label} -> ${filePath}`);
    return true;
  } catch (e) {
    console.warn(`  [skills] Could not write ${label}: ${e.message}`);
    return false;
  }
}

function installGlobalSkills() {
  const home = os.homedir();
  tryWrite(path.join(home, '.claude', 'skills', 'godot-dev', 'SKILL.md'), SKILL_CONTENT, 'Claude Code skill (global)');

  const clinerules = path.join(home, '.cline', 'custom-instructions.md');
  if (fs.existsSync(clinerules)) {
    const existing = fs.readFileSync(clinerules, 'utf8');
    if (!existing.includes('godot-dev')) {
      fs.appendFileSync(clinerules, '\n' + CLINE_CONTENT, 'utf8');
      console.log(`  [skills] Appended godot-dev section to ${clinerules}`);
    }
  } else {
    tryWrite(clinerules, CLINE_CONTENT, 'Cline custom-instructions (global)');
  }
}

function installSkills(projectDir) {
  const home = os.homedir();

  tryWrite(path.join(home, '.claude', 'skills', 'godot-dev', 'SKILL.md'), SKILL_CONTENT, 'Claude Code skill');

  tryWrite(path.join(projectDir, '.cursor', 'rules', 'godot-dev.mdc'), CURSOR_CONTENT, 'Cursor rule');

  tryWrite(path.join(projectDir, '.windsurf', 'rules', 'godot-dev.md'), WINDSURF_CONTENT, 'Windsurf rule');

  tryWrite(path.join(projectDir, '.clinerules'), CLINE_CONTENT, 'Cline project rules');

  tryWrite(path.join(projectDir, '.github', 'copilot-instructions.md'), COPILOT_CONTENT, 'Copilot instructions');

  const zedSettings = path.join(projectDir, '.zed', 'settings.json');
  let zedCfg = {};
  try { zedCfg = JSON.parse(fs.readFileSync(zedSettings, 'utf8')); } catch {}
  zedCfg.assistant = zedCfg.assistant || {};
  zedCfg.assistant.default_context = ZED_ASSISTANT_CONTENT;
  tryWrite(zedSettings, JSON.stringify(zedCfg, null, 2), 'Zed settings');

  tryWrite(path.join(projectDir, '.gdlintrc'), GDLINTRC_CONTENT, '.gdlintrc');

  const aiderCfg = path.join(projectDir, '.aider.conf.yml');
  if (!fs.existsSync(aiderCfg)) {
    tryWrite(aiderCfg, '# aider config\n# godot-dev CLI available for Godot editor/game control\nread: [".cursor/rules/godot-dev.mdc"]\n', 'Aider config');
  }

  const continueCfg = path.join(projectDir, '.continue', 'config.json');
  if (!fs.existsSync(continueCfg)) {
    const cfg = { models: [], contextProviders: [{ name: 'file', params: { patterns: ['**/*.gd', '**/*.tscn'] } }], docs: [{ startUrl: 'https://docs.godotengine.org/en/stable/', title: 'Godot Docs' }] };
    tryWrite(continueCfg, JSON.stringify(cfg, null, 2), 'Continue config');
  }
}

module.exports = { installSkills, installGlobalSkills, MIGRATION_GUIDE, GDLINTRC_CONTENT };
