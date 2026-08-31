# Flat AgentTeam Domain Simplification — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Draft` — bootstrapped for transfer to another software-engineering team. The product direction is agreed at a conceptual level, but current-data transition behavior and the exact AgentOrg prerequisite boundary still require investigation and user approval before design or implementation.

## Goal / Problem Statement

Simplify `AgentTeam` into one flat, coordinated collaboration unit containing direct Agent members only. Retire configured AgentTeam-within-AgentTeam composition after native `AgentOrg` can represent the legitimate higher-level use case: dynamically assembling independent Agents and flat AgentTeams without inventing a synthetic parent Team or coordinator.

The change must distinguish configured nested AgentTeam membership from task-scoped Team executions created through supported task delegation. Removing configured recursive membership must not accidentally remove task delegation or its task-execution hierarchy.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | An `AgentTeamDefinition.nodes` entry can reference either an Agent or another AgentTeam, so the definition graph is recursive. | An AgentTeam definition contains direct Agent members only. A configured nested AgentTeam reference is not a valid Team member. | Agent aliases/member names, scoped Agent references, Team instructions, handoffs, avatar/category metadata, default launch configuration, and definition ownership scopes continue to work where still applicable. | R-001, R-002, R-003; AC-001, AC-002, AC-003 |
| BEH-002 | Launch planning, configured TeamRun state, execution-tree persistence, hydration, lifecycle, and UI configuration recursively represent root and nested configured Teams. | A configured AgentTeam run has one Team scope and direct configured Agent executions only. Recursive configured-Team launch and lifecycle machinery is removed after all replacement paths exist. | Direct Agent run configuration, Team default configuration, per-Agent configuration, workspace selection, run history, event visibility, and termination outcomes remain supported. | R-004, R-005, R-006, R-013; AC-004, AC-005, AC-006, AC-013 |
| BEH-003 | Rooted canonical addresses and natural-language handoffs can address Agents or Teams across a recursive Team definition graph; a Team target resolves through its direct Agent coordinator. | Flat AgentTeams retain the same path-addressing and handoff semantics within their boundary. AgentOrg later owns cross-team and root-Agent addresses and handoffs. | Handoff sources remain Agents; Team targets resolve through a direct Agent coordinator; message and task recipients remain explicit and canonical. | R-007, R-008; AC-007, AC-008 |
| BEH-004 | AgentTeam creation/editing, GraphQL contracts, file-backed definitions, detail views, launch editors, and workspace trees expose nested configured Team members. | Supported AgentTeam authoring and current contracts expose Agent members only; nested-Team-specific authoring and configured-run presentation are removed. | Flat-Team authoring, catalog refresh, detail/list views, launch, and workspace interaction remain available. | R-003, R-009, R-010; AC-002, AC-009, AC-010 |
| BEH-005 | Users approximate a company or department by creating a synthetic root AgentTeam containing independent Agents and nested AgentTeams; that synthetic Team must still declare a coordinator. | Native AgentOrg is the composition owner for independent Agents plus flat AgentTeams and does not require an organization coordinator. Existing org-like configurations are not stranded by premature nested-Team removal. | Every actual AgentTeam continues to require a direct Agent coordinator. Explicit AgentOrg entry-member selection remains a separate AgentOrg requirement. | R-011, R-012; AC-011, AC-012 |
| BEH-006 | Persisted definition files and TeamRun execution-tree packages can contain configured nested Team nodes; task delegation can also produce task-scoped nested Team executions. | The transition for existing configured nested definitions and stored run packages is evidence-backed and explicit. Configured nesting is removed without conflating it with supported task-scoped Team execution. | Required user history and supported task delegation must not be silently destroyed. | R-013, R-014, R-015; AC-013, AC-014, AC-015 |

## Investigation Findings

