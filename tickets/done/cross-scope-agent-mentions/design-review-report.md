# Design Review Report — cross-scope-agent-mentions

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md` (Approved SR-008; REQ-014/AC-016 under the same approval)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/investigation-notes.md` (E-01–E-20)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-spec.md` (SR-010, 668 lines). The prior design is archived at `design-history/design-spec-SR-007.md`.
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015, supersedes the 2026-09-30 spec);
  - `code-review-report.md` (CRR-004: DI-001, CR-003, CR-004);
  - `api-e2e-evidence/` (as cited).
- Relevant Solution Revision IDs: SR-008 (requirements change), SR-009 (design), SR-010 (answers ARCH-REV-003). History: SR-004–SR-007.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: SR-010, a revised package answering ARCH-REV-003 (AR-006–AR-008).
- Prior Review Round Reviewed: Round 3 (`ARCH-REV-003`, Fail on SR-009)
- Latest Authoritative Round: 4
- Round 4 additional evidence: `agent-team-execution/local/flat-team-execution-manager.ts`:
  - `reserveDirectAgentInput`, `deliverToDirectAgent` and `executeDirectAgentCommand` route through `getConfiguredAgent`;
  - termination and status iterate `configured.listHandles()`.
  `local/registries/configured-agent-execution-registry.ts#getOrCreate` resolves nodes through `FlatTeamMemberConfigResolver`.
  `local/registries/` (where the new collaborator Team registry will sit).
- Current-State Evidence Basis: `codex/cross-scope-agent-mentions` @ `5dcc5dc82` (SR-007 implemented). Code read:
  - `root-team-run.ts`: `executeAgentCommand`, `withLiveLease`, `isLiveAgent`, `requireTeamRun`, `requireContainingTeamRun`, `authorizeCurrentIdentity`;
  - `team-execution-index.ts`: execution kinds and containing Team;
  - `team-run-resolver.ts`: `requireConfigured`, `registerManaged`;
  - `agent-org-execution-index.ts` and `agent-org-run.ts`: host model `hostKind: root | team`, `executeAgentCommandWithExecutionKind`;
  - `agent-run-collaboration-execution-index.ts` and `agent-run-collaboration-root.ts`: host model, host presentation through `buildDirectAgentRunInterAgentEvent`;
  - `root-agent-execution-registry.ts`: `prepareConfigured`, `executeCommand`, `reserveInput`, `isActive`;
  - `root-team-execution-directory.ts`: `prepareConfigured` with `prepareConfiguredAgents: false`;
  - `configured-agent-activation-planner.ts`: in `restore` mode with no saved conversation, the plan is `new`;
  - `run-model-selection-service.ts`: `validateMany`;
  - the runtime builders that set `input_origin` and `sender_agent_id`;
  - web `agentStreamMessageProjector.ts`, which handles `INTER_AGENT_MESSAGE`.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Confirmed: new hosted execution kinds in three roots, persisted-shape changes, shared contracts, and a product-wide presentation change.
- Independent Architecture Review required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. All rows are confirmed in Round 4.
- Approved requirements understood:
  - A mention adds one collaborator instance at send time. It is Offline, with run IDs stored in the entry.
  - Admission validates runnability; a failed add blocks the send and keeps the draft.
  - Agents reach the collaborator with `send_message_to` by address or run ID, including teammates inside a collaborator Team.
  - `delegate_task` to a collaborator address starts an extra copy.
  - Agent-to-agent messages show "From <Sender>:" live and on replay; old traces without a sender are unchanged.
- Existing behavior confirmed in code:
  - Org and Agent root host executions as `root` or `team`.
  - The Team root has no root-hosted execution kind. Every Agent is routed through `containingTeamRunId` to a `TeamRun` in `teamRunResolver`.
  - Configured-member lazy start and restore work as the design states.
  - The host's live inter-agent display already uses `INTER_AGENT_MESSAGE`.
- Scope guardrail: UC-001–006. E-20 (Org task-Team copy addressing) is a non-goal. Review authority is the REQ/AC and preserved IDs plus the approved SR-008 UI/UX spec.
- Every prospective blocking `Design Impact` finding traces to an approved ID: `Yes`.

