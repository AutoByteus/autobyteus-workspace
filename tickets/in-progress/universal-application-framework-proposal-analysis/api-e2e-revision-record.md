# API/E2E Revision Record — Universal Application Dual-Host Foundation

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` `CRR-002`; API/E2E round 1 | solution baseline; architecture review baseline; `IR-002`; `CRR-002` | N/A | **Fail / 89%** |
| API-REV-002 | `code_reviewer` `CRR-004`; API/E2E round 2 | `SR-003`; `ARCH-REV-003`; `IR-003`; `CRR-004`; `API-REV-001` | **Fail / 89%** | **Fail / 88%** |
| API-REV-003 | `code_reviewer` `CRR-006`; API/E2E round 3 | `IR-004`; `CRR-006`; `API-REV-002` | **Fail / 88%** | **Fail / 88%** |
| API-REV-004 | `code_reviewer` `CRR-008`; API/E2E round 4 | `IR-005`; `CRR-008`; `API-REV-003` | **Fail / 88%** | **Fail / 89%** |
| API-REV-005 | `code_reviewer` `CRR-014`; API/E2E round 5 | `SR-005`; `SR-006`; `ARCH-REV-005`; `ARCH-REV-006`; `IR-006`–`IR-009`; `CRR-009`–`CRR-014`; `API-REV-004` | **Fail / 89%** | **Fail / 87%** |
| API-REV-006 | `code_reviewer` `CRR-017`; API/E2E round 6 | `SR-008`; `SR-009`; `IR-010`; `CRR-015`–`CRR-017`; `API-REV-005` | **Fail / 87%** | **Fail / 88%** |
| API-REV-007 | `code_reviewer` `CRR-019`; API/E2E round 7 | `IR-011`; `CRR-018`–`CRR-019`; `API-REV-006` | **Fail / 88%** | **Fail / 88%** |
| API-REV-008 | `code_reviewer` `CRR-022`; API/E2E round 8 | `SR-010`; `ARCH-REV-008`; `IR-012`–`IR-013`; `CRR-020`–`CRR-022`; `API-REV-007` | **Fail / 88%** | **Pass / 97%** |
| API-REV-009 | `code_reviewer` `CRR-024`; delivery re-entry `DR-001`; API/E2E round 9 | `IR-014`; `CRR-024`; `API-REV-008`; `CRR-023`; `DR-001` | **Pass / 97%** | **Fail / 94%** |
| API-REV-010 | `code_reviewer` `CRR-026`; API/E2E round 10 | `IR-015`; `CRR-025`–`CRR-026`; `API-REV-009`; `DR-001` | **Fail / 94%** | **Pass / 98%** |
| API-REV-011 | `code_reviewer` `CRR-029`; API/E2E round 11 | `SR-011`; `ARCH-REV-009`; `IR-016`; `CRR-028`–`CRR-029`; `API-REV-010` | **Pass / 98%** | **Pass / 99%** |
| API-REV-012 | `code_reviewer` `CRR-033`; API/E2E round 12 | `SR-013`; `ARCH-REV-010`–`ARCH-REV-011`; `IR-017`–`IR-018`; `CRR-030`–`CRR-033`; `API-REV-011` | **Pass / 99%** | **Pass / 97%** |

## Revision Entries

### API-REV-001 — Initial dual-host coverage baseline exposes repeated Studio reload failure

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 1.
- Triggering finding or scenario IDs: reviewer residuals 1–4; `APIE2E-001` through `APIE2E-007`; new failure `APIE2E-F001` under `APIE2E-007` / AC-011.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: solution initial baseline; architecture-review initial baseline; `IR-002`; `CRR-002`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result after source review Pass.
- Coverage decisions or durable test paths changed: added three server coverage files; updated nine server test files for explicit current dependencies/composition/recovery; updated one devkit expectation so registered Studio packages must be reused before import.
- Scenarios added, changed, removed, or rechecked: APIE2E-001/002/004/005 added and passed; affected 50-file server selection rechecked at 216/216; APIE2E-007 failed live and in the durable devkit reproduction; none removed.
- Commands, environment, fixture, or broader-validation delta: real Brief standalone on 43601; real controlled Chrome standalone on 43602; root Studio/Nuxt on 8000/3000; real Brief `dev:studio`; Node 22.23.1, pnpm 10.28.2, Chrome 150.0.7871.187; owned SQLite/data roots.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail / 89%`
- New or remaining failure IDs: `APIE2E-F001` (`APIE2E-007`, AC-011): duplicate local-package import prevents every repeated Studio dev rebuild/reload.
- Recommended recipient: `code_reviewer` for focused failure-origin review; preliminary owner `implementation_engineer` (`Local Fix`).
- Remaining risks, blocked evidence, or untested scope: Studio explicit browser remount, complete starter/Brief/Socratic command matrix, complete same Brief journey through both hosts, and dual-host pre/post immutable digests await the fix and rerun. No environment blocker exists.

