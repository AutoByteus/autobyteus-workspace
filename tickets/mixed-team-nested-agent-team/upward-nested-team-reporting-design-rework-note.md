# Communication Roster / Representative Design Rework Note

## Status

Design rework complete and routed for architecture review after user confirmed no further user review is needed.

## User Question

Is nested team communication intended to be top-down only, and should the child coordinator use a hidden reply target? The refined answer from discussion is: no. The child coordinator should see exposed parent-boundary members directly, and the parent should see subteam coordinators/representatives directly.

## Decision

Nested communication uses a scoped communication roster derived from the structural team tree. Structural subteam nodes remain nested execution/display nodes, but `send_message_to` exposes responsible coordinator/representative member names rather than abstract subteam node names.

No `reply_to_sender`, no `replyAddress` routing, and no stored sender state are required for upward routing.

## Design Summary

- Structural tree stays: `program_manager`, `BuildSquad -> review_lead, qa_specialist`.
- `program_manager` communication roster exposes `review_lead` as the `BuildSquad` representative, with descriptor metadata pointing to actual route `BuildSquad/review_lead` and represented subteam `BuildSquad`.
- `BuildSquad/review_lead` communication roster exposes local child teammate `qa_specialist` and parent-boundary member `program_manager`.
- Tool adapters resolve `recipient_name` against `MemberTeamContext.communicationRecipients`, not structural `members`.
- Parent-to-representative delivery: `program_manager send_message_to('review_lead') -> descriptor target BuildSquad/review_lead -> parent MixedTeamManager -> BuildSquad subteam handle -> child coordinator`.
- Child-to-parent delivery: `BuildSquad/review_lead send_message_to('program_manager') -> parent-boundary descriptor -> ParentBoundaryBridge -> parent MixedTeamManager -> program_manager`.
- Communication events record actual participants and represented-subteam context: downward `program_manager -> BuildSquad/review_lead` with represented `BuildSquad`; upward `BuildSquad/review_lead -> program_manager`.
- Sender/receiver address fields may be recorded for traceability/projection, but they are not a routing state machine.
- Scope remains bounded: immediate parent-boundary recipients only; no grandparents, unrelated runs, sibling subteam internals, hidden recipients, or duplicate visible recipient names.
- UI keeps nested structural display but communication panels show actual participants plus representation context.

## Artifacts Updated

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md`

## Round 10 Architecture Review Revision

After architecture review Round 10, the design was tightened further:

- Parent-to-representative delivery uses one absolute-route contract: `program_manager -> review_lead` creates a delivery request rooted at the parent run with recipient route `BuildSquad/review_lead`.
- The parent manager resolves the executable top-level handle (`BuildSquad`) but communication identity remains `BuildSquad/review_lead`.
- The subteam handle strips the `BuildSquad` prefix and posts to child-local selector `review_lead`; default/null child routing is only for structural subteam group posts.
- Recipient descriptors use `delivery { teamRunId, selector }` plus `participant.address`; no parallel target/actual coordinate fields.
- Coordinate semantics are explicit: parent-to-representative descriptors are rooted at the parent run with recipient `BuildSquad/review_lead`; child-local descriptors are rooted at the child run with local route `qa_specialist`; child-to-parent descriptors are rooted at the parent run with recipient `program_manager` and sender normalized to `BuildSquad/review_lead`.
- `TeamCommunicationParticipant` and projection DTOs carry `representedSubTeam` end-to-end.
