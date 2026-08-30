# Requirements Document

## Document Status

- Status: `Approved`
- Current requirements revision ID: `RER-002`
- Request / ticket: `nested-team-hierarchy-ui`
- Stable package identifier: `nested-team-hierarchy-ui`
- Requirements owner: Requirements Engineering
- Date: 2026-08-30
- Approval state and reference: `Approved`. On 2026-08-30 the user stated they were satisfied with and approved the current hierarchy UI, font, color, and symbol, and explicitly preferred the filled User group symbol over the outline trial. Canonical evidence: `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/user-decision-record.md`.

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
| Product Design & Prototyping | Supply the approved future-state experience and normative visual evidence. | Approved `ui-ux-spec.md`, runnable baseline-native prototype, final `VIS-*` references, and validation agree with the user decision. | Product owns its repository, ticket, UI/UX specification, and visuals; production implementation remains downstream. |
| Downstream engineering | Implement the approved hierarchy faithfully while preserving current behavior. | Receives approved requirements, normative Product UI/UX, final visuals, and the direct-route assessment. | No backend topology, status, persistence, lifecycle, or architecture change is authorized. |

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
| REQ-002 | Every visible descendant must use the approved printed file-tree grammar: continuous ancestor rails plus right-only `├─`/`└─` elbows that start at the vertical junction, never cross the rail, stop before disclosure controls, and terminate at the last sibling. Node role provides the second non-color cue. | BEH-002, BEH-005 | Must | Small indentation and uniform styling currently make ancestry ambiguous. | Approved `DEC-001`; `ui-ux-spec.md`; `VIS-001`–`VIS-005`. |
| REQ-003 | Team-definition, task/team-run, nested-team, and agent nodes must be visually distinguishable by role without requiring the user to read a `TEAM` suffix or infer from status color. Configured teams use an unboxed filled User group symbol and semibold name; agents retain circular avatars; transient task teams retain a separate dashed bolt treatment. | BEH-001, BEH-002, BEH-003 | Must | Current row roles look too similar, especially when labels truncate. | Approved `DEC-003`; `ui-ux-spec.md`; `VIS-001`–`VIS-005`. |
| REQ-004 | An expanded nested team must visibly group or connect all of its currently visible descendants, including deeper nested teams, so that expanding multiple sibling subteams does not make their memberships visually merge. | BEH-002 | Must | This is the failure mode in a tree with several subteams. | User's root-team/nested-subteam example. |
| REQ-005 | Collapsed, expanded, selected, focused, hovered, active, idle, error, and offline states must remain distinguishable without removing or contradicting node-role and ancestry cues. Selection uses an orthogonal `#eef2ff` row with a straight 2px `#6366f1` inset left rule and no rounded outline. | BEH-002, BEH-003, BEH-005 | Must | Interaction/status styling must not flatten the hierarchy. | Approved UI/UX specification; `VIS-003`. |
| REQ-006 | The hierarchy must remain usable at 260px, 320px, and 520px panel widths with Default, Large, and Extra Large app font presets. Required disclosure and selection controls must not be clipped or overlap names/metadata. | BEH-004 | Must | These are supported product settings. | Layout and font-size source. |
| REQ-007 | When a node label is truncated, its complete display name and node role must be recoverable by pointer hover and keyboard focus without changing the panel width. | BEH-004 | Must | Long names in the screenshots lose important identity cues. | Screenshots and current template. |
| REQ-008 | Status and recency metadata must remain discoverable, but the primary visual scan order must be hierarchy/relationship, node role, and node name before status and age. At 260px and 320px, repeated member age yields and is recoverable on hover/keyboard focus; at 520px, age remains continuously visible. At 260px, depth-2 status may also yield for operability. | BEH-003 | Should | Repeated dots, initials, badges, and ages compete with structure. | Approved `DEC-002`; `ui-ux-spec.md`; `VIS-004`, `VIS-005`. |
| REQ-009 | Configured nested-team rows and transient task-team rows must use consistent parent-child hierarchy cues; transient executions must retain a separately recognizable temporary/task identity. | BEH-003 | Must | Both row kinds participate in the same execution tree. | `executionRows` model and transient row component. |
| REQ-010 | Existing disclosure, row selection, structural-team toggle, team-run actions, automatic ancestor reveal, and quiet-refresh preservation behavior must continue to work. | BEH-001, BEH-002, BEH-005 | Must | The request is a hierarchy presentation improvement, not a workflow change. | Current docs and tests. |
| REQ-011 | The expanded/collapsed state, current selection, node role, node accessible name, and hierarchy level/relationship must be programmatically determinable and keyboard-operable using appropriate tree semantics or an accessibility-equivalent pattern. | BEH-002, BEH-005 | Must | Users must not depend on visual indentation or color. | Accessibility requirement derived from the requested tree model. |
| REQ-012 | The treatment must accommodate localized UI and long user-defined names without assuming English word lengths or underscore-delimited identifiers. | BEH-004 | Should | The application is localized and team names are user-defined. | English/Chinese localization and screenshots. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | A representative root team has a coordinator, three sibling subteams, and one subteam with six agents; the team run and all three subteams are expanded. | Every visible agent can be visually traced to its immediate subteam and the expanded tree is visibly attached to the correct task/team run. At least two non-color cues communicate role/ancestry. | Sibling groups must not visually merge into one undifferentiated agent list. | `VIS-005` plus browser/component hierarchy verification. |
| AC-002 | REQ-004, REQ-005 | Two sibling nested teams and one deeper nested team are expanded, with one child selected and mixed activity states. | Each subtree retains a clear boundary/connection; the selected row remains clearly selected while its parent chain and node role remain visible. | Selection/status styling must not erase parent cues or make the row appear at the wrong level. | `VIS-003`, `VIS-005`, and component/browser checks. |
| AC-003 | REQ-005, REQ-010 | A user activates a nested-team disclosure by pointer and keyboard. | Only the intended subtree changes visibility, the disclosure state changes, no invalid agent selection is created, and all remaining visible relationships stay unambiguous. | Collapsing a sibling or refreshing quietly must not reset unrelated expansion choices. | Existing behavior tests plus `NTH-RV6-008`, `010`–`014`, `019`. |
| AC-004 | REQ-006, REQ-007, REQ-012 | The panel is rendered at 260px with Extra Large font and long localized team/member names. | Disclosure and selection controls remain operable; row content does not overlap; truncation is apparent; and full name plus node role can be obtained by hover and keyboard focus. | Horizontal overflow, clipped controls, or ancestry that depends on the truncated suffix fails. | `VIS-004` plus responsive browser validation. |
| AC-005 | REQ-006, REQ-008 | The same representative tree is rendered at 320px Default and 520px Default. | Hierarchy/role/name remain the primary scan order at both widths; status and available age remain legible but visually secondary. | A repeated age/status column must not dominate or break the tree connection at narrow width. | `VIS-001`, `VIS-004`, `VIS-005` plus responsive browser checks. |
| AC-006 | REQ-003, REQ-009 | Configured agents/teams and a transient task team with descendants appear together. | A user can distinguish definition group, task/team run, configured team, transient team, and agent rows while all descendants follow one consistent ancestry grammar. | Temporary identity must not be confused with configured node type. | `VIS-003`, `VIS-005`, and mixed-node browser checks. |
| AC-007 | REQ-011 | A keyboard/screen-reader user moves through a team run and nested subteam. | Accessible output exposes each item's name, role or equivalent description, hierarchy level/relationship, selection when applicable, and expanded/collapsed state; disclosures operate from the keyboard. | Color, pixel indentation, or visual branch lines alone do not satisfy the criterion. | Accessibility-tree inspection and keyboard checks `NTH-RV6-010`–`014`, `022`. |
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
- Linked UI/UX or interaction supplement: `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/ui-ux-spec.md` (`Approved`).
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: Prototype repository `/home/autobyteus/workspace/autobyteus-web-prototype`; approved implementation `801b571093a3388eb21efea17515529ff9b89f51`; final package `9606aa4e0c6180264dc68d83ebde7f433f7af702`; UI/UX spec and support artifacts under `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001`.
- Product prototype ticket record and folder (externally owned): `REQPKG-NTHUI-001`; `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/prototype-ticket.md`.
- Prototype revision or commit: Approved UI implementation `801b571093a3388eb21efea17515529ff9b89f51`; final approved package `9606aa4e0c6180264dc68d83ebde7f433f7af702`; integrated Product canonical HEAD `32f879c01a04f23f8c4807f02006f6b0ebafea7b`.
- UI/UX user-confirmation reference: `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/user-decision-record.md`; approval dated 2026-08-30.
- Approved visual-reference baseline: `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/visual-references` and its `visual-reference-manifest.json`; `VIS-001` through `VIS-005` were captured after approval.
- Normative visual and interaction details, including the approved final references: Every visible detail in the approved `ui-ux-spec.md` and `VIS-001`–`VIS-005` is normative unless identified there as illustrative. The approved hierarchy uses printed file-tree rails with continuous ancestor lines, non-crossing right-only elbows, correct last-sibling termination, and no nested-team cards. Configured teams use an unboxed filled `heroicons:user-group-20-solid` and semibold names; agents retain circular avatars; transient task teams retain the separate dashed bolt treatment. Nested teams default collapsed. Selection is an orthogonal `#eef2ff` row with a straight 2px `#6366f1` inset rule. Age yields at 260/320px and returns on hover/focus, and remains continuous at 520px.
- Explicitly illustrative fixture content or permitted implementation variation: Prototype team/agent names, avatars, addresses, statuses, ages, summaries, conversations, selected fixture leaf, and synthetic topology are illustrative. Real content and node count/depth may vary; connector grammar, role treatment, selection, responsive metadata, accessibility, and preserved interactions may not.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Workspace history sidebar; definition/run grouping; default collapsed subteams; one and multiple expanded branches; deep selected leaf with ancestor reveal; configured/transient nodes; 260/320/520px; Default/Large/Extra Large; pointer/keyboard identity recovery; tree/treeitem semantics; independent disclosure; quiet refresh; run actions.
- Explicitly unresolved product decisions: `None — DEC-001 through DEC-003 are resolved.`

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
- Unknowns requiring downstream investigation: None material to the approved requirements; production implementation fidelity remains downstream-owned.

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
| `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_41d8ee5e50a0__image.png` | User-supplied wide/current hierarchy evidence. | REQ-001–REQ-008; AC-001, AC-002, AC-005. | Current-state evidence. | Included in approval basis as current-state evidence, not future state. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_00c9cf9ea623__image.png` | User-supplied narrow/current hierarchy evidence. | REQ-003, REQ-006–REQ-008; AC-004, AC-005. | Current-state evidence. | Included in approval basis as current-state evidence, not future state. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/ui-ux-spec.md` | Approved Product-owned UI/UX specification and fidelity boundary. | REQ-001–REQ-012; AC-001–AC-008. | Approved. | Normative future-state supplement. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/user-decision-record.md` | Explicit approval and resolved decisions. | DEC-001–DEC-003; all affected requirements. | Approved evidence. | Canonical approval reference. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/visual-references/visual-reference-manifest.json` | Manifest for five post-approval final visuals. | AC-001–AC-007. | PASS. | Normative layout/state evidence subject to listed illustrative content. |
| `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/browser-validation-rv-006.json` | Product prototype browser validation. | AC-001–AC-008; QR-001–QR-003. | 24/24 pass, zero runtime errors. | Supporting validation evidence; not production sign-off. |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The screenshots show the Workspace history tree rendered by `WorkspaceHistoryWorkspaceSection.vue`. | It determines the affected surface and scope. | Confirmed by code mapping and baseline-native prototype. | Validated. |
| ASM-002 | Users want a clearer compact tree, not an always-expanded full-page organization chart. | It defines the experience boundary. | User approved the compact file-tree experience with nested teams collapsed by default. | Validated. |
| ASM-003 | Existing status, selection, disclosure, run actions, and quiet-refresh semantics should be preserved. | The request changes hierarchy presentation, not lifecycle behavior. | User approval and Product validation preserve these outcomes. | Approved. |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which compact hierarchy language best makes ancestry obvious? | Governs parent-child comprehension. | Approved printed file-tree rails with continuous ancestor lines, right-only non-crossing elbows, correct last-sibling termination, and no nested-team cards. | User. | Resolved and approved 2026-08-30. |
| DEC-002 | How much status/age metadata remains continuously visible? | Governs density and information recovery. | Approved responsive metadata: age yields at 260/320px and reveals on hover/focus; remains continuous at 520px; deepest status may yield at 260px. | User. | Resolved and approved 2026-08-30. |
| DEC-003 | How should team nodes differ from agents and transient teams? | Governs compact, non-color role recognition. | Approved unboxed filled User group icon + semibold configured-team name; circular agent avatars; separate dashed bolt transient-team treatment. | User. | Resolved and approved 2026-08-30. |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001, BEH-002 | AC-001 | SCN-001 | `ui-ux-spec.md`; `VIS-001`, `VIS-002`, `VIS-005`. |
| REQ-002 | BEH-002, BEH-005 | AC-001, AC-002 | SCN-001, SCN-002 | Approved DEC-001; `VIS-001`–`VIS-005`. |
| REQ-003 | BEH-001–BEH-003 | AC-001, AC-006 | SCN-001, SCN-004 | Approved DEC-003; `VIS-001`–`VIS-005`. |
| REQ-004 | BEH-002 | AC-002 | SCN-002 | `VIS-002`, `VIS-003`, `VIS-005`. |
| REQ-005 | BEH-002, BEH-003, BEH-005 | AC-002, AC-003 | SCN-002 | `VIS-003`; browser checks `NTH-RV6-010`–`014`, `019`. |
| REQ-006 | BEH-004 | AC-004, AC-005 | SCN-003 | `VIS-004`, `VIS-005`; browser checks `NTH-RV6-012`, `015`, `016`, `022`. |
| REQ-007 | BEH-004 | AC-004 | SCN-003 | `VIS-004`; focus/hover identity recovery evidence. |
| REQ-008 | BEH-003 | AC-005 | SCN-004 | Approved DEC-002; `VIS-004`, `VIS-005`. |
| REQ-009 | BEH-003 | AC-006 | SCN-004 | `VIS-003`, `VIS-005`; browser check `NTH-RV6-020`. |
| REQ-010 | BEH-001, BEH-002, BEH-005 | AC-003, AC-008 | SCN-002 | Browser validation `NTH-RV6-008`, `010`–`014`, `019`; existing test basis. |
| REQ-011 | BEH-002, BEH-005 | AC-007 | SCN-005 | `ui-ux-spec.md` accessibility section; browser checks `NTH-RV6-010`–`014`, `022`. |
| REQ-012 | BEH-004 | AC-004 | SCN-003 | `VIS-004`; approved responsive/localized-content boundary. |

