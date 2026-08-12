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
- Current implementation revision ID: `IR-037`
- Related solution revision IDs: cumulative `SR-001`–`SR-018`; current `SR-018`
- Related architecture-review revision IDs: current `ARCH-REV-011` Pass; no requirement or design reroute applies
- Related code-review revision IDs: `CRR-066` triggering API/E2E failure-origin Fail — implementation Local Fix; `CRR-065` historical focused source-readiness Pass, `9.4/10` (`94.3/100`), superseded while `CR-F-039` is open
- Related API/E2E revision IDs: `API-REV-030` is paused at its incomplete `93%` checkpoint; the real paired-mobile communication/reference failure is origin evidence, not post-fix acceptance evidence
- Related delivery revision IDs: `DR-005` and cumulative delivery blocker state
- Triggering finding: `CR-F-039` / `API-F-022` / `API-MOBILE-REFERENCE-030-001`; `CR-F-038` / `API-F-021` is resolved downstream and `CR-F-028` through `CR-F-037` remain resolved
- Production source commit: `c13eb75b34e9bee60dfa556c067572f8715c6e00` (`fix(web): project team communication GraphQL DTOs`), on top of IR-036 docs HEAD `67551df6b`

IR-037 corrects the Apollo Team communication hydration loss exposed by CRR-066. One hydration-owned projector now consumes the generated `GetTeamCommunicationMessagesQuery` transport type, validates exact message/address/reference shapes and expected optional Apollo discriminators, and explicitly constructs transport-free `TeamCommunicationMessage` values before the unchanged strict communication store admits them. One invalid row rejects the complete collection; no generic metadata stripping, relaxed domain parser, route/path/name fallback, compatibility identity, or second communication owner was added.

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
| `BEH-016`, `R-039`, `R-051`, `R-052`, `AC-036`, `AC-042`, `AC-047`, `DS-015A`, Team launch/configuration | Keep one immutable Team launch draft, promote it only through one canonical server-success boundary, and query selected-run configuration from immutable topology. | `TeamLaunchDraft.ts`, `teamRunConfigStore.ts`, `agentTeamRunStore.ts`, `TeamTopologySnapshot.getConfigurationView()`, `TeamRunConfigForm.vue`, `RunConfigPanel.vue`, and mobile launch/setup composables. | Reactive DTO ingress, typed edits, and canonical launch promotion remain exact. Selected-run configuration is now read-only topology state; `AgentTeamContext` remains exactly `{topology, executions}`. |
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
- Frontend task admission/commit boundary: `autobyteus-web/services/runHydration/taskDelegationGraphqlDtoProjection.ts`, `taskDelegationHydrationService.ts`, `teamRunContextHydrationService.ts`, and `stores/taskDelegationStore.ts`
- Frontend stream/draft/hydration/open/history/navigation/mobile/presentation consumers: `autobyteus-web/services/agentStreaming/`, `stores/`, `components/`, `composables/`, `types/`, and `utils/`

## Important Assumptions

- Current framework-owned released TeamRun/history/communication/task/token/external data remains supported migration input; application predecessor database state is explicitly unsupported discard/rebuild input.
- `TeamExecutionAddress` remains the only concrete Team execution locator. Persistent and direct task-Agent binding identity derives from it; a task-Team Agent retains its genuine allocated AgentRun ID once because that ID is not encoded by the address.
- Transport subscribers are observation boundaries; they do not own domain mutation or compatibility recovery.
- The protected API/E2E dirty tests/artifacts describe an incomplete pre-SR-018 checkpoint and were not used as current acceptance proof.

## Known Risks

