# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (SR-004 revised for ARCH-REV-001; SR-005 revised for code-review failure-origin finding CR-002 / API-F-001)
- Approved requirements baseline: `SR-002`, approved by the user in conversation on 2026-09-27 ("thanks i approve now")
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/investigation-notes.md`

## Current-State Read

- **Desktop updater (main process):** `electron/updater/appUpdater.ts` owns the electron-updater lifecycle, update state and the `app-update:*` IPC. It never sets `allowPrerelease`, `allowDowngrade` or `channel`, so electron-updater derives `allowPrerelease` from the running version (BEH-002).
- **Wiring:** `electron/application/electronApplication.ts` constructs `AppUpdater` when `profile.updaterEnabled`, calls `initialize()` after the node registry is loaded, and later `startAutoCheck()`.
- **Renderer:** `stores/appUpdateStore.ts` mirrors `AppUpdateState` (`shared/appUpdateTypes.ts`) via preload (`electron/preload.ts`, typed in `electron/types.d.ts` and `types/electron.d.ts`). `components/settings/AboutSettingsManager.vue` renders version, status and the Check/Download/Install buttons.
- **Desktop release CI:** `.github/workflows/release-desktop.yml` forces `PRERELEASE=false` on tag push (BEH-001). It uses curated notes whenever `.github/release-notes/release-notes.md` is non-empty; that file persists in the repo after each stable release.
- **Android CI:** `.github/workflows/release-android.yml` publishes to the same GitHub release tag, already marks `-` tags as pre-release, and uses the same curated-notes rule.
- **Docker CI:** `.github/workflows/release-server-docker.yml` publishes `:<version>` always and `:latest` for non-`-` tags. The launcher (`scripts/public/docker/...`) re-pulls each node's saved image ref (BEH-008).
- **Operator script:** `scripts/desktop-release.sh release` bumps the version, syncs curated notes, commits, tags and pushes (BEH-006).
- No structural problem exists; the change extends healthy existing owners.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: About 20 files across four existing areas (Electron updater and its IPC; renderer store and About page with localization; three release workflows plus a new release-version helper and the operator script; docs and launcher help). All changes stay within existing owners; no new subsystem.
- Architectural risk: `High`
- Risk rationale:
  - **Deployment:** release publication changes for every desktop user; beta tags become GitHub pre-releases, and Docker gains a moving `beta` tag.
  - **Contract:** a new IPC command (`app-update:set-channel`) and new `AppUpdateState` fields.
  - **Persistence:** a new local preference file.
  - **Blast radius:** a mistake could hide stable updates from users or push betas to them. The code delta is small, but the risk surface is material.
- Escalation trigger: return a Design Impact if implementation or validation finds any of these:
  - electron-builder emits channel-named metadata (`beta*.yml`) for pre-release versions in the real CI build
  - GitHub or electron-updater resolves a pre-release for an `allowPrerelease=false` install
  - `softprops/action-gh-release` rewrites `prerelease` or the release body in a way that conflicts between the Android and desktop jobs

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| electron-builder source | `app-builder-lib@25.1.8/out/publish/PublishManager.js` `getResolvedPublishConfig` (channel from app version applied only to `generic`; `GitHubPublisher` has no `checkAndResolveOptions`); `updateInfoBuilder.js` `computeChannelNames` ("for GitHub should be pre-release way be used") | GitHub-provider builds write `latest*.yml` even for `X.Y.Z-beta.N` | No workflow metadata-filename changes needed (resolves UNK-001) | Confirm on the first real beta CI run |
| electron-updater source | `electron-updater@6.8.3/out/providers/GitHubProvider.js` `getLatestVersion` | `allowPrerelease=true` + pre-release tag → tries `beta-*.yml`, then falls back to `latest*.yml` | Beta installs resolve metadata through the fallback | None |
| electron-updater source | `AppUpdater.js` `set channel` → `allowDowngrade = true`; constructor sets `allowPrerelease` from the running version | Setting `autoUpdater.channel` would allow downgrades | Use only `allowPrerelease`; set `allowDowngrade=false` explicitly; never set `channel` | None |
| electron-updater source | `GitHubProvider.getLatestTagName` → `/releases/latest` | Excludes pre-releases | Stable protection = GitHub pre-release flag + `allowPrerelease=false` (REQ-002/003) | None |
| Workflow | `release-desktop.yml` "Resolve release notes mode"; `release-android.yml` same step | A beta would publish the previous stable's curated notes | Pre-release tags use generated notes in both jobs that write the shared release | Required Android workflow touch (see Scope note) |
| Launcher | `docker-runtime.sh` `upgrade_image_ref_for_node`, `start_node` → `write_state ... image_ref` | Saved image ref is sticky | Moving `beta` tag needs no launcher code change | None |
| Workflow | `release-android.yml` versionCode (patch ≤ 99, pre-release N 1..98) | Numbering limits | Beta numbering capped at 98; residual patch-limit risk noted | None |
| Command | `git ls-remote --tags origin` / `git tag -l 'v*'` (2026-09-27) | 310 `v*` tags: 301 strict `vX.Y.Z`, plus `v1.1.11-rc1`, `v1.2.26-rc1..3`, `v2026.02.26-personal-desktop-e2e.1..3`, `voice-runtime-v0.1.0/1` | Canonical recognized-release-tag grammar (ARCH-002) | None |
| Source | `electron-updater` `BaseUpdater.addQuitHandler`, `MacUpdater.doDownloadUpdate` (per ARCH-REV-001) | A downloaded update installs on quit when `autoInstallOnAppQuit=true` | Channel change refused while an update is staged (ARCH-001, CR-002) | None |
| Runtime + source (CR-002 / API-F-001) | `api-e2e-evidence/harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`, `br02-browser-downloaded-lock-bypass.json`; `appUpdater.ts` `checkForUpdates` guard (checking/downloading only); `AboutSettingsManager.vue` Check enabled in `downloaded` (preserved); electron-updater `DownloadedUpdateHelper` (the staged file is cleared only by `clear()` or a new download) and the quit handler registered at download | `downloaded` is not sticky. A manual (or failed) check moves the status to `available`/`error` while the update stays staged, so a status-only lock can be bypassed | The lock keys on a sticky per-process `updateStaged` fact, not on status | Install-on-quit not observed live (ad-hoc signing); consequence from library source |

## Intended Change

1. Beta tags (`vX.Y.Z-beta.N`) are published as GitHub pre-releases with generated notes. Stable tags are unchanged.
2. The desktop app gets a persisted Stable/Beta preference that drives electron-updater's pre-release policy, exposed as a switch in About → Updates, plus a Beta badge.
3. Docker publishes a moving `beta` tag that only moves forward.
4. The operator script gets a `beta` command backed by a shared release-version helper.
5. Docs and launcher help are updated.

**Scope note (evidence-only clarification, SR-003):** Realizing REQ-006 ("generated notes are used" for betas) requires the Android workflow's release-notes-mode step to follow the same pre-release rule, because Android writes the same GitHub release body. This is the only Android change. Intended behavior is unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / ACs | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001; AC-001, AC-002 | Tag push / manual dispatch | Always non-pre-release; curated notes | `-` tag → pre-release + generated notes; stable unchanged | DS-001 |
| BEH-002 | System | REQ-002, REQ-003; AC-003 | Startup/manual check | `allowPrerelease` from version | Stable → `allowPrerelease=false`; old installs are protected by the GitHub flag | DS-002 |
| BEH-003 | User | REQ-004, REQ-005, REQ-009; AC-004..007, AC-011 | About switch | None | Persisted channel → policy → re-check | DS-003, DS-002 |
| BEH-004 | User | REQ-007; AC-008 | Switch off on a beta | None | `allowDowngrade=false`; explanatory text | DS-003 |
| BEH-005 | User | REQ-008; AC-010 | About open | Raw version | Beta badge from `currentVersionIsPrerelease` | DS-003 |
| BEH-006 | Operational | REQ-006; AC-009 | `desktop-release.sh beta` | None | next-beta computation → bump → commit → tag → push | DS-004 |
| BEH-007 | Operational | AC-012 | Tag push | Android/iOS pre-release handling | Preserved (Android notes mode aligned) | DS-001 |
| BEH-008 | Operational | REQ-010, REQ-011; AC-013..017 | Tag push; `upgrade --all [--tag beta]` | No `beta` tag | Moving forward-only `beta` tag; docs/help | DS-005 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: `AppUpdater` already centralizes updater policy, state and IPC. The About page and store already mirror that state. Each release workflow already has a single metadata step that classifies the tag.
- Design response: Extend the existing owners. Add one small persistence file beside the updater, and one shared release-version helper so version ordering isn't duplicated in shell across the script and the Docker workflow.
- Refactor rationale: None needed. `desktop-release.sh` gets a local extraction of its commit/tag/push tail so `release` and `beta` share it.
- Deferrals / residual risk: Android patch ≤ 99 limit (stable `1.4.99` is the last patch-line version) is pre-existing and out of scope. The feed-order dependence on the beta channel is RSK-001 (accepted, see Risks).

## Terminology

- **Update channel:** the desktop preference `stable` | `beta`.
- **Pre-release tag:** a `vX.Y.Z-<pre>` tag. This project issues only `-beta.N`.
- **Recognized release tag (canonical grammar, ARCH-002):** exactly `^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-beta\.([1-9][0-9]*))?$`. That is strict `vMAJOR.MINOR.PATCH` (stable) or `vMAJOR.MINOR.PATCH-beta.N` (beta), with no leading zeros and N ≥ 1. Every other tag, including `v*` tags such as `v1.2.26-rc1`, `v2026.02.26-personal-desktop-e2e.3` and `voice-runtime-v0.1.1`, is **not** a release tag for ordering purposes and is ignored by `release_versions.py`. Precedence follows semver 2.0: `X.Y.Z-beta.N < X.Y.Z`, and betas compare by numeric N.
- **Moving tag:** a Docker tag that is re-pointed on publish (`latest`, `beta`).

## Design Reading Order

Standard.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the tag-push `PRERELEASE="false"` hard-code in `release-desktop.yml`. No compatibility branch is kept.

## Persisted Data / State Transition Decision

- Stored subject: `app-update-channel.v1.json` in Electron `userData`, shape `{ "channel": "stable" | "beta" }`, a few bytes.
- Change: new file.
- Reader/writer: `appUpdateChannelStore.ts` only.
- Invariants: a missing, unreadable or invalid value means `stable` (REQ-005).
- Constraints: local only; never sent to the server.
- Decision: `Directly Usable — No Migration`. Existing installs have no file, which reads as `stable`; that matches their current effective policy once betas are GitHub pre-releases.
- Supports: AC-006, AC-007.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary E2E | BEH-001, BEH-007 | Tag push | GitHub release (pre-release or stable) | `release-desktop.yml` prepare-release metadata | Decides who can ever see a build |
| DS-002 | Primary E2E | BEH-002, BEH-003 | Startup/manual check | Update offered or not | `AppUpdater` | Applies the channel policy on every check |
| DS-003 | Primary E2E | BEH-003..005 | About switch | Persisted channel + re-check + UI | `AppUpdater.setUpdateChannel` | User opt-in/out |
| DS-004 | Primary E2E | BEH-006 | `desktop-release.sh beta` | Pushed beta tag | `desktop-release.sh` + `release_versions.py` | One-step beta |
| DS-005 | Primary E2E | BEH-008 | Tag push | Docker `:beta` moved or not | `release-server-docker.yml` build-and-push final "Move beta tag" step | Docker beta track |

## Primary Execution Spine(s)

- DS-001: `tag push → prepare-release (prerelease = tag has '-') → build jobs → publish-release (notes mode: prerelease → generated) → GitHub Release [pre-release | latest]`
- DS-002: `startup timer / IPC app-update:check → AppUpdater.checkForUpdates → applyChannelPolicy (allowPrerelease = channel==='beta', allowDowngrade=false) → autoUpdater.checkForUpdates → GitHubProvider (/releases/latest | releases.atom) → update-available / update-not-available → state broadcast`
- DS-003: `About switch → appUpdateStore.setUpdateChannel → preload setAppUpdateChannel → IPC app-update:set-channel → AppUpdater.setUpdateChannel → [isAppUpdateChannelLocked(state) (status ∈ {checking, downloading, installing} OR updateStaged) → refuse, return {state, persisted:false, accepted:false}] → appUpdateChannelStore.save → applyChannelPolicy → (idle | no-update | available | error) ? checkForUpdates('manual') → AppUpdateChannelChangeResult {accepted, persisted, state}`
- DS-004: `desktop-release.sh beta [--base] → git fetch --tags → release_versions.py next-beta → set package version → commit → annotated tag → push branch + tag → DS-001`
- DS-005: `tag push → prepare-release (tags = :<version> [+ :latest if stable], unchanged) → build-and-push → final step "Move beta tag" (default variant only): git fetch --tags --force origin → release_versions.py is-newest <tag> → true ? docker buildx imagetools create -t <image>:beta <image>:<version> : skip`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The metadata step classifies the tag once; every later step reads `prerelease`. A beta publishes as a pre-release with generated notes, so `/releases/latest` keeps pointing to the last stable. | tag, release | prepare-release | notes mode |
| DS-002 | Before every check (startup or manual), the updater re-applies the current channel to electron-updater, so a switch change takes effect on the next check without restart. Stable reads only `/releases/latest`; beta reads the newest feed entry. Downgrade is always off. | channel, update info | AppUpdater | error classifier (unchanged) |
| DS-003 | The switch sends the new channel to the main process, which persists it, applies it and, when idle, immediately re-checks so a stale "available" from the old channel is replaced. While checking, downloading or installing, **or once any update has been downloaded (staged) in this app session**, the switch is disabled in the UI and the main process refuses the change. A staged update installs on quit (`autoInstallOnAppQuit`, preserved), and a later manual or failed check doesn't unstage it. The lock is therefore a sticky `updateStaged` fact, not the transient `downloaded` status (ARCH-001, CR-002). A failed save is reported to the store through `persisted:false` (ARCH-004). | channel | AppUpdater | channel store |
| DS-004 | The script asks the helper for the next beta version (base = next patch after highest stable unless `--base`; N = highest existing beta N + 1, max 98; refuses if the stable tag for the base exists) and reuses the release tail without touching curated notes. | version, tag | desktop-release.sh | release_versions.py |
| DS-005 | After the version image is pushed, a short final step re-fetches tags and asks whether this tag is the highest **recognized release tag**. Only then does it re-point `:beta` to the already-pushed version image (a manifest copy, no rebuild). Evaluating after the long build closes the concurrent-run race (ARCH-003). Using the canonical grammar keeps non-release `v*` tags from blocking it (ARCH-002). `latest` logic is unchanged. | tag, image tags | docker build-and-push final step | release_versions.py |

## Spine Actors / Main-Line Nodes

`prepare-release` steps (desktop, Docker); `AppUpdater`; `appUpdateStore`; `AboutSettingsManager.vue`; `desktop-release.sh`.

## Ownership Map

- `AppUpdater`: sole owner of the channel policy applied to electron-updater, channel state in `AppUpdateState`, and the `set-channel` command semantics (busy guard, re-check).
- `appUpdateChannelStore.ts`: file I/O and validation of the preference only. No policy.
- `appUpdateStore` (renderer): mirrors state; forwards commands; shows an error toast on IPC failure. No policy.
- `AboutSettingsManager.vue`: presentation only.
- `release_versions.py`: semver parsing, precedence, `next-beta`, `is-newest`. No git mutations.
- `desktop-release.sh`: git/package mutations and operator UX.
- Workflow metadata steps: tag classification per pipeline.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| preload `setAppUpdateChannel` | AppUpdater | IPC bridge | validation or policy |
| IPC `app-update:set-channel` handler | AppUpdater | transport | persistence details |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Tag-push `PRERELEASE="false"` in release-desktop.yml | Wrong classification | `-`-based classification | In This Change | — |
| Duplicated commit/tag/push tail inside `release` | Shared with `beta` | Local function in desktop-release.sh | In This Change | Behavior identical |
| `APP_UPDATE_CHANNEL_LOCKED_STATUSES` (status-only lock set) | Bypassable after a check (CR-002) | `isAppUpdateChannelLocked(state)` + `updateStaged` | In This Change | Remove the set and its imports |

## Return Or Event Spine(s)

State broadcast: `AppUpdater.applyState → webContents 'app-update-state' → appUpdateStore.applyRemoteState` (unchanged; now carries `updateChannel`, `currentVersionIsPrerelease`).

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Channel persistence | DS-002/3 | AppUpdater | read/write/validate JSON | isolates I/O | policy mixed with I/O |
| Semver ordering | DS-004/5 | script, Docker workflow | precedence, next-beta, is-newest | one correct implementation | `sort -V` misorders `X.Y.Z` vs `X.Y.Z-beta.N` |
| Release-notes mode | DS-001 | publish jobs | curated vs generated | stale notes on betas | — |
| Localization | DS-003 | About page | en + zh-CN strings | existing convention | — |

## Ownership Boundaries

- Renderer → main only through preload `electronAPI`. The renderer never computes the updater policy.
- `AppUpdater` is the only code that touches `autoUpdater` properties.
- Workflows call `release_versions.py` read-only; only `desktop-release.sh` mutates git.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AppUpdater.setUpdateChannel` | store save, policy, re-check | IPC handler | renderer writing the file; setting `autoUpdater.channel` anywhere | extend AppUpdater |
| `release_versions.py` | semver precedence | desktop-release.sh, Docker workflow | ad-hoc `sort -V`/grep ordering | add subcommand |

