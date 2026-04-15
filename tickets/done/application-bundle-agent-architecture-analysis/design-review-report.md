# Design Review Report

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

Keep one canonical design-review report path across reruns.
Do not create versioned copies by default.
On round `>1`, recheck prior unresolved findings first, update the prior-findings resolution section, and then record the new round result.
The latest round is authoritative; earlier rounds remain history.

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-spec.md`
- Current Review Round: `12`
- Trigger: re-review after live user feedback required an app-first live Application View, narrowed Execution View, and an explicit Applications -> Workspace handoff spine on `2026-04-15`
- Prior Review Round Reviewed: `11`
- Latest Authoritative Round: `12`
- Current-State Evidence Basis:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/ApplicationShell.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/pages/workspace.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/agentSelectionStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/agentContextsStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/agentTeamContextsStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/runHistorySelectionActions.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/src/application-sessions/services/application-session-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/docs/modules/application_sessions.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/ui/index.html`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/ui/app.js`

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | initial design review | `N/A` | `2` | `Fail` | `No` | Design was close, but publication-dispatch contract and storage-boundary protection were underspecified. |
| `2` | re-review after design-impact fixes | `2` | `0` | `Pass` | `No` | Prior findings were resolved and the platform design became implementation-ready. |
| `3` | re-review after workspace consolidation + external teaching-sample scope expansion | `0` | `1` | `Fail` | `No` | The Brief Studio teaching slice still left the projection/idempotency owner too implicit. |
| `4` | re-review after AR-003 sample-boundary fix | `1` | `0` | `Pass` | `No` | The sample then taught one safe atomic projection/idempotency owner explicitly. |
| `5` | re-review after canonical repo-root application-root revision | `0` | `1` | `Fail` | `No` | The repo-local application-root shape was still ambiguous versus the derived importable root shape. |
| `6` | re-review after AR-004 root-model clarification patch | `1` | `0` | `Pass` | `No` | The runnable repo-local root and packaging-only nested-root rule became explicit. |
| `7` | re-review after application-package-management boundary refinement | `0` | `0` | `Pass` | `No` | Higher-layer application-package management became explicit and decoupled from agent-package intent. |
| `8` | re-review after stricter artifact-centric publication-contract clarification | `0` | `0` | `Pass` | `No` | The target v1 publication model simplified correctly without losing durable journal, dispatch, provenance, or idempotency ownership. |
| `9` | re-review after live-runtime validation / sample-launchability refinement | `0` | `0` | `Pass` | `No` | Malformed application-owned agents are now correctly treated as package-validation failures instead of launch-time surprises. |
| `10` | re-review after host application launch / iframe bootstrap spine clarification | `0` | `0` | `Pass` | `No` | The launch owner, remount invariants, and Electron `file://` handshake rules became explicit enough for implementation. |
| `11` | re-review after app-first page shell / session-presentation clarification | `0` | `0` | `Pass` | `No` | The page-shell owner, metadata tiers, Application / Execution / Details split, and single-live-session UX presentation became explicit enough. |
| `12` | re-review after live user feedback required an explicit Applications -> Workspace execution handoff and a more immersive live Application View | `0` | `0` | `Pass` | `Yes` | The application page shell, narrowed execution scope, single-live-session IA, and workspace deep-link/route-selection ownership are now explicit and implementation-safe enough. |

## Reviewed Design Spec

This refinement is correctly scoped and sufficient at the design level.

Why this round passes:
- `Application View` is now intentionally app-first and near full-screen once a live session exists.
  - `ApplicationShell.vue` remains the authoritative page-shell owner.
  - Host chrome is reduced to navigation, title/status, and primary actions instead of leading with package/session/runtime diagnostics.
- `Execution View` is now explicitly narrow.
  - It is retained member/artifact inspection, not a second full workspace monitor.
  - That matches current code direction: `ApplicationExecutionWorkspace.vue` is already a lightweight retained inspection surface, while the richer monitors still live under `/workspace`.
