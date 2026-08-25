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
- API/E2E Revision Record (created after the first completed result): `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1, replaced before execution after SR-004/IR-003/CRR-004 changed the governing behavior basis
- Trigger: `CRR-004` Pass of `IR-003` at source commit `72ea90db12e4b10779f10ac9d298bbb8997d25f8` against `SR-004` / `ARCH-REV-003`
- Prior Investigation Reviewed: Yes. The pre-SR-004 content in this canonical file was triggering evidence only and was never executed. Its revision, multi-client, `MP-CR-001`, and `MP-CR-002` assertions are superseded and removed here.
- Latest Authoritative Investigation: This SR-004 replacement. No prior API/E2E result or confidence exists and none is inferred.

## Current Requirement And Design Basis

The approved browser journey is strictly sequential: an active standalone Agent or root Team is explicitly stopped; the user then opens Settings; Settings owns a network-fresh resume-config/editability read; only current-schema `llmConfig` controls unlock; the user edits and waits for Save to complete; the run remains stopped; and a later message restores the same persisted identity and provider binding with the saved configuration. Save never stops, starts, replaces, interrupts, or hot-updates a runtime. Runtime/model identity, workspace, definition/topology, IDs, auto-approval, skill mode, provider binding, history, messages, tasks, and all non-`llmConfig` data remain fixed.

Team editing is root-stopped and configured-scope-only. Root, configured nested-team, and configured-agent patches use each scope's fixed runtime/model schema. Parent edits propagate only through draft-start value-equal, not-directly-edited descendant chains. A divergent or directly edited branch stays unchanged. The stopped existing-Team editor exposes no Reset-to-inherited action.

The mutation contract has no writer revision, stale-writer outcome, rebase, or multi-client behavior. Direct active Agent and Team calls must return `RUN_ACTIVE` without validation or persistence. Equal canonical input returns `UNCHANGED` without a write. Invalid, unavailable, or unrepresentable current-schema input fails closed without altering stored values. Definite persistence failures retain the draft and canonical baseline; transport or physical commit indeterminacy requires a network-fresh verification read before another Save.

The only approved ordering beyond the sequential browser flow comes from independently supported system triggers: external-channel ingress and Application Engine input can resolve a bound stopped Agent through `AgentRunCommandCoordinator` / `AgentRunService.resolveCommandReadyAgentRun`, or a bound stopped Team through `ChannelBindingRunLauncher` / `TeamRunService.restoreTeamRun` or `resolveActiveTeamRun`. These paths share the existing per-Agent or root-Team lifecycle lane with Save. Save-first commits before the resolver reads; resolver-first publishes the active runtime and a later Save returns `RUN_ACTIVE`. This is not browser concurrency and must not be tested as multi-tab, multi-user, concurrent Save, hand-speed, revision, or draft-rebase behavior.

Existing Agent metadata and schema-v2 Team execution trees are directly usable without migration. AutoByteus, Codex, and Claude restore paths must consume saved configuration; Claude's pinned SDK path must apply thinking/effort to the same session/query. API/E2E evidence must cover public transport, real persistence/restart, exact supported resolver triggers, the single-browser Settings experience, and provider adapter application without reintroducing rejected premises.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 definition versus existing-run editing | Preserved | REQ-001/REQ-015; AC-015; IR-003 trace | Prove no definition or launch-authoring path is used by Save. |
| BEH-002 later restore consumes persisted `llmConfig` | Changed | REQ-004/006/007; AC-001/002/007/014/016; DS-002/004/008 | Cross GraphQL, real files, restart/current reader, same-ID restore, and runtime adapter boundaries. |
| BEH-003 active runtime immutability | Preserved and contract-strengthened | REQ-002/003/006/009; AC-003/004/008 | Direct Agent and Team active mutations must return `RUN_ACTIVE` with no write. |
| BEH-004 standalone stopped Settings | Added | REQ-001–007/009–014; AC-001–004/009–014/016; UXJ-001/002 | Prove Settings-owned network read, fixed controls, stopped edit, Save, canonical clean state, and later restore. |
| BEH-005 root-Team stopped Settings | Added | REQ-003–015; AC-005–015; UXJ-003 | Prove full hierarchy, scope validation, bounded propagation/direct-edit behavior, no Reset, narrow persistence, and later restore. |
| BEH-006 revision-free canonical API and uncertainty handling | Changed | SR-004; REQ-012–014; AC-003/004/008/010/013; DS-005 | Assert no revision/stale fields, typed outcomes, no-op, failure, and canonical verification only for uncertainty. |
| BEH-007 current catalog and three runtimes | Changed | REQ-004/010/011; AC-009/011/012/016; DS-008 | Exercise catalog-backed validation/fail-closed behavior and focused runtime adapters; live provider only if configured. |
| BEH-008 external-channel/Application Engine resolution | Preserved with narrowed justification | REQ-006/007/009; AC-004/008/014; MP-SR4-003/004; CRR-004 | Add exact Agent and Team system-trigger coverage for Save-first and resolver-first ordering. Do not simulate browser writers. |
| SR-003 writer revisions, stale outcomes, rebase, forced-baseline, concurrent-browser tests | Removed | SR-004; MP-SR4-001/002 Not Reachable; IR-003; CRR-004 | Treat any remaining assertion as stale and fail the obsolete-seam audit; add no replacement concurrency policy. |
| SR-003 generalized Team archive/delete coordination | Removed | SR-004 legacy removal; IR-003; CRR-004 | Preserve baseline archive/delete tests but do not add Save-versus-archive/delete scenarios. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Standalone lifecycle update, Team manager update, validation, mutator, commit classification | Focused unit and integration coverage | Public transport plus current package and exact external resolver composition | Live API + lifecycle integration |
| API / transport / contract | Yes | Agent/Team resume queries and narrow revision-free GraphQL mutations/results | Resolver types, generated documents, store mocks | Real HTTP GraphQL serialization, rejected legacy fields, canonical payloads | Built-server API E2E |
| Frontend component / state | Yes | Settings fresh load, restrictive cached lifecycle updates, revision-free drafts, outcome verification | Pinia, planner, and component tests | Real DOM composition, request ordering, hierarchy, focusability, notices | Browser |
| Browser integration / user journey | Yes | Single-browser Stop-complete -> Settings load -> edit -> Save -> later message | Temporary Agent inspection; no durable full Team browser path | Full Team rendering and sequential transitions through actual documents | Browser |
| Authentication / session / permissions | No | Existing local-owner access unchanged | Existing transport behavior | None introduced | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer surface used inside Electron | Components and browser-probe convention | Real renderer interaction across viewports | Browser, not shell |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, native, or shell code changed | Existing package-boundary coverage | None material | None |
| Process / lifecycle | Yes | Stop, stopped Save, later restore, restart, independent resolver ordering | Owner-level lifecycle tests | Exact trigger and server restart | Lifecycle + built server |
| Persisted-data transition | Yes | Directly usable Agent metadata and Team V2 tree; only `llmConfig` changes | Store/catalog/manager tests and Team hierarchy E2E | Semantic preservation through public Save and restart | Built-server API + file comparison |
| Worker / queue / distributed coordination | No | One-process per-identity lane; no distributed writer contract | Owner lane tests | Multi-node behavior explicitly outside contract | None |
| External integration | Yes | Claude SDK options and external-channel/Application Engine resolver entry points | Adapter and caller tests | Live Claude acceptance may be environment-limited; exact caller/owner composition absent | Focused integration; conditional provider E2E |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis`
- Project type and runtime stack: pnpm monorepo; TypeScript Node GraphQL/WebSocket server; Nuxt/Vue/Pinia/Apollo renderer wrapped by Electron; Vitest unit/integration/E2E; project-owned isolated built-server harness; Playwright-core browser probes.
- Conflicting, missing, or unclear project instructions: None material. Server tests follow the closest `AGENTS.md`; browser-equivalent UI uses the Nuxt path; isolated E2E data must not reuse the development database.
- Required environment variables or secrets available: `N/A` for deterministic local API/browser coverage; `No` for a paid live Claude turn. Sanitized preflight recognized the Claude capability but found no configured provider credential; no secret was recorded or fabricated.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/README.md` | Workspace execution | Use pnpm workspace scripts; tests own isolated resources rather than development data. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/package.json` | Root scripts | `pnpm test:e2e`; `pnpm test:e2e:real:preflight`; package build/test scripts. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-server-ts/AGENTS.md` | Server test authority | Run targeted Vitest with `pnpm exec vitest run <paths> --no-watch`; current-contract-only deterministic tests. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-server-ts/vitest.config.ts` | Test runtime | Serial fork execution and repository setup; exact files before broader suites. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/test-support/live-e2e/test-runtime-bootstrap.mjs` | Built-server harness | Isolated runtime/database/HOME/free port, GraphQL/readiness, owned cleanup. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | Current package fixture example | Public seed, Team V2 files, restart, current readers. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-web/README.md` | Renderer/Desktop execution | Prefer web renderer for web-equivalent behavior; actual Electron only for shell-specific evidence. |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Browser probe convention | Own free port/process group, fixture route, Playwright semantic assertions, cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies/build | Workspace/server | Existing locked install; `pnpm --filter autobyteus-server-ts build` as required | No dependency change planned | Exit 0 | None |
| Built backend E2E | Server harness | Focused Vitest E2E using `test-runtime-bootstrap.mjs` | Per-test runtime, SQLite DB, HOME, free port; never dev/prod data | `/rest/health` and GraphQL readiness | `server.stop()` and owned runtime removal |
| Exact resolver integration | `autobyteus-server-ts` | Focused Vitest integration | Temp memory and deterministic fake provider edge; exact production resolver classes | Barrier observes owner-lane entry | Hooks remove temp dirs/reset state |
| Browser fixture | `autobyteus-web` | Owned Nuxt probe on free loopback port | No Electron; built backend or deterministic network responses for UI-only failures | Route HTTP 200 and DOM marker | Close browser; kill owned group; remove scratch state |
| Real provider preflight | Workspace root | `pnpm test:e2e:real:preflight` | Discovery only | Sanitized capability report | No retained process |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions | Public GraphQL create operations modeled on existing E2E | Unique labels in isolated runtime/database | Removed with owned runtime |
| Agent metadata and Team V2 package | Normal public create/terminate/restore | Paths under owned runtime only | Removed; concise semantic evidence retained |
| Current model/schema | Query `providerModelCatalogSnapshots(runtimeKind: "autobyteus")`; derive distinct valid values from returned schema | No live provider turn needed for create/restore checks | No external data |
| External-channel binding trigger | Test binding through `ChannelAgentRunFacade`/coordinator and `ChannelBindingRunLauncher` | Exact production entry classes with deterministic message/runtime edges; no external network | In-memory data discarded |
| Single-browser Agent/Team state | Public seed API or deterministic responses using actual Apollo documents and components | One context; no revision or multiple clients | Context/fixture state removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; handoff `Persisted Data Transition Check` for IR-003.
- Representative existing-data setup and required behavior: create current standalone `run_metadata.json` and Team schema-v2 `team_run_execution_tree.json`, stop them, change only addressed `llmConfig`, restart, read normal resume APIs, and restore the same IDs. Provider/runtime identity, definitions, workspace, topology, bindings, history, tasks/messages, timestamps, and every non-`llmConfig` field remain semantically equal.
- Evidence planned: parsed before/after comparisons excluding only authorized paths, canonical GraphQL equivalence, restart/current reader success, and same-ID restore capture.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `standalone-agent-run-lifecycle-service.test.ts` stopped update cases | Inactive narrow commit, active rejection, Save-first restore ordering | REQ-006/009; AC-003/004; DS-001/002/006 | Still Valid | Direct revision-free governing owner | Retain; add exact trigger composition and resolver-first order. |
| `agent-team-run-manager.integration.test.ts` stopped update/restore | Active rejection, stopped patch, real V2 tree, next restore | REQ-003/006–009; AC-007/008/014; DS-003/004/007 | Still Valid | Real manager/tree; mocked validator; API/caller bypassed | Retain; supplement API and exact launcher. |
| Agent history catalog commit tests | Serialized narrow Agent write/no-op/error ownership | REQ-007/013/014; AC-009/010/014 | Still Valid | Current revision-free catalog | Retain and execute. |
| Team history catalog archive/delete tests | Baseline Team catalog behavior unrelated to stopped Save | Preserved behavior; SR-004 rollback | Still Valid | IR-003 restored baseline | Retain; no Save-overlap tests. |
| `model-config-validation-service.test.ts` | Strict keys/enums/ranges/types/null/schema | REQ-010; AC-009/011 | Still Valid | Direct current-schema validator | Retain; supplement public catalog-backed invalid case. |
| `team-run-model-config-mutator.test.ts` | Only configured scopes change; bad targets rejected | REQ-001/008; AC-005/006/012/014 | Still Valid | Pure authoritative transform | Retain. |
| Coordinator, external-channel facade/launcher, Application host tests | Exact callers resolve identities and dispatch through services | BEH-008; MP-SR4-003/004 | Needs Update for `agent-run-command-coordinator.test.ts` and `channel-binding-run-launcher.test.ts`; other caller tests remain valid | The first API/E2E broader run found these two fixtures still mocked removed service methods/old Team result fields while production callers use `resolveCommandReadyAgentRun`, `teamRunId`, and `createTeamRunFromRootConfig`. This is stale test-fixture drift, not a source failure. | Update only the two mock/result seams to the current production caller contract; retain assertions and exact caller-to-real-owner integration. |
| Claude normalizer/config/bootstrap/session/client tests | Capability fields and thinking/effort reach same-session SDK options | REQ-004; AC-016; DS-008 | Still Valid | Direct pinned-SDK boundary | Retain; conditional provider preflight. |
| Codex and AutoByteus factory/bootstrap tests | Persisted config reaches runtime construction/turn settings | REQ-004/006; AC-001/002/016 | Still Valid | Direct adapter/factory evidence | Execute focused tests and safe configured matrix. |
| `existingRunModelConfigStore.spec.ts` | Fresh-load lock, cached relock/no unlock, indeterminate verification, catalog fail-closed, revision-free `RUN_ACTIVE`, narrow Team patches | REQ-005/009–014; AC-004/008/010/011/013; UXJ-004 | Still Valid | Exact SR-004 store assertions | Retain; supplement browser. |
| `runHistoryStore.spec.ts`, `agentRunStore.spec.ts`, `agentTeamRunStore.spec.ts` relevant cases | Network resume reads, Stop lifecycle-only, later inactive sends use backend restore | REQ-005/006/009; AC-002/004/007/008 | Still Valid | IR-003 store boundaries | Retain and execute focused files. |
| `existingTeamModelConfigDraft.spec.ts` | Equality propagation and direct-edit boundaries | REQ-008; AC-005/006; MP-001 | Still Valid | Pure deterministic planner | Retain. |
| Agent/Team form and panel component tests | Fixed/editable controls, edit events, disclosure, no stopped Reset | REQ-001/005/008/011/012/015; AC-005/006/012/013/015 | Still Valid | Component evidence | Retain; add full Team browser rendering. |
| `hierarchical-team-run-config-graphql.e2e.test.ts` | Current hierarchy persists/restores through GraphQL/restart | REQ-007/015; AC-014/015 | Still Valid | Built server, real V2 package | Retain; reuse fixture style. |
| Live runtime matrix/provider E2E | General messages and provider availability | BEH-002/003/007 | Still Valid but environment-dependent | Preflight-gated | Run preflight; report unavailable providers. |
| IR-003-deleted revision/rebase/concurrent-writer tests | SR-003 expected revisions/stale outcomes/reconciliation | Removed behavior; MP-SR4-001/002 | Stale / Remove (already removed upstream) | IR-003 and CRR-004 | Do not restore or replace with concurrency policy. |
| Removed stored-Team read-only projection tests | Stored Team always read-only | Superseded by BEH-005 | Stale / Remove (already removed upstream) | Implementation legacy check | Do not restore. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Pre-SR-004 API-E2E-003/004 in prior investigation | Same-browser/two-client revisions, R1/R2, stale Save, rebase, MP-CR-001/002 | Approved flow is sequential and has no writer revision contract | SR-004; MP-SR4-001/002; ARCH-REV-003; IR-003; CRR-004 | New API-E2E-003 starts from exact system resolvers | No replacement for explicitly out-of-scope browser concurrency. |
| IR-003-deleted revision/concurrent-writer tests | Revision fields, stale outcomes, digest/rebase/forced-baseline | API/state seams removed cleanly | SR-004 legacy removal; IR-003; CRR-004 | Sequential canonical load/Save, `RUN_ACTIVE`, no-op, uncertainty, exact resolvers | No invalid compatibility coverage. |
| SR-003 Team Save-versus-archive/delete assertions | Generalized Settings/archive coordination | No supported overlap authorizes it | SR-004/IR-003 | Independent archive regression plus stopped Save coverage | No cross-operation replacement. |
| Removed old stored-Team tests | Stored Team unconditionally read-only | Specialized stopped editor supersedes old model | BEH-005; REQ-003–008 | Team planner/form/API/browser coverage | Already removed upstream. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-001 | Sequential standalone GraphQL/files/restart: active rejection/no write; terminate; fresh resume; unchanged; invalid/no write; stopped Save; fixed-field preservation; restart; same identity restores saved config; revision fields absent/rejected | REQ-001–007/009–014; AC-001–004/009/010/014/016; DS-001/002/005/006 | `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | No current test crosses HTTP GraphQL -> lifecycle -> catalog -> metadata -> restart for this mutation. |
| API-E2E-002 | Sequential Team GraphQL/files/restart: active rejection; terminate/fresh read; root/nested/agent patches; per-scope validation; no-op/invalid; fixed-tree preservation; restart/same IDs; no revisions | REQ-001/003–015; AC-005–015; DS-003/004/005/007 | Same built-server E2E file with cohesive helpers | Manager integration bypasses API/catalog and complete semantic restart comparison. |
| API-E2E-003 | Exact supported resolver ordering, not browser concurrency: Agent via `AgentRunCommandCoordinator`; Team via `ChannelBindingRunLauncher`; Save-first restores committed config; resolver-first makes Save `RUN_ACTIVE` without write | REQ-006/007/009; AC-004/008/014; BEH-008; MP-SR4-003; DS-006/007 | Update `autobyteus-server-ts/tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts` and `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Existing caller and owner assertions are separated. Reusing each owner harness composes the exact named resolver with the real lane without duplicating large fixtures. |
| API-E2E-004 | One-browser Agent/full-Team Settings: loading/locked, no cached unlock, fixed controls, notices, hierarchy/no Reset, dirty/Save/saving/canonical clean, `RUN_ACTIVE` relock, indeterminate verification; sequential only | REQ-002–005/008/010–013; AC-001–013/016; UXJ-001–004; DS-005 | `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` plus focused fixture | Prior rendered evidence was temporary and Agent-only. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-003 | `standalone-agent-run-lifecycle-service.test.ts` and `agent-team-run-manager.integration.test.ts` | Compose the real Agent lifecycle through `AgentRunCommandCoordinator` and the real Team manager through `ChannelBindingRunLauncher`, proving Save-first and resolver-first outcomes | REQ-006/007/009; AC-004/008/014; BEH-008; MP-SR4-003; DS-006/007 | This is more proportional than a new integration file because the existing deterministic owner fixtures already model current metadata/tree and runtime publication. |
| API-E2E-003 | `agent-run-command-coordinator.test.ts` and `channel-binding-run-launcher.test.ts` | Replace removed-method mock seams with the current `resolveCommandReadyAgentRun` and `restoreTeamRun`/`createTeamRunFromRootConfig` result shapes | BEH-008; MP-SR4-003/004 | Broader execution produced 8 fixture failures whose messages name missing mock methods or old `runId` fields. Production-path integration already passed; updating these unit fixtures restores direct caller regression value without changing source. |

