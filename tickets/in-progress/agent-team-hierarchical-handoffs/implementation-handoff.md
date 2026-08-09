# Implementation Handoff

## Upstream Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Address/handoff contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Exact Team collaboration system-instruction reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-collaboration-system-instruction.md`
- Canonical identity contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/team-run-canonical-identity-refactor.md`
- Live validation contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/nested-classroom-live-validation-contract.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Architecture decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Downstream lineage: `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-review-report.md`, `delivery-revision-record.md`, and `delivery-integration-blocker.md` in the same ticket directory. `CRR-029` passed IR-017 and resolved `CR-F-016` / `API-F-008` plus `CR-F-017` / `API-F-009`; focused `API-REV-013` then exposed `CR-F-018` / `API-F-010`, and `CRR-030` returned its active task-Team peer misrouting as a bounded Local Fix. SR-015 and `ARCH-REV-009` remain current authority. `API-REV-013` is paused at 90%; earlier completed delivery results cover SR-006 only.

## Current Implementation State

- Implementation revision: `IR-018`
- Implementation cycle: `Local Fix`
- Current solution: `SR-015` (`SR-001` through `SR-015` cumulative), including the exact-copy `SR-014` Team collaboration instruction
- Architecture approval: `ARCH-REV-009` Pass (`ARCH-REV-008` remains the complete structural baseline)
- Triggering finding: `CR-F-018` / `API-F-010` from `CRR-030`. `CR-F-012` through `CR-F-017` remain source-resolved. No requirement gap, design impact, or unclear finding is open.
- Current code review: `CRR-030` Fail — Local Fix. `CRR-029`'s IR-017 source Pass is superseded for current acceptance; IR-018 corrects exact same-task-Team peer routing and awaits focused source re-review.
- Current API/E2E: `API-REV-013` remains halted at 90% with its cumulative durable delta, both fixture corrections, and retained live failure state preserved. After source Pass it must rerun the AutoByteus active task-Team peer scenario and complete the still-required Codex and Claude rows; implementation edited no durable coverage.
- Delivery lineage: completed delivery results through `DR-003` prove SR-006 only; `DR-004` is cumulative SR-012 lineage context, not completed SR-015 delivery proof.
- IR-005 SR-012 baseline source commit: `3927e878db0318138b6e39ad7cea1b032584e08f`.
- IR-013 source commit: `6a920d45e54981735c25146e0ab76ab7e0917c4c`.
- IR-014 source commit: `4dd8ff543d1c7ebbc8b1c6ffca6923487aa3eda5`.
- IR-015 source commit: `24597cf194306848a06fdfe667ba932459c15c33` (`fix: make canonical token migration atomic`).
- IR-016 source commit: `110b9007615741fa0f5a96974b95ad7bc2be595c` (`fix: remove dead Claude handoff control`).
- IR-017 source commit: `b877d343b30fe01bd2f39546c0e8279adbd00dff` (`fix: preserve nested Team delivery identity`).
- IR-018 source commit: `035fba611e6895187f7f6d4644993e22efd8c38c` (`fix: route active task-Team peers exactly`).
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`

## Implementation Summary

IR-005 replaces the remaining route/path/name identity system with the SR-012 canonical model across the server, GraphQL/REST/WebSocket boundaries, application SDKs and bundled applications, and the production web client.

The TeamRun snapshot is now an immutable schema-v3 rooted `agent_team` aggregate at `/`. Each node has one canonical `AgentTeamAddress`, node-local kind-specific run IDs, Agent-local launch facts or AgentTeam-local coordinator/children facts, and compiled handoffs. Runtime indexes derive topology and lookups from that root tree. Persistent children select absolute nodes from the shared snapshot; task AgentTeams allocate distinct runtime identities without inventing local address forms.

Concrete runtime attribution uses exact `TeamExecutionAddress {rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}` values. Message/task selectors are atomically renamed to `recipient_address`; the exact live `target_agent_run_id` route and its operation envelope remain separate. `get_handoff_rules` is intrinsic for Team-bound Agents and projects only ordered `{when,recipient_address}` entries, while provider-neutral instructions require handoff lookup before completion or blocked termination.

Blocking migration converts framework-owned TeamRun metadata, communication/task structured files, token usage, external bindings, and application platform databases before service startup. One migration-only flat decoder preserves historical display `memberName` separately from structural route/path. When pending, stable `20260517_team_run_metadata_member_tree` alone writes the validated predecessor `memberTree`; separately pending `20260801_team_canonical_identity` alone writes final schema v3 and may compose the same decoder in memory for residual flat input after a terminal stable record. Current readers are strict target-only readers. Project-owned application backend-definition/frontend-SDK contracts advance atomically to V5, while application manifest V4, backend bundle V1, and iframe V4 envelopes remain unchanged. V4 SDK bundles are rejected before executable behavior with application/path identity, observed and required versions, and rebuild/reinstall guidance. Database discovery is independent of bundle catalog admission.

The frontend now consumes the recursive `rootTeam`, derives canonical address indexes, and keys persistent/task state using canonical execution addresses. No production compatibility map, scoped route, path/route alias, or V4 adapter was introduced.

### IR-006 Local Fix Summary

- `CR-F-003`: every non-root `MixedTeamManager` now forwards an inter-Agent intent through its existing `parentBoundary` before recipient resolution or runtime materialization. The chain terminates at the root manager, which alone validates the intent's root TeamRun ID and uses the root registry/coordinator. Persistent, restored, nested, and task-child contexts all carry this placement boundary. A foreign-root intent therefore reaches the root and is rejected there; no retry, fallback, or alternate address form was added.
- `CR-F-004`: `publish-artifacts-tool.ts` now derives publication and notification Agent identity only from the current artifact `runId`/tool `agentId`. Both `customData.member_run_id` reads were removed, and the expanded current-production audit finds no occurrence of that obsolete key.
- Change posture: bounded bug fix and clean-cut legacy removal. Root-cause classification: one incorrect ownership/placement branch plus one stale compatibility fallback. No design refactor or persisted-data change is needed.

### IR-007 Local Fix Summary

- `CR-F-005` / `API-F-001`: after strict expression normalization, `TeamRecipientResolver` now walks each canonical address prefix before its existing exact final-node lookup. A present Agent prefix yields `COLLABORATION_TRAVERSAL_INVALID`; a missing prefix or final node remains `COLLABORATION_TARGET_NOT_FOUND`.
- The traversal constructs prefixes only through the canonical `AgentTeamAddress` domain and reads the existing rooted `TeamRunTreeIndex`. It adds no alternate selector, route, retry, fallback, or compatibility representation, and message/task callers continue to share the same resolver.
- Change posture: bounded bug fix. Root-cause classification: local implementation defect in error classification; the current resolver/index ownership remains correct and no design or persisted-data change is required.

