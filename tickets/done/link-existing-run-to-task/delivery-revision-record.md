# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | code_reviewer package after CRR-008 pass | N/A | Verified (AC-007 pending the user's check on the beta); finalized | docs-sync-report.md, handoff-summary.md, release-deployment-report.md, release-notes.md |

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
