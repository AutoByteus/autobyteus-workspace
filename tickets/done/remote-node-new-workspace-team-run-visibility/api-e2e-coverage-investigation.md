# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/ui-ux-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/solution-revision-record.md` (`SR-001`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/implementation-revision-record.md` (`IR-001`, `IR-002`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/code-review-revision-record.md` (`CRR-001`, `CRR-002`)
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/api-e2e-revision-record.md` (`API-REV-001`)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` source-review round 2 pass, `CRR-002`, at implementation commit `2950019a34eada253a888b9568c1b34284f0c74d`.
- Prior Investigation Reviewed: `N/A`; no prior API/E2E investigation or result exists.
- Latest Authoritative Investigation: This file, round 1, updated after completed broader browser/live-node execution. The canonical execution report records the final result.

## Current Requirement And Design Basis

The approved bug fix must make one complete workspace-selection state authoritative for both rendering and launch. In the exact remote-node sequence—Software Engineering Team, Codex App Server, GPT-5.6-Sol, New, `/home/autobyteus/workspace/autobyteus-workspace`, then a settled same-draft edit such as global auto-approve—Run Team must issue one bound-node workspace-registration request, use the returned canonical identity, create one TeamRun under that root, select/reveal the Team in the workspace tree, and retain it through history refresh/reload. Runtime, model, LLM config/thinking/reasoning/fast mode, global auto-approve, member overrides, and panel disclosure changes may not alter the visible or launch workspace state. Explicit Existing/Temp selection, real draft/selected-run transitions, invalid/empty New state, Agent behavior, read-only/pending behavior, local-node behavior, and explicit removal remain preserved.

