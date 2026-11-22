# Design Spec: team-interrupt-ack-602

## Solution And Approval Basis

- Revision: `SR-001`. Requirements: approved within the direction. Design approval: not required. Status: `Ready`.
- Authorities read: `architecture-design.md`, `design-principles.md`, `DESIGN.md` (this conversation); `TESTING.md` 195-236.

## Current-State Read And Change

- **Owner:** `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts`, TF-04 (lines 433-442).
- **Today:** after `view.interrupt(writerRunId)`, it waits for the release (`until` over snapshots, 60 s), then reads `view.acks(errorsFrom)` once (`:437`).
- **Change:**
  - After the release wait, add `await until(() => view.acks(errorsFrom).some((frame) => frame.payload.command_type === "INTERRUPT_GENERATION"), "the interrupt was acknowledged", OS_FILE_EVENT_WAIT_MS)`, imported from `tests/helpers/os-latency-under-load.ts` as the file's other waits are. Keep `.then(() => true, () => false)`, as `released` does, so a missing ack still reaches the receipt and fails the assertion.
  - Then read `interruptAck` as today. The `keep("TF-04.json", …)` receipt is written after both waits, so its `writerFramesAfterInterrupt` records the order (AC-002's evidence).
  - The case's timeout (`caseTimeout(2)`) gains `OS_FILE_EVENT_WAIT_MS` if needed. **To verify** in the change: `caseTimeout`'s budget against two waits.
- **No server change.** No other case.

## Task Size And Architectural Risk

- `task_size`: `Small` (one test case).
- `architectural_risk`: `Low` (no contract, persistence or runtime change).
- **Escalation:** the ack proves not to arrive at all within the limit on a machine where the release arrives. That would be a server defect, and the change returns here.

## Spine

User Stop on the Team stream → `AgentTeamStreamHandler` → `handleTeamInterruptGenerationCommand` → `RootTeamRun.executeAgentCommand(interrupt)` → the held turn ends → the leaving member is released (snapshot, `RUN_TREE_CHANGED`) → the command returns → `AGENT_COMMAND_ACK accepted`. The test now waits at the last step, not at the release.

## Change Scope

- **In:** TF-04 in that test file.
- **Left alone:** the server, the other cases, the fixture CLI.
- **Follow-ups:** none.
