# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md`
- Solution Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/solution-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-review-report.md`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/implementation-revision-record.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-report.md`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-revision-record.md` (not yet created)
- Current API/E2E Revision ID: `N/A`
- Current Investigation Round: 1
- Trigger: `CRR-002` passed implementation source review and requested API/E2E investigation and execution, prioritizing `MP-CR-001` and `MP-CR-002` for Agent and Team.
- Prior Investigation Reviewed: None; a missing prior record is not treated as prior evidence.
- Latest Authoritative Investigation: Round 1, initial pre-edit inventory and plan.

## Current Requirement And Design Basis

An existing standalone Agent Run or root Agent Team Run remains completely configuration-locked while active. After the existing Stop operation completes and a network-fresh server response confirms stopped editability, only schema-supported `llmConfig` controls unlock; runtime, model, workspace, definitions, topology, identities, provider bindings, and unrelated launch settings stay fixed. Save is an explicit, revision-checked, lifecycle-serialized persistence operation that leaves the subject stopped. The next restore must reuse the same logical/provider identities and consume the saved configuration.

Team Save is root-owned and accepts only configured root, nested-team, and configured-agent scope patches. Parent changes propagate in the browser only through draft-start matching descendants not directly edited in the draft; divergent/directly edited branches remain boundaries, transient task executions are excluded, and the stopped-run surface has no Reset-to-inherited action. Current runtime/model schemas are authoritative and failures must preserve canonical storage. AutoByteus, Codex, and Claude adapters must use the saved settings at restore/query time.

The two highest-risk return paths are reachable and critical:

- `MP-CR-001`: restore wins before Save without changing the canonical revision; `RUN_ACTIVE` may retain rejected input only while locked, and a later Stop plus fresh canonical read must force a clean baseline.
- `MP-CR-002`: another client commits revision R2, restore wins, and an R1 client receives `RUN_ACTIVE` with canonical R2. R2 must replace the stale baseline/input atomically, stale Save must remain blocked, and only a new post-Stop edit may submit R2.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / definition editing | Preserved | REQ-015, AC-015, DS map | Regression-check launch/definition flows do not call the stopped-run mutations. |
| BEH-002 / restore consumes persisted config | Changed | REQ-004, REQ-006, REQ-007; AC-001, AC-002, AC-007, AC-014, AC-016 | Execute persistence through real storage and restore the same Agent/Team IDs; retain runtime-adapter checks. |
| BEH-003 / active runtime immutability | Preserved | REQ-002, REQ-003, REQ-006, REQ-009 | Direct API updates against active Agent/Team subjects must return `RUN_ACTIVE` and not write. |
| BEH-004 / standalone existing-run editor | Added | REQ-001–REQ-007, REQ-009–REQ-014; AC-001–AC-004, AC-009–AC-014 | Real GraphQL and browser state evidence are required for active lock, stopped Save, revisions, reconciliation, and fixed controls. |
| BEH-005 / Team existing-run editor | Added | REQ-001, REQ-003–REQ-015; AC-005–AC-015; MP-001 | Add full Team browser rendering and real root/nested/member patch API coverage, including no Reset. |
| BEH-006 / canonical contract and revision | Added / Changed by IR-002 | REQ-009, REQ-012–REQ-014; CR-F-001; MP-CR-001/002 | Execute real canonical payload/revision outcomes across active, unchanged-revision, advanced-revision, stale, no-op, and restart paths. |
| BEH-007 / catalog and Claude application | Changed | REQ-004, REQ-010, REQ-011; AC-009, AC-011, AC-016 | Retain strict validation/catalog and Claude option-bridge tests; run catalog-backed API rejection. Real provider invocation depends on local capability preflight. |
| Broad editable flags, browser-only mutation, stored-Team projection, activation-only service path | Removed | Design removal plan; implementation/code-review legacy checks | Existing obsolete coverage was already removed in IR-001. Do not restore compatibility assertions. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Strict schema validation, revision digest, narrow metadata/tree mutation | Focused validator, revision/persistence, mutator, lifecycle and manager tests | Full request-to-file behavior using current catalogs | Built-server GraphQL E2E |
| API / transport / contract | Yes | Agent/Team resume editability and narrow update mutations | GraphQL type source and generated client; no dedicated E2E mutation test | Schema mapping, JSON field presence, canonical payloads, typed outcomes over HTTP | Built-server GraphQL E2E |
| Frontend component / state | Yes | Specialized drafts, fixed/editable split, Save/reconciliation | Store/planner/form Vitest, including IR-002 paths | Real renderer composition, catalog loading, DOM focusability and full Team tree | Browser probe against real backend/frontend |
| Browser integration / user journey | Yes | Selected existing-run Stop/edit/Save/relock journey | Agent-only temporary implementation inspection; no repository browser journey | Full Team rendering, actual Apollo/API wiring, active/stopped DOM states | Browser |
| Authentication / session / permissions | No material change | Existing access model only | Existing standard GraphQL path | No new authorization contract | N/A |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer used by Electron | Vue tests and prior temporary Chromium inspection | Full Team web-equivalent renderer state | Browser development path |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package change | Changed-path inventory | None for this behavior | None; actual Electron is not justified |
| Process / lifecycle | Yes | Per-Agent and root-Team lanes order Save/restore/archive/delete | Direct owner unit/integration tests | Real HTTP clients and running service lifecycle, process restart | Built-server lifecycle E2E |
| Persisted-data transition | Yes | Existing metadata/tree `llmConfig` edited in place; no schema change | Persistence-focused unit/integration tests | Real files before/after, restart reader, identity equality | Built-server E2E with isolated runtime |
| Worker / queue / distributed coordination | Yes, bounded | Per-identity in-process transition lanes and catalog queues | Owner tests | Real multi-client HTTP ordering; not multi-node distributed | Concurrent GraphQL clients / lifecycle probe |
| External integration | Yes | Claude pinned SDK options and provider binding | Direct Claude session/client tests | Actual provider acceptance requires configured Claude capability | Live-E2E preflight; run only if configured |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript Fastify + Mercurius/TypeGraphQL backend; Nuxt/Vue/Pinia/Apollo frontend; Electron wrapper; Vitest; Playwright Core browser probes.
- Conflicting, missing, or unclear project instructions: No conflict. Server `AGENTS.md` requires `vitest run --no-watch`; root scripts define isolated deterministic E2E separately from development data. Generic server `typecheck` has a recorded TS6059 limitation, so the production build config is authoritative for source typecheck.
- Required environment variables or secrets available: N/A for deterministic GraphQL/browser coverage. Real Claude invocation is conditional and must be reported as configured, unavailable, or skipped by the existing live-E2E preflight rather than fabricated.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/package.json` | Root scripts | `pnpm test:e2e` runs server E2E; `pnpm dev` builds and starts backend 8000/frontend 3000; live provider preflight is separate. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/README.md` | Monorepo development/E2E instructions | Deterministic tests use test-owned runtime and must not use development DB. Development stack owns only its two child processes and `.autobyteus/development`. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-server-ts/vitest.config.ts` | Test runner | Fork pool, serial files, Prisma test setup/global setup, `tests/**/*.test.ts`. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-server-ts/README.md` | Server execution and test data | Test environment uses `.env.test` and test-owned temporary SQLite under `tests/.tmp`; real capabilities are env-gated. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/test-support/live-e2e/test-runtime-bootstrap.mjs` | Built-server E2E harness | Creates sanitized isolated runtime roots/databases, starts current built server on a safe port, checks readiness, and removes only owned state. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-web/README.md` | Frontend/browser/desktop testing | Browser development path is preferred for web-equivalent behavior; specific Vitest uses `--run`; Playwright Core probes may install/remove a temporary fixture route. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-web/package.json` | Web scripts | Nuxt build/test commands and existing browser-probe conventions. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies | workspace root | Existing `pnpm install --frozen-lockfile` state from implementation | No lockfile change planned | Required packages resolve | None |
| Built backend E2E | server test harness | `pnpm --filter autobyteus-server-ts build`, then focused Vitest E2E | Per-test isolated runtime/database/home and free port | Harness `/rest/health` readiness | `server.stop()` and `removeOwnedTestRuntime` in `afterEach` |
| Browser fixture | `autobyteus-web` | Owned probe starts Nuxt on a free port, pointing to an owned built backend | Temporary fixture page only; no Electron launch or product data | HTTP route plus semantic DOM marker | Kill owned process group; remove fixture page and owned runtime/output as specified |
| Real provider preflight | workspace root | `pnpm test:e2e:real:preflight` | No invocation; reports configured/missing/unavailable | Harness report | No provider process retained |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions | Public GraphQL create mutations | Unique labels per isolated runtime | Removed with owned runtime/database |
| Agent Run and Team Run packages | Public GraphQL create/terminate/restore APIs | Workspace paths under owned runtime root; no production paths | Removed with owned runtime |
| Model/schema | `providerModelCatalogSnapshots(runtimeKind: "autobyteus")`; select a deterministic model with a usable schema and derive valid distinct configs | No secret needed merely to create/restore; no real LLM turn sent | No persistent external data |
| Multiple clients/revisions | Independent HTTP GraphQL requests retaining R1/R2 tokens | Same isolated server, deterministic ordering | No separate account/session state |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: Create normal current standalone `run_metadata.json` and Team schema-v2 `team_run_execution_tree.json`, stop them, update only selected `llmConfig`, restart the server, and read through the normal resume APIs. IDs, provider/runtime references, topology, workspaces, launch facts, and other files/fields must remain equal.
- Evidence planned: semantic before/after comparison of persisted JSON after narrow Save, canonical query equivalence, restart read, and same-ID restore.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts` update/race cases | Inactive narrow commit, active rejection, Save-first blocking restore | REQ-006, REQ-009; AC-003/004; DS-001/006 | Still Valid | Direct lifecycle owner with controlled lane ordering | Retain and execute. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` stopped update/restore | Active Team rejection and stopped patch used on restore | REQ-003, REQ-006–009; AC-007/008; DS-003/004/007 | Still Valid | Real manager/tree store but mocked validator and no GraphQL transport | Retain and execute; supplement with E2E. |
| `agent-run-history-catalog-service.test.ts` / `team-run-history-catalog-service.test.ts` | Serialized persistence, revision/archival/delete safety | REQ-007, REQ-009, REQ-013/014 | Still Valid | Persistence-owner assertions | Retain and execute focused/broader server suites. |
| `model-config-validation-service.test.ts` | Invalid key/type/enum/range and absent schema outcomes | REQ-010; AC-009/011 | Still Valid | Direct strict validator | Retain; add catalog-backed API invalid case. |
| `team-run-model-config-mutator.test.ts` | Configured-only narrow mutation and transient/kind/duplicate rejection | REQ-001, REQ-008; AC-005/006/012/014 | Still Valid | Pure authoritative transformation | Retain. |
| Claude normalizer/session/client tests | Independent capability emission and thinking/effort query mapping on restored session | REQ-004; AC-016; DS-008 | Still Valid | Direct typed SDK boundary without real provider | Retain; conditionally supplement with live capability if configured. |
| Codex thread/bootstrap coverage and AutoByteus restore/factory coverage | Runtime-specific config reaches constructed/turn settings | REQ-004/006; AC-001/002/016 | Still Valid | Direct adapter/factory tests | Execute affected focused tests; real provider call is conditional. |
| `autobyteus-web/services/runConfigEditing/__tests__/existingTeamModelConfigDraft.spec.ts` | Draft-start propagation and direct-edit boundaries | REQ-008; AC-005/006; MP-001 | Still Valid | Pure planner scenarios | Retain and execute. |
| `autobyteus-web/stores/__tests__/existingRunModelConfigStore.spec.ts` | Indeterminate lock, schema fail-closed, Agent/Team MP-CR-001/002 reconciliation | REQ-009–014; AC-004/008/010/011/013; CR-F-001 | Still Valid | Direct store transition assertions with mocked transport | Retain and execute; supplement real API and browser composition. |
| Agent/Team form and RunConfigPanel component tests | Fixed/editable fields, selected editor routing, no existing Team Reset event | REQ-001/005/008/011/012/015; AC-005/006/012/013/015 | Still Valid | Vue component-level evidence | Retain; add real browser Team rendering. |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | Current Team hierarchy persists/restores through GraphQL and restart | REQ-007/015; AC-014/015 | Still Valid | Built server, real files, current V2 reader/writer | Retain; reuse its fixture style but do not overload it with stopped-update behavior. |
| Existing runtime/live-E2E suites | General runtime sends and provider availability | BEH-002/003 | Still Valid but only partially relevant | Env-gated external runtimes and unrelated journey focus | Run focused configured capability preflight; do not misreport unavailable providers. |
| Removed `StoredTeamRunFormModel` and historical stored-only tests | Asserted obsolete unconditionally read-only stored Team model | Removed contract; BEH-005/REQ-008 | Stale / Remove (already removed in IR-001) | Git delta and code-review cleanup verdict | Do not restore; replacement planner/form/browser scenarios cover current behavior. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Removed `autobyteus-web/services/teamExecution/__tests__/storedTeamRunFormModel.spec.ts` and `components/workspace/config/__tests__/StoredTeamScopeHistoricalFields.spec.ts` | Stored Team configuration is always read-only and uses the old projection | Stopped Team `llmConfig` is now editable through a specialized existing-run model | BEH-005, REQ-003–008, implementation legacy check | Current planner, Team form/component coverage and planned Team browser scenario | Removal already occurred upstream; API/E2E will not recreate it. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-001 | Standalone GraphQL resume/update: active rejection, stopped Save, no-op, validation, stale revision, persistence, restart, identity preservation | REQ-001–007, REQ-009–014; AC-001–004, AC-009, AC-014; DS-001/002/006 | `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | No existing test crosses GraphQL -> lifecycle -> catalog -> real metadata file for this mutation. |
| API-E2E-002 | Team GraphQL root/member narrow patches: active rejection, stopped Save, no-op/stale/invalid, restart, exact fixed-tree preservation | REQ-001, REQ-003–010, REQ-012–014; AC-005–010, AC-014; DS-003/004/007 | Same E2E file | Existing manager integration bypasses the public API/current catalog and does not compare real persisted files. |
| API-E2E-003 | `MP-CR-001` unchanged-revision restore-first -> `RUN_ACTIVE` -> Stop/fresh-read for Agent and Team | REQ-005/009/012; AC-004/008/013; UXJ-004 | Same E2E file plus browser probe state assertions | Source/store tests are mocked; the reachable real lifecycle/API response must be proven. |
| API-E2E-004 | `MP-CR-002` two-client R1/R2 -> restore -> `RUN_ACTIVE` canonical R2 -> Stop -> new edit uses R2 for Agent and Team | REQ-009/012/014; AC-004/008/013; CR-F-001 | Same E2E file plus browser probe state assertions | Highest-risk lost-update path; must cross actual revisions and storage. |
| API-E2E-005 | Full existing-Team web-equivalent renderer with real resume/update API: fixed controls, active/stopped notice, hierarchy disclosure, no Reset, enabled Save after valid edit, canonical clean state | REQ-003–005, REQ-008, REQ-010–012; AC-005–008, AC-011–013; UXJ-003/004 | `autobyteus-web/tests/e2e/stopped-run-model-config-probe.mjs` and fixture page | Prior browser inspection covered Agent only and was temporary; full Team rendering is the material UI gap. |

## Durable Coverage To Update

None planned. Existing relevant assertions remain approved and coherent.

## Durable Coverage To Remove

None planned in API/E2E. Obsolete stored-Team tests were already removed in the reviewed implementation.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts` | API-E2E-001 through API-E2E-004 over built isolated server | Planned | Console log plus retained report evidence directory |
| 2 | Focused server lifecycle, persistence, validator, Team manager, runtime adapter tests | `autobyteus-server-ts` | Direct owner boundaries and three-runtime application | Planned | Console log |
| 3 | Focused web store/planner/form suites | `autobyteus-web`; `pnpm exec vitest run ...` | IR-002 reconciliation, Team planner, fixed/editable form boundary | Planned | Console log |
| 4 | `pnpm --filter autobyteus-server-ts build` and web boundary/localization/build checks | workspace/server/web | Production compilation and generated/runtime boundaries | Planned | Console log |
| 5 | Broader affected server E2E/run-history and web selected-config suites as justified by focused results | Appropriate package | Regression integration | Planned | Console log |
| 6 | Browser probe command to be added under `autobyteus-web` | Owned backend + Nuxt + Chromium | API-E2E-005 and UI portions of API-E2E-003/004 | Planned | Ticket `probes/api-e2e` JSON/screenshots/logs |

