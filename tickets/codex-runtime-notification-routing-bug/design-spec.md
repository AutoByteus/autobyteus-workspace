# Design Spec

## Current-State Read

The ticket branch is `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis` on branch `codex/mixed-team-manager-simplification-analysis`. The user explicitly confirmed this branch is the base branch for this bug work.

Current Codex execution path for the reported error:

`Codex app-server process -> CodexAppServerClient.onNotification -> CodexClientThreadRouter.handleAppServerNotification -> isAppServerMessageForThread(...) -> no delivery -> emitAmbiguousMessageError(...) -> CodexThread.emitRuntimeError(...) -> CodexThreadEventName.ERROR -> CodexAgentRunBackend -> AgentRunEvent.ERROR -> team chat red error card`

Two current branch changes interact badly:

1. `CodexClientThreadRouter` added `emitAmbiguousMessageError(...)` for any no-delivery app-server notification/request when more than one thread is registered on one client.
2. `CodexAppServerClientManager` was changed from canonical-`cwd` client reuse to `cwd + scopeKey`, and `CodexThreadManager` now passes run/team scope keys into `acquireClient(...)` / `releaseClient(...)`.

The first change misclassifies client-global Codex telemetry as a thread/turn routing failure. The observed methods `account/rateLimits/updated` and `mcpServer/startupStatus/updated` are not thread content and are not expected to carry `threadId`/`turnId`; they must not become runtime errors or chat messages.

The second change violates the prior Codex runtime boundary chosen by earlier work: one Codex app-server client/process per canonical workspace/worktree `cwd`. The ticket's valid need is explicit same-runtime routing/cleanup ownership, but the app-server client/process boundary is the wrong layer for team/run scoping.

Claude audit result: no analogous provider-client boundary regression was found. `ClaudeSdkClient` reuse is unchanged; the Claude cohort registry only records run IDs and has no production consumer. This design removes that empty registry while leaving Claude client/session lifecycle unchanged.

## Intended Change

Keep the fix small and boundary-local:

1. Restore Codex app-server client/process reuse to canonical `cwd` only.
2. Keep Codex active-thread routing inside `CodexClientThreadRouter`; do not add UI-specific workarounds.
3. Add a router-owned classification for known client-global Codex notification methods and skip them before ambiguity diagnostics.
4. Preserve only server-side/non-user-visible diagnostics for route-required messages that lack identity when multiple active threads share the client; do not broadcast them as per-thread runtime errors.
5. Remove empty Codex/Claude cohort abstractions that have no post-fix owner/responsibility.
6. Do not change Claude SDK client lifecycle or session behavior.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + small corrective refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, but only a narrow cleanup/refactor in the Codex runtime boundary.
- Evidence:
  - Screenshots exactly match `emitAmbiguousMessageError(...)` output.
  - Probe reproduces `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` for unscoped `mcpServer/startupStatus/updated` with two active registrations.
  - `CodexAppServerClientManager` now keys clients by `cwd + scopeKey`, while prior Codex runtime design selected canonical `cwd` as the process/client boundary.
  - Claude SDK client manager files have no analogous key/lifecycle change.
- Design response:
  - Add an explicit client-global notification skip invariant in `CodexClientThreadRouter`.
  - Replace router no-delivery `emitRuntimeError(...)` behavior with server-side/non-user-visible diagnostics.
  - Remove Codex client scope keys from `CodexAppServerClientManager`, `CodexThreadManager`, cleanup target, and tests.
  - Treat `CodexClientThreadRouter`'s per-client registration set as the active runtime-thread cohort above the app-server client boundary.
- Refactor rationale:
  - Keeping `scopeKey` as a compatibility option would preserve the wrong lower-level boundary and continue allowing performance-costly one-client-per-run/team behavior.
  - Moving filtering into UI would bypass the authoritative runtime-routing boundary and leave status/error side effects intact.
- Intentional deferrals and residual risk, if any:
  - Claude cohort coordinator cleanup is included because after Codex cleanup it is an empty registry with no production consumer; removing it is no-behavior cleanup and avoids retaining a misleading shared abstraction.
  - If Codex later adds more client-global methods, the explicit allowlist may need extension. Unknown route-required methods should still produce server-side diagnostics when ambiguous, but not user-visible runtime errors by default.

## Terminology

- `Codex app-server client`: the managed process/client connection created by `CodexAppServerClientManager` for one canonical workspace `cwd`.
- `Active thread registration cohort`: the set of `CodexThread` registrations attached to one `CodexAppServerClient` inside `CodexClientThreadRouter`.
- `Client-global notification`: a Codex app-server notification whose subject is the account/app-server/MCP runtime, not one AutoByteus agent run thread or turn.
- `Route-required message`: a Codex app-server notification/server request that represents thread/turn work and must be delivered to exactly one `CodexThread`.

