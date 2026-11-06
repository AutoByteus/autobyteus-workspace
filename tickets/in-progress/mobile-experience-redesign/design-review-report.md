# Design Review Report — mobile-experience-redesign (autobyteus-277)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/requirements-doc.md` (SR-003, Approved)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-01…E-27)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-003)
- Reviewed Design Spec: `…/design-spec.md` (SR-003, ticket docs at commit `2230858ab6`)
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md` with VIS-001…029 at design rev `976457a4` (read in place, `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/`); `follow-ups.md`; `solution-handoff.md`; `product-design-request.md` (not behavior-defining)
- Relevant Solution Revision IDs: `SR-003`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Solution Designer `Architecture Design Complete` (Large / High), 2026-11-06
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `codex/mobile-experience-redesign` @ `2230858ab6` (base `origin/personal` @ `e00581d485`). Code opened at the cited lines: `useWorkspaceHistorySelectionActions.ts`, `useWorkspaceHistorySubjectActions.ts`, `runHistorySelectionActions.ts:112-139`, `runHistoryStore.ts:120-140, 495-529`, `runHistoryLoadActions.ts:96-135, 406-431`, `agentSelectionStore.ts:48-88`, `activeContextStore.ts:72-150`, `useRunListDisclosure.ts`, `RunListPanel.vue:100-310`, `RunListRow.vue:220-232`, `AgentRunTaskRows.vue:58-104`, `agentRunCollaborationStore.ts:60-140, 269-281`, `agentOrgHistoryRows.ts:210-240`, `AgentOrgRunMemberTree.vue:136-150`, `WorkspaceAgentRunsTreePanel.vue:118-120, 380-409`, `runListStore.ts`, `runListProjection.ts:84-100`, `AgentWorkspaceSurface.vue`, `TeamWorkspaceSurface.vue`, `useAgentRunCollaborationSync.ts`, `agentContextsStore.ts:76-110, 160-173`, `useEventMonitorFilePreview.ts:1-110`, `useMobileWorkCatalog.ts:75-345`, `MobileRemoteAccessShell.vue:150-170`, `useRunStopAction.ts`, `useTaskRootNavigation.ts`, `mobileFeatureGates.ts`, `remoteCollaborationStore.ts`, `remoteCollaborationOffersStore.ts`, server `remote-access-route-policy.ts`, `remote-collaboration-settings.ts`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: the phone shell is rebuilt; seven shared owners used by the desktop are extended or extracted; ownership of "what is open" moves to `activeWorkspaceTarget`; screen state moves into the `/mobile` route.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. Confirmed against the code: shared open actions (callers in `RunListPanel.vue:202,214`, `WorkspaceAgentRunsTreePanel.vue:162,257`, `useRunStopAction.ts:21`, `useTaskRootNavigation.ts:22`) and both desktop surfaces change.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (with the design-level corrections below; no requirement gap)
- Approved requirements / intended behavior understood: Yes. REQ-001…REQ-009, AC-001…AC-010, DEC-001…DEC-008, and the Product spec (UXJ-001…008, TR-001…019, VIS-001…029).
- Relevant existing behavior and evidence confirmed: Yes. E-01, E-03, E-10…E-22 and E-27 match the code at their cited lines. E-16 is confirmed: `selectTreeRunFromHistory`'s local branch calls `selectRun` unconditionally (`runHistorySelectionActions.ts:132`), and the stores already honor `selectionMode: 'mobile'` (`agentRunOpenCoordinator.ts:116`, `teamRunOpenCoordinator.ts:78,147`, `runHistoryTeamMemberInspectionActions.ts:90`). The only "shell navigation" in `selectRun` / `clearSelection` is `useWorkspaceCenterViewStore().showChat()` (`agentSelectionStore.ts:81-87`). The Org subject action hard-codes `router.push('/workspace', …)` (`useWorkspaceHistorySubjectActions.ts:71`).
- Scope guardrail confirmed: Yes. In-Scope Use Cases UC-001…UC-006. Out of Scope: desktop, pairing, shells, node switching (391), peer start, Team/Org start, push. Preserved Behavior Boundary: pairing, notice, configure→create→first message, shared conversation/composer, desktop behavior, 278 rules, 358 gap. Review Authority recorded.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity: none in the requirements. The open points are design sequencing (AR-001…AR-003).
- Statements about existing code the design relies on, opened at their cited lines:
  - Accurate: E-10…E-22, E-27.
  - Incomplete: "Its desktop callers are `RunListPanel.vue:200` and the Workspaces/Projects tree hosts … (implementation lists them with `grep`)". The count is not done at the call sites (AR-007).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (AR-004: one default to state) | Confirmed | AR-004 |
| BEH-002 | User | Pass | Pass | Fail: the DS-003 order and the opening state are undefined; Org opening has two navigation writers | Needs Correction | AR-001, AR-002 |
| BEH-003 | User | Pass | Pass | Fail: Back after an Org run loses the open run's mark | Needs Correction | AR-003 |
| BEH-004 | User | Pass | Pass | Fail for the "after opening an Org run" preselection | Needs Correction | AR-003 |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…029 (rev `976457a4`) | Pass | Pass | Pass | Pass | Pass | None blocking. Product-owned cosmetic points are under Residual Risks. |
| `follow-ups.md` (FU-001 = autobyteus-391) | Pass | Pass | Pass | Pass | Pass | — |
| `product-design-request.md` | Pass | Pass | Pass | Pass | Pass (not behavior-defining) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec "Task Design Health Assessment" | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue` + `Duplicated Policy`. E-01 (own list), E-03/E-20 (own target, stale id copy at `MobileChat.vue:73-77`) and E-23 confirmed | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Refactor needed now: Yes" | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, the shared extractions and the options are concrete | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | History load and poll | Pass | Pass | N/A | Pass | Pass | Pass (401 observation point unclear, AR-008) | Pass |
| DS-002 | Tree rows | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Open a row | Pass | Fail | Pass | Pass | Fail: when the push happens relative to the async open is not defined, and for an Org both the subject action and `openRun()` push | Pass | Fail (AR-001, AR-002) |
| DS-004 | Screen state | Pass | Pass | N/A | Pass | Fail: the `screen` key has two writers (`useMobileNavigation` and the Org subject action through `mobileRunScreenLocation`) | Pass | Fail (AR-002) |
| DS-005 | Views | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | New run | Pass | Pass | N/A | Pass | Pass | Pass | Pass (preselection after an Org run: AR-003) |
| DS-007 | Connection sheet | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 | File link | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 | Streams / promotion | Pass | Pass | N/A | Pass | Pass | Pass | Pass (see Residual Risks on where the collaboration sync is mounted) |
| Run-screen bounded local spine | opening → open | Pass | Fail | N/A | Pass | Fail: "opening" is defined as "target absent", but the previous run stays the target until the new open commits; the one-shot re-open has no established trigger | — | Fail (AR-001) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `activeContextStore.activeWorkspaceTarget` | Pass | Pass | Pass | Pass | `MobileChat`'s direct `getRun` reading is removed |
| `agentRunCollaborationStore` (`ensureStoredView`, `selectTaskRow`) | Pass | Pass | Pass | Pass | Moves the two `AgentRunTaskRows.vue:60-64, 95-101` rules |
| Shared open actions | Pass | Pass | Fail for the Org: it drives phone navigation | Fail | AR-002 |
| `useMobileNavigation` | Pass | Pass | Fail: the Org subject action writes `screen` through the exported constant | Fail | AR-002 |
| `useRunHistorySectionLoad` | Pass | Pass | Pass | Pass | Faithful slice of `WorkspaceAgentRunsTreePanel.vue:383-405` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone → shared stores and composables | Pass | Pass | Pass | Pass | — |
| `useEventMonitorFilePreview` → `useMobileNavigation` | Pass | Pass | Pass | Pass | The existing runtime branch (`useEventMonitorFilePreview.ts:4, 97-101`) is rebound, not new |
| `useWorkspaceHistorySubjectActions` → `composables/mobile/useMobileNavigation` | Pass | Pass | Fail | Fail | A new shared → phone edge, which exists only because the action drives phone navigation (AR-002) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MobileRowOpen` (discriminated) | Pass | Pass | Pass | Low | Pass |
| `useMobileRunOpening().open / reopenSelected` | Pass | Fail: the pending-open state and its ordering with `openRun()` are unspecified; `reopenSelected` has no established trigger | Pass | Medium | Fail (AR-001) |
| `useMobileNavigation` | Pass | Pass | Pass | Low | Pass (after AR-002) |
| `useWorkspaceHistorySelectionActions({ shell })` | Pass | Pass | Pass | Low | Pass. Also widen `runHistoryStore.selectTreeRun`'s options (`runHistoryStore.ts:524-528`) and the composable's `SelectionStoreLike` (AR-007) |
| `useWorkspaceHistorySubjectActions({ shell })` | Pass | Fail: in mobile it would navigate the phone shell and keep a `stop` branch nothing on the phone calls | Pass | Medium | Fail (AR-002) |
| `useTargetConversation(target)` | Pass | Pass | Pass | Low | Pass. `displayName` rule per kind to state (AR-005) |
| `useRunListDisclosure({ orgRunsExpandedByDefault })` | Pass | Pass | Pass | Low | Pass (AR-004) |
| `collaboration.ensureStoredView`, `selectTaskRow` | Pass | Pass | Pass | Low | Pass |
| `useRunHistorySectionLoad({ window, polling })` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runs, fold, tree sources, disclosure, target, peers/offers | Pass | Pass | N/A | Pass | `remoteCollaborationOffersStore.askAll` already asks every peer at once |
| History load and poll | Pass | Pass | Pass | Pass | — |
| Conversation binding | Pass | Pass | Pass | Pass | — |
| Phone row flattening | Pass | Pass | Pass | Pass | One flat list is the phone's presentation |
| Opening the run's own agent | Pass | Fail: the phone repeats `selectChild(run, null)` before `onSelectRun`, a rule that already exists in `RunListRow.vue:221-224` and `RunDefinitionGroups.vue:364` | Pass | Fail (Low) | AR-006 |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared run history | Pass | Pass | Fail for Org opening | Fail | AR-002 |
| Shared workspace conversation | Pass | Pass | Pass | Pass | — |
| Phone shell | Pass | Pass | Fail: the open sequence and the opening state (AR-001); the open Org on the list (AR-003) | Fail | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useTargetConversation` | Pass | Pass | Pass | Pass | AR-005: state the name rule |
| `useRunHistorySectionLoad` | Pass | Pass | Pass | Pass | — |
| `MobileScreenBar`, `MobileBottomSheet` | Pass | Pass | Pass | Pass | — |
| Task-row rules into the collaboration store | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MobileRunTreeRow` / `MobileRowOpen` | Pass | Pass | Pass | Pass | Pass | No run-id copies beyond `open`/`key` |
| Route query (phone keys + Org keys) | Pass | Pass | Fail: `screen` has two writers | N/A | Fail | AR-002 |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Fail` (Low). The callers of the two option-taking composables are deferred to `grep` (AR-007). The removal consumers are complete: every file from a `grep` of `mobileWorkStore|MobileWorkContext|useMobileWorkCatalog|…` is either in the removal plan or rebound (including `useEventMonitorFilePreview.mobileBoundary.spec.ts` and `runHistoryReadWindow.spec.ts`, which the step-6 `grep` gate covers).

