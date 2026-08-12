# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Address/handoff contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Exact collaboration instruction: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-collaboration-system-instruction.md`
- Canonical identity refactor: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/team-run-canonical-identity-refactor.md`
- Team stream/execution projection contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/team-stream-execution-projection-contract.md`
- Live validation contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/nested-classroom-live-validation-contract.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture review record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Triggering cumulative source review: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`
- Code review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- Paused downstream artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, and `api-e2e-test-review-report.md` in the same ticket directory.
- Delivery blocker/revision: `delivery-integration-blocker.md` and `delivery-revision-record.md` in the same ticket directory.

## Current Implementation Summary

- Implementation cycle: `Local Fix`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Current implementation revision ID: `IR-038`
- Related solution revision IDs: cumulative `SR-001`–`SR-018`; current `SR-018`
- Related architecture-review revision IDs: current `ARCH-REV-011` Pass; no requirement or design reroute applies
- Related code-review revision IDs: `CRR-070` triggering second full cumulative source-review Fail — Local Fix, `9.1/10` (`90.5/100`); prior `CRR-067` source Pass and `CRR-069` durable-test Pass are historical while `CR-F-040` is open
- Related API/E2E revision IDs: `API-REV-031` and bounded durable correction `API-REV-032` were `Pass / 98%` before CRR-070 reopened source readiness; API/E2E is paused pending a new source Pass
- Related delivery revision IDs: cumulative through pre-integration `DR-006`; latest-base integration remains aborted/paused and was not touched in this round
- Triggering finding: `CR-F-040`; material premise `CR-PREM-036` (`Reachable`); all prior source findings `CR-F-028`–`CR-F-039` remain preserved as resolved
- Production source commit: `9e05920d226c19259f404de18acc057a0ed747f2` (`fix(web): own Team launch admission`), on protected pre-integration checkpoint `db0b11d0dee8bd91f60d822b2da2f221d1f73fb9`

IR-038 makes `agentTeamRunStore.launchDraft()` admit the exact selected immutable draft before the first server allocation await. The draft store enforces that admission across configuration, focus, pending input, workspace, draft-selection, removal, and replacement mutations; the run-selection store rejects unrelated selection changes while the same admission is active and exposes one owner-only draft-to-real-TeamRun promotion. Duplicate launch rejects before a second allocation. Success registers/selects one canonical context, transfers/removes the exact draft once, and releases ownership; transport/pre-success failure releases ownership while preserving the unchanged draft. Desktop and mobile presentation state derives the same owner status, and the dormant global `isLaunching` plus the post-allocation mismatch branch are removed. No provisional identity, retry policy, alias, fallback, relaxed parser, or compatibility path was added.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001`–`BEH-013` | Preserve rooted TeamRun v3, canonical logical/concrete identity, shared recipient resolution, intrinsic collaboration, providers, handoffs, and direct-current-Team task semantics. | Existing canonical domain/services plus updated mixed/task callers. | Preserved; no route/name/path fallback or alternate selector was added. |
| `BEH-014`, `DS-007`, `DS-014A`–`J` | Close Team domain/event/status/WebSocket identity, including live, initial/restore, and pre-run statuses. | `team-agent-execution-binding.ts`, `team-agent-status.ts`, `team-agent-event.ts`, `team-agent-event-adapter.ts`, `team-runtime-snapshot-service.ts`, `member-command-status-overlay-store.ts`, `team-agent-event-websocket-projector.ts`, and `@autobyteus/team-stream-contracts`. | One immutable binding/status model and one strict projector/serializer path. Initial status is non-event state; pre-run status is a real correlated event. |
| `BEH-014`, activation ordering | Publish durable task activation before child output/work and fail closed before active exposure. | `task-activation-event-barrier.ts`, task activation coordinator/service, task directories, mixed execution registries, and TeamRun publication lease. | Prepared executions are start-gated; activation persistence/commit precedes event release/work opening; overflow/start/persist failure aborts the prepared execution and held events. |
| `BEH-004`, `BEH-009`, `BEH-011`, `R-023`, `R-034`–`R-036`, `AC-043` | Preserve persistent logical Team placement while allocating and routing through one fresh task AgentTeam execution. | `TaskTeamRunIdentityFactory` -> task activation/active directory -> `TaskTeamActiveExecutionResolver` -> `MixedTeamManager` exact task-Team delivery. | Logical parentage is validated in the containing persistent/materialized topology; the fresh concrete ID is validated only in the active child TeamRun. Exact first-level/nested chains, task IDs, member/AgentRun identity, and no-persistent-fallback behavior remain fail closed. |
| `BEH-015`, `DS-013A`–`D` | Keep released-data conversion and exact startup gate; make canonical token conversion one atomic row+schema transaction. | canonical migration/migrator/planner/store, Prisma schema, token runtime/repository/projections. | Planning completes before mutation; row updates, read-back verification, obsolete-column contraction, and canonical root index creation share one transaction. Old independent backfill/drop owners are removed. |
| `BEH-016`, `R-050`, `R-051`, `AC-047`, `DS-015A`–`G` | Separate immutable topology from concrete execution/task lifecycle; admit one complete task snapshot; reconcile monotonically and atomically; keep Agent status single-owned and reactive. | `taskDelegationGraphqlDtoProjection.ts`, `taskDelegationHydrationService.ts`, `teamRunContextHydrationService.ts`, `teamTaskProjectionMapper.ts`, `teamExecutionState.ts`, and aggregate-private concrete/materialization/invariant/reconciliation modules. | One invalid GraphQL row rejects the collection and preserves prior state; nested parent-chain/topology/update invariants fail closed; a supported restored task-Team child projection waits only for its exact real task-Team Agent binding and then materializes atomically; terminal history never rematerializes; cleanup rejects nonterminal descendants; raw `AgentContext.state` changes invalidate aggregate queries. |
| `BEH-016`, `DS-016A`–`B` | Preserve exact V5 application execution producer binding without application predecessor migration. | application SDK contract, server application execution context, mixed Agent materialization, frontend exact mapper/history parser. | Persistent producer address is asserted; task/task-Team Agent execution rebinds exactly; application predecessor database migration is deleted. |
| `BEH-016`, mobile Team references | Preserve one canonical root identity for mobile message-owned structured reference routes. | `autobyteus-web/components/mobile/MobileTeamMessages.vue` -> `AgentTeamContext.executions.getRootTeamRunId()` -> `MobileTeamReferenceViewer`. | The viewer receives the exact rooted TeamRun ID without expanding `AgentTeamContext` or accepting a compatibility identity. |
| `BEH-016`, `R-038`, `R-039`, `R-043`, Team communication restore | Project Apollo transport DTOs into exact canonical communication messages before domain admission. | `teamCommunicationHydrationService.ts` -> `teamCommunicationGraphqlDtoProjection.ts` -> unchanged `teamCommunicationStore.replaceProjection()`. | Generated query typing replaces the false manual domain type; exact message/address/reference fields and discriminators are validated, transport metadata is not retained, and persistent/nonempty task-Team scopes remain canonical. |
| `BEH-016`, `R-039`, `R-051`, `R-052`, `AC-036`, `AC-042`, `AC-047`, `DS-015A`, Team launch/configuration | Keep one immutable Team launch draft, admit its exact in-flight snapshot before allocation, promote it only through one canonical server-success boundary, and query selected-run configuration from immutable topology. | `teamRunConfigStore.ts` exact admission/mutation guards -> `agentTeamRunStore.launchDraft()` allocation/hydration/once-only promotion -> `agentSelectionStore.promoteTeamDraftLaunch()`; `RunConfigPanel.vue`, `MobileRunSetup.vue`, and mobile setup/launch composables derive pending presentation from the owner. | Pending edits/focus/input/workspace/draft/run selection and duplicate launch fail before a second allocation. Success registers/selects one real context and removes the exact draft; failure preserves and unlocks it. The old global flag and post-allocation mismatch abandonment are absent. |
| `BEH-016`, `R-043`, `R-051`, standalone live stream | Preserve New standalone Agent first-send live projection while sharing cadence with strict Team streaming. | `AgentStreamWebSocketEgress` -> structural `AgentStreamContentCadenceScheduler`/coalescer -> default standalone JSON wire serializer; `AgentTeamStreamHandler` -> exact Team parse/serialize adapter. | Buffered standalone `ServerMessage` input no longer loses serialization; Team DTOs remain exact-contract validated at egress. |
| `BEH-018` | Preserve the required imported nested-classroom three-runtime validation contract. | No live provider or browser execution in implementation scope. | Still required downstream after cumulative source Pass. |
| `R-043`, `AC-048` | Clean cut: remove stale route/task/status/raw-key/placeholder/compatibility authorities. | Deleted legacy status/event/task instance/projection/restore/rebase/application migration/token cleanup files; exact six-path legacy scan retained. | Production clean-cut audits pass; dirty durable tests remain downstream-owned for current-contract maintenance. |

