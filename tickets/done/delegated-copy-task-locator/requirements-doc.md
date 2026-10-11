# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `delegated-copy-task-locator`
- Request / ticket: Project Task `project_task_b541c02a-587d-4ebf-b315-15648cce9d4d` (implement the approved
  design of Product ticket `delegated-copy-task-locator`, Product Task `project_task_be04657c-…`).
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-11
- Approval state and reference: Approved. The UI/UX behaviour was approved by the user on 2026-10-11 (Product
  spec `ui-ux-spec.md`, quoted below). For this engineering baseline the user replied directly, on 2026-10-11, to
  the open questions: "...the requirements are rough... they set up the direction. That's why you need to use your
  own reasoning to work out the most reasonable one." This approves the direction and delegates the open details
  to the Solution Designer's reasoning. Resolved under that delegation: DEC-001 → (b), DEC-002 → (a); ASM-001 adopted. `/project_task_manager` relayed the same guidance on 2026-10-11 and confirmed DEC-001 (b) and DEC-002 (a).
- Exact approved requirements baseline / solution revision: this document at SR-002.
- Behavior-defining supplements and their approved versions: Product `ui-ux-spec.md` + `visual-references/VIS-001…VIS-014`
  in `/Users/normy/autobyteus_org/autobyteus-web-design` `personal` @ `b08ddf6` (design revision `004d290`,
  ticket closed `18fa0ae`); user confirmation 2026-10-11: "I also think summary is better. I like the summary
  version. I also think we use summary. Let's do it".

## Problem And Desired Outcome

