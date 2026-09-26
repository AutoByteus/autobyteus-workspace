import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { captureAgyTranscriptBaseline, reconcileAgyNativeImage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-native-image-transcript.js";

const conversationId = "3d5ce362-1127-4d6b-8259-4a2c04d7d876";
const turnId = "turn-123";
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);

describe("AGY transcript native image reconciliation", () => {
  const roots: string[] = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  const setup = async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "agy-transcript-test-"));
    roots.push(home);
    vi.spyOn(os, "homedir").mockReturnValue(home);
    const memoryDir = path.join(home, "memory");
    const conversationRoot = path.join(home, ".gemini", "antigravity-cli", "brain", conversationId);
    const logs = path.join(conversationRoot, ".system_generated", "logs");
    await fs.mkdir(logs, { recursive: true });
    await fs.mkdir(memoryDir);
    const transcript = path.join(logs, "transcript.jsonl");
    return { home, memoryDir, conversationRoot, transcript };
  };
  const rows = (uri: string, step = 4) => [
    { step_index: step - 1, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE", tool_calls: [{ name: "generate_image", args: {} }] },
    { step_index: step, source: "MODEL", type: "GENERIC", status: "DONE", media: [{ mime_type: "image/jpeg", uri }] },
  ];
  const append = async (file: string, entries: unknown[]) => fs.appendFile(file, entries.map((row) => JSON.stringify(row)).join("\n") + "\n");

  it("uses only newly appended exact-step media and atomically copies private bytes into run memory", async () => {
    const root = await setup();
    const oldImage = path.join(root.conversationRoot, "old.jpg");
    await fs.writeFile(oldImage, jpeg);
    await append(root.transcript, rows(`file://${oldImage}`, 2));
    const baseline = await captureAgyTranscriptBaseline(conversationId);
    const image = path.join(root.conversationRoot, "new.jpg");
    await fs.writeFile(image, jpeg);
    await append(root.transcript, rows(`file://${image}`));
    const output = await reconcileAgyNativeImage({ baseline, stepIndex: 4, turnId, memoryDir: root.memoryDir });
    expect(output).toBe(path.join(root.memoryDir, "agy-native-images", "turn-123-4.jpg"));
    expect(await fs.readFile(output)).toEqual(jpeg);
    expect((await fs.stat(output)).mode & 0o777).toBe(0o600);
    expect((await fs.stat(path.dirname(output))).mode & 0o777).toBe(0o700);
    await expect(reconcileAgyNativeImage({ baseline, stepIndex: 4, turnId, memoryDir: root.memoryDir })).rejects.toThrow();
  });

  it("rejects duplicate, stale, cross-step, and planner-mismatched media", async () => {
    const root = await setup();
    const image = path.join(root.conversationRoot, "new.jpg");
    await fs.writeFile(image, jpeg);
    await append(root.transcript, rows(`file://${image}`, 4));
    const baseline = await captureAgyTranscriptBaseline(conversationId);
    await expect(reconcileAgyNativeImage({ baseline, stepIndex: 4, turnId, memoryDir: root.memoryDir })).rejects.toThrow();
    await append(root.transcript, [...rows(`file://${image}`, 4), rows(`file://${image}`, 4)[1]]);
    await expect(reconcileAgyNativeImage({ baseline, stepIndex: 4, turnId, memoryDir: root.memoryDir })).rejects.toThrow();
    const next = await captureAgyTranscriptBaseline(conversationId);
    await append(root.transcript, [{ ...rows(`file://${image}`, 6)[0], tool_calls: [{ name: "call_mcp_tool" }] }, rows(`file://${image}`, 6)[1]]);
    await expect(reconcileAgyNativeImage({ baseline: next, stepIndex: 6, turnId, memoryDir: root.memoryDir })).rejects.toThrow();
  });

  it("rejects unsafe URI, symlink, and MIME/magic mismatch", async () => {
    const root = await setup();
    const outside = path.join(root.home, "outside.jpg");
    await fs.writeFile(outside, jpeg);
    const link = path.join(root.conversationRoot, "link.jpg");
    await fs.symlink(outside, link);
    for (const uri of [`file://${outside}`, `file://${link}`, `file://${root.conversationRoot}/%2e%2e/outside.jpg`]) {
      const baseline = await captureAgyTranscriptBaseline(conversationId);
      await append(root.transcript, rows(uri));
      await expect(reconcileAgyNativeImage({ baseline, stepIndex: 4, turnId, memoryDir: root.memoryDir })).rejects.toThrow();
    }
    const fake = path.join(root.conversationRoot, "fake.jpg");
    await fs.writeFile(fake, "not an image");
    const baseline = await captureAgyTranscriptBaseline(conversationId);
    await append(root.transcript, rows(`file://${fake}`));
    await expect(reconcileAgyNativeImage({ baseline, stepIndex: 4, turnId, memoryDir: root.memoryDir })).rejects.toThrow();
  });
});