Each domain word keeps one meaning (Principle 15): `Pass`. The screen words are local; "work" words are retired with `mobileWorkStore`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useMobileNavigation.ts` | Pass | Pass | N/A | Pass | — |
| `useMobileRunOpening.ts` | Fail | Pass | N/A | Fail | It needs the pending-open state (AR-001) |
| `useWorkspaceHistorySubjectActions.ts` | Pass | Fail | N/A | Fail | AR-002 |
| `MobileRunScreen.vue` | Pass | Pass | Pass | Pass | Its states follow AR-001 |
| `MobileRemoteAccessShell.vue` | Pass | Pass | N/A | Pass | AR-008: say which read the 401 rule observes |
| Others in the final mapping | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/mobile/{runList,runScreen,views,newRun,connection}/` | Pass | Pass | Low | Pass | — |
| `composables/mobile/`, `utils/mobile/` | Pass | Pass | Low | Pass | — |
| `composables/runHistory/useRunHistorySectionLoad.ts`, `composables/workspace/useTargetConversation.ts` | Pass | Pass | Low | Pass | — |
| `utils/remoteAccess/remoteAccessAuthFailure.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone model, screens, catalog, team launch and their tests | Pass | Pass | Pass | Pass | Matches the `grep` consumer map |
| Proposed mobile `stop` branch of the subject action | Fail | N/A | Fail | Fail | No caller on the phone: DEC-008 removes row actions, and `useRunStopAction` is used only by `ExistingRunConfigEditor.vue:183`, which is not on the phone. Do not add it (Principle 7) (AR-002) |
| `reopenSelected()` | Fail | N/A | Fail | Fail | New recovery machinery without an established trigger (AR-001; premise MP-002) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Phone shell | No | Pass | Pass | Rejection log is explicit |
| Shared options (`shell`, Org default) | No (a second shell, not a legacy path) | Pass | Pass | Defaults keep the desktop unchanged |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mobileWorkStore` (memory only); pairing session | Not Affected | Pass | Pass | N/A | Pass | The session key `autobyteus.remote_access.mobile_session` is unchanged |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–2 (shared extractions, options, desktop tests first) | Pass | Pass | Pass | Pass |
| Steps 3–7 (phone, rebind, removal with `grep` gate, docs) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Run screen reads the target | Yes | Pass | Pass | Pass | — |
| Task team row open | Yes | Pass | Pass | Pass | — |
| Org open on the phone | Yes | Fail | Pass | Fail | The example shows the subject action pushing `screen=run`, while DS-003 has `openRun()` push as well (AR-002) |
| Tap → run screen ordering | Yes | Fail | N/A | Fail | Missing (AR-001) |
| Back, poll | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A tap opens a run while the previously opened run is still the open target

