# AgentTeam Hierarchical Communication And Handoffs — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined — SR-006 user-approved; ready for architecture re-review` — SR-005 passed `ARCH-REV-004` and was implemented, reviewed, covered, and delivery-prepared. During explicit user verification, the user identified that the new collaboration caller context and shared placement still duplicate topology-derived address facts. SR-006 keeps the approved behavior but makes the mounted topology the sole logical-address authority and reduces the shared runtime contracts to one canonical address per placement. The user approved this focused revision and authorized architecture re-review; broader whole-TeamRun execution-identity normalization is deferred to a separate future phase.

## Goal / Problem Statement

Replace AgentTeam's flat, coordinator-projection-based Agent communication model with one truthful hierarchical addressing and handoff model that works consistently for standalone and recursively nested AgentTeams.

Ticket 1 must give a Team-bound Agent:

1. deterministic filesystem-like addresses for Agent and AgentTeam placements;
2. a reusable natural-language `{from, to, rules}` handoff definition owned by AgentTeam;
3. a read-only `get_handoff_rules` tool that returns only the caller's outgoing effective rules; and
4. one consistent `send_message_to` Team route across AutoByteus, Codex, and Claude;
5. the same `/...` and `./...` recipient-address model for `delegate_task`, with task execution semantics applied only after the common address resolves to an Agent or Team placement; and
6. one canonical absolute logical address per mounted placement, with member paths, parent-Team identity, route selectors, and task-owner facts derived rather than duplicated in shared addressing structures.

This ticket is limited to AutoByteus project runtime and definition contracts. Native AgentOrg and external repository-owned/pure-text Agent package edits are separate work.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | `AgentTeamDefinition` and `team-config.json` contain members and a coordinator but no handoff edges. | AgentTeam definitions optionally persist validated natural-language `handoffs: [{from,to,rules}]`. | Team definitions remain file-backed and available in shared, team-local, and application-owned scopes. | R-001–R-006, R-019; AC-001–AC-005, AC-016 |
| BEH-002 | `send_message_to.recipient_name` resolves a flat sender-specific roster name. | It resolves only canonical `/...` or `./...` logical paths through the collaboration tree. | `send_message_to` remains one shared Agent delivery tool. | R-007–R-010, R-014; AC-006–AC-010 |
| BEH-003 | A child Team coordinator is projected into the parent roster as `subteam_representative`; only that child coordinator receives exposed parent-boundary recipients. | Every Agent can address valid Agent or Team placements anywhere inside its collaboration root using truthful paths; no synthetic representative or coordinator-only upward gate exists. | Child Team delivery may still recurse through TeamRun/member-handle boundaries internally. | R-008–R-010, R-016, R-025; AC-007–AC-011 |
| BEH-004 | TeamRun topology already carries recursive `memberPath` and `memberRouteKey`, but model-facing recipient resolution does not use it as the full communication namespace; current child localization rebases descendant member routes without recursively rebasing nested Team coordinator routes. | One rooted topology becomes the logical-address authority, while every created/restored child TeamRun receives one internally consistent child-local topology in which each Team coordinator route exactly identifies a direct Agent. | Existing recursive member lifecycle, identity, status, and history ownership remain TeamRun-owned. | R-003, R-005, R-007–R-009, R-017, R-023; AC-003, AC-006–AC-009, AC-014, AC-018 |
| BEH-005 | No `get_handoff_rules` capability exists. | A configured Team-bound Agent can retrieve only its outgoing effective handoffs in the canonical provider-visible result envelope. | Agent/LLM decides whether a natural-language rule applies and whether to send. | R-011–R-013, R-021, R-026; AC-012, AC-013, AC-019 |
| BEH-006 | Runtime instructions render flat allowed recipient names and representative/parent badges. | Runtime instructions render truthful Agent identity, Team identity, rooted address grammar, and tool protocol without copying all natural-language handoffs into every message. | Team instruction, Agent instruction, and runtime instruction remain distinct sources. | R-013, R-014, R-023; AC-013, AC-018 |
| BEH-007 | `target_agent_run_id` is a separate live-only global route. | It remains separate and unchanged while `recipient_name` adopts hierarchical Team addressing; its existing operation codes survive the public result boundary unchanged. | Exactly one selector remains required; direct-route messages remain outside Team Communication projection. | R-015, R-026; AC-015, AC-019 |
| BEH-008 | TeamRun metadata persists recursive member topology but no handoff snapshot; restore reconstructs topology and re-reads definition summary/instruction where needed. | New TeamRuns persist an immutable effective handoff snapshot; restore uses that snapshot and never recompiles current definitions into prior history. | Existing current-format metadata without the new optional field remains readable. | R-017, R-018, R-020; AC-014, AC-017 |
| BEH-009 | AutoByteus, Codex, and Claude expose configured `send_message_to` through different adapters backed by the shared dispatcher, but current AutoByteus/MCP result adapters discard `AgentOperationResult.code`. | All supported runtimes expose the same configured `get_handoff_rules` and hierarchical `send_message_to` contracts, including an identical `{accepted,code,message,result}` envelope, through shared server ownership. | Provider-native event conversion and canonical tool naming remain runtime-local. | R-021, R-026; AC-019 |
| BEH-010 | A TeamRun user message without an explicit target defaults to the root Team coordinator. | This coordinator-led Team ingress remains unchanged. | AgentTeam continues to require a direct Agent coordinator. | R-022; AC-020 |
| BEH-011 | `delegate_task` currently accepts `{target:{kind:"member"\|"team",name}}`, resolves the flat name only against the current Team's direct task roster, and derives a Team target's ingress from the same synthetic representative descriptor used by flat communication. | `delegate_task.recipient_name` accepts the same `/...` and `./...` grammar as `send_message_to`, resolves through the same collaboration-root topology to a typed Agent or Team placement, and only then applies current direct-member task eligibility and maps an eligible placement to task-owned execution identity and real Team coordinator ingress. | Task eligibility remains limited to direct physical Agents/child Teams of the caller's immediate Team; task creation, task-Agent/task-Team materialization, `submit_task_result`, `review_task_result`, settlement, and exact task AgentRun communication retain task-protocol ownership. | R-023, R-027; AC-018, AC-022 |
| BEH-012 | The implemented `MemberLogicalAddressContext` stores `memberAddress`, `memberPath`, `immediateTeamAddress`, and `immediateTeamPath`; its constructor accepts both path arrays and checks only their lengths. The implemented shared placement also repeats canonical subject address as route keys and owner path/local-route coordinates. | After the mounted topology determines a placement, the shared caller context stores only `{rootTeamRunId, memberAddress}`. The shared resolver returns only `{kind,address}` for an Agent or `{kind,address,ingressAddress}` for a Team. Parent Team, path segments, local name, route selector, and direct-owner eligibility are derived through the canonical address domain or resolved from topology. | Existing TeamRun execution configs, run/history/event identity, child localization, task execution identities, provider envelopes, and all approved message/task/handoff behavior remain unchanged. | R-028–R-031; AC-023–AC-025 |

