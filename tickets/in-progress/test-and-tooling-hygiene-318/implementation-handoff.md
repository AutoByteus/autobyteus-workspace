# Implementation Handoff — autobyteus-318 (test and tooling hygiene)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large); passed ARCH-REV-002 (SR-001, SR-002) and, after this implementation's Design Impact on T-28 signature 2, ARCH-REV-004 (SR-003, SR-004). Handoff rule: "implementation complete, Large or High" → `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/test-and-tooling-hygiene-318/requirements-doc.md`
- Investigation notes: `tickets/in-progress/test-and-tooling-hygiene-318/investigation-notes.md`
- Solution revision record: `tickets/in-progress/test-and-tooling-hygiene-318/solution-revision-record.md` (SR-001..SR-004)
- Design spec: `tickets/in-progress/test-and-tooling-hygiene-318/design-spec.md`
- Supplemental task artifacts: `evidence/SD-01-server-tests-typecheck-build-policy.txt`, `evidence/SD-02-web-cross-package-project.txt`, `follow-ups.md`
- Design review report: `tickets/in-progress/test-and-tooling-hygiene-318/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/test-and-tooling-hygiene-318/architecture-review-revision-record.md` (ARCH-REV-001..004)
- Triggering rework report: N/A (initial implementation; the T-28 Design Impact was resolved upstream as SR-003/SR-004 during this round)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318`, branch `codex/test-and-tooling-hygiene-318`, base `origin/personal` `efd28d5c4a`, finalization target `origin/personal`. All paths below are relative to the worktree.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/test-and-tooling-hygiene-318/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001, SR-002, SR-003, SR-004
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

What the package does:
- **One shared type gate** (`scripts/typecheck-gate/`: rules + fail-closed runner). Each package's `scripts/typecheck.mjs` holds only its projects, baseline path, heap and test-file rule.
- **Web gate** gains a fourth project, the cross-package tests (`tsconfig.cross-package-tests.json`, T-01); their real errors are fixed. The web test baseline falls from 298 to 99 errors in 43 files (T-03: none left in components/services/stores; T-04, T-05 and the T-35 fixture).
- **Server gate** (`pnpm -C autobyteus-server-ts typecheck`) now also type-checks `tests/` and `../test-support/` under the build policy against a shrink-only baseline (REQ-010); the one-off interrupt-resume config is folded in. Repaired and ported server suites shrank it from 1,323 to 1,200 errors in 370 files (after the step-10 merge and its drift fixes).
- **Stale tests repaired** to current APIs (T-10, T-11, T-12, T-46, T-54; paid suites T-07, T-16, T-41, T-42, T-44 ported and load-and-skip); text items (T-08, T-13, T-14, T-15, T-18); T-57 cast.
- **Timing**: T-28 sig. 2 measured on the scripted CLI's clock; T-30, T-53 bounded; T-37 masked; T-47 on fake timers.
- **Tooling**: Electron binary downloaded once before workers (T-06); probes never delete evidence (T-50); tests clean their temp folders (T-27).
- **Run-first items** run in full; stale probe expectations fixed from their cause (T-33..T-36), T-09, T-52, AE-006 — results below.
- TESTING.md typecheck rows updated.
- **Step 10**: merged the latest `origin/personal` (`32b8f5a763`); the server gate then refused growth from merged tests, fixed at the cause (`023aaeefff`); both gates pass on the final HEAD.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` header ("Task size: `Large`", architectural risk `Low`), unchanged by SR-003/SR-004.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change set is wide (190 files across web, server, ts and root tooling) but test, tooling and config only. The one product-adjacent change is runtime-config removal (T-04 transcription URL, unused). No contract, persistence, security or concurrency change; the only shared-structure change is the gate runner's move to root `scripts/`, as designed.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` open. (T-28 sig. 2 Design Impact raised and resolved as SR-003/SR-004 → ARCH-REV-004 pass, implemented here.)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001) | Three cross-package web tests type-checked by the web gate | `autobyteus-web/tsconfig.cross-package-tests.json`, `autobyteus-web/scripts/typecheck.mjs` (4th project, heap 4096), `nuxt.config.ts` comment; fixes in `autobyteus-server-ts/tests/fixtures/recorded-upload-labels.ts` and the Codex projection test | Pass — IMP-05 (before: 3 errors; after: 0; 17 tests pass) |
| BEH-002 (REQ-002) | Web baseline loses components/services/stores; total ≤ 102 | 94 spec files (commit `2fa398db4a`), `autobyteus-web/typecheck-baseline.json` | Pass — IMP-06: 102 errors in 44 files, 0 in the three areas |
| BEH-003 (REQ-003, REQ-004) | Transcription URL and `@nuxtjs/apollo` removed | `0bdcea5325`, `3e735c2995` | Pass — IMP-07 |
| BEH-004 (REQ-005) | Electron binary present before workers | `autobyteus-web/electron/vitest.global-setup.ts`, `electron/vitest.config.ts` | Pass — IMP-08 (one download from a state with no `dist/`) |
| BEH-005 (REQ-006) | Stale server tests repaired / ported | see the per-item table | Pass — IMP-09..IMP-13 |
| BEH-006 (REQ-010) | Server tests type-checked with a shrink-only baseline | `scripts/typecheck-gate/*`, `autobyteus-server-ts/scripts/typecheck.mjs`, `tsconfig.tests.json`, `typecheck-baseline.json`, `package.json` | Pass — IMP-03 (passes day one; a removed API fails it) |
| BEH-007 (REQ-008, REQ-011, REQ-013) | Timing tests bounded by what they prove | T-28 fixture + test; T-30, T-37, T-47, T-53; T-09; T-52 | Pass — IMP-16, IMP-17, IMP-20, IMP-21, IMP-23 |
| BEH-008 (REQ-009, REQ-014) | Probes refuse a non-empty output dir; tests clean temp | `autobyteus-web/tests/e2e/fixtures/probe-output-dir.mjs` + 7 probes (incl. the merged integrations-page probe); ACP harness `makeTestTempDir`/`removeTestTempDirs` + 7 test files | Pass — IMP-15, IMP-18, IMP-24 |
| BEH-009 (REQ-007) | Stale text current | `590bb6359c` | Pass — IMP-14 |
| BEH-010 (REQ-012) | Run-first items green or fixed from cause | probes, full server e2e | Pass after fixes from cause — IMP-19, IMP-22, IMP-24 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Per-Item Disposition (REQ-015)

