# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `runtime-version-prerelease-compare`
- Request / ticket: Project Task `autobyteus-393`, item 1 (FU-002 of autobyteus-387)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `Solution Designer within the direction (user informed)`. The direction is the user's "yesss. should definitely be fixed i think" (Task comment, 2026-11-06) and the Task's lead direction: "read the full semver, compare with semver precedence for every runtime, add a unit case for 0.2.2-rc.1 versus 0.2.2".
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: runtime versions are read as `x.y.z` only, so prerelease suffixes are dropped. DeepSeek Harness `0.2.2-rc.1` shows as `0.2.2`, a later stable `0.2.2` would read as "Up to date", and an update from `0.2.2-rc.1` to `0.2.2` would not count as an update.
- Desired outcome: AutoByteus reads every runtime's full semantic version and orders versions by semver precedence wherever it compares them.
- Observable definition of success: Settings → Agent Runtimes shows `0.2.2-rc.1` for dsh, and reports an update when the latest is `0.2.2`.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Installed/latest shown as `x.y.z`; prerelease ignored in "Update available" | Full `x.y.z[-prerelease]` shown; semver precedence decides | Versions without a prerelease shown and compared as today | BEH-001 notes |
| BEH-002 | User | SCN-002 | Update `0.2.2-rc.1 → 0.2.2` not counted | Counted as updated | Other update outcomes as today | BEH-002 notes |
| BEH-003 | System | SCN-003 | Minimum-version gates ignore prereleases | Same semver precedence (a prerelease of the minimum is below it) | Results for the real versions in use unchanged | BEH-003 notes |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | See true runtime versions and updates | Correct row | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | See installed and latest runtime versions and whether an update is available | SCN-001 |
| UC-002 | Update a runtime from the page | SCN-002 |
| UC-003 | Runtime minimum-version gates | SCN-003 |

### Out Of Scope

- Item 2 of autobyteus-393 (DeepSeek Harness in the release smoke check): the user's decision.
- Which version sources each runtime reads (unchanged).
- Showing build metadata (`+…`).

### Non-Goals

- No change to the page layout or texts.

### Preserved Behavior Boundary

- AC-004.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A runtime version read from any version text keeps its prerelease (`x.y.z-<identifiers>`); build metadata is not kept | BEH-001 | Must | True version shown | N/A | Task direction; DEC-001 |
| REQ-002 | Versions are ordered by Semantic Versioning 2.0.0 precedence wherever runtimes are compared (update available, update succeeded, minimum-version gates) | BEH-001/002/003 | Must | Correct update state | N/A | Task direction; DEC-002 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Version texts `0.2.2-rc.1`, `2.1.318 (Claude Code)`, `codex-cli 0.167.0`, `grok 1.0.77 (50ca579fa996) [stable]`, `1.5.2`, `rust-v0.167.0`, `1.2.3+build.5` | Read as `0.2.2-rc.1`, `2.1.318`, `0.167.0`, `1.0.77`, `1.5.2`, `0.167.0`, `1.2.3` | No version in the text → none | Unit |
| AC-002 | REQ-002 | BEH-001 | Compare `0.2.2-rc.1` with `0.2.2` | `0.2.2-rc.1` is older; the page shows "Update available" for installed `0.2.2-rc.1`, latest `0.2.2` | Equal versions → "Up to date" | Unit (reader) + status-service unit |
| AC-003 | REQ-002 | BEH-001/002/003 | Precedence chain `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0`; `1.0.0+a` equals `1.0.0` | Each comparison in order | — | Unit |
| AC-004 | Preserved | BEH-001/003 | Existing status-service, strategy, Grok and AGY capability tests | Pass unchanged | — | Existing tests |
| AC-005 | REQ-002 | BEH-002, SCN-002 | Update from `0.2.2-rc.1`, new version `0.2.2` | Reported as updated `0.2.2-rc.1 → 0.2.2` | — | Status-service unit |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | See runtime versions | Settings → Agent Runtimes | dsh `0.2.2-rc.1` installed | Open page | `0.2.2-rc.1`; update state by precedence | — | Supported Normal Scenario | autobyteus-387 API-30 | REQ-001/002; AC-001/002 |
| SCN-002 | User | User | Update a runtime | Update button | Prerelease installed | Update to the stable release | "Updated from … to …" | — | Supported Normal Scenario | Code `:341` | REQ-002; AC-005 |
| SCN-003 | System | Runtime readiness | Gate a runtime by minimum version | Model discovery / compaction detection | — | Probe version | Gate by precedence | — | Supported Normal Scenario | Code | REQ-002; AC-003/004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A — not applicable for Product design fields.

## Quality And Non-Functional Requirements

None.

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (in-memory status rows).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Semantic Versioning 2.0.0 | Precedence rules §11 | semver.org | — |

## Supplemental Artifacts

None.

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A hyphen directly after `x.y.z` in a version text starts a prerelease | Parsing rule | True for all five real texts | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Keep build metadata (`+…`)? | Display | Keep / drop | Drop: it has no precedence (semver §10) and no runtime prints it; showing it adds nothing | Solution Designer | Decided |
| DEC-002 | Do the Grok and AGY minimum-version gates use the same rule? | "compare with semver precedence for every runtime"; the gates hold private copies of the old rule | Leave / fold in | Fold in: one owner of version order; two call sites; their results for released versions are unchanged | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | API-30 |
| REQ-002 | UC-001…UC-003 | BEH-001…BEH-003 | AC-002, AC-003, AC-005 | SCN-001…SCN-003 | — |

## Architecture Phase Input

- Scenario IDs SCN-001…SCN-003; no deferred decisions.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