The reviewed design makes `RunConfigPanel` the sole transient owner, turns `WorkspaceSelector` into a controlled surface, keys lifecycle reset to selected subject, Team `draftId`, or Agent buffer identity, and reuses the unchanged bound-node `CreateWorkspace`, Team create/hydration, history, and tree owners. `IR-002` additionally gives explicit user interaction precedence over delayed initial workspace discovery. Code review round 2 passed with no open finding. General post-Team-create reconciliation is explicitly outside this ticket.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / controlled workspace state across same-draft edits | Changed | FR-001, FR-002, FR-004; AC-001–AC-003, AC-005; DS-001/DS-003; `IR-001` | Recheck component regressions for every immutable Team edit class, and execute the exact browser ordering against the real bound node. |
| BEH-002 / New registration and no hidden fallback | Changed | FR-003, FR-005, FR-007; AC-001, AC-004, AC-007; DS-001/DS-004/DS-005 | Directly observe GraphQL operation counts/destinations, TeamRun root, and the invalid-path no-create/no-fallback branch. |
| BEH-003 / previously successful control ordering and tree/history visibility | Preserved | FR-002, FR-003, FR-006; AC-006; successful investigation controls | Re-run the control ordering and verify live tree plus post-reload persistence. |
| BEH-004 / context transitions and delayed initialization | Changed | FR-004; AC-003, AC-005, AC-009; `IR-002`, `CR-F-001` resolution | Re-run stable-context/draft/hydration coverage and independently probe delayed workspace discovery plus explicit New selection. |
| Existing/Temp, Agent, read-only, pending, local, removal | Preserved | AC-008, AC-009; UI/UX spec; design review residual-risk inventory | Retain and execute focused preserved-behavior suites; live Explicit Existing/Temp or removal is only added if needed after repository confidence. |
| Backend/workspace registry/Team history/tree contracts | Preserved | Scope guardrail; DS-001/DS-002; no backend diff | Use live behavior as integration evidence; do not add backend changes or compatibility coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None; backend owners are reused unchanged | Existing server workspace/Team/history suites and prior live controls | Backend can still reveal whether frontend supplied the intended identity | Live API correlation only |
| API / transport / contract | Indirectly | Frontend decides whether/when existing `CreateWorkspace` precedes `CreateAgentTeamRun` | `RunConfigPanel.spec.ts` mocks store/API owners and checks call order/count | Mocks do not prove actual GraphQL routing, canonical ID, or Team root | Browser plus live GraphQL/API observation |
| Frontend component / state | Yes | Controlled selection, explicit-interaction precedence, stable context identity | Four focused component specs, including parameterized edit classes and delayed-fetch regression | Mounts/stubs do not prove full page composition and real async stores | Browser |
| Browser integration / user journey | Yes | Real page form state through network mutations and tree projection | Implementation/review browser inspection stopped before Run Team | Critical launch/history/tree journey remains unexecuted on current code | Browser |
| Authentication / session / permissions | No | Existing node has no new auth policy in this scope | N/A | None material for loopback remote node | None |
| Desktop renderer / web-equivalent UI | Yes | Same Vue/Nuxt renderer used in browser and Electron | Component tests and prior implementation browser inspection | Actual post-fix launch was not executed; browser can prove the shared renderer/client/server path | Browser preferred |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or host-path code changed | Electron browse-preservation component coverage exists | The reported Electron manifestation shares renderer code; no shell-specific material uncertainty remains after browser proof | None; actual desktop not justified |
| Process / lifecycle | Yes | One accepted Run activation must lead to one registration and one TeamRun; result must persist through refresh | Mock call-count tests | Real process/network sequencing and cleanup remain unproved | Browser + live API/history |
| Persisted-data transition | Preserved | No schema/store change; existing workspace and TeamRun records remain directly usable | No persistence diff; history/tree suites | Need direct current reader evidence after one new run/reload | Browser + live API/history |
| Worker / queue / distributed coordination | No | No queue/worker change | N/A | None | None |
| External integration | Yes, bounded | Existing Docker node on `localhost:8006`, Codex App Server runtime catalog, server-local filesystem path | Prior investigation environment proof | Current implementation must execute against the real node/path | Browser + live API/log correlation |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue 3/Pinia frontend; Vitest/Nuxt Test Utils; Playwright Core browser automation; GraphQL and WebSocket client; TypeScript backend in Docker for the selected live run.
- Conflicting, missing, or unclear project instructions: No conflict. The closest frontend instructions require `--run` for Vitest. The root canonical `pnpm dev` starts an isolated local backend on 8000, but the approved acceptance scenario requires the already-provisioned Docker node on 8006 and its server-local path; therefore the documented frontend-only `BACKEND_NODE_BASE_URL=http://localhost:8006 pnpm dev` path is selected. The existing `test:e2e:workspace-responsive` probe is route/layout-specific and does not cover Team launch. No repository-owned deterministic full browser-to-live-Team fixture exists for this exact path.
- Required environment variables or secrets available: `Yes` for the selected live scenario. No secret values are recorded. The existing node reports the Codex App Server/model catalog and previously executed the same Team definition; no new credential is created.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Closest repository agent/testing instruction | Colocated tests; `pnpm test:nuxt ... --run`; frontend/source boundary and git safety. |
| `autobyteus-web/README.md` | Frontend setup, browser/desktop strategy, tests | Browser development uses `pnpm dev`; `BACKEND_NODE_BASE_URL` configures the real backend proxy; packaged Electron has a separate isolated launcher; browser probes use Playwright Core. |
| `README.md` (`Local full-stack development`, `Packaged Electron API/E2E testing`) | Root canonical stacks and isolation | Root `pnpm dev` owns 8000/3000 isolated development state; actual desktop is reserved for shell validation; this change can use frontend-only browser mode against the approved 8006 node. |
| `autobyteus-web/package.json` | Executable scripts/runtime versions | `test:nuxt`, `build`, boundary guards, browser-probe conventions; Nuxt 3.21, Vitest 3.2, Playwright Core 1.48, Electron 42.4.1. |
| `autobyteus-server-ts/AGENTS.md` | Server test instructions | Server tests use `vitest run`/`--no-watch`; no server code changed, so targeted server suites are not primary. |
| `requirements.md`, `investigation-notes.md` | Exact environment and prior reproducible journey | Docker `autobyteus-server-5`, port 8006, requested path, runtime/model, safe cleanup mutations, and prior evidence correlations. |
| `.git` / branch state | Assigned implementation state | Branch `codex/remote-node-new-workspace-team-run-visibility`, HEAD `2950019a3`; uncommitted code-review report updates are upstream-owned and must not be overwritten. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Existing Docker bound node | Existing container `autobyteus-server-5` | No start command; do not take ownership | Port `8006 -> 8000`; server-local path exists; container is user/environment-owned | `curl http://localhost:8006/rest/health`; Docker status; path check only | Do not stop the container |
| Source Nuxt frontend | `.../autobyteus-web` | `BACKEND_NODE_BASE_URL=http://localhost:8006 pnpm dev --port 3107` | Owned API/E2E process; worktree `node_modules` links to the shared installed dependency tree | HTTP 200 from `http://127.0.0.1:3107` | Terminate only the spawned process group; verify port closes |
| Browser | Ticket-local temporary Playwright harness | `node <ticket>/probes/api-e2e/remote-workspace-team-launch.mjs` | Google Chrome/Playwright Core; isolated browser context; screenshots/network JSON retained under ticket probes | Page load plus semantic locators and no page errors | Close owned context/browser |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Software Engineering Team definition | Existing bound-node GraphQL/UI definition | Reuse; do not edit definition | Retain |
| Runtime/model catalog | Existing `codex_app_server` / `gpt-5.6-sol` on node | Reuse existing environment; no secret recorded | Retain |
| Valid New root | Existing `/home/autobyteus/workspace/autobyteus-workspace` inside container | Register metadata only; do not delete directory/files | Remove only probe-created registration after deleting probe Team history, if no pre-existing registration must be preserved |
| Invalid / empty New state | Empty New input for the live UI boundary; deterministic injected `CreateWorkspace` rejection remains covered by `RunConfigPanel.spec.ts` | Empty input must issue no mutation or Team launch; a mocked server rejection must preserve New/path and block fallback | No persistent fixture |
| Probe TeamRun(s) | Created through normal `Run Team` UI | Record exact returned IDs; do not touch the preserved user run `software_engineering_team_f7589167f330406383ba79a7a2404d58` | Terminate and permanently delete only created run/history via public GraphQL mutations |
| Browser state | Fresh context | No reuse of user's Electron/Chrome session | Close/discard |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`.
- Design-spec and implementation-handoff references: `design-spec.md` → Persisted Data / State Transition Decision; `implementation-handoff.md` → Persisted Data Transition Check.
- Representative existing-data setup and required behavior: The node's existing workspace registry and TeamRun history remain readable; a newly created TeamRun at the requested root must be visible through the normal history/tree reader before and after reload without any transform.
- Evidence planned for the approved direct-use, discard/rebuild, or migration outcome: Observe canonical workspace metadata and TeamRun via the normal UI/GraphQL responses, refresh/reload the page, and confirm the same run/root are still projected. Verify no schema/migration command or compatibility fallback is used.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` — New Agent/Team success and failure | New registration precedes launch; canonical workspace is applied; failure preserves state and blocks launch | FR-001, FR-003, FR-005, FR-007; AC-001, AC-004, AC-007; DS-001/004/005 | Still Valid | Assertions align with approved behavior and current controlled contract | Re-run focused suite |
| Same file — parameterized Team edit ordering | Runtime, model, LLM config, auto-approve, and member override preserve New/path and yield one create/launch | FR-002; AC-001–AC-004 | Still Valid | Exact former reset boundary is exercised after a settled controlled update | Re-run; use browser for one exact and representative UI variants |
| Same file — Team draft transition / selected-run hydration / read-only / Agent buffer | Real context change rehydrates; same context preserves; read-only ignores edits | FR-004; AC-005, AC-008 | Still Valid | Stable identity behavior matches reviewed design | Re-run focused suite |
| `WorkspaceSelector.spec.ts` — controlled rendering/events, delayed fetch, default Temp, browse/error/disabled | Rendered `aria-selected` and raw path follow model; explicit New survives late discovery | FR-001, FR-004, FR-007; AC-003, AC-007, AC-009; `CR-F-001` | Still Valid | Current assertions directly close the round-1 source finding without protecting obsolete split state | Re-run focused suite; repeat delayed-fetch behavior in browser if practical |
| `TeamRunConfigForm.spec.ts` / `AgentRunConfigForm.spec.ts` — controlled relays/read-only | Forms relay complete value and preserve form-specific behavior | FR-001; AC-008, AC-009 | Still Valid | Thin-interface assertions match clean-cut design | Re-run focused suite |
| `MemberOverrideItem.spec.ts` — member runtime/model/advanced and override interactions | Individual member override UI emits member edits used by the Team form | FR-002; AC-002 | Out Of Scope for durable edits in this ticket; existing suite debt noted | On independent full-suite execution, 7 scenarios failed because this unchanged base-branch test mock lacks current `llmProviderConfigStore` methods; neither the test, component, nor composable differs from `origin/personal`. The workspace-state implementation does not own that stale fixture. | Exercise a real member auto-approve override after New/path in the browser; report the baseline test debt without changing unrelated repository coverage. |
| `teamRunConfigStore.spec.ts` | Immutable same-draft edit lifecycle and stable draft identity | FR-002, FR-004; AC-002, AC-005 | Still Valid | Store remains an unchanged but material owner | Include in broader affected suite |
| `workspaceStore.spec.ts` / `workspaceMetadataActions.spec.ts` | Workspace registration/cache/metadata behavior | FR-003, FR-006, FR-007 | Still Valid | Backend-facing store is reused unchanged | Include in broader affected suite |
| `agentTeamRunStore.spec.ts`, hydration/open/history/tree projection suites | Team create/hydrate/selection and live/history tree projection | FR-005; AC-004, AC-006, AC-008 | Still Valid | Downstream owners are preserved and relevant to regression detection | Include in broader affected/full frontend suite |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Responsive workspace shell and mobile isolation | AC-009 only at shell/layout level | Out Of Scope | Does not configure or launch a Team | Do not misuse as launch proof |
| Packaged Electron E2E launch/isolation probes | Electron process isolation/routing/lifecycle | No changed shell boundary | Out Of Scope | No preload/IPC/packaging/process-isolation change | Do not run unless browser leaves a shell-specific gap |
| Root/server deterministic/live E2E suites | Server APIs/providers in server-owned isolated runtime | Backend unchanged; not the frontend state boundary | Out Of Scope | They bypass the changed Vue state and exact page journey | Do not present as proof for this bug |

## Stale Or Obsolete Coverage Decisions

None. The implementation removed obsolete split-event/local-state assertions in its already reviewed source commits; no currently relevant durable test protects the invalid hidden-fallback behavior or requires removal in this API/E2E round.

## Durable Coverage To Add

None in the initial plan. The reviewed implementation already added boundary-appropriate, parameterized durable component coverage for all changed state transitions. The remaining material gap is an environment-specific full browser-to-Docker-node journey using an existing Team definition, live Codex runtime catalog, and server-local path. The repository does not currently provide a deterministic isolated frontend/Team/browser fixture for this journey, so this round will use a ticket-retained temporary executable probe and evidence rather than commit an environment-coupled durable test. If execution exposes a stable missing assertion that can be made deterministic without the live node, the investigation will be updated before adding it.

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None planned.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt components/workspace/config/__tests__/WorkspaceSelector.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts --run --reporter=verbose` | `autobyteus-web` | Controlled state, edit ordering, no fallback, context transitions, delayed discovery, Agent/Team/read-only/a11y preservation | Pass — 4 files / 69 tests | `probes/api-e2e/01-focused-config-tests.log` |
| 2 | `pnpm test:nuxt stores/__tests__/teamRunConfigStore.spec.ts stores/__tests__/workspaceStore.spec.ts stores/__tests__/workspaceMetadataActions.spec.ts stores/__tests__/agentTeamRunStore.spec.ts services/runHydration/__tests__/teamRunContextHydrationService.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts --run --reporter=dot` | `autobyteus-web` | Unchanged adjacent owners and tree/history projection | Pass — 7 files / 110 tests | `probes/api-e2e/02-adjacent-owner-tests.log` |
| 3 | `pnpm test:nuxt --run --reporter=dot` | `autobyteus-web` | Broader Nuxt regression suite | Fail outside task delta — 417 files / 2300 tests passed; 6 files / 13 tests failed; 2 files / 2 tests skipped; 17 unhandled errors | `probes/api-e2e/03-full-nuxt-tests.log`; all failing source/test paths are unchanged from `origin/personal` |
| 4 | Focused rerun of the six broad-suite failing files | `autobyteus-web` | Determine isolation/flakiness versus persistent unrelated failures | Fail outside task delta — 5 files / 12 tests failed; managed extension file passed on rerun | `probes/api-e2e/04-broad-failure-recheck.log`; unchanged-path audit retained in investigation notes below |
| 5 | `pnpm build` | `autobyteus-web` | Production Nuxt integration/build | Pass | `probes/api-e2e/05-nuxt-build.log` |
| 6 | `pnpm guard:web-boundary && pnpm guard:localization-boundary && git diff --check` | `autobyteus-web` then worktree root | Boundary and patch hygiene | Pass | `probes/api-e2e/06-guards-and-diff.log` |

