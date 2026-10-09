# Handoff: Architecture Design Complete

- Package identifier: `delegated-copy-member-contact-delegator`
- Result classification: `Architecture Design Complete`
- Current solution revision: `SR-006`
- Date: 2026-10-09
- From: `/software_engineering_team/solution_designer`
- Route applied: handoff rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`

## Original Request

Project Task `project_task_a7fe75d1-31a4-4819-9706-59a76aaa1dc2`, delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). Members of a delegated team can't reach the agent that delegated the work: the Project Task Manager (PM) is missing from their `@` menu, and they don't know its address. Explain the cause, settle the contact rule with the user, implement it, and cover it with tests. The user verifies in the desktop app.

Reference screenshot: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_a7fe75d1-31a4-4819-9706-59a76aaa1dc2/context/ctx_db53e6342739__9.png`

## Cause (Summary)

`@` candidates, the send-time `@` re-check and `list_available_agents` exclude "the root's own definition". The Agent-run port is built per root, not per viewer. So the host's (PM's) definition is excluded for every agent in the run, not only for the host. The earlier `mention-candidates-in-run` ticket kept the exclusion deliberately for the host and deferred per-focused-agent exclusion. Address messaging to the host already reaches the existing run.

## Approved Scope (user approval 2026-10-09, SR-005)

In the standalone Agent run only. No Team/Org change. No system-prompt or work-packet change.
1. REQ-001: the `@` menu shows the host (PM) to every agent in the run except the host.
2. REQ-002: an `@` of the host from a non-host agent resolves to the existing host at its address; never a new instance.
3. REQ-004: the note in the message explicitly says to use `send_message_to` with the host's address and offers no `delegate_task` for that entry.
4. REQ-003: `list_available_agents` lists the host at its address for every caller except the host.
5. REQ-006: `send_message_to` to the host address from a copy member reaches the existing host run (preserved; regression guard).

## Classification

- `task_size`: Medium (about 14 production files in 3 existing packages; existing owners)
- `architectural_risk`: High. Shared contract changes: `MentionedCollaborator.inRun` → `presence` plus note wording (server compose / web parse, saved notes must still parse), and the GraphQL `collaboratorMentionCandidates` gains `focusedAgentRunId`. The new host placement feeds Agent-root address, bring-in and catalog-copy paths (analysed as behavior-neutral, A-02/A-03).

## Artifacts (absolute paths)

- Requirements (Approved, SR-005): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/requirements-doc.md`
- Investigation notes (F-*, A-*): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/design-spec.md`
- Solution revision record (SR-001..SR-006): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/solution-revision-record.md`
- Supplements: none. Product Design: `N/A — not applicable`. Prior review artifacts: `N/A — not applicable`.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator`
- Branch: `codex/delegated-copy-member-contact-delegator`
- Base: `origin/personal` @ `a573465d93bf66976c0bc0041e757d418e21ecb4`
- Finalization target: `origin/personal`
- Ticket artifacts are uncommitted in the worktree (no commit requested yet)

## Key Design Decisions (see design-spec.md)

- D-1/D-2: `standaloneRootCollaboratorPortFor(tree, launch, viewerAgentRunId)`. The host is always an in-run placement with the new top rank `run_agent`. `ownDefinition()` (renamed from `rootDefinition()`) is the host definition only when the viewer is the host. The policy logic is unchanged and has no root-kind or viewer branches.
- D-3: `CollaboratorAdmission.resolveMentions` sets `presence` (`not_in_run` / `in_run` / `run_agent`). The note contract's `guidanceFor(entries)` adds "Use send_message_to with recipient_address <address> to message <name>; delegate_task cannot target it." per `run_agent` entry. Guidance for notes without `run_agent` entries is identical to today's.
- D-4: GraphQL `focusedAgentRunId` (required for `agent` roots). The web Agent-root scope carries it. The cache is keyed per focused agent for Agent roots, and invalidation clears all of a root's keys.

## Open Risks

- Catalog-address stability across viewers must be pinned by a test (A-03).
- `list_available_agents` is opt-in per agent (A-11).
- The agent may still try `delegate_task` to the host; that is refused harmlessly.

## Expected Output

An independent architecture review of `design-spec.md` against the approved requirements. On Pass, continue with the reviewer's configured route. Return findings on requirements or design to Solution Designer.
