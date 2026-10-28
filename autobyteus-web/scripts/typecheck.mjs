#!/usr/bin/env node
// The web type gate: `pnpm typecheck` (after `prepare:shared-types` builds @autobyteus/application-sdk-contracts, whose
// types web code imports from its untracked dist/, and `nuxt prepare`). Type-checks the Nuxt app (vue-tsc), Electron main with
// its specs and the build scripts (tsc), each under its own config, with the package's pinned compilers.
// Production files must have no type errors. Test files may not exceed their counts in `typecheck-baseline.json`;
// a lower count also fails until `pnpm typecheck:update-baseline` shrinks the baseline, which refuses any growth.
// The gate fails closed: a compiler that cannot start, ends by a signal, exits non-zero without a diagnostic, or
// prints an error without a file or a line it does not know fails it.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareWithBaseline,
  countTestFileErrors,
  isTestFile,
  parseCompilerOutput,
  readBaseline,
  shrinkBaseline,
} from './lib/typecheckGate.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(packageRoot, 'typecheck-baseline.json');
const require = createRequire(import.meta.url);
const updateBaseline = process.argv.includes('--update-baseline');

// The Nuxt app's compiler gets its own V8 heap limit, so the gate does not depend on the machine's default (a quarter of
// RAM: about 1.75 GB on the 7 GB macOS release runners, where it aborted) or on the caller's NODE_OPTIONS (a command-line
// flag takes precedence). Measured 2026-10-28 (macOS arm64, Node 22): the project's heap peaks at about 3.0 GB (it
// aborts at limits up to 2560 MB) with a maximum RSS of about 3.3 GB, which fits the 7 GB runners.
const NUXT_APP_HEAP_MB = 4096;

const PROJECTS = [
  { name: 'Nuxt app', compiler: 'vue-tsc/bin/vue-tsc.js', config: 'tsconfig.json', heapMb: NUXT_APP_HEAP_MB },
  { name: 'Electron main', compiler: 'typescript/bin/tsc', config: 'electron/tsconfig.typecheck.json' },
  { name: 'build scripts', compiler: 'typescript/bin/tsc', config: 'build/tsconfig.json' },
];

function log(message) {
  console.log(`[typecheck] ${message}`);
}

function runProject(project) {
  const label = `${project.name} (${project.config})`;
  let compilerPath;
  try {
    compilerPath = require.resolve(project.compiler);
  } catch (error) {
    return { label, failures: [`${label}: the compiler ${project.compiler} cannot be found: ${error.message}`], diagnostics: [] };
  }
  const started = Date.now();
  const heapArgs = project.heapMb ? [`--max-old-space-size=${project.heapMb}`] : [];
  const result = spawnSync(process.execPath, [...heapArgs, compilerPath, '-p', project.config, '--noEmit', '--pretty', 'false'], {
    cwd: packageRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.error) {
    return { label, failures: [`${label}: the compiler could not be started: ${result.error.message}`], diagnostics: [] };
  }
  if (result.signal) {
    // Name the cause when the compiler printed one (for example V8's "Reached heap limit" before SIGABRT).
    const fatal = `${result.stderr}\n${result.stdout}`.split('\n').find((line) => /FATAL ERROR/.test(line));
    return { label, failures: [`${label}: the compiler ended by signal ${result.signal}${fatal ? ` (${fatal.trim()})` : ''}`], diagnostics: [] };
  }
  const stdout = parseCompilerOutput(result.stdout, packageRoot);
  const stderr = parseCompilerOutput(result.stderr, packageRoot);
  const diagnostics = [...stdout.diagnostics, ...stderr.diagnostics];
  const failures = [];
  for (const line of [...stdout.unattributed, ...stderr.unattributed]) failures.push(`${label}: an error without a file: ${line}`);
  for (const line of stdout.unexpected) failures.push(`${label}: unexpected compiler output: ${line}`);
  if (result.status !== 0 && diagnostics.length === 0 && failures.length === 0) {
    const stderrText = result.stderr.trim();
    failures.push(`${label}: the compiler exited with ${result.status} without a diagnostic${stderrText ? `: ${stderrText}` : ''}`);
  }
  for (const line of stderr.unexpected) log(`${label} stderr: ${line}`);
  log(`${label}: ${diagnostics.length} errors, exit ${result.status}, ${seconds}s`);
  return { label, failures, diagnostics };
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) throw new Error(`${path.basename(baselinePath)} is missing`);
  return readBaseline(fs.readFileSync(baselinePath, 'utf8'));
}

function printDiagnostics(heading, diagnostics) {
  if (diagnostics.length === 0) return;
  console.error(`\n${heading}`);
  for (const diagnostic of diagnostics) console.error(diagnostic.lines.join('\n'));
}

function main() {
  let baseline;
  try {
    baseline = loadBaseline();
  } catch (error) {
    console.error(`[typecheck] FAIL: cannot read the baseline: ${error.message}`);
    return 1;
  }

  const results = PROJECTS.map(runProject);
  const failures = results.flatMap((result) => result.failures);
  const diagnostics = results.flatMap((result) => result.diagnostics);
  const productionDiagnostics = diagnostics.filter((diagnostic) => !isTestFile(diagnostic.file));
  const counts = countTestFileErrors(diagnostics);
  const { added, higher, lower } = compareWithBaseline(counts, baseline);
  const testErrorTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const baselineTotal = Object.values(baseline).reduce((sum, count) => sum + count, 0);

  for (const failure of failures) console.error(`[typecheck] FAIL: ${failure}`);
  printDiagnostics('Production files must have no type errors:', productionDiagnostics);
  const growingFiles = new Set([...added, ...higher].map(({ file }) => file));
  printDiagnostics(
    'Test files above their baseline count:',
    diagnostics.filter((diagnostic) => growingFiles.has(diagnostic.file)),
  );
  for (const { file, count } of added) console.error(`[typecheck] new test file with errors: ${file} (${count})`);
  for (const { file, count, baseline: listed } of higher) console.error(`[typecheck] more errors than the baseline: ${file} (${count}, baseline ${listed})`);
  for (const { file, count, baseline: listed } of lower) console.error(`[typecheck] fewer errors than the baseline: ${file} (${count}, baseline ${listed})`);

  log(`production errors: ${productionDiagnostics.length}; test-file errors: ${testErrorTotal} in ${Object.keys(counts).length} files `
    + `(baseline ${baselineTotal} in ${Object.keys(baseline).length} files)`);

  if (failures.length > 0 || productionDiagnostics.length > 0) {
    if (updateBaseline) console.error('[typecheck] the baseline was not updated');
    console.error('[typecheck] FAIL');
    return 1;
  }

  if (updateBaseline) {
    const shrunk = shrinkBaseline(counts, baseline);
    if (shrunk.refused) {
      console.error('[typecheck] FAIL: the baseline only shrinks; fix the new or higher test-file errors above');
      return 1;
    }
    fs.writeFileSync(baselinePath, `${JSON.stringify(shrunk.baseline, null, 2)}\n`);
    log(`baseline written: ${testErrorTotal} errors in ${Object.keys(shrunk.baseline).length} files (was ${baselineTotal} in ${Object.keys(baseline).length})`);
    return 0;
  }

  if (added.length > 0 || higher.length > 0) {
    console.error('[typecheck] FAIL: fix the new type errors in the test files above');
    return 1;
  }
  if (lower.length > 0) {
    console.error('[typecheck] FAIL: test-file errors went down; shrink the baseline with `pnpm typecheck:update-baseline`');
    return 1;
  }
  log('PASS');
  return 0;
}

process.exitCode = main();
