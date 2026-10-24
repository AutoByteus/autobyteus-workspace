# Investigation Notes

## Investigation Meta

- Package identifier: `fastify5-and-spreadsheet-parser` (Project Tasks autobyteus-248 + autobyteus-249, merged)
- Request / ticket: "Close the two high security advisories that have no simple update: move the server and the message gateway to Fastify 5, and replace the spreadsheet parser (xlsx) in the file viewer"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`, `codex/fastify5-and-spreadsheet-parser`
- Resolved base remote / branch / revision: `origin/personal` @ `ddd6fdcdf64b1a6750415c68ccef0bbb316083d2` (fetched 2026-10-24)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree and branch created from the fetched base; ticket folder `tickets/in-progress/fastify5-and-spreadsheet-parser/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/handoff.md` (2026-10-24)
- Investigation status: Requirements and architecture investigation complete (requirements approved 2026-10-24, SR-002; design SR-003; revision SR-004 after ARCH-REV-001).

Scratch locations (not part of the package, disposable): `/tmp/ab-fastify5/trial` (detached scratch worktree of the same base, used for the Fastify 5 / SheetJS trial), `/tmp/ab-fastify5/gw-probe` (scratch copy of the gateway). Nothing was changed in the task worktree except this ticket folder.

## Initial Request And Clarifications

- Original request: Project Task Manager (`/project_task_manager`), 2026-10-24, merged from autobyteus-248 (Fastify 5) and autobyteus-249 (xlsx). Both URGENT per the autobyteus-229 Solution Designer. Reference: `autobyteus-229-follow-ups.md` rows FU-001, FU-002, FU-007.
- Clarifications received: none yet.
- User-supplied facts and constraints: one ticket, delivered as one (Part 2 may be its own commit); ask the user directly for GraphiQL in production and the spreadsheet-library trade-off; prove from a clean clone incl. packaged app and Docker image; never print or store secrets; no release unless asked; done when merged to `personal`.
- Initial ambiguity: whether the gateway joins the workspace or gets its own lockfile (Task leaves it open); GraphiQL; spreadsheet library.

## Product And Domain Understanding

- Product area: the AutoByteus server (`autobyteus-server-ts`, Fastify HTTP/WebSocket/GraphQL host for the desktop app, Docker image and Android/Termux), the stand-alone message gateway (`autobyteus-message-gateway`), and the web file viewer for spreadsheets (`autobyteus-web`, desktop renderer and mobile web).
- Affected actors or systems: desktop user; phone (remote-access) user; LAN peers/trusted-network clients; agents producing files; operators running Docker; developers running the gateway.
- Existing purpose: the server serves REST, GraphQL (+ GraphiQL), WebSocket and MCP routes behind the remote-access policy; the viewer renders `.xlsx/.xls/.xlsm/.csv` files from the workspace, agent artifacts and team references.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Command | `pnpm audit --json` at base (`evidence/SD-01`) | Verify advisories | Fastify 4.29.1: GHSA-p68q-wchp-6fh7, -hwr6-493r-vm6h, -9q9j-q6p8-xq58, -667r-xxjv-c9mm (patched ≥5.12.2), -jx2c-rxcm-jvmq (≥5.7.2); find-my-way 8.2.2 GHSA-c96f-x56v-gq3h (≥9.7.0); via mercurius 13: @fastify/static 7.0.4 GHSA-83w8-p2f5-377r, undici 5.28.3 ×3, @fastify/busboy 2.1.1 GHSA-x8mw-p69m-v3mx; xlsx 0.18.5 GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9 (patched `<0.0.0`, i.e. none on npm) | — |
| 2026-10-24 | Web | GHSA-p68q-wchp-6fh7 | Reachability | Malformed URL reaches a sibling plugin's custom not-found handler, skipping its `preHandler` and global `onRequest`. Needs `setNotFoundHandler` serving protected data | Server and gateway register no `setNotFoundHandler` (grep) → this one is not directly reachable; the others are generic request-validation/router issues |
| 2026-10-24 | Command | `npm view` fastify, mercurius, @fastify/* | Target versions | fastify 5.12.7; mercurius 16.12.1 (deps @fastify/static ^10.1.0, @fastify/websocket ^11, fastify-plugin ^6; no undici); @fastify/cors 11.3.1; /multipart 10.1.6; /websocket 11.3.4; /static 10.1.7 | — |
| 2026-10-24 | Web | Fastify V5 migration guide | Breaking changes | Node ≥20; full JSON schema; `loggerInstance`; `useSemicolonDelimiter` default false; `req.params` null prototype; listen variadic removed; `request.context/routeSchema/routeConfig/routerPath/routerMethod` removed; `reply.redirect(url, code)`; `reply.sent` setter; versioning via constraints; HEAD ordering; `request.connection`; `getResponseTime`; `hasRoute`; non-standard methods; reference-type decorators; DELETE JSON empty body; mixed plugin APIs; `req.hostname` no port; `get/setDefaultRoute`; `time`/`date-time` formats | grep below |
| 2026-10-24 | Code | grep of server + gateway `src` for each v5 breaking API | Impact | None used: no route schemas, no logger instance, object `listen`, `reply.elapsedTime` already, no `setNotFoundHandler`, no redirects, no hostname, no decorators. Two `addContentTypeParser` pairs (MCP routes) and one in the gateway | Architecture to re-verify |
| 2026-10-24 | Web | @fastify/cors releases | Breaking changes | v11 changes default `methods` to CORS-safelisted; server and gateway both pass `methods` explicitly | No behavior change expected |
| 2026-10-24 | Web | @fastify/multipart, mercurius v14/15/16 releases | Breaking changes | multipart 10: no labelled breaking change; mercurius 14 = @fastify/websocket 10, 15 = Fastify 5 prep + dep updates, 16 = APQ persistence change (we use no APQ) + dep updates | — |
| 2026-10-24 | Command | Trial upgrade in scratch worktree; `tsc -p tsconfig.build.json --noEmit` | Feasibility | 6 errors in 2 files: `{ config: { cors: false } }` on `mcpApp.all(...)` in `agent-tools-mcp-routes.ts` L47 and `mcp-gateway-routes.ts` L46 — `cors` is not in Fastify 5's `FastifyContextConfig`; the other 4 errors are the overload fallout. A `declare module "fastify" { interface FastifyContextConfig { cors?: false } }` makes it compile | `@fastify/cors` 11 still honours `req.routeOptions.config?.cors === false` at run time (read `index.js` L181) |
| 2026-10-24 | Command | Trial: server `vitest run tests/unit tests/app-data-migrations` | Feasibility | 815 files passed, 4 skipped; 6770 tests passed | `evidence/SD-04` |
| 2026-10-24 | Command | Trial: server `vitest run tests/e2e`, then `pnpm build` and a rerun of the failing files; the same 2 files on base (built) | Feasibility | 87 files passed, 95 skipped (live). 28 of the 32 failures were only the unbuilt `dist/`; after the build, 10 of the 12 files pass. 4 tests in `phone-access-running-routes` (503 vs 200) and `agent-runtime-update-notifications` (settings `agentRuntimes` true vs false) fail **identically on base** | `evidence/SD-04`; FU-004 |
| 2026-10-24 | Code | `src/api/graphql/index.ts`, mercurius 16 `lib/routes.js` L450-480, `static/main.js` | GraphiQL decision | `graphiql: true` → mercurius registers `@fastify/static` and serves `/graphiql`, `/graphiql/main.js`, `/graphiql/sw.js`, `/graphiql/config.js`; the page loads React 18 and GraphiQL 3.8.3 from `unpkg.com` | DEC-001 |
| 2026-10-24 | Code | `src/api/security/remote-access-route-policy.ts` `classifyHttpRoute` | GraphiQL exposure | `GET /graphql` (non-upgrade) is `LOCAL_DEV_ONLY`; `/graphiql*` falls to the default `TRUSTED_NETWORK_PROTECTED`, i.e. served to every trusted-network client without a credential | DEC-001 |
| 2026-10-24 | Code | `grep -rn graphiql` (excluding tickets) | Who uses GraphiQL | Only `src/api/graphql/index.ts`. No docs, no web/client reference. The server has no dev/production switch (`APP_ENV` only chooses the SQLite file name; default `production`) | DEC-001 |
| 2026-10-24 | Code/Git | `pnpm-workspace.yaml`; `git show 40f769e0d9` (2026-09-24, "remove external messaging from the main product") | Gateway status | The gateway was deliberately removed from the workspace, from the server, from releases (gateway release workflow deleted) and from the Docker all-in-one stack. It is now a stand-alone package with no lockfile | DEC-003 |
| 2026-10-24 | Command | scratch copy: `pnpm install --lockfile-only --ignore-workspace`; `pnpm audit` (`evidence/SD-02`) | Gateway lockfile + audit | Works (npm's `--package-lock-only` fails, pnpm does not). Base manifest: 6 high (Fastify 4 ×5, find-my-way) + **1 critical `@whiskeysockets/baileys` 6.7.21 GHSA-qvv5-jq5g-4cgg (patched ≥6.7.22)** | DEC-004 |
| 2026-10-24 | Command | scratch copy with fastify ^5.12.7, @fastify/cors ^11.3.1, baileys 6.7.24: `pnpm typecheck`, `pnpm test`, `pnpm audit` | Gateway feasibility | typecheck clean; 86 files / 268 tests pass; audit 0 advisories | `evidence/SD-02` |
| 2026-10-24 | Command | `docker build -f autobyteus-message-gateway/docker/Dockerfile .` at base (`evidence/SD-03`) | Gateway Docker | Fails at base: the filtered install selects nothing (gateway not a workspace member), then `tsc: not found`. The Dockerfile also still copies `autobyteus-ts`, which the gateway no longer depends on | REQ-008 |
| 2026-10-24 | Code | `autobyteus-message-gateway/scripts/build-runtime-package.mjs` | Gateway packaging | Uses `pnpm --filter autobyteus-message-gateway deploy` (needs workspace membership) then `npm install` without a lockfile. Its consumer (managed messaging, release workflow) was removed on 2026-09-24 | FU-002 |
| 2026-10-24 | Code | `autobyteus-web/components/fileExplorer/viewers/ExcelViewer.vue` | Spreadsheet path | `XLSX.read(Uint8Array, {type:'array'})` for a URL, `XLSX.read(string, {type:'string'})` for streamed content; renders `XLSX.utils.sheet_to_html(sheet)` through **`v-html`**; sheet tabs when >1 sheet | — |
| 2026-10-24 | Code | `utils/fileExplorer/fileTypePolicy.ts` L15; consumers of `FileViewer`/`ExcelViewer` | Reach | `.xlsx .xls .xlsm .csv` → Excel viewer; reached from file explorer tabs, agent artifact viewer, team reference viewer, collaboration reference viewer and `MobileFileViewer` (phone) | — |
| 2026-10-24 | Web | cdn.sheetjs.com advisories CVE-2023-30533, CVE-2024-22363 | Fixed versions | Prototype pollution on reading crafted files: fixed 0.19.3. ReDoS: fixed 0.20.2. Latest CE 0.20.3 (Apache-2.0, no deps); not on npm | DEC-002 |
| 2026-10-24 | Command | `probes/sheetjs-roundtrip.cjs` 0.18.5 vs 0.20.3 (`evidence/SD-05`) | Preserved rendering | Same sheets for xlsx / biff8 .xls / xlsm / CSV string; identical HTML except that 0.20.3 escapes the `data-v` attribute | — |
| 2026-10-24 | Command | `probes/sheetjs-attr-escape.cjs` (`evidence/SD-05`) | Injection check | **0.18.5 leaves `"` unescaped in `data-v`: a cell `x" onmouseover="…"` becomes a real event-handler attribute in the HTML the viewer injects with `v-html` (Reproduced on a generated fixture).** 0.20.3 escapes it | REQ-012, DEC-005 |
| 2026-10-24 | Code | `grep Content-Security-Policy` in web; Electron `webPreferences` | Impact of the injection | No CSP in the renderer or the Nuxt app; windows use `contextIsolation`, `sandbox`, no node integration. Script in the renderer runs in the app origin with the local server's REST/GraphQL/WebSocket surface | Severity context for DEC-005 |
| 2026-10-24 | Command | `npm view exceljs`, `read-excel-file` | Alternatives | exceljs 4.4.0: "Read and Write xlsx and csv Files" (no `.xls`), last change 2024-12, 9 deps; read-excel-file: `.xlsx` only | DEC-002 |
| 2026-10-24 | Command | trial: `pnpm add xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | Pinning | pnpm records `resolution: {integrity: sha512-oLDq3jw7…, tarball: …}`; frozen installs verify it | DEC-002 |
| 2026-10-24 | Command | `pnpm audit` on trial lockfile (`evidence/SD-01`) | Outcome | All 13 target advisories gone, none added. One high left on a server path: `body-parser` 2.3.0 (GHSA-27r3-jxmh-p828, published 2026-10-23, patched 2.4.0, in range) via Claude Agent SDK → MCP SDK → express | FU-001 |
| 2026-10-24 | Code | `autobyteus-server-ts/docker/Dockerfile.monorepo` | Docker image | `node:22-bookworm`; `pnpm install --no-frozen-lockfile` (autobyteus-231's subject); builds server and `build:mobile-web` (so the web's xlsx tarball is fetched during the image build) | — |
| 2026-10-24 | Code | `autobyteus-web/electron/server/serverRuntimeEnv.ts` L130 | Node version | Packaged app runs the server with Electron 42's Node (`ELECTRON_RUN_AS_NODE`); Docker uses Node 22; gateway Docker Node 20; Termux installs current `nodejs`. All meet Fastify 5's Node ≥20 | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Every HTTP/WebSocket request to the server (desktop app, phone, peers, Docker) | Fastify 4 router → remote-access `onRequest` policy → REST/GraphQL/WS/MCP handlers | Works; carries the Fastify 4 / find-my-way advisories | Code, SD-01 | High |
| BEH-002 | System | GraphQL over HTTP and subscriptions over WS at `/graphql` | mercurius 13 with `subscription: true`, `context: createGraphqlRequestContext` | Works | `src/api/graphql/index.ts` | High |
| BEH-003 | User/Dev | Browser `GET /graphiql` | mercurius GraphiQL, CDN scripts from unpkg; classified `TRUSTED_NETWORK_PROTECTED` | Available on loopback and to trusted-network clients | Code | High |
| BEH-004 | System | Agent MCP clients (`/mcp` agent-tools, MCP gateway) | Encapsulated plugin, raw string body parsers, route `config: { cors: false }`, own origin gate | Works | Code | High |
| BEH-005 | User | Upload / context-file upload (multipart) | `request.file()` with size limit `CONTEXT_FILE_MAX_BYTES`; truncated-file check | Works | `upload-file.ts`, `context-files.ts` | High |
| BEH-006 | Operational | Developer/operator runs the gateway (source or Docker) | No lockfile; Docker build fails at base | Unaudited, unreproducible installs | SD-02, SD-03 | High |
| BEH-007 | User | User opens a `.xlsx/.xls/.xlsm/.csv` file (workspace, artifact, team reference, phone) | `ExcelViewer` parses with xlsx 0.18.5, renders `sheet_to_html` via `v-html`, sheet tabs | Renders; vulnerable to crafted-file prototype pollution, ReDoS and attribute injection | SD-05 | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/package.json` | fastify ^4.29.1, mercurius ^13.1.0, @fastify/cors ^9, /multipart ^8, /websocket ^10 | Majors move | Exact ranges; lockfile dedupe |
| `src/compositions/build-studio-server.ts`, `build-standalone-application-server.ts`, `agent-tools-mcp-local-server.ts` | Create the three Fastify instances (studio, standalone application host, local agent-tools MCP) | All three move | Verify each starts |
| `src/agent-tools/mcp/agent-tools-mcp-routes.ts`, `src/mcp-gateway/mcp-gateway-routes.ts` | Route `config: { cors: false }` | Type-only break | Where the `FastifyContextConfig` augmentation lives |
| `src/api/graphql/index.ts` | `graphiql: true` | DEC-001 | — |
| `src/api/security/remote-access-route-policy.ts` | Path classification | `/graphiql` class if kept | — |
| `autobyteus-message-gateway/` | Stand-alone Fastify 4 app, no lockfile, broken Docker build | REQ-006..REQ-009 | Lockfile location, Docker install |
| `autobyteus-web/components/fileExplorer/viewers/ExcelViewer.vue` + `__tests__/ExcelViewer.spec.ts` | Parse + render; spec mocks `xlsx` entirely | REQ-010..REQ-013 | Real-library test with generated fixtures |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: user/agent spreadsheets opened in the viewer (read-only); no stored data changes.
- Readers: `ExcelViewer.vue`.
- Evidence paths: SD-05.

### Structural Surfaces

- Runtime modules: three Fastify instances in the server, one in the gateway; mercurius plugin; @fastify/* plugins; remote-access `onRequest` policy; MCP encapsulated plugins.
- Deployment configuration: server Docker image (`Dockerfile.monorepo`), gateway Dockerfile, packaged Electron app, workspace lockfile.
- Evidence paths: Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: none intended (HTTP/GraphQL/WS contracts preserved); `/graphiql` per DEC-001.
- Persistence schema or invariant change: none.
- Security or privacy boundary change: GraphiQL exposure (DEC-001); spreadsheet HTML injection (DEC-005).
- Concurrency or lifecycle change: none expected; plugin registration order to re-verify under Fastify 5/avvio.
- Deployment / ownership-boundary change: gateway gets a lockfile (DEC-003); gateway Docker install path.
- Confirmed absent: route JSON schemas, custom loggers, not-found handlers, redirects, decorators.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `pnpm audit --json` base vs trial | All | 13 targeted advisories removed, 0 added | Measured | REQ-001, REQ-010 | `evidence/SD-01-audit-base-vs-fastify5-sheetjs-trial.txt` |
| Trial server typecheck, unit, e2e | SCN-001..004 | 1 type-only break (2 files); unit green; e2e green except 4 tests that fail identically on base | Measured | REQ-002..REQ-004 | `evidence/SD-04-server-fastify5-trial.txt` |
| Gateway own lockfile + audit + tests | SCN-005 | Lockfile works; critical baileys; trial green, 0 advisories | Measured | REQ-006..REQ-009 | `evidence/SD-02-gateway-own-lockfile-audit.txt` |
| Gateway Docker build at base | SCN-005 | Fails (`tsc: not found`) | Reproduced | REQ-008 | `evidence/SD-03-gateway-docker-build-base.txt` |
| SheetJS round trip + attribute probe | SCN-006 | Same output except escaping; 0.18.5 attribute injection | Reproduced | REQ-011, REQ-012 | `evidence/SD-05-sheetjs-probes.txt`, `probes/` |

- Temporary diagnostics: a type augmentation file `src/api/zz-trial-cors-config.ts` and the dependency bumps exist only in the scratch worktree `/tmp/ab-fastify5/trial` (never in the task worktree); the scratch worktree is removed before handoff.
- Reproduction for implementation to start from: `node tickets/in-progress/fastify5-and-spreadsheet-parser/probes/sheetjs-attr-escape.cjs <path to the installed xlsx package>` prints `INJECTED_ATTRIBUTE` on 0.18.5 and `ESCAPED` on 0.20.3; `probes/sheetjs-roundtrip.cjs` prints sheets/HTML for xlsx, xls, xlsm and CSV.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via PTM (2026-10-24) | Close both, one ticket; ask GraphiQL and library trade-off directly | Direct | Scope | DEC-001, DEC-002 |
| autobyteus-229 follow-ups FU-001/002/007 | Evidence and suggested tasks | Prior ticket | Basis | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Fastify | 5.12.7 (≥5.12.2 fixes all) | Node ≥20; v5 migration guide | Web, trial | Behavior changes not caught by types (e.g., content-type parsing, empty JSON body on DELETE) → suites |
| mercurius | 16.12.1 | Fastify 5, @fastify/static 10, no undici | npm | — |
| @fastify/cors / multipart / websocket | 11.3.1 / 10.1.6 / 11.3.4 | cors 11 default methods (we set them) | Releases | — |
| SheetJS CE | 0.20.3 from cdn.sheetjs.com, Apache-2.0 | Not on npm; pnpm pins integrity | CDN, trial | Install needs cdn.sheetjs.com reachable on a cold store |
| @whiskeysockets/baileys | 6.7.24 (`legacy` tag) | Critical fixed ≥6.7.22; git dep libsignal | npm, SD-02 | libsignal tarball from codeload.github.com |

## Persisted Data And State Facts

- Affected stored or external subject: none. No schema, file format or stored state changes.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-01-audit-base-vs-fastify5-sheetjs-trial.txt` | Solution Designer | Advisory verification and trial outcome | Workspace | REQ-001, REQ-010, AC-001, AC-009 | Current | Evidence; no approval |
| `evidence/SD-02-gateway-own-lockfile-audit.txt` | Solution Designer | Gateway lockfile/audit feasibility | Gateway | REQ-006..REQ-009 | Current | Evidence |
| `evidence/SD-03-gateway-docker-build-base.txt` | Solution Designer | Gateway Docker build fails at base | Gateway | REQ-008 | Current | Evidence |
| `evidence/SD-04-server-fastify5-trial.txt` | Solution Designer | Server trial typecheck/unit/e2e | Server | REQ-002..REQ-004 | Current | Evidence |
| `evidence/SD-05-sheetjs-probes.txt` | Solution Designer | SheetJS round trip and injection | Web | REQ-011, REQ-012 | Current | Evidence |
| `probes/sheetjs-roundtrip.cjs`, `probes/sheetjs-attr-escape.cjs` | Solution Designer | Reproductions (generated fixtures only) | Web | REQ-011, REQ-012 | Current | Evidence |
| `evidence/SD-06-mcp-route-cors-config-probe.txt`, `probes/cors-order-probe.mjs` | Solution Designer | MCP route CORS config on Fastify 4 vs 5 | Server | REQ-002, AC-003 | Current | Evidence |
| `evidence/SD-07-gateway-own-workspace-and-docker-trial.txt` | Solution Designer | Gateway own workspace, lockfile, Docker image | Gateway | REQ-005..REQ-008 | Current | Evidence |
| `evidence/SD-08-viewer-trial.txt`, `probes/excel-viewer-trial.diff`, `probes/ExcelViewerTrial.spec.ts.txt` | Solution Designer | Viewer design trial and its spec | Web | REQ-009..REQ-012 | Current | Evidence; starting point for implementation |
| `evidence/SD-09-hyperlink-cells.txt`, `probes/sheetjs-hyperlink.cjs` | Solution Designer | Hyperlink cells: output, sanitising, click path | Web | REQ-010, REQ-011, AC-013, DEC-008 | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Fastify 5 run-time behavior changes not visible to the type checker (content-type parsing, empty JSON bodies, semicolon delimiter, avvio plugin order) | Every request | Server unit/integration/e2e, MCP suites, packaged app, Docker (API/E2E) | Open |
| RSK-002 | Risk | SheetJS comes from cdn.sheetjs.com, not the npm registry | Clean installs/CI need that host; supply-chain trust moves to SheetJS's CDN | Integrity pinned in lockfile; DEC-002 | Open |
| RSK-003 | Risk | `libsignal` (baileys git dependency) resolves to a GitHub tarball | Gateway reproducibility | Lockfile records the commit | Accepted |
| UNK-001 | Unknown | Whether anyone relies on GraphiQL from another device | DEC-001 | User | Open |

