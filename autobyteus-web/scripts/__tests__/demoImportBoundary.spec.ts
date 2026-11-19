// @vitest-environment node
// The demo's boundary (autobyteus-279, design spec Dependency Rules): no product file imports `demo/`. The demo build
// reaches it through one entry only, `demo/plugins/00.demoBoot.client.ts`, which `nuxt.config.ts` adds to `plugins` when
// AUTOBYTEUS_DEMO_BUILD=1. (The node's `/mobile` build is checked for demo code by `mobile-build-checks.mjs`.)
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const webRoot = path.resolve(__dirname, '../..');
const SKIP = new Set(['node_modules', 'demo', 'dist', 'dist-mobile', 'dist-mobile-demo', '.nuxt', '.output', 'generated', 'electron-dist']);

const sourceFiles = (): string[] => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(vue|ts|tsx|js|mjs|cjs)$/.test(entry.name)) files.push(full);
    }
  };
  walk(webRoot);
  return files;
};

const IMPORT = /(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const isDemoPath = (from: string, spec: string): boolean => {
  if (/^[~@]\/demo(\/|$)/.test(spec)) return true;
  if (!spec.startsWith('.')) return false;
  const target = path.relative(webRoot, path.resolve(path.dirname(from), spec));
  return target === 'demo' || target.startsWith(`demo${path.sep}`);
};

describe('the demo boundary', () => {
  it('has no product file importing demo/', () => {
    const offenders = sourceFiles().flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(IMPORT)]
      .map((match) => match[1] ?? match[2] ?? match[3]!)
      .filter((spec) => isDemoPath(file, spec))
      .map((spec) => `${path.relative(webRoot, file)} → ${spec}`));
    expect(offenders).toEqual([]);
  });

  it('enters the demo only from nuxt.config.ts, for AUTOBYTEUS_DEMO_BUILD=1', () => {
    const config = fs.readFileSync(path.join(webRoot, 'nuxt.config.ts'), 'utf8');
    expect(config).toContain("const isDemoBuild = process.env.AUTOBYTEUS_DEMO_BUILD === '1'");
    expect(config).toContain("...(isDemoBuild ? ['~/demo/plugins/00.demoBoot.client.ts'] : [])");
    expect(config.match(/~\/demo\//g)).toHaveLength(1);
  });
});
