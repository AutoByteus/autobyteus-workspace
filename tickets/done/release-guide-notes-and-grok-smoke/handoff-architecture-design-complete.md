# Handoff — autobyteus-355: Architecture Design Complete (Small / Low, direct implementation)

- Task: `autobyteus-355` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), "RELEASE.md and the release smoke check …"; requested by `/project_task_manager`. The user agreed on 2026-11-01 (quote in `requirements-doc.md`).
- Result: `Architecture Design Complete`, SR-001; `task_size: Small`, `architectural_risk: Low` (guide text plus test tooling; no product code).
- Approval: requirements approved by the Solution Designer within the direction, user informed. User approval of the design: not required.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-guide-notes-and-grok-smoke`, branch `codex/release-guide-notes-and-grok-smoke`, base `origin/personal` @ `efd28d5c4a`, target `personal`.
- Ticket folder: `…/tickets/in-progress/release-guide-notes-and-grok-smoke/`

## What to build (design-spec.md D-1..D-4)

1. **RELEASE.md and `.github/release-notes/template.md`:** the "What you need to do" rule and the post-workflow `gh release edit` step (D-1). The user must see the final wording, so keep it short and exact.
2. **Live suite:** a per-runtime model check in `describe.each`, `chooseLiveModel` (Grok fallback to the first offered model; overrides strict), and per-runtime `SKILL_LINKS_LIVE_MODEL` lines (D-2).
3. **`release_smoke.py`:** per-runtime models and per-runtime suite-error attribution, plus unit tests (D-3).
4. **Proof without tokens:** a fake Grok ACP CLI (`scripts/tests/fixtures/fake-grok-acp.mjs`) and the runs (a) and (b) of D-4. Start from the reproduced probe `investigation-probe-nested-beforeall.test.ts.txt`.

## Constraints

- No release.
- Spend no tokens: Claude and Codex stay disabled in the proof runs.
- Never print keys.
- Keep the test titles and per-runtime `describe` titles unchanged.

## Documents

- `handoff-architecture-design-complete.md`
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `investigation-probe-nested-beforeall.test.ts.txt`

## Route record

- `get_handoff_rules` (2026-11-01): "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