## Key Files Or Areas

- Shared contract: `autobyteus-team-stream-contracts/`
- Server domain/status/event: `autobyteus-server-ts/src/agent-team-execution/domain/` and `services/`
- Mixed persistent/task execution: `autobyteus-server-ts/src/agent-team-execution/backends/mixed/`
- Task lifecycle: `autobyteus-server-ts/src/agent-team-execution/task-delegation/`
- Team WebSocket boundary: `autobyteus-server-ts/src/services/agent-streaming/`
- Canonical migration/token transaction: `autobyteus-server-ts/src/app-data-migrations/migrations/`, token domain/repository, and `prisma/schema.prisma`
- Application producer binding: `autobyteus-application-sdk-contracts/`, server application orchestration/streaming, and mixed Agent materialization
- Frontend authoritative aggregate: `autobyteus-web/services/teamExecution/`
- IR-031 mobile reference delta: `autobyteus-web/components/mobile/MobileTeamMessages.vue`
- IR-032 Team launch-draft delta: `autobyteus-web/types/agent/TeamLaunchDraft.ts`, `composables/useDefinitionLaunchDefaults.ts`, `stores/teamRunConfigStore.ts`, `components/workspace/config/TeamRunConfigForm.vue`, `RunConfigPanel.vue`, and the mobile run launch/setup composables
- IR-033 canonical Team draft promotion delta: `autobyteus-web/stores/agentTeamRunStore.ts`, `components/workspace/config/RunConfigPanel.vue`, and `composables/mobile/useMobileRunLaunchCoordinator.ts`
- IR-034 selected Team configuration query delta: `autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- IR-035 task-Team logical/fresh execution correction: `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/task-team-active-execution-resolver.ts`
- IR-036 truthful shared stream egress correction: `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/stream-content-coalescing.ts`, `agent-stream-content-cadence-scheduler.ts`, `agent-stream-egress-control-composition.ts`, `agent-stream-websocket-egress.ts`, and `agent-team-stream-handler.ts`
- IR-037 exact Team communication GraphQL projection: `autobyteus-web/services/runHydration/teamCommunicationGraphqlDtoProjection.ts`, `teamCommunicationHydrationService.ts`, and `autobyteus-web/stores/runHistoryTypes.ts`
- IR-038 exact Team launch admission: `autobyteus-web/stores/agentTeamRunStore.ts`, `teamRunConfigStore.ts`, `agentSelectionStore.ts`, `components/workspace/config/RunConfigPanel.vue`, `components/mobile/MobileRunSetup.vue`, and mobile setup/launch composables.
- Frontend task admission/commit boundary: `autobyteus-web/services/runHydration/taskDelegationGraphqlDtoProjection.ts`, `taskDelegationHydrationService.ts`, `teamRunContextHydrationService.ts`, and `stores/taskDelegationStore.ts`
- Frontend stream/draft/hydration/open/history/navigation/mobile/presentation consumers: `autobyteus-web/services/agentStreaming/`, `stores/`, `components/`, `composables/`, `types/`, and `utils/`

## Important Assumptions

- Current framework-owned released TeamRun/history/communication/task/token/external data remains supported migration input; application predecessor database state is explicitly unsupported discard/rebuild input.
- `TeamExecutionAddress` remains the only concrete Team execution locator. Persistent and direct task-Agent binding identity derives from it; a task-Team Agent retains its genuine allocated AgentRun ID once because that ID is not encoded by the address.
- Transport subscribers are observation boundaries; they do not own domain mutation or compatibility recovery.
- The protected API/E2E dirty tests/artifacts describe an incomplete pre-SR-018 checkpoint and were not used as current acceptance proof.

## Known Risks

- The cumulative SR-018 source remains broad. IR-038 is a bounded seven-file Team launch ownership correction; the next focused cumulative review still decides source readiness.
- API/E2E's reviewed 92-path package and API-REV-031/API-REV-032 evidence predate IR-038 and cannot substitute for affected desktop/mobile/first-send pending-launch re-execution.
- `pnpm exec nuxi typecheck` remains blocked before project diagnostics by the current downloaded `vue-tsc` / TypeScript package-export incompatibility. The production Nuxt build and focused TypeScript-transformed Vitest checks pass, but no repository-wide frontend typecheck Pass is claimed.
- The protected user-held stack cannot be used for implementation rendering. The pending desktop form state was exercised through a mounted component probe; mobile interaction state was exercised through retained component coverage and owner-derived inert/guarded source. Fresh browser/provider rendering remains downstream-owned.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: cumulative `Comprehensive Refactor`; current round `Local Fix`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` plus `Missing Invariant`
- Reviewed refactor decision: `Refactor Needed Now — bounded`
- Implementation matched the reviewed assessment: `Yes`; one exact per-draft admission now governs owner allocation/promotion, draft mutation, selection, desktop/mobile presentation, and first-send launch
- If challenged, routed as `Design Impact`: `N/A`; SR-018 / ARCH-REV-011 already define the correct owner and success-only promotion
- Evidence / notes: `/tmp/ir038-team-launch-owner-probe.log`, `/tmp/ir038-run-config-panel-render-probe.log`, and `/tmp/ir038-team-launch-source-audit.log`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code and dormant replaced paths removed in scope: `Yes`; the non-authoritative `agentTeamRunStore.isLaunching` flag and late post-allocation draft-mismatch branch are removed
- Shared structures remain tight: `Yes`; one immutable `TeamLaunchDraft` and its exact per-draft admission remain authoritative
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrail: `Yes`; all seven files are `65`–`373` effective non-empty lines, and every per-file delta remains below the `220` split signal
- Notes: no provisional TeamRun/AgentRun, compatibility selector, fallback, retry-as-policy, or parallel launch owner was added.

