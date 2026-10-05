# Requirements Document — standalone-agent-run-root

## Document Status
- Status: **Approved** (SR-002, 2026-10-02).
- Approval reference: the user said "no splitting. i think do it in this ticket. lets do it" (2026-10-02). This was
  in reply to the request to approve with the recommendations on Q-1–Q-4 and the one-or-two-tickets question.
  Q-1–Q-4 are accepted as recommended.
- Basis: the code reviewer's request, which states that the user agreed the scope and the naming
  (`StandaloneAgentRunRoot`), and the user's "continue please with the improvement". Q-1–Q-4 are open, with
  recommendations.
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`, branch
    `codex/standalone-agent-run-root`.
  - Base `origin/personal` @ `b37d7a934` (rebased 2026-10-04, SR-005; originally `2d3b66005`). Target `personal`.
  - SR-005 note: the rebase changes no intended behavior. "Daily Assistant" here refers to the built-in default chat
    agent, now named "General Agent" upstream (ID `autobyteus-daily-assistant` unchanged). The approval stands.

## Problem And Desired Outcome
The collaboration features work, but they left structural debt and a few small gaps:
- **Structural debt:**
  - a standalone run's collaboration is a separate "holder" attached next to the run;
  - Team-run collaborator agents are added through structures meant for configured members;
  - two files are oversized.
- **Small behavior gaps:**
  - self-delegation in standalone runs;
  - the sender's address is hidden from agents;
  - standalone token totals omit collaborators;
  - one page still shows agent messages user-style;
  - a host label is lower case.
- **Two failing test suites.**

Desired outcome: one clean structure with the user-visible behavior preserved, plus the listed small fixes.

## Scope Guardrail
### In Scope
- **UC-001:** the standalone run becomes a true root (`StandaloneAgentRunRoot`).
- **UC-002:** an explicit Team-root collaborator-agent registry.
- **UC-003:** file-size extraction.
- **UC-004:** self-delegation parity.
- **UC-005:** sender address in deliveries.
- **UC-006:** token roll-up for standalone runs.
- **UC-007:** "earlier events" sender rendering.
- **UC-008:** host label casing.
- **UC-009:** the two test suites.
- **UC-010:** a decision on hardening against a malformed standalone package.

### Out Of Scope
- New collaboration features.
- Changing the persisted standalone package format.
- Changing helper and application-owned runs.

### Preserved Behavior Boundary
- Every user-visible behavior of `@`, collaborators, task copies, `list_available_agents`, standalone runs (including
  Daily Assistant), Stop and reopen, crash recovery, history delete and archive, and the Team/Org tabs is unchanged,
  except as REQ-004–REQ-008 state.
- Existing history opens unchanged.

## Requirements
- **REQ-001: `StandaloneAgentRunRoot` (D-2).**
  - Every collaboration-eligible standalone run is owned end-to-end by one `StandaloneAgentRunRoot`: its host agent,
    collaborators, task copies, messages, lifecycle (start, restore, crash recovery, Stop, delete and archive) and
    persistence. It is managed by `StandaloneAgentRunRootManager`.
  - This replaces the attached Agent root, its manager, and the standalone lifecycle binding.
  - The root kind stays `agent`. The persisted package format and the catalog flag are unchanged.
  - No user-visible change, including host crash recovery, which now works like a configured member's.
- **REQ-002: Team-root collaborator-agent registry (D-1).** Collaborator agents in Team runs are held by an explicit
  `TeamRootCollaboratorAgentRegistry`, beside `CollaboratorTeamExecutionRegistry`, not in configured-member structures.
  No user-visible change.
- **REQ-003: File size.** The Org root (`agent-org-run.ts`) and the standalone root are each brought under the size
  limit by extracting cohesive parts, as was done for the Team root. No user-visible change.
- **REQ-004: Self-delegation parity (C-11).** In standalone runs, an agent calling `delegate_task` to its own address is
  rejected with `COLLABORATION_SELF_TARGET_REJECTED`, as in Team and Org runs.
- **REQ-005: Sender address (behavior change).** Every inter-agent delivery the receiving agent reads states the
  sender's full address as well as its name and run ID, so a reply by address works for senders inside teams.
  Proposed text: `You received a message from sender name: lead, sender address: /eng/lead, sender id: <runId>`.
- **REQ-006: Token roll-up (behavior change).** A standalone run's token usage includes its collaborators' and task
  copies' usage, the same way a team run's usage includes its members. This applies to existing runs too, as far as
  their records allow (Q-2).
- **REQ-007: "Earlier events" sender rendering.** The Event Monitor's "earlier events" page renders inter-agent
  deliveries as "From <Sender>:", as the live conversation does (predecessor RD-004).
- **REQ-008: Host label casing.** A collaborator's Team tab shows the host's name in the shared readable format
  ("Research Assistant"), matching VIS-013.
- **REQ-009: Test health.**
  - The architecture boundary guard and the collaborator definition catalog agree: the catalog gets its definition
    services injected, or the guard is updated deliberately with a recorded reason.
  - The model-selection-save failures are root-caused and fixed.
  - Both suites pass.
- **REQ-010: Malformed standalone package (C-14).** Q-4, recommended: **no change**. Principle 6: no supported scenario
  produces a malformed package (atomic writes, a format with no released predecessor, tolerant readers). The
  classification is recorded instead of adding machinery.

## Acceptance Criteria
- **AC-001 (REQ-001):** The predecessors' standalone collaboration tests pass unchanged. These include `@`,
  agent-initiated bring-in, copies, Stop/reopen, host crash, delete and archive, and restart.
  `AgentRunCollaborationRootManager` and `standalone-agent-run-collaboration-binding.ts` no longer exist. Existing
  standalone history and packages open unchanged.
- **AC-002 (REQ-002):** Team-root collaborator tests pass. Collaborator agents are no longer in `memberContexts` or the
  config resolver.
- **AC-003 (REQ-003):** Both files are at or under the limit, with no behavior change.
- **AC-004 (REQ-004):** A standalone collaborator's self-delegation is rejected with that code.
- **AC-005 (REQ-005):** The delivered text contains the sender's full address on every runtime. A reply by address to a
  team-member sender reaches it.
- **AC-006 (REQ-006):** A standalone run with collaborators and copies shows a total that includes them, matching the sum
  of the concrete records.
- **AC-007 (REQ-007):** The "earlier events" page shows "From <Sender>:" for deliveries.
- **AC-008 (REQ-008):** The host label reads "Research Assistant".
- **AC-009 (REQ-009):** Both suites are green, with a recorded root cause.
- **AC-010 (preserved):** Everything in the preserved boundary is unchanged.

## Decisions (resolved 2026-10-02, as recommended)
- **Q-1 (REQ-005):** the exact text. Recommendation: add `sender address: <address>` between name and ID, as above.
- **Q-2 (REQ-006):** should the roll-up also apply to existing standalone runs? Recommendation: yes. The run's saved
  collaboration tree already lists its collaborators' and copies' run IDs, so totals can be computed from it with no new
  attribution data and no migration.
- **Q-3 (REQ-001):** the user-visible behavior stays identical. Recommendation: yes, a pure refactor.
- **Q-4 (REQ-010):** no hardening against malformed packages. Recommendation: yes, no change (principle 6).

## Traceability
- REQ-001→AC-001
- REQ-002→AC-002
- REQ-003→AC-003
- REQ-004→AC-004
- REQ-005→AC-005
- REQ-006→AC-006
- REQ-007→AC-007
- REQ-008→AC-008
- REQ-009→AC-009
- REQ-010→(recorded classification)
