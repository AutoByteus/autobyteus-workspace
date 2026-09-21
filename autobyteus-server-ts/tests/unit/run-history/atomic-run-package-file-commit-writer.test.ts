import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AtomicRunPackageFileCommitWriter } from '../../../src/run-history/store/atomic-run-package-file-commit-writer.js';
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }); });
it('shares committed physical outcomes for JSON and exact serialized JSONL bytes without double encoding', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'package-commit-')); roots.push(root);
  const writer = new AtomicRunPackageFileCommitWriter();
  const payload = { identity: 'unchanged', values: [null, 0, false] };
  expect(await writer.write({ file: 'json', filePath: path.join(root, 'data.json'), payload })).toEqual({ outcome: 'committed', file: 'json' });
  expect(JSON.parse(await fs.readFile(path.join(root, 'data.json'), 'utf8'))).toEqual(payload);
  const text = ' { "id":"one" }\r\n\n{"id":"two"}\n';
  expect(await writer.writeSerializedText({ file: 'traces', filePath: path.join(root, 'data.jsonl'), text })).toEqual({ outcome: 'committed', file: 'traces' });
  expect(await fs.readFile(path.join(root, 'data.jsonl'), 'utf8')).toBe(text);
});
it('retains non-throwing pre-rename serialization failure results for original JSON callers', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'package-commit-')); roots.push(root);
  const filePath = path.join(root, 'data.json'); await fs.writeFile(filePath, 'original');
  const payload: { self?: unknown } = {}; payload.self = payload;
  expect(await new AtomicRunPackageFileCommitWriter().write({ file: 'json', filePath, payload }))
    .toMatchObject({ outcome: 'not_renamed', stage: 'write_temp', file: 'json', cause: expect.any(Error) });
  expect(await fs.readFile(filePath, 'utf8')).toBe('original'); expect(await fs.readdir(root)).toEqual(['data.json']);
});
