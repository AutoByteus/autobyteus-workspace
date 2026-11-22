import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RECEIVED_FILE_GRACE_MS, ReceivedFiles, safeReceivedFileName } from "../../../src/remote-collaboration/inbound/received-files.js";

/**
 * autobyteus-587 (RFC-001 § 3, RF-4, RF-7, RF-10, RF-11; DS-003, DS-004): the node's received files. Pieces append at the
 * bytes held; the last one is checked and moves the file into place; placement makes read-only hard links in the agent's
 * folder, by sender, replacing that sender's same-named file; the sweep removes what no run links and nothing touched.
 */
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

const MiB = 1024 * 1024;
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

const setup = async (options: { maxFileBytes?: number } = {}) => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), "received-files-"));
  roots.push(data);
  let now = Date.UTC(2026, 10, 21, 12);
  const received = new ReceivedFiles({ storeDir: path.join(data, "received_files"), memoryDir: path.join(data, "memory"),
    maxFileBytes: () => options.maxFileBytes ?? 2048 * MiB, now: () => now });
  const agentFolder = path.join(data, "memory", "agents", "video_editor_1");
  const upload = async (bytes: Buffer, pieceSize = bytes.byteLength || 1) => {
    let last;
    for (let offset = 0; offset < bytes.byteLength || offset === 0; offset += pieceSize) {
      last = await received.appendPiece({ sha256: sha(bytes), offset, size: bytes.byteLength, bytes: bytes.subarray(offset, offset + pieceSize) });
      if (bytes.byteLength === 0) break;
    }
    return last!;
  };
  return { data, received, agentFolder, upload, advance: (ms: number) => { now += ms; } };
};

describe("ReceivedFiles: pieces and status (DS-003, RF-11)", () => {
  it("appends pieces at the bytes held, completes the file on the last one, and answers what it holds", async () => {
    const t = await setup();
    const bytes = Buffer.from("a".repeat(10) + "b".repeat(10));
    const digest = sha(bytes);
    expect(await t.received.status([{ sha256: digest, size: 20 }])).toEqual({ maxFileBytes: 2048 * MiB, files: [{ sha256: digest, receivedBytes: 0, complete: false }] });
    expect(await t.received.appendPiece({ sha256: digest, offset: 0, size: 20, bytes: bytes.subarray(0, 10) })).toEqual({ receivedBytes: 10, complete: false });
    expect((await t.received.status([{ sha256: digest, size: 20 }])).files).toEqual([{ sha256: digest, receivedBytes: 10, complete: false }]);
    expect(await t.received.appendPiece({ sha256: digest, offset: 10, size: 20, bytes: bytes.subarray(10) })).toEqual({ receivedBytes: 20, complete: true });
    expect(await fs.readFile(path.join(t.data, "received_files", digest))).toEqual(bytes);
    await expect(fs.stat(path.join(t.data, "received_files", `${digest}.partial`))).rejects.toThrow();
    expect((await t.received.status([{ sha256: digest, size: 20 }])).files).toEqual([{ sha256: digest, receivedBytes: 20, complete: true }]);
    // A file it holds complete is not taken again.
    expect(await t.received.appendPiece({ sha256: digest, offset: 0, size: 20, bytes })).toEqual({ receivedBytes: 20, complete: true });
  });

  it("a piece at another offset writes nothing and answers the bytes held (two uploads of one content resume from there)", async () => {
    const t = await setup();
    const bytes = Buffer.from("0123456789");
    const digest = sha(bytes);
    await t.received.appendPiece({ sha256: digest, offset: 0, size: 10, bytes: bytes.subarray(0, 4) });
    // A second sender starts at 0 too.
    expect(await t.received.appendPiece({ sha256: digest, offset: 0, size: 10, bytes: bytes.subarray(0, 4) })).toEqual({ receivedBytes: 4, complete: false });
    expect(await t.received.appendPiece({ sha256: digest, offset: 4, size: 10, bytes: bytes.subarray(4) })).toEqual({ receivedBytes: 10, complete: true });
    // The first sender's next piece finds it complete.
    expect(await t.received.appendPiece({ sha256: digest, offset: 4, size: 10, bytes: bytes.subarray(4) })).toEqual({ receivedBytes: 10, complete: true });
    expect(await fs.readFile(path.join(t.data, "received_files", digest))).toEqual(bytes);
  });

  it("two senders of the same content at once: every piece lands once, both see it complete", async () => {
    const t = await setup();
    const bytes = Buffer.from(Array.from({ length: 64 }, (_, index) => index));
    const digest = sha(bytes);
    const send = async () => {
      let offset = 0;
      for (;;) {
        const answer = await t.received.appendPiece({ sha256: digest, offset, size: 64, bytes: bytes.subarray(offset, offset + 8) });
        if ("accepted" in answer) throw new Error(answer.message);
        if (answer.complete) return;
        offset = answer.receivedBytes;
      }
    };
    await Promise.all([send(), send()]);
    expect(await fs.readFile(path.join(t.data, "received_files", digest))).toEqual(bytes);
  });

  it("enforces the per-file limit on every piece, refuses a piece past the size, and removes a file whose content does not match", async () => {
    const t = await setup({ maxFileBytes: 16 });
    const big = Buffer.alloc(17);
    expect(await t.received.appendPiece({ sha256: sha(big), offset: 0, size: 17, bytes: big.subarray(0, 4) }))
      .toEqual({ accepted: false, code: "REFERENCE_FILE_TOO_LARGE", message: "This node accepts files up to 16 bytes; the file is 17 bytes." });
    const bytes = Buffer.from("hello");
    expect(await t.received.appendPiece({ sha256: sha(bytes), offset: 3, size: 5, bytes: Buffer.from("abc") }))
      .toMatchObject({ accepted: false, code: "REMOTE_REQUEST_INVALID" });
    // A tampered piece: the bytes do not hash to the name.
    expect(await t.received.appendPiece({ sha256: sha(bytes), offset: 0, size: 5, bytes: Buffer.from("hellO") }))
      .toMatchObject({ accepted: false, code: "REFERENCE_FILE_CHECK_FAILED" });
    expect(await fs.readdir(path.join(t.data, "received_files"))).toEqual([]);
  });

  it("an empty file is one empty piece", async () => {
    const t = await setup();
    expect(await t.upload(Buffer.alloc(0))).toEqual({ receivedBytes: 0, complete: true });
  });
});

