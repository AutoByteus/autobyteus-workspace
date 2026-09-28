# Investigation Notes

## Investigation Meta

- Package identifier: `desktop-beta-update-channel`
- Request / ticket: Stable/Beta desktop update channel so frequent self-test releases do not reach ordinary users
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel` / `codex/desktop-beta-update-channel`
- Resolved base remote / branch / revision: `origin/personal` @ `82f3359cb9b98f0a5caa0dad79e24e9a58801a46` (fetched 2026-09-27; "chore(release): bump workspace release version to 1.4.89")
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`; shared checkout left untouched (it has unrelated local modifications and is 7 commits behind).
- Bootstrap blocker: None
- Current solution revision ID: `SR-005`
- Investigation status: Requirements and architecture investigation complete

## Initial Request And Clarifications

- Original request (paraphrased): The user releases many desktop versions per day (one per merge) so they can install and test the latest build through the in-app "download and upgrade" flow. Ordinary users see all of these versions and find the release rate annoying. The user wants frequent builds for themself, with only deliberately chosen releases offered to ordinary users. Asked for best practice and a proposal.
- Clarifications received:
  1. Channels: "Stable/Beta is enough" (no Nightly tier).
  2. Toggle: the user asked whether it could be a Basic Settings toggle like "enable Applications". After being told Basic Settings is server-scoped and updates are desktop-scoped, the user accepted the recommendation to put it in Settings → About → Updates, saved locally ("I like your suggestion").
  3. Behavior: the user turns it on once and keeps receiving betas. Other users don't see betas unless they choose to turn it on. It's up to each user.
  4. Scope for Docker/Android/iOS: the user deferred to the designer's recommendation ("What do you suggest").
- User-supplied facts: Releases are cut per merge for self-testing; up to several per day.
- Initial ambiguity: The user said "minor versions" but meant pre-release builds not intended for users (clarified in terminology).

## Product And Domain Understanding