### IR-008 Local Fix Summary

- `CR-F-006` / `API-F-002` producer: `AutoByteusManagedTeamContext` now carries `addressing`, built as an independently frozen exact clone of `context.collaboration.addressing`. The existing backend factory therefore injects the canonical two-field caller binding into native `customData.teamContext` for every Team-bound AutoByteus Agent.
- Consumer: `buildTaskDelegationToolContextFromNativeContext` validates the raw `addressing` value is a non-array object with exactly `memberAddress` and `rootTeamRunId` before constructing its independently frozen domain value. Removed fields such as `memberPath` are rejected rather than selected away.
- No addressing is derived from top-level member/execution/name/path/route fields. Existing `TeamExecutionAddress`, Agent/task identities, and the single consumer shared by `delegate_task`, `submit_task_result`, and `review_task_result` remain unchanged.
- Change posture: bounded producer/consumer contract correction. Root-cause classification: local implementation defect at one native boundary; no design, routing, or persisted-data change is required.

### IR-009 Local Fix Summary

- `CR-F-007` / `API-F-004`: `TaskDelegationService` now resolves an active task caller through the root-scoped `TaskAgentDirectory` before target mapping and passes the exact authorized task AgentRun ID to the mapper. The directory branch requires one exact task-instance object and matches AgentRun, task AgentRun, task ID, logical/execution member address, root/current owning TeamRun, and task-TeamRun chain; missing, starting, settled, foreign, extra-field, or inconsistent identities fail closed before task-ID reservation or ledger mutation.
- `TaskDelegationTargetMapper` retains persistent-caller authorization against the immutable current-Team Agent node. It uses the task-scoped branch only when the service supplied the directory-authorized run ID, still requires the rooted logical/execution coordinates and current physical caller node, and preserves self-target, direct-current-Team, exact kind, and child-Team ingress validation.
- No retry, alternate address, persistent-node substitution, compatibility shape, or fallback identity was added. Active task Agents can therefore chain direct work while forged contexts cannot opt themselves into the task branch.
- Change posture: bounded caller-authorization correction. Root-cause classification: local implementation defect in the SR-012 mapper rewrite; no design, persistence, or public contract change is required.

### IR-010 Local Fix Summary

- `CR-F-008` / `API-F-005`: `startConfiguredServer` now calls the required app-data migration runner exactly once and inspects its complete returned status set at the authoritative startup sequencing boundary.
- Every returned required status must be exactly `SUCCEEDED`. `FAILED`, `SUCCEEDED_WITH_WARNINGS`, `RUNNING`, `NOT_RUN`, or any other non-success state logs structured migration identity/status/attempt/failure/error/log-path evidence and returns before built-in bootstrap, Fastify construction, listen, channel/gateway startup, workspace/application recovery, or background tasks. A runner exception logs explicit `RUNNER_EXCEPTION` evidence and halts at the same boundary.
- A status explicitly marked non-required remains outside this blocking policy. No migration runner behavior, explicit retry API, lazy conversion, current-schema compatibility, or best-effort fallback was added.
- Change posture: bounded startup-gate correction. Root-cause classification: IR-005 registered the strict required migration without replacing the inherited best-effort runtime boundary; no design or persisted-schema change is required.

### IR-011 Local Fix Summary

- `CR-F-009`: `startConfiguredServer` now finds the one `TEAM_CANONICAL_IDENTITY_MIGRATION_ID` status returned by its single `runPending` call and requires that status alone to be exactly `SUCCEEDED`. Missing or non-success canonical status retains IR-010's structured evidence and pre-bootstrap return.
- Unrelated statuses no longer participate in the blocking predicate. Their existing runner/GraphQL/UI policy therefore remains intact, including persisted `SUCCEEDED_WITH_WARNINGS` and manual retry, while a runner rejection still prevents canonical completion from being established and remains blocking.
- The migration identity is imported from the migration owner's existing exported constant; no string alias, retry, fallback, lazy conversion, compatibility read, or alternate startup path was introduced.
- Change posture: bounded policy-scope correction. Root-cause classification: IR-010 generalized section 12.2's canonical-only blocking rule to the pre-existing best-effort migration set; no upstream design change is required.

### IR-012 Local Fix Summary

- `CR-F-010` / `API-F-006`: the stable `20260517_team_run_metadata_member_tree` prerequisite again reads each TeamRun metadata file and converts flat `memberMetadata` only when every entry is a safe direct Agent. Non-Agent entries, nested-Team fields, nested or contradictory route/path/name identity, ambiguous simultaneous `memberTree`, invalid target fields, and downstream canonical invariants fail before any file mutation.
- The migration emits the recursive member-tree staging shape, preserves genuine Agent run/platform/definition/runtime/model/tool/skill/config/workspace/application/role/description facts, validates that output through the next ordered canonical converter, then creates a backup and atomically replaces the source via same-directory temporary-file rename. Unsafe files remain byte-stable and unbacked-up.
- Existing valid `memberTree` metadata is validated and skipped idempotently, including schema-v3 input. Per-item details and aggregate `SUCCEEDED`, `SUCCEEDED_WITH_WARNINGS`, or `FAILED` results again reflect mixed and all-failure sets accurately. Registry order remains prerequisite then canonical migration.
- Historical flat-shape knowledge is confined to the migration helper. No current reader, canonical-converter flat branch, lazy conversion, retry, dual read, compatibility fallback, or alternate startup route was added.
- Change posture: bounded restoration of the reviewed migration prerequisite. Root-cause classification: IR-005 replaced the existing converter with a skip-only checkpoint even though SR-012 retained it as an ordered prerequisite; no upstream design change is required.

### IR-013 Approved Migration Rework Summary

