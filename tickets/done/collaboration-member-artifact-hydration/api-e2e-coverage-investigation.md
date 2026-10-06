# API/E2E Coverage Investigation

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration/tickets/in-progress/collaboration-member-artifact-hydration`

## Investigation Meta

- Requirements Doc: `<T>/requirements-doc.md` (SR-003; approved basis REQ-001..REQ-004, AC-001..AC-007; REQ-005 withdrawn; REQ-006/AC-008 pending, out of scope)
- Investigation Notes: `<T>/investigation-notes.md`
- Solution Revision Record: `<T>/solution-revision-record.md`
- Design Spec: `<T>/design-spec.md` (SR-003)
- Supplemental Task Artifacts: `<T>/design-principles-recheck.md`; predecessor evidence `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/run-file-change-live-projection-ownership/` (read-only)
- Design Review Report: `<T>/design-review-report.md` (ARCH-REV-001, Pass)
- Architecture Review Revision Record: `<T>/architecture-review-revision-record.md`
- Implementation Handoff: `<T>/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `<T>/implementation-revision-record.md`
- Code Review Report: `<T>/code-review-report.md` (CRR-001, Pass 9.4/10)
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `<T>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `<T>/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass from `/code_reviewer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` by route. API/E2E added no durable test code, so the review scope is the API/E2E evidence only.

## Current Requirement And Design Basis

