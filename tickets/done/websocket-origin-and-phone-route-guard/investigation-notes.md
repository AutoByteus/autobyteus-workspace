# Investigation Notes

## Investigation Meta

- Package identifier: `websocket-origin-and-phone-route-guard` (Project Task autobyteus-403)
- Request / ticket: autobyteus-403 — "Security: check Origin on every WebSocket route, and deny a paired phone's credential on routes the mobile product does not offer (start with the root terminal)"; FU-001 and FU-002 of autobyteus-394
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/websocket-origin-and-phone-route-guard`
- Resolved base remote / branch / revision: `origin/personal` @ `3bf9240d4229dc01012aa3bfd0819a971ab3b32a` (fetched 2026-11-06)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the refreshed base
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; 2026-11-06): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; design gate (2026-11-06): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `GLOSSARY.md`, `TESTING.md`
- Investigation status: requirements and architecture investigation complete

## Initial Request And Clarifications

- Original request: Task autobyteus-403 (PM `/project_task_manager`), with `follow-ups.md` of autobyteus-394 attached. User (2026-11-06): "yes. make them to be one ticket thanks".
- Clarifications received: none yet.
- User-supplied facts and constraints: do not break the desktop app, the phone's `/mobile` page (LAN, Tailscale Serve, paired credential), Docker nodes, remote nodes, remote collaboration; phone routes stay open (incl. `/ws/node-desktop` for S3, autobyteus-407); tests on isolated nodes; no secrets in logs; the user decides before a change could break a working setup; release only on the user's word.
- Initial ambiguity: which origins count as "the node's own" behind proxies; what the Electron renderer sends; which WebSocket routes the phone uses; whether cross-origin HTTP is part of the threat.

## Product And Domain Understanding

- Product area: node server Remote Access policy (`autobyteus-server-ts/src/api/security`, `src/api/websocket`), the clients of a node.
- Affected actors or systems: desktop app (Electron renderer) on embedded, Docker and remote nodes; phone `/mobile` shell (browser, PWA, Android/iOS WebView wrappers); peer nodes (remote collaboration); application iframes; developers (Nuxt dev, e2e probes); attackers: a web page from another origin opened in a browser on a machine that can reach the node.
- Existing purpose: trusted private network model — a request without a phone credential is trusted (`trusted_network`, or `loopback`); a paired phone carries an `mra_…` credential (bearer on HTTP, `access_token` query on WebSocket).
- Terminology: *Origin* = the browser-set `Origin` header (scheme://host[:port], or `null`); *same origin* = Origin host equals the host the browser addressed.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-06 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Route classes and HTTP authorization | `/ws/*` and `/graphql` upgrade = `TRUSTED_NETWORK_WEBSOCKET`; without a credential → allowed (`trusted_network`/`loopback`); a mobile `access_token` → `authorizeMobileCredential`, no route restriction. `/rest/remote/*` = `REMOTE_PEER`. No Origin read anywhere. | — |
| 2026-11-06 | Code | `src/api/security/remote-access-policy-plugin.ts` | Where HTTP and upgrades are gated | `onRequest` hook authorizes every request except paths starting `/ws/`, which are deferred to the route handlers. `/graphql` upgrades and `/rest/remote/run-observations` upgrades go through the hook. | — |
| 2026-11-06 | Code | `src/api/websocket/remote-access-websocket-auth.ts` | Shared WS authorization | `authorizeRemoteAccessWebSocket(req)` reads only `access_token`; mobile credential → accepted on any route; close codes 4401/4403/4404; log line redacts URL (`redactSensitiveUrl`). | — |
| 2026-11-06 | Code | `grep "websocket: true" src` | All WS routes | Node server: `/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId`, `/ws/projects`, `/ws/update-notifications`, `/ws/agent-package-definitions`, `/ws/file-explorer…`, `/ws/terminal…`, `/ws/node-desktop`, `/ws/applications/:id/backend/notifications`, `/ws/applications/:id/backend/routes…`, `/ws/applications/:id/agent-communication…`, `/rest/remote/run-observations` (peer), plus mercurius `/graphql` subscriptions. Separate standalone application server: `/_autobyteus/…` (3 routes). | — |
| 2026-11-06 | Code | `src/compositions/build-studio-server.ts:459-465` | CORS | `@fastify/cors` `{ origin: true }` (reflects any origin) for all methods. | Measured below |
| 2026-11-06 | Code | `src/standalone-application-host/api/standalone-browser-websocket-origin.ts` | Precedent | Standalone application server already requires Origin host == Host for its WS routes (requires Origin present). | Reuse the comparison idea; different allowed set on the node |
| 2026-11-06 | Code | `src/api/graphql/index.ts`, `grep @Subscription` | GraphQL WS | mercurius `subscription: true`; no `@Subscription` resolvers; GraphQL over WS can still carry queries/mutations. | — |
| 2026-11-06 | Code | `src/api/graphql/types/mcp-server.ts:66`, `mcp-server-config.ts:12,74,77,191` | Impact of cross-origin HTTP | `configureMcpServer(input)` accepts a `stdio` transport with `command`/`args` → a GraphQL POST can register a command for the node to run. | Read only (not executed) |
| 2026-11-06 | Code | `src/remote-collaboration/channel/peer-run-observation-client.ts:20,59` | Peer WS client | Node global `WebSocket` to `<peer>/rest/remote/run-observations`. | Measured: no Origin |
| 2026-11-06 | Code | `autobyteus-web/electron/application/electronApplication.ts:105-123` | Renderer origin | Packaged renderer = `file://…/renderer/index.html`; dev = `VITE_DEV_SERVER_URL` or `http://localhost:3000`. | Measured |
| 2026-11-06 | Code | `autobyteus-web/electron/shell/workspace-shell-window.ts` | webPreferences | sandbox, contextIsolation, no webSecurity override, no header rewriting (`onBeforeSendHeaders` absent). | — |
| 2026-11-06 | Doc | `autobyteus-web/docs/remote_access.md` (lines 3, 12, 41, 117-118, 156-158, 166, 184) | Phone product contract | Phone shell served by the node under `/mobile`; Android/iOS wrappers load that URL in WebView; credential as `access_token` on WS; Terminal/VNC not phone surfaces; backend hard denial = "Phase Two". | — |
| 2026-11-06 | Code | `autobyteus-web/utils/mobileFeatureGates.ts` | Phone features | Supported: pairing, serverStatus, agentRuns, agentTeamRuns, runHistory, workspaceFiles, runArtifacts. Unsupported: terminal, vnc, desktopSettings, desktopUpdates, applicationIframe, projects (page), browser… | — |
| 2026-11-06 | Code | `autobyteus-web/utils/nodeEndpoints.ts:66-83`; consumers per endpoint (grep) | Which WS the phone opens | See "Phone WebSocket route use" below. | — |
| 2026-11-06 | Code | `autobyteus-web/app.vue:46-49` | App-wide feeds | `/ws/agent-package-definitions` opened app-wide (also on phone); `/ws/update-notifications` only where `desktopSettings` is available (not on phone). | — |
| 2026-11-06 | Code | `autobyteus-web/components/applications/ApplicationIframeHost.vue`, `utils/application/applicationLaunchDescriptor.ts:78`, `applicationHostTransport.ts` | App iframes | Iframe (no sandbox) loads `entryHtmlUrl` from the node; app SDK opens `/ws/applications/…` from inside it → node's own origin. | — |
| 2026-11-06 | Code | `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue:8,47-52` | Same-origin content | HTML preview iframe `sandbox="allow-scripts allow-same-origin"` with a `blob:` URL created by the renderer (inherits the renderer origin). | Follow-up FU-002 |
| 2026-11-06 | Code | `autobyteus-web/services/nodeCollaboration/directNodeApolloClient.ts` | Desktop → other node | Desktop renderer calls other nodes' GraphQL over HTTP directly (`file://` page; fetch sends no Origin, measured). Phone does not (connection sheet uses bound-node stores). | — |
| 2026-11-06 | Web | `https://raw.githubusercontent.com/tailscale/tailscale/main/ipn/ipnlocal/serve.go` (Rewrite, `addProxyForwardedHeaders`) | Tailscale Serve Host | For TCP backends `r.Out.Host = r.In.Host`; sets `X-Forwarded-Host` = incoming Host, `X-Forwarded-Proto: https` under TLS, `X-Forwarded-For`. | Phone Origin `https://x.ts.net` vs Host `x.ts.net` → same host |
| 2026-11-06 | Code | `autobyteus-server-ts/docker/docker-compose.yml`, `Dockerfile.monorepo` | Docker nodes | Server image serves backend and `/mobile` on one port (published 8001→8000). No separate web UI. `autobyteus-web/Dockerfile` + compose files are a stale template (nginx/`nuxt3-tailwindcss`), not a shipped surface. | — |
| 2026-11-06 | Code | `autobyteus-web/package.json` (`dev: nuxt dev --host 0.0.0.0`), `utils/browserServerConfig.ts` | Development / browser shell | Browser (non-Electron) desktop shell exists for development and e2e probes, pointed at a backend (default `localhost:8000`). | Loopback origins needed |
| 2026-11-06 | Code | `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts:56` | Other services | Message gateway has its own CORS `origin: true`; separate service, not investigated. | Follow-up FU-003 |
| 2026-11-06 | Code | `src/api/websocket/node-desktop.ts:40-90` | S3 dependency | `/ws/node-desktop` uses the shared WS policy; phone credential accepted today; S3 (autobyteus-407, worktree `node-desktop-on-phone`, requirements in progress) offers it to phones. | Keep on phone list |
| 2026-11-06 | Code | `tests/unit/remote-access/route-policy.test.ts`, `tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`, `tests/unit/api/websocket/node-desktop.test.ts` | Existing tests | Policy is tested with Fastify `inject`; no Origin cases exist. | Tests to extend |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract (security) | A browser opens a WebSocket to a node | Upgrade reaches the route; no Origin check; no credential → trusted network | Any web page from any origin can open any WS route incl. `/ws/terminal` (root shell in Docker nodes) | route-policy.ts:94-96,175-181; websocket-auth.ts:57-81 | Read (handshake acceptance follows from code; the probe measured that browsers send a foreign Origin which nothing reads) |
| BEH-002 | Contract (security) | A browser page sends HTTP to a node | CORS reflects any Origin; no credential → trusted network | A page from any origin can POST GraphQL (e.g. `configureMcpServer` with a stdio command) and read the response | build-studio-server.ts:459-462; cors probe | Measured (CORS), Read (mutation) |
| BEH-003 | Contract (security) | Paired phone credential on a WS route | `authorizeMobileCredential` accepts it on every WS route | Phone credential opens `/ws/terminal` though the phone UI hides Terminal | websocket-auth.ts:65-76; terminal.ts:154; remote_access.md:41,184 | Read |
| BEH-004 | User | Desktop app (packaged) uses its node(s) | Renderer `file://` → WS with `Origin: file://`, HTTP fetch without Origin; to embedded, Docker (localhost-published) and remote nodes | Works | electronApplication.ts:105-123; probe | Measured |
| BEH-005 | User | Phone `/mobile` (LAN HTTP, Tailscale Serve HTTPS, Docker published port; Android/iOS WebView) | Page served by the node → WS/HTTP same origin; WS carries `access_token` | Works | remote_access.md:3,156-166; Tailscale serve.go | Read + Web |
| BEH-006 | System | Peer node collaboration | Node A → node B `/rest/remote/*` HTTP and `/rest/remote/run-observations` WS, Node built-in WebSocket/fetch | Works; no Origin sent | peer-run-observation-client.ts; probe | Measured |
| BEH-007 | User | Application iframe in the desktop app | Iframe from node origin opens `/ws/applications/…` | Works (same origin) | ApplicationIframeHost.vue; applicationHostTransport.ts | Read |
| BEH-008 | Operational | Development / e2e probes | Browser shell at `http://localhost:3000` (or Electron dev) → backend on another loopback port | Works | package.json; nuxt.config.ts:71-83; electronApplication.ts:107 | Read |

## Phone WebSocket route use (from the mobile code)

| Route | Phone uses it? | Evidence |
| --- | --- | --- |
| `/ws/agent/:runId` | Yes — run screen conversation | `stores/agentRunStore.ts` (agentWs) |
| `/ws/agent-team/:teamRunId` | Yes — Team run opens its coordinator | `stores/agentTeamRunStore.ts` (teamWs) |
| `/ws/agent-org/:orgRunId` | Yes — Org run opens its first member | `services/agentOrgExecution/agentOrgStreamingService.ts` |
| `/ws/agent-collaboration/:runId` | Yes — delegated work tree | `services/agentCollaboration/agentRunCollaborationStreamingService.ts` |
| `/ws/projects` | Yes — task-agent rows show their Task (taskWorkerTaskStore retains the feed) | `stores/taskWorkerTaskStore.ts:5,28,124` |
| `/ws/agent-package-definitions` | Yes — app-wide | `app.vue:46` |
| `/ws/file-explorer` | Yes — phone Files view (`useMobileWorkspaceFileExplorer` → `useWorkspaceFileExplorer` → workspace store live actions) | `composables/mobile/useMobileWorkspaceFileExplorer.ts:52`; `stores/workspaceFileExplorerLiveActions.ts:80-108` |
| `/ws/node-desktop` | Offered to phones by S3 (autobyteus-407) | Task constraint; node-desktop.ts |
| `/ws/terminal` | No — `terminal` unsupported, TerminalPanel desktop-only | `mobileFeatureGates.ts`; remote_access.md:41 |
| `/ws/update-notifications` | No — gated by `desktopSettings` | `app.vue:48-49` |
| `/ws/applications/…` (3) | No — `applicationIframe` unsupported | `mobileFeatureGates.ts` (`/applications` → applicationIframe) |
| `/graphql` (WS) | No — no client opens it (no WS link; `graphqlWs` URL unused) | grep `graphqlWs` consumers |
| `/rest/remote/run-observations` | No — peer route; mobile credential already refused on `REMOTE_PEER` (bearer) | route-policy.ts:162-167 |

Static trace; confidence: High for the "No" rows (each is verified unused); the "Yes" rows are kept open, so an overlooked phone use of a "Yes" route cannot break. Validation should still drive the phone shell end to end.

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `api/security/remote-access-policy-plugin.ts` | Root `onRequest` gate; defers `/ws/*` | One place exists to see every request before routing | Can one hook cover every upgrade (incl. `/ws/*`) before the handler? Fastify hooks run for `@fastify/websocket` upgrades (the `/graphql` path relies on it) — verify 403 before upgrade |
| `api/websocket/remote-access-websocket-auth.ts` | Per-handler WS auth (close codes) | Phone route restriction needs the route identity | Route-aware phone check: where the allowed list lives |
| `api/security/remote-access-route-policy.ts` | Classification + HTTP auth | Phone restriction for `/graphql` WS is decided here | Keep one owner of the phone WS route list |
| `compositions/build-studio-server.ts` CORS | Reflects any origin | REQ-003 (if approved) | Replace `origin: true` with the shared rule |
| `standalone-application-host/.../standalone-browser-websocket-origin.ts` | Standalone server origin check | Out of scope (separate server, already checked) | Possible shared helper; not required |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- None (no persisted data, no payload formats).

### Structural Surfaces

- Security boundary of the node server: request gate (`onRequest`), WS shared auth, CORS registration.
- Close-code contract of WS refusals (4401/4403/4404) used by clients.
- Evidence paths: above.

### Potential Structural Impacts To Investigate

- API or external-contract change: new refusal (HTTP 403 on upgrade; 4403 on phone-refused routes); new optional server setting for extra origins.
- Persistence schema or invariant change: None.
- Security or privacy boundary change: Yes (the subject of the ticket).
- Concurrency or lifecycle change: None.
- Deployment, migration, ownership-boundary change: None expected; an env setting for extra origins.
- Confirmed absent, present, or unknown: Present: security boundary; absent: persistence.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Electron 42.4.1 loads `page.html` from `file://` (app's webPreferences) | Packaged desktop renderer | WS upgrade `Origin: file://`; JSON `fetch` POST sent **without** Origin | Measured | `file://` must be allowed on WS; HTTP from the desktop app is unaffected by an Origin rule | `evidence/origin-probe/` |
| Same page, sandboxed iframe (`allow-scripts`) | Attacker trick | WS `Origin: null` | Measured | `null` must be refused | same |
| Chrome (headless, current) loads the same file | A downloaded HTML file opened in Chrome | WS and fetch (incl. preflight) `Origin: null` | Measured | Accepting exactly `file://` does not admit Chrome local files | same |
| Node 22.23.1 built-in `WebSocket` | Peer node run observations | No Origin header | Measured | Absent Origin must stay allowed | same |
| Fastify + `@fastify/cors {origin:true}` inject, Origin `https://evil.example` | Cross-origin GraphQL POST | Preflight 204 with `Access-Control-Allow-Origin: https://evil.example`, allow-headers `content-type`; POST 200 with ACAO reflected | Measured | Any website can call and read GraphQL today | `evidence/origin-probe/cors-probe.mjs` |

- Temporary diagnostics: None in the worktree (probe ran in `/tmp/ws-origin-probe`, copied into `evidence/origin-probe/`).
- Reproduction for implementation to start from: the probe scripts above; implementation adds failing policy tests (Origin cases) first.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via Task autobyteus-403 | One ticket for FU-001 + FU-002; do not break working setups; user decides before a breaking change | Explicit | Preserved behavior list; Needs-user decisions | DEC-001 |
| autobyteus-394 follow-ups.md | Evidence and suggested direction | Team evidence | Verified and extended above | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Browser `Origin` on WebSocket handshakes | Fetch/WebSocket standards; Chromium | Browsers always send Origin on WS; scripts cannot set or remove it, nor set `Host`/`X-Forwarded-Host` | Probe; standard | — |
| Tailscale Serve reverse proxy | tailscale `ipn/ipnlocal/serve.go` (main) | Preserves Host; sets X-Forwarded-Host/Proto | Web source | Other proxies may rewrite Host → X-Forwarded-Host or configured origins |
| `@fastify/websocket` 11.x / Fastify 5 | package.json | Upgrade requests run through Fastify routing and root hooks | Existing `/graphql` rejection relies on it | Verify in design: reply in `onRequest` for `/ws/*` upgrade sends HTTP 403 and no socket opens |
| `@fastify/cors` | package.json | `origin` accepts a function | Docs | — |

## Persisted Data And State Facts

- Affected stored or external subject: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/origin-probe/` | Solution Designer | Measured Origin headers of real clients; CORS reflection | Evidence only | REQ-002, REQ-003 | Current | Not behavior-defining |
| `follow-ups.md` | Solution Designer | Findings outside this ticket | — | — | Current | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | DNS rebinding: a page at `http://evil.example:29695` whose name resolves to the node is "same origin" (Origin host == Host) | Bypasses a same-origin rule; needs a Host allowlist the node cannot derive safely today | Follow-up FU-001 | Open |
| RSK-002 | Risk | Content served at the node's own origin or the renderer's origin (HTML preview iframe, application bundles) passes an Origin rule by design | Same-origin content is trusted | Follow-up FU-002 (HTML preview) | Open |
| RSK-003 | Risk | Trusted-network model: a client that omits the phone credential is `trusted_network`/`loopback` and is not subject to phone-route limits (Tailscale Serve traffic arrives from loopback) | FU-002's refusal stops a phone credential, not a credential-less client on the trusted network; the Origin rule is what stops web pages | Documented product model (remote_access.md:113-118); told to the user | Accepted |
| RSK-004 | Risk | Unknown reverse proxy that rewrites Host and sets no X-Forwarded-Host | Its phone page would be refused | Configured extra origins (REQ-002e) | Mitigated by design |
| UNK-001 | Unknown | Safari's Origin for `file://` pages | If Safari sends `file://`, a downloaded HTML file opened in Safari passes | Low; residual, noted | Open |

## Requirement Implications

- Absent Origin and `file://` must be allowed (peers, native, packaged desktop); `null` refused (measured).
- Same-origin must compare host only (TLS terminates at Tailscale Serve; Host preserved).
- Every WS path incl. `/graphql` and `/rest/remote/run-observations` is reachable cross-origin today → one gate for every upgrade.
- Cross-origin HTTP is equally exploitable today (measured CORS reflection + stdio MCP mutation) → DEC-001 for the user.
- Phone WS allowlist derived from the mobile code; deny-by-default for later routes.

## Architecture Investigation Findings

| Date | Method | Source / Command | Observation | Established | Design use |
| --- | --- | --- | --- | --- | --- |
| 2026-11-06 | Command | `pnpm install --frozen-lockfile` in the worktree; versions: fastify 5.12.7, @fastify/websocket 11.3.4, @fastify/cors 11.3.1, mercurius 16.12.1, ws 8.22.0 | The main checkout's node_modules are older (fastify 4.29.1); probes use the worktree's | Measured | Probes run on the real dependency versions |
| 2026-11-06 | Probe | `node evidence/origin-probe/fastify-gate-probe.mjs <worktree>/autobyteus-server-ts` | Root `onRequest` 403 on a WS upgrade: handler not run, for `/ws/test` and for a WS route in a `/rest`-prefixed plugin; route registered before the hook still covered; CORS `delegator` with `origin:false` → no ACAO on preflight or POST; allowed dev origin → 204 + ACAO | Measured | One gate in the plugin; CORS delegator |
| 2026-11-06 | Probe | `node evidence/origin-probe/route-pattern-probe.mjs <worktree>/autobyteus-server-ts` | `request.routeOptions.url` = `/ws/terminal/:sessionId` in hook and handler; `/graphql` for the mercurius upgrade | Measured | Phone list keyed by route pattern |
| 2026-11-06 | Code | `remote-access-route-policy.ts:119-136,175-181`, `remote-access-websocket-auth.ts:40-81` | WS credential rule duplicated (context builder and query reader in both) | Read | Refactor: one `authorizeWebSocket` |
| 2026-11-06 | Code | grep `authorizeRemoteAccessWebSocket(` → 12 call sites, all `(req)` | `routeClass` parameter never passed | Read | Dead, removed |
| 2026-11-06 | Code | `src/api/websocket/*.ts` route strings | Patterns: `/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId`, `/ws/projects`, `/ws/update-notifications`, `/ws/agent-package-definitions`, `/ws/file-explorer/:workspaceId`, `/ws/terminal/:sessionId`, `/ws/node-desktop`, `/ws/applications/:applicationId/backend/notifications`, `/ws/applications/:applicationId/backend/routes/*`, `/ws/applications/:applicationId/agent-communication/*` | Read | Phone list |
| 2026-11-06 | Code | `src/config/app-config.ts:480-485`; `build-studio-server.ts` = 502 lines | Setting convention; composition already over 500 lines | Read | `AUTOBYTEUS_ALLOWED_ORIGINS`; composition only shrinks |
| 2026-11-06 | Code | `autobyteus-web/utils/remoteAccess/remoteAccessAuthFailure.ts` | Phone unpairs only on 401 / AUTH_REQUIRED / AUTH_INVALID | Read | New codes do not unpair |
| 2026-11-06 | Code (from ARCH-REV-001 AR-001, verified) | `src/mcp-gateway/mcp-gateway-routes.ts:65-89`, `mcp-gateway-http-helpers.ts:51-73`, `tests/integration/api/studio-server-http-contract.integration.test.ts:117-159` | `/mcp/gateway` has its own root `onRequest` origin rule (absent or loopback only), answers its preflight itself, registered before CORS (`build-studio-server.ts:458`); contract test pins it and the studio CORS headers on loopback MCP POSTs | Read | Kept as a narrower route-family rule before the gate |
| 2026-11-06 | Code (ARCH-REV-001 residual) | `@fastify/cors` 11.3.1 `index.js:95-127,163-166` | Delegator must be `(req, cb)` or Promise-returning; dynamic options keep `Vary: Origin` | Read | Callback-form delegator; contract test unchanged |
| 2026-11-06 | Code (ARCH-REV-001 AR-002) | `src/api/http-access-log-policy.ts:63-79`, `remote-access-policy-plugin.ts:17-27` | Gate replies to `authorizeHttpRequest` refusals without a reason log; access log has no reason and can be off | Read | Gate logs one line per refusal |
| 2026-11-06 | Doc | `autobyteus-server-ts/docs/features/remote_access.md` (Runtime Ownership, Route Policy, Mobile Credential Enforcement, Phase Two Boundary) | Server-side contract doc | Read | Docs to update |

## Notes For Architecture Design

- Map SCN-001…SCN-009; verify Fastify hook placement for `/ws/*` upgrades and reply semantics before the upgrade; keep one owner for allowed origins and one for the phone WS route list; keep close-code contract.
