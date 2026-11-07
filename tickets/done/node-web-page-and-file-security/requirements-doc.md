# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (requirements unchanged since SR-001)
- Package identifier: `node-web-page-and-file-security`
- Request / ticket: Project Task autobyteus-416 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-07
- Approved by and reference: `User`, 2026-11-07, in the Solution Designer conversation, answering DEC-001 and DEC-002 as presented with recommendations: "i trust your judgement, you understand more than me actually". Recorded as: DEC-001 = A, DEC-002 = A (the recommendations)
- Exact approved requirements baseline / solution revision: SR-001 with DEC-001 = A, DEC-002 = A
- Behavior-defining supplements and their approved versions: none (evidence only; see investigation notes)

## Problem And Desired Outcome

- Problem: a node gives full rights (GraphQL, `/ws/terminal`, runs, MCP tools) to any request it takes for its own page or the desktop app. Four ways reach that today, all reproduced or measured (investigation notes, BEH-001…004):
  1. **DNS rebinding.** A page whose name the attacker re-points at the node passes as same-origin, because the node never checks the name it was addressed by.
  2. **Localhost pages.** A page served from any localhost port passes, for example a dev server an agent starts and opens in the in-app browser. This also holds on `/mcp/gateway` and the node's internal listeners.
  3. **User files at the node's origin.** An HTML or SVG file opened top-level from a node file route runs as a node page.
  4. **`file://` pages in the in-app browser.** A local HTML file opened there looks exactly like the desktop app to the node.
- Affected actors or systems: every node (embedded, Docker, remote); the desktop app and its in-app browser; the phone shell; peer nodes; developers and tests.
- Desired outcome: none of the four reaches a node with the app's rights, while every supported client and workflow keeps working, under one rule set for "which pages a node treats as its own".
- Observable definition of success: the attack requests of the reproduction probe are refused or rendered harmless, and the preserved journeys (AC-011…AC-014) pass.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | Any `Host` accepted; a re-pointed page gets 200 on POST and same-origin GET | Requests addressed to a name that is not the node's are refused before any handler | Requests addressed to the node's own names behave as today | R1a, R1b |
| BEH-002 | Contract | SCN-002 | Origins `http(s)://localhost|127.x|[::1]:<any port>` accepted by the main gate, `/mcp/gateway` and the internal listeners | A localhost origin is accepted only when it is allowed under DEC-002 | Requests with no Origin, the node's own origin, `file://` from the desktop app, configured origins | R2a–R2c |
| BEH-003 | Contract | SCN-003 | User files served with their own type at the node's origin; HTML/SVG run as node pages | No user file runs as a document with the node's origin | The file still displays when opened; viewers unchanged | R3a–R3d, route inventory F1–F16 |
| BEH-004 | Contract | SCN-004 | A `file://` page in the in-app browser sends what the desktop app sends; the node accepts it | Such a page cannot reach any node with the app's rights | The page still loads and runs in the in-app browser | R4 |
| BEH-005…010 | User / System / Operational | SCN-005…SCN-009 | Desktop, phone, peers, Docker, dev/test, viewers, agent-started local server: work | Unchanged | All | investigation BEH-005…010 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user (node owner) | Use nodes from the desktop, phone and other nodes | Web pages and files cannot take over a node; working setups keep working | Decides any rule that could stop a setup (DEC-001, DEC-002) |
| Agents | Start servers, open pages and files in the in-app browser | Their pages still show and work | Those pages get no node rights |
| Developers / tests | Dev stack, Electron dev, browser probes, e2e | Keep working without manual steps | No secrets in logs; isolated nodes |
| Attacker | A web page or a file the user opens | Refused or harmless | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A node refuses requests addressed to a name that is not one of its own (DNS rebinding) | SCN-001, SCN-005…SCN-007 |
| UC-002 | A node accepts localhost pages only under the localhost rule (main gate, `/mcp/gateway`, internal listeners) | SCN-002, SCN-008, SCN-009 |
| UC-003 | Node routes that serve user files never run them as documents with the node's origin | SCN-003, SCN-009 |
| UC-004 | A `file://` page in the in-app browser cannot reach a node with the app's rights | SCN-004 |
| UC-005 | The owner configures extra names and origins; refusals are clear and logged safely | SCN-005, SCN-006 |

