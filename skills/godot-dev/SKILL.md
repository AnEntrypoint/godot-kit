---
name: godot-dev
description: Godot 4.x agentic development CLI - scaffold projects, control editor/game at runtime, REPL, debugger, scene inspection, GDScript linting. Use when working on any Godot project or .gd/.tscn file.
triggers: [godot, gdscript, ".gd", ".tscn", ".tres", project.godot, scene tree, CharacterBody2D, godot-dev, godot-kit, repl_bridge]
tools: [Bash, Read, Write, Edit]
---

# godot-dev — Godot 4.6 Agentic Development CLI

## Scaffold
```bash
bunx godot-kit <project-dir>            # scaffold project + install all agent skills
bunx godot-kit .                        # scaffold in current directory
godot-dev download-engine               # download Godot 4.6-stable to ~/.godot-kit/
godot-dev setup                         # install gdtoolkit via pip3
```

## Ports
| Service | Port | When active |
|---------|------|-------------|
| TCP Debugger | 6007 | game launched via `godot-dev launch` |
| Editor HTTP | 6008 | editor open + GodotKitBridge plugin enabled |
| Game HTTP | 6009 | game running + ReplBridge autoload active |

## Launch & Attach
```bash
godot-dev launch                        # start game, attach debugger :6007 + HTTP :6009
godot-dev launch res://scenes/foo.tscn  # launch specific scene
godot-dev launch --repl                 # launch then drop into REPL
godot-dev attach                        # auto-detect running Godot -> REPL
```

## Game Runtime (port 6009)
```bash
godot-dev game tree                     # full scene tree
godot-dev game tree --depth 2           # limit depth
godot-dev game tree --filter CharacterBody2D
godot-dev game node /root/Level/Player  # all properties of one node
godot-dev game eval "get_tree().paused" # evaluate any GDScript expression
godot-dev game set /root/Level/Player speed 500
godot-dev game call /root/Level/Player jump
godot-dev game call /root/Level/Player move_toward '[100,200]'
godot-dev game signal /root/Level/Player jumped
godot-dev game globals                  # all autoloads
godot-dev game perf                     # fps, memory, draw_calls, physics
godot-dev game fps
godot-dev game logs                     # buffered print() output
godot-dev game logs --follow            # stream logs every 500ms
godot-dev game errors                   # push_error() buffer
godot-dev game groups                   # all groups -> member paths
godot-dev game watch "velocity"         # poll expression every 500ms
godot-dev game watches                  # all current watch values
godot-dev game input                    # pause state + connected joypads
godot-dev game pause                    # toggle get_tree().paused
godot-dev game reload                   # reload_current_scene()
godot-dev game screenshot               # capture viewport as PNG (prints file path)
godot-dev game screenshot --output game.png
godot-dev game create /root Node2D MyNode  # create a node in the running scene tree
godot-dev game delete /root/MyNode          # queue-free a node in the running scene tree
godot-dev game raycast2d <x1> <y1> <x2> <y2>  # 2D physics raycast between two points
godot-dev game input-action jump            # press an input action (simulate key/button)
godot-dev game input-action jump release    # release an input action
godot-dev game repl                     # interactive GDScript REPL (Ctrl+C exits)
godot-dev dashboard                     # live terminal: scene tree + perf + logs
```

## Editor API (port 6008)
```bash
godot-dev editor tree                   # scene tree of open scene
godot-dev editor selected               # currently selected nodes
godot-dev editor select /root/Level/Player
godot-dev editor inspector              # selected node's exported properties
godot-dev editor files                  # all res:// project files
godot-dev editor autoloads
godot-dev editor plugins
godot-dev editor open res://scenes/level.tscn
godot-dev editor save
godot-dev editor play                   # press Play
godot-dev editor stop                   # press Stop
godot-dev editor create /root/Level Node2D MyNode
godot-dev editor delete /root/Level/MyNode
godot-dev editor property /root/Level/Player speed 500  # set via UndoRedo
godot-dev editor signals /root/Level/Player
godot-dev editor run "get_tree().root.get_class()"
godot-dev editor screenshot             # capture editor screen as PNG (prints file path)
godot-dev editor screenshot --output editor.png
godot-dev editor signal /root/Level/Player hit  # emit a signal on a node in the edited scene
godot-dev editor repl
```

