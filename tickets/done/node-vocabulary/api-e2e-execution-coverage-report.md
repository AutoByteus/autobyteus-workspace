# API/E2E Execution Coverage Report — node-vocabulary (autobyteus-290)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary`; evidence in `…/evidence/api-e2e/`.

## Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 1)
- Progress log: `…/api-e2e-test-progress.md`
- Revision record: `…/api-e2e-revision-record.md`; revision `API-REV-001`; round 1
- Trigger: CRR-002 pass of IR-002. Code `127fc4806e`, handoff `260df99337`, design SR-008 (`8e3512429b`). Classification: Large / High.
- **Result: Pass**, 95%. Every case passes. One unresolved item stays open: RC-12 (idle shutdown, from autobyteus-247) timed out once in six runs. Its cause was not found and it did not recur in five further runs, so it is recorded as FU-007 with its evidence (Failures And Unresolved Items).
- The behavior is proven on every stored-name path, each on its real start:
  - server SM-1 … SM-5, including a real upgrade from the released build;
  - desktop SM-6;
  - browser SM-7 and SM-8;
  - iOS SM-9 and Android SM-10.
- The hold-backs give their stated reasons, between nodes and in the UI, and recover once the file is restored.
- The renamed contracts work between real nodes (the two-server E2E, with the former tool name selecting nothing).
- Durable coverage changed: Yes (see Durable Coverage Changes).

## Environment

| ID | Code | Machine | Servers and data | Cleanup |
| --- | --- | --- | --- | --- |
| ENV-1 | `127fc4806e` + the test changes; server dist API-00 | macOS 26.5 (Darwin 25.5, arm64), Node v22.23.1 | built server processes, each with its own temp data root and HOME, `env -i`; the two-server E2E's capturing proxies and scripted AGY CLI | temp roots removed |
| ENV-2 | the released build `c78ffb15a2` in its own worktree (API-04) and this build | as ENV-1 | real data written by the released build, then started with this build | worktree and roots removed |
| ENV-3 | as ENV-1; the web app from the worktree (`nuxt dev`), Chrome 156 headless (playwright-core) | as ENV-1 | probe-owned servers and data roots; API-05 serves the window on the LAN address (a real phone pairing needs a non-local address) | each probe's cleanup receipt |
| ENV-4 | the packaged desktop app of this worktree (`pnpm --silent isolated-app start --build`, `electron-dist/mac-arm64`) | as ENV-1 | my own `--data-root` with a released `electron/user-data/node-registry.v1.json`; one test remote node | instance stopped (`isolated-app list` shows none of mine); data root and the remote node removed |
| ENV-6 | a fresh `git clone` of the branch at `383b1500a2`; `pnpm install --frozen-lockfile`, server build | as ENV-1 | API-03's E2E from the clone | clone removed |
| ENV-5 | iOS app built for a dedicated simulator (`nv290-sm9-test`, iPhone 17, iOS 26.1); Android debug APK (IMP-11, no Android change since `32cf99830e`) on a dedicated AVD (`nv290_sm10_test`, API 35) | Xcode 26, Android SDK | the app group defaults / `saved_nodes` preferences seeded with the released keys | simulator and AVD deleted; adb server stopped |

## Cases