## Investigation Findings

- The production TeamRun topology is already recursive: `TeamDefinitionTopologyPlanner` creates `memberPath`/`memberRouteKey`, `TeamRunConfig` persists a recursive `memberTree`, and nested Team handles traverse it.
- Model-facing logical communication is nevertheless flat. `MemberCommunicationRosterBuilder` exposes direct Agents, synthetic child coordinators, and a restricted parent boundary; `TeamMessageRecipientResolver` resolves `recipient_name` against that projection.
- The flat projection is duplicated across member bootstrap/context construction and delivery resolution, which risks prompt and runtime disagreement.
- `MemberTeamContext` currently mixes Team instruction, task/token identity, flat recipient projection, and delivery wiring. The new reusable handoff/addressing capability needs a dedicated collaboration contract even if Team-specific context composes it.
- Team definition persistence has multiple read/write paths: shared and team-local definitions use `TeamConfigRecord`; application-owned definitions have a separate config reader/writer; GraphQL maps create/update/read independently. All must agree on the handoff field.
- TeamRun metadata has a strict normalizer/parser and is rewritten on create/restore/refresh. A run-stable handoff contract therefore must be added to the metadata/config snapshot rather than re-read from mutable definitions during restore.
- No `get_handoff_rules` implementation exists. The established server-owned tool and Agent Tools MCP infrastructure used by `send_message_to` is the correct capability area to extend.
- `SubTeamMemberTeamDescriptor.representative` was not communication-only before SR-005: task roster/context mapping converted it to `TaskDelegationTeamIdentity.ingress`, and valid Team targets failed when ingress was absent. Representative removal therefore required the shared typed Team placement to carry real coordinator ingress. SR-006 keeps that configured ingress address and lets the task-owned mapper derive the direct parent and local names before pairing against the caller's canonical local `TeamRunConfig.memberTree`.
- `SendMessageToDispatcher` preserves operation codes internally, but `AutoByteusSendMessageToTool` returns message-only strings and `AgentToolsMcpResultMapper` maps operation results to message-only MCP content. Both communication tools need one canonical provider-visible envelope and dedicated code-preserving adapters.
- Current `stripMemberPathPrefix` rebases descendant `memberPath`/`memberRouteKey` but leaves nested Team `coordinatorMemberRouteKey` root/parent-prefixed. `MixedSubTeamRunFactory` separately strips only the newly created child's own coordinator key. A three-level child can therefore have a localized direct Agent route and a stale coordinator route, breaking exact task-ingress lookup.
- `delegate_task` has a second public target language today: its schema requires a caller-supplied target kind plus a flat direct-member name, its input resolver matches `memberName`, and its rendered roster advertises those names. Because task delegation and ordinary messaging both select an Agent or Team placement before applying different operations, preserving this second name authority would contradict the ticket's canonical-address goal.
- Existing focused tests explicitly assert synthetic representative and parent-boundary behavior. Those assertions become stale and must be replaced rather than retained as compatibility behavior.
- The post-implementation `MemberLogicalAddressContext` factory derives its two display strings but still accepts independently supplied `memberPath` and `immediateTeamPath`. It validates only `memberPath.length === immediateTeamPath.length + 1`; contradictory values such as `['research_team','research_lead']` plus `['another_team']` pass that check and create inconsistent logical identity.
- The post-implementation `ResolvedTeamLogicalPlacement` repeats facts already determined by its canonical address: Agent `memberRouteKey`, owner `teamPath`, one-segment `localMemberPath`, and `localMemberRouteKey`. Message delivery can derive a root selector from the effective Agent address, while task eligibility and current-local mapping can derive the target parent and basename from the same address.
- The broader pre-existing execution topology still carries `memberPath`, `memberRouteKey`, and coordinator route fields through runtime, history, event, selector, and persistence contracts. Repository evidence found these names across 78, 128, and 34 production files respectively. Removing that older execution identity system is not proportionate to this collaboration-boundary correction and requires a separate persisted-contract investigation.

