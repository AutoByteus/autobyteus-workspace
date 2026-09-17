# Design spec — ORG-HISTORY-LATENCY-20260917-001

## Solution and approval basis

DS-001 / SR-003, Ready. Requirements SR-001 approved by explicit user response recorded SR-002 (2026-09-17). BEH-001/002, SCN-001/002, REQ-001–003, AC-001–003 unchanged. No behavior-defining supplements. Canonical investigation: same ticket directory/investigation-notes.md. Workspace and pinned base in bootstrap-handoff.md. Reading order: evidence → behavior → ownership/publication → concrete files → verification.

## Current-state read and architecture investigation evidence

E-002/003 confirm that the existing parallel queries settle together before raw workspace publication, and raw Org publication additionally waits for avatar loading and active reconciliation. E-004 compares pinned personal source, not historical runtime. E-005 shows backend is not index-only, without establishing a backend timing defect.

E-006 establishes a second relevant boundary: the actual sidebar reads cached navigationProjection, not the raw slices. Current fetchTree rebuilds this projection only after the full loader finishes. Therefore moving the Org array assignment alone is not an adequate solution. The existing projection can render Org-only history without workspace catalog completion. Its synchronous rebuild preserves equal nodes and stable identity; use it, do not add reactive whole-tree watchers.

Sources: stores/runHistoryLoadActions.ts, runHistoryStore.ts, runHistoryNavigationStoreActions.ts, runHistoryNavigationProjection.ts; composables/useWorkspaceHistoryTreeState.ts; utils/runTreeProjection.ts; components/workspace/history/WorkspaceAgentRunsTreePanel.vue. Exact read findings in E-006. Remaining uncertainty: user's actual delay split and representative response-to-DOM timing; API validation must measure, not infer.

## Intended change

Remove unrelated waits from each successful family's publication path, including publication to the rendered navigation projection. Preserve the promise lifetime of fetchTree: it still awaits both family operations and existing workspace enrichment/reconciliation before final completion. Earlier visibility is not achieved by untracked fire-and-forget work, additional polling, a timeout, or early loading=false.

## Relevant behavior and production-path map

| Behavior | Approved trigger / authority | Target path / lifecycle |
|---|---|---|
| BEH-001 | SCN-001 normal sidebar mount, REQ-001/003, AC-001/003 | DS-001: mount → history store → family query → accepted slice + synchronous navigation publication → existing sidebar; enrichment cannot gate it. |
| BEH-002 | SCN-002 periodic/focused refresh, REQ-002/003, AC-002/003 | DS-002/003: same full loader or focused Org action → own success/error handling + generation check → accepted projection; retained contexts/reconnect owners unchanged. |

## Relevant supplemental task artifacts

bootstrap-handoff.md records isolation/base. validation/publication-order-probe.cjs and .log are existing-defect diagnostic evidence only, not acceptance tests. User screenshots linked in investigation notes show states, not timings. No Product prototype requested or needed for unchanged UI structure.

## Task design health assessment

Posture: Bug Fix / responsiveness. Root cause: Local Implementation Defect (incorrect sequencing in existing history load owner), including failure to publish its established navigation read model early. Refactor needed now: No structural refactor; replace local settlement orchestration. Existing store, query/parser boundaries, projection owner and file placement remain appropriate. No duplicate state authority or new scheduling service. Existing backend tree reads may still cost time; that unmeasured adjacent concern is excluded, not masked by a performance claim.

## Terminology

Family = workspace history (standalone Agents and Teams) or Org history. Publication = updating accepted family state AND refreshing the existing navigation projection, not merely resolving a promise. Enrichment = existing avatar loading and active Agent/Team reconciliation after workspace response acceptance.

## Legacy removal policy and removal/decommission plan

No compatibility branch or retained delayed-publication mode. Remove the initial all-results-before-any-publication barrier and the Org-after-workspace-enrichment block. Replace with family-local completion handlers within the existing loader. Keep final completion join for lifecycle bookkeeping. No files/services decommissioned; no feature flag, old/new reader or parallel cache.

## Persisted data / state transition decision

Not Affected. Changes are frontend scheduling and in-memory projection publication only. Existing query, strict parser, backend catalog/tree readers/writers, IDs and stored representation unchanged. No profile/data inspection needed to authorize schema change because none proposed. No migration, reset, rebuilding authored history or loss accepted (REQ-003). Migration plan N/A.

## Data-flow spine inventory and primary execution spines

| ID | Scope, owner | Flow / why |
|---|---|---|
| DS-001 | Primary end-to-end, runHistoryStore / load actions | Sidebar mount → fetchTree → bound-backend readiness → concurrent existing history queries → each validated family completion → accepted slice + navigation topology → Vue sidebar. Makes ready history usable. |
| DS-002 | Primary end-to-end, same history owner | Existing quiet timer → refreshTreeQuietly → DS-001 loader; or focused Org event → refreshAgentOrgHistory → same strict Org reader/generation ownership → topology → sidebar. Preserves refresh behavior. |
| DS-003 | Bounded local, loader | Workspace acceptance/publication → avatar enrichment → active Agent/Team reconciliation → completion join → existing final topology refresh/loading settlement. Preserve lifecycle work without gating Org visibility. |

