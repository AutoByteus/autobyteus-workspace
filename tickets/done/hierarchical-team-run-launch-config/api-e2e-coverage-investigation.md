# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/done/remote-node-new-workspace-team-run-visibility/requirements.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/done/remote-node-new-workspace-team-run-visibility/design-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/done/remote-node-new-workspace-team-run-visibility/ui-ux-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-revision-record.md`
- API/E2E Test Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-test-review-report.md` (`CRR-016` proportional `Not Applicable` for API-REV-008; `TR-001`–`TR-003` remain resolved)
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001`–`DR-004`; DR-004 triggered SR-012–SR-013 / IR-010–IR-012 stored Settings parity and exact-history correction
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-011`
- Current Investigation Round: 11
- Trigger: CRR-023 complete source-review `Pass` for IR-014's one-file durable-test correction. The Agent whole-schema-absence fixture now uses producer-backed `reasoning_effort=ultra` and `service_tier=fast`; production source is unchanged.
- Prior Investigation Reviewed: API-REV-010 `Pass` / 98% is the authoritative real-current-user baseline. API-REV-006's actual packaged `open_tab`, one-click launch, distinct nested provider configuration, messaging/delegation, API, and V2-disk evidence remains valid because IR-014 changes no product owner.
- Latest Authoritative Investigation: API-REV-011 is complete: `Pass` / `98%`. The changed `MemberOverrideItem.spec.ts` passed alone (1 file / 8 tests) and in the full stored/shared cohort (11 files / 112 tests); static/product-grounding checks passed. API-E2E-F-003 remains `Out Of Scope / Non-Blocking` and was not resurrected or rerun.
- Post-Result Reachability Correction: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/api-rev-009-user-reachability-correction.md`

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

## Historical API-REV-004 Investigation Decision

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

## API-REV-005 Current-State Coverage Reinvestigation — Integrated Controlled Workspace Contract

- Trigger: `DR-001` refreshed the feature against latest tracked base `6493c6d04379fecf6b2c3e9b1fc7032a1ad1cbc4`; `IR-004` produced integrated merge `bd4e2403fd6630622e7789967e2f2815cc6f37f5`; `CRR-007` then exposed active New/empty Team readiness regression `CR-006`; `IR-005` at `be6c9182b477d0c0d265cbe007c30d466c566a93` corrected that behavior; and `CRR-008` passed current artifact HEAD `5dc5105b14d5c215a70254ce317ad725d130f16e` at 9.3/10. This round certifies that integrated state, not either parent in isolation.
- Prior result boundary: API-REV-004 `Pass` / 99% and CRR-006's formal `TR-001`/`TR-002` closure remain valid historical evidence for protected parent `393c27015a4380f77d33f7f55096077f0e1f6b29`. They do not imply a result for integrated HEAD. No integrated API/E2E result exists before API-REV-005.
- Current-base contract adopted through DR-001: workspace choice is one controlled union state for standalone Agent and exact Team address. Active `New` owns its raw path even when discovery completes late; non-workspace edits do not reset it; only explicit selection, successful canonical registration, or Agent/Team draft or selected-run identity transition may rehydrate it. Active New/empty is disabled before launch; active New/non-empty may suppress only the same-scope missing-workspace issue; inactive buffers never admit launch; registration failure retains pending input and canonical stored configuration.

### Integrated Changed Surfaces And Boundaries

| Surface | Integrated Delta | Required Evidence |
| --- | --- | --- |
| Standalone Agent workspace authoring | Controlled Existing/New state from latest base now coexists with hierarchical Team work | Empty/non-empty readiness, pending-path retention across runtime/model/config edits and late discovery, inactive-buffer exclusion, registration failure retention, exact canonical launch configuration, and identity-transition reset. |
| Root Team workspace authoring | Address-keyed controlled selection plus IR-005 exact-address readiness overlay | Root active New/empty exact blocker, same-draft edit retention, non-empty registration before launch, failure retention, inactive-buffer exclusion, and canonical root launch configuration. |
| Explicit nested Team workspace authoring | Exact-address pending state and readiness must not mutate or mask root/other scopes | `/Research` active New/empty exact blocker, non-empty selection retention across nested Team and exact Agent edits, exact nested registration, unchanged root configuration, failure retention, inactive-buffer exclusion, and address-local canonical launch configuration. |
| Discovery / reactivity lifecycle | Async workspace discovery and immutable config replacement can arrive after user selection | `WorkspaceSelector.spec.ts` must retain explicit New through late discovery; `RunConfigPanel.spec.ts` must retain address-qualified pending state through immutable same-draft edits and reset only on identity change. |
| Browser / web-equivalent desktop renderer | Integrated UI behavior crosses WorkspaceSelector, form, panel, Pinia, GraphQL, and server workspace registration | Fresh real Nuxt journey through AutoByteus `open_tab`, with semantic UI assertions plus GraphQL/filesystem correlation. Browser evidence is required because the integrated delta is user-facing and repository component coverage mocks the transport boundary. |
| Server API, lifecycle, and persisted transition | Source is unchanged from the previously validated feature parent, but merge integration must not regress its contract | Fresh 7/7 hierarchical GraphQL lifecycle and 4/4 production-upgrade execution against rebuilt integrated server, preserving the CRR-006-reviewed complete assertions. |

### Existing Durable Coverage Decisions Before Edit

| Durable Path / Scenario | Decision | Current Evidence And Gap |
| --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector.spec.ts` | `Still Valid` | Directly covers controlled complete-value replacement, inactive buffers, Temp default, read-only/locked behavior, accessibility, and delayed discovery that must not overwrite explicit New. No edit required. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | `Still Valid` | Proves the standalone Agent form relays the complete controlled selection. Panel-level Agent launch/failure/edit coverage supplies ownership evidence. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | `Still Valid` | Proves root and explicit nested Team address-qualified selection relays. No stale flat Team contract remains. |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | `Needs Update` | Current integrated coverage proves root/nested pending New registration, active empty blocker, one root auto-execute edit, one root failure, and one root inactive-buffer case. The latest-base parent had explicit coverage for runtime, model, `llmConfig`/thinking, global auto-execute, member override, and Team draft identity transition; those accepted scenarios were narrowed during conflict integration. The integrated hierarchy also requires the same retention/failure/inactive proof at `/Research`, with unchanged root configuration. Update this existing file rather than adding a parallel suite. |
| `autobyteus-web/utils/__tests__/teamRunLaunchReadiness.spec.ts` and hierarchy/store suites | `Still Valid` | IR-005's pure exact-address readiness policy and hierarchy resolution are directly covered. Execute with adjacent workspace suites after the panel update. |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | `Still Valid` | CRR-006 closed `TR-001`; the test asserts complete distinct Team/Agent configuration across disk, active API, process restart, and restore plus strict rejection. Preserve unchanged and rerun 7/7 against integrated build. |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | `Still Valid` | CRR-006 closed `TR-002`; the test retains distinct coordinators, binding, task, handoff, complete Agent snapshots, warning/retry, and idempotence. Preserve unchanged and rerun 4/4 against integrated build. |
| Prior API-E2E-013 packaged Electron / DeepSeek nested-Team journey | `Still Valid` historical evidence only | It directly proved the user-requested private nested Team, explicit nested AutoByteus/DeepSeek config, ordinary message, formal delegation/acceptance, token/provider logs, V2 disk, history, and cleanup. Because its build predates DR-001, it cannot replace a fresh integrated workspace browser journey. |

### Durable Coverage Delta Authorized For API-REV-005

- Update exactly one existing durable path and no implementation source:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts`
- Restore accepted same-draft retention variants using current hierarchical edit kinds: root runtime, root model, root `llmConfig` containing reasoning/fast controls, root auto-execute, nested Team override, and exact nested Agent override.
- Apply address-qualified launch assertions so root and `/Research` each prove one workspace creation, one canonical exact-scope store update, one launch, and no mutation of the other scope.
- Apply root and `/Research` coverage to registration failure retention and inactive-buffer exclusion, and restore Team draft-identity rehydration. Retain the existing root/nested active New/whitespace exact-message cases unchanged in intent.
- No durable browser test is added. The project has no repository browser suite for this route; a private imported package and provider identity would be unsuitable deterministic public fixtures. The temporary browser journey will use the real supported surface and record exact reproducible environment/evidence.

### Planned Integrated Execution

1. Run the changed `RunConfigPanel.spec.ts` and the six-file workspace configuration cohort, followed by directly adjacent workspace/store/hierarchy suites.
2. Run the production Nuxt build to validate templates, generated integration, and route bundling.
3. Rebuild the server and rerun the unchanged hierarchy lifecycle 7/7 and production-upgrade 4/4 boundaries; verify both CRR-006-reviewed server test hashes remain unchanged.
4. Start only owned isolated server/Nuxt processes on reserved ports and owned data roots. Through AutoByteus `open_tab`, exercise standalone Agent, root Team, and explicit nested Team workspace controls on current integrated source. Correlate semantic UI state with GraphQL launch data and exact V2 disk state; include current hierarchical messaging/delegation where the imported private Team journey is used.
5. Stop only owned listeners/processes, close the owned tab, remove owned roots, run `git diff --check`, and record process/filesystem cleanup.

### API-REV-005 Pre-Execution Decision

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — one existing frontend durable test file will be updated; no file added or removed.
- Broader Validation Decision: `Required`. The integrated change materially affects user-visible controlled state and launch readiness across form, panel, store, backend registration, and web-equivalent Electron renderer behavior. Component tests alone retain a transport/mock gap.
- Current Confidence: not scored as a completed integrated result. API-REV-004's 99% is historical and is not carried forward automatically.
- Failure Routing Gate: a current approved assertion failing because product source violates the contract will be recorded as an API/E2E failure and sent to `/code_reviewer` for focused origin review. A test-authoring or environment-harness defect remains API/E2E-owned.
- Delivery Gate: closed. Any durable coverage edit requires successful execution and proportional test-code review by `/code_reviewer` before delivery may resume.

### API-REV-005 Execution Outcome — Integrated State

- Result: `Fail`.
- Final validation confidence: `89%`. Repository checks were substantial, but a critical accepted browser journey fails and the current durable component mock does not reproduce its real Pinia/Vue continuation timing.
- Durable coverage update completed before final execution: `RunConfigPanel.spec.ts` expanded from 24 to 35 cases. It now covers standalone Agent failure/empty/inactive/identity behavior; six root/nested/exact-Agent same-draft edit variants; address-qualified root and nested registration/launch; root/nested failure retention and inactive buffers; and Team identity reset. Final focused result: 1 file / 35 tests passed. Direct affected cohort: 9 files / 134 tests passed.
- Integrated builds and preserved server boundaries:
  - Nuxt production build passed: 3,730 modules / 15 prerendered routes.
  - server `build:full` passed.
  - unchanged hierarchy lifecycle test retained SHA-256 `bc4fda79...` and passed 7/7.
  - unchanged production-upgrade test retained SHA-256 `3413ed1f...` and passed 4/4.