| Behavior ID | Kind | Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass. A per-root hosting and routing table is defined (AR-006 resolved). | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass. Collaborator TeamRuns are registered with `teamRunResolver`; teammates resolve inside the same instance. | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass. A never-started collaborator restores as `new` (planner verified). | Confirmed | — |
| BEH-007 | User/System | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | User | Pass | Pass | Pass. The hold applies to sends with mentions only. | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-011 | User | Pass | Pass | Pass. The containing TeamRun is the root `FlatTeamExecutionManager`, which serves collaborator Agents through `getConfiguredAgent`. | Confirmed | — |
| BEH-012 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-013 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-014 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-015 | Preserved | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status / Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| SR-008 `ui-ux-spec.md` + VIS-001–015 | Pass | Pass | Pass | Pass | Pass (Approved; supersedes 2026-09-30) | — |
| `code-review-report.md`, API/E2E evidence | Pass | Pass | Pass | Pass | Pass | — |
| `requirements-doc.md` internal consistency | Pass | Pass | Pass | Pass (AR-008 fixed; line 22 is the historical SR-004 approval reference) | Pass | — |

AR-008 covers these stale passages in `requirements-doc.md`:
- line 202 still names VIS-001–014 as normative (the "Resolved" note follows);
- line 254, F-003 says inter-agent rendering is "not changed here", which contradicts REQ-014;
- the Readiness Check says the visuals are pending.

## Task Design Health Assessment Verdict

| Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | `Behavior Change` relative to SR-007 | — |
| Root cause evidence-backed | Pass | `Missing Invariant`: "a collaborator is a reachable member" (DI-001, E-20 live evidence) | — |
| Refactor decision explicit | Pass | Yes: hosted collaborator executions | — |
| Reflected in design sections | Pass | "Collaborator Hosting And Routing" covers every root operation per root | — |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Facade Vs Owner | Naming | Ownership | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Admission | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 Messaging | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 Extra copy | Pass | Pass | Pass | Pass | Pass | Pass | Pass. The host rule for a copy started by a root-hosted collaborator Agent in a Team root is folded into AR-006. |
| DS-004 Restore/stop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 Exposure | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 Client | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 Candidates | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 Rejection | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 Host wake | Pass | Pass | Pass | Pass | Pass | Pass | Pass (unchanged) |
| DS-010 RD-004 | Pass | Pass | Pass | Pass | Pass | Pass | Pass. Metadata keys verified in both root builders; the host's live path already emits `INTER_AGENT_MESSAGE`. |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `Root.admitCollaboratorMentions` | Pass | Pass | Pass | Pass | Validation → allocation → commit → publish → event, inside the gate |
| `Root.resolveMessageRecipient` / `resolveDelegationPlacement` | Pass | Pass | Pass | Pass | Each address maps to one execution |
| Root hosting backends (Org/Agent `rootAgents`/`teams`; Team root `FlatTeamExecutionManager` plus `CollaboratorTeamExecutionRegistry`) | Pass | Pass | Pass | Pass | `CollaboratorExecutionHost` dropped; there is no parallel path |
| `<Root>TaskSourceResolver` | Pass | Pass | Pass | Pass | — |

The `CollaboratorExecutionHost` interface (`publish`, `restore`, `findAgent`, `findTeam`, `resolveAddress`, `statusSnapshots`, `freezeForRootTermination`) has no command, input-reservation or liveness entry. It is therefore undefined how a root's `executeAgentCommand`, `reserveInput`, `isLive` and `authorize` reach a collaborator: through the host, or through a host-kind branch onto the root's own backends.

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `collaborators/*` | Pass | Pass | Pass | Pass | Injected ports |
| `CollaboratorExecutionHost` (backends) | Pass | Pass | Pass | Pass | Root-neutral |
| `send_message_to` paths | Pass | Pass | Pass | Pass | No allocation |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `CollaboratorEntry` (with identities) | Pass | Pass | Pass | Low | Pass |
| `COLLABORATOR_ADD_FAILED {collaborator_name, reason}` | Pass | Pass | Pass | Low | Pass |
| Replay inter-agent item | Pass | Pass | Pass | Low | Pass |
| `Root.publishCollaborators` / restore wiring (root-internal) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Lazy hosted Agents and Teams | Pass | Pass | Pass | The `prepareConfigured` APIs exist (verified) |
| Runnability | Pass | Pass | Pass | `validateMany` is used by the Team and Org managers |
| Root command routing for root-hosted executions | Pass | Pass | Pass | Org and Agent root reuse `hostKind`; the Team root reuses its root `FlatTeamExecutionManager` and registries |
| Sender on traces, "From" segment | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

