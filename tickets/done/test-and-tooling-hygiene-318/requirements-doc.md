# Requirements Document — autobyteus-318 (test and tooling hygiene, round 2)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `test-and-tooling-hygiene-318`
- Request / ticket: Project Task `autobyteus-318` (12 older Tasks merged in; comment items from 311, 331, 316, 343)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-01
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user on 2026-11-01 (SR-001). The PM's message of 2026-11-01 gives the Solution Designer the decision to drop items that are fixed, no longer apply, or are not worth the effort.
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: None (evidence files only, see investigation notes)

## Problem And Desired Outcome

- Problem: tests and tooling have drifted from the product. Gated suites call removed APIs, one test helper does not parse, stale expectations fail, three web tests are excluded from the type check, the web test baseline holds 298 errors, unused config and a dependency remain, a fresh clone races the Electron download, some tests depend on wall-clock timing, and probes can delete evidence. Nothing checks server test files' types, so a renamed API breaks gated suites silently.
- Affected actors or systems: developers and agents running tests; delivery's clean-clone runs; the web type gate in the desktop build.
- Desired outcome: every item is fixed or dropped with evidence; the recurring "renamed API" class is caught by a type check from now on.
- Observable definition of success: the acceptance criteria below pass from a clean clone; the final report lists each item's disposition with evidence.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Three web tests that import server code are excluded from the web type gate | They are type-checked by the gate | The gate's rules: production 0 errors, tests ≤ baseline, fail closed | T-01, T-02 |
| BEH-002 | Operational | SCN-001 | Web test baseline 298 errors | Lower by the decided areas (DEC-002) | Baseline only shrinks | T-03 |
| BEH-003 | System | SCN-003 | Web/Electron carry an unused transcription WebSocket URL; `@nuxtjs/apollo` is declared but unused | Both removed | Every used server URL and the Apollo client setup unchanged | T-04, T-05 |
| BEH-004 | Operational | SCN-002 | First `test:electron` on a fresh clone can fail while workers race the Electron download | The binary is present before workers start | Electron tests unchanged | T-06 |
| BEH-005 | Operational | SCN-004 | Gated and ungated server tests fail or cannot load because of removed APIs, stale expectations, a broken import, old layouts | Each passes, or (paid gates) type-checks and loads | What each test proves | T-07, T-10..T-12, T-16, T-41, T-42, T-44, T-46, T-54 |
| BEH-006 | Operational | SCN-005 | Server test files are not type-checked; a renamed API breaks gated suites silently | A server test type check, with a baseline that only shrinks, fails on a new test type error | Production `src` stays at 0 errors under the build policy | T-48, SD-01 |
| BEH-007 | Operational | SCN-004 | Some tests depend on wall-clock timing or cold-import speed | Deterministic or bounded by what they prove | Coverage not weakened | T-28 (sig. 2), T-30, T-37, T-47, T-53, T-09, T-52 |
| BEH-008 | Operational | SCN-006 | Five probes delete an existing `--output-dir`; some tests leave temp folders | Probes refuse a non-empty output dir; named tests clean up | Probe evidence layout | T-50, T-27 |
| BEH-009 | Operational | SCN-004 | Stale docs line, fixtures, unused helper, test header, test title | Current | — | T-08, T-13..T-15, T-18 |
| BEH-010 | Operational | SCN-006 | Four web probes reported failing weeks ago; one shared-DB e2e failure | Each runs green in a full run, or its cause is fixed | Probe assertions keep their strength | T-25, T-33..T-36 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user | Trustworthy tests; no surprise spend | Green suites, honest report, paid runs only by approval | No live paid suites without approval; no release |
| Developers / agents | Run tests from a fresh clone | Gates pass, failures mean real defects | One heavy run at a time |
| Parallel teams (345, 357, 358, 285, 337, 355) | Their own Tasks | No interference | Change only this ticket's files; resolve conflicts on merge |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Run the web type gate (including the three cross-package tests) | SCN-001 |
| UC-002 | Run `test:electron` on a fresh clone | SCN-002 |
| UC-003 | Start the web/desktop app with its server URLs (transcription URL removed) | SCN-003 |
| UC-004 | Run the server test suites named in the triage (`Keep` / `Run first`) | SCN-004 |
| UC-005 | Run the server type check, now including test files | SCN-005 |
| UC-006 | Run browser probes and named tests without losing evidence or leaving temp folders | SCN-006 |

