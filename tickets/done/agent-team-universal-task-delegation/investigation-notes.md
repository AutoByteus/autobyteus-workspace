# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: CRR-001 design-impact rework in SR-009 after ARCH-REV-004 Pass / IR-001; CR-F-004 requires phase-truthful settlement ordering, while CR-F-001–CR-F-003 remain bounded implementation corrections
- Investigation Goal: determine the smallest coherent architecture that makes `delegate_task` universally addressable inside one rooted TeamRun while removing redundant execution identities and preserving supported history
- Scope Classification: Large
- Scope Rationale: the visible eligibility guard is small, but current locality and composite execution addressing span task ownership, execution hosting, persistence, events, application contracts, token/external projections, and frontend focus/state
- Primary Conclusion: retain one rooted logical topology; represent every exact execution by its existing AgentRun/TeamRun ID; persist one rooted execution tree plus separate task/message records; preserve one local manager per materialized TeamRun; put root routing/task/message/persistence/event authority behind one `RootTeamRun` boundary; linearize every task command in its sole service owner; use exact physical-write phase results; settle terminal task executions through reversible local quiescence -> one tree-only durable commit -> destructive local cleanup; and migrate supported predecessor roots independently before target-only execution starts

## Request Context

The user requested a new ticket based on `origin/codex/agent-team-hierarchical-handoffs`. The requested product model is:

1. `delegate_task` may select any valid mounted Agent or non-root AgentTeam in the caller's root by canonical absolute `recipient_address`.
2. `send_message_to` accepts the same canonical logical address or one exact `target_agent_run_id`.
3. Every delegation creates a fresh task Agent or task AgentTeam execution.
4. AgentTeam delegation enters through the new Team's coordinator and returns that coordinator's AgentRun ID.
5. Tasks, messages, topology, and concrete execution containment remain distinct concepts.
6. Runtime storage is pinned to three intuitive JSON authorities with no redundant path/route/chain fields.
7. The user approved the complete design and authorized architecture-review handoff after final self-validation. ARCH-REV-004 passed cumulative SR-008. CRR-001 later found one contradiction in the approved settlement order, now corrected by SR-009 without changing user-facing behavior or persisted shape.
8. Live navigation groups task executions under their logical placement, labels them from task description without technical IDs, and expands a task AgentTeam into the members of that exact fresh TeamRun.
9. The existing one-manager-per-TeamRun recursion is preserved, but each manager is narrowed to its own direct executions and local lifecycle; root-wide concerns move to explicit owners behind `RootTeamRun`.
10. The user clarified that migration failure is root-local and non-blocking: after bounded retry, an unresolved predecessor root stays untouched and unavailable while valid/current roots and new Team creation continue. Normal runtime remains strictly target-only; only migration code may understand predecessor shapes.

## Environment Discovery / Bootstrap Context

- Project Type: Git superrepository with dedicated ticket worktree
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation`
- Current Branch: `codex/agent-team-universal-task-delegation`
- Bootstrap Base: `origin/codex/agent-team-hierarchical-handoffs`
- Base Commit: `3e121efb32462c314f4ef1c4e051f30d2f9b3e58`
- Base Refresh: fetched and verified before worktree creation on 2026-08-13
- Base Reverification: on 2026-08-14, ticket `HEAD`, base ref, and merge-base all resolved to `3e121efb32462c314f4ef1c4e051f30d2f9b3e58`. On 2026-08-15, `HEAD` still equals that base while the working tree contains the uncommitted IR-001 implementation under review.
- Expected Finalization Target: user-selected ticket branch; downstream delivery decides final integration only after review and verification
- Bootstrap Blockers: None
- Source Mutation During SR-009 Investigation: None by `solution_designer`; IR-001 source/test/generated deltas remain untouched in the shared worktree, and only solution-owned ticket artifacts are revised

## Supplemental Task Artifact Inventory

| Absolute Path | Purpose | Status | Approval Applicability / Follow-up |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/universal-task-delegation-behavior-contract.md` | Logical recipient, target-kind, host-selection, failure, and teardown matrix | User-approved / self-validated | Intended behavior; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/task-delegation-interaction-contract.md` | Tool inputs/results, work packet, exact messaging, submit/review behavior | User-approved / self-validated | Intended behavior; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/agent-team-collaboration-system-instruction.md` | Exact provider-neutral Team prompt copy | User-approved / self-validated | Intended behavior; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/team-execution-ownership-analysis.md` | Current architecture, target ownership, and refactor-pressure evidence | Reconciled with SR-009 | Evidence and design rationale; N/A as separate product behavior |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/team-run-persistence-architecture-contract.md` | Exact three-file schemas, invariants, data-flow spines, recovery, migration, and removal contract | User-approved / self-validated | Intended architecture/data contract; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/team-execution-tree-ui-ux-spec.md` | Exact product navigation hierarchy, task-row copy, Agent focus, task-Team expansion, responsive/accessibility states | User-approved / self-validated | Intended UI behavior; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/team-run-management-contract.md` | Exact root/local TeamRun management boundary, natural names, data-flow spines, dependency rules, and removal inventory | User-approved / self-validated | Intended architecture; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/persistence-scenarios/README.md` | Normative scenario index and reading rules | User-approved / strict validation passed | Intended schema examples; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/persistence-scenarios/` | Five directories containing 15 exact JSON examples | User-approved / strict validation passed | Intended schema examples; architecture review applies |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/execution-model-visualization.html` | Human-facing conceptual visualization, not product UI | Context only | N/A; no UI appearance commitment |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/in-progress/agent-team-universal-task-delegation/solution-self-validation.md` | Design-principle checklist, complete use-case/spine matrix, consistency checks, and validation evidence | SR-009 refreshed / Pass | Evidence; N/A as separate product behavior |

