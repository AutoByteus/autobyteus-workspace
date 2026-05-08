# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Initial current-state investigation complete enough to seed design; design spec produced after user confirmed this ticket excludes runtime stream implementation.
- Investigation Goal: Bootstrap a focused improvement ticket that clarifies application communication mechanisms, especially backend-to-frontend notifications versus runtime control, artifact relay, and future runtime streaming.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The change is conceptually small but crosses docs, server gateway naming, SDK references, tests, and first-party app examples.
- Scope Summary: Improve naming/docs so developers can distinguish frontend request/response APIs, backend-published frontend notifications, backend runtime control, runtime event/artifact handlers, and future runtime stream subscriptions.
- Primary Questions To Resolve:
  - Should only internal service/file names be tightened, or should public SDK type/method names also be changed in a clean-cut way?
  - Where should the canonical application communication matrix live?
  - How much generated/vendor app package output should the implementing team update directly versus through build scripts?

## Request Context

The user became confused while reasoning about application runtime streaming because current concepts are too easy to conflate:

- `query`, `command`, `graphql`, and `route` are frontend-initiated request/response calls into app backend handlers.
- `publishNotification` / `subscribeNotifications` is live app-backend-to-app-frontend push, and the frontend must subscribe first.
- `runtimeControl.*` is available inside app backend handlers for controlling app-bound agent/team runs; frontend APIs do not inherently go through it.
- Artifact publication reaches the app backend through `artifactHandlers.persisted` and only reaches frontend if the app backend chooses to notify or the frontend queries state.
- Future application runtime streaming/conversation should be distinct from backend notifications.

This ticket should bootstrap one improvement task another software engineering team can implement before or alongside future runtime streaming design.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-communication-api-clarity`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-communication-api-clarity/tickets/application-communication-api-clarity`.
- Current Branch: `codex/application-communication-api-clarity`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-communication-api-clarity`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-05-07; initial bootstrap saw `origin/personal` at `6a2ef8bffbc398dd20b3e82bb7e982d0b1b00a14` (`docs(ticket): record featured assistant finalization`). Before design, the branch was refreshed/rebased onto latest `origin/personal` at `fcd92ab98891e5e1110a4361db581f947ff637fb` (`simplify agents page: remove redundant category descriptions and rename Shared to Individual agents`).
- Task Branch: `codex/application-communication-api-clarity` tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is not the application runtime streaming ticket. It is a smaller clarity/naming/docs ticket intended to make current application communication boundaries explicit.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-07 | Command | `git status --short --branch`, `git remote -v`, `git branch --show-current`, `git worktree list` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Resolve repo/worktree/base branch context before bootstrapping. | Main checkout is `personal` tracking `origin/personal`; many ticket worktrees exist. | No |
| 2026-05-07 | Command | `git fetch origin personal`; `git rev-parse origin/personal`; `git log -1 --oneline origin/personal` | Refresh and record base branch. | `origin/personal` at `6a2ef8bffbc398dd20b3e82bb7e982d0b1b00a14` (`docs(ticket): record featured assistant finalization`). | No |
| 2026-05-07 | Command | `git worktree add -b codex/application-communication-api-clarity /Users/normy/autobyteus_org/autobyteus-worktrees/application-communication-api-clarity origin/personal` | Create dedicated ticket worktree. | Worktree and branch created successfully. | No |
| 2026-05-07 | Command | `git fetch origin personal`; `git rebase origin/personal`; `git status --short --branch`; `git log -1 --oneline` | Refresh task branch before writing design spec. | Branch fast-forward/rebased to latest `origin/personal` at `fcd92ab9`; only untracked ticket artifacts remain. | No |
| 2026-05-07 | Code | `autobyteus-application-frontend-sdk/src/application-client.ts:1-70` | Identify current frontend SDK surfaces. | Client exposes `query`, `command`, `graphql`, `route`, and `subscribeNotifications`. | Yes — docs should group these by direction/initiator. |
| 2026-05-07 | Code | `autobyteus-application-frontend-sdk/src/application-client-transport.ts:1-39` | Verify transport interface. | Transport has request/response invocations plus optional `subscribeNotifications`. | Yes |
| 2026-05-07 | Code | `autobyteus-application-sdk-contracts/src/index.ts:69-90, 235-285, 328-363` | Inspect notification message, runtime control, handler context, and artifact handler contracts. | `ApplicationNotificationMessage` is generic; `ApplicationHandlerContext` has both `publishNotification` and `runtimeControl`; artifact handler is separate. | Yes — consider public naming risk. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/application-backend-gateway/streaming/application-notification-stream-service.ts:1-72` | Inspect current notification stream owner. | Service connects by `applicationId`, sends connection acknowledgement and notification messages, and publishes `ApplicationNotificationMessage` to active connections. | Yes — likely rename/internal docs. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts:15-39` | Verify websocket route. | Route is `/ws/applications/:applicationId/backend/notifications`. The route name already implies backend notifications more clearly than service name. | Yes |
| 2026-05-07 | Code | `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts:1-95` | Verify bridge from app worker notifications to stream service. | Gateway subscribes to engine notifications and republishes them through notification stream service. | Yes |
| 2026-05-07 | Code | `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts:188-220` | Verify `publishNotification` in handler context. | Handler context builds notifications with `applicationId`, `topic`, `payload`, and `publishedAt`. | Yes |
| 2026-05-07 | Code | `applications/brief-studio/...`, `applications/socratic-math-teacher/...` searched with `rg -n "publishNotification\(|subscribeNotifications\(" ...` | Inspect first-party app usage. | Apps use notifications for app-level messages like `brief.created`, `brief.review_updated`, `lesson.started`, `lesson.response_received`; frontends call `subscribeNotifications`. | Yes — update docs/examples/comments if needed. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts`; `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts`; `autobyteus-server-ts/docs/modules/application_orchestration.md:120-158` | Verify artifact path. | Published artifact relay invokes app backend `artifactHandlers.persisted`; live relay is best effort; recovery uses `listRunBindings`, `getRunPublishedArtifacts`, and `getPublishedArtifactRevisionText`. | Yes — docs should cross-link clearly. |