See [investigation-notes.md](./investigation-notes.md) for exact paths and evidence.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| [agent-team-addressing-handoff-contract.md](./agent-team-addressing-handoff-contract.md) | Intended-behavior protocol contract with grammar, schema, mounting, canonical-address derivation, tool, examples, errors, and behavioral spans | R-001–R-031 | AC-001–AC-025 | `Refined — SR-006 user-approved; ready for architecture re-review` | Makes the normative address, minimal shared runtime shapes, and handoff behavior concrete; this requirements doc remains authoritative. |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`, `Feature`, and `Refactor`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `Shared Structure Looseness`, and `Legacy Or Compatibility Pressure`.
- Refactor posture: `Required`; SR-006 narrows the implemented shared structures before completion.
- Evidence basis: The original flat authorities are removed, but the resulting collaboration structures still preserve overlapping representations of one mounted logical placement. The caller context accepts two independently supplied path arrays, and the placement result repeats address-derived owner and selector fields. This violates the shared-structure tightness rule and permits contradictory identity without adding operation capability.
- Requirement or scope impact: Ticket 1 must retain one shared logical resolver but reduce its caller and result contracts to canonical addresses only. Existing execution/runtime/history path and route projections remain internal, non-authoritative execution data and are not normalized in this revision.

## Recommendations

1. Use the existing recursive TeamRun topology as the placement authority instead of building another member matrix.
2. Store authored AgentTeam handoffs in `team-config.json` beside members/coordinator because the edge endpoints are topology identities, not prose instructions.
3. Compile/rebase/validate one effective rooted handoff graph at TeamRun launch and persist it with run metadata.
4. Give Agent-facing communication/handoff tools one dedicated collaboration binding; let Team-specific instruction/task/token context compose that binding rather than making tools depend on a flat roster.
5. Extend the shared server-owned Agent communication/tool infrastructure once and project the same contract to AutoByteus, Codex, Claude, and Agent Tools MCP.
6. Replace, do not wrap, synthetic `subteam_representative`, `parent_boundary_agent`, `allowedRecipientNames`, and bare-name recipient behavior.
7. Before deleting representative-bearing member descriptors, make the collaboration-root logical placement resolver common to message delivery and task target selection; map its typed result into the current TeamRun's exact task-owned Agent/Team execution identity and coordinator ingress without using communication representatives.
8. Replace partial path stripping with one TeamRun-config localization boundary that recursively rebases every descendant member path/route and every nested Team coordinator route, validating exact direct-Agent coordinator identity without root/local guessing.
9. Serialize both communication tools through one `{accepted,code,message,result}` provider envelope; AutoByteus returns its JSON text, while MCP returns the same JSON text plus the same object in `structuredContent`.
10. Replace the public `delegate_task` `{target:{kind,name}}` selector cleanly with `recipient_name`; do not retain flat-name, caller-supplied-kind, or task-roster lookup fallbacks. A task roster may advertise canonical addresses but is not an address authority.
11. Keep Ticket 1 static per TeamRun. Dynamic graph refresh, member add/remove, handoff invalidation, and notifications belong to Ticket 2 AgentOrg.
12. Treat the mounted topology as the sole constructor of canonical placement addresses. Store only `{rootTeamRunId, memberAddress}` in the shared caller context; derive its parent Team, segments, and route form through the strict address domain.
13. Tighten `ResolvedTeamLogicalPlacement` to Agent `{kind,address}` or Team `{kind,address,ingressAddress}`. Derive message selectors, task direct-owner eligibility, and exact current-local member names from those addresses; do not carry a second owner or route coordinate.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large` — despite the compact product concept, the clean-cut prerequisite crosses Team definition domain/persistence/API contracts, recursive topology compilation, TeamRun metadata/restoration, Agent-facing communication context, shared tool adapters, provider prompt/tool exposure, delivery/event projection, and broad unit/E2E coverage.

## In-Scope Use Cases