- Product area: Desktop (Electron) app update delivery and the release pipeline
- Affected actors: Release operator/developer (the user); ordinary desktop users; opt-in beta users; CI release workflows
- Existing purpose: In-app update lets users check, download and install new desktop versions published as GitHub Releases
- Terminology: **Stable** = normal GitHub release (`vX.Y.Z`). **Beta** = semver pre-release (`vX.Y.Z-beta.N`) published as a GitHub pre-release. **Channel** = which of these a desktop install is offered.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-27 | Command | `git for-each-ref --sort=-creatordate refs/tags` grouped by date | Release cadence | 6 tags on 2026-09-26, 4 on 09-21, 2–3 most days; latest `v1.4.89` | None |
| 2026-09-27 | Code | `.github/workflows/release-desktop.yml` `prepare-release` step (lines ~45–50) | How tag pushes are classified | Tag push always sets `PRERELEASE="false"`, even for tags containing `-` | Desired change BEH-001 |
| 2026-09-27 | Code | `.github/workflows/release-desktop.yml` publish steps (`softprops/action-gh-release@v2`) | What gets published | Publishes DMG/ZIP/EXE/AppImage + `latest-mac.yml`, `latest-linux*.yml`, `latest.yml`; `prerelease` taken from metadata | Architecture: channel-file naming for beta versions |
| 2026-09-27 | Code | `autobyteus-web/build/scripts/build.ts` `resolveUpdaterPublishConfig()` | Update feed source | GitHub provider, owner/repo from `AUTOBYTEUS_UPDATER_REPOSITORY`/`GITHUB_REPOSITORY`/git remote | None |
| 2026-09-27 | Code | `autobyteus-web/electron/updater/appUpdater.ts` `initialize()` / `checkForUpdates()` | Current updater behavior | `autoDownload=false`, `autoInstallOnAppQuit=true`; startup check after 8s in packaged builds; manual check/download/install via IPC; `allowPrerelease`/`channel` never set | Channel setting must drive `allowPrerelease` |
| 2026-09-27 | Code | `node_modules/.pnpm/electron-updater@6.8.3/.../out/AppUpdater.js` line ~218 | Default prerelease policy | `allowPrerelease` defaults to `true` iff the running app version has a semver pre-release component | Existing stable installs (≤1.4.89) already default to `false` |
| 2026-09-27 | Code | `.../out/providers/GitHubProvider.js` `getLatestVersion()` / `getLatestTagName()` | How the GitHub provider selects a release | `allowPrerelease=false`: uses `/releases/latest`, which GitHub resolves to the newest non-draft, non-prerelease release. `allowPrerelease=true`: takes the newest entry in `releases.atom` (by creation) and loads the `<prerelease-id>-*.yml` channel file for pre-release tags, falling back to `latest*.yml` | Stable users are protected by the GitHub pre-release flag alone; the beta path depends on the feed order and the channel-file name |
| 2026-09-27 | Code | `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue`, `ApplicationsFeatureToggleCard.vue`, `stores/applicationsCapabilityStore.ts` | Where the user proposed the toggle | Basic Settings hosts server-scoped capability toggles persisted on the connected server | The update channel is desktop-scoped; putting it here would let a remote/Docker node control desktop updates |
| 2026-09-27 | Code | `autobyteus-web/components/settings/AboutSettingsManager.vue`, `stores/appUpdateStore.ts`, `electron/preload.ts` (`app-update:*` IPC) | Existing update UI | Settings → About → "AutoByteus Updates" shows version/status/last checked plus Check/Download/Install buttons. Check is disabled when not in Electron | Natural home for the channel toggle |
| 2026-09-27 | Code | `.github/workflows/release-android.yml` metadata step | Android handling of `-` tags | Tag containing `-` → GitHub release `prerelease=true`. Pre-release number must be 1..98 (versionCode) | No change needed; numbering constraint |
| 2026-09-27 | Code | `.github/workflows/release-ios.yml`, `autobyteus-ios/scripts/resolve-ios-release-metadata.py` | iOS handling of `-` tags | Tag push → upload to App Store Connect/TestFlight. Pre-release label → `prerelease=true`. Upload does not release to the App Store | No change needed |
| 2026-09-27 | Code | `.github/workflows/release-server-docker.yml` metadata step | Docker handling of `-` tags | Tag containing `-` → `IS_PRERELEASE=true`, `latest` image tag not moved | No change needed |
| 2026-09-27 | Code | `scripts/desktop-release.sh` | Operator release entry point | `release <version> --release-notes <file>` bumps version, syncs curated notes, commits, tags, pushes. Version regex already accepts `1.2.7-rc1`-style suffixes | Needs a beta entry point without curated notes |
| 2026-09-27 | Code | `scripts/public/docker/autobyteus-docker.d/bash/core.sh` (`DEFAULT_TAG="latest"`), `docker-runtime.sh` `upgrade_image_ref_for_node` / `upgrade_all_nodes` / `start_node` (`docker pull`, `write_state ... image_ref`) | How `upgrade --all` picks the image | Each node's saved image ref is re-pulled; an explicit `--tag`/`--image` retargets all nodes and is saved as the new ref; the default is `autobyteus/autobyteus-server:latest` | A moving `beta` tag lets a one-time `--tag beta` make later plain upgrades follow betas without launcher code changes |
| 2026-09-27 | Doc | `autobyteus-server-ts/docker/README.md` lines ~97–109 | Documented upgrade semantics | "`latest` nodes stay on `latest` and `latest-zh` nodes stay on `latest-zh`" | Same pattern for `beta` |
| 2026-09-27 | Code | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` (existence) | Downgrade risk | The server runs app-data migrations | Returning from `beta` to an older `latest` may run an older server on migrated data; guidance needed |
| 2026-09-27 | Doc | `autobyteus-web/tickets/done/mac-arm64-updater-signing/investigation-notes.md` | Prior incident | v1.3.61–63 were published within hours on 2026-06-19 with a broken updater artifact that reached users | Supports a buffer between self-test and user exposure |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Operator pushes a `v*` tag (via `desktop-release.sh release`) | CI builds all desktop platforms and publishes a GitHub Release | Always a full (non-pre-release) release, so it becomes GitHub "latest" | release-desktop.yml | High |
| BEH-002 | System | Startup auto-check (packaged builds) or manual "Check for updates" | electron-updater with `allowPrerelease` defaulting from the app version resolves `/releases/latest` and compares versions | Every published tag is offered to every desktop user | appUpdater.ts, GitHubProvider.js | High |
| BEH-003 | User | — | No current supported behavior (no channel choice) | — | AboutSettingsManager.vue | High |
| BEH-004 | User | — | No current supported behavior (no opt-out path) | — | — | High |
| BEH-005 | User | Open Settings → About | Shows the raw version string | Pre-release builds are not labelled | AboutSettingsManager.vue | High |
| BEH-006 | Operational | Operator runs `desktop-release.sh release <version> --release-notes <file>` | Bump → sync notes → commit → tag → push | Curated notes are always required | desktop-release.sh | High |
| BEH-007 | Operational | Tag push triggers Android/iOS/Docker workflows | Each classifies `-` tags as pre-release | Android: GitHub pre-release. iOS: TestFlight upload marked pre-release. Docker: version tag only, no `latest` move | workflow files | High |
| BEH-008 | Operational | `autobyteus-docker upgrade --all` | Re-pulls each node's saved image ref (default `:latest`) and recreates containers | After a beta release, `latest` nodes stay on stable. Following betas requires `--tag <exact-version>`, which pins nodes to that version | docker-runtime.sh | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `electron/updater/appUpdater.ts` | Owns electron-updater lifecycle and IPC | Channel must apply to startup and manual checks | Where the channel preference is read/applied before each check |
| `electron-updater@6.8.3` GitHubProvider | Release resolution | Stable protection comes from the GitHub pre-release flag | Beta path uses `releases.atom` order; a manual re-publish of an old tag could appear "newest" (version comparison still prevents downgrade) |
| electron-builder channel files | For version `X.Y.Z-beta.N`, builder names update metadata by channel (expected `beta-mac.yml` etc.) | Beta releases must carry valid updater metadata | Workflow hard-codes `latest-*.yml` paths, the mac merge script and the Linux validator; must be reconciled (verify builder output) |
| Electron `userData` (e.g. `nodeRegistryStore.ts` pattern) | Existing local JSON persistence per install | Toggle persists locally and survives restart/upgrade | Reuse the local-persistence pattern |
| `release-desktop.yml` + Android workflow publish to the same GitHub release tag | Both call `softprops/action-gh-release` for the same tag | Today they disagree on `prerelease` for `-` tags (desktop=false, Android=true) | Aligning desktop removes that inconsistency |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- GitHub Release assets and updater metadata YAML (`latest*.yml` / channel variants)
- Local desktop preference file (new)
- Evidence paths: release-desktop.yml, scripts/merge_latest_mac_metadata.py, scripts/validate_linux_updater_metadata.py

### Structural Surfaces

- Electron main updater + preload IPC (`app-update:*`); renderer `appUpdateStore` + About page
- CI workflow metadata classification; operator release script
- Evidence paths: see Source Log

### Potential Structural Impacts To Investigate

- API or external-contract change: new IPC for reading/writing the channel preference (renderer ↔ main)
- Persistence schema or invariant change: new local preference; no server schema
- Security or privacy boundary change: None identified
- Concurrency or lifecycle change: toggling while a check/download is in flight
- Deployment change: release workflow metadata-file naming for pre-release versions
- Confirmed absent, present, or unknown: channel-file naming for beta builds is unknown until builder output is verified

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Source read of electron-updater 6.8.3 (installed) | Stable install with `allowPrerelease=false` | Only `/releases/latest` is consulted | Marking betas as GitHub pre-releases hides them from all existing stable installs, including those without the new toggle | GitHubProvider.js |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (release operator) | Needs every merge installable in-app for self-testing | Direct | Beta channel with in-app update | None |
| User on behalf of end users | Users are annoyed by release frequency | Direct | Stable users must never be offered betas | None |
| User | Each user decides whether to opt in | Direct | Toggle visible to all desktop users, off by default | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| electron-updater | 6.8.3 | Pre-release selection rules described above | installed source | Feed-order dependence for beta |
| GitHub Releases `/releases/latest` | GitHub | Excludes pre-releases and drafts | electron-updater relies on it | None |
| Semantic Versioning 2.0 | semver.org | `1.5.0-beta.3 < 1.5.0`; numeric identifiers compare numerically | — | None |
| Android versionCode | release-android.yml | Pre-release number must be 1..98 | workflow | Caps betas per base version at 98 |

## Persisted Data And State Facts

- Affected stored subject: new per-install desktop preference (update channel)
- Location: Electron user-data directory (local to the machine)
- Volume: one small value
- Current readers/writers: none (new)
- Must preserve: the value across app restarts and in-app upgrades
- Acceptable loss: if the file is missing or corrupt, fall back to Stable
- Remaining gap: None for requirements

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- The UI is a single toggle in an existing card; no prototype requested.

## Product Design Findings

- N/A — not applicable

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Exact updater metadata filenames electron-builder 25 emits for `-beta.N` versions | CI hard-codes `latest*.yml`; the beta publish could fail or ship wrong metadata | Resolved by source: GitHub provider keeps `latest*.yml`; electron-updater falls back to it. Confirm on the first real beta CI run | Resolved (source) |
| RSK-001 | Risk | On the beta channel, electron-updater picks the most recently *created* release in the feed | A re-published old tag could shadow a newer beta; the version comparison prevents a downgrade but may hide the newest build | Accepted in design (a re-publish updates an existing release, it doesn't create one) | Accepted |
| RSK-002 | Risk | Every beta tag also triggers Android/iOS/Docker builds (pre-release-safe, but costs CI time and adds TestFlight builds) | Operational noise, not user-visible | Recorded as out-of-scope recommendation | Accepted |

## Architecture Investigation Findings

| Date | Source | Observation | Design Link |
| --- | --- | --- | --- |
| 2026-09-27 | `app-builder-lib@25.1.8/out/publish/PublishManager.js` `getResolvedPublishConfig`; `electron-publish@25.1.7/out/gitHubPublisher.js` (no `checkAndResolveOptions`); `updateInfoBuilder.js` `computeChannelNames` | For the GitHub provider, the channel detected from the app version is not applied; metadata stays `latest*.yml` for `-beta.N` versions | No workflow metadata-file changes |
| 2026-09-27 | `electron-updater@6.8.3/out/providers/GitHubProvider.js` | Pre-release tag with `allowPrerelease` → tries `beta*.yml`, then falls back to `latest*.yml` | Beta installs resolve metadata |
| 2026-09-27 | `electron-updater@6.8.3/out/AppUpdater.js` `set channel` | Setting `channel` forces `allowDowngrade=true` | Never set `channel`; set `allowDowngrade=false` explicitly |
| 2026-09-27 | `.github/workflows/release-desktop.yml` and `release-android.yml` "Resolve release notes mode" | The curated notes file persists in the repo, so a beta would publish stale stable notes; both jobs write the same GitHub release | Pre-release → generated notes in both |
| 2026-09-27 | `electron/application/electronApplication.ts` lines 67, 352, 382 | AppUpdater is constructed when `updaterEnabled`, `initialize()` runs after userData is set, then `startAutoCheck()` | Load the channel in `initialize()` |
| 2026-09-27 | `shared/appUpdateTypes.ts`, `stores/appUpdateStore.ts`, `electron/preload.ts`, `electron/types.d.ts`, `types/electron.d.ts` | Single state object mirrored to the renderer; invoke-style IPC | Add a state field + one command |
| 2026-09-27 | `scripts/desktop-release.sh` `release` body | commit/tag/push tail is inline | Extract for reuse by `beta` |
| 2026-09-27 | `release-android.yml` versionCode | patch ≤ 99; pre-release N 1..98 | Beta N cap 98; residual patch risk |
| 2026-09-27 | `release-server-docker.yml` prepare-release / build-and-push | Tags are built in prepare-release; build-and-push checks out with `fetch-depth: 0`; the concurrency group is per tag, so consecutive tag runs are parallel | `:beta` is moved in a final post-push step after re-fetching tags (ARCH-003) |
| 2026-09-27 | `git fetch --tags origin && git tag -l 'v*'` | 310 `v*` tags: 301 strict `vX.Y.Z`; non-release `v*` tags: `v1.1.11-rc1`, `v1.2.26-rc1`, `v1.2.26-rc2`, `v1.2.26-rc3`, `v2026.02.26-personal-desktop-e2e.1..3`, `voice-runtime-v0.1.0`, `voice-runtime-v0.1.1` | A strict canonical grammar is required; a lax regex would read `v2026.02.26-…` as the highest version (ARCH-002) |
| 2026-09-27 | electron-updater `BaseUpdater.addQuitHandler`, `MacUpdater.doDownloadUpdate` (cited by ARCH-REV-001) | With `autoInstallOnAppQuit=true`, a downloaded update installs on the next quit | Refuse channel changes in `downloaded` (ARCH-001) |
| 2026-09-27 | CR-002 / API-F-001: E2E-07b harness JSON, BR-02 browser evidence; `appUpdater.ts` `checkForUpdates` guard; `AboutSettingsManager.vue` Check enabled in `downloaded`; electron-updater `DownloadedUpdateHelper` | `downloaded` → manual check → `available`/`error` while the update stays staged. A status-only lock unlocks and `set-channel:stable` is accepted | Lock on a sticky per-process `updateStaged` fact (SR-005) |

## Requirement Implications

- Hiding betas from stable users needs only the correct GitHub pre-release flag. Existing installs are protected without an app update.
- Opt-in requires a new desktop-local preference that drives electron-updater's pre-release policy on every check.
- Opt-out cannot downgrade. The requirements must define the "stay until the next newer stable" behavior.
- Android/iOS/Docker already treat `-` tags as pre-releases, so no change is needed there. Beta numbering is capped at 98 per base version (Android).

## Notes For Architecture Design

- Map SCN-001..SCN-006 onto: workflow metadata classification → publish assets/metadata; updater channel application; local preference persistence + IPC; About UI; release script beta command.
- Verify UNK-001 before finalizing CI changes; address RSK-001 or document it as accepted.