## Post-Repository Confidence Scorecard (Mandatory)

The changed and adjacent requirement-linked suites pass. The full Nuxt suite also revealed unrelated base-branch debt: 13 failures across six files in the full run, and 12 failures across five files on a focused rerun. The persistent failures are stale store/provider mocks in `MemberOverrideItem.spec.ts`, `runHistoryStore.spec.ts`, and `workspace-history-draft-send.integration.test.ts`; a focused Team interrupt transport failure; and a missing zh-CN key. Every implicated source/test path and direct dependency audited is byte-unchanged by this branch versus `origin/personal`. `managedExtensionService.spec.ts` failed only in the broad run and passed the focused rerun. These failures do not contradict the changed workspace-selection behavior, but they prevent describing the repository-wide suite as green and reduce the pre-browser score.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Exact state/edit/error/context requirements are covered by 69 passing focused tests; adjacent owners add 110 passes | Critical live CreateWorkspace/TeamRun/root/tree/reload behavior is still mocked | Browser + live API/history |
| Changed-boundary execution directness | 90% | Changed Vue coordinator/selector/forms execute directly in component tests across all edit classes | Page composition, real stores, and network are not direct yet | Browser |
| Cross-boundary integration realism and mock gap | 75% | Adjacent store, hydration, and tree owners pass independently | The boundary between visible state, real GraphQL calls, Team creation, and tree projection is not yet joined | Browser + live API |
| Environment, configuration, identity, and fixture fidelity | 75% | Exact Docker node/path/runtime/model are healthy and available; production build passes | No post-fix live launch has used them | Browser against 8006 |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Registration failure, empty input, pending/read-only, stable context, canonicalization, and one-call semantics pass in focused suites | Live invalid-path and persisted cleanup are unproved; broad suite has unrelated base debt | Browser invalid-path journey + cleanup verification |
| User-surface, browser, and desktop-shell confidence | 85% | Semantic/ARIA/component coverage passes; production build passes; shell-specific code is untouched | Actual post-fix Run Team, tree reveal, reload, and member override journey are absent | Browser; no actual desktop unless a shell gap emerges |
| Durable regression coverage quality and relevance | 93% | Parameterized, requirement-linked controlled-state coverage is narrow and reviewed; focused/adjacent suites pass | Repository-wide suite is not clean because of unchanged stale fixtures/failures | Direct browser evidence; unrelated failures should be repaired separately |

