import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../src");
const SHARED_ACP_DIRS = ["runtime-management/acp", "agent-execution/backends/acp"];
const FORBIDDEN = /grok|xai|x\.ai/i;

const sourceFiles = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? sourceFiles(full) : entry.name.endsWith(".ts") ? [full] : [];
});

describe("shared ACP layer neutrality (AC-016)", () => {
  it("contains no xAI/Grok names, `_x.ai` handling or Grok imports", () => {
    const offenders = SHARED_ACP_DIRS.flatMap((dir) => sourceFiles(path.join(SRC, dir)))
      .flatMap((file) => fs.readFileSync(file, "utf8").split("\n")
        .map((line, index) => ({ file: path.relative(SRC, file), line: index + 1, text: line }))
        .filter((entry) => FORBIDDEN.test(entry.text)));
    expect(offenders).toEqual([]);
  });

  it("is not imported by other runtimes", () => {
    const others = ["codex", "claude", "antigravity", "autobyteus"].flatMap((runtime) =>
      sourceFiles(path.join(SRC, "agent-execution/backends", runtime)));
    const importers = others.filter((file) => /backends\/acp\/|runtime-management\/acp\//.test(fs.readFileSync(file, "utf8")));
    expect(importers).toEqual([]);
  });
});