| Use Case ID | Use Case |
| --- | --- |
| UC-001 | Create, read, update, and file-load an AgentTeam definition with zero or more natural-language handoff edges. |
| UC-002 | A Team-bound Agent sends to an Agent in its immediate Team using `./member`. |
| UC-003 | A Team-bound Agent sends to a nested Agent using a multi-segment relative or absolute address. |
| UC-004 | An Agent sends to an AgentTeam path, `/`, or `./`, and the Team's configured coordinator receives the message. |
| UC-005 | A nested Agent sends upward or across sibling Team branches using a root-absolute address. |
| UC-006 | Same-named Agents in different Team placements remain independently addressable by full path. |
| UC-007 | A configured Team-bound Agent calls `get_handoff_rules` and receives only its outgoing effective edges. |
| UC-008 | A reusable nested Team definition's authored handoffs are rebased and composed when mounted in a parent Team. |
| UC-009 | TeamRun termination/restoration preserves the launch-time topology/handoff snapshot. |
| UC-010 | Invalid, malformed, missing, self, or topology-inconsistent addresses fail closed without delivery/event fallback. |
| UC-011 | Existing exact live AgentRun delivery via `target_agent_run_id` remains unchanged. |
| UC-012 | AutoByteus, Codex, and Claude Team members observe equivalent logical contracts. |
| UC-013 | A Team definition and current-format historical TeamRun with no handoffs remain usable as an empty-handoff case. |
| UC-014 | A user posts to a TeamRun without an explicit target and reaches the existing root coordinator ingress. |
| UC-015 | A Team-bound Agent delegates a task to an Agent or Team placement using the same relative or absolute logical recipient address accepted by `send_message_to`; target type is derived from topology rather than supplied by the caller. |
| UC-016 | Persistent, restored, task-Agent, and task-Team members use one canonical member address as their shared logical coordinate; message and task consumers derive parent/local/selector facts without independently supplied path or owner representations. |

## Out of Scope

- Native AgentOrg definition, catalog, run, API, history, visualization, or dynamic reconciliation.
- Automatic file-system watching.
- Live mutation of active AgentTeam membership, coordinator, topology, or handoffs.
- Agent handoff-update or AgentTeam mutation tools.
- Framework/LLM-independent evaluation of natural-language rule conditions.
- Handoff-based access control; handoffs guide Agents but do not authorize delivery.
- Editing repository-owned external/pure-text Agent or AgentTeam packages, including removing hardcoded handoff prose or adding tool names there.
- Production frontend changes.
- Cross-process/distributed messaging, inactive-run inboxes, or resurrection of inactive AgentRuns.
- Changing task submission, review, settlement, exact task-run messaging, or task ownership beyond the caller's immediate Team; Ticket 1 changes the task selector/address resolution while preserving current direct-target lifecycle eligibility.
- Removing or migrating the broader pre-existing TeamRun execution/history/event `memberPath`, `memberRouteKey`, `coordinatorMemberRouteKey`, or conversation-address schemas. SR-006 removes these only from the new shared collaboration context/placement boundary; a whole-execution-topology normalization requires a separate ticket and persisted-data decision.

## Functional Requirements