### API-REV-002 — Existing-package refresh passes; live Studio bundle definition gate fails

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 2 after `CRR-004` source-review Pass.
- Triggering finding or scenario IDs: prior `APIE2E-007` / `APIE2E-F001`; new `APIE2E-STUDIO-001` / `APIE2E-F002`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-003`; `ARCH-REV-003`; `IR-003`; `CRR-003`; `CRR-004`; `API-REV-001`; delivery `N/A`.
- Why this coverage/execution revision was recorded: rechecked the prior failure first, resumed broad repository and live coverage, and recorded the newly discovered critical Studio setup/definition-authority mismatch.
- Coverage decisions or durable test paths changed: extended `autobyteus-application-devkit/tests/application-devkit.test.mjs` to model `DevkitReloadApplicationPackage` and assert import-once, refresh-existing, current renamed identity, and backend-reload order. The cumulative twelve API-owned server test paths remain valid and pass in the affected matrix; none were removed.
- Scenarios added, changed, removed, or rechecked: `APIE2E-007` and `APIE2E-F001` rechecked and resolved; SDK/frontend/devkit/server/Nuxt/maintained-build coverage rerun; `APIE2E-STUDIO-001` added and failed; complete post-entry/remount and remaining maintained-app matrix stopped after the critical failure.
- Commands, environment, fixture, or broader-validation delta: devkit 19/19; SDK 6/6; frontend SDK 12/12; affected server 50 files/216 tests; focused Nuxt 6 files/16 tests; Brief/Socratic build/validate/backend typecheck; root Studio/Nuxt 8000/3000; real repeated Brief `dev:studio`; exact REST/GraphQL ID probe; system-Chrome Playwright semantic probe; isolated API/E2E state.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-007` / `APIE2E-F001` / `CR-003` | `Local Fix`, implementation-owned duplicate-root import | **Resolved**: absent root imports once; existing root invokes package refresh; current identity resolves; backend reload follows; no duplicate import | `api-rev-002-devkit-regression.log` (19/19), `api-rev-002-brief-dev-studio.log` (initial plus two successful reload generations), `api-rev-002-studio-identity-digest.log` |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 89%`
- Current result and confidence: `Fail / 88%`
- New or remaining failure IDs: `APIE2E-STUDIO-001` / `APIE2E-F002`: exact bundle team is READY and present in available resources but absent from Studio global GraphQL definitions; setup reports it missing, disables `Enter application`, and creates no iframe.
- Recommended recipient: `code_reviewer` for focused failure-origin review; preliminary classification `Local Fix`, owner `implementation_engineer`, centered on graph-local versus global singleton definition authority.
- Remaining risks, blocked evidence, or untested scope: explicit iframe remount, real in-Studio Brief team journey, complete both-host parity/digests, and remaining starter/Socratic live command matrix await the fix and rerun. No environment blocker exists; cleanup is complete.

### API-REV-003 — Studio entry/remount passes; real package team member allocation fails

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 3 after `CRR-006` source-review Pass.
- Triggering finding or scenario IDs: prior `APIE2E-STUDIO-001` / `APIE2E-F002`; new `APIE2E-BRIEF-002` / `APIE2E-F003`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `IR-004`; `CRR-005`; `CRR-006`; `API-REV-002`; delivery `N/A`.
- Why this coverage/execution revision was recorded: rechecked the prior Studio definition-authority failure first, proved the repaired setup/entry/remount boundary, and recorded the newly exposed critical real team-member identity allocation failure.
- Coverage decisions or durable test paths changed: updated `autobyteus-server-ts/tests/unit/api/graphql/types/definition-catalog-refresh.test.ts` to configure/assert the exact Studio agent/team authority pair and agent-before-team refresh order. Cumulative API-owned durable paths are now 14; none were removed. The existing Brief imported-package integration remains valid but its fake team-run seam is explicitly insufficient for the new allocator boundary.
- Scenarios added, changed, removed, or rechecked: prior `APIE2E-STUDIO-001` / `APIE2E-F002` rechecked and resolved; `APIE2E-STUDIO-DUR-001`, explicit iframe remount, real Brief create/Generate draft, and pre/post entry digests executed; `APIE2E-BRIEF-002` added and failed; remaining live command/parity matrix stopped after the critical failure.
- Commands, environment, fixture, or broader-validation delta: focused GraphQL test 3/3; affected server 51 files/219 tests plus build-config TypeScript no-emit; real root `pnpm dev` on 8000/3000; real Brief `pnpm dev:studio`; exact current-worktree package; installed Chrome through Playwright Core; available local LM Studio model saved through supported setup; isolated API/E2E state.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-STUDIO-001` / `APIE2E-F002` / `CR-004` | `Local Fix`, implementation-owned Studio GraphQL definition-authority mismatch | **Resolved**: exact package-owned Brief team appears among 29 Studio definitions; setup saves; Enter enables; iframe mounts; explicit reload replaces it with a fresh single iframe | `api-rev-003-definition-catalog-refresh.log`, `api-rev-003-studio-gate-remount.log`, entry/remount screenshots |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 88%`
- Current result and confidence: `Fail / 88%`
- New or remaining failure IDs: `APIE2E-BRIEF-002` / `APIE2E-F003`: a real Studio Brief draft request becomes `blocked`; no binding/run/artifact is created because the package-owned `researcher` AgentDefinition cannot be loaded for agent-run identity allocation.
- Recommended recipient: `code_reviewer` for focused failure-origin review; preliminary classification `Local Fix`, owner `implementation_engineer`, centered on the graph-local agent-definition authority omitted from `TeamRunService`'s identity allocator.
- Remaining risks, blocked evidence, or untested scope: successful real Brief team/artifact execution, complete both-host parity, and remaining maintained-app live command matrix await the source fix and rerun. No missing dependency exists; the failure occurs before provider invocation; cleanup is complete.

### API-REV-004 — Studio real team completes; clean standalone lacks a usable launch profile

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 4 after `CRR-008` source-review Pass.
- Triggering finding or scenario IDs: prior `APIE2E-BRIEF-002` / `APIE2E-F003`; new `APIE2E-BRIEF-003` / `APIE2E-F004`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `IR-005`; `CRR-007`; `CRR-008`; `API-REV-003`; delivery `N/A`.
- Why this coverage/execution revision was recorded: rechecked the prior graph-local allocator failure first, proved the repaired Studio provider/event/notification/artifact journey, continued to the required real standalone journey, and recorded the newly exposed standalone launch-configuration gap.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/unit/application-platform/application-run-authorities.test.ts`, a direct non-fake composition regression asserting the exact graph-local definition/run/metadata collaborators, one allocator shared by agent/team services, successful package-owned member allocation, and no global definition lookup. Cumulative API-owned durable paths are now 15; none were removed.
- Scenarios added, changed, removed, or rechecked: prior `APIE2E-BRIEF-002` / `APIE2E-F003` rechecked and resolved; `APIE2E-BRIEF-DUR-001` added and passed; Studio completed the real two-member Brief run; `APIE2E-BRIEF-003` added and failed in clean standalone; entry hashes compared; fresh remount repetition and remaining starter/Socratic/full command matrix stopped after the critical failure.
- Commands, environment, fixture, or broader-validation delta: new focused test 1/1 and related 4 files/17 tests; affected server 55 files/236 tests plus TypeScript no-emit; real root `pnpm dev`; Brief `pnpm dev:studio`; installed system Chrome; supported local LM Studio model; Brief `pnpm dev -- --port 43124 --no-open` with a new standalone data root; API/SQLite/hash/process evidence.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-BRIEF-002` / `APIE2E-F003` / `CR-005` | `Local Fix`, implementation-owned graph-local allocator omission | **Resolved**: binding and team run allocate, both exact package members use `LMStudioLLM`, researcher and writer artifacts publish, the brief reaches `in_review`, and browser notifications `brief.created` / `brief.draft_run_started` are observed | `api-rev-004-allocator-authority.log`, `api-rev-004-brief-real-team-run.log`, `api-rev-004-brief-real-team-completion.log`, completion API/PNG, provider excerpt |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 88%`.
- Current result and confidence: `Fail / 89%`.
- New or remaining failure IDs: `APIE2E-BRIEF-003` / `APIE2E-F004`: the documented clean standalone flow serves Brief Studio and persists a brief, but Generate draft becomes `blocked` with `latestBindingStatus=FAILED`, no binding/run/artifacts, and `llmModelIdentifier is required.` The clean standalone resource-configuration table has no launch-profile row, and no supported standalone setup or CLI input was found; see `api-rev-004-standalone-launch-profile-surface.log`.
- Recommended recipient: `code_reviewer` for focused failure-origin review; preliminary classification `Design Impact`, because AC-005/006 require usable launch semantics in both hosts while the reviewed standalone product path defines no owner or supported input for the required host-managed LLM profile.
- Remaining risks, blocked evidence, or untested scope: successful standalone real team execution, complete successful same-package dual-host parity, a fresh explicit Studio remount repetition, and the remaining starter/Socratic/full command matrix await failure-origin resolution. This is not an external-provider blocker: the same local provider completed the Studio journey. Cleanup is complete.

