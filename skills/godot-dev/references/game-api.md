# Game runtime API — port 6009 (ReplBridge)

All `GET`, no body, unless marked `POST`. Base: `http://127.0.0.1:6009`.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/tree` | - | `{tree: {name, class, path, groups, children:[...]}}` full scene tree |
| GET | `/node/<path>` | - | `{path, class, groups, properties}` all exported/script-var properties of one node |
| POST | `/eval` | `{expr}` | `{result}` or `{error}` — single-expression eval in ReplBridge context |
| POST | `/set` | `{path, prop, value}` | `{ok:true}` |
| POST | `/call` | `{path, method, args:[]}` | `{result}` |
| POST | `/signal` | `{path, signal, args:[]}` | `{ok:true}` — emits a signal on a node |
| GET | `/globals` | - | `{globals:[{name,class,path}]}` all autoloads |
| GET | `/perf` | - | `{fps, process_ms, physics_ms, memory_static, objects, nodes, resources, draw_calls, video_mem, physics3d_objects, physics2d_objects}` |
| GET | `/logs` | - | `{logs:[...]}` buffered `print()` output (last 500) |
| GET | `/errors` | - | `{errors:[...]}` buffered `push_error()` output (last 500) |
| DELETE | `/logs` | - | `{ok:true}` clears log buffer |
| DELETE | `/errors` | - | `{ok:true}` clears error buffer |
| GET | `/groups` | - | `{groups: {group_name: [node_path,...]}}` |
| GET | `/resources` | - | `{resources:[res://path,...]}` currently loaded resources |
| GET | `/physics` | - | physics server stats (2D+3D active objects, collision pairs) |
| POST | `/raycast2d` | `{from:{x,y}, to:{x,y}}` | `{hit, position, normal, collider}` |
| GET | `/input` | - | `{paused, joypads:[...]}` |
| POST | `/input-action` | `{action, pressed}` | `{ok:true, action, pressed}` — simulate a Godot input action |
| POST | `/pause` | - | `{paused}` toggles `get_tree().paused` |
| POST | `/reload` | - | `{ok:true}` — `reload_current_scene()`, needed after editing a running game's scripts |
| POST | `/change-scene` | `{path}` | `{ok:true}` or `{error}` |
| POST | `/create-node` | `{parent, type, name}` | `{ok:true, path}` |
| POST | `/spawn-scene` | `{path, parent, name}` | `{ok:true, path}` — instantiate a `.tscn` into the running tree |
| POST | `/delete-node` | `{path}` | `{ok:true}` — `queue_free()`s the node |
| GET | `/screenshot` | - | `{format:"png", base64, width, height}` — viewport capture |
| POST | `/watch` | `{expr}` | `{id, expr}` — register a polled expression |
| GET | `/watches` | - | `{watches: {id: {result}|{error}}}` current value of every registered watch |
| DELETE | `/watch/<id>` | - | `{ok:true}` |

Node paths are always absolute scene-tree paths starting `/root/` (e.g. `/root/Level/Player`), never `res://` resource paths — get them from `/tree` or `/globals`, don't guess.
