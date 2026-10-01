# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review` (latest, round 4); round 3 was an `API/E2E Failure-Origin Review`, and rounds 1–2 are the source-review baseline
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/requirements-doc.md` (Approved; SR-002 basis)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: None exist. Product Design: `N/A — not applicable`
- Relevant Solution Revision IDs: SR-002 (requirements), SR-004 → SR-005 (design)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002 (ARCH-005 note), ARCH-REV-003 (SR-005 Pass; residual P-007)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: 4
- Trigger: IR-003 from `/implementation_engineer`, implementing SR-005 (ARCH-REV-003 Pass) for CR-002 / API-F-001
- Prior Review Round Reviewed: Round 3 (`CRR-003`, Failure-Origin — Design Impact)
- Latest Authoritative Round: 4
- Coverage Investigation Reviewed (failure-origin entry point): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-execution-coverage-report.md` ("Failure Detail — API-F-001")
- API/E2E Revision Record Reviewed (failure-origin entry point): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A
- Failing Scenario IDs: E2E-07b (desktop runtime), BR-02 (UI reachability); finding API-F-001
- Exact Failing Commands / Execution Mode: real Electron 42.4.1 + compiled `AppUpdater` + real preload/IPC + electron-updater 6.8.3 against a local GitHub-shaped feed (`api-e2e-evidence/harness/run-scenarios.js`); browser renderer check for BR-02
- Failure Evidence Paths: `api-e2e-evidence/harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`, `E2E-07-downloaded-lock.json`, `api-e2e-evidence/br02-browser-downloaded-lock-bypass.json`, `br02-about-after-check-in-downloaded-switch-to-stable.png`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change footprint (21 modified + 5 new paths, no new subsystem) and risk surface (release flags, Docker `:beta`, new IPC, new preference file) match the design classification.

## Review Scope

- Changed implementation and behavior reviewed: all uncommitted changes on `codex/desktop-beta-update-channel` over `origin/personal` @ `82f3359cb` — updater channel policy and command, channel store, shared types, preload/typings, renderer store and About page, localization, `release_versions.py`, `desktop-release.sh`, three release workflows, launcher help, docs.
- Files / areas reviewed:
  - `autobyteus-web/electron/updater/appUpdater.ts`, `appUpdateChannelStore.ts`, `electron/preload.ts`, `electron/types.d.ts`, `types/electron.d.ts`, `shared/appUpdateTypes.ts`
  - `autobyteus-web/stores/appUpdateStore.ts`, `components/settings/AboutSettingsManager.vue`, `localization/messages/{en,zh-CN}/settings.ts`
  - `scripts/release_versions.py`, `scripts/desktop-release.sh`
  - `.github/workflows/release-desktop.yml`, `release-android.yml`, `release-server-docker.yml` (full Docker job read for output/checkout context)
  - Launcher help `core.sh` / `Core.ps1`; `autobyteus-server-ts/docker/README.md`; `autobyteus-web/docs/github-actions-tag-build.md`, `electron_packaging.md`
  - Tests: `appUpdater.spec.ts`, `appUpdateChannelStore.spec.ts`, `appUpdateStore.spec.ts`, `AboutSettingsManager.spec.ts`, `scripts/tests/test_release_versions.py` + real-inventory fixture (structure and scenario coverage)