## Spine narratives and main-line nodes

Sidebar initiates the existing public store action. The loader waits for backend readiness, starts the same two queries concurrently, and handles each outcome independently. On success, each handler validates and publishes through the history store's established topology action. Vue consumes the updated projection immediately on its next render, even if the other family or workspace enrichment is pending. After both branches finish, existing final refresh incorporates completed enrichment/context changes.

For Org, newest-initiated generation authority is checked before any slice/error/topology/reconciliation effect. A stale response does nothing. For workspace, retain existing query acceptance policy; no new generation or cancellation semantics. Synchronous projection uses both current accepted slices, never a captured snapshot of the other family, so one success does not erase the other. Async errors are caught at the family boundary.

## Ownership map / thin entry facades

- WorkspaceAgentRunsTreePanel: mount/timer and rendering; no new query or sequencing policy.
- runHistoryStore.fetchTree: public action, final completion refresh; state owner and synchronous refreshRunNavigationTopology action.
- runHistoryLoadActions: query acceptance, per-family error/generation rules, publication order, awaited enrichment lifecycle.
- Existing GraphQL APIs/strict parser: transport/domain validity unchanged.
- runHistoryNavigationStoreActions/projection: owns projection construction and revision, no async/network work.
- Org/Agent/Team context stores: runtime/recovery/stream authority, not replaced by history publication.

## Return/event and bounded local detail

Each response → own handler → own accepted slice/error. Successful slice → store.refreshRunNavigationTopology(reason) in same synchronous turn. The reason is diagnostic only. Vue next render is the UI return effect. Org retained-history recovery is dispatched through existing reconcileRetainedHistory after publication; no awaiting inspection or activating a stopped run to list it. Full loader final join only controls operation completion and existing loading behavior.

## Off-spine concerns

| Concern | Owner served | Rule |
|---|---|---|
| Avatar enrichment | Workspace branch | Keep existing function and best-effort handling; occurs after workspace publication, cannot gate Org. |
| Active hydration/reconnect | Workspace branch | Reuse existing reconciler unchanged and await it as before; preserve inactive cleanup/status locks and selectRun:false. |
| Strict Org parse | Org branch | Same decoder/correlation validation; do not publish malformed partial response. |
| Retained Org recovery | Org contexts | Same guarded synchronous dispatch on accepted current Org rows; do not duplicate on stale response. |
| Navigation projection | History store | Use existing boundary at every accepted slice; no new cache or watcher. |

## Ownership boundaries / encapsulation / dependency rules

UI continues calling history store only. Load actions receive the existing store capability; add required `refreshRunNavigationTopology(reason: string): void` to RunHistoryFetchStoreLike. Do not import or duplicate the lower-level projector into the loader. Do not use an optional no-op publication callback: real callers must publish. Tests using structural store doubles must provide the method. Projection continues reading accepted state only, without backend access. No UI→GraphQL bypass, no new backend endpoint, no refreshAgentOrgHistory call from inside full fetch (would duplicate request/increment ownership unexpectedly).

## Interface mapping and checks

| Interface | Subject / identity | Decision |
|---|---|---|
| fetchRunHistoryTree(store, limit, {quiet}) | Full history refresh, existing options | Same signature/completion meaning; local family handling replaces aggregate barrier. |
| RunHistoryFetchStoreLike.refreshRunNavigationTopology(reason) | Existing store navigation read model, no ambiguous subject ID | Required method added to structural type; existing real store already implements it. |
| readAgentOrgHistory(client) | Existing mixed query filtered/strictly parsed to Org roots | Reuse unchanged, opaque root IDs. |
| refreshAgentOrgHistoryForStore | Focused Org request/generation | Preserve existing action + wrapper projection completion; no new reader. |

All singular responsibilities and identity meanings retained; ambiguous selector risk Low. Natural names retained (history family, Org, workspace, navigation topology), no new manager/module names.

## Existing capability reuse / subsystem allocation

Extend history-loading orchestration only. Reuse history state and navigation projection, current parsers, avatar builder, context recovery and runtime reconciler. No new subsystem, schema, shared representation or generic task scheduler. Existing mixed backend facade is not redesigned in this frontend timing ticket.

## Draft file responsibilities → reusable structures → final mapping

Initial candidate was loader only. E-006 adds mandatory projection publication via existing store method; no second source file required merely to implement that method. Existing wrapper final refresh remains useful to reflect enrichment. No reusable structures need extraction: existing RunHistoryFetchStoreLike and history DTOs already represent the contract; do not create parallel family DTOs or outcome registries.

| Path (under autobyteus-web) | Change / final responsibility |
|---|---|
| stores/runHistoryLoadActions.ts | Modify: two locally handled concurrent family operations; accepted slice + immediate existing topology publication; preserve error/generation/enrichment completion; add required method to store-like type. |
| stores/runHistoryStore.ts | Reuse unchanged unless a strictly necessary typing adjustment is discovered. Keep final topology refresh in fetchTree for enriched/context state; do not rely on it as first publication. |
| stores/__tests__/runHistoryStore.spec.ts | Extend real Pinia/action/projection deferred response tests, including already-initialized projection. Cover failures and focused/full overlap. |
| components/workspace/history/__tests__/WorkspaceHistoryFamilyPublication.spec.ts | Add focused rendered regression using real history store and mounted production panel/read model; control query/avatar/hydration boundaries, not returned tree nodes. Ensure unresolved other family does not hide successful rows. |

