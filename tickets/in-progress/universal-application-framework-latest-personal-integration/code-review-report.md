# Code Review Report — Universal Application Framework Latest-Personal Integration

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-strategy-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-runtime-contracts.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/merge-attempt.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/merge-conflict-inventory.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/branch-overlap-inventory.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-path-inventory.txt`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`–`ARCH-REV-003`; authoritative `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: `/implementation_engineer` requested complete source and structural review of merge `28a8c368e784f09b15286e2412e8311bcb3c4493`.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `CRR-001`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- API/E2E Revision Record Reviewed (failure-origin entry point): `N/A`
- Relevant API/E2E Revision IDs: `N/A`
- Delivery Revision Record Reviewed (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/code-review/crr-001-source-review.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/code-review/crr-001-focused-tests.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/code-review/crr-001-standalone-integration.log`

## Review Scope

- Changed implementation and behavior reviewed: the complete latest-Personal/finalized-feature semantic merge, including both host starters and builders, application runtime projections/lifecycle, required-tool readiness, current run/team activation and resource ownership, scoped MCP publication/messaging, launch configuration and persistence, SDK/devkit/application workflows, current web surfaces, removals, and structural guards.
- Files / areas reviewed: both merge histories and inventories; `184` added/modified production-source files; the complete `autobyteus-server-ts/src` application/startup/run/team/tool/storage intersections; application SDK/devkit packages; maintained Brief/Socratic sources; related Studio web entry/setup paths; architecture/focused durable coverage; all changed-source size-pressure files.
- Explicit exclusions: real browser journeys, actual model/provider execution, process-kill recovery, package parity across repeated watches, and Electron execution remain API/E2E/delivery-owned after source review passes. Inherited whole-suite failures documented by IR-001 were not reclassified without a supported connection to this implementation.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: integrate the finalized same-package/two-host framework onto exact latest Personal while preserving current lifecycle, migration, provider/model, rooted identity, persistence, scoped application behavior, and clean-cut removal contracts.
- Design-spec behavior map verified against the implementation: the merge ancestry, explicit host/application boundaries, current run graph, scoped session/publication graph, tool-readiness owner, package/devkit flow, and removals are present. The standalone process-lifecycle implementation and launch-override read behavior contradict two exact supplemental contracts.
- Design review report and round confirmed: `ARCH-REV-003 / Pass`; AR-001–AR-003 were closed with exact lifecycle and direct-use persistence obligations.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: none. The findings are implementation deviations from already approved behavior, not new product behavior.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | HEAD is a clean two-parent semantic merge; latest Personal, the finalized feature, and the ticket artifact parent are ancestors; no unmerged path or conflict marker remains. | N/A |
| `BEH-002` | Confirmed | Maintained application scripts use the devkit's `dev`, `dev:studio`, `build`, `validate`, and `start`; focused build/package/server integration passes after declared prerequisites. | N/A |
| `BEH-003` | Contradicted | The graph uses current run/team managers, activation registry, resource manager, rooted identity, and scoped MCP dependencies, but `start-standalone-application-host.ts` omits required latest-Personal token readiness and TeamRun catalog phases. | `CR-001`; `CR-PREM-001`. A fresh supported standalone host reaches `TeamRunService.createTeamRun`, which rejects against the never-initialized process readiness state. |
| `BEH-004` | Contradicted | Package/selected baselines, sparse overrides, availability blocking, and explicit Save/Reset APIs are present, but `ApplicationLaunchOverrideStore.getOverride/listOverrides` execute schema DDL during reads. | `CR-002`; `CR-PREM-002`. Opening the supported Studio launch-setup surface immediately issues the GET that creates/repairs the table, contrary to the approved non-mutating read contract. |
| `BEH-005` | Confirmed | Retired managers/stores/builders and generated/mirrored paths are absent; the overlap inventory and current tree show clean target owners rather than compatibility aliases. | N/A |
| `BEH-006` | Confirmed | Architecture/focused validation, production build, merge integrity, and source-size evidence exist; downstream real execution remains correctly unclaimed. | N/A |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The large semantic integration/refactor posture and bounded authority intersections are explicit and mostly preserved. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | `integration-runtime-contracts.md` phases 5–10 and §3.3 are contradicted by the standalone starter and override-store reads. | Resolve `CR-001` and `CR-002` exactly; do not revise the approved contract around the implementation. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | Studio and the application run/return/cleanup spines remain readable, but the standalone startup spine jumps from Prisma to vault/generic migration gating and omits token-schema/readiness/catalog/readable-provider nodes. | Restore the exact standalone phase allocation and order. |
| Ownership boundary preservation and clarity | Pass | Explicit Studio/standalone assembly, four frozen runtime projections, graph-local run/session/publication owners, and named general-process owners remain distinct. | None. |
| Off-spine concern clarity | Pass | Persistence, projections, provider adapters, resource cleanup, and tool registration serve clear governing owners. | None. |
| Existing capability/subsystem reuse check | Pass | Current migration runner, token readiness, TeamRun catalog, registrars, run services, and stores are reused rather than replaced by generic machinery. | Use those already-approved lifecycle owners in the standalone correction. |
| Reusable owned structures check | Pass | Activation/resource state, launch normalization/overlay/baselines, runtime projections, and tool readiness are extracted under their owning subsystems. | None. |
| Shared-structure/data-model tightness check | Pass | Current rooted member identity and sparse launch configuration remain singular; no kitchen-sink shared model was introduced. | None. |
| Repeated coordination ownership check | Pass | `AgentToolRegistryReadiness` is the sole Core-first/five-server/Search-last owner; production registration scans and architecture coverage agree. | None. |
| Empty indirection check | Pass | Reviewed runtime projections, session managers, registries, and coordinators own contracts/state/sequencing rather than forwarding only. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | The large integration is decomposed by process, application runtime, launch configuration, run execution, and package tooling. The 500-line launch service remains a coherent semantic coordinator with extracted helpers. | Keep the 500-line file under pressure monitoring; do not add another concern there. |
| Ownership-driven dependency check | Pass | Architecture guard AFB-001–AFB-005 passes; no application-to-process singleton shortcut was found in the reviewed construction graph. | None. |
| Authoritative Boundary Rule check | Pass | Hosts consume runtime projections, routes consume narrow contracts, and application run construction supplies exact scoped dependencies rather than mixing outer and internal authorities. | None. |
| File placement check | Pass | Changed files align with startup, compositions, application-platform, execution, storage, SDK/devkit, and maintained-application owners. | None. |
| Flat-vs-over-split layout judgment | Pass | Runtime and launch subfolders expose structural depth without one-file-per-step fragmentation. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | Studio/standalone builders, runtime projections, launch read/preview/save/reset methods, and run/team methods use explicit subjects and identity shapes. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | Current names such as `ApplicationPlatformRuntime`, `AgentToolRegistryReadiness`, `AgentRunActivationRegistry`, and `ApplicationLaunchOverrideStore` communicate responsibility. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Host-specific process coordination remains deliberately explicit while shared application lifecycle and policy are centralized. | None. |
| Patch-on-patch complexity control | Pass | Removed seams were not restored through aliases, callbacks, service locators, global fallbacks, or duplicate registration paths. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | Retired files are removed, but request-time `hasColumn`/`ALTER TABLE` repair remains in the new target store despite the clean direct-use contract. | Remove ordinary-read schema-repair behavior as part of `CR-002`. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Existing focused tests pass but do not prove standalone phases 5–10 or real SQLite no-write behavior for read/list. | Add exact durable lifecycle and read-side-effect regressions. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Architecture, lifecycle, run/resource, launch-service, and standalone-package coverage remain coherent; source-size thresholds are not applied to tests. | Reuse existing startup and SQLite fixture patterns for corrections. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | No retained test was found to require a removed compatibility seam. | None. |
| API/E2E readiness for the next workflow stage | Fail | Production build and focused coverage pass, but two reachable requirement blockers remain; real execution must not begin until source re-review passes. | Correct `CR-001` and `CR-002`, rerun implementation checks, then return for source review. |

