# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/user-verification-file-uri-display-preservation-report.md`; final user verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/user-verification-final-test-report.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/code-review-report.md`
- Current Investigation Round: 2
- Trigger: user supplied explicit final-test approval after round 1 runtime dependency block
- Source revision: `c489f92da4d3d3d97fb3542912a9c9b0adb42aed`
- Prior Investigation Reviewed: predecessor `event-monitor-absolute-path-file-preview` coverage package under `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/`; no prior API/E2E round exists for this new URI ticket
- Latest Authoritative Investigation: this file

### Round 2 Update

The user explicitly reported that they performed the final test successfully and approved continuation. The resulting user-verification artifact records that attestation without inventing device, platform, scenario, or screenshot details. This resolves the external runtime dependency that caused round 1 to be blocked for workflow purposes; the prior repository, live API, browser bootstrap, and residual limitations remain preserved below.

## Current Requirement And Design Basis

The reviewed implementation adds only Event Monitor-scoped raw Markdown `file:` URI classification. A case-insensitive `file:` URI with empty authority, no query/fragment, a decoded absolute POSIX or Windows-drive path, and a supported preview family becomes the existing typed read-only Event Monitor file action. The authored Markdown label and compact underlined action treatment remain unchanged. Lexically malformed, incomplete, non-empty-authority, traversal/placeholder, root-only, NUL-containing, or unsupported file URIs remain source-faithful but inert. A syntactically valid supported URI that cannot map to an active browser/remote workspace remains a valid action and becomes the existing activation-time host-only/unavailable outcome before Files, mobile, or content access.

The raw URI is provenance only. Render-time classification is pure; sanitized HTML carries only renderer-owned opaque markers and must not contain the raw URI. Explicit pointer/Enter/Space activation is the only route to the existing launcher. Trusted Electron validation and active-workspace containment remain the authorization owners. Ordinary Markdown outside Event Monitor and non-file links remain unchanged. No persistence, new endpoint, second viewer, or native renderer read is in scope.

