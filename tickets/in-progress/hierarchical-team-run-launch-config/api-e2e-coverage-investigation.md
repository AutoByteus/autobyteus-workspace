# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/requirements.md`
- Investigation Notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/investigation-notes.md`
- Design Spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-spec.md`
- Supplemental Task Artifacts:
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/autobyteus-server-ts/docs/design/production_data_migration_conventions.md`
- Solution Revision Record: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-revision-record.md`
- Design Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Architecture Review Revision Record: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/architecture-review-revision-record.md`
- Implementation Handoff: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-handoff.md`
- Implementation Revision Record: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-revision-record.md`
- Code Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`
- Code Review Revision Record: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-revision-record.md`
- Triggering Code Review Revision: `CRR-003` — Pass, 9.4/10, no current findings
- Assigned Worktree: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config`
- Investigation Round: `1`
- Investigation Status: `Initial inventory complete; durable maintenance and execution authorized`
- Initial investigation completed before any API/E2E-owned durable coverage edit or final execution: `Yes`

## Scope And Changed Boundary Classification

| Surface | Applicable | Changed Boundary | Primary Requirements / ACs | Current Evidence Before API/E2E | Required Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Complete Team defaults, exact Team/Agent coverage, root-only expansion, restore | R-011–R-027, R-032–R-036; AC-009–AC-020, AC-024–AC-029 | Passing source review and temporary implementation probes only | Durable planner/service/persistence tests and live create/restore | Repository integration + live API |
| API / transport / contract | Yes | GraphQL `teamConfigs`, complete `memberConfigs`, V2 stream DTO, application member-mode root default | R-021–R-026, R-033–R-036; AC-016–AC-019, AC-024–AC-029 | Generated artifacts and package builds pass; many durable callers still submit the old request | Current GraphQL tests and representative live request | Repository E2E + live API |
| Frontend component / state | Yes | Root/Team/Agent intent, edit/reset coherence, scoped loading/error/lock/repair | R-001–R-020, R-038–R-041; AC-001–AC-015, AC-031–AC-034 | Temporary implementation proofs; existing durable tests predominantly assert the flat model | New hierarchy/store/component coverage | Vitest + browser |
| Browser integration / user journey | Yes | Nested inherited/customized scopes, reset, readiness, repair, stored static history, “Run another” | R-001–R-020, R-028–R-031, R-038–R-041 | Mocked implementation browser inspection only | Real rendered semantic journey with backend correlation | Browser-preferred full stack |
| Authentication / session / permissions | No | No new authentication or permission boundary | R-040 | Existing lock/in-flight state is application state, not auth | N/A | None |
| Desktop renderer / web-equivalent UI | Yes | Workspace and history surfaces also render inside Electron | Same as browser rows | Nuxt build only for final state | Browser proof plus packaged Electron end-system journey requested by user | Browser + packaged Electron |
| Desktop shell / Electron-specific integration | Limited | Local import and bundled-backend launch are used for the requested realistic journey; hierarchy logic itself is not shell-specific | AC-018, AC-021–AC-034 | Existing generic packaged launcher coverage, not this ticket journey | Isolated current-worktree package can import fixture and run without production-state contact | Project packaged Electron validation |
| Process / lifecycle | Yes | Startup migration, Settings Retry, catalog rebuild/admission, restore | R-026–R-031, R-037; AC-019, AC-021–AC-023, AC-030 | Temporary proofs only | Durable copied-fixture migration, retry and catalog-admission checks | Repository lifecycle + isolated packaged runtime |
| Persisted-data transition | Yes | Exact V1 -> exact V2 coordinator-derived transformation | R-028–R-031, R-037; AC-021–AC-023, AC-030 | Migration source exists and code review passed; no durable V2 migration test exists | Representative nested/task/application/null fixtures, invalid target, idempotence, Retry admission | Durable migration test + isolated live startup |
| Worker / queue / distributed coordination | No | No queue/distributed contract changed | N/A | N/A | N/A | None |
| External integration | Yes, bounded | Codex App Server runtime is needed for the user-requested Luna nested-classroom simulation | AC-018, AC-024–AC-029 plus user test direction | Environment capability not yet executed | Real Luna run with exact nested delegation token | Packaged Electron / live system |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config`
- Project type and runtime stack: pnpm monorepo; TypeScript/Node backend; Nuxt/Vue frontend; Vitest; GraphQL/WebSocket; Electron desktop wrapper; SQLite/Prisma; Codex App Server runtime.
- Conflicting, missing, or unclear project instructions: no command conflict. The user’s tentative “pnpm test build” is not an actual package script. Authoritative commands are separate `pnpm test`, `pnpm build`, `pnpm build:electron:linux`, and the packaged launcher `pnpm test:e2e:electron --adapter ...`.
- Required environment variables or secrets available: `Partially known`. Deterministic repository tests are credential-free. Codex live transport requires `RUN_CODEX_E2E=1`; the Luna runtime capability must be checked through the actual environment without claiming success if unavailable. Secret values will not be recorded.
- User-directed live fixture source: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-private-agents`
- User-directed live team: `agent-teams/nested-classroom-test`
- User-directed runtime/model: Codex runtime, model `gpt-5.6-luna`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-hierarchical-team-run-launch-config/README.md` | Monorepo development/E2E authority | `pnpm dev`, `pnpm test:e2e`, Codex gate, packaged Electron commands, isolated launcher behavior |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `vitest run` / `--no-watch`; focused then integration |
| `autobyteus-server-ts/README.md` | Server env, migration, and E2E authority | Test-owned `.env.test` and temp DB; `RUN_CODEX_E2E=1`; startup migration/Retry conventions |
| `autobyteus-web/AGENTS.md` | Closest web test instruction | `pnpm test:nuxt ... --run`; Electron tests separate |
| `autobyteus-web/README.md` | Web/browser/Electron authority | Nuxt tests; `pnpm build:electron:linux`; packaged E2E launcher; isolated data roots |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Persisted transition authority | Known V1 to fixed V2; migration-only legacy interpretation; ordinary retry; exact current-state validation; no speculative recovery |
| Package manifests | Executable command authority | Root/server/web/contracts/devkit exact scripts inventoried |
| `autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-execution-tree-v1/README.md` | Released V1 fixture intent | Five exact historical cases; current wording is stale because V1 is now migration-owned rather than current runtime |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies | worktree root | Existing `node_modules`; otherwise `pnpm install --frozen-lockfile` | Do not mutate unrelated user state | package commands resolve | N/A |
| Focused server checks | `autobyteus-server-ts` | `pnpm exec vitest run <paths> --no-watch` | `.env.test`, temp SQLite under test-owned paths | Vitest exit/result | Test cleanup |
| Focused web checks | `autobyteus-web` | `pnpm test:nuxt <paths> --run` | `NUXT_TEST=true` | Vitest exit/result | Test cleanup |
| Full dev stack | worktree root | `pnpm dev` | Owned data under `.autobyteus/development`; ports 8000/3000 | exact backend/frontend endpoints | Ctrl+C; remove only owned data if selected |
| Packaged Electron | `autobyteus-web` | `pnpm test:e2e:electron --adapter playwright` or current package plus safe E2E profile | Free non-29695 port and isolated temp data root; updater suppressed | launcher health metadata + renderer readiness | launcher-owned process tree/root only |
| Codex runtime | live isolated server/desktop | Configure Codex + `gpt-5.6-luna`; repository live suites use `RUN_CODEX_E2E=1` | Do not claim configured if catalog/session unavailable | catalog admission and completed response | terminate owned run/process only |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Released V1 trees | Copy repository fixture directories to test-owned temporary roots | Never mutate live profile | Remove temp copies |
| Nested-classroom team | Import `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-private-agents` through product import flow | Use isolated Electron data root; source is read-only | Launcher cleanup removes isolated imported state |
| Luna model | Runtime catalog selection `codex_app_server` / `gpt-5.6-luna` | Existing Codex auth/capability only; no secret copying into repo | End/cleanup owned run history if retained |
| Stored-history current run | Launch isolated nested team, then query/open stored history | No production/default profile | Isolated root cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required`
- Design-spec and implementation-handoff references: DS-005; R-028–R-031/R-037; AC-021–AC-023/AC-030; implementation handoff Persisted Data Transition Check.
- Representative existing-data setup and required behavior: disposable copies of all five released V1 fixture cases, including nested configured Teams, task-bearing cases, application binding, handoffs, and nullable `llmConfig`.
- Evidence planned: exact V1 validation; transform; exact V2 read; Team default equals that Team’s direct coordinator decoded launch configuration; all other facts preserved semantically; current catalog admits only V2; already-V2 skip/idempotence; invalid/unsupported source remains intact; Settings Retry awaits catalog rebuild before recovered admission.
- Migration-specific completion/recovery scenarios: ordinary rerun after a failed attempt and post-rename final-state reread classification, without a runtime V1 fallback.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/__tests__/TeamRunConfig.spec.ts`; `composables/__tests__/useDefinitionLaunchDefaults.spec.ts` | Flat root properties plus `memberOverrides` and editable history input | R-016–R-018, R-027 | `Needs Update` | Production model is `rootConfig/teamOverrides/agentOverrides`; stored history is a separate view | Rewrite for root-only seeding, deep cloning, explicit one-way conversion |
| `autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts` | Root/flat-Agent mutation and partial config pruning | R-010, R-015–R-020; AC-006–AC-015 | `Replace` | Assertions address removed flat state and miss arbitrary ancestor/reset coherence | Replace with hierarchy/store command scenarios |
| `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | Member-field helpers and nullable override meaning | R-015, R-031 | `Needs Update` | Nullable/property-presence intent remains valid, but names/shape changed | Retarget current Team/Agent override utilities |
| `autobyteus-web/components/workspace/config/__tests__/{MemberOverrideItem,TeamRunConfigForm,RunConfigPanel}.spec.ts` | Root baseline and flat Agent tree UI | R-001–R-020, R-038–R-041 | `Replace` | Removed builder/path and new Team scope components are untested | Keep valid Agent-local cases; replace obsolete projections with Team scope/form coverage |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionContextFactory.spec.ts` | Coordinator-derived editable projection and old builder round-trip | R-026, R-028–R-031, R-035, R-037 | `Stale / Remove` scenarios, `Replace` file | CR-F-002 resolution deliberately removes this behavior | Rewrite around exact immutable V2 stored view and authorable “Run another” conversion |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` launch cases | Old flat draft and `memberConfigs`-only mutation | R-017–R-025; AC-015–AC-018 | `Needs Update` | Current launch sends complete `teamConfigs` and reconciles stale hierarchy | Retarget current intent and request |
| New `teamRunLaunchHierarchy.ts`, `TeamScopeConfigEditor.vue`, `TeamMemberConfigTree.vue`, stored `Stored*` components | No durable file directly covers their approved boundaries | R-005–R-020, R-028–R-031, R-038–R-041 | `Add Durable Coverage` | Temporary implementation probes are not regression coverage | Add focused resolver/component/stored-view tests |
| `autobyteus-server-ts/tests/unit/agent-team-execution/{team-definition-topology-planner,team-run-service}.test.ts` | Old Agent-only input/plan shapes | R-021–R-027, R-032–R-036 | `Needs Update` | Production requires exact complete Team and Agent coverage | Update plus add invalid coverage/address/allocation cases |
| Server integration/E2E TeamRun create files that send `memberConfigs` without `teamConfigs` | Supported runtime journeys under the old GraphQL contract | AC-016–AC-020, AC-024–AC-029 | `Needs Update` | Required GraphQL field makes current requests invalid | Update representative and all affected current TeamRun callers rather than add compatibility |
| `tests/unit/run-history/services/team-run-v1-package-catalog.test.ts` and imports of deleted catalog | V1 package catalog as current runtime | R-037; DS-004/DS-005 | `Stale / Remove` name/shape, `Replace` behavior | Current runtime is V2-only; catalog class is `TeamRunPackageCatalog` | Rename/replace with exact V2 admission/rejection coverage |
| `tests/unit/run-history/team-run-v1-package-schema.test.ts` and V1 fixture corpus | Exact released V1 package facts | R-029–R-031, R-037; AC-022/AC-023/AC-030 | `Still Valid` only as migration-source coverage | Legacy interpretation remains required inside migration | Move expectations/imports to migration-owned V1 boundary; update fixture README authority wording |
| `tests/unit/app-data-migrations/team-run-execution-tree-v1-app-data-migration.test.ts` | Earlier V1 promotion with current catalog follow-up | Prerequisite migration ordering | `Needs Update` | Promotion remains, but normal catalog is V2 and requires V2 migration first | Preserve V1 promotion proof; remove invalid current-V1 catalog assertion |
| No durable `team-run-execution-tree-v2-app-data-migration` test | N/A | R-028–R-031/R-037; AC-021–AC-023/AC-030 | `Add Durable Coverage` | Only temporary implementation proof exists | Add comprehensive disposable-fixture test |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts`; GraphQL migration tests | Startup/Retry ordering, but mocks deleted V1 catalog | R-037; AC-021/AC-022 | `Needs Update` | Current Settings Retry must rebuild current catalog after migration | Retarget `TeamRunPackageCatalog` and prove awaited admission |
| Application/external/root-only caller tests | Caller-side leaf expansion / old service helper | R-032–R-036; AC-024/AC-025/AC-028/AC-029 | `Needs Update` | Expansion now belongs to `createTeamRunFromRootConfig` | Assert root-only entry and complete hierarchy materialization |
| `autobyteus-application-devkit/tests/application-devkit.test.mjs` | Manifest V4, frontend/backend SDK V4, iframe V4 | R-033–R-036, CR-P-002 | `Needs Update` only for two SDK values; iframe/manifest V4 `Still Valid` | Current unused beta application source cut uses frontend/backend contract V6, while manifest and iframe protocol remain V4 | Change only stale SDK assertions/messages to V6; do not invent migration/version bridge |
| `autobyteus-application-backend-sdk/tests/application-agent-target-address.test.ts` | Application target-address helpers | Out of ticket scope | `Out Of Scope` | Two failures reproduced on base per IR-002 and do not involve launch hierarchy | Run and report baseline; do not alter without new evidence |
| Broad server `tsconfig.json` typecheck | Includes `tests` while `rootDir` is `src` | Build health, not behavior | `Out Of Scope baseline limitation` | Declared pre-existing configuration obstruction | Use `tsconfig.build.json` plus executed suites; report broad failure truthfully |
| Full Nuxt typecheck | Compiles broad stale durable coverage | Regression health | `Needs Update` for ticket-related failures, otherwise baseline classification | Many current test shapes are obsolete | Re-run after maintenance; separate ticket failures from unrelated baseline |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Web factory/builder round trip | Stored V2 must be collapsed into root + flat Agent editable intent and recreated through deleted builder | Violates exact stored-history boundary and loses nonauthorable fields | IR-002/CRR-003; R-026/R-028–R-031 | Exact immutable stored snapshot plus explicit one-way authorable conversion | N/A |
| Current `TeamRunV1PackageCatalog` tests/imports | Normal current runtime catalogs V1 | Approved runtime is V2-only after migration | Design legacy policy; R-037; CRR-003 | `TeamRunPackageCatalog` V2 admission and V1 rejection after migration boundary | N/A |
| Flat `TeamRunConfig.memberOverrides` scenarios | Nested Teams are display-only and every Agent resolves from root | Superseded approved behavior | R-005–R-020; AC-004–AC-015 | Hierarchy resolver/store/component scenarios | N/A |
| Public `buildMemberConfigsFromLaunchPreset` caller assertions | Each auxiliary caller expands leaves itself | Service now centrally expands root policy across Team/Agent topology | DS-007; R-032–R-036 | `createTeamRunFromRootConfig` caller assertions | N/A |
| Devkit frontend/backend SDK value `4` | Current generated source requires SDK contracts V4 | Current synchronized beta cut is V6; no old consumer is reachable | CRR-002/CRR-003, CR-P-002 | Assert V6 current output; retain still-valid manifest/iframe V4 | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-HIER-001 | Three-level resolution, nearest Team, Agent precedence, nullable config, workspace, root skill, exact projection, repair | AC-004–AC-015, AC-026/AC-027 | Web hierarchy/store tests | Core policy currently has only temporary proof |
| APIE2E-HIER-002 | Nested scope UI states/reset/loading/error/locked/ARIA/root-only empty hierarchy | AC-001–AC-008, AC-031–AC-034 | Web component tests plus browser journey | User-visible critical path |
| APIE2E-HIER-003 | Exact Team/Agent request coverage, planner rejection before allocation, persist/restore | AC-016–AC-020 | Server unit/integration/E2E | Real server boundary |
| APIE2E-HIER-004 | Exact V1→V2 conversion, semantic preservation, null, idempotence, failures, Retry-to-catalog | AC-021–AC-023, AC-030 | New server migration/lifecycle tests | Persisted user history is critical |
| APIE2E-HIER-005 | Exact immutable stored view and authorable-only “Run another” | AC-019, AC-021–AC-023, CRR-003 residual risk | Web execution context/stored component tests | Prevents recurrence of CR-F-002 |
| APIE2E-HIER-006 | Mobile/application/external/programmatic root-only parity | AC-024–AC-029 | Server/application/mobile caller tests | Multiple real creation surfaces changed |
| APIE2E-HIER-007 | Imported nested-classroom simulation completes under Codex Luna and persists hierarchy | User direction; AC-018/AC-019 | Isolated packaged Electron/live evidence; durable API check where maintainable | Highest-realism requested end-system proof |
| APIE2E-HIER-008 | Current runtime rejects V1 and has no migration-owned import | R-037, legacy policy | Current catalog/schema tests and source scan | Guards forward-only boundary |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-HIER-001 | Flat web type/store/helper tests | Current root/Team/Agent shapes and coherence | AC-004–AC-015 | Remove only obsolete assertions, not the behavioral intent |
| APIE2E-HIER-003 | Planner/service/GraphQL runtime tests | Supply/validate complete `teamConfigs` | AC-016–AC-020 | No optional compatibility request |
| APIE2E-HIER-004 | V1 promotion/catalog/Retry tests and fixture README | Migration-owned V1 then V2 catalog/admission terminology | R-037/AC-030 | Preserve released V1 fixture meaning |
| APIE2E-HIER-005 | Factory/history tests | Static complete V2 snapshot and one-way conversion | CRR-003 | Include exact workspace/skill facts |
| APIE2E-HIER-006 | Application/external/mobile tests and devkit values | Service-owned root expansion; V6 SDK values only | AC-024–AC-029 | Manifest/iframe V4 remain valid |
| APIE2E-HIER-008 | Current package catalog tests | Rename to current V2 catalog and V1 rejection | R-037 | Remove deleted import/name |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/run-history/services/team-run-v1-package-catalog.test.ts` as named/current behavior | Protects an intentionally deleted normal-runtime V1 catalog | R-037; DS-004/DS-005 | Rename/replace with `team-run-package-catalog.test.ts` for V2 |
| Obsolete cases inside `teamExecutionContextFactory.spec.ts` that require deleted flat builder | Protect coordinator-derived normal-runtime behavior | R-026/R-028–R-031; CRR-003 | Replace with exact stored-view cases |
| Obsolete root-only cases inside flat web store/config specs | Protect root-global baseline below nested Teams | R-005–R-020 | Replace with hierarchy cases; retain unrelated valid component behavior |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused web hierarchy/store/context/component Vitest files | `autobyteus-web`; `--run` | APIE2E-HIER-001/002/005 | Planned | Ticket evidence log |
| 2 | Focused server planner/service/catalog/migration/Retry/caller Vitest files | `autobyteus-server-ts`; `vitest run ... --no-watch` | APIE2E-HIER-003/004/006/008 | Planned | Ticket evidence log |
| 3 | Contract, devkit, backend-SDK suites | package filters | Generated/current contract alignment and baseline classification | Planned | Ticket evidence log |
| 4 | Root deterministic server E2E and selected nested runtime suite with `RUN_CODEX_E2E=1` where applicable | worktree root/server | Live API and Luna runtime | Planned | Ticket evidence log |
| 5 | Server build-config TypeScript, web build/guards, broader affected tests | package roots | Integration/regression | Planned | Ticket evidence log |
| 6 | Browser full-stack hierarchy/history journey | documented `pnpm dev` or isolated target | APIE2E-HIER-002/003/005 | Planned | Ticket browser evidence |
| 7 | Packaged Electron isolated nested-classroom import/run using Luna | `autobyteus-web`; current package | APIE2E-HIER-007 | Planned | Ticket Electron evidence |

