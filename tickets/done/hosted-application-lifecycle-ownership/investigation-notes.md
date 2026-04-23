# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Architecture review round 1 returned `Design Impact` (`AR-HALO-001`) because the startup boundary did not explicitly own post-bootstrap delivery failure inside `HostedApplicationStartup`. That design rework has been completed in the dedicated task worktree. A follow-on code-path investigation has now confirmed one adjacent runtime dependency: AutoByteus team-member `publish_artifact` still resolves publication authority through the public single-run `AgentRunManager` path even though AutoByteus team members are created as internal team-owned runtimes beneath `TeamRun`. The design spec now records that dependency/risk explicitly so hosted-application live validation does not silently depend on the wrong authority boundary.
- Investigation Goal: Determine the long-term ownership boundary for hosted application lifecycle UX across the supported host journey and direct/raw bundle entry, while preserving the reviewed iframe/bootstrap protocol.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The ticket crosses frontend route ownership, iframe/bootstrap ownership, raw bundle entry policy, bundle-side startup framework ownership, sample-app teaching patterns, and durable docs.
- Scope Summary: Define one coherent lifecycle-ownership model where the supported host route keeps `ApplicationShell.vue` + `ApplicationSurface.vue` as the visible lifecycle owners, direct raw bundle entry becomes intentionally unsupported by default, and a framework-owned bundle startup boundary replaces app-by-app duplicated handshake/startup UX.
- Primary Questions To Resolve:
  1. Which owner should govern the supported host journey versus raw/direct bundle entry?
  2. Should naked raw bundle entry remain accidentally reachable, become a supported preview surface, or become explicitly unsupported in this ticket?
  3. Where should the bundle-side startup owner live so apps stop duplicating launch-hint parsing and ready/bootstrap wiring?
  4. Can the lifecycle ownership shift happen without redesigning the reviewed v2 iframe/bootstrap contract?
  5. What removal/migration path should replace the current sample-app `status-banner` startup pattern?

## Request Context

