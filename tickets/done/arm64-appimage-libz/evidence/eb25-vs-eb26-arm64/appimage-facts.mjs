// Usage: node appimage-facts.mjs IMAGE  -> runtime size, runtime sha256, squashfs compression id/name
import { readFileSync, openSync, readSync, fstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
const fd = openSync(process.argv[2], 'r'); const size = fstatSync(fd).size;
const head = Buffer.alloc(Math.min(size, 8 << 20)); readSync(fd, head, 0, head.length, 0);
// ELF64 size = e_shoff + e_shentsize * e_shnum (the runtime ends at its section headers)
const shoff = Number(head.readBigUInt64LE(0x28)), shentsize = head.readUInt16LE(0x3a), shnum = head.readUInt16LE(0x3c);
const elfEnd = shoff + shentsize * shnum;
const off = head.indexOf('hsqs', elfEnd - 16 > 0 ? elfEnd - 16 : 0);
const comp = head.readUInt16LE(off + 20);
const names = { 1: 'gzip', 2: 'lzma', 3: 'lzo', 4: 'xz', 5: 'lz4', 6: 'zstd' };
console.log(JSON.stringify({ size, elfEnd, squashfsOffset: off, compression: names[comp] ?? comp,
  runtimeSha256: createHash('sha256').update(head.subarray(0, off)).digest('hex') }));
