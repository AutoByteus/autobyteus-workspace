# Implementation Handoff — fastify5-and-spreadsheet-parser

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/`
Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`, `codex/fastify5-and-spreadsheet-parser` (base `origin/personal` @ `ddd6fdcdf6`)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium + High) and passed (ARCH-REV-002); the source-review route applies after implementation
- Requirements doc: `requirements-doc.md` (Approved, SR-004)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-004, `Ready`)
- Supplemental task artifacts: `evidence/SD-01`..`SD-09`, `probes/` (Solution Designer); `follow-ups.md`
- Design review report: `design-review-report.md` (round 2, `Pass`)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Commits, in the order the design asked for, plus one test adaptation:

| Commit | Scope |
| --- | --- |
| `195db3c42e` | Viewer: SheetJS 0.20.3 tarball, sanitised table, real-parser spec, docs row |
| `bbd88fd3ea` | Server: Fastify 5 + plugin majors, GraphiQL off, MCP `cors: false` config removed |
| `5c7ab7426c` | Gateway: Fastify 5, own workspace + lockfile, Dockerfile, README |
| `29aeb5d721` | Server test: the studio listener integration test no longer depends on `listen()`'s return string (see Known Risks / IMP-13) |

The ticket folder (this handoff, the revision record, evidence and probes) is committed on top of these in a `docs(ticket)` commit.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 13 non-lockfile files changed (194+/104−) in the three owners the design names, plus two lockfiles. No new owner, API or persistence. The risk stays High for the reasons given in the design: the framework major sits under every request, the gateway's install and deployment path changes, a dependency comes from a non-npm host, and two security boundaries change.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No route, hook, status code, header or payload contract changed (IMP-06/IMP-08). No type augmentation and no plugin reordering. mercurius 16 subscriptions over WebSocket ack (IMP-17). The SheetJS tarball installed cold in the clean clone, the packaged app and the server image (IMP-16, IMP-17, IMP-19). One Fastify 5 difference was found outside the trigger list, `listen()`'s return value for a wildcard bind; it is recorded under Known Risks.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Preserved on Fastify 5 | `autobyteus-server-ts/package.json` (fastify ^5.12.7, @fastify/cors ^11.3.1, /multipart ^10.1.6, /websocket ^11.3.4); root `pnpm-lock.yaml`; composition files unchanged | Typecheck, unit (6770 tests) and integration (420) pass; build passes; packaged app and server image serve (IMP-07, IMP-09, IMP-11, IMP-15, IMP-17, IMP-19) |
| BEH-002 | Preserved on mercurius 16 | `mercurius` ^16.12.1; `src/api/graphql/index.ts` keeps schema, path, `subscription: true` and context | GraphQL POST 200 and the WebSocket `graphql-transport-ws` handshake acks in the packaged app (IMP-17) |
| BEH-003 | Changed: no GraphiQL; `/graphiql*` → 404 | `src/api/graphql/index.ts`: `graphiql: true` removed (no flag) | `/graphiql`, `/graphiql/main.js` and `/graphiql/config.js` return 404 (IMP-17, IMP-19) |
| BEH-004 | Preserved, including the CORS headers | `src/agent-tools/mcp/agent-tools-mcp-routes.ts`, `src/mcp-gateway/mcp-gateway-routes.ts`: `{ config: { cors: false } }` removed | Base (Fastify 4.29.1) and branch (5.12.7) give identical status codes and `Access-Control-*`/`Vary` headers for 6 cases on each route (IMP-06 vs IMP-08) |
| BEH-005 | Preserved on multipart 10 | `@fastify/multipart` ^10.1.6; upload code unchanged | Unit and integration suites pass. The live upload-limit journey is left to API/E2E |
| BEH-006 | Changed: own lockfile, audited, Docker works | `autobyteus-message-gateway/{package.json, pnpm-workspace.yaml, pnpm-lock.yaml, docker/Dockerfile, README.md}` | Frozen install, typecheck, 268 tests and `pnpm audit` pass (no known vulnerabilities); root lockfile untouched (IMP-10). Image builds from a clean clone and `/health` returns 200 (IMP-18) |
| BEH-007 | Same rendering; new parser; sanitised; hyperlinked cells as text | `autobyteus-web/package.json` (`xlsx` tarball URL), `ExcelViewer.vue` `sheetHtml`, spec, `docs/content_rendering.md` | Spec 10/10 (IMP-02); mutation without the sanitiser fails the 2 security cases (IMP-03); rendered in Chrome (IMP-14); probe now prints `ESCAPED` (IMP-01) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-web/components/fileExplorer/viewers/ExcelViewer.vue` (L45 import; L59-74 `sheetHtml`): `sheet_to_html(sheet, { header: '', footer: '' })` → `DOMPurify.sanitize(…, { ALLOWED_TAGS: table/thead/tbody/tr/th/td/br, ALLOWED_ATTR: colspan/rowspan, ALLOW_DATA_ATTR: false })`. The loading, error, Retry and tab code is unchanged.
- `autobyteus-web/components/fileExplorer/viewers/__tests__/ExcelViewer.spec.ts`: rewritten as a real-parser spec covering every case in the design. It runs under `// @vitest-environment jsdom` (see Important Assumptions).
- `autobyteus-server-ts/src/api/graphql/index.ts`, `src/agent-tools/mcp/agent-tools-mcp-routes.ts`, `src/mcp-gateway/mcp-gateway-routes.ts`: one line removed in each.
- `autobyteus-message-gateway/pnpm-workspace.yaml`: `packages: ["."]`; `onlyBuiltDependencies: ["@whiskeysockets/baileys", protobufjs]`. These are the only two packages pnpm reported as having build scripts. `esbuild`, `node-pty` and `sharp` scripts are not in the gateway tree.
- `autobyteus-message-gateway/docker/Dockerfile`: installs from the gateway's `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` only (`--frozen-lockfile`), with pnpm 10.28.2 through Corepack. The root-workspace install, the `printf` allowlist and the `autobyteus-ts` copies are gone.
- Root `pnpm-lock.yaml`. Commit 1: 7 insertions and 61 deletions, only the `xlsx` entry and 0.18.5's seven dependencies. Commit 2: 233 insertions and 282 deletions, all in the fastify, mercurius and `@fastify/*` trees (fastify 4 → 5, find-my-way 8 → 9, avvio, light-my-request, `@fastify/static` 7 → 10, undici 5, `@fastify/busboy`, mqemitter and similar). The only entries outside the server are the web Apollo packages, whose optional peer `@fastify/websocket` id changes from 10.0.1 to 11.3.4 inside their snapshot keys; no web package version changes.

