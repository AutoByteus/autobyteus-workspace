# Design Spec — autobyteus-318 (test and tooling hygiene, round 2)

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (SR-002 resolved ARCH-REV-001; SR-003 decided T-28 signature 2; SR-004 resolves ARCH-REV-003 AR-002/AR-003 on it)
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed 2026-11-01); the PM's message of 2026-11-01 delegates drop decisions to the Solution Designer.
- Behavior-defining supplements: None.
- User approval of the design, when the direction requires it: `Not required` (the Task asks for no design approval).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318/tickets/in-progress/test-and-tooling-hygiene-318/investigation-notes.md`
- Authorities read (2026-11-01): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `TESTING.md`; `references/design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- **Web type gate.** `autobyteus-web/scripts/typecheck.mjs` (156 lines) runs three projects (Nuxt app via vue-tsc, Electron main, build scripts) and applies the rules in `autobyteus-web/scripts/lib/typecheckGate.mjs` (108 lines: parse output, `isTestFile`, count, compare, shrink). The baseline (`typecheck-baseline.json`) holds 298 test errors. The three cross-package tests are excluded through `nuxt.config.ts` L239-241, which feeds the generated `.nuxt/tsconfig.json`.
- **Server type check.** `pnpm -C autobyteus-server-ts typecheck` runs `tsc -p tsconfig.build.json --noEmit` over `src` only (package.json L14). A one-off, `typecheck:claude-interrupt-resume-e2e` (L15, `tsconfig.claude-interrupt-resume-e2e.json`), type-checks one e2e file under the build policy. Under the build policy the tests have 1,316 errors and `src` has 0 (SD-01). No CI workflow runs a type check.
- **Shared workspace tooling** already lives in the root `scripts/` folder and is used from packages (`scripts/workspace-package-roots.mjs`, tested in `autobyteus-web/scripts/__tests__/workspace-package-roots.test.mjs`).
- **Electron tests.** `electron/vitest.config.ts` has no setup. `node_modules/electron/index.js` downloads the binary synchronously on the first `require('electron')` when `dist/` is missing (L7-40). After `pnpm install` no `dist/` exists (measured).
- **Transcription URL.** Carried from `nuxt.config.ts` to the server store and Electron's server manager with no reader (investigation T-04).
- The remaining items are test files that call APIs the product changed on purpose, or that depend on wall-clock timing (investigation triage).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: many files across several areas. Server test files (about 15 suites repaired); about 90 web spec files for the 196 baseline errors; the web gate script and a moved library; a new server gate, config and baseline; web/Electron config and types for the URL removal; `package.json` and the lockfile; the Electron vitest config; 5+ probes; docs and TESTING.md. Most of it is test-file payload, but the scope spans subsystems.
- Architectural risk: `Low`
- Risk rationale and supporting evidence:
  - No runtime owner, API, persistence, security or concurrency change.
  - The URL removal deletes an unread config field between the web and Electron of one release, a clean cut under DESIGN.md rule 9.
  - The gate move keeps the web gate's behavior. It runs inside `build:electron*`, so the release build depends on it; that is proven by running the gate and its unit tests.
  - The server gate is new local tooling with a baseline, so it passes on day one.
- Escalation trigger if implementation or validation discovers new impact:
  - a repaired test reveals a product defect (for example U-02, T-52 or a probe);
  - the shared gate cannot keep the web gate's output and exit behavior;
  - the server gate needs more than about 4 GB of heap.

  Each is reported as `Design Impact` or a follow-up, never absorbed silently.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Server test type check, build policy | `evidence/SD-01-…txt` | 1,316 errors in 380 files; `src` 0 | DS-002, server baseline | Heap peak not measured |
| Web cross-package project | `evidence/SD-02-…txt` | 4 errors with the server build's `noImplicitOverride: false`, decorators | DS-001 project options | None |
| Gate library | `autobyteus-web/scripts/lib/typecheckGate.mjs` L1-108; `scripts/typecheck.mjs` L36-156 | Rules are package-agnostic except `isTestFile` (L49-56) and the package-relative paths | Move to the root; per-package test-file rule | None |
| Existing one-off | `autobyteus-server-ts/tsconfig.claude-interrupt-resume-e2e.json`; `package.json` L15; header of `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` L9 | Same idea for one file | Remove; the general check covers it | None |
| Electron loader | `autobyteus-web/node_modules/electron/index.js` L7-40 | Synchronous download on first `require` | DS-003 global setup | None |
| Investigation triage | `investigation-notes.md` T-01..T-56 | Per-item causes | Per-item changes below | U-01..U-03 |

