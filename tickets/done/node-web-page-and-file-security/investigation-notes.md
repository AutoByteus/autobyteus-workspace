# Investigation Notes

## Investigation Meta

- Package identifier: `node-web-page-and-file-security` (Project Task autobyteus-416)
- Request / ticket: autobyteus-416, "Security round: DNS rebinding (Host check), loopback origins on any port, and node routes that serve user files as documents (one Task)". It merges FU-001 of autobyteus-403 and FU-001/FU-002 of autobyteus-417.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/node-web-page-and-file-security`
- Resolved base remote / branch / revision: `origin/personal` @ `6225a734a3a7e76e7d75f8d937fec78295b681f8` (fetched 2026-11-07)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the refreshed base; `pnpm install --frozen-lockfile`, server `prebuild` + `build` pass
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate, 2026-11-07): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `TESTING.md`; 403 and 417 archived requirements, investigation notes, follow-ups and receipts
- Investigation status: requirements investigation complete; the three findings and a fourth one of the same class reproduced or measured

## Initial Request And Clarifications

- Original request: Task autobyteus-416 from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), with the follow-ups of 403 and 417 attached. The user, 2026-11-07: "for 1, 2, 3 each one use one ticket, meaning merge the security ticket into one".
- Clarifications received (user, in this conversation, 2026-11-07):
  - "could you first tell me what securities issues this ticket try to solve?" Answered.
  - "anyways, the ticket will not break any functinality right?" Answered: normal setups keep working and are tested. A node reached through a real domain name it cannot recognise needs the name added once to a setting. The rule is his decision.
  - "continue with the ticket thanks".
- User-supplied facts and constraints (Task): do not break the desktop app, the phone shell, Docker nodes, remote collaboration, or the agent-started local server shown in the in-app browser. The user decides any rule that could stop a working setup: how a node's names are configured, and how far to limit localhost pages. Tests run on isolated nodes; no secrets in logs; no private data in tests; release only on the user's word.
- Initial ambiguity: which names a node is legitimately reached by; who legitimately sends a loopback Origin; every route that serves a user file; whether the viewers survive the headers.

## Product And Domain Understanding

- Product area: the node server's request gate (`autobyteus-server-ts/src/api/security`); the node's other listeners (`/mcp/gateway`, the agent-tools MCP and credential-proxy loopback listeners); the node's user-file routes (`src/api/rest`); the desktop's in-app browser (`autobyteus-web/electron/browser`).
- Affected actors: the desktop app and its embedded node; Docker and remote nodes; the phone shell (LAN, Tailscale Serve, wrappers); peer nodes; developers (dev stack, Electron dev, browser probes, e2e); attackers: any web page the user opens, any HTML/SVG file a user or agent opens.
- Trust model (unchanged): a request without a phone credential is trusted (`trusted_network`, `loopback`). The only barrier between a web page and the node's full rights (GraphQL, `/ws/terminal`, runs, MCP tools) is how the node recognises its own pages.
- Terms: *Host* is the name the browser addressed (a page cannot set it). *Origin* is the page's scheme://host[:port]. A browser sends **no Origin** on a same-origin GET (Fetch standard), so a page the node takes for its own can read files with plain GETs.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-07 | Code | `autobyteus-server-ts/src/api/security/remote-access-request-origin.ts:35-36,53-79` | The Origin rule | Allowed: no Origin; `file://`; Origin host == `Host` or `X-Forwarded-Host`; any loopback hostname on any port; configured exact origins. The Host value itself is never checked. | Issues 1, 2 |
| 2026-11-07 | Code | `src/api/security/remote-access-policy-plugin.ts:55-82` | The gate | One `onRequest` hook: Origin rule for every request and upgrade, then route authorization. CORS grants by the same rule. `AUTOBYTEUS_ALLOWED_ORIGINS` read once at start. | Host check belongs in this gate |
| 2026-11-07 | Code | `src/compositions/build-studio-server.ts:457-460` | Hook order | `registerMcpGatewayRoutes` (own `onRequest` hook) runs before the policy plugin; both hooks run for `/mcp/gateway` unless the first replies. | — |
| 2026-11-07 | Code | `src/mcp-gateway/mcp-gateway-http-helpers.ts:51-59`, `mcp-gateway-access.ts:30-60` | MCP gateway | Origin allowed when absent or any loopback hostname (any port). Without `AUTOBYTEUS_MCP_GATEWAY_TOKEN`: client address and Host must be loopback (rebinding-safe). | Issue 2 covers its loopback rule |
| 2026-11-07 | Code | `src/agent-tools/mcp/agent-tools-mcp-local-access.ts`; used by `agent-tools-mcp-host.ts:74` and `credential-proxy/credential-proxy-host.ts:67` | Internal listeners | `127.0.0.1:<random port>`; client and Host must be loopback; Origin absent or any loopback hostname. Agent-tools session ID = `agtrun_` + sha256(runId): derived, not secret. Credential proxy also needs a 256-bit run pass. | Issue 2 covers their loopback rule |
| 2026-11-07 | Code | `src/app.ts:18` (`0.0.0.0:8000` default); `autobyteus-web/shared/embeddedServerClientEndpoint.ts` (client `127.0.0.1:29695`) | Listener and port | The packaged embedded node uses a fixed, known port, which makes rebinding practical. | — |
| 2026-11-07 | Code | `src/remote-access/services/node-network-service.ts`, `network-interface-classifier.ts:46,57,104-108` | Names the node knows | Interface addresses; the Tailscale MagicDNS name from a reverse lookup of the tunnel address (`.ts.net`). In a container: none of these (`runsInContainer`). | Sources for the name allowlist |
| 2026-11-07 | Code | `src/remote-access/services/pairing-url-policy.ts:57-83` | Existing "private name" rule | `isTrustedPrivateHttpHost`: private IPs, dotless names, `.local`, `.lan`, `.home.arpa`. Local-only: `localhost`, `*.localhost`, `host.docker.internal`, loopback. | Reuse the classification |
| 2026-11-07 | Code | `src/remote-access/domain/models.ts:60-90` (pairing session `serverBaseUrl`, paired device `clientFacingBaseUrl`) | Names phones use | The node stores the URL each phone was paired with. | Automatic name source |
| 2026-11-07 | Code | `src/server-addressing/server-address-candidate-service.ts`; `src/config/app-config.ts:248-262` | Configured URL | `AUTOBYTEUS_SERVER_HOST` is required. Docker default `http://localhost:<port>`; company deployments set their public URL there (`docs/android_mobile_access.md:34`). | Automatic name source |
| 2026-11-07 | Code | `src/remote-collaboration/settings/peer-address-resolver.ts`, `domain/peer-node.ts` | Peer addressing | A peer is reached at the base URL the user entered: IP, `.local`, tailnet, `host.docker.internal`, a DNS name. Peer requests come from Node `fetch`/`WebSocket`: no Origin. | A peer by a public DNS name is the main breakage risk of issue 1 |
| 2026-11-07 | Code | `src/standalone-application-host/api/standalone-browser-websocket-origin.ts`; `config/standalone-application-host-config.ts:28-77` | Other product | The standalone application host listens on `127.0.0.1` by default and accepts a WebSocket whose Origin host == Host. The same rebinding weakness, but a separate product, not a node. | FU-001 |
| 2026-11-07 | Code | `autobyteus-web/electron/application/electronApplication.ts:105-123` | Renderer origin | Dev: `VITE_DEV_SERVER_URL` or `http://localhost:3000`; packaged: `file://…/renderer/index.html`. | Electron dev must state its origin |
| 2026-11-07 | Code | `autobyteus-web/electron/server/serverRuntimeEnv.ts:110-140`, `baseServerManager.ts:300-320` | Embedded node env | The main process composes the embedded server's env, with `runtimeOverrides`. | Place to pass the dev renderer origin |
| 2026-11-07 | Code | `scripts/development/development-runtime.mjs:18-23,255` | Dev stack | Frontend `127.0.0.1:3000`, backend `127.0.0.1:8000`, `APP_ENV=development`. | Dev stack must state its origin |
| 2026-11-07 | Code | `autobyteus-web/tests/e2e/*.mjs` (44 of 83 spawn `dist/app.js`), e.g. `chat-entry-live-probe.mjs:111-113,1286,1311` | Browser probes | Each probe owns a backend and a Nuxt dev frontend on random `127.0.0.1` ports; the frontend calls the backend cross-port. Most set `APP_ENV=development`; at least 5 set `APP_ENV=production` (`owner-scoped-file-reads-probe.mjs:121`, `delegated-copies-large-hub-probe.mjs:152`, `run-history-read-budget-probe.mjs:108`, …). | `APP_ENV` is not a reliable "development" marker |
| 2026-11-07 | Code | `autobyteus-application-devkit/src/development/studio-application-client.ts` | Devkit | Node `fetch` (no Origin); the app runs in the node's iframe (same origin). | Not a loopback-origin client |
| 2026-11-07 | Code | `src/api/rest/*.ts` (inventory below) | User-file routes | Most stream a user file with its own MIME type and no protective headers. | Issue 3 |
| 2026-11-07 | Code | `autobyteus-web/components/fileExplorer/viewers/*` | Viewers | PDF: `vue-pdf-embed` (pdf.js, fetches bytes). Excel: fetch. Image/video/audio: elements. HTML preview: the static route in a sandboxed iframe (417). | Headers must not break these |
| 2026-11-07 | Code | `autobyteus-web/utils/contextFiles/contextAttachmentPresentation.ts:180-196`; `pages/media.vue:215`; `components/conversation/segments/MediaSegment.vue:128` | Top-level opens | The app opens attachment URLs in the in-app browser (`openBrowserUrl`) or a new window; the media page opens "documents" with `window.open(file.url)`. | Top-level PDF must keep displaying |
| 2026-11-07 | Code | `autobyteus-web/electron/browser/browser-tab-navigation.ts:10-11`; `browser-session-profile.ts` (partition `persist:autobyteus-browser`, empty session policy) | In-app browser | Allows `http:`, `https:` and `file:` URLs, in its own session with no header policy. | Issue 4 (file:// pages) |
| 2026-11-07 | Web | [Vite CVE-2025-24010 advisory](https://db.fluidattacks.com/adv/npm/vite/CVE-2025-24010) | Practice | Vite added `server.allowedHosts`: `localhost`, `*.localhost` (and IP addresses) allowed by default, other names must be listed. | The same shape |
| 2026-11-07 | Web | [MCP TypeScript SDK transport options](https://ts.sdk.modelcontextprotocol.io/v2/interfaces/_modelcontextprotocol_server.server_streamableHttp.WebStandardStreamableHTTPServerTransportOptions.html); [CVE-2026-61568](https://corgea.com/advisories/vulnerabilities/CVE-2026-61568) | Practice | MCP servers defend rebinding with `allowedHosts`/`allowedOrigins`; a loopback-bound server without them was rated critical. | — |
| 2026-11-07 | Web | [Tailscale Funnel beta](https://tailscale.com/blog/tailscale-funnel-beta/), [Funnel docs](https://tailscale.com/kb/1223/tailscale-funnel) | `*.ts.net` safety | Outside a tailnet, `ts.net` names resolve only through Funnel, to Tailscale's relay servers, never to an address a user chooses. | `*.ts.net` cannot be rebound to a node |
| 2026-11-07 | Web | [Chromium 413851](https://groups.google.com/a/chromium.org/g/chromium-bugs/c/z5hA0H6LFws); [Atlassian KB](https://support.atlassian.com/jira/kb/pdf-attachments-fail-to-load-in-chrome-on-jira-data-center/) | PDF and CSP sandbox | A `sandbox` CSP on a PDF response can stop Chrome's viewer; Jira excludes `application/pdf` from its sandbox policy. | PDFs need their own treatment (design verifies) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract (security) | A page loaded from an attacker's name, then re-pointed at the node | The browser sends `Host` = attacker name. POST/WS carry `Origin` = same name, which equals Host. Same-origin GET carries no Origin. | Accepted: GraphQL POST 200; workspace file GET 200 | R1a, R1b | Reproduced (server boundary; browser header behavior per the Fetch standard) |
| BEH-002 | Contract (security) | A page served from any localhost port (e.g. an agent-started dev server in the in-app browser) | Origin `http://localhost:<p>` or `http://127.0.0.1:<p>` passes the main rule, the MCP gateway and the internal listeners | Full rights (GraphQL, WS incl. terminal, `/mcp/gateway`) | R2a, R2b, R2c (200) | Reproduced |
| BEH-003 | Contract (security) | A user file opened top-level from a node route | HTML/SVG served with its own type and no CSP or nosniff at the node's origin | Runs as a node page (same origin: full rights) | R3a, R3b (no CSP); R3d (417 route has the sandbox) | Reproduced (headers); a script run is the standard browser consequence |
| BEH-004 | Contract (security) | A local HTML file opened as `file://` in the in-app browser (by the user or an agent's browser tool) | Electron sends no Origin on fetch (POST included) and `Origin: file://` on WebSocket, the same as the packaged renderer | The node takes it for the desktop app: POSTs run, WebSockets (incl. `/ws/terminal`) open | R4 | Measured (Electron 42.11.16 probe); node acceptance follows from the rule (read) |
| BEH-005 | User | Packaged desktop app with embedded, Docker (`localhost:<port>`) and remote nodes | Renderer `file://`; fetch without Origin, WS `Origin: file://`; Host = the URL the user entered | Works | 403 BEH-004; electronApplication.ts | Measured in 403 |
| BEH-006 | User | Phone shell `/mobile` over LAN IP, `.local`, tailnet IP/name, Tailscale Serve (`*.ts.net`), company URL; Android/iOS wrappers | Same origin; Host = the paired URL's host | Works | 403 BEH-005; pairing-url-policy.ts | Read + Web |
| BEH-007 | System | Peer nodes | Node `fetch`/`WebSocket` to the peer base URL the user entered; no Origin | Works | 403 BEH-006; peer-address-resolver.ts | Measured in 403 |
| BEH-008 | Operational | Development and tests: dev stack (`127.0.0.1:3000` → `:8000`), Electron dev (`localhost:3000` → embedded), browser probes (random ports), server e2e | Cross-port loopback Origins pass rule (d) | Works | development-runtime.mjs; probes | Read |
| BEH-009 | User | In-app viewers: PDF, Excel, image, video, audio, Markdown, text, HTML preview; attachments and media-page documents opened top-level | Fetch or element loads; the HTML preview uses the static route (sandboxed, 417); top-level opens show the file | Works | viewers; contextAttachmentPresentation.ts | Read |
| BEH-010 | User | Agent-started local server shown in the in-app browser | The page loads from `http://localhost:<p>` and talks to its own server | Works | 417 user statement (2026-11-07) | Read |

## User-File Route Inventory (issue 3)

All are under `/rest`, behind the request gate (trusted-network rights; phone credential where the phone uses them).

| # | Route | Source | Headers today | Consumers |
| --- | --- | --- | --- | --- |
| F1 | `GET /workspaces/:workspaceId/content?path=` | `workspaces.ts:17-62` | own MIME only | viewers (fetch/elements), attachment opens |
| F2 | `GET /workspaces/:workspaceId/static/*` | `workspaces.ts:64-109` | own MIME + `CSP: sandbox allow-scripts` (417) | HTML preview iframe and its subresources |
| F3 | `GET /files/:category/:filename` (uploaded media) | `files.ts:7-41` | own MIME only | media page (`window.open` for documents), media segments |
| F4 | `GET /drafts/*` (composer draft attachments) | `context-files.ts:144-153`, `sendFile` :79-83 | own MIME only | composer attachments |
| F5–F8 | `GET /runs/:runId/context-files/:f`, `/team-runs/:t/agent-runs/:a/context-files/:f`, `/agent-org-runs/:o/agent-runs/:a/context-files/:f`, `/agent-collaborations/:h/agent-runs/:a/context-files/:f` | `context-files.ts:164-245` | own MIME only | sent-message attachments |
| F9–F12 | `GET …/file-change-content` for runs, team members, org members, collaboration members | `run-file-changes.ts:31-50,86-130` | own MIME (unknown → `text/plain`) | run file-change viewer |
| F13 | `GET /team-runs/:t/team-communication/messages/:m/references/:r/content` | `team-communication.ts:30-50` | own MIME + `no-store` | team message references |
| F14 | `GET /agent-org-runs/:o/…/references/:r/content` | `agent-org-references.ts:16-40` | own MIME | org message references |
| F15 | `GET /agent-collaborations/:h/communication/messages/:m/references/:r/content` | `agent-collaboration-references.ts:32-50` | own MIME + `no-store` | collaboration references |
| F16 | `GET /projects/:p/…drafts…/:f`, `/projects/:p/tasks/:t/context-files/:f` | `project-task-context-files.ts:6-12,37-46` | `nosniff`; `attachment` except jpeg/png/gif/webp | Task context files: **already safe** |

Checked and not user files (out of scope, recorded): `/mobile/*` (the node's own shell), `/rest/application-bundles/:id/assets` and `/rest/applications/:id/backend/*` (installed applications, designed to run at the node's origin in the app iframe), `/rest/media` (JSON list/delete), `/rest/upload-file` (POST), `/rest/health`, remote-access and node-update JSON routes.

## Runtime, Probe, Or Reproduction Findings

Node: this worktree's build at base `6225a734a3`, own temp data root, `127.0.0.1:<free port>`, `APP_ENV=production`, workspace created through GraphQL on a temp folder.

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `bash probes/reproduce-416.sh <new dir>` R1a | Rebinding POST: `Host` and `Origin` = `evil.example:<port>` | 200 GraphQL | Reproduced | REQ-001 | `evidence/R-reproduce-416-base.txt` |
| same, R1b | Rebinding same-origin GET of a workspace file, no Origin | 200 `text/html` | Reproduced | REQ-001 (Host check must not depend on Origin) | same |
| same, R1c | Control: foreign Origin, real Host | 403 (403's rule works) | Reproduced | — | same |
| same, R2a/R2b | Origin `http://localhost:5173` / `http://127.0.0.1:8080` POST `/graphql` | 200 | Reproduced | REQ-004 | same |
| same, R2c | Origin `http://localhost:5173` POST `/mcp/gateway` `tools/list` | 200 | Reproduced | REQ-004 (MCP gateway too) | same |
| same, R3a/R3b/R3c | `content?path=page.html` / `pic.svg` / `doc.pdf` | 200 with own type; no CSP, no nosniff | Reproduced | REQ-007 | same |
| same, R3d | 417's static route | `CSP: sandbox allow-scripts`, no nosniff | Reproduced | Precedent | same |
| `probes/electron-file-origin-probe.js` (Electron 42.11.16) | A `file://` page in an Electron window: fetch POST, fetch GET, WebSocket to a local server | POST and GET: no Origin; WS: `Origin: file://` | Measured | REQ-009 | `evidence/R4-electron-file-origin.json` |

- Temporary diagnostics: None in source. Probes start and remove their own node and temp root; no secrets in the node log (checked: 0 matches for `authorization|access_token|api_key`).
- Reproduction for implementation to start from: `tickets/in-progress/node-web-page-and-file-security/probes/reproduce-416.sh` (prerequisites in its header). Before the fix, R1a, R1b, R2a–c, R3a and R3b show the attack accepted. `probes/electron-file-origin-probe.js` for the `file://` header facts.

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Fetch standard: `Origin` header | WHATWG | Browsers omit Origin on same-origin GET/HEAD; a page cannot set `Host` | R1b; standard | — |
| Electron `file://` pages | Electron 42.11.16 | No Origin on fetch, `file://` on WS | R4 | Other Electron versions: re-measured by the test |
| Chrome PDF viewer under `CSP: sandbox` | Chromium | May not render | Web (Chromium 413851, Atlassian) | Design measures current Electron/Chrome |
| Tailscale `*.ts.net` | Tailscale | Public names resolve only to Funnel relays | Web | — |
| Special-use names | RFC 6761 (`.localhost`), RFC 6762 (`.local`), RFC 8375 (`.home.arpa`), ICANN 2024 (`.internal`); `.lan` and dotless names are local by convention | Public DNS cannot give an attacker these names | Standards; pairing-url-policy.ts | `.lan` is not reserved (a widely used router default) |

## Persisted Data And State Facts

- Affected stored subject: none. Paired-device URLs and pairing sessions are read as name sources and not changed.
- New settings: optional node settings in the node's `.env`/environment, read at start. No migration.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/reproduce-416.sh` | Solution Designer | Reproduction of BEH-001…003 on an isolated node | Server boundary | AC-001, AC-002, AC-005, AC-007 | Current | Evidence; no approval needed |
| `probes/electron-file-origin-probe.js` | Solution Designer | Measures Electron `file://` Origin headers | Electron | AC-010 | Current | Evidence |
| `probes/d6-file-origin-forms-probe.js`, `probes/d6-http-page-control-probe.js`, `evidence/SR-003-*` | Solution Designer | Measures the revised D6 rule and its http control | Electron | AC-008, AC-010 | Current | Evidence |
| `probes/arch-review-d6-child-frame-probe.js`, `evidence/ARCH-REV-001-d6-child-frame-probe.json` | Architecture reviewer | Disproved the SR-002 D6 rule | Electron | AC-010 | Current (historical basis of AR-001/AR-002) | Evidence |
| `probes/electron-origin-rewrite-and-pdf-probe.js`, `evidence/A1-electron-origin-rewrite-and-pdf.json`, `evidence/A1-pdf-under-csp-sandbox.png` | Solution Designer | Measures the session Origin rewrite and PDF under a sandbox CSP | Electron | AC-008, AC-010 | Current | Evidence |
| `evidence/R-reproduce-416-base.txt`, `evidence/R4-electron-file-origin.json` | Solution Designer | Base results | — | as above | Current | Evidence |
| `follow-ups.md` | Solution Designer | Out-of-ticket findings | — | — | Current | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | A node reached by a public DNS name it cannot learn (reverse proxy with a domain, a peer or desktop entry by DNS name, a Docker node by service name) is refused until the name is configured | Could stop a working setup | User decides the name rule (DEC-001); clear refusal and log naming the setting; release note | Open |
| RSK-002 | Risk | Localhost pages that legitimately call a node (developers' tools, a browser-based MCP client) stop working unless listed | Could stop a working setup | User decides (DEC-002); launchers we own state their origin | Open |
| RSK-003 | Risk | Under the trusted-network model, a LAN device can still reach the node directly; this ticket is about web pages and files, not LAN devices | Expectations | Unchanged (403 RSK-003); stated as a non-goal | Accepted |
| UNK-001 | Unknown | Exact behavior of Chrome/Electron's PDF viewer under a sandbox CSP | Viewer compatibility | Measured (A1): renders unchanged in Electron 42 | Resolved |
| UNK-002 | Unknown | Whether Electron's `webRequest` can rewrite `Origin` for the in-app browser session | Issue 4 mechanism | Measured (A1): yes, for POST, GET and WS | Resolved |

## Requirement Implications

- The Host check must apply to every request, with or without an Origin (R1b), and must not trust `X-Forwarded-Host`: a re-pointed page is same-origin with itself and may set that header.
- Accepting any IP literal is safe: a page whose host is an IP address is served by whatever answers at that IP, so it cannot be an attacker's page re-pointed. The same holds for `localhost`/`*.localhost` and names public DNS cannot give an attacker.
- `APP_ENV` cannot mark "development": probes run production-mode nodes with a localhost frontend.
- The app opens user files top-level (attachments in the in-app browser, media documents), so the protection must keep those displays working, PDFs included.
- The packaged renderer and a `file://` page in the in-app browser are identical to the node (R4), so issue 4 is closed on the desktop side, in the in-app browser's session.

## Architecture Investigation Findings

Design reading gate (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `GLOSSARY.md`, `docs/design-cases.md` (Cases 2 and 6), `templates/design-spec-template.md`.

| Source / Command / Probe | Observation | Established | Design Implication |
| --- | --- | --- | --- |
| `probes/electron-origin-rewrite-and-pdf-probe.js` (Electron 42.11.16), part A | In a session whose `webRequest.onBeforeSendHeaders` sets `Origin: null` when the initiating frame is `file:`, the server sees `Origin: null` on fetch POST, fetch GET and the WebSocket upgrade | Measured (`evidence/A1-electron-origin-rewrite-and-pdf.json`) | UNK-002 resolved: REQ-009 is met in the in-app browser's session; nodes already refuse `null` (403 REQ-002) |
| same, part B | A top-level PDF renders the same with and without `Content-Security-Policy: sandbox allow-scripts` (viewer frame present, identical screenshots), with the in-app browser's webPreferences and with `plugins: true` | Measured (`evidence/A1-pdf-under-csp-sandbox.png`) | UNK-001 resolved for Electron 42 (Chromium of the same generation as current Chrome): one header for every user file, no PDF exception |
| `autobyteus-web/electron/shell/workspace-shell-window.ts:52-59` | The main window prevents navigation and denies `window.open` | Read | Only the in-app browser's session can host a `file://` page besides the renderer itself |
| `autobyteus-web/electron/browser/browser-view-factory.ts:15-43`; `browser-session-profile.ts:5,26-38` | Tabs and adopted popups both use the partition `persist:autobyteus-browser` (popups asserted) | Read | One session policy covers every in-app browser page |
| `grep webRequest autobyteus-web/electron` | Only `session.defaultSession.webRequest.onBeforeRequest` (`local-file-protocol.ts:15`); nothing on the browser partition | Read | Electron allows one `onBeforeSendHeaders` listener per session; the browser partition has none, so no conflict |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts:457-460` | Hook order: MCP gateway hook, multipart, websocket, policy plugin (CORS registered inside it before its `onRequest` hook) | Read | `@fastify/cors` answers preflights before the gate's hook. A Host check placed inside the plugin would come after the MCP hook and after CORS preflight handling. Register it first, before `registerMcpGatewayRoutes` |
| `src/api/security/remote-access-policy-plugin.ts:34-48` | One refusal reply and log line (`refuse`) for every refusal of the gate | Read | The Host gate must use the same refusal owner (extract it) |
| `src/agent-tools/mcp/agent-tools-mcp-local-access.ts:51-77`; `src/mcp-gateway/mcp-gateway-access.ts:74-…` | Two copies of a Host-header parser | Read | A third need (the Host rule) means one shared parser in `api/security` |
| `src/mcp-gateway/mcp-gateway-http-helpers.ts:51-59` and `agent-tools-mcp-local-access.ts:33-42,79-84` | Two copies of "no Origin or a loopback origin" | Read | Replaced by one tool-endpoint origin rule |
| `agent-tools-mcp-host.ts:74`; `credential-proxy-host.ts:67`; `start-standalone-application-host.ts:226` | `new AgentToolsMcpLocalAccessGate()` is built in three places | Read | The gate reads the node's configured origins from one start-time settings owner, not through new constructor parameters at three call sites |
| `src/remote-access/services/remote-access-pairing-service.ts:47-48,100,134,173-183`; `paired-device-service.ts:34-38,67-71`; `remote-access-auth-service.ts:41-50` | Pairing sessions live in memory in the pairing service; paired devices are read from their JSON file, and every phone request already does that read (`findDeviceByCredential`) | Read | Paired-phone hosts are checked only when a Host is in no static class, through the pairing service, with no new cache |
| `autobyteus-web/stores/phoneAccessStore.ts:243-250` ("A typed address is the user's explicit choice (DEC-021)") | A company address can be typed for pairing, so a paired phone's host can be a public name the node has no other record of | Read | REQ-002(e) is a real source, not covered by the static classes |
| `src/config/app-config.ts:480-485` | `get` = `process.env[key] ?? .env value ?? default` | Read | An env value set by Electron dev overrides the data dir `.env` value (dev only) |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts:110-140`; `baseServerManager.ts:295-307`; `browser/browser-runtime.ts:41,90` | `buildServerProcessEnv` is the one composer of the embedded server env; `setRuntimeEnvOverrides` is owned by the browser runtime and replaced wholesale | Read | The dev renderer origin goes in through the launch config into `buildServerProcessEnv`, not through `runtimeEnvOverrides` |
| `autobyteus-web/nuxt.config.ts:34-41,144-153,81-87` | Browser shell in dev: absolute backend URLs for WS; Vite proxy for `/graphql`, `/rest` with `changeOrigin` (Host rewritten, Origin forwarded) | Read | Every frontend served against a node, proxied or not, sends its own Origin: each launcher lists it |
| `grep -l dist/app.js autobyteus-web/tests/e2e/*.mjs` and `grep` of their frontend start | About 38 probes start a frontend against a node they own; 6 start no frontend | Read | REQ-005: each of the 38 passes `AUTOBYTEUS_ALLOWED_ORIGINS=<its frontend origin>` |
| Reviewer probe `probes/arch-review-d6-child-frame-probe.js` (ARCH-REV-001) | The SR-002 rule (frame URL) let an `about:blank` iframe WS keep `Origin: file://` and a `srcdoc` POST go out without Origin; it rewrote a `mainFrame` GET navigation from a `file://` tab. `details.frame.origin` was `file://` for every child frame | Measured by the architecture reviewer (`evidence/ARCH-REV-001-d6-child-frame-probe.json`) | D6 must decide on the frame's origin and leave GET/HEAD navigations alone |
| `probes/d6-file-origin-forms-probe.js` (SR-003, Electron 42.11.16) | Revised rule: every request from a `file://` document arrives with `Origin: null`. Covered: top-level, `about:blank`/`srcdoc`/`blob:` iframes, `about:blank` popup, dedicated worker (fetch, XHR, WS each), form-POST navigation, `sendBeacon` and `keepalive` fetch on `pagehide` (those two have no `details.frame`). GET navigations (address bar, iframe `src`) unchanged | Measured (`evidence/SR-003-d6-file-origin-forms.json`) | D6 rule (a)–(c) and rule 1 |
| `probes/d6-http-page-control-probe.js` (SR-003) | An `http` page in the same session: nothing rewritten; fetch/XHR/beacon/cross-origin/form POSTs and the WS carry the page's Origin; a same-origin GET carries none | Measured (`evidence/SR-003-d6-http-page-control.json`) | Premise of D6 (c): a non-GET request without Origin comes only from a `file://` document |
| `autobyteus-server-ts/tests` grep for loopback origins as allowed | `tests/unit/remote-access/request-origin.test.ts`, `tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts`, `tests/unit/agent-tools/mcp/agent-tools-mcp-local-access.test.ts`, `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`, the MCP gateway tests | Read | Updated to the new rule |

## Notes For Architecture Design

- One request gate already exists (`remote-access-policy-plugin.ts`): the Host check goes before the Origin rule, for HTTP and upgrades. `/mcp/gateway` and the internal listeners have their own gates with duplicated loopback parsing (`parseHostHeader` in two places).
- Name sources: settings (`AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_ALLOWED_ORIGINS`, the new names setting) are static; the Tailscale name and paired-phone URLs change at runtime (cache or refresh).
- A shared user-file reply helper for F1–F15 (F16 already safe).
