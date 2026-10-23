import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Tracked code imports only tracked files (autobyteus-282, REQ-003). An ignore rule can hide a source file from
 * `git add` while it stays on the developer's disk: the build passes there and fails in a clean checkout. The check in
 * `scripts/check_repository_artifact_hygiene.py --only tracked-imports` resolves relative imports against
 * `git ls-files`, so it catches that in any checkout, this one included.
 */

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT = join(REPOSITORY_ROOT, "scripts", "check_repository_artifact_hygiene.py");
const runCheck = (cwd: string) => spawnSync("python3", [SCRIPT, "--only", "tracked-imports"], { cwd, encoding: "utf8" });

describe("tracked imports", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it("finds no tracked code importing an untracked file in this repository", () => {
    const result = runCheck(REPOSITORY_ROOT);
    expect(result.stdout + result.stderr).toContain("Tracked-import check passed.");
    expect(result.status).toBe(0);
  });

  it("fails on tracked code importing an untracked or ignored file, and passes once it is tracked", () => {
    const root = mkdtempSync(join(tmpdir(), "tracked-imports-"));
    roots.push(root);
    const write = (relativePath: string, text: string) => {
      mkdirSync(dirname(join(root, relativePath)), { recursive: true });
      writeFileSync(join(root, relativePath), text);
    };
    const git = (...args: string[]) => {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
    };
    git("init", "-q");
    write("autobyteus-server-ts/.gitignore", "memory\n");
    write("autobyteus-server-ts/src/app.ts", [
      'import { stored } from "./store.js";',
      'import { frozen } from "./frozen/memory/frozen-store.js";',
      "export const both = [stored, frozen];",
      "",
    ].join("\n"));
    write("autobyteus-server-ts/src/store.ts", "export const stored = 1;\n");
    write("autobyteus-server-ts/src/frozen/memory/frozen-store.ts", "export const frozen = 2;\n");
    // `git add` honors the bare `memory` rule and skips the frozen file, as it skipped the frozen memory modules.
    git("add", "autobyteus-server-ts");

    const failing = runCheck(root);
    expect(failing.status).toBe(1);
    expect(failing.stdout).toContain("Tracked code importing files that are not tracked: 1");
    expect(failing.stdout).toContain("autobyteus-server-ts/src/app.ts -> ./frozen/memory/frozen-store.js");

    write("autobyteus-server-ts/.gitignore", "/memory/\n");
    git("add", "autobyteus-server-ts");
    const passing = runCheck(root);
    expect(passing.stdout).toContain("Tracked-import check passed.");
    expect(passing.status).toBe(0);
  });
});
