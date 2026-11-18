# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `fastify5-and-spreadsheet-parser` (Project Tasks autobyteus-248 + autobyteus-249, merged)
- Request / ticket: Close the two high advisories with no simple update: Fastify 5 for the server and the message gateway; replace or update the spreadsheet parser (xlsx) in the file viewer
- Requested by: `/project_task_manager` (Project Task Manager), on the user's direction of 2026-10-24
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: `User`, 2026-10-24, in the Solution Designer conversation, answering the DEC-001/DEC-002 questions: "What are you asking me? I think you are more professional than me now. You also did a lot of investigations, did a lot of experiments. I think you are waiting for my approval. I think you already did a lot. What is your suggestion then?" The user delegated both decisions to the Solution Designer's recommendations, which the Solution Designer then stated and took: DEC-001 (a) GraphiQL off everywhere; DEC-002 (a) SheetJS 0.20.3 from cdn.sheetjs.com pinned by lockfile integrity
- Exact approved requirements baseline / solution revision: `SR-004`. That is the `SR-002` baseline (the user's approval above, with DEC-001/DEC-002 decided and AC-003 corrected) plus the SR-004 delta: DEC-008, hyperlink cells shown as their text, with REQ-010 and AC-013 aligned. The Solution Designer approved that delta within the direction on 2026-10-24 and informed the user in the Solution Designer conversation the same day (reference: SR-004 in `solution-revision-record.md`)
- Behavior-defining supplements and their approved versions: none (evidence files only; see investigation notes)

## Problem And Desired Outcome

- Problem: The server and the message gateway run on Fastify 4.29.1 (end-of-life) with 6 high advisories fixed only in 5.x, and mercurius 13 pulls in more (`@fastify/static` 7, `undici` 5, `@fastify/busboy` 2). The web file viewer parses user and agent spreadsheets with xlsx 0.18.5, which has 2 high advisories and no fixed npm release; our probe also shows that 0.18.5 lets a crafted cell inject an HTML attribute into the viewer. The gateway has no lockfile, is not audited, and its Docker build fails.
- Affected actors or systems: desktop and phone users, trusted-network clients, agents and their MCP clients, Docker operators, gateway operators.
- Desired outcome: the server and gateway on Fastify 5 with every current behavior preserved; the gateway reproducible and audited; the viewer on a parser with no known high advisory that opens the same files as before and cannot be made to inject markup.
- Observable definition of success: `pnpm audit` shows none of the targeted advisories; server, MCP, e2e, packaged-app and Docker checks pass; the gateway installs from a committed lockfile, its audit has no high/critical, its Docker image builds; the viewer opens generated xlsx/xls/xlsm/csv fixtures as before.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Fastify 4.29.1 serves every request; 6 high advisories | Fastify 5 serves every request; advisories gone | All routes, status codes, payloads, remote-access classification and auth outcomes | SD-01; Source Log |
| BEH-002 | System | SCN-002 | mercurius 13 GraphQL + subscriptions at `/graphql` | mercurius 16, same behavior | Queries, mutations, subscriptions, request context | Code |
| BEH-003 | User/Dev | SCN-003 | GraphiQL at `/graphiql` on loopback and for trusted-network clients; scripts from unpkg | Per DEC-001 | `GET /graphql` stays `LOCAL_DEV_ONLY`; `POST /graphql` unchanged | Code |
| BEH-004 | System | SCN-004 | Agent-tools MCP and MCP gateway routes: raw bodies, no CORS headers, own origin gate | Same on Fastify 5 | Same MCP responses and gating | Code; trial typecheck |
| BEH-005 | User | SCN-001 | Uploads and context-file uploads via multipart with a size limit | Same on @fastify/multipart 10 | Limit, truncation handling, responses | Code |
| BEH-006 | Operational | SCN-005 | Gateway: no lockfile, unaudited; Docker build fails | Gateway on Fastify 5 with its own committed lockfile, audited, Docker builds from it | Gateway routes and adapters behave as its tests define | SD-02, SD-03 |
| BEH-007 | User | SCN-006 | Viewer opens `.xlsx/.xls/.xlsm/.csv` (URL or streamed content), sheet tabs; parser 0.18.5 vulnerable; crafted cell injects an attribute; hyperlinked cells become `<a href>`, which look like the cell text (Tailwind preflight), do nothing on desktop (navigation blocked), leave the app on the phone, and run script for a `javascript:` target | Same files open the same way; parser with no known high advisory; no markup injection; hyperlinked cells show their text without a link (DEC-008) | Loading, error + Retry, tabs, table look | SD-05, SD-09 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop / phone user | Use the app; open spreadsheets | Nothing changes visibly except DEC-001 | Never open a real user file in tests |
| Trusted-network client / peer node | Reach the server | Same authorization outcomes | Remote-access policy unchanged |
| Agent MCP client | Call agent tools | Same MCP behavior | — |
| Docker operator | Run the server image | Image builds and serves | autobyteus-231 owns the image's lockfile install |
| Gateway operator / developer | Run the gateway | Reproducible, audited install; Docker works | Gateway stays outside the main product |
| User | Owns scope and release | Decides DEC-001, DEC-002; release only on request | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The server serves HTTP, GraphQL, WebSocket and MCP traffic on Fastify 5 in the packaged app, Docker and Termux | SCN-001, SCN-002, SCN-004 |
| UC-002 | GraphiQL availability per DEC-001 | SCN-003 |
| UC-003 | The message gateway runs on Fastify 5, installs from its own lockfile, is audited, and its Docker image builds | SCN-005 |
| UC-004 | The file viewer opens spreadsheets with a parser that has no known high advisory and cannot inject markup | SCN-006 |

### Out Of Scope

- Other dependency advisories, e.g. `body-parser` via the Claude Agent SDK (FU-001), the web toolchain (autobyteus-229 FU-003).
- The server Docker image's `--no-frozen-lockfile` install (autobyteus-231).
- The gateway's runtime-package script and release manifest (no consumer since 2026-09-24; FU-002).
- Re-adding the gateway to the workspace or to any release.
- A Content-Security-Policy for the web app (FU-003).
- Other `v-html` sites in the web app.
- Prisma, GraphQL 17, or other majors not required by the plugins.

### Non-Goals

- No new spreadsheet features (editing, formulas, styling, large-file streaming).
- No Fastify-5-only features (type providers, new hooks) beyond what the move needs.

### Preserved Behavior Boundary

BEH-001, BEH-002, BEH-004, BEH-005 preserved outcomes; BEH-006 gateway route/adapter behavior; BEH-007 loading, error, Retry, sheet tabs and table appearance. Invariant: no change to any HTTP status, payload, header contract (other than `/graphiql*` per DEC-001), remote-access classification or authentication result.

### Prerequisites

None. (The base gateway Docker build failure is in functionality this ticket changes: REQ-008.)

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The server runs on Fastify 5 (≥5.12.2) with mercurius 16 and the matching majors of `@fastify/cors`, `/multipart`, `/websocket` (and `/static` through mercurius); the workspace lockfile contains no `fastify`, `find-my-way`, `@fastify/*` or mercurius-held `undici` with a high/critical advisory | BEH-001, BEH-002, BEH-005 | Must | Close FU-001 advisories | Task Part 1; SD-01; DEC-006 |
| REQ-002 | Every existing HTTP, GraphQL, WebSocket, MCP and upload behavior and every remote-access classification/authorization outcome is unchanged | BEH-001, BEH-002, BEH-004, BEH-005 | Must | A framework major affects every request | Task Part 1 |
| REQ-003 | The server starts and serves in the packaged desktop app, the Docker image and on Node ≥20 (Termux) | BEH-001 | Must | Supported runtimes | Task constraints |
| REQ-004 | GraphiQL availability follows DEC-001 | BEH-003 | Must | User decision | DEC-001 |
| REQ-005 | The gateway runs on Fastify 5 and `@fastify/cors` 11 with its current tested behavior unchanged | BEH-006 | Must | Same advisories | Task Part 1 |
| REQ-006 | The gateway has a committed lockfile from which a frozen install reproduces its dependencies | BEH-006 | Must | FU-007 | DEC-003 |
| REQ-007 | The gateway's dependencies are audited from that lockfile, and at delivery the audit shows no high or critical advisory | BEH-006 | Must | FU-007; critical baileys | DEC-004 |
| REQ-008 | The gateway's Docker image builds by installing from that lockfile, and the container starts | BEH-006 | Must | FU-007; base build fails | SD-03 |
| REQ-009 | The spreadsheet parser in the viewer has no known high advisory and is pinned so a clean install gets exactly the reviewed artifact | BEH-007 | Must | FU-002 | DEC-002 |
| REQ-010 | The viewer opens `.xlsx`, `.xls`, `.xlsm` and `.csv` from a URL and CSV from streamed content as before: same sheets, tabs, cell text, loading/error/Retry states. A hyperlinked cell shows its text as plain text, without a link (DEC-008) | BEH-007 | Must | Done criterion | Task Part 2; DEC-008 |
| REQ-011 | Spreadsheet content cannot add elements, attributes, links or script to the viewer's page; only the table structure the viewer renders (table, rows, cells, line breaks, column/row spans) reaches the DOM | BEH-007 | Must | Reproduced injection on base (attribute and `javascript:` link) | SD-05, SD-09; DEC-005, DEC-008 |
| REQ-012 | Tests use generated fixtures only, never a real user file, and the viewer spec exercises the real parser | BEH-007 | Must | Task constraint; current spec mocks the library | Task Part 2 |
| REQ-013 | All of the above is proven from a clean clone, including the packaged app and both Docker images, without printing or storing secrets | All | Must | Task constraints | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | `pnpm audit` on the delivered lockfile | None of GHSA-p68q-wchp-6fh7, -hwr6-493r-vm6h, -9q9j-q6p8-xq58, -667r-xxjv-c9mm, -jx2c-rxcm-jvmq, -c96f-x56v-gq3h, -83w8-p2f5-377r, -x8mw-p69m-v3mx, the three mercurius `undici` 5 advisories; no new high/critical introduced | Any remaining one is named with its reason | Audit diff vs base |
| AC-002 | REQ-001, REQ-002 | SCN-001..004 | Server typecheck, build, unit, integration and e2e suites | Pass with no failure that does not also occur on base | A failure also on base is shown on base | Suite matrix branch vs base |
| AC-003 | REQ-002 | BEH-004, SCN-004 | Agent-tools MCP and MCP gateway suites; MCP requests without `Origin`, with a loopback `Origin`, with a non-loopback `Origin`, and an `OPTIONS` preflight | Same status codes and the same `Access-Control-*` headers as base for each case (base: preflights answered by the MCP gates' own headers; loopback-origin requests also carry the CORS plugin's headers; non-loopback origins 403) | — | MCP suites + a route probe on base and branch |
| AC-004 | REQ-002 | BEH-001, SCN-001 | Remote-access policy suites; requests from loopback and from a non-loopback address | Same classification and status codes as base | — | Existing policy tests + probe |
| AC-005 | REQ-004 | BEH-003, SCN-003 | `GET /graphiql` on loopback and from a trusted-network address | As DEC-001 decides; `POST /graphql` and subscriptions unchanged | — | e2e/probe |
| AC-006 | REQ-002, REQ-005 | BEH-005, SCN-001 | Upload a file within and above the size limit | Same success and size-limit responses as base | — | Existing upload tests |
| AC-007 | REQ-003, REQ-013 | SCN-001, SCN-002 | Packaged desktop app built from a clean clone | App starts its server; a run opens, streams over WebSocket, GraphQL works | — | Packaged-app check |
| AC-008 | REQ-003, REQ-013 | SCN-001 | Server Docker image built from a clean clone | Image builds; container answers `/rest/health`, GraphQL and a WebSocket | — | Docker check |
| AC-009 | REQ-005, REQ-006, REQ-007 | SCN-005 | Gateway clean clone | Frozen install from the committed lockfile succeeds; typecheck and tests pass; `pnpm audit` for the gateway shows no high/critical | — | Gateway commands |
| AC-010 | REQ-008, REQ-013 | SCN-005 | `docker build` of the gateway image | Builds installing from the lockfile; container starts and answers its health route | — | Docker check |
| AC-011 | REQ-009 | SCN-006 | Delivered lockfile | The parser resolves to the DEC-002 artifact with an integrity hash; no spreadsheet-parser advisory in `pnpm audit` | — | Lockfile + audit |
| AC-012 | REQ-010, REQ-012 | SCN-006 | Viewer spec with generated `.xlsx`, `.xls`, `.xlsm` and a CSV (URL and content) | Each renders its cell text; a two-sheet workbook shows tabs and switches; fetch failure shows the error and Retry | — | Web spec with the real parser |
| AC-013 | REQ-010, REQ-011, REQ-012 | SCN-006 | Generated workbook whose cells contain `"`, `<`, `>`, an event-handler attribute and a `<script>`, plus cells hyperlinked to an `https:` and a `javascript:` target | Rendered DOM has no element or attribute from cell content: no `a`, `img`, `script`, no `on*`, `href` or `data-*` attribute; each cell's text shows literally | — | Web spec |
| AC-014 | REQ-010, REQ-013 | SCN-006 | Packaged app from a clean clone; open a generated `.xlsx` and `.xls` | Both render as before | — | Packaged-app check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Desktop app, phone, peers, Docker clients | Use the server | Any REST/WS request | Server running | Request → remote-access policy → handler | Same response as today | Policy rejections unchanged | Supported Normal Scenario | Code; suites | REQ-001..003, AC-001, 002, 004, 006..008 |
| SCN-002 | System | Web app | GraphQL queries, mutations, subscriptions | `/graphql` | Server running | POST / WS subscription | Same results | Errors unchanged | Supported Normal Scenario | Code | REQ-001, REQ-002, AC-002, AC-005 |
| SCN-003 | User/Dev | Developer | Explore the GraphQL API | Browser `/graphiql` | Server running | Open page | Per DEC-001 | — | Supported Normal Scenario (today) | Code | REQ-004, AC-005 |
| SCN-004 | System | Agent runtime MCP client | Call agent tools | `/mcp` routes | Agent run | MCP JSON-RPC over HTTP | Same | Origin/session rejections unchanged | Supported Normal Scenario | Code | REQ-002, AC-003 |
| SCN-005 | Operational | Gateway developer/operator | Install, run, containerize the gateway | `pnpm install`, `docker build` | Clean clone | Install → typecheck/test → audit → image | Reproducible, audited, image builds | — | Supported Normal Scenario | README Docker section; SD-02, SD-03 | REQ-005..008, AC-009, AC-010 |
| SCN-006 | User | Desktop/phone user | View a spreadsheet the user or an agent produced (may come from the internet) | File explorer, artifact, team/collaboration reference, mobile files | File exists | Open → viewer fetches → parses → renders | Table with tabs | Fetch/parse error → message + Retry | Supported Normal Scenario; a crafted file is a Supported Explicit Edge Scenario (security: agents fetch untrusted files) | fileTypePolicy; SD-05 | REQ-009..012, AC-011..014 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no visible change intended; DEC-001 only affects a developer page)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: existing viewer states preserved (REQ-010)
- Product decisions that need the user: DEC-001, DEC-002

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-007, REQ-009; AC-001, AC-009, AC-011 | Security | Zero targeted advisories; no new high/critical; gateway 0 high/critical | Delivered lockfiles | Audit |
| QR-002 | REQ-011; AC-013 | Security | No element/attribute from cell content in the DOM | Viewer | Spec |
| QR-003 | REQ-003 | Compatibility | Node ≥20 in every runtime | Packaged app (Electron 42), Docker (Node 22), gateway Docker (Node 20), Termux | Checks |
| QR-004 | REQ-013 | Privacy | No secrets printed or stored in evidence | All validation | Review of evidence |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: N/A
- Loss, reset, rebuild, or regeneration that is acceptable: N/A
- Retention, privacy, compliance, volume, downtime, or operational constraints: N/A
- Unknowns requiring downstream investigation: none

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Fastify 5 / mercurius 16 / @fastify/* | v5 migration guide; plugin releases | Investigation notes | RSK-001 |
| SheetJS CE 0.20.3 (cdn.sheetjs.com, Apache-2.0) | Fixes both advisories; reads xlsx/xls/xlsm/csv | SheetJS advisories; SD-05 | RSK-002 |
| @whiskeysockets/baileys 6.7.x | Critical fixed ≥6.7.22 | SD-02 | RSK-003 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| See investigation notes' Supplemental Artifact Inventory | Evidence and probes | — | Current | Evidence only; no approval needed |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The existing server, MCP and e2e suites cover the request behaviors REQ-002 protects well enough to detect a Fastify 5 regression, together with the packaged-app and Docker checks | Proving preservation | API/E2E adds a probe where a surface is not covered (e.g. AC-003 CORS headers on MCP) | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Does GraphiQL stay available? | The Task asks the user. It is a developer page served to loopback **and** to every trusted-network client without a credential; it loads React and GraphiQL from unpkg.com into a page on the same origin as the phone web app (`/mobile`), so a compromised CDN script would run with that origin's access | (a) Off everywhere (`graphiql: false`; mercurius then never loads `@fastify/static`); (b) loopback only (classify `/graphiql*` like `GET /graphql`, `LOCAL_DEV_ONLY`); (c) keep as today. Nothing in the app or docs uses it; the server has no dev/production switch; any GraphQL client (Altair, Insomnia, curl) works against `/graphql` | The product does not need it, and its CDN-loaded page on the app origin is a risk with no user benefit. **Recommend (a) off everywhere.** (b) if you use it yourself on the desktop. **Decided: (a)** — the user delegated the choice to this recommendation (approval reference above) | User (delegated to Solution Designer's recommendation) | Decided |
| DEC-002 | Which spreadsheet parser? | The Task asks the user about the trade-off; no fixed xlsx is on npm | (a) SheetJS CE 0.20.3 from `cdn.sheetjs.com` as a tarball URL, integrity pinned in `pnpm-lock.yaml` (same API, reads xlsx/xls/xlsm/csv; probe shows identical output, plus escaping; Apache-2.0; no deps; installs need that host reachable on a cold cache); (b) the same 0.20.3 tarball committed to the repo (`file:` dep, 2.4 MB in git, no external host); (c) exceljs 4.4.0 — reads only xlsx and csv, so `.xls` would stop opening, last release 2024, 9 deps | Only SheetJS keeps `.xls` working as the Done criterion requires, so (c) is out. Between (a) and (b), (a) is SheetJS's documented install, keeps git free of binaries, and the lockfile integrity makes a tampered or changed tarball fail the install. **Recommend (a).** **Decided: (a)** — the user delegated the choice to this recommendation (approval reference above) | User (delegated to Solution Designer's recommendation) | Decided |
| DEC-003 | Gateway lockfile: workspace membership or its own? | Task leaves it open | The gateway was deliberately removed from the workspace and product on 2026-09-24 (`40f769e0d9`). Re-joining would make every workspace install fetch baileys and its git dependency, and put gateway advisories in the main audit | Its own `pnpm-lock.yaml` keeps that separation; pnpm can create one (`--ignore-workspace`), npm cannot (`--package-lock-only` fails). **Own pnpm lockfile.** | Solution Designer | Decided |
| DEC-004 | Fix the critical baileys advisory found by the gateway audit? | REQ-007 asks for an audit with no high/critical | 6.7.21 → 6.7.24 (the `legacy` 6.x line), patch-level; trial: tests green, audit 0 | A patch bump in a dependency we are re-locking anyway; leaving a critical would make the new audit fail its purpose. **Update to 6.7.24.** 7.0 RC is not considered | Solution Designer | Decided |
| DEC-005 | Defence beyond the library's escaping? | 0.18.5's escaping bug (SD-05) shows the viewer trusts the parser's HTML through `v-html`; there is no CSP | Sanitize the generated table HTML with the app's existing DOMPurify before `v-html`, allowing only table markup; or render cells through Vue templates | Sanitizing keeps `sheet_to_html`'s merged-cell output and appearance (REQ-010) with a few lines, using a library the app already uses for Markdown. **Sanitize with DOMPurify.** Design decides the exact place | Solution Designer | Decided |
| DEC-006 | Target versions | Reproducibility | fastify ^5.12.7, mercurius ^16.12.1, @fastify/cors ^11.3.1, /multipart ^10.1.6, /websocket ^11.3.4; @fastify/static through mercurius ^10.1.x; graphql stays 16 | Latest of each major at investigation time; all above every fixed version | Solution Designer | Decided |
| DEC-008 | What happens to hyperlinked cells (ARCH-REV-001 AR-001)? | SheetJS renders them as `<a href="Target">`, including `javascript:` targets (SD-09). Keeping links is an exception to REQ-011; dropping them is a visible change | Evidence (SD-09). On base links already look like the cell text (Tailwind preflight `a { color: inherit; text-decoration: inherit }`). A desktop click does nothing (`workspace-shell-window.ts` L52-59 prevents navigation and denies window.open). A phone tap navigates the app tab away. A `javascript:` target runs script on both. (a) Show the text without a link; (b) keep `a[href]` with DOMPurify's URI filter, which would still keep today's useless desktop click and the phone's leave-the-app tap; (c) make links open in the system browser, which is new behavior | Under (a) the only visible differences are the pointer cursor and the phone tap leaving the app; nothing that works today stops working. It removes a script-execution path and keeps REQ-011 exact. (b) keeps a broken interaction and an attack surface; (c) is a feature beyond this ticket (FU-005). **Decided: (a).** | Solution Designer (within the direction; user informed) | Decided |
| DEC-007 | Fix the gateway's runtime-package script too? | It needs workspace membership and installs without a lockfile | No consumer since 2026-09-24 | Outside this ticket; FU-002 | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002, BEH-005 | AC-001, AC-002 | SCN-001, SCN-002 | SD-01 |
| REQ-002 | UC-001 | BEH-001, BEH-002, BEH-004, BEH-005 | AC-002, AC-003, AC-004, AC-006 | SCN-001, SCN-002, SCN-004 | SD-04 |
| REQ-003 | UC-001 | BEH-001 | AC-007, AC-008 | SCN-001, SCN-002 | — |
| REQ-004 | UC-002 | BEH-003 | AC-005 | SCN-003 | — |
| REQ-005 | UC-003 | BEH-006 | AC-009 | SCN-005 | SD-02 |
| REQ-006 | UC-003 | BEH-006 | AC-009 | SCN-005 | SD-02 |
| REQ-007 | UC-003 | BEH-006 | AC-009 | SCN-005 | SD-02 |
| REQ-008 | UC-003 | BEH-006 | AC-010 | SCN-005 | SD-03 |
| REQ-009 | UC-004 | BEH-007 | AC-011 | SCN-006 | SD-01, SD-05 |
| REQ-010 | UC-004 | BEH-007 | AC-012, AC-014 | SCN-006 | SD-05 |
| REQ-011 | UC-004 | BEH-007 | AC-013 | SCN-006 | SD-05 |
| REQ-012 | UC-004 | BEH-007 | AC-012, AC-013 | SCN-006 | — |
| REQ-013 | UC-001..UC-004 | All | AC-007, AC-008, AC-010, AC-014 | All | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-006 (after approval).
- Product and system constraints architecture must preserve: REQ-002 invariant; gateway outside the workspace; Node ≥20.
- Decisions intentionally deferred to architecture design: placement of the `FastifyContextConfig` augmentation; gateway Docker build context and install command; sanitisation point and spec fixtures; commit split (Part 2 first).
- Technical facts architecture should verify: avvio plugin order (cors after MCP routes) on Fastify 5; Fastify 5 content-type and empty-body behavior against our parsers and clients; mercurius 16 subscriptions with our separately registered `@fastify/websocket`; mobile-web build with the tarball dependency.
- Known feasibility or integration risks: RSK-001..RSK-003.

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (User, 2026-10-24; see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes` (`SR-002`; no behavior-defining supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