Update existing structural test doubles only where required by the new method; keep those changes mechanical/scoped. All other production owners unchanged. Tests may reuse existing nearby fixtures without altering production data.

## Applied patterns / target folders / folder boundary check

Local async branches with terminal join, not a new pattern framework. Existing stores folder contains history orchestration; projection remains in its current owner; rendered regression alongside history component tests. No folder moves/additional module layer. Mixed-layer risk Low because no backend/persistence or UI layout logic added to loader. Compact placement is clearer than creating a generic scheduler for two families.

## Concrete sequencing guidance

After common readiness/client acquisition:
1. Start workspace async branch and Org async branch without awaiting either first.
2. Workspace branch: query + existing GraphQL error check → assign workspaceGroups, clear workspace/global error as today → synchronous topology refresh (`workspace-history-ready`) → existing awaited avatar/reconciliation with current workspace error behavior.
3. Org branch: existing read/parse → check captured generation → assign agentOrgHistory, clear own error → synchronous topology refresh (`agent-org-history-ready`) → existing retained-history reconciliation. Catch only into current generation's Org error; preserve old slice on transport/parse failure.
4. Await both handled branches. Common preflight failure retains existing both-family error semantics with Org generation guard. Finally loading=false only for nonquiet invocation. Existing public wrapper refresh at completion remains, reflecting enrichment results even if Org responded first.

Avoid `await Promise.allSettled([rawQueries]); publish ...` because it still gates ready rows. Joining branch promises after each branch publishes is appropriate. No detached promises or inferred empty response on error. Family-local catch must not mark an unrelated successful family failed. A thrown projection/recovery exception stays within its branch's error boundary rather than skipping the other branch; no new transactional rollback/cache mechanism.

## Backward-compatibility rejection log / derived layering

Delayed old publication path: rejected; replace directly. Nested-personal reader/copy: rejected; only learn the publish-before-enrichment pattern. Stored-format compatibility: N/A, no format change. Layers remain UI → store/action → transport; return → accepted state → projection → UI. No new indirection.

## Change sequence

1. Add durable failing tests for actual store/projection and rendered path with settled own response + unresolved dependency. Initialize projection before fetch to avoid lazy-read masking.
2. Replace loader orchestration and wire immediate topology publication; keep final awaited completion/enrichment semantics.
3. Run focused history/store/component regressions; preserve error, generation, empty, quiet and recovery cases.
4. Implementation performs proportional rendered checks; API validates actual isolated browser startup and response-to-DOM timing, then normal expand/select/history retention. Do not use direct API writes as substitute for startup UI proof.

## Verification guidance

REQ-001/AC-001: test Org ready while workspace pending; reverse; both ready/avatar deferred; active hydration deferred. Check getTreeNodes AND actual DOM before releasing deferred work. Definition catalogs may remain pending; history-only workspace must appear. Assert same data eventually after all settle, loading/fetch promise still awaits necessary work.
REQ-002/AC-002: retain prior failed family, successful empty result, strict malformed Org response rejection, older full vs newer focused success and newer failure, quiet error handling. No stale topology publication or recovery dispatch from old Org completion.
REQ-003/AC-003: accepted row IDs/names/count/order, preserved selection/expansion, no duplicate roots; avatar later refresh; active reconciliation still called/completes and normal stream behavior retained; stopped history remains inactive, no Send/create/inference for listing. Browser evidence records query completion→visible family event, not arbitrary elapsed sleep. Existing-defect probe is not a passing acceptance suite.

## Task size and architectural risk (completed design)

- task_size: Small. One production orchestration/type change; existing projection/store method reused; focused store and rendered tests. Documentation volume is not implementation size.
- architectural_risk: Low. Two queries already concurrent; no new request-owner, cancellation/generation policy, runtime ownership, API/schema/persistence/security/deployment change. Correct local ordering and publish through an existing synchronous method. Async preservation tests are mandatory but do not imply a new concurrency framework.
- Escalate as Design Impact if implementation requires changed generation/recovery authority, backend/history schema/index changes, projection ownership rewrite, runtime activation/lifecycle changes, or a broader scheduling framework. Do not silently expand the direct route.

## Tradeoffs, risks and implementation guidance

Each family publication adds a bounded existing topology rebuild (plus final existing enrichment refresh); acceptable local tradeoff for correct progressive visibility. Do not add per-member rebuilds or performance framework. Preserve final loading completion semantics rather than redesign loading UI. Backend response cost can remain; report measured residual honestly. Browser equivalence covers this renderer path; no claim of actual Electron startup timing without that run. User live profile/server is not a test fixture and must not be restarted/reset. No source work, commits, build or integration performed by Solution Designer.
