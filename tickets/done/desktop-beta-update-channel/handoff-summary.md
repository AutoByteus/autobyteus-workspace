# Handoff Summary — `desktop-beta-update-channel`

Status: **User-verified; finalization and beta release in progress (DR-003).**
- On 2026-09-28, Solution Designer relayed at the user's request: "i want to release a beta. now". Earlier the user said: "finalize and release beta is enough".
- The release choice is option 1, Beta (`v1.4.91-beta.1`), followed by the CI-01 checks.
- The user did not separately confirm the suggested local-build checks. See `release-deployment-report.md` → "User Verification".
- The ticket is archived at `tickets/done/desktop-beta-update-channel/`.
- The finalization and release outcomes are in `release-deployment-report.md`.

DR-002 (at the user's request) re-integrated the branch onto the latest `origin/personal` @ `36c14aaf5` as merge `feecfd20a`, with no conflicts. The branch is 0 commits behind. The new base commits are server-only Antigravity changes and do not overlap with this ticket. The checks were rerun and passed, and the local test build was rebuilt from this state.

## What Is Delivered

- **Desktop beta channel:**
  - The Settings → Updates card has a **Receive beta updates** switch, off by default, saved in `userData/app-update-channel.v1.json`.
  - Beta installs are offered the newest release, beta or stable. Stable installs (and all older versions) read only `/releases/latest`.
  - Opting out never downgrades.
  - The switch is locked while the updater is checking, downloading or installing, and whenever an update is staged.
  - A Beta badge is shown on pre-release builds. Copy is in en and zh-CN.
- **Release classification:**
  - Any tag containing `-` becomes a GitHub **pre-release**, including on manual dispatch.
  - Pre-release tags get generated notes in both the desktop and Android jobs.
  - Stable releases are unchanged.
- **Beta release command:** `bash scripts/desktop-release.sh beta [--base X.Y.Z]`, backed by `scripts/release_versions.py` (`next-beta` / `is-newest`).
- **Docker:** `:beta` moves forward only, on the default variant. `:latest` is unchanged. The launcher help and the server Docker README explain `--tag beta` / `--tag latest` and the downgrade caution.
- **Docs:** the root README and `autobyteus-web/AGENTS.md` were brought up to date at delivery (see `docs-sync-report.md`).
- **Classification (preserved):** `task_size=Medium`, `architectural_risk=High`. Route: reviewed.

## Integrated State For Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel`
- Branch: `codex/desktop-beta-update-channel`
- Commits:
  - Checkpoint `68a3c9270`: the full reviewed candidate.
  - Merge `24813fd4e` of `origin/personal` @ `f7b4f7f4a` (v1.4.90), with no conflicts (DR-001).
  - `287657544`: delivery docs sync (`README.md`, `autobyteus-web/AGENTS.md`, the `appUpdateTypes.ts` comment) plus the delivery artifacts.
  - **HEAD `feecfd20a`**: merge of `origin/personal` @ `36c14aaf5`, with no conflicts (DR-002).
- Only the DR-002 artifact updates in this folder remain uncommitted. They will be committed at finalization.
- Excluded from finalization: the untracked local build outputs `autobyteus-application-sdk-contracts/dist/` and `autobyteus-application-backend-sdk/dist/`.
- Finalization target: `origin/personal`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass (SR-005) |
| Source review | CRR-004 Pass (IR-003). CR-001 and CR-002 are resolved. |
| API/E2E | API-REV-002 Pass, 92%. API-F-001 is resolved. Packaged-harness E2E-01..08 used a local update feed. |
| Test-code review | CRR-005 Pass, no findings |
| Delivery rerun on the merged state | Python: 39 + 1 passed, and the full suite shows only the 3 known base failures. Electron `tsc` is clean. Updater specs: 37 passed. Store/About specs: 42 passed. `actionlint` and `shellcheck` are clean. Guards pass. |

## Local Test Build (DR-002, rebuilt from `feecfd20a`)

- Source: branch HEAD `feecfd20a` (based on `origin/personal` @ `36c14aaf5`). The DR-001 build from `24813fd4e` was replaced.
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder pnpm build:electron:mac` (in `autobyteus-web`). Exit 0. The log is `/tmp/dbuc-delivery/r2/electron-build.log`.
- Artifacts are in `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/autobyteus-web/electron-dist/`:
  - `mac-arm64/AutoByteus.app`
  - `AutoByteus_enterprise_macos-arm64-1.4.90.dmg` and `.zip`
- The label is 1.4.90 because it comes from upstream; nothing was bumped. The package contains `dist/electron/updater/appUpdateChannelStore.js` and `dist/shared/appUpdateTypes.js`.
- Suggested checks:
  1. Settings → Updates shows **Receive beta updates**, off. No Beta badge appears, because 1.4.90 is stable.
  2. Turn the switch on. The app re-checks and reports "up to date", because no beta exists yet. Then quit and relaunch: the switch is still on, and `~/Library/Application Support/<app userData>/app-update-channel.v1.json` contains `{"channel":"beta"}`.
  3. Turn the switch off and confirm that nothing is downgraded.
- Not locally verifiable: offers of a real beta. That is what the CI-01 publication below proves.

## Release Choice (Please Pick One When Verifying)

1. **Beta (recommended):** finalize to `personal`, then run `bash scripts/desktop-release.sh beta` → `v1.4.91-beta.1`.
   - I then verify CI-01:
     - the release is a Pre-release and "Latest" is still v1.4.90;
     - the `latest*.yml` assets are present;
     - generated notes are used in both jobs;
     - the APK is attached and the TestFlight upload ran;
     - Docker `:beta` equals `:1.4.91-beta.1`, and `:latest` is unchanged.
   - This closes the last validation gap. Stable users are unaffected if the Pre-release flag holds. The rollback is in `release-deployment-report.md`.
2. **Stable:** finalize, then run `pnpm release 1.4.91 -- --release-notes tickets/done/desktop-beta-update-channel/release-notes.md`. CI-01 stays open until the first beta.
3. **Finalize only:** merge to `personal` with no release.

## Residual Risks (Accepted / Known)

- CI-01 (first real beta publication) is not yet executed.
- RSK-001: beta resolution follows feed order. The worst case is "no update", never a downgrade.
- Install-on-quit is proven from the library source only.
- PowerShell help rendering is not executed.
- P-007: after a failed replacement download, the switch stays locked until restart.
- Docker `:beta` can stay one build behind after a failed newer build. The remedy is to re-run that build.
- The `next-beta` default base ignores a higher `--base` series (per REQ-006).
- The Android patch limit is ≤ 99.

## Artifacts

All in `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/done/desktop-beta-update-channel/`:
- `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`
- The upstream chain: requirements, investigation, solution, design, architecture review, implementation, code review, and API/E2E artifacts, plus `api-e2e-evidence/`.