### Out Of Scope

- Items dropped in the triage (DEC-001): T-17, T-19..T-24, T-26, T-29, T-31, T-32, T-38..T-40, T-43, T-51, T-55, and T-28 signatures 1, 3, 4, 5.
- Repairing every stale gated suite beyond the listed ones: they enter the new server baseline and become a follow-up (FU-001).
- Type-checking `autobyteus-ts` tests.
- Running any live suite that spends credits or plan quota (listed in the investigation notes for the user's approval).
- AGY model discovery's tolerance of a slow `--help` (a product change; dropped with T-28 signature 1).
- Web baseline areas other than components, services and stores.
- CI changes (autobyteus-65 depends on this Task and owns CI gating).

### Non-Goals

- Making product timing bounds (AC bounds such as 5 s refresh) looser.
- Adding new test coverage beyond what each repaired test already proved.

### Preserved Behavior Boundary

- Every repaired test keeps the outcome it proved (REQ-006, REQ-008).
- The web gate's rules (fail closed; production 0; baseline only shrinks).
- All used server URLs; Apollo client behavior.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The three web tests that import server code (`UserMessageStoredUploadNames.spec.ts`, `acceptedInputIdentity.spec.ts`, `codex-turn-lifecycle-native-to-live-projection.integration.test.ts`) are type-checked by `pnpm -C autobyteus-web typecheck`, with their real errors fixed (the server fixture's two type mismatches, the stale `memberTeamContext`), and add nothing to the baseline | BEH-001 | High | 294 FU-003, 311 FU-003 | SD-02: 4 errors in their own project | Task; DEC-004 |
| REQ-002 | The web test baseline loses every error in the areas `components`, `services` and `stores` (98 + 52 + 46 = 196 at `efd28d5c4a`); the total falls to at most 102 (minus anything other areas also lose) | BEH-002 | High | 294 FU-004 | Baseline counts | Task; DEC-002 |
| REQ-003 | The transcription WebSocket URL is gone end to end (config, runtime config, browser config, server store, Electron server manager, types, `.env*`, README, probes, spec fixtures) | BEH-003 | Medium | 294 FU-009 | N/A | Task |
| REQ-004 | `@nuxtjs/apollo` is removed from `autobyteus-web/package.json` and the lockfile, with its stale `@ts-expect-error` | BEH-003 | Medium | 294 FU-010 | N/A | Task |
| REQ-005 | `pnpm -C autobyteus-web test:electron` on a fresh clone has the Electron binary in place before any test worker starts, so no two workers download it | BEH-004 | Medium | 294 FU-011 | Measured: no `dist/` after install | Task; DEC-009 |
| REQ-006 | Each stale server test is repaired to the current API and passes: T-11, T-12, T-46 (both failures, cause found), T-10 (the 8 harness users load), T-54 (the LM Studio backend-factory suite and the two e2e files sharing its model lookup find the model the current way and pass with `RUN_LMSTUDIO_E2E=1` on a small local model, one run at a time); suites behind a paid gate (T-07, T-16/T-44, T-41, T-42) type-check under the build policy and load (skip) without their gate; models in T-41/T-42 come from the live catalog or an env override, not hard-coded old names | BEH-005 | High | 311 FU-002/004/005, 59, 148, 294 FU-012 | Reproduced/measured failures | Task |
| REQ-007 | Stale text is current: `docs/modules/agent_execution.md` L716 (T-08), `'AUTOBYTEUS'` fixtures → `'autobyteus'` (T-13), unused `exists` removed (T-14), RS-07/RS-08 in the header (T-15), the delegation test title (T-18) | BEH-009 | Low | 294 FU-013, 343, 316 FU-010, 59 | N/A | Task |
| REQ-008 | Timing-dependent tests become deterministic or bounded by what they prove: the idle-lifetime window measured from times that frame delivery cannot delay (T-28 sig. 2; SR-003: the scripted CLI's own clock); the eventual-condition waits in run-file-change-service (T-30) and the import test (T-53) do not fail on slow hosts; the golden event sequence masks `output_throughput.method` (T-37); the Project-indexing burst test runs on fake timers (T-47) | BEH-007 | Medium | 103, 112, 220, 257 | Causes read in code | Task; DEC-006, DEC-008 |
| REQ-009 | The named tests leave no folder in a run-owned `TMPDIR` (T-27), shown by a before/after listing | BEH-008 | Low | 59 | Read: missing cleanup | Task |
| REQ-010 | `pnpm -C autobyteus-server-ts typecheck` also type-checks server test files under the build type policy, against a baseline that only shrinks, with the web gate's rules (fail closed; production files 0 errors); a test that calls a removed or renamed API fails it. The one-off `typecheck:claude-interrupt-resume-e2e` is folded into it | BEH-006 | High | 225 ("a renamed API can no longer silently break it") | SD-01: 1,316 errors measured, `src` 0 | Task (225); DEC-003 |
| REQ-011 | The file-watcher integration timeouts (T-09) are fixed from a measured cause: event latency measured under the full integration suite with the watcher timing log; late events → a wait derived from the measurement; a lost event → reported as a product defect | BEH-007 | Medium | 294 FU-014 | U-01 | Task |
| REQ-012 | The run-first items run in a full run: web probes T-33..T-36 and AE-006 (T-25, in the full server e2e). A failing one is fixed from its cause without weakening it; a passing one is dropped with the run as evidence. PMU-021's known cause is fixed in the probe (DEC-012); E-005 expects the intended Team-list reload (DEC-007) | BEH-010 | Medium | 104, 59 | U-03 | Task |
| REQ-013 | QR-001 (T-52) runs 10 times in a row with the scripted AGY CLI; a reproduced hang gets its cause: a test cause is fixed here, a product race is reported as a follow-up with the cause | BEH-007 | Medium | 257 FU-005 | 1/1 pass 2026-11-01 | Task |
| REQ-014 | Browser probes refuse a non-empty `--output-dir` with a clear message and a non-zero exit, instead of deleting it (the 5 probes of T-50, and any other found) | BEH-008 | Medium | 239; TESTING.md L313 | grep | Task |
| REQ-015 | The final report lists every triage item with its disposition and evidence (a line each for dropped items) | all | High | PM message 2026-11-01 | N/A | PM |
| REQ-016 | Proven from a clean clone: install, server build, `test:integration:prepare`, both type checks, `test:electron`, server unit and integration, the affected e2e files, the web tests | all | High | Task | N/A | Task |

## Acceptance Criteria

| AC ID | Related REQ | Related Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | `pnpm -C autobyteus-web typecheck` | The output names the three tests' project with 0 errors; `nuxt.config.ts` no longer needs them excluded from the type gate as a whole; an injected type error in one of them fails the gate | — | Gate run + a negative check |
| AC-002 | REQ-002 | BEH-002 | Same | `typecheck-baseline.json` has no file under `components/`, `services/`, `stores/`; total ≤ 102 | — | Gate output, baseline diff |
| AC-003 | REQ-003 | BEH-003 / SCN-003 | grep, web tests, Electron tests | No `transcription` server URL left in web/Electron code, config, env, README, probes; server-status specs pass | Voice input (local transcription) unaffected | grep + suites |
| AC-004 | REQ-004 | BEH-003 | `pnpm install --frozen-lockfile`, web gate, web tests | No `@nuxtjs/apollo` in package.json or lockfile; gate and Apollo-using specs pass | — | Install + suites |
| AC-005 | REQ-005 | BEH-004 / SCN-002 | Fresh clone, `node_modules/electron/dist` absent | First `test:electron` passes; the binary was installed once before workers | — | Run with `dist` removed |
| AC-006 | REQ-006 | BEH-005 / SCN-004 | Each repaired file | Ungated/free-gated: pass (T-11, T-12, T-46 with `RUN_CONTEXT_FILE_PROCESS_E2E=1`, T-54 with `RUN_LMSTUDIO_E2E=1`); paid-gated: 0 type errors and load as skipped; the 8 harness users load | — | vitest + type check |
| AC-007 | REQ-007 | BEH-009 | grep/read | Each stale line is current | — | Read |
| AC-008 | REQ-008 | BEH-007 | Each test | T-28 measures the window from times that frame delivery cannot delay (the scripted CLI's own clock, SR-003) and passes with lower bound `GRACE_MS − 250 ms` (SR-004); T-47 uses fake timers and passes 20/20; T-37 masks `method`; T-30, T-53 have bounds that do not assert speed | — | Runs |
| AC-009 | REQ-009 | BEH-008 | Run-owned `TMPDIR` | Empty after the named tests (listing before/after) | — | Listing |
| AC-010 | REQ-010 | BEH-006 / SCN-005 | `pnpm -C autobyteus-server-ts typecheck` | Checks `src` (0 errors) and tests (≤ baseline); a test calling a removed method fails it; the baseline cannot grow; the one-off config is gone | — | Gate run + negative check |
| AC-011 | REQ-011 | BEH-007 | Full `test:integration` with the watcher timing log | The measured latency and the fix are recorded; the watcher file passes in the full suite | Lost event → follow-up | Run |
| AC-012 | REQ-012 | BEH-010 / SCN-006 | Probe full runs; full server e2e | Each probe passes in a full run, or its fixed cause is recorded; AE-006 passes in the full e2e | — | Probe ledgers, e2e log |
| AC-013 | REQ-013 | BEH-007 | 10 consecutive scripted runs | 10/10 pass, or the cause of a hang is recorded and handled | Product race → follow-up | Runs |
| AC-014 | REQ-014 | BEH-008 / SCN-006 | A probe with a non-empty `--output-dir` | It exits non-zero with a clear message and the dir is unchanged | — | Run |
| AC-015 | REQ-015 | all | Final report | Every T-ID has a disposition and evidence | — | Read |
| AC-016 | REQ-016 | all | Fresh clone | The listed commands pass | — | Delivery |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Developer, desktop build | Type-check the web package | `pnpm -C autobyteus-web typecheck` (also inside `build:electron*`) | After install | Shared types, `nuxt prepare`, projects | PASS with fewer baseline errors | A new error fails it | Supported Normal Scenario | TESTING.md L37 | REQ-001, REQ-002 |
| SCN-002 | Operational | Developer | Run Electron tests on a fresh clone | `pnpm -C autobyteus-web test:electron` | Fresh install | Vitest starts workers | Pass | — | Supported Normal Scenario | TESTING.md L35 | REQ-005 |
| SCN-003 | System | Web/desktop app | Know the server URLs | App start | — | Config → runtime config → store | Same URLs minus the unused one | — | Supported Normal Scenario | T-04 | REQ-003 |
| SCN-004 | Operational | Developer | Run server suites, gated ones with their gate | vitest | Build, prepare | Run | Pass or skip-with-gate | — | Supported Normal Scenario | TESTING.md L39-43 | REQ-006..REQ-009, REQ-011, REQ-013 |
| SCN-005 | Operational | Developer | Type-check the server | `pnpm -C autobyteus-server-ts typecheck` | After install | tsc | PASS, new test error fails | — | Supported Normal Scenario | TESTING.md L40 | REQ-010 |
| SCN-006 | Operational | Developer | Run probes and collect evidence | `pnpm -C autobyteus-web test:e2e:<name> --output-dir` | — | Probe | Evidence written to a fresh dir | Non-empty dir refused | Supported Normal Scenario | TESTING.md L305-317 | REQ-012, REQ-014 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A, not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Measurable Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-010, REQ-001 | Operability | The type checks fail closed (unstartable compiler, signal, unattributed error) | Both packages | Negative checks |
| QR-002 | REQ-008, REQ-011, REQ-013 | Reliability | Repaired timing tests pass repeatedly (T-47 20/20, T-52 10/10) at normal load | One heavy run at a time | Runs |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| `electron@42.11.16` package | Its `install.js` downloads the binary | `node_modules/electron/package.json` | Network needed on first install (as today) |
| TypeScript / vue-tsc pinned in each package | Same compilers as today | `package.json` | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/SD-01-server-tests-typecheck-build-policy.txt` | Server test type errors | REQ-010 | Final | Evidence only |
| `evidence/SD-02-web-cross-package-project.txt` | Three tests' project | REQ-001 | Final | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The removed transcription URL has no reader (the server has no such route) | REQ-003 | grep in implementation; 294 FU-009 | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which items to drop | Effort and honesty | Triage table | Drop what is fixed (T-21, T-22, T-24, T-31, T-39, T-43, T-51), no longer applies (T-20, T-23, T-32, T-40), user-directed (T-19, T-38), known-and-documented (T-17), not worth it (T-26), load-only (DEC-006). The PM's message gives this decision to the Solution Designer | Solution Designer | Decided |
| DEC-002 | Which baseline areas ("the agreed areas") | Effort vs. result | 298: components 98, services 52, stores 46, tests 34, electron 27, … | The Task says largest areas first; the three largest hold 196 (66 %). The rest stays for a later round (FU-002) | Solution Designer | Decided |
| DEC-003 | Add a server test type check? | It changes what `typecheck` checks | 225 asks that a renamed API can no longer break a suite silently; SD-01 shows 1,316 errors and 20+ stale gated suites; the project already type-checks one e2e file this way | Yes: same rules as the web gate (baseline that only shrinks), so it passes on day one and stops growth. Inside `typecheck`, which TESTING.md keeps green. Not in CI (autobyteus-65 owns CI) | Solution Designer | Decided |
| DEC-004 | Home for the three tests | REQ-001 | (a) own project in the web gate; (b) move them to the server; (c) keep excluded | (a): they compare web and server code, so they belong where both compile; measured 4 real errors (SD-02). (b) loses the web side's types | Solution Designer | Decided |
| DEC-005 | Extract the duplicated scripted-AGY helpers | Maintainability | 20/23/8 files | Not worth it now: no defect, wide churn in files parallel teams edit (358 large runs, 357 dead code), merge-conflict risk | Solution Designer | Decided (drop) |
| DEC-006 | Failures seen only at load ~186 | Rule 9 needs a cause | Bundle: load average 186, 14/14 alone; 2026-11-01: pass at load 8–19 | Cause: CPU starvation from many parallel heavy runs, which TESTING.md L110-112 now forbids for that reason. Drop those (T-28 sig. 1, 3, 4, 5; T-29; T-55, which failed while two heavy suites ran at once). Keep the load-independent weakness (T-28 sig. 2) and the waits that are inherent to a single full-suite run (T-30, T-53, T-09) | Solution Designer | Decided |
| DEC-007 | E-005 expected request sequence | Product vs. probe | The live definitions feed reloads the Team list on purpose (`f7fcf9055a`, `e4746ade4e`) | Intended; if the probe still fails, update its expected sequence | Solution Designer | Decided |
| DEC-008 | Project-indexing test (T-47) | Two widenings already (`cece5ce05b`, `9457972953`) | A third widening is tuning again | Re-examined: drive the debounce with fake timers, which removes the wall clock | Solution Designer | Decided |
| DEC-009 | FU-011: fix or document | Fresh clones fail once | Install once before workers | Fix (a setup step before workers), documenting alone keeps the failure | Solution Designer | Decided |
| DEC-010 | Scoped-org stale expectation (T-12) | Keep what it proves | Undeclared settings are now left out (SR-004) | Assert the current contract (undeclared key left out) and keep the "refused creation records nothing" check with an input that is still refused | Solution Designer | Decided |
| DEC-011 | Live suites | Cost | Listed in the investigation notes | Not run; the user may approve any of them later. Acceptance uses type checks and loading | Solution Designer | Decided |
| DEC-012 | PMU-021: fix the product log or the probe | The error is logged when the probe itself reloads the page | Product change vs. test change | Probe: stop counting console errors from its own reload until the next load; the product logs a real socket error correctly | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-002 | SCN-001 |
| REQ-003 | UC-003 | BEH-003 | AC-003 | SCN-003 |
| REQ-004 | UC-001 | BEH-003 | AC-004 | SCN-001 |
| REQ-005 | UC-002 | BEH-004 | AC-005 | SCN-002 |
| REQ-006 | UC-004 | BEH-005 | AC-006 | SCN-004 |
| REQ-007 | UC-004 | BEH-009 | AC-007 | SCN-004 |
| REQ-008 | UC-004 | BEH-007 | AC-008 | SCN-004 |
| REQ-009 | UC-006 | BEH-008 | AC-009 | SCN-004 |
| REQ-010 | UC-005 | BEH-006 | AC-010 | SCN-005 |
| REQ-011 | UC-004 | BEH-007 | AC-011 | SCN-004 |
| REQ-012 | UC-006, UC-004 | BEH-010 | AC-012 | SCN-006 |
| REQ-013 | UC-004 | BEH-007 | AC-013 | SCN-004 |
| REQ-014 | UC-006 | BEH-008 | AC-014 | SCN-006 |
| REQ-015 | all | all | AC-015 | all |
| REQ-016 | all | all | AC-016 | all |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-006.
- Constraints: the gate rules; one heavy run at a time; no paid live runs; keep to this ticket's files.
- Deferred to design: where the shared gate logic lives; how the server test check is wired into `typecheck`; the three tests' project options; the Electron pre-install hook.
- Technical facts to verify: the build policy compiles `test-support/` imports (rootDir); vitest `globalSetup` runs before workers for `electron/vitest.config.ts`.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-11-01)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
