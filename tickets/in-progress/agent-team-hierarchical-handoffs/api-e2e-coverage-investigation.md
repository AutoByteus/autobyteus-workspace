# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/team-run-canonical-identity-refactor.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/nested-classroom-live-validation-contract.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-collaboration-system-instruction.md` (SR-014 cumulative visibility only; unimplemented and outside this round)
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- Delivery Revision Record (lineage context only): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-003`, `DR-004`; `DR-004` was resolved by `SR-012` / `ARCH-REV-007` / `IR-005` and is not a current API/E2E blocker.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-019` (`Pass / 97%`; prior `API-REV-018` completed `Fail / 91%` with product/runtime Pass and environment-safety Fail).
- Current Investigation Round: `19` (CRR-039 fail-closed environment local correction and retained product-proof reissue).
- Trigger: `CRR-039` confirms `CR-F-022` / `API-ENV-F-018-001` as an API/E2E-owned environment defect. The raw built-server launch inherited ambient `DATABASE_URL`; a new round must use `test-support/live-e2e/test-runtime-bootstrap.mjs`, prove the target before any migration-capable spawn, retain post-listen exact-path `lsof`, and preserve both operational incident disclosures.
- Prior Investigation Reviewed: round 4 / `API-REV-004`, which proves `SR-006` only. It is historical context, not SR-012 evidence.
- Latest Authoritative Investigation: this file and completed `API-REV-019` result.
- User execution clarification (2026-08-09): real provider testing is mandatory. Use the repository `pnpm secrets:import` flow to import `/Users/normy/.autobyteus/server-data/.env` into an absolute disposable test environment before the live matrix; never print secret values or mutate the user's operational environment.
- User real-browser clarification (2026-08-09): do not limit validation to repository/API probes. Through the real frontend, create standalone Agents and AgentTeams, launch and interact with them, and verify the Agent/Team hierarchy, runtime selection, execution, messaging/task/history-visible behavior, and absence of material browser errors for AutoByteus, Codex App Server, and Claude Agent SDK. This is additive to the imported nested-classroom three-runtime contract, not a replacement for it.

## API-REV-019 CRR-039 Fail-Closed Environment Correction Investigation

This section is recorded before any API-REV-019 support-code edit, final execution, or result reroute. API-REV-019 will not change product source or the six pending durable frontend paths unless the environment correction exposes a distinct validity issue.

### Prior result and exact correction boundary

- `API-REV-018`: overall `Fail / 91%`; product/runtime `Pass`; environment safety `Fail`.
- `CRR-039`: `Fail — Local Fix`; owner `api_e2e_engineer`; finding `CR-F-022` / `API-ENV-F-018-001`.
- Failure origin: direct `node dist/app.js` inherited ambient `DATABASE_URL`. `--data-dir` does not override explicit process environment configuration. The checked-in safe owner already exists in `test-support/live-e2e/test-runtime-bootstrap.mjs`.
- Product state: unchanged at HEAD `33b9b1e28e1c7f666dffdbcd349d394b2bfef875`. CRR-039 explicitly retains API-REV-018's six clean real browser/provider rows and resolution of `API-F-011` / `API-F-012` if relevant state remains unchanged.

### Coverage and execution decisions

| Surface | API-REV-019 validity decision | Required action |
| --- | --- | --- |
| `startBuiltTestServer` and `createSanitizedTestEnvironment` | `Still Valid / Required Owner` | Use the checked-in wrapper, never a raw server launch. Exercise it against a fresh owned runtime root/database. |
| Pre-spawn environment | `Add Executable Evidence` | With ambient database variables present or possible, prove the actual child environment contains neither `DATABASE_URL` nor `DATABASE_URL_TEST`. Record presence booleans only, never inherited values. |
| Materialized runtime `.env` | `Add Executable Evidence` | Parse the fixed assignment and require one exact absolute disposable SQLite URL. Fail before spawn on mismatch, duplicate, missing, non-file, or unsafe path. |
| Configuration-only target resolution | `Add Executable Evidence` | In a sanitized child that imports only built `AppConfig`, initialize against the owned runtime root, assert the exact operational database URL, and prove the database file remains absent before/after. No Prisma/client/server initialization is allowed in this preflight. |
| Schema and secret preparation | `Fresh Safe Execution` | After the preflight, run Prisma migration and actual `pnpm secrets:import` only with the exact disposable target and sanitized environment. Do not capture secret values. |
| Post-listen target | `Fresh Safe Execution` | Start through `startBuiltTestServer`; after listen and before GraphQL mutation, require PID `lsof` to contain the exact owned database and contain no operational path. Then run a public GraphQL health query and stop cleanly. |
| API-REV-018 product/browser evidence | `Retain / Reissue` | Verify production/test source hashes and HEAD are unchanged. Retain the six fresh AutoByteus/Codex/Claude browser rows rather than spending provider calls to repeat an unchanged product boundary. |
| Six pending durable frontend paths | `Still Valid / Recheck` | Rerun the exact focused/affected web selections. No new durable support delta is planned. Return the cumulative six-path package for proportional review only after overall Pass. |
| Operational database incidents | `Preserve / No Action` | Keep API-REV-014 and API-REV-018 disclosures. Do not inspect, copy, repair, roll back, delete, or otherwise act on the operational database. |

### Pass gate and planned confidence

API-REV-019 may pass only if every pre-spawn assertion passes before any database-capable child, the fresh imported secret target is exact, post-listen `lsof` confirms only the owned database, the safe server health check and cleanup pass, current product/durable hashes remain unchanged, and the focused/affected durable selections remain green. Any operational target reference is an immediate Fail and stop. The user-held `60004/31004` stack must remain untouched.

Initial confidence: `74%`. Product confidence remains high from API-REV-018, but environment confidence remains below the pass floor until the new preflight and fresh safe server setup complete.

### Final API-REV-019 investigation update

The CRR-039 correction plan is complete and passes without a product-source or new durable-coverage change.

- **Pre-spawn target proof:** while the parent shell still had an ambient `DATABASE_URL`, `createSanitizedTestEnvironment()` produced the actual child-environment shape with neither `DATABASE_URL` nor `DATABASE_URL_TEST`. `materializeTestRuntime()` wrote exactly one absolute disposable URL for `sr015-api-rev-019-20260810-1.db`. A separate sanitized, configuration-only built `AppConfig` child resolved the same absolute file path while that database was absent before and after, proving target selection without Prisma or database initialization. The first temporary assertion compared equivalent `file:///...` and normalized `file:/...` spellings lexically; it failed closed before database creation and was corrected to compare resolved file paths. Both attempts are retained.
- **Fresh database and vault:** Prisma schema migration and the real TTY `pnpm secrets:import` used only the exact disposable database. The importer configured nine identifiers from `/Users/normy/.autobyteus/server-data/.env` without logging values. A read-only dry-run after import reported `READY`, nine `SKIP_CONFIGURED`, and zero blocked/replaced entries.
- **Safe server start and secondary target guard:** the built server was started only through `test-support/live-e2e/test-runtime-bootstrap.mjs` `startBuiltTestServer` on `127.0.0.1:60019`. After listen, PID `46829` had the exact disposable database open and no `/Users/normy/.autobyteus/server-data/db/production.db` reference. Public GraphQL returned all three runtimes enabled. The owned server stopped cleanly and port `60019` closed.
- **Retained product proof:** HEAD remains `33b9b1e28e1c7f666dffdbcd349d394b2bfef875`; relevant production source has no worktree delta; all six pending durable path hashes match the API-REV-018 baseline; and all `110` API-REV-018 evidence-manifest entries verify. CRR-039 permits retaining the unchanged six real browser/provider rows, so no provider calls were repeated merely to correct the launcher environment.
- **Fresh repository recheck:** exact task DTO/tree/component coverage passes `5 files / 26 tests`; affected web coverage passes `7 / 60`; launcher/cadence coverage passes `2 / 43`. The real import commands rebuilt the production server and repeated the sanitized bootstrap smoke successfully. One initially malformed web command inserted an extra `--` and entered the known non-clean whole-web suite; it is explicitly non-authoritative, and the exact intended selections were immediately rerun cleanly.
- **Cleanup:** the checked `removeOwnedTestRuntime` boundary removed only API-REV-019's disposable runtime root, database, adjacent vault key, and journal files. Owned ports `60019/31019` are closed. The user-held `60004/31004` stack remains on PIDs `71461/73207` and was not stopped, restarted, repointed, or mutated.
- **Operational incident preservation:** API-REV-014's production-database mutation and API-REV-018's inherited-target incident remain disclosed. API-REV-019 did not inspect, repair, copy, delete, roll back, or otherwise act on the operational database.
- **Durable coverage disposition:** API-REV-019 adds, updates, and removes no new repository-resident durable coverage. The unchanged cumulative pending package remains the `3 added / 3 updated / 0 removed` web paths created in API-REV-018; the new 61-row inventory and exact six-file patch return through proportional review now that the overall API/E2E result passes.

Final confidence scorecard: requirement proof `98%`; direct changed-boundary execution `98%`; cross-boundary realism `97%`; environment/configuration/identity/fixture fidelity `98%`; failure/lifecycle/recovery `96%`; user-surface/browser confidence `98%`; durable coverage quality `96%`. Arithmetic mean `97.3%`, reported as `97%`. No category is below `90%`; every critical acceptance criterion is directly proven. Broader validation decision: `Required and completed` through the fresh fail-closed environment startup, while the unchanged product/browser/provider result is retained with hash verification.

## API-REV-018 IR-021 Post-Fix Visible Delegated-Task Coverage Investigation

This section was written before any API-REV-018 repository-resident durable coverage edit, removal, final execution, or failure reroute. The user-held stack on `127.0.0.1:60004` / `127.0.0.1:31004` remains user-owned and must not be stopped, repointed, or used as the authoritative clean post-fix environment. A separate isolated database, application-data root, vault, server port, frontend port, and browser context are required.

### Upstream and prior-failure recheck

- `CRR-038` is an implementation-source Pass, not downstream proof. It reports exact DTO projection of Apollo metadata, strict surplus-field rejection, one recursive task-execution tree, distinct task Agent/task AgentTeam nodes, exact focus, persisted non-terminal restore, and terminal subtree cleanup.
- `API-REV-017` is the required first recheck: the same captured Apollo task records must no longer normalize to zero; the real Team panel must show task count/content/status; and the hierarchy must show task execution rows distinct from persistent members.
- `API-REV-016` backend/provider task lifecycle and CRR-036 durable review remain valid historical evidence, but neither substitutes for new user-surface execution after IR-021.

### Current coverage inventory and validity decisions

| Coverage / required surface | Initial validity decision | Current evidence / gap | API-REV-018 action |
| --- | --- | --- | --- |
| `taskDelegationGraphqlDtoProjection.ts` through `taskDelegationHydrationService.ts` | `Add Durable Coverage` | IR-021 and CRR-038 used temporary probes. No repository test imports the new DTO projector. Existing Team task fixtures call the Pinia store directly with plain manually shaped objects, so they still bypass Apollo `__typename`. | Add one current-contract durable test using the captured real three-record Apollo shape. Prove projection of record/taskRun/update addresses, successful store hydration, expected-only `__typename` removal, and rejection of `memberPath` or unknown surplus metadata. |
| `teamTaskExecutionTree.ts`, event router, task-Agent/task-Team projectors | `Add / Replace Durable Coverage` | Current production source is new, but the existing `teamTaskTeamExecutionProjection.spec.ts` and `teamTaskExecutionEventRouter.spec.ts` still build removed `memberPath`, `memberRouteKey`, and old snake-case task payloads. They are stale and cannot be accepted as IR-021 authority. | Add current exact-address tree coverage for a direct task Agent, an outer task Team, a two-level nested task Team chain, full child execution addresses/contexts, persistent-tree immutability, exact focus, event detail/status/timeline, and terminal subtree cleanup. Reclassify obsolete specs explicitly before changing/removing them. |
| Persisted refresh/restore | `Add Durable Coverage` | `teamTaskExecutionRestore.ts` is new and has no direct current test. | Prove non-terminal active/awaiting-review records restore exact projections after hydration/refresh, accepted records do not restore, nested chains restore parent-before-child, and duplicate restore is idempotent. |
| Team task panel and workspace transient rows | `Needs Current Integration Coverage` | Existing component specs contain useful UI assertions but are manually seeded with removed route/path fields. They missed API-F-011/API-F-012. | Add or update a boundary-level current component/store integration test that starts from Apollo DTOs/current `AgentTeamContext`, asserts human count, details, task Agent and nested task-Team rows, exact selection/focus/open/history identity, status transitions, refresh/restore, and cleanup without persistent-node mutation. |
| Real browser AutoByteus / Codex / Claude rows | `Add Fresh Real Validation` | Pre-fix rows settle tasks but do not prove IR-021 rendering. Reviewer explicitly requires all three current real browser rows. | Use a fresh disposable isolated environment and actual `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`. For each runtime, create a fresh imported nested-classroom Team, prove active and awaiting-review/accepted task count/details, visible nested task-Team row/children and exact selection, refresh/restore behavior where feasible, terminal cleanup, final lifecycle, and provider result. Include at least one visible direct task-Agent journey in the matrix (AutoByteus minimum) with exact task Agent execution selection. |
| Backend/runtime regression selection | `Still Valid / Proportionate Recheck` | IR-021 changes web production only, but real task events and persisted records originate at server boundaries. | Re-run the directly affected server task delegation/streaming selections from API-REV-016, current web focused/affected suites, production server typecheck, Nuxt production build, and exact current source audits. Do not mechanically rerun unrelated historical whole-suite failures as acceptance authority. |
| Strict current identity / no fallback | `Mandatory audit` | The fix must strip only expected GraphQL metadata; no route/path fallback or persistent-node substitution is allowed. | Audit production/tests for new legacy fields, verify surplus-field rejection, compare persistent tree before/after task projection/cleanup, and require exact four-field serialized execution addresses in DOM selection and command/focus behavior. |
| Operational database safety | `Mandatory` | The historical API-REV-014 mutation remains disclosed. The current user-held manual stack is isolated but shared. | Use an independently disposable DB/root/vault and fail closed on exact target mismatch. Never target, open, modify, copy, or roll back `/Users/normy/.autobyteus/server-data/db/production.db`. Preserve the historical disclosure. |

### Initial confidence and broader-validation gate

| Confidence category | Initial score | Reason |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 30% | Both critical user-visible scenarios failed in API-REV-017; source review alone does not close them. |
| Changed-boundary execution directness | 45% | Reviewer temporary probes exercise source, but no API/E2E-owned current durable or browser execution exists post-fix. |
| Cross-boundary integration realism and mock gap | 25% | The original defect existed specifically across GraphQL/Apollo/Pinia/streaming/DOM seams omitted by mocks. |
| Environment, configuration, identity, and fixture fidelity | 50% | A valid isolated recipe exists, but the post-fix environment has not yet been created. |
| Failure, edge-case, lifecycle, and recovery evidence | 30% | Active/awaiting/accepted, refresh/restore, nested chains, and terminal cleanup are pending. |
| User-surface, browser, and desktop-shell confidence | 20% | The latest completed real-browser result is Fail. |
| Durable regression coverage quality and relevance | 20% | Current repository tests do not yet own the two fixed seams. |

- Initial overall confidence: `31%` rounded simple average.
- Broader validation decision: `Required`.
- Selected execution mode: current durable web boundary tests, directly affected server regression, independent isolated built server + Nuxt frontend, and real Chrome/provider journeys for AutoByteus, Codex, and Claude.
- Pass gate: API-F-011 and API-F-012 must both be resolved in the real browser; every critical row must show truthful visible state and exact identity; all three provider rows must complete; no applicable confidence category may remain below 90%; every durable delta must return for proportional review.

### Final API-REV-018 investigation update

The coverage plan is complete. Product behavior passes, but the round is classified overall `Fail / 91%` because environment safety failed before the accepted isolated executions.