- Browser/package/provider evidence:
  - Built the current macOS arm64 Electron package after the generic all-platform command correctly failed on Darwin's unsupported Linux target.
  - Started an isolated packaged backend and current Nuxt renderer, imported secrets only into the owned database, and used actual AutoByteus `open_tab`.
  - Standalone Agent active New/empty remained disabled; a non-empty path survived the same-draft auto-approve edit; one activation advanced to the run surface; the first message created/started a real `autobyteus` / `deepseek-v4-flash` run whose metadata stored the exact path/model/runtime/auto-approve values and returned exact `AGENT_RUN_OK`.
  - Root `/` active New/empty and nested `/StudentStudyGroup` active New/empty both disabled Run with exact `Enter a workspace path to run this team.` text. Root and nested non-empty pending paths survived subsequent root auto-approve and nested runtime/model changes respectively; root remained Codex/Luna while nested became AutoByteus/DeepSeek.
  - `API-E2E-F-002`: the first accepted `Run Team` activation registered and canonicalized both New paths but created no TeamRun and returned to an enabled config panel. A second activation reused the registrations and created the TeamRun. This fails current-base `FR-003`, `FR-005`, `AC-001`, and the approved `Launch valid New -> Create/resolve workspace, then create Team` transition.
  - After correcting the owned-harness local-directory/Codex-command prerequisite, a separate Existing-workspace run proved actual root Codex `gpt-5.6-luna`, nested AutoByteus `deepseek-v4-flash`, ordinary `/StudentStudyGroup` messaging with exact `INTEGRATED_SUBTEAM_MESSAGE_OK`, formal delegated task submission `INTEGRATED_SUBTEAM_TASK_OK`, and accepted `review_task_result`. Exact messages, accepted task record, and schema-V2 hierarchy were persisted.
- Preliminary failure correlation: `handleRun` immediately rechecks `teamLaunchReadiness.value.canLaunch` after the awaited registration path updates the store. The observed runtime ordering is consistent with that projection still being stale at the immediate check. The current component mock synchronously changes readiness and therefore does not expose the scheduling boundary. Final origin belongs to `/code_reviewer` focused failure review.
- Environment-only correction retained as evidence, not a product finding: the initial real Codex preparation attempt used a registered local path that did not yet exist as a process `cwd`, producing `ENOENT`; creating the owned directories and supplying the absolute Codex executable made the real provider/message/task lifecycle pass.
- Cleanup: both Team runs and the Agent run were terminated; owned tabs closed; owned Nuxt and Electron processes stopped; ports 58449/58524 free; both owned data roots removed; AutoByteus `list_tabs` returned zero; `git diff --check` passed. The user-owned application and source secret file were not modified.
- Durable-coverage routing: one repository-resident test file changed. Because the overall execution result is Fail, return the cumulative package and that test path to `/code_reviewer` for focused failure-origin review, not successful proportional review. Delivery remains blocked.

#### API-REV-005 Confidence Scorecard

| Category | Post-Repository | Final | Evidence / Limitation |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 95% | 82% | Repository coverage passed, but the live first-activation Team contract is directly disproven. |
| Changed-boundary execution directness | 93% | 95% | Real current renderer, packaged backend, filesystem V2, GraphQL/process/provider boundaries were exercised. |
| Cross-boundary integration realism and mock gap | 88% | 96% | Browser/package/provider work closed most mock gaps and exposed the defect the component mock missed. |
| Environment, configuration, identity, and fixture fidelity | 91% | 91% | Exact private nested Team and requested providers ran; one owned local-cwd prerequisite required correction and is documented. |
| Failure, edge-case, lifecycle, and recovery evidence | 91% | 94% | Empty, failure-retention, inactive, identity, restart/migration, provider error, success, termination, and cleanup were exercised. |
| User-surface, browser, and desktop-shell confidence | 88% | 82% | Actual `open_tab` and packaged shell were used, but the critical one-activation Team journey fails. |
| Durable regression coverage quality and relevance | 95% | 83% | 35 focused cases are coherent and pass, but synchronous readiness mocks miss the real continuation failure. |

- Overall post-repository confidence: `92%` (rounded simple average).
- Overall final confidence: `89%` (rounded simple average).
- Broader validation decision: `Required` and executed; it materially changed the outcome from apparently clean repository evidence to a real product failure.
- Critical acceptance criteria directly proven: `No` — `FR-003` / `FR-005` / `AC-001` single-activation launch continuation fails.
- Applicable category below 90%: requirement proof, user-surface confidence, durable regression quality.
- Default clean target met: `No`.


## API-REV-006 Fresh Integrated Coverage Investigation — SR-008 / IR-006–IR-008

### Current-State Basis And Prior-Failure Recheck

- Reviewed state: `426bdf81ae5efcaf7e97e041c36a94d7349e610b`; IR-008 implementation commit `d621b229caf9944dfcac02c23658a81e3a07f4db`; CRR-012 `Pass` / 9.4/10.
- Prior result rechecked: API-REV-005 directly observed API-E2E-F-002 at `5dc5105...`: one accepted root-plus-nested New-workspace activation completed both registrations but produced no TeamRun; a second click was required. CRR-009 attributed it to duplicate post-preparation readiness gating. IR-006 removed that gate; SR-008 / ARCH-REV-002 then centralized Team workspace lifecycle state in the immutable draft/store and moved all registration sequencing into `agentTeamRunStore.launchDraft`. IR-007 implemented the ownership and validation-before-allocation boundary. IR-008 corrected the remaining stale removed/kind-changed Team New/empty self-blocker and preserves a visible typed repair stop.
- Current critical contract: valid current root or nested Team active `New` with empty/whitespace input is blocked with `Enter a workspace path to run this team.`; valid non-empty root+nested New state must survive same-draft edits and be registered/canonicalized before exactly one TeamRun create in the same accepted activation; stale removed/kind-changed Team authoring state must not block its first repair activation, and that activation performs zero workspace registration and zero GraphQL create while leaving the sorted repair notice visible.
- Backend critical contract: the common planner validates all full/root-only/application topology and configuration records before allocating any configured root/nested Team or Agent identity; successful application launch uses only the root identity returned by common creation.
- Prior migration/lifecycle proof remains valid historical evidence, but current HEAD requires proportional reruns because server service/planner ownership changed after API-REV-005.

### Changed Boundary Classification

| Boundary | Current Change / Risk | Direct Repository Evidence Present | Remaining Gap Requiring Execution |
| --- | --- | --- | --- |
| Frontend draft/workspace authority | Per-draft exact-Team workspace authoring, plan/token authorization, atomic completion/failure/repair, typed repair outcome | `teamRunConfigStore.spec.ts`, `agentTeamRunStore.spec.ts`, `RunConfigPanel.spec.ts`, form/selector suites | Repository mocks do not prove one browser activation across real workspace mutations, Pinia projection, GraphQL, and disk |
| Browser/web-equivalent Electron journey | API-E2E-014 previously failed only in real integration timing | API-REV-005 real failure plus IR-006/007/008 component/store coverage | Fresh current packaged Electron backend and actual `open_tab` one-click proof is mandatory |
| Stale topology timing | Current-Team New/empty blocker must disappear only after removal/kind change; first activation must visibly repair without side effects | Real-Pinia/store/panel coverage and IR-008 rendered evidence | Fresh independent browser semantics plus direct store/transport side-effect evidence; post-dispatch race remains mainly durable store coverage |
| Backend allocation ordering | Planner owns root/nested/Agent allocation after complete validation | Planner/service/application unit and integration suites | Rerun exact negative allocation cohort and one valid application path |
| Application integration | IR-007 changed the TeamRun service fake, but 3/5 executions stopped before that fake | Checked-in fixtures currently encode application definition contract v5 and fake AutoByteus model `gpt-test` | Revalidate against current v6/current-model contract; then execute the real worker/host and imported-package paths |
| API/persistence/restore | Complete Team/Agent snapshots and exact IDs persist/restore | Strengthened hierarchy GraphQL lifecycle E2E | Rebuild/rerun 7/7 at current HEAD |
| Startup V1 -> V2 migration | Application binding/direct coordinators/tasks/handoffs/Agent snapshots | Strengthened production-upgrade E2E | Rebuild/rerun 4/4 at current HEAD |

### Existing Durable Coverage Decisions

| Path / Scenario | Decision | Current Evidence And Required Action |
| --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | `Still Valid` (API-REV-005 update awaiting proportional review) | The 35-case API-REV-005 delta remains requirement-aligned and was preserved through IR-006–IR-008. Rerun it inside the current six-file cohort; do not weaken root/nested active-empty, same-draft edit, failure, inactive-buffer, address isolation, or identity-reset assertions. |
| `autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts` | `Still Valid` | Covers current/stale New-empty distinction, exact kind/address pruning, sorted repair, buffer isolation, preparation locking, and draft ownership. Rerun. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | `Still Valid` | Covers deduplicated one-launch preparation, pre-dispatch authorization, post-dispatch stale-result containment, zero GraphQL create on repair/failure, and exact final draft admission. Rerun. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`, `WorkspaceSelector.spec.ts`, `AgentRunConfigForm.spec.ts` | `Still Valid` | Controlled value relay, delayed discovery, active/inactive New buffer, and standalone/root/nested presentation remain current. Rerun as the six-file cohort. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-definition-topology-planner.test.ts`, `team-run-service.test.ts`, `tests/integration/agent-team-execution/team-run-service.integration.test.ts`, `tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` | `Still Valid` | Current validation-before-allocation and successful returned-root behavior. Rerun the exact four-file/41-test reviewer cohort. |
| `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` | `Needs Update` | Its generated application fixture declares definition contract `5` while the current host deliberately requires `6`; this stops before the ticket's changed TeamRun service fake. Update the synthetic fixture to v6. Its synthetic AutoByteus model `gpt-test` is also no longer in the current supported-model catalog; use the repository's current deterministic supported identifier rather than bypassing validation. Preserve the real worker/host, both explicit start kinds, capability, persistence, and recovery assertions. |
| `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` | `Needs Update` | The checked-in package itself is already contract v6, but two launch inputs use obsolete synthetic AutoByteus model `gpt-test`; current production validation correctly rejects it before the revised service fake. Replace only the synthetic requested model with the repository's deterministic current supported identifier, preserving the imported package, hosted GraphQL/REST/WS, binding, early-final projection, and fake common-create assertions. |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | `Still Valid` | CRR-006-strengthened complete Team/Agent disk/API/restart/restore and strict no-side-effect rejection boundary. Rerun 7/7 without weakening. |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | `Still Valid` | CRR-006-strengthened representative migration fixture with distinct direct coordinators, binding, task, handoff, communication, complete Agent snapshots, warnings/retry/idempotence. Rerun 4/4 without weakening. |
| API-REV-005 private `nested-classroom-test` packaged Electron/Open Tab journey | `Still Valid` historical evidence only | Its provider/message/task/V2 proof predates IR-006–IR-008 and its one-click result failed. Rebuild current package and repeat API-E2E-014; preserve the requested Codex Luna root and AutoByteus DeepSeek nested scope. |

