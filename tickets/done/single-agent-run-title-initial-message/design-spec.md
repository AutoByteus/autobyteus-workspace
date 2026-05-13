# Design Spec

## Current-State Read

The reported row is rendered by the workspace history tree, specifically `WorkspaceHistoryWorkspaceSection.vue`, which displays `formatRunLabel(run.summary)` for single-agent rows. That `summary` comes from `runHistoryStore.getTreeNodes()`, which builds frontend rows from backend `RunHistoryItem.summary` and then overlays live status/time through `mergeRunTreeWithLiveContexts`.

Single-agent message ingress records every accepted user message as a candidate summary:
`AgentStreamHandler.handleSendMessage -> AgentRunService.recordRunActivity -> AgentRunHistoryIndexService.recordRunActivity`.
`AgentRunHistoryIndexService` intends to preserve the first non-empty summary, but the existing row is read before the store write is queued. That means overlapping activity writes can both observe an empty summary and a later user message can become the stored row summary. `AgentRunHistoryService.listRunHistory` then returns that stored summary directly. The frontend live merge does not correct it from the live conversation's first user message.

Team run history is more resilient because `TeamRunHistoryService.resolveSummary` can recover an empty team summary from the coordinator member's first message/projection. The team frontend live-only path also derives a team summary from the coordinator's first user message. The single-agent path lacks the same read-side recovery and live-row summary guard.

Constraints:
- The public GraphQL field is `summary`; keep the API shape but tighten semantics.
- The row presentation component should remain thin.
- Existing team behavior must remain stable.
- The task worktree currently lacks test dependencies; validation may require bootstrap.

## Intended Change

Define workspace history `summary` for single-agent runs as a stable initial-message run title. Later user messages can update activity time and status, but cannot replace the stored or displayed summary. Enforce this at the backend run-history index boundary, add single-agent read-side recovery from canonical projection for active/missing summaries, and add a frontend live-context overlay that uses the first non-empty user message for active persisted single-agent rows.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, plus narrow Duplicated Policy Or Coordination around first-summary resolution
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrow boundary refactor
- Evidence: Existing `resolveFirstSummary` policy is outside the atomic store write path; single-agent listing returns stored summary directly; frontend active merge overlays status/time but not a stable first-message title; team read model has recovery that single-agent lacks.
- Design response: Put first-summary selection behind one run-history summary owner/atomic update, mirror the team recovery pattern for single-agent history, and add frontend live projection guardrails.
- Refactor rationale: A presentation-only patch would leave backend index state mutable/race-prone and fail after refresh/reload. A backend-only patch would not correct the live UI immediately when an active row already has a stale latest-message summary.
- Intentional deferrals and residual risk, if any: Broad migration of all inactive historical rows is deferred. If needed later, a repair command can rebuild index summaries from projections. Current scope repairs future rows and active/missing/incorrect current rows.

## Terminology

- `Run history summary`: The persisted `summary` field used as the workspace history row label.
- `Initial run title`: The first non-empty user message associated with a run. This is the semantic meaning of `summary` for workspace history rows.
- `Candidate summary`: A user message content passed by ingress/activity code. It may be the first message or a later follow-up.
- `Live context overlay`: Frontend projection step that merges active `AgentContext` state into persisted history rows.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace latest-message interpretation of run history summary with stable initial-title semantics. Do not add a second title field or fallback display path for the old behavior.
- Obsolete behavior in scope: treating every accepted user message as a possible replacement for a row label.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User sends single-agent message | Workspace history row displays stable title | Run-history summary owner, surfaced by frontend projection | This is the reported bug path. |
| DS-002 | Primary End-to-End | Workspace history list/refresh | Single-agent rows are grouped/rendered | `AgentRunHistoryService` + frontend run tree projection | Ensures refresh/reload keeps the first-message title. |
| DS-003 | Return-Event | Active run context changes | Workspace tree active row updates status/time without title mutation | `mergeRunTreeWithLiveContexts` | Prevents live UI from showing latest message while preserving live status. |
| DS-004 | Bounded Local | Run-history index activity write | Stored row updated atomically | index store/service write queue | Protects first-summary invariant under overlapping writes. |

## Primary Execution Spine(s)

