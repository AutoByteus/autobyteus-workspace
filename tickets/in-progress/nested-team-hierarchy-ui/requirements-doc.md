# Requirements Document

## Document Status

- Status: `Draft`
- Current requirements revision ID: `RER-001`
- Request / ticket: `nested-team-hierarchy-ui`
- Stable package identifier: `nested-team-hierarchy-ui`
- Requirements owner: Requirements Engineering
- Date: 2026-08-30
- Approval state and reference: Not yet approved. The user reported the hierarchy problem and supplied two current-UI screenshots; visual treatment decisions remain open pending an interactive requirements visualization.

## Problem And Desired Outcome

- Problem: The Workspace history sidebar correctly contains the root-team, team-run/task, nested-subteam, and agent hierarchy, but the expanded presentation is difficult to parse. Rows use nearly uniform typography and color, ancestry is communicated mainly by small incremental indentation, and repeated status/avatar/age metadata competes with the names. At narrow sidebar widths, truncation further removes identity cues. Users can expand a subteam but cannot quickly see which agents belong to which team or distinguish the different hierarchy layers.
- Affected actors or systems: Desktop/web users navigating a root Agent Team with nested Agent Teams in the Workspace history sidebar; the `autobyteus-web` Workspace history presentation.
- Desired outcome: An expanded team run reads as a compact, recognizable organization tree. Users can identify the team definition, the task/team-run boundary, direct root members, nested teams, and every visible descendant's parent without tracing subtle spacing or relying on color alone.
- Observable definition of success: Across the supported left-panel widths and application font presets, visible team and agent rows retain an unambiguous parent-child structure; team, task/run, and agent node types are distinguishable; collapse, selection, status, and label recovery remain usable; and the hierarchy is communicated accessibly to keyboard and assistive-technology users.

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Workspace history groups multiple team runs under a team-definition row. Expanding a team run shows its execution rows beneath the run summary. The group, run, nested team, and agent rows share a compact gray row language. | The definition, task/run, nested-team, and agent layers form one understandable hierarchy while remaining visually distinct in role and relative importance. | Team runs remain grouped by team definition; existing run selection, stop, archive, delete, and relative-time behaviors remain available. | User screenshots; `WorkspaceHistoryWorkspaceSection.vue`; `workspaceHistoryTeamDefinitionGroups.ts`. |
| BEH-002 | User | Nested `agent_team` rows are collapsed by default, expose a chevron, and reveal descendants recursively. Visible depth is represented by `marginLeft: depth * 12px`; the row also has a small `Team` badge. | Each expanded nested team visibly owns or connects to its descendants, and a user can trace every visible child to its immediate parent without inferring from a 12px offset alone. | Independent subtree expansion/collapse, row-body toggle behavior for structural team rows, and selected-member ancestor reveal remain intact. | `WorkspaceHistoryWorkspaceSection.vue`; `useWorkspaceHistoryTreeState.ts`; nested-team component tests. |
| BEH-003 | System | Agent rows display an exact status dot; nested team rows display an aggregate descendant status dot. Stable member rows repeat the root team run's last-activity time, while transient rows use a distinct light indigo treatment. | Status and recency remain discoverable but visually secondary to the organization structure and node identity. Configured and transient team hierarchies use consistent ancestry cues while retaining a clear configured-versus-transient distinction. | Exact/aggregate status semantics and transient execution identity remain unchanged. | `NestedTeamAggregateStatusDot.vue`; `workspaceHistoryNestedTeamStatus.ts`; `WorkspaceTransientExecutionRow.vue`. |
| BEH-004 | User | The docked left panel is resizable from 260px to 520px, defaults to 320px, and the app supports Default, Large (112.5%), and Extra Large (125%) font presets. Long team/member labels truncate; the current row labels do not expose a dedicated full-name tooltip. | Hierarchy and controls remain understandable at the supported widths and font presets. When space forces truncation, the full node identity is recoverable by pointer and keyboard users and ancestry does not depend on the hidden suffix. | The existing resizable panel and application-wide font presets remain unchanged. | `responsiveLayoutPolicy.ts`; `useLeftPanel.ts`; `appFontSizePresets.ts`; screenshots at two captured widths. |
| BEH-005 | User | Selecting a concrete agent row focuses/opens that member; structural subteam rows without an agent run toggle their subtree without fabricating an agent selection. Selection uses an indigo row highlight. | Selection, hover, focus, and activity styling reinforce rather than erase node type and ancestry. | Current valid-target selection rules, focus behavior, keyboard activation, and automatic ancestor reveal remain unchanged. | `WorkspaceHistoryWorkspaceSection.vue`; `useWorkspaceHistorySelectionActions.ts`; `WorkspaceAgentRunsTreePanel.spec.ts`. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User navigating team history | Find the correct team, task/run, subteam, or agent quickly. | Can scan the organization and trace visible parent-child relationships at a glance. | The panel is narrow and may use increased application font size. |
| Keyboard or assistive-technology user | Navigate the same hierarchy and understand disclosure state and level. | Node identity, hierarchy level/relationship, selection, and expanded/collapsed state are conveyed programmatically. | Visual color or indentation alone is insufficient. |
| Product Design & Prototyping | Resolve the visual-language and density choices the request leaves ambiguous. | Provides a reviewable interactive comparison covering representative widths, depths, states, and long labels. | The visualizer clarifies requirements; it is not yet the final normative UI/UX package. |
| Downstream engineering | Preserve correct history/tree behavior while improving presentation. | Receives approved, testable behavior plus approved visual evidence if final prototyping follows. | No backend topology or status semantics change is authorized. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Scan a team-definition group containing multiple task/team runs and understand which expanded member tree belongs to which run.
- `UC-002`: Expand one or more nested subteams and identify each visible agent's immediate and higher-level team ancestry.
- `UC-003`: Distinguish team definition, task/run, configured nested team, transient task team, and agent rows without relying on row text alone.
- `UC-004`: Navigate long team/member names at 260px, 320px, and 520px left-panel widths under Default, Large, and Extra Large font presets.
- `UC-005`: Select/focus a member, inspect activity status, and collapse/expand subtrees without losing the hierarchy cues.
- `UC-006`: Navigate and understand the same expanded/collapsed tree with keyboard and assistive technology.