### Durable Coverage Delta Authorized For API-REV-006

Update fixture data only in these two existing integration tests; no production source and no assertion removal:

1. `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts`
   - Set the synthetic backend definition to current contract v6.
   - Replace obsolete synthetic AutoByteus `gpt-test` selections with the deterministic current supported identifier already protected by the server's supported-model suite.
2. `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
   - Replace obsolete launch-input `gpt-test` with the same current supported identifier. Metadata-only fixture values may be aligned for semantic consistency; no production validation is bypassed.

Rationale: the failed fixtures assert obsolete independent platform contracts and stop before the ticket's changed application/common-TeamRun boundary. Updating them restores the intended real integration proof. This is API/E2E-owned durable coverage and must return with the still-pending API-REV-005 `RunConfigPanel.spec.ts` path for proportional review.

### Planned Execution — Narrowest To Broader

1. Apply only the two authorized fixture updates. Run the two application-backend integration files together; require 5/5 through real worker/host and imported-package boundaries.
2. Run the current six-file frontend workspace cohort; require all 103 current cases, including API-REV-005 panel coverage and IR-008 repair coverage.
3. Run the four-file backend planner/service/application cohort; require all 41 current cases and zero allocation/persistence assertions on invalid inputs.
4. Run production builds needed by built-server and packaged execution: server `pnpm run build:full`, current Nuxt `pnpm build`, and the documented macOS Electron package path.
5. Rerun unchanged hierarchy GraphQL lifecycle 7/7 and production-upgrade 4/4 E2Es against the built current server.
6. Launch an owned isolated packaged Electron profile plus owned Nuxt proxy. Import the private `/Users/normy/autobyteus_org/autobyteus-private-agents` package and secrets only into the owned profile using the documented project mechanisms. Create owned local workspace directories before provider startup.
7. Through actual AutoByteus `open_tab`, execute API-E2E-014 on `nested-classroom-test`: root Codex `gpt-5.6-luna`, nested `/StudentStudyGroup` AutoByteus `deepseek-v4-flash`, active non-empty New paths at both exact Team addresses, and exactly one accepted Run activation. Prove two canonical registrations followed by one TeamRun/history record from that activation; prove no duplicate launch while in flight; correlate the exact V2 tree on disk.
8. On that created run, send an ordinary message to the nested Team and complete a formal delegation/submission/acceptance lifecycle, retaining provider/token/message/task evidence.
9. Independently exercise current-Team New/empty blocking and a stale removed/kind-changed Team repair activation. Require the exact blocker before topology change, then one visible sorted repair stop with zero workspace registration and zero create. Use browser semantics plus server/GraphQL/store instrumentation; do not claim a production topology-edit boundary if the temporary probe injects the already-supported live definition refresh.
10. Run static/hash/cleanup audits, terminate only owned runs/processes/tabs, remove only owned roots, and update all canonical reports.

### Pre-Execution Confidence And Broader Validation Gate

| Category | Pre-Execution Confidence | Basis / Remaining Gap |
| --- | ---: | --- |
| Requirement and acceptance proof | 88% | Durable requirements are mapped, but API-E2E-F-002 is not resolved until one-click current browser proof passes. |
| Changed-boundary directness | 90% | Source-reviewed focused suites directly cover ownership, but current package/API/disk execution remains pending. |
| Cross-boundary realism and mock gap | 82% | Prior browser exposed a mock gap; current one-click and application integration reruns are mandatory. |
| Environment/configuration/fixture fidelity | 84% | Private package/secrets exist, but current isolated profile and repaired application fixtures have not run yet. |
| Failure/edge/lifecycle/recovery | 90% | Strong current durable coverage exists; stale repair, post-dispatch containment, lifecycle, and migration need fresh execution. |
| User surface/browser/desktop shell | 78% | Current actual `open_tab`/packaged journey has not run; prior current-base journey failed. |
| Durable regression quality | 91% | Strong coverage exists, but API-REV-005 panel delta and new fixture corrections still require successful execution and proportional review. |

- Pre-execution overall confidence: `86%` (rounded simple average).
- Broader validation decision: `Required` — actual browser against an owned packaged backend is the only selected surface that can directly resolve the previously observed Vue/Pinia/workspace-registration/GraphQL timing gap.
- Desktop decision: use the documented isolated Electron E2E profile to prove package/backend lifecycle, but perform web-equivalent UI interaction through actual AutoByteus `open_tab`; no shell-specific source behavior changed.
- Critical success gates: API-E2E-014 completes in one activation with exactly one TeamRun; stale repair creates/registers nothing; allocation-invalid cohorts consume no IDs; application integration reaches 5/5; hierarchy 7/7 and migration 4/4 remain intact.
- Failure gate: any approved behavior mismatch is recorded and returned to `/code_reviewer` for focused origin review. Test/fixture/harness defects remain API/E2E-owned and are corrected only after updating this investigation.
- Delivery gate: closed until successful execution and proportional review of all API/E2E-owned durable changes.

### API-REV-006 Investigation Decision

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update two stale fixture-only integration paths; retain the pending API-REV-005 panel update.
- Broader Validation Decision: `Required`.
- Reroute Required Before Validation Execution: `No`.
- Current authoritative result: `Pass` / `98%` after the completed execution recorded below. API-REV-005 `Fail` / 89% remains the prior historical result and was rechecked directly rather than overwritten or inferred resolved.

### API-REV-006 Investigation Amendment — Application V6 Root Default Fixture

- New evidence: the first updated two-file application integration run passed the three Brief Studio cohorts but the capability fixture failed after reaching the current v6 launch handler with `Cannot read properties of undefined (reading 'workspaceRootPath')`.
- Validity decision update: `application-context-capabilities.integration.test.ts` remains `Needs Update`. Its two synthetic `mode: 'memberConfigs'` start requests also omit the required current-v6 `teamDefaultConfig` declared by `ApplicationTeamRunLaunch`. The obsolete v5 fixture previously masked this second drift.
- Authorized correction: add the same complete current root default (`workspaceRootPath`, current supported model, auto-execute, skill mode) to both initial and recovery Team starts. Keep the exact member config and every worker/host, message, event, recovery, binding, persistence, and assertion path unchanged.
- Classification: API/E2E-owned stale fixture, not a product failure. The current production contract intentionally requires the root default even when exact member configurations are supplied. No requirement/design reroute is needed.
- Rerun gate: repeat the full two-file 5-test cohort after the fixture correction; retain the first execution log as evidence of the investigation-driven classification.

### API-REV-006 Investigation Amendment — Application TeamRun Fake Return Contract

- New evidence: after adding the required v6 root default, the capability path advanced into current `ApplicationRunBindingLaunchService` and failed because its integration fake returns obsolete `{ config.rootTeam }`; the current common-create return is a TeamRun exposing `getExecutionTreeSnapshot()`. The file also retains a stale call-count assertion against removed `createTeamRun` rather than `createTeamRunFromRootConfig`.
- Validity decision update: this remains the same API/E2E-owned `Needs Update` fixture. Adapt the fake to return `getExecutionTreeSnapshot().rootTeam.members` in the current configured-node shape and update only the method-name call-count assertion. Preserve exact IDs, two launches, member binding, message targeting, recovery, and persistence assertions.
- Classification: stale test double/expectation revealed progressively after the obsolete v5 gate was removed; not a product failure and no production change is authorized.

### API-REV-006 Investigation Amendment — Current Application Agent Target Identity

- New evidence: after the TeamRun fake reached the current snapshot return boundary, execution advanced to explicit send/subscribe and failed with `The application agent target is invalid.` The generated v5 fixture addresses an `AGENT_TEAM_MEMBER` by `memberAddress`; the current v6 `ApplicationAgentTargetAddress` requires the exact live `agentRunId` returned in `team.runtime.members`.
- Authorized correction: construct the synthetic `teamAddress` with the returned member `agentRunId` and align the one expected streamed address. Retain `targetMemberAddress` in `initialInput`, which remains the current runtime-input selector contract. Do not weaken membership authorization, message, subscription ordering, event, or binding assertions.
- Classification: stale v5 target fixture exposed only after earlier gates were corrected; API/E2E-owned local coverage fix, not a product defect.

### API-REV-006 Investigation Amendment — Current Agent Creation Binding Field

- New evidence: the v6 worker/host journey now completes; only one assertion fails because it expects removed `applicationExecutionContext` on `AgentRunService.createAgentRun`, while the observed current call carries `applicationBinding` with application ID, binding ID, display name, and runtime kind.
- Authorized correction: align that one assertion to `applicationBinding` while retaining the exact application ID and agent/model assertions. This does not weaken application association proof; it asserts the current production boundary used by persistence and projection.
- Classification: final stale v5 fixture assertion, API/E2E-owned local fix. Repeat the full 5-test cohort after correction.

## API-REV-006 Completed Execution Outcome

### Repository Evidence

- Application integration: `Pass`, 2 files / 5 tests after the investigation-authorized v6/model/root-default/current-TeamRun/current-target/current-binding fixture corrections. Authoritative log: `api-e2e-evidence/api-rev-006-application-integration-authoritative.txt`.
- Frontend workspace cohort: `Pass`, 6 files / 103 tests, including current/stale New-empty, atomic repair, post-dispatch containment, root/nested/standalone state, inactive buffers, failure retention, and the API-REV-005 panel delta. Evidence: `api-rev-006-web-workspace-focused.txt`.
- Planner/service/application cohort: `Pass`, 4 files / 41 tests with invalid-topology zero-allocation/persistence proof. Evidence: `api-rev-006-server-planner-focused.txt`.
- Server full build and Nuxt production build: `Pass`; Nuxt built 3,731 modules / 15 routes. Evidence: `api-rev-006-server-build-full.txt`, `api-rev-006-web-build.txt`.
- Current hierarchy GraphQL lifecycle: `Pass`, 7/7. Current production upgrade: `Pass`, 4/4. Evidence: `api-rev-006-hierarchical-graphql-lifecycle.txt`, `api-rev-006-v2-production-upgrade.txt`.
- Current macOS arm64 Electron package: `Pass`, including guard/audit/prepare/generate/transpile/package and DMG/ZIP/app outputs. Evidence: `api-rev-006-electron-mac-package.txt`.

Post-repository confidence was `93%`: every durable/build/lifecycle boundary passed, but API-E2E-F-002 had previously existed only in real Vue/Pinia/browser timing, so actual packaged-browser validation remained mandatory.

### Realistic Browser / Packaged-System Evidence

- Actual AutoByteus `open_tab`: `Yes`, tab `2d23c2`, current Nuxt 58724 proxying owned packaged backend 58649.
- Private package: `/Users/normy/autobyteus_org/autobyteus-private-agents` auto-loaded the exact `nested-classroom-test` hierarchy. Source secrets were imported only into the owned profile through documented `pnpm secrets:import`; no secret value was retained.
- Current root/nested active New empty/whitespace disabled Run with exact `Enter a workspace path to run this team.`.
- Root `/`: `codex_app_server` / `gpt-5.6-luna` / owned root workspace. Explicit `/StudentStudyGroup`: `autobyteus` / `deepseek-v4-flash` / distinct owned nested workspace. Both paths survived a later same-draft root auto-approve edit.
- Exactly one accepted Run activation changed server state from zero to two filesystem workspaces and zero to one TeamRun. The action disappeared after acceptance; no second click was required or available. Persisted schema V2 contains exact configurations for `/`, `/Teacher`, `/StudentStudyGroup`, and both nested Agents.
- Real ordinary message to `/StudentStudyGroup` produced exact `API_REV_006_SUBTEAM_MESSAGE_OK`. A real formal delegation produced exact `API_REV_006_SUBTEAM_TASK_OK`, then a distinct acceptance review; persisted status is `accepted`.
- Independent stale repair probe: current nested Team New/whitespace was blocked. An investigation-authorized in-browser live-definition refresh removed the Team while retaining stale authoring state; one activation rendered exact `/StudentStudyGroup` repair, stayed on the form, and produced zero workspace action calls, zero Apollo mutations, and byte-identical server workspace/history inventories. This proves browser/store repair semantics, not a production topology-edit API.
- Primary evidence: `api-rev-006-open-tab-integrated-browser-evidence.md`, `api-rev-006-browser-one-click-result.json`, `api-rev-006-team-execution-tree-v2.json`, communication/task JSON, `api-rev-006-stale-repair-probe-result.json`, and screenshots.

### Final Coverage Decision And Confidence

- API-E2E-014 / API-E2E-F-002: `Resolved` by direct current-state execution.
- Current critical result: `Pass`; no current failure ID remains.
- Final scorecard: requirement proof 99%, directness 99%, integration realism 99%, environment/identity fidelity 99%, failure/lifecycle 98%, browser/desktop 98%, durable quality 96%.
- Overall final confidence: `98%` (rounded simple average); no category below 90%; all critical criteria directly proven.
- Repository-resident durable coverage changed: `Yes` — `RunConfigPanel.spec.ts` plus the two application integration files. No production source or test removal.
- Routing: successful cumulative package to `/code_reviewer` for proportional test-code review before delivery.
- Residuals: the stale refresh was injected rather than exercised through a production topology-edit endpoint; unrelated provider permutations and unchanged native IPC/window behavior remain out of scope. Transient Nuxt dev `#app-manifest` warnings occurred while the page continued to execute; the independent production Nuxt build passed.
- Cleanup: TeamRun terminated; tab closed; zero browser sessions; Nuxt/Electron stopped; ports 58649/58724 free; owned root removed; private package and source `.env` unmodified.

