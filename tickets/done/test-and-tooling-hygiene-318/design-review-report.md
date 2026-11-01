# Design Review Report — autobyteus-318 (test and tooling hygiene, round 2)

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-001, Approved by the Solution Designer within the direction; user informed 2026-11-01)
- Upstream Investigation Notes: `investigation-notes.md` (triage T-01..T-56)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001)
- Reviewed Design Spec: `design-spec.md` (SR-001, `Ready`; user design approval `Not required`)
- Supplemental Task Artifacts Reviewed: `evidence/SD-01-server-tests-typecheck-build-policy.txt`, `evidence/SD-02-web-cross-package-project.txt`, `follow-ups.md` (FU-001..FU-003)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Round 4 trigger: SR-004 (T-28 sig. 2 only), answering ARCH-REV-003.
- Round 4 reads: `design-spec.md` Per-Item T-28 sig. 2 (SR-003, SR-004); `solution-revision-record.md` SR-004; `task-copy-idle-lifetime.e2e.test.ts` L360-366 (the quiet copy's process is live while idle).
- Round 3 trigger: SR-003 (T-28 signature 2 only), after the implementation's anticipated Design Impact; implementation at HEAD `351265ce41`.
- Round 3 reads:
  - `design-spec.md` Per-Item T-28 sig. 2 (SR-003);
  - `requirements-doc.md` REQ-008 / AC-008;
  - `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` L50-64, L194-197, L369-435;
  - `tests/fixtures/agy-failure-cli.mjs` L37-57 and L130-152;
  - the users of `AGY_FAKE_PROCESS_LOG` and `linked_skills` (`git grep`).
- Round 2 (prior):
- Trigger: SR-002 re-review request from the Solution Designer (handoff § Round 2), 2026-11-01
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Round 2 reads: `design-spec.md` § File Classification Rule, DS-005, File Responsibility Mapping (R-2, R-4), Per-Item T-50 and T-57, Change Scope, sequence steps 1 and 4, Risks R-3; `investigation-notes.md` T-57; `test-support/live-e2e/live-e2e-harness.ts` L14-16 (imports `../../autobyteus-ts/src/index.js`, confirming the second path to `local-long-running-fetch.ts`).
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318` at `efd28d5c4a` (no tracked changes). Files opened by the reviewer:
  - `autobyteus-server-ts/package.json` L9-23, `tsconfig.json`, `tsconfig.build.json`, `tsconfig.claude-interrupt-resume-e2e.json`;
  - `autobyteus-web/scripts/lib/typecheckGate.mjs` L1-70 (`toPackagePath`, `parseCompilerOutput`, `isTestFile`) and `scripts/typecheck.mjs` (imports, paths);
  - `autobyteus-web/node_modules/electron/index.js` L1-45; `autobyteus-web/electron/vitest.config.ts`;
  - `TESTING.md` L305-317;
  - the five probes' `outputDir` and `fs.rm` lines;
  - `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` L25-36 and `autobyteus-ts/tsconfig.json` (`lib`);
  - `git grep "autobyteus-ts/src"` in server tests and `test-support`;
  - SD-01 (error lines by area, and every line outside `tests/` and `../test-support/`) and SD-02 (all lines).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `Low`
- Classification rationale reviewed: wide test-file payload plus structural tooling changes: a shared gate runner moved to the root, a new server gate, and the Electron test setup. There is no runtime owner, API, persistence, security or concurrency change.
  - The web gate runs inside `build:electron*`, so the move touches the release build's code path, but its contract (rules and exit behaviour) is unchanged and proven by the gate run and the rules spec. `Low` is acceptable.
- Independent Architecture Review required by the classification: `Yes` (`Large`)
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - Fix or drop every triaged item with evidence.
  - Add a server test type check under the build policy, with a shrink-only baseline, fail-closed, and production at 0.
  - Type-check the three web cross-package tests.
  - Burn down three web baseline areas.
  - Remove the transcription URL and `@nuxtjs/apollo`.
  - Install the Electron binary before workers start.
  - Probes refuse a non-empty output dir.
- Relevant existing behavior and evidence confirmed: Yes. The web gate's parser and rules are package-agnostic except `isTestFile`. The Electron loader downloads synchronously on the first `require` when `dist/` is missing. The 5 probes `fs.rm` their output dir.
- Scope guardrail confirmed: Yes (in-scope UC-001..UC-006; out-of-scope dropped items, FU-001..FU-003, CI, live paid suites).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes (AR-001 → REQ-010 / AC-010 / QR-001).
- Remaining material ambiguity: none (the File Classification Rule settles out-of-package files for both gates).
- Statements about existing code checked at their cited lines:
  - "Under the build policy the tests have 1,316 errors and `src` has 0" (SD-01). True for server `src`. SD-01 also has one error in `../autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` (33,7), which the design does not mention (AR-001).
  - "Rules are package-agnostic except `isTestFile`" (true).
  - `electron/index.js` L7-40 (true).
  - `TESTING.md` L313 "existing evidence is never overwritten" (true).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass (aligned options remove SD-02's server `src` error; the fixture errors are fixed by T-01) | Confirmed | — |
| BEH-002 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-005, 009, 010 | Operational | Pass | Pass | Pass (per-item design; investigation-first items have escalation) | Confirmed | — |
| BEH-007 | Operational | Pass | Pass | Pass (T-28 sig. 2: the log is gated by `AGY_FAKE_PROCESS_LOG`; the start is recorded before the observable write; lower bound `GRACE_MS − 250 ms` with a stated reason) | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass (File Classification Rule; T-57 clears the one out-of-package error; measured 0 production, 1,327 test errors) | Confirmed | — |
| BEH-008 | Operational | Pass | Pass | Pass (fresh per-run default dir; explicit non-empty dir refused, R-1) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked | Internally Complete | Consistent | Status Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-01` | Pass | Pass | Pass | Pass (the out-of-package error is named and handled by T-57) | Pass | — |
| `evidence/SD-02` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination` for the gate (a second gate would copy the runner); test items are stale tests | — |
| Refactor decision explicit | Pass | `Yes`: move the runner to one shared owner | — |
| Refactor decision supported by design sections | Pass | Ownership Map, Boundary Encapsulation Map, Removal Plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner Per Node | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary (web gate) | Pass | Pass | Pass (package script = config facade; runner = owner) | Pass | Pass | Pass | Pass |
| DS-002 | Primary (server gate) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary (Electron setup) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Primary (URL removal) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local (probe dir) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runTypecheckGate` | Pass | Pass (only the runner and its spec import the rules) | Pass | Pass | |
| `prepareOutputDir` | Pass | Pass | Pass | Pass | no probe decides deletion itself |
| Electron global setup | Pass | Pass | Pass | Pass | |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| package scripts → root runner | Pass | Pass | Pass | Pass | compilers resolved from `packageRoot`, so each package keeps its pinned TypeScript / vue-tsc |
| web cross-package tests → server `src`, `tests/fixtures` | Pass | Pass | Pass | Pass | `guard:web-boundary` unchanged for everything else |
| server tests / `test-support` → `autobyteus-ts/src` (relative imports) | Pass | Pass | Pass | Pass | reached files are production by the stated rule; fixes go at the import or in that source |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `runTypecheckGate({ packageRoot, baselinePath, projects, isTestFile, updateBaseline })` | Pass | Pass | Pass | Low | Pass |
| `prepareOutputDir(dir)` | Pass | Pass | Pass | Low | Pass |
| server `typecheck` / `typecheck:update-baseline` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Gate policy for the server | Pass | Pass | Pass (moved, not new) | Pass | |
| Shared tooling location | Pass | Pass | N/A | Pass | root `scripts/` already hosts `workspace-package-roots.mjs` |
| Probe helpers | Pass | Pass | Pass | Pass | `tests/e2e/fixtures/` per TESTING.md |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation | Decision | Supports Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| root `scripts/typecheck-gate/` | Pass | Pass | Pass | Pass | must hold no package-specific rule (see R-2) |
| web / server / Electron / probe areas | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Logic | Evaluated | Shared File | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Gate rules and runner | Pass | Pass | Pass | Pass | |
| Output-dir admission | Pass | Pass | Pass | Pass | |
| Scripted-AGY helpers | Pass | N/A | N/A | Pass | not extracted, with reason (DEC-005) |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Project config `{ name, compiler, config, heapMb? }` | Pass | Pass | Pass | N/A | Pass | |
| Baseline JSON `{ [packagePath]: count }` | Pass | Pass | Pass | N/A | Pass | same shape in both packages |

Derived consumers of a changed structure listed with a decision for each: `Pass` (baselines read only by their gate; `urls.transcription` read by nothing; `ServerStatus` changes for the web and Electron together).

One vocabulary: `Pass` (Gate, Build policy, Cross-package tests).

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `typecheck-gate-rules.mjs` | Pass | Pass | Pass (holds no test-file rule, R-2) | Pass | |
| `run-typecheck-gate.mjs` | Pass | Pass | N/A | Pass | |
| per-package `scripts/typecheck.mjs` | Pass | Pass | N/A | Pass | |
| `tsconfig.cross-package-tests.json` | Pass | Pass | N/A | Pass | |
| `autobyteus-server-ts/tsconfig.tests.json` | Pass | Pass | N/A | Pass | |
| `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` L33 (T-57) | Pass | Pass | N/A | Pass | type-only: the line already casts undici's `Response` to the global fetch type; `as unknown as` makes it valid under both `lib` settings; both are declarations of the same runtime class, so nothing real is hidden |
| `electron/vitest.global-setup.ts` | Pass | Pass | N/A | Pass | |
| `probe-output-dir.mjs` | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/typecheck-gate/` | Pass | Pass | Low | Pass | |
| `autobyteus-web/scripts/__tests__/typecheckGate.spec.ts` (kept, imports the moved module) | Pass | Pass | Low | Pass | the root has no vitest runner; the same pattern as `workspace-package-roots.test.mjs` |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/lib/typecheckGate.mjs`, `runProject`/`main` | Pass | Pass | Pass | Pass | no re-export kept |
| one-off `tsconfig.claude-interrupt-resume-e2e.json` + script + header line | Pass | Pass | Pass | Pass | |
| transcription URL chain | Pass | N/A | Pass | Pass | "no reader" is proven by grep and the type check |
| `@nuxtjs/apollo` + stale `@ts-expect-error` | Pass | N/A | Pass | Pass | |
| `exists` helper; probe `fs.rm` | Pass | Pass | Pass | Pass | |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| all | No | Pass | Pass | rejection log covers the re-export, the one-off config, optional `urls.transcription` |

## Persisted-Data Transition Verdict

| Area | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| all | Not Affected | Pass | Pass | N/A | Pass | the URL is runtime config |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1-3, 5-10 | Pass | Pass | Pass | Pass |
| Step 4 (server gate + baseline) | Pass (T-57 in step 1; measured 0 production errors) | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| package gate config, silencing | Yes | Pass | Pass | Pass | |

## Material Premise Validation

None. AR-001 rests on the measured SD-01 output, not on an assumed scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Classification of out-of-package files reached by test imports | REQ-010 / AC-010 day-one pass; QR-001 fail-closed | AR-001 | Resolved (SR-002) |

## Review Decision

`Pass`

## Findings

Blocking: none.

- AR-001 remains resolved (ARCH-REV-002).
- AR-002 is resolved. The lifecycle log is gated by `AGY_FAKE_PROCESS_LOG` alone. Outside `interrupt_resend`, the SIGTERM handler logs, removes itself and re-raises the signal: with no listener left, Node restores the default disposition, so the process ends by the signal as today. The handler exists only when the log is set, so `linked_skills` users without the variable are untouched. The exit delay stays specific to `interrupt_resend`. The test sets and restores the variable.
- AR-003 is resolved. `turn_end` and `background_exit` are recorded before the stdout `result` line and the exit-message file are written. The lower bound is `GRACE_MS − 250 ms`, with the reason stated (one-tick early timer firing and millisecond clock reads). A real early shutdown would be off by seconds.

R-1..R-5 stand.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- The server tests project's heap is unmeasured. The design's escalation trigger (> about 4 GB) covers it.
- The run-first items (U-01..U-03, AE-006, T-52) may reveal product defects. The design routes them as Design Impact or follow-ups.
- Baseline drift on merges with the parallel teams (R-02 in the design): re-run both gates after each merge.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (no assumed-scenario premise)
- Notes: AR-001..AR-003 are resolved. The package is ready for implementation, including:
  - the shared runner and its ownership split;
  - the cross-package project options;
  - the Electron `globalSetup` (main process, before workers);
  - the probe helper;
  - the removal plan;
  - the per-item test repairs.