describe("ReceivedFiles: verify and placement (RF-5, RF-7, RF-12)", () => {
  it("verify: every file complete with its size, else the first that is not", async () => {
    const t = await setup();
    const bytes = Buffer.from("report");
    await t.upload(bytes);
    expect(await t.received.verify([{ sha256: sha(bytes), size: 6, name: "report.pdf" }])).toEqual({ ok: true });
    expect(await t.received.verify([{ sha256: sha(bytes), size: 7, name: "report.pdf" }])).toEqual({ ok: false, name: "report.pdf" });
    expect(await t.received.verify([{ sha256: sha(Buffer.from("x")), size: 1, name: "x.png" }])).toEqual({ ok: false, name: "x.png" });
  });

  it("names the files first, then places read-only hard links by sender; the same sender's same name is replaced, another sender's is not", async () => {
    const t = await setup();
    const v1 = Buffer.from("teaser v1"), v2 = Buffer.from("teaser v2");
    await t.upload(v1); await t.upload(v2);
    const plan = t.received.planFor({ agentFolder: t.agentFolder, senderAgentRunId: "pm_a1", files: [{ sha256: sha(v1), size: v1.byteLength, name: "teaser.mp4" }] });
    const target = path.join(t.agentFolder, "received_files", "pm_a1", "teaser.mp4");
    expect(plan.paths).toEqual([target]);
    // Names only: nothing is written until the plan is placed.
    await expect(fs.stat(path.join(t.agentFolder, "received_files"))).rejects.toThrow();
    expect(await plan.place()).toEqual({ ok: true });
    const placed = await fs.stat(target);
    expect(placed.mode & 0o777).toBe(0o444);
    expect(placed.ino).toBe((await fs.stat(path.join(t.data, "received_files", sha(v1)))).ino);
    // Another sender's file of the same name lands in its own folder.
    await t.received.planFor({ agentFolder: t.agentFolder, senderAgentRunId: "pm_b", files: [{ sha256: sha(v1), size: v1.byteLength, name: "teaser.mp4" }] }).place();
    // The same sender's new version replaces its own, at once.
    expect(await t.received.planFor({ agentFolder: t.agentFolder, senderAgentRunId: "pm_a1", files: [{ sha256: sha(v2), size: v2.byteLength, name: "teaser.mp4" }] })
      .place()).toEqual({ ok: true });
    expect(await fs.readFile(target, "utf8")).toBe("teaser v2");
    expect(await fs.readFile(path.join(t.agentFolder, "received_files", "pm_b", "teaser.mp4"), "utf8")).toBe("teaser v1");
    expect((await fs.readdir(path.join(t.agentFolder, "received_files", "pm_a1"))).sort()).toEqual(["teaser.mp4"]);
  });

  it("a file the store no longer holds fails the placement by name; a delivery without files names and places nothing", async () => {
    const t = await setup();
    expect(await t.received.planFor({ agentFolder: t.agentFolder, senderAgentRunId: "pm", files: [{ sha256: sha(Buffer.from("gone")), size: 4, name: "gone.txt" }] })
      .place()).toEqual({ ok: false, name: "gone.txt" });
    const none = t.received.planFor({ agentFolder: path.join(os.tmpdir(), "elsewhere"), senderAgentRunId: "pm", files: [] });
    expect(none.paths).toEqual([]);
    expect(await none.place()).toEqual({ ok: true });
  });

  it("only into an agent folder inside the node's memory, with safe names (RF-12)", async () => {
    const t = await setup();
    const file = [{ sha256: sha(Buffer.from("x")), size: 1, name: "../../evil" }];
    expect(() => t.received.planFor({ agentFolder: path.join(t.data, "elsewhere"), senderAgentRunId: "pm", files: file })).toThrow();
    expect(t.received.planFor({ agentFolder: t.agentFolder, senderAgentRunId: "../pm", files: file }).paths)
      .toEqual([path.join(t.agentFolder, "received_files", "pm", "evil")]);
    expect([safeReceivedFileName("a\u0007b.txt"), safeReceivedFileName(".."), safeReceivedFileName("dir\\name.pdf"), safeReceivedFileName("")])
      .toEqual(["ab.txt", "file", "name.pdf", "file"]);
  });
});

