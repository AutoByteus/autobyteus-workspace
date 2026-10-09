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

  it("keeps Project Tasks and execution-internal delegated tasks apart (REQ-012, SR-021/SR-023)", () => {
    // Projects may import only the neutral lifetime contracts, never runtime implementations.
    const neutralContracts = new Set([
      "agent-collaboration/execution/task/task-execution-resource-port.js",
      "agent-collaboration/execution/task/task-execution-reference.js",
      "agent-collaboration/execution/domain/root-execution-identity.js",
    ]);
    const runtimeImports = listFiles(join(SRC, "projects")).filter((path) => path.endsWith(".ts")).flatMap((path) =>
      importSpecifiers(path)
        .filter((specifier) => /task-delegation|agent-team-execution|agent-collaboration|agent-execution|agent-org-execution|standalone-agent-run-root/.test(specifier))
        .map((specifier) => relative(SRC, resolve(dirname(path), specifier)))
        .filter((target) => !neutralContracts.has(target))
        .map((target) => `${relative(SRC, path)} -> ${target}`));
    expect(runtimeImports).toEqual([]);
    const runtimeRoots = ["agent-team-execution", "agent-collaboration", "agent-execution", "agent-org-execution", "standalone-agent-run-root"]
      .map((folder) => join(SRC, folder))
      .filter((root) => { try { return statSync(root).isDirectory(); } catch { return false; } });
    // The one allowed direction from run lifecycle to Projects: each permanent-delete owner removes the
    // deleted run's ad-hoc Tasks through the Task service, and nothing else of Projects (REQ-009).
    const deleteOwners = [
      "agent-org-execution/services/agent-org-run-service.ts",
      "run-history/services/agent-run-history-catalog-service.ts",
      "run-history/services/team-run-history-service.ts",
    ];
    const projectsImporters = [...runtimeRoots, join(SRC, "run-history")].flatMap((root) => filesImporting(root, /(^|\/)projects\//));
    expect(projectsImporters.sort()).toEqual(deleteOwners);
    for (const owner of deleteOwners) {
      expect(importSpecifiers(join(SRC, owner)).filter((specifier) => /(^|\/)projects\//.test(specifier)))
        .toEqual(["../../projects/services/project-task-service.js"]);
    }
    // Only the one composition binding knows both sides.
    expect(filesImporting(join(SRC, "compositions"), /(^|\/)projects\//)).toEqual(["compositions/project-task-execution-resource-composition.ts"]);
    expect(filesImporting(join(SRC, "api", "graphql", "types"), /projects\/services\/project-task-service/))
      .toEqual(["api/graphql/types/project-tasks.ts"]);
  });
});
