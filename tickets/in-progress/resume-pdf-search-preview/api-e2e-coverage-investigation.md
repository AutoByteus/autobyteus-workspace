# API/E2E Coverage Investigation — resume-pdf-search-preview

## Investigation Meta
Round 1; 2026-10-12; trigger Code Reviewer CRR-002 source Pass (7cd2a2db5).
Canonical worktree: /home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview.
Canonical upstream package at tickets/in-progress/resume-pdf-search-preview: requirements-doc.md (Approved R1/SR-001), investigation-notes.md, design-spec.md, solution-revision-record.md (SR-001–004), solution-handoff.md, design-review-report.md and architecture-review-revision-record.md (ARCH-REV-003 current Pass), implementation-handoff.md and implementation-revision-record.md (IR-001/002), code-review-report.md and code-review-revision-record.md (CRR-002 current Pass; CR-F-001 resolved).
Read cumulative package; authoring snapshots with prior Fail are not current review authority. Evidence supplements: runtime-failure-excerpts.log, installed-module-checksums.txt, baseline-isolated-reproduction.log; implementation and code-review evidence listed in upstream manifest retained. Delivery revision and prior API revision: N/A — not performed. Current API revision API-REV-001 completed baseline Pass AC-001–003; AC-004 deferred Delivery. Ledger: api-e2e-test-case-ledger.md.
Source correction 7f321575058d744c8e635b3aff0a6d1f4557e2c4; initial search bc820093753dee510294b42879043daec243d4e8; base 2756d7b298ca5b203ebd2310d172b37a5d381b5c.

## Routing Classification
Small / High, Reviewed; successful route Code Review; proportional durable-test review Required if tests changed.
No requirement/design gap identified. No compatibility/dual-format coverage; Not Affected persisted-data decision confirmed from design and implementation cleanup/transition checks.

## Current Requirement And Design Basis / Supported Scenarios
SCN-001: Files search resume → click valid nested unexpanded multipage PDF → real bytes and rendered pages (REQ-001/004, AC-001).
SCN-002: tree/search identity, lazy node and representative text read (REQ-004, AC-003).
SCN-003: real path-owner absolute in-root/outside, traversal, sibling denials without outside bytes (REQ-002, AC-002).
SCN-004: safe rollout and user verification (REQ-003, AC-004) explicitly Delivery-owned, NOT validation-stage pass.
No unsupported/contrived scenarios or new scenarios introduced.
Change: public explorer converts ordered absolute internal candidates to relative locators once using path.relative/getPath. Three dead explorer methods removed; tree serializer retained.
Preserve ranking, abort/refresh, snapshot-only watcher and visibility leases, protected readers and user data.

## Changed Surface And Boundary Classification
| Surface | Effect / proof needed |
| --- | --- |
| Backend domain | Changed public result identity; focused unit/integration proof |
| GraphQL/REST contract | Changed search identity traverses real transport/content path |
| Frontend state/browser/web-equivalent renderer | Unchanged code, changed input; lazy selection, tree reuse and actual PDF renderer need proof |
| Permissions | Lexical workspace guard preserved; real owner denial evidence required |
| Process/lifecycle | Snapshot/abort/watchers preserved; existing E2E assertions valid |
| Desktop shell | No shell delta; not claimed by browser proof |
| Persistence/worker/external model | Not affected; no migrations/provider calls |
| Deployment | Delivery-owned, excluded from validation confidence denominator but blocking final delivery |