### Out Of Scope

- Agent Team definition creation/editing/detail screens.
- The right-side Team overview, delegated-task detail navigator, mobile run list, or Messaging team picker.
- Changes to team topology, addresses, run-history grouping, streaming, persistence, status aggregation, task lifecycle, or backend contracts.
- Renaming user-defined teams/agents or transforming snake_case identifiers into new product names.
- A general redesign of the entire left navigation, Workspaces section, center workspace, or global typography system.
- Adding an organization-management or drag-and-drop reparenting workflow.

### Non-Goals

- Display every descendant at once; nested teams may remain collapsed by default.
- Replace the compact sidebar with a full-page organization chart.
- Encode hierarchy only through a new color palette.
- Persist per-subteam expansion choices across application restarts.

### Preserved Behavior Boundary

- Preserve the operational outcomes in `BEH-001` through `BEH-005`, especially existing team-run grouping/actions, default-collapsed nested teams, independent disclosure, exact/aggregate status meaning, configured-versus-transient identity, concrete member selection, and selected-member ancestor reveal.
- The authorized change is the hierarchy's presentation and accessible interaction semantics within the Workspace history sidebar; it does not authorize data-model or lifecycle changes.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Requirements Engineer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The expanded Workspace history team-run subtree must present the team definition, task/team run, direct root members, nested teams, and visible descendants as a coherent hierarchy. | BEH-001, BEH-002 | Must | This is the user's core problem. | User request and screenshots. |
| REQ-002 | For every visible descendant, the UI must provide at least two non-color visual cues that communicate its level and relationship to its immediate parent; one cue must continue across sibling/descendant rows rather than relying only on incremental left margin. | BEH-002, BEH-005 | Must | Small indentation and uniform styling currently make ancestry ambiguous. | Screenshot/code analysis; exact visual language pending `DEC-001`. |
| REQ-003 | Team-definition, task/team-run, nested-team, and agent nodes must be visually distinguishable by role without requiring the user to read a `TEAM` suffix or infer from status color. | BEH-001, BEH-002, BEH-003 | Must | Current row roles look too similar, especially when labels truncate. | User uncertainty about font/color/display; screenshots. |
| REQ-004 | An expanded nested team must visibly group or connect all of its currently visible descendants, including deeper nested teams, so that expanding multiple sibling subteams does not make their memberships visually merge. | BEH-002 | Must | This is the failure mode in a tree with several subteams. | User's root-team/nested-subteam example. |
| REQ-005 | Collapsed, expanded, selected, focused, hovered, active, idle, error, and offline states must remain distinguishable without removing or contradicting node-role and ancestry cues. | BEH-002, BEH-003, BEH-005 | Must | Interaction/status styling must not flatten the hierarchy. | Existing interaction and status behavior. |
| REQ-006 | The hierarchy must remain usable at 260px, 320px, and 520px panel widths with Default, Large, and Extra Large app font presets. Required disclosure and selection controls must not be clipped or overlap names/metadata. | BEH-004 | Must | These are supported product settings. | Layout and font-size source. |
| REQ-007 | When a node label is truncated, its complete display name and node role must be recoverable by pointer hover and keyboard focus without changing the panel width. | BEH-004 | Must | Long names in the screenshots lose important identity cues. | Screenshots and current template. |
| REQ-008 | Status and recency metadata must remain discoverable, but the primary visual scan order must be hierarchy/relationship, node role, and node name before status and age. Repeated metadata must not create a stronger visual column than the tree. | BEH-003 | Should | Repeated dots, initials, badges, and ages compete with structure. | Screenshot analysis; density treatment pending `DEC-002`. |
| REQ-009 | Configured nested-team rows and transient task-team rows must use consistent parent-child hierarchy cues; transient executions must retain a separately recognizable temporary/task identity. | BEH-003 | Must | Both row kinds participate in the same execution tree. | `executionRows` model and transient row component. |
| REQ-010 | Existing disclosure, row selection, structural-team toggle, team-run actions, automatic ancestor reveal, and quiet-refresh preservation behavior must continue to work. | BEH-001, BEH-002, BEH-005 | Must | The request is a hierarchy presentation improvement, not a workflow change. | Current docs and tests. |
| REQ-011 | The expanded/collapsed state, current selection, node role, node accessible name, and hierarchy level/relationship must be programmatically determinable and keyboard-operable using appropriate tree semantics or an accessibility-equivalent pattern. | BEH-002, BEH-005 | Must | Users must not depend on visual indentation or color. | Accessibility requirement derived from the requested tree model. |
| REQ-012 | The treatment must accommodate localized UI and long user-defined names without assuming English word lengths or underscore-delimited identifiers. | BEH-004 | Should | The application is localized and team names are user-defined. | English/Chinese localization and screenshots. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | A representative root team has a coordinator, three sibling subteams, and one subteam with six agents; the team run and all three subteams are expanded. | Every visible agent can be visually traced to its immediate subteam and the expanded tree is visibly attached to the correct task/team run. At least two non-color cues communicate role/ancestry. | Sibling groups must not visually merge into one undifferentiated agent list. | Approved visual reference plus browser screenshot review. |
| AC-002 | REQ-004, REQ-005 | Two sibling nested teams and one deeper nested team are expanded, with one child selected and mixed activity states. | Each subtree retains a clear boundary/connection; the selected row remains clearly selected while its parent chain and node role remain visible. | Selection/status styling must not erase parent cues or make the row appear at the wrong level. | Interactive visualizer/prototype and component/browser checks. |
| AC-003 | REQ-005, REQ-010 | A user activates a nested-team disclosure by pointer and keyboard. | Only the intended subtree changes visibility, the disclosure state changes, no invalid agent selection is created, and all remaining visible relationships stay unambiguous. | Collapsing a sibling or refreshing quietly must not reset unrelated expansion choices. | Existing behavior tests plus new rendered hierarchy checks. |
| AC-004 | REQ-006, REQ-007, REQ-012 | The panel is rendered at 260px with Extra Large font and long localized team/member names. | Disclosure and selection controls remain operable; row content does not overlap; truncation is apparent; and full name plus node role can be obtained by hover and keyboard focus. | Horizontal overflow, clipped controls, or ancestry that depends on the truncated suffix fails. | Responsive browser validation at supported presets. |
| AC-005 | REQ-006, REQ-008 | The same representative tree is rendered at 320px Default and 520px Default. | Hierarchy/role/name remain the primary scan order at both widths; status and available age remain legible but visually secondary. | A repeated age/status column must not dominate or break the tree connection at narrow width. | Side-by-side visual review. |
| AC-006 | REQ-003, REQ-009 | Configured agents/teams and a transient task team with descendants appear together. | A user can distinguish definition group, task/team run, configured team, transient team, and agent rows while all descendants follow one consistent ancestry grammar. | Temporary identity must not be confused with configured node type. | Visualizer state and rendered browser fixture. |
| AC-007 | REQ-011 | A keyboard/screen-reader user moves through a team run and nested subteam. | Accessible output exposes each item's name, role or equivalent description, hierarchy level/relationship, selection when applicable, and expanded/collapsed state; disclosures operate from the keyboard. | Color, pixel indentation, or visual branch lines alone do not satisfy the criterion. | Accessibility tree inspection and keyboard test. |
| AC-008 | REQ-010 | Existing team-history interaction suites and a live/history hydration scenario run after the presentation change. | Team selection, concrete-member selection, structural-team toggling, status aggregation, transient rows, selected-member ancestor reveal, quiet refresh, and run actions retain their prior observable outcomes. | Any workflow or topology regression blocks acceptance. | Existing focused component/integration tests and browser probe. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Starting Condition | Steps Or Event Sequence | Expected Outcome | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | Team definition has several past/current runs; one task run is expanded. | Scan definition, task/run, root coordinator, and collapsed subteams. | Layer roles and the member tree's attachment to the correct run are immediately clear. | REQ-001–REQ-003; AC-001. |
| SCN-002 | User | Desktop user | Root run contains several sibling subteams. | Expand Product Design, then Software Engineering, then a deeper nested team; select a leaf. | Each subtree remains visibly bounded/connected and the selected leaf's ancestry is clear. | REQ-002, REQ-004, REQ-005, REQ-010; AC-002, AC-003. |
| SCN-003 | User | User with narrow panel and Extra Large font | Panel is 260px; names exceed available width. | Inspect rows, hover a truncated name, tab to it, and expand its team. | Controls remain usable and the full name/role can be recovered without resizing. | REQ-006, REQ-007, REQ-012; AC-004. |
| SCN-004 | User | User viewing active work | Configured subteams and a transient delegated task team are both visible with mixed statuses. | Scan, expand, and compare row roles. | Temporary vs configured identity and all parent-child relationships remain clear; status is secondary. | REQ-008, REQ-009; AC-005, AC-006. |
| SCN-005 | User | Keyboard/screen-reader user | Focus is on an expanded team run. | Navigate nested items, inspect states, toggle a subteam, and select a leaf. | Equivalent hierarchy and interaction information is available without pointer or visual color cues. | REQ-011; AC-007. |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: Pending Product Design & Prototyping requirements visualizer; no requirements-owned UI/UX supplement is being created.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: `N/A — requirements visualization requested; final prototype not yet requested or approved.`
- Product prototype ticket record and folder (externally owned): Pending Product Design & Prototyping.
- Prototype revision or commit: Pending.
- UI/UX user-confirmation reference: Pending.
- Approved visual-reference baseline: Pending.
- Normative visual and interaction details, including the approved final references: The behavioral constraints in `REQ-001` through `REQ-012` are the draft basis. Exact branch/containment language, team-node styling, metadata density, and responsive composition remain unresolved pending the visualizer.
- Explicitly illustrative fixture content or permitted implementation variation: Visualizer fixture names/statuses/ages may be illustrative, but must include a coordinator, at least three sibling subteams, one deeper nested subteam, mixed statuses, one transient task team, long names, selection, and 260/320/520px views.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Workspace history sidebar; team-definition group collapsed/expanded; task/team run collapsed/expanded; nested team collapsed/expanded; multiple sibling subteams expanded; leaf selected; hover/focus; active/idle/error/offline; configured/transient; long-label truncation; Default and Extra Large fonts; keyboard disclosure and accessible hierarchy semantics.
- Explicitly unresolved product decisions: `DEC-001` through `DEC-003`.

