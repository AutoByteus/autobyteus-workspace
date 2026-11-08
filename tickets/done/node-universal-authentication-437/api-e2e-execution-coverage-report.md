# API/E2E Execution Coverage Report — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## Round

- Coverage investigation (the plan; it lists the upstream documents and the round 2 rerun plan): `tickets/in-progress/node-universal-authentication-437/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/node-universal-authentication-437/api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `tickets/in-progress/node-universal-authentication-437/api-e2e-test-progress.md`
- Round and trigger: round 3 (delivery re-entry): Delivery DR-001 blocked on the merged state `8a31d5141c` (origin/personal `31aa11b241` merged as `3e85115f6e`): the base's new MSP-21…23 (autobyteus-434, `mobile-live-reconnect-cases.mjs`) opened node-side sockets without the probe credential. Round 2: Code Reviewer CRR-004 Pass on IR-003 (HEAD `32e9ad944c`)
- Prior round reviewed: round 1 (API-REV-001, `Fail`, 81%) — F-1, F-2, F-3 rechecked first (API-15, API-03, API-08)
- Deviations from the investigation's plan, and why:
  - Round 1: browser probes attach the credential in the probe's browser context (loopback only) instead of the dev proxy, which was broken (F-1). Kept in round 2: the window then behaves as in the desktop app (node = backend URL); the dev proxy path is proven separately (API-15, IR003-08).
  - Round 1: the gateway (API-11) and `pwsh` (API-12) ran in throwaway `alpine` containers (`apk`), because Docker Hub/MCR pulls stalled behind Docker Desktop's proxy; the server package build drops the Dockerfile's `# syntax` line for the same reason.
  - Round 2: probes needing paid inference or a signed-in runtime CLI were migrated but not run (see API-16); three probes have a seed-then-measure mode and ran with small seeds.
  - Round 2: four probe failures were compared with the base `b690a5dfdb` built in a temporary worktree (TESTING.md Rule 9); a timing budget was measured A/B against the base under the same machine load.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/evidence/api-e2e/` (round 2 files start with `R2-`, `API-16-`, `API-FS-`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` — the durable test changes listed below

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `b6a57ab154` (r1); `32e9ad944c` (r2, API-00 r2 build) | macOS 26 (Darwin 25.5) arm64 | packaged desktop `electron-dist/mac-arm64` (Electron 42.11.16); isolated instances | CDP attach-only (playwright-core `connectOverCDP`) |
| ENV-2 | r1 `b6a57ab154`; r2 `32e9ad944c` (server `dist` built at `0c755805d3`, IR003-06; HEAD adds docs only) | same host; LAN `192.168.2.158/24`, Tailscale `100.127.30.107` | Node 22.23.1 | nodes bound `0.0.0.0` or `127.0.0.1`; temp data folders |
| ENV-3 | r1 `b6a57ab154`; r2 `32e9ad944c` | Docker Desktop linux/arm64 | `abtest437/autobyteus-server:test` = `autobyteus/autobyteus-server:beta` + this worktree's server package (`docker buildx … --target server-package`); guarded `docker` wrapper | user's `autobyteus-server-0/1/2` never touched (call audits: 73 r1, 7 r2, none mutating them) |
| ENV-4 | `32e9ad944c` + the round's probe commits (`fa6ec192a0`, `8cac59f2d4`, `d115fd9c71`) | same host | headless Google Chrome 156.0.8078.80; `nuxt dev`; probe-owned `dist/app.js` nodes, scripted AGY CLI / LM Studio stand-ins | probe launch credential (`fixtures/probe-node-access.mjs`); host load average 75–95 (Docker VM, the user's app, other agents) |
| ENV-5 | r1 `b6a57ab154` | throwaway `alpine:latest` containers | nginx 1.30.6, PowerShell 7.6.9 | removed |
| ENV-6 | base `b690a5dfdb` | temporary worktree `/tmp/abtest437r2/base-wt` (removed) | its own `pnpm install --frozen-lockfile`, server build, `nuxt prepare` | base comparison only |
| ENV-7 | `d115fd9c71` (HEAD with the round's test commits) | fresh `git clone --no-local` | `pnpm install --frozen-lockfile` alone, then the release job's build | API-FS |

## Cases

Evidence paths are relative to the evidence folder. Credentials, setup codes, invites and peer secrets are redacted (scan in Temporary Methods).

### Round 3 (delivery re-entry DR-001, latest)

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-03 r3 (MSP-21…23) | AC-005 (phone live streams after a dropped path, background, a message during its own turn — autobyteus-434 cases under enforcement); QR-003 | phone bundle + node gamma behind a TCP proxy, node-side "other window" clients | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-21,MSP-22,MSP-23 --output-dir=<R3-API-03-mobile-shell-msp21-23>` on the merged state `8a31d5141c` + the test fixes below; server `dist` and `build:mobile-web` built by delivery after the merge (DR1-server-build.log, DR1-build-mobile-web.log) | ENV-4 (merged state) | Pass | `R3-API-03-mobile-shell-msp21-23.log`, `R3-API-03-mobile-shell-msp21-23/mobile-shell-probe.json`, `…/server-gamma.log`; run 1: `R3-API-03-mobile-shell-msp21-23-run1*` | `[mobile-shell] MSP-21 Pass`, `MSP-22 Pass`, `MSP-23 Pass`, `mobile-shell probe: Pass`; receipt: 156 browser errors, 0 unknown; gamma refusals: only `16 Node request refused NODE_CREDENTIAL_REQUIRED /favicon.ico from 127.0.0.1` | Test fixes in `mobile-live-reconnect-cases.mjs`: (1) the node-side `nodeClient` sockets carry the probe credential (`ownerSocketUrl`), the class fixed for API-16 — delivery's run had `NODE_CREDENTIAL_REQUIRED /ws/agent-team/…, /ws/agent/…, /ws/agent-org/…`; (2) run 1 then passed all three cases but failed on unknown browser errors: the phones' own `/favicon.ico` request at the origin root now answers 401 (no credential; NA-1, NA-2 deny by default; it answered 404 before) and the case's known-error rule named 404 → 401. MSP-01…20 on the merged state: delivery's DR1-mobile-shell run, all Pass (reused) |

### Round 2 (latest)

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001, 002, 006, 007, 009; CR-003…005 | server unit/integration/e2e incl. `search-files-through-gate`, `memory-sync-held-back-graphql`, dev-proxy probe, web specs, launcher | Reused: IR003-01…13 at `0c755805d3` | — | Pass | (implementation handoff Checks Run) | — | HEAD `32e9ad944c` adds only ticket docs after `0c755805d3` |
| API-00 r2 | — | packaged desktop build | `pnpm -C autobyteus-web build:electron:mac` | ENV-1 | Pass | `API-00-electron-build-r2.log` | `# Exit status: 0` | |
| API-01 r2 | AC-003 (files incl. search, terminal); NAS-31; NA-8 | the rebuilt app window + own node | isolated instance `iso-61820-52ec`; CDP steps `R2-API-01-electron/r1…r3.js` | ENV-1 | Pass | `R2-API-01-electron/R2-API-01-transcript.txt`, `R2-API-01-files-search.png`, `R2-API-01-terminal.png` | `{"status": 200, "body": "{\"data\":{\"searchFiles\":[\"src/app-437.ts\"]}}"}`; `"R2-TERM-42\n0"`; credential-shaped strings in DOM 0, storage 0 | round 1 API-01 still valid for the rest (renderer change only in the viewer wording; GraphQL context change only affects `searchFiles`) |
| API-15 r2 | RU-02 `pnpm dev`; QR-003 (F-1) | dev server proxy, window WebSockets | `node scripts/development/run-dev.mjs` (clean env), headless Chrome `devcheck.mjs`, raw upgrades | ENV-2 | Pass | `R2-API-15-pnpm-dev/R2-API-15-upgrade-repro.log`, `R2-API-15-window-websockets.json.txt` | `ws://127.0.0.1:3000/ws/projects` → `HTTP/1.1 101 Switching Protocols` (also `/graphql`); window sockets `handshake 101`; `Nuxt restarts in the dev output: 0`; backend directly without a credential `401` | dev output's `#app-manifest` pre-transform errors are pre-existing (in round 1's `API-03-mobile-shell/frontend.log` too) |
| API-03 r2 | AC-005; NAS-05, 08, 09, 10 (F-2) | phone bundle `/mobile` + desktop window | `build:mobile-web`; `test:e2e:mobile-shell --output-dir=…` | ENV-4 | Pass | `R2-API-03-build-mobile-web.log`, `R2-API-03-mobile-shell.log`, `R2-API-03-mobile-shell/mobile-shell-probe.json` | `mobile-shell probe: Pass`; 20 of 20 cases `Pass` incl. `MSP-08`; cleanup `rootRemoved: true` | |
| API-08 r2 | preserved 290 REQ-913 (F-3) | browser + two nodes + phone | `test:e2e:node-vocabulary` | ENV-4 | Pass | `R2-API-08-node-vocabulary.log`, `R2-API-08-node-vocabulary/node-vocabulary-probe.json` | NVP-01…05 `Pass`; NVP-05 `"cardHasReason": true`; `"statusCode":503` in alpha's log: 0 | |
| API-05/06/07/09 r2 | preserved collaboration, Nodes page pairing (NAS-19, 23) | browser probes through the changed `nuxt dev` | `test:e2e:remote-run-title`, `remote-runs-in-tree`, `model-routing-decisions`, `remote-nodes-page` | ENV-4 | Pass | `R2-API-05-…`, `R2-API-06-…`, `R2-API-07-…`, `R2-API-09-…` (log + folder each) | `remote-run-title probe: Pass`, `remote-runs-in-tree probe: Pass`, `Model Routing decisions probe: Pass`, `remote-nodes-page probe: Pass` | rerun because `nuxt.config.ts` is build configuration every window runs through |
| API-10 r2 | M-9, RU-01 | Nodes page with a Docker node | `PATH=<guarded docker>:$PATH test:e2e:nodes-docker-address --docker-image=abtest437/autobyteus-server:test` (image rebuilt from `32e9ad944c`) | ENV-3, ENV-4 | Pass | `R2-API-10-server-package-build.log`, `R2-API-10-nodes-docker-address.log`, `R2-API-10-nodes-docker-address/` | ND-01…05 `Pass` | |
| API-16 | QR-003 (no internal caller breaks) | the 34 remaining probes that start `dist/app.js` | migrated in `fa6ec192a0`; runner `API-16-run-probes.sh`; ledger | ENV-4 | Pass (see rows) | `API-16-probes/API-16-ledger.md`, `API-16-probes/<probe>.log` and folders | the ledger's Exit column | details in the API-16 table below |
| API-16-base | Rule 9 cause of four API-16 failures; QR-002 timing | the same probes on base `b690a5dfdb` | `API-16-base` runner (copied in its log headers) | ENV-6 | Done | `API-16-base/API-16-base-ledger.md`, `base-*.log`, `rhrb-*.log` | base `internal-agents` IP-03, `runtime-switch` RSW-01, `github-skill-sources` WEB-002 fail the same way; base `memory-search` passes; read budget base p50 147–151 ms vs this branch 145–151 ms | |
| API-FS | build inputs (`nuxt.config.ts`, `package.json`, `generated/graphql.ts`, `scripts/**`) | fresh clone release build (desktop macOS arm64 job) | `API-FS-fresh-start-build.log` header: clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the job's env, Prisma and terminal-runtime verify steps (script `API-FS-fresh-start-build.sh`) | ENV-7 | Pass | `API-FS-fresh-start-build.log`, `API-FS-build-electron.full.log.gz` | `install exit 0`; `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`; `build exit 0`; `prisma verify exit 0`; `[terminal-runtime] ok: node-pty spawn probe`; `terminal verify exit 0` | signing/notarization, x64, Linux, Windows jobs need the runners: Not Tested |

