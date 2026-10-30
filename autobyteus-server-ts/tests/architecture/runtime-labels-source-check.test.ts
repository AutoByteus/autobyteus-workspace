import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * autobyteus-343, REQ-005 / AC-005: the agent runtime is stored as the `RuntimeKind` value. The older short labels
 * (`CODEX`, `CLAUDE`, `ANTIGRAVITY`, `GROK_BUILD`, `AUTOBYTEUS`) exist only inside the sealed app-data migration area,
 * which holds the migrations and the frozen shapes of released data. No writer, type, mapping or reader of current
 * code may spell them.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOTS = [resolve(HERE, "../../src"), resolve(HERE, "../../../autobyteus-ts/src")];
const SEALED_AREA = `${sep}src${sep}app-data-migrations${sep}`;
const OLD_LABEL = /(['"`])(CODEX|CLAUDE|ANTIGRAVITY|GROK_BUILD|AUTOBYTEUS)\1/;

const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(ts|tsx|vue|js|mjs)$/.test(path) && !path.endsWith(".d.ts") ? [path] : [];
});

describe("old runtime labels", () => {
  it("do not occur as string literals in current source outside the sealed migration area", () => {
    const hits = ROOTS.flatMap(sourceFiles)
      .filter((file) => !file.includes(SEALED_AREA))
      .flatMap((file) => readFileSync(file, "utf8").split("\n")
        .map((text, index) => ({ file: relative(resolve(HERE, "../../.."), file), line: index + 1, text }))
        .filter(({ text }) => OLD_LABEL.test(text)));
    expect(hits).toEqual([]);
  });
});