- Reviewer re-runs: round 1 — `python3 -m unittest scripts/tests/test_release_versions.py` → 22 OK; `vitest electron/updater` → 33 passed; `NUXT_TEST=true vitest` store + About specs → 39 passed. Round 2 — Electron `tsc --noEmit` clean; updater 33 passed; store + About 39 passed; `guard:web-boundary` pass; `shellcheck scripts/desktop-release.sh` clean; `desktop-release.sh --help` lists release, beta, test, manual-dispatch.
- Round 2 delta reviewed: `scripts/desktop-release.sh` `usage()`; `shared/appUpdateTypes.ts` new runtime export `APP_UPDATE_CHANNEL_LOCKED_STATUSES`; its imports in `appUpdater.ts` and `AboutSettingsManager.vue`; `electron/tsconfig.json` include. The runtime `require('../../shared/appUpdateTypes')` follows the existing `shared/localFileUrl.ts` pattern (`LOCAL_FILE_SCHEME`): compiled into `dist/shared`, packaged by the `dist/**/*` rule in `build/scripts/build.ts`.
- Explicit exclusions: packaged-app behavior, real GitHub feed, real CI runs and Docker Hub digests (API/E2E scope); ticket artifacts.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001..011, AC-001..017, preserved-behavior boundary incl. BEH-006 preserved `release`/`test`/`manual-dispatch` commands).
- Design-spec behavior map verified against the implementation: Yes (DS-001..DS-005).
- Design review report and round confirmed: ARCH-REV-002 Pass; ARCH-005 applied (`git show "$GITHUB_SHA:scripts/release_versions.py"`).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `release-desktop.yml` meta: tag push `*-*` → `PRERELEASE=true`, else `false` (hard-code removed); manual dispatch `*-*` OR input → `true`. Notes step: `*-*` → `has_curated_notes=false` → existing `generate_release_notes: true` publish step with `prerelease` output. | — |
| BEH-002 | Confirmed | `AppUpdater.initialize()` loads channel then `applyChannelPolicy()`; `checkForUpdates()` re-applies it immediately before `autoUpdater.checkForUpdates()` (both startup and manual paths). `allowPrerelease = channel==='beta'`, `allowDowngrade=false`; `channel` never assigned (spec setter spy). | — |
| BEH-003 | Confirmed | About switch → `appUpdateStore.setUpdateChannel` → preload `setAppUpdateChannel` → IPC `app-update:set-channel` → `AppUpdater.setUpdateChannel`: guard (invalid / checking·downloading·downloaded·installing) → `saveAppUpdateChannel` → `applyState` + policy → re-check if packaged and idle·no-update·available·error → `{accepted, persisted, state}`. Web build: `!isElectron` disables switch. | — |
| BEH-004 | Confirmed | `allowDowngrade=false` on every check; `downloaded` in both main guard and UI lock set with hint; stable-while-available re-check replaces the beta offer (spec). Description copy matches design. | — |
| BEH-005 | Confirmed | `currentVersionIsPrerelease` from `/^\d+\.\d+\.\d+-/` on `app.getVersion()`; mirrored by store; badge `v-if`. | — |
| BEH-006 | Confirmed | `run_beta`: clean tree → branch → `git fetch --tags origin` → `release_versions.py next-beta` → `ensure_tag_absent` → bump → `commit_tag_and_push` (package.json only). `release` reuses the same extracted helpers in the same order. Round 2: the preserved `test` help line is restored after the `beta` block (CR-001 resolved). | — |
| BEH-007 | Confirmed | Android: only the notes-mode step changes (same `*-*` rule). No other Android/iOS change. | — |
| BEH-008 | Confirmed | Docker: prepare-release tags unchanged; final build-and-push step (default variant only): `git fetch --tags --force origin` → helper from `$GITHUB_SHA` → `is-newest "$RELEASE_TAG"` → `imagetools create -t :beta :<normalized>`; decision in summary. Help/README document `--tag beta`, return to `latest`, and the downgrade caution. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

