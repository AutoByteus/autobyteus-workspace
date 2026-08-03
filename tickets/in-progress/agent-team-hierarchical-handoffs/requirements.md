# AgentTeam Hierarchical Communication And Handoffs — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — the user-approved Ticket 1 behavior basis has been validated against the current code and remains the locked input to [design-spec.md](./design-spec.md). SR-004 established the user's clarified shared `send_message_to` / `delegate_task` recipient-address model. SR-005 tightens only the internal shared placement boundary after `ARCH-REV-003`; approved behavior is unchanged, architecture re-review is pending, and implementation has not started.

## Goal / Problem Statement

Replace AgentTeam's flat, coordinator-projection-based Agent communication model with one truthful hierarchical addressing and handoff model that works consistently for standalone and recursively nested AgentTeams.

Ticket 1 must give a Team-bound Agent:

1. deterministic filesystem-like addresses for Agent and AgentTeam placements;
2. a reusable natural-language `{from, to, rules}` handoff definition owned by AgentTeam;
3. a read-only `get_handoff_rules` tool that returns only the caller's outgoing effective rules; and
4. one consistent `send_message_to` Team route across AutoByteus, Codex, and Claude; and
5. the same `/...` and `./...` recipient-address model for `delegate_task`, with task execution semantics applied only after the common address resolves to an Agent or Team placement.

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

## Investigation Findings

- The production TeamRun topology is already recursive: `TeamDefinitionTopologyPlanner` creates `memberPath`/`memberRouteKey`, `TeamRunConfig` persists a recursive `memberTree`, and nested Team handles traverse it.
- Model-facing logical communication is nevertheless flat. `MemberCommunicationRosterBuilder` exposes direct Agents, synthetic child coordinators, and a restricted parent boundary; `TeamMessageRecipientResolver` resolves `recipient_name` against that projection.
- The flat projection is duplicated across member bootstrap/context construction and delivery resolution, which risks prompt and runtime disagreement.
- `MemberTeamContext` currently mixes Team instruction, task/token identity, flat recipient projection, and delivery wiring. The new reusable handoff/addressing capability needs a dedicated collaboration contract even if Team-specific context composes it.
- Team definition persistence has multiple read/write paths: shared and team-local definitions use `TeamConfigRecord`; application-owned definitions have a separate config reader/writer; GraphQL maps create/update/read independently. All must agree on the handoff field.
- TeamRun metadata has a strict normalizer/parser and is rewritten on create/restore/refresh. A run-stable handoff contract therefore must be added to the metadata/config snapshot rather than re-read from mutable definitions during restore.
- No `get_handoff_rules` implementation exists. The established server-owned tool and Agent Tools MCP infrastructure used by `send_message_to` is the correct capability area to extend.
- `SubTeamMemberTeamDescriptor.representative` is not communication-only today: task roster/context mapping converts it to `TaskDelegationTeamIdentity.ingress`, and valid Team targets fail when ingress is absent. Representative removal therefore requires the shared typed Team placement to carry real coordinator ingress plus a task-owned mapper that pairs its owner-local route with the caller's canonical local `TeamRunConfig.memberTree`.
- `SendMessageToDispatcher` preserves operation codes internally, but `AutoByteusSendMessageToTool` returns message-only strings and `AgentToolsMcpResultMapper` maps operation results to message-only MCP content. Both communication tools need one canonical provider-visible envelope and dedicated code-preserving adapters.
- Current `stripMemberPathPrefix` rebases descendant `memberPath`/`memberRouteKey` but leaves nested Team `coordinatorMemberRouteKey` root/parent-prefixed. `MixedSubTeamRunFactory` separately strips only the newly created child's own coordinator key. A three-level child can therefore have a localized direct Agent route and a stale coordinator route, breaking exact task-ingress lookup.
- `delegate_task` has a second public target language today: its schema requires a caller-supplied target kind plus a flat direct-member name, its input resolver matches `memberName`, and its rendered roster advertises those names. Because task delegation and ordinary messaging both select an Agent or Team placement before applying different operations, preserving this second name authority would contradict the ticket's canonical-address goal.
- Existing focused tests explicitly assert synthetic representative and parent-boundary behavior. Those assertions become stale and must be replaced rather than retained as compatibility behavior.

