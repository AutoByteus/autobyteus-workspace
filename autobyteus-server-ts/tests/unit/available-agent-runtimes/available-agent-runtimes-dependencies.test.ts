import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * SR-007 decision 5: the composer sits above both subsystems it reads. Tools, GraphQL and the composition depend on
 * `available-agent-runtimes`; nothing in `runtime-management` or `llm-management` imports it (no subsystem cycle).
 */
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../src");
const sourceFiles = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? sourceFiles(full) : entry.name.endsWith(".ts") ? [full] : [];
});

describe("available-agent-runtimes dependency direction", () => {
  it("is imported by neither runtime-management nor llm-management", () => {
    const importers = ["runtime-management", "llm-management"]
      .flatMap((dir) => sourceFiles(path.join(SRC, dir)))
      .filter((file) => /from\s+["'][^"']*available-agent-runtimes\//.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));
    expect(importers).toEqual([]);
  });
});
