import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Static module-graph checks for the test-vault read path (design AR-005, AR-007).
 * Type-only imports are erased at runtime and not followed.
 */

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const serverSource = path.join(workspaceRoot, 'autobyteus-server-ts', 'src');

type ModuleGraph = { files: Set<string>; packages: Set<string>; dynamic: Set<string> };

const IMPORT_PATTERN =
  /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const resolveRelative = (fromFile: string, specifier: string): string => {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = base.endsWith('.js')
    ? [base.replace(/\.js$/, '.ts'), base]
    : [base, `${base}.ts`, path.join(base, 'index.ts')];
  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!found) throw new Error(`unresolved ${specifier} from ${fromFile}`);
  return found;
};

const moduleGraph = (entry: string, followDynamic: boolean): ModuleGraph => {
  const graph: ModuleGraph = { files: new Set(), packages: new Set(), dynamic: new Set() };
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (graph.files.has(file)) continue;
    graph.files.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const typeOnly = Boolean(match[2]);
      const dynamicSpecifier = match[4];
      const specifier = match[3] ?? dynamicSpecifier;
      if (typeOnly || !specifier) continue;
      if (!specifier.startsWith('.')) {
        graph.packages.add(specifier.startsWith('node:') ? specifier : specifier.split('/')[0]!);
        continue;
      }
      const resolved = resolveRelative(file, specifier);
      if (dynamicSpecifier) {
        graph.dynamic.add(resolved);
        if (!followDynamic) continue;
      }
      pending.push(resolved);
    }
  }
  return graph;
};

const relative = (files: Iterable<string>): string[] =>
  [...files].map((file) => path.relative(workspaceRoot, file)).sort();

const FORBIDDEN_SERVER_MODULES = [
  'autobyteus-server-ts/src/secret-management/secret-vault-runtime.ts',
  'autobyteus-server-ts/src/secret-management/persistence/secret-vault-repository.ts',
  'autobyteus-server-ts/src/startup/migrations.ts',
];

const assertPrismaFree = (graph: ModuleGraph): void => {
  const files = relative(graph.files);
  for (const forbidden of FORBIDDEN_SERVER_MODULES) expect(files).not.toContain(forbidden);
  expect(files.filter((file) => file.includes('/secret-management/provisioning/'))).toEqual([]);
  expect([...graph.packages]).not.toContain('repository_prisma');
  expect([...graph.packages]).not.toContain('@prisma');
};

describe('test-vault module graph', () => {
  it('detects Prisma where it is loaded (control: the vault runtime)', () => {
    const graph = moduleGraph(path.join(serverSource, 'secret-management', 'secret-vault-runtime.ts'), true);
    expect(relative(graph.files)).toContain('autobyteus-server-ts/src/secret-management/persistence/secret-vault-repository.ts');
    expect([...graph.packages]).toContain('repository_prisma');
  });

  it('keeps the read-only test-vault entry free of Prisma, the runtime, migrations and the importer', () => {
    assertPrismaFree(moduleGraph(path.join(serverSource, 'secret-management', 'test-vault', 'read-only-test-vault.ts'), true));
  });

  it('keeps the autobyteus-ts default key source (test-support) Prisma-free', () => {
    assertPrismaFree(moduleGraph(path.join(workspaceRoot, 'test-support', 'test-vault', 'test-vault-default-resolver.ts'), true));
  });

  it('keeps the policy facade that live test files import free of any server code', () => {
    const graph = moduleGraph(path.join(workspaceRoot, 'test-support', 'test-vault', 'test-vault.ts'), true);
    expect(relative(graph.files).filter((file) => file.startsWith('autobyteus-server-ts/'))).toEqual([]);
  });

  it('loads server vault code from autobyteus-ts test setup only through the gated dynamic import', () => {
    const setup = path.join(workspaceRoot, 'autobyteus-ts', 'tests', 'setup.ts');
    const graph = moduleGraph(setup, false);
    expect(relative(graph.files).filter((file) => file.startsWith('autobyteus-server-ts/'))).toEqual([]);
    expect(relative(graph.dynamic)).toEqual(['test-support/test-vault/test-vault-default-resolver.ts']);
  });
});
