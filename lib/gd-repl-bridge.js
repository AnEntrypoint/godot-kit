'use strict';

const REPL_BRIDGE_WITH_HTTP = `extends Node

const VERSION := "1.1.0"
const HTTP_PORT := 6009
var _log_buffer: Array[String] = []
var _tcp: TCPServer = TCPServer.new()
var _peers: Array = []

func _ready() -> void:
\tprint("[ReplBridge] v", VERSION, " initialized")
\tEngineDebugger.register_message_capture("repl", _on_repl_message)
\tvar err := _tcp.listen(HTTP_PORT)
\tif err == OK:
\t\tprint("[ReplBridge] HTTP server on port ", HTTP_PORT)
\telse:
\t\tpush_warning("[ReplBridge] HTTP port %d busy" % HTTP_PORT)

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
\t\t\t_handle_http(p, raw)
\t\t\t_peers.remove_at(i)

func _handle_http(peer: StreamPeerTCP, raw: String) -> void:
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
\tif url_path == "/scene-tree":
\t\treturn {"tree": _dump_node(get_tree().root, 0)}
\tif url_path == "/fps":
\t\treturn {"fps": Engine.get_frames_per_second(), "target": Engine.max_fps, "process_time_ms": Performance.get_monitor(Performance.TIME_PROCESS) * 1000}
\tif url_path == "/globals":
\t\treturn _get_globals()
\tif url_path == "/input":
\t\treturn {"paused": get_tree().paused}
\tvar data: Dictionary = {}
\tif body.length() > 0:
\t\tvar parsed := JSON.parse_string(body)
\t\tif parsed is Dictionary:
\t\t\tdata = parsed
\tif url_path == "/eval" and method == "POST":
\t\treturn _eval(data.get("expr", ""))
\tif url_path == "/set-var" and method == "POST":
\t\treturn _set_var(data.get("path", ""), data.get("property", ""), data.get("value", null))
\tif url_path == "/pause" and method == "POST":
\t\tget_tree().paused = not get_tree().paused
\t\treturn {"paused": get_tree().paused}
\tif url_path == "/reload-scene" and method == "POST":
\t\tget_tree().reload_current_scene()
\t\treturn {"ok": true}
\tif url_path.begins_with("/nodes/"):
\t\tvar np := url_path.substr(7)
\t\tvar node := get_node_or_null(np)
\t\tif not node:
\t\t\treturn {"error": "not found: " + np}
\t\treturn {"node": {"name": node.name, "class": node.get_class(), "path": str(node.get_path())}}
\tif url_path.begins_with("/call/") and method == "POST":
\t\treturn _call_method(url_path, data)
\treturn {"error": "not found", "path": url_path}

func _dump_node(node: Node, depth: int) -> Dictionary:
\tvar children := []
\tfor c in node.get_children():
\t\tchildren.append(_dump_node(c, depth + 1))
\treturn {"name": node.name, "class": node.get_class(), "path": str(node.get_path()), "children": children}

func _eval(expr_str: String) -> Dictionary:
\tvar expr := Expression.new()
\tvar err := expr.parse(expr_str)
\tif err != OK:
\t\treturn {"error": expr.get_error_text()}
\tvar result = expr.execute([], self)
\treturn {"result": str(result)}

func _get_globals() -> Dictionary:
\tvar out := []
\tfor child in get_tree().root.get_children():
\t\tout.append({"name": child.name, "class": child.get_class()})
\treturn {"globals": out}

func _set_var(node_path: String, prop: String, value: Variant) -> Dictionary:
\tvar node := get_node_or_null(node_path)
\tif not node:
\t\treturn {"error": "node not found: " + node_path}
\tnode.set(prop, value)
\treturn {"ok": true}

func _call_method(url_path: String, data: Dictionary) -> Dictionary:
\tvar segs := url_path.split("/")
\tif segs.size() < 4:
\t\treturn {"error": "bad path"}
\tvar method_name := segs[segs.size() - 1]
\tvar node_path := "/" + "/".join(segs.slice(2, segs.size() - 1))
\tvar node := get_node_or_null(node_path)
\tif not node:
\t\treturn {"error": "not found: " + node_path}
\tvar args: Array = data.get("args", [])
\tvar result = node.callv(method_name, args)
\treturn {"result": str(result)}

func _on_repl_message(msg: String, data: Array) -> bool:
\tmatch msg:
\t\t"ping":
\t\t\tEngineDebugger.send_message("repl:pong", ["pong", Time.get_ticks_msec()])
\t\t\treturn true
\t\t"get_logs":
\t\t\tEngineDebugger.send_message("repl:logs", _log_buffer.duplicate())
\t\t\treturn true
\t\t"get_scene":
\t\t\tvar tree_data := _dump_node(get_tree().root, 0)
\t\t\tEngineDebugger.send_message("repl:scene", [JSON.stringify(tree_data)])
\t\t\treturn true
\t\t"eval":
\t\t\tvar expr := Expression.new()
\t\t\tvar err := expr.parse(data[0] if data.size() > 0 else "")
\t\t\tif err == OK:
\t\t\t\tvar result = expr.execute([], self)
\t\t\t\tEngineDebugger.send_message("repl:eval_result", [str(result)])
\t\t\telse:
\t\t\t\tEngineDebugger.send_message("repl:eval_error", [expr.get_error_text()])
\t\t\treturn true
\treturn false

func log_info(msg: String) -> void:
\t_log_buffer.append("[INFO] " + msg)
\tif _log_buffer.size() > 1000:
\t\t_log_buffer.pop_front()
\tprint(msg)
`;

module.exports = { REPL_BRIDGE_WITH_HTTP };