- Current server domain model explicitly permits `TeamMember.refType: "agent" | "agent_team"`.
- `TeamDefinitionGraphResolver`, `TeamHandoffCompiler`, and `TeamDefinitionTopologyPlanner` recursively resolve, validate, compile, address, and launch configured child Teams.
- `TeamRunConfig` and the V2 execution-tree schema recursively store configured Agent and Team nodes, with one default launch configuration per Team scope.
- The GraphQL definition contract exposes `TeamMemberType.AGENT_TEAM`, and the frontend contains nested-Team authoring, recursive launch-configuration, workspace-tree, documentation, and test behavior.
- The current runtime also contains task-scoped Team execution types. Those require separate analysis because they represent delegated work, not configured Team membership.
- The repository's currently inspected application-owned example teams are flat, but local/server-data and other imported packages may contain nested definitions. Representative persisted data and volume have not yet been audited.
- Native AgentOrg is not available on the bootstrapped base. Removing nested composition before AgentOrg replacement would create a product capability gap.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/flat-agent-team-domain-simplification/flat-agent-team-concept.md` | Concept and scenario supplement | R-001–R-015 | AC-001–AC-015 | `Draft`; approval required with requirements basis | Defines the intended domain distinction, example organization, configured-versus-task nesting boundary, and proposed sequencing. |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor` / `Cleanup` / `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: `AgentTeam` currently owns both one coordinated Team and recursive organization-like composition. The recursive shape propagates into definition resolution, handoff compilation, launch configuration, runtime state, persistence, API, and UI. A synthetic parent Team also requires a coordinator even when the modeled subject is actually an organization.
- Requirement or scope impact: simplification is cross-cutting and must be sequenced after an AgentOrg replacement boundary exists. Task-scoped delegation hierarchy and historical data must be investigated rather than removed merely because they are recursive.

## Recommendations

1. Keep the target domain small: AgentTeam contains Agents; AgentOrg contains independent Agents and AgentTeams.
2. Preserve path-like canonical addressing instead of replacing it with flat, name-only addressing.
3. Make the AgentOrg composition prerequisite explicit before disabling nested configured Team definitions.
4. Separate configured Team membership from task-scoped delegated Team execution in all requirements, types, design, and removal inventories.
5. Coordinate with the concurrent dynamic-AgentTeam work so it does not add new recursive configured-Team mutation dependencies.
6. Do not choose a migration strategy until representative definitions, stored TeamRun packages, normal readers/writers, and history expectations are inspected.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large` — the recursive configured-Team concept crosses server domain models, definition discovery and validation, launch planning, runtime ownership, persistence, GraphQL, frontend authoring/configuration, workspace rendering, documentation, and durable coverage.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: create or update a flat AgentTeam containing direct Agents.
- UC-002: reject configured AgentTeam-as-member input through every supported authoring/import boundary.
- UC-003: launch, operate, persist, restore, and terminate a flat configured TeamRun.
- UC-004: configure one Team default and direct-Agent launch settings without nested configured-Team scopes.
- UC-005: route messages and handoffs among direct Team members using the established addressing contract.
- UC-006: target a flat Team through its direct Agent coordinator.
- UC-007: assemble flat AgentTeams under native AgentOrg without requiring a synthetic parent Team.
- UC-008: preserve supported task delegation to an Agent or AgentTeam, including task-scoped execution hierarchy where still required.
- UC-009: transition repository/imported nested definitions and persisted TeamRun history according to an evidence-backed data decision.
- UC-010: remove nested-configured-Team-only API, frontend, runtime, persistence, documentation, and test machinery after replacement behavior is available.

### Out of Scope

- Designing or implementing the complete native AgentOrg feature in this ticket.
- Adding nested AgentOrg or arbitrary department hierarchy.
- Replacing natural-language handoff rules with executable predicates or a workflow engine.
- Removing task delegation merely because delegated Team executions are structurally nested.
- Automatic filesystem watching or unrelated package-refresh behavior.
- Dynamic AgentOrg optimization or self-modification behavior.
- A compatibility wrapper that continues accepting configured nested Team definitions indefinitely.
- Unapproved deletion of historical TeamRun records.

### Preserved Behavior Boundary