The requirements' SCN-001..SCN-008 are the supported basis; they are reused rather than re-derived.

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-006 | Operational | Release operator | Publish a beta for self-testing | `desktop-release.sh beta` → tag push | Normal | DS-004 → DS-001 | Pre-release with generated notes | Requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002 | System | Stable install | Stay on stable | Startup/manual check | Normal | DS-002 | Only stable offered | Requirements SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003, BEH-005 | User | Any desktop user | Opt into beta | About switch | Normal | DS-003 → DS-002 | Beta offered; switch persists | Requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-001 | Operational | Release operator | Promote to stable | `desktop-release.sh release` | Normal | DS-001 | Normal release | Requirements SCN-004 | Supported Normal Scenario | Use |
| SCN-005 | BEH-004 | User | Beta user | Leave beta without downgrade | About switch off | Normal | DS-003 → DS-002 | No older stable offered | Requirements SCN-005 | Supported Normal Scenario | Use |
| SCN-006 | BEH-007 | Operational | CI | Android/iOS on a beta tag | Tag push | Normal | Android workflow | Pre-release as today; generated notes | Requirements SCN-006 | Supported Normal Scenario | Use |
| SCN-007/008 | BEH-008 | Operational | Docker user / operator | Follow betas / stay stable | Tag push; launcher `upgrade --all [--tag beta]` | Normal | DS-005; launcher saved image ref | `:beta` forward-only; `:latest` stable only | Requirements SCN-007/008; REQ-010 manual re-publish clause | Supported Normal Scenario | Use |
| SCN-OPS-HELP | BEH-006 (preserved) | Operational | Release operator | Read usage for existing commands | `desktop-release.sh` usage (`-h`, unknown option, unknown command) | Normal | `usage()` heredoc | All preserved commands described | Requirements BEH-006 preserved column; base `usage()` text | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `usage()` lost the `test` command description line | SCN-OPS-HELP; BEH-006 preserved | Operator prints usage | `usage()` Commands section now lists `release`, `beta`, `manual-dispatch`; `test` appears only in synopsis/examples | `git diff scripts/desktop-release.sh` hunk `@@ -19,7 +21,10 @@` replaces the `test` line with the `beta` block | Promote → Resolved (round 2) | CR-001; line restored in IR-002. |
| C-02 | Renderer duplicates the main-process `CHANNEL_LOCKED_STATUSES` set | Design "About … disabled when … status ∈ {…}" + engineering contract (no repeated structures) | — (structural) | Drift would only make the UI enable a switch the main process refuses; store no-ops on `accepted:false`, so outcome is bounded | `AboutSettingsManager.vue`, `appUpdater.ts` | Reject (as finding) — addressed in IR-002 | Optional suggestion applied: one `APP_UPDATE_CHANNEL_LOCKED_STATUSES` in `shared/appUpdateTypes.ts` used by main and About page. |
| C-03 | Default `next-beta` base ignores betas of a higher `--base` series (e.g. after `--base 1.5.0`, plain `beta` yields `1.4.90-beta.1`) | REQ-006 ("default: next patch after the latest stable tag; operator may override") | Operator omits `--base` after using it | Produces a lower beta; no downgrade (allowDowngrade=false; `is-newest` false) | `compute_next_beta`; REQ-006; design DS-004 | Reject | Implementation matches the approved requirement exactly; any change is a requirement decision. Recorded as residual risk. |
| C-04 | `set-channel` IPC has no handler when `updaterEnabled=false` (store shows generic toast) | P-004 (e2e profile) | e2e launch profile only | Not a shipped user surface | `electronLaunchProfile.ts`; ARCH P-004 Not Reachable | Reject | Not Reachable for supported users; same as existing Check button behavior. |
| C-05 | Beta channel resolves first feed entry; non-desktop GitHub releases could shadow | RSK-001 | New release created | Only desktop and Android workflows create GitHub releases, both on the same `v*` tag | `grep action-gh-release .github/workflows` | Reject | Accepted upstream risk (RSK-001); bounded to "no update". |
| C-06 | Docker step on a re-published pre-change tag | REQ-010; ARCH P-005 | Manual dispatch of old tag | Helper loaded from `$GITHUB_SHA` (full-history checkout has it); `is-newest` false; run green | Workflow step; ARCH-005 | Reject (resolved) | ARCH-005 correctly applied. |
| C-07 | Notes mode keyed on tag `-` rather than `prerelease` output (A-1) | REQ-006; BEH-001/007 preserved stable notes | Manual dispatch of a stable tag (both workflows default `prerelease: true`) | Keying on the output would switch stable re-publishes to generated notes | `release-desktop.yml` / `release-android.yml` input defaults | Reject (as finding) — A-1 confirmed correct | Tag rule is the only choice that preserves stable curated notes and keeps both jobs identical. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Feature / No Design Issue Found; only extensions of named owners plus two designed new files | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None exist | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..005 trace 1:1 to code (see basis table) | — |
| Ownership boundary preservation and clarity | Pass | `AppUpdater` sole toucher of `autoUpdater` props; store/About hold no policy; workflows call helper read-only; only the script mutates git | — |
| Off-spine concern clarity | Pass | Channel store = I/O+validation only; `release_versions.py` = ordering only | — |
| Existing capability/subsystem reuse | Pass | Extends `AppUpdater`, store, About card (reuses `FeatureCapabilityToggleCard` switch styling), existing publish steps | — |
| Reusable owned structures | Pass | `AppUpdateChannel`, `AppUpdateChannelChangeResult` and `APP_UPDATE_CHANNEL_LOCKED_STATUSES` in shared types; grammar implemented once in `release_versions.py` | — |
| Shared-structure/data-model tightness | Pass | State gains only `updateChannel`, `currentVersionIsPrerelease`; result not mirrored into state | — |
| Repeated coordination ownership | Pass | Guard authoritative in main; UI uses the same shared lock-status constant (round 2) | — |
| Empty indirection | Pass | Preload/IPC are thin transport as designed | — |
| Separation of concerns / file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | `electron/updater/*` depends only on electron, electron-updater, logger, shared types | — |
| Authoritative Boundary Rule | Pass | Renderer never reads the file or sets policy; IPC handler → `setUpdateChannel` only | — |
| File placement | Pass | Store beside its only consumer; helper under `scripts/` with tests under `scripts/tests/` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | `set-channel(channel) → {accepted, persisted, state}`; `next-beta`, `is-newest` exit/print contracts match design | — |
| Naming quality | Pass | `applyChannelPolicy`, `CHANNEL_LOCKED_STATUSES`, `commit_tag_and_push`, `is_newest` read naturally | — |
| No unjustified duplication | Pass | Lock-status set de-duplicated in round 2 | — |
| Patch-on-patch complexity control | Pass | `run_release` tail extracted cleanly; order of checks preserved | — |
| Dead/obsolete code cleanup | Pass | Tag-push `PRERELEASE="false"` removed; duplicated tail replaced | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Updater spec covers policy-at-check-time, every guard state, save failure, unpackaged, `channel` never assigned; Python tests cover every design-listed case on the real inventory | — |
| Test fixtures/helpers reusable and coherent | Pass | Real-inventory fixture file; spec setups reuse existing mocks | — |
| No stale/duplicated/compat-only tests | Pass | — | — |
| API/E2E readiness | Pass | Handoff lists packaged/CI checks (UNK-001, AC-013/014, ARCH-005 re-publish) | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `electron/updater/appUpdater.ts` | 378 | Pass | Pass (+64/−2) | Pass | Pass | OK | — |
| `electron/updater/appUpdateChannelStore.ts` | 40 (new) | Pass | N/A | Pass | Pass | OK | — |
| `stores/appUpdateStore.ts` | 260 | Pass | Pass (+26/−1) | Pass | Pass | OK | — |
| `components/settings/AboutSettingsManager.vue` | 215 | Pass | Pass (+75/−2) | Pass | Pass | OK | — |
| `shared/appUpdateTypes.ts` | 53 | Pass | Pass (+19) | Pass | Pass | OK | — |
| `scripts/release_versions.py` | 138 (new) | Pass | N/A | Pass | Pass | OK | — |
| `scripts/desktop-release.sh` | 370 | Pass | Pass (+92/−8) | Pass | Pass | OK | — |
| `.github/workflows/release-desktop.yml` | 631 | Pre-existing size; not a code file split candidate | Pass (+21/−4) | Pass | Pass | OK (workflow config) | — |
| `.github/workflows/release-server-docker.yml` | 223 | Pass | Pass (+36/−1) | Pass | Pass | OK | — |
| `.github/workflows/release-android.yml` | 394 | Pass | Pass (+12/−1) | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Missing file = stable is the approved default, not a compat branch |
| No legacy old-behavior retention | Pass | Tag-push hard-code removed |
| Dead/obsolete code cleanup completeness | Pass | — |
| Approved persisted-data transition decision followed | Pass | `Directly Usable — No Migration`; no migration code |
| No version-specific dual reads/writes | Pass | Single `v1` file, single shape |
| Approved transition mechanics match design | Pass | N/A beyond default-read |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (already updated in this change)
- Why: new release channel behavior, Docker `:beta` track, operator `beta` command
- Files or areas affected: `autobyteus-web/docs/github-actions-tag-build.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-server-ts/docker/README.md`, launcher help. Delivery should re-check these against the final state.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 | Confirmed | `downloaded` in both guard sets; spec covers refusal |
| P-002 | Confirmed | Grammar regex matches design exactly; fixture test asserts 310/301/9 |
| P-003 | Confirmed | Post-push step with `git fetch --tags --force` |
| P-004 | Confirmed (Not Reachable) | — |
| P-005 | Confirmed | ARCH-005 applied |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Overall score (`/100`): 95
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Every DS chain is visible in code in the designed order | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | `AppUpdater` is the sole policy owner; renderer and workflows stay on their side | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | `set-channel` result and helper CLI contracts are explicit and documented in code | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.5 | Store/helper are small, single-purpose, correctly placed | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | Tight state/result types; grammar and lock-status set each defined once | — | — |
| `6` | `Naming Quality and Local Readability` | 9.5 | Clear names and purposeful comments (e.g., why `channel` is never set) | — | — |
| `7` | `API/E2E Readiness` | 9.5 | Strong unit coverage; CI/packaged checks enumerated | Packaged/CI paths unexercised (expected) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.5 | Round 4: the channel lock now keys on a sticky `updateStaged` fact, so it holds after a manual, failed or successful check in a staged session (CR-002 resolved). Updater, store, workflows and helper are correct for every supported scenario traced. | Install-on-quit is still only proven from library source; P-007 stale lock accepted upstream | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean cut; no compat branches | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Hard-code and duplicated tail removed | — | — |