After a page reload on an active run, and on historical runs, a Team member's or Agent Org member's Artifacts list must contain every artifact the server recorded for that member run, and each must preview (REQ-001, REQ-002). This includes members of an Org's nested Team. Live `FILE_CHANGE` rows must never be dropped, duplicated or reverted by hydration (REQ-003). Standalone behavior is unchanged (REQ-004). AC-007 (an artifact fetch failure follows the path's projection failure policy) is unit-only; its trigger is an infrastructure fault (MP-001), not a supported scenario. The design adds one shared member-run state owner (`memberRunStateHydration.ts`) used by Team open, Team lazy and Org staging. The change is frontend-only, and persisted data is `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (Team, active, reload), SCN-002 (Team, historical), SCN-003 (Org, active, reload, incl. nested-Team member), SCN-004 (Org, historical), SCN-005 (live `FILE_CHANGE` around hydration)
- Real-use scenarios added:
  - RU-001: a non-producing member (the coordinator) shows no artifacts, so nothing leaks across members.
  - RU-002: a member hydrated mid-turn, after which later images arrive live while the member is displayed.
- Not tested: SCN-006/AC-008 (pending, out of scope). AC-007's infrastructure-fault trigger is `Technically Possible but Unsupported` as a product scenario (MP-001), so it stays unit-only.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/BEH-002 Team member hydration | Changed (fixed) | REQ-001; DS Team open/lazy | Browser AC-001, AC-002; existing new unit specs |
| BEH-003 Org member hydration (incl. nested) | Changed (fixed) | REQ-002; DS-003 | Browser AC-003, AC-004 |
| BEH-005 live rows | Preserved | REQ-003 | Browser RU-002 + near-concurrent reload; unit race ordering |
| BEH-004 standalone | Preserved (fetch helper reused) | REQ-004 | Browser AC-006; unit |
| AC-007 failure policy | Preserved per path | AC-007 | Unit only (MP-001) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No (consumer of unchanged `getRunFileChanges`) | — | — | Real server answers for Team/Org member IDs | Browser on a real stack |
| Frontend component / state | Yes | hydration services, stores (6 call sites) | 17 changed specs (Apollo doubles) | real Apollo, real stream, real store wiring | Browser |
| Browser integration / user journey | Yes | Artifacts tab for members after reload/history | none | AC-001..AC-004 explicitly require Browser E2E | Browser |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (renderer) | same | — | same | Browser (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (UI lifecycle) | reload, history open, stream recovery | unit | real reload/history | Browser |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | Minor | live stream vs hydration commit ordering | unit race specs | real interleave | best-effort live on Browser |
| External integration | Emulated | AGY CLI | project fake CLI | — | — |

## Project Execution Discovery

- Worktree: `/home/autobyteus/workspace/.codex/worktrees/collaboration-member-artifact-hydration` (branch `codex/collaboration-member-artifact-hydration`, commit `404ec96da` on `db39803d4`)
- Stack: Nuxt web (`autobyteus-web`, Vitest), Fastify/GraphQL server (`autobyteus-server-ts`), Node v22.23.3
- Testing guideline: `TESTING.md` (worktree root); `autobyteus-server-ts/AGENTS.md`. No closer `TESTING*.md`.
- Instruction gaps: `pnpm` is not on PATH, so I used `/tmp/pnpm-shim`. The server `dist` had to be built in this worktree (`prebuild`, `build`).
- Secrets: N/A (fake AGY CLI)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Choosing the path, Rules | renderer client–server behavior → browser probe; never touch the user's app/data; stop what you start | — |
| predecessor `api-e2e-evidence/browser/launch.mjs` | owned built-backend + Nuxt stack | adapted into `<T>/api-e2e-evidence/harness/launch.mjs` |
| `tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` | Org definition/run GraphQL shapes | `CreateAgentOrgDefinitionInput.members[refType AGENT/AGENT_TEAM]`, `getAgentOrgRunConfig` tree |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | Org command shape | `SEND_MESSAGE` with `root_subject_kind/root_run_id/target_agent_run_id/command_id` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built backend | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts prebuild && build`; launcher runs `node dist/app.js --data-dir <owned>` | owned SQLite/HOME/data; free port | `/rest/health` | launcher SIGTERM by exact PID → process group → rm owned dir |
| Nuxt dev | `autobyteus-web` | launcher `pnpm exec nuxt dev` with `BACKEND_NODE_BASE_URL` | free port | `GET /` | same |
| Fake AGY CLI | — | project fixture `tests/fixtures/agy-failure-cli.mjs` via temporary wrapper `harness/agy-member-wrapper.mjs` | per-process conversation, distinct-colour PNGs, optional gate | launch log `agy-launches.jsonl` | exits with the backend |
| Browser | — | AutoByteus browser tools | headless | DOM | `close_tab` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Team (lead coordinator + creator), Org (designer + nested Team `eng`: lead, creator), standalone run | public GraphQL (`harness/setup.py`) | owned data only | removed with the owned dir |
| Generated images | wrapper plants AGY-format step outputs + PNGs under the owned HOME | never `~/.gemini` | removed with the owned dir |
| Image turns | real WebSocket commands (`harness/send.mjs`): `/ws/agent-team`, `/ws/agent-org`, `/ws/agent` | same protocol as the web client | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `services/runHydration/__tests__/memberRunStateHydration.spec.ts` (new) | owner ordering, conflict writes nothing, parallel fetch failure | REQ-003, AC-005, AC-007 | Still Valid | pass | Keep |
| `teamRunContextHydrationService.spec.ts`, `teamMemberProjectionHydrationService.spec.ts`, `teamRunOpenCoordinator.spec.ts` | Team open/lazy artifacts, best-effort non-focused member | AC-001, AC-002, AC-005, AC-007 | Still Valid | pass | Keep |
| `agentOrgContextHydration.spec.ts`, `agentOrgStreamingService.spec.ts`, `stores/__tests__/agentOrgInspection*.spec.ts` | Org staging incl. nested lead; Apollo open path | AC-003, AC-004, AC-007 | Still Valid | pass | Keep |
| `runContextHydrationService.spec.ts` | standalone unchanged | AC-006 | Still Valid | pass | Keep |
| harness updates (`test-support/agentOrgApolloFixture.ts`, Apollo-double branches in 4 specs, renames) | test doubles answer the new query | — | Still Valid | pass | Keep |
| `stores/__tests__/workspaceSelectionComposition.spec.ts` › "publication-only snapshot/status/input preserves Org route…" | Org route selection | not changed by this ticket | Out Of Scope (pre-existing) | fails identically on base per implementer and reviewer; not re-run on base by me | Not changed |

## Durable Coverage To Add

None. The implementation's unit and integration specs cover the boundary deterministically, and every new Team/Org test fails on base per IR-001/CRR-001.

The browser journeys stay temporary. Reasons:
- they need a temporary per-process wrapper around the fake AGY CLI and an owned built stack;
- the repository has no member-hydration browser probe to extend;
- a durable probe would duplicate the unit layer for a pure store-hydration change.

