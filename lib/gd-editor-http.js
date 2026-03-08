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
\tvar response := "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\nContent-Length: %d\\r\\nConnection: close\\r\\n\\r\\n%s" % [json_str.length(), json_str]
\tpeer.put_data(response.to_utf8_buffer())

func _route(method: String, url_path: String, body: String) -> Dictionary:
\tif url_path == "/scene-tree" and method == "GET":
\t\treturn _get_scene_tree()
\tif url_path == "/selected-node" and method == "GET":
\t\treturn _get_selected_node()
\tif url_path == "/project-files" and method == "GET":
\t\treturn _get_project_files()
\tif url_path == "/signals" and method == "GET":
\t\treturn _get_signals()
\tif url_path == "/autoloads" and method == "GET":
\t\treturn _get_autoloads()
\tif url_path == "/save-scene" and method == "POST":
\t\teditor_interface.save_scene()
\t\treturn {"ok": true}
\tif url_path == "/editor-settings" and method == "GET":
\t\treturn {"settings": "use EditorSettings via GDScript"}
\tvar data: Dictionary = {}
\tif body.length() > 0:
\t\tvar parsed := JSON.parse_string(body)
\t\tif parsed is Dictionary:
\t\t\tdata = parsed
\tif url_path == "/run-script" and method == "POST":
\t\treturn _run_script(data.get("script", ""))
\tif url_path == "/open-scene" and method == "POST":
\t\teditor_interface.open_scene_from_path(data.get("path", ""))
\t\treturn {"ok": true}
\tif url_path == "/set-property" and method == "POST":
\t\treturn _set_property(data.get("node", ""), data.get("property", ""), data.get("value", null))
\tif url_path == "/create-node" and method == "POST":
\t\treturn _create_node(data.get("type", "Node"), data.get("parent", "/root"), data.get("name", "NewNode"))
\tif method == "DELETE" and url_path.begins_with("/node/"):
\t\treturn _delete_node(url_path.substr(6))
\treturn {"error": "not found", "path": url_path}

func _get_scene_tree() -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"tree": null}
\treturn {"tree": _dump_node(root, 0)}

func _dump_node(node: Node, depth: int) -> Dictionary:
\tvar children := []
\tfor c in node.get_children():
\t\tchildren.append(_dump_node(c, depth + 1))
\treturn {"name": node.name, "class": node.get_class(), "path": str(node.get_path()), "children": children}

func _get_selected_node() -> Dictionary:
\tvar sel := editor_interface.get_selection().get_selected_nodes()
\tif sel.is_empty():
\t\treturn {"selected": null}
\treturn {"selected": {"name": sel[0].name, "class": sel[0].get_class(), "path": str(sel[0].get_path())}}

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

func _get_signals() -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"signals": []}
\tvar sigs := []
\tfor s in root.get_signal_list():
\t\tsigs.append(s.name)
\treturn {"signals": sigs}

func _get_autoloads() -> Dictionary:
\tvar cfg := ConfigFile.new()
\tcfg.load("res://project.godot")
\tvar autoloads := []
\tif cfg.has_section("autoload"):
\t\tfor key in cfg.get_section_keys("autoload"):
\t\t\tautoloads.append({"name": key, "path": cfg.get_value("autoload", key)})
\treturn {"autoloads": autoloads}

func _run_script(script_text: String) -> Dictionary:
\tvar expr := Expression.new()
\tvar err := expr.parse(script_text)
\tif err != OK:
\t\treturn {"error": expr.get_error_text()}
\tvar result = expr.execute([], self)
\treturn {"result": str(result)}

func _set_property(node_path: String, prop: String, value: Variant) -> Dictionary:
\tvar root := editor_interface.get_edited_scene_root()
\tif not root:
\t\treturn {"error": "no scene open"}
\tvar node := root.get_node_or_null(node_path)
\tif not node:
\t\treturn {"error": "node not found: " + node_path}
\tnode.set(prop, value)
\treturn {"ok": true}

func _create_node(type_name: String, parent_path: String, node_name: String) -> Dictionary:
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
\t\treturn {"error": "node not found"}
\tnode.queue_free()
\treturn {"ok": true}
`;

module.exports = { EDITOR_HTTP_GD };