- Durable coverage decision: `3 added / 3 updated / 0 removed`. The Apollo DTO/hydration test uses the captured three-record response and proves expected-only `__typename` removal plus strict rejection of `memberPath`. Current event/tree/UI coverage proves distinct task Agent and nested task AgentTeam identities, exact selection, details/timeline, active/awaiting/accepted transitions, persisted restore, idempotence, terminal cleanup, and persistent-tree immutability. Exact current-round and cumulative paths are in `api-e2e-evidence-sr015/api-rev-018/cumulative-durable-coverage-inventory.tsv`.
- Repository execution: focused web `5 files / 26 tests`; affected web `7 / 60`; retained server `48 / 331`; cadence/harness `2 / 43`; production TypeScript, full server build/bootstrap, and Nuxt production build all pass.
- Real browser/provider execution: AutoByteus, Codex App Server, and Claude Agent SDK each pass a fresh test-owned nested task-Team/task-Agent journey with visible count, details, exact task Agent selection, exact task-Team selection, refresh/restore, accepted transitions, and terminal cleanup. Each runtime also passes a fresh staged nested-classroom task-Team UI row. All accepted row browser error counts are zero.
- `API-F-011` and `API-F-012`: resolved downstream. The former is covered through the real GraphQL/Apollo DTO seam; the latter is covered through WebSocket/projected tree/DOM/task detail selection and persisted restore.
- Fixture correction: the imported nested-classroom `student_one` does not expose `delegate_task`; the exploratory request for nested Agent delegation was invalid and is not counted. A test-owned Team with Supervisor -> WorkGroup -> Lead/Worker performs that missing nested-task UI scenario without changing source fixtures.
- Environment preparation: the real TTY `pnpm secrets:import` configured nine secret identifiers from `/Users/normy/.autobyteus/server-data/.env` in the exact disposable SQLite target without capturing values. The accepted server opened only `sr015-api-rev-018-20260810-1.db`.
- Critical environment-safety failure: the first attempted isolated start inherited an ambient `DATABASE_URL` and reached `/Users/normy/.autobyteus/server-data/db/production.db`. Prisma reported no pending schema migrations. The canonical app-data migration then recorded a failed attempt with 203 failed items and startup halted. No rollback, repair, deletion, or row inspection was attempted. This violates the mandatory no-target safety gate and blocks an overall Pass even though every accepted product row is isolated and passes.
- Cleanup: all owned TeamRuns are inactive; ports `60018/31018` are closed; user-held `60004/31004` remain open; the isolated failure root/database is preserved; source fixture hash remains exact and its Git status is clean.
- Final routing: `code_reviewer` for focused origin review of the environment-safety failure and proportional review of the six-file durable coverage delta. Delivery remains blocked.

Final evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-018`.

## API-REV-017 Real-Browser Delegated-Task Visibility Investigation

This section was written before any API-REV-017 repository-resident durable coverage edit, removal, final execution, or failure reroute. No production or durable test file is changed in this round. The prior real-provider rows proved task execution and settlement through backend projections, but they did not semantically assert the visible delegated-task list or transient task execution rows. The user's screenshot makes that omission material rather than residual.

### Requirement and boundary map

| Required behavior / boundary | Initial validity decision | Current evidence and risk | API-REV-017 action |
| --- | --- | --- | --- |
| R-039 / UC-021 / AC-036: production frontend observes delegated tasks and concrete task Agent/AgentTeam executions using canonical execution state | `Fail / Reproduce` | User screenshot shows a successful `delegate_task`, active `task_0003`, persistent Team hierarchy only, and `Tasks 0 tasks`. This is a critical user-surface criterion; API-REV-016 browser screenshots did not assert it. | Reproduce through the running real Nuxt frontend with a fresh imported nested-classroom TeamRun, approve real tools, sample task header/entries/transient rows, and correlate with GraphQL/server state. |
| `getTaskDelegationRecords` -> Apollo -> `taskDelegationStore` -> Team panel | `Needs Boundary Probe` | Current store normalization strictly parses nested `TeamExecutionAddress` values. Existing component/unit fixtures use plain objects and may omit Apollo cache metadata. | Capture actual Apollo response counts and compare plain current records with the same records decorated as Apollo returns them. |
| Task delegation WebSocket event -> task execution projection -> workspace Team tree | `Needs Boundary Probe` | Current projection files contain task-context helpers, but repository coverage is stale at the old route/path shape or does not assert the current browser tree. | Inspect current projection ownership and correlate visible DOM with real events/context warnings. Do not assume a task runtime exists visibly merely because the server started it. |
| Backend task ledger/lifecycle and real provider execution | `Still Valid / Recheck Only` | API-REV-016 proved real task-team execution across providers, but backend success cannot substitute for the missing frontend criterion. | Query the user's exact root TeamRun and the fresh reproduction root to separate missing data from frontend projection loss. |
| Existing broad `TeamStreamingService.spec.ts`, projection fixtures, Team overview/task-entry tests | `Inadequate / Stale Boundary` | The older broad streaming suite is already classified non-authoritative; current task list fixtures are manually shaped and do not cross Apollo serialization; old task projection specs still construct removed path/route fields. | Do not count them as proof. A future implementation round must add current-contract coverage at the real normalization/projection boundary. |

### Planned execution and stop condition

1. Preserve the already running user-requested manual stack on `127.0.0.1:60004` / `127.0.0.1:31004`; it uses the isolated `manual-user-20260810-2` root/database populated by the real `pnpm secrets:import` flow. Do not stop it while the user is testing.
2. Query the user's exact root TeamRun through public GraphQL and verify whether task records and task-Team run identities exist.
3. Create one fresh nested-classroom TeamRun through the real frontend on AutoByteus `gpt-5.6-luna`, invoke and approve `delegate_task`, and sample the visible Tasks count, task summary rows, transient execution rows, Apollo result counts, browser warnings, and screenshot.
4. Use a temporary executable normalization probe only; delete it immediately and make no durable edit before failure-origin review.
5. If a real task record exists but the UI still shows zero / no execution row, record `Fail`, lower the user-surface and durable-coverage confidence categories below 50%, and reroute the cumulative package to `code_reviewer` for focused failure-origin review.

### Initial broader-validation decision

- Decision: `Required`.
- Residual risk: critical visible delegated-task behavior is directly contradicted by the user and was not asserted in the preceding browser matrix.
- Expected evidence gain: determine whether the defect is missing server lifecycle data, GraphQL/Apollo normalization loss, streaming projection loss, or only presentation state.
- Selected mode: real Chrome against the isolated running Nuxt/server stack plus public GraphQL correlation and one deleted-after-use normalization probe.
- Pass gate: impossible unless an active delegated task appears with its details and its task Agent/AgentTeam execution is visibly selectable. Backend success alone cannot satisfy this gate.

### Final API-REV-017 investigation update

The user report is reproduced and the pass gate fails.

- User root `nested_classroom_test_team_2e9666611150438f83f3a45fddf2e8b8`: public `getTaskDelegationRecords` returns three accepted records, `task_0001` through `task_0003`, each with its full description, exact rooted sender/receiver, distinct task-Team run chain, task-run start time, and two submission/review updates. The user's `0 tasks` display is therefore not caused by a missing backend ledger record.
- Fresh browser root: real Chrome launched a new imported nested-classroom Team on AutoByteus `gpt-5.6-luna`, sent a one-task prompt, approved the real tool, and observed a successful `delegate_task`. For every sample from second 1 through 17, the semantic header remained `Tasks 0 tasks`, task summary row count remained `0`, and transient execution row count remained `0`. Raw task-query result counts progressed `[0, 3, 1]`, proving the browser received records while rendering none. Console warnings included `No member context found for message, skipping` four times.
- Exact data-loss seam (`API-F-011`): `taskDelegationStore.normalizeTaskDelegationRecord` sends GraphQL response address objects to `parseTeamExecutionAddress`; that parser rejects any object whose key count is not exactly four. Apollo's real current response includes `__typename` on every nested address. A deleted-after-use Vitest probe passes two controls: the plain current record normalizes non-null, while the same record with Apollo `__typename` normalizes to null. The store then filters the null record, deterministically producing the visible `0 tasks` state.
- Missing execution projection (`API-F-012`): the workspace renders a transient row only for a node with `isTaskExecution`. Current task-Team event routing creates at most an AgentContext keyed by the task execution address and returns `handled`; `ensureTaskTeamExecutionProjection` returns the persistent structural Team node without cloning it or marking it as a task execution. Its projection-update/detail mutators have no production consumer outside their own definitions. The browser and user screenshots both show only persistent hierarchy, consistent with this current source path.
- Existing coverage gap: manually shaped task-list fixtures omit Apollo metadata, and old task projection specs still use removed `memberPath` / `memberRouteKey` / `task_team_run_id` payloads. They are not current browser-boundary proof and did not prevent either defect.
- Environment safety: the running manual server has the isolated `manual-user-20260810-2` application-data root and SQLite database open. Its open-file audit contains zero references to `/Users/normy/.autobyteus/server-data/db/production.db`. The historical API-REV-014 operational mutation remains disclosed and untouched.
- Durable coverage delta in API-REV-017: `0 added / 0 updated / 0 removed`. The temporary probe was deleted and cleanup verified.
- Final outcome: `Fail / 72%`. R-039 / UC-021 / AC-036 are critically failing. `API-F-011` and `API-F-012` require focused failure-origin review; preliminary ownership is bounded frontend implementation plus current-contract durable frontend coverage.

Final evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-017`.

## API-REV-016 Fresh Integrated-State Coverage Investigation

This section was written before any API-REV-016 repository-resident durable coverage edit, removal, final execution, or failure reroute. Initial evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-016/initial-integrated-inventory.log` (SHA-256 `ecd860162a61d9e07a766ec475ad515f9ab4fa4426d725d91a18d45c706c27dc`).

| Existing coverage / required integrated surface | Initial validity decision | Current evidence and risk | API-REV-016 action |
| --- | --- | --- | --- |
| `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | `Needs Update` | The suite is requirement-relevant, but one of sixteen cases constructs removed flat `TeamRunConfig`, `MixedTeamRunContext`, and member-context fields and bypasses the exact schema-v3 rooted fixture. IR-020 reports 15/16 with this sole stale setup failure. | Reproduce first, then retarget only the stale mixed-Claude member-memory case to current rooted `rootTeam`, exact `TeamExecutionAddress`, current AgentRun identity, and current member-context builder boundary while preserving the real memory-directory assertion. |
| API-REV-015 exact cumulative inventory (`53` retained durable paths plus recorded restored dispositions) | `Still Valid / Recheck` | CRR-033 accepted the corrected test code, but all execution predates latest-base integration and IR-020. Test existence and historical results are not current proof. | Re-resolve every retained path against current HEAD, execute all existing server/web test paths, validate the two live-E2E support files and their isolation guard, and publish a new exact cumulative inventory including any round-16 delta. |
| Team WebSocket send, tool approval, and interrupt command selection | `Add / Expand Durable Coverage` pending inventory | CRR-035 proves the production boundary with temporary probes, including persistent, direct task Agent, outer task Team, nested task Team, and invalid chains. Temporary probes do not provide durable regression authority for the public streaming seams. | Inspect current streaming-handler/backend tests. Maintain the smallest boundary-appropriate durable selection that proves the complete unchanged execution address for send/approval/interrupt, exact active-chain routing, leaf revalidation, rejection before effect, and zero persistent fallback. Do not duplicate lower-level proof already durable. |
| IR-018 same-task-Team peer message routing | `Still Valid / Recheck` | API-REV-014 and current source review prove exact peer routing, but pre-integration runtime evidence is historical. | Re-run durable manager/delivery coverage and require fresh real task-peer/submit/review success in every runtime row. |
| Latest-base streaming cadence/coalescing and live harness suites | `Still Valid / Recheck` | IR-020 reports 43/43 implementation-scoped passes; API/E2E must independently execute and preserve exact DB target mismatch rejection. | Run the two guarded suites, syntax/propagation audits, exact disposable database acceptance, distinct safe test-database mismatch rejection, and source-path integrity checks. |
| Migration, provider-instruction, frontend streaming/state, production typecheck/build/bootstrap | `Still Valid / Recheck` | Maintained paths were accepted before integration. The merge can change generated, schema, streaming, and lifecycle seams. | Execute the maintained focused selections, current migration boundary tests, affected web tests, production typecheck, full build/bootstrap, and proportionate broad suites. Classify unrelated whole-suite baseline failures honestly. |
| Imported nested-classroom AutoByteus/Codex/Claude matrix plus standalone Agent and AgentTeam frontend journeys | `Add Fresh Real Validation` | User requires real browser testing for every runtime. Pre-integration rows cannot substitute. | Create a new isolated application-data root, exact disposable SQLite database and vault; run `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` without printing values; fail closed on target mismatch; use fresh server/frontend ports and fresh runs. Through the real frontend, prove standalone Agent creation/execution and imported nested-classroom persistent/task-Team send, approval, interrupt, peer, submit/review, history/state, termination/restore for AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` with medium reasoning, and authenticated Claude. |
| Operational database disclosure | `Mandatory disclosure / Out of execution scope` | API-REV-014 accidentally applied migration `20260801090000_token_usage_member_display_name` and wrote a failed canonical migration record with 203 failures to `/Users/normy/.autobyteus/server-data/db/production.db`. No rollback was attempted. | Never reference, target, open, mutate, copy, or automatically roll back that database in API-REV-016. Record the disclosure unchanged in final artifacts. All accepted evidence must identify the owned disposable DB and target guard. |

### Initial broader-validation gate

Broader validation is **Required**. The changed boundary is a browser/WebSocket-to-TeamRun command selector with task-chain identity, provider runtime behavior, streaming cadence, approval/interrupt lifecycle, and persisted task/history effects. Repository-only and temporary reviewer probes cannot satisfy the user-required current integrated real-provider journeys. A missing credential/runtime/model, inability to import secrets into the exact isolated vault, or database-target mismatch is a `Blocked`/`Fail` condition, never a passing skip.

### Final API-REV-016 investigation update

Every planned coverage decision above is now adjudicated:

- The stale cross-runtime memory fixture was reproduced at `15/16`, updated to exact rooted schema-v3 input, and now passes `16/16`.
- The complete Team command selector has durable current owners at both server streaming and frontend serialization boundaries. Persistent, direct task Agent, outer task Team, nested task Team, invalid/stale, cadence, coalescing, approval, and interrupt cases pass.
- The exact current retained server selection passes `48 files / 331 tests` with zero skips. Current cadence/harness passes `2 / 43`; exact affected web passes `3 / 50`; production typecheck, full build/bootstrap, both built routing probes, removal/registry, launcher/DB guard, and diff audits pass.
- The exact cumulative inventory contains `56` rows: all `53` prior current-delta dispositions plus three newly maintained paths. `54` present paths were revalidated and the two approved removed token-owner tests remain absent. Current API-REV-016 durable delta is `1 added / 3 updated / 0 removed`.
- A real TTY `pnpm secrets:import` configured nine identifiers in the exact disposable SQLite target. Public `LOCAL_PATH` package import discovered the staged nested classroom. Secret values were not retained.
- Through the actual frontend, fresh standalone Agents passed on AutoByteus `gpt-5.6-luna`, Codex `gpt-5.6-luna` medium, and authenticated Claude `sonnet` medium. Fresh imported Team rows on all three runtimes passed rooted topology, intrinsic rules, persistent nested routing, same-task-Team peer routing, exact submission, accepted review, final response, and cleanup; AutoByteus additionally passed terminate/restore/topology/terminate.
- Initial browser automation was not accepted merely because prompt tokens were visible. Public projection reinspection excluded incomplete initial Codex/Claude runs, and fresh authoritative reruns were completed. Claude needed browser-delivered recovery after a task notification collided with an active turn and after a peer replied without recording the requested tool delivery; final public message/task projections prove exact completion. This remains `API-OBS-016-001`, a non-blocking provider timing/recovery observation.
- The unchanged old broad frontend `TeamStreamingService.spec.ts` remains a non-clean, pre-current baseline and is not acceptance authority. Prior whole-server/web non-clean baselines also remain honestly classified rather than converted into Pass. The current proportionate selection and direct real matrix are authoritative.
- Cleanup removed the disposable stage/root/database/vault files and stopped ports/processes. The source fixture is clean. The operational database was never targeted this round.

Final confidence is `95%`; all categories are at least 90%, every critical criterion is proven, and the result is `Pass`. Because four repository-resident durable coverage files changed, the mandatory next route is proportional `code_reviewer` review before delivery.

## Current Requirement And Design Basis

SR-015, including the implemented SR-014 exact collaboration-instruction copy and cumulative SR-013/SR-012 identity and persisted-transition requirements, is authoritative. The validation basis remains R-001–R-048 and AC-001–AC-044. This post-fix round first rechecks BEH-002/BEH-003/BEH-011/BEH-012 and AC-027–AC-030/AC-043 at the child resolved-delivery and task-Team ingress boundaries, then completes the already-required migration/provider/API/frontend/live matrix.

The TeamRun transition now has two non-overlapping record/write owners and one shared migration-only flat decoder. Fresh flat input runs stable `20260517...` to predecessor and then pending `20260801...` to v3. A terminal-success/warning stable record is never reset or rerun; pending `20260801...` converts a predecessor directly or decodes residual/repaired flat input in memory and writes only final v3. `Program Manager` / `program_manager` and `QA Specialist` / `qa_specialist` are the normative safe display/structural divergence. Structural contradictions fail before backup or mutation; canonical retry, v3 idempotence, exact-success startup gating, and strict current readers remain required.

The implementation must have one strict `AgentTeamAddress` authority and one schema-v3 rooted TeamRun snapshot (`rootTeam`) with kind-specific run identifiers. Persistent and restored children share that immutable root tree and absolute addresses; task AgentTeams materialize distinct typed executions without a second local address language. Cross-process/runtime identity is exactly `TeamExecutionAddress {rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}`. Public message and delegation selectors use only `recipient_address`; `get_handoff_rules` and `send_message_to` are intrinsic to Team-bound Agents and preserve the exact LLM-facing instruction/result contract. Nested managers forward unchanged delivery intent toward the root; only the root resolves/materializes a destination.

The rollout includes an ordered, blocking migration of framework-owned TeamRun metadata, communication/task structured files, token usage, external-channel bindings, and physical application databases. The normal runtime must remain current-schema-only. Existing memory/context directory bytes remain directly usable through renamed, storage-owned `ancestorTeamRunIds` derivation rather than logical-address path rewriting.

Server, GraphQL/REST/WebSocket, application contracts, generated/vendor artifacts, and frontend state must consume canonical address/execution shapes. Application backend-definition and frontend SDK semantic contracts are exact V5; application manifest V4, backend bundle V1, and iframe transport V4 remain intentionally unchanged. V4 SDK bundles must be rejected/quarantined before execution with actionable observed/required-version diagnostics, while application database discovery/migration remains independent of bundle admission. Frontend Team state uses one `rootTeam` projection, derives `memberNodesByAddress`, and keys/focuses concrete execution state by canonical serialized execution addresses.

Finally, the user-required imported nested-classroom scenario must pass independently with fresh TeamRuns on AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna` plus `reasoning_effort: \"medium\"`, and an authenticated catalog-exposed Claude Agent SDK model. An unavailable runtime/model/credential or skipped row is Blocked/Fail evidence, not Pass.