## API-REV-007 Fresh Fixture-Correction Investigation — CRR-013 / TR-003

### Trigger, Current State, And Failure Recheck

- Trigger: `CRR-013` proportional test-code review found one bounded API/E2E-owned contradiction in `application-context-capabilities.integration.test.ts#createBundle()`. Although API-REV-006 updated the generated backend definition and launch/runtime fixtures to the supported v6 boundary, the synthetic `ApplicationBundle` returned by the fake `ApplicationBundleService` still advertises `backendDefinitionContractVersion: "5"` and `frontendSdkContractVersion: "5"`.
- Reviewed repository state: HEAD `426bdf81ae5efcaf7e97e041c36a94d7349e610b`; no new production-source review is requested or authorized.
- Governing contract: `src/application-bundles/utils/application-backend-manifest.ts` imports `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6` and `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6`, rejects any different value, and constructs discovered `ApplicationBundle.backend.sdkCompatibility` with those v6 constants.
- Failure origin recheck: the integration test intentionally fakes `ApplicationBundleService`, so its successful worker/host execution bypasses manifest parsing. The v5 service-output metadata is therefore an internally impossible current fixture rather than evidence of a product defect.
- Prior result validity: API-REV-006 remains `Pass` / `98%` for the boundaries it executed. CRR-013 explicitly preserves its packaged one-click result, stale repair, real nested provider messaging/task lifecycle, hierarchy/restart/restore, migration, builds, and cleanup evidence. This round does not inherit a proportional `Pass`: `TR-003` remains open until the corrected fixture executes successfully and repeat review passes.

### Refreshed Durable Coverage Classification Before Edit

| Durable Path / Evidence | Decision | Current Basis / Required Action |
| --- | --- | --- |
| `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` | `Needs Update` | Align exactly the two synthetic `sdkCompatibility` values with the exported current v6 constants. Preserve the worker/host, current model/root default, TeamRun snapshot, Agent target, binding, capability, persistence, recovery, and all assertions. |
| `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` | `Still Valid` | CRR-013 proportionally passed this correction. Keep unchanged and rerun in the same affected two-file application integration cohort to detect interaction/regression. |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | `Still Valid` | CRR-013 proportionally passed the preserved API-REV-005 delta. No rerun is needed for this backend fixture-only correction. |
| API-REV-006 browser/package/provider evidence | `Still Valid` | CRR-013 explicitly preserved the actual `open_tab` one-click, stale repair, exact V2 disk, Codex Luna root, AutoByteus DeepSeek subteam, ordinary message, formal task submission/acceptance, and cleanup evidence. No browser/provider rerun is justified by two impossible mocked service-output metadata fields. |
| API-REV-006 hierarchy lifecycle and production-upgrade evidence | `Still Valid` | The correction cannot affect production source, API, persistence, restart/restore, or migration. Repeating 7/7 and 4/4 would add no material evidence. |

### Authorized Durable Delta And Planned Execution

1. Update only `application-context-capabilities.integration.test.ts`: import the current backend-definition and frontend-SDK v6 constants from `@autobyteus/application-sdk-contracts` and use them in `createBundle().backend.sdkCompatibility`.
2. Do not modify production source, add/remove a test, change a test name, or weaken an assertion.
3. From `autobyteus-server-ts`, rerun the affected two-file application integration cohort and require 2 files / 5 tests to pass.
4. Record the corrected durable SHA-256 values, confirm the Brief Studio and RunConfigPanel paths are unchanged from API-REV-006, run `git diff --check`, and verify no production-source delta was introduced by this round.
5. Refresh the canonical execution report and revision record as API-REV-007, then return the cumulative package to `/code_reviewer` for repeat proportional test-code review. Delivery remains closed.

### Pre-Execution Decision And Confidence

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update one existing synthetic fixture; add/remove none.
- Broader Validation Decision: `Not Required`. The changed boundary is two metadata fields in a fake service output. The direct affected integration cohort executes the complete fixture through the real worker/host boundary; browser, provider, lifecycle, and migration evidence cannot improve confidence in those mocked metadata values and remains valid under CRR-013.
- Pre-execution confidence: API-REV-006's completed runtime confidence remains `98%`, but API-REV-007 has no completed result yet. Durable regression quality is temporarily capped by the known `TR-003` contradiction.
- Success gate: both fields use current v6 constants, the two-file cohort passes 5/5, static/hash audit passes, and no production source or assertion is changed.
- Routing gate: successful execution returns to `/code_reviewer` for proportional review. Delivery is not authorized.

### API-REV-007 Completed Execution Outcome

- Durable correction completed exactly as authorized: `application-context-capabilities.integration.test.ts#createBundle()` now imports and uses `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6` and `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6`. No production source, test assertion, test name, or other fixture behavior changed in this round.
- Affected application integration cohort: `Pass`, 2 files / 5 tests. The corrected capability fixture executed all named capabilities and both explicit starts through the real worker/host boundary; the unchanged Brief Studio imported-package cohorts all passed. Evidence: `api-e2e-evidence/api-rev-007-application-integration-authoritative.txt`.
- Static/hash audit: `Pass`. `git diff --check` passed; no production-source path is modified in the working tree; corrected capability SHA-256 is `00ebf8044550437dda210de8c3e2289aea5f004a3e955f2f142f479e09a6a700`; unchanged Brief Studio and RunConfigPanel hashes remain `9cb8d7fa...` and `4a52952c...`. Evidence: `api-e2e-evidence/api-rev-007-static-hash-audit.txt`.
- `TR-003` execution status: `Resolved`; formal finding closure awaits repeat proportional review.
- Broader validation: `Not Required` and not run. CRR-013 expressly retained API-REV-006's packaged `open_tab`, one-click, stale-repair, exact V2, real nested provider message/task, lifecycle, migration, build, and cleanup evidence. Two mocked metadata fields create no rational browser/provider/lifecycle rerun gain.
- Final result: `Pass`; final confidence `98%`; no applicable category below 90%; no current failure ID.
- Routing: return the cumulative package and corrected durable path to `/code_reviewer` for repeat proportional test-code review. Delivery remains blocked pending that review.

## API-REV-008 Fresh Presentation Coverage Investigation — SR-011 / IR-009 / CRR-015

### Current-State Basis And Required Proof