## Source Log

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Finding |
| --- | --- | --- | --- | --- |
| 2026-08-13 | Git | `git fetch origin codex/agent-team-hierarchical-handoffs`; worktree creation/divergence checks | Establish exact user-selected base | Worktree started from remote base commit `3e121efb...`. |
| 2026-08-14 | Git | `git rev-parse HEAD`; `git rev-parse origin/codex/agent-team-hierarchical-handoffs`; `git merge-base ...`; `git diff --stat base...HEAD` | Correct user's base-comparison concern | All three commits are identical; investigation reads the base-derived ticket tree, not `origin/personal`. |
| 2026-08-13/14 | Code | `agent-collaboration/domain/agent-team-address.ts`, `recipient-address-expression.ts`, `services/team-recipient-resolver.ts` | Trace logical selection | Root lookup is already universal; relative-expression support is the only dual address grammar. |
| 2026-08-13/14 | Code | `task-delegation-tool-service.ts`, `task-delegation-target-mapper.ts`, `task-delegation-service.ts` | Locate restriction and lifecycle owner | Valid target resolves before direct-child rejection; lifecycle is broad but scoped to the wrong TeamRun. |
| 2026-08-13/14 | Code | task ledger, records service, persistence scope, activation coordinator, directories, settlement/notification services | Trace task state and exact execution facts | Task IDs/records are root-scoped; per-Team service routing and repeated identity wrappers are mechanical. |
| 2026-08-13/14 | Code | `task-team-run-identity-factory.ts`, `agent-run-identity-allocator.ts`, mixed Team factories/managers/handles | Prove task execution identities | Task-Team Agents use globally collision-aware AgentRun IDs; task Teams use fresh TeamRun IDs; recursive TeamRun containment already exists. |
| 2026-08-13/14 | Code | `team-execution-address.ts`, active-task binding, Team Agent stream binding, GraphQL/WebSocket DTOs | Test composite identity necessity | Composite address does not uniformly identify task-Team Agents; stream bindings add exact AgentRun ID separately. |
| 2026-08-13/14 | Code | Team metadata types/schema/mapper and `team-run-config.ts` | Inspect current configured runtime persistence | Schema v3 repeats kind/address/config fields and persists no task execution containment. |
| 2026-08-13/14 | Code | communication history/types/processors, exact global AgentRun router, runtime builders | Trace message authority | Exact AgentRun delivery already exists; Team history can store exact AgentRun endpoints and derive addresses from the root tree. |
| 2026-08-13/14 | Code | token usage store/migrations/readers; external-channel binding/routing | Trace dependent composite identity | Token rows already have exact `run_id`; external entry can be `{teamRunId,entryAgentRunId}`. Composite execution JSON is redundant target-side. |
| 2026-08-13/14 | Code | application SDK contracts, backend/frontend SDKs, devkit manifest writer/validators, backend-definition loader, application launch/binding/streaming services | Determine application cut | Current exact project contract is V5 and contains composite Team execution identity. Because the application framework is unused/forward-only, target is an atomic V6 cut with discard/rebuild, not migration. |
| 2026-08-13/14 | Code | web `AgentTeamContext`, Team execution state/tree/materializers/reconciler, stream handlers, focus/history/status/timeline consumers | Trace browser model | Browser already shows an execution projection but uses serialized composite keys and duplicate task materialization; exact run IDs plus tree containment are sufficient. |
| 2026-08-14 | Local persisted data | `find ~/.autobyteus/server-data/memory/agent_teams ...`; read-only JSON schema/count scripts | Establish supported data cohort and recoverability | 507 root directories, 501 Team metadata files, 343 communication files, 2 task files, 5 task Team records; physical task-Team/member directories expose allocated run IDs. |
| 2026-08-14 | Local DB | `stat` and `sqlite3 -readonly ~/.autobyteus/server-data/db/production.db ...` | Inspect volume and exact identity | DB is 941,711,360 bytes; token ledger has 171,891 rows, including 203 rows whose execution JSON contains task-Team structure; each token row also owns exact `run_id`. |
| 2026-08-14 | Disposable validator | `/tmp/validate_universal_task_persistence_examples.py` | Validate exact five-case package and concrete scope selection | PASS for 15 files, 43 Agent nodes, 22 Team nodes, 5 task roots/records, 2 message edges, and every represented nearest-containing-scope/configured-descendant host. |
| 2026-08-14 | Code | `team-run-metadata-types.ts`, `team-run-config.ts`, `team-run-metadata-mapper.ts`, `member-team-context-builder.ts`, application binding launch/contracts | Prove the proposed execution tree does not drop a current restore authority | Current Team metadata persists definition IDs/name, configured nodes, launch facts, handoffs, timestamps, and per-Agent application context. Authored Team instruction is already resolved from `teamDefinitionId`, Team backend is reconstructed as `MIXED`, workspace ID derives from root path, and V6 application producer facts derive from one root binding plus exact node identity. |
| 2026-08-14 | Code | `autobyteus-web/components/workspace/team/TeamMembersPanel.vue`, `services/teamExecution/teamExecutionNavigationProjector.ts`, `teamExecutionModels.ts` | Ground target navigation behavior in the current product path | Current panel renders one flat clickable row stream, labels task executions with topology display names, and selects every row through composite identity. The projector already carries depth/children/task facts but reconstructs task parentage from composite chains. The target can preserve the panel journey while replacing identity/parent reconstruction and adding truthful task description/Team expansion presentation. |
| 2026-08-14 | Code | `mixed-team-run-backend-factory.ts`, `mixed-sub-team-run-factory.ts`, `mixed-team-manager.ts`, its three registries, `team-manager.ts`, `team-run.ts`, and `agent-team-run-manager.ts` | Determine whether the target needs one root manager or one manager per TeamRun | Both root and child factories already create one `TeamRun` plus one `MixedTeamManager`; local registries naturally own direct handles. Root address/task/directory/event concerns are mixed into the same manager, while `AgentTeamRunManager` registers only roots. Preserve recursive local managers, add one root public boundary, and remove the mixed concerns. |
| 2026-08-14 | Design-principle self-validation | ID-continuity/coverage script; stale-status scan; complete UC-to-spine audit; `/tmp/validate_universal_task_persistence_examples.py`; JSON syntax parse; Markdown-table validation; `git diff --check` | Prove every supported case reaches an authoritative owner and meaningful result before architecture handoff | Added explicit DS-021–DS-029 for root creation, handoff discovery, references, task notification, exact commands, root teardown, token attribution, external entry, and derived history/file context; all mappings and structural checks pass. |
| 2026-08-14 | Architecture review | `design-review-report.md` ARCH-REV-001 plus `architecture-review-revision-record.md` | Reinvestigate DR-001–DR-003 against exact production paths | Central rooted architecture passed; activation commit, initial status, and accepted-message durability needed bounded correction. |
| 2026-08-14 | Code | `agent-execution/domain/agent-run.ts`, `input/agent-run-input-admission-state.ts`, `agent-run-input-contract.ts`, `agent-team-execution/services/inter-agent-message-router.ts` | Trace exact accepted-input timing and available ownership seam | `postUserMessage()` admits, claims, and starts dispatch before returning accepted; one AgentRun-owned reserved entry state can gate the existing FIFO without another queue or provider policy. |
| 2026-08-14 | Code | `services/agent-streaming/team-runtime-snapshot-service.ts`, `agent-team-stream-handler.ts`, `domain/team-agent-status.ts`, `mixed-team-manager.ts`, `run-history/services/team-run-live-projection-service.ts` | Trace supported initial Team status path and canonical status model | Workspace connection currently calls `TeamRun.getLeafAgentStatusSnapshots()`; the immutable status snapshot and live projector already exist and must enter the root snapshot barrier. |
| 2026-08-14 | Code | `task-delegation-service.ts`, `task-delegation-activation-coordinator.ts`, `task-activation-event-barrier.ts`, task Agent/Team registries and active Team directory | Identify every current fallible post-write activation step | Current `commit`, active registration, barrier commit, and work release can throw after persistence; target must seal/reserve/validate them before the durable commit and make later steps no-throw. |
| 2026-08-14 | Architecture review | `design-review-report.md` ARCH-REV-002 plus `architecture-review-revision-record.md` | Reinvestigate DR-004 against overlapping supported Team messages | DR-001–DR-003 are resolved. `commitReservedMessage(nextMessages)` starts serialization after callers derive full snapshots, permitting a reachable lost update. |
| 2026-08-14 | Code | `services/team-communication/team-communication-service.ts`, `team-communication-projection-store.ts`, `team-communication-types.ts`; target `TeamRunPersistenceCoordinator` contract | Trace current-state ownership and the correct commit seam | Current service already serializes its read/derive/write event projection per TeamRun. The target must preserve that complete logical scope under the root mutation lock rather than expose precomputed snapshots; no persisted revision or extra queue is needed. |
| 2026-08-14 | Architecture review | `design-review-report.md` ARCH-REV-003 plus `architecture-review-revision-record.md` | Reinvestigate DR-005–DR-007 | DR-001–DR-004 are resolved. Independent submit/review commands can lose task changes, rename precedes required directory finalization, and the interaction catalog duplicates `INT-020`. |
| 2026-08-14 | Code | `agent-team-execution/task-delegation/task-delegation-service.ts`, `task-delegation-ledger.ts`, `records/task-delegation-records-store.ts` | Trace all task mutation entrypoints and current state ownership | Activation has dedicated serialization, while submit/review/settlement can read and persist independently. The proportionate target is one private FIFO command queue inside the sole root `TaskDelegationService`, not a second ledger or persisted revision. |
| 2026-08-14 | Code | `run-history/store/atomic-json-file-writer.ts`, current task/message stores | Verify physical writer phase order | The selected-base writer performs rename before directory sync and swallows both file/directory sync failures as best effort. Target Team files need a dedicated strict writer result that distinguishes `not_renamed`, `renamed_finalization_indeterminate`, and `committed`. |
| 2026-08-14 | Code | `app-data-migrations/app-data-migration-runner.ts`, migration record types/repository | Ground the user's non-blocking migration clarification | `FAILED` is retryable and `runPending()` retries it on the next startup, while successful statuses are skipped. A per-root staged migration can preserve failed predecessor bytes, keep the record retryable, and let the target-only server admit only valid current roots. |
| 2026-08-15 | Architecture/code review | `code-review-report.md` CRR-001; `code-review-revision-record.md`; `/tmp/crr001-task-commit-audit.log`; `/tmp/crr001-agent-run-reservation-race.log` | Reinvestigate the implementation failure origin | CR-F-001–CR-F-003 are bounded implementation violations. CR-F-004 is a solution contradiction: MGR-005 deletes the local execution before the fallible settlement file write although R-040 permits destructive release only after `committed`. |
| 2026-08-15 | IR-001 code | `task-delegation-service.ts:378-445`; `mixed-task-agent-execution-registry.ts:108-113`; `mixed-task-team-execution-registry.ts:89-94`; `team-run-persistence-coordinator.ts` | Trace accepted/interrupted settlement through local and durable owners | Terminal task status already exists independently from execution-tree `settledAt`. Current settlement unnecessarily writes a complete task snapshot with the tree and destroys the registry first. The clean target is a reversible local settlement preparation followed by a tree-only commit. |
| 2026-08-15 | IR-001 code | `agent-run.ts:159-236`; `agent-run-input-admission-state.ts:315-339`; `mixed-agent-member-handle.ts:89-99` | Trace reservation/quiesce/termination behavior | `quiesce()` closes admission, but accepted termination removes unresolved `reserved` entries. A termination-preparation capability can wait those already-submitted reservations and active dispatches before becoming commit-ready; only root fail-stop may force-dispose a hidden indeterminate reservation. |
| 2026-08-15 | SR-008 contracts | R-007, R-037, R-040, R-048; MGR-005; persistence contract §§10.2–10.5 | Find the smallest coherent correction | Preserve the one task FIFO/root lock/local manager owners. Split settlement into terminal task-record transition (existing file/state), reversible quiescence, one execution-tree write, no-throw detach/event commit, and post-lock local teardown. No new persisted status, file, queue, retry/replay, compatibility path, or owner is needed. |
| 2026-08-15 | Independent product-path audit | `agent-tools/task-delegation/review-task-result.ts`; `task-delegation-tool-service.ts`; `root-team-run.ts`; `task-delegation-service.ts`; `agent-tools/agent-communication/send-message-to.ts`; `send-message-to-dispatcher.ts`; `global-agent-run-message-router.ts`; `team-communication-service.ts`; `team-run-file-commit-writer.ts` | Apply the mandatory Product Reachability Gate to every CRR-001 finding rather than accepting a mechanical code path | All four premises are `Reachable`: CR-F-002 occurs on every successful delegation; CR-F-003 is produced by two independently supported same-root tool actions; CR-F-001 and CR-F-004 are exercised by ordinary tool actions plus the already-approved R-040 phase-aware storage contract. No test-only caller or hidden-state mutation is required. |

