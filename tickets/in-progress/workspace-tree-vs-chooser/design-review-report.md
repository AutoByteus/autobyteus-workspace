# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/requirements-doc.md` (SR-003, approved by the Solution Designer within the direction; user informed; DEC-006 and AC-008 added)
- Upstream Investigation Notes: `…/investigation-notes.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md`
- Reviewed Design Spec: `…/design-spec.md` (SR-003, Ready; user approval of the design `Not required`)
- Supplemental Task Artifacts Reviewed: none; `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Solution Designer re-review request (SR-003, for ARCH-REV-001), 2026-11-05
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail: AR-001, AR-002)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser` @ `3ef5e33eec` (no source changes). Code opened at the lines cited below. The project documents exist (`DESIGN.md`, `TESTING.md`, `RELEASE.md`), so no missing project document is in scope.

## Round 2 Scope (SR-003)

- **AR-001 is resolved.**
  - The agent-run point that brings a folder back for good is now the GraphQL `prepareAgentRun` resolver (`agent-run.ts:233`). That is the path the user's chat and mobile actually take (`agentRunStore.ts:190-211`).
  - A peer's delegation calls the service directly, not the resolver (E-09, `remote-delegation-receiver.ts:98`), so it does not re-show.
  - A cancelled or never-started prepared run leaves the folder shown. That is accepted: the user chose the folder.
  - `createAgentRun` gets no re-show and goes to FU-001, with the reason (a public-API caller check is needed before removal). That is consistent with Principle 7.
  - The point list, the escalation trigger and AC-004 now name the real path.
- **AR-002 is resolved by DEC-006 and AC-008**, decided within the direction and consistent with DEC-001's reasoning.
  - A hidden folder is shown in the tree and the phone list while one of its runs is active, and it hides again when none is. Only creation and "Add workspace" bring it back for good.
  - It is a view rule over run status the read model already has (`runHistoryReadModel.ts:97-106`, `toRunStatus`; local contexts `:246-283`). So every restore and resume path is covered without wiring each activation point. That is simpler than adding re-show calls at three restore mutations plus first-message resumes.
  - "Active run of a folder" is defined: the folder's history groups (standalone, team, org) or the user's own open local or draft runs there, with an active status.
  - Delegated copies are excluded: they are not in a folder's groups (E-10), and an opened delegated-copy context must not count, with a test. AC-003 holds.
- **Recommendation adopted:** writes to the hidden list are serialized.
- Recommendation (non-blocking): the tree's read model and the phone's work list apply the same "shown, or hidden with an active run" rule. Give it one owner, for example one predicate in the workspace or run-history read model that both call, so the two lists cannot drift (Principle 11).

## Routing Classification Review

- Task size: `Medium` (about 15–20 files in existing areas); architectural risk: `High` (new persisted state, a contract field and mutation for every client, and the completeness of the re-show rule across launch surfaces). Confirmed.
- Independent Architecture Review required by the classification: `Yes`

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for REQ-001, REQ-002, REQ-004 and REQ-005. REQ-003 has a path error (AR-001) and an unaddressed supported case (AR-002).
- Approved requirements / intended behavior understood:
  - "Shown in the tree" is separate from "registered and choosable".
  - Tree "Hide" hides the folder; chooser "Remove" unregisters it.
  - A hidden folder returns only when the user starts a run there or adds it again.
  - Internal uses never un-hide.
  - No data loss; the active-run guard stays; the server keeps the state; `workspaces.json` is unchanged.
- Relevant existing behavior and evidence confirmed:
  - Removal: `workspace-manager.ts:207-258` (E-01).
  - The registry is a strict flat map (E-02).
  - Any use re-registers (E-03).
  - One `workspaces` list serves every client (E-04).
  - The tree skips the runs of unlisted folders (E-05).
  - The chooser reads `allWorkspaces` (E-06, E-07).
