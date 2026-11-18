# API/E2E Execution Coverage Report

Ticket: autobyteus-416, `node-web-page-and-file-security`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 1; it lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review CRR-001 `Pass`
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-03 kept the `.local` peers as planned. API-12 used the remote node's LAN IP (`http://192.168.2.158:<p>`) instead of the Mac's own `.local` name. Chromium in the app returns `net::ERR_NAME_NOT_RESOLVED` for the machine's own mDNS name before any request is sent (`API-12-local-name-chromium-resolution.json`). That is name resolution on this machine, not the Host gate, and AC-011 accepts "by IP or `.local`".
  - In API-12 the host test node listened on `::` for about 3 minutes, so the app could reach it at its LAN address, as a real remote node and the instance's own embedded node (`0.0.0.0`) do. It held no data and was stopped and removed.
  - API-13: Electron dev mode has no package script. It ran as `BUILD_TARGET=electron nuxt dev` (the Nuxt Electron module's own dev path) with the app's `e2e` launch profile. A main-process `--require` helper (`probes/api-13-cdp-switch.cjs`) added `--remote-debugging-port`, so the dev window could be read over CDP.
  - API-05 is based on 403's probe. It needed `connectionWay`, which the pairing API now requires (run 1 was a harness failure, kept as `API-05-run1-harness-fail-phone-hosts.json`).
  - Several temporary steps needed a second run for step defects (listed per case in Notes). No product code was changed.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/evidence/` (files `API-*`; desktop cases explained in `API-07-12-desktop-README.txt`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. No repository test changed; the review covers the temporary probes in `probes/api-*` and `probes/desktop-steps/` that carry the evidence.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `da207045a5` source (worktree HEAD `fa59313c67`; later commits touch `tickets/` only) | macOS 26, Darwin 25.5.0, arm64 | Node v22.23.1 for the nodes (`autobyteus-server-ts/dist`, rebuilt in API-01); Chrome stable and Playwright WebKit (playwright-core) | Probe-owned nodes on 127.0.0.1, own data roots and HOMEs, clean env (`env -i PATH HOME TMPDIR`); scripted AGY CLI, no provider calls |
| ENV-2 | as ENV-1 | as ENV-1 | Docker 29.0.1, image `autobyteus/autobyteus-server:beta` (`sha256:9c5aa01b…`) with this worktree's `dist` mounted read-only | Test-owned containers published on `127.0.0.1` only, no volumes; the user's `autobyteus-server-*` containers were not touched |
| ENV-3 | as ENV-1 | as ENV-1 | Packaged worktree build (`isolated-app start --build`), Electron 42.11.16, instance `iso-57276-63dd` | Own data root and ports (removed at stop); driven over CDP; in-app browser partition `persist:autobyteus-browser` |
| ENV-4 | as ENV-1 | as ENV-1 | Unpacked Electron 42.11.16 dev mode (`BUILD_TARGET=electron nuxt dev --port 3000`) with `resources/server` from the ENV-3 build | `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, own data root and port (removed) |
| ENV-5 | as ENV-1 | as ENV-1 | `pnpm dev` (backend 127.0.0.1:8000, Nuxt dev :3000), headless Chrome | Worktree-owned data root `<worktree>/.autobyteus/development` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | AC-001, AC-002, AC-003, AC-005, AC-007, AC-010 (mechanism), AC-006 (env test, dev-stack test, one probe), AC-012 (IP), QR-001 | Server gate and routes, MCP/internal listeners, Electron main | Reused: IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10, IMP-11, IMP-12, IMP-13 | — | Pass | (implementation handoff § Checks Run) | (as listed there) | Every check ran on `da207045a5`, the source under validation; nothing they exercise changed since (`git diff --name-only da207045a5 HEAD` outside `tickets/`: empty). IMP-07 includes the "0 open connections after Host-refused upgrades" assertion that guards the `@fastify/websocket` 11.3.4 dependency |
| API-01 | prerequisite | Server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-01-server-build.log` | `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.` | Also `pnpm -C autobyteus-web build:mobile-web` for API-05/06 |
| API-02 | AC-011 (Docker node at `127.0.0.1:<p>`), AC-012 (`host.docker.internal`), AC-006 | Desk node + Docker node, browser window on each | `env -i … pnpm -C autobyteus-web test:e2e:nodes-docker-address --output-dir=evidence/API-02-nodes-docker-address` | ENV-1, ENV-2 | Pass | `API-02-nodes-docker-address/nodes-docker-address-probe.json`, `server-desk.log`, `docker-node.log`, `ND-*.png` | `"result": "Pass"`; ND-01 `onDocker: [{… "baseUrl": "http://host.docker.internal:49551"}]`, both directions Working; `imageDistDiff.onlyMounted` includes `api/security/remote-access-host-gate.js`; 0 refusal lines in all logs; `cleanup: serversLeft 0` | The mounted `dist` carries this change (31 changed, 20 new files vs the image) |
| API-03 | AC-012 (`.local`, peer HTTP + run observation) | Two nodes registered at `http://normys-macbook-pro.local:<p>`; remote Agent/Team/Org runs; browser | `API416_WEB_DIR=<wt>/autobyteus-web PEER_HOST=normys-macbook-pro.local node probes/api-03-remote-runs-by-peer-name.mjs --output-dir=…` (the repository `remote-runs-in-tree` probe with the peer URL host changed) | ENV-1 | Pass | `API-03-remote-runs-by-local-name/remote-runs-in-tree-probe.json`, `server-alpha.log`, `server-beta.log`, `RTP-*.png` | `"peerUrls": {"onAlpha": "http://normys-macbook-pro.local:50344", …}`; RTP-01…RTP-07 `Pass` (RTP-04 `liveAnswer`: run observation); 0 refusal lines | Also covers the `remote-runs-in-tree` probe's origin edit |
| API-04 | AC-012 alternate, REQ-003, REQ-006 | Peer registration by a public DNS name (`lvh.me` → 127.0.0.1) | `env -i … node probes/api-04-peer-public-name.mjs <wt> evidence/API-04-peer-public-name` | ENV-1 | Pass | `API-04-peer-public-name/API-04-peer-public-name.json`, `server-beta.log` | P1 beta's line `Remote Access request refused REMOTE_ACCESS_HOST_REFUSED /rest/remote-access/status host lvh.me (add it to AUTOBYTEUS_ALLOWED_HOSTS if this is the node's name)`, nothing registered; P2 with `AUTOBYTEUS_ALLOWED_HOSTS=lvh.me`: `"baseUrl": "http://lvh.me:51678"` registered, 0 new refusals; P3 IP control registered | The adding node reports `PEER_NOT_AUTOBYTEUS` ("is not an AutoByteus node") for the Host refusal. Recorded as follow-up FU-002 (not required by AC-012) |
| API-05 | AC-004 (ts.net-shaped proxy), REQ-002 (d)(e), SCN-A2 | Phone shell (`/mobile`) on the mobile-shell `--hold` stack, through a Host-preserving TLS proxy, Chrome (host mapping) and WebKit (CONNECT proxy) | `env -i … node probes/api-05-phone-tailscale-probe.mjs <wt> evidence/API-05-phone-hosts` | ENV-1 | Pass | `API-05-phone-hosts/API-05-summary.txt`, `API-05-phone-hosts.json`, `API-05-*.png` | Summary: every journey (chrome-lan, chrome-tailscale, webkit-tailscale, chrome-company-paired) `pair … newRun: 'Pass'`; WS handshakes 14/15/17 all 101 and proxy upgrades `HTTP/1.1 101` with Host `alpha.tail-probe.ts.net` / `node.corp-probe.example`; journey refusals `[]`; controls `pre-corp-unpaired … 403 REMOTE_ACCESS_HOST_REFUSED`, `post-other-corp-unpaired … 403`, `post-corp-paired … 200` | The probe's own verdict field says Fail only through its browser-error filter, which was written for 403's message format. Every error line is classified in `API-05-summary.txt`: the probe's blocked `localhost:8000` feed, and icon CDN calls the CONNECT proxy refuses by design. Run 1 failed on the missing `connectionWay` (harness): `API-05-run1-harness-fail-phone-hosts.json` |
| API-06 | AC-004 (company URL in `AUTOBYTEUS_SERVER_HOST`) | Phone shell through a Host-preserving TLS proxy at `https://node.corp-probe.example:<p>` | `env -i … node probes/api-06-phone-company-host-probe.mjs <wt> evidence/API-06-phone-company-host` | ENV-1 | Pass | `API-06-phone-company-host/API-06-phone-company-host.json`, `server-alpha.log`, `API-06-J*.png` | C1 `corp-unpaired … 200 … servesPhoneBundle: True`, `other-unpaired … 403 REMOTE_ACCESS_HOST_REFUSED` with the hint line; J1 `pageOrigin https://node.corp-probe.example:55071`; J2 `storedOnAlpha: True`; 3 WS `101`; `journeyRefusals: 0` | Runs 1–2 failed on my own assertions (Chrome's `/favicon.ico` second hint line; the empty-list state of a fresh node) |
| API-07 | AC-011 (packaged app + embedded node), AC-010 alternate | Packaged `file://` renderer → embedded node | `pnpm --silent isolated-app start --build`; `node probes/api-desktop-step.mjs … desktop-steps/api07-app-window.mjs …` | ENV-3 | Pass | `API-07-isolated-instance-start.json`, `API-07-desktop/api07-app-window-result.json`, `API-07-app-window.png` | `"own": {"status": 200, "hasData": true, "ws": "opened"}`, `"refusalLines": 0` | — |
| API-08 | AC-010, AR-002, SCN-A3 | In-app browser `file://` page, `about:blank` iframe, `srcdoc` iframe, `about:blank` popup → embedded node | `node probes/api-desktop-step.mjs … desktop-steps/api08-file-page.mjs evidence/API-08-desktop <attack page> <F1 txt> <F1 pdf>` | ENV-3 | Pass | `API-08-desktop/api08-file-page-result.json`, `API-08-file-page-load1.png`, `API-08-file-page-load2.png`, `API-08-AR002-*.png`; node log `API-07-12-embedded-node-server.log` | `matrix`: all 16 form×kind entries `refusedOriginNull: true` (e.g. `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /graphql?f=srcdoc-fetch origin null`); every WS `closed 1006`, none opened; `loaded: 'API08 LOCAL PAGE LOADED'`, `origin: 'file://'`; `ar002.textShown: "API10 PLAIN TEXT LINE"`, `pdfDoc.contentType: "application/pdf"` (screenshot: both pages rendered) | The popup form runs on the page's second load. The in-app browser creates a page's popup only once its tab is attached to the app window (`browser-tab-manager` `handlePopupRequest`, unchanged here). Run 1's step miscounted log lines: `API-08-run1-step-defect` |
| API-09 | AC-009, AC-007 (Electron) | F1 HTML and SVG opened top-level in the in-app browser | `… desktop-steps/api09-top-level-html.mjs evidence/API-09-desktop <F1 page.html> <F1 drawing.svg>` | ENV-3 | Pass | `API-09-desktop/api09-top-level-html-result.json`, `API-09-top-level-html.png`, `API-09-top-level-svg.png` | headers `"csp": "sandbox allow-scripts", "nosniff": "nosniff"`; `"state": "API09 SCRIPT RAN", "selfOrigin": "null", "storage": "blocked: SecurityError"`; refusals `/graphql?f=api09-fetch origin null` and `/ws/terminal/api09-session?f=api09-ws origin null`; `svg: "API09 SVG SCRIPT RAN null"` | Run 1: the step matched an older tab (same route, other query) |
| API-10 | AC-008 | App viewers via start surface → Files panel → click; top-level PDFs in the in-app browser | `… desktop-steps/api10-viewers.mjs evidence/API-10-desktop <files dir> <F1 attachment pdf> <pdf to upload>` | ENV-3 | Pass | `API-10-desktop/api10-viewers-result.json`, `API-10-viewer-*.png`, `API-10-top-level-pdf-attachment-F1.png`, `API-10-top-level-pdf-media-F3.png` | `report.pdf canvases: 2`, `sheet.xlsx cell API10-SHEET-CELL`, `image.png naturalWidth 64`, `clip.webm readyState 4 duration 2`, `sound.wav readyState 4`, `notes.md` text + image, `notes.txt`, `preview.html frameText API10 HTML PREVIEW SCRIPT RAN`; both top-level PDFs `contentType: application/pdf` with `csp: sandbox allow-scripts` (screenshots: both pages rendered); `refusalLines: []` | Run 1: the step's text check missed Monaco's U+00A0 and the preview frame read; screenshots in `API-10-run1-step-checks` already showed both displayed |
| API-11 | AC-013 | `http://localhost:<p>` server (as an agent starts one) in the in-app browser | `node <fixtures>/attack/api11-local-server.mjs <p> <node>`; `… desktop-steps/api11-local-server.mjs evidence/API-11-desktop http://localhost:<p>/` | ENV-3 | Pass | `API-11-desktop/api11-local-server-result.json`, `API-11-local-server-page.png` | `"own": "own server answered api11"`; refusals `/graphql?f=api11-fetch origin http://localhost:57757` and `/ws/terminal/api11-session?f=api11-ws origin http://localhost:57757`; `ws: closed 1006` | — |
| API-12 | AC-011 (Docker node at `localhost:<p>`, remote node by IP), AC-012 (desktop ↔ Docker by `host.docker.internal`) | Desktop Nodes page → add → node windows | Test-owned container `api416-docker-84d80c` (`127.0.0.1:58235`) and host node (`192.168.2.158:58236`); `… desktop-steps/api12-remote-nodes.mjs evidence/API-12-desktop "docker=http://localhost:58235=…" "lan-ip=http://192.168.2.158:58236=…"` | ENV-2, ENV-3 | Pass | `API-12-desktop/api12-remote-nodes-result.json`, `API-12-node-window-*.png`, `API-12-peers-after.txt`, `API-12-docker-node.log`, `API-12-host-node.log` | each window `"status": 200`, seeded agent listed, `"ws": "opened"`; peers: Docker node `{"name":"Embedded Node","baseUrl":"http://host.docker.internal:57277"}`, embedded node `api416-docker http://localhost:58235`, `api416-lan-ip http://192.168.2.158:58236`; 0 refusal lines on all three nodes | Runs 1–3: step defects (confirmation dialog; dialog left open) and the `.local` resolution diagnosis (see Round) |
| API-13 | AC-006 (Electron dev) | Unpacked Electron dev, renderer `http://localhost:3000` → embedded node | `bash probes/api-13-electron-dev.sh <wt> evidence/API-13-electron-dev`, then the same start by hand with `probes/api-13-renderer-check.mjs` over CDP | ENV-4 | Pass | `API-13-electron-dev/API-13-summary.txt`, `API-13-electron-dev-cdp/API-13-renderer-check.json`, `API-13-dev-window.png`, `API-13-node-check.txt` | `AUTOBYTEUS_ALLOWED_ORIGINS=http://localhost:3000` in the embedded node's environment; `Creating node-bound window … url=http://localhost:3000`; renderer `"origin":"http://localhost:3000","graphqlStatus":200,"hasData":true,"ws":"opened"`; controls `200` / `403`; refusal lines `(none)` except the control | Run 1: cold Nuxt; run 2: no CDP; the scripted CDP run raced the window (`pages: []`); the hand run read it |
| API-14 | AC-006 (dev stack) | `pnpm dev` | `node probes/api-14-dev-stack-probe.mjs <wt> evidence/API-14-dev-stack` | ENV-5 | Pass | `API-14-dev-stack/API-14-dev-stack.json`, `pnpm-dev.log`, `API-14-*.png` | `.env` `AUTOBYTEUS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000`; both origins `'POST /graphql 200': 21`, WS `101` with the page's origin; control `403 REMOTE_ACCESS_ORIGIN_REFUSED`; `port8000Free/port3000Free: True` | — |
| API-15 | AC-006 (probes), AC-008 (web PDF viewer, file reads) | 11 changed browser probes covering every edit shape (plus `mobile-shell` in API-05, `nodes-docker-address` in API-02, `remote-runs-in-tree` in API-03, `remote-nodes-page` in IMP-13) | `bash probes/api-15-probe-sweep.sh <wt> evidence/API-15-probe-sweep`; `projects` rerun alone under its package script name | ENV-1 | Pass | `API-15-probe-sweep/API-15-sweep.txt`, `<probe>/…` evidence and `NN-<probe>.console.log` per probe | Pass: `composer-context-file-removal`, `search-pdf-preview` (F1 PDF in the web viewer), `file-explorer-pending-save-draft`, `embedding-settings`, `owner-scoped-file-reads` (T-API, B-001…B-007, file reads), `delegated-copies-large-hub`, `remote-run-title`, `projects` (17/17). Origin accepted in all 11: 0 origin/host refusal lines on every probe node (the one `REMOTE_ACCESS_AUTH_INVALID` is `composer-context-file-removal`'s own forged-bearer check, line 439) | Three probes fail on causes outside this change, each found and recorded. They reach and load the app on the new origin rule before their failing assertion: `token-statistics-ui` TS-E2E-002, a date-dependent fixture (`fixtureDays` 2 before the 14th), FU-003; `model-routing-settings` MRP-02, stale runtime display names (MRP-01, MRP-03…MRP-07 pass), FU-004; `node-vocabulary` NVP-05, a stale `#memory-source-select` wait (NVP-01…NVP-04 pass), FU-004. Live-provider probes were not run (credits). The static audit in the investigation covers all 40 edits |
| API-16 | Fresh-start build (`scripts/**` matched) | macOS ARM64 desktop release job from nothing | `bash probes/api-16-fresh-start-build.sh <wt> da207045a5 evidence/API-16-fresh-start-build`: `git clone --no-local`, checkout, `pnpm install --frozen-lockfile`, `pnpm build:electron:mac -- --arm64` with the job's env, then the job's "Verify bundled Prisma ARM64" and "Verify packaged terminal runtime ARM64" steps | ENV-1 (fresh clone) | Pass | `API-16-fresh-start-build/API-16-fresh-start-build.log`, `API-16-build-full.log` | `untracked build outputs … (none)`; `install exit 0`; `build exit 0`; `engines ok`, `client ok`; `verify resources exit 0`, `verify app exit 0`, `[terminal-runtime] ok: node-pty spawn probe` | Signing, notarization, the x64 and other OS jobs need the runner: not tested (no build step of theirs changed) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-00 (IMP-02, IMP-07, IMP-12), API-05/06 host controls, API-04 | Proven | — |
| AC-002 | Yes | API-00 (IMP-03, IMP-07); real names: API-02 (`host.docker.internal`, IP), API-03 (`.local`), API-05 (`*.ts.net`, LAN IP, paired-phone host), API-06 (`AUTOBYTEUS_SERVER_HOST`), API-12 (`localhost`, LAN IP); public name refused: API-04, API-05, API-06 | Proven | — |
| AC-003 | Yes | API-00 (IMP-07); API-04 P2 (configured name accepted) | Proven | — |
| AC-004 | Yes | API-05, API-06 | Proven | A real Tailscale Serve, a real company proxy and the phone wrappers: the proxies here send the same Host, Origin and `X-Forwarded-*` headers. The user's own tailnet and proxies remain theirs to check |
| AC-005 | Yes | API-00 (IMP-02, IMP-06, IMP-07); API-11 (in-app browser localhost page); API-13/API-14 controls | Proven | — |
| AC-006 | Yes | API-13 (Electron dev), API-14 (dev stack), API-00 (IMP-09, IMP-11, IMP-13, server e2e), API-02, API-03, API-05 (mobile-shell hold), API-15 (11 probes, every edit shape; static audit of all 40) | Proven | — |
| AC-007 | Yes | API-00 (IMP-02 R3, IMP-03, IMP-04, IMP-12); API-09 (top-level HTML/SVG opaque origin in Electron); API-10 (PDF headers) | Proven | — |
| AC-008 | Yes | API-10 (8 viewers, F1 and F3 PDFs top-level), API-08 (PDF after a file page) | Proven | — |
| AC-009 | Yes | API-09 | Proven | — |
| AC-010 | Yes | API-08 (16/16 requests refused; page loads), API-07 (own renderer works), API-00 (IMP-10) | Proven | — |
| AC-011 | Yes | API-07 (packaged app + embedded node), API-12 (Docker at `localhost`, remote by LAN IP), API-02 (Docker) | Proven | — |
| AC-012 | Yes | API-00 (IMP-07 two-node by IP), API-02 and API-12 (`host.docker.internal`), API-03 (`.local`), API-04 (public name refused with the hint) | Proven | — |
| AC-013 | Yes | API-11 | Proven | — |
| AC-014 | No | Docs exist in the change (implementation handoff § Key Files); release-note draft in the handoff | Proven (docs); the release note is delivery's | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 96% | Every critical AC directly proven: API-00, API-02…API-15 | The release note (AC-014) is delivery's | — |
| Changed-boundary execution directness | 80% | 96% | Real packaged in-app browser and embedded node (API-07…API-12); real browsers through proxies (API-05/06); real peers (API-02…API-04); real launchers (API-13/14) | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Docker node with this `dist` (API-02, API-12); two-node remote runs by name (API-03); desktop ↔ Docker collaboration (API-12) | Tailnet and company proxy emulated (same Host, Origin and `X-Forwarded-*`) | A run on the user's own tailnet: only the user can do it |
| Environment, configuration, identity, and fixture fidelity | 70% | 95% | Clean env, own data roots, scripted runtimes; real `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_ALLOWED_HOSTS`, pairing sessions and paired phones | Opening a desktop node window by the Mac's own `.local` name could not be run here (Chromium resolution); the `.local` class is proven node-to-node (API-03) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | 16/16 `file://` forms refused (API-08); host controls before and after pairing (API-05/06); public-name peer refused then configured (API-04); unlisted-origin controls (API-11, API-13, API-14); 0 open sockets after refused upgrades (IMP-07) | Unload beacons in the product browser rely on IMP-10 (real Electron, same session policy) | — |
| User-surface, browser, and desktop-shell confidence | 50% | 95% | Packaged viewers and top-level PDFs (API-10), HTML/SVG opaque origin (API-09), localhost page (API-11), node windows (API-12), Electron dev renderer (API-13), phone in Chrome and WebKit (API-05/06) | No device run of the phone wrappers | The user's phone |
| Durable regression coverage quality and relevance | 90% | 94% | Repository: 416 e2e cases (real HTTP/WS), unit and per-route tests, the architecture test, the real-Electron D6 spec, negative controls (IMP-12) | The desktop and proxy journeys stay temporary (ticket `probes/`). Three unrelated probe defects reduce the sweep's signal until FU-003/FU-004 | Fix FU-003/FU-004 |

- Overall post-repository confidence: 74%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the `@fastify/websocket` 11.3.4 upgrade-cleanup dependency (guarded by IMP-07's 0-open-connections assertion); RSK-001/RSK-002 setups that need a setting (accepted, documented, and the hint is logged: API-04/05/06); FU-002 (a peer's add error names the wrong cause)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated packaged instance, Electron dev), `Browser` (phone shell, probes), `Worker or Distributed` (two nodes, Docker), `Live API` (proxies)
- Confidence gap it addresses: the repository evidence proves the rules on real HTTP/WS, but not the product surfaces that send real Host and Origin values. Those are the in-app browser session policy with the packaged embedded node, browsers behind proxies, peers by name, Docker networking, the launchers, and the viewers under the new headers. Expected gain: direct proof of AC-004, AC-006, AC-008…AC-013.
- Browser validation needed: yes, for AC-004 (phone shell), AC-006 (probes, dev stack) and AC-008 (viewers).