Global events remain useful signals from Codex. This ticket only says the thread router is not their owner. If AutoByteus later needs them, add an explicit global-event consumer/status owner rather than routing them through agent threads.

## Design Reading Order

Read this design as:

1. runtime/event spine;
2. owner boundaries;
3. small file changes;
4. tests/validation.

No new large subsystem is introduced.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the ticket-branch Codex `scopeKey` client-key path instead of preserving it as an optional compatibility mode.
- Obsolete behavior: one Codex app-server client per standalone run or per team run for the same canonical `cwd`.
- Clean replacement: one Codex app-server client/refcount entry per canonical `cwd`; team/run/thread routing remains above the client boundary.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | Codex run/thread creation | Codex app-server client/process lease | `CodexAppServerClientManager` | Defines the performance-sensitive provider-client reuse boundary. |
| DS-002 | `Return-Event` | Codex app-server notification | AutoByteus run/team event or intentional skip | `CodexClientThreadRouter` | This is where the bug becomes a user-visible error card. |
| DS-003 | `Bounded Local` | One app-server message | Delivery, skip, or ambiguity diagnostic | `CodexClientThreadRouter` | The router's local dispatch decision must distinguish global telemetry from route-required messages. |
| DS-004 | `Primary End-to-End` | Claude session creation | Claude SDK query/session lifecycle | `ClaudeSessionManager` | Validates non-regression: no analogous client boundary change should be made for Claude. |

## Primary Execution Spine(s)

Codex client lease spine:

`AgentRunBackend -> CodexThreadManager -> CodexAppServerClientManager -> CodexAppServerClient -> Codex app-server process`

Codex notification return spine:

`Codex app-server process -> CodexAppServerClient -> CodexClientThreadRouter -> CodexThread -> CodexAgentRunBackend -> team chat/status surface`

Claude non-regression spine:

`Claude AgentRunBackend -> ClaudeSessionManager -> shared ClaudeSdkClient -> ClaudeSession/query events`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Starting/restoring a Codex thread obtains a provider client for the configured workspace. The client manager normalizes `cwd`, refcounts the lease, and starts one app-server process per canonical workspace. | `CodexThreadManager`, `CodexAppServerClientManager`, `CodexAppServerClient` | `CodexAppServerClientManager` | Workspace path normalization, app-server initialization, refcount release. |
| DS-002 | App-server notifications enter one shared client, the router decides whether they are client-global, routeable to a thread, or ambiguous, and only routeable/diagnostic events reach `CodexThread`. | `CodexAppServerClient`, `CodexClientThreadRouter`, `CodexThread` | `CodexClientThreadRouter` | Thread/turn id resolution, global-notification method set, debug logging. |
| DS-003 | For each message, the router first checks explicit global-notification methods, then uses thread/turn ids for matching, then emits ambiguity diagnostics only for route-required no-delivery messages. | `CodexClientThreadRouter` | `CodexClientThreadRouter` | `RUNTIME_RAW_EVENT_DEBUG` log output. |
| DS-004 | Claude sessions keep using the existing shared SDK client model; this ticket only validates it does not mirror Codex's scoped app-server client change. | `ClaudeSessionManager`, `ClaudeSdkClient`, `ClaudeSession` | `ClaudeSessionManager` | Existing cohort registry remains untouched. |

## Spine Actors / Main-Line Nodes

- `CodexThreadManager`: creates/restores/closes Codex threads and acquires/releases the workspace client lease.
- `CodexAppServerClientManager`: authoritative owner of Codex app-server process/client reuse and refcounting.
- `CodexAppServerClient`: provider protocol transport boundary.
- `CodexClientThreadRouter`: authoritative demultiplexer for app-server notifications/server requests for active threads sharing one client.
- `CodexThread`: per-run thread lifecycle and normalized runtime event emission.
- `ClaudeSessionManager`: Claude non-regression owner; not changed for Codex-specific client reuse.

## Ownership Map