### API-16: the 34 migrated probes

| Probe | Result | Notes |
| --- | --- | --- |
| agent-runtimes-settings, chat-composer-menus-open-upward, chat-composer-polish, composer-context-file-removal, delegated-team-default-collapse, embedding-settings, file-explorer-pending-save-draft, integrations-page, model-routing-settings, project-manager-ux, projects-feature, projects-left-navigation, provider-api-key-save, runtime-switch-members, search-pdf-preview, task-closure-tree, team-status-live, token-statistics-ui | Pass (18) | first run |
| agent-org-role-labels | Pass (rerun) | first run: strict-mode violation, `/^View/` matched the run section's View menu (autobyteus-385) and the team's "View ↗" link → baseline test fix `8cac59f2d4` |
| delegated-launch-defaults (with its case modules) | Pass except SIR-002 | first run 24 Pass, 5 Fail: LRL-001/003/004/005 — the case module's team client used Node's built-in `WebSocket` without a credential → `ownerSocketUrl` (in `fa6ec192a0`); rerun `--cases LRL-001…005`: `Summary: 5 Pass, 0 Fail`. SIR-002 fails on its own (below) |
| owner-scoped-file-reads, delegated-copies-large-hub, run-history-read-budget | Pass (seeded) | need `--seed-to` then `--from-seed`; seeds made small (`--unrelated 100`; `--teams 10 --unrelated 50`); run-history-read-budget RB-C1…C4 Pass, RB-B1/B2 timing over budget once at load ~90 (p95 302/325 ms), then within budget in two interleaved A/B pairs with the base (this branch p95 245/196 and 182/163 ms; base 175/169 and 169/169 ms; p50 equal) |
| memory-search | Pass (after a test fix) | MS-PROBE-030 failed twice here, passed on base; diagnostic copy: `lineCountAtBanner 0, highlightedAfterWait 24, waitedMs 26` — the probe counted before the journal's lines arrived → wait added (`d115fd9c71`); rerun 23 checks Pass |
| internal-agents (IP-03), runtime-switch (RSW-01), github-skill-sources (WEB-002) | Fail — pre-existing | identical failure on base `b690a5dfdb` (API-16-base); the probes' other cases pass here → FU-004 |
| delegated-launch-defaults SIR-002 | Fail — pre-existing | the case expects a `server_helper` run deleted; the migration keeps such runs since `d60d4a60e5` (autobyteus-280) → FU-003 |
| chat-draft-rows-live, chat-entry-live, cross-scope-agent-mentions-live, run-settings-live, agy-actual-solution-designer-skill-org, agy-large-org-launch-health, agy-process-restart-focus-continuation | Not Tested | real Codex/Claude/AGY inference or a signed-in CLI (user credits, signed-in state); migrated with the same three edits as the passing probes |
| electron-launch-profile, isolated-app-lifecycle | No change needed | they reach the packaged app's node only through its renderer (attacher) or the exempt `/rest/health` |

