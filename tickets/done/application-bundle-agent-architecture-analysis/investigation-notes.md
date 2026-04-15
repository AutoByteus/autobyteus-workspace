# Investigation Notes

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Investigation Status

- Bootstrap Status: Completed. Original independent review happened in a dedicated review worktree, and the ticket artifacts are now consolidated into the implementation worktree as the canonical workspace.
- Current Status: The AR-004 root-model clarification patch has been applied. A new user-driven design refinement now requires cleaner higher-layer separation: application package management should no longer piggyback on agent-package API/service/UI ownership in the long-term architecture. The latest user escalation also requires deep design clarification of the Electron application-launch/iframe-bootstrap spine because Brief Studio can still hang on `Initializing application...` even after local bug fixes. After launch success, user feedback now highlights a second design-impact issue: the Applications page is still too metadata-heavy and not app-first enough above the fold.
- Investigation Goal: Replace the junior engineer's requirements/design as authoritative input with an independent repository-grounded architecture basis aligned to the article _Rethinking Application Architecture In The Agent Era_.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The ticket spans bundle import, runtime/session integration, promoted publication state, host UI layering, new SDK boundaries, worker hosting, and app-scoped persistence/storage design.
- Scope Summary: Independent upstream architecture review and redesign for the AutoByteus application platform so imported apps can become platform-hosted real apps with app-owned frontend/backend/domain logic and platform-owned hosting/runtime/storage boundaries.
- Primary Questions To Resolve:
  - What application-bundle/application-session/runtime-promotion behavior already exists in the repository today?
  - Which junior requirements/design conclusions were grounded, overstated, or prematurely design-binding?
  - What top-level architecture does the article actually require?
  - Where should authority live for frontend SDK, backend SDK, App Engine/worker lifecycle, storage provisioning, publication promotion, and app backend transport?

## Request Context

- User provided the junior engineer's `requirements.md` path and asked for an independent analysis of the requirement quality against the source code.
- User explicitly said to create our own worktree if the junior requirement is not trustworthy.
- User later provided the full article text for _Rethinking Application Architecture In The Agent Era_ and confirmed that the target direction is:
  - real imported apps, not iframe skins,
  - app-owned frontend/backend/schema/repos/services,
  - platform-owned App Engine/worker hosting,
  - platform-run migrations and per-app DB provisioning,
  - runtime-event to app-logic bridge,
  - frontend and backend SDK boundaries.