- DS-001: `User Message -> Agent WebSocket Ingress -> AgentRunService.recordRunActivity -> AgentRunHistoryIndexService -> AgentRunHistoryIndexStore -> Workspace History GraphQL -> Run History Store -> Workspace Row`
- DS-002: `Workspace History Refresh -> AgentRunHistoryService.listRunHistory -> Summary Recovery -> WorkspaceRunHistoryService -> GraphQL -> Frontend Projection -> Workspace Row`
- DS-003: `Live AgentContext -> First User Summary Resolver -> Live Status Merge -> RunTreeRow.summary -> Workspace Row`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each accepted user message is only a candidate title. The run-history owner decides whether it can become the stable summary. | WebSocket ingress, Agent run service, Run-history index service/store, Workspace row | `AgentRunHistoryIndexService` | Summary normalization, atomic write queue, metadata lookup |
| DS-002 | On refresh/reload, listing should return canonical first-message summary. If stored summary is missing or active-row repair is needed, the list service can recover from projection. | Agent history list service, Projection service, Workspace history service, Frontend tree | `AgentRunHistoryService` | Projection provider, metadata store, index repair write |
| DS-003 | While a run is active locally, the frontend knows the live conversation; it should derive the row title from the first user message and only overlay status/time otherwise. | Live context, merge projection, row | `mergeRunTreeWithLiveContexts` | First-user summary helper |
| DS-004 | The index store write queue must encapsulate read-modify-write so two activity records cannot both decide the summary from stale empty state. | Index service, Index store | `AgentRunHistoryIndexService` with store atomic primitive | Write queue/reducer API |

## Spine Actors / Main-Line Nodes

- User message ingress
- Agent run activity recording
- Run-history summary/index owner
- Workspace history read model
- Frontend run tree projection
- Workspace row presentation

## Ownership Map