## Durable Coverage To Remove

None remains for API/E2E to remove. IR-003 already removed obsolete repository assertions; this file replaces the obsolete investigation plan.

## Repository Coverage Execution Plan And Results

All commands below completed in this round. Expected stderr from negative Claude/Codex cases did not correspond to failing assertions.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts`; project built-server harness with isolated HOME/runtime/SQLite/free port | API-E2E-001/002: public GraphQL, raw package comparison, active/no-op/invalid no-write, restart, same-ID restore | Pass — 1 file / 2 tests | Command result summarized in `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-execution-coverage-report.md` |
| 2 | `pnpm exec vitest run tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts --no-watch` | `autobyteus-server-ts`; exact production coordinator/launcher plus real lifecycle owners and deterministic runtime edges | API-E2E-003 Save-first/resolver-first ordering | Pass — 2 files / 23 tests | Execution report |
| 3 | Focused 13-file server lifecycle, manager, catalog, validator, mutator, exact-caller, Claude, Codex, and runtime-client command ending in `--no-watch` | `autobyteus-server-ts` | Direct lifecycle/failure/schema/provider application plus caller regression | Pass — 13 files / 130 tests. An interim 8-test failure exposed two stale caller mock/result fixtures; the investigation was updated before correcting those API/E2E-owned fixtures and the complete set then passed. | Execution report; changed caller test paths in durable coverage inventory |
| 4 | Focused 11-file Vitest run covering `RuntimeModelConfigFields`, Agent/Team forms, panel/section, Team scope/planner, Agent/Team/history/existing-run stores | `autobyteus-web` | Network-fresh load, restrictive relock, canonical outcomes, Team propagation, fixed fields, notices, indeterminate verification | Pass — 11 files / 156 tests | Execution report |
| 5 | `pnpm build` | `autobyteus-server-ts` | Shared/generated/server TypeScript, managed assets, sanitized bootstrap smoke | Pass | Execution report |
| 6 | `pnpm build` | `autobyteus-web` | Production Nuxt renderer bundle | Pass; only expected Browserslist and large-chunk warnings | Execution report |
| 7 | `pnpm guard:web-boundary && pnpm guard:localization-boundary && pnpm audit:localization-literals` | `autobyteus-web` | Web/desktop boundary and localization discipline | Pass; zero unresolved localization literals | Execution report |
| 8 | `pnpm exec vitest run tests/unit/run-history/team-run-file-commit-writer.test.ts tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts` | Physical Team commit classification, broader hierarchy/restart, three-runtime catalog | Pass — 3 files / 10 tests | Execution report |
| 9 | `pnpm test:e2e:existing-run-model-config -- --output-dir ../tickets/in-progress/live-agent-definition-refresh-analysis/probes/api-e2e/browser` | `autobyteus-web`; owned Nuxt/free port, system Chromium, one browser context | API-E2E-004 Agent/full-Team/narrow viewport/`RUN_ACTIVE` relock | Pass — 4 semantic journeys | `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/probes/api-e2e/browser/existing-run-model-config-evidence.json` and screenshots |
| 10 | `pnpm test:e2e:real:preflight` | Workspace root; sanitized capability discovery | Live-provider availability | Pass — build plus 1 file / 18 tests. Claude capability was recognized, but no provider credential was configured, so no paid live turn was attempted. | Execution report |
| 11 | Targeted obsolete-seam `rg` audit and `git diff --check` | Workspace root | No revision/stale/rebase contract returned; patch hygiene | Pass. Only the intentional negative E2E assertion that schema fields do not contain `configurationRevision` matched; unrelated working-context `bindingRevision` is outside this feature. | Console summary in execution report |

## Post-Repository Confidence Scorecard

These scores capture the state after durable server/web repository checks and builds but before the owned Chromium journey and real-provider preflight. They are intentionally preserved as the broader-validation gate rather than retroactively inflated by later evidence.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | Built-server Agent/Team API, persistence/restart, owner ordering, validation, stores, forms, runtime adapters | Full rendered Settings journey not yet observed | Execute API-E2E-004 in Chromium. |
| Changed-boundary execution directness | 96% | Public HTTP GraphQL reaches real lifecycle/catalog/files; exact coordinator/launcher reach real owners | Browser document/state composition not yet direct | Browser probe. |
| Cross-boundary integration realism and mock gap | 94% | Real built server and V2 packages; exact production resolver composition; frontend boundary tests | Browser backend remains uncomposed before probe | Actual components/documents in browser, correlated with separate live API evidence. |
| Environment, configuration, identity, and fixture fidelity | 95% | Public creates, current strict V5 working context, current V2 Team tree, isolated database/HOME, free ports | Provider credential availability unknown | Sanitized real-provider preflight. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Active/no-op/invalid raw no-write, physical commit classification, uncertainty policy, both resolver orders | Rendered `RUN_ACTIVE` relock not yet observed | Browser journey D. |
| User-surface, browser, and desktop-shell confidence | 88% | 11 focused web files / 156 tests; Electron shell genuinely unaffected | No durable full Team/narrow viewport/browser network-order evidence yet | Required Chromium execution. |
| Durable regression coverage quality and relevance | 97% | SR-004-specific API/lifecycle/browser artifacts added; stale caller fixtures corrected; obsolete revision assertions absent | Proportional test-code review remains downstream | Code-review pass after API/E2E. |

- Overall post-repository confidence: `94.1%` (`659 / 7`)
- Calculation method: Simple average of seven applicable categories; critical-criterion and weak-category gates remain binding.
- Every critical acceptance criterion directly proven: `No` at this checkpoint — rendered user-surface portions of AC-001/005/006/011/012/013 still required browser evidence.
- Any applicable category below `90%`: `Yes` — user-surface/browser/desktop-shell confidence at 88%.
- Default clean-confidence target of `95%` met: `No` at this checkpoint.
- Material residual risks: rendered network-fresh loading, complete Team hierarchy/no Reset, accessible Save states, narrow viewport usability, rendered active relock, and live Claude account availability.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` + `Lifecycle` + `Browser`
- Specific confidence gap: reviewed tests do not cross real GraphQL into current packages/restart, compose named system triggers with owners, or durably render full Team Settings.
- Why the mode improves confidence: built server proves transport/files/readers; resolver integration proves only approved non-browser ordering; browser proves Nuxt/Vue/Pinia/Apollo DOM behavior.
- Expected confidence: at least 95% overall and no category below 90% if critical scenarios pass. Configured-credential-only Claude residual may remain bounded if direct pinned-SDK evidence is strong and preflight confirms the environment limitation.
- Browser-specific decision: Required for hierarchy, controls, loading/no-stale-unlock, Save, notices, no Reset, accessibility, and narrow viewport. One sequential context only.
- If Not Required: N/A.
- If Blocked: N/A at investigation time.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping Nuxt.
- Relevant instructions: `autobyteus-web/README.md`.
- Web-equivalent behavior: all changed Settings rendering, stores, Apollo, forms, schema controls, notices, Save.
- Shell-specific behavior: none changed.
- Chosen approach: owned browser renderer, per project convention.
- Setup: free ports; owned backend or deterministic interception for UI-only failures; actual components/stores/documents; system Chromium.
- Effect on running desktop app: None.
- Not directly proven: Electron shell is genuinely inapplicable and not a material residual.