- Preserve the outcomes identified by BEH-002, BEH-003, BEH-004, and BEH-006 for flat Teams and supported task delegation.
- Preserve existing rooted address syntax and Team-to-coordinator resolution unless a separately approved requirement changes them.
- Preserve direct-Agent Team coordination, messaging, launch configuration, workspace operation, termination, and required history.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **R-001:** `AgentTeamDefinition` must accept direct Agent members only in the target model.
- **R-002:** Every AgentTeam must continue to identify exactly one direct Agent member as coordinator.
- **R-003:** All supported AgentTeam create, update, file-import, application-package, catalog-refresh, and validation surfaces must enforce the flat-member invariant consistently.
- **R-004:** A configured TeamRun must own one Team scope plus its direct configured Agent executions; it must not materialize configured child TeamRun placements.
- **R-005:** Flat Team launch configuration must retain a Team default and supported direct-Agent overrides without requiring nested-Team configuration entries.
- **R-006:** Flat TeamRun lifecycle, termination, events, persistence, history, and restoration must preserve supported current outcomes.
- **R-007:** Rooted canonical address parsing and exact Agent recipient resolution must remain supported for flat Teams and remain reusable by AgentOrg.
- **R-008:** A handoff source must remain an Agent; a Team target must continue resolving through that Team's direct Agent coordinator.
- **R-009:** GraphQL and other external AgentTeam definition contracts must stop advertising or accepting configured AgentTeam members after the clean-cut transition.
- **R-010:** Frontend AgentTeam authoring, detail, launch configuration, workspace display, localization, documentation, and tests must remove nested-configured-Team-only behavior while preserving flat-Team behavior.
- **R-011:** Native AgentOrg must be available as the supported replacement for configurations that genuinely assemble independent Agents and multiple flat AgentTeams before nested configured-Team support is retired for users.
- **R-012:** AgentOrg must remain semantically distinct: organization leadership roles such as CEO do not create a mandatory organization coordinator; AgentTeam coordinator behavior remains Team-local.
- **R-013:** The design must inventory and distinguish configured Team nodes, task-scoped Team executions, and historical projections before identifying code or schema for removal.
- **R-014:** The persisted-data decision must be based on representative nested definition and TeamRun data, required history semantics, normal readers/writers, and operational constraints.
- **R-015:** The change must not remove supported task delegation to AgentTeams or task-scoped Team execution solely as a side effect of flattening configured Team membership.
- **R-016:** The solution must coordinate with concurrent dynamic-AgentTeam development and must not make recursive configured-Team mutation a new prerequisite of the flat target.

## Acceptance Criteria

- **AC-001:** Given a valid Team definition whose members all reference Agents, supported definition validation accepts it and identifies exactly one direct Agent coordinator.
- **AC-002:** Given a create, update, or imported Team definition containing an AgentTeam member, the supported boundary rejects it with one clear validation error and does not partially persist or publish the definition.
- **AC-003:** The current target AgentTeam domain/API shape has no configured member discriminator or branch whose only purpose is AgentTeam-as-member composition.
- **AC-004:** A user can launch a flat Team using its Team default and supported direct-Agent configuration without supplying nested Team configuration.
- **AC-005:** A running flat Team retains supported member messaging, handoffs, task delegation, event/status visibility, and workspace interaction.
- **AC-006:** Terminating and restoring a flat configured TeamRun produces the approved current outcomes without recursive configured-Team ownership.
- **AC-007:** Exact rooted addresses such as `/software_engineering_team/requirements_engineer` remain valid in the AgentOrg composition context, while a standalone flat Team continues using its established TeamRun address boundary.
- **AC-008:** Sending or handing off to a flat Team resolves to its declared direct Agent coordinator; no synthetic coordinator is introduced for AgentOrg.
- **AC-009:** AgentTeam authoring UI offers Agent members only and contains no nested-Team selector, nested-Team count, circular-Team warning, or nested-Team member-details behavior.
- **AC-010:** Flat Team detail, launch, active workspace, history, and catalog experiences remain usable after nested configured-Team UI removal.
- **AC-011:** Before production removal of nested configured-Team support, a supported AgentOrg path can represent an organization containing independent Agents plus multiple flat AgentTeams.
- **AC-012:** An organization resembling the agreed product-company example can place the requirements engineer in the software-engineering Team, keep the CEO as an independent root Agent, and connect Product Design, Software Engineering, Marketing, Sales, and Finance through handoffs without a nested AgentTeam.
- **AC-013:** Every persisted configured-Team shape affected by the change has an explicit `Directly Usable`, `Discard or Rebuild`, or `Migration Required` outcome backed by representative evidence; implementation does not guess.
- **AC-014:** Existing historical records that the approved data decision requires preserving remain readable with correct member identity and meaningful history, or are transformed through an explicit migration boundary.
- **AC-015:** Supported delegation to a flat AgentTeam still creates, runs, settles, and reports its task execution correctly even though configured Team definitions can no longer contain child Teams.
- **AC-016:** The final change inventory contains no recursive configured-Team code retained only for compatibility and no newly added recursive configured-Team mutation path from the concurrent dynamic-Team work.