| Node | Ownership |
| --- | --- |
| `CodexThreadManager` | Thread lifecycle sequencing: create/restore/close, remote `thread/start`/`thread/resume`, router registration, cleanup invocation. It does not own provider process key policy. |
| `CodexAppServerClientManager` | Canonical `cwd` normalization, client/process creation, initialization, refcounting, and close notifications. It must not encode run/team identity. |
| `CodexClientThreadRouter` | Per-client active-thread registrations, route matching, global-notification skipping, and ambiguity diagnostics. It is the active thread-registration cohort above the client boundary. |
| `CodexThread` | Per-run state (`threadId`, `activeTurnId`, status, approvals, pending MCP tool calls) and conversion from app-server events into runtime events. |
| `ClaudeSessionManager` | Claude sessions and shared SDK client usage. It remains a non-regression boundary in this ticket. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `getCodexAppServerClientManager()` | `CodexAppServerClientManager` | Singleton access to the client/process lease owner. | Run/team scoping policy. |
| `getCodexClientThreadRouter()` | `CodexClientThreadRouter` | Singleton access to active thread routing. | UI rendering policy or provider process creation. |
| `getClaudeSessionManager()` | `ClaudeSessionManager` | Singleton access to Claude session owner. | Codex client reuse behavior. |


### Post-Design Usefulness Of `TeamRuntimeCohortIdentity`

After restoring Codex app-server client reuse to canonical `cwd`, `TeamRuntimeCohortIdentity` has no remaining useful Codex responsibility. In `origin/personal`, Codex team/member behavior worked without this cohort concept because the real boundaries were already present: the mixed team manager owned team membership and `CodexClientThreadRouter` owned per-client thread routing. The ticket branch introduced the cohort abstraction but used it mainly as a client-scope key generator, which is the wrong layer.

Target decision for this ticket:

- remove Codex dependency on `TeamRuntimeCohortIdentity`;
- remove `CodexTeamThreadCohortCoordinator` if it becomes empty after client-scope removal;
- do not invent a replacement Codex cohort abstraction unless implementation finds a concrete remaining owner/responsibility;
- remove the registry-only Claude cohort coordinator too, because it has no consumer and keeping it would preserve empty indirection;
- delete `TeamRuntimeCohortIdentity` entirely once both cohort coordinators are removed.


### Mandatory No-Behavior Cleanup: Claude Cohort Registry

The Codex cohort abstraction is in scope for removal. The Claude cohort registry should also be removed in this same ticket:

- `ClaudeTeamSessionCohortCoordinator` only stores run id to cohort key registrations.
- No production code consumes `listCohortRunIds(...)` or `resolveCohortKey(...)`.
- `TeamRuntimeCohortIdentity` becomes Claude-only after Codex removal, which would preserve a shared abstraction with no real shared owner.

Per the design principles, empty indirection and obsolete structures should be removed in the same clean-cut change. Implementation must remove `ClaudeTeamSessionCohortCoordinator`, remove its injection/register/unregister calls from `ClaudeSessionManager`, and delete `team-runtime-cohort-identity.ts` entirely. This must not change `ClaudeSdkClient` reuse or Claude session behavior; focused Claude session tests should remain green.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `scopeKey` parameter on `CodexAppServerClientManager.getClient/acquireClient/releaseClient` | It encodes run/team identity into the provider client/process key and violates canonical-`cwd` reuse. | Canonical `cwd` key inside `CodexAppServerClientManager`. | In This Change | Clean-cut removal; do not keep overload for compatibility. |
| `normalizeClientKey(cwd, scopeKey)` composite key behavior | Allows multiple clients/processes for one workspace. | `normalizeClientKey(cwd)` returning `path.resolve(cwd)`. | In This Change | Preserve path normalization. |
| `CodexThreadManager.threadClientScopeKey(...)` | Its only job is to feed the wrong client/process key layer. | `CodexThreadManager` calls `acquireClient(config.workingDirectory)` directly. | In This Change | Avoid a new replacement helper. |
| `clientScopeKey` on `CodexThreadCleanupTarget` and `CodexAgentRunContext.toCleanupTarget(...)` | Cleanup should release by workspace lease only. | `CodexThreadCleanup.releaseWorkspaceClient(workingDirectory)`. | In This Change | Update fallback unexpected-close cleanup target too. |
| `CodexTeamThreadCohortCoordinator` | Empty indirection after this design: its current Codex responsibility is only to turn `TeamRuntimeCohortIdentity` into the wrong client scope key. | `CodexClientThreadRouter` per-client registration set for active routing; no Codex replacement abstraction unless a concrete owner remains. | In This Change | Delete once Codex client-scope usage is removed. |
| Tests asserting scoped Codex clients for same workspace | They encode the wrong boundary. | Tests asserting canonical-`cwd` client reuse. | In This Change | Required for AC-007. |
| `emitAmbiguousMessageError(...)` runtime-error fan-out | It broadcasts AutoByteus routing uncertainty as Codex runtime errors to every active thread. | Server-side diagnostic logging plus explicit global-notification skip. | In This Change | Rename/remove rather than keeping the old error semantics. |
| `ClaudeTeamSessionCohortCoordinator` and injection/register/unregister calls | Registry-only empty indirection: no production code consumes cohort lookups. | Existing `ClaudeSessionManager` session map and cleanup flow. | In This Change | Must preserve Claude SDK client/session behavior. |
| `TeamRuntimeCohortIdentity` | No remaining owner after Codex and Claude cohort removals. | No replacement; canonical `cwd` and existing session/run IDs remain authoritative. | In This Change | Delete rather than keep a shared abstraction for no users. |

