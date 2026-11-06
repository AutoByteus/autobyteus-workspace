# API/E2E Coverage Investigation — websocket-origin-and-phone-route-guard (autobyteus-403)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/websocket-origin-and-phone-route-guard/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md` (SR-001…SR-003)
- Design Spec (required on every route): `.../design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: `.../evidence/origin-probe/`, `.../follow-ups.md`
- Design Review Report: `.../design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (round 1, Full Review) of IR-001; message from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- One Origin gate in `registerRemoteAccessPolicyPlugin` runs for every HTTP request and WebSocket upgrade. A request whose Origin is not allowed gets 403 `REMOTE_ACCESS_ORIGIN_REFUSED` before any route work (REQ-001, REQ-003). CORS is granted only to allowed origins (DS-003).
- The allowed origins (REQ-002) are: an absent Origin; same host[:port] as `Host` or the first `X-Forwarded-Host`; exactly `file://`; http(s) loopback; and the exact origins in `AUTOBYTEUS_ALLOWED_ORIGINS`. `null`, other schemes and malformed values are refused.
- `RemoteAccessRoutePolicy.authorizeWebSocket` is the one WebSocket credential rule. A mobile credential (`mra_…`) opens only the 8 phone WebSocket routes. Elsewhere it is refused with 4403 `PHONE_ACCESS_ROUTE_REFUSED` on `/ws/*`, and with 403 on the `/graphql` upgrade and the peer WS (REQ-004, REQ-005).
- Each refusal writes one log line with the code and the redacted URL; no credential appears (REQ-005, AC-006).
- Preserved (REQ-006, QR-003): the desktop app on embedded, Docker and remote nodes; the phone over LAN HTTP, Tailscale Serve HTTPS, a Docker port and the wrappers; peers; app iframes; development and e2e.
- Code review accepted the delegator deviation `origin: isAllowed(headers)` (CR-C01) and confirmed that the MCP gateway hook still runs first (MP-001).
- Left to this stage: AC-007, AC-008 and AC-009, plus the residual assumptions ASM-001 (no shipped client sends another Origin) and ASM-002 (the phone uses no WebSocket route outside the phone list).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-009.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A01: a cross-origin page in a real browser uses forms of request a test client does not choose for itself. It sends a "simple" POST (`text/plain`, no preflight), which reaches the node without a CORS check, and it opens a WebSocket from a sandboxed iframe (`Origin: null`). Trigger: the user visits the attacker's site (SCN-001/002 in a real Chrome).
  - SCN-A02: the phone shell's own durable browser probe (`test:e2e:mobile-shell`) emulates the LAN by rewriting the phone's URL to the node in Playwright. That forwards the browser's `Origin: http://192.168.77.10:<port>` with `Host: 127.0.0.1:<port>`, as a Host-rewriting proxy would (measured: `evidence/api-e2e/API-00-route-fetch-headers.log`). A real phone on a LAN keeps the Host. This harness is a consumer the new gate refuses, so the probe needs its emulation fixed to match the real network (see Durable Coverage To Update).
  - SCN-A03: the desktop app opens an application whose iframe frontend subscribes to its backend notifications (`/ws/applications/:id/backend/notifications`) from the node's own origin (Brief Studio sample package).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 WS from non-allowed origins | Changed (refused) | REQ-001/002, DS-001 | Server e2e (IMP-04) + real-browser attack probe |
