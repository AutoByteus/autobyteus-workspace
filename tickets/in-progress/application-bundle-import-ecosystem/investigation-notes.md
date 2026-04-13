# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Upstream package revised after round-4 design review for backend session reattachment + family-tight publication projections`
- Investigation Goal:
  - Carry the existing application-bundle import work forward into the newly clarified product model where Applications are a first-class module, application/member UIs react to typed promoted artifact/delivery events, and bundled app authors use a frontend SDK instead of raw runtime/bootstrap internals.
- Scope Classification (`Small`/`Medium`/`Large`): `Large`
- Scope Classification Rationale:
  - The revised scope now crosses bundle import/discovery, backend application-session ownership, agent/team runtime publication, application/member state projection, application page information architecture, frontend SDK design, and reference-app validation strategy.

## Environment / Bootstrap Evidence

- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem`
- Git worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem`
- Branch: `codex/application-bundle-import-ecosystem`
- Base branch used for bootstrap: `origin/personal`
- Original primary checkout remained at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal`

## User Clarifications Captured In This Revision

- 2026-04-13: Applications remain a first-class top-level module beside Agents and Agent Teams.
- 2026-04-13: Clicking one application card should open that application’s own UI, not immediately the raw workspace/runtime screen.
- 2026-04-13: The application page should expose an `Application` view and an `Execution` view.
- 2026-04-13: Member-oriented execution should still be artifact/status-first when possible; raw runtime details remain deeper drill-down.
- 2026-04-13: The current workspace/running view should remain available as the deepest technical inspection surface.
- 2026-04-13: Agents/team members should publish typed artifact/delivery events that the application UI reacts to.
- 2026-04-13: The platform should provide a frontend SDK so application authors do not need to depend on raw iframe/bootstrap/runtime internals.
- 2026-04-13: The scoped delivery should also include one small reference application bundle for downstream validation.
- 2026-04-13 / review round 4: reconnect/page-refresh on `/applications/[id]` must be reattached through a backend-owned application-session binding lookup, not frontend-only active-session memory.
- 2026-04-13 / review round 4: `MEMBER_ARTIFACT` and `PROGRESS` must coexist in separate retained projection fields with deterministic upsert rules; v1 free-form metadata is not acceptable.

## Sources Consulted

### Existing ticket artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/design-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/implementation-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/validation-report.md`

### Frontend application/catalog/session sources

- `autobyteus-web/components/AppLeftPanel.vue`
- `autobyteus-web/pages/applications/index.vue`
- `autobyteus-web/pages/applications/[id].vue`
- `autobyteus-web/components/applications/ApplicationCard.vue`
- `autobyteus-web/components/applications/ApplicationLaunchConfigModal.vue`
- `autobyteus-web/components/applications/ApplicationIframeHost.vue`
- `autobyteus-web/stores/applicationStore.ts`
- `autobyteus-web/stores/applicationSessionStore.ts`
- `autobyteus-web/types/application/ApplicationSession.ts`
- `autobyteus-web/utils/application/applicationLaunch.ts`
- `autobyteus-web/utils/application/applicationAssetUrl.ts`
- `autobyteus-web/docs/applications.md`
- `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`

### Frontend runtime/streaming/artifact sources

- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/stores/agentArtifactsStore.ts`
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`
- `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
- `autobyteus-web/docs/agent_execution_architecture.md`

### Backend application bundle / application transport sources

- `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts`
- `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
- `autobyteus-server-ts/src/api/graphql/types/application.ts`
- `autobyteus-server-ts/src/api/rest/application-bundles.ts`
- `autobyteus-server-ts/applications/socratic-math-teacher/application.json`
- `autobyteus-server-ts/applications/socratic-math-teacher/ui/index.html`

### Backend artifact/runtime sources

- `autobyteus-server-ts/docs/modules/agent_artifacts.md`
- `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts`
- `autobyteus-server-ts/src/services/agent-streaming/*`

### Packaged Electron / topology sources retained from prior revision

