# Code Review

## Round 1

- Scope reviewed:
  - server setup and persistence contract updates for definition-bound TEAM bindings
  - server lazy team-launch and continuation path updates
  - web settings flow, validation, verification, docs, and focused generated GraphQL contract sync
- Decision: `Pass`

## Findings

- No blocking findings after focused review.

## Round 2

- Scope reviewed:
  - SQL migration repair for `channel_bindings.team_definition_id`
  - expanded server ingress integration tests for lazy TEAM launch, cached-run reuse, and stale-run replacement
  - expanded launcher unit tests for TEAM cached-run reuse and lazy creation branches
- Decision: `Pass`

## Round 3

- Scope reviewed:
  - member-runtime TEAM dispatch path from `DefaultChannelRuntimeFacade` through `TeamRunContinuationService` and `TeamMemberRuntimeOrchestrator`
  - external reply bridging expectations for Codex and Claude coordinator turns
- Decision: `Fail`

## Round 3 Findings

- Blocking: member-runtime TEAM dispatch accepted the coordinator turn but never bound that accepted member turn into the external reply bridge, so `codex_app_server` and `claude_agent_sdk` team replies were not yet reliably routed back to messaging providers.

## Round 4

- Scope reviewed:
  - accepted member-turn metadata propagation from the TEAM continuation path
  - external reply-bridge binding in the TEAM dispatch path
  - regression coverage at unit and REST-ingress integration levels
  - callback delivery test stability under the full suite
- Decision: `Pass`

## Review Checks

- Review slices:
  - server setup and persistence slice: `11 files`, `454` changed lines, `<=500` per-slice review limit satisfied
  - server runtime launch and continuation slice: `5 files`, `232` changed lines, `<=500` per-slice review limit satisfied
  - web setup and verification slice: `10 files`, `477` changed lines, `<=500` per-slice review limit satisfied
  - server SQL migration plus ingress integration slice: `2 files`, `353` changed lines, `<=500` per-slice review limit satisfied
  - server launcher TEAM verification slice: `1 file`, `192` changed lines, `<=500` per-slice review limit satisfied
  - server member-runtime TEAM reply-bridge fix slice: `4 files`, `111` changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - server setup and persistence slice exceeded `220` changed lines and received explicit layering/decoupling review
  - server runtime launch and continuation slice exceeded `220` changed lines and received explicit runtime-boundary review
  - web setup and verification slice exceeded `220` changed lines and received explicit setup-flow/state-boundary review
  - server SQL migration plus ingress integration slice exceeded `220` changed lines and received explicit persistence-versus-runtime-boundary review
- Layering:
  - setup-side TEAM option discovery stays in the external-channel setup/service layer
  - reusable team launch orchestration lives in `agent-team-execution/services`
  - runtime TEAM dispatch goes through `ChannelBindingRuntimeLauncher` plus `TeamRunContinuationService` instead of coupling setup flow to run-history storage details
  - SQL migration repair stays in Prisma migrations instead of being hidden in test bootstrap or provider-side fallback logic
  - external reply wiring remains in the external-channel runtime facade rather than leaking messaging concerns deeper into team orchestration
- Decoupling:
  - binding persistence owns cached `teamRunId` reset semantics
  - external callback metadata remains preserved at the continuation boundary rather than leaking messaging concerns into team relay internals
  - ingress integration tests compose the existing runtime facade and launcher instead of duplicating launch logic in the tests themselves
  - the TEAM continuation path now returns accepted member-turn metadata instead of importing external-channel dependencies directly
- Module placement:
  - new TEAM option discovery logic lives under `external-channel/services`
  - reusable lazy team launch logic lives under `agent-team-execution/services`
  - continuation behavior remains in run-history/runtime coordination
  - web state changes remain in messaging setup stores/composables/components
  - schema repair is expressed as a dedicated Prisma migration under `autobyteus-server-ts/prisma/migrations`
  - reply-bridge binding stays under `external-channel/runtime/default-channel-runtime-facade.ts`
- Backward compatibility:
  - AGENT binding flow remains intact
  - TEAM support now matches the agent-definition-style setup experience while preserving coordinator-only outward replies
  - SQL-backed ingress for pre-existing AGENT bindings still passes after the migration addition
  - member-runtime TEAM replies now work without changing the coordinator-only outward model
