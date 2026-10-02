# Solution Handoff — Agent Work Request Prompt

Outcome: Architecture Design Complete. task_size: Small. architectural_risk: Low. Package agent-work-request-prompt; SR-001; approved requirements R1.

## Request and approved result
User wants a concise platform-wide rule: receiving assigned work activates own instructions/skills; no casual acknowledgements/promises instead of work; communicate at instruction/skill-defined handoff points or genuine blockers; follow applicable rules, otherwise return result/blocker to requesting agent. Applies to Team/Org and ad-hoc collaborators without inventing cross-team rules. User explicitly approved implementation: “i agree. lets do the update. i think its simple. lets go”.

## Workspace and finalization
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt
Branch: codex/agent-work-request-prompt
Refreshed base: origin/personal @ 07023b9152c60d67095be192df3cb5a647cdbf74
Integration target: personal. No release requested. Shared checkout and unrelated untracked files untouched. Earlier no-worktree instruction concerned read-only investigation; required isolated workspace was created for authoring and communicated to user.

## Scope and implementation guidance
Use existing canonical collaboration contract for one shared paragraph projected by Team and standalone renderers. Align send_message_to descriptions, rename Ordinary Communication heading, and resolve contradictory no-rule finish wording for agent-requested work. Preserve runtime routing, schemas, selectors, scopes, notifications and skill-defined approval/intermediate stages. Do not edit individual skills or broaden to a message-intent protocol.

## Verification and risk
Focused existing prompt-contract/composer/tool tests and semantic assertions; sync docs example. API/E2E should validate actual prompt/tool projection. Model execution compliance requires real-provider evidence to claim; static wording alone does not prove the incident fixed. No tests executed by designer, no implementation done. Failed original trace unavailable, not a blocker to approved prompt clarification.

## Cumulative package
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt/tickets/in-progress/agent-work-request-prompt/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt/tickets/in-progress/agent-work-request-prompt/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt/tickets/in-progress/agent-work-request-prompt/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt/tickets/in-progress/agent-work-request-prompt/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-work-request-prompt/tickets/in-progress/agent-work-request-prompt/prior-investigation.md

Review artifacts: N/A — not applicable to classified Small/Low direct route. Product artifacts: N/A. No open requirements decision or implementation blocker.
Next action: implement bounded update, run implementation-scoped checks, then follow applicable validation/delivery rules. Route pending get_handoff_rules.

Routing decision: get_handoff_rules matched Architecture Design Complete + Small/Low. Selected direct implementation recipient `/implementation_engineer`; independent architecture review N/A. Implementation self-checks and executable validation still required.