### Out Of Scope

- LAN devices reaching a node directly: the trusted-network model is unchanged (403 RSK-003). A credential for trusted-network clients is a separate requirement.
- The standalone application host's own WebSocket rule (FU-001), the message gateway's CORS (403 FU-003, already sent), and installed applications' assets and backends (designed to run at the node's origin).
- Phone-route limits (403), the HTML preview iframe (417), and the phone pairing URL rules.

### Non-Goals

- No settings UI for names or origins (a node setting, as `AUTOBYTEUS_ALLOWED_ORIGINS` is today).
- No protection against code already running on the machine as the user.

### Preserved Behavior Boundary

BEH-005…BEH-010 and AC-011…AC-014. Cross-cutting invariants: a request with no `Host` header, and a non-browser client (no Origin) addressed by one of the node's names, behave as today. 403's Origin rule (REQ-002 there) holds except for the loopback class that DEC-002 replaces.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every HTTP request and WebSocket upgrade to a node's main listener, on any path, whether or not it carries an Origin, is refused before its handler when its `Host` name is not one of the node's names (REQ-002). `X-Forwarded-Host` is not used for this check. A request with no `Host` header behaves as today. | BEH-001 | Must | A re-pointed page sends the attacker's name as Host and can set `X-Forwarded-Host` (it is same-origin with itself); same-origin GETs carry no Origin | N/A | Task item 1; DEC-005 |
| REQ-002 | The node's names (port not compared), DEC-001 = A: (a) any IP address; (b) `localhost` and `*.localhost`; (c) local names public DNS cannot give an attacker: dotless names and names ending `.local`, `.lan`, `.home.arpa` or `.internal` (incl. `host.docker.internal`); (d) names ending `.ts.net`; (e) the hosts of `AUTOBYTEUS_SERVER_HOST`, of `AUTOBYTEUS_ALLOWED_ORIGINS` entries, of the node's open pairing sessions and of its non-revoked paired phones; (f) names in a new node setting `AUTOBYTEUS_ALLOWED_HOSTS`. | BEH-001, BEH-005…007 | Must | Each class is either unforgeable through public DNS or a name the owner chose | Web: Tailscale public `ts.net` records point only to Funnel relays | DEC-001 (Needs user), DEC-008 |
| REQ-003 | `AUTOBYTEUS_ALLOWED_HOSTS` (environment or the node's `.env`, read at start, default empty): comma-separated names; an entry starting with `.` also covers every name under it (`.example.com`). Invalid entries are ignored with one warning at start. | BEH-001 | Must | The way for a reverse proxy, DNS-named peer or Docker service name | N/A | DEC-001, DEC-008 |
| REQ-004 | A loopback Origin (`localhost`, `127.0.0.0/8`, `[::1]`, any scheme and port) is accepted only as DEC-002 = A sets, on the main gate, `/mcp/gateway`, and the agent-tools and credential-proxy listeners: never by default; only when listed exactly in `AUTOBYTEUS_ALLOWED_ORIGINS`. Each listener also accepts requests with no Origin, as today. The main gate also keeps the node's own origin and `file://`. | BEH-002 | Must | Any localhost port can be untrusted content | N/A | Task item 2; DEC-002 (Needs user), DEC-007 |
| REQ-005 | The launchers this repository owns keep working without manual steps: Electron development mode, the development stack, the browser probes that run a frontend against a probe-owned node, and the server e2e. Each tells its node the exact origin of the frontend it serves. | BEH-008 | Must | Development and tests must not need hand edits | N/A | DEC-002 |
| REQ-006 | Refusals are distinct and log-safe: a Host refusal answers 403 with code `REMOTE_ACCESS_HOST_REFUSED` before any handler (the WebSocket handshake fails). The node logs one line per refusal naming the refused host, the redacted route and the setting to use, never a credential, `access_token` or authorization header. Origin refusals keep `REMOTE_ACCESS_ORIGIN_REFUSED`. | BEH-001, BEH-002 | Must | Owners can fix a refused setup from the log; no secrets in logs | N/A | DEC-006; Task constraint |
| REQ-007 | Every node route that returns a user file's content (inventory F1–F15; F16 already complies, and any such route added later) answers so that the file never runs as a document with the node's origin, whatever the file type and wherever it is opened (tab, in-app browser, an agent's browser tool). All of them send `X-Content-Type-Options: nosniff`. | BEH-003 | Must | HTML, SVG and XML files run scripts when opened top-level | N/A | Task item 3; DEC-003 |
| REQ-008 | The in-app viewers keep working as today: PDF, Excel, image, video, audio, Markdown, text/code and the HTML preview. A file the app opens top-level keeps displaying, PDFs included: attachments in the in-app browser, media-page documents. An HTML file opened top-level still displays and runs its scripts, walled off from the node, as in 417's preview. | BEH-009 | Must | Do not break the viewers | Web: a sandbox CSP may block Chrome's PDF viewer; architecture measures it (UNK-001) | Task item 3; DEC-003 |
| REQ-009 | A page loaded from a `file://` URL in the in-app browser (by the user or an agent's browser tool) cannot reach any node with the app's rights: its requests and WebSockets are refused by nodes as a foreign page's would be. The page still loads and runs. | BEH-004 | Must | Electron sends what the desktop app sends (measured) | Measured: R4; mechanism verified in design (UNK-002) | Done-when "no user file runs as a document with the node's rights"; DEC-004 |
| REQ-010 | The node's remote-access documentation and README state the Host rule, `AUTOBYTEUS_ALLOWED_HOSTS`, the changed localhost rule and the user-file headers. A release note states who must add a setting (from RSK-001/RSK-002). | — | Should | Docs are the product contract; owners must know before upgrading | N/A | DEC-009 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-006 | BEH-001, SCN-001 | Isolated node; `Host: evil.example:<port>` with and without `Origin: http://evil.example:<port>`; POST `/graphql`, GET a workspace file, WS upgrade to `/ws/terminal`, `/graphql` WS | 403 `REMOTE_ACCESS_HOST_REFUSED`; no handler runs, no socket opens; one log line with the host and no secret | The same with `X-Forwarded-Host` set to a node name: still refused | Server e2e (real HTTP + WS) + `reproduce-416.sh` R1 |
| AC-002 | REQ-002 | BEH-005…007, SCN-005…SCN-007 | Requests addressed to each class of REQ-002 (as approved): IPv4, IPv6, `localhost`, `x.localhost`, dotless, `.local`, `.lan`, `.home.arpa`, `host.docker.internal`, `x.ts.net`, `AUTOBYTEUS_SERVER_HOST` host, a paired phone's host, an open pairing session's host | Accepted as today | A public name not in any class: refused | Unit (rule) + server e2e |
| AC-003 | REQ-003 | SCN-006 | `AUTOBYTEUS_ALLOWED_HOSTS=node.example.com,.corp.example` | `node.example.com` and `a.corp.example` accepted; `other.example.com` refused; invalid entries ignored with one start warning | — | Server e2e |
| AC-004 | REQ-002 | SCN-005 | Phone shell via a Host-preserving Tailscale-Serve-shaped proxy (`Host: x.y.ts.net`), and via a company URL set in `AUTOBYTEUS_SERVER_HOST` | `/mobile` loads; GraphQL and the phone WebSockets work | — | Server e2e or browser probe (as 403 AC-008) |
| AC-005 | REQ-004 | BEH-002, SCN-002 | Origins `http://localhost:5173`, `http://127.0.0.1:8080`, `http://[::1]:3000` on POST `/graphql`, WS `/ws/terminal`, POST `/mcp/gateway`, the agent-tools and credential-proxy listeners | Refused by each (main gate `REMOTE_ACCESS_ORIGIN_REFUSED`; the MCP/internal listeners their own 403) unless allowed under DEC-002 | An origin listed in `AUTOBYTEUS_ALLOWED_ORIGINS`: accepted | Server e2e + unit + `reproduce-416.sh` R2 |
| AC-006 | REQ-005 | BEH-008, SCN-008 | Electron dev mode; `pnpm dev` stack; a representative browser probe against a probe-owned node; server e2e suites | Each works with no manual setting | — | Run each once; Electron main-process test for the env composition |
| AC-007 | REQ-007 | BEH-003, SCN-003 | Each route F1–F15 serving `x.html`, `x.svg`, `x.xml` | Every response carries `nosniff` and a policy under which the file cannot run with the node's origin (sandboxed opaque origin, or not rendered as a document) | — | Server tests per route + `reproduce-416.sh` R3; a browser check that a top-level HTML file has an opaque origin and is refused by the node |
| AC-008 | REQ-008 | BEH-009, SCN-009 | In the app: PDF, Excel, image, video, audio, Markdown, text, HTML preview; an attachment and a media-page PDF opened top-level | All display as before; the top-level PDF renders | — | Browser probe / isolated desktop instance |
| AC-009 | REQ-008 | SCN-003 | An HTML file opened top-level from F1 in the in-app browser | It displays and its scripts run; a request from it to the node is refused (opaque origin) | — | Isolated desktop instance or browser probe |
| AC-010 | REQ-009 | BEH-004, SCN-004 | A `file://` HTML page in the in-app browser POSTs to the embedded node's `/graphql` and opens `/ws/terminal` | Both refused; the page itself loads | The desktop app's own renderer (`file://`) still works | Isolated desktop instance (+ Electron main-process test) |
| AC-011 | REQ-001, REQ-004 | BEH-005, SCN-007 | Packaged desktop app with its embedded node, a Docker node at `localhost:<port>` and a remote node by IP or `.local` name | All work as today | — | Isolated desktop instance; test-owned Docker container |
| AC-012 | REQ-001 | BEH-007, SCN-007 | Two nodes collaborating (peer HTTP + run-observation WS) by IP, `host.docker.internal`, `.local` | Works as today | A peer by a public DNS name not configured: refused with the logged hint | Server e2e (two nodes) |
| AC-013 | REQ-004, REQ-008 | BEH-010, SCN-009 | An agent-started (or test) server on `localhost:<p>` opened in the in-app browser | The page and its own server work; its requests to the node are refused | — | Isolated desktop instance |
| AC-014 | REQ-010 | — | Docs and release note | They state the rules and the settings, and who must act | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract (security) | Attacker web page | Take over a node by DNS rebinding | User visits the attacker's site | Node reachable on a known port | Page loads from `evil.example`; DNS re-pointed to the node; page POSTs/GETs/opens WS | Refused (Host) | — | Supported Explicit Edge Scenario (security contract) | R1a/R1b; Task item 1 | REQ-001, AC-001 |
| SCN-002 | Contract (security) | A page on a localhost port | Reach the node from untrusted local content | Agent starts a dev server and opens it in the in-app browser, or any local browser | Embedded node running | Page calls GraphQL/WS/MCP | Refused unless allowed (DEC-002) | Listed origin accepted | Supported Explicit Edge Scenario | R2a–c; 417 FU-001 | REQ-004, AC-005, AC-013 |
| SCN-003 | Contract (security) | A user/agent opens a file | Open an HTML/SVG file served by the node | In-app browser, tab, agent's browser tool | File in a workspace, an attachment, an upload | Open the route URL top-level | Displays, cannot act as the node | — | Supported Explicit Edge Scenario | R3; 417 FU-002 | REQ-007, REQ-008, AC-007, AC-009 |
| SCN-004 | Contract (security) | A user/agent opens a local HTML file | Open `file:///…/x.html` in the in-app browser | In-app browser (allows `file:`) | Desktop app | Page runs, calls the node | Refused; page still loads | — | Supported Explicit Edge Scenario | R4; Task done-when | REQ-009, AC-010 |
| SCN-005 | User | Phone owner | Use the phone shell | LAN/tailnet/Tailscale Serve/company URL; wrappers | Paired phone | Open `/mobile`, run screens | Works | — | Supported Normal Scenario | 403 BEH-005 | REQ-002, AC-004 |
| SCN-006 | Operational | Node owner behind a reverse proxy or with DNS names | Reach a node by a domain name | Proxy preserving Host; desktop/peer entry by DNS name | Name not in the automatic classes | Add the name to `AUTOBYTEUS_ALLOWED_HOSTS`, restart | Works; until then refused with a log hint | — | Supported Normal Scenario | Docs; RSK-001 | REQ-003, REQ-006, AC-003 |
| SCN-007 | User / System | Desktop user; peer node | Use embedded, Docker and remote nodes; collaborate | Desktop app; remote collaboration | — | As today | Works | — | Supported Normal Scenario | 403 BEH-004/006 | AC-011, AC-012 |
| SCN-008 | Operational | Developer, tests | Develop and test | Electron dev, `pnpm dev`, probes, e2e | — | As today | Works without manual steps | — | Supported Normal Scenario | development-runtime.mjs; probes | REQ-005, AC-006 |
| SCN-009 | User | User and agents | View files; see an agent-started local server | Viewers; in-app browser | — | As today | Works | — | Supported Normal Scenario | viewers; 417 | REQ-008, AC-008, AC-013 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. No screen changes. The only visible effects are the refusals in REQ-006 and, for an HTML file opened top-level, the walled-off page of REQ-008 (as in 417's preview).
- Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006 | Security / Privacy | No credential, `access_token`, authorization header or file content in any refusal log line | All refusals | Test asserts the log line |
| QR-002 | REQ-001 | Performance | The Host check adds no network lookup to a request (name sources resolved off the request path) | Every request | Design; review |
| QR-003 | REQ-001…009 | Compatibility | AC-011…AC-013 pass | Release | As listed |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Paired phones and pairing sessions are read, not changed.
- Data that must be preserved: all. Nothing is reset. Rollback: install an earlier version; no stored data changes.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Browser Host/Origin behavior | Host set by the browser; no Origin on same-origin GET | Fetch standard; R1b | — |
| Electron `file://` header behavior | No Origin on fetch, `file://` on WS | R4 | Re-measured by the test on upgrade |
| Chrome PDF viewer | Must render top-level PDFs from the node | Web | UNK-001 |
| Tailscale `ts.net` | Public names resolve only to relays | Web | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/reproduce-416.sh`, `evidence/R-reproduce-416-base.txt` | Reproduction | AC-001, AC-005, AC-007 | Current | Evidence only |
| `probes/electron-file-origin-probe.js`, `evidence/R4-electron-file-origin.json` | Measurement | AC-010 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | `.lan` and dotless names are not obtainable by an internet attacker through public DNS | REQ-002(c) | `.lan` is not delegated in the root zone; dotless public names are prohibited by ICANN. Same classification the pairing already uses | Accepted |
| ASM-002 | No shipped product surface calls a node from a localhost page other than our own launchers | REQ-004/005 | Investigation (devkit, Docker image, app iframes, VNC): none found | Accepted; release note covers anything unknown |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which names does a node accept as its own, and how are others configured? | Too narrow breaks setups (RSK-001); too wide leaves rebinding open | (A) Automatic classes (REQ-002 a–e) + `AUTOBYTEUS_ALLOWED_HOSTS`. (B) Only IPs, `localhost` and configured names (strict, like the MCP SDKs): every `.local`, tailnet and Docker name must be configured. (C) Automatic classes without `*.ts.net`: only the node's own reverse-looked-up Tailscale name, which a Docker node cannot see | Rebinding needs a name the attacker controls in public DNS. IPs, `localhost`, special-use names and `ts.net` names are not such names, and paired-phone and configured URLs are names the owner chose. (A) blocks every rebinding page and keeps LAN, tailnet, Tailscale Serve, Docker and phones working with no step. Only names under public domains that the node cannot learn need the setting, the case 403's release note already handles for origins. **Recommend A.** | User | Decided by the user: **A** (2026-11-07) |
| DEC-002 | When is a page from a localhost port accepted? | Changes 403's approved DEC-004 | (A) Never by default; only exact origins listed in `AUTOBYTEUS_ALLOWED_ORIGINS`; our launchers list their frontend automatically (REQ-005). (B) Any localhost port, but only on development nodes (`APP_ENV=development`/`test`). (C) Only port 3000 | (B) leaves every development node open to every local page; developers run agents that start servers too. `APP_ENV` is not a reliable marker either: some probes run production-mode nodes behind a localhost frontend. (C) fails because 3000 is the default port of Nuxt, Next and React dev servers, so it is the port an agent's dev server most likely takes. (A) is exact and uses the existing setting, so a developer's own tool works after one line in `.env`. The packaged app (`file://`), phone (same origin) and agent-started pages (they display; they just get no node rights) are unaffected. **Recommend A.** | User | Decided by the user: **A** (2026-11-07) |
| DEC-003 | How are user files served? | Files must not run as node pages; viewers must keep working | CSP `sandbox` (opaque origin) vs `Content-Disposition: attachment` (download) vs serving active types as text | Sandbox keeps a top-level open displaying and matches 417's preview (scripts run, walled off), so the user sees the file. A download would change what opening an attachment does, and text would show source. PDFs may need to be left out of the sandbox, as Jira does (UNK-001): a PDF cannot run script at the page's origin. `nosniff` on all. Decision: an **opaque-origin sandbox with scripts allowed for every user file, except where it would stop a viewer (PDF, measured in design), plus `nosniff`**. The exact header per type is the design's. | Solution Designer | Decided |
| DEC-004 | Include `file://` pages in the in-app browser? | A fourth way of the same class, found and measured here | Include / follow-up | It is a user file running as a document with the app's rights, which the Task's done-when excludes, and it is the in-app browser workflow the Task protects. The page keeps loading; only its node access goes. **Include.** | Solution Designer | Decided |
| DEC-005 | Use `X-Forwarded-Host` in the Host check? | A re-pointed page can set it | Yes / no | No: Host only. A Host-rewriting gateway sets Host to an address the node accepts (e.g. its IP or `localhost`). 403's same-origin comparison may keep using `X-Forwarded-Host` after the Host check has passed. | Solution Designer | Decided |
| DEC-006 | Refusal shape | Owners must fix a refused setup | New code `REMOTE_ACCESS_HOST_REFUSED`, 403, log names host + setting | As 403's origin refusal; the log is where a Docker or proxy owner looks | Solution Designer | Decided |
| DEC-007 | Apply the localhost rule to `/mcp/gateway` and the internal listeners? | Same weakness (R2c) | Yes / no | Yes: same rights, same class. Their clients are programs and send no Origin, so nothing legitimate changes. | Solution Designer | Decided |
| DEC-008 | Setting form | Consistency with `AUTOBYTEUS_ALLOWED_ORIGINS` | Name list with `.suffix` form; no "allow all" value | A suffix entry covers many-name deployments. An allow-all value would turn off the protection with one typo-sized change; an owner who wants that can list their domain. | Solution Designer | Decided (falls with DEC-001) |
| DEC-009 | Docs and release note | Owners must know before upgrading | Update docs; release note | As 403 | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-011, AC-012 | SCN-001, SCN-007 | R1 |
| REQ-002 | UC-001 | BEH-001, BEH-005…007 | AC-002, AC-004 | SCN-005, SCN-007 | — |
| REQ-003 | UC-005 | BEH-001 | AC-003 | SCN-006 | — |
| REQ-004 | UC-002 | BEH-002 | AC-005, AC-013 | SCN-002, SCN-009 | R2 |
| REQ-005 | UC-002 | BEH-008 | AC-006 | SCN-008 | — |
| REQ-006 | UC-005 | BEH-001, BEH-002 | AC-001 | SCN-006 | — |
| REQ-007 | UC-003 | BEH-003 | AC-007 | SCN-003 | R3, route inventory |
| REQ-008 | UC-003 | BEH-009 | AC-008, AC-009, AC-013 | SCN-003, SCN-009 | — |
| REQ-009 | UC-004 | BEH-004 | AC-010 | SCN-004 | R4 |
| REQ-010 | UC-005 | — | AC-014 | — | — |

## Architecture Phase Input

- Approved scenario IDs and paths: SCN-001…SCN-009 (after approval).
- Constraints: one gate, Host before Origin; no DNS lookup on the request path; no secrets in logs; viewers and top-level opens unchanged; packaged renderer unchanged.
- Decisions deferred to architecture: exact headers per file type (UNK-001); how the in-app browser's requests from `file://` pages are made foreign (UNK-002); how runtime name sources (Tailscale name, paired phones) are kept current; how the launchers pass their origin; sharing one Host/Origin parser across the main gate, `/mcp/gateway` and the internal listeners.
- Facts to verify: PDF under a sandbox CSP in Electron and Chrome; Electron `webRequest` header rewriting on the browser partition; that the e2e and probes need only their frontend origin.
- Known risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (user, 2026-11-07)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
