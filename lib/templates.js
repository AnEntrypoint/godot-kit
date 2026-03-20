'use strict';

const { PLUGIN_CFG, PLUGIN_GD } = require('./gd-plugin');
const { EDITOR_HTTP_GD } = require('./gd-editor-http');
const { REPL_BRIDGE_WITH_HTTP } = require('./gd-repl-bridge');

module.exports = function getTemplates(projectName) {
  return {
    'project.godot': `; Engine configuration file.
config_version=5

[application]

config/name="${projectName}"
config/features=PackedStringArray("4.6")
config/icon="res://icon.svg"
run/main_scene="res://scenes/level.tscn"

[autoload]

ReplBridge="*res://addons/repl_bridge/repl_bridge.gd"

[debug]

settings/stdout/print_fps=true
settings/stdout/verbose_stdout=true

[editor_plugins]

enabled=PackedStringArray("res://addons/godot_kit_bridge/plugin.cfg")
`,

    'scenes/level.tscn': `[gd_scene load_steps=14 format=3 uid="uid://level"]

[ext_resource type="Script" path="res://scripts/game.gd" id="1_game"]
[ext_resource type="PackedScene" uid="uid://player" path="res://scenes/player.tscn" id="2_player"]
[ext_resource type="Script" path="res://scripts/moving_platform.gd" id="3_platform"]
[ext_resource type="Script" path="res://scripts/spike.gd" id="4_spike"]
[ext_resource type="Script" path="res://scripts/collectible.gd" id="5_coin"]
[ext_resource type="Script" path="res://scripts/goal.gd" id="6_goal"]

[sub_resource type="RectangleShape2D" id="RectangleShape2D_floor"]
size = Vector2(1200, 32)

[sub_resource type="RectangleShape2D" id="RectangleShape2D_platform"]
size = Vector2(120, 24)

[sub_resource type="RectangleShape2D" id="RectangleShape2D_spike"]
size = Vector2(32, 32)

[sub_resource type="RectangleShape2D" id="RectangleShape2D_coin"]
size = Vector2(24, 24)

[sub_resource type="RectangleShape2D" id="RectangleShape2D_goal"]
size = Vector2(48, 64)

[sub_resource type="RectangleShape2D" id="RectangleShape2D_wall"]
size = Vector2(32, 400)

[sub_resource type="RectangleShape2D" id="RectangleShape2D2"]
size = Vector2(32, 400)

[node name="Level" type="Node2D"]
script = ExtResource("1_game")
player_scene = ExtResource("2_player")

[node name="Ground" type="StaticBody2D" parent="."]

[node name="Floor" type="CollisionShape2D" parent="Ground"]
position = Vector2(600, 580)
shape = SubResource("RectangleShape2D_floor")

[node name="LeftWall" type="CollisionShape2D" parent="Ground"]
position = Vector2(16, 400)
shape = SubResource("RectangleShape2D_wall")

[node name="RightWall" type="CollisionShape2D" parent="Ground"]
position = Vector2(1200, 400)
shape = SubResource("RectangleShape2D2")

[node name="Platforms" type="Node2D" parent="."]

[node name="Platform1" type="StaticBody2D" parent="Platforms"]
position = Vector2(250, 480)

[node name="Sprite" type="ColorRect" parent="Platforms/Platform1"]
offset_left = -60.0
offset_top = -12.0
offset_right = 60.0
offset_bottom = 12.0
color = Color(0.3, 0.7, 0.4, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Platforms/Platform1"]
shape = SubResource("RectangleShape2D_platform")

[node name="Platform2" type="StaticBody2D" parent="Platforms"]
position = Vector2(450, 400)

[node name="Sprite" type="ColorRect" parent="Platforms/Platform2"]
offset_left = -60.0
offset_top = -12.0
offset_right = 60.0
offset_bottom = 12.0
color = Color(0.3, 0.7, 0.4, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Platforms/Platform2"]
shape = SubResource("RectangleShape2D_platform")

[node name="MovingPlatform" type="StaticBody2D" parent="Platforms"]
position = Vector2(600, 320)
script = ExtResource("3_platform")
move_distance = 120.0
move_speed = 2.0

[node name="Sprite" type="ColorRect" parent="Platforms/MovingPlatform"]
offset_left = -60.0
offset_top = -12.0
offset_right = 60.0
offset_bottom = 12.0
color = Color(0.4, 0.6, 0.8, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Platforms/MovingPlatform"]
shape = SubResource("RectangleShape2D_platform")

[node name="Platform3" type="StaticBody2D" parent="Platforms"]
position = Vector2(850, 250)

[node name="Sprite" type="ColorRect" parent="Platforms/Platform3"]
offset_left = -60.0
offset_top = -12.0
offset_right = 60.0
offset_bottom = 12.0
color = Color(0.3, 0.7, 0.4, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Platforms/Platform3"]
shape = SubResource("RectangleShape2D_platform")

[node name="Platform4" type="StaticBody2D" parent="Platforms"]
position = Vector2(1050, 180)

[node name="Sprite" type="ColorRect" parent="Platforms/Platform4"]
offset_left = -60.0
offset_top = -12.0
offset_right = 60.0
offset_bottom = 12.0
color = Color(0.3, 0.7, 0.4, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Platforms/Platform4"]
shape = SubResource("RectangleShape2D_platform")

[node name="Spikes" type="Node2D" parent="."]

[node name="Spike1" type="Area2D" parent="Spikes"]
position = Vector2(350, 548)
script = ExtResource("4_spike")

[node name="Sprite" type="ColorRect" parent="Spikes/Spike1"]
offset_left = -16.0
offset_top = -16.0
offset_right = 16.0
offset_bottom = 16.0
color = Color(0.9, 0.2, 0.2, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Spikes/Spike1"]
shape = SubResource("RectangleShape2D_spike")

[node name="Spike2" type="Area2D" parent="Spikes"]
position = Vector2(500, 548)
script = ExtResource("4_spike")

[node name="Sprite" type="ColorRect" parent="Spikes/Spike2"]
offset_left = -16.0
offset_top = -16.0
offset_right = 16.0
offset_bottom = 16.0
color = Color(0.9, 0.2, 0.2, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Spikes/Spike2"]
shape = SubResource("RectangleShape2D_spike")

[node name="Spike3" type="Area2D" parent="Spikes"]
position = Vector2(700, 548)
script = ExtResource("4_spike")

[node name="Sprite" type="ColorRect" parent="Spikes/Spike3"]
offset_left = -16.0
offset_top = -16.0
offset_right = 16.0
offset_bottom = 16.0
color = Color(0.9, 0.2, 0.2, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Spikes/Spike3"]
shape = SubResource("RectangleShape2D_spike")

[node name="Collectibles" type="Node2D" parent="."]

[node name="Coin1" type="Area2D" parent="Collectibles"]
position = Vector2(250, 440)
script = ExtResource("5_coin")
value = 1

[node name="Sprite" type="ColorRect" parent="Collectibles/Coin1"]
offset_left = -12.0
offset_top = -12.0
offset_right = 12.0
offset_bottom = 12.0
color = Color(1, 0.85, 0.2, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Collectibles/Coin1"]
shape = SubResource("RectangleShape2D_coin")

[node name="Coin2" type="Area2D" parent="Collectibles"]
position = Vector2(450, 360)
script = ExtResource("5_coin")
value = 1

[node name="Sprite" type="ColorRect" parent="Collectibles/Coin2"]
offset_left = -12.0
offset_top = -12.0
offset_right = 12.0
offset_bottom = 12.0
color = Color(1, 0.85, 0.2, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Collectibles/Coin2"]
shape = SubResource("RectangleShape2D_coin")

[node name="Coin3" type="Area2D" parent="Collectibles"]
position = Vector2(600, 280)
script = ExtResource("5_coin")
value = 1

[node name="Sprite" type="ColorRect" parent="Collectibles/Coin3"]
offset_left = -12.0
offset_top = -12.0
offset_right = 12.0
offset_bottom = 12.0
color = Color(1, 0.85, 0.2, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Collectibles/Coin3"]
shape = SubResource("RectangleShape2D_coin")

[node name="Coin4" type="Area2D" parent="Collectibles"]
position = Vector2(850, 210)
script = ExtResource("5_coin")
value = 1

[node name="Sprite" type="ColorRect" parent="Collectibles/Coin4"]
offset_left = -12.0
offset_top = -12.0
offset_right = 12.0
offset_bottom = 12.0
color = Color(1, 0.85, 0.2, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Collectibles/Coin4"]
shape = SubResource("RectangleShape2D_coin")

[node name="Goal" type="Area2D" parent="."]
position = Vector2(1050, 120)
script = ExtResource("6_goal")

[node name="Sprite" type="ColorRect" parent="Goal"]
offset_left = -24.0
offset_top = -32.0
offset_right = 24.0
offset_bottom = 32.0
color = Color(0.2, 0.9, 0.4, 1)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Goal"]
shape = SubResource("RectangleShape2D_goal")

[node name="Camera2D" type="Camera2D" parent="."]
position = Vector2(600, 300)
zoom = Vector2(1.2, 1.2)
`,

    'scenes/player.tscn': `[gd_scene load_steps=8 format=3 uid="uid://player"]

[ext_resource type="Script" path="res://scripts/player.gd" id="1_player"]

[sub_resource type="RectangleShape2D" id="RectangleShape2D_player"]
size = Vector2(32, 48)

[sub_resource type="Animation" id="Animation_idle"]
length = 0.1
tracks/0/type = "value"
tracks/0/imported = false
tracks/0/enabled = true
tracks/0/path = NodePath("Sprite2D:modulate")
tracks/0/interp = 1
tracks/0/loop_wrap = true
tracks/0/keys = {
"times": PackedFloat32Array(0),
"transitions": PackedFloat32Array(1),
"update": 0,
"values": [Color(1, 1, 1, 1)]
}

[sub_resource type="Animation" id="Animation_run"]
length = 0.5
loop_mode = 1
tracks/0/type = "value"
tracks/0/imported = false
tracks/0/enabled = true
tracks/0/path = NodePath("Sprite2D:modulate")
tracks/0/interp = 1
tracks/0/loop_wrap = true
tracks/0/keys = {
"times": PackedFloat32Array(0, 0.25),
"transitions": PackedFloat32Array(1, 1),
"update": 0,
"values": [Color(1, 1, 1, 1), Color(1, 0.9, 0.9, 1)]
}

[sub_resource type="Animation" id="Animation_jump"]
length = 0.3
tracks/0/type = "value"
tracks/0/imported = false
tracks/0/enabled = true
tracks/0/path = NodePath("Sprite2D:modulate")
tracks/0/interp = 1
tracks/0/loop_wrap = true
tracks/0/keys = {
"times": PackedFloat32Array(0),
"transitions": PackedFloat32Array(1),
"update": 0,
"values": [Color(1, 0.8, 0.8, 1)]
}

[sub_resource type="Animation" id="Animation_fall"]
length = 0.3
tracks/0/type = "value"
tracks/0/imported = false
tracks/0/enabled = true
tracks/0/path = NodePath("Sprite2D:modulate")
tracks/0/interp = 1
tracks/0/loop_wrap = true
tracks/0/keys = {
"times": PackedFloat32Array(0),
"transitions": PackedFloat32Array(1),
"update": 0,
"values": [Color(0.9, 0.9, 1, 1)]
}

[sub_resource type="Animation" id="Animation_dash"]
length = 0.2
tracks/0/type = "value"
tracks/0/imported = false
tracks/0/enabled = true
tracks/0/path = NodePath("Sprite2D:modulate")
tracks/0/interp = 1
tracks/0/loop_wrap = true
tracks/0/keys = {
"times": PackedFloat32Array(0),
"transitions": PackedFloat32Array(1),
"update": 0,
"values": [Color(0.8, 1, 0.8, 1)]
}

[sub_resource type="Animation" id="Animation_wall_slide"]
length = 0.1
tracks/0/type = "value"
tracks/0/imported = false
tracks/0/enabled = true
tracks/0/path = NodePath("Sprite2D:modulate")
tracks/0/interp = 1
tracks/0/loop_wrap = true
tracks/0/keys = {
"times": PackedFloat32Array(0),
"transitions": PackedFloat32Array(1),
"update": 0,
"values": [Color(1, 0.8, 1, 1)]
}

[node name="Player" type="CharacterBody2D"]
floor_stop_on_slope = true
floor_linear_slope_degree = 15.0
floor_max_angle = 46.0
script = ExtResource("1_player")
max_speed = 300.0
acceleration = 1200.0
deceleration = 1500.0
air_acceleration = 600.0
air_deceleration = 400.0
jump_velocity = -450.0
jump_cut_velocity = -200.0
gravity = 1200.0
fall_gravity_multiplier = 1.5
coyote_time = 0.15
jump_buffer_time = 0.15
wall_slide_speed = 100.0
wall_jump_velocity = Vector2(300, 400)
wall_jump_duration = 0.3
dash_speed = 600.0
dash_duration = 0.2
dash_cooldown = 0.5

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
shape = SubResource("RectangleShape2D_player")

[node name="Sprite2D" type="Sprite2D" parent="."]
modulate = Color(0.4, 0.6, 1, 1)

[node name="AnimationPlayer" type="AnimationPlayer" parent="."]
autoplay = "idle"
anims/idle = SubResource("Animation_idle")
anims/run = SubResource("Animation_run")
anims/jump = SubResource("Animation_jump")
anims/fall = SubResource("Animation_fall")
anims/dash = SubResource("Animation_dash")
anims/wall_slide = SubResource("Animation_wall_slide")
`,

    'scripts/game.gd': `extends Node2D

@export var player_scene: PackedScene

var _player: Node2D

func _ready() -> void:
\t_spawn_player()

func _spawn_player() -> void:
\tif not player_scene:
\t\treturn
\t_player = player_scene.instantiate()
\tadd_child(_player)
\t_player.global_position = Vector2(150, 300)
`,

    'scripts/player.gd': `extends CharacterBody2D

signal jump
signal land
signal dash

const FLOOR_NORMAL := Vector2.UP
const SLOPE_SLIDE_STOP := 25.0

@export var max_speed := 300.0
@export var acceleration := 1200.0
@export var deceleration := 1500.0
@export var air_acceleration := 600.0
@export var air_deceleration := 400.0

@export var jump_velocity := -450.0
@export var jump_cut_velocity := -200.0
@export var gravity := 1200.0
@export var fall_gravity_multiplier := 1.5

@export var coyote_time := 0.15
@export var jump_buffer_time := 0.15

@export var wall_slide_speed := 100.0
@export var wall_jump_velocity := Vector2(300.0, -400.0)
@export var wall_jump_duration := 0.3

@export var dash_speed := 600.0
@export var dash_duration := 0.2
@export var dash_cooldown := 0.5

var _animation_player: AnimationPlayer
var _sprite: Sprite2D

var _coyote_timer := 0.0
var _jump_buffer_timer := 0.0
var _wall_jump_timer := 0.0
var _dash_timer := 0.0
var _dash_cooldown_timer := 0.0

var _is_wall_sliding := false
var _is_dashing := false
var _wall_direction := 0


func _ready() -> void:
\t_animation_player = get_node_or_null("AnimationPlayer")
\t_sprite = get_node_or_null("Sprite2D")


func _physics_process(delta: float) -> void:
\t_update_timers(delta)
\t_apply_gravity(delta)
\t_handle_movement_input(delta)
\t_handle_jump_input()
\t_handle_wall_slide()
\t_handle_dash_input()
\t_move_and_slide()
\t_update_animations()


func _update_timers(delta: float) -> void:
\t_coyote_timer -= delta
\t_jump_buffer_timer -= delta
\t_wall_jump_timer -= delta
\t_dash_timer -= delta
\t_dash_cooldown_timer -= delta

\tif is_on_floor():
\t\t_coyote_timer = coyote_time


func _apply_gravity(delta: float) -> void:
\tif _is_dashing:
\t\treturn

\tvar current_gravity := gravity
\tif velocity.y > 0:
\t\tcurrent_gravity *= fall_gravity_multiplier

\tvelocity.y += current_gravity * delta
\tif velocity.y > 0:
\t\tvelocity.y = min(velocity.y, 800.0)


func _handle_movement_input(delta: float) -> void:
\tif _is_dashing:
\t\treturn

\tif _wall_jump_timer > 0:
\t\treturn

\tvar input_direction := Input.get_axis("ui_left", "ui_right")

\tvar accel := acceleration if is_on_floor() else air_acceleration
\tvar decel := deceleration if is_on_floor() else air_deceleration

\tif input_direction != 0:
\t\tvelocity.x = move_toward(velocity.x, input_direction * max_speed, accel * delta)
\t\tif _sprite:
\t\t\t_sprite.flip_h = input_direction < 0
\telse:
\t\tvelocity.x = move_toward(velocity.x, 0, decel * delta)


func _handle_jump_input() -> void:
\tif Input.is_action_just_pressed("ui_accept"):
\t\t_jump_buffer_timer = jump_buffer_time

\tif _jump_buffer_timer > 0:
\t\tif _can_jump():
\t\t\tperform_jump()
\t\t\t_jump_buffer_timer = 0
\t\telif _can_wall_jump():
\t\t\tperform_wall_jump()


func _can_jump() -> bool:
\treturn is_on_floor() or _coyote_timer > 0


func _can_wall_jump() -> bool:
\tif not is_on_wall():
\t\treturn false
\t_wall_direction = get_wall_normal().x
\treturn _wall_direction != 0


func perform_jump() -> void:
\tvelocity.y = jump_velocity
\t_coyote_timer = 0
\tjump.emit()


func perform_wall_jump() -> void:
\tvelocity.x = -_wall_direction * wall_jump_velocity.x
\tvelocity.y = wall_jump_velocity.y
\t_wall_jump_timer = wall_jump_duration
\tif _sprite:
\t\t_sprite.flip_h = _wall_direction > 0
\tjump.emit()


func _handle_wall_slide() -> void:
\tif not is_on_wall():
\t\t_is_wall_sliding = false
\t\treturn

\tif velocity.y > 0 and Input.get_axis("ui_left", "ui_right") == -get_wall_normal().x:
\t\t_is_wall_sliding = true
\t\tvelocity.y = min(velocity.y, wall_slide_speed)
\telse:
\t\t_is_wall_sliding = false


func _handle_dash_input() -> void:
\tif _dash_cooldown_timer > 0 or _is_dashing:
\t\treturn

\tif Input.is_key_pressed(KEY_SHIFT) and not _is_dashing and _dash_cooldown_timer <= 0:
\t\tperform_dash()


func perform_dash() -> void:
\t_is_dashing = true
\t_dash_timer = dash_duration
\t_dash_cooldown_timer = dash_cooldown

\tvar dash_direction := Vector2.RIGHT
\tif _sprite:
\t\tdash_direction = Vector2.LEFT if _sprite.flip_h else Vector2.RIGHT

\tvelocity = dash_direction * dash_speed
\tdash.emit()


func _move_and_slide() -> void:
\tif _is_dashing and _dash_timer <= 0:
\t\t_is_dashing = false
\t\tvelocity = Vector2.ZERO

\tmove_and_slide()

\tif is_on_floor() and _coyote_timer <= 0:
\t\tland.emit()


func _update_animations() -> void:
\tif not _animation_player:
\t\treturn

\tvar state := "idle"

\tif _is_dashing:
\t\tstate = "dash"
\telif _is_wall_sliding:
\t\tstate = "wall_slide"
\telif not is_on_floor():
\t\tstate = "jump" if velocity.y < 0 else "fall"
\telif abs(velocity.x) > 10:
\t\tstate = "run"

\tif _animation_player.current_animation != state:
\t\t_animation_player.play(state)
`,

    'scripts/moving_platform.gd': `extends StaticBody2D

@export var move_distance := 150.0
@export var move_speed := 2.0
@export var wait_time := 0.5

var _start_position: Vector2
var _direction := 1.0
var _wait_timer := 0.0


func _ready() -> void:
\t_start_position = global_position


func _physics_process(delta: float) -> void:
\tif _wait_timer > 0:
\t\t_wait_timer -= delta
\t\treturn

\tglobal_position.x += _direction * move_speed * delta

\tvar distance_traveled: float = abs(global_position.x - _start_position.x)
\tif distance_traveled >= move_distance:
\t\t_direction *= -1
\t\t_wait_timer = wait_time
`,

    'scripts/spike.gd': `extends Area2D

signal player_hit

func _on_body_entered(body: Node2D) -> void:
\tif body is CharacterBody2D:
\t\tplayer_hit.emit()
\t\trespawn_player(body)

func respawn_player(player: CharacterBody2D) -> void:
\tplayer.velocity = Vector2.ZERO
\tplayer.global_position = Vector2(150, 300)
`,

    'scripts/collectible.gd': `extends Area2D

signal collected

@export var value := 1

var _collected := false

func _on_body_entered(body: Node2D) -> void:
\tif _collected:
\t\treturn
\tif body is CharacterBody2D:
\t\t_collected = true
\t\tcollected.emit(value)
\t\tqueue_free()
`,

    'scripts/goal.gd': `extends Area2D

signal level_completed

func _on_body_entered(body: Node2D) -> void:
\tif body is CharacterBody2D:
\t\tlevel_completed.emit()
\t\tprint("LEVEL COMPLETED!")
`,

    'addons/repl_bridge/repl_bridge.gd': REPL_BRIDGE_WITH_HTTP,

    'addons/repl_bridge/plugin.cfg': `[plugin]
name="ReplBridge"
description="Remote REPL bridge for godot-kit CLI debugging"
author="AnEntrypoint"
version="4.0.0"
script="repl_bridge.gd"
`,

    'addons/godot_kit_bridge/plugin.cfg': PLUGIN_CFG,
    'addons/godot_kit_bridge/plugin.gd': PLUGIN_GD,
    'addons/godot_kit_bridge/editor_http.gd': EDITOR_HTTP_GD,

    '.gdlintrc': `max-line-length: 120
max-returns: 10
excluded_directories: !!set
  .git: null
  addons: null
disable:
- class-definitions-order
`,

    '.gdformatrc': `line_length = 120
`,

    '.vscode/settings.json': `{
  "godot_tools.editor_path": "",
  "godot_tools.gdscript_lsp_server_port": 6005,
  "[gdscript]": { "editor.defaultFormatter": "geequlim.godot-tools" }
}
`,

    '.vscode/launch.json': `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Godot Game",
      "type": "godot",
      "request": "launch",
      "project": "\${workspaceFolder}",
      "address": "tcp://127.0.0.1",
      "port": 6007,
      "profiling": false
    },
    {
      "name": "Attach to Godot",
      "type": "godot",
      "request": "attach",
      "project": "\${workspaceFolder}",
      "address": "tcp://127.0.0.1",
      "port": 6007
    }
  ]
}
`,

    '.vscode/extensions.json': `{ "recommendations": ["geequlim.godot-tools"] }
`,

    'icon.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#478cbf"/>
  <text x="64" y="80" font-size="56" text-anchor="middle" fill="white" font-family="sans-serif">G</text>
</svg>
`,

    '.gitignore': `.godot/\n*.import\nexport_presets.cfg\n*.translation\nnode_modules/\n`,

    'package.json': JSON.stringify({
      name: projectName,
      version: '0.1.0',
      private: true,
      devDependencies: {
        'codebasesearch': 'latest',
      },
    }, null, 2) + '\n',

    '.codebasesearch.json': JSON.stringify({
      include: ['**/*.gd', '**/*.tscn', '**/*.tres', 'project.godot'],
      exclude: ['addons/godot_kit_bridge/**', 'addons/repl_bridge/**'],
      language: 'gdscript',
    }, null, 2) + '\n',

    'Makefile': `setup:\n\tgodot-dev setup\nrun:\n\tgodot-dev launch\nrepl:\n\tgodot-dev repl\ninspect:\n\tgodot-dev inspect\nlogs:\n\tgodot-dev logs\nlint:\n\tgodot-dev lint\nformat:\n\tgodot-dev format\nwatch:\n\tgodot-dev watch\n.PHONY: setup run repl inspect logs lint format watch\n`,

    'CLAUDE.md': `# ${projectName} — Godot 4.6 Project

## Setup (one-time)
\`\`\`bash
godot-dev download-engine          # downloads Godot 4.6-stable to ~/.godot-kit/
godot-dev setup                    # installs gdtoolkit via pip3 (needs Python 3)
godot-dev download-export-templates # only needed before first export
\`\`\`

## Workflow: editing and running
Always edit .gd and .tscn files directly with Read/Write/Edit tools.
After writing files, the editor auto-imports — use \`godot-dev wait-import\` if you need to confirm before querying the editor.

Launch the game (keep running in background):
\`\`\`bash
godot-dev launch                   # starts Godot, debugger on :6007, game HTTP on :6009
\`\`\`

While game is running, all \`game\` commands work over HTTP (port 6009):
\`\`\`bash
godot-dev game tree                          # full scene tree with class names + paths
godot-dev game tree --depth 2                # limit depth
godot-dev game tree --filter CharacterBody2D # show only nodes of a class
godot-dev game node /root/Level/Player       # all exported properties of one node
godot-dev game eval "get_tree().paused"      # any GDScript expression, runs in ReplBridge context
godot-dev game set /root/Level/Player speed 500  # set any exported property by node path
godot-dev game call /root/Level/Player perform_jump  # call any method
godot-dev game call /root/Level/Player move_toward '[100,200]'  # method with args (JSON array)
godot-dev game signal /root/Level/Player jump  # emit a signal
godot-dev game globals                       # list all autoloads (root children)
godot-dev game perf                          # fps, memory, draw calls, physics objects
godot-dev game fps                           # just fps
godot-dev game logs                          # buffered print() output from game
godot-dev game logs --follow                 # stream new logs every 500ms
godot-dev game errors                        # buffered push_error() output
godot-dev game groups                        # all groups and member node paths
godot-dev game watch "velocity"              # poll expression every 500ms (returns watch id)
godot-dev game watches                       # show all active watch values
godot-dev game pause                         # toggle get_tree().paused
godot-dev game reload                        # reload current scene
godot-dev game screenshot                    # capture game viewport as PNG (saves to cwd, prints path)
godot-dev game screenshot --output out.png   # save to specific file
godot-dev game repl                          # interactive GDScript REPL (Ctrl+C to exit)
\`\`\`

## Editor commands (port 6008, Godot editor must be open with GodotKitBridge plugin active)
\`\`\`bash
godot-dev editor tree                        # scene tree of currently open scene
godot-dev editor selected                    # currently selected nodes
godot-dev editor select /root/Level/Player   # select node in editor
godot-dev editor files                       # all project files (res://)
godot-dev editor autoloads                   # project autoloads from project.godot
godot-dev editor plugins                     # active editor plugins
godot-dev editor open res://scenes/level.tscn # open a scene
godot-dev editor save                        # save current scene
godot-dev editor play                        # press Play in editor
godot-dev editor stop                        # press Stop in editor
godot-dev editor create /root/Level Node2D MyNode   # create node (parent, type, name)
godot-dev editor delete /root/Level/MyNode   # delete node
godot-dev editor property /root/Level/Player position '{"x":100,"y":200}'  # set property via UndoRedo
godot-dev editor signals /root/Level/Player  # list all signals on a node
godot-dev editor inspector                   # show selected node's exported properties
godot-dev editor run "EditorInterface.get_base_control().get_class()"  # run GDScript in editor
godot-dev editor import-status               # is editor currently scanning/importing?
godot-dev editor screenshot                  # capture editor screen as PNG (saves to cwd, prints path)
godot-dev editor screenshot --output out.png # save to specific file
godot-dev editor repl                        # interactive editor GDScript REPL
\`\`\`

## Debugger (TCP port 6007, game must be launched with godot-dev launch)
\`\`\`bash
godot-dev repl                               # interactive REPL via TCP debugger
godot-dev inspect                            # one-shot scene tree dump via TCP
godot-dev logs                               # stream all print() output in real time
godot-dev attach                             # auto-detect TCP or HTTP and start REPL
\`\`\`

## Code quality
\`\`\`bash
godot-dev lint                               # gdlint all .gd files
godot-dev lint scripts/player.gd            # lint specific file
godot-dev format                             # gdformat all .gd files
godot-dev format --check                     # check without writing
godot-dev validate                           # lint + Godot 3.x deprecated API check
\`\`\`

## Scene and file management
\`\`\`bash
godot-dev scene new res://scenes/enemy.tscn         # create blank .tscn (Node2D root)
godot-dev scene new res://scenes/ui.tscn Control    # create with specific root type
godot-dev input-map list                             # list all input actions in project.godot
godot-dev wait-import                                # wait for editor import to finish (30s timeout)
godot-dev wait-import --timeout 60000               # custom timeout
\`\`\`

## Testing and export
\`\`\`bash
godot-dev test scripts/test_math.gd          # run GDScript headlessly, exits 0=pass 1=fail
godot-dev export "Windows Desktop"           # export by preset name (needs export templates)
godot-dev export "Web" --output ./build/web
godot-dev dashboard                          # live terminal UI: scene tree + perf + logs
\`\`\`

## Real-world nuances

### Port 6007 vs 6009
- **6007 (TCP debugger)**: available only when launched via \`godot-dev launch\`. Gives raw debugger access (logs, scene tree via protocol). Use \`godot-dev repl/inspect/logs\`.
- **6009 (HTTP game bridge)**: available when game is running AND ReplBridge autoload is active. More capable: eval, set, call, watch, groups, physics. Use all \`game\` commands.
- **6008 (HTTP editor bridge)**: available when Godot editor is open with GodotKitBridge plugin enabled. Use all \`editor\` commands.
- Both 6009 and 6007 can be active simultaneously. \`game\` commands always use 6009.

### After writing .gd files
- Godot hot-reloads scripts automatically when the editor is open.
- The running game does NOT auto-reload scripts — use \`godot-dev game reload\` to reload the scene, or \`godot-dev watch\` to auto-reload on every .gd save.
- If you add new files, the editor must import them first. Check: \`godot-dev editor import-status\`.

### Node paths
- All node paths start with \`/root/\`. Use \`godot-dev game tree\` to discover exact paths.
- The game's root scene node is typically \`/root/Level\` (from level.tscn).
- Player is at \`/root/Level/Player\` after spawning via game.gd.

### GDScript eval context
- \`game eval\` runs in the ReplBridge node's context (an autoload at \`/root/ReplBridge\`).
- Access the tree: \`get_tree().root\`, find nodes: \`get_node("/root/Level/Player")\`.
- Can call any autoload directly: \`ReplBridge.log_info("test")\`.
- Expressions only — no multi-line. For complex ops use \`game call\` or write a method.

### Signal connections
- Signals in .tscn files must be connected either in the scene file or via code.
- Area2D/CollisionShape2D bodies: connect \`body_entered\` signal. Spike/Collectible/Goal use this pattern.
- To connect at runtime: \`game eval "get_node('/root/Level/Goal').body_entered.connect(Callable(get_node('/root/Level'), '_on_goal_body_entered'))"\`

### Export
- Export presets are defined in \`export_presets.cfg\` (not gitignored by default — add if it has credentials).
- Export templates must be installed: \`godot-dev download-export-templates\`.
- Headless export: \`godot-dev export "Linux/X11"\` (preset name must match exactly).

### Input actions
- Default actions (ui_left, ui_right, ui_accept) are built-in Godot actions. Dash uses \`KEY_SHIFT\` (held Shift key).
- Custom actions go in \`[input]\` section of project.godot. Use \`godot-dev input-map list\` to verify.
- Player dash uses \`KEY_SHIFT\` (held Shift key) — no custom action needed.

### GDScript conventions (Godot 4.6)
- \`CharacterBody2D\` (not KinematicBody2D), \`move_and_slide()\` uses \`velocity\` property.
- \`@export var speed := 300.0\` — typed with default, visible in inspector.
- \`await signal_name\` (not yield). \`signal_name.emit()\` (not emit_signal).
- \`FileAccess.open()\` static (not \`File.new()\`). \`DirAccess.open()\` (not \`Directory\`).
- \`Time.get_ticks_msec()\` (not \`OS.get_ticks_msec()\`).
- \`instantiate()\` (not \`instance()\`). \`is_empty()\` (not \`empty()\`).
`,
  };
};