- `AgentStreamHandler`: Owns WebSocket command translation and accepted-message dispatch. It may pass candidate summary text but must not own title immutability.
- `AgentRunService`: Owns run lifecycle metadata coordination and forwards activity to run history.
- `AgentRunHistoryIndexService`: Owns durable single-agent history row invariants, including first-summary preservation.
- `AgentRunHistoryIndexStore`: Owns serialized file read/write mechanics. It must provide an atomic read-modify-write seam when the service needs current-row-dependent policy.
- `AgentRunHistoryService`: Owns single-agent history list/read projection and targeted recovery from canonical projections.
- `mergeRunTreeWithLiveContexts`: Owns frontend active-context overlay for single-agent history rows.
- `WorkspaceHistoryWorkspaceSection.vue`: Thin renderer only; it must not decide title source policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceHistoryWorkspaceSection.vue` | Run-history tree projection | Render rows/actions | Title-selection policy |
| GraphQL `listWorkspaceRunHistory` | `WorkspaceRunHistoryService` / `AgentRunHistoryService` | Public history query | Summary repair policy beyond delegating to services |
| `AgentStreamHandler.handleSendMessage` | `AgentRunService` / runtime backend | Transport command ingress | Stable title invariant |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Split read-before-queued-write summary decision in `AgentRunHistoryIndexService.recordRunActivity` | Allows stale existing-summary decisions under overlap | Atomic index row mutation seam | In This Change | Existing sequential behavior remains but invariant becomes protected. |
| Any frontend derivation that would use latest user message for history row title | Conflicts with initial-title semantics | First-user summary resolver | In This Change | Do not put fallback in row Vue component. |
| Broad inactive historical migration | Not required for current bug fix | Optional future repair command | Follow-up | Only if user later requires all old rows repaired. |

## Return Or Event Spine(s) (If Applicable)

- DS-003: `AgentContext conversation/status update -> runTreeLiveStatusMerge -> run tree computed value -> WorkspaceHistoryWorkspaceSection render`.
- The event direction is UI-local; it updates display but must not write persistent history.

## Bounded Local / Internal Spines (If Applicable)

- DS-004 parent owner: run-history index store/service.
- Chain: `recordRunActivity input -> resolve metadata-derived row -> queued current-row read -> choose first summary -> write normalized row`.
- Why it matters: The invariant depends on the current row at the instant of write, not on a stale row read before another queued write.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Summary normalization/compaction | DS-001, DS-004 | Run-history summary owner | Trim/collapse/truncate candidate titles | Keeps stored row labels display-safe | Rendering components would duplicate formatting. |
| Projection summary recovery | DS-002 | Agent history list service | Recover first-message summary from canonical projection when stored row is missing/incorrect for active/current rows | Repairs rows without UI hacks | WebSocket ingress would need historical reads. |
| Live first-user extraction | DS-003 | Frontend projection | Derive first non-empty user text from `AgentContext.conversation` | Keeps active UI correct immediately | Vue row component would become policy owner. |
| Test harnesses | all | Implementation validation | Prove atomicity and UI projection behavior | Regression prevention | Manual screenshot checks alone miss races. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Durable row summary invariant | `autobyteus-server-ts/src/run-history` | Extend | Run history already owns index rows and summaries. | N/A |
| Canonical first-user summary | Run projection (`run-projection-utils.ts`) and raw-trace helper | Reuse/Extend | Projection already defines summary from first user. | N/A |
| Frontend tree active overlay | `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Extend | It already owns live-over-history projection. | N/A |
| Presentation | `WorkspaceHistoryWorkspaceSection.vue` | Reuse unchanged | It already renders summaries. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server run-history index | First-summary preservation, atomic row mutation | DS-001, DS-004 | `AgentRunHistoryIndexService` | Extend | Main backend fix. |
| Server run-history list/read model | Targeted summary recovery from projections | DS-002 | `AgentRunHistoryService` | Extend | Mirror team read-side shape. |
| Server projection | Canonical first user summary | DS-002 | `AgentRunViewProjectionService` | Reuse | Already uses first user. |
| Web frontend run tree projection | Active row overlay | DS-003 | `mergeRunTreeWithLiveContexts` | Extend | Main frontend fix. |
| Web presentation | Display row label | DS-002, DS-003 | `WorkspaceHistoryWorkspaceSection.vue` | Reuse | Should remain policy-free. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | Server run-history index | Durable single-agent index policy | Preserve first non-empty summary on activity writes | Existing owner | Possible shared summary helper |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-store.ts` | Server run-history index store | File persistence boundary | Atomic current-row mutation primitive | Existing write queue owner | N/A |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Server run-history read model | Single-agent history listing | Resolve/repair summary from projection for active/missing rows | Existing list owner | Projection service |
| `autobyteus-server-ts/src/run-history/services/run-history-service-helpers.ts` or new helper | Server run-history shared policy | Summary normalization/invariant helper | Avoid duplicating first-summary logic | Current helper already has `compactSummary`; may be enough | Yes |
| `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Web run tree projection | Live overlay owner | Overlay first-user summary for matching live contexts | Existing overlay owner | First-user helper |
| `autobyteus-web/stores/runHistoryReadModel.ts` or new `runSummaryProjection.ts` | Web run tree projection | Summary extraction helper | Shared first-user extraction for drafts/live overlay | Avoid duplicate `.find(user)` logic | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Compact/first-summary selection | `run-history-service-helpers.ts` or narrow new `run-history-summary.ts` | Server run-history | Agent and team index services both preserve first summary | Yes | Yes | Generic title formatter with UI concerns |
| First user message extraction in web tree projection | `autobyteus-web/utils/runTreeSummary.ts` or exported helper from `runHistoryReadModel.ts` | Web run tree projection | Draft and live summary extraction need same logic | Yes | Yes | Component-specific formatter |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RunHistoryItem.summary` | Yes after change: initial run title | Yes | Medium today | Document/encode semantic in helpers/tests. |
| `RunTreeRow.summary` | Yes after change: display-ready initial run title | Yes | Medium today | Live overlay must not use latest message. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | Server run-history index | Durable single-agent index policy | Build candidate row and preserve first summary through atomic store operation | Existing policy owner | Server summary helper |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-store.ts` | Server run-history persistence | Atomic file-backed row mutation | Expose queued read-modify-write for current-row-dependent updates | Existing write queue owner | N/A |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Server run-history read model | Single-agent history listing | Resolve/correct summary from projection when needed, then return canonical summary | Existing list owner | Projection service |
| `autobyteus-server-ts/src/run-history/services/run-history-service-helpers.ts` or `run-history-summary.ts` | Server run-history shared support | Summary semantics helper | `compactSummary`, `resolveFirstNonEmptySummary` | Prevent duplicated policy | N/A |
| `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Web run tree projection | Active row overlay | Overlay first-user live summary plus status/time | Existing overlay owner | Web summary helper |
| `autobyteus-web/stores/runHistoryReadModel.ts` and/or `autobyteus-web/utils/runTreeSummary.ts` | Web run tree projection | Summary extraction | Reuse first-user extraction for draft and live rows | Existing draft logic can be extracted | N/A |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-index-service.test.ts` | Server tests | Backend invariant tests | Add overlapping/concurrent first-summary coverage | Existing suite | N/A |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-service.test.ts` | Server tests | Read-side recovery tests | Add active/missing/incorrect summary recovery coverage | Existing suite | N/A |
| `autobyteus-web/utils/__tests__/runTreeLiveStatusMerge.spec.ts` | Web tests | Frontend projection tests | Add first-user summary overlay test | Existing suite | N/A |

## Ownership Boundaries

- The durable first-summary rule belongs to server run-history, not WebSocket ingress and not Vue rendering.
- The store owns atomicity, while the service owns the semantic choice of first summary.
- The frontend live overlay may improve active display using local conversation state, but it must not persist that decision or become the authoritative backend title owner.
- Team history remains separately owned; any shared helper must preserve existing visible team behavior.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunHistoryIndexService.recordRunActivity` | Summary preservation, metadata row construction, store mutation | `AgentRunService`, compaction runner, external-channel facades | Callers deciding whether candidate summary replaces stored summary | Add/strengthen service/store method |
| `AgentRunHistoryIndexStore` atomic mutation method | File read/write queue | Index service | Service reading row outside queue then writing later with stale assumptions | Add queued reducer/mutate API |
| `AgentRunHistoryService.listRunHistory` | Summary recovery and list shape | Workspace history GraphQL | GraphQL resolver or frontend reading raw traces/projection to fix labels | Add recovery to list service |
| `mergeRunTreeWithLiveContexts` | Active frontend row overlay | `runHistoryReadModel` | Vue components deriving title from latest messages | Add helper/overlay logic |