The requirement basis is REQ-URI-001 through REQ-URI-012 and AC-URI-001 through AC-URI-014, with BEH-URI-001 through BEH-URI-009. The user-verification supplement is approval-applicable for the valid authored-label versus invalid inert display decision and is retained in the package.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-URI-001 / REQ-URI-001/002 | Added | Requirements, design, `absoluteFilePathAction.ts` | Direct parser/action tests; browser Event Monitor mount still needed |
| BEH-URI-002 / REQ-URI-003/007 | Added safety behavior | Requirements, `MarkdownRenderer.vue`, URI component tests | Inert marker/no-anchor and source-faithful behavior require direct render assertions and live no-navigation evidence |
| BEH-URI-003 / REQ-URI-004/005 | Preserved extension | Supplement, predecessor launcher, renderer tests | Existing action keyboard/pointer and launcher suites remain valid; authenticated user journey is not mounted |
| BEH-URI-004 / REQ-URI-002/006 | Added shared policy use | Shared normalizer and file-type policy | URI grammar, encoding, invalid components, and unsupported families covered by focused suites |
| BEH-URI-005 / REQ-URI-003/007 | Added raw-token provenance | Design, review report, composable tests | Must verify raw URI stays out of sanitized HTML; direct tests pass, browser message unavailable |
| BEH-URI-006 / REQ-URI-009/010 | Preserved owner boundary | Existing launcher, Electron/local capability, workspace mapping | Electron and server containment checks pass; active Event Monitor mapping remains unmounted |
| BEH-URI-007 / REQ-URI-005/011 | Preserved pure/passive behavior | Requirements, design, launcher ownership | Repository tests cover no passive side effects; live Event Monitor render unavailable |
| BEH-URI-008 / REQ-URI-007/008/012 | Preserved | Capability-gated renderer and generic-link tests | Broad Markdown regression suite remains valid and passes |
| BEH-URI-009 / REQ-URI-010 | Preserved activation distinction | Architecture review round 2 and design rework | Remote-unmapped result remains unproven in authenticated browser/mobile runtime |
| REQ-URI-011 / persisted data | Preserved / Not Affected | Requirements and implementation handoff | No migration or persistence test needed |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No domain change | Existing policies and server tests | None material to source change | None |
| API / transport / contract | Indirectly preserved | Existing workspace content route remains the boundary | REST route unit suite, live health/content/containment probes | Authenticated Event Monitor-to-route contract and client session not exercised | Live API plus authenticated browser |
| Frontend component / state | Yes | Raw Markdown token decoration, action descriptor, inert marker, delegated activation | 3 URI files/58 tests; 5/85 and 15/137 broader frontend suites | Mounted real Event Monitor action not exercised | Browser |
| Browser integration / user journey | Yes | Event Monitor conversation -> rendered file URI -> activation -> Files | Browser bootstrap only; no authenticated conversation fixture | Valid, invalid, keyboard, no-navigation, and preview journey unproven | Authenticated browser |
| Authentication / session / permissions | Yes at owner boundary | Event Monitor activation needs workspace/agent/session identity | No suitable local authenticated fixture discovered | Cannot prove active workspace or remote-unmapped status | Project auth fixture / user-provided session |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer and responsive shell | Live Nuxt `/agents` and `/mobile` bootstrap plus screenshots | URI action UI not mounted | Authenticated browser |
| Desktop shell / Electron-specific integration | Preserved boundary | Trusted local validation and local-file media/text owners | Electron local validation 1/1 and Electron TS pass | Packaged current Electron/native launch and media behavior not run | Project package / Electron run |
| Process / lifecycle | Indirect | Nuxt/server startup and cleanup only | Live service start/stop passed | Packaged lifecycle/restart not exercised | Packaged Electron |
| Persisted-data transition | No | No persisted schema or runtime data change | Implementation/review checks state no migration | None material | None |
| Worker / queue / distributed coordination | No | No change | Not relevant | None | None |
| External integration | No direct change | No new external integration | No new dependency boundary | None | None |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview`
- Project type and runtime stack: pnpm workspace, Nuxt 3/Vue 3 frontend, Vitest component/unit tests, Electron 42 shell and TypeScript, Fastify/Prisma server with SQLite, browser development renderer
- Conflicting, missing, or unclear project instructions: no `AGENTS.md` was present in the worktree ancestry. Package scripts and the ticket/design instructions were the applicable execution authority. No repository Playwright/Cypress harness was found; project-local executable probes are the documented E2E-style options.
- Required environment variables or secrets available: `No` for authenticated Event Monitor/Phone Access identities; no secrets were fabricated. `BACKEND_NODE_BASE_URL` was supplied for browser renderer setup.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/package.json` | Frontend scripts and guards | `test:nuxt`, `test:electron`, `transpile-electron`, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `dev` |
| `autobyteus-server-ts/package.json` | Server test/build scripts | Vitest includes `tests/**/*.test.ts`; `build` runs shared builds, Prisma generation, TypeScript, and built-in-agent bootstrap |
| `autobyteus-web/electron/tsconfig.json` | Electron TypeScript boundary | `pnpm --dir autobyteus-web exec tsc -p electron/tsconfig.json --noEmit` |
| `autobyteus-web/tests/e2e/` | Project executable browser probes | Existing Node probes exist, but no URI-specific authenticated fixture or reusable browser harness is available |
| Current ticket `task.md`, `design-spec.md`, and predecessor package | Behavior and owner contract | Browser/remote mapping, trusted Electron, read-only Files, no persistence, and invalid inert behavior must remain at existing owners |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Frontend Nuxt renderer | worktree root | `BACKEND_NODE_BASE_URL=http://127.0.0.1:3328 pnpm --dir autobyteus-web exec nuxt dev --host 127.0.0.1 --port 3327` | Task-owned port 3327 | Nuxt local URL and Nitro ready log | Ctrl-C; browser tabs closed |
| Server | worktree root | `node autobyteus-server-ts/dist/app.js --data-dir /tmp/autobyteus-event-monitor-file-uri-api-e2e-r1 --host 127.0.0.1 --port 3328` | Task-owned temp data directory and port 3328; inherited public URL was logged as 29695 while internal server stayed 3328. Startup also logged Prisma datasource `/Users/normy/.autobyteus/server-data/db/production.db` despite task-owned app-data headings; no migrations were pending, so this is retained as an environment-fidelity residual. | `/rest/health` HTTP 200 and server listening log | Ctrl-C; remove `/tmp/autobyteus-event-monitor-file-uri-api-e2e-r1` |
| Browser | browser tool | Open `/` and `/mobile` | Bootstrap only; no authenticated state | `document.readyState=complete`, DOM/script checks, screenshots | Close tab |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Server relative content fixture | Task-owned `/tmp/.../temp_workspace/api-e2e-uri-r1.txt`; server creates fixed `temp_ws_default` | Isolated temp workspace fixture; startup logged a shared Prisma datasource read with no pending migrations, so shared-DB isolation cannot be claimed stronger than the observed log | Removed after run |
| Outside/traversal/placeholder route checks | Encoded query paths against `temp_ws_default` | Read-only requests; server returned containment errors | No data created |
| Authenticated Event Monitor conversation | No documented local anonymous fixture found | Missing account/session/workspace/agent identity; not fabricated | No cleanup |
| Paired mobile Phone Access | Requires desktop-generated pairing identity/QR and phone session | Not available in browser-only run | No cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: requirements REQ-URI-011/012, design no-persistence boundary, implementation handoff persisted-data check
- Representative existing-data setup and required behavior: Existing Message references, Agent artifacts, and context-file state remain readable through their current owners; URI action descriptors and preview state are transient, and no schema/read/write contract changed
- Evidence planned for the approved outcome: source/review checks, broad rendering/Files/artifact suites, and no migration behavior
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | URI parsing, decoding, Windows/POSIX normalization, malformed/invalid/unsupported classification, action provenance | REQ-URI-001/002/003/006; AC-URI-001..004, 007 | Still Valid | 3 files/58 tests pass | Re-run; no change |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Valid action shell, inert invalid file link, pointer/keyboard event semantics, raw URI not in sanitized HTML, default-off behavior | REQ-URI-003/004/005/007/008; AC-URI-005..008, 011..014 | Still Valid | Included in focused/combined/broad passes | Re-run; no change |
| `autobyteus-web/composables/__tests__/useMarkdownSegments.spec.ts` | Raw token render-model and action registration behavior | REQ-URI-001/003/005/007 | Still Valid | Included in 3-file focused pass | Re-run; no change |
| `autobyteus-web/utils/fileExplorer/__tests__/fileUtils.test.ts` | Shared path/type policy and supported viewer families | REQ-URI-002/006 | Still Valid | Combined and broad passes | Re-run; no change |
| `autobyteus-web/stores/__tests__/fileExplorerNodeRouting.spec.ts` | No read/URL/fetch for unsupported; local/remote routing and media/text owner boundaries | REQ-URI-006/009/010 | Still Valid | Combined and broad passes | Re-run; no change |
| `autobyteus-web/components/workspace/agent/__tests__/AgentEventMonitor.spec.ts` | Event Monitor capability and owner wiring | REQ-URI-001/005/010 | Still Valid | Broad pass | Re-run; no change |
| `autobyteus-web/components/workspace/agent/__tests__/AgentConversationFeed.spec.ts` | Event Monitor capability propagation into renderer | REQ-URI-001/008 | Still Valid | Broad pass | Re-run; no change |
| `autobyteus-web/components/mobile/__tests__/MobileFiles.spec.ts`, `MobileFileViewer.spec.ts`, `stores/__tests__/mobileWorkStore.spec.ts` | Mobile Files/read-only/request lifecycle regressions | REQ-URI-005/010 | Still Valid | Broad pass | Re-run; no change |
| `autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts`, `viewers/__tests__/ExcelViewer.spec.ts` | Supported viewer and read-only preview regressions | REQ-URI-004/005/006 | Still Valid | Broad regression pass | Re-run; no change |
| `autobyteus-web/components/mobile/__tests__/MobileArtifacts.spec.ts`, `MobileArtifactsContentViewerIntegration.spec.ts`, `MobileTeamMessages.spec.ts`, `workspace/agent` artifact suites, `workspace/team` reference suites | References/artifacts and content-viewer regressions | REQ-URI-011; predecessor preserved behavior | Still Valid | Broad regression 18 files/85 tests | Re-run; no change |
| `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts` | Existing workspace content route success, missing workspace, path containment | REQ-URI-010 | Still Valid | 1 file/4 tests pass | Re-run; no change |
| `autobyteus-web/electron/__tests__/localFileValidation.spec.ts` | Trusted local text/media path validation | REQ-URI-009 | Still Valid | 1 file/1 test pass | Re-run; no change |