## Source File Size And Structure Audit

Changed implementation-source thresholds were applied to production source only. There are `184` added/modified production-source files, no file above `500` effective non-empty lines, one file exactly at `500`, and `14` files with a changed-source delta above `220` lines.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `application-platform/launch-configuration/application-launch-configuration-service.ts` | 500 | Pass, at limit | 520, pressure | Coherent semantic coordinator; parsing, normalization, overlay, baseline, and diagnostics are extracted. | Pass | No finding | Do not add another responsibility; split by a real owner if it grows. |
| `application-packages/services/application-package-registry-service.ts` | 225 | Pass | 517, pressure | Registry/query ownership remains coherent after removal consolidation. | Pass | No finding | None. |
| `application-orchestration/services/application-orchestration-host-service.ts` | 424 | Pass | 255, pressure | Governs application orchestration commands; narrower collaborators own storage/launch/observation. | Pass | No finding | None. |
| `agent-execution/services/agent-run-manager.ts` | 361 | Pass | 277, pressure | Current candidate construction/publication/termination orchestration remains coherent. | Pass | No finding | None. |
| `application-platform/launch-configuration/application-launch-override-normalizer.ts` | 314 | Pass | 332, pressure | Singular normalization/validation responsibility. | Pass | No finding | None. |
| `server-runtime.ts` | 284 | Pass | 314, pressure | Explicit Studio process coordinator; host-specific breadth is justified by the approved spine. | Pass | No finding | None. |
| `agent-execution/runtime/agent-run-activation-registry.ts` | 267 | Pass | 290, pressure | Singular claim/candidate/active-state authority. | Pass | No finding | None. |
| `application-platform/launch-configuration/application-launch-resource-baseline-builder.ts` | 273 | Pass | 285, pressure | Singular baseline construction owner. | Pass | No finding | None. |
| `standalone-application-host/start-standalone-application-host.ts` | 241 | Pass | 248, pressure | Correct process-coordinator placement, but its lifecycle implementation is incomplete. | Pass | `Local Fix`, `CR-001` | Implement exact phases 5–10 and their unwind semantics. |
| `application-platform/launch-configuration/application-portable-launch-config-policy.ts` | 232 | Pass | 247, pressure | Singular portable-policy owner. | Pass | No finding | None. |
| `compositions/build-studio-server.ts` | 233 | Pass | 238, pressure | Explicit Studio assembly and process-owner cleanup; coherent. | Pass | No finding | None. |
| `application-platform/runtime/create-application-orchestration-services.ts` | 234 | Pass | 235, pressure | Construction owner with explicit narrow products. | Pass | No finding | None. |
| `application-engine/services/application-engine-controller.ts` | 205 | Pass | 230, pressure | Singular worker readiness/control owner. | Pass | No finding | None. |
| `application-engine/services/application-engine-launcher.ts` | 213 | Pass | 224, pressure | Singular launch/reentry owner. | Pass | No finding | None. |
| Remaining 170 changed production-source files | max 480 | Pass; none above 500 | Pass; none above 220 outside rows above | Near-limit files (`mixed-agent-member-handle`, manifests/providers, Socratic runtime/renderer, mixed team manager, Codex bootstrapper) retain bounded existing responsibilities. | Pass | No finding | Continue normal ownership-led monitoring. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Fail | `ApplicationLaunchOverrideStore.ensureTables` conditionally alters missing columns at request/read time, an unapproved current-runtime schema repair path. |
| No legacy old-behavior retention in changed scope | Pass | Physical `launch_defaults_json` retention is approved to avoid migration; normal overlay does not fall back to it. Retired managers/builders/stores are absent. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | Remove the read-path column-presence repair branch; all other enumerated retired paths are clean. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Fail | Approved `Directly Usable — No Migration` reads execute `CREATE TABLE` and conditional `ALTER TABLE`. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | No dual reader/writer or old-shape fallback was found; malformed rows remain diagnostic/resettable as approved. The separate request-time DDL failure remains captured above. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Fail | The design requires side-effect-free read/list/evaluate/preview and explicit Save/Reset as the only mutators. |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/stores/application-launch-override-store.ts` — `hasColumn`/conditional `ALTER TABLE` and `ensureTables` calls from `getOverride`/`listOverrides` | `LegacyBranch` | Lines 30–50 and 82–107; compiled probe changes table count from `0` to `1` on `listOverrides` alone. | It is request-time schema compatibility/migration behavior under an approved direct-use, no-migration, non-mutating-read contract. | Remove schema creation/repair from ordinary reads. Keep any necessary current-schema creation behind the explicit write/storage lifecycle authority only. |

No other dead, obsolete, compatibility, or dormant item was found in the changed scope.

## Docs-Impact Verdict

- Docs impact: `No`
- Why: the approved requirements, runtime contracts, server architecture docs, and developer workflows already describe the intended behavior. The required corrections must make source and tests match those documents rather than change product documentation.
- Files or areas likely affected: implementation source and durable tests only, unless implementation discovers a genuine contract ambiguity and reroutes it.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None. `ARCH-REV-003` recorded no premise requiring reclassification.

### `CR-PREM-001` — A fresh supported standalone application run reaches uninitialized token readiness

- Origin: `New`
- Related approved requirement or established contract: `REQ-003`–`REQ-005`, `AC-003`, `AC-005`, `AC-008`, `AC-009`; `integration-runtime-contracts.md` phases 5–10.
- Relevant behavior ID(s): `BEH-002`, `BEH-003`.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a developer runs the maintained application's exposed `pnpm start` or default standalone `pnpm dev`, opens the application, and starts its declared agent/team business run.
- Support evidence: `applications/brief-studio/package.json` exposes those commands; `autobyteus-application-devkit/src/commands/start.ts` invokes `startStandaloneApplicationHost`; UC-003–UC-005 and the application backend expose agent/team start as supported behavior.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `pnpm start/dev -> devkit standalone command/session -> startStandaloneApplicationHost -> ApplicationPlatformRuntime ready -> application backend startAgentTeam -> ApplicationOrchestrationHostService.startAgentTeam -> ApplicationRunBindingLaunchService -> TeamRunService.createTeamRun -> TokenUsageMigrationReadiness.assertCurrentSchemaReady`.
- Lifecycle preconditions and material consequence at the claimed point: in a fresh standalone Node process the readiness module starts as `CRITICAL_CURRENT_SCHEMA_FAILURE`. The host never calls `configureTokenUsageMigrationReadiness`; the first team run throws `TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED` before construction despite successful core/app-data migrations. The host also skips the required TeamRun catalog rebuild and replaces exact degraded/readable-provider policies with a blanket gate.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-001` is a Major implementation defect. The exact lifecycle is already approved and present in Studio, so a bounded standalone correction plus focused lifecycle/run tests is proportionate; no new framework or requirement is needed.

