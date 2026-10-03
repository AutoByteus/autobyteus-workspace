import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scanAgyBrainJsonLinesReverse } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-brain-file.js";

const conversationId = "9e72f976-c008-45ae-94b1-876042f63a93";
const relativeFile = ".system_generated/logs/transcript_full.jsonl";
let root: string;
let file: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "agy-reverse-scan-"));
  file = path.join(root, conversationId, relativeFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
});
afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });
const scan = (visit: (line: string) => boolean, signal?: AbortSignal) =>
  scanAgyBrainJsonLinesReverse(root, conversationId, relativeFile, visit, signal);

describe("guarded AGY reverse complete-line scan", () => {
  it("frames LF, CRLF, multi-chunk rows and split UTF-8 without reading the whole file", async () => {
    const rows = ["first", "é🙂漢字".repeat(16000), "last"];
    fs.writeFileSync(file, rows.join("\r\n") + "\r\nunterminated suffix");
    const readFile = vi.spyOn(fs.promises, "readFile");
    const visited: string[] = [];
    expect(await scan((line) => { visited.push(line); return true; })).toBe(true);
    expect(visited).toEqual([...rows].reverse());
    expect(readFile).not.toHaveBeenCalled();
  });

  it("stops visitation at the requested boundary and accepts a complete first row at BOF", async () => {
    fs.writeFileSync(file, "first\nsecond\nthird\n");
    const visited: string[] = [];
    expect(await scan((line) => { visited.push(line); return line !== "second"; })).toBe(true);
    expect(visited).toEqual(["third", "second"]);
    fs.writeFileSync(file, "\nsecond\n");
    const withEmpty: string[] = [];
    expect(await scan((line) => { withEmpty.push(line); return true; })).toBe(true);
    expect(withEmpty).toEqual(["second", ""]);
  });

  it.each(["", "only incomplete text", "x".repeat(3 * 1024 * 1024)])(
    "discards an incomplete trailing record without allocating that record", async (text) => {
      fs.writeFileSync(file, text);
      const visit = vi.fn(() => true);
      expect(await scan(visit)).toBe(true);
      expect(visit).not.toHaveBeenCalled();
    });

  it("allows a 2 MiB complete row, rejects an oversized row and invalid UTF-8", async () => {
    const visit = vi.fn((_line: string) => true);
    fs.writeFileSync(file, "a".repeat(2 * 1024 * 1024) + "\n");
    expect(await scan(visit)).toBe(true);
    expect(visit.mock.calls[0]?.[0].length).toBe(2 * 1024 * 1024);
    fs.writeFileSync(file, "a".repeat(2 * 1024 * 1024 + 1) + "\n");
    expect(await scan(visit)).toBe(false);
    fs.writeFileSync(file, Buffer.from([0xff, 10]));
    expect(await scan(visit)).toBe(false);
  });

  it("closes the descriptor after stop, visitor failure, and an abort during a read", async () => {
    fs.writeFileSync(file, "first\nlast\n");
    const open = fs.promises.open.bind(fs.promises);
    const closes: ReturnType<typeof vi.spyOn>[] = [];
    let abortOnRead: AbortController | null = null;
    vi.spyOn(fs.promises, "open").mockImplementation(async (...args) => {
      const handle = await open(...args);
      closes.push(vi.spyOn(handle, "close"));
      if (abortOnRead) {
        const read = handle.read.bind(handle);
        vi.spyOn(handle, "read").mockImplementation(async (...readArgs: any[]) => {
          const result = await (read as any)(...readArgs);
          abortOnRead?.abort();
          return result;
        });
      }
      return handle;
    });
    expect(await scan(() => false)).toBe(true);
    expect(await scan(() => { throw new Error("visitor failed"); })).toBe(false);
    abortOnRead = new AbortController();
    expect(await scan(() => true, abortOnRead.signal)).toBe(false);
    expect(closes).toHaveLength(3);
    for (const close of closes) expect(close).toHaveBeenCalledTimes(1);
    const preAborted = new AbortController(); preAborted.abort();
    expect(await scan(() => true, preAborted.signal)).toBe(false);
    expect(closes).toHaveLength(3);
  });

  it("rejects truncation, replacement and same-size mutation during visitation but allows append-only growth", async () => {
    fs.writeFileSync(file, "first\nlast\n");
    expect(await scan(() => { fs.truncateSync(file, 0); return false; })).toBe(false);
    fs.writeFileSync(file, "first\nlast\n");
    expect(await scan(() => {
      fs.renameSync(file, file + ".old"); fs.writeFileSync(file, "first\nlast\n"); return false;
    })).toBe(false);
    fs.writeFileSync(file, "first\nlast\n");
    expect(await scan(() => {
      fs.writeFileSync(file, "other\nlast\n"); fs.utimesSync(file, new Date(1), new Date(1)); return false;
    })).toBe(false);
    fs.writeFileSync(file, "first\nlast\n");
    const visited: string[] = [];
    expect(await scan((line) => { visited.push(line); fs.appendFileSync(file, "new\n"); return true; })).toBe(true);
    expect(visited).toEqual(["last", "first"]);
  });

  it("rejects non-regular, missing, symlinked or escaping evidence and unsafe conversation identities", async () => {
    expect(await scan(() => true)).toBe(false);
    fs.mkdirSync(file);
    expect(await scan(() => true)).toBe(false);
    fs.rmdirSync(file);
    const outside = path.join(root, "outside.jsonl"); fs.writeFileSync(outside, "secret\n");
    fs.symlinkSync(outside, file);
    expect(await scan(() => true)).toBe(false);
    fs.unlinkSync(file);
    fs.rmSync(path.join(root, conversationId), { recursive: true });
    fs.mkdirSync(path.join(root, "other", path.dirname(relativeFile)), { recursive: true });
    fs.writeFileSync(path.join(root, "other", relativeFile), "secret\n");
    fs.symlinkSync(path.join(root, "other"), path.join(root, conversationId));
    expect(await scan(() => true)).toBe(false);
    expect(await scanAgyBrainJsonLinesReverse(root, "../other", relativeFile, () => true)).toBe(false);
    expect(await scanAgyBrainJsonLinesReverse(root, conversationId, "../../outside.jsonl", () => true)).toBe(false);
  });

  it("rejects an intermediate directory symlink escaping the bound conversation", async () => {
    const outside = path.join(root, "outside"); fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "transcript_full.jsonl"), "secret\n");
    fs.rmdirSync(path.dirname(file));
    fs.symlinkSync(outside, path.dirname(file));
    expect(await scan(() => true)).toBe(false);
  });
});
