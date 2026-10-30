// The rules of the web type gate (`scripts/typecheck.mjs`): reading compiler output, telling production files from
// test files, and comparing test-file error counts with the shrink-only baseline (`typecheck-baseline.json`).

import path from 'node:path';

// `path(line,col): error TS1234: message` — the compilers run with `--pretty false`.
const DIAGNOSTIC_LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): /;
const ERROR_CODE = /\berror TS\d+\b/;

/** A path as the baseline stores it: relative to the web package, with `/` separators. */
export function toPackagePath(reportedPath, packageRoot) {
  const absolute = path.resolve(packageRoot, reportedPath);
  return path.relative(packageRoot, absolute).split(path.sep).join('/');
}

/**
 * Reads one compiler's output. Every `error TS` line must name its file; continuation lines of a diagnostic are
 * indented. Anything else (an error without a file, a crash trace, a line the gate does not know) is returned as
 * `unattributed` or `unexpected`, and the gate fails on it.
 */
export function parseCompilerOutput(output, packageRoot) {
  const diagnostics = [];
  const unattributed = [];
  const unexpected = [];
  let current = null;
  for (const line of output.split(/\r?\n/)) {
    if (line.trim() === '') {
      current = null;
      continue;
    }
    const match = DIAGNOSTIC_LINE.exec(line);
    if (match) {
      current = { file: toPackagePath(match[1], packageRoot), code: match[4], lines: [line] };
      diagnostics.push(current);
    } else if (ERROR_CODE.test(line)) {
      unattributed.push(line);
      current = null;
    } else if (current && /^\s/.test(line)) {
      current.lines.push(line);
    } else {
      unexpected.push(line);
      current = null;
    }
  }
  return { diagnostics, unattributed, unexpected };
}

/** Test files may carry baselined errors; every other checked file is production code and must have none. */
export function isTestFile(packagePath) {
  return packagePath.includes('/__tests__/')
    || packagePath.startsWith('__tests__/')
    || packagePath.endsWith('.spec.ts')
    || packagePath.endsWith('.test.ts')
    || packagePath.startsWith('tests/')
    || packagePath.startsWith('test-support/');
}

/** Error counts per test file, sorted by path. */
export function countTestFileErrors(diagnostics) {
  const counts = {};
  for (const { file } of diagnostics) {
    if (isTestFile(file)) counts[file] = (counts[file] ?? 0) + 1;
  }
  return sortByPath(counts);
}

/**
 * Compares the test-file counts with the baseline: a file not listed (`added`), more errors than listed (`higher`),
 * fewer errors than listed or none left (`lower`). Each of them fails the gate.
 */
export function compareWithBaseline(counts, baseline) {
  const added = [];
  const higher = [];
  const lower = [];
  for (const [file, count] of Object.entries(counts)) {
    const listed = baseline[file];
    if (listed === undefined) added.push({ file, count });
    else if (count > listed) higher.push({ file, count, baseline: listed });
    else if (count < listed) lower.push({ file, count, baseline: listed });
  }
  for (const [file, listed] of Object.entries(baseline)) {
    if (counts[file] === undefined) lower.push({ file, count: 0, baseline: listed });
  }
  return { added, higher, lower };
}

/** The shrunk baseline: lower counts written, files at zero removed. Refuses a new file or a higher count. */
export function shrinkBaseline(counts, baseline) {
  const { added, higher } = compareWithBaseline(counts, baseline);
  if (added.length > 0 || higher.length > 0) return { refused: true, added, higher };
  return { refused: false, baseline: sortByPath(counts) };
}

/** Validates the baseline file's content: an object of package paths to positive integer counts. */
export function readBaseline(json) {
  const value = JSON.parse(json);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('the baseline must be an object of file paths to error counts');
  }
  for (const [file, count] of Object.entries(value)) {
    if (!Number.isInteger(count) || count < 1) throw new Error(`the baseline count of ${file} must be a positive integer`);
  }
  return value;
}

function sortByPath(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