## API-REV-012 Current-State Coverage Addendum

This addendum was written before any round-12 durable coverage edit, removal, final execution, or failure reroute. Static inventory evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/sr015-initial-coverage-investigation.log`.

| Existing Coverage / Required Surface | Initial Validity Decision | Reason | Round-12 Action |
| --- | --- | --- | --- |
| `tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` | `Replace` at the current owner boundary | It imports the deleted historical migration owner/database interface. Its direct/task-Agent/task-Team/idempotence/no-guess assertions remain requirement-valid, but current SR-015 authority is the planner + migrator + transactional store composed by `TeamCanonicalIdentityMigration`. | Preserve the useful scenarios while retargeting to `TokenUsageCanonicalExecutionAddressMigrator`, `PrismaTokenUsageCanonicalExecutionAddressMigrationStore`, and aggregate execution. Add plan-before-mutation and exact-current behavior. |
| `tests/e2e/token-usage/token-usage-execution-address-backfill-graphql.e2e.test.ts` | `Replace` | It constructs and exposes terminal historical `20260703...` as a current runnable definition, writes stale task-record/address shapes, and expects old `{segments}` projections. That owner and output are invalid current authority. | Rewrite around terminal historical record preservation plus pending canonical aggregate execution, current task records/addresses, exact GraphQL/current store projection, and truthful migration status. |
| Token legacy path/route cleanup unit and startup E2E | `Needs Update` | Cleanup remains required but its prerequisite is now exact success of `20260801...`, never the historical token record. | Retarget dependencies/fixtures and prove cleanup does not run before canonical success, does run after success, and startup remains gated. |
| Existing TeamRun two-ID integration and canonical startup gate | `Still Valid` | API-REV-011 already resolved `API-F-006`; SR-015 preserves these owners and extends the canonical aggregate with token conversion. | Recheck unchanged, then add aggregate token failure/open sequencing without weakening existing TeamRun cases. |
| Provider instruction composition units | `Needs Update / Expand` | SR-014 supplies one exact renderer copy for AutoByteus, Codex, and Claude. Reviewer parity probes are temporary source evidence, not durable downstream authority. | Add/maintain exact rendered-copy, exact member-address substitution, system/developer placement, intrinsic tool exposure, standalone exclusion, and three-provider parity coverage. |
| Remaining prior six migration files / ten failures | `Needs Individual Adjudication` | API-REV-011 stopped before validity maintenance. They include pre-current expectations that cannot be treated as implementation failures or mechanically accepted. | Run sequentially, classify each against SR-015/current owners, update/replace only requirement-valid coverage, and retain failure evidence. |
| Current integration/API/E2E/frontend/build/broader selections | `Still Required` | They were Not Tested after API-F-007. | Execute affected and proportionate broader deterministic coverage, including server API/E2E, web store/handler/component suites, production typecheck/build, current-authority audits, and honest whole-suite baseline classification. |
| Imported nested-classroom AutoByteus/Codex/Claude matrix | `Add Real Validation` | Explicit R-044–R-048 / AC-040–AC-044 contract; mocks/skips cannot satisfy it. | Create an isolated persistent test runtime, dry-run then non-dry-run `pnpm secrets:import` into the exact test SQLite DB, import the staged fixture, launch fresh row-specific TeamRuns, and collect redacted runtime/tool/instruction/message/task/history evidence for every row. |
| Real frontend Agent and AgentTeam creation across all runtimes | `Add Real Browser Validation` | User explicitly requires proof that the frontend still creates and runs Agents/Teams, not only backend fixtures. | Through the project browser path, create at least one standalone Agent and one AgentTeam per runtime, select the exact required models/configs, launch fresh executions, send prompts, observe hierarchy/member states/messages/task/history-visible behavior, correlate with server logs, and capture DOM/screenshot evidence. Use isolated test-owned data and clean up owned runs/state. |

Round-12 durable coverage may be added/updated/removed only after this addendum. No existing file will be removed without recording its replacement or no-replacement rationale. Browser/API temporary orchestration belongs in retained evidence unless the repository already has an appropriate deterministic durable harness.

### API-REV-012 Repository Evidence Update

- `API-F-007` is downstream-resolved at the current SR-015 owner. The replacement canonical token suite passes `5/5`: direct, task-Agent, legacy input, and two-level nested task-AgentTeam reconstruction; complete planning before mutation; strict task-index failure before token scan/write; real Prisma rollback/read-back verification on a forced later-row failure; stable repair/retry; exact-current idempotence; and aggregate TeamRun/task prerequisite failure before token migration. Evidence: `api-e2e-evidence-sr015/token-canonical-focused.log`.
- The replacement GraphQL migration journey passes `1/1` against a real temporary Prisma database. It preserves a terminal historical `20260703...` record, runs the pending canonical aggregate, persists exact current direct/task-Agent/task-AgentTeam execution addresses, exposes current hierarchy/aggregates through GraphQL, and proves the historical ID is absent from the current registry. Evidence: `api-e2e-evidence-sr015/token-canonical-graphql.log`.
- The prior six migration files were individually adjudicated rather than accepted mechanically. Their requirement-valid scenarios remain, but fixtures/assertions needed current schema-v3 TeamRun metadata, exact `TeamExecutionAddress`, exact canonical cleanup prerequisite, and registry positions shifted by the canonical aggregate. All maintained files plus the canonical token suite pass sequentially: `7 files / 29 tests`. Evidence: `api-e2e-evidence-sr015/migration-seven-after-maintenance.log`.
- Provider instruction coverage was maintained at the SR-014 exact-copy boundary. One new provider-parity suite compares AutoByteus, Codex, and Claude seams against the shared renderer, proves exactly one block with the caller address, excludes removed authority, and excludes the block from standalone inputs. The existing composer and provider bootstrap/factory fixtures were updated from pre-SR-014 prose/current-context gaps. Result: `5 files / 21 tests`. Evidence: `api-e2e-evidence-sr015/provider-instruction-after-maintenance.log`.
- Durable replacement rationale: the two deleted `token-usage-execution-address-backfill*` tests protected a removed current owner and legacy `{segments}` output. Their behavior is replaced, not discarded, by `token-usage-canonical-execution-address-migration.test.ts` and `token-usage-canonical-execution-address-graphql.e2e.test.ts` at the current aggregate/planner/store/GraphQL boundaries.

## API-REV-015 CRR-032 Coverage-Package Reinvestigation And Correction Plan

This addendum was written before any round-15 durable test edit, restoration, removal, or final execution. CRR-032's product/runtime conclusion is explicitly preserved: the 35/35 affected selection and real AutoByteus/Codex/Claude task-Team peer/submit/review journeys remain valid evidence for API-F-010. This round corrects only the durable coverage package and its reporting.

| Coverage path / group | Initial validity decision | Evidence and current defect | Round-15 action before reissue |
| --- | --- | --- | --- |
| Seven changed capability-gated runtime E2Es under `autobyteus-server-ts/tests/e2e/runtime` | `Needs Update` | The suites retain useful full-stack/runtime scenarios, but their create-run `memberConfigs` use removed `memberName`/`memberRouteKey` fields instead of exact `memberAddress`; the nested suite also decodes schema-v2 `memberPath` / `{segments}` shapes. A capability skip is truthful for unavailable live providers, but stale setup is not maintained current coverage. | Retarget create-run fixtures and local result types/assertions to current schema-v3 `memberAddress` and serialized execution-address shapes. Run a current-contract static/TypeScript audit plus the seven-file Vitest selection, preserving truthful runtime skips rather than claiming skipped scenarios executed. |
| Duplicate `xml-patch-prompt-tool-parsing-state.test.{js,ts}` edits | `Out Of Scope / Restore` | Both files are deliberately excluded by server Vitest and import a deleted source owner. The ticket-only `recipient_name` to `recipient_address` text edit does not create executable evidence and duplicates unrelated obsolete coverage. | Restore both files exactly to artifact HEAD so they leave the cumulative ticket delta. Do not count them as maintained or passing coverage; record hash/diff proof. |
| `test-support/live-e2e/live-e2e-harness.ts` and `test-support/live-e2e/run-live-e2e.mjs` | `Needs Update / API-E2E Owned` | The API/E2E round introduced explicit `AUTOBYTEUS_TEST_DATABASE_URL` propagation/verification after an operational-database collision. The safety behavior is requirement-relevant and must remain visible, but API-REV-014 omitted it from the durable delta and lacked focused post-change proof. | Own both edits as API/E2E harness maintenance. Add/run a focused isolated harness validation that proves an explicit disposable DB is accepted and a mismatched DB fails closed before live operations; audit launcher propagation without reading or writing the operational database. |
| Two changed web streaming tests | `Still Valid / Include` | Both passed 34/34 and cover current `recipient_address` streaming/tool lifecycle projection, but the prior inventory was server-only. | Include them explicitly in the cumulative inventory and preserve their focused execution evidence. |
| All remaining server durable coverage delta | `Still Valid, subject to exact inventory recheck` | API-REV-014 directly executed the current active server selection, but its declared count included one non-test fixture, two excluded obsolete tests, and seven skipped suites with stale setup. | Regenerate one exact cumulative inventory from Git state across server tests/fixture, web tests, and live support; distinguish executable pass, truthful skip, support validation, restored/out-of-delta, and removed/replaced paths. Re-run every active executable changed server test and reconcile counts exactly. |

### Round-15 Evidence And Routing Gate

- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-015`.
- `TR-F-002` is resolved only if all seven live-runtime files use current input/result contracts, the two XML-patch files have zero ticket diff, and no excluded/deleted-source test is counted as an executable pass.
- `TR-F-003` is resolved only if the exact inventory includes server, both web paths, both live-E2E support paths, and removed/replaced paths; the harness has direct isolation proof; and the operational database mutation remains disclosed without attempted automatic rollback.
- Final execution remains staged from focused current-contract/harness checks to the exact cumulative active test list, affected web tests, production typecheck/build, and hygiene/audit checks. The already-successful real three-runtime rows are retained rather than repeated unless the bounded correction changes runtime behavior (it must not).
- Any final `Pass` returns the full cumulative artifact and durable path package to `code_reviewer` for proportional re-review before delivery.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Canonical logical address and recipient expression | Changed / old authority removed | BEH-001–BEH-003, BEH-012; R-001–R-016, R-028–R-032, R-038, R-043; AC-001–AC-013, AC-023–AC-025, AC-029, AC-035 | Replace bare-name, `recipient_name`, route-key, path, and fallback assertions with strict absolute/relative `recipient_address` proof and negative grammar cases. |
| Rooted TeamRun metadata and runtime | Changed | BEH-004, BEH-008, BEH-013; R-017–R-020, R-032–R-035; AC-014–AC-018, AC-026–AC-028, AC-031, AC-037 | Add/maintain schema-v3 root/nested create, persistent child, task child, restore, typed-ID, address-index, snapshot/handoff, and contradiction-rejection coverage. |
| Root-private delivery and task ingress | Changed | BEH-002–BEH-007; IR-006; CRR-010 | Add durable nested persistent/task-child forwarding to `/root-agent`, cross-branch/Team ingress, exact once delivery, root foreign-ID rejection, current-local task mapping, submit/review, interrupt/restore coverage. |
| Intrinsic collaboration protocol/provider projections | Changed | BEH-001, BEH-009; R-011–R-013, R-021, R-047; AC-012–AC-013, AC-019–AC-020, AC-043 | Maintain AutoByteus/Codex/Claude tool exposure, filesystem-like instruction, exact minimal handoff result, accepted/rejected transport parity, and real provider lifecycle proof. |
| Execution/history/event/token identity | Changed | BEH-014; R-036–R-038, R-041–R-043; AC-028–AC-030, AC-033, AC-035–AC-039 | Update typed public/current payload tests without rewriting opaque historical provider arguments; prove exact serialization, task chains, websocket/history/token projections, and strict legacy-field removal. |
| Persisted data transition | Corrected, blocking two-ID chain | BEH-015; SR-013; R-041–R-043; AC-031–AC-034, AC-037, AC-039 | Add durable fresh-flat, terminal-success predecessor, terminal-warning residual-flat, backup/atomicity, unsafe byte-stability, repair/retry, idempotence, exact startup-gate, and independent physical application-DB discovery coverage. |
| Application V5 SDK/admission | Changed / V4 current support removed | BEH-016; SR-012; R-038, R-041–R-043; AC-033, AC-035–AC-039 | Current-path fixtures must use V5. Retain V4 only as explicit rejection/incompatibility inputs. Prove manifest/bundle/loaded-definition admission, diagnostic/quarantine, artifact parity, and database independence. |
| Frontend rooted/execution state | Changed | BEH-016; R-039, R-043; AC-036, AC-039 | Add/update store, hydration, stream, command/history/memory/token/focus, collision, and no-fallback coverage for `rootTeam`, `memberNodesByAddress`, and execution-address keys. |
| Physical memory/context lineage | Renamed/encapsulated, bytes preserved | BEH-017; R-040–R-043; AC-034, AC-038–AC-039 | Prove existing directories/locators remain usable and distinguish physical `ancestorTeamRunIds` from logical/current API identity. |
| Imported nested-classroom live matrix | Added mandatory validation | BEH-018; R-044–R-048; AC-040–AC-044; live contract | Execute all three live rows through supported import/launch surfaces with isolated secrets/data, redacted evidence, fresh IDs, full behavior spine, and cleanup. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available Before Round 5 | Material Risk Not Exercised Yet | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Address grammar/resolution, rooted planner/index, delivery, task identities/lifecycle, migration | IR-006 source checks and temporary probes; dirty prior tests are not yet authoritative | Current durable validity, migration recovery, task/persistent collision and nested forwarding | Focused unit/integration plus lifecycle |
| API / transport / contract | Yes | GraphQL, WebSocket, REST/external, provider tool/result payloads, app SDK | Prior SR-006 E2E and dirty renamed fixtures | Current exact schema, strict rejection, live public import/launch, API-to-runtime composition | Repository API/E2E plus Live API |
| Frontend component / state | Yes | Rooted projection, address index, execution-address keys/focus | Two dirty stream-handler tests plus implementation checks | Full store/hydration/command/history/memory/token/collision behavior and built artifact | Frontend unit/integration and browser/API only if repository evidence cannot close gap |
| Browser integration / user journey | Yes, contract changed | Web client consumes new server/API state | Implementation rendered empty/error state only | A live hierarchy/task/history UI was not exercised | Browser if a stable project-supported fixture can materially add proof; not a substitute for mandatory live API rows |
| Authentication / session / permissions | Yes for live external runtimes | Secret-store import and authenticated model catalog | Repository secret importer and capability-gated harness | Credential presence/model exposure and provider authorization are unknown | Isolated secret import plus live catalog/preflight |
| Desktop renderer / web-equivalent UI | Indirectly | Web-equivalent Team projection and commands | Same production web code | Shell not required for contract; rendered journey may remain uncertain | Browser preferred if needed |
| Desktop shell / Electron-specific integration | No material SR-012 shell boundary identified | No preload/IPC/window/package-shell semantic change | N/A | None material | None; do not launch desktop app merely for web-equivalent behavior |
| Process / lifecycle | Yes | Blocking migration before listen; provider sessions; create/task/terminate/restore | Build/bootstrap smoke and IR-006 built probe | Full migration gate, fresh provider sessions, cleanup/restore | Lifecycle + live API |
| Persisted-data transition | Yes | File/database migrations plus unchanged physical memory directories | Narrow temporary implementation SQLite proof only | Broad durable fixtures, contradiction/rollback/idempotence, catalog-independent app DBs, restart gate | Durable migration integration + isolated lifecycle |
| Worker / queue / distributed coordination | Yes, bounded | Root/child manager forwarding across nested execution boundaries | IR-006 built probe | Durable runtime composition and real provider callback/tool lifecycle | Integration/E2E and live provider rows |
| External integration | Yes | AutoByteus, Codex App Server, Claude Agent SDK runtimes/models | Adapter-level prior coverage only | Mandatory authenticated real runtime/model matrix | Live API, three fresh isolated rows |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Reviewed HEAD at round-11 investigation start: `fb6b997272d90469c3c17912995c88c5caeea728`; reviewed IR-013 source commit: `6a920d45e54981735c25146e0ab76ab7e0917c4c`.
- Stack: pnpm workspace; Node.js/TypeScript; Fastify/Mercurius GraphQL; Prisma/SQLite; Vitest; Nuxt/Vue web; provider processes for Codex App Server and Claude Agent SDK.
- Conflicting, missing, or unclear project instructions: none for deterministic repository commands. Exact live harness orchestration is to be derived from the existing real-E2E runner and public import/TeamRun APIs; the ticket contract overrides generic skip-as-capability behavior for its three mandatory rows.
- Required environment variables or secrets available: `Unclear` until isolated import and live preflight. Secret values will never be printed or attached.
- Protected/non-owned state: delivery stash/backup, delivery-owned documentation/artifacts, the user's normal `~/.autobyteus` data, and `/Users/normy/autobyteus_org/autobyteus-private-agents` are not to be edited, reset, dropped, reused as a target, or deleted.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch`; run narrow checks before broad. |
| root and server `package.json` | Authoritative scripts | `pnpm test:e2e`, `pnpm test:e2e:real:preflight`, `pnpm test:e2e:real`, `pnpm secrets:import -- ...`; server `build:full` and build-config TypeScript checks. |
| `autobyteus-server-ts/README.md` and test README/config | Runtime/test environment | Use project-owned `.env.test`, temp roots/databases, supported GraphQL/service harness, and explicit capability reporting. |
| `nested-classroom-live-validation-contract.md` | Mandatory SR-012 live contract | Read-only source fixture; staged `LOCAL_PATH` import; exact overlays; fresh row per runtime; isolated secret DB; exact models/config; no skipped Pass; redacted evidence and cleanup. |
| `autobyteus-server-ts/vitest.config.ts`, test setup, `.env.test` | Deterministic runner isolation | Respect test hooks, SQLite/temp directories, and existing finalizers; do not collide with shared user state. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Focused and affected server coverage | `autobyteus-server-ts` | `pnpm exec vitest run <paths> --no-watch` | Test-owned Prisma/SQLite/temp roots | Suite collection and exit status | Project hooks/finalizers |
| Frontend coverage | `autobyteus-web` | package-defined Vitest command for selected/current suites | No shared user data | Suite exit status | Runner exit |
| Production compile/build | server/workspace as scripted | build-config `tsc`; server `pnpm run build:full`; relevant SDK/web builds | Build artifacts remain inside assigned worktree | Exit 0 plus bootstrap smoke/artifact audits | No long-running process |
| Deterministic repository E2E | worktree root | `pnpm test:e2e` | In-process/public surfaces with test-owned data | Exit status and per-suite evidence | Existing finalizers |
| Live runtime preflight | worktree root | `pnpm test:e2e:real:preflight` plus targeted catalog/capability checks | This cannot convert missing mandatory rows to a passing skip | Exact runtime/model/credential availability | Stop only owned processes |
| Isolated live environment | worktree root/server | `pnpm secrets:import -- --source \"<real-home>/.autobyteus/server-data/.env\" --database-url \"file:<absolute-test-db>\"`; project-supported server/harness | Disposable absolute DB/app-data/HOME; no secret output; source resolved before HOME change | Import exit, secret identifier presence, API/catalog readiness | Terminate owned runs/processes; remove staged/test-owned data after evidence |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Migration legacy fixtures | Test-created JSON/SQLite/application DB inputs | Never point at user data; validate backups/transactions/failure details | Test cleanup; retain redacted logs only |
| Nested classroom package | Copy source fixture into test-owned `agent-teams/nested-classroom-test`; apply only contract-authorized overlay; import with `LOCAL_PATH` | Source package remains byte-for-byte untouched; record staged digest/diff | Remove staged copy after evidence unless preserving a redacted failing fixture |
| Provider secrets | Repository secret importer into disposable absolute DB | Record names/presence only, never values; no overwrite of normal database | Delete disposable DB/app root after run |
| Runtime rows | Fresh root TeamRun and provider session for each required row | No run/session/history reuse; exact required models/config | Terminate root/task/provider processes and remove isolated state |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` for framework-owned structured identity data; `Directly Usable — No Migration` for physical Agent memory/context directories and locator bytes.
- Design/implementation references: R-040–R-043; AC-031–AC-034, AC-037–AC-039; `team-run-canonical-identity-refactor.md` sections covering cases 10.9–10.13; implementation handoff `Persisted Data Transition` and `Legacy / Compatibility Removal Check`.
- Representative existing-data setup: legacy TeamRun metadata with consistent and contradictory parallel identities; communication/task structured JSON; token-use SQLite legacy columns/payloads; external binding payloads; multiple application platform DBs including a V4/quarantined bundle; existing memory directory/context locator layout.
- Evidence planned: validate transformed schema-v3 root tree, typed IDs and canonical execution address; preservation of non-identity content; per-file/database backup or transaction; atomicity; actionable contradiction/failure; idempotent rerun; startup blocking on incomplete required migration; physical application DB discovery without admitted-bundle dependency; strict current readers rejecting old shapes; unchanged memory/context relative paths.
- Migration completion/recovery scenarios: clean multi-store conversion; catalog-independent application DB enumeration; contradictory metadata failure without partial replacement; SQLite rollback/failure gate; idempotent rerun; current-only read/write after successful bootstrap.
- Upstream ambiguity/reroute required: none identified.

## Existing Durable Coverage Inventory And Initial Validity Decisions

The worktree contains 44 already-dirty durable test files (42 server, 2 web) that predate this investigation. IR-005/IR-006 explicitly disclaims ownership of those edits. Static inspection shows predominantly mechanical field/class/version renames; their dirty state is not accepted as SR-012 authority until each assertion is checked against the current contract. No add/remove is present at investigation start.

| Path / Scenario Family | Current Assertion Or Intent | Related Requirement / Design | Initial Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-collaboration/collaboration-logical-address.test.ts` | Address parsing/resolution | R-001–R-010, R-032; AC-001–AC-010 | Needs Update | Core scenario remains required, but strict canonical/relative rules and negative cases must match the new sole authority | Validate and maintain first |
| `tests/unit/agent-team-execution/{inter-agent-message-*,member-run-instruction-composer,mixed-*,send-message-to-tool-argument-parser,team-logical-placement-resolver,team-member-delivery-coordinator}.test.ts` | Collaboration intent, placement, provider instruction, nested delivery | R-011–R-016, R-028–R-035, R-043; AC-011–AC-013, AC-023–AC-029 | Needs Update; resolver scenario maintained and failed | Mechanical renames include invalid bare names and `allowedRecipientAddresss`; the maintained resolver now proves the current root index but production reports `COLLABORATION_TARGET_NOT_FOUND` when an Agent occurs before the final segment, contrary to the approved `COLLABORATION_TRAVERSAL_INVALID` code | Reroute `SR012-ADDR-001` before continuing broader maintenance |
| `tests/unit/agent-team-execution/{task-delegation-service,task-delegation-target-mapper,team-manager-member-interrupt}.test.ts` and task tool tests | Agent/Team delegation and lifecycle | R-014–R-016, R-034–R-037; AC-012, AC-025, AC-027–AC-030 | Needs Update | Target shape remains valuable; bare names/parallel identity fixtures are suspect | Convert to canonical recipient/execution addresses and current task IDs |
| AutoByteus/Codex/Claude backend converter/bootstrap/tool-use/history tests | Provider-native tool/result/history projection | R-011–R-013, R-021, R-036, R-043, R-047; AC-012–AC-013, AC-019–AC-020, AC-043 | Needs Update / split validity | Current generated tool calls must use `recipient_address`; opaque recorded historical provider arguments are content and must not be blindly rewritten | Preserve opaque trace fixtures where intentional; update only current contract assertions |
| Agent memory recorder and run-history projection tests | Memory/event/history persistence/projection | R-036, R-040–R-043; AC-030, AC-034, AC-038–AC-039 | Needs Update / split validity | Current selectors change; physical paths and opaque payloads are preserved | Separate logical identity assertions from storage/history-content preservation |
| Application bundle/loader/host and four backend integration tests | Manifest/bundle/loaded backend contract admission and execution | R-038, R-041–R-043; AC-033, AC-035, AC-037, AC-039 | Needs Update | Current-path `definitionContractVersion` was mechanically changed to V5, but manifest/envelope versions and explicit V4 rejection roles must be adjudicated exactly | Make current fixtures V5; retain V4 only as explicit rejection; assert diagnostics and no execution |
| `autobyteus-web` streaming handler tests | Tool lifecycle and stream identity | R-036, R-039, R-043; AC-036, AC-039 | Needs Update | Two mechanical payload renames do not prove rooted store/index/focus or collision behavior | Correct payload fixtures and add broader frontend state coverage where missing |
| Nine server runtime/API E2E files (`external-channel`, `run-history`, `runtime/*`) | Public/runtime message, task, nested Team, history behavior | R-001–R-043; AC-001–AC-039 | Needs Update | Valuable end-to-end seams, but current dirty values include bare addresses and old state shapes | Update after direct unit/integration semantics are fixed; run deterministically |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Tool-driven delegation lifecycle | R-034–R-037, R-043; AC-027–AC-030, AC-039 | Needs Update | Previously known stale address fields; dirty mechanical change not enough | Rebuild fixture around strict recipient/execution identity and task Team lifecycle |
| `tests/integration/api/runtime-selection-top-level.integration.test.ts` | API runtime selection | R-021, R-038, R-046; AC-019, AC-035, AC-041 | Needs Update | Previously known stale fields and current contract/model configuration need adjudication | Update current API fixture and assertions |
| Existing TeamRun manager/service/restore, websocket, token, external binding, application-storage tests not currently dirty | Lifecycle and cross-boundary preservation | R-033–R-043; AC-026–AC-039 | Unclear pending focused inventory | Names/assertions may encode removed path/route/generic IDs even when git-clean | Inventory before inclusion; update/replace only if affected |
| Existing token/app-data migration tests | Older migration orchestration and stores | R-041–R-043; AC-031–AC-034, AC-037, AC-039 | Still Valid as framework harness, insufficient for SR-013 | Orchestration behavior remains useful, but most files do not directly prove the corrected two-ID TeamRun lifecycle | Retain and adjudicate sequentially after the TeamRun gate |
| `tests/unit/app-data-migrations/team-run-metadata-member-tree-migration.test.ts` | Stable pending flat-to-predecessor conversion, backup, idempotence, and unsafe-topology failure | R-041–R-042; AC-031, AC-037; DS-009A–D | Still Valid; recheck required | IR-013 restores the migration-only decoder and stable predecessor writer while preserving structural rejection. The file remains narrow prerequisite evidence rather than final-v3 proof. | Re-run unchanged with runner coverage; retain all four expectations |
| `tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts` | Combined prerequisite plus current history/index use | R-041–R-042; AC-031, AC-037; DS-009A–D | Needs Update / Replace in place | Pre-SR-013 sequencing omits `20260801...`, runs index/current readers against predecessor data, constructs a supposed current value through the strict v3 writer using predecessor fields, and manually retries only the stable ID. Its real Program Manager/program_manager fixture remains authoritative, but its sequencing/current-writer assertions are stale. | Rewrite as explicit two-ID lifecycle coverage; retain the real fixture and remove no requirement |
| No dedicated durable canonical TeamRun two-ID lifecycle suite | Fresh flat, terminal predecessor/residual flat, final backup/atomicity, repair/retry, current-v3 idempotence | SR-013; R-041–R-042; AC-031, AC-037; DS-009A–D | Add Durable Coverage | IR-013/CRR-023 evidence is temporary; repository coverage must prove record-state lifecycle and final-v3 mutation directly | Use the rewritten historical integration plus existing runner and startup-gate units |
| `tests/unit/app-data-migrations/token-usage-execution-address-backfill-migration.test.ts` | Direct/task-Agent/task-Team historical token attribution and legacy-column authority audit | R-036, R-041, R-043; AC-029, AC-032, AC-039 | Needs Update; preserve task-Team correction authority | Expected output still uses removed `{segments}` shape and one audit path names a deleted builder, but the task-Team reconstruction intent remains required. Current source removed task-record indexing and ignores `memoryDir`, so correction must retain a current-shape assertion that a historical task Team root becomes `{rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}`. | Correct only target shapes/audit inventory, rerun focused, and treat any lost task-Team reconstruction as a source failure |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts` | Canonical migration failure/missing/runner rejection, unrelated warning policy, and successful start | R-042; AC-037; IR-011; CRR-020 | Updated / Still Valid | Corrected fixture uses the owner-exported canonical ID, proves canonical failure and missing status block, runner rejection blocks, and canonical success plus unrelated warning starts once | Retain and rerun with the two-ID suite; `API-F-005` remains resolved unless regression appears |
| Existing explicit legacy V4 rejection/incompatibility fixtures | Negative admission | R-042–R-043; AC-037, AC-039 | Still Valid if explicitly labeled rejection | Requirements preserve V4 only at incompatibility input boundaries | Retain; ensure observed/required/actionable assertions |
| Existing physical memory/context locator tests | Stable bytes and locations | R-040, R-043; AC-034, AC-038–AC-039 | Still Valid / may need naming update | Physical directories are intentionally preserved | Maintain direct-use evidence without logical-route fallback |
| Generic XML-patch parser JS/TS tests mechanically renamed | Parser behavior unrelated to project identity | No direct SR-012 behavior unless fixture is a current tool call | Out Of Scope unless fixture protects current `send_message_to` parsing | Dirty diff appears payload-only and duplicated | Revert unrelated opaque/example change if it is not a current collaboration contract assertion |

## Stale Or Obsolete Coverage Decisions

No durable file is authorized for deletion at the initial investigation stage. The following assertions are provisionally obsolete and must be removed or replaced inside maintained scenarios after direct inspection:

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Mixed delivery/instruction tests | `allowedRecipientNames` or mechanically invented `allowedRecipientAddresss` capability/list | Public callers provide strict `recipient_address`; runtime must not publish a parallel finite name authority | R-011–R-013, R-032, R-043; AC-011–AC-013, AC-029, AC-039 | Strict address expression parsing/resolution, placement, and exact errors | N/A |
| Message/task tests | Bare non-relative targets such as `coordinator`, `code_reviewer`, `Student`, or `pong` treated as valid logical addresses | Non-root logical addresses are absolute `/...` or caller-relative `./...`/`../...`; flat-name fallback is removed | Addressing contract; R-001–R-010, R-043; AC-001–AC-010, AC-039 | Exact absolute/relative positive and malformed/out-of-root/foreign-root negative cases | N/A |
| Current application execution fixtures | V4 backend-definition/frontend SDK accepted on normal path | SR-012 requires exact V5 admission; V4 is rejection/quarantine-only | R-038, R-042–R-043; AC-035, AC-037, AC-039 | V5 normal path plus explicit V4 rejection with actionable diagnostics | N/A |
| Current API/runtime fixtures | Parallel `memberPath`, `memberRouteKey`, coordinator route, generic run ID, local task route fields | Canonical address/execution identity is sole current authority | R-032–R-039, R-043; AC-026–AC-030, AC-035–AC-039 | Root tree/address index/typed IDs/`TeamExecutionAddress` assertions | N/A |
| Provider/history raw payload fixtures, if merely mechanically renamed | Rewriting already-recorded opaque arguments to pretend historical content migrated | Opaque provider trace arguments remain history content, not routing identity | BEH-017; R-040, R-043; AC-038–AC-039 | Preserve raw content; assert current projections route by canonical execution identity separately | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `SR012-ADDR-001` | Strict canonical/relative address parsing, derivation, serialization, no fallback | R-001–R-010, R-032, R-043; AC-001–AC-010, AC-029, AC-039 | Existing address/resolver unit files, plus new focused file only if separation is needed | Sole identity authority needs exhaustive deterministic proof |
| `SR012-ROOT-001` | Schema-v3 rooted compile/create/persistent child/task child/restore, typed IDs, immutable shared snapshot/index | R-033–R-035; AC-026–AC-028, AC-031, AC-037 | Team topology/run-manager/service unit/integration coverage | Prior evidence targets SR-006 model |
| `SR012-DELIVERY-001` | Nested persistent/task child forwards unchanged intent to root; root resolves `/root-agent`; foreign root rejected; exactly once | IR-006; R-028–R-036; AC-023–AC-030 | `mixed-team-manager.test.ts` and delivery integration/E2E | CRR-010 probe is temporary implementation evidence only |
| `SR012-TASK-001` | Team ingress through coordinator, current-local parent-first mapping, submit/review, interrupt, restore, distinct typed task execution | R-014–R-016, R-034–R-037; AC-012, AC-025, AC-027–AC-030 | Task service/tool lifecycle unit/integration/E2E | Critical lifecycle crosses multiple owners |
| `SR013-MIG-CHAIN-001` | Fresh real flat fixture runs stable predecessor then canonical v3, preserving display-only input until final omission | SR-013; R-041–R-042; AC-031, AC-037; DS-009A | Rewritten historical integration suite | The prior combined test stopped before the final-v3 owner |
| `SR013-MIG-CHAIN-002` | Terminal-success predecessor and terminal-warning residual flat skip stable ID while pending canonical converts to final v3 | SR-013; R-041–R-042; AC-031, AC-037; DS-009B | Rewritten historical integration suite | Supported completed-record histories cannot be inferred from fresh migration |
| `SR013-MIG-SAFETY-001` | Unsafe structural input is byte-stable with no backup/replacement; repair retries non-terminal canonical; v3 rerun is idempotent | SR-013; R-041–R-042; AC-031, AC-037; DS-009C–D | Rewritten historical integration plus existing runner unit | Failure atomicity and executable pre-listen recovery are critical |
| `SR012-MIG-001` | Remaining composite file/DB migration, backup/transaction, contradiction, idempotence, blocking failure gate | R-041–R-043; AC-031–AC-034, AC-037, AC-039 | Existing/new app-data migration unit/integration suites | Two-ID TeamRun coverage is the first sub-gate; other stores remain outstanding |
| `SR012-MIG-002` | Application DB discovery independent of admitted bundle catalog, including V4/quarantined bundle data | SR-012; R-041–R-043; AC-037, AC-039 | New application migration integration scenario | Explicit DR-004/SR-012 risk |
| `SR012-APP-001` | Exact V5 manifest/bundle/loaded-definition admission, V4 actionable quarantine, no execution, artifact parity | R-038, R-042–R-043; AC-035, AC-037, AC-039 | Existing application unit/integration plus targeted artifact audit | Mechanical version edits are insufficient |
| `SR012-API-001` | GraphQL/WebSocket/external/history/token current exact rooted/execution shapes and legacy absence | R-036–R-039, R-043; AC-030, AC-033, AC-035–AC-039 | Existing API/E2E suites plus focused schema tests | Project boundaries must reject parallel identity |
| `SR012-WEB-001` | `rootTeam`, derived address index, execution-address state/focus, same logical address persistent/task collision | R-039, R-043; AC-036, AC-039 | Frontend stores/composables/stream tests | No current authoritative comprehensive frontend coverage identified |
| `SR012-MEM-001` | Existing memory/context bytes remain directly usable via physical `ancestorTeamRunIds` | R-040, R-043; AC-034, AC-038–AC-039 | Existing memory integration plus focused direct-use fixture | Migration must not rewrite physical lineage |
| `SR012-LIVE-001` | Imported nested classroom on all three required live runtimes/models | R-044–R-048; AC-040–AC-044; live contract | Project-supported real E2E harness; durable if repository pattern supports it, otherwise temporary orchestrator with retained redacted evidence | Critical user acceptance cannot be proven by mocks or skips |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `SR012-UPD-001` | 42 currently dirty server test files listed by `git status` | Replace mechanical renames with requirement-valid addresses, typed identities, rooted fixtures, V5/current vs explicit V4-negative roles; preserve opaque history content where required | R-001–R-043; AC-001–AC-039 | Final inventory will enumerate every actually retained delta |
| `SR012-UPD-002` | Two dirty web stream-handler specs | Use current execution-address payload/state meaning; remove legacy fallback assumptions | R-036, R-039, R-043; AC-036, AC-039 | Extend to store/index/focus/collision paths if absent |
| `SR012-UPD-003` | Relevant currently clean TeamRun/API/application/migration/memory/frontend tests | Update only after focused validity inspection demonstrates an affected assertion or fixture | R-032–R-043; AC-026–AC-039 | Avoid broad mechanical churn |
| `SR013-UPD-001` | `tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts` | Replace pre-SR-013 prerequisite-only/current-reader sequencing with explicit stable-plus-canonical lifecycle scenarios, reusing the real display-divergent fixture | SR-013; R-041–R-042; AC-031, AC-037; DS-009A–D | Deliberate validity correction, not mechanical expectation churn |

## Durable Coverage To Remove

No entire file is approved for removal initially. Obsolete individual assertions/fixtures identified above will be replaced in-place. Any later file deletion will first be recorded here with replacement coverage or explicit no-replacement rationale.

## Repository Coverage Execution Plan And Results

This table preserves the staged cumulative execution history. API-REV-010 stopped after `API-F-006` at 54%. Round 11 began only after the fresh SR-013 validity update, resolved `API-F-006` downstream, and stopped at `API-F-007`; no CRR-023 reviewer probe is counted as downstream execution.

| Order | Command / Mode | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1a | `pnpm exec vitest run` on 10 initial collaboration/task files | `autobyteus-server-ts`; exact paths; `--no-watch` | Validity discovery of old fixtures | Fail as expected from stale fixtures: 46 failed / 9 passed across 10 files | `api-e2e-evidence-sr012/discovery-collaboration.log` |
| 1b | `pnpm exec vitest run tests/unit/agent-collaboration/collaboration-logical-address.test.ts tests/unit/agent-team-execution/team-logical-placement-resolver.test.ts --no-watch` | `autobyteus-server-ts` | Current strict address structure plus exact missing-segment/traversal codes | Fail: 13 passed / 1 failed; exact Agent-before-final-segment code mismatch | `api-e2e-evidence-sr012/address-resolver-current-contract.log` |
| 1c | Contract/source/durable-expectation audit and `git diff --check` | Worktree | Establish whether the one semantic failure is stale coverage or implementation behavior | Pass audit; confirms contract line 628, source lines 32–37, zero current resolver emission of traversal code, clean test diff | `api-e2e-evidence-sr012/traversal-failure-analysis.log` |
| 2a | Unchanged two-file address/resolver recheck | `autobyteus-server-ts`; `--no-watch` | Independent `API-F-001` / CR-F-005 recheck | Pass: 2 files / 14 tests | `api-e2e-evidence-sr012/address-resolver-crr012-recheck.log` |
| 2b | Exact 27-file dirty unit discovery | `autobyteus-server-ts`; `--no-watch` | Classify remaining stale/mechanical fixtures before maintenance | Fail: 16 files / 78 tests, primarily stale schema-v2/current-V4 fixtures; not automatically implementation defects | `api-e2e-evidence-sr012/dirty-unit-discovery-after-crr012.log` |
| 2c | Maintained current intent, instruction, send-message parity, and AutoByteus task context | `autobyteus-server-ts`; `--no-watch` | Canonical caller projection through native AutoByteus context and task tool consumer | Fail: other 3 files / 13 tests pass; AutoByteus task context 1 pass / 3 fail (`API-F-002`) | `api-e2e-evidence-sr012/autobyteus-task-context-failure-focused.log`; `autobyteus-task-context-failure-final.log` |
| 2d | Unchanged maintained AutoByteus native task context | `autobyteus-server-ts`; `--no-watch` | Recheck `API-F-002` producer/consumer contract after IR-008/CRR-014 | Pass: 1 file / 4 tests; `API-F-002` resolved | `api-e2e-evidence-sr012/autobyteus-task-context-crr014-recheck.log` |
| 2e | Exact 27-path dirty-unit discovery after CRR-014 | `autobyteus-server-ts`; `--no-watch` | Reclassify current fixture/assertion failures before maintenance | 13 files / 157 tests pass; 12 files / 65 tests fail | `api-e2e-evidence-sr012/dirty-unit-round7-initial.log` |
| 2f | Current-only unit maintenance through application V5, provider context, task target, message, nested-Team, delivery, and manager lifecycle seams | `autobyteus-server-ts`; `--no-watch` | Replace stale schema-v2/V4 fixtures while retaining current lifecycle authority | 53 finalized assertions pass; manager lifecycle 5/6 pass and exposes `API-F-003`; one separately edited factory file remains unfinalized | `api-e2e-evidence-sr012/mixed-team-termination-lifecycle-failure-final.log`; supporting focused command output retained in turn evidence |
| 2g | Retarget termination/no-new-work coverage to `TeamRun` / `MixedTeamRunBackend` and cover all five task operations with zero manager/registry invocation | `autobyteus-server-ts`; `--no-watch` | Resolve CRR-015 API/E2E Local Fix without weakening lifecycle behavior | Pass: 1 file / 6 tests; all five supported operations return `RUN_NOT_FOUND` and invoke no registry while termination is pending | `api-e2e-evidence-sr012/team-run-termination-lifecycle-crr015-recheck.log` |
| 2h | Exact 25-file current dirty-unit set after round-8 maintenance | `autobyteus-server-ts`; `--no-watch` | Recheck all currently maintained unit seams and isolate the next semantic failure | Fail: 24 files / 224 tests pass; `task-delegation-service.test.ts` has 2 failures (`API-F-004`) | `api-e2e-evidence-sr012/dirty-unit-round8-final-halted.log`; `task-agent-nested-delegation-failure-final.log`; `task-agent-nested-delegation-failure-analysis.log` |
| 2i | Unchanged three-file `API-F-004` trigger and exact current dirty-unit set after CRR-017 | `autobyteus-server-ts`; `--no-watch` | Independently recheck IR-009 and establish the round-9 unit baseline before further maintenance | Pass: 3 files / 32 tests, then 25 files / 226 tests | `api-e2e-evidence-sr012/task-agent-nested-delegation-crr017-recheck.log`; `dirty-unit-round9-baseline.log` |
| 2j | Exact six-file dirty integration set after validity maintenance | `autobyteus-server-ts`; `--no-watch` | Tool/router/records/REST task lifecycle, top-level GraphQL/WebSocket runtime selection and restore, application V5 worker/host capabilities and transports | Pass: 6 files / 17 tests | `api-e2e-evidence-sr012/dirty-integration-round9-final.log`; focused lifecycle/runtime/application logs |
| 3a | Existing migration unit/integration discovery selection (17 files / 73 tests) | `autobyteus-server-ts`; isolated project test DB/temp roots | Identify current migration harness validity before maintenance | Non-clean discovery: 9 files / 18 tests failed; most failures are stale pre-canonical expectations/order/fixtures and are not accepted as implementation defects | `api-e2e-evidence-sr012/migration-round9-initial.log` |
| 3b | Corrected durable required-migration startup gate plus source/contract audit | `autobyteus-server-ts`; `pnpm exec vitest run tests/unit/server-runtime-app-data-migration-gate.test.ts --no-watch` | R-042 / AC-037: no bootstrap/listen after a required failure; successful migration starts once | **Fail (`API-F-005`)**: 1 success-path test passes; both required-failure cases call `app.listen({host:"127.0.0.1",port:0})` once | `api-e2e-evidence-sr012/startup-required-migration-gate-round9-failure.log`; `startup-required-migration-gate-round9-analysis.log` |
| 3c | Corrected canonical-only startup gate recheck after IR-011/CRR-020 | `autobyteus-server-ts`; focused 4-test file | Canonical failure/missing/runner exception block; canonical success plus unrelated warning starts once | Pass: 1 file / 4 tests; `API-F-005` resolved | `api-e2e-evidence-sr012/startup-canonical-migration-gate-crr020-recheck.log` |
| 3d | Sequential rerun of the nine previously failing migration files | `autobyteus-server-ts`; one Vitest process per file | Remove concurrency as an explanation and classify all 18 remaining failures | Non-clean: all 18 reproduce sequentially; validity analysis halted on first critical source defect | `api-e2e-evidence-sr012/migration-round10-sequential-discovery.log` |
| 3e | Focused legacy-flat prerequisite migration plus source/design/base audit | `autobyteus-server-ts`; 4-test file | R-041/R-042/design 12.2 ordered safe conversion/backup and unsafe failure | **Fail (`API-F-006`)**: 1 pass / 3 failures; skip-only checkpoint reports safe/unsafe flat data as success without conversion | `api-e2e-evidence-sr012/legacy-flat-prerequisite-round10-failure.log`; `legacy-flat-prerequisite-round10-analysis.log` |
| 3f | Fresh SR-013 static coverage investigation | Worktree; no test execution | Adjudicate prior prerequisite unit, combined history integration, runner, canonical migration, and startup gate against two-ID ownership | Complete: prerequisite/startup units remain valid; combined integration needs a deliberate in-place rewrite; canonical two-ID lifecycle lacks durable proof | `api-e2e-evidence-sr013/sr013-initial-coverage-investigation.log` |
| 3g | Unchanged prerequisite + runner + corrected startup gate | `autobyteus-server-ts`; exact three files; `--no-watch` | Stable writer/terminal-record policy and canonical block/open gate | Pass: 3 files / 14 tests | `api-e2e-evidence-sr013/prerequisite-runner-startup.log` |
| 3h | Rewritten two-ID historical integration | `autobyteus-server-ts`; exact integration file; `--no-watch` | Fresh flat, terminal-success predecessor, terminal-warning residual flat, unsafe byte stability/no backup, final backup/atomicity/idempotence, repair/retry | Pass: 1 file / 4 tests; `API-F-006` resolved downstream | `api-e2e-evidence-sr013/teamrun-two-id-lifecycle.log` |
| 3i | Sequential migration validity maintenance | `autobyteus-server-ts`; one Vitest process per prior failing file | Adjudicate/rewrite the remaining pre-SR-013 failures without hiding failures through concurrency | Halted at 3k; remaining six files / 10 failures not maintained | Not produced; initial discovery is 3j |
| 3j | Initial sequential rerun of the remaining seven migration files | `autobyteus-server-ts`; one Vitest process per file | Reconfirm and classify the 15 remaining failures after the SR-013 TeamRun gate | Non-clean: all 15 reproduce. Token usage mixes stale `{segments}`/deleted-path assertions with a still-required task-Team correction scenario; other files await maintenance | `api-e2e-evidence-sr013/migration-sequential-maintenance-initial.log` |
| 3k | Bounded token-usage fixture correction and focused rerun | `autobyteus-server-ts`; exact one file; `--no-watch` | AC-029/AC-032 exact current output plus historical task-Team root/chain reconstruction | **Fail (`API-F-007`)**: 3/4 pass; historical task-Team row remains rooted at `taskTeamRun1`, proving root/chain/member-prefix reconstruction was removed | `api-e2e-evidence-sr013/token-usage-address-focused.log`; `token-usage-address-failure-analysis.log` |
| 4 | Focused integration/API/E2E suites | Server package/root | Runtime composition, GraphQL/WebSocket/external/history/task/memory | Not Tested; halted at `API-F-007` | Not produced |
| 5 | Production TypeScript/build and SDK/application/web artifact checks | Workspace packages | Current contracts build; generated/vendor/importable parity; sanitized bootstrap | Not Tested; halted at `API-F-007` | Not produced |
| 6 | Proportionate broader deterministic repository suites, then whole-server/web baseline where supported | Workspace packages | Regression detection and independent classification of known non-clean baseline | Not Tested; halted at `API-F-007` | Not produced |
| 7 | Static forbidden-field/V4-current-authority/diff audits | Worktree | No compatibility authority; opaque/migration/incompatibility allowlists explicit | Not Tested; halted at `API-F-007` | Not produced |
| 8 | Isolated real-E2E preflight and three-row nested-classroom live matrix | Disposable app root/DB/staged package; exact contract | All R-044–R-048 / AC-040–AC-044 live behavior | Not Tested; halted before isolated `pnpm secrets:import`; no row is a passing skip | Not produced |
| 9a | Fresh SR-015/current-state coverage investigation | Worktree; no durable edits or execution | Adjudicate old token owner, canonical aggregate/store, cleanup, exact provider instruction, remaining deterministic, live, and browser coverage | Complete; API-REV-012 plan established | `api-e2e-evidence-sr015/sr015-initial-coverage-investigation.log` |
| 9b | Focused `API-F-007` canonical planner/migrator/store/aggregate recheck after bounded durable maintenance | `autobyteus-server-ts`; project Prisma/temp roots | Exact direct/task-Agent/nested-task-Team reconstruction, terminal historical record, one transaction, rollback/verification, retry/idempotence, cleanup/gate | Planned | `api-e2e-evidence-sr015/token-canonical-focused.log` and related logs |
| 9c | Remaining migration validity maintenance and sequential final selection | `autobyteus-server-ts`; one process per file followed by final selection | Resolve the six-file/ten-failure checkpoint without concurrency masking | Planned | `api-e2e-evidence-sr015/migration-maintenance-final.log` |
| 9d | Affected server integration/API/E2E, web, production typecheck/build, and broader deterministic coverage | Workspace packages; documented commands | Current runtime/API/frontend/application/provider composition and regression baseline | Planned | `api-e2e-evidence-sr015/deterministic-final/` |
| 9e | Isolated secrets import, preflight, imported nested-classroom three-runtime matrix | Exact disposable SQLite DB/app root/staged package | Mandatory AutoByteus/Codex/Claude live behavior | Planned; missing capability is Blocked/Fail | `api-e2e-evidence-sr015/live/` |
| 9f | Real browser frontend Agent/AgentTeam creation and execution for all three runtimes | Project browser development path against the same isolated server | User-requested creation, runtime/model configuration, launch, hierarchy, interaction, message/task/history surface, console/network health | Planned | `api-e2e-evidence-sr015/browser/` |

## Post-Repository Confidence Scorecard (Mandatory)

API-REV-011 completed as `Fail / 61%`. That remains the latest completed scorecard and is the round-12 starting point, not a current Pass. API-REV-012 scores will be recomputed after repository and broader execution; no confidence is awarded merely for CRR-027 reviewer probes.

| Confidence Category | API-REV-011 Final | What Supports The Result | Residual Failure Or Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 66% | `API-F-001`–`API-F-006` resolved; SR-013 two-ID lifecycle and canonical startup policy pass | R-036/R-041 and AC-029/AC-032 task-Team token reconstruction fails; remaining migration/frontend/API/live criteria incomplete | Correct `API-F-007`, then resume the remaining plan |
| Changed-boundary execution directness | 72% | Exact prerequisite, runner, startup, two-ID historical integration, and token migration paths execute | Six migration files and later changed surfaces remain unmaintained/unexecuted | Fix and rerun the token seam, then complete the migration and boundary selections |
| Cross-boundary integration realism and mock gap | 58% | Real filesystem migration chain, Prisma-backed token migration, task/API/worker/startup seams execute | Token migration no longer crosses into task-delegation records; final API/E2E and real providers absent | Restore the required task-record join, then migration integration and live matrix |
| Environment, configuration, identity, and fixture fidelity | 55% | Real Program Manager/program_manager history fixture, project SQLite, current task records, and temp roots execute | Token task-Team identity is reconstructed incorrectly; isolated live environment was not allocated after halt | Correct identity reconstruction, finish fixtures, then perform the exact secrets-import live setup |
| Failure, edge-case, lifecycle, and recovery evidence | 62% | Unsafe byte stability/no backup, terminal success/warning, final backup/atomicity, repair/retry, and v3 idempotence pass | Task-Team token migration loses root/chain/member prefix; remaining migration failures are not adjudicated | Fix `API-F-007` and continue sequential recovery/negative coverage |
| User-surface, browser, and desktop-shell confidence | 30% | Affected web handler discovery passed; no shell boundary is material | Rooted focus/collision/rendered journey incomplete | Finish frontend; browser only for residual material gap |
| Durable regression coverage quality and relevance | 82% | Current startup gate, rewritten two-ID lifecycle, and corrected exact token-address fixtures directly test approved behavior and exposed the regression | Remaining six migration files and gated API/E2E/frontend/live coverage are incomplete | Preserve this coverage, correct source, and finish maintenance/broad reruns |

- Current overall confidence: `61%` (arithmetic mean, rounded).
- Every critical acceptance criterion directly proven: `No`; R-036/R-041 and AC-029/AC-032 currently fail at token task-Team reconstruction, and the remaining matrix is incomplete.
- Any applicable category below 90%: `Yes`; all seven.
- Default clean-confidence target of 95% met: `No`.
- Material residual risks: migrated task-Team token usage can be attributed to the task TeamRun as a false root and lose its task chain/nested member prefix; six migration files / 10 failures and all later/provider/live evidence remain incomplete.

## Broader Validation Decision

- Decision: `Required`.
- Selected execution modes: repository API/E2E, lifecycle/migration, isolated Live API/provider execution, and targeted browser validation only if frontend repository proof leaves a material user-surface gap.
- Specific confidence gap: the approved contract explicitly requires public import/launch and real provider tool/prompt/task lifecycles on three runtimes, plus blocking multi-store migration and frontend/backend integration that mocked unit tests cannot fully prove.
- Why selected modes improve confidence: they cross the actual package-import, persistence, startup, GraphQL/runtime, provider-process, and task/restore boundaries with exact row configurations and isolated credentials.
- Expected confidence after selected validation: at least 95% overall, no category below 90%, only if every critical deterministic and live scenario passes.
- Browser rationale: web-equivalent frontend behavior should first be proven through its repository store/component/integration suites. Browser execution is conditional because it cannot replace the mandatory live API/provider matrix, and no material Electron-shell change is in scope.
- If Blocked later: record the exact missing runtime/model/credential after safe isolated preflight/import/setup. A skipped row cannot yield Pass.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around the production web renderer, but no material SR-012 preload/IPC/window/shell boundary was identified.
- Web-equivalent behavior: rooted Team projection, focus, stream, history, task, memory, and token state.
- Shell-specific behavior: none required by SR-012 acceptance criteria.
- Chosen validation: frontend repository suites first; project browser path only if a material rendered-state gap remains. Do not disrupt the user's running application.
- Behavior not directly proven initially: live rendered hierarchy/task/history workflow; confidence remains low until repository/frontend evidence and broader-decision reassessment.

## Live Environment And Fixture Plan

- Use the user-confirmed assignment source `/Users/normy/.autobyteus/server-data/.env`; import it only through the repository `pnpm secrets:import` flow after allocating the disposable target environment.
- Allocate an absolute disposable test database and application-data root under a test-owned temporary directory.
- Import secrets with the exact repository command; retain only exit status and non-secret identifier/presence evidence.
- Copy `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test` into a test-owned package root, apply only the two exact handoff overlays and obsolete task-example replacement, record digest/redacted staged diff, and verify source digest remains unchanged.
- Import using supported `LOCAL_PATH`, preferably GraphQL `importAgentPackage`, then discover the staged Team definition.
- For each row, launch a fresh root TeamRun with all persistent/task members on the row's exact runtime/model configuration; record effective non-secret configuration and fresh typed IDs.
- Assert addresses `/`, `/Teacher`, `/StudentStudyGroup`, `/StudentStudyGroup/student_one`, `/StudentStudyGroup/student_two`; intrinsic tools/instruction; exact minimal handoffs; Team coordinator delivery exactly once; nested relative/root-absolute delivery; Team task entry/submit/review; persistent/task identity separation; terminate/restore where supported.
- Required rows: AutoByteus `gpt-5.6-luna`; Codex App Server `gpt-5.6-luna` with medium reasoning; authenticated catalog-exposed Claude Agent SDK model.
- Evidence: timestamps/durations, commands/test IDs, staged digest, run/task IDs, effective configs, address/execution observations, tool/prompt/result shapes, message/task/restore outcomes, redacted logs.
- Cleanup: terminate all owned root/task/provider processes, remove staged package/test database/app root after evidence, and verify the source package and user's normal operational data are unchanged.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `SR012-TMP-001` | Startup-level process probe with test-owned corrupted/legacy store if existing migration tests cannot invoke the real gate | Server refuses to listen and reports the failing item without partial mutation | Process orchestration may be environment-heavy; core migration transformations/recovery should remain durable |
| `SR012-TMP-002` | Exact built-artifact audit/probe | Built/runtime V5/current identity equals source contracts and rejects V4 | Static/generated artifact parity is better retained as reproducible evidence command unless project has an established durable audit suite |
| `SR012-LIVE-001` | Existing real-E2E harness extended/orchestrated for isolated staged package and three providers | Mandatory live matrix | Keep durable only if repository's real-E2E structure supports deterministic configuration without embedding local paths/credentials; otherwise retain test-owned harness/logs as temporary evidence |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Remaining six migration files / 10 failures plus final E2E/frontend/build/broader execution | API-REV-011 halted at `API-F-007`; API-REV-012 is now authorized to resume | Later behavior remains unproven until commands finish | Execute 9b–9d; no success is inferred from source review |
| Three live provider rows | API-REV-011 did not reach environment allocation/import | Critical AC-040–AC-044 remains unproven | Execute 9e using repository `pnpm secrets:import`; unavailable capability/credential is Blocked/Fail, never a passing skip |
| Real frontend Agent and AgentTeam creation across all three runtimes | Newly explicit user requirement; not covered by prior API-only plans | Frontend create/configure/launch/hierarchy/interaction regressions could remain invisible | Execute 9f against the isolated server, correlate browser and server evidence, and preserve screenshots/DOM/results |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `API-F-001`: `TeamRecipientResolver` returned `COLLABORATION_TARGET_NOT_FOUND` for `/product_manager/child`, although `/product_manager` is an Agent before the final segment and the approved table requires `COLLABORATION_TRAVERSAL_INVALID` | `Local Fix` — resolved by IR-007 / CRR-012 and independently rechecked | Contract line 628; API-REV-005 evidence; IR-007; CRR-012; `address-resolver-crr012-recheck.log` (14/14) | None |
| `API-F-002`: `buildAutoByteusManagedTeamContext` omitted the exact `{rootTeamRunId,memberAddress}` `addressing` projection while `buildTaskDelegationToolContextFromNativeContext` required it; factory-injected Team-bound native task operations therefore failed before routing | `Local Fix` — resolved upstream by IR-008 / CRR-014; independent API/E2E recheck is the first round-7 command | R-029; AC-023; UC-016; API-REV-006 evidence; IR-008; CRR-014 | None unless the unchanged recheck regresses |
| `API-F-003`: termination/no-new-work assertion directly invoked private `MixedTeamManager.startTaskAgentInstance`, bypassing the authoritative `TeamRun` / `MixedTeamRunBackend` active-lifecycle gate | `Local Fix` — API/E2E stale test boundary confirmed by CRR-015; preserve the expectation across all five supported operations at the production boundary | CRR-015; `CR-PREM-002`; built reachability probe SHA-256 `2ce151643409ae9f4ff24bdac5ad1a8128ccdcd6b003cf72229f6cee48c57eb6` | Resolved in round 8; no recipient |
| `API-F-004`: active task-Agent `delegate_task` was rejected before activation because `TaskDelegationTargetMapper` compared the exact task `caller.agentRunId` with the immutable persistent node AgentRun ID | `Local Fix` — resolved by IR-009 / CRR-017 and independently rechecked without changing the triggering tests | R-027; prior failure logs; `task-agent-nested-delegation-crr017-recheck.log` (3 files / 32 tests); `dirty-unit-round9-baseline.log` (25 files / 226 tests); current tool-lifecycle integration nested task-Agent scenario | None |
| `API-F-005`: canonical migration failure/runner exception previously reached listen | Resolved by IR-010/IR-011, CRR-020, and corrected 4/4 durable recheck | R-042; AC-037; `startup-canonical-migration-gate-crr020-recheck.log` | None |
| `API-F-006`: legacy-flat prerequisite/two-ID transition failed under API-REV-010 | Resolved by SR-013 / ARCH-REV-008 / IR-013 / CRR-023 and API-REV-011 downstream proof | R-041–R-042; AC-031, AC-037; `prerequisite-runner-startup.log` (14/14); `teamrun-two-id-lifecycle.log` (4/4) | None |
| `API-F-007`: token migration left a historical task-Team row rooted at `taskTeamRun1` rather than reconstructing `rootA`, `[taskTeamRun1]`, and `/StudentStudyGroup/student_one` | Source-resolved by IR-014/IR-015 and CRR-027; API/E2E resolution pending | R-036/R-041; AC-029/AC-032; prior focused 3/4 log; current planner/index/migrator/store/aggregate | Recheck through maintained canonical-owner durable coverage before closing |

## Investigation Decision

- Proceed To Further API/E2E Execution: `Yes`; CRR-027 is a source Pass and authorizes API-REV-012 to resume from the 61% checkpoint.
- Repository-Resident Durable Coverage Expected: `Yes` — replace/retarget old token-owner tests at the canonical aggregate/planner/migrator/store boundary and maintain any remaining stale migration/provider-instruction coverage. Record the final added/updated/removed inventory after execution. Do not edit production source in this stage.
- Starting confidence: prior completed API-REV-011 `61%`; API-REV-012 final confidence is pending repository and broader execution.
- Broader validation decision: `Required`, including the imported three-runtime live matrix and the newly explicit real-browser frontend Agent/AgentTeam creation/execution matrix for AutoByteus, Codex, and Claude.
- Reroute Required Before Further Validation Execution: `No` at investigation start. Any critical repository/live/browser failure will be classified and routed or reported as Blocked under the skill.
- Recommended Recipient: none until API-REV-012 completes, fails, or becomes genuinely blocked.
- Notes: `API-F-001`–`API-F-006` remain resolved. `API-F-007` is source-resolved but not downstream-closed. Real testing must use an isolated exact SQLite target prepared by `pnpm secrets:import`; neither the user's operational database nor a passing skip is allowed. SR-014 exact instruction parity is now in scope across deterministic, live, and browser evidence.

## API-REV-012 Final Evidence And Decision

The round-12 investigation was completed before durable edits and remained authoritative as evidence changed. The execution result is `Fail / 84%`.

### Final validity decisions

- The historical token-usage owner tests were `Stale / Replace`, not mechanically updated. They were removed and replaced by current canonical planner/migrator/transactional-store/aggregate unit and GraphQL coverage. Replacement evidence passes 5/5 plus 1/1.
- The six individually adjudicated migration fixtures were `Needs Update`; after current schema-v3/dependency maintenance, the seven-file selection passes 29/29.
- Existing provider bootstrap/composer fixtures were `Needs Update`, and one three-provider parity suite was `Add Durable Coverage`; the resulting five-file selection passes 21/21.
- The live harness database hard-code was `Needs Update`; it now accepts and verifies the exact disposable test database rather than silently using the tracked `.env.test` default.
- The imported nested-classroom scenario was `Add Real Validation` and remains authoritative. It exposed implementation behavior not covered by the focused repository selection; it must not be weakened or removed.
- Whole-server and whole-web baselines remain `Non-clean / individually adjudicate after source fix`, not accepted as current authority and not counted as a pass.

### Real execution conclusions

1. The secret vault was made ready for the exact disposable database through the repository importer. Evidence: `api-e2e-evidence-sr015/live/secrets-import-result.log` and `secrets-import-postcheck.log`.
2. Browser-created standalone Agents pass on AutoByteus `gpt-5.6-luna`, Codex App Server `gpt-5.6-luna`, and authenticated Claude `sonnet`. Evidence: `api-e2e-evidence-sr015/live/browser/standalone-agent-three-runtime.json` plus screenshots.
3. Public package import and rooted metadata pass for the staged fixture, exact handoff overlays, root/nested coordinators, and all five canonical addresses.
4. `get_handoff_rules` passes its exact minimal ordered result.
5. `API-F-008` fails persistent Team-recipient delivery: `./StudentStudyGroup` resolves to `/StudentStudyGroup/student_one`, but its persistent `agentRunId` is subsequently interpreted as a task AgentRun, returning `TASK_AGENT_RUN_NOT_FOUND` and persisting no communication record.
6. `API-F-009` fails task-Team activation: the valid Team target is rejected because the task registry looks up a Team at the coordinator Agent address, returning `status:not_started` and persisting no task record.
7. Termination/restoration independently passes and preserves the root topology and handoff snapshot.
8. The AutoByteus Team row is `Fail`; the Codex and Claude Team rows are `Not Tested after common critical root-boundary failure`. The three-row matrix is not a pass.

### Outcome routing

- Result: `Fail`.
- Preliminary failure origin: implementation for `API-F-008` and `API-F-009`, subject to `code_reviewer` focused origin review.
- Secondary origin question: browser Activity renders the two rejected structured results as `SUCCESS`; classify whether the native tool/result projection or UI status mapping must change.
- Do not request compatibility fallback, alternate identity, redundant routing coordinates, or weakened test assertions.
- Resume after source correction by rerunning the exact AutoByteus trigger first, then complete fresh Codex and Claude nested-classroom Team rows and final focused/broader validation.
- Authoritative analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/live/nested-classroom-live-failure-analysis.md`.