No public web source was necessary. The task is grounded in the user-selected base branch, local project contracts, and representative local persisted data.

## Relevant Existing Behavior And Production Paths

| Behavior ID | Supported Trigger | Current Production Spine | Current Outcome | Target Implication |
| --- | --- | --- | --- | --- |
| BEH-001 | Team Agent calls either tool with address | provider tool -> server parser -> root recipient resolver -> operation mapper/router | Both address forms resolve; task adds adjacency guard | Retain root resolver; make parser absolute-only; delete task guard. |
| BEH-002 | Any delegate/submit/review operation | tool -> current/parent service -> per-Team ledger -> root records | Live ownership is split and only activation is explicitly serialized | Route one root facade to one root task service and one private FIFO lifecycle-command queue. |
| BEH-003 | Valid Agent/Team delegation | current Team service -> local registry/factory -> fresh run | Fresh execution is hosted relative to caller/local target assumptions | Resolve exact Team execution host before activation. |
| BEH-004 | Task-scoped caller delegates or messages | composite chain selection -> local manager | Chain is both locator and ancestry encoding | Replace with exact run lookup plus tree ancestry. |
| BEH-005 | Submit/review/settle | current/parent inference -> task records/directory | Valid only while locality matches; independent complete snapshots can overwrite; IR-001 also deletes local execution before settlement durability | Resolve task record/exact runs and revalidate/derive at the root task-command queue head; commit terminal task state first, then prepare reversible local quiescence, commit tree-only settlement, and only afterward destroy local execution. |
| BEH-006 | Team workspace open/live event | GraphQL/WS -> browser state/materializers | Browser reconstructs task nodes and uses serialized composite keys | One backend projection and one frontend reducer over exact tree/run IDs. |
| BEH-007 | Prompt/tool schema render | server copy -> provider adapter | Relative/direct-child choices taught | One exact absolute/universal copy. |
| BEH-008 | Agent calls `get_handoff_rules` | configured handoffs -> member context -> minimal result | Advisory only | Preserve. |
| BEH-009 | Team state written/restored | Team metadata store + task/message stores + dependent rows | No one file expresses task execution containment; identities repeat; current strict write order has no post-rename truth | Migrate to three authorities and exact dependent run identities; give their runtime writer one phase-aware result. |
| BEH-010 | Invalid/non-direct target | parser/resolver/mapper | Non-direct target gets artificial eligibility error | Remove adjacency outcome; preserve fail-closed real errors. |
| BEH-011 | Participants communicate after delegation | returned/bound run IDs -> exact router -> AgentRun input admission | Exact path exists; facts incompletely projected; IR-001 termination deletes an unresolved reserved entry | Expose only exact contact facts; reuse root communication boundary; ordinary quiescence waits submitted reservations rather than invalidating them. |
| BEH-012 | Server restarts with task history | stores load; live task runtime is gone | Nonterminal record/runtime correspondence is unsafe | Repair to interrupted/settled before exposure; do not resume. |
| BEH-013 | Operator upgrades supported released state | migration registry -> completed/pending records -> startup sequencing | Existing completed migrations cannot be changed to rerun safely; `FAILED` is retryable | Add a new migration ID; migrate roots independently; admit only valid target roots; never add runtime predecessor reads. |
| BEH-014 | Root or child TeamRun is created/materialized and later handles cross-tree work | factory -> TeamRun -> MixedTeamManager -> local registries plus parent boundary/directories/listeners | One manager per TeamRun is sound, but local and root responsibilities are mixed | Keep the manager-per-TeamRun recursion; use `RootTeamRun` plus exact index/TeamRun resolver for cross-tree work; shrink manager to local operations. |

