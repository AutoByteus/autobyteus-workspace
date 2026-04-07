# Requirements

## Metadata

- Ticket: `autobyteus-tool-result-continuation-regression`
- Status: `Refined`
- Last Updated: `2026-04-07`
- Source: User bug report with live Electron screenshots and runtime symptom description
- Scope: `Medium`

## Problem Statement

When an AutoBytus runtime agent in the Electron app calls a tool successfully, the run stops after the tool lifecycle finishes instead of feeding the tool result back into the model for the next LLM turn. In practice, the agent remains stuck in a "Processing Input" state with a successful tool activity shown, but no follow-up assistant output is produced.

## In-Scope Behavior

- Investigate the AutoBytus runtime execution path used by the Electron app when a run emits a tool call and receives a tool result.
- Confirm where the continuation loop breaks after successful tool execution.
- Restore the expected behavior: successful tool results must be re-injected into the agent loop so the runtime can request the next LLM completion or emit the next visible assistant action.
- Add durable regression coverage for the identified failure mode.
- Preserve server-side input customization compatibility for tool-result continuations.

## User-Facing Impact

- Users can submit an initial prompt, but any agent flow that requires at least one tool call effectively stalls.
- Tool-enabled agents become unusable for normal multi-step execution.
- Electron app state becomes misleading because activity shows tool success while the run does not complete the agent turn.

## Refined Requirements

| ID | Requirement | Why It Matters |
| --- | --- | --- |
| R-001 | Tool-result continuation must be queued on an internal continuation path that remains eligible while an active turn is still running. | The old queue placement allowed the worker to filter the continuation out before any handler logic could inspect it. |
| R-002 | Tool-result continuation must continue to use `UserMessageReceivedEvent` and `UserInputMessageEventHandler`, with `SenderType.TOOL`, so existing input processors and server customizations still execute. | Introducing a separate handler path would risk bypassing prompt/context/security processors in `autobyteus-server-ts`. |
| R-003 | External user input that arrives after tool success must stay behind the current turn's tool-result continuation until that continuation finishes. | A later user message must not preempt the still-active turn that is waiting to consume its own tool result. |
| R-004 | Durable regression coverage must prove assistant completion after tool success for both single-agent and team flows, not just tool execution itself. | The previous coverage hole allowed the runtime to stop after tool success without failing tests. |
| R-005 | Server-side team GraphQL runtime validation must reflect the current team-definition schema and assert post-tool assistant completion. | The stale team runtime E2E was failing before execution because required `refScope` fields were missing and it did not check the real continuation boundary. |

## Acceptance Criteria

| ID | Maps To | Acceptance Criteria |
| --- | --- | --- |
| AC-001 | R-001 | After a successful tool call in the AutoBytus runtime path, the worker consumes the tool result via an internal continuation queue and invokes the next model turn instead of stopping. |
| AC-002 | R-002 | Tool-result continuation still flows through `UserMessageReceivedEvent` and `UserInputMessageEventHandler`, and server customization processors remain compatible. |
| AC-003 | R-003 | When a later real user message is submitted while the original turn still owns tool continuation, the continuation runs first and the later user input remains queued until the first turn completes. |
| AC-004 | R-004 | `autobyteus-ts` single-agent and team integration flows assert the sequence `TOOL_EXECUTION_SUCCEEDED -> ASSISTANT_COMPLETE_RESPONSE -> TURN_COMPLETED`. |
| AC-005 | R-005 | `autobyteus-server-ts` team runtime GraphQL E2E passes with current `refScope` requirements and verifies assistant completion after tool success. |
| AC-006 | R-001, R-004 | Manual verification in the frontend no longer reproduces the stuck post-tool state for the reported scenario. |

## Final Resolution Notes

- Failure boundary: core `autobyteus-ts` runtime queue eligibility while an active turn is running.
- The break is not caused by `senderType`; it is caused by placing tool-result continuation on the external user-message queue while `allowExternalInput=false`.
- The safer design is a dedicated internal tool-continuation queue that still feeds the same input-event and customization path used for normal user messages.