## Dependency Rules

- `AgentStreamHandler` may depend on `AgentRunService`, but not on index stores or projection providers.
- `AgentRunService` may depend on `AgentRunHistoryIndexService`, not on frontend or row presentation.
- `AgentRunHistoryIndexService` may depend on the index store and summary helper.
- `AgentRunHistoryService` may depend on metadata store and `AgentRunViewProjectionService` for recovery.
- Frontend row components may depend on projected rows only; they must not inspect conversations to choose labels.
- `runTreeLiveStatusMerge` may inspect live `AgentContext.conversation` because it owns the active-row overlay.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `recordRunActivity({ runId, metadata, summary, ... })` | Single-agent run history row | Accept candidate summary and update status/time while preserving first title | explicit `runId` | Candidate summary is not authoritative replacement. |
| New/changed store atomic mutation API | Index row | Mutate one row under queue | explicit `runId` or full row | Must avoid stale current-row reads. |
| `listRunHistory(limitPerAgent)` | Single-agent workspace history | Return display-ready summaries | limit integer | May repair index summary. |
| `mergeRunTreeWithLiveContexts(nodes, contexts)` | Frontend active row overlay | Merge live status/time and first-user summary | `Map<runId, AgentContext>` | No persistence side effects. |
| `listWorkspaceRunHistory` GraphQL | Workspace history | Return groups with `summary` | limit integer | API shape unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `recordRunActivity` | Yes | Yes | Low | Clarify candidate summary semantics in tests/comments if changed. |
| Index store mutation API | Yes | Yes | Low | Keep generic only to row mutation, not domain policy. |
| `mergeRunTreeWithLiveContexts` | Yes | Yes | Low | Add summary overlay in same owner. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| History row title | `summary` | Existing API name is broad but entrenched | Medium | Keep API; encode semantic in helper/test names like `firstRunSummary` / `initialUserSummary`. |
| Candidate user message | `summary` parameter | Ambiguous | Medium | Treat as candidate in implementation comments/test names. |
| Live overlay | `mergeRunTreeWithLiveContexts` | Yes | Low | Keep. |

## Applied Patterns (If Any)