- Scope guardrail confirmed: UC-001…UC-003. Out of scope: Project folder links and deleting files or history.
- Every prospective blocking finding is traceable: `Yes` (AR-001 → REQ-003 / AC-004; AR-002 → REQ-003 / DEC-001)
- Statements about existing code the design relies on:
  - **"`createAgentRun` (`agent-run.ts:201`) is the user's command" for agent runs: the web never calls it.** The GraphQL `createAgentRun` mutation appears in the web only in `graphql/mutations/agentMutations.ts:13-15` and the generated types.
    - Desktop chat and mobile start agent runs through `PrepareAgentRun` (`stores/agentRunStore.ts:7,190-211`; mobile `useMobileRunLaunchCoordinator.ts:163-185` builds a draft that the same store prepares).
    - The prepared run is activated by the first message (`agent-run-service.ts:262-270` `prepareAgentRun` / `activatePreparedRun`; the command path).
    - See AR-001.
  - Team and org launches do use `CreateAgentTeamRun` / `CreateAgentOrgRun` (`stores/agentTeamRunStore.ts`, `stores/agentOrgRunStore.ts`). Confirmed.
  - The web's internal `createWorkspace` callers are safe:
    - The history fallback calls `createWorkspace` only when no registered workspace matches the root path (`runHistoryLoadActions.ts:486-493`). A hidden folder stays registered, so it is found and the mutation is not called.
    - The team launch's per-member `createWorkspace` (`agentTeamRunStore.ts:419`) is part of the user's own team launch.
    - Mobile launch (`useMobileLaunchWorkspaces.ts:96`) is the user's own launch.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User / System | Pass | Pass (SR-003: `prepareAgentRun`; DEC-006) | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Feature; one list with two meanings | — |