All areas pass. `agent-team-execution` now names `addCollaboratorAgent`, `CollaboratorTeamExecutionRegistry`, the index kinds `collaborator` and `collaborator_team_member`, and the `requireTeamRun` fallback.

## Reusable Owned Structures / Data Model Tightness Verdicts

| Structure | Verdict | Notes |
| --- | --- | --- |
| `CollaboratorEntry` discriminated union with identities and Team `taskExecutions` | Pass | Collaborator runs are never in root `taskExecutions`; copies are never in `collaborators` |
| Shared name formatter | Pass | One function for rows, the tab and "From" |
| Mention note | Pass | Wording now says `send_message_to` |

## File Responsibility / Placement Verdicts

| Item | Verdict | Notes |
| --- | --- | --- |
| `collaborator-runnability-validator.ts`, `collaborator-identity-allocator.ts` | Pass | — |
| `local/registries/collaborator-team-execution-registry.ts` (new) | Pass | Modelled on the `RootTeamExecutionDirectory` prepare and restore path |
| Team root files | Pass | — |
| Org and Agent-root files | Pass | Use the existing `rootAgents`/`teams` |
| Web files | Pass | — |

## Removal / Decommission Completeness Verdict

Pass. Removed:
- the SR-007 collaborator task paths;
- the address hint;
- the old in-run rule;
- the notice derived from a `delegate_task` null result;
- content-keyed settle;
- per-surface formatting;
- user-style inter-agent rendering.

## Legacy / Backward-Compatibility Verdict

Pass. There are no dual paths. Old traces without a sender are shown truthfully, not guessed.

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Proportionate | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `collaborators` with identities | Directly Usable — No Migration (no released predecessor; SR-007 developer data disposable) | Pass | Pass | Pass | Strict validation of unreleased SR-007 developer data only affects disposable local runs |
| `senderId` on user traces | Directly Usable | Pass. The field already exists and is optional; absence is truthful. | Pass | Pass | — |

## Change / Refactor Safety Verdict

Pass. The order runs contracts → records → collaborators → host → Org, Team, Agent → RD-004 → web → docs, with the Org first as the closest precedent. AR-006 must be designed before the Team-root step.

## Example Adequacy Verdict

| Topic | Needed | Present | Verdict |
| --- | --- | --- | --- |
| Tree, message, failure, note, RD-004 | Yes | Pass | Pass |
| Team-root routing to a root-hosted collaborator Agent | Yes | Pass | Pass (per-root table) |

## Material Premise Validation

P-001–P-004 are unchanged from rounds 1 and 2. P-001 and P-002 were resolved in SR-007 and are unaffected by SR-009.

### `P-005` — A user sends directly to a collaborator Agent in a Team run

- Requirement: REQ-011, AC-012; UXJ-002; VIS-005.
- Initiating basis: `User`. Surface: the collaborator row under a Team run (VIS-006/015) and its composer. Action: click the row and send.
- Forward path:
  1. Team stream SEND_MESSAGE → `RootTeamRun.executeAgentCommand(agentRunId, post_message)` (`root-team-run.ts:347-368`).
  2. `index.getAgent` → `withLiveLease` → `requireContainingTeamRun(agentRunId)` → `requireTeamRun(containingTeamRunId)`.
  3. A collaborator Agent hosted by `CollaboratorExecutionHost` is not inside the root `FlatTeamRun`, and the index has no execution kind or containing-Team value for it (`team-execution-index.ts` kinds are `configured | task | task_team_member`).