- Reviewed state: HEAD `cf527998f58d05a34925abc7b5fa2ccf1c3b1fa5`; IR-009 source commit `84c94496f6c0acacb12619e2314027acbb5fcf6a`; CRR-015 `Pass` / 9.4 against SR-011 / ARCH-REV-003.
- Triggering user-visible delta: restore the approved `origin/personal` root Team launch form sequence and quiet density after DR-003 user verification rejected hierarchy-specific root chrome. The editable root must render Team Definition -> runtime/model/model configuration -> Workspace Directory -> Auto approve tools -> Team Members Override -> sticky Run Team, with no hierarchy wrapper/card, “Root Team defaults” heading/badge, root `/`, hierarchy divider, `Effective` summary, or `Customized fields` summary.
- Nested Teams remain additive inside the existing member hierarchy: outer member disclosure and each nested Team default collapsed; nested identity, Team marker, canonical address, indentation, `Inherited`/`Customized`, conditional accessible Reset, and chevron remain visible; expansion exposes the actual effective runtime/model/model-config/workspace/auto-approve controls without a summary.
- Non-happy/accessibility contract: exact-address scoped loading/error/workspace state; disabled/read-only edits while disclosures remain inspectable; labels remain; outer/nested buttons expose `aria-expanded` and `aria-controls`; Reset's accessible name includes Team identity; focus order follows visual order; narrow headers wrap without overlap and sticky action does not cover the last reachable control.
- Preserved functional boundary: IR-009 changes only editable presentation components, localization, and focused tests. Store/resolver/workspace preparation/launch/backend/GraphQL/V2/migration/allocation/application/mobile/external-channel owners are unchanged. API-REV-007 `Pass` / 98%, CRR-014 proportional `Pass`, and DR-003 integrated functional evidence remain valid for those unchanged boundaries but cannot sign off the new presentation.
- Delivery/user gate: even a successful API-REV-008 does not substitute for the explicitly required hands-on user verification of the rebuilt candidate before delivery finalization.

### Changed Surface And Boundary Classification

| Boundary | IR-009 Change / Risk | Existing Evidence | Fresh Evidence Needed |
| --- | --- | --- | --- |
| Root editable Team form | Specialized root field composition removes rejected shared-scope chrome and restores quiet controls/order | `TeamScopeConfigEditor.spec.ts`, `TeamRunConfigForm.spec.ts`, IR-009 screenshots, CRR-015 | Independent actual-route DOM/order/absence/layout proof against current Nuxt |
| Outer member hierarchy | Existing `Team Members Override (N)` becomes explicit default-collapsed disclosure | Team form component test | Actual disclosure state/ARIA and one-action expansion |
| Nested Team presentation | Existing group gains default-collapsed Team controls, actionable state, conditional Reset | Team scope/tree component tests | Actual nested identity/address/indentation, inherited expansion, customization, reset, and no-summary proof |
| Actual shared controls | Root/nested use real runtime/model/workspace/auto-approve controls in quiet variant | Component tests stub runtime/workspace controls in the new editor test | Actual-route control labels, values, interaction, and scoped workspace blocker/error state |
| Disabled/read-only | Same rendered hierarchy with edits disabled, Reset hidden/disabled as applicable, disclosure inspection retained | Focused component/form tests | Independent browser locked/read-only presentation check where safely injectable/available; retain durable evidence for the branch not safely reachable without starting a provider run |
| Accessibility/focus | Native disclosure buttons, `aria-expanded`/`aria-controls`, switch label, Reset accessible name | Direct component assertions and source review | Actual DOM roles/attributes plus document-order focusable control audit and activation |
| Narrow desktop | Nested header may wrap, never overlap; indentation and sticky-footer reachability retained | IR-009 implementation render screenshots only | Independent narrow browser viewport/container geometry and screenshot |
| Functional API/lifecycle/persistence | No owner changed | API-REV-007/CRR-014/DR-003 and retained API-REV-006 real system evidence | No rerun unless browser presentation execution exposes a functional mismatch |
| Electron shell | No preload/IPC/window/updater/package source changed | Prior package/isolation/build evidence | Browser-preferred Electron-equivalent renderer validation; actual shell rerun adds no presentation evidence |

### Refreshed Durable Coverage Decisions Before Execution

| Durable Path / Scenario | Decision | Current Evidence / Action |
| --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/TeamScopeConfigEditor.spec.ts` | `Still Valid` | Directly covers root absence/order, nested default collapse, actual derived values passed to shared controls, inherited/customized/reset, scoped catalog/workspace error/loading, exact-address emits, disabled/read-only, Retry, switch, and disclosure access. No edit needed. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | `Still Valid` | Covers personal root composition order, outer default collapse/ARIA, root-only empty behavior, repair notice, exact-address commands, read-only/locked propagation, and retry ownership. No edit needed. |
| `ModelConfigSection.spec.ts`, `MemberOverrideItem.spec.ts`, `WorkspaceSelector.spec.ts`, `AgentRunConfigForm.spec.ts` | `Still Valid` | Preserve actual shared-control empty/error/disabled/accessibility semantics adjacent to the changed composition. Rerun in the presentation cohort. |
| `RunConfigPanel.spec.ts`, `teamRunConfigStore.spec.ts`, `agentTeamRunStore.spec.ts`, `teamRunLaunchHierarchy.spec.ts` | `Still Valid` | Preserve the functional exact-draft/workspace/readiness/launch and inheritance spine that presentation must not reopen. Rerun as regression guards. |
| API-REV-007 application/API/migration/lifecycle and API-REV-006 packaged provider evidence | `Still Valid` | CRR-015 traced no functional owner change. No server, provider, migration, or lifecycle rerun is proportionate for markup/style/localization changes. |
| Repository browser coverage for this route | `Use Temporary Executable Probe Only` | The project has no durable route-level browser suite and private package/profile data are unsuitable public deterministic fixtures. Use the actual AutoByteus `open_tab` surface with an owned backend/profile and current Nuxt; retain DOM/JSON/screenshots. |

### Durable Coverage Delta Decision

- Add/update/remove repository-resident durable coverage: `No`. The two new/updated implementation-owned component files already cover the presentation contract directly and passed source review. Duplicating them or adding a private-package browser fixture would reduce maintainability without improving the public deterministic boundary.
- The current test sources are evidence to execute, not presumed authority; independent browser execution is required because the editor test stubs the runtime/model and workspace controls and screenshots alone do not prove semantics, ARIA, focus order, or live state transitions.

### Planned Execution — Narrowest To Broader

1. Run the exact CRR-015 ten-file presentation/workspace/hierarchy cohort and require 10 files / 145 tests.
2. Run `git diff --check`, current presentation-source/durable hashes, and a changed-owner/static scan confirming no functional source was added during API-REV-008.
3. Start an owned isolated backend using the documented Electron E2E profile on a free non-29695 port and an owned temporary data root. Preserve the already-running user application/profile on 29695. Use the inherited `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` only to discover the read-only private `nested-classroom-test` package in the owned profile; do not import secrets because no provider run is required.
4. Start current HEAD Nuxt on a separate owned free port, proxying only the owned backend. Use actual AutoByteus `open_tab` to reach the workspace route and select the private nested Team.
5. At desktop width, record semantic DOM and geometry proving exact root order, prohibited output absence, outer default collapse/ARIA, and one-action expansion.
6. Prove nested default collapse/identity/address/indentation/ARIA; expand `/StudentStudyGroup`; assert real runtime/model/workspace/auto-approve controls and no summary; customize the exact nested auto-approve control; assert `Customized` plus accessible Reset; Reset and assert `Inherited`, Reset absence, restored value, and retained expansion.
7. Exercise an exact-address scoped non-happy state using the actual nested workspace control (active New/empty or a safely injected existing store error state), assert root state isolation and the approved blocker/error presentation, then restore. Exercise locked/read-only rendering using a safe owned-page/store state when possible; otherwise retain the direct durable read-only proof and report the exact browser reachability limitation rather than starting an unnecessary provider run.
8. Audit actual DOM focus order, labels, disclosure attributes, and switch state. Resize the owned browser/window or constrained route surface to a narrow desktop width; assert nested identity/state/Reset/chevron boxes do not overlap, controls remain reachable, and sticky action does not cover the last control; capture desktop and narrow screenshots.
9. Close the owned tab; stop only owned Nuxt/Electron-E2E processes; remove the owned data root; prove ports free and user-owned 29695 process untouched; update the canonical API/E2E reports and API-REV-008 record.

### Pre-Execution Confidence And Gate

| Category | Pre-Execution | Basis / Gap |
| --- | ---: | --- |
| Requirement and acceptance proof | 92% | Complete mapped durable coverage and reviewed screenshots exist; independent actual-route proof is pending. |
| Changed-boundary directness | 90% | Component tests directly exercise markup/events, but shared real controls and route layout remain unexecuted independently. |
| Cross-boundary realism and mock gap | 86% | New editor tests stub two important shared control groups; actual Nuxt/browser state is needed. |
| Environment/configuration/fixture fidelity | 90% | Real private hierarchy and documented isolated profile are available; fresh owned execution is pending. |
| Failure/edge/lifecycle/recovery | 91% | Strong scoped component/store coverage exists; browser non-happy and disabled/read-only observations remain pending. |
| User surface/browser/desktop shell | 82% | IR-009 implementation screenshots and CRR inspection are not independent API/E2E browser proof. |
| Durable regression quality | 96% | Ten coherent files / 145 tests passed reviewer execution; no identified gap warrants durable edits. |

- Pre-execution overall confidence: `90%` (rounded simple average).
- Broader validation decision: `Required` — the delta is presentation-only and was triggered by hands-on user rejection, so actual independent browser/Electron-equivalent renderer evidence is the material confidence surface.
- Desktop strategy: browser-preferred current Nuxt against an owned backend/profile. Actual Electron-shell interaction is not required because no shell boundary changed; the official Electron E2E launcher is used only for isolated backend/profile lifecycle fidelity.
- Critical success gates: root order/absence, both disclosure defaults and ARIA, nested actual controls, inherited/customized/reset, exact-address non-happy state, disabled/read-only evidence, focus order, and narrow geometry all have direct evidence with no material contradiction.
- Delivery gate: closed. If execution passes with no durable changes, route per handoff rules after recording the complete result; explicit user hands-on verification remains required before finalization.

### API-REV-008 Investigation Amendment — Electron E2E Launcher Transpile Prerequisite

- New setup evidence: the first documented `test:e2e:electron --skip-build` attempt stopped before launch with `Compiled Electron launch-profile boundaries are missing; build or transpile this worktree first`. No backend, tab, or data was created; the owned empty root remains API/E2E-owned.
- Classification: environment preparation prerequisite, not a product or fixture failure. The current package artifact exists, but the later `origin/personal` merge removed/invalidated the untracked `autobyteus-web/dist/electron/launch-profile` compiler output required by the source launcher.
- Approved correction before retry: run the documented package script `pnpm transpile-electron` only. This compiles current Electron TypeScript boundaries without rebuilding or changing source, then repeat the same owned launcher command. Retain the failed log as setup evidence.
- No coverage decision, confidence gate, or shell-scope claim changes. The launcher remains an isolation/profile owner; presentation interaction remains current Nuxt through `open_tab`.

### API-REV-008 Completed Execution Outcome

#### Repository And Environment Evidence

- Focused presentation/workspace/hierarchy cohort: `Pass`, 10 files / 145 tests. The exact CRR-015 cohort covered root/nested composition, shared controls, exact-draft readiness, launch ownership, and hierarchy resolution. Evidence: `api-e2e-evidence/api-rev-008-web-presentation-focused.txt`.
- Static/hash audit: `Pass`. `git diff --check` passed; IR-009 is confined to the eight reviewed component/localization/test paths; prohibited root text is absent from production components; no API-E2E durable or product source changed. Evidence: `api-e2e-evidence/api-rev-008-static-hash-audit.txt`.
- Electron E2E profile setup: the first `--skip-build` launch stopped before creating a backend because the compiled launch-profile boundary was missing. `pnpm transpile-electron` passed, then the same supported launcher emitted `electron-e2e-ready` for owned backend 58849 and `/private/tmp/autobyteus-api-rev-008-owned`. Evidence: `api-rev-008-electron-backend-session.txt`, `api-rev-008-electron-transpile.txt`, and `api-rev-008-electron-backend-session-final.txt`.
- Current Nuxt ran on owned port 58924 and proxied only to 58849. Repeated development-only `#app-manifest` pre-transform warnings were non-blocking: the route loaded, the Nitro server built, and the complete browser journey executed. Evidence: `api-rev-008-nuxt-session.txt`.

