# API/E2E Coverage Investigation — node-vocabulary (autobyteus-290)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary`

## Investigation Meta

- Requirements: `…/requirements-doc.md` (Approved, SR-006; REQ-901 … REQ-913, AC-901 … AC-905)
- Investigation notes: `…/investigation-notes.md`; solution revision record: `…/solution-revision-record.md` (SR-008)
- Design: `…/design-spec.md` (SR-008, `8e3512429b`); design review: `…/design-review-report.md` (ARCH-REV-006 Pass, N-912), `…/architecture-review-revision-record.md`
- Supplemental: `…/follow-ups.md` (FU-001 pulled in; FU-002, FU-003 open)
- Implementation: `…/implementation-handoff.md` (IR-002, code `127fc4806e`, handoff `260df99337`), `…/implementation-revision-record.md`
- Code review: `…/code-review-report.md` (CRR-002 Pass), `…/code-review-revision-record.md`
- Classification: `Large / High`, reviewed route; a pass goes to the code reviewer for test-code review
- API/E2E revision record: `…/api-e2e-revision-record.md` (after the first result); current round 1
- Testing guideline: the worktree's `TESTING.md` (layers, clean env, one heavy run at a time, migrations on small synthesized data, Rule 9); `docs/isolated-app-instances.md`; `autobyteus-ios/README.md`; `docs/android_mobile_access.md`

## What Must Be Proven

| Criterion | What | Where |
| --- | --- | --- |
| AC-901 | No old name outside the migration folders, frozen shapes, their tests and fixtures | the word list, rerun independently |
| AC-902 | Suites green; the two-server E2E and the Nodes-tab browser checks pass unchanged except the tool name | reused IMP suites; two-server E2E; the changed E2E files and probes |
| AC-903 | An existing desktop node list and `peers.json` load and work | the upgrade E2E (peers); a desktop start (node list) |
| AC-905 | Released-shape data converts with the same values; a re-run changes nothing; a failure keeps the original and its backup, logs a warning naming the file, and holds back; after the migrations the node keeps its ID, peers recognize it, Memory Sync continues with the same source, the desktop list and mobile pairing work | the upgrade E2E (server, SM-1 … SM-5), a real upgrade from the released build, the browser (SM-7, SM-8), the desktop (SM-6), the phones (SM-9, SM-10) |
| REQ-913 | Hold-backs: no new node ID; 503 `NODE_IDENTITY_NOT_MIGRATED`; peers refuse with that reason; "waiting for its data migration" in the Nodes tab; Memory Sync 503 `MEMORY_SYNC_NOT_MIGRATED`, the card shows it, the Memory page lists only local memory; the rest works | the upgrade E2E (failure cases); the browser |
| REQ-903 / REQ-906 | `list_peer_nodes` lists peers; an agent selecting only `list_available_nodes` gets no discovery tool | two-server E2E RC-26/RC-27 (+ the old-name case) |
| REQ-910 | The card's "Memory Sync source ID" label, en and zh-CN | the browser |
| AC-904 | the user's check | — |

## Supported Scenarios And Real Usage

- RU-1: a user upgrades a node that is paired with another node and syncs memory to a hub: the node starts on its old data (real trigger: a server start on a released data root).
- RU-2: one file can't be read at upgrade (a damaged file): the node starts, holds the feature back, and says so; after the file is fixed, the next start migrates.
- RU-3: a desktop user upgrades with a saved node list; a browser-mode user with the list in local storage; a phone user paired through the phone web shell.
- RU-4: iOS and Android users upgrade over saved entries.
- RU-5: an agent whose definition still selects the old tool name.

## Changed Surface And Boundary Classification

| Surface | Boundary | Repository evidence | Material risk not exercised there | Mode |
| --- | --- | --- | --- | --- |
| Server stored data (SM-1 … SM-5), hold-backs | startup migration, capability readiness | unit tests per migration and hold-back (IMP-02, IMP-15) | a real start on old data; peers and Memory Sync across two real processes; a failure and recovery across starts | Server E2E with built servers (new); a real released-build upgrade (temporary) |
| Identity wire, peer refusals, tool rename | inter-node contract, agent tools | unit; two-server E2E (not run by implementation) | real processes | two-server E2E |
| Desktop node list (SM-6) | Electron main at start | Electron unit tests (IMP-06) | the real app start | isolated desktop instance |
| Browser storage (SM-7, SM-8), Nodes tab, Memory Sync card and page | renderer plugins, stores | web unit tests (IMP-05, IMP-16) | real load order of plugins; rendered reasons and labels | browser probe |
| iOS / Android keys (SM-9, SM-10) | app start | unit tests (IMP-10, IMP-11) | the app's real start over saved defaults | simulator / emulator |