### `CR-PREM-002` — Opening supported Studio launch setup performs schema DDL

- Origin: `New`
- Related approved requirement or established contract: `REQ-004`–`REQ-006`, `AC-006`, `AC-009`; Persisted Data Outcome `Directly Usable — No Migration`; `integration-runtime-contracts.md` §3.3.
- Relevant behavior ID(s): `BEH-004`.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a user opens a registered application in Studio, which displays the exposed Launch setup panel before application entry.
- Support evidence: `ApplicationShell.vue` mounts `ApplicationLaunchSetupPanel`; its immediate application-ID watcher calls `loadSetup`, which GETs `/rest/applications/:applicationId/execution-resource-configurations`; this is the approved Studio setup surface.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Studio Applications UI -> ApplicationShell -> ApplicationLaunchSetupPanel immediate load -> REST GET execution-resource-configurations -> ApplicationOrchestrationHostService/ApplicationLaunchConfigurationService.getApplicationLaunchConfigurationView -> ApplicationLaunchOverrideStore.listOverrides -> ApplicationPlatformStateStore.withDatabase -> ensurePlatformStatePrepared + ensureTables -> CREATE/ALTER`.
- Lifecycle preconditions and material consequence at the claimed point: a valid fresh application with no saved override is supported. Merely reading its setup creates the platform database/table when absent and may add columns when missing. A compiled in-memory probe records table count `0 -> 1` after `listOverrides`, contradicting the contract that reads never write/seed/repair and only explicit Save/Reset mutate state.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-002` is a Major implementation defect. Move ordinary reads to a genuinely non-mutating existing-state path, confine current-schema creation to the explicit mutating owner, and prove byte/schema stability with real SQLite coverage.