## Product Reachability Gate — Independent CRR-001 Validation

The code-review result is accepted only after tracing each premise forward from an independently supported product trigger or an approved governing contract. The reviewer probes reproduce already-established paths; they do **not** establish reachability by themselves.

| Premise ID | Finding | Independent initiating basis | Complete supported production witness | Lifecycle state and consequence | Classification | Design consequence |
| --- | --- | --- | --- | --- | --- | --- |
| SR009-MP-001 | CR-F-001: activation finalization-indeterminate is remapped through ordinary abort/not-started handling | Exposed `delegate_task` action plus approved R-040 strict Team-file durability contract | provider tool/MCP adapter -> `TaskDelegationToolService` -> `RootTeamRun.delegateTask()` -> `TaskDelegationService.activateAtHead()` -> `TeamRunPersistenceCoordinator.commitTaskMutation()` -> `TeamRunFileCommitWriter`; after rename, directory finalization may return the contractually distinct `renamed_finalization_indeterminate` outcome | The final path may already contain the new activation while IR-001's surrounding catch still invokes reservation cancellation/preparation abort before rethrow. That contradicts the required hidden-preparation/no-public-result truth. | `Reachable` | Keep finalization-indeterminate out of ordinary abort/result mapping; preserve hidden preparation and root fail-stop until strict reload. |
| SR009-MP-002 | CR-F-002: activation work release is deferred beyond the synchronous committed closure | Every successful exposed `delegate_task` action | provider tool/MCP adapter -> task tool service -> root task owner -> committed tree/task writes -> activation `commitAfterDurability()` -> `queueMicrotask(releaseWork)` | The tool can return an active task after durable/memory/event commit while the work gate has not yet been flipped. This is the normal success path, not a failure hypothesis. | `Reachable` | `releaseWork()` itself is the synchronous no-throw latch operation inside `commitAfterDurability()`; provider execution remains asynchronously drained after the latch. |
| SR009-MP-003 | CR-F-003: ordinary task settlement can invalidate an already-submitted Team-message reservation | Two independently supported same-root actions: one Agent calls `send_message_to(target_agent_run_id)` for a live task Agent while the task delegator calls `review_task_result(decision=accept)` (the same termination path is also used by supported root teardown) | message path: bound `send_message_to` -> dispatcher -> global router -> `RootTeamRun.deliverExactAgentMessage()` -> `TeamCommunicationService.deliver()` -> exact `AgentRun.reserveUserMessage()` -> root append plan; concurrent task path: bound `review_task_result` -> root task service -> accepted record commit -> settlement sweep -> `TeamRun.settleDirectTask()` -> registry -> `AgentRun.terminate()` | Reservation is created before the message plan commits. Current settlement can observe the Agent as otherwise idle, terminate it, and `settleAcceptedTermination()` deletes the reserved entry; the already-submitted append plan later cannot commit or cancel the same reservation. | `Reachable` | Settlement preparation must close admission and await every earlier unresolved reservation/dispatch before it becomes commit-ready; ordinary termination must never delete such a reservation. |
| SR009-MP-004 | CR-F-004: destructive local settlement precedes fallible durable settlement | Exposed `review_task_result(decision=accept)` and supported system interruption/root teardown, plus approved R-040 `not_renamed` contract | review tool -> root task service -> accepted task-record commit -> accepted settlement sweep -> owner `TeamRun` -> `MixedTaskAgentExecutionRegistry.settle()` or `MixedTaskTeamExecutionRegistry.settle()` -> backend termination/map deletion -> `TaskDelegationService.commitSettlement()` -> strict execution-tree writer | If the required tree write returns `not_renamed`, durable/current tree truth still says the task execution is live while the local registry/AgentRun or task TeamRun has already been destroyed. R-040 explicitly requires clean abort for this physical phase. | `Reachable` | Replace terminate-before-write with reversible local quiescence, one tree-only commit, synchronous non-routable detach after `committed`, and destructive teardown afterward. |

Reachability note: SR009-MP-001 and SR009-MP-004 rely on an established product durability contract, not on arbitrary infrastructure brainstorming. R-040 already makes pre-rename failure and post-rename finalization uncertainty governing outcomes for every production write to the three Team JSON authorities, and the concrete tool paths above exercise that writer. The design therefore must be phase-truthful. Conversely, SR-009 adds no machinery for unrelated corruption, unsupported manual file mutation, or speculative provider failure.

## Design Health Assessment Evidence

