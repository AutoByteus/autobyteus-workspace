import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const THIS_FILE = fileURLToPath(import.meta.url);
const SRC = resolve(dirname(THIS_FILE), "../../src");

const listFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  const path = join(root, name);
  return statSync(path).isDirectory() ? listFiles(path) : [path];
});

const importSpecifiers = (path: string): string[] =>
  Array.from(readFileSync(path, "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g))
    .map((match) => match[1]!);

const filesImporting = (root: string, pattern: RegExp): string[] =>
  listFiles(root)
    .filter((path) => path.endsWith(".ts"))
    .filter((path) => importSpecifiers(path).some((specifier) => pattern.test(specifier)))
    .map((path) => relative(SRC, path));

describe("projects subsystem boundaries", () => {
  it("keeps the workspace subsystem unaware of projects", () => {
    expect(filesImporting(join(SRC, "workspaces"), /(^|\/)projects\//)).toEqual([]);
  });

  it("reads workspace registration only through WorkspaceManager", () => {
    expect(filesImporting(join(SRC, "projects"), /workspace-registry-store/)).toEqual([]);
  });

  it("keeps GraphQL transport off the project store", () => {
    expect(filesImporting(join(SRC, "api"), /projects\/stores\//)).toEqual([]);
  });
});