- `CR-F-010` / `CR-F-011`: `team-run-member-tree-prerequisite-converter.ts` now owns one pure flat-v1 decoder and no canonical identity. It requires direct Agent routes, optional agreeing direct paths, unique structural placement, an exact direct coordinator, non-empty display names, and valid genuine Agent fields. It preserves `Program Manager` / `QA Specialist` exactly while emitting structural `program_manager` / `qa_specialist` route/path values, with no name-derived route fallback.
- Stable `20260517_team_run_metadata_member_tree` uses that decoder only when its record is pending, canonical-prevalidates the complete staged predecessor, and then alone owns predecessor backup plus same-directory atomic replacement. Existing predecessor/v3 data is validated and skipped; the stable ID and runner terminal-record behavior remain unchanged.
- Separately pending `20260801_team_canonical_identity` accepts schema v3, recursive predecessor `memberTree`, or residual safe flat v1. The residual-flat path composes the exact shared decoder in memory and writes only final v3. The predecessor path validates historical `memberName` only as display input and derives addresses exclusively from agreeing normalized `memberRouteKey` / `memberPath`.
- Parent/direct-child shape, duplicate placement, direct-Agent coordinator, generic/Team run-ID agreement, Agent facts, handoffs, complete v3 validation, unsafe no-mutation, canonical exact-success startup gating, and unrelated migration warning policy remain fail-closed and unchanged. No third migration ID, terminal-record reset, current runtime old-shape reader, lazy conversion, alias, retry, or post-listen recovery dependency was added.
- Change posture: approved SR-013 persisted-transition rework. Root-cause classification: historical display/structural semantics and terminal migration-record ownership were incomplete in SR-012; SR-013 now provides one decoder and two non-overlapping write owners.

### IR-014 Local Fix Summary

- `CR-F-012` / `API-F-007`: token attribution migration again builds a migration-only index from strict current `task_delegation_records.json` files. Every task TeamRun ID maps to one exact root TeamRun, ordered task-Team chain, logical Team address, source file, and task record. Missing ancestors, unreadable/invalid files, duplicate mappings, and conflicting root/chain/address mappings produce actionable blocking details before token mutation.
- Historical token rows use the task record mapping when their row-local root is an immediate task TeamRun or their legacy segment address names a task TeamRun. The planner validates any stored chain/logical Team prefix, appends only the final member suffix and optional task-Agent run ID, then persists one exact `TeamExecutionAddress` and correct root column. Direct members, direct task Agents, and already-current exact addresses preserve their existing behavior and idempotence.
- Identity planning is completed before writes; any unresolved/conflicting row blocks the batch without partially applying otherwise valid plans. Historical segments remain confined to the migration planner. No current-runtime legacy reader, retry, fallback, alternate identity, compatibility shape, or task-record mutation was added.
- Change posture: bounded migration bug fix. Root-cause classification: local implementation defect introduced when IR-005 removed the prior task TeamRun index; the approved migration/current-record ownership remains correct.

### IR-015 Approved Token-Owner / Atomicity Rework And Exact Instruction

- `CR-F-013`: current registry authority under historical `20260703_token_usage_execution_address_backfill` is removed entirely. Its durable record is neither queried nor reset. Independently pending and already exact-gated `20260801_team_canonical_identity` now composes token conversion after every TeamRun/task item is current and owns the aggregate token result.
- `CR-F-014`: the preserved IR-014 task-Team index and row planner now feed one frozen canonical update batch. `PrismaTokenUsageCanonicalExecutionAddressMigrationStore` applies updates in stable row-ID order inside one Prisma/SQLite transaction, requires exactly one affected row each, verifies every exact root/address value before commit, and rolls the full batch back on any update/read-back failure. No `MIGRATED` token detail is emitted before commit; plan/index/scan/batch failure returns zero migrated token rows and invokes no partial persistence.
- Both pending token legacy cleanup definitions require exact `20260801...` `SUCCEEDED` and remain after that owner in registry order. The single pre-listen canonical gate is unchanged, so token failure keeps bootstrap/listen closed while unrelated warning migrations remain non-blocking. Exact-current and crash-after-commit retry perform no new batch.
- `SR-014`: `member-collaboration-instruction-renderer.ts` is the single exact-copy renderer and substitutes only the bound caller `memberAddress`. The same block flows through the existing AutoByteus system prompt, Codex developer-instruction, and Claude system/runtime-instruction seams for every Team-bound context; standalone Agents remain unchanged. Intrinsic `get_handoff_rules` / `send_message_to` exposure remains tied to Team binding.
- Change posture: approved SR-015 persisted-transition rework plus exact SR-014 text consumption. No runtime legacy reader, migration-record reset, retry fallback, extra migration ID/gate, provider paraphrase, roster injection, or durable coverage edit was added.

### IR-016 Claude Dead-Control Cleanup

- `CR-F-015`: `buildClaudeTurnInput` no longer declares the unused `getHandoffRulesEnabled` option, and `ClaudeSession.executeTurn` no longer derives or passes `configuredToolExposure.getHandoffRulesConfigured` to that builder.
- Team instruction authority remains exclusively the existing `memberTeamContext` path. The shared configured-tool exposure still owns genuine MCP tool enablement; no replacement flag, derivation, compatibility selector, or fallback was added.
- Change posture: bounded dead-code cleanup. Root-cause classification: local implementation defect left by the SR-014 authority move; the current provider/context boundary remains correct and no refactor or persisted-data change is needed.

### IR-017 Nested Team Routing Local Fix

- `CR-F-016` / `API-F-008`: the already-resolved collaboration delivery request now crosses each persistent child TeamRun through one explicit resolved-delivery boundary instead of being reconstructed as a raw `postMessage` with a nonempty AgentRun selector. The full immutable request preserves `resolvedTargetKind`, receiver execution address, exact persistent coordinator AgentRun ID, tracing IDs, and the single pre-publish event callback. Each child manager traverses only its direct persistent member tree; the final persistent or task handle validates exact execution kind, member address, task identity, and AgentRun ownership before one delivery.
- `CR-F-017` / `API-F-009`: task-Team activation now resolves the source Team only at `request.teamNode.address`, proves its exact configured coordinator, and validates the receiver's canonical root, exact coordinator address, null task-Agent ID, parent TeamRun, task TeamRun ID, and ordered task-Team chain before constructing or starting a handle. The coordinator Agent address is never used as a Team lookup key.
- No persistent/task registry retry, basename/alternate-address lookup, fallback selector, or weakened identity check was added. Activity/tool-result presentation is intentionally unchanged because the live failure was a contract rejection returned by a successfully completed tool invocation, not an execution error.
- Change posture: bounded routing correction. Root-cause classification: IR-005 lost an existing persistent-versus-task execution discriminant at the child boundary and used the receiver Agent address for a Team lookup. The explicit internal resolved-delivery boundary and exact activation checks repair those seams without changing public contracts or persisted data.

### IR-018 Active Task-Team Peer Routing Local Fix