- Legacy cleanup:
  - removed setup-side dependence on pre-existing TEAM runs
  - removed direct active-team-manager dependency from the external runtime facade
  - updated checked-in web docs and generated GraphQL artifacts to the new TEAM contract
  - avoided adding any test-only schema hacks or provider fallbacks
  - avoided pushing external-channel callback logic into low-level relay services

## Residual Risk

- Live Telegram/provider E2E was not executed.
- `autobyteus-web/generated/graphql.ts` was manually updated because live-schema codegen was unavailable in the current environment.
- `pnpm -C autobyteus-server-ts run typecheck` still fails on an existing repository-wide `TS6059` `rootDir`/`tests` configuration issue unrelated to this ticket.

## Round 5

- Scope reviewed:
  - untouched-member projection hardening in `MemoryFileStore`, `TeamMemberMemoryProjectionReader`, and `CodexThreadHistoryReader`
  - focused unit regressions for optional missing-file suppression and Codex unmaterialized-thread handling
  - focused live Codex team E2E for coordinator projection plus untouched secondary-member empty projection
- Decision: `Pass`

## Round 5 Findings

- No blocking findings.

## Round 6

- Scope reviewed:
  - TEAM live external-user-message publication from `DefaultChannelRuntimeFacade` through the new team-scoped broadcaster/publisher path
  - TEAM websocket registration and forwarding in `AgentTeamStreamHandler`
  - resolved target-member propagation from `TeamRunContinuationService` / `TeamMemberRuntimeOrchestrator`
  - web TEAM stream handling for `EXTERNAL_USER_MESSAGE`
  - focused websocket/unit regressions for the reused TEAM-run bug reported during Telegram verification
- Decision: `Pass`

## Round 6 Findings

- No blocking findings.

## Round 6 Review Checks

- Review slices:
  - server TEAM live-stream fix slice: `7 files`, `~170` effective changed lines plus `3` new helper files, `<=500` per-slice review limit satisfied
  - web TEAM stream handling slice: `3 files`, `~70` effective changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered for the web slice
  - the server slice remained below the hard per-slice review cap and received explicit streaming-boundary/layering review
- Layering:
  - external-channel dispatch still decides when to publish live inbound messages
  - team-websocket fanout stays inside `services/agent-streaming`
  - target-member resolution remains in run-continuation/orchestration instead of leaking UI concerns into provider ingress
- Decoupling:
  - reused a shared external-user-message server-message builder instead of duplicating payload-shaping logic
  - kept agent-run and team-run live broadcasters separate to avoid cross-run/cross-mode coupling
  - web handling reuses the existing external-user-message handler rather than introducing a team-only rendering path
- Module placement:
  - new team broadcaster/publisher live under `autobyteus-server-ts/src/services/agent-streaming`
  - TEAM continuation metadata stays in run-history / team-orchestration services
  - the web event-consumption change stays in `TeamStreamingService` and the existing protocol typings

## Round 7

- Scope reviewed:
  - TEAM history-selection behavior in `runHistorySelectionActions.ts`
  - focused web regression coverage in `runHistoryStore.spec.ts`
  - interaction with the pre-existing TEAM streaming path to ensure context refresh does not break websocket-backed team state
- Decision: `Pass`

## Round 7 Findings

- No blocking findings.

## Round 7 Review Checks

- Review slices:
  - web TEAM history-selection refresh slice: `2 files`, `196` changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered
- Layering:
  - history reopening remains in the run-history selection layer
  - projection fetching stays in the existing history-open flow instead of leaking into presentation components
- Decoupling:
  - the fix reuses `openTeamMemberRun(...)` rather than introducing a second refresh path
  - existing live team context objects are updated in place so the store boundary remains stable for the streaming service
- Module placement:
  - the production change stays in `autobyteus-web/stores/runHistorySelectionActions.ts`
  - the regression stays in `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`

## Round 8

- Scope reviewed:
  - current-process bot-owned cached-run guard in `channel-binding-runtime-launcher.ts`
  - focused launcher regressions for `AGENT` and `TEAM` ownership semantics after restart
  - SQL-backed Telegram ingress regression for the history-reopened TEAM hijack case
  - restart-time reconnect retry persistence in `WebSocketClient`
