# API/E2E Coverage Investigation

Ticket: autobyteus-416, `node-web-page-and-file-security`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/`.
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security`, branch `codex/node-web-page-and-file-security`, base `origin/personal` @ `6225a734a3`. Source under validation: `da207045a5`. Every later commit (`3e870866d5`, `fa59313c67`) changes only `tickets/` (`git diff --name-only da207045a5 HEAD` outside `tickets/`: empty).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001; DEC-001 = A, DEC-002 = A)
- Investigation Notes: `investigation-notes.md` (route inventory F1–F16)
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-003)
- Design Spec (required on every route): `design-spec.md` (SR-003, `Ready`)
- Supplemental Task Artifacts: `probes/reproduce-416.sh`, `probes/d6-file-origin-forms-probe.js`, `probes/d6-http-page-control-probe.js`, `evidence/SR-003-*`, `evidence/A1-*`, `evidence/R4-*`
- Design Review Report: `design-review-report.md` (ARCH-REV-002, `Pass`)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review CRR-001 `Pass` (code reviewer, 2026-11-07)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

Four ways reach a node with the app's rights, and all four must be closed:

1. DNS rebinding: the Host gate refuses any Host that is not one of the node's names (REQ-001…003, REQ-006).
2. Localhost pages: a loopback Origin is accepted only when it is listed (REQ-004).
3. User files: F1–F15 send `CSP: sandbox allow-scripts` and `nosniff` (REQ-007).
4. `file://` pages in the in-app browser: their requests carry `Origin: null` (REQ-009, design D6).

Every supported client must keep working: the desktop app, the phone, peers, Docker nodes, launchers, viewers, and an agent-started server (REQ-005, REQ-008, AC-011…AC-013).

The implementation's repository checks (IMP-01…IMP-13) already prove AC-001, AC-002, AC-003, AC-005, AC-007 and the D6 mechanism (AC-010) on `da207045a5`. Real HTTP/WS e2e, the real-Electron spec and negative controls are among them.

The handoff and the code review leave these to API/E2E:

- AC-004 (`/mobile` through a ts.net-shaped Host and a company `AUTOBYTEUS_SERVER_HOST`);
- AC-006 (Electron dev, dev stack, the probes);
- AC-008, AC-009, AC-010 and the AR-002 check on the desktop;
- AC-011 (packaged app, Docker, remote by IP/`.local`);
- AC-012 (`host.docker.internal`, `.local`, and a public name refused with the hint);
- AC-013 (an agent-started localhost server in the in-app browser).

AC-014 is a docs review: the docs exist, and the release note is delivery's.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-009.
- Real-use scenarios added from the implemented behavior:
  - SCN-A1: a refused rebinding WebSocket upgrade releases its socket (code review SCN-R1). Its real trigger is a rebinding page opening a WS. It is covered by the e2e assertion of 0 open connections (IMP-07, reused).
  - SCN-A2: a phone pairs through a company address that the node does not have in `AUTOBYTEUS_SERVER_HOST`. The host is then allowed only as the open pairing session's host and, afterwards, as the paired phone's host. Its real trigger is the desktop's Phone Access pairing with a chosen server URL. It runs as part of API-06.
  - SCN-A3: a `no-cors` "simple" POST from a `file://` page, the form a hostile local page uses to make a state change without reading the answer. Its real trigger is a local HTML file opened in the in-app browser. It runs in API-08: the node must refuse it before GraphQL runs, so no state changes.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Host gate | Added | D1, D2, D9; IMP-02/03/07 | Reuse e2e; real proxies and peers by name (API-03…API-06) |
