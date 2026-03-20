'use strict';

const TYPES = {
  NIL: 0, BOOL: 1, INT: 2, FLOAT: 3, STRING: 4,
  VECTOR2: 5, VECTOR2I: 6, RECT2: 7, RECT2I: 8,
  VECTOR3: 9, VECTOR3I: 10, TRANSFORM2D: 11,
  VECTOR4: 12, VECTOR4I: 13, PLANE: 14,
  QUATERNION: 15, AABB: 16, BASIS: 17,
  TRANSFORM3D: 18, PROJECTION: 19,
  COLOR: 20, STRING_NAME: 21, NODE_PATH: 22,
  RID: 23, OBJECT: 24, CALLABLE: 25, SIGNAL: 26,
  DICTIONARY: 27, ARRAY: 28,
  PACKED_BYTE_ARRAY: 29, PACKED_INT32_ARRAY: 30,
  PACKED_INT64_ARRAY: 31, PACKED_FLOAT32_ARRAY: 32,
  PACKED_FLOAT64_ARRAY: 33, PACKED_STRING_ARRAY: 34,
  PACKED_VECTOR2_ARRAY: 35, PACKED_VECTOR3_ARRAY: 36,
  PACKED_COLOR_ARRAY: 37, PACKED_VECTOR4_ARRAY: 38,
};

const ENCODE_FLAG_64 = 1 << 16;

function encodeString(s) {
  const strBuf = Buffer.from(s, 'utf8');
  const pad = (4 - (strBuf.length % 4)) % 4;
  const b = Buffer.alloc(4 + strBuf.length + pad);
  b.writeUInt32LE(strBuf.length, 0);
  strBuf.copy(b, 4);
  return b;
}

function encodeVariant(value) {
  if (value === null || value === undefined) {
    return Buffer.from([0, 0, 0, 0]);
  }
  if (typeof value === 'boolean') {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(TYPES.BOOL, 0);
    b.writeUInt32LE(value ? 1 : 0, 4);
    return b;
  }
  if (typeof value === 'bigint') {
    const b = Buffer.alloc(12);
    b.writeUInt32LE(TYPES.INT | ENCODE_FLAG_64, 0);
    b.writeBigInt64LE(value, 4);
    return b;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      if (value >= -2147483648 && value <= 2147483647) {
        const b = Buffer.alloc(8);
        b.writeUInt32LE(TYPES.INT, 0);
        b.writeInt32LE(value, 4);
        return b;
      }
      const b = Buffer.alloc(12);
      b.writeUInt32LE(TYPES.INT | ENCODE_FLAG_64, 0);
      b.writeBigInt64LE(BigInt(value), 4);
      return b;
    }
    const b = Buffer.alloc(12);
    b.writeUInt32LE(TYPES.FLOAT | ENCODE_FLAG_64, 0);
    b.writeDoubleLE(value, 4);
    return b;
  }
  if (typeof value === 'string') {
    const sb = encodeString(value);
    const b = Buffer.alloc(4 + sb.length);
    b.writeUInt32LE(TYPES.STRING, 0);
    sb.copy(b, 4);
    return b;
  }
  if (Array.isArray(value)) {
    const parts = value.map(encodeVariant);
    const dataLen = 4 + parts.reduce((a, p) => a + p.length, 0);
    const b = Buffer.alloc(4 + dataLen);
    b.writeUInt32LE(TYPES.ARRAY, 0);
    b.writeUInt32LE(value.length, 4);
    let off = 8;
    for (const p of parts) { p.copy(b, off); off += p.length; }
    return b;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    const pairs = keys.map(k => [encodeVariant(k), encodeVariant(value[k])]);
    const dataLen = 4 + pairs.reduce((a, [k, v]) => a + k.length + v.length, 0);
    const b = Buffer.alloc(4 + dataLen);
    b.writeUInt32LE(TYPES.DICTIONARY, 0);
    b.writeUInt32LE(keys.length, 4);
    let off = 8;
    for (const [k, v] of pairs) { k.copy(b, off); off += k.length; v.copy(b, off); off += v.length; }
    return b;
  }
  return Buffer.from([0, 0, 0, 0]);
}

