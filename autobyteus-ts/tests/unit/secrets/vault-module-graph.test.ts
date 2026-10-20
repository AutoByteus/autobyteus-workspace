import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { moduleGraph } from '../../../../test-support/module-graph/module-graph.js';

/*
 * The vault modules (and node:sqlite) load only when AUTOBYTEUS_TEST_VAULT is
 * set and a key is needed: nothing reaches them statically from the library
 * entry or a client; the only way in is the environment default's dynamic import.
 */

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const src = path.join(packageRoot, 'src');
const vaultDirectory = path.join(src, 'secrets', 'vault') + path.sep;

describe('autobyteus-ts vault module graph', () => {
  it.each([
    'index.ts',
    'llm/llm-factory.ts',
    'llm/api/deepseek-llm.ts',
    'llm/api/gemini-llm.ts',
    'multimedia/image/image-client-factory.ts',
    'secrets/index.ts',
  ])('loads no vault module and no node:sqlite statically from %s', (entry) => {
    const graph = moduleGraph(path.join(src, entry), { followDynamic: false });
    expect([...graph.files].filter((file) => file.startsWith(vaultDirectory))).toEqual([]);
    expect([...graph.packages]).not.toContain('node:sqlite');
  });

  it('reaches the vault only through the environment default dynamic import', () => {
    const graph = moduleGraph(path.join(src, 'index.ts'), { followDynamic: false });
    expect([...graph.dynamic].filter((file) => file.startsWith(vaultDirectory)).map((file) => path.relative(src, file)))
      .toEqual([path.join('secrets', 'vault', 'test-vault-provider-api-key-resolver.ts')]);
  });

  it('detects the vault when the dynamic import is followed (control)', () => {
    const graph = moduleGraph(path.join(src, 'index.ts'), { followDynamic: true });
    expect([...graph.packages]).toContain('node:sqlite');
  });

  it('keeps the vault free of server and test-support code', () => {
    const graph = moduleGraph(path.join(vaultDirectory, 'test-vault-provider-api-key-resolver.ts'), { followDynamic: true });
    expect([...graph.files].filter((file) => !file.startsWith(src))).toEqual([]);
  });
});
