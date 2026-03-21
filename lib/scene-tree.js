'use strict';

function parseSceneNode(params, ofs = { offset: 0 }) {
  const childCount = params[ofs.offset++];
  const name = params[ofs.offset++];
  const className = params[ofs.offset++];
  const id = params[ofs.offset++];
  const sceneFilePath = params[ofs.offset++];
  const viewFlags = params[ofs.offset++];
  const children = [];
  for (let i = 0; i < childCount; i++) {
    children.push(parseSceneNode(params, ofs));
  }
  return { name, className, id, sceneFilePath, viewFlags, children };
}

function formatSceneTree(node, indent = 0) {
  const prefix = '  '.repeat(indent);
  const groups = node.groups && node.groups.length ? ` [${node.groups.join(',')}]` : '';
  const lines = [`${prefix}[${node.className}] ${node.name} (id:${node.id})${groups}`];
  if (node.sceneFilePath) lines[0] += ` <${node.sceneFilePath}>`;
  for (const child of node.children) {
    lines.push(...formatSceneTree(child, indent + 1));
  }
  return lines;
}

module.exports = { parseSceneNode, formatSceneTree };
