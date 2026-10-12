# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API/E2E Pass (API-REV-001), direct route | N/A | Docs synced; waiting for the user's verification and release decision | `docs-sync-report.md`, `handoff-summary.md`, `release-notes.md`, `release-deployment-report.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |
| DR-002 | User: "finalize and release a new beta" | DR-001 waiting for verification | Finalized into `personal`; beta `v1.5.2-beta.3` released completely | `release-deployment-report.md`, `delivery-evidence/` |
| DR-003 | User confirmed AC-004 in the deployed beta | DR-002 complete, AC-004 still with the user | AC-004 passed; no open acceptance items | `release-deployment-report.md`, `delivery-revision-record.md` |
| DR-004 | User asked for a stable release | DR-003 complete, shipped only in beta | Stable `v1.5.2` released completely | `stable-v1.5.2-release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md` |

## Revision Entries

### DR-001 — Initial delivery baseline, holding for user verification

- Delivery round and trigger: the first delivery round, after `api_e2e_engineer` reported a Pass on the direct route (Small/Low).
- Triggering upstream report: `api-e2e-execution-coverage-report.md` and `api-e2e-revision-record.md` (API-REV-001).
- Prior authoritative result: N/A
- Current authoritative result: the integrated state is current with `origin/personal` @ `3514fe48e`, so no merge was needed. Docs were synced with one rule bullet in `agent_execution.md`. Release notes are prepared. Delivery is held for the user's verification (AC-004) and release decision.
- Docs sync report: `docs-sync-report.md`
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification: `Already current`. No rerun was needed because the base had not moved. The licensing and artifact hygiene checks passed.
- User verification/finalization state: waiting for the user's verification. Nothing has been pushed, merged or released.
- Terminal return to `/solution_designer`: `Not yet eligible`
- Terminal return message/reference: N/A
- Why this baseline was recorded: the first completed delivery-stage result.
- Next recipient/action: the user verifies AC-004 and chooses beta, stable or no release. Delivery then finalizes, releases, watches the rollout and cleans up.
- Remaining blockers, rollback concerns, or untested scope: AC-004 is still to be checked by the user. RK-01 is accepted upstream. The baseline failure of the fake-CLI interrupt-resume E2E is a separate item.

### DR-002 — Finalization and beta release v1.5.2-beta.3

- Delivery round and trigger: the user instructed "finalize and release a new beta" on 2026-10-12. This revisits DR-001's verification hold.
- Triggering upstream report, verification, or evidence: the user's message. It is recorded as release approval. AC-004 was not reported as checked before release and is to be checked in the beta build.
- Prior authoritative result: DR-001, waiting for the user's verification and release decision.
- Current authoritative result: delivery is complete.
  - The ticket is archived to `tickets/done/`.
  - `origin/personal` had moved from `3514fe48e` to `a531b7ab0` (token-meter-accuracy). It was merged into the ticket branch as `3dbf5ef2f`. The only conflict was the test harness both branches had fixed the same way; `personal`'s version was taken.
  - The checks passed again on the merged state:
    - unit tests: 1482 passed, 6 skipped;
    - typecheck;
    - live E2E: 4 of 4.
  - `--no-ff` merge `79c1216bc` into `personal`. Release commit `37e972199` and tag `v1.5.2-beta.3` were pushed.
  - All 4 release workflows succeeded. The GitHub pre-release has all 17 assets. Docker `1.5.2-beta.3` exists for amd64 and arm64, and `:beta` points to it.
