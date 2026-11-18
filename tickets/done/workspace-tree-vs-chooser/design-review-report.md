# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/requirements-doc.md` (SR-004, approved by the user through the Product Team's corrected design, 2026-11-05)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-01…E-16)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-004)
- Reviewed Design Spec: `…/design-spec.md` (SR-004, Ready; user approval of the technical design `Not required`)
- Supplemental Task Artifacts Reviewed:
  - the normative Product spec `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/ui-ux-spec.md` (VIS-001…VIS-017, `7712ec14`);
  - `product-design-request.md`;
  - `follow-ups.md` (FU-001…FU-003).
- Relevant Solution Revision IDs: `SR-004` (replaces SR-001…SR-003)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4` (re-review of the revised SR-004 package after ARCH-REV-003)
- Trigger: Solution Designer re-review request (SR-004 revised: "ARCH-REV-003 Resolution"), 2026-11-05
- Prior Review Round Reviewed: `3` (ARCH-REV-003, Fail: AR-003, AR-004)
- Latest Authoritative Round: `4`
- Current-State Evidence Basis:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser` at `8fe7b2e57e` (SR-003 server work, to be reverted), with uncommitted SR-003 web work. The base code was read at `3ef5e33eec`.
  - The 378 design and branch are referenced but not re-reviewed. The port's architecture passed there (ARCH-REV-003 of 378); its code is treated as new here.

## Round 4 Scope (SR-004 Revised)

- **AR-003 is resolved.** `requirements-doc.md` now states SR-004 only:
  - the user's approval;
  - Data Continuity `No` ("Nothing new is stored");
  - new BEH-001…BEH-005, UC-001…UC-003 and the Preserved boundary;
  - DEC-001…DEC-007 withdrawn.

  AC-012 names the team-only, Org-only and draft-only folder cases. There is no new behavior: it matches the Product spec and DEC-010.
- **AR-004 is resolved.**
  - `hasListedRun` is applied in `buildRunHistoryNavigationProjection` (`runHistoryNavigationProjection.ts:159`). It runs after Org groups are attached and team rows are grouped per folder root, and before the indexes and ancestries are built.
  - That projection is the store's navigation state (`runHistoryNavigationStoreActions.ts:20-58`). Its folder nodes are read only by the Workspaces tree state, through `getTreeNodes()` (`useWorkspaceHistoryTreeState.ts:59`), and one e2e fixture page (`tests/e2e/fixtures/task-agent-sibling-sidebar.page.vue:78`).
  - So the phone is unchanged, and the Runs view uses `teamNodes`, which no rule touches.
  - The shared `buildRunHistoryTreeNodes` stays unchanged for Projects.
  - A navigation patch into a dropped folder falls back to a full rebuild.
  - Tests: team-only, Org-only and draft-only folders, and an unchanged Projects view.
- **The window by view is adopted** (DESIGN.md rule 3).
  - The host sets `null` for Runs and 6 for Workspaces and Projects, with one fetch on a view change. The poll is uncapped only while Runs is shown, and the display cap is dropped.
  - Shrinking the window has its own test. It matters because the retired-run reconcile uses the window (`runHistoryLoadActions.ts:130`): runs past the new cap must not be treated as retired.