## Architecture Investigation Findings

Authorities read for the design phase (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`. No persisted data is affected, so the Data Migration Guideline does not apply.

| Date | Source / Command | Observation | Established | Design implication |
| --- | --- | --- | --- | --- |
| 2026-10-24 | `build-studio-server.ts` L356-399 | Order: access-log policy → `registerMcpGatewayRoutes` → `cors` → `multipart` → `websocket` → remote-access policy → mobile static → REST (`/rest`) → WS routes → `registerGraphql`. Agent-tools MCP is a separate Fastify instance (`agent-tools-mcp-local-server.ts` L31-33), no cors plugin | Read | Order unchanged; mercurius sees our `@fastify/websocket` already registered |
| 2026-10-24 | `probes/cors-order-probe.mjs` on Fastify 4.29.1 + cors 9.0.1 vs 5.12.7 + cors 11.3.1 (`evidence/SD-06`) | The route config `{ cors: false }` has **no effect on base**; on Fastify 5 + cors 11 it starts suppressing the plugin's headers. Without it, Fastify 5 matches base for all three routes | Measured | Remove the never-effective config instead of typing it: preserves BEH-004 and removes the only type error (no `FastifyContextConfig` augmentation needed) |
| 2026-10-24 | `agent-tools-mcp-http-gate.ts` L13-34, L94; `mcp-gateway-routes.ts` L70-89; `mcp-gateway-http-helpers.ts` L5-66 | Both MCP gates are `onRequest` hooks that answer `OPTIONS` with their own CORS headers and reject non-loopback origins (403) before the cors plugin; the agent-tools instance has no cors plugin at all | Read | After removing the config the agent-tools route behaves identically (no plugin), the gateway route keeps the base plugin headers for loopback origins |
| 2026-10-24 | mercurius 16 `index.js` L190, L307; `lib/routes.js` L450-480 | `graphiql` defaults off; with it off mercurius registers neither `@fastify/static` nor `/graphiql*` | Read | DEC-001: drop the option; `/graphiql` then falls to the router's 404 after the remote-access hook (classification default unchanged) |
| 2026-10-24 | `raw-body-capture.ts` (gateway) | Own `application/json` parser, empty body → `{}` | Read | Fastify 5's empty-JSON-body rejection applies only to the default parser; gateway behavior unchanged (tests green) |
| 2026-10-24 | scratch: `pnpm install --lockfile-only` in the gateway folder without/with `.npmrc ignore-workspace=true`, then with a gateway `pnpm-workspace.yaml` (`evidence/SD-07`) | Without a local workspace file pnpm acts on the root workspace; `.npmrc` does not change discovery; a gateway `pnpm-workspace.yaml` (`packages: ["."]`) makes it its own root and leaves the root lockfile byte-identical | Measured | DEC-003 realised as a gateway-local workspace file + lockfile; build-script allowlist moves there from the Dockerfile's `printf` |
| 2026-10-24 | `autobyteus-message-gateway/tools/wechaty-sidecar/` | Existing precedent: its own `pnpm-lock.yaml`, Docker installs with `--ignore-workspace` | Read | Same separation idea; the gateway uses a workspace file so plain local commands (`pnpm install`, `pnpm audit`) also work. Sidecar left alone |
| 2026-10-24 | scratch `docker build` of the rewritten gateway Dockerfile (`evidence/SD-07`) | Without `packageManager` Corepack fetched pnpm 12.15.0 whose release-age policy rejected a package published today; with `"packageManager": "pnpm@10.28.2"` the image builds, `/health` answers, in-container fastify 5.12.7 / cors 11.3.1 / baileys 6.7.24 | Reproduced / Measured | Pin `packageManager` in the gateway manifest (same as root `package.json`) |
| 2026-10-24 | scratch viewer change + `ExcelViewerTrial.spec.ts` under `test:nuxt` (`evidence/SD-08`) | `sheet_to_html(sheet, { header: '', footer: '' })` + `DOMPurify.sanitize` (table tags, `colspan`/`rowspan`) renders xlsx, biff8 `.xls`, xlsm, CSV with tabs; injection cells stay text; DOMPurify 3.4.7 keeps table markup under happy-dom | Measured | Viewer design; the spec becomes the real-parser spec |
| 2026-10-24 | `grep excel-table` in web | The `id: 'excel-table'` option and per-cell ids are used by nothing (CSS uses `.sheet-table :deep(td:first-child)`) | Read | Drop the `id`/`editable` options; allowlist needs no `id`/`data-*` |
| 2026-10-24 | `probes/sheetjs-hyperlink.cjs` on 0.18.5 and 0.20.3 (tarball downloaded to an isolated dir, integrity equal to the lockfile entry), with DOMPurify 3.4.7 + jsdom (`evidence/SD-09`) | Both versions wrap hyperlinked cells (xlsx and biff8) in `<a href="Target">`, `javascript:` included. The table-only allowlist leaves the text; with `ALLOW_DATA_ATTR: false` also no `data-t`/`data-v` | Reproduced | ARCH-REV-001 AR-001 premise confirmed; DEC-008 |
| 2026-10-24 | `electron/shell/workspace-shell-window.ts` L52-59; `nuxt.config.ts` L240 + `tailwind.config.js` (no preflight override) | Desktop main window prevents all navigation and denies window.open, so a link click does nothing (a `javascript:` href still runs). Tailwind preflight makes `a` inherit colour/decoration, so links already look like text. On the phone a tap navigates the tab away | Read | DEC-008 (a): show text only |
| 2026-10-24 | `autobyteus-message-gateway/docker/Dockerfile` L15-26 | Copies root `pnpm-workspace.yaml`, root lockfile and `autobyteus-ts/package.json` + `autobyteus-ts/`; the gateway has not depended on `autobyteus-ts` since `40f769e0d9` | Read | Dead lines in a touched file: removed (Principle 7) |

## Requirement Implications

- The Fastify move is mechanically small for our code (one type-only break) but touches every request, so the requirements centre on preserved behavior proven by the existing suites and real surfaces.
- The gateway is no longer part of the product (2026-09-24), so its own lockfile keeps that separation (DEC-003); its audit found a critical in baileys with a patch fix (DEC-004).
- The spreadsheet path has a third, reproduced problem beyond the two advisories: attribute injection through `v-html`. The library update fixes it; DEC-005 adds a defence that does not depend on the library's escaping.
- Only SheetJS among the candidates reads `.xls`, which the Task requires to keep working.

## Notes For Architecture Design

- Map SCN-001..SCN-006 to the three server Fastify instances, the gateway instance and the viewer.
- Decide where the `FastifyContextConfig` augmentation lives (one place, imported by both MCP route files or a shared types file).
- Decide the gateway lockfile layout and Docker install command (`--ignore-workspace` or a gateway-only build context).
- Decide the viewer's sanitisation point and the real-library spec with generated fixtures.
