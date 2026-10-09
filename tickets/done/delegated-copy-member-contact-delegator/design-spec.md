# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-006`
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` at SR-005. The user approved it on 2026-10-09 in the Solution Designer conversation ("Thanks, I agree now, approve."). In-scope: REQ-001, REQ-002, REQ-003, REQ-004, REQ-006; AC-001..003, AC-006..009.
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/investigation-notes.md` (F-* requirements evidence, A-* architecture evidence)
- Authorities read (design reading gate, 2026-10-09): `references/architecture-design.md`, `design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/DESIGN.md`. No package-level `DESIGN*.md` under the changed packages. `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none

## Current-State Read

`@` candidates, the send-time `@` re-check and `list_available_agents` share one owner, `CollaboratorCandidatePolicy` (A-02). It reads facts from a per-root `CollaboratorRootPort` (A-01), and its exclusion rule is "the root's own definition" (`port.rootDefinition()`). The Agent-root port is built **without a viewer** (A-05). It reports the host's definition as the root's own definition and does not list the host as an in-run placement. So for every agent in the run, not just the host, the host is not a candidate, a mention of it is rejected, and `list_available_agents` omits it (BEH-001, BEH-002, BEH-005).

Addressing is already correct. `resolveMessageRecipient` resolves the host address to the existing host for any sender, and `delegate_task` to the host is refused (F-03, BEH-003). The web caches candidates per root (A-09). The `@` note contract (A-10) knows only "in the run / not in the run" and always recommends `delegate_task` first.

Team and Org ports are healthy for this scope and stay unchanged (BEH-007, BEH-008 preserved).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 14 production files across three existing packages: server Agent-root collaborators, GraphQL query and port resolver; the shared mention-note contract; web scope, candidate service and task-child target. All of it sits within existing owners and boundaries. No new subsystem, persistence or lifecycle.
- Architectural risk: `High`
- Risk rationale and supporting evidence: two shared contracts change. (1) `MentionedCollaborator` (`inRun` → `presence`) and the note wording, which the server composes and the web parses; saved notes must keep parsing. (2) The GraphQL `collaboratorMentionCandidates` query gains `focusedAgentRunId`. Also, the Agent-root port gains a placement (the host) that feeds address resolution, bring-in and catalog-copy admission. The analysis shows no behavior change there (A-02, A-03), but the blast radius covers every Agent-root collaboration path, so it warrants independent review.
- Escalation trigger if implementation or validation discovers new impact: any change in catalog addresses for non-host definitions, any second host instance, any change in Team/Org results, or a saved note that no longer parses → return `Design Impact` to Solution Designer.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | A-01, A-02 | The policy reads facts. In-run placements are listed, mentionable and never re-admitted. | D-1: express the change as port facts; no policy logic change | None |
| Code | A-03 | Catalog addresses are unchanged whether or not the host is in `eligible` | D-1 is safe for bring-in and catalog copies | Covered by a unit test (AC-009) |
| Code | A-04 | `resolveMentions` decides presence | D-3: presence decided there from placement rank | None |
| Code | A-05, A-06, A-07 | The viewer is known at every Agent-root call site | D-2: thread the viewer into the Agent-root port | None |
| Code | A-08, A-09 | Candidates are cached per root | D-4: focused run ID in query/scope/cache for Agent roots | None |
| Code | A-10 | The note parser needs a known final guidance line | D-3: one guidance function used by compose and parse | None |
| Code | A-11 | `list_available_agents` is opt-in | REQ-003 benefits only agents with the tool enabled | Product fact to tell the user |

## Intended Change

1. **Agent-root port per viewer (D-1, D-2).** The Agent-root port always reports the host as an in-run placement, with a new top rank `run_agent`, at its host address. It reports the host's definition as the viewer's own definition **only when the viewer is the host**; otherwise it reports none, like an Org root.
2. **Presence of a mention (D-3).** `resolveMentions` reports each mention as `not_in_run`, `in_run`, or `run_agent` (the preferred in-run placement is the run agent). The note contract renders a `run_agent` entry with an explicit `send_message_to` instruction carrying its address, and offers no `delegate_task` for it.
3. **Viewer plumbing (D-4).** The GraphQL candidates query takes `focusedAgentRunId`, required for Agent roots. The web passes it from Agent-root scopes (host composer or task child) and caches Agent-root candidates per focused agent.
4. `list_available_agents` needs no code of its own: it already uses the same policy and gets the host through D-1/D-2 once the sender is passed as viewer.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001; AC-001 | `@` in a task-child composer of an Agent run | Host hidden (F-01, A-02) | Host listed for non-host viewers; host composer unchanged | DS-001 |
| BEH-002 | User | REQ-002, REQ-004; AC-002, AC-003 | Send with `@Project Task Manager` from a task child | Rejected as own definition (F-02) | Resolved to the existing host as `run_agent`. The note says "use send_message_to with recipient_address /project_task_manager". | DS-002 |
| BEH-003 | Contract | REQ-006; AC-003, AC-006 | Child `send_message_to(<host address>)` | Reaches the existing host (F-03) | Preserved | DS-003 |
| BEH-005 | Contract | REQ-003; AC-006 | Child calls `list_available_agents` | Host omitted (F-01) | Host listed at its address for non-host callers | DS-004 |
| BEH-006/007/008/009 | — | AC-007, AC-008, AC-009 | — | — | Preserved: prompts, Team/Org menus and lists, nested delegators | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (fixes an unintended side effect)
- Current design issue found: `Yes`
- Structural triggers that fire, with evidence:
  - **Shared-structure tightness:** a `run_agent` entry is in the run but not delegatable. With `inRun: boolean` plus a second boolean, `runAgent ⇒ inRun` would overlap, so one 3-state `presence` replaces `inRun` (A-10).
  - Triggers ruled out:
    - Ambiguous boundary: the GraphQL query gains an explicit `focusedAgentRunId`, not a guessed selector.
    - Repeated coordination: the policy stays the single owner, and no caller re-implements exclusion.
    - Authoritative boundary: callers keep using `StandaloneRootCollaborators` and the policy, with no bypass.
    - Empty indirection: no new layer.
- Root cause classification: `Missing Invariant`. The right owner exists (the Agent-root port feeding the policy), but it lacks a viewer and so can't enforce "own definition = the viewer's own".
- Refactor needed now: `Yes`, small. Rename `CollaboratorRootPort.rootDefinition()` → `ownDefinition()` (its meaning becomes viewer-relative; never reuse a name with a new meaning). Replace `MentionedCollaborator.inRun` with `presence`.
- Evidence: A-01..A-10.
- Design response: D-1..D-4 below.
- Refactor rationale: keeps a single policy owner and tight shared shapes, with no special-case branch in the policy for "Agent root non-host viewer".
- Intentional deferrals and residual risk: Team/Org self-exclusion (DEC-003 = No) and nested delegators (SR-002) stay out of scope, so a Team/Org member still sees its own definition in its `@` menu, as today.

## Terminology

- **Run agent:** the agent of a standalone Agent run root (the host, e.g. the PM). The server's existing wording is "the run's own agent".
- **Viewer:** the agent on whose behalf candidates, mentions or the catalog are computed: the focused composer agent, or the tool-calling sender.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Removed in this change: `CollaboratorRootPort.rootDefinition()` (renamed with its new meaning to `ownDefinition()`); `MentionedCollaborator.inRun` (replaced by `presence`); the viewer-less `StandaloneRootCollaborators.port()`.
- Not legacy: the parser's recognition of **saved** note guidances from earlier releases. That lets persisted conversation text read unchanged (data continuity), not dual behavior. Compose always emits only the current wording.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: conversation messages containing `[Mentioned collaborators]` notes (text). Run trees and collaborator entries are not changed.
- Change: new notes may contain a `run_agent` entry line and a `send_message_to` guidance sentence. The in-memory `MentionedCollaborator` field changes.
- Reader behavior: `parseCollaboratorMentionNote` is the only reader, used for web display. The current parser recognizes current and saved guidances. The new parser recognizes the guidance computed from the parsed entries plus the saved guidances.
- Decision: `Directly Usable — No Migration`. Old notes have no `run_agent` entries. Their entry lines and guidance lines are exactly what the new parser accepts: the `in_run` / `not_in_run` composition is identical to today's `IN_RUN_NOTE_GUIDANCE` / `NOTE_GUIDANCE`, and saved guidances stay recognized. No text is rewritten.
- Constraint: AC-009 includes "saved notes from earlier releases still render".

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | User opens `@` in a task-child composer | Menu lists the PM | `CollaboratorCandidatePolicy` via Agent-root port (viewer) | The reported symptom |
| DS-002 | Primary End-to-End | BEH-002 | User sends `@Project Task Manager` to the code reviewer | Code reviewer receives the message with the explicit `send_message_to` note | `StandaloneRootMessageDelivery` → `CollaboratorAdmission.resolveMentions` → note contract | The approved contact path |
| DS-003 | Primary End-to-End | BEH-003 | Code reviewer calls `send_message_to(/project_task_manager)` | Existing PM run receives it | `resolveMessageRecipient` (unchanged) | Must reach the existing run, never a new copy |
| DS-004 | Primary End-to-End | BEH-005 | Copy member calls `list_available_agents` | Result includes the PM at its address | `CollaboratorCandidatePolicy.listEligible` via Agent-root port (sender as viewer) | Address discovery without `@` |

## Primary Execution Spine(s)

- DS-001: `Composer (task child) -> runMentionScope {agent, hostRunId, focusedAgentRunId} -> collaboratorCandidatesService -> GraphQL collaboratorMentionCandidates -> resolveCollaboratorRootPort(agent, hostRunId, focusedAgentRunId) -> Agent-root port (viewer) -> CollaboratorCandidatePolicy.listCandidates -> menu`
- DS-002: `Composer send (mentions) -> agent-collaboration stream SEND_MESSAGE -> StandaloneAgentRunRoot.resolveCollaboratorMentions({focusedAgentRunId}) -> StandaloneRootMessageDelivery.resolveMentions -> StandaloneRootCollaborators.resolveMentions(viewer) -> CollaboratorAdmission.resolveMentions(port(viewer)) -> composeCollaboratorMentionNote -> child post_message`
- DS-003 (unchanged): `child send_message_to -> StandaloneRootMessageDelivery.deliverToAddress -> resolveMessageRecipient -> StandaloneRootExecutionIndex.getMessagePlacement(host) -> deliverTo(host)`
- DS-004: `child list_available_agents -> StandaloneAgentRunRoot.listAvailableAgents(sender) -> StandaloneRootMessageDelivery.listAvailableAgents -> StandaloneRootCollaborators.listAvailable(sender run) -> CollaboratorCandidatePolicy.listEligible(port(viewer))`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The web asks for the candidates offered to the focused agent. The Agent-root port, built for that viewer, reports the host as an in-run placement and as own definition only for the host viewer. The policy applies its unchanged rules. | scope, query, port, policy | Policy | Candidate cache (web) |
| DS-002 | On send, the root resolves each mention for the focused agent. The host resolves to its host address with presence `run_agent`. The note contract renders an explicit `send_message_to` instruction for it. | delivery, collaborators, admission, note contract | `CollaboratorAdmission.resolveMentions` (presence), note contract (wording) | — |
| DS-003 | Unchanged. The host address resolves to the host placement, and the message goes to the existing host run (activated if idle). | recipient resolution, index | `resolveMessageRecipient` | — |
| DS-004 | The tool lists eligible definitions for the sender. With the sender as viewer, the host is listed at its in-run address. | collaborators, policy | Policy | — |

## Spine Actors / Main-Line Nodes

`runMentionScope` (web), `collaboratorCandidatesService` (web), `collaboratorMentionCandidates` (GraphQL), `resolveCollaboratorRootPort`, `standaloneRootCollaboratorPortFor` (Agent-root port), `CollaboratorCandidatePolicy`, `StandaloneRootCollaborators`, `StandaloneRootMessageDelivery`, `CollaboratorAdmission.resolveMentions`, `composeCollaboratorMentionNote` / `parseCollaboratorMentionNote`.

## Ownership Map

- `standaloneRootCollaboratorPortFor(tree, launch, viewerAgentRunId)` **owns the Agent-root facts for one viewer**: host placement (`run_agent`), own definition (host def iff the viewer is the host), collaborators, addresses in use.
- `CollaboratorCandidatePolicy` **owns eligibility** (unchanged logic, renamed port call).
- `CollaboratorAdmission.resolveMentions` **owns mention resolution**, including `presence`.
- `collaborator-mention-note.ts` **owns all note wording**, entry lines and guidance. One `guidanceFor(entries)` serves both compose and parse.
- `StandaloneRootCollaborators` **owns building the port for a viewer**. Every public method takes the viewer run ID.
- GraphQL resolver and web service are thin transport/cache boundaries.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `collaboratorMentionCandidates` | Policy via `resolveCollaboratorRootPort` | Transport | Eligibility rules |
| `collaboratorCandidatesService` (web) | Server policy | Cache per subject | Any filtering of candidates |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `CollaboratorRootPort.rootDefinition()` | Meaning becomes viewer-relative | `ownDefinition()` | In This Change | Update the 3 port factories, GraphQL `emptyPort`, policy, tests |
| `MentionedCollaborator.inRun` | Cannot express `run_agent` without overlap | `presence: "not_in_run" \| "in_run" \| "run_agent"` | In This Change | Update admission (2 sites), contract, tests |
| Viewer-less `StandaloneRootCollaborators.port()` / `StandaloneAgentRunRoot.collaboratorPort()` | Port is per viewer | `portFor(viewerAgentRunId)` / `collaboratorPortFor(viewerAgentRunId)` | In This Change | — |
| Per-root-only web cache key for Agent roots | Candidates differ per focused agent | Subject key incl. focused run ID | In This Change | Team/Org keys unchanged |

## Return Or Event Spine(s) (If Applicable)

The existing `collaborator_added` event invalidates the web candidate cache for a root (`agentRunCollaborationContext.ts:171`). After this change the invalidation must clear every focused-agent entry of that root.

## Bounded Local / Internal Spines (If Applicable)

N/A. No loop or state machine changes.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Web candidate cache | DS-001 | Composer menu | One request per open; keeps last list while loading | Existing behavior (QR-001) | Filtering in the web would duplicate the policy |
| Note parsing for display | DS-002 | Web user bubble | Strip the note, read mention names | Existing behavior | — |

## Ownership Boundaries

- The Agent-root port is the only place that knows "host vs. non-host viewer". The policy must not learn root kinds or viewers.
- The note contract is the only place that knows wording. Admission supplies `presence` only.
- The web never decides eligibility. It only passes the focused run ID.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `StandaloneRootCollaborators` | `standaloneRootCollaboratorPortFor`, admission calls | `StandaloneRootMessageDelivery`, `StandaloneAgentRunRoot` | Delivery building ports itself | Add a viewer parameter on the method |
| `CollaboratorCandidatePolicy` | catalog view, address map | Admission, root collaborators, GraphQL | Callers filtering the host themselves | Change port facts, not callers |
| Note contract | `guidanceFor`, entry rendering | Server stream handlers, `postToHost`, web parser | Server or web formatting note text | Extend the contract |

## Dependency Rules

- Allowed: web → GraphQL; GraphQL resolver → `resolveCollaboratorRootPort` → port factories / active roots; roots → `StandaloneRootCollaborators` → admission/policy; server & web → note contract.
- Forbidden:
  - The policy branching on `rootKind` or viewer.
  - Web-side candidate filtering.
  - Any note wording outside the contract package.
  - Team/Org ports taking a viewer (no behavior need).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `collaboratorMentionCandidates(rootSubjectKind, rootRunId, focusedAgentRunId?)` | `@` candidates for one focused agent | List candidates | `agent`: `{rootRunId: hostRunId, focusedAgentRunId}` (focused **required**, error if absent). `agent_team`/`agent_org`: `{rootRunId}` (focused ignored). | Keep the field nullable in GraphQL; validate per kind in the resolver |
| `resolveCollaboratorRootPort(kind, rootRunId, focusedAgentRunId)` | Root port for a viewer | Build active/stored port | as above | — |
| `standaloneRootCollaboratorPortFor(tree, launch, viewerAgentRunId)` | Agent-root facts for one viewer | Port | `viewerAgentRunId: string` | Viewer == `tree.host.agentRunId` → host view |
| `StandaloneRootCollaborators.resolveMentions(viewerAgentRunId, defs)` / `listAvailable(viewerAgentRunId)` / `portFor(viewerAgentRunId)` | — | — | AgentRun ID | `bringInAt`, `catalogTaskSource`, `ensureNow` use their existing `senderRunId` as viewer |
| `StandaloneAgentRunRoot.collaboratorPortFor(viewerAgentRunId)` | — | GraphQL active path | AgentRun ID | Replaces `collaboratorPort()` |
| `MentionedCollaborator` | One resolved mention | `{name, kind, address, presence}` | — | `presence` replaces `inRun` |
| `CollaboratorRootPort.ownDefinition()` | The viewer's own definition | Exclusion fact | — | Team: root Team. Agent: host iff viewer is host, else null. Org: null. |
| `InRunPlacementRank` | — | Adds `"run_agent"` first in `RANK_ORDER` | — | `buildInRunPlacements({ runAgent?, configured, collaborators })` |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| candidates query | Yes | Yes (per kind, validated) | Low | — |
| Agent-root port factory | Yes | Yes | Low | — |
| `MentionedCollaborator.presence` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Port own definition | `rootDefinition` → `ownDefinition` | Yes | Low | Rename (meaning changed) |
| Host placement rank | `run_agent` | Yes (matches "the run's own agent" in server messages) | Low | — |
| Mention presence | `presence` with `not_in_run`/`in_run`/`run_agent` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Show host to non-host viewers | `CollaboratorCandidatePolicy` + port facts | Reuse | Policy already lists in-run placements | — |
| Resolve host mention to existing run | `CollaboratorAdmission.resolveMentions` | Extend (presence) | Already resolves in-run definitions | — |
| Explicit `send_message_to` wording | Note contract | Extend | Single wording owner | — |
| Reach host by address | `resolveMessageRecipient` | Reuse unchanged | Already correct | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Spine(s) | Owner Served | Decision |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/collaborators` | Port contract, placement ranks, policy, admission presence | DS-001, 002, 004 | Policy/admission | Extend |
| `autobyteus-server-ts/src/standalone-agent-run-root` | Agent-root port per viewer; viewer threading | DS-001, 002, 004 | Agent root | Extend |
| `autobyteus-server-ts/src/api/graphql` | Query argument; port resolution per viewer | DS-001 | Transport | Extend |
| `autobyteus-agent-presentation-contracts` | Mention presence and wording | DS-002 | Note contract | Extend |
| `autobyteus-web` | Focused run ID in scope/cache; task-child target ID | DS-001 | Composer | Extend |

