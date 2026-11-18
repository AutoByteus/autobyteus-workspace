# Requirements Document — autobyteus-381 (remove the last traces of read_media_file)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `remove-read-media-file-381`
- Request / ticket: Project Task `autobyteus-381`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-04
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user, 2026-11-04 (SR-001)
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: `read_media_file` was removed in v1.5.11 (`read_file` reads media), but its name remains in a helper, a Work Journal converter with its fixtures and tests, a resolver test, and two doc lines.
- Desired outcome: the old name is gone from source, tests and docs, with no behavior change for current runs and no change to any existing data.
- Observable definition of success: `git grep -i read_media_file` and `readMediaFile` find only historical records (DEC-003); the affected suites and type checks pass.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `read_file`'s media branch is `readMediaFileAsContextFile` | Renamed (`readMediaAsContextFile`) | read_file's behavior, byte for byte | Investigation notes, Current Source |
| BEH-002 | System | SCN-002 | The journal renders a recorded `read_media_file` call as `Command: cat <path>` plus the media marker | No converter: a recorded call renders by the generic tool rule when its file is rendered | Existing journal and raw-trace files untouched; revision stays 2; every other line renders the same | Investigation notes, Journal Renderer Revision |
| BEH-003 | System | SCN-003 | A definition naming `read_media_file` launches with `read_file` and a warning (the general rule plus default tools); a test and a doc sentence single it out | The test and sentence are removed; the general rule is unchanged | Launch behavior unchanged; stored definitions untouched | Investigation notes, Launch Fallback |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent reads a media file with `read_file` | SCN-001 |
| UC-002 | A Work Journal is rendered | SCN-002 |
| UC-003 | An agent is launched from a stored definition | SCN-003 |

### Out Of Scope

- Any change to existing data: no migration, no change to stored definitions, journals or raw traces, and no re-render.
- The renderer revision.
- The unknown-tool rule itself.
- Historical records (DEC-003).

### Non-Goals

- Re-rendering old journals; updating the node copies of the public agent package; editing the user's private agent package.

### Preserved Behavior Boundary

BEH-001..BEH-003 preserved columns.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Rename `readMediaFileAsContextFile` to `readMediaAsContextFile` with no behavior change | BEH-001 | Medium | The old tool's name lives on in a helper | N/A | Task part 1 |
| REQ-002 | Remove the `read_media_file` Work Journal converter, its table entry, its synthetic trace row, its test lines, its oracle entry and its doc sentence. Keep `WORK_JOURNAL_RENDERER_REVISION` at 2; touch no existing journal or raw-trace file | BEH-002 | High | User decision | Investigation (no revision pin) | Task part 2; user, 2026-11-04 |
| REQ-003 | Remove the resolver test that singles out `read_media_file` and the doc sentence about it; change no resolver code and no stored definition | BEH-003 | Medium | The general rule covers it | Investigation (resolver L133-137, defaults L8-31) | Task part 3; user, 2026-11-04 |
| REQ-004 | After the change, `read_media_file` and `readMediaFile` appear only in the historical records of DEC-003 | all | High | Done-when | N/A | Task |
| REQ-005 | The affected suites and both packages' type checks pass | all | High | Done-when | N/A | Task |

## Acceptance Criteria

| AC ID | Related REQ | Behavior / Scenario | Trigger | Observable Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | BEH-001 / SCN-001 | `autobyteus-ts` read_file tests (`tests/integration/tools/file/read-file-media.test.ts`, `tests/integration/agent/read-file-media-*.test.ts`, read_file unit tests) | Pass unchanged | — | vitest |
| AC-002 | REQ-002, REQ-005 | BEH-002 / SCN-002 | `pnpm -C autobyteus-server-ts exec vitest run tests/agent-work-journal` | Pass. The regenerated golden differs from the old one only by the removed call's lines and the shifted `rt_NNN` link numbers. `WORK_JOURNAL_RENDERER_REVISION` is still 2 | — | vitest; golden diff |
| AC-003 | REQ-002 | BEH-002 | A recorded `read_media_file` call rendered by the current build | Renders as the generic tool line (one ad-hoc render in the implementation evidence; not kept as a test that names the tool) | — | Evidence |
| AC-004 | REQ-003, REQ-005 | BEH-003 / SCN-003 | Resolver unit tests | Pass; the sibling removed-tool tests still prove the general rule | — | vitest |
| AC-005 | REQ-004 | all | `git grep -i -n "read_media_file\|readMediaFile"` | Hits only in DEC-003's historical records | — | grep |
| AC-006 | REQ-005 | all | `pnpm -C autobyteus-server-ts typecheck`, `pnpm -C autobyteus-web typecheck` | PASS, with no baseline growth (the shared gate) | — | Gate output |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Expected Outcome | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Native agent | Read media | `read_file` on an image, audio or video file | Resolve path → media branch → context file | Unchanged | Supported Normal Scenario | autobyteus-328 | REQ-001 |
| SCN-002 | System | Work Journal service | Render a run's journal | Memory search catch-up, open-file render, Rebuild | Converters → markdown | Unchanged except a recorded `read_media_file` call reads generically when rendered | Supported Normal Scenario | docs/modules/agent_work_journal.md | REQ-002 |
| SCN-003 | User | User | Launch an agent from a stored definition | Run start | Defaults + named tools → registry | Unchanged | Supported Normal Scenario | resolver | REQ-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A, not applicable.

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (the user: "do NOT touch existing data"). Existing journals keep their text; stored definitions keep their names.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Does removing the converter force a renderer revision bump? | The PM: if it does, keep the converter | No guard pins the revision. Existing files are reused while their manifest matches. A recorded call changes only when its file is rendered again for another reason | No bump. A bump is the policy for wording changes meant to reach every journal; here the user explicitly wants old journals left alone. A file rendered again reads that call generically, which he accepted, and every file stays internally consistent. The docs get one general sentence saying so (no tool name) | Solution Designer | Decided |
| DEC-002 | Stored definitions naming `read_media_file` | The Task asks for a count and a judgement | Desktop 5 (his private package). Nodes: server-0 12 (outdated public copy) + 5 (private); server-1 2; server-2 7 | The general unknown-tool rule plus the default `read_file` already handles them, unchanged since v1.5.11; nothing the user sees changes, so no question and no migration. The node copies of the public package clean up when updated (his choice; not this ticket) | Solution Designer | Decided |
| DEC-003 | Historical records that name the old tool | REQ-004 | v1.5.11 release notes, tracked old run logs under `test-results/`, `tickets/**` | Keep: rewriting records of what happened would falsify them | Solution Designer | Decided |
| DEC-004 | The golden fixture `unchanged-groups-before.json` | Removing the trace row changes it | Hand-edit, or regenerate | Regenerate it with the base commit's renderer (as the test's header says it was made) and the row removed. That changes only the call's lines and later link numbers | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002 |
| REQ-003 | UC-003 | BEH-003 | AC-004 | SCN-003 |
| REQ-004 | all | all | AC-005 | all |
| REQ-005 | all | all | AC-001, AC-002, AC-004, AC-006 | all |

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-11-04). Ready for design: `Yes`.