#### Actual `open_tab` Presentation Evidence

- Actual AutoByteus `open_tab`: `Yes`, tab `3efdcb`, current route `http://127.0.0.1:58924/workspace`, private `nested-classroom-test` hierarchy from the read-only inherited package root.
- Root order/absence: `Pass`. Visible label Y positions were strictly increasing for Team Definition -> Runtime -> Default LLM Model (Global) -> Workspace Directory -> Auto approve tools -> Team Members Override (3). The rejected root wrapper identity, root `/`, divider/heading, `Effective`, and `Customized fields` output were absent.
- Disclosure and nested actual controls: `Pass`. Outer and `/StudentStudyGroup` disclosures were false by default with resolving `aria-controls`; nested identity, TEAM marker, canonical address, indentation, and `Inherited` were visible. One activation exposed the real runtime/model/workspace/auto-approve controls and nested Agent controls without summaries.
- Customize/reset: `Pass`. The exact nested switch created only `/StudentStudyGroup: {autoExecuteTools:false}`, changed the badge to `Customized`, and exposed Reset with accessible name `Reset settings for StudentStudyGroup (/StudentStudyGroup)`. Reset returned `Inherited`, restored the effective value, removed Reset, retained expansion, and left `teamOverrides` empty.
- Exact-address non-happy state: `Pass`. Nested New/whitespace left root Existing, disabled Run Team, and produced `WORKSPACE_REQUIRED` at `/StudentStudyGroup` with exact visible text `Enter a workspace path to run this team.` A controlled public-store catalog-error action additionally rendered the exact `/StudentStudyGroup` address with enabled Retry. Both states were restored.
- Disabled/read-only: `Pass`. A controlled owned-page in-flight-state probe rendered the real read-only notice, disabled root/nested edits and Reset, and kept the nested disclosure enabled and inspectable; no provider or GraphQL launch occurred. The injected state was removed.
- ARIA/focus/narrow: `Pass`. Disclosure controls and labelled heading targets resolved; expanded DOM/tab order followed visual hierarchy; collapsed nested and outer panels exposed no hidden descendant focusables. At the actual `1040 x 738` CSS-pixel narrow viewport, the 667px configuration panel and 633px nested section had no horizontal overflow, disclosure/Reset overlap area was zero, and the last control retained 72.09px clearance above sticky Run Team.
- Machine-readable and narrative evidence: `api-rev-008-browser-presentation-result.json` and `api-rev-008-open-tab-presentation-evidence.md`, plus seven named screenshots.

#### Cleanup, Result, And Routing Gate

- Cleanup: tab closed; AutoByteus `list_tabs` returned zero sessions; owned ports 58849/58924 were free; owned root removed; user-owned AutoByteus PID 60805 on 29695 remained listening and healthy. Evidence: `api-rev-008-cleanup-audit.txt`.
- Repository-resident durable coverage changed in API-REV-008: `No`; proportional test-code review is therefore `Not Applicable` unless the reviewer identifies an artifact/report issue.
- Functional API/lifecycle/provider rerun: `Not Required`. CRR-015 traced no functional-owner change, and the browser execution exposed no contradiction that would invalidate API-REV-007/CRR-014 or the retained API-REV-006 real-system evidence.
- Final result: `Pass`; final confidence: `98%`; no applicable category is below 95%; no current API/E2E failure ID.
- Delivery remains closed from this handoff. Return the complete package to `/code_reviewer` as required by CRR-015/team routing. Explicit hands-on user verification of the rebuilt candidate remains required before delivery finalization.

## API-REV-009 Fresh Persisted-Multiline Settings Investigation — SR-013 / IR-012 / CRR-019

### Current-State Basis And Required Proof

- Reviewed state: HEAD `45cb5e2be6d2bcc325eb49b386f98158663072bb`; IR-012 source commit `003413b05` and artifact follow-up `45cb5e2be`; CRR-019 `Pass` / 9.6 against SR-013 / ARCH-REV-005.
- Triggering boundary: the current shared stored TeamRun Settings UI may use the normal disabled text control only when that control preserves the persisted value exactly. Schema-valid ordinary strings remain `current_control`; strings containing LF or CR, which `input[type=text]` changes, must become exactly one `historical_residual` with exact DOM text and visible whitespace.
- Complete stored-mode contract retained: existing TeamRun Settings consumes the immutable V2-derived `TeamRunConfigurationView`, uses the same quiet root/member/nested-Team/Agent form hierarchy, keeps disclosures operable and controls read-only, emits no authoring/launch/workspace/reset mutation, and renders removed keys, stale enum values, whole-schema drift, and current-schema unrepresentable values exactly once without normalization or duplication.
- Production reachability: GraphQL `createAgentTeamRun` admits `llmConfig` as JSON; the TeamRun service and V2 persistence retain those values. Therefore an isolated owned current TeamRun can safely carry ordinary, LF, and CR strings at root Team, nested Team, and exact Agent scopes without invoking a provider.
- Catalog precondition: the current built-in live model catalog exposes boolean/integer/enum fields but no free-text field suitable for proving the text-control distinction. The browser probe will use the owned page's public Pinia model-catalog state to add temporary current `type: string` schema properties for the selected model after loading the real persisted run. This is a controlled supported-catalog-payload probe, not a stored snapshot mutation, production source change, alternate renderer, or backend-contract claim. Exact stored bytes and V2 file hash will be checked before and after interaction.
- Prior evidence validity: API-REV-008/CRR-016 remains valid for IR-009 editable presentation. API-REV-006/007/CRR-014 remains valid for unchanged launch/API/V2/migration/provider boundaries. None includes a real persisted current-schema multiline Settings value, so direct current-state repository and browser execution is required.

### Changed Surface And Boundary Classification

| Boundary | IR-012 Change / Risk | Existing Evidence | Fresh Evidence Needed |
| --- | --- | --- | --- |
| Singular stored-value classifier | CR/LF string must not enter the ordinary text control | Direct utility tests for ordinary/LF/CR | Rerun the current tests and verify the result through a real persisted snapshot |
| Exact historical residual | Exact text could collapse visually, normalize, hide, or duplicate | Mounted production-consumer tests and `whitespace-pre-wrap` source | Actual DOM `textContent`, class/style, occurrence count, and screenshot for LF and CR |
| Stored Team/nested Team/Agent projection | A scope could bypass the singular classifier or current immutable view | Stored form projector and root/nested component tests | Real V2 TeamRun selected through the normal workspace/history Settings journey at representative scopes |
| Current normal control | Fix could over-classify ordinary schema-valid strings as history | Utility and mounted consumer tests | One normal disabled input with the exact ordinary value at each representative scope |
| Read-only/no mutation | Inspecting or toggling disclosures could change stored state or create authoring intent | Shared stored-form/store tests | File/hash and UI mutation-authority audit before/after browser interactions |
| Browser/web-equivalent desktop | HTML control capability and whitespace presentation are browser boundaries | Reviewer DOM probe and implementation render | Independent actual `open_tab` execution against current Nuxt and owned backend/profile |
| Desktop shell | No preload, IPC, window, updater, or packaging owner changed | Retained API-REV-008 launcher/isolation evidence | No shell interaction; use the supported launcher only for owned profile/backend fidelity |
| API/runtime/migration/provider | No implementation owner changed | Retained API-REV-006/007 and CRR-019 trace | No broad lifecycle/provider rerun unless current execution exposes a contradiction |

### Refreshed Durable Coverage Decisions Before Execution

| Durable Path / Scenario | Decision | Current Basis / Action |
| --- | --- | --- |
| `autobyteus-web/utils/__tests__/historicalModelConfigFields.spec.ts` | `Still Valid` | Directly asserts ordinary string -> current control and LF/CR -> exact residual. Rerun unchanged. |
| `autobyteus-web/components/workspace/config/__tests__/StoredTeamScopeHistoricalFields.spec.ts` | `Still Valid` | Mounts the real root/nested Team consumer and asserts one disabled ordinary input, one exact multiline residual, whitespace preservation, no duplicate input, and zero mutation. Rerun unchanged. |
| Remaining nine stored/shared files in CRR-019's 11-file cohort | `Still Valid` | Cover immutable stored projection, shared Team/Agent discrimination, disabled/read-only controls, disclosures, removed/stale/whole-schema fallbacks, and current editable regression. Rerun unchanged. |
| API-REV-008 presentation evidence | `Still Valid` | IR-012 does not alter editable layout, launch controls, workspace readiness, or shell owners. No editable presentation rerun beyond the shared regression cohort. |
| API-REV-006/007 API, V2, migration, application, provider evidence | `Still Valid` | CRR-019 confirms no backend, persistence, launch, migration, allocation, application, or external-channel delta. No proportional rerun absent a contradiction. |
| Persisted current-schema multiline actual-route scenario | `Use Temporary Executable Probe Only` | The project has no durable route-level browser suite; the deterministic component coverage already protects the code path. A private-package/owned-profile browser fixture and temporary current-catalog property injection are inappropriate repository fixtures but directly close the runtime/DOM gap. |

### Durable Coverage Delta Decision

- Add/update/remove repository-resident durable coverage: `No` planned. IR-012's two durable test updates already encode the exact classifier and mounted shared-consumer responsibilities and passed source review. The missing evidence is realistic persistence/browser integration, not another repository test.
- The test files are classified from current requirements rather than inherited blindly. No stale assertion, obsolete compatibility path, or untested deterministic branch requiring a durable edit was found.
- If execution reveals a product or test contradiction, stop, update this investigation, preserve evidence, and route through `/code_reviewer` rather than weakening tests or fabricating success.