## Findings

No open findings.

- CR-002 — Channel lock in `downloaded` could be bypassed through the preserved Check path (round 3, Design Impact). **Resolved in SR-005 / IR-003** (see round 4 section and CRR-004).

- CR-001 — `desktop-release.sh` usage no longer described the preserved `test` command (round 1, Low, blocking). **Resolved in IR-002**: the line is restored after the `beta` block; `--help` output verified (see CRR-002).

## Classification

N/A — review passes.

## Recommended Recipient

- `/api_e2e_engineer` (primary pass handoff); informational notice to `/implementation_engineer`.

## Residual Risks

- RSK-001 (accepted): beta resolution follows feed order; only desktop/Android create GitHub releases, both on `v*` tags.
- UNK-001 and the design escalation triggers must be confirmed on the first real beta CI run (pre-release flag, Latest unchanged, `latest*.yml` assets, Android body/flag).
- Docker `:beta` can lag one build after a failed newer build (documented remedy).
- `next-beta` default base follows the highest stable and ignores betas on a higher `--base` series. This matches REQ-006; the operator must keep passing `--base` for an off-default series (relevant after the Android patch ≤ 99 limit forces a minor bump).
- Docker "Move beta tag" step and packaged-app behavior are only exercisable in CI / a packaged build.

## Round 4 Implementation Re-Review — IR-003 (SR-005)