| BEH-002 HTTP/CORS from non-allowed origins | Changed (refused, no grant) | REQ-003, DS-001/003 | IMP-04, IMP-05 + real-browser attack probe incl. simple POST |
| BEH-003 phone credential outside phone WS routes | Changed (4403/403) | REQ-004/005, DS-002 | IMP-02, IMP-04 |
| BEH-004 desktop app (`file://`), embedded/Docker/remote nodes | Preserved | REQ-006, AC-007 | Isolated desktop instance + test-owned Docker node |
| BEH-005 phone `/mobile` (LAN, Tailscale Serve, wrappers) | Preserved | REQ-006, AC-008 | Mobile-shell probe (LAN shape) + real-browser phone journey over LAN shape and a Tailscale-shaped HTTPS proxy (Chrome, and WebKit as the WKWebView engine) |
| BEH-006 peers | Preserved | REQ-006, AC-009 | remote-runs-in-tree probe + the probes' peer cases; logs |
| BEH-007 app iframes | Preserved | REQ-006, AC-007 | Desktop instance with Brief Studio imported |
| BEH-008 dev/e2e loopback | Preserved | REQ-002d | Every Nuxt-dev probe below runs at `http://127.0.0.1:<port>` |
| Setting `AUTOBYTEUS_ALLOWED_ORIGINS` | Added | REQ-002e, DEC-005 | Unit (IMP-02) + a Host-rewriting gateway with and without the setting |
| Removed: CORS `origin: true`, the duplicated WS rule, `routeClass` | Removed | Design Removal Plan | Covered by typecheck and the suites above; no test asserts them |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Origin rule, WS credential rule | IMP-01/02/03 | — | — |
| API / transport / contract | Yes | Root `onRequest` gate, CORS, WS upgrade refusal, close codes | IMP-04 (real upgrades, `ws` client), IMP-05/06/07 | Real browsers' Origin/Host as sent on each client path | Browser (real network stack), Live API |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Yes (preserved) | Phone shell, desktop renderer and dev shells against the gate | Mobile-shell probe (harness-forwarded) | Real browser Origin on the phone's own network path, HTTPS proxy shape | Browser (Chrome + WebKit) |
| Authentication / session / permissions | Yes | Phone credential per WS route | IMP-02/04/06 | Phone shell end to end with its credential | Browser |
| Desktop renderer / web-equivalent UI | Yes (preserved) | `file://` renderer WS, Origin-less fetch | Probe measurement (investigation) | The real packaged app on embedded and Docker nodes | Project Desktop Validation |
| Desktop shell / Electron-specific integration | Yes (preserved) | The renderer's `file://` origin, what the shell sends | None in repo | Real packaged app | Isolated desktop instance |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | Yes (preserved) | Peer REST + `/rest/remote/run-observations` | IMP-04 (peer WS refusal) | Two real nodes collaborating | Distributed (two nodes) |
| External integration | Yes (preserved) | Tailscale Serve, Docker node, WebView wrappers | — | Proxy shape, container | Live proxy emulation; Docker |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard`, branch `codex/websocket-origin-and-phone-route-guard`, source commit `88a93aaf26` (ticket docs `a24421610f`)
- Project type and runtime stack: pnpm monorepo; Fastify 5 node server (`autobyteus-server-ts`), Nuxt/Electron web and desktop (`autobyteus-web`), Node 22
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` under `autobyteus-server-ts/` or `autobyteus-web/`.
- Conflicting, missing, or unclear project instructions: None
- Changed build-input paths (`git diff --name-only 3bf9240d42...HEAD`): None. The diff touches server `src`, server tests, docs, `GLOSSARY.md` and the ticket folder. No manifest, lockfile, tsconfig, workflow, contract package or new workspace import. The planned probe update edits one `.mjs` browser probe, which is not a build input. No fresh-start build case is needed.
- Required environment variables or secrets available: N/A. No provider key is planned. Runs use the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`), the fake Grok ACP fixture, and LM Studio for the embedded desktop node (no key).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing rules | Layers and commands; E2E with a clean env (`env -i PATH HOME=<resolved temp> TMPDIR`); one heavy run at a time; never the user's app, data or node containers; test-owned Docker container on `127.0.0.1` with fresh volumes and the worktree `dist` mounted read-only over `/opt/autobyteus/server-package/dist` after checking that the image `dist` differs only in the changed files; isolated desktop instance with `pnpm --silent isolated-app start --build`; local models one at a time, unloaded after |
| `docs/isolated-app-instances.md` | Isolated desktop instance | `start --build`/`stop <id>`; control port = CDP on loopback; the embedded server gets a baseline env only |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (header) | Phone shell probe | Needs `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`; `--output-dir`, `--cases`, `--hold` |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` (header) | Two-node remote collaboration probe | Needs the server build; about 3 minutes |
| `autobyteus-web/tests/e2e/vnc-live-probe.mjs` (header) | VNC through `/ws/node-desktop` | Web app at `--base-url` bound to a labelled test container |
| `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md` | Phone/remote access contract | Pairing: `PUT /rest/remote-access/settings`, `POST /rest/remote-access/pairing-sessions` (private-network URL; loopback URLs refused) |
| `autobyteus-ios/AutoByteusMobile/AutoByteusWebViewController.swift:62`, `autobyteus-android/.../AutoByteusWebView.kt:65` | Phone wrappers | Both load the node's `/mobile` URL straight into the WebView: same origin as the node, with no custom scheme and no local bundle |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Rebuilt from HEAD before the probes | `dist/app.js` fresh | Untracked output, kept |
| Phone bundle | worktree | `pnpm -C autobyteus-web build:mobile-web` | `autobyteus-web/dist/public` | `/mobile` serves `/mobile/_nuxt/` | Untracked output, kept |
| Probe stacks | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:<name> --output-dir=<fresh>` | Probe-owned servers, Nuxt dev, Chrome | Probe output | Probe `finally` + its cleanup receipt |
| Ticket probes (phone origins, attack, gateway) | `/tmp/abx403-api-e2e/` | `node <probe> …` (sources copied to the evidence folder) | Own servers on `127.0.0.1`, temp data roots, own TLS proxy (self-signed) | `/rest/health` | Probe kills its children, removes temp roots |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build` | Builds `autobyteus-web/electron-dist`; own data root and ports | `start` JSON (`ok`) | `pnpm --silent isolated-app stop <id>`; `list` shows none of mine |
| Test-owned Docker node | worktree | `docker run -d --name abx403-api-e2e-node --label com.autobyteus.api-e2e-owner=abx403 -p 127.0.0.1:<port>:8000 -v <dist>:/opt/autobyteus/server-package/dist:ro …` with fresh named volumes | Image `autobyteus/autobyteus-server:beta` (1.5.12-beta.5); never the user's `autobyteus-server-*` or `abx407-*` containers | `/rest/health` | `docker rm -f -v` + remove its volumes |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agents, Teams, Orgs, delegated and remote runs, workspace files | The probes' public GraphQL/REST/WS setup; scripted AGY CLI | Probe-owned temp data roots | Removed by the probe |
| Paired phone credential | Phone Access settings + pairing session (REST), then the phone's own pairing screen | Test-owned node only; credentials redacted in evidence | Node data root removed |
| Desktop app data | Isolated instance data root | Never `~/.autobyteus` | Removed by `stop` |
| Application package | `applications/brief-studio/dist/importable-package` imported as a local package into the isolated instance | Read-only source | Removed with the data root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/remote-access/request-origin.test.ts` (new) | REQ-002 table | REQ-002, AC-002 | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/unit/remote-access/route-policy.test.ts` | Phone route allow/refuse, peer WS refusal | REQ-004, AC-004/005 | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` (new) | AC-001…AC-006 over real upgrades | REQ-001…005, REQ-007 | Still Valid | IMP-04 | Reuse |
| `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts` | MCP gateway rule and studio CORS headers | BEH-002 preserved, AR-001 | Still Valid | IMP-05 | Reuse |
| `tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`, `tests/e2e/node-desktop`, `tests/e2e/terminal`, `tests/e2e/file-explorer`, `tests/e2e/update-notifications` | Existing WS routes through the new adapter | BEH-004…008 server side | Still Valid | IMP-06, IMP-07 | Reuse |
| Rest of `autobyteus-server-ts/tests/e2e/` | Server journeys over real HTTP/GraphQL/WS; every request crosses the new gate | Regression, QR-003 | Still Valid (unverified on this commit) | Not run by implementation | Run the whole suite (API-01) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Phone shell journeys against real alpha/beta nodes | AC-008, AC-009 (MSP-06) | Needs Update | Its harness rewrites the phone's URL with `route.fetch({ url })`, which forwards the browser's `Origin: http://192.168.77.10:<port>` with `Host: 127.0.0.1:<port>` (API-00). The new gate refuses that, although a real phone keeps the Host it addressed | Forward the phone's Host (and, on the WebSocket leg, the phone's Origin and Host) as a real LAN path does (API-03) |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs`, `large-runs-load-less-cases.mjs` | Phone views via the same rewrite | — | Still Valid | The phone page loads from the Nuxt dev origin `http://127.0.0.1:<port>` (loopback, allowed); only the API host is rewritten | None |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` | Remote runs observed across two nodes | AC-009 | Still Valid | Desktop shell at a loopback origin; peers send no Origin | Run (API-05) |
| `autobyteus-web/tests/e2e/vnc-live-probe.mjs` | VNC Viewer through `/ws/node-desktop` | AC-007 (VNC) | Out Of Scope as a runner | It drives a Nuxt web app, not the desktop app; AC-007 needs the desktop renderer | VNC checked in the desktop instance journey instead (API-08) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-01…IMP-08 | AC-001…AC-006, REQ-007, regression | Server typecheck, unit, studio e2e, WS route suites, base reproduction | Reused | IMP-01…IMP-08 | They ran on `88a93aaf26`, which is the current source. `git diff --name-only 88a93aaf26 HEAD` lists only ticket files. Each log has a header and an exact result line |
| API-00 | Harness fidelity (SCN-A02) | Playwright `route.fetch` headers | Temporary Probe | `node probe.mjs <web>`: a header-logging server behind the probe's URL rewrite, with and without forwarding Host | Measures why the mobile-shell probe needs updating; a one-off measurement |
| API-01 | Regression, QR-003 | Every server E2E suite through the new gate | Existing Test | `env -i PATH HOME=<resolved temp> TMPDIR pnpm test:e2e` | The implementation did not run the whole suite; every request crosses the gate |
| API-02 | AC-008 (harness) | Mobile-shell probe before the update | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-01 --output-dir=<fresh>` on HEAD | Shows the probe failing for the harness reason before the fix |
| API-03 | AC-008, AC-009, REQ-006 | Phone shell, LAN shape, with alpha/beta (all MSP cases) | Durable (updated) | Same probe, all cases, after the update; then a grep of the alpha/beta logs for `Remote Access request refused` / `Remote Access WebSocket rejected` | Durable regression of the phone journeys under the new gate |
| API-04 | AC-008, ASM-001, ASM-002, SCN-004, SCN-009 | Phone shell on the browser's own network stack: LAN shape (Chrome host mapping, Host/Origin `192.168.77.10:<port>`) and Tailscale-Serve-shaped HTTPS proxy (Host preserved, `X-Forwarded-Host/Proto/For`); Chrome and WebKit | Temporary Probe | `node abx403-phone-origins-probe.mjs` against the mobile-shell probe's `--hold` stack: pair; run list; open an agent, a Team and an Org run; delegated tree; Files; New run; WS handshake origins recorded; node log grep | The durable probe's phone leg is forwarded by Playwright. This journey checks the real browser's Origin and Host on both product paths, which needs a TLS proxy and host mapping that the durable probe does not own. It is temporary because it depends on the hold stack and a self-signed proxy |
| API-05 | AC-009, SCN-006, SCN-007 | Two nodes collaborating; the desktop shell at a loopback origin | Existing Test | `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree --output-dir=<fresh>` + a grep of both logs | Peer REST and `/rest/remote/run-observations` between real nodes |
| API-06 | AC-001, AC-003, SCN-001/002/A01, REQ-005 | A real Chrome page at a foreign origin (`http://evil.example:<port>`) and a sandboxed `null` iframe against a real node | Temporary Probe | `node abx403-browser-attack-probe.mjs`: WS to `/ws/terminal/<id>`, `/ws/projects`, `/graphql`, `/rest/remote/run-observations`; preflighted and simple POST `/graphql` (a mutation that would create an agent definition); then the node's state (no definition created, no terminal session) and its log lines | IMP-04 sets the Origin itself with a `ws` client; this checks a browser's real requests, including the simple POST that skips preflight |
| API-07 | REQ-002b/e, SCN-009, DEC-005 | Host-rewriting HTTPS gateway (no X-Forwarded-Host) with and without `AUTOBYTEUS_ALLOWED_ORIGINS` | Temporary Probe | Same probe file, gateway part: page at `https://gw.example.test:<port>` → POST `/graphql` + WS `/ws/projects`; node restarted with the setting | The setting is the safety valve for a gateway that rewrites Host |
| API-08 | AC-007, SCN-003, SCN-008, ASM-001 | Packaged desktop app (`file://` renderer) built from the branch; embedded node + test-owned Docker node with the worktree `dist` | Journey | `pnpm --silent isolated-app start --build`; register the Docker node; on each node: terminal, file explorer, run streaming; VNC Viewer on the Docker node; Brief Studio app iframe on the embedded node; renderer WS handshake origins via CDP; node logs grep | AC-007 requires the real desktop app |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None. AC-001…AC-006 already have durable server coverage (IMP-02, IMP-04). The real-browser checks (API-04, API-06, API-07) depend on a self-signed TLS proxy, browser host mapping and the hold stack, so they stay temporary and their sources are kept in the evidence folder.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-03 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`openPhone`) | HTTP leg: forward the phone's own `Host` (`192.168.77.10:<alpha port>`) with the rewritten URL, as a real LAN path does. WebSocket leg: send the phone's `Origin` and `Host` on the upstream handshake, so the probe exercises the Origin gate on the phone's sockets instead of an Origin-less socket. Header comment updated | Test-only. A real phone keeps the Host it addressed; before this change the node never read Origin, so the rewrite never mattered |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42, packaged renderer at `file://…/renderer/index.html`
- Testing guideline, README, or development instructions used: `TESTING.md` (Isolated desktop instance, Docker server nodes), `docs/isolated-app-instances.md`
- Web-equivalent behavior: the renderer's HTTP/WS calls to its nodes
- Shell-specific or lifecycle behavior: the `file://` origin the packaged shell gives the renderer's WebSockets, and the Origin-less fetch. The Electron dev renderer (`http://localhost:3000`) is the loopback class that the Nuxt-dev probes exercise (API-03, API-05); Electron dev itself is not run (see Not Tested)
- Chosen validation approach and why it fits the project: an isolated worktree build, driven over its CDP control port with playwright-core `connectOverCDP`. The renderer's WebSocket handshake headers are recorded through a CDP session
- Server/frontend setup when browser validation is used: N/A (the real app)
- How the run avoids disturbing an already-running desktop application: its own data root, ports and process group; `stop <instanceId>` ends only its own group. The Docker node is a new test-owned container; the user's `autobyteus-server-*` and `abx407-phone-node` containers are not touched