## Post-Repository Confidence Scorecard (Mandatory)

Repository execution has not begun. Scores below remain intentionally `Pending`; they will be replaced with evidence-based percentages after durable maintenance and repository execution. A missing score is not an implied pass.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | Pending | Approved trace and source review | Durable and live proof pending | Planned repository/browser/live execution |
| Changed-boundary execution directness | Pending | Temporary implementation probes only | No API/E2E-owned run yet | Planned focused and live checks |
| Cross-boundary integration realism and mock gap | Pending | Build evidence only | GraphQL/browser/runtime gaps | Live API/browser/Electron |
| Environment, configuration, identity, and fixture fidelity | Pending | Authoritative setup and fixture source identified | Capability/import not executed | Isolated packaged run |
| Failure, edge-case, lifecycle, and recovery evidence | Pending | Migration design/source review | Durable failure/Retry proof absent | APIE2E-HIER-004 |
| User-surface, browser, and desktop-shell confidence | Pending | Prior mocked inspection | Real end-system path absent | Browser and Electron |
| Durable regression coverage quality and relevance | Pending | Inventory identifies stale coverage | Maintenance not yet done | Implement planned coverage |

- Overall post-repository confidence: `Pending`
- Calculation method: simple average of the seven applicable categories after execution.
- Every critical acceptance criterion directly proven: `No — execution pending`
- Any applicable category below 90%: `Not yet evaluated`
- Default clean-confidence target of 95% met: `No — execution pending`
- Material residual risks: stale durable assertions, no durable V2 migration test, no API/E2E-owned live hierarchy/history proof, Codex Luna capability unverified.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser + Live API + Lifecycle + Project Desktop Validation`
- Specific confidence gap or residual risk addressed: rendered hierarchy state, real frontend/backend contract, migration Retry admission, local import, bundled backend, and actual Luna nested-team runtime.
- Why the selected mode can materially improve confidence: repository mocks cannot prove import/runtime/catalog/persistence across the actual bundled boundaries; browser remains preferred for web-equivalent authoring/history and Electron is reserved for the user-requested isolated real-desktop simulation.
- Expected confidence after the selected validation: at least 95% overall, no category below 90%, if every critical journey passes.
- Browser-specific decision and rationale: required because nested editor/history states and accessibility semantics are user-visible web-equivalent behavior.
- If `Not Required`: N/A.
- If `Blocked`: N/A at investigation time; capability will be attempted safely.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron with bundled Node backend.
- Relevant README or development instructions: root README “Packaged Electron API/E2E testing”; web README “Packaged Electron E2E Launches” and Electron packaging guide.
- Web-equivalent behavior: TeamRun configuration, import UI, launch/history surfaces; browser proof comes first.
- Shell-specific or lifecycle behavior: isolated bundled-backend startup, local filesystem import, app-owned data root, cleanup.
- Chosen validation approach and why it fits the project: build/reuse the current Linux Electron artifact through the documented package boundary, launch with the explicit E2E profile, use a non-default port and isolated data root, and drive only the owned instance.
- Effect on any already-running desktop application: `None expected`; non-29695 port and isolated root; do not signal unknown processes.
- Behavior not directly proven and confidence consequence: packaging/updater mechanics unrelated to this ticket will rely on existing launcher coverage; only hierarchy journey is targeted.

## Live Environment And Fixture Plan

- Startup order and commands: focused repository checks -> browser full stack -> current Electron build/package -> isolated E2E launch -> import source -> configure Luna hierarchy -> launch -> nested delegation -> history inspection -> cleanup.
- Environment choices: no production data root; non-default loopback port; isolated launcher root; existing authenticated Codex runtime only; `gpt-5.6-luna`.
- Health/readiness: backend health, renderer load, runtime catalog contains Luna, imported team visible.
- Seed data / fixtures: import `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-private-agents`; select `Nested Classroom Test Team`.
- Test identity/session: local owner surface in isolated desktop; no secrets copied or logged.
- Requirement-linked journeys: inherited nested scope; customize/reset; launch exact complete hierarchy; delegate to `/StudentStudyGroup`; expect `NESTED_CLASSROOM_OK`; open stored history; invoke/inspect “Run another” authorable boundary.
- Evidence: DOM/ARIA state, GraphQL/API or backend logs, persisted V2 JSON from isolated root, completed task/result, process/cleanup metadata.
- Owned cleanup: packaged Electron process tree, temporary data root, browser contexts, copied migration fixtures, temporary probes/logs not retained except ticket evidence.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-HIER-007 | Isolated packaged Electron + imported private-agents repository + authenticated Luna runtime | Real end-system nested classroom completion and stored hierarchy | Requires local external fixture/authenticated provider and is environment-specific; durable repository coverage will prove deterministic contracts |
| APIE2E-HIER-002-LIVE | Semantic browser journey against owned full stack | Real rendering/GraphQL integration | Durable component/API tests cover deterministic detail; live harness may be retained only if project convention supports it cleanly |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Dynamic addition/removal of running Team members | Approved out of scope | None for ticket | Future Dynamic AgentTeam ticket |
| Mobile hierarchical editor | Deliberately absent; mobile is root-only | Low | Verify root-only launch parity only |
| Hostile/corrupt storage and concurrent writers | Not reachable under migration convention | None for approved contract | No coverage/machinery |
| Old installed beta application compatibility | User confirmed not reachable | None | Do not add migration/fallback/version bridge |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | CRR-003 passes and approved artifacts decide test validity | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Post-repository confidence: `Pending`
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: This artifact was written before any API/E2E-owned durable coverage edit or final validation execution. The repository’s V1 fixtures remain valid only as migration inputs; current runtime coverage must be V2-only. “V4” requires field-specific classification: manifest/iframe protocol V4 remains valid, while frontend/backend SDK contract assertions at V4 are stale and must become V6.