Recommendation, non-blocking: if Team/Org UI regressions recur, promote `harness/` into an `autobyteus-web/tests/e2e` probe.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt <17 changed spec files> --run` | worktree, `PATH=/tmp/pnpm-shim:$PATH` | unit/integration (Apollo doubles) for AC-001..AC-007 | Pass 227/228. The one failure is the pre-existing `workspaceSelectionComposition` case | `<T>/api-e2e-evidence/web-changed-specs.log` |
| 2 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | worktree | built backend for the stack | exit 0 | console |

## Test-Case Ledger Decision

- Ledger required: `Yes`. The run has multiple independent browser journeys on one long-running owned stack, plus a temporary source swap.
- Path: `<T>/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Unit coverage for every AC | AC-001..AC-004 require Browser E2E | Browser |
| Changed-boundary execution directness | 80% | real services, Apollo doubles | real Apollo/stream/store not exercised | Browser |
| Cross-boundary integration realism and mock gap | 75% | — | server answers for member IDs not exercised by these specs | Browser on a real stack |
| Environment, configuration, identity, and fixture fidelity | 85% | — | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | conflict/race/failure unit specs | real reload/history | Browser |
| User-surface, browser, and desktop-shell confidence | 60% | — | no UI run | Browser |
| Durable regression coverage quality and relevance | 95% | new tests fail on base | — | — |

- Overall post-repository confidence: 81%
- Calculation method: simple average, with each category checked against the 90% floor
- Every critical AC directly proven: `No`
- Categories below 90%: requirement proof, directness, realism, environment, user-surface
- 95% target met: `No`
- Material residual risks: real UI hydration across Team/Org/nested paths

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (web-equivalent renderer) against an owned real stack
- Gap addressed: AC-001..AC-004 (explicitly Browser E2E), AC-006 regression, SCN-005 live behavior on the real stream
- Why: only a real renderer + backend exercises real Apollo queries, the real member IDs, the real stream and store wiring
- Expected confidence after: ≥ 95%
- Browser-specific decision: required. No Electron-shell change.

## Desktop Application Validation Decision (When Applicable)

- Web-equivalent renderer only. No shell change. The user's running app (`:8000`, `/home/autobyteus/data`) was not touched.

## Live Environment And Fixture Plan

- Startup: build server, then `node harness/launch.mjs <worktree> main` (migrate → backend → Nuxt dev)
- Fixtures: `harness/setup.py` (labels `b` main, `c` and `d` gated race runs; `a` was a failed first attempt, terminated); images via `harness/send.mjs` over the real WebSockets
- Journeys:
  - AC-001: active Team, fresh load, non-coordinator member
  - RU-001: coordinator shows no artifacts
  - AC-003: active Org, fresh load, `/designer` and nested `/eng/creator`
  - AC-006: standalone fresh load
  - AC-005: near-concurrent reload (Team `c`)
  - RU-002: live after hydration (Team `d`)
  - AC-002: historical Team
  - AC-004: historical Org, both members
  - Mutation check: base `autobyteus-web` on the same stack, then restore
- Evidence: DOM assertions (list rows from the Artifacts list only, viewer path conversation, blob src, `naturalWidth` 64, no "File not found"), screenshots, backend/frontend logs, launch log
- Cleanup: launcher SIGTERM by exact PID; `close_tab`; restore `autobyteus-web` to HEAD

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| B-001..B-009 | `harness/*` + browser tools | AC-001..AC-006 in the real UI | See § Durable Coverage To Add |
| M-001 | `git checkout db39803d4 -- autobyteus-web` on the live Nuxt dev, then restore | the journeys detect the defect | mutation check |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-007 in a browser | Trigger is an infrastructure fault (MP-001), not a supported scenario | Low; unit-covered per path | None |
| Exact in-flight interleave (FILE_CHANGE between member fetch and commit) | Not controllable on a real stack | Low; deterministic unit race specs; real near-concurrent run correct | None |
| Team/Org stream-recovery path in a browser | Requires forcing a socket drop | Low; unit-covered; same owner as open | None |
| REQ-006 collaborators | Pending user decision | — | Solution Designer |
| Packaged Electron | No shell change | Low | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Durable coverage added/updated/removed: `No`
- Post-repository confidence: 81%
- Broader validation decision: `Required` (Browser); executed. Final result: Pass, 96% (see the execution report).
- Reroute required: `No`
