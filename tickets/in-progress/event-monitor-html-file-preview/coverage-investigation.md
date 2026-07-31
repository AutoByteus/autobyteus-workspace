# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/design-spec.md`
- Supplemental Task Artifacts: `None`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview/tickets/in-progress/event-monitor-html-file-preview/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `code_reviewer` implementation-source review `CRR-001` passed for commit `0d35457b2`.
- Prior Investigation Reviewed: Upstream investigation and implementation handoff reviewed; no prior API/E2E coverage investigation or result exists.
- Latest Authoritative Investigation: This artifact after repository execution and broader browser validation; paired with `execution-coverage-report.md` and `API-REV-001`.

## Current Requirement And Design Basis

The approved behavior fixes only the HTML viewer resource-selection boundary. A trusted Electron Event Monitor action with a valid absolute `.html` path loads text through `window.electronAPI.readLocalTextFile`, stores the content with `relativeResourceContext: null`, and must render that content through the existing Blob iframe path. It must not construct `/rest/workspaces/<id>/static/<absolute-path>` or issue a server request containing the absolute path. A workspace-relative HTML file remains served through the static route only with explicit `{ kind: 'workspace', workspaceId }` context and the bound REST endpoint. Markdown Event Monitor preview, read-only access intent, FileViewer type gating, trusted local loading, sandboxing, Blob cleanup, mobile raw behavior, and server containment remain unchanged (`RQ-001`–`RQ-004`, `AC-001`–`AC-005`, `BEH-001`–`BEH-004`).

