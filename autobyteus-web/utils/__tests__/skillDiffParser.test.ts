import { describe, expect, it } from 'vitest';
import { parseUnifiedDiffByFile } from '../skillDiffParser';

describe('parseUnifiedDiffByFile', () => {
  it('splits unified diff into file sections', () => {
    const diff = [
      'diff --git a/foo.txt b/foo.txt',
      'index 111..222 100644',
      '--- a/foo.txt',
      '+++ b/foo.txt',
      '@@ -1,2 +1,2 @@',
      '-old line',
      '+new line',
      'diff --git a/bar.txt b/bar.txt',
      'index 333..444 100644',
      '--- a/bar.txt',
      '+++ b/bar.txt',
      '@@ -1 +1 @@',
      '-alpha',
      '+beta',
    ].join('\n');

    const parsed = parseUnifiedDiffByFile(diff);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].filePath).toBe('foo.txt');
    expect(parsed[0].diff).toContain('diff --git a/foo.txt b/foo.txt');
    expect(parsed[1].filePath).toBe('bar.txt');
    expect(parsed[1].diff).toContain('diff --git a/bar.txt b/bar.txt');
  });

  it('uses the added file path when diffing from /dev/null', () => {
    const diff = [
      'diff --git a/dev/null b/new.txt',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/new.txt',
      '@@ -0,0 +1 @@',
      '+hello',
    ].join('\n');

    const parsed = parseUnifiedDiffByFile(diff);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].filePath).toBe('new.txt');
  });

  it('falls back to a full diff entry when no file headers exist', () => {
    const diff = [
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const parsed = parseUnifiedDiffByFile(diff);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].filePath).toBe('Full diff');
  });

  it('returns an empty array for empty diff', () => {
    expect(parseUnifiedDiffByFile('')).toEqual([]);
    expect(parseUnifiedDiffByFile('   ')).toEqual([]);
  });
});