### Round 1 cases (still valid in round 2 unless rerun above)

| Case ID | Criteria | Result (r1) | Evidence | Still valid because |
| --- | --- | --- | --- | --- |
| API-00 | — | Pass | `API-00-electron-build.log` | superseded by API-00 r2 |
| API-01 | AC-003; NAS-01, 16, 17, 18, 30, 31, 33, 35, 37, 19, 23; NA-8 | Pass | `API-01-electron/API-01-transcript.txt`, `API-01-e*.png` | the round's renderer change is the node desktop viewer's wording; the GraphQL context change only affects `searchFiles` (re-proven in API-01 r2) |
| API-02 | AC-004; NAS-02, 03, 13, 27, 32, 33, 34; NA-4; UNK-006 | Pass | `API-02-docker-launcher.log`, `API-02-docker/API-02-desktop-transcript.txt` | launcher change is one printed line (O-1, IR003-13); publishing, setup codes and container recreate unchanged |
| API-04 | AC-008; NAS-05…12, 14, 28 | Pass | `API-04/API-04-real-network.log` | admission and credentials unchanged |
| API-11 | AC-006 at a base path (CR-001) | Pass | `API-11-gateway/API-11-gateway.log`, `API-11-nginx-access.log` | peers unchanged |
| API-12 | PowerShell launcher parse + contract | Pass | `API-12-pwsh-launcher.log` | the `.ps1` change is the printed next-step line (IR003-13 text contract) |
| API-13 | QR-003 built-server suites | Pass | `API-13-built-server-suites.log` | no change to what they exercise |
| API-14b | `--allow-local-network` across `upgrade --all` | Pass | `API-14b-launcher-tests.log` | IR003-13 reran the launcher files (61 passed) |
| API-03, API-05…10, API-15 (r1) | — | Fail / Pass | `API-03-…`, `API-05-…` … `API-15-pnpm-dev/` | superseded by their r2 rows |

