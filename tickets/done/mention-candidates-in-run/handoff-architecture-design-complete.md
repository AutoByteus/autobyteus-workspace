# Handoff — Architecture Design Complete (direct implementation route)

- Result: `Architecture Design Complete`
- Package: `mention-candidates-in-run`; solution revision `SR-001`
- task_size `Medium`, architectural_risk `Low` (design-spec.md § Task Size And Architectural Risk)
- Route: `get_handoff_rules` matched "Small or Medium and architectural_risk=Low" → `/implementation_engineer` (direct; independent architecture review not applicable)

## Original request
The user cannot `@`-mention Agent Package Creator in a run where it is already a collaborator, after the API/E2E engineer's agent-initiated
`send_message_to` added it (verified read-only in the stored team tree). Since mention-delegation-dismissal (v1.4.95-beta.6) `@` means
"delegate", but candidates still exclude in-run definitions. The menu copy still says "Bring into this run".

## Approval
Requirements `Approved` SR-001 (REQ-001..006, AC-001..008), user 2026-10-06 ("Yes, approve..."). Recorded clarification: the run's own definition stays excluded.

## Artifacts
- /Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/solution-revision-record.md
- Independent architecture review artifacts: N/A — not applicable (direct route)
- Supplements: N/A — not applicable

## Workspace
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run
- Branch: codex/mention-candidates-in-run
- Base: origin/personal @ f48dbfbf3; finalization target origin/personal

## Scope summary
Policy split (`requireEligible` for `@`, `requireAdmissible` kept for bring-in); `listCandidates` without the in-run filter; `resolveMentions` sets `inRun`;
note contract (`inRun`, ", already in this run" suffix, conditional in-run guidance, tolerant parser); web draft mirror (own definition only);
en/zh-CN copy; docs. Out of scope: per-focused-agent exclusion, menu badges, prompt wording, bring-in behavior.

## Risks / expected next action
Residual: a focused member may see its own definition. Next: implementation with implementation-scoped checks, then the configured validation route.
