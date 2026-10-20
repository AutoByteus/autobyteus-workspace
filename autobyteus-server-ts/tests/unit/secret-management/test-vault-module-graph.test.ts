import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { moduleGraph, type ModuleGraph } from '../../../../test-support/module-graph/module-graph.js';

/*
 * Static module-graph checks for the test-vault read path (design AR-005,
 * AR-007, SR-009). Server code reaches autobyteus-ts by package name, which the
 * walker records as the `autobyteus-ts` package and does not follow.
 */

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const serverSource = path.join(workspaceRoot, 'autobyteus-server-ts', 'src');

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
  expect([...graph.packages]).not.toContain('@prisma/client');
};

describe('test-vault module graph', () => {
  it('detects Prisma where it is loaded (control: the vault runtime)', () => {
    const graph = moduleGraph(path.join(serverSource, 'secret-management', 'secret-vault-runtime.ts'), { followDynamic: true });
    expect(relative(graph.files)).toContain('autobyteus-server-ts/src/secret-management/persistence/secret-vault-repository.ts');
    expect([...graph.packages]).toContain('repository_prisma');
  });

  it('keeps the server read-only test-vault entry free of Prisma, the runtime, migrations and the importer', () => {
    assertPrismaFree(moduleGraph(
      path.join(serverSource, 'secret-management', 'test-vault', 'read-only-test-vault.ts'),
      { followDynamic: true },
    ));
  });

  it('keeps the autobyteus-ts vault (format and read side) free of server and test-support code', () => {
    const graph = moduleGraph(
      path.join(workspaceRoot, 'autobyteus-ts', 'src', 'secrets', 'vault', 'test-vault-provider-api-key-resolver.ts'),
      { followDynamic: true },
    );
    expect(relative(graph.files).filter((file) => !file.startsWith('autobyteus-ts/src/'))).toEqual([]);
  });

  it('keeps the policy facade that live test files import free of server and vault code', () => {
    const graph = moduleGraph(path.join(workspaceRoot, 'test-support', 'test-vault', 'test-vault.ts'), { followDynamic: true });
    expect(relative(graph.files).filter((file) => file.startsWith('autobyteus-server-ts/'))).toEqual([]);
    expect(relative(graph.files).filter((file) => file.includes('/secrets/vault/'))).toEqual([]);
  });

  it('loads no server or vault code from autobyteus-ts test setup', () => {
    const graph = moduleGraph(path.join(workspaceRoot, 'autobyteus-ts', 'tests', 'setup.ts'), { followDynamic: true });
    expect(relative(graph.files).filter((file) => file.startsWith('autobyteus-server-ts/'))).toEqual([]);
    expect(relative(graph.files).filter((file) => file.includes('/secrets/vault/'))).toEqual([]);
  });

  it('keeps one owner of the vault format: no crypto, key-file or provider-key naming left in the server', () => {
    const graph = moduleGraph(path.join(serverSource, 'server-runtime.ts'), { followDynamic: true });
    const serverSecretFiles = relative(graph.files).filter((file) => file.includes('/secret-management/'));
    for (const moved of ['crypto/', 'root-key/', 'secret-vault-crypto', 'secret-root-key-file', 'read-only-secret-vault-store', 'secret-vault-sqlite-schema', 'test-vault-location']) {
      expect(serverSecretFiles.filter((file) => file.includes(moved))).toEqual([]);
    }
  });
});
