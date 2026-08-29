# Requirements Investigation Notes

## Investigation Meta

- Request / ticket: `subteam-aggregate-status`
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/subteam-aggregate-status-requirements`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/subteam-aggregate-status-requirements` / `requirements/subteam-aggregate-status`
- Base or reference revision: `9d0fd7c570d58da1af2c7a40279327c8a20a8093` (current local `personal` revision supplied by the task environment)
- Bootstrap result: Dedicated clean Git worktree and branch created successfully from the available local base. Worktree initialization initially exceeded the command yield window but completed in the background; final `git status --short --branch` was clean before investigation.
- Bootstrap blocker: `N/A`
- Current requirements revision ID: `RER-001`
- Investigation status: `Complete for requirements approval; user approval pending`

## Initial Request And Clarifications

- Original request: Analyze why a nested Team row shows no status even when one member is running and another is idle, and define behavior so a status icon before the Team avatar stays visible when the Team is collapsed.
- Clarifications received: The user explicitly identified the desired example: `product_prototyper` running (blue) plus `prototype_bootstrapper` idle (green) should make the `product_design_prototyping_team` row busy/blue.
- User-supplied facts and constraints: The subteam execution itself is working correctly; the problem is frontend status presentation. The status icon should appear before the Team's initial/avatar and remain informative when collapsed.
- Initial ambiguity: The user specified running+idle but not all mixed-state precedence, recursive descendants, task-scoped descendants, empty state, or whether “Team status” should be authoritative. `RER-001` proposes presentation-only recursive aggregation and a complete precedence for explicit approval.

## Product And Domain Understanding

