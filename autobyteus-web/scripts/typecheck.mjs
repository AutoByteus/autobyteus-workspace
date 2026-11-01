#!/usr/bin/env node
// The web type gate: `pnpm typecheck` (after `prepare:shared-types` builds @autobyteus/application-sdk-contracts, whose
// types web code imports from its untracked dist/, and `nuxt prepare`). Type-checks the Nuxt app (vue-tsc), Electron main with
// its specs, the build scripts (tsc) and the tests that import server code (vue-tsc, `tsconfig.cross-package-tests.json`),
// each under its own config, with the package's pinned compilers.
// This file holds only the web package's configuration: its projects, its baseline and which files are test files.
// The gate's rules and exit policy (production files 0 errors, test files at most their `typecheck-baseline.json`
// counts, shrink-only `pnpm typecheck:update-baseline`, fail closed) live in the shared `scripts/typecheck-gate/`.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTypecheckGate } from '../../scripts/typecheck-gate/run-typecheck-gate.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The Nuxt app's compiler gets its own V8 heap limit, so the gate does not depend on the machine's default (a quarter of
// RAM: about 1.75 GB on the 7 GB macOS release runners, where it aborted) or on the caller's NODE_OPTIONS (a command-line
// flag takes precedence). Measured 2026-10-28 (macOS arm64, Node 22): the project's heap peaks at about 3.0 GB (it
// aborts at limits up to 2560 MB) with a maximum RSS of about 3.3 GB, which fits the 7 GB runners.
const NUXT_APP_HEAP_MB = 4096;
// The cross-package tests compile with the server's src and fixtures. Measured 2026-11-01 (macOS arm64, Node 22): it
// aborts at heap limits up to 2048 MB, passes at 2560 MB, with a maximum RSS of about 2.7 GB; the same limit as the
// Nuxt app leaves headroom and fits the 7 GB runners (the projects run one after another).
const CROSS_PACKAGE_TESTS_HEAP_MB = 4096;

const PROJECTS = [
  { name: 'Nuxt app', compiler: 'vue-tsc/bin/vue-tsc.js', config: 'tsconfig.json', heapMb: NUXT_APP_HEAP_MB },
  { name: 'Electron main', compiler: 'typescript/bin/tsc', config: 'electron/tsconfig.typecheck.json' },
  { name: 'build scripts', compiler: 'typescript/bin/tsc', config: 'build/tsconfig.json' },
  {
    name: 'cross-package tests',
    compiler: 'vue-tsc/bin/vue-tsc.js',
    config: 'tsconfig.cross-package-tests.json',
    heapMb: CROSS_PACKAGE_TESTS_HEAP_MB,
  },
];

/** Test files may carry baselined errors; every other checked file, in this package or another, is production code. */
export function isTestFile(packagePath) {
  return packagePath.includes('/__tests__/')
    || packagePath.startsWith('__tests__/')
    || packagePath.endsWith('.spec.ts')
    || packagePath.endsWith('.test.ts')
    || packagePath.startsWith('tests/')
    || packagePath.startsWith('test-support/');
}

// Run the gate only when executed as the package script, so the spec can import the test-file rule.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runTypecheckGate({
    packageRoot,
    baselinePath: path.join(packageRoot, 'typecheck-baseline.json'),
    projects: PROJECTS,
    isTestFile,
    updateBaseline: process.argv.includes('--update-baseline'),
  });
}
