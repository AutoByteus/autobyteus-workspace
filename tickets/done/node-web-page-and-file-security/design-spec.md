# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (D6 revised after ARCH-REV-001 AR-001/AR-002; R-3, R-4 and R-5 adopted)
- Approved requirements baseline: SR-001 with DEC-001 = A and DEC-002 = A. Approved by the user, 2026-11-07, in the Solution Designer conversation ("i trust your judgement, you understand more than me actually"). See `requirements-doc.md` Document Status.
- Behavior-defining supplements: none
- User approval of the design: `Not required` (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/investigation-notes.md`
- Authorities read (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `GLOSSARY.md`, `docs/design-cases.md` (Cases 2 and 6), `TESTING.md`
- Project design-principle conflicts or discrepancies: none

## Current-State Read

A node has one request gate, `registerRemoteAccessPolicyPlugin` (`src/api/security/remote-access-policy-plugin.ts:55-82`). It registers `@fastify/cors` with a delegator, then one `onRequest` hook: the allowed-origin rule (`remote-access-request-origin.ts:53-79`), then route authorization (`remote-access-route-policy.ts:168-208`; `/ws/*` is authorized in the handlers). It is registered after the MCP gateway's own `onRequest` hook (`build-studio-server.ts:457-460`). Nothing reads the `Host` value except the same-origin comparison (`remote-access-request-origin.ts:73`).

Two internal loopback listeners (agent tools MCP, credential proxy) share `AgentToolsMcpLocalAccessGate` (`agent-tools-mcp-local-access.ts:9-24`). It checks a loopback client, a loopback `Host` and an absent-or-loopback Origin. The MCP gateway has its own copy of the same Origin rule (`mcp-gateway-http-helpers.ts:51-59`) and a Host parser (`mcp-gateway-access.ts:78-88`).

User files are streamed by 15 route handlers in 7 files, each calling `reply.type(mime)` then `reply.send(stream)` (inventory F1–F15, investigation notes). Only the workspace static route adds `Content-Security-Policy: sandbox allow-scripts` (`workspaces.ts:14,88`).

The in-app browser runs tabs and popups in the partition `persist:autobyteus-browser` (`browser-session-profile.ts:5`), whose session policy hook is empty (`:36-38`). It allows `file:` URLs (`browser-tab-navigation.ts:10-11`).

The embedded server's environment is composed in one place, `buildServerProcessEnv` (`electron/server/serverRuntimeEnv.ts:110-140`), from the launch config built in `electronApplication.ts:70-77`.

Evidence: investigation notes, Source Log and Architecture Investigation Findings; behavior IDs BEH-001…010.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: the change spans five areas:
  - the server request gate (a new Host gate, refusal extraction, settings owner);
  - three other listeners' origin rules (MCP gateway, agent tools, credential proxy);
  - 15 user-file route handlers through one new reply owner, plus an architecture test;
  - the pairing service (one read);
  - the Electron main process (in-app browser session policy, embedded server env).

  Mechanical edits come on top: about 38 browser probes, the development launcher, server tests and docs. About 20 source files in two packages, not counting tests.
- Architectural risk: `High`
- Risk rationale: it changes the node's security boundary, a new refusal class on every request, and the accepted-origin contract approved in 403 (DEC-004 replaced). Blast radius: every client of every node, including setups this repository cannot see (reverse proxies, DNS-named peers): RSK-001, RSK-002.
- Escalation trigger: implementation or validation finds a supported client that sends a Host or Origin outside the approved rule, or a viewer that breaks under the user-file headers. Either goes back to the Solution Designer as a `Requirement Gap`, not a widened rule.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Reproduction | `probes/reproduce-416.sh`, `evidence/R-reproduce-416-base.txt` | R1 rebinding accepted (POST and no-Origin GET); R2 localhost origins accepted incl. `/mcp/gateway`; R3 user files without protective headers | D1, D3, D4 | — |
| Electron probe | `probes/electron-file-origin-probe.js`, `evidence/R4-electron-file-origin.json` | `file://` page: no Origin on fetch, `file://` on WS | D6 | — |
| Electron probe | `probes/electron-origin-rewrite-and-pdf-probe.js`, `evidence/A1-*` | PDF renders under `CSP: sandbox allow-scripts`; a session rewrite reaches the server (top-level document only) | D5 (no PDF exception) | Other browsers outside Electron: per the web evidence, the Chrome bug was fixed in Chrome 91; covered by the validation of AC-008 |
| Reviewer probe (ARCH-REV-001) | `probes/arch-review-d6-child-frame-probe.js`, `evidence/ARCH-REV-001-d6-child-frame-probe.json` | The SR-002 rule (frame URL) let an `about:blank` iframe WS keep `Origin: file://` and a `srcdoc` POST go out with no Origin; it rewrote a GET navigation from a `file://` tab | D6 revised (SR-003) | — |
| Electron probe (SR-003) | `probes/d6-file-origin-forms-probe.js`, `evidence/SR-003-d6-file-origin-forms.json` | With the revised rule, every request from a `file://` document arrives with `Origin: null`: top-level, `about:blank`/`srcdoc`/`blob:` iframes, `about:blank` popup, dedicated worker (fetch, XHR, WS each), form-POST navigation, `sendBeacon` and `keepalive` fetch on `pagehide` (no frame). GET navigations (address bar, iframe `src`) pass unchanged | D6 | — |
| Electron probe (SR-003) | `probes/d6-http-page-control-probe.js`, `evidence/SR-003-d6-http-page-control.json` | From an `http` page in the same session, nothing is rewritten; every POST (fetch, XHR, beacon, cross-origin fetch, form navigation) and the WS carry the page's own Origin | D6 condition (c) premise; BEH-010 preserved | — |
| Code | `build-studio-server.ts:457-460`; `remote-access-policy-plugin.ts:59-81` | CORS preflights are answered before the gate hook; the MCP hook runs before the plugin | D1 placement (Host gate first) | — |
| Code | `remote-access-pairing-service.ts:47-48`; `paired-device-service.ts:34-38,67-71`; `remote-access-auth-service.ts:50` | Sessions in memory; devices read from file on every phone request already | D2 (no cache) | — |
| Code | `agent-tools-mcp-local-access.ts:51-77`; `mcp-gateway-access.ts:78-88`; `mcp-gateway-http-helpers.ts:51-59` | Duplicated Host parser and loopback-origin rule | D4, shared parser | — |
| Code | `serverRuntimeEnv.ts:110-140`; `baseServerManager.ts:295-307`; `browser-runtime.ts:41,90` | One env composer; overrides owned by the browser runtime | D7 | — |

## Intended Change

Add a Host gate as the node's first request rule. Remove the any-port loopback origin from the node's three origin rules. Send every user file with one header policy. Make `file://` pages in the in-app browser foreign to nodes. Have every launcher the repository owns state its frontend origin.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005. Areas:
  - server `src/api/security` (Host gate, allowed-host rule, Host parser, refusal, start-time settings, origin rules);
  - `src/mcp-gateway` and `src/agent-tools/mcp` (origin rule, parser reuse);
  - `src/remote-access/services/remote-access-pairing-service.ts` (paired-phone host read);
  - `src/api/rest` user-file handlers and a new reply owner;
  - `src/compositions/build-studio-server.ts` (registration order);
  - Electron `electron/browser/browser-session-profile.ts` and `electron/server` launch config/env;
  - `scripts/development/development-runtime.mjs`; browser probes; tests; docs and GLOSSARY.
- Derived consumers: the allowed-origin rule feeds the CORS delegator (`remote-access-policy-plugin.ts:62-64`). It is kept on the same rule, so CORS grants follow the new rule (a loopback origin no longer gets CORS headers unless listed). The MCP gateway preflight answer (`handleGatewayOptions`) follows its new origin rule. No stored structure changes.
- Deliberately left alone:
  - route authorization and phone routes (403);
  - the HTML preview iframe (417);
  - `/rest/projects/.../context-files` (F16, already `nosniff` + `attachment`);
  - application bundle assets and backends (designed to run at the node's origin);
  - `/mobile`;
  - pairing URL rules (`pairing-url-policy.ts`): their "private host" fact is about phone reachability, a different fact from "a name public DNS cannot give an attacker", so it is not reused;
  - the standalone application host's own WebSocket rule (FU-001).

  The standalone host builds an `AgentToolsMcpLocalAccessGate` too (`start-standalone-application-host.ts:226`). It gets the new tool-endpoint origin rule through the shared gate, at no extra cost.
- Project documents: `docs/design-cases.md` Case 2 gets the autobyteus-416 instance (ARCH-REV-001 AR-001/AR-002), as the Solution Designer skill requires for a fixed design mistake.
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001…003, REQ-006; AC-001…004 | Any HTTP request / WS upgrade to a node | Host unchecked (R1) | Refused 403 `REMOTE_ACCESS_HOST_REFUSED` unless an allowed host | DS-001 |
| BEH-002 | Contract | REQ-004, REQ-006; AC-005, AC-013 | A request with a loopback Origin to the main listener, `/mcp/gateway`, agent tools, credential proxy | Accepted on any port (R2) | Refused unless listed | DS-001 (main, `/mcp/gateway`), DS-004 |
| BEH-003 | Contract | REQ-007, REQ-008; AC-007…009 | GET of a user-file route | Own MIME, no protection (R3) | Same body and type, plus `CSP: sandbox allow-scripts` and `nosniff` | DS-002 |
| BEH-004 | Contract | REQ-009; AC-010 | A `file://` page in the in-app browser makes a request | Looks like the desktop app (R4) | Its requests carry `Origin: null`; nodes refuse them | DS-003 |
| BEH-005…007 | User / System | AC-011, AC-012, AC-004 | Desktop, phone, peers | Work | Preserved: their hosts are allowed hosts; their origins unchanged | DS-001 |
| BEH-008 | Operational | REQ-005; AC-006 | Electron dev, dev stack, probes, e2e | Loopback origins accepted | Each lists its frontend origin | DS-005 |
| BEH-009/010 | User | AC-008, AC-013 | Viewers; agent-started server in the in-app browser | Work | Preserved | DS-002; DS-003 (does not touch `http(s)` pages) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/reproduce-416.sh` | Reproduction | AC-001, AC-005, AC-007 | Implementation starts from it failing (R1, R2, R3 accepted) and ends with it showing refusals and headers | Evidence |
| `probes/electron-origin-rewrite-and-pdf-probe.js` | Measurement | AC-008, AC-010 | Proves D5 and D6 are feasible in Electron 42 | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (security).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - **Repeated coordination / One rule applied by several callers** (Principle 13; Case 6): 15 handlers each decide how a user file is answered. One reply owner and an architecture test fix it.
  - **Shared-structure duplication** (Principle 11): two Host parsers and two copies of the loopback-origin rule. One parser and one tool-endpoint origin rule replace them.
  - **Several kinds or forms** (Principle 1; Case 2): the "node's own page" decision has four entry kinds (main listener, `/mcp/gateway`, two internal listeners) and several request forms (HTTP with/without Origin, preflight, WS upgrade). Each is traced in the entry-form table below.
  - **Legacy cleanup** (Principle 8): the loopback class is removed, not kept behind a flag.
- Root cause classification: `Missing Invariant`. The gate owns "is this request from the node's own page" but checked only Origin, never Host. The loopback class was a deliberate rule that the new evidence invalidates. Plus `Duplicated Policy Or Coordination` for the user-file replies.
- Refactor needed now: `Yes`, bounded: one reply owner for user files; one Host parser; one tool-endpoint origin rule; the refusal reply extracted so the Host gate and the plugin share it.
- Evidence: Current-State Read citations.
- Design response: D1–D7 below.
- Refactor rationale: without the shared reply owner, the next file route repeats today's gap. Without the shared parser and rule, the three listeners drift again.
- Intentional deferrals: the browser probes keep their per-probe stack code; a shared probe stack helper is not needed for this change.

## Terminology

- **Allowed host** (new, added to GLOSSARY): a name a node accepts as a request's `Host` (port not compared). These are: an IP address; `localhost`/`*.localhost`; dotless names and names ending `.local`, `.lan`, `.home.arpa`, `.internal`; names ending `.ts.net`; the hosts of `AUTOBYTEUS_SERVER_HOST` and of `AUTOBYTEUS_ALLOWED_ORIGINS` entries; names in `AUTOBYTEUS_ALLOWED_HOSTS`; the hosts of the node's open pairing sessions and active paired phones. Others are refused with `REMOTE_ACCESS_HOST_REFUSED`. Code: `RequestHostPolicy`, `remote-access-request-host.ts`.
- **Allowed origin** (GLOSSARY entry changed): the loopback class is removed.
- **Tool endpoint**: `/mcp/gateway` and the agent-tools and credential-proxy listeners, whose clients are programs. Their origin rule: no Origin, or one listed in `AUTOBYTEUS_ALLOWED_ORIGINS`.
- **User file reply**: the response of a node route that returns a user file's content.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the loopback-origin class in the node's rule (`remote-access-request-origin.ts:35-36,76`), the MCP gateway's (`mcp-gateway-http-helpers.ts:51-59` loopback branch), the internal listeners' (`agent-tools-mcp-local-access.ts:33-42,79-84`); the duplicated Host parsers; `PREVIEW_DOCUMENT_SANDBOX` in `workspaces.ts` (replaced by the reply owner).
- Compatibility wrappers kept: `None`. No flag restores loopback origins; a developer lists an origin.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. New optional settings are read at start; paired devices and pairing sessions are read, never written by this change.

## Design Decisions

- **D1 Host gate first.** A new `registerRemoteAccessHostGate(app)` adds one `onRequest` hook. `build-studio-server.ts` registers it before `registerMcpGatewayRoutes`, so it runs before the MCP hook, before `@fastify/cors` preflight handling, and before the origin/auth hook, for every request and upgrade. Missing `Host` → continue. Unparseable → refuse. Allowed host → continue. Otherwise → refuse with `REMOTE_ACCESS_HOST_REFUSED` through the shared refusal owner.
- **D2 Allowed-host rule** (`createRequestHostPolicy`). It checks in order:
  1. static classes (synchronous, no I/O): IP literal, `localhost`/`*.localhost`, dotless/`.local`/`.lan`/`.home.arpa`/`.internal`, `*.ts.net`;
  2. configured names and `.suffix` entries from the start-time settings;
  3. only on a miss, `await pairingService.isPairedPhoneHost(name)`.

  Names are lowercased, IPv6 brackets and a trailing dot stripped, the port ignored. `X-Forwarded-Host` is not read (DEC-005).
- **D3 Node origin rule.** `createRequestOriginPolicy` loses the loopback class. It keeps: no Origin, `file://`, same origin (`Host` or `X-Forwarded-Host`, after D1 passed), configured.
- **D4 Tool-endpoint origin rule.** `createToolEndpointOriginPolicy(configured)` allows no Origin or a configured origin. It is used by the MCP gateway hook and route handler (replacing `isOriginAllowed`) and by `AgentToolsMcpLocalAccessGate` (replacing `isAllowedOrigin`). The gate gets the configured origins from the start-time settings owner (D8), so its three construction sites do not change.
- **D5 User file reply.** `sendUserFile(reply, { mimeType, body })` in `src/api/rest/user-file-reply.ts` sets `Content-Security-Policy: sandbox allow-scripts`, `X-Content-Type-Options: nosniff` and the type, then sends. It is the only way F1–F15 answer file content; headers like `cache-control` stay with their routes. There is no PDF exception (measured, A1). An architecture test (`tests/architecture/user-file-replies.test.ts`) fails when a file under `src/api/rest/` streams a file (`createReadStream` or a resolved content `stream`) outside `user-file-reply.ts`, except a named list: `application-bundles.ts` (installed app code), `project-task-context-files.ts` (F16, attachment).
- **D6 `file://` pages in the in-app browser** (revised in SR-003). `BrowserSessionProfile.applySessionPolicy` installs `webRequest.onBeforeSendHeaders` on the browser partition. It runs one rule, `isFileDocumentRequest(details)` (`browser-file-document-request.ts`), and when the rule holds it sets `Origin: null`; every other request passes unchanged. The rule holds when the target URL is not `file:`, and:
  1. **GET/HEAD navigations are never changed.** `resourceType` `mainFrame` or `subFrame` with method `GET` or `HEAD` → unchanged (AR-002). The new document takes the target's origin, so the `file://` page gains nothing it can read, and a node URL opened in a tab that showed a local file displays.
  2. Otherwise the request is from a `file://` document when any of these holds:
     - (a) `details.frame?.origin === 'file://'`: the requesting frame's **origin**, not its URL (AR-001). `about:blank`, `srcdoc` and `blob:` frames, `about:blank` popups and workers inherit it.
     - (b) the request's own `Origin` header is `file://`.
     - (c) the request has **no `Origin` header and its method is not GET/HEAD**. Chromium adds Origin to every non-GET/HEAD request from a web page (measured control); only a `file://` document omits it. This covers requests whose frame is gone (`details.frame` absent), such as `sendBeacon` and `keepalive` fetch on `pagehide`.

  A form-POST navigation from a `file://` page falls under (a) and gets `Origin: null` (measured). Nodes already refuse `null` (D3, D4). `http(s)` pages, the agent-started server included, are never changed (measured control).
- **D7 Launchers list their frontend.**
  - **Electron dev:** the launch config gets `developmentRendererOrigin: string | null`; `electronApplication.ts` sets it to the dev start URL's origin when `isDev`, else `null`. `buildServerProcessEnv` appends it to `AUTOBYTEUS_ALLOWED_ORIGINS`, after the caller's value under `inherit-caller`.
  - **Dev stack:** `development-runtime.mjs` adds `AUTOBYTEUS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000` to its launcher-owned backend keys.
  - **Browser probes:** each probe that starts a frontend against its node adds `AUTOBYTEUS_ALLOWED_ORIGINS: <frontend origin>` to that node's env.
  - **Server e2e:** suites that send a loopback Origin as an allowed client set the setting or use a configured origin.
- **D8 Start-time settings owner.** `getNodeBrowserAccess()` in `src/api/security/node-browser-access.ts`, lazy and read once per process (reset for tests), reads `AUTOBYTEUS_ALLOWED_ORIGINS`, `AUTOBYTEUS_ALLOWED_HOSTS` and the host of `AUTOBYTEUS_SERVER_HOST`. It returns `{ allowedOrigins, allowedHostNames, allowedHostSuffixes }`, with one warning per setting for invalid entries. `parseConfiguredOrigins` moves here from `remote-access-request-origin.ts`. The plugin's `readConfiguredOrigins` is removed.
- **D9 Refusal owner.** `refuseRemoteAccessRequest(request, reply, rejection, detail?)` moves from the plugin to `src/api/security/remote-access-refusal.ts`; the Host gate and the plugin both call it. The Host refusal's log line is `Remote Access request refused REMOTE_ACCESS_HOST_REFUSED <redacted url> host <name> (add it to AUTOBYTEUS_ALLOWED_HOSTS if this is the node's name)`. Message: "Requests addressed to this host name are not accepted by this node." No headers or credentials are logged.

## Entry-Form Table (Principle 1, Case 2)

| Entry | Form | Host gate (D1) | Origin rule | Result for an attack | Result for a supported client |
| --- | --- | --- | --- | --- | --- |
| Main listener, any route | HTTP with Origin | Yes, first | Node rule (D3) | Rebinding: Host refused. Localhost page: Origin refused | Same-origin, `file://`, configured: pass |
| Main listener | HTTP without Origin (same-origin GET, programs) | Yes | Passes (absent) | Rebinding GET: Host refused | Desktop fetch, peers, CLI: pass |
| Main listener | CORS preflight `OPTIONS` | Yes, before `@fastify/cors` | CORS delegator, node rule | Refused (Host) or no CORS grant | Unchanged |
| Main listener | WS upgrade (`/ws/*`, `/graphql`, `/rest/remote/run-observations`) | Yes | Node rule in the plugin hook (runs before the `/ws/` defer) | Refused before upgrade | Pass |
| `/mcp/gateway` | HTTP / preflight | Yes (main hook, first) | Tool-endpoint rule in the MCP hook and handler (D4), then the node rule in the plugin | Refused | Programs (no Origin) pass; token rule unchanged |
| Agent-tools / credential-proxy listeners | HTTP | Their existing loopback-Host check (rebinding-safe, unchanged) | Tool-endpoint rule (D4) | Localhost page refused | Runtimes (no Origin) pass |
| In-app browser `file://` document: top-level, `about:blank` iframe, `srcdoc` iframe, `blob:` iframe, `about:blank` popup, dedicated worker | fetch, XHR, WS from each | Node: yes (unchanged) | D6 (a): `Origin: null` → refused by D3/D4 | Refused (measured, SR-003) | — |
| In-app browser `file://` document | `sendBeacon` / `keepalive` fetch on `pagehide` (no frame) | Yes | D6 (c): `Origin: null` | Refused (measured) | — |
| In-app browser `file://` document | Form-POST navigation | Yes | D6 (a): `Origin: null` | Refused (measured) | — |
| In-app browser tab showing a `file://` page | GET navigation (address bar, link, agent `navigate`, iframe `src`) to a node URL | Yes | Unchanged (D6 rule 1); a node GET without Origin passes | — (the file page cannot read the new document) | Displays (AC-008, AR-002) |
| In-app browser `http(s)` page | Any request | Yes | Unchanged (own Origin) | Localhost page refused by D3 (no longer an allowed origin) | Page itself works (AC-013) |

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-005…007 | Browser or program sends a request to a node | Route handler runs, or the request is refused | Node request gate (Host gate, then origin/auth hook) | The node's own-page decision |
| DS-002 | Primary End-to-End | BEH-003, BEH-009 | A viewer or a top-level open requests a user file | The file is displayed, walled off from the node | `sendUserFile` | No user file runs with the node's origin |
| DS-003 | Primary End-to-End | BEH-004 | A `file://` page in the in-app browser sends a request | A node refuses it | In-app browser session policy | Closes the desktop-app look-alike |
| DS-004 | Primary End-to-End | BEH-002 | A request to an internal listener | Tool call runs or is refused | `AgentToolsMcpLocalAccessGate` | Same localhost rule off the main listener |
| DS-005 | Bounded Local | BEH-008 | A launcher starts a node and a frontend | The node accepts that frontend's origin | Each launcher; `buildServerProcessEnv` for Electron dev | Development and tests keep working |

## Primary Execution Spine(s)

- DS-001: `Browser/program -> Fastify -> Host gate (allowed-host rule -> pairing service on a miss) -> MCP hook (/mcp/gateway only) -> CORS (preflight) -> origin/auth hook (node origin rule -> route policy) -> route handler`
- DS-002: `Viewer / tab / agent browser tool -> node request gate (DS-001) -> user-file route handler (resolves the file) -> sendUserFile (headers + body) -> browser renders in an opaque origin`
- DS-003: `file:// document (top-level, child frame, popup or worker) in the in-app browser -> Chromium request -> browser session onBeforeSendHeaders -> isFileDocumentRequest (GET/HEAD navigation? pass : frame origin / Origin header / no-Origin non-GET) -> Origin: null -> node request gate -> origin rule refuses`
- DS-004: `Runtime (Codex/Claude/…) -> loopback listener -> AgentToolsMcpLocalAccessGate (client, Host, tool-endpoint origin rule) -> MCP/proxy route`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Every request first proves it was addressed to one of the node's names, then that its page is the node's own, the desktop app or listed, then that its credential opens the route | Host gate, allowed-host rule, origin rule, route policy | Request gate | Start-time settings, pairing lookup on a miss, refusal reply/log |
| DS-002 | The route resolves which file; the reply owner decides how any file is answered, so every file opens in an opaque origin | User-file route, user file reply | `sendUserFile` | Architecture test |
| DS-003 | The desktop decides that any request made by a local page, or by anything that page created (child frames, popups, workers, unload beacons), is not the desktop app, before a node ever sees it. Navigating away from the page with GET is left alone | Browser session policy, `isFileDocumentRequest` | `BrowserSessionProfile` | — |
| DS-004 | Internal listeners keep their loopback checks and stop treating localhost pages as programs | Local access gate | `AgentToolsMcpLocalAccessGate` | Start-time settings |
| DS-005 | Each launcher that serves a frontend tells its node that frontend's exact origin | Launcher, node env | Each launcher | — |

## Spine Actors / Main-Line Nodes

Host gate; allowed-host rule (`RequestHostPolicy`); node origin rule (`RequestOriginPolicy`); tool-endpoint origin rule; route policy (unchanged); user-file route handlers; `sendUserFile`; `BrowserSessionProfile`; `AgentToolsMcpLocalAccessGate`.

## Ownership Map

| Node | Owns |
| --- | --- |
| Host gate (`remote-access-host-gate.ts`) | When the Host check runs (first hook) and what happens on refusal |
| `RequestHostPolicy` (`remote-access-request-host.ts`) | The allowed-host rule: classes, configured names, the order, the miss lookup |
| `RequestOriginPolicy` / tool-endpoint rule (`remote-access-request-origin.ts`) | Which Origins each kind of listener accepts |
| `getNodeBrowserAccess` (`node-browser-access.ts`) | Reading and validating the three settings once |
| `refuseRemoteAccessRequest` (`remote-access-refusal.ts`) | The one refusal reply and log line |
| `RemoteAccessPairingService.isPairedPhoneHost` | Which hosts its open sessions and active paired phones use |
| `sendUserFile` (`user-file-reply.ts`) | How a user file is answered |
| `BrowserSessionProfile` (+ `isFileDocumentRequest` in `browser-file-document-request.ts`) | The in-app browser session's request policy; the one rule for "made by a `file://` document" |
| `buildServerProcessEnv` | The embedded server env, incl. the dev renderer origin |

## Thin Entry Facades / Public Wrappers

N/A: no facade is added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `isLoopbackHostname` and the loopback branch in `createRequestOriginPolicy` (`remote-access-request-origin.ts:35-36,76`) | DEC-002 = A | Configured origins | `isLoopbackClientAddress` import goes if unused |
| Loopback branch of `isOriginAllowed` (`mcp-gateway-http-helpers.ts:51-59`) and its `isLoopbackHost` helper if unused | DEC-002/DEC-007 | `createToolEndpointOriginPolicy` | — |
| `isAllowedOrigin`, `isCurrentLoopbackOriginHost`, `parseHostHeader` and helpers in `agent-tools-mcp-local-access.ts` | Replaced | Tool-endpoint rule; shared Host parser | `isLoopbackHostHeader` stays, built on the shared parser |
| `parseHostHeader` in `mcp-gateway-access.ts` | Duplicate | Shared Host parser | — |
| `readConfiguredOrigins`, `ALLOWED_ORIGINS_SETTING`, `refuse` in `remote-access-policy-plugin.ts` | Moved | `node-browser-access.ts`, `remote-access-refusal.ts` | — |
| `parseConfiguredOrigins` in `remote-access-request-origin.ts` | Moved | `node-browser-access.ts` | — |
| `PREVIEW_DOCUMENT_SANDBOX` and per-route `reply.type(...)`/`reply.send(stream)` in F1–F15 | One owner | `sendUserFile` | `context-files.ts` local `sendFile` removed |
| Tests asserting loopback origins are accepted | Behavior removed | Tests of the new rule | Listed in investigation notes |

## Return Or Event Spine(s)

N/A: request/response only.

## Bounded Local / Internal Spines

DS-005 (above). `RequestHostPolicy.isAllowed`: `parse -> static classes -> configured -> pairing lookup`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Start-time settings (`node-browser-access.ts`) | DS-001, DS-004 | Host and origin rules | Read/validate settings once | Settings are static per process | Re-reading per request; duplicated warnings |
| Host header parser (`request-host-name.ts`) | DS-001, DS-004 | Host policy, local access gate, MCP gateway access | Parse `Host` into a normalized name | Three users | Drifting parsers |
| Refusal reply/log (`remote-access-refusal.ts`) | DS-001 | Host gate, plugin | One reply shape and log line | One refusal contract | Secrets in logs; different shapes |
| Paired-phone host read | DS-001 | Host policy | Hosts of sessions and active phones | Owner-chosen names | A second owner of pairing data |
| User-file architecture test | DS-002 | `sendUserFile` | Keeps every file route on the owner | Routes added later | Gap reopens |

## Ownership Boundaries

The request gate (Host gate + plugin) is the node's only authority for "which requests reach handlers". Handlers never re-check Host or Origin. The pairing service stays the only reader of pairing sessions and paired devices; the Host policy depends on its one method, never on the stores. `sendUserFile` is the only writer of user-file response headers. The Electron browser session policy is the only place that changes in-app browser request headers.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RemoteAccessPairingService.isPairedPhoneHost` | `sessionsByCode`, `PairedDeviceService`, `PairedDeviceStore` | `RequestHostPolicy` | Host policy reading `PairedDeviceStore` or the sessions map | Extending the pairing service |
| `getNodeBrowserAccess()` | `appConfigProvider` reads, parsing | Host gate, plugin, MCP gateway, local access gate | Any of them reading `AUTOBYTEUS_ALLOWED_*` from config directly | Adding a field to the settings result |
| `sendUserFile` | Header policy | F1–F15 handlers | A handler setting CSP/nosniff or streaming itself | Options on `sendUserFile` |

## Dependency Rules

- `src/api/security/*` may depend on `remote-access/services/remote-access-pairing-service` (the single method), `config`, and `remote-access/domain/models`.
- `src/mcp-gateway` and `src/agent-tools/mcp` may depend on `src/api/security/request-host-name.ts`, `remote-access-request-origin.ts` and `node-browser-access.ts`; never on the plugin or the Host gate.
- `src/api/rest/*` file handlers depend on `user-file-reply.ts`; it depends on Fastify types only.
- Electron: `browser-session-profile.ts` depends on Electron only. `serverRuntimeEnv.ts` gets the dev origin from the launch config, never from `isDev` itself.
- Forbidden: a route handler checking Host or Origin; any module reading `AUTOBYTEUS_ALLOWED_HOSTS`/`_ORIGINS` except `node-browser-access.ts`; renderer code involved in D6.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `registerRemoteAccessHostGate(app: FastifyInstance): void` | Node request | Install the first hook | — | Uses `getNodeBrowserAccess()`, `getRemoteAccessPairingService()` |
| `createRequestHostPolicy({ allowedHostNames, allowedHostSuffixes, isPairedPhoneHost }): { isAllowed(hostHeader: string \| undefined): Promise<boolean> }` | Allowed host | The rule | Raw `Host` header | Missing → `true` |
| `parseRequestHostName(hostHeader: string): string \| null` | Host header | Parse + normalize | Raw header | Moved logic |
| `createRequestOriginPolicy(allowedOrigins)`; `createToolEndpointOriginPolicy(allowedOrigins)` → `{ isAllowed(headers) }` | Allowed origin per listener kind | Origin rules | Request headers | Two named rules, no flag |
| `getNodeBrowserAccess(): { allowedOrigins: string[]; allowedHostNames: ReadonlySet<string>; allowedHostSuffixes: readonly string[] }`; `resetNodeBrowserAccessForTests()` | Settings | Read once | — | — |
| `RemoteAccessPairingService.isPairedPhoneHost(hostname: string): Promise<boolean>` | Paired-phone hosts | Lookup | Normalized hostname | Open (unexpired) sessions + non-revoked devices |
| `sendUserFile(reply, { mimeType: string; body: NodeJS.ReadableStream })` | User file reply | Headers + send | — | — |
| `refuseRemoteAccessRequest(request, reply, rejection, detail?: string)` | Refusal | Reply + log | — | `detail` = "origin X" / "host Y (…hint…)" |
| `isFileDocumentRequest(details: { url; method; resourceType; frame?: { origin } \| null; requestHeaders }): boolean` | Request made by a `file://` document | The D6 rule | Electron `OnBeforeSendHeadersListenerDetails` | Pure; the listener only applies it |
| `EmbeddedServerLaunchConfig.developmentRendererOrigin: string \| null`; `BuildServerProcessEnvInput.developmentRendererOrigin` | Embedded env | Dev origin | Origin string | `null` when packaged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Host policy | Yes | Yes | Low | — |
| Two origin rules | Yes | Yes | Low | Named per listener kind, not a boolean |
| `isPairedPhoneHost` | Yes | Yes | Low | — |
| `sendUserFile` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere (GLOSSARY)? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Allowed host | `RequestHostPolicy`, `AUTOBYTEUS_ALLOWED_HOSTS`, `REMOTE_ACCESS_HOST_REFUSED` | Yes | Yes (new entry, parallel to "Allowed origin") | Low | Add to GLOSSARY |
| Tool endpoint | `createToolEndpointOriginPolicy` | Yes | New narrow term, defined in docs | Low | — |
| User file | `sendUserFile` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Request gate | `api/security` | Extend | Owns the gate | — |
| Refusal reply | `remote-access-policy-plugin.ts` `refuse` | Extend (extract) | One contract for two hooks | — |
| Host parsing | `agent-tools-mcp-local-access.ts`, `mcp-gateway-access.ts` | Extract | Three users | — |
| Private-name classification | `pairing-url-policy.ts` | Not reused | Different fact (phone reachability vs unforgeable by public DNS) | Different classes (`.internal`, `*.ts.net`, IPs of any range) |
| Paired-phone data | Pairing service | Extend | Owner | — |
| Settings | `appConfigProvider` | Reuse (through D8) | — | — |
| Embedded env | `buildServerProcessEnv` | Extend | The one composer | — |
| In-app browser policy | `BrowserSessionProfile.applySessionPolicy` | Extend | The documented hook for this | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/security` | Host gate, rules, settings, parser, refusal | DS-001, DS-004 | Request gate | Extend | — |
| `autobyteus-server-ts/src/remote-access/services` | Paired-phone hosts | DS-001 | Host policy | Extend | — |
| `autobyteus-server-ts/src/mcp-gateway`, `src/agent-tools/mcp` | Use the shared rule and parser | DS-001, DS-004 | — | Modify | — |
| `autobyteus-server-ts/src/api/rest` | User file reply | DS-002 | — | Extend | — |
| `autobyteus-web/electron/browser` | `file://` origin policy | DS-003 | — | Extend | — |
| `autobyteus-web/electron/server`, `application` | Dev renderer origin | DS-005 | — | Extend | — |
| `scripts/development`, `autobyteus-web/tests/e2e` | Launchers | DS-005 | — | Modify | — |

## Final File Responsibility Mapping

| File | Owning Area | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/api/security/remote-access-host-gate.ts` (Add) | security | Host gate | First hook + refusal | One hook | Policy, settings, refusal |
| `src/api/security/remote-access-request-host.ts` (Add) | security | `RequestHostPolicy` | Allowed-host rule | One rule | Parser |
| `src/api/security/request-host-name.ts` (Add) | security | Parser | Host header → name | One parser | `node:net` `isIP` |
| `src/api/security/node-browser-access.ts` (Add) | security | Settings | Read three settings once | One read | — |
| `src/api/security/remote-access-refusal.ts` (Add) | security | Refusal | Reply + log | One contract | `redactSensitiveUrl` |
| `src/api/security/remote-access-request-origin.ts` (Modify) | security | Origin rules | Node and tool-endpoint rules | Both are "allowed origin" | Settings |
| `src/api/security/remote-access-policy-plugin.ts` (Modify) | security | Origin/auth hook | Uses settings and refusal | — | — |
| `src/remote-access/domain/models.ts` (Modify) | remote-access | Codes | Add `REMOTE_ACCESS_HOST_REFUSED` to the failure-code union | — | — |
| `src/remote-access/services/remote-access-pairing-service.ts` (Modify) | remote-access | Pairing | `isPairedPhoneHost` | Owner | Parser |
| `src/mcp-gateway/mcp-gateway-http-helpers.ts`, `mcp-gateway-routes.ts`, `mcp-gateway-access.ts` (Modify) | mcp-gateway | — | Tool-endpoint rule; shared parser | — | Yes |
| `src/agent-tools/mcp/agent-tools-mcp-local-access.ts` (Modify) | agent-tools | Local access gate | Tool-endpoint rule; shared parser | — | Yes |
| `src/compositions/build-studio-server.ts` (Modify) | compositions | — | Register the Host gate first | — | — |
| `src/api/rest/user-file-reply.ts` (Add) | rest | `sendUserFile` | User-file headers + send | One policy | — |
| `src/api/rest/workspaces.ts`, `files.ts`, `context-files.ts`, `run-file-changes.ts`, `team-communication.ts`, `agent-org-references.ts`, `agent-collaboration-references.ts` (Modify) | rest | Routes | Call `sendUserFile` | — | Yes |
| `tests/architecture/user-file-replies.test.ts` (Add) | tests | — | No file route bypasses the owner | — | — |
| `autobyteus-web/electron/browser/browser-session-profile.ts` (Modify) | electron browser | Session policy | Installs the listener | Documented hook | — |
| `autobyteus-web/electron/browser/browser-file-document-request.ts` (Add) | electron browser | `isFileDocumentRequest` | The D6 rule as a pure function of the request details | One rule, unit-testable without a window | — |
| `autobyteus-web/electron/server/embeddedServerLaunchConfig.ts`, `serverRuntimeEnv.ts`, `baseServerManager.ts` (pass-through), `application/electronApplication.ts` (Modify) | electron server | Env composer | Dev renderer origin | — | — |
| `scripts/development/development-runtime.mjs` (Modify) | dev | Launcher | Dev frontend origins | — | — |
| `autobyteus-web/tests/e2e/*.mjs` (~38, Modify) | probes | Each probe | Frontend origin in node env | — | — |
| Docs: `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-server-ts/README.md`, `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`, the in-app browser doc that lists allowed URL schemes (`autobyteus-web/docs/`), `GLOSSARY.md` (Modify) | docs | — | REQ-010 | — | — |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Host header parsing | `request-host-name.ts` | security | 3 users | Yes | Yes | A general URL utility |
| Tool-endpoint origin rule | `remote-access-request-origin.ts` | security | 3 listeners | Yes | Yes | A flag on the node rule |
| User file headers | `user-file-reply.ts` | rest | 15 handlers | Yes | Yes | A file resolver |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `NodeBrowserAccess { allowedOrigins, allowedHostNames, allowedHostSuffixes }` | Yes (`allowedHostNames` = exact names from the three settings; suffixes only from `.x` entries) | Yes | Low | — |

## Applied Patterns

None beyond the existing singleton accessor pattern (`getNodeBrowserAccess`, as `getRemoteAccessRoutePolicy`).

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. No new folders; the flat `api/security` folder already holds the gate's rules and stays readable with five more small files.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification |
| --- | --- | --- | --- | --- |
| `src/api/security` | Transport gate + rules | Yes | Low | Existing home of the gate |
| `src/api/rest/user-file-reply.ts` | Transport | Yes | Low | Next to its 7 callers |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Host rule | `Host: mymac.local:29695` → allowed (class). `Host: evil.example:29695` + `X-Forwarded-Host: 127.0.0.1` → refused | Accepting when `X-Forwarded-Host` is a node name | A rebound page can set `X-Forwarded-Host` |
| Configured names | `AUTOBYTEUS_ALLOWED_HOSTS=node.example.com,.corp.example` → allowed: `node.example.com`, `corp.example`, `a.corp.example`; refused: `other.example.com`, `evilcorp.example` (a `.x` entry covers `x` and every name under it, as Django's `ALLOWED_HOSTS` does) | Treating `.corp.example` as a plain string suffix, which would match `evilcorp.example` | Suffix match on a label boundary |
| User file | `sendUserFile(reply, { mimeType: lookupMime(p) \|\| "application/octet-stream", body: fs.createReadStream(p) })` | `reply.header("Content-Security-Policy", …)` in a handler | One owner (Case 6) |
| Origin rules | `createToolEndpointOriginPolicy(access.allowedOrigins)` | `createRequestOriginPolicy(origins, { allowSameOrigin: false })` | No branching flag (Principle 13) |
| `file://` rule | `about:blank` iframe of a file page opens `new WebSocket(nodeUrl)` → `details.frame.origin === 'file://'` → `Origin: null` → refused. File tab navigated by the address bar to `http://127.0.0.1:29695/rest/workspaces/w/content?path=a.pdf` → `mainFrame` GET → unchanged → displays | Keying on `details.frame.url` (an `about:blank`/`srcdoc` frame escapes, ARCH-REV-001); rewriting every request whose tab shows a file (breaks GET navigations) | Origin is inherited by every document the page creates; its URL is not |
| Electron dev | `developmentRendererOrigin: isDev ? new URL(devStartUrl).origin : null` | Adding the origin through `setRuntimeEnvOverrides` | That map is the browser runtime's, replaced wholesale |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| A setting that restores "any loopback origin" | Developers' convenience | Rejected (DEC-002 = A) | List exact origins |
| An "allow every host" value | Many-name deployments | Rejected (DEC-008) | `.suffix` entries |
| Keeping the per-route sandbox header on F2 next to the owner | Fewer edits | Rejected | F2 uses `sendUserFile` |

## Change / Refactor Sequence

1. Server shared pieces: `request-host-name.ts` (move the parser; switch the two existing users), `node-browser-access.ts` (move `parseConfiguredOrigins`), `remote-access-refusal.ts` (move `refuse`). Existing tests stay green.
2. Origin rules: remove the loopback class; add the tool-endpoint rule; switch the MCP gateway and the local access gate. Update the tests that asserted loopback acceptance.
3. Host rule and gate: `remote-access-request-host.ts`, `isPairedPhoneHost`, `remote-access-host-gate.ts`, the models code; register the gate first in `build-studio-server.ts`. Unit tests (every class, suffix, trailing dot, IPv6, `X-Forwarded-Host` ignored, missing Host) and e2e (AC-001…004, AC-012 incl. WS).
4. User file reply: `user-file-reply.ts`; switch F1–F15; remove `PREVIEW_DOCUMENT_SANDBOX`; architecture test; route tests for headers (AC-007).
5. Launchers: Electron dev origin (launch config → env) with an Electron main-process test; `development-runtime.mjs`; every probe with a frontend; server e2e settings.
6. Electron browser session policy (D6): `isFileDocumentRequest` as a pure function with a unit test over the Entry-Form Table rows (built from `details` fixtures: frame origins, Origin headers, methods, resource types, `frame` absent), plus the http-page control rows. A main-process test installs it on a partition and drives a `file://` page through the measured forms, as `probes/d6-file-origin-forms-probe.js` does. On the isolated desktop instance: AC-010 (a `file://` page and its `about:blank`/`srcdoc` iframes and popup are refused by the embedded node) and the AR-002 check (a node user-file URL opened from a tab showing a `file://` page displays).
7. Docs and GLOSSARY.
8. `probes/reproduce-416.sh`: R1, R2 refused; R3 with both headers.

## Key Tradeoffs

- Name classes over a strict list: no setup step for LAN, tailnet, Docker or phones, at the cost of trusting `.lan` and dotless names (ASM-001).
- The Host gate as its own first hook rather than inside the plugin: it must run before the MCP hook and CORS preflights. One refusal owner keeps the two hooks consistent.
- `sandbox allow-scripts` for every user file rather than a download: opening keeps working everywhere; a walled-off page cannot use storage, the same as 417's preview.
- Fixing D6 on the desktop side: a node cannot tell the packaged renderer from a `file://` page (R4), so it can only be fixed where the page runs.

## Risks

- RSK-001/RSK-002 (setups needing a setting): mitigated by the log hint, docs and release note.
- A probe missed in D7 fails with `REMOTE_ACCESS_ORIGIN_REFUSED`: easy to diagnose. Implementation lists every probe it changed.
- D6 relies on Chromium adding Origin to every non-GET/HEAD request from a web page (rule (c)), which the measured control confirms. If a future Electron changes that, the control probe's case fails in the main-process test, which keeps the control rows.

## Guidance For Implementation

- Reproduction to start from: `bash tickets/in-progress/node-web-page-and-file-security/probes/reproduce-416.sh <new dir>` (header lists the build prerequisites). Before: R1a, R1b, R2a–c accepted; R3a/b without CSP/nosniff. After: R1a/R1b 403 `REMOTE_ACCESS_HOST_REFUSED`, R2a–c 403, R3a–d with `sandbox allow-scripts` and `nosniff`. R1c stays 403. Add a row for a configured origin being accepted.
- Electron facts: `probes/electron-origin-rewrite-and-pdf-probe.js` (PDF), `probes/d6-file-origin-forms-probe.js` and `probes/d6-http-page-control-probe.js` (the D6 rule exactly as written in D6; the implementation's rule must give the same results).
- `isPairedPhoneHost` normalizes stored URL hosts with the same rule as `parseRequestHostName` (lowercase, trailing dot, brackets) before comparing (ARCH-REV-001 R-3).
- An unparseable `Host` is logged in a bounded, escaped form (at most 100 characters, non-printable characters escaped) (R-5).
- The user-file architecture test names `application-backends.ts` among the exclusions if its detector matches it (installed-application backend proxy, R-4).
- Keep refusal log lines free of headers and credentials (QR-001); test the line.
- AC-008/AC-009/AC-010/AC-013 need the isolated desktop instance (TESTING.md).