## Current Behavior / Current Flow

### Frontend request/response APIs

- App frontend uses `client.query`, `client.command`, `client.graphql`, or `client.route`.
- The frontend SDK transport calls application backend gateway routes.
- The application engine host invokes the app backend worker handler/resolver/route.
- These paths do not automatically use `runtimeControl`; backend code may call `context.runtimeControl.*` inside the handler.

### Backend-published frontend notifications

- App backend handler calls `context.publishNotification(topic, payload)`.
- Worker runtime sends a notification event to `ApplicationEngineHostService`.
- `ApplicationBackendGatewayService.ensureNotificationBridge()` republishes that message through `ApplicationNotificationStreamService`.
- Frontend receives it only if it already called `client.subscribeNotifications(...)` and has an active websocket connection to `/ws/applications/:applicationId/backend/notifications`.
- This is live fan-out, not durable replay.

### Runtime control

- App backend uses `context.runtimeControl.*` to list/configure resources, start runs, post input, list/query artifacts, and terminate bindings.
- Runtime control is backend-initiated and app-bound; it is not the app frontend/backend transport layer.

### Artifact relay

- Published artifact subsystem persists artifact projection and emits `ARTIFACT_PERSISTED`.
- `ApplicationPublishedArtifactRelayService` detects bound-run artifact events and invokes the app backend `artifactHandlers.persisted(event, context)` through `ApplicationEngineHostService`.
- The app backend may update app state and optionally call `context.publishNotification(...)` to tell the frontend.
- Missed live artifact handler delivery is recovered through runtime-control artifact query/reconciliation APIs.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Documentation / Naming Refactor.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, Naming / Responsibility Ambiguity, future Duplicated Policy risk.
- Refactor posture evidence summary: The code structure has mostly healthy owners, but the current service/type wording makes different communication mechanisms sound interchangeable. Tightening docs and internal naming reduces the risk that future runtime streaming is implemented as arbitrary notification topics.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ApplicationNotificationStreamService` | Name says generic notification stream; actual responsibility is backend-published frontend notification fan-out. | Naming is broader than ownership. | Rename or document as backend notification stream. |
| `/ws/applications/:applicationId/backend/notifications` | Route name includes `backend/notifications`. | Route is clearer than service name. | Align service/file naming with route semantics. |
| `ApplicationHandlerContext` | Exposes `publishNotification` beside `runtimeControl`. | Good separation, but docs need to explain they are unrelated mechanisms. | Add communication matrix. |
| `ApplicationPublishedArtifactRelayService` | Separate owner invokes `artifactHandlers.persisted`. | Artifact path is correctly separated from notification stream, but not obvious to users. | Clarify docs. |
| `ApplicationFrontendSDK` client | Exposes request/response plus subscription. | Current SDK surface is understandable if grouped by initiator/direction. | Document the grouping. |
| First-party apps | Use notifications for status/refresh hints. | Existing behavior is legitimate and should be preserved. | Examples can better label notification purpose. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/index.ts` | Shared application contracts. | Defines `ApplicationNotificationMessage`, `ApplicationRuntimeControl`, `ApplicationHandlerContext`, and `ApplicationArtifactHandler`. | Possible docs or public naming update location; public rename risk lives here. |
| `autobyteus-application-frontend-sdk/src/application-client.ts` | Frontend client facade. | Exposes `query`, `command`, `graphql`, `route`, `subscribeNotifications`. | Documentation should use this as the frontend API source of truth. |
| `autobyteus-application-frontend-sdk/src/application-client-transport.ts` | Frontend transport interface. | Optional `subscribeNotifications` sits beside request/response methods. | Good place to document transport semantics if code comments are added. |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | Browser transport implementation. | Connects notification websocket using `backendNotificationsUrl`. | Rename/comments may be needed if service names change. |
| `autobyteus-web/utils/application/applicationHostTransport.ts` | Host transport URL builder. | Builds `/backend/notifications` URL. | Existing naming supports backend notification semantics. |
| `autobyteus-server-ts/src/application-backend-gateway/streaming/application-notification-stream-service.ts` | Notification websocket fan-out. | Main candidate for internal rename to `application-backend-notification-stream-service.ts`. | Scope should update imports/tests together. |
| `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts` | Websocket route. | Route name already clear. | Keep route stable unless there is a separate API versioning reason. |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Bridges worker notifications to stream service. | Uses dependency name `notificationStreamService`. | Rename dependency to backend-notification wording. |
| `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts` | Artifact event relay to app backend. | Separate from notification stream. | Docs should highlight separation. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Orchestration docs. | Already documents artifact relay/query well. | Cross-link from new communication model or add matrix. |
| `applications/brief-studio`, `applications/socratic-math-teacher` | First-party app examples. | Use notifications for app-level status/refresh hints. | Can serve as examples or need comment updates. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-07 | Probe | `rg -n "ApplicationNotificationMessage|publishNotification|subscribeNotifications|ApplicationNotificationStreamService|backendNotificationsUrl|backend/notifications" ...` | Confirmed notification service/type/route/frontend SDK wiring. | Current implementation supports live backend-to-frontend notifications. |
| 2026-05-07 | Probe | `sed -n '1,90p' autobyteus-application-frontend-sdk/src/application-client.ts` | Confirmed client exposes request/response APIs plus notification subscription. | Communication matrix should start from this surface. |
| 2026-05-07 | Probe | `sed -n '235,285p' autobyteus-application-sdk-contracts/src/index.ts` | Confirmed `ApplicationHandlerContext` has separate `publishNotification` and `runtimeControl`. | Docs should correct misconception that all APIs go through runtime control. |
| 2026-05-07 | Probe | `rg -n "publishNotification\(|subscribeNotifications\(" applications/brief-studio applications/socratic-math-teacher --glob '!**/dist/**' --glob '!**/vendor/**'` | Found first-party apps using notification push for app-level messages. | Existing API is used and should not be casually removed. |
| 2026-05-07 | Probe | `rg -n "ApplicationPublishedArtifactRelayService|artifactHandlers|ApplicationArtifactHandler|getRunPublishedArtifacts|getPublishedArtifactRevisionText|ApplicationPublishedArtifactEvent|ARTIFACT_PERSISTED" ...` | Confirmed artifact relay and query are separate from notification stream. | Artifact docs should be part of clarity work. |

