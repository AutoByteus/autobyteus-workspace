# AgentTeam Hierarchical Communication And Handoffs — Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `SR-006 refactor investigation complete and user-approved; ready for architecture re-review`
- Investigation Goal: Preserve the implemented hierarchical addressing/handoff behavior while tightening the new shared caller and placement structures so the mounted topology and its one canonical address remain the only logical-address authority.
- Scope Classification: `Large`
- Scope Classification Rationale: The clean-cut behavior crosses Team definition domain/persistence/API surfaces, recursive topology/run snapshots, Agent-facing context and instructions, shared server-owned tools, mixed Team delivery/event behavior, task target resolution/activation routing, restoration, provider adapters, and broad tests. AgentOrg, live Team reconciliation, external packages, and frontend are excluded.
- Scope Summary: AutoByteus project code only. SR-005 is implemented and downstream-validated; SR-006 is a targeted design rework of the ephemeral collaboration caller/placement boundary. It does not reopen handoff semantics, provider results, execution/history schemas, or dynamic AgentOrg scope.
- Primary Questions Resolved: Which implemented logical-address fields are redundant; which consumers can derive parent/path/selector/local-name facts from one canonical address; whether task direct-owner mapping still remains exact; whether persisted data changes; and whether broader TeamRun execution identity normalization belongs in this round.

## Request Context

The user split the earlier native AgentOrg effort into two independent tickets:

1. **Ticket 1 (this package):** make AgentTeam addressing and handoffs truthful, consistent, and reusable.
2. **Ticket 2 (later):** add native AgentOrg definition/run ownership and explicit-refresh dynamic behavior on top of Ticket 1.

The user explicitly decided:

- use filesystem-like `/` and `./` paths consistently for standalone and nested AgentTeams;
- stop faking a child Team coordinator as a parent Team member;
- retain handoff JSON endpoints named `from` and `to` and allow natural-language `rules[]`;
- make handoff retrieval outgoing/sender-centric only;
- provide `get_handoff_rules` rather than repeatedly injecting the whole rule set;
- target an Agent directly or target a Team through its coordinator ingress;
- keep handoffs as Agent/LLM guidance rather than hard-coded predicates;
- keep AgentTeam static per run; dynamic updates belong to AgentOrg;
- use no automatic file-system watching; and
- exclude repository-owned external/pure-text Agent package edits from Ticket 1.

During SR-004 clarification, the user explicitly rejected a separate task target naming system: task delegation selects a recipient just as message delivery does, so `delegate_task` must use the same canonical `/...` and `./...` logical addressing model as `send_message_to`. Different execution semantics may follow resolution, but there must not be a second flat task address authority.

During final user verification after SR-005 implementation and downstream delivery preparation, the user further clarified that mounting the Team definition graph deterministically decides each placement's one canonical address. `memberPath`, immediate-Team path/address, route key, owner Team, and local name are derived views and must not be duplicated as independent shared identity. The user requested another design-principles-led simplification round and initially instructed the solution designer to stop for user review. The user subsequently approved SR-006 and authorized architecture re-review, while deferring broader whole-TeamRun execution-identity normalization to a separate future phase.