function buildPacket(cmd, params = []) {
  const cmdVar = encodeVariant(cmd);
  const paramVars = params.map(encodeVariant);
  const payloadSize = 4 + cmdVar.length + paramVars.reduce((a, p) => a + p.length, 0);
  const buf = Buffer.alloc(4 + payloadSize);
  buf.writeUInt32LE(payloadSize, 0);
  buf.writeUInt32LE(1 + params.length, 4);
  cmdVar.copy(buf, 8);
  let off = 8 + cmdVar.length;
  for (const p of paramVars) { p.copy(buf, off); off += p.length; }
  return buf;
}

function decodeString(buf, offset) {
  const len = buf.readUInt32LE(offset);
  const str = buf.toString('utf8', offset + 4, offset + 4 + len);
  const pad = (4 - (len % 4)) % 4;
  return { value: str, size: 4 + len + pad };
}

function decodeVariant(buf, offset) {
  if (offset + 4 > buf.length) return { value: null, size: 4 };
  const typeRaw = buf.readUInt32LE(offset);
  const type = typeRaw & 0xff;
  const flag64 = !!(typeRaw & ENCODE_FLAG_64);
  offset += 4;

  switch (type) {
    case TYPES.NIL: return { value: null, size: 4 };
    case TYPES.BOOL: return { value: buf.readUInt32LE(offset) !== 0, size: 8 };
    case TYPES.INT:
      if (flag64) return { value: buf.readBigInt64LE(offset), size: 12 };
      return { value: buf.readInt32LE(offset), size: 8 };
    case TYPES.FLOAT:
      if (flag64) return { value: buf.readDoubleLE(offset), size: 12 };
      return { value: buf.readFloatLE(offset), size: 8 };
    case TYPES.STRING:
    case TYPES.STRING_NAME: {
      const r = decodeString(buf, offset);
      return { value: r.value, size: 4 + r.size };
    }
    case TYPES.NODE_PATH: {
      const r = decodeString(buf, offset);
      return { value: r.value, size: 4 + r.size };
    }
    case TYPES.VECTOR2: return { value: { x: buf.readFloatLE(offset), y: buf.readFloatLE(offset+4) }, size: 4+8 };
    case TYPES.VECTOR3: return { value: { x: buf.readFloatLE(offset), y: buf.readFloatLE(offset+4), z: buf.readFloatLE(offset+8) }, size: 4+12 };
    case TYPES.COLOR: return { value: { r: buf.readFloatLE(offset), g: buf.readFloatLE(offset+4), b: buf.readFloatLE(offset+8), a: buf.readFloatLE(offset+12) }, size: 4+16 };
    case TYPES.OBJECT:
      if (typeRaw & ENCODE_FLAG_64) return { value: { objectId: buf.readBigUInt64LE(offset) }, size: 4+8 };
      return { value: { objectId: buf.readUInt32LE(offset) }, size: 4+4 };
    case TYPES.ARRAY: {
      const count = buf.readUInt32LE(offset);
      let off = offset + 4;
      const items = [];
      for (let i = 0; i < count; i++) {
        const r = decodeVariant(buf, off);
        items.push(r.value);
        off += r.size;
      }
      return { value: items, size: 4 + (off - offset) };
    }
    case TYPES.DICTIONARY: {
      const count = buf.readUInt32LE(offset) & 0x7fffffff;
      let off = offset + 4;
      const dict = {};
      for (let i = 0; i < count; i++) {
        const kr = decodeVariant(buf, off); off += kr.size;
        const vr = decodeVariant(buf, off); off += vr.size;
        dict[String(kr.value)] = vr.value;
      }
      return { value: dict, size: 4 + (off - offset) };
    }
    default: return { value: `<type:${type}>`, size: 4 };
  }
}

function parsePacket(buf) {
  if (buf.length < 8) return null;
  const payloadSize = buf.readUInt32LE(0);
  if (buf.length < 4 + payloadSize) return null;
  const paramCount = buf.readUInt32LE(4);
  const params = [];
  let off = 8;
  for (let i = 0; i < paramCount; i++) {
    const r = decodeVariant(buf, off);
    params.push(r.value);
    off += r.size;
  }
  return { command: params[0], params: params.slice(1), totalSize: 4 + payloadSize };
}

function splitPackets(buf) {
  const packets = [];
  let off = 0;
  while (off + 4 <= buf.length) {
    const payloadSize = buf.readUInt32LE(off);
    const total = 4 + payloadSize;
    if (off + total > buf.length) break;
    packets.push(buf.subarray(off, off + total));
    off += total;
  }
  return packets;
}

module.exports = { buildPacket, parsePacket, splitPackets, TYPES, encodeVariant, decodeVariant };
