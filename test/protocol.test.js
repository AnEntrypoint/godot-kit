'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildPacket, parsePacket, splitPackets, TYPES, encodeVariant, decodeVariant } = require('../lib/protocol');

const roundtrip = (v) => decodeVariant(encodeVariant(v), 0).value;
const ser = (v) => JSON.stringify(v, (_, x) => typeof x === 'bigint' ? Number(x) : x);

describe('encodeVariant + decodeVariant roundtrip', () => {
  it('nil', () => assert.equal(roundtrip(null), null));
  it('undefined as nil', () => assert.equal(roundtrip(undefined), null));
  it('bool true', () => assert.equal(roundtrip(true), true));
  it('bool false', () => assert.equal(roundtrip(false), false));
  it('int32 positive', () => assert.equal(roundtrip(42), 42));
  it('int32 negative', () => assert.equal(roundtrip(-100), -100));
  it('int32 zero', () => assert.equal(roundtrip(0), 0));
  it('int32 max', () => assert.equal(roundtrip(2147483647), 2147483647));
  it('int32 min', () => assert.equal(roundtrip(-2147483648), -2147483648));

  it('int64 large positive', () => {
    const v = roundtrip(3000000000);
    assert.equal(typeof v, 'bigint');
    assert.equal(v, 3000000000n);
  });

  it('bigint', () => {
    const v = roundtrip(9007199254740993n);
    assert.equal(v, 9007199254740993n);
  });

  it('float', () => {
    const v = roundtrip(3.14);
    assert.ok(Math.abs(v - 3.14) < 1e-10);
  });

  it('float negative', () => {
    const v = roundtrip(-0.5);
    assert.ok(Math.abs(v - (-0.5)) < 1e-10);
  });

  it('string', () => assert.equal(roundtrip('hello'), 'hello'));
  it('empty string', () => assert.equal(roundtrip(''), ''));
  it('string with padding needed', () => assert.equal(roundtrip('ab'), 'ab'));
  it('string length multiple of 4', () => assert.equal(roundtrip('abcd'), 'abcd'));

  it('array', () => assert.deepEqual(ser(roundtrip([1, 'two', true, null])), ser([1, 'two', true, null])));
  it('empty array', () => assert.deepEqual(roundtrip([]), []));
  it('nested array', () => assert.deepEqual(ser(roundtrip([[1, 2], [3]])), ser([[1, 2], [3]])));

  it('dict', () => assert.deepEqual(roundtrip({ a: 1, b: 'hello' }), { a: 1, b: 'hello' }));
  it('empty dict', () => assert.deepEqual(roundtrip({}), {}));
  it('nested dict', () => {
    const v = roundtrip({ arr: [1, 2], nested: { x: true } });
    assert.deepEqual(v.nested, { x: true });
    assert.deepEqual(ser(v.arr), ser([1, 2]));
  });
});