## Prior Failure Resolution (round 1)

| Failure | Fix (implementation) | Proven by |
| --- | --- | --- |
| F-1 `pnpm dev` window WebSockets | Nitro `devProxy` with `ws` (CR-003) | API-15 r2, IR003-08 |
| F-2 workspace file search aborted | `createRequestAbortSignal` aborts only on a real disconnect (CR-004) | API-01 r2 (app window), API-03 r2 MSP-08 (phone), IR003-05 |
| F-3 held-back Memory Sync card | `statusCode` removed from `MemorySyncNotMigratedError` (CR-005) | API-08 r2 NVP-05, IR003-05/07 |
| O-1 launcher wording, O-2 viewer wording | 0c755805d3 | IR003-13, IR003-11 (specs); not re-rendered |
| O-3 numbered name on a pairing clash | accepted as is (CRR-004) | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | R-IMP, API-04, API-01 | Proven | — |
| AC-002 | Yes | R-IMP (IMP-17, IR003-03) | Proven | — |
| AC-003 | Yes | API-01 + API-01 r2 (runs, files incl. search, HTML preview, applications, terminal, in-app browser 401, no key in URL/log/page/storage), API-02 (node desktop) | Proven | — |
| AC-004 | Yes | API-02, API-01 (NAD-07…13), API-10 r2 | Proven (node update: status read authorized; an executed in-place update needs a newer signed package) | — |
| AC-005 | Yes | API-03 r2 (20/20 MSP cases under enforcement), API-04 | Proven | — |
| AC-006 | Yes | R-IMP (IR002-06), API-11, API-01, API-02, API-05…07 r2, API-09 r2 | Proven | — |
| AC-007 | Yes | R-IMP (IMP-04 NAS-25, IMP-07 NAS-26, UI-00) | Proven | — |
| AC-008 | Yes | API-04, API-02 | Proven on this computer's real LAN and Tailscale addresses; **a second physical device: Only The User Can Check** | Tried: the tailnet Linux host on this LAN (no SSH), the phone (not on adb), Android emulators (NAT to loopback). A phone on the home Wi-Fi (allowed / not allowed) and on another network confirms it |
| AC-009 | Yes | R-IMP, API-04 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | every AC proven on real surfaces (above) | AC-008 second device (user) | the user's phone check |
| Changed-boundary execution directness | 90% | 96% | packaged app, real Docker + launcher, real addresses, real nginx, phone bundle, real `pnpm dev` | Windows launcher runtime | a Windows host |
| Cross-boundary integration realism and mock gap | 90% | 95% | two nodes, container ↔ host, gateway, phone, dev proxy | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | real launch credentials, setup codes, invites, phone pairing; fresh-start build | heavy shared-machine load made one timing run noisy (resolved A/B) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Disconnect with open terminal/node desktop, re-pair, NAS-34 upgrade, revocations, held-back data | Wi-Fi change while running not exercised on a real network change | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | API-01/01 r2, API-02, API-03 r2, 39 browser probes | O-1/O-2 wording proven by specs, not re-rendered | — |
| Durable regression coverage quality and relevance | 85% | 95% | every probe that starts a node now carries a credential (fixture); new server e2e (IR003); launcher test | 7 live probes migrated but not run; 4 pre-existing probe failures (FU-003, FU-004) | run the live probes when their runtimes are needed |