- **R-001 — Definition field:** `AgentTeamDefinition` shall expose an ordered `handoffs` collection persisted as the optional top-level `handoffs` field in `team-config.json` for shared, team-local, and application-owned Team definitions.
- **R-002 — Edge shape:** Each edge shall use exactly `from: string`, `to: string`, and `rules: string[]`. Each rule is opaque natural language; the framework shall not execute or classify its meaning.
- **R-003 — Path-safe members:** Definition validation shall require non-empty trimmed member names that contain neither slash nor backslash, are not `.`/`..`, and are unique among siblings including case-insensitive collisions.
- **R-004 — Authored endpoint grammar:** Persisted handoff endpoints shall be definition-root absolute (`/` or `/segment...`) and shall reject caller-relative `./`, `../`, malformed separators, and non-canonical segments.
- **R-005 — Endpoint subjects:** `from` shall resolve to an Agent placement. `to` shall resolve to an Agent or AgentTeam placement. A Team target denotes coordinator ingress. Self-resolving edges shall be invalid.
- **R-006 — Rule and edge validation:** `rules` shall be a non-empty array of non-empty trimmed strings. Multiple outgoing targets are valid; duplicate effective `(from,to)` pairs are invalid and shall not silently merge or override.
- **R-007 — Runtime address grammar:** Team-bound `send_message_to.recipient_name` shall accept only `./`, `./segment...`, `/`, or `/segment...` according to the contract supplement.
- **R-008 — Rooted resolution:** `./` shall start at the caller's immediate Team; `/` shall start at the outermost TeamRun collaboration root. Intermediate segments shall be AgentTeams; a final Agent shall receive exact delivery and a final AgentTeam shall use coordinator ingress. Every child TeamRun configuration shall use one canonical child-local namespace for descendant member paths/routes and nested Team coordinator routes.
- **R-009 — Collaboration reachability:** Any Agent placement in one collaboration root may address any valid Agent or Team placement in that same root. Handoff edges shall not act as ACLs.
- **R-010 — Clean-cut replacement:** Bare recipient names, global leaf-name guessing, `../`, synthetic child coordinator recipient projection, coordinator-only parent reachability, and compatibility fallback to the old roster shall be removed from Team logical-address delivery.
- **R-011 — Handoff retrieval:** Add a read-only no-argument `get_handoff_rules` capability returning the caller's effective absolute `member_address` and only edges whose effective `from` equals that Agent placement inside the canonical provider-visible result envelope.
- **R-012 — Empty and failure behavior:** A Team-bound Agent with no outgoing handoffs shall receive a successful envelope whose `result.handoffs` is empty. A caller without an active Team collaboration context shall receive a rejected envelope with code `COLLABORATION_CONTEXT_REQUIRED`.
- **R-013 — Agent guidance:** When configured, runtime instructions shall explain the stable path grammar and when to call `get_handoff_rules`; they shall not copy the full natural-language handoff set into every user message or require hardcoded per-Agent handoff prose.
- **R-014 — One delivery tool:** `send_message_to` shall remain the only ordinary Agent-message delivery capability. Its `recipient_name` description, parsing, instruction, and resolution shall consistently mean hierarchical logical address.
- **R-015 — Exact-run preservation:** `target_agent_run_id` shall retain its live-only global router, mutual exclusivity with `recipient_name`, direct target-run event behavior, exclusion from Team Communication projection, and existing success/rejection codes without collaboration-code renaming.
- **R-016 — Truthful projection:** Accepted Team-route delivery shall record and display the actual source and receiving Agent placements. Team-ingress routing shall not attribute delivery to a synthetic representative.
- **R-017 — Launch compilation:** TeamRun launch shall recursively compile parent and child definition handoffs, rebase child-authored addresses under mount paths, validate the composed graph, and bind one immutable effective snapshot to every member AgentRun.
- **R-018 — Static active run:** Definition/catalog refresh after launch shall not change an active TeamRun's topology, handoffs, or collaboration binding. New launches may use the refreshed definition.
- **R-019 — Definition surfaces:** File readers/writers, cache/provider/service domain models, GraphQL output/create/update inputs, and converters shall round-trip handoffs consistently for every supported Team definition ownership scope.
- **R-020 — Restore snapshot:** Current TeamRun metadata shall persist the effective handoff snapshot and restore it without consulting current definitions for handoff meaning.
- **R-021 — Runtime parity:** AutoByteus, Codex App Server, Claude Agent SDK, and server-hosted Agent Tools MCP shall expose canonical `get_handoff_rules` and hierarchical `send_message_to` behavior through one shared server-owned contract when the corresponding tool is configured. AutoByteus JSON text and MCP text/`structuredContent` shall represent the same envelope.
- **R-022 — Coordinator-led Team entry:** TeamRun messages with no explicit member target shall continue to select the root Team's configured coordinator; AgentTeam shall continue to require a direct Agent coordinator.
- **R-023 — Shared addressing, separate task execution:** `send_message_to` and `delegate_task` shall share the same strict parser, caller-relative/root-absolute normalization, collaboration-root topology traversal, canonical placement identity, and syntax/topology failure codes. Task delegation shall separately own eligibility checks, task Agent/Team identity, coordinator ingress, task lifecycle, token scoping, and exact task-run messaging; it shall not treat handoffs as ACLs or derive identity from a communication representative. Every eligible resolved Team task target shall receive non-null `TaskDelegationTeamIngressIdentity` from its configured direct Agent coordinator in canonical topology, without root/local fallback.
- **R-024 — No external package edits:** Ticket 1 shall not edit external repository-owned Agent package Markdown/JSON or treat those package updates as an implementation prerequisite for project compilation/tests.
- **R-025 — Dedicated collaboration contract:** Agent-facing address resolution, outgoing handoff lookup, and Team-route delivery wiring shall consume one semantically tight collaboration contract. Team instruction/task/token concerns may compose it, but flat recipient projections shall not remain a parallel authority. The shared resolved placement may expose only its canonical logical address and, for a Team, exact configured ingress address; it shall not expose derived owner/path/route projections, full TeamRun configs, or static template/snapshot run identity as the active task-scoped owner.
- **R-026 — Error integrity:** Syntax, topology traversal, missing target, self target, invalid Team ingress, duplicate edge, and missing collaboration context shall produce distinguishable typed failures; rejected attempts shall not deliver recipient input or emit accepted Team Communication. Public AutoByteus and MCP results for both communication tools shall expose required `accepted`, `code`, `message`, and `result` fields; adapters shall preserve an internal operation code exactly and use a documented fallback only when the internal result omitted one.
- **R-027 — Hierarchical task recipient selector:** `delegate_task` shall accept one required `recipient_name` string using exactly the R-007 grammar and shall remove the public `{target:{kind,name}}` selector. Resolution shall infer Agent versus Team from the same canonical placement returned for `send_message_to`. After shared resolution, existing task eligibility remains separately enforced: the placement must be a direct physical Agent or direct child Team of the caller's immediate Team, and the caller Agent remains ineligible. An eligible Agent starts task-Agent execution; an eligible Team starts task-Team execution through real coordinator ingress. A resolved non-direct placement fails with `TASK_DELEGATION_TARGET_NOT_ELIGIBLE`, without name fallback, caller-supplied kind, or a separate task roster authority.
- **R-028 — One canonical logical address:** Once the reusable definition graph is mounted for a TeamRun, each Team or Agent placement shall have exactly one canonical absolute collaboration address. Root-relative or caller-relative strings are request expressions only; `./...` shall be resolved immediately to the canonical absolute address and shall not be stored as a second identity.
- **R-029 — Minimal caller coordinate:** `MemberLogicalAddressContext` shall contain exactly `rootTeamRunId` and the caller's canonical absolute Agent `memberAddress`. It shall not store or accept independent `memberPath`, `immediateTeamPath`, `immediateTeamAddress`, route-key, owner, target, handoff, or operation fields. The collaboration address domain shall derive segments, basename, parent Team address/path, and selector form from `memberAddress`.
- **R-030 — Minimal shared placement:** The one result shared by `send_message_to` and `delegate_task` shall be exactly Agent `{kind:"agent", address}` or Team `{kind:"team", address, ingressAddress}`. `address` and `ingressAddress` are canonical absolute logical addresses. The result shall not carry subject wrappers, owner coordinates, member paths, route keys, configs, handles, provider/runtime settings, definition IDs, or run/member/task lifecycle identities.
- **R-031 — Derived operation mapping:** Message delivery shall derive its private root member selector from the resolved effective Agent address. Task delegation shall derive the caller Team and target owner Team with `parentAddress`, derive the direct target name with `basename`, and require exact equality of those canonical parent addresses before matching exactly one direct current-local config of the resolved kind. A Team task target shall additionally require `parentAddress(ingressAddress) === team.address` and exactly one configured direct Agent ingress matching `basename(ingressAddress)`. No consumer may retry root/local shapes, search globally by leaf name, or reconstruct a parallel owner coordinate.

