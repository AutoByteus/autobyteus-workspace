# API/E2E Coverage Investigation — test-and-tooling-hygiene-318 (autobyteus-318)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, approved; design SR-001..SR-004)
- Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md`; Design Review Report: `design-review-report.md`; Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-002, ARCH-REV-004)
- Supplemental: `follow-ups.md` (FU-001..FU-004), `evidence/SD-01`, `SD-02`, `IMP-01..IMP-25`
- Implementation Handoff: `implementation-handoff.md` (IR-001); Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Record: `code-review-report.md`, `code-review-revision-record.md` (CRR-001, Pass)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1; Trigger: CRR-001 pass from `/software_engineering_team/code_reviewer`, 2026-11-01
- Latest Authoritative Investigation: this file, round 1

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318`, branch `codex/test-and-tooling-hygiene-318`, HEAD `7c04283722` (last code commit `ab0027a398`), `origin/personal` merged at `32b8f5a763`.

## Current Requirement And Design Basis

A hygiene ticket: a shared fail-closed type gate (`scripts/typecheck-gate/`) used by the web gate (a fourth project for the three cross-package tests; baseline 298 → 99) and a new server gate (src at 0 errors and tests against a shrink-only baseline, 1,200 in 370 files); removal of the transcription URL and `@nuxtjs/apollo`; an Electron vitest global setup that downloads the binary once before workers; probes that refuse a non-empty `--output-dir`; stale tests repaired, timing tests bounded, run-first items run. Paid live suites are not run (DEC-011). FU-004: 4 integration cases fail at base.

## Supported Scenarios And Real Usage

- SCN-001..SCN-006 (requirements) as the real triggers: the package scripts and probes a developer runs, from a fresh clone (REQ-016).
- Added: SCN-A1 — a developer injects a call to a removed server method in a test, or a type error in a cross-package web test, and runs the gate (the gates' purpose); SCN-A2 — the gate's update mode is asked to grow the baseline.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Tooling / CLI (type gates, Electron global setup, probes) | Yes | package scripts | IMP-01..08, IMP-18, IMP-24 | a fresh clone in the documented order; negative checks run independently | fresh clone (CLI) |
| Server tests / e2e | Yes | repaired tests, gated scripted suites | IMP-09..17, IMP-20..23 | the merge (`32b8f5a763`) came after IMP-19..23 | rerun in the fresh clone |
| Web probes | Yes | probe expectations, output-dir rule | IMP-19, IMP-24 | IMP-19 predates the merge | rerun two probes; refusal check on all output-dir probes |
| Runtime config (transcription URL removed) | Yes | web/Electron config | IMP-07, IMP-25 | — | grep + suites in the clone |
| Others | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `/TESTING.md` (worktree copy, typecheck rows updated). Install order: install → `pnpm -C autobyteus-server-ts prebuild` → `nuxt prepare`; server build for dist users; `test:integration:prepare` once; clean env (`env -i PATH HOME=<resolved temp> TMPDIR`) for e2e and gated suites; scripted AGY CLI for gated runs; local models one at a time and unloaded; one heavy run at a time.
- Host: macOS 26.5 arm64, Node 22; other teams' parallel runs raise load (78 at start): heavy runs wait for the load to fall.

## Existing Durable Coverage Inventory

The ticket's own repaired and new tests (implementation handoff, per-item table) are `Still Valid`; none are changed by API/E2E unless a run shows a test-caused failure.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, AC-003, AC-004 (parts), AC-012 (T-35, T-36), AC-016 (web full suite, Electron, server unit on the worktree) | — | Reused | IMP-24, IMP-25 | ran on `ab0027a398` (final code, after the merge) |
| API-02 | AC-016, AC-005, AC-001, AC-002, AC-004, AC-010, AC-006, AC-011 | fresh clone, documented order | Existing Test | clone HEAD; `pnpm install --frozen-lockfile`; no Electron `dist/`; server `prebuild` + `build`; `test:integration:prepare`; web `typecheck`; server `typecheck`; `test:electron` (first run); server `test:unit`; `test:integration` (expect only FU-004's 4 cases); web `test:nuxt` | REQ-016 as one pass |
| API-03 | AC-010, AC-001, QR-001 | gate negatives | Temporary Probe | in the clone: (a) a call to a removed method in a server test → server gate FAIL; (b) a type error in a cross-package web test → web gate FAIL; (c) the update mode asked to grow a baseline → refused; reverted after each | the gates' purpose |
| API-04 | AC-014 | probe output dir | Existing Test | each probe that uses the output-dir helper, with a non-empty `--output-dir` → non-zero exit, message, folder unchanged (listing before/after) | REQ-014 for every probe |
| API-05 | AC-012, AC-006, AC-008, AC-013, AC-009 | gated scripted e2e and timing reruns | Existing Test | clean env: full `pnpm test:e2e` (AE-006, repaired e2e, paid suites load and skip); `RUN_CONTEXT_FILE_PROCESS_E2E=1` T-46; `RUN_AGY_FAILURE_E2E=1` T-28 idle lifetime ×2; QR-001 (T-52) ×10; T-47 ×20; T-27's files with a run-owned `TMPDIR` listing | IMP-20..23, IMP-15, IMP-16 predate the merge |
| API-06 | AC-012 | run-first probes | Existing Test | `test:e2e:projects`, `test:e2e:project-manager-ux` with fresh output dirs | IMP-19 predates the merge |
| API-07 | AC-006 (T-54) | LM Studio suites | Existing Test | `RUN_LMSTUDIO_E2E=1` the three files, small local model, unloaded after | IMP-12 predates the merge |

- Test progress log needed: `Yes`.

## Durable Coverage To Add / Update / Remove

None planned.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Paid live suites (T-07, T-16, T-41, T-42, T-44, T-45) | DEC-011: no paid runs | they are proven to load and skip | No | the user may approve later |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`; durable coverage changes: `No`; reroute: `No`.
