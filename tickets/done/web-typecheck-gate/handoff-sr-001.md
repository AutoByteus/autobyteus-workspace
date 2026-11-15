# Handoff SR-001: Architecture Design Complete (direct implementation)

- Package: `web-typecheck-gate`, Project Task `autobyteus-workspace-9` (project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`), FU-003 of `autobyteus-workspace-7`. URGENT: every desktop release build of personal is blocked.
- Requested by: `/project_task_manager` (run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`)
- Classification: `Architecture Design Complete`, `task_size` Small, `architectural_risk` Low → route: direct implementation (handoff rule: Small/Medium + Low → `/software_engineering_team/implementation_engineer`)
- Approval: requirements approved by the Solution Designer within the Task's direction (user informed), SR-001; design approval not required
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate`, branch `codex/web-typecheck-gate`
- Base: `origin/personal` @ `742de88c2b386d4722508eb5f99bef94133c4537`; finalization target `origin/personal`, merge `--no-ff`; **no release**
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/`

## Original request (Task text, summarized faithfully)

`pnpm -C autobyteus-web typecheck` fails on origin/personal (742de88c2) and on 3d738de6e: `tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts(67,46)` lacks `workspaceSkills`, which autobyteus-460 made required. DO: (1) reproduce, fix with the smallest correct change, without weakening types or silencing the error; (2) run every typecheck the release/desktop build runs, fix nothing else unless a one-line same-cause fix, and list anything else; (3) find why autobyteus-460's delivery did not catch it and close that gap in the repo's guide/gates; (4) tests and typechecks green, merge-ready, no release. Work in an isolated worktree; do not touch others' uncommitted work.

## What was found

- Reproduced (`evidence/INV-01`): one test-file error over the baseline (94 in 41 vs 93 in 40).
- Fix, proven by a temporary probe that was then reverted (`evidence/INV-04`): `workspaceSkills: createTestRunWorkspaceSkills({ runId })` from the existing server fixture, plus its import → PASS at 93 in 40. The test passes 2/2 with and without it (`INV-05`).
- Other release type checks on the base: server typecheck PASS at baseline (`INV-02`), web guards pass (`INV-03`). Nothing else fails. `autobyteus-message-gateway` is in no release build (observation only).
- Why 460 got through: TESTING.md chooses checks by the changed package. 460 changed no `autobyteus-web/` file (0 of 171), so its roles ran only the server typecheck (IMP-01, IMP-12, API-09). Since autobyteus-318, though, the web typecheck compiles the server's source too. Delivery audits evidence and reruns only what the guide names. There is no pre-merge CI, so the release build was the first web typecheck after the merge.
- Gate fix (DEC-002): a TESTING.md rule saying every TypeScript change runs both typechecks, plus the Web typecheck row and Rerun-by-impact step 5 wording. The exact text is in design-spec.md, "Concrete Examples".

## Expected work for implementation

1. Commit A (baseline fix, TESTING.md rule 9): the 2-line test change, exactly as in design-spec.md.
2. Commit B: `docs(testing): run both typechecks for every TypeScript change` (TESTING.md only).
3. Run on the head: `pnpm -C autobyteus-web typecheck` (AC-001: PASS, 93 in 40, baseline file unchanged), the test file (AC-003), `pnpm -C autobyteus-server-ts typecheck` and the three web guards (AC-004). Node 22.
4. API/E2E then runs TESTING.md's Fresh-start build (AC-006, DEC-005).

## Constraints

No production, type, baseline, script, `tsconfig` or workflow change. No cast or `@ts-*` comment. Stage paths explicitly (untracked SDK `dist/` folders exist). No release.

## Open risks

RSK-001: the rule is documented, not enforced by a machine (CI would be the user's decision). Follow-up FU-001 (non-urgent, RELEASE.md path) is sent by the Solution Designer when the ticket leaves the team.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/INV-01…05`, all in the ticket folder.

## Route recorded

Sent to `/software_engineering_team/implementation_engineer` (rule: Architecture Design Complete, Small/Medium + Low).