- User requested that this partially bootstrapped follow-up ticket be picked up and continued instead of leaving it at bootstrap-only state.
- The ticket exists because the immersive-flow work already fixed the supported embedded route lifecycle leak, but did not yet finish the broader product/framework ownership boundary.
- The underlying user concern remains architectural and product-facing: setup / bootstrap / loading / failure / direct-open states should feel platform/framework-owned, while hosted applications should focus on post-bootstrap business UI.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/in-progress/hosted-application-lifecycle-ownership`
- Current Branch: `codex/hosted-application-lifecycle-ownership`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed on 2026-04-23 without reported errors during the original bootstrap refresh.
- Task Branch: `codex/hosted-application-lifecycle-ownership`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The dedicated worktree already contains the landed immersive-flow baseline from `origin/personal`. Continue authoritative work here; do not move this ticket back to the shared `personal` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-23 | Command | `sed -n '1,260p' .../autobyteus-solution-designer-3225/design-principles.md` | Re-read the shared design authority before continuing the ticket | Reconfirmed the Authoritative Boundary Rule and the need to inventory the supported host spine separately from raw/direct entry behavior. | No |
| 2026-04-23 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership status --short --branch`, `git ... worktree list`, `git ... remote show origin` | Verify that the authoritative task workspace is still the dedicated ticket worktree and branch | The worktree remains `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership` on `codex/hosted-application-lifecycle-ownership`, with only ticket artifacts untracked. | No |
| 2026-04-23 | Doc | `autobyteus-web/docs/applications.md` | Reconstruct the intended supported Applications host flow and current boundary claims | The doc already treats `ApplicationShell.vue` as the route owner and `ApplicationSurface.vue` as the iframe/bootstrap owner for the supported host route. | No |
| 2026-04-23 | Doc | `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Confirm reviewed iframe/bootstrap contract scope | The contract defines launch hints, ready/bootstrap events, and transport payload only; it does not define direct-open policy or framework startup ownership. | No |
| 2026-04-23 | Doc | `autobyteus-application-frontend-sdk/README.md` | Check current SDK ownership surface | The SDK owns transport helpers only and currently exposes no authoritative bundle startup owner. | Yes |
| 2026-04-23 | Code | `autobyteus-web/components/applications/ApplicationShell.vue` | Verify the current supported host-route owner before and after entry | `ApplicationShell.vue` owns setup gating, phase switching, immersive presentation, and host-launch loading/failure before a `launchInstanceId` exists. | No |
| 2026-04-23 | Code | `autobyteus-web/components/applications/ApplicationSurface.vue` | Verify the supported post-launch owner | `ApplicationSurface.vue` owns descriptor commit, ready timeout, bootstrap delivery, retry/failure overlays, and the hidden-until-bootstrapped reveal gate once a `launchInstanceId` exists. | No |
| 2026-04-23 | Code | `autobyteus-web/components/applications/ApplicationIframeHost.vue`, `autobyteus-web/types/application/ApplicationIframeContract.ts`, `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | Confirm how launch hints and bootstrap delivery work today | Host launch hints are appended as query params, the iframe bridge validates ready envelopes, and bootstrap delivery stays tied to the reviewed v2 contract. | No |
| 2026-04-23 | Code | `autobyteus-web/stores/applicationHostStore.ts` | Verify the supported host-launch spine into backend ensure-ready | The store ensures backend readiness, calls `POST /applications/:applicationId/backend/ensure-ready`, and mints `launchInstanceId` for iframe correlation only. | No |
| 2026-04-23 | Doc | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Confirm backend bundle serving and backend gateway ownership | Server docs separate bundle discovery/asset serving from backend gateway/runtime ownership and do not define raw entry as a supported product surface. | No |
| 2026-04-23 | Code | `autobyteus-server-ts/src/api/rest/application-bundles.ts`, `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | Determine who currently owns raw bundle entry policy | The server currently serves `ui/` assets, including `ui/index.html`, as plain static files; there is no platform-owned direct-entry policy at the entry HTML boundary. | Yes |
| 2026-04-23 | Code | `autobyteus-server-ts/src/api/rest/application-backends.ts`, `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Verify whether backend gateway contract needs redesign for this ticket | Backend gateway already treats `launchInstanceId` as optional correlation context and does not require redesign for lifecycle ownership. | No |
| 2026-04-23 | Code | `applications/brief-studio/frontend-src/index.html`, `applications/brief-studio/frontend-src/brief-studio-runtime.js` | Inspect current teaching-pattern startup behavior in Brief Studio | Brief Studio still renders a visible `status-banner`, parses launch hints itself, and owns ready/bootstrap wiring plus startup status UX in app code. | Yes |
| 2026-04-23 | Code | `applications/socratic-math-teacher/frontend-src/index.html`, `applications/socratic-math-teacher/frontend-src/socratic-runtime.js` | Check whether the duplication is sample-specific or systemic | Socratic Math Teacher duplicates the same bundle startup ownership pattern, including visible `status-banner` UX and app-owned handshake code. | Yes |
| 2026-04-23 | Command | `rg -n "status-banner|autobyteus.application.ui.ready|autobyteus.application.host.bootstrap|createApplicationClient" applications autobyteus-application-frontend-sdk autobyteus-web/docs autobyteus-server-ts/docs` | Measure duplication and doc coverage | Startup ownership is duplicated across both sample apps, while docs point app authors to transport helpers only and do not yet provide a framework startup owner. | Yes |
| 2026-04-23 | Doc | `tickets/done/application-launch-setup-immersive-flow/api-e2e-testing.md`, `design-review-report.md`, `design-spec.md` | Use the landed immersive-flow work as authoritative upstream evidence | The supported embedded route is intentionally fixed by the host reveal gate, but round-5 API/E2E still documents direct live-bundle entry showing app-owned placeholder copy. | No |
| 2026-04-23 | Command | `sed -n '1,220p' applications/brief-studio/scripts/build-package.mjs` | Check how bundle-side framework changes would propagate into sample packages | Current sample build scripts vendorize the entire `autobyteus-application-frontend-sdk/dist` tree into `ui/vendor/`, which means extending that SDK is compatible with the existing package-distribution path. | No |
| 2026-04-23 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/done/hosted-application-lifecycle-ownership/design-review-report.md` | Review the round-1 architecture blocker before revising the design | Architecture review confirmed the main ownership direction, but flagged the missing bundle-local startup-failure branch after host bootstrap delivery and required explicit failure ownership plus handoff-complete semantics. | No |
| 2026-04-23 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts`, `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifact-tool.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/published-artifacts/build-codex-publish-artifact-dynamic-tool-registration.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/published-artifacts/build-claude-publish-artifact-tool-definition.ts` | Trace the authoritative run-identity lookup used by `publish_artifact` | All three publish-artifact entrypaths forward to `PublishedArtifactPublicationService.publishForRun(...)`, which immediately resolves authority through `AgentRunManager.getActiveRun(runId)` and throws `Run '<runId>' is not active.` when no public single-run entry exists. | Yes |
| 2026-04-23 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts`, `autobyteus-ts/src/agent-team/context/team-manager.ts`, `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts` | Verify how AutoByteus team members are created and identified at runtime | AutoByteus team members receive durable `memberRunId` identities, but they are restored lazily inside the native team runtime via `AgentFactory.restoreAgent(preferredAgentId, finalConfig)` using `member_run_id` from team-owned config. They are internal team-managed agents, not public `AgentRunManager` active runs. | Yes |
| 2026-04-23 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`, `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts`, `autobyteus-server-ts/tests/unit/application-orchestration/application-published-artifact-relay-service.test.ts` | Check whether application binding/projection already models member-run identity separately from the public single-run registry | Application bindings already persist per-member `runId` values and the relay service/test already assume artifacts may originate from a team member run, but the live relay attachment still only happens when one concrete `AgentRun` instance is registered and attached. | Yes |
| 2026-04-23 | Doc | `tickets/done/runtime-domain-subject-refactor/investigation-notes.md` (`1594-1599`) | Reconfirm prior architectural authority for team-member runtime ownership | Prior runtime-domain design work explicitly states that team member runs should not create or route through the public `AgentRunManager`; team member runs are internal implementation state of one `TeamRun`. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Supported product entry: `/applications/:id` through the AutoByteus host shell.
  - Direct/raw entry: `/rest/application-bundles/:applicationId/assets/ui/index.html` (or equivalent `entryHtmlAssetPath`) loaded directly in the browser.