- `CR-F-018` / `API-F-010`: root message routing now validates every nonempty sender task-TeamRun chain against the existing root-scoped `TaskTeamActiveRunDirectory`, including exact ordered prefix, active TeamRun/context/runtime identity, persistent or nested parent TeamRun, logical Team placement, and task identity. Persistent task-Team members additionally prove their task-scoped AgentRun; task Agents prove the active root `TaskAgentDirectory` entry and exact owning physical TeamRun.
- When the canonical target is inside the validated leaf task Team, the root manager materializes the recipient from that exact active TeamRun and sends the resolved request through the active run with the full ordered `taskTeamRunIds`, exact task-scoped peer AgentRun, and task ID. A target outside that leaf placement retains the ordinary persistent/root route, but only after the sender's full task execution scope has validated.
- Missing, inactive, foreign, truncated, reordered, wrong-parent, wrong-Team, or mismatched sender identity fails before trace publication or member input. No persistent fallback, retry, localization, basename lookup authority, compatibility selector, or Activity presentation branch was added. The explicit coordinator route preserves the existing persistent path from IR-017 while allowing the separately proven active task-Team execution path.
- Change posture: bounded routing correction. Root-cause classification: IR-005 retained the sender's concrete task chain but root recipient materialization always used the root manager's empty chain and persistent AgentRun. A focused task-execution resolver and explicit resolved-delivery route repair that ownership seam without changing public or persisted contracts.

## Reviewed Behavior Trace

| Behavior | Implementation result |
| --- | --- |
| BEH-001 | Definition handoffs remain validated and compile into immutable rooted snapshots; rejected updates still validate detached candidates before persistence. |
| BEH-002–BEH-003 | `send_message_to.recipient_address` uses the strict expression parser and one rooted resolver; non-root managers forward through their placement boundary before the root manager alone resolves/materializes root, upward, cross-branch, and Team-coordinator delivery. A resolved nested request preserves persistent-versus-task execution kind and exact AgentRun identity across child TeamRuns. An active task-Team sender targeting a peer inside its exact leaf task placement is routed through that proven active TeamRun with the full ordered task chain; outside targets retain ordinary persistent/root routing. |
| BEH-004 | Schema-v3 `rootTeam` replaces localized route-bearing trees; persistent children select absolute nodes and task TeamRuns allocate fresh typed run IDs. |
| BEH-005–BEH-006 | Intrinsic handoff lookup returns only `{handoffs:[{when,recipient_address}]}`. One exact SR-014 renderer substitutes only the caller address and carries the approved filesystem-like completion/blocked protocol without a roster or embedded rule set. |
| BEH-007 | Exact `target_agent_run_id` routing, codes, and send result envelope remain separate and unchanged. |
| BEH-008 | Strict restore consumes the self-contained schema-v3 snapshot and its compiled handoffs after blocking conversion. |
| BEH-009 | AutoByteus, Codex, and Claude use the same exact rendered Team collaboration block through their established system/developer-instruction seams, while retaining intrinsic Team tools and operation-specific transport/result mapping. |
| BEH-010 | Default Team entry still targets the root Team coordinator. |
| BEH-011–BEH-012 | `delegate_task.recipient_address` shares recipient resolution and its exact topology error codes with messaging, then applies the direct-current-Team policy and existing task lifecycle. Persistent callers match the rooted node AgentRun; active task callers match the exact root-directory task identity and local ownership before mapping/reservation. Task-Team activation resolves the Team at its canonical Team address and proves exact configured coordinator plus ordered task execution chain before start. AutoByteus native task tools receive an exact cloned collaboration caller binding, and canonical address remains the only shared logical placement authority. |
| BEH-013 | TeamRun is one immutable rooted Agent/AgentTeam union with kind-local facts and derived indexes, not parallel topology/profile/binding projections. |
| BEH-014 | Conversation, task, event, WebSocket, token, and frontend concrete identity use strict `TeamExecutionAddress` values. Live task-Team peer routing preserves the sender's proven ordered task chain and materializes the receiver from the exact active TeamRun. The canonical aggregate preserves IR-014 reconstruction of historical task-Team roots/chains/Team prefixes/member/task-Agent suffixes, plans all rows before mutation, and commits one verified immutable token batch. |
| BEH-015 | Store-owned backup/transaction conversion runs before strict readers. Pending `20260517...` owns predecessor writes; pending `20260801...` is the sole final TeamRun/task/token canonical aggregate even when old token records are terminal. Token index/plan failure mutates zero rows; update/read-back failure rolls back the entire stable-order batch. Both token cleanups require exact canonical success, and the existing targeted startup gate preserves unrelated-warning policy. |
| BEH-016 | GraphQL/REST/WebSocket/SDK/application/frontend boundaries use canonical address/execution shapes; exact application SDK V5 is built and V4 is rejected. |
| BEH-017 | Storage-private lineage is `ancestorTeamRunIds`; existing memory/context physical locations are derived without moving files. |
| BEH-018 | Production seams required by the imported nested-classroom scenario are implemented, including nested root-bound forwarding, exact persistent coordinator delivery across child TeamRuns, task-Team coordinator activation from canonical Team identity, and exact active task-Team peer delivery without persistent fallback. `API-REV-013` retains the pre-fix AutoByteus live failure and remains paused at 90%; its post-fix AutoByteus rerun and Codex/Claude rows are mandatory downstream work. |

## Key Areas

- Canonical logical identity: `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-address.ts`, `recipient-address-expression.ts`.
- Root snapshot/index/recipient resolution: `src/agent-team-execution/domain/team-run-config.ts`, `services/team-run-tree-index.ts`, `services/team-recipient-resolver.ts`, `services/resolved-team-recipient.ts`.
- Nested resolved delivery, task-Team activation, and exact active peer routing: `src/agent-team-execution/backends/{team-manager.ts,team-run-backend.ts}`, `domain/team-run.ts`, `task-delegation/task-team-active-run-directory.ts`, and `backends/mixed/{mixed-team-run-backend.ts,mixed-team-manager.ts,delivery/team-member-delivery-coordinator.ts,delivery/task-team-message-execution-resolver.ts,members/mixed-sub-team-member-handle.ts,members/mixed-agent-member-handle.ts,members/mixed-task-team-instance-registry.ts}`.
- Concrete execution identity: `src/agent-team-execution/domain/team-execution-address.ts` and task/message/event/token consumers.
- Strict persistence and startup migration: `src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.ts`, `team-run-member-tree-prerequisite-converter.ts`, `team-canonical-*.ts`, `token-usage-canonical-execution-address-migrator.ts`, its transaction-owning migration store, preserved planner/task-Team index, both token cleanup definitions, Prisma migration, and store normalizers.
- API/streaming: AgentTeam GraphQL schema/resolvers, REST/context boundaries, and `src/services/agent-streaming/team-execution-address-command-parser.ts`.
- Intrinsic collaboration protocol: the exact shared member collaboration renderer/composer plus AutoByteus/Codex/Claude system/developer-instruction and intrinsic-tool seams.
- Application contract: `autobyteus-application-sdk-contracts`, backend/frontend SDK packages, devkit, project applications, generated/vendor/importable artifacts, application admission/loader/migration paths.
- Frontend: generated GraphQL types, AgentTeam run store/tree/index utilities, execution selectors, communication/task/history/token/memory/application projections, desktop/mobile views.

