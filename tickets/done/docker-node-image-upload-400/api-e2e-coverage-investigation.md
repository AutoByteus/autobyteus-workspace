# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/docker-node-runtime-evidence.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/api-e2e-revision-record.md` (to be created after round 1 completes)
- Current API/E2E Revision ID: `N/A`
- Current Investigation Round: `1`
- Trigger: `CRR-002` clean implementation re-review Pass plus the user's 2026-08-27 direction to start only the branch frontend, connect it to the currently running Electron-owned server, and use the real `Nested Classroom Test Team`.
- Prior Investigation Reviewed: `N/A — no prior canonical API/E2E investigation exists.`
- Latest Authoritative Investigation: `This file`

## Current Requirement And Design Basis

The proof target is the reviewed compound-identity correction in the web Team send path. A focused Agent execution must resolve to its canonical rooted member address and exact containing TeamRun ID. Browser-staged attachments continue to use root/draft scope, while final `team_member_final` ownership must use the containing TeamRun. The server must keep exact resolution and must reject root-plus-nested or otherwise mismatched pairs. Direct-root uploaded-file sends and nested text-only sends must remain successful. The returned final locator must be readable and must resolve to the exact AgentRun's nested memory directory. Missing frontend placement must fail before finalization or dispatch. No backend fallback, Docker branch, schema change, data rewrite, or migration is allowed.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean and its `Persisted Data Transition Check` is `Not Affected`. Code review `CRR-002` passes the production implementation and the corrected V2 test fixture at `9.7/10`; its explicit residual gap is the real browser/API upload-finalize-read-dispatch spine.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-002`, `REQ-001`, `REQ-003`, `AC-001`, `AC-003` — nested browser send owner | Changed | Requirements, design DS-001, implementation handoff, CRR-002 | Preserve the focused mocked store assertion, then prove the real browser POST carries the nested TeamRun plus `/StudentStudyGroup/student_one` and returns 200 rather than the reproduced 400. |
| `BEH-004`, `AC-004` — exact server resolution/read/storage | Preserved contract, corrected caller | Requirements and current server integration coverage | Execute the current server API integration suite and live-read the browser-finalized locator; correlate its stored file with the exact nested AgentRun memory path. |
| `BEH-001`, `REQ-002`, `AC-002`, `AC-006` — direct-root upload | Preserved | Requirements and implementation trace | Run the same live browser flow against `/Teacher`; final owner must naturally use the root TeamRun and dispatch to the direct-root AgentRun. |
| `BEH-003`, `REQ-002`, `AC-002` — nested text only | Preserved | Requirements and implementation trace | Send text only to a configured AgentRun in the same nested Team and prove no finalize request occurs while an exact Team WebSocket command is dispatched. |
| `REQ-005`, `AC-005` — no guessing | Preserved/strengthened | Requirements, store fail-closed test, server exact-match test | Rerun missing-location and mismatched-pair coverage; issue one live deliberate root-plus-nested finalize request and require HTTP 400 without a Team command. |
| `REQ-004`, `REQ-006`, `AC-007` — node/data behavior | Preserved | Requirements and `Not Affected` decision | Use the user-authorized running Electron server without stopping it; create only one test-owned Team run and one failed draft, then terminate/delete that run and delete the draft. Do not alter definitions or unrelated runs/files. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Server exact resolver remains unchanged | Current REST integration nested/direct/standalone/mismatch scenarios | None for source; live server version is independently exercised as the real contract peer | Live API within browser journey |
| API / transport / contract | Yes | Web caller's `team_member_final.teamRunId` meaning at REST finalization | Store assertion plus server integration route assertions | Mocked web finalization does not prove the actual JSON request, proxy, server acceptance, returned locator, or bytes | Browser + Live API |
| Frontend component / state | Yes | Execution-tree projection/view query and Team send orchestration | Team execution-view and Team store specs | Real hydration/focus/UI upload state could still supply a different target | Browser |
| Browser integration / user journey | Yes | File input -> draft upload -> Team send -> finalize -> WebSocket command | No existing durable full browser journey for this exact flow | Upload/FormData, Nuxt proxy, current backend, UI focus, network ordering, and WebSocket framing | Browser |
| Authentication / session / permissions | No material new policy | Current local Electron server is loopback and existing local product identity applies | Existing product/server behavior | No ticket-specific auth boundary; browser connects to the current user-authorized loopback node | Browser against current loopback server |
| Desktop renderer / web-equivalent UI | Yes | Electron renderer-equivalent Nuxt UI send behavior | Nuxt/store specs and production build | Actual browser APIs and renderer-equivalent cross-boundary behavior | Browser-preferred per skill and user direction |
| Desktop shell / Electron-specific integration | No | No IPC, preload, window, package, or lifecycle source changed | N/A | None material | None; do not disturb running Electron app |
| Process / lifecycle | Yes, validation only | Frontend process plus already-running Electron backend; test-owned Team run cleanup | Documented dev start and GraphQL lifecycle APIs | Incorrect ownership/cleanup could disturb user state | Browser + explicit test-owned run lifecycle |
| Persisted-data transition | No | Approved `Not Affected`; only test-owned runtime artifacts are created | Existing current readers and unchanged storage | Must prove no unrelated data rewrite/delete | Live read + scoped cleanup evidence |
| Worker / queue / distributed coordination | No | Team WebSocket command targets one active nested AgentRun | Store/stream suites | No distributed/node coordination change | Observe real WebSocket frame/server events only |
| External integration | No production integration change | Model runtime may execute after dispatch but is not the corrected boundary | Existing runtime infrastructure | Provider completion is supporting evidence, not required to prove dispatch identity | Use configured current runtime without treating provider output as owner-contract proof |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue/Pinia frontend, Playwright Core browser probes, Fastify/GraphQL/REST/WebSocket TypeScript server, current packaged Electron node running separately.
- Conflicting, missing, or unclear project instructions: root `pnpm dev` is documented but fixed ports 3000/8000 are occupied and the user explicitly selected frontend-only execution against the Electron backend. The safe equivalent is `pnpm --dir autobyteus-web dev --host 127.0.0.1 --port <owned-free-port>` with all backend HTTP/WS endpoints set to `127.0.0.1:29695`.
- Required environment variables or secrets available: `Yes` — no secret values are copied; the current Electron server already owns configured runtime identity/provider state.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-web/AGENTS.md` | Web testing authority | Use `pnpm test:nuxt ... --run`; do not use watch mode. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-server-ts/AGENTS.md` | Server testing authority | Use `vitest run ... --no-watch` for focused server coverage. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-web/README.md` | Browser/Electron execution | Browser dev uses `pnpm dev`; browser probes use Chrome/Chromium through Playwright Core; prefer web-equivalent validation before actual desktop execution. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-server-ts/README.md` | Real stack and deterministic test rules | Current local backend/frontend is the normal development boundary; deterministic tests use test runtime. User direction supersedes fixed-port full-stack launch for this run. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-web/nuxt.config.ts` | Runtime endpoints/proxy | `BACKEND_NODE_BASE_URL` drives `/graphql` and `/rest` proxy; explicit WS endpoints target the same backend. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-web/package.json` | Scripts/runtime | `test:nuxt`, `build`, and Playwright Core are present; no durable browser suite targets Team context-file finalization. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-server-ts/vitest.config.ts` | Server test configuration | Tests use fork pool, no file parallelism, Prisma test setup, and `tests/**/*.test.ts`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400/autobyteus-web/services/workspace/workspaceNavigationService.ts` | Browser deep-link setup | `/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=<root>&workspaceExecutionAgentRunId=<agent>` opens and focuses an exact Team AgentRun. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Current Electron backend | Existing external process; no cwd ownership | Already running as PID observed under `/Applications/AutoByteus.app/.../server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data` | User-owned; do not stop/restart. Health was 200 during discovery. | `GET http://127.0.0.1:29695/rest/health` | None; never signal it |
| Branch frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695` plus explicit backend WS endpoints, then `pnpm dev --host 127.0.0.1 --port <owned-free-port>` | Use a free loopback port, separate from occupied 3000; current worktree code | HTTP 200 at owned frontend URL | SIGTERM/SIGKILL only the spawned process group, then confirm owned port free |
| Browser | ticket-owned temporary probe | Playwright Core with `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | Fresh temporary profile/context; no actual Electron UI manipulation | `/workspace` DOM and deep-link focus ready | Close page/context/browser; remove temp profile |
| Current Electron Team runtime | Current backend | GraphQL create/terminate/delete for one test-owned run | Definition `nested-classroom-test`; configured `/Teacher` and nested `/StudentStudyGroup/student_one`, `/student_two` | `getTeamRunResumeConfig` returns V2 tree and exact AgentRun/TeamRun IDs | Terminate then `deleteStoredTeamRun`; verify run no longer readable/listed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Hierarchical Team | Existing `nested-classroom-test` / `Nested Classroom Test Team` definition queried read-only from current server | Do not modify definition or old runs | Definition retained unchanged |
| Test Team run | `createAgentTeamRun` with current supported launch configs for `/`, `/StudentStudyGroup`, and their configured Agents | Prefix browser messages with unique `API-E2E docker-node-image-upload-400` token; record new run ID before mutation | Terminate and delete only that exact run |
| Supported image | Deterministic small PNG generated under ticket evidence directory | Unique filename; no user file reused | Retain evidence input copy in ticket; server copy removed with owned run |
| Negative mismatched draft | REST `/context-files/upload` with owned run/member draft identity, then finalize with root TeamRun + nested address | Must remain separate from positive browser file | Delete by returned draft locator after expected 400 |
| Browser identity/session | Fresh Playwright context | Does not reuse Electron Chromium profile/localStorage | Context/profile deleted |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` -> `Persisted Data / State Transition Decision`; `implementation-handoff.md` -> `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: existing Team definitions, prior runs, execution trees, and finalized files must remain untouched; a newly created V2 Team run must use the normal current reader/resolver.
- Evidence planned: record pre-run identity of the existing definition; prove the new run's V2 tree is read normally; prove browser-finalized bytes are readable at the exact nested memory path; terminate/delete only the owned run and verify old sampled paths remain present/readable by metadata query.
- Migration-specific completion/recovery scenarios: `N/A — no migration is approved or implemented.`
- Upstream ambiguity or reroute required: `None`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` — nested uploaded-file owner | Exact `build-run` containing TeamRun, rooted `/BuildSquad/review_lead`, root dedupe/history scope, exact AgentRun dispatch | BEH-001–004; REQ-001–005; AC-001–003, AC-005 | Still Valid | Added by implementation, corrected design boundary, passed code review | Rerun directly; no API/E2E-owned edit planned |
| Same file — missing canonical location | Reject before finalization, local admission, or dispatch | REQ-005; AC-005 | Still Valid | Direct fail-closed assertion | Rerun directly |
| Same file — existing exact focused persistent and restore/text paths | Preserved send target and root scope | REQ-002; AC-002 | Still Valid | Existing store coverage | Include dependent rerun |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | Exact root, configured nested, direct task-Agent, task-Team, nested task-Team and settled location projection; atomic rejection | REQ-001, REQ-005; UC-002 | Still Valid | `IR-002` corrects the V2 discriminator and CRR-002 passed | Rerun directly |
| `autobyteus-web/stores/__tests__/contextFileUploadStore.spec.ts` | Upload/finalize transport payload and attachment replacement | DS-001 API transport | Still Valid | Current owner descriptors and REST paths | Rerun as transport dependency |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Focused Team composer sends current member text | BEH-003; AC-002 | Still Valid | Component integration at UI/store boundary | Rerun; live browser closes mock gap |
| `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts` — standalone/direct/nested/mismatch | Current owner descriptors, exact containing-Team resolution, final read/storage, mismatch 400, standalone preservation | AC-003–006 | Still Valid | Direct Fastify route plus filesystem evidence; cited upstream | Rerun focused server integration |
| `autobyteus-server-ts/tests/unit/context-files/context-file-owner-resolver.test.ts` and location service coverage | Resolver uses exact containing TeamRun/address | BEH-004; AC-004–005 | Still Valid | Current contract fields | Include focused server selection if needed after integration |
| `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts` live LM Studio direct-root scenario | Backend-only external-provider context delivery | Direct-root/standalone runtime, not frontend containing-Team choice | Out Of Scope | Conditional external-provider suite does not cover the changed frontend boundary or nested owner selection; the current deterministic integration suite and this round's user-selected browser/current-server run provide the relevant evidence | Do not edit or rely on it in this frontend-only ticket; record any pre-existing maintenance concern separately, not as ticket behavior |
| Generic browser probes under `autobyteus-web/tests/e2e/` | Other responsive/renderer journeys | None for Team attachment owner selection | Out Of Scope | No relevant Team context-file scenario | Use a ticket-scoped temporary Playwright journey; do not broaden generic probes |

## Stale Or Obsolete Coverage Decisions

None in the changed frontend coverage. No relevant durable test asserts that the root TeamRun is always the final owner. Pre-existing backend-only conditional runtime artifacts outside this frontend boundary are not used as evidence and are not edited in this ticket.

## Durable Coverage To Add

None. The implementation already added durable, focused coverage at the owning execution-view and Team send orchestration boundaries. The remaining gap is environment-specific cross-boundary realism against the user-selected current Electron server; a ticket-scoped Playwright/API probe is more proportional than adding a persistent browser harness for one existing server profile/definition.

## Durable Coverage To Update

None planned in API/E2E round 1.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --filter ./autobyteus-web test:nuxt services/teamExecution/__tests__/teamExecutionViewState.spec.ts stores/__tests__/agentTeamRunStore.spec.ts --run` | worktree root | Exact containing-Team projection, nested final-owner request, root scope, missing location | Pass — 2 files / 30 tests | `tickets/done/docker-node-image-upload-400/test-results/api-e2e/logs/01-focused-web.log` |
| 2 | `pnpm --filter ./autobyteus-web test:nuxt stores/__tests__/contextFileUploadStore.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts --run` | worktree root | Upload/finalize transport and focused Team composer/text integration | Pass — 2 files / 4 tests | `tickets/done/docker-node-image-upload-400/test-results/api-e2e/logs/02-web-transport-composer.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/rest/context-files.integration.test.ts tests/unit/context-files/context-file-owner-resolver.test.ts --no-watch` | worktree root | Current standalone/direct/nested exact resolver, final read/storage, mismatch rejection | Pass — 2 files / 9 tests | `tickets/done/docker-node-image-upload-400/test-results/api-e2e/logs/03-server-context-files.log` |
| 4 | `pnpm --filter ./autobyteus-web test:nuxt services/teamExecution/__tests__/teamExecutionViewState.spec.ts stores/__tests__/agentTeamRunStore.spec.ts services/runHydration/__tests__/teamRunContextHydrationService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.execution-address.spec.ts --run` | worktree root | Dependent Team hydration/streaming regression matrix | Pass — 5 files / 59 tests | `tickets/done/docker-node-image-upload-400/test-results/api-e2e/logs/04-dependent-web.log` |
| 5 | `pnpm --filter @autobyteus/application-sdk-contracts build && pnpm --filter ./autobyteus-web build` | worktree root | Production Nuxt compilation/bundling of changed web path | Pass — Nuxt production client/static build complete; generated SDK `dist` removed afterward | `tickets/done/docker-node-image-upload-400/test-results/api-e2e/logs/05-web-build.log` |
| 6 | `git diff --check` | worktree root | Patch hygiene | Pass | `tickets/done/docker-node-image-upload-400/test-results/api-e2e/logs/06-git-diff-check.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Focused web 30/30, transport/composer 4/4, current server contract 9/9, dependent Team matrix 59/59, and production build all pass. Missing-location, mismatched-owner, direct-root, nested, standalone, hydration, and stream behaviors have relevant durable evidence. | Critical AC-001/003/004 still cross only mocked halves in repository execution. | Execute the real browser/API nested flow. |
| Changed-boundary execution directness | 90% | The owning view and send-store assertions directly inspect `containingTeamRunId`, rooted address, final owner, and exact AgentRun dispatch. | `finalizeDraftAttachments` and Team stream transport are mocked at the changed call site. | Capture the browser's actual finalize body and WebSocket frame. |
| Cross-boundary integration realism and mock gap | 82% | The real Fastify REST/filesystem boundary passes independently, and Team transport/hydration suites pass. | No single repository test connects current branch UI through upload/finalize/read/dispatch against a running server. | Required browser + live API run. |
| Environment, configuration, identity, and fixture fidelity | 75% | Locked dependencies, Nuxt production build, and test-owned Fastify filesystem fixtures are valid. | The requested current Electron server, installed nested Team definition, actual V2 run identities, configured runtime, and browser have not yet been exercised together. | Run the user-selected current server and `Nested Classroom Test Team`. |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Missing location rejects before admission/finalize/dispatch; server rejects basename, sibling, and root-plus-nested identities; stream gap/snapshot recovery suites pass. | Live server mismatch response and cleanup lifecycle remain unobserved. | Execute expected 400 and owned-run cleanup. |
| User-surface, browser, and desktop-shell confidence | 75% | Composer integration passes and no visual/shell source changed. Browser is the correct renderer-equivalent surface. | No real file input, preview/upload state, request ordering, or live focus/dispatch evidence yet. | Playwright browser journey; no actual desktop window needed. |
| Durable regression coverage quality and relevance | 96% | Focused owning-boundary tests are deterministic, requirement-linked, and passed code review and API/E2E rerun; server strictness coverage remains current. | There is no durable full browser journey, but the narrower deterministic coverage is proportionate. | Temporary live journey closes realism rather than duplicating owner assertions. |

- Overall post-repository confidence: `85.7%`
- Calculation method: simple average of the seven applicable scores: `(90 + 90 + 82 + 75 + 92 + 75 + 96) / 7`.
- Every critical acceptance criterion directly proven: `No — AC-001/AC-003/AC-004 still need the connected live browser path.`
- Any applicable category below `90%`: `Yes — cross-boundary realism (82%), environment/fixture fidelity (75%), and browser confidence (75%).`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: actual browser request identity, current server acceptance/read/storage, current V2 hierarchy hydration/focus, exact Team WebSocket frame, and scoped cleanup.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser + Live API`
- Specific confidence gap or residual risk addressed: mocked web finalization/dispatch and lack of proof that the current hydrated nested Team UI emits the containing TeamRun identity accepted by the real server.
- Why the selected mode can materially improve confidence: it crosses the actual browser file-input, Nuxt proxy, REST upload/finalize, persisted file, read route, and Team WebSocket command boundaries using the user's current Electron node and requested hierarchy.
- Expected confidence after the selected validation: `>=95% overall with no category below 90%, if all journeys and cleanup pass.`
- Browser-specific decision and rationale: required; the defect occurred only in the browser attachment path, and the Electron behavior is web-equivalent renderer/client-server behavior. Actual desktop interaction would add risk without shell-specific evidence gain.
- If Not Required: `N/A`
- If Blocked: `N/A`

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron, but changed code is Nuxt/Pinia renderer-equivalent logic only.
- Relevant README or development instructions: `autobyteus-web/README.md` browser development and packaged Electron E2E sections.
- Web-equivalent behavior: Team focus, browser upload, REST finalization/read, Team WebSocket dispatch.
- Shell-specific or lifecycle behavior: none changed; Electron's already-running server is only the backend selected by the user.
- Chosen validation approach and why it fits the project: local branch frontend in Chrome via Playwright, connected to current Electron server at `127.0.0.1:29695`.
- Server/frontend setup when browser validation is used: keep current server untouched; start one owned frontend on a free loopback port.
- Effect on any already-running desktop application: no window automation, restart, signal, port change, or profile reuse; one API-created test Team run exists only during validation.
- Behavior not directly proven and confidence consequence: Electron preload/window/package behavior is not tested because it is not affected; no confidence deduction for the approved scope.