## Dependency Rules

- `electron/updater/*` may depend on `electron`, `electron-updater`, `../logger` and `shared/appUpdateTypes`. The renderer depends only on `shared/appUpdateTypes` and `window.electronAPI`.
- Never set `autoUpdater.channel` (it forces `allowDowngrade=true`).
- `release_versions.py` uses the Python standard library only.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity / Shape | Notes |
| --- | --- | --- | --- | --- |
| IPC `app-update:set-channel` (preload `setAppUpdateChannel(channel)`) | update channel | persist + apply + maybe re-check | `'stable' \| 'beta'` → `AppUpdateChannelChangeResult { accepted: boolean; persisted: boolean; state: AppUpdateState }` | `accepted:false` when the value is invalid or `isAppUpdateChannelLocked(state)` (status ∈ {checking, downloading, installing} or `updateStaged`) (channel unchanged). `accepted:true, persisted:false` when the file write failed: the channel is applied for this session only and the store shows the save-failed toast. No new `AppUpdateState` error fields (ARCH-004) |
| `AppUpdateState.updateChannel` | channel | current preference | `AppUpdateChannel` | new field |
| `AppUpdateState.currentVersionIsPrerelease` | running build | Beta badge | boolean (`/^\d+\.\d+\.\d+-/` on `app.getVersion()`) | new field |
| `release_versions.py next-beta [--base X.Y.Z] [--tags-file F]` | next beta version | prints `X.Y.Z-beta.N` | input tags from `git tag -l` or file; only recognized release tags (canonical grammar) are considered; `--base` must be strict `X.Y.Z` | exit ≠ 0 with message on refusal (stable for base exists; N would exceed 98; invalid base; no stable tag found and no `--base`) |
| `release_versions.py is-newest <tag> [--tags-file F]` | tag ordering | prints `true`/`false`, exit 0 | candidate + input tags; canonical grammar only | Prints `false` if the candidate is outside the grammar (e.g. `v1.2.26-rc1`). Otherwise `true` iff no recognized tag has higher precedence. Non-recognized input tags are ignored |
| `desktop-release.sh beta [--base X.Y.Z] [--branch B] [--no-push]` | beta release | operator command | — | no curated notes |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| set-channel | Yes | Yes | Low | — |
| next-beta / is-newest | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| channel type | `AppUpdateChannel` | Yes | Low | — |
| store file | `appUpdateChannelStore.ts` | Yes | Low | — |
| helper | `scripts/release_versions.py` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Updater policy/state | `electron/updater/appUpdater.ts` | Extend | Existing owner |
| Local JSON persistence | pattern in `nodeRegistryStore.ts` | Reuse pattern (new small file) | Different subject |
| Settings switch UI | existing settings toggle styling | Reuse | Consistency |
| Version ordering | none (shell regex only) | Create New `release_versions.py` | Needed by two callers; shell cannot order semver pre-releases correctly |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| Electron updater | channel policy, persistence, IPC | DS-002/3 | Extend |
| Renderer settings | switch, badge, store action, strings | DS-003 | Extend |
| Release CI | classification, notes mode, Docker beta tag | DS-001/5 | Extend |
| Release tooling | beta command, version helper | DS-004/5 | Extend + Create |
| Docs/help | channel docs, Docker beta usage | — | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no changes after extraction review).

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Why Shared | Must Not Become |
| --- | --- | --- | --- | --- |
| `AppUpdateChannel` type | `shared/appUpdateTypes.ts` | shared types | main + renderer | a settings bag |
| Semver precedence | `scripts/release_versions.py` | release tooling | script + Docker workflow | a general release orchestrator |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AppUpdateState` additions | Yes | Yes | Low | Do not also add `allowPrerelease` to state. `updateStaged` means exactly "an update was downloaded in this app process and will install on quit". It is set on `update-downloaded`, never cleared within the process, and false at startup |
| `AppUpdateChannelChangeResult` | Yes | Yes | Low | Command result only; not mirrored into store state |

## Final File Responsibility Mapping

| File | Area | Change | Concern |
| --- | --- | --- | --- |
| `autobyteus-web/shared/appUpdateTypes.ts` | shared | Change | `AppUpdateChannel`; `AppUpdateChannelChangeResult`; `updateChannel`, `currentVersionIsPrerelease`, `updateStaged` on state; the single lock rule `isAppUpdateChannelLocked(state)` shared by main and renderer (replaces the status-only `APP_UPDATE_CHANNEL_LOCKED_STATUSES` set, which is removed) |
| `autobyteus-web/electron/updater/appUpdateChannelStore.ts` | updater | New | `loadAppUpdateChannel(userDataPath)`, `saveAppUpdateChannel(userDataPath, channel): boolean`; file `app-update-channel.v1.json`; invalid → `stable` |
| `autobyteus-web/electron/updater/appUpdater.ts` | updater | Change | Load channel in `initialize()` via `app.getPath('userData')`; `applyChannelPolicy()` before each check; `setUpdateChannel()`; `IPC_SET_CHANNEL`; initial state fields |
| `autobyteus-web/electron/preload.ts` | bridge | Change | `setAppUpdateChannel` |
| `autobyteus-web/electron/types.d.ts`, `autobyteus-web/types/electron.d.ts` | types | Change | new method signature |
| `autobyteus-web/stores/appUpdateStore.ts` | renderer | Change | defaults + `setUpdateChannel` action: apply `result.state`; toast save-failed when `persisted:false`; toast generic error on IPC rejection; no-op on `accepted:false` |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | renderer | Change | switch + description + Beta badge; disabled when not Electron or `isAppUpdateChannelLocked(state)`; when `updateStaged`, a hint says to install/restart before changing the channel (shown regardless of later status). Check button behavior unchanged |
| `autobyteus-web/localization/messages/en/settings.ts`, `.../zh-CN/settings.ts` | i18n | Change | switch label, description, badge, save-failed message, downloaded-state hint |
| `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts`, new `appUpdateChannelStore.spec.ts`, `components/settings/__tests__/AboutSettingsManager.spec.ts`, store spec if present | tests | Change/New | AC-003..008, AC-010, AC-011 |
| `.github/workflows/release-desktop.yml` | CI | Change | classification + notes mode |
| `.github/workflows/release-android.yml` | CI | Change | notes mode only |
| `.github/workflows/release-server-docker.yml` | CI | Change | Keep prepare-release tags unchanged. Add a final build-and-push step (default variant only): `git fetch --tags --force origin` → `is-newest` → `docker buildx imagetools create -t <image>:beta <image>:<version>`; add the result to the job summary |
| `scripts/release_versions.py` | tooling | New | semver helper |
| `scripts/tests/test_release_versions.py` | tests | New | ordering, next-beta, is-newest, refusals; fixture = the real origin `v*` inventory (301 stable `vX.Y.Z` plus `v1.1.11-rc1`, `v1.2.26-rc1..3`, `v2026.02.26-personal-desktop-e2e.1..3`, `voice-runtime-v0.1.0/1`) |
| `scripts/desktop-release.sh` | tooling | Change | `beta` command; shared tail; usage |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh`, `.../powershell/Core.ps1` | launcher | Change | help text for `--tag beta` / back to `latest` |
| `autobyteus-server-ts/docker/README.md` | docs | Change | beta track + downgrade caution |
| `autobyteus-web/docs/github-actions-tag-build.md`, `autobyteus-web/docs/electron_packaging.md` | docs | Change | release channels; updater channel policy |