| Case | Criteria | What runs | Env | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | `pnpm -C autobyteus-server-ts build`; `test:integration:prepare` | ENV-1 | Pass | `API-00-build.log`: `BUILD_EXIT=0`, `PREPARE_EXIT=0` |
| API-R1 | REQ-901 … REQ-913, AC-905 (unit) | IMP-01 … IMP-19 (server typecheck, unit, integration, architecture; web Nuxt, Electron, guards, vue-tsc; iOS, Android; word list) | — | Reused | ran on `cb37d82fab` / `127fc4806e`; IR-002 touched only Memory Sync names and was rerun in IMP-15 … IMP-19. The architecture test's one failure (SR-011) has its cause found: FU-004 |
| API-01 | AC-902, REQ-903, REQ-906 | the two-server E2E, whole file: `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<agy-failure-cli> vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | ENV-1 | **Pass** (37/37 in run 2); RC-12 timed out once (FU-007) | Run 1 `API-01.log`: 36/37, RC-12 timed out. Run 2 `API-01-run2.log`, `API-01-run2/`: **37/37** (321 s). RC-26 incl. the former-name case passes in both: an agent selecting only `list_available_nodes` has neither `list_peer_nodes` nor `list_available_nodes`, and keeps `delegate_task`. RC-27: `list_peer_nodes` lists every peer with its status |
| API-03 | AC-903, AC-905, REQ-911, REQ-913 | new `tests/e2e/app-data-migrations/node-vocabulary-stored-names-startup.e2e.test.ts` (`env -i … vitest run <file>`) | ENV-1 | **Pass 3/3** (run 3) | `API-03-run3.log`. **NV-01:** same node IDs; `node-identity.json {nodeId, createdAt}` equal to the released values, one `server-instance.json.backup-*` with the released content; config, source state, credentials, `memory-sync-source.json`, manifest with `memorySyncSourceId` and one backup each; both migration records `SUCCEEDED`; the peers' offers both ways; `testMemoryHubConnection` → the same source; the next sync sends only the new file (`changedFiles: 1`) into the one import folder; a third start changes no stored file. **NV-02:** a cut-short `server-instance.json` → 503 `{code: NODE_IDENTITY_NOT_MIGRATED, message: "This node's identity is waiting for its data migration."}`, no `node-identity.json`, the file byte-identical, a log line naming it, record `FAILED`; alpha → beta and beta → alpha `available: false, refusalCode: NODE_IDENTITY_NOT_MIGRATED`; beta's catalog and its hub still work; restored → migrated, same ID, peers available. **NV-03:** cut-short `hub-credentials.json` → `POST /rest/memory-sync/v1/batches` 503 `{error: MEMORY_SYNC_NOT_MIGRATED}`, `getMemorySyncStatus` refuses with "Memory Sync is waiting for its data migration.", only `LOCAL` sources, the file untouched and named, record `FAILED`; alpha's sync commits nothing and states the reason; the peers still work; restored → migrated, alpha syncs again into the same import. Runs 1–2 failed on my test (progress rows 9–10) |
| API-04 | AC-905 (fidelity: from the released code) | temporary `API-04-released-upgrade-probe.mjs`: the released build `c78ffb15a2` pairs two nodes and syncs memory; this build starts on that data; a fresh pair of this build gives the current shapes | ENV-2 | **Pass 27/27** | `API-04.log`, `API-04/api04-released-upgrade.json`: the released build wrote `server-instance.json {createdAt, serverInstanceId}`, `source.sourceNodeId`, `boundSourceNodeId`, `source-node.json`, manifest `sourceNodeId`; after the upgrade both keep their node IDs, the peers recognize each other both ways, the hub knows the same source, only the new file is sent into the same folder, backups for every renamed file, a third start changes nothing, and every converted file's keys equal the current writer's (identity, config, state, credentials, import source, manifest, peers) |
| API-05 | REQ-913 (UI), REQ-910, SM-7, SM-8 | new probe `pnpm -C autobyteus-web test:e2e:node-vocabulary` | ENV-3 | **Pass 5/5** (run 4) | `API-05-run4/node-vocabulary-probe.json`, screenshots. **NVP-01:** the released list (with `serverInstanceId`, `isSystem`) became `autobyteus.node_registry` with `nodeId`, no released field, same values; released key gone; beta listed once. **NVP-02:** beta's row: "Not reachable. This node's identity is waiting for its data migration." (`NVP-02-nodes-tab.png`). **NVP-03:** label "Memory Sync source ID" / "记忆同步源 ID" (`NVP-03-card-*.png`); the Memory page lists `local` and `imported:nvp-beta-source`. **NVP-04:** a real pairing's session under the released key → the phone shell opens its home (not the pairing screen); stored as `autobyteus.remote_access.mobile_session` `{entryId, serverBaseUrl, credential, device, pairedAt}`, no `version`; released key gone (`NVP-04-phone.png`). **NVP-05:** alpha restarted with released, cut-short hub credentials → the card shows "Memory Sync is waiting for its data migration."; the Memory page lists only `local`. Runs 1–3: probe harness fixes (progress rows 13–15); the expected and harness browser errors are listed in the JSON by phase |
| API-06 | AC-902 (renamed probes) | `remote-nodes-page`, `nodes-docker-address`, `task-agent-sibling-sidebar`, `remote-run-title`, `remote-runs-in-tree`, `agent-runtimes-settings`, `electron-launch-profile` | ENV-3, ENV-4 | Pass, except `agent-runtimes-settings` (FU-005) | `API-06/summary.log` and folders. remote-nodes-page 12/12 (seeds the released list: SM-7); nodes-docker-address 5/5 (test-owned container, removed); sibling sidebar 3/3 after a baseline fix (run 2); remote-run-title 6/6 after baseline fixes (run 3); remote-runs-in-tree 7/7 (runs 1, 3, 4; run 4 after a baseline fix); electron-launch-profile 5/5 with `--skip-build` over the macOS build (run 2; its default build is Linux-only, FU-006). agent-runtimes-settings: ARP-02, 03, 05, 06, 07, 10, 12 pass (incl. the node line through `getEntryById(entryId)` and the remote node window); ARP-01, 04, 11 fail on runtime update states, ARP-09 on a locale carried over (its error and Retry show): FU-005, not this change |
| API-07 | SM-6, AC-903 | the packaged desktop app over a released `node-registry.v1.json`: three entries (embedded with `isSystem`, a remote with `serverInstanceId` of a real test node, a never-reached remote); restart; an empty list; an unreadable file and a restart | ENV-4 | **Pass** | `API-07/`: `start-1-node-registry.json` (`nodeId` from `serverInstanceId`, no `isSystem`, other values unchanged; the embedded address set to the running server as always), `.bak` kept, a log line naming both files; `start-1-nodes-tab.json`: "remote x box" keyed by its node ID and "never reached" with its cause; restart: `.bak` removed, entries unchanged; empty list → the embedded entry only; unreadable → kept byte-identical, `start-4-log-lines.txt` warning naming it, the app works with the embedded entry; next start keeps it for recovery (`restart-5-log-line.txt`) |
| API-08 | SM-9, SM-10 | the iOS app (simulator) and the Android app (emulator) started over two saved entries and a selection under the released keys; a second start | ENV-5 | **Pass** | `API-08/`: iOS `defaults-after-1.json` (new keys, values byte-identical, `:backup` keys, old keys gone), `launch-1.png` (both saved nodes, the selected one tried), `defaults-after-2.json` (backups removed); Android `android-saved_nodes-after-1.xml` (the same), `android-launch-1.png`, `android-saved_nodes-after-2.xml` |
| API-10 | AC-903 (from a clean clone) | fresh clone at `383b1500a2`, install, server build, then the upgrade E2E | ENV-6 | **Pass 3/3** | `API-10-clean-clone.log`: `INSTALL_EXIT=0`, `BUILD_EXIT=0`, NV-01 … NV-03 pass, `E2E_EXIT=0` |
| API-09 | AC-901 | the design's word list over tracked files, excluding the migration areas and tickets | — | Pass | `API-09-word-list.log`: the remaining hits are migration notes in the docs, the published release notes, my RC-26 case (the former name on purpose), the probe seeding the released list, archived design docs under `autobyteus-web/tickets/`, and an iOS test decoding an older status answer |

## Failures And Unresolved Items

**RC-12 timed out once (FU-007, unresolved).** RC-12 (247 AC-304: the remote run and the remote Team on beta shut down after the idle grace, and a follow-up restores each) failed in API-01 run 1 and passed in five later runs.
- **The failure:** a timeout at 480 s, with 683 s on the wall clock.
- **The passes:** the diagnostic run, full run 2, and three repeat attempts. In each, RC-12 took 151–157 s, the same as in autobyteus-278's runs.
- **Every other case** ran at its usual duration in run 1, so this was not machine load. Another agent's server unit run was active on this machine while run 1 started.
- **The run 1 timeline (Measured):**
  - RC-12's promise settled only at 683 s, just after RC-13 restarted beta (12:14:30).
  - RC-36 ran against beta in that window and passed.
  - So one awaited request to beta, inside a bounded wait, hung until beta's restart reset its connection. The server as a whole kept answering.
  - Beta logged nothing during RC-12.
- **Search (Reproduced: no):**
  - no network mount, and `lsof` returns in 0.07 s;
  - step timings in RC-12 (diagnostic run and full run 2): both pass;
  - a fetch watchdog logging any request open longer than 20 s, over three repeat attempts: all pass, with no slow request.
- **Not caused by this change (Read):** this ticket's diffs near the idle shutdown and the inbound run views are renames only: `remote-run-channel.ts` and `remote-run-view-provider.ts`, 4 lines each.
- **What would settle it:** the stuck request's route, caught by the watchdog on a recurrence.
- **Disposition:** the diagnostic lines are reverted, and the cause is recorded as FU-007 with this evidence (`API-01.log`, `API-01/`, `API-01-diag-rc12.log`, `API-01-run2*`, `API-01-rc12-repro1..3.log`). I did not find the cause; I'm not closing this as flaky.

Pre-existing, outside this ticket (Rule 9: causes found; recorded as follow-ups):
- **FU-004:** the SR-011 architecture test fails at base and head; `3e3a7b08cc` added a definition getter without updating its list.
- **FU-005:** the Agent Runtimes settings probe's update-state cases fail after autobyteus-210's update checks.
- **FU-006:** the packaged-launch probe's default build is Linux-only.

Baseline fixes in this branch (test-side, labelled in their code): the sibling-sidebar fixture answers `getTeamMemberFileChanges` (since `580e1cac5b`) and the update-notifications stream (since autobyteus-210); the remote-run-title probe passes `nodeId` to `addPeerNode` (since one-nodes-tab) and both my remote probes treat a cold `nuxt dev` re-optimization as the harness; the remote-runs-in-tree probe types again when the composer re-mounts.

## Acceptance-Criteria Proof

| AC | Proven by | Status |
| --- | --- | --- |
| AC-901 | API-09; IMP-12, IMP-14, IMP-19 | Proven |
| AC-902 | API-R1 (suites); API-01 (two-server E2E, the tool name only); API-06 (Nodes tab and other probes) | Proven: the suites (reused), the two-server E2E 37/37 (run 2) with only the tool-name difference, the probes; RC-12's single timeout is FU-007 |
| AC-903 | API-03 (`peers.json` and identity from a released node), API-04 (from the released build), API-07 (the desktop list) | Proven, including from a fresh clone (API-10) |
| AC-905 | API-03, API-04 (server SM-1 … SM-5, failures, recovery, re-run), API-05 (SM-7, SM-8), API-07 (SM-6), API-08 (SM-9, SM-10); IMP migration unit tests | Proven |
| REQ-913 | API-03 NV-02, NV-03; API-05 NVP-02, NVP-05 | Proven |
| REQ-903 / REQ-906 (tool) | API-01 RC-26, RC-27 | Proven |
| REQ-910 (UI) | API-05 NVP-03 | Proven |
| AC-904 | — | The user's check (the Nodes tab and an agent's `list_peer_nodes` in their own app); the same paths are proven here on test nodes |

## Validation Confidence Scorecard (Mandatory)

| Category | Score | Basis | Residual uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | AC-901, AC-902, AC-903 (incl. a fresh clone) and AC-905 directly proven; REQ-913, REQ-910 and REQ-903/906 proven | AC-904 is the user's |
| Changed-boundary execution directness | 97% | every migration on its real start path: server, desktop shell, browser storage, phone web shell, iOS, Android | — |
| Cross-boundary integration realism and mock gap | 95% | real server processes and nodes, a real released-build upgrade, the packaged desktop app, simulator and emulator | the scripted AGY runtime instead of a model (not relevant to the renames) |
| Environment, configuration, identity, and fixture fidelity | 96% | released shapes checked against the released build's own output (API-04); clean roots, HOMEs, test-owned devices | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | damaged identity and credentials (held back, stated, recovered), unreadable desktop list, re-runs, second starts | RC-12's single unexplained timeout (FU-007) |
| User-surface, browser, and desktop-shell confidence | 94% | the Nodes tab, the Memory Sync card and Memory page (en/zh-CN), the phone shell, the desktop Nodes tab, both phone apps | the Agent Runtimes probe's update cases fail outside this change (FU-005) |
| Durable regression coverage quality and relevance | 95% | a new upgrade E2E with three cases, a new five-case probe, RC-26 extended, three probes repaired | the released-build comparison stays a temporary probe (it needs a released build) |

- Overall final confidence: 95%
- Every critical AC directly proven: `Yes` (AC-904 is the user's check)
- Target met: `Yes`

## Broader Validation Decision (Mandatory)

- **Decision:** `Required` (executed).
- **Modes:** built server processes (two-server E2E, the upgrade E2E, a real released-build upgrade); browser probes against real servers; the packaged desktop app (isolated instance); the iOS simulator and the Android emulator.
- **What it addressed:** every stored-name migration on its real start path (server, desktop shell, browser storage, phone web shell, iOS, Android), the hold-backs' answers across nodes and in the UI, and the renamed contracts between real nodes.

## Durable Coverage Changes

- New: `autobyteus-server-ts/tests/e2e/app-data-migrations/node-vocabulary-stored-names-startup.e2e.test.ts` (NV-01 … NV-03).
- New: `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` (NVP-01 … NVP-05) and its script `test:e2e:node-vocabulary` in `autobyteus-web/package.json`.
- Updated: `remote-delegation-two-server.e2e.test.ts` RC-26 (the former tool name selects nothing; header line).
- Baseline fixes: `task-agent-sibling-sidebar-probe.mjs`, `remote-run-title-probe.mjs`, `remote-runs-in-tree-probe.mjs` (above).
- Temporary (evidence only, not durable): `…/evidence/api-e2e/API-04-released-upgrade-probe.mjs` (needs a released build).

## Cleanup

Every server, `nuxt dev`, browser, desktop instance, container, simulator, emulator and temp root started for this validation was stopped or removed (receipts in each case's evidence). The released worktree was removed. The RC-12 diagnostic lines were reverted. No secret is in the evidence (the test pairing credential is redacted).