## Live Environment And Fixture Plan

- Startup order and commands: verify Electron server health; create owned output/fixture; create one test Team run using existing `nested-classroom-test`; start branch frontend with backend/WS environment targeting 29695; launch Chrome.
- Environment choices: user-owned Electron backend; owned loopback frontend port; fresh browser context; current Team launch configurations copied semantically into a new test run without changing definitions.
- Health / readiness checks: server `/rest/health` 200; frontend root 200; `getTeamRunResumeConfig` V2 tree; focused textarea and file input enabled.
- Seed data / fixtures: one uniquely identified test run and one deterministic PNG; a second draft is used only for mismatch rejection.
- Test identities/session: current local product session/provider configuration; no secrets recorded.
- Requirement-linked journeys:
  - `SCN-API-E2E-001`: nested `/StudentStudyGroup/student_one` browser PNG + text -> upload 200 -> final owner child TeamRun/address -> finalize 200 -> readable bytes -> nested memory path -> exact AgentRun Team WS command.
  - `SCN-API-E2E-002`: nested `/StudentStudyGroup/student_two` text-only -> no finalize -> exact AgentRun Team WS command. The sibling nested Agent isolates transport proof from the image recipient's live model-turn duration while retaining the same containing TeamRun boundary.
  - `SCN-API-E2E-003`: direct-root `/Teacher` browser PNG + text -> final owner root TeamRun/address -> readable bytes -> exact Teacher AgentRun Team WS command.
  - `SCN-API-E2E-004`: direct API root TeamRun + nested address mismatch -> 400; no browser/Team command.
  - `SCN-API-E2E-005`: lifecycle/non-destructive check -> only owned run/draft removed; sampled existing definition and old run remain queryable.
