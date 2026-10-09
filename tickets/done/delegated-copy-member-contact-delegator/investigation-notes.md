# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-copy-member-contact-delegator`
- Request / ticket: Project Task `project_task_a7fe75d1-31a4-4819-9706-59a76aaa1dc2`. Delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-09.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator`, branch `codex/delegated-copy-member-contact-delegator`
- Resolved base remote / branch / revision: `origin/personal` @ `a573465d93bf66976c0bc0041e757d418e21ecb4` (fetched 2026-10-09; `origin` HEAD branch is `personal`; includes merged `delegated-team-member-lazy-activation`, `9d28c1b17`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created successfully; ticket folder `tickets/in-progress/delegated-copy-member-contact-delegator/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-005`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-09)
- Investigation status: requirements-level investigation complete; architecture-level investigation pending approval

## Initial Request And Clarifications

- Original request: members of a delegated team copy cannot reach the agent that delegated the work. The Project Task Manager (PM) is missing from their `@` menu, and they don't know its address or run ID. Tasks: explain the cause and whether it was intended (including Org roots and Agent-run task children), settle the contact rule with the user, then implement it consistently.
- User-supplied facts (2026-10-08, desktop app, screenshot `ctx_db53e6342739__9.png`): the PM delegated to the Software Engineering Team (copy under the PM's run). The code reviewer's `@` menu lacks the PM. The code reviewer did not know the PM's address/run ID. The workaround was code reviewer → Solution Designer → PM.
- Initial ambiguity: the product rule (any member vs. coordinator only vs. members with coordinator informed); whether an address/mention from inside the copy reaches the existing PM run.

## Product And Domain Understanding

- Product area: collaboration roots (standalone Agent run root, Team run root, Agent Org root), task copies (`delegate_task`), `@` mention candidates, `send_message_to` addressing, `list_available_agents`, member system prompts.
- Terminology: **host** = the agent of a standalone Agent run root (here the PM). **Task copy** = a copy spawned by `delegate_task` (Agent or Team). **Delegator** = the AgentRun that called `delegate_task` for a copy (recorded as `delegatorAgentRunId`). **Focused agent** = the agent whose composer the user is typing in.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | User | screenshot `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_a7fe75d1-31a4-4819-9706-59a76aaa1dc2/context/ctx_db53e6342739__9.png` | Reported state | PM run hosts 3 Software Engineering Team copies and a Product Team copy at root level. The code reviewer composer is focused. | — |
| 2026-10-09 | Code | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` | `@` and catalog eligibility owner | `listCandidates`, `requireEligible`, `catalogView`/`listEligible` all exclude `port.rootDefinition()`, which is the **root's** definition, not the focused agent's. | F-01 |
| 2026-10-09 | Code | `standalone-agent-run-root/services/standalone-root-collaborators.ts` (`standaloneRootCollaboratorPortFor`) | Agent-root port | `rootDefinition` = host agent definition. `inRunPlacementsByDefinition` = collaborators only, so the host is not an in-run placement. | F-01, F-04 |
| 2026-10-09 | Code | `agent-team-execution/services/team-run-collaborators.ts:28`; `agent-org-execution/services/agent-org-run-collaborators.ts:40` | Team/Org ports | Team root: `rootDefinition` = root Team definition; configured members are in-run placements. Org root: `rootDefinition` = `null`. | F-05, F-06 |
| 2026-10-09 | Code | `autobyteus-web/composables/agentInput/runMentionScope.ts` | Web `@` scope | `agent_run_task_agent` / `agent_run_task_team_member` use `rootKind: 'agent', rootRunId: host.hostRunId`. Candidates are fetched per **root** (`collaboratorCandidatesService` key `rootKind:rootRunId`); the focused agent is not sent. | F-01 |
| 2026-10-09 | Code | `api/graphql/types/agent-run-collaboration.ts` `collaboratorMentionCandidates(rootSubjectKind, rootRunId)` | Query shape | No focused-agent argument. | F-01 |
| 2026-10-09 | Code | `services/agent-streaming/agent-collaboration-stream-handler.ts` SEND_MESSAGE; `standalone-root-message-delivery.ts` `resolveMentions` | Send-time mention re-check | Focused run ID is checked for membership only; `collaborators.resolveMentions(mentions)` re-checks against the root's own definition, so `@PM` from a copy member is rejected with "Project Task Manager is this run's own definition." | F-02 |
| 2026-10-09 | Code | `collaborators/message-recipient-resolution.ts` `resolveMessageRecipient`; `standalone-root-execution-index.ts` `getMessagePlacement` | Address resolution | Order: (1) sender's own Team instances, (2) Task helper, (3) run-wide placement, where the Agent-root index returns the **host** for the host address, (4) bring-in. `send_message_to /project_task_manager` from a copy member resolves at step 3 to the existing host run; no new instance. | F-03 |
| 2026-10-09 | Code | `standalone-host-member-context-builder.ts` `resolveHostAddress` | Host address | Host address = stored package address, else `/<slug of definition name>` → `/project_task_manager`. | F-03 |
| 2026-10-09 | Code | `standalone-root-recipient-resolver.ts` `resolveInRunDelegationPlacement`; `collaborators/catalog-delegation.ts` | `delegate_task` to the host | Host address is refused as a delegation placement and has no catalog address (address in use, own definition excluded), so the result is not-found. No PM copy is created. | F-03 |
| 2026-10-09 | Code | `standalone-root-message-delivery.ts` `deliverToRunId` | Run-ID messaging | Any AgentRun in the root index (host included) accepts `send_message_to(target_agent_run_id)`. | F-03 |
| 2026-10-09 | Code | `agent-collaboration/execution/task/task-execution-input.ts` `buildTaskAssigneeWorkPacket` | Who learns the delegator | Only the copy's first message, delivered to the coordinator (Team copy) or the Agent copy, carries `Task delegator address` / `Task delegator AgentRun ID`. | F-07 |
| 2026-10-09 | Code | `agent-team-execution/services/member-collaboration-instruction-renderer.ts`; `agent-execution/prompt/carpenter-prompt-composer.ts`; `standalone-root-builder.ts` `buildChildContext` | Member prompt | Member prompts contain the addressing model, own address and Team instruction. Nothing about the copy's delegator. | F-07 |
| 2026-10-09 | Code | `run-history/domain/run-execution-tree-shared-records.ts:55-89` | Delegator persisted? | `TaskAgentExecution`/`TaskTeamExecution.delegatorAgentRunId?` is written for every new child. Children recorded before it existed have none. | F-07 |
| 2026-10-09 | Code | `agent-collaboration/execution/task/task-copy-host.ts` | Nested copy placement | A copy is hosted inside the delegator's Team instance only when the target address is a teammate. A catalog Team/Agent delegated by a copy member is hosted at the **root**. | F-08 |
| 2026-10-09 | Doc | `tickets/done/mention-candidates-in-run/requirements-doc.md` lines 11, 38, 52 | Was the exclusion intended? | The run's own definition was kept excluded on purpose: "mentioning it would target the run itself, which self-delegation already rejects". "Excluding the focused member's own definition per focused agent (candidates stay per run)" was explicitly **out of scope** then. | F-04 |
| 2026-10-09 | Test | `tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts:103,137`; `tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts:255,432`; `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts:396-401`; `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts:514` | Current guarded behavior | Tests assert that the standalone host's own definition is never a candidate or listed. None covers a task-child focus. | Update with design |
| 2026-10-09 | Contract | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | What an `@` tells the focused agent | Note guidance says "Delegate the work with delegate_task to its address …". For in-run entries it adds "can instead be messaged directly with send_message_to". `delegate_task` to the host is refused (F-03). | Design detail |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User types `@` in a task-copy member's composer in a standalone Agent run | Web fetches the candidates of the **host root**; the server excludes the root's own definition (the host's) | The delegating host (PM) is never offered to any member of any copy under it | F-01 | High (code) |
| BEH-002 | User | User sends a message with a mention of the host definition from a task child (e.g. stale client) | Server re-checks against the root's own definition | Rejected `COLLABORATOR_ADD_FAILED`: "… is this run's own definition." | F-02 | High (code) |
| BEH-003 | Contract | Copy member calls `send_message_to(recipient_address=/project_task_manager)` | Resolution step 3 → host placement | Reaches the **existing** PM run. No new instance. Only works if the member knows the address. | F-03; the Solution Designer → PM workaround in the report took this route | High (code), Medium (runtime) |
| BEH-004 | Contract | Copy member calls `send_message_to(target_agent_run_id=<PM run>)` | `deliverToRunId` | Reaches the existing PM run. Only works if the member knows the run ID. | F-03 | High (code) |
| BEH-005 | Contract | Copy member calls `list_available_agents` | Catalog view minus root's own definition | The host is not listed, so a member cannot discover the PM's address | F-01 | High (code) |
| BEH-006 | Contract | Copy is delegated | Work packet to coordinator / Agent copy only | Other members never receive the delegator's address or run ID; their prompt doesn't name it | F-07 | High (code) |
| BEH-007 | User | `@` in a Team-root or Org-root task-copy member composer | Root candidates; a configured delegator is an in-run placement | A configured delegator **is** offered and resolves to its existing configured address. Team root excludes only the root Team definition; Org root excludes nothing. | F-05, F-06 | High (code) |
| BEH-008 | User | `@` in any member composer (Team/Org roots) or task child | Candidates per root | The focused agent's **own** definition is offered (self-mention possible) except for the Agent-root host | F-01, F-04 | High (code) |
| BEH-009 | Contract | Member of a copy delegated by a copy member (nested delegator, e.g. Product Team copy delegated by `/software_engineering_team/solution_designer`) | Nested copy hosted at the root (F-08). The delegator's address belongs to a task copy (not a placement) and may be duplicated across parallel copies (screenshot: 3 SE team copies at `/software_engineering_team`). | Address messaging to the nested delegator fails as not-found (no new copy). `@` of its definition resolves to the **catalog address** and would bring in a **new** collaborator. Only the run ID identifies the delegator exactly. | F-03, F-08 | High (code) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `collaborator-candidate-policy.ts` | Single owner of `@`/catalog eligibility; excludes root's own definition | Exclusion must become focused-agent-aware | Pass focused agent identity into `listCandidates`/`requireEligible`/`listEligible`; keep the Team-root "root Team definition" exclusion? |
| `standaloneRootCollaboratorPortFor` | Host is not an in-run placement | Host must resolve to its existing address when mentioned/listed by a non-host | Add host as a placement (rank `configured`) at host address? |
| `collaboratorMentionCandidates` GraphQL + `collaboratorCandidatesService` + `runMentionScope` | Per-root query/cache | Menu must depend on focused agent | Add focused AgentRun ID argument; cache key per focused agent |
| `resolveMessageRecipient` | Already resolves the host address to the existing host for any sender | Preserve | Regression test from task-copy member |
| `buildTaskAssigneeWorkPacket` / member prompt composer / `delegatorAgentRunId` | Delegator known to the copy record and coordinator only | Members need delegator address + run ID | Prompt section from the copy record? Legacy copies without `delegatorAgentRunId`? |
| `collaborator-mention-note.ts` | Note recommends `delegate_task`, offers `send_message_to` for in-run | Mention of the delegator must lead to a message to the existing run, not a refused delegation | Note wording/marker for a non-delegatable in-run entry; parser compatibility with saved notes |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Mention note text (shared contract package, parsed by web for saved history).
- Member system prompt sections.
- Evidence paths: see Source Log.

### Structural Surfaces

- GraphQL `collaboratorMentionCandidates` (web ↔ server contract).
- `CollaboratorRootPort` (Agent/Team/Org roots), `CollaboratorCandidatePolicy`, `CollaboratorAdmission.resolveMentions`.
- Stream SEND_MESSAGE mention re-check (Agent, Team, Org stream handlers).

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes. GraphQL query argument; possibly the mention-note wording.
- Persistence schema or invariant change: None expected. `delegatorAgentRunId` already persisted. Legacy children lack it.
- Security or privacy boundary change: No. Messaging stays inside one root, which run-ID messaging already allows.
- Concurrency or lifecycle change: No new lifecycle. Host activation on message already exists ("a message to a host that is not running makes it ready first").
- Deployment/migration/ownership: No.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| User report (desktop) | Code reviewer in SE team copy under PM | `@` lacks PM. Relay via coordinator works. | Confirms BEH-001, BEH-006 | screenshot above |
| This conversation | Solution Designer (copy coordinator) received `Task delegator address: /project_task_manager` and run ID in its first message | Matches F-07 | BEH-006 | task first message |

No live probe was run at the requirements stage. Runtime verification of BEH-003 from a non-coordinator member is planned for validation.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via PM task) | Code reviewer should ask the PM directly to create a follow-up ticket | Strong (observed) | Direct member→delegator contact | Rule A/B/C (DEC-001) |
| User | Didn't understand why only the coordinator could reach the PM | Strong | The rule must be explicit and consistent across roots | — |

