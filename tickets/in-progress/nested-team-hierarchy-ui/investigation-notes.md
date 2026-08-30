# Requirements Investigation Notes

## Investigation Meta

- Request / ticket: `nested-team-hierarchy-ui`
- Stable package identifier: `nested-team-hierarchy-ui`
- Workspace root: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements` / `requirements/nested-team-hierarchy-ui`
- Base or reference revision: `3606d0ee7a3e9eb5d418199d7502f0f8460d7a56` (source inspection performed against the same revision in the clean primary checkout while the dedicated worktree populated)
- Bootstrap result: Complete. A dedicated worktree and task branch were created and verified clean before artifact creation.
- Bootstrap blocker: `N/A`
- Current requirements revision ID: `RER-001`
- Investigation status: Coherent draft baseline complete; `Requirements Visualization Needed` before user approval.

## Initial Request And Clarifications

- Original request: The user reported that a root team containing nested subteams is very hard to understand in the current UI. They were unsure whether font color, row display, or another issue was responsible, but identified that the organization/tree hierarchy is not easily presented.
- Clarifications received: Two screenshots show the same expanded Workspace history team run at wider and narrower panel widths. No future-state treatment was prescribed.
- User-supplied facts and constraints: A team is organizationally a rooted tree. The UI must make a root team and nested subteams understandable rather than rendering them as an ambiguous list.
- Initial ambiguity: The user did not choose between likely causes or solutions. The relative contribution of indentation, connector/grouping cues, node-role differentiation, metadata density, truncation, and color remains a material product-design decision.

## Product And Domain Understanding

- Product area: `autobyteus-web` desktop/web Workspace history left sidebar.
- Affected actors or systems: Users browsing team-run history for root Agent Teams with nested Agent Teams; configured members and transient task executions rendered in the same tree.
- Existing user or operational purpose: Locate and reopen a team run, inspect its organizational execution tree, understand status, expand/collapse nested teams, and select a concrete member.
- Relevant terminology:
  - **Team definition group**: Sidebar row grouping multiple runs of one Agent Team definition.
  - **Task/team run**: A particular execution under the definition group, labeled by summary.
  - **Root team**: The team whose run owns the displayed execution tree; its structural root is represented by the containing run rather than repeated as a child row.
  - **Nested team/subteam**: A configured `agent_team` row or task-team execution with descendants.
  - **Agent**: A concrete leaf or focusable execution row.
  - **Stable/configured row**: A row backed by the configured team topology.
  - **Transient execution row**: A task agent/team created during execution and projected into the same navigation tree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Runtime`/`Data`/`Contract`/`Web`/`User`/`Command`/`Other`) | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-08-30 | User | Current request text | Establish the problem and intent. | User explicitly recognizes a rooted organization tree but cannot read that hierarchy in the current UI and is unsure which visual factor is responsible. | Use a requirements visualizer rather than assuming one styling fix. |
