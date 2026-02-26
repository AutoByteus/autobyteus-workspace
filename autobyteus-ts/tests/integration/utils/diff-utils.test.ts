import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { applyUnifiedDiff } from '../../../src/utils/diff-utils.js';

describe('applyUnifiedDiff (integration)', () => {
  it('applies patch to file content on disk', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-diff-utils-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const originalLines = (await fs.readFile(filePath, 'utf-8')).split(/(?<=\n)/);
    const patch = `@@ -1,2 +1,2 @@
-line1
+LINE1
 line2
`;

    const patchedLines = applyUnifiedDiff(originalLines, patch);
    await fs.writeFile(filePath, patchedLines.join(''), 'utf-8');

    const updated = await fs.readFile(filePath, 'utf-8');
    expect(updated).toBe('LINE1\nline2\n');
  });
});