- Current execution flow:
  - Supported host path:
    1. user lands on `/applications/:id`,
    2. `ApplicationShell.vue` loads the application record and host-managed setup gate,
    3. user clicks `Enter application`,
    4. `applicationHostStore.startLaunch(applicationId)` ensures backend readiness and creates a fresh `launchInstanceId`,
    5. `ApplicationSurface.vue` builds the iframe launch descriptor,
    6. `ApplicationIframeHost.vue` loads the bundle entry HTML with launch-hint query params,
    7. bundle JS sends `autobyteus.application.ui.ready`,
    8. host posts `autobyteus.application.host.bootstrap`, and
    9. `ApplicationSurface.vue` reveals the iframe only after bootstrap delivery succeeds.
  - Direct/raw bundle path today:
    1. browser requests `ui/index.html` directly from the application-bundles route,
    2. server returns the raw bundle HTML with no platform-owned direct-open policy,
    3. app-authored business DOM and visible `status-banner` render immediately,
    4. bundle runtime waits for launch hints / host bootstrap that may never arrive, and
    5. the visible lifecycle state is whatever placeholder UX the app author happened to ship.
- Ownership or boundary observations:
  - `ApplicationShell.vue` is already the correct owner for supported pre-`launchInstanceId` visible lifecycle.
  - `ApplicationSurface.vue` is already the correct owner for supported post-`launchInstanceId` visible lifecycle.
  - The raw bundle entry boundary currently has no explicit platform-owned entry policy.
  - The bundle-side startup boundary currently has no explicit framework-owned owner; sample apps implement it themselves.
  - The reviewed v2 iframe/bootstrap contract is technical transport, not lifecycle-product policy.
