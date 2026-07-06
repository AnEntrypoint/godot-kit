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