- Related approved requirement: REQ-003, AC-003; spec UXJ-002 step 1, TR-001, "Run, conversation not attached".
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: `User`.
- Independent trigger: the user opens run A, presses ←, and taps another row B on the run list (UXJ-002 step 3: "To go elsewhere: tap another row").
- Support evidence: run list `/mobile`, tap a row body. This is the normal journey.
- Forward path:
  - B is a history run that is not loaded yet, or a Team run.
  - `onSelectRun` or `openTeam` → `runHistoryStore.selectTreeRun` → `openHistoricalRun` / `openTeamRun` reads the projection over the network (`runHistoryLoadActions.ts:406-431`).
  - The selection keeps A until the open commits: `beginSelectionIntent` changes only a token (`agentSelectionStore.ts:48-53`), and `selectRunWithoutShellNavigation` runs at commit (`agentRunOpenCoordinator.ts:114-118`).
- Lifecycle state and consequence: while B loads, `activeWorkspaceTarget` is still A.
  - If `openRun()` pushes before the commit, the run screen shows A's conversation and composer (a message could go to A).
  - If it pushes after the commit, the user sees no run screen and no "Opening…" during the load, contrary to UXJ-002 step 1.
- Reachability: `Reachable`.
- Review consequence: AR-001 (blocking).

