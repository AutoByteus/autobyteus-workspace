import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { validateReadableRegularFile } from '../localFileValidation';

const temporaryPaths: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((filePath) => fs.rm(filePath, { recursive: true, force: true })));
});

describe('trusted local preview validation', () => {
  it('requires a readable regular absolute file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-local-file-'));
    temporaryPaths.push(root);
    const filePath = path.join(root, 'report.md');
    await fs.writeFile(filePath, '# report');

    await expect(validateReadableRegularFile(filePath)).resolves.toEqual({ ok: true, filePath });
    await expect(validateReadableRegularFile(root)).resolves.toEqual({
      ok: false,
      error: 'The selected path is not a regular file.',
    });
    await expect(validateReadableRegularFile('relative/report.md')).resolves.toEqual({
      ok: false,
      error: 'The file path must be an absolute path.',
    });
  });
});