## Code Quality
```bash
godot-dev lint                          # gdlint all .gd files
godot-dev lint scripts/player.gd
godot-dev format                        # gdformat all .gd files
godot-dev validate                      # lint + Godot 3.x deprecated API scan
godot-dev test scripts/test_math.gd     # headless run, exit 0=PASS
godot-dev watch                         # hot-reload game on .gd file change
```

## Workflow Rules
- After writing .gd files: editor hot-reloads automatically. Running game needs `game reload`.
- Node paths always start with `/root/`. Discover with `game tree` or `editor tree`.
- `game eval` runs in ReplBridge context. Access tree: `get_node("/root/Level/Player")`.
- For multi-step ops: write a method, call it with `game call`.
- Input actions: `ui_left`, `ui_right`, `ui_accept`, `ui_focus_next`. Check: `godot-dev input-map list`.

---

# GDScript 4.6 Complete Reference

## 1. Variables, Types & Constants
```gdscript
var dynamic_var = "Hello"              # dynamic typing
var explicit: String = "Hello"         # explicit static typing
var inferred := "Hello"                # inferred static typing

const MAX_HEALTH: int = 100

enum State { IDLE, RUN, JUMP }         # access: State.IDLE
enum { ITEM_SWORD, ITEM_BOW }          # global access: ITEM_SWORD

# Global constants
var half = PI      # 3.14159...
var full = TAU     # 6.28318...
var bad = NAN
var inf = INF

# Typed collections
var arr: Array[int] = [1, 2, 3]
var dict: Dictionary[String, int]

# Array pre-allocation (4.6 perf improvement)
var big: Array[int] = []
big.reserve(100000)
```

## 2. Annotations
```gdscript
@export var speed: float = 5.0
@export_range(1, 100) var level: int = 1
@export_enum("Warrior", "Mage") var class_type: int
@export_group("Movement")
@export_category("Stats")
@export_file("*.png") var texture_path: String
@export_node_path("Sprite2D") var target: NodePath
@export_tool_button("Test") var btn = test_func

@onready var sprite := $Sprite2D       # assigned before _ready()
@tool                                   # runs in editor

@rpc("any_peer") func sync_pos(): pass
@abstract                               # must be subclassed (4.5+)
@warning_ignore("unused_variable")
@icon("res://icon.svg")
```
Initialization order: static defaults → variable initializers → `_init()` → exported values → `@onready` → `_ready()`

## 3. Classes & OOP
```gdscript
class_name Player extends CharacterBody3D

# Abstract class — cannot be instantiated directly
@abstract
class_name BaseEnemy extends Node

@abstract
func attack() -> void:
    pass  # child classes must override

func _init(p_name := "Player") -> void:
    print("Created ", p_name)

func _ready() -> void:
    super()  # call parent _ready
```

## 4. Control Flow
```gdscript
if health < 50:
    print("Low")
elif health < 10:
    print("Critical")
else:
    print("OK")

match state:
    State.IDLE:
        print("Idling")
    State.RUN, State.JUMP:
        print("Moving")
    var x when x > 10:
        print("big: ", x)
    [1, ..]:
        print("array starting with 1")
    {"health": var h}:
        print("health = ", h)
    _:
        print("default")

for i in range(10):
    print(i)

for item in inventory:
    print(item)

while active:
    process()
```

## 5. Signals, Callables & Lambdas
```gdscript
signal health_changed(new_health: int)

func take_damage(amount: int) -> void:
    health -= amount
    health_changed.emit(health)

func _ready() -> void:
    button.pressed.connect(_on_pressed)
    # bind extra args
    button.pressed.connect(_on_pressed.bind("ButtonA", 100))
    # lambda with closure
    var mult := 2.0
    button.pressed.connect(func(): print(mult))

func _on_pressed(name: String, val: int) -> void:
    print(name, " gave ", val)
```

## 6. Node Lifecycle
```gdscript
func _enter_tree() -> void: pass   # entering scene tree
func _ready() -> void: pass        # node + all children ready
func _process(delta: float) -> void: pass         # every frame
func _physics_process(delta: float) -> void: pass # fixed timestep
func _exit_tree() -> void: pass    # leaving scene tree
func _input(event: InputEvent) -> void: pass      # all input
func _unhandled_input(event: InputEvent) -> void: pass  # gameplay input
func _draw() -> void: pass         # custom drawing (CanvasItem)
func _gui_input(event: InputEvent) -> void: pass  # Control UI input
```