The bootstrap package was received by the current software-engineering team as the approved Ticket 1 requirements basis. The solution designer independently re-read the current definition, topology, runtime, tool, metadata, and documentation paths and produced the initial design. No implementation handoff is produced by this role.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs`
- Current Branch: `codex/agent-team-hierarchical-handoffs`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Initial `git fetch origin personal` and remote verification resolved `2a7271c9d78b71b919f7dbfa3b8f97f61c3a2e2b`. The receiving solution-design pass ran `git fetch origin --prune`; `HEAD...origin/personal` remained `0 0` at the same commit on 2026-08-03.
- Task Branch: `codex/agent-team-hierarchical-handoffs`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: The shared base checkout was nine commits behind before refresh. This dedicated worktree was created directly from the refreshed remote-tracking base, not from the stale local `personal` checkout. Only ticket artifacts are untracked at bootstrap handoff.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md` | Normative Ticket 1 protocol supplement | Shared message/task address grammar, canonical-address derivation, Team ingress, schema, mount/rebase composition, tool result, persistence behavior, errors, and use-case spans | Requirements; design spec | R-001–R-031 / AC-001–AC-025 | `Refined — SR-006 user-approved; ready for architecture re-review` | Intended-behavior authority updated for the user's one-canonical-address clarification | User-approved; architecture re-review authorized |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-03 | Command | `git fetch origin personal`; `git rev-parse origin/personal`; `git ls-remote --heads origin personal`; `git worktree add -b codex/agent-team-hierarchical-handoffs ... origin/personal` | Establish isolated current ticket base | Both remote checks resolved to `2a7271c...`; dedicated branch/worktree created successfully | No |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Inspect Team definition domain | Definition/update contain members/coordinator but no handoffs | Extend in later design/implementation |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts` | Inspect shared/team-local config schema and normalization | `TeamConfigRecord` owns members/coordinator/avatar/launch config; missing fields normalize; writer reconstructs known fields | Add optional handoffs and canonical validation |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Trace shared/team-local/application-owned file paths | Shared/team-local reads use `normalizeTeamConfigRecord`; application-owned has a separate path; update rewrites config | All paths must round-trip handoffs |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | Inspect application-owned schema | Separate config type, parser, definition builder, and writer omit handoffs | Must extend, not assume shared normalizer covers it |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts`; `services/team-definition-graph-validator.ts` | Inspect create/update and recursive graph validation | Service validates members/coordinator and recursive refs; graph validator can be extended for endpoint/topology rules | Use as definition boundary; also validate composed graph at launch |
| 2026-08-03 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts`; `api/graphql/converters/agent-team-definition-converter.ts` | Trace API round trip | Output/create/update/converter independently map current fields; no handoffs | GraphQL additions required even though frontend is out of scope |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Find canonical recursive topology | Planner recursively expands definitions, validates sibling names case-sensitively, and assigns path/route keys | Strong foundation; tighten path segments and compose handoffs here or an owned collaborator |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-member-identity.ts`; `domain/team-run-config.ts` | Inspect identity/parser and run config | Paths/route keys exist; route-key normalizer collapses separators and strips leading/trailing `/`; run config persists recursive member tree | Public logical-address parser must reject malformed input rather than reuse lossy normalization directly |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-communication-roster-builder.ts`; `domain/member-team-context.ts`; `services/member-team-context-builder.ts` | Trace Agent-facing logical recipients | Flat roster exposes `local_agent`, `subteam_representative`, `parent_boundary_agent`; context stores recipients and `allowedRecipientNames` | Clean-cut target for replacement; do not keep as parallel authority |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-team-roster-manifest.ts`; `services/member-run-instruction-composer.ts` | Trace LLM-visible communication protocol | Prompt renders allowed short names, representative badges, and restricted parent recipients | Replace with truthful identity/path protocol, not inline handoff rules |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-recipient-resolver.ts` | Trace actual `recipient_name` resolution | Rebuilds a sender roster independently and exact-matches short name; only child coordinator can reach parent boundary | Second flat policy owner; rooted resolution must become singular |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts`; `mixed-team-manager.ts`; `mixed-parent-boundary-delivery-intent.ts` | Trace delivery/event spine | Resolver result flows through recursive member handles; accepted input publishes communication with address-first participants; parent bridge prefixes child sender | Delivery/event infrastructure is reusable if resolver/binding is made root-aware |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`; `mixed-sub-team-member-handle.ts`; `mixed-sub-team-run-factory.ts` | Trace member construction and nested execution | Each child TeamRun strips parent path, gets a parent boundary, and lazy-starts; parent builds coordinator representative data | Design must preserve lazy lifecycle while removing synthetic Agent-facing projection |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-communication/services/send-message-to-dispatcher.ts`; `domain/send-message-target-selector.ts`; `agent-team-execution/services/inter-agent-message-delivery-intent-builder.ts` | Inspect shared tool boundary | Shared dispatcher separates `recipient_name` Team context from exact global run ID; intent binds sender identity | Keep selector separation; change Team logical-address contract only |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-tools/agent-communication/*`; `agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.ts`; provider tool exposure files | Inspect reusable server-owned tool infrastructure | AutoByteus local tool and Codex/Claude Agent Tools MCP adapters share dispatcher; exposure is selected by Agent `toolNames` | Add `get_handoff_rules` through the same capability area and gating policy |
| 2026-08-03 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts`; `run-history/store/team-run-metadata-{types,schema,store}.ts` | Trace run snapshot persistence/restoration | Recursive topology is strictly parsed, normalized, written on create/restore/refresh; no handoffs are persisted | Add optional canonical handoff snapshot; restore must not re-read changed definitions |
| 2026-08-03 | Data | `applications/*/agent-teams/*/team-config.json` and repository-wide Python scan | Inspect representative Team config data and unsafe member names | Two current application configs plus test artifacts; 10 observed member names, zero unsafe path segments/collisions | No bulk rewrite signal; missing handoffs can normalize empty |
| 2026-08-03 | Doc | `autobyteus-server-ts/docs/modules/agent_communication.md`; `docs/modules/agent_team_execution.md` | Verify documented current contract | Docs explicitly define flat roster, representatives, coordinator-only parent exposure, configured tool gating, and exact-run separation | Durable docs will require update |
| 2026-08-03 | Tests | Relevant `tests/unit`, `tests/e2e/runtime`, and GraphQL test inventory via `rg` | Identify coverage impact | Unit tests assert flat recipients; nested/live runtime and definition roundtrip coverage already exist | Receiving API/E2E engineer must classify and update/replace stale cases |
| 2026-08-03 | Command | `pnpm -C autobyteus-server-ts exec vitest run ... --no-file-parallelism` | Attempt focused current-behavior test run without modifying repo setup | Failed before test collection: `vitest` not found because this fresh worktree has no installed dependencies | Run after receiving team performs normal dependency setup |
| 2026-08-03 | Command | `git fetch origin --prune`; `git status --short --branch`; `git rev-list --left-right --count HEAD...origin/personal` | Re-verify isolated ticket bootstrap before solution design | Dedicated branch still tracked fresh `origin/personal` with divergence `0 0`; only the ticket artifact folder was untracked | No |
| 2026-08-03 | Doc | `solution-designer/design-principles.md`; `references/design-examples.md` Team Run Orchestration example | Apply the shared design authority to the target structure | Design must remain spine-led, keep TeamRun vs AgentRun subjects explicit, and avoid turning a thin dispatcher into the delivery owner | No |
| 2026-08-03 | Code | `agent-team-execution/backends/mixed/members/mixed-persistent-member-registry.ts`; `mixed-sub-team-member-handle.ts`; `mixed-team-manager.ts`; `mixed-parent-boundary-delivery-intent.ts` | Validate a root-aware delivery design against real nested mechanics | Root selectors can already enter a top-level subteam and be stripped one segment at a time; child managers have a parent callback. The clean target can canonicalize once, forward unchanged to root, then reuse downward handles | No |
| 2026-08-03 | Code | `agent-communication/services/send-message-to-dispatcher.ts`; `agent-team-execution/services/inter-agent-message-delivery-intent-builder.ts`; `backends/mixed/delivery/team-message-recipient-resolver.ts` | Verify selector ownership and dead overlap | Public exact-run dispatch already bypasses Team delivery, so Team resolver exact/task-run branches are not the public exact route and can be removed while preserving `GlobalAgentRunMessageRouter` | No |
| 2026-08-03 | Code | `agent-execution/shared/configured-agent-tool-exposure.ts`; AutoByteus tool resolver/factory; `agent-tools/mcp/agent-tool-mcp-catalog.ts`; Codex/Claude tool bootstrap files | Pin down `get_handoff_rules` exposure | AutoByteus requires a bound local wrapper; Codex/Claude use the server Agent Tools MCP catalog. One shared read service plus two thin adapter forms preserves configuration gating | No |
| 2026-08-03 | Code | Every production `new TeamRunConfig(...)` call plus `team-run-launch-identity-assignment.ts`, `mixed-team-run-backend-factory.ts`, and `mixed-sub-team-run-factory.ts` | Trace snapshot propagation and child mount context | Effective handoffs must be copied through every root config reconstruction. Child contexts should inherit a root collaboration binding rather than reread definitions or persist duplicate topology | Implementation audit required |
| 2026-08-03 | Code | `task-team-run-identity-factory.ts`; `mixed-task-team-member-handle.ts`; task delegation context uses | Verify task separation constraints | Task executions already retain logical template identities plus exact task run IDs. Collaboration may project the logical placement but must add no task address aliases or handoff ACL semantics | No |
| 2026-08-03 | Doc | `docs/modules/agent_communication.md`; `docs/modules/agent_team_execution.md` focused roster/representative/metadata sections | Identify durable documentation impact | Docs explicitly describe the flat roster, representatives, coordinator-only parent reachability, provider tool materialization, and current metadata; delivery must update these statements | Delivery follow-up |
| 2026-08-03 | Review | `tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`; `architecture-review-revision-record.md` (`ARCH-REV-001`) | Investigate architecture findings `DR-001` and `DR-002` | Round 1 failed for two design omissions: task-Team ingress ownership after representative removal and provider-visible collaboration code preservation | Resolved in SR-002 design; architecture re-review required |
| 2026-08-03 | Code | `agent-team-execution/domain/member-team-context.ts`; `services/delegation-target-roster-builder.ts`; `agent-tools/task-delegation/task-delegation-context-member-mapper.ts`; `task-delegation/task-delegation-{target,input-resolver}.ts` | Trace the supported Team-target `delegate_task` path before removing representatives | `SubTeamMemberTeamDescriptor.representative` is mapped to `TaskDelegationTeamIdentity.ingress`; the resolver throws `TASK_TEAM_TARGET_INGRESS_NOT_FOUND` when ingress is null | SR-002 proposed a task projection; SR-004 supersedes its address authority with shared placement plus exact current-local mapping |
| 2026-08-03 | Code | `backends/mixed/members/mixed-agent-member-handle.ts`; `domain/team-run-config.ts`; `backends/mixed/mixed-sub-team-run-factory.ts`; `agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts` | Identify a truthful construction source and all task context adapters | Each active Team context has a runtime-identity-attached direct `memberTree`; child factories localize it for the child's task lifecycle; AutoByteus managed context currently remaps generic member descriptors | Share root caller addressing, then map an eligible resolved placement to the exact current-local config/ingress |
| 2026-08-03 | Code | `agent-communication/services/send-message-to-dispatcher.ts`; `global-agent-run-message-router.ts`; `agent-tools/agent-communication/send-message-to.ts`; `agent-tools/mcp/agent-tools-mcp-result-mapper.ts`; `mcp/providers/send-message-to-mcp-adapter-provider.ts` | Trace operation codes through public tool providers | Dispatcher/global router return stable codes, including exact-run codes; AutoByteus returns message-only text and the generic MCP mapper returns message-only content, dropping `code` | Add a collaboration-specific canonical envelope/serializer and switch both collaboration adapters to it |
| 2026-08-03 | Review | `tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`; `architecture-review-revision-record.md` (`ARCH-REV-002`) | Investigate narrowed round-2 `DR-001` | `DR-002` resolved. `DR-001` remains because DS-010 assumed nested coordinator routes were already child-local | Correct the TeamRun topology localization boundary in SR-003 |
| 2026-08-03 | Review | `tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`; `architecture-review-revision-record.md` (`ARCH-REV-003`) | Investigate new `DR-003` after shared task/message placement approval | `DR-001` and `DR-002` are resolved. The proposed common placement leaks full member/Team configs and ambiguously labels a static snapshot run ID as the active owner on task-scoped instances | Narrow the common value to immutable logical coordinates, owner-local pairing, and exact Team ingress only in SR-005 |
| 2026-08-03 | Code | `agent-team-execution/domain/team-run-config.ts` (`stripMemberPathPrefix`); `backends/mixed/mixed-sub-team-run-factory.ts` | Verify nested member/coordinator localization mechanics | Recursive member paths/routes are stripped, nested `coordinatorMemberRouteKey` values are not; factory separately strips only the created child's top-level coordinator key | Replace both partial mechanisms with one recursive subteam-topology localizer |
| 2026-08-03 | Code | `backends/mixed/members/mixed-{sub-team,task-team}-member-handle.ts`; unit/integration uses of `MixedSubTeamRunFactory` | Verify persistent, restore, and task-child entrypoints | Both persistent and task Team handles call the same `MixedSubTeamRunFactory.createOrRestore`; restore supplies runtime context but the factory still constructs config from `subTeamConfig` | One factory-localization owner covers all three lifecycle forms; add three-level tests |
| 2026-08-03 | User clarification | Conversation following SR-003 handoff | Confirm whether task delegation should retain its separate target-name model | User stated that delegating a task and sending a message both select a recipient and therefore must use the same addressing model | Supersede SR-003 task-selector design in SR-004 |
| 2026-08-03 | Code | `agent-tools/task-delegation/task-delegation-tool-{parameter-schemas,input-parsers,manifest}.ts`; `task-delegation/task-delegation-{record,input-resolver}.ts`; `services/delegation-target-roster-builder.ts` | Trace the current public task target language and authority | Tool input is `{target:{kind:"member"\|"team",name}}`; resolver matches `memberName` in a direct-member context; prompt roster advertises flat names | Replace with `recipient_name`; common topology infers type; remove flat-kind/name lookup and authority |
| 2026-08-03 | Code | `task-delegation/task-delegation-{service,activation-coordinator,target,address-builder}.ts`; `task-team-run-identity-factory.ts`; `backends/mixed/members/mixed-task-{agent,team}-instance-registry.ts` | Trace post-resolution task execution and eligibility constraints | Task identities already carry route/path and records persist structured conversation addresses, but each service/registry intentionally activates against its current TeamRun's direct runtime contexts | Share address resolution, then preserve current direct-target task eligibility; do not silently add cross-TeamRun task ownership |
| 2026-08-04 | User clarification | Ticket conversation during explicit delivery verification | Decide whether canonical caller/placement data should retain multiple path/address/owner forms | User established that mounting topology deterministically decides one canonical address and every other logical path/owner/route view is derived; requested a principles-led refactor and user review before reviewer handoff | Produce SR-006 and stop for user review |
| 2026-08-04 | User approval and scope decision | Ticket conversation after SR-006 user review | Decide whether to submit SR-006 and whether whole-execution identity normalization belongs in this round | User approved the focused SR-006 collaboration-boundary contraction, authorized architecture re-review, and explicitly deferred the larger whole-TeamRun refactor to a later phase | Submit the cumulative SR-006 package to `architecture_reviewer`; do not expand this round |
| 2026-08-04 | Doc | `solution-designer/design-principles.md` | Reapply shared-structure tightness, ownership, spine, removal, and persisted-data principles | Shared reusable structures must remove redundant parallel representations; topology remains authoritative; derived execution projections must not cross the shared collaboration boundary | Applied in SR-006 |
| 2026-08-04 | Code | `agent-team-execution/domain/member-logical-address-context.ts`; `services/member-team-context-builder.ts`; `agent-tools/task-delegation/task-delegation-autobyteus-context.ts` | Audit the implemented caller address shape and construction seams | Context stores five fields. Factory accepts `memberPath` plus `immediateTeamPath`, derives strings, and checks only relative lengths; the native adapter independently parses both arrays | Replace input/result with `{rootTeamRunId,memberAddress}` and derive every view through the address domain |
| 2026-08-04 | Code | `agent-team-execution/services/resolved-team-logical-placement.ts`; `team-logical-placement-resolver.ts`; `task-delegation-target-mapper.ts`; `mixed-team-manager.ts` | Audit shared placement consumers and minimum required facts | Agent route key is derivable from address; owner Team/local path/route are derivable from subject address; message needs only effective Agent address, and task mapping needs target parent/basename plus Team ingress address | Tighten placement to Agent `{kind,address}` or Team `{kind,address,ingressAddress}` |
| 2026-08-04 | Command | `rg -l "memberPath" autobyteus-server-ts/src \| wc -l`; equivalent commands for `memberRouteKey` and `coordinatorMemberRouteKey` | Assess whether the entire execution topology should be normalized inside SR-006 | Fields appear in 78, 128, and 34 production files and cross run history, events/status, selectors, task identities, message participants, and metadata | Defer whole-execution normalization to a separately investigated ticket; remove the fields only from the new collaboration context/result |
| 2026-08-04 | Code | `run-history/store/team-run-metadata-{types,schema}.ts`; `agent-team-execution/services/team-run-metadata-mapper.ts`; `task-delegation/task-delegation-record.ts` | Determine persisted-data effect of the focused refactor | Caller context and resolved placement are ephemeral. Task record files persist conversation addresses and kind, not `MemberLogicalAddressContext`; TeamRun metadata remains unchanged | `Not Affected`; no migration or compatibility reader |
| 2026-08-04 | Git / downstream artifacts | `git log -6 --oneline`; `git status --short`; implementation/review/API-E2E/delivery reports | Establish current branch state before design rework | SR-005 implementation commits are `2ed26efb9` and `93cc7ed34`; downstream checkpoint is `c3cafa6a4`; delivery-owned doc changes remain untouched | Solution designer edits only authoritative solution artifacts |

## Relevant Existing Behavior And Production Paths

BEH-001–BEH-011 below retain the initial pre-implementation baseline that justified SR-001–SR-005. BEH-012 records the post-implementation state that is the direct current input to SR-006; the downstream implementation/review/coverage artifacts remain authoritative evidence for the now-implemented earlier behaviors.

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | File/GraphQL AgentTeam definition read/write | Team config/application-owned parser -> `AgentTeamDefinition` -> service/cache -> GraphQL converter or writer | Members and coordinator round-trip; no native handoff data exists | Definition domain/providers/GraphQL files above |
| BEH-002 | System | Team Agent calls `send_message_to({recipient_name,...})` | Runtime adapter -> `SendMessageToDispatcher` -> `MemberTeamContext.deliverInterAgentMessage` -> `TeamMessageRecipientResolver.buildSenderRoster` -> member handle -> AgentRun input | Exactly one allowed flat roster name is required; accepted Team route emits Team Communication | Dispatcher/resolver/delivery coordinator |
| BEH-003 | System | Parent/child nested Team communication | Roster builder projects child coordinator as `subteam_representative`; child coordinator may see `parent_boundary_agent`; subteam handle recursively posts/bridges | Parent sees only child coordinator alias; upward messaging restricted to child coordinator; no arbitrary sibling/root navigation | Roster builder, context builder, resolver, subteam handle |
| BEH-004 | Contract | TeamRun launch from nested Team definition | `TeamDefinitionTopologyPlanner` -> root `TeamRunConfig.memberTree` -> run identity assignment -> `MixedSubTeamRunFactory` child localization -> mixed contexts/handles | Root recursive paths exist, but current localization produces inconsistent nested child config because it rebases descendant member routes without nested Team coordinator routes | Topology planner, config localization helper, child factory |
| BEH-005 | Contract | Agent calls `get_handoff_rules` | `No Current Path` | Capability absent; handoff prose must live outside a native Team definition/tool | `rg` found no implementation; SR-002 additionally defines its provider envelope |
| BEH-006 | System | Team member runtime bootstrap/turn | Provider prompt builder -> `composeMemberRunInstructions` -> flat roster manifest | LLM sees current member, allowed short names, representative/parent annotations, and exact-run rules | Instruction/roster/prompt builders |
| BEH-007 | Contract | Agent calls `send_message_to({target_agent_run_id,...})` | Shared dispatcher -> `GlobalAgentRunMessageRouter` -> active AgentRun input -> runtime adapter serialization | Live-only exact ID, no Team roster lookup, no Team Communication projection; internal success/rejection codes are stable, but current public adapters drop them | Dispatcher, global router, AutoByteus send wrapper, MCP result mapper |
| BEH-008 | Operational | Create/terminate/restore TeamRun | Topology plan -> config -> metadata mapper/store; restore metadata -> config/context -> member restore | Current recursive member topology and run IDs survive; definition handoffs cannot because none are stored | Team run service/metadata files |
| BEH-009 | Contract | Agent config includes a server-owned tool | AutoByteus bound BaseTool or Agent Tools MCP descriptor -> shared server dispatcher/service -> provider result adapter | Tool exposure is configuration-gated; Codex/Claude names normalize to canonical application tool names; current AutoByteus/MCP result mappings do not preserve `AgentOperationResult.code` | Tool resolver, AutoByteus wrapper, MCP provider/result mapper files |
| BEH-010 | User | Post TeamRun user message without member selector | `TeamRun.postMessage` -> `resolvePostMessageTarget` -> configured coordinator route -> backend/member | Root coordinator is default Team ingress | `domain/team-run.ts` |
| BEH-011 | Contract | Team member calls `delegate_task` with `{target:{kind,name}}`, delegates/reviews a task, or addresses an exact task AgentRun | Tool schema/parser -> direct flat task roster in generic `MemberTeamContext.members` -> name/kind input resolver -> task Agent/Team identity; Team ingress is mapped from `representative` -> current-TeamRun activation | Task execution is distinct from ordinary communication, but current public addressing is a second flat authority and Team ingress depends on the synthetic representative descriptor slated for removal | Task tool schema/parser/manifest, delegation roster/context mapper, input resolver, activation coordinator, task instance registries |
| BEH-012 | Contract / Refactor | Any implemented Team member context construction followed by message or task recipient resolution | Mounted `TeamRunConfig.memberTree` -> `MemberTeamContextBuilder` -> five-field `MemberLogicalAddressContext`; root `TeamLogicalPlacementResolver` -> subject/owner/route-bearing placement -> message or task consumer | Approved runtime behavior works and passed downstream coverage, but one logical placement is repeated as address/path/immediate-Team/route/owner values; constructor length validation cannot prove the two supplied paths share the same prefix | Current branch `c3cafa6a4`; files and commands in 2026-08-04 source-log rows |

## Design Health Assessment Evidence

- Change posture: `Behavior Change`, `Feature`, and `Refactor`.
- Candidate root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `Shared Structure Looseness`, `Legacy Or Compatibility Pressure`.
- Refactor posture evidence summary: SR-005 removed the flat authorities, but its implemented shared context/result still repeat facts derivable from one canonical mounted address. SR-006 should perform a clean contraction of those ephemeral structures, while the broader persisted execution identity model remains a separate concern.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamDefinitionTopologyPlanner` / `TeamRunConfig` | Truthful recursive paths are already authoritative for run topology | Reuse/tighten existing identity; do not create a separate handoff matrix | Receiving design must name the compiling/resolving owner |
| `MemberTeamContextBuilder` | Builds flat communication recipients and stores many unrelated Team/task/token fields | Current shared structure is too loose for reusable collaboration semantics | Define a tight collaboration sub-contract/composition boundary |
| `TeamMessageRecipientResolver` | Rebuilds the same flat roster at delivery time | Prompt and runtime policy can drift; duplicated resolution authority | One resolver must own canonical logical address parsing/traversal |
| Task tool schema, roster, and `TaskDelegationInputResolver` | Define a second `{kind,name}` direct-member address language over the same Team topology | The ticket would retain two recipient identities if task selection stayed flat | Both recipient-oriented operations must consume one typed logical placement resolver; task policy starts afterward |
| `mixed-sub-team-member-handle.ts` | Parent/child bridge preserves recursive delivery and event prefixing | Underlying traversal can be reused, but projection/authorization semantics must be removed | Preserve lazy Team lifecycle and event truth |
| Definition provider split | Application-owned config has a separate parser/writer | A partial schema addition would silently drop data on one ownership scope | Explicitly cover all readers/writers/API converters |
| Metadata schema | Strict current-format parser rewrites canonical metadata | Run-stable handoffs need explicit snapshot fields | Keep optional field directly usable; no old/new business path |
| Current tests/docs | Explicitly assert short roster representatives | Compatibility retention would keep the wrong public contract | Replace stale assertions/docs cleanly |
| `member-logical-address-context.ts` | One context stores two paths and their two formatted strings | Shared structure looseness; contradictory independently supplied paths remain representable | Store only root run ID plus canonical member address |
| `resolved-team-logical-placement.ts` | Subject address is accompanied by address-derived route and owner fields | Shared result carries redundant parallel identity | Return only kind/address and Team ingress address |
| Run-history/event/task execution identity inventory | Path/route fields cross many older persisted and runtime contracts | Whole-system normalization is a distinct large refactor with persisted-data implications | Do not hide it inside SR-006; explicitly defer |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Team definition/update domain | No handoff edge type/field | Extend with one tight edge shape |
| `.../providers/team-definition-config.ts` | Shared/team-local config normalization/write | Canonical `team-config.json` owner | Likely authoring location for handoffs |
| `.../providers/application-owned-team-source.ts` | Application bundle Team config | Separate schema path | Must remain semantically identical |
| `.../providers/file-agent-team-definition-provider.ts` | File source routing and read/write | Chooses source-specific parser/writer | Do not put validation/orchestration here |
| `.../services/agent-team-definition-service.ts` | Definition create/update boundary | Owns validation coordination | Should enforce edge validity via domain/topology owner |
| `.../services/team-definition-graph-validator.ts` | Recursive reference integrity | Has graph traversal lookup | Candidate extension point or collaborator for authored endpoint validation |
| `.../api/graphql/types/agent-team-definition.ts` | Definition API | Independent input/output types | Add handoff input/output fields |
| `.../services/team-definition-topology-planner.ts` | Run topology compilation | Already walks every nested mount | Natural launch-time composition seam; avoid bloating it without a focused handoff compiler |
| `.../domain/team-run-member-identity.ts` | Internal route-key/path helpers | Normalizes malformed strings permissively | Public address grammar needs a strict owned parser; internal helpers can remain canonical identity support |
| `.../domain/team-run-config.ts` | Immutable launch config/member tree | No effective handoff snapshot | Extend or compose a semantically tight run collaboration snapshot |
| `.../services/member-communication-roster-builder.ts` | Flat Agent-visible recipients | Owns synthetic representatives/parent recipients | Remove/decommission after replacement |
| `.../domain/member-team-context.ts` | Team instruction, communication, task/token binding | Overloaded; stores flat recipients | Separate collaboration contract from Team/task/token concerns |
| `.../services/member-team-context-builder.ts` | Per-Agent Team context construction | Builds flat roster once | Must bind root-aware collaboration snapshot instead |
| `.../services/member-team-roster-manifest.ts` | Prompt flat roster | Advertises synthetic model | Replace with truthful topology/identity rendering or equivalent protocol |
| `.../services/member-run-instruction-composer.ts` | Shared Team member runtime instruction | Correct cross-provider composition owner, wrong recipient model | Extend stable protocol; do not inline rules |
| `.../backends/mixed/delivery/team-message-recipient-resolver.ts` | Sender-specific Team recipient resolution | Second flat roster owner | Replace with strict rooted address resolver |
| `.../backends/mixed/delivery/team-member-delivery-coordinator.ts` | Delivery, input tracing, communication event | Can remain main delivery owner | Feed it resolved real Agent endpoints |
| `.../backends/mixed/members/mixed-sub-team-member-handle.ts` | Lazy child Team lifecycle and recursive delivery | Strips prefix and bridges parent | Preserve lifecycle while removing Agent-facing fake representative |
| `.../services/team-run-metadata-mapper.ts` | Run config/metadata conversion | Definition summary read is separate from run topology | Add handoff snapshot mapping; restoration cannot compile current definitions |
| `.../run-history/store/team-run-metadata-schema.ts` | Strict current metadata parser/normalizer | No optional handoffs | Missing new field can safely normalize empty |
| `.../agent-communication/services/send-message-to-dispatcher.ts` | Shared selector dispatch | Correct public authority for selector separation | Consume a collaboration binding for Team address route |
| `.../agent-tools/agent-communication/*` | AutoByteus server-owned communication tool | Established wrapper/registry pattern | Reuse for handoff retrieval |
| `.../agent-tools/mcp/providers/*` | Codex/Claude/external Agent Tools MCP adapters | Static adapter registry | Add one canonical handoff adapter |
| `.../agent-team-execution/task-delegation/task-delegation-target.ts` | Task-owned member/Team/ingress identities | Already owns typed post-resolution identities and `TaskDelegationTeamIngressIdentity` | Construct these from the shared resolved placement; do not make them an address index |
| `.../agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Flat task input/name validation and target lookup | Matches caller-supplied kind/name against direct members and rejects null Team ingress | Replace target lookup with common logical placement resolution followed by task eligibility/identity mapping; preserve ingress invariant |
| `.../agent-tools/task-delegation/task-delegation-{tool-parameter-schemas,tool-input-parsers,tool-manifest}.ts` | Public `delegate_task` contract | Requires `{target:{kind,name}}` and describes direct roster names | Replace cleanly with `recipient_name` using the shared grammar; remove kind/name compatibility |
| `.../services/delegation-target-roster-builder.ts` | Renders direct flat task targets | Advertises `targetName` values as authoritative | Either render canonical absolute addresses from the root topology for discovery or rename/rebuild accordingly; never resolve calls |
| `.../agent-tools/task-delegation/task-delegation-context-member-mapper.ts` | Maps generic Team descriptors into task targets | Converts `representative` to `ingress` | Remove target-list mapping; retain only caller identity projection if still necessary |
| `.../agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts` | Projects server Team context to native AutoByteus context | Re-maps generic target descriptors today | Copy shared caller addressing/task-instance identity only; remove targets and `representative` fallback |
| `.../agent-tools/agent-communication/send-message-to.ts` | AutoByteus send wrapper | Returns message-only success/error strings | Return canonical JSON envelope text preserving dispatcher code |
| `.../agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | Generic MCP operation-result mapping | Drops `AgentOperationResult.code` | Do not use its operation-result branch for collaboration tools; use a dedicated envelope-to-MCP mapper to avoid broad changes to unrelated tools |
| `.../agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.ts` | MCP send adapter | Currently returns a generic operation result | Build the same collaboration envelope as AutoByteus and return matching text/`structuredContent` |
| `.../agent-team-execution/domain/team-run-config.ts` (`stripMemberPathPrefix`) | Current member-tree path localization | Recursively rebases member paths/routes but not nested Team coordinator routes; silently retains members outside prefix | Replace with one strict `localizeSubTeamRunTopology` owner that returns localized root coordinator plus full tree |
| `.../agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Persistent/restored/task child config construction | Calls path stripper and separately strips the top-level coordinator route | Call the one localization helper and perform no additional string route stripping |
| `.../agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts`; mixed task instance registries | Activate task execution against one TeamRun's direct contexts | Shared root resolution can select a placement beyond current task ownership | Preserve direct-target eligibility after resolution; keep lifecycle/ledger/review semantics and current manager ownership unchanged |
| Provider prompt/tool exposure files | Per-runtime materialization | Contracts converge through shared composer/exposure | Preserve configuration gating and canonical names |
| `.../domain/member-logical-address-context.ts` | Implemented shared caller coordinate | Stores member address/path and immediate-Team address/path; factory accepts both paths | Replace with exact `{rootTeamRunId,memberAddress}` and domain derivation functions |
| `.../services/resolved-team-logical-placement.ts` | Implemented shared message/task placement | Carries subject wrapper, route keys, and owner path/local route in addition to canonical address | Replace with exact Agent/Team address union; preserve Team ingress address only |
| `.../services/team-logical-placement-resolver.ts` | Root topology traversal | Currently reads caller `immediateTeamPath` and copies config paths/routes into result | Derive caller parent from its address and derive visited addresses from traversal segments/member names |
| `.../task-delegation/task-delegation-target-mapper.ts` | Post-resolution task eligibility/current-local mapping | Currently depends on placement owner coordinate | Derive target parent/basename and Team ingress basename from canonical addresses; exact direct config matching remains task-owned |
| `.../services/inter-agent-message-delivery-intent-builder.ts`; `backends/mixed/mixed-team-manager.ts` | Sender intent and private delivery endpoint | Currently consume context paths and placement route coordinate | Derive participant path/route and private root selector from canonical Agent address |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-03 | Script | Repository-wide Python scan of `team-config.json` member names | 10 observed names; none blank, trimmed incorrectly, reserved, slash-containing, or backslash-containing | Proposed path-segment validation has no observed stored-data rewrite need |
| 2026-08-03 | Test attempt | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/member-team-context-builder.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts tests/unit/agent-tools/team-communication/send-message-to.test.ts --no-file-parallelism` | Command exited 254 before collection: `Command "vitest" not found`; fresh worktree dependencies are not installed | No behavioral test result claimed; receiving team must install/prepare normally before execution |
| 2026-08-04 | Static construction probe | Read `createMemberLogicalAddressContext` and evaluate its sole relationship guard against `memberPath=['research_team','research_lead']`, `immediateTeamPath=['another_team']` | Length condition passes although the derived member and parent Team addresses contradict each other | The data shape, not another guard, is the root issue; remove the second supplied path |
| 2026-08-04 | Downstream evidence read | Implementation handoff, code review, API/E2E execution report, delivery revision record | SR-005 behavior passed implementation review and broad deterministic coverage before this refactor request | SR-006 acceptance requires preserved behavior plus focused minimal-shape proofs; no claim that SR-006 code has run yet |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal domain/runtime change; the fresh repository code and user-approved product contract are authoritative.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for bootstrap investigation. Live provider coverage later needs the repository's existing AutoByteus/LM Studio, Codex, and Claude E2E setup/flags.
- Required config, feature flags, env vars, or accounts: None used during bootstrap.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None. No dependency install or runtime process was started.

## Findings From Code / Docs / Data / Logs

### 1. Recursive topology is present but not the Agent logical-address authority

`TeamDefinitionTopologyPlanner.buildSkeleton` recursively assigns each Agent and child Team a `memberPath` and slash-joined `memberRouteKey`. `TeamRunConfig` stores the recursive tree and derives a flat leaf list only as a non-authoritative projection. Nested Team handles already traverse and strip route prefixes at child boundaries.

This makes the desired filesystem analogy an evolutionary correction: use the current truthful topology for Agent logical addressing instead of inventing a separate graph.

### 2. Flat recipient projection is an explicit workaround

`MemberCommunicationRosterBuilder` exposes:

- direct Agents as `local_agent`;
- child coordinators as `subteam_representative`; and
- selected parent Agents as `parent_boundary_agent` only for the child coordinator.

`MemberTeamContextBuilder` stores this list and `allowedRecipientNames` for prompt use. `TeamMessageRecipientResolver` rebuilds the same sender-specific roster at delivery time, then exact-matches `recipient_name` against it. The duplicated build creates two coordination points and prevents a truthful cross-branch namespace.

### 3. Synthetic projection is not required for delivery mechanics

The mixed runtime already has recursive Team/member handles. Parent-to-child delivery enters a `MixedSubTeamMemberHandle`, strips the top segment, and posts to the child run. Child-to-parent delivery prefixes the actual child Agent sender path before it enters the parent delivery coordinator. Communication payloads use concrete participant addresses.

The implementation challenge is therefore root-aware resolution/binding, not inventing a new message transport.

### 4. Definition schema ownership is distributed across explicit source adapters

Shared/team-local definitions and application-owned definitions do not use one identical parser/writer. GraphQL also has independent input/output types and conversion. A handoff field added only to the domain or shared config would be lost on update through another surface.

### 5. Handoff rules need a launch snapshot

Active AgentTeam dynamics are outside Ticket 1. The effective edge graph depends on recursive mounting: a child definition's `/research_lead` may become `/research_team/research_lead` in its parent run. That effective graph must be compiled after topology resolution and stored with the run. If restoration re-reads definitions, an old run could silently receive new rules or broken endpoints.

### 6. A strict public address parser is required

Current internal route-key normalization replaces backslashes, collapses repeated slashes, and strips leading/trailing separators. Those behaviors are useful for some internal canonical identities but would silently reinterpret malformed model input. The Team logical-address contract must have a strict parser that preserves the semantic difference between `/`, `./`, and invalid bare/parent-traversal forms.

### 7. Tool infrastructure can be extended without provider-specific business logic

`send_message_to` is registered as a server-owned AutoByteus tool and a static Agent Tools MCP adapter. Codex and Claude materialize the shared MCP descriptor and normalize provider names back to canonical tool names. `get_handoff_rules` should follow that established path and use a bound collaboration context rather than provider sessions as the rule owner.

### 8. Existing data supports no-migration addition

Observed Team configs use path-safe names and omit handoffs. The normal version-agnostic definition reader can map absence to `[]`. Current recursive TeamRun metadata can accept a new optional snapshot and map absence to `[]`; no existing field needs reinterpretation or transformation. This is `Directly Usable — No Migration`, not a reason to rewrite every file.

### 9. Existing durable coverage has both reusable and stale parts

Reusable coverage areas:

- AgentTeam definition GraphQL create/update/file roundtrip;
- nested mixed Team launch/delivery/restore;
- all-runtime `send_message_to` matrix;
- AutoByteus/Codex/Claude tool gating and prompt projection;
- TeamRun metadata schema/mapper/history;
- exact-run selector tests.

Stale coverage areas after the clean cut:

- `MemberTeamContextBuilder` assertions for visible subteam representatives;
- parent recipients only for the child coordinator;
- flat `allowedRecipientNames` roster manifests;
- nested E2E calls using bare coordinator/parent names.

The later `api_e2e_engineer` must produce its own formal coverage investigation before editing/executing durable coverage.

### 10. Root-canonical delivery can reuse the current parent callback and downward handle mechanics

The child `MemberTeamContext` currently constructs a child-local sender identity, and `mixed-parent-boundary-delivery-intent.ts` prefixes that identity while walking upward. That rewrite exists to support the flat parent-boundary projection. A focused member collaboration binding can instead construct the caller's root-canonical path and root TeamRun ID before dispatch. Non-root managers can forward that intent unchanged through their existing parent callback until the root manager is reached. At the root, `MixedPersistentMemberRegistry.resolveContext` already returns the top-level subteam wrapper for a nested selector, and each `MixedSubTeamMemberHandle` already strips one segment while delivering downward. The target design therefore needs one root resolver, not a new transport.

### 11. The Team resolver's exact-run/task-run branch is not the public exact-run route

`SendMessageToDispatcher` returns immediately to `GlobalAgentRunMessageRouter` when the selected target is `target_agent_run_id`; only `recipient_name` reaches `buildInterAgentMessageDeliveryIntent` and Team delivery. No production builder found in the search constructs a Team intent with an exact-run selector. The exact/task/recovery branches inside `TeamMessageRecipientResolver` are overlapping unreachable policy for the public tool path and should be removed when the Team intent is tightened to a logical address subject. This does not change exact-run behavior.

### 12. Runtime snapshot propagation has several explicit reconstruction seams

`TeamRunConfig` is reconstructed by topology planning, launch identity assignment, metadata restore, `AgentTeamRunManager`, `MixedTeamRunBackendFactory`, and child TeamRun creation. An effective handoff field added only to the initial planner would be silently dropped. The implementation must thread the root snapshot through every root config reconstruction and give lazy child contexts an inherited root collaboration binding containing root ID, Team mount path, and caller-filtered outgoing edges. Persisting a second member topology is unnecessary and would create an overlapping authority.

### 13. Task-Team ingress must be split from communication before representative removal

The synthetic `SubTeamRepresentativeDescriptor` is overloaded. Communication uses it to advertise a child coordinator as a fake parent member, while task delegation maps the same data to the legitimate `TaskDelegationTeamIngressIdentity` required to start a delegated task Team. `DelegationTargetRosterBuilder` also reads it for task guidance, and `TaskDelegationInputResolver.resolveTeamTarget` rejects a Team target without ingress.

The authoritative source already exists independently of communication rosters: the root `TeamRunConfig.memberTree` identifies every placement, while each active owning TeamRun has a canonical local config containing its direct Team coordinator and runtime IDs. The common address resolver can return a typed root placement plus the owning-Team route. Task delegation then maps that result to `TaskDelegationMemberIdentity` or `TaskDelegationTeamIdentity`, requiring a real direct Agent coordinator for a Team target. Task guidance, native AutoByteus context, and MCP task adapters need caller/root addressing identity, not a copied flat target list or communication representative.

### 14. Stable collaboration codes currently stop at provider adapters

`SendMessageToDispatcher` and `GlobalAgentRunMessageRouter` already return `AgentOperationResult` with codes such as `DELIVERED`, argument failures, grant failures, and `TARGET_AGENT_RUN_NOT_ACTIVE`. `AutoByteusSendMessageToTool._execute` reduces the result to a human-readable string. `SendMessageToMcpAdapterProvider` returns an operation result that `AgentToolsMcpResultMapper.toolResultFromOperationResult` reduces to text plus `isError`. Both paths discard `code`.

A focused collaboration result contract is sufficient: normalize each communication operation to `{accepted, code, message, result}`, serialize that exact object as AutoByteus JSON text, and use the identical JSON plus object for MCP `content[0].text` and `structuredContent`. The send adapter copies any existing dispatcher/global-router code exactly; only an absent code receives the documented send fallback. `get_handoff_rules` supplies its own `HANDOFF_RULES_RETRIEVED` or `COLLABORATION_CONTEXT_REQUIRED` code. A dedicated MCP mapper avoids changing unrelated server tools that still use the generic operation mapper.

### 15. Child TeamRun localization is incomplete below one nested boundary

`stripMemberPathPrefix(memberConfigs, prefix)` recursively slices every descendant `memberPath` and derives a new `memberRouteKey`, but the Team branch spreads the original `coordinatorMemberRouteKey` unchanged. `MixedSubTeamRunFactory` separately calls `stripRoutePrefix` only for `input.subTeamConfig.coordinatorMemberRouteKey`, the coordinator of the child being created. It never repairs nested Team entries inside `childTree`.

For a root config containing `/research_team/field_team/field_lead`, localizing `/research_team` produces the Agent route `field_team/field_lead` while the nested `field_team.coordinatorMemberRouteKey` can remain `research_team/field_team/field_lead`. Exact current-local task mapping then correctly refuses the inconsistent tree. A fallback that attempts both shapes would create two route authorities and mask invalid configs.

The correction belongs to the TeamRun-config localization boundary, not task delegation. A single strict `localizeSubTeamRunTopology(subTeamConfig)` helper should localize the newly created child's coordinator and every descendant member/Team coordinator recursively. It must derive each localized coordinator route by exact source-identity pairing with one direct Agent and the Agent's localized route, not by testing alternative string prefixes. `MixedSubTeamRunFactory` is the sole lifecycle caller for persistent, restore, and task Team child creation and should perform no second route rewrite.

### 16. `delegate_task` currently duplicates the recipient identity model

The public task schema and parser require `{target:{kind:"member"|"team",name}}`. `TaskDelegationInputResolver` then matches that flat name against `TaskDelegationContext.members`, and `DelegationTargetRosterBuilder` teaches the model those direct-member names. By contrast, the approved message contract resolves `/...` or `./...` against the full collaboration tree. Both operations first answer the same domain question—“which Agent or Team placement is the recipient?”—so retaining the task form would leave a second address authority and force callers to know a target kind the topology already owns.

The clean target is one common logical placement resolver returning a typed Agent-or-Team placement and owning-Team route. `send_message_to` maps that result to ordinary Agent delivery (including Team coordinator ingress); `delegate_task` first preserves current direct-member/current-TeamRun eligibility, then maps an eligible result to task-owned identity and activation. Task-specific eligibility occurs after shared resolution and does not change address meaning.

Current task activation is scoped to a `TeamRun`: `TaskDelegationService` holds a run-bound ledger and calls `TeamRun.startTaskAgentInstance` / `startTaskTeamInstance`, while mixed task registries search only that run's direct member contexts. The user clarified addressing, not cross-TeamRun task ownership. The proportionate target therefore lets the common resolver identify any root placement, then requires the resolved placement's owning Team path to equal the caller's immediate Team path. Non-direct/deeper/cross-branch placements receive a task-specific eligibility error without name fallback. Historical task records already store structured `ConversationTargetAddress` and receiver kind rather than the live flat selector, so this public input cleanup does not itself require record migration.

### 17. SR-005 finding: the proposed shared placement must not become a config or lifecycle carrier

`ARCH-REV-003` confirmed the common resolver and current-TeamRun task policy, then identified a boundary contradiction in the proposed return type. `ResolvedAgentPlacement.memberConfig` and `ResolvedAgentTeamPlacement.teamConfig` would expose complete root snapshot configs—including provider, workspace, runtime, and recursive child settings—through `TeamRun.resolveLogicalPlacement`, even though that facade exists specifically to prevent task tooling from reading TeamRun config. The proposed `owningTeamRunId` is also not a truthful active-owner identity when a task-scoped TeamRun instantiates the same logical Team placement under a distinct run ID.

Neither operation needs those config or lifecycle values. Root message delivery already owns the config, registry, and handle lookup behind `MixedTeamManager`; after shared resolution it needs only the selected logical Agent address or configured Team ingress address. Task delegation obtains task runtime IDs, role/description, Team definition ID, and coordinator materialization identity from the caller's **current** canonical local config.

SR-005 therefore narrowed the shared value to immutable logical coordinates and omitted all config objects, member/run IDs, provider/runtime settings, handles, and lifecycle identity. That was the correct response to `DR-003`; §18 records the later post-implementation evidence that the remaining route/owner coordinates are themselves derivable and should now be removed by SR-006. The enduring conclusion is one resolver and one identical placement shape without either operation consuming the other's state.

### 18. SR-005 still models one canonical placement more than once

The SR-005 implementation proves that the resolver boundary can remain config-independent, but its shared values are not yet minimal. `MemberLogicalAddressContext` stores a canonical member string, its segment array, the parent-Team string, and the parent-Team segment array. Its factory reduces risk by deriving the two strings, yet still accepts two independent arrays and checks only their relative lengths. It does not require `immediateTeamPath` to be the exact prefix of `memberPath`, so contradictory caller identity remains constructible.

The shared placement repeats the same issue one layer later. For an Agent, `memberRouteKey` is the canonical address without its leading slash. For any non-root subject, `owner.teamPath` is `parentAddress(subject)`, `localMemberPath` is `[basename(subject)]`, and `localMemberRouteKey` is `basename(subject)`. These values do not add domain meaning; they create parallel representations that every constructor and consumer must keep synchronized.

The principles-led correction is a contraction, not a new abstraction:

- `MemberLogicalAddressContext = {rootTeamRunId, memberAddress}`;
- `ResolvedTeamLogicalPlacement = {kind:"agent",address} | {kind:"team",address,ingressAddress}`;
- strict address-domain operations own `segments`, `basename`, `parentAddress`, and root selector derivation;
- the resolver derives addresses from its topology traversal cursor rather than copying stored config paths/routes;
- message delivery derives the private selector from the selected effective Agent address; and
- task policy compares `parentAddress(target)` to `parentAddress(caller)`, then performs one exact direct current-local config match by the derived basename and resolved kind. Team ingress must be a direct Agent whose canonical parent equals the Team address.

This does not make an address replace the topology. Syntax derives structural views; topology lookup still determines existence, Agent-versus-Team kind, configured Team ingress, and execution config. `rootTeamRunId` remains necessary because the same canonical logical address can exist in multiple concurrent TeamRun snapshots. Exact AgentRun/task identities remain separately owned.

The larger `TeamRunConfig`/metadata/event route system predates this shared collaboration boundary and is materially wider. Static inventory shows 78 production files mentioning `memberPath`, 128 mentioning `memberRouteKey`, and 34 mentioning `coordinatorMemberRouteKey`. Those fields participate in history lookup, status/event payloads, conversation segments, task identities, memory/token scopes, and current metadata. Removing them may be a valuable future topology normalization, but it requires separate behavior/persistence investigation. SR-006 makes them non-authoritative for collaboration without pretending to solve that broader system.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume:
  - AgentTeam definitions use `team.md` plus `team-config.json` under configured shared/additional package roots and application bundles.
  - Current in-repository application examples contain two primary Team configs; a repository-wide scan including artifacts found 10 member entries.
  - TeamRun history uses `<memoryDir>/agent_teams/<teamRunId>/team_run_metadata.json`; runtime volume is user-specific and was not enumerated because no transform is proposed.
- Relevant code-model, serialization, semantic, or physical-store change:
  - Add optional authored definition edges.
  - Add optional effective TeamRun snapshot.
  - Replace public message and task logical recipient meaning; no stored member topology identity changes. Existing task records already persist canonical structured addresses and typed receiver kind, not the live flat selector.
  - SR-006 contracts `MemberLogicalAddressContext` and `ResolvedTeamLogicalPlacement`, both ephemeral in-process values. It does not alter stored Team definitions, TeamRun metadata, task record files, or public history/event payloads.
- Normal readers and writers, including unknown/extra-field behavior:
  - Definition normalizers explicitly select known fields; writers reconstruct records, so the handoff field must be added to all normalizers/writers.
  - TeamRun metadata parser/normalizer explicitly constructs the current type and writers canonicalize it, so the new optional field must be recognized and written.
- Representative direct-read or compatibility evidence:
  - Existing configs omit the new field and already have safe member names.
  - Existing current metadata validator requires core recursive fields but can be extended to accept an absent optional field as empty.
- Required semantics and invariants preserved by direct use: `Yes` — missing handoffs truthfully means no native handoff edges; current member paths/run IDs remain unchanged; SR-006 needs no persisted-data reader or writer change.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Natural-language rules may contain user-authored work policy but no new secret store is introduced. Atomic JSON write behavior already exists. No disposal/rebuild is needed.
- Concrete benefit, cost, and risk of migration if it remains a candidate: A bulk rewrite provides no semantic benefit and adds unnecessary operational/history risk. Migration is rejected.
- Existing migration framework or lifecycle constraints, only if migration may be required: Current TeamRun schema has an explicit unsupported legacy-flat metadata boundary, but this ticket does not need to alter or revive it. The SR-006-specific outcome is `Not Affected`.

## Constraints / Dependencies / Compatibility Facts

- Ticket 1 excludes AgentOrg and dynamic live organization reconciliation.
- Ticket 1 excludes external/pure-text Agent package edits. Runtime/project tests may add local fixtures, but external package content remains untouched.
- TeamRun remains the native lifecycle owner for Agents and child TeamRuns.
- AgentTeam remains coordinator-led and requires a direct Agent coordinator.
- `target_agent_run_id` stays separately owned by the global active-run router.
- Handoff edges are sender guidance, not a routing allowlist.
- Tool exposure is currently selected by Agent definition `toolNames`; Ticket 1 should extend, not bypass, that policy.
- Clean-cut replacement means no bare-name compatibility fallback and no fake direct-parent child coordinator.
- Active Team definitions may be explicitly refreshed in the catalog, but an existing TeamRun remains static.
- No automatic file-system watching.

## Open Unknowns / Risks

- SR-006 must update every caller-context construction/clone/parser seam atomically. Leaving one provider/native adapter dependent on removed path arrays would make configured task tools diverge even if logical resolution itself is correct.
- Task mapping by derived basename is exact only after canonical parent-address equality and the existing case-insensitive sibling uniqueness invariant. Implementation must preserve that order and reject zero/multiple direct matches; it must not turn basename into a global lookup.
- Team task ingress mapping must prove that `parentAddress(ingressAddress)` equals the resolved Team address before matching the exact direct Agent name/configured coordinator. This preserves the ingress invariant without carrying an owner or route coordinate.
- The broader execution topology field cleanup may be valuable, but its product and persistence reach are not yet fully investigated. It must remain outside SR-006 rather than becoming an unreviewed expansion.
- Snapshot propagation remains an implementation risk because several `TeamRunConfig` constructors must preserve the new field. The design resolves ownership but implementation review must audit every reconstruction.
- Persistent child Teams and task-team instances share `MixedSubTeamRunFactory` but currently receive partially localized nested coordinator routes. SR-003 assigns one recursive localizer; implementation must prove persistent create, restore, and task-child calls all consume its canonical result while collaboration retains a separate root mount.
- Task-agent and task-Team instances use logical member identities and `MemberTeamContext`. SR-004 removes the direct target projection as an address authority: every task caller must receive the shared root addressing binding, and resolved targets must map to task identities with non-null Team ingress without communication/task aliases or handoff ACLs.
- Root-wide resolution can select placements outside current task ownership. Implementation must perform explicit post-resolution direct-target eligibility before mapping current-local IDs; it must not accidentally expand task activation across TeamRun managers.
- The shared resolver traverses rich configs, and message delivery later needs run/config/handle data. SR-005 makes the cross-operation value coordinate-only; implementation must keep traversal cursors and delivery endpoints private and prove no config, setting, handle, member-run ID, or TeamRun identity crosses the placement facade.
- Provider envelope changes are intentionally limited to `send_message_to` and `get_handoff_rules`. The implementation must not accidentally rewrite result shapes for unrelated MCP tools through the generic operation mapper.
- Team Communication DTOs currently show actual participants. If the product later wants both requested Team ingress and resolved Agent recipient displayed, that is an additional UI/history requirement and is not required by Ticket 1.
- No current tests ran in this fresh worktree because dependencies were absent. Investigation findings are code/doc/data evidence, not runtime validation.

## Notes For Architecture Re-review — SR-006

SR-005 passed architecture review and the implementation/review/API-E2E/delivery pipeline. SR-006 is a user-requested contraction of the new shared logical-address structures, not a change to handoff behavior, address grammar, routing, task lifecycle, provider results, or persistence.

The proposed review decision is:

1. topology mounting determines one canonical absolute address for every placement;
2. shared caller identity is exactly `{rootTeamRunId, memberAddress}`;
3. shared resolution returns exactly Agent `{kind,address}` or Team `{kind,address,ingressAddress}`;
4. address-domain functions derive segments, parent Team, basename, and root route selector;
5. topology still determines existence, kind, and Team ingress;
6. task/message execution identities remain owned by their existing private subsystems; and
7. the older whole-TeamRun path/route persistence model is explicitly deferred to a separate investigation.

The user approved this SR-006 decision set and authorized submission to `architecture_reviewer`. The broader whole-execution path/route normalization remains explicitly outside this round and should be investigated as a separate future refactor rather than being inferred into SR-006.
