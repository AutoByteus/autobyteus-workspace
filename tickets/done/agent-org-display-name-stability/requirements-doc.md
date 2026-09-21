# Requirements Document — Agent Org Display-Name Stability

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `AGENT-ORG-DISPLAY-NAME-STABILITY-20260921-001`
- Request / ticket: `agent-org-display-name-stability`
- Requirements owner: Solution Designer
- Date: 2026-09-21
- Approval state and reference: Explicitly approved in the user's 2026-09-21 message: “Yeah, just do it similarly like agent team list and agent team ... detail page ... let's use member name ... we don't need that extra ... asynchronous lookup.”
- Exact approved requirements baseline / solution revision: `SR-004`
- Behavior-defining supplements and their approved versions: N/A; supplied screenshots are current-state evidence only

## Problem And Desired Outcome

- Problem: Agent Org browsing treats the Org-local member role as a provisional label. The list first displays a humanized `memberName` and later replaces it with the referenced Agent/Team definition name. Detail can first expose an opaque reference ID and later replace it with a definition name. Users see the semantic substitution.
- Affected actors or systems: Users browsing the Agent Org list or detail view; frontend Agent Org catalog/detail presentation and reference-loading lifecycle.
- Desired outcome: Agent Org list and detail consistently identify members by their Org-local role/member name. Referenced Agent/Team definition names are not browsing labels and do not replace role labels after reference data loads.
- Observable definition of success: From the first rendered member frame through reference loading, Reload, remount, and navigation, every direct member label remains the same human-readable representation of `member.memberName`. Team coordinator and nested handoff labels, when shown, use their Team-local member names. No member label is an opaque `ref` or a referenced definition name.

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-003 | Each list chip initially humanizes the Org member's `memberName`, performs an exact reference query, and then replaces the role with `definition.name`. | List chips always render the humanized Org `memberName`. The list performs no Agent/Team reference lookup for labels. | Org card identity, name, description, member order/type icons, Run, View Details, and search remain unchanged. | Supplied screenshots; `AgentOrgCatalogMemberChips.vue`; user role-name direction. |
| BEH-002 | User | SCN-002, SCN-003 | Detail member helpers fall back to `ref`, then replace it with the referenced definition name. Team coordinator text can follow the same identity-name path. | Direct Agent/Team rows use the owning Org member's humanized `memberName`. A Team coordinator or nested Team endpoint, when displayed, uses the Team-local `memberName`/`coordinatorMemberName`, never the Agent definition name or an opaque ID. | Detail actions, Team navigation by stable ID, handoff semantics, validation, and unavailable-reference authority remain unchanged. | User report; `AgentOrgExperience.vue`; Team role-name comparison. |
| BEH-003 | System | SCN-003 | Reload and reference-context changes clear resolved definitions, so labels regress to role/ref fallbacks and later change again. | Role labels are derived solely from the current Org/Team membership data and never change merely because reference definitions settle. A changed authored `memberName` appears only when the enclosing definition response changes. | Stale-response retirement, backend-binding isolation, referenced-definition validation for non-label features, and read-only browsing remain unchanged. | Current watcher/service/tests; user direction. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Agent Org browser | Understand each member's role within the organization | Sees stable role labels on list and detail | Must not see internal IDs or unrelated referenced definition names as member labels |
| Agent Org author | Define meaningful unique member addresses/roles | Browsing surfaces reflect authored `memberName` values consistently | Editing/member selection may still use definition names to choose the referenced object |
| Definition/admission owner | Validate references and topology | Existing reference validation remains available where structurally required | Validation results must not rename browsing labels |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Cold or cached Agent Org list navigation showing direct Agent and Team roles from `members[].memberName`.
- UC-002: Agent Org detail showing direct member roles and, where applicable, Team-local coordinator/nested endpoint roles.
- UC-003: Reload, route changes, reference completion/failure, and backend-binding changes without label substitution.
- UC-004: Removal or narrowing of display-only reference hydration and its obsolete pending-name behavior.

### Out Of Scope

- Changing `memberName`, address, handoff, identity, ownership, admission, persistence, package, or migration semantics.
- Changing Agent Team list behavior; it remains comparison evidence.
- Redesigning the surrounding cards, detail layout, navigation, authoring, member picker, or launch flow.
- Preventing reference/topology reads that are genuinely required for validation, Team navigation metadata, handoff topology, editing, or launch readiness. Such data must not rename member labels.
- Adding resolved Agent/Team names to the Agent Org API for list/detail presentation.
- A general loading-system or global cache redesign.

