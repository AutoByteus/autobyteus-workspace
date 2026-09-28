# Solution Designer Handoff — desktop-beta-update-channel

- Result classification: `Architecture Design Complete`
- Package identifier: `desktop-beta-update-channel`
- Current solution revision: `SR-005`. SR-004 revised SR-003 for ARCH-REV-001 (ARCH-001..004; ARCH-REV-002 Pass). SR-005 revises the channel lock for code-review failure-origin finding CR-002 / API-F-001. The requirements basis is `SR-002`, explicitly approved by the user 2026-09-27 ("thanks i approve now"); requirements are unchanged.
- task_size: `Medium`; architectural_risk: `High` (release-publication behavior for all users, new IPC contract, new local persistence). Rationale in design-spec.md "Task Size And Architectural Risk".
- Applied handoff rule: Architecture Design Complete with architectural_risk=High → `/architecture_reviewer` (SR-003 sent; SR-004 re-sent after revision; SR-005 sent after CR-002)

## Original Request And Goal

The user releases many desktop versions per day (one per merge) to self-test through the in-app updater, and ordinary users are annoyed by the release rate. Goal:
- Stable/Beta update channels. Beta tags (`vX.Y.Z-beta.N`) are GitHub pre-releases, only offered to desktop installs that switched on "Receive beta updates" (Settings → About → Updates, local, off by default).
- Stable tags reach everyone.
- Docker gets a moving, forward-only `beta` image tag: `autobyteus-docker upgrade --all` stays on `latest`; `upgrade --all --tag beta` follows betas.
- The operator gets a `desktop-release.sh beta` command.

## Artifacts (absolute paths)

- Requirements (Approved, SR-002): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/solution-revision-record.md`
- Supplements: None. Product Design artifacts: N/A — not applicable.
- Downstream artifacts for SR-005: `code-review-report.md` (CRR-003, CR-002), `code-review-revision-record.md`, `api-e2e-execution-coverage-report.md` (API-F-001), `api-e2e-revision-record.md`, `api-e2e-evidence/`, `implementation-handoff.md`, `implementation-revision-record.md` (same folder)
- Prior review artifacts (ARCH-REV-001 on SR-003; ARCH-REV-002 Pass on SR-004): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md` (ARCH-REV-001, Fail) and `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/architecture-review-revision-record.md`

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel`
- Branch: `codex/desktop-beta-update-channel`
- Base: `origin/personal` @ `82f3359cb9b98f0a5caa0dad79e24e9a58801a46`
- Finalization target: `origin/personal`
- Ticket artifacts are uncommitted in the worktree.

## Scope Summary

- **In scope:**
  - desktop release classification + generated notes for pre-releases
  - Android release-notes-mode alignment only (SR-003 evidence clarification; no intended-behavior change)
  - Electron channel preference/policy/IPC
  - About switch + Beta badge
  - Docker forward-only `:beta` tag
  - `scripts/release_versions.py`
  - `desktop-release.sh beta`
  - docs/launcher help
- **Out of scope:** Android/iOS classification changes, Nightly channel, staged rollouts, CI auto-release, launcher code changes, `beta-zh`, a server-side toggle.

## Key Design Decisions To Review

1. Channel applied via `autoUpdater.allowPrerelease` before every check; `allowDowngrade=false`; never set `autoUpdater.channel` (its setter enables downgrade).
2. No metadata-filename changes: electron-builder's GitHub provider keeps `latest*.yml` for pre-release versions (source evidence; UNK-001), and electron-updater falls back to it.
3. `set-channel` returns `{accepted, persisted, state}`. It is refused when `isAppUpdateChannelLocked(state)`: status ∈ {checking, downloading, installing} or the sticky per-process `updateStaged` (set on `update-downloaded`); the UI disables the switch. Otherwise it persists, applies, and re-checks when idle/no-update/available/error.
4. Missing/corrupt preference = stable. `Directly Usable — No Migration`.
5. Docker `:beta` is moved in a final post-push step, only when the tag is the highest recognized release tag (canonical grammar, semver precedence via `release_versions.py`) and the variant is default.

## Open Risks

- RSK-001 (accepted): beta resolution uses newest-created feed entry.
- The first real beta CI run must confirm the metadata/asset behavior in practice.
- Android patch ≤ 99 limit is pre-existing.

## SR-004 Resolution Of ARCH-REV-001

- **ARCH-001:** `downloaded` added to the busy guard. The About switch is disabled with an "install or restart first" hint, and `setUpdateChannel` returns `accepted:false`. The REQ-007 promise is kept.
- **ARCH-002:** canonical grammar `^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-beta\.([1-9][0-9]*))?$` for both subcommands. Other tags are ignored, and an out-of-grammar candidate gives `is-newest` = `false`. The real inventory is the test fixture, with examples added.
- **ARCH-003:** `:beta` is moved in a final post-push step (`git fetch --tags --force` → `is-newest` → `imagetools create`). The failed-newer-build residual is documented.
- **ARCH-004:** `set-channel` returns `{accepted, persisted, state}`, and the store shows the save-failed toast on `persisted:false`.

## SR-005 Resolution Of CR-002 / API-F-001

- Root cause: the SR-004 lock keyed on the transient `downloaded` status. A preserved manual Check (or a failed check) moves the status to `available`/`error` while the update stays staged for install on quit.
- Fix, option (a): `AppUpdateState.updateStaged` (set true on `update-downloaded`, never cleared in-process, false at startup) and the shared `isAppUpdateChannelLocked(state)` = status ∈ {checking, downloading, installing} || updateStaged, used by the main-process guard and the About switch. The staged hint shows whenever `updateStaged`. `APP_UPDATE_CHANNEL_LOCKED_STATUSES` is removed.
- Preserved and unchanged: the Check button, `checkForUpdates` guard, and `autoInstallOnAppQuit`.
- Required regression: after `update-downloaded`, a manual check ending `available`/`no-update`/`error`, then `setUpdateChannel`, must return `accepted:false`.

## Next Expected Action

Architecture re-review of SR-005 (changed set-channel refusal contract and UI lock), then implementation → source re-review → API/E2E rerun of E2E-07, E2E-07b and BR-02 → proportional test-code review.
