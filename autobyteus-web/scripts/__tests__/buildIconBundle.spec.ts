// @vitest-environment node
// The local icon bundle (autobyteus-279, AR-003): every icon name in the source, the mapping tables included, resolves
// from the committed bundle, which is exactly what the source needs (`pnpm icons:build` writes it).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildBundle, iconNamesInSource } from '../build-icon-bundle.mjs';

type Collection = { prefix: string; icons: Record<string, unknown>; aliases?: Record<string, unknown> };
const committed = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../assets/icons/phone-icon-bundle.json'), 'utf8')) as Collection[];
const resolves = (prefix: string, name: string) => {
  const collection = committed.find((candidate) => candidate.prefix === prefix);
  return Boolean(collection && (collection.icons[name] || collection.aliases?.[name]));
};

describe('the local icon bundle', () => {
  it('has every icon name the source holds', () => {
    const unresolved = [...iconNamesInSource()].flatMap(([prefix, names]) => [...names].filter((name) => !resolves(prefix, name)).map((name) => `${prefix}:${name}`));
    expect(unresolved).toEqual([]);
  });

  it('holds every name the two file-type mapping tables can compute', () => {
    const names = iconNamesInSource().get('vscode-icons')!;
    for (const name of ['file-type-js', 'file-type-typescript', 'file-type-markdown', 'file-type-excel', 'file-type-image', 'file-type-video', 'default-file']) {
      expect(names.has(name)).toBe(true);
      expect(resolves('vscode-icons', name)).toBe(true);
    }
    expect(resolves('svg-spinners', 'ring-resize')).toBe(true);
  });

  it('is exactly what the source needs, with no name its collection lacks', () => {
    const { bundle, missing } = buildBundle();
    expect(missing).toEqual([]);
    expect(bundle).toEqual(committed);
  });
});
