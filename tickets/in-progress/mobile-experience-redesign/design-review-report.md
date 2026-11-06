# Design Review Report — mobile-experience-redesign (autobyteus-277)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/requirements-doc.md` (SR-003, Approved; unchanged in SR-004)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-01…E-32)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-004)
- Reviewed Design Spec: `…/design-spec.md` (SR-004; ticket package at commit `407f0ee8e9`, which only pins the Product spec revision over `f4e5eb6634`)
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md` with VIS-001…029 at design rev `e6ca7b6098` (spec text fixes only over `976457a4`: the SR reference, the TR-014 row, the TR-018/019 order; screenshots unchanged) (in place, `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/`); `follow-ups.md`; `solution-handoff.md`
- Relevant Solution Revision IDs: `SR-003` (requirements), `SR-004` (design revision for ARCH-REV-001)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: the Solution Designer's SR-004 revision for AR-001…AR-008. This is a scoped re-review of DS-003, DS-004, the run-screen and pending-open local spines, and AR-001…AR-008.
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis:
  - Round-1 evidence still applies; the code is unchanged (`f4e5eb6634` changes only ticket documents).
  - Rechecked this round:
    - `RunDefinitionGroups.vue:362-366`;
    - `onCreateRun` / `startPresetChat` callers (`grep`);
    - `WorkspaceAgentRunsTreePanel.vue:142-151`;
    - `app.vue:12` (the `ToastContainer` renders on every page);
    - `localization/messages/en/workspace.ts:40-42` (recovery copy);
    - `agentSelectionStore.ts:48-54`;
    - `useWorkspaceHistorySelectionActions.ts:51-150`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged in substance. SR-004 adds `onOpenAgentRun`, `agentOrgRouteQuery`, `useRouteSelectedAgentOrg` and `mobileRunOpeningStore`, which widens the shared surface slightly.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes, unchanged at SR-003.
- Relevant existing behavior and evidence confirmed: Yes. E-28…E-32 match the code. Specifically:
  - `onCreateRun` is used only by `WorkspaceAgentRunsTreePanel.vue:256`, plus tests and fixtures;
  - `RunDefinitionGroups.vue:362-366` holds the `selectChild(run, null)` + `onSelectRun` copy;
  - the toast container is global.
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain).
- Remaining material ambiguity: none.
- Statements about existing code the design relies on: the call sites in Change Scope and Guidance were opened and are accurate.
  - Test files that also use `startPresetChat` / `onCreateRun` will change with the move (`useWorkspaceHistorySelectionActions.spec.ts:86-161`, `workspaceSelectionComposition.spec.ts:66`). The typecheck will flag them; this is not a design issue.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass: the pending open is decided by `mobileRunOpeningStore`; one navigation writer | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass: the Org keys stay on the list entry | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass: preselection resolves after an Org run | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…029 (rev `e6ca7b6098`) | Pass | Pass | Pass | Pass | Pass | None. Round-1 cosmetic slips fixed at `e6ca7b6098` |
| `follow-ups.md` (FU-001 = autobyteus-391) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership + duplicated policy (E-01, E-03, E-20, E-23) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, extractions, options | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | History load and poll | Pass | Pass | N/A | Pass | Pass | Pass. The 401 rule reads the composable's returned result (AR-008) | Pass |
| DS-002 | Tree rows | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Open a row | Pass | Pass | Pass (`useMobileRunOpening` facade over the shared actions) | Pass | Pass. Sequence: `begin` → `openRun` (replace + push) → shared action → `commit`/`fail`, all driven by `useMobileRunOpening` | Pass (recovery toast off the main line) | Pass |
| DS-004 | Screen state | Pass | Pass | N/A | Pass | Pass. `useMobileNavigation` is the only `/mobile` writer, using the pure `agentOrgRouteQuery` | Pass | Pass |
| DS-005…DS-009 | Views, New run, connection, file link, streams | Pass | Pass | N/A | Pass | Pass | Pass | Pass (unchanged from round 1) |
| Pending open (local) | `idle → opening(key) → idle` | Pass | Pass | N/A | Pass | Pass | — | Pass |
| Run screen (local) | `opening` from the pending state → `open`; neither → list | Pass | Pass | N/A | Pass | Pass. The previous target is never rendered; no re-open | — | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `activeContextStore.activeWorkspaceTarget` | Pass | Pass | Pass | Pass | — |
| `agentRunCollaborationStore` | Pass | Pass | Pass | Pass | — |
| Shared open actions | Pass | Pass | Pass | Pass | Mobile shell: no navigation; reports the outcome |
| `mobileRunOpeningStore` | Pass | Pass | Pass | Pass | Written only by `useMobileRunOpening`, read by `MobileRunScreen` |
| `useMobileNavigation` | Pass | Pass | Pass | Pass | Only writer of `/mobile`'s query |
| `useRunHistorySectionLoad` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone → shared (including `agentOrgRouteQuery`) | Pass | Pass | Pass | Pass | — |
| `useEventMonitorFilePreview` → `useMobileNavigation` | Pass | Pass | Pass | Pass | The existing runtime branch, rebound |
| Shared → phone | Pass | Pass | Pass | Pass | No new edge (AR-002 resolved) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MobileRowOpen` | Pass | Pass | Pass | Low | Pass |
| `useMobileRunOpening().open` | Pass | Pass | Pass | Low | Pass |
| `mobileRunOpeningStore` (`begin`/`commit`/`fail`, key = row key) | Pass | Pass | Pass | Low | Pass |
| `useMobileNavigation` (`openRun({ orgQuery?, replace? })`, …) | Pass | Pass | Pass | Low | Pass |
| `useWorkspaceHistorySelectionActions({ shell })` + `onOpenAgentRun` | Pass | Pass | Pass | Low | Pass |
| `useWorkspaceHistorySubjectActions({ shell })` | Pass | Pass | Pass | Low | Pass |
| `agentOrgRouteQuery(run, command, isActive)` | Pass | Pass | Pass | Low | Pass (see the Residual Risks note on `mode`) |
| `useRouteSelectedAgentOrg()` | Pass | Pass | Pass | Low | Pass |
| `useRunHistorySectionLoad` result `{ ok } \| { ok:false, cause }` | Pass | Pass | Pass | Low | Pass |
| `useTargetConversation(target)` | Pass | Pass | Pass | Low | Pass (the name rule is stated) |
| `useRunListDisclosure({ defaultExpansion })` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runs, tree sources, disclosure, target, peers/offers (`askAll`) | Pass | Pass | N/A | Pass | — |
| Recovery feedback | Pass | Pass | N/A | Pass | The desktop's toast and copy (E-31); no new copy |
| Opening the run's own agent | Pass | Pass | Pass | Pass | `onOpenAgentRun`, one owner, three users (AR-006) |
| Pending open | Pass | Pass | Pass | Pass | A small phone store; the run screen and the list both need it across components |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared run history | Pass | Pass | Pass | Pass | — |
| Shared workspace conversation | Pass | Pass | Pass | Pass | — |
| Phone shell | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useTargetConversation`, `useRunHistorySectionLoad`, `useRouteSelectedAgentOrg`, `agentOrgRouteQuery` | Pass | Pass | Pass | Pass | Each replaces two copies, or serves two shells |
| `MobileScreenBar`, `MobileBottomSheet` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MobileRunTreeRow` / `MobileRowOpen` | Pass | Pass | Pass | Pass | Pass | — |
| Route query (phone keys + Org keys) | Pass | Pass | Pass (one writer) | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (AR-007 resolved).