## Live Environment And Fixture Plan

- Startup order and commands: server build → phone bundle → API-01 → API-02 → probe update → API-03 → hold stack + API-04 → API-05 → API-06/07 → desktop build + Docker node + API-08. One heavy run at a time
- Environment choices that materially affect the run: `127.0.0.1` binds only; the LAN shape uses Chrome `--host-resolver-rules` (measured: Host and Origin stay `192.168.77.10:<port>` on HTTP and WS); a Tailscale-shaped TLS proxy at `https://alpha.tail-probe.ts.net:<port>` (self-signed, `--ignore-certificate-errors`)
- Health / readiness checks: `/rest/health`; `/mobile` serves the bundle
- Seed data / fixtures: the mobile-shell probe's setup (agents, Team, Orgs, delegated, remote runs, workspace files)
- Test identities, authentication, permissions, or session state: phones paired through Phone Access on test-owned nodes
- Requirement-linked journeys or scenarios: above
- Evidence to capture: probe JSON and logs, server logs, WS handshake origins, DOM assertions, screenshots
- Owned processes and temporary state to clean up: probe stacks, the hold stack, the ticket probes' nodes and proxies, the isolated instance, the Docker container and its volumes, `/tmp/abx403-api-e2e`

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A real Tailscale Serve node on the user's tailnet | Needs the user's tailnet; the proxy shape is emulated from Tailscale's `serve.go` (Host preserved, X-Forwarded-*) | Low | Yes | Delivery may ask the user |
| The iOS/Android wrapper apps on a device | Both load the node URL into a WebView (code, above); WebKit (WKWebView's engine) and Chrome are run in API-04 | Low | Yes (device) | — |
| Electron dev (`pnpm dev` of the desktop shell) | Renderer origin `http://localhost:3000` is the loopback class (REQ-002d), exercised by the Nuxt-dev probes. Running Electron dev here would start a non-isolated embedded server | Low | No | — |

## Ambiguities Or Reroute Triggers

None so far. Any legitimate client found sending an Origin outside REQ-002, or a phone flow needing another WS route, is a `Requirement Gap` (the design's escalation trigger).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (update `mobile-shell-probe.mjs`)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: The probe update is test-only (commit `14e3681cdc`). On the reviewed route it goes to the code reviewer for test-code review with the result. Executed as planned. The deviations (WebKit v2248 installed, the instance's own `.env` for the scripted runtime and applications, the full server package in the Docker node) are listed in the execution report's Round section. API-01 found four base E2E failures outside this change (FU-004).
