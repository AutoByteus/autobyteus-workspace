import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChokidarWatcherRuntime } from "../../../../src/file-explorer/watcher/runtime/chokidar-watcher-runtime.js";
import type { WatcherRuntimeMessage } from "../../../../src/file-explorer/watcher/runtime/watcher-runtime-protocol.js";

/**
 * The real chokidar runtime of a workspace that does not follow links (autobyteus-554 AC-011): a change inside a linked
 * folder's target never reaches the tree; a change in the folder itself does.
 */
let base: string;
let root: string;
let outside: string;

beforeEach(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "chokidar-links-")));
  root = path.join(base, "root");
  outside = path.join(base, "outside");
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(root, "shared"));
});
afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

const waitFor = async (check: () => boolean, timeoutMs: number): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return check();
};

describe("ChokidarWatcherRuntime with followSymbolicLinks: false", () => {
  it("reports a change in the folder and never one inside a linked folder's target", async () => {
    const messages: WatcherRuntimeMessage[] = [];
    const runtime = new ChokidarWatcherRuntime((message) => messages.push(message));
    await runtime.start({ type: "start", watcherId: "w", generation: 1, workspaceRootPath: root, followSymbolicLinks: false });
    try {
      expect(await waitFor(() => messages.some((message) => message.type === "ready"), 15_000)).toBe(true);
      const rawPaths = () => messages.flatMap((message) => (message.type === "rawEvent" ? [message.event.path] : []));

      fs.writeFileSync(path.join(outside, "secret.md"), "secret\n");
      fs.writeFileSync(path.join(root, "notes.md"), "notes\n");
      // The folder's own file arrives (after chokidar's write-finish wait); by then a linked change would have too.
      expect(await waitFor(() => rawPaths().some((p) => p.endsWith("notes.md")), 15_000)).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      expect(rawPaths().filter((p) => p.includes("secret.md"))).toEqual([]);
    } finally {
      await runtime.stop("test-end");
    }
  }, 40_000);
});
