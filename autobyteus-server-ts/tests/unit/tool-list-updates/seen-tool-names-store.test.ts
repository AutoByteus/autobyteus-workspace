import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEEN_TOOL_NAMES_FILE_NAME, SeenToolNamesStore } from "../../../src/tool-list-updates/providers/seen-tool-names-store.js";
import { diffToolNames } from "../../../src/tool-list-updates/services/tool-list-diff.js";
import { buildToolListUpdateNoticeText } from "../../../src/tool-list-updates/services/tool-list-update-notice-builder.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const tempRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "seen-tool-names-"));
  roots.push(root);
  return root;
};

describe("SeenToolNamesStore", () => {
  it("writes { version: 1, toolNames } atomically into an existing memory folder and reads it back sorted", async () => {
    const memoryDir = await tempRoot();
    const store = new SeenToolNamesStore();
    const owner = { runId: "run-1", memoryDir };
    expect(await store.write(owner, ["beta", "alpha", "beta"])).toBe("written");
    expect(JSON.parse(await fs.readFile(path.join(memoryDir, SEEN_TOOL_NAMES_FILE_NAME), "utf8")))
      .toEqual({ version: 1, toolNames: ["alpha", "beta"] });
    expect(await store.read(owner)).toEqual(["alpha", "beta"]);
    expect((await fs.readdir(memoryDir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("reads missing, unreadable or invalid records as no record", async () => {
    const memoryDir = await tempRoot();
    const store = new SeenToolNamesStore();
    const owner = { runId: "run-1", memoryDir };
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await store.read(owner)).toBeNull();
    for (const content of ["not json", '{"version":2,"toolNames":[]}', '{"version":1,"toolNames":"alpha"}', '{"version":1,"toolNames":[""]}']) {
      await fs.writeFile(path.join(memoryDir, SEEN_TOOL_NAMES_FILE_NAME), content);
      expect(await store.read(owner)).toBeNull();
    }
  });

  it("never creates a missing memory folder, and stops when the run was released", async () => {
    const root = await tempRoot();
    const store = new SeenToolNamesStore();
    const missing = path.join(root, "deleted-run");
    expect(await store.write({ runId: "run-1", memoryDir: missing }, ["alpha"])).toBe("folder_missing");
    expect(existsSync(missing)).toBe(false);
    expect(await store.write({ runId: "run-1", memoryDir: root }, ["alpha"], () => false)).toBe("aborted");
    expect(existsSync(path.join(root, SEEN_TOOL_NAMES_FILE_NAME))).toBe(false);
  });

  it("keeps a run without a memory folder in memory until it is forgotten", async () => {
    const store = new SeenToolNamesStore();
    const owner = { runId: "run-mem", memoryDir: null };
    await store.write(owner, ["alpha"]);
    expect(await store.read(owner)).toEqual(["alpha"]);
    store.forget(owner);
    expect(await store.read(owner)).toBeNull();
  });
});

describe("tool list diff and notice", () => {
  it("names only what was added and removed; the same names are no change", () => {
    expect(diffToolNames(["a", "b"], ["b", "a"])).toBeNull();
    const diff = diffToolNames(["a", "c"], ["b", "a", "d"]);
    expect(diff).toEqual({ added: ["b", "d"], removed: ["c"] });
    expect(buildToolListUpdateNoticeText(diff!)).toBe(
      "[Platform notice — tools updated]\n\nYour tools changed. Now available: b, d. No longer available: c.",
    );
    expect(buildToolListUpdateNoticeText({ added: [], removed: ["c"] }))
      .toBe("[Platform notice — tools updated]\n\nYour tools changed. No longer available: c.");
  });
});
