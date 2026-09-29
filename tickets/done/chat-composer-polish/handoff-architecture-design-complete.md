# Handoff — Architecture Design Complete — chat-composer-polish

- Result: `Architecture Design Complete`
- Package identifier: `chat-composer-polish`
- Current SR: `SR-003`
- Classification: task_size `Medium`, architectural_risk `Low` (rationale in design-spec.md, "Task Size And Architectural Risk")
- Route selected by handoff rules: direct implementation → `/implementation_engineer` (the Small/Medium + Low rule matched; the Large/High review rule and the delivery-gap rule did not match)
- Independent architecture review artifacts: `N/A — not applicable` (direct route)

## Original Request (user, 2026-09-29, new-chat composer)

1. Thinking menu: picking a reasoning effort (e.g. "Medium") leaves "Thinking enabled: Off". The user has
   to pick an effort *and* "On". Picking an effort should enable thinking.
2. The workspace menu cannot be searched by typing.
3. The composer input box sits slightly too high on the new-chat page.

The user delegated the aesthetic decisions to the Solution Designer and approved the resulting baseline
with "go".

## Goals / Approved Behavior (summary; requirements-doc.md is authoritative)

- Merged chat thinking list for switch-bearing schemas: `Off · <effort levels>` (or `Off · On`), with
  exactly one checked item. The trigger shows "Off" / level / "On", and the bulb is muted when off.
  Other dependent settings (budget, display) sit in a secondary section and also auto-enable thinking.
- The same auto-enable rule applies to the run-config form's Advanced fields.
- Workspace menu search (model-menu styling; name/path filter; empty state; ArrowDown/Enter/Esc).
- New-chat composer bias `pb-[14vh]` → `pb-[6vh]`.
- Preserved: non-switch schemas (OpenAI, Grok, Gemini, GLM, Kimi, Opus 5.5 API) keep their current menu
  behavior and stored values; one-click Off; workspace selection / open-folder flow.

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/solution-revision-record.md`
- Supplements: None. Product artifacts: N/A — not applicable.

## Approval Basis

- Requirements approved by the user ("go", chat, 2026-09-29) on the SR-002 content (REQ-001–009 incl.
  REQ-001a, AC-001–010).
- Approval authorizes the requirements basis only. Repository finalization belongs to delivery, after explicit
  user verification.

## Workspace Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable`
- Branch: `codex/thinking-selector-auto-enable`
- Base: `origin/personal` @ `c8c7351e5`
- Finalization target: `personal`
- Ticket docs are uncommitted in the worktree at `tickets/in-progress/chat-composer-polish/`.

## Scope / Constraints

- Frontend only (`autobyteus-web`). No server, schema or persistence changes.
- All thinking-key transitions go through `utils/llmThinkingConfigAdapter.ts`. See the design spec's
  "Concrete Examples / Shape Guidance" and "Change / Refactor Sequence" for exact shapes, file list and tests.

## Open Risks

- Existing server behavior: a stored `reasoning_effort` is still sent to the Claude SDK while thinking is
  off. This is unchanged and out of scope (possible follow-up).
- `ModelConfigSection` is shared by several editors. Keep their existing specs green; automatic
  default/sanitize writes must not auto-enable thinking.
- The 6vh offset will be fine-tuned during user verification (AC-009).

## Scenario Evidence

SCN-001–004 are all `Supported Normal Scenario`, backed by the user's screenshots and reports. No
evidence uncertainty beyond the exact vertical offset.

## Expected Output

Implementation per the design spec, implementation-scoped checks (web unit tests for the adapter, chat
components, chat helpers and ModelConfigSection; a rendered check of the new-chat page), and
`implementation-handoff.md` in the same ticket folder. Continue the team's downstream flow afterwards.
