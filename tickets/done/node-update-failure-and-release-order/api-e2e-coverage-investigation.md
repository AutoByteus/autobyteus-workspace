# API/E2E Coverage Investigation

Ticket autobyteus-412 `node-update-failure-and-release-order`. Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order`, branch
`codex/node-update-failure-and-release-order`. Commit under validation: `405c28d45e` (code identical to the reviewed
implementation commit `df789a89a5`; `git diff --name-only df789a89a5 405c28d45e` lists ticket documents and
`evidence/` only). Paths below are relative to the ticket folder
`tickets/in-progress/node-update-failure-and-release-order/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-002 current)
- Design Spec (required on every route): `design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts: None
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (message from `/software_engineering_team/code_reviewer`)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this document, round 1

## Current Requirement And Design Basis

- FU-003 (REQ-001–003, AC-001–004): the main process (`NodeAutoUpdater`) removes an `AUTO_FAILED` entry for V when the
  node's answer to `?target=V` has `relation` `same`/`older` and no update `running` (`isSupersededFailure`). Two paths:
  DS-001, a pass/follow (asks `?target=<app version>`, so it clears only a failure for the desktop's own version), and
  DS-002, the Nodes-page card's recheck (card watch → store → preload `recheckNodeAutoUpdate` → IPC
  `node-auto-update:recheck` → `recheckFailure`, asks `?target=<entry.version>`, switch on or off, never a POST). The
  cleared entry does not become `AUTO_UPDATED`; the card shows no automatic line and its own notice shows as with no
  outcome. A failure for V whose node is older stays, and the one-attempt rule holds (no POST).
- FU-004 (REQ-004–007, AC-005–008): Desktop Release `publish-release` uploads binaries without `latest*.yml`, waits
  (120 × 30 s) for the six server package files, then `gh release upload --clobber` of the four updater files; the wait
  is skipped on refs without `autobyteus-server-ts/docker/system-level.json`; on timeout `::error::` names the tag and the
  missing files. RELEASE.md documents order and recovery.
- Preserved (AC-009): auto updates off by default; existing suites pass; `release:test` publishes nothing.
- Classification: `Medium` / `High`, reviewed route (architecture review + code review).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (card "Update to V" route; the other routes — `autobyteus-docker update`, a new
  image — reach the same card answer and the same recheck, represented by API-07/08 where the node already runs V when
  the desktop starts), SCN-002 (node past V: API-10 by the recheck; API-09 by a pass), SCN-003 (workflow order: step
  tests and actionlint; the real tag order is delivery's, RSK-002), SCN-004 (timeout/recovery: step test, RELEASE.md).
- Real-use scenarios added from the implementation:
  - SCN-A1 "Desktop restarts / the user opens Settings → Nodes the first time while the stale entry is on disk" (the
    design's AR-001 first-view order: the cell's first answer arrives before the store loads the entries). Real trigger:
    app start + navigation. API-07, API-08.
  - SCN-A2 "Packaged desktop with the switch on and no Nodes view": the 2-minute first pass of the reordered
    `startNodeAutoUpdates`. Real trigger: app start. API-09.
  - SCN-A3 "Switch on, node still older, failure valid": the pass must neither clear nor POST (one-attempt rule, AC-004
    switch-on half). Real trigger: app start, 2-min pass. API-05.
- Not tested (contrived): SCN-005 (hand-installed V before the packages) as an automatic path.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 superseded failure removed (pass + recheck) | Added | REQ-001, DS-001/002 | Unit (reused) + packaged journeys API-07..API-10 |
| BEH-001 failure stays while node older; no re-request | Preserved | REQ-003, AC-004 | Unit (reused) + journeys API-04, API-05 (proxy shows no POST) |
| BEH-002 card line gone; own notice shows | Changed | REQ-002, AC-003 | Component (reused) + journeys API-06..API-08, API-10 |
| New IPC `node-auto-update:recheck`, preload `recheckNodeAutoUpdate`, reordered `startNodeAutoUpdates` | Added | design Ownership Map | Only the packaged desktop exercises it: journeys |
| BEH-003 publish order (binaries → wait → updater files) | Changed | REQ-004–006 | Step test (reused + rerun in the fresh clone), actionlint, fresh-start build |
| BEH-004 desktops offered V after the packages | Preserved (follows BEH-003) | REQ-004 | No app change; not exercisable without a tag |
| BEH-005 RELEASE.md | Changed | REQ-007 | Review (code review confirmed); docs read |
| Record file shape | Preserved | QR-002, Directly Usable | Journeys seed the RUN-01 shape and the normal reader uses it |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `isSupersededFailure`, `NodeAutoUpdater.reconcile/recheckFailure`, record `remove` | IMP-02, IMP-03 (unit, fake client) | Real C1 `relation` answers from a real starter | Packaged desktop + test-owned Docker node |
| API / transport / contract | Yes | C1 `GET /rest/node-update?target=V` (unchanged contract, new caller usage `?target=<entry.version>`) | Unit with a fake client | Real node answers, no POST | Logging proxy in front of the node |
| Frontend component / state | Yes | `NodeServerUpdate.vue` watch, `nodeAutoUpdateStore.recheck` | IMP-05 (happy-dom, mocked preload) | Real preload/IPC and real broadcast | Packaged desktop |
| Browser integration / user journey | Yes | Settings → Nodes card | Component tests | Real rendering, ordering of real answers | Packaged desktop window via CDP |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | card line and notice | IMP-05 | — | Packaged desktop |
| Desktop shell / Electron-specific integration | Yes | preload API, IPC handler, `startNodeAutoUpdates` order | `nodeAutoUpdateIpc.spec.ts` (handler only) | The packaged preload → IPC → `recheckFailure` wiring | Packaged desktop (isolated instance) |
| Process / lifecycle | Yes | First pass 2 min after start (packaged only) | IMP-03 fake timers | Real timer in a packaged app | API-05, API-09 |
| Persisted-data transition | Yes (entries removed, shape unchanged) | `node-auto-updates.json` | QR-002 unit | Real file read/write by the packaged app | Journeys read the file after each case |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | GitHub release workflow; node downloads a published package | IMP-07/08 step tests | Real tag order (RSK-002) | Not reachable without a tag: delivery |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order`
- Project type and runtime stack: pnpm monorepo; Nuxt/Electron desktop (`autobyteus-web`), Node server in a Docker image
  with the starter (`autobyteus-server-ts/docker`), GitHub Actions release workflows, Python step tests.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order/TESTING.md`
  (root; no closer `TESTING*.md` under `autobyteus-web/` or `scripts/`).
- Conflicting, missing, or unclear project instructions: none. The design leaves the Fresh-start decision to API/E2E.
- Changed build-input paths: `.github/workflows/release-desktop.yml` (`.github/workflows/**`) and
  `scripts/tests/test_desktop_release_server_package_wait.py` (`scripts/**`) match. The rule fires, so API-02 runs the
  fresh-start desktop build (macOS arm64). The changed workflow step is in `publish-release`, which no local build and
  not the build-only run executes; its proof is API-03.
- Required environment variables or secrets available: `N/A` (no provider keys needed; signing/notarization secrets are
  the runner's: Not Tested).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | Layers | Desktop-shell/preload/IPC → Electron tests + an isolated desktop instance |
| `TESTING.md` § Fresh-start build | Build-input rule | Fresh clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the runner env; then "Verify bundled Prisma" and "Verify packaged terminal runtime" |
| `TESTING.md` § Docker server nodes | Node safety | Test-owned container from the same image, `127.0.0.1` free port, fresh volumes; `docker rm -f -v` afterwards; never the user's nodes |
| `TESTING.md` Rules 1–5 | Isolated instance | `isolated-app start`, use reported ports, stop what you started |
| `docs/isolated-app-instances.md` | Isolated instance | `--app <bundle>`, `--data-root` (never deleted by the tool), `restart` keeps the data root, `stop`, CDP on the control port |
| `.github/workflows/release-desktop.yml` macOS ARM64 job | Fresh-start order | install → build (with `NO_TIMESTAMP`, `AUTOBYTEUS_BUILD_FLAVOR=personal`, `PRISMA_CLI_BINARY_TARGETS`) → verify Prisma → verify terminal runtime → signing policy (runner) |
| `autobyteus-web/electron/launch-profile/electronLaunchProfilePaths.ts` | e2e profile | `userData` is under the data root, so the seeded `node-auto-updates.json` and `node-registry.json` are test-owned |
| `autobyteus-server-ts/docker/docker-compose.yml`, the user's node mounts (read-only `docker inspect`) | Node layout | Volumes for `/root`, data, workspace, chromium profile, server packages; env `AUTOBYTEUS_SERVER_HOST`, `cap_add SYS_ADMIN`, `seccomp=unconfined` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh clone | `/tmp/ab412-e2e/clone` | `git clone --no-local <worktree>`; `git checkout 405c28d45e` | no build output | `git log -1` | `rm -rf /tmp/ab412-e2e/clone` |
| Packaged desktop (fresh-clone build) | clone `autobyteus-web` | API-02 build | `electron-dist/mac-arm64/AutoByteus.app` | bundle + `isolated-launch.json` | removed with the clone |
| Isolated desktop instance | worktree root | `pnpm --silent isolated-app start --app <clone bundle> --data-root /tmp/ab412-e2e/data-root` | own ports, own userData | `start` result (health + window) | `isolated-app stop <id>`; `rm -rf` the data root |
| Test node `ab412-e2e-node` | — | `docker run -d … -p 127.0.0.1:18412:8000` from `autobyteus/autobyteus-server:beta` (built-in package `1.5.12-beta.3`), five `ab412-e2e-node-*` volumes | arm64 | `/rest/health` ok | `docker rm -f -v ab412-e2e-node`; `docker volume rm ab412-e2e-node-*` |
| Logging proxy | `/tmp/ab412-e2e/harness` | `node proxy.mjs 18413 18412 <log>` | HTTP + WebSocket pass-through, logs method/path/status | `proxy-listening` line | kill its pid |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Remote node entry for the test node | Added through Settings → Nodes (UI) at `http://localhost:18413` | in the instance's own userData | removed with the data root |
| `AUTO_FAILED` entry for V | Written into the instance's `userData/node-auto-updates.json` while the instance is stopped, RUN-01 shape (version, requestedAt, outcome, reason, read) and the entry ID the UI created | Synthesized, not copied from user data (TESTING.md § Data) | removed with the data root |
| Node on V = `1.5.12-beta.7` | The card's own "Update to 1.5.12-beta.7" (API-06) downloads the published beta.7 package | test-owned volume only | removed with the volumes |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec § Persisted Data; handoff § Persisted Data Transition Check
- Representative existing-data setup and required behavior: a `node-auto-updates.json` in the RUN-01 shape (one remote
  entry, `AUTO_FAILED`, `read: true`, the RUN-01 reason) is read by the packaged app's normal reader and shown on the card.
- Evidence planned: the file before and after each journey; the card showing the seeded line (API-04) proves the reader.
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/nodeAutoUpdate/__tests__/decideNodeAutoUpdate.spec.ts` | Rule examples incl. AR-003 | AC-001/002/004 | Still Valid | IMP-03 | Reuse |
| `…/__tests__/nodeAutoUpdater.spec.ts` | RUN-02 reproduction, AC-004, AR-002, AR-003, recheck cases | AC-001/002/004; design (b)(c) | Still Valid | IMP-01/02/03 | Reuse |
| `…/__tests__/nodeAutoUpdateRecord.spec.ts` | `remove`, QR-002 | QR-002 | Still Valid | IMP-03 | Reuse |
| `…/__tests__/nodeAutoUpdateIpc.spec.ts` | Handler forwards a string ID only | IPC | Still Valid | IMP-03 | Reuse |
| Electron suite (`electron/vitest.config.ts`) | Main process regressions | AC-009 | Still Valid | IMP-04 | Reuse |
| `autobyteus-web/components/settings/nodes/__tests__/NodeAutoUpdate.spec.ts` | Card (d) cases, AC-003 | AC-003; AR-001 | Still Valid | IMP-05, IMP-10(A) | Reuse |
| `components/settings`, `stores` suites | Regression | AC-009 | Still Valid | IMP-06 | Reuse |
| `scripts/tests/test_desktop_release_server_package_wait.py` | Wait/skip/timeout/upload, step order, no `latest*.yml` in softprops | AC-005 (logic), AC-006, AC-007 | Still Valid | IMP-07, IMP-10(B) | Reuse; rerun in the fresh clone (API-03) |
| `scripts/tests/test_release_channel_workflow_steps.py`, `test_desktop_release_beta.py`, `test_server_package_release.py`, `test_merge_latest_mac_metadata.py` | Other release steps unchanged | AC-009 | Still Valid | IMP-08 | Reuse; rerun in the fresh clone (API-03) |
| `autobyteus-web` packaged harness (`test:e2e:electron*`) | Packaged launch/isolation | — | Out Of Scope | — | — |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001–004, AC-005 (logic)–007, AC-009, QR-002 | Repository suites | Reused | IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10 | All ran on `df789a89a5`; `git diff --name-only df789a89a5 405c28d45e` touches only the ticket folder; each log has a header and a result line |
| API-02 | Fresh-start build rule; AC-009 | Release build from a clean clone | Existing Test (project build) | Fresh clone at `405c28d45e`; `pnpm install --frozen-lockfile`; `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; then the job's "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" commands | TESTING.md path rule fires; the bundle is also the app the journeys run |
| API-03 | AC-005 (logic), AC-006, AC-007, AC-009 | Workflow file + step tests in the clean clone | Existing Test | In the clone: `python3 -m unittest` of the five release step-test files; `docker run --rm -v <clone>:/repo -w /repo rhysd/actionlint:latest .github/workflows/release-desktop.yml` | Proves the workflow parses/lints and the step tests need nothing from the worktree |
| API-04 | AC-004 (switch off), AC-009 (switch off by default), QR-002 | Packaged desktop → proxy → node (beta.3) | Journey | Seed `AUTO_FAILED 1.5.12-beta.7`; open Settings → Nodes; assert the line stays, the card offers "Update to 1.5.12-beta.7"; proxy shows `GET ?target=1.5.12-beta.7` and no POST; record unchanged | Packaged preload/IPC with a real "older" answer |
| API-05 | AC-004 (switch on), REQ-003 one-attempt | Packaged main process 2-min pass | Journey | Switch on; restart; wait > 2 min; proxy shows the pass `GET ?target=1.5.12-beta.7` and no POST; record unchanged; line still shown | Real pass timer in a packaged build |
| API-06 | AC-003 (card's own update), SCN-001 | Card button → node update → recheck | Journey | Switch off; record `AUTO_FAILED 1.5.12-beta.7`; click "Update to 1.5.12-beta.7"; node downloads and switches; after success: "Updated to 1.5.12-beta.7." shown, no automatic line, record without the entry (not `AUTO_UPDATED`); proxy: the window's POST, then the main process's `GET ?target=1.5.12-beta.7` | The SCN-001 route end to end |
| API-07 | AC-001, AC-003 (switch off, first view) | Restart → first Nodes view | Journey | Node on beta.7; stop; reseed `AUTO_FAILED 1.5.12-beta.7`; start; open Nodes the first time; line disappears without a reload; record loses the entry; no POST | AR-001 first-view order in a real window |
| API-08 | AC-001, AC-003 (switch on, first view) | Same, switch on | Journey | As API-07 with the switch on, Nodes opened within the first 2 minutes | Switch-on half of AC-001/003 |
| API-09 | DS-001, AC-001 by a pass | Main process pass, no Nodes view | Journey | Switch on; reseed; start; do not open Nodes; at ~2 min the proxy shows the pass's GET and the record loses the entry; no POST | Optional reviewer item 4 |
| API-10 | AC-002 | Recheck with `?target=<older V>` | Journey | Switch off; seed `AUTO_FAILED 1.5.12-beta.3` (node on beta.7); open Nodes; record loses the entry; proxy shows `GET ?target=1.5.12-beta.3` | Node newer than V through the real starter's `relation: older` |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. The journeys need a Docker image, a published GitHub package download and a packaged app; that is not a
repository test the codebase runs (TESTING.md lists no such layer). The repository already holds the durable unit,
component and step tests for every rule the journeys exercise; the journeys are temporary probes recorded as evidence.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (packaged macOS arm64 build of the commit, from the fresh clone)
- Testing guideline used: TESTING.md (Choosing the path: desktop-shell → isolated desktop instance), `docs/isolated-app-instances.md`
- Web-equivalent behavior: the card's line and notice
- Shell-specific or lifecycle behavior: preload `recheckNodeAutoUpdate`, IPC `node-auto-update:recheck`, `recheckFailure`, the broadcast, `startNodeAutoUpdates` order, the 2-min pass (packaged only), `userData` record file
- Chosen approach: `isolated-app start --app <fresh-clone bundle> --data-root <test-owned>`, driven over CDP (`run-script`, DOM reads), plus the record file and the proxy log
- Server/frontend setup: none beyond the packaged app; its embedded server is the instance's own
- Avoiding disturbance: isolated instance (own ports, own data root, no update checks); test node on its own port and volumes; the user's nodes 8001/8003 and container `autobyteus-server-1` are not contacted

## Live Environment And Fixture Plan

- Startup order: node container → proxy → isolated instance → add node in UI → stop → seed → restart → journey
- Environment choices: desktop version `1.5.12-beta.7` (worktree `autobyteus-web/package.json`); node built-in `1.5.12-beta.3`; the proxy URL is the node entry's `baseUrl` and the card's address (both the same, so the address-vs-`baseUrl` residual risk is not exercised)
- Health / readiness: node `/rest/health`; `isolated-app start` result
- Seed data: the record file only (RUN-01 shape), written while the instance is stopped
- Identities: none (no sign-ins; node CLIs signed out)
- Evidence: DOM text of the card (`node-server-*` test IDs), screenshots, record file before/after, proxy log excerpts, node `GET` answers
- Cleanup: instance stop, data root, clone, proxy, container and its five volumes

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-005 on GitHub (asset `createdAt` order on a real tag), RSK-002 | Needs a real tag push and the runner; releasing is the user's decision | Medium (step tests cover the logic) | No (delivery on the next release) | Delivery checks per RELEASE.md |
| Signing, notarization, Linux/Windows builds of the fresh-start build | Runner secrets / other OS | Low (not touched) | No | — |
| `autobyteus-docker update` and new-image routes of SCN-001 | Same card answer and recheck as API-07/08; the route only changes how the node reached V | Low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: journeys are temporary probes; their harness (`proxy.mjs`) is copied into `evidence/` for reproducibility.
