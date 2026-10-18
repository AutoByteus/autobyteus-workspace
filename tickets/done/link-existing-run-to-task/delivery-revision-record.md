# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | code_reviewer package after CRR-008 pass | N/A | Verified (AC-007 pending the user's check on the beta); finalized | docs-sync-report.md, handoff-summary.md, release-deployment-report.md, release-notes.md |
| DR-002 | The user's beta decision | Finalized | Beta v1.5.6-beta.5 published (4/4 workflows) | release-deployment-report.md, beta-v1.5.6-beta.5-release-notes.md |
| DR-003 | AC-007 run by the PM on the user's install | AC-007 pending | Refused as designed (REQ-007): Requirement Gap, routed to the Solution Designer | delivery-revision-record.md |

## Revision Entries

### DR-001 — Verified on the merged state and finalized

- Trigger: delivery package from `/software_engineering_team/code_reviewer` (CRR-006 9.3/10, API-REV-003/004 Pass, CRR-008 Pass).
- Integration: two clean merges of `origin/personal`. The merged-state rerun had no merge issue; the full-run failures were load timeouts that pass alone.
- Verification: AC-001..AC-004 and AC-006 Proven. AC-007 is the user's check on the beta.
- Finalization: see below.
- Terminal return: after the user's AC-007 check.
- Finalization: the ticket branch was pushed with commits (`7c8950a602`, `d764150835`, merges `5ba05e7de4` and `cd3bb0dd6b`, archive `86cc0da1de`). `origin/personal` stayed at `00ca7f5350` through the merge and the push. The `--no-ff` merge commit `4e738acc66` was pushed. Licensing and hygiene checks passed; the credential scan of the staged diff and branch commits found 0 matches; no `dist/` was staged.

### DR-002 — Beta v1.5.6-beta.5

- Trigger: the user's decision ("as long as you have no merge issue. then lets release a beta").
- Checks before tagging (clean release worktree at `4e738acc66`): licensing pass, hygiene pass; `next-beta` → `1.5.6-beta.5`, Android versionCode `10050605`; no NFS workflow is in this repository any more (extracted), so a tag starts the four workflows RELEASE.md lists.
- Cut: `desktop-release.sh beta --branch finalize/release-next-beta --no-push` → `cf14704473`, tag `v1.5.6-beta.5`. `personal` was unchanged right before the push. Pushed `4e738acc66..cf14704473`, then the tag (2026-10-18T12:00Z).
- Rollout: Desktop 39125543148 success (7/7), Android 39125543150 success, iOS 39125543113 success including "Archive And Upload To App Store Connect", Server Docker 39125543218 success.
  - The pre-release has 17 assets, published 2026-10-18T12:05:09Z; the four `latest*.yml` say `1.5.6-beta.5`.
  - Docker `:1.5.6-beta.5` = `:beta` = `sha256:7d4429ac5353…` (amd64, arm64); `:latest` unchanged (v1.5.5).
  - Result: **Completed**.
- Notes: curated `beta-v1.5.6-beta.5-release-notes.md` applied after all workflows finished, with the generated changelog line kept. The tag, assets and pre-release flag are unchanged. Deviation: curated notes on a beta (as before).
- AC-007: the user's check on this beta is pending. The terminal return follows it.

### DR-003 — AC-007 on the user's install: refused as designed (Requirement Gap)

