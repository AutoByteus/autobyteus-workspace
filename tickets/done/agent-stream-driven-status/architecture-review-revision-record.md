# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record is the chronological architecture-review result index.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial solution package | SR-001 | N/A | Fail | ARCH-FIND-001, ARCH-FIND-002 |
| ARCH-REV-002 | Round 2 / SR-002 design rework | SR-002 | Fail | Pass | ARCH-FIND-001, ARCH-FIND-002 |
| ARCH-REV-003 | Round 3 / user-approved expanded team-liveness design | SR-003 | Pass | Fail | ARCH-FIND-003 |
| ARCH-REV-004 | Round 4 / SR-004 scoped leaf-snapshot rework | SR-004 | Fail | Pass | ARCH-FIND-003 |
| ARCH-REV-005 | Round 5 / CRR-003 coordinate-frame design rework | SR-005 | Pass, then downstream Fail / Design Impact | Pass | CODE-FIND-002, CODE-FIND-003; ARCH-FIND-001–003 dispositions rechecked |
| ARCH-REV-006 | Round 6 / user-approved post-delivery binary presentation correction | SR-006 | Pass; accepted source reached DR-004 verification hold | Pass | No new findings; prior architecture/code/test findings rechecked |
| ARCH-REV-007 | Round 7 / post-DR-005 Codex steering and interrupt-result refinement | SR-007 | Pass; accepted SR-006 source reached DR-005 before live defects | Fail / Design Impact | ARCH-FIND-004; prior findings rechecked |
| ARCH-REV-008 | Round 8 / failure-safe immediate interrupt admission rework | SR-008 | Fail / Design Impact | Pass | ARCH-FIND-004 resolved; prior findings rechecked |

## Revision Entries

### ARCH-REV-001 — Initial lifecycle/status architecture review baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 1; Solution Designer requested initial architecture review after user approval and design completion.
- Triggering role, report path, and finding IDs: `solution_designer`; initial package; `ARCH-FIND-001`, `ARCH-FIND-002`.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: Established the initial baseline. The approved status-only lifecycle, finalizer ordering, retired-turn rules, team identity, and frontend action policy are structurally sound, but the design omits supported local `AgentRunEvent` origins from finalizer coverage and does not make the declared public `AgentRun` snapshot canonical during startup/reconnect races.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `ARCH-FIND-001`, `ARCH-FIND-002`
- Material classification changes: `N/A` — initial baseline.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: Status message volume and cross-runtime interruptibility remain downstream validation risks after the blocking design findings are resolved.

### ARCH-REV-002 — Unified run gateway and canonical snapshot design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 2; Solution Designer requested architecture re-review of the completed `SR-002` design rework.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`; `ARCH-FIND-001`, `ARCH-FIND-002`.
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `ARCH-REV-001` / `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The revised package makes `AgentRun` the sole serialized public event/status boundary for runtime, local, lifecycle-fact, and processor-derived origins; removes alternate backend/local dispatch and active-run status overrides; and defines one run-owned lifecycle state with explicit current-turn/snapshot precedence. Both prior blocking findings are resolved without changing approved behavior.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-FIND-001 | Open / Blocking | Resolved | `SR-002`; design DS-003, DS-004, DS-006, DS-009; `Outward AgentRunEvent Origin Coverage`; change steps 2–5 and 10 | `ORIGIN-001`–`ORIGIN-007` cover runtime, command, accepted direct-message, artifact, skill, task-delegation, and processor-derived events. `AgentRun` owns one backend source subscription, queue, listener set, lifecycle state, and awaited `publishEvent`; finalization follows processors; `emitLocalEvent`, local listener fanout, backend public dispatch, and the global queue fallback are removed. |
| ARCH-FIND-002 | Open / Blocking | Resolved | `SR-002`; design DS-001, DS-003, DS-006, DS-007; `Canonical Active-Run Status Application And Snapshot Precedence`; change steps 3, 6, 7, and 10 | `statusOverride` and active-run direct broadcaster replacement are removed. One `AgentTurnLifecycleState` is reconciled by command facts, fresh internal runtime snapshots, and final events. Fresh identified/anonymous current-turn evidence promotes startup; idle/initializing cannot close an identified turn; active-run projection precedes overlay; reconnect/race examples and coverage are explicit. |

- New or remaining finding IDs: `None`
- Material classification changes: Prior `Design Impact` is resolved; current classification is `N/A`.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Cross-runtime source ordering, status-companion volume, awaited local-publication failure semantics, exact startup/reconnect execution, and durable API/E2E proof remain implementation/evidence risks rather than design blockers.

### ARCH-REV-003 — Expanded team design needs an explicit scoped leaf-snapshot contract

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 3; fresh architecture review of the user-approved `SR-003` team-definition/root-liveness expansion after the `SR-002` agent implementation and code review.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`; new `ARCH-FIND-003`.
- Relevant solution revision IDs: `SR-003`; preserved agent foundation from `SR-002`.
- Prior authoritative decision: `ARCH-REV-002` / `Pass`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: The user-approved scope now removes team-definition and root/nested aggregate status in favor of manager-owned binary root liveness and leaf-only agent status. The manager lifecycle, clean aggregate removal, frontend action boundary, and former-consumer reassignment are structurally sound. The recursive initial leaf-snapshot API, however, is not yet representable for task-team executions because the design returns plain `AgentStatusPayload` while live event identity relies on a separate `TaskTeamInstanceIdentity` envelope and mapper-added scoped fields.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-FIND-001 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, `SR-003` origin-coverage section | `SR-003` explicitly preserves ORIGIN-001–ORIGIN-007, the single `AgentRun` queue/state/listener gateway, awaited local publication, and post-processor finalization; current branch source retains that implementation. |
| ARCH-FIND-002 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, `SR-003` active-run precedence section | `SR-003` preserves the run-owned lifecycle state, current/retired-turn precedence, and canonical fresh snapshot read; current branch source contains no agent `statusOverride` or active-run broadcast replacement. |