| BEH-002 loopback Origin rule | Changed | D3, D4; IMP-02/06/07 | Reuse; the in-app browser's localhost page (API-11) |
| BEH-003 user-file reply | Changed | D5; IMP-03/04/12 | Reuse; top-level HTML and PDF in Electron (API-09, API-10) |
| BEH-004 `file://` pages in the in-app browser | Added | D6; IMP-09/10/12 | Real packaged app with its embedded node (API-08) |
| BEH-005…007 desktop, phone, peers | Preserved | D2 classes | API-02…API-07, API-12 |
| BEH-008 launchers | Changed | D7; IMP-09/11/13 | Electron dev (API-13), dev stack (API-14), probe sweep (API-15) |
| BEH-009/010 viewers, agent-started server | Preserved | D5, D6 | API-10, API-11, search-pdf-preview in API-15 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Host rule, origin rules, pairing-host read | Unit (IMP-03) | — | — |
| API / transport / contract | Yes | Every request and upgrade; 3 more listeners; F1–F15 headers | e2e real HTTP/WS (IMP-07), integration (IMP-06), reproduction (IMP-02) | Real proxies and real peers by name; Docker networking | Live API with proxies, two nodes, Docker |
| Frontend component / state | No | — | — | Viewers rendering under the new headers | Browser probe + desktop |
| Browser integration / user journey | Yes | Browser Host/Origin through proxies; sandboxed documents | None in a real browser except IMP-13 | Phone shell through ts.net/company hosts | Browser (Chrome, WebKit) |
| Authentication / session / permissions | Yes | Paired-phone host as allowed host | e2e paired-phone WS (IMP-07) | Real pairing through a company address | Browser |
| Desktop renderer / web-equivalent UI | Yes | Packaged `file://` renderer, dev renderer at `http://localhost:3000` | Electron env tests (IMP-09) | Real renderer against its embedded node | Isolated desktop instance; Electron dev |
| Desktop shell / Electron-specific integration | Yes | In-app browser session `onBeforeSendHeaders` | Real-Electron spec on a bare partition (IMP-10) | The product's in-app browser in the packaged app, with its embedded node and popups | Isolated desktop instance |
| Process / lifecycle | Yes | Upgrade socket cleanup; launcher env | IMP-07 (0 open sockets), IMP-11 | — | — |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | Yes | Peer HTTP and run-observation WS between nodes | Two-node e2e by IP (IMP-07) | By `host.docker.internal`, `.local`, public name | Two nodes + Docker |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security`
- Project type and runtime stack: pnpm monorepo. The node is a Fastify server (`autobyteus-server-ts`). The app is Nuxt plus Electron 42.11.16 (`autobyteus-web`). Node v22, macOS (Darwin 25.5.0, arm64).
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` exists in `autobyteus-server-ts/` or `autobyteus-web/`.
- Conflicting, missing, or unclear project instructions:
  - Electron development mode has no documented launch command: `autobyteus-web/package.json` has no `dev:electron` script.
  - Derived path: `electron-is-dev` is true when the app is unpacked. `electronApplication.getStartUrl()` uses `VITE_DEV_SERVER_URL` or `http://localhost:3000`. The macOS server manager runs `autobyteus-web/resources/server` in dev.
  - The resulting run: the packaged build's `prepare-server` and `transpile-electron` outputs, `electron .` from `autobyteus-web`, the `e2e` launch profile (`AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, own `AUTOBYTEUS_ELECTRON_DATA_ROOT`, own `AUTOBYTEUS_ELECTRON_SERVER_PORT`) so no user data is touched, and `nuxt dev` on port 3000.
- Changed build-input paths: `scripts/development/development-runtime.mjs` and `scripts/development/run-dev.test.mjs` match the guideline's `scripts/**`.
  - `scripts/development/` is the dev launcher (`pnpm dev`). No release workflow runs it: `release-desktop.yml` and `release-server-docker.yml` call `autobyteus-web` and server scripts, not `scripts/development`.
  - The packaged desktop build does run in this round (API-07, `build:electron:mac` through `isolated-app start --build`), and it exercises the web typecheck, guards and packaging.
  - A fresh-clone build is planned as API-16, because the `scripts/**` pattern matches.