### API-REV-005 — Package defaults launch; standalone Agent Tools MCP route is absent

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 5 after `CRR-014` source-review Pass for `IR-009`.
- Triggering finding or scenario IDs: prior `APIE2E-BRIEF-003` / `APIE2E-F004`; current `APIE2E-BRIEF-003` / `APIE2E-F005`; exact route regression `APIE2E-STANDALONE-MCP-001`; secondary broad-suite diagnostic `APIE2E-REPO-005`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-005`; `SR-006`; `ARCH-REV-005`; `ARCH-REV-006`; `IR-006`–`IR-009`; `CRR-009`–`CRR-014`; `API-REV-004`; delivery `N/A`.
- Why this coverage/execution revision was recorded: reconciled the portable launch-policy and selected-resource requirements introduced through SR-005/SR-006, rechecked the prior clean-standalone failure first, proved that package-owned Codex/Luna defaults now launch, and recorded the newly exposed critical standalone configured-tool route failure.
- Coverage decisions or durable test paths changed: added portable-policy, launch-service, real-package-policy, package-prompt, and selection-preview tests; updated current REST, application-context, imported-Brief, Studio setup/editor, and standalone-composition coverage; removed two obsolete predecessor execution-resource service tests. All still-relevant prior API/E2E-owned tests remain preserved. The cumulative dirty durable package contains 23 active added/updated paths.
- Scenarios added, changed, removed, or rechecked: recursive prohibited aliases and positive token/pricing cases passed; exact stored baseline, no-write preview, alternate inheritance, clearing, mixed-runtime inheritance, stale response/preview-PUT protection, deleted selection, stale topology, reset, and effective provenance passed; prior `APIE2E-F004` resolved at launch; `APIE2E-F005` failed after real Luna execution; remaining Studio/parity/remount/command/digest live matrix stopped after the critical failure.
- Commands, environment, fixture, or broader-validation delta: focused server 24/24; current launch REST 6/6; real-package policy 9/9; package prompt 1/1; affected server 30 files/116 tests; affected Nuxt 14 files/111 tests; devkit build and 19/19; server TypeScript no-emit; Brief/Socratic build/validate/backend typecheck; whole server diagnostic 489 files/2676 tests passed and 39 files/105 tests failed with six unhandled errors; real Brief standalone on 43124 with fresh data, installed system Chrome, Codex App Server, and Luna.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-BRIEF-003` / `APIE2E-F004` | `Design Impact`: no supported clean-standalone launch profile | **Resolved at the launch boundary**: a clean package-owned Codex/Luna baseline creates an attached binding and real team run; both exact Brief members use `codex_app_server` / `gpt-5.6-luna`; no missing-model/profile error occurs | `api-rev-005-brief-standalone-stall-api.json`, `api-rev-005-brief-standalone-tool-exposure.json`, `api-rev-005-brief-standalone-real-team.log` |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `Fail / 89%`.
- Current result and confidence: `Fail / 87%`.
- New or remaining failure IDs:
  - `APIE2E-BRIEF-003` / `APIE2E-F005`: after 381 seconds the real Brief remains `not_started`, its binding remains `ATTACHED`, and the app has zero projected artifacts. The researcher trace contains 107 events and 36 `run_bash` calls but zero configured `write_file`, `publish_artifacts`, or `send_message_to` calls.
  - `APIE2E-STANDALONE-MCP-001`: an unauthenticated POST to the session-scoped standalone Agent Tools MCP path returns route-not-found `404` rather than reaching the established authorization gate (`401`).
  - `APIE2E-REPO-005`: the whole server suite is broadly red. Exact baseline-versus-regression attribution is not claimed; this is secondary mixed test-validity debt.
