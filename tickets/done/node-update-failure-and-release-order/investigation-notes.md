# Investigation Notes

## Investigation Meta

- Package identifier: `node-update-failure-and-release-order` (autobyteus-412)
- Request / ticket: Project Task `autobyteus-412`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/node-update-failure-and-release-order`
- Resolved base remote / branch / revision: `origin/personal` at `6225a734a3` (fetched 2026-11-07)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the freshly fetched `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read:
  - Requirements gate (2026-11-07): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`.
  - Design gate (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`.
  - Also read: `TESTING.md` (Fresh-start build, test layers) and `RELEASE.md` (Watching The Rollout, Recovery, Workflow Reference).
- Investigation status: Complete for requirements and design.

## Initial Request And Clarifications

- Original request: Task autobyteus-412, FU-003 and FU-004 (see requirements doc).
- Clarifications received: none needed. The Task's comments: none.
- User-supplied constraints: auto updates opt-in and off by default; never move or delete a published tag; tests on isolated nodes; release only on the user's word.
- Initial ambiguity: the "plan follow-ups.md" that the Task cites was not found: no match in the S1 archive follow-ups (FU-001/002 only) or in the repository's `tickets/**/follow-ups.md`. The Task's own text and the evidence below were sufficient.

## Source Log

| ID | Date | Source Type | Exact Source / Command | Why Consulted | Relevant Finding |
| --- | --- | --- | --- | --- | --- |
| SRC-01 | 2026-11-07 | Doc | S1 archive `release-deployment-report.md`, `follow-ups.md` | Task records | beta.5: 4/4 workflows success, 23/23 assets; nothing about the ordering |
| SRC-02 | 2026-11-07 | Code | `autobyteus-server-ts/docker/starter/release-source.mjs:38-49`, `update-service.mjs:51-80`, `update-run.mjs:63-80` | Where the message comes from | The node accepts (202), then the run's first step fetches the description; a 404 throws `refuse('NO_PACKAGE_FOR_VERSION', …)` and the update ends `refused` with that `targetVersion` |
| SRC-03 | 2026-11-07 | Code | `autobyteus-web/electron/nodeAutoUpdate/decideNodeAutoUpdate.ts:12-34` (`reconcileNodeAutoUpdate`), `:42-52` (`decideNodeAutoUpdate`) | Desktop's record rules | `reconcile` returns null unless the entry is `PENDING` for V (line 19); a `refused` update for V becomes `AUTO_FAILED` with the message (27-29); `decide` skips V for an `AUTO_FAILED` entry at V (50) |
| SRC-04 | 2026-11-07 | Code | `autobyteus-web/components/settings/nodes/NodeAutoUpdate.vue:23-30,48-52` | Card | Shows any non-`PENDING` outcome; "Automatic update failed" + reason for `AUTO_FAILED`; shown even with the switch off when an outcome exists (`shown`) |
| SRC-05 | 2026-11-07 | Code | `autobyteus-web/components/settings/nodes/NodeServerUpdate.vue:67-90,113-130` | Card's own status and notice | The cell asks the node (`nodeServerUpdateStore.refresh`, `?target=<app version>`); `autoReported(targetVersion)` hides the row notice when an ended auto entry has the same version, so the stale failure also hides "Updated to V" |
| SRC-06 | 2026-11-07 | Code | `.github/workflows/release-desktop.yml:584-706` | Desktop publish | `publish-release` needs only the five builds; two `softprops/action-gh-release@v2` steps (curated / generated notes) upload binaries and `latest*.yml` together |
| SRC-07 | 2026-11-07 | Code | `.github/workflows/release-server-docker.yml:290-400` | Server packages | `publish-server-package` (matrix amd64/arm64) waits up to 30 min (`seq 1 60`, 30 s) for the GitHub release ("The Desktop Release or the Android APK Release workflow creates the GitHub release"), then uploads `.tar.gz`, `.json`, `.json.sig` with `--clobber`. Lines 160-168: a ref without `autobyteus-server-ts/docker/system-level.json` "predates server packages" |
| SRC-08 | 2026-11-07 | Dependency | `node_modules/.pnpm/electron-updater@6.8.3/.../providers/GitHubProvider.js:51-121` (line 114) | When desktops see a version | Newest release (prerelease-aware) → fetch its channel file; missing → `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND`. Read, not run |
| SRC-09 | 2026-11-07 | Code | `autobyteus-web/electron/updater/appUpdateErrorClassifier.ts` (`RELEASE_PREPARING_PATTERNS`), `utils/appUpdateErrorDisplay.ts:43-47`, `stores/appUpdateStore.ts:285-291` | What the user sees meanwhile | Classified `release-preparing` ("The latest update is still being prepared on GitHub…"); startup and periodic checks are quiet (no toast) |
| SRC-10 | 2026-11-07 | Doc | `RELEASE.md` lines 264-341 | Release guide | The four workflows described as independent; no recovery for missing packages |
| SRC-11 | 2026-11-07 | Code | `autobyteus-server-ts/docker/starter/update-status.mjs:73-84` | C1 `target` relation | For any valid `target`, `relation` = `newer` / `same` / `older` of target against the node's version |
| SRC-12 | 2026-11-07 | Code | `autobyteus-web/electron/nodeAutoUpdate/nodeAutoUpdater.ts:111-169`, `nodeAutoUpdateIpc.ts`, `nodeAutoUpdateRecord.ts`, `electron/application/electronApplication.ts:447-456`, `electron/preload.ts:93-95`, `types/electron.d.ts:77-79`, `electron/types.d.ts:65-67` | Desktop owner and its IPC | `checkNode` only for nodes with the switch on; `reconcile` → `record.set`; IPC get-state / mark-read; no way for a window to have the main process re-read a node |
| SRC-13 | 2026-11-07 | Code | `scripts/tests/test_release_channel_workflow_steps.py` (`extract_step`, `run_bash`, `substitute_expressions`), `scripts/tests/test_server_package_release.py` | How workflow steps are tested | Workflow `run:` blocks are extracted and run in bash with fake `gh`/`docker` |
| SRC-14 | 2026-11-07 | Doc | `autobyteus-web/docs/electron_packaging.md:767-790`, `autobyteus-web/docs/settings.md:366-375` | Docs to sync | Describe reconcile rules and the card's outcome lines |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | A pass/follow reads the node | `checkNode` → `getStatus` → `reconcile` (PENDING only) | `AUTO_FAILED` for V is never changed while the desktop stays on V | SRC-03, RUN-01/02 | Reproduced on real data |
| BEH-002 | User | Nodes page open | Card shows the record's outcome; `autoReported` hides the row notice | Stale failure visible; success hidden | SRC-04, SRC-05 | Read |
| BEH-003 | Operational | Tag push | Desktop Release publishes `latest*.yml` with the binaries, independent of the server packages | Race | SRC-06, SRC-07, MEAS-01 | Measured |
| BEH-004 | System | Desktop update check | electron-updater reads the newest release's channel file | Offered once `latest*.yml` exists | SRC-08, SRC-09 | Read |
| BEH-005 | Operational | Release operator | RELEASE.md | No ordering, no recovery for missing packages | SRC-10 | Read |