- Problem: under a run that delegated Tasks, the Workspaces tree shows look-alike copy rows ("software engineering
  team", "agent package creator") with no way to see or reach the Task each copy works on (user screenshot 23.png).
- Affected actors or systems: the user supervising delegated work; `autobyteus-web` (tree, right panel Projects tab);
  `autobyteus-server-ts` (Projects Task data).
- Desired outcome: every delegated copy row with a Task shows that Task's summary under its name, and the summary
  takes the user to the Task, located on its board in the right panel's Projects tab.
- Observable definition of success: the tree rows and locating behave as the approved spec and screenshots show,
  edge cases included, in en and zh-CN; the lookup uses server data and stays live; covered by tests; verified by
  the user in the desktop app.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-011 | Copy rows show one line (name) | Task Agent / task Team rows whose copy is the worker of a Task show that Task's summary as a second line | Row anatomy, status dot, icon, selected/hover styles | investigation BEH-001 |
| BEH-002 | User | SCN-001 | Click/Enter/Space on the row opens the copy (and toggles a team row) | Unchanged for the row; the summary is a separate target | Fully preserved | BEH-002 |
| BEH-003 | User | SCN-002..SCN-005 | Right strip reveals a tool (docked / drawer) | Locate reveals the Projects tab the same way | Strip behaviour unchanged | BEH-003 |
| BEH-004 | Contract | SCN-008 | Server keeps each copy's current Task assignment | The summary and locate target follow the copy's current Task, from server data | Server assignment rules unchanged | BEH-004 |
| BEH-005 | System | SCN-012 | Task changes reach open boards live | The summary follows Task renames, reassignment, closure and deletion live | Board live highlights unchanged | BEH-005 |
| BEH-006 | System | SCN-006c | Copy rows of a DONE/CANCELLED Task leave the tree | Unchanged; a locate made just before closure still locates the Task | Preserved | BEH-006 |
| BEH-008 | User | — | Selection reveal scrolls/focuses the selected tree row | Unchanged | Preserved (PMU-018/019) | BEH-008 |
| BEH-009 | User | SCN-002..SCN-010 | No current supported behavior (copy → Task) | Summary click / Enter / Space locates the Task | — | spec |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Supervising user | Tell copies apart; go to a copy's Task | Summary per copy row; one click to the located Task | Center view and tree selection unchanged |
| Keyboard / screen-reader user | Same without a mouse | Focusable summary; focus lands on the located card | Accessible names in en / zh-CN |
| Overlapping teams (Tasks 7a42fa46, b2b0538a) | Their row/reveal behaviour keeps working | No regression | Row structure constraints (QR-003) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Tell delegated copies apart by their Task summary in the Workspaces tree | SCN-001, SCN-011 |
| UC-002 | Locate a copy's Task in the right panel's Projects tab from its summary (mouse or keyboard) | SCN-002..SCN-005, SCN-008..SCN-010 |
| UC-003 | Locate a Task the board would otherwise hide (search, Cancelled lane, Done Temp tasks past ten, just closed) | SCN-006a..c |
| UC-004 | Keep the summary current as Tasks are renamed, reassigned, closed or deleted | SCN-012 |
| UC-005 | Fix the Cancelled status pill's ring colour (`ring-slate-300` never generated) | SCN-013 |

### Out Of Scope

- A row-end Task icon; a Task chip in the copy's run header (rejected/withdrawn by the user).
- Task history per copy; locating from the full `/projects` pages; `/mobile`.
- `@` collaborator rows, team member rows, sub-work copies started inside a Task worker's subtree (they share the
  worker's Task).
- Changes to how delegated Team status is computed (Task 7a42fa46 and its follow-up design).
- Changes to server assignment rules, Task persistence or the `/ws/projects` message schema.
- Org-run Task workers (the Org tree's own rows): excluded by the approved spec's Out Of Scope; separate-ticket candidate (DEC-001).

### Non-Goals

- No change to the reverse path (Task card → worker).

### Preserved Behavior Boundary

- BEH-002, BEH-006, BEH-007 (card → worker), BEH-008; existing board live-change highlights; existing right-strip
  reveal and drawer policy; existing Projects tab choice persistence semantics.
- Cross-cutting invariant: the summary never becomes the tree's selected/current element and never changes tree
  selection or the center view (except REQ-012 when the page has no right panel).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance
  criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility
  promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming
  authoritative.
- Adjacent concerns outside this boundary are non-blocking risks or separate-ticket candidates.
- A downstream reviewer comment does not amend this requirements basis.
- The Product spec is fixed input: visible-design questions go to `/project_task_manager` (who asks the Product Team).

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A task Agent row or task Team row whose copy is the assigned worker of a Task shows that Task's summary as a second line under its name, under standalone Agent runs and Agent Team runs (DEC-001; both use the shared Task-worker row). Team member rows, `@` collaborator rows, sub-work copies and copies whose Task is unknown keep one line. | BEH-001 | Must | Tell copies apart | spec UXJ-001, DEC-001 final |
| REQ-002 | Summary presentation exactly as the spec: Task description's first non-empty line, shortened at a word boundary (`taskSummaryLabel`), one line with ellipsis, the name column's width; 11 px / 16 px, weight 400 (also on semibold team rows), `#808080` at rest, `#4338ca` on the selected row and on hover (+ underline, 2 px offset); 2 px indigo-500 focus ring with 4 px radius; 2 px gap above; 4 px horizontal padding pulled 4 px left so the text aligns with the name; row 46 px tall with a summary (28 px without); branch elbow and team disclosure chevron centred on the name line (14 px from row top); status dot and icon stay on the name line. Row hover/selected surfaces cover both lines. | BEH-001 | Must | Fidelity boundary | spec Visual Language, VIS-001..004, VIS-012, VIS-014 |
| REQ-003 | The summary is its own control (a button): click, Enter or Space locates the Task and does not open, select or toggle the row. Clicking the rest of the row keeps BEH-002. Tab from the row reaches the summary. | BEH-002, BEH-009 | Must | Two click targets | spec TR-002, TR-009, UXJ-004 |
| REQ-004 | Locating reveals the right panel's Projects tab like the right strip does: docked; reopened if hidden; the right drawer when the panel is not docked (narrow windows); tools opened on a start surface. | BEH-003 | Must | — | spec UXJ-002 step 2, TR-003, VIS-011, VIS-013 |
| REQ-005 | Locating chooses the Task's Project, or Temp tasks for a Task with no Project, remembered like a manual pick; an open Task detail in the tab returns to the board; the center view and tree selection do not change. | BEH-009 | Must | — | spec UXJ-002 steps 3–4, TR-004, VIS-005..007 |
| REQ-006 | The located card scrolls to the centre of the tab (smooth; instant with reduced motion), takes keyboard focus (Enter opens the Task) and shows the existing live-change highlight (`#eef2ff` wash + inset 2 px `#6366f1` bar, held to 35 % then fading, 2.4 s; static 2.4 s with reduced motion). Only the latest located card is highlighted; a newer locate removes the previous highlight at once. | BEH-009 | Must | — | spec UXJ-002 step 5, TR-008, Motion |
| REQ-007 | A hidden Task is made visible before locating: a search that hides it is cleared (a search that still shows it is kept); a Cancelled Task turns on "Cancelled (N)" and is located in the Cancelled lane; a Done Temp task past the first ten turns on "Show all". Other filters stay. A Task that closed just before the click is still located. | BEH-006, BEH-009 | Must | — | spec UXJ-003, TR-005..007, VIS-009a/b, VIS-010 |
| REQ-008 | The summary and the locate target are the copy's **current** Task: the Task it works on now (its open assignment); if none is open, its most recent assignment. A copy given a follow-up Task shows and locates the follow-up; its earlier Done Task stays in Done with the same worker. Only Tasks whose current worker (latest assignment) is this copy count. | BEH-004 | Must | Matches the spec's "open one updated last, else the one updated last" in every supported scenario | spec DEC-007, VIS-008; investigation BEH-004 |
| REQ-009 | The copy → current Task answer comes from the server's assignment data, not from loading every Task list in the browser, and stays live: a Task rename, reassignment, closure, reopening or deletion updates (or removes) the summary without a reload, as soon as the change reaches the node's Projects change feed; a reconnect re-reads it. | BEH-004, BEH-005 | Must | Engineering note from Product | spec Data boundaries |
| REQ-010 | Strings: summary tooltip and accessible name en "Show Task in Projects: {{title}}", zh-CN "在项目中显示任务：{{title}}"; the row's accessible name gains ", " + en "Task: {{title}}" / zh-CN "任务：{{title}}". `{{title}}` = the summary label. | BEH-001 | Must | — | spec Content |
| REQ-011 | The Cancelled status pill renders its intended `ring-slate-300` ring (Tailwind generates classes used in `utils/`). | — | Should | Product observation; cheap | spec Open Decisions; PTM note |
| REQ-012 | On a page that has no right panel, clicking a summary first opens the run the row belongs to, as clicking that run's row does (without collapsing it), and then locates the Task in that run's right panel as in REQ-004..REQ-007. | BEH-009 | Must | Gap in the design; one consistent locate experience | DEC-002 (a) |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001 | A run with task Agent and task Team copies, each the worker of a Task | Each copy row shows its Task summary under its name with the spec's type, colour, alignment, ellipsis; elbow and chevron on the name line; members show none | Copy whose Task is unknown/not yet loaded: one line, summary appears once known | Component tests + browser screenshot vs VIS-001/002 |
| AC-002 | REQ-001 | SCN-011 | Run with `@` collaborators beside Task workers; a Task worker with sub-work copies | Collaborators and sub-work copies one line; workers with summary | — | Component/unit + browser vs VIS-014 |
| AC-003 | REQ-002, REQ-003 | SCN-001 | Hover / keyboard focus / selected row | Hover indigo + underline; focus ring; selected row summary `#4338ca`; row surfaces cover both lines | — | Browser vs VIS-003, VIS-004, VIS-012 |
| AC-004 | REQ-003 | SCN-001 | Click name or rest of the row | Opens the copy's conversation as before; Task not located | — | Component test |
| AC-005 | REQ-003..REQ-006 | SCN-002 | Click the summary, right panel docked on another tab | Projects tab shown, picker on the Task's Project, card centred, focused, highlighted 2.4 s; center view and tree selection unchanged | — | Browser vs VIS-005 |
| AC-006 | REQ-005 | SCN-003, SCN-004 | Task in another Project / with no Project | Picker switches to that Project / Temp tasks; choice persists like a manual pick | — | Browser vs VIS-006/007; unit |
| AC-007 | REQ-005 | SCN-005 | A Task detail open in the tab | The tab returns to the board, card located | — | Component/browser |
| AC-008 | REQ-004 | SCN-005b | Right panel hidden; narrow window (900×800); start surface | Panel reopens docked on Projects; drawer opens on Projects; tools open | — | Browser vs VIS-011a/b, VIS-013 |
| AC-009 | REQ-007 | SCN-006a | Board search hides the Task | Search emptied; card located. A search that still shows it is kept | — | Browser vs VIS-009a/b; component |
| AC-010 | REQ-007 | SCN-006b, SCN-006c | Task Cancelled just before the click | "Cancelled (N)" pressed, card located in Cancelled lane | — | Browser vs VIS-010; component |
| AC-011 | REQ-007 | SCN-006b | Done Temp task beyond the first ten | "Show all" expanded, card located in Done | — | Component |
| AC-012 | REQ-008 | SCN-008 | Copy whose first Task is Done and follow-up Task is open | Summary and locate show the follow-up; earlier Task in Done | — | Server unit + browser vs VIS-008 |
| AC-013 | REQ-006 | SCN-010 | Locate A, then B within 2.4 s | Only B highlighted; A's highlight removed at once | Reduced motion: instant scroll, static highlight 2.4 s | Component |
| AC-014 | REQ-003, REQ-006 | SCN-009 | Keyboard: Tab to summary, Enter / Space | Task located, focus on the card; Enter opens the Task | Enter/Space on the summary neither opens nor toggles the row | Component + browser |
| AC-015 | REQ-009 | SCN-012 | While a copy row is shown: Task description edited; copy reassigned to a follow-up Task; Task deleted | Summary text updates; summary switches to the follow-up; summary disappears — without reload | Feed reconnect re-reads | Server API test + client unit + live check |
| AC-016 | REQ-009 | SCN-012 | Tree with many copies | No per-row loading of every Project's Task list; one batched server read for the shown copies | — | Unit (request count) |
| AC-017 | REQ-010 | SCN-001 | en and zh-CN | Tooltip/accessible names and row accessible name exactly as specified | — | Component tests per locale; localization checks |
| AC-018 | REQ-011 | SCN-013 | Cancelled Task on a board | Pill shows the slate-300 ring (class present in built CSS) | — | Build/CSS check or browser |
| AC-019 | Preserved | BEH-008 | Selection reveal flows | Reveal/tree-state unit specs and PMU-018 / PMU-019 still pass; summary never carries `aria-current`/`aria-selected` | — | Existing specs + probe |
| AC-020 | REQ-012 | SCN-014 | On the Agents (or Projects, Skills…) page, click a copy's summary under an Agent run and under a Team run | The row's run opens in the center (tree stays expanded) and the Task is located in its right panel | — | Browser |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Supervisor | Tell copies apart | Workspaces tree | Run with delegated copies | Expand run | Summaries under copy rows | Unknown Task → one line | Supported Normal | spec UXJ-001 | REQ-001..003, REQ-010; AC-001, 003, 004, 017 |
| SCN-002 | User | Supervisor | Go to the Task | Summary click | Panel docked | Click summary | Located in Projects | — | Supported Normal | UXJ-002, VIS-005 | REQ-004..006; AC-005 |
| SCN-003 | User | Supervisor | Same, other Project | Summary | Tab on another Project | Click | Picker switches | — | Supported Normal | VIS-006 | AC-006 |
| SCN-004 | User | Supervisor | Same, Temp task | Summary | Task has no Project | Click | Temp tasks | — | Supported Normal | DEC-008, VIS-007 | AC-006 |
| SCN-005 | User | Supervisor | Same, from an open Task / hidden panel / narrow window | Summary | Task open in tab; panel hidden; drawer mode | Click | Board shown; panel reopened; drawer opened | — | Supported Normal | TR-003/004, VIS-011, VIS-013 | AC-007, AC-008 |
| SCN-006a | User | Supervisor | Locate a filtered-out Task | Summary | Search hides it | Click | Search cleared | Search still shows it → kept | Supported Explicit Edge | DEC-005, VIS-009 | AC-009 |
| SCN-006b | User | Supervisor | Locate a Cancelled / old Done Temp Task | Summary | Task Cancelled / Done beyond ten | Click | Lane / Show all on | — | Supported Explicit Edge | DEC-005 | AC-010, AC-011 |
| SCN-006c | User + System | Supervisor, agent | Task closed just before the click | Summary | Row still on screen | Click | Located in its lane | Row leaves the tree right after | Supported Explicit Edge | DEC-006, VIS-010 | AC-010 |
| SCN-008 | User | Supervisor | Copy with a follow-up Task | Summary | Copy reassigned via `delegate_task` with its run ID | Read / click | Current Task shown and located | — | Supported Normal | DEC-007, VIS-008 | REQ-008; AC-012 |
| SCN-009 | User | Keyboard user | Locate without mouse | Tab / Enter / Space | Focus in tree | Tab, Enter | Focus on card | — | Supported Normal | UXJ-004, VIS-012 | AC-014 |
| SCN-010 | User | Supervisor | Locate twice | Summaries | — | Click A then B | Only B highlighted | Reduced motion | Supported Normal | TR-008 | AC-013 |
| SCN-011 | User | Supervisor | Collaborators vs workers | Tree | Run with `@` collaborators | Expand | Collaborators one line | — | Supported Normal | VIS-014 | AC-002 |
| SCN-012 | System | Agent / user edit | Task data changes | Task edit, `delegate_task`, DONE/CANCELLED, delete | Copy row shown | Change committed | Summary updates live | Feed disconnected → re-read on reconnect | Supported Normal | Product data boundary | REQ-009; AC-015, AC-016 |
| SCN-013 | User | Supervisor | See Cancelled pill correctly | Boards | Cancelled Task | View | Slate-300 ring | — | Supported Normal | Product observation | REQ-011; AC-018 |
| SCN-014 | User | Supervisor | Go to the Task from a page without the right panel (e.g. Agents, Projects, Skills pages) | Summary | No right panel on the page | Click | Run opens, Task located | — | Supported Normal | DEC-002 (a), user direction 2026-10-11 | REQ-012; AC-020 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-copy-task-locator/ui-ux-spec.md`
- Runnable UI reference / design repository: `/Users/normy/autobyteus_org/autobyteus-web-design` (`personal` @ `b08ddf6`);
  `corepack pnpm dev --port 3210` → `/chat?id=run-ptm-0001`, `/chat?id=run-research-001`.
- Product ticket record and folder (externally owned): `.../tickets/done/delegated-copy-task-locator/product-ticket.md`
- Design repository revision or commit: final design `004d290`; integrated `18fa0ae`; recorded `b08ddf6`.
- UI/UX user-confirmation reference: 2026-10-11 quote above.
- Approved visual-reference baseline: `visual-references/VIS-001`…`VIS-014`.
- Normative visual and interaction details: everything in the spec's Implementation Fidelity Boundary (REQ-001..REQ-007, REQ-010).
- Explicitly illustrative content: all domain values (run, Project, Task names/texts, members, statuses, counts, times).
  Non-prescriptive: the reference's `taskLocatorStore` (request, `take`, 3 s window), `useDelegatedCopyTask` (client scan), fixtures.
- Required screens/states: UIS-001, UIS-002; TR-001..TR-009; reduced motion; docked/drawer/hidden panel.
- Explicitly unresolved product decisions: none (DEC-001, DEC-002 resolved in SR-002).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-009, AC-016 | Performance | At most one server read per batch of newly shown copies (not per row, never all Task lists) | Tree render | Unit |
| QR-002 | REQ-002, REQ-003, AC-014 | Accessibility | Summary is a `button` with the specified name; focus ring visible; row `treeitem` name extended; focus moves to the card | All hosts | Component |
| QR-003 | AC-019 | Compatibility | Row structure: dot + icon in name-line boxes; summary under the name text only; `aria-current`/`aria-selected` only on the outer row; row stays focusable; `teamStatus` computation unchanged | Shared row | Review + existing specs |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (read only; the Projects tab choice uses its existing storage).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Branch `codex/delegated-team-aggregate-status` (Task 7a42fa46) | Lands first; this work rebases on it | PTM relay 2026-10-11 | Timing |
| `/ws/projects` feed | Unchanged schema; used for liveness | server source | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| design repo `.../ui-ux-spec.md` | Normative UI/UX | REQ-001..REQ-007, REQ-010 | Approved | User-approved 2026-10-11 |
| design repo `.../visual-references/VIS-*.png` | Normative visuals | same | Approved | User-approved 2026-10-11 |
| design repo `.../product-ticket.md` | Decisions, rejected alternatives | Out of scope list | Completed | Record |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The server's current-assignment rule is an acceptable realisation of the spec's "open updated last, else updated last" | Single authority, no browser scan | Shown identical in supported scenarios (investigation BEH-004) | Adopted (SR-002) |
| ASM-002 | Team-run hosts get the same visible treatment as Agent-run hosts (same shared row) | Consistency | DEC-001 (b) | Adopted (SR-002) |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which hosts get the summary? | Scope and consistency | (a) Agent runs only; (b) Agent + Team runs; (c) Agent + Team + Org runs, same visible treatment | Solution Designer under user delegation (2026-10-11), confirmed by `/project_task_manager` | **Resolved: (b)**. Agent and Team runs use the same shared Task-worker row the spec designs. Org rows are a separate component that the approved spec puts out of scope, and Product never validated them visually. Adding Org would widen the approved scope, so it is recorded as a follow-up candidate |
| DEC-002 | What does a summary click do on a page without a right panel? | Not designed | (a) open the row's run then locate; (b) Task page in Projects; (c) not clickable | Solution Designer under user delegation (2026-10-11) | **Resolved: (a)** — every tree row click already navigates to that run; the user then sees the same located Task |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-011 | VIS-001, VIS-002, VIS-014 |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-003 | SCN-001 | VIS-002..004, VIS-012 |
| REQ-003 | UC-002 | BEH-002, BEH-009 | AC-004, AC-014 | SCN-001, SCN-009 | TR-002, TR-009 |
| REQ-004 | UC-002 | BEH-003 | AC-005, AC-008 | SCN-002, SCN-005 | VIS-011, VIS-013 |
| REQ-005 | UC-002 | BEH-009 | AC-005..AC-007 | SCN-002..SCN-005 | VIS-005..007 |
| REQ-006 | UC-002 | BEH-009 | AC-005, AC-013, AC-014 | SCN-002, SCN-009, SCN-010 | VIS-005 |
| REQ-007 | UC-003 | BEH-006, BEH-009 | AC-009..AC-011 | SCN-006a..c | VIS-009, VIS-010 |
| REQ-008 | UC-002, UC-004 | BEH-004 | AC-012 | SCN-008 | VIS-008 |
| REQ-009 | UC-004 | BEH-004, BEH-005 | AC-015, AC-016 | SCN-012 | spec data boundaries |
| REQ-010 | UC-001, UC-002 | BEH-001 | AC-017 | SCN-001 | spec Content |
| REQ-011 | UC-005 | — | AC-018 | SCN-013 | spec Open Decisions |
| REQ-012 | UC-002 | BEH-009 | AC-020 | SCN-014 | — |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001..SCN-014 (after approval).
- Constraints: QR-003 row structure; landing after `delegated-team-aggregate-status`; no browser scan; no
  persistence or feed schema change; spec fidelity boundary.
- Deferred to design: the server read's shape; client cache and invalidation; locate request mechanics.
- Technical facts to verify: start-surface reveal path; Team-run host rows' copy identities; feed retention.
- Risks: merge overlap (RSK-001).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: none.

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-11, direction plus delegation of open details; see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002; Product spec @ `b08ddf6`)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none.
