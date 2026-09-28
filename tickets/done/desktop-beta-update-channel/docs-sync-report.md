# Docs Sync Report — `desktop-beta-update-channel`

## Scope

- Ticket: `desktop-beta-update-channel`. Classification is preserved: `task_size=Medium`, `architectural_risk=High`, reviewed route.
- Trigger: delivery package from `/code_reviewer` after CRR-005 Pass (API-REV-002 Pass, 92%).
- Bootstrap base reference: `origin/personal` @ `82f3359cb`.
- Integrated base reference used for docs sync: `origin/personal` @ `f7b4f7f4a` (v1.4.90 bump). Re-integrated onto `36c14aaf5` in DR-002; that base changes only Antigravity server files, so there is no additional docs impact. It was merged into the ticket branch as `24813fd4e` with no conflicts, on top of delivery checkpoint `68a3c9270`.
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh". Logs are in `/tmp/dbuc-delivery/`.

## Why Docs Were Updated

- Summary:
  - The implementation already updated the four feature-local docs, and they were re-checked against the integrated state.
  - Delivery found that the repository-level release documentation still described the pre-beta behavior:
    - curated notes for every tag;
    - prerelease Docker tags publishing only the version tag;
    - no beta release command.
  - Those docs were updated.
- Why this belongs in long-lived docs:
  - Release channel rules decide who is offered a build.
  - The beta command is the only supported way to create a beta tag.
  - Maintainers read the root README and `autobyteus-web/AGENTS.md` before releasing, so stale text there would lead to wrong release actions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/github-actions-tag-build.md` | Release Channels section (implementation) | No change (re-verified) | It matches the workflows: `-` → pre-release, generated notes in both jobs, the `beta` command, the forward-only `:beta`, and the first-run checklist. |
| `autobyteus-web/docs/electron_packaging.md` | Update Channel section and IPC list (implementation) | No change (re-verified) | It matches IR-003: the `updateStaged` sticky lock, `isAppUpdateChannelLocked`, `allowDowngrade=false`, never setting `channel`, the P-007 accepted limitation, and `app-update:set-channel`. |
| `autobyteus-server-ts/docker/README.md` | Release tracks section and publish rules (implementation) | No change (re-verified) | `--tag beta`, going back to `latest`, the downgrade caution, and "zh has no beta" all match `release-server-docker.yml`. |
| Launcher help, `core.sh` and `Core.ps1` (implementation) | CLI help text | No change (re-verified) | CLI-01 evidence shows the bash help. PowerShell rendering was not executed (no `pwsh`); this is a known residual. |
| `README.md` (root) → "Release workflow" / "Consistent release commands" | Canonical maintainer release doc | **Updated** | See below. |
| `autobyteus-web/AGENTS.md` → "Release Guidelines" | Agent-facing release instructions | **Updated** | The beta path was added. |
| `autobyteus-web/docs/settings.md` | Settings doc changed on the base | No change | It has no Updates/About section; the updater UI is documented in `electron_packaging.md`. |
| `autobyteus-web/shared/appUpdateTypes.ts` doc comment (optional nit C-10) | Stale API doc comment | **Updated** (comment only) | The `accepted:false` wording now names `isAppUpdateChannelLocked` / staged. No code change; `tsc -p electron/tsconfig.json` still exits 0. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Release notes rule | Stable releases use curated notes. Any `-` tag uses generated notes in the desktop and Android jobs. | The old text said curated notes apply whenever the file exists. That is no longer true for pre-releases. |
| `README.md` | New "Release channels" bullet | `-` tag → GitHub pre-release, even on manual dispatch. "Latest" stays stable. The desktop opt-in switch; opting out never downgrades. Links to the two web docs. | A root-level summary of who gets which build. |
| `README.md` | Server Docker tags | Prerelease tags publish the version tag and never `:latest`. `:beta` (default variant) is forward-only through `is-newest`. Launcher `--tag beta` / `--tag latest`, with the caution. | The old text said prereleases publish **only** the version tag. That is now false for the newest tag, because `:beta` moves too. |
| `README.md` | Consistent release commands | Added `bash scripts/desktop-release.sh beta [--base X.Y.Z]` with its behavior. | The new supported release path. |
| `autobyteus-web/AGENTS.md` | Release Guidelines | Added the `desktop-release.sh beta` path. | Agents doing releases follow this file. |
| `autobyteus-web/shared/appUpdateTypes.ts` | Source doc comment | `AppUpdateChannelChangeResult` refusal wording. | Resolves reviewer nit C-10. The old wording said "downloaded" instead of the staged rule. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Release classification | Any `-` tag is a pre-release with generated notes, and "Latest" stays stable. | `design-spec.md` DS-001 | `README.md`, `github-actions-tag-build.md` |
| Updater channel policy | `allowPrerelease` comes from the channel, `allowDowngrade=false`, and `autoUpdater.channel` is never set. | DS-002/DS-003 | `electron_packaging.md` |
| Channel lock rule | The sticky `updateStaged` plus a shared `isAppUpdateChannelLocked` gate both main and UI. | SR-005, IR-003 | `electron_packaging.md` |
| Beta tooling | `release_versions.py next-beta` / `is-newest` grammar; `desktop-release.sh beta`. | DS-004 | `README.md`, `AGENTS.md`, `github-actions-tag-build.md` |
| Docker `:beta` | Forward-only, default variant only, and a re-run is needed after a failed newer build. | DS-005, ARCH-005 | `README.md`, `docker/README.md`, `github-actions-tag-build.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Tag-push `PRERELEASE="false"` hard-code in `release-desktop.yml` | Any `-` tag is a pre-release | `github-actions-tag-build.md`, `README.md` |
| "prerelease tags publish only `:X.Y.Z-…`" | Version tag plus forward-only `:beta` | `README.md`, `docker/README.md` |
| The IR-002 `APP_UPDATE_CHANNEL_LOCKED_STATUSES` status set | `isAppUpdateChannelLocked(state)` with `updateStaged` | `electron_packaging.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, and the user-verification hold.
- Notes: none of the docs needed information that the final implementation leaves unclear.