### `MP-002` — The run screen is entered with a selection but no target, and needs a one-time re-open

- Related approved requirement: REQ-003 ("attaches again on its own after browser Back/Forward").
- Relevant behavior ID(s): BEH-002, BEH-003.
- Initiating basis kind: `User` (Back/Forward).
- Independent trigger: the browser or system Back/Forward between `/mobile` entries.
- Support evidence: the target design keeps the selection in `agentSelectionStore` across route changes. The agent and team target does not depend on the route (`activeContextStore.ts:76-147`). The Org target is restored by its own query keys on Forward. A reload empties the selection, and DS-004 sends the user to the list.
- Forward path: none found where the selection survives but the target disappears. The design names none either.
- Reachability: `Unclear`. No witness is given, and none was found.
- Review consequence: AR-001. Name the trigger with evidence, or remove `reopenSelected()` and keep "Opening…" plus the list fallback.

### `MP-003` — Returning to the list after opening an Org run

- Related approved requirement: REQ-005, AC-003 ("← returns to the list at the same scroll with the run marked"); REQ-006, AC-006 ("after opening a run" preselects its agent).
- Relevant behavior ID(s): BEH-003, BEH-004.
- Initiating basis kind: `User`.
- Independent trigger: tap an Org run or Org member row (VIS-001 shows Org members), then ← or the system Back.
- Forward path:
  - The Org target exists only while `route.query.rootSubjectKind === 'agent_org'` (`activeContextStore.ts:73-76`).
  - The Org's "selected" state also comes from the route (`RunListPanel.vue:149-155` → `useRunListDisclosure` `selectedAgentOrg`).
  - The subject action clears the agent/team selection (`useWorkspaceHistorySubjectActions.ts:68-70`).
  - `router.back()` returns to the `/mobile` entry without Org keys. The target becomes `null`, and no row is marked.
