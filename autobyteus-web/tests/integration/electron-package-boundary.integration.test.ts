import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const webRoot = path.resolve(process.cwd());
const workspaceRoot = path.resolve(webRoot, '..');
const contractName = '@autobyteus/team-stream-contracts';

const readJson = (filePath: string) =>
  JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, Record<string, string>>;

const collectElectronSource = (directory: string): string[] => readdirSync(
  directory,
  { withFileTypes: true },
).flatMap((entry) => {
  const filePath = path.join(directory, entry.name);
  if (entry.isDirectory()) return collectElectronSource(filePath);
  return /\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name) ? [filePath] : [];
});

describe('Electron production dependency boundary', () => {
  it('keeps Team stream contracts available only as a renderer build dependency', () => {
    const manifest = readJson(path.join(webRoot, 'package.json'));
    const lockfile = readFileSync(path.join(workspaceRoot, 'pnpm-lock.yaml'), 'utf8');

    expect(manifest.dependencies?.[contractName]).toBeUndefined();
    expect(manifest.devDependencies?.[contractName]).toBe('workspace:*');
    expect(lockfile).toMatch(
      /autobyteus-web:\n[\s\S]*?devDependencies:[\s\S]*?'@autobyteus\/team-stream-contracts':/,
    );
  });

  it('has no Electron main-process runtime import of the renderer contract package', () => {
    const violations = collectElectronSource(path.join(webRoot, 'electron')).filter((filePath) =>
      readFileSync(filePath, 'utf8').includes(contractName),
    );

    expect(violations).toEqual([]);
  });
});