- **The expansion prune is adopted.** The Workspaces tree state prunes the expansion of folders that leave its node list, which covers both a removal and the folder rule. The removal composable keeps `pruneWorkspaceHistory` only.
- **Implementation note:** the e2e fixture page that looks up `/sibling-fixture` through `getTreeNodes()` must have a listed run there, or be updated with the probes.

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`. Confirmed: a ported view, a GraphQL argument whose meaning changes, a server value read from memory files on every history read, a shared read window, a broad UI blast radius, and a revert.
- Independent Architecture Review required by the classification: `Yes`

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for the SR-004 section and the Product spec. The requirements doc outside that section contradicts it (AR-003).
- Approved requirements understood:
  - REQ-006: the view menu with Runs, Workspaces and Projects.
  - REQ-008: the Runs view.
  - REQ-009 / DEC-010: Workspaces and Projects list only folders and Projects with a listed run.
  - REQ-010 and REQ-007: no add actions, no folder X.
  - REQ-011: empty states.
  - REQ-002 and REQ-004: the chooser Remove, refused while a run is running.
  - Nothing is hidden; nothing new is stored on the server; the phone is unchanged.
- Relevant existing behavior and evidence confirmed:
  - E-11: the host is 520 lines at base and 517 in the worktree.
  - E-12: the history read is capped at 6 per agent, with no "show more" in the tree. The per-folder read on expand is also 6 (`WorkspaceAgentRunsTreePanel.vue:392`), so a display cap of 6 keeps today's tree.
  - E-13: folder nodes are made from registered folders.
  - E-14: Projects lists every Project.
  - The phone is its own page (`pages/mobile.vue` → `MobileRemoteAccessShell`), and the run section mounts in `AppLeftPanel`. They never share a page, so a window set by the surface that mounts is sound, given the design's switch test.
- Scope guardrail confirmed: the phone, the Projects page, Memory, `workspaces.json` and the 378 removals are untouched; 378's CR-002 is not applicable.
- Every prospective blocking finding is traceable: `Yes`
- Statements about existing code the design relies on:
  - **"`hasListedRun(folderNode)` … a team run or an Org run. The tree projection drops folder nodes without one … after filling runs" (DS-004), placed in "`runTreeProjection` / `runHistoryReadModel`" (Ownership Map). The code does not have that shape.**
    - The folder node from `buildRunTreeProjection` holds agent runs only. Org groups are attached later in that file (`runTreeProjection.ts:396-423`). Team rows are attached per folder root in the navigation projection (`runHistoryNavigationProjection.ts:214-230`).
    - `buildRunHistoryTreeNodes` (`runHistoryReadModel.ts:180`) is shared by the Workspaces navigation (`runHistoryNavigationProjection.ts:163`) and the Projects view (`projectRunsProjection.ts:57-71,107`).
    - See AR-004.

| Behavior / Requirement | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| REQ-006 / AC-009 (view menu) | Pass | Pass | Pass (DS-001) | Confirmed | — |
| REQ-008 / AC-011 (Runs view) | Pass | Pass | Pass (DS-002, DS-003, DS-005, DS-007) | Confirmed | — |
| REQ-009 / AC-012 (listed-run rule) | Pass | Pass (requirements rewritten) | Pass (Workspaces-only owner, after teams and Orgs) | Confirmed | — |
| REQ-010, REQ-007 / AC-013, AC-010 (removals) | Pass | Pass | Pass (Removal Plan) | Confirmed | — |
| REQ-011 / AC-014 (empty states) | Pass | Pass | Pass | Confirmed | — |
| REQ-002, REQ-004 / AC-002, AC-005 (chooser Remove) | Pass | Pass | Pass (DS-006) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` (VIS-001…VIS-017) | Pass | Pass | Pass | Pass | Pass (approved twice, normative) | — |
| `product-design-request.md` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Behavior change with removal and reuse | — |
| Root cause / issue explicit | Pass | The host is oversized with three concerns; reuse of the reviewed 378 code | — |
| Refactor decision explicit | Pass | A new header component; the Runs view as its own tree; the host shrinks to at most 500 lines; the rename is FU-003 | — |
| Supported by concrete sections | Pass | — | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Menu | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Read window | Pass | Pass | N/A | Pass | Pass (`runHistoryStore` owns the cap) | Pass | Pass |
| DS-003 | Runs view | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Listed-run rule | Pass | Pass | N/A | Pass | Pass (navigation projection, after teams and Orgs) | Pass | Pass |
| DS-005 | Server last activity | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Chooser Remove | Pass | Pass | N/A | Pass | Pass | Pass | Pass (implementation note in Residual Risks) |
| DS-007 | Archive older | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runHistoryStore` (window, `archiveRuns`) | Pass | Pass | Pass | Pass | — |
| `runListStore` → components (no Apollo) | Pass | Pass | Pass | Pass | — |
| `RunLastActivityReader` (allowed and forbidden dependencies) | Pass | Pass | Pass | Pass | — |
| The shared tree builder `buildRunHistoryTreeNodes` | Pass | Pass (unchanged) | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/runList` → stores; server reader → memory and location services | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `listWorkspaceRunHistory` / `workspaceRunHistory(limitPerAgent: Int = 6)`; explicit `null` means every run | Pass | Pass | Pass | Low (tests for null as argument and variable, and the omitted default) | Pass |
| History items `lastActivityAt: String!` | Pass | Pass | Pass | Low | Pass |
| `runHistoryStore.setHistoryWindow`, `archiveRuns` | Pass | Pass | Pass | Low | Pass |
| `RunSectionMode` adds `'runs'` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runs list | Pass (378) | Pass (port files, not commits; rules listed) | Pass | Pass | — |
| Removal confirmation and guard | Pass | Pass (`useWorkspaceHistoryWorkspaceRemoval`, `WorkspaceRemovalGuard`) | N/A | Pass | — |
| Tree builder | Pass | Pass (shared builder unchanged) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web run section, `runList/`, stores, chooser | Pass | Pass | Pass | Pass | — |
| server run history | Pass | Pass | Pass | Pass | — |

