# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `handoff-display-label-only`
- Request / ticket: User request on 2026-09-22 to assess removing the redundant address row from Agent Team and Agent Org handoff endpoints.
- Requirements owner: Solution Designer
- Date: 2026-09-22
- Approval state and reference: Explicitly approved by the user on 2026-09-22 in the message: “cool. approve”.
- Exact approved requirements baseline / solution revision: `SR-002` requirements content, recorded by approval round `SR-003`.
- Behavior-defining supplements and their approved versions: User-supplied current-state screenshots are evidence only; no behavior-defining supplement requires separate approval.

## Problem And Desired Outcome

- Problem: Every resolved `From` and `To` endpoint tile renders a readable participant label and then repeats the same identity as a slash-prefixed, underscore-heavy canonical address on a second row. This adds visual height and noise in both Agent Team and Agent Org handoff sections.
- Affected actors or systems: Users inspecting or editing Agent Team and Agent Org definition handoffs.
- Desired outcome: Treat rooted canonical addresses as internal identifiers rather than user-facing names. Both display and edit surfaces use clear, contextual human-readable endpoint labels without showing slash-prefixed addresses.
- Observable definition of success: A user can inspect and author handoffs using unambiguous readable names only, while handoff storage, selection values, validation, stale-endpoint diagnosis, routing semantics, and `When` content remain unchanged internally.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Resolved `From` and `To` endpoint tiles show an icon and readable label on the first row, then the canonical address in monospaced text on a second row. | Render each resolved endpoint tile as one visual row containing its existing type icon and readable label; do not render the persistent address row. | Explicit `From`, `To`, arrow, `When` conditions, handoff ordering, and unavailable-endpoint feedback remain. | User screenshots; `HandoffManager.vue:90-103,129-144`. |
| BEH-002 | User | SCN-003 | The shared edit experience shows `label · /canonical/address` in selector options and repeats the selected endpoint's address in a preview tile. | Use unambiguous human-readable labels in selector options and selected previews without showing rooted canonical addresses. | Endpoint eligibility, internally selected canonical value, validation, apply/cancel, and atomic parent-definition save remain unchanged. | `HandoffManager.vue:17-43,129-144,169-200`. |
| BEH-003 | User | SCN-001, SCN-002, SCN-003 | Long or duplicate-looking labels can rely on the address row for identification. Current Org edit labels can be based on referenced definition names even though unique configured placement names exist. | Make readable labels complete and unambiguous through hierarchy, grouping, and minimal human-readable placement context; do not use the rooted address as the disambiguator. | Agent Team, direct Agent, Team, and `Team / Agent` distinctions remain. | Agent Org screenshot; `AgentOrgExperience.vue:294-348`; member-name uniqueness contracts; `HandoffManager.vue:137-141`. |
| BEH-004 | Contract | SCN-001, SCN-002, SCN-003 | Canonical addresses back handoff identity, persistence, validation, and runtime routing. | Presentation-only change; do not alter address values or contracts. | Definition `{from,to,rules[]}` records, address resolution, Team coordinator semantics, and stale-address diagnostics remain unchanged. | `types/collaboration/handoffs.ts`; prior `REQ-006`, `REQ-021`, and `REQ-023`; HandoffManager validation. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User inspecting a Team or Org | Understand who hands work to whom and when | Faster, less repetitive scanning of `From` and `To` | Readable endpoint identity must remain clear, including long nested Org labels. |
| User authoring a handoff | Choose and validate exact endpoints | Readable labels uniquely identify choices without exposing internal rooted addresses | No change to eligibility or saved address values. |
| Collaboration runtime | Resolve configured handoffs exactly | No behavior or data change | Presentation cannot mutate routing or persistence contracts. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Inspect resolved Agent Team handoff cards in the Team detail surface.
- `UC-002`: Inspect resolved Agent Org handoff cards in the Org detail surface.
- `UC-003`: View a resolved selected-endpoint preview while creating or editing a Team-local or Org-owned handoff.
- `UC-004`: Diagnose an unavailable endpoint using a human-readable identity while retaining the canonical address internally for validation/logging.

### Out Of Scope

- Changing canonical address syntax, handoff persistence, endpoint catalogs, coordinator resolution, runtime routing, or tool contracts.
- Changing internal address values or removing address detail from developer diagnostics/logging.
- Redesigning the overall Handoff card, `When` content, edit actions, reorder behavior, empty state, or responsive From/To stacking.
- Revising unrelated surfaces that intentionally show exact addresses.

### Non-Goals

- No user-facing address-copy workflow, inspector panel, bespoke tooltip system, or prototype project is required.
- No change to endpoint labels, member names, handoff conditions, or definition data.

### Preserved Behavior Boundary

- Preserve `BEH-004`, `REQ-003`, `REQ-004`, and `AC-004` exactly.
- The change supersedes the earlier flat-AgentOrg package's user-facing address-visibility requirement (`REQ-020` / `AC-015`) across normal handoff inspection and authoring. It does not supersede canonical addresses as internal selection, validation, persistence, logging, or runtime identities.

### Review Authority

