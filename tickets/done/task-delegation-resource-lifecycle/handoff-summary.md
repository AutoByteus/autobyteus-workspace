# Handoff Summary — task-delegation-resource-lifecycle

## Status

- Delivery state: **User verified on 2026-09-29** after testing the worktree desktop build (`electron-dist/mac-arm64/AutoByteus.app`, 1.4.91-beta.8) against real data: "I think the task is done, let's finalize and release a new beta version". The ticket is archived, finalized into `personal` and released as a new beta; see `release-deployment-report.md` for the final state.
  - **R-4:** the user tested the shut-down `offline` presentation on real data and declared the task done. Delivery records this as acceptance of the standard `offline` label. A distinct label later would be a new requirement for the Solution Designer.
  - **Orphaned web files** (`TeamReferenceFileViewer.vue`, `utils/teamReferences/referenceFilePresentation.ts`): the user gave no separate instruction and asked to finalize directly, so delivery applies its stated recommendation (a): not changed in this ticket, recorded as a follow-up.
- Classification (unchanged by delivery): `task_size=Large`, `architectural_risk=High`. Route: reviewed (Solution Designer → Architecture Review → Implementation → Code Review → API/E2E → test-code review → Delivery).
- Review chain on the final candidate:

  | Stage | Revision | Result |
  | --- | --- | --- |
  | Requirements / design | SR-007 (with SR-002) | User-approved 2026-09-29 |
  | Architecture review | ARCH-REV-005 | Pass |
  | Implementation | IR-004 | — |
  | Source review | CRR-005 | Pass, 9.4/10 |
  | API/E2E | API-REV-002 | Pass, confidence 94.7% |
  | Test-code review | CRR-006 | Pass |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle` |
| Ticket branch | `codex/task-delegation-resource-lifecycle` (local only, not pushed) |
| Finalization target | `origin/personal` |
| Reviewed candidate | IR-004 on `origin/personal@8f57d16d1` (was uncommitted) |
| Delivery checkpoint commit | `a7bd0548d`: the whole reviewed candidate, excluding the untracked SDK `dist/` directories |
| Integrated base | `origin/personal@8c474e37a` (7 commits: `TESTING.md` guideline ticket, doc links, web version bump to 1.4.91-beta.8). Merge commit `743af3a7c`, no conflicts, no file overlap with the ticket |
| Delivery-owned uncommitted changes | Docs sync (22 files), removal of 4 stale tracked `dist` files, ticket delivery artifacts |
| Re-fetched before this summary | `origin/personal` is still `8c474e37a` |

## What Changed (for you)

1. **`delegate_task` is a pure spawn.** It returns `{target_agent_run_id}`, or `{target_agent_run_id: null, message}` when nothing started. Parent and child then talk only through `send_message_to` with run IDs. Removed:
   - `submit_task_result` / `review_task_result`;
   - task records and task status;
   - the task GraphQL/REST APIs;
   - the Tasks UI.
2. **Idle shutdown.** A quiet child is shut down after the grace period (default 10 minutes; server setting `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`, range 60 000–86 400 000 ms). It stays in the tree and shows as **`offline`**. An agent waiting on a tool approval is never shut down.
3. **Wake-on-message.** A same-root message to a child's run ID (from an agent or from your composer) restores it with its conversation, then delivers. Cross-root messages never wake a child.
4. **Persistence.** No data migration:
   - execution trees are read tolerantly and written exactly, with no version field;
   - `delegatorAgentRunId` is optional: new children show "Started by …", old children show nothing;
   - old task-records files stay on disk, unread;
   - released migrations use frozen strict copies of the old formats.
5. **Docs** (delivery):
   - Design step 12 module docs, plus every other long-lived server and web doc that described the removed model (22 files; see `docs-sync-report.md`).
   - The DEC-008 data-migration guideline change is brought in from the `data-migration-guideline-refresh` worktree and will be committed with this ticket, as `design-spec.md` › "Project practice (user direction, DEC-008)" records you decided. The handoff message mentioned a follow-up ticket; the design spec records that you decided against one, so delivery followed the design spec.
6. **Packaging** (delivery):
   - The tracked contract-package `dist/` output is committed, including the new `team-task-execution-message-dtos.*`.
   - The 4 stale tracked `dist/team-task-message-dtos.*` files, whose source this ticket removed, are deleted. Nothing imports them.
   - The untracked `dist/` directories in `autobyteus-application-sdk-contracts` and `autobyteus-application-backend-sdk` are not committed.

## Validation Evidence

- **API/E2E (API-REV-002):** live on AutoByteus, Codex and Claude, on Team and Org roots, through both startup entrypoints, and in the real packaged desktop app. On a copy of installed data, all 1,324 tree and records files were unchanged at startup.
- **Delivery reruns on the integrated state `743af3a7c`** (sanitized env `/tmp/tdrl-api-e2e/senv.sh`; logs in `delivery-evidence/`):
  - `pnpm install --frozen-lockfile`: pass. `prepare:shared` and Prisma generate: pass. Server `tsc --noEmit -p tsconfig.build.json`: clean.
  - All 81 server test files the ticket added or changed:
    - 72 passed, 3 skipped (live suites without flags), 6 failed.
    - All 6 failing files are in the API/E2E r3 baseline failure lists. All 34 failing tests are in the r3 failing-test set, so there are 0 regressions (`failed-tests-not-in-r3-baseline.txt` is empty).
  - All 53 web spec files the ticket added or changed: 53/53 files, 513/513 tests.
  - Contract packages rebuilt: no `dist` drift.

## Verification Requested From You

1. **R-4, the shut-down label (required confirmation).** A delegated agent that was shut down for idleness shows the standard grey **Offline** status. That is the same look as a configured member that has not started yet. Is that acceptable, or do you want a distinct label? A different label would be a requirement change for the Solution Designer.
2. **General check** (optional, in an isolated instance built from this worktree):
   - delegate from a Team;
   - see the child row with "Started by …" and Messages-only;
   - lower the grace setting to 60000 and watch the child go Offline;
   - message it and see it wake with its conversation.
3. **Release.** Do you want a new beta (it would be 1.4.91-beta.9, via `scripts/desktop-release.sh beta`, as for beta.5–beta.8), or finalize into `personal` only?
4. **Dead web files: remove now, or as a follow-up?** Two web files lost their last importer when this ticket removed the task UI, and the removal plan did not list them:
   - `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue`
   - `autobyteus-web/utils/teamReferences/referenceFilePresentation.ts`

   `utils/teamReferences/teamReferenceFileModel.ts` was already unused before this ticket. Deleting them changes no behavior, but it is a source change, which delivery doesn't make. Options:
   - (a) accept as-is and record as a follow-up;
   - (b) send back to implementation now. That adds a short implementation → review round before finalization.

   Delivery recommends (a).

Answered: verified; finalize and release a new beta (see Status).

## Residual Risks / Observations

- **OBS-001 / C-11:** a wake delays other messages in the same root by the restore time: Codex +667 ms; AutoByteus +5 ms; Claude +2 ms. No message is lost.
- **OBS-002 (pre-existing):** `DataCloneError` at `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts:55` when opening a second old Team run ("Couldn't load activity"). Release 1.4.91-beta.6 behaves the same. Needs a separate ticket.
- **Stale pre-existing e2e files:** `tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` and `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` fail at the base too and need an owner.
- **Size watch:** `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` is at 491 effective lines, near the 500 limit.
- **Retry edge (design-accepted):** if a released migration (`20260824`/`20260901`) is still pending when a user upgrades and new version-less trees already exist, the frozen strict classifiers treat those new trees as unsupported. On the inspected install both migrations are terminal.
- **Tests from an agent shell** must use the sanitized env; the shell inherits your production `DATABASE_URL` and `AUTOBYTEUS_MEMORY_DIR`.
- **Web docs debt:** `autobyteus-web/docs/settings.md` contains an older near-copy of `agent_execution_architecture.md`. Both are synced here; de-duplicating is a separate docs task.

## Artifacts

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/done/task-delegation-resource-lifecycle`)

- Requirements and design:
  - `…/requirements-doc.md`, `…/investigation-notes.md`, `…/design-spec.md`
  - `…/solution-revision-record.md`, `…/solution-handoff.md`
- Architecture review: `…/design-review-report.md`, `…/architecture-review-revision-record.md`
- Implementation: `…/implementation-handoff.md`, `…/implementation-revision-record.md`
- Source and test-code review: `…/code-review-report.md`, `…/code-review-revision-record.md`, `…/api-e2e-test-review-report.md`
- API/E2E: `…/api-e2e-coverage-investigation.md`, `…/api-e2e-execution-coverage-report.md`, `…/api-e2e-test-case-ledger.md`, `…/api-e2e-revision-record.md`
- Delivery:
  - `…/docs-sync-report.md`, `…/release-notes.md`, `…/release-deployment-report.md`
  - `…/delivery-revision-record.md`, `…/delivery-evidence/`, this `handoff-summary.md`
- Product Design artifacts: N/A — not applicable