- Consequence: the Org row is not marked, and "+" preselects the Project Task Manager instead of the Org agent.
- Reachability: `Reachable`.
- Review consequence: AR-003 (blocking).

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements. The open items are design corrections (Findings).

## Review Decision

`Fail`. The basis is confirmed and most of the design is sound. Three spine-level gaps on the open path (AR-001…AR-003) must be closed before implementation, plus five small corrections (AR-004…AR-008).

## Findings

### AR-001 — Design Impact — High (blocking)

The open sequence and the run screen's "opening" state are undefined.

- **Protects:** REQ-003, AC-003; spec UXJ-002 step 1, TR-001, TR-016, and Product finding 2.
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** DS-003 reads "dispatch to the shared action … then `openRun()`", but it does not say whether the push waits for the async open. The run screen's `opening` state is "target absent, or its conversation not attached", but the previous run stays the target until the new open commits (MP-001).
  - Push first: the old conversation and composer show.
  - Push after: there is no screen and no "Opening…" during the load.

  The design also does not say what the run screen does when the open is superseded, fails, or returns the Team stream-recovery feedback. The desktop shows a toast for that feedback (`RunListPanel.vue:208-210`), and the composable requires the `presentTeamStreamRecoveryFeedback` parameter. `reopenSelected()` has no established trigger (MP-002).
- **Required update:**
  1. Name the one owner of the pending open (for example `useMobileRunOpening`, holding the tapped subject and its selection intent) and the order: push `screen=run` on tap, then run the shared action.
  2. Define the run screen's state from that owner: "Opening…" while a pending open exists, or while the target is not the tapped subject or its conversation is not attached; open otherwise. This way the screen never renders the previous target.
  3. State what the phone supplies for each required parameter of `useWorkspaceHistorySelectionActions` (`setTeamExpanded`, `toggleTeam`, `expandTeamMemberAncestors`, `emitRunSelected`, `startPresetChat`, `presentTeamStreamRecoveryFeedback`).
  4. State the outcome of a superseded or failed open within the approved states. If a visible message the spec does not have is needed, return it as a Requirement Gap; do not invent copy.
  5. Establish the `reopenSelected()` trigger or remove it.
- **Proportionate because:** a normal second tap shows the wrong agent's composer or a dead tap. The fix is a single pending state, not new machinery.
- **Recipient:** Solution Designer.

### AR-002 — Design Impact — Medium (blocking)