## Important Assumptions

- **Deviation 1, the viewer spec runs under jsdom.** In the web suite's default happy-dom 15, DOMPurify stops walking the tree after the first node it removes, so a correct sanitiser looks broken: `<a href="javascript:…">` survived (IMP-04). Browsers and jsdom sanitise correctly (IMP-04, IMP-14; SD-09 also used jsdom). The production code is the design example exactly. The test-environment problem is FU-006.
- **Deviation 2, the gateway Dockerfile keeps `WORKDIR /app/autobyteus-message-gateway`.** The design example used `WORKDIR /app` and listed that WORKDIR line for removal. That would move the gateway's working directory, and with it the default `GATEWAY_RUNTIME_DATA_ROOT` (`<cwd>/memory`, `src/config/runtime-config.ts` L68/L165/L181), off the volume that `docker/docker-compose.yml` L14 and `docker-compose.wechat-personal.yml` L19 mount at `/app/autobyteus-message-gateway/memory`. The example `.env.docker` roots point there too. Gateway data would then be lost when the container is recreated. Keeping the path preserves that contract. The install still reads only the gateway's three files, as DS-005 requires. Code review should confirm this reading.
- The lockfile entries were generated with a fresh pnpm store (`--store-dir`), and installs were then verified with `--frozen-lockfile` against the normal store. With the machine's shared store, pnpm 10.28.2 wrote the `xlsx` tarball entry without `integrity` and re-resolved an unrelated `magic-string` peer. The committed entry has `integrity: sha512-oLDq3jw7…`, the same hash as SD-05/SD-09. See Environment Or Dependency Notes.