## Existing Durable Coverage Inventory

| Path | Validity | Action |
| --- | --- | --- |
| IMP-01 … IMP-19 (server, web, Electron, iOS, Android suites; word list) | Still Valid (ran on `cb37d82fab` / `127fc4806e`; IR-002 touched only Memory Sync names, rerun in IMP-15 … IMP-19) | Reused |
| `remote-delegation-two-server.e2e.test.ts` (RC-01 … RC-37) | Still Valid (renamed by implementation; not yet run) | run |
| `memory-sync-api`, `memory-sync-multiprocess`, the three memory GraphQL e2e files, `phone-access-running-routes` | Still Valid (renamed) | run |
| probes `remote-nodes-page` (seeds the released list: SM-7), `electron-launch-profile`, `task-agent-sibling-sidebar`, `nodes-docker-address`, `remote-run-title`, `remote-runs-in-tree`, `agent-runtimes-settings` | Still Valid (renamed) | run |
| `application-framework-boundaries.test.ts` SR-011 | fails at base and head; cause: `3e3a7b08cc` (DEC-018) added `AgentDefinitionService.getInstance(` to `agent-memory-explorer-service.ts` without updating the allowlist; this ticket doesn't touch that file | Out Of Scope: follow-up FU-004 |

## Planned Cases

| Case | Criteria | Kind |
| --- | --- | --- |
| API-00 | builds (server dist, integration prepare) | Existing |
| API-R1 | IMP-01 … IMP-19 | Reused |
| API-01 | AC-902, REQ-903/906: two-server E2E, whole file; RC-26 gains "an agent selecting only `list_available_nodes` gets no discovery tool" | Durable, run + small update |
| API-02 | AC-902: the changed server E2E files (Memory Sync API and multiprocess, memory GraphQL, phone access) | Durable, run |
| API-03 | AC-903, AC-905, REQ-913: **new** `tests/e2e/app-data-migrations/node-vocabulary-stored-names-startup.e2e.test.ts`. Two built servers paired and syncing memory, data turned back to the released names (records of the two migrations removed), then started: same node IDs, peers recognize each other, Memory Sync continues into the same import, backups, a third start changes nothing; damaged identity file → 503 and peer refusals, no new ID, the rest works, then fixed → migrated; damaged hub credentials → 503 `MEMORY_SYNC_NOT_MIGRATED`, reads refuse, only local memory | Durable, new |
| API-04 | AC-905 fidelity: the **released build** (`c78ffb15a2`) writes real data (pairing, Memory Sync), then this build starts on it; the released files' keys match API-03's released shapes | Temporary probe (needs a base build) |
| API-05 | REQ-913 UI, REQ-910 label, SM-7, SM-8: a browser probe (new, durable): the Nodes tab shows a held-back peer's reason; the card's label en/zh-CN; the card's reason and the Memory page's sources while Memory Sync is held back; the released local-storage list and mobile session converted on load, the phone stays paired | Durable, new |
| API-06 | AC-902: the changed probes | Durable, run |
| API-07 | SM-6, AC-903: isolated desktop instance started over a released `node-registry.v1.json` (several entries, with and without `serverInstanceId` / `isSystem`; and an empty list), the Nodes tab, a second start | Temporary journey (the desktop app) |
| API-08 | SM-9, SM-10: the iOS app on a simulator and the Android app on an emulator, started over saved entries under the old keys | Temporary journey |
| API-09 | AC-901: the word list | Independent rerun |

## Not Tested / Deferred

| Behavior | Reason | User only? |
| --- | --- | --- |
| AC-904 | the user's check | Yes |

## Investigation Decision

- Proceed: `Yes`; durable coverage changes: `Yes`; reroute: `No`

## Discrepancies And Updates During Execution

- TESTING.md's `pnpm -C autobyteus-web test:e2e:electron:isolation` builds for Linux and stops on macOS; the working path is `isolated-app start --build`, then the probe with `--skip-build` (FU-006).
- `identity_pending` reaches the UI through the window's own identity probe of a node on the Nodes tab (no GraphQL field serves the node ID, SR-008), so NVP-02 checks it there.
- The phone web shell needs a session from a real pairing, which needs a non-local address: API-05 serves the window on the LAN address for its duration.
- Existing probes found failing for causes outside this ticket: FU-005 (runtimes probe after autobyteus-210); small test-side causes fixed as baseline fixes (sibling fixture, remote-run-title `nodeId`, cold `nuxt dev` in my two remote probes).
- RC-12 (idle shutdown) timed out once in run 1 and passed in run 2 and the diagnostic; its cause is searched with repeat attempts (see the report).