- Recommended recipient: `code_reviewer` for focused failure-origin review. Preliminary primary classification is implementation-owned `Local Fix`: Studio registers `registerAgentToolsMcpRoutes(app)`, while the standalone composition omits the route that `AgentToolMcpSessionService` advertises. The broad-suite diagnostic remains `Unclear`.
- Remaining risks, blocked evidence, or untested scope: full standalone researcher-to-writer completion, real Studio/standalone Luna provider/team/event/artifact parity, immutable dual-host digests, fresh Studio remount/reload, worker recovery, graph isolation, and the remaining maintained-app live command matrix await failure-origin resolution and rerun. The environment and provider were available; cleanup is complete.

### API-REV-006 — Standalone route mounts; package Codex descriptor still loses graph-local definition authority

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 6 after `CRR-017` source-review Pass for `IR-010`.
- Triggering finding or scenario IDs: prior `APIE2E-STANDALONE-MCP-001` and `APIE2E-BRIEF-003` / `APIE2E-F005`; new `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` and durable `APIE2E-CODEX-AUTH-001`; independent `APIE2E-REPO-005` remains `Unclear`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-008`; `SR-009`; `ARCH-REV-007` withdrawn/superseded; `IR-010`; `CRR-015`–`CRR-017`; `API-REV-005`; delivery `N/A`.
- Why this revision was recorded: rechecked the exact standalone route first, then used the actual package-owned run descriptor/tool inventory as required. The route fix passes, but the real run has no Agent Tools descriptor because the Codex bootstrapper resolves package configuration through a process-global agent-definition service.
- Coverage decisions or durable test paths changed: extended `autobyteus-server-ts/tests/unit/application-platform/application-run-authorities.test.ts` with one direct identity assertion for the exact graph-local `AgentDefinitionService` used by the Codex bootstrapper. It fails 1/1. All prior API/E2E-owned durable changes and the two stale removals remain preserved.
- Scenarios added, changed, removed, or rechecked: `APIE2E-STANDALONE-MCP-001` rechecked and resolved at 13/13; real `APIE2E-BRIEF-003` rerun on a fresh root; `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` and `APIE2E-CODEX-AUTH-001` added and failed; the remaining live matrix stopped. `APIE2E-REPO-005` was not rerun or reclassified.
- Commands, environment, fixture, or broader-validation delta: focused two-file route selection; server/devkit/Brief build/validate/typecheck; real Brief standalone on 43124 with `--no-open`; system Chrome; real Codex App Server and Luna; exact active-run/heap/session inspection; actual Codex tool inventory; trace/SQLite/hash/process correlation; full owned cleanup.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-STANDALONE-MCP-001` / route portion of `APIE2E-F005` | `Local Fix`: standalone returned static/generic 404 | **Resolved**: standalone now mounts the existing registrar; focused composition and route suites pass 13/13 with established authorization/session behavior | `api-rev-006-standalone-mcp-focused.log` |
| Business consequence portion of `APIE2E-F005` | Eligible Agent Tools unavailable; exact downstream cause not yet proven | **Not resolved; superseded by exact `APIE2E-F006` origin evidence**: route is present, but actual descriptor is null before tool-list because the Codex bootstrapper uses the wrong definition authority | actual-run state, actual-tools/workaround, authority regression, and source-correlation evidence |