## Known Risks

- **Fastify 5 `listen()` return value for a wildcard bind.** Fastify 4 returned `http://0.0.0.0:<port>`; Fastify 5 returns `http://127.0.0.1:<port>` (IMP-13). Request handling is unchanged: `request.ip`, the `Host` header and the MCP gateway access gate behave the same, and a request with a non-loopback `Host` still gets 401. Two consequences:
  - The studio listener integration test built its non-loopback request from that string. It now builds the URL from the bound address (`29aeb5d721`).
  - In production, only the standalone application host keeps the value, as `handle.url`. The devkit prints it ("Standalone application ready: …") and reloads its browser with it. It differs only when a developer explicitly passes a wildcard `--host`/`--listen-host`, and the new URL is reachable. This is not an HTTP status, header, payload, classification or authentication contract, so it is not a design-impact trigger. Code review may weigh it.
- RSK-001: Fastify 5 run-time differences not covered by the suites. The server E2E folder and the live journeys (AC-006 upload limits, AC-007 run streaming, AC-008 full container check) are for API/E2E.
- RSK-002: `cdn.sheetjs.com` must be reachable on a cold install. It worked for the clean clone, the packaged app and the server image; the integrity hash is verified on install.
- RSK-003: the gateway lockfile's `libsignal` is a codeload.github.com tarball pinned by commit (`bcea72df…`) with no `integrity` field; pnpm records none for git-hosted tarballs.
- The packaged `@fastify/static` 10.1.7 is still installed as a mercurius dependency. It is not loaded, because GraphiQL is off.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement`
- Reviewed root-cause classification: `No Design Issue Found` (dependency move); `Local Implementation Defect` (viewer injection)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: bounded edits in the existing owners; the two deviations above are behavior-preserving adjustments to examples, not changes of ownership or behavior.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: `graphiql: true`; both `cors: false` configs; the viewer's `id`/`editable` options; the spec's `xlsx` mock; and the gateway Dockerfile's root-workspace lines and `autobyteus-ts` copies.
- Dead code found elsewhere, added to `follow-ups.md`: None new (FU-002 already covers the gateway runtime-package script)
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (`ExcelViewer.vue` 271 lines; the other source edits are single-line removals)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- **pnpm store gotcha.** In this machine's shared store, pnpm 10.28.2 resolves the `xlsx` tarball without an `integrity` field and re-resolves `@nuxtjs/apollo`'s `magic-string` peer. A fresh `--store-dir` gives the clean result, and frozen installs against either store accept it. Anyone regenerating the root lockfile should check that `xlsx@https://cdn.sheetjs.com/…` still carries `integrity`.
- A fresh worktree needs `pnpm -C autobyteus-server-ts prebuild` (it builds the untracked SDK `dist/`) before the full web suite. Six web files failed in IMP-05 for that reason alone and passed after it (IMP-05b).
- The packaged build from a clone whose `origin` is a local path needs `AUTOBYTEUS_UPDATER_REPOSITORY=AutoByteus/autobyteus-workspace`. If the clone was installed with a custom store, every later pnpm call needs `npm_config_store_dir` set to that store, otherwise `prepare-server.sh` aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.
- Gateway pnpm is pinned by `packageManager: pnpm@10.28.2` (SD-07: an unpinned Corepack pnpm 12 rejected a package published that day).

## Checks Run

