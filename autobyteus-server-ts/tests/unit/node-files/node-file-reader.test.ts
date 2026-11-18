import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeFileReader, type OpenedNodeFile } from "../../../src/node-files/node-file-reader.js";

const readAll = async (opened: OpenedNodeFile): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of opened.stream as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
};

describe("NodeFileReader (autobyteus-436)", () => {
  let root: string;
  const reader = new NodeFileReader();

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "node-file-reader-")));
    await fs.mkdir(path.join(root, "folder"));
    await fs.writeFile(path.join(root, "folder", "notes.md"), "# Notes\n");
    await fs.symlink(path.join(root, "folder", "notes.md"), path.join(root, "link-to-notes"));
  });

  afterEach(async () => {
    await fs.chmod(path.join(root, "folder"), 0o755).catch(() => undefined);
    await fs.rm(root, { recursive: true, force: true });
  });

  it("NAS-39 opens a regular file by absolute path, read-only, with its type, streamed", async () => {
    const opened = await reader.open(path.join(root, "folder", "notes.md"));
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.mimeType).toBe("text/markdown");
    expect(await readAll(opened)).toBe("# Notes\n");
  });

  it("follows a symbolic link to its target and types it by the real path", async () => {
    const opened = await reader.open(path.join(root, "link-to-notes"));
    expect(opened).toMatchObject({ ok: true, realPath: path.join(root, "folder", "notes.md"), mimeType: "text/markdown" });
    if (opened.ok) expect(await readAll(opened)).toBe("# Notes\n");
  });

  it("refuses a relative path, a '..' segment, a NUL byte and a missing value with NODE_FILE_PATH_INVALID", async () => {
    for (const value of ["folder/notes.md", `${root}/folder/../folder/notes.md`, `${root}\\..\\x`, `${root}/notes\0.md`, "", undefined, 42]) {
      expect(await reader.open(value), String(value)).toMatchObject({ ok: false, statusCode: 400, code: "NODE_FILE_PATH_INVALID" });
    }
  });

  it("answers a missing file (and a file below a file) 404 NODE_FILE_NOT_FOUND, a folder 400 NODE_FILE_IS_FOLDER", async () => {
    expect(await reader.open(path.join(root, "missing.md"))).toMatchObject({ ok: false, statusCode: 404, code: "NODE_FILE_NOT_FOUND" });
    expect(await reader.open(path.join(root, "folder", "notes.md", "below"))).toMatchObject({ ok: false, statusCode: 404, code: "NODE_FILE_NOT_FOUND" });
    expect(await reader.open(path.join(root, "folder"))).toMatchObject({ ok: false, statusCode: 400, code: "NODE_FILE_IS_FOLDER" });
  });

  it("answers a path the operating system refuses, or a link loop, 400 NODE_FILE_UNREADABLE, with no path in the message", async () => {
    await fs.symlink(path.join(root, "loop-b"), path.join(root, "loop-a"));
    await fs.symlink(path.join(root, "loop-a"), path.join(root, "loop-b"));
    const loop = await reader.open(path.join(root, "loop-a"));
    expect(loop).toMatchObject({ ok: false, statusCode: 400, code: "NODE_FILE_UNREADABLE" });
    if (!loop.ok) expect(loop.message).not.toContain(root);
    if (process.platform !== "win32" && process.getuid?.() !== 0) {
      await fs.chmod(path.join(root, "folder"), 0o000);
      expect(await reader.open(path.join(root, "folder", "notes.md"))).toMatchObject({ ok: false, statusCode: 400, code: "NODE_FILE_UNREADABLE" });
    }
  });
});