## Project Execution Discovery
Read root TESTING.md, DESIGN.md and AGENTS.md; server/web AGENTS.md. No closer TESTING file found. Package manifests, server vitest.config.ts and tests/setup/{test-environment-isolation,prisma-env,prisma-global-setup,prisma-test-config}.ts read. Root README Local full-stack development, browser probe examples and server routes inspected.
Node22.23.3; root pnpm10.28.2 supplied by OWN temporary Corepack shim. Dependencies/current shared build prerequisites retained by implementation. Never stage SDK/devkit/Brief Studio dist.
TESTING.md: narrow valid check first; server build needed for dist/app.js probes; install/prebuild and Nuxt prepare prerequisites; browser probes own backend/data/ports/Chrome, fail on browser errors and capture cleanup.
E2E inherits shell: env -i, temporary HOME/TMPDIR/AUTOBYTEUS_DATA_DIR, no provider keys/live roots.
Vitest Prisma setup resets worktree tests/.tmp/autobyteus-server-test.db; verify absent before creating/removing. No live8001/PID61 requests or /app/config/registry/original mutation.
Ownership conflict SR-004 implementation E2E request resolved by skill: execute updated path-boundary E2E FIRST here; not waived.
Root pnpm dev default8000 conflicts with live server; use documented probe-owned current dist backend + Nuxt own free ports, not manual default stack.
Synthetic deterministic valid two-page PDF, text and outside sentinel only; public GraphQL workspace registration; real readers, no mocked getAbsolutePath.
Fixture/setup details and precise commands to be completed after runtime discovery before broader execution.

## Existing Durable Coverage Inventory
| Path / group | Validity | Action |
| --- | --- | --- |
| server tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts | Still Valid: null/tree diagnostics, ignored-folder denial, sibling write/read/rename, watcher/lease | Required first execution unchanged |
| server tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts | Needs Update: suffix-only search cannot distinguish absolute/relative | Tighten exact relative assertion |
| server tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts | Still Valid: actual FileSystemWorkspace; inject not socket; image bytes not PDF | Retain; add joined real HTTP search/PDF/text/denials |
| server tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts and file-explorer-websocket-lifecycle.e2e.test.ts | Still Valid: adjacent lifecycle regression | Run affected E2E folder |
| server tests/unit/file-explorer and integration file-search/explorer/name-indexer, workspace-path-utils | Still Valid under R1 and source Pass | Rerun focused checks; retain internal absolute strategy assertions, ordering/abort |
| web stores/composables/fileExplorer __tests__ | Still Valid pending inspection | Select tree reuse/lazy/content identity suites |
| web tests/e2e existing unrelated probes | Out Of Scope as tests; reusable stack pattern | Add narrow real Files/PDF browser probe, package script, synthetic fixture |
No durable tests removed or disabled.

## Durable Coverage To Add / Update
API-002: joined real GraphQL searchFiles → protected HTTP content200/application/pdf/exact multipage bytes, text read and four denial kinds; server tests/e2e/file-explorer.
API-003: actual FileExplorer/FileViewer/PdfViewer via Nuxt/current backend, search/click unexpanded PDF, completed2 canvases/no alert/page errors; loaded-tree node reuse and text identity; web tests/e2e and script.
Update existing GraphQL suffix expectation to exact relative. No production modifications authorized.

## Repository Coverage Execution Plan And Results
1. CLEAN current path-boundary E2E (API-001) first.
2. Focused backend current source suites and new HTTP E2E; existing file-explorer E2E folder (API-002 / API-004).
3. Relevant web unit/store/component tests (API-005), prebuild/current server build/Nuxt prepare for browser.
Completed Pass after API-owned harness fixes. Canonical execution report has exact commands/results; chronological evidence below preserves attempts.

## Test-Case Ledger Decision
Required: multiple independent cases and long browser stack/build continuity. Initialized before execution.

## Post-Repository Confidence Scorecard
Completed post-repository83.57% below; final95% after Required broader validation. Upstream source evidence was not API-stage pass.
Every critical AC proven: No; browser/render and HTTP boundary missing.

## Broader Validation Decision
Required — Browser + real HTTP on owned current-worktree stack. Missing critical AC-001 cannot be closed by strings, pdfinfo or installed baseline. Expected final scope confidence >=95% only if all critical validation-owned criteria directly proven.
Web-equivalent surface sufficient for unchanged shared browser/client-server path; no desktop-shell claim. Actual8001 user outcome remains Delivery-owned.
No temporary probe-only substitution planned for durable regression.

