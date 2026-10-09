import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { createAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import { AgyStreamProcess } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-process.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { buildAgyUserMessageText } from "../../../../../src/agent-execution/backends/antigravity/input/agy-user-message-text.js";

// Opt-in (AGY_LIVE=1): the installed `agy` CLI and real model calls. AC-006: an attached image reaches
// the AGY agent through the path text, the agent opens it with view_file and sees its actual content.
const evidenceDir = path.resolve(process.env["AGY_LIVE_EVIDENCE_DIR"] ?? path.join(os.tmpdir(), "agy-image-input-live-evidence"));

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Buffer) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
};
/** A solid-colour RGB PNG, so the only way to name its colour is to see it. */
const solidPng = (size: number, [r, g, b]: [number, number, number]) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2; // 8-bit truecolour
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_, i) => [r, g, b][i % 3]!)]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))), chunk("IEND", Buffer.alloc(0))]);
};

it.skipIf(process.env.AGY_LIVE !== "1")("lets the AGY agent open an attached image with view_file and read an attached file", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-image-live-"));
  const workspacePath = path.join(base, "workspace");
  const attachments = path.join(base, "attachments"); // outside the workspace, like server-data uploads
  await fs.mkdir(workspacePath); await fs.mkdir(attachments);
  const imagePath = path.join(attachments, "ctx_live__1.png");
  const notePath = path.join(attachments, "ctx_live__2.txt");
  await fs.writeFile(imagePath, solidPng(64, [220, 20, 20]));
  await fs.writeFile(notePath, "NOTE-MARKER-4721\n");
  const capsule = await createAgyRunCapsule({ agentDefinitionId: "test-agent", runId: "image-live", memoryDir: path.join(base, "memory"),
    workspacePath, identity: "You are an AutoByteus test agent.", configuredSkillBindings: [], mcpDescriptor: null });
  const text = buildAgyUserMessageText(new AgentInputUserMessage(
    "What colour is the attached image, and what marker is written in the attached text file? Reply as: <colour> <marker>.",
    SenderType.USER, [new ContextFile(imagePath, ContextFileType.IMAGE), new ContextFile(notePath, ContextFileType.TEXT)]));
  const agy = new AgyStreamProcess();
  const observed: AgyStreamMessage[] = [];
  try {
    await agy.start({ capsulePath: capsule.path, agentName: capsule.manifest.agentName,
      workspacePath: capsule.manifest.workspacePath, model: process.env["AGY_LIVE_MODEL"] ?? "gemini-3.8-flash-low", conversationId: null });
    agy.subscribe((message) => observed.push(message));
    await agy.sendUserMessage(text);
    for (let attempt = 0; attempt < 240 && !observed.some((event) => event.event === "result"); attempt++)
      await new Promise((resolve) => setTimeout(resolve, 500));
  } finally { agy.stop(); }
  const result = observed.find((event) => event.event === "result");
  const viewFileSteps = observed.filter((event) => event.event === "step_update"
    && event.step_update.tool_name === "view_file");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, "agy-image-input-live.json"), JSON.stringify({ base, text, observed }, null, 2));
  expect(JSON.stringify(result)).toContain('"status":"SUCCESS"');
  expect(JSON.stringify(viewFileSteps)).toContain(JSON.stringify(imagePath).slice(1, -1));
  const answer = JSON.stringify(result).toLowerCase();
  expect(answer).toContain("red");
  expect(answer).toContain("note-marker-4721");
}, 180_000);
