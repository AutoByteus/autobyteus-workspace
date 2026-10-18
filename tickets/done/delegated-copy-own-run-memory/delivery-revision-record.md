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