describe('decode-only types', () => {
  const mkBuf = (type, writeFn) => {
    const size = writeFn(null);
    const buf = Buffer.alloc(4 + size);
    buf.writeUInt32LE(type, 0);
    writeFn(buf);
    return buf;
  };

  it('vector2', () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(TYPES.VECTOR2, 0);
    buf.writeFloatLE(1.5, 4);
    buf.writeFloatLE(2.5, 8);
    const v = decodeVariant(buf, 0).value;
    assert.ok(Math.abs(v.x - 1.5) < 1e-6);
    assert.ok(Math.abs(v.y - 2.5) < 1e-6);
  });

  it('vector2i', () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(TYPES.VECTOR2I, 0);
    buf.writeInt32LE(10, 4);
    buf.writeInt32LE(-20, 8);
    const v = decodeVariant(buf, 0).value;
    assert.equal(v.x, 10);
    assert.equal(v.y, -20);
  });

  it('vector3', () => {
    const buf = Buffer.alloc(16);
    buf.writeUInt32LE(TYPES.VECTOR3, 0);
    buf.writeFloatLE(1, 4);
    buf.writeFloatLE(2, 8);
    buf.writeFloatLE(3, 12);
    const v = decodeVariant(buf, 0).value;
    assert.equal(v.z, 3);
  });

  it('vector4', () => {
    const buf = Buffer.alloc(20);
    buf.writeUInt32LE(TYPES.VECTOR4, 0);
    buf.writeFloatLE(1, 4);
    buf.writeFloatLE(2, 8);
    buf.writeFloatLE(3, 12);
    buf.writeFloatLE(4, 16);
    assert.equal(decodeVariant(buf, 0).value.w, 4);
  });

  it('color', () => {
    const buf = Buffer.alloc(20);
    buf.writeUInt32LE(TYPES.COLOR, 0);
    buf.writeFloatLE(1, 4);
    buf.writeFloatLE(0.5, 8);
    buf.writeFloatLE(0, 12);
    buf.writeFloatLE(1, 16);
    const v = decodeVariant(buf, 0).value;
    assert.equal(v.r, 1);
    assert.ok(Math.abs(v.g - 0.5) < 1e-6);
  });

  it('rect2', () => {
    const buf = Buffer.alloc(20);
    buf.writeUInt32LE(TYPES.RECT2, 0);
    buf.writeFloatLE(1, 4);
    buf.writeFloatLE(2, 8);
    buf.writeFloatLE(3, 12);
    buf.writeFloatLE(4, 16);
    const v = decodeVariant(buf, 0).value;
    assert.equal(v.position.x, 1);
    assert.equal(v.size.y, 4);
  });

  it('packed_byte_array', () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(TYPES.PACKED_BYTE_ARRAY, 0);
    buf.writeUInt32LE(3, 4);
    buf.writeUInt8(10, 8);
    buf.writeUInt8(20, 9);
    buf.writeUInt8(30, 10);
    assert.deepEqual(decodeVariant(buf, 0).value, [10, 20, 30]);
  });

  it('packed_int32_array', () => {
    const buf = Buffer.alloc(16);
    buf.writeUInt32LE(TYPES.PACKED_INT32_ARRAY, 0);
    buf.writeUInt32LE(2, 4);
    buf.writeInt32LE(100, 8);
    buf.writeInt32LE(-50, 12);
    assert.deepEqual(decodeVariant(buf, 0).value, [100, -50]);
  });

  it('packed_float32_array', () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt32LE(TYPES.PACKED_FLOAT32_ARRAY, 0);
    buf.writeUInt32LE(1, 4);
    buf.writeFloatLE(3.14, 8);
    assert.ok(Math.abs(decodeVariant(buf, 0).value[0] - 3.14) < 1e-5);
  });

  it('unknown type returns placeholder', () => {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(255, 0);
    assert.equal(decodeVariant(buf, 0).value, '<type:255>');
  });
});

describe('buildPacket + parsePacket', () => {
  it('roundtrip command and params', () => {
    const pkt = buildPacket('test_cmd', [42, 'hello', true]);
    const parsed = parsePacket(pkt);
    assert.equal(parsed.command, 'test_cmd');
    assert.equal(parsed.params[0], 42);
    assert.equal(parsed.params[1], 'hello');
    assert.equal(parsed.params[2], true);
  });

  it('no params', () => {
    const pkt = buildPacket('ping');
    const parsed = parsePacket(pkt);
    assert.equal(parsed.command, 'ping');
    assert.equal(parsed.params.length, 0);
  });

  it('truncated buffer returns null', () => {
    assert.equal(parsePacket(Buffer.from([0, 0])), null);
  });

  it('incomplete payload returns null', () => {
    const buf = Buffer.alloc(8);
    buf.writeUInt32LE(100, 0);
    assert.equal(parsePacket(buf), null);
  });
});

describe('splitPackets', () => {
  it('splits concatenated packets', () => {
    const p1 = buildPacket('a', [1]);
    const p2 = buildPacket('b', [2]);
    const combined = Buffer.concat([p1, p2]);
    const split = splitPackets(combined);
    assert.equal(split.length, 2);
    assert.equal(parsePacket(split[0]).command, 'a');
    assert.equal(parsePacket(split[1]).command, 'b');
  });

  it('empty buffer returns empty', () => {
    assert.equal(splitPackets(Buffer.alloc(0)).length, 0);
  });

  it('stops at incomplete trailing packet', () => {
    const p1 = buildPacket('a', [1]);
    const combined = Buffer.concat([p1, Buffer.from([0xff, 0xff, 0xff, 0xff])]);
    const split = splitPackets(combined);
    assert.equal(split.length, 1);
  });
});

describe('TYPES', () => {
  it('has 39 entries', () => assert.equal(Object.keys(TYPES).length, 39));
  it('NIL is 0', () => assert.equal(TYPES.NIL, 0));
  it('STRING is 4', () => assert.equal(TYPES.STRING, 4));
  it('ARRAY is 28', () => assert.equal(TYPES.ARRAY, 28));
  it('DICTIONARY is 27', () => assert.equal(TYPES.DICTIONARY, 27));
});
