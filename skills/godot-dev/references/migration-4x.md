# Godot 3.x -> 4.6 Migration

## Godot Upgrade Skill: Manual Migration Guide (3.x to 4.6)

This document provides the explicit, manual find-and-replace instructions required to upgrade Godot projects from version 3.x through 4.6. Do not rely on automated tools; execute these exact changes in your script editor.

### Godot 3 to 4.0

#### Global & Core API
| Old Godot 3 API | New Godot 4 API |
| :--- | :--- |
| `instance()` | `instantiate()` |
| `File` / `Directory` | `FileAccess` / `DirAccess` (Use static methods, e.g., `FileAccess.open()`) |
| `OS` Screen/Window methods | `DisplayServer` (e.g., `DisplayServer.screen_get_size()`) |
| `OS` Time/Date methods | `Time` singleton (e.g., `Time.get_ticks_msec()`) |
| Virtual Methods | Add leading underscore (e.g., `AnimationNode.process()` ➔ `_process()`) |

#### Node Method Renames
| Class | Old Method | New Method |
| :--- | :--- | :--- |
| **AcceptDialog** | `set_autowrap()` | `set_autowrap_mode()` |
| **AnimationPlayer** | `add_animation()` | `add_animation_library()` |
| **AnimationTree** | `set_process_mode()` | `set_process_callback()` |
| **Array** | `empty()` | `is_empty()` |
| **Array** | `invert()` | `reverse()` |
| **Array** | `remove()` | `remove_at()` |
| **AStar2D / 3D** | `get_points()` | `get_points_id()` |
| **BaseButton** | `set_event()` | `set_shortcut()` |
| **Camera2D** | `get_h_offset()` | `get_drag_horizontal_offset()` |
| **Camera2D** | `get_v_offset()` | `get_drag_vertical_offset()` |
| **Camera2D** | `set_h_offset()` | `set_drag_horizontal_offset()` |
| **Camera2D** | `set_v_offset()` | `set_drag_vertical_offset()` |
| **CanvasItem** | `raise()` | `move_to_front()` |
| **CanvasItem** | `update()` | `queue_redraw()` |
| **Control** | `get_stylebox()` | `get_theme_stylebox()` |

#### Class & Resource Renames
| Old Godot 3 Name | New Godot 4 Name |
| :--- | :--- |
| `AnimatedSprite` | `AnimatedSprite2D` |
| `ARVR*` | `XR*` |
| `BoxShape` / `CapsuleShape` / `PlaneShape` | `BoxShape3D` / `CapsuleShape3D` / `WorldBoundaryShape3D` |
| `CubeMesh` | `BoxMesh` |
| `GIProbe` / `GIProbeData` | `VoxelGI` / `VoxelGIData` |
| `KinematicBody` / `KinematicBody2D` | `CharacterBody3D` / `CharacterBody2D` |
| `NavigationMeshInstance` | `NavigationRegion3D` |
| `NavigationPolygonInstance` | `NavigationRegion2D` |
| `PanoramaSky` | `Sky` |
| `Particles` / `Particles2D` | `GPUParticles3D` / `GPUParticles2D` |
| `ParticlesMaterial` | `ParticleProcessMaterial` |
| `Position2D` / `Position3D` | `Marker2D` / `Marker3D` |
| `Spatial` | `Node3D` |
| `SpatialMaterial` | `StandardMaterial3D` |
| `Sprite` | `Sprite2D` |
| `StreamTexture` | `CompressedTexture2D` |

### Godot 4.0 to 4.1
* **AnimationNode**: `_process()` and `blend_input()` add optional `test_only` parameter.
* **PathFollow2D**: `lookahead` property removed entirely.
* **NavigationAgent2D & 3D**: Replace `set_velocity()` with `velocity` property. Split `time_horizon` into `time_horizon_agents` and `time_horizon_obstacles`.
* **NavigationAgent3D**: Rename `agent_height_offset` to `path_height_offset`. Remove `ignore_y`.
* **AnimationTrackEditPlugin**: Class removed entirely.
* **EditorInterface**: Now inherits `Object`. Replace `set_movie_maker_enabled()` with `movie_maker_enabled` property.

### Godot 4.1 to 4.2
* **Node**: `NOTIFICATION_NODE_RECACHE_REQUESTED` removed.
* **GraphNode** now inherits `GraphElement` (not `Control`).
* **AnimationMixer** new base class — methods moved: `add_animation_library`, `advance`, `clear_caches`, `find_animation`, `get_animation`, `get_animation_list`, `has_animation`. Renamed: `method_call_mode` → `callback_mode_method`, `playback_active` → `active`.

### Godot 4.2 to 4.3
* **BoneAttachment3D**: Replace `on_bone_pose_update` with `on_skeleton_update`.
* **EditorSceneFormatImporterFBX** renamed to `EditorSceneFormatImporterFBX2GLTF`.
* **GDExtension**: `close_library`, `initialize_library`, `open_library` removed.
* **NavigationRegion2D**: `avoidance_layers` and `constrain_avoidance` removed.
* **Skeleton3D**: `add_bone` returns `int32`. Replace `bone_pose_changed` with `skeleton_updated`.
* **RenderingDevice**: `compute_list_begin` removed `allow_draw_overlap`. `draw_list_begin` removed `storage_textures`. Removed `post_barrier` from 8 methods.

### Godot 4.3 to 4.4
* **FileAccess**: `open_encrypted()` added optional `iv`. All 14 `store_*` methods return `bool`.
* **GraphEdit**: `connect_node()` added optional `keep_alive`.
* **RenderingDevice**: `draw_list_begin()` added optional `breadcrumb`.

### Godot 4.4 to 4.5
* **CanvasItem / Font**: Added optional `oversampling` to all draw methods.
* **Physics (Jolt 3D)**: `Area3D` and `StaticBody3D` overlaps reported by default.
* **RichTextLabel**: `add_image` adds `alt_text`, `width_in_percent`, `height_in_percent`.

### Godot 4.5 to 4.6
* **AnimationPlayer**: `assigned_animation`, `autoplay`, `current_animation` are now `StringName`.
* **Control**: `grab_focus()` added optional `hide_focus`.
* **EditorFileDialog**: `add_side_menu()` removed. 18 methods moved to base `FileDialog`.
* **Environment**: Default `glow_blend_mode` is 1, `glow_intensity` is 0.3.
* **FileAccess**: `create_temp()` mode flag is `FileAccess.ModeFlags`. `get_as_text()` removed `skip_cr`.
* **MeshInstance3D**: `skeleton` property default is `""`.