- The Applications -> Workspace handoff owner is now explicit enough.
  - `ApplicationExecutionWorkspace.vue` is producer-only.
  - `WorkspaceExecutionLink` is the carried identity contract.
  - `workspaceNavigationService.ts` owns route construction.
  - `WorkspaceRouteSelectionController` under `/workspace` is the authoritative consumer that reuses the existing workspace selection/opening logic instead of letting Application components mutate workspace stores directly.
- The design is grounded in real code seams.
  - `pages/workspace.vue` currently has no authoritative route-selection consumer boundary.
  - Workspace focus today is driven by store mutation and run-open coordinators such as `selectRun()`, `openAgentRun()`, and `openTeamRun()`.
  - The new controller concept directly addresses that gap instead of inventing a second execution system inside Applications.
- The session mental model is now honest.
  - Backend/session docs still enforce one live session per application id.
  - The new IA and copy rules reflect that instead of implying concurrent launched versions.
- The app-first sample guidance remains directionally correct.
  - Brief Studio is still required to stop foregrounding ids and backend URLs in the primary hero.
  - The Applications shell and the sample app now point in the same UX direction.
- Prior closures remain intact.
  - `AR-001`, `AR-002`, `AR-003`, and `AR-004` stay resolved.
  - The application-package-management split, launch/iframe/bootstrap spine, and artifact-centric publication contract remain coherent after this refinement.

