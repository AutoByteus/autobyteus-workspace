# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `followup-cleanups-568`
- Request / ticket: autobyteus-568 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, part of autobyteus-530)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-20
- Approved by and reference: Solution Designer within the direction (user informed in this conversation, 2026-11-20)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem:** five small, non-urgent defects that earlier tickets recorded:
  - autobyteus-279: FU-002, FU-003, FU-005, FU-006;
  - autobyteus-571: FU-001.
- **Desired outcome:**
  - unused GraphQL code is gone;
  - three tests no longer fail for reasons unrelated to the product;
  - the iOS simulator is chosen exactly and in one place.
- **Observable definition of success:** each AC below. The web unit and Electron suites, the iOS core tests and the iOS release run are green on the ticket branch.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Contract | The web defines `ApproveToolInvocation`, `RestoreAgentRun` (`graphql/mutations/agentMutations.ts:34-52`) and `GetAgentRunCollaborationMemberProjection` (`graphql/queries/collaboratorQueries.ts:30-43`). No web code imports them; the demo build lists them as "unused" (`demo/graphql/unreachable-operations.json:20,28,85,189`). The server's `approveToolInvocation` mutation (`autobyteus-server-ts/src/api/graphql/types/agent-run.ts:158-170`, `:351+`) has no caller except its own unit test; the app approves tools over the WebSocket (`APPROVE_TOOL`). | The three web documents, their generated types, their demo-list entries and the server's `approveToolInvocation` mutation (with its input and result types and its unit test) are removed. | Tool approval over the WebSocket. The server's `restoreAgentRun` and `agentRunCollaborationMemberProjection` fields stay (DEC-002). |
| BEH-002 | Operational | `PortOwnerInspectorFaults.spec.ts:66-83` launches a Node script as the fake `lsof`. Under full-suite load, Node took 318–823 ms just to start in the sibling cases, and once more than the 1000 ms deadline, so the child was killed before it wrote its pid receipt (ENOENT at `:78`). | The deadline case's child starts fast enough to write its receipt well within the deadline under load, so the test is deterministic. | The test still proves the real 1000 ms deadline and that only the owned child is reaped (ESRCH). |
| BEH-003 | Operational | `SavedNodeEntryKeysMigrationTests.swift:85-90` cuts enumerated paths by the length of `#filePath`. Under a symlinked checkout (`/tmp` → `/private/tmp`) the paths are clipped and the test fails. | The test passes from a symlinked checkout. | Its two assertions (only `AppShellCoordinator.swift` references the migration; no old key names outside it). |
| BEH-004 | Operational | `ServerSettingsBasicsPanel.spec.ts:36-57` stubs every Basics card except `ShowInternalAgentsCard` and `UpdateChecksCard` (`ServerSettingsBasicsPanel.vue:11,15`). It asserts the whole text has no "GitHub", but `UpdateChecksCard` renders "Downloads new revisions from GitHub" (`localization/messages/en/updateNotifications.ts:75,77`). It fails on personal. | The test stubs and asserts the two cards like the others. The "no GitHub" assertion again guards what autobyteus-337 REQ-007 meant: Basics itself has no GitHub setup. | The update cards' copy (true and user-facing) is unchanged. |
| BEH-005 | Operational | The iOS release workflow (`release-ios.yml`, "Select available iOS simulator") and `autobyteus-ios/scripts/ios-simulator-smoke.sh:32-34` each choose the simulator with an awk substring match ("iPhone 17"), taking the first match in the oldest runtime. On `xcode-27` that was iPhone 17e on iOS 27.0. | One place chooses: the device named `IOS_SIMULATOR_NAME` (default "iPhone 17") **exactly**, on the newest iOS runtime the selected Xcode can run. If no device has that name, it takes an iPhone on that runtime and says so. If no iPhone exists, it fails. | The `IOS_SIMULATOR_NAME` override and the any-iPhone fallback for developer machines. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case |
| --- | --- |
| UC-001 | The web and server carry no unused GraphQL operation from FU-002 |
| UC-002 | The Electron suite's port-inspector deadline test passes under load |
| UC-003 | The iOS core tests pass from a symlinked checkout |
| UC-004 | The web unit suite's Basics panel test passes on personal |
| UC-005 | The iOS workflow and smoke script choose the named simulator on the newest runtime |

### Out Of Scope

- Removing the server's `restoreAgentRun` and `agentRunCollaborationMemberProjection` GraphQL fields. Only tests and probes call them, but about 40 test call sites would need rewriting (follow-up FU-001).
- The web e2e probes that still count `GetAgentRunCollaborationMemberProjection` requests, which the web stopped sending in autobyteus-461 (follow-up FU-002).
- The update cards' copy, the inspector's production code, and any app behavior.

### Non-Goals

- Raising the port inspector's 1000 ms deadline.

### Preserved Behavior Boundary

The preserved column of BEH-001…005.

### Prerequisites

None.

### Review Authority