- Expected versus observed: expected a non-null descriptor and actual `tools/list` containing eligible `publish_artifacts` and `send_message_to`; observed `appServerConfig=null`, empty Agent Tools session lists, AutoByteus server absent, and zero calls to either eligible tool. Codex/Claude-native `write_file` was not required.
- Invalid semantic end state: the model created files with `run_bash` and directly wrote the app SQLite tables. The resulting two artifacts and `in_review` status are preserved as failure evidence but rejected as publication/handoff proof.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Prior result and confidence: `Fail / 87%`.
- Current result and confidence: `Fail / 88%`.
- New or remaining failure IDs: `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` / `APIE2E-CODEX-AUTH-001`; AC-005 and AC-006. `APIE2E-REPO-005` remains independent `Unclear`.
- Preliminary classification and recommended recipient: implementation-owned `Local Fix`, centered on the missing graph-local Codex backend/bootstrapper definition authority; `code_reviewer` for focused failure-origin analysis. No Claude-specific change is requested without evidence.
- Remaining risks and untested scope: real authenticated publication and teammate handoff, Studio/standalone completion parity, remount/reload, full maintained app command matrix, worker recovery, graph isolation, and complete dual-host digest proof. Package and authoring hashes were unchanged 69/69 and cleanup is complete.


### API-REV-007 — Graph-local Codex descriptor and handoff pass; default publication authority loses graph-local member runs

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 7 after `CRR-019` source-review Pass for `IR-011`.
- Triggering finding or scenario IDs: prior `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` / `APIE2E-CODEX-AUTH-001`; new `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007`; independent `APIE2E-REPO-005` remains `Unclear`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `IR-011`; `CRR-018`; `CRR-019`; `API-REV-006`; delivery `N/A`.
- Why this revision was recorded: rechecked the exact graph-local Codex authority failure first, then required the actual package member descriptor/tool inventory, real eligible publication and communication calls, writer handoff/run, and app-owned projection. IR-011 resolves the descriptor/tool-list boundary, but the now-reachable publication adapter rejects both exact graph-local members as inactive.
- Coverage decisions or durable test paths changed: no durable file changed in round 7. The preserved exact authority regression now passes, and route/composition coverage remains valid. Existing route-backed publication coverage is classified `Still Valid but insufficient` because it injects a service that already owns the fake active run. A default-provider-to-application-graph functional regression is required after focused owner/design-impact classification.
- Scenarios added, changed, removed, or rechecked: `APIE2E-CODEX-AUTH-001` and `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` rechecked and resolved; `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` added and failed; package immutability/cleanup rechecked; remaining conditional live matrix stopped. `APIE2E-REPO-005` was not rerun or reclassified.
- Commands, environment, fixture, or broader-validation delta: focused seven-file Vitest selection (`5 files / 40 tests` pass; `2 files / 14 environment-gated tests` skip); server/devkit/Brief build/validate/typecheck; real Brief standalone on port 43124 with `--no-open`; fresh owned data; installed system Chrome; actual Codex App Server/Luna researcher and writer; actual authenticated Agent Tools catalogs/calls; app/platform SQLite, browser, source, hash, and cleanup correlation.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-CODEX-AUTH-001` / `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` / `CR-014` | `Local Fix`: Codex bootstrapper used global instead of graph-local package definition authority, producing no Agent Tools descriptor | **Resolved**: exact authority test passes; both actual member threads connect to 3/3 MCP servers, list 86 tools, and expose `publish_artifacts` and `send_message_to` | `api-rev-007-focused-authority-route.log`, `api-rev-007-actual-tools-dispatch.json` |

- Expected versus observed: expected both exact members to publish through Agent Tools and project into Brief state after the researcher handed off to the writer. Observed two successful roster handoffs and a real writer run/thread, but three researcher and two writer publication calls all return `publish_artifacts_failed` because the graph-local member is reported inactive; the application remains `not_started` with zero artifacts/revisions and an empty platform publication journal.
- Validity constraint: runtime-created files are not counted as publication. No direct file or SQLite operation is accepted as publication, handoff, or projection proof.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Prior result and confidence: `Fail / 88%`.
- Current result and confidence: `Fail / 88%`.
- New or remaining failure IDs: `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007`; AC-005/006. `APIE2E-REPO-005` remains independent `Unclear`.
- Preliminary classification and recommended recipient: implementation-owned `Local Fix`, subject to `code_reviewer` focused failure-origin review and possible design-impact reclassification. Source evidence correlates the default Agent Tools publication provider to the cached process-global publication service/manager while the application graph already owns a separate graph-local publication authority.
- Remaining risks and untested scope: successful real publication/projection, Studio/standalone completion parity, remount/reload, full maintained app command matrix, worker recovery, graph isolation, controlled-browser prerequisite repetition, and complete dual-host digest proof. Package/authoring hashes are unchanged 69/69 and cleanup is complete.

### API-REV-008 — Graph-owned publication and shutdown pass in both real hosts

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 8 after `CRR-022` source-review Pass for `IR-013` and cumulative `IR-012` publication authority.
- Triggering finding or scenario IDs: prior `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007`; graph shutdown/lifecycle acceptance from `CR-015` / `CR-016`.
- Related revision IDs: `SR-010`; `ARCH-REV-008`; `IR-012`; `IR-013`; `CRR-020`–`CRR-022`; `API-REV-007`; delivery `N/A`.
- Why recorded: rechecked the prior critical publication failure first, reconciled explicit dependency/lifecycle fixtures, proved the exact process/application scope and shutdown boundaries, and completed the retained real dual-host validation matrix.
- Durable coverage delta: added `agent-tools-mcp-process-authority.test.ts` and `application-run-shutdown-authority.test.ts`; updated application run-authority, lifecycle, graph-isolation, Agent Tools route, standalone composition, and mixed-member session-cleanup tests. No round-8 removal. All cumulative API/E2E-owned server paths pass `21 files / 63 tests`; selected-resource Nuxt passes `3 files / 7 tests`; devkit passes `19/19`.
- Execution delta: server build/typecheck; Brief/Socratic build/validate/backend typecheck; fresh real Brief standalone publication/handoff/projection; active team/member stop and host restart/new-run completion; exact package hashes; real Studio setup/iframe remount and real publication parity; Chrome prerequisite and cleanup.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` / `CR-015` | Implementation-owned graph publication authority mismatch | **Resolved**: real researcher/writer authenticated publication succeeds, named writer handoff succeeds, app revisions/projected outputs exist, and Brief reaches `in_review` | `api-rev-008-actual-tools-dispatch.json`, standalone state/browser evidence |
| `CR-016` graph-owned shutdown | Source fixed; executable pending | **Resolved**: direct idempotent team-before-agent shutdown/lifecycle coverage passes; live active stop clears children/listeners; restart allocates a new run and completes | shutdown/lifecycle logs; active-stop/restart evidence |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Prior result and confidence: `Fail / 88%`.
- Current result and confidence: `Pass / 97%` (`97.3%`).
- Broader validation: `Required — completed`.
- New or remaining failure IDs: none for the current requirement-linked scope. `APIE2E-REPO-005` remains a separate historical `Unclear` whole-suite diagnostic and is not attributed to IR-012/IR-013 or used as pass evidence.
- Residual risks: a raw old bearer descriptor was deliberately not retained for live replay; exact application revocation/general-process survival/process clear is covered directly against the real registry authority. Nuxt warmup emitted transient `#app-manifest` diagnostics but the ready signals and full Studio journey passed.
- Recommended recipient: `code_reviewer` for the separate proportional durable-test review before delivery.