## Return Or Event Spine(s) (If Applicable)

Codex notification return spine:

`CodexAppServerClient.onNotification -> CodexClientThreadRouter.handleAppServerNotification -> [skip/log global OR route by thread/turn OR server-side no-route diagnostic] -> CodexThread.handleAppServerNotification only for matched route -> runtime event listeners -> team surface`

Target behavior for observed global notifications:

`CodexAppServerClient.onNotification(account/rateLimits/updated or mcpServer/startupStatus/updated) -> CodexClientThreadRouter detects client-global method -> optional debug log -> return without CodexThread event`

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `CodexClientThreadRouter`

`message received -> trim/classify method -> skip/log if client-global notification -> resolve threadId/turnId -> match registration(s) -> deliver or server-side no-route diagnostic`

Why it matters: the bug is inside this dispatch decision. The router must make the decision before any `CodexThread.emitRuntimeError(...)` side effect occurs.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Workspace path normalization | DS-001 | `CodexAppServerClientManager` | Convert configured `cwd` to canonical path. | Keeps provider client reuse stable. | Run/team code would duplicate key policy. |
| Client-global notification method set | DS-002, DS-003 | `CodexClientThreadRouter` | Identify known notifications that are not thread-routable. | Prevents global telemetry from becoming runtime errors. | UI workarounds would hide symptoms after state already changed. |
| Thread/turn id resolution | DS-002, DS-003 | `CodexClientThreadRouter` and existing resolver | Extract explicit `threadId`/`turnId` shapes. | Maintains exact delivery for route-required messages. | Thread handler would receive wrong messages or duplicate routing policy. |
| Raw/debug logging | DS-002, DS-003 | `CodexClientThreadRouter` | Optional visibility under existing debug flag. | Useful diagnostics without user-visible errors. | Normal logs/errors would alarm users for non-errors. |
| Claude non-regression check | DS-004 | `ClaudeSessionManager` tests | Ensure Claude SDK client lifecycle is not changed. | User asked to audit Claude too. | Copying Codex rules into Claude would introduce unnecessary behavior changes. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Codex provider client/process reuse | `runtime-management/codex/client` | Reuse/Correct | Existing manager is the right owner; its key shape is wrong on this branch. | N/A |
| Codex message demultiplexing | `agent-execution/backends/codex/thread/CodexClientThreadRouter` | Extend | Existing router already owns active registrations and ambiguity diagnostics. | N/A |
| Thread/turn id extraction | `codex-thread-id-resolver.ts` | Reuse | Existing resolver already knows Codex identity shapes. | N/A |
| Claude provider client lifecycle | `runtime-management/claude` + `ClaudeSessionManager` | Reuse unchanged | No analogous regression found. | N/A |
| UI suppression of red cards | Frontend/team chat | Reject | Wrong boundary; backend status/error event would still be emitted. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/codex/client` | Codex app-server process/client lease per canonical workspace. | DS-001 | `CodexAppServerClientManager` | Reuse/Correct | Remove run/team scope key. |
| `agent-execution/backends/codex/thread` | Codex thread lifecycle and per-client message routing. | DS-001, DS-002, DS-003 | `CodexThreadManager`, `CodexClientThreadRouter`, `CodexThread` | Extend/Correct | Add small classification function/set in router. |
| `agent-execution/backends/codex/backend` | Runtime context and cleanup target. | DS-001 | `CodexAgentRunContext`, `CodexThreadCleanup` | Correct | Remove `clientScopeKey` from cleanup shape. |
| `agent-execution/backends/claude/session` | Claude session lifecycle and SDK usage. | DS-004 | `ClaudeSessionManager` | Reuse unchanged | Validate only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `codex-app-server-client-manager.ts` | `runtime-management/codex/client` | `CodexAppServerClientManager` | Canonical-`cwd` client/process lease. | Existing owner; only key/API correction needed. | No new shared structure. |
| `codex-thread-manager.ts` | `agent-execution/backends/codex/thread` | `CodexThreadManager` | Acquire/release client by workspace and register thread with router. | Existing lifecycle owner. | Uses existing config/context. |
| `codex-client-thread-router.ts` | `agent-execution/backends/codex/thread` | `CodexClientThreadRouter` | Classify global notifications; route/detect ambiguity. | Existing router owner; no separate helper file needed for a tiny method set. | Uses existing id resolver. |
| `codex-thread-cleanup.ts` | `agent-execution/backends/codex/backend` | `CodexThreadCleanup` | Release workspace client and materialized skills. | Existing cleanup owner; remove obsolete field. | No. |
| `codex-agent-run-context.ts` | `agent-execution/backends/codex/backend` | `CodexAgentRunContext` | Build cleanup target. | Existing runtime-context owner. | No. |
| Codex unit tests | `autobyteus-server-ts/tests/unit/...` | Test suite | Encode client reuse and router skip behavior. | Existing test locations match changed owners. | No. |
| Claude session test | `autobyteus-server-ts/tests/unit/.../claude/session` | Test suite | Non-regression validation. | Existing test location. | No. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Client-global Codex notification method set | Keep local in `codex-client-thread-router.ts` | `CodexClientThreadRouter` | Not repeated yet; local constant is simpler. | Yes | Yes | A generic provider-event taxonomy before there are multiple owners. |
| Workspace client key normalization | Existing private methods in `codex-app-server-client-manager.ts` | `CodexAppServerClientManager` | Already centralized. | Yes | Yes | A run/team key builder. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `CodexThreadCleanupTarget` | Yes after removing `clientScopeKey` | Yes | Low | Keep only `workingDirectory` and `materializedConfiguredSkills`. |
| `ClientEntry` in `CodexAppServerClientManager` | Yes after restoring key to canonical `cwd` | Yes | Low | `key` and `cwd` both remain acceptable because one is map key and one is process cwd; no run/team scope. |
| `TeamRuntimeCohortIdentity` | No after cohort removals | Yes by deletion | High if retained | Delete entirely; do not keep a no-user shared identity structure. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | Codex runtime management | `CodexAppServerClientManager` | One app-server client/process lease per canonical `cwd`; no run/team scope key. | Existing process/client lease owner. | No. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Codex thread execution | `CodexThreadManager` | Start/restore/close threads; acquire/release client by `workingDirectory` only. | Existing lifecycle owner. | No. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts` | Codex thread routing | `CodexClientThreadRouter` | Skip/log known client-global notifications; route targetable messages; log no-route diagnostics server-side only. | Existing demultiplexer and correct authoritative boundary. | Existing id resolver. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` | Codex backend cleanup | `CodexThreadCleanup` | Cleanup materialized skills and release workspace client by `workingDirectory`. | Existing cleanup owner. | No. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-context.ts` | Codex runtime context | `CodexAgentRunContext` | Produce cleanup target without client scope key. | Existing context owner. | `CodexThreadCleanupTarget`. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-team-thread-cohort-coordinator.ts` | Codex thread routing | N/A | Delete after scope-key removal. | Its only Codex job was wrong-layer client key construction. | N/A. |
| `autobyteus-server-ts/src/agent-execution/domain/team-runtime-cohort-identity.ts` | Shared runtime identity | N/A | Delete after cohort removals. | No remaining owner or production responsibility. | N/A. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-team-session-cohort-coordinator.ts` | Claude session lifecycle | N/A | Delete registry-only coordinator. | No production consumer; `ClaudeSessionManager` already owns sessions. | N/A. |
| `autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-client-manager.test.ts` | Tests | Manager contract | Assert canonical-`cwd` reuse/refcounting; remove scoped-client assertions. | Matches manager boundary. | No. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` | Tests | Thread manager contract | Assert same-workspace standalone/team runs acquire by `cwd` only and therefore can share one client. | Matches thread lifecycle owner. | No. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-client-thread-router.test.ts` | Tests | Router contract | Add no-error skip coverage for observed global methods and preserve route-required routing/diagnostics. | Matches router owner. | No. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | Tests | Claude non-regression | Existing focused test remains green; no SDK lifecycle changes. | Matches Claude owner. | No. |

