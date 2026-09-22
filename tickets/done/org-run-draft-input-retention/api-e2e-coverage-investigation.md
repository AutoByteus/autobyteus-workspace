# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/requirements-doc.md` (`SR-002`, Approved).
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/investigation-notes.md`.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/solution-revision-record.md` (`SR-003`).
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/design-spec.md`.
- Supplemental Task Artifacts: three evidence-only user screenshots indexed in `requirements-doc.md`; they are not behavior-defining supplements.
- Design Review Report: `N/A — not applicable`; architecture review was not selected for the `Medium` / `Low` direct route.
- Architecture Review Revision Record: `N/A — not applicable`.
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/implementation-handoff.md` (`IR-001`).
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/implementation-revision-record.md`.
- Code Review Report: `N/A — not applicable` for the direct low-risk route.
- Code Review Revision Record: `N/A — not applicable`.
- Delivery Revision Record: `N/A — initial validation ingress`.
- Relevant Delivery Revision IDs: `N/A`.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/api-e2e-revision-record.md`.
- Current API/E2E Revision ID: `API-REV-001`.
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/api-e2e-test-case-ledger.md`.
- Current Investigation Round: `1`.
- Trigger: Implementation Engineer direct API/E2E handoff for commit `9220a9e82044609424842e221495ebcf8d903051`.
- Prior Investigation Reviewed: `N/A — no prior API/E2E result or revision record exists`.
- Latest Authoritative Investigation: this file.

## Routing Classification

- Task size: `Medium`.
- Architectural risk: `Low`.
- Input route: `Direct Low-Risk`.
- Successful-output route: `Delivery`.
- Proportional test-code review decision: `Not Required — direct low-risk route`.

## Current Requirement And Design Basis

The approved contract is same-application-session retention of unsent text and selected context-file descriptors for new and existing standalone Agent, Agent Team member, and Agent Org member composers. Ordinary root/member/surface navigation may change presentation but must not destroy the exact run/member `AgentContext`. Drafts must remain isolated by exact root and execution identity. Async attachment completion must update only its captured owner. Successful sends, rejected sends, newer edits, stop/continuation, recovery and sent-history hydration retain their existing semantics. Successful archive/delete and application-session teardown remain authoritative release boundaries. Reload/restart persistence, TTL changes, new backend contracts, schema changes and migration are out of scope.

`SR-003` implements that contract by retaining Agent Org roots in `agentOrgContextsStore`, removing destructive release from `AgentOrgWorkspaceView` and `activeContextStore`, and cleanly renaming the full destructive store operation to `releaseContext`. Only successful run-history archive/delete cleanup invokes it in production. Existing `AgentContext` composer fields, exact context-file ownership, `publish`/`adoptLocalContexts`, submission/recovery behavior and server persistence shapes remain authoritative.

The implementation handoff's compatibility and transition checks are clean: no alias, dual path, compatibility fallback, persistence change or migration exists. Independent executable validation therefore must focus on the real renderer navigation lifecycle, exact attachment owner under delayed completion, Agent/Team parity, explicit release, and the preserved failure/recovery boundaries rather than inventing a backend migration scenario.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`; `REQ-001`, `REQ-003`; `AC-001`, `AC-002` | Changed | Approved `SR-002`; `SR-003` DS-001; `IR-001` | Directly prove root change, view unmount to another surface, and return render the exact prior text/files. |
| `BEH-002`; `REQ-002`; `AC-001`, `AC-003`, `AC-004` | Preserved across a longer lifetime | Exact identity/attachment-owner design and implementation | Prove A/X and B/Y isolation plus delayed upload completion on captured A/X after visible focus changes. |
| `BEH-003`, `BEH-006`; `REQ-004`; `AC-005`–`AC-007`, `AC-010` | Preserved | Existing submission, stop, recovery and hydration owners | Re-run valid focused lifecycle coverage; do not infer correctness only from unchanged production files. |
| `BEH-004`; `REQ-001`, `REQ-005`; `AC-009` | Preserved affirmative contract | User-approved all-run-type parity; implementation tests | Re-run new/existing Agent and Team retention tests and exercise their shared composer in Chromium. |
| `BEH-005`; `REQ-003`, `REQ-006`; `AC-008` | Changed ownership/name, preserved result | DS-003; `releaseContext`; run-history cleanup | Prove ordinary navigation never releases, successful archive/delete releases only the exact root, and failed/mismatched mutation does not. |
| Legacy `disconnect` / `disconnectAgentOrg` entry points | Removed | Design legacy-removal policy and IR-001 | Search source/tests for zero obsolete runtime/test references; no alias coverage may remain. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Backend context-file/history behavior is preserved | Existing server exact Org context-file integration coverage | Browser upload fixture alone would emulate the server | Focused real server integration regression |
| API / transport / contract | No contract change; relied upon | Existing multipart draft upload with exact Org owner | Frontend upload tests and server REST integration tests | Need to correlate browser multipart owner with captured visible context | Browser plus owned loopback REST fixture, offset by real server integration test |
| Frontend component / state | Yes | Org workspace no longer releases on root change/unmount; store release is explicit | Changed component/store tests | Unit DOM does not prove real router/unmount/composer behavior | Durable Chromium probe |
| Browser integration / user journey | Yes | Route-driven A→B→A and Org→other surface→Org | Implementation-only live Chrome feedback | No independent, isolated, repeatable durable browser journey | Durable self-starting Nuxt/Chromium probe |
| Authentication / session / permissions | No | No auth boundary changed | N/A | None | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer and shared composer used by desktop | Component/integration tests | Real DOM/file input/router lifecycle requires browser | Browser-preferred web-equivalent validation |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, package or native lifecycle change | Source/change inventory | None | None; actual desktop launch is not justified |
| Process / lifecycle | Yes | View lifetime separated from retained context lifetime; explicit release remains | Store/view/history tests | Need actual mount/unmount and delayed network completion | Browser plus lifecycle repository suites |
| Persisted-data transition | No | In-memory lifetime only; stored shapes unchanged | Design and IR-001 transition checks | None | None |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | None | N/A | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention`, branch `codex/org-run-draft-input-retention`, implementation commit `9220a9e82044609424842e221495ebcf8d903051`.
- Project type and runtime stack: pnpm workspace; Nuxt 3/Vue/Pinia/Apollo frontend with Vitest; TypeScript/Fastify backend with Vitest; Playwright Core and system Chrome for project browser probes.
- Conflicting, missing, or unclear project instructions: no `AGENTS.md` exists in or above the task worktree. `requirements-doc.md` retains stale readiness prose at its end, but its header, `SR-002` record, `SR-003` design and handoffs consistently record explicit approval; no behavior ambiguity results. Frontend typecheck tooling is not locally declared as a compatible `vue-tsc`, as recorded by IR-001.
- Required environment variables or secrets available: `N/A`; selected deterministic repository and browser checks require no provider credential or user account.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/README.md` | Workspace setup/full-stack/E2E authority | `pnpm dev` is the canonical manual full stack; deterministic E2E is isolated; frontend browser development is preferred for web-equivalent behavior. |
| `autobyteus-web/README.md` | Frontend testing and browser/desktop authority | Use `pnpm test:nuxt <paths> --run`; project has self-starting Chromium probe pattern; packaged Electron is reserved for shell-specific evidence. |
| `autobyteus-web/package.json`, `vitest.config.mts`, `nuxt.config.ts` | Executable frontend configuration | Nuxt tests use `happy-dom`; browser probe may install one temporary page, start owned Nuxt on a free loopback port, and proxy `/rest` to an owned fixture server. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | Server integration-test authority | `pnpm test --run <path>` runs Vitest and its documented `pretest -> prepare:shared` setup. |
| `autobyteus-web/tests/e2e/standalone-agent-error-stop-probe.mjs` and adjacent probes | Established durable browser-harness pattern | Discover Chrome, use free ports, record JSON/screenshots/logs, own process groups, refuse to overwrite an existing fixture page, and clean only owned resources. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Focused frontend suites | `autobyteus-web` | `pnpm test:nuxt <paths> --run` | Existing workspace dependencies; no service | Test-process exit | Automatic |
| Exact Org context-file server integration | `autobyteus-server-ts` | `pnpm test --run tests/integration/api/rest/agent-org-context-files.integration.test.ts` | Test-owned Fastify app and temporary app-data/memory tree | Vitest assertions | Test teardown closes app and removes temp root |
| Browser journey | `autobyteus-web` | `pnpm test:e2e:agent-org-draft-retention -- --output-dir ../tickets/in-progress/org-run-draft-input-retention/evidence/browser` | Owned Nuxt process, owned loopback REST fixture, temporary route, system Chrome, no user data | HTTP fixture route plus probe API/DOM | Close Chromium, REST server, Nuxt process group; remove installed page |
| Frontend typecheck | `autobyteus-web` | `pnpm exec nuxi typecheck` | Known local `vue-tsc` compatibility gap from IR-001 | Command exit | Automatic; no dependency mutation to mask environment issue |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Org A/X and Org B/Y retained contexts | Construct current-format `AgentOrgExecutionContext`/`AgentContext` values in a temporary Nuxt fixture page and insert through the real Pinia store | Synthetic IDs only; no user backend or product data | Browser/Pinia state ends with owned Nuxt process |
| New/existing standalone Agent and Team contexts | Existing central context stores plus current Team test-support builder in the fixture | Synthetic session-only state | Ends with owned Nuxt process |
| Delayed Org attachment upload | Real hidden file input and upload store; multipart sent through Nuxt proxy to owned loopback REST fixture | Fixture holds response until focus changes; records raw multipart identity without secrets | REST server closed; no bytes persisted outside retained evidence |
| Real Org owner/file contract | Existing Fastify integration test and test-owned temporary filesystem | No production/user state | Existing `afterEach` removal |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `design-spec.md` → `Persisted Data / State Transition Decision`; `implementation-handoff.md` → `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: current `AgentContext.requirement` and `contextFilePaths` are retained in memory; current server Org draft owner/locator shapes are consumed unchanged; sent projections remain server-backed.
- Evidence planned: source/diff legacy search, real existing Org context-file server integration test, repository hydration/recovery tests, and browser use of the current owner shape. No migration scenario is applicable.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/org/__tests__/AgentOrgWorkspaceView.spec.ts` | Root changes open the new root and presentation has no destructive release API | `AC-001`, `AC-002`; DS-001 | Still Valid | Reviewed changed source/test | Re-run |
| `stores/__tests__/agentOrgContextsStore.spec.ts` | A/X and B/Y text/file descriptors remain exact until explicit exact-root release | `AC-001`, `AC-003`, `AC-008`; DS-001/DS-003 | Still Valid | Reviewed added scenario | Re-run |
| `stores/__tests__/activeContextStore.spec.ts` | New/existing standalone Agent and Team drafts retain text/files across selection | `AC-009`; DS-005 | Still Valid | Reviewed added scenarios | Re-run and complement in browser |
| `services/agentOrgExecution/__tests__/agentOrgContextFiles.spec.ts` and `components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` | Exact Org owner, async captured target, failure/no-phantom behavior | `AC-004`; DS-004 | Still Valid | Existing exact-owner assertions inspected | Re-run |
| `services/agentOrgExecution/__tests__/agentOrgComposerSubmission.spec.ts` | Send clearing, failure restoration, newer edit precedence | `AC-005`, `AC-006`; DS-004 | Still Valid | Existing focused scenarios | Re-run |
| `stores/__tests__/retainedOrgActivityTermination.spec.ts` | Successful and rejected stop retain context/draft; rejected stop retires input transport and enters `reopen_required` | `AC-007`; design transport-retirement rule | Still Valid | Explicit expectation matches current source/design | Re-run |
| `components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts`, rejected-Stop cases | Retains history/selection/conversation but currently expects context phase `live` | Preserved Stop behavior; design says rejected Stop retires transport pending fresh observation | Needs Update | Base/current failure and companion termination spec show `reopen_required` is intentional; implementation changed only teardown name | Update two obsolete phase assertions/test wording; retain all navigation/history assertions |
| `stores/__tests__/runHistoryStore.spec.ts` Agent Org archive/delete matrix | Success releases only exact root; failure/mismatch retains rows and contexts | `AC-008`; DS-003 | Still Valid | Reviewed changed scenario | Re-run |
| `stores/__tests__/agentOrgRetainedRecovery.spec.ts`, `agentOrgInspectionApollo.spec.ts`, `agentOrgInspection.spec.ts`, `agentOrgStreamingService.spec.ts` | Recovery/adoption/invalidation preserves exact local owner and prevents late resurrection | `AC-002`, `AC-004`, `AC-007`, `AC-010`; DS-002 | Still Valid | Existing exact lifecycle assertions | Re-run |
| `services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts` | Sent conversation/current projection hydrates while local draft owner rules remain | `AC-010` | Still Valid | Existing hydration suite | Add to independent regression run |
| `autobyteus-server-ts/tests/integration/api/rest/agent-org-context-files.integration.test.ts` | Actual multipart upload/open/delete/finalize and exact configured/task execution owner isolation | `AC-004`, `REQ-006`; existing API contract | Still Valid | Test-owned real Fastify/filesystem boundary | Re-run as real API support evidence |
| Existing browser probes | Other feature-specific journeys only | None directly proves draft retention | Out Of Scope / insufficient | E2E inventory search found no Agent Org draft-retention journey | Add dedicated durable probe |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts` rejected-Stop cases | `expect(org.phase).toBe('live')` | Stop retires the old transport before mutation; rejection leaves last-known activity/history truth but requires fresh observation before input (`reopen_required`) | `design-spec.md` intended lifecycle/risk/guidance; `retainedOrgActivityTermination.spec.ts`; unchanged base behavior | Update expectation to `reopen_required` while retaining exact selection, conversation, history, active-row controls and no-stream-send assertions | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-E2E-003` | Chromium A/X delayed real file input upload → B/Y independent draft → A/X exact text/file return; Org unmount to other surfaces; standalone Agent and Team new/existing draft parity | `AC-001`–`AC-004`, `AC-009`; DS-001, DS-004, DS-005 | Added `autobyteus-web/tests/e2e/agent-org-draft-retention-probe.mjs`; `autobyteus-web/tests/e2e/fixtures/agent-org-draft-retention.page.vue`; named package script and README entry | No prior durable browser test crossed the actual router/view/composer/Pinia/file-input boundary; the added probe now does so in an isolated repeatable environment. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-E2E-001` | `components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts` rejected-Stop cases | Expect `reopen_required` after rejected Stop and name the preserved active navigation versus retired input transport truthfully | `REQ-004`, `AC-007`; design transport-retirement semantics | Test-only correction of baseline debt; no production change. |
| `API-E2E-003` | `autobyteus-web/package.json`, `autobyteus-web/README.md` | Add discoverable named browser probe command and scope | Project E2E convention | No product behavior change. |

## Durable Coverage To Remove

None. The stale phase assertion is corrected in place because the rest of the scenario remains valuable.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused one-shot Vitest over changed view/store/history tests, including corrected publication suite | `autobyteus-web` | Changed navigation/release boundary, Agent/Team parity, explicit cleanup | **Pass — 7 files / 88 tests** | `evidence/api-e2e-001-focused-changed-boundary.log` |
| 2 | Focused lifecycle regression Vitest over composer, context file, streaming, inspection, recovery, termination, selection and hydration suites | `autobyteus-web` | Preserved send/failure/async/stop/recovery/sent-history behavior | **Pass — 11 files / 137 tests** | `evidence/api-e2e-002-lifecycle-regression.log` |
| 3 | `pnpm test --run tests/integration/api/rest/agent-org-context-files.integration.test.ts --reporter=verbose` | `autobyteus-server-ts` | Real exact-owner multipart/filesystem API contract | **Pass — 1 file / 4 tests** | `evidence/api-e2e-004-server-org-context-files.log` |
| 4 | `pnpm test:e2e:agent-org-draft-retention -- --output-dir ../tickets/in-progress/org-run-draft-input-retention/evidence/browser` | `autobyteus-web`; owned Nuxt/REST/system Chrome | Real web-equivalent route/view/composer/file-input journey and Agent/Team parity | **Pass — five browser scenarios; error and cleanup gates passed** | `evidence/api-e2e-003-browser.log`; `evidence/browser/evidence.json`, PNGs and `nuxt.log` |
| 5 | Broader 25-file affected Vitest; both guards; harness syntax; package parse; obsolete API searches; production callsite audit; `git diff --check`; typecheck attempt | `autobyteus-web` and worktree root | Adjacent regression, durable harness validity, clean-cut removal, repository hygiene | **Pass — 25 files / 286 tests and all executable hygiene checks; typecheck unavailable before project analysis** | `evidence/api-e2e-005-broader-regression.log`; `evidence/api-e2e-006-typecheck.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — five independently meaningful cases span frontend lifecycle coverage, a real server boundary, a long-running self-starting browser journey, and tooling/guard checks.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/api-e2e-test-case-ledger.md`.
- Ledger initialized before execution: `Yes`.
- Case granularity: independently meaningful repository, API, browser or tooling scenario; not individual assertions.

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| `API-E2E-001` | Changed navigation/release and parity coverage | `AC-001`–`AC-003`, `AC-008`, `AC-009` | Frontend component/store/history Vitest | Focused changed-boundary files | 1 | Passing files/tests and stale-baseline resolution |
| `API-E2E-002` | Preserved submission, attachment, recovery, stop and hydration lifecycle | `AC-004`–`AC-007`, `AC-010` | Frontend integration/lifecycle Vitest | Focused existing lifecycle suites | 2 | Passing files/tests; expected negative-path logs classified |
| `API-E2E-004` | Exact Org context-file REST/filesystem contract | `AC-004`, `REQ-006` | Real Fastify integration test | Server single-file Vitest | 3 | Passing API/file lifecycle and owned cleanup |
| `API-E2E-003` | Browser draft retention/isolation/upload/parity journey | `AC-001`–`AC-004`, `AC-009` | Nuxt/Chromium/loopback REST | Durable named probe | 4 | Semantic DOM/store/request evidence, screenshots, logs, cleanup |
| `API-E2E-005` | Broader affected regression and repository/tooling checks | `QR-003`, `QR-004`; all ACs support | Frontend repository / CLI | Broader Vitest, guards, syntax, search, diff, typecheck attempt | 5 | Passing regressions/guards or truthful environment limitation |

## Post-Repository Confidence Scorecard

The scores below deliberately exclude the browser result and express the evidence state after the focused/broader repository and real Fastify integration cases. Although the final broader affected aggregate was executed after the browser probe, no browser evidence is credited here.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | 88 changed-boundary, 137 lifecycle and 286 broader affected frontend tests plus 4 actual Fastify/filesystem tests passed; every AC has direct repository evidence | Real route/unmount/file-input timing had not yet been exercised in a browser | Run the planned Chromium journey |
| Changed-boundary execution directness | 96% | Direct production component/store/history tests cover ordinary navigation versus explicit release | Browser DOM integration still absent at this stage | Run the production-view/shared-composer probe |
| Cross-boundary integration realism and mock gap | 90% | Actual Fastify multipart/filesystem owner lifecycle passed independently | Frontend and server evidence remained separated; browser-side network was not yet observed | Correlate a real browser multipart request with the exact retained owner |
| Environment, configuration, identity, and fixture fidelity | 90% | Current-format identities, real Pinia/component implementations and real server temporary filesystem were exercised | No independent browser viewport/router runtime yet | Run isolated Nuxt/system Chrome with deterministic identities |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Rejection, newer edits, delayed upload, stop, recovery, hydration, invalid owner, partial batch and mutation-failure cases all passed | Provider-backed execution remains intentionally out of scope | Browser error gate provides final user-surface support |
| User-surface, browser, and desktop-shell confidence | 80% | Component rendering was covered; Electron-only shell boundary is inapplicable | No real browser DOM/file input/router/unmount execution yet | Run Chrome; do not launch Electron because no shell boundary changed |
| Durable regression coverage quality and relevance | 97% | Stale rejected-Stop assertion was corrected against approved semantics; durable named browser coverage was added and syntax-checked | New probe had not yet been executed for this pre-browser score | Execute the named probe and inspect evidence/screenshots |

- Overall post-repository confidence: `92%` (`644 / 7`, rounded to the nearest whole percent).
- Calculation method: simple average of the seven applicable categories; desktop-shell uncertainty is excluded only because no shell boundary changed, while browser renderer confidence remains applicable.
- Every critical acceptance criterion directly proven: `No at the repository-only checkpoint` — the route/unmount/browser file-input timing required broader validation.
- Any applicable category below `90%`: `Yes — user-surface, browser, and desktop-shell confidence at 80%`.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: real browser route/unmount/file-input timing remained unproven. The frontend typecheck command also remained unavailable because no compatible local `vue-tsc` exists, but directly executable tests and guards covered the changed TypeScript/runtime boundaries.

## Broader Validation Decision

- Decision: `Required`; completed with `Pass`.
- Selected execution mode: `Browser`, supported by a focused real API integration regression.
- Specific confidence gap or residual risk addressed: the production change is route/view lifecycle behavior and async file-input ownership; unit tests alone mock the DOM/router/network timing that caused the user-visible loss.
- Why the selected mode can materially improve confidence: a self-starting browser journey can mount the production Org view and shared composer, change real Vue routes, unmount/remount the view, submit a real browser `File` through the current upload store, delay its multipart response until another owner is visible, and observe exact text/file DOM plus store identity on return.
- Expected confidence after selected validation: at least `95%` overall with no category below `90%` if every critical criterion and cleanup check passes. Actual final confidence: `98%`, with no category below `96%`.
- Browser-specific decision and rationale: required because the changed boundary is web-equivalent renderer navigation. Actual Electron execution is unnecessary because no shell-specific boundary changed.
- If `Not Required`: N/A.
- If `Blocked`: N/A; execution completed.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Relevant README or development instructions: root README `Packaged Electron API/E2E testing` and `Local full-stack development`; `autobyteus-web/README.md` `Packaged Electron E2E Launches`.
- Web-equivalent behavior: workspace route changes, component mount/unmount, Pinia context retention, shared composer text/files and HTTP upload.
- Shell-specific or lifecycle behavior: no preload, IPC, native window, packaging, updater or embedded-server lifecycle changed.
- Chosen validation approach and why it fits the project: isolated Nuxt/Chrome is the documented preferred surface and directly exercises the changed renderer boundary.
- Server/frontend setup when browser validation is used: owned loopback REST fixture behind the Nuxt dev proxy plus synthetic in-page current-format contexts; real server owner semantics separately exercised by existing Fastify integration coverage.
- Effect on any already-running desktop application: `None`; no product process, default port or user data is reused.
- Behavior not directly proven and confidence consequence: Electron-only shell behavior is inapplicable, so it does not reduce confidence.

## Live Environment And Fixture Plan

- Startup order and commands: install one temporary page from a durable fixture; start owned REST fixture on a free loopback port; start owned Nuxt dev server on another free port with `BACKEND_NODE_BASE_URL`; wait for fixture route; launch system Chrome through Playwright Core.
- Environment choices that materially affect the run: `en-US`, light color scheme, desktop viewport; current worktree source; no provider credentials; no user backend.
- Health / readiness checks: REST `/rest/health`, Nuxt route HTTP 200, fixture `window` probe API and composer DOM visible.
- Seed data / fixtures: two historical configured Org roots with exact direct-agent identities, two standalone Agent contexts (new/existing), two Team contexts (new/existing), all current in-memory shapes.
- Test identities, authentication, permissions, or session state: synthetic local identities only; browser mode has no auth requirement for the owned fixture.
- Requirement-linked journeys or scenarios: A/X type and delayed upload → B/Y distinct type → complete upload → A/X exact return; A/X → non-Org surface → A/X; new/existing Agent and Team switch/return; exact owner snapshots and no leakage.
- DOM, screenshot, log, API, process, or other evidence to capture: textarea values, visible file labels/count, exposed exact store snapshot, multipart owner/body, request count/order, browser console/page/request errors, desktop/narrow screenshots, Nuxt log, cleanup state.
- Owned processes and temporary state to clean up: Chromium context/browser, Nuxt process group, REST server/connections, installed fixture page, temporary upload bytes held only in memory.
- Execution outcome: completed exactly through the named durable probe; all five journeys passed, browser error arrays were empty, evidence/screenshots were retained, and every owned process/fixture cleanup gate passed.

## Temporary Executable Validation Plan

None. The selected browser journey is durable repository coverage because the regression is a stable supported user flow and the project already maintains durable self-starting browser probes.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Cross-application-restart draft persistence | Explicitly out of scope | None for approved scope | Separate approved feature if desired |
| More than 24-hour draft-file survival | Existing TTL intentionally unchanged/out of scope | Expired backing bytes remain unavailable as approved | None |
| Electron shell/native lifecycle | No shell boundary changed; browser proves the same renderer | Negligible | None unless later evidence identifies shell coupling |
| Provider-backed message execution | Send transport/provider behavior unchanged and deterministic focused lifecycle tests cover admission/recovery | Provider nondeterminism would add little evidence | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Two rejected-Stop phase assertions conflicted with intentional unchanged transport-retirement behavior | `Local Fix` owned and resolved by API/E2E test coverage | Base/current failure, design guidance, companion termination test; corrected suite now 6/6 and focused aggregate 88/88 | Resolved locally; no production or design reroute |
| Frontend typecheck lacks compatible local `vue-tsc` | Non-critical environment/tooling limitation, reproduced | `CI=1 pnpm exec nuxi typecheck` fails before project analysis with `ERR_PACKAGE_PATH_NOT_EXPORTED`; all directly executable tests/guards passed | Recorded in execution report; no unapproved dependency-policy change and no blocker to critical evidence |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add one durable browser probe/fixture/entry point/docs and update one stale rejected-Stop assertion; remove none.
- Post-repository confidence: `92%`; browser category `80%`, so broader validation was mandatory.
- Broader validation decision: `Required — durable browser plus real server API regression`; completed with `Pass`, producing `98%` final confidence.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: `N/A`.
- Notes: architecture/source review artifacts are correctly `N/A`; design remains required and was fully reviewed. No requirement or design gap was found. Every approved critical acceptance criterion now has direct evidence; the only recorded limitation is the non-executing frontend typecheck toolchain, not an observed product failure.
