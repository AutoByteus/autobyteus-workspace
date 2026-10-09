# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/requirements-doc.md` (Approved, SR-005)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-spec.md` (SR-006, Ready)
- Supplemental Task Artifacts Reviewed: none exist. The user screenshot is evidence only.
- Relevant Solution Revision IDs: SR-005 (approved requirements), SR-006 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Architecture Design Complete (SR-006), routed by Solution Designer for `architectural_risk = High`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree at base `a573465d9` (`origin/personal`). I read these files: `collaborator-root-port.ts`, `collaborator-candidate-policy.ts`, `catalog-address-map.ts`, `collaborator-admission.ts`, `standalone-root-collaborators.ts`, `standalone-root-message-delivery.ts` (call sites), `standalone-agent-run-root.ts` (call sites), `standalone-host-member-context-builder.ts`, `standalone-agent-run-root-manager.ts` (host address), `collaborator-root-port-resolver.ts`, `agent-run-collaboration.ts` (GraphQL), `agent-collaboration-stream-handler.ts` (SEND_MESSAGE call site), `collaborator-mention-note.ts`, web `runMentionScope.ts`, `collaboratorCandidatesService.ts`, `activeAgentWorkspaceTarget.ts`, `agentRunCollaborationStore.ts#childTargetFor`, and the GraphQL agent-definition update input. I also read the project `DESIGN.md` mandatory rules.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: two shared contracts change. `MentionedCollaborator.inRun` → `presence`, with note wording that the server composes and the web parses. The GraphQL `collaboratorMentionCandidates` query gains an argument. The new host placement also feeds every Agent-root admission, address-map and catalog-copy path. I confirmed in code that `inRunPlacementsByDefinition` feeds `catalogView`, `inRunDefinitionIds`/`requireAdmissible` and `resolveMentions`.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. This covers standalone Agent roots only. A non-host agent's `@` menu and `list_available_agents` include the host. A mention of the host resolves to the existing host address. The note says to use `send_message_to` with that address and offers no `delegate_task` for that entry. Address messaging to the host is preserved.
- Relevant existing behavior and evidence confirmed: Yes. `listCandidates`, `requireEligible` and `catalogView` exclude `port.rootDefinition()`. The Agent-root port is viewer-less and reports the host definition as the root's own (`standalone-root-collaborators.ts:21-32`). The host is not an in-run placement. `resolveMessageRecipient` already routes the host address to the existing host (F-03, not re-traced line by line; it is unchanged).
- Scope guardrail confirmed: Yes. The in-scope use cases are UC-001, UC-002 and UC-004. Out of scope: prompts, the work packet, Team/Org, nested delegators, the draft `@` list and application-owned runs. Preserved: BEH-003, 004, 006, 007, 008 and 009. Review authority is recorded in the requirements doc.
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable: Yes. There are no blocking findings.
- Remaining material ambiguity: none

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (policy excludes `rootDefinition()`; web keys per root) | Pass (DS-001: the viewer reaches the port through scope → query → resolver; the policy is unchanged) | Confirmed | — |
| BEH-002 | User | Pass | Pass (`requireEligible` throws "own definition"; the stream handler passes `focusedAgentRunId`, which `StandaloneRootMessageDelivery.resolveMentions` checks and then drops) | Pass (DS-002: port(viewer) → `requireEligible` passes → `catalogAddressMap` gives the host its in-run address → `presence = run_agent` → note) | Confirmed | — |
| BEH-003 | Contract | Pass | Pass (F-03) | Pass (unchanged; the host stays a non-catalog address, so `catalogSource`/`bringIn` stay null) | Confirmed | — |
| BEH-005 | Contract | Pass | Pass (`listAvailable()` is viewer-less; the sender identity is available at `listAvailableAgents(sender)`) | Pass (DS-004) | Confirmed | — |
| BEH-006/007/008/009 | Preserved | Pass | Pass | Pass (no prompt or work-packet edits. Team/Org ports are renamed only. The host view is unchanged; see below.) | Confirmed | — |