| 2026-08-30 | User | `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_41d8ee5e50a0__image.png` | Inspect the wider current hierarchy. | 1036×1214 image: definition group, multiple task/run rows, and one expanded run; nested team/agent rows use similar gray typography, small 12px depth changes, repeated dot/avatar/time columns, and a small `TEAM` badge. Sibling subtrees read like one long list. | Include multi-subteam expanded fixture in visualizer. |
| 2026-08-30 | User | `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_00c9cf9ea623__image.png` | Inspect the narrow current hierarchy. | 660×830 image: long definition, run, and subteam labels truncate; `TEAM` badges and repeated ages consume scarce horizontal space; ancestry remains dependent on subtle indentation. | Test minimum width and Extra Large font. |
| 2026-08-30 | Command | `git status --short --branch`; `git worktree list --porcelain`; `git worktree add -b requirements/nested-team-hierarchy-ui ... HEAD` | Verify repository state and establish an isolated task workspace. | Primary checkout was clean but shared on `personal`; dedicated worktree was required and created at revision `3606d0e`. | Keep requirements artifacts in the dedicated worktree. |
| 2026-08-30 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Identify the screenshot surface and current rendering. | Template renders definition groups, run rows, and recursive `executionRows`; stable row depth is only `marginLeft: depth * 12px`; role distinction is a small `Team` badge; each stable row repeats the team run time; nested teams have aggregate status dots. | Requirements target this surface, not unrelated team screens. |
| 2026-08-30 | Code | `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Check task-team behavior in the same tree. | Transient rows use the same depth-only margin and disclosure pattern, with a light indigo background and no avatar/age. | Require consistent ancestry grammar while preserving transient identity. |
| 2026-08-30 | Code/Contract | `autobyteus-web/stores/runHistoryTypes.ts`; `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` | Determine whether the underlying hierarchy is present. | Execution rows already carry `depth`, `hasChildren`, `rowKey`, node kind, member address, and configured/transient identity. The root topology is preserved and flattened only into ordered presentation rows. | This is a presentation/readability gap, not missing team data. |
| 2026-08-30 | Code | `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`; `useWorkspaceHistorySelectionActions.ts` | Verify expansion/selection ownership. | Frontend tree state owns team/member expansion and ancestor reveal; selection actions preserve concrete target identity. | Preserve current behavior; no new persistence required. |
| 2026-08-30 | Test | `WorkspaceAgentRunsTreePanel.spec.ts`; `WorkspaceHistoryWorkspaceSection.spec.ts`; `HistoricalTeamLazyHydration.integration.spec.ts` | Identify enforced current behavior. | Tests cover default-collapsed subteams, independent disclosure, structural team toggle without fake Agent selection, child selection, automatic ancestor expansion, nested aggregate status, transient rows, and history hydration. They do not assert a strong visual hierarchy or full accessible tree relationships. | Preserve behavior and add rendered/accessibility checks downstream. |
| 2026-08-30 | Doc | `autobyteus-web/docs/agent_execution_architecture.md`, Workspace history section | Verify documented product intent. | Docs explicitly state nested teams are collapsed by default, recursively indented, and remain selectable/revealable. The current contract emphasizes expansion mechanics but not strong hierarchy cues. | Treat current mechanics as preserved behavior. |
| 2026-08-30 | Code | `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts`; `autobyteus-web/composables/useLeftPanel.ts` | Establish supported panel widths. | Left panel defaults to 320px, has a 260px minimum and 520px maximum, and is user-resizable. | Visualizer must exercise 260/320/520px. |
| 2026-08-30 | Code/Test | `autobyteus-web/display/fontSize/appFontSizePresets.ts`; `appFontSizeStore.ts`; display setting tests | Establish supported font scaling. | The app supports Default 100%, Large 112.5%, and Extra Large 125%. | Include Default and worst-case Extra Large; final validation covers all three. |
| 2026-08-30 | Git/Doc | `git log -- WorkspaceHistoryWorkspaceSection.vue`; `tickets/done/team-tasks-auto-open/requirements-doc.md` and `design-spec.md` | Understand why current collapse behavior exists. | Earlier work intentionally replaced an always-expanded flat list with default-collapsed recursive rows and 12px indentation. The current complaint shows that collapse controls alone did not make the opened hierarchy legible. | Do not regress to always-expanded; solve hierarchy comprehension. |
| 2026-08-30 | Git | Commit `dcd0baf8c` (`feat(web): show nested team aggregate status`) | Confirm recent status treatment. | Nested teams now show aggregate descendant status, increasing useful information but also adding another repeated glyph in the dense row. | Preserve semantics; reconsider visual priority only. |
| 2026-08-30 | Command | `file` and Pillow image inspection | Confirm screenshot dimensions. | Images are 1036×1214 and 660×830 RGBA PNGs. | Use as current-state references only. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Production Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User expands a Workspace, definition group, or team run. | `WorkspaceAgentRunsTreePanel` → `WorkspaceHistoryWorkspaceSection` → tree-state/actions. | One team definition groups its runs; expanding a run renders ordered execution rows. | Component, docs, tests. | High. |
| BEH-002 | User | User expands/collapses a nested team row. | `executionRows` + `visibleTeamExecutionRows` + member expansion keys. | Subteams start collapsed; chevron or structural row body toggles descendants; concrete members can be selected; selected ancestors reveal. | Source and tests. | High. |
| BEH-003 | System | Live/history projection supplies member status and topology. | Navigation projection builds stable/transient ordered rows; component renders status/aggregate status. | Underlying node kind, address, depth, and child relationships are correct; current issue is visual presentation. | Types, row builder, aggregate status source. | High. |
| BEH-004 | User | User resizes panel or changes app font preset. | Responsive layout and root font-size stores change available row space. | Width 260–520px and fonts 100–125% are supported; long labels truncate in a single-line flex row. | Layout/font code and screenshots. | High. |
| BEH-005 | User | User selects/focuses a concrete member or run. | Selection store + history selection actions + component highlight. | Indigo selection, hover, and status states coexist; current parent-child cues remain margin/badge based. | Source and tests. | High. |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Hosts the Workspace history surface and passes state/actions/avatar bindings. | This task stays within the existing left-sidebar history experience. | Confirm whether approved treatment remains bounded or warrants a reusable presentational primitive. |
| `WorkspaceHistoryWorkspaceSection.vue` | Renders workspace, agent, team-definition, run, stable member, and nested-team rows. | All affected hierarchy layers share one renderer; treatment must cover the whole expanded subtree. | Target component structure is downstream-owned. |
| `WorkspaceTransientExecutionRow.vue` | Renders temporary task agent/team rows using the same depth grammar. | Transient rows require consistent ancestry cues without losing temporary identity. | Whether to share a row primitive is downstream-owned. |
| `runHistoryTypes.ts` / `runHistoryTeamExecutionRows.ts` | Supply ordered rows with depth, child state, stable/transient kind, addresses, and IDs. | No new hierarchy payload is needed to satisfy the desired outcome. | Verify no approved visual behavior requires an unavailable label/relationship. |
| `useWorkspaceHistoryTreeState.ts` | Owns component-local expansion and ancestor reveal. | Preserve disclosure/reveal lifecycle; no persistence change required. | None unless implementation evidence contradicts bounded presentation. |
| `NestedTeamAggregateStatusDot.vue` / `workspaceHistoryNestedTeamStatus.ts` | Provide aggregate descendant activity state for team rows. | Preserve status meaning while lowering visual competition if the approved treatment does so. | None. |
| `responsiveLayoutPolicy.ts` / font-size presets | Define supported density boundaries. | Requirements and visual evidence must cover 260px + 125%. | None. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: Existing team-definition names, run summaries, member display names, addresses, statuses, timestamps, and execution-row projections.
- Existing readers, writers, or contracts that consume them: Run-history store/navigation projection and Workspace history components; no payload writer change is requested.
- Evidence paths: `runHistoryTypes.ts`, `runHistoryTeamExecutionRows.ts`, `WorkspaceHistoryWorkspaceSection.vue`.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: One existing frontend presentation surface and its component-local tree state; no API, persistence, security, concurrency, deployment, or ownership boundary is implicated by the draft behavior.
- Existing structural surfaces that can support the approved behavior: Execution rows already expose node type, depth, children, addresses, selection IDs, and configured/transient identity; supported widths/font presets are already centrally defined.
- Evidence paths: Same source paths above plus `useWorkspaceHistoryTreeState.ts`, `useWorkspaceHistorySelectionActions.ts`, `responsiveLayoutPolicy.ts`.

### Potential Architecture-Design Triggers

- API or external-contract change: Absent in current evidence.
- Persistence schema or invariant change: Absent; expansion remains ephemeral.
- Security or privacy boundary change: Absent.
- Concurrency or lifecycle change: Absent; live/history refresh semantics are preserved.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: No confirmed trigger. Exact routing will be assessed only after requirements and visual decisions are approved.
- Confirmed absent, present, or unknown: Confirmed absent for API/persistence/security/concurrency/deployment/migration; structural refactoring remains unknown until the approved visual treatment is known, but current evidence supports a bounded frontend presentation change.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| User-provided screenshots mapped to source | Wide and narrow expanded root-team run with nested subteams. | The problem reproduces visually in two widths; no synthetic data mutation is needed to establish the current UX gap. | Requirements must cover hierarchy, density, truncation, and supported widths. | Both absolute screenshot paths in the requirements document. |
| Source/test inspection | Nested subteam disclosure and selection behavior. | Current mechanics are implemented and tested; failure is not missing collapse support. | Preserve behavior and focus product work on readable hierarchy. | Component and test paths in Source Log. |
| No local runtime launch performed | Current-state UI evidence. | The supplied screenshots are direct current-product evidence and source mapping is high confidence. A runnable comparison is more valuable than another identical reproduction. | Product Prototyper should bootstrap/use the existing frontend locator for interactive alternatives. | `N/A` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Root team plus nested subteams must read as an organization tree; current hierarchy is hard to understand. | Direct, strong. | Primary outcome is hierarchy comprehension, not merely a color tweak. | Which visual language feels clearest? |
| User screenshots | Similar rows, subtle offsets, truncation, badge/metadata crowding at two widths. | Direct current-state evidence. | Cover node-role contrast, ancestry cues, metadata priority, and responsive states. | How much metadata should remain always visible? |
| Existing product behavior/tests | Collapse, selection, status, transient tasks, and refresh behavior are intentional. | Strong implementation/product evidence. | Treat these outcomes as preservation requirements. | None material. |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `@autobyteus/team-stream-contracts` execution tree | Workspace lockfile/current repository revision | Supplies root/nested topology consumed by navigation projection. | Type imports and row builder. | No change expected. |
| Vue/Tailwind/desktop web shell | Current repository revision | Existing renderer, disclosure state, responsive widths, and focus styling. | Component and layout source. | Final accessibility semantics must avoid invalid or ambiguous nested interactive structure. |
| WCAG-aligned accessible tree outcomes | Product accessibility requirement | Hierarchy must not rely only on color/indentation; name, level/relationship, selection, and expanded state must be programmatic. | Derived from the user's tree requirement and current ARIA partial support. | Exact semantic pattern will be downstream/prototype informed. |

## Persisted Data And State Facts

- Affected stored or external subject: No persisted product data change.
- Location and representative shape: Existing run-history execution tree and frontend projection only.
- Approximate volume: Representative UI may contain several subteams and dozens of visible nodes; no new volume contract is created.
- Current readers and writers: Backend history/team stream supply data; frontend stores/projectors read it; this task changes presentation only.
- Current unknown/extra-field behavior: Not applicable.
- Required semantics or data that must be preserved: Node kinds, addresses, run IDs, depth/children, status, summaries, timestamps, selection and action targets.
- Acceptable loss, reset, rebuild, or regeneration: Existing component-local expansion state may reset on unmount/restart.
- Privacy, retention, compliance, downtime, or operational constraints: None added.
- Remaining evidence gap: None for requirements visualization.

## Product Prototype Decision

- Prototype needed: `Yes — Requirements Visualization`
- Decision rationale: The user explicitly says the hierarchy feels wrong but cannot identify whether the cause is color, typography, layout, or another factor. Several plausible compact tree languages and metadata-density treatments can satisfy the behavioral requirements. Visual hierarchy, information density, truncation, and responsive behavior are central to the decision, so prose alone is insufficient.
- Requirement / behavior IDs involved: `BEH-001`–`BEH-005`; `REQ-001`–`REQ-012`; especially `DEC-001`–`DEC-003`.
- Product decisions or uncertainties to resolve:
  1. Branch/connector rails vs nested team surfaces vs a hybrid.
  2. Team-node differentiation from agent/task/run nodes.
  3. Always-visible vs reduced/responsive status and age metadata.
- Critical journey and states: Definition group with several runs; one expanded task run; coordinator/direct agent; three sibling subteams; one deeper subteam; stable and transient team; subteam collapsed/expanded; multiple subteams expanded; selected leaf; mixed statuses; long labels; 260/320/520px; Default and Extra Large fonts; hover, keyboard focus, and disclosure.
- Known constraints and non-goals: Preserve current grouping, collapse/selection/reveal/status/action semantics; no backend/data/global-navigation redesign; compact sidebar rather than full-page chart.
- Alternative evidence path / next action when no prototype is used: `N/A — interactive comparison is justified.`
- Prototype request artifact / message reference: Pending dynamic handoff after artifact persistence.
- Established separate prototype repository/root and ticket reference, when applicable: None yet; Product Design & Prototyping owns bootstrap, repository, ticket, and visualizer artifacts.

## Prototype Findings

- Prototype package path (external Product Design & Prototyping repository): Pending.
- Approved UI/UX specification path: `N/A — exploratory visualization only at this stage.`
- Review URL: Pending.
- Explicit user-confirmation reference: Pending.
- Journeys and scenarios validated: Pending.
- Final visual-reference paths: `N/A — no final prototype yet.`
- Product decisions supported by evidence: Pending `DEC-001`–`DEC-003`.
- Alternatives rejected or still open: All three decisions open.
- Mocked boundaries and production gaps: Visualizer may mock history/topology data but must use the source fixture constraints above.
- Requirements sections affected: UI/Interaction, Requirements, Acceptance Criteria, Open Decisions, Readiness.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_41d8ee5e50a0__image.png` | User | Wide current-state evidence. | Workspace history hierarchy. | REQ-001–REQ-008; AC-001, AC-002, AC-005. | Available. | Current-state evidence, not future-state approval. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_5fe79472c2324349aa5399cf00f469e8/requirements_engineering_team_90aa23f500764922b5162216363580af/requirements_engineer_6ebad92b619a4af186fd2937d6ef41ef/context_files/ctx_00c9cf9ea623__image.png` | User | Narrow current-state evidence. | Workspace history hierarchy. | REQ-003, REQ-006–REQ-008; AC-004, AC-005. | Available. | Current-state evidence, not future-state approval. |

## Assumptions, Unknowns, And Risks

| ID | Type (`Assumption`/`Unknown`/`Risk`) | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | The intended surface is Workspace history, matching source and screenshots. | Prevents accidental redesign of unrelated team views. | Validated by code/visual mapping; user may correct during visualizer review. | High-confidence. |
| UNK-001 | Unknown | Preferred compact tree visual language. | Determines normative future-state presentation. | Product Prototyper visualizer + user decision. | Open. |
| UNK-002 | Unknown | Preferred metadata density at narrow width. | Could materially change scanability and information visibility. | Product Prototyper visualizer + user decision. | Open. |
| UNK-003 | Unknown | Preferred team-vs-agent node emphasis. | Badge-only treatment is insufficient, but a heavy card may waste space. | Product Prototyper visualizer + user decision. | Open. |
| RISK-001 | Risk | Solving only font color may leave ancestry ambiguous. | Color does not communicate parent-child relationships and is inaccessible as the sole cue. | Enforce REQ-002/REQ-011 and compare structural alternatives. | Mitigated in draft. |
| RISK-002 | Risk | Strong connector/group styling may consume too much width at 260px/125%. | A visually clear wide prototype can fail in supported narrow settings. | Visualizer and final validation matrix. | Open. |
| RISK-003 | Risk | Changing row composition can regress disclosure/selection/status/transient behavior. | These are established workflows with existing tests. | Preservation requirements and focused test coverage. | Controlled. |
| RISK-004 | Risk | Visual semantics and accessibility semantics may diverge. | A tree that looks clear may remain ambiguous to screen readers or keyboard users. | AC-007 plus accessibility-tree inspection. | Open. |

## Requirement Implications

- The root cause is not missing topology: the model already contains node kind, depth, children, and addresses, and nested subteams already collapse/expand correctly.
- The current presentation compresses four roles—definition group, task/run, nested team, and agent—into a nearly uniform row language. A 12px margin and `Team` badge are insufficient when multiple subteams expand or labels truncate.
- Repeated status/avatar/age glyphs create horizontal columns that can visually outweigh the tree structure. Status semantics should remain, but the visualizer must determine their priority and responsive placement.
- Supported left-panel and font settings make narrow density a first-class requirement, not an edge case.
- A requirements visualizer is necessary before approval because the user has identified the outcome but not the preferred visual grammar.

## Notes For Downstream Architecture Design Or Direct Implementation

- Use the approved visual/product decision, not an invented styling choice.
- Preserve existing execution-tree identities, configured/transient classification, component-local expansion, ancestor reveal, status aggregation, selection targets, and live/history refresh outcomes.
- Current evidence indicates no backend/API/persistence change is needed. Reassess routing after the visual decisions and user approval are integrated.
- Verify keyboard and accessibility-tree semantics; the current visual row/declaration pattern should not be treated as a normative target structure.