- Product area: Desktop/web Workspaces sidebar, TeamRun history/current execution hierarchy.
- Affected actors or systems: Users monitoring nested configured Teams; frontend execution-tree projection and row presentation.
- Existing user or operational purpose: The tree supports navigation, selection, disclosure, status monitoring, TeamRun actions, and current/historical execution inspection.
- Relevant terminology:
  - **Stable nested Team row**: A configured structural Team member row (`kind: agent_team`) with a `TEAM` badge in an expanded root TeamRun.
  - **Exact Agent status**: One Agent execution's `offline`, `initializing`, `idle`, `running`, or `error` projection.
  - **Binary Team activity**: Existing root TeamRun or Team-definition any-active blue/gray cue based on `isActive`, deliberately not a five-state Team status.
  - **Aggregate Team-row status**: Proposed presentation-only summary over scoped descendant Agent statuses.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Runtime`/`Data`/`Contract`/`Web`/`User`/`Command`/`Other`) | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-08-29 | User | Request text and three supplied PNGs | Establish current and desired UI behavior. | Leaf Agent rows show gray/green/blue dots; nested Team rows show avatar/name/`TEAM` badge but no status dot. When collapsed, running member work is invisible. | Define dot placement, aggregation, and collapsed behavior. |
| 2026-08-29 | Command | `git rev-parse --show-toplevel; git branch --show-current; git status --short --branch; git worktree list --porcelain` | Verify repository and isolation. | Shared checkout was on `personal`; no dedicated task worktree existed. | Created isolated worktree/branch. |
| 2026-08-29 | Command | `git worktree add -b requirements/subteam-aggregate-status /home/autobyteus/workspace/.codex/worktrees/subteam-aggregate-status-requirements 9d0fd7c...` | Bootstrap isolated requirements workspace. | Worktree created; final status clean. | Use only this worktree for task artifacts. |
| 2026-08-29 | Other | `view_image` on all three supplied paths; `sha256sum` and `file` | Inspect exact visuals and preserve evidence identity. | Expanded images confirm no dot on Team rows; second image confirms running+idle; third image confirms collapsed visibility gap. PNG sizes are 858×942, 836×218, and 856×150. | Record images as current-state supplements. |
| 2026-08-29 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Identify row owner and current rendering condition. | Stable nested rows render `StatusDot` only when `displayRow.row.row.kind === 'agent'`; configured Team rows still render avatar/name/`TEAM` badge. Visible rows are filtered by expansion state. | Requirements can target stable nested Team rows precisely. |
| 2026-08-29 | Code | `autobyteus-web/components/workspace/common/StatusDot.vue`; `autobyteus-web/utils/workspaceStatusDotPresentation.ts`; `AgentStatus.ts` | Identify visual/status language. | Five statuses map to amber pulse, blue pulse, green, red, and gray. Unknown maps gray. `StatusDot` itself is decorative (`aria-hidden`). | Reuse visual language; add accessible Team-summary copy. |
| 2026-08-29 | Code | `autobyteus-web/components/workspace/common/TeamActivityDot.vue` | Compare Team-specific existing cue. | Root/group activity dot is binary blue/gray and has `role=img`, label, and title. | Do not reuse binary liveness semantics; reuse accessibility pattern where applicable. |
| 2026-08-29 | Code | `runHistoryTeamRows.ts`; `runHistoryTypes.ts`; `runHistoryTeamExecutionRows.ts` | Determine structural and status data availability. | Configured Team rows have `currentStatus: null` and recursively nested children. Flattened execution rows contain stable configured and transient task rows with depth/parent order; Agent rows carry exact statuses. | A frontend presentation summary can use existing projected data; no new field is required by the requirements. |
| 2026-08-29 | Code | `runHistoryNavigationProjection.ts`; `runHistoryNavigationPatches.ts`; `runHistoryNavigationStoreActions.ts` | Verify live status update path. | Exact Agent status changes patch current execution rows reactively. Stable nested payload copies are not an independent status authority. | Require aggregation from the current projection and reactive updates. |
| 2026-08-29 | Code | `useWorkspaceHistoryTreeState.ts`; current history component tests | Verify expansion/selection behavior and testability. | Expansion state already controls descendant visibility; focused tests include nested configured Teams, deeper Agent descendants, task-Team/Agent rows, disclosure, and status dots. | Preserve interactions and extend existing fixtures. |
| 2026-08-29 | Contract | `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Check public status boundary. | Public boundary has exact leaf `AGENT_STATUS` and binary root `TEAM_RUN_LIFECYCLE`; there is no aggregate Team status event. | Make the new summary explicitly presentation-only. |
| 2026-08-29 | Doc | `autobyteus-web/docs/agent_integration_minimal_bridge.md`; `autobyteus-web/docs/agent_execution_architecture.md` | Check current product/architecture invariants. | Team containers deliberately do not synthesize a root five-state status; current Team rows show binary activity without aggregate status. | Preserve root semantics; authorize only a nested-row display aggregation. |
| 2026-08-29 | Command | `git log --all --oneline -- WorkspaceHistoryWorkspaceSection.vue`; `git log -p -S...` | Determine whether Team-dot behavior was recently removed. | Historical component versions also restricted the row `StatusDot` to Agent rows; no verified current supported aggregate nested-Team dot was found. | Treat requested behavior as new UI behavior, not restoration of a proven current contract. |
| 2026-08-29 | Command | `test -d node_modules`; inspect package scripts | Assess ability to run baseline component tests without changing environment. | No root or worktree dependency installation is available. Static code/tests provide sufficient current-behavior evidence, but no test command was run. | Downstream runs focused test suites in its prepared environment. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Production Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Render a TeamRun's nested execution hierarchy. | Workspace history section iterates visible execution rows; stable row markup conditionally renders `StatusDot` only for Agent kind. | Configured Team row has no status dot in expanded or collapsed state. | Component source plus all three screenshots. | High. |
| BEH-002 | System | Exact Agent status projection/hydration or live patch. | Agent statuses enter current Team execution projection; individual stable/transient Agent rows render those values. | Agent status remains exact and five-state; structural Team `currentStatus` is null. | Row builders, projection, patches, status component. | High. |
| BEH-003 | User | Activate nested Team row or disclosure. | Tree-state expansion determines which deeper execution rows are visible. | Collapsing hides descendants and their status dots; row activation/selection semantics are otherwise functional. | Component, tree-state composable, tests, screenshot. | High. |
| BEH-004 | Contract | Root TeamRun lifecycle and Agent status streaming. | Public stream transports exact Agent status and binary root liveness independently. | There is intentionally no authoritative aggregate Team status. | Protocol and architecture docs. | High. |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Renders stable nested Team/Agent rows and controls collapsed descendant visibility. | New dot belongs to the existing nested-Team row experience; it must remain visible independently of descendant rendering. | Exact implementation structure is downstream-owned. |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | Maps exact status to the shared solid visual dot; decorative by default. | Visual mapping is established; Team aggregate needs separate accessible semantics without regressing Agent rows. | Whether to extend or wrap the presentation component is downstream-owned. |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Builds recursive stable Team/Agent row payload; configured Team status is null. | Do not require an authoritative Team status field. | None unless existing projection proves insufficient. |
| `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` | Produces current flattened stable/transient execution hierarchy with depth and status-bearing Agent rows. | Supports subtree-scoped presentation aggregation, including current task-scoped rows. | Downstream chooses the safe derived-selector boundary. |
| `autobyteus-web/stores/runHistoryNavigationPatches.ts` | Reactively patches exact current Agent execution-row status. | Aggregate must observe patched current rows rather than stale structural payload copies. | Downstream verifies update propagation and avoids structural drift. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Defines exact Agent status and binary root-Team lifecycle public boundary. | New behavior must not add a contract or transport field. | If a contract change is claimed necessary, return `Design Impact`. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: Current execution-row view models; Agent status enum values; current-state screenshots; localization strings for accessible status copy.
- Existing readers, writers, or contracts that consume them: Workspace history section reads projected rows; streaming/hydration paths write exact Agent statuses; status-dot presentation reads a status string/enum.
- Evidence paths: `runHistoryTypes.ts`, `runHistoryTeamExecutionRows.ts`, `runHistoryNavigationPatches.ts`, `StatusDot.vue`, `workspaceStatusDotPresentation.ts`.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: Workspace history row rendering, execution-row projection, exact Agent status transport, binary TeamRun lifecycle.
- Existing structural surfaces that can support the approved behavior: Current flattened hierarchy contains row kind, status-bearing Agent executions, depth/parent ordering, and receives reactive patches; the row owner already renders the requested location.
- Evidence paths: `WorkspaceHistoryWorkspaceSection.vue`, `runHistoryTeamExecutionRows.ts`, `runHistoryNavigationProjection.ts`, `runHistoryNavigationPatches.ts`.

