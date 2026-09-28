# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result:
  - Independent architecture review was selected (Medium / High) and passed as ARCH-REV-002.
  - `get_handoff_rules` for a completed Large-or-High implementation returns `/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/requirements-doc.md` (Approved; SR-002 basis)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/solution-revision-record.md` (SR-001..SR-004)
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-spec.md` (SR-004)
- Supplemental task artifacts: None. Product Design artifacts: `N/A — not applicable`.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/architecture-review-revision-record.md`
- Solution Designer handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/handoff-solution-designer.md`
- Triggering rework report, revision record, or evidence (current round, IR-003):
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md` (ARCH-REV-003, Pass on design SR-005)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/code-review-report.md` / `code-review-revision-record.md` (CRR-003, Design Impact, finding CR-002)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-execution-coverage-report.md` / `api-e2e-revision-record.md` (API-REV-001, finding API-F-001)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-evidence/harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`
  - Earlier rounds: CRR-001 / CR-001 (IR-002). ARCH-005 from ARCH-REV-002 remains applied.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-001 initial baseline; IR-002 Local Fix for CR-001; IR-003 SR-005 staged-update lock for CR-002 / API-F-001)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-002` (requirements), `SR-005` (design; SR-004 before IR-003)
- Related architecture-review revision IDs: `ARCH-REV-003` (current); `ARCH-REV-002` (ARCH-005 applied)
- Related code-review revision IDs: `CRR-001`, `CRR-002` (Pass), `CRR-003` (Design Impact → resolved by SR-005 / IR-003)
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-002` / `API-F-001` (current round). Earlier round: `CR-001`.

Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel`, branch `codex/desktop-beta-update-channel`, base `origin/personal` @ `82f3359cb`. The code changes are **uncommitted** in the working tree, as are the ticket artifacts. Review with `git status` / `git diff` plus the untracked files listed below.

What was implemented:

1. **Release classification (DS-001)**
   - `release-desktop.yml` marks any tag containing `-` as a GitHub pre-release. This applies on tag push and on a manual dispatch with a `-` tag, whatever the `prerelease` input says.
   - The tag-push `PRERELEASE="false"` hard-code is removed.
   - Both the desktop and Android "Resolve release notes mode" steps use generated notes for `-` tags.
2. **Updater channel (DS-002/DS-003)**
   - New `appUpdateChannelStore.ts` persists `{channel}` to `userData/app-update-channel.v1.json`. A missing, unreadable or invalid file reads as `stable`.
   - `AppUpdater` loads the channel in `initialize()`.
   - `AppUpdater.applyChannelPolicy()` sets `allowPrerelease = channel === 'beta'` and `allowDowngrade = false`. It runs at initialize and immediately before every `autoUpdater.checkForUpdates()`. `autoUpdater.channel` is never set.
   - New `setUpdateChannel()` behind IPC `app-update:set-channel` returns `AppUpdateChannelChangeResult {accepted, persisted, state}`.
   - `AppUpdateState.updateStaged` (IR-003, SR-005) starts `false` and is set to `true` in the `update-downloaded` listener. It is never reset within the process, because a staged update installs on quit even after a later check moves the status on.
   - One shared lock rule, `isAppUpdateChannelLocked(state)` in `shared/appUpdateTypes.ts`: status ∈ {checking, downloading, installing} **or** `updateStaged`. `AppUpdater.setUpdateChannel` refuses on it, and the About switch is disabled on it. The IR-002 `APP_UPDATE_CHANNEL_LOCKED_STATUSES` set is removed. `electron/tsconfig.json` lists `../shared/appUpdateTypes.ts`, like the other shared runtime files.
   - The Check button, the `checkForUpdates` guard and `autoInstallOnAppQuit` are unchanged.
3. **Renderer (DS-003)**
   - `appUpdateStore.setUpdateChannel`:
     - applies `result.state`;
     - shows a save-failed toast when `persisted:false`;
     - shows a generic error toast when the IPC call rejects;
     - does nothing when `accepted:false`;
     - mirrors `updateStaged`, and a failed manual-check IPC call keeps `updateChannel`, `updateStaged` and `currentVersionIsPrerelease` instead of resetting them to defaults (IR-003).
   - About → Updates card:
     - adds the "Receive beta updates" switch with its description;
     - shows the "install or restart first" hint whenever `updateStaged` is true, whatever the current status;
     - adds a Beta badge driven by `currentVersionIsPrerelease`.
   - en and zh-CN strings added.
4. **Release tooling (DS-004)**
   - New `scripts/release_versions.py`:
     - implements exactly the canonical grammar;
     - provides `next-beta` and `is-newest`;
     - is read-only and uses only the Python standard library.
   - `scripts/desktop-release.sh beta [--base X.Y.Z] [--branch B] [--no-push]`:
     - checks for a clean worktree and the right branch, then runs `git fetch --tags origin`;
     - computes the version with `release_versions.py next-beta`, then bumps, commits, tags and pushes;
     - does not require curated notes;
     - shares the extracted commit/tag/push tail with `release`.
5. **Docker `:beta` (DS-005)**
   - Prepare-release tags are unchanged.
   - New final build-and-push step "Move beta tag", default variant only:
     1. `git fetch --tags --force origin`
     2. load the helper from `$GITHUB_SHA` (ARCH-005)
     3. `is-newest "$RELEASE_TAG"`
     4. if the result is `true`, `docker buildx imagetools create -t <image>:beta <image>:<normalized_tag>`
   - The decision is written to the job summary.
6. **Docs and help**
   - Launcher help (bash and PowerShell) adds a "Release tracks" section: `--tag beta`, back to `latest`, and the downgrade caution.
   - The server Docker README documents the beta track, the caution, and the `:beta` publish rule.
   - `github-actions-tag-build.md` gains a Release Channels section.
   - `electron_packaging.md` gains an Update Channel section.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - 21 modified tracked files plus 5 new paths, all inside the owners named in the design, with no new subsystem.
  - The risk surface is exactly as designed: deployment (release flags, Docker `:beta`), contract (new IPC and state fields), persistence (new preference file), and blast radius.
  - Nothing found during implementation changes these.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High-risk route, so independent Code Review applies)
- New design impact or escalation trigger: `None`
  - The three design escalation triggers (`beta*.yml` emitted, a pre-release resolved for `allowPrerelease=false`, conflicting `softprops` rewrites) can only be observed in a real CI or packaged run. They were not observed and remain for validation.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | `-` tag → pre-release with generated notes; stable unchanged | `.github/workflows/release-desktop.yml`:<br>• prepare-release `meta`: `*-*` → `PRERELEASE=true` on tag push and manual dispatch with a tag.<br>• publish-release "Resolve release notes mode": `*-*` → `has_curated_notes=false` → the existing "generated notes fallback" publish step. | Implemented. For stable tags, classification and notes are identical to before. See Assumption A-1 for the notes-rule key. |
| BEH-002 | Stable → `allowPrerelease=false`; older installs protected by the GitHub flag | `electron/updater/appUpdater.ts`:<br>• `applyChannelPolicy()` runs in `initialize()` and inside `checkForUpdates()` just before `autoUpdater.checkForUpdates()`.<br>• `allowDowngrade=false` always; `channel` never assigned. | Implemented. Unit tests capture the policy at check time and use a setter spy to show `channel` is never assigned. |
| BEH-003 | Persisted channel → policy → re-check; off by default; web build not interactive | `appUpdateChannelStore.ts` (`load`/`save`); `AppUpdater.setUpdateChannel` + IPC `app-update:set-channel`; `preload.ts` `setAppUpdateChannel`; `appUpdateStore.setUpdateChannel`; `AboutSettingsManager.vue` switch | Implemented as the design's DS-003 sequence:<br>1. Guard: refuse an invalid value or `isAppUpdateChannelLocked(state)` (status ∈ {checking, downloading, installing} or `updateStaged`).<br>2. Save.<br>3. Apply state and policy.<br>4. If packaged and status ∈ {idle, no-update, available, error}, re-check with `checkForUpdates('manual')`.<br>5. Return the result. |
| BEH-004 | No downgrade on opt-out; explanatory text | `allowDowngrade=false` in `applyChannelPolicy`; sticky `updateStaged` + shared `isAppUpdateChannelLocked` (main and UI); About description copy | Implemented. Switching stable while a beta is `available` (nothing staged) re-checks and replaces the offer. After a download, a later manual check ending in available, no-update or error cannot unlock the channel (IR-003 regression tests). |
| BEH-005 | Beta badge from `currentVersionIsPrerelease` | `AppUpdater` constructor: `/^\d+\.\d+\.\d+-/` on `app.getVersion()`; store mirror; About badge | Implemented |
| BEH-006 | `desktop-release.sh beta` | `scripts/desktop-release.sh` `run_beta` → `release_versions.py next-beta`; shared `ensure_on_branch` / `bump_package_version` / `commit_tag_and_push` | Implemented. Sandbox run: beta.1 then beta.2 pushed to a bare origin, and the curated notes file was untouched. Refusals for a dirty tree, the wrong branch, an existing stable for the base, and a number past 98. `release` still works. |
| BEH-007 | Android/iOS pre-release handling preserved; Android notes aligned | `.github/workflows/release-android.yml` notes step only | Implemented. There are no other Android or iOS changes. |
| BEH-008 | Forward-only Docker `:beta`; docs/help | `.github/workflows/release-server-docker.yml` "Move beta tag"; `scripts/release_versions.py is-newest`; launcher `core.sh` / `Core.ps1`; `autobyteus-server-ts/docker/README.md` | Implemented. ARCH-005 applied: the helper is loaded via `git show "$GITHUB_SHA:scripts/release_versions.py"`. The zh variant skips the step. `latest` logic is unchanged. |

## Key Files Or Areas

New:
- `scripts/release_versions.py` (canonical grammar, precedence, `next-beta`, `is-newest`)
- `scripts/tests/test_release_versions.py`
- `scripts/tests/fixtures/release_tags_origin_v_2026-09-27.txt` (real origin `v*` inventory: 310 tags, 301 recognized)
- `autobyteus-web/electron/updater/appUpdateChannelStore.ts`
- `autobyteus-web/electron/updater/__tests__/appUpdateChannelStore.spec.ts`

Modified:
- Workflows: `release-desktop.yml`, `release-android.yml`, `release-server-docker.yml`
- `scripts/desktop-release.sh` (IR-002: the `test` command line in `usage()` is restored; CR-001)
- Updater: `autobyteus-web/shared/appUpdateTypes.ts` (includes `updateStaged` and `isAppUpdateChannelLocked`), `electron/tsconfig.json` (lists `../shared/appUpdateTypes.ts`), `electron/updater/appUpdater.ts`, `electron/preload.ts`, `electron/types.d.ts`, `types/electron.d.ts`
- Renderer: `stores/appUpdateStore.ts`, `components/settings/AboutSettingsManager.vue`, `localization/messages/{en,zh-CN}/settings.ts`
- Tests: `electron/updater/__tests__/appUpdater.spec.ts`, `stores/__tests__/appUpdateStore.spec.ts`, `components/settings/__tests__/AboutSettingsManager.spec.ts`
- Help and docs: launcher `autobyteus-docker.d/bash/core.sh` and `powershell/Core.ps1`; `autobyteus-server-ts/docker/README.md`; `autobyteus-web/docs/github-actions-tag-build.md`; `autobyteus-web/docs/electron_packaging.md`

## Important Assumptions

- **A-1: the notes mode keys on the release tag containing `-`, not on the `prerelease` output.**
  - This is a design-level choice made within the design's wording: "pre-release tags use generated notes in both jobs".
  - Reason: Android's manual-dispatch `prerelease` input defaults to `true`, even for stable tags. Keying on that output would switch stable-tag Android re-publishes to generated notes, which changes preserved stable behavior.
  - With the tag rule, both jobs that write the shared release decide identically.
  - For tag pushes and `-` tags, the result equals `prerelease`.
- **A-2: a manual desktop dispatch of a *stable* tag with `prerelease=true` is still honored.**
  - This is unchanged behavior.
  - The design only requires forcing `true` for `-` tags.
- **A-3: `is-newest` receives `$RELEASE_TAG` as given, per the design guidance.**
  - A manual dispatch with a tag missing its `v` prefix is outside the grammar, so it prints `false` and `:beta` does not move. That is the safe direction.
- **A-4: the Docker `release_tag` / desktop `release_tag` input description examples now show `-beta.1` instead of `-rc1`.**
  - This is text only.
- **A-5: the repo already has other `v*` tags such as `v1.2.26-rc1`.**
  - They still classify as GitHub pre-releases in the desktop workflow if they are ever re-dispatched.
  - This matches the "any `-` tag" rule in REQ-001 and AC-001.

## Known Risks

- **RSK-001 (accepted):** beta resolution follows the order of the releases feed. At worst the result is "no update", never a downgrade.
- **UNK-001:** must be confirmed on the first real beta CI run.
  - Check the GitHub release Pre-release flag.
  - Check that "Latest" still points to the previous stable.
  - Check that the `latest*.yml` assets are present.
  - Check the Android release body and flag.
- **Docker `:beta` lag after a failed newer build (accepted):** `:beta` stays one build behind until the failed run is re-run. This is documented in the README and the tag-build doc.
- **Android patch ≤ 99 limit:** pre-existing and out of scope.
- **Release-window race:** pre-existing. Beta users will hit it more often, and the outcome stays bounded to the classified `release-preparing` error.
- **Stale lock after a failed replacement download (accepted in SR-005):** once an update was staged, `updateStaged` stays true for the process. If a later replacement download fails, the switch stays locked until restart, even though nothing may still be staged.
- **The Docker "Move beta tag" step can't be executed locally.** It needs Docker Hub credentials and a real CI run. The shell passes actionlint and shellcheck.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`. The only extraction is the local commit/tag/push tail in `desktop-release.sh`, as the design says.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes:
  - All changes extend the owners the design names: `AppUpdater`, the store, the About page, the workflows and the release script.
  - One new file each was added in `electron/updater/` and `scripts/`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The tag-push `PRERELEASE="false"` hard-code is removed.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`. The duplicated tail inside `run_release` is replaced by `commit_tag_and_push`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
  - `AppUpdateState` gains only `updateChannel`, `currentVersionIsPrerelease` and `updateStaged`; no save-error fields. `updateStaged` has one meaning: an update was downloaded in this process and will install on quit.
  - `AppUpdateChannelChangeResult` is a command result only and is not mirrored into store state.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
  - `appUpdater.ts`: 379 effective non-empty lines, +64/−2.
  - Largest source delta: `desktop-release.sh`, +91/−8.
  - All deltas are below 220.
- Notes:
  - `AppUpdater` remains the only code that touches `autoUpdater` properties.
  - The renderer never computes the policy. It reads `updateChannel` and forwards commands.
  - Main and UI share one lock rule (`isAppUpdateChannelLocked`). The UI uses it for presentation only; the main process stays authoritative.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable:
  - An absent file reads as `stable` without logging.
  - Invalid content (unknown channel, missing field, `null`, JSON string) reads as `stable` with a warning.
  - A corrupt file reads as `stable` with an error log.
  - All of these are covered by `appUpdateChannelStore.spec.ts`.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Local dependencies were installed with `pnpm install --frozen-lockfile --filter autobyteus... --ignore-scripts`, followed by `npx nuxi prepare` for `.nuxt` types.
  - Both are gitignored, and the lockfile is unchanged.
  - Because install scripts were skipped, workspace packages such as `@autobyteus/application-sdk-contracts` have no build output. Two unrelated suites fail at import resolution for that reason: `browser/__tests__/browser-tab-manager.spec.ts` and `stores/__tests__/applicationHostStore.spec.ts`.
- `vue-tsc` is not installed in the workspace, so the `.vue` type check comes from component tests and the renderer render only.
- `pwsh` is not installed. The PowerShell help change is plain text inside the existing here-string, with no `$` or backticks.
- Python 3 standard library only. `actionlint` and `shellcheck` from Homebrew.

## Local Implementation Checks Run

- `python3 -m unittest scripts/tests/test_release_versions.py`: **22 passed**. Coverage:
  - the real-inventory fixture (310/301/9);
  - grammar acceptance and rejection;
  - precedence (`beta.10 > beta.9`, stable > its betas);
  - `is-newest`: rc, e2e and voice tags ignored; an rc candidate prints `false`; the concurrent later beta wins; an older re-publish prints `false`;
  - `next-beta`: `1.4.90-beta.1` from the real inventory; increments; base moves past a new stable; explicit base; refusals for an existing stable, a number past 98 (and 98 allowed), an invalid base, and no stable without a base;
  - CLI output and exit codes, and the `git tag -l` default source.
- `python3 -m unittest` on `test_server_docker_cli_latest_defaults.py`, `test_release_versions.py` and `test_docker_build_context_sources.py`: 27 passed.
- Full `scripts/tests` discovery: 68 run, with 3 pre-existing failures in `test_public_docker_launcher_shared_workspace.py` (port and profile tests). They fail identically with the launcher help changes stashed.
- `scripts/desktop-release.sh`, sandbox run against a temporary bare origin:
  - `beta` created and pushed `v1.4.90-beta.1`, then `v1.4.90-beta.2`, and bumped `package.json`. The notes file was untouched, and a `v2026.02.26-…` tag present in the sandbox was ignored.
  - Refusals checked: dirty worktree, wrong branch, `--base 1.4.89` (stable exists), and beta 99.
  - `--base 1.5.0 --no-push` created `v1.5.0-beta.1`.
  - `release 1.5.1 --release-notes … --no-push` still commits the notes and `package.json`.
- `shellcheck scripts/desktop-release.sh`: clean, as is the base version.
- IR-002: `usage()` check. Every line of the base `usage()` text is present again (checked with `grep -vxFf` against `git show HEAD:scripts/desktop-release.sh`), and `help` lists `release`, `beta`, `test` and `manual-dispatch`.
- `actionlint` on the three changed workflows, which includes shellcheck of the `run:` blocks: clean. YAML parses.
- `npx tsc -p electron/tsconfig.json --noEmit`: clean.
- IR-003 (current):
  - `tsc -p electron/tsconfig.json --noEmit` is clean.
  - An emit to a temp dir produces `shared/appUpdateTypes.js`. `isAppUpdateChannelLocked` gives `true` for {available, staged}, `false` for {available, not staged} and `true` for {checking}. `APP_UPDATE_CHANNEL_LOCKED_STATUSES` is no longer exported.
  - Updater + channel-store specs: **37 passed**. New: the `updateStaged` lifecycle, and 3 regression cases (after `update-downloaded`, a manual check ending in available, no-update or error, then `setUpdateChannel('stable')` → `accepted:false`, channel still `beta`, file still `beta`, no re-check).
  - Mutation check: temporarily restoring the status-only rule (`downloaded` instead of `updateStaged`) makes all 3 regression cases fail. The rule was restored.
  - Store + About specs: **42 passed**.
    - About: the switch is disabled with the hint for staged + {downloaded, available, no-update, error}; enabled with no hint for unstaged + {idle, no-update, available, error}; disabled for {checking, downloading, installing}.
    - Store: mirrors `updateStaged`; a failed check IPC call keeps the channel facts.
  - Full Electron suite: 177 passed, 1 skipped, all suites green.
  - `NUXT_TEST=true vitest run components/settings stores utils`: 1170 passed. Two suites fail at import on the unbuilt `@autobyteus/application-sdk-contracts` (pre-existing, unrelated).
  - Localization and web-boundary guards and the literals audit: pass. Renderer `tsc`: no hits in changed non-test sources.
  - Python `test_release_versions.py`: OK.
- `npx vitest run --config ./electron/vitest.config.ts electron/updater`: **33 passed**.
  - `appUpdater.spec.ts`: 20 tests, 12 of them new for the channel.
  - `appUpdateChannelStore.spec.ts`: 9 tests.
  - `appUpdateErrorClassifier.spec.ts`: unchanged.
- Full Electron suite: 159 passed, 1 skipped. One suite (`browser-tab-manager.spec.ts`) fails at import because of the unbuilt workspace package.
- `NUXT_TEST=true vitest run` on `appUpdateStore.spec.ts` (16 tests, 7 new) and `AboutSettingsManager.spec.ts` (23 tests, 17 new, including real en and zh-CN copy renders through `localizationRuntime`): **39 passed**.
- `NUXT_TEST=true vitest run components/settings stores`: 811 passed. One suite (`applicationHostStore.spec.ts`) fails at import because of the unbuilt workspace package.
- `guard:localization-boundary`, `guard:web-boundary` and `audit:localization-literals`: passed.
- Renderer `tsc -p tsconfig.json`: no errors in changed non-test sources. The remaining hits are pre-existing test-file typing (`.vue` module resolution; `listener?.()` narrowing in the original store tests).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Updates ("AutoByteus Updates" card). The switch, description, `downloaded` hint and Beta badge.
- Approved UI/UX, interaction, requirement, or design references:
  - requirements "UI, Interaction, And Experience Requirements";
  - REQ-004, REQ-007, REQ-008, REQ-009;
  - the design's About copy and its disabled-state rule.
- Existing design system, shared components, and adjacent product surfaces reviewed:
  - The `FeatureCapabilityToggleCard.vue` switch (`role="switch"`, `h-6 w-11` track, emerald on, slate off, translate thumb, focus ring, `disabled:opacity-60`) was reused as markup and styling.
  - The About card's existing type scale and spacing were followed.
- Project development / preview instructions and rendered surface used: `nuxt dev` on port 3217 (browser renderer), `/settings` → Updates. The server was stopped afterwards.
- States, layouts, viewports, and interactions inspected:
  1. Web build (real): the switch is off and disabled, and the description renders.
  2. Simulated Electron by patching the live Pinia store and stubbing `window.electronAPI.setAppUpdateChannel`, in the idle state on a `1.4.90-beta.3` build:
     - the switch is enabled and the Beta badge shows;
     - a click sent `beta`, the switch turned on, and the returned state was applied ("Up to date").
  3. `downloaded`: the switch is dimmed and disabled, a click is blocked (no IPC call), and the amber hint shows.
  4. Narrow and wide layouts: the switch stays right-aligned (`shrink-0`) and the text wraps cleanly.
  5. Keyboard: the switch is a native `<button>` with `tabIndex` 0 and `aria-labelledby` pointing at the label.
  6. IR-003: staged update with status `available` (the E2E-07b/BR-02 shape). The switch is dimmed and disabled, a click sends no IPC call, and the hint shows. Check for Updates and Download Update remain available, as designed.
- Visual or interaction issues found and corrected: none were found in the rendered states. A test-only issue was fixed: component copy assertions now go through `localizationRuntime`, because the global test `$t` mock humanizes keys.
- Supporting evidence and remaining unverified states or limitations:
  - Screenshots are in `/Users/normy/.autobyteus/browser-artifacts/` (`67733e-1790500437002.png` web build, `…456621.png` beta on + badge, `…470268.png` downloaded; IR-003: `08dc53-1790504144327.png` staged + available, locked).
  - The Electron states were simulated in the browser renderer. A packaged Electron app and a real update feed were not exercised.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-003 / QR-001:**
  - A packaged stable build, with a beta as the newest GitHub release, must report "no update".
  - An existing ≤ 1.4.89 install must also not be offered the beta; it already has `allowPrerelease=false` from its version.
- **AC-004 / AC-005:**
  - A packaged install with the switch on is offered the newest beta, and a newer stable when it is newest.
  - Download and install work.
- **AC-006:** the switch survives a restart and an in-app upgrade. The file lives in `userData`, which in-app updates keep.
- **AC-008:**
  - On `X.Y.Z-beta.N` with the switch off, no older stable is offered.
  - The switch is disabled and `set-channel` is refused once an update is staged, including after a later manual check (rerun E2E-07, E2E-07b and BR-02 for IR-003).
- **AC-001 / AC-012 / UNK-001:** run a real beta tag, or a `manual-dispatch` of a `-beta` tag. Inspect:
  - the Pre-release flag;
  - that "Latest" is unchanged;
  - the `latest*.yml` assets;
  - generated notes in both the desktop and Android jobs;
  - the Android APK asset;
  - the iOS TestFlight upload.
- **AC-013 / AC-014 / QR-004:**
  - After the beta publish, `:X.Y.Z-beta.N` and `:beta` share a digest and `:latest` is unchanged.
  - After a stable publish, the version tag, `:latest` and `:beta` share a digest.
  - A manual re-publish of an older tag (for example `v1.4.80`) leaves `:beta` unchanged, and the run is green (ARCH-005).
- **AC-015 / AC-016:** launcher `upgrade --all` behavior on `latest` versus `--tag beta`. This is launcher-level only; the launcher code is unchanged.
- **AC-017:** review `autobyteus-docker help` and the server Docker README.
- **AC-009:** `desktop-release.sh beta` twice against a scratch remote. This was already run in a sandbox and can be repeated.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Everything in the section above that needs a packaged Electron app, the real GitHub releases feed, a real CI run or Docker Hub registry inspection.
- Also the zh-CN render in the packaged app, and the PowerShell help output on a machine with `pwsh`.
- The local checks above are implementation-scoped only. They are not API/E2E sign-off.