Opening an Org writes the screen state from two places and may push two history entries.

- **Protects:** REQ-005, AC-005 (Back walks view → run → list); REQ-003.
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:**
  - The interface table: the Org mobile shell "push[es] `mobileRunScreenLocation` with the Org keys".
  - DS-003 also runs `useMobileNavigation.openRun() (push screen=run)` after "the /mobile Org query".
  - So `screen` has two writers (`useMobileNavigation` claims to own it), and an Org open can add two history entries, so Back stays on the run screen once.
  - This also creates the only new shared → phone import (`useWorkspaceHistorySubjectActions` → `composables/mobile`).
  - The proposed mobile `stop` branch has no caller on the phone: DEC-008, and `useRunStopAction` is used only by `ExistingRunConfigEditor.vue:183`.
- **Required update:**
  - Let one owner drive the phone's Org sequence: `useMobileRunOpening` calls the subject action in the mobile shell, which opens and selects the Org context and does no navigation. Then `useMobileNavigation` pushes `screen=run` together with the Org keys.
  - The subject action can return its Org location (the keys it already builds at `useWorkspaceHistorySubjectActions.ts:71-76`) as data. This is a returned result, not a callback, so Principle 13 holds.
  - Drop the `mobileRunScreenLocation` import and the mobile `stop` branch.
  - Restate the "one writer per key" tradeoff accordingly.
- **Proportionate because:** it removes code and a dependency edge, and fixes Back.
- **Recipient:** Solution Designer.

### AR-003 — Design Impact — Medium (blocking)

The open Org run is lost when the user returns to the list.

- **Protects:** REQ-005, AC-003 ("← returns to the list … with the run marked"); REQ-006, AC-006 (preselection after opening a run).
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** MP-003. The Org target and the disclosure's `selectedAgentOrg` come only from the route query, `router.back()` removes them, and the subject action has cleared the agent/team selection. The design also does not say what the phone passes to `useRunListDisclosure`'s `selectedAgentOrg` and `hasSelectedChild`.
- **Required update:** state where the open Org lives while the list is shown, and how the list mark, the disclosure reveal and New run's preselection read it. For example, the list entry keeps the Org keys: `openRun` replaces the current list entry with the Org keys, then pushes `screen=run`, and an agent/team open removes them as designed. Or another single source that is not a phone copy of the target.
- **Proportionate because:** it is a normal journey (an Org run is on the main screen, VIS-001) and the fix is a navigation rule.
- **Recipient:** Solution Designer.

### AR-004 — Design Impact — Low

The phone's default fold for an Org's delegated task teams is unstated.

- **Protects:** REQ-002 ("a team's members folded"); VIS-001, VIS-002.
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** the desktop unfolds Org task teams by default (`useRunListDisclosure.ts:73`; `projectAgentOrgHistoryRows` "Delegated Teams start expanded", `agentOrgHistoryRows.ts:214`), while a standalone run's task teams start folded (`agentRunCollaborationStore.ts:272`). The design changes only the Org run's own default.
- **Required update:** state the phone's default for Org task teams against REQ-002. If it differs from the desktop, add it to the same construction option.
- **Recipient:** Solution Designer.

### AR-005 — Design Impact — Low

The display-name rule of `useTargetConversation` is not stated.

- **Protects:** Preserved Behavior Boundary (desktop unchanged); REQ-003 (bar name).
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** the surfaces derive the name differently:
  - `AgentWorkspaceSurface.vue:85`: `agentDefinitionName || 'Agent'`;
  - `TeamWorkspaceSurface.vue:68-70`: `agentDefinitionName || address-derived || teamDefinitionName`;
  - the agent surface's header uses the run title (`:93-101`).
- **Required update:** give the per-kind name rule that the composable owns, and confirm that the headers keep their own titles.
- **Recipient:** Solution Designer.

### AR-006 — Design Impact — Low

The "open the run's own agent" rule is copied a third time.