## API-REV-013 Post-IR-017 Coverage Investigation And Execution Plan

This section was written on 2026-08-09 before any API-REV-013 durable edit, removal, final execution, or failure reroute. Static inventory evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013-initial-coverage-investigation.log`.

### Prior-result recheck and changed boundaries

- Prior completed result: `API-REV-012` — `Fail / 84%`.
- Source authorization: `IR-017` / `b877d343b30fe01bd2f39546c0e8279adbd00dff`; `CRR-029` Pass.
- Required rechecks: `API-F-008` persistent nested Team delivery and `API-F-009` task-Team activation.
- Changed production boundaries: resolved delivery now crosses `TeamRun` / backend / child manager as one complete request; final persistent/task handles validate exact kind, address, task identity, and AgentRun. Task-Team registry now looks up the Team at `request.teamNode.address` and validates its coordinator and ordered execution chain.
- No frontend Activity semantic change is approved or expected. A completed tool invocation may remain visually successful while its structured collaboration operation is rejected; API-REV-013 does not invent a new badge contract.

### Current coverage validity decisions

| Coverage / Surface | API-REV-013 Decision | Reason | Required Action |
| --- | --- | --- | --- |
| `tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts` | `Needs Update` | Its child TeamRun fake still exposes/asserts raw `postMessage`. IR-017 deliberately replaces that lossy boundary with `deliverResolvedInterAgentMessage`. The useful exact target/run/trace/one-delivery assertions remain valid. | Retarget only the child fake and assertions to the complete resolved request. Add fail-closed identity evidence if it fits this owner; do not weaken the prior scenario. |
| `tests/unit/agent-team-execution/task-delegation-service.test.ts` | `Still Valid / Recheck` | CRR-029's 17/17 result is source-review evidence only. The service still owns direct-child policy, task identities, and pre-mutation admission. | Rerun unchanged with the current task-Team registry seam. |
| Existing mixed manager, child handle, delivery-coordinator, and task lifecycle selections | `Still Valid / Recheck` | These are the nearest durable regression owners for API-F-008/API-F-009 and their adjacent persistent/task identity invariants. | Execute narrow affected selection after the bounded fake maintenance, then the cumulative changed-server selection. |
| API-REV-012 canonical token/migration/provider durable delta | `Still Valid / Recheck` | IR-017 changes only routing/activation source. Prior passing evidence remains relevant but is not post-fix regression proof. | Rerun the focused current selections and include them in the final cumulative durable inventory. |
| API-REV-012 isolated live harness and staged fixture overlay | `Still Valid` | They use public import, exact disposable database injection, and the user-approved fixture/overlay. No secret or source fixture was mutated. | Allocate a new API-REV-013 disposable root/database, run actual `pnpm secrets:import`, stage/import the same deterministic fixture, and verify hashes again. |
| AutoByteus imported nested-classroom row | `Required Recheck` | This is the exact real trigger for API-F-008/API-F-009. Reviewer built probes cannot replace it. | Launch a fresh root TeamRun on AutoByteus `gpt-5.6-luna`; prove exact handoffs, one persistent child delivery, task-Team creation/submit/review, histories, and lifecycle. |
| Codex and Claude imported nested-classroom rows | `Required Fresh Validation` | They were explicitly Not Tested in API-REV-012 and cannot inherit the AutoByteus result. | Run fresh root TeamRuns for Codex `gpt-5.6-luna` / medium and authenticated catalog-exposed Claude, using all members on the row runtime. Missing capability/credential is Blocked/Fail, never a passing skip. |
| Standalone Agent browser matrix | `Still Valid / Regression Smoke Optional` | API-REV-012 directly passed all three runtimes through the browser, and IR-017 changes Team-only routing. | Preserve prior direct evidence. Rerun only if fresh setup or provider behavior calls it into question; do not let it substitute for Team rows. |
| Whole-server and whole-web baselines | `Non-clean / Proportionate Recheck` | API-REV-012 recorded large unrelated non-clean baselines. Their existence is not acceptance, but another undifferentiated full run has low diagnostic value. | Execute production typecheck/build, cumulative changed-server selection, affected frontend handler suites, and targeted API/E2E/runtime selections. Reuse the prior whole-suite classification unless a changed-surface failure requires broader expansion. |

### Planned execution order

1. Run the current affected child/task selection before edits to reproduce any stale fake failure.
2. Apply the bounded durable child-fake correction, then rerun the affected unit/integration/API/E2E selections.
3. Recheck canonical token, maintained migration, provider-instruction, production typecheck, full build, and current cumulative changed-server coverage.
4. Allocate a new isolated API-REV-013 application-data root and SQLite database on ports 60002/31002; actual-import `/Users/normy/.autobyteus/server-data/.env` through `pnpm secrets:import`; record identifier/status evidence only.
5. Stage and publicly import the nested-classroom fixture with the approved overlays, preserving source hashes.
6. Through the real frontend and built server, execute fresh AutoByteus, Codex, and Claude Team rows. For every row capture effective runtime/model, root/member/task run identities, exact handoffs, persistent nested delivery exactly once, task-Team start/submit/review, history-visible outcomes, lifecycle, browser screenshots, and correlated server evidence.
7. Reassess confidence. Any critical failure is recorded and routed to `code_reviewer`; an eventual Pass with any repository-resident durable delta returns for proportional test-code review.

### Starting confidence and broader-validation decision

- Starting confidence: `84%`, inherited only as the prior completed API-REV-012 result.
- Current result: pending; no IR-017 reviewer probe is counted as API/E2E completion.
- Broader validation: `Required` because two prior critical defects were found only through the real imported Team journey, and two mandatory provider rows remain unexecuted.
- Pass gate: every critical row directly passes, overall confidence is at least 95%, no category is below 90%, no current changed-surface deterministic failure remains, and the cumulative durable delta has a successful proportional code-review pass.

### API-REV-013 initial affected-selection validity update

The pre-maintenance five-file selection (`api-e2e-evidence-sr015/api-rev-013/affected-initial.log`) passed 31/33 and failed only two now-adjudicated stale fixtures:

- `mixed-sub-team-member-handle.test.ts` is confirmed `Needs Update`: its fake lacks `deliverResolvedInterAgentMessage` and still asserts the removed raw `postMessage(message,target,runId)` child boundary. Retain the exact canonical request/run/trace expectation and assert the unchanged resolved request/callback crosses the child boundary once.
- `mixed-team-manager.test.ts` is newly classified `Needs Update`: its task-Team lifecycle fixture places `receiver.memberAddress` at Team `/BuildSquad`, while the approved/current activation request enters through exact configured coordinator `/BuildSquad/review_lead`. Retarget the positive fixture to the coordinator and add one bounded no-start assertion for a mismatched receiver so the new fail-closed seam is durable.
- The unchanged task-delegation service (17/17), task lifecycle integration (6/6), and delivery coordinator (2/2) remain `Still Valid`.

Both failures are API/E2E-owned stale fixtures, not implementation defects. This decision is recorded before the bounded edits below.


## API-REV-013 Final Evidence And Decision

API-REV-013 completes as `Fail / 90%`. The investigation was written before the current-round durable edits, final execution, or reroute and remained authoritative as evidence changed.

### Durable coverage decisions and results

- `mixed-sub-team-member-handle.test.ts` was updated only at the approved child resolved-delivery boundary: the fake now receives the complete immutable `ResolvedInterAgentMessageDeliveryRequest` plus the one callback, and raw `postMessage` is not an authority.
- `mixed-team-manager.test.ts` was corrected to use the configured task-Team coordinator as receiver and now includes a no-start mismatched Team-address case.
- Current-round durable delta: `0 added / 2 updated / 0 removed`; cumulative dirty server-test delta remains `4 added / 52 updated / 2 removed`. No production source was edited by API/E2E.
- Affected post-maintenance coverage passes `5 files / 34 tests`; canonical migration/provider coverage passes `14 files / 55 tests`; the exact changed-server test selection passes `46 files` with `297 passed / 20 skipped tests`; affected web coverage passes `2 files / 34 tests`; production typecheck and `build:full` pass.
- The previously recorded non-clean whole-server and whole-web baselines remain honestly classified as non-clean/unrelated rather than converted into acceptance. The proportionate current selection is the new post-IR-017 evidence.

### Real environment and browser result

- Actual `pnpm secrets:import` configured 9 identifiers in the exact disposable database; dry-run postcheck reports `READY`, 9 `SKIP_CONFIGURED`, and 0 blocked. No value was recorded.
- Public `LOCAL_PATH` package import passes against a newly staged package whose per-file hashes match the prior approved overlay; source fixture and source `.env` hashes remain unchanged.
- Fresh AutoByteus `gpt-5.6-luna` root TeamRun `nested_classroom_test_team_20ce2140b0124e5abb2e3bf4ee04d12c` passes rooted schema/coordinators, exact handoff projection, persistent root-to-child-Team delivery, nested relative peer delivery, nested absolute-root reply, task-Team creation, exact task coordinator ingress, and distinct persistent/task coordinator AgentRun identities. Thus API-F-008/API-F-009 are downstream-resolved.
- `API-F-010` then fails AC-028/AC-030/AC-043. Active task coordinator AgentRun `student_one_e1e50...` sends `./student_two`; the tool reports `DELIVERED`, but the persisted receiver loses task TeamRun `team_local_team_nested_classroom_test_student_st_5c812d9dde5444e69a635bec25f001c2`, uses an empty task chain, and starts persistent peer AgentRun `student_two_c238...`. The task remains active with no submission/review.
- Codex and Claude imported Team rows are `Not Tested after common critical task-Team routing failure`, not skips or passes. Prior real standalone browser Agent rows across all three runtimes remain passing but do not satisfy the Team matrix.

### Confidence scorecard

| Category | Final | Evidence and gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 80% | Prior migration/provider/standalone coverage plus current persistent and task-Team ingress rechecks pass; exact task-run peer messaging and submit/review fail, and two Team rows remain unexecuted. |
| Changed-boundary execution directness | 95% | Current durable selections plus a real built-server/Nuxt/provider execution directly exercise IR-017 and the newly failing root materializer. |
| Cross-boundary integration realism and mock gap | 90% | Real package import, Prisma, WebSocket, browser, provider, persistent child, and task-Team runtime were correlated; provider-specific Team parity remains incomplete after the shared failure. |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact isolated DB/root, actual importer, unchanged source, public import, Luna configuration, fresh typed IDs, and preserved evidence. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Deterministic negatives, accepted-but-misrouted projection, active task state, and root termination are direct; submit/review/restore with completed work cannot execute. |
| User-surface, browser, and desktop-shell confidence | 82% | Real frontend creates/runs the imported Team and prior standalone Agents pass all runtimes; the task journey visibly cannot finish and two Team rows remain untested. Electron-shell-only behavior is not material. |
| Durable regression coverage quality and relevance | 92% | Current routing/migration/provider selections are focused and clean; the newly exposed same-task peer route lacks a passing implementation regression until source correction. |

Arithmetic mean: `89.6%`, reported as `90%`. The critical failed acceptance criteria override the score.

### Outcome routing

- Result: `Fail`.
- New failure: `API-F-010` / `SR015-LIVE-TASKTEAM-002`.
- Preliminary origin: shared root recipient materialization drops the sender's active task-Team chain and always selects persistent runtime identity; exact owner remains subject to `code_reviewer` focused failure-origin review.
- Durable coverage changed this round, but successful proportional test-code review remains deferred because the overall result is Fail. Preserve both updated tests; do not weaken the real scenario.
- Resume only after focused origin review and source correction. Add/maintain a task-Team same-execution relative-peer regression, rerun the exact AutoByteus trigger, then complete fresh Codex and Claude rows.
- Authoritative failure analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-013/live/nested-classroom-live-failure-analysis.md`.