Evidence files are in `evidence/` unless another path is given. The probes are in `probes/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node probes/sheetjs-attr-escape.cjs <xlsx dir>` on base 0.18.5 and the installed 0.20.3 | base / `195db3c42e` working tree | macOS 26.5.2, Node 22.23.1, pnpm 10.28.2 | parser escaping | BEH-007, REQ-011 | Pass (base reproduced; branch fixed) | `IMP-01-attr-escape-reproduction.txt` | `0.18.5 … INJECTED_ATTRIBUTE` then `0.20.3 … ESCAPED` |
| IMP-02 | `pnpm -C autobyteus-web test:nuxt components/fileExplorer/viewers/__tests__/ExcelViewer.spec.ts --run --reporter=verbose` | `195db3c42e` | same | `ExcelViewer.vue` + real SheetJS (jsdom) | AC-012, AC-013 | Pass | `IMP-02-web-excel-viewer-spec.log` | `Tests  10 passed (10)` |
| IMP-03 | IMP-02 with the sanitize call temporarily replaced by `return tableHtml;` (restored) | `195db3c42e` + temp edit | same | the spec's security cases depend on the sanitiser | AC-013 | Pass (expected failures) | `IMP-03-web-viewer-spec-mutation-no-sanitiser.log` | `Tests  2 failed \| 8 passed (10)` |
| IMP-04 | Temporary spec: DOMPurify on SheetJS link HTML under happy-dom vs jsdom | `195db3c42e` | same | test DOM environments | FU-006 | Pass (diagnosis) | `IMP-04-happy-dom-dompurify-traversal.log` | happy-dom `OUT` keeps `<a href="javascript:…">`; jsdom `OUT <table><tbody><tr><td>site</td><td>evil</td></tr></tbody></table>` |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt --run` (full) | `195db3c42e` | same | whole web suite | regression | Pass after setup (6 files failed only on missing SDK `dist/`) | `IMP-05-web-test-nuxt-full.log`, `IMP-05b-web-failed-files-rerun-after-setup.log` | `Tests  3 failed \| 4879 passed`; after `prebuild`: `Tests  16 passed (16)` |
| IMP-06 | `probes/mcp-cors-headers.probe.test.ts` (real MCP route registrations, studio cors options) on base server sources | `195db3c42e` (server = base, fastify 4.29.1) | same | MCP gateway + agent-tools routes | BEH-004, AC-003 | Pass (baseline) | `IMP-06-mcp-cors-headers-probe-base.log` | `PROBE fastify 4.29.1`; 12 `PROBE` lines |
| IMP-07 | `pnpm -C autobyteus-server-ts typecheck` | `bbd88fd3ea` | same | server `src` | AC-002 | Pass | `IMP-07-server-typecheck.log` | `tsc exit: 0` |
| IMP-08 | IMP-06 probe on the branch + diff vs IMP-06 | `bbd88fd3ea` | same | same as IMP-06 | BEH-004, AC-003 | Pass | `IMP-08-mcp-cors-headers-probe-branch.log` | `PROBE fastify 5.12.7`; `NO DIFFERENCE in status codes or Access-Control-* / Vary headers` |
| IMP-09 | `pnpm -C autobyteus-server-ts test:unit` | `bbd88fd3ea` | same | server unit + app-data-migrations | AC-002 | Pass | `IMP-09-server-test-unit.log` | `Test Files  815 passed \| 4 skipped (819)`, `Tests  6770 passed` (the JSON line is a startup-gate test's expected log) |
| IMP-10 | Gateway: frozen install, typecheck, test, `pnpm audit`, `--audit-level high`; root frozen install; root lockfile diff | `5c7ab7426c` | same | gateway package; root workspace isolation | BEH-006, AC-009 | Pass | `IMP-10-gateway-install-typecheck-test-audit.log` | `Tests  268 passed (268)`; `No known vulnerabilities found`; `audit exit: 0`; empty root diff |
| IMP-11 | `test:integration:prepare` + `pnpm -C autobyteus-server-ts test:integration` | `5c7ab7426c` | same | server integration (incl. MCP route suites) | AC-002, AC-003 | Pass after IMP-13's test fix (1 failure, cause found) | `IMP-11-server-test-integration.log` | `Tests  1 failed \| 420 passed \| 69 skipped`: `studio-agent-tools-listener` |
| IMP-12 | `pnpm audit --json` on base lockfile (scratch dir) and branch; `probes/audit-diff.mjs` | `5c7ab7426c` | same | root lockfile | AC-001, AC-011, QR-001 | Pass | `IMP-12-root-audit-base-vs-branch.log` | 13 targeted advisories under `REMOVED`; `ADDED` empty; no fastify/@fastify/mercurius/xlsx/undici@5 line |
| IMP-13 | `probes/listen-probe.mjs` on fastify 4.29.1 and 5.12.7; rerun of the fixed listener test | `29aeb5d721` | same | `listen()` return; listener test | AC-002 | Pass | `IMP-13-wildcard-listen-return-and-listener-test.log` | `4.29.1 listen() -> http://0.0.0.0:…` vs `5.12.7 listen() -> http://127.0.0.1:…`; `Tests  1 passed (1)` |
| IMP-14 | `node probes/excel-viewer-rendered-check.mjs <web> probes/excel-viewer-rendered-check.page.vue <out>` (temporary Nuxt page, headless Chrome) | `29aeb5d721` (viewer = `195db3c42e`) | Chrome (macOS), Nuxt dev | rendered `ExcelViewer` | AC-012, AC-013, REQ-010 | Pass | `IMP-14-viewer-rendered/` (`IMP-14-result.json`, `IMP-14-all-cases.png`, `IMP-14-case-*.png`) | `"verdict": "PASS"`; `"pwned": null`; `"urlUnchanged": true`; `merged` attrs `["colspan"]` |
| IMP-15 | `pnpm -C autobyteus-server-ts build` | `29aeb5d721` | same | server build | AC-002 | Pass | `IMP-15-server-build.log` | `build exit: 0` |
| IMP-16 | Clean clone of the branch; `pnpm install --frozen-lockfile --store-dir <empty>` | `29aeb5d721` | same | lockfiles; cold CDN fetch | REQ-009, REQ-013, AC-011 | Pass | `IMP-16-clean-clone-frozen-install-cold-store.log` | `install exit: 0`; `0.20.3`; `integrity: sha512-oLDq3jw7…` |
| IMP-17 | Clean clone: `pnpm --silent isolated-app start --build`; `probes/instance-server-smoke.mjs`; renderer bundle check; stop | `29aeb5d721` | packaged macOS arm64 app (Electron) | packaged server + renderer | AC-007, AC-014 (partial), BEH-003 | Pass (limits below) | `IMP-17-packaged-app-clean-clone.log` | `fastify@5.12.7`, `mercurius@16.12.1`; `SMOKE PASS`; `GET /graphiql: 404`; `"firstMessage": "connection_ack"`; `sanitize(o,{ALLOWED_TAGS:[…],…ALLOW_DATA_ATTR:!1})`; `"instances": []` |
| IMP-18 | Clean clone: `docker build -f autobyteus-message-gateway/docker/Dockerfile .`; run on 127.0.0.1; `/health`; `docker rm -f -v` | `29aeb5d721` | Docker 29.0.1 | gateway image | AC-010, REQ-008 | Pass | `IMP-18-gateway-docker-clean-clone.log` | `pnpm install --frozen-lockfile` step; `health status code: 200`; `/app/autobyteus-message-gateway`; `fastify@5.12.7 @fastify/cors@11.3.1 @whiskeysockets/baileys@6.7.24` |
| IMP-19 | Clean clone: `docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo .`; test-owned container on 127.0.0.1, no volumes; smoke; `docker rm -f -v` | `29aeb5d721` | Docker 29.0.1 | server image (Node 22) | AC-008 (smoke), REQ-003 | Pass | `IMP-19-server-docker-clean-clone.log` | `RUN pnpm -C autobyteus-web build:mobile-web` step present (bundles `xlsx` after a cold in-container install); `v22.23.3`; `fastify@5.12.7 mercurius@16.12.1 …`; `SMOKE PASS`; `graphiql 404` from inside |