## Not Tested / Deferred
AC-004 host Docker/runtime pin/rollout/rollback/timing approval/explicit user re-search/open, integrity/final cleanup: Delivery. No public release requested.
Windows/native symlink/TOCTOU policy expansion and unrelated generated JS sweep: outside approved change.
## Investigation Decision
Proceed Yes; add/update durable coverage Yes; reroute before execution No. Preserve upstream dirty solution history receipt untouched/unstaged.

## Execution discovery update
API-001 original file1/2Pass, evidence/api-path-boundary.log. AUTOBYTEUS_DATA_DIR env is not read by AppConfig; correct isolation requires AppConfigProvider.initialize({appDataDir}) before test module imports, or dist/app.js --data-dir. Initial ignored worktree registry has only owned temp paths; no user registry/live data read. Temporary Vitest config adds early setup pointing at TEST_API_DATA_DIR; retain standard Prisma setups. Re-run API-001 with proper own root. Durable path-boundary update will explicitly compare loaded tree before/after denied projection (null nonmutation already covered).

API-002 initial6 assertions passed but suite Fail in new afterAll: public removeRegisteredWorkspace requires process AgentRunManager not initialized by this focused transport harness. API-owned Local Fix: close only owned workspace and delete test cache entry, then remove entire own registry/data fixture in finally. Not a search/path production defect. Failure retained in evidence/api-search-content-http.log. Browser probe will use full dist runtime (supervisor initialized).

API-005 initial runner could not collect tests: absent Nuxt generated tsconfig; execute documented pnpm -C autobyteus-web exec nuxt prepare then rerun. Initial api-web-focused.log retained, no false test count/pass.

## Broad backend discovery / baseline fixture cleanup
API-004 initial20files pass, two failed: new HTTP test cannot switch precreated AppConfig to an absent data directory (API-owned setup bug; mkdir corrected); unchanged workspace-content-rest E2E fails all5 afterEach hooks at removeRegisteredWorkspace because focused Fastify has no process AgentRunManager. Neither is a content/identity failure. Base diff for that test, WorkspaceRemovalGuard and AgentRunManager is empty; guard requires process instance independently of search conversion.
Existing REST coverage decision revised to Needs Update for teardown only. Retain all5 assertions/routes/real path owner; close/remove owned test cache and actual owned registry entry instead of exercising unrelated product workspace-removal use case. Own-root removal remains finally. TESTING.md Rule9: bounded baseline test fix committed separately; no reader/production edit or waived error.

## Post-repository completed evidence
API-001 original and properly isolated current file1/2Pass. Updated loaded-tree denial nonmutation also passes in full run.
API-002 standalone6HTTP assertions and corrected cleanup Pass; full backend22files/108tests/no skips Pass, evidence/api-backend-regression-final.log. Includes87unit/integration+21E2E, ordering/abort/snapshot-only/watchers/visibility leases and all protected paths; all initial failures resolved without production changes.
API-005 web9files/58tests/no skips Pass, evidence/api-web-focused-rerun.log;2new store cases loaded-tree reuse/lazy relative order and ordinary superseding-query abort. Requested composable filename absent; no test claimed for that selector.
No changed TS production or tracked JS executed. Baseline REST cleanup retains original5 route assertions; broad runner setup error and first baseline edit transform failure retained in initial logs.

| Confidence category | Post-repository | Evidence / residual gap |
| --- | --- | --- |
| Requirement/AC proof | 75% | AC-002 direct HTTP/AC-003 API+unit; AC-001 PDF transport only, no canvases |
| Changed-boundary directness | 95% | Real owner search GraphQL/socket REST fixture bytes and denials |
| Integration realism/mock gap | 90% | Real HTTP schema/path owner; no current dist/browser yet |
| Environment/config/identity/fixture | 90% | Clean own roots, real valid878byte2page PDF; current app/renderer bootstrap pending |
| Failure/edge/lifecycle/recovery | 95% | Denials and108passing backend checks incl watcher/leases, order/abort; setup failures resolved |
| User-surface/browser/shell | 50% | Actual Files click/PDF renderer missing; no shell delta |
| Durable coverage relevance | 90% | New joined HTTP/store guards green; browser probe authored but unexecuted |
Overall83.57% simple mean. Below95 target; user-surface below90, critical AC-001 not proven. No Pass permitted yet.