- The cumulative SR-018 source remains broad. IR-037 is a bounded three-file Team communication hydration correction, but the next review still decides source readiness against the cumulative contract.
- API/E2E must resume its incomplete safe live matrix after source Pass. Implementation did not edit or stage its visible `2 added / 83 updated / 6 removed` 91-path durable package, including the dirty `MobileTeamMessages.spec.ts` and `teamCommunicationStore.spec.ts`.
- The local actual-service-seam probe was deleted after use; durable GraphQL DTO projection coverage and real paired-mobile message/reference proof remain API/E2E-owned.
- `pnpm exec nuxi typecheck` is blocked by the current frontend toolchain because its downloaded `vue-tsc` tries to import TypeScript's non-exported `./lib/tsc` subpath. The production Nuxt build passes, but no repository-wide frontend typecheck Pass is claimed.
- Fresh paired-mobile persisted communication/reference rendering, close-back identity, and the remaining cumulative safe-target matrix remain downstream work for SR-018/IR-037.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: cumulative `Comprehensive Refactor`; current round `Local Fix`
- Reviewed root-cause classification: uncorrelated Team event/wire shapes, mixed mutable frontend topology/execution ownership, stale cleanup authorities, and incomplete status-producer closure
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`; IR-037 adds the reviewed singular hydration-owned GraphQL DTO projector and leaves exact domain admission with the existing Team communication store
- If challenged, routed as `Design Impact`: `N/A` after `ARCH-REV-011` Pass
- Evidence / notes: the implementation introduces the reviewed singular boundaries rather than retaining wrappers or compatibility selectors. `TeamExecutionState` and the mixed manager remain below the 500-effective-line guard; changed deltas over 220 lines were assessed as cohesive boundary replacement, generated declarations, or net deletion/contraction.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrail: `Yes`; all three IR-037 production files remain below `500` effective lines (`100`, `45`, and `241`), and the cohesive source delta is below the `220` split signal
- Notes: the historical Team identity scan still returns exactly the six approved migration-local production paths. Current web production has no legacy route/path identity, raw execution/topology maps, synthetic task instances, approval token, duplicate member-input receiver, application predecessor migration owner, `ensureTaskTeamAgent`, `removeExecutionSubtree`, permissive task-record normalizer, or legacy task hydration wrapper.

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

- Deleted-after-use actual hydration-service seam proof — Pass `2/2`: exact Apollo message/address/reference DTOs hydrate two canonical messages covering persistent and nonempty ordered task-Team scopes; expected discriminators are removed from the domain values; a wrong discriminator plus unsupported reference field rejects the complete collection before partial store admission (`/tmp/ir037-team-communication-service-seam.log`). The temporary test was removed.
- Retained API/E2E-owned communication store/mobile selection — Pass `2/2` files and `9/9` cases unchanged (`/tmp/ir037-retained-team-communication-tests.log`). These dirty durable tests were executed only as regression evidence and were neither edited, staged, nor claimed by implementation.
- `autobyteus-web`: `pnpm build` — Pass: Nuxt production client/server build and `15`-route prerender completed (`/tmp/ir037-web-build.log`).
- `autobyteus-web`: `pnpm exec nuxi typecheck` — toolchain Fail before project diagnostics because downloaded `vue-tsc` imports the non-exported TypeScript `./lib/tsc` package subpath (`/tmp/ir037-web-nuxi-typecheck.log`). A supplemental narrow `tsc` attempt was also blocked by missing direct declarations for codegen-emitted Apollo imports (`/tmp/ir037-web-targeted-tsc.log`). No typecheck Pass is claimed; the production build and real Vitest transformation pass.
- Static/source audits — Pass: source commit contains exactly the new projector, hydration-service wiring, and false manual type removal; `GetTeamCommunicationMessagesQueryData` has zero references; strict `parseTeamExecutionAddress` remains unchanged; no route/path/name fallback or generic metadata stripping was introduced; all three files are below the source-size guardrail; `git diff --check` passes; temporary proof is absent; protected API/E2E tests remain unstaged.
- The implementation-engineer workflow and shared design principles were reread for this round (`/tmp/ir037-implementation-skill-read.log`, `/tmp/ir037-design-principles-read.log`).

## Frontend Rendered-Result Check

- IR-037 changes frontend hydration data, not markup, styling, copy, or layout. The actual service-seam probe verifies that the canonical messages and structured reference required by the mobile presentation reach the one communication store for persistent and nonempty task-Team scopes; the retained mobile/store selection remains `9/9` Pass and the production Nuxt build/prerender passes.
- No separate browser or protected user-held stack was started or touched. Fresh checked-disposable paired-mobile rendering, reference open/close, and visual continuity remain downstream-owned after source Pass.

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
10. Prove existing-Team desktop, mobile, and first-send launch create one immutable draft, accept automatic reactive default-workspace metadata without clone failure, apply runtime/model/model-config/auto-execute/member-override edits through typed replacement, and route through one canonical owner that registers/selects only the real server TeamRun, transfers focus/pending input once, removes the draft only after success, and preserves it on failure.
11. Replace the API/E2E-owned `RunConfigPanel` fake `createRunFromTemplate` seam with current real Pinia/store-boundary coverage; rerun the real Team catalog/detail Run -> Run Team path for each supported runtime and confirm no provisional context identity exists.
12. Replace the same dirty fixture's fabricated `activeTeamContext.config` with an exact `{topology, executions}` context; prove selected-Team Edit config renders the identical immutable topology configuration as read-only and never mutates or copies it.
13. Correct the lifecycle-masking task-Team fixture so the parent retains persistent topology while the child owns fresh materialized run IDs; prove first-level and nested same-task-Team request/reply for all supported runtimes, exact public records, foreign/reordered/truncated/wrong-parent/wrong-Team rejection, and zero persistent fallback.
14. Currentize/adjudicate the separate incomplete-status-identity expectation without weakening SR-018, retain the shared egress cadence selection, and rerun real standalone first-send/live/restore for AutoByteus, Codex, and Claude with exact persisted/live content correlation.
15. Add durable actual-service-seam coverage for exact Apollo Team communication message/address/reference projection, including wrong/missing discriminator or extra-field all-or-nothing rejection; then rerun paired-mobile existing-Team -> focused member -> Activity -> Messages -> structured reference open/close for persistent and nonempty task-Team scopes.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E remains paused until the focused IR-037 source re-review passes. API-REV-030 remains incomplete at `93%`; its visible `2 added / 83 updated / 6 removed` 91-path durable state is neither edited, staged, nor claimed by implementation. The real paired-mobile `Messages · 0` result is valid origin evidence but does not verify corrected source. After Pass, API/E2E must add/currentize durable service-boundary coverage, rerun the checked-disposable paired-mobile persisted communication/reference journey, and complete the remaining safe-target matrix. Any repository-resident durable coverage add/update/remove must return through proportional code review before delivery.
