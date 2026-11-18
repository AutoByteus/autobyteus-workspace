// Prints steps JSON with a generated 64x64 solid red PNG for workspace argv[2].
import zlib from "node:zlib";
const cwd = process.argv[2];
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const w = 64, h = 64; const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 220; raw[o + 1] = 20; raw[o + 2] = 20; }
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
const steps = [
  { method: "initialize", params: { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: "autobyteus-probe", version: "0" } } },
  { method: "session/new", params: { cwd, mcpServers: [] } },
  { method: "session/prompt", params: { sessionId: "$session", prompt: [{ type: "text", text: "Without tools: what single colour fills this image? Answer in one word." }, { type: "image", mimeType: "image/png", data: png.toString("base64") }] }, timeoutMs: 180000 },
  { method: "session/close", params: { sessionId: "$session" } },
];
process.stdout.write(JSON.stringify(steps));
