# API/E2E Execution Coverage Report — one-nodes-tab

## Round

- Coverage investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 1; code review CRR-002 Pass (Large / High)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-07 needed four runs. Run 1 and run 2 failed on the probe's own text handling and request scoping. Run 3 stopped on an OS-level `ENFILE` (the system file table was full). Run 4 is the result. Every run's evidence is kept (`API-07-remote-nodes-page-run1…run4`); details are in Cases.
  - API-08/API-09 mount this worktree's `dist` into the image `autobyteus/autobyteus-server:beta`. That image's own `dist` differs in 4 files outside this change: `agent-run-service.js`, `team-run-service.js`, `remote-collaboration-composition.js` and `remote-message-receiver.js`. These come from autobyteus-269 (run titles), which is in the image but not on this branch. TESTING.md asks for no difference outside the changed files. The mount replaces the whole `dist`, the image's `prisma/` matches the worktree's, and run titles are not part of what is checked here, so the run went ahead. The deviation is recorded in `API-08…/nodes-docker-address-probe.json` `imageDistDiff`.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/evidence/api-e2e/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (on a Pass; this round is a Fail, so failure-origin review is requested first)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `23f3feb193` source (HEAD `0a1e02ba09` + this round's probe files) | macOS 26.5.2 arm64 | Node v22.23.1; server `dist` built in this worktree (API-00, rebuilt by `test:integration:prepare`) | server suites' own environment isolation |
| ENV-2 | same | macOS | ENV-1 servers, each with its own temp data root and HOME, env `PATH/HOME/TMPDIR` only, `127.0.0.1` free ports; `nuxt dev` (browser mode) with `BACKEND_NODE_BASE_URL` = the window's node; headless Chrome via playwright-core; 1440×1000; `en` | browser `localStorage` desktop list seeded in the current release's shape |
| ENV-3 | same | macOS, Docker Desktop (server 29.x) | ENV-2 + a test-owned container from `autobyteus/autobyteus-server:beta` with this worktree's `dist` mounted read-only. It publishes only `127.0.0.1:<free port>`, has no volumes, and runs with `AUTOBYTEUS_SERVER_HOST=http://localhost:<port>` | user containers `autobyteus-server-0/1/2` untouched |
| ENV-4 | same | macOS | Isolated desktop instance of this worktree's packaged build (`build:electron:mac`, `isolated-app start --from-worktree --data-root <own temp dir>`), driven over its CDP control port; ENV-3 container; two ENV-2 host servers | `node-registry.v1.json` synthesized in the current release's shape before start |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | setup | server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `exit=0` | setup for API-05…API-09 |
| API-01 | all server | server typecheck | Reused IMP-02 | — | Pass (reused) | — | — | `git diff --name-only e16d848e0f HEAD -- autobyteus-server-ts` is empty |
| API-02 | REQ-707/708, DS-005, AC-713 | server unit | Reused IMP-03 | — | Pass (reused) | — | — | same diff empty |
| API-03 | BEH-701…707 | web unit/component | Reused IMP-09 | — | Pass (reused) | — | — | ran on `23f3feb193`; nothing outside `tickets/` changed after it before this round |
| API-04 | REQ-711 | Electron main-process specs | Reused IMP-06 | — | Pass (reused) | — | — | `git diff --name-only e16d848e0f HEAD -- autobyteus-web/electron autobyteus-web/types` empty |
| API-04b | REQ-713 | web guards | Reused IMP-10 | — | Pass (reused) | — | — | also run by `build:electron:mac` in API-09 (guards passed before packaging) |
| API-05 | regression | server integration | `pnpm -C autobyteus-server-ts test:integration:prepare`; `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-05-server-integration.log` (excerpt), `API-05-server-integration.full.log` | `Test Files  78 passed \| 20 skipped (98)`, `Tests  421 passed \| 69 skipped (490)`, `exit=0` | skips are the suites' own gates |
| API-06 | AC-713; `addPeerNode {nodeId, name, baseUrl}` contract | server E2E, two real server processes + 3 more nodes | `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<repo>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs REMOTE_E2E_EVIDENCE_DIR=<evidence>/API-06-e2e-receipt pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-06-server-e2e-two-server.log` (excerpt), `.full.log`, `API-06-e2e-receipt/remote-two-server-receipt.json` | `Tests  29 passed (29)`, `exit=0`; RC-16 identity mismatch, RC-27 `peerNodeOffer` refusal codes, RC-20 request audit | ~307 s |
| API-07 | AC-701…AC-710, AC-713, REQ-711 (browser), SCN-A01/A02 | Browser + 11 real host servers | `pnpm -C autobyteus-web exec node tests/e2e/remote-nodes-page-probe.mjs --output-dir=<evidence>/API-07-remote-nodes-page-run4` (script `test:e2e:remote-nodes-page`) | ENV-2 | **Fail** (NP-07); NP-01…06, NP-08…12 Pass | `API-07-remote-nodes-page-run4/remote-nodes-page-probe.json`, `NP-*.png`, `server-*.log`, `frontend.log` | per sub-case below | runs 1–3 kept as `-run1…-run3` (see Notes column of the sub-cases) |
| API-08 | AC-704 (Docker address), AC-707, REQ-708, REQ-713 | Browser + host servers + test-owned Docker node | `pnpm -C autobyteus-web test:e2e:nodes-docker-address --output-dir=<evidence>/API-08-nodes-docker-address-run1` | ENV-3 | Pass | `API-08-nodes-docker-address-run1/nodes-docker-address-probe.json`, `ND-*.png`, `docker-node.log`, `server-*.log` | per sub-case below | `cleanup.containerLeft: null` |
| API-09 | REQ-711, AC-702, AC-703, DEC-706, AC-704, REQ-713, AC-707 | Isolated desktop instance of the worktree build + Docker node | `pnpm -C autobyteus-web build:electron:mac`; then `node <evidence>/API-09-electron-journey.mjs --repo=<worktree> --out=<evidence>/API-09-electron-journey-run3` (it runs `pnpm --silent isolated-app start --from-worktree --data-root <own temp dir>`, drives the CDP control port, `isolated-app restart` ×2, `stop`) | ENV-4 | Pass | `API-09-electron-build.log`; `API-09-electron-journey-run3/API-09-electron-journey.json`, `EL-*.png`, `EL-07-registry-*.json`, `instance.log`, `docker-node.log`; the script `API-09-electron-journey.mjs` | per sub-case below | runs 1–2 kept (`-run1`, `-run2`); see the sub-case notes |

### API-07 sub-cases (run 4)

| Sub-case | Criteria | Result | Look For (in `remote-nodes-page-probe.json` `cases.<id>` unless named) |
| --- | --- | --- | --- |
| NP-01 | AC-701 | Pass | `url` ends `nodeTab=remoteCollaboration` yet `tabs: ["manage","memorySync","phoneSetup","dockerGuide","nfsGuide"]`; `fresh.alphaSwitch: false`, `before.status: "Off"`, off note; `after.alphaSwitch: true` (turned on from the page); `NP-01-fresh-this-node-off.png` |
| NP-02 | AC-702, REQ-711 | Pass | `keys` has beta's `srv_…` once and no `d:remote-beta-entry`; `betaRow.name: "beta"` (peer name, DEC-705) with url `localhost:<port>`; `betaEntry.serverInstanceId` = beta's ID and its name unchanged `http://localhost:<port>`; `d:remote-gamma-entry` is its own row next to gamma's peer row |
| NP-03 | AC-706, AC-710 | Pass | `settledAt`: fast rows 106–199 ms, `theta: 20102` ms; `thetaWhileOthersSettled.line: "Checking theta… up to 20 seconds."`; beta's offer opened meanwhile (`betaSummary` starts `3 Agents`); `lines`: gamma/gammaEntry `ⓘ Not reachable. Nothing answers at that address and port.` [Check again], delta `⚠ Remote collaboration is off on delta.` [Turn on there], epsilon `⚠ epsilon doesn't know this node yet.` [Register this node there], zeta `✗ A different node answers at this address.` [Change address], theta `ⓘ Not reachable. No answer within 20 seconds.`; `openAsks` 1 each; `NP-03-*.png` |
| NP-11 | REQ-712, AC-713 (267 timing) | Pass | `refreshAsks` one ID; `offRequests: 0` with this node's switch off, `offLines` all null, `offDirections` "Off on this node"; `onAsks` 1 each; `quietRequests: 0` over 30 s (`appRequestsDuringQuiet: 18` are the app's own `/rest/health` and run-history checks to alpha, not node asks) |
| NP-04 | AC-703 | Pass | iota added with the switch off: `dialog: 0`, line `ⓘ Agents here can't work with iota yet.` [Turn on]; kappa with it on: steps `Register kappa as “kappa”`, `Turn on remote collaboration (it is off)`, `Register this node as “Embedded Node” kappa finds this node's address once it is on.`; after Cancel `afterCancel` peers.json alpha unchanged, iota and kappa `null`, `kappaSwitch: false`; `byNodeId: "ⓘ This is beta, already in your list."`; `byAddress: "ⓘ This is gamma box, already in your list."` (gamma down); ghost `ⓘ Not reachable. Nothing answers at that address and port.`, `dialog: 0`, switch disabled |
| NP-05 | AC-704 | Pass | `onAlpha` `kappa @ http://127.0.0.1:<kappa>`; `onKappa` `[{nodeId: alpha, name: "Embedded Node", baseUrl: alpha}]`; kappa's switch turned on; `kappaDirections` both `✓ Working`; `offers.alphaAsksKappa.entries` has `Kappa Helper`, `offers.kappaAsksAlpha.entries` has `Alpha Helper` (each side's agents can list the other's) |
| NP-06 | SCN-A01 (naming rule) | Pass | step `Register this node as “Embedded Node 2”` + `“Embedded Node” is already used there, so it gets a number.` + `lambda reaches this node at http://127.0.0.1:<alpha>.`; `onLambda.name: "Embedded Node 2"` |
| NP-07 | SCN-A02 (naming race), REQ-706, design § Naming Rule 4 | **Fail** | Dialog correct: `failed.error: "mu already has a node named Embedded Node."`; the row's "What happened" detail correct. **Row line wrong**: `rowLine.line: "⚠ Turned on here, but not finished on mu. mu already has a node named ."` (the name is missing). Try again re-planned `Embedded Node 2` and finished (`onMu.name: "Embedded Node 2"`). Screenshot `NP-07-mu-row-try-again.png` |
| NP-08 | AC-708 | Pass | `invalid` rule message; `taken: "Another node is already named Beta."`; `onAlpha.name` and `entry.name` both `kappa lab`; kappa's own registration of alpha untouched (`kappaKnowsAlphaAs: "Embedded Node"`) |
| NP-09 | AC-705 | Pass | kappa: steps `Remove kappa lab from this node`, `Remove this node from kappa lab`; after: `alphaHasKappa: false`, `kappaPeers: []`, `kappaSwitch: true`, `listed: 1`. lambda stopped: `✓ Remove lambda from this node`, `✗ Remove this node from lambda` with `Nothing answers at that address and port.`, `Not everything could be done. What was done stays done.`; lambda's own peers.json still has alpha (`lambdaAfter.lambdaFile`) |
| NP-10 | AC-709 | Pass | mu: the three lines, then gone on alpha, on mu and from the list; beta stopped: marks `✓✗✓`, `Removed here. beta could not be reached, so this node is still registered there.`, no Try again; beta's peers.json still has alpha; `NP-10-beta-stopped-removed.png` |
| NP-12 | 267 REQ-503, design § Dependency Rules | Pass | `offerHosts: ["alpha"]`; `opsToOthers` only `/rest/remote-access/status` and the settings operations (`AddPeerNode`, `GetPeerAddressCandidates`, `GetPeerNodeAvailability`, `GetRemoteCollaborationCapability`, `GetRemoteCollaborationSettings`, `RemovePeerNode`, `ResolvePeerAddress`, `SetRemoteCollaborationEnabled`) |

Earlier API-07 runs (kept):

- Run 1 (`-run1`): NP-03 stopped on the probe's exact-text checks. The line's mark (ⓘ) is spaced by CSS, not by text. The probe now normalizes it.
- Run 2 (`-run2`): NP-07 showed the same product failure as run 4. NP-11's quiet period counted the app's own `/rest/health` and run-history polling. NP-12 counted Iconify CDN requests. The probe now counts only requests that ask about nodes.
- Run 3 (`-run3`): stopped in NP-06 on `ENFILE: file table overflow` from alpha's `peers.json` read. That is the OS-wide file table (`kern.maxfiles` 491,520) being full at that moment. About 218,000 entries were held by the Docker Desktop VM's file sharing for the user's own node containers. The spike's source was not captured. A sampler (`kern.num_files` every 2 s) ran during run 4 and peaked at 231,106. Not a product failure; no fix possible in scope.

### API-08 sub-cases (run 1)

| Sub-case | Criteria | Result | Look For (in `nodes-docker-address-probe.json` `cases.<id>`) |
| --- | --- | --- | --- |
| ND-01 | AC-704 | Pass | `servers.docker.dockerenv: true`; confirmation steps incl. `docker finds this node's address once it is on.`; `onDesk.baseUrl` = `http://127.0.0.1:<published>`; **`onDocker[0].baseUrl: "http://host.docker.internal:<desk port>"`** with desk's node ID; `directions.in: "docker → this node ✓ Working via http://host.docker.internal:<port>"`; both `offers` lists non-empty (`Docker Helper`, `Desk Helper`); `ND-01-*.png` |
| ND-04 | design § Loopback Hint Surface | Pass | `state.hints: 0`, `addPanelText: "Add node"`, ghost line `ⓘ Not reachable. Nothing answers at that address and port.` |
| ND-05 | REQ-713 | Pass | `thisNode.url` = the Docker node, `switch: "On"`; desk's row `Embedded Node` at `host.docker.internal:<port>`, `Reachable now` (from the Docker node's server, design DS-004) |
| ND-02 | AC-707, REQ-708 | Pass | `hintText: "✗ Embedded Node can't reach http://127.0.0.1:<port>. Embedded Node runs in Docker, where 127.0.0.1 is the container itself. Try http://host.docker.internal:<port> Use this Docker Guide"`; the loopback address was not saved; `saves: [{baseUrl: "http://host.docker.internal:<port>"}]` (one `ChangePeerAddress` from Use this, answered OK); `ND-02-*.png` |
| ND-03 | AC-707 | Pass | `dns.text: "no-such-node.invalid can't be found from here."`; `blackHole.text: "No answer within 20 seconds."`; `different.text: "A different node answers there than the one registered."`; `resolveExtensions`: `PEER_UNREACHABLE`, `loopbackInContainer: true`, attempts `refused`, `not_found`, `timeout`, `different_node` |