Each domain word keeps one meaning (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useMobileRunOpening.ts`, `mobileRunOpeningStore.ts` | Pass | Pass | N/A | Pass | — |
| `useMobileNavigation.ts` | Pass | Pass | N/A | Pass | — |
| `useWorkspaceHistorySubjectActions.ts` | Pass | Pass | N/A | Pass | — |
| `MobileRemoteAccessShell.vue` | Pass | Pass | N/A | Pass | Mounts the collaboration sync while paired |
| Others | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/mobile/*`, `composables/mobile/`, `stores/mobileRunOpeningStore.ts`, `utils/mobile/` | Pass | Pass | Low | Pass | — |
| `composables/runHistory/` (load, route Org), `composables/workspace/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone model, screens, catalog, team launch, their tests | Pass | Pass | Pass | Pass | — |
| Mobile `stop` branch | Pass (not added) | N/A | Pass | Pass | — |
| `reopenSelected()` | Pass (removed) | N/A | Pass | Pass | MP-002 |
| Duplicate `selectChild(run, null)` rule; the two route-Org copies; `onCreateRun`/`startPresetChat` in the shared composable | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Phone shell; shared options | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mobileWorkStore` (memory), the new pending store (memory); pairing session | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–2 (shared, desktop tests green) | Pass | Pass | Pass | Pass |
| Steps 3–8 (phone, rebind, removal, docs, verify) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tap → run screen order | Yes | Pass | Pass | Pass | — |
| Org open on the phone | Yes | Pass | Pass | Pass | — |
| Run screen target, task team row, Back, poll | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A tap opens a run while the previous run is still the open target

- Reachability: `Reachable` (round 1).
- Review consequence: resolved. `opening` is decided by `mobileRunOpeningStore.pending`, the push precedes the action, and the screen never renders the target while pending (design-spec Bounded Local Spines, DS-003).

### `MP-002` — Selection present but no target on entering the run screen

- Reachability: `Not Reachable` on the evidence (E-29); no witness found by either role.
- Review consequence: `reopenSelected()` is removed. Neither pending nor target → list.

### `MP-003` — Returning to the list after opening an Org run

- Reachability: `Reachable` (round 1).
- Review consequence: resolved. `openRun` writes the Org keys onto the list entry, so the Org target, the row mark (`useRouteSelectedAgentOrg` → disclosure) and the preselection resolve after ←.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The design is ready for implementation.

## Findings

None open. AR-001…AR-008 are resolved; see `ARCH-REV-002` in the revision record.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

Non-blocking; for implementation and the next design touch.

- **Pending-open commit attribution.**
  - `emitRunSelected` is one callback for one shared instance, and the design maps it to "the pending key".
  - If an earlier open (A) commits after the user pressed ← and tapped B, but before B's shared action takes its selection intent, A's notification could commit B's key. That window is the `await openRun` of B.
  - A cheap guard either closes the window: `mobileRunOpeningStore.begin` calls `selectionStore.invalidateSelectionIntent()` (`agentSelectionStore.ts:54`), or the commit checks the emitted `runId` against the subject.
  - Implementation may take either; no design change is required.
- **A failed open leaves the list entry rewritten.** `openRun` rewrites the list entry before the action. After a failed Org open, the list keeps that Org's keys, so it may mark an Org whose open failed. After a failed agent/team open, a previously open Org's keys are gone. This is acceptable for an error path; note it in tests.
- **The Org `mode` key.** On the phone, `mode` comes from the history item's `isActive` before the open. On the desktop it comes from `context.isActive` after `openForInspection`. `activeWorkspaceTarget` only checks that `mode` is `active` or `history` (`activeContextStore.ts:73`), so this is harmless today. Keep `agentOrgRouteQuery` the single builder.
- **Stale text in design-spec** (editorial; the Ownership Map and the Revision table are authoritative):
  - E-19's row and the Return/Event Spine still say the run screen mounts `useAgentRunCollaborationSync`; the Ownership Map now puts it in the paired shell;
  - "Architecture evidence is E-10…E-27" omits E-28…E-32;
  - the Health Assessment's "Split sequence" line still says "the composable still calls the router itself", but in mobile mode it does not.
- **R-001 / R-002** as the design states; verify on a device.
- **The unified read-only rule:** test it per desktop surface.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `task_size = Large`, `architectural_risk = High`. `ARCH-REV-002` over SR-004 (package commit `407f0ee8e9`, Product spec `e6ca7b6098`). Requirements unchanged at SR-003.
