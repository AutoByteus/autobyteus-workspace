# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` (`SR-005`)
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` (`SR-002`–`SR-005`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md` (`ARCH-REV-005` pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-handoff.md` (`IR-004`)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md` (`CRR-004` pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2` (first investigation on the complete expanded basis)
- Trigger: `code_reviewer` passed `CRR-004` for `IR-004` and requested a fresh investigation plus realistic multi-boundary team-stream, lifecycle, failure, reconciliation, interrupt, aggregate-removal, and preserved companion/batching execution.
- Prior Investigation Reviewed: `Round 1 / SR-002 agent-only basis`; it never reached a completed API/E2E result and was explicitly superseded by the user-approved team expansion. Its held test edits and logs are inputs to classify, not sign-off.
- Latest Authoritative Investigation: `Round 2 / SR-005` (this file)

## Current Requirement And Design Basis

The changed product model has four deliberately separate subjects:

1. An exact agent/member run owns only `offline | initializing | idle | running | error`; `running` is the public interruptible-current-turn state. Every final non-status agent event has exactly one canonical `AGENT_STATUS` companion, with current activity status before the event and terminal status after the boundary. Current/retired turn identity prevents late A from reopening idle or disturbing B. Connect/reconnect uses the same canonical state.
2. A reusable team definition owns no runtime status or status visual.
3. A root team run owns only manager-derived `isActive`. The live stream contract is `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`; no root/nested aggregate `TEAM_STATUS`, five-state team DTO, frontend `AgentTeamStatus`, or team `currentStatus` compatibility path may remain. Socket subscription and local `stopPending` are separate.
4. Task stage, explicit failure, and private open-work settlement remain owned by their task/failure/work mechanisms. Aggregate removal must not silently remove cleanup, failure observation, or settlement safety.

For a supported `root -> ordinary subteam(s) -> task team -> leaf` path, every source/member/logical-team coordinate crossing a team boundary must be in the enclosing `TeamRun` frame. Live and initial/reconnect mapping must produce the same exact transient leaf, concretely `task-team-run-7/review_group/critic`, with no mapper/frontend fallback. Exact-member interrupt routing must use that selected execution identity.

Critical direct proof is required for REQ-001–REQ-019 and AC-001–AC-025. The highest-risk boundaries are real WebSocket ordering/shape, root binary lifecycle convergence and disconnect independence, multi-boundary live/reconnect identity parity, Stop success/failure/pending, task cleanup/open-work after aggregate removal, exact interrupt routing, and preservation of agent companion batching.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001–BEH-005 / exact agent lifecycle and composer action | Changed and preserved through expansion | REQ-001–REQ-012, AC-001–AC-015; `SR-002`; `IR-001`/`IR-002`; `CRR-004` | Reconcile the three held agent API/integration edits; re-prove cross-runtime real-socket companions, terminal/reconnect/late-turn behavior, and click/Enter/store interrupt admission. |
| BEH-006 / definition runtime status | Removed | REQ-013; AC-016; user evidence; `SR-003` | Mounted UI/history coverage must prove no definition status field/dot for zero/mixed runs; obsolete aggregate fixtures must not be retained. |
| BEH-007 / root team lifecycle | Changed | REQ-014/015/018; AC-017–020/024; `DS-008`; `IR-003` | Add a real team WebSocket lifecycle scenario proving listener-before-read convergence, active independent of member phase/deltas/socket, accepted termination inactive, and failed termination remains active. |
| BEH-008 / Stop and team presentation | Changed | REQ-016/018; AC-017/018/022/023 | Re-run direct store/component coverage for `isActive && !stopPending`, duplicate prevention, failure recovery, inactive history actions, and no five-state root visuals. |
| BEH-009 / nested task-team stream coordinate frame | Changed by `SR-005` | REQ-015/017/019; AC-020/021/024/025; `CODE-FIND-002`; `IR-004` | Add durable real-socket live/reconnect proof that crosses task-team plus ordinary boundaries and resolves identical exact leaf identity; assert strict invalid-scope rejection and no `TEAM_STATUS`. |
| Former aggregate consumers | Changed | REQ-019; AC-025; design DS-011/012 | Execute task delegation/reconciliation integration, member failure observation, and private open-work settlement/failure/cancellation scenarios. |
| Agent companion presentation batching | Preserved | REQ-003/010; `CODE-FIND-001`; `IR-002`; `CRR-004` | Re-run companion-interleaved fake-timer suites and retain a one-status-per-final-event server trace; status must not flush pending content. |
| Public agent interrupt bit and team aggregate contract | Removed | Clean-cut constraints; AC-009/020; legacy removal checks | Fresh repository scans and wire assertions must prove absence of `can_interrupt`, `TEAM_STATUS`, `AgentTeamStatus`, and team `currentStatus` rather than protect compatibility paths. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Agent turn state; manager team lifecycle; task-team scope rebasing; private open work | Reviewed unit suites | Real handler/socket composition and lifecycle timing | Real Fastify/WebSocket integration |
| API / transport / contract | Yes | Status-only agent companions; binary team lifecycle; scoped leaf identity; aggregate deletion | Mapper/handler/snapshot units | Serialized order/volume, reconnect, no-legacy wire fields | Real WebSocket integration and live-provider probes |
| Frontend component / state | Yes | Agent primary action; root `isActive`; `isSubscribed`; `stopPending`; exact scoped leaf resolution | Mounted Vue, Pinia, service fake-timer tests | Full server/client session composition | Focused renderer tests plus live API; browser only if a gap remains |
| Browser integration / user journey | Yes | Web-equivalent definition/root/member action presentation | Production component mounts and store/service integration | No authenticated live team fixture | Browser considered after repository/live API evidence |
| Authentication / session / permissions | No material change | Existing local WebSocket authorization and exact target validation are reused | Existing handler/integration coverage | Live provider capability/account availability | Provider preflight; do not fabricate availability |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | Mounted production components | Actual packaged renderer not directly run | Browser only if material renderer gap remains |
| Desktop shell / Electron-specific integration | No | No IPC/preload/window/package change | N/A | None | None |
| Process / lifecycle | Yes | Agent start/interrupt/terminal/reconnect; team register/terminate/stale/reconnect | Unit and integration fixtures | Provider timing and live socket teardown | Lifecycle integration and gated live runtimes |
| Persisted-data transition | Yes, semantic contract only | Existing history data remains directly usable; live facts are recomputed | History/open/recovery tests | Representative current reader after aggregate removal | Run history/resume integration; no migration |
| Worker / queue / distributed coordination | Yes | Serialized AgentRun publication and recursive mixed-team bridge | AgentRun/bridge unit coverage | Cross-boundary delivery under real socket | Real WebSocket integration |
| External integration | Yes | Native AutoByteus, Codex, Claude runtime adapters | Runtime projector/converter/backend tests and gated E2E files | Actual provider credentials/processes may be unavailable | Project preflight and available targeted live E2E |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript Fastify + `ws` server and Vitest; Nuxt/Vue/Pinia frontend with Vitest/Vue Test Utils; Electron wraps the same renderer.
- Conflicting, missing, or unclear project instructions: None. One-shot Vitest flags are mandatory. The prior evidence directory contains an intentionally stale failed run and must be retained separately from fresh SR-005 evidence.
- Required environment variables or secrets available: `Unclear` until the project live-provider preflight runs. No secret value will be read or recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/autobyteus-server-ts/AGENTS.md` | Closest server instruction | `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; never use watch mode. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/autobyteus-web/AGENTS.md` | Closest frontend instruction | `pnpm test:nuxt <paths> --run`; prefer browser only for a remaining web-equivalent gap. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/README.md` | Root development/E2E authority | `pnpm test:e2e`; `pnpm test:e2e:real:preflight`; `pnpm dev` owns backend 8000/frontend 3000. |
| `autobyteus-server-ts/package.json` / `autobyteus-web/package.json` | Build/test scripts | Server TypeScript build; frontend Nuxt tests/typecheck. |
| `test-support/live-e2e/run-live-e2e.mjs` | Provider preflight | Runs isolated test-owned server and reports unavailable providers as unavailable/skipped. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Deterministic server tests | worktree root | Focused `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | Test-owned SQLite/temp/loopback ports | Vitest result | Harness `finally` closes sockets/apps |
| Frontend tests | `autobyteus-web` | `pnpm test:nuxt <files> --run` | Happy DOM/Vue Test Utils/fake timers | Vitest result | Test teardown |
| Server build/typecheck | worktree root | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false` | No service | exit status | N/A |
| Real-provider preflight | worktree root | `pnpm test:e2e:real:preflight` | Isolated owned runtime/data | Capability report | Runner cleanup |
| Optional live provider E2E | worktree root | Environment-gated targeted repository test | Only when preflight reports usable | Test-defined signal | Existing test teardown |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Standalone agent lifecycle | Scripted `AgentRunBackend` inside real Fastify/WebSocket test | In-memory plus ephemeral port | Close socket/app |
| Root/ordinary/task-team/leaf identity | Existing `TaskTeamStreamScope` builder and mixed bridge adapters applied across two boundaries into real socket handler | No production data; exact IDs from reviewed example | In-memory only |
| Root team lifecycle | Test-owned manager double or real `AgentTeamRunManager` with exact listener/snapshot | Does not touch installed desktop server | Listener/socket/app cleanup |
| Stop failure/pending | Existing manager and frontend store fixtures | In-memory; deterministic promises | Test teardown |
| Provider execution | Existing env-gated fixtures | Use only isolated test state; never installed-user state | Existing suite cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: Existing team/run metadata, transcripts, identities, task records, and termination history remain readable. History/resume returns manager-derived `isActive` and leaf status without requiring root aggregate status or an agent interrupt bit.
- Evidence planned: current run-history and team-resume integration/unit suites; source/wire obsolete scans; reconnect of the same root/leaf fixtures; no migration command or compatibility branch.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: `No`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` held edit | Cross-runtime standalone companion order/volume, retired turns, error/offline, plus old simple team member socket | REQ-001–012/017; AC-003–012/015/021 | Needs Update | Standalone scenarios use current `AgentRun` gateway and remain relevant. Its team harness still implements removed `getStatusSnapshot/getMemberStatusSnapshots`, expects `TEAM_STATUS`, and has no manager lifecycle/task-team scope. | Retain/re-run standalone cases; replace the obsolete team scenario with current root lifecycle + multi-boundary scoped leaf live/reconnect socket coverage. |
| `tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` held edit | Offline -> initializing -> restored current-turn running over real socket | REQ-001/002/011; AC-012/015 | Needs Update | Held edit already moved to lifecycle source batches/status-only payload, but it predates SR-005 execution and has not been validated against current HEAD. | Reconcile current interfaces, retain the agent-only journey, run focused and broader E2E. |
| `tests/integration/agent/agent-websocket.integration.test.ts` held edit | Real socket command/restore/duplicate/error/active-only behavior | REQ-001/002/009/011; AC-009/012–014 | Needs Update | Field removal is correct, but fresh prior execution found the restored fake remained `idle` while its accepted ACK expected `running`; fixture must produce authoritative turn-start evidence rather than assert from an idle-only double. | Make the fake's accepted send establish current running evidence/status; retain command journeys and status-only assertions. |
| `tests/integration/agent/agent-team-websocket.integration.test.ts` | Exact member interrupt/run guards and invalid-target handling | REQ-014/017/018; AC-002/019/021 | Needs Update | Fresh SR-005 execution failed six scenarios before their assertions because every fake team run lacks `getLeafAgentStatusSnapshots()` and the handler now requires manager lifecycle snapshot/subscription. The journeys remain valid; the setup is stale. | Add current leaf snapshot and manager lifecycle fixture methods, retain exact command/restore/error journeys, and rerun. |
| `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Create/register/restore/delivery/stale/termination integration | REQ-014/018; AC-017/018/024 | Needs Update | The first fresh execution failed seven parameterized/scenario cases because the test still called `createTeamRun(config)` without the now-required exact `teamRunId`. After deterministic IDs were supplied, the focused stale-fixture rerun passed every other updated file and exposed only the four parameterized factory assertions: the current manager intentionally forwards `(config, teamRunId)`, while the fixture still asserts a one-argument factory call. | Supply deterministic run IDs and assert the current exact two-argument backend-factory call; preserve the manager lifecycle journeys. |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` task-team settlement | End-to-end task-team ingress/revision/settlement/cleanup/sequential delegation | REQ-019; AC-025 | Needs Update | Fresh execution reached settlement but its fake backend lacks `hasOpenExecutionWork()` and the trigger still calls removed `publishTeamStatus("idle")`; one unhandled rejection confirms obsolete aggregate coupling in the fixture. | Give the fake backend explicit open-work state/predicate and trigger settlement through a non-aggregate child event/wakeup while retaining the complete task journey. |
| `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` fake team scenario | Claude adapter team interrupt/follow-up over real WebSocket | REQ-017/018; AC-002/015/019/021 | Needs Update | Four standalone fake-SDK scenarios remain valid, but the team scenario timed out because its fake team manager lacks `getLeafAgentStatusSnapshots()`; connection failed before provider assertions. | Update only the fake team manager/snapshot lifecycle fixture; retain the env-gated actual-Claude scenario unchanged. |
| Manager lifecycle unit + handler lifecycle tests | Registration/termination/rejection/replacement/stale/idempotency and listener-after-event-teardown | REQ-014/018; AC-017–019/024 | Still Valid | Directly asserts the new authority and lifecycle message behavior. | Re-run in focused server set; supplement with real socket. |
| Mixed bridge + snapshot mapper/service tests | Target-frame override, retained-scope rebase, all event kinds, repeat nesting, strict invalid leaf, exact live/reconnect shape | REQ-017; AC-021 | Still Valid | Added by IR-004 for CODE-FIND-002 and source-reviewed in CRR-004. | Re-run; compose them with the real socket rather than duplicate algorithms in a temporary probe. |
| Task delegation integration and settlement/unit/service tests | Task terminal/revision/sequential delegation, private open work, failure observation | REQ-019; AC-025 | Still Valid | No public aggregate dependency; tests cover the intended replacement facts. | Run task-delegation integration plus focused unit cases, including rejection/failure/cancellation where present. |
| Run history/team open/recovery unit and integration tests | Manager-derived `isActive`, member snapshots, socket-state separation | REQ-014/018/019; AC-019/024/025 | Still Valid | Current source/contracts have removed root status and preserve leaf state. | Re-run server history plus frontend history/open/recovery set. |
| `tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` | Grouped/scoped workspace history, retained stable team fields, and removed persisted fields | REQ-014/015; AC-020/024 | Needs Update | Fresh broad `pnpm test:e2e` reaches the current schema but three assertions cannot execute because two positive team-history queries still select removed `WorkspaceHistoryTeamRunItemObject.status`. The existing negative-schema scenario also incorrectly treats `status` as retained. | Remove root team `status` from positive selections/expected results, add it to the explicit removed-team-field rejection, and retain proof for `isActive`, identities, timestamps, members, and standalone-agent status fields. |
| `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | Archive inactive agent/team runs, reject active runs, and hide archived entries | REQ-014/015/018; AC-018/020/024 | Needs Update | Fresh broad `pnpm test:e2e` fails schema validation because the shared history query still selects removed root team `status`; after that selection was reconciled, focused execution exposed a second stale fixture boundary: the fake team manager lacks current `getLifecycleSnapshot()` and scoped leaf snapshots required by the real history live-projection service. Standalone-agent `status` remains valid. | Remove only the team-run `status` selection; give the fake manager explicit binary lifecycle and empty scoped leaf snapshots for its active run doubles; preserve archive visibility, stable metadata, and active-run rejection assertions. |
| Frontend `TeamStreamingService`, scoped resolver/projection tests | Lifecycle callback, `isSubscribed` separation, exact task-team leaf routing, terminal cleanup, companion batching | REQ-003/010/017–019; AC-010/019/021/025 | Still Valid | Exact `task-team-run-7/review_group/critic` and malformed-scope drop are already durable. | Re-run focused set with fake timers. |
| Frontend `agentTeamRunStore`, workspace/history/running/mobile component tests | Stop pending/failure, binary activity, no definition/root aggregate visuals, exact member action | REQ-013–018; AC-016–024 | Still Valid | Mounted production components and store promises directly cover intended frontend policy. Some historical test titles say “offline” but assertions use binary inactivity; title alone is not obsolete behavior. | Re-run focused set; change only assertions/fixtures proven stale by current execution. |
| Agent primary-action/component/store tests | Running Stop, initializing disabled, Enter/Shift+Enter, exact standalone/member route | REQ-008/009; AC-001/002/009/013/014 | Still Valid | Production component and store paths are directly mounted/executed. | Re-run focused frontend set. |
| Runtime adapter/projector/converter tests for AutoByteus/Codex/Claude | Runtime-neutral lifecycle conversion | REQ-001–007/012; AC-005–008/015 | Still Valid | Provider-specific adapters are directly tested, while the held socket test validates the common public transport. | Re-run all three; use available gated live provider tests as realism supplement. |
| Deleted `team-status-aggregation.test.ts` | Five-state member-to-team folding | REQ-015; AC-020 | Stale / Remove | Aggregate team lifecycle is intentionally removed and the test is deleted in implementation commit. | Do not restore. Manager lifecycle, leaf status, task/open-work, and UI coverage replace it. |
| Existing env-gated AutoByteus/Codex/Claude team/runtime E2Es | Actual provider/team run creation, restore, interrupt, follow-up | AC-015/017–021/024 | Still Valid but not exhaustive | They provide process/provider fidelity when configured, but do not by themselves prove exact companion count or new multi-boundary task-team mapping. | Run preflight; execute available relevant cases; never count unavailable/skipped provider cases as pass. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Held team scenario in `agent-status-websocket.integration.test.ts` | `TEAM_STATUS { status: idle }`, pseudo team snapshot, old generic member snapshot methods | Root/team five-state aggregate and generic team-as-agent contract are forbidden | REQ-014/015/017; AC-020/021; SR-005 legacy removal | Current `TEAM_RUN_LIFECYCLE` plus scoped leaf `AGENT_STATUS` live/reconnect scenario | N/A |
| Deleted `team-status-aggregation.test.ts` | Member precedence folds into root five-state state | Member phase is not root liveness | REQ-014/015/019; AC-017/020/025 | Manager lifecycle unit/socket coverage plus separate member/task/work tests | N/A |
| Held standalone `can_interrupt` expectations already removed | Independent interrupt permission field | `running` is the only public busy/interrupt authority | REQ-002; AC-009; clean-cut contract | Status-only wire/action tests | N/A |

No durable test file will be deleted by API/E2E in this round. One obsolete scenario inside a held file will be replaced.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-005 | Real root team WebSocket: scoped leaf initial snapshot, manager lifecycle true, no aggregate, disconnect/reconnect convergence | REQ-014/015/017/018; AC-017/019–021/024; DS-008/SR-005 | `tests/integration/agent/team-lifecycle-websocket.integration.test.ts` or replacement team section in held status socket file | No current API/integration test composes the new manager snapshot, scoped leaf mapper, and real socket. |
| API-E2E-006 | Root -> ordinary -> task team -> leaf live/reconnect parity, exact `task-team-run-7/review_group/critic`, companion order, exact interrupt | REQ-003/010/017; AC-002/010/021; CODE-FIND-002 | Same durable integration artifact | This is the previously failing supported boundary and must be proven above isolated units. |
| API-E2E-007 | Lifecycle false after event-source teardown; failed terminate remains true; accepted terminate false | REQ-014/018; AC-018/019/022/024 | Same server integration plus existing manager/frontend tests | Proves liveness survives event/socket mechanics and follows only manager success. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-001 | `agent-status-websocket.integration.test.ts` | Preserve cross-runtime agent cases; replace aggregate team harness/scenario with current lifecycle/scoped-leaf contract or move that coverage to a focused new file | REQ-001–017; AC-003–015/017/019–021 | Held pre-expansion edit is not accepted wholesale. |
| API-E2E-002 | `agent-command-correlated-status.e2e.test.ts` | Reconcile held source-batch/status-only fixture and current restore behavior | REQ-001/002/011; AC-012/015 | Agent basis is preserved. |
| API-E2E-003 | `agent-websocket.integration.test.ts` | Make accepted restored fake establish authoritative current-turn/running evidence; retain status-only clean cut | REQ-001/002/009/011; AC-009/012–014 | Prior `idle` ACK observation is fixture evidence, not yet a source defect. |
| API-E2E-010 | `agent-team-websocket.integration.test.ts` | Add current leaf-snapshot and binary lifecycle methods to team fakes; remove no valid exact-target journey | REQ-014/017/018; AC-002/019/021 | Discovered by the first fresh expanded run. |
| API-E2E-011 | `agent-team-run-manager.integration.test.ts` | Pass exact deterministic `teamRunId` to `createTeamRun` and update the factory assertion to require the same ID as its second argument | REQ-014/018; AC-017/018/024 | Signature/fixture staleness, not a source failure. The first rerun after adding IDs passed 23 tests and left only four parameterized one-argument factory assertions failing. |
| API-E2E-012 | `task-delegation-tool-lifecycle.integration.test.ts` | Replace aggregate `publishTeamStatus` test trigger and add explicit fake `hasOpenExecutionWork` state | REQ-019; AC-025 | Proves the cleanly separated settlement owner. |
| API-E2E-013 | `claude-agent-websocket-interrupt-resume.e2e.test.ts` fake team scenario | Add leaf snapshots and manager lifecycle fixture for current team socket startup | REQ-017/018; AC-002/015/019/021 | Actual provider case remains gated and is not rewritten. |
| API-E2E-014 | `workspace-run-history-graphql.e2e.test.ts` | Remove root team `status` from positive queries/results, assert it is rejected with other removed team fields, and retain stable-field plus manager `isActive` proof | REQ-014/015; AC-020/024 | Discovered by fresh broad E2E execution; the current schema correctly rejects the stale selection. |
| API-E2E-015 | `archive-run-history-graphql.e2e.test.ts` | Remove root team `status` from the shared archive-history query while retaining agent status and archive/liveness assertions | REQ-014/015/018; AC-018/020/024 | Discovered by fresh broad E2E execution; no production-source failure is indicated. |
| API-E2E-016 | `archive-run-history-graphql.e2e.test.ts` manager/live-projection fixture | Add current manager `getLifecycleSnapshot()` and active team-run `getLeafAgentStatusSnapshots()` so the archive E2E exercises the approved binary lifecycle projection rather than failing at an obsolete fake boundary | REQ-014/017/018; AC-017–019/021/024 | Discovered only after API-E2E-015 let the focused test pass GraphQL schema validation; this is fixture staleness, not a source failure. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None by API/E2E | N/A | N/A | The implementation-owned deletion of aggregate coverage is already classified above. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused Vitest for each reconciled/added server API/integration file | worktree root, `--no-watch` | Held-fixture validity and new real socket paths | Pass — 4 files / 14 tests | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/server-api-focused.log` |
| 2 | Focused changed server unit/integration set including manager, bridge, snapshot, task delegation, history, exact team interrupt, local publication, all three runtime adapters | worktree root | Direct changed logic and former aggregate consumers | Fail — 48/52 files and 501 tests passed; 15 failures plus one unhandled rejection all traced to four stale test fixtures now classified above | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/server-expanded.log` |
| 2a | Focused rerun of the four reconciled stale fixtures | worktree root, `--no-watch` | Current team socket startup, exact manager IDs, task settlement without aggregate, Claude fake-team leaf startup | Fail — 3/4 files passed; 23 tests passed and 1 skipped. Only four parameterized manager factory assertions remained stale because they expected one argument instead of current `(config, teamRunId)`; no source behavior failed. | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/stale-fixture-rerun.log` |
| 2b | Second focused rerun after exact factory-argument reconciliation | worktree root, `--no-watch` | Same four current fixtures after final narrow update | Pass — 4 files, 27 tests passed and 1 skipped gated provider case | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/stale-fixture-rerun-2.log` |
| 2c | Full expanded changed server set rerun | worktree root, `--no-watch` | Direct changed logic, current former-aggregate consumers, and reconciled integration fixtures | Pass — 52 files, 516 tests passed and 1 skipped gated provider case | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/server-expanded-rerun.log` |
| 3 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false` | worktree root | Server compile contract | Pass — exit 0 | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/server-typecheck.log` |
| 4 | Focused changed frontend set from baseline diff plus agent action/batching files | `autobyteus-web`, `pnpm test:nuxt ... --run` | UI/state/action/presentation/task reconciliation | Mixed — 45/46 files passed and 344 tests passed; all 9 failures plus one unhandled rejection are confined to the unchanged-production `agentRunStore.spec.ts` legacy ad hoc context fixture, whose detached baseline reproduces the same termination/close failure and which lacks baseline/current production `AgentContext` conversation/event-monitor methods. No changed production behavior failed. | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/frontend-changed.log`; `.../frontend-failure-classification.txt` |
| 5 | `pnpm test:e2e` | worktree root | Broader deterministic server E2E regressions | Fail — 48 files passed, 14 skipped, 2 failed; 173 tests passed, 49 skipped, 3 failed. Every failure is schema validation in two stale history E2E files selecting intentionally removed root team `status`; classified as API-E2E-014/015 before edit. | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/server-e2e.log` |
| 5a | Focused rerun after API-E2E-014/015 reconciliation | worktree root | Current workspace/archive GraphQL contract | Fail — workspace history passed 6/6; archive history passed 1/2, with its main journey reaching a newly exposed stale fake lacking current `getLifecycleSnapshot()`. Classified as API-E2E-016 before further edit. | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/server-history-e2e-rerun.log` |
| 5b | Focused and broad rerun after API-E2E-016 reconciliation | worktree root | Current workspace/archive GraphQL contract and all deterministic server E2E regressions | Pass — focused history 2 files / 8 tests; broad E2E 50 files / 176 tests passed with 14 files / 49 environment-gated tests skipped | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/server-history-e2e-rerun-2.log`; `.../server-e2e-rerun.log` |
| 6 | Fresh frontend typecheck and changed-file intersection classification | `autobyteus-web` | Detect changed-surface type regressions without assuming baseline failures | Fail as repository baseline limitation — 221 diagnostics across 89 files. Four diagnostics intersect three baseline-to-HEAD changed files; each is independently shown to predate or lie outside the SR-005 hunk (unchanged generated imports, pre-existing scheduler-test inference, pre-existing `AgentDefinition.prompts` fixture). No SR-005-attributable diagnostic. | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/frontend-typecheck.log`; `.../frontend-typecheck-classification.txt` |
| 7 | Obsolete contract scans, `git diff --check`, status/diff inventory | worktree root | Clean-cut removal and patch integrity | Pass — diff check clean; production-only scans have no public interrupt bit or forbidden team aggregate symbol. The sole team-context-file `currentStatus` is explicitly an `AgentTeamMemberNode` field, preserving member-agent state; root context uses binary `isActive`. | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/structural.log`; `.../structural-production-scan.log` |
| 8 | Final combined run of all ten added/updated durable API/E2E/integration files | worktree root, Vitest `--no-watch` | Current working-tree state of every API/E2E-owned durable coverage path | Pass — 10 files, 49 tests passed and 1 actual-provider test skipped by its existing environment gate | `tickets/in-progress/agent-stream-driven-status/api-e2e-evidence/sr005-repository/final-durable-tests.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | AC-001–025 are mapped to passing direct server/frontend/API journeys; the clean-cut negative schema/wire cases execute. | Actual external-provider credentials were unavailable. | Run configured provider E2Es if credentials become available. |
| Changed-boundary execution directness | 98% | 52 changed server files / 516 tests, 45 passing changed frontend files / 344 tests, real loopback sockets, GraphQL E2E, and server compile exercise changed code directly. | Unrelated frontend baseline fixture/typecheck failures keep the repository globally non-clean. | Repair baseline suites separately; not required to prove SR-005. |
| Cross-boundary integration realism and mock gap | 96% | Real Fastify/WebSocket standalone and team paths compose manager, bridge, mapper, reconnect, interrupt, termination, companion order, and exact nested IDs. | Provider process boundary is represented by durable adapters/fake SDK rather than an available external provider. | Run environment-gated Claude/Codex/AutoByteus cases when configured. |
| Environment, configuration, identity, and fixture fidelity | 93% | Test-owned SQLite/temp data/loopback ports and exact `task-team-run-7/review_group/critic` IDs are exercised; broad E2E passes. | External-provider capability/configuration was not yet preflighted at this post-repository gate. | Run the project preflight. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Failed/successful Stop, pending state, teardown ordering, invalid leaf, reconnect, stale factory/fixture discovery, local publication failure, task settlement, and archive rejection all execute. | No material SR-005 failure gap remains. | None required. |
| User-surface, browser, and desktop-shell confidence | 95% | Mounted production Vue/Pinia/service paths prove primary action, disabled initializing, binary team visuals, history/open/recovery, exact member targeting, and companion batching. | Pixel/shell rendering was not run; no CSS, browser API, Electron IPC, or shell lifecycle boundary changed. | Browser/shell run only if a later visual or IPC regression is reported. |
| Durable regression coverage quality and relevance | 97% | Narrow requirement-linked additions/updates replace aggregates, preserve valid standalone/provider coverage, and pass focused plus broad reruns. | Proportional test-code review remains downstream. | Code-review the changed durable tests. |

- Overall post-repository confidence: `96.4%`.
- Calculation method: simple average of the seven applicable categories, rounded to one decimal.
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes`.
- Material residual risks: configured external-provider execution remains unavailable; bounded by three provider adapter/converter suites, actual common WebSocket composition, and the retained gated scenarios.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` + `Lifecycle` + available provider `CLI/E2E`
- Specific confidence gap or residual risk addressed: repository units do not alone prove actual serialized WebSocket startup/reconnect ordering or available provider process timing.
- Why the selected mode can materially improve confidence: the changed contract is primarily streaming/lifecycle; real loopback WebSockets and project-gated provider runs exercise the actual handler, serialization, runtime adapter, reconnect, and cleanup boundaries.
- Expected confidence after the selected validation: at least `95%` overall with no category below `90%`, subject to all critical deterministic paths passing.
- Browser-specific decision and rationale: `Not selected initially`. The changed browser-equivalent policy has direct mounted production component, Pinia, protocol, and fake-timer coverage; no browser API, authentication, CSS layout engine, Electron IPC, or shell boundary changed. Reconsider only if fresh renderer tests or live API evidence leaves a material UI integration gap.
- If `Not Required`: N/A.
- If `Blocked`: N/A at investigation time.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around the Nuxt renderer.
- Relevant instructions: `autobyteus-web/AGENTS.md`, `autobyteus-web/ARCHITECTURE.md`, and implementation handoff rendered-result section.
- Web-equivalent behavior: team/history rows, composer primary action, streaming state, Stop pending/failure, scoped leaf selection.
- Shell-specific or lifecycle behavior: none changed.
- Chosen validation approach and why it fits the project: mounted production renderer tests plus live server WebSocket execution; avoid running the installed desktop application because it would not add evidence for a changed shell boundary and could touch user state.
- Server/frontend setup when browser validation is used: N/A unless the post-repository gate changes.
- Effect on any already-running desktop application: `None`; all execution uses test-owned processes/data.
- Behavior not directly proven and confidence consequence: pixel-level visual rendering in a packaged shell is not directly rechecked; negligible because visuals are deletions/simple binary labels and shell/CSS mechanisms are unchanged.

## Live Environment And Fixture Plan

- Startup order and commands: run deterministic coverage first; then `pnpm test:e2e:real:preflight`; only then run capability-reported relevant provider E2Es.
- Environment choices: ephemeral Fastify ports and test-owned databases/data; no use of the installed server at port 29695 or its user memory.
- Health/readiness checks: Vitest socket open/CONNECTED messages; preflight capability result; test-defined provider readiness.
- Seed data/fixtures: exact SR-005 IDs and paths; existing repository provider fixtures when available.
- Test identities/permissions: local test session; exact root team, ordinary subteam, task-team run/instance/task, relative leaf route, and member run guard.
- Requirement-linked journeys: API-E2E-001–007 plus available provider interrupt/reconnect journeys.
- Evidence: retained command logs/status files, deterministic wire-trace assertions, preflight/provider logs.
- Cleanup: socket/app close in `finally`; provider runner cleanup; verify no owned process remains.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-E2E-008 | Project provider preflight | Capability/fixture availability only | Environment evidence varies by machine and does not assert product behavior. |
| API-E2E-009 | Available repository env-gated provider tests | Actual provider process/interrupt/reconnect realism | Tests are already durable; only the execution selection/log is temporary. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron shell | No shell boundary changed | Negligible | None unless fresh evidence points to shell-specific behavior |
| Configured live provider execution | Project preflight passed, but every remote scenario reported its required managed secret missing and the local LM Studio scenario reported `LOCAL_MODEL_UNAVAILABLE` | Bounded by direct AutoByteus/Codex/Claude adapter tests, fake-SDK socket cases, and common real-socket contract; unavailable cases are not counted as pass | Preserve capability log; run the existing gated provider cases if a future environment supplies credentials/local model |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation completion | N/A | SR-005/ARCH-REV-005/IR-004/CRR-004 decide intended behavior and boundaries | N/A |

## Proportional Test-Review Rework Addendum — API/E2E Round 2

This addendum was recorded before the round-2 durable test edits requested by `CRR-005` / `api-e2e-test-review-report.md`. The implementation-source result remains `CRR-004 Pass`; both findings are bounded API/E2E-owned coverage corrections.

| Finding / Existing Scenario | Fresh Validity Decision | Evidence | Required Durable Coverage Correction | Planned Re-execution |
| --- | --- | --- | --- | --- |
| `TEST-FIND-001` / API-E2E-012 task-team settlement wake-up | Updated — Validated | `publishTaskWorkSettled()` emitted unsupported `TASK_DELEGATION_COMPLETED` and suppressed the contract error with `as never`; `TeamRunTaskDelegationEventPayload` permits only activated/status/submitted/reviewed/terminal-status events. | Replaced the invented event with typed `TASK_DELEGATION_RESULT_REVIEWED` data published through `TeamRun.publishEvent`, the same typed boundary used by `TaskDelegationEventPublisher`; the helper uses the real child task-agent identity/path and explicitly closes private `openExecutionWork`. The second task team now closes private work before parent acceptance so the production settlement request performs the immediate readiness check without a synthetic event. | Pass — affected 2-file run and combined 10-file run. |
| `TEST-FIND-002` / API-E2E-007 disconnect independence | Updated — Validated | Client `socket.close()` followed by a fixed 20 ms delay neither awaited the client close handshake nor proved `AgentTeamStreamHandler.disconnect()` completed before liveness assertion/reconnect. | Added a bounded client WebSocket close promise plus a promise resolved only after the wrapped real `handler.disconnect()` finishes; both complete before manager liveness is asserted and reconnect begins. | Pass — affected 2-file run and combined 10-file run. |

Round-2 execution plan:

| Order | Command | Boundary | Planned Evidence |
| --- | --- | --- | --- |
| R2-1 | Vitest for `task-delegation-tool-lifecycle.integration.test.ts` and `team-lifecycle-websocket.integration.test.ts`, `--no-watch` | Exact two findings | Pass — 2 files / 7 tests. `api-e2e-evidence/sr005-repository/review-rework-affected.log` |
| R2-2 | Vitest for all ten added/updated durable files, `--no-watch` | Current combined durable state and prior API-E2E-001–016 regression | Pass — 10 files / 49 tests; 1 existing provider-gated skip. `api-e2e-evidence/sr005-repository/review-rework-final-durable.log` |

- Existing broader-validation decision revised: `No`. No production, API, environment, provider, frontend, browser, or shell boundary changes in this rework; prior live/preflight evidence remains valid.
- Reroute required before edits: `No`.
- Required downstream route after successful re-execution: `code_reviewer` for proportional test re-review; do not route to delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — one real team lifecycle WebSocket integration added; nine existing API/E2E/integration files updated; no test file deleted by API/E2E.
- Post-repository confidence: `96.4%`
- Broader validation decision: `Required — Live API/Lifecycle executed through durable loopback integration; project provider preflight executed, with no configured provider available for a truthful external run`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: This Round 2 artifact supersedes the SR-002-only investigation. All subsequent edits and evidence must be judged against SR-005 and the complete AC-001–AC-025 basis.
