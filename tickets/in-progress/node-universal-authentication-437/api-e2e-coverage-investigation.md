# API/E2E Coverage Investigation — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence
scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/node-universal-authentication-437/requirements-doc.md` (SR-002 baseline; REQ-001…011, AC-001…009, DEC-001…015)
- Investigation Notes: `tickets/in-progress/node-universal-authentication-437/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/node-universal-authentication-437/solution-revision-record.md` (SR-006)
- Design Spec (required on every route): `tickets/in-progress/node-universal-authentication-437/design-spec.md` (Round 2 Mechanisms M-1…M-10 authoritative)
- Supplemental Task Artifacts: `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-15, NAS-01…NAS-38); `probes/` and `evidence/PROBE-02-client-addresses.log`, `evidence/PROBE-03-electron-header-injection.log`
- Design Review Report: `tickets/in-progress/node-universal-authentication-437/design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `tickets/in-progress/node-universal-authentication-437/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/node-universal-authentication-437/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/node-universal-authentication-437/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/node-universal-authentication-437/code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `tickets/in-progress/node-universal-authentication-437/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/node-universal-authentication-437/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 2
- Trigger: round 1 Code Reviewer CRR-002 Pass on IR-002 (`b6a57ab154`); round 2 Code Reviewer CRR-004 Pass on IR-003 (HEAD `32e9ad944c`, fixes for API-REV-001 F-1…F-3 and O-1, O-2)
- Prior Investigation Reviewed: round 1 (this document, API-REV-001)
- Latest Authoritative Investigation: this document, round 2

## Current Requirement And Design Basis

No key, no access: every HTTP request and WebSocket upgrade to a node's main port passes one gate after the Host and
Origin rules: network admission on the client address (M-6), exactly one credential (owner Bearer, the browser
WebSocket `access_token`, phone `mra_`, peer signature, `mhub_`), and a route permission by client kind (deny by
default). The desktop app hands its own node a fresh launch credential (M-1) and attaches each node's owner credential
in its main process to the app window's requests, iframes and WebSockets included (DEC-006); remote and Docker nodes
connect once with a setup code from the node's local control socket (M-2, DEC-003/015); phones keep their credential,
now required (REQ-005); peers pair once by invite and sign every request (M-7, M-9, DEC-004/014); the MCP gateway always
needs its token (M-5); the Docker launcher publishes on this computer and its Tailscale address, all addresses only with
`--allow-local-network` (M-8, DEC-013). Upgrades never fall back (NA-14). The contract scenarios NAS-01…NAS-38 are the
behavior list; the implementation proved the server-checkable ones in repository tests (implementation handoff Checks
Run). Code review passed CRR-002 after CR-001 (peers behind a prefix-stripping gateway) and CR-002 (contract text).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (desktop app, own node), SCN-002 (Docker/remote node, setup code),
  SCN-003 (phone), SCN-004 (peers), SCN-005 (MCP client, memory sync source), SCN-006 (no-key contract), SCN-007
  (local-network admission), SCN-008 (upgrade).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-01 The desktop owns both nodes and pairs its own node with a Docker node from the Nodes page (DEC-014): the Docker
    node must reach the host node at `host.docker.internal` (M-9 resolver) through the host's gate (arrives as
    `127.0.0.1`, PROBE-02 B1). Trigger: Nodes page "Pair" in the desktop window.
  - RU-02 A user starts `pnpm dev` (the development runtime): the window works through the Vite proxy credential.
    Trigger: the browser probes' `nuxt dev` window (the proxy path), plus IMP-15.
  - RU-03 A Docker node created by an older launcher (publishing on every address) after the update, before
    `setup-code` (NAS-34): only exempt endpoints answer. Trigger: a test-owned container created with the old publishing.
  - RU-04 A peer behind a real prefix-stripping reverse proxy (CR-001 context): a real nginx with
    `location /autobyteus/ { proxy_pass http://…/; }` in front of one node. Trigger: pairing and a delegation through it.
  - RU-05 Every browser/Electron probe in `autobyteus-web/tests/e2e/` that starts `dist/app.js` now needs a credential;
    the seven named by the handoff are this ticket's own surfaces (peers, Nodes page, phone, Docker address).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded by the
  designer. Out of the model (not tested): software already running as the user on the same computer (NA "Out of the model").

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 gate on every route (REQ-001/002/009) | Changed | DS-001; NA-1/2/6/7/13 | Server e2e reused (IMP-06, IR002-04); every probe that starts a node must now carry a credential |
| BEH-002 network admission, Docker publishing (REQ-008) | Added | M-6, M-8; NA-3/4 | Real-network check on this Mac's LAN and Tailscale addresses; Docker publishing with a test-owned container and the real launcher (UNK-006) |
| BEH-003 desktop own node + setup-code pairing (REQ-003/004/010) | Added | M-1, M-2; NA-5/8/15 | Packaged Electron probe (isolated instance) against its own node and a test-owned Docker node |
| BEH-004 peer pairing by invite, signed requests (REQ-006) | Changed (`addPeerNode` removed) | M-7, M-9; NA-9 | Probes that paired by `addPeerNode` updated to invites; real gateway probe |
| BEH-005 phone credential required (REQ-005) | Changed | NA-7; NAS-05…10 | Phone shell probe under enforcement; phone over this Mac's LAN/Tailscale addresses |
| BEH-006 iframes/HTML preview/apps in the window (REQ-003) | Preserved via main-process attachment | DEC-006; PROBE-03 | Electron probe: HTML preview, application iframe, terminal, node desktop |
| BEH-007 MCP gateway token, memory sync `mhub_` (REQ-007) | Changed | M-5 | Reused (IMP-04 NAS-25, IMP-07 NAS-26); MCP panel in the Electron probe |
| Preserved: 290 hold-back answers, AC-102 identity mismatch, base-path peers (CR-001) | Preserved | handoff trace | Reused NV-01…03, RC-16; real gateway probe RU-04 |
| Removed: `addPeerNode`, `peerAddressCandidates`, `resolvePeerAddress`, per-route loopback trust | Removed | Removal plan | Probe assertions on them are stale (see inventory) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | node-access services, verifiers, permissions | IMP-03, IMP-18, IR002-03 (unit) | — | — |
| API / transport / contract | Yes | gate on HTTP/WS, refusal shapes, exchanges | IMP-04, IMP-06, IR002-04, IMP-07, IMP-09/IR002-06 (real servers) | WebSocket upgrades from a real browser/Electron; Vite proxy path | Browser probes, Electron probe |
| Frontend component / state | Yes | Nodes page notice, pairing step, MCP panel | IMP-11, IMP-19 (specs) | rendered on a rebuilt app (NodeRow fix not rendered) | Electron probe |
| Browser integration / user journey | Yes | window's requests through the dev proxy; phone shell under enforcement | none run since the change | every probe journey | Browser probes |
| Authentication / session / permissions | Yes | all credential kinds | server e2e | real phone bundle, real Electron attachment | Phone probe, Electron probe |
| Desktop renderer / web-equivalent UI | Yes | same renderer in Electron | specs | — | Electron probe |
| Desktop shell / Electron-specific integration | Yes | launch credential handover, attacher on `session.defaultSession` (HTTP + WS), encrypted store, IPC, in-app browser partition | IMP-12 (Electron unit with mocks), UI-00 (one rendered check, old build) | iframes/HTML preview/app iframe/terminal/node desktop under the credential; in-app browser 401; key not in URL/log/page; NAS-31 terminal env | Isolated packaged instance (API-01) |
| Process / lifecycle | Yes | launch credential intake before spawn; restart; Docker recreate on `setup-code` | IMP-06 NAS-31 (server env) | packaged app restart; Docker recreate | Electron probe, Docker probe |
| Persisted-data transition | Yes (additive) | `peers.json` rows without `peerSecret` → "Pair again"; old launcher publishing | unit + e2e NAS-23 | old container upgraded by `setup-code` (NAS-34) | Docker probe |
| Worker / queue / distributed coordination | Yes | two nodes signing to each other | IMP-09 / IR002-06 (two built servers) | a real reverse proxy (RU-04) | Gateway probe |
| External integration | Yes | Docker Desktop publishing, Tailscale address, real LAN | IMP-14 (fake docker, fake tailscale) | UNK-006, real publishing, real addresses | Docker probe, real-network check |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437`, branch `codex/node-universal-authentication-437`
- Project type and runtime stack: pnpm monorepo; Fastify/TypeScript server (`autobyteus-server-ts`), Nuxt 3 web + Electron 42 desktop (`autobyteus-web`), Bash/PowerShell Docker launcher (`scripts/public/docker`); macOS 26 arm64, Node 22, pnpm 10, Docker Desktop, Tailscale.
- Project testing guideline path(s): `TESTING.md` (root; no closer `TESTING*.md` on the changed paths)
- Conflicting, missing, or unclear project instructions: TESTING.md § Browser probes says a probe-owned backend needs the launch credential and the page must send it; no shared probe helper existed → added `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs`.
- Changed build-input paths: `autobyteus-web/nuxt.config.ts`, `autobyteus-web/generated/graphql.ts`, `scripts/**` (development runtime, Docker launcher), `autobyteus-server-ts/docker/README.md` → fresh-start desktop build case API-FS.
- Required environment variables or secrets available: `N/A` (no provider keys needed: scripted AGY CLI, recorded Grok ACP replay)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing guideline | Layers and commands; one heavy run at a time; clean env for server E2E; Node credentials rule; Browser probes rules; Docker server nodes (test-owned container, `127.0.0.1`, fresh volumes, `docker rm -f -v`); Rules 1–5 (isolated instance, never the user's app); Fresh-start build |
| `docs/isolated-app-instances.md` | Isolated desktop instance | `pnpm --silent isolated-app start --from-worktree`, `stop <id>`; attach-only control on `controlPort` |
| `autobyteus-server-ts/docs/design/node_access_model.md` | Behavior contract | NAS-01…38 expected results |
| `scripts/public/docker/autobyteus-docker.d/bash/*` | Launcher | State dir `AUTOBYTEUS_DOCKER_STATE_DIR` (default `~/.autobyteus/docker-server`, the user's); names `autobyteus-server-<n>` chosen by `new-container`; `upgrade --all`, `stop --all`, `destroy --all` act on every launcher-labelled container → never run them against the user's daemon; `docker pull` of the image ref |
| `autobyteus-web/package.json` | Probe scripts | `test:e2e:<name>` → `node tests/e2e/<name>-probe.mjs` |
| `.github/workflows/release-desktop.yml` | Fresh-start build | install `--frozen-lockfile`, `build:electron:mac` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built server | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` (IR002-05 at `1e02bea41e`; no server source changed since) | `dist/app.js` | `Sanitized built-module/bootstrap smoke passed` | — |
| Packaged desktop | `autobyteus-web` | `pnpm -C autobyteus-web build:electron:mac` (API-00), then `pnpm --silent isolated-app start --from-worktree` | own data root, ports | `start` JSON | `isolated-app stop <id>`; `list` shows none |
| Test-owned Docker node | repo root | image `autobyteus/autobyteus-server:beta` + this worktree's server package; test names `abtest437-*` | `127.0.0.1` (+ Tailscale) publishing | `/rest/health` 200 | `docker rm -f -v`, volumes removed |
| Browser probes | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:<name> --output-dir=<fresh>` | own servers, `nuxt dev`, headless Chrome | probe receipt | the probe's own `finally` |
| nginx gateway | — | `nginx:alpine` container, test-owned | `127.0.0.1` publishing | 200 through `/autobyteus/rest/health` | `docker rm -f` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Node launch credential for probes | `fixtures/probe-node-access.mjs` (new) | never written to evidence (`redactCredentials`) | in memory |
| Owner credential for a Docker node | setup code from the node's local control socket | code never printed to evidence | container removed |
| Phone credential | real Phone Access pairing through the API/UI | `mra_` redacted | probe data roots removed |
| Peer pairing | `createPeerInvite`/`acceptPeerInvite` | invite redacted | probe data roots removed |
| Old-launcher Docker container (NAS-34) | `docker run` with the old all-address publishing and the launcher labels, test name | test-owned volumes | `docker rm -f -v` |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec § Persisted Data / State Transition Decision; handoff § Persisted Data Transition Check
- Representative existing-data setup and required behavior: a peer row without `peerSecret` reads as unpaired and shows "Pair again"; an old-launcher container keeps its publishing until `setup-code`/`start`/`upgrade` recreates it with volumes kept.
- Evidence planned: reused unit/e2e (NAS-23); Docker probe (NAS-34, recreate keeps the node's data).
- Migration-specific completion/recovery scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/node-access/node-access-model.e2e.test.ts` | NAS server scenarios | AC-001, 002, 007, 009 | Still Valid | IR002-04 | Reuse |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | pairing + signed peers | AC-006 | Still Valid | IR002-06 | Reuse |
| `tests/architecture/node-access-boundaries.test.ts` | every route/WS gated; NAS IDs named | AC-002 | Still Valid | IMP-17 | Reuse |
| built-server e2e not run by implementation (`projects/delegated-copy-project-folder`, `projects/unclean-shutdown-delegated-team-restore`, `shutdown/busy-run-stop-now`) | only gained the launch credential | QR-003 | Unclear (never run since the change) | handoff "Not run" | Run (API-13) |
| `scripts/tests/*docker*` (launcher pytest) | publishing, `--allow-local-network`, `setup-code`, v10 | NAS-27, 32, 34 | Still Valid | IMP-14 | Reuse; add a case for `--allow-local-network` across `upgrade --all` if missing |
| `autobyteus-web/tests/e2e/remote-run-title-probe.mjs` | run titles of peer-started runs | preserved collaboration | Needs Update | starts nodes without a credential; `addPeerNode` | Update (API-05) |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` | remote runs in the tree | preserved | Needs Update | same | Update (API-06) |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` | routed data on two nodes | preserved | Needs Update | same | Update (API-07) |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` | 290 vocabulary, held-back node, phone session | preserved 290 | Needs Update | same | Update (API-08) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | phone shell | AC-005 | Needs Update | same | Update (API-03) |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` | Nodes page turn on/off/remove with one-way registrations and `registerHere`/`registerThere` steps | REQ-006, DEC-014 | Needs Update (cases asserting the removed register steps and one-way registration are stale) | `nodeCollaborationConnector.ts` now plans `turnOnHere`, `turnOnThere`, `pair` | Update to the pairing flow (API-09) |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` | Docker ↔ host addresses through register steps and `resolvePeerAddress` | M-9 | Needs Update (ND-02/ND-03 assert removed `resolvePeerAddress` and Change-address hints) | removal plan | Update to the pairing flow (API-10) |
| the other 36 probes that start `dist/app.js` (`grep -l dist/app autobyteus-web/tests/e2e/*.mjs`) | unrelated features | QR-003 (no internal caller breaks) | Needs Update (no credential) | TESTING.md § Browser probes | API-16, next round |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001, 002, 006, 007, 009; QR-001/002 | server unit, integration, e2e, two-server, Electron/web specs, launcher pytest, built CLI | Reused | IMP-01…19, IR002-01…06 | Server source unchanged since `1e02bea41e` (IR002 checks); IMP checks on earlier commits: changed files since are only the CR-001 peer files (rerun as IR002-03/04/06) and `NodeRow.vue` (IMP-19 at `d8fbe5082a`) |
| API-00 | — | packaged desktop build of HEAD | Existing Test | `pnpm -C autobyteus-web build:electron:mac` | The probe needs a current build (TESTING.md: never an older build) |
| API-01 | AC-003; NAS-01, 16, 17, 18, 30, 31, 15 | Electron shell + renderer + own node | Journey | isolated instance of HEAD; attach-only CDP; runs, files, HTML preview, application iframe, terminal (`env`), node desktop; in-app browser; key not in URL/log/page | Shell-specific behavior (DEC-006) |
| API-02 | AC-004; NAS-02, 03, 27, 32, 33, 34; UNK-006; RU-01, RU-03 | Docker launcher + container + Electron | Journey | test-owned image with this worktree's server; real launcher with a temp state dir; `setup-code`; Electron Connect/Disconnect; host/LAN/Tailscale reachability; old-publishing container upgraded | Real Docker publishing; only measurable with a container |
| API-03 | AC-005; NAS-05…10 | phone bundle + gate | Durable (probe updated) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` | Phone under enforcement |
| API-04 | AC-008; NAS-06, 07, 11, 12, 14, 28, 35 | real network admission | Temporary Probe | node bound `0.0.0.0`; requests from this Mac's LAN address and Tailscale address; allow/deny local network; `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`; Docker bridge | Real addresses; a scripted check is not a durable repo test (machine-specific addresses) |
| API-05 | preserved collaboration | browser + two nodes | Durable (probe updated) | `test:e2e:remote-run-title` | broken by the change |
| API-06 | preserved collaboration | browser + two nodes | Durable (probe updated) | `test:e2e:remote-runs-in-tree` | broken by the change |
| API-07 | preserved | browser + two nodes | Durable (probe updated) | `test:e2e:model-routing-decisions` | broken by the change |
| API-08 | preserved 290; phone session | browser + two nodes + phone | Durable (probe updated) | `test:e2e:node-vocabulary` | broken by the change |
| API-09 | REQ-006, DEC-014, NAS-19, 23 | Nodes page pairing in a browser | Durable (probe updated) | `test:e2e:remote-nodes-page` | flow changed |
| API-10 | M-9, RU-01 | Nodes page with a Docker node | Durable (probe updated) | `test:e2e:nodes-docker-address` | flow changed |
| API-11 | RU-04 (CR-001) | real nginx prefix-stripping gateway | Temporary Probe | two built nodes, nginx container in front of one; pair through `/autobyteus`; delegation + run observation | real proxy; the durable unit/e2e test already uses a test gateway |
| API-12 | launcher PowerShell | `pwsh` runtime | Existing Test | the two skipped pytest cases in a `pwsh` container if feasible | `pwsh` not on the host |
| API-13 | QR-003 | built-server suites never run since the change | Existing Test | `vitest run` the three files | handoff "Not run" |
| API-14 | edge cases | Disconnect with an open node desktop stream; re-pair; `--allow-local-network` across `upgrade --all` | Journey / Existing Test | in API-01/API-02 and launcher pytest | handoff edge cases |
| API-15 | RU-02, QR-003 | `pnpm dev` window through the dev proxy | Temporary Probe | `node scripts/development/run-dev.mjs`, headless Chrome on `:3000`, raw upgrades | added after API-05 run 1 showed the dev proxy failing; a durable check belongs with the fix |
| API-16 | QR-003 | the other 36 probes that start `dist/app.js` | Existing Test | move each to `fixtures/probe-node-access.mjs` | added: they get 401 without a credential; next round |
| API-FS | build inputs | fresh clone release build | Existing Test | fresh clone, `pnpm install --frozen-lockfile`, `build:electron:mac` | TESTING.md Fresh-start build; deferred to the fix round (F-1's fix changes `nuxt.config.ts`) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-03, API-05…API-10 | `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | One way for every probe to start nodes with a credential and pair by invite (TESTING.md § Browser probes) |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-03 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | launch credential, owner headers, invite pairing, dev proxy credential | phone context untouched |
| API-05 | `remote-run-title-probe.mjs` | same | |
| API-06 | `remote-runs-in-tree-probe.mjs` | same | |
| API-07 | `model-routing-decisions-probe.mjs` | same; window context attaches (it switches to beta) | |
| API-08 | `node-vocabulary-probe.mjs` | same; desktop context attaches, phone context not | |
| API-09 | `remote-nodes-page-probe.mjs` | credential; "earlier use" through invites; cases follow the `pair` step | |
| API-10 | `nodes-docker-address-probe.mjs` | credential; pairing step; ND-02/ND-03 on the removed address resolution | |

## Durable Coverage To Remove

To be decided per case while updating API-09/API-10; recorded in the report with the obsolete assertion.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42, packaged macOS arm64 build of this worktree.
- Testing guideline used: TESTING.md Rules 1–5; `docs/isolated-app-instances.md`.
- Web-equivalent behavior: Nodes page, MCP panel, runs/files screens (also in browser probes).
- Shell-specific or lifecycle behavior: launch credential handover, header attachment for HTTP and WebSocket and iframes, in-app browser partition without credential, encrypted credential store, Connect/Disconnect IPC, node update client.
- Chosen validation approach: an isolated instance (`isolated-app start --from-worktree`) driven over its CDP control port in attach-only mode (playwright-core `connectOverCDP`), plus process/log inspection of its embedded node.
- How the run avoids disturbing an already-running desktop application: isolated instance with its own data root and ports; the user's app and `~/.autobyteus` are never touched; Docker: only `abtest437-*` containers and volumes, launcher state in a temp dir.

## Live Environment And Fixture Plan

- Startup order: server build (exists) → packaged build → isolated instance → test Docker image/container → probes one at a time.
- Environment choices: clean env for server suites; probes own their stacks.
- Seed data: public APIs only (agent definitions, runs through the scripted AGY CLI).
- Test identities: launch credentials; setup codes; phone pairing; peer invites — none written to evidence.
- Evidence: probe receipts (JSON), screenshots, server logs (refusal lines), command transcripts.
- Owned processes and temporary state to clean up: isolated instance, test containers/volumes/images, nginx container, probe temp roots.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-008 from a real second device on the LAN/café Wi-Fi | No second device here can be driven (the tailnet Linux host on this LAN has no SSH; the phone is not attached) | real-device addresses; covered by this Mac's own LAN/Tailscale addresses | Yes | Delivery: user tries a phone on home Wi-Fi (allowed / not allowed) |
| PowerShell launcher on Windows (named pipe) | No Windows host | Windows-only path | Yes (Windows) | — |
| The other 36 probes that start `dist/app.js` (API-16) | Not updated this round; the fixture is ready | they fail with 401 until moved | No | API/E2E, next round |
| Fresh-start build (API-FS) | must run on the fixed commit | release build of the fix | No | API/E2E, next round |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-1 `pnpm dev` window WebSockets answered 200 by Nuxt | `Local Fix` | API-15 | implementation engineer (after failure-origin review) |
| F-2 `searchFiles` aborted by the gate's async `preValidation` hook | `Local Fix` | API-03 MSP-08, `API-03-MSP-08-cause.txt` | implementation engineer |
| F-3 `MemorySyncNotMigratedError.statusCode = 503` turns the settings GraphQL into HTTP 503 | `Local Fix` | API-08 NVP-05, `API-08-NVP-05-cause.txt` | implementation engineer |
| Probes asserting the removed one-way registration, `resolvePeerAddress`, `peerAddressCandidates` | test validity decided by the removal plan and M-9 | API-09, API-10 | API/E2E (updated) |

## Round 2 Rerun Plan (TESTING.md "Rerun by impact")

Validated commit: `b6a57ab154` (round 1). `git diff --name-only b6a57ab154 32e9ad944c` outside `tickets/`: `autobyteus-web/nuxt.config.ts` (dev proxy now Nitro `devProxy`), `src/api/graphql/graphql-request-context.ts`, `src/memory-sync/shared/memory-sync-capability.ts`, `autobyteus-web/utils/nodeDesktopClient.ts` + localization (O-2), launcher next-step text (O-1), new tests (`dev-proxy-websockets-probe.mjs`, two server e2e files, unit), my 960cfc0661 test changes.

| Case | Decision | Reason |
| --- | --- | --- |
| API-15 | Rerun | the dev proxy changed (F-1 fix); the real `pnpm dev` window |
| API-03 mobile-shell | Rerun (full) | F-2 fix; the desktop window goes through `nuxt dev` (build configuration changed); phone bundle rebuilt |
| API-08 node-vocabulary | Rerun | F-3 fix; `nuxt dev` |
| API-05, 06, 07, 09, 10 | Rerun | `nuxt.config.ts` is build configuration every probe's window runs through (Rerun-by-impact rule 4) |
| API-01 | Partial rerun on a rebuilt app (API-00 r2) | renderer and GraphQL context changed: re-prove AC-003 files incl. search in the app window; app start, terminal |
| API-02 | Partial: O-2 by the implementation's spec (IR003-11); the Docker launcher text (O-1) by IR003-13 | publishing, setup codes and the container path unchanged (launcher change is one text line) |
| API-04, API-11, API-12, API-13, API-14b | Still valid | nothing they exercise changed: admission, peers, launcher logic; `requestAbortSignal` is used only by `searchFiles` |
| API-16 | New this round | 34 probes moved to `fixtures/probe-node-access.mjs`; the deterministic ones run; live ones (real Codex/Claude/AGY inference or signed-in CLIs) not run: same credential path, and real-provider runs only when the change needs real-provider proof |
| API-FS | Run on HEAD | build inputs changed again (`nuxt.config.ts`, `package.json`) |
| R-IMP | Reused: IR003-01…13 at `0c755805d3` (HEAD adds docs only) | |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: one heavy run at a time; never touch the user's containers (`autobyteus-server-0/1/2`) or their launcher state. Execution changed the probe approach: the probes attach the credential in the browser context (loopback only) instead of the dev proxy, which is broken (F-1).