## 7. Node Access
```gdscript
var child := $MyChildNode
var sibling := $"../SiblingNode"
var unique := %MyUniqueNode         # scene-unique name (% prefix)
var node := get_node(^"../Sprite")
var safe := get_node_or_null("/root/Level/Player")

# Instantiate scenes
const BULLET := preload("res://bullet.tscn")
var b := BULLET.instantiate()
add_child(b)

# Delete
b.queue_free()  # safe end-of-frame delete

# Scene transitions
get_tree().change_scene_to_file("res://level_2.tscn")
var next := preload("res://level_2.tscn").instantiate()
get_tree().change_scene_to_node(next)  # 4.6
```

## 8. Input
```gdscript
# Event-driven (preferred for gameplay — not blocked by UI)
func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("jump"):
        jump()
    if event is InputEventMouseMotion:
        rotate_camera(event.relative)

# Polling (good for continuous movement)
func _physics_process(delta: float) -> void:
    var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    velocity = dir * SPEED
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = JUMP_FORCE
```

## 9. Physics & CharacterBody
```gdscript
extends CharacterBody2D

const SPEED := 300.0
const JUMP_FORCE := -480.0
const GRAVITY := 1100.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += GRAVITY * delta
        velocity.y = minf(velocity.y, 900.0)  # terminal velocity

    velocity.x = Input.get_axis("move_left", "move_right") * SPEED

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = JUMP_FORCE

    move_and_slide()  # handles slopes, steps, deflections

    for i in get_slide_collision_count():
        var col := get_slide_collision(i)
        print("hit: ", col.get_collider().name)
```

## 10. Math & Vectors
```gdscript
var a := lerp(0.0, 10.0, 0.5)           # 5.0
var b := move_toward(0.0, 10.0, 2.0)    # 2.0
var c := clamp(15, 0, 10)               # 10
var d := snappedf(3.7, 0.5)             # 3.5
var e := absf(-5.0)                     # 5.0

var dist := pos_a.distance_to(pos_b)
var dir := pos_a.direction_to(pos_b)    # normalized
var bounced := vel.bounce(wall_normal)

# 3D transforms
transform = transform.rotated(Vector3.UP, PI / 4)
transform = transform.looking_at(target.global_position, Vector3.UP)
```

## 11. Tweens
```gdscript
var tween := create_tween()
tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
tween.tween_property($Sprite, "position", Vector2(100, 100), 1.5)
tween.tween_callback($Sprite.queue_free)
```

## 12. Coroutines & Timers
```gdscript
await get_tree().create_timer(2.0).timeout
print("2 seconds passed")

var ms := Time.get_ticks_msec()   # not OS.get_ticks_msec()
```

## 13. File I/O
```gdscript
func save(content: String) -> void:
    var file := FileAccess.open("user://save.dat", FileAccess.WRITE)
    file.store_string(content)

func load_save() -> String:
    if not FileAccess.file_exists("user://save.dat"):
        return ""
    var file := FileAccess.open("user://save.dat", FileAccess.READ)
    return file.get_as_text()

# JSON
var data := JSON.parse_string('{"score": 100}')
var json_str := JSON.stringify({"health": 50})
```

## 14. IK (Godot 4.6 — SkeletonModifier3D)
```gdscript
# Replaces SkeletonIK3D
var ik := TwoBoneIK3D.new()
$Skeleton3D.add_child(ik)
ik.set_target_node(0, ^"../../TargetMarker")
ik.set_pole_node(0, ^"../../ElbowPole")
ik.set_root_bone(0, skeleton.find_bone("UpperArm"))
ik.set_middle_bone(0, skeleton.find_bone("LowerArm"))
```

## 15. UI — Pivot Offset Ratio (4.6)
```gdscript
# Normalized pivot (0.0–1.0) — no pixel recalculation needed
$Label.pivot_offset_ratio = Vector2(0.5, 0.5)  # center
# Legacy
$Label.pivot_offset = Vector2(100, 50)
```