- **Protects:** REQ-003 (one open rule per kind, DEC-001 intent).
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** `collaboration.selectChild(run, null)` then `onSelectRun` already lives in `RunListRow.vue:221-224` and `RunDefinitionGroups.vue:364`. The phone would add a third copy, the same pattern the design moves into the store for task rows (Case 6).
- **Required update:** give it one owner (for example the agent open in the selection actions, or a collaboration-store method used by all three), or record why it stays duplicated.
- **Recipient:** Solution Designer.

### AR-007 — Design Impact — Low

The consumers of the option changes are not counted at their call sites (Principles 1 and 11).

- **Protects:** Preserved Behavior Boundary (desktop unchanged).
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:**
  - `useWorkspaceHistorySelectionActions`: `RunListPanel.vue:202`, `WorkspaceAgentRunsTreePanel.vue:257`, `tests/e2e/fixtures/task-agent-sibling-sidebar.page.vue:89`.
  - `useWorkspaceHistorySubjectActions`: `RunListPanel.vue:214`, `WorkspaceAgentRunsTreePanel.vue:162`, `useRunStopAction.ts:21`, `useTaskRootNavigation.ts:22`.
  - Also changing: `runHistoryStore.selectTreeRun`'s options type (`runHistoryStore.ts:524-528`, only `selectionIntent` today) and the composable's `SelectionStoreLike` (`useWorkspaceHistorySelectionActions.ts:13-18`, no `selectRunWithoutShellNavigation`).
- **Required update:** list them in the Derived consumers and the change inventory.
- **Recipient:** Solution Designer.

### AR-008 — Design Impact — Low

The read that the 401 rule observes is unnamed.

- **Protects:** Preserved Behavior Boundary (pairing and unpair, E-27).
- **Scope:** Within Approved Scope. Changes approved behavior: No.
- **Evidence:** today the rule observes the catalog's own `fetchTree` result (`useMobileWorkCatalog.ts:313-327`, `MobileRemoteAccessShell.vue:160-170`). The new load composable swallows read errors, as the desktop host does (`WorkspaceAgentRunsTreePanel.vue:392-398`).
- **Required update:** say whether the shell observes the store's error (`historyFamilyErrors.workspace`) after the composable's read, or makes its own status-check read. Avoid a second `fetchTree` on mount.
- **Recipient:** Solution Designer.

## Classification

`Design Impact` (AR-001…AR-008). No `Requirement Gap` and no `Unclear` findings, except the conditional in AR-001 item 4.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- **Where the collaboration sync is mounted (non-blocking).**
  - `useAgentRunCollaborationSync` reacts to the selected host's status only while it is mounted (`useAgentRunCollaborationSync.ts:30-32`).
  - On the desktop, `AgentWorkspaceView` stays mounted beside the list. On the phone it would unmount with the run screen.
  - The stream itself stays attached (the store keeps the service), so the risk is low.
  - Consider mounting it in the paired shell, which holds the selection for every screen.
- **R-001 / R-002** as the design states. The poll pauses off-list and while hidden. Sleep and wake are verified on a device. Team stream recovery after a sleep goes through AR-001's failure outcome.
- **Product spec cosmetics (Product-owned, non-blocking).**
  - Its "Related requirements revision ID" still reads `SR-001`.
  - The State Transitions table has a malformed TR-014 row (it repeats the data-boundary row) and an un-numbered "First message" row.
  - The meaning is recoverable from TR-019, UXJ-002 and the data-boundary table.
- **The unified read-only rule** must be tested per surface, as the design's Guidance says. The rule is equivalent when each surface receives only its own Org kinds.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Fail` (MP-002 `Unclear` drives `reopenSelected()`; MP-001 and MP-003 `Reachable` drive AR-001 and AR-003)
- Notes: `task_size = Large`, `architectural_risk = High` confirmed. The direction (shared owners, route-driven screens, removal of the phone model) is sound. The corrections are confined to DS-003/DS-004 and a few stated rules. Re-review only the affected spines and these findings.
