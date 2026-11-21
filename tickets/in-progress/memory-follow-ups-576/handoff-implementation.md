# Handoff: Architecture Design Complete → Implementation (direct route)

- Package: `memory-follow-ups-576` (Project Task autobyteus-576)
- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Requested by: `/project_task_manager`, for the founder
- Date: 2026-11-21
- Result: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=Low`; direct route (rule "Small/Medium and Low → `/implementation_engineer`")
- Classification rationale: six small changes in existing owners; no contract, persistence or ownership change; FU-009 corrects a naming threshold before any release (design-spec).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-follow-ups-576`
- Branch: `codex/memory-follow-ups-576`, from `origin/personal` @ `61fd6f41f7`; the ticket documents are uncommitted.
- Finalization target: `origin/personal`

## What to build (design-spec "Intended Change And Per-Item Design")

1. **FU-009 first:** the folder-name threshold becomes 255 bytes (it blocks the next release).
2. **FU-008:** the Antigravity and Grok probes check whether the child has already exited before reporting a time-out.
3. **FU-005:** real timers are restored before `app.close()`.
4. **FU-006:** SM-12 uses a file at the folder's path instead of `chmod`.
5. **FU-003:** one helper for runnable workspace kinds; the skill loader unregisters a registration that resolves after unmount.
6. **FU-002:** relative Markdown links open a preview tab in the same workspace.
7. **FU-007:** reproduce first, then fix the test wait. If the cause is in product code, stop and return it as a Design Impact.
8. **FU-004:** waits for the founder (DEC-004). With his recommended answer (a), there is no code to write.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, all in this ticket folder. The evidence of the follow-ups is in `tickets/done/semantic-memory-for-every-agent/` (`follow-ups.md`, `evidence/`).

## Gates

- Release only on the founder's word.
- No change to his data.
