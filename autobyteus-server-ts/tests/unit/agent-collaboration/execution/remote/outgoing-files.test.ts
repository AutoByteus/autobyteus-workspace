import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OutgoingFiles } from "../../../../../src/agent-collaboration/execution/remote/outgoing-files.js";
import type { RemoteRunChannel } from "../../../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { TRANSFERRED_FILE_PIECE_MAX_BYTES } from "../../../../../src/agent-collaboration/execution/remote/transferred-files.js";
import { ReceivedFiles } from "../../../../../src/remote-collaboration/inbound/received-files.js";

/**
 * autobyteus-587 (RFC-001 RF-3, RF-4, RF-5, RF-11; DS-001, DS-002): the files of one cross-node message or delegation,
 * checked against the sender's workspace and the receiving node's limit, then uploaded in pieces into that node's received
 * files (a real `ReceivedFiles` behind the channel), skipping what it holds and resuming what it holds in part.
 */
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

const setup = async (options: { maxFileBytes?: number; workspace?: "none" } = {}) => {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "outgoing-files-")));
  roots.push(base);
  const workspace = path.join(base, "work");
  await fs.mkdir(workspace);
  const receiving = new ReceivedFiles({ storeDir: path.join(base, "peer", "received_files"), memoryDir: path.join(base, "peer", "memory"),
    maxFileBytes: () => options.maxFileBytes ?? 2048 * 1024 * 1024 });
  const pieces: { sha256: string; offset: number; length: number }[] = [];
  const channel = {
    receivedFilesStatus: vi.fn(async (_nodeId: string, files: readonly { sha256: string; size: number }[]) => ({ accepted: true as const, ...await receiving.status(files) })),
    putReceivedFilePiece: vi.fn(async (input: { sha256: string; offset: number; size: number; bytes: Buffer }) => {
      pieces.push({ sha256: input.sha256, offset: input.offset, length: input.bytes.byteLength });
      const answer = await receiving.appendPiece(input);
      return "accepted" in answer ? answer : { accepted: true as const, ...answer };
    }),
  };
  const outgoing = new OutgoingFiles({
    runs: { getActiveRun: (runId: string) => runId === "pm" ? { config: { workspaceId: options.workspace === "none" ? null : "ws_1" } } as never : null },
    workspaces: { getWorkspaceRootPathForHistory: async (id: string) => id === "ws_1" ? workspace : null },
    channel: () => channel as unknown as RemoteRunChannel,
  });
  const send = (referenceFiles: readonly string[]) => outgoing.send({ senderAgentRunId: "pm", nodeId: "srv_studio", peerName: "studio", referenceFiles });
  const write = async (name: string, bytes: Buffer) => { const file = path.join(workspace, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes); return file; };
  return { base, workspace, receiving, channel, pieces, send, write };
};