## Persisted Data Transition

- Team definitions: `Directly Usable — No Migration`; authored definition handoffs remain the source contract.
- TeamRun metadata, Team communication, task delegation records, token usage, external bindings, and application platform databases: `Migration Required`; conversion is ordered and blocking. `20260801...` now owns TeamRun/task readiness plus token semantic conversion, stages all token plans, and commits/verifies required row updates in one rollback-safe Prisma/SQLite transaction. The old token record is historical only and never reset.
- Application bundles: exact backend-definition/frontend-SDK V5 is required. V4 is rejected/quarantined; there is no V4 adapter or mixed-version runtime.
- Physical Agent memory and final context files: locations remain unchanged. The storage layer derives the same concrete run-ID path segments through `ancestorTeamRunIds`.
- Deviation from reviewed transition decision: `None`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Current runtime dual-read/write or fallback: `None`; legacy handling is isolated to migration/incompatibility input boundaries.
- Removed current authorities include route/path/name recipient aliases, conversation target/scoped-route types, persistent-child topology localization, generic member-run identity, duplicate token/task execution scopes, the registered historical `20260703...` token definition/per-row mutation API, and V4 application SDK exports/artifacts.
- The current publish-artifacts runtime contains no `member_run_id` read or writer and does not accept that retired generic identity as a fallback.
- Production identity audits found no stale current route/name/path identity in the server runtime, web production code, or project application source/built/vendor/importable artifacts outside explicit migration/incompatibility boundaries.
- Current SDK `dist`, application vendor copies, application build products, and importable packages were regenerated rather than selectively patched.
- Claude turn-input production source has zero `getHandoffRulesEnabled` references; genuine `getHandoffRulesConfigured` exposure remains only at its shared configured-tool/MCP owners.
- IR-017 adds no receiver-as-Team lookup, basename/alternate selector, retry/fallback, or Activity/tool-result presentation branch. The resolved request's existing kind and exact execution coordinates remain authoritative across child TeamRuns.
- IR-018 adds no persistent fallback, retry, alias, localization, legacy route/path selector, or Activity/tool-result presentation branch. The only new basename read is a display-name projection after exact canonical resolution; it has no lookup authority.
- Changed production files satisfy the implementation size guard. IR-018's resolver/coordinator/manager are 158/111/335 effective non-empty lines; IR-017's eight files range from 38 to 280; every changed file remains below 500. IR-015 canonical aggregate/migrator/store are 153/96/102 effective non-empty lines; exact renderer/composer are 26/28. Preserved planner/index remain separate 290/191-line migration-only owners.

## Implementation-Scoped Checks

### IR-018 Delta