### Potential Architecture-Design Triggers

- API or external-contract change: No requirement asks for one; explicitly prohibited by `REQ-006`.
- Persistence schema or invariant change: No; aggregate is recomputed presentation state.
- Security or privacy boundary change: No.
- Concurrency or lifecycle change: No; exact statuses and root liveness remain authoritative and independent.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: No requirement asks for one; frontend display and existing projection surfaces appear sufficient.
- Confirmed absent, present, or unknown: Preliminary investigation found no required structural trigger. Formal routing assessment is intentionally deferred until approval.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Original-resolution inspection of image 1 | Expanded root hierarchy with multiple configured nested Teams. | Agent rows show dots; configured Team rows do not. | Add Team-row aggregate without changing row hierarchy. | `ctx_4bdbf7a22eca__image.png` |
| Original-resolution inspection of image 2 | Product Team with running `product_prototyper` and idle `prototype_bootstrapper`. | Parent Team row has no dot despite visible blue child work. | Running must win over idle and produce blue. | `ctx_e2a356bf2caa__image.png` |
| Original-resolution inspection of image 3 | Product and Software Engineering Teams collapsed. | No descendant dots are visible and Team rows have no replacement signal. | Aggregate must stay visible/current while collapsed. | `ctx_d8d617902516__image.png` |
| Static component and test inspection | Baseline behavior and testability. | Rendering condition excludes Team rows; tests already model nested and transient executions. | Behavior is directly testable with focused frontend tests. | Code paths in Source Log. |
| Dependency availability probe | Attempt to determine whether baseline component tests can run. | `node_modules` absent; no dependency installation performed during requirements investigation. | No runtime test evidence; static evidence is sufficient for the requirements baseline, downstream must execute tests. | Worktree command log represented in Source Log. |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User request | Know that a subteam is working even when collapsed. | Direct, explicit. | Aggregate indicator is mandatory and running+idle must be blue. | Full mixed-state precedence and descendant scope require approval. |
| User screenshots | Existing dot language and exact missing placement. | Direct visual evidence. | Put dot before Team avatar and preserve the rest of the row. | None for placement. |
| Existing product contracts | Team container has no authoritative five-state runtime status. | Authoritative code/docs. | Summary must be presentation-only and derived from exact Agent statuses. | None if package is approved as written. |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Team stream protocol | Repository revision `9d0fd7c...` | Exact leaf `AGENT_STATUS`; binary root `TEAM_RUN_LIFECYCLE`; no aggregate event. | `autobyteus-ts/docs/agent_team_streaming_protocol.md` | UI summary could be misinterpreted as transport authority unless guarded. |
| Agent status enum/presentation | Repository revision `9d0fd7c...` | Five values and established colors/pulse behavior. | `AgentStatus.ts`; `workspaceStatusDotPresentation.ts` | Unknown/null currently falls back gray, which requirements retain. |
| Vue execution-tree UI | Repository revision `9d0fd7c...` | Reactive current projection and disclosure hierarchy. | Components, stores, tests in Source Log. | Downstream must ensure aggregate reads current patched rows. |