## Review Scorecard

- Overall score (`/10`): `8.5`
- Overall score (`/100`): `85`
- Score calculation note: simple average is `8.54/10`, rounded for summary only. The decision is independently `Fail` because two Major findings and four mandatory categories below `9.0` remain.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.1 | The merge, Studio, application run/return, and cleanup spines are structurally readable. | The implemented standalone process spine silently omits required token/readiness/catalog/provider-gate nodes (`CR-001`, `CR-PREM-001`). | Restore the exact approved standalone phase chain and prove order/failure semantics. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.2 | Four runtime projections, host-specific coordinators, graph-local run/session/publication owners, and named process owners are clear. | Two local owners fail to execute their approved contracts, but no broader ownership bypass was found. | Preserve the boundaries while correcting local behavior. |
| `3` | `API / Interface / Query / Command Clarity` | 9.1 | Launch read/preview/save/reset and run/team interfaces are subject-specific and identity-explicit. | A method named as a read hides DDL side effects (`CR-002`). | Make read APIs behaviorally read-only. |
| `4` | `Separation of Concerns and File Placement` | 9.0 | Placement follows startup/application/execution/storage owners and large policies are extracted. | The launch configuration coordinator sits exactly at 500 effective lines, leaving no growth margin. | Keep new concerns out; split only at a real ownership boundary if it grows. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Rooted identity, activation/resource state, sparse overrides, and runtime projections have singular meanings. | No material model defect found. | Preserve current shapes. |
| `6` | `Naming Quality and Local Readability` | 9.1 | Current role names are substantially clearer than retired vocabulary and map to concrete responsibilities. | `ensureTables` appears innocuous but embeds request-time migration behavior in reads. | Rename/relocate any remaining schema setup to its explicit mutating lifecycle owner. |
| `7` | `API/E2E Readiness` | 7.6 | Build, 41 focused tests, 15 architecture assertions, and standalone package/server integration pass. | Coverage misses both exact standalone lifecycle readiness and no-write persistence invariants; two reachable blockers remain. | Add durable regressions and pass source re-review before real API/E2E. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 7.2 | Most dual-host/run/tool/package behavior matches the approved design. | A fresh standalone business run is blocked by uninitialized readiness, and a read mutates persisted schema (`CR-001`, `CR-002`). | Correct both paths without weakening failure or direct-use semantics. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 7.8 | Retired managers/builders/stores and aliases are absent; no old-shape fallback was restored. | Conditional read-time column repair is an unapproved runtime compatibility/migration branch. | Remove request-time schema repair; retain only the approved physical column and current reader semantics. |
| `10` | `Cleanup Completeness` | 9.1 | Generated/mirrored outputs and named obsolete paths are clean; reviewer-generated outputs were removed. | The read-time repair branch remains as one cleanup miss. | Remove that branch from ordinary reads and keep the retired-path scan green. |