## Acceptance Criteria

- **AC-001:** A file-authored shared Team with valid `handoffs` loads with unchanged `from`, `to`, rule order, and rule text; create/update writes the canonical field.
- **AC-002:** Team-local and application-owned Team definition read/write paths preserve the same handoff shape, including GraphQL read/update round trips.
- **AC-003:** Definition validation rejects unsafe path segment names, invalid endpoint grammar, Team-valued `from`, missing endpoints, blank rules, self-resolving edges, and duplicate effective pairs with actionable errors.
- **AC-004:** A Team definition with multiple outgoing edges and multiple alternative rule strings on one edge is accepted and preserves their order.
- **AC-005:** Nested child-authored edges rebase under every mount path; a parent-authored cross-child edge composes with them; a collision in the effective graph blocks launch rather than choosing precedence.
- **AC-006:** From `/product_manager`, `recipient_name: "./research_team/field_team/interviewer"` delivers exactly once to that Agent.
- **AC-007:** From `/research_team/field_team/interviewer`, `recipient_name: "/product_manager"` and a valid absolute sibling-branch path deliver exactly once without coordinator projection.
- **AC-008:** `recipient_name: "./research_team"`, `recipient_name: "./"`, and `recipient_name: "/"` each resolve to the relevant Team's real configured coordinator Agent, with no fake recipient identity.
- **AC-009:** Two leaf Agents named `team_lead` under different Team paths are independently reachable by full path and never rejected merely because the leaf names match.
- **AC-010:** Bare names, `../`, repeated/trailing separators, backslashes, missing segments, Agent-as-intermediate, and self targets are rejected with no recipient input and no accepted communication event.
- **AC-011:** A non-coordinator Agent inside a nested Team can send to any valid root/sibling destination; parent reachability is not restricted to the child coordinator.
- **AC-012:** `get_handoff_rules` for a source Agent returns `{accepted:true,code:"HANDOFF_RULES_RETRIEVED",message,result:{member_address,handoffs}}`, where `handoffs` contains only that source's effective outgoing `{from,to,rules}` edges; it returns `handoffs: []` successfully for a source with none and returns `{accepted:false,code:"COLLABORATION_CONTEXT_REQUIRED",message,result:null}` for a non-Team caller.
- **AC-013:** Team member prompt/tool metadata states the current absolute Agent path, immediate Team path, `/`/`./` grammar, Team-ingress behavior, and read-before-handoff protocol without rendering the full handoff rule set inline.
- **AC-014:** Create -> communicate -> terminate -> restore -> retrieve rules -> communicate preserves the same effective handoff snapshot and addresses even if the underlying definition was edited between terminate and restore.
- **AC-015:** Existing accepted and rejected `target_agent_run_id` scenarios retain their current routing/event behavior and operation codes, expose those codes unchanged in the canonical public envelope, and do not enter hierarchical Team resolution.
- **AC-016:** Existing Team definitions without `handoffs` load as empty without a data migration or file rewrite.
- **AC-017:** Existing current-format TeamRun metadata without a handoff snapshot remains readable and restores with an empty snapshot rather than recompiling current definition handoffs.
- **AC-018:** Existing Team default coordinator entry and task delegation lifecycle tests continue to pass except assertions explicitly tied to removed flat target addressing or communication representatives. In a three-level root -> persistent child -> nested child scenario, create and restore (and task-child creation through the same factory) recursively localize the nested Team coordinator route to exactly match its direct Agent in that context; a valid `delegate_task({recipient_name:"./field_team",...})` receives that Agent as non-null task ingress after all representative descriptors and fallbacks are removed.
- **AC-019:** AutoByteus, Codex, and Claude adapter-level or live coverage demonstrates the same configured tool names, canonical envelope fields, exact code/message/result values, address resolution, delivery result, and typed rejection semantics. MCP text must parse to the same object as `structuredContent`, and AutoByteus JSON text must parse to that object.
- **AC-020:** Posting a user message to a TeamRun with no target still reaches its root coordinator.
- **AC-021:** Project docs describing AgentTeam communication, Agent tools/MCP, Team definition files, and run metadata reflect the new contract; external Agent package prose is explicitly excluded.
- **AC-022:** From `/research_team/research_lead`, `delegate_task({recipient_name:"./field_team",...})` and `send_message_to({recipient_name:"./field_team"})` resolve the same `/research_team/field_team` Team placement; task delegation starts one task-Team through `/research_team/field_team/field_lead`. Delegating to a direct Agent by relative or equivalent absolute address resolves the same Agent placement and starts one task-Agent. A syntactically valid cross-branch or deeper non-direct address is resolved by the common topology but rejected as `TASK_DELEGATION_TARGET_NOT_ELIGIBLE`. Bare names, caller-supplied `kind`, malformed/missing paths, and the caller Agent are rejected before activation with no flat-name fallback.
- **AC-023:** Every persistent, restored, task-Agent, and task-Team caller collaboration context has the exhaustive shape `{rootTeamRunId, memberAddress}`. For `/research_team/research_lead`, shared address functions derive `['research_team','research_lead']`, parent `/research_team`, basename `research_lead`, and route key `research_team/research_lead`; no independently supplied path can contradict the canonical address.
- **AC-024:** For equivalent absolute and relative inputs, both message and task paths receive byte-for-byte/deep-equal minimal placements: Agent `{kind:"agent",address:"/research_team/analyst"}` or Team `{kind:"team",address:"/research_team/field_team",ingressAddress:"/research_team/field_team/field_lead"}`. Tests prove the absence of `subject`, `owner`, `memberPath`, `memberRouteKey`, config, handle, and lifecycle fields.
- **AC-025:** Direct Agent and child-Team task activation, cross-branch/deeper task rejection, nested/upward/cross-branch message delivery, Team-ingress self rejection, instructions, `get_handoff_rules`, exact-run messaging, events, restoration, and provider envelopes retain their approved observable results after every collaboration-context and placement consumer derives its needed path/selector/owner fact from canonical addresses.

