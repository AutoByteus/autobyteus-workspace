# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agent-run-input-state-cleanup` (Project Task autobyteus-140)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `Solution Designer within the direction (user informed)`. The direction is the Task (no behaviour change; DEC-005 of PB-001 under the user's delegation). The user is informed in the Solution Designer conversation, 2026-10-18.
- Exact approved requirements baseline: SR-001
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: `AgentRun`'s input-state code hides state changes behind a getter-looking method, repeats a two-step call inline, and a test comment misdescribes the protocol. Several test doubles of `AgentRunBackend` declare a stale `inputCapabilities` shape (the kind of drift that hid PB-001).
- Desired outcome: the same behaviour, with the mutation explicit, the repetition consolidated, the comment correct and the drifted doubles conforming to the current `inputCapabilities` contract.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | Input-state revisions are published once per new revision; snapshot on subscribe; the pull read advances the revision | Same | All PB-001 behaviour | notes |
| BEH-002 | Operational | — | Tests pass with drifted doubles | Same results with conforming doubles | Test outcomes | notes |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Engineers | Readable, trustworthy code and tests | Explicit mutation; correct doubles | No behaviour change |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Maintain `AgentRun` input-state publication code | SCN-001 |
| UC-002 | Keep `AgentRunBackend` test doubles on the current `inputCapabilities` contract | — |

### Out Of Scope

- Any change to what or when input state is published; termination's own call pattern; `compactionRecovery.reconcile()` semantics.
- Wider test-double drift (missing `hasRunningBackgroundTasks`/`dispatchUserInput`, factory `beginPreparation`, the LM Studio test's removed APIs) and type-checking tests: autobyteus-65.

### Non-Goals

- None.

### Preserved Behavior Boundary

BEH-001 and all PB-001 and autobyteus-139 tests unchanged and green.

### Review Authority

- Blocking findings must cite REQ/AC/BEH IDs. New behaviour is a `Requirement Gap`. Adjacent concerns are follow-ups.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Input-state revision advancement is performed by an explicitly named step; the event/DTO builder has no side effects (CC-001). | BEH-001 | Must | Readability; PB-001 root cause | Task |
| REQ-002 | The consecutive "reconcile recovery, then publish input state" sequence has one owner (CC-002). | BEH-001 | Must | Duplication | Task |
| REQ-003 | The `captureMessages` comment states the actual role of `AGENT_INPUT_STATE` (CC-003). | — | Must | Accuracy | Task |
| REQ-004 | Every test double of `AgentRunBackend` that sets or omits `inputCapabilities` uses the current contract shape. | BEH-002 | Must | Drift | Task |
| REQ-005 | No behaviour change. | BEH-001, BEH-002 | Must | Task | Task |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario IDs | Trigger | Expected Outcome | Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 | Read `agent-run.ts` | One method advances the revision (named as a command); the event builder is pure; `getInputStateSnapshot`, subscribe and publish use them; call order of `compactionRecovery.reconcile()` before the signature check is unchanged | — | Code review |
| AC-002 | REQ-002 | BEH-001 | Same | The three consecutive pairs use one method; publish-only sites and termination are unchanged | A reconcile added to a publish-only site → fail | Code review |
| AC-003 | REQ-003 | — | Read the test file | The comment says input state is a cadence boundary deliberately left out of that trace | — | Review |
| AC-004 | REQ-004 | BEH-002 | `grep -rn inputCapabilities tests` | No `{ kind: "start_only" }`; the 2 doubles feeding `AgentRun` declare `inputCapabilities`; `ScriptedAgentRunBackend` conforms to `AgentRunBackend` | — | grep + review |
| AC-005 | REQ-005 | BEH-001, BEH-002 | Suites | `agent-run.test.ts` and the input-state unit tests, `agent-status-websocket.integration.test.ts` (8/8), `chat-socket-content-cadence.integration.test.ts`, the edited test files, server `test:unit`, `test:integration`, `typecheck`: green with no test assertion changed | Any assertion change → fail | Suite runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Contract | Goal | Trigger | Starting Condition | Sequence | Outcome | Alternate | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | WebSocket and root-view consumers of input state | Correct, once-per-revision input state | Live run activity; subscribe; pull read | Run live | As PB-001 | Unchanged | — | Supported Normal Scenario | PB-001 | AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A — not applicable.

## Quality And Non-Functional Requirements

- None beyond REQ-005.

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

- `AgentRunBackend` / `AgentRunBackendInputCapabilities` (unchanged).

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/test-double-drift-typecheck-probe.txt` | Wider drift for autobyteus-65 | FU-001 | Final | Evidence only |

## Assumptions

- None material.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How far does "same drift" go? | Scope | Only `inputCapabilities` (6 doubles) versus all contract drift (49 errors in 14 files) | The Task names the `inputCapabilities` drift and assigns test type-checking to autobyteus-65. Fixing all drift here duplicates that Task. **Fix `inputCapabilities` in all 6 doubles, make `ScriptedAgentRunBackend` (in the touched file) conform fully, and send the wider list to autobyteus-65.** | Solution Designer | Decided |
| DEC-002 | Remove the revision advance from the pull read? | Purity | Advancing on read is needed for consistent revisions | **Keep advancing on read; make it explicit by naming.** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Supplemental |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-005 | SCN-001 | — |
| REQ-002 | UC-001 | BEH-001 | AC-002, AC-005 | SCN-001 | — |
| REQ-003 | UC-002 | — | AC-003 | — | — |
| REQ-004 | UC-002 | BEH-002 | AC-004, AC-005 | — | probe |
| REQ-005 | UC-001, UC-002 | BEH-001, BEH-002 | AC-005 | SCN-001 | — |

## Readiness Check

- All content checks: `Yes`; Product design: `N/A`; content ready: `Yes`
- Approval recorded: `Yes`; approved basis ready for design: `Yes`