- Overall post-repository confidence: 89%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories (95.3%)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AC-008 from a second device (user); Windows launcher runtime; executed in-place node update; the 7 live probes not run; FU-003/FU-004 pre-existing probe failures

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed in both rounds)
- Execution mode: `Project Desktop Validation`, `Browser`, `Live API`, `Worker or Distributed`, `CLI` (launcher), `Lifecycle` (fresh-start build)
- Confidence gap or residual risk it addresses: Electron attachment for iframes/WS, Docker publishing (UNK-006), real-network admission, the phone bundle, peers through a real proxy, the dev proxy, every probe-owned stack under the gate
- Browser validation needed: Yes — F-1 and F-2 showed only there in round 1
- If `Blocked`: N/A

## Desktop Application Validation

- Approach: isolated instances of the worktree's packaged build (API-00, API-00 r2), CDP attach-only; never the user's app or data
- Web-equivalent cases: API-03, API-05…10, API-16; shell-specific: API-01 (+ r2), API-02
- Effect on any already-running desktop application: `None`
- Not directly proven: an executed in-place node update; Windows

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: a released-shape peer row (API-01 NAD-13); a released-launcher Docker node (API-02); released registry and phone session (API-08 r2)
- Approved transition followed without an unnecessary migration: `Yes`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none found

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes` (rounds 1 and 2)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | Added (r1), extended (r2: `withNodeCredential`, `attachToProbeProcess`) | API-03, 05…10, 16 | — |
| `mobile-shell`, `remote-run-title`, `remote-runs-in-tree`, `model-routing-decisions`, `node-vocabulary` probes | Updated (r1, `960cfc0661`) | API-03, 05…08 | — |
| `remote-nodes-page-probe.mjs`, `nodes-docker-address-probe.mjs` | Updated (r1, `960cfc0661`) | API-09, API-10 | removed assertions on the removed one-way registration steps, the "Trusted private network only" note, the address line, `AddPeerNode`/`GetPeerAddressCandidates`/`ResolvePeerAddress` ops and `resolvePeerAddress`/`peerAddressCandidates` (removal plan; M-9; handoff assumption 7); replaced by the `pair` step assertions |
| 34 more probes under `autobyteus-web/tests/e2e/` and `large-runs-load-less-cases.mjs` | Updated (r2, `fa6ec192a0`): launch credential on every `dist/app.js`, process attachment, desktop contexts attached, built-in WebSockets via `ownerSocketUrl` | API-16 | — |
| `autobyteus-web/tests/e2e/agent-org-role-labels-probe.mjs` | Updated (r2, `8cac59f2d4`, baseline fix): unambiguous "View ↗" selector | API-16 | — |
| `autobyteus-web/tests/e2e/memory-search-probe.mjs` | Updated (r2, `d115fd9c71`): waits for the highlighted lines | API-16 | — |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Added `test_allow_local_network_is_kept_when_upgrade_all_recreates_the_node` (r1) | API-14b | — |
| `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs` (from the base, autobyteus-434) | Updated (r3): node-side clients via `ownerSocketUrl`; the favicon known-error rule names 401 | API-03 r3 | the 404 expectation for `/favicon.ico` replaced by 401 (NA-1, NA-2) |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: commits `960cfc0661` (r1), `fa6ec192a0`, `8cac59f2d4`, `d115fd9c71` (r2), the round 3 test commit

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The desktop main process in browser probes | the probe's browser context carries the credential (loopback only) | browser probes have no Electron shell | the attacher is proven by API-01/02 |
| Model inference | scripted AGY CLI, recorded Grok ACP replay, LM Studio stand-ins | no provider calls needed | transport only |
| A second LAN device | this Mac's own LAN/Tailscale addresses | none drivable here | AC-008 user part |
| `docker pull` of the local test image | guarded wrapper (no-op for `abtest437/*`) | the image exists only locally | none for publishing/recreate |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances (r1: 3; r2: `iso-61820-52ec`) | Yes | `isolated-app stop`; data roots removed | `isolated-app list` shows none |
| `pnpm dev` stacks (ports 8000/3000) | Yes | SIGINT | ports free |
| Probe stacks (servers, `nuxt dev`, Chrome, temp roots) | Yes | each probe's own `finally` | receipts' cleanup fields |
| Containers (`autobyteus-server-3/4`, search/gateway/alpine, probe containers) and volumes | Yes | `docker rm -f -v`, named volumes removed | only the user's `autobyteus-server-0/1/2` remain |
| Image `abtest437/autobyteus-server:test` | Yes | `docker image rm` | removed at the end of round 2 |
| Base worktrees `/tmp/abtest437/base-wt` (r1), `/tmp/abtest437r2/base-wt` (r2) | Yes | `git worktree remove --force`, `prune` | removed |
| Fresh clone `/tmp/abtest437r2/fs-clone` | Yes | removed by the API-FS script | — |
| Temporary `dist` instrumentation (r1) and the diagnostic probe copy (r2) | Yes | restored (`cmp` equal) / deleted | — |
| Scratch `/tmp/abtest437`, `/tmp/abtest437r2` | Yes | removed | — |
| Evidence secret scan | — | `own_|mra_|mhub_|mcpg_` + 30 chars, `abpi_…`, `access_token=…`, `"peerSecret": "…"` over the evidence folder | no match |

## Preliminary Classification (On `Fail`)

N/A — round 2 passes. Pre-existing problems found outside this ticket: FU-003, FU-004 (in `follow-ups.md`).

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-008 from a second physical device (user)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Code Reviewer — proportional test-code review
- Notes: round 1's three failures are fixed and re-proven on their real surfaces; every browser probe that starts a node now carries a credential; the fresh-start release build passes on `d115fd9c71`. Round 3: on the merged state, the base's new phone cases MSP-21…23 pass with node access on after two test fixes (no product change). The merge changed no build input of this ticket beyond what delivery rebuilt; the fresh-start build of the merged commit is the release pipeline's (delivery).