## Persisted Data Transition Check

- Approved decision: `Migration Required` for released framework-owned Team/task/token/external data; `Discard or Rebuild` for project application databases
- Design reference: `BEH-015`, `UC-019`, `DS-009`, `DS-013A`–`D`, SR-017/SR-018 supplements
- Implementation follows the approved decision: `Yes`
- Migration implementation: the existing canonical migration ID remains the sole blocking target. Token address planning and physical identity-column contraction use one verified transaction. Application database enumeration/conversion is removed.
- Focused evidence: `/tmp/ir028-token-store-probe-final-2.log` proves later-row rollback, stable successful commit, exact values, legacy-column removal, and canonical expression index on `/tmp/ir028-token-store-probe.sqlite` only.
- Deviation: `None`

## Environment Or Dependency Notes

- New workspace package: `@autobyteus/team-stream-contracts` with Zod-backed exact shared Team server/client DTOs and generated `dist` output.
- Workspace/server/web manifests and lockfile include the new package.
- No migration-capable server startup, provider runtime, browser stack, or retained E2E environment was started.
- Never accessed or modified `/Users/normy/.autobyteus/server-data/db/production.db`.
- User-held `127.0.0.1:60004` / `127.0.0.1:31004` stack was not repointed, stopped, or cleaned.
- Protected delivery state remains exact: stash commit `92fe82e95eb123bdfa259c74eeb1c534b26d909b`; backup `/tmp/agent-team-hierarchical-handoffs-dr004-preintegrate.EJ9Oli/delivery-protected.tar`, SHA-256 `da300460f02c1d95965118fbe2ed8f68d549836d9f18d36bf23cdc418103a8d6`.

