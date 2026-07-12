# Markdown Preview Relative Images — API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/design-spec.md`
- Supplemental Solution Artifacts: `None`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/code-review-report.md`
- Current Investigation Round: `2`
- Trigger: proportional test-code review finding `TR-MPRI-001` identified persisted workspace-registry leakage in the new REST E2E cleanup.
- Prior Investigation Reviewed: `Yes — Round 1 API/E2E pass and Round 1 proportional review failure`
- Latest Authoritative Investigation: `Round 2`

## Current Requirement And Design Basis

The approved change must preserve explicit workspace/document identity from desktop and mobile Files preview, resolve only inline relative Markdown image resources against the document directory, load those resources through the existing bound-node workspace REST content endpoint, and keep generic Markdown context-neutral. Valid sibling, nested, `./`, and contained `../` paths must work; spaces and percent-encoded characters must decode once without double encoding; query text is not filesystem identity; SVG fragments are display-only. Invalid, malformed, missing, and out-of-workspace resources must fail locally while preserving the document and alt text.

Managed images must be inert until the authorized-resource owner has classified the current credential generation. Credential establishment, replacement, removal, and node/workspace/document changes must synchronously invalidate old bindings, suppress stale completions, and revoke obsolete blob URLs even when source strings do not change. The server's public REST route must remain mediated by `FileSystemWorkspace` and reject lexical sibling-prefix and absolute traversal. Symlink/canonical-filesystem policy is intentionally unchanged and must not be overclaimed. Persisted data is `Not Affected`; source Markdown and image files must remain unmodified.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Workspace Markdown relative image resolution | Added | `REQ-MPRI-001`–`003`; `DS-MPRI-001` | Direct Chromium proof is required for actual decoded images and DOM binding. |
| Managed image authorized loading and credential generations | Changed | `REQ-MPRI-004`, `008`; `DS-MPRI-002`–`004` | Validate null→A, A→B in flight, A/B→null, stale suppression, and blob cleanup. |
| Generic Markdown behavior | Preserved | `REQ-MPRI-005`, `007`, `011` | Existing context-neutral test remains valid; add real-browser neutrality observation in the probe. |
| Invalid/missing image isolation | Changed | `REQ-MPRI-006`; `AC-MPRI-006`, `007` | Validate blocked sources have no request and missing sources do not blank the document/alt text. |
| Workspace content lexical containment | Changed | `REQ-MPRI-009`; design canonical resolver | Add durable real REST + real `FileSystemWorkspace` E2E coverage; current REST unit test mocks the authority. |
| Markdown/image persistence | Preserved | `REQ-MPRI-010`; persisted-data decision | Confirm fixture source/assets remain byte-identical; no migration/rebuild coverage applies. |
| Server symlink semantics | Preserved | requirements risk and reviewed lexical-only scope | Do not infer or test canonical filesystem/symlink containment as new behavior. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | lexical workspace-relative path resolution | focused server unit tests | public REST + real workspace authority composition | Fastify inject E2E |
| API / transport / contract | Yes | `/rest/workspaces/:id/content?path=...` | mocked-route unit coverage | real workspace lookup, MIME/bytes, rejection statuses | Fastify inject E2E |
| Frontend component / state | Yes | preview context, render model, managed DOM binding | focused Nuxt/Vitest component tests | real browser decoding/network ordering | Browser |
| Browser integration / user journey | Yes | sanitized `v-html` `<img>` binding and browser blob/direct URLs | happy-dom only | Chromium parsing, decoding, fragment display URL, failed image behavior | Browser |
| Authentication / session / permissions | Yes | Phone Access bearer credential snapshot | mocked-fetch unit tests | real browser fetch/header timing and object-URL lifecycle | Browser with deterministic local protected HTTP fixture |
| Desktop renderer / web-equivalent UI | Yes | Vue/Nuxt renderer code used by desktop/mobile | component tests | real Chromium renderer semantics | Browser development harness |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/native change | N/A | none material | None |
| Process / lifecycle | Yes | async request generation, context switches, unmount | unit generation guard | browser task ordering and network abort/stale completion | Browser |
| Persisted-data transition | No | ephemeral state/URLs only | approved `Not Affected` | source mutation regression only | fixture hash check |
| Worker / queue / distributed coordination | No | none | N/A | none | None |
| External integration | No | local workspace resources only | N/A | real remote node not required for contract fidelity | Local HTTP fixture |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images`
- Project type and runtime stack: pnpm 10 monorepo; Nuxt 3/Vue 3 renderer with Vitest + happy-dom; Electron wrapper; Fastify TypeScript server with Vitest, GraphQL, REST, and workspace filesystem objects.
- Conflicting, missing, or unclear project instructions: no repository-resident Playwright/browser E2E runner for this renderer journey. The documented web dev path is browser-based Nuxt (`pnpm dev`), but the full app requires unrelated application bootstrap. A focused temporary Vite browser harness can exercise the actual changed Vue composable/component/store modules and real HTTP boundary without introducing a parallel durable browser framework.
- Required environment variables or secrets available: `N/A`; deterministic local bearer credentials will be fixture values, not secrets.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/AGENTS.md` | frontend testing authority | use colocated tests; `pnpm test:nuxt ... --run`; browser dev surface preferred for web-equivalent behavior. |
| `autobyteus-web/README.md` | frontend runtime/test guide | `pnpm dev` serves browser app; `pnpm test:nuxt --run`; Electron tests are separate and shell-only. |
| `autobyteus-web/vitest.config.mts` | frontend test runner | Nuxt environment uses happy-dom, so it cannot alone prove real Chromium image behavior. |
| `autobyteus-server-ts/AGENTS.md` | server test authority | use `vitest run ... --no-watch`; integration and focused file commands documented. |
| `autobyteus-server-ts/README.md` | server execution guide | Fastify server is normally built/run on port 8000; tests use isolated test data. |
| `autobyteus-server-ts/vitest.config.ts` | server test runner | node/forks, no file parallelism, temp Prisma setup; includes E2E test files. |
| `implementation-handoff.md` | implementation evidence | focused 64 frontend/21 server tests passed; repository-wide typechecks have documented pre-existing baseline failures and must remain separately classified. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| pnpm dependencies | worktree root | temporarily link existing root/component `node_modules` from primary checkout, matching implementation setup | no dependency mutation; links are validation-owned | `pnpm --version`, module resolution | remove only created links |
| durable server E2E | `autobyteus-server-ts` | `pnpm exec vitest run <path> --no-watch` | Fastify inject, temp workspace, singleton manager cleanup | test completion | test hooks remove workspace/temp roots |
| focused browser harness | task evidence temp directory + web source | local Vite + deterministic HTTP resource fixture | loopback-only unique ports; real Chrome/Chromium | HTTP readiness and browser navigation | stop owned process; remove harness; retain logs/results/screenshots only |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Real workspace for REST E2E | `WorkspaceManager.createWorkspace` over `fs.mkdtempSync` | isolated OS temp root and same-prefix sibling | close/remove created workspace and roots in hooks |
| PNG/SVG/Markdown browser fixtures | deterministic generated files served by validation harness | task-owned loopback data only | delete runtime fixture; retain hashes/result evidence |
| Phone Access credentials A/B | deterministic local bearer header values in fixture server | not real account credentials; proves exact transport/generation boundary | process teardown |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` → Persisted Data / State Transition Decision; `implementation-handoff.md` → Persisted Data Transition Check.
- Representative existing-data setup and required behavior: ordinary Markdown plus PNG/SVG files; preview reads them without rewriting.
- Evidence planned: before/after hashes for the browser fixtures plus source inspection showing ephemeral state only.
- Migration-specific scenarios: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/fileExplorer/__tests__/workspaceResourceUrl.spec.ts` | relative matrix, spaces, percent decoding, fragment/query, direct/blocked classification | REQ 001–003, 005–006; AC 001–003, 006, 008 | Still Valid | pure owner-level policy and edge matrix match approved behavior | rerun |
| `autobyteus-web/composables/__tests__/useMarkdownSegments.spec.ts` | generic neutrality and managed/blocked no-initial-src render model | REQ 006–007; AC 007, 009 | Still Valid | tests the parser/token contract without a browser | rerun; complement with browser |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | no managed `src` before credentialed fetch; blob+SVG fragment after completion | REQ 004, 006, 008 | Still Valid | correct component contract but happy-dom and single generation | rerun; complement with browser |
| `autobyteus-web/composables/__tests__/useAuthorizedObjectUrl.spec.ts` | null→A→B in-flight→null with unchanged source; stale suppression/revocation | REQ 004, 008; AC 005, 010 | Still Valid | direct transaction evidence with mocked fetch | rerun; complement with real browser HTTP |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts` | explicit workspace/document/bound-node adaptation and neutral missing context | REQ 001, 003, 007 | Still Valid | directly proves adapter identity ownership | rerun |
| `autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts` and mobile/store coverage named in handoff | explicit context propagation/projection and reset | REQ 004, 008 | Still Valid | owner-level state coverage | rerun affected suite |
| `autobyteus-server-ts/tests/unit/workspaces/workspace-path-utils.test.ts` | contained path, same-prefix sibling rejection, absolute rejection | REQ 009; AC 006 | Still Valid | direct canonical helper evidence | rerun |
| `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts` | REST status mapping and content streaming | REQ 003, 009 | Still Valid but insufficient alone | route uses mocked `getAbsolutePath`, so it bypasses real `FileSystemWorkspace` | rerun; add E2E composition |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts` | real manager/workspace GraphQL sibling-prefix rejection | REQ 009 | Still Valid | proves canonical resolver through explorer GraphQL boundary, not REST content route | rerun |
| `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` fetch-option assertions | run-scoped artifact fetches retain `cache: no-store` | authorized transport regression boundary | Needs Update | the approved shared transport now materializes a `Headers` snapshot even with no credential; exact `{ cache }` assertions were stale while user-visible behavior remained correct | accept `Headers` in the valid fetch shape and rerun |

## Stale Or Obsolete Coverage Decisions

None. No relevant existing scenario asserts removed or compatibility-only behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `MPRI-API-001` | real workspace REST serves image bytes/MIME for encoded space path | REQ 003; AC 003–004; DS-MPRI-002 | `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` | existing REST unit mocks `FileSystemWorkspace`; direct API composition should remain protected |
| `MPRI-API-002` | same-prefix sibling traversal rejected by REST through real `FileSystemWorkspace` | REQ 009; AC 006 | same file | security boundary merits durable end-to-end regression coverage |
| `MPRI-API-003` | absolute path rejected by REST through real `FileSystemWorkspace` | REQ 009; AC 006 | same file | proves public route delegates absolute rejection to authority |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `MPRI-TEST-001` | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | accept the canonical transport's empty `Headers` snapshot while retaining URL and `cache: no-store` assertions | reviewed shared authorization-header owner; generic/non-credential behavior remains neutral | discovered by the full Nuxt suite; 17-test focused rerun passed |
| `MPRI-TEST-002` | `autobyteus-web/composables/__tests__/useAuthorizedObjectUrl.spec.ts` | add explicit credential A→null while A is in flight and sources are unchanged | REQ-MPRI-008; AC-MPRI-010; DS-MPRI-004 | closes an exact lifecycle priority not isolated by the original null→A→B→null scenario |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts --no-watch` | `autobyteus-server-ts` | MPRI-API-001–003 | Pass | `evidence/server-rest-e2e-rerun.log`; 1 file/3 tests |
| 2 | focused 12-file Nuxt command recorded in log | worktree root | resolver, render, context, lifecycle, neutrality | Pass | `evidence/frontend-focused.log`; 12 files/64 tests |
| 3 | focused six-file server unit/E2E command recorded in log | worktree root | resolver, FileSystemWorkspace, REST, explorer GraphQL | Pass | `evidence/server-affected.log`; 6 files/26 tests |
| 4 | `pnpm -C autobyteus-web test:nuxt --run --reporter=dot` | `autobyteus-web` | broader frontend regressions | Fail — baseline/stale-test classified | `evidence/frontend-full.log`; 348 files/1827 tests passed, 8 tests plus one Electron suite failed. Four artifact assertions were validly updated and their 17-test file passed; the remaining four focused failures are unchanged/unrelated baseline assertions, and Electron installation was unavailable in shared dependencies. |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer --no-watch` | `autobyteus-server-ts` | broader file-explorer behavior | Fail — environment baseline classified | `evidence/server-file-explorer-e2e.log`; 4 files/11 tests passed, two unrelated websocket lifecycle tests could not start the absent generated watcher runtime entrypoint. All REST/path/file-operation/snapshot scenarios passed. |
| 6 | guards and `git diff --check` | worktree | architecture/localization and patch hygiene | Pass | `evidence/guards.log` |
| 7 | web and server typecheck commands | web/server | baseline comparison | Fail — documented baseline | `evidence/typecheck-web.log`: 229 errors, only changed-owner hits are the two pre-existing implicit-any lines 231/275; `evidence/typecheck-server.log`: expected TS6059 rootDir/include configuration failures. |
| 8 | focused stale-test correction and explicit A→null reruns | `autobyteus-web` | MPRI-TEST-001–002 | Pass | `evidence/artifact-content-viewer-rerun.log` (17/17); `evidence/credential-lifecycle-rerun.log` (2/2) |
| 9 | Round 2 supported registry cleanup + focused REST E2E rerun | `autobyteus-server-ts` | `TR-MPRI-001`, MPRI-API-001–003 | Pass | `evidence/registry-cleanup-round2.log`: 9 leaked task-test entries removed through `WorkspaceManager.removeRegisteredWorkspace`; `evidence/server-rest-e2e-round2.log`: 3/3; `evidence/registry-isolation-round2.txt`: 0 matching entries before/after rerun and identical registry SHA-256 |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | focused frontend/server coverage plus real REST composition directly map every criterion | browser-only visibility and network ordering remain | Chromium run |
| Changed-boundary execution directness | 93% | real `FileSystemWorkspace` REST tests and direct owner/component tests | happy-dom is not a browser renderer | Chromium run |
| Cross-boundary integration realism and mock gap | 90% | Fastify + real manager/workspace/file bytes; Vue owner chain | credential fetch/blob path is mocked in repository tests | real browser local HTTP fixture |
| Environment, configuration, identity, and fixture fidelity | 92% | isolated real filesystem/Fastify and actual Vue modules | no physical phone or full app bootstrap | focused real browser harness |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | path, missing, malformed, credential generations, stale suppression, explicit A→null | browser scheduling/decoding not yet direct | lifecycle browser run |
| User-surface, browser, and desktop-shell confidence | 82% | component render model and happy-dom assertions | no real Chromium proof; shell is unchanged | real Chrome/Chromium |
| Durable regression coverage quality and relevance | 96% | narrow owner tests plus new real REST security/API E2E; stale call-shape assertions corrected | proportional review still required | code review after execution |

- Overall post-repository confidence: `92%` (641/7 = 91.57%, rounded)
- Calculation method: simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: `No — Chromium user-surface criteria remain`
- Any applicable category below `90%`: `Yes — user-surface/browser/desktop-shell confidence 82%`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real Chromium decode/DOM/network sequencing, real browser bearer/object-URL lifecycle, bound-context stale binding.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` plus local live HTTP/API fixture
- Specific confidence gap or residual risk addressed: actual Chromium `<img>` decode and alt-text behavior, absence of an initial managed request, bearer/object-URL transitions, stale generation/context cleanup, and generic Markdown neutrality.
- Why the selected mode can materially improve confidence: it exercises real browser URL parsing, DOM replacement, image decoding, fetch, blob URL creation/revocation, Vue scheduling, and network ordering that happy-dom/mocked unit tests bypass.
- Expected confidence after selected validation: `>=95% overall, all categories >=90%, if all critical scenarios pass.`
- Browser-specific decision and rationale: required because the code changes sanitized `v-html` image elements and browser-managed blob/image behavior. The web-equivalent renderer is sufficient; no Electron IPC/preload/native boundary changed.
- If Not Required: `N/A`
- If Blocked: `N/A at investigation time`

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping Nuxt/Vue.
- Relevant README or development instructions: `autobyteus-web/README.md` browser dev path and Electron build/test commands.
- Web-equivalent behavior: all changed frontend behavior (Markdown parsing/rendering, authorized fetch, blob binding, state changes).
- Shell-specific or lifecycle behavior: none changed; bound endpoint is ordinary renderer state and HTTP.
- Chosen validation approach and why it fits the project: real Chrome/Chromium against a focused Vite-hosted renderer harness using the repository's actual modules, plus real local HTTP content endpoints.
- Effect on any already-running desktop application: `None`; isolated loopback ports/profile.
- Behavior not directly proven and confidence consequence: packaged Electron `file:` origin is not separately executed; no changed origin/IPC code and direct endpoint URLs are absolute, so residual risk is negligible and explicitly retained.