### Non-Goals

- Displaying referenced Agent/Team definition names on Agent Org list or detail member rows.
- Parsing opaque `ref` values into labels.
- Uppercasing, title-casing, or otherwise rewriting role-name casing beyond separator-to-space humanization.

### Preserved Behavior Boundary

- Preserve reference IDs for navigation and domain operations while separating them from presentation labels.
- Preserve exact ID/scope/owner validation and full topology checks wherever current authoring, handoff, detail action, or launch behavior requires them.
- Preserve cards, ordering, type icons, actions, routes, keyboard/accessibility semantics, localization, mutation payloads, and package bytes.
- Preserve definition names in definition-selection/authoring contexts where the user must choose which Agent or Team a role references; this ticket changes browsing labels, not the selector's identity information.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- Any proposal to restore definition names, change stored role/address semantics, remove required reference validation, or redesign the surfaces is a `Requirement Gap` requiring user approval.
- Adjacent improvements remain non-blocking separate-ticket candidates unless approved into this scope.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every Agent Org list member chip must use that member's `memberName` as its sole semantic label source. The UI must humanize separator runs (`_` or `-`) to spaces and trim them, while preserving the stored casing. It must not replace the label with a referenced Agent/Team definition name. | BEH-001, BEH-003 | Must | The role within an Org is the information the user wants to scan. | User role-name direction; approved SR-004 |
| REQ-002 | Every direct Agent/Team row on Agent Org detail must use the owning Org member's `memberName` under the same formatting rule. A displayed Team coordinator or nested Team endpoint must use its Team-local `memberName`/`coordinatorMemberName`, not the referenced Agent definition name. | BEH-002, BEH-003 | Must | Keeps list and detail semantically consistent and prevents ID/name substitution. | User role-name direction; approved SR-004 |
| REQ-003 | Member labels and their accessible names must remain invariant when referenced definitions begin loading, finish, fail, refresh, or are retired. No member-name position may display an opaque `ref`. | BEH-001–003 | Must | Directly eliminates the reported visible transition. | User complaint and source evidence; approved SR-004 |
| REQ-004 | The Agent Org list must issue no per-member Agent/Team queries for label rendering. Existing Org list data is sufficient for all member-chip labels. | BEH-001, BEH-003 | Must | Removes unnecessary display-name hydration rather than hiding it. | User direction; Agent Team comparison; approved SR-004 |
| REQ-005 | Detail/reference reads may continue only where required for non-label topology, validation, handoff, edit, navigation, or launch behavior. Pending or completed results must not change role labels; reference-dependent secondary content must use truthful loading/unavailable behavior instead of raw IDs. | BEH-002, BEH-003 | Must | Separates legitimate domain resolution from presentation-name hydration. | Current detail responsibilities; approved SR-004 |
| REQ-006 | The correction must preserve list/search/navigation/actions, member order/type, authoring selection, handoffs, owner/scope validation, launch readiness, backend-binding isolation, and read-only browsing with no definition/package mutation or runtime activation. | BEH-001–003 | Must | Prevents a label-source correction from changing domain behavior. | Existing code/tests/docs; approved SR-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003, REQ-004, REQ-006 | BEH-001 / SCN-001 | Open an uncached Agent Org list whose member roles differ from the referenced definition names. | Every chip shows the formatted `memberName` from its first frame and remains unchanged. Network traffic contains zero per-member Agent/Team definition queries for list labels. | Empty-member Orgs remain valid; blank/invalid role data uses the existing generic type fallback rather than a ref. | Component tests, GraphQL-operation assertions, browser capture. |
| AC-002 | REQ-002, REQ-003, REQ-005, REQ-006 | BEH-002 / SCN-002 | Open detail for an Org containing direct Agents and Teams, including an Org-owned Agent and Team-local coordinator. | Direct rows show formatted Org roles. If coordinator/nested labels are shown, they use Team-local roles. No label changes to/from a definition name or opaque ID as reference work settles. | Reference-dependent secondary content stays loading/unavailable without exposing a ref as a member name. | Deferred-response component tests and browser/network inspection. |
| AC-003 | REQ-001–005 | BEH-001–003 / SCN-003 | Resolve, fail, Reload, supersede, or change backend binding while role labels are visible. | Unchanged membership yields unchanged labels throughout. A new Org response changes a label only if the authored `memberName` changed. | Late reference results cannot alter labels in the current context. | Deferred lifecycle and Reload tests. |
| AC-004 | REQ-005, REQ-006 | BEH-002, BEH-003 / SCN-002–003 | A referenced definition is missing, wrong-owner, or wrong-scope. | Existing validation/error authority remains effective for dependent features; role labels remain derived from membership data and no opaque ID is substituted. | Authoring/launch remains blocked where existing policy requires a complete valid graph. | Validation regression matrix and UI assertions. |
| AC-005 | REQ-006 | BEH-001–003 / SCN-001–003 | Exercise search, Run, View Details, Team View, Edit/Delete, member selection, handoffs, and launch validation. | Existing routes/actions, ordering/types, mutation inputs, ownership rules, and runtime/package state remain unchanged. | Superseded results remain ignored without mutation. | Focused regression suites and API/E2E validation. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User browsing Agent Orgs | Scan each Org's internal roles consistently | Navigate to `/agent-orgs` list | Org catalog response contains `members[].memberName` | Page renders cards and formats each role locally | Stable role labels from first frame; no display-name reference queries | Empty Org and generic fallback remain supported | Supported Normal Scenario | User direction; screenshots; Team list comparison | REQ-001, REQ-003, REQ-004, REQ-006 / AC-001, AC-005 |
| SCN-002 | User | User inspecting an Agent Org | Understand direct members and Team-local roles without internal IDs or external definition names | Navigate to Org detail | Selected Org membership is available; supporting topology may still load | Detail renders direct roles; supporting reference data settles without renaming them | Direct rows retain Org roles; coordinator/nested rows use Team roles when available | Dependent content loads or reports unavailability truthfully | Supported Normal Scenario | User report/direction; detail source | REQ-002, REQ-003, REQ-005, REQ-006 / AC-002, AC-004, AC-005 |
| SCN-003 | User/System | Reload/navigation/backend lifecycle | Refresh definitions without label regression or cross-context leakage | Reload, route change, or backend-binding change | A current membership response may exist | Org/reference operations complete, fail, or are superseded | Labels follow only current membership role data; reference lifecycle cannot rename them | Stale results are ignored; validation failures remain authoritative | Supported Explicit Edge Scenario | Current lifecycle tests and user direction | REQ-001–006 / AC-003–005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: N/A — bounded label-source correction on existing surfaces
- Product prototype: N/A — not requested
- UI/UX user-confirmation reference: User's explicit 2026-09-21 approval of SR-004 role/member-name presentation
- Approved visual-reference baseline: N/A; screenshots are current-state evidence only
- Normative presentation: Preserve the current chips, rows, icons, spacing, truncation, and layout. Format role/member names by replacing `_`/`-` separator runs with spaces and trimming; do not auto-title-case or uppercase. Use the same formatted text in visible and accessible member labels.
- Required states: List and detail success, reference pending/resolved/unavailable, Reload, route/context change, and empty member collections.
- Explicitly unresolved product decisions: None. Architecture may preserve coordinator/handoff secondary content through existing role-topology data, but all member identity labels must remain role-based.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001–003 / AC-001–003 | Accessibility | Visible text and accessible member names use the same formatted role label and never expose `ref`. | List/detail, supported locales | DOM/accessibility assertions |
| QR-002 | REQ-003, REQ-005, REQ-006 / AC-002–005 | Reliability | Late, failed, or cross-context reference responses cannot change labels or bypass existing validation. | Detail/edit/reference lifecycle | Deferred lifecycle tests |
| QR-003 | REQ-004 / AC-001 | Performance | A list render makes zero `agentDefinition(id)` or `agentTeamDefinition(id)` requests for member-chip labels. | Initial list, search/remount, Reload | Operation ledger/browser trace |
| QR-004 | REQ-005, REQ-006 / AC-004–005 | Security | Existing exact identity/scope/owner checks remain in every non-label flow that currently requires them. | Detail/edit/launch/handoff validation | Service/integration tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data that must be preserved: Org/Team member names, refs, types, scopes, ordering, handoffs, definitions, revisions, ownership, and package files.
- Acceptable loss/reset: Obsolete transient resolved-name display state and list label requests may be removed; no persisted loss is acceptable.
- Operational constraints: No migration, cache rebuild, package rewrite, or runtime activation.
- Downstream evidence need: Architecture must inventory remaining consumers of reference resolution before narrowing/removing it.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent Org definition payload | Existing `members { memberName ref refType refScope }` is sufficient for direct list/detail role labels | Current GraphQL query/schema and user direction | No API enrichment is required for direct labels |
| Team definition topology | `nodes[].memberName` and `coordinatorMemberName` are authoritative Team-local roles when secondary Team detail is shown | Current Team GraphQL/domain model | Detail may still require topology loading; it must not substitute Agent names |
| Definition admission/reference service | Preserve exact validation for non-label consumers | Current service/tests | Architecture must separate display-only and structural consumers cleanly |
| Prior readable-catalog-name ticket | Its exact-definition-name browsing requirement is superseded by SR-004 if approved | `tickets/done/readable-org-catalog-member-names/*` | Preserve identity/owner validation, not its label policy |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/agent-org-list-provisional-labels.png` | Shows the desired role-label semantics before current hydration replaces them | REQ-001 / AC-001 | Read | Evidence only; layout remains non-normative |
| `evidence/agent-org-list-canonical-labels.png` | Shows the current undesired referenced-definition-name replacement | REQ-003 / AC-001 | Read | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The reported long detail value is a member/coordinator `ref` fallback, not the Org header. | Source shows the Org header always uses `selectedOrg.name`, while member helpers fall back to refs. | Downstream browser reproduction / API-E2E | Evidence-backed |
| ASM-002 | “Display role name/member name” means the readable humanization already seen in the first screenshot, not raw snake-case text. | The user identified the initial role content as preferable; current list replaces separators with spaces. | Explicit approval of SR-004 | Confirmed by approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which identity should Agent Org browsing display? | Defines the semantic label source. | User explicitly chose Org/Team-local role/member names rather than referenced definition names. | User | Decided: role/member names |
| DEC-002 | May detail continue reference reads for non-label topology/validation while direct labels remain role-based? | Avoids accidentally removing handoff/edit/launch safeguards while eliminating display hydration. | Yes, only where an existing non-label feature requires them; no result may rename member labels. | User | Decided by SR-004 approval |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-003 | AC-001, AC-003 | SCN-001, SCN-003 | Provisional-label screenshot |
| REQ-002 | UC-002 | BEH-002, BEH-003 | AC-002, AC-003 | SCN-002, SCN-003 | User detail report; source |
| REQ-003 | UC-001–003 | BEH-001–003 | AC-001–004 | SCN-001–003 | Both screenshots and source |
| REQ-004 | UC-001, UC-004 | BEH-001 | AC-001, AC-003 | SCN-001, SCN-003 | Chip/service source |
| REQ-005 | UC-002–004 | BEH-002, BEH-003 | AC-002–004 | SCN-002, SCN-003 | Reference service/detail source |
| REQ-006 | UC-001–004 | BEH-001–003 | AC-001–005 | SCN-001–003 | Existing tests/contracts |

## Architecture Phase Input

- Approved scenario IDs: SCN-001–003 under approved baseline SR-004.
- Constraints: Role/member names are browsing labels; no list display hydration; no opaque refs; preserve structural validation and stable-ID navigation; authoring selectors may retain definition names.
- Decisions deferred to architecture: Shared role-label formatter; whether to remove `AgentOrgCatalogMemberChips.vue` async logic or simplify the component; detail view-model shape retaining memberName alongside ref; exact remaining consumers of `agentOrgDefinitionReferences.ts`; handling of reference-dependent coordinator/handoff content.
- Technical facts to verify: All catalog lookup call sites; direct/detail view model mappings; Team-local coordinator role path; localized accessible labels; prior tests/docs expecting exact definition names.
- Risks: Removing too much validation, continuing hidden unnecessary list reads, accidentally showing raw snake case, and allowing reference completion to mutate label sources.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Material assumptions and decisions are visible: `Yes`
- Content ready for user approval: `Yes — approved`
- Remaining content blocker: None.

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact approval basis recorded: `Yes — SR-004 and the user's 2026-09-21 approval message`
- Approved package ready for architecture design: `Yes`
- Remaining blocker: None.