- Decision: `Pass`

## Round 8 Findings

- No blocking findings.

## Round 8 Review Checks

- Review slices:
  - server binding-lifecycle guard slice: `3 files`, `~150` effective changed lines, `<=500` per-slice review limit satisfied
  - web reconnect transport slice: `2 files`, `~60` effective changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered
- Layering:
  - messaging-binding lifecycle ownership stays inside the external-channel runtime launcher instead of leaking into team history or UI layers
  - restart reconnect retry behavior stays isolated in the shared websocket transport rather than duplicating reconnect logic per stream type
- Decoupling:
  - cached binding ownership is tracked in-memory per launcher instance, which cleanly resets on backend restart without adding persistence coupling
  - the ingress regression composes the real launcher plus runtime facade instead of reimplementing the ownership rule in test-only helpers
- Module placement:
  - bot-owned cached-run reuse policy remains in `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts`
  - the reconnect guard remains in `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts`

## Round 9

- Scope reviewed:
  - the new single-flow Telegram TEAM ingress regression in `channel-ingress.integration.test.ts`
- Decision: `Pass`

## Round 9 Findings

- No blocking findings.

## Round 10

- Scope reviewed:
  - merge-regression fix in `file-channel-binding-provider.ts`
  - strengthened TEAM callback integration regression in `channel-ingress.integration.test.ts`
  - focused callback/runtime rerun evidence on the latest merged branch
- Decision: `Pass`

## Round 10 Findings

- No blocking findings.

## Round 10 Review Checks

## Round 11

- Scope reviewed:
  - live team member status projection in `runHistoryTeamHelpers.ts`
  - focused web regression coverage in `runHistoryStore.spec.ts`
  - compatibility with the active-runtime sync and workspace team-tree rendering path
- Decision: `Pass`

## Round 11 Findings

- No blocking findings.

## Round 11 Review Checks

- Review slices:
  - web team member-status projection slice: `2 files`, `~40` effective changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered
- Layering:
  - team liveness ownership remains in the team context and active-runtime sync path
  - visible member-row status now comes from live member runtime state where that state already exists
- Decoupling:
  - avoided pushing team-level status semantics deeper into member rows
  - kept the change local to the run-history projection helper plus regression coverage
- Module placement:
  - production change stays in `autobyteus-web/stores/runHistoryTeamHelpers.ts`
  - regression stays in `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`

## Round 14

- Scope reviewed:
  - frontend segment identity handling in `segmentHandler.ts`
  - tool lifecycle fallback segment creation in `toolLifecycleHandler.ts`
  - adjacent tests that still rely on hidden `_segmentId` fields
- Decision: `Pass`

## Round 14 Findings

- No blocking findings.

## Round 15

- Scope reviewed:
  - v7 frontend live-hydration separation in `activeRuntimeSyncStore`, `runContextHydrationService`, `teamRunContextHydrationService`, and `runtimeStatusNormalization`
  - slimmed run-open coordinators after extraction of hydration responsibilities
  - supporting backend status and ownership slice in `active-runtime-snapshot-service`, `run-ownership-resolution-service`, and `team-runtime-status-snapshot-service`
  - full current-tree frontend verification evidence after the v7 refactor
- Decision: `Pass`

## Round 15 Findings

- No blocking findings.

## Round 15 Review Checks

- Review slices:
  - frontend active-runtime sync and hydration slice: `6 files`, `~506` changed lines including two new hydration services, reviewed as one architecture slice because the files implement one boundary split
  - frontend run-open coordinator cleanup slice: `2 files`, `423` changed lines, `<=500` per-slice review limit satisfied
  - backend status/ownership support slice: `7 files`, `~446` changed lines including two new service files, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - `runOpenCoordinator.ts` exceeded `220` changed lines and received explicit layering review because it now removes hydration logic rather than accumulating more orchestration
  - the frontend hydration slice exceeded `220` changed lines and received explicit runtime-agnostic boundary review
  - the backend status/ownership slice exceeded `220` changed lines and received explicit runtime-normalization/ownership review
- Layering:
  - history-open coordinators now own selection/open behavior only; hydration moved into dedicated services
  - active-runtime sync consumes dedicated hydration services instead of re-entering open coordinators
  - backend active-runtime snapshot remains the runtime-aware source of liveness while the frontend stays runtime-agnostic
