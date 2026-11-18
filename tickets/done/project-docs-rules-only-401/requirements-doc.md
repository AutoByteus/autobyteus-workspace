# Requirements Document — autobyteus-401 (project documents hold rules only)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `project-docs-rules-only-401`
- Request / ticket: Project Task `autobyteus-401`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `User` (the user confirmed the plan via the PM, 2026-11-06, and added REQ-005 in his words); the Solution Designer's decisions DEC-001..DEC-003 within the direction
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements: None
- Release: none (the Task: no release unless asked)
- Validation: no test runs. The user, 2026-11-06: "is super simple. There's nothing to test to be honest." The checks are reading and grep only: AC-002's diff, AC-004's references and anchors, AC-005's paths.

## Problem And Desired Outcome

- Problem: RELEASE.md holds the stories of three releases, and two rules carry incident stories. The user wants the project documents to be project-level rules, not "a per-case logging file" (2026-11-06).
- Desired outcome: RELEASE.md and TESTING.md hold rules only; each moved story lives in its release's record; no rule changes meaning; no link breaks.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | RELEASE.md has `## Case Studies` and incident stories inside two rules | Stories moved to their records; each rule states its reason without the story | The meaning of every rule | Investigation F-01..F-05 |
| BEH-002 | Operational | DESIGN.md rule 12 links to RELEASE.md's Case Studies | Links to the release records | Rule 12's meaning | F-06 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A role reads RELEASE.md, TESTING.md or DESIGN.md to follow the project's rules | SCN-001 |

### Out Of Scope

- `DESIGN.md`'s design cases and `docs/design-cases.md` (kept on purpose; the user decides if they move).
- Any change to a rule's meaning; any new rule.
- Code; releases.

### Non-Goals

- Rewriting the release records beyond appending the moved stories.

### Preserved Behavior Boundary

Every rule in RELEASE.md, TESTING.md and DESIGN.md keeps its meaning.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Remove RELEASE.md `## Case Studies`. Append each story, unchanged in substance, to its release's record (investigation, Record Homes) under a heading that says it moved from RELEASE.md in autobyteus-401 | BEH-001 | High | The user's rule | N/A | Task |
| REQ-002 | Rewrite the incident mentions inside rules (F-02..F-05) as the rule's reason, without versions, dates or stories, keeping each rule's meaning | BEH-001 | High | Same | N/A | Task |
| REQ-003 | No link or reference points at the removed section. DESIGN.md rule 12 and RELEASE.md L327 are fixed; anchors are still valid | BEH-001, BEH-002 | High | Done-when | N/A | Task |
| REQ-004 | TESTING.md: confirm no per-case material (F-07); no change | BEH-001 | Medium | Task | N/A | Task |
| REQ-005 | Where it helps a reader, a rule that a moved story taught keeps one line pointing to the release record that holds the details, by a repository path on `personal` that stays valid (`tickets/done/<record>/release-deployment-report.md`). A pointer is one line, not a story | BEH-001 | Medium | The user, 2026-11-06: "so the RELEASE.md will reference that file if they want to read the details, right?" (via the PM) | N/A | User |

## Acceptance Criteria

| AC ID | Related REQ | Trigger | Observable Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Read RELEASE.md | No `Case Studies` heading; no release versions or dates used as stories outside the Workflow Reference's format examples (`v1.1.8`, `v1.2.7-rc1`, `v1.2.7-beta.1`) | grep and read |
| AC-002 | REQ-001 | Read the three records | Each holds its moved story under a "moved from RELEASE.md (autobyteus-401)" heading; together the moved text covers all of the removed section's facts | Diff: removed lines vs appended lines |
| AC-003 | REQ-002 | Read F-02..F-05 | Each rule reads the same in meaning, with its reason and without the story | Review |
| AC-005 | REQ-005 | Read the rules at F-02, Watching The Rollout and Build-only release run | Each points in one line to its record path; every path exists on `personal` | Read; `git ls-tree` the paths |
| AC-004 | REQ-003 | `git grep -n "Case Studies"` in RELEASE.md, TESTING.md, DESIGN.md, AGENTS.md, docs/; and the anchors RELEASE.md links to | No hit; links resolve | grep plus a link check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Expected Outcome | Validity | Related |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Delivery, API/E2E, Solution Designer | Follow the project's rules | Reading the documents | Rules only; stories in records | Supported Normal Scenario | REQ-001..REQ-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A, not applicable.

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (documentation only).

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Incident examples inside rules (F-03, F-04) | The user's rule says the lesson goes in as the rule, not the incident | Keep, or reason only | Reason only: the reason helps a reader apply the rule; the version adds a story | Solution Designer | Decided |
| DEC-002 | DESIGN.md rule 12's examples | Its link breaks | Drop them, or keep one line pointing to the records | Keep one line naming the two releases with their record paths: rule 12 is a design rule, and the two incidents show its class concretely | Solution Designer | Decided |
| DEC-003 | Appending to finalized release records | Records are otherwise not edited | The Task asks the stories to be kept in the records | Append only, under a clearly labelled heading; edit nothing already there | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-003 | SCN-001 |
| REQ-003 | UC-001 | BEH-001, BEH-002 | AC-004 | SCN-001 |
| REQ-004 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-005 | UC-001 | BEH-001 | AC-005 | SCN-001 |

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-11-06). Ready for design: `Yes`.
