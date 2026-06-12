import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const bannedTerms = [
  ["Agent", "Run", "Memory", "Layout"].join(""),
  ["agent", "run", "memory", "layout"].join("-"),
  ["agent", "Memory", "Layout", "V", "2"].join(""),
];

const collectTypeScriptFiles = async (dirPath: string): Promise<string[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
  }));
  return nested.flat();
};

describe("memory layout cleanup regression", () => {
  it("keeps removed run-specific layout symbols out of source and tests", async () => {
    const roots = [path.resolve("src"), path.resolve("tests")];
    const files = (await Promise.all(roots.map(collectTypeScriptFiles))).flat();
    const hits: string[] = [];

    for (const filePath of files) {
      const text = await fs.readFile(filePath, "utf-8");
      for (const term of bannedTerms) {
        if (text.includes(term)) {
          hits.push(`${path.relative(process.cwd(), filePath)} contains ${term}`);
        }
      }
    }

    expect(hits).toEqual([]);
  });
});