### Planned Execution — Narrowest To Broader

1. Run the exact CRR-019 stored/shared 11-file cohort and require 11 files / 113 tests.
2. Run `git diff --check`; record hashes for the four IR-012 production/test paths; confirm no API/E2E product or durable-test source delta and no deleted alternate stored renderer/authoring dependency returned.
3. Start an owned isolated backend/profile with the documented Electron E2E launcher on a free non-29695 port and an owned temporary data root; keep the user's active profile/process untouched. Start current HEAD Nuxt on a second owned port proxying only to that backend.
4. Through the real owned GraphQL API, create one current V2 `nested-classroom-test` TeamRun with distinct root Team, `/StudentStudyGroup`, and exact Agent configurations. Include unique ordinary strings and exact LF/CR current-schema candidate strings; do not start provider execution.
5. Read the owned persisted V2 file and GraphQL/history projection to prove the exact values and topology before browser interaction; record a hash/byte baseline.
6. Use actual AutoByteus `open_tab` to follow the normal workspace -> existing TeamRun/member -> Settings journey. In the owned page only, extend the selected model's public current catalog schema with the two temporary free-text properties, leaving the persisted run untouched.
7. At root Team, nested Team, and an exact Agent scope, assert one disabled ordinary input with the exact single-line value; exactly one multiline historical residual with exact LF or CR `textContent`, visible whitespace preservation, no duplicate text input/current control, and correct field locality. Assert stored/read-only mode, operable disclosures, and no Run/Reset/edit capability.
8. Toggle representative disclosures and resize to a narrow desktop viewport; assert text visibility, no horizontal overflow/overlap, and continued exactness. Re-read the V2 file and owned history, compare hashes/values, and confirm no authoring draft or GraphQL create/update mutation was emitted.
9. Capture machine-readable DOM/API/disk results, narrative evidence, and desktop/narrow screenshots. Close the tab, stop only owned Nuxt/launcher processes, remove the owned root, verify ports free, and prove the user-owned 29695 process remains healthy.
10. Reconcile the canonical investigation, execution report, and API revision record as API-REV-009; apply the current handoff rules. With no durable delta, request `Not Applicable` proportional review rather than routing directly to delivery.

### Pre-Execution Confidence And Gate

| Category | Pre-Execution | Basis / Gap |
| --- | ---: | --- |
| Requirement and acceptance proof | 92% | Requirements map cleanly to reviewed source/tests; direct persisted browser proof is pending. |
| Changed-boundary execution directness | 89% | Utility/mounted consumers are direct for classification but do not yet cross actual GraphQL/V2/history/browser selection. |
| Cross-boundary integration realism and mock gap | 84% | The live user snapshot lacks multiline data; an owned persisted TeamRun and actual route are required. |
| Environment/configuration/fixture fidelity | 88% | Supported owned launcher/profile and private nested definition are available; temporary current-catalog fields must be disclosed and bounded. |
| Failure/edge/lifecycle/recovery evidence | 93% | LF, CR, removed/stale/whole-schema and no-mutation durable cases exist; realistic persistence mutation audit is pending. |
| User surface/browser/desktop shell | 84% | HTML text capability and whitespace are browser-specific; independent `open_tab` evidence is pending. No shell-specific owner changed. |
| Durable regression quality | 97% | Cohesive utility plus mounted shared consumers cover the exact code path without duplicating route-level private fixtures. |

- Pre-execution overall confidence: `90%` (rounded simple average); two categories remain below the clean-pass floor, so no completed result is claimed.
- Broader validation decision: `Required` — the material gap is the real GraphQLJSON -> V2 -> history -> shared Settings -> DOM text/control boundary.
- Critical success gates: exact persisted LF and CR survive at representative scopes; ordinary values remain ordinary disabled inputs; multiline values appear once as residuals with exact DOM text and visible whitespace; no snapshot mutation or authoring action occurs; cleanup/isolation succeeds.
- Current result: `Pending execution`; API-REV-008's 98% is not inherited as API-REV-009 confidence.
- Delivery gate: closed. Successful execution still returns the cumulative package to `/code_reviewer`; explicit user hands-on verification remains a later delivery-finalization condition.

### API-REV-009 Investigation Amendment — Electron E2E Launcher Transpile Prerequisite

- Pre-launch inspection found the supported source launcher and current packaged executable, but `autobyteus-web/dist/electron/launch-profile/e2eDataRootSafety.js` is absent. The documented launcher intentionally rejects this state before creating a backend or profile.
- Classification: environment preparation prerequisite, not a product/test failure. No execution result has been claimed and no owned process/data root exists yet.
- Authorized preparation: run only the documented `pnpm transpile-electron` script, record its output, then use `test:e2e:electron --skip-build` with the current packaged executable. IR-012 changes only web source/tests; CRR-019 confirms no backend or Electron-shell owner changed, and current Nuxt will supply the reviewed renderer.
- Coverage, confidence, and durable-delta decisions remain unchanged. The user-owned application on 29695 and unrelated existing browser tab/session remain untouched.

### API-REV-009 Completed Execution Outcome — Fail / API-E2E-F-003

#### Repository, Persistence, And Browser Evidence

- Focused stored/shared cohort: `Pass`, 11 files / 113 tests. Ordinary, LF, and CR classifier assertions and mounted shared consumers all passed. Evidence: `api-e2e-evidence/api-rev-009-web-stored-settings-focused.txt`.
- Static/hash audit: `Pass`. `git diff --check` passed; no API/E2E product or durable-test source changed; singular classifier/residual owner and stored-projector guards passed. Evidence: `api-rev-009-static-hash-audit.txt`.
- Owned realistic fixture: `nested-classroom-test`, `codex_app_server` / `gpt-5.6-luna`, current V2 TeamRun `nested_classroom_test_team_50b47ce67a654603be2e089b7923a556`. Root Team, `/StudentStudyGroup`, `/Teacher`, and two nested Agents carried distinct ordinary and LF/CR values. Exact V2/config equality passed before browser selection; evidence: `api-rev-009-persisted-fixture-before.json`.
- Actual AutoByteus `open_tab`: `Yes`, tab `4ce41d`, current Nuxt 59124 -> owned packaged backend/profile 59049. The normal workspace/history -> Teacher -> Edit Config journey selected the real persisted TeamRun. The owned page's current Codex Luna catalog was temporarily extended with two `type: string` properties only after the real stored view loaded; no stored snapshot or product source changed.
- Ordinary current controls: `Pass` at all five representative scopes. Each exact single-line value appeared once in a disabled `input[type=text]`.
- LF residuals: `Pass` at root Team, `/Teacher`, and `/StudentStudyGroup/student_two`. Each value appeared once; DOM code point 10 was exact; computed `white-space` was `pre-wrap`; Range layout reported two visual line Y coordinates and a 32px text box.
- Exact CR retention: `Pass` at `/StudentStudyGroup` and `/StudentStudyGroup/student_one`. Each value appeared once with exact DOM code point 13 and no duplicate current control.
- **API-E2E-F-003 — critical visual failure:** isolated CR is not visibly preserved. Both CR residuals computed `white-space: pre-wrap`, but browser Range layout reported one visual line and a 16px box. The nested screenshot visibly renders `NESTED firstNESTED second` with no break or other separation. This contradicts the approved exact, truthful, visibly whitespace-preserving fallback contract described by R-044 / AC-038, IR-012, and CRR-019.
- Read-only/no-mutation checks: `Pass`. Stored notice present; disclosures operable; no Run/Reset; no Team draft or selected draft; post-instrumentation browser network list empty. The persisted V2 SHA-256 remained exactly `367491ac21c2cceced68921b6a764cb2475241c6fad0e91212d53f0aa688eb2d`, and all stored values remained exact after interaction. Evidence: `api-rev-009-browser-persisted-multiline-result.json`, `api-rev-009-persistence-after-browser.json`, and the desktop screenshots.

#### Failure Classification And Coverage Decision Update

- Current result: `Fail`; failure ID `API-E2E-F-003`.
- Preliminary origin: implementation/product presentation defect, not persistence, API, fixture, environment, or provider failure. `HistoricalModelConfigFallback.vue` retains the CR in the DOM but relies on CSS `whitespace-pre-wrap`; the actual browser does not turn the isolated CR text node into visible whitespace. The exact same production path renders LF correctly.
- Existing durable-coverage update: `StoredTeamScopeHistoricalFields.spec.ts` and the utility test remain valid for classification, exact DOM, and class assertions, but are incomplete for the browser-rendered CR outcome. They passed while the real browser failed. No assertion is stale or removed; a later correction needs a durable structural assertion for whatever production mechanism makes CR visibly distinct, plus this actual-browser rerun.
- API/E2E-owned local fix: `No`. Correcting the production renderer is outside API/E2E ownership. No repository-resident durable test was changed in API-REV-009.
- Routing: return the cumulative package to `/code_reviewer` for focused failure-origin review. Do not conduct successful proportional review and do not route to delivery.

#### Final Confidence Scorecard

| Category | Final | Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 82% | The exact acceptance boundary was directly exercised, but the CR visible-whitespace requirement fails. |
| Changed-boundary execution directness | 99% | Real GraphQLJSON, V2 disk, history projection, shared stored form, actual control/residual, and browser layout were observed. |
| Cross-boundary integration realism and mock gap | 96% | Owned current nested TeamRun closed the source-stage mock gap; only the bounded temporary current-catalog property injection remains. |
| Environment, configuration, identity, and fixture fidelity | 94% | Official isolated launcher, private nested definition, Codex Luna identity, current Nuxt, and owned V2 state were used without user-profile interference. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Ordinary, LF, CR, exact DOM, duplication, mutation, persistence, and cleanup boundaries were covered; broad unchanged lifecycle reruns were not needed after the critical failure. |
| User-surface, browser, and desktop-shell confidence | 82% | Actual `open_tab` conclusively exposes the CR display failure; unchanged shell-specific behavior remains out of scope. |
| Durable regression coverage quality and relevance | 75% | Current tests are coherent for classifier/DOM ownership but did not prove browser-visible CR whitespace and passed despite the defect. |

- Overall final confidence: `89%` (rounded simple average).
- Broader validation decision: `Required` and completed; it changed the outcome from green repository evidence to a real product failure.
- Critical acceptance criteria directly proven: `No` — isolated CR visual truthfulness fails.
- Default clean target met: `No`; result remains `Fail` regardless of score.
- Cleanup: TeamRun terminated; API-REV-009 tab closed; owned ports 59049/59124 free; owned root removed; user-owned PID 58117 / port 29695 remained healthy; unrelated pre-existing tab `b2df06` remained untouched. Evidence: `api-rev-009-cleanup-audit.txt`.