- Overall post-repository confidence: `85.4%`.
- Calculation method: Simple average of the seven applicable scores: `(90 + 90 + 75 + 75 + 90 + 85 + 93) / 7 = 85.4`.
- Every critical acceptance criterion directly proven: `No` — live AC-001/AC-004/AC-006 and browser-level AC-002/AC-003/AC-009 remain.
- Any applicable category below `90%`: `Yes` — cross-boundary realism, environment fidelity, and user-surface/browser confidence.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: Real GraphQL ordering/count, canonical Team root, live tree/reload, real member-override composition, and invalid-path no-fallback remain unproved. The repository-wide Nuxt baseline contains unrelated failures, so only the focused and adjacent affected suites are green.

## Broader Validation Decision (Mandatory)

- Decision: `Required`.
- Selected execution mode: `Browser` with live API/history/log correlation.
- Specific confidence gap or residual risk addressed: The exact defect only manifested when real page state, immutable Team edits, and bound-node launch sequencing interacted. Repository tests mock the network/execution owners and implementation-stage browser validation deliberately did not click Run Team.
- Why the selected mode can materially improve confidence: The Nuxt browser route exercises the same renderer/client/store code used by Electron while directly observing live GraphQL calls and the server's canonical workspace/Team/history result.
- Expected confidence after the selected validation: At least 95% overall with every category at least 90%, provided the exact ordering, control, invalid-path/no-fallback, tree/reload, and cleanup checks pass.
- Browser-specific decision and rationale: Browser is preferred because all changed behavior is web-equivalent renderer/client/server behavior. No Electron preload, IPC, host path, packaging, window, or lifecycle code changed.
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: N/A at investigation time.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron 42.4.1 wrapping the same Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/README.md` browser development and packaged Electron E2E sections; root `README.md` packaged Electron/API-E2E section.
- Web-equivalent behavior: Workspace tabs/path, Team config edits, readiness, GraphQL registration/launch, history/tree projection.
- Shell-specific or lifecycle behavior: Folder-picker bridge, embedded-server launch/profile, window management, packaging. None changed or material to the remote path typed manually.
- Chosen validation approach and why it fits the project: Browser development frontend bound to the existing 8006 node; this directly exercises the changed shared renderer boundary without disturbing the user's installed desktop application.
- Server/frontend setup when browser validation is used: Existing 8006 node plus owned frontend on 3107.
- Effect on any already-running desktop application: None; no installed Electron app or production data root is opened/stopped.
- Behavior not directly proven and confidence consequence: Electron-only browse/IPC and packaged lifecycle are not re-executed; existing focused coverage plus no shell diff makes this negligible and explicitly not evidence for shell behavior.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: verify 8006 health/container/path; start owned worktree Nuxt on 3107 with `BACKEND_NODE_BASE_URL=http://localhost:8006`; wait for 200; launch an isolated Playwright Chrome context.
- Environment choices that materially affect the run: Remote Docker node `autobyteus-server-5`; browser frontend `127.0.0.1:3107`; Software Engineering Team; Codex App Server; GPT-5.6-Sol; requested server-local path; 1600×1050 primary viewport.
- Health / readiness checks: REST health; port ownership; frontend HTTP readiness; team/runtime/model visible and Run button enabled.
- Seed data / fixtures: Existing Team definition/runtime catalog and existing filesystem path only. No direct store/database mutation.
- Test identities, authentication, permissions, or session state: Fresh browser context; existing no-auth loopback node policy.
- Requirement-linked journeys or scenarios: API-E2E-001 exact path-then-auto-approve launch; API-E2E-002 representative later config edits/control ordering state preservation; API-E2E-003 invalid/empty New no-fallback; API-E2E-004 canonical tree/history/reload; API-E2E-005 delayed-discovery explicit-New preservation if controllable; API-E2E-006 explicit Existing/Temp preservation only if needed after the first live journey.
- DOM, screenshot, log, API, process, or other evidence to capture: semantic DOM states/values; GraphQL operation request/response counts; TeamRun ID/root; server log excerpt; before/after history query; pre-launch, post-launch, post-reload, and invalid-error screenshots; JSON summary.
- Owned processes and temporary state to clean up: Nuxt process, browser process/context, probe TeamRun(s), their stored history, and only a probe-created workspace registration. Do not remove the underlying directory or any unrelated run/history/registration.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-E2E-001 | Ticket-local Playwright probe + frontend 3107 + node 8006 | Exact path then auto-approve ordering sends one registration and one Team create under canonical root | Depends on a user/environment-owned Docker node, live runtime/model catalog, and existing server-local path; no deterministic repository fixture exists. |
| API-E2E-002 | Ticket-local exact-order and control-order probes | Runtime/model/reasoning/fast/auto-approve/member/panel edits do not alter New/path; path-last still launches | Durable component suite already parameterizes the deterministic boundary; browser is confidence evidence for composition. |
| API-E2E-003 | Same page probe with empty New path, plus durable injected registration-failure coverage | Empty blocks locally with no mutations; registration rejection preserves New/path and prevents Team fallback | Live server accepts metadata-only paths, so a unique nonexistent path is not a valid live rejection fixture; deterministic failure behavior is already durable in `RunConfigPanel.spec.ts`. |
| API-E2E-004 | Same run plus live history API and reload | Team is revealed under canonical workspace and persists through normal readers | Environment-owned persisted records require careful per-run cleanup and are not a stable CI fixture. |
| API-E2E-005 | Browser route delaying initial workspace response | Explicit New remains authoritative after discovery completes | Deterministic durable regression already exists; browser probe independently validates page composition. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual Electron packaged shell launch | No shell-specific code changed; browser proves the web-equivalent boundary and avoids disturbing the user's running app | Negligible shell-only uncertainty; do not claim IPC/packaging proof | None unless browser evidence reveals a shell-only discrepancy |
| General failures after Team creation begins | Explicitly out of approved ticket scope | Existing non-blocking reconciliation risk remains | Separate ticket if prioritized |
| Every edit variant as a separate live Team creation | Would create costly/redundant six-member runs; deterministic component coverage already parameterizes each edit | Low after one exact live launch and representative rendered state checks | None if repository and representative browser checks pass |