## Ownership Boundaries

- `CodexAppServerClientManager` is the authoritative provider-client/process boundary. Callers may choose a workspace `cwd`, but they must not choose run/team-specific client process identities.
- `CodexClientThreadRouter` is the authoritative active-thread dispatch boundary for messages arriving from a shared Codex app-server client. It owns the decision to skip client-global notifications before thread code sees them.
- `CodexThread` owns per-thread runtime state and event emission, but it should only receive messages that are routeable to that thread. Router no-route diagnostics stay server-side by default.
- Frontend/team chat code must not know Codex notification method names for this bug.
- Claude runtime boundaries stay unchanged.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CodexAppServerClientManager` | `entries`, `ClientEntry`, process creation, refcount, `normalizeCwd`/`normalizeClientKey` | `CodexThreadManager`, model catalog, bootstrapper, history reader | Passing run/team scope into provider process key. | Strengthen manager API to accept only `cwd`. |
| `CodexClientThreadRouter` | `ClientRoute.registrations`, notification/request listeners, route matching, ambiguity diagnostic | `CodexThreadManager` registration and `CodexAppServerClient` callbacks | UI filtering of backend runtime errors; broadcasting unknown messages to all threads. | Add router-owned classification/matching methods. |
| `ClaudeSessionManager` | `ClaudeSdkClient`, sessions map, active queries, cleanup | Claude backends | Applying Codex workspace-client semantics to Claude. | Separate Claude-specific design if a Claude bug appears. |

## Dependency Rules

Allowed:

- `CodexThreadManager -> CodexAppServerClientManager.acquireClient(workingDirectory)`.
- `CodexThreadManager -> CodexClientThreadRouter.registerThread(...)`.
- `CodexClientThreadRouter -> codex-thread-id-resolver` for identity extraction.
- `CodexClientThreadRouter -> local/global-event skip or server-side diagnostic logging` for non-routeable messages.
- `CodexClientThreadRouter -> CodexThread.handleAppServerNotification/Request` only after route match.
- `CodexClientThreadRouter -> CodexThread.emitRuntimeError` is forbidden for no-route/global/ambiguous router diagnostics. Only a routed Codex thread event or actual thread/client lifecycle failure should affect thread runtime status.

Forbidden:

- Passing `runId`, `teamRunId`, `memberRunId`, or derived cohort keys into `CodexAppServerClientManager`.
- Adding frontend-specific checks for `account/rateLimits/updated` or `mcpServer/startupStatus/updated`.
- Silently skipping unknown route-required messages that lack identity when multiple registrations are active; log a server-side diagnostic instead.
- Changing Claude `ClaudeSdkClient` lifecycle as part of this Codex bug fix.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CodexAppServerClientManager.getClient(cwd)` | Workspace Codex app-server client | Get/start client without ref increment. | canonicalizable workspace `cwd` only | Remove `scopeKey`. |
| `CodexAppServerClientManager.acquireClient(cwd)` | Workspace Codex app-server client lease | Increment refcount and return client. | canonicalizable workspace `cwd` only | Remove `scopeKey`. |
| `CodexAppServerClientManager.releaseClient(cwd)` | Workspace Codex app-server client lease | Decrement refcount and close when zero. | canonicalizable workspace `cwd` only | Remove `scopeKey`. |
| `CodexClientThreadRouter.registerThread({ client, thread, onThreadClientClosed })` | Active registrations for one client | Register one thread under an app-server client. | client object + thread object | No run/team scope required for routing. |
| `isClientGlobalCodexNotification(method)` or local equivalent | Codex notification route scope | Classify known non-thread telemetry. | normalized method string | Keep local/private unless reused. |
| `logUnrouteableAppServerMessage(...)` or local equivalent | Router diagnostics | Record no-route/missing-identity diagnostics without thread side effects. | method, kind, thread count, param keys | Must not call `CodexThread.emitRuntimeError(...)`; server requests may receive one transport-level `respondError(...)`. |
| `CodexAgentRunContext.toCleanupTarget()` | Codex cleanup data | Build cleanup target. | runtime context fields only | No `clientScopeKey`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `acquireClient(cwd)` | Yes | Yes | Low | Remove scoped overload. |
| `releaseClient(cwd)` | Yes | Yes | Low | Remove scoped overload. |
| `registerThread({ client, thread })` | Yes | Yes | Low | Keep. |
| Router global notification classifier | Yes | Yes | Low | Use explicit method names. |
| `logUnrouteableAppServerMessage(...)` or equivalent | Yes | Yes | Low | Server-side diagnostic only; must not call `CodexThread.emitRuntimeError(...)`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Codex app-server client lease owner | `CodexAppServerClientManager` | Yes | Low | Keep. |
| Codex active-thread router | `CodexClientThreadRouter` | Yes | Low | Keep. |
| Codex client-global notification methods | `CLIENT_GLOBAL_CODEX_NOTIFICATION_METHODS` or similar | Yes | Low | Add local constant. |
| Codex team cohort key builder | `CodexTeamThreadCohortCoordinator` | No after this fix | High | Remove if no longer owns real policy. |