- Decoupling:
  - history polling no longer drives live-recovery through the open coordinators
  - live hydration and history opening now have separate entry points
  - team-member ownership lookup is resolved behind a dedicated backend service instead of leaking standalone-manifest assumptions into the frontend
- Module placement:
  - hydration services live under `autobyteus-web/services/runHydration`
  - active-runtime sync ownership remains in `autobyteus-web/stores/activeRuntimeSyncStore.ts`
  - backend ownership and status normalization stay under run-history/graphql-streaming services instead of moving into web-facing contracts
- Review note:
  - one real issue was found during the pass: `runOpenCoordinator.ts` had an incorrect type-only import of `RunResumeConfigPayload` from the hydration service instead of the shared history types module
  - that import was corrected immediately and the directly affected web slice was rerun before closing the gate
- Non-blocking cleanup opportunity: the composite segment identity rule now exists, but only as hidden per-segment fields (`_segmentId`, `_segmentType`, `_segmentLookupKey`) and duplicated helper logic inside `segmentHandler.ts`. This is a reasonable target for a small typed helper refactor before handoff because it narrows the regression surface without changing the streaming contract.

## Round 15

- Scope reviewed:
  - new typed frontend `StreamSegmentIdentity` helper
  - `segmentHandler.ts` and `toolLifecycleHandler.ts` after the helper extraction
  - focused web streaming reruns covering segment handling plus agent/team streaming services
- Decision: `Pass`

## Round 15 Findings

- No blocking findings.
- The cleanup improves local type safety and removes duplicated hidden-field writes without widening the server/web streaming contract.

## Round 11

- Scope reviewed:
  - subscribed-live TEAM selection behavior in `runHistorySelectionActions.ts`
  - inactive TEAM reopen/refresh semantics in `teamRunOpenCoordinator.ts`
  - focused store and workspace-tree regressions covering live TEAM reselection parity versus persisted history reopen
- Decision: `Pass`

## Round 11 Findings

- No blocking findings.

## Round 11 Review Checks

- Review slices:
  - web TEAM live-selection parity slice: `3 files`, `~80` effective changed lines, `<=500` per-slice review limit satisfied
  - focused regression coverage slice: `2 files`, `~45` effective changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered
- Layering:
  - live TEAM reselection stays in the run-history selection layer
  - persisted TEAM reopen semantics remain in the dedicated team-open coordinator
- Decoupling:
  - the fix restores the existing subscribed-context fast path instead of introducing a second live-team state source
  - inactive TEAM rehydration still flows through the existing projection coordinator rather than duplicating projection logic in the tree component