### API-REV-009 — Integrated lifecycle passes; atomic development package metadata mutates

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; delivery re-entry from `DR-001`; API/E2E round 9 after `CRR-024` source-review Pass for `IR-014`.
- Triggering finding or scenario IDs: `DR-001`; new `APIE2E-PARITY-005` / `APIE2E-F008`; historical `APIE2E-REPO-005` remains separate `Unclear`.
- Related revision IDs: `IR-014`; `CRR-024`; `API-REV-008`; `CRR-023`; `DR-001`.
- Why recorded: performed mandatory post-integration execution of the latest-base event-pipeline lifecycle, the supported same-process standalone watch restart, proportional real dual-host journeys, maintained commands, cleanup, and package-integrity gates.
- Durable coverage delta: updated `autobyteus-application-devkit/tests/application-devkit.test.mjs` with one non-fake atomic-pack metadata regression. It currently fails at the exact canonical-path assertion (`19 pass / 1 fail`). No test was removed.
- Execution delta: exact lifecycle `3/3`; integrated server `25 files / 90 tests`; server no-emit/full build; selected Nuxt `3 files / 7 tests`; Brief/Socratic build/validate/typecheck; real same-process active stop/restart and token persistence; real standalone and Studio publication/handoff/projection; Studio iframe remount; 73-path pre/post digest comparison; cleanup.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `DR-001` integrated event-pipeline lifecycle failure | latest-base integration failure; implementation local fix | **Resolved**: exact unchanged unit/SQLite lifecycle tests pass; real public host watch restart drains accepted work and creates a fresh accepting pipeline only at the next start | `api-rev-009-latest-base-lifecycle.log`, watch restart/token evidence |

- Expected versus observed: expected all 73 package/authoring paths to retain identical bytes after supported standalone watch and Studio development loops. Observed 72/73 identical; the canonical package README changes its absolute path from `dist/importable-package` to randomized `dist/.pack-staging-<uuid>`.
- Source correlation: atomic packaging builds with the staging root as `outputPackageRootOverride`; the package assembler serializes that temporary root into README before rename.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Prior result and confidence: `Pass / 97%` (`API-REV-008`).
- Current result and confidence: **Fail / 94%**.
- New or remaining failure IDs: `APIE2E-PARITY-005` / `APIE2E-F008` against AC-001/AC-011. `APIE2E-REPO-005` remains separately `Unclear`.
- Recommended recipient: `code_reviewer` for focused failure-origin review; preliminary bounded `Local Fix`, implementation owner.
- Remaining risks / untested scope: the failed exact package-integrity gate blocks delivery. All selected lifecycle, repository, dual-host real publication/remount, maintained-command, and cleanup paths otherwise pass.