| Root cause explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`; vocabulary drift ("remove" meaning unregister) | — |
| Refactor decision explicit | Pass | One owner for the hidden state behind `WorkspaceManager`; one server-computed field | — |
| Supported by concrete sections | Pass | DS-001…DS-004 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Hide | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Remove | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Re-show | Pass | Pass (`prepareAgentRun`, team, org, `createWorkspace`) | Pass | Pass | Pass | Pass | Pass |
| DS-004 | List field plus the active-run view rule | Pass | Pass (DEC-006; delegated copies excluded) | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager` (registry, `WorkspaceTreeVisibility`, `WorkspaceRemovalGuard`) | Pass | Pass | Pass | Pass | The only caller of the visibility store |
| Web `workspaceStore` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| GraphQL → `WorkspaceManager` → stores | Pass | Pass | Pass | Pass | Internal run paths keep `ensureWorkspaceByRootPath` only |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `hideFromWorkspacesTree(workspaceId)`, `showInWorkspacesTree(workspaceId)` | Pass | Pass | Pass (`agent_ws_*`) | Low | Pass |
| GraphQL `hideWorkspaceFromTree`, `WorkspaceMetadataInfo.shownInWorkspacesTree` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Active-run guard | Pass | Pass (`WorkspaceRemovalGuard`) | N/A | Pass | — |
| Atomic JSON write | Pass | Pass (follow the registry's pattern) | Pass (its own small file) | Pass | See the recommendation in Residual Risks |
| Refetch | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `workspaces/`, the GraphQL workspace type, the run mutations | Pass | Pass | Pass | Pass | — |
| web store, tree, phone list, chooser | Pass | Pass | Pass | Pass | — |

Kinds and forms (Principle 1), all traced:
- agent runs (prepare, then activate);
- team and org runs;
- "Add workspace";
- restore and resume (the view rule);
- internal re-registration;
- delegated copies.

## Reusable Owned Structures Verdict

N/A: one new store; no repeated structure.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `workspaces_hidden_from_tree.json` `{ workspaceIds }` | Pass | Pass | Pass (registry and hidden set are separate; unregistered IDs are dropped) | N/A | Pass | — |
| `WorkspaceMetadataInfo.shownInWorkspacesTree` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass`. The choosers read all; the tree and the phone list filter; path resolvers are unchanged. The Projects tree (`stores/projectRunsStore.ts`) lists runs by Project without consulting the workspace list. That is correct for it, but it is how a hidden folder's runs stay reachable (AR-002).

Domain vocabulary keeps one meaning per word: `Pass`. "Remove" keeps "unregister", and "hidden from the Workspaces tree" goes to `GLOSSARY.md`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Every mapped file | Pass | Pass | N/A | Pass | — |
| `api/graphql/types/agent-run.ts` re-show in `prepareAgentRun` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `workspaces/workspace-tree-visibility.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The tree action's call to `removeWorkspace` and its texts | Pass | Pass | Pass | Pass | — |
| The GraphQL `createAgentRun` mutation with no repository caller | Pass (FU-001, with evidence and the reason: public-API callers outside the repository unchecked) | N/A | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `workspaces.json` shape | No | Pass | Pass | An older build ignores the new file and shows everything; no data is lost |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `workspaces.json` | `Not Affected` | Pass (E-02: a strict flat map stays untouched) | Pass | N/A | Pass | — |
| `workspaces_hidden_from_tree.json` (new) | `Directly Usable — No Migration` | Pass: one owner; a missing file means none hidden; an unreadable file means none hidden with a warning (rule 7); atomic temp-then-rename writes; unregistered IDs ignored on read and dropped on write | Pass | N/A | Pass | This answers the designer's second question. See the write-serialization note in Residual Risks |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–4 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Storage, re-show, the user's scenario | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — The user starts an agent run from chat in a hidden folder

- Related requirement: REQ-003, AC-004 ("start an agent run there from the chat: the folder and the new run are in the tree")
- Initiating basis kind: `User`
- Trigger: the user picks the hidden folder in the chat chooser (still offered, REQ-001) and sends the first message.
- Forward path: `ChatNewSurface` / chat draft → `agentRunStore` → GraphQL `prepareAgentRun` (`agentRunStore.ts:190-211`) → the first message activates the prepared run (`agent-run-service.ts:268-270`). No `createAgentRun` mutation is called, so the design's `showInWorkspacesTree` never runs.
- Consequence: the new run is active in a hidden folder and appears nowhere in the tree, against AC-004 and the scenario the user gave.
- Reachability: `Reachable` (the main path)
- Review consequence: AR-001. **Round 2: resolved** (re-show in `prepareAgentRun`).

### `MP-002` — The user restores a stopped run whose folder is hidden

- Related requirement: REQ-003 and DEC-001's rationale ("the tree shows where runs are; if you start a new run in a hidden folder and it stays hidden, that run is nowhere in the tree"); the hide guard's own reason (DS-001: "a hidden folder would hide its running run")
- Initiating basis kind: `User`
- Trigger:
  - DEC-005 allows hiding a folder with finished, non-archived runs.
  - Those runs stay reachable outside the Workspaces tree, for example in the Projects tree, which lists runs by Project without the workspace list (`projectRunsStore.ts`).
  - The user opens such a run and sends a message, or uses restore: `restoreAgentRun` / `restoreAgentTeamRun` / `restoreAgentOrgRun` (`agent-run.ts:284`, `agent-team-run.ts:220`, `agent-org-run.ts:221`).
- Forward path: the run becomes active in the hidden folder. No re-show point applies.
- Consequence: an active run that the Workspaces tree does not show, while that tree's hide action refuses folders with active runs for exactly this reason.
- Reachability: `Reachable`
- Review consequence: AR-002. **Round 2: resolved** by DEC-006 (an active run shows its folder while active) and AC-008.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Whether restoring or resuming a run in a hidden folder re-shows it (MP-002) | — | Decided: DEC-006, REQ-003, AC-008 | Resolved (SR-003) |

## Review Decision

- `Pass`

## Findings

None open. AR-001 and AR-002 are resolved (see ARCH-REV-002).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Residual Risks

- **Writes to the hidden file** are now serialized (SR-003, adopted).
- **An unreadable hidden file.** It is read as "none hidden", and the next write replaces it. That is acceptable under tolerant reads. Keeping the bad file aside would also preserve it for diagnosis. Recommendation.
- **Clients see changes on their next fetch.** There is no live feed; this is accepted in the design.
- **One owner for the "shown, or hidden with an active run" rule.** The tree's read model and the phone list should call one predicate rather than repeat the rule (Principle 11). Recommendation.
- **A draft counts as active.** A draft or open local run in a hidden folder shows it while active, by definition. That is the user's own choice of folder.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 resolved by SR-003)
- Notes:
  - Hidden state has one owner behind `WorkspaceManager`, in a separate additive file with serialized atomic writes.
  - A server-computed field marks hidden folders.
  - The user's creation commands bring a folder back for good: `prepareAgentRun`, team and org creation, and `createWorkspace`.
  - An active run shows its folder while it runs, and delegated copies never count.
  - task_size=Medium, architectural_risk=High.