- Module placement:
  - production changes remain in `autobyteus-web/stores/runHistorySelectionActions.ts` and `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - regression coverage remains in the existing run-history and workspace-tree test suites

- Review slices:
  - server file-backed binding provider merge-fix slice: `1 file`, `1` effective changed line, `<=500` per-slice review limit satisfied
  - server TEAM callback verification slice: `1 file`, `~40` effective changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered
- Layering:
  - the provider merge fix remains inside the file-backed persistence layer
  - the callback verification remains in the REST ingress integration suite instead of leaking test-only timing behavior into production code
- Decoupling:
  - no production coupling was added; the regression now waits on observable callback effects rather than peeking into unrelated runtime internals
- Module placement:
  - the persistence fix stays in `autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts`
  - the stronger callback regression stays in `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`

## Round 11

- Scope reviewed:
  - the new AGENT fake-Telegram callback regression in `channel-ingress.integration.test.ts`
  - focused rerun evidence proving AGENT and TEAM callback API symmetry on the server side
- Decision: `Pass`

## Round 11 Findings

- No blocking findings.

## Round 11 Review Checks

- Review slices:
  - AGENT callback verification slice: `1` file, `~150` effective changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered
- Layering:
  - the new verification remains in the ingress integration suite and uses the existing runtime facade / reply callback layers
- Decoupling:
  - no production-path coupling changed; the slice adds only a test harness mirroring the existing TEAM callback regression
- Module placement:
  - the AGENT callback regression remains in `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`

## Round 12

- Scope reviewed:
  - remaining production delta across the external-channel setup GraphQL contract, binding persistence providers, shared team-run launch service, runtime launcher/facade ownership and callback flow, and the web binding setup plus history/stream transport coordination paths
  - repo-level diff scan against `origin/personal` to confirm the final broad review still matched the actual worktree delta rather than only the earlier focused slices
- Decision: `Pass`

## Round 12 Findings

- No blocking findings after the broader deep review pass.

## Round 12 Review Checks

- Review slices:
  - server setup GraphQL + team-definition option slice: `5` files, `323` effective changed/new lines, `<=500` per-slice review limit satisfied
  - server binding persistence + domain-contract slice: `4` tracked files, `283` changed lines, `<=500` per-slice review limit satisfied
  - server shared team-run launch service slice A (`team-run-launch-service.ts` lines `1-260`): `260` effective lines, `<=500` per-slice review limit satisfied
  - server shared team-run launch service slice B (`team-run-launch-service.ts` lines `261-504`) plus shared external-user-message helper files: `418` effective lines across the reviewed files, `<=500` per-slice review limit satisfied
  - server runtime dispatch / ownership / callback core slice: `7` tracked files plus `2` small team-runtime support files, `305` changed lines, `<=500` per-slice review limit satisfied
  - server live-message broadcast / websocket registration slice: `5` files, `245` effective changed/new lines, `<=500` per-slice review limit satisfied
  - web setup + reopen + stream transport coordination slice: `10` files, `484` changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - triggered for the setup GraphQL slice, binding persistence slice, team-run launch slices, runtime dispatch slice, and web coordination slice; each received explicit layering, ownership-boundary, and module-placement review
- Layering:
  - the setup contract remains in GraphQL resolver / mapper / types plus the external-channel option service, not in runtime dispatch code
  - binding persistence continues to own cached `agentRunId` and `teamRunId` mutation semantics instead of leaking them into ingress handlers
  - shared team-run creation now lives in a dedicated launch service reused by both GraphQL team creation and messaging lazy launch, which reduces duplication instead of introducing a new cross-layer shortcut
  - runtime dispatch keeps provider-ingress concerns in the external-channel facade while continuation, accepted-turn capture, and live-message broadcast stay in their owning runtime / streaming services
  - web setup state remains in stores and composables, while streaming transport and history reopening remain in their existing service/store layers
- Decoupling:
  - current-process binding ownership is tracked in an in-memory registry that cleanly resets on restart without adding new persistence coupling
  - coordinator-only callback routing still binds through the accepted-turn bridge rather than pushing provider callback knowledge down into team relay internals
  - the shared external-user-message server-message builder removes duplicated payload shaping between agent and team live-message publishers
  - the web history reopen fix continues to reuse the existing team-open flow instead of adding a second projection-fetch path
- Module placement:
  - new team-definition selection logic stays under `external-channel/services`
  - shared team-run launch logic stays under `agent-team-execution/services`
  - live team broadcast helpers stay under `services/agent-streaming`
  - web TEAM binding and verification behavior stays under the existing messaging setup store / composable / component structure
- Backward compatibility:
  - AGENT bindings still keep their original launch-preset flow and now have exact callback-path parity coverage with TEAM bindings
  - TEAM bindings preserve the coordinator-only outward response model
  - restart behavior now intentionally matches the clarified AGENT parity rule: cached runs are reused only when the current process still owns the live bound run
- Residual risk:
  - real Telegram/provider smoke testing is still outside the local test harness
  - `autobyteus-web/generated/graphql.ts` remains manually synchronized because live-schema codegen was unavailable in this environment

## Round 13

- Scope reviewed:
  - reasoning segment identity handling in `method-runtime-event-segment-helper.ts`
  - reasoning-burst boundary resets in `method-runtime-event-adapter.ts`
  - focused server mapper and web segment regressions for post-tool reasoning behavior
- Decision: `Pass`

## Round 13 Findings

- No blocking findings.

## Round 13 Review Checks

- Review slices:
  - server reasoning-burst identity slice: `3` files, `~77` effective changed lines, `<=500` per-slice review limit satisfied
  - web segment-identity plus regression coverage slice: `2` files, `~45` effective changed lines, `<=500` per-slice review limit satisfied
- `>220` changed-line delta gate:
  - not triggered
- Layering:
  - reasoning-burst identity remains owned by the runtime event adapter/helper boundary rather than leaking UI-specific segmentation rules into the frontend
  - the frontend keeps its identity logic inside the streaming segment handler instead of spreading segment-key rules into presentation components
- Decoupling:
  - the helper now separates stable reasoning item identity from the turn-level fallback cache instead of conflating them
  - boundary resets are expressed at runtime method transitions rather than via cross-layer state hacks
- Module placement:
  - identity logic stays in `autobyteus-server-ts/src/services/agent-streaming`
  - frontend composite segment lookup stays in `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
  - render regression coverage stays in the existing web segment-handler spec

