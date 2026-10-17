# Implementation Handoff — `baseline-e2e-probe-repair`

- Author: Implementation Engineer, 2026-10-17
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair`, branch `codex/baseline-e2e-probe-repair`
- Base: `origin/personal` `516e592d7b` (rebased twice on request: `db00ba16a9` → `66429d6f31` → `516e592d7b`). Backups of the earlier branch states: `backup/baseline-e2e-probe-repair-db00ba16a9`, `backup/baseline-e2e-probe-repair-66429d6f31`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (`Medium` / `Low`); architecture review not selected. IR-001 went to the Solution Designer as a Requirement Gap (UC-006). SR-003 resolved it, and IR-002 takes the direct API/E2E rule.
- Requirements doc: `tickets/in-progress/baseline-e2e-probe-repair/requirements-doc.md` (Approved, SR-003: UC-006 / REQ-006 / AC-006 withdrawn, DEC-009; DEC-010)
- Investigation notes: `…/investigation-notes.md` (SR-003)
- Solution revision record: `…/solution-revision-record.md` (SR-001..SR-003)
- Design spec: `…/design-spec.md` (Ready, SR-003); latest designer handoff `…/handoff-sr-003.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report or evidence: SR-002 and SR-003 messages from the Solution Designer (2026-10-17); the user's instruction to base the branch on the latest `origin/personal`.

## Current Implementation Summary

- Implementation cycle: `Initial`, updated to the SR-003 basis (IR-002: documentation only, no code change)
- Implementation revision record: `…/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related architecture-review, code-review, API/E2E and delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

The branch contains 8 baseline-fix commits (TESTING.md Rule 9), one per remaining item, on top of `516e592d7b`:

| Item | Commit | Cause found | Fix |
| --- | --- | --- | --- |
| UC-002 `agent-command-correlated-status` | `6d106cb2e4` | `AGENT_STATUS` gained `recoverableBlock`, and `AgentRunBackend` gained the required `compactionRecovery` and `hasRunningBackgroundTasks()` (6908ccff48). The scripted backend lacked both members, so activation failed with "reading 'kind'". | Expect `recoverableBlock: null`; add both members to the double, as the unit doubles have them. |
| UC-003 `standalone-error-termination-lifecycle` | `5f812baa57` | `prepareNewAgentRun` was removed and factories now expose only `beginPreparation`. The manager singleton leaked before cleanup registration, so the second test cascaded. | `beginActivation(...).prepare()` plus publish; `testBackendFactory` fixture; current backend members; cleanup registered as each resource is created. Each test also passes alone. |
| UC-008 `configured-skill-on-demand-loading` | `3aa6eaa717` | The test called the private `createBackend(config, runId)`, whose signature changed ("ownLlm is not a function"). | Build through `beginPreparation({kind:"new",…}).prepare()` and release through the same preparation. |
| UC-005 `memory-sync-multiprocess` | `42965d5043` | The seed was a current Team package with a nested Team, which Team V2 rejects. | One current flat Team package. The nested-layout cases (MP_001 conflict, MP_002 relocation re-sync) are dropped, with the reason in the header. |
| UC-004 `team-run-v1-production-upgrade` | `dc4110b1c6` | The chain now ends at the AgentOrg conversion (`20260901_agent_org_flat_team_families_v1`), but the suite asserted the V2 Team intermediate and restored through the Team API. The ledger part was already fixed upstream in `fa49138794` and is kept unchanged. | Assert the AgentOrg end state on disk and through the Org history, projection, token, restore and collaboration-root APIs. The warning case is classified under REQ-011 below. |
| UC-009 `existing-run-model-config` probe | `3052b836ad` | The fixture answered none of `DelegatedLaunchModelOptions`, `GetAgentRunCollaboration`, `selectionPresentation`, `closedTaskExecutions`, `/rest/health` or the definitions feed. | Answer them with current shapes. The probe now also fails on console errors. |
| UC-010 `interrupt-result-presentation` probe | `c2347175ae` | It sent retired stream shapes and left the definitions feed unserved. The page used the app layout, whose history sync disconnected the fixture runs. It had no script. | Current frames, with Team frames validated by `parseTeamStreamServerMessage`; `layout: false`, like the other fixture pages; a strict GraphQL operation map; the `test:e2e:interrupt-result-presentation` script. |
| UC-011 `run-settings-live` R03 | `40e39d7235` | Client readiness (DI-004) disables Run after the member's definition is deleted, so the server-rejection path was unreachable. | DEC-006 fallback: only the `CreateAgentOrgRun` request gets the server's real failure result; every other request reaches the real backend. AC-003 assertions are kept, and exactly one launch request is asserted. |

Not repaired here:
- **UC-001** `team-run-config-graphql` and **UC-007** `recent-run-projection-graphql`: fixed upstream (`e6ba249a96`/`2e70401f18`/`57d388a7fd` and `149bce0be9`). Verified only: 7/7 and 9/9 pass, twice, on `516e592d7b`. My earlier duplicate commits were dropped.
- **UC-006** `nested-team-history-restart`: **withdrawn at SR-003 (DEC-009).** The suite was removed upstream with a stated reason: `remove-nested-task-team` (merge `8a8d322144`), the user's DEC-008. Its supported parts stay covered by UC-004, `tests/unit/app-data-migrations/team-agent-memory-layout-app-data-migration.test.ts` and `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts`. My earlier repair (`ab4c1dd2bc`, backup branch only) stays out of the branch.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: test files, one new script line and nothing else; `git diff origin/personal..HEAD` shows no production file (see Local Implementation Checks). The remaining scope is smaller than designed.
- Selected route: `Direct API/E2E`. The IR-001 Requirement Gap (UC-006) was resolved by SR-003 (DEC-009: withdrawn); no code change followed.
- Lightweight implementation self-review completed for the direct route: `Yes`
- New design impact or escalation trigger: none. The UC-004 warning case is classified as not a product defect; the Solution Designer accepted that in SR-003 (DEC-010), and RSK-001 is closed.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Flat Team run config suite | upstream `team-run-config-graphql.e2e.test.ts` | Fixed upstream; verified 7/7 ×2 |
| BEH-002 | Current `AGENT_STATUS` payload | `tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | 1/1 ×2 |
| BEH-003 | Activation via `beginActivation`, no cascade | `tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | 2/2 ×2; each test passes alone |
| BEH-004 | Assert the AgentOrg end state; no hard-coded ledger count | `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | 4/4 ×2. Ledger derivation from `fa49138794` kept. RSK-001: no released content lost (members, configs, task records, messages, memory bytes, token accounting) |
| BEH-005 | Current-shape packages only | `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | 1/1 ×2 |
| BEH-006 | Nested history restart | — | Withdrawn at SR-003 (DEC-009); suite removed upstream |
| BEH-007 | Admitted, complete seeded packages | upstream `recent-run-projection-graphql.e2e.test.ts` | Fixed upstream; verified 9/9 ×2 |
| BEH-008 | Public preparation entry | `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | 2/2 ×2 |
| BEH-009 | Fixture answers every operation | `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` | A–F Pass; 0 browser errors; cleanup complete |
| BEH-010 | Current shapes, served boundaries, script | `interrupt-result-presentation-probe.mjs`, `fixtures/interrupt-result-presentation.page.vue`, `package.json` | SR008-BR-001..004 Pass; 0 browser errors; cleanup complete |
| BEH-011 | Server rejection the client cannot pre-check | `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` (R03) | Pass; values kept, Run enabled, history unchanged, 1 launch request, 0 page errors |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (SR-003 scope).