- Trigger: the user asked delegation through the Project Task Manager instead of a manual check (2026-10-18). The PM ran the AC-007 journey in the user's app on v1.5.6-beta.5.
- The PM chose team run `software_engineering_team_ffde3bd0879c42ec8e246d15568b8159`: the only hand-started run working on `autobyteus-10`, in the PM's workspace.
- `delegate_task {target_team_run_id, task_id: autobyteus-10}` returned `delegated: false`: "This run has delegated runs of its own, so it can't be given a Task yet. Delegate the Task to a new task agent with recipient_address."
- Checked on disk, read-only: the run's tree is unchanged since the upgrade (mtime 05:10:56), has no `taskAgent` section, and links one delegated run, a PM copy started 2026-10-08 that is closed. `autobyteus-10` is unchanged (IN_PROGRESS, updatedAt 2026-10-08).
- Judgement:
  - The product behaved as approved: REQ-007 / DEC-107 refuse a run that has delegated runs of its own (any, closed included), with a clear reason and no change (AC-004 behavior confirmed on the real install).
  - AC-007 as written cannot pass: the user's own target run is in the refused class. DEC-107's data had already shown that 10 of 411 team runs and 3 of 25 agent runs fall in this class.
  - Classification: **Requirement Gap**, for the Solution Designer. Options: accept this ticket with AC-007 restated and take up the follow-up (the design already lists "adopting a run that has delegated runs of its own", CM-7); or narrow that follow-up to runs whose delegated runs are all closed, which needs no re-parenting of live runs, as in this case.
- Repository finalization and the beta stay as completed (DR-001, DR-002). Terminal return: not sent; routed to `/software_engineering_team/solution_designer`.

### DR-004 — Withdrawal delivered (SR-018), beta to follow (RM-005)