## Constraints / Dependencies

- Bootstrap base is fresh `origin/personal` commit `2a7271c9d78b71b919f7dbfa3b8f97f61c3a2e2b` as of 2026-08-03.
- Existing AgentRun and AgentTeamRun lifecycle, lazy nested Team startup, event conversion, Team Communication projection, task delegation, and token/memory identity must remain truthfully owned.
- Existing `memberPath`/`memberRouteKey` execution infrastructure remains a non-authoritative internal projection for runtime/history/event consumers in SR-006. The collaboration boundary shall neither copy those fields into its context/result nor create a second topology representation.
- Tool exposure remains configuration-gated, matching current server-owned Agent tool policy. External packages that want `get_handoff_rules` must add it in their separate package change.
- The same strict logical-address domain and rooted placement resolver must serve `send_message_to` and `delegate_task`; operation-specific delivery or task activation code may consume the typed placement but may not parse or reinterpret the address independently.
- Ticket 2 AgentOrg should be able to reuse the canonical address/edge/tool contracts, but Ticket 1 shall contain no AgentOrg domain dependency.
- Clean-cut behavior change is preferred over compatibility wrappers; old bare-name and representative tests are expected to become stale.

## Persisted Data Outcome (When Applicable)

- Stored subject / location:
  - AgentTeam `team-config.json` under shared, team-local, and application-owned sources.
  - TeamRun `team_run_metadata.json` under server memory run history.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine:
  - Missing definition `handoffs` normalizes to `[]`.
  - Missing current-format run snapshot normalizes to `[]`.
  - New definition and run writes persist canonical arrays.
  - No historical topology/member/run identity may be rewritten or re-derived.
  - SR-006 changes only ephemeral in-process collaboration caller/placement values; it does not change Team definition JSON, TeamRun metadata, task record files, or public history/event schemas.
- Unacceptable data loss or corruption:
  - Dropping authored handoffs during update/write.
  - Rebinding a restored historical run to newer definition rules.
  - Routing to the wrong same-named placement.
  - Duplicated recipient input/events or attribution to a synthetic member.
- Relevant availability, maintenance-window, or rollout constraints: No maintenance window or bulk migration is required. Active TeamRuns remain on their existing launch snapshot; newly launched runs use new semantics.
- Related requirement and acceptance-criteria IDs: R-001, R-017–R-020; AC-001, AC-002, AC-014, AC-016, AC-017.

## Assumptions