Kept items (`Keep` / `Run first` in the triage) and how each ended; dropped items carry the investigation's reason. Commits are on `codex/test-and-tooling-hygiene-318`.

| Item | Triage | Disposition | Commit(s) | Evidence |
| --- | --- | --- | --- | --- |
| T-01 | Keep | Done: the three cross-package tests are type-checked in their own web gate project; the fixture's two errors and the stale `memberTeamContext` fixed | `dd47f30810` | IMP-05, IMP-02 |
| T-02 | = T-01 | Done with T-01 | `dd47f30810` | IMP-05 |
| T-03 | Keep (DEC-002) | Done: components/services/stores at 0; web baseline 298 → 102 (→ 99 after T-35) | `2fa398db4a`, `ab0027a398` | IMP-06, IMP-24 |
| T-04 | Keep | Done: transcription URL removed end to end | `0bdcea5325` | IMP-07 |
| T-05 | Keep | Done: `@nuxtjs/apollo` removed with its stale `@ts-expect-error` | `3e735c2995` | IMP-07 |
| T-06 | Keep | Done: Electron vitest globalSetup downloads once | `13590aa2d4` | IMP-08 |
| T-07 | Keep | Done: ported to `beginStreamingSession({ resolveOptions }).open()` / `requestClose()`; loads and skips (paid, DEC-011) | `15b9bedd84` | IMP-13 |
| T-08 | Keep | Done: docs line current | `590bb6359c` | IMP-14 |
| T-09 | Run first (REQ-011) | Ran: watcher test passes 14/14 inside the full `test:integration` twice; per-event latency max 570 ms, median 485 ms (wait 8 s), no late or lost event; nothing to derive or report. The full run's 4 other failures predate this ticket → FU-004 | — (temporary instrumentation, not committed) | IMP-21 |
| T-10 | Keep | Done: import block closed; the 8 users load | `da1ad432dd` | IMP-09 |
| T-11 | Keep | Done: planner `resolveConfiguration` then `build({ plan })` | `69496b79c7` | IMP-10 |
| T-12 | Keep | Done per DEC-010 (undeclared key left out; non-object refused, tree unchanged) | `b7aa1f5637` | IMP-10 |
| T-13, T-14, T-15, T-18 | Keep | Done (fixtures `'autobyteus'`, `exists` removed, RS-07/RS-08 header, delegation title) | `590bb6359c` | IMP-14 |
| T-16, T-44 | Keep | Done: `beginActivation(...).prepare()` + publish; arity fixed; load and skip (paid) | `15b9bedd84` | IMP-13 |
| T-17 | Drop | Cause known and documented | — | investigation-notes T-17 |
| T-19 | Drop | User direction | — | investigation-notes T-19 |
| T-20 | Drop | No longer applies | — | investigation-notes T-20 |
| T-21, T-22 | Drop | Fixed before this ticket | — | investigation-notes |
| T-23 | Drop | Withdrawn | — | investigation-notes T-23 |
| T-24, T-49 | Drop | Fixed (architecture guard passes) | — | investigation-notes T-24 |
| T-25 | Run first (REQ-012) | Ran: AE-006 passes in the full server e2e (113 files pass, 110 gated skips) → dropped with the run as evidence | — | IMP-22 |
| T-26 | Drop | Not worth it (DEC-005) | — | requirements DEC-005 |
| T-27 | Keep (measure first) | Done: measured, 7 files leaked; harness `makeTestTempDir`/`removeTestTempDirs` + prompt-builder cleanup; all 11 leave nothing | `351265ce41` | IMP-15 |
| T-28 | Keep sig. 2; drop 1, 3, 4, 5 (DEC-006) | Sig. 2 done per SR-003/SR-004 (Design Impact raised and resolved): window on the CLI's clock, bounds [GRACE_MS − 250 ms, GRACE_MS + 15 s]; 3 passing runs, windows 60,029–60,223 ms. Sigs. 1, 3, 4, 5 dropped (DEC-006) | `01a6c1a96a` | IMP-20 |
| T-29 | Drop (DEC-006) | Host overload class | — | requirements DEC-006 |
| T-30 | Keep | Done: 10 s eventual wait, 30 s case timeout | `a0c3c9e705` | IMP-16 |
| T-31 | Drop | Fixed | — | investigation-notes T-31 |
| T-32 | Drop | Gone | — | investigation-notes T-32 |
| T-33 | Run first | Ran: the 390 px cascade does not recur; the only failure, PT-E2E-017, was a stale expectation behind `cba9eca3ef` → probe fixed without weakening it; 17/17 pass | `975527ec0c` | IMP-19 |
| T-34 | Keep PMU-021; run first PMU-002 | PMU-021 fixed in the probe per DEC-012 (own-reload console errors not counted until the reload's load); PMU-002 passes; project-manager-ux 25/25 | `975527ec0c` | IMP-19 |
| T-35 | Run first | PMU-008 passes. TMV-002 failed from a stale fixture (strict team-stream contract fields) → fixture and probe mocks current; TMV 2/2 and harness pass | `21233a66db`, `ab0027a398` | IMP-19, IMP-24 |
| T-36 | Run first (DEC-007) | E-005 expected the old sequence → updated to include the intended Team-list reload; E-001..E-007 pass. (Its packaging build needs the install's pnpm store under a fresh HOME: environment, see Environment notes) | `ab0027a398` | IMP-24 |
| T-37 | Keep | Done: `output_throughput.method` masked; snapshot changes 24 lines only | `a0c3c9e705` | IMP-17 |
| T-38 | Drop | User direction | — | investigation-notes T-38 |
| T-39 | Drop | Fixed | — | investigation-notes T-39 |
| T-40 | Drop | No longer applies | — | investigation-notes T-40 |
| T-41, T-42 | Keep | Done: ported to the current backend factory, `beginAcquire(cwd)` lease and `CodexThread` API; model from `CODEX_BACKEND_MODEL` or `gpt-6.1-terra`; load and skip (paid) | `15b9bedd84` | IMP-13 |
| T-43 | Drop | Fixed | — | investigation-notes T-43 |
| T-45 | Listed for the user's approval (live) | Not run (paid live, DEC-011); unchanged | — | — |
| T-46 | Keep | Done (U-02 found: the interrupt hook patches the frozen migration writer; the upgrade chain needs the own-file completion record cleared too); 6/6 | `5b943f62ed` | IMP-11 |
| T-47 | Keep (DEC-008) | Done: fake timers; 20/20 | `a0c3c9e705` | IMP-16 |
| T-48 | Drop the port; keep the check | The check is REQ-010: a renamed or removed API now fails the server gate | `0a050de62e` | IMP-03 |
| T-50 | Keep | Done: shared helper in the 5 probes, the diagram-zoom probe and the merged integrations-page probe | `1c418abe80`, `52aedc6237` | IMP-18, IMP-24 |
| T-51 | Drop | Fixed | — | investigation-notes T-51 |
| T-52 | Run first (REQ-013) | Ran 10 consecutive times, 10/10 pass, no hang (two runs at load 33–51) → nothing to fix | — | IMP-23 |
| T-53 | Keep | Done: explicit 30 s timeout with its reason | `a0c3c9e705` | IMP-16 |
| T-54 | Keep | Done: model from the server catalog; LM Studio suites pass with `RUN_LMSTUDIO_E2E=1` | `e8716b0339` | IMP-12 |
| T-55 | Drop (DEC-006) | Two heavy runs at once | — | requirements DEC-006 |
| T-56 | = T-10 | Done with T-10 | `da1ad432dd` | IMP-09 |
| T-57 | Keep | Done: cast through `unknown` with the reason | `cbdbd79818` | IMP-02 (gate passes) |

Also done in this round: REQ-010 server gate (`fb0dd07f23`, `0a050de62e`), TESTING.md rows (`4000f748d2`), and the merge-drift fixes the server gate demanded after step 10 (`023aaeefff`).

## Key Files Or Areas

- Shared gate: `scripts/typecheck-gate/typecheck-gate-rules.mjs` (moved from `autobyteus-web/scripts/lib/typecheckGate.mjs`), `scripts/typecheck-gate/run-typecheck-gate.mjs`; spec `autobyteus-web/scripts/__tests__/typecheckGate.spec.ts` (29 cases, incl. the runner's fail-closed cases with a fake compiler).
- Web: `autobyteus-web/scripts/typecheck.mjs`, `tsconfig.cross-package-tests.json`, `typecheck-baseline.json`, `electron/vitest.global-setup.ts`, `tests/e2e/fixtures/probe-output-dir.mjs`, the probes, about 94 specs.
- Server: `autobyteus-server-ts/scripts/typecheck.mjs`, `tsconfig.tests.json`, `typecheck-baseline.json`, `package.json`, `tests/fixtures/agy-failure-cli.mjs`, repaired tests.
- `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` (T-57, the only `src` change besides T-04's config removal).
- `TESTING.md` (typecheck rows).

## Important Assumptions

- File classification (design § File Classification Rule): package-relative paths; a file is a test file only by its package's own `isTestFile`. Everything else, including `../autobyteus-ts/src/**` reached through test-support, counts as production at 0 errors.
- Paid suites are ported and proven to load and skip (DEC-011); they were not run live.
- LM Studio runs (T-54) used a local small model loaded by the run and unloaded afterwards.

## Known Risks

- The server baseline still holds 1,203 errors in stale gated suites (FU-001); the gate stops growth, it does not repair them.
- Probe and e2e timing still depends on host load. The runs here met loads of 30–40 from other teams' parallel runs and passed.
- Server `test:integration` has 4 failing cases that predate this ticket (FU-004); TESTING.md's "Green server suites" is not met until that follow-up lands.
- Merges from parallel teams can add test type errors the gates have not seen (R-02): after this branch lands, a merge that adds them fails the gate, as it did here at step 10. The fix is the same: repair at the cause, then shrink.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` (gate); stale tests left behind by intended product changes
- Reviewed refactor decision: `Refactor Needed Now` (gate runner to a shared owner)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes` for T-28 sig. 2 (anticipated by the design; resolved as SR-003/SR-004)
- Evidence / notes: the run-first failures found here were all stale tests or fixtures behind intended product changes (PT-E2E-017 vs `cba9eca3ef`; the TMV fixture vs the strict team-stream contract), consistent with the root-cause classification.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (old web gate path moved, one-off server config and script removed, stale `@ts-expect-error`, `exists` helper, unused imports in the T-27 files)
- Dead code found elsewhere, added to `follow-ups.md`: None new
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrails: `Yes` (the only `src` edits are a cast and config removals; test files are outside the limit)
- Notes: —

## Persisted Data Transition Check

- Approved decision: `Not Affected`
- Implementation follows it: `Yes` (no stored data touched; the transcription URL was runtime config)

## Environment Or Dependency Notes

- `@nuxtjs/apollo` removed; the lockfile also dropped `@vue/apollo-option` and `@rollup/plugin-graphql`, both unused.
- Every run used a clean env: `env -i PATH=$PATH HOME=<fresh temp dir> TMPDIR=$TMPDIR`, test-owned data roots, one heavy run at a time.
- The Electron-packaging probe (T-36) builds through `prepare-server`, which runs `pnpm install`; under a fresh `HOME`, pnpm sees a different store than the worktree's install and refuses to recreate `node_modules` without a TTY. Pointing `npm_config_store_dir` at the install's store (`/Users/normy/Library/pnpm/store/v10`, from `node_modules/.modules.yaml`) avoids it. Environment only, no code change.

## Checks Run

All runs: macOS 26.5.2 arm64, Node v22.23.1; clean env (`env -i PATH=$PATH HOME=<fresh temp> TMPDIR=$TMPDIR`), test-owned data, one heavy run at a time (waited for other teams' runs). Evidence files are in `tickets/in-progress/test-and-tooling-hygiene-318/evidence/` (header: command, commit, environment, date, check ID, what to look for).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `npx vitest run scripts/__tests__/typecheckGate.spec.ts` (web) | `4000f748d2` | as above | `scripts/typecheck-gate/*`, web `isTestFile` | BEH-001, BEH-006 / AC-010 | Pass | `IMP-01-typecheck-gate-spec.log` | "Tests  29 passed (29)" |
| IMP-02 | web gate; negative injection; shrink after T-04 | `dd47f30810`, `0bdcea5325` | as above | web gate, 4 projects | BEH-001 / AC-001 | Pass | `IMP-02-web-gate.log` | "[typecheck] PASS"; negative "new test file with errors: …acceptedInputIdentity.spec.ts (1)" |
| IMP-03 | server gate; removed-API injection; two shrinks | `0a050de62e` ff. | as above | server gate (src + tests) | BEH-006 / AC-010 | Pass | `IMP-03-server-gate.log` | negative "more errors than the baseline: …org-owned-team-local-agent.test.ts (3, baseline 2)" |
| IMP-04 | heap limit sweep and max RSS | `dd47f30810`, `0a050de62e` | as above | cross-package and server tests projects | REQ-001, REQ-010 | Pass (4096 MB chosen) | `IMP-04-heap-measurements.log` | "Reached heap limit" ≤ 2048 MB; RSS ≈ 2.7 GB |
| IMP-05 | cross-package project before/after; 3 tests | `dd47f30810` | as above | T-01 | BEH-001 / AC-001 | Pass | `IMP-05-t01-cross-package-tests.log` | "Tests  17 passed (17)" |
| IMP-06 | 94 changed specs; baseline update | `2fa398db4a` | as above | T-03 specs | BEH-002 / AC-002 | Pass | `IMP-06-t03-web-baseline.log` | "Tests  975 passed (975)"; "baseline written: 102 errors in 44 files" |
| IMP-07 | affected web and Electron specs | `0bdcea5325`, `3e735c2995` | as above | T-04, T-05 | BEH-003 / AC-003, AC-004 | Pass | `IMP-07-t04-t05-removals.log` | "Tests  51 passed (51)"; "Tests  32 passed \| 1 skipped (33)" |
| IMP-08 | `pnpm test:electron --run` with no Electron `dist/` | `13590aa2d4` | as above | Electron globalSetup | BEH-004 / AC-005 | Pass | `IMP-08-t06-electron-fresh.log` | one "Downloading Electron binary..."; "Test Files  51 passed \| 1 skipped (52)" |
| IMP-09 | 8 Claude live files before/after | `da1ad432dd` | as above | T-10 | BEH-005 / AC-006 | Pass | `IMP-09-t10-claude-harness-load.log` | before "Transform failed"; after all skipped, no load error |
| IMP-10 | T-11, T-12 files before/after | `69496b79c7`, `b7aa1f5637` | as above | T-11, T-12 | BEH-005 / AC-006 | Pass | `IMP-10-t11-t12-server-repairs.log` | "Tests  18 passed (18)"; "Tests  1 passed (1)" |
| IMP-11 | `RUN_CONTEXT_FILE_PROCESS_E2E=1` context-file storage e2e | `5b943f62ed` | as above | T-46 | BEH-005 / AC-006 | Pass | `IMP-11-t46-context-files.log` | "Tests  6 passed (6)" |
| IMP-12 | `RUN_LMSTUDIO_E2E=1` three files (local LM Studio, small model, unloaded after) | `e8716b0339` | + LM Studio | T-54 | BEH-005 / AC-006 | Pass | `IMP-12-t54-lmstudio.log` | "Tests  4 passed (4)"; "Tests  5 passed (5)" |
| IMP-13 | ported paid suites without gates | `15b9bedd84` | as above | T-07, T-16, T-41, T-42, T-44 | BEH-005 / AC-006 | Pass (load and skip) | `IMP-13-paid-suites-load.log` | every file "N skipped", no load error |
| IMP-14 | touched text-item specs | `590bb6359c` | as above | T-08, T-13..T-15, T-18 | BEH-009 / AC-007 | Pass | `IMP-14-text-items.log` | "Tests  63 passed (63)"; "Tests  14 passed (14)" |
| IMP-15 | per-file TMPDIR listing before/after | `a0c3c9e705` → `351265ce41` | run-owned TMPDIR | T-27 | BEH-008 / AC-009 | Pass | `IMP-15-t27-tmpdir.log` | after: every line "left in TMPDIR: nothing" |
| IMP-16 | T-30, T-53, T-47 files; T-47 ×20 | `a0c3c9e705` | as above | T-30, T-47, T-53 | BEH-007 / AC-008 | Pass | `IMP-16-timing-items.log` | "Tests  20 passed (20)"; 20 × "1 passed" |
| IMP-17 | golden sequence `-u` then without | `a0c3c9e705` | as above | T-37 | BEH-007 / AC-008 | Pass | `IMP-17-t37-golden-sequence.log` | "Tests  12 passed (12)"; 24 `<method>` lines only |
| IMP-18 | helper checks; 2 real probes on a non-empty dir | `1c418abe80` | as above | T-50 | BEH-008 / AC-014 | Pass | `IMP-18-t50-probe-output-dir.log` | "Refusing to write probe evidence into …"; "exit 1"; dir unchanged |
| IMP-19 | projects-feature, project-manager-ux, task-agent-monitor probes | `975527ec0c`, `21233a66db` | probe-owned stack, headless Chrome | T-33, T-34, T-35 | BEH-010 / AC-012 | Pass (after fixes; final TMV in IMP-24) | `IMP-19-run-first-probes.log` | PT-E2E-001..017 Pass; PMU-001..025 Pass |
| IMP-20 | `RUN_AGY_FAILURE_E2E=1` idle-lifetime ×3; interrupt-resend | `01a6c1a96a` | scripted AGY CLI | T-28 sig. 2 | BEH-007 / AC-008 | Pass | `IMP-20-t28-idle-window.log` | windows 60,029–60,223 ms; "Tests  3 passed (3)" |
| IMP-21 | full `pnpm test:integration` with watcher latency record (×2); 2 failing files alone | `975527ec0c` (+ temporary instrumentation) | as above | T-09; FU-004 | BEH-007 / AC-011 | Pass for T-09; 4 failures pre-exist at base → FU-004 | `IMP-21-t09-integration-watcher.log` | "max 570 median 485", 0 timeouts; "Tests  4 failed \| 481 passed" |
| IMP-22 | `pnpm test:e2e` (full server e2e) | `975527ec0c` | as above | T-25 / AE-006 | BEH-010 / AC-012 | Pass | `IMP-22-full-server-e2e.log` | "Test Files  113 passed \| 110 skipped (223)" |
| IMP-23 | QR-001 ×10 with the scripted AGY CLI | `975527ec0c` | scripted AGY CLI | T-52 | BEH-007 / AC-013 | Pass | `IMP-23-t52-qr001-10-runs.log` | 10 × "Tests  6 passed \| 1 skipped (7)" |
| IMP-24 | merge; both gates shrink + pass; drift fixes; TMV and T-36 probes; merged probe refusal | `32b8f5a763` … `ab0027a398` | as above | step 10, T-35, T-36, T-50 | BEH-001, BEH-006, BEH-008, BEH-010 | Pass | `IMP-24-step10-merge-gates-probes.log` | web "baseline written: 99 errors in 43 files" + PASS; server "baseline written: 1200 errors in 370 files" + PASS; "tamv exit 0", "trmf exit 0" |
| IMP-25 | full web suite, `test:electron`, server `test:unit` | `ab0027a398` | as above | everything touched | REQ-016 (partial) | Pass | `IMP-25-broad-suites-final.log` | "Tests 4968 passed (4968)"; "Tests 7729 passed \| 9 skipped (7738)" |

- Not run, and why:
  - Paid live suites (T-07, T-16, T-41, T-42, T-44, T-45): DEC-011, no paid runs; they are proven to load and skip.
  - REQ-016's literal fresh-clone run (new clone → install → server build → `test:integration:prepare` → both type checks → suites) is left to API/E2E. This worktree began fresh (no Electron `dist/`), and IMP-01..IMP-25 cover each named step on it, but not one end-to-end clean-clone pass.
  - Server `test:integration` is not fully green: 4 cases in 2 files fail at base `efd28d5c4a` too (FU-004), outside this ticket's item list.

## Frontend Rendered-Result Check

`Not Applicable`: no rendered UI changed. The web edits are test files, type and config removals (T-04 removes an unused runtime URL, with no UI). The browser probes ran as regression checks, not as UI changes (IMP-19).

## Downstream Coverage Hints / Suggested Scenarios

- Gate fail-closed behaviour is unit-covered (IMP-01); a reviewer can re-run the negative injection: add a call to a removed method in any server test and run `pnpm -C autobyteus-server-ts typecheck` → "more errors than the baseline", FAIL.
- REQ-016's clean-clone proof: see "Not run" below.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- REQ-016: one end-to-end run from a fresh clone (install, server build, `test:integration:prepare`, both type checks, `test:electron`, server unit and integration, the affected e2e files, the web tests). Each step passed here on this worktree (IMP-24, IMP-25, IMP-21, IMP-22), but not as one clean-clone pass.
- Independent re-runs of the run-first probes (IMP-19, IMP-24) and the gated scripted-AGY suites (IMP-20, IMP-23) as API/E2E judges useful; they are timing-sensitive under host load.
- Paid live suites stay unrun (DEC-011).