Host-view preservation check: when the viewer is the host, `ownDefinition()` is the host, so `eligible` is exactly today's list. The added `inRunAddresses` entry for the host key is ignored by `CatalogAddressMap`, which iterates only `eligible`. `inRunDefinitionIds` already contained the host through `own`. The host's candidates, catalog addresses, admission refusals and `list_available_agents` are therefore identical to today's.

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior change; root cause "Missing Invariant" | — |
| Root-cause classification is explicit and evidence-backed | Pass | The viewer-less `port()` is confirmed at `standalone-root-collaborators.ts:85-87`, and the own-definition exclusion in the policy | — |
| Refactor decision is explicit | Pass | A small refactor is needed now: rename `rootDefinition` → `ownDefinition` and replace `inRun` with `presence` | — |
| Refactor decision is supported by concrete sections | Pass | Removal plan, file mapping and the rejected-compatibility log | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | Ownership | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | `@` menu for a focused agent | Pass | Pass | Pass (GraphQL and web service are thin) | Pass | Pass | Pass (web cache) | Pass |
| DS-002 | Send with `@host` → note | Pass | Pass | Pass | Pass | Pass (admission decides presence; the contract owns wording) | Pass | Pass |
| DS-003 | Child `send_message_to(host)` | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Child `list_available_agents` | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Stay Internal | Bypass Risk Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `StandaloneRootCollaborators` (port per viewer) | Pass | Pass | Pass | Pass | Every public method takes the viewer, and no caller builds a port itself. `StandaloneAgentRunRoot.collaboratorPortFor(viewer)` remains the GraphQL entry. |
| `CollaboratorCandidatePolicy` | Pass | Pass | Pass | Pass | No root-kind or viewer branch. The host/non-host difference is purely in port facts. |
| Note contract | Pass | Pass | Pass | Pass | `guidanceFor(entries)` serves both compose and parse. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server collaborators / Agent root / GraphQL / web / contract | Pass | Pass | Pass | Pass | Forbidden: policy branching on viewer, web filtering, wording outside the contract, and viewer on Team/Org ports. |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `collaboratorMentionCandidates(rootSubjectKind, rootRunId, focusedAgentRunId?)` | Pass | Pass | Pass (required for `agent`, ignored for Team/Org, validated in the resolver) | Low | Pass |
| `standaloneRootCollaboratorPortFor(tree, launch, viewerAgentRunId)` | Pass | Pass | Pass | Low | Pass |
| `CollaboratorRootPort.ownDefinition()` | Pass | Pass | Pass | Low | Pass |
| `MentionedCollaborator.presence` | Pass | Pass | Pass | Low | Pass |
| `InRunPlacementRank` + `run_agent` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Show host to non-host viewers | Pass | Pass | N/A | Pass | Reuses the policy's in-run placement handling |
| Resolve host mention | Pass | Pass | N/A | Pass | `resolveMentions` already prefers in-run addresses |
| Explicit `send_message_to` wording | Pass | Pass | N/A | Pass | Extends the single wording owner |
| Address messaging | Pass | Pass | N/A | Pass | Unchanged |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Serves Right Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `agent-collaboration/collaborators` | Pass | Pass | Pass | Pass | — |
| server `standalone-agent-run-root` | Pass | Pass | Pass | Pass | — |
| server `api/graphql` | Pass | Pass | Pass | Pass | — |
| `autobyteus-agent-presentation-contracts` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Guidance selection (compose + parse) | Pass | Pass | Pass | Pass | One `guidanceFor` |
| Preferred in-run placement (policy + admission) | Pass | Pass | Pass | Pass | The policy exports the existing sort; admission does not duplicate it |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MentionedCollaborator {name, kind, address, presence}` | Pass | Pass | Pass (a 3-state value replaces boolean + flag) | N/A | Pass | — |
| `InRunPlacement {address, rank}` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final mapping (14 files) | Pass | Pass | N/A | Pass | All in-place edits under their existing owners |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches Owner | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All changed files | Pass | Pass | Low | Pass | No files are added or moved |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `rootDefinition()` | Pass | Pass | Pass | Pass | All implementers are listed (3 factories, `emptyPort`, tests) |
| `MentionedCollaborator.inRun` | Pass | Pass | Pass | Pass | Admission (2 sites), contract, web spec |
| Viewer-less `port()` / `collaboratorPort()` | Pass | Pass | Pass | Pass | — |
| Per-root-only Agent cache key | Pass | Pass | Pass | Pass | Invalidation clears all of a root's keys |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Retention Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Note parser recognizing saved guidances | No. It is a version-agnostic reader for persisted text; compose emits only current wording. | Pass | Pass | — |
| GraphQL focused ID | No. It is required for `agent` and there is no default host view. | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Saved conversation text with `[Mentioned collaborators]` notes | Directly Usable — No Migration | Pass. For entries without `run_agent`, `guidanceFor` equals today's `NOTE_GUIDANCE` / `IN_RUN_NOTE_GUIDANCE`. `SAVED_NOTE_GUIDANCES` stay recognized. Entry lines are unchanged. | Pass | N/A | Pass | Run trees and collaborator entries are not written differently |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Contract → server collaborators → Agent root/GraphQL → web → E2E | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present And Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host-only and mixed note | Yes | Pass | Pass | Pass | — |
| Port facts per viewer | Yes | Pass | Pass (policy branch / web filter avoided) | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — the catalog address of a non-host definition differs between the host view and non-host views

- Related approved requirement or established contract: the design's own claim A-03 and its escalation trigger ("any change in catalog addresses for non-host definitions"); AC-009 (no second instance)
- Relevant behavior ID(s): BEH-002, BEH-005, BEH-003
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: (1) The user starts a standalone Agent run, and its host address is fixed when the package is created (`resolveHostAddress`: "the package's (stable once created)"). (2) The user later renames the host's Agent definition. The `updateAgentDefinition` mutation exposes `name`. (3) Another shared definition's name produces the same segment as the host's new name.
- Support evidence: the agent-definition edit surface (`UpdateAgentDefinitionInput.name`). Same-slug definitions are an explicitly handled case in `CatalogAddressMap` (hash suffix on collision).
- Forward path: in a non-host view, the host is now in `eligible`, so `segmentCounts[slug(newName)] = 2` and the other definition D is hashed. In the host view, the host is excluded, the count is 1, and the stored host address's first segment ≠ `slug(newName)`, so D is unhashed. When the host address segment equals the host's name slug (the normal case, with no rename), `used` already contains it and both views hash D identically, so A-03 holds.
- Lifecycle preconditions and material consequence: the issue arises only when an address for a not-yet-in-run D is learned in one view and used in the other (for example, the host forwards `/planner` to a child). The using side gets not-found. There is no wrong recipient and no second instance, because `requireAdmissible` still refuses in-run definitions. Once D is brought in, it keeps one in-run address for all viewers.
- Reachability: `Reachable` (requires three independent conditions)
- Review consequence / proportionate response: non-blocking. Qualify A-03 and the "catalog addresses identical across viewers" test intent to the normal precondition (host address segment = host name slug), and record the post-rename divergence as residual risk. No new machinery is warranted, given a not-found-only consequence (AR-001).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

Non-blocking only.

- **AR-001** — type: Design Impact (documentation accuracy); severity: Low, non-blocking; protects: the design's own A-03 claim and AC-009 test intent; scope: Within Approved Scope; changes approved behavior: No.
  - Evidence: MP-001, `catalog-address-map.ts` collision rule, `standalone-host-member-context-builder.ts#resolveHostAddress`, and `UpdateAgentDefinitionInput.name`.
  - Required update: none before implementation. Recommended: the implementer pins the cross-viewer stability test for the normal case (host address segment = host name slug), and the design or handoff notes the post-rename divergence (not-found only) as residual risk. Do not add viewer-independent address-map machinery for it.
  - Proportionality: the consequence is a not-found on a cross-viewer forwarded address in a rare configuration.
  - Recipient: implementation_engineer (note), solution_designer (informational)
