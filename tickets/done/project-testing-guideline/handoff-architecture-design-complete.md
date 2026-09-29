# Handoff — Architecture Design Complete

- Package: `project-testing-guideline` — SR-007 (dialog model revision after ARCH-REV-003 pass on SR-006) — task_size `Medium`, architectural_risk `High`
- Original request (2026-09-29): write the AutoByteus workspace's own testing guideline at the repository root (team skills are being made project-neutral by their maintainers via a separate request), and add native JavaScript dialog handling to browser-automation.
- Approval: requirements Approved at SR-007 (SR-004 user approval; DEC-007 agent-decides dialog model chosen under explicit user delegation; DEC-006 superseded).
- Key constraints: no new MCP tools; optional `--dialog`/`--prompt-text` on run-script/navigate only; no hard-coded answer for the agent; existing outputs unchanged unless a dialog occurred; no new Python dependency; `TESTING.md` links rather than duplicates; skills in autobyteus-agents out of scope.
- Evidence: probes P-D1..P-D3 (investigation-notes §SR-003; `evidence/page.html`, `evidence/cdp2.mjs`).

## Artifacts

- /Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/solution-revision-record.md
- Prior review artifacts: design-review-report.md, architecture-review-revision-record.md (ARCH-REV-001 on SR-005). Product Design: N/A — not applicable.

## Workspace

- autobyteus-workspace: worktree above, branch `codex/project-testing-guideline`, base `origin/personal` @ 39e512edd; finalization target `origin/personal`.
- autobyteus-mcps: `/Users/normy/autobyteus_org/autobyteus_mcps` (`main` = `origin/main` @ 6b39562); create a task worktree/branch at implementation; finalization target `origin/main`.

## Risks

- Heuristic PAGE_BLOCKED; 8 s connect bound; Electron dialog delivery via context `dialog` event (escalation triggers in design-spec).

## Routing Record

- SR-005 (2026-09-29): get_handoff_rules applied — Architecture Design Complete, Medium/High, requirements approved (SR-004) → `/architecture_reviewer`. Non-matching: direct implementation (needs Low risk); delivery receipt (N/A).
- SR-006 (2026-09-29): get_handoff_rules applied — revised package, Medium/High, requirements approved → `/architecture_reviewer` (re-review: ARCH-DR-001/002, never-answer model).
- SR-007 (2026-09-29): get_handoff_rules applied — revised package, Medium/High, requirements approved → `/architecture_reviewer` (narrow re-review of DEC-007). Implementation engineer notified to hold the dialog part.