| Signal | Evidence | Conclusion |
| --- | --- | --- |
| One concept, several identities | logical address, member path, route key, task-Team chain, task Agent ID, added stream AgentRun ID | Keep logical address plus intrinsic run IDs; delete parallel identities. |
| Root facts, per-Team lifecycle | root task IDs/records versus per-Team services/ledgers | Root task lifecycle authority is missing. |
| Relationship conflated with containment | delegator task chain copied into assignee locator | Task edge belongs in task record; containment belongs in tree. |
| Duplicate read-model construction | backend emits partial facts; browser materializes task nodes and parses keys | One projector/reducer pair should own concrete execution view. |
| Stored fact repetition | task/message records copy logical/composite participant identities and reference metadata | Persist exact run endpoints and derive addresses/reference presentation. |
| Compatibility pressure | schema v3 and completed migrations exist | Use one isolated new migration; current runtime remains target-only. |
| Thin facade versus owner | `TeamRun` exposes root routing/task/event methods while child managers also reach root concerns | Add one public `RootTeamRun` facade; keep `TeamRun` local and its manager private; explicit subject owners remain internal. |
| Manager responsibility drift | `MixedTeamManager` owns direct handles plus root resolver, task directories, composite-chain routing, listener/barrier, and root disposal | Preserve one manager per TeamRun but remove every root-wide concern from it. |
| Application divergence | V5 SDK transports old Team identity | Atomic forward-only V6 cut is required; no adapter. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Evidence / Problem | Target Responsibility |
| --- | --- | --- | --- |
| `agent-collaboration/domain/recipient-address-expression.ts` | Absolute/relative runtime expression | Sole runtime dual-origin grammar | Delete; canonical absolute `AgentTeamAddress` only. |
| `team-recipient-resolver.ts` | Rooted logical lookup | Healthy universal traversal | Retain as single logical resolver; reject `/`. |
| `task-delegation-target-mapper.ts` | Adjacency and target mapping | Rejects valid resolved target | Delete/replace with operation validator over shared placement. |
| task service/registry/ledger/persistence scope | Task lifecycle per TeamRun | Root facts routed through local services | Consolidate into one `TaskDelegationService` belonging to `RootTeamRun`. |
| task activation coordinator/factories | Prepare fresh Agent/Team execution | Reusable creation logic, wrong host input | Accept exact host TeamRun and return structural run reference plus ingress AgentRun. |
| task Agent/Team directories | Live exact bindings | Composite-address keyed, task-specific, and reached from local managers | Remove; tree/index owns facts, local registries own direct handles, and root `TeamRunResolver` owns exact live TeamRun access. |
| `TeamExecutionAddress` domain/DTO/serializer/parser | Concrete locator | Repeats logical address/ancestry; not uniform exact Agent ID | Remove from target runtime/contracts. |
| `TeamRunConfig` / metadata v3 | Configured persistent snapshot | Healthy topology/config facts, no task executions, redundant kind/address structure | Map into persistent branches of `team_run_execution_tree.json`. |
| mixed Team managers/handles | Recursive live containment plus root routing/task/directory/event concerns | One-manager-per-TeamRun is correct; responsibility breadth is not | Continue one manager per TeamRun; narrow it to local direct handles/lifecycle; register exact TeamRuns through root `TeamRunResolver`. |
| task records schema/store | Work relationship and lifecycle | Correct subject, over-copied identities/reference metadata | Exact compact V1 task file. |
| communication history/store | Ordinary Team messages | Correct subject, composite endpoints | Exact AgentRun endpoint V1 message file. |
| token usage store | Usage facts with exact run plus composite JSON | Composite is redundant | Root TeamRun ID + exact AgentRun ID only for Team executions. |
| external-channel Team entry | Restore ingress | Composite entry address | `{teamRunId, entryAgentRunId}`. |
| application V5 contracts/packages | Application Team targeting/streaming | Exposes composite execution identity | V6 exact run-ID contract; discard/rebuild application data. |
| browser execution state/materializers | Concrete UI state | Serialized composite map and duplicate topology/task builders | One immutable execution aggregate indexed by run IDs. |
| prompt/tool/docs | Agent-facing behavior | Relative/locality wording duplicated | One server-owned exact absolute/universal copy. |
| migration registry/runner/bootstrap catalog admission | Ordered persisted transition | Completed IDs never rerun; `FAILED` is retryable; store transactions are owner-scoped | New independent per-root migration plus valid-target catalog; server listen waits for the attempt, not global exact success. |

## Runtime / Probe Findings

| Method | Observation | Design Consequence |
| --- | --- | --- |
| Static logical call trace | Valid cross-branch placement reaches the shared resolver before task adjacency failure. | No task-specific logical resolver is needed. |
| Static allocator/factory trace | All task-Team Agents receive normal globally collision-aware AgentRun IDs and all task Teams receive fresh TeamRun IDs. | Intrinsic IDs can replace the composite exact selector. |
| Static stream binding trace | Task-Team Agent binding carries both composite address and extra AgentRun ID. | Composite address is insufficient and redundant once the tree exists. |
| Static frontend trace | Address-only focus is ambiguous for repeated task executions; current navigation shows topology names for task rows and treats Team rows like generic clickable executions, while exact AgentRun/TeamRun lookup already exists in places. | Keep logical address for placement, exact run IDs for rows/focus; label task rows from task intent and make Team rows expand exact member subtrees. |
| Static workspace trace | Ordinary UI often shares one root path, but explicit/application launch accepts per-Agent `workspaceRootPath`. | Persist workspace path inside persistent Agent launch configuration; omit `workspaceId`. |
| Static reference trace | Tool APIs accept local paths; persisted reference ID/type/timestamps are never independently edited. | Persist path arrays; derive stable reference presentation from parent ID/path/time. |
| Read-only local Team store audit | Five recorded task Team executions have two-segment predecessor addresses and matching physical TeamRun/AgentRun directories. | Historical task-Team IDs are recoverable when store evidence agrees. |
| Read-only token audit | Token rows carry exact `run_id` beside old composite execution JSON. | Token migration can preserve exact AgentRun identity without composite target fields. |
| Disposable exact fixture validator | Strict keys, canonical addresses, direct host containment, nearest-containing-scope/configured-descendant selection, unique runs, coordinator mapping, task correlation/status replay, and message endpoints all passed across five cases. | The exact three-file shapes are projection-complete and internally tight for represented states. |

No live provider probe was needed for architecture discovery. The later API/E2E phase owns imported nested-classroom execution across AutoByteus, Codex, and Claude after implementation review.

## Findings From Code / Docs / Data / Logs

### F-001 — Logical recipient resolution is already universal

`TaskDelegationToolService` resolves through the root TeamRun. The adjacency rule is an operation-owned guard applied after a valid root placement exists. The target keeps the shared resolver and removes the artificial eligibility layer.

### F-002 — Root task lifecycle ownership is the natural boundary

Task IDs, durable records, rooted topology, and root identity already exist. Per-Team service/ledger ownership forces submit/review/settlement routing through caller locality. One root owner is smaller and truthful.

### F-003 — Target logical parent and caller execution scope determine the exact host

For target `/qa/automation/tester`, the required host is a concrete Team execution for `/qa/automation`. The caller's concrete Team ancestry identifies the nearest enclosing execution subtree that contains that logical parent. From that exact ancestor TeamRun, configured-Team-member descent—not arbitrary task-execution traversal—selects `/qa/automation`. Thus a caller inside task Team `/qa` uses that task subtree's `/qa/automation` TeamRun, while a caller in an unrelated `/research` task subtree reaches structural root and then persistent `/qa/automation`. No persisted chain is required, and the task relationship does not change containment.