The standard rules apply.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Remove the three web documents, their generated types (by codegen from the changed server), their three demo-list entries and the then-empty "unused" reason, and the server's `approveToolInvocation` mutation with its input/result types and unit-test case. | BEH-001 | Must | FU-002 (279); DEC-002 |
| REQ-002 | The deadline test's fake `lsof` writes its pid receipt as its first action with negligible start-up time, and keeps running past the deadline without forking descendants. | BEH-002 | Must | FU-003 (279); DEC-001 |
| REQ-003 | The migration-boundary test compares paths after resolving symlinks on both the root and each enumerated URL. | BEH-003 | Must | FU-005 (279) |
| REQ-004 | The Basics panel test stubs `ShowInternalAgentsCard` and `UpdateChecksCard`, asserts both are present, and keeps its "no GitHub" assertion over the panel's own content. | BEH-004 | Must | FU-006 (279); DEC-003 |
| REQ-005 | One script chooses the iOS simulator as BEH-005 says. The workflow and the smoke script both use it, and both copies of the awk match go. | BEH-005 | Must | FU-001 (571); DEC-004 |

## Acceptance Criteria

| AC ID | REQ | Trigger | Observable Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Search, typecheck, codegen check, demo build check | No source references to the three documents or to the server mutation. `codegen:check`, both typechecks and the demo build's operation check pass. Tool approval over the WebSocket still works (existing tests). | Commands; existing approval specs |
| AC-002 | REQ-002 | Electron suite, and the test repeated under CPU load | The test passes every time (for example 20 runs under load), still asserting elapsed ≥ 900 ms and < 3000 ms and ESRCH for the child | Repeated runs, logged |
| AC-003 | REQ-003 | The iOS core tests from a checkout under `/tmp` and from a plain path | They pass from both | `xcodebuild … test`, logged |
| AC-004 | REQ-004 | Web unit suite on the branch | `ServerSettingsBasicsPanel.spec.ts` passes; the web unit suite has no failures | `pnpm -C autobyteus-web test` (or the project's unit command) |
| AC-005 | REQ-005 | Build-only iOS release run on GitHub (`xcode-27`); local smoke | The log shows the chosen device "iPhone 17" on the newest iOS runtime (27.2 with Xcode 27.2). Build, core tests and smoke pass. Locally, a missing name falls back to an iPhone with a notice. | GitHub run (DESIGN.md rule 12); local run |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Trigger | Expected Outcome | Validity |
| --- | --- | --- | --- | --- |
| SCN-001 | Operational | Developer or CI runs the web/Electron/iOS suites | Green for product reasons only | Supported Normal Scenario |
| SCN-002 | Operational | Release run or local smoke | The named simulator on the newest runtime | Supported Normal Scenario |
| SCN-003 | Contract | A client calls the GraphQL API | Unused operations are absent; the WebSocket approval is unchanged | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements

Applicable: `No`.

## Data Continuity

Persisted data affected: `No`.

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | FU-003 suggests "wait for the child's pid receipt". Does that fix it? | **No.** The receipt is the child's first statement, and `execFile` reports only after the child exits. ENOENT therefore means the child was killed at the 1000 ms deadline (the failing case took 1018 ms) before its first statement ran. The sibling cases in the same run show Node start-ups of 318–823 ms under suite load; in isolation they are about 30 ms. Waiting would wait forever. **Decided:** a `/bin/sh` fixture that writes `$$` and then `exec sleep 5`. It is the same pid with no descendant. sh starts 3–5× faster than Node (measured: median 6 vs 31 ms idle, 17 vs 62 ms under 2×CPU load). | Solution Designer | Decided |
| DEC-002 | Which server resolvers count as "unused"? | `approveToolInvocation` (GraphQL) has no caller but its unit test: dead, removed. `restoreAgentRun` (28 server e2e files, 2 web probes) and `agentRunCollaborationMemberProjection` (13 server e2e tests, an integration test, the mobile-shell probe) are called only by tests. DESIGN.md rule 11 says that code should go, but they are used as tools across about 40 call sites. Rewriting those is its own Task, not a small cleanup. **Decided:** follow-up FU-001. | Solution Designer | Decided |
| DEC-003 | Fix the test or the copy (FU-006)? | The copy is true: packages and skills update from GitHub. The test broke because two new cards were not stubbed like the others. **Decided:** fix the test (REQ-004). | Solution Designer | Decided |
| DEC-004 | Keep the any-iPhone fallback (FU-001)? | Developer machines may not have "iPhone 17", and the README's local smoke relies on the fallback. **Decided:** keep it as an explicit second rule with a printed notice. The newest runtime is bounded by the selected Xcode's simulator SDK version, so a beta runtime the Xcode cannot run is never chosen. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-003 |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-001 |
| REQ-003 | UC-003 | BEH-003 | AC-003 | SCN-001 |
| REQ-004 | UC-004 | BEH-004 | AC-004 | SCN-001 |
| REQ-005 | UC-005 | BEH-005 | AC-005 | SCN-002 |

## Readiness Check

- Content ready for approval: `Yes`; approved within the direction; ready for design: `Yes`.
