import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";
import KNOWN_EXCEPTIONS from "./app-data-migration-boundary-exceptions.json";

/**
 * The sealed app-data migration area (autobyteus-280, REQ-003..005, DS-004).
 *
 * - Production code (`src/` outside `app-data-migrations/`) imports only the runner contract: the runner, the
 *   registry, `domain/**` and `repositories/**`.
 * - Migration code (`migrations/**`, `frozen/**`) imports only `domain/**`, other migration code,
 *   `config/prisma-client-factory.ts`, node APIs and third-party libraries; never production code or `autobyteus-ts`.
 * - `domain/**` is shared by both sides, so it imports only itself, node APIs and third-party libraries.
 * - Every `frozen/` file is reached from some migration folder; otherwise it is reported unused.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");
const AREA = "app-data-migrations";
const CONTRACT_FILES = new Set([`${AREA}/app-data-migration-runner.ts`, `${AREA}/app-data-migration-registry.ts`]);
const CONTRACT_FOLDERS = [`${AREA}/domain/`, `${AREA}/repositories/`];
const MIGRATION_DATABASE_CLIENT = "config/prisma-client-factory.ts";
const WORKSPACE_PACKAGE = /^autobyteus(?:-[a-z-]+)?(?:\/|$)/;

type Violation = { importer: string; target: string; rule: string };
type BoundaryReport = { violations: Violation[]; unusedFrozenFiles: string[] };

const listTsFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  const path = join(root, name);
  if (statSync(path).isDirectory()) return listTsFiles(path);
  return path.endsWith(".ts") && !path.endsWith(".d.ts") ? [path] : [];
});

const toKey = (srcRoot: string, path: string): string => relative(srcRoot, path).split(sep).join("/");

const resolveRelative = (importer: string, specifier: string): string => {
  const base = resolve(dirname(importer), specifier);
  const candidates = [base, base.replace(/\.js$/, ".ts"), `${base}.ts`, join(base, "index.ts")];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? base;
};

const importSpecifiers = (path: string): string[] =>
  ts.preProcessFile(readFileSync(path, "utf8"), true, true).importedFiles.map((file) => file.fileName);

const isUnder = (key: string, folders: readonly string[]): boolean => folders.some((folder) => key.startsWith(folder));
const isContract = (key: string): boolean => CONTRACT_FILES.has(key) || isUnder(key, CONTRACT_FOLDERS);
const isDomain = (key: string): boolean => key.startsWith(`${AREA}/domain/`);
const inArea = (key: string): boolean => key.startsWith(`${AREA}/`);
// Everything in the area that is not the contract is migration code.
const isSealed = (key: string): boolean => inArea(key) && !isContract(key);

const checkAppDataMigrationBoundaries = (srcRoot: string): BoundaryReport => {
  const violations: Violation[] = [];
  const areaEdges = new Map<string, string[]>();
  for (const file of listTsFiles(srcRoot)) {
    const importer = toKey(srcRoot, file);
    for (const specifier of importSpecifiers(file)) {
      if (!specifier.startsWith(".")) {
        if ((isSealed(importer) || isDomain(importer)) && WORKSPACE_PACKAGE.test(specifier)) {
          violations.push({ importer, target: specifier, rule: "migration code imports a workspace package" });
        }
        continue;
      }
      const target = toKey(srcRoot, resolveRelative(file, specifier));
      if (inArea(importer)) areaEdges.set(importer, [...(areaEdges.get(importer) ?? []), target]);
      if (!inArea(importer)) {
        if (inArea(target) && !isContract(target)) {
          violations.push({ importer, target, rule: "production code imports migration code" });
        }
      } else if (isDomain(importer)) {
        if (!isDomain(target)) violations.push({ importer, target, rule: "the shared contract domain imports beyond itself" });
      } else if (isSealed(importer)) {
        const allowed = isDomain(target) || isSealed(target) || target === MIGRATION_DATABASE_CLIENT;
        if (!allowed) violations.push({ importer, target, rule: "migration code imports production code or the runner" });
      }
    }
  }

  const reached = new Set<string>();
  const pending = [...areaEdges.keys()].filter((key) => key.startsWith(`${AREA}/migrations/`));
  while (pending.length > 0) {
    const key = pending.pop()!;
    if (reached.has(key)) continue;
    reached.add(key);
    pending.push(...(areaEdges.get(key) ?? []));
  }
  const frozenRoot = join(srcRoot, AREA, "frozen");
  const unusedFrozenFiles = existsSync(frozenRoot)
    ? listTsFiles(frozenRoot).map((file) => toKey(srcRoot, file)).filter((key) => !reached.has(key)).sort()
    : [];
  return { violations, unusedFrozenFiles };
};

const asKeys = (violations: readonly Violation[]): string[] =>
  [...new Set(violations.map((violation) => `${violation.importer} -> ${violation.target}`))].sort();

describe("sealed app-data migration area", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it("allows no import between production code and migration code beyond the known exceptions, which only shrink", () => {
    // Every remaining exception must still be a real crossing, so a fixed one has to leave the list.
    expect(asKeys(checkAppDataMigrationBoundaries(SRC).violations)).toEqual([...KNOWN_EXCEPTIONS].sort());
  });

  it("reaches every frozen file from a migration folder", () => {
    expect(checkAppDataMigrationBoundaries(SRC).unusedFrozenFiles).toEqual([]);
  });

  it("fails on each kind of crossing and reports an unused frozen file", () => {
    const root = mkdtempSync(join(tmpdir(), "app-data-migration-boundaries-"));
    roots.push(root);
    const write = (key: string, text: string) => {
      mkdirSync(dirname(join(root, key)), { recursive: true });
      writeFileSync(join(root, key), text);
    };
    write("config/prisma-client-factory.ts", "export const createConfiguredPrismaClient = () => null;\n");
    write("runs/run-store.ts", "export const readRun = () => null;\n");
    write(`${AREA}/app-data-migration-runner.ts`, "export class AppDataMigrationRunner {}\n");
    write(`${AREA}/domain/app-data-migration-types.ts`, "export type AppDataCapability = string;\n");
    write(`${AREA}/frozen/server/runs/run-store.ts`, "export const readRun = () => null;\n");
    write(`${AREA}/frozen/server/runs/orphan.ts`, "export const orphan = 1;\n");
    write(`${AREA}/migrations/m1/m1.ts`, [
      'import type { AppDataCapability } from "../../domain/app-data-migration-types.js";',
      'import { createConfiguredPrismaClient } from "../../../config/prisma-client-factory.js";',
      'import { readRun as frozenReadRun } from "../../frozen/server/runs/run-store.js";',
      'import { readRun } from "../../../runs/run-store.js";',
      'import { AppDataMigrationRunner } from "../../app-data-migration-runner.js";',
      'export { LLMProvider } from "autobyteus-ts";',
      "",
    ].join("\n"));
    write("server-runtime.ts", [
      'import { AppDataMigrationRunner } from "./app-data-migrations/app-data-migration-runner.js";',
      'const load = () => import("./app-data-migrations/migrations/m1/m1.js");',
      "",
    ].join("\n"));

    const report = checkAppDataMigrationBoundaries(root);

    expect(asKeys(report.violations)).toEqual([
      `${AREA}/migrations/m1/m1.ts -> ${AREA}/app-data-migration-runner.ts`,
      `${AREA}/migrations/m1/m1.ts -> autobyteus-ts`,
      `${AREA}/migrations/m1/m1.ts -> runs/run-store.ts`,
      `server-runtime.ts -> ${AREA}/migrations/m1/m1.ts`,
    ]);
    expect(report.unusedFrozenFiles).toEqual([`${AREA}/frozen/server/runs/orphan.ts`]);
  });
});
