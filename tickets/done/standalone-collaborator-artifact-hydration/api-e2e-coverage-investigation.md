# API/E2E Coverage Investigation

`<T>` = `/home/autobyteus/workspace/.codex/worktrees/standalone-collaborator-artifact-hydration/tickets/in-progress/standalone-collaborator-artifact-hydration`

## Investigation Meta

- Requirements Doc: `<T>/requirements-doc.md` (SR-001; REQ-001..REQ-003, AC-001..AC-005)
- Investigation Notes: `<T>/investigation-notes.md`
- Solution Revision Record: `<T>/solution-revision-record.md`
- Design Spec: `<T>/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `<T>/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `<T>/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `<T>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `<T>/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: IR-001 from `/implementation_engineer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Collaborators of a standalone (Agent-root) run must show every recorded artifact after a reload and on historical host runs, and each must preview (REQ-001; AC-001, AC-002). This covers a collaborator Agent and the members of a collaborator Team. Live rows are kept (REQ-002/AC-003, unit). Standalone, Team and Org behavior and the collaborator failure policy are unchanged (REQ-003; AC-004, AC-005 unit). ASM-001 (open) says the server resolves collaborator run IDs for `getRunFileChanges` and `/file-change-content`; if it fails, that is a Design Impact. The design routes `stageAgentRunCollaborationContext` through the shared `memberRunStateHydration` owner, the same way Org does. The change is frontend-only.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (active host, reload), SCN-002 (historical host); SCN-003 (live race) is unit-only by its stated verification intent
- Real-use scenarios added:
  - collaborators brought in through the user's `@` mention (Agent and Agent Team), the real admission path
  - a collaborator-Team member that is not its coordinator
  - a non-producing collaborator member showing no rows
- Unsupported/contrived: AC-005's trigger is an infrastructure fault; it is unit-only.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 collaborator hydration | Changed (fixed) | REQ-001 | Browser AC-001/AC-002 + unit |
| ASM-001 server resolution of collaborator IDs | Assumption | requirements ASM-001 | Live GraphQL/REST + browser previews |
| BEH-002 live rows | Preserved | REQ-002 | unit (AC-003) |
| BEH-003 Standalone/Team/Org | Preserved | REQ-003 | browser regression + suites |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | ASM-001 server resolution | Live API |
| API / transport / contract | No change; consumer | `getRunFileChanges`, `/file-change-content` for collaborator IDs | none | ASM-001 | Live API + Browser |
| Frontend component / state | Yes | collaborator staging, store, streaming service | new spec (6) + related | real Apollo/store wiring | Browser |
| Browser integration / user journey | Yes | collaborator Artifacts after reload/history | none | AC-001/AC-002 (Browser E2E) | Browser |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (renderer) | same | — | same | Browser |
| Desktop shell | No | — | — | — | — |
| Process / lifecycle | Yes (UI) | reload, host terminate → history | unit | real | Browser |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | Minor | live vs. commit | unit | — | — |
| External integration | Emulated | AGY CLI | fixture | — | — |

## Project Execution Discovery

