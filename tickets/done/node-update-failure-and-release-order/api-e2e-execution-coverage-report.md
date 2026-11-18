# API/E2E Execution Coverage Report

Ticket autobyteus-412 `node-update-failure-and-release-order`. Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order`, branch
`codex/node-update-failure-and-release-order`. Validated commit `405c28d45e` (code identical to the reviewed
`df789a89a5`). Paths are relative to the ticket folder unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review CRR-001 passed
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-07 ran twice. Run 1 proved the outcome (record cleared, no reload), but its 50 ms sampler missed the line's brief
    appearance. Run 2 added a `MutationObserver` to the probe (`first-view.js`), which captures the line being added
    and removed. One attempt between them navigated before the app's start redirect to `#/chat` and never reached the
    Nodes page. That was a harness timing effect: the probe now waits for `#/chat`. In that attempt the record stayed
    intact, as expected with no Nodes view and the switch off.
  - API-10 also covers AR-003, the design's "a pass leaves a V failure in place". The switch was on and the window
    stayed on `#/chat` through the 2-min pass, before the first Nodes view.
  - API-09 closed the window (`window.close()` over CDP), so the pass ran with no window at all.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order/tickets/in-progress/node-update-failure-and-release-order/evidence/`
  (`API-*` files; the temporary harness is in `evidence/API-harness/`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable`. No repository test code was added or changed this round;
  the journeys are temporary probes. The code reviewer may still read the harness in `evidence/API-harness/`.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `df789a89a5` (implementation's checks) | macOS 26 arm64 | Node v22.23.1, Python 3.9.6, bash 3.2.57 (see `implementation-handoff.md` Checks Run) | worktree |
| ENV-2 | `405c28d45e` | macOS 26 arm64 | Fresh clone `/tmp/ab412-e2e/clone` (`git clone --no-local`); Node v22.23.1, pnpm 10.28.2, Python 3.9.6; Docker `rhysd/actionlint:latest` (1.7.12) | No build output in the clone; the release job's environment variables; no signing identity (`CSC_IDENTITY_AUTO_DISCOVERY=false`) |
| ENV-3 | `405c28d45e` | macOS 26 arm64 + Docker (arm64) | The packaged `AutoByteus.app` 1.5.12-beta.7 built in ENV-2, started by `pnpm --silent isolated-app start --app <clone bundle> --data-root /private/tmp/ab412-e2e/data-root` (e2e profile; own ports, own userData, no app update checks). Test node `ab412-e2e-node` started from `autobyteus/autobyteus-server:beta` (image starter; built-in server package `1.5.12-beta.3`) on `127.0.0.1:18412` with five fresh `ab412-e2e-node-*` volumes. Logging proxy `harness/proxy.mjs` on `127.0.0.1:18413` | The node entry was added in the UI at `http://localhost:18413` (entry `remote-9b9dfdc6-…`), so its `baseUrl` and the card's address are the proxy. The record file was seeded while the app was stopped, in the RUN-01 shape. In the proxy log, `ua: "node"` is the main process's `NodeUpdateClient` and `ua: "Mozilla/…"` is the window. The user's nodes (8001, 8003, `autobyteus-server-1`) were never contacted |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001–004, AC-005 (logic), AC-006, AC-007, AC-009, QR-002 | Repository suites (unit, Electron main, component, step tests, typecheck, guards, mutations) | Reused: IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10 | ENV-1 | Pass | See `implementation-handoff.md` Checks Run (`evidence/IMP-*.log`) | As listed there (for example `Tests  88 passed (88)`, `Tests  67 passed (67)`, `Ran 11 tests` / `OK`) | All ran on `df789a89a5`. `git diff --name-only df789a89a5 405c28d45e` lists only `tickets/in-progress/node-update-failure-and-release-order/**`, so the code they exercise is unchanged. Each log has a header and a result line |
| API-02 | TESTING.md Fresh-start build (`.github/workflows/**`, `scripts/**` matched); AC-009 | Release desktop build from a clean clone | `git clone --no-local <worktree> /tmp/ab412-e2e/clone && git checkout 405c28d45e`; `pnpm install --frozen-lockfile`; `cd autobyteus-web && ulimit -n 65536 && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; then the job's "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" commands from the clone root | ENV-2 | Pass | `API-02-fresh-install.log`, `API-02-fresh-build-excerpt.log`, `API-02-fresh-build-full.log`, `API-02-verify-steps.log` | `Done in 14.1s`, `EXIT 0` (install); `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `[typecheck] PASS`, `Build completed:` with `AutoByteus_personal_macos-arm64-1.5.12-beta.7.dmg`, `EXIT 0` (build); `PRISMA VERIFY OK`, `[terminal-runtime] ok: node-pty spawn probe`, `TERMINAL VERIFY OK`, `isolated-launch.json`, `EXIT 0` (verify) | Not tested here: signing, notarization and "Verify macOS signing policy" (runner secrets), and the Linux and Windows builds (other OS). The changed step is in `publish-release`, which neither a local build nor the build-only run executes; API-03 is its proof. The bundle built here is the app in API-04..API-10 |
| API-03 | AC-005 (wait logic), AC-006, AC-007, AC-009 | `release-desktop.yml` and the release step tests, in the clean clone | In the clone: `python3 -m unittest scripts/tests/test_desktop_release_server_package_wait.py scripts/tests/test_release_channel_workflow_steps.py scripts/tests/test_desktop_release_beta.py scripts/tests/test_server_package_release.py scripts/tests/test_merge_latest_mac_metadata.py -v`; `docker run --rm -v <clone>:/repo -w /repo rhysd/actionlint:latest -no-color .github/workflows/release-desktop.yml`, also run on the base `6225a734a3` file for comparison | ENV-2 | Pass | `API-03-step-tests-actionlint.log` | `Ran 54 tests in 26.122s`, `OK`, `EXIT 0`; under the actionlint header for 405c28d45e there are no findings, then `EXIT 0` (the base also gives `EXIT 0`) | actionlint runs shellcheck on the inline `run:` blocks, the new wait step's bash included |
| API-04 | AC-004 (switch off), REQ-003, AC-009 (switch off by default), QR-002 | Packaged window → store → preload → IPC → `recheckFailure` → C1 on a node older than V | (1) Add the node in Settings → Nodes. The registry entry has no `autoUpdate` and the switch shows `aria-checked="false"`. (2) Stop the instance; write `node-auto-updates.json` with `AUTO_FAILED 1.5.12-beta.7` (RUN-01 shape); start it; open Nodes. (3) Read the card DOM at +1, +5 and +15 s; read the proxy log and the record | ENV-3 | Pass | `API-04-record-seeded.json`, `API-04-card-final.json`, `API-04-proxy.log`, `API-04-card-beta3-failure-stays.png` | Card: `"serverVersion": "Server 1.5.12-beta.3"`, `"updateButton": "Update to 1.5.12-beta.7"`, `"autoFailedLine": "Automatic update failed. Nothing was changed.\nNo server package was published for 1.5.12-beta.7 (linux-arm64)."`. Proxy: window `GET /rest/node-update?target=1.5.12-beta.7` at `20:12:16.311Z`, then `"ua":"node"` at `20:12:16.322Z` (the recheck); no `POST /rest/node-update`. Record: `diff` with the seed is empty (`RECORD-UNCHANGED`) | First end-to-end proof that the packaged preload → IPC → `recheckFailure` path fires, and that it leaves a valid failure alone |
| API-05 | AC-004 (switch on), REQ-003 one-attempt rule | Packaged main process: switch-on check and the 2-min first pass | In the API-04 instance (started 20:12:13Z), click the card's "Update automatically" switch on; wait past start + 2 min; read the proxy log, the record and the card | ENV-3 | Pass | `API-05-proxy.log`, `API-05-record-after.json`, `API-05-card-final.json`, `API-05-card-switch-on-failure-stays.png` | `"ua":"node"` `GET /rest/node-update?target=1.5.12-beta.7` at `20:12:54.336Z` (switch turned on) and `20:14:09.734Z` (first pass); `POST node-update count: 0`; `RECORD-UNCHANGED`; card `"autoSwitchChecked": "true"` with the failure line still shown | The reordered `startNodeAutoUpdates` starts the pass timer in the packaged app |
| API-06 | AC-003 (card's own update), REQ-002, SCN-001 | The card's "Update to V" → real node update → recheck → broadcast → card | Switch off in the UI; record `AUTO_FAILED 1.5.12-beta.7`. Click "Update to 1.5.12-beta.7": the node downloads the published beta.7 server package from GitHub and switches. Sample the card every 3 s until the notice shows | ENV-3 | Pass | `API-06-card-timeline.jsonl`, `API-06-proxy.log`, `API-06-record-after.json`, `API-06-node-answer-after.json`, `API-06-card-updated-no-failure.png` | Timeline: `"progress": "Downloading 1.5.12-beta.7…"`, then `"Restarting…"` with the line still shown (update `running`), then at `20:16:51.992Z` `"notice": "Updated to 1.5.12-beta.7."`, `"autoFailedLine": null`, `"autoUpdatedLine": null`. Proxy: a single `POST /rest/node-update` `202` (window), and `"ua":"node"` rechecks at `20:15:16.074Z`, `20:15:50.214Z` and `20:16:50.572Z`. Record `{"entries": {}}` (file mtime 20:16:50Z). Node: `"version":"1.5.12-beta.7"`, `"relation":"same"`, `"state":"succeeded"` | The rule held while the update ran: the line stayed until `succeeded`. The screenshot shows the card on beta.7 with no failure line; the notice row is below the viewport, and the DOM timeline is the proof |
| API-07 | AC-001, AC-003 (switch off, first view, no reload), AR-001 | Restart → first Nodes view in a new window | Node on beta.7. Stop; reseed `AUTO_FAILED 1.5.12-beta.7`; start; wait for `#/chat`; run `first-view.js` (navigates to `#/nodes`, samples every 50 ms, `MutationObserver` on the line) | ENV-3 | Pass | `API-07-record-seeded.json`, `API-07-run1-first-view.json`, `API-07-run1-proxy.log`, `API-07-run1-record-after.json`, `API-07-run2-first-view.json`, `API-07-run2-proxy.log`, `API-07-run2-record-after.json`, `API-07-card-final.json`, `API-07-card-after-first-view.png` | Run 2: `"lineEvents"` `added` at `20:19:00.252Z`, `removed` at `20:19:00.280Z`; `"sameDocument": true`, `"startRoute": "#/chat"`, `"endRoute": "#/nodes"`. Proxy: window GET `20:19:00.250Z`, `"ua":"node"` GET `?target=1.5.12-beta.7` `20:19:00.274Z`; no node-update request before the Nodes view, no POST. Record `{"entries": {}}`. Card: `"serverVersion": "Server 1.5.12-beta.7"`, `"autoFailedLine": null`, `"notice": null` | The notice is null as expected: this window did not follow the update, so "as with no outcome" shows nothing. Run 1 (20:17:41Z) gave the same record and proxy result |
| API-08 | AC-001, AC-003 (switch on, first view) | As API-07, switch on | Switch on in the UI; stop; reseed; start (20:19:55Z); first Nodes view at once; then wait past the 2-min pass | ENV-3 | Pass | `API-08-first-view.json`, `API-08-proxy.log`, `API-08-record-after.json`, `API-08-card-final.json`, `API-08-card-after-first-view.png` | `added` `20:19:55.680Z`, `removed` `20:19:55.703Z`, `"sameDocument": true`; proxy `"ua":"node"` `20:19:55.698Z`, then the pass at `20:21:48.541Z`; `POST node-update: 0`; record `{"entries": {}}` after the pass (no `AUTO_UPDATED` entry) | The recheck cleared the entry before the pass; the pass then found nothing to request |
| API-09 | DS-001, AC-001 by a pass (reviewer item 4) | Packaged main process with no window | Switch on; stop; reseed; start (20:22:46Z); close the window over CDP; check the app and backend are alive; wait past start + 2 min | ENV-3 | Pass | `API-09-proxy.log`, `API-09-record-after.json` | Proxy: the only request is `"ua":"node"` `GET /rest/node-update?target=1.5.12-beta.7` at `20:24:46.326Z`; record `{"entries": {}}` with mtime 20:24:46Z; `page targets: 0` | After the window closed, CDP listed no page target; the process stayed up and `/rest/health` answered ok |
| API-10 | AC-002, AR-003 | A pass at V+1 leaves the V failure; the card's recheck with `?target=<entry.version>` clears it | Node on beta.7; switch on. Stop; seed `AUTO_FAILED 1.5.12-beta.3`; start (20:25:31Z); stay on `#/chat` through the pass; then first Nodes view | ENV-3 | Pass | `API-10-record-seeded.json`, `API-10-proxy.log`, `API-10-first-view.json`, `API-10-record-after.json`, `API-10-node-answers.txt`, `API-10-card-final.json`, `API-10-card-after-first-view.png` | The pass `"ua":"node"` `?target=1.5.12-beta.7` at `20:27:27.787Z`, then `RECORD-UNCHANGED-AFTER-PASS`. After the Nodes view: `"ua":"node"` `GET /rest/node-update?target=1.5.12-beta.3` at `20:27:54.369Z`, line `added` `.366`, `removed` `.371`; record `{"entries": {}}`; node answer `"target":{"version":"1.5.12-beta.3","relation":"older"}`; `POST node-update: 0` | The real starter's `relation: older` drives the clearing |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-02/03), API-06, API-07, API-08, API-09 | Proven | — |
| AC-002 | Yes | API-01 (IMP-03), API-10 | Proven | — |
| AC-003 | Yes | API-01 (IMP-05, IMP-10 A), API-06, API-07, API-08 | Proven | — |
| AC-004 | Yes | API-01 (IMP-03), API-04, API-05 | Proven | — |
| AC-005 | Yes | Wait logic: API-01 (IMP-07, IMP-10 B), API-03. The order on a real tag: not run (see Notes) | Proven for the step logic. The real `createdAt` order is delivery's check on the next release (RSK-002), not a user-only check | A tag push needs a release, which is the user's decision; RELEASE.md gives the check |
| AC-006 | Yes | API-01 (IMP-07), API-03 | Proven | — |
| AC-007 | No | API-01 (IMP-07), API-03 | Proven | — |
| AC-008 | No | Code review CRR-001 (docs checked against the workflow); not an executable criterion | Proven by review | — |
| AC-009 | Yes | API-01 (IMP-03..IMP-09), API-02, API-03, API-04 (switch off by default) | Proven | — |

Notes: AC-005's verification intent in the requirements is "test of the wait logic against a fake release; the upload
order checked on the first real release that uses it". The first part is proven here. The second belongs to delivery,
on the user's word to release.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | API-01, API-03..API-10 | The real-tag asset order (AC-005 on GitHub) | The next release (delivery) |
| Changed-boundary execution directness | 75% | 96% | API-04..API-10 exercise the packaged preload → IPC → `recheckFailure`, the pass timer, the record file and real C1 answers | The release workflow's `publish-release` ran only as extracted steps | A real tag |
| Cross-boundary integration realism and mock gap | 70% | 95% | Real starter (`relation`), real package download and switch (API-06), real broadcast to the window | The node sat behind a transparent logging proxy, and the address-vs-`baseUrl` mismatch was not exercised (accepted design risk) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Fresh-clone build (API-02), same image as the user's nodes, RUN-01-shaped seed | The `AUTO_FAILED` entry was seeded, not produced by a real `NO_PACKAGE_FOR_VERSION` (that race needs a release gap, and SCN-005 is contrived) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | API-04/05 (valid failure kept; one-attempt rule), API-06 (no clear while `running`), API-10 (AR-003), API-09 (no window), restarts; AC-006 timeout in step tests | P-003 (recheck dropped while a pass holds `checking`) was not reproduced live (cosmetic, unit-covered) | — |
| User-surface, browser, and desktop-shell confidence | 70% | 96% | API-04..API-10 in the packaged app's real window; `MutationObserver` proof of no reload | Screenshots are viewport-only | — |
| Durable regression coverage quality and relevance | 93% | 93% | IMP-03/05/07 with IMP-10 mutations | No durable packaged-desktop + Docker journey (it would need an image, a network download and a packaged app; TESTING.md has no such layer) | — |

- Overall post-repository confidence: 80%
- Overall final confidence: 95% (simple average of 96, 96, 95, 95, 95, 96, 93 = 95.1)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`. AC-005's
  real-tag order is a delivery check on the next release, as the requirements planned
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: RSK-002 (the real asset order), RSK-001 (intended), the address vs `baseUrl`
  mismatch (accepted), P-003 (cosmetic)

## Broader Validation Decision (Mandatory)

- Decision: `Required`, then executed
- Execution mode: `Project Desktop Validation` (an isolated packaged instance of the fresh-clone build) with a
  test-owned Docker node
- Confidence gap it addresses: repository tests mock the preload, the IPC and the node, and they cannot exercise
  the reordered `startNodeAutoUpdates`, the real 2-min pass, the real starter's `relation`, or the window/main
  sequencing on a first view. The run raised the overall confidence from 80% to 95%.
- Browser validation needed: no separate browser run. The behavior is desktop-shell (preload/IPC), and the packaged
  window covers the renderer part.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: as planned, plus the API-07 probe improvement and the no-window variant (API-09)
- Web-equivalent behavior: the card's line and notice (API-04, API-06, API-07, API-08, API-10). Shell-specific or
  lifecycle behavior: preload/IPC recheck (API-04, API-06, API-07, API-08, API-10), the pass timer and switch-on
  check (API-05, API-08, API-09, API-10), the record file write (all), and no window (API-09)
- Effect on any already-running desktop application: `None`. Only the run's own isolated instance ran; `isolated-app list`
  showed no other instance before and none after.
- Behavior not directly proven: the other SCN-001 routes (`autobyteus-docker update`, a new image). They reach the
  same node answer and the same recheck as API-07/08, where the node already ran V when the desktop started.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: a synthesized `node-auto-updates.json` in the RUN-01 shape (`version`,
  `requestedAt`, `outcome: AUTO_FAILED`, `reason`, `read: true`) keyed by the UI-created entry ID
- Approved transition followed without an unnecessary migration: `Yes`. The packaged app's normal reader showed the
  seeded entry (API-04) and removed it by the rule (API-06..API-10). The result is `{"entries": {}}`, with no new field.
- Cases: API-04 (read), API-06..API-10 (removal)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The `latest*.yml` files are uploaded
  only by the new step (IMP-07 asserts that the softprops lists hold none)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

None.

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The `AUTO_FAILED` outcome itself | Seeded record file (RUN-01 shape) while the app was stopped | A real `NO_PACKAGE_FOR_VERSION` needs a release published before its packages, which is the race this ticket removes | None for the clearing rule; the reader and the rule are real |
| The node's network path | Transparent logging proxy in front of the real node | To see which process sent each request (method, path, user agent) | Adds an extra local hop; the WebSocket and HTTP pass-through were not otherwise altered |
| GitHub release / `gh` for the wait step | Fake `gh`/`sleep` in the step tests (IMP-07, API-03) | A real tag is a release | The real order is RSK-002 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Fresh clone `/tmp/ab412-e2e/clone` (with its build output) | Yes | `rm -rf` | Removed |
| Isolated instances `iso-55337-ad6b`, `iso-55693-7b42`, `iso-56611-2da3`, `iso-56738-ab15`, `iso-57085-48aa`, `iso-57567-47d0`, `iso-57812-5338` | Yes | `pnpm --silent isolated-app stop <id>` after each case | All stopped; ports released; `isolated-app list` → `instances: 0` |
| Data root `/private/tmp/ab412-e2e/data-root` | Yes | `rm -rf` (the tool never deletes a provided root) | Removed |
| Container `ab412-e2e-node` and volumes `ab412-e2e-node-{workspace,data,root-home,chromium-profile,server-packages}` | Yes | `docker rm -f -v ab412-e2e-node`; `docker volume rm` ×5 | Removed; `docker ps -a --filter name=ab412` and `docker volume ls --filter name=ab412` are empty |
| Logging proxy (`node proxy.mjs 18413 18412`, pid 31409) | Yes | `kill` | Stopped; ports 18412/18413 free |
| Harness and logs `/tmp/ab412-e2e/{harness,logs}` | Yes | Copied into `evidence/` (`API-harness/`, `API-*`), then removed | Removed after the commit |
| User's nodes `autobyteus-server-0/1/2` | No | Not contacted | Still `Up 28 hours` |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None. AC-005's real-tag order is delivery's
  check on the next release (RSK-002), as the requirements planned.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: the code reviewer (reviewed route). There are no durable test changes to
  review; the result goes on toward delivery.
- Notes: Fresh-start build decision recorded in API-02. The TESTING.md path rule fires, and the macOS arm64 build
  passes from a clean clone. The build-only release run (DESIGN rule 12) is not required, because no build step or
  gate changed and `publish-release` is not part of it.
