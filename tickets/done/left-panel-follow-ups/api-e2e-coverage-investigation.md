# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision go in the execution coverage report.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups/tickets/in-progress/left-panel-follow-ups/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001; REQ-001…REQ-003, AC-001…AC-004)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (`Small` / `Low`)
- Supplemental Task Artifacts: none
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md`; Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md` (after the first result)
- Current API/E2E Revision ID: `N/A` (round 1)
- Current Investigation Round: 1; Trigger: IR-001; Prior Investigation Reviewed: none; Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001: GraphQL `createAgentRun` stays unchanged. The web has no `CreateAgentRun` document or generated type. The server suites that use `createAgentRun` pass.
- REQ-002 / AC-002: `WorkspaceAgentRunsTreePanel` is renamed `RunSectionPanel` everywhere except ticket history. The web suite, typecheck and localization guards pass.
- REQ-003 / AC-003: with the Projects view shown, a run started or removed by another client appears in or leaves its Project within one poll (~5 s), without a view switch. Hidden, no Project reads. This window's own actions re-read as today.
- Design (DEC-003): `projectRunsStore` watches the sorted set of root runs in `runHistoryStore` (agent and team runs from `workspaceGroups`, Org runs from `agentOrgHistory`) while Projects is shown. On a change, it re-reads every loaded Project. The first value after showing is the baseline.
- Legacy check and persisted data: none / `Not Affected`; they match.

## Supported Scenarios And Real Usage

- The designer's scenarios: a run started by another client under a Project (PLN-08 of 385); removal by another client; the view hidden.
- Added from investigation, with real triggers:
  - another client archives a Project's only run while the Projects view is open;
  - another client archives a Project run older than the 6 newest runs of its agent in its folder. The run section's history poll reads 6 per agent and folder while Projects is shown, so that run is not in the watched set. Real use: a Project folder where the same agent also has newer runs outside the Project.
- Contrived: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Web `CreateAgentRun` document and types | Removed | DEC-001 | Grep plus codegen check (IMP-04); GraphQL `createAgentRun` used live by the probes; its server suites |
| Run section host name, localization namespace | Changed (rename) | DEC-002 | Suite, typecheck, guards (IMP-02, IMP-03); zh-CN rendering (PLN-10) |
| Open Projects view re-reads on a run-set change | Added | DEC-003 | IMP-01 (store spec); live PLN-08 (start elsewhere), PLN-11 (removed elsewhere, older run, hidden) |
| Existing Projects re-read triggers and rows | Preserved | Scope Guardrail | PLN-01…PLN-10 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No (docs only) | — | — | — | — |
| API / transport / contract | Yes (web client documents only) | generated types | IMP-04 codegen check | — | — |
| Frontend component / state | Yes | `projectRunsStore` watcher; the rename | IMP-01, IMP-02 | Real poll timing; removal; the history window's effect on the watched set | Live browser stack |
| Browser integration / user journey | Yes | Projects view live | IMP-06 (PLN-01…08) | Removal, older run, hidden reads, PLN-09/10 | PLN probe incl. new PLN-11 |
| Desktop shell, auth, persisted data, workers, external | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups` (branch `codex/left-panel-follow-ups`, head `dda6ba59cf`, base `d6bcff577b`)
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups/TESTING.md` (present, including its Fresh-start build section)
- Changed build-input paths: `autobyteus-web/generated/graphql.ts` (`autobyteus-web/generated/**`). Fresh-start build case: API-05.
- Required secrets: none (scripted AGY); signing secrets absent (Not Tested).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | guideline | web specs + browser probe; server E2E file runs `vitest run <path> --no-watch` with a clean env; one heavy run at a time; Fresh-start build |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` | live Projects journeys | real Chrome → Nuxt dev → `dist/app.js`, scripted AGY; owned data root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `stores/__tests__/projectRunsStore.spec.ts` | re-read on set change, not on status, not hidden | AC-003 | Still Valid | IMP-01 | Reuse |
| Renamed specs, web suite, typecheck, guards, codegen | rename and removal | AC-001, AC-002 | Still Valid | IMP-02…IMP-04 | Reuse |
| `projects-left-navigation-probe.mjs` PLN-01…10 | Projects view live; PLN-08 updated to 388 | AC-003, preserved | PLN-01…08 Still Valid (IMP-06); PLN-09, 10 not run | IMP-06, IMP-07 | Run all, plus the new PLN-11 |
| Server tests using `createAgentRun` (GraphQL: `stopped-run-model-config-graphql.e2e.test.ts`, `removed-remote-provider-saved-selection-graphql.e2e.test.ts`; service: `tests/unit/agent-execution/agent-run-create-*.test.ts`) | the mutation and its service | AC-001 | Still Valid (server code unchanged) | not run in this ticket | Run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (web), AC-002, AC-003 (store) | web | Reused | IMP-01…IMP-05 | Ran on the code commits; only ticket docs after |
| API-02 | AC-001 (server) | server | Existing Test | `vitest run` of the two GraphQL e2e files and the `agent-run-create` unit tests, clean env | AC-001 names them; not run yet |
| API-03 | AC-003, preserved Projects behavior, zh-CN after the namespace rename | live browser | Existing Test | `pnpm -C autobyteus-web test:e2e:projects-left-navigation` PLN-01…PLN-10 | PLN-09, PLN-10 never ran on this change |
| API-04 | AC-003 (removed elsewhere; older run; hidden) | live browser | Durable (PLN-11) | Open Projects view: a new Project's only run started then archived through the API; the Workspaces view shown while a run is started (no Project read); a Project run older than its folder's 6 newest archived through the API | Removal and the window edge were not exercised |
| API-05 | AC-004; fresh-start | release build | Journey | fresh clone at `dda6ba59cf`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64`, verify steps | `generated/**` changed |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-04 | `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` PLN-11 | Removal by another client and the hidden view, live |

## Durable Coverage To Update / Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Signing, notarization, other platforms | Runner secrets and OS | Low | No | — |

## Ambiguities Or Reroute Triggers

None before execution. If PLN-11's older-run case fails, it is an execution failure and goes to failure-origin review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes` (PLN-11)
- Reroute Required Before Validation Execution: `No`

## Round 2 (IR-002, SR-002)

- Trigger: CRR-001 CR-001 (`Design Impact`) → SR-002 → IR-002 (`1112f13de1`). `historyWindowOf` is now `mode === 'workspaces' ? 6 : null`, so the Projects view's poll reads every run and the watched set includes every Agent run.
- Rerun plan (`git diff --name-only 2f8ef36bbc 5731da6f95` outside tickets: `RunSectionPanel.vue`, three specs, `runHistoryStore.ts` comment, two docs):
  - API-01 → reuse IMP-08…IMP-10.
  - API-03 and API-04 → reuse IMP-11. It ran `projects-left-navigation-probe.mjs`, unchanged since my `43a714f993`, on `1112f13de1`: PLN-01…11 Pass, and PLN-11 `mUnlistedMs: true`, `readsAfterOlderArchive: 5`. IMP-12 shows PLN-11 fails on SR-001's host.
  - API-02 still valid (no server change). API-05 still valid (no build input changed).
  - New API-06: the Projects view now polls the uncapped history every 5 s, which only the Runs view did before (385 kept it to the Runs view under DESIGN.md rule 3). Measure the poll read against the 250 ms budget with `run-history-read-budget-probe.mjs` on this build.