- `autobyteus-web/electron/main.ts`
- `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/validation-probes/packaged-iframe-topology-probe.mjs`

## Commands Run

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem

git status --short
rg -n "Applications|application catalog|ApplicationIframeHost|ApplicationSession|artifact|publish|delivery|streaming|TeamStreamingService|AgentStreamingService" autobyteus-server-ts autobyteus-web -S
sed -n '1,260p' autobyteus-web/stores/applicationSessionStore.ts
sed -n '1,260p' autobyteus-web/utils/application/applicationLaunch.ts
sed -n '1,260p' autobyteus-web/components/applications/ApplicationIframeHost.vue
sed -n '1,240p' autobyteus-web/stores/applicationStore.ts
sed -n '1,280p' autobyteus-web/pages/applications/[id].vue
sed -n '1,220p' autobyteus-server-ts/src/api/graphql/types/application.ts
sed -n '1,220p' autobyteus-server-ts/docs/modules/agent_artifacts.md
sed -n '1,240p' autobyteus-server-ts/src/api/rest/application-bundles.ts
sed -n '1,220p' autobyteus-server-ts/applications/socratic-math-teacher/application.json
sed -n '1,280p' autobyteus-server-ts/applications/socratic-math-teacher/ui/index.html
sed -n '1,240p' autobyteus-web/stores/agentTeamRunStore.ts
sed -n '1,240p' autobyteus-web/stores/agentRunStore.ts
```

## Current-State Findings

### 1. Applications already exist as a top-level frontend module, but the application page is still only a launch/bootstrap shell

Observed evidence:
- `autobyteus-web/components/AppLeftPanel.vue` contains the Applications navigation item behind `runtimeConfig.public.enableApplications`.
- `autobyteus-web/pages/applications/index.vue` is already the catalog page.
- `autobyteus-web/pages/applications/[id].vue` loads one application, shows metadata, launches a session, and renders `ApplicationIframeHost`.

Conclusion:
- The product already has the **catalog + detail route** shape needed for Applications as a first-class module.
- The major gap is not “how to add Applications navigation,” but “how to evolve the application detail route from a thin iframe shell into a layered application/member/runtime experience.”

### 2. Current application sessions are frontend-generated and are not authoritative enough for projected application/member state

Observed evidence:
- `applicationSessionId` is created in `autobyteus-web/utils/application/applicationLaunch.ts` via `createApplicationSessionId()`.
- `autobyteus-web/stores/applicationSessionStore.ts` creates the underlying agent/team run directly through existing run mutations and then builds an in-memory `ApplicationSession` record.
- There is no backend `createApplicationSession` authoritative boundary in the current implementation.

Conclusion:
- The existing application session model is sufficient for iframe bootstrap, but **not sufficient** for authoritative application-visible event projection or durable member/application state.
- A backend-owned application-session boundary is needed if application/member UIs are to react to stable projected publication state rather than transient frontend-only memory.

### 3. Existing runtime streaming and artifact infrastructure is real and reusable

Observed evidence:
- `autobyteus-web/stores/agentRunStore.ts` and `autobyteus-web/stores/agentTeamRunStore.ts` already own single-agent and team-run WebSocket subscription orchestration.
- `autobyteus-server-ts/docs/modules/agent_artifacts.md` documents current live artifact events (`ARTIFACT_PERSISTED`, `ARTIFACT_UPDATED`) emitted from runtime/tool processing.
- `autobyteus-web/stores/agentArtifactsStore.ts` already maintains a live projection of touched/generated artifacts for run-oriented runtime views.

Conclusion:
- The platform already has the raw runtime streaming substrate needed for application/member artifact promotion.
- The missing piece is **not** a second unrelated streaming system.
- The missing piece is a **promotion boundary + authoritative projection model** above the raw runtime artifact/log stream.

### 4. The current bundled application sample only proves bootstrap, not the product vision

Observed evidence:
- `autobyteus-server-ts/applications/socratic-math-teacher/ui/index.html` currently shows bootstrap/session metadata once the host posts the bootstrap payload.
- It does not render promoted application delivery state, member artifacts, or SDK-driven runtime behavior.

Conclusion:
- The sample app is currently a topology/bootstrap proof.
- A new reference app is needed to prove the actual application/product model and to give API/E2E validation a meaningful artifact-driven target.

### 5. Existing packaged Electron topology constraints still matter for the revised design

Observed evidence retained from prior validation:
- The host shell runs from `file://` in packaged Electron.
- Application bundle assets are served by the backend over loopback HTTP.
- `HtmlPreviewer.vue` already uses the correct frontend-owned bound-endpoint resolution pattern.
- The current iframe contract v1 already had to become topology-aware.