- Repository/store atomic update: the index store provides serialized persistence mechanics.
- Projection/read model: `AgentRunHistoryService` returns display-ready history rows from stored index plus recovery projection.
- Adapter/overlay: frontend live merge adapts active runtime context onto persisted tree rows.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | File | Run-history summary policy | Preserve first summary for single-agent rows | Existing service owner | Transport/UI logic |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-store.ts` | File | File-backed index persistence | Atomic queued row mutation | Existing write queue | Domain-specific title policy beyond applying reducer |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | File | Single-agent history read model | Summary recovery before list return | Existing list owner | WebSocket command handling |
| `autobyteus-server-ts/src/run-history/services/run-history-service-helpers.ts` or new `run-history-summary.ts` | File | Shared run-history helper | Summary compaction/first-summary selection | Existing helper area | UI formatting/colors |
| `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | File | Frontend active tree overlay | First-user summary overlay plus status/time | Existing overlay owner | Row rendering/actions |
| `autobyteus-web/utils/runTreeSummary.ts` or helper in `runHistoryReadModel.ts` | File | Frontend summary extraction | First non-empty user message extraction | Avoid duplicate logic | Backend persistence concerns |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services` | Main-Line Domain-Control | Yes | Low | Run-history services already own read/write policy. |
| `autobyteus-server-ts/src/run-history/store` | Persistence-Provider | Yes | Low | Keep only storage/atomicity mechanics here. |
| `autobyteus-web/utils` / `stores` | Frontend projection/support | Yes | Low | Existing run tree projection is already split from Vue rendering. |
| `autobyteus-web/components/workspace/history` | Presentation | Yes | Low | No title policy change should land here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Summary invariant | Existing summary `First task` + candidate `do it` -> stored summary remains `First task`, `lastActivityAt` updates | Assign `summary = content` on every accepted message | Directly captures the bug. |
| Frontend active overlay | Live conversation `[First task, do it]` + row summary `do it` -> displayed summary `First task` while active | Vue row computes latest `conversation.messages.at(-1)` | Keeps presentation thin and stable. |
| Atomic write | Queue current-row read and write together | Read row, await unrelated async work, queue write later | Prevents stale empty summary decisions. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep latest-message summary for single-agent rows behind a fallback | Might preserve current behavior for users who expect latest preview | Rejected | `summary` is stable initial title for workspace history. |
| Add separate frontend-only `displayTitle` field while backend stays mutable | Quick UI patch | Rejected | Backend summary invariant must be fixed. |
| Add a new GraphQL field and keep old `summary` ambiguous | Avoid changing semantics | Rejected | Tighten `summary` semantics; no dual authoritative title fields. |

## Derived Layering (If Useful)

- Transport: WebSocket handlers pass candidate user message content.
- Domain/control: Agent run service and run-history services coordinate lifecycle and history policy.
- Persistence: Index stores serialize file-backed rows and atomic mutation.
- Frontend projection: Run tree projection merges backend history and live context.
- Presentation: Vue row components render projected labels.

## Migration / Refactor Sequence

1. Add/adjust server summary helper for compacting and choosing first non-empty summary.
2. Add an atomic queued row mutation method to `AgentRunHistoryIndexStore` (or equivalent service/store shape) so current row read and write happen in one serialized operation.
3. Update `AgentRunHistoryIndexService.recordRunActivity` to use the atomic operation and preserve first summary under overlap.
4. Add single-agent read-side summary recovery in `AgentRunHistoryService` for active rows and rows with missing summaries. If implementation can safely compare canonical projection summary against stored summary for active rows, update the returned row and repair the index when they differ.
5. Extract frontend first-user summary helper from draft logic or add a new helper.
6. Update `mergeRunTreeWithLiveContexts` to overlay `summary` with the live context's first non-empty user message when available, while still updating status/time.
7. Add focused backend/frontend tests.
8. Run focused tests after dependency/bootstrap issue is resolved; record any blocker with exact command/output.

## Key Tradeoffs

- Backend plus frontend fix is broader than a one-line UI patch, but it fixes durable state and active display.
- Repairing only active/missing current rows avoids expensive all-history projection work and avoids surprising changes to old inactive rows.
- Keeping GraphQL `summary` avoids API churn, but requires tests/comments to make the tightened meaning clear.

## Risks

- Existing inactive rows already mutated to a later message may remain until a future rebuild/repair.
- Overly aggressive repair could override synthetic/internal summaries such as compaction tasks; implementation should scope repair carefully.
- Worktree dependency setup may block local validation until `node_modules`/`tsc` are available.

## Guidance For Implementation

- Do not modify `WorkspaceHistoryWorkspaceSection.vue` to inspect conversations; keep it rendering `summary`.
- Prefer deterministic tests around atomicity; avoid flaky timing-only assertions.
- Add a frontend test where a history row summary is `do it` but live context first user is `First task` and latest user is `do it`; expected merged summary is `First task`.
- Preserve existing team tests; if shared server helper changes team code, run `team-run-history-index-service.test.ts` as well.
- If tests cannot run in the isolated worktree, record the dependency/bootstrap blocker and exact failed command in the implementation handoff.