## Round 14

- Scope reviewed:
  - selective coordinator-callback propagation across teammate `send_message_to` hops in the runtime relay/orchestrator and external-turn bridge
  - runtime-adapter turn-id preservation for Codex and Claude member-runtime relays
  - focused relay/bridge/adapter unit coverage plus the fake-Telegram follow-up callback integration regression
- Decision: `Pass`

## Round 14 Findings

- No blocking findings.

## Round 14 Review Checks

- Review slices:
  - server relay/orchestrator/bridge production slice: `11` files, `265` effective changed lines, `<=500` per-slice review limit satisfied
  - server focused unit coverage slice: `4` files, `121` effective changed lines, `<=500` per-slice review limit satisfied
  - server fake-Telegram follow-up callback integration slice: `1` file, `623` effective changed lines reviewed under the explicit `>220` delta gate
- `>220` changed-line delta gate:
  - triggered by the callback-harness expansion inside `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`; the large test slice received explicit layering, coupling, and placement review
- Layering:
  - sender-turn capture stays in runtime tool/router adapters
  - selective callback propagation stays in the team relay/orchestrator boundary
  - receipt rebinding and provider callback publication remain centralized in the external-turn bridge and reply-callback services
- Decoupling:
  - the fix propagates callback linkage only when the sender turn is already externally bound, so UI-only inter-agent traffic does not leak into Telegram
  - no provider-specific callback logic was pushed down into Codex/Claude tool handlers beyond preserving accepted recipient turn ids
  - the integration harness exercises the real outbox/dispatch path instead of asserting on hidden bridge internals
- Module placement:
  - team relay ownership stays in `autobyteus-server-ts/src/agent-team-execution/services`
  - external callback rebinding remains in `autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts`
  - runtime-adapter contract changes stay under `autobyteus-server-ts/src/runtime-execution`
  - end-to-end callback proof remains in the existing REST ingress integration suite

## Round 16

- Scope reviewed:
  - new active-runtime synchronization store in `autobyteus-web/stores/activeRuntimeSyncStore.ts`
  - removal of history-driven live recovery from `autobyteus-web/stores/runHistoryLoadActions.ts`
  - active/inactive reconciliation in `autobyteus-web/stores/runHistoryStore.ts`
  - explicit agent/team disconnect handling in `autobyteus-web/stores/agentRunStore.ts` and `autobyteus-web/stores/agentTeamRunStore.ts`
  - workspace polling split in `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - focused verification around active-runtime sync, store behavior, and shared streaming callers
- Decision: `Pass`

## Round 16 Findings

- No blocking findings.
- Residual risk: the v5 slice still depends on the existing backend `agentRuns()` and `agentTeamRuns()` queries as the active-runtime source, so the liveness overlay remains poll-based rather than push-based. That is acceptable for now and consistent with the revised requirements.

## Round 17

- Scope reviewed:
  - active-runtime synchronization and status ownership in `autobyteus-web/stores/activeRuntimeSyncStore.ts`
  - team history-open orchestration in `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - standalone/team history-load separation in `autobyteus-web/stores/runHistoryLoadActions.ts`
  - runtime-aware ownership lookup on the backend in `autobyteus-server-ts/src/run-history/services/run-ownership-resolution-service.ts`
  - active-runtime snapshot filtering in `autobyteus-server-ts/src/api/graphql/services/active-runtime-snapshot-service.ts`
  - team-member manifest lookup in `autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts`
  - the new active-runtime sync tests plus the latest Claude/Codex/backend/frontend verification reruns
- Decision: `Fail`

## Round 17 Findings

