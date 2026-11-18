# Requirements Document — autobyteus-508

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `member-runtime-lost-508`
- Request / ticket: autobyteus-508 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `User` (the founder, in the Solution Designer's conversation, 2026-11-17): "can we at least fix the migration itself … for people who haven't done the upgrading … they can still benefit from the correct migration … for the already upgraded one I will fix by myself"; confirmed the same-ID correction ("Do you create a new migration or you update the existing migration" → answered: update the existing one) and "currently only I have the wrong data. Because we haven't done the stable release yet".
- Exact approved requirements baseline / solution revision: this document at SR-001.
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: the one-time data conversion `20261111_delegated_runs_own_runs_v1` (autobyteus-461, and its `20261114_*` follow-ups that reuse the same conversion) turns a delegated run's Settings edit into the run's own launch but keeps only the edited **model and model settings**; the edited **agent runtime** is dropped, so the run falls back to the runtime it started with. A member the user had switched to Codex App Server + gpt-6.1-terra ends as Claude Agent SDK + gpt-6.1-terra and cannot start. The conversion also drops the edit's provenance, so the member is shown as "Inherited from the run".
- Affected actors or systems: every installation that converts pre-461 data with such an edit. So far that is only the founder's installations (beta.7). No stable release carries 461 yet (founder, 2026-11-17).
- Desired outcome: an installation that has not yet run the conversion keeps every Settings edit whole (runtime, model, model settings) and shows it as the user's own Settings edit.
- Observable definition of success: after the corrected conversion, a converted member or delegated agent run whose edit named another runtime has that runtime with the edited model; tests prove it on released-shape data and fail on today's code.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract (upgrade) | SCN-001 | The conversion copies `llmModelIdentifier` + `llmConfig` of the edit; the edit's `runtimeKind` is lost; the edited run's `launchSource` is dropped. | The edit's `runtimeKind` (when present) becomes the run's runtime together with its model and settings; the edited run records the Settings-edit source (`{origin: "settings"}`), as a live Settings save records today. | An edit with no `runtimeKind` (model-only) keeps the started runtime (released rule `selection.runtimeKind ?? started.runtimeKind`); unedited members keep their recorded `launchSource`; every other step of the conversion (addresses, origins, handoffs, history rows, follow-ups, dispositions, registry order) is unchanged. | Investigation notes: Source Log rows 1–6, probe |
| BEH-002 | User | — | Converted records already on the founder's nodes hold the wrong runtime. | Not changed by the product: the founder repairs them himself in Settings (stop, choose runtime + model, Save). | — | Notes: Affected records |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Users upgrading from ≤ beta.6 / the coming stable | Keep their runs' launches | Runtime choices survive the conversion | Already-converted installations are not reconverted |
| Founder | His teams run again | Repairs his own records in Settings | His data: read-only for the team; no repair by the team |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Upgrade of an installation with pre-461 delegated runs whose Settings edit changed the agent runtime (a team member's own edit, a team-level edit reaching members that follow the team, a delegated agent run's edit) | SCN-001 |

### Out Of Scope

- Repairing already-converted data (the founder's node 8001 and the desktop's own node): the founder does it himself in Settings (user decision, 2026-11-17). No new migration for converted installations.
- Showing a stored runtime/model mismatch in Settings or refusing a start with a clear message: recorded as follow-up FU-001 (only the founder's data can hold a mismatch; he fixes it).
- The team-level default launch of a converted team (461 kept the started default on purpose; unchanged).

### Non-Goals

- Recovering already-lost runtimes from traces or model names.

### Preserved Behavior Boundary

- BEH-001's preserved column; all 461 migration tests keep passing unchanged except for added cases (REQ-003).
- Registry: no new entry, no reorder (data_migration_guideline §4).

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
| REQ-001 | When the conversion turns a released Settings edit into a run's own launch, it takes the edit's agent runtime (when the edit names one), model and model settings as one unit: for a team member's own edit, for a team-level edit applied to each member that follows the team, and for a delegated agent run's edit. An edit that names no runtime keeps the started runtime. | BEH-001 | Critical | Released meaning of the edit (`selection.runtimeKind ?? started.runtimeKind`, beta.6 `run-execution-tree-shared-records.ts:242-260`). | Probe reproduces the loss on all 3 paths. | Founder, 2026-11-17 |
| REQ-002 | A converted edited record (member or delegated agent run) records the Settings-edit source (`{origin: "settings", fallbacks: []}`), the source a live Settings save records today, instead of no source; it is no longer shown with the team's "Inherited from the run". | BEH-001 | High | The founder's screenshot showed an edited member as "Inherited from the run"; a live save records `SETTINGS_LAUNCH_SOURCE` (`runtime-selection-rule.ts:147`, `team-run-selection-mutator.ts:102`). | N/A | DEC-002 |
| REQ-003 | The correction keeps the migration IDs (`20261111_delegated_runs_own_runs_v1` and the `20261114_*` follow-ups that reuse its conversion); installations that already finished them are not reconverted. | BEH-001 | Critical | data_migration_guideline §7 "Correcting a released migration". | N/A | Founder, 2026-11-17; DEC-001 |
| REQ-004 | The corrected conversion is released before 461 reaches a stable release. | BEH-001 | Critical | Stable users then convert once, correctly. | N/A | Founder, 2026-11-17 ("we haven't done the stable release yet"); release only on his word |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Released delegated team file: member started on `claude_agent_sdk`/`sonnet` with its own edit `{runtimeKind: codex_app_server, llmModelIdentifier: gpt-6.1-terra, llmConfig}` | Converted member: `launchConfiguration.runtimeKind = codex_app_server`, model `gpt-6.1-terra`, the edit's `llmConfig`; `launchSource = {origin: "settings", fallbacks: []}`; no `userLaunchSelection`/`followsTeam`; file loads through the current team schema. | — | Migration test on released-shape fixture; fails on today's code |
| AC-002 | REQ-001, REQ-002 | SCN-001 | Released team file with a team-level edit naming another runtime; one member follows the team, one has its own edit, one follows no edit | Follower: the team edit's runtime + model + settings and Settings source; the member's own edit wins with its runtime; the unedited member unchanged with its recorded source. | — | Same |
| AC-003 | REQ-001, REQ-002 | SCN-001 | Released delegated agent run `run_metadata.json` with `taskAgent.userLaunchSelection` naming another runtime | Converted file: top-level `runtimeKind`, `llmModelIdentifier`, `llmConfig` from the edit; `launchSource = {origin: "settings", fallbacks: []}`; loads through `AgentRunMetadataStore`. | — | Same |
| AC-004 | REQ-001 | SCN-001 | An edit with no `runtimeKind` (model-only, as in today's fixtures) | Started runtime kept; the edited model and settings applied (today's expectations hold, plus the Settings source). | — | Existing 461 tests, updated only for the source |
| AC-005 | REQ-001 | SCN-001 | A released record with a pending runtime switch and an edit naming the new runtime (the shape of one of the founder's records) | Converted: the new runtime + edited model, the pending switch kept (its `from` the started binding), so the next input makes the switch real. | — | Migration test |
| AC-006 | REQ-003 | SCN-001 | Registry and ledger | No new migration ID; registry order test unchanged; the `20261114_*` follow-ups produce the same corrected result for a late item. | A terminal ledger record is skipped as before | Registry order test; one follow-up test case |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract (upgrade) | App-data migration runner at startup | Upgrade a ≤ beta.6 installation to the release with 461 | App start after installing the release | Delegated runs where the user stopped a copy and saved another runtime + model in its Settings (autobyteus-348/461) | Runner runs `20261111_…` then the `20261114_*` follow-ups; each delegated run file is converted | Each edited run starts on the runtime and model the user chose | Items the conversion preserves keep today's dispositions | Supported Normal Scenario | Founder's node 8001: 16 records in 9 runs, all edits that changed the runtime | REQ-001…REQ-004; AC-001…AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — the visible effect (correct runtime; Settings-edit source instead of "Inherited from the run") comes from the stored data; no UI change. N/A — not applicable for Product design fields.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003 | Compatibility | No change to migration IDs, registry order, dispositions or the aggregate status policy | Migration code | Registry order test; existing 461 tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (conversion output on not-yet-converted installations).
- Data or state that must be preserved: the user's Settings edit as a whole (runtime, model, model settings); pending runtime switches.
- Loss acceptable: none for not-yet-converted installations. Already-converted installations (only the founder's) keep their current data; he repairs it himself.
- Constraints: founder's private data is not read further or changed by the team.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Data Migration Guideline | Same-ID correction; registry append-only | `autobyteus-server-ts/docs/design/data_migration_guideline.md` §4, §7 | None |
| RELEASE.md | Release only on the founder's word; before stable | RELEASE.md; founder | Timing (REQ-004) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/probe-508-runtime-selection.test.ts` | Reproduction (fails today) | REQ-001, AC-001…AC-003 | Current | Evidence |
| `probes/affected-records-scan.js` | Read-only affected-record count | Investigation | Current | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | No stable release and no other user's installation has run beta.7's conversion | Scope excludes repair of converted data | Founder's statement 2026-11-17; RELEASE.md history | Accepted (user) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Correct the released migration under the same ID, or add a new one? | Who benefits and what runs again | Guideline §7; no originals on converted installs | Same ID: fixes every installation that has not converted; a new migration could not recover lost values (no source data) and would only guess. | User (asked and answered 2026-11-17) | Decided |
| DEC-002 | Record converted edits with the Settings-edit source? | "Inherited from the run" was misleading | Live saves record `SETTINGS_LAUNCH_SOURCE` | Yes: one meaning for an edited run, converted or saved live. | Solution Designer | Decided |
| DEC-003 | Repair the founder's node 8001 data | His data | A (he repairs in Settings) / B (team restores with backup) | A, by the founder. | User | Decided |
| DEC-004 | Mismatch warning and start-time refusal | Task asked for it | Only the founder's data can hold a mismatch after this fix | Follow-up FU-001, non-urgent. | User (narrowed scope "at least fix the migration"; informed) | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-003, AC-004, AC-005 | SCN-001 | probe |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002, AC-003 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-001 | AC-006 | SCN-001 | — |
| REQ-004 | UC-001 | BEH-001 | (delivery/release gate) | SCN-001 | — |

## Architecture Phase Input

- Approved scenario: SCN-001.
- Constraints: same IDs; frozen shapes stay in migrations; current schema unchanged.
- Deferred to design: exact code shape in `run-file-conversion.ts`; fixtures.
- Technical facts to verify: current team and agent readers accept `launchSource.origin = "settings"` on converted files.

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

- Approval recorded: `Yes` (the founder, 2026-11-17)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