- Evidence to capture: request/response JSON metadata, WebSocket sent frames, locator byte hashes, resolved filesystem paths, DOM state, screenshots, frontend log, backend test-token log excerpts if available, GraphQL run/tree IDs, cleanup results.
- Owned processes and temporary state to clean up: frontend process group, Chrome/context/profile, test Team run, failed draft, temporary probe script/profile. Retain ticket evidence only.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `SCN-API-E2E-001`–`005` | Ticket-scoped Playwright/API orchestrator using current Electron server and exact existing Team definition | Real requested system boundary and cleanup | Bound to user-selected live node/profile, current configured models, and a specific installed Team fixture; durable regression already exists at deterministic owning boundaries |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual Electron shell/preload/package journey | No changed shell code; browser directly proves the applicable renderer/server boundary and avoids disturbing the running app | Negligible for scope | None |
| All dynamic task execution shapes through live browser uploads | Durable location tests directly cover direct task Agent, task Team, nested task-Team member, and nested task Agent; creating every live topology would add unrelated model/task nondeterminism | Bounded | Retain focused durable coverage; no ticket blocker |
| External-provider semantic image understanding | Owner/finalize/read/dispatch, not model correctness, is the acceptance boundary | None for bug fix | Provider response may be recorded only as supporting evidence |