- Worktree: `/home/autobyteus/workspace/.codex/worktrees/standalone-collaborator-artifact-hydration` (branch `codex/standalone-collaborator-artifact-hydration`, `f92a55439` on `0d3e6e82f`)
- Testing guideline: `TESTING.md`; `autobyteus-server-ts/AGENTS.md`
- Instruction gaps: `pnpm` is not on PATH (`/tmp/pnpm-shim`). The server had to be built in this worktree.
- Secrets: N/A

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | layers, rules | browser for renderer client–server behavior; never touch the user's app/data |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | collaborator mechanics | bring-in via `send_message_to` or `@`; collaboration tree at `memory/agents/<run>/collaboration/collaboration_tree.json`; root stream `/ws/agent-collaboration/<host>` |
| `src/services/agent-streaming/agent-stream-handler.ts`, `agent-collaboration-stream-handler.ts` | command shapes | `SEND_MESSAGE.mentions[{kind, definition_id}]`; collaboration commands with `root_subject_kind: "agent"`, `root_run_id: <host>`, `target_agent_run_id` |
| predecessor harness `tickets/done/collaboration-member-artifact-hydration/api-e2e-evidence/harness/` | owned stack + fake-AGY wrapper | reused; sender extended for the collaboration socket and mentions |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built backend + Nuxt dev + fake AGY wrapper | worktree | `prebuild`, `build`; `node harness/launch.mjs <worktree> main` | owned `/tmp/scah-browser-main-*`; scratch `/tmp/scah-api` (not `/tmp/scah`, which holds the implementer's files) | `/rest/health`, Nuxt `/` | SIGTERM by exact PID |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Host "Host Planner"; collaborator Agent "Illustrator"; collaborator Team "Art Studio" (`art_lead`, `painter`) | GraphQL definitions; standalone run; `@` mentions in a real `SEND_MESSAGE` | owned data only | removed with the owned dir |
| Collaborator images | real collaboration-socket `SEND_MESSAGE` targeting each collaborator; wrapper-planted AGY outputs | owned HOME | removed |
| Regression Team/Org | `harness/setup.py` (label `r`) | owned | removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `services/agentCollaboration/__tests__/agentRunCollaborationHydration.spec.ts` (new, 6) | active/historical incl. collaborator-Team members, live race, conflict, released ownership, AC-005 | AC-001..AC-003, AC-005 | Still Valid | pass; fails on base per IR-001 | Keep |
| renamed `commit` specs (store, closure, streaming), `teamRunOpenCoordinator.spec.ts` | rename coverage | REQ-003 | Still Valid | pass | Keep |
| `services/runHydration`, `runOpen`, `agentOrgExecution`, `agentCollaboration` suites | Team/Org/standalone hydration | AC-004 | Still Valid | pass except the pre-existing file below | Keep |
| `services/runHydration/__tests__/teamTaskApprovalHydration.spec.ts` | Team task approval | — | Out Of Scope (pre-existing) | 18/18 fail on base `0d3e6e82f` too | Not changed |

## Durable Coverage To Add / Update / Remove

None by API/E2E. The browser journeys stay temporary: they reuse the predecessor's temporary harness, and the boundary is deterministically covered by the new unit spec.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt <changed specs> services/agentCollaboration services/runHydration services/runOpen services/agentOrgExecution stores/__tests__/agentRunCollaboration --run` | worktree | AC-001..AC-005 unit; AC-004 regression | 221/239. 18 fail, all in `teamTaskApprovalHydration.spec.ts` | `api-e2e-evidence/web-specs.log` |
| 2 | same file on base `0d3e6e82f` (temporary `git checkout 0d3e6e82f -- autobyteus-web`, restored, 0 diff) | worktree | pre-existing check | 18/18 fail on base | `api-e2e-evidence/web-base-preexisting.log` |
| 3 | server `prebuild` + `build` | worktree | built backend | exit 0 | console |

## Test-Case Ledger Decision

- Ledger required: `Yes` (several browser journeys on one owned stack, plus a source swap): `<T>/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | unit for every AC | AC-001/AC-002 require Browser; ASM-001 open | Browser + live API |
| Changed-boundary execution directness | 80% | real services, doubles | real Apollo/store | Browser |
| Cross-boundary integration realism and mock gap | 70% | — | ASM-001 server resolution unverified | Live API |
| Environment, configuration, identity, and fixture fidelity | 85% | — | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | race/conflict/release/failure unit | real history | Browser |
| User-surface, browser, and desktop-shell confidence | 60% | — | no UI run | Browser |
| Durable regression coverage quality and relevance | 95% | new spec fails on base | — | — |

- Overall post-repository confidence: 81%
- Categories below 90%: requirement, directness, realism, environment, user-surface
- Broader validation decision: `Required`

## Broader Validation Decision (Mandatory)

- Decision: `Required`; mode: Browser + Live API on an owned real stack
- Gap: AC-001/AC-002, ASM-001, AC-004 UI regression
- Expected confidence after: ≥ 95%

## Desktop Application Validation Decision (When Applicable)

- Web-equivalent renderer only; no shell change. The user's running server was not touched.

## Live Environment And Fixture Plan

- Stack and fixtures as in § Project Execution Discovery.
- Journeys:
  - B-001: AC-001, active host, fresh load: Illustrator, `painter`, `art lead` empty
  - API-001: ASM-001, list and REST for collaborator IDs, active and inactive
  - B-002: AC-002, terminate host, fresh load, collaborators
  - M-001: base-frontend swap, then restore
  - B-003: AC-004, standalone host historical; Team member and Org nested member active
- Evidence: DOM assertions (list rows, own-conversation path, blob preview, 64 px, no "File not found"), screenshots, logs.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| B-001..B-003, API-001, M-001 | `api-e2e-evidence/harness/*` + browser tools | AC-001, AC-002, AC-004, ASM-001 | temporary harness; deterministic unit coverage exists |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-003 live race in a browser | Verification intent is unit; the interleave is not controllable | Low | None |
| AC-005 in a browser | infrastructure-fault trigger | Low; unit | None |
| Agent-initiated bring-in via `send_message_to` | Same collaborator admission and hydration owner as `@`; the hydration under test does not depend on how the collaborator was admitted | Low | None |
| FUP-001 (server cost / eager loading) | Out of scope | — | Solution Designer follow-up |

## Ambiguities Or Reroute Triggers

None. ASM-001 holds (see the execution report).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Durable coverage changes: `No`
- Post-repository confidence: 81%
- Broader validation: `Required`; executed. Final result: Pass, 96%.
- Reroute Required: `No`