### F-004 — Task relationship and runtime containment are independent

A task `/research/... -> /qa/tester` crosses branches. The assignee belongs under `/qa`; the task record connects the delegator AgentRun to the fresh assignee execution. Encoding that relationship as ancestry produces a false tree.

### F-005 — Existing recursive TeamRun composition is the live tree

Persistent subteams and task Teams are already real nested TeamRun instances. The target is a refactor of that execution structure into a root-owned tree/index and durable form, not a second greenfield runtime.

### F-006 — AgentRun and TeamRun IDs are sufficient exact identities

Logical addresses may repeat across persistent and task executions. AgentRun/TeamRun IDs do not. They identify exact instances directly; the tree derives owner and ancestry. `TeamExecutionAddress` can therefore be removed rather than wrapped.

### F-007 — Root is structural, not an Agent-facing recipient

The logical root has an AgentTeam definition/name and a TeamRun ID, but no Agent can receive work at `/`. Users and Agents target its explicit coordinator Agent address when they want root-team ingress.

### F-008 — Team task ingress is derived, not persisted in the task record

A Team task record points to its fresh `teamRunId`. Resolve its configured `coordinatorAddress` against that task Team's member bindings to derive the returned/contact `agentRunId`. Copying coordinator ID into the record would create a second mutable-looking authority.

### F-009 — Task execution nodes should inherit immutable configuration

A task execution cannot choose a new definition, role, description, coordinator, or launch configuration. Its canonical logical address selects those facts from the configured branch. Task nodes therefore persist only fresh run bindings, nested containment, and execution timestamps.

### F-010 — `address` and `recipientAddress` are not redundant roles

An execution node intrinsically occupies logical `address`. A task record states which `recipientAddress` the delegator selected. Their values agree for the task root, but their meanings and validation directions differ. Keeping both prevents Team recipient/coordinator conflation.

### F-011 — Materialized `status` is justified

Task status is derivable from ordered updates but is the task ledger's directly queried current business state. Keeping it with immutable updates is a deliberate materialized state, guarded by replay validation—not an unjustified parallel identity.

### F-012 — Per-Agent workspace root must remain

The common UI shares a workspace, but supported explicit/application launch can configure Agents independently. `workspaceRootPath` remains in persistent Agent launch configuration. `workspaceId` is excluded from the file because it is not required for restore and can be derived/managed by the workspace subsystem.

### F-013 — Three files answer three different questions

The execution file owns concrete containment and launch snapshot; the task file owns work edges/state; the message file owns communication. Combining them would couple high-frequency append/state transitions to structural runtime state and blur lifecycle ownership.

### F-014 — No fourth manifest is required

Root definition/name/run ID, timestamps, archive state, application binding, handoffs, persistent members, and task executions fit coherently in the execution tree. A separate manifest would either duplicate those facts or force two files to be read to understand one aggregate.

### F-015 — Frontend can be simpler without persisting a view

The backend can join strict tree/task/message domain state into a change-sequenced execution view. One browser reducer owns live/restore changes; presentation-only expansion/drafts/unread state stays local. The non-persisted `changeSequence` is owned only by root event publication; the view is rebuildable and therefore not a fourth persistence authority.

### F-016 — Restart must terminalize, not recover, task work

The base does not support reattaching live provider/task work after process loss. Target startup converts stale `active`/`awaiting_review` records to `interrupted`, settles nodes, removes unreleased orphans, validates, then exposes the root.

### F-017 — Two-file task activation needs one root mutation boundary

Tree and task files cannot be atomically renamed as a pair without a journal. The safe product invariant is achieved by preparing without releasing work, durably writing the node first, then the active task record, then committing in-memory state/publishing/releasing. A crash after the first write leaves a removable orphan, never executable unrecorded work.

### F-018 — Representative predecessor task-Team IDs are recoverable

The local task records identify task TeamRun IDs; physical paths identify allocated member AgentRun IDs; metadata identifies logical placements; token rows correlate exact `run_id` with predecessor logical/task ancestry. The migration may reconstruct only when these independent facts agree.

### F-019 — Unobserved historical allocations cannot be invented

A task Team allocation that left no record, physical path, token row, message, or other durable binding is not supported history. Migration omits unprovable bindings for settled historical task Teams and blocks if a retained record/message/token requires one ambiguously.

### F-020 — A new migration record is mandatory

The base already has completed canonical-identity/token migrations. Editing code under a terminal migration ID would not rerun for supported upgrades. The target needs a new pending ID. Bootstrap waits for that migration attempt to finish, catalogs only complete validated V1 roots, and keeps unresolved predecessor roots under a retryable `FAILED` record without blocking target-only server listen.

### F-021 — Token conversion requires one store transaction

The local DB is large and contains many exact `run_id` facts. Row-by-row commits could leave mixed identity. The token store must own a single transaction/table-rebuild boundary with rollback proof.

### F-022 — Application data is not part of the released migration cohort

The user confirmed the application framework has no supported users/data compatibility obligation. Application types still must remain structurally consistent, so project-owned contracts/packages move atomically to V6; old application data/fixtures are discarded or rebuilt.

### F-023 — Exact scenario fixtures close the schema discussion

The 15 normative JSON files cover persistent-only, active task Agent, nested task Team and child task, accepted settlement, and restart interruption. Their strict validator result proves no extra parent path, route key, kind, coordinator ingress copy, launch copy, or composite execution address is required.

### F-024 — The change is intentionally a clean architectural cut

Keeping `TeamExecutionAddress` beside the execution tree would retain two ways to identify/locate the same exact run and would force adapters across persistence, events, applications, and frontend. Removing it in one coordinated sequence is larger but simpler and more maintainable.

### F-025 — Definition-authored and derived runtime facts are not execution-tree fields

The current restore path already resolves Team name/instruction from `teamDefinitionId`, hard-selects the supported `MIXED` Team backend, and derives filesystem workspace identity from `workspaceRootPath`. Application-launched Team members currently copy one application/binding pair plus a composite producer identity into every configured Agent node; after the V6 exact-run cut, the root `applicationBinding` plus each node's `address` and `agentRunId` derives that producer context. Persisting Team instructions, backend kind, workspace ID, or per-Agent application producer objects in the new execution tree would create parallel authorities rather than preserve independent run facts.

### F-026 — Task intent is the natural navigation label; task Team membership is the natural expansion

A task execution shares a logical placement with its configured persistent execution but has a distinct run identity. Showing both on one row conflates focus/status/history, while showing a raw task or run ID does not explain the work. The task record already owns the authoritative description and status, so the frontend can derive `Task: <description prefix>` without persisting a title/summary. For a task Team, the execution tree already owns the fresh TeamRun member subtree; expanding that row is truthful and avoids treating the Team itself as an implicit coordinator Agent endpoint.

### F-027 — One manager per TeamRun is already the native execution boundary

