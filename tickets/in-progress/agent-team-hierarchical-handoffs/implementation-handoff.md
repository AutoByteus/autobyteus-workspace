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
- Downstream lineage: `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-review-report.md`, `delivery-revision-record.md`, and `delivery-integration-blocker.md` in the same ticket directory. `CRR-023` passed IR-013; `CRR-024` classified `CR-F-012` / `API-F-007` as an implementation-owned token-attribution migration defect. SR-013 and `ARCH-REV-008` remain authoritative. `API-REV-011` is paused at 61%; earlier completed delivery results cover SR-006 only.

## Current Implementation State

- Implementation revision: `IR-014`
- Implementation cycle: `Local Fix`
- Current solution: `SR-013` (`SR-001` through `SR-013` cumulative)
- Queued follow-up: user-approved `SR-014` supplies an exact-copy AgentTeam collaboration system instruction. `CRR-024` explicitly keeps it outside this bounded migration finding, so it is not implemented or claimed in IR-014.
- Architecture approval: `ARCH-REV-008` Pass (`ARCH-REV-001` through `ARCH-REV-008` cumulative complete review)
- Triggering finding: `CR-F-012` / `API-F-007` / `SR013-MIG-TOKEN-001`; `CR-PREM-008` is Reachable. `CR-F-010` / `CR-F-011` are resolved downstream, `DR-001` through `DR-004` remain resolved, and no requirement gap, design impact, or unclear finding is open.
- Current code review: `CRR-024` Fail — Local Fix is the triggering result after `CRR-023` passed IR-013 at 9.5/10 (95.1/100). IR-014 restores strict historical task-Team token attribution and awaits source re-review of `CR-F-012`. `CR-F-003` through `CR-F-011` remain resolved.
- Current API/E2E: `API-REV-011` remains halted at 61% confidence after the maintained token-attribution case reproduced 3/4. API/E2E must resume only after source Pass, retain/reinvestigate durable nested-chain/conflict/current-address coverage, and continue the remaining migration/frontend/API/provider/live matrix. Implementation edited no durable coverage.
- Delivery lineage: completed delivery results through `DR-003` prove SR-006 only; `DR-004` is cumulative SR-012 lineage context, not completed SR-012 delivery proof.
- SR-012 baseline source commit: `3927e878db0318138b6e39ad7cea1b032584e08f` (`refactor: adopt canonical rooted AgentTeam identity`).
- IR-006 local-fix source commit: `5430ee064193471694a0bdd056b36ce57ee97d8b` (`fix: route nested collaboration through root manager`).
- IR-007 local-fix source commit: `9a5bf14f66064fbeefd6ae8d63ed9f3221170d47` (`fix: classify invalid recipient traversal`).
- IR-008 local-fix source commit: `8a56cddb637de7e2855d83244506047c5e0c1f42` (`fix: bind native task collaboration context`).
- IR-009 local-fix source commit: `2cbfba33155e41106bc9872f51c11782d5724223` (`fix: authorize active task delegators`).
- IR-010 local-fix source commit: `55d17af1937ac9e8c02acf98409724ba047421b5` (`fix: block startup on required migration failures`).
- IR-011 local-fix source commit: `d3796bd1fbabbd1a27fd83eb0cbb7857ec08249a` (`fix: scope blocking migration startup gate`).
- IR-012 local-fix source commit: `fc709d127801c103889b85fda27fd13974be97c7` (`fix: restore legacy TeamRun migration prerequisite`).
- IR-013 source commit: `6a920d45e54981735c25146e0ab76ab7e0917c4c` (`fix: complete TeamRun canonical migration transition`).
- IR-014 source commit: `4dd8ff543d1c7ebbc8b1c6ffca6923487aa3eda5` (`fix: restore task Team token attribution migration`).
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

## Reviewed Behavior Trace