## External Contracts, Standards, And Dependencies

N/A, all internal.

## Persisted Data And State Facts

- Affected stored subject: none written newly. Read: `delegatorAgentRunId` on task execution records.
- Legacy: children recorded before `delegatorAgentRunId` existed have none. Their members cannot be told the delegator (acceptable degradation, see requirements).
- Acceptable loss: none needed.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A, not requested.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| screenshot `ctx_db53e6342739__9.png` (path above) | User / PM | Reported symptom | Evidence | BEH-001 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-01 | Unknown | Prompt parity across runtimes | — | No prompt change after SR-002 | Closed: not applicable |
| R-01 | Risk | Changing per-root candidate cache to per-focused-agent adds queries | Minor latency | Design | Open |
| R-02 | Risk | Nested delegator (BEH-009): `@` resolves to a catalog bring-in (new instance) | Out of scope (SR-002) | DEC-002 | Closed: out of scope |
| R-03 | Risk | Mention note recommends `delegate_task`, which is refused for the host | The agent may try a delegation first | Design (REQ-004) | Open |

## Architecture Investigation Findings

Authorities read for architecture (2026-10-09): `references/architecture-design.md`, `design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/DESIGN.md`. No package-level `DESIGN*.md` exists under `autobyteus-server-ts`, `autobyteus-web` or `autobyteus-agent-presentation-contracts`. Package `AGENTS.md` files were read for test commands.

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| A-01 | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-root-port.ts` (`CollaboratorRootPort`, `buildInRunPlacements`, `InRunPlacementRank`) | The port exposes facts only. `rootDefinition()` means "never listed, mentioned or brought in". Placement ranks are `configured` > `collaborator` > `collaborator_member`. `rootDefinition()` is read only by `CollaboratorCandidatePolicy`. Implementers: the three port factories, GraphQL `emptyPort`, the admission unit test. | The viewer-dependent "own definition" belongs in the Agent-root port; the generic policy logic stays unchanged |
| A-02 | `collaborator-candidate-policy.ts` | `listCandidates`, `requireEligible`, `catalogView` (→ `listEligible`, `catalogAddressMap`) exclude `rootDefinition()`. `requireAdmissible` refuses any in-run definition without a collaborator entry. `preferredInRunAddress` sorts by rank. | If the host is an in-run placement and not the viewer's own definition, it is listed, mentionable at its in-run address, and never admissible (no second instance), with no policy logic change |
| A-03 | `catalog-address-map.ts` | In-run definitions keep their in-run address and are never catalog addresses. Other definitions are hashed when their slug collides with another eligible slug **or** an address in use. The host address is always in `addressesInUse`. | Including or excluding the host from `eligible` gives identical catalog addresses for every other definition, so bring-in addresses don't depend on the viewer |
| A-04 | `collaborator-admission.ts` `resolveMentions` / `plan` | `inRun = Boolean(entry) || inRunKeys.has(key)`. `plan()` (bring-in) never resolves an in-run non-collaborator definition; `requireAdmissible` refuses it. | `resolveMentions` is the one place where a mention's presence (incl. "run agent") is decided |
| A-05 | `standalone-agent-run-root/services/standalone-root-collaborators.ts` | `port()` takes no viewer. `resolveMentions(defs)`, `bringInAt({address, senderRunId})`, `listAvailable()`, `catalogTaskSource({address, senderRunId})` and `ensureNow({senderRunId})` all call `port()`. | Every call site already has the viewer (focused run or sender); pass it through |
| A-06 | `standalone-root-message-delivery.ts` (`resolveMentions({focusedAgentRunId})`, `postToHost`, `listAvailableAgents(sender)`); `standalone-agent-run-root.ts` (`collaboratorPort()`) | The focused/sender identity is available at every entry and is dropped before the port | Thread it to the `collaborators.*` calls |
| A-07 | `services/agent-streaming/agent-collaboration-stream-handler.ts` SEND_MESSAGE | Child SEND_MESSAGE → `root.resolveCollaboratorMentions({focusedAgentRunId: target})` → `composeCollaboratorMentionNote` | No handler logic change |
| A-08 | `api/graphql/types/agent-run-collaboration.ts`; `api/graphql/services/collaborator-root-port-resolver.ts` | `collaboratorMentionCandidates(rootSubjectKind, rootRunId)`; the resolver builds the active or stored port per root kind | Add `focusedAgentRunId`: required for `agent` roots, unused by Team/Org |
| A-09 | `autobyteus-web/composables/agentInput/runMentionScope.ts`; `services/collaborators/collaboratorCandidatesService.ts` (cache key `rootKind:rootRunId`; `invalidate` called from `services/agentCollaboration/agentRunCollaborationContext.ts:171`, `services/agentStreaming/TeamStreamingService.ts:381`, `services/agentOrgExecution/agentOrgExecutionContext.ts:261`); `composables/runSettings/useMentionCandidates.ts`; `stores/agentRunCollaborationStore.ts` `childTargetFor` (the child run ID appears only in `browse.agentRunId` and in closures) | The candidate cache is per root | Agent-root scopes carry the focused run ID; Agent-root cache is keyed per focused agent; invalidation clears all of a root's entries; task-child targets expose `agentRunId` explicitly |
| A-10 | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts`; consumers `autobyteus-web/utils/collaborators/collaboratorMentionText.ts` (`presentSentUserMessage`: names only, strips the note) and `autobyteus-web/utils/runTreeSummary.ts` | `MentionedCollaborator.inRun: boolean`. The parser requires the final line to be a known guidance. Web uses only `name` and the stripping. | Replace `inRun` with a 3-state `presence`. One function computes guidance from the entries, used by both compose and parse. Saved guidances still parse. |
| A-11 | `agent-tools/agent-discovery/list-available-agents-contract.ts` | The tool is **opt-in** per agent. Output is `{name, kind, address, description}`. | No output-shape change. Only agents with the tool enabled benefit from REQ-003. |
| A-12 | Tests: `tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts`; `tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts:255,432`; `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts:396-401`; `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts:514`; `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Current guards for host exclusion (host view) | Keep the host-view assertions, add non-host-view assertions, update GraphQL calls for the new argument |

## Requirement Implications

- The hidden PM is an unintended side effect. The own-definition rule was meant for the host itself and is applied to every agent in the root because candidates are computed per root (F-01, F-04). Team and Org roots already let copy members `@` a configured delegator (BEH-007), so the Agent root is the inconsistent case.
- Address messaging to the host already reaches the existing run (BEH-003). The gaps are discoverability (`@`, `list_available_agents`) and knowledge (address and run ID).
- Nested delegators have no unique address. Only the run ID is exact (BEH-009).
- SR-002 (user, 2026-10-09): no system-prompt changes. The address reaches the member through the user's `@` mention note, which is appended to the user's message content (`composeCollaboratorMentionNote` in the stream handlers / `postToHost`), or through `list_available_agents`. Nested delegators are out of scope.

## Notes For Architecture Design

- Approved scenarios: SCN-001 (user `@` of the PM from a copy member) and SCN-002 (`list_available_agents` from a copy member).
- Hard constraints: no system-prompt or work-packet change; Team/Org behavior unchanged; never a second host instance.
- The design is recorded in `design-spec.md` (same folder).