## Runtime, Probe, Or Reproduction Findings

| ID | Method / Command | Observation | Established | Artifact |
| --- | --- | --- | --- | --- |
| MEAS-01 | `gh release view <tag> --json publishedAt,assets` for v1.5.12-beta.5/6/7 (asset `createdAt`) | beta.5: release 18:56:16 (APK); `latest*.yml` 19:23:13; server `.json` arm64 19:37:19, x64 19:38:46 → packages 14–15 min after the updater files. beta.6: packages 04:53:29/04:54:03, `latest*.yml` 05:00:58 → no gap. beta.7: release 11:29:07; `latest*.yml` 11:46:43; packages 12:11:45/12:12:48 → 25–26 min gap. Tag → packages 34–43 min; tag → desktop updater files 17–41 min | Measured | this table |
| RUN-01 | Read-only: `~/Library/Application Support/autobyteus/node-auto-updates.json` and `node-registry.json` (user's desktop; not modified) | Two remote entries `docker-8001`, `docker-8003` (`autoUpdate: true`), both `AUTO_FAILED` for `1.5.12-beta.7`, requested 12:05:27.988Z / 12:05:28.005Z, reason "No server package was published for 1.5.12-beta.7 (linux-arm64)…", `read: true`. 12:05:28 is 7 min before the arm64 package (12:12:48): the FU-004 race on the user's own desktop | Reproduced (real data, read-only) | this table |
| RUN-02 | Read-only `curl http://localhost:{8001,8003}/rest/node-update?target=1.5.12-beta.7` (GET only) | Both: `version 1.5.12-beta.7`, `relation same`, `update.state succeeded` (12:40:42 → 12:42:10 and 12:40:46 → 12:42:18). The record still says `AUTO_FAILED`: FU-003 | Reproduced (real nodes, read-only) | this table |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: a unit test in `decideNodeAutoUpdate.spec.ts` / `nodeAutoUpdater.spec.ts` with an `AUTO_FAILED` entry for V and the RUN-02 status (version V, relation `same`, update `succeeded`): today the entry stays `AUTO_FAILED`.

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| C1 `/rest/node-update` | Frozen (DESIGN rule 9) | `target.relation` for any target; `update.state`, `targetVersion` | SRC-11, `shared/nodeUpdateContract.ts` | None; no change to C1 |
| electron-updater | 6.8.3 resolved (`^6.8.9` declared in `autobyteus-web/package.json:146`; the store copy read is 6.8.3) | Channel file decides availability | SRC-08 | Low |
| softprops/action-gh-release@v2 | — | Creates or updates the release and uploads `files`; does not delete assets that are not listed | Workflow use | Low |
| `gh release upload --clobber` | GitHub CLI on the runner | Uploads or replaces an asset | SRC-07 already uses it | None |

## Persisted Data And State Facts

- Subject: `<userData>/node-auto-updates.json`, `{ entries: { <entryId>: { version, requestedAt, outcome, reason, read } } }`, one entry per remote node (2 on the user's desktop).
- Readers/writers: `NodeAutoUpdateRecord` only (tolerant read, atomic write, `retain` already removes entries).
- Change: entries may now be removed when superseded; no new field.
- Acceptable loss: a superseded `AUTO_FAILED` entry.

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Assumption | The release exists before the desktop publish job waits | Design: the desktop's own binary upload step (softprops) creates the release if Android has not, before the wait | Resolved by design |
| RSK-001 | Risk | A failed or late server package job now also holds the desktop updater files back (partial release) | Intended (REQ-005); RELEASE.md recovery | Accepted |
| RSK-002 | Risk | The real ordering can only be observed on a real tag | Step test with fake `gh`, plus asset order recorded on the next release by delivery | Accepted |

## Architecture Investigation Findings

- The node card's two components share one row: `NodeServerUpdate.vue` (cell, owns asking the node) renders `NodeAutoUpdate.vue` (automatic line). `NodeServerUpdate` already watches the automatic entry to refresh the node (lines 72-79): the coupling between card status and automatic record lives there.
- The main process cannot know about updates made outside it (card button, host command, launcher upgrade). It learns a node's version only from its own `getStatus` calls: passes and follows, for nodes with the switch on (SRC-12).
- The C1 `relation` for `?target=<failed version>` answers "runs V or newer" without a version comparator in the desktop (SRC-11). `autobyteus-web` has no release-version comparator (search for `compareReleaseVersions` / `semver` in `autobyteus-web` sources: none).
- The desktop publish job creates the release (softprops) only in its last steps. Splitting it into binaries (softprops), wait, then updater files (`gh release upload`) keeps release creation where it is (SRC-06).
- SR-002 (from ARCH-REV-001; established by reading):
  - P-001: the `NodeServerUpdate` instance's script runs from setup, but its cell `div` renders only once `connection !== 'unknown'` (`NodeServerUpdate.vue:2`). `nodeAutoUpdateStore.initialize` is called only from `NodeAutoUpdate.vue:84` (`onMounted`), inside that `div` (`:31`). So on a window's first view the first node answer arrives before the automatic entries are known.
  - P-002: `checkNode` is the only holder of the per-node `checking` guard (`nodeAutoUpdater.ts:112,115,136`). A second record writer has to hold the same guard and re-read the entry after its await.
- The predates-packages test exists in the server workflow (SRC-07 lines 160-168); the desktop job checks out the same `release_ref`.

## Requirement Implications

- MEAS-01 and RUN-01 make FU-004 a release-ordering defect: the earliest stage is the release workflow.
- RUN-02 shows that FU-003 is independent of FU-004: any non-automatic update leaves the stale entry.

## Notes For Architecture Design

- Scenarios SCN-001 to SCN-004.
- Keep C1/C2/C3 unchanged (DESIGN rule 9); no starter change.
- Fresh-start build rule (TESTING.md) matches `.github/workflows/**` by path; the build-only run does not run `publish-release`.