## Persisted Data And State Facts

- Affected stored or external subject: None. The requested aggregate is presentation-only.
- Location and representative shape: Current frontend `RunHistoryTeamExecutionRow[]` includes structural Team rows and exact Agent execution rows with `depth`, `rowKey`, and status.
- Approximate volume: One row per currently represented configured or task execution in a displayed TeamRun; no user-provided volume constraint.
- Current readers and writers: Workspace history section reads; hydration and streaming projection update exact Agent statuses.
- Current unknown/extra-field behavior: Unknown/missing exact Agent status presents as offline/gray; no aggregate field exists.
- Required semantics or data that must be preserved: Exact Agent status, root TeamRun liveness, Team hierarchy, and history.
- Acceptable loss, reset, rebuild, or regeneration: Aggregate can be recomputed and discarded on rerender/restart.
- Privacy, retention, compliance, downtime, or operational constraints: None identified.
- Remaining evidence gap: No runtime component test was executed because dependencies were not installed in the isolated requirements worktree.

## Product Prototype Decision

- Prototype needed: `No`
- Decision rationale: This is a small, precisely located UI addition that reuses an existing five-state dot language. The user supplied expanded, mixed-status, and collapsed screenshots and specified the desired blue state and placement. A runnable visualizer or final prototype would not materially clarify the remaining policy decision, which is expressed more precisely by the status decision table.
- Requirement / behavior IDs involved: `BEH-001`–`BEH-004`; `REQ-001`–`REQ-007`.
- Product decisions or uncertainties to resolve: User approval of recursive/task-scoped scope and the precedence in `DEC-001`.
- Critical journey and states: Expanded/collapsed nested Team; running+idle; initializing; error; idle+offline; all offline/unknown; deeper scoped execution transition.
- Known constraints and non-goals: No sidebar redesign, no new runtime Team status, no contract/persistence change, no transient task-Team row indicator.
- Alternative evidence path / next action when no prototype is used: Review the canonical requirements and decision table directly with the user; use focused component/status-matrix tests downstream.
- Prototype request artifact / message reference: `N/A — not applicable`
- Established separate prototype repository/root and ticket reference, when applicable: `N/A — not applicable`

## Prototype Findings