- “Ticket 1” is the AgentTeam-only prerequisite in this document; “Ticket 2” is the later native dynamic AgentOrg effort.
- Filesystem-like paths are logical in-memory/runtime identities, not operating-system filesystem access.
- Handoff rules are LLM-readable guidance and not deterministic boolean expressions.
- A Team target means coordinator ingress; it does not mean broadcast.
- The outermost standalone TeamRun is `/`; the root Team's direct members are `/member`, not `/team_name/member`.
- A reusable nested Team definition authors addresses from its own `/` and receives a mount prefix when composed.
- The final solution design may choose exact class/file names, but it must preserve the behavioral owner/boundary and clean-cut constraints stated here.

## Risks / Open Questions

- The current `MemberTeamContext` also supports task/token/managed-runtime data, and its representative field feeds task-Team ingress. The receiving team must first make child TeamRun localization recursively canonical, then map the shared typed placement into task-owned identity/ingress before removing generic member/representative data. Neither the localization owner nor task mapper may guess between parent-prefixed and local coordinator keys.
- Shared root addressing can resolve cross-branch and deeper placements that current task lifecycle does not own. Ticket 1 must keep this as an explicit post-resolution eligibility rejection rather than silently expanding task activation across TeamRun managers; cross-Team task ownership expansion is separate product scope.
- Nested TeamRuns currently strip the parent prefix and use a parent-boundary bridge. The design must choose one root-aware resolving owner while retaining lazy nested execution and truthful event addresses.
- Current run metadata schema has a previous explicit legacy upgrade boundary. The new optional snapshot must remain compatible with the current recursive format without reviving unsupported flat schemas.
- Provider prompt lifecycles differ: AutoByteus and Codex bootstrap instructions differently from Claude per-turn input composition. Rule content must stay tool-retrieved even if stable protocol text is rendered at provider-appropriate times.
- External packages will temporarily retain old prose/tool configuration until their separate change. Ticket 1 intentionally provides no runtime fallback for their bare recipient names.
- The broader TeamRun execution model still duplicates recursive containment as persisted member paths/routes and coordinator routes. That cleanup is intentionally not hidden inside SR-006: it spans runtime selection, history, status/events, conversation addresses, task identities, and stored metadata, and needs its own investigation and transition decision.

## Requirement-To-Use-Case Coverage

| Use Case ID | Requirement IDs |
| --- | --- |
| UC-001 | R-001–R-006, R-019, R-024 |
| UC-002 | R-007–R-010, R-014, R-016 |
| UC-003 | R-007–R-010, R-014, R-016 |
| UC-004 | R-005, R-008, R-016, R-022 |
| UC-005 | R-008–R-010, R-014, R-016, R-025 |
| UC-006 | R-003, R-007–R-009 |
| UC-007 | R-011–R-013, R-021, R-025 |
| UC-008 | R-004–R-006, R-017–R-020 |
| UC-009 | R-017, R-018, R-020 |
| UC-010 | R-003–R-008, R-010, R-026 |
| UC-011 | R-014, R-015 |
| UC-012 | R-013, R-014, R-021 |
| UC-013 | R-018–R-020 |
| UC-014 | R-022 |
| UC-015 | R-007–R-009, R-023, R-027 |
| UC-016 | R-028–R-031 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001–AC-005 | Definition contract, validation, nested compilation, and persistence coverage. |
| AC-006–AC-011 | Logical address happy paths, Team ingress, same-name disambiguation, cross-boundary reachability, and fail-closed negative coverage. |
| AC-012–AC-013 | Handoff tool response and LLM-facing protocol coverage. |
| AC-014, AC-016, AC-017 | TeamRun snapshot, restoration, and no-migration compatibility coverage. |
| AC-015 | Exact-run route regression coverage. |
| AC-018, AC-020 | Preserved Team coordinator and task lifecycle coverage. |
| AC-019 | Cross-runtime adapter/live parity coverage. |
| AC-021 | Durable project documentation coverage. |
| AC-022 | Shared message/task address parsing and placement resolution, direct-target task activation, non-direct/cross-branch task rejection, Team ingress, and clean-cut selector removal. |
| AC-023–AC-025 | Minimal caller/placement shapes, deterministic address derivation, construction-path coverage, and preserved message/task/handoff/provider behavior. |

## Approval Status

`Refined — SR-006 user-approved; ready for architecture re-review.` The user explicitly approved the two-ticket split and the core Ticket 1 contract: root/relative slash addressing, one consistent model for standalone and nested AgentTeams, truthful Team paths instead of fake representatives, unchanged `from`/`to` handoff endpoints with natural-language `rules`, sender-only retrieval through `get_handoff_rules`, and a static AgentTeam foundation for later dynamic AgentOrg reuse. SR-004 established that message and task selection share one address model, and SR-005 passed architecture review with a coordinate-only common placement. During final verification, the user further established that the mounted topology deterministically decides one canonical address and every path/parent/route/owner representation is derived. SR-006 applies that principle to the shared data structures. The user approved SR-006 and authorized architecture re-review, while explicitly deferring the larger whole-execution path/route normalization to a separate future phase.
