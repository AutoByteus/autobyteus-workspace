# Investigation Notes

## Ticket

- Ticket: `autobyteus-tool-result-continuation-regression`
- Date: `2026-04-07`
- Scope: `Medium`

## Reported Symptom

- In the Electron app, a run enters the tool lifecycle, shows successful tool activity, and then remains stuck in a post-tool processing state without producing the follow-up assistant output.

## Evidence Collected

- User screenshots showed successful `search_web` activity with no assistant continuation.
- Runtime review in `autobyteus-ts` identified the active-turn worker loop as the controlling boundary for whether new input is eligible while a turn is still running.
- Existing integration tests proved tool execution happened, but the key LM Studio flow tests did not require a later `ASSISTANT_COMPLETE_RESPONSE` and `TURN_COMPLETED` after tool success.
- `autobyteus-server-ts` team runtime GraphQL E2E had a separate stale-fixture failure: team member nodes were missing required `refScope` values and the test did not assert post-tool assistant completion.

## Root Cause

- The bug is in the core runtime queue model, not in Electron UI rendering and not in `senderType`.
- While an active turn exists, the worker asks the queue manager for input with external input blocked.
- Tool-result continuation was being re-enqueued onto the normal external `userMessageInputQueue`.
- Because that queue is filtered out while the active turn is still running, the continuation event never reached `UserInputMessageEventHandler`.
- As a result, no second LLM turn was requested, even though tool execution had succeeded.

## Why `senderType` Did Not Save It

- `senderType` is only available after the event has already been dequeued and delivered to the handler layer.
- The worker never dequeued the continuation event from the external queue while the turn was active, so no handler logic could examine `SenderType.TOOL`.

## Server Customization Risk Review

- A separate continuation handler path would have risked bypassing existing `UserInputMessageEventHandler` processor hooks used by `autobyteus-server-ts`.
- The relevant concern was the customization stack that still expects tool-originated continuation to behave like a processed input message once it reaches the handler layer.
- The safer design is therefore:
  - separate queue eligibility
  - same `UserMessageReceivedEvent`
  - same `UserInputMessageEventHandler`
  - same input-processor chain

## Owning Subsystems

- Primary owner:
  - `autobyteus-ts` agent runtime input-event queueing and tool-result continuation path
- Secondary owner:
  - `autobyteus-ts` LM Studio integration tests for single-agent and team flows
- Additional test owner:
  - `autobyteus-server-ts` team runtime GraphQL E2E fixture and continuation assertion

## Final Triage

- Classification: `Medium`
- Confidence: `High`
- Fix direction approved by investigation:
  - dedicated internal continuation queue, same message semantics, stronger post-tool regression coverage