- Production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed. Evidence: `/tmp/ir018-production-typecheck.log` (empty success log; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
- `pnpm run build:full` — passed, including clean production build and sanitized built-in Agent bootstrap smoke. Evidence: `/tmp/ir018-build-full.log` (SHA-256 `b065d24fb2e6c3b436cc41e0f08dbf0910971a98bd944a48013cd0fd0e0ea851`).
- Built-JavaScript active-task-Team proof — passed exact outer peer delivery with the task-scoped AgentRun and one-element chain; exact nested peer delivery with the two-element ordered chain; exact task-Agent-to-task-Team-peer delivery; and outside-team `/Teacher` persistent routing with an empty receiver chain. Missing/inactive/foreign/wrong-parent/wrong-Team/truncated/reordered variants rejected before event or input, and neither persistent peer fallback started. Evidence: `/tmp/ir018-task-team-peer-routing-probe.mjs` (SHA-256 `0191e4f6d0a6c285246e8c42efb8204b115580c4803358f491706e020e365a0f`) and `/tmp/ir018-task-team-peer-routing-probe.log` (SHA-256 `76d48f882ca906713300db362eeff1d705105d1b0a58c2fd68a2080d1a587cc7`).
- Three maintained API/E2E-owned routing units were executed without implementation edits and passed 3/3 files and 11/11 tests: mixed root manager, persistent child handle, and delivery coordinator. This preserves both API-REV-013 fixture corrections plus IR-017 delivery behavior; it is implementation-scoped evidence, not downstream sign-off. Evidence: `/tmp/ir018-routing-units.log` (SHA-256 `3a95bf9b19b278e67a71857e679d9fddef6a47485c3557d75ce6d846f1caa161`).
- Focused source/diff/whitespace/no-fallback/size audit — passed for exactly three production files. It confirms directory-backed exact execution seams, no fallback/retry/alias/localization/legacy selector/Activity branch, display-only basename use, and effective sizes of 158/111/335 lines. Evidence: `/tmp/ir018-routing-audit.log` (SHA-256 `34bb43d4420b9c26bc7f1ad47a509ce6789f85e0065fc6718a84c9897d35bb33`). Source commit: `035fba611e6895187f7f6d4644993e22efd8c38c`. No API/E2E-owned durable file was edited.

### IR-017 Delta

- Production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed. Evidence: `/tmp/ir017-production-typecheck.log` (empty success log; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
- `pnpm run build:full` — passed, including clean production build and sanitized built-in Agent bootstrap smoke. Evidence: `/tmp/ir017-build-full.log` (SHA-256 `b86a85640e6ff270736d7b128dc640f54e72df0a979fc7ec6b729159e505812f`).
- Built-JavaScript nested-routing proof — passed: one logical-member request reached the exact persistent nested coordinator once; persistent-ID mismatch rejected before delivery; exact task-kind delivery reached the task Agent; task kind with a persistent ID did not fall back; exact task-Team coordinator activation started once; invalid coordinator and invalid ordered chain started zero handles. Evidence: `/tmp/ir017-nested-routing-probe.mjs` (SHA-256 `c4df7fa757230b92f8bc1f86c9398925b5ad0c4b4643cb92896322c2f7792dfe`) and `/tmp/ir017-nested-routing-probe.log` (SHA-256 `613fc5a5b970982c468b0078e7527a87bb0a720f59b24df052fd0b381569eef3`).
- Maintained task-delegation service unit — passed 1/1 file and 17/17 tests, preserving the activation coordinator's canonical Team receiver construction and established task lifecycle. Evidence: `/tmp/ir017-task-delegation-unit.log` (SHA-256 `56dad6c2774d3c1e6fdb83912e33b2d99844adb30a80308bc2b3548a5101aafa`). The file is part of API/E2E's existing dirty durable delta and was executed without implementation edits.
- Focused source/diff/whitespace/size/no-fallback audit — passed for exactly eight production files; no receiver-as-Team, basename, retry/fallback, or Activity/tool-result presentation addition was found, and every changed file is below 500 effective non-empty lines. Evidence: `/tmp/ir017-routing-audit.log` (SHA-256 `b202c105067b46cb62df493a2e76c185a13c11766906ca37998c95ececd9fa92`). Source commit: `b877d343b30fe01bd2f39546c0e8279adbd00dff`. No API/E2E-owned durable file was edited.

### IR-016 Delta

- Production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed. Evidence: `/tmp/ir016-production-typecheck.log` (empty success log; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
- `pnpm run build:full` — passed, including clean production build and sanitized built-in Agent bootstrap smoke. Evidence: `/tmp/ir016-build-full.log` (SHA-256 `305aac208d8d3aa972d21d5efb0d313abe3caca3f157bdc921ded47ceeeeb316`).
- Production zero-reference audit — passed: `getHandoffRulesEnabled` has zero references under `autobyteus-server-ts/src`; the retained three `getHandoffRulesConfigured` references are the genuine shared exposure/MCP owners and no Claude turn-input call remains. Evidence: `/tmp/ir016-zero-reference-audit.log` (SHA-256 `9977fcef98e5607594a345697a058e9eb9f5f63c4b5ba450834fd3bfbae56670`).
- Focused diff/whitespace/size audit — passed: exactly two production lines were deleted, with no additions; `claude-turn-input-builder.ts` and `claude-session.ts` are 53 and 495 effective non-empty lines. Source commit: `110b9007615741fa0f5a96974b95ad7bc2be595c`. No API/E2E-owned durable file was edited.

### IR-015 Delta

- Production `pnpm exec tsc -p tsconfig.build.json --noEmit` — passed. Evidence: `/tmp/ir015-production-typecheck.log`.
- `pnpm run build:full` — passed, including clean production build and sanitized built-in Agent bootstrap smoke. Evidence: `/tmp/ir015-build-full.log` (SHA-256 `190e8793648de3348ab4a58c73db7c21f4eae10d071fbfc68aaafc0ae9780a32`).
- Built token owner/planner proof — passed: canonical registry ownership and cleanup order, exact nested task-Team/task-Agent reconstruction, exact-current no-batch retry, invalid-row no-mutation, duplicate/unreadable index failure before row scan, zero pre-commit migrated details, and TeamRun/task dependency failure before token invocation. Evidence: `/tmp/ir015-token-migrator-probe.mjs` and `/tmp/ir015-token-migrator-probe.log`.
- Real Prisma/SQLite proof on a newly migrated disposable database — passed: a missing later row rolled back the earlier update; a forced later read-back corruption rolled back both rows; repair committed exact values in stable row-ID order; empty batch succeeded without mutation. Evidence: `/tmp/ir015-atomic-probe.mjs`, `/tmp/ir015-token-atomic-batch.log` (SHA-256 `e9d90bb871e989feb60d11ee92bba5bf93686b302104a409de16d38ec43a3a45`), and `/tmp/ir015-prisma-migrate.log`.
- Terminal historical-record proof — passed for both old `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`: status/attempts/details remained unchanged while pending canonical executed token composition exactly once and succeeded. Evidence: `/tmp/ir015-terminal-historical-record.log`.
- Cleanup and startup checks — exact canonical success opens both cleanup definitions; canonical warning blocks them; the existing canonical startup-gate unit passes 1/1 file and 4/4 tests for failure/rejection blocking and exact-success/unrelated-warning startup. Evidence: `/tmp/ir015-cleanup-prerequisite.log` and `/tmp/ir015-startup-gate-unit.log`.
- Preserved two-ID TeamRun built proof — passed fresh flat, terminal-warning residual flat, terminal predecessor, unsafe/contradictory no-mutation, and current retry using an injected no-op token seam. Evidence: `/tmp/ir015-teamrun-two-id-probe.mjs` and `/tmp/ir015-teamrun-two-id-probe.log`.
- SR-014 provider-parity proof — exact artifact text matched the shared renderer byte-for-byte after only `/nested/worker` substitution; AutoByteus, Codex, and Claude each contained the block once in their required system/developer seam; standalone AutoByteus/Claude omitted it. Evidence: `/tmp/ir015-sr014-provider-parity.log` (SHA-256 `09b421b85a00463b9d7b011df0e677866cc7763a49ea55abfe9b1001a82e0d07`). Source audit confirms Team binding still intrinsically adds both named tools for native AutoByteus and MCP providers.
- The current pre-SR-015 combined TeamRun history integration was attempted without edits: its prerequisite unit passed 4/4, while its four integration cases remained non-passing because they construct the expanded canonical aggregate without injecting an isolated token store and assert pre-token aggregate counts. This is recorded as downstream durable-coverage maintenance, not as a Pass or source-failure adjudication. Evidence: `/tmp/ir015-teamrun-canonical-prerequisite.log`.
- Source/diff/legacy/size audits passed: no production historical definition ID/import/export, old migration class, or per-row update API remains; both cleanup definitions use the canonical owner; all provider seams share the exact renderer; superseded prose is absent; `git diff --cached --check` passed. Source commit: `24597cf194306848a06fdfe667ba932459c15c33`. No API/E2E-owned durable file was edited.

### IR-014 Delta

- Maintained token execution-address migration unit — passed 1/1 file and 4/4 tests. It proves direct/task-Agent conversion, task-Team root/chain/logical-prefix reconstruction, legacy segment conversion, exact-current second-run idempotence, unresolved-row no-mutation, physical-column preservation, and canonical JSON output. Evidence: `/tmp/ir014-token-migration-focused.log` (SHA-256 `bd9f8d438cd5c56ba031baba28a9a86b42c0267d743e7fccf1d04b33ae4ab63f`).
- Temporary built-JavaScript proof — passed nested ordered-chain plus task-Agent reconstruction and second-run idempotence; explicit missing mapping, duplicate mapping, conflicting mapping, and unreadable current task-record file each returned `FAILED` with actionable detail and zero database updates. Evidence: `/tmp/ir014-token-migration-probe.mjs` (SHA-256 `c40d7f6b2af7b412faf61a162d2d1cb54ba8a852867e53fc69518f4ca17419ca`) and `/tmp/ir014-token-migration-probe.log` (SHA-256 `6190ffb82ef6f1ccdc22e36fb1cdce90c9f6548697f07b86e2f492c45b4ee892`).
- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed. Evidence: `/tmp/ir014-production-typecheck.log`.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke. Evidence: `/tmp/ir014-build-full.log` (SHA-256 `b7e4b06ab57e135e6bcefa7899fd5f2c4189184f2cd7901c028d7e6674461563`).
- An adjacent legacy-column-drop selection was attempted and finished 8/9; its sole non-passing assertion still expects the removed `{segments:[...]}` payload instead of the current exact `TeamExecutionAddress`. That API/E2E-owned durable file was not edited and this result is not claimed as Pass or as failure-origin adjudication.
- Migration-boundary/no-fallback/diff/whitespace/size audit passed. The changed orchestrator/planner/index are 159/290/191 effective non-empty lines, all below 500; the split keeps filesystem indexing, row planning, and persistence orchestration separate. Source commit: `4dd8ff543d1c7ebbc8b1c6ffca6923487aa3eda5`. No API/E2E-owned fixture or durable test was edited.

### IR-013 Delta

- Maintained prerequisite plus generic migration-runner suites — passed 2/2 files and 10/10 tests. This preserves safe conversion/backup, valid predecessor skip, warning/failure aggregation, unsafe nested rejection, and the existing rule that terminal `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS` records do not rerun.
- Temporary built-JavaScript migration proof — passed six SR-013 outcomes: fresh safe flat reached display-preserving predecessor then v3; terminal-warning stable record was skipped while residual flat reached v3 directly; an already-produced display-divergent predecessor reached v3; unsafe residual flat and contradictory predecessor both failed byte-stably with no backup; current-v3 retry skipped without a new backup. Evidence: `/tmp/ir013-migration-probe.mjs` and `/tmp/ir013-migration-probe.log`.
- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed. Evidence: `/tmp/ir013-production-typecheck.log`.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke. Evidence: `/tmp/ir013-build-full.log`.
- Registry/ID/ownership/legacy/diff/cleanup/size audit — passed: stable then canonical registry order remains; each ID is defined once by its owner; exactly one flat decoder serves both definitions; no display-name structural comparison remains; current readers were not changed; no repository proof file remains; `git diff --check` passed. Evidence: `/tmp/ir013-source-audit.log`.
- Changed implementation files are 152/89/152 effective non-empty lines, all below 500. The decoder helper's gross 246-line diff is a deliberate responsibility contraction (142 deletions remove canonical validation/circular ownership; 104 additions implement strict flat semantics), not file growth; it shrank from 187 to 152 effective lines. No API/E2E-owned fixture or durable test was edited.

### IR-012 Delta

- Unchanged maintained prerequisite suite — passed 1/1 file and 4/4 tests: safe flat conversion creates one backup; valid memberTree skips idempotently; mixed safe/invalid files report `SUCCEEDED_WITH_WARNINGS`; nested flat topology reports `FAILED`.
- Built-JavaScript ordered migration/no-mutation proof — passed: safe flat metadata reached prerequisite `SUCCEEDED` then canonical `SUCCEEDED`/schema v3 with Agent platform/config/presentation facts preserved; the prerequisite created one backup. Unsafe nested topology returned `FAILED`, created no backup, and remained byte-for-byte unchanged.
- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke.
- Ordering/mutation-boundary/diff/whitespace/size audit — passed: the registry still places the stable prerequisite directly before canonical conversion; output is canonical-prevalidated before backup/write; replacement uses copy plus same-directory temp rename; the maintained test is untouched and no repository temp proof remains. The orchestrator/helper are 87/187 effective non-empty lines; each changed-file delta remains below 220 lines.
- No API/E2E-owned fixture or durable test was edited by implementation.

### IR-011 Delta

- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke.
- Temporary non-repository policy proof using the maintained startup harness plus existing runner/run-history units — passed 3/3 files and 13/13 tests: canonical `FAILED` blocks; runner rejection blocks; canonical `SUCCEEDED` plus unrelated `SUCCEEDED_WITH_WARNINGS` starts exactly once; all-success starts exactly once; existing warning persistence/manual retry behavior remains intact. The temporary proof file was deleted after execution.
- Sequencing/identity/no-fallback/diff/whitespace/size audit — passed: one `runPending` call; one owner-exported canonical migration ID; no unrelated-status filter; blocking branches remain before bootstrap/build/listen. `server-runtime.ts` is 264 effective non-empty lines with a 30-line rework delta.
- No API/E2E-owned fixture or durable test was edited by implementation.

### IR-010 Delta

- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke.
- Corrected startup-gate unit — passed 1/1 file and 3/3 tests: a returned required `FAILED` status and a runner exception both cause zero bootstrap/Fastify/listen/background work, while exact required success bootstraps/builds/listens exactly once.
- Startup gate plus existing runner selection — passed 2/2 files and 9/9 tests, preserving runner status/explicit-retry behavior while the startup boundary alone enforces exact required success.
- Sequencing/status/diff/whitespace/size audit — passed: one `runPending` call precedes bootstrap and `buildApp`; only exact required `SUCCEEDED` advances; explicit non-required status is excluded; every failure branch returns; no retry/lazy/compatibility branch was introduced. `server-runtime.ts` is 266 effective non-empty lines with a 31-line delta.
- No API/E2E-owned fixture or durable test was edited by implementation.

### IR-009 Delta

- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke.
- Triggering three-file local unit selection — passed 3/3 files and 32/32 tests. This includes active task-Agent child delegation through submit/review/settlement, settled task-Agent rejection, persistent direct/self eligibility, and native AutoByteus task-context projection. It is implementation-scoped evidence, not API/E2E sign-off.
- Built-JavaScript authorization proof — passed: one active directory-owned task caller was accepted; eight AgentRun/task-instance/task/owner/member/task-TeamRun/extra-field mismatches, a missing entry, unauthenticated mapper task use, and a settled entry were rejected with the stable task authorization/state codes.
- Ordering/diff/whitespace/size audit — passed: active-directory and mapper authorization remain before `reserveTaskId` and ledger mutation; no fallback/retry/alternate identity was added; changed source files are 447 and 70 effective non-empty lines with a 70-line total delta.
- No API/E2E-owned fixture or durable test was edited by implementation.

### IR-008 Delta

- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke.
- Built-JavaScript native-context proof (`/tmp/sr012-crf006-built-probe.mjs`) — passed: producer and consumer make distinct frozen exact two-field clones; task/execution identity is preserved; an added `memberPath` is rejected; missing `addressing` is rejected despite other top-level/execution fields. Probe SHA-256: `d0d596013ce2eab9002147f26e5b078234a0a2ce57751eaca76dc79104415264`.
- Focused diff/whitespace/fallback audit and file-size checks — passed; changed source files are 35 and 70 effective non-empty lines.
- No API/E2E-owned fixture or durable test was edited or executed by implementation.

### IR-007 Delta

- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke.
- Built-JavaScript resolver proof (`/tmp/sr012-crf005-built-probe.mjs`) — passed: `/product_manager/child` returned `COLLABORATION_TRAVERSAL_INVALID`; `/missing/child` and `/missing` returned `COLLABORATION_TARGET_NOT_FOUND`; a valid nested Agent still resolved. Probe SHA-256: `326dceadffef9f8722c82a071875b86b700decc8d00506758b0e40818c8740f4`.
- Focused diff/whitespace/alternate-identity and file-size checks — passed; `team-recipient-resolver.ts` is 73 effective non-empty lines.
- No API/E2E-owned fixture or durable test was edited or executed by implementation.

### IR-006 Delta

- `autobyteus-server-ts`: production `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build and built-in Agent bootstrap smoke.
- Built-JavaScript normal-path proof (`/tmp/sr012-crf003-built-probe.mjs`) — passed for persistent-child root-bound delivery, task-child root-bound delivery, and foreign-root rejection at the root manager. Three parent-boundary calls were observed across the three cases; no local/root retry was used.
- Expanded `member_run_id` audit across current runtime source and built output — zero occurrences; no normal-runtime allowlist is needed.
- Focused diff, whitespace, staged-path, and file-size checks — passed; the two changed source files are 203 and 179 effective non-empty lines.

### IR-005 Baseline

- `autobyteus-server-ts`: `pnpm exec tsc -p tsconfig.build.json --noEmit` — passed.
- `autobyteus-server-ts`: `pnpm run build:full` — passed, including clean build, assets, and built-in Agent bootstrap smoke.
- Application SDK contracts, backend SDK, frontend SDK, and application devkit builds — passed.
- Brief Studio and Socratic Math Teacher: backend typecheck plus full application build — passed for both; source, backend, UI vendor, dist, and importable outputs regenerated.
- Web GraphQL generation from the built server schema — passed.
- Web `guard:web-boundary`, `guard:localization-boundary`, and `audit:localization-literals` — passed.
- Web production Nuxt build — passed.
- Strict built-JavaScript probe — passed for schema-v3 exact root/nested shapes and immutability; stale metadata rejection; relative recipient resolution; exact `TeamExecutionAddress` round trip/extra-key rejection; V5 manifest acceptance; and actionable V4 manifest/backend/definition rejection.
- Synthetic temporary SQLite migration probe — passed: backup created, run identity split, binding/producer identity converted, Brief columns renamed, legacy JSON/columns absent.
- Production forbidden-identity audits — passed for server current runtime (migration excluded), web, and application source/built/importable artifacts.
- V5 artifact parity — exact SDK-to-application vendor comparisons passed; unchanged envelope versions were confirmed.
- `git diff --cached --check` before source commit — passed.

## Frontend Rendered Result

IR-006 through IR-018 do not change a rendered frontend surface. IR-015 changes model-facing system/developer instruction text only, verified at provider composition seams; IR-016 removes a dead internal Claude input; IR-017 and IR-018 correct backend routing only. The live Activity label noted in CRR-028 and preserved by CRR-030 was not changed because it truthfully describes completion of the tool invocation rather than acceptance of the returned collaboration operation. The cumulative IR-005 frontend result remains:

- Nuxt production output was served and `/agent-teams` was inspected at 1440x1000 and 390x844.
- Search input, Reload action, Create affordance, responsive layout, and absence of horizontal overflow were verified. Evidence: `/tmp/sr012-agent-teams.png` and `/tmp/sr012-agent-teams-mobile.png`.
- The local backend was unavailable, so only the truthful error/empty state was exercisable; no live Team hierarchy/task/history workflow is claimed.
- Full Nuxt typecheck remains non-clean on existing dependency/generated-import errors (`@vue/apollo-composable`, `@vue/composition-api`). The changed-production intersection is limited to unchanged generated import sites; production build and boundary guards pass. This limitation must not be reported as a full typecheck pass.

## Known Risks And Downstream Work

- No durable API/E2E coverage was added, changed, or removed by implementation. The cumulative API/E2E-owned durable delta and live failure evidence already present in the worktree were preserved without staging or rewriting.
- API/E2E must resume `API-REV-013` from its paused 90% checkpoint only after code review Pass. It must rerun the AutoByteus active task-Team peer scenario and complete the required Codex and Claude nested-Team rows while preserving both durable fixture corrections. Any repository-resident durable coverage delta must return for proportional review.
- Existing DS-013 token migration/cleanup/aggregate and combined TeamRun history coverage remains part of the cumulative downstream package; IR-018 does not alter those source boundaries or supersede the earlier evidence.
- The 30-minute interactive transaction timeout is intentionally bounded for the observed material row volume; real upgrade duration and operational progress remain downstream realistic-environment evidence. Atomicity cannot be traded for chunk commits.
- The required imported nested-classroom live matrix—AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` with medium reasoning, and authenticated Claude Agent SDK—is incomplete. The API-REV-013 pre-fix AutoByteus accepted-but-persistent-peer misrouting is retained for diagnosis but is not post-fix proof; all three post-fix provider outcomes remain mandatory downstream evidence.
- Real provider execution, fresh TeamRun/task-TeamRun identity, terminate/restore, application admission plus physical-DB discovery, frontend full workflows, and the remaining migration/API/frontend matrix remain incomplete.
- Delivery-owned documentation and the protected stash were not touched. Prior SR-006 CRR/API/delivery evidence is not SR-015 verification.

## Task Design Health Check

- Reviewed change posture: one bounded active task-Team peer routing fix after IR-017 source Pass.
- Root cause: root logical resolution retained the sender's exact task execution address, but recipient materialization unconditionally used the root manager's empty task chain and persistent rooted AgentRun, causing an accepted message to start the persistent peer.
- Refactor decision: `No Broader Refactor Needed`; established canonical address, root resolver, active task-Team directory, resolved-delivery boundary, and task lifecycle owners remain correct. One focused resolver proves active sender scope, while the coordinator accepts an explicit already-resolved route for the exact task TeamRun.
- Implementation matched the reviewed assessment: `Yes`.
- New Design Impact or Requirement Gap found during implementation: `No`.

## Routing

Route this cumulative SR-015 / IR-018 package to `code_reviewer` for focused `CR-F-018` source re-review while preserving resolved `CR-F-012` through `CR-F-017`. On Pass, route to `api_e2e_engineer` to resume `API-REV-013` at 90%, preserve its cumulative durable delta and fixture corrections, rerun AutoByteus, and complete Codex/Claude nested-Team validation. Any repository-resident durable coverage additions, edits, or removals must return through proportional code review before delivery.
