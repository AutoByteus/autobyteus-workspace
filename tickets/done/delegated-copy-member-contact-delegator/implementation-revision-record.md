# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 1 (Pass) | N/A (AR-001 and AR-002 applied as implementation notes) | `Initial Baseline` | SR-005, SR-006, ARCH-REV-001; CRR/API-REV/DR N/A | Implemented D-1..D-4; ready for code review |

## Revision Entries

### IR-001 — Agent-root port per viewer; host offered, resolved and listed for every non-host agent

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-review-report.md`, round 1 (Pass)
- Triggering finding IDs: N/A. Non-blocking notes AR-001 (pin cross-viewer catalog-address stability for the normal case) and AR-002 (pass `focusedAgentRunId` in every `agent`-kind candidates query caller) were applied.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete, local checks pass; route to Code Review (Medium / High).
- Related solution revision IDs: SR-005 (approved requirements), SR-006 (design)
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002, REQ-003, REQ-004, REQ-006 (BEH-001, BEH-002, BEH-005, BEH-003 preserved); preserved AC-007..AC-009.
- Implementation delta:
  - Contract: `MentionedCollaborator.inRun` → `presence: "not_in_run" | "in_run" | "run_agent"`; one `guidanceFor(entries)` used by compose and parse; run-agent entry suffix `, the run's own agent` and sentence `Use send_message_to with recipient_address <addr> to message <name>; delegate_task cannot target it.`
  - Server collaborators: `CollaboratorRootPort.rootDefinition()` → `ownDefinition()` (viewer-relative); new top rank `run_agent`; `buildInRunPlacements({ runAgent? })`; exported `preferredInRunPlacement`; admission decides `presence`.
  - Agent root: `standaloneRootCollaboratorPortFor(tree, launch, viewerAgentRunId)`; `StandaloneRootCollaborators.portFor(viewer)`, `resolveMentions(viewer, …)`, `listAvailable(viewer)`; bring-in/catalog copy use `senderRunId`; `StandaloneAgentRunRoot.collaboratorPortFor(viewer)`.
  - GraphQL: `collaboratorMentionCandidates(…, focusedAgentRunId)`, required for `agent`.
  - Web: candidate subject with `focusedAgentRunId` for Agent roots; cache key per focused agent; `invalidate` clears every key of a root; task-child targets carry `agentRunId`; generated types (collaborator hunks only).
- Changed files or areas: commit `24baaf7c5`; see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: contract tests 16/16; server unit+integration 694 files pass, 42 files fail identically on base (see handoff); web unit 590 files / 4003 tests pass; fake-CLI E2E `ad-hoc-task-delegation` 3/3; composer `@` browser probe B01–B04 Pass.
- Next recipient or routing: per `get_handoff_rules` (Code Review route for Medium / High).
- Remaining limitations or risks: AR-001 post-rename catalog-address divergence (not-found only) is recorded residual risk; new non-host E2E journeys (AC-002/003/006 through the real server) left to API/E2E.