## Local Implementation Checks Run

- Deleted-after-use canonical owner probe — Pass `1` file / `2` tests: exact store-created draft admission becomes visible before the deferred create resolves; edit, focus, pending-input, draft-selection, run-selection, and duplicate launch reject while pending; exactly one server allocation promotes exactly one context/selection/removal; transport failure preserves and unlocks the identical draft (`/tmp/ir038-team-launch-owner-probe.log`). The temporary test was removed.
- Deleted-after-use desktop rendered interaction probe — Pass `1` file / `17` tests: the pending owner state makes `TeamRunConfigForm` read-only, disables Run, and ignores a typed edit event; retained panel behavior stayed green (`/tmp/ir038-run-config-panel-render-probe.log`). The temporary copy was removed.
- Combined focused selection — Pass `5` files / `49` tests: owner probe, rendered panel probe, unchanged config/selection store suites, and unchanged mobile UX suite (`/tmp/ir038-web-focused-final.log`).
- Final retained selection after mobile inert-state polish — Pass `3` files / `30` tests: unchanged config store `10/10`, selection store `5/5`, and mobile UX `15/15` (`/tmp/ir038-web-retained-final.log`).
- `autobyteus-web`: `pnpm build` — Pass: Nuxt production client/server build and `15`-route prerender (`/tmp/ir038-web-build-final.log`).
- `autobyteus-web`: `pnpm exec nuxi typecheck` — toolchain Fail before project diagnostics because downloaded `vue-tsc` imports TypeScript's non-exported `./lib/tsc` package subpath (`/tmp/ir038-web-nuxi-typecheck.log`). No repository-wide typecheck Pass is claimed.
- Static/source audit — Pass: seven production paths only; exact owner/admission/promotion references present; zero obsolete `isLaunching` or `changed while launch was pending` references; no temporary probes; all changed files below `500` effective lines and per-file delta below `220`; `git diff --check` clean (`/tmp/ir038-team-launch-source-audit.log`).