- After the platform implementation started, the user added a follow-on requirement: the original ticket should also yield one simple full-stack sample application that teaches app authors how to build on the new platform.
- The user explicitly clarified that the implementation worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation` is the active code context for this follow-on sample-app slice.
- The user also clarified that this sample-app slice should be treated as an additional requirement on the original ticket rather than a separate ticket/worktree.
- The user then refined that requirement further: the teaching sample should initially be treated as an external/imported app rather than a built-in app because that better demonstrated the real app-author workflow.
- The user later refined the design again: repo-local sample/shipped apps should move under one canonical repo-root `applications/` container, built-in-vs-imported should not imply a different architecture, and the directory containing `application.json` should be treated as the application root.
- The user then pushed the long-term naming/ownership issue further: application import should not stay conceptually hidden under `Agent Packages`; instead, higher-layer application package management should be separated by business intent even if lower-level mechanics are shared.
- The user also asked to consolidate ticket docs into the implementation worktree and clean up the extra unused worktrees.
- The user has now explicitly escalated the current Electron launch hang as a Design Impact review request and asked for deep design clarification of launch ownership, iframe identity/remount rules, bootstrap handshake rules, and packaged-host (`file://`) behavior instead of continuing only with local patching.
- After the launch started working, the user escalated another Design Impact concern: the default Applications page still foregrounds package/runtime/session metadata rather than the app UI itself, and the UX still leaves the single-live-session launch model too implicit.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Canonical Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation`
- Canonical Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis`
- Current Branch: `codex/application-bundle-agent-architecture-analysis-implementation`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation`
- Historical Review Workspace (now removed): `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-review`
- Bootstrap Base Branch For Original Independent Review: `origin/personal`
- Expected Finalization Target (if known): not yet determined
- Bootstrap Blockers: none
- Notes For Downstream Agents: The implementation worktree is now the single authoritative ticket workspace for both code and ticket artifacts.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-14 | Command | `git remote show origin` | Resolve base branch confidence | Remote HEAD branch is `personal` | No |
| 2026-04-14 | Command | `git worktree list` | Check whether a dedicated ticket worktree already existed | Junior worktree existed for the same ticket, but not suitable as the authoritative review workspace | No |
| 2026-04-14 | Setup | `git fetch origin --prune && git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-review -b codex/application-bundle-agent-architecture-analysis-review origin/personal` | Create isolated review workspace | Dedicated review worktree created successfully from fresh remote state | No |
| 2026-04-14 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis/tickets/done/application-bundle-agent-architecture-analysis/requirements.md` | Read the junior requirements that the user wanted reviewed | Requirements mixed analysis scope, target behavior, and exact design decisions in one artifact | No |
| 2026-04-14 | Doc | User-provided full article text: `_Rethinking Application Architecture In The Agent Era_` | Use the actual article as authoritative architecture framing input | Article defines the target framing as application logic + application agent runtime + layered UI rendering + delivery/promotion boundary | No |
| 2026-04-14 | Code | `autobyteus-server-ts/src/application-bundles/*` | Verify current bundle/application discovery and contract reality | Bundle discovery, manifest validation, canonical app IDs, embedded app-owned runtime definitions, and asset serving already exist | No |
| 2026-04-14 | Code | `autobyteus-server-ts/src/application-sessions/*` | Verify current runtime/session/promotion boundaries | Backend-owned application sessions, route binding, promoted publication validation, retained projections, and session streaming already exist | No |
| 2026-04-14 | Code | `autobyteus-server-ts/src/application-capability/*` | Verify current Applications capability ownership | Runtime Applications gating is already backend-owned and seeded from discoverable bundles | No |
| 2026-04-14 | Code | `autobyteus-server-ts/src/api/graphql/types/application*.ts`, `src/api/rest/application-bundles.ts`, `src/api/websocket/application-session.ts` | Verify current public server boundaries | Catalog, capability, session lifecycle, asset serving, and session-stream boundaries are all already present | No |
| 2026-04-14 | Code | `autobyteus-web/docs/applications.md`, `docs/application-bundle-iframe-contract-v1.md`, `components/applications/*`, `stores/application*.ts` | Verify current host UI layering and public/implicit contracts | Host already has Application + Execution views, but app-author-facing SDK boundary is still missing | No |
| 2026-04-14 | Code | `autobyteus-server-ts/applications/socratic-math-teacher/*` | Inspect shipped built-in sample bundle | Sample proves bundle structure and iframe bootstrap, but not app-owned backend logic | No |
| 2026-04-14 | Code | `autobyteus-web/applications/socratic_math_teacher/*` | Check for legacy app-specific frontend remnants | Only stale tests remain, indicating prior compile-time app code path is already obsolete | Yes |
| 2026-04-14 | Code | `autobyteus-server-ts/tests/unit/application-bundles/*`, `tests/unit/application-sessions/*`, `tests/unit/application-capability/*` | Confirm implemented current behavior | Tests cover bundle validation, session binding, publication handling, and capability gating | No |
| 2026-04-14 | Code | `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` | Verify runtime ownership layer | Runtime abstraction already lives in the server layer, not `autobyteus-ts` | No |
| 2026-04-14 | Code | `autobyteus-server-ts/src/config/app-config.ts` | Verify authoritative storage/path ownership | `AppConfig` already owns data-dir/db/log/temp path derivation and is the correct extension point for per-app storage | No |
| 2026-04-14 | Code | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts`, `src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts` | Check existing child-process and RPC patterns | Existing stdio-RPC and managed-process lifecycle patterns are reusable for the future App Engine | No |
| 2026-04-14 | Code | `pnpm-workspace.yaml` | Verify monorepo package topology for new SDK packages | New publishable SDK packages can be added as additional workspace members | No |
| 2026-04-14 | Doc | `tickets/done/application-bundle-import-ecosystem/*` | Recover prior platform direction and avoid rediscovering settled foundations | Prior ticket already moved the repo toward bundle/session/publication/capability architecture; junior ticket under-accounted for these implemented foundations | No |
| 2026-04-14 | Doc | `.codex/skills/autobyteus-solution-designer-3225/design-principles.md`, `references/design-examples.md` | Keep design artifact aligned with team design language | Spine-first, ownership-first, no mixed-level dependency, no backward-compatibility wrappers | No |
| 2026-04-14 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-review/tickets/done/application-bundle-agent-architecture-analysis/design-review-report.md` | Absorb architect review findings and identify required upstream rework | Review direction was positive overall, but found two design gaps: AR-001 durable publication-dispatch contract and AR-002 reserved platform-state protection from app-authored SQL | No |
| 2026-04-14 | Spec | revised `design-spec.md` round after architect review | Close the two authoritative design gaps before implementation | Revised design now makes publication dispatch explicitly at-least-once with stable `eventId` + `journalSequence`, and moves reserved platform state into hidden `platform.sqlite` with migration validation that restricts app-authored SQL to `app.sqlite` | No |
| 2026-04-14 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-application-sdk-contracts/*`, `autobyteus-application-frontend-sdk/*`, `autobyteus-application-backend-sdk/*` | Verify the actual implementation state for the follow-on sample-app slice | The SDK packages are now real implementation artifacts and should be the teaching surface for the sample app | No |
| 2026-04-14 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/docs/modules/application_*.md`, `autobyteus-web/docs/applications.md`, `application-bundle-iframe-contract-v1.md` | Verify the implemented docs and platform boundaries the sample app must teach | The platform now has real docs for engine/storage/gateway/session/bootstrap boundaries, so the sample can teach real current behavior instead of speculative APIs | No |
| 2026-04-14 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-server-ts/applications/socratic-math-teacher/*` | Inspect whether the current built-in sample already satisfies the follow-on teaching need | Current sample is intentionally shallow: one-member team, placeholder UI, stub backend, no migrations/repos/services/query-command flow | No |
| 2026-04-14 | Setup | Consolidate ticket docs into the implementation worktree and remove the extra unused worktrees | Eliminate split-brain between upstream docs and active implementation | The implementation worktree is now the only active worktree for this ticket | No |
| 2026-04-14 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-review-report.md` (round 4) | Confirm the reviewed package status before the next design iteration | Round-4 is currently authoritative and `Pass`; AR-001/AR-002/AR-003 are resolved in the reviewed package | No |
| 2026-04-15 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-review-report.md` (round 5) | Absorb architect feedback on the canonical repo-local application-root revision | Round-5 introduced AR-004: choose one canonical repo-local runnable root model and explicitly demote nested `dist/importable-package/...` roots to packaging-only unless explicitly provisioned/imported | No |
| 2026-04-15 | Command | `find . -maxdepth 1 -type d`, `find . -maxdepth 2 -type d \( -name 'applications' -o -name 'apps' -o -name 'examples' -o -name 'sample-apps' -o -name 'external-apps' \)` and `rg -n "autobyteus-server-ts/applications|examples/external-apps|built-in|external/imported" autobyteus-server-ts autobyteus-web autobyteus-application-* tickets` | Evaluate the user's proposed repo-local app-root rename and measure current path coupling | Repo currently mixes `autobyteus-server-ts/applications/` and `examples/external-apps/`; many docs reference the old split, which confirms this is a real design-impact path change rather than a cosmetic rename | Yes |
| 2026-04-15 | Code | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts`, `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts`, `autobyteus-web/stores/agentPackagesStore.ts`, `autobyteus-web/components/settings/AgentPackagesManager.vue` | Verify whether current import management is still agent-package-oriented at the higher layers | Current import UX/API/service boundaries are explicitly agent-package-owned while also refreshing application bundles as a side effect; this confirms the long-term separation concern is real and not just naming preference | Yes |
| 2026-04-15 | Code | `autobyteus-server-ts/src/application-sessions/tools/publish-application-event-tool.ts`, `autobyteus-server-ts/src/application-sessions/services/application-publication-validator.ts` | Verify whether the current runtime publication contract is over-modeled for app authors | Current implementation exposes `MEMBER_ARTIFACT`, `DELIVERY_STATE`, and `PROGRESS` as the agent-facing publication families; user feedback indicates the target design should simplify this to artifact-centric publication with platform-attached provenance | Yes |
| 2026-04-15 | Runtime + Code | Live GraphQL query against packaged Electron backend on `http://127.0.0.1:29695/graphql`; `applications/brief-studio/dist/importable-package/**`; `autobyteus-web/utils/application/applicationLaunch.ts`; `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts`; `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | Investigate the Brief Studio launch error reported by the user | Live server contains the Brief Studio application and application-owned team, but no application-owned agent definitions. Root cause: Brief Studio `agent.md` files are malformed for the current frontmatter parser and are silently skipped by the agent-definition provider; import validation currently does not fail fast on malformed application-owned agents, so the app imports successfully and then fails later at launch. Secondary sample issue: Brief Studio agent configs omit `publish_artifact` from `toolNames`, so artifact publication would fail even after the parse issue is fixed. | Yes |
| 2026-04-15 | Log | `~/.autobyteus/logs/app.log`; `~/.autobyteus/server-data/logs/server.log`; query `rg -n "BriefStudio|ApplicationIframeHost|88dc5177-bd5e-45a9-9720-96ff0b4709f8" ...` | Investigate the later Electron packaged launch hang after the missing-agent issue was addressed | Renderer log shows repeated `[BriefStudio] ready event posted ...` and repeated `[ApplicationIframeHost] iframe loaded ...` for the same live session, but no corresponding `received ready event` or `posted bootstrap payload`; server log is not the primary signal for this failure. This indicates the child iframe is loading and signaling readiness, while the host-side launch/bootstrap spine never stabilizes long enough to deliver bootstrap. | Yes |
| 2026-04-15 | Code | `autobyteus-web/components/applications/ApplicationIframeHost.vue`; `autobyteus-web/components/applications/ApplicationSurface.vue`; `autobyteus-web/stores/applicationSessionStore.ts`; `autobyteus-web/types/application/ApplicationSession.ts`; `autobyteus-web/types/application/ApplicationIframeContract.ts`; `autobyteus-web/utils/application/applicationAssetUrl.ts`; `applications/brief-studio/ui/app.js` | Trace ownership of iframe identity, bootstrap waiting state, ready/bootstrap message handling, and packaged-host origin rules | Current host launch boundary is fragmented: `ApplicationSurface` is thin, `ApplicationIframeHost` mixes descriptor derivation + DOM/message lifecycle + bootstrap delivery + store mutation, and `applicationSessionStore` extends session snapshots with bootstrap state. The iframe contract correlates only by `applicationSessionId`, and packaged-host host-origin handling is serialized but not deeply normalized for reviewed acceptance rules. | Yes |
| 2026-04-15 | Code | `autobyteus-web/components/applications/ApplicationShell.vue`; `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue`; `autobyteus-web/docs/applications.md`; `autobyteus-server-ts/docs/modules/application_sessions.md`; `applications/brief-studio/ui/index.html`; `applications/brief-studio/ui/app.js` | Reassess page-level Application vs Execution UX and current session-presentation semantics after launch succeeds | `ApplicationShell.vue` still renders a large metadata-first header and bound-session card above the app iframe. Docs and backend service confirm the model is single-live-session-per-application, with relaunch replacing the prior live session. Brief Studio sample UI still foregrounds app ids, session ids, runtime ids, and backend gateway URLs in its hero. | Yes |
| 2026-04-15 | Code | `autobyteus-web/pages/workspace.vue`; `autobyteus-web/stores/agentSelectionStore.ts`; `autobyteus-web/stores/agentContextsStore.ts`; `autobyteus-web/stores/agentTeamContextsStore.ts`; `autobyteus-web/stores/runHistorySelectionActions.ts`; `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`; `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`; `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Determine whether the requested Applications -> Workspace execution deep-link can reuse existing workspace selection/hydration logic and what is still missing | Workspace selection today is store-driven and coordinator-driven, not route-driven: `pages/workspace.vue` has no explicit query/deep-link contract, while existing run-history and team-open helpers already provide reusable lower-layer logic for selecting/opening live or historical runs. This confirms the design should add one authoritative route-selection boundary instead of duplicating execution monitoring inside Applications. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - package import validates bundle roots through `ApplicationBundleService`
  - application catalog is served through `ApplicationBundleService`
  - app session launch/bind/send-input happens through `ApplicationSessionService`
  - app visibility gating happens through `ApplicationCapabilityService`
- Current execution flow:
  1. Package import / root registration refreshes apps, agents, and teams together.
  2. `ApplicationBundleService` scans `applications/<app-id>/application.json`, validates `ui/` assets, validates embedded runtime metadata, and exposes catalog metadata with transport-neutral asset paths. Current evidence shows this validation is incomplete for malformed application-owned agent definitions.
  3. Host UI loads application catalog only if the bound node's Applications capability is enabled.
  4. Route entry into `/applications/[id]` binds to the current backend-owned application session via `applicationSessionBinding()`.
  5. Launch flow creates a live app session backed by an agent/team runtime.
  6. Runtime members publish promoted state through `publish_application_event`.
  7. Backend validates and projects that state into retained host-visible session state and streams snapshots to the frontend.
  8. Host UI renders Application View (iframe app UI) and Execution View (host-native retained execution UI).
  9. Inside the Application View path, `ApplicationSurface` passes the resolved live session into `ApplicationIframeHost`, which derives one iframe source URL, waits for a ready message, and then posts the bootstrap payload that activates the bundled frontend SDK.
  10. Current evidence shows this launch/bootstrap phase is too loosely owned: normal reactive updates can still participate in iframe recreation or reset the host handshake path, which is why the packaged Electron run can loop on `ready posted` + `iframe loaded` without ever reaching `bootstrap delivered`.
  11. `ApplicationShell.vue` still renders a metadata-heavy application header and bound-session card before the app iframe, including package id, local app id, runtime target id, writable/source flag, raw `applicationSessionId`, runtime kind, and `runId`.
  12. The current Application/Execution split therefore exists technically but not yet experientially: the Application surface is still preceded by diagnostics-heavy host chrome, while the Execution surface owns member artifacts and runtime details.
  13. Backend and frontend docs both confirm the current session model is one live session per application id; relaunch replaces the current live session instead of creating multiple concurrent launches.
  14. `ApplicationShell.vue` still uses a centered max-width card layout even when a live session exists, so the launched app never feels like it takes over the main surface; the design needs an explicit immersive live-session layout rule instead of just metadata demotion.
  15. `ApplicationExecutionWorkspace.vue` already matches the user's requested high-level interaction better than the current page shell does: it provides a left member rail plus selected-member artifact-first surface, so it should be kept intentionally narrow and should not grow into a second copy of the full workspace monitor.
  16. `pages/workspace.vue` currently has no route/query-driven selection contract; workspace selection is driven indirectly through stores and coordinators such as `selectRun()` and `openTeamRun()`. A future Applications -> Workspace deep-link therefore needs a new authoritative route-selection boundary rather than ad hoc `router.push()` plus direct store mutation from application components.
  17. Existing workspace lower-layer logic is still reusable: `runHistorySelectionActions.ts` and `teamRunOpenCoordinator.ts` already know how to select or hydrate live/historical team/member contexts. The new deep-link design should reuse those capabilities behind one workspace-route owner instead of duplicating open/select logic.
  18. The desired product split is now clearer: `Application View` should feel like using a self-contained app, `Execution View` should show members and their retained artifacts, and `Execution Details` should hand the user off to the main workspace monitor for the full operational experience.
- Ownership or boundary observations:
  - bundle discovery, session lifecycle, publication projection, and availability gating are already distinct boundaries.
  - retained application state is backend-owned today, but still in-memory.
  - the biggest missing boundary is app-owned backend logic/runtime plus its storage/gateway lifecycle.
- Current behavior summary:
  - AutoByteus is already partially in the article architecture, not at the starting line.
  - The future architecture must extend the real foundations rather than replace them with an SDK-only story.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | Application catalog / bundle authority | Real discovery, validation, and canonical IDs already exist | This remains the installation/distribution authority |
| `autobyteus-server-ts/src/application-sessions/services/application-session-service.ts` | Backend-owned app session lifecycle | Launch/bind/send-input/publication entry already live, but state is in-memory | Extend this owner; do not bypass it |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-validator.ts` | Promoted publication validation | Family-tight validation already exists | Strong basis for delivery/promotion boundary |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-projector.ts` | Host retained projection logic | Delivery/artifact/progress retained separately already | Keep host projection independent from app backend event handling |
| `autobyteus-server-ts/src/application-capability/services/application-capability-service.ts` | Runtime Applications availability | Already the correct owner for module availability | Reuse as-is |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Host-side iframe/bootstrap owner | Today it exposes raw host contract details indirectly | Keep host bootstrap internal; add frontend SDK boundary above it |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Host-side application surface boundary | Currently too thin to be the clear launch/iframe owner | Strengthen this boundary so callers above depend on one launch owner instead of mixing surface + iframe + store internals |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Page-level application chrome | Currently mixes app-first identity, launch controls, raw package metadata, raw session/run diagnostics, and mode tabs in one default-visible page header | Make this the explicit owner of app-first vs execution vs details/debug presentation and intentionally demote operational metadata |
| `autobyteus-web/stores/applicationSessionStore.ts` | Session binding/runtime snapshot store | Currently also owns `bootstrapState` / `bootstrapError` for iframe launch | Remove launch/bootstrap state from authoritative session state; keep this store focused on session binding/snapshots/streaming |
| `autobyteus-web/types/application/ApplicationSession.ts` | Shared frontend session types | Currently folds bootstrap state into the session domain shape | Split launch/visual state from session snapshot state in the target design |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | Raw host/iframe handshake contract | Currently correlates only by `applicationSessionId` and serializes host origin, but does not carry a host-generated launch instance id | Add explicit `launchInstanceId` and reviewed packaged-host origin matching rules |
| `autobyteus-web/utils/application/applicationAssetUrl.ts` | Launch URL builder | Currently appends session id + host-origin hints to iframe URL | Keep as descriptor helper, but make it part of a stable launch-descriptor owner rather than an implicit remount trigger path |
| `applications/brief-studio/ui/app.js` | Bundled sample app bootstrap consumer | Posts ready immediately from iframe startup and then waits for host bootstrap | Good probe target for launch-handshake behavior; should remain simple and depend only on the reviewed contract |
| `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue` | Host-native execution rendering | Already artifact/progress-first, but not yet full selected-agent artifact/log layering | Extend host execution UI rather than moving it into the app frontend |
| `autobyteus-server-ts/src/config/app-config.ts` | App-data / DB / logs path authority | Already owns platform path derivation | Correct place to anchor per-app storage roots |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | Managed child-process RPC pattern | Existing stdio JSON-RPC pattern is reusable | Good foundation for worker host RPC |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts` | Managed process supervision pattern | Existing readiness/restart/log capture pattern is reusable | Good foundation for App Engine supervisor |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-14 | Setup | Dedicated review worktree bootstrap | Review can proceed without modifying the junior engineer's workspace | Bootstrap requirement satisfied |
| 2026-04-14 | Probe | Repo search + code reads across application subsystems | Repo already implements bundle discovery, app sessions, promoted publication, capability gating, and layered host UI | Architecture analysis must start from implemented reality, not from zero |
| 2026-04-14 | Probe | Search for app-author SDK packages / public boundaries | No real app-author frontend or backend SDK packages exist yet | New SDK packages are required |
| 2026-04-14 | Probe | Sample bundle inspection | Current built-in sample app proves frontend bundle + runtime target + iframe bootstrap only | Need backend-capable bundle contract and sample migration |
| 2026-04-14 | Probe | Current session storage inspection | Session authority remains in memory maps | Durable session/projection state must replace the current authority |
| 2026-04-14 | Probe | Child-process/runtime pattern inspection | Existing managed-process and stdio-RPC patterns are mature enough to reuse | Future App Engine should extend these patterns instead of inventing a new runtime style |
| 2026-04-15 | Trace | Live packaged Electron run for Brief Studio session `88dc5177-bd5e-45a9-9720-96ff0b4709f8` with renderer-log grep | Repeated child `ready` emissions plus repeated host `iframe loaded` logs with no host `received ready event` / `posted bootstrap payload` demonstrate that the launch/iframe boundary does not currently maintain one stable launch instance long enough to finish bootstrap. | A deeper launch-spine design fix is required in addition to local bug fixes. |

## External / Public Source Findings

- User-provided article text is the authoritative public framing input.
- No other external source was required because the architecture decision is primarily constrained by the current repository and the article.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for architecture investigation
- Required config, feature flags, env vars, or accounts: none
- External repos, samples, or artifacts cloned/downloaded for investigation: none
- Setup commands that materially affected the investigation:
  - `git fetch origin --prune`
  - `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-review -b codex/application-bundle-agent-architecture-analysis-review origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - the original review worktree has been removed after consolidating the ticket docs
  - the implementation worktree is now the single active workspace for this ticket

## Findings From Code / Docs / Data / Logs

1. The repo is already meaningfully inside the article's architecture: application logic, agent runtime integration, layered host UI, and delivery/promotion boundary are all partially implemented.
2. The biggest missing capability is not "frontend SDK" alone; it is the whole app-owned backend logic plane and its hosting/storage/gateway boundaries.
3. The platform should not limit app authors' domain models, repositories, services, or API style, but it must keep infra ownership platform-side.
4. A frontend SDK is required, but only as one boundary inside the larger platform.
5. A backend SDK is also required because managed worker hosting needs a stable exported app definition contract.
6. Per-app isolated storage with platform-run migrations is the cleanest way to preserve app freedom while keeping infrastructure ownership with AutoByteus.
7. Promoted runtime events should become the contract between runtime execution and app-owned domain logic, not raw internal runtime traces.
8. App backend gateway identity should be app-scoped, not session-scoped, with optional session context when needed; otherwise durable app logic becomes trapped inside live-session-only identity.
9. The implemented platform now has enough real surface area that the next missing artifact is a teaching sample, not another abstract architecture explanation.
10. The current `socratic-math-teacher` bundle remains useful as a lightweight bootstrap proof, but it is not sufficient as the main teaching example for app authors.
11. The cleaner long-term repo shape is one canonical repo-root `applications/` container so repo-local shipped apps and imported apps share the same bundle architecture; provisioning/install path can still differ without creating a second app type.
12. The directory containing a valid `application.json` should be treated as the application root, and all manifest-relative paths should resolve from that root.
13. For the design to stay consistent with current bundle-provider evidence, the repo-local `applications/<application-id>/` directory must itself be the bundle-valid runnable root with in-place `ui/`, `backend/`, `agents/`, and `agent-teams/` assets as required by the manifest.
14. Any nested `dist/importable-package/applications/<application-id>/` roots should be treated as packaging-only distribution artifacts and ignored by repo-local discovery unless that path is explicitly provisioned/imported as its own package source.
15. Current higher-layer import management is still agent-package-owned (`AgentPackagesManager`, `agentPackagesStore`, GraphQL `agent-packages`, `AgentPackageService`) even though application discovery benefits from the same root registration, so a long-term clean architecture should separate those business-intent boundaries.
16. The correct separation is: application-specific UI/API/service boundaries at the top, with only mechanism-level source acquisition / root-registration utilities shared below when they are truly concern-agnostic.
17. The best first teaching sample should stay intentionally narrow and show one honest full-stack path: two-member team, event-driven persisted domain state, query/command UI flow, and frontend/backend SDK usage.
18. A simple “researcher -> writer -> review” app shape is a strong pedagogical fit because it naturally demonstrates artifact production, event projection, app-owned persisted review state, and user-driven commands without needing extra infrastructure.
19. Because the sample is supposed to teach at-least-once-safe event handling, it must explicitly define both:
   - the app-owned correlation key that groups researcher and writer outputs into one logical brief, and
   - the single service/transaction boundary that performs dedupe claim plus projection atomically.
20. App-local README documentation inside the application root is important because it teaches the package in place instead of forcing authors to look only at parent sample folders.
21. The current `publish_application_event` tool is over-modeled for the agent mental model because it asks the agent to choose between `MEMBER_ARTIFACT`, `DELIVERY_STATE`, and `PROGRESS` even though the common author intent is simply to publish one produced artifact.
22. Producer/member identity belongs in platform-enriched provenance derived from `applicationSessionContext`, not in the primary artifact family name itself.
23. The target v1 author-facing contract should remove separate `memberArtifact`, `deliveryState`, and `progress` publication families entirely; most app logic can project domain state from artifact publications plus producer provenance, while any host-level status rendering should be derived platform-side rather than taught as extra agent-facing publication families.
24. The current application-package import path validates runtime-target existence and application-owned team integrity, but it does not fail fast on malformed application-owned agent definitions; those parse errors are currently logged and skipped later by the agent-definition provider, which surfaces as a confusing launch-time error instead of an import-time rejection.
25. Brief Studio currently reproduces that gap: the package imports, the application-owned team appears, but the application-owned agents are absent because `agent.md` is missing required frontmatter.
26. Brief Studio also has a sample-authoring mismatch: its agent instructions require `publish_artifact`, but both artifact-producing agents currently declare `toolNames: []`, so the sample would still be incoherent after the parser issue unless tool exposure is fixed too.
27. The current host launch boundary is fragmented across `ApplicationSurface`, `ApplicationIframeHost`, and `applicationSessionStore`; no single owner presently governs iframe identity, bootstrap retry/remount policy, and visual launch state end to end.
28. `ApplicationIframeHost` currently derives the iframe launch descriptor, owns the iframe render key, listens for ready messages, posts bootstrap, starts the ready timeout, and mutates `applicationSessionStore` bootstrap state directly, which means one component mixes transport details, lifecycle state, and cross-store authority.
29. `applicationSessionStore` currently extends backend-owned session snapshots with `bootstrapState` and `bootstrapError`, but those fields are host-launch concerns rather than session-domain truth; keeping them on the session object invites reactive session updates to affect iframe lifecycle.
30. The current iframe contract correlates only by `applicationSessionId`; without a host-generated `launchInstanceId`, the host and child cannot reliably reject stale ready/bootstrap messages when the same session is retried or remounted.
31. Packaged Electron host behavior needs an explicit reviewed origin-normalization rule: the design currently serializes `file://`, but the contract does not yet define one authoritative matcher for packaged-host message acceptance semantics.
32. The live packaged run shows the child iframe can post `ready` before or alongside parent `load` handling, so DOM `load` must remain observational/diagnostic rather than an authority that resets or restarts the handshake state machine.
33. Host bootstrap completion and app-local initial data loading are different boundaries: the host launch spine ends when bootstrap is delivered to the correct iframe launch instance, while first query/command fetches and any app-local empty/error/loading states belong to the imported application itself.
34. The current host page chrome is still metadata-first rather than app-first: `ApplicationShell.vue` shows package/runtime/session diagnostics above the embedded app UI, which works against the article's intended `Application View` mental model.
35. The metadata currently shown above the fold falls into at least three tiers that should be separated intentionally:
   - user-facing app identity/status (name, description, live/not live, launch/relaunch actions),
   - secondary operational details (package id, writable/source, runtime target id, current session/run ids),
   - developer/debug-only transport diagnostics (backend gateway URLs, raw asset paths, package roots).
36. The current session model is explicitly single-live-session-per-application. The UX should therefore say `Launch` / `Relaunch` / `Stop current session` and should not imply that multiple concurrently launched versions will appear somewhere in the Applications page.
37. `Application View` and `Execution View` need a clearer product split: the former should primarily deliver the launched app UI, while the latter should own members, retained artifacts, runtime identifiers, and deeper operational inspection.
38. Brief Studio currently teaches too much platform/debug metadata in its default hero (`application ids`, `session id`, `run id`, `backend gateway URLs`), so the sample's visible UX should be tightened to an end-user/app-first story with optional details/debug affordances only when explicitly opened.
39. The live-session Application surface should use a different page-shell layout from the non-live prelaunch state: once a live session exists, the host should collapse to minimal chrome and give most of the page height/width to the app canvas instead of keeping a catalog-style centered card layout.
40. `Execution View` should remain intentionally retained-state/artifact-first. It is the correct place for member selection and artifact browsing, but not for recreating the team chat monitor, team grid/spotlight, or composer that already exist in `/workspace`.
41. A clean Applications -> Workspace handoff needs one explicit carried identity shape, at minimum `selectionType`, `runId`, and optional `memberRouteKey`, with optional origin metadata such as `applicationId` / `applicationSessionId` used only for return navigation or breadcrumbs.
42. Because `/workspace` currently has no authoritative route-selection contract, the design needs to add one explicit workspace route-selection owner that interprets the carried identity and then reuses existing run/team opening coordinators behind that boundary.
43. The Applications module should remain application-centric under the current session model: one app page binds to at most one live session, relaunch replaces that session, stop returns to a non-live state, and multi-session browsing/history should not leak into the default Applications IA until intentionally designed later.

## Constraints / Dependencies / Compatibility Facts

- Authoritative ticket artifacts now live in the implementation worktree ticket folder.
- The follow-on sample-app code should live in the implementation worktree rather than in a separate new ticket worktree.
- The design must extend the real current owners already present in `application-bundles`, `application-sessions`, and `application-capability`.
- `AppConfig` remains the authoritative owner for platform storage path derivation.
- Runtime abstraction ownership remains in the server layer, not `autobyteus-ts`.
- Existing raw iframe bootstrap details may remain internally implemented in host code, but they must not remain the author-facing boundary.

## Open Unknowns / Risks

- Exact implementation sequencing will matter because the scope is large and cross-cutting.
- SQL-file migrations as the platform-run v1 migration model are a deliberate narrowing that still needs careful author guidance.
- Route/GraphQL/notification flexibility can bloat the gateway if the request-context and transport adapters are not shared.
- Future multi-install identity may eventually require splitting `applicationId` from installation identity, even though v1 can collapse them.
- At-least-once event delivery means backend SDK docs and validation examples must teach app authors how to make handler side effects idempotent against stable event ids.
- The sample-app name is still adjustable, but the current confirmed direction is a brief/review teaching app rather than a more complex domain.
- Moving from split built-in/example paths to one canonical repo-root `applications/` container is a real design-impact change because it touches reviewed docs, sample layout assumptions, and likely implementation/discovery paths.
- The new `applications/` naming must remain clear about one important distinction: a repo-local app package and a later user-imported app share the same architecture, but discovery/install source still determines how the platform finds and provisions them.
- If the design does not explicitly demote nested `dist/importable-package/...` roots to packaging-only artifacts, bundle discovery becomes ambiguous because current provider evidence validates direct-child roots in place.
- If the design leaves application import under `AgentPackageService` / `AgentPackagesManager` long-term, the top-layer architecture will remain mixed-intent and violate the product/domain boundary the user wants.
- If the design keeps separate `memberArtifact` / `deliveryState` / `progress` agent-facing publication families in the target v1 contract, app authors will inherit a more complicated mental model than the user wants and the sample app will teach the wrong runtime boundary.
- If application package validation continues to ignore malformed application-owned agent definitions, users will keep seeing launch-time missing-definition failures after apparently successful imports.
- If the design does not create one authoritative host launch owner with explicit remount invariants, packaged Electron launch bugs will keep surfacing as loosely-related iframe/bootstrap symptoms instead of one governed launch surface.
- If `launchInstanceId` and packaged-host origin-normalization rules remain implicit, retries or reactive remounts for the same live session can race against stale ready/bootstrap messages in ways that are difficult to debug from logs alone.
- If the page-level Applications shell remains metadata-first, the product will keep undermining the article's `Application View` thesis even when the technical iframe/bootstrap path is correct.
- If raw session ids and replacement semantics remain the default visible language, users will keep expecting multiple concurrent launches in a product area that currently supports only one live session per application.

## Notes For Architect Reviewer

- Independent requirements basis is user-confirmed.
- Independent design spec now lives at:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-spec.md`
- Review should focus on:
  - whether the higher-layer application-package-management boundary is now separated cleanly from agent-package-management intent,
  - whether `ApplicationPackageService` / application-package API / application-package UI ownership is explicit enough,
  - whether any proposed shared lower-level plumbing stays mechanism-level rather than collapsing the domain boundaries again,
  - whether the runtime publication boundary is now simple enough: artifact-centric for authors, with producer provenance attached by the platform instead of encoded in the publication family name,
  - whether bundle validation now needs to expand so malformed application-owned agent definitions fail package import/refresh instead of being silently skipped until launch,
  - whether the web-side launch spine now has one authoritative owner with clear remount invariants and explicit separation between session truth, launch/bootstrap state, and app-local post-bootstrap loading,
  - whether the iframe contract is explicit enough for Electron packaged-host (`file://`) runs, including `launchInstanceId` and origin-normalization rules,
  - while ensuring the runnable repo-local root model and prior AR-001/AR-002/AR-003 closures remain intact.
  - whether the host page shell now splits `Application View` vs `Execution View` vs details/debug surfaces clearly enough for an app-first default experience,
  - whether the metadata placement policy is intentional enough that raw package/runtime/session/backend transport details stop dominating the default launched-app surface,
  - whether the current single-live-session-per-application model is reflected honestly enough in UX terminology and page structure,
  - while ensuring the runnable repo-local root model and prior AR-001/AR-002/AR-003 closures remain intact.
- Upstream follow-on note:
  - the user wants repo-local sample/shipped apps treated the same as imported apps from an architecture perspective rather than maintaining separate built-in vs external sample roots.
  - the user also wants long-term clean separation by business intent at the top layers, so the design should move away from application import piggybacking on `AgentPackageService` / `AgentPackagesManager` while keeping the `brief-projection-service` atomic idempotency teaching pattern intact.