## Intended Change

Fix every `Keep` and `Run first` item in the triage at its cause. Add one shared type-gate runner, used by the web gate and by a new server test check. Remove the unused transcription URL and `@nuxtjs/apollo`. Make the Electron binary present before workers start.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-006. Areas changed:
  - the web gate and its baseline;
  - a new shared gate under root `scripts/typecheck-gate/`;
  - the server `typecheck` script, a new tests config and baseline;
  - the Electron vitest config;
  - web/Electron server-URL config and types;
  - `autobyteus-web/package.json` and the lockfile;
  - the server, web and core test files named in the triage;
  - browser probes (output dir; PMU-021, E-005, and any run-first failures);
  - `autobyteus-server-ts/docs/modules/agent_execution.md` L716;
  - `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` L33 (a type-only cast, T-57);
  - TESTING.md (the server typecheck row).
- **Derived consumers:** `typecheck-baseline.json` (web) is read only by the web gate; the new server baseline only by the server gate. The removed `urls.transcription` field is read by nothing (T-04; implementation confirms by grep and type check). `ServerStatus` types change for the web and Electron together.
- **Deliberately left alone:**
  - the items dropped in the triage;
  - repairing stale gated suites beyond the listed ones (they enter the server baseline; FU-001);
  - the other web baseline areas (FU-002);
  - `autobyteus-ts` test type-checking (FU-003);
  - CI (autobyteus-65);
  - AGY discovery tolerance;
  - `FileExplorerStreamingService` logging (DEC-012).
