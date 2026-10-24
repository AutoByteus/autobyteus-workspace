# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `settings-delegated-row-display-name` (Project Task `autobyteus-208`)
- Request / ticket: autobyteus-208. Delegated-copy rows in Run Settings should use the same display name as the sidebar and the conversation (follow-up 1 of the autobyteus-197 code reviews)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's conversation message of 2026-10-24 (SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: in Run Settings, a delegated copy's row shows the raw address basename (`scribe_5083`). The sidebar and the conversation show the display name (`scribe 5083`), so the same copy appears under two names.
- Desired outcome: each delegated-copy row (agent copy, Team copy, and a Team copy's members) shows the name the sidebar and the conversation show for it, in Team, Org and Agent runs.
- Observable definition of success: a web unit test shows the rows' names equal the sidebar/context names for each root kind, and a look in the app shows one name on all three surfaces.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Team run: Settings rows use the address basename for every copy; the sidebar and conversation use the display name for a catalog copy and its members, and the basename for a copy of a configured member (`readsAsDisplayName`) | Settings rows apply the same rule | A copy of a configured member keeps its basename (`code_reviewer`) everywhere | E-01, E-02, SD-01 |
| BEH-002 | User | SCN-002 | Org and Agent runs: Settings rows use the basename; sidebar rows and contexts use `memberDisplayName` for every agent and copy | Settings rows use `memberDisplayName` | — | E-03, SD-01 |
| BEH-003 | Operational | — | Probe header DCR-001 (`tests/e2e/delegated-copy-own-file-cases.mjs:12`) claims '"+" from each copy prefills its own model', a check the case does not make | The header describes the per-agent context check the case makes (lines 243-249) | Case code unchanged; no rerun needed | E-04 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Recognize a copy across surfaces | One name | No other Settings change |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Read a Team run's delegated copies in Run Settings | SCN-001 |
| UC-002 | Read an Org or Agent run's delegated copies in Run Settings | SCN-002 |

### Out Of Scope

- Names of the run's own configured Members rows in Settings.
- The display-name rule itself (`memberDisplayName`, `readsAsDisplayName`).
- The Product design repository's Settings baseline: a name fix only; its specs were searched and do not name the old form (investigation E-05).

### Non-Goals

None.

### Preserved Behavior Boundary

- BEH-001 preserved column; every other row content (badge, summary, notes, locks).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | In a Team run, a delegated-copy row's name follows the Team's naming rule: the display name for addresses outside the root Team's configured members (a catalog copy and its members), the address basename otherwise. | BEH-001 | Must | One name per copy | Task direction |
| REQ-002 | In Org and Agent runs, a delegated-copy row's name is `memberDisplayName(address)`, as their sidebar and contexts. | BEH-002 | Must | Same | Task direction ("Team, Org and Agent roots") |
| REQ-003 | The Team naming rule has one owner, used by the sidebar rows, the agent contexts and the Settings rows. | BEH-001 | Must | Avoid a third copy of the rule (Principle 11) | DEC-001 |
| REQ-004 | The DCR-001 probe header describes the check the case makes. | BEH-003 | Must | Task | Task |

## Acceptance Criteria

| AC ID | Related REQ | Behavior / Scenario | Precondition / Trigger | Observable Expected Outcome | Alternate | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001, SCN-001 | Team tree with a catalog copy `/scribe_5083`, a catalog Team copy with members, and a copy of configured `/code_reviewer` | Rows read `scribe 5083`, the Team copy and its members by display name, `code_reviewer` for the configured copy; equal to the sidebar rows' names | — | Web unit test (from `evidence/repro-delegated-row-names.spec.ts`, failing on base) |
| AC-002 | REQ-002 | BEH-002, SCN-002 | Org/Agent tree with `/scribe_5083` and a Team copy | Rows read by `memberDisplayName` | — | Web unit test |
| AC-003 | — | BEH-001 | Existing tests | Navigation rows and contexts keep their names | — | Existing specs (`teamExecutionTreeSelectors`, context factory, `delegatedLaunchRows.spec.ts`) |
| AC-004 | REQ-004 | BEH-003 | Read the header | It names the per-agent Team context check (each copy on its own model, the slot on its edit, all named "worker") | — | Review |
| AC-005 | REQ-001, REQ-002 | SCN-001 | The app | A catalog copy shows one name in Run Settings, the sidebar and the conversation | — | A look in the app (API/E2E browser probe or isolated instance) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Find a copy in Settings | Run Settings of a Team run | A catalog copy was delegated | Open Settings → Delegated copies | Row named as in the sidebar | — | Supported Normal Scenario | autobyteus-197 DCR-001 observation | REQ-001, AC-001, AC-005 |
| SCN-002 | User | User | Same, Org/Agent | Run Settings of an Org/Agent run | Copies exist | Same | Same | — | Supported Normal Scenario | E-03 | REQ-002, AC-002 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (row text only). No Product design work requested; the Product baseline is unchanged (a name fix only). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

N/A.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

N/A.

## Supplemental Artifacts

| Artifact | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/repro-delegated-row-names.spec.ts` | Reproduction | AC-001, AC-002 | Current | Evidence only |

## Assumptions

None.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does the Team naming rule live? | Consistency | Today two copies: `teamExecutionContextFactory.ts:68-70`, `teamExecutionTreeSelectors.ts:97-99` | One exported function in `teamExecutionTreeSelectors.ts` beside `readsAsDisplayName`, used by both and by Settings rows | Solution Designer | Decided |
| DEC-002 | Org/Agent: which rule? | Correct name | Their contexts and rows use `memberDisplayName` for all (E-03) | `memberDisplayName` | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-005 | SCN-001 | SD-01 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-005 | SCN-002 | SD-01 |
| REQ-003 | UC-001 | BEH-001 | AC-001, AC-003 | SCN-001 | — |
| REQ-004 | — | BEH-003 | AC-004 | — | E-04 |

## Architecture Phase Input

- Preserve every other row behavior.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `N/A`
- UI/UX approval: `N/A` (name fix)
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: none