## Applied Patterns

- Policy applied at the point of use (before each check) rather than cached in electron-updater.
- Forward-only moving tag guarded by version precedence.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. Existing folders only, plus one new file each in `electron/updater/` and `scripts/`.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `electron/updater/` | Off-spine + main-line | Yes | Low | store beside its only consumer |
| `scripts/` | tooling | Yes | Low | matches other release helpers |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Channel application | `autoUpdater.allowPrerelease = channel === 'beta'; autoUpdater.allowDowngrade = false;` before `checkForUpdates()` | `autoUpdater.channel = 'beta'` | the setter enables downgrade |
| Ordering | `1.4.90-beta.2 < 1.4.90-beta.10 < 1.4.90 < 1.4.91-beta.1` | `sort -V` | shell sort misorders pre-releases |
| next-beta | tags `v1.4.89`, `v1.4.90-beta.1`, `v1.4.90-beta.2` → `1.4.90-beta.3`; with `v1.4.90` present → default base `1.4.91` → `1.4.91-beta.1` | reusing a base whose stable exists | stable must stay above its betas |
| Docker tags | beta newest: `:1.4.90-beta.3`, then final step `:beta`; stable newest: `:1.4.90`, `:latest`, then `:beta`; re-publish of old `v1.4.80`: `:1.4.80`, `:latest` (existing behavior), no `:beta` | moving `beta` on any tag | forward-only |
| Real tag inventory (ARCH-002) | tags include `v1.4.89`, `v2026.02.26-personal-desktop-e2e.3`, `v1.2.26-rc3`, `voice-runtime-v0.1.1`: `is-newest v1.4.90-beta.1` → `true` (the e2e/rc/voice tags are ignored); `is-newest v1.2.26-rc1` → `false` (outside grammar); `next-beta` → `1.4.90-beta.1` | lax `^v?\d+\.\d+\.\d+([-.][0-9A-Za-z.]+)?$` parsing `v2026.02.26-…` as 2026.2.26 | without this, `:beta` would never publish |
| Concurrent betas (ARCH-003) | `beta.1` and `beta.2` pushed 14 min apart: `beta.1`'s final step re-fetches tags, sees `v…-beta.2`, and skips; `beta.2` moves `:beta` | deciding `:beta` in prepare-release | the later build wins deterministically |
| Switch after a download (ARCH-001, CR-002) | `downloaded` → Check → `available` (or `error`): `updateStaged` is still true, the switch is still disabled with the hint, and `setUpdateChannel('stable')` returns `accepted:false` | a status-only lock (`downloaded` ∈ locked set) that a manual check unlocks | a staged beta must not install after opt-out (REQ-007) |
| Desktop classification | tag `v1.4.90-beta.3` → `prerelease=true`, generated notes; tag `v1.4.90` → `prerelease=false`, curated notes | — | — |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep tag-push `PRERELEASE=false` with an opt-in input | minimize change | Rejected | classification by tag |
| Migrate old installs to an explicit `stable` file | "explicitness" | Rejected | missing file = stable |
| Channel-named metadata files (`beta*.yml`) via `generateUpdatesFilesForAllChannels` | electron-builder feature | Rejected (N/A for the GitHub provider) | `latest*.yml` + GitHub pre-release flag |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. `scripts/release_versions.py` + tests.
2. Workflows: desktop classification + notes mode; Android notes mode; Docker checkout/`is-newest`/`:beta`.
3. `desktop-release.sh beta` (reuse helper; extract shared tail).
4. Shared types → channel store → AppUpdater (policy, command, IPC) → preload/types.
5. Renderer store → About page → localization.
6. Tests for updater, store and About page.
7. Docs and launcher help.

