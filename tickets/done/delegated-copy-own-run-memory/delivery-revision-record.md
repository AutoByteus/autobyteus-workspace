# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | code_reviewer package after CRR-008 pass | N/A | Blocked: merged-state e2e failures (Local Fix) | delivery-integration-blocker.md, release-notes.md, evidence/delivery/ |
| DR-002 | code_reviewer package after CRR-010 pass (merged state) | Blocked | Verified; finalized; no release | docs-sync-report.md, handoff-summary.md, release-deployment-report.md |
| DR-003 | The user's beta request | No release | Beta v1.5.6-beta.1 published (4/4 release workflows; NFS refused by design) | release-deployment-report.md (DR-003), beta-v1.5.6-beta.1-release-notes.md |

## Revision Entries

### DR-001 — Blocked at the post-integration rerun

- Trigger: delivery package from `/software_engineering_team/code_reviewer` (CRR-007 9.3/10, API-REV-003 94%, CRR-008 pass).
- Prior result: N/A.
- Current result: **Blocked**. The merge of `origin/personal` `2d076088dd` (`1dd3cedadf`) is clean. On the merged state, `team-run-v1-production-upgrade` fails 3/4 deterministically, and three startup/vault e2e files fail in the full run only.
- Verification: not concluded. The pre-merge evidence is strong (94%, AC-016 real released-install upgrade on test-owned data), but the merged state is not green.
- Terminal return: not eligible.
- Next: `/software_engineering_team/implementation_engineer` (see delivery-integration-blocker.md).

### DR-002 — Verified and finalized on the merged state

- Trigger: CRR-010 pass; API-REV-004 94% on the merged build.
- Prior result: DR-001 Blocked.
- Current result: Verified from evidence. Docs consistent with no delivery edits. Finalized with no release.
- Ticket branch pushed (archive commit `66445db033`). `origin/personal` stayed at `cba5563a5d` through the merge and the push. Merged with `--no-ff` on `finalize/delegated-copy-own-run-memory`: merge commit `9b5cf4025d`, pushed.
- Checks: licensing and artifact hygiene passed. The staged diff and branch commits were scanned for the user's credentials, with 0 matches. No `dist/` was staged.
- Release: none.
- Cleanup: the worktree, the local `codex/` and `finalize/` branches and the remote ticket branch are removed after this record is pushed.
- Terminal return to `/solution_designer`: sent after this record is pushed.

### DR-003 — Beta v1.5.6-beta.1

- Trigger: the user asked for a new beta to install (2026-10-17).
- Result: `v1.5.6-beta.1` published from `fe6c696e9e`.
  - Desktop, Android, iOS (TestFlight) and Docker succeeded; 17 assets; Docker `:beta` = `:1.5.6-beta.1`.
  - The NFS workflow refused publication by design.
  - Curated notes with the one-way upgrade warning applied.
- Details: release-deployment-report.md, DR-003.

### DR-004 — The user's upgrade to v1.5.6-beta.1, checked on disk (read-only)

- Trigger: the user upgraded their own desktop install to 1.5.6-beta.1 on 2026-10-18 and asked delivery to verify the disk state.
- Method: read-only. Files were only read, and the database was opened with `sqlite3 -readonly` (`mode=ro`). Nothing was written, moved or deleted. No secret store or secrets were read.
- Findings:
  - The app reports `CFBundleShortVersionString` `1.5.6-beta.1`.
  - Ledger: `20261017_task_agent_own_run_v1` SUCCEEDED on attempt 1 (2026-10-18 03:10:53–57 UTC): "Scanned 633; migrated 90; skipped 1; failed 0." The earlier `20261015_collaborators_to_delegated_runs_v1` and `20261017_project_task_keys_v1` are SUCCEEDED. The two FAILED rows (`20260801_team_canonical_identity`, `20260801_drop_token_usage_legacy_route_column`) were last updated 2026-08-18 and 2026-08-10: pre-existing, untouched by this upgrade.
  - The migration log has 90 MIGRATED items and 1 `SKIPPED_UNMATERIALIZED`: a delegated product team that never started. It has its own tree with a `taskAgent` section, an empty log, and a link in its coordinator, as designed.
  - All 90 migrated task agents were checked one by one: own folder with a `taskAgent` section naming its coordinating run (90/90); a links-only entry in the coordinating tree (90/90); no leftover folder in the coordinator (90/90); own message log 89/90. The one without a log is an Org task agent with no message in the Org's log, so there was nothing to copy; its conversation is in its own folder.
  - No subfolder remains under any `agents/*/collaboration/`; those folders hold only the tree and the coordinator's own log.
  - Server log since the upgrade: startup only, plus 2 MCP `400` request warnings, a pattern present long before this release. No error.
- Result: the upgrade on the user's real install is correct. Delivery and release are complete.