### Scope

- `shared/appUpdateTypes.ts`:
  - new `updateStaged` on `AppUpdateState`;
  - new `isAppUpdateChannelLocked(state)` rule;
  - `APP_UPDATE_CHANNEL_LOCKED_STATUSES` removed, and no references remain (grep).
- `electron/updater/appUpdater.ts`:
  - `updateStaged:false` initially, set `true` only in the `update-downloaded` listener, never reset;
  - `setUpdateChannel` guard switched to the shared rule.
- `AboutSettingsManager.vue`: the switch is disabled on the shared rule; the hint shows on `updateStaged`.
- `stores/appUpdateStore.ts`:
  - mirrors `updateStaged`, default `false`;
  - the failed-manual-check IPC catch now keeps `updateChannel`, `updateStaged` and `currentVersionIsPrerelease`.
- `docs/electron_packaging.md`.
- New and changed specs.
- The API/E2E durable test files are not touched in this round and are left for the proportional test review.

### Verification

- SR-005 contract match:
  - The DS-003 guard is exactly `status ∈ {checking, downloading, installing} || updateStaged`.
  - `updateStaged` has one meaning (downloaded in this process, installs on quit).
  - Check-button behavior, the `checkForUpdates` guard and `autoInstallOnAppQuit` are unchanged, as preserved.
- Authoritative boundary: main still owns the state and the refusal. The renderer uses the same shared rule only for presentation. The rule lives once in shared types and is compiled for Electron through the existing `tsconfig` include.
- The CR-002 scenario (SCN-005-STAGED / -ERR) was traced forward:
  - `update-downloaded` sets `updateStaged=true`;
  - a manual check then moves status to `available`, `no-update` or `error`, while `updateStaged` stays true;
  - `setUpdateChannel('stable')` is refused, and the channel, file and policy remain `beta`.