## Frontend Rendered-Result Check

- Affected surfaces / journeys: desktop Run Team configuration while create/hydrate is pending; mobile Create run pending state; first-send Team draft promotion.
- Approved interaction references: SR-018 `BEH-016`, `R-039`, `R-051`, `R-052`, `AC-036`, `AC-042`, `AC-047`, `DS-015A`; CRR-070 / `CR-F-040` / `CR-PREM-036`.
- Existing design system / adjacent surfaces reviewed: `TeamRunConfigForm`, `RunConfigPanel`, `MobileRunSetup`, mobile picker/runtime/options controls, immutable Team draft/config owner, and canonical launch owner.
- Rendered surface used: deleted-after-use Vue Test Utils mount of the real `RunConfigPanel` with its current form boundary; unchanged `MobileUxRefinement` component suite; production Nuxt build/prerender. The user-held browser/server stack was deliberately not touched.
- States/interactions inspected: pending exact owner state, form read-only prop, disabled Run action, typed edit suppression, mobile inert/busy form, failure unlock/preservation, and success once-only promotion.
- Visual or interaction correction: desktop inputs now become read-only from canonical owner state; mobile form becomes inert/announces busy while its controller derives the same owner pending state; no visual layout, copy, spacing, or style change was introduced.
- Remaining limitation: no separate real browser/provider process was started because the only running stack is protected. Fresh checked-disposable desktop/mobile/first-send interaction proof remains downstream-owned after source Pass.