`MixedTeamRunBackendFactory` creates the root manager; `MixedSubTeamRunFactory.createOrRestore()` creates a new `TeamRun`, backend, and manager for every materialized configured or task subteam. This matches real lifecycle ownership: a TeamRun owns its direct configured members, direct task executions, local open work, and recursive termination. A single manager for the whole root would replace an already coherent recursive boundary with a larger coordination object.

### F-028 — The manager is broad because root and local ownership are mixed

The same `MixedTeamManager` currently owns three local registries and also a root recipient resolver, task directories, task-Team chain resolver, listener set, activation barrier, `parentBoundary` bubbling, and root-directory disposal. The public `TeamManager`/`TeamRun` surfaces expose this combined set. Universal cross-branch routing should not add more branches there. A public `RootTeamRun` must own root subject services, `TeamRun` must remain the local boundary, and `MixedTeamManager` must become private local execution machinery.

### F-029 — `revision` is an overloaded name, not a root domain fact

Task review can request a task revision, while the frontend also needs a monotonic live-event ordering number. Calling both `revision` is ambiguous. The live number is a non-persisted `changeSequence` owned by `TeamRunEventPublisher`; task revision remains task lifecycle language. No `RootTeamRunState` object or persisted revision field is required.

### F-030 — Final spine expansion found no new owner or schema gap

The design-principle audit mapped every approved use case and acceptance family through the real product boundary. It found that root creation, handoff discovery, task reference admission, task-notification return behavior, exact Agent commands, root teardown, current token attribution, external Team entry, and file/history/monitor lookup were already supported by the ownership model but were compressed into broader narratives. DS-021–DS-029 now make those paths explicit without introducing new state or services. The expanded audit found no need for a fourth persistence file, global manager, second execution identity, compatibility runtime, provider-specific task policy, or speculative recovery behavior.

### F-031 — Accepted Team-message history needs one AgentRun-owned reservation

`AgentRun.postUserMessage()` currently admits, claims, and begins provider dispatch before its accepted result returns. A later communication-file write cannot make that already-started input durable. The proportionate correction is one `reserved` state inside the existing FIFO owner: reserve without dispatch, persist, synchronously commit/release; cancel on persistence failure. This preserves one queue and one input policy.

### F-032 — Initial status already has one supported TeamRun source

The Team WebSocket connection calls `TeamRuntimeSnapshotService.getInitialMessages()`, which reads `TeamRun.getLeafAgentStatusSnapshots()`. That recursive query already covers configured offline leaves plus live task Agent/task-Team handles and maps `TeamAgentStatusSnapshot` through the canonical status projector. The target root snapshot must consume this source inside its publisher barrier rather than inventing a browser/default status model.

### F-033 — A sealed preparation can eliminate recoverable post-durable activation failure

Current task preparation creates gated handles, but active-directory registration, barrier commit, and release methods can still throw after record persistence. All are locally checkable before persistence: reserve registry/TeamRun slots, finish construction, seal event/work production, validate event budget/payload and immutable snapshots. After the task-file directory sync, only preallocated pointer/map state transitions, event enqueue, and latch release remain; subscriber/provider work runs later and cannot change activation truth.

### F-034 — Physical serialization is insufficient when callers derive complete message snapshots first

The SR-006 interface `commitReservedMessage(nextMessages)` accepts a full snapshot already computed by `TeamCommunicationService`. Two supported overlapping `send_message_to` calls can both reserve valid AgentRun FIFO entries and derive `M0+A` / `M0+B` before either enters the root write queue; serial file replacement then loses one accepted row. The correct boundary is one sealed one-shot append plan submitted immediately after synchronous FIFO reservation. `TeamRunPersistenceCoordinator.commitReservedMessageAppend(plan)` acquires the existing root mutation lock first; only then does the plan read the service-owned current message state, revalidate the current root/endpoints/reservation and message-ID absence, derive the next immutable snapshot, write it, swap memory, commit the preallocated event slot, and commit/release the reservation. A pre-durable validation or write failure cancels the plan and reservation. This is one existing-root-lock correction, not an outbox, retry, replay, second input queue, persisted revision, or fourth file.

### F-035 — Every task lifecycle mutation needs one current-state command order

Activation alone is serialized in SR-007. Two supported task assignees can submit different tasks concurrently, or one can submit while an independent delegator reviews another task. If both read `T0` and later call a serial physical writer with `T0+A` and `T0+B`, one valid transition disappears. `TaskDelegationService` is already the sole approved task lifecycle owner, so the smallest correction is one private FIFO `TaskDelegationCommandQueue` inside that service. Activation prepares/seals an execution before queue admission but carries only an immutable activation proposal; every command reads, authorizes/revalidates, derives, writes, commits memory/event state, and determines its result while it is the queue head. No other task mutation path or queue remains.

### F-036 — Rename success creates a distinct finalization-indeterminate outcome

The base `atomic-json-file-writer.ts` performs temp write, best-effort file sync, rename, then best-effort directory sync. The target contract requires both sync stages, so errors cannot be swallowed. Once rename succeeds, a later directory-open/sync/close error cannot truthfully take the same clean-cancel branch as a pre-rename failure because the final path already names the new payload. One strict Team-run writer must return `not_renamed | renamed_finalization_indeterminate | committed`. A `not_renamed` outcome permits normal abort/cancel; `committed` permits the prevalidated no-throw release; `renamed_finalization_indeterminate` synchronously latches the affected `RootTeamRun` failed, publishes/releases nothing, emits no normal domain result, and requires strict reload/reconciliation before the root can serve again.

### F-037 — The task interaction catalog has one duplicated identity

The catalog contains 21 semantic rows but labels both overlapping ordinary messages and multiple tasks awaiting review as `INT-020`. The message concurrency row retains `INT-020`; the later review row becomes `INT-021`. Self-validation must compare row count with unique IDs and reject any duplicate.

### F-038 — Migration failure can be isolated without adding runtime compatibility

The migration runner records `FAILED` as retryable and reruns it during a later `runPending()`. Therefore the user-requested resilient behavior does not require a legacy runtime reader: migrate and promote each root independently, admit only complete target roots, leave an unresolved predecessor root byte-stable and absent from the current catalog, let the server and new Team creation continue, and retain `FAILED` for the next startup/explicit retry. If no root migrates, the target-only server starts with no restored historical roots. This is distinct from a runtime post-rename ambiguity because migration runs before a root is exposed.

### F-039 — Terminal task state already separates relationship completion from execution cleanup

`accepted` or `interrupted` belongs to `task_delegation_records.json`; `settledAt` belongs to the referenced task execution node in `team_run_execution_tree.json`. The approved product already allows a terminal task record to retain a live execution while child/local work drains. Therefore interruption must first commit the task-file transition, and settlement later needs to change only the tree. A two-file settlement snapshot adds a partial-write problem without representing any new truth.

### F-040 — Reversible quiescence is the missing pre-durable capability

