# Editor API — port 6008 (GodotKitBridge plugin)

All `GET`, no body, unless marked `POST`. Base: `http://127.0.0.1:6008`. Requires the editor open with the plugin enabled — controls the *editor*, not a running game.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/scene-tree` | - | `{tree}` — tree of the currently open (edited) scene, or `{tree:null}` if none open |
| GET | `/selected` | - | `{selected:[{name,class,path}]}` currently selected nodes |
| POST | `/select` | `{path}` | `{ok:true, path}` or `{error}` — selects a node in the editor |
| GET | `/files` | - | `{files:[res://...]}` every project file (recursive `res://` scan) |
| GET | `/autoloads` | - | `{autoloads:[{name,path}]}` read from `project.godot` |
| GET | `/plugins` | - | `{plugins:[{name,enabled}]}` read from `project.godot` |
| GET | `/import-status` | - | `{scanning: bool}` — true while the filesystem dock is importing; wait for false before touching new files |
| GET | `/inspector` | - | `{target, class, properties}` of the first selected node, or `{target:null}` |
| POST | `/save-scene` | - | `{ok:true}` |
| POST | `/play` | - | `{ok:true}` — presses Play (main scene) |
| POST | `/stop` | - | `{ok:true}` |
| POST | `/open-scene` | `{path}` | `{ok:true}` |
| POST | `/setting` | `{key, value}` | `{ok:true}` or `{error}` — sets an EditorSettings key |
| POST | `/property` | `{path, prop, value}` | `{ok:true}` or `{error}` — sets a property via UndoRedo (undoable in-editor) |
| POST | `/create-node` | `{parent, type, name}` | `{ok:true, path}` |
| POST | `/delete-node` | `{path}` | `{ok:true}` or `{error}` |
| POST | `/run-gdscript` | `{code}` | `{result}` or `{error}` — single-expression eval in editor context |
| POST | `/signals` | `{path}` | `{signals:[{name,args}]}` list signals on a node |
| POST | `/signal` | `{path, signal, args:[]}` | `{ok:true}` — emits a signal on a node in the edited scene |
| GET | `/screenshot` | - | `{format:"png", base64, width, height}` — editor screen capture |

All node paths are relative to the edited scene's root (via `editor_interface.get_edited_scene_root().get_node_or_null(path)`), not `/root/` absolute like the game API — `/property`, `/select`, `/create-node` etc. take scene-relative paths.