## Downstream Coverage Hints / Suggested Scenarios

1. Re-investigate all current Team API/E2E fixtures against the strict shared contract; stale route/path aliases, approval tokens, duplicate receiver fields, raw execution maps, and synthetic task instance shapes must be updated or removed rather than adapted.
2. Prove persistent, direct task-Agent, one-level task-Team Agent, and nested task-Team Agent live/initial/pre-run status messages use the same exact binding/status projection; malformed/mismatched bindings mutate nothing.
3. Prove activation is observed before every task subtree event/work packet, including synchronous pre-run status, and that start/persist/overflow rejection exposes no active execution or held event.
4. Prove all-or-nothing task GraphQL admission/store preservation; parent-before-child nested reconciliation; active task-Team Agent -> direct child task Agent -> root reopen deferral until the exact binding arrives; foreign/reordered/missing binding rejection; monotonic older/missing/equal-time behavior; exact focus/open/history continuity; same-response terminal descendant cleanup; and AgentContext-driven reactive navigation/status without a second status owner.
5. Prove strict Team WebSocket client/server rejection of missing/surplus/aliased fields with no command effect; preserve persistent/task execution selection for send, approval, and interrupt.
6. Prove current application V5 build/admission/launch/producer round trip and ordinary rejection of non-current input, with no application database predecessor migration.
7. Re-run canonical migration/token startup gates only against a proven disposable target, including rollback, repair/retry, idempotence, exact gate policy, and query-plan/index coverage.
8. Complete the imported nested-classroom AutoByteus/Codex/Claude browser/provider matrix from the authoritative live-validation contract.
9. Prove mobile Team Activity -> Messages -> Details opens and closes a structured reference using the exact root identity for current persistent and task-scoped message perspectives, with no blank or compatibility route segment.
10. Prove desktop, mobile, and first-send launch admit one exact immutable draft before allocation; while create/hydrate is deferred, config/focus/pending-input/workspace/draft/run selection and duplicate launch cannot replace it or allocate again; success registers/selects one real TeamRun and transfers/removes once; transport/pre-success failure preserves and unlocks the identical draft.
11. Replace the API/E2E-owned `RunConfigPanel` fake `createRunFromTemplate` seam with current real Pinia/store-boundary coverage; rerun the real Team catalog/detail Run -> Run Team path for each supported runtime and confirm no provisional context identity exists.
12. Replace the same dirty fixture's fabricated `activeTeamContext.config` with an exact `{topology, executions}` context; prove selected-Team Edit config renders the identical immutable topology configuration as read-only and never mutates or copies it.
13. Correct the lifecycle-masking task-Team fixture so the parent retains persistent topology while the child owns fresh materialized run IDs; prove first-level and nested same-task-Team request/reply for all supported runtimes, exact public records, foreign/reordered/truncated/wrong-parent/wrong-Team rejection, and zero persistent fallback.
14. Currentize/adjudicate the separate incomplete-status-identity expectation without weakening SR-018, retain the shared egress cadence selection, and rerun real standalone first-send/live/restore for AutoByteus, Codex, and Claude with exact persisted/live content correlation.
15. Add durable actual-service-seam coverage for exact Apollo Team communication message/address/reference projection, including wrong/missing discriminator or extra-field all-or-nothing rejection; then rerun paired-mobile existing-Team -> focused member -> Activity -> Messages -> structured reference open/close for persistent and nonempty task-Team scopes.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E remains paused until focused cumulative IR-038 source re-review passes. The current reviewed 92-path durable package and API-REV-031/API-REV-032 `Pass / 98%` evidence predate CR-F-040/IR-038 and were preserved without implementation edits or staging. After source Pass, API/E2E must refresh its investigation and rerun pending-edit/selection/duplicate/success/failure behavior across desktop, mobile, and first-send plus the proportional safe-target matrix. Any repository-resident durable coverage add/update/remove must return through code review before delivery resumes.