## Downstream Architecture Input

- Product and system constraints architecture/implementation must preserve: Approved `ui-ux-spec.md` and `VIS-001`–`VIS-005`; existing execution-tree inputs and node identities; local expansion/selection ownership; team status aggregation; configured/transient distinction; live/history hydration; 260–520px panel behavior; application font presets; no review controls or prototype fixtures in production.
- Decisions intentionally deferred to architecture design: None. The approved behavior is supported by existing frontend presentation/state surfaces and requires no architecture-owned product decision.
- Technical facts downstream implementation should verify: Production component semantics for `tree`/`treeitem`, disclosure and row activation without fabricated structural selection, connector geometry from existing depth/sibling facts, responsive metadata/focus recovery, and representative configured/transient live/history coverage.
- Known feasibility or integration risks: The current stable row uses a `role="button"` container with a nested disclosure button and margin-only depth. Implementation must preserve interaction outcomes while adopting approved accessibility and visual semantics. Prototype query/localStorage, fixtures, and capture automation are explicitly excluded.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and open decisions are visible: `Yes — all material decisions resolved`
- User approval received: `Yes — 2026-08-30; user-decision-record.md`
- Requirements package ready for downstream route: `Yes`
- Remaining blocker: `None`

## Architecture Design Routing Assessment
- Assessment status: `Complete`
- Assessment owner and date: Requirements Engineering, 2026-08-30
- Preliminary task size: `Medium`
- Preliminary architectural risk: `Low`
- Structural surfaces reviewed: Workspace history renderer and transient row component; history tree-state and selection actions; execution-row types/projection; responsive layout/font presets; accessibility semantics; existing component/integration test boundaries.
- Payload/content surfaces reviewed: Existing team/agent names, summaries, addresses, statuses, ages, avatars, configured/transient execution rows, and illustrative prototype fixtures.
- Structural-impact triggers: `None`
- Evidence paths: `investigation-notes.md`; approved `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/ui-ux-spec.md`; `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/requirement-impact.md`; `runHistoryTypes.ts`; `runHistoryTeamExecutionRows.ts`; `WorkspaceHistoryWorkspaceSection.vue`; `WorkspaceTransientExecutionRow.vue`; existing Workspace history tests.
- Decision rationale: The approved change is a bounded frontend presentation/accessibility refinement using existing node type, depth, child, status, selection, and responsive surfaces. It changes no API/external contract, persisted schema/invariant, security/privacy boundary, concurrency/lifecycle, deployment topology, subsystem ownership, migration, or architectural pattern. Medium size reflects several responsive/interaction/accessibility states and durable tests, not architectural risk.
- Selected route: `Implementation Engineer`
- Outcome classification: `Approved Direct-Implementation`
- Direct-route conditions all satisfied: `Yes`
- Architecture design, review, and design-revision artifacts: `N/A — not applicable`
- Downstream re-entry trigger: Implementation Engineer must return `Design Impact` if production evidence requires a structural/API/persistence/security/lifecycle/ownership decision or contradicts the no-structural-impact assessment; return `Requirement Gap` for any proposed behavior outside this approved package.