## Key Tradeoffs

- **Re-check on switch change:** chosen so a stale "available" from the other channel is never downloaded. The cost is one network call per toggle.
- **Disable during busy states and while an update is staged:** chosen instead of cancelling downloads or discarding staged updates (electron-updater has no supported "unstage"). Also rejected: blocking manual checks in `downloaded` (changes preserved Check behavior) and toggling `autoInstallOnAppQuit` on opt-out (changes preserved install-on-quit and may not stop Squirrel on macOS). Once an update is staged, the channel can't change for the rest of the app session, even if a later check changes the status. The user installs or restarts (which installs, per preserved `autoInstallOnAppQuit`) and can then change the channel on the running version. This keeps REQ-007 truthful (ARCH-001).
- **Moving `beta` tag instead of retargeting `latest`:** keeps Docker stable users unaffected.
- **Post-push `:beta` move with a re-fetch instead of workflow-wide serialization:** a small step with no cross-tag locking (ARCH-003).
- **Command result instead of state error fields for save failures:** keeps `AppUpdateState` errors meaning updater errors only (ARCH-004).
- **Android notes-mode touch:** required for a consistent shared release body.

## Risks

- **RSK-001 (accepted):** beta-channel resolution uses the newest-created feed entry. Tag pushes create releases in version order, and a manual re-publish updates an existing release, so the order holds. Worst case is "no update" until the next release; never a downgrade.
- **Release-window race (pre-existing):** the Android job may create the GitHub release before desktop metadata is uploaded; a check in that window gets the existing classified "release preparing / metadata" error. Unchanged.
- **Android patch ≤ 99 (pre-existing):** the stable line will need a minor bump after `1.4.99`; the script default base follows the highest stable.
- **The first beta run is the real proof** of UNK-001's resolution; validation must inspect release assets.
- **Failed newer build (accepted, bounded):** if tag N+1 exists but its Docker build fails, N's final step still sees N+1 and skips, so `:beta` stays one build behind until N+1 is re-run. Remedy: re-run the failed workflow (`workflow_dispatch` with that `release_tag`). Documented in the release runbook.