- Not run, and why:
  - Server E2E folder (`pnpm test:e2e`). The design's change sequence lists it, but E2E execution belongs to API/E2E under my skill, which wins in a conflict. FU-004 records 4 base-identical failures to expect.
  - AC-003 base-vs-branch comparison through the full studio server over HTTP. IMP-06/IMP-08 use the real route registrations with `app.inject` instead.
  - AC-006 live upload limits; AC-007 run streaming in the packaged app; AC-014 opening `.xlsx`/`.xls` through the desktop UI. The Files panel shows a workspace's files only once an agent run is active in it, and starting a run needs a runtime. A fixture workspace was registered (IMP-17) for API/E2E to reuse the approach, e.g. with the scripted AGY CLI.
  - Termux runtime.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the spreadsheet viewer (`ExcelViewer` inside `FileViewer`) on every surface that opens `.xlsx/.xls/.xlsm/.csv`
- Approved UI/UX, interaction, requirement, or design references: REQ-010 (same rendering), REQ-011, DEC-008; no UI supplement
- Existing design system, shared components, and adjacent product surfaces reviewed: the viewer's own scoped styles (unchanged); Tailwind preflight for links (DEC-008 evidence)
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser-probe pattern. A temporary page (`probes/excel-viewer-rendered-check.page.vue`) was mounted in Nuxt dev and driven in headless Chrome by `probes/excel-viewer-rendered-check.mjs`; the page was removed afterwards (`pageRemoved: true`).
- States, layouts, viewports, and interactions inspected:
  - Cases: xlsx with two tabs, xls, xlsm, CSV via URL, CSV content, merged cells (colspan), injection cells, hyperlink cells and fetch error with Retry.
  - Interactions: tab switching, hovering the injection cell, clicking both link cells (no navigation, `window.__pwned` unset) and Retry.
  - Viewport: 1400×1500.
