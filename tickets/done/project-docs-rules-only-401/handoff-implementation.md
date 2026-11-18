# Handoff — autobyteus-401 → Implementation

- Result: `Architecture Design Complete`; `task_size = Small`, `architectural_risk = Low`. Route: the rule for Small/Medium with Low → `/software_engineering_team/implementation_engineer` (rules read 2026-11-06).
- Package: `project-docs-rules-only-401`, SR-001.
- Task: autobyteus-401, requested by `/project_task_manager` for the user.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-docs-rules-only-401`.
  - Branch: `codex/project-docs-rules-only-401`.
  - Base: `origin/personal` `6324fb056d`. Docs only, no install needed. No release.
- Ticket folder: `tickets/in-progress/project-docs-rules-only-401/` in the worktree.

## Original request (summary)

The project documents (DESIGN.md, RELEASE.md, TESTING.md) are project-level rules, not "a per-case logging file" (the user, 2026-11-06).
- Move RELEASE.md's release stories into their release records.
- Keep the rules they taught.
- Fix the links.
- The user added: "so the RELEASE.md will reference that file if they want to read the details, right?" So a rule keeps a one-line pointer to the record where it helps.

## What to do

`design-spec.md` § The Edits (E-1..E-8) and § Change / Refactor Sequence.

- **Docs only:** don't change any rule's meaning.
- **Records:** append-only, under a clearly labelled heading.
- **TESTING.md:** unchanged.
- **DESIGN.md:** only rule 12's example line changes; design cases stay.

## Acceptance

AC-001..AC-005 in `requirements-doc.md`.

## Follow-ups

None.