- Consequence: the message is rejected, or it is posted to the wrong `TeamRun`.
- Reachability: `Reachable` → AR-006. Round 4: resolved; the root `FlatTeamExecutionManager` serves collaborator Agents.

### `P-006` — A collaborator Agent in a Team run reports back with `send_message_to`

- Requirement: REQ-005, AC-005; UXJ-001 step 7.
- Initiating basis: `System`, the collaborator's normal tool call.
- Forward path:
  1. `send_message_to` → `deliverInterAgentMessage` or `deliverExactAgentMessage`.
  2. `authorizeIdentity(sender)` → `isCurrentAgent` → `isLiveAgent` (`root-team-run.ts:481-487`), which needs `teamRunResolver.getActive(containingTeamRunId)`.
  3. No containing `TeamRun` is defined for a root-hosted collaborator Agent.
- Consequence: the report is rejected (`COLLABORATION_CONTEXT_REQUIRED`), or liveness is computed against the wrong `TeamRun`.
- Reachability: `Reachable` → AR-006. Round 4: resolved; `isLiveAgent` treats `collaborator` kinds as live while the containing TeamRun is active, and authorization is unchanged.

### `P-007` — An extra copy of a collaborator Team addresses its teammates

- Initiating basis: `System` (REQ-013 copy).
- Effect: the copy's members resolve teammate addresses to the collaborator instance's members, the same pattern as the E-20 Org task-Team copies.
- Reachability: `Reachable`, but it is an approved non-goal (E-20). No finding.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. The verification for each finding is in `architecture-review-revision-record.md` under ARCH-REV-004.

- **AR-006: Resolved.** `CollaboratorExecutionHost` is dropped, and each root hosts collaborators in the backend that already routes its commands.
  - Org and Agent root: `rootAgents`/`teams` `prepareConfigured` with `hostKind`.
  - Team root:
    - collaborator Agents are added to the root `FlatTeamExecutionManager` through `addCollaboratorAgent`, with `FlatTeamMemberConfigResolver` handling collaborator nodes;
    - collaborator Teams go in `CollaboratorTeamExecutionRegistry`, registered with `teamRunResolver`;
    - the index gains the kinds `collaborator` and `collaborator_team_member`.
  - The table covers command, input, liveness and lease, authorization, `requireTeamRun`, physical scope, binding commits, status, events and tokens, restore, termination and the extra-copy host rule. Tests are listed.
- **AR-007: Resolved.** The hold until acceptance applies only to sends carrying `mentions`.
- **AR-008: Resolved.** The requirements doc names VIS-001–015 as normative, marks F-003 superseded by REQ-014, and updates the readiness text.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- Implementation note: `FlatTeamExecutionManager.getConfiguredAgent` and `getLeafAgentStatusSnapshots` look agents up through `runtimeContext.memberContexts`. `addCollaboratorAgent` must register the collaborator's member context there as well as its node in `FlatTeamMemberConfigResolver`, or the command, input and status paths will not find it.
- Implementation note: `ConfiguredAgentExecutionRegistry.getOrCreate` takes its activation mode from `runtimeContext.configuredMemberActivationMode`, not from a parameter. This is harmless: restore with no saved conversation plans `new` (verified). The implementation should still honour the design's `mode` parameter or record this deliberately.
- A collaborator Agent in a Team run gets the root Team's member context (the enclosing Team instructions, Team-scoped tools). This matches today's task Agents in Team runs and the AR-003 rule.
- Admission runs `validateMany` inside the root gate; watch the latency.
- RD-004 depends on each runtime recording `senderId`. This is an escalation trigger.
- Replay of cross-root direct deliveries does not show a sender (optional follow-up).
- E-20 and P-007 are an approved non-goal.
- Carried from earlier rounds: AGY/ACP standalone exposure, the prompt change, host restore under the gate, downgrade, token roll-up.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-005 and P-006 are resolved by the hosting and routing design. P-007 is an approved non-goal.
- Notes: the SR-010 package is ready for implementation from `5dcc5dc82`. The escalation triggers in the design spec remain in force.