- Required environment variables or secrets available: N/A. No provider is called; runtimes are the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, isolation, Docker, probes, rules | Isolated instance `pnpm --silent isolated-app start --build`. Stop what you start. Test-owned Docker containers only, with the worktree `dist` mounted read-only. Clean env for e2e. One heavy run at a time. Probes need a fresh `--output-dir`. |
| `docs/isolated-app-instances.md` | Instance lifecycle and control | `start` reports `instanceId`, `controlPort`, `serverPort`, `logPath`. CDP on loopback. The in-app browser is its own web contents, controlled only when listed as a target. |
| `autobyteus-web/docs/electron_packaging.md`, `electron/launch-profile/electronLaunchProfile.ts` | `e2e` launch profile | `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE`, `AUTOBYTEUS_ELECTRON_SERVER_PORT`, `AUTOBYTEUS_ELECTRON_DATA_ROOT` |
| `scripts/development/development-runtime.mjs` | Dev stack | Backend `127.0.0.1:8000`, frontend `:3000`. Data root `<worktree>/.autobyteus/development` (worktree-owned). Launcher-owned `AUTOBYTEUS_ALLOWED_ORIGINS`. |
| `autobyteus-web/tests/e2e/*-probe.mjs` headers | Each probe's command, prerequisites and cases | `pnpm -C autobyteus-web test:e2e:<name> --output-dir=<fresh>`; prerequisite `pnpm -C autobyteus-server-ts build` |
| `tickets/done/websocket-origin-and-phone-route-guard/evidence/api-e2e/probes/abx403-phone-origins-probe.mjs` | 403's AC-008 phone probe (ts.net-shaped TLS proxy, Chrome host mapping, WebKit via CONNECT) on the mobile-shell `--hold` stack | Reused as the base of API-05 |
| `autobyteus-web/preload` `openBrowserTab` (`electron/preload.ts:58`) | The app's own path for opening a URL in the in-app browser (the UI address bar and attachment opens use it) | Called from the main window over CDP to open the test pages |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | needed by probes and Docker mounts | `dist/app.js` newer than the source | — |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build` | packaged worktree build; own ports and data root | `start` JSON `ok:true`; `/rest/health` | `pnpm --silent isolated-app stop <instanceId>`; `list` shows none of ours |
| Test-owned Docker node | worktree | `docker run -d --name api416-… -p 127.0.0.1:<p>:8000 -v <dist>:/opt/autobyteus/server-package/dist:ro autobyteus/autobyteus-server:beta` (as the nodes-docker-address probe does) | never the user's `autobyteus-server-*` containers | `/rest/health` | `docker rm -f -v <name>` |
| Host test nodes | worktree | `node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>` with a clean env | own HOME and data roots | `/rest/health` | SIGTERM; temp roots removed |
| Electron dev | `autobyteus-web` | `nuxt dev --port 3000` plus `electron .` with the `e2e` profile | port 3000 checked free | renderer loaded; embedded `/rest/health` | kill both process groups; data root removed |
| Dev stack | worktree | `pnpm dev` | ports 8000/3000 checked free; worktree-owned data root | backend health; frontend 200 | Ctrl+C (SIGINT) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Workspace with HTML/SVG/PDF/Excel/image/video/audio/Markdown/text files | GraphQL `createWorkspace` on the instance's node, over a temp folder | Temp folder owned by the run | removed after the run |
| Uploaded media PDF (F3) | the node's upload REST route | instance data root | removed with the instance |
| `file://` attack page, localhost test server | files and a Node HTTP server written by this run (`probes/api-*`) | loopback only | removed / stopped |
| Paired phone | Phone Access REST (`/rest/remote-access/pairing-sessions`) on probe-owned nodes | probe data roots | removed by the probes |
| Peer names | `normys-macbook-pro.local` (mDNS → 127.0.0.1), `host.docker.internal`, `lvh.me` (public DNS → 127.0.0.1, a public name outside every class) | resolution checked with `dscacheutil` | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` (416 cases) | Host refusal on every form and WS family, 0 open sockets, classes, settings, warnings, localhost origins | AC-001…AC-003, AC-005, QR-001 | Still Valid | IMP-07 on `da207045a5` | Reuse |
| `tests/unit/remote-access/{request-host,node-browser-access,paired-phone-host,remote-access-host-gate}.test.ts`, `tests/unit/api/rest/{user-file-reply,user-file-routes}.test.ts` | Rule and per-route headers F1–F15 | AC-002, AC-003, AC-007 | Still Valid | IMP-03 | Reuse |
| `tests/architecture/user-file-replies.test.ts` | No file route bypasses `sendUserFile` | REQ-007 | Still Valid | IMP-04, IMP-12 | Reuse |
| `tests/integration/{api/studio-server-http-contract,agent-tools/mcp/agent-tools-mcp-routes,api/rest/context-files}.integration.test.ts` | MCP gateway, internal listeners, context files | AC-005, AC-007 | Still Valid | IMP-06 | Reuse |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Two nodes by IP through capturing proxies | AC-012 (IP) | Still Valid | IMP-07 run 2 | Reuse. Its proxies set Host to `127.0.0.1`, so it does not prove names: API-02/03/04 do |
| `autobyteus-web/electron/browser/__tests__/browser-file-document-request{,.electron}.spec.ts`, `browser-session-profile.spec.ts` | D6 rule; real Electron forms and control rows | AC-010 mechanism, BEH-010 | Still Valid | IMP-09, IMP-10, IMP-12 | Reuse; the product in-app browser in API-08 |
| `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` etc. | Dev renderer origin appended to the embedded env | AC-006 | Still Valid | IMP-09 | Reuse; real Electron dev in API-13 |
| `scripts/development/run-dev.test.mjs` | Dev stack owns `AUTOBYTEUS_ALLOWED_ORIGINS` | AC-006 | Still Valid | IMP-11 | Reuse; real `pnpm dev` in API-14 |
| 40 changed browser probes (`autobyteus-web/tests/e2e/`) | Each lists its frontend origin | AC-006 | Still Valid (static audit below) | IMP-13 ran `remote-nodes-page` | Run a representative set (API-15) |
| `probes/reproduce-416.sh` | R1/R2 refused, R3 headers, R2d accepted | AC-001, AC-005, AC-007 | Still Valid | IMP-02 | Reuse |

Static audit of the probes (this round):

- Every `autobyteus-web/tests/e2e/*.mjs` that starts `dist/app.js` was listed, along with whether it serves a frontend and whether it sets `AUTOBYTEUS_ALLOWED_ORIGINS`. All 39 that start a node and a frontend set it.
- The five that start a node without one need none:
  - `electron-launch-profile-probe` and `isolated-app-lifecycle-probe`: packaged `file://` renderer;
  - `run-history-read-budget-probe`: no browser;
  - `run-expand-motion-live-cases` and `workspace-views-chooser-cases`: case modules run inside `delegated-launch-defaults-probe`, which sets it.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | AC-001, AC-002, AC-003, AC-005, AC-007, AC-010 (mechanism), AC-006 (env, dev-stack test, one probe), AC-012 (IP), QR-001 | Server gate, routes, Electron main | Reused | IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10, IMP-11, IMP-12, IMP-13 | Each ran on `da207045a5`, the commit under validation. Its evidence has a header and the line to look for |
| API-01 | — (prerequisite) | Server build | Existing Test | `pnpm -C autobyteus-server-ts build` | The probes, Docker mounts and the isolated build need a current `dist` |
| API-02 | AC-011 (Docker at `127.0.0.1:<p>`), AC-012 (`host.docker.internal`), AC-006 (probe, Docker shape) | Two nodes, one in a test-owned container; browser on each | Existing Test | `pnpm -C autobyteus-web test:e2e:nodes-docker-address --output-dir=<fresh>` | A changed probe that already drives these names |
| API-03 | AC-012 (`.local`), AC-006 | Two nodes registered by `normys-macbook-pro.local`; remote delegation; run observation; browser | Temporary Probe | `remote-runs-in-tree-probe.mjs` copied to `probes/api-03-remote-runs-by-peer-name.mjs`, with the peer registration URL host taken from `PEER_HOST` | The repository probe hard-codes `127.0.0.1`. A durable host parameter is not needed beyond this check |
| API-04 | AC-012 (public name refused with the hint; accepted when configured) | Two nodes; peer registration over HTTP | Temporary Probe | `probes/api-04-peer-public-name.mjs`: alpha adds beta at `http://lvh.me:<p>` and is refused; beta's log must have the hint line; beta restarts with `AUTOBYTEUS_ALLOWED_HOSTS=lvh.me` and the add succeeds | The e2e covers the rule; this covers the peer path and the log as an owner sees it |
| API-05 | AC-004 (ts.net) | Phone shell in Chrome and WebKit through a Host-preserving TLS proxy, `Host: alpha.tail-probe.ts.net` | Temporary Probe | 403's `abx403-phone-origins-probe.mjs` adapted as `probes/api-05-phone-tailscale-probe.mjs` on `mobile-shell-probe.mjs --hold` | Re-proves 403's AC-008 under the Host gate |
| API-06 | AC-004 (company URL in `AUTOBYTEUS_SERVER_HOST`), SCN-A2 | Phone shell through a Host-preserving proxy at `https://node.corp-probe.example:<p>` | Temporary Probe | `probes/api-06-phone-company-host-probe.mjs`: a node with `AUTOBYTEUS_SERVER_HOST=https://node.corp-probe.example:<p>`; before pairing, `/mobile` 200 and `other.corp-probe.example` 403 + hint; pair; run list; open a run; send; WS 101 | No repository surface sets a company host |
| API-07 | AC-011 (packaged app + embedded node), AC-010 alternate (own renderer works) | Packaged worktree build | Journey | `pnpm --silent isolated-app start --build`; main window loads; GraphQL from the renderer works; node log has no refusal | The desktop surface the guideline names |
| API-08 | AC-010, AR-002, SCN-A3 | In-app browser of the packaged app → embedded node | Journey | Open `file:///…/api08-attack.html` with `openBrowserTab`. The page POSTs `/graphql` (fetch, `no-cors` simple POST), opens `/ws/terminal` and `/graphql` WS, from itself, an `about:blank` iframe, a `srcdoc` iframe and an `about:blank` popup, each tagged `?f=<form>`. Expect: page loads; node log `REMOTE_ACCESS_ORIGIN_REFUSED … origin null` per form; no state change. Then navigate the same tab to an F1 URL: it displays | Shell-specific; only the packaged app has the product partition, popups and embedded node together |
| API-09 | AC-009, AC-007 (in Electron) | In-app browser → F1 HTML file | Journey | Open the F1 URL of `x.html` top-level. Its script writes a marker (scripts run), reports `self.origin` (`null`), and POSTs `/graphql?f=api09`. Expect the node log refusal; response headers via CDP `Network` | — |
| API-10 | AC-008 | App viewers and top-level PDFs | Journey | In the instance: open PDF, Excel, image, video, audio, Markdown, text and HTML preview from the file explorer and assert each renders. Open the F1 PDF (attachment path) and an uploaded F3 PDF (media page) top-level in the in-app browser: the PDF viewer renders | — |
| API-11 | AC-013 | In-app browser → a localhost server started by the run | Journey | `probes/api-11-local-server.mjs` on `localhost:<p>`: the page loads, POSTs its own `/api/echo` (works), and POSTs the node's `/graphql?f=api11` (refused, `REMOTE_ACCESS_ORIGIN_REFUSED origin http://localhost:<p>`) | — |
| API-12 | AC-011 (Docker at `localhost:<p>`, remote by `.local`) | Desktop Nodes page → remote node windows | Journey | In the instance, add a test-owned Docker node at `http://localhost:<p>` and a host node at `http://normys-macbook-pro.local:<p>`; open each node's window; its data loads; no refusal lines | — |
| API-13 | AC-006 (Electron dev) | Unpacked Electron + `nuxt dev` at `http://localhost:3000` | Journey | As in Project Execution Discovery; the renderer's GraphQL and WS to its embedded node work; the embedded node's env lists the origin | — |
| API-14 | AC-006 (dev stack) | `pnpm dev` | Journey | `pnpm dev`; Chrome on `http://127.0.0.1:3000` and `http://localhost:3000`; app GraphQL and WS work; no refusal lines | — |
| API-15 | AC-006 (probes), AC-008 (web viewer PDF) | Representative changed probes, one per edit shape, plus the file-reading ones | Existing Test | `token-statistics-ui`, `composer-context-file-removal`, `search-pdf-preview`, `file-explorer-pending-save-draft` (origin inline); `embedding-settings`, `model-routing-settings`, `owner-scoped-file-reads`, `delegated-copies-large-hub` (port chosen before the node); `node-vocabulary` (LAN-address frontend), `remote-run-title`, `projects-feature` (multi-node). Each with a fresh `--output-dir` | Covers each shape. Live-provider probes are left out (they spend credits; their edit is the same one-line shape, checked statically) |
| API-16 | Fresh-start build rule (`scripts/**` matched) | Release build from a fresh clone | Existing Test | `git clone --no-local` at `da207045a5`, `pnpm install --frozen-lockfile`, then `build:electron:mac` as TESTING.md § Fresh-start build | Required by the build-input rule |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None. The repository e2e, unit, architecture and Electron specs already pin every rule. The broader cases need a packaged desktop app, Docker, mDNS names or a TLS proxy, which no repository suite runs. Their probes are kept in the ticket's `probes/` folder.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42.11.16, packaged `file://` renderer, in-app browser partition `persist:autobyteus-browser`.
- Testing guideline used: `TESTING.md` § Choosing the path (desktop-shell behavior → Electron main-process tests plus an isolated desktop instance); `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the viewers (also covered by the `search-pdf-preview` probe) and the phone shell (browser probes).
- Shell-specific behavior: the D6 session policy in the product in-app browser (`file://` pages, child frames, popups); top-level documents in the in-app browser; the packaged renderer against its embedded node; the remote node windows; the Electron dev renderer origin.
- Chosen approach: one packaged worktree build (`isolated-app start --build`) driven over its CDP control port with playwright-core `connectOverCDP`. Pages are opened in the in-app browser through the app's own `openBrowserTab`. In-app browser tabs are inspected as their own CDP targets. Results come from the pages' DOM and the embedded node's log.
- Server/frontend setup: none extra. The instance's embedded node is the target.
- How the run avoids disturbing the running desktop app: separate instance with its own ports, data root and process group. `stop` ends only its group. The user's AutoByteus and Docker nodes are never addressed.

## Live Environment And Fixture Plan

- Startup order: server build (API-01) → probes that need only `dist` (API-02…API-06, API-15), one at a time → isolated build and instance (API-07…API-12) → Electron dev (API-13) → dev stack (API-14) → fresh-clone build (API-16).
- Environment choices: clean env (`env -i PATH HOME=<tmp> TMPDIR`) for host nodes; no provider keys; scripted AGY CLI.
- Health / readiness: `/rest/health`; `isolated-app start` JSON.
- Seed data: GraphQL and REST only.
- Identities: Phone Access pairing on probe-owned nodes only.
- Evidence: probe JSON receipts, node log excerpts (refusal lines), CDP DOM results, screenshots as support.
- Cleanup: probes' receipts; `isolated-app stop` and `list`; `docker ps -a --filter name=api416`; temp roots.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A real Tailscale Serve and a real company reverse proxy | No tailnet or company domain owned by the run. The Host-preserving TLS proxy and browser host mapping send the same Host, Origin and `X-Forwarded-*` headers the real ones send | Low | Yes: the user's own tailnet and proxies | Delivery decides whether the user checks it |
| Real iOS/Android phone wrappers | WebKit (the WKWebView engine) through a CONNECT proxy stands in for the iOS wrapper; no device run | Low | Yes | — |
| Live-provider probes among the 40 | They spend provider credits. Their edit is the same one-line origin shape (static audit) | Low | No | — |
| Signing, notarization, other OS release builds | Need the release runner | Low (no build input of those steps changed) | No | — |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: temporary probes live in the ticket's `probes/` folder with an `api-` prefix.