The implementation handoff and `CRR-001` confirm no persistence change (`Directly Usable — No Migration`), no compatibility wrapper, and no server source change. The critical validation gap is runtime/directness: the repository already has focused viewer and forwarding tests, but the actual Event Monitor/local loader seam, browser-rendered Blob behavior, and static-route containment need executable evidence.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / Markdown Event Monitor preview | Preserved | Requirements `RQ-001`, `AC-001`; implementation handoff; existing Markdown and action-policy tests | Rerun existing Markdown, absolute-file-action, and relevant Event Monitor preservation checks; no production change requires a new Markdown test. |
| `BEH-002` / trusted local absolute HTML | Changed | Requirements `RQ-002`/`AC-002`/`AC-003`; `HtmlPreviewer.vue`; `HtmlPreviewer.spec.ts` | Keep durable Blob/no-static assertions; execute a real browser-rendered temporary probe for iframe source and observable HTML. |
| `BEH-003` / workspace HTML static identity | Changed/preserved | Requirements `RQ-003`/`AC-004`; explicit context contract in `FileViewer.vue` and `HtmlPreviewer.vue` | Keep durable explicit-workspace URL test; execute browser/static route scenario against a local workspace if setup permits. |
| `BEH-004` / authorization, sandbox, cleanup, supported types | Preserved | Requirements `RQ-004`/`AC-005`; server routes and `FileSystemWorkspace`; implementation handoff | Rerun server REST unit/E2E boundary checks, add the missing static-route absolute-path assertion, and retain iframe sandbox/cleanup coverage. |
| Persisted-data transition | Preserved / not affected | Design and implementation handoff: `Directly Usable — No Migration` | No migration or restart fixture is applicable; verify no persisted shape/source changed. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No backend production code changed. | Existing workspace path utility and REST route tests. | The route's real static absolute-path rejection is not currently asserted in the checked-in E2E file. | API/REST Fastify injection with real `FileSystemWorkspace`. |
| API / transport / contract | Yes (preserved contract) | HTML static route remains workspace-relative; local HTML must not call it. | `workspaces.test.ts`; `workspace-content-rest.e2e.test.ts`; route source. | Existing tests cover relative static serving and absolute content rejection, but not absolute static rejection. | Real Fastify route injection; temporary browser request observation. |
| Frontend component / state | Yes | `HtmlPreviewer` selects static URL only from explicit context and otherwise Blob content. | `HtmlPreviewer.spec.ts`, `FileViewer.spec.ts`, implementation review. | Unit mount mocks browser lifecycle and does not prove a browser loads the Blob document or no request escapes. | Browser probe. |
| Browser integration / user journey | Yes | Event Monitor -> local loader -> read-only FileViewer -> HTML iframe. | Action-policy and Event Monitor wiring tests; implementation handoff. | No durable test currently drives the clicked HTML action through the real UI and local bridge. | Temporary browser harness or project-supported browser probe; no durable page fixture needed for this narrow source-selection fix. |
| Authentication / session / permissions | No material change | No auth/session code changed; server containment is path-based. | Existing route tests. | A live app session would add setup but not change the core proof. | Not selected unless the development stack is needed for browser setup. |
| Desktop renderer / web-equivalent UI | Yes | The Vue renderer must present a Blob-backed iframe for local content. | Happy-DOM component tests. | Happy-DOM does not provide full iframe navigation/content rendering. | Browser validation using local Nuxt page. |
| Desktop shell / Electron-specific integration | Yes (input boundary) | Trusted Electron bridge supplies local text and sets null resource context; production shell source is unchanged. | `localFileCapability`/Electron source and handoff; no direct local-file HTML E2E. | Actual Electron IPC/file validation and shell lifecycle are not directly exercised. | Do not launch packaged desktop; use the browser-equivalent renderer plus existing source/test coverage, record shell residual risk. |
| Process / lifecycle | No | Only Blob URL cleanup lifecycle exists in the renderer component. | Durable Blob revoke tests. | Real browser navigation/revoke observation is not currently durable. | Browser probe with content change/unmount if practical. |
| Persisted-data transition | No | In-memory source selection only. | Design/implementation transition checks. | None material. | None. |
| Worker / queue / distributed coordination | No | No worker or distributed code touched. | N/A. | None. | None. |
| External integration | No | No external service or provider is involved. | N/A. | None. | None. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-html-file-preview`
- Project type and runtime stack: Git monorepo; Nuxt 3/Vue frontend with Vitest Nuxt environment; TypeScript Fastify backend with Vitest; Electron desktop wrapper; Playwright Core browser probes are already used by `autobyteus-web/tests/e2e`.
- Conflicting, missing, or unclear project instructions: The fresh task worktree contains no installed dependencies or generated `.nuxt`; the implementation handoff documents temporary dependency symlinks used previously. No instruction conflict found. Broad web typecheck has known unrelated baseline diagnostics.
- Required environment variables or secrets available: `N/A` for focused tests and Fastify route injection; no provider credentials or authenticated account is required. A full `pnpm dev` stack may materialize its own ignored development runtime if browser setup requires it.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Frontend test and development guidance | Use colocated tests; `pnpm test:nuxt` with `--run`; Electron tests via `pnpm test:electron`. |
| `autobyteus-server-ts/AGENTS.md` | Backend test guidance | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `autobyteus-web/vitest.config.mts` | Nuxt test environment | Nuxt + happy-dom, setup files, `~` alias. |
| `autobyteus-server-ts/vitest.config.ts` | Backend test environment | Fork pool, Prisma test setup/global setup, `tests/**/*.test.ts`. |
| Root `package.json` | Supported stack commands | `pnpm dev`, `pnpm test:e2e`; `pnpm test:e2e:real` is capability-gated. |
| `autobyteus-server-ts/README.md` | Real local stack lifecycle | `pnpm dev` starts backend `127.0.0.1:8000` and frontend `127.0.0.1:3000`, owns ignored `.autobyteus/development`; stop owned process and remove only owned data if created. |
| `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Browser probe precedent | Uses `playwright-core`, detects Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, installs/removes a temporary page, captures JSON evidence, and cleans owned processes/files. |
| `autobyteus-web/docs/electron_packaging.md` | Electron/local file boundary | Trusted bridge owns local text; renderer does not read filesystem; local HTML is a content/Blob path and Electron shell-specific behavior must not be claimed from browser evidence. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Frontend focused Vitest | `autobyteus-web` | `pnpm test:nuxt --run <paths>` | Uses temporary read-only symlink to an existing compatible dependency tree and generated `.nuxt` if needed. | Vitest exits 0 and reports test counts. | Remove only symlinks created by this run. |
| Backend REST unit/E2E | `autobyteus-server-ts` | `pnpm exec vitest run <paths> --no-watch` | Test-owned temp workspaces under OS temp; existing backend test DB setup. | Vitest exits 0; Fastify injection is in-process. | Tests remove temp directories/workspace registrations; remove symlink after run. |
| Browser renderer probe | `autobyteus-web` | Temporary fixture page + `node` Playwright probe, or a small one-off script | Use a free local port, Chrome executable, no auth if page directly mounts the reviewed viewer; no packaged Electron process. | HTTP page ready; semantic DOM and iframe `src`/body assertions. | Kill owned Nuxt child; remove temporary page/output. |
| Full development stack (conditional) | repo root | `pnpm dev` | Only if needed for live Event Monitor route; creates ignored `.autobyteus/development` owned by this run. | `/rest/health` and frontend HTTP ready. | Signal only owned launcher; remove only owned data if created and no pre-existing state. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Local HTML content | Inline deterministic HTML in component/browser fixture; no user files | Does not access home or production data. | Temporary fixture/page removed. |
| Workspace static HTML | OS temp workspace registered in existing REST E2E test or route injection | Workspace root and sibling are unique per test. | Existing test cleanup; no retained data. |
| Trusted local bridge | Existing unit mocks for component; browser harness simulates already-loaded content rather than granting filesystem access | Do not fabricate Electron shell proof. | No persistent identity/state. |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` Persistence / Migration and `implementation-handoff.md` Persisted Data Transition Check.
- Representative existing-data setup and required behavior: `N/A`; no persisted data is read or transformed.
- Evidence planned for the approved direct-use, discard/rebuild, or migration outcome: Confirm source diff is renderer-only and no persisted shape changes; no migration test.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: `None`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts` | Explicit workspace context selects bound static URL; null context selects Blob; sandbox and Blob revocation remain. | `RQ-002`–`RQ-004`, `AC-002`–`AC-004`, `SP-PRIMARY`, `SP-RESOURCE` | Still Valid | Added in `IR-001`, passed in implementation review package. | Rerun; no update expected. |
| `autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts` | Text preview selects HtmlPreviewer and forwards explicit context. | `RQ-003`, `AC-004`; `SP-RESOURCE` | Still Valid | Added in `IR-001`, passed. | Rerun; no update expected. |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts` | Markdown renders loaded content; workspace asset context remains explicit. | `RQ-001`, `AC-001`, `RQ-004` | Still Valid | Existing focused suite passed in `IR-001`. | Rerun. |
| `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | Event Monitor supported-file classification and invalid/unsupported path inertness. | `AC-001`, `AC-002`, `AC-005` | Still Valid | Existing source path policy unchanged and handoff lists it as preservation coverage. | Rerun. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Event Monitor file action rendering/activation policy. | `AC-001`, `AC-002`, `AC-005` | Still Valid | Existing preservation suite passed in `IR-001`. | Rerun. |
| `autobyteus-web/components/workspace/agent/__tests__/AgentEventMonitor.spec.ts` | Event Monitor forwards feed props and enables file actions; no click/load assertion. | `AC-001`, launcher precondition | Out Of Scope | No changed source and no file action mount in this suite. | No change. |
| `autobyteus-web/components/mobile/__tests__/MobileFileViewer.spec.ts` | Mobile HTML remains raw read-only rather than static iframe preview. | `RQ-004`, `AC-005`, handoff `SC-HTML-007` | Still Valid | Existing mobile contract is unchanged. | Rerun as preservation check. |
| `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts` | REST content/static serving and content traversal error mapping. | `RQ-003`, `RQ-004`, `AC-004`, `AC-005` | Needs Update | Static relative pass exists; traversal error only covers content route, not absolute static path. | Add focused static-route absolute rejection unit assertion if E2E does not cover it. |
| `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` | Real `FileSystemWorkspace` serves content and rejects sibling/absolute content paths. | `AC-005`, server containment contract | Needs Update | Existing absolute candidate test is on `/content`; the failing historical path was `/static`. | Add deterministic real static absolute-path rejection scenario `SC-HTML-006`. |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts` | GraphQL path containment for folder/read/write/rename. | `RQ-004`, server boundary | Out Of Scope | GraphQL file explorer boundary, not HTML REST static route. | No change. |
| `autobyteus-web/electron/...` local file tests | Shell/local protocol and server lifecycle coverage. | `RQ-002`, trusted bridge boundary | Out Of Scope for source diff | No direct HTML text Event Monitor Electron E2E was found; shell source unchanged. | Rely on browser renderer + existing shell tests; record residual shell uncertainty. |

## Stale Or Obsolete Coverage Decisions

No existing coverage is stale or scheduled for removal. The old incorrect static behavior is not a valid assertion and is not represented by a durable test.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `SC-HTML-006` | Real workspace static route rejects an absolute filesystem candidate while relative static HTML remains valid. | `RQ-004`, `AC-005`; server containment contract; `workspaces.ts` + `FileSystemWorkspace`. | Update `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` with a static absolute-path case. | The historical defect was an absolute path sent to `/static`; durable server boundary coverage should prevent accidental future relaxation. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `SC-HTML-006` | `workspace-content-rest.e2e.test.ts` real REST boundary suite | Add temp outside file, register workspace, request `/rest/workspaces/:id/static/<absolute candidate>` (encoded as route path), assert `400`, exact containment detail, and no outside payload. | `AC-005`; implementation handoff `SC-HTML-006`. | Small test-only change; do not alter server source. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

Plan created before durable coverage changes or final execution; results will be updated as commands run.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt --run components/fileExplorer/__tests__/FileViewer.spec.ts components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts` | Worktree web dir; compatible local dependencies and generated `.nuxt` available from the repository setup | Changed viewer, Markdown, Event Monitor path policy, renderer, mobile preservation | Pass — 6 files / 80 tests | `test-results/event-monitor-html-file-preview/frontend-focused.log` |
| 2 | `pnpm -C autobyteus-web test:nuxt --run components/workspace/agent/__tests__/AgentConversationFeed.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts shared/__tests__/localFileUrl.spec.ts` | Worktree web dir; same Nuxt test setup | Event Monitor action forwarding/wiring and local URL preservation | Pass — 3 files / 22 tests | `test-results/event-monitor-html-file-preview/event-monitor-preservation.log` |
| 3 | `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` then `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/rest/workspaces.test.ts tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts --no-watch` | Worktree server dir; offline lockfile install for current `repository_prisma@1.0.9`; test-owned SQLite DB/temp workspaces | REST content/static serving, traversal, absolute containment, `SC-HTML-006` | Pass — 2 files / 8 tests | `test-results/event-monitor-html-file-preview/prisma-generate.log`, `server-rest.log` |
| 4 | `pnpm -C autobyteus-web test:electron --run electron/__tests__/localFileValidation.spec.ts electron/__tests__/preload.spec.ts electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts` | Worktree web dir; Electron Vitest Node configuration | Trusted local-file validation, preload bridge, protocol gate/response preservation | Pass — 4 files / 19 tests | `test-results/event-monitor-html-file-preview/electron-focused.log` |
| 5 | `git diff --check` | Worktree root | Test/source whitespace integrity | Pass | `test-results/event-monitor-html-file-preview/git-diff-check.log` |
| 6 | Temporary Playwright/Chrome probe with a temporary Nuxt page mounting `HtmlPreviewer` directly | `pnpm -C autobyteus-web dev --host 127.0.0.1 --port 31043`; Chrome `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; no auth | Browser Blob iframe and explicit workspace static URL/sandbox | Pass — local Blob frame rendered text; no local static request; workspace URL used explicit ID | `test-results/event-monitor-html-file-preview/browser-probe.json`, `.log`, `.png` |
| 7 | Temporary Playwright/Chrome probe with a temporary Nuxt page invoking the actual `useEventMonitorFilePreview().openPath()` -> File Explorer store -> `FileViewer` -> `HtmlPreviewer` | Same Nuxt dev setup; browser-only `electronAPI.readLocalTextFile` bridge stub returns deterministic loaded HTML; no packaged Electron | Event Monitor local-absolute launcher and read-only HTML viewer, with absolute path absent from network requests | Pass — `opened`; Blob iframe rendered loaded HTML; no `/rest/workspaces/` or absolute-path request | `test-results/event-monitor-html-file-preview/event-monitor-launcher-browser-probe.json`, `.log`, `.png` |

## Post-Repository Confidence Scorecard (Mandatory)

Repository execution completed successfully for the focused plan above. The first server attempt was blocked by stale/incompatible linked dependencies (`repository_prisma@1.0.6`, then missing generated Prisma client); the supported offline workspace install and explicit `prisma generate` corrected setup before the passing rerun. This environment correction is recorded as setup evidence, not a product failure.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | `HtmlPreviewer`/`FileViewer` tests, Event Monitor policy/wiring tests, browser launcher probe, and real REST containment cover `AC-001`–`AC-005`. | Actual packaged Electron IPC is not in this score; browser launcher uses a bridge stub. | Packaged Electron live run would remove the final shell uncertainty. |
| Changed-boundary execution directness | 95% | Browser probe invokes the actual `useEventMonitorFilePreview` path and current `FileExplorer`/`FileViewer`/`HtmlPreviewer`; server E2E uses real `FileSystemWorkspace`. | The bridge function is emulated in browser. | Actual Electron renderer would provide shell-direct evidence. |
| Cross-boundary integration realism and mock gap | 95% | Real Nuxt browser rendering and Fastify route injection; launcher probe invokes the actual composable/store/viewer spine. The only emulation is the bridge return, whose preload/local-file contract is covered by the Electron suite. | No authenticated full application Event Monitor panel and no real Electron IPC process. This is bounded because neither launcher nor shell source changed. | Project desktop execution if a future change touches the shell boundary. |
| Environment, configuration, identity, and fixture fidelity | 95% | Current worktree Nuxt dev server, Chrome, deterministic local path/workspace ID, test-owned SQLite/temp workspaces, corrected current lockfile dependencies, and explicit cleanup. | Browser uses an isolated temporary page and bridge stub rather than a packaged app/account. This does not change the viewer's resource-selection authority. | Live Electron with a test-owned app data directory if shell code changes. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Blob cleanup and sandbox durable tests; invalid/unsupported Event Monitor policy; real static/content boundary errors; Electron local validation/protocol tests; browser no-request assertions. | Electron read failure is unit-tested, not live renderer-tested. | Live Electron IPC failure/success journey. |
| User-surface, browser, and desktop-shell confidence | 95% | Chrome rendered the Blob document and explicit static URL; launcher probe observed `opened`, read-only mode, iframe sandbox, and HTML body. Electron focused suite passed for preload, validation, protocol, and response boundaries. | Packaged Electron window/preload/server lifecycle not launched; full authenticated UI click not exercised. These are unchanged shell/launch seams. | Project-supported desktop launch only if future changes affect those seams. |
| Durable regression coverage quality and relevance | 95% | Existing focused tests are requirement-linked; new `SC-HTML-006` is a narrow real REST regression guard; no stale tests removed. | The full launcher journey remains a temporary probe rather than durable app E2E. | A stable project-owned browser fixture could raise directness but is not justified for this small viewer fix. |

- Overall post-repository confidence: 95% (simple average of seven `95%` category scores).
- Calculation method: Simple average of applicable category scores; weak critical evidence will not be hidden by the average.
- Every critical acceptance criterion directly proven: `Yes` for the reviewed viewer/route scope; full packaged Electron IPC remains outside direct proof.
- Any applicable category below 90%: `No`.
- Default clean-confidence target of 95% met: `Yes`; no applicable category is below 90% and the remaining shell uncertainty is non-material to the renderer-only change.
- Material residual risks: packaged Electron IPC/window lifecycle and local HTML relative CSS/image/script asset fidelity remain unverified; the latter is an approved existing Blob-base limitation.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` plus REST route execution; actual packaged Electron is not planned unless browser/source evidence leaves a material shell-only gap.
- Specific confidence gap or residual risk addressed: Browser iframe navigation and Blob content are not proven by happy-dom; the exact invalid absolute static route should be proven through real Fastify/FileSystemWorkspace.
- Why the selected mode can materially improve confidence: It exercises the actual browser URL/blob lifecycle and real route boundary without unsafe filesystem access or production data.
- Expected confidence after selected validation: Achieved 95% rounded overall; a bounded Electron shell residual risk remains documented.
- Browser-specific decision and rationale: Required for web-equivalent renderer behavior because Blob iframe navigation is browser-specific and the change affects a visible user preview.
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: N/A; validation completed.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron.
- Relevant README or development instructions: `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/AGENTS.md`.
- Web-equivalent behavior: Vue `HtmlPreviewer`/`FileViewer` rendered in a browser with loaded content and explicit/null resource context.
- Shell-specific or lifecycle behavior: Trusted `electronAPI.readLocalTextFile`, IPC validation, embedded window identity, local bridge lifecycle, packaged server startup.
- Chosen validation approach and why it fits the project: Browser first for web-equivalent renderer; actual `useEventMonitorFilePreview` launcher was exercised with a browser-only bridge stub; existing Electron source/unit coverage proves the trusted bridge boundary. Actual desktop execution is last resort and was not warranted because no Electron source changed and the remaining shell behavior is covered by focused tests.
- Server/frontend setup when browser validation is used: Temporary Nuxt dev page and an isolated local port; backend not required for local Blob scenario, route injector/test covers containment.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: Actual Electron IPC/window lifecycle and packaged server startup remain bounded residual uncertainty; no claim of packaged desktop pass is made.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Use the repository's offline lockfile install for the server and web package dependencies; run `prisma generate`; run Nuxt dev on `127.0.0.1:31043`; run Vitest suites in-process; execute Playwright probes; stop Nuxt and remove temporary pages.
- Environment choices that materially affect the run: `NODE_ENV=development` for Nuxt dev; browser Chrome executable at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; unique output directory under task worktree.
- Health / readiness checks: Nuxt readiness log/HTTP page; semantic probe marker; iframe `src`, sandbox, and frame/body text; `opened` launcher result; no `/rest/workspaces/` or absolute local path request in local scenario.
- Seed data / fixtures: Inline HTML content and a workspace-relative HTML file in unique OS temp directory for server route test.
- Test identities, authentication, permissions, or session state: No account/auth required. The launcher probe sets a deterministic workspace context and emulates only the trusted bridge response; route tests use a unique temp workspace.
- Requirement-linked journeys or scenarios: `SC-HTML-001` local absolute Blob; `SC-HTML-002` explicit workspace static; `SC-HTML-003` Blob lifecycle; `SC-HTML-005` Markdown preservation (repository tests); `SC-HTML-006` server static containment.
- DOM, screenshot, log, API, process, or other evidence to capture: JSON result with iframe source, sandbox, iframe body text, request URLs, console/page errors, server test output; screenshot only as supplemental.
- Owned processes and temporary state to clean up: Nuxt child process and temporary pages were stopped/removed. Test-owned temp workspaces/DB were cleaned by Vitest. Dependency installs and generated ignored metadata remain local ignored setup; no shared process or user data was touched.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `SC-HTML-001` | Temporary Nuxt page mounting `HtmlPreviewer` with absolute path, loaded HTML, null context; Playwright/Chrome observes iframe. | `AC-002`/`AC-003`: Blob source, sandbox, rendered HTML, no workspace static request. | Existing durable component tests already protect source policy; full app fixture would be brittle and out of proportion. |
| `SC-HTML-002` | Temporary Nuxt page with explicit workspace context; browser observes the static URL and route request. | `AC-004`: explicit identity drives static URL. | Existing durable unit and server route tests own URL/containment; browser check closes renderer confidence. |
| `SC-HTML-003` | Durable `HtmlPreviewer.spec.ts` updates content/unmounts and asserts Blob revocation; browser probe confirms rendered current frame. | Blob source lifecycle and cleanup. | Durable lifecycle test already owns this invariant; no temporary-only change retained. |
| `SC-HTML-001` launcher extension | Temporary Nuxt page invokes actual `useEventMonitorFilePreview.openPath` with a deterministic browser bridge stub, then renders `FileViewer`. | `AC-002`/`AC-003`: `opened`, local loader content reaches Blob iframe, no static/absolute request. | Full authenticated Event Monitor app setup is unnecessary for this unchanged launcher seam; keep as execution evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual packaged Electron IPC/local filesystem read of the reported absolute file | No changed Electron production code; desktop startup/packaging is expensive and shell-specific; browser proves the renderer only. | Trusted bridge or packaged-server integration could regress independently. | Delivery should record residual shell risk; rerun project Electron tests or a manual desktop check if user requests. |
| Full authenticated Event Monitor click in a running development stack | Requires account/session/workspace bootstrap not needed by the reviewed viewer delta. | Launcher/side-panel focus behavior is not directly live-proven. | Existing action-policy/launcher source and focused tests remain evidence; escalate only if browser/source mismatch appears. |
| Local HTML relative CSS/image/script asset loading | Existing approved Blob-base limitation; changing it would be design impact. | Local HTML with relative assets may differ from workspace static view. | Preserve as documented residual risk; do not alter implementation. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time. The approved explicit-context/null-content contract is clear, and no test validity ambiguity blocks execution. | N/A | Requirements, design review `ARCH-REV-001`, implementation review `CRR-001`. | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update existing server REST E2E coverage for `SC-HTML-006`; no frontend durable test change planned.
- Post-repository confidence: 95% overall; no applicable category below 90%.
- Broader validation decision: `Required` and completed — browser renderer/launcher probes plus real REST boundary evidence.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Focused web, Event Monitor preservation, Electron boundary, and server REST checks passed. Browser probes used a temporary page and a bridge stub; they do not claim packaged Electron IPC success. Nuxt dev logs include expected dependency-optimization/backend-health noise but zero page errors and no request to the local absolute path/static route. No implementation failure or reroute was found.
