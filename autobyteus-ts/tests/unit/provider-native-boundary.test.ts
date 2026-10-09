import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// AC-014 / REQ-013: provider-specific history rules live with the provider adapter in
// `src/llm/api/`; agent and memory code only use the neutral `src/llm/provider-native/`
// contract, and each provider renders its own requests.
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

const sourceFiles = (relativeDir: string): string[] => {
  const root = path.join(SRC, relativeDir);
  return fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.relative(SRC, path.join(entry.parentPath, entry.name)));
};

const importSpecifiers = (relativeFile: string): string[] => {
  const source = fs.readFileSync(path.join(SRC, relativeFile), 'utf8');
  return [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)].map((match) => match[1]!);
};

const violations = (files: string[], isForbidden: (specifier: string) => boolean): string[] =>
  files.flatMap((file) => importSpecifiers(file).filter(isForbidden).map((specifier) => `${file} -> ${specifier}`));

describe('provider-native boundary (AC-014)', () => {
  it('keeps agent and memory code free of provider adapter and Anthropic imports', () => {
    const files = [
      ...sourceFiles('agent'),
      ...sourceFiles('memory').filter((file) => !file.startsWith(`memory${path.sep}migration${path.sep}`)),
    ];
    expect(files.length).toBeGreaterThan(50);
    expect(violations(files, (specifier) => specifier.includes('llm/api/') || /anthropic/i.test(specifier))).toEqual([]);
    // Stronger than import paths: no Anthropic-specific code or types at all (catches provider
    // types re-exported through generic-looking modules).
    expect(files.filter((file) => /anthropic/i.test(fs.readFileSync(path.join(SRC, file), 'utf8')))).toEqual([]);
  });

  it('keeps the neutral provider-native contract independent of memory and agent', () => {
    expect(violations(sourceFiles('llm/provider-native'), (specifier) =>
      /(^|\/)(memory|agent)\//.test(specifier))).toEqual([]);
  });

  it('lets Anthropic adapter files depend only on the provider-native contract files, not on the registry', () => {
    const anthropicFiles = sourceFiles('llm/api').filter((file) => path.basename(file).startsWith('anthropic-'));
    expect(anthropicFiles.length).toBeGreaterThan(3);
    expect(violations(anthropicFiles, (specifier) => specifier.includes('provider-native-history.js')
      || /(^|\/)(memory|agent)\//.test(specifier))).toEqual([]);
  });

  it('renders requests only inside provider adapters', () => {
    const offenders = sourceFiles('.')
      .filter((file) => !file.startsWith(`llm${path.sep}api${path.sep}`))
      .filter((file) => /\._renderer\b|renderedPayload/.test(fs.readFileSync(path.join(SRC, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