## Quality And Non-Functional Requirements

| Quality ID | Area (`Performance`/`Reliability`/`Security`/`Privacy`/`Accessibility`/`Compliance`/`Operability`/`Compatibility`/`Other`) | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Accessibility | Hierarchy and node type do not rely on color alone; keyboard and accessibility-tree output satisfy `AC-007`. | Workspace history team-run subtree. | Keyboard pass plus browser accessibility-tree inspection. |
| QR-002 | Compatibility | `AC-004` and `AC-005` pass at 260/320/520px and Default/Large/Extra Large font presets. | Supported desktop/web left-panel configurations. | Browser viewport/panel fixture matrix. |
| QR-003 | Reliability | Presentation changes do not alter stored topology, run/member selection targets, status aggregation, or refresh semantics. | Live and historical team runs, configured and transient rows. | Existing focused tests plus live/history browser probe. |
| QR-004 | Localization | Long English, Chinese, and user-defined labels remain operable and fully recoverable when truncated. | Supported localization plus long fixture names. | Localized responsive visual checks. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: Team definitions, team runs, execution tree, member addresses/run IDs, summaries, statuses, timestamps, selection targets, and existing frontend expansion-state lifecycle.
- Loss, reset, rebuild, or regeneration that is acceptable: Existing component-local expansion state may continue to reset when the history panel unmounts or the application restarts.
- Retention, privacy, compliance, volume, downtime, or operational constraints: No new persistence, migration, or external data processing is authorized.
- Unknowns requiring downstream investigation: None material at the requirements-visualization stage.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `TeamRunExecutionTreeDto` / run-history execution rows | Existing tree identities, depth, child relationships, and configured/transient distinctions remain authoritative inputs. | `runHistoryTypes.ts`; `runHistoryTeamExecutionRows.ts`; `@autobyteus/team-stream-contracts`. | No contract change expected. |
| Responsive layout policy | Support 260–520px left-panel range, default 320px. | `responsiveLayoutPolicy.ts`; `useLeftPanel.ts`. | Visual treatment must not assume a wider panel. |
| Application font-size presets | Support 100%, 112.5%, and 125% root font scaling. | `appFontSizePresets.ts`; display-setting tests. | Narrow + Extra Large is the highest-density case. |
| Existing history tests | Preserve disclosure/selection/reveal/status/refresh behavior. | Workspace history component and integration tests. | Visual assertions need to be added without weakening behavior tests. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_41d8ee5e50a0__image.png` | User-supplied wide/current hierarchy evidence. | REQ-001–REQ-008; AC-001, AC-002, AC-005. | Current-state evidence. | Included in requirements review basis; not a future-state approval. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_00c9cf9ea623__image.png` | User-supplied narrow/current hierarchy evidence. | REQ-003, REQ-006–REQ-008; AC-004, AC-005. | Current-state evidence. | Included in requirements review basis; not a future-state approval. |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The screenshots show the Workspace history tree rendered by `WorkspaceHistoryWorkspaceSection.vue`. | It determines the affected surface and scope. | Code/visual mapping recorded in investigation notes; Product Prototyper should use this frontend locator. | Validated with high confidence. |
| ASM-002 | Users want a clearer compact tree, not an always-expanded full-page organization chart. | The request emphasizes hierarchy readability within the existing UI. | Validate via interactive requirements visualizer. | Pending user confirmation. |
| ASM-003 | Existing status, selection, disclosure, and run action semantics are correct and should be preserved. | No functional defect in those behaviors was requested. | Carry as preservation boundary; user can revise during approval. | Draft. |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which compact hierarchy language best makes ancestry obvious: branch/connector rails, nested group surfaces, or a hybrid? | This is the material visual decision the user could not resolve from prose and current screenshots. | Visualizer should compare viable treatments using identical deep fixtures at 260/320/520px. | User, supported by Product Design & Prototyping. | Open — requirements visualization needed. |
| DEC-002 | How much per-row status/age metadata should remain continuously visible at narrow widths, and where should it sit? | Repeated metadata may be causing visual noise, but hiding it changes information availability. | Compare full metadata, reduced child metadata, and responsive/hover disclosure while satisfying REQ-008. | User, supported by Product Design & Prototyping. | Open — requirements visualization needed. |
| DEC-003 | How should team nodes differ from agent nodes while remaining compact and accessible? | The current small `Team` badge is insufficient when labels truncate, but an overly heavy team card could reduce density. | Compare role icon/avatar treatment, team header emphasis, badge placement, and typography without color-only dependence. | User, supported by Product Design & Prototyping. | Open — requirements visualization needed. |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001, BEH-002 | AC-001 | SCN-001 | Both user screenshots; visualizer pending. |
| REQ-002 | BEH-002, BEH-005 | AC-001, AC-002 | SCN-001, SCN-002 | Both screenshots; visualizer pending. |
| REQ-003 | BEH-001–BEH-003 | AC-001, AC-006 | SCN-001, SCN-004 | Both screenshots; visualizer pending. |
| REQ-004 | BEH-002 | AC-002 | SCN-002 | Wide screenshot; visualizer pending. |
| REQ-005 | BEH-002, BEH-003, BEH-005 | AC-002, AC-003 | SCN-002 | Current tests; visualizer pending. |
| REQ-006 | BEH-004 | AC-004, AC-005 | SCN-003 | Narrow screenshot and layout/font source. |
| REQ-007 | BEH-004 | AC-004 | SCN-003 | Narrow screenshot; visualizer pending. |
| REQ-008 | BEH-003 | AC-005 | SCN-004 | Both screenshots; visualizer pending. |
| REQ-009 | BEH-003 | AC-006 | SCN-004 | `executionRows` and transient-row source. |
| REQ-010 | BEH-001, BEH-002, BEH-005 | AC-003, AC-008 | SCN-002 | Existing component/integration tests. |
| REQ-011 | BEH-002, BEH-005 | AC-007 | SCN-005 | Current disclosure ARIA plus identified semantic gap. |
| REQ-012 | BEH-004 | AC-004 | SCN-003 | Localization source and long screenshot labels. |

## Downstream Architecture Input

- Product and system constraints architecture must preserve: Existing execution-tree inputs and node identities; local expansion/selection ownership; team status aggregation; configured/transient distinction; live/history hydration; 260–520px left-panel behavior; application font presets.
- Decisions intentionally deferred to architecture design: None at this stage. Exact future-state visual language is a product decision pending visualization, not an architecture decision.
- Technical facts architecture should verify: Whether the approved treatment remains a bounded presentation change within the current Workspace history component/state contract; accessibility semantics for the rendered hierarchy; representative live/transient row coverage.
- Known feasibility or integration risks: The current stable row uses a `role="button"` container with a nested disclosure button and margin-only depth; the eventual implementation should preserve interaction outcomes while meeting accessible hierarchy semantics. Target structure is intentionally not prescribed here.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Prototype and supplemental evidence is integrated consistently: `No — requirements visualization not yet returned`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A — final prototype not yet requested; exploratory visual decision still open`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `No`
- Requirements package ready for downstream route: `No`
- Remaining blocker: `DEC-001` through `DEC-003` require interactive requirements visualization and user clarification before the package can be presented for approval.

## Architecture Design Routing Assessment

Deferred. This assessment must be completed only after the intended behavior is explicitly approved and the Readiness Check passes.