- **Follow-ups:** FU-001, FU-002, FU-003 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001 / AC-001 | `pnpm -C autobyteus-web typecheck` | 3 tests excluded | Checked in a fourth project | DS-001 |
| BEH-002 | Operational | REQ-002 / AC-002 | Same | 298 baseline | ≤ 102 | DS-001 |
| BEH-003 | System | REQ-003, REQ-004 / AC-003, AC-004 | App start; install | Unused URL, unused dependency | Removed | DS-004 |
| BEH-004 | Operational | REQ-005 / AC-005 | `test:electron` | Workers race the download | Global setup installs once | DS-003 |
| BEH-005, BEH-007, BEH-009 | Operational | REQ-006..REQ-008, REQ-011, REQ-013 / AC-006..AC-008, AC-011, AC-013 | vitest runs | Stale or timing-dependent tests | Repaired per item (Per-Item Design) | — (test files) |
| BEH-006 | Operational | REQ-010 / AC-010 | `pnpm -C autobyteus-server-ts typecheck` | `src` only | `src` + tests with baseline | DS-002 |
| BEH-008 | Operational | REQ-009, REQ-014 / AC-009, AC-014 | Probes, tests | Deletes evidence; temp residue | Refuse non-empty dir; cleanup | DS-005 |
| BEH-010 | Operational | REQ-012 / AC-012 | Probe and e2e full runs | Reported failing weeks ago | Run first, fix causes | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/SD-01-server-tests-typecheck-build-policy.txt` | Starting error list | REQ-010, REQ-006 | The initial server baseline must equal this list minus the repaired files (implementation regenerates it) | Evidence |
| `evidence/SD-02-web-cross-package-project.txt` | Starting errors of the three tests | REQ-001 | The four errors to fix or avoid by options | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - Repeated coordination (Principle 13): a second type gate (server) would repeat the web gate's runner and rules. The one-off `tsconfig.claude-interrupt-resume-e2e.json` is a partial copy of the same idea.
  - Legacy cleanup (Principle 8): the one-off config, the unused URL and the unused dependency.

  Triggers that don't fire:
  - Authoritative boundary: no caller reaches into gate internals.
  - Persisted-data transition: no stored data.
- Root cause classification: `Duplicated Policy Or Coordination` for the gate; the test items are stale tests left behind by intended product changes (no product design issue).
- Refactor needed now: `Yes` (the gate runner moves to one shared owner before the server uses it).
- Evidence: `typecheckGate.mjs` is package-agnostic except the test-file rule; root `scripts/` already hosts shared workspace tooling.
- Design response: `scripts/typecheck-gate/` owns the rules and the runner; each package keeps only its configuration (projects, baseline path, test-file rule, heap).
- Refactor rationale: one gate policy (fail closed, production 0, shrink-only baseline) in one place. Two copies would drift.
- Intentional deferrals and residual risk: the other stale gated suites stay in the server baseline (FU-001). The baseline stops them growing; it does not repair them.

## Terminology

- *Gate*: a type check that fails closed and holds test files to a shrink-only baseline.
- *Build policy*: the server's `tsconfig.build.json` compiler options.
- *Cross-package tests*: web tests that import server code to compare the two sides.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope:
  - `autobyteus-web/scripts/lib/typecheckGate.mjs` (moved);
  - `autobyteus-server-ts/tsconfig.claude-interrupt-resume-e2e.json` and its script;
  - the transcription URL chain;
  - `@nuxtjs/apollo`;
  - the stale `@ts-expect-error` and `exists` helper;
  - the three cross-package excludes from the Nuxt app's type check (they move to their own project).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored data changes; the transcription URL is runtime config.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | `pnpm -C autobyteus-web typecheck` | PASS/FAIL, optional baseline write | Shared gate runner | Web gate incl. the new cross-package project |
| DS-002 | Primary End-to-End | BEH-006 | `pnpm -C autobyteus-server-ts typecheck` | PASS/FAIL | Shared gate runner | Server src + tests |
| DS-003 | Primary End-to-End | BEH-004 | `pnpm -C autobyteus-web test:electron` | Workers run with the binary present | Electron vitest global setup | Removes the race |
| DS-004 | Primary End-to-End | BEH-003 | App start (web or Electron) | Server URLs known to the store | Existing config owners | Removal only |
| DS-005 | Bounded Local | BEH-008 | Probe start with `--output-dir` | Evidence written or refusal | Shared probe output-dir helper | No evidence lost |

## Primary Execution Spine(s)

- DS-001: `package script -> autobyteus-web/scripts/typecheck.mjs (config) -> scripts/typecheck-gate runner -> compilers (Nuxt app, Electron main, build scripts, cross-package tests) -> rules (parse, attribute, compare with baseline) -> exit code / baseline write`
- DS-002: `package script -> autobyteus-server-ts/scripts/typecheck.mjs (config) -> scripts/typecheck-gate runner -> compilers (src: tsconfig.build.json; tests: tsconfig.tests.json) -> rules -> exit code / baseline write`
- DS-003: `vitest (electron/vitest.config.ts) -> globalSetup (once, main process) -> require('electron') downloads if missing -> workers start`
- DS-005: `probe main -> prepareOutputDir(dir) -> refuse if non-empty, else create -> probe cases write evidence`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The web package script passes its projects, baseline path, test-file rule and heap to the shared runner. The runner runs each compiler, parses and attributes diagnostics, and fails on production errors, unattributed output, growth or an unshrunk baseline. `--update-baseline` shrinks only | config, runner, compilers, rules | Shared runner | Logging |
| DS-002 | Same runner, server config: the build-policy `src` project and a tests project that extends the build policy with `rootDir: ".."` (tests import `../test-support`) and `include: ["src", "tests"]` | config, runner, compilers, rules | Shared runner | — |
| DS-003 | Vitest runs `globalSetup` once in the main process before workers; it requires `electron`, which downloads the binary if missing; then workers start and find it | global setup, electron loader | Electron vitest config | — |
| DS-005 | Every probe that takes `--output-dir` calls one helper. The helper refuses a non-empty directory with a message and a non-zero exit, otherwise creates it. Without `--output-dir`, the default is a fresh per-run folder `test-results/<name>-<UTC timestamp>` (R-1) | helper | Probe fixture helpers | — |

## File Classification Rule (both gates; SR-002, AR-001)

- Each gate attributes every diagnostic by the file's path relative to its own package root (`toPackagePath`, unchanged).
- A file is a test file only by that package's own rule. The rule is defined in the package's `scripts/typecheck.mjs` (R-2), never in `scripts/typecheck-gate/`:
  - web: the existing rule (`__tests__/`, `.spec.ts`, `.test.ts`, `tests/`, `test-support/`);
  - server: `tests/` and `../test-support/`.
- Every other file a checked project reaches is production and must have 0 errors. That includes another package's source reached through an import:
  - web cross-package project: `../autobyteus-server-ts/src/**` and `../autobyteus-server-ts/tests/fixtures/**`;
  - server tests project: `../autobyteus-ts/src/**` reached by the shared `test-support/` files (`test-vault/*` and `live-e2e/live-e2e-harness.ts`, which imports `autobyteus-ts/src/index.js`).

  An error there is a real error in the code being compiled together, so the gate fails. Baselining another package's source would hide it. The fix goes at the import (go through the package's build) or in that source.
- Day-one state (measured, SD-01 and SD-02): server — one out-of-package error, `../autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` (33,7), removed by T-57 below (measured: 0 production errors and 1,327 test-file errors with T-10 and T-57 applied); web — the four SD-02 errors, removed by the aligned options and T-01.

## Spine Actors / Main-Line Nodes

Gate runner; per-package gate config; compilers; Electron global setup; probe output-dir helper.

## Ownership Map

- **`scripts/typecheck-gate/typecheck-gate-rules.mjs`** owns the rules: parsing, path attribution, counting, compare, shrink, reading the baseline. This is the moved `typecheckGate.mjs`, with `isTestFile` given by the caller.
- **`scripts/typecheck-gate/run-typecheck-gate.mjs`** owns the sequence: running projects, failing closed, the report and exit code, and the baseline write. These are the moved `runProject`/`main` from `autobyteus-web/scripts/typecheck.mjs`. It exports `runTypecheckGate({ packageRoot, baselinePath, projects, isTestFile, updateBaseline })` and returns an exit code.
- **`autobyteus-web/scripts/typecheck.mjs`** and **`autobyteus-server-ts/scripts/typecheck.mjs`** own only their package's configuration: projects (name, compiler module, config, heap), baseline path, test-file rule. They hold no gate rules.
- **`electron/vitest.global-setup.ts`** owns "the binary exists before workers".
- **`tests/e2e/fixtures/probe-output-dir.mjs`** (web) owns output-dir admission for probes.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Per-package `scripts/typecheck.mjs` | `run-typecheck-gate.mjs` | Package-specific projects and baseline | Any gate rule (attribution, compare, exit policy) |

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/scripts/lib/typecheckGate.mjs` | Moved | `scripts/typecheck-gate/typecheck-gate-rules.mjs` | Its spec moves with it (see file mapping) |
| `runProject`/`main` in `autobyteus-web/scripts/typecheck.mjs` | Moved | `run-typecheck-gate.mjs` | The web script keeps PROJECTS and the heap rationale comment |
| `autobyteus-server-ts/tsconfig.claude-interrupt-resume-e2e.json`, `package.json` `typecheck:claude-interrupt-resume-e2e`, the header line L9 of that test | The tests project covers the file | `tsconfig.tests.json` via `typecheck` | Header points to `pnpm -C autobyteus-server-ts typecheck` |
| Cross-package excludes in `nuxt.config.ts` L239-241 | Not removed from the Nuxt app project; the comment states they are checked in their own project | `autobyteus-web/tsconfig.cross-package-tests.json` | They must stay out of the Nuxt app project (its options differ) |
| Transcription URL chain (T-04 list) | Dead: no reader; the server has no route (294 FU-009) | — | Implementation proves "no reader" by grep and the type check after removal |
| `@nuxtjs/apollo` (package.json L164, lockfile) | Dead: not a module, no import | — | Also the `@ts-expect-error` in `providerSettingsApolloContract.spec.ts` L1 (TS2578 baselined) |
| `exists` in `raw-trace-manifest-runtime-names-startup.e2e.test.ts` L50 | Dead: unused | — | |
| `rm(outputDir, …)` in the 5 probes | Replaced by refusal | Probe output-dir helper | |

## Return Or Event Spine(s)

N/A — synchronous tooling.

## Bounded Local / Internal Spines

N/A beyond DS-005.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Heap limit per project | DS-001, DS-002 | Runner | `--max-old-space-size` per project config (web Nuxt 4096 MB as today; server tests: measured by implementation, recorded with the same kind of comment) | macOS runners have ~7 GB | A crash read as failure |

## Ownership Boundaries

The runner is the only owner of gate policy; package scripts configure it. The Electron global setup is the only place that prepares the binary. Probes call the output-dir helper; none decides deletion itself.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `runTypecheckGate` | rules module, compiler spawn | package `typecheck.mjs` scripts | A package script importing the rules to apply its own exit policy | Add a config field to the runner |

## Dependency Rules

- Package scripts may import `../../scripts/typecheck-gate/run-typecheck-gate.mjs`. Only the runner and its spec import the rules module. The runner imports no package code.
- The compilers are resolved from the calling package (`createRequire` at `packageRoot`), so each package keeps its pinned TypeScript and vue-tsc.
- Web cross-package tests may import server `src` and `tests/fixtures`. Nothing else in web may (unchanged; `guard:web-boundary`).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `runTypecheckGate({ packageRoot, baselinePath, projects, isTestFile, updateBaseline })` | One package's gate run | Run, judge, report, optionally shrink | Absolute `packageRoot`; `projects: { name, compiler, config, heapMb? }[]` | Returns the exit code |
| `pnpm -C autobyteus-server-ts typecheck` / `typecheck:update-baseline` | Server gate | As web | — | `pretypecheck` stays (`prepare:shared`) |
| `prepareOutputDir(dir)` | Probe evidence dir | Refuse non-empty, else create | Absolute or cwd-relative path | Clear message naming the dir |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `runTypecheckGate` | Yes | Yes | Low | — |
| `prepareOutputDir` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Type gate | `typecheck-gate` (folder), `runTypecheckGate` | Yes | Yes (TESTING.md "Web typecheck", "Server typecheck") | Low | — |
| Cross-package tests project | `tsconfig.cross-package-tests.json`, gate label "cross-package tests" | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Gate policy for the server | Web gate | Extend (move to root, share) | Same rules |
| Shared workspace tooling location | Root `scripts/` (`workspace-package-roots.mjs`) | Reuse | Established pattern |
| Probe helpers | `autobyteus-web/tests/e2e/fixtures/` (TESTING.md L311-312) | Reuse | Shared fixture helpers live there |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| Root `scripts/typecheck-gate/` | Gate rules and runner | DS-001, DS-002 | Create New (moved code) |
| `autobyteus-web` scripts and config | Web gate config, cross-package project | DS-001 | Extend |
| `autobyteus-server-ts` scripts and config | Server gate config, tests project, baseline | DS-002 | Extend |
| `autobyteus-web/electron` | Global setup | DS-003 | Extend |
| `autobyteus-web/tests/e2e/fixtures` | Output-dir helper | DS-005 | Extend |

## Draft File Responsibility Mapping

Same as the final mapping below; no further extraction was needed beyond the gate and the probe helper.

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Gate rules and runner | `scripts/typecheck-gate/*` | Workspace tooling | Two packages | Yes | Yes | A place for package-specific projects |
| Output-dir admission | `tests/e2e/fixtures/probe-output-dir.mjs` | Web probes | 5+ probes | Yes | Yes | A general probe framework |

The scripted-AGY helpers were not extracted (DEC-005).

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| Project config `{ name, compiler, config, heapMb? }` | Yes | Yes | Low | — |
| Baseline JSON `{ [packagePath]: count }` | Yes | Yes | Low | Server baseline uses the same shape |

## Final File Responsibility Mapping

| File | Area | Owner | Concern |
| --- | --- | --- | --- |
| `scripts/typecheck-gate/typecheck-gate-rules.mjs` | Workspace tooling | Rules | Parse, attribute, count (with the caller's `isTestFile`), compare, shrink, read baseline (from `typecheckGate.mjs`). It holds no test-file rule (R-2) |
| `scripts/typecheck-gate/run-typecheck-gate.mjs` | Workspace tooling | Runner | Spawn compilers, fail closed, report, exit code, baseline write |
| `autobyteus-web/scripts/typecheck.mjs` | Web | Config | PROJECTS (+ "cross-package tests": vue-tsc, `tsconfig.cross-package-tests.json`), baseline path, the web's `isTestFile` (moved here from `typecheckGate.mjs`) |
| `autobyteus-web/tsconfig.cross-package-tests.json` | Web | Project | Extends `./tsconfig.json`; `include`: `.nuxt/nuxt.d.ts`, `types/**/*.d.ts`, the three tests; `exclude: []`; options aligned with the server build where the packages differ: `noImplicitOverride: false`, `verbatimModuleSyntax: false`, `experimentalDecorators`, `emitDecoratorMetadata` (SD-02) |
| `autobyteus-server-ts/scripts/typecheck.mjs` | Server | Config | Projects: "server src" (`tsc`, `tsconfig.build.json`), "server tests" (`tsc`, `tsconfig.tests.json`, heap from measurement); baseline `typecheck-baseline.json`; test-file rule: `tests/` and `../test-support/` |
| `autobyteus-server-ts/tsconfig.tests.json` | Server | Project | Extends `./tsconfig.build.json`; `rootDir: ".."`, `noEmit`, `declaration: false`, `include: ["src", "tests"]` |
| `autobyteus-server-ts/typecheck-baseline.json` | Server | Baseline | Generated by `typecheck:update-baseline` after the repairs; equal to SD-01 minus the repaired files |
| `autobyteus-server-ts/package.json` | Server | Scripts | `typecheck` → `node ./scripts/typecheck.mjs`; `typecheck:update-baseline`; one-off removed |
| `autobyteus-web/electron/vitest.global-setup.ts` + `electron/vitest.config.ts` `globalSetup` | Web/Electron | Setup | `createRequire(import.meta.url)('electron')` once |
| `autobyteus-web/tests/e2e/fixtures/probe-output-dir.mjs` | Web probes | Helper | `prepareOutputDir` |
| Test files per item | Owners per file | — | Per-Item Design below |

## Applied Patterns

None beyond configuration over a shared runner.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/typecheck-gate/` | Folder | Workspace tooling | Gate rules and runner | Shared by two packages; root `scripts/` hosts workspace tooling | Package projects or baselines |
| `autobyteus-web/scripts/__tests__/typecheckGate.spec.ts` | File (kept) | Workspace tooling | The rules' unit tests, importing the moved module, plus the runner's fail-closed paths (R-4): a fake compiler that cannot start, ends by a signal, prints an unattributed error line, or exits non-zero without a diagnostic, each giving a non-zero exit; and an out-of-package production file failing the gate | `test:nuxt` runs it today (`vitest.config.mts` has no `include`, so the default `**/*.spec.ts` applies); the root has no vitest runner. The same pattern as `workspace-package-roots.test.mjs` | — |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `scripts/typecheck-gate/` | Off-Spine Concern (tooling) | Yes | Low | Two files, one concern |