## Draft File Responsibility Mapping

See the final mapping. No reusable structure needed extracting beyond the listed type changes.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Note guidance selection (compose + parse) | `collaborator-mention-note.ts` (`guidanceFor`) | contracts | Compose and parse must agree | Yes | Yes | A second wording table elsewhere |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `MentionedCollaborator {name, kind, address, presence}` | Yes | Yes (`inRun` removed) | Low | — |
| `InRunPlacement {address, rank}` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Change |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-root-port.ts` | Port contract | Rename `rootDefinition()` → `ownDefinition()` with viewer-relative doc. Add rank `"run_agent"`. `buildInRunPlacements` accepts optional `runAgent: {ref, address}` added with rank `run_agent`. |
| `.../collaborators/collaborator-candidate-policy.ts` | Policy | `RANK_ORDER = ["run_agent","configured","collaborator","collaborator_member"]`. `rootDefinition()` → `ownDefinition()`. Docs say "the viewer's own definition". Export a small `preferredInRunPlacement(port, ref)` (or equivalent) so admission can read the rank without duplicating the sort. |
| `.../collaborators/collaborator-admission.ts` | Mention resolution | `resolveMentions`: `presence = entry ? "in_run" : preferred?.rank === "run_agent" ? "run_agent" : preferred ? "in_run" : "not_in_run"`. `plan()`: `presence: in_run / not_in_run` (never `run_agent`; bring-in refuses in-run). |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-collaborators.ts` | Agent-root port per viewer | `standaloneRootCollaboratorPortFor(tree, launch, viewerAgentRunId)`: `ownDefinition = viewer === tree.host.agentRunId ? hostRef : null`; `inRunPlacementsByDefinition = buildInRunPlacements({ runAgent: {ref: hostRef, address: tree.host.address}, configured: [], collaborators })`. Class: `portFor(viewer)`; `resolveMentions(viewer, defs)`; `listAvailable(viewer)`; `bringInAt`/`catalogTaskSource`/`ensureNow` use `senderRunId` as viewer. |
| `.../standalone-agent-run-root/services/standalone-root-message-delivery.ts` | Delivery | Pass `focusedAgentRunId` to `collaborators.resolveMentions`. `postToHost` passes `hostRunId`. `listAvailableAgents(sender)` passes `sender.agentRunId`. |
| `.../standalone-agent-run-root/domain/standalone-agent-run-root.ts` | Root | `collaboratorPort()` → `collaboratorPortFor(viewerAgentRunId)` |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-collaborators.ts`, `.../agent-org-execution/services/agent-org-run-collaborators.ts` | Team/Org ports | Rename only (`ownDefinition`). Behavior unchanged. |
| `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts` | GraphQL | Add `@Arg("focusedAgentRunId", () => String, { nullable: true })`; pass to resolver |
| `autobyteus-server-ts/src/api/graphql/services/collaborator-root-port-resolver.ts` | Port resolution | Signature `(kind, rootRunId, focusedAgentRunId)`. For `agent`: throw if missing; active → `collaboratorPortFor`; stored → `standaloneRootCollaboratorPortFor(tree, launch, focused)`. `emptyPort` rename only. |
| `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | Note contract | `presence` type; `run_agent` entry suffix; `guidanceFor(entries)`; parser recomputes guidance from parsed entries (plus saved guidances) |
| `autobyteus-web/composables/agentInput/runMentionScope.ts` | Scope | Agent-root variant carries `focusedAgentRunId` (standalone_agent → `runId`; task targets → `target.agentRunId`) |
| `autobyteus-web/types/workspace/activeAgentWorkspaceTarget.ts`, `autobyteus-web/stores/agentRunCollaborationStore.ts` | Target | `agent_run_task_agent` / `agent_run_task_team_member` gain `agentRunId`; `childTargetFor` sets it |
| `autobyteus-web/services/collaborators/collaboratorCandidatesService.ts`, `autobyteus-web/graphql/queries/collaboratorQueries.ts`, `autobyteus-web/composables/runSettings/useMentionCandidates.ts`, `autobyteus-web/generated/graphql.ts` (regenerate) | Cache/query | API takes the scope (subject). Key `agent:<root>:<focused>` / `<kind>:<root>`. Query passes `focusedAgentRunId`. `invalidate(rootKind, rootRunId)` clears all keys of that root. |