## Live Environment And Fixture Plan

- Startup order: build/start isolated server; seed public API data; run API/restart cases; start owned Nuxt fixture; launch one Chromium context; run browser assertions; provider preflight last.
- Environment: isolated HOME/runtime/database/workspaces, free ports, sanitized env, UTC; no dev/prod data or running Electron reuse.
- Readiness: `/rest/health`, catalog GraphQL, fixture HTTP/DOM marker, resolver barrier events.
- Fixtures: standalone Agent and Team with root, configured nested Team, and configured Agents, using a current schema-capable AutoByteus model where no provider turn is needed.
- Identities/session: local-owner GraphQL; exact persisted run/binding IDs; one browser; no revision/parallel writer.
- Scenarios: API-E2E-001–004.
- Evidence: operations/outcomes, semantic file diffs, restart/restore captures, lane order, DOM/request/accessibility assertions, desktop/narrow screenshots, logs.
- Cleanup: backend, Nuxt group, browser, temp memory/DB/HOME/workspaces, scratch logs; retain concise ticket evidence only.

## Temporary Executable Validation Plan And Result

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| API-E2E-005 | No temporary fault injector was needed: existing `team-run-file-commit-writer.test.ts` plus `existingRunModelConfigStore.spec.ts` directly cover post-rename indeterminacy and mandatory canonical verification | Indeterminate never becomes speculative success and blocks repeat Save until verification | Avoided duplicative platform-brittle scaffolding; durable direct-owner/store coverage passed. |
| API-E2E-006 | `pnpm test:e2e:real:preflight`; live Claude turn was conditional on a configured credential | Environment capability and safe decision not to fabricate a provider turn | Preflight passed but found no Claude provider credential; direct pinned-SDK bootstrap/session/client tests cover adapter application durably. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Multi-tab/user, concurrent Save, hand-speed timing, revisions, rebase | Explicitly excluded by SR-004/MP-SR4-001/002 | None in contract | Do not test/reintroduce. |
| MP-SR4-005 Team stream/output/recovery overlap | Upstream says Unclear and drives nothing | None beyond convergence on owner | No follow-up. |
| Multi-node/distributed lane | No approved distributed writer contract | None in deployment contract | Out of scope. |
| Electron shell | No shell code changed | Negligible | Not required. |
| Paid Claude response turn | Sanitized preflight found no configured provider credential; credentials cannot be invented | Bounded external-service acceptance residual only. The repository directly proves stopped persistence/restore and the pinned Claude session/query SDK options, but not remote service acceptance in this environment. | Re-run the same preflight and configured live-provider scenario in a credentialed release environment if remote acceptance evidence is required. |

## Ambiguities Or Reroute Triggers

None requiring reroute. During the first broader repository run, eight failures in two caller suites were classified `Local Fix` because their mocks referenced removed methods/old result fields while production exact-owner integration already passed. This artifact was updated before those fixtures were corrected; the final 13-file run passed 130/130 tests.

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes — add built-server GraphQL E2E and one-browser Agent/Team probe; update the two existing owner suites with exact resolver composition; no durable removal currently required.
- Post-repository confidence: `94.1%`; browser confidence was 88%, so the clean target was not yet met.
- Broader validation decision: Required — Live API and lifecycle were exercised durably; Chromium and provider preflight then closed or bounded the remaining risks.
- Reroute Required Before Validation Execution: No.
- Recommended Recipient If Reroute Required: N/A.
- Notes: Replaced before any API/E2E-owned test edit or execution. It supersedes every pre-SR-004 revision/multi-client assertion and authorizes only the sequential journey, direct active contract, current persistence/runtime behavior, and exact supported system triggers. Final authoritative result and `96.4%` confidence are recorded in the execution report and `API-REV-001`.