- The regression spec drives this through the real `app-update:check` IPC handler for all three outcomes, and asserts that no re-check runs. The implementation also reports that reverting to the status-only rule makes all 3 cases fail.
- Store catch change: this is a correction to existing code, not new machinery. A rejected check IPC must not overwrite main-process facts in the UI, because doing so would present a lock-free switch that main refuses. It is covered by a store test.
- Reviewer re-runs:
  - Electron `tsc` clean;
  - updater + channel-store 37 passed;
  - store + About 42 passed;
  - `guard:web-boundary` and `guard:localization-boundary` pass;
  - `release_versions` tests OK.

### Candidate gate (round 4)

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-10 | `AppUpdateChannelChangeResult` doc comment still says refusal happens when an update is "checking, downloading, downloaded or installing". It does not mention the sticky staged lock | Shared contract documentation (SR-005 Interface Boundary Mapping) | Reject (as finding) — non-blocking note | Comment-only drift. The code, the rule's own doc comment and `electron_packaging.md` are correct. Suggest rewording to "…or an update is staged (`isAppUpdateChannelLocked`)" in the next touch. |
| C-11 | The lock stays set after a failed replacement download until restart | ARCH-REV-003 residual P-007 | Reject | Accepted upstream; errs toward REQ-007 safety. |

### Result

CR-002 is resolved. No new blocking findings. Scorecard category 8 is restored to 9.5; the other categories are unchanged.

## API/E2E Failure-Origin Review — API-F-001 (Round 3)

### Scenario basis

| Scenario ID | Kind | Actor | Goal / Governing Contract | Entry Surface | Path | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005-STAGED | User | Beta user with a downloaded beta | Leave Beta (SCN-005) without a pre-release installing afterwards. Governing contract: REQ-007 copy, AC-008 ("switch disabled and command refused in `downloaded`"), design DS-003 / ARCH-001 ("No pre-release can be left staged after an opt-out"), About hint ("Install it or restart … before changing the update channel") | About → Updates: "Check for updates" (enabled in `downloaded`, pre-existing), then the channel switch | `downloaded` → IPC `app-update:check` → `AppUpdater.checkForUpdates` (guard blocks only `checking`/`downloading`) → electron-updater re-emits `update-available` → status `available` → switch enabled (lock is status-only) → `set-channel:stable` accepted → staged update stays in `downloadedUpdateHelper` / Squirrel → installs on quit | Supported Explicit Edge Scenario. The actions are sequential, not concurrent or artificially timed. The user goal is coherent, and the design explicitly commits to this invariant. | Use |
| SCN-005-STAGED-ERR | User | Same | Same | Check → the check ends in `error` (e.g. offline) | `downloaded` → check → `error` → switch unlocked | Supported Explicit Edge Scenario (same root cause) | Use |

### Evidence verified

- `appUpdater.ts` `checkForUpdates`: `if (status === 'checking' || status === 'downloading') return` — a check from `downloaded` proceeds and replaces the status.
- `appUpdater.ts` `setUpdateChannel`: the lock is `APP_UPDATE_CHANNEL_LOCKED_STATUSES.has(this.state.status)`. Nothing records that an update is still staged.
- `AboutSettingsManager.vue` `isCheckDisabled` excludes `downloaded` (pre-existing), so the path can be reached from the product UI.
- electron-updater 6.8.3 source:
  - `BaseUpdater.addQuitHandler` is added at download and checks `autoInstallOnAppQuit` only at quit time.
  - `DownloadedUpdateHelper._file` is cleared only by `clear()` or a new download, not by a later check.
  - So the staged beta still installs on quit (Windows/Linux). On macOS, the staged Squirrel update installs, which is premise P-001.
- The runtime harness JSON (E2E-07b) shows `downloaded` → check → `available` → `set-channel:stable` `accepted:true, persisted:true`, with the policy flipped to `allowPrerelease:false`.
- The actual install on quit was not observed; see the API/E2E note about ad-hoc signing. The consequence rests on verified library source plus the accepted premise P-001. That is sufficient evidence.