- Trigger: `/software_engineering_team/api_e2e_engineer` API-REV-005 Pass (95%) on worktree `withdraw-adoption`, branch `codex/withdraw-adoption`. Medium / Low, direct route; test-code review Not Required. An independent code review CRR-009 (Pass, no findings) was made at the user's request.
- Integration: the branch is current with `origin/personal` `2b04a9971d` (0 behind), so no merge or rerun was needed beyond API/E2E's run on this exact base.
- Verification from evidence (files opened):
  - RM-001: `WDR-1-hand-started-run-refusal.log` (WDR-1 ✓); `desktop/WDR-3-pm-refused.png` (both refused with the pre-adoption text; the runs stay in their own groups); `desktop/WDR-3-nothing-written.txt` (not in the PM's tree, 0 Task run entries, 0 `taskAgent` sections, still in history). The refusal text equals `4e738acc66^1` (`existing-copy-target.ts:9`). No `HandStartedRunAdoption` is left in `src` or the web app.
  - RM-002 / AC-006: `WDR-2-server-e2e.excerpt.log` (114 passed, 3 failed). The 3 also fail on the base (`WDR-2-classify-*-on-base.log`) and pass after the labelled baseline fix `43aa0bcb36` (`WDR-2-baseline-fixes-rerun.log` 13/13).
  - RM-006: `desktop/WDR-4-sidebar-samples.txt`, `WDR-4-retired-state.json` (archived and deleted runs left the sidebar; `departedRunIds` holds both); `desktop/WDR-5-done-reopen-samples.txt` (DONE closes, reopen plus message reactivates); `WDR-5-app-log-checks.txt` (19 usage events, 0 rejections, fail-stops or interrupts).
  - RM-003: no migration (nothing was written).
- Docs: no product doc describes adoption any more. The CM-6 adoption row and the `projects.md` adoption section are removed; the remaining "adopt" words are unrelated (binding or catalog adoption).
- RM-004: this folder returns to `tickets/done/` with `WITHDRAWN.md`; release-notes.md states the withdrawal.
- Release decision: Beta, by the user (RM-005: "After the adoption logic are completely being removed, then we should publish a new beta").
- Finalization and beta: recorded below.
- **Blocked before finalization (Local Fix):**
  - Verification passed on base `2b04a9971d` and the ticket branch was pushed (archive commit on `codex/withdraw-adoption`). While I was finalizing, `origin/personal` advanced to `528deff924` (project-task-semantic-search: 60 code files, including the server `package.json`). The push of my finalize merge was rejected (non-fast-forward); nothing reached `personal`, and the local finalize merge was discarded.
  - Merging `528deff924` into the ticket branch conflicts in `autobyteus-server-ts/src/projects/services/project-service.ts` (2 hunks) and `project-task-service.ts` (2 hunks). Semantic search was built on the adoption code: its `deleteProject` / `deleteTask` call `afterProjectDeleted` / `revertUnfinishedAdoptionsOfDeleted`, and its process initializer passes `revertUnfinishedAdoptions`. Those are adoption hooks this withdrawal removes.
  - The merge was aborted. Routed to `/software_engineering_team/implementation_engineer`: resolve by keeping the search cleanup (`searchCleanup.forgetProject` / `forgetTask`) and removing every adoption call semantic search added, then re-validate (rule 4: `package.json` changed, so a full rerun). Delivery resumes from integration; the beta (RM-005) follows.
- **Blocker resolved (DR-004, continued):**
  - IR-006: merge `a130f4a86f` brings in `origin/personal` `04ec416617` with semantic search's adoption hooks removed (`d95425d711`, same product content).
  - API-REV-006 Pass 95%. Rule 4 full rerun: server e2e `119 passed | 49 skipped (168)`, 0 failed, including `project-task-search`, `project-task-search-model-unavailable` and WDR-1.
  - Files opened: `r6/WDR-2-server-e2e.excerpt.log`; `r6/desktop/WDR-3-nothing-written.txt` (both refused with the pre-adoption text; 0 Task run entries; 0 `taskAgent`); `WDR-4-retired-state.json`; `WDR-5-samples.txt`; `WDR-6-delete-task-project.txt` (Task and Project deletes leave nothing; 0 errors and 0 adoption or search-cleanup failures in the session log).
  - Checked on HEAD: 0 adoption identifiers in `src` and the web app; `forgetProject` / `forgetTask` kept in both delete paths.
  - The branch is current with `origin/personal` `04ec416617` (0 behind). Credential scan of the branch commits: 0 matches. Licensing and hygiene pass.
- **Finalized:** the ticket branch `codex/withdraw-adoption` was pushed. `origin/personal` stayed at `04ec416617` through the merge and the push. The `--no-ff` merge commit `a9ec1b37e4` was pushed.

### DR-005 — Beta v1.5.6-beta.7 (RM-005)

- Decision: Beta, by the user (RM-005).
- Checks before tagging (clean release worktree at `a9ec1b37e4`): licensing pass, hygiene pass; `next-beta` → `1.5.6-beta.7`, Android `10050607`.
- Cut: `desktop-release.sh beta --branch finalize/release-v1.5.6-beta.7 --no-push` → `6958df1345`, tag `v1.5.6-beta.7`. `personal` was unchanged right before the push. Pushed `a9ec1b37e4..6958df1345`, then the tag (2026-10-18T20:46Z).
- Rollout: Desktop 39164859071 success (7/7), Android 39164859086 success, iOS 39164859098 success including "Archive And Upload To App Store Connect", Server Docker 39164859104 success.
  - The pre-release has 17 assets (published 2026-10-18T20:51:11Z); the four `latest*.yml` say `1.5.6-beta.7`.
  - Docker `:1.5.6-beta.7` = `:beta` = `sha256:e128ae59ff40…` (amd64, arm64); `:latest` unchanged (v1.5.5).
  - Result: **Completed**.
- Contents since v1.5.6-beta.6: project-task-semantic-search, this withdrawal and segment-lifecycle-error-flood.
- Notes: `beta-v1.5.6-beta.7-release-notes.md`, curated, covering all three; it states the beta.5 adoption feature was withdrawn (RM-004). Applied after all workflows finished; the tag, assets and pre-release flag are unchanged. Deviation: curated notes on a beta (as before).
- Cleanup: the release worktree, the `withdraw-adoption` worktree, the local `finalize/` and `codex/` branches and the remote `codex/withdraw-adoption` are removed after this record is pushed.
- Result: **Delivery Completed** for SR-018. Terminal return sent to `/software_engineering_team/solution_designer` after this record is pushed.