- Prototype package path (external Product Design & Prototyping repository): `N/A — not applicable`
- Approved UI/UX specification path: `N/A — not applicable`
- Review URL: `N/A — not applicable`
- Explicit user-confirmation reference: `N/A — not applicable`
- Journeys and scenarios validated: `N/A — not applicable`
- Final visual-reference paths: `N/A — not applicable`
- Product decisions supported by evidence: `N/A — not applicable`
- Alternatives rejected or still open: `N/A — not applicable`
- Mocked boundaries and production gaps: `N/A — not applicable`
- Requirements sections affected: `N/A — not applicable`

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_fccba22e6afe4135adc5f291e40d0c11/requirements_engineering_team_cadb40a9294441749a281240f76f4c46/requirements_engineer_507e44c974c042febf8dd5aab5c47730/context_files/ctx_4bdbf7a22eca__image.png` | User | Current expanded hierarchy evidence. SHA-256 `4b5ed08893ca3d6d7cdf053b84bdc2219bc4e2b5bbee6b7e4b1ef5263f979a16`. | Current-state only. | REQ-001, AC-008 | Verified | Approval not applicable. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_fccba22e6afe4135adc5f291e40d0c11/requirements_engineering_team_cadb40a9294441749a281240f76f4c46/requirements_engineer_507e44c974c042febf8dd5aab5c47730/context_files/ctx_e2a356bf2caa__image.png` | User | Running+idle evidence. SHA-256 `0b1cc2073a70dd925887be3b11c1c472b91a220e7347e9608752d1989eaf3f96`. | Current-state only. | REQ-003, AC-001 | Verified | Approval not applicable. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_fccba22e6afe4135adc5f291e40d0c11/requirements_engineering_team_cadb40a9294441749a281240f76f4c46/requirements_engineer_507e44c974c042febf8dd5aab5c47730/context_files/ctx_d8d617902516__image.png` | User | Collapsed visibility-gap evidence. SHA-256 `a589953affcf1cb79ca168c6cff0142f451fab2c3a0f60928690ef56eb7fd9f9`. | Current-state only. | REQ-005, AC-001 | Verified | Approval not applicable. |

## Assumptions, Unknowns, And Risks

| ID | Type (`Assumption`/`Unknown`/`Risk`) | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Team status is presentation-only, not authoritative lifecycle. | Prevents conflict with existing contracts. | User approves `REQ-006`; downstream rechecks. | Pending approval. |
| ASM-002 | Assumption | Precedence is running > initializing > error > idle > offline. | Defines mixed cases and keeps work visible. | User decision `DEC-001`. | Pending approval. |
| ASM-003 | Assumption | Recursive and current task-scoped Agent descendants count. | Prevents hidden work in deeper execution subtrees. | User decision `DEC-001`. | Pending approval. |
| RISK-001 | Risk | A Team aggregate dot could be reused as liveness/readiness authority. | Would violate exact status and root lifecycle separation. | `REQ-006`, `AC-010`; downstream review. | Mitigated in requirements. |
| RISK-002 | Risk | Aggregating from stale nested payload copies could miss live row patches. | Collapsed dot could fail the core live-update goal. | `REQ-005`; current projection evidence; downstream tests. | Mitigated in requirements. |
| GAP-001 | Unknown | Baseline tests were not executed in this worktree because dependencies are absent. | Static evidence is strong, but runtime regression proof remains downstream work. | Implementation Engineer runs focused test suites. | Open, non-blocking for approval. |

## Requirement Implications

- The missing dot is a verified frontend presentation gap, not evidence that the subteam runtime is broken.
- Exact descendant Agent status and hierarchy already exist in the current frontend projection; the desired behavior can be stated without authorizing a backend aggregate status.
- The user's explicit running+idle example requires `running` to dominate at least `idle`. The complete proposed order additionally makes active initialization visible, reports error when no active work exists, and falls back deterministically.
- The collapsed-state goal requires the aggregate to be computed independently of whether descendant rows are rendered.
- Current docs explicitly reject a root five-state Team status, so the requirement distinguishes a nested-row display summary from runtime authority and preserves root Team activity semantics.
- A prototype would add little evidence; a decision table plus current screenshots is the cheaper, more precise approval basis.

## Notes For Downstream Architecture Design Or Direct Implementation

- Preserve the public contract: exact Agent statuses plus binary root TeamRun lifecycle; do not add an aggregate event/field, persistence, or polling path under this package.
- Use the current scoped execution projection as evidence. Live exact-Agent patches update current execution rows; structural nested row payload copies are not independently authoritative after patches.
- Verify recursion, task-scoped descendant inclusion, sibling isolation, empty/unknown fallback, and collapsed live updates with focused tests.
- Preserve selection/disclosure event behavior and current binary activity dots.
- This investigation records feasibility and constraints only; it does not prescribe the target module, helper, selector, or data-flow architecture.
