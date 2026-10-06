#!/usr/bin/env node
// Temporary API/E2E wrapper (collaboration-member-artifact-hydration) around the project's fake AGY CLI fixture.
// For each agent launch it gives the process its own AGY conversation, plants AGY-format step outputs plus distinct
// colour PNGs for AGY_FAKE_IMAGE_STEPS in that conversation's brain dir (as AGY does before reporting DONE), sets a
// per-process gate, and appends {conversationId, agent, gate, images} to $CMAH_LAUNCH_LOG. `--version`, `--help` and
// `models` pass straight through. The fixture itself is unchanged.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import zlib from 'node:zlib';

const fixture = process.env.CMAH_FIXTURE;
const args = process.argv.slice(2);
const passthrough = args.length === 0 || ['--version', '--help', 'models'].includes(args[0]);
const env = { ...process.env };
if (!passthrough) {
  const conversationId = env.CMAH_FORCE_CONVERSATION_ID || randomUUID();
  const agent = args.includes('--agent') ? args[args.indexOf('--agent') + 1] : null;
  const brain = path.join(env.HOME, '.gemini', 'antigravity-cli', 'brain', conversationId);
  const steps = (env.AGY_FAKE_IMAGE_STEPS || '1').split(',').map(Number);
  const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, sum]); };
  const png = (rgb, size = 64) => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
    const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_, i) => rgb[i % 3])]);
    return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array(size).fill(row)))), chunk('IEND', Buffer.alloc(0))]); };
  const images = [];
  for (const step of steps) {
    const hash = createHash('sha256').update(`${conversationId}:${step}`).digest();
    const image = path.join(brain, `image_${step}_1.png`);
    const stepDir = path.join(brain, '.system_generated', 'steps', String(step));
    mkdirSync(stepDir, { recursive: true });
    writeFileSync(path.join(stepDir, 'output.txt'), `Using prompt: image ${step}\n\nGenerated image is saved at ${image}.\n\n Do not output the path of this image.\n`);
    writeFileSync(image, png([hash[0], hash[1], hash[2]]));
    images.push(image);
  }
  // Gate only launches made while <CMAH_GATE_ROOT>/ENABLE exists (the AC-005 race run); others emit all images at once.
  const gating = env.CMAH_GATE_ROOT && existsSync(path.join(env.CMAH_GATE_ROOT, 'ENABLE'));
  const gate = gating ? path.join(env.CMAH_GATE_ROOT, `gate-${conversationId}`) : '';
  env.AGY_FAKE_CONVERSATION_ID = conversationId;
  if (gate) env.AGY_FAKE_IMAGE_GATE = gate; else delete env.AGY_FAKE_IMAGE_GATE;
  if (env.CMAH_LAUNCH_LOG) appendFileSync(env.CMAH_LAUNCH_LOG, JSON.stringify({ at: new Date().toISOString(), conversationId, agent, gate, images, args }) + '\n');
}
const child = spawn(process.execPath, [fixture, ...args], { env, stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exit(code ?? 0); });