## Key Files Or Areas

The 9 test files above, plus `autobyteus-web/package.json` (1 line). Evidence: `…/evidence/implementation/`.

## Important Assumptions

- R03's injected result uses the server's real `createAgentOrgRun` failure shape (`success:false`, `agentOrgRunId:null`), per DEC-006 (fallback, documented in the case).
- In UC-004, an Org member's token record losing `root_team_run_id` (now `null`/`unknown`) is designed behavior. The flat-Orgs design says an Org must never carry a field that claims a Team root, and the migration re-reads the record to prove the accounting is unchanged. The tokens are still served exactly through `getAgentOrgMemberTokenUsageSummary` (13/8/21).

## Known Risks

- **REQ-011 classification of the UC-004 warning case: not a product defect (synthetic corruption, fail-closed contract).**
  - The seeded `team_run_history_index.json` is `{"not":"a valid history index",…}`: valid JSON, not an array of rows.
  - Every released writer (`4fb78f8646` 2026-03-30 through v1.4.69) replaced the index atomically (temp + rename / `atomicWriteJsonFile`) with an array, so no released build produces this file. Under the design principles it is manual tampering or arbitrary corruption, outside the supported population.
  - The V1 promotion's handling is a generic "unexpected warning; startup may continue" catch, not an explicit supported scenario.
  - The flat-Orgs design explicitly fails closed when the required index structure can't be read (`RESTART_TO_RETRY`, "do not relabel invalid current structure").
  - The test now asserts that contract:
    - flat families `FAILED` with `FAILED_HISTORY` and `RESTART_TO_RETRY`;
    - the released root left as a byte-identical V2 Team package with all original V2 assertions passing;
    - no Org package, and the index bytes kept;
    - token rows unchanged;
    - new current work admitted;
    - a restart retries (attempts 2) and changes nothing else.
  - Evidence: `evidence/implementation/uc004-warning-case-flat-families-failure.txt`, `uc004-warning-case-served-behavior-516e592d7b.txt`.
