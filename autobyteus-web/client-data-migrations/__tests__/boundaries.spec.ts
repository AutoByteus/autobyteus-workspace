import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * The sealed client-data migration area (autobyteus-290; Data Migration Guideline § 3 and § 4 "Sealed migration
 * area"). Current code imports only the two runners, each at its one call site; migrations import only `frozen/` and
 * their own folder; `frozen/` imports nothing; nothing here imports current code.
 */
const webRoot = path.resolve(__dirname, '..', '..');
const areaRoot = path.join(webRoot, 'client-data-migrations');
const SKIPPED_DIRS = new Set(['node_modules', '.nuxt', '.output', 'dist', 'electron-dist', 'resources', 'generated', '.git']);
const SOURCE = /\.(ts|vue|mjs|js)$/;
const IMPORT = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : walk(path.join(dir, entry.name));
  return SOURCE.test(entry.name) ? [path.join(dir, entry.name)] : [];
});
const importsOf = (file: string): string[] =>
  [...fs.readFileSync(file, 'utf8').matchAll(IMPORT)].map((match) => match[1] ?? match[2] ?? match[3]!);
const relative = (file: string): string => path.relative(webRoot, file).split(path.sep).join('/');
const isTest = (file: string): boolean => /(__tests__|\.spec\.)/.test(file);
const resolvesInto = (file: string, specifier: string): string | null => {
  const target = specifier.startsWith('~/') ? path.join(webRoot, specifier.slice(2))
    : specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : null;
  return target && target.startsWith(areaRoot + path.sep) ? relative(target) : null;
};

describe('client-data-migrations boundaries', () => {
  it('current code imports only the two runners, at their two call sites', () => {
    const uses = walk(webRoot)
      .filter((file) => !file.startsWith(areaRoot + path.sep) && !isTest(file))
      .flatMap((file) => importsOf(file).map((specifier) => [relative(file), resolvesInto(file, specifier)] as const))
      .filter(([, target]) => target !== null);
    expect(uses).toEqual(expect.arrayContaining([
      ['electron/application/electronApplication.ts', 'client-data-migrations/electron-file-runner'],
      ['plugins/19.clientDataMigrations.client.ts', 'client-data-migrations/browser-storage-runner'],
    ]));
    expect(uses).toHaveLength(2);
  });

  it('migrations import only frozen/ and their own folder; frozen/ imports nothing; no area file imports current code', () => {
    const violations = walk(areaRoot).filter((file) => !isTest(file)).flatMap((file) => {
      const at = relative(file);
      return importsOf(file).filter((specifier) => {
        const target = resolvesInto(file, specifier);
        if (at.startsWith('client-data-migrations/frozen/')) return true;
        if (at.startsWith('client-data-migrations/migrations/')) {
          const ownFolder = path.posix.dirname(at);
          return !(target?.startsWith('client-data-migrations/frozen/') || target?.startsWith(`${ownFolder}/`));
        }
        // The runners: their migrations, and Node built-ins in the Electron runner.
        return !(target?.startsWith('client-data-migrations/migrations/') || ['fs', 'path'].includes(specifier));
      }).map((specifier) => `${at} imports ${specifier}`);
    });
    expect(violations).toEqual([]);
  });
});