## Guidance For Implementation

- `desktop-release.sh beta` must `git fetch --tags origin` before computing the version, and must refuse a dirty worktree or the wrong branch like `release` does.
- Manual dispatch of the desktop workflow with a `-` tag must force `prerelease=true`, regardless of the input.
- Docker: do not add `:beta` in prepare-release. In build-and-push, after the default-variant push, run `git fetch --tags --force origin`, then `python3 scripts/release_versions.py is-newest "$RELEASE_TAG"`, and if `true` run `docker buildx imagetools create -t "$IMAGE:beta" "$IMAGE:$NORMALIZED_TAG"`. Log the decision in the job summary. Skip entirely for the zh variant.
- `setUpdateChannel` must:
  1. Refuse (`accepted:false`) an invalid value or when `isAppUpdateChannelLocked(state)` is true (status ∈ {checking, downloading, installing} or `updateStaged`). Set `updateStaged=true` in the `update-downloaded` handler, never reset it within the process, and initialize it `false`.
  2. Otherwise persist the value. On write failure, log it, still apply in memory, and return `persisted:false`.
  3. Apply the channel policy and update `state.updateChannel`.
  4. Re-check only if `app.isPackaged` and status ∈ {idle, no-update, available, error}.
  5. Return `{accepted, persisted, state}`.
- `release_versions.py` must implement exactly the canonical grammar in Terminology. Tests must use the real inventory fixture and cover: e2e/rc/voice tags ignored; an `-rc` candidate → `false`; `beta.10 > beta.9`; stable > its betas; next-beta when betas exist for the base; refusal when the stable tag for the base exists; refusal past 98.
- About copy (en): "Receive beta updates" / "Get early builds before they are released to everyone. Turning this off keeps your current version until a newer stable release is available." Badge: "Beta".
- Validation (API/E2E): unit/component tests (including AC-008: switch disabled and command refused in `downloaded`, and still refused after a subsequent manual check that ends `available`, `no-update` or `error` — regression for CR-002 / API-F-001); `python3 -m unittest` for scripts; a real beta tag CI run (or `manual-dispatch` with a `-beta` tag) inspecting GitHub release flags and assets, Docker tags and the Android release; packaged-app check of both channels where feasible.