- New or remaining finding IDs: `ARCH-FIND-003`
- Material classification changes: The prior pass remains valid for the preserved agent foundation, but the complete expanded `SR-003` result is `Fail / Design Impact` until its new nested initial-snapshot interface is complete.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: Manager transition notification coverage, task cleanup/reconciliation, recursive work semantics, root Stop failure/pending behavior, and expanded durable coverage remain downstream risks after the blocking snapshot identity contract is resolved. Held API/E2E edits remain intentionally untouched.

### ARCH-REV-004 — Scoped recursive leaf-snapshot design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 4; Solution Designer requested re-review of `SR-004` resolving `ARCH-FIND-003` without changing the approved expanded behavior.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`; `ARCH-FIND-003`.
- Relevant solution revision IDs: `SR-004`; approved expanded-team basis from `SR-003`; preserved agent foundation from `SR-002`.
- Prior authoritative decision: `ARCH-REV-003` / `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The recursive initial snapshot boundary now uses a tight `TeamLeafAgentStatusSnapshot` carrier rather than plain `AgentStatusPayload`. Exact facade/backend/handle signatures preserve the carrier; one mixed-team scope prefix core serves live events and snapshots; one transport-owned task-team identity flattener serves live and initial mapping; and a concrete nested example proves the same exact frontend execution route. The complete expanded design is ready for implementation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-FIND-001 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, `SR-004` origin-coverage section | `SR-004` preserves ORIGIN-001–ORIGIN-007, the single serialized `AgentRun` gateway, post-processor finalization, and canonical companion ordering. No alternate team path is introduced into agent event publication. |
| ARCH-FIND-002 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, `SR-004` snapshot-precedence section | `SR-004` preserves one run-owned lifecycle state, current/retired-turn correlation, fresh runtime reconciliation, and active-run precedence. Team liveness remains a separate manager-owned binary fact. |
| ARCH-FIND-003 | Open / Blocking | Resolved | `SR-004`; design `Tight internal carrier`, `One shared live/snapshot prefix function`, `Exact method signatures and recursive ownership`, `One shared live/initial wire flattener`, and `Concrete nested task-team example` | `TeamLeafAgentStatusSnapshot` composes required leaf identity with a discriminated ordinary or complete cloned task-team scope. `TeamRun`, backend, manager, and all handle variants return that exact type. `prefixMixedTeamAgentScope` unifies root-relative member/source identity and double-prefix prevention. `buildTaskTeamScopedIdentityPayload` unifies wire fields. Initial mapping retains the carrier through `mapTeamLeafAgentStatusSnapshot`; the example resolves to `task-team-run-7/review_group/critic`, matching live mapping. |

- New or remaining finding IDs: `None`
- Material classification changes: `ARCH-FIND-003` / `Design Impact` is resolved; current classification is `N/A`.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Implementation and downstream coverage must prove manager notification completeness, exact live/initial task-team identity parity, task cleanup/reconciliation, private work semantics, root Stop pending/failure behavior, and clean aggregate removal. The held pre-expansion API/E2E investigation and three uncommitted server test edits remain stale and must be preserved for later reconciliation.

### ARCH-REV-005 — One-coordinate-frame nested task-team stream design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 5; `CRR-003` / `CODE-FIND-002` proved that the `SR-004` carrier mixed child-local logical-team coordinates with root-relative leaf paths on a supported `root -> ordinary subteam -> task team -> leaf` path, and Solution Designer returned `SR-005` for architecture re-review.
- Triggering role, report path, and finding IDs: `solution_designer` from Code Review reroute; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md`; `CODE-FIND-002`, `CODE-FIND-003`.
- Relevant solution revision IDs: `SR-005`; approved expanded-team basis from `SR-003`; representability baseline from `SR-004`; preserved agent foundation from `SR-002`.
- Prior authoritative decision: `ARCH-REV-004` / `Pass`, followed by downstream `CRR-003` / `Fail` / controlling `Design Impact`.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: `SR-005` keeps operational `TaskTeamInstanceIdentity` local and derives a tight outward `TaskTeamStreamScope`. The enclosing event/snapshot `teamRunId` defines one coordinate frame for source, agent-member, and logical-team paths. The task-team handle creates a target-parent-frame override, each ordinary parent rebases retained scope, every live event type and reconnect snapshot uses one bridge core, and the mapper only validates/subtracts consistent paths. The concrete multi-boundary example produces `task-team-run-7/review_group/critic` identically live and on reconnect, without fallback or a public aggregate.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-FIND-001 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, `SR-005` origin-coverage section | `SR-005` preserves ORIGIN-001–ORIGIN-007, the single serialized `AgentRun` gateway, post-processor finalization, and canonical companion ordering. |
| ARCH-FIND-002 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, `SR-005` snapshot-precedence section | `SR-005` preserves run-owned lifecycle reconciliation, current/retired-turn safety, and canonical fresh snapshots. |
| ARCH-FIND-003 | Resolved | Remains Resolved | `SR-004`, `ARCH-REV-004`, `SR-005` recursive contract section | The recursive carrier remains explicit and representable; `SR-005` tightens its task-team variant from full operational identity to coordinate-consistent outward stream scope. |
| CODE-FIND-002 | Open / Blocking / Design Impact | Resolved In Design | `CRR-003`, `CR-MP-002`, `SR-005`; design recursive contract, coordinate algorithm, strict mapper, example, sequence, and risks | The scope contains only stream-required IDs/logical path; builder validates immediate operational parent; target override and retained ordinary rebase rules are distinct; source/member/logical paths and route keys share the enclosing frame; all event variants plus snapshots use the same core; live/initial leaf assertions forbid missing relative identity; the multi-boundary example proves the exact final route. |
| CODE-FIND-003 | Open / Blocking / Local Fix | Implementation-Local Fix Required | `CRR-003`, `SR-005` change step 7 and implementation guidance | No production contract change is needed. The stale `TeamRunService` manager double must add the existing lifecycle subscription/snapshot methods and its 13-test file must pass during rework. |

