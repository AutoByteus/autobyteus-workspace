# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `websocket-origin-and-phone-route-guard`
- Request / ticket: Project Task autobyteus-403 (FU-001 + FU-002 of autobyteus-394)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `User`; reference: user in the Solution Designer conversation, 2026-11-06, after the recommendation "B and keep the phone limit": "thanks. i trust your professinoalism. because you understand my project"
- Exact approved requirements baseline / solution revision: SR-001 with DEC-001 = B (UC-002, REQ-003, AC-003, SCN-002 unconditional) and DEC-010 = keep
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: A node trusts any request without a phone credential, and it never reads the browser's `Origin`. So a web page from any website, opened in a browser on a machine that can reach the node, can open every WebSocket route of the node, including `/ws/terminal` (a root shell in Docker nodes). Its CORS setting also reflects any origin, so the same page can call and read GraphQL over HTTP, where `configureMcpServer` registers a command for the node to run (BEH-001, BEH-002). Separately, a paired phone's credential is accepted on every WebSocket route, the terminal included, although the phone product offers no terminal (BEH-003).
- Affected actors or systems: every node server (embedded, Docker, remote); desktop app; phone `/mobile` shell and its Android/iOS wrappers; peer nodes; application iframes; developers.
- Desired outcome: the node accepts browser connections only from its own clients' origins, and a phone credential only on the WebSocket routes the phone product uses, without breaking any working client.
- Observable definition of success: a page from another origin cannot open any WebSocket route or GraphQL subscription of a node and cannot call its HTTP API; a phone credential is refused on the routes the phone does not offer; desktop app, phone shell, Docker nodes, remote nodes and remote collaboration keep working.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | Any Origin may open any WS route (`/ws/*`, `/graphql`, `/rest/remote/run-observations`) | Only allowed origins (REQ-002) may; others are refused before the route runs | Trusted-network model for requests without Origin | Notes: Source Log, BEH-001 |
| BEH-002 | Contract | SCN-002 | CORS reflects any Origin; a cross-origin page can POST GraphQL and read it | HTTP requests from non-allowed origins are refused; CORS grants only allowed origins | HTTP without Origin (desktop app fetch, peers, native) unchanged | Notes: cors probe |
| BEH-003 | Contract | SCN-005 | A phone credential is accepted on every WS route | Accepted only on the phone's WS routes (REQ-004) | Phone credential on HTTP REST/GraphQL unchanged; revoked/disabled handling unchanged | Notes: Phone WebSocket route use |
| BEH-004 | User | SCN-003 | Desktop app (`file://` renderer) uses embedded, Docker, remote nodes | Unchanged | All | Probe |
| BEH-005 | User | SCN-004 | Phone `/mobile` (LAN HTTP, Tailscale Serve HTTPS, Docker port, Android/iOS WebView) | Unchanged | All | remote_access.md; Tailscale serve.go |
| BEH-006 | System | SCN-006 | Peer nodes use `/rest/remote/*` and its WS with no Origin | Unchanged | All | Probe |
| BEH-007 | User | SCN-008 | App iframes (node origin) use `/ws/applications/…` on the desktop app | Unchanged | All | Notes |
| BEH-008 | Operational | SCN-007 | Development and e2e: browser shell at a loopback origin talks to a node on another port | Unchanged | All | Notes |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Node owner (user) | Keep the node from being driven by websites | Cross-origin pages refused | No working setup breaks without the user's say |
| Desktop app | Use nodes | Unchanged | Renderer origin `file://` (packaged) / loopback (dev) |
| Phone (paired) | Use its runs, files, desktop view | Unchanged on its routes | Its routes come from the mobile code |
| Peer node | Remote collaboration | Unchanged | Sends no Origin |
| Attacker web page | — | Refused | Cannot set Origin/Host/X-Forwarded-Host |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Refuse WebSocket connections from non-allowed browser origins on every node WS route | SCN-001, SCN-003, SCN-004, SCN-006, SCN-007, SCN-008, SCN-009 |
| UC-002 | Refuse HTTP requests from non-allowed browser origins and stop granting them CORS | SCN-002, SCN-003, SCN-004, SCN-007 |
| UC-003 | Refuse a paired phone's credential on WS routes the phone product does not offer | SCN-004, SCN-005 |