## Applied Patterns (If Any)

None new.

## Target Subsystem / Folder / File Mapping

All changes modify existing files in place (see the final mapping). No files are added, moved or deleted. The existing layout already places each concern under its owner.

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-collaboration/collaborators` | Main-Line Domain-Control | Yes | Low | Existing owner |
| `standalone-agent-run-root/services` | Main-Line Domain-Control | Yes | Low | Existing owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Note for a host-only mention, sent by the user to the code reviewer (the wording is normative in substance: it must name `send_message_to`, `recipient_address` and the address, and must not offer `delegate_task` for that entry):

```
@Project Task Manager please create the follow-up cleanup ticket

[Mentioned collaborators]
- Project Task Manager (Agent) at /project_task_manager, the run's own agent
Use send_message_to with recipient_address /project_task_manager to message Project Task Manager; delegate_task cannot target it.
```

Mixed note (host plus a catalog team): the existing delegate guidance, then the host sentence:

```
[Mentioned collaborators]
- Product Team (Agent Team) at /product_team
- Project Task Manager (Agent) at /project_task_manager, the run's own agent
Delegate the work with delegate_task to its address; … removes it from the run. Use send_message_to with recipient_address /project_task_manager to message Project Task Manager; delegate_task cannot target it.
```

`guidanceFor(entries)`:
- `delegateSentence` (today's `NOTE_GUIDANCE`) when any entry is not `run_agent`
- plus `IN_RUN_GUIDANCE` when any entry is `in_run`
- plus one `send_message_to` sentence per `run_agent` entry

These parts are joined with a space. For notes without `run_agent` entries this equals today's guidance, so old notes stay valid.

Port shape:

| Viewer | `ownDefinition()` | Host placement | `@` lists host? | Mention of host | `list_available_agents` lists host? |
| --- | --- | --- | --- | --- | --- |
| Host (PM composer / PM tool call) | host def | `run_agent` | No | Rejected (own definition), as today | No |
| Any other agent in the run | `null` | `run_agent` | Yes | `run_agent` at host address | Yes |

Avoided shape: `if (rootKind === "agent" && viewer !== host)` inside `CollaboratorCandidatePolicy`, or the web filtering the host out of a list.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `inRun` alongside a new `runAgent` flag | Fewer edits | Rejected | Single `presence` |
| GraphQL query without focused ID for Agent roots, defaulting to the host view | Fewer client edits | Rejected | Required for `agent`; explicit error |
| Keep `rootDefinition()` name with the new meaning | Less churn | Rejected | Rename to `ownDefinition()` |
| Saved-note guidance recognition | Display of persisted history | N/A (data continuity, not dual behavior) | Retained in the parser only |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Contract: `presence` + `guidanceFor` + parser. Unit tests for compose/parse, including saved notes and the host-only/mixed examples.
2. Server collaborators: port rename, `run_agent` rank, `buildInRunPlacements({runAgent})`, policy rank order, admission presence. Unit tests.
3. Agent root: port per viewer; thread the viewer through collaborators, delivery and root; GraphQL argument and resolver. Update and add unit/integration tests (host view preserved, non-host view lists/resolves the host, catalog addresses identical across viewers, bring-in of the host definition refused).
4. Web: target `agentRunId`, scope, service/cache/invalidate, query and codegen. Web unit tests.
5. E2E: extend the ad-hoc-delegation or standalone mention E2E with a task-child `@` of the host and a child `list_available_agents` → `send_message_to` reaching the existing host (AC-002, AC-003, AC-006).
6. Desktop verification by the user (AC-003).

## Key Tradeoffs

- Viewer-aware port vs. a viewer parameter on the policy: the port keeps root-kind knowledge out of the generic policy, and Team/Org stay untouched.
- Explicit per-entry `send_message_to` sentence vs. a generic sentence: more text per host mention, but unambiguous, as the user asked.
- Focused-agent caching on the web for Agent roots only: a few more requests when switching between task children. One request per menu open still holds (QR-001).

## Risks

- **Catalog-address drift:** if the host's inclusion changed any non-host catalog address, a bring-in by a previously listed address would break. Analysis (A-03) says no. A unit test must pin it.
- **Prompt adherence:** the agent may still try `delegate_task` to the host. It gets refused harmlessly, and the note now says explicitly not to.
- **`list_available_agents` is opt-in (A-11):** REQ-003 helps only agents with the tool enabled. The `@` path covers all agents.
- **Stored (inactive) Agent roots in the GraphQL path:** the host address there is derived from the definition ID slug (existing behavior). Candidates don't expose addresses, so `@` is unaffected.

## Guidance For Implementation

- Keep the policy free of root-kind/viewer branches. All viewer logic lives in `standaloneRootCollaboratorPortFor`.
- Do not change any system prompt, the work packet, Team/Org ports' behavior, or `resolveMessageRecipient`.
- Tests: follow `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/TESTING.md` and package `AGENTS.md`. Server: `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`.
- Preserve the existing host-view assertions (`standalone-agent-run-root.test.ts:255,432`; `agent-initiated-collaborators.e2e.test.ts:514`; `ad-hoc-task-delegation.e2e.test.ts:396-401` with `focusedAgentRunId = host`), and add the non-host counterparts.