Notes:
- `gatewayChange`: the setup tried to move desk's address to `gateway.docker.internal`, so that Use this would visibly change it back. Docker Desktop timed out on that name, so the address was already `host.docker.internal` before Use this. Use this is still proven by its one save request with the suggested address, answered successfully, after the loopback address was refused.
- The black-holed `10.255.255.1` answered "No answer within 20 seconds." after 10.4 s. The connection attempt timed out first (Node's `fetch` connect timeout), and the cause is right. The copy's "20 seconds" is the bound, not the measured time. This is an observation, not a failure.

### API-09 sub-cases (run 3)

| Sub-case | Criteria | Result | Look For (in `API-09-electron-journey.json` `cases.<id>` unless named) |
| --- | --- | --- | --- |
| EL-01 | REQ-711, AC-702 | Pass | `registry.seeded` holds 3 release-shaped entries with `capabilities`/`capabilityProbeState`. `afterStartKeys`: the startup save already wrote them without the dropped fields (the embedded node's port changed). `rows`: the Docker node once (its `srv_…`), `d:remote-oldbox-entry`, the peer-only row. `dockerRow`: `name: "docker"` (the peer name), `url: "localhost:<port>"`, switch on, Open present, `⚠ docker doesn't know this node yet.` [Register this node there]. `registry.final`: the Docker entry and the embedded entry carry `serverInstanceId` (`identify` over IPC); old box has none; names unchanged. `EL-01-main-window-manage-nodes.png` |
| EL-04 | AC-704 (desktop + Docker) | Pass | `confirmText`: `Finish connecting docker? … On docker • Register this node as “Embedded Node” docker reaches this node at http://host.docker.internal:<embedded port>.` `onDocker[0].baseUrl: "http://host.docker.internal:<embedded port>"`, pinned to the embedded node's ID. `directions.in: "docker → this node ✓ Working via http://host.docker.internal:<port>"`. `EL-04-*.png` |
| EL-02 | AC-703 (Electron) | Pass | `before: 1`, `afterAdd.windows: 1`, `dialog: 0`: adding with the switch off opened no window. The entry has labbox's `serverInstanceId`. `afterOpen: 2`: Open opened it |
| EL-03 | DEC-706, TR-714 | Pass | `entry`: `peeronly` at its address with its `serverInstanceId`, added by the first Open; `windows: 3` |
| EL-05 | REQ-713 | Pass | `thisNode.url: "http://localhost:<docker port>"`, `switch: "On"`. `embeddedRow`: `Embedded Node`, `open: 1`, `remove: 0`, name not a rename button. The Docker node is not a row in its own window. `EL-05-docker-window-manage-nodes.png` |
| EL-06 | AC-707 (Docker window in the desktop app) | Pass | `hintText: "✗ http://localhost:<port> can't reach http://127.0.0.1:<embedded port>. http://localhost:<port> runs in Docker, where 127.0.0.1 is the container itself. Try http://host.docker.internal:<embedded port> Use this Docker Guide"`; after Use this, `onDocker.baseUrl` is `host.docker.internal:<embedded port>`. `EL-06-*.png` |
| EL-07 | REQ-711 (a second start changes nothing) | Pass | `sameContentAfterRestart1: true`, `sameContentAfterOpen1: true`, `byteIdenticalRestart1ToRestart2: true`, `byteIdenticalAfterOpen2: true`; `textChangedByRestart1: true` is key order only (see note). Files `EL-07-registry-before-restart.json`, `-after-restart-1.json`, `-after-restart-2-and-open.json` |

Notes:
- Run 1 (`-run1`): EL-05 timed out because the journey set the Docker window's route once, while that window was still starting its app. The journey now retries. Not a product failure: in run 3 the same window shows the page.
- Run 2 (`-run2`): EL-07 compared file text. On every start the main process re-saves the registry through `normalizeLoadedNode`, which writes keys in one order, while `identify` appends `serverInstanceId` at the end of an entry. So the first restart rewrites the same content in another key order. Run 3 shows the content is unchanged and that a second restart, and opening the tab again, leave the file byte-identical.
- In the Docker window, "this node" is named by its desktop label (`http://localhost:<port>`), so the hint reads "http://localhost:<port> runs in Docker". That is the user's own label, as DEC-705 decides. Observation only.
- `instance.log` has "Network service crashed or was terminated" at each restart or stop and the existing `search_web` tool-definition warning; neither is from this change.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-701 | Yes | NP-01; API-03 (component tests) | Proven | — |
| AC-702 | Yes | NP-02 (browser), EL-01 (desktop registry, IPC `identify`), EL-07 | Proven | — |
| AC-703 | Yes | NP-04 (both peers.json unchanged, duplicates, unreachable), EL-02 (no window on add; Open opens), EL-03 | Proven | — |
| AC-704 | Yes | NP-05 (both sides, pinned IDs, other switch turned on, both lists), ND-01 and EL-04 (`host.docker.internal:<port>` found by the Docker node) | Proven | Agents' own `list_available_agents` calls were not made; each server's `peerNodeOffer` was, which API-06 RC-26 shows equals the tool's list |
| AC-705 | Yes | NP-09 | Proven | — |
| AC-706 | Yes | NP-03; API-03 | Proven | — |
| AC-707 | Yes | ND-02, ND-03, EL-06; API-02 | Proven | — |
| AC-708 | Yes | NP-08 | Proven | — |
| AC-709 | Yes | NP-10 | Proven | — |
| AC-710 | Yes | NP-03 | Proven | — |
| AC-711 | No (user check) | — | Only The User Can Check | Everything that can be proven without the user's own nodes was proven: Docker node (ND-*), desktop (EL-*), both languages (IMP-08 step 16, API-03). AC-711 asks about the user's own desktop and Docker nodes, which TESTING.md rule 2 forbids testing against |
| AC-712 | No | review (docs) | Not in this stage | Docs are reviewed at delivery |
| AC-713 | Yes | API-02, API-06, NP-11, NP-12 | Proven | — |
| SCN-A02 / design § Naming Rule 4 (REQ-706 line text) | Yes (in REQ-706) | NP-07 | **Not Proven (Fail)** | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 85% | Every critical AC proven: NP-*, ND-*, EL-*, API-06 | NP-07: the row line after a name race reads "mu already has a node named ." (REQ-706 line text, design § Naming Rule 4). A known failure, not an uncertainty | The fix, plus NP-07 rerun |
| Changed-boundary execution directness | 80% | 95% | Real servers' GraphQL, the real page, a real container (`/.dockerenv`, `host.docker.internal`), the real desktop's IPC registry and windows | The Docker window in the desktop and in the browser both bind the renderer to the Docker node; the same code path | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Two-node plans run from the window against live nodes (NP-05…10, ND-01, EL-04); partial failures from really stopped nodes; a real name race made through the other node's own API | Agents' tool calls after connect not driven (API-06 covers the tool ↔ `peerNodeOffer` equivalence) | A scripted-runtime delegation after connect |
| Environment, configuration, identity, and fixture fidelity | 80% | 90% | Clean env per server; release-shaped registry and `localStorage` from a real file's keys; test-owned container from the user's image | The image `dist` differs in 4 autobyteus-269 files outside this change (recorded); the user's own nodes are never used (AC-711) | An image built from this branch |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | Stopped, switched off, unregistered, different node and black-holed peers (NP-03); unreachable add; disconnect/remove with the other node stopped; refused / not_found / timeout / different_node in a container; restart ×2 | NP-07's row text | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | Browser (NP-*, ND-*), desktop (EL-*), screenshots for each state; en (zh-CN from IMP-08 and API-03) | zh-CN not rerun in this round's probes | — |
| Durable regression coverage quality and relevance | 80% | 90% | Stale 267 probe replaced by `remote-nodes-page-probe.mjs` (NP-01…12); new `nodes-docker-address-probe.mjs` (ND-01…05) | No unit test covers the partial line with `PEER_NAME_TAKEN` (`NodeRow.spec.ts` checks only `PEER_UNREACHABLE`); the desktop journey is ticket-owned, not a repository probe | A `NodeRow`/`nodeRowStatus` unit case with the fix |

- Overall post-repository confidence: 76% (repository suites only: API-01…API-06)
- Overall final confidence: 92% (simple average of the seven final scores)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`. REQ-706's line text fails in NP-07.
- Any final applicable category below `90%`: `Yes`. Requirement and acceptance-criteria proof is at 85% (NP-07).
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: NP-07 (product defect); the image `dist` deviation (bounded, recorded).

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed.
- Execution mode: `Browser`, `Live API`, `Project Desktop Validation`, `Worker or Distributed` (Docker node).
- Confidence gap it addresses: the repository suites mock the other node and never run in a container or in the desktop shell. These runs closed that gap for every AC except the NP-07 defect they found.
- Browser validation needed: yes. The change is the page's two-node journeys and their states.
- If `Blocked`: —

## Desktop Application Validation

- Approach: an isolated instance of this worktree's packaged build (`--from-worktree`, own data root, ports and process group), driven over CDP with playwright-core `connectOverCDP`.
- Web-equivalent behavior: API-07, API-08. Shell-specific: EL-01 (`identify` over IPC, the registry file), EL-02/EL-03 (`openNodeWindow`), EL-05/EL-06 (a window bound to the Docker node), EL-07 (restart).
- Effect on any already-running desktop application: `None`. Another worktree's instance (`iso-56211-d507`) and the user's app were left alone; `isolated-app list` shows no instance of mine.
- Behavior not directly proven: none in scope.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration` (desktop registry); `peers.json` not affected.
- Representative existing data used: a synthesized `node-registry.v1.json` and a browser `localStorage` list in the current release's shape. Keys were learned read-only from a real registry; no values were copied.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: EL-01 (the real app loads it, rows join, `identify` writes `serverInstanceId`, the saved file has no `capabilities`/`capabilityProbeState`, nothing added, removed or renamed), EL-07 (a second start and a reopen change nothing), NP-02 (browser).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: in the browser, `localStorage` entries keep the old fields after `identify` (NP-02 `betaEntry`). The design accepts this ("read as is… not written by new code"); nothing reads them.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. `?nodeTab=remoteCollaboration` falls to Manage Nodes through the valid-tab check (NP-01); there is no alias.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` | Updated (replaced) | API-07 (NP-01…NP-12) | Removed RNP-01…RNP-09. They drove the removed Remote Collaboration tab, its testids and the old `addPeerNode {baseUrl, name}` input (REQ-701, REQ-704, design § Removal Plan). RNP-09's "the window never contacts a peer" contradicts DS-001/DS-004 and DEC-702. Replacement: NP-01…NP-11 carry 267's timing over to the one list; NP-12 keeps 267 REQ-503 (offers only from this node's server) |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` | Added | API-08 (ND-01…ND-05) | — |
| `autobyteus-web/package.json` script `test:e2e:nodes-docker-address` | Added | API-08 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (for the review after the fix; this round is a Fail)
- Diff or repository evidence supplied for removed paths: the replaced file's diff, `git diff 0a1e02ba09 -- autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The user's desktop and Docker nodes | Test-owned host servers, container and isolated instance | TESTING.md rule 2 | AC-711 stays a user check |
| A black-holed node | A TCP listener that never answers (NP-03); `10.255.255.1` from the container (ND-03) | Deterministic | — |
| Agent runtimes | Not used; `peerNodeOffer` stands for the agents' list (equal per API-06 RC-26) | No paid inference needed | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Host servers, Nuxt dev servers, headless Chrome (API-07, API-08) | Yes | Each probe's `finally` | `cleanup` in each receipt: `frontendExited: true`, `serversLeft: 0`, `rootRemoved: true` |
| Test containers `one-nodes-api-docker-*`, `one-nodes-api-el-*` | Yes | `docker rm -f -v` | `containerLeft: null`; `docker ps -a --filter name=one-nodes-api` empty |
| Image inspection containers `one-nodes-api-imgdist`, `one-nodes-api-imgprisma` (created, never started) | Yes | `docker rm -f -v` | removed |
| Isolated instances `iso-51773-5ee3`, `iso-52091-8555`, `iso-52393-939e` | Yes | `isolated-app stop`, then the own data root removed | `stop.ok: true`, ports released, `mineStillListed: []`, `rootRemoved: true` |
| `kern.num_files` sampler `/tmp/one-nodes-api-fdmon` and `/tmp/one-nodes-api-imgdist.*` | Yes | Stopped and deleted; its log kept as `API-07-run3-enfile-sampler.log` | done |
| `autobyteus-web/electron-dist/` (packaged build) | Yes | Left as an untracked build output (TESTING.md: never staged) | — |
| The user's containers `autobyteus-server-0/1/2`, the user's app and data | No | Not touched (the registry file was read once for key names) | — |

## Preliminary Classification (On `Fail`)

- `Local Fix`, owned by the implementation engineer.
- What fails: after a connect or finish run stops on `PEER_NAME_TAKEN`, the row's warning line drops the name. It reads "Turned on here, but not finished on mu. mu already has a node named ." The dialog ("mu already has a node named Embedded Node.") and the connection details' "What happened" list show the name correctly.
- Where: `autobyteus-web/components/settings/nodes/NodeRow.vue:172` calls `failureText(t, line.error, { node: name })` without `name`. `failureText` words `PEER_NAME_TAKEN` with `context.name ?? ''` (`utils/nodeConnectionErrorText.ts`). The row line comes from `stores/nodeRowStatus.ts:144` (`{ kind: 'partial', …, error: unfinished.error }`), which does not carry the failed step's `name`. `NodeConnectionDetails.vue:62` passes `name: step.name` and is correct.
- Expected (design § Naming Rule 4, UI/UX spec VIS-015): "Turned on here, but not finished on mu. mu already has a node named Embedded Node." with Try again. Try again itself works: it re-plans "Embedded Node 2" and finishes (NP-07 `replanned`, `onMu`).
- Coverage gap: `NodeRow.spec.ts` "VIS-015" checks the partial line only with `PEER_UNREACHABLE`.
- After the fix, rerun: API-07 (whole probe; NP-07 asserts the full text) and the web unit suite.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: REQ-706 row line text for a name race (NP-07): `Not Proven (Fail)`. AC-711: `Only The User Can Check`.
- Preliminary classification and recommended owner: `Local Fix`, implementation engineer (failure-origin review requested from the code reviewer).
- Next recipient from `get_handoff_rules`: see the handoff message.
- Notes: every other case passed: API-05, API-06, API-07 NP-01…06/08…12, API-08 ND-01…05, API-09 EL-01…07. Final confidence is 92%, limited by NP-07.