Non-blocking note:
- The design could carry `WorkspaceRouteSelectionController` more uniformly into every secondary boundary table, but `DS-014`, the explicit authoritative-boundary text, the off-spine concern entry, and the file mapping already make the ownership model clear enough for implementation. That is docs-sync polish, not a design blocker.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `1` | `AR-001` | `High` | `Still resolved` | The design still defines stable `eventId` + `journalSequence`, ordered per-application dispatch, `ApplicationEventDispatchEnvelope`, and explicit `at-least-once` delivery semantics. | No regression. |
| `1` | `AR-002` | `High` | `Still resolved` | The design still keeps reserved platform state in hidden `platform.sqlite`, keeps app-owned state in `app.sqlite`, and validates app-authored SQL before execution. | No regression. |
| `3` | `AR-003` | `High` | `Still resolved` | The Brief Studio slice still defines one correlation key per application session and keeps `brief-projection-service.ts` as the single owner of atomic projection + dedupe. | No regression. |
| `5` | `AR-004` | `High` | `Still resolved` | The design still states that `applications/<application-id>/` is the canonical repo-local runnable root and that nested packaging mirrors are packaging-only unless explicitly provisioned/imported. | No regression. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | application package management -> validated catalog entry | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-002` | app frontend -> app backend | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-003` | host launch -> live app session | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-010` | screen activation -> stable iframe bootstrap delivery | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-011` | iframe ready/timeout/contract signal -> host launch visual state | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-012` | committed launch descriptor -> bootstrapped/failed/retry local state machine | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-013` | application route -> app-first page shell with Application / Execution / Details placement | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-014` | execution-view action -> main workspace monitor focused on the corresponding run/member | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-004` | artifact publication / lifecycle event -> host projection + journal | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-005` | journal -> app event handler side effects | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-008` | engine startup state machine | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-009` | publication dispatch retry loop | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |
| Brief Studio event projection spine | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-packages` | `Pass` | `Pass` | `Pass` | `Pass` | Higher-layer application-package ownership remains explicit and separate from agent-package intent. |
| `application-bundles` | `Pass` | `Pass` | `Pass` | `Pass` | Bundle discovery/validation/catalog authority still owns fail-fast application-owned runtime validation. |
| `application-sessions` | `Pass` | `Pass` | `Pass` | `Pass` | Session truth still owns binding/snapshots/commands while launch/bootstrap UI state stays outside it. |
| host application launch surface | `Pass` | `Pass` | `Pass` | `Pass` | `ApplicationSurface` remains the explicit owner for iframe identity, handshake state, and launch failure/loading state. |
| host application page shell | `Pass` | `Pass` | `Pass` | `Pass` | `ApplicationShell` is now the clear owner for the immersive Application View, mode switching, and metadata placement. |
| host workspace route selection | `Pass` | `Pass` | `Pass` | `Pass` | `WorkspaceRouteSelectionController` is the correct owner for consuming cross-surface execution intent inside `/workspace`. |
| host application execution inspection | `Pass` | `Pass` | `Pass` | `Pass` | `ApplicationExecutionWorkspace` is correctly narrowed to retained member/artifact inspection. |
| `application-engine` | `Pass` | `Pass` | `Pass` | `Pass` | Clean separation from gateway and storage concerns remains intact. |
| `application-storage` | `Pass` | `Pass` | `Pass` | `Pass` | Hidden platform DB + app DB split remains concrete and protected. |
| `application-backend-gateway` | `Pass` | `Pass` | `Pass` | `Pass` | App-scoped gateway remains the right owner for query/command/route/graphql. |
| canonical repo-local app package model | `Pass` | `Pass` | `Pass` | `Pass` | Runnable root and packaging-only mirror rules remain coherent. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| application package source normalization / acquisition helpers | `Pass` | `Pass` | `Pass` | `Pass` | Shared only at the mechanism level; higher-layer product intent remains separate. |
| embedded application-owned runtime integrity validation | `Pass` | `Pass` | `Pass` | `Pass` | Remains one bundle-validation concern under `ApplicationBundleService`. |
| artifact-publication payload + enriched normalized event shape | `Pass` | `Pass` | `Pass` | `Pass` | The design still cleanly separates author payload from platform provenance and stable identity. |
| application iframe launch descriptor + remount invariants | `Pass` | `Pass` | `Pass` | `Pass` | One explicit launch identity remains under `ApplicationSurface`. |
| application page metadata classifier | `Pass` | `Pass` | `Pass` | `Pass` | The app-first shell still has one owner for default-visible vs secondary vs debug metadata. |
| `WorkspaceExecutionLink` | `Pass` | `Pass` | `Pass` | `Pass` | A typed carried identity shape is justified to avoid ad hoc router/query construction from Application components. |
| workspace route-selection consumer | `Pass` | `Pass` | `Pass` | `Pass` | One `WorkspaceRouteSelectionController` is the right reuse point above existing run-open coordinators. |
| `ApplicationEventDispatchEnvelope` | `Pass` | `Pass` | `Pass` | `Pass` | Stable event identity remains distinct from retry-varying delivery metadata. |
| storage layout + reserved-table contract | `Pass` | `Pass` | `Pass` | `Pass` | App DB vs hidden platform DB boundary remains concrete. |
| `Application Root` / repo-local app-root model | `Pass` | `Pass` | `Pass` | `Pass` | The shared root concept still has one authoritative runnable shape plus one explicitly non-discovered packaging mirror. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| application-owned runtime validation outcome | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Broken embedded runtime assets still have one meaning: package validation failure. |
| `NormalizedArtifactPayload` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | The author-facing runtime payload remains simpler and not overloaded with status families. |
| `NormalizedPublicationEvent` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Stable identity + artifact/lifecycle family split remains coherent. |
| `ApplicationRequestContext` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | App-scoped gateway identity remains the right v1 choice. |
| `ApplicationIframeLaunchDescriptor` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Launch-instance identity still has one explicit meaning. |
| page-level metadata tiering policy | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Tier 1 / Tier 2 / Tier 3 classifications still give metadata one explicit presentation meaning. |
| `WorkspaceExecutionLink` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Run/member/origin identity is narrow enough to be useful without becoming a second workspace state model. |
| `ApplicationEventDispatchEnvelope` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Stable `event` plus attempt-specific `delivery` remains the right split. |
| `ApplicationStorageLayout` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Hidden platform DB and app-owned DB remain clear. |
| `Application Root` / repo-local root vs derived importable root | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Canonical repo-local root and packaging-only mirror still have distinct meanings and discovery rules. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| silent skip of malformed application-owned agents until launch | `Pass` | `Pass` | `Pass` | `Pass` | Replacement behavior stays explicit: import/refresh fails at bundle validation time. |
| author-facing `memberArtifact` / `deliveryState` / `progress` publication-family modeling | `Pass` | `Pass` | `Pass` | `Pass` | Replacement v1 contract remains explicit: one artifact publication tool plus platform lifecycle events. |
| application import routed through `AgentPackagesManager` / `AgentPackageService` | `Pass` | `Pass` | `Pass` | `Pass` | Replacement application-package UI/API/service boundary remains explicit enough to execute. |
| full execution monitoring duplicated inside Applications | `Pass` | `Pass` | `Pass` | `Pass` | The replacement path is explicit: retained inspection stays in Applications, full monitoring stays in `/workspace`. |
| ad hoc Application components mutating workspace selection stores | `Pass` | `Pass` | `Pass` | `Pass` | Replacement path is explicit: typed execution link + navigation service + workspace-side route-selection controller. |
| metadata-first `ApplicationShell.vue` header + bound-session card above the launched app | `Pass` | `Pass` | `Pass` | `Pass` | The replacement shape is explicit: app-first page chrome plus an intentional details/debug surface. |
| Brief Studio primary hero foregrounding ids and backend URLs | `Pass` | `Pass` | `Pass` | `Pass` | The replacement sample shape remains explicit: end-user/app-first presentation with diagnostics behind details/debug affordances or docs only. |
| `bootstrapState` / `bootstrapError` embedded in frontend `ApplicationSession` state | `Pass` | `Pass` | `Pass` | `Pass` | The replacement owner remains explicit: `ApplicationSurface` local launch state. |
| split sample-app roots (`autobyteus-server-ts/applications/` vs `examples/external-apps/`) | `Pass` | `Pass` | `Pass` | `Pass` | Replacement root model remains explicit and coherent. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Discovery/validation/catalog authority remains singular and still owns fail-fast embedded runtime integrity. |
| `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Clear top-layer owner for application package list/import/remove/refresh intent. |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-service.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Publication authority keeps the simplified v1 artifact contract without losing durable ownership. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `Pass` | `Pass` | `Pass` | `Pass` | The launch-surface owner remains singular: descriptor identity, waiting/ready/failed state, retry/remount policy, and bootstrap delivery. |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `Pass` | `Pass` | `Pass` | `Pass` | The page-shell owner is now explicit: immersive Application View, primary actions, mode switching, and secondary details/debug placement. |
| `autobyteus-web/components/applications/ApplicationDetailsPanel.vue` | `Pass` | `Pass` | `Pass` | `Pass` | A dedicated secondary metadata surface remains justified so operational provenance does not leak back into the default page chrome. |
| `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue` | `Pass` | `Pass` | `Pass` | `Pass` | The execution surface is correctly narrowed to retained member/artifact inspection and workspace handoff affordances. |
| `autobyteus-web/types/workspace/WorkspaceExecutionLink.ts` | `Pass` | `Pass` | `Pass` | `Pass` | One typed cross-surface execution-link contract is the right responsibility for carried run/member identity. |
| `autobyteus-web/services/workspace/workspaceNavigationService.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Route construction belongs in one producer-side navigation helper, not inline in Application components. |
| `autobyteus-web/composables/workspace/useWorkspaceRouteSelection.ts` | `Pass` | `Pass` | `Pass` | `Pass` | The authoritative consumer boundary correctly belongs inside the workspace module. |
| `autobyteus-web/pages/workspace.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Page-level route consumption is the right host location for applying the typed execution-link intent. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | `Pass` | `Pass` | `Pass` | `Pass` | The richer team monitor remains correctly owned here rather than being reimplemented inside Applications. |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | `Pass` | `Pass` | `Pass` | `Pass` | The richer agent monitor remains correctly owned here rather than being reimplemented inside Applications. |
| `applications/brief-studio/ui/index.html` + `app.js` | `Pass` | `Pass` | `Pass` | `Pass` | Sample UI responsibility is now explicitly app-first; raw ids/URLs are secondary/debug only. |
| `applications/brief-studio/backend-src/services/brief-projection-service.ts` | `Pass` | `Pass` | `Pass` | `Pass` | `AR-003` remains resolved; artifact-centric projection still lands under one atomic owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPackageService` | `Pass` | `Pass` | `Pass` | `Pass` | It may depend on narrow source-acquisition helpers and bundle refresh, but not on agent-package higher-layer surfaces. |
| `ApplicationBundleService` | `Pass` | `Pass` | `Pass` | `Pass` | It still owns embedded runtime integrity validation rather than deferring that work to launch/runtime code. |
| `ApplicationPublicationService` | `Pass` | `Pass` | `Pass` | `Pass` | It still owns normalization and provenance enrichment. |
| `ApplicationSurface` | `Pass` | `Pass` | `Pass` | `Pass` | Callers above it depend on one launch owner; they do not also mutate session bootstrap state or manage iframe remount keys directly. |
| `ApplicationShell` | `Pass` | `Pass` | `Pass` | `Pass` | Callers above it depend on one page-shell owner; they do not also render raw package/session/run metadata above the app while using `ApplicationShell` for page structure. |
| `ApplicationExecutionWorkspace` | `Pass` | `Pass` | `Pass` | `Pass` | It owns retained inspection and emits workspace-open intent; it must not own full monitoring or workspace selection mutation. |
| `workspaceNavigationService` | `Pass` | `Pass` | `Pass` | `Pass` | Producer-side route construction stays outside Application components and outside workspace selection stores. |
| `WorkspaceRouteSelectionController` | `Pass` | `Pass` | `Pass` | `Pass` | It consumes route intent and reuses existing team/agent open paths; Applications do not reach directly into workspace selection internals. |
| repo-local app root discovery / packaging boundary | `Pass` | `Pass` | `Pass` | `Pass` | Repo-local discovery still uses direct child application roots; nested packaging mirrors remain excluded by default unless explicitly targeted. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPackageService` | `Pass` | `Pass` | `Pass` | `Pass` | Authoritative application-package boundary remains explicit and separate from mixed-intent agent-package surfaces. |
| `ApplicationBundleService` | `Pass` | `Pass` | `Pass` | `Pass` | Bundle import/refresh success still consistently implies embedded runtime assets passed validation. |
| `ApplicationPublicationService` | `Pass` | `Pass` | `Pass` | `Pass` | Runtime publication entry remains strict and singular while provenance/journal ownership stays internal. |
| `ApplicationSurface` | `Pass` | `Pass` | `Pass` | `Pass` | The web launch boundary remains explicit enough that callers above it do not need to mix iframe internals and session-store bootstrap mutation. |
| `ApplicationShell` | `Pass` | `Pass` | `Pass` | `Pass` | The page-shell boundary is explicit enough that callers above it do not need to mix app chrome, mode placement, and metadata cards ad hoc. |
| `WorkspaceRouteSelectionController` | `Pass` | `Pass` | `Pass` | `Pass` | The workspace-side consumer boundary is explicit enough that Application components do not need to open runs by mutating workspace stores directly. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `publish_artifact(input)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `appendRuntimePublication(applicationSessionId, publication, producer)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `invokeApplicationEventHandler(applicationId, eventEnvelope)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `listApplicationPackages()` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `importApplicationPackage(input)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `removeApplicationPackage(packageId)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `presentApplicationPage(application, liveSession, pageMode, detailsVisibility)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `commitApplicationLaunchSurface(session, endpoints, retryGeneration)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `WorkspaceExecutionLink` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| workspace route-consumed execution intent | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| repo-local app-root selection / discovery contract | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/` | `Pass` | `Pass` | `Low` | `Pass` | Application import/list/remove remains a distinct product/service boundary. |
| `autobyteus-server-ts/src/application-bundles/` | `Pass` | `Pass` | `Low` | `Pass` | Correct bundle authority below application-package management. |
| `autobyteus-server-ts/src/application-sessions/` | `Pass` | `Pass` | `Low` | `Pass` | Publication authority and session authority remain coherent. |
| `autobyteus-web/components/applications/` launch surface files | `Pass` | `Pass` | `Low` | `Pass` | `ApplicationSurface` + `ApplicationIframeHost` remain one host-side launch boundary with a clear internal split. |
| `autobyteus-web/components/applications/` page-shell files | `Pass` | `Pass` | `Low` | `Pass` | `ApplicationShell` + `ApplicationDetailsPanel` read as one app-first page-shell boundary. |
| `autobyteus-web/components/applications/execution/` | `Pass` | `Pass` | `Low` | `Pass` | Execution-specific retained inspection stays grouped under its own folder instead of leaking into default app-view chrome. |
| `autobyteus-web/services/workspace/` | `Pass` | `Pass` | `Low` | `Pass` | Producer-side workspace navigation belongs with workspace navigation helpers, not under Applications. |
| `autobyteus-web/composables/workspace/` | `Pass` | `Pass` | `Low` | `Pass` | Route-intent consumption belongs with the workspace-side controller. |
| `autobyteus-web/pages/workspace.vue` | `Pass` | `Pass` | `Low` | `Pass` | The workspace page is the correct top-level consumer of cross-surface execution intent. |
| repo-root `applications/` container | `Pass` | `Pass` | `Low` | `Pass` | Shared application-package container remains correct. |
| `applications/brief-studio/` root shape | `Pass` | `Pass` | `Medium` | `Pass` | Optional helper/build artifacts remain acceptable because runnable payload and packaging-only mirror rules stay explicit. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| fail-fast application-owned runtime validation | `Pass` | `Pass` | `N/A` | `Pass` | Extending the existing bundle-validation boundary remains the right fix. |
| stricter artifact-centric runtime publication contract | `Pass` | `Pass` | `N/A` | `Pass` | The simplified author-facing contract remains the right extension of current publication foundations. |
| application package source management | `Pass` | `Pass` | `Pass` | `Pass` | Creating a new application-package boundary while reusing only mechanism-level acquisition helpers remains the right split. |
| host-side application launch surface | `Pass` | `Pass` | `Pass` | `Pass` | Extending the existing application view boundary remains the right move. |
| host page-shell / execution split | `Pass` | `Pass` | `Pass` | `Pass` | Reusing `ApplicationShell` + `ApplicationExecutionWorkspace` remains correct; the design tightens ownership instead of inventing a second page framework. |
| deeper execution monitoring | `Pass` | `Pass` | `N/A` | `Pass` | Reusing the existing `/workspace` monitor is the right decision; Applications should not clone it. |
| workspace selection/opening logic | `Pass` | `Pass` | `Pass` | `Pass` | A new route-selection controller above existing `selectRun()` / `openAgentRun()` / `openTeamRun()` is justified and narrowly scoped. |
| canonical repo-local app container | `Pass` | `Pass` | `Pass` | `Pass` | Container and runnable-root model remain aligned. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| silent skip of malformed application-owned agents | `No` | `Pass` | `Pass` | The design explicitly removes the skip-and-warn long-term shape rather than preserving a compatibility path. |
| author-facing old publication-family split | `No` | `Pass` | `Pass` | The design explicitly replaces the old agent-facing family model instead of preserving a dual author contract. |
| application import under `agent-packages` higher-layer surfaces | `No` | `Pass` | `Pass` | The design explicitly removes the mixed-intent long-term shape rather than preserving a wrapper. |
| full execution monitoring inside Applications | `No` | `Pass` | `Pass` | The design explicitly keeps the full monitor in `/workspace` instead of preserving parallel monitoring surfaces. |
| ad hoc workspace store mutation from Application components | `No` | `Pass` | `Pass` | The design explicitly replaces this with a typed route-intent handoff plus workspace-side consumer boundary. |
| metadata-first default Application View chrome | `No` | `Pass` | `Pass` | The design explicitly replaces metadata-heavy page chrome with an app-first shell and secondary details/debug placement. |
| sample UI foregrounding platform/debug ids and URLs | `No` | `Pass` | `Pass` | The design explicitly replaces debug-first sample chrome with an end-user/app-first default. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| fail-fast application-owned runtime validation cutover | `Pass` | `Pass` | `Pass` | `Pass` |
| stricter artifact-centric publication-contract cutover | `Pass` | `Pass` | `Pass` | `Pass` |
| application-package-management separation | `Pass` | `Pass` | `Pass` | `Pass` |
| bundle / SDK / engine introduction | `Pass` | `Pass` | `Pass` | `Pass` |
| session/publication durability cutover | `Pass` | `Pass` | `Pass` | `Pass` |
| per-app DB migration boundary | `Pass` | `Pass` | `Pass` | `Pass` |
| repo-local app-root normalization | `Pass` | `Pass` | `Pass` | `Pass` |
| host launch-surface / iframe-bootstrap cutover | `Pass` | `Pass` | `Pass` | `Pass` |
| application page-shell / metadata-tiering cutover | `Pass` | `Pass` | `Pass` | `Pass` |
| Applications -> Workspace execution handoff cutover | `Pass` | `Pass` | `Pass` | `Pass` |
| one-live-session application IA / copy cutover | `Pass` | `Pass` | `Pass` | `Pass` |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| fail-fast application-owned runtime validation | `Yes` | `Pass` | `Pass` | `Pass` | The design shows the good shape: malformed embedded app-owned agents fail import/refresh instead of surviving until launch. |
| sample runtime-authoring validity | `Yes` | `Pass` | `Pass` | `Pass` | Brief Studio still teaches valid frontmatter-based agent definitions plus `publish_artifact` tool exposure. |
| stricter artifact-centric author-facing publication contract | `Yes` | `Pass` | `Pass` | `Pass` | The good author-facing shape remains `publish_artifact`, and the old family split stays removed. |
| application-package-management boundary | `Yes` | `Pass` | `Pass` | `Pass` | The design still names the good shape and rejects the mixed-intent agent-package anti-shape. |
| publication dispatch contract | `Yes` | `Pass` | `Pass` | `Pass` | Stable event identity and delivery semantics remain concretely shown. |
| application-first live Application View | `Yes` | `Pass` | `Pass` | `Pass` | The design now shows the good shape: minimal chrome around a near-full-screen live app canvas. |
| Execution View scope | `Yes` | `Pass` | `Pass` | `Pass` | The design explicitly rejects duplicating the full workspace monitor inside Applications. |
| Applications -> Workspace execution handoff | `Yes` | `Pass` | `Pass` | `Pass` | The design now includes a concrete carried-identity contract and a workspace-side consumer boundary. |
| single-live-session user-facing language | `Yes` | `Pass` | `Pass` | `Pass` | The design explicitly ties `Launch` / `Relaunch` / `Stop current session` wording to current backend session semantics. |
| sample app-first visible presentation | `Yes` | `Pass` | `Pass` | `Pass` | Brief Studio still has an explicit visible anti-shape to avoid: leading with ids and backend URLs instead of the brief workflow. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| `None` | No blocking design gaps remain after the Applications -> Workspace handoff clarification. | Proceed to implementation with the reviewed package. | `Closed` |

## Review Decision

- `Pass`: the design is ready for implementation.
- `Fail`: the design needs upstream rework before implementation should proceed.
- `Blocked`: the review cannot finish because required input, evidence, or clarification is missing.

**Current decision: `Pass`**

## Findings

None.

## Classification

`None (Pass)`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must keep `Application View` genuinely app-first; do not let secondary package/runtime/session provenance drift back into the default above-the-fold page chrome.
- Implementation must keep `ApplicationExecutionWorkspace` narrow; do not rebuild full team/agent monitoring, chat, or run-history navigation inside Applications.
- Implementation must route Applications -> Workspace handoff only through the typed execution-link contract and the workspace-side consumer boundary; do not reintroduce direct workspace-store mutation from Application components.
- Implementation should ensure `WorkspaceRouteSelectionController` handles both team and agent targets, including paths that require existing open/hydration coordinators, rather than hard-coding only one runtime kind.
- Implementation must keep the current one-live-session-per-application semantics explicit in actions and copy; do not imply concurrent launched versions before the backend model changes.
- The current Brief Studio sample files in the repo still reflect the prior debug-heavy visible UI; implementation must complete the visible sample cleanup so ids and backend URLs do not dominate the primary hero.
- `AR-001`, `AR-002`, `AR-003`, and `AR-004` remain resolved in design and should not be reopened casually during implementation without a fresh design review.
- The remaining risk is implementation discipline and cutover quality, not design readiness.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: The design now makes the live Application View app-first, keeps Execution View intentionally narrow, reflects the one-live-session-per-application model honestly, and defines an explicit Applications -> Workspace handoff boundary through `WorkspaceExecutionLink`, `workspaceNavigationService`, and `WorkspaceRouteSelectionController`. The package is ready for implementation.