- New or remaining architecture finding IDs: `None`
- Material classification changes: The controlling `CODE-FIND-002` / `Design Impact` is resolved in the design; current architecture classification is `N/A`. `CODE-FIND-003` remains required implementation work, not an architecture blocker.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Implementation and source re-review must prove target-frame override correctness, repeated ordinary-boundary rebasing/no double prefix, all-event coverage, strict leaf rejection, exact live/reconnect parity, and the `CODE-FIND-003` unit repair. Manager, task cleanup/work, frontend Stop, and held API/E2E risks remain as previously recorded.

### ARCH-REV-006 — Two-level binary team activity presentation passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 6; during the explicit `DR-004` verification hold, the user approved a presentation correction requiring binary activity beside both the parent agent-team/definition group and each exact team-run row.
- Triggering role, report path, and finding IDs: User feedback via `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`; no downstream finding ID.
- Relevant solution revision IDs: `SR-006`; accepted lifecycle/coordinate/source baseline from `SR-005`.
- Prior authoritative decision: `ARCH-REV-005` / `Pass`; subsequent `IR-004`, `CRR-004`, `API-REV-002`, `CRR-006`, and `DR-004` accepted the prior source, but user completion verification remained open.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The presentation contract now distinguishes useful binary projection from prohibited aggregate lifecycle. Each exact run row renders only its own authoritative `isActive`. Each displayed parent group derives only `runs.some(run => run.isActive)` from the exact child collection it renders. A separate `TeamActivityDot { isActive, label }` owns solid blue/gray, no-pulse, localized accessible presentation and accepts no status enum, member data, socket state, or action policy. The group boolean is not persisted, transported, stored on a definition, or used to authorize Stop. Both workspace-history and running group/run surfaces and both history builder paths are mapped with focused coverage.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-FIND-001 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, accepted source, `SR-006` preserved-scope rules | `SR-006` authorizes no agent event/gateway changes. |
| ARCH-FIND-002 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, accepted source, `SR-006` preserved-scope rules | `SR-006` authorizes no agent lifecycle/snapshot changes. |
| ARCH-FIND-003 | Resolved | Remains Resolved | `SR-004`, `ARCH-REV-004`, `SR-005`, accepted source | `SR-006` authorizes no leaf snapshot, stream-scope, or identity changes. |
| CODE-FIND-001–CODE-FIND-003 | Resolved | Remain Resolved | `IR-004`, `CRR-004`, accepted integrated source | Presentation reads existing booleans and does not touch companion batching, coordinate rebasing, mapper invariants, or manager fixtures. |
| TEST-FIND-001–TEST-FIND-002 | Resolved | Remain Resolved | `API-REV-002`, `CRR-006` | Existing durable corrections remain accepted; `SR-006` requires a fresh coverage investigation after its source review rather than treating prior delivery evidence as new sign-off. |