## API-REV-014 Post-IR-018 Coverage Investigation And Execution Plan

This section was written on 2026-08-09 before any API-REV-014 durable edit, removal, final execution, or failure reroute. Static inventory evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr015/api-rev-014/initial-coverage-investigation.log`.

### Prior-result recheck and changed boundaries

- Prior completed result: `API-REV-013` — `Fail / 90%`. It is chronological evidence and will not be rewritten.
- Source authorization: `IR-018` / `035fba611e6895187f7f6d4644993e22efd8c38c`; `CRR-031` Pass.
- Required recheck: `API-F-010` / `SR015-LIVE-TASKTEAM-002`, exact active task-Team peer messaging followed by task-result submission and root review.
- Changed production boundaries: the root manager now validates every nonempty sender task-Team chain through `TaskTeamMessageExecutionResolver`, materializes an in-scope peer from the exact active task TeamRun with the complete ordered chain and exact task-scoped AgentRun, then delivers through the authoritative TeamRun boundary. A target outside the proven task Team retains ordinary persistent routing only after complete task-scope proof.
- Existing real proof retained but not re-counted as post-fix evidence: API-REV-013 persistent nested delivery, task-Team ingress, isolated vault/package import, and the pre-fix API-F-010 record. Fresh runtime rows are still required.

### Current coverage validity decisions

| Coverage / Surface | API-REV-014 Decision | Reason | Required Action |
| --- | --- | --- | --- |
| `tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts` | `Still Valid / Preserve` | API-REV-013 corrected the child fake to forward the complete resolved request/callback. IR-018 depends on that exact boundary and CRR-031 confirms it remains valid. | Preserve unchanged and rerun. Do not restore raw `postMessage` authority. |
| `tests/unit/agent-team-execution/mixed-team-manager.test.ts` existing API-REV-013 corrections | `Still Valid / Preserve` | Exact coordinator ingress plus wrong-receiver no-start coverage remains authoritative for API-F-009. | Preserve both corrections and rerun. |
| `tests/unit/agent-team-execution/mixed-team-manager.test.ts` task peer route | `Add Durable Coverage` | The file currently covers persistent Team materialization and task-Team activation, but it does not durably prove API-F-010's exact same-task-Team peer materialization, full chain, task-scoped AgentRun, one TeamRun delivery/event, and zero persistent fallback. | Add one bounded positive same-task-Team peer scenario plus proportionate fail-closed assertions if naturally owned by the same fixture. No production edit. |
| `tests/unit/agent-team-execution/team-member-delivery-coordinator.test.ts` | `Still Valid / Recheck` | It owns one normalization/trace/event path. It need not duplicate active-directory admission but must remain clean after the route abstraction. | Rerun unchanged unless the bounded manager scenario exposes a stale seam. |
| Task active-run directory, manager, child handle, and task lifecycle selections | `Still Valid / Recheck` | These are the nearest deterministic owners for chain identity, child delivery, activation, and settlement. | Execute narrow affected coverage before and after maintenance, then cumulative changed-server coverage. |
| Canonical token/migration/provider-instruction durable delta | `Still Valid / Recheck` | IR-018 is routing-only, but these current SR-015 changes remain in the cumulative package. | Rerun the focused canonical selection and include all paths in the final inventory. |
| AutoByteus imported nested-classroom row | `Required Fresh Recheck` | It is the exact real API-F-010 trigger and must prove peer reply, exact task chain/run, `submit_task_result`, and accepted `review_task_result`. | Use a new isolated vault/root/database, actual importer, public package import, fresh browser-created AutoByteus Luna TeamRun, and correlated GraphQL/WebSocket/server evidence. |
| Codex and Claude imported nested-classroom rows | `Required Fresh Validation` | They remain Not Tested as Team rows. Shared implementation source does not substitute for provider execution. | Run fresh imported Team rows for Codex Luna/medium and authenticated catalog-exposed Claude; missing capability/credential is Blocked/Fail, never a passing skip. |
| Frontend standalone Agent matrix | `Still Valid / Targeted Smoke` | API-REV-012 directly passed browser creation/execution for all three runtimes and IR-018 is Team-only. | Preserve the direct prior evidence; run fresh browser frontend/Team interactions for all three runtimes and repeat standalone smoke only if catalog/setup behavior signals regression. |
| Whole-server and whole-web baselines | `Non-clean / Proportionate Recheck` | Prior whole-suite failures were individually classified outside the collaboration changes. A blind full rerun would not replace changed-boundary proof. | Run production typecheck/build, affected unit/integration/API/E2E, cumulative dirty test selection, and affected web suites; expand only on a changed-surface signal. |

### Planned execution order

1. Execute the current affected routing selection before maintenance and record the baseline.
2. Add bounded durable same-task-Team peer coverage at the root manager/active TeamRun boundary while preserving both API-REV-013 fixture corrections; rerun affected and cumulative deterministic coverage.
3. Recheck canonical migration/token/provider coverage, production typecheck, `build:full`, affected frontend suites, and current-authority audits.
4. Allocate a new API-REV-014 application-data root and exact SQLite database on owned ports; use an actual TTY `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`, record identifiers/status only, then verify `READY`, runtime catalogs, and source hashes.
5. Stage and publicly import the approved nested-classroom package without mutating the source fixture.
6. Through the real frontend and built server, execute fresh AutoByteus, Codex, and Claude Team rows. Capture exact runtime/model/config, root/member/task identities, handoffs, persistent nested delivery, task-Team same-peer routing, reply, submit/review, history-visible state, lifecycle, browser state/screenshots, and correlated server evidence.
7. Reassess confidence, update canonical reports, append exactly one API-REV-014 completed entry, clean owned processes/data as appropriate, and route a Pass with the cumulative durable delta for proportional test review or a critical failure for focused origin review.

### Starting confidence and broader-validation decision

- Starting confidence: `90%`, inherited only as the prior completed API-REV-013 result.
- Current result: pending. CRR-031's source probes are not counted as completed API/E2E proof.
- Broader validation: `Required`; the prior defect existed only in the real imported task-Team journey, and two required provider Team rows remain unexecuted.
- Pass gate: exact AutoByteus/Codex/Claude Team rows all pass; task peer reply plus submit/review is directly observed with exact current identities; every critical acceptance criterion is proven; overall confidence is at least 95% with no category below 90%; current deterministic checks are clean; and the cumulative durable test delta is returned for proportional review.

## API-REV-014 Final Evidence And Decision

API-REV-014 completes as `Pass / 96%`. The investigation above was written before the current-round durable edit and final execution and remained authoritative as evidence accumulated.

### Final coverage decisions

- The API-REV-013 `mixed-sub-team-member-handle.test.ts` complete child resolved-delivery correction remains valid and unchanged.
- The API-REV-013 exact task coordinator ingress and wrong-receiver no-start assertions in `mixed-team-manager.test.ts` remain valid.
- `mixed-team-manager.test.ts` now also owns one bounded exact same-task-Team peer scenario. It proves the full task chain, exact task-scoped peer AgentRun, one child TeamRun delivery, one root event, and zero persistent fallback.
- No durable test file was removed or weakened in this round. Current-round delta is `0 added / 1 updated / 0 removed`; cumulative dirty server-test delta is `4 added / 52 updated / 2 removed`.
- Existing canonical migration/token/provider-instruction and affected frontend coverage remains valid and passes its final selections.
- Prior whole-server/web broad failures remain a classified non-clean baseline, not passing authority. The accidental whole-web invocation was stopped and the exact affected web command passed.
- The prior browser standalone-Agent matrix remains valid because IR-018 is Team-only. Fresh browser AgentTeam creation and interaction nevertheless ran on every required runtime.

### Final execution evidence

| Coverage / Surface | Final Result | Evidence |
| --- | --- | --- |
| Affected task routing/lifecycle | Pass: 5 files / 35 tests | `api-rev-014/affected-final.log` |
| Canonical migration/token/provider | Pass: 14 files / 55 tests | `api-rev-014/canonical-migration-provider-final.log` |
| Cumulative changed server tests | Pass: 46 files / 7 skipped; 298 tests / 20 declared skips | `api-rev-014/changed-server-tests-final.log` |
| Production typecheck/build | Pass | `api-rev-014/production-typecheck.log`; `api-rev-014/build-full.log` |
| Affected frontend | Pass: 2 files / 34 tests | `api-rev-014/web-affected-final.log` |
| Actual isolated `pnpm secrets:import` | Pass: `READY`, nine configured IDs, zero blocked | `api-rev-014/live/secrets-import-result.log`; postcheck |
| Public staged package import/catalog | Pass | `api-rev-014/live/runtime-catalog-and-package-import.json` |
| AutoByteus Luna imported Team | Pass | `api-rev-014/live/nested-classroom-autobyteus-postfix.json` |
| Codex Luna explicit medium imported Team | Pass | `api-rev-014/live/nested-classroom-codex-postfix.json` |
| Claude authenticated `sonnet` imported Team | Pass | `api-rev-014/live/nested-classroom-claude-postfix.json` |
| Terminate/restore/final inactive lifecycle | Pass | `api-rev-014/live/autobyteus-terminate-restore-lifecycle.json` |
| Browser configuration/creation/interaction | Pass on all three rows | `api-rev-014/live/browser/`; browser resource audit |

### Prior failure resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-F-010` / `CR-F-018` | Task-Team peer accepted but substituted persistent execution, preventing submission/review | Resolved by IR-018 / CRR-031 and downstream real execution. AutoByteus, Codex, and Claude each preserve the exact task TeamRun on both peer messages, use distinct task AgentRuns, submit the exact result, and reach accepted review. | `live/nested-classroom-live-matrix-summary.json`; three structured row files |
| `API-F-008` / `API-F-009` | Previously resolved persistent child delivery and task-Team activation defects | Remain resolved in every fresh live row and current deterministic selection. | Same matrix and affected evidence |
| `API-F-001`–`API-F-007` | Resolved implementation or stale-coverage findings | Remain resolved; canonical, migration, provider, and changed-server selections pass. | Current final deterministic evidence plus prior canonical records |

