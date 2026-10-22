# Handoff — Implementation — remote-run-title (autobyteus-269)

- From: Solution Designer, 2026-10-22. Classification: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low`. Route: direct implementation (no architecture review), with implementation checks, API/E2E and the later reviews.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-run-title`, branch `codex/remote-run-title`, base `origin/personal` `33171e1385`. Finalization target: `origin/personal`. No release unless the user asks. The user checks it on his Docker node (AC-605).
- The bug: a run that a peer node starts by delegation has no history title, so the sidebar shows "New - <name>". It was reproduced on two isolated servers (`investigation-notes.md` F-03, `evidence/reproduction-history-titles.json`).
- Approval: requirements `Approved` at SR-002 by the user. The rule is "the title is the content of the run's first message, whoever sends it". There is no migration for existing runs.
- Documents (in `tickets/in-progress/remote-run-title/`):
  - `requirements-doc.md`
  - `investigation-notes.md`
  - `design-spec.md`
  - `solution-revision-record.md`
  - `follow-ups.md` (empty)
- Classification rationale: one trigger in `RemoteMessageReceiver`, one by-ID method on each run service, composition, tests and docs. No contract, persistence or security change.
- Environment note: the worktree already has `pnpm install` and `test:integration:prepare` done (the server `dist` is built). The two-server E2E runs as its header says.
- Expected output: the implementation, its checks and `implementation-handoff.md`.

## Round 2 — 2026-10-22 (SR-004), answering CRR-001 (Design Impact)

- The server change `05be574608` stands; no rework.
- New window work: design § Window Title Rule. The stored title wins in the sidebar merge and the conversation header, and the live first message fills only an empty stored title. Stored titles are cleaned of the skill instruction through `skillRequestInstruction`'s single-line form, so user-started rows read as today.
- Please correct your own handoff's Assumption 3 ("a work packet is a system_task_notification") and the Known Risk.
- Validation: the window unit tests, plus a durable browser probe of the sidebar rows (peer-started Agent and Team, active and after a reload; user-started with and without a skill tag).