## Post-Repository Confidence Scorecard

Repository execution has not yet begun. Scores will be calculated after the planned durable coverage is implemented and executed; no confidence is inferred from upstream implementation-scoped passes.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | Pending | Approved mapping and detailed plan | Execution pending | Execute API and browser scenarios. |
| Changed-boundary execution directness | Pending | Direct owner tests exist | Public API/file boundary not yet executed by API/E2E | Add/run built-server GraphQL E2E. |
| Cross-boundary integration realism and mock gap | Pending | Manager integration and component tests exist | GraphQL/Apollo/browser composition gap | Built-server + browser probe. |
| Environment, configuration, identity, and fixture fidelity | Pending | Project-owned isolated harness discovered | Fixtures not yet created | Use public GraphQL setup and current catalog. |
| Failure, edge-case, lifecycle, and recovery evidence | Pending | Focused mocked lane/store tests exist | Real R1/R2 and Stop/restore outcomes unexecuted | Execute API-E2E-003/004. |
| User-surface, browser, and desktop-shell confidence | Pending | Agent temporary inspection and Vue tests exist | Full Team actual browser path unexecuted | Execute API-E2E-005; Electron shell N/A. |
| Durable regression coverage quality and relevance | Pending | Existing tests classified | New durable paths not yet reviewed/executed | Implement narrow maintainable E2E/probe. |