## Constraints / Dependencies

- Base branch for bootstrap: current tracked `origin/personal` at `80e2bd195c42ea3ced778dbc051d4d00edaef16f`.
- Native AgentOrg is a product prerequisite for capability-preserving removal, but its detailed contract remains owned by the AgentOrg ticket.
- A separate team is already working on dynamic AgentTeam runtime behavior; this ticket must be reconciled with that branch before design is finalized.
- Current canonical rooted addressing and natural-language handoff contracts are already deployed and should be reused.
- The current TeamRun V2 persistence shape and task-delegation records require separate subject-by-subject analysis.
- No production implementation is authorized from this Draft requirements basis.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: file-backed AgentTeam definitions from shared, Team-local, application-owned, and imported packages; TeamRun V2 execution-tree packages and associated history/task records under server data.
- Required outcome: `Undetermined`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: must inventory configured nested Team definitions separately from flat definitions and task-scoped execution records; required historical runs must not be silently discarded.
- Unacceptable data loss or corruption: loss or identity corruption of user-required TeamRun history, handoff/message context, task settlement, token/work-trace ownership, or application bindings.
- Relevant availability, maintenance-window, or rollout constraints: unknown at bootstrap; investigate normal startup migration facilities and whether old run packages remain active or only historical.
- Related requirement and acceptance-criteria IDs: R-013–R-015; AC-013–AC-015.

## Assumptions

- The agreed target treats AgentTeam as one flat collaboration unit and AgentOrg as the higher composition unit.
- AgentOrg may contain independent Agents and flat AgentTeams.
- AgentOrg does not require a coordinator; a user or caller selects an entry Agent or Team.
- Team targets continue to resolve through the Team's coordinator.
- Visual department grouping, if later needed, does not automatically require an executable nested runtime boundary.

## Risks / Open Questions

1. Which current user/imported definitions and active or historical TeamRuns actually contain configured nested Teams, and what volume/retention obligations apply?
2. Does native AgentOrg need to land first, or can one coordinated release introduce AgentOrg and remove configured Team nesting atomically?
3. Which recursive execution-tree types are configured-Team concerns versus task-delegation concerns that must remain?
4. Should historical configured nested-Team runs remain viewable indefinitely, be migrated into an AgentOrg history shape, or be explicitly archived by policy?
5. How far has the concurrent dynamic-AgentTeam implementation extended recursive configured-Team mutation, and what work should be avoided or revised?
6. Are Team-local child-Team definitions used as an ownership boundary for local Agents/files beyond composition, and if so where should that ownership move?
7. Should optional visual department grouping be AgentOrg metadata, a future feature, or omitted from the first native AgentOrg release?

## Requirement-To-Use-Case Coverage

| Requirement IDs | Covered Use Cases |
| --- | --- |
| R-001–R-003 | UC-001, UC-002 |
| R-004–R-006 | UC-003, UC-004 |
| R-007–R-008 | UC-005, UC-006, UC-007 |
| R-009–R-010 | UC-001, UC-002, UC-010 |
| R-011–R-012 | UC-007, UC-009, UC-010 |
| R-013–R-015 | UC-008, UC-009 |
| R-016 | UC-003, UC-010 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria IDs | Scenario Intent |
| --- | --- |
| AC-001–AC-003 | Definition contracts accept flat Teams and reject configured nested Team membership cleanly. |
| AC-004–AC-006 | Flat Team launch, runtime, lifecycle, persistence, and restoration remain usable. |
| AC-007–AC-008 | Addressing, Agent-sourced handoffs, and Team coordinator targeting remain consistent. |
| AC-009–AC-010 | Authoring and workspace UI become flat without regressing flat-Team journeys. |
| AC-011–AC-012 | AgentOrg replaces the real organization-composition use case before removal. |
| AC-013–AC-015 | Persisted data and task delegation receive truthful, subject-specific treatment. |
| AC-016 | The clean-cut target removes recursive configured-Team machinery and avoids concurrent reintroduction. |

## Approval Status

- Product direction: verbally supported during brainstorming on 2026-08-31.
- Requirements basis: `Draft`; not yet approved as design input.
- Supplemental concept artifact: `Draft`; approval required with requirements basis.
- Design authorization: not granted.