## Broader Validation Execution Closure

- Executed decision: `Required` browser validation completed against the existing Docker node on `localhost:8006`; actual Electron execution remained unnecessary because no shell boundary changed.
- Exact defect ordering: `Pass`. With New/path entered first, subsequent runtime, GPT-5.6-Sol, reasoning, fast mode, global auto-approve, panel expansion, and representative member auto-approve override edits preserved the rendered New/path. One `CreateWorkspace` and one `CreateAgentTeamRun` were observed. All six launch member configs carried the canonical non-Temp workspace ID/root.
- Control ordering: `Pass`. Settings-first then New/path issued one registration and one Team creation, appeared under the requested workspace, and remained visible after reload.
- Failure/state boundaries: `Pass`. Empty New remained selected, showed the actionable workspace-required issue, emitted no registration/Team mutation, and explicit Existing changed the visible launch mode to Temp without launching. A real delayed `GetAllWorkspaces` response did not replace explicit New/path.
- Persistence/direct-use: `Pass`. Both live Team rows were read through `listWorkspaceRunHistory` under the canonical root and revealed in the normal workspace tree after reload. No migration or compatibility branch was used.
- Cleanup: `Pass`. Created TeamRuns `software_engineering_team_4cb4299212f940a08402bc0fd795c17d` and `software_engineering_team_f298fa4255b24490ba70af8a6051c5a6` were terminated and permanently deleted; the probe-created workspace registration was removed after each run; post-cleanup registry/history checks found neither probe record. The pre-existing user TeamRun `software_engineering_team_f7589167f330406383ba79a7a2404d58` remained present, active, and unchanged. Owned browser/frontend processes were closed; the Docker node remains healthy.
- Execution evidence: `probes/api-e2e/23-graphql-network.json`, `28-live-browser.log`, `30-delayed-fetch-explicit-new.png`, `31-delayed-fetch.log`, `34-server-live.log`, `39-control-order-network.json`, `42-control-order.log`, `45-server-control-order.log`, and `35-environment-cleanup.log`, plus the screenshots/history/cleanup records in the same directory.
- Final coverage decision: no repository-resident durable coverage addition, update, or removal is warranted. The ticket-local probes remain evidence, not CI coverage.

## Ambiguities Or Reroute Triggers

None at the initial or completed execution stage.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` in the initial plan.
- Post-repository confidence: `85.4%`; broader validation is required because three categories are below 90% and critical live criteria remain unproved.
- Broader validation decision: `Required` — browser plus live API/history/log correlation.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: N/A.
- Notes: This artifact was initially written before execution, updated after repository checks, and closed after successful broader validation. No durable coverage edit was made. Full-suite failures remain recorded as unrelated base-branch evidence rather than silently relabeled as passing or expanded into this ticket. Final result/confidence are authoritative in `api-e2e-execution-coverage-report.md`.
