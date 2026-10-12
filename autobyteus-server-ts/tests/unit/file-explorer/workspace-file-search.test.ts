import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceFileExplorer } from "../../../src/file-explorer/file-explorer.js";
import {
  FuzzysortSearchStrategy,
  RipgrepSearchStrategy,
} from "../../../src/file-explorer/search-strategy/index.js";

// Public search identity and lifecycle regression; real snapshot/path owners,
// controlled strategy candidates. Actual strategy matching has its own suite.
describe("WorkspaceFileExplorer public search locators", () => {
  let root: string;
  let explorer: WorkspaceFileExplorer;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-search-locators-"));
    explorer = new WorkspaceFileExplorer(root);
  });

  afterEach(async () => {
    await explorer.close();
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  it.each(["fuzzy", "ripgrep"])("converts %s candidates once without changing order", async (strategy) => {
    const relativePaths = [
      path.join("applications", "候補者", "resume #1.pdf"),
      "resume.txt",
      path.join("docs", "resume-notes.md"),
    ];
    const candidates = relativePaths.map((locator) => path.join(root, locator));
    const fuzzy = vi.spyOn(FuzzysortSearchStrategy.prototype, "search");
    const ripgrep = vi.spyOn(RipgrepSearchStrategy.prototype, "search");
    vi.spyOn(RipgrepSearchStrategy.prototype, "isAvailable").mockReturnValue(true);
    if (strategy === "fuzzy") {
      fuzzy.mockResolvedValue(candidates);
    } else {
      fuzzy.mockRejectedValue(new Error("fuzzy unavailable for test"));
      ripgrep.mockResolvedValue(candidates);
    }
    const resolvePath = vi.spyOn(explorer, "getPath");

    expect(await explorer.searchFiles("resume")).toEqual(relativePaths);
    expect(resolvePath.mock.calls).toEqual(relativePaths.map((locator) => [locator]));
    expect((strategy === "fuzzy" ? fuzzy : ripgrep)).toHaveBeenCalledWith(root, "resume");
    if (strategy === "fuzzy") {
      expect(ripgrep).not.toHaveBeenCalled();
    }
    expect(explorer.fileWatcher).toBeNull();
  });

  it("keeps an empty search result empty", async () => {
    vi.spyOn(FuzzysortSearchStrategy.prototype, "search").mockResolvedValue([]);
    const resolvePath = vi.spyOn(explorer, "getPath");

    expect(await explorer.searchFiles("missing")).toEqual([]);
    expect(resolvePath).not.toHaveBeenCalled();
  });

  it("does not publish a same-prefix sibling candidate as a workspace locator", async () => {
    vi.spyOn(FuzzysortSearchStrategy.prototype, "search").mockResolvedValue([
      path.join(root, "resume.txt"),
      path.join(`${root}-sibling`, "resume.pdf"),
    ]);

    await expect(explorer.searchFiles("resume")).rejects.toThrow(
      "Access denied: Path resolves outside the workspace.",
    );
  });

  it("preserves a pre-aborted caller without starting snapshot traversal", async () => {
    const controller = new AbortController();
    controller.abort();
    const traversal = vi.spyOn(explorer, "buildWorkspaceDirectoryTree");

    await expect(explorer.searchFiles("resume", controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(traversal).not.toHaveBeenCalled();
    expect(explorer.fileWatcher).toBeNull();
  });

  it("preserves abort while waiting for candidates and does not convert a late result", async () => {
    let resolveCandidates!: (candidates: string[]) => void;
    const candidates = new Promise<string[]>((resolve) => { resolveCandidates = resolve; });
    let searchStarted!: () => void;
    const started = new Promise<void>((resolve) => { searchStarted = resolve; });
    vi.spyOn(FuzzysortSearchStrategy.prototype, "search").mockImplementation(() => {
      searchStarted();
      return candidates;
    });
    const resolvePath = vi.spyOn(explorer, "getPath");
    const controller = new AbortController();
    const pending = explorer.searchFiles("resume", controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });

    await started;
    controller.abort();
    try {
      await rejection;
    } finally {
      resolveCandidates([path.join(root, "resume.pdf")]);
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(resolvePath).not.toHaveBeenCalled();
    expect(explorer.fileWatcher).toBeNull();
  });
});
