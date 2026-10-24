# Design Spec — fastify5-and-spreadsheet-parser

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (revision after ARCH-REV-001; SR-003 was the first design)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-004`. The SR-002 basis was approved by the User on 2026-10-24 in the Solution Designer conversation (the user's words are quoted in the requirements doc's Document Status): DEC-001 = GraphiQL off everywhere; DEC-002 = SheetJS 0.20.3 from cdn.sheetjs.com, integrity-pinned. The SR-004 delta (DEC-008: hyperlinked cells shown as text) was approved by the Solution Designer within the direction, with the user informed
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/investigation-notes.md`
- Authorities read (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`; `references/design-examples.md` not used
- Project design-principle conflicts or discrepancies: none. DESIGN.md rule 9 (no cross-version compatibility) supports removing `/graphiql` as a clean cut

## Current-State Read

- **Server (BEH-001, 002, 004, 005).** Three Fastify 4 instances: the studio server (`src/compositions/build-studio-server.ts` L356-399), the standalone application host (`build-standalone-application-server.ts` L19-21) and the local agent-tools MCP server (`src/agent-tools/mcp/agent-tools-mcp-local-server.ts` L31-33). The studio order is access-log policy → MCP gateway routes → `@fastify/cors` → `@fastify/multipart` → `@fastify/websocket` → remote-access `onRequest` policy → mobile static → REST → WebSocket routes → `registerGraphql` (mercurius, `graphiql: true`, `src/api/graphql/index.ts` L9-15). The code uses none of the APIs Fastify 5 removed (investigation Source Log). The one compile break is `{ config: { cors: false } }` on the two MCP routes (`agent-tools-mcp-routes.ts` L47, `mcp-gateway-routes.ts` L46). The probe in `evidence/SD-06` shows that this config never had an effect on Fastify 4 + cors 9. On Fastify 5 + cors 11 it would start suppressing the plugin's headers, which would change BEH-004.
- **Gateway (BEH-006).** A stand-alone Fastify 4 app (`autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` L53-60), outside the workspace since `40f769e0d9`, with no lockfile. Its Dockerfile installs through the root workspace, which selects nothing, so the build fails (`evidence/SD-03`). Run from the gateway folder, pnpm resolves to the root workspace (`evidence/SD-07`).
- **Viewer (BEH-007).** `ExcelViewer.vue` L44-122 parses with xlsx 0.18.5 and injects `XLSX.utils.sheet_to_html` output through `v-html` (L31). The spec mocks `xlsx` completely (`__tests__/ExcelViewer.spec.ts` L9-16).
- No structural problem in the ownership model: each concern already has its owner. The change is a dependency move plus small, owned edits.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 14 changed files in three packages (server: manifest, lockfile, 3 source files; gateway: manifest, 2 new workspace/lock files, Dockerfile, README; web: manifest, viewer, spec, one doc). All changes stay inside the existing owners (Final File Responsibility Mapping). No new runtime owner, API or persistence. Trials show that the code delta is small (SD-04, SD-07, SD-08).
- Architectural risk: `High`
- Risk rationale and supporting evidence: a framework major sits under every HTTP/WebSocket/GraphQL/MCP request in every runtime (blast radius; RSK-001). The change also alters deployment and dependency sourcing: a new gateway lockfile and Docker install path, and a web dependency from a non-npm host (RSK-002). It touches security boundaries: GraphiQL removal and HTML sanitisation in the viewer. The Task itself asks for architecture review.
- Escalation trigger if implementation or validation discovers new impact: any Fastify 5 behavior difference that requires changing a route, hook, status code, header or payload contract; any need for a Fastify type augmentation or plugin re-ordering; a mercurius 16 subscription or context difference; the SheetJS tarball not installing in the packaged-app or Docker build. Each goes back to the Solution Designer as a `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Audit base vs trial | `evidence/SD-01` | All 13 targeted advisories removed, none added | Target versions (DEC-006) | `body-parser` FU-001 out of scope |
| Server trial | `evidence/SD-04` | One type-only break; unit and e2e green apart from 4 tests that fail on base too | The server delta is dependency ranges plus 3 source edits | Integration suite, packaged app, Docker: API/E2E |
| MCP CORS probe | `evidence/SD-06`, `probes/cors-order-probe.mjs` | `cors: false` is ineffective on base and effective on Fastify 5; removing it matches base | Remove the config (no type augmentation) | — |
| mercurius 16 source | `index.js` L190, L307; `lib/routes.js` L450-480 | GraphiQL defaults off; with it off, `@fastify/static` is not registered | DEC-001 = delete the option | — |
| Gateway workspace + Docker trial | `evidence/SD-07` | A local `pnpm-workspace.yaml` isolates the gateway; `packageManager` pin needed; image builds, `/health` OK | Gateway layout and Dockerfile | — |
| Viewer trial | `evidence/SD-08`, `probes/excel-viewer-trial.diff`, `probes/ExcelViewerTrial.spec.ts.txt` | Real-parser spec green for xlsx/xls/xlsm/csv and injection | Viewer change and spec | Packaged-app rendering: API/E2E |
| SheetJS probes | `evidence/SD-05`, `probes/sheetjs-*.cjs` | 0.20.3 output matches 0.18.5 except escaping; 0.18.5 attribute injection | DEC-002, DEC-005 | — |
| Hyperlink probe + click path | `evidence/SD-09`, `probes/sheetjs-hyperlink.cjs`; `electron/shell/workspace-shell-window.ts` L52-59 | Both versions emit `<a href>` incl. `javascript:`; the table-only allowlist with `ALLOW_DATA_ATTR: false` leaves `<td>text</td>`; desktop link clicks already do nothing; links already look like text (Tailwind preflight) | DEC-008: links rendered as text; no `a` in the allowlist; no `data-*` | — |

## Intended Change

Move the server and the gateway to Fastify 5 and the matching plugin majors without changing any request behavior. Turn GraphiQL off. Make the gateway its own pnpm workspace with a committed lockfile, a pinned pnpm, a clean audit and a Docker image that installs from that lockfile. Replace xlsx 0.18.5 with the integrity-pinned SheetJS 0.20.3 tarball, render only the table, sanitise it to table structure before `v-html` (hyperlinked cells keep their text, not the link: DEC-008), and test the viewer with the real parser on generated workbooks.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Areas: the server's dependency manifest and lockfile entries, its GraphQL registration and two MCP route registrations; the gateway's manifest, its new workspace/lock files, Dockerfile and README install notes; the web's `xlsx` dependency, `ExcelViewer.vue`, its spec, and the Excel row in `docs/content_rendering.md`.
- Derived consumers: `N/A`. No stored or shared structure changes. The `sheetHtml` computed value is read only by the viewer's own template.
- Deliberately left alone:
  - the remote-access route policy (`/graphiql` falls to the default classification, then the router's 404; no rule for a route that no longer exists);
  - the plugin registration order;
  - the server Docker image's `--no-frozen-lockfile` install (autobyteus-231);
  - the gateway runtime-package script (FU-002);
  - the wechaty sidecar's own lockfile pattern;
  - other `v-html` sites and a CSP (FU-003);
  - `graphql` 16;
  - Prisma;
  - `body-parser` (FU-001).
- Follow-ups: FU-001, FU-002, FU-003, FU-004, FU-005.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..003; AC-001, 002, 004, 006..008 | Any client request (SCN-001) | Current-State Read; SD-04 | Preserved on Fastify 5 | DS-001 |
| BEH-002 | System | REQ-001, 002; AC-002, 005 | `/graphql` (SCN-002) | `src/api/graphql/index.ts` | Preserved on mercurius 16 | DS-002 |
| BEH-003 | User/Dev | REQ-004; AC-005 | `GET /graphiql` (SCN-003) | GraphiQL served today | **Changed:** no GraphiQL; `/graphiql*` → 404 | DS-002 |
| BEH-004 | System | REQ-002; AC-003 | MCP clients (SCN-004) | SD-06 | Preserved, incl. CORS headers | DS-003 |
| BEH-005 | User | REQ-002; AC-006 | Uploads | `upload-file.ts` L86-107 | Preserved on multipart 10 | DS-001 |
| BEH-006 | Operational | REQ-005..008; AC-009, 010 | Gateway install/run/Docker (SCN-005) | SD-02, SD-03, SD-07 | **Changed:** own lockfile, audited, Docker works | DS-004, DS-005 |
| BEH-007 | User | REQ-009..012; AC-011..014 | Open a spreadsheet (SCN-006) | SD-05, SD-08, SD-09 | Same rendering; new parser; sanitised; hyperlinked cells as text (DEC-008) | DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/SD-01`..`SD-08`, `probes/` | Evidence and reproductions | see investigation inventory | Basis of every decision | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (dependency majors plus a security fix)
- Current design issue found: `No` for ownership. Two local items are dead or ineffective: the MCP routes' `cors: false` config and the gateway Dockerfile's `autobyteus-ts` lines.
- Structural triggers that fire, with evidence:
  - **Legacy cleanup.** The never-effective `cors: false` would become a behavior change (SD-06). It is removed, not typed.
  - **Capability-area reuse.** Sanitisation reuses the app's DOMPurify (`composables/useMarkdownSegments.ts` L4, L370). The gateway isolation follows the sidecar's own-lockfile precedent.
  - **Several kinds or forms.** Two MCP route paths (agent-tools on its own Fastify instance with no cors plugin; the MCP gateway on the studio instance) and three server instances. Each is traced (investigation Architecture Findings).
  - Ruled out: responsibility overload (`ExcelViewer.vue` 265 lines, stays below 500); empty indirection (no new layer); persisted-data transition (none).
- Root cause classification: `No Design Issue Found` for the dependency move; `Local Implementation Defect` (library escaping, plus HTML injected without sanitising) for the viewer injection
- Refactor needed now: `No`
- Evidence: the trials compile and pass with only the edits below (SD-04, SD-07, SD-08)
- Design response: bounded edits in the existing owners
- Refactor rationale: owners and boundaries are healthy for this scope
- Intentional deferrals and residual risk: CSP (FU-003); the server image's unfrozen install (autobyteus-231)

## Terminology

No new domain words. `GraphiQL` = mercurius's browser IDE page. `SheetJS CE` = the community edition of the `xlsx` library. No project glossary entry is needed (`GLOSSARY.md` is untouched).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: GraphiQL routes; the MCP routes' `cors: false` config; the gateway Dockerfile's root-workspace install and `autobyteus-ts` copies; the viewer's unused `id`/`editable` options; the spec's `xlsx` mock.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored data, schema or file format is read or written differently. The viewer is read-only, and lockfiles are build inputs, not app data.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-005 | Client HTTP/WS request | Handler response | Fastify instance per composition (`build-studio-server.ts`, `build-standalone-application-server.ts`) | Every request runs through the moved framework |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | `/graphql` POST/WS; `GET /graphiql` | GraphQL result; 404 | `registerGraphql` (`src/api/graphql/index.ts`) | mercurius major; GraphiQL removal |
| DS-003 | Primary End-to-End | BEH-004 | Agent runtime MCP request | JSON-RPC response | MCP gates + routes (`agent-tools-mcp-*`, `mcp-gateway-*`) | CORS config change |
| DS-004 | Primary End-to-End | BEH-006 | Developer `pnpm install` in the gateway folder | Gateway `node_modules` from its lockfile | Gateway `pnpm-workspace.yaml` + `pnpm-lock.yaml` | Reproducible, auditable gateway |
| DS-005 | Primary End-to-End | BEH-006 | `docker build -f autobyteus-message-gateway/docker/Dockerfile .` | Running container `/health` | Gateway Dockerfile | Docker installs from the lockfile |
| DS-006 | Primary End-to-End | BEH-007 | User opens a spreadsheet | Sanitised table in the DOM | `ExcelViewer.vue` | Parser swap and injection fix |

## Primary Execution Spine(s)

- DS-001: `Client -> Fastify 5 router -> access-log / MCP gates / cors / remote-access onRequest hooks -> REST, WS or upload handler -> response`
- DS-002: `Web app -> /graphql -> remote-access policy -> mercurius 16 (context: createGraphqlRequestContext) -> resolvers -> result`; `Browser -> GET /graphiql -> remote-access policy (default class) -> router 404`
- DS-003: `Agent runtime MCP client -> MCP gate onRequest (origin, OPTIONS, method) -> [studio only: cors plugin onRequest] -> MCP route handler -> dispatcher -> JSON-RPC reply`
- DS-004: `pnpm install (gateway folder) -> nearest pnpm-workspace.yaml = gateway -> gateway pnpm-lock.yaml (frozen) -> node_modules`
- DS-005: `docker build (repo root context) -> copy licence files + gateway manifest/lock/workspace -> pnpm 10.28.2 via Corepack (packageManager) -> pnpm install --frozen-lockfile -> copy gateway -> pnpm build -> node dist/index.js`
- DS-006: `File explorer / artifact / reference / mobile viewer -> FileViewer -> ExcelViewer.loadExcel (URL: authorizedFetch -> Uint8Array, type 'array' — xlsx, xls, xlsm and CSV files; or streamed content: string, type 'string' — CSV text) -> XLSX.read -> sheet_to_html(header '', footer '') -> DOMPurify.sanitize (table allowlist, no data-*) -> v-html`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Same instances, same registration order, new framework and plugin majors; no handler code changes | Request, hooks, handlers | Composition files | Logger options (unchanged object form) |
| DS-002 | mercurius 16 with the same schema/context/subscription options; the `graphiql` option is deleted, so no IDE routes and no static plugin | GraphQL request | `registerGraphql` | Remote-access classification (unchanged) |
| DS-003 | Gates answer preflight and reject foreign origins as today; the route registration drops the never-effective config so the cors plugin keeps its base behavior on the studio instance | MCP request | MCP route/gate files | Raw-string body parsers (unchanged) |
| DS-004 | The gateway is its own workspace root, so plain pnpm commands use the gateway lockfile; the build-script allowlist lives in that workspace file | Gateway dependencies | Gateway workspace file | `packageManager` pin |
| DS-005 | The image installs only from the gateway lockfile with the pinned pnpm, builds and starts | Image | Dockerfile | Licence files (unchanged) |
| DS-006 | Parse as today through both entry forms (URL bytes, streamed string); render only the table; sanitise to table structure, which also turns hyperlinked cells into their text; inject | Workbook, sheet HTML | `ExcelViewer.vue` | DOMPurify (existing dependency) |

## Spine Actors / Main-Line Nodes

Fastify instances; mercurius; MCP gates and routes; gateway workspace file and lockfile; gateway Dockerfile; `ExcelViewer.loadExcel` and `sheetHtml`.

## Ownership Map

- Composition files own each Fastify instance's options and plugin order (unchanged).
- `registerGraphql` owns the GraphQL plugin options, including whether an IDE exists.
- The MCP route files own their routes; the MCP gate files own MCP origin/preflight/CORS headers for preflights.
- `autobyteus-message-gateway/pnpm-workspace.yaml` owns the gateway's workspace boundary and build-script allowlist; `pnpm-lock.yaml` owns resolved versions; `package.json` owns ranges and the pnpm version pin.
- `ExcelViewer.vue` owns parsing, rendering and the sanitisation of its own HTML.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No facade is added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `graphiql: true` in `src/api/graphql/index.ts` L12 (and with it `/graphiql`, `/graphiql/main.js`, `/graphiql/sw.js`, `/graphiql/config.js`) | DEC-001 | Nothing (option deleted; mercurius default off) | Clean cut; no flag |
| `{ config: { cors: false } }` in `agent-tools-mcp-routes.ts` L47 and `mcp-gateway-routes.ts` L46 | Dead: no effect on base (SD-06); keeping it would change BEH-004 on Fastify 5 | Route registered as `mcpApp.all(ROUTE, handler)` | Removes the only type error |
| Gateway Dockerfile: `COPY pnpm-workspace.yaml pnpm-lock.yaml ./`, `COPY autobyteus-ts/package.json …`, `printf … onlyBuiltDependencies >> pnpm-workspace.yaml`, `pnpm install --frozen-lockfile --filter autobyteus-message-gateway...`, `COPY autobyteus-ts autobyteus-ts`, `pnpm -C autobyteus-message-gateway build`, `WORKDIR /app/autobyteus-message-gateway` | Dead/broken: the gateway is not a root member and has not depended on `autobyteus-ts` since `40f769e0d9`; the build fails at base (SD-03) | Gateway-only install from its own files (Target mapping) | — |
| `ExcelViewer.vue` `sheet_to_html` options `id: 'excel-table'`, `editable: false` | Dead: no CSS/JS uses the ids (grep); `editable: false` is the default | `{ header: '', footer: '' }` | — |
| `__tests__/ExcelViewer.spec.ts` `vi.mock('xlsx', …)` | Replaced by real-parser tests (REQ-012) | Generated workbooks | Keep the loading-state case |

## Return Or Event Spine(s) (If Applicable)

N/A. GraphQL subscriptions and WebSocket streams are unchanged; their suites cover them.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| DOMPurify (existing dependency, pinned 3.4.7) | DS-006 | `ExcelViewer.vue` | Strip anything but table structure (including SheetJS's `<a href>` for hyperlinked cells and its `data-t`/`data-v`/`id` attributes) | Defence independent of the parser's escaping (DEC-005); removes `javascript:` link targets (SD-09, DEC-008) | A shared "sanitize util" layer for one caller would be empty indirection |
| `packageManager` pin | DS-004, DS-005 | Gateway manifest | Same pnpm locally, in Corepack and in Docker | SD-07 | — |

## Ownership Boundaries

The remote-access policy remains the only authority on route classification; this design adds no rule. The MCP gates remain the authority for MCP preflights. The gateway's workspace file is the boundary that keeps the gateway out of the root workspace and the root out of the gateway.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Gateway `pnpm-workspace.yaml` + lockfile | Resolved gateway dependency tree | Developers, Dockerfile | Installing the gateway through the root workspace, or with npm without a lockfile | N/A |
| `ExcelViewer.vue` `sheetHtml` | Parser output | Template `v-html` | Injecting unsanitised parser output | N/A |

## Dependency Rules

- The root workspace must not list the gateway, and the gateway must not depend on workspace packages (unchanged since `40f769e0d9`).
- The gateway Docker build reads only the licence files and `autobyteus-message-gateway/` from the root context.
- The web depends on `xlsx` only through the pinned tarball URL; no second spreadsheet library.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `GET /graphiql*` | — | Removed | — | 404 |
| All other HTTP/WS/GraphQL/MCP routes | unchanged | unchanged | unchanged | REQ-002 |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Routes (unchanged) | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Viewer | `ExcelViewer` (unchanged) | Yes | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| HTML sanitisation | DOMPurify, as in `useMarkdownSegments.ts` | Reuse | Same library, already pinned and tested under happy-dom | — |
| Separate lockfile for a non-member package | wechaty sidecar's own lockfile | Extend the idea | The gateway also needs plain local commands to work, hence a workspace file | — |
| Remote-access classification of `/graphiql` | `remote-access-route-policy.ts` | Reuse unchanged | Default class + 404 is correct for a non-existent route | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server API (`src/api/graphql`) | GraphQL plugin options | DS-002 | `registerGraphql` | Extend (delete option) | — |
| Server MCP (`src/agent-tools/mcp`, `src/mcp-gateway`) | Route registration | DS-003 | Route files | Extend (delete config) | — |
| Gateway packaging | Workspace, lockfile, Dockerfile, README | DS-004, DS-005 | Gateway | Extend | — |
| Web file viewers | Parse/render/sanitise | DS-006 | `ExcelViewer.vue` | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping. No shared structures appear, so the draft and final mappings are the same.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Shared Structure / Data Model Tightness Check

N/A. No shared structure changes.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/package.json` | Server | Manifest | Ranges: `fastify` ^5.12.7, `mercurius` ^16.12.1, `@fastify/cors` ^11.3.1, `@fastify/multipart` ^10.1.6, `@fastify/websocket` ^11.3.4 | — | — |
| `pnpm-lock.yaml` (root) | Workspace | Lockfile | Resolutions for the server and web changes | — | — |
| `autobyteus-server-ts/src/api/graphql/index.ts` | Server API | `registerGraphql` | Drop `graphiql: true` | — | — |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Server MCP | Route | Drop `{ config: { cors: false } }` | — | — |
| `autobyteus-server-ts/src/mcp-gateway/mcp-gateway-routes.ts` | Server MCP | Route | Same | — | — |
| `autobyteus-message-gateway/package.json` | Gateway | Manifest | `fastify` ^5.12.7, `@fastify/cors` ^11.3.1, `@whiskeysockets/baileys` 6.7.24 (exact, as today), `"packageManager": "pnpm@10.28.2"` | — | — |
| `autobyteus-message-gateway/pnpm-workspace.yaml` (new) | Gateway | Workspace boundary | `packages: ["."]`; `onlyBuiltDependencies` for the gateway's install-script packages, determined from the install's "Ignored build scripts" output (the old Dockerfile list was `@whiskeysockets/baileys`, `esbuild`, `node-pty`, `protobufjs`, `sharp`; keep only those present in the gateway tree) | — | — |
| `autobyteus-message-gateway/pnpm-lock.yaml` (new) | Gateway | Lockfile | Generated by `pnpm install` in the gateway folder | — | — |
| `autobyteus-message-gateway/docker/Dockerfile` | Gateway | Image | Install from the gateway files only (example below) | — | — |
| `autobyteus-message-gateway/README.md` | Gateway | Docs | One short "Install" note: the gateway is its own pnpm workspace; run `pnpm install` / `pnpm audit` in this folder. Reconcile L290-291 (`pnpm approve-builds`): build scripts are allowed by the gateway's `pnpm-workspace.yaml`, so the note points there (ARCH-REV-001 residual) | — | — |
| `autobyteus-web/package.json` | Web | Manifest | `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` | — | — |
| `autobyteus-web/components/fileExplorer/viewers/ExcelViewer.vue` | Web viewers | Viewer | `sheetHtml` = sanitised table-structure HTML (example below); hyperlinked cells come out as their text | — | DOMPurify |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/ExcelViewer.spec.ts` | Web viewers | Spec | Real parser, generated workbooks (start from `probes/ExcelViewerTrial.spec.ts.txt`). Cases: loading; error + Retry; xlsx, xls (biff8) and xlsm via URL; **CSV via URL** (bytes, `type: 'array'`, AR-002); CSV via content (`type: 'string'`); two-sheet tabs and switching; injection cells (quote + `on*`, `<img onerror>`, `<script>`); **hyperlinked cells to an `https:` and a `javascript:` target** (set `cell.l = { Target }` before `XLSX.write`) → no `a` element and no `href`/`on*`/`data-*` attribute in the DOM, cell text shown (AC-013) | — | — |
| `autobyteus-web/docs/content_rendering.md` L59 | Web docs | Docs | Excel row lists `.xlsx`, `.xls`, `.xlsm`, `.csv` (matching `fileTypePolicy.ts` L15); one line naming SheetJS CE from cdn.sheetjs.com, the sanitising to table structure, and that hyperlinked cells show their text without a link | — | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

Same files as the Final File Responsibility Mapping; no folders are added or moved.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-message-gateway/` | Mixed Justified (package root) | Yes | Low | Workspace/lock files belong at the package root |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| MCP route | `mcpApp.all<{ Body: unknown }>(MCP_GATEWAY_ROUTE, async (request, reply) => handleMcpGatewayRequest({ … }))` | `declare module "fastify" { interface FastifyContextConfig { cors?: false } }` to keep `{ config: { cors: false } }` compiling, which silently changes BEH-004 (SD-06) | The obvious type fix is a behavior change |
| GraphQL | `app.register(mercurius, { schema, path: "/graphql", subscription: true, context: createGraphqlRequestContext })` | `graphiql: process.env.X === "1"` (a flag nobody asked for) | DEC-001 is a clean cut |
| Viewer | `const html = XLSX.utils.sheet_to_html(sheet, { header: '', footer: '' }); return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['table','thead','tbody','tr','th','td','br'], ALLOWED_ATTR: ['colspan','rowspan'], ALLOW_DATA_ATTR: false });` → a hyperlinked cell `<td …><a href="javascript:…">evil</a></td>` becomes `<td>evil</td>` (SD-09). `probes/excel-viewer-trial.diff` predates `ALLOW_DATA_ATTR: false` | `v-html` of the full `<html><head><title>…` document straight from the parser; allowing `a[href]`, which keeps a link that does nothing on desktop and leaves the app on the phone | Defence does not depend on one library's escaping |
| Gateway Dockerfile | `WORKDIR /app` · `COPY LICENSE LICENSING.md NOTICE /app/` · `RUN corepack enable` · apt build tools (unchanged) · `COPY autobyteus-message-gateway/package.json autobyteus-message-gateway/pnpm-lock.yaml autobyteus-message-gateway/pnpm-workspace.yaml ./` · `RUN pnpm install --frozen-lockfile` · `COPY autobyteus-message-gateway/ ./` · `RUN pnpm build` · same ENV/EXPOSE/CMD | Installing via `--filter` from the root lockfile; `printf … >> pnpm-workspace.yaml` | Trial-proven (SD-07); compose files keep `context: ../..` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Env flag to keep GraphiQL for developers | Convenience | Rejected | Deleted; any GraphQL client works against `/graphql` |
| Keeping xlsx 0.18.5 for a fallback path | — | Rejected | One parser |
| Gateway in both the root workspace and its own | — | Rejected | Own workspace only |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Commit 1 — spreadsheet parser (Part 2).** Web manifest + root lockfile entry for `xlsx`; `ExcelViewer.vue`; spec; `docs/content_rendering.md`. Prove `test:nuxt` and the probe (`probes/sheetjs-attr-escape.cjs` on the installed package prints `ESCAPED`).
2. **Commit 2 — server on Fastify 5.** Server manifest + root lockfile; drop `graphiql`; drop the two `cors: false` configs. Prove typecheck, build, unit, integration, e2e (base comparison for any failure), MCP suites, the AC-003 header probe on base and branch, and audit.
3. **Commit 3 — gateway.** Manifest (+ `packageManager`), `pnpm-workspace.yaml`, generated `pnpm-lock.yaml`, Dockerfile, README note. Prove frozen install, typecheck, tests, `pnpm audit` (0 high/critical), Docker build + `/health`, and that the root `pnpm install --frozen-lockfile` and root lockfile are unaffected by the gateway files.
4. Packaged app and server Docker image from a clean clone of the branch (AC-007, AC-008, AC-014).

## Key Tradeoffs

- Hyperlinked cells lose their link (DEC-008). Clicking one does nothing on desktop today and leaves the app on the phone, and a `javascript:` target runs script. Opening links in the system browser would be a new feature (FU-005).
- Removing `cors: false` keeps today's behavior, including the cors plugin echoing loopback origins on MCP gateway responses, rather than adopting the stricter behavior the config's author may have intended. Changing MCP CORS policy is not this ticket's scope.
- The SheetJS CDN dependency means a cold install needs `cdn.sheetjs.com`; integrity pinning makes the risk availability-only.
- A gateway-local workspace file differs from the sidecar's `--ignore-workspace` style, but lets plain commands work. The sidecar is left as is.

## Risks

- RSK-001: Fastify 5 run-time differences not covered by suites → packaged-app and Docker checks, AC-003/AC-004 probes.
- RSK-002: CDN availability → integrity-pinned; failure is loud at install.
- RSK-003: baileys' `libsignal` git tarball → locked commit.
- New: the root lockfile diff is large (dedupe from removing Fastify 4 trees, ~500 lines in the trial). Review that the diff only moves the intended packages and their transitive trees.

## Guidance For Implementation

- Reproduction to start from: `node tickets/in-progress/fastify5-and-spreadsheet-parser/probes/sheetjs-attr-escape.cjs <installed xlsx dir>` prints `INJECTED_ATTRIBUTE` on 0.18.5 and must print `ESCAPED` after the change. `probes/sheetjs-hyperlink.cjs <xlsx dir> <dompurify dir> <jsdom dir>` shows the hyperlink output and the allowlist result. `probes/ExcelViewerTrial.spec.ts.txt` is the starting real-parser spec (fails its injection case on base without the sanitiser and parser update). `probes/cors-order-probe.mjs <fastify> <@fastify/cors>` shows the MCP CORS behavior.
- Use `pnpm add` with exact ranges from the mapping; do not touch unrelated ranges. Run `pnpm install` in the gateway folder to create its lockfile (it is its own workspace once `pnpm-workspace.yaml` exists).
- Generated fixtures only (`XLSX.utils.aoa_to_sheet` + `XLSX.write`). Never read a real user file.
- Do not add a Fastify type augmentation, a GraphiQL flag or a remote-access rule.
- Never print or store secrets in evidence (the gateway container needs no secret for `/health`).
