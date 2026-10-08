# Implementation Design Impact: SR-003 `readiness_failure` removal (IR-003, blocked)

- From: `/software_engineering_team/implementation_engineer`
- Date: 2026-10-08
- Package: `delegated-team-member-lazy-activation`, SR-003 / ARCH-REV-001 (Pass), HEAD `d30c11204`
- Classification: **Design Impact**. A premise of an approved design decision is wrong. Implementation stopped before committing.

## Finding DI-001: `readiness_failure` has a consumer, and it is user-visible

SR-003's "Contract decisions" table says: *"Remove the variant from `CollaborationAgentExecutionEvent` and its emission in `initializeReady` (no consumer, AINV-010)."* That premise does not hold. Searching for the string misses the consumer because it is an implicit fall-through branch.

Evidence (current source):

1. `autobyteus-server-ts/src/agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.ts:86-97`. After the `agent_run`, `member_input` and `status_overlay` branches, the remaining kind is `readiness_failure`. It is published as an `ERROR` presentation event: `{ code, message, errorScope: "runtime", errorEffect: "terminal" }`, `statusHint: "ERROR"`. Removing the variant makes that branch `never`, and `tsc -p tsconfig.build.json` fails at L90-91.
2. `agent-presentation-message-projector.ts:85-97` turns it into a stream `ERROR` message (`error_scope: "runtime"`, `error_effect: "terminal"`).
3. Frontend `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts:198` → `handlers/agentStatusHandler.ts:122-161` `handleError`. This pushes an **error segment (code plus message) into the member's conversation** and calls `markConversationComplete`.

Consequence: today, every member start failure shows a visible error card with the cause in that member's conversation. This holds for UI-started Teams and Orgs and for delegated copies, on both `postMessage` and `reserveInput` paths. `reserveInput` emits it through `initializeReady` even before IR-002. Removing `readiness_failure` would silently remove that card. That is a user-visible change to BEH-002 / REQ-007 ("Team UI start … behave exactly as before") and is not covered by the approved requirements.

## Unaffected parts of SR-003

The rest of SR-003 can be implemented as designed and was implemented as work in progress, not committed:

- `startForInput()` used by both `reserveInput` and `postMessage`;
- `AGENT_RUN_ACTIVATION_FAILED` / `AGENT_RUN_NOT_ACCEPTING_INPUT` on both result shapes;
- one cause helper (AR-NB-001), the closed-input detection and own-overlay clearing (AR-NB-002), and unchanged post-start `postMessage` behavior (AR-NB-003).

The WIP is saved as `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/ir-003-wip-start-for-input.patch`. The source tree is restored to HEAD `d30c11204`.

## Options for Solution Designer

- **A (smallest; keeps the visible behavior):** keep the `readiness_failure` event, which feeds the conversation error card, and remove only the duplicated per-entry-point handling. `startForInput` becomes the single owner of the overlay and the typed result, and `initializeReady` keeps emitting the event once per failed start. Optionally give the presentation adapter an explicit `readiness_failure` branch instead of the implicit fall-through. The "four channels" become: an overlay (status), a conversation error event (history/UI), and one typed result per shape.
- **B (as designed):** remove the event and accept losing the conversation error card. This needs explicit user approval as a behavior change to UI-started Teams and Orgs (REQ-007), and possibly a frontend follow-up if the error should still appear somewhere besides the status dot's `errorMessage`.
- **C:** move the conversation error card's source to `startForInput`, for example by publishing the same `ERROR` presentation event from there, and remove `readiness_failure`. This keeps the visible behavior but gives a start that fails outside `startForInput` (`getOrCreateAgentRun`, `approveToolInvocation`, `reserveInput`/`postMessage` concurrency) no card. That is a different coverage from today and needs a design call.

Recommendation: **A**. It is the smallest change that keeps approved behavior, and it fully resolves CR-FO-001/003 (DTL-003 needs the typed result, the cause in the message, and the `error` status, all of which `startForInput` delivers).

## Related

- CRR-002 / CR-FO-001/002/003: `code-review-report.md`
- ARCH-REV-001: `design-review-report.md`. AR-NB-001..003 are already applied in the WIP patch.
- IR-002 (`d30c11204`) stays in place, superseded but not reverted, until the design is settled.