| Behavior | Implementation result |
| --- | --- |
| BEH-001 | Definition handoffs remain validated and compile into immutable rooted snapshots; rejected updates still validate detached candidates before persistence. |
| BEH-002–BEH-003 | `send_message_to.recipient_address` uses the strict expression parser and one rooted resolver; non-root managers forward through their placement boundary before the root manager alone resolves/materializes root, upward, cross-branch, and Team-coordinator delivery. |
| BEH-004 | Schema-v3 `rootTeam` replaces localized route-bearing trees; persistent children select absolute nodes and task TeamRuns allocate fresh typed run IDs. |
| BEH-005–BEH-006 | Intrinsic handoff lookup returns only `{handoffs:[{when,recipient_address}]}` and the shared instruction carries the mandatory filesystem-like completion protocol. |
| BEH-007 | Exact `target_agent_run_id` routing, codes, and send result envelope remain separate and unchanged. |
| BEH-008 | Strict restore consumes the self-contained schema-v3 snapshot and its compiled handoffs after blocking conversion. |
| BEH-009 | AutoByteus, Codex, and Claude provider adapters share intrinsic handoff semantics while retaining operation-specific transport/result mapping. |
| BEH-010 | Default Team entry still targets the root Team coordinator. |
| BEH-011–BEH-012 | `delegate_task.recipient_address` shares recipient resolution and its exact topology error codes with messaging, then applies the direct-current-Team policy and existing task lifecycle. Persistent callers match the rooted node AgentRun; active task callers match the exact root-directory task identity and local ownership before mapping/reservation. AutoByteus native task tools receive an exact cloned collaboration caller binding, and canonical address remains the only shared logical placement authority. |
| BEH-013 | TeamRun is one immutable rooted Agent/AgentTeam union with kind-local facts and derived indexes, not parallel topology/profile/binding projections. |
| BEH-014 | Conversation, task, event, WebSocket, token, and frontend concrete identity use strict `TeamExecutionAddress` values. Token backfill now reconstructs historical task-Team roots, ordered task-Team chains, logical Team prefixes, final member suffixes, and task-Agent suffixes from strict current task records before persistence. |
| BEH-015 | Store-owned backup/transaction conversion runs before strict current-schema readers. One pure migration-only decoder preserves display name while requiring direct structural flat placement. Pending `20260517...` owns only predecessor writes; pending `20260801...` owns final v3 from predecessor or in-memory-decoded residual flat input after a terminal stable record. Final addresses come only from agreeing route/path; unsafe input remains byte-stable. The server advances only when canonical identity is exactly `SUCCEEDED`, while unrelated best-effort warning/retry policy remains unchanged. |
| BEH-016 | GraphQL/REST/WebSocket/SDK/application/frontend boundaries use canonical address/execution shapes; exact application SDK V5 is built and V4 is rejected. |
| BEH-017 | Storage-private lineage is `ancestorTeamRunIds`; existing memory/context physical locations are derived without moving files. |
| BEH-018 | Production seams required by the imported nested-classroom scenario are implemented, including nested persistent/task-child root-bound forwarding. The three live runtime/model rows were not run and remain mandatory API/E2E work; no prior evidence is reused. |

## Key Areas

- Canonical logical identity: `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-address.ts`, `recipient-address-expression.ts`.
- Root snapshot/index/recipient resolution: `src/agent-team-execution/domain/team-run-config.ts`, `services/team-run-tree-index.ts`, `services/team-recipient-resolver.ts`, `services/resolved-team-recipient.ts`.
- Concrete execution identity: `src/agent-team-execution/domain/team-execution-address.ts` and task/message/event/token consumers.
- Strict persistence and startup migration: `src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.ts`, `team-run-member-tree-prerequisite-converter.ts`, `team-canonical-*.ts`, `token-usage-execution-address-backfill-migration.ts`, its planner/task-Team index, `token-usage-legacy-route-column-drop-migration.ts`, Prisma migration, and store normalizers.
- API/streaming: AgentTeam GraphQL schema/resolvers, REST/context boundaries, and `src/services/agent-streaming/team-execution-address-command-parser.ts`.
- Intrinsic collaboration protocol: member context/instruction composition and AutoByteus/Codex/Claude tool/provider adapters.
- Application contract: `autobyteus-application-sdk-contracts`, backend/frontend SDK packages, devkit, project applications, generated/vendor/importable artifacts, application admission/loader/migration paths.
- Frontend: generated GraphQL types, AgentTeam run store/tree/index utilities, execution selectors, communication/task/history/token/memory/application projections, desktop/mobile views.

## Persisted Data Transition

