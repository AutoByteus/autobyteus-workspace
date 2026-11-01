// @vitest-environment node
// The shared type gate (`scripts/typecheck-gate/`): its rules, the runner's exit policy, and the web package's
// test-file rule (`scripts/typecheck.mjs`). The root has no vitest runner, so the web's `test:nuxt` runs this spec.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  compareWithBaseline,
  countTestFileErrors,
  parseCompilerOutput,
  readBaseline,
  shrinkBaseline,
} from '../../../scripts/typecheck-gate/typecheck-gate-rules.mjs';
import { runTypecheckGate } from '../../../scripts/typecheck-gate/run-typecheck-gate.mjs';
import { isTestFile } from '../typecheck.mjs';

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

  it('counts errors per test file only, by the package rule it is given', () => {
    expect(countTestFileErrors(diagnostics, isTestFile)).toEqual({ 'stores/__tests__/a.spec.ts': 2, 'tests/b.ts': 1 });
    expect(countTestFileErrors(diagnostics, (file: string) => file === 'stores/c.ts')).toEqual({ 'stores/c.ts': 1 });
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

describe('typecheck gate runner', () => {
  let root: string;
  let errors: string[];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'typecheck-gate-runner-'));
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"fake-package","private":true}\n');
    errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { errors.push(args.join(' ')); });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  /** A fake compiler: a Node script in the package whose body decides its output and how it ends. */
  const fakeCompiler = (body: string): string => {
    fs.writeFileSync(path.join(root, 'fake-compiler.js'), body);
    return './fake-compiler.js';
  };
  const run = (compiler: string, baseline: Record<string, number> = {}, packageRoot = root, updateBaseline = false) => {
    const baselinePath = path.join(root, 'typecheck-baseline.json');
    fs.writeFileSync(baselinePath, `${JSON.stringify(baseline)}\n`);
    return runTypecheckGate({
      packageRoot,
      baselinePath,
      projects: [{ name: 'fake', compiler, config: 'tsconfig.json' }],
      isTestFile,
      updateBaseline,
    });
  };

  it('passes when the compiler reports nothing and the baseline is empty', () => {
    expect(run(fakeCompiler('process.exit(0);'))).toBe(0);
  });

  it('passes when test-file errors equal the baseline', () => {
    const compiler = fakeCompiler(`console.log("stores/__tests__/a.spec.ts(1,1): error TS2322: x."); process.exit(2);`);
    expect(run(compiler, { 'stores/__tests__/a.spec.ts': 1 })).toBe(0);
  });

  it('fails when the compiler cannot be found', () => {
    expect(run('./missing-compiler.js')).toBe(1);
    expect(errors.join('\n')).toContain('cannot be found');
  });

  it('fails when the compiler cannot be started', () => {
    const compiler = path.join(root, 'fake-compiler.js');
    fakeCompiler('process.exit(0);');
    expect(run(compiler, {}, path.join(root, 'no-such-directory'))).toBe(1);
    expect(errors.join('\n')).toContain('could not be started');
  });

  it('fails when the compiler ends by a signal', () => {
    expect(run(fakeCompiler(`process.kill(process.pid, 'SIGTERM'); setTimeout(() => {}, 10000);`))).toBe(1);
    expect(errors.join('\n')).toContain('ended by signal SIGTERM');
  });

  it('fails on an error line that names no file', () => {
    expect(run(fakeCompiler(`console.log("error TS2688: Cannot find type definition file for 'x'."); process.exit(2);`))).toBe(1);
    expect(errors.join('\n')).toContain('an error without a file');
  });

  it('fails when the compiler exits non-zero without a diagnostic', () => {
    expect(run(fakeCompiler('process.exit(3);'))).toBe(1);
    expect(errors.join('\n')).toContain('exited with 3 without a diagnostic');
  });

  it('fails on an error in another package\'s source, which is production code for the gate', () => {
    const compiler = fakeCompiler(`console.log("../autobyteus-server-ts/src/x.ts(1,1): error TS2322: x."); process.exit(2);`);
    expect(run(compiler)).toBe(1);
    expect(errors.join('\n')).toContain('Production files must have no type errors');
  });

  it('fails on a new test-file error and refuses to grow the baseline', () => {
    const compiler = fakeCompiler(`console.log("stores/__tests__/a.spec.ts(1,1): error TS2322: x."); process.exit(2);`);
    expect(run(compiler)).toBe(1);
    expect(run(compiler, {}, root, true)).toBe(1);
    expect(fs.readFileSync(path.join(root, 'typecheck-baseline.json'), 'utf8')).toBe('{}\n');
  });

  it('fails on fewer errors than the baseline until the baseline is shrunk', () => {
    const compiler = fakeCompiler('process.exit(0);');
    expect(run(compiler, { 'stores/__tests__/a.spec.ts': 2 })).toBe(1);
    expect(run(compiler, { 'stores/__tests__/a.spec.ts': 2 }, root, true)).toBe(0);
    expect(fs.readFileSync(path.join(root, 'typecheck-baseline.json'), 'utf8')).toBe('{}\n');
  });
});
