// @vitest-environment node
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compareWithBaseline,
  countTestFileErrors,
  isTestFile,
  parseCompilerOutput,
  readBaseline,
  shrinkBaseline,
} from '../lib/typecheckGate.mjs';

const packageRoot = path.resolve('/repo/autobyteus-web');

describe('typecheck gate output parsing', () => {
  it('attributes each diagnostic, with its indented continuation lines, to its package path', () => {
    const output = [
      "stores/a.ts(3,7): error TS2322: Type 'string' is not assignable to type 'number'.",
      "components/B.vue(10,1): error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'.",
      "  Type 'X' is missing the following properties from type 'Y': a, b",
      'electron/__tests__/c.spec.ts(1,1): error TS2307: Cannot find module \'d\' or its corresponding type declarations.',
      '',
    ].join('\n');

    const parsed = parseCompilerOutput(output, packageRoot);

    expect(parsed.unattributed).toEqual([]);
    expect(parsed.unexpected).toEqual([]);
    expect(parsed.diagnostics.map(({ file, code, lines }) => ({ file, code, lineCount: lines.length }))).toEqual([
      { file: 'stores/a.ts', code: 'TS2322', lineCount: 1 },
      { file: 'components/B.vue', code: 'TS2345', lineCount: 2 },
      { file: 'electron/__tests__/c.spec.ts', code: 'TS2307', lineCount: 1 },
    ]);
  });

  it('reports an error that names no file, such as a config or type-definition error', () => {
    const output = [
      "error TS2688: Cannot find type definition file for 'missing-types'.",
      "tsconfig.json(4,5): error TS5023: Unknown compiler option 'bogus'.",
    ].join('\n');

    const parsed = parseCompilerOutput(output, packageRoot);

    expect(parsed.unattributed).toEqual(["error TS2688: Cannot find type definition file for 'missing-types'."]);
    expect(parsed.diagnostics.map(({ file }) => file)).toEqual(['tsconfig.json']);
  });

  it('reports output it does not know, such as a crash trace', () => {
    const parsed = parseCompilerOutput('TypeError: Cannot read properties of undefined\n    at run (tsc.js:1:1)', packageRoot);

    expect(parsed.unexpected).toEqual(['TypeError: Cannot read properties of undefined', '    at run (tsc.js:1:1)']);
    expect(parsed.diagnostics).toEqual([]);
  });

  it('stores paths outside the package relative to it, so they count as production files', () => {
    const parsed = parseCompilerOutput("../autobyteus-server-ts/src/x.ts(1,1): error TS2307: Cannot find module 'y'.", packageRoot);

    expect(parsed.diagnostics[0]?.file).toBe('../autobyteus-server-ts/src/x.ts');
    expect(isTestFile('../autobyteus-server-ts/src/x.ts')).toBe(false);
  });
});

describe('typecheck gate file classification', () => {
  it.each([
    ['stores/__tests__/x.spec.ts', true],
    ['electron/server/__tests__/helper.ts', true],
    ['utils/x.test.ts', true],
    ['tests/stores/x.ts', true],
    ['test-support/x.ts', true],
    ['stores/x.ts', false],
    ['components/X.vue', false],
    ['nuxt.config.ts', false],
    ['electron/main.ts', false],
  ])('%s is a test file: %s', (file, expected) => {
    expect(isTestFile(file)).toBe(expected);
  });
});

describe('typecheck gate baseline comparison', () => {
  const diagnostics = [
    { file: 'stores/__tests__/a.spec.ts', code: 'TS1', lines: [] },
    { file: 'stores/__tests__/a.spec.ts', code: 'TS1', lines: [] },
    { file: 'tests/b.ts', code: 'TS1', lines: [] },
    { file: 'stores/c.ts', code: 'TS1', lines: [] },
  ];

  it('counts errors per test file only', () => {
    expect(countTestFileErrors(diagnostics)).toEqual({ 'stores/__tests__/a.spec.ts': 2, 'tests/b.ts': 1 });
  });

  it('passes when every count equals the baseline', () => {
    expect(compareWithBaseline({ 'a.spec.ts': 2 }, { 'a.spec.ts': 2 })).toEqual({ added: [], higher: [], lower: [] });
  });

  it('reports a file not in the baseline, a higher count and a lower or cleared count', () => {
    expect(compareWithBaseline(
      { 'new.spec.ts': 1, 'up.spec.ts': 3, 'down.spec.ts': 1 },
      { 'up.spec.ts': 2, 'down.spec.ts': 2, 'cleared.spec.ts': 4 },
    )).toEqual({
      added: [{ file: 'new.spec.ts', count: 1 }],
      higher: [{ file: 'up.spec.ts', count: 3, baseline: 2 }],
      lower: [
        { file: 'down.spec.ts', count: 1, baseline: 2 },
        { file: 'cleared.spec.ts', count: 0, baseline: 4 },
      ],
    });
  });

  it('shrinks the baseline to lower counts and drops files at zero', () => {
    expect(shrinkBaseline({ 'b.spec.ts': 1, 'a.spec.ts': 2 }, { 'a.spec.ts': 3, 'b.spec.ts': 1, 'c.spec.ts': 5 })).toEqual({
      refused: false,
      baseline: { 'a.spec.ts': 2, 'b.spec.ts': 1 },
    });
  });

  it('refuses to grow the baseline', () => {
    expect(shrinkBaseline({ 'a.spec.ts': 4 }, { 'a.spec.ts': 3 })).toMatchObject({ refused: true, higher: [{ file: 'a.spec.ts' }] });
    expect(shrinkBaseline({ 'n.spec.ts': 1 }, {})).toMatchObject({ refused: true, added: [{ file: 'n.spec.ts' }] });
  });

  it('accepts only positive integer counts in the baseline file', () => {
    expect(readBaseline('{"a.spec.ts": 2}')).toEqual({ 'a.spec.ts': 2 });
    expect(() => readBaseline('[]')).toThrow();
    expect(() => readBaseline('{"a.spec.ts": 0}')).toThrow();
    expect(() => readBaseline('{"a.spec.ts": "2"}')).toThrow();
  });
});