- Overall post-repository confidence: Pending
- Calculation method: Simple average of the seven applicable categories after execution.
- Every critical acceptance criterion directly proven: No; execution pending.
- Any applicable category below `90%`: Not scored yet.
- Default clean-confidence target of `95%` met: No; execution pending.
- Material residual risks: full Team browser rendering, real multi-client lifecycle ordering, catalog-backed validation, indeterminate filesystem outcome, and real Claude provider acceptance.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` + `Browser` + `Lifecycle`
- Specific confidence gap or residual risk addressed: The reviewed source passes do not cross HTTP GraphQL into real package storage/restart, and no durable browser path renders the complete existing Team editor or its canonical active/stopped/Save states.
- Why the selected mode can materially improve confidence: The built-server harness exercises the actual transport, lifecycle owners, catalog validator, atomic files, revisions, and restart readers. The browser probe exercises Nuxt/Apollo/Pinia/current catalog and semantic DOM through the web-equivalent renderer.
- Expected confidence after selected validation: At least 95% overall with no category below 90%, assuming all critical paths pass. A real-provider-only residual may remain bounded if the live preflight reports Claude unavailable.
- Browser-specific decision and rationale: Required because Team hierarchy rendering, focusability, active/stopped notice, no Reset, and contextual Save are user-surface behavior not directly proven by backend/API execution. Browser is appropriate; no changed Electron shell boundary justifies actual desktop execution.
- If Not Required: N/A.
- If Blocked: N/A at investigation time.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/README.md`, Web Development and Packaged Electron E2E sections.
- Web-equivalent behavior: Entire changed selected-run configuration surface, Apollo requests, Pinia reconciliation, Team hierarchy, form actions.
- Shell-specific or lifecycle behavior: None changed; no preload/IPC/window/packaging path is involved.
- Chosen validation approach and why it fits the project: Browser development renderer with owned backend/Nuxt processes, following project instructions and the skill's web-equivalent preference.
- Server/frontend setup when browser validation is used: Isolated built backend plus Nuxt dev on free loopback ports; route proxy points to the owned backend.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron shell integration is N/A for the changed boundary, not a residual defect.