### Candidate gate

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-08 | Channel lock keyed on the current status can be bypassed once status leaves `downloaded` while the update stays staged | SCN-005-STAGED, SCN-005-STAGED-ERR; AC-008, REQ-007, DS-003/ARCH-001 | Promote | Supported path through the exposed, preserved Check button. It breaks the explicit opt-out contract. |
| C-09 | Test harness overrides (`app.isPackaged`, `app.getVersion()`) invalidate the result | — | Reject | These overrides only enable the packaged updater path. The lock logic and the library behavior they exercise are production code. |

### Origin and classification

- Failure origin: **Design Impact**. The reviewed design (DS-003, Interface Boundary Mapping, Guidance step 1, About file row) defines the lock as "status ∈ {checking, downloading, downloaded, installing}". The implementation follows it exactly. But `downloaded` is not a sticky status: the preserved manual check, and a check that fails, move the status on while the update stays staged. The design's own invariant ("No pre-release can be left staged after an opt-out") therefore does not hold. This is not an implementation defect, and it is not a test problem.
- Why the owner is the Solution Designer: every remedy changes a reviewed contract or preserved behavior.
  - (a) A sticky "update staged until restart" fact in `AppUpdater` would change the `set-channel` refusal contract, the UI disable condition and the hint semantics.
  - (b) Blocking manual checks while an update is staged changes preserved Check-button behavior.
  - Another option is to toggle `autoInstallOnAppQuit` on opt-out. That changes the preserved install-on-quit behavior, and it may not stop macOS Squirrel.
  - Choosing among these belongs to the designer, with user approval if preserved behavior changes.
- Earlier review gap (acknowledged): this was reasonably detectable in source review. Both guards were visible: `checkForUpdates` blocks only `checking`/`downloading`, and `isCheckDisabled` excludes `downloaded`. My rounds 1–2 traced DS-003 into `setUpdateChannel`, but did not trace how status leaves `downloaded` through the preserved Check path. The architecture review had the same gap. The affected round-2 score rationale is corrected below. No other finding or score changes.
- Affected score rationale (correction to the round-2 scorecard): `Runtime Correctness And Behavioral Fidelity` should have been held below 9.0 for this gap. With the gap, that category is 8.0, and the fix belongs to design.

### Finding

#### CR-002 — Channel lock in `downloaded` bypassable via the preserved Check path (Design Impact)

- Protected: AC-008, REQ-007 (and its About copy), design DS-003 / ARCH-001 invariant.
- Evidence: see above (E2E-07b, BR-02, `appUpdater.ts:150`, lock check in `setUpdateChannel`, `AboutSettingsManager.vue:198`, electron-updater `BaseUpdater`/`DownloadedUpdateHelper`).
- Consequence: after 3 deliberate clicks (Check → switch off → quit), a beta the user opted out of installs. It is not a downgrade, but the approved opt-out promise and the in-app hint are false on this path.
- Required response: the Solution Designer revises the DS-003 lock mechanism. The API/E2E suggestion of a sticky staged-update fact in `AppUpdater` looks like the least invasive option, because it keeps the preserved Check behavior. Then:
  - implementation is revised;
  - a regression spec is added: after `update-downloaded`, a manual check (and a failed check) followed by `setUpdateChannel` is refused;
  - source re-review, then API/E2E rerun of E2E-07/07b and BR-02.
- Recipient: `/solution_designer`.

### Non-failing results preserved

The rest of API-REV-001 passed and is not affected: AC-003/004/005/006/007/009/010/011/015/016/017, UNK-001 local builder output, the web build, and help/docs. The durable tests added by API/E2E are held for the proportional test-code review after the package passes; they are not reviewed here. CI-01 (real publication) stays with delivery.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (P-001 extension satisfied; P-007 accepted upstream)
- Score Summary: 9.5 / 10 (95 / 100); every category ≥ 9.0
- Failure Origin: N/A (the round-3 Design Impact is resolved by SR-005 / IR-003)
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - API/E2E should rerun E2E-07, E2E-07b and BR-02, plus the failed-check variant, against IR-003.
  - All other API-REV-001 results are unaffected by this delta.
  - The durable API/E2E tests still await the proportional test-code review after the API/E2E pass.
  - Optional nit C-10: reword the `AppUpdateChannelChangeResult` doc comment.
