import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const guardPath = path.resolve('scripts/guard-localization-boundary.mjs');
const roots: string[] = [];

// The unchanged production guard against a disposable app root with one planted file (autobyteus-426 AC-017).
const runGuard = (relativePath: string, source: string) => {
  const root = mkdtempSync(path.join(tmpdir(), 'localization-boundary-guard-'));
  roots.push(root);
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, source);
  return spawnSync(process.execPath, [guardPath], { cwd: root, encoding: 'utf8' });
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('localization boundary guard: formatting with the OS locale', () => {
  it.each([
    ['components/Planted.vue', '<template><span>{{ count.toLocaleString() }}</span></template>\n'],
    ['composables/usePlanted.ts', 'export const at = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });\n'],
    ['utils/planted.ts', 'export const at = (d: Date) =>\n  d.toLocaleTimeString([], { hour: "2-digit" });\n'],
    ['stores/planted.ts', 'export const n = new Intl.NumberFormat().format(3);\n'],
    ['services/planted.ts', 'export const f = new Intl.DateTimeFormat(\n  undefined, { dateStyle: "long" });\n'],
  ])('fails on a planted call in %s', (relativePath, source) => {
    const result = runGuard(relativePath, source);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${relativePath}:`);
    expect(result.stderr).toContain('formatting with the OS locale is forbidden');
  });

  it.each([
    ['components/Fine.vue', '<template><span>{{ count.toLocaleString(resolvedLocale) }}</span></template>\n'],
    ['utils/fine.ts', 'export const f = (locale: string) => new Intl.NumberFormat(locale, { style: "percent" });\n'],
    ['components/__tests__/Fine.spec.ts', 'const expected = new Date().toLocaleString();\n'],
  ])('passes the app locale or a test file in %s', (relativePath, source) => {
    const result = runGuard(relativePath, source);
    expect(result.error).toBeUndefined();
    expect(result.stdout).toContain('[guard:localization-boundary] Passed.');
    expect(result.status).toBe(0);
  });
});