- Current behavior summary: the system currently has a split lifecycle model. The supported host journey is platform-owned and visually coherent, but direct/raw bundle entry and bundle startup ownership still default to app-authored behavior.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Supported route owner before `launchInstanceId` | Owns setup gate, immersive presentation, enter/reload/exit, and host-launch loading/error before `ApplicationSurface.vue` mounts. | Keep as authoritative supported host-route owner; do not move supported pre-launch lifecycle down into bundle code. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Supported post-launch iframe/bootstrap owner | Owns reveal gate, timeout, failure, retry, bootstrap acceptance, and iframe reveal after bootstrap success. | Keep as authoritative supported post-launch owner; this ticket should complement it, not replace it. |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Thin iframe bridge | Validates iframe ready signal and posts bootstrap envelope to the matching child iframe. | Remains a thin bridge; lifecycle policy should stay above it. |
| `autobyteus-web/stores/applicationHostStore.ts` | Supported host-launch owner | Ensures backend readiness and generates `launchInstanceId`; it does not own direct raw entry or bundle-side startup UX. | Confirms that direct-open ownership should not be shoved into the host-launch store. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Reviewed technical contract | Defines ready/bootstrap transport only. | Lifecycle ownership must be added around the contract, not by bloating the contract itself. |
| `autobyteus-application-frontend-sdk/src/index.ts` | Bundle transport helper boundary | Only exposes client/transport helpers today. | Natural place to extend with a framework-owned bundle startup boundary. |
| `autobyteus-server-ts/src/api/rest/application-bundles.ts` | Raw UI asset serving | Serves `ui/index.html` directly as a static asset with no entry-policy branch. | Needs an explicit entry-policy decision if naked raw entry should become unsupported by default. |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | Bundle catalog + asset-path resolution | Knows each bundle’s authoritative `entryHtmlRelativePath` and can distinguish entry HTML from other assets. | Provides the right underlying owner data for a platform entry-policy decision. |
| `applications/brief-studio/frontend-src/index.html` + `brief-studio-runtime.js` | Sample app authoring startup pattern | Visible `status-banner`, app-authored launch-hint parsing, ready/bootstrap wiring, and startup status UX. | Legacy teaching pattern to remove/decommission. |
| `applications/socratic-math-teacher/frontend-src/index.html` + `socratic-runtime.js` | Second sample app startup pattern | Duplicates the same visible startup/banner + app-owned handshake logic. | Confirms the problem is systemic, not one-off. |
| `applications/brief-studio/scripts/build-package.mjs` (same pattern in Socratic) | Sample package vendor sync | Copies the full frontend SDK dist into `ui/vendor/`. | Extending the SDK is compatible with the existing sample-package distribution path. |
| `tickets/done/application-launch-setup-immersive-flow/api-e2e-testing.md` | Upstream runtime validation evidence | Confirms supported embedded route is clean while direct raw live-bundle entry still shows app-owned placeholder copy. | Strong evidence that this follow-up is about long-term ownership completion, not a regression in the supported host path. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-23 | Trace | Review of `tickets/done/application-launch-setup-immersive-flow/api-e2e-testing.md` round-5 scenarios and prior design-review notes | Embedded host route is intentionally clean after the reveal gate, but direct live-bundle entry still shows app-owned placeholder copy outside the host shell. | Confirms that supported host ownership is already correct; the unresolved gap is raw entry policy plus bundle-side startup ownership. |
| 2026-04-23 | Probe | Static code read of sample app startup files plus SDK source | Both sample apps implement nearly identical launch-hint parsing, `postMessage` handshake handling, and visible startup banner updates themselves. | Strong signal that startup ownership should move into a reusable framework boundary rather than stay duplicated per app. |
| 2026-04-23 | Probe | Static code read of server asset route + bundle service | The server can distinguish raw entry HTML from other `ui/` assets but currently serves entry HTML with no policy layer. | A platform-owned raw-entry decision is technically feasible without redesigning the bundle catalog or backend gateway. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: The ownership question is fully internal to the current repo architecture and reviewed docs.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for the current design investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - Existing bootstrap refresh already performed in this worktree: `git fetch origin` and `git reset --hard origin/personal`.
- Cleanup notes for temporary investigation-only setup: No additional temporary runtime setup was created for this investigation continuation.

## Findings From Code / Docs / Data / Logs

- The supported host route already has the right visible lifecycle owners; the follow-up should not pull supported host-route lifecycle responsibility away from `ApplicationShell.vue` or `ApplicationSurface.vue`.
- The unresolved ownership gap is split across two currently missing owners:
  1. there is no platform-owned entry policy for naked raw bundle entry, and
  2. there is no framework-owned bundle startup boundary, so sample apps implement startup behavior themselves.
- Because the server currently serves raw `ui/index.html` directly, direct-open behavior is accidental transport behavior rather than an intentional product surface.
- Because the SDK currently starts at transport helpers only, the sample apps normalize the wrong authoring pattern: app-authored startup UX plus app-authored handshake plumbing.
- The reviewed v2 ready/bootstrap contract already carries the needed application identity, launch correlation, host origin, and backend gateway transport. The lifecycle-ownership problem can be solved around the existing contract without adding a new protocol layer.
- The existing package-build scripts already vendorize the frontend SDK into bundle `ui/vendor/`, so an SDK-based startup owner would follow an existing packaging path instead of adding a parallel distribution story.
- The strongest current-state direction is a hybrid ownership completion:
  - preserve current supported host-route owners,
  - add an explicit platform-owned raw entry policy at the bundle entry boundary, and
  - add a framework-owned bundle startup owner in the frontend SDK for modern bundle entry/reveal behavior.