## Stale Or Obsolete Coverage Decisions

No durable test was stale or removed. The old generic browser/native fall-through is intentionally no longer an expected behavior, but no repository test asserted that unsafe outcome; URI component tests now cover the inert replacement.

## Durable Coverage To Add / Update / Remove

- Add durable coverage: none in this round. Existing URI tests already directly cover the new raw-token contract and were not changed by the current source fix.
- Update durable coverage: none. Re-execution only.
- Remove durable coverage: none.
- Temporary executable browser/API probes are retained as evidence only because the repository has no authenticated Event Monitor fixture or URI-specific browser harness and these probes should not encode environment-dependent credentials.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm install --offline --frozen-lockfile --ignore-scripts` | worktree root | Reproducible current-worktree dependency setup | Pass | setup output; ignored `node_modules` only |
| 2 | `pnpm --dir autobyteus-web exec vitest run utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts composables/__tests__/useMarkdownSegments.spec.ts --reporter=dot` | web Vitest | Direct URI resolver/render-model/renderer behavior | Pass, 3 files/58 tests | `api-e2e-r1-focused.log` |
| 3 | Same URI files plus `utils/fileExplorer/__tests__/fileUtils.test.ts` and `stores/__tests__/fileExplorerNodeRouting.spec.ts` | web Vitest | URI plus shared path/type/routing owners | Pass, 5 files/85 tests | `api-e2e-r1-combined.log` |
| 4 | Changed-chain suites: file policy, URI files, routing, conversation segments, agent feed/Event Monitor, File Explorer tabs, Mobile Files/Viewer, mobile store, right panel | web Vitest | Cross-component Event Monitor/Files/mobile chain | Pass, 15 files/137 tests | `api-e2e-r1-broad.log` |
| 5 | Conversation, Event Monitor, Files/viewer, Mobile artifacts/viewers, references/artifacts regression suites | web Vitest | References/artifacts and viewer regressions | Pass, 18 files/85 tests | `api-e2e-r1-broad-regression.log` |
| 6 | `pnpm --dir autobyteus-web exec vitest --config ./electron/vitest.config.ts run electron/localFileValidation.spec.ts --reporter=dot` | Electron Vitest | Trusted local-file validator | Pass, 1 file/1 test | `api-e2e-r1-electron.log` |
| 7 | `pnpm --dir autobyteus-web exec tsc -p electron/tsconfig.json --noEmit` | Electron TS config | Electron TypeScript boundary | Pass | `api-e2e-r1-electron-tsc.log` |
| 8 | `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/api/rest/workspaces.test.ts --reporter=dot` | Server Vitest/Prisma test DB | Workspace REST content/containment contract | Pass, 1 file/4 tests | `api-e2e-r1-server-route.log` |
| 9 | `pnpm --dir autobyteus-server-ts run build` | server build | Server TypeScript/Prisma/built-in agent bootstrap | Pass | `api-e2e-r1-server-build.log` |
| 10 | `pnpm --dir autobyteus-web run audit:localization-literals`, `guard:localization-boundary`, `guard:web-boundary`, `git diff-tree --check HEAD^ HEAD` | web guards and current commit | Localization/web boundary and whitespace | Pass | `api-e2e-r1-guards.log` |

An initial guessed server Vitest filter (`src/__tests__/serverRoutes.spec.ts`) found no file and was not treated as a product result; the canonical server log was replaced by the correct `tests/unit/api/rest/workspaces.test.ts` run. A stale dependency symlink was also detected, removed, and the complete current-worktree offline install was rerun before accepting the repository evidence.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 82% | Focused 58 tests cover grammar, invalid/inert, raw provenance, default-off, and actions; broad owner suites pass | Runtime activation, Files preview, remote-unmapped distinction, and live no-navigation/no-read are not mounted | Authenticated Event Monitor browser journey and focused activation probe |
| Changed-boundary execution directness | 88% | URI resolver/composable/renderer tests directly exercise current source; changed-scope TS passed in source review | Real DOM action from an authenticated Event Monitor message not exercised | Authenticated browser DOM/event assertions |
| Cross-boundary integration realism and mock gap | 78% | Live server health, relative content, and containment responses pass; server route tests pass | Renderer-to-launcher-to-workspace/mobile/Electron flow is still mocked or unmounted | Authenticated browser plus packaged Electron |
| Environment, configuration, identity, and fixture fidelity | 76% | Current worktree dependency install, real Nuxt and server startup, isolated fixture, clean shutdown | No auth/session, paired phone identity, package artifact, Windows runner; server public URL inherits 29695 override | Provide project-authenticated fixture, paired mobile session, package/native runner, Windows validation |
| Failure, edge-case, lifecycle, and recovery evidence | 89% | URI edge matrix and unsupported/no-read routing tests pass; live traversal/placeholder containment returns 400; process cleanup verified | No live invalid-link navigation attempt or packaged lifecycle/recovery | Authenticated browser invalid-link activation and packaged restart/native checks |
| User-surface, browser, and desktop-shell confidence | 78% | Nuxt `/agents` and `/mobile` bootstrap DOM plus inspected screenshots are coherent; Electron validator/TS pass | URI action, Files panel, responsive Event Monitor, mobile mapped Files, packaged shell not directly exercised | Authenticated browser and packaged Electron |
| Durable regression coverage quality and relevance | 94% | Existing URI, shared policy, routing, mobile, viewer, references/artifact suites remain valid; 15/137 and 18/85 broad passes | No durable API/E2E file was added for missing auth fixture | Add authenticated durable browser coverage only if project fixture becomes available |

- Overall post-repository confidence: 84% (simple average, rounded down)
- Every critical acceptance criterion directly proven: No
- Applicable categories below 90%: Yes — requirement proof, changed directness, cross-boundary realism, environment fidelity, failure/lifecycle, user surface
- Default clean-confidence target of 95% met: No
- Material residual risks: authenticated Event Monitor path, remote/mobile active-workspace mapping, live no-read/no-navigation/raw URI leakage, packaged Electron/native text/media, Windows parsing, and full viewer matrix

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: Browser + Live API plus user-provided final verification
- Specific confidence gap: the requested URI behavior is only user-visible after an authenticated Event Monitor message and depends on active workspace, Electron bridge, or paired mobile state
- Why the selected mode can materially improve confidence: a real authenticated renderer can prove the raw token -> action/inert DOM -> pointer/keyboard event -> launcher boundary and correlate no-navigation/no-read with server/native logs
- Expected confidence after the attempted validation: user verification closes the external runtime dependency for this handoff; exact scenario/device details remain user-attested only
- Browser-specific decision and rationale: run project Nuxt browser bootstrap and inspect the desktop/mobile surfaces; do not fabricate an Event Monitor message or use a raw internal endpoint to bypass authentication
- Exact dependency remaining after safe setup/emulation attempts: none for workflow continuation; the user supplied explicit successful final-test approval. Reproducibility details for that manual test were not supplied and remain recorded as a limitation.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron 42.4.1 with Nuxt renderer and trusted preload/main local-file capability
- Relevant instructions: `autobyteus-web/package.json` scripts `test:electron`, `transpile-electron`, `build:electron`; Electron TS config and local validation suite
- Web-equivalent behavior: Markdown token classification, sanitized action/inert DOM, delegated pointer/keyboard semantics, Event Monitor owner handoff, Files/read-only state
- Shell-specific behavior: trusted local text/media validation, preload/main access, local-file media URL, packaging, native lifecycle, Windows path parsing
- Chosen validation approach: repository Electron validator/TypeScript plus browser dev renderer for web-equivalent bootstrap; no destructive package build or user desktop takeover without a task-owned artifact/fixture
- Effect on any already-running desktop application: None
- Behavior not directly proven: packaged Electron URI activation/media/text and Windows-specific native parsing

## Live Environment And Fixture Plan

- Startup order: install dependencies; build server; start task-owned server on 3328; verify `/rest/health`; start Nuxt on 3327 with `BACKEND_NODE_BASE_URL`; open browser bootstrap pages; close tabs; stop services; remove temp data
- Environment choices: isolated `/tmp/autobyteus-event-monitor-file-uri-api-e2e-r1`; no task-owned shared-DB writes were intentionally performed; internal server URL 3328 despite inherited public URL 29695. Startup logged a shared Prisma datasource read with no pending migrations.
- Health/readiness: server listening log and `/rest/health` HTTP 200; Nuxt local/Nitro ready log
- Seed data: one `api-e2e-uri-r1.txt` fixture in the server-created `temp_ws_default` workspace
- Identities/authentication: none available; no secrets or fake authenticated state used
- Requirement-linked journeys: live relative content success; encoded absolute/traversal/placeholder containment refusal; desktop and mobile renderer bootstrap; raw URI absence check on unrelated public surfaces
- Evidence: API log, server log, browser observations, screenshots, process cleanup check
- Owned resources cleaned: server, Nuxt, browser tabs, temp data directory

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| EVM-URI-API-001 | `curl` health and relative fixture route | Live server readiness and authorized workspace content response | Existing server tests are durable; fixture route is environment-specific |
| EVM-URI-API-002 | `curl` encoded absolute/traversal/placeholder paths | Server containment refusal | Existing route/path tests are durable; exact temp paths are disposable |
| EVM-URI-BROWSER-001 | Browser open `/`, DOM script, screenshot | Nuxt renderer/shell bootstrap | No stable authenticated fixture or project browser harness for URI message |
| EVM-URI-BROWSER-002 | Browser open `/mobile`, DOM script, screenshot | Remote-access pairing bootstrap only | No paired identity; not a durable URI journey |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Valid URI mounted in authenticated Event Monitor and click/Enter/Space | No authenticated agent/workspace/session fixture | Critical user journey remains unproven | Provide an approved authenticated fixture or user-run validation |
| Invalid URI inert activation with no browser/native navigation | No Event Monitor message mounted in browser | Critical safety invariant is only repository-tested | Authenticated browser journey |
| Raw URI absence from mounted sanitized HTML and no renderer read | No URI message mounted; direct tests cover sanitizer contract | Live leakage/read risk remains uncorrelated | Authenticated browser plus network/process observation |
| Valid but remote-unmapped activation | No active-workspace identity and owner runtime | Host-only/unavailable ordering remains unproven live | Authenticated remote browser/mobile fixture |
| Phone-first stale/context request and inline/no-Attach behavior | No paired phone session | Mobile lifecycle risk remains | Paired Phone Access session |
| Packaged Electron text/media and native no-navigation | No task-owned package artifact was built; shell execution is last-resort | Electron shell risk remains | Delivery/package build and controlled user verification |
| Windows URI parsing/native validation | Current host is macOS; no Windows runner | Platform-specific risk remains | Windows CI/runner or user validation |
| Full viewer matrix, repeat-open/read-only/dedupe in live Event Monitor | No authenticated conversation | Viewer owner integration not live-proven | Authenticated browser/Electron journey |
| Full browser/dev-renderer visual inspection of URI action | Target message not mounted | Visual regressions could remain | Authenticated browser or user verification |

## Ambiguities Or Reroute Triggers

None. Round 1 was blocked by missing runtime dependencies, not by a requirement/design ambiguity or implementation failure. The user has now supplied explicit successful final-test approval for round 2. No durable API/E2E tests changed.

## Investigation Decision

- Proceed To API/E2E Execution: Yes — repository, live API, and bootstrap browser execution completed
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: No
- Post-repository confidence: 95% after repository/live evidence plus explicit user final-test approval
- Broader validation decision: Required and completed through user verification
- Reroute Required Before Validation Execution: No
- Recommended Recipient If Reroute Required: N/A
- Notes: Preserve all logs, browser observations, and the final user-verification attestation. The user has now supplied the missing final-test approval; proceed to `code_reviewer` for proportional durable-test review. No durable API/E2E files changed.