### API-REV-010 — Canonical atomic metadata restores exact dual-host package parity

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 10 after `CRR-026` source-review Pass for `IR-015`.
- Triggering finding or scenario IDs: prior `APIE2E-PARITY-005` / `APIE2E-F008` against AC-001/AC-011; historical `APIE2E-REPO-005` remains separate `Unclear`.
- Related revision IDs: `API-REV-009`; `CRR-025`; `IR-015`; `CRR-026`; delivery `DR-001` remains execution-confirmed resolved.
- Why recorded: rechecked the exact atomic metadata failure first, then proved the canonical/final root distinction through the real maintained standalone and Studio development pack loops, proportional normal/failure probes, and final cleanup.
- Coverage decisions or durable paths changed: no new round-10 test edit. The API-REV-009 addition in `autobyteus-application-devkit/tests/application-devkit.test.mjs` remains the cumulative API/E2E-owned durable delta and now passes. No test was removed.
- Scenarios rechecked: atomic regression first; `APIE2E-PARITY-005` / `APIE2E-F008`; default pack; explicit `pack --out`; validation-before-rename; injected publish rollback; scratch/process/data cleanup. Unchanged API-REV-009 runtime/browser/publication evidence was retained proportionately.
- Execution delta: atomic 1/1; full devkit 20/20; Brief baseline build/validate; real repeated standalone `dev` and Studio `dev:studio`; five 73-path comparisons; normal/explicit CLI pack/validate; pre-rename and rollback probes; final cleanup/diff audit.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-PARITY-005` / `APIE2E-F008` | bounded implementation-owned atomic metadata defect; README serialized randomized staging root | **Resolved**: durable atomic regression passes and standalone initial/repeated plus Studio initial/repeated comparisons are each 73/73 byte-identical; README always identifies the canonical final root | `api-rev-010-atomic-metadata-regression-first.log`; `api-rev-010-parity-comparison-summary.log`; baseline and four post-host hash logs; full-suite log |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Prior result and confidence: `Fail / 94%` (`API-REV-009`).
- Current result and confidence: **Pass / 98%** (`98.3%`).
- Broader validation: `Required — completed` through supported maintained standalone and Studio command loops.
- New or remaining failure IDs: none for the current requirement-linked scope. `APIE2E-REPO-005` remains a separate historical `Unclear` diagnostic and is not attributed or used as pass evidence.
- Residual risk: failure-only uniquely named staging scratch persists until caller/harness cleanup; the probe recorded and removed it, while canonical validation-before-rename and rollback were exact. No successful command path left scratch.
- Recommended recipient: `code_reviewer` for separate proportional review of the changed durable devkit test before delivery resumes.

### API-REV-011 — Corrected framework vocabulary preserves complete real dual-host behavior

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 11 after `CRR-029` source-review Pass for `IR-016`.
- Triggering finding or scenario IDs: `CR-018`; new validation IDs `APIE2E-RENAME-001`, `APIE2E-EXPORT-001`, `APIE2E-ROUTE-011`, `APIE2E-STANDALONE-011`, `APIE2E-STANDALONE-RESTART-011`, `APIE2E-STUDIO-011`, `APIE2E-STUDIO-REMOUNT-011`, `APIE2E-STUDIO-RECOVERY-011`, `APIE2E-PARITY-011`, and `APIE2E-CLEANUP-011`. Historical `APIE2E-REPO-005` remains separate `Unclear`.
- Related revision IDs: `SR-011`; `ARCH-REV-009`; `IR-016`; `CRR-028`–`CRR-029`; `API-REV-010`; delivery artifacts retained but no new delivery re-entry finding.
- Why recorded: reconciled every IR-016 durable test rename/update, verified the strengthened zero-run runtime-build assertion, and performed the architecture-required proportionate executable proof across both production hosts, internal/external MCP separation, real publication/handoff, restart/recovery, parity and cleanup.
- Coverage decisions or durable paths changed: no API/E2E-owned durable file changed in round 11. IR-016 modifies eleven server test paths: updates six current paths; cleanly renames four role files; and replaces runtime-graph-isolation with runtime-isolation while strengthening zero agent/team run creation during two runtime builds. The complete IR-016 durable test delta is the required proportional-review surface.
- Repository execution: server TypeScript no-emit and full build pass; exact renamed/adjacent selection passes `11 files / 34 tests`; built root export smoke exposes current builders and excludes the retired Studio export; maintained devkit/Brief build and Brief validation pass.
- Real standalone execution: internal route retains `401 unauthorized` / `404 session_unavailable`, external `/mcp/gateway` remains absent, exact package Codex/Luna team completes two real Briefs across a host stop/restart, actual researcher publication and recipient-name writer handoff succeed twice, writer publication succeeds twice, and application projection reaches `in_review`, two outputs and one final.
- Real Studio execution: internal route behavior remains intact and Studio-only `/mcp/gateway` initializes; exact package team/setup/iframe completes a real Brief with publication/handoff/projection; a corrected semantic probe changes the explicit remount launch ID while retaining one iframe; stop/restart restores the mixed team and persisted Brief projection.
- Harness note: the first combined Studio probe passed the business-run assertion but timed out because it searched directly for a Reload button hidden behind the immersive-controls trigger. The failure was preserved. A targeted corrected probe opened the panel and passed the exact remount assertion; no production or durable test change was required.
- Package and cleanup: exact 73-path SHA-256 parity passes after standalone, after Studio/remount, and after both restart/recovery cycles. Ports 43125/8000/3000/9229, API-owned data/temp roots and matching processes are clear; `git diff --check` passes. A pre-existing user-owned 43124 process/data set was excluded and ended independently before the final audit.

#### Prior Failure Resolution

No prior API/E2E failure was open. `CR-018` was source-resolved by IR-016 and is now execution-confirmed across the complete changed dual-host boundary.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Prior result and confidence: `Pass / 98%` (`98.3%`, API-REV-010).
- Current result and confidence: **Pass / 99%** (`98.9%`).
- Broader validation: **Required — completed** with real isolated standalone and Studio browser journeys.
- New or remaining failure IDs: none for the requirement-linked IR-016 scope. `APIE2E-REPO-005` remains separately `Unclear`, unconnected and unused as pass evidence.
- Residual risks: one transient real-model `run_bash` failure recovered before required publication/handoff completion. The initial Studio reload locator error was isolated to temporary harness setup and corrected with direct semantic proof. Neither is a product blocker.
- Recommended recipient: `code_reviewer` for the separate proportional review of the IR-016 durable test rename/update delta before delivery resumes.

### API-REV-012 — Acyclic narrow owners preserve worker recovery, exact cleanup, and real dual-host behavior

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`; API/E2E round 12 after `CRR-033` source-review Pass for `IR-018`.
- Triggering finding or scenario IDs: SR-013 / `AC-019`–`AC-023`; `CR-019`–`CR-022`; new validation IDs `APIE2E-REPO-012`, `APIE2E-WORKER-012`, `APIE2E-STANDALONE-012`, `APIE2E-STUDIO-012`, `APIE2E-ROUTES-012`, `APIE2E-PARITY-012`, and `APIE2E-CLEANUP-012`. Historical `APIE2E-REPO-005` remains separate and unattributed.
- Related revision IDs: `SR-013`; `ARCH-REV-010`–`ARCH-REV-011`; `IR-017`–`IR-018`; `CRR-030`–`CRR-033`; `API-REV-011`.
- Why recorded: reconciled the stale durable fixtures left by the clean removal of `ApplicationEngineHostService`, executed the IR-018 stop-all continuation gate, and proved the complete SR-013 behavior-neutral architecture through current repository coverage and real standalone/Studio execution.
- Durable coverage delta: added one shared real narrow application-engine integration runtime; updated eleven test files to use current controller/launcher/gateway/availability/reentry/delivery-queue/event-mapper/active-run-reader/four-projection contracts; removed no assertion or test. The IR-018 `agent-run-manager.test.ts` delta was reconciled and executed but not modified by API/E2E.
- Repository execution: IR-018 selection 5 files / 22 tests; requested migrated group 6 files / 15 tests; availability/relay 2 files / 10 tests; final affected selection 31 files / 116 tests; server TypeScript no-emit/full build; devkit 20/20; frontend SDK build; maintained Brief/Socratic build, validate, and backend typecheck all pass. Retired broad-host scan and `git diff --check` pass.
- Real standalone execution: a controlled browser started the package-owned Codex/Luna team. The exact application worker was terminated while the provider run and binding were active; a replacement worker appeared, actual researcher/writer `publish_artifacts` plus recipient-name `send_message_to` succeeded, and the app reached `in_review` with two projected artifacts. Two additional team runs were active at graceful stop; all owned listeners/worker/Codex children exited. Same-data restart restored recorded teams and app records, a new generation completed, and a pre-restart Agent Tools session returned `404 session_unavailable`.
- Real Studio execution: the exact Brief Studio Team and researcher/writer Codex/Luna defaults were visible and valid; one iframe mounted; actual publication/handoff/projected artifacts completed. Explicit host-controls reload changed the iframe launch ID from 1 to 2 while retaining exactly one iframe and the completed app projection.
- Route/parity/cleanup: both internal Agent Tools routes return the established unauthenticated 401; standalone external gateway is absent at 404; Studio gateway initializes at 200. Exact 73/73 pre/post SHA-256 rows match. Ports, owned processes, isolated data roots, and temporary harnesses are clear; unrelated user processes were preserved.

#### Prior Failure Resolution

No prior API/E2E failure was open. `CR-022` was source-resolved by IR-018 and is now execution-confirmed through the focused stop-all continuation tests, active multi-run host stop, same-data recovery, and leak-free cleanup. The stale broad-host test fixtures were API/E2E-owned test-validity issues, not production failures.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this revision record.
- Prior result and confidence: `Pass / 99%` (`98.9%`, API-REV-011).
- Current result and confidence: **Pass / 97%** (`96.6%`).
- Broader validation: **Required — completed** with real isolated standalone and Studio browser/process journeys.
- New or remaining failure IDs: none for the current requirement-linked scope. `APIE2E-REPO-005` remains separately `Unclear`, unconnected, and unused as pass evidence.
- Residual risks: live artifact-drain ordering is correlated with direct durable delivery/lifecycle tests rather than an external queue hook; Studio used isolated alternate ports to preserve the user-owned 8000 listener. Neither is a material acceptance gap.
- Recommended recipient: `code_reviewer` for the separate proportional review of the one added helper, eleven updated durable tests, and the reconciled IR-018 manager regression before delivery resumes.