- Every blocking design or implementation finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID in this document.
- New address workflows, broader information-density changes, or runtime/address-contract changes are requirement gaps requiring explicit user approval.
- Reviewer comments do not amend this basis without Solution Designer reconciliation and user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Normal Agent Team and Agent Org handoff display and edit surfaces MUST represent every `From` and `To` endpoint with the existing endpoint-type icon and an unambiguous human-readable label and MUST NOT show the slash-prefixed canonical address. This applies to read-only cards, authoring selector options, resolved selected-endpoint previews, and user-facing stale/unavailable feedback. | BEH-001, BEH-002 | High | Rooted paths are implementation identifiers, not part of the user's handoff mental model. | User clarification; screenshots; `SR-002` approved in `SR-003`. |
| REQ-002 | A human-readable endpoint label MUST retain semantic specificity: Team-local Agent, direct Org member, Team, or `Team / Agent` as applicable. Labels MUST be unambiguous within the current choice set using hierarchy, option grouping, and—only when needed—minimal readable placement context. If a label is visually truncated, its complete readable form MUST remain accessible. A full rooted address MUST NOT be used as the user-facing disambiguator. | BEH-003 | High | Removing technical identifiers must not create ambiguous or inaccessible choices. | Label construction, member uniqueness rules, and user clarification. |
| REQ-003 | Canonical addresses MUST remain the unchanged internal option values and saved endpoint identities used for lookup, validation, persistence, logging, and runtime routing. An unavailable/stale endpoint MUST still receive actionable user-facing feedback identified by a readable endpoint description; raw address detail may remain in technical diagnostics but MUST NOT be required for normal user recovery. | BEH-002, BEH-004 | High | Separates the user vocabulary from the exact machine identity without weakening correctness or diagnosis. | Current select/error behavior and approved handoff validation contract. |
| REQ-004 | The change MUST NOT alter handoff data, endpoint eligibility, From/To direction, Team coordinator delivery, conditions, ordering, validation, save behavior, persistence, localization, or runtime routing. | BEH-004 | Critical | The request is a presentation-density improvement only. | Current types, component validation, and prior handoff contract. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, BEH-003; SCN-001 | Open an Agent Team detail containing handoffs. | Each resolved `From`/`To` tile has one icon-and-label identity row and no canonical address; the full readable label remains obtainable if clipped. | `From`, `To`, arrow, or `When` content is not removed; an unresolved endpoint still receives readable feedback. | Focused component assertion plus rendered desktop/narrow inspection. |
| AC-002 | REQ-001, REQ-002 | BEH-001, BEH-003; SCN-002 | Open an Agent Org detail containing direct and Team-mounted endpoints, including a long `Team / Agent` label. | Resolved endpoint tiles use the same one-row treatment; their readable labels preserve hierarchy and remain identifiable when truncated. | The UI does not fall back to an ambiguous member-only nickname or expose a permanent second address row. | Focused component assertion plus rendered long-label/narrow inspection. |
| AC-003 | REQ-001, REQ-002, REQ-003 | BEH-002; SCN-003 | Add or edit a Team or Org handoff, including a choice set whose ordinary names would otherwise collide. | Selector choices and selected previews use unambiguous readable labels without rooted addresses; applying the draft emits the same canonical values. | The change does not weaken eligible choices, allow self/duplicate delivery, or hide validation. | Component interaction tests for ordinary, hierarchical, duplicate-looking, and emitted-value cases. |
| AC-004 | REQ-003, REQ-004 | BEH-004; SCN-001, SCN-002, SCN-003 | Load a handoff whose endpoint is unavailable, and compare valid handoff serialization before/after the change. | User feedback identifies the unavailable endpoint readably without requiring a raw rooted address; valid `{from,to,rules[]}` output and technical diagnostics remain exact. | No data migration, address rewrite, coordinator change, or routing change occurs. | Stale-endpoint validation plus focused serialization and diagnostic non-regression checks. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Agent Team user | Scan Team-local handoff direction and conditions | Agent Team detail | Team has one or more valid handoffs | Open detail; scan From, To, and When | One-row readable endpoint identities reduce height/noise without rooted addresses | Unavailable endpoint remains explicitly and readably diagnosed | Supported Normal Scenario | Screenshot 1; Team detail callsite | REQ-001, REQ-002, REQ-004; AC-001, AC-004 |
| SCN-002 | User | Agent Org user | Scan cross-Team or Org-level handoffs | Agent Org detail | Org has direct/Team-mounted endpoints and valid handoffs | Open detail; scan From, To, and When | Readable hierarchical labels communicate identity without rooted addresses | Long label can be fully obtained; unavailable endpoint remains diagnosed | Supported Normal Scenario | Screenshot 2; Org detail and label projection code | REQ-001, REQ-002, REQ-004; AC-002, AC-004 |
| SCN-003 | User | Team/Org author | Choose exact handoff endpoints using product vocabulary | Team/Org create or edit | Eligible endpoints are loaded | Add/edit handoff; choose From/To; inspect selected previews; apply | Options and previews use clear readable labels only; saved internal addresses are unchanged | Existing field, stale, self-delivery, and duplicate validation remains | Supported Normal Scenario | Four shared component callsites; HandoffManager tests | REQ-001, REQ-002, REQ-003, REQ-004; AC-003, AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: User-supplied screenshots listed in `investigation-notes.md`.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: `N/A — Product Design was not requested; the change is a narrow refinement of an existing shared component.`
- Product prototype ticket record and folder (externally owned): `N/A — not requested`
- Prototype revision or commit: `N/A — not requested`
- UI/UX user-confirmation reference: User approval on 2026-09-22: “cool. approve”.
- Approved visual-reference baseline: Textual `SR-002` target behavior approved; supplied screenshots remain current-state problem evidence.
- Normative visual and interaction details: Display and edit use icons plus readable endpoint labels only; no rooted canonical address appears in normal handoff UI; label completeness and disambiguation remain accessible.
- Explicitly illustrative fixture content or permitted implementation variation: Names, addresses, and `When` text in the screenshots are fixtures. Existing spacing may be adjusted only as necessary to remove the empty second-row footprint.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Team detail, Org detail, Team authoring, Org authoring, long labels, narrow stacked layout, and unavailable endpoints; keyboard/screen-reader behavior must not regress.
- Explicitly unresolved product decisions: `N/A — the user approved the complete SR-002 boundary in SR-003.`

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002; AC-001, AC-002 | Accessibility | A visually clipped readable endpoint label has an accessible way to expose the complete label; keyboard/screen-reader semantics of the handoff remain intact. | Long Team/Agent labels in Team and Org detail/edit contexts. | DOM/accessibility assertion and rendered keyboard inspection. |
| QR-002 | REQ-001, REQ-004; AC-001–AC-004 | Compatibility | Existing desktop and narrow responsive layouts remain usable without horizontal overflow introduced by the change. | Shared HandoffManager view/edit modes. | Rendered desktop/narrow inspection. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: Exact handoff `from`, `to`, and ordered `rules` values.
- Loss, reset, rebuild, or regeneration that is acceptable: `N/A`
- Retention, privacy, compliance, volume, downtime, or operational constraints: `N/A`
- Unknowns requiring downstream investigation: `N/A`

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Handoff definition record | Preserve exact `{from,to,rules[]}` values and order | `types/collaboration/handoffs.ts` and existing backend contract | None expected; presentation-only. |
| Prior flat-AgentOrg handoff display requirement | Supersede user-facing canonical-address visibility in normal display and edit surfaces; retain exact addresses as internal and technical identities | Prior `REQ-020` / `AC-015`; current user clarification | Requires explicit approval because intended visible behavior changes. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_9dd6ff35f572__image.png` | Agent Team current-state evidence | REQ-001, AC-001 | Current evidence | Evidence only; approved target is recorded textually in `SR-002` / `SR-003` |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_d96241d3fbde__image.png` | Agent Org current-state evidence | REQ-001, REQ-002, AC-002 | Current evidence | Evidence only; approved target is recorded textually in `SR-002` / `SR-003` |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Rooted canonical addresses are machine identities rather than concepts users need for ordinary handoff inspection or authoring. | Supports removing them from both display and edit while preserving them internally. | User approval on 2026-09-22. | Confirmed |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approve the refined boundary: show no rooted canonical address in normal Team/Org handoff display or edit UI, while preserving exact addresses internally and using readable contextual labels for disambiguation and stale feedback? | This intended-behavior change authorizes design and implementation. | Approved: names/hierarchy are the user vocabulary; rooted paths remain an implementation contract. | User | Approved on 2026-09-22 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002, UC-003 | BEH-001, BEH-002 | AC-001, AC-002, AC-003 | SCN-001, SCN-002, SCN-003 | Two user screenshots |
| REQ-002 | UC-001, UC-002 | BEH-003 | AC-001, AC-002 | SCN-001, SCN-002 | Agent Org screenshot and label projection code |
| REQ-003 | UC-003, UC-004 | BEH-002, BEH-004 | AC-003, AC-004 | SCN-003 | Current internal values, error behavior, and tests |
| REQ-004 | UC-001–UC-004 | BEH-004 | AC-004 | SCN-001–SCN-003 | Types, validation, and prior handoff contract |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: `SCN-001`–`SCN-003`.
- Product and system constraints architecture must preserve: One shared HandoffManager serves Team/Org and view/edit; exact addresses remain internal data authority; unavailable endpoint feedback remains actionable without exposing raw paths.
- Decisions intentionally deferred to architecture design: Exact readable-label disambiguation strategy, complete-label disclosure, stale-label fallback, and smallest clean component/test delta.
- Technical facts architecture should verify: Current label-collision cases across direct Agents, Teams, and mounted Team Agents; whether one shared option-label projection should serve all callsites; exact test and rendered-validation responsibilities.
- Known feasibility or integration risks: Low-to-moderate presentation risk; current referenced-definition labels can collide, so simply deleting address text is insufficient.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A — no prototype requested`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A — narrow existing-component change; target behavior is stated textually`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: `N/A`

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: `N/A`