### Environment and cleanup disclosure

The first server-start attempt incorrectly inherited the user's operational `DATABASE_URL` despite a test `--data-dir`. Before containment it applied one pending Prisma migration and wrote a failed canonical migration result with 203 failures to `/Users/normy/.autobyteus/server-data/db/production.db`. No risky rollback was attempted. All accepted live evidence was then produced only after explicitly sourcing the test-owned environment and verifying the exact disposable datasource. This is recorded as an API/E2E setup defect and lowers environment confidence; it is not hidden or counted as a product pass. Evidence is `live/server-environment-collision.log` and `live/server-environment-collision-analysis.md`.

After final evidence capture, every run was inactive, owned browser/server/frontend processes stopped, ports closed, disposable app-data/database/vault/staged package removed, and source `.env` plus source fixture hashes remained unchanged. The operational database side effect was intentionally not automatically reversed.

### Final confidence and routing

- Requirement and acceptance proof: `98%`.
- Changed-boundary directness: `98%`.
- Cross-boundary realism: `98%`.
- Environment/configuration/identity fidelity: `90%` because of the disclosed initial operational-DB collision.
- Failure/lifecycle/recovery evidence: `96%`.
- User-surface/browser confidence: `97%`.
- Durable regression coverage quality: `98%`.
- Overall confidence: `96%` (arithmetic mean 96.4%, rounded).
- Every critical criterion proven: `Yes`.
- Applicable category below 90%: `No`.
- Overall result: `Pass`.
- Open implementation/API/E2E failure ID: `None`.
- Required next route: `code_reviewer`, because repository-resident durable coverage changed. The cumulative package, coverage investigation, execution report, revision record, changed durable tests, and evidence must receive proportional test-code review before delivery.