## Live Environment And Fixture Plan

- Startup order and commands: create isolated evidence/runtime directory; start one Vite transform/server plus deterministic protected resource endpoints; verify readiness; open in real Chrome/Chromium; execute scenarios; shut down owned process.
- Environment choices: loopback only, unique unoccupied ports, source modules from assigned worktree, existing dependency installation linked temporarily.
- Health/readiness: HTTP 200 harness page and fixture readiness endpoint.
- Seed data/fixtures: Markdown for sibling/nested/parent, spaces/encoded space, missing, SVG fragment, traversal, HTTP/data, plus deterministic PNG/SVG bytes.
- Identities/authentication: null, bearer A, bearer B; fixture logs requested URL, credential header, timing, and response completion.
- Requirement-linked journeys: `MPRI-BROWSER-001` rendering matrix; `MPRI-BROWSER-002` no initial managed request; `MPRI-BROWSER-003` null→A; `MPRI-BROWSER-004` A→B in flight; `MPRI-BROWSER-005` A/B→null unchanged sources; `MPRI-BROWSER-006` node/workspace/document/source switches and cleanup; `MPRI-BROWSER-007` generic neutrality/direct sources/missing/blocked isolation.
- Evidence: semantic DOM/state JSON, request timeline/header log, decoded image dimensions/completion, blob create/revoke log, console errors, screenshot, fixture hashes.
- Cleanup: owned browser tab/profile if created, local process, runtime fixtures, and temporary dependency links; retain only reports/logs/results/screenshots.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `MPRI-BROWSER-001`–`007` | focused Vite page importing actual Vue renderer/composable/store modules with local protected HTTP fixture, controlled in real Chromium | browser decode/render, request ordering, credential/context lifecycle, neutrality | repository has no browser runner/convention; adding a one-off framework would be disproportionate. Durable owner/API tests protect deterministic contracts. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Physical Phone Access device pairing | no external device/account is required to prove the changed bearer/object-URL browser transaction | low; local browser uses actual store/composable/fetch/header/blob code with realistic HTTP timing | none unless local browser evidence contradicts unit behavior |
| Packaged Electron shell | no shell-specific code changed; browser-equivalent path is authoritative for renderer behavior | negligible | record as residual only |
| Symlink canonical containment | explicitly outside reviewed lexical-only scope | none for approved scope; existing policy unchanged | do not expand claims |

## Ambiguities Or Reroute Triggers

None identified before execution. Round 2 finding `TR-MPRI-001` was a bounded API/E2E-owned cleanup defect, not an upstream ambiguity. It is resolved by using the supported registry-removal lifecycle in `afterEach`; no reroute beyond proportional re-review is required.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — add one server REST E2E file and update two frontend test files; no removals`
- Post-repository confidence: `92%`
- Broader validation decision: `Required — real browser`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Round 2 resolved `TR-MPRI-001`; the focused rerun left zero matching registry entries. Keep repository-wide typecheck baseline failures separate from regressions and preserve reviewed lexical-only symlink scope.
