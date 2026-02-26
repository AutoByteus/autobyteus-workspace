import { describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import fsSync from "node:fs";
import {
  CompositeSearchStrategy,
  FuzzysortSearchStrategy,
  RipgrepSearchStrategy,
} from "../../../../src/file-explorer/search-strategy/index.js";
import type { BaseFileSearchStrategy } from "../../../../src/file-explorer/search-strategy/base-search-strategy.js";
import type { FileNameIndexer } from "../../../../src/file-explorer/file-name-indexer.js";

const createTempDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-search-"));
  await fs.writeFile(path.join(dir, "test_file.py"), "# test");
  await fs.writeFile(path.join(dir, "another_file.py"), "# another");
  await fs.writeFile(path.join(dir, "readme.md"), "# readme");
  return dir;
};

const cleanupTempDir = async (dir: string): Promise<void> => {
  await fs.rm(dir, { recursive: true, force: true });
};

const hasRipgrep = (): boolean => {
  const rgBinary = process.platform === "win32" ? "rg.exe" : "rg";
  const bundledPath = path.join(path.dirname(process.execPath), rgBinary);
  if (fsSync.existsSync(bundledPath)) {
    return true;
  }

  const pathEnv = process.env.PATH ?? "";
  const pathExt = process.platform === "win32" ? process.env.PATHEXT ?? ".EXE;.CMD;.BAT" : "";
  const extensions = process.platform === "win32" ? pathExt.split(";") : [""];

  for (const entry of pathEnv.split(path.delimiter)) {
    const base = entry.trim();
    if (!base) {
      continue;
    }
    for (const ext of extensions) {
      const fullPath = path.join(base, `${rgBinary}${ext}`);
      if (fsSync.existsSync(fullPath)) {
        return true;
      }
    }
  }

  return false;
};

describe("RipgrepSearchStrategy", () => {
  it("reports availability based on rg presence", () => {
    const strategy = new RipgrepSearchStrategy();
    expect(strategy.isAvailable()).toBe(hasRipgrep());
  });

  it("finds matching files", async () => {
    const strategy = new RipgrepSearchStrategy();
    if (!strategy.isAvailable()) {
      return;
    }

    const tempDir = await createTempDir();
    try {
      const results = await strategy.search(tempDir, "test");
      expect(results.some((result) => result.endsWith("test_file.py"))).toBe(true);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  it("returns absolute paths", async () => {
    const strategy = new RipgrepSearchStrategy();
    if (!strategy.isAvailable()) {
      return;
    }

    const tempDir = await createTempDir();
    try {
      const results = await strategy.search(tempDir, "file");
      for (const result of results) {
        expect(path.isAbsolute(result)).toBe(true);
      }
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  it("respects max results", async () => {
    const strategy = new RipgrepSearchStrategy(1);
    if (!strategy.isAvailable()) {
      return;
    }

    const tempDir = await createTempDir();
    try {
      const results = await strategy.search(tempDir, "");
      expect(results.length).toBeLessThanOrEqual(1);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });
});

describe("FuzzysortSearchStrategy", () => {
  it("is always available", () => {
    const indexer = {
      getIndex: vi.fn(() => ({})),
    } as unknown as FileNameIndexer;

    const strategy = new FuzzysortSearchStrategy(indexer);
    expect(strategy.isAvailable()).toBe(true);
  });

  it("uses the indexer for searches", async () => {
    const indexer = {
      getIndex: vi.fn(() => ({
        "test_file.py": "/path/to/test_file.py",
        "other.py": "/path/to/other.py",
      })),
    } as unknown as FileNameIndexer;

    const strategy = new FuzzysortSearchStrategy(indexer);
    const results = await strategy.search("/tmp", "test");

    expect(results).toContain("/path/to/test_file.py");
    expect(indexer.getIndex).toHaveBeenCalledOnce();
  });

  it("returns empty list for empty index", async () => {
    const indexer = {
      getIndex: vi.fn(() => ({})),
    } as unknown as FileNameIndexer;

    const strategy = new FuzzysortSearchStrategy(indexer);
    const results = await strategy.search("/tmp", "test");

    expect(results).toEqual([]);
  });
});

describe("CompositeSearchStrategy", () => {
  it("requires at least one strategy", () => {
    expect(() => new CompositeSearchStrategy([])).toThrow("At least one strategy must be provided");
  });

  it("is available when any strategy is available", () => {
    const unavailable = { isAvailable: () => false } as BaseFileSearchStrategy;
    const available = { isAvailable: () => true } as BaseFileSearchStrategy;

    const composite = new CompositeSearchStrategy([unavailable, available]);
    expect(composite.isAvailable()).toBe(true);
  });

  it("uses the first available strategy", async () => {
    const unavailable = { isAvailable: () => false } as BaseFileSearchStrategy;
    const available = {
      isAvailable: () => true,
      search: vi.fn(async () => ["/path/to/file.py"]),
    } as BaseFileSearchStrategy;

    const composite = new CompositeSearchStrategy([unavailable, available]);
    const results = await composite.search("/tmp", "test");

    expect(results).toEqual(["/path/to/file.py"]);
    expect(available.search).toHaveBeenCalledOnce();
  });

  it("falls back when a strategy fails", async () => {
    const failing = {
      isAvailable: () => true,
      search: vi.fn(async () => {
        throw new Error("Search failed");
      }),
    } as BaseFileSearchStrategy;

    const fallback = {
      isAvailable: () => true,
      search: vi.fn(async () => ["/fallback/file.py"]),
    } as BaseFileSearchStrategy;

    const composite = new CompositeSearchStrategy([failing, fallback]);
    const results = await composite.search("/tmp", "test");

    expect(results).toEqual(["/fallback/file.py"]);
    expect(fallback.search).toHaveBeenCalledOnce();
  });
});
