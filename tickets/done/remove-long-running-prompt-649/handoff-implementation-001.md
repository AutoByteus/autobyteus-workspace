# Handoff — Architecture Design Complete (remove-long-running-prompt-649, SR-002)

- From: Solution Designer, 2026-11-25 · To: `/implementation_engineer`
- Task: Project Task `autobyteus-649` (delegated by `/project_task_manager`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-long-running-prompt-649`, `codex/remove-long-running-prompt-649`; base `origin/personal` @ `bc4351cad7`; finalization target `origin/personal`. Ticket documents are uncommitted in the worktree.
- Classification: `task_size` Small, `architectural_risk` Low → direct implementation route (no architecture review).

## Package (`tickets/in-progress/remove-long-running-prompt-649/`)

- `requirements-doc.md` — Approved by the founder 2026-11-25 (verbatim there)
- `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`

## What to do

Remove the "Long-Running Commands" section from every runtime's system prompt, clean cut: delete `long-running-command-sections.ts`, the composer input and native append, the ACP profile field and the values/arguments in the Claude, Codex, Antigravity, ACP, Grok and DeepSeek backends; update the 18 test files (incl. the snapshot) and `docs/modules/prompt_engineering.md`; add "no Long-Running Commands" assertions to the composer and backend prompt tests; one live prompt check on one runtime (AC-002). Do not touch 483's 2-hour limits or background-task end-reason work.

Already done by the Solution Designer (not code): the founder-approved best-practice note `/Users/normy/.autobyteus/server-data/memory/semantic-global/best-practice-long-running-commands.md` (REQ-003).