## API-REV-010 Real-User Reachability Scope Correction — Pass / 98%

### Authoritative Applicability Decision

- The user explicitly requires all blocking validation scenarios to be grounded in real, normally reachable user behavior.
- `ordinary_prompt` and `multiline_prompt` are not product settings. The current `codex_app_server` / `gpt-5.6-luna` catalog emits no free-text property, and the normal configuration form cannot create either field.
- API/E2E created those arbitrary GraphQLJSON keys and temporarily injected matching page-local catalog properties. The resulting isolated-CR observation is technically reproducible only in that synthetic harness.
- Classification: `Out Of Scope / Non-Blocking Robustness Observation`. `API-E2E-F-003` is closed for current sign-off by invalidation of its reachability premise, not by a product fix. No implementation or design correction is authorized.

### Current Coverage Decisions

| Scenario / Evidence | Decision | Basis |
| --- | --- | --- |
| Current emitted provider settings through the normal launch and stored Settings UI | `Still Valid` | Real current-user path; repository cohort and actual route passed read-only/non-mutation behavior. |
| Private nested classroom launch with distinct Team configuration, message, and delegated task | `Still Valid` | API-REV-006 used the real package, actual `open_tab`, real supported providers/models, V2 disk state, messaging, and task lifecycle. |
| API-REV-009 invented `ordinary_prompt` / `multiline_prompt` browser probe | `Out Of Scope` for sign-off | No current catalog or normal UI emits the fields; retain only as a non-blocking robustness note. |
| Repository-resident durable coverage | `Still Valid`; no delta | API-REV-010 changes classification/reporting only. No product or durable-test file changed. |

### Execution And Confidence Decision

- New execution: `Not Required`. This correction changes only scenario applicability after explicit user direction; code, tests, runtime, environment, catalog, and evidence are unchanged.
- Current result: `Pass` / `98%` for real current-user paths.
- Current blocking failure IDs: `None`.
- Proportional test-code review: `Not Applicable`; API-REV-010 adds, updates, and removes no durable test.
- Route: return the corrected cumulative package to `/code_reviewer`; do not route directly to delivery.

| Confidence Category | Current Score | Basis |
| --- | ---: | --- |
| Requirement and acceptance proof | 99% | All applicable real-user acceptance paths have direct evidence. |
| Changed-boundary directness | 98% | Current stored Settings route and shared consumers were directly exercised. |
| Cross-boundary realism | 99% | Real browser, GraphQL, V2 disk, provider messaging, and task lifecycle evidence is retained. |
| Environment/configuration/fixture fidelity | 99% | Owned isolated services plus the real private package and supported models/providers were used. |
| Failure/edge/lifecycle/recovery | 97% | Workspace recovery, stale repair, restart/restore, migration, non-mutation, and cleanup are covered. |
| User surface/browser/desktop shell | 98% | Actual `open_tab` covers the material web-equivalent desktop surface; unchanged shell-only behavior is out of scope. |
| Durable regression quality | 96% | Requirement-linked hierarchy, migration, workspace, and stored Settings suites remain green and current. |

- Overall current confidence: `98%` (rounded simple average); no category below 90% and no critical real-user criterion missing or failing.

## API-REV-011 Fresh IR-014 Test-Only Coverage Investigation And Execution

### Changed Surface And Reachability

- Reviewed HEAD: `5305bfa2049ed56e6ff917dbee8c17e3a8ac3a8f`.
- IR-014 test commit: `4b36f7c5b58ed3ea3fe3cc94ea5d71228913949e`.
- Changed runtime/product surfaces: none. No component, classifier, form model, store, API, V2, migration, provider, Electron, or workspace source changed.
- Changed durable coverage: one existing test in `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`.
- Real producer path: current/released runtime/model configuration can emit `reasoning_effort`; optional `service_tier` can be absent from a later schema. The stored whole-schema-absence consumer must retain both exact values once, in stable key order, without mutation.
- Excluded premise: synthetic CR/free-text fields, arbitrary page-local catalog mutation, and the old `alpha`/`zeta` fixture are not current user paths and are not validation inputs.

### Current Durable Coverage Decisions Before Execution

| Path / Scenario | Decision | Reason / Required Action |
| --- | --- | --- |
| `components/workspace/config/__tests__/MemberOverrideItem.spec.ts` whole-schema-absence Agent case | `Needs Update` already implemented by IR-014; validate unchanged | It is the only IR-014 delta. Confirm producer-backed exact values, one occurrence, stable order, no event, and no input mutation. |
| Other seven `MemberOverrideItem.spec.ts` cases | `Still Valid` | They protect editable/stored Agent control behavior surrounding the changed case. Run the full file. |
| Current 11-file stored/shared cohort | `Still Valid` | It covers direct classifier, root/nested Team and Agent consumers, immutable stored projection, disabled form behavior, and unchanged workspace/store integration. Rerun as the proportionate broader cohort. |
| API-REV-010 real browser/provider/lifecycle evidence | `Still Valid` | IR-014 has no production delta, so browser, provider, API, V2, migration, restart/restore, and Electron boundaries are unchanged. |
| API-E2E-F-003 arbitrary free-text/CR probe | `Out Of Scope`; do not execute | The user-authoritative reachability rule and CRR-023 both prohibit resurrecting it. |
| New repository-resident coverage | `Not Required` | The corrected existing scenario directly exercises the only changed boundary; adding another test would duplicate it. |

### Planned Proportionate Execution

1. Run the changed `MemberOverrideItem.spec.ts` alone with the documented `pnpm test:nuxt ... --run` command.
2. Run the complete current 11-file stored/shared cohort and require 11 files / 112 tests.
3. Run `git diff --check`, hash the changed test, inspect commit boundaries, confirm IR-014 changes one test only, and assert rejected/synthetic vocabulary is absent from the retained classifier/residual/direct/root/nested-Team/Agent paths.
4. Preserve CRR-022's Nuxt production build without rerun because IR-014 changes no production source and both implementation and independent source review already retained it explicitly.
5. Do not launch browser/Electron/backend/provider services. Those surfaces cannot improve proof of a test-fixture vocabulary correction and would violate the explicit prohibition on the only previously proposed browser scenario.
6. Reconcile the canonical execution report and revision record. Because IR-014 changes repository-resident durable coverage, return the successful cumulative package and `MemberOverrideItem.spec.ts` to `/code_reviewer` for proportional test-code review; do not route directly to delivery.

### Pre-Execution Confidence And Broader Gate

| Category | Pre-Execution | Basis / Gap |
| --- | ---: | --- |
| Requirement and acceptance proof | 97% | The supported producer-backed values and exact-history rule are clear; independent execution of the corrected case is pending. |
| Changed-boundary directness | 94% | Reviewer and implementation runs are green, but API/E2E has not yet independently executed the changed test. |
| Cross-boundary realism and mock gap | 98% | No production boundary changed; this is intentionally a mounted durable-consumer fixture correction. |
| Environment/configuration/fixture fidelity | 96% | The new fixture uses named emitted configuration keys/values; independent vocabulary audit is pending. |
| Failure/edge/lifecycle/recovery evidence | 97% | Exactness, ordering, duplication, event, and mutation assertions exist; run is pending. |
| User surface/browser/desktop shell | 98% | No user surface changed; API-REV-010 real-user evidence remains applicable. |
| Durable regression quality/relevance | 93% | The corrected scenario is structurally direct; independent execution/static confirmation is pending. |

- Pre-execution confidence: `96%` (rounded simple average).
- Current result: `Pending execution`; API-REV-010 remains the last completed result.
- Broader validation decision: `Not Required` for browser/Electron/provider execution. The repository cohort directly exercises the only changed boundary, and no runtime source changed.
- Delivery gate: closed pending execution and proportional durable-test review.

### API-REV-011 Completed Outcome — Pass / 98%

- Changed test execution: `Pass`, 1 file / 8 tests. Evidence: `api-e2e-evidence/api-rev-011-member-override-focused.txt`.
- Full stored/shared cohort: `Pass`, 11 files / 112 tests. Evidence: `api-e2e-evidence/api-rev-011-web-stored-settings-focused.txt`.
- Static/product-grounding audit: `Pass`. IR-014 changes exactly one existing durable test and no production source; `reasoning_effort` and `service_tier` are backed by current Codex normalization/schema behavior; exact values, single occurrence, stable order, zero update event, and byte-equivalent input are asserted; rejected synthetic CR/free-text and `alpha`/`zeta` vocabulary is absent. SHA-256: `45bd06f922e3624cab000e602267872b83d52673be1cfae667329826d5c39fda`. Evidence: `api-e2e-evidence/api-rev-011-static-product-grounding-audit.txt`.
- Browser/Electron/provider execution: `Not Required` and not performed. No product source or user journey changed, and the explicitly excluded synthetic catalog-injection scenario was not executed.
- Retained build: CRR-022 Nuxt production build remains applicable because IR-014 changes no production source.
- Current result: `Pass` / `98%`; blocking failure IDs: none.
- Durable coverage delta requiring proportional review: updated `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` at IR-014. API/E2E made no additional repository test edit.
- Routing: `/code_reviewer` for proportional successful test-code review; do not route directly to delivery.

#### Final Confidence Scorecard

| Category | Final | Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance proof | 99% | The current producer-bounded history requirement maps directly to the corrected exact-value scenario and passed. |
| Changed-boundary directness | 99% | The only changed test passed alone and in its complete current cohort. |
| Cross-boundary integration realism and mock gap | 98% | No runtime boundary changed; the mounted shared consumer is the intended durable boundary. |
| Environment/configuration/fixture fidelity | 98% | Current Codex producer keys/values are independently confirmed; no synthetic catalog state remains. |
| Failure/edge/lifecycle/recovery evidence | 98% | Whole-schema absence, exactness, ordering, duplication, event, and mutation boundaries pass; unchanged lifecycle proof is retained. |
| User surface/browser/desktop shell | 98% | No surface changed; current real-user browser/provider baseline remains valid and no irrelevant rerun was performed. |
| Durable regression quality/relevance | 98% | The corrected test is focused, stable, producer-backed, and green in isolation and cohort. |

- Overall final confidence: `98%` (rounded simple average); no category below 90%, no critical real-user criterion missing or failing.
- Broader validation decision: `Not Required` for browser/Electron/provider execution.
- Delivery gate: closed only for required proportional test-code review and normal downstream routing.