- **Follow-up (non-blocking, recorded by the Solution Designer as FU-4 for `/project_task_manager`).** While that derived index is unreadable, `listWorkspaceRunHistory` and `listCollaborationRootHistory` fail for every run, standalone runs included, and the state persists across restarts until someone corrects the file by hand. The data is intact and the index is derived. DESIGN.md rule 7 ("contain bad data to its own run") is scoped to one run's data, but one bad shared index taking the whole history list down may deserve a product look (for example, rebuild from admitted packages). This is not this ticket's scope.
- R03 depends on the signed-in `claude` CLI with the real HOME, USER and LOGNAME (RSK-002). It ran successfully here.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (stale tests)
- Reviewed root-cause classification: Legacy or compatibility pressure in test code; production: no design issue found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every fix uses a public boundary or an established fixture pattern (`beginActivation`, `beginPreparation`, `testBackendFactory`, Org APIs, `routeWebSocket`, `layout: false`).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files removed: `Yes`. Examples: the duplicate inline standalone writer (UC-007, now upstream's), the probe's catch-all GraphQL body fields the page no longer requests, and the `harnesses`/`closeStudioServices`/`dataRoot` bookkeeping in UC-003.
- Dead code found elsewhere, listed as follow-up: the `team-run-execution-tree-v1` fixture README says "the repository's V1 package-schema suite validates every case", but no suite enumerates the cases (documentation drift; recorded as FU-5).
- Shared structures remain tight: `Yes`
- Shared design guidance reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`. No source files were changed; the guardrail doesn't apply to test files.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (test-owned data roots only). Released-shape fixtures are unchanged; no new fixture remains after dropping UC-006.

## Environment Or Dependency Notes

- After each rebase: `pnpm -C autobyteus-server-ts prebuild && build` (exit 0). The lockfile is unchanged since `db00ba16a9`.
- Server e2e: `env -i PATH HOME=<tmp> TMPDIR pnpm exec vitest run --no-watch <files>` from `autobyteus-server-ts`.
- Probes: clean env with a temp HOME and a fresh `--output-dir`. R03 uses the real HOME/USER/LOGNAME (signed-in CLIs) with a probe-owned temp data root; `~/.autobyteus` was never touched.

## Local Implementation Checks Run

- Server e2e on `516e592d7b`, 7 files / 26 tests, run twice: all pass. Logs: `evidence/implementation/server-e2e-516e592d7b-run1.plain.log`, `…-run2.plain.log`.
- Probes (once each, on `66429d6f31` and again on `516e592d7b`): existing-run-model-config A–F Pass; interrupt-result-presentation SR008-BR-001..004 Pass; run-settings-live `--cases R03` Pass. Each has 0 browser errors and a complete cleanup receipt (`evidence/implementation/probes/`).
- `pnpm -C autobyteus-server-ts typecheck`: pass. `pnpm -C autobyteus-server-ts test:unit`: 715 files / 5811 tests pass (`evidence/implementation/server-test-unit-516e592d7b.summary.txt`).
- `git diff --name-only origin/personal..HEAD -- . ':!tickets'`: only `tests/` files and `autobyteus-web/package.json` (+1 script line). No production file changed (REQ-010, AC-012).
- Commits: one per item, each labelled a baseline fix naming the test and cause (REQ-012).

These are implementation-scoped checks, not API/E2E sign-off.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no UI change. The three probes only observe existing UI. Their rendered results were inspected through probe assertions, DOM snapshots on failure, and screenshots in the evidence.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run the 7 server files twice in a clean env, and the three probes once with fresh output dirs; R03 needs the signed-in CLIs.
- UC-003: also run each test alone (`-t`).
- UC-004: confirm the warning-case classification evidence and the AgentOrg end-state reads.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E validation of AC-001..AC-005 and AC-007..AC-012 (AC-006 withdrawn at SR-003). AC-001 and AC-007 cover upstream fixes and are verify-only.