- Visual or interaction issues found and corrected: none. The table looks as before: first-column styling, zebra rows, borders and a spanning header cell. Link cells look like the other cells and keep the default cursor.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-14 (screenshots + JSON), IMP-17 (packaged renderer bundle carries the sanitiser call). The desktop UI journey to open a file was not exercised (see Not run). Dark mode was not inspected, because the viewer has no dark styles and was not changed visually.

## Downstream Coverage Hints / Suggested Scenarios

- AC-003 over real HTTP against the running studio server, on base and branch: preflights, loopback origin, foreign origin and no origin, for `/mcp/gateway` (cors plugin present) and the agent-tools listener (`probes/mcp-cors-headers.probe.test.ts` lists the cases and base output in IMP-06).
- AC-004: remote-access classification from a non-loopback address, including `GET /graphiql` (now default class, then 404) and `GET /graphql` (`LOCAL_DEV_ONLY`).
- AC-006: multipart upload just under and over `CONTEXT_FILE_MAX_BYTES`.
- AC-014: open `generated-sample.xlsx`/`.xls` (`probes/make-fixtures.cjs`, which includes a `javascript:` hyperlink and a markup cell) in the packaged app through an active run's Files panel.
- The standalone application host with `--host 0.0.0.0`: confirm the printed URL works (Known Risks).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Server E2E folder with a base comparison for any failure (FU-004 lists the known base failures).
- Packaged-app journeys for AC-007 and AC-014; full server-container check for AC-008 (`/rest/health`, GraphQL, WebSocket) beyond the IMP-19 smoke.
- AC-003/AC-004/AC-005/AC-006 probes as above.