## Per-Item Design (test files)

| Item | Change |
| --- | --- |
| T-01 | Fix `recorded-upload-labels.ts` L37, L41 so the fixture builds the replay event type its consumer takes (read the two types; convert or type the fixture correctly, no cast that hides a real mismatch). Remove `memberTeamContext` from the Codex projection test L66 (the field left `AgentRunConfig`; check what the test meant it for and use the current owner if it still matters) |
| T-03 | Fix the test-file errors under `components/`, `services/`, `stores/` in the web baseline, then `typecheck:update-baseline`. Type the mocks and fixtures; no `any`/`@ts-expect-error` to silence an error, except where the test deliberately passes a wrong type (then `@ts-expect-error` with the reason) |
| T-04 | Remove the chain listed in investigation T-04; specs and probes drop the field |
| T-06 | DS-003 |
| T-07 | `real-e2e-provider-capabilities` L223-225 → `beginStreamingSession({ resolveOptions }).open()` and `requestClose()`, as `claude-sdk-client.integration.test.ts` L69 does |
| T-10 | Close the import block correctly; check that the 8 importing files load (`vitest run <file>` without the gate → skipped, no load error) |
| T-11 | Pass the current `plan` input to `AgentOrgRunPlanner.build` (read the planner's signature; build the plan the way production callers do) |
| T-12 | Per DEC-010: assert that an undeclared key is left out of the saved config; keep the refusal case with an input still refused (a non-object `llmConfig`: "Model configuration must be null or an object.", `src/llm-management/services/model-config-schema-validation.ts` L123) and its "tree file unchanged" check |
| T-13 | `'AUTOBYTEUS'` → `'autobyteus'` (web L1040, L1047; server L142, L253) |
| T-15, T-18, T-08, T-14 | Text: RS-07/RS-08 lines in the header; title "… delegation with an address always creates one"; docs L716 → `beginStreamingSession({ resolveOptions }).open()` / `requestClose()`; remove `exists` |
| T-16, T-44 | Replace `prepareNewAgentRun` with `beginActivation({ kind: "new", runId, config }).prepare()` and publish, as `tests/integration/agent-execution/agent-run-manager.integration.test.ts` L138 does; fix the TS2554 arity errors to the current signatures |
| T-41, T-42 | Port to the current backend factory and client lease (`beginAcquire(cwd)`), `CodexThread` API; choose the model from the live catalog with an env override, default per TESTING.md L147 (`gpt-6.1-terra`) |
| T-46 | Write retained-task's files under the task agent's own-run folder (`agents/<agentRunId>`, `src/context-files/store/context-file-layout.ts` L67). Find the cause of the second failure (U-02) and fix the test if stale. A product defect is a follow-up |
| T-54 | Find the LM Studio model the current way (the server's dynamic model sources, or `LMSTUDIO_MODEL_ID` with a clear skip message when unset); update the doubles (`hasEffectiveSkills`, `createAgentRun` → current API); same lookup fix in `token-usage-runtime-graphql.e2e` and `autobyteus-team-runtime-graphql.e2e` |
| T-28 sig. 2 (SR-003, SR-004) | Measure both ends of each idle-shutdown window from the scripted AGY CLI's own clock, not from WebSocket frame receive times. The server records no shutdown time (implementation, 2026-11-01), and a product timestamp is rejected as a contract change for a test. The quiet copy's process stays alive while idle (test L366), so the server's SIGTERM is the shutdown moment.<br>**Fixture (`tests/fixtures/agy-failure-cli.mjs`; AR-002):**<br>• The lifecycle log (`launch`, `sigterm`, `exit`, plus the new `turn_end` and `background_exit`) is gated by `AGY_FAKE_PROCESS_LOG` alone, in every case, not only inside `interrupt_resend` (today L46-57).<br>• A SIGTERM handler is installed only when that log is set, or in `interrupt_resend`. Outside `interrupt_resend` it logs `sigterm`, removes itself and re-raises SIGTERM (`process.kill(process.pid, "SIGTERM")`), so the process ends by the signal at once, exactly as with Node's default today: no delay and no change to what the server observes. The 36 `linked_skills` files that do not set the variable get no handler at all.<br>• `AGY_FAKE_SIGTERM_EXIT_DELAY_MS` stays specific to `interrupt_resend`.<br>**Recording order (AR-003 (1)):** `turn_end` takes `at = Date.now()` and appends its log line **before** the fixture writes the turn's final `result` line to stdout. `background_exit` does the same **before** it writes the background exit message file (L137-150). So no server observation of either event can precede the logged time.<br>**Test (`task-copy-idle-lifetime.e2e.test.ts`):**<br>• Set `AGY_FAKE_PROCESS_LOG` to a test-owned file in the run root; save and restore it with the other variables (L195).<br>• Window = `sigterm.at − start.at` for the same conversation: `start` is the quiet copy's last `turn_end`, or the background copy's `background_exit`.<br>• Bounds: lower `GRACE_MS − 250 ms`, upper `GRACE_MS + 15 s` (unchanged).<br>• Frame-based signals stay for ordering and the user-visible offline status, but no longer feed the window arithmetic.<br>**Why 250 ms (AR-003 (2)):** the server's grace timer can fire early by up to one event-loop tick (libuv arms timers from its cached loop time), and both ends are whole-millisecond `Date.now()` values from two processes. Under load those add up to tens of ms. 250 ms covers several times that, but is still well under one second: it is 4× tighter than today's `GRACE_MS − 1 s` and could not hide a real early shutdown, which would be off by seconds, not milliseconds.<br>Test and fixture only; no product change |
| T-30 | `waitForCondition` default: a deadline that fits a full parallel suite (the server's usual 10 s eventual-wait), keeping the 10 ms poll |
| T-37 | Mask `output_throughput.method` in `normalize` (snapshot shows `<method>`); or a fake `now` for the golden run. Implementation picks the one that keeps the snapshot readable |
| T-47 | `vi.useFakeTimers()` driving the debounce; remove the real `sleep` waits |
| T-53 | Explicit timeout (for example 30 s) with a comment: the case proves no memory-dir resolution at import, not import speed |
| T-27 | Measure with a run-owned `TMPDIR` before/after; add teardown removal to the tests that leave folders |
| T-09 | U-01: run the full `test:integration` with the watcher timing log enabled; record per-event latency; derive the wait from it, or report a lost event as a product defect |
| T-33..T-36, T-25 | Run first; fix causes; E-005 per DEC-007; PMU-021 per DEC-012 (the probe ignores console errors from its own `page.reload()` until the next `load`) |
| T-52 | 10 consecutive scripted runs; act on the cause if reproduced |
| T-50 | DS-005 in the 5 probes and any other probe that deletes its output dir (grep `rm(` / `rmSync(` on output dirs). The default (when `--output-dir` is not passed) becomes a fresh per-run folder, `test-results/<name>-<UTC timestamp>`, so the package script can run again without removing anything. An explicitly passed non-empty dir is refused with a message that names it and says to pass a fresh `--output-dir` (R-1) |
| T-57 (AR-001) | `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` L33: `}) as ReturnType<typeof fetch>)` → `}) as unknown as ReturnType<typeof fetch>)`. This is type-only: the line already casts undici's `Response` to the global fetch type, and going through `unknown` makes the cast valid under both the server's default `lib` (DOM `Response`) and `autobyteus-ts`'s `lib: ["ESNext"]`. No runtime change. Why here and not at an import: the file is reached through `test-support/live-e2e/live-e2e-harness.ts`, which imports `autobyteus-ts/src/index.js` (the whole source graph), so rerouting one test's import cannot remove it (`tsc --explainFiles`, investigation T-57). Measured: server tests project 0 production errors; `autobyteus-ts` build 0 errors before and after |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Package gate config | `process.exitCode = await runTypecheckGate({ packageRoot, baselinePath, projects: [...], isTestFile, updateBaseline })` | A copy of `runProject`/`main` in the server | One policy |
| Silencing | Typing a mock with the real interface (`vi.mocked<…>`) | `as any` to reach zero | The baseline counts real errors |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `autobyteus-web/scripts/lib/typecheckGate.mjs` as a re-export | Smaller diff | Rejected | Callers import the new path |
| Keep the one-off server config | It works | Rejected | The tests project |
| Keep reading `urls.transcription` as optional | Avoid touching types | Rejected | Removed everywhere |

## Change / Refactor Sequence

1. T-10: fix the harness import, so the server type check can run. T-57: the type-only cast correction in `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` L33, so the server gate has no production error.
2. Move the gate to `scripts/typecheck-gate/`, rewire the web script, and run the web gate (PASS, 298) and its spec.
3. Add the cross-package project and fix the T-01 errors; the web gate passes at 298.
4. Add the server gate and tests project; generate its baseline (about 1,327 measured under the tests project). The gate passes with 0 production errors (`src` and every out-of-package file, after T-57). Remove the one-off.
5. Repair the server test items (T-07, T-11, T-12, T-16/T-44, T-41, T-42, T-46, T-54 and the text items). Shrink the server baseline after each group.
6. Do the web items: T-04, T-05, T-13 and the baseline burn-down (T-03), shrinking the web baseline.
7. Electron global setup (T-06); probe helper (T-50); timing items; temp cleanup.
8. Run-first items: probes, AE-006 (full server e2e), T-09, T-52.
9. Update TESTING.md: the Server typecheck row now covers tests with a baseline, plus the update command. Commit it on its own as `docs(testing): …`.
10. Merge the latest `origin/personal`; re-run both gates and shrink if needed (R-02).

## Key Tradeoffs

- **Baseline, not repair-all, for server tests:** about 1,300 errors are too many for this round. The baseline stops growth now, and the listed suites are repaired.
- **Gate in root `scripts/`:** shared by both packages, at the cost of a cross-package import path. That path is the established pattern.

## Risks

- R-01 (parallel teams) and R-02 (baseline drift on merge): re-run the gates after each merge.
- R-3 (cross-package coupling): the web gate, which runs inside `build:electron*`, type-checks server `src` and fixture files through the cross-package project. It uses the web options, aligned with the server build in `autobyteus-web/tsconfig.cross-package-tests.json` (`noImplicitOverride: false`, `verbatimModuleSyntax: false`, decorators). A future server change that is clean under the server build but not under those options fails the web gate and the desktop build. Accepted (DEC-004): the fix is to align one more option in that file, or correct the server code.
- The server tests project's heap is unmeasured; implementation measures it and sets `heapMb` with a comment, as the web did.
- Run-first items may reveal product defects; those become follow-ups, not silent changes.

## Guidance For Implementation

- Reproduction to start from:
  - T-11: `pnpm -C autobyteus-server-ts exec vitest run tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts --no-watch`
  - T-12: `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts --no-watch`
  - T-46: the same, with `RUN_CONTEXT_FILE_PROCESS_E2E=1`
  - the type-check lists in SD-01/SD-02.
- No live paid suite runs (investigation notes list them). LM Studio (T-54) is local: one run at a time, a small model, and unload any model you loaded.
- Use only test data, test-owned roots and the resolved temp `HOME`; never `~/.autobyteus`.
- Commit baseline fixes of failing tests as their own labelled commits (TESTING.md Rule 9).
- Keep to this ticket's files; on merge conflicts with 345/357/358/285/337/355, keep their changes and re-apply ours.