## Findings

### `CR-001` — Major — Standalone never initializes current token readiness or rebuilds the TeamRun catalog

- Status: `Open`
- Affected approved behavior/contracts: `BEH-003`; `REQ-003`–`REQ-005`; `AC-003`, `AC-005`, `AC-008`, `AC-009`; normative lifecycle phases 5–10.
- Material-premise basis: `CR-PREM-001` (`Reachable`).
- Evidence:
  - `start-standalone-application-host.ts:71-86,115-119` runs `runPending()` through a generic required-migration gate, but has no import/call for current token-schema assertion, readiness configuration, token migration status, TeamRun catalog rebuild, or the exact readable-provider gate.
  - `token-usage-migration-readiness.ts:18-21` initializes the process state as critical/uninitialized; `TeamRunService.createTeamRun` asserts it at line 95.
  - The compiled fresh-module probe throws `TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED: Token usage current-schema readiness has not been initialized.`
- Consequence: the supported standalone host can listen and report ready but reject its first real application team run. Degraded token migration and strict TeamRun/readable-provider policies also diverge from current Personal.
- Required action:
  1. Implement standalone phases 5–10 exactly from the already-reviewed status list and ordering; do not retain the blanket replacement policy.
  2. Preserve exact failure/unwind behavior: current-schema, catalog, and readable-provider gate failures reject startup; a non-success token-history migration degrades only after current schema is proven usable.
  3. Add focused durable coverage for phase order/status handling and a fresh standalone application run reaching the configured readiness state.
