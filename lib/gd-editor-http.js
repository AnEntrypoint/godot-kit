'use strict';

const EDITOR_HTTP_GD = `@tool
extends Node

var editor_interface: EditorInterface
var _tcp: TCPServer = TCPServer.new()
var _peers: Array = []
const PORT := 6008

func start() -> void:
\tvar err := _tcp.listen(PORT)
\tif err != OK:
\t\tpush_warning("[GodotKitBridge] Port %d busy: %s" % [PORT, error_string(err)])
\t\treturn
\tset_process(true)

func stop() -> void:
\t_tcp.stop()
\tset_process(false)

func _process(_delta: float) -> void:
\tif _tcp.is_connection_available():
\t\tvar conn := _tcp.take_connection()
\t\tif conn:
\t\t\t_peers.append(conn)
\tfor i in range(_peers.size() - 1, -1, -1):
\t\tvar p: StreamPeerTCP = _peers[i]
\t\tif p.get_status() != StreamPeerTCP.STATUS_CONNECTED:
\t\t\t_peers.remove_at(i)
\t\t\tcontinue
\t\tvar avail := p.get_available_bytes()
\t\tif avail > 0:
\t\t\tvar raw := p.get_utf8_string(avail)
\t\t\t_handle_request(p, raw)
\t\t\t_peers.remove_at(i)

func _handle_request(peer: StreamPeerTCP, raw: String) -> void:
\tvar lines := raw.split("\\r\\n")
\tif lines.size() == 0:
\t\treturn
\tvar parts := lines[0].split(" ")
\tif parts.size() < 2:
\t\treturn
\tvar method := parts[0]
\tvar url_path := parts[1]
\tvar body := ""
\tvar in_body := false
\tfor line in lines:
\t\tif in_body:
\t\t\tbody += line
\t\telif line == "":
\t\t\tin_body = true
\tvar result := _route(method, url_path, body)
\tvar json_str := JSON.stringify(result)
\tvar response := "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\nAccess-Control-Allow-Origin: *\\r\\nContent-Length: %d\\r\\nConnection: close\\r\\n\\r\\n%s" % [json_str.length(), json_str]
\tpeer.put_data(response.to_utf8_buffer())

func _route(method: String, url_path: String, body: String) -> Dictionary:
\tvar data: Dictionary = {}
\tif body.length() > 0:
\t\tvar parsed := JSON.parse_string(body)
\t\tif parsed is Dictionary:
\t\t\tdata = parsed
\tif url_path == "/scene-tree":
\t\treturn _get_scene_tree()
\tif url_path == "/selected":
\t\treturn _get_selected()
\tif url_path == "/files":
\t\treturn _get_project_files()
\tif url_path == "/autoloads":
\t\treturn _get_autoloads()
\tif url_path == "/plugins":
\t\treturn _get_plugins()
\tif url_path == "/import-status":
\t\treturn {"scanning": editor_interface.get_resource_filesystem().is_scanning()}
\tif url_path == "/settings":
\t\treturn {"note": "use POST /setting to set, GET /settings lists keys"}
\tif url_path == "/inspector":
\t\treturn _get_inspector()
\tif url_path == "/save-scene" and method == "POST":
\t\teditor_interface.save_scene()
\t\treturn {"ok": true}
\tif url_path == "/play" and method == "POST":
\t\teditor_interface.play_main_scene()
\t\treturn {"ok": true}
\tif url_path == "/stop" and method == "POST":
\t\teditor_interface.stop_playing_scene()
\t\treturn {"ok": true}
\tif url_path == "/select" and method == "POST":
\t\treturn _select_node(data.get("path", ""))
\tif url_path == "/open-scene" and method == "POST":
\t\teditor_interface.open_scene_from_path(data.get("path", ""))
\t\treturn {"ok": true}
\tif url_path == "/setting" and method == "POST":
\t\treturn _set_setting(data.get("key", ""), data.get("value", null))
\tif url_path == "/property" and method == "POST":
\t\treturn _set_property(data.get("path", ""), data.get("prop", ""), data.get("value", null))
\tif url_path == "/create-node" and method == "POST":
\t\treturn _create_node(data.get("parent", "/root"), data.get("type", "Node"), data.get("name", "NewNode"))
\tif url_path == "/delete-node" and method == "POST":
\t\treturn _delete_node(data.get("path", ""))
\tif url_path == "/run-gdscript" and method == "POST":
\t\treturn _run_gdscript(data.get("code", ""))
\tif url_path == "/signals" and method == "POST":
\t\treturn _get_signals(data.get("path", ""))
\tif url_path == "/screenshot":
\t\treturn _get_screenshot()
\treturn {"error": "not found", "path": url_path}

func _get_scene_tree() -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"tree": null}
\treturn {"tree": _dump_node(root)}

func _dump_node(node: Node) -> Dictionary:
\tvar children := []
\tfor c in node.get_children():
\t\tchildren.append(_dump_node(c))
\treturn {"name": node.name, "class": node.get_class(), "path": str(node.get_path()), "groups": node.get_groups(), "children": children}

func _get_selected() -> Dictionary:
\tvar sel := editor_interface.get_selection().get_selected_nodes()
\tvar out := []
\tfor n in sel:
\t\tout.append({"name": n.name, "class": n.get_class(), "path": str(n.get_path())})
\treturn {"selected": out}

func _select_node(np: String) -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"error": "no scene open"}
\tvar node := root.get_node_or_null(np)
\tif not node:
\t\treturn {"error": "not found: " + np}
\teditor_interface.get_selection().clear()
\teditor_interface.get_selection().add_node(node)
\treturn {"ok": true, "path": np}

func _get_project_files() -> Dictionary:
\tvar files := []
\t_scan_dir("res://", files)
\treturn {"files": files}

func _scan_dir(dir_path: String, out: Array) -> void:
\tvar dir := DirAccess.open(dir_path)
\tif not dir:
\t\treturn
\tdir.list_dir_begin()
\tvar f := dir.get_next()
\twhile f != "":
\t\tif not f.begins_with("."):
\t\t\tif dir.current_is_dir():
\t\t\t\t_scan_dir(dir_path + f + "/", out)
\t\t\telse:
\t\t\t\tout.append(dir_path + f)
\t\tf = dir.get_next()

func _get_autoloads() -> Dictionary:
\tvar cfg := ConfigFile.new()
\tcfg.load("res://project.godot")
\tvar autoloads := []
\tif cfg.has_section("autoload"):
\t\tfor key in cfg.get_section_keys("autoload"):
\t\t\tautoloads.append({"name": key, "path": cfg.get_value("autoload", key)})
\treturn {"autoloads": autoloads}

func _get_plugins() -> Dictionary:
\tvar cfg := ConfigFile.new()
\tcfg.load("res://project.godot")
\tvar plugins := []
\tif cfg.has_section("editor_plugins"):
\t\tfor key in cfg.get_section_keys("editor_plugins"):
\t\t\tplugins.append({"name": key, "enabled": cfg.get_value("editor_plugins", key)})
\treturn {"plugins": plugins}

func _get_inspector() -> Dictionary:
\tvar sel := editor_interface.get_selection().get_selected_nodes()
\tif sel.is_empty():
\t\treturn {"target": null}
\tvar node := sel[0]
\tvar props := {}
\tfor p in node.get_property_list():
\t\tif p.usage & PROPERTY_USAGE_EDITOR:
\t\t\tprops[p.name] = str(node.get(p.name))
\treturn {"target": str(node.get_path()), "class": node.get_class(), "properties": props}

func _set_setting(key: String, value: Variant) -> Dictionary:
\tvar settings := editor_interface.get_editor_settings()
\tif not settings.has_setting(key):
\t\treturn {"error": "unknown setting: " + key}
\tsettings.set_setting(key, value)
\treturn {"ok": true}

func _set_property(node_path: String, prop: String, value: Variant) -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"error": "no scene open"}
\tvar node := root.get_node_or_null(node_path)
\tif not node:
\t\treturn {"error": "not found: " + node_path}
\tvar ur := editor_interface.get_editor_undo_redo_manager()
\tur.create_action("Set " + prop)
\tur.add_do_property(node, prop, value)
\tur.add_undo_property(node, prop, node.get(prop))
\tur.commit_action()
\treturn {"ok": true}

func _create_node(parent_path: String, type_name: String, node_name: String) -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"error": "no scene open"}
\tvar parent := root.get_node_or_null(parent_path)
\tif not parent:
\t\tparent = root
\tvar node := ClassDB.instantiate(type_name)
\tif not node:
\t\treturn {"error": "unknown type: " + type_name}
\tnode.name = node_name
\tparent.add_child(node, true)
\tnode.owner = root
\treturn {"ok": true, "path": str(node.get_path())}

func _delete_node(node_path: String) -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"error": "no scene open"}
\tvar node := root.get_node_or_null(node_path)
\tif not node:
\t\treturn {"error": "not found: " + node_path}
\tnode.queue_free()
\treturn {"ok": true}

func _run_gdscript(code: String) -> Dictionary:
\tvar expr := Expression.new()
\tvar err := expr.parse(code)
\tif err != OK:
\t\treturn {"error": expr.get_error_text()}
\tvar result = expr.execute([], self)
\tif expr.has_execute_failed():
\t\treturn {"error": expr.get_error_text()}
\treturn {"result": str(result)}

func _get_screenshot() -> Dictionary:
\tvar img := DisplayServer.screen_get_image()
\tif not img: return {"error": "no screen image"}
\tvar b64 := Marshalls.raw_to_base64(img.save_png_to_buffer())
\treturn {"format": "png", "base64": b64, "width": img.get_width(), "height": img.get_height()}

func _get_signals(node_path: String) -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"error": "no scene open"}
\tvar node := root.get_node_or_null(node_path)
\tif not node:
\t\treturn {"error": "not found: " + node_path}
\tvar sigs := []
\tfor s in node.get_signal_list():
\t\tsigs.append({"name": s.name, "args": s.args.map(func(a): return a.name)})
\treturn {"signals": sigs}
`;

module.exports = { EDITOR_HTTP_GD };