See [investigation-notes.md](./investigation-notes.md) for exact paths and evidence.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| [agent-team-addressing-handoff-contract.md](./agent-team-addressing-handoff-contract.md) | Intended-behavior protocol contract with grammar, schema, mounting, tool, examples, errors, and behavioral spans | R-001–R-027 | AC-001–AC-022 | `Design-ready`; user-approved through SR-004 and boundary-aligned in SR-005 | Makes the normative address and handoff behavior concrete; this requirements doc remains authoritative. |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`, `Feature`, and `Refactor`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `Shared Structure Looseness`, and `Legacy Or Compatibility Pressure`.
- Refactor posture: `Likely Needed`.
- Evidence basis: A truthful recursive topology already exists, but Agent-facing instructions and delivery resolve a second flat projection assembled independently in `MemberTeamContextBuilder` and `TeamMessageRecipientResolver`. Child coordinator projection and coordinator-only parent reachability are workarounds for the flat boundary. Adding handoffs directly to that roster would preserve two address authorities.
- Requirement or scope impact: Ticket 1 must replace the flat logical-recipient authority cleanly, create one reusable collaboration-facing contract, and remove synthetic recipient behavior. It must not retain bare-name fallback or introduce AgentOrg types.

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
- **R-025 — Dedicated collaboration contract:** Agent-facing address resolution, outgoing handoff lookup, and Team-route delivery wiring shall consume one semantically tight collaboration contract. Team instruction/task/token concerns may compose it, but flat recipient projections shall not remain a parallel authority. A shared resolved placement may expose canonical logical coordinates, exact Team ingress, and owner-local pairing only; it shall not expose full TeamRun configs or label static template/snapshot run identity as the active task-scoped owner.
- **R-026 — Error integrity:** Syntax, topology traversal, missing target, self target, invalid Team ingress, duplicate edge, and missing collaboration context shall produce distinguishable typed failures; rejected attempts shall not deliver recipient input or emit accepted Team Communication. Public AutoByteus and MCP results for both communication tools shall expose required `accepted`, `code`, `message`, and `result` fields; adapters shall preserve an internal operation code exactly and use a documented fallback only when the internal result omitted one.
- **R-027 — Hierarchical task recipient selector:** `delegate_task` shall accept one required `recipient_name` string using exactly the R-007 grammar and shall remove the public `{target:{kind,name}}` selector. Resolution shall infer Agent versus Team from the same canonical placement returned for `send_message_to`. After shared resolution, existing task eligibility remains separately enforced: the placement must be a direct physical Agent or direct child Team of the caller's immediate Team, and the caller Agent remains ineligible. An eligible Agent starts task-Agent execution; an eligible Team starts task-Team execution through real coordinator ingress. A resolved non-direct placement fails with `TASK_DELEGATION_TARGET_NOT_ELIGIBLE`, without name fallback, caller-supplied kind, or a separate task roster authority.

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

## Constraints / Dependencies

- Bootstrap base is fresh `origin/personal` commit `2a7271c9d78b71b919f7dbfa3b8f97f61c3a2e2b` as of 2026-08-03.
- Existing AgentRun and AgentTeamRun lifecycle, lazy nested Team startup, event conversion, Team Communication projection, task delegation, and token/memory identity must remain truthfully owned.
- Existing `memberPath`/`memberRouteKey` infrastructure should be reused/tightened rather than replaced with a second graph representation.
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

## Approval Status

`Approved / Design-ready.` The user explicitly approved the two-ticket split and the core Ticket 1 contract: root/relative slash addressing, one consistent model for standalone and nested AgentTeams, truthful Team paths instead of fake representatives, unchanged `from`/`to` handoff endpoints with natural-language `rules`, sender-only retrieval through `get_handoff_rules`, and a static AgentTeam foundation for later dynamic AgentOrg reuse. SR-002 clarified the typed-result and task-owned ingress boundaries; SR-003 corrected the supporting recursive TeamRun localization invariant. In SR-004 the user explicitly clarified that selecting a task recipient and selecting a message recipient must use the same canonical logical addressing model. That clarification is approved behavior and supersedes the prior direct-name task selector design. SR-005 narrows only the implementation-facing placement value per `DR-003`; it does not change the approved address, handoff, or task behavior basis.