## Broader Validation Plan — finalized before execution
Required Browser + full current dist backend. Script autobyteus-web/tests/e2e/search-pdf-preview-probe.mjs, discovered via package test:e2e:search-pdf-preview.
Own fresh output evidence/api-browser-run01; shared canonical ledger. Backend prebuild/build serial, frontend Nuxt prepare already Pass. Spawn node dist/app.js --host127.0.0.1 --port<free> --data-dir<temporary>/data; clean HOME/TMPDIR/PATH, own .env APP_ENV=development/DB_TYPE=sqlite/DATABASE_URL=file:<own>/db/probe.db/AUTOBYTEUS_SERVER_HOST=<own>. Full runtime owns migrations and supervisor. Readiness /rest/health.
Public createWorkspace registers smallest synthetic nested PDF and root text; no providers/secrets/user document copies.
Nuxt dev --host127.0.0.1 --port<different free> BACKEND_NODE_BASE_URL=<own> proxies real backend. Temporary host route mounts unchanged FileExplorerLayout via explicit workspace prop after public fetchAllWorkspaces; no store writes/transport fixtures/viewer swaps. Real GraphQL/REST/WebSocket APIs.
Headless /usr/bin/chromium,1440x1000/en-US/UTC; warm cold Vite before assertion; capture all browser page/console errors without waiver.
API-002 repeat full-runtime search→200/MIME/exact PDF bytes, text +4denials. API-003 actual Files search resume→lazy PDF click→2nonempty ink-bearing canvases/spinner absent/no alerts/errors; assert workspace/relative identity, loaded text result references actual tree node, search vs tree text and nested PDF equivalent.
Screenshot pdf-rendered.png plus structured states, request/response and process/build hashes; browser screenshot supports assertions, not substitute.
Stop owned process groups/browser, remove host page + full own root, assert both ports closed. No live8001/PID61 request, /app edit or actual-user-verification claim.

## Browser iteration evidence / API-owned harness correction
run01 full-runtime API-002 Pass; API-003 executed real PDF/text/tree steps and screenshots but final strict browser-error assertion Fail due cold Vite504 Outdated Optimize Dep/dynamic-module errors during PRE-case warmup. This is the documented TESTING.md cold optimizer setup effect, not supported evidence of a PDF/reader defect. Do not waive case errors: retain warmup errors separately and start a fresh page/context AFTER optimizer warmup; actual case still rejects every page/console error.
run01 cleanup also failed ENOTEMPTY during own node-compile-cache removal: pnpm process exit precedes descendant/cache shutdown. Correct stop to signal owned process group and verify zero live(non-zombie) members before removing own root; bounded fs.rm retry; retain cleanup evidence even on error.
Prior run files/screenshots/error output are preserved; failed journey not declared Pass. Manual final run01 cleanup receipt recorded separately after confirming both known groups/ports gone.

run02 both API-002/API-003 Pass, clean actual and warmup errors, full cleanup receipt. Two canvases real ink and identity verified. Inspected screenshot1; optional second screenshot was page-bottom (not additional semantic proof), changed only capture to second-canvas top and repeat same probe fresh output api-browser-run03. No assertion/reader/viewer relaxation.

## Latest Investigation Decision
Round1/API-REV-001 complete; all5validation-owned cases Pass,108backend+58webtests/no skips, final real full-runtime browser/API2casesPass. Final95% simple7category mean; AC-001–003 directly proven, Required broader validation completed/no unresolved validation-owned material risk. Canonical report owns latest result, not prior failed iteration logs.
9durable paths added/updated, none removed/disabled; production unchanged. Small/High; successful test-code review Required at Code Reviewer before Delivery. Own resources removed, original checksum unchanged. AC-004 remains Delivery-owned/not tested; no deployed/user-verification/full-ticket success claim. Scope/legacy/persistence unchanged.
