# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-002 (round 2, Pass) | N/A (ARCH-005 applied as a non-blocking note) | `Initial Baseline` | SR-002, SR-004, ARCH-REV-002 | Implemented; local checks pass; routed to Code Review |
| IR-002 | `/code_reviewer`, `code-review-report.md`, CRR-001 (round 1, Fail — Local Fix) | CR-001 | `Local Fix` | SR-004, ARCH-REV-002, CRR-001 | `test` usage line restored; optional shared locked-status constant applied; returned to Code Review |
| IR-003 | `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-003 (round 3, Pass on SR-005) | CR-002 / API-F-001 | `Design Impact` (resolved upstream in SR-005; implemented here) | SR-005, ARCH-REV-003, CRR-003, API-REV-001 | Sticky `updateStaged` + shared `isAppUpdateChannelLocked`; status-only set removed; routed to Code Review |

## Revision Entries

### IR-001 — Initial Stable/Beta update channel implementation

- Triggering role, report path, and round: `/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md`, ARCH-REV-002 (round 2, Pass)
- Triggering finding IDs: `N/A`. ARCH-005 (Low, non-blocking) was applied as requested.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Implemented per SR-004 on the SR-002 requirements. Classification confirmed as Medium / High.
- Related solution revision IDs: `SR-002`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: this is the initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-001..BEH-008; REQ-001..REQ-011; AC-001..AC-017 (implementation side).
- Implementation delta:
  - Desktop workflow:
    - classifies `-` tags as pre-release, and forces it on a manual dispatch with a `-` tag;
    - uses generated notes for `-` tags.
  - Android workflow: the notes step uses the same rule.
  - Docker workflow: new final "Move beta tag" step on the default variant.
    - It fetches tags and loads the helper from `$GITHUB_SHA` (ARCH-005).
    - It runs `is-newest`, then `imagetools create :beta`, and writes the decision to the job summary.
  - New `scripts/release_versions.py`: canonical grammar, `next-beta`, `is-newest`.
  - `desktop-release.sh`: new `beta` command, with the commit/tag/push tail extracted and shared.
  - Updater:
    - new `appUpdateChannelStore.ts`;
    - `AppUpdater` gains `applyChannelPolicy` (before every check) and `setUpdateChannel`, exposed as IPC `app-update:set-channel`;
    - new state fields `updateChannel` and `currentVersionIsPrerelease`, plus the `AppUpdateChannelChangeResult` type.
  - Renderer:
    - store `setUpdateChannel` action;
    - About switch with description, `downloaded` hint and Beta badge;
    - en and zh-CN strings.
  - Launcher help (bash and PowerShell) and docs updated.
- Changed files or areas: see "Key Files Or Areas" in `implementation-handoff.md`. That is 21 modified tracked files plus 5 new paths, all uncommitted in the worktree.
- Local validation and result:
  - `release_versions` tests: 22 passed.
  - `desktop-release.sh`: sandbox run against a bare origin passed (AC-009 flow, refusals, `release` unchanged).
  - `actionlint` and `shellcheck`: clean.
  - Electron `tsc`: clean.
  - Updater and channel-store specs: 33 passed.
  - Store and About specs: 39 passed.
  - Localization and web-boundary guards: passed.
  - Rendered About page in `nuxt dev`: web-build disabled state, simulated Electron idle/on/badge, and `downloaded` locked with the hint.
  - Pre-existing, unrelated failures:
    - 3 launcher tests (port and profile);
    - 2 suites that fail at import because workspace packages aren't built.
- Next recipient or routing: `/code_reviewer`, per `get_handoff_rules` for the Medium / High route.
- Remaining limitations or risks:
  - Not exercisable locally: a packaged Electron app against the real feed; a real beta CI run (UNK-001: release flag, Latest, `latest*.yml`, Android notes); Docker Hub `:beta` digests; the ARCH-005 manual re-publish case in CI; `pwsh` help output.
  - RSK-001, the failed-newer-build `:beta` lag, and the Android patch ≤ 99 limit remain as recorded.

### IR-002 — Restore `test` in release-script usage (CR-001); share the channel lock set

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/code-review-report.md`, CRR-001 (round 1, Fail — Local Fix)
- Triggering finding IDs: `CR-001` (Low, blocking; protects BEH-006's preserved `test` command documentation). The optional non-blocking suggestion for a shared locked-status constant is also applied.
- Classification: `Local Fix`
- Prior authoritative result: IR-001. Implemented, but `usage()` in `desktop-release.sh` had lost the `test` command description.
- Current authoritative result: the `test` line is restored, and the channel-locked statuses have a single definition. Classification is rechecked and still Medium / High.
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: it is the code-review Local Fix.
- Approved behavior or requirement IDs affected:
  - BEH-006: the preserved `test` command documentation is restored.
  - BEH-003 and BEH-004: the lock set is unchanged in content and now defined once.
- Implementation delta:
  1. `scripts/desktop-release.sh` `usage()`: re-added `  test      Trigger release-desktop workflow for build-only validation (no GitHub release publish).` after the `beta` block. Cause: the IR-001 edit's replaced span included that line.
  2. `shared/appUpdateTypes.ts`: exports `APP_UPDATE_CHANNEL_LOCKED_STATUSES` (checking, downloading, downloaded, installing).
     - `electron/updater/appUpdater.ts` and `components/settings/AboutSettingsManager.vue` import it, replacing their two local copies.
     - `electron/tsconfig.json` lists `../shared/appUpdateTypes.ts`, matching the existing shared runtime files.
- Changed files or areas: `scripts/desktop-release.sh`, `autobyteus-web/shared/appUpdateTypes.ts`, `autobyteus-web/electron/updater/appUpdater.ts`, `autobyteus-web/components/settings/AboutSettingsManager.vue`, `autobyteus-web/electron/tsconfig.json`
- Local validation and result:
  - The base `usage()` lines are all present, and `help` lists all four commands. `shellcheck` is clean.
  - Electron `tsc --noEmit` is clean. An emit to a temp dir produces `shared/appUpdateTypes.js`, which the compiled updater resolves at runtime.
  - Updater specs: 33 passed. Store + About specs: 39 passed.
  - Localization and web-boundary guards: pass.
- Next recipient or routing: `/code_reviewer`, for the round-2 source re-review (Medium / High route).
- Remaining limitations or risks: unchanged from IR-001.

### IR-003 — Lock the channel on a sticky staged-update fact (SR-005; CR-002 / API-F-001)

- Triggering role, report path, and round: `/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md`, ARCH-REV-003 (round 3, Pass on design SR-005). Originating evidence:
  - `code-review-report.md` CRR-003 (CR-002, Design Impact)
  - `api-e2e-execution-coverage-report.md` API-REV-001 (API-F-001)
  - `api-e2e-evidence/harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`
  - BR-02
- Triggering finding IDs: `CR-002`, `API-F-001`
- Classification: `Design Impact`, resolved upstream in SR-005 and implemented in this round. Classification is rechecked and still Medium / High.
- Prior authoritative result: IR-002. The channel lock keyed on status only (`downloaded` in `APP_UPDATE_CHANNEL_LOCKED_STATUSES`). A manual or failed check after a download moved the status to `available`, `no-update` or `error` and unlocked the switch, while the update stayed staged and would install on quit. That broke REQ-007 / AC-008.
- Current authoritative result: the lock keys on the sticky per-process `updateStaged` fact, through one shared rule used by the main process and the About page.
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-003`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: the design revision SR-005 required an implementation change.
- Approved behavior or requirement IDs affected: BEH-003, BEH-004; REQ-007; AC-008.
- Implementation delta:
  1. `shared/appUpdateTypes.ts`:
     - adds `updateStaged: boolean` to `AppUpdateState`;
     - adds `isAppUpdateChannelLocked(state)` = status ∈ {checking, downloading, installing} || `updateStaged`;
     - removes `APP_UPDATE_CHANNEL_LOCKED_STATUSES`.
  2. `electron/updater/appUpdater.ts`:
     - `updateStaged: false` in the initial state;
     - `updateStaged: true` in the `update-downloaded` listener, never reset;
     - the `setUpdateChannel` guard uses `isAppUpdateChannelLocked(this.state)`.
  3. `components/settings/AboutSettingsManager.vue`:
     - the switch is disabled on `isAppUpdateChannelLocked(appUpdateStore)`;
     - the hint shows on `updateStaged`, whatever the status;
     - the Check button is unchanged.
  4. `stores/appUpdateStore.ts`:
     - adds the `updateStaged` default and mirror;
     - the failed manual-check IPC path keeps `updateChannel`, `updateStaged` and `currentVersionIsPrerelease` instead of spreading defaults over them. This is small and in scope: an IPC failure must not make the UI show an unlocked Stable switch while the main process is still on Beta with an update staged.
  5. Tests:
     - updater: the `updateStaged` lifecycle, plus 3 regression cases (staged, then a manual check ending in available, no-update or error, then opt-out refused);
     - About: staged locking and the hint across statuses, and unstaged enabled states;
     - store: the `updateStaged` mirror, and the failed check keeping channel facts.
- Changed files or areas: `autobyteus-web/shared/appUpdateTypes.ts`, `electron/updater/appUpdater.ts`, `components/settings/AboutSettingsManager.vue`, `stores/appUpdateStore.ts`, their three specs, and `autobyteus-web/docs/electron_packaging.md` (the Update Channel section now describes `updateStaged`, the shared lock rule and the accepted limitation). No change to workflows or scripts in this round.
- Local validation and result:
  - Electron `tsc` is clean, and the emit check passes.
  - Updater + channel-store specs: 37 passed.
  - Mutation check: the old status-only rule fails all 3 regression cases.
  - Store + About specs: 42 passed.
  - Full Electron suite: 177 passed, 1 skipped.
  - Renderer settings, stores and utils: 1170 passed. Two suites fail at import on the unbuilt workspace package (pre-existing).
  - Guards pass.
  - Rendered check: staged + `available` shows the switch locked with the hint, and the click is blocked.
- Next recipient or routing: `/code_reviewer` for source re-review. After that, API/E2E reruns E2E-07, E2E-07b and BR-02.
- Remaining limitations or risks:
  - Accepted residual (SR-005): after a failed replacement download, `updateStaged` stays true until restart.
  - The packaged app and a real install-on-quit are still not exercised locally.
  - The other IR-001 risks are unchanged.