## Ambiguities Or Reroute Triggers

None currently.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `85.7%`
- Broader validation decision: `Required — Browser + Live API against current Electron server and Nested Classroom Test Team`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: This investigation was written before any API/E2E-owned durable test edit or final execution. Discovery used only read-only health/GraphQL/process inspection. The running Electron server is user-owned and must not be stopped.

## Post-Execution Reconciliation

- Final execution status: `Pass` (see `api-e2e-execution-coverage-report.md`, `API-REV-001`).
- Durable coverage decisions changed after investigation: `No`. No repository-resident test was added, updated, or removed by API/E2E.
- Planned mode followed: `Yes — Browser + Live API` using the branch frontend, current Electron-owned backend on port `29695`, and the exact `Nested Classroom Test Team` definition.
- Material scenario adjustment: `SCN-API-E2E-002` used sibling nested Agent `/StudentStudyGroup/student_two`, rather than waiting for `/student_one`, after a preliminary probe demonstrated that the live model turn for the nested image recipient could remain busy beyond 300 seconds. This removed an external model-completion dependency without changing the text-only transport boundary: the same child TeamRun, canonical nested address, focused browser composer, zero finalize requests, exact AgentRun WebSocket frame, and DOM echo were directly observed.
- Preliminary probe corrections: two strict Playwright selector ambiguities were corrected in the temporary harness; a third preliminary attempt proved nested image success but was stopped by the above live-model busy condition. Every preliminary test TeamRun and owned frontend was terminated/deleted/stopped before the final run. These were execution-scaffolding corrections, not product failures or completed validation rounds. Evidence is retained under `test-results/api-e2e/browser/browser-results-attempt-*` and `test-results/api-e2e/logs/07[a-c]-*`.
- Final live result: nested image, nested text-only, direct-root image, deliberate mismatch rejection, cleanup, existing-run preservation, and browser visual inspection all passed.