## External / Public Source Findings

No external/public sources consulted. This is an internal framework clarity/naming ticket based on local repository evidence and user/product-team confusion during runtime streaming planning.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for bootstrap.
- Required config, feature flags, env vars, or accounts: None for bootstrap.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add -b codex/application-communication-api-clarity /Users/normy/autobyteus_org/autobyteus-worktrees/application-communication-api-clarity origin/personal`
- Cleanup notes for temporary investigation-only setup: No temporary setup created beyond the dedicated worktree.

## Findings From Code / Docs / Data / Logs

- Current deep architecture is mostly coherent: frontend request/response, backend notification push, backend runtime control, and runtime-to-backend event/artifact handlers are separate mechanisms.
- Current naming/docs do not make those separations obvious enough to a high-level app/platform designer.
- The service name `ApplicationNotificationStreamService` is the main ambiguity because it emphasizes transport and broad “application notification” language instead of backend-published frontend notification semantics.
- The route `/ws/applications/:applicationId/backend/notifications` and iframe `backendNotificationsUrl` already point toward the clearer semantic label.
- Artifact relay is already separately owned and documented, but the relationship between artifact relay and optional frontend notification should be explained in a single communication model.
- Future runtime streaming should be positioned as `runtime/platform → app frontend through application boundary`, separate from backend notification push.

## Constraints / Dependencies / Compatibility Facts

- First-party apps currently use `publishNotification` and `subscribeNotifications`; public API changes must be deliberate and comprehensive.
- The notification websocket route is already exposed to hosted app frontends through `backendNotificationsUrl`; route stability may matter to packaged apps and devkit flows.
- App notification messages are live fan-out. There is no evidence of durable replay in `ApplicationNotificationStreamService`.
- Artifact live relay is best effort by design; durable reconciliation happens through artifact query APIs.
- The improvement should not modify runtime control behavior or implement runtime streaming.

## Open Unknowns / Risks

- Public naming change could be disruptive if generated/vendor packages and first-party apps are not updated through the right build process.
- Internal-only rename may not fully solve confusion if public names stay generic. Docs may be sufficient, but architecture reviewer should decide.
- If the canonical docs are duplicated across several files, they may drift. Prefer one canonical communication model with cross-links.
- Future runtime streaming design may choose names like `RuntimeConversation` or `RuntimeStream`; this ticket should leave that open while reserving a distinct slot.

## Notes For Architecture Reviewer

This is intentionally a small improvement ticket. The strongest evidence is not a behavior bug; it is a naming/boundary comprehension issue that surfaced while discussing application runtime streaming. The architecture is healthier than the naming suggests. The goal is to prevent a future bad design where runtime streaming is crammed into arbitrary `subscribeNotifications` topics because both use websocket-like transport.

My recommended target is:

- Keep `publishNotification` / `subscribeNotifications` semantics as backend-published frontend notifications.
- Rename internal server owner to something like `ApplicationBackendNotificationStreamService` if the implementation team accepts the churn.
- Add a canonical communication matrix showing initiator, direction, runtime-control involvement, live/durable semantics, and examples.
- Leave future runtime streaming/conversation as a separate API slot, not an implementation in this ticket.