## API-REV-015 CRR-032 Final Coverage-Package Decision

API-REV-015 completes the pre-edit round-15 plan above as `Pass / 96%`. It reissues the cumulative durable-coverage package only; CRR-032 explicitly preserved API-REV-014's successful product/runtime result, the real three-provider matrix, and resolution of API-F-010.

### TR-F-002 adjudication and correction

- The seven capability-gated runtime E2Es were individually classified `Replace / Restore`. Their only ticket diffs mechanically changed the collaboration tool argument while their launch/query/socket setup remained pre-current (`memberName` / `memberRouteKey` create inputs, and in the nested suite schema-v2 path/segment shapes). They were restored byte-for-byte to artifact HEAD and are not represented as maintained, executed, skipped-pass, or current-contract evidence in this ticket. Current durable unit/integration/API coverage plus API-REV-014's real imported AutoByteus/Codex/Claude Team matrix replace their intended changed-boundary evidence.
- Both duplicate XML-patch prompt tests were classified `Out Of Scope / Restore`. They are Vitest-excluded and import a deleted owner, so their mechanical ticket edits were restored byte-for-byte to artifact HEAD and are not counted.
- Restoration verification covers all nine paths with zero ticket diff and SHA-256 evidence in `api-e2e-evidence-sr015/api-rev-015/restored-stale-paths-final.log`.
- The corrected active server selection contains exactly 46 executable changed test files plus one shared fixture. All 46 files pass, 298/298 tests pass, and there are zero skipped files/tests in the maintained selection. Evidence: `api-e2e-evidence-sr015/api-rev-015/changed-server-tests-final.log`.