### Out Of Scope

- The trusted-network model itself: requests without Origin and without credential stay trusted (RSK-003); requiring credentials from desktop/LAN clients is a separate product design (remote_access.md:117).
- DNS-rebinding defence (Host allowlist) — follow-up FU-001.
- Same-origin content risks (HTML preview iframe; application bundles at the node's origin) — follow-up FU-002.
- Operation-level limits on what a phone may do over HTTP REST/GraphQL.
- The standalone application server (`/_autobyteus/…`; it has its own Origin check) and the message gateway's CORS (follow-up FU-003).

### Non-Goals

- No new client behavior: the desktop app, phone shell and wrappers are not changed (except docs).

### Preserved Behavior Boundary

- BEH-004…BEH-008 in full; phone credential handling on HTTP; owner (`TRUSTED_NETWORK_OWNER`), peer (`REMOTE_PEER`) and loopback-only rules; existing WS close codes 4401/4403/4404 and their reasons; `/ws/node-desktop` stays open to phones (S3, autobyteus-407).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every WebSocket upgrade to the node server, on any path (all `/ws/*`, `/graphql`, `/rest/remote/run-observations`, and routes added later), is refused before its route handler runs when it carries an Origin that is not allowed (REQ-002). No socket opens and nothing route-specific starts (no terminal session, no stream). | BEH-001 | Must | One gate for every upgrade, so no route can be forgotten | N/A | Task FU-001; DEC-002 |
| REQ-002 | Allowed origins: (a) no `Origin` header (non-browser clients); (b) same origin: the Origin's host[:port] equals the request's `Host` or `X-Forwarded-Host`, case-insensitive, scheme not compared; (c) exactly `file://` (packaged desktop app); (d) `http`/`https` loopback origins `localhost`, `127.0.0.0/8`, `[::1]`, any port (development, e2e); (e) origins listed exactly in an optional node setting (default empty). Everything else is refused, including `null`, other schemes and malformed values. | BEH-001, BEH-002, BEH-004…BEH-008 | Must | Each class is a measured or read client; nothing else is a client | Measured: Electron `file://`, sandboxed iframe/Chrome file `null`, Node peer none; Read: Tailscale Host preserved | DEC-003, DEC-004, DEC-005 |
| REQ-003 | Every HTTP request carrying a non-allowed Origin, preflight included, is refused (403) before its handler; CORS headers are granted only to allowed origins. HTTP requests without Origin behave as today. | BEH-002 | Must | Otherwise the same page reaches the same powers over GraphQL | Measured: CORS reflection today | DEC-001 |
| REQ-004 | A paired phone credential is accepted only on the phone's WS routes: `/ws/agent/…`, `/ws/agent-team/…`, `/ws/agent-org/…`, `/ws/agent-collaboration/…`, `/ws/projects`, `/ws/agent-package-definitions`, `/ws/file-explorer…`, `/ws/node-desktop`. On every other WS route (today `/ws/terminal…`, `/ws/update-notifications`, `/ws/applications/…`, `/graphql`) it is refused, and a WS route added later is refused to phones until it is added to the phone list. | BEH-003 | Must | Phase Two of remote_access.md; deny by default | N/A | Task FU-002; DEC-006, DEC-007 |
| REQ-005 | Refusals are distinct and log-safe: an origin refusal fails the handshake (HTTP 403) with a stated reason; a phone-route refusal closes with 4403 and its own reason; the log line names the route (redacted) and reason and never contains a credential, `access_token` or authorization header. | BEH-001, BEH-003 | Must | Clients and support can tell refusals apart; no secrets in logs | N/A | Task constraint; DEC-008 |
| REQ-006 | Preserved: desktop app on embedded, Docker and remote nodes; phone shell over LAN HTTP, Tailscale Serve HTTPS, a Docker published port and the Android/iOS wrappers; peer collaboration; app iframes; development and e2e. | BEH-004…BEH-008 | Must | Task constraint | Measured/Read per class | Task |
| REQ-007 | Automated tests show, per route family, allowed and refused origins, and the phone credential allowed and refused per route. | BEH-001…BEH-003 | Must | Done-when | N/A | Task |
| REQ-008 | `remote_access.md` states the Origin rule (incl. the setting) and that phone credentials are refused on the WS routes the phone does not offer (Phase Two done for WebSockets). | — | Should | Docs are the product contract | N/A | DEC-009 |

## Acceptance Criteria

| AC ID | Related REQ | Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001 | Upgrade with `Origin: https://evil.example` and with `Origin: null` to `/ws/terminal/<id>`, one other `/ws/*` route, `/graphql`, `/rest/remote/run-observations` | Handshake refused (403); no route handler runs (no terminal session created) | — | Server tests with real upgrades on an isolated server |
| AC-002 | REQ-002 | SCN-003/004/006/007/009 | Upgrades with no Origin; `file://`; Origin host = Host; Origin `https://x.ts.net` with Host `x.ts.net`; Origin = X-Forwarded-Host with a different Host; `http://localhost:3000`; a configured origin | Each accepted and reaches the route's normal authorization | A near miss (`https://x.ts.net.evil.example`, `file:///x`, other port) refused | Server tests |
| AC-003 | REQ-003 | SCN-002 | Preflight and POST `/graphql` with `Origin: https://evil.example`; same with an allowed origin; POST without Origin | Foreign: 403, no CORS grant, handler not run; allowed: CORS granted as today; no Origin: as today | — | Server tests |
| AC-004 | REQ-004, REQ-005 | SCN-005 | Valid phone credential on `/ws/terminal…`, `/ws/update-notifications`, `/ws/applications/<id>/…` (each of the 3), `/graphql` upgrade | Refused (WS: close 4403 with the phone-route reason; `/graphql`: 403); no handler work | — | Server tests |
| AC-005 | REQ-004 | SCN-004 | Valid phone credential on each phone route | Accepted as today | Revoked/disabled credential still refused with today's codes | Server tests |
| AC-006 | REQ-005 | SCN-001, SCN-005 | Refusals above | Logs contain route and reason, no `mra_` value, `access_token` or authorization | — | Test asserts on captured log output |
| AC-007 | REQ-006 | SCN-003, SCN-008 | Desktop app built from the branch with an isolated embedded node and an isolated Docker/remote node | Run streaming, terminal, file explorer, app iframe WS work | — | Executable validation (Electron) |
| AC-008 | REQ-006 | SCN-004 | Phone shell served by an isolated node, paired; reached over LAN HTTP and through a Host-preserving HTTPS proxy shaped like Tailscale Serve | Run list, run screen streaming (agent, team, org), delegated tree, Files, New run work; no refused WS in the node log | — | Executable validation (browser/WebView) |
| AC-009 | REQ-006 | SCN-006 | Two isolated nodes collaborating | Remote run observation and peer REST work | — | Executable validation |
| AC-010 | REQ-008 | — | Docs | remote_access.md updated | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Contract | Goal Or Event | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Attacker page (security contract of the node) | Open a node WS from another origin | User visits a malicious site in a browser on a machine that reaches the node | Node reachable | Page opens `ws://<node>/ws/terminal/<id>` (or any WS) | Refused, nothing runs | — | Supported Explicit Edge Scenario (security) | FU-001; probe | REQ-001/002, AC-001 |
| SCN-002 | Contract | Attacker page | Call node HTTP/GraphQL cross-origin | Same | Same | Preflight + POST `/graphql` | Refused | — | Supported Explicit Edge Scenario (security) | cors probe | REQ-003, AC-003 |
| SCN-003 | User | Desktop app | Work with embedded, Docker, remote nodes | App window | Node registered | WS (`file://`), HTTP (no Origin) | Works | — | Supported Normal | Probe | REQ-006, AC-007 |
| SCN-004 | User | Paired phone | Use runs, files, desktop view | `/mobile` via LAN / Tailscale Serve / Docker port / wrappers | Paired | Same-origin WS with `access_token` on phone routes | Works | Revoked → today's 4403 | Supported Normal | remote_access.md | REQ-004/006, AC-005/008 |
| SCN-005 | Contract | Holder of a phone credential | Open a route the phone does not offer | WS with `access_token=mra_…` | Valid credential | Open `/ws/terminal…` | Refused 4403 | — | Supported Explicit Edge Scenario (remote_access.md Phase Two) | remote_access.md:184 | REQ-004/005, AC-004 |
| SCN-006 | System | Peer node | Remote collaboration | Run on another node | Peers configured | `/rest/remote/*` and its WS, no Origin | Works | — | Supported Normal | Probe | REQ-006, AC-009 |
| SCN-007 | Operational | Developer / e2e | Run the web shell against a node | `pnpm dev`, Electron dev, e2e probes | Loopback origin | WS/HTTP from `http://localhost:<port>` | Works | — | Supported Normal (development) | package.json | REQ-002d |
| SCN-008 | User | Application in the desktop app | App frontend talks to its backend | Open an application | App installed | Iframe at node origin opens `/ws/applications/…` | Works | — | Supported Normal | Notes | REQ-006, AC-007 |
| SCN-009 | Operational | Owner behind a reverse proxy/gateway | Phone through a gateway (e.g. base path) | Gateway URL | Gateway rewrites Host | Same-origin via X-Forwarded-Host, or configured origin | Works | — | Supported Explicit Edge Scenario (remote_access.md:88-94 base paths) | remote_access.md | REQ-002b/e, AC-002 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A — not applicable (no UI change; docs only).

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001…REQ-004, AC-001…AC-005 | Security | Refusal happens before any route handler work | All node WS routes | Tests |
| QR-002 | REQ-005, AC-006 | Privacy | No credential, `access_token` or authorization value in logs | Refusal paths | Tests |
| QR-003 | REQ-006, AC-007…AC-009 | Compatibility | No change visible to existing clients | Listed clients | Executable validation |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Browser Origin header | Set by the browser on every WS handshake and CORS request; not settable by page script | Standards; probe | — |
| Tailscale Serve | Preserves Host; sets X-Forwarded-Host | tailscale serve.go | Other proxies: REQ-002b/e |
| `@fastify/websocket`, `@fastify/cors` | Hook before upgrade; `origin` function | Packages | Verify in design |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/origin-probe/` | Measured client origins, CORS reflection | REQ-002, REQ-003 | Current | Evidence, not behavior-defining |
| `follow-ups.md` | Out-of-ticket findings | — | Current | N/A |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | No shipped client opens node WS/HTTP from an origin other than REQ-002's classes | Otherwise it breaks | Investigation (done); executable validation AC-007…AC-009 | Supported by evidence |
| ASM-002 | The phone uses no WS route outside REQ-004's list | Otherwise a phone view breaks | Static trace (done); AC-008 | Supported by evidence |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Does this ticket also close cross-origin **HTTP** (CORS reflects any origin)? | The Task names WebSockets, but a website can do the same harm over GraphQL HTTP: measured CORS reflection; `configureMcpServer` takes a stdio command | (A) WS only; HTTP becomes an urgent follow-up. (B) Apply the same allowed-origin rule to HTTP: refuse requests with a foreign Origin, grant CORS only to allowed origins | The same rule, the same place, small extra change; without it the Task's threat ("a web page runs commands on the node") stays open by one POST. Breakage risk is low: the desktop app's fetch sends no Origin (measured), the phone is same-origin, peers and native send none. **Recommend B.** | User (scope + security) | Decided by the user: **B** (2026-11-06) |
| DEC-002 | Where does the Origin rule apply? | A per-route check can be forgotten | Per handler vs one gate for every upgrade | One gate before routing for every upgrade, whatever the path; covers `/graphql` and the peer WS too | Solution Designer | Decided |
| DEC-003 | Same origin behind proxies | Phone via Tailscale Serve is HTTPS outside, HTTP inside | Compare scheme+host vs host only; Host vs X-Forwarded-Host | Host only (as the standalone server and common WS servers do); accept Host or X-Forwarded-Host — a page cannot set either | Solution Designer | Decided |
| DEC-004 | Loopback origins (any port) | Development, Electron dev and e2e use `http://localhost:<port>` | Always / never / dev only | Allow always: the node cannot tell a dev setup, and a page served from the browser machine's localhost needs code already running on that machine, which reaches the node anyway | Solution Designer | Decided (Task direction) |
| DEC-005 | A setting for extra allowed origins | A gateway that rewrites Host and sends no X-Forwarded-Host would break | Add an optional, empty-by-default node setting (exact origins) | Cheap safety valve for "do not break working setups"; no UI | Solution Designer | Decided |
| DEC-006 | Phone WS list: allow-list or deny-list | Future routes | Allow-list (deny by default) | remote_access.md: any future phone surface needs its own security design | Solution Designer | Decided |
| DEC-007 | Phone credential on `/graphql` WS | No client uses GraphQL over WS; phones use GraphQL over HTTP | Allow / refuse | Refuse (deny by default); phone HTTP GraphQL unchanged | Solution Designer | Decided |
| DEC-008 | Refusal shape | Clients react to close codes (4401 → re-pair) | Origin: HTTP 403 at handshake; phone route: 4403 with a new reason | 403 before upgrade (no client expects it); 4403 = forbidden, not "re-pair"; reason names exact codes in design | Solution Designer | Decided |
| DEC-009 | Docs | Phase Two is tracked in remote_access.md | Update | Update the doc | Solution Designer | Decided |
| DEC-010 | Limits of the phone-route refusal (RSK-003) | Under the trusted-network model a client that drops the credential is trusted; the refusal stops a phone credential, the Origin rule stops web pages | Keep as specified / drop | Keep: Phase Two contract, defence in depth, and the base for any later credential requirement. The user is informed | Solution Designer; confirmed by the user (keep, 2026-11-06) | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | Notes |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002, BEH-004…008 | AC-001, AC-002 | SCN-001, 003, 004, 006, 007, 009 | Probe |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002 | cors probe |
| REQ-004 | UC-003 | BEH-003 | AC-004, AC-005 | SCN-004, SCN-005 | Phone route table |
| REQ-005 | UC-001, UC-003 | BEH-001, BEH-003 | AC-004, AC-006 | SCN-001, SCN-005 | — |
| REQ-006 | UC-001…003 | BEH-004…008 | AC-007…AC-009 | SCN-003, 004, 006, 008 | — |
| REQ-007 | UC-001…003 | BEH-001…003 | AC-001…AC-006 | — | — |
| REQ-008 | UC-001, UC-003 | — | AC-010 | — | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-009.
- Constraints to preserve: trusted-network model; owner/peer/loopback rules; close codes; phone HTTP access; `/ws/node-desktop` for phones; no client changes.
- Deferred to architecture: hook placement and order vs `@fastify/websocket`/`@fastify/cors`; owners of the allowed-origin rule and of the phone WS route list; reason codes; setting name and parsing; test placement.
- Technical facts to verify: an `onRequest` reply on a `/ws/*` upgrade returns 403 and opens no socket; CORS `origin` function interplay with the HTTP refusal; that the MCP gateway routes registered before CORS are covered.
- Known risks: RSK-001…RSK-004 (notes).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