- Team definitions: `Directly Usable — No Migration`; authored definition handoffs remain the source contract.
- TeamRun metadata, Team communication, task delegation records, token usage, external bindings, and application platform databases: `Migration Required`; conversion is ordered, blocking, validates each output, and uses backups/atomic file replacement or database transactions as appropriate. TeamRun specifically uses one shared flat decoder, the stable predecessor-write ID, and the separately pending sole final-v3 ID so terminal stable records never need resetting.
- Application bundles: exact backend-definition/frontend-SDK V5 is required. V4 is rejected/quarantined; there is no V4 adapter or mixed-version runtime.
- Physical Agent memory and final context files: locations remain unchanged. The storage layer derives the same concrete run-ID path segments through `ancestorTeamRunIds`.
- Deviation from reviewed transition decision: `None`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Current runtime dual-read/write or fallback: `None`; legacy handling is isolated to migration/incompatibility input boundaries.
- Removed current authorities include route/path/name recipient aliases, conversation target/scoped-route types, persistent-child topology localization, generic member-run identity, duplicate token/task execution scopes, and V4 application SDK exports/artifacts.
- The current publish-artifacts runtime contains no `member_run_id` read or writer and does not accept that retired generic identity as a fallback.
- Production identity audits found no stale current route/name/path identity in the server runtime, web production code, or project application source/built/vendor/importable artifacts outside explicit migration/incompatibility boundaries.
- Current SDK `dist`, application vendor copies, application build products, and importable packages were regenerated rather than selectively patched.
- Changed production files satisfy the implementation size guard: all are at or below 500 effective non-empty lines. IR-014 split orchestration, historical row planning, and strict task-record indexing into 159/290/191 effective-line owners rather than expanding one mixed migration file.

## Implementation-Scoped Checks

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

IR-006 through IR-014 are backend-only and do not change a rendered surface. The cumulative IR-005 frontend result remains:

- Nuxt production output was served and `/agent-teams` was inspected at 1440x1000 and 390x844.
- Search input, Reload action, Create affordance, responsive layout, and absence of horizontal overflow were verified. Evidence: `/tmp/sr012-agent-teams.png` and `/tmp/sr012-agent-teams-mobile.png`.
- The local backend was unavailable, so only the truthful error/empty state was exercisable; no live Team hierarchy/task/history workflow is claimed.
- Full Nuxt typecheck remains non-clean on existing dependency/generated-import errors (`@vue/apollo-composable`, `@vue/composition-api`). The changed-production intersection is limited to unchanged generated import sites; production build and boundary guards pass. This limitation must not be reported as a full typecheck pass.

## Known Risks And Downstream Work

- No durable API/E2E coverage was added, changed, or removed by implementation. The maintained token unit and temporary built migration proof were run only as implementation-scoped local checks; no repository-resident proof file remains and existing dirty tests remain unstaged/downstream-owned.
- API/E2E must resume `API-REV-011` after IR-014 source Pass, retain the requirement-aligned task-Team token reconstruction case, investigate nested-chain/duplicate/conflict/current-address durable coverage, and continue its remaining migration matrix. Implementation did not weaken or rewrite the triggering test.
- The remaining migration failures and all later frontend/API/provider/live rows retain downstream ownership and are not reclassified by this fix.
- SR-014's exact shared collaboration instruction/provider parity work remains a separate future implementation round outside `CRR-024`; code review must not treat it as part of IR-014 or infer provider verification from this migration-only delta.
- The required imported nested-classroom live matrix—AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` with medium reasoning, and authenticated Claude Agent SDK—has not run. Missing credentials/runtime availability must be classified truthfully, not skipped as Pass.
- Real provider parity, fresh TeamRun/task-TeamRun identity, terminate/restore, application admission plus physical-DB discovery, frontend full workflows, and broad migration fixture/idempotence/failure-gate behavior require downstream evidence.
- The temporary SQLite migration proof is deliberately narrow synthetic implementation evidence, not a durable migration test suite.
- Stale V4 wording remains in SDK README files; those are durable delivery documentation and were intentionally not edited during implementation. Delivery documentation sync remains required after code/API gates pass.
- Prior SR-006 CRR/API/delivery evidence is not SR-013 verification.
- `CRR-024` keeps API/E2E blocked until IR-014 passes source re-review. `API-REV-011` remains incomplete at 61% confidence.

## Task Design Health Check

- Reviewed change posture: comprehensive approved refactor plus a bounded historical token-attribution migration fix.
- Root cause: IR-005 removed the migration-owned task TeamRun index and treated the row-local immediate task TeamRun ID as the canonical root, silently dropping the true root, ordered task-Team chain, and logical Team prefix.
- Refactor decision: `No Refactor Needed`; the existing migration boundary and strict current task-record authority are correct. IR-014 restores the removed off-spine index and separates index/planner/orchestrator responsibilities without changing current runtime contracts.
- Implementation matched the reviewed assessment: `Yes`.
- New Design Impact or Requirement Gap found during implementation: `No`.

## Routing

Route this cumulative SR-013 / IR-014 package to `code_reviewer` for `CR-F-012` source re-review. On Pass, route it to `api_e2e_engineer` to resume `API-REV-011` at 61% and continue durable token/migration coverage. Any repository-resident durable coverage additions, edits, or removals must return through proportional code review before delivery.