describe("OutgoingFiles", () => {
  it("uploads each file in pieces of at most 8 MiB and names it by content, size and the name the agent used", async () => {
    const t = await setup();
    const video = Buffer.alloc(TRANSFERRED_FILE_PIECE_MAX_BYTES * 2 + 5, 7);
    const pdf = Buffer.from("%PDF-1.7 brief");
    const files = [await t.write("launch/demo.mp4", video), await t.write("brief.pdf", pdf)];
    expect(await t.send(files)).toEqual({ ok: true, files: [
      { sha256: sha(video), size: video.byteLength, name: "demo.mp4" }, { sha256: sha(pdf), size: pdf.byteLength, name: "brief.pdf" }] });
    expect(t.pieces.map((piece) => [piece.offset, piece.length])).toEqual([
      [0, TRANSFERRED_FILE_PIECE_MAX_BYTES], [TRANSFERRED_FILE_PIECE_MAX_BYTES, TRANSFERRED_FILE_PIECE_MAX_BYTES], [2 * TRANSFERRED_FILE_PIECE_MAX_BYTES, 5], [0, pdf.byteLength]]);
    expect(await t.receiving.verify([{ sha256: sha(video), size: video.byteLength, name: "demo.mp4" }])).toEqual({ ok: true });
  });

  it("RF-11: a file the node holds complete is not uploaded again; one it holds in part resumes there", async () => {
    const t = await setup();
    const report = Buffer.from("x".repeat(100));
    const file = await t.write("report.txt", report);
    await t.send([file]);
    t.pieces.length = 0;
    expect(await t.send([file])).toMatchObject({ ok: true });
    expect(t.pieces).toEqual([]);
    const partial = Buffer.from("y".repeat(100));
    await t.receiving.appendPiece({ sha256: sha(partial), offset: 0, size: 100, bytes: partial.subarray(0, 60) });
    await t.send([await t.write("partial.txt", partial)]);
    expect(t.pieces).toEqual([{ sha256: sha(partial), offset: 60, length: 40 }]);
  });

  it("RF-3: only files inside the workspace, links resolved; folders, missing files and paths that leave it are refused before anything is sent", async () => {
    const t = await setup();
    const outside = path.join(t.base, "secret.key");
    await fs.writeFile(outside, "key");
    await fs.symlink(outside, path.join(t.workspace, "innocent.txt"));
    await fs.mkdir(path.join(t.workspace, "out"));
    const cases: [string, string, string][] = [
      [outside, "REFERENCE_FILE_OUTSIDE_WORKSPACE", `${outside} is outside your workspace, so nothing was sent. Only files in your workspace (${t.workspace}) can go to another node; copy the file there first.`],
      [path.join(t.workspace, "innocent.txt"), "REFERENCE_FILE_OUTSIDE_WORKSPACE", "is outside your workspace"],
      [path.join(t.workspace, "..", "secret.key"), "REFERENCE_FILE_OUTSIDE_WORKSPACE", "is outside your workspace"],
      [path.join(t.workspace, "out"), "REFERENCE_FILE_NOT_A_FILE", "is a folder, so nothing was sent. Send files, not folders (zip it first)."],
      [path.join(t.workspace, "missing.pdf"), "REFERENCE_FILE_NOT_A_FILE", "is not a file that can be sent"],
    ];
    for (const [file, code, text] of cases) {
      const result = await t.send([await t.write("fine.txt", Buffer.from("fine")), file]);
      expect(result).toMatchObject({ ok: false, refusal: { accepted: false, code } });
      expect((result as { refusal: { message: string } }).refusal.message).toContain(text);
    }
    expect(t.channel.receivedFilesStatus).not.toHaveBeenCalled();
    expect(t.pieces).toEqual([]);
  });

  it("refuses without a workspace, two files of one name, and a file over the receiving node's limit, before any piece", async () => {
    expect(await (await setup({ workspace: "none" })).send(["/tmp/x"])).toEqual({ ok: false, refusal: { accepted: false, code: "NO_WORKSPACE",
      message: "You have no workspace folder, so no file can go to another node." } });
    const t = await setup({ maxFileBytes: 10 });
    const repeated = await t.send([await t.write("a/notes.md", Buffer.from("1")), await t.write("b/notes.md", Buffer.from("2"))]);
    expect(repeated).toMatchObject({ ok: false, refusal: { code: "REFERENCE_FILE_NAME_REPEATED" } });
    const large = await t.send([await t.write("render.mp4", Buffer.alloc(11))]);
    expect(large).toEqual({ ok: false, refusal: { accepted: false, code: "REFERENCE_FILE_TOO_LARGE",
      message: 'render.mp4 is 11 bytes; node "studio" accepts files up to 10 bytes, so nothing was sent.' } });
    expect(t.pieces).toEqual([]);
    // No files: nothing is asked of the node.
    expect(await t.send([])).toEqual({ ok: true, files: [] });
  });

  it("RF-4: more than 4 GiB in one call is refused before any file is read or sent", async () => {
    const t = await setup();
    const files = [];
    for (const name of ["a.bin", "b.bin"]) {
      const file = path.join(t.workspace, name);
      await fs.writeFile(file, "");
      await fs.truncate(file, Math.floor(2.1 * 1024 ** 3)); // sparse: no disk is used
      files.push(file);
    }
    expect(await t.send(files)).toMatchObject({ ok: false, refusal: { code: "REFERENCE_FILE_TOO_LARGE",
      message: "The files total 4.2 GiB; one message or delegation carries at most 4 GiB of files, so nothing was sent." } });
    expect(t.channel.receivedFilesStatus).not.toHaveBeenCalled();
  });

  it("names the file and the reason when a piece fails or arrives damaged (RF-5)", async () => {
    const t = await setup();
    const file = await t.write("report.pdf", Buffer.from("report"));
    t.channel.putReceivedFilePiece.mockResolvedValueOnce({ accepted: false, code: "PEER_UNREACHABLE", message: 'Node "studio" could not be reached (it did not answer in time).' } as never);
    expect(await t.send([file])).toEqual({ ok: false, refusal: { accepted: false, code: "REFERENCE_FILE_TRANSFER_FAILED",
      message: 'report.pdf could not be sent to node "studio" (Node "studio" could not be reached (it did not answer in time)), so nothing was delivered. Try again.' } });
    t.channel.putReceivedFilePiece.mockResolvedValueOnce({ accepted: false, code: "REFERENCE_FILE_CHECK_FAILED", message: "mismatch" } as never);
    expect(await t.send([file])).toEqual({ ok: false, refusal: { accepted: false, code: "REFERENCE_FILE_CHECK_FAILED",
      message: 'report.pdf arrived damaged on node "studio", so nothing was delivered. Try again.' } });
  });
});