---

# Godot 3.x → 4.6 Migration

## Core API
| Godot 3 | Godot 4 |
|---------|---------|
| `.instance()` | `.instantiate()` |
| `File.new()` | `FileAccess.open()` |
| `Directory` | `DirAccess` |
| `OS.get_ticks_msec()` | `Time.get_ticks_msec()` |
| `OS.get_window_size()` | `DisplayServer.window_get_size()` |
| `emit_signal("name")` | `name.emit()` |
| `yield(signal)` | `await signal` |
| `connect("sig", obj, "method")` | `sig.connect(method)` |
| `onready var` | `@onready var` |
| `export var` | `@export var` |

## Class Renames
| Godot 3 | Godot 4 |
|---------|---------|
| `KinematicBody2D` | `CharacterBody2D` |
| `KinematicBody` | `CharacterBody3D` |
| `Spatial` | `Node3D` |
| `Sprite` | `Sprite2D` |
| `AnimatedSprite` | `AnimatedSprite2D` |
| `SpatialMaterial` | `StandardMaterial3D` |
| `Particles` | `GPUParticles3D` |
| `Particles2D` | `GPUParticles2D` |
| `Position2D` | `Marker2D` |
| `Position3D` | `Marker3D` |
| `GIProbe` | `VoxelGI` |
| `BakedLightmap` | `LightmapGI` |
| `StreamTexture` | `CompressedTexture2D` |
| `CubeMesh` | `BoxMesh` |

## Method Renames
| Class | Godot 3 | Godot 4 |
|-------|---------|---------|
| Array | `.empty()` | `.is_empty()` |
| Array | `.invert()` | `.reverse()` |
| Array | `.remove(i)` | `.remove_at(i)` |
| CanvasItem | `.update()` | `.queue_redraw()` |
| CanvasItem | `.raise()` | `.move_to_front()` |
| AnimationPlayer | `add_animation()` | `add_animation_library()` |
| Control | `get_stylebox()` | `get_theme_stylebox()` |
| Camera2D | `get_h_offset()` | `get_drag_horizontal_offset()` |

## 4.0 → 4.1
- `PathFollow2D.lookahead` removed
- `NavigationAgent2D/3D`: `set_velocity()` → `velocity` property; `time_horizon` → `time_horizon_agents` + `time_horizon_obstacles`
- `AnimationTrackEditPlugin` removed
- `EditorInterface` now inherits `Object` (not `Node`)

## 4.1 → 4.2
- `AnimationMixer` new base — methods moved: `add_animation_library`, `advance`, `clear_caches`, `find_animation`, `get_animation`, `get_animation_list`, `has_animation`
- Renamed: `method_call_mode` → `callback_mode_method`, `playback_active` → `active`
- `GraphNode` now inherits `GraphElement`

## 4.2 → 4.3
- `BoneAttachment3D`: `on_bone_pose_update` → `on_skeleton_update`
- `Skeleton3D`: `bone_pose_changed` → `skeleton_updated`
- `EditorSceneFormatImporterFBX` → `EditorSceneFormatImporterFBX2GLTF`
- `NavigationRegion2D`: `avoidance_layers`, `constrain_avoidance` removed

## 4.3 → 4.4
- `FileAccess`: all 14 `store_*` methods return `bool`
- `RenderingDevice.draw_list_begin()` added optional `breadcrumb`

## 4.4 → 4.5
- `CanvasItem/Font`: `oversampling` param added to all draw methods
- Physics (Jolt): `Area3D` + `StaticBody3D` overlaps reported by default

## 4.5 → 4.6
- `AnimationPlayer`: `assigned_animation`, `autoplay`, `current_animation` are now `StringName`
- `Control.grab_focus()` added optional `hide_focus`
- `EditorFileDialog.add_side_menu()` removed (18 methods moved to base `FileDialog`)
- `Environment`: default `glow_blend_mode=1`, `glow_intensity=0.3`
- `FileAccess.get_as_text()` removed `skip_cr` param
- `SkeletonIK3D` replaced by `SkeletonModifier3D` system (`TwoBoneIK3D`, etc.)
- `Control.pivot_offset_ratio` added (normalized 0–1 pivot)
- `Array.reserve()` for pre-allocation performance