### TR-F-003 inventory, ownership, and isolation correction

- One exact cumulative disposition inventory now spans the server, the two web tests, both durable live-E2E support files, both removed/replaced tests, and the nine restored/out-of-delta paths: `api-e2e-evidence-sr015/api-rev-015/cumulative-durable-coverage-inventory.tsv`.
- Current delta: `53` paths = `4 added / 47 updated / 2 removed`. Component split: `49 server`, `2 web`, `2 live-E2E support`. The inventory also records `9` restored paths as explicitly outside the current delta, for `62` total disposition rows.
- API/E2E owns `test-support/live-e2e/live-e2e-harness.ts` and `test-support/live-e2e/run-live-e2e.mjs` in this cumulative maintenance package. The changes propagate the exact launched disposable SQLite target and make the in-process harness reject any target mismatch before scenario execution.
- Focused isolation proof passed against an owned disposable runtime/database: an exact explicit database was accepted (`1` preflight file passed), a second safe but mismatched test database failed closed with `LIVE_E2E_DATABASE_TARGET_MISMATCH`, no operational database was referenced, and all owned runtime/database artifacts were removed. Evidence: `api-e2e-evidence-sr015/api-rev-015/live-harness-isolation-final.log`.
- The affected web tests remain valid and pass `2 files / 34 tests`. Production TypeScript, full build/bootstrap smoke, launcher syntax/propagation audit, and diff hygiene pass.

### Final broader-validation and confidence decision

- No live product rerun was required for this bounded correction. Restoring obsolete skipped/excluded edits and adding harness safety proof cannot change the production/runtime behavior already proven by API-REV-014. The prior real browser/imported nested-classroom AutoByteus `gpt-5.6-luna`, Codex `gpt-5.6-luna` with medium reasoning, and authenticated Claude `sonnet` rows remain direct evidence and were explicitly preserved by CRR-032.
- The repository importer statement is precise: `pnpm secrets:import` made the vault `READY` for the exact disposable test runtime/database used in API-REV-014 because the imported source and target configuration were valid. It does not make every environment's vault ready automatically; readiness is scoped to the selected application-data root/database and must be confirmed by the post-import status check.
- The disclosed mutation to `/Users/normy/.autobyteus/server-data/db/production.db` remains visible. No automatic rollback was attempted. This local-fix execution used only test-owned SQLite paths and did not reference that operational database.
- Final confidence remains `96%`: every critical acceptance path retains direct real evidence, the corrected maintained durable selection is fully executable, and database-target isolation now has direct fail-closed proof. No category is below 90% and no API/E2E or test-review finding remains open pending proportional re-review.
- Routing: return API-REV-015 and the exact cumulative durable path package to `code_reviewer`; delivery remains gated on a proportional test-code Pass.
