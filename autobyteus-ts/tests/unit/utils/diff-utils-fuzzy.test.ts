import { describe, it, expect } from 'vitest';
import { applyUnifiedDiff, PatchApplicationError } from '../../../src/utils/diff-utils.js';

describe('applyUnifiedDiff (fuzzy)', () => {
  it('test_ignore_whitespace', () => {
    const original = ['def foo():\n', '    return True\n'];
    const patch = `@@ -1,2 +1,2 @@
 def foo():
-  return True
+  return False
`;

    expect(() => applyUnifiedDiff(original, patch)).toThrow(PatchApplicationError);

    const patched = applyUnifiedDiff(original, patch, { ignoreWhitespace: true });
    expect(patched).toEqual(['def foo():\n', '  return False\n']);
  });

  it('test_fuzz_factor', () => {
    const original = ['a\n', 'b\n', 'c\n', 'd\n', 'e\n'];
    const patch = `@@ -1,1 +1,1 @@
-b
+z
`;

    expect(() => applyUnifiedDiff(original, patch)).toThrow(PatchApplicationError);

    const patched = applyUnifiedDiff(original, patch, { fuzzFactor: 1 });
    expect(patched).toEqual(['a\n', 'z\n', 'c\n', 'd\n', 'e\n']);
  });

  it('test_fuzz_factor_negative', () => {
    const original = ['a\n', 'b\n', 'c\n', 'd\n', 'e\n'];
    const patch = `@@ -3,1 +3,1 @@
-b
+z
`;

    const patched = applyUnifiedDiff(original, patch, { fuzzFactor: 1 });
    expect(patched).toEqual(['a\n', 'z\n', 'c\n', 'd\n', 'e\n']);
  });

  it('test_combined_fuzzy', () => {
    const original = ['    start\n', '    mid\n', '    end\n'];
    const patch = `@@ -1,1 +1,1 @@
-mid
+changed
`;

    const patched = applyUnifiedDiff(original, patch, { fuzzFactor: 2, ignoreWhitespace: true });
    expect(patched).toEqual(['    start\n', 'changed\n', '    end\n']);
  });

  it('test_git_header_lines_are_skipped', () => {
    const original = ['line1\n', 'line2\n'];
    const patch = `diff --git a/sample.txt b/sample.txt
index 1234567..89abcde 100644
--- a/sample.txt
+++ b/sample.txt
@@ -1,2 +1,2 @@
-line1
+LINE1
 line2
`;

    const patched = applyUnifiedDiff(original, patch);
    expect(patched).toEqual(['LINE1\n', 'line2\n']);
  });

  it('test_allows_missing_newline_at_eof', () => {
    const original = ['line1\n', 'line2'];
    const patch = `@@ -1,2 +1,2 @@
 line1
-line2
+LINE2`;

    const patched = applyUnifiedDiff(original, patch);
    expect(patched).toEqual(['line1\n', 'LINE2']);
  });
});
