// asar-list.mjs ARCHIVE -> one line per file: path size unpacked? sha256-integrity
import { openSync, readSync } from 'node:fs';
const fd = openSync(process.argv[2], 'r'); const b = Buffer.alloc(16); readSync(fd, b, 0, 16, 0);
const jsonLen = b.readUInt32LE(12); const j = Buffer.alloc(jsonLen); readSync(fd, j, 0, jsonLen, 16);
const out = [];
(function walk(node, p) { for (const [n, e] of Object.entries(node.files ?? {})) {
  const q = p ? `${p}/${n}` : n;
  if (e.files) walk(e, q); else out.push(`${q} ${e.size ?? ''} ${e.unpacked ? 'unpacked' : ''} ${e.link ? 'link:' + e.link : ''} ${e.integrity?.hash ?? ''}`);
} })(JSON.parse(j.toString()), '');
console.log(out.sort().join('\n'));
