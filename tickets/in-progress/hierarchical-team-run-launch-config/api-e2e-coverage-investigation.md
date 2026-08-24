# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-revision-record.md`
- API/E2E Test Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-test-review-report.md` (`CRR-003`; formal successful proportional closure remains pending)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Investigation Round: 4
- Trigger: `code_reviewer` CRR-005 repeat implementation-source `Pass` for IR-003, returning resolved CR-005 / API-E2E-F-001 for a full strengthened production-upgrade rerun and then formal proportional review of TR-001/TR-002.
- Investigation Amendment: On 2026-08-24, after the first independent browser probe passed but before the round was finalized, the user explicitly requested import of the complete local package at `/Users/normy/autobyteus_org/autobyteus-private-agents`, execution of its nested `nested-classroom-test` Team, an actual packaged Electron E2E profile, browser interaction through the `open_tab` tool, and a real Codex `gpt-5.6-luna` nested delegation. This material validation extension is recorded here before that execution begins.
- Prior Investigation Reviewed: API-REV-003 `Fail` / 89%, CRR-004's focused failure-origin review, IR-003, and CRR-005's repeat source-review `Pass`. The recovery audit's older stale-snapshot artifact remains intentionally non-authoritative.
- Latest Authoritative Investigation: This file, round 4. API-REV-004 completed `Pass` / 99%; IR-003 resolved API-E2E-F-001 at the unchanged strengthened 4/4 production-upgrade boundary.

## Current Requirement And Design Basis

The approved behavior is a complete hierarchical launch policy: one required root TeamRun configuration at `/`; partial nested-Team intent keyed by canonical Team address; exact Agent overrides; resolution in root -> nearest containing Team -> exact Agent order; and complete Team defaults plus complete Agent launch snapshots at API, runtime, persistence, restore, and history boundaries. Workspace is Team-scoped, `skillAccessMode` is root-authored and inherited, embedded definition defaults do not activate, stale or kind-mismatched addresses are visibly pruned before launch, and root-only mobile/application/external/programmatic surfaces expand through the same backend contract.

Durable V1 history requires a registered, forward-only V1 -> V2 startup migration. Every historical Team default is reconstructed only from that Team's direct coordinator launch snapshot, including `llmConfig: null`; known IDs, topology, tasks, handoffs, binding, and Agent snapshots remain semantically unchanged. Normal runtime readers/writers are V2-only and no new run may infer a Team default from a coordinator.

IR-002 and CRR-002 additionally require independent proof that Team and Agent `runtimeKind` values are mandatory and rejected before workspace/run side effects, and that workspace failure/recovery is owned only by `/` or an explicit nested-Team workspace selection so a pending New path can become launchable.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002/009 — root and nested-Team authoring | Changed | R-001–R-010, R-038–R-041; AC-001–AC-008, AC-031–AC-034 | Validate real browser hierarchy, inherited/customized state, reset, canonical address, pending-workspace recovery, responsive layout, and keyboard/disclosure semantics. |
| BEH-003/004 — resolution and draft admission | Changed | R-011–R-020; AC-009–AC-015 | Preserve direct durable coverage for three-level precedence, explicit null/coherence, immutable intent, kind validation, catalog/readiness inclusion, and visible stale-address repair. |
| BEH-005 — full create/API/runtime/persistence/restore | Changed | R-021–R-026; AC-016–AC-019 | Add or update real GraphQL/server lifecycle proof for complete Team/Agent arrays, rejection before side effects, stored V2 defaults, restart, and restore. |
| BEH-006 — embedded definition defaults | Preserved with clarified rule | R-027; AC-020 | Prove only the selected root definition seeds intent and nested definitions inherit. |
| BEH-007 — V1 migration and stored history | Changed | R-028–R-031, R-037; AC-021–AC-023, AC-030 | Existing startup E2E that stops at V1 is stale; update it to assert final V2 migration, coordinator-derived root/nested defaults, null preservation, current-only admission, relaunch idempotence, and failure isolation/retry. |
| BEH-008 — root-only surfaces | Preserved through new common contract | R-032–R-036; AC-024–AC-029 | Keep root-only mobile/application/external tests, update any stale complete-create payloads, and verify equivalent effective Team/Agent values. |
| CR-001 strict runtime inputs | Changed | IR-002; CRR-002; AC-016 | Execute schema and service/API rejection with missing/blank/unsupported runtime values and observable no-side-effect evidence. |
| CR-002 workspace recovery ownership | Changed | IR-002; CRR-002; AC-003, AC-032 | Independently execute a root and explicit nested-Team pending New workspace recovery journey. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Hierarchy compilation, complete Team defaults, strict runtime normalization | Planner/service/builder/mutator/migration unit coverage | Unit mocks bypass a real schema, filesystem package, server restart, and process startup ordering | Live API + lifecycle |
| API / transport / contract | Yes | Required `teamConfigs`, required Team/Agent runtime fields, V2 stream DTO | GraphQL resolver/schema tests, generated client tests | No current deterministic API E2E directly proves a nested complete request through persistence | Live API |
| Frontend component / state | Yes | Partial root/Team/Agent intent, address-scoped readiness/recovery, recursive Team editor | Extensive Nuxt component/store/resolver tests | Mocked DOM does not prove the integrated workspace route or browser layout/interaction | Browser |
| Browser integration / user journey | Yes | Workspace configuration journey and run readiness | Implementation-owned rendered evidence only; no existing dedicated hierarchical browser probe | Independent route-level behavior, focus/disclosure, responsive geometry, and real store/API state | Browser |
| Authentication / session / permissions | No | No new identity, permission, or authentication boundary | N/A | N/A | None |
| Desktop renderer / web-equivalent UI | Yes | The Electron renderer uses the same workspace UI | Nuxt tests and implementation browser screenshots | Needs independent browser proof; shell-specific APIs are not involved in this change | Browser |
| Desktop shell / Electron-specific integration | Validation-only extension | No preload, IPC, window, updater, or packaging source changed, but the user explicitly requested an actual packaged-shell launch | Documented isolated E2E launch profile and thin launcher | A browser alone cannot prove that the current package starts its owned backend safely; the user-owned app on port 29695 must remain untouched | Actual isolated Electron E2E profile plus browser against its owned backend |
| Process / lifecycle | Yes | Startup migration ordering, atomic rewrite/reread, restart/restore | Unit migration and runtime-gate tests; older startup E2E | Current V2 final state and restored hierarchy need real isolated process evidence | Lifecycle |
| Persisted-data transition | Yes | Exact V1 package -> exact V2 before current catalog admission | Focused V2 migration unit tests | Existing production-upgrade E2E still asserts V1 final state and is stale | Lifecycle |
| Worker / queue / distributed coordination | No | No worker/queue/distributed contract changed | N/A | N/A | None |
| External integration | Yes for explicit validation extension | Application SDK contract plus real Codex runtime/model selection and nested Team delegation | SDK/devkit/application tests and provider-gated live runtime E2E | A real Codex-authenticated nested delegation is not covered by deterministic suites | Capability catalog plus real isolated Codex `gpt-5.6-luna` run |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config`
- Project type and runtime stack: pnpm 10.28.2 monorepo; Node.js 22.23.1; TypeScript/Fastify/Mercurius/TypeGraphQL/Prisma server; Nuxt 3/Vue/Pinia frontend; Vitest; Playwright Core with local Chrome; Electron wrapper.
- Conflicting, missing, or unclear project instructions: Server AGENTS uses `vitest run --no-watch`; web AGENTS requires `--run`. The root `pnpm test:e2e` is authoritative for deterministic server E2E. Full repository server unit history is known non-green; targeted and affected-suite results must be reported separately rather than hidden. No conflict affects the selected isolated execution.
- Required environment variables or secrets available: `N/A` for deterministic API/browser/lifecycle proof. Real external-provider credentials are not required and will not be inferred. The tracked `.env.test` contains only fixed test runtime values; test helpers replace port/database/runtime root safely.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/README.md` | Monorepo setup, real dev stack, deterministic E2E, desktop strategy | `pnpm dev` owns ports 8000/3000 and persistent development state; `pnpm test:e2e` uses isolated test state; browser development is preferred for web-equivalent renderer behavior. |
| `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/scripts/run-electron-e2e.mjs` | Official packaged Electron E2E profile | Use `pnpm test:e2e:electron --adapter playwright` with an owned free port and temporary data root; the launcher prints `electron-e2e-ready`, disables updater behavior in the E2E profile, and cleans only its owned process tree/root. Clear `ELECTRON_RUN_AS_NODE` if inherited. |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/README.md`, `agent-teams/nested-classroom-test/**` | User-selected real import fixture and nested delegation contract | Import the complete package source, select `Nested Classroom Test Team`, and prompt `/Teacher` to delegate to `/StudentStudyGroup`; the accepted nested result must be exactly `NESTED_CLASSROOM_OK`. Source remains read-only. |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration path is supported. |
| `autobyteus-server-ts/README.md` | Server build/run, migrations, tests | `pnpm build`; built server `dist/app.js`; registered app-data migrations run before consumers; automated migration proof uses isolated synthetic fixtures, never user data. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts`, `.env.test` | Script and runner contract | `build:full`; Vitest uses fork pool, sequential files, Prisma setup; tracked test env is credential-free and fixed. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Isolated live-server owner | Reserve loopback port; materialize only under `autobyteus-server-ts/tests/.tmp`; use isolated SQLite under `autobyteus-server-ts/db`; wait for readiness; stop owned child and remove owned runtime/database. |
| `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md` | Frontend test/browser authority | `pnpm test:nuxt <paths> --run`; browser workspace probes use Chrome/Playwright; browser path proves web-equivalent behavior, not Electron shell. |
| `autobyteus-web/package.json`, `nuxt.config.ts` | Dev proxy and scripts | Start Nuxt on an isolated port with `BACKEND_NODE_BASE_URL` pointing to the owned server; HTTP `/graphql` and `/rest` proxy to that server. |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Migration safety | Validate disposable released-shape inputs, fixed target, restart/idempotence, bounded diagnostics, and current-only admission. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built isolated server | repo/server via test helper | `pnpm -C autobyteus-server-ts build:full`, then `startBuiltTestServer(...)` in durable E2E or equivalent owned probe | Free loopback port, runtime under `tests/.tmp`, SQLite under `db`; do not touch ports 8000/8001/29695 or the user's active app | `/rest/health` and helper log marker | helper `server.stop()`; `removeOwnedTestRuntime(...)` |
| Nuxt browser surface | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:<owned-port> pnpm dev --host 127.0.0.1 --port <free-port>` | Use a free port, not occupied 3000; Chrome executable exists at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | HTTP page load plus semantic DOM readiness | terminate owned Nuxt process tree; remove only owned browser artifacts |
| Chrome / Playwright Core | `autobyteus-web` | repository `playwright-core` with explicit Chrome path if discovery fails | fresh temporary browser context; no existing profile | page load and zero unexpected page errors | close owned context/browser |
| Packaged Electron shell and owned backend | `autobyteus-web` | `env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron --adapter playwright --hold-ms <bounded>` | Build current host package; let the supported launcher reserve an isolated port/data root; preserve the user-owned 29695 process | `electron-e2e-ready` metadata and `/rest/health` on the owned port | interrupt the owned launcher and verify its process tree/root are cleaned |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Nested Agent/Team definitions | GraphQL create-definition mutations or repository current-Team fixture builders | Unique names/IDs in isolated server data only | Removed with owned runtime/database |
| Root and nested workspaces | Create directories inside owned runtime root, then use canonical absolute paths | Never use a user workspace | Removed with owned runtime root |
| Released V1 package | Repository migration fixture copied to owned temp runtime | Never mutate fixture source or user profile | Copy removed; fixture retained unchanged |
| Browser launch draft | Select the uniquely created nested Team definition through normal workspace UI | No provider secret or message send required | Browser context and isolated server state removed |
| Private nested classroom package | Import `/Users/normy/autobyteus_org/autobyteus-private-agents` through the normal package-import surface into the owned Electron data root | Package source is read-only; imported registry/state exists only under the E2E profile | Removed with the owned Electron data root |
| Codex runtime/model | Query the owned backend's actual runtime/model catalog, select Codex and exact `gpt-5.6-luna` at `/`, and verify inheritance at `/StudentStudyGroup` and all Agents | Use the caller's existing local Codex identity only; do not inspect or copy secrets | Owned run is terminated; no shared identity data is modified |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required`
- Design-spec and implementation-handoff references: `design-spec.md` DS-004/DS-005 and “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”; contract `team-execution-tree-v2-contract.md`.
- Representative existing-data setup and required behavior: copy a nested exact V1 package containing root/nested Teams, direct coordinators, tasks, handoffs, binding, heterogeneous Agent launch snapshots, and a nullable coordinator `llmConfig` into an owned runtime. Startup must write exact V2, use each Team's direct coordinator only, preserve all other facts, admit through the current catalog, expose stored defaults, and remain V2 on restart.
- Evidence planned: update and run the real built-server startup E2E plus focused migration tests; assert migration ledger/status, materialized V2 bytes/semantics, current GraphQL history/resume/restore, restart idempotence, invalid-root isolation, and public retry where already modeled.
- Migration-specific completion/recovery scenarios: exact V1 success, exact V2 skip/relaunch, pre-mutation invalid preservation/exclusion, atomic-writer final-state reread, bounded failure status, and manual Retry in existing focused coverage.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/teamRunLaunchHierarchy.spec.ts` | Canonical subject index; nearest-Team/Agent precedence; coherence; stale/kind pruning; complete projection | R-005–R-027; AC-004–AC-020; DS-002 | Still Valid | Assertions match approved partial-intent/complete-snapshot model | Execute focused and broader web suite. |
| `autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts` | Immutable intent, typed edits/reset, descendant recomputation, repair notice, readiness and workspace ownership | R-008–R-020, R-038–R-040; AC-006–AC-015, AC-031–AC-033 | Still Valid | Current hierarchy fixtures and owner-scoped workspace issues | Execute focused and broader web suite. |
| `autobyteus-web/components/workspace/config/__tests__/{TeamRunConfigForm,RunConfigPanel,WorkspaceSelector,MemberOverrideItem}.spec.ts` | Nested UI/view/events, pending New workspace recovery, locked/read-only behavior, no mount-time nested override | R-001–R-010, R-038–R-041; AC-001–AC-008, AC-031–AC-034 | Still Valid | IR-002 focused tests align with current behavior | Execute; supplement with independent browser journey. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` nested launch scenario | Sends exact rooted complete Team/Agent projection and admits immutable draft | R-016–R-026; AC-013–AC-019 | Still Valid | Current generated request assertions include hierarchy | Execute focused. |
| Web stored V2 hydration/context/view tests | Stored defaults are read directly without coordinator inference; current V2 return path | R-025–R-031; AC-018–AC-023 | Still Valid | Current V2 fixtures and explicit no-inference assertions | Execute focused. |
| Mobile/application frontend and SDK/devkit tests | Root-only authoring, application exact-Agent overrides, synchronized contract artifacts | R-032–R-036; AC-024–AC-029 | Still Valid | Current adapters use explicit root default and complete members | Execute focused package suites. |
| Server planner/service/GraphQL unit tests changed in IR-001/IR-002 | Exact Team/Agent coverage and kinds; strict runtime before side effects; V2 tree recording | R-021–R-026; AC-016–AC-019 | Still Valid | CRR-002 independently ran 2 files/16 tests; more planner paths exist | Execute focused. |
| Server V2 migration unit test and runtime-gate/current-catalog tests | Direct-coordinator transform, null/Agent preservation, idempotence, invalid exclusion, ordering/admission | R-028–R-031, R-037; AC-021–AC-023, AC-030 | Still Valid | Explicit current V2 scenarios | Execute focused. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` | Recursive service planning, persistence, restore | R-021–R-026; AC-016–AC-019 | Needs Update | It calls removed `buildMemberConfigsFromLaunchPreset`, omits `teamConfigs`, and asserts execution-tree V1 | Retarget to `createTeamRunFromRootConfig`/full hierarchy and V2 defaults; execute. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Real three-file package creation and restore | R-023–R-026; AC-018–AC-019 | Needs Update | Descriptions/assertions still require a V1 execution tree and uppercase persisted runtime labels | Update to exact V2, Team default, current runtime labels, restart restore; execute. |
| `autobyteus-server-ts/tests/unit/run-history/services/team-run-history-service.test.ts` | Current history/resume package behavior | R-028; AC-021 | Needs Update | Fixture is current V2 but two descriptions still call it strict V1 | Correct stale assertions/descriptions if execution finds semantic drift; no legacy-protection rationale. |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Real startup migration, history, new work, restart, warnings/retry | R-028–R-037; AC-021–AC-030 | Needs Update | It treats the V1 promoter as final, asserts `schemaVersion: 1`, counts only three new migrations, and submits a create request without required `teamConfigs` | Update to V2 as the final current state and run isolated built-server E2E. |
| `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | Real nested history/memory startup and restart | R-026–R-031, R-037; AC-019, AC-021–AC-023, AC-030 | Still Valid | Its existing history/memory concern remains current; the missing V2-default proof is supplied by the updated production-upgrade E2E and new focused hierarchy lifecycle E2E | Retain unchanged; execute the paired direct coverage instead of duplicating assertions. |
| `autobyteus-server-ts/tests/e2e/runtime/{mixed-team-runtime-graphql,nested-mixed-team-runtime-graphql}.e2e.test.ts` | Live mixed-provider Team creation/message/restore | R-021–R-027, R-032–R-036; AC-016–AC-029 | Needs Update | Create payloads omit required `teamConfigs`; one still uses `memberName`; provider gating may hide the stale contract | Update payloads to complete current hierarchy. Run capability preflight; execute only configured safe capabilities, otherwise record as not run. |
| Existing web `tests/e2e/*.mjs` probes | Other workspace/responsive/renderer journeys | R-041 only indirectly | Out Of Scope | No hierarchical Team launch scenario exists | Do not reinterpret unrelated probes as proof; use a targeted browser journey. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `team-run-service.integration.test.ts` V1/preset-helper scenarios | Removed public helper, omitted Team policy, V1 persisted tree | Design clean-cut removal and V2-only runtime | R-021–R-037; design removal plan; CRR-002 | Same integration file updated to current service entries and V2 | N/A |
| `agent-team-run-manager.integration.test.ts` V1 execution-tree assertions | Configured Team packages persist `schemaVersion: 1` and uppercase runtime labels | Current package is exact V2 with required Team defaults and current runtime values | V2 contract; R-023–R-031, R-037 | Same lifecycle scenarios updated to V2 | N/A |
| `team-run-v1-production-upgrade.e2e.test.ts` “V1 is final current state” | Startup stops after V1 promotion | V1 promotion is now a prerequisite to V2; normal readers are V2-only | DS-005, migration ordering, AC-022/AC-030 | Updated startup E2E asserts both prerequisite and final V2 | N/A |
| Current-path test descriptions calling exact current trees/packages “V1” | V1 label for current runtime/history behavior | CR-004 explicitly removed this terminology from current paths | IR-002/CRR-002 | Rename to current/V2 while retaining migration-owned V1 tests | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-003 | Nested GraphQL create -> runtime -> V2 package -> termination -> process restart -> resume/restore with root/nested/Agent values | R-021–R-027; AC-016–AC-020; DS-003/DS-004 | New focused server E2E under `autobyteus-server-ts/tests/e2e/agent-team-runs/` or a coherent extension of the existing production-upgrade E2E | No current deterministic real-boundary test directly proves the complete nested contract. |
| API-E2E-008 | Missing/unsupported Team or Agent runtime and bad Team subject reject before workspace/run state | R-017, R-022; AC-008, AC-017; CR-001 | Same focused server E2E, with isolated filesystem/history observations | Unit mocks are strong but real GraphQL/service failure shape and side-effect absence are material. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-004 | `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Make V2 migration/status/tree/admission the final state; assert direct-coordinator root/nested defaults and null preservation; make new create payload current | R-028–R-037; AC-021–AC-030 | Preserve the existing released-cohort and warning/retry intent. |
| API-E2E-006 | Provider-gated mixed/nested runtime E2E | Supply one exact Team record per Team and exact Agent address records | R-021–R-027, R-032–R-036 | Do not claim execution if credentials/capabilities are absent. |
| API-E2E-010 | Stale TeamRun service/manager integration scenarios | Replace removed helper and V1 assertions with current root/full entry and exact V2 | R-021–R-037 | These scenarios are direct and maintainable once current. |

## Durable Coverage To Remove

None planned. The stale scenarios prove useful lifecycle boundaries and should be updated rather than deleted.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | 16 affected server unit files | `autobyteus-server-ts`; `pnpm exec vitest run ... --no-watch` | Planner/service/GraphQL/migration/current-catalog/runtime gate | Pass — 16 files, 81 tests | `api-e2e-evidence/server-affected-unit.txt` |
| 2 | Updated TeamRun integration focus, then full affected integration directory | `autobyteus-server-ts`; `pnpm exec vitest run ... --no-watch` | Current service/manager V2 and broader Team execution integration | Pass — focused 3 files/17 tests; directory 7 files/37 tests | `api-e2e-evidence/updated-integration-coverage.txt`; `api-e2e-evidence/server-agent-team-integration.txt` |
| 3 | Focused hierarchy GraphQL/lifecycle E2E and full production-upgrade E2E | `autobyteus-server-ts`; isolated built servers/databases/runtime roots | API-E2E-003/004/008/010, process restart, V1 -> V2 | Pass — 7/7 and 4/4 | `api-e2e-evidence/hierarchical-graphql-lifecycle-e2e.txt`; `api-e2e-evidence/v2-production-upgrade-full.txt` |
| 4 | Focused hierarchy web coverage, then full Nuxt suite | `autobyteus-web`; `NUXT_TEST=true`; `vitest --run` | Hierarchy UI/state and regression surface | Pass — focused 10 files/101 tests; full 424 passed + 2 capability-skipped files, 2297 passed + 2 skipped tests | `api-e2e-evidence/web-hierarchy-focused.txt`; `api-e2e-evidence/web-full-unit.txt` |
| 5 | SDK/contracts/devkit/team-stream package tests | Four affected packages, each `pnpm test` | Root-only/application/stream public contracts | Pass — 34 total tests | `api-e2e-evidence/affected-package-contracts.txt` |
| 6 | `pnpm build:full` server; `pnpm build` web | Package directories | Compiled built-server and production browser artifacts | Pass | `api-e2e-evidence/server-build-full.txt`; `api-e2e-evidence/web-build.txt` |
| 7 | Provider-gated runtime compile/skip and real-provider capability preflight | server/root dedicated commands | Current complete inputs compile; truthful capability classification | Compile/discovery pass; 2 live message scenarios skipped because explicit live-run flags were not enabled; capability preflight 18/18 passed | `api-e2e-evidence/provider-gated-runtime-e2e.txt`; `api-e2e-evidence/live-provider-preflight.txt` |
| 8 | `git diff --check` and stale-helper/current-V2 scans | worktree | No stale removed helper or V1-as-current assertion remains in updated coverage | Pass | `api-e2e-evidence/static-coverage-audit.txt` |

## Post-Repository Confidence Scorecard (Mandatory)

These scores reflect repository/unit/integration/API/process/build evidence before the independent browser journey. Browser results and final scores are recorded in `api-e2e-execution-coverage-report.md`.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Requirement-linked units, current integrations, 7-test live hierarchy E2E, 4-scenario production upgrade, package contracts | Independent user-surface behavior was not yet exercised in this score | Execute the planned browser journey |
| Changed-boundary execution directness | 97% | Real GraphQL schema/service/filesystem/restart plus current unit/integration boundaries | Browser-originated create request not yet observed | Browser through Nuxt proxy into the owned server |
| Cross-boundary integration realism and mock gap | 94% | Built server, real SQLite/filesystem, GraphQL, restart and migration cross boundaries without mocks | Frontend/backend browser integration remains a material gap | Real Nuxt + Chrome journey |
| Environment, configuration, identity, and fixture fidelity | 96% | Project-owned helper, built server, free ports, unique GraphQL definitions, isolated HOME/runtime/database, production-shaped V1 input | Browser environment not yet instantiated | Owned Nuxt/Chrome setup |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Missing/blank/unsupported Team and Agent runtimes before side effects; migration warning/retry/collision/restart paths | Pending-workspace recovery remains unit-only | Browser recovery journey |
| User-surface, browser, and desktop-shell confidence | 88% | 101 focused and 2297 full web tests pass; renderer is web-equivalent and no shell boundary changed | Independent integrated browser layout/interaction/readiness evidence is absent | Required Chrome journey; actual Electron remains unnecessary |
| Durable regression coverage quality and relevance | 96% | Stale current assertions updated; one narrow lifecycle E2E added; existing current UI coverage retained | Provider message scenarios remain capability-gated | Proportional code review of changed durable coverage |

- Overall post-repository confidence: 95% (rounded from 94.9%).
- Calculation method: simple average of the seven applicable categories, rounded to the nearest whole percent; the weak-category gate remains independent.
- Every critical acceptance criterion directly proven: Yes at repository/API/lifecycle level; browser-specific acceptance criteria remained pending at this gate.
- Any applicable category below `90%`: Yes — user-surface/browser confidence was 88%.
- Default clean-confidence target of `95%` met: No at this gate because one applicable category was below 90% and the planned browser evidence remained material.
- Material residual risks: independent integrated browser behavior remained unproven; provider message-exchange E2E was intentionally capability-gated; the known unrelated full-server baseline was not treated as target evidence.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API`, `Lifecycle`, `Browser`, and—by explicit user request—an isolated actual packaged `Electron` profile with a real Codex nested-Team run.
- Specific confidence gap or residual risk addressed: mocked repository coverage does not prove the complete GraphQL-to-V2/restart boundary or independent integrated workspace behavior; the existing startup E2E is stale.
- Why the selected mode can materially improve confidence: a built isolated server proves schema/service/planner/filesystem/catalog/restart together, while Chrome against the normal Nuxt development route proves the web-equivalent renderer journey without touching Electron shell state.
- Expected confidence after the selected validation: at least 95% overall, no category below 90%, if every critical scenario passes. The selected browser journey subsequently passed; final scoring is authoritative in the execution report.
- Browser-specific decision and rationale: Required for nested scope UI, readiness/recovery, disclosure/accessibility, responsive identity, package import, runtime/model selection, and the real message journey. The original boundary-only decision did not require Electron; the user's later explicit requests made packaged Electron validation required. Both completed rounds used the official isolated E2E profile on different ports/data roots and did not stop or reuse the user-owned process on 29695.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Relevant README or development instructions: root README “Local full-stack development” and “Packaged Electron API/E2E testing”; web README “Web Development” and “Packaged Electron E2E Launches”.
- Web-equivalent behavior: all changed authoring, readiness, GraphQL, history, and responsive surfaces.
- Shell-specific or lifecycle behavior: none changed; backend process lifecycle is tested independently with the project server harness.
- Chosen validation approach and why it fits the project: retain the already-passed isolated browser probe, then honor the explicit extension with the project's official packaged Electron E2E launcher. Use `open_tab` on a normal Nuxt renderer bound to the packaged Electron-owned backend so DOM assertions and interaction are observable while the actual package proves shell/backend startup and isolation.
- Server/frontend setup when browser validation is used: the packaged Electron launcher owns a free backend port and temporary data root; an owned free-port Nuxt dev renderer proxies to that backend; `open_tab` owns the browser tab.
- Effect on any already-running desktop application: None. API-E2E-012 used ports 53559/53612 and API-E2E-013 used ports 54334/54427; the user-owned listener stayed on PID 33760/port 29695 and remained healthy before, during, and after both validations.
- Behavior not directly proven and confidence consequence: Native window pixels/IPC remain outside the changed boundary, but package build, shell launch, updater-disabled E2E profiles, owned backend readiness, and cleanup were directly observed. Browser interaction used the same renderer/API against each packaged backend.

## Live Environment And Fixture Plan

- Startup order and commands: build server; reserve ports; start isolated built server; seed definitions/workspaces by GraphQL; start owned Nuxt against that backend; launch Chrome context.
- Environment choices that materially affect the run: `APP_ENV=test`, isolated SQLite/runtime/HOME, loopback-only free ports, no external-provider credentials, explicit Chrome executable.
- Health / readiness checks: server helper readiness and `/rest/health`; Nuxt HTTP route; browser semantic selectors and zero unexpected page errors.
- Seed data / fixtures: one root Team with a nested `/research` Team and root/sibling/nested Agents; root and nested workspace directories under owned runtime; copied V1 fixture for migration.
- Test identities, authentication, permissions, or session state: no authentication boundary; unique definition names; fresh browser context.
- Requirement-linked journeys or scenarios: API-E2E-003 through API-E2E-005 and API-E2E-008.
- DOM, screenshot, log, API, process, or other evidence to capture: semantic DOM/state log, focused screenshots at desktop/narrow viewport, GraphQL responses, persisted V2 JSON excerpts/checksums, migration statuses, server/Nuxt logs.
- Owned processes and temporary state to clean up: isolated server, Nuxt, Chrome context, runtime/database, test workspaces, temporary browser state.

### Explicit Packaged-Electron Extension Setup

- The README-documented generic launcher build first exposed an unrelated setup mismatch: `test:e2e:electron` invokes the all-platform `build:electron`, whose Linux-native guard correctly rejects the Linux target on Darwin/arm64. No application process or data root had been created at that failure point.
- The project-provided host-native `pnpm build:electron:mac` command passed and produced the exact current-worktree arm64 package. The official launcher then reused that executable with `--skip-build --adapter playwright` and its E2E isolation profile.
- The owned renderer used `NUXT_TEST=true` only to disable a Nuxt dev app-manifest resolution failure introduced after the Electron generate step; HTTP, WebSockets, GraphQL, filesystem state, the packaged backend, and Codex were real.
- The exact Codex catalog on that backend contained and selected `gpt-5.6-luna`.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-E2E-005 | `api-e2e-evidence/hierarchical-browser-probe.mjs`: owned built server, Nuxt dev proxy, Chrome/Playwright, unique GraphQL definitions | Real browser hierarchy, exact nested customization/reset, root isolation, complete browser-originated API payload, V2 persistence, pending workspace recovery, accessible disclosure, responsive layout | Executed successfully as temporary evidence. The repository has no general full-stack browser fixture harness for this screen; stable UI regression behavior is already durable in focused/full Vitest and the real API lifecycle is durable in the new server E2E. |
| API-E2E-012 | Official packaged Electron E2E launcher, complete local package import, owned Nuxt renderer, `open_tab`, actual Codex catalog/model, and `nested-classroom-test` message/task lifecycle | Safe package/shell startup, real private-package import, full hierarchical Codex/Luna launch request, inherited Team/Agent runtime snapshots, actual nested delegation/result acceptance, termination, and cleanup without affecting the running app | This is an environment/provider/package-specific acceptance probe requested by the user. It depends on local Codex identity and a private fixture path and therefore should not become a public deterministic repository test. |
| API-E2E-013 | Official isolated packaged Electron, documented isolated secret importer, owned Nuxt renderer, `open_tab`, root Codex/Luna, explicit nested AutoByteus/DeepSeek Flash, exact V2/API/disk/token records | Real different nested-Team global config, empty Agent overrides, subtree resolution, both nested Agents' provider execution, Team message, formal Team task submission/acceptance, history, termination, cleanup | This depends on private package definitions and local provider keys. Existing provider-gated mixed-runtime durable E2E remains the public regression owner; this acceptance probe must not embed secrets or private paths into deterministic public coverage. |

## Broader Validation Execution Results

| Scenario ID | Selected Surface | Actual Result | Requirement-Linked Evidence | Outcome |
| --- | --- | --- | --- | --- |
| API-E2E-003/004/008/010 | Built GraphQL/server/process lifecycle | Nested complete create, strict pre-side-effect failures, V1 -> exact V2, restart/restore, and current service/manager integration all passed | `hierarchical-graphql-lifecycle-e2e.txt`, `v2-production-upgrade-full.txt`, `updated-integration-coverage.txt` | Pass |
| API-E2E-005 | Chrome/Nuxt independent browser probe | Root/nested authoring, reset/inheritance, complete browser request, V2 persistence, responsive geometry, disclosure semantics, and pending New workspace recovery passed with zero page/console errors | `hierarchical-browser-probe.txt` and three browser screenshots | Pass |
| API-E2E-012 | Actual packaged Electron E2E profile + `open_tab` + real Codex/Luna | Whole private package re-imported through Settings; root/nested/three Agents persisted as V2 Codex/Luna; Teacher delegated to `/StudentStudyGroup`; exact `NESTED_CLASSROOM_OK` submission was accepted; run termination settled dynamic work; ordinary app was unaffected; owned resources were removed | `electron-open-tab-nested-classroom-evidence.md`, API JSON files, package/build/session logs, and browser screenshots | Pass |
| API-E2E-013 | Actual packaged Electron E2E profile + isolated secret import + `open_tab` + Codex root / AutoByteus-DeepSeek subteam | Form stored one explicit nested Team override and no Agent overrides; exact V2 persisted root/Teacher Codex/Luna and nested Team/both Agents AutoByteus/DeepSeek; both nested Agents and task coordinator produced non-zero DeepSeek token records; ordinary Team message and formal accepted Team task returned exact markers; termination/history/cleanup passed | `electron-open-tab-deepseek-subteam-evidence.md` and linked PNG/JSON/log/audit evidence | Pass |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live provider message exchange for every AutoByteus/Codex/Claude combination | API-E2E-013 now proves a real Codex-root plus AutoByteus/DeepSeek nested combination, but exhaustive unrelated permutations remain outside the hierarchy-policy change | Low after two real runtimes/providers and the deterministic policy suite; other providers are established unchanged boundaries | Report capability-gated repository skips truthfully. |
| Dynamic Team/Agent addition after launch | Explicitly out of scope | None for this ticket | Separate Dynamic AgentTeam ticket. |
| Unchanged native Electron IPC/window-management behavior | No shell source changed; the explicit probe targets package startup and backend/renderer journey, not native IPC features | Negligible | None. |

## Ambiguities Or Reroute Triggers

None at investigation time. A current required scenario failure will be recorded and routed only after validating whether its assertion is current.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; execution completed through API-REV-004.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: cumulative API-REV-001/API-REV-003 `Yes` as listed; API-REV-004 `No` because both strengthened tests remained hash-identical.
- Current final confidence: 99%; no category is below 90% and every critical acceptance criterion has direct passing evidence.
- Broader validation decision: historical API-REV-001/API-REV-002 `Required` journeys remain passed; API-REV-004 is `Not Required` because the real built-server migration boundary directly proves IR-003 and no browser/shell surface changed.
- Reroute Required After Current Validation Execution: `No`; API-E2E-F-001 is resolved.
- Recommended Recipient: `/code_reviewer` for formal proportional review of the two API-REV-003 durable-test corrections. Do not proceed to delivery until that review passes.
- Notes: API-REV-001 remains the historical baseline, API-REV-002 remains the passed real heterogeneous browser/provider round, API-REV-003 is the historical failure that exposed CR-005, and API-REV-004 is the latest authoritative pass. Every owned listener/tab/process/test runtime stopped or was removed; both durable test hashes match CRR-005; the prior Electron roots remain removed and the user-owned application remains outside the rerun boundary.

## API-REV-002 Current-State Coverage Reinvestigation — Explicit Nested-Team Provider Override

- Trigger: The user requested a second real browser/Electron round because API-E2E-012 exercised inheritance only. The new required gap is a **different explicit global runtime/model configuration on the nested Team**, with real provider credentials, disk-state proof, ordinary Team messaging, formal Team delegation, result submission/review, history, and cleanup.
- Prior unresolved failures rechecked: None. API-REV-001 passed at 98%. Its one relevant bounded gap was that the live nested classroom used the same inherited Codex/Luna runtime at root and nested scope; repository coverage proved heterogeneous resolution, but the actual private-Team browser journey did not.
- Current source/build state: No implementation or durable-test edit is planned for this round. The current worktree package executable was built after the latest changed source timestamps and will be reused through the documented `--skip-build --adapter playwright` isolated profile.
- Existing coverage validity: API-E2E-003/005/006/012 remain valid. API-E2E-006 already supplies durable current-contract mixed-runtime coverage but is provider-gated; API-E2E-012 directly proves private-package import and nested lifecycle but only under inherited Codex/Luna. Neither is misreported as the new live heterogeneous-provider case.
- New temporary scenario: `API-E2E-013` — configure `/` as `codex_app_server` / `gpt-5.6-luna`; explicitly customize `/StudentStudyGroup` to the AutoByteus runtime and its catalog DeepSeek Flash model; leave nested Agents at `Global default`; launch the real private Team; verify root/nested/Agent resolved snapshots and exact V2 files; have Teacher both send an ordinary message to `/StudentStudyGroup` and delegate a formal task to `/StudentStudyGroup`; require exact return markers, acceptance, history preservation, and complete owned-resource cleanup.
- Credential setup decision: Use the documented root `pnpm secrets:import` command against only the isolated Electron profile database, with source `/Users/normy/.autobyteus/server-data/.env`. Run `--dry-run` first, never print secret values, import without overwrite into the fresh owned target, and retain no credential material after deleting the owned root.
- Browser execution decision: `Required`. Use AutoByteus `open_tab` and semantic DOM/script observations against an owned Nuxt renderer proxying the actual packaged backend. Screenshots support but do not replace API/filesystem/log assertions.
- Expected hierarchy assertions:
  - root Team `/` and `/Teacher`: Codex App Server / `gpt-5.6-luna`;
  - nested Team `/StudentStudyGroup`: AutoByteus runtime / the exact catalog identifier for DeepSeek Flash;
  - `/StudentStudyGroup/student_one` and `/StudentStudyGroup/student_two`: no explicit Agent override in editable intent, but complete resolved AutoByteus/DeepSeek snapshots at runtime and on disk;
  - root values stay unchanged when the nested scope changes.
- Failure classification gate: A missing configured DeepSeek credential is a genuine environment blocker only after the isolated importer and catalog checks fail. A UI configuration, request, V2 persistence, routing, runtime execution, task lifecycle, or history mismatch is a current product failure and will be routed through `/code_reviewer` with exact evidence.
- Durable coverage delta: None. This local-secret/private-fixture/provider journey is unsuitable for public deterministic repository coverage. The existing durable mixed-runtime GraphQL scenarios remain the regression owner.

### API-REV-002 Execution Outcome

- Result: `Pass`
- Final validation confidence: `99%` (authoritative scorecard in `api-e2e-execution-coverage-report.md`).
- Exact runtime intent before launch: root `codex_app_server` / `gpt-5.6-luna`; Team override `/StudentStudyGroup` = `autobyteus` / `deepseek-v4-flash`; Agent overrides = empty; launch readiness had no issue.
- Exact stored outcome: V2 root/Teacher remained Codex/Luna; nested Team and both nested Agents resolved to AutoByteus/DeepSeek Flash before and after termination.
- Actual-provider proof: configured Student One, formal-task Student One, and configured Student Two each produced non-zero token records naming runtime `autobyteus`, provider `DEEPSEEK`, and model `deepseek-v4-flash`; packaged logs instantiated `DeepSeekLLM`.
- Collaboration proof: Teacher sent an ordinary message to `/StudentStudyGroup` and received `SUBTEAM_DEEPSEEK_MESSAGE_OK`; delegated a formal task to `/StudentStudyGroup`, received exact `SUBTEAM_DEEPSEEK_TASK_OK`, and accepted it; direct second-member message returned `SUBTEAM_SECOND_MEMBER_OK`.
- Cleanup proof: root run terminated; accepted task/history/configuration remained; tab, owned listeners, imported credentials, and exact owned root were removed; user-owned app and source `.env` remained unchanged.
- Evidence: `api-e2e-evidence/electron-open-tab-deepseek-subteam-evidence.md` and all linked artifacts.

## API-REV-003 Current-State Coverage Reinvestigation — CRR-003 Test-Review Local Fix

- Trigger: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-test-review-report.md` (`CRR-003`) returned the seven API-REV-001 durable test paths to `/api_e2e_engineer` with bounded findings `TR-001` and `TR-002`. The implementation-source result remains CRR-002 `Pass`; this is durable-coverage correction, not an implementation defect.
- Prior unresolved failures rechecked:
  - `TR-001` remains current. The new hierarchy GraphQL lifecycle E2E supplies four complete Agent configurations, but its persisted-tree assertions cover only partial values for two Agents, its active/restarted resume assertions cover only Team workspaces, and its restore assertion checks only success/ID. The test therefore does not directly establish the complete Agent snapshot promise in its name/report.
  - `TR-002` remains current. The production-upgrade fixture gives both direct coordinators identical launch configurations, carries an empty task file and no application binding, and only partially asserts Agent state. Its current assertions cannot distinguish direct nested-coordinator derivation from a mistaken copied root default and do not prove all preservation dimensions reported for API-E2E-004.
- Existing coverage validity decision:
  - `hierarchical-team-run-config-graphql.e2e.test.ts`: `Needs Update`, not replacement. Keep the existing real GraphQL/process/filesystem/restart/restore responsibility; add deliberately distinct complete Agent fixtures and one reusable exact-tree assertion applied to disk, active resume projection, restarted resume projection, and post-restore projection.
  - `team-run-v1-production-upgrade.e2e.test.ts`: `Needs Update`, not replacement. Keep the existing released-cohort/startup/retry responsibility; enrich the supported predecessor cohort with distinct root/nested coordinator configurations, non-null root and nullable nested `llmConfig`, one application binding, existing non-empty handoff, one settled task, and complete Team/Agent/task/binding/handoff assertions.
- Requirement/design mapping: `TR-001` closes R-024/R-026 and AC-018/AC-019 durable lifecycle proof. `TR-002` closes R-028–R-031/R-037 and AC-021–AC-023/AC-030 direct-coordinator, exact-current-V2, and preservation proof. Both remain aligned with DS-004/DS-005 and the approved `Migration Required` transition.
- Planned durable coverage delta: update exactly two already-counted paths; add/remove no file:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`
- Execution plan: rebuild the server because the live E2E harness executes built output; run the focused hierarchy E2E and full four-scenario production-upgrade E2E; run `git diff --check` and targeted source/assertion scans; update the canonical execution report to API-REV-003 with exact evidence and retain API-E2E-013's passed realistic browser/provider evidence without repeating it because implementation source is unchanged.
- Broader validation decision: `Not Required` for this local-fix round. Both findings concern missing deterministic durable assertions/fixtures at boundaries already exercised by the existing built-server E2Es and the passed API-E2E-012/API-E2E-013 real browser/Electron journeys. Repeating private-provider/browser work cannot validate the corrected test-code assertions better than the focused built-server executions.
- Failure classification gate: a failure caused by the enriched fixture exposing current product behavior contrary to the approved V2 contract will be recorded and sent to `/code_reviewer` for focused origin review. A test authoring/fixture mismatch remains an API/E2E-owned local fix.
- Expected confidence if both corrections pass: retain `99%` overall, with durable regression coverage raised from 96% to 99%; no category below 90%. The unchanged external-provider/native-IPC residuals remain bounded.

### API-REV-003 Execution Outcome

- Result: `Fail`
- Current validation confidence: `89%`; requirement/acceptance proof is below the clean gate because critical AC-030 is directly disproven for application-binding preservation.
- `TR-001`: resolved at the durable-test level. The strengthened hierarchy GraphQL lifecycle E2E passed 7/7 and now asserts complete root/nested Team plus all four Agent launch configurations on the persisted V2 tree, active GraphQL projection, process-restarted projection, and restored projection.
- `TR-002`: fixture/assertion correction implemented, but successful closure is blocked by current product behavior. The representative predecessor now has distinct direct-coordinator configurations, non-null root and nullable nested `llmConfig`, a non-empty application binding, handoff, accepted task, and complete Agent assertions.
- Failure `API-E2E-F-001`: both the clean supported production-upgrade cohort and the mixed-warning cohort wrote final V2 `applicationBinding: null` instead of the predecessor `{applicationId, bindingId}`. The full file result was 2/4 passed.
- Preliminary implementation-source correlation: `applicationBindingFromMetadata` stops recursion at arrays, so it never traverses released `memberTree` arrays to reach Agent `applicationExecutionContext` values. This contradicts AC-030 and the approved V2 preservation contract. No implementation source was changed by API/E2E.
- Build and cleanup: `pnpm run build:full` passed; `git diff --check` passed; no matching owned runtime/database/process remained.
- Broader validation: `Not Required` and not run for API-REV-003. The direct built-server migration boundary already failed; API-E2E-012/013 real `open_tab` evidence remains passed but cannot close predecessor binding migration.
- Evidence:
  - `api-e2e-evidence/api-rev-003-server-build-full.txt`
  - `api-e2e-evidence/api-rev-003-hierarchical-graphql-lifecycle-e2e-final.txt`
  - `api-e2e-evidence/api-rev-003-v2-production-upgrade-full.txt`
  - `api-e2e-evidence/api-rev-003-migration-binding-failure.md`
  - `api-e2e-evidence/api-rev-003-static-and-cleanup-audit.txt`
- Reroute: `/code_reviewer` for focused failure-origin review. Delivery is blocked until source correction, a full 4/4 rerun, and repeat proportional test review.

## API-REV-004 Current-State Coverage Reinvestigation — IR-003 Binding Correction Rerun

- Trigger: `CRR-005` passed IR-003 at 9.3/10 with every source-review category at least 9.0 and returned resolved `CR-005` / `API-E2E-F-001` to `/api_e2e_engineer`. Delivery remains blocked pending the successful API/E2E rerun and formal proportional review.
- Prior failure rechecked: API-REV-003 directly observed `applicationBinding: null` instead of `{applicationId: "synthetic-migration-application", bindingId: "synthetic-migration-binding"}` in the clean and mixed-warning supported startup cohorts. CRR-004 attributed the failure to `applicationBindingFromMetadata` skipping released `memberTree` arrays. IR-003 now derives the value from `convertLegacyTeamRunMetadata`'s validated Team/Agent hierarchy, traverses nested Team children, collapses identical pairs, retains null when absent, and rejects distinct pairs before V1 construction; CRR-005 independently passed 4 affected files / 13 tests and `build:full`.
- Durable coverage validity before execution:
  - `hierarchical-team-run-config-graphql.e2e.test.ts` remains `Still Valid` and unchanged at SHA-256 `bc4fda79a1de7551793c8c6ca3edc952799004f00cd6556ec34f4da2475b2712`. Its API-REV-003 7/7 execution directly proved complete distinct Team/Agent configurations across disk, active API, restart, and restore. Rerun it after the build as a fresh unchanged-boundary confirmation; do not weaken its complete assertions.
  - `team-run-v1-production-upgrade.e2e.test.ts` remains `Still Valid` as the intended regression boundary and unchanged at SHA-256 `3413ed1fd7f44526c9c29cd87a492b6283700bfb6af73b2281e943096f1f968f`. Preserve its distinct direct coordinators, non-null root and nullable nested `llmConfig`, binding, accepted task, handoff, complete Agent snapshots, restart/idempotence, warning isolation, and retry assertions.
- Durable coverage delta: None in API-REV-004. The two API-REV-003 test corrections are preserved byte-for-byte; this round validates the implementation correction against them.
- Execution plan, narrowest to direct lifecycle boundary:
  1. `pnpm run build:full` in `autobyteus-server-ts` so the built-server E2E executes IR-003 rather than stale output.
  2. `pnpm exec vitest run tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts --no-watch` and require 7/7.
  3. `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` and require 4/4, including exact non-null `applicationBinding` in both supported cohorts.
  4. Verify both durable-test hashes remain unchanged, run `git diff --check`, and audit that no API/E2E-owned runtime/database/process remains.
- Broader validation decision: `Not Required` for API-REV-004. IR-003 changes only predecessor startup migration binding extraction. The full production-upgrade E2E exercises the real built server, registered startup migrations, released V1 package, SQLite/index admission, filesystem V2 output, GraphQL history, restart/idempotence, warning isolation, and retry. API-E2E-012/013's real packaged Electron and `open_tab` journeys remain passed but exercise new-run configuration, not predecessor migration; repeating them would not add material evidence for CR-005.
- Success gate: all 4/4 production-upgrade cohorts pass without weakening either durable file; exact binding, task, handoff, direct-coordinator, complete-Agent, warning/retry, and restart assertions stay intact; no owned resource leaks. On success, reconcile all canonical reports as API-REV-004 and send the cumulative package plus both durable tests to `/code_reviewer` for formal proportional test-code review. TR-001/TR-002 remain pending until that review passes.
- Failure gate: any current mismatch is a new API/E2E failure and returns through `/code_reviewer` with exact expected/observed evidence. Test-authoring changes are not planned and would require another recorded coverage decision before edits.

### API-REV-004 Execution Outcome

- Result: `Pass`.
- Final validation confidence: `99%`; all seven categories are at least 98%, no critical criterion is missing or failing, and AC-030 now passes at the representative released-package startup boundary.
- Build: `pnpm run build:full` passed against IR-003.
- TR-001 / API-E2E-003: unchanged strengthened lifecycle test passed 7/7 and again proved exact complete Team/Agent configurations on disk, through active GraphQL, after process restart, and after restore, plus six strict runtime rejection cases before side effects.
- TR-002 / API-E2E-004: unchanged strengthened production-upgrade test passed 4/4. Both previously failing supported cohorts now preserve exact non-null `applicationBinding`; their distinct direct coordinators, nullable/non-null `llmConfig`, complete Agent snapshots, accepted task, handoff, communication, GraphQL admission, relaunch/idempotence, warning isolation, retry, and overlap assertions remain intact.
- Regression-boundary integrity: durable hashes stayed `bc4fda79...` and `3413ed1f...`, exactly matching CRR-005. No durable coverage was added, edited, removed, or weakened in API-REV-004.
- Cleanup/static checks: `git diff --check` passed; no matching API/E2E-owned runtime/database artifact or built-server process remained.
- Broader validation: `Not Required` for this migration-only implementation correction. API-E2E-012/013's real packaged Electron and `open_tab` evidence remains valid and passed; repeating new-run provider journeys would not improve predecessor migration evidence.
- Failure resolution: `API-E2E-F-001` / `CR-005` is resolved. The historical API-REV-003 failure evidence remains retained rather than overwritten.
- Evidence:
  - `api-e2e-evidence/api-rev-004-migration-binding-resolution.md`
  - `api-e2e-evidence/api-rev-004-server-build-full.txt`
  - `api-e2e-evidence/api-rev-004-hierarchical-graphql-lifecycle-e2e.txt`
  - `api-e2e-evidence/api-rev-004-v2-production-upgrade-full.txt`
  - `api-e2e-evidence/api-rev-004-static-and-cleanup-audit.txt`
- Handoff decision: send the cumulative successful package and both durable test files to `/code_reviewer` for formal proportional test-code review. `TR-001`/`TR-002` remain procedurally pending until that review passes; delivery remains blocked.