- `P1` Active-runtime sync discards backend `currentStatus` and replaces it with frontend heuristics, so already-live agent and team contexts can still show `Uninitialized`/`Offline` even though the backend snapshot already knows the real state. `GetActiveRuntimeSnapshot` fetches `currentStatus`, but `activeRuntimeSyncStore` reduces the snapshot to id sets and then forces active contexts back to `Uninitialized`; the new tests even assert that behavior. This keeps status ownership split across the backend snapshot, websocket events, and frontend fallbacks instead of establishing one authoritative source. A live run that does not emit another status delta immediately after attach can therefore remain visibly wrong. Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`, `autobyteus-web/stores/__tests__/activeRuntimeSyncStore.spec.ts`.
- `P2` Active-runtime sync still recovers missing active runs by calling the history-open coordinators, so the new active-runtime registry is not actually the sole liveness/subscription owner. `activeRuntimeSyncStore` invokes `openRunWithCoordinator()` / `openTeamRunWithCoordinator()`, and those coordinators still perform history resume queries, projection hydration, context mutation, selection-oriented defaults, and websocket attach. That means the “live runtime recovery” path still depends on the “open historical run” path, which is exactly the layering problem the v5/v6 redesign was meant to remove. Evidence: `autobyteus-web/stores/activeRuntimeSyncStore.ts`, `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`, `autobyteus-web/stores/runHistoryLoadActions.ts`.
- `P2` Team-member ownership lookup currently falls back to a full filesystem scan of all team directories per member run id, and the active-runtime snapshot path can trigger that lookup for every active agent on each poll. This keeps the correctness fix local, but it pushes an O(active-runs × team-directories) disk walk into the hot liveness path and makes the new registry more expensive exactly where it should be cheap and authoritative. The binding-registry and manifest checks are good fallback layers, but the current manifest scan should be indexed or cached before this architecture is considered clean. Evidence: `autobyteus-server-ts/src/run-history/store/team-member-run-manifest-store.ts`, `autobyteus-server-ts/src/api/graphql/services/active-runtime-snapshot-service.ts`.

## Round 17 Review Checks

- Review slices:
  - frontend active-runtime sync/status slice: `1` new file plus `2` integration points, `~240` effective changed lines, `<=500` per-slice review limit satisfied
  - frontend history-open/team-open orchestration slice: `2` files, `~120` effective changed lines, `<=500` per-slice review limit satisfied
  - backend runtime-aware ownership/status slice: `4` production files plus `4` focused unit-test files, `~260` effective changed lines, `<=500` per-slice review limit satisfied
  - broader verification slice: backend Codex live E2E, backend Claude live E2E, frontend full Vitest rerun, and backend compile
- `>220` changed-line delta gate:
  - triggered for the frontend active-runtime sync/status slice and the backend ownership/status slice; both received explicit layering, ownership-boundary, and performance review
- Layering:
  - improved: history polling no longer directly triggers recovery from `runHistoryLoadActions.ts`
  - still mixed: `activeRuntimeSyncStore` reaches back into the history-open coordinators instead of using a narrower “hydrate live context” path
  - still mixed: frontend status ownership is not fully delegated to the backend active snapshot because the snapshot’s `currentStatus` is discarded
- Decoupling:
  - improved: standalone active-agent snapshots are now runtime-aware and can filter team-member runs
  - still weak: live recovery depends on resume/projection/orchestration code that was originally written for historical open flows
  - still weak: team-member manifest fallback is correct but too expensive for a hot-path active snapshot if the binding registry misses
- Module placement:
  - `run-ownership-resolution-service.ts` is correctly placed under `run-history/services`
  - `activeRuntimeSyncStore.ts` is the right store boundary for liveness sync, but it still owns too much recovery orchestration for the target architecture
- Backward compatibility:
  - the Codex and Claude backend live suites now pass, which is a good sign that the latest slice did not break the runtime adapters
  - the frontend full Vitest suite also passes, but one of the new active-runtime sync assertions codifies the wrong `Uninitialized` fallback behavior, so green tests are not sufficient evidence that status ownership is correct
- Residual risk:
  - frontend `nuxi typecheck` remains red on broad pre-existing baseline issues outside this ticket
  - live runtime/manual UX still has meaningful risk until the status-source and live-hydration layering issues above are addressed
