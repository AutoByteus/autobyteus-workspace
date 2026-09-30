# Handoff Summary — remove-skill-access-mode

## Status

- Stage: Delivery round 1 (DR-001). The package is merged with the latest `origin/personal`, checked and docs-synced. **Waiting for user verification.** Nothing is pushed, merged into `personal`, archived or released.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`, route `Reviewed`.
- Reviews and validation: `ARCH-REV-003` Pass, `CRR-002` source review Pass, `API-REV-001` API/E2E Pass (95%), `CRR-003` test-code review Pass with no findings.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode`
- Ticket branch: `codex/remove-skill-access-mode` at `56817443b` (local only)
- Finalization target: `personal` (remote `origin`)

## Integrated State For Verification

- Bootstrap base: `origin/personal@57df63f07`. Fetched on 2026-09-30 at delivery start: advanced by 7 commits to `5c6fb95ea` (chat-composer-menus-open-upward and the `v1.4.92-beta.2` bump).
- Integration method: merge of `origin/personal` into the ticket branch, no conflicts, no file touched by both sides.
- Commits on the ticket branch:
  - `049c54419`, `f85525ce5`, `cf401a563`, `1595b8b2c`: the reviewed implementation.
  - `615a62770`: delivery checkpoint with the two API/E2E test changes and the ticket artifacts.
  - `6920ea67e`: merge of `origin/personal@5c6fb95ea`.
  - `56817443b`: delivery docs sync (three server module docs).
- Uncommitted: only this round's delivery artifacts in this folder.
- Excluded untracked build output: `dist/` under the three application SDK packages, the devkit and the two bundled applications.

### Delivery checks (2026-09-30, on the merged state)

| Check | Result |
| --- | --- |
| `pnpm -C autobyteus-web exec vitest run components/chat composables/popover --no-watch` (the web code that came in with the merge) | 8 files, 53/53 pass |
| `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts --no-watch` | 2 files, 3/3 pass |
| Server unit: record tolerance, frozen released shapes, team planner, AGY capsule | 4 files, 46/46 pass (`delivery-evidence/delivery-focused-server-vitest.log`) |
| `pnpm build:electron:mac` with the web-boundary and localization guards and the server build | exit 0 (`delivery-evidence/delivery-electron-build.log`) |
| Search of the merged tree for the removed field | Only the frozen released migrations, their fixtures and tests, the tolerance tests and the historical notes in docs |
| Why no full-suite rerun | The merge brought only web chat-menu files, docs and ticket folders; none overlap the ticket's files. The full suites were compared against base in API-REV-001 with 0 branch-only failures. |

## What Changed (user-facing)

- **No run-level skill setting.** A run gets the skills of its agent definition; a team member gets the skills of its own agent definition. The field is removed from the server, all runtime backends, GraphQL, the web client, the application SDK and both stream-contract packages.
- **Old run history still opens.** A stored value is ignored on read and is not written again. No data migration.
- **Released migrations behave as before**, through two frozen files under `app-data-migrations/legacy/`.
- **Daily Assistant has `read_file`**, and every built-in agent is overwritten from its template at each server start. Edits to a built-in agent do not survive a restart (approved as DEC-002).

## How To Verify (suggested)

1. Quit any running AutoByteus, then open the local build (User Verification below). Delivery did not launch it and did not check which data folder it opens. If it opens your normal data folder, it will reset any edits you made to built-in agents, and runs you save with it lose the stored skill-access value.
2. **Old history:** open a run and a team run created before this change. Both should load and continue normally.
3. **Skills:** start a run with an agent that has configured skills and one that has none. The first can use its skills; the second has none. No launch form shows a skill-access choice.
4. **Daily Assistant:** start a New chat and ask it to read a file in the workspace.
5. **Built-in reset:** edit Daily Assistant in the agent editor, restart the app, and confirm the edit is gone. This is the approved behavior; say so if you want it changed.

## Residual Risks / Observations

- **Breaking for mixed versions.** A web client or custom application that still sends the field is rejected by the new server. The design relies on the web client and server shipping together, which the desktop app and the Docker image do.
- **Not validated:** the ACP runtime live, and the packaged desktop app at runtime. The package below builds; it was not launched by delivery.
- **Record gap (owner `/solution_designer`):** the requirements' "Persisted data affected" line and the design's persisted-data section do not name the AGY capsule `manifest.json`. The code handles it and a unit test covers it. No behavior change.
- **Failures that are the same on base (separate-ticket candidates):** three tests in `team-run-v1-production-upgrade.e2e.test.ts`; the gated `agent-runtime-graphql.e2e.test.ts` suite at setup; 16 of 19 `tests/e2e/run-history` tests; 7 of 10 `hierarchical-team-run-config-graphql` tests.
- **Processes left running, not started by delivery:** vitest workers pid 27881 and 38258 (this worktree) and 21473 and 38268 (`/private/tmp/rsam-baseline`), each at about 97% CPU since 08:13–08:30, plus an idle `pnpm exec vitest` pair (85732, 85733). No team member has claimed them, so delivery did not stop them. The two in this worktree will block worktree removal at cleanup; they need the user's go-ahead to be stopped.
- The live runtime checks left small Codex / Claude / AGY sessions in the user's CLI session stores.

Rejected items go to `/solution_designer`.

## User Verification

- Status: **Pending.**
- **Test build (2026-09-30, from `56817443b`):** a local unsigned macOS ARM64 build made with `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac`.
  - App: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - Installer: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.92-beta.2.dmg` / `.zip`
  - The file name says `enterprise` because the branch is not `personal`. The version string is the base's `1.4.92-beta.2`; it is not a new release.

## Release

- Not started. `release-notes.md` is ready. A release runs only if the user asks for one after finalization.