## Live Environment And Fixture Plan

- Startup order and commands: build server; start one owned isolated backend; seed definitions/runs via public GraphQL; start owned Nuxt with backend proxy; launch Chromium via Playwright Core.
- Environment choices that materially affect the run: sanitized environment and isolated HOME/runtime/database; free loopback ports; no production/development data root; English locale and UTC evidence timestamps.
- Health / readiness checks: backend `/rest/health`; frontend route HTTP 200 and fixture DOM marker; model catalog response with one schema-capable AutoByteus model.
- Seed data / fixtures: one standalone Agent Run and one root Team with root, nested Team, and configured agents using normal public create operations and workspaces under the owned root.
- Test identities, authentication, permissions, or session state: existing unauthenticated local-owner GraphQL model; two independent HTTP clients distinguished by retained revision tokens; no new account model.
- Requirement-linked journeys or scenarios: API-E2E-001 through API-E2E-005.
- Evidence to capture: JSON summary; before/after persisted metadata/tree hashes and semantic diffs; GraphQL outcomes/revisions; browser DOM assertions; screenshots for active, stopped, hierarchy, post-Save and reconciliation states; server/Nuxt logs.
- Owned processes and temporary state to clean up: backend process tree, Nuxt process group, browser/context, temporary fixture page, isolated runtime/database/home. Ticket evidence is retained.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-E2E-006 | If the real filesystem-indeterminate branch cannot be triggered safely through normal built-server APIs, use a focused temporary in-process fault-injection probe around the Team commit writer | UI/API never speculates success and blocks until canonical refresh | Platform-dependent post-rename I/O failure injection is brittle as permanent E2E; durable owner/store tests already protect the deterministic policy. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real paid Claude query/session | Execute only if existing live-E2E preflight reports a configured capability; no secret may be invented | Provider may reject mapped options despite pinned SDK typing | Record preflight result; retain direct SDK boundary evidence; report as residual if unavailable. |
| Multi-node/distributed revision coordination | The implementation owns one server process with per-identity lanes and file persistence; no distributed lock contract is approved | None within approved deployment contract | Out of scope unless upstream changes ownership contract. |
| Actual Electron shell | No shell boundary changed and browser proves the web-equivalent renderer | Negligible | Not required. |

## Ambiguities Or Reroute Triggers

None found during the initial investigation.

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes — add API GraphQL E2E and browser probe; no update/removal currently planned.
- Post-repository confidence: Pending execution.
- Broader validation decision: Required — Live API, lifecycle, and browser.
- Reroute Required Before Validation Execution: No
- Recommended Recipient If Reroute Required: N/A
- Notes: Investigation was written before any API/E2E-owned durable coverage edit. Existing relevant coverage is valid but leaves material transport, real-storage/restart, multi-client, and full Team browser gaps.