## Applied Patterns (If Any)

- Manager: existing `CodexAppServerClientManager` remains a lease/refcount manager; the fix tightens its key semantics.
- Router/dispatcher: existing `CodexClientThreadRouter` remains a bounded local dispatch owner for provider events.
- Registry-like local set: a small private set of client-global notification methods is acceptable because it serves the router and avoids a new abstraction.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/client/` | Folder | Codex provider-client management | App-server client/process management. | Existing provider runtime boundary. | Team/run routing policy. |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | File | Workspace client lease | Canonical-`cwd` reuse and refcount. | Existing manager. | `scopeKey`, `teamRunId`, `runId` keying. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Folder | Codex thread runtime | Thread lifecycle/routing. | Existing runtime-thread area. | Frontend rendering rules. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts` | File | Active-thread routing | Global skip + exact routing + server-side no-route diagnostic. | Existing demultiplexer. | Provider process creation. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | File | Thread lifecycle | Acquire client by workspace, register thread, start/resume remote thread. | Existing lifecycle owner. | Client key construction from team/run identity. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` | File | Cleanup | Release workspace client and materialized skills. | Existing cleanup owner. | Client scope key. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Folder | Claude session lifecycle | Non-regression only. | Existing Claude owner. | Codex-specific client policy. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `runtime-management/codex/client` | `Persistence-Provider` / provider transport-management | Yes | Low | Correct location for app-server process/client lease. |
| `agent-execution/backends/codex/thread` | `Main-Line Domain-Control` + bounded local router | Yes | Low | Existing files separate manager, router, thread, handlers. |
| `agent-execution/backends/codex/backend` | `Main-Line Domain-Control` | Yes | Low | Runtime context/cleanup remains there. |
| `agent-execution/backends/claude/session` | `Main-Line Domain-Control` | Yes | Low | Non-regression only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Codex client key | `acquireClient('/repo/worktree')` and another same-canonical-path run receives the same client/refcount entry. | `acquireClient('/repo/worktree', 'codex:agent-run:run-1')`. | Preserves Codex best-practice workspace client reuse. |
| Global notification handling | `if (isClientGlobalCodexNotification(method)) { debugLogOrFutureGlobalConsumer; return; }` before route matching. | Let global telemetry reach any ambiguous/no-route error path. | Keeps valid global signals out of per-thread status/chat while leaving a future global consumer path. |
| Route-required ambiguity | `item/agentMessage/delta` without thread/turn id and two active registrations may log a server-side diagnostic. | Broadcasting a no-id router diagnostic to every active thread as `emitRuntimeError(...)`. | Keeps the useful guardrail without turning AutoByteus routing uncertainty into a Codex business/runtime error. |
| Team/cohort placement | Router registrations are above one shared workspace client; matching uses thread/turn identity. | Team/run cohort key determines app-server process identity. | Keeps routing/cleanup identity separate from provider process reuse. |
| Claude audit | Run existing Claude session tests; do not change `getClaudeSdkClient()` usage. | Copy Codex `cwd` process rules into Claude SDK lifecycle. | Avoids unrelated Claude performance or behavior regressions. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep optional `scopeKey` overload but stop using it in `CodexThreadManager` | Would minimize compile churn. | Rejected | Remove overload/API because it preserves a wrong boundary and future callers could reintroduce scoped clients. |
| Add UI filter for `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` | Would hide red cards quickly. | Rejected | Fix router so the runtime error is never emitted for known global telemetry. |
| Treat every no-id notification as global and skip it | Simple but too broad. | Rejected | Explicit method allowlist for known global telemetry; unknown route-required messages get server-side diagnostics only. |
| Change Claude SDK client sharing to mirror Codex workspace rules | User asked to audit Claude. | Rejected | No analogous Claude mischange found; leave Claude lifecycle unchanged. |

## Derived Layering (If Useful)

Layering is only explanatory here:

- Provider process/client layer: `CodexAppServerClientManager`, `CodexAppServerClient`.
- Runtime thread control layer: `CodexThreadManager`, `CodexThread`, `CodexClientThreadRouter`.
- Team/UI event surface layer: downstream listeners and chat rendering.

The fix stays in the first two layers. The UI layer is not changed.

## Migration / Refactor Sequence

1. Update `CodexAppServerClientManager`:
   - remove `scopeKey` parameters from `getClient`, `acquireClient`, `releaseClient`, `getOrCreateEntry`, and `normalizeClientKey`;
   - key entries by normalized `cwd` only;
   - preserve refcount/start/close behavior.
2. Update Codex callers:
   - `CodexThreadManager.startThread(...)` calls `acquireClient(config.workingDirectory)`;
   - failure cleanup calls `releaseClient(config.workingDirectory)`;
   - close/unexpected-close cleanup targets no longer carry `clientScopeKey`;
   - model catalog, bootstrapper, and history reader should compile unchanged or with only signature updates.
3. Update cleanup/context shapes:
   - remove `clientScopeKey` from `CodexThreadCleanupTarget`;
   - make `CodexAgentRunContext.toCleanupTarget()` parameterless;
   - `CodexThreadCleanup.releaseWorkspaceClient(...)` releases by `workingDirectory` only.
4. Remove cohort key indirection cleanly:
   - remove `CodexTeamThreadCohortCoordinator` import/injection from `CodexThreadManager`;
   - delete `codex-team-thread-cohort-coordinator.ts`;
   - remove `ClaudeTeamSessionCohortCoordinator` import/injection/register/unregister calls from `ClaudeSessionManager`;
   - delete `claude-team-session-cohort-coordinator.ts`;
   - delete `team-runtime-cohort-identity.ts`;
   - verify no production imports remain for these files/types.
5. Update `CodexClientThreadRouter`:
   - add private global notification method set for at least `account/rateLimits/updated`, `mcpServer/startupStatus/updated`, and current historical test method `mcp/startupComplete`;
   - skip/log those notifications before route matching and before any no-route diagnostic path;
   - keep existing thread/turn matching and ambiguity diagnostics for route-required no-delivery messages.
6. Update tests:
   - manager tests assert same canonical `cwd` reuse and refcounted close;
   - thread manager tests assert same-workspace standalone and team runs call `acquireClient('/tmp/workspace')` without scope key and can share one client;
   - router tests add `emitRuntimeError` spies and assert no error for observed global notifications and unknown no-route diagnostics with two registrations;
   - router tests preserve route-required matching and assert missing-identity diagnostics are non-user-visible/no `emitRuntimeError`;
   - Claude session manager focused tests remain green.
7. Run focused validation commands listed below.

## Key Tradeoffs

- Explicit allowlist vs broad no-id skip: allowlist is safer because it preserves route-required diagnostics. It requires extension if Codex adds more global methods.
- Removing scoped manager API vs leaving unused overload: removal is slightly more code churn but prevents future reintroduction of run/team client keys.
- Removing both Codex and Claude cohort coordinators: removal follows the empty-indirection trigger. Codex has no cohort responsibility after canonical-`cwd` client reuse is restored; Claude has only an unread registry, so keeping it would preserve misleading structure without behavior.

## Risks

- Codex may emit additional client-global notification methods not yet observed. Mitigation: keep the method set local and easy to extend; raw/debug or warning logs can reveal future methods without user-visible runtime errors.
- Some current tests intentionally assert scoped clients; they must be updated carefully to assert the restored contract instead of deleted without replacement.
- If an unknown no-id route-required message currently relies on single-thread fallback, behavior should remain unchanged for `threadCount === 1`; for multiple threads, no-route diagnostics should be server-side only.
- Removing the Claude cohort registry must remain no-behavior: do not change `ClaudeSdkClient`, active query cleanup, session IDs, or Claude event handling.

## Guidance For Implementation

- Keep the implementation intentionally small; do not build a generic provider event taxonomy.
- Prefer a private constant/function in `codex-client-thread-router.ts`:

```ts
const CLIENT_GLOBAL_CODEX_NOTIFICATION_METHODS = new Set([
  "account/rateLimits/updated",
  "mcpServer/startupStatus/updated",
  "mcp/startupComplete",
]);