## Desktop Application Validation

- Approach executed: as planned. One packaged worktree build (ENV-3) for API-07…API-12; unpacked dev mode (ENV-4) for API-13. Deviations are under Round.
- Web-equivalent cases: API-10's viewers (also `search-pdf-preview` in API-15). Shell-specific cases: API-08 (session policy, child frames, popup), API-09 and API-10 top-level documents in the in-app browser, API-11, API-12 (node windows), API-13 (dev renderer origin through the launch config).
- Effect on any already-running desktop application: `None`. Own instance, ports and data root; `isolated-app list` was empty afterwards; process matches were scoped to this worktree's paths.
- Behavior not directly proven: the desktop app opening a node window by the Mac's own `.local` name (Chromium does not resolve it on this machine). The `.local` Host class is proven node-to-node (API-03) and in the repository e2e.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (unlisted loopback origins are refused everywhere: API-11, API-13, API-14 controls)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Temporary probes (ticket folder): `probes/api-03-remote-runs-by-peer-name.mjs`, `api-04-peer-public-name.mjs`, `api-05-phone-tailscale-probe.mjs`, `api-06-phone-company-host-probe.mjs`, `api-desktop-fixtures.sh`, `api-desktop-step.mjs`, `desktop-steps/api07…api12*.mjs`, `api-12-ipv6-loopback-forwarder.mjs` (diagnostic), `api-13-electron-dev.sh`, `api-13-cdp-switch.cjs`, `api-13-renderer-check.mjs`, `api-14-dev-stack-probe.mjs`, `api-15-probe-sweep.sh`. They are not durable because each needs a packaged app, Docker, mDNS names, a TLS proxy or the developer's ports 8000/3000, and no repository suite runs those.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Tailscale Serve | Host-preserving TLS reverse proxy for `alpha.tail-probe.ts.net`, with `X-Forwarded-Host/Proto/For` and WS upgrades; Chrome host mapping; WebKit through a CONNECT proxy | No tailnet owned by the run | Real Serve's exact header set; the gate ignores `X-Forwarded-Host` (DEC-005), so the Host value is what matters |
| Company reverse proxy / DNS | Same proxy for `node.corp-probe.example`; `lvh.me` (public DNS → 127.0.0.1) for a peer by public name | No company domain | Low |
| Agent runtimes | Scripted AGY CLI | No provider calls needed | None for this change |
| iOS/Android wrappers | WebKit engine (WKWebView's) | No device run | Low |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (API-02…API-06, API-15) | Yes | Each probe's `finally` | Receipts: `serversLeft: 0`, `rootRemoved: true`, container removed |
| Isolated instance `iso-57276-63dd` | Yes | `pnpm --silent isolated-app stop iso-57276-63dd` | `dataRootRemoved: true`, both ports released; `list` → `[]` |
| Docker container `api416-docker-84d80c` | Yes | `docker rm -f -v` | `docker ps -a --filter name=api416` → 0 |
| Host test node (API-12), fixtures dir, forwarder | Yes | killed, temp dirs removed | none left (`pgrep -f "port 58236"` → 0) |
| Electron dev runs (API-13) | Yes | process tree killed by worktree-scoped patterns; data roots removed | `processes left … 0`, `embedded node left: 0`, port 3000 free |
| `pnpm dev` (API-14) | Yes | SIGINT to its process group | ports 8000/3000 free |
| `autobyteus-web/dist/public` (phone bundle), `electron-dist/`, `resources/server` | Yes (build outputs) | left in place (untracked build outputs) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs):
  - AC-004: a real Tailscale Serve, a real company proxy and the phone wrappers on devices. The proxies here send the same Host, Origin and `X-Forwarded-*` headers. The user's own tailnet and proxies are theirs.
  - AC-014: the release note is delivery's; the implementation handoff has a draft.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: the code reviewer, for proportional review of the temporary probes. No repository test changed.
- Notes:
  - No product defect was found.
  - Follow-ups recorded: FU-002 (a peer's add error says "not an AutoByteus node" for a Host refusal; non-blocking), FU-003 (`token-statistics-ui` date-dependent fixture), FU-004 (two stale probe assertions).
  - The design's escalation trigger did not fire: no supported client sent a Host or Origin outside the approved rule, and no viewer broke under the user-file headers.
