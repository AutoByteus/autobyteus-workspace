# Handoff — Solution Designer → Implementation Engineer

Ticket `collaboration-prompt-wording` — collaboration texts written for the agent.

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording`
- Branch: `codex/collaboration-prompt-wording`, base `origin/personal` `3712cd9bf0`
- Classification: Architecture Design Complete; `task_size=Medium`, `architectural_risk=Low`;
  direct implementation (no independent architecture review; the design was still done in full).
- Origin: the user's direct request in the Solution Designer conversation (2026-10-15). Not a
  Project Task yet; do not ask the Project Task Manager for one.

## Package (read in this order)

1. `tickets/in-progress/collaboration-prompt-wording/requirements-doc.md` — Approved (SR-001).
2. `tickets/in-progress/collaboration-prompt-wording/wording/collaboration-prompt-wording-proposal.md`
   — **the exact text** (behavior-defining, user-approved). Transcribe it word for word.
3. `tickets/in-progress/collaboration-prompt-wording/wording/collaboration-prompt-complete-views.md`
   — what each kind of agent receives, generated from (2) by `build-complete-views.py`; use it as
   the expected result of your rendered-prompt snapshots.
4. `tickets/in-progress/collaboration-prompt-wording/investigation-notes.md` — IN-001..IN-010.
5. `tickets/in-progress/collaboration-prompt-wording/design-spec.md` — role design, file mapping,
   T-3 refusal texts, sequence, validation.
6. `tickets/in-progress/collaboration-prompt-wording/solution-revision-record.md` — SR-001.

Independent review artifacts: `N/A — not applicable` (direct route).

## What to build (summary; the design spec is authoritative)

1. `collaborationRole` (`standalone_agent` | `task_agent` | `team_member` | `org_agent`) decided
   by `resolveMemberCollaborationScope` (+ host builder), stored on `MemberExecutionContext`.
2. One `collaboration-prompt-sections.ts` rendering wording §4.1/§4.2/§5.0–§5.3 by role;
   Handoffs only when the agent has handoff rules; no own address anywhere. Delete the three old
   renderer files and instruction constants.
3. Tool and parameter descriptions per wording §6 (native and MCP share the constants).
4. Task message (§7.1) and received-message headers (§7.2, three builders) without addresses.
5. Refusal/result texts per design T-3.
6. `@` note per viewer (wording §8): viewer relation from each root; contracts compose/parse
   (parse all earlier forms); rebuild the contracts `dist/`.
7. Docs listed in the design (Off-Spine).

## Constraints

- Scope Guardrail in the requirements: text and the two internal facts only; no tool behavior,
  exposure, storage or migration change. A wording change you find necessary returns to the
  Solution Designer before you make it.
- TESTING.md: worktree build; never the user's running app or `~/.autobyteus`; test-owned data
  roots; AC-008 on an isolated desktop instance with a real model.
- Commit only on the ticket branch; do not merge or push to `personal`.