- **AR-002** — type: implementation note; severity: Low, non-blocking; scope: Within Approved Scope.
  - Evidence: existing tests that call `collaboratorMentionCandidates(rootSubjectKind:"agent", …)` without a focused ID. These must pass `focusedAgentRunId` once it becomes required for `agent`. One of them, `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts:324`, is not in the design's test list. The other, `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts:230`, is in A-12.
  - Required update: the implementer updates all `agent`-kind query callers, using the host run ID as the focused agent to preserve the host-view assertions.
  - Recipient: implementation_engineer

## Classification

N/A. The result is Pass. AR-001 and AR-002 are non-blocking.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules)

## Residual Risks

- MP-001 / AR-001: catalog addresses of a not-in-run definition can diverge between the host and non-host views after a host-definition rename plus a same-slug definition. The consequence is not-found only.
- The GraphQL `focusedAgentRunId` is not checked for membership in the root. An unknown ID gets the non-host view (the host is listed). This affects only menu contents. The send-time re-check already verifies membership (`StandaloneRootMessageDelivery.resolveMentions`), so no extra validation is required.
- `list_available_agents` is opt-in per agent (A-11), so REQ-003 benefits only agents that have the tool enabled.
- In a mixed note, the generic `delegate_task` sentence precedes the host sentence. The host sentence explicitly says `delegate_task` cannot target the host, which satisfies REQ-004. A refused delegation remains harmless (F-03).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 reachable, with a proportionate non-blocking response)
- Notes: the design keeps one eligibility owner with no viewer or root-kind branches. It expresses the viewer purely as Agent-root port facts. The host view is provably unchanged, and the saved notes stay parseable. Proceed to implementation with AR-001 and AR-002 as implementation notes.