- New or remaining architecture finding IDs: `None`
- Material classification changes: `N/A`; this is an approved bounded presentation correction, not a lifecycle or aggregate-status restoration.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Implementation/source review must prove both group-builder paths, exact sibling booleans, last-active-to-inactive reactivity, both history/running placements, accessibility/localization, no pulse, independence from representative/member/socket/action state, and unchanged agent dots/Stop behavior. Delivery-owned dirty reports/logs and the superseded Electron candidate must remain protected; fresh API/E2E investigation and a rebuilt delivery candidate follow source review.

### ARCH-REV-007 — Interrupt transport admission needs one complete failure transition

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 7; user-approved `SR-007` after live `DR-005` verification proved phantom Codex turn B and silent exact-member interrupt failures.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/codex-steering-stale-running-evidence.md`; new `ARCH-FIND-004`.
- Relevant solution revision IDs: `SR-007`; accepted foundation `SR-002`, `SR-005`, and `SR-006`.
- Prior authoritative decision: `ARCH-REV-006` / `Pass`; downstream `IR-005`, `CRR-007`, `API-REV-003`, `CRR-008`, and `DR-005` accepted that foundation before live verification reopened the task.
- Current authoritative decision: `Fail / Design Impact`.
- What changed in the review result or what baseline was established: The Codex design correctly keeps `CodexThread` as the serialized provider decision owner, separates required start/steer response parsing, prevents late start responses from reopening the most recently settled turn, preserves exact A on steer, forbids fallback, and leaves canonical lifecycle unchanged. The command-result union, same-connection server response, exact frontend match, projection interception, and accepted-ack lifecycle separation are also sound. The remaining design omission is the reachable Stop action after a socket has already disconnected/reentered reconnecting, or a synchronous send failure: the service registers pending state and calls a throwing transport, but no exact transition removes the entry, invokes the local transport-failure callback once, and returns not-admitted to the store.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-FIND-001 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, preserved source through `DR-005`, `SR-007` | Provider input selection remains behind the existing single `AgentRun` gateway; no direct event origin or alternate public listener is added. |
| ARCH-FIND-002 | Resolved | Remains Resolved | `SR-002`, `ARCH-REV-002`, preserved source through `DR-005`, `SR-007` | `SR-007` explicitly preserves `AgentTurnLifecycleState` precedence and fixes identity at `CodexThread`; ack and transport feedback cannot mutate lifecycle. |
| ARCH-FIND-003 | Resolved | Remains Resolved | `SR-004`, `ARCH-REV-004`, `SR-005`, accepted source through `DR-005` | No recursive leaf carrier, task-team stream scope, prefixing, or live/reconnect mapping is changed. |
| CODE-FIND-001–CODE-FIND-003 | Resolved | Remain Resolved | accepted `IR-005` / `CRR-007` source baseline | `SR-007` preserves companion batching, nested coordinate rebasing, strict leaf mapping, and manager fixture corrections. |
| TEST-FIND-001–TEST-FIND-002 | Resolved | Remain Resolved | `API-REV-002`, `API-REV-003`, `CRR-006`, `CRR-008` | Existing durable corrections remain baseline evidence; fresh `SR-007` coverage is still required after source rework. |

- New or remaining finding IDs: `ARCH-FIND-004`.
- Material classification changes: The complete `SR-007` result is `Fail / Design Impact`; the accepted `SR-006` foundation remains valid.
- Recommended recipient: `solution_designer` for a focused transport-admission design correction; implementation remains blocked.
- Remaining risks or uncertainty: Provider error-envelope variation, input/notification race execution, same-socket acknowledgement exactness, frontend no-optimistic-idle behavior, and realistic Codex/browser verification remain downstream risks after `ARCH-FIND-004` is resolved.

### ARCH-REV-008 — Failure-safe interrupt transport admission passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Review round and trigger: Round 8; focused re-review of `SR-008` resolving `ARCH-FIND-004` from `ARCH-REV-007`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`; `ARCH-FIND-004`.
- Relevant solution revision IDs: `SR-008`; architecture-approved `SR-007` provider/server/admitted-request design; accepted foundations `SR-002`, `SR-005`, and `SR-006`.
- Prior authoritative decision: `ARCH-REV-007` / `Fail / Design Impact`.
- Current authoritative decision: `Pass`.
- What changed in the review result or what baseline was established: Both frontend streaming services now return one truthful boolean from a shared `interruptCommandAdmission.ts` transition. The helper registers the exact command/target, reads connection state immediately before send, skips and completes nonconnected attempts, catches send races, deletes before callback, and leaves only successfully sent commands pending. Automatic and intentional disconnect drain only still-pending IDs through the same completion function. Therefore nonconnection, send throw, reentrant disconnect-plus-throw, acknowledgement-plus-disconnect, and repeated disconnect cannot produce stale entries or duplicate feedback. The store returns the service boolean unchanged while the synchronous exact-target callback owns one toast. No local path fabricates an acknowledgement, changes agent/team lifecycle, appends transcript error, hides Stop, or queues/retries through reconnect.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-FIND-004 | Open / Blocking / Design Impact | Resolved | `ARCH-REV-007`, `ARCH-MP-001`, `SR-008`; design DS-015 admission/helper/signatures/disconnect/coverage sections | `tryAdmitInterruptCommand` owns register -> immediate state read -> send/catch -> boolean. `completePendingInterruptTransportFailure` deletes before exact callback and is a no-op when absent. `drainPendingInterruptTransportFailures` snapshots only current IDs. Both services delegate and return the boolean; stores return it unchanged. Coverage explicitly spans disconnected/connecting/reconnecting, send throw, reentrant disconnect-plus-throw, admitted disconnect, acknowledgement before disconnect, repeated disconnect, exact identity, stale-map absence, one toast, and no ack/lifecycle/transcript/retry side effect. |
| ARCH-FIND-001–ARCH-FIND-003 | Resolved | Remain Resolved | `ARCH-REV-002`, `ARCH-REV-004`, `ARCH-REV-005`, preserved `SR-008` scope | `SR-008` changes only frontend interrupt admission mechanics; the single `AgentRun` gateway, lifecycle precedence, and recursive scoped leaf contracts remain unchanged. |
| CODE-FIND-001–CODE-FIND-003 | Resolved | Remain Resolved | accepted `IR-005` / `CRR-007` source baseline | No companion batching, nested coordinate, strict mapper, or manager fixture decision is reopened. |
| TEST-FIND-001–TEST-FIND-002 | Resolved | Remain Resolved | `API-REV-002`, `API-REV-003`, `CRR-006`, `CRR-008` | Accepted corrections remain baseline evidence; fresh `SR-008` investigation/execution remains required after source review. |

- New or remaining finding IDs: `None`.
- Material classification changes: `ARCH-FIND-004` / `Design Impact` is resolved; current classification is `N/A`.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: Implementation and source review must prove helper reuse rather than duplicated service logic, exact boolean/callback ordering, delete-before-callback under reentrancy, intentional disconnect before handler/context teardown, all Codex start/steer races, same-socket acknowledgement matching, and no optimistic lifecycle. Fresh realistic Codex/browser-equivalent coverage remains downstream work.
