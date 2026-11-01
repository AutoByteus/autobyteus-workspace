#!/usr/bin/env node
// The server type gate: `pnpm typecheck` (after `pretypecheck` builds the shared packages). Type-checks `src` and the
// test files under the build policy (tsconfig.build.json), with the package's pinned TypeScript, so a test that calls a
// removed or renamed API fails it.
// This file holds only the server package's configuration: its projects, its baseline and which files are test files.
// The gate's rules and exit policy (production files 0 errors, test files at most their `typecheck-baseline.json`
// counts, shrink-only `pnpm typecheck:update-baseline`, fail closed) live in the shared `scripts/typecheck-gate/`.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTypecheckGate } from '../../scripts/typecheck-gate/run-typecheck-gate.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The tests project gets its own V8 heap limit, so the gate does not depend on the machine's default (a quarter of RAM:
// about 1.75 GB on the 7 GB macOS runners) or on the caller's NODE_OPTIONS. Measured 2026-11-01 (macOS arm64, Node 22):
// it aborts at heap limits up to 2048 MB and passes at 2560 MB, with a maximum RSS of about 2.7 GB. 4096 MB leaves
// headroom and fits the 7 GB runners (the src project needs no limit of its own).
const SERVER_TESTS_HEAP_MB = 4096;

const PROJECTS = [
  { name: 'server src', compiler: 'typescript/bin/tsc', config: 'tsconfig.build.json' },
  { name: 'server tests', compiler: 'typescript/bin/tsc', config: 'tsconfig.tests.json', heapMb: SERVER_TESTS_HEAP_MB },
];

/**
 * Test files may carry baselined errors: the package's tests and the shared ../test-support they import. Every other
 * checked file is production code, including `src` and another package's source a test reaches (for example
 * ../autobyteus-ts/src through test-support).
 */
export function isTestFile(packagePath) {
  return packagePath.startsWith('tests/') || packagePath.startsWith('../test-support/');
}

// Run the gate only when executed as the package script.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runTypecheckGate({
    packageRoot,
    baselinePath: path.join(packageRoot, 'typecheck-baseline.json'),
    projects: PROJECTS,
    isTestFile,
    updateBaseline: process.argv.includes('--update-baseline'),
  });
}