describe("ReceivedFiles: sweep (DS-004, RF-10)", () => {
  it("removes an entry no agent folder links to only after 24 h untouched; a linked one stays; old .partials go, recent ones stay", async () => {
    const t = await setup();
    const linked = Buffer.from("linked"), loose = Buffer.from("loose"), fresh = Buffer.from("fresh");
    await t.upload(linked); await t.upload(loose);
    await t.received.planFor({ agentFolder: t.agentFolder, senderAgentRunId: "pm", files: [{ sha256: sha(linked), size: 6, name: "a.txt" }] }).place();
    const abandoned = Buffer.from("abandoned upload");
    await t.received.appendPiece({ sha256: sha(abandoned), offset: 0, size: abandoned.byteLength, bytes: abandoned.subarray(0, 4) });
    t.advance(RECEIVED_FILE_GRACE_MS + 1);
    await t.upload(fresh);
    const recent = Buffer.from("recent upload");
    await t.received.appendPiece({ sha256: sha(recent), offset: 0, size: recent.byteLength, bytes: recent.subarray(0, 4) });
    // The files' times are the clock's, so the sweep sees them as the test set them.
    await t.received.sweep();
    expect((await fs.readdir(path.join(t.data, "received_files"))).sort()).toEqual([sha(fresh), sha(linked), `${sha(recent)}.partial`].sort());
    // Deleting the run's folder leaves the linked entry alone, so the next sweep removes it (after its grace).
    await fs.rm(t.agentFolder, { recursive: true, force: true });
    t.advance(RECEIVED_FILE_GRACE_MS + 1);
    await t.received.sweep();
    expect(await fs.readdir(path.join(t.data, "received_files"))).toEqual([]);
  });

  it("a status touches a complete entry, so a file a call in flight deduplicated is not swept", async () => {
    const t = await setup();
    const bytes = Buffer.from("dedup");
    await t.upload(bytes);
    t.advance(RECEIVED_FILE_GRACE_MS + 1);
    await t.received.status([{ sha256: sha(bytes), size: 5 }]);
    await t.received.sweep();
    expect(await fs.readdir(path.join(t.data, "received_files"))).toEqual([sha(bytes)]);
  });

  it("a multi-file call while a history delete sweeps: the file it deduplicated and the one still arriving stay, and both are placed", async () => {
    const t = await setup();
    const report = Buffer.from("report, sent last week"), video = Buffer.alloc(3 * MiB, 9);
    const files = [{ sha256: sha(report), size: report.byteLength, name: "report.pdf" }, { sha256: sha(video), size: video.byteLength, name: "demo.mp4" }];
    // Last week another run received the report; its history was deleted since, so only the node's entry names it.
    await t.upload(report);
    const oldRun = path.join(t.data, "memory", "agents", "old_run");
    await t.received.planFor({ agentFolder: oldRun, senderAgentRunId: "pm", files: [files[0]!] }).place();
    await fs.rm(oldRun, { recursive: true, force: true });
    t.advance(7 * RECEIVED_FILE_GRACE_MS);
    // A new call: the status touches the report (held) and reports the video missing; the video arrives piece by piece.
    expect((await t.received.status(files)).files.map((file) => file.complete)).toEqual([true, false]);
    await t.received.appendPiece({ sha256: sha(video), offset: 0, size: video.byteLength, bytes: video.subarray(0, MiB) });
    // Another run's history is deleted now: its sweep runs between the call's pieces.
    t.advance(60 * 60 * 1000);
    await t.received.sweep();
    expect((await fs.readdir(path.join(t.data, "received_files"))).sort()).toEqual([sha(report), `${sha(video)}.partial`].sort());
    await t.received.appendPiece({ sha256: sha(video), offset: MiB, size: video.byteLength, bytes: video.subarray(MiB) });
    await t.received.sweep();
    // The message arrives: both files are complete and placed.
    expect(await t.received.verify(files)).toEqual({ ok: true });
    await expect(t.received.planFor({ agentFolder: t.agentFolder, senderAgentRunId: "pm", files }).place()).resolves.toEqual({ ok: true });
  });
});