- Docs sync report: `docs-sync-report.md`. Unchanged; the rule bullet survived the merge intact.
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md`. It now has "Finalization Re-Integration" plus the finalization, release, cleanup and final-status sections.
- Integration and post-integration verification: `Merge`, with the checks run again. Evidence is in `delivery-evidence/post-integration-*.log`.
- User verification/finalization state: approved by the user. Finalization and release are completed.
- Terminal return to `/solution_designer`: `Sent` after this record is pushed. Delivery confirms the send in its terminal message.
- Terminal return message/reference: the `send_message_to` handoff to the solution designer after cleanup.
- Why this delivery revision was recorded: the finalization, re-integration and release round.
- Next recipient/action: the solution designer verifies the terminal package. The user checks AC-004 in the beta.
- Remaining blockers, rollback concerns, or untested scope:
  - AC-004 in the beta build is still with the user.
  - RK-01 is accepted upstream.
  - The baseline failure of the fake-CLI interrupt-resume E2E (8 cases) belongs to the owner of the Claude streaming-session lifecycle.
  - Rollback: revert `79c1216bc` on `personal` and cut the next beta.

### DR-003 — AC-004 confirmed by the user in the deployed beta

- Delivery round and trigger: the user's post-release check, revisiting DR-002.
- Triggering upstream report, verification, or evidence: on 2026-10-12, while running the deployed `v1.5.2-beta.3`, the user reported: "it passes. i dont see this error now".
- Prior authoritative result: DR-002. Finalization and the beta release were complete; AC-004 was still with the user.
- Current authoritative result: AC-004 passed. All acceptance criteria (AC-001 to AC-004) are now met. Nothing about the code, release or rollout changed.
- Docs sync report: unchanged.
- Handoff summary: unchanged.
- Release/publication/deployment report: "Verification Checks" and "Final Status" now record the AC-004 pass.
- Integration and post-integration verification: not applicable. This change only records the user's check.
- User verification/finalization state: fully verified. Finalization and release are complete.
- Terminal return to `/solution_designer`: `Sent` as a follow-up to the DR-002 terminal package.
- Why this delivery revision was recorded: to close the one acceptance item that DR-002 left open.
- Next recipient/action: none. The solution designer may close the ticket.
- Remaining blockers, rollback concerns, or untested scope:
  - RK-01 was accepted upstream.
  - The baseline failure of the fake-CLI interrupt-resume E2E is a separate item.

### DR-004 — Stable release v1.5.2

- Delivery round and trigger: on 2026-10-12, after AC-004 passed, the user asked: "first release a stable version". This revisits DR-003.
- Prior authoritative result: DR-003. The fix had shipped only in beta `v1.5.2-beta.3`.
- Current authoritative result: stable `v1.5.2` is released completely. Following `RELEASE.md`, I worked in a temporary worktree on `finalize/stable-v1.5.2`, created from `origin/personal` @ `7be4b7cf9`.
  - Curated notes: `stable-v1.5.2-release-notes.md`, commit `51bb3746d`. They cover every change since `v1.5.1`: compaction-prompt-cache-reuse, remove-autobyteus-remote-provider, token-meter-accuracy and this fix. One superseded note was dropped.
  - `check_licensing.py` and `check_repository_artifact_hygiene.py` both passed.
  - `bash scripts/desktop-release.sh release 1.5.2 --release-notes tickets/done/claude-normal-reply-auth-error-misclassification/stable-v1.5.2-release-notes.md --branch finalize/stable-v1.5.2 --no-push` created release commit `449d639de` and the annotated tag `v1.5.2`.
  - Just before pushing, `origin/personal` was fetched again and was unchanged. I pushed `personal` (`7be4b7cf9` to `449d639de`) and the tag `v1.5.2`.
- Workflows: all 4 succeeded.
  - Desktop: 38246664771
  - Android: 38246664785
  - iOS/TestFlight: 38246664888
  - Server Docker: 38246664846
- Published artifacts:
  - GitHub release https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.2: `isPrerelease: false`, it is GitHub "Latest" (`releases/latest` returns `v1.5.2`), it has all 17 assets, and its body is the curated notes.
  - Docker `autobyteus/autobyteus-server:1.5.2` is published for amd64 and arm64. `:latest` and `:beta` both point to the same digest, `sha256:9de2f0b8…01ef`.
- Deviation from `RELEASE.md`: the guide expects curated notes from one ticket's `release-notes.md`. This roll-up stable needed combined notes, so I stored them in this ticket folder. A guide fix is proposed in the follow-up report (problem 6) and needs the user's agreement.
- Cleanup: the temporary worktree and the local `finalize/stable-v1.5.2` branch are removed after this record is pushed.
- Terminal return to `/solution_designer`: `Sent` as a follow-up after this record is pushed.
- Next recipient/action: send the follow-up report to `/project_task_manager` so it can create the follow-up Tasks.
- Remaining blockers, rollback concerns, or untested scope:
  - None for the release.
  - Rollback: per `RELEASE.md`, revert on `personal` and cut the next version.
  - Out-of-scope problems are listed in `/Users/normy/.autobyteus/reports/claude-normal-reply-auth-error-misclassification-follow-up-problems.md`.