The local owner can safely prepare settlement without destructive work: reserve the exact task registry entry, close new Agent input, wait all earlier reserved/committed/queued input and active dispatch to resolve, recursively acquire equivalent child-Team leases, then recheck open work. This phase performs no backend termination, handle deletion, or `TeamRunResolver` unregistration. `not_renamed` can therefore cancel the leases in reverse order and restore the same routable execution. The capability is in-memory and local-owner-issued; it is not a new persisted lifecycle or second task owner.

### F-041 — Durable settlement precedes destructive cleanup

At `committed`, the root closure swaps the execution tree/event state and synchronously commits the prepared quiescence capability, making the exact execution non-routable and handing its already-owned handles to one committed cleanup capability. After the root lock unwinds, that capability recursively terminates and disposes the local execution, then releases inactive TeamRun registrations. If teardown rejects after committed durable truth, rollback is impossible and must not be reported as persistence failure; the affected root enters lifecycle fail-stop and closes. Strict reload will not recreate the settled execution.

### F-042 — CRR-001 implementation findings remain separate from the design correction

CR-F-001 requires the activation indeterminate branch to preserve hidden preparation and emit no ordinary `not_started`. CR-F-002 requires `releaseWork()` to flip synchronously inside activation `commitAfterDurability()`. CR-F-003 requires ordinary AgentRun quiesce to await an unresolved Team message reservation rather than delete it. These are implementation corrections under the existing owners. SR-009 records them in affected-file/test guidance but does not invent new behavior or architecture for them.

### F-043 — CRR-001 passes the Product Reachability Gate

SR009-MP-001 through SR009-MP-004 establish independent supported triggers, complete production paths, lifecycle states, and consequences for every CRR-001 finding. CR-F-002 is on the normal delegation success path. CR-F-003 is a real concurrency between two exposed same-root tools. CR-F-001 and CR-F-004 are invoked by exposed task actions through the mandatory phase-aware Team-file writer contract. Therefore the review result is not a purely mechanical code concern and can govern SR-009. The reviewer probes are retained only as reproduction evidence.

## Persisted Data Transition Evidence (When Applicable)

### Stored subjects and observed volume

| Store | Observed cohort | Required treatment |
| --- | --- | --- |
| Root Team memory directories | 507 directories | Discover every root; classify current/empty/unsafe. |
| `team_run_metadata.json` | 501 files | Convert schema-v3 configured tree to target execution tree and retain timestamps/handoffs/IDs/settings. |
| `team_communication_messages.json` | 343 files | Convert composite participant identities to exact AgentRun endpoints where unambiguous. |
| `task_delegation_records.json` | 2 files / 5 task Team records | Convert task relation/state; reconstruct task Team bindings from agreed durable evidence; terminalize. |
| Agent memory subdirectories | Existing persistent/task TeamRun/AgentRun path hierarchy | Preserve physical layout; use as migration evidence. |
| Token ledger | 171,891 rows; 203 rows with task-Team-shaped execution JSON in the inspected DB | Transactionally retain `run_id`/usage/root and remove composite execution JSON. |
| External-channel/application dependent state | Source-defined, not fully enumerated by local count | Convert supported external Team entry to run IDs; discard/rebuild application data. |

### Transition decision

- Framework-owned released Team/history/task/message/token/external data: **Migration Required**.
- Agent memory physical paths: **Directly Retained — No Relayout**.
- Application framework data/bundles: **Discard or Rebuild**.
- Runtime compatibility: forbidden.
- Migration authority: new independent `20260814_team_run_execution_tree_v1` record (final ID subject to exact implementation registry collision check, not semantic reuse).
- Unsafe behavior: stage/promote nothing for that root; preserve its source bytes; record actionable root/record diagnostics; keep the migration `FAILED` and retryable; omit the root from the target catalog while other current roots and new Team creation remain available.
- Idempotence: current exact packages and already-converted token/external rows are no-op on rerun.
- Runtime admission: server listen waits only for the current migration attempt to finish. Normal runtime enumerates valid target packages only and contains no predecessor parser, empty-root compatibility projection, lazy conversion, or fallback.

## Constraints / Dependencies / Compatibility Facts

- The user-selected base is `origin/codex/agent-team-hierarchical-handoffs`, not `origin/personal`.
- One rooted TeamRun remains the hard authorization, persistence, and routing boundary.
- `AgentTeamRunManager` remains the process-wide root-run catalog; child TeamRuns remain private to their owning `RootTeamRun`.
- `/` remains structural syntax only; no Agent-facing root recipient exists.
- `target_agent_run_id` remains an exact existing-Agent selector for `send_message_to`, not for `delegate_task`.
- Handoffs remain optional advisory configuration.
- AgentTeam task ingress remains coordinator-based.
- AgentRun FIFO/active-input/interrupt and provider segment policy remain unchanged; its lifecycle boundary is tightened so ordinary quiescence waits already-submitted reservations rather than deleting them.
- Normal runtime is forward-only; no aliases, dual readers, fallbacks, or lazy conversions.
- Historical field knowledge is permitted only inside the isolated migration folder/tests.
- Operational databases, credentials, protected stashes/backups, and incident/no-rollback constraints must be preserved by later specialists.

## Open Unknowns / Risks

- No product-model unknown remains. SR-009's settlement capability and failure phases are fully specified for architecture review.
- Exact application V6 file/version mapping is enumerated by responsibility in the design and must be verified by package consistency coverage.
- Migration implementation must confirm the proposed new ID is unique at implementation time and prove every supported predecessor correlation path over representative fixtures.
- The cross-cut touches many current files; sequencing must prevent a temporary production state with both composite and exact identities.
- API/E2E live validation is expensive and credential-sensitive; it remains downstream-owned after implementation and source review.

## Final Self-Validation Conclusion

The investigation and exact-schema proof are complete. The refined package deliberately replaces the SR-001 “preserve composite address/no migration” posture and the SR-002 `RootTeamRunState` proposal with smaller explicit boundaries:

```text
logical placement -> canonical absolute address
exact Agent       -> AgentRun ID
exact Team        -> TeamRun ID
ancestry          -> execution-tree containment
task relation     -> task record
ordinary message  -> exact AgentRun endpoints
public root API    -> RootTeamRun
local Team owner   -> TeamRun -> MixedTeamManager
live event order   -> non-persisted changeSequence
```

The user approved this model and authorized architecture review after final validation. ARCH-REV-004 passed cumulative SR-008, and IR-001 implemented that package. CRR-001 then exposed one design contradiction in MGR-005 plus three bounded implementation defects. SR-009 preserves every accepted boundary while replacing terminate-before-write settlement with reversible quiescence, a tree-only durable commit, and postcommit local cleanup; it retains CR-F-001–CR-F-003 as explicit implementation work. `solution-self-validation.md` contains the refreshed lifecycle/phase audit. The next step is complete cumulative architecture re-review; implementation and API/E2E remain blocked until the corrected package passes and source is re-reviewed.