Conclusion:
- Any revised application/SDK design must **retain** the existing packaged Electron topology decisions:
  - backend emits asset paths, not host-relative URLs,
  - frontend resolves absolute asset URLs from bound backend endpoints,
  - app bootstrap/SDK trust rules must not assume same-origin equality.

### 6. The current application page does not yet match the newly clarified layered UX model

Observed evidence:
- `pages/applications/[id].vue` currently shows:
  - app metadata,
  - launch/stop actions,
  - active session panel,
  - the iframe host.
- It does **not** currently model:
  - Application vs Execution switch,
  - selected member rendering,
  - artifact-first member view,
  - drill-down to the current workspace/running page.

Conclusion:
- The application page needs a real shell/UI redesign in addition to backend session/publication changes.

## Architecture Implications Derived From Investigation

- The backend application-session boundary must own **route-level reattachment** as well as creation/termination.
- The `/applications/[id]` page therefore needs a backend binding lookup such as `applicationSessionBinding(applicationId, requestedSessionId?)`, not frontend-local active-session lookup.
- Publication families need explicit retained projection fields/maps; one collapsed `latestPublication` shape is not sufficient for artifact + progress coexistence.
- The publication contract v1 should remove free-form metadata and use family-specific discriminated payloads instead.
- The application-detail route must stop being just “launch + iframe.”
- Application-visible/member-visible state needs an authoritative owner; frontend-only `ApplicationSessionStore` is insufficient for the revised scope.
- The clean boundary is:
  - raw runtime/tool events,
  - promoted typed application publication events,
  - backend-projected application/member session state,
  - frontend shell + SDK + renderers.
- The current runtime streaming infrastructure should be **reused**, not replaced.
- The frontend SDK should hide:
  - raw iframe `postMessage` contract,
  - projected-state subscription plumbing,
  - artifact resolution helpers,
  - runtime-send wiring.
- The sample/reference app is now part of the scope because it validates the publication contract, SDK shape, renderer model, and packaged application import path together.

## Risks / Hot Spots

- Without a backend authoritative session owner, projected publication state will be fragile and reconnect/refresh behavior will drift.
- If agents are allowed to emit arbitrary free-form UI commands instead of typed publication payloads, renderer and SDK complexity will become chaotic quickly.
- If frontend applications subscribe to raw tool-call strings/events directly instead of projected state, app authors will be forced into unstable internal runtime semantics.
- If the app page tries to implement deep raw runtime inspection itself instead of handing off to the existing workspace/running experience, the scope will balloon and duplicate existing runtime UI.
- If the SDK surface leaks internal Pinia stores or current host component structure, application authoring will become brittle and hard to version.
- The prior packaged Electron asset/origin topology fixes remain mandatory; any new application/SDK transport shortcuts risk reintroducing the `file://` vs backend HTTP mismatch.

## Recommended Direction Locked By This Investigation

1. Keep the bundle-driven import/discovery model already in progress.
2. Add an authoritative backend application-session subsystem.
3. Add one standard typed application publication tool contract.
4. Project publication state into application-level and member-level session state on the backend.
5. Evolve the application detail page into a native application shell with Application / Execution modes and drill-down to the current workspace/running view.
6. Provide a frontend SDK above bootstrap + projected-state subscription + runtime send APIs.
7. Deliver one small reference application bundle as the validation target for implementation and API/E2E work.

## Current Artifact Set

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/design-spec.md`
