# Requirements

## Status
- Design-ready

## Date
- 2026-04-09

## Goal / Problem Statement
- Investigate and fix a bug where Codex runs inside the AutoByteus desktop/web app initially stream normally, then progressively slow down, stop emitting visible output, and appear stuck after the user sends follow-up messages.
- Determine whether the fault is in the app integration, the server-side Codex runtime/stream bridge, or the frontend live-render/update path.
- Preserve or improve AutoByteus-side streaming efficiency without claiming a full product fix if the primary stall source is upstream in native `codex app-server`.

## User-Observed Symptoms
- A Codex agent starts by streaming output continuously.
- After some time, output cadence slows down.
- Eventually the run appears stuck and no new visible output is rendered.
- Sending another user message may eventually unblock or flush output, but the problem repeats.
- The same Codex workflow does not show this issue in the standalone Codex CLI or Codex app.

## In-Scope Use Cases
- UC-001: A single-agent Codex run continues to stream assistant progress without long silent stalls while the run is active.
- UC-002: Sending a follow-up user message to an already-running or recently-running Codex thread does not deadlock visible output in the app.
- UC-003: The backend continues to publish Codex thread/run events even for long-running sessions with many updates.
- UC-004: The frontend continues to consume, reduce, and render streaming events without degrading into apparent inactivity.
- UC-005: The system surfaces enough evidence to distinguish a backend publication stall from a frontend rendering stall.

## Initial Acceptance Criteria
- R-001 (`requirement_id: R-001-root-cause-identified`)
  - Given the reported stall pattern
  - Then the investigation identifies the concrete failing layer and documents the mechanism with code-level evidence.
- R-002 (`requirement_id: R-002-no-progressive-stream-stall`)
  - Given a representative Codex conversation that produces extended streamed output
  - Then the AutoByteus app continues to display progress without the observed progressive slowdown and silent stuck state.
- R-003 (`requirement_id: R-003-follow-up-message-does-not-stick`)
  - Given a user sends another message after a prior Codex response
  - Then the next run continues streaming normally instead of entering a stuck/no-output state.
- R-004 (`requirement_id: R-004-regression-coverage`)
  - Given the identified failure mode
  - Then automated coverage or executable validation exists to catch the same regression path.

## Refined Requirement Decisions

- R-001 (`root-cause attribution`)
  - The ticket must produce statistically grounded evidence that separates native `codex app-server` cadence from AutoByteus backend cadence for the same large task.
- R-002 (`no false product claim`)
  - The ticket must not claim AutoByteus fixed the native Codex slowdown if native raw probing still reproduces the same long silent phases.
- R-003 (`remove non-required Codex token persistence`)
  - AutoByteus must stop persisting Codex token-usage records into the local token-usage store because this is not a product requirement and should stay outside the hot streaming path.
- R-004 (`reduce local team-path amplification`)
  - AutoByteus must avoid refreshing team metadata on every streamed team event and instead coalesce that work.
- R-005 (`durable validation coverage`)
  - The ticket must leave targeted automated coverage plus executable probe evidence that proves the attribution and protects the local optimizations.

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Description | Current Decision |
| --- | --- | --- | --- |
| AC-001 | R-001 | Same-run raw `item/agentMessage/delta` cadence and backend `SEGMENT_CONTENT` cadence are measured and compared for a large Codex turn. | Required |
| AC-002 | R-001 | Native direct `codex app-server` probing reproduces the slowdown without AutoByteus in the middle. | Required |
| AC-003 | R-002 | Final handoff explicitly states whether AutoByteus is the primary source or only a local amplifier. | Required |
| AC-004 | R-003 | `CodexAgentRunBackend` no longer writes Codex token-usage records to the AutoByteus token-usage store. | Required |
| AC-005 | R-004 | Team streaming coalesces metadata refreshes instead of issuing one refresh per streamed event. | Required |
| AC-006 | R-005 | Targeted unit tests and Codex probe tests cover the changed behavior and attribution path. | Required |

## Out Of Scope / Non-Goals

- Eliminating the native bursty or long-silent behavior inside `codex app-server` itself.
- Changing Claude or AutoByteus-native runtime streaming semantics.
- Claiming frontend rendering is fully cleared without separate frontend receive/render instrumentation.

## Requirement Coverage Map

| Requirement ID | Acceptance Criteria ID(s) | Use Case ID(s) | Notes |
| --- | --- | --- | --- |
| R-001 | AC-001, AC-002 | UC-001, UC-005 | Attribution requires both direct native and same-run paired measurements. |
| R-002 | AC-003 | UC-001, UC-002 | Final summary must state the boundary of the fix. |
| R-003 | AC-004 | UC-003 | Codex token persistence is removed from the backend event path. |
| R-004 | AC-005 | UC-002, UC-004 | Team-path work is coalesced to avoid local amplification. |
| R-005 | AC-006 | UC-003, UC-005 | Durable repo validation plus ticket-local measurement artifacts remain. |

## Constraints / Dependencies
- Preserve existing Codex run/thread semantics unless the bug requires a protocol or state-machine correction.
- Do not degrade Claude or AutoByteus-native streaming behavior while fixing Codex.
- Investigation may span both `autobyteus-server-ts` and `autobyteus-web`.

## Risks
- The symptom may be caused by interaction between multiple layers rather than one isolated bug.
- Apparent UI stalls may mask a still-running backend, so instrumentation and evidence correlation are required.