Kinds and forms (Principle 1):
- agent, team and Org runs per folder: traced, with the rule applied after both are attached;
- local, draft and prepared runs: traced (VIS-017);
- the Runs view's three row kinds: traced.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Listed-run predicate, one per view (ARCH-REV-002's recommendation) | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `lastActivityAt` (server-derived, one clock) | Pass | Pass | Pass (replaces client-side clocks for the Runs order) | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass`. The navigation projection's folder nodes are read by the Workspaces tree state only, plus one e2e fixture; the Projects builder is unchanged.

Domain vocabulary keeps one meaning per word: `Pass` ("view", "listed run", "run section").

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunSectionHeader.vue` (new), the host (≤ 500 lines), `runList/*`, `runListStore`, `runListProjection`, the composables, `run-last-activity-reader.ts` | Pass | Pass | Pass | Pass | — |
| `runHistoryNavigationProjection.ts` holding the Workspaces folder rule (display cap dropped) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/runList/`, `stores/runListStore.ts`, `utils/runListProjection.ts`, `run-history/services/run-last-activity-reader.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-003 server commit `8fe7b2e57e` (`git revert`) | Pass | Pass | Pass | Pass | — |
| Uncommitted SR-003 web work (keep only the chooser Remove) | Pass | Pass | Pass | Pass | — |
| `RunSectionSwitch`, folder X, add form, "New Project" link, unused keys and specs | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `limitPerAgent` default kept at 6; explicit `null` new | No (one argument, two meanings by value: a documented contract, not a fallback) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `lastActivityAt` (derived at read time), the local-storage view key (adds `runs`), the SR-003 hidden file (never shipped) | `Not Affected` | Pass | Pass | N/A | Pass | The requirements doc now agrees (`No`) |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Revert, port, the window, views, removals, chooser, tests; merge check with `origin/personal` at start | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Spines DS-001…DS-007; porting rules | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-003` — A folder whose only run is a team run (or an Org run)

- Related requirement: REQ-009 / AC-012; DEC-010 ("a folder … appears … when the view lists at least one run under it … agent, team and Org runs")
- Initiating basis kind: `User`
- Trigger: the user starts a team run in a folder with no agent runs (supported: Team launch with a folder).
- Forward path: `buildRunHistoryTreeNodes` → `buildRunTreeProjection` builds the folder node with agents only. Team rows join per root later (`runHistoryNavigationProjection.ts:214-230`). If the folder rule runs in `runTreeProjection` / `runHistoryReadModel`, where the Ownership Map places it, the folder is dropped before its team run is known.
- Consequence: the folder and its team run are absent from the Workspaces view, against AC-012. The same applies to an Org-only folder if the rule runs before `runTreeProjection.ts:423`.
- Reachability: `Reachable`
- Review consequence: AR-004. **Round 4: resolved** (the rule runs in the navigation projection after teams and Orgs).

### `MP-004` — The Projects view built through the shared builder

- Related requirement: REQ-009 (the Projects view's own rule), REQ-008 (the Projects view stays as today apart from the listed rule)
- Initiating basis kind: `User`
- Trigger: the user opens the Projects view.
- Forward path: `buildProjectRunsProjection` → `buildRunHistoryTreeNodes` (`projectRunsProjection.ts:107`), one node per Project.
- Consequence: a Workspaces-only folder rule or display cap of 6 in the shared builder would also drop or cap Project sections, changing the Projects view beyond its approved rule.
- Reachability: `Reachable`
- Review consequence: AR-004. **Round 4: resolved** (the shared builder is unchanged).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| The requirements doc outside the SR-004 section still states the withdrawn hide design | — | Rewritten to SR-004 only | Resolved (round 4) |

## Review Decision

- `Pass`

## Findings

None open. AR-003 and AR-004 are resolved (ARCH-REV-004). AR-001 and AR-002 are obsolete (SR-003 withdrawn).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Residual Risks

- **The uncapped poll** happens only while the Runs view is shown (adopted). The 250 ms budget and its escalation trigger still apply to that view.
- **The expansion prune** is owned by the tree state, keyed on its own node list (adopted).
- **The window shared by phone and desktop** is safe: they are separate pages, and the design adds a switch test.
- **The ported code is reviewed as new code** at code review (378 CR-001 is fixed by DS-005).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-003 and MP-004 resolved)
- Notes:
  - Three views sit behind one menu, with the Runs view ported file by file.
  - The read window follows the view (`null` only for Runs) and is owned by `runHistoryStore`.
  - One server clock (`RunLastActivityReader`).
  - The Workspaces listed-run rule sits in the navigation projection, after teams and Orgs; the Projects builder is unchanged.
  - The chooser Remove uses the existing guard; SR-003 is cleanly reverted.
  - task_size=Large, architectural_risk=High.