- The round-1 architecture review refined one critical detail in that direction: because the host reveal rule is intentionally preserved at bootstrap delivery, `HostedApplicationStartup` must also own the remaining bundle-local lifecycle after delivery until either startup handoff completes or startup fails visibly inside the bundle root.
- The code-path investigation also confirmed an adjacent runtime-control mismatch that matters to live hosted-application validation:
  - AutoByteus team members are created as internal team-owned native runtimes beneath `TeamRun`, with `memberRunId` carried in team-owned config and reused as the internal agent id.
  - `publish_artifact` still resolves run authority through `PublishedArtifactPublicationService -> AgentRunManager.getActiveRun(runId)`.
  - Therefore a hosted application that relies on an AutoByteus team member publishing an artifact can fail even after lifecycle/bootstrap ownership is correct, because the publication path is asking the wrong owner whether the member run is active.
- The correct architectural implication is not “register every internal team member in the public single-run manager just to satisfy `publish_artifact`.” The correct implication is: team-member run identity remains owned beneath `TeamRun` / member-runtime authority, and artifact publication ingress must resolve publication authority through that owner or another binding-owned ingress boundary instead of assuming public single-run ownership.

## Constraints / Dependencies / Compatibility Facts

- The follow-up must preserve the landed immersive-flow route ownership and reveal gate already present on `personal`.
- The current raw application-bundle asset route is both the host iframe source and a directly reachable browser URL, so entry-policy changes must distinguish supported host launch from unsupported raw entry.
- The backend gateway and application engine already treat `launchInstanceId` as optional correlation context, not business identity, which reduces pressure to redesign the backend contract.
- Existing imported or external bundles may keep the old startup pattern until they migrate; the ticket should still establish a clean platform/framework default rather than freeze the wrong pattern for compatibility.
- Backward-compatibility wrappers or dual lifecycle models should be avoided in the target design; the goal is a clean authoritative ownership split.
- Live hosted-application validation for Brief Studio-style team flows currently also depends on runtime publication ingress correctly resolving AutoByteus team-member run identity; current server code still routes that lookup through the public single-run manager, which is an adjacent dependency/risk rather than part of the frontend lifecycle split itself.

## Open Unknowns / Risks

- If the product later wants a first-class developer preview harness, that should likely be a separate explicit route or shell rather than a side effect of raw static asset entry.
- Legacy/imported bundles that do not adopt the new framework startup owner will still need a migration path for hinted direct-open behavior, even if naked raw entry becomes platform-owned by default.
- A framework-owned startup surface needs neutral styling and possibly localization strategy without becoming application-specific.
- The framework-owned startup-failure surface must remain narrow and neutral and must not silently become a second app-customization surface.
- If the AutoByteus team-member `publish_artifact` authority mismatch is fixed in parallel, the durable design should follow the existing team-runtime ownership rule (member runs remain internal to `TeamRun`) rather than broadening `AgentRunManager` into a mixed public-plus-internal authority layer.

## Notes For Architect Reviewer

- Recommended direction: keep the supported embedded route exactly on the current owner split (`ApplicationShell.vue` before `launchInstanceId`, `ApplicationSurface.vue` after), and finish the broader ownership model by adding:
  1. a platform-owned raw-entry policy at the bundle entry HTML boundary, and
  2. a framework-owned bundle startup owner in `@autobyteus/application-frontend-sdk`.
- Avoid “fixing” the problem by moving supported embedded lifecycle work into the SDK or sample apps; the embedded route is already correctly owned by the host shell/surface.
- Avoid redesigning the reviewed v2 iframe/bootstrap contract unless a later concrete blocker appears; the current evidence points to ownership completion, not protocol deficiency.
- The current duplicated `status-banner` / app-authored handshake pattern should be treated as explicit legacy removal scope rather than tolerated as harmless sample code.
- One adjacent dependency now worth tracking explicitly during implementation/review: live hosted-application validation may still fail if AutoByteus team-member artifact publication continues to depend on `AgentRunManager.getActiveRun(memberRunId)`. If that path is fixed in this branch or a sibling branch, prefer a team-owned member-runtime authority path or binding-owned artifact ingress, not public single-run registry widening.
