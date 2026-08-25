# Delivery / Release / Deployment Report

## Final Result

`DR-006 Pass — user verification, repository finalization, v1.4.58 release,
publication, rollout verification, and cleanup are complete.`

## Authoritative Basis

- `SR-015` / `ARCH-REV-007 Pass`
- `IR-014`
- `CRR-023 Pass`, 9.6/10 (95.8/100)
- `API-REV-011 Pass`, 98%
- `CRR-024` proportional durable-test Pass
- Open findings: none
- `API-E2E-F-003`: Out Of Scope / Non-Blocking; not resurrected

## User Verification And Final Refresh

The user explicitly completed hands-on verification, authorized finalization and
a new release, and later confirmed the released version was already running.
After the first signal, `git fetch --prune origin` left the recorded
`origin/personal` target unchanged at
`87b1b584592be95b1c8ee076f1d0ab3986a13f18`. It remained an ancestor of the
verified candidate at 26 ahead / 0 behind. No new integration, rerun, candidate
change, or renewed verification was required.

## Repository Finalization

| Step | Result |
| --- | --- |
| Move ticket to `tickets/done/hierarchical-team-run-launch-config/` | Pass |
| Archive/finalization commit | `f0b9ba0ad0c59bbd52693997456ed46f39475516` |
| Reconcile historical remote ticket tip without tree change | `b9806ef7d7d0ad14b73d710c020a0784287400b4` |
| Push ticket branch | Pass |
| Fast-forward local `personal` to tracked remote | Pass |
| Merge ticket branch into `personal` | `a43e8ceea83274d0724533144281806e7acf68b0` |
| Push `personal` | Pass |

The dated configured-recovery comparison branch was not merged or cherry-picked.

## Release / Publication

- Documented command:
  `scripts/desktop-release.sh release 1.4.58 --release-notes tickets/done/hierarchical-team-run-launch-config/release-notes.md`
- Version/tag: `1.4.58` / `v1.4.58`
- Release commit/tag target:
  `a6c79a669923b569f82adb2b9d1b31da5ceac3de`
- GitHub Release:
  https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.58
- Release state: non-draft, non-prerelease
- Published assets: 21
- Updater manifests: `latest-mac.yml`, `latest-linux.yml`,
  `latest-linux-arm64.yml`, and `latest.yml` all report `1.4.58`
- Managed messaging manifest: exact `releaseTag=v1.4.58` and
  `artifactVersion=1.4.58`

Published asset families include macOS arm64/x64 DMG+ZIP+blockmaps, Linux
arm64/x64 AppImages, Windows x64 installer, Android APK+checksum, messaging
Gateway archive+metadata+checksum, updater manifests, and the managed release
manifest.

## Workflow Results

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/32835663514 | Pass |
| Android APK Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/32835663543 | Pass |
| iOS App Store Connect Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/32835663837 | Pass |
| Release Messaging Gateway | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/32835663595 | Pass |
| Server Docker Release | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/32835663580 | Pass |

## Deployment And Rollout Verification

- Desktop/application rollout: Pass; the user confirmed the released version
  is running.
- iOS publication path: App Store Connect archive/upload workflow passed.
- Server image publication: Pass.
- Docker Hub tags: `autobyteus/autobyteus-server:1.4.58` and `:latest`.
- OCI platforms: `linux/amd64`, `linux/arm64`.
- Shared OCI digest:
  `sha256:a9ba057c7615742a4bafc98540556fb485fcbe3ae2ef2696507618c70eceefef`.
- Separate runtime infrastructure deployment: not applicable; repository
  release workflows publish the distributable artifacts/images.

## Persisted-Data Transition

The release contains the validated
`20260824_team_run_execution_tree_v2` startup migration. Delivery performed no
direct user-data rewrite. The executable validation covered deterministic V1 to
V2 upgrade, exact bindings/snapshots, warning isolation, retry, overlap
rejection, and idempotent relaunch/restore behavior.

## Documentation And Evidence

- Long-lived docs sync: Pass; `docs-sync-report.md`
- Curated release notes: `release-notes.md`
- Final rollout evidence:
  `delivery-evidence/delivery-release-v1.4.58-rollout-dr006.txt`
- Recovery branch: retained as comparison-only and untouched

## Cleanup

- Dedicated ticket worktree: removed
- Local ticket branch: deleted
- Remote ticket branch: deleted
- Worktree metadata: pruned
- User-owned `.article-work/`: preserved and untouched

## Final Status

No release, deployment, documentation, integration, cleanup, or rollback blocker
remains. DR-006 is complete.