- Classification: `Local Fix`
- Recommended owner: `/implementation_engineer`

### `CR-002` — Major — Launch configuration reads execute unapproved schema migration

- Status: `Open`
- Affected approved behavior/contracts: `BEH-004`; `REQ-004`–`REQ-006`; `AC-006`, `AC-009`; `Directly Usable — No Migration`; non-mutating read/list/evaluate/preview contract.
- Material-premise basis: `CR-PREM-002` (`Reachable`).
- Evidence:
  - `application-launch-override-store.ts:35-50` creates the table and conditionally adds columns.
  - `getOverride` and `listOverrides` call that helper from ordinary reads at lines 82–107 through `ApplicationPlatformStateStore.withDatabase`, which prepares/creates writable state.
  - The supported Studio setup GET reaches `listOverrides` immediately when the application panel opens.
  - A compiled probe against an empty SQLite database reports `{"before":0}` then `{"after":1,"rows":0}` after `listOverrides` alone.
- Consequence: a user read mutates application state/schema, contradicting the no-migration decision and the explicit Save/Reset-only mutation contract.
- Required action:
  1. Make get/list and all evaluate/read callers use a genuinely non-mutating existing-state path; absence means no saved override, not schema creation.
  2. Remove request-time missing-column repair. Keep current-schema/table creation only behind the approved explicit mutating/storage-lifecycle owner.
  3. Add real SQLite tests covering absent DB/table, representative current rows, and schema/byte stability across get/list/evaluate/preview; retain explicit Save/Reset mutation checks.
- Classification: `Local Fix`
- Recommended owner: `/implementation_engineer`

## Classification

`Local Fix` — both findings are bounded implementation mismatches against exact, adequate reviewed contracts. No requirement or design change is needed.

## Recommended Recipient

`/implementation_engineer`

After correction, complete implementation-source re-review is required before API/E2E begins.

## Residual Risks

- The inherited broad server-suite debt recorded by IR-001 remains characterized but is not attributed here; API/E2E must investigate current coverage after source Pass.
- Real Studio/standalone model runs, scoped MCP publication/messaging, restart/recovery, package parity, cleanup, and Electron execution remain downstream obligations.
- `application-launch-configuration-service.ts` is exactly 500 effective non-empty lines; it is currently cohesive but has no safe growth margin.
- A later advancement of `origin/personal` still requires delivery-owned refresh/integration and proportional rerun.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass`
- Score Summary: `8.5/10` (`85/100`); `Data-Flow Spine`, `API/E2E Readiness`, `Runtime Correctness`, and `No Backward-Compatibility / No Legacy Retention` are below `9.0`.
- Failure Origin (when applicable): `N/A — initial implementation review`
- Recommended Recipient (when applicable): `/implementation_engineer`
- Notes: `CR-001` and `CR-002` are Major, reachable, implementation-owned blockers. The merge structure and most architectural boundaries are strong, but the candidate must not advance to API/E2E until both are corrected and re-reviewed.