const isClientGlobalCodexNotification = (method: string): boolean =>
  CLIENT_GLOBAL_CODEX_NOTIFICATION_METHODS.has(method.trim());
```

- In `handleAppServerNotification(...)`, check this before iterating registrations. If debug is enabled, log the skip with method/thread count/param keys; otherwise do nothing.
- For unknown no-delivery messages with multiple registrations, log a server-side diagnostic/warning with method, kind, thread count, and param keys; do not call `emitRuntimeError(...)`.
- Do not add a broad global skip for server requests unless a concrete client-global server request is identified; unrouteable server requests should be logged/diagnosed server-side without marking every thread as failed.
- For unrouteable server requests, respond once through `CodexAppServerClient.respondError(...)` if needed to avoid leaving the app-server request hanging; this is a transport/routing response, not a per-thread runtime error.
- Do not emit `CodexThread.emitRuntimeError(...)` for skipped global notifications or any router no-route diagnostic.
- Do not touch frontend chat rendering for this bug.
- Remove Claude cohort registry only as no-behavior cleanup; do not change Claude `ClaudeSdkClient` creation/reuse, session IDs, active query cleanup, or event handling.

Recommended focused validation:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/runtime-management/codex/client/codex-app-server-client-manager.test.ts \
  tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts \
  tests/unit/agent-execution/backends/codex/thread/codex-client-thread-router.test.ts \
  tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts \
  --no-watch
```

If local Electron/Codex credentials are available later, validate manually in the seeded team flow: two active team threads, Codex runtime, no red error cards for `account/rateLimits/updated` or `mcpServer/startupStatus/updated`, while normal Codex message deltas still appear in the intended member thread.
