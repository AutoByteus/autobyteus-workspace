# Investigation Notes: Iframe Launch Id Contract Refactor

## Investigation Status

- Bootstrap Status: Existing ticket worktree and draft requirement reused.
- Current Status: Investigation complete; requirement is sound and design-ready.
- Investigation Goal: Determine whether renaming/narrowing `launchInstanceId` to an iframe-scoped bootstrap correlation id is warranted by the current source code, then prepare design input if yes.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The semantic refactor touches shared contracts, frontend SDK, web host, backend gateway/engine context plumbing, manifests, docs, tests, sample source, generated sample vendors, and generated sample packages.
- Scope Summary: Replace public `launchInstanceId` iframe bootstrap terminology with `iframeLaunchId`, remove iframe launch id from normal backend request context, preserve stale iframe safety, bump compatibility contracts, and refresh sample/docs surfaces.
- Primary Questions To Resolve:
  - Is `launchInstanceId` durable app identity or only iframe bootstrap correlation?
  - Does backend business behavior depend on `requestContext.launchInstanceId`?
  - Should a renamed backend correlation header/query remain?
  - Which contract version and compatibility gates need to change?

## Request Context

The user supplied the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor` and asked to read its requirements, judge whether the requirement is a good idea based on existing source code, and proceed if it is. The user explicitly said not to use the software engineering workflow skill; this investigation used the solution-designer workflow only.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor`
- Current Branch: `codex/iframe-launch-id-contract-refactor`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Existing workflow state records `git fetch origin --prune` completed successfully and `origin/personal` resolved to `cef8446452af13de1f97cf5c061c11a03443e944`; local verification also showed `origin/personal` at `cef8446452af13de1f97cf5c061c11a03443e944`.
- Task Branch: `codex/iframe-launch-id-contract-refactor`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `origin/personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: No source edits have been made by this solution-design pass. Only ticket artifacts were updated/created. Dependency folders were absent in this worktree, so implementation/validation may need install/bootstrap before running tests.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-25 | Doc | `tickets/in-progress/iframe-launch-id-contract-refactor/requirements.md` | Read bootstrapped requirement. | Draft asks to rename `launchInstanceId`, narrow `ApplicationRequestContext`, preserve iframe stale protection, clean docs/UI, and avoid compatibility dual paths. | Refined to design-ready. |
| 2026-04-25 | Command | `git rev-parse --show-toplevel && git status --short --branch && git rev-parse --abbrev-ref --symbolic-full-name @{u} && git rev-parse origin/personal` | Verify dedicated worktree/branch and base. | Worktree is the ticket worktree; branch is `codex/iframe-launch-id-contract-refactor`, tracking `origin/personal` at `cef8446452af13de1f97cf5c061c11a03443e944`. | No. |
| 2026-04-25 | Command | `rg -n "launchInstanceId|LaunchInstance|autobyteusLaunchInstanceId|x-autobyteus-launch-instance-id" ...` | Inventory current public and internal occurrences. | Found broad usage in shared contracts, frontend SDK startup/client/transport, web host stores/components/utils/tests/docs, server REST/gateway/worker/tests/docs, sample source, sample vendors, and sample dist outputs. | Implementation must update all live and generated surfaces. |
| 2026-04-25 | Code | `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | Inspect authoritative iframe bootstrap contract. | Current v2 contract uses query `autobyteusLaunchInstanceId`, ready payload `{ applicationId, launchInstanceId }`, bootstrap `launch { launchInstanceId }`, and bootstrap `requestContext { applicationId, launchInstanceId }`. Validators require these duplicated fields. | Replace with v3 `iframeLaunchId` and narrowed request context. |
| 2026-04-25 | Code | `autobyteus-application-sdk-contracts/src/index.ts` | Inspect public request context type. | `ApplicationRequestContext` is `{ applicationId: string; launchInstanceId?: string | null }`. The type is re-exported by frontend/backend SDKs and used by server runtime protocol. | Narrow to `{ applicationId: string }`. |
| 2026-04-25 | Code | `autobyteus-application-sdk-contracts/src/manifests.ts`, `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`, `autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts` | Check package compatibility gate. | Application manifests and backend bundle manifests require frontend SDK contract version `"2"`. A breaking hosted-iframe SDK contract change should bump this gate to `"3"` under the no-dual-path requirement. | Update constants, manifest types, parser checks, tests, samples. |
| 2026-04-25 | Code | `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Inspect hosted app startup/trust boundary. | Startup reads v2 launch hints, emits ready with `launchInstanceId`, validates bootstrap `applicationId`, `launch.launchInstanceId`, `requestContext.applicationId`, `requestContext.launchInstanceId`, and `host.origin`, then creates an app client using the bootstrap request context. | Preserve origin/source/app/id checks but rename to `iframeLaunchId` and remove requestContext launch check. |
| 2026-04-25 | Code | `autobyteus-application-frontend-sdk/src/application-client.ts`, `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | Inspect frontend app client request context propagation. | Client fallback context includes `launchInstanceId: null`; route transport writes `x-autobyteus-launch-instance-id` when present. | Remove launch field from fallback and route header injection. |
| 2026-04-25 | Code | `autobyteus-web/stores/applicationHostStore.ts`, `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | Inspect host-side launch state and iframe URL hints. | Store creates `launchInstanceId` per route-visit/reload generation using `createApplicationLaunchInstanceId`; descriptor carries it and URL helper appends current query names. | Rename state/function/descriptor to iframe launch naming. |
| 2026-04-25 | Code | `autobyteus-web/components/applications/ApplicationSurface.vue`, `autobyteus-web/components/applications/ApplicationIframeHost.vue`, `autobyteus-web/components/applications/ApplicationShell.vue` | Inspect host iframe bootstrap owners and UI exposure. | `ApplicationSurface` owns bootstrap envelope construction and stale-ready acceptance; `ApplicationIframeHost` owns raw iframe/message bridge; `ApplicationShell` exposes `Launch instance id` in hidden technical details. | Rename props/emits/logs, preserve stale checks, remove technical detail item/localization. |
| 2026-04-25 | Code | `autobyteus-server-ts/src/api/rest/application-backends.ts` | Inspect REST request context creation. | REST layer reads `launchInstanceId` from body, `x-autobyteus-launch-instance-id` header, or `launchInstanceId` query param and returns `{ applicationId, launchInstanceId }`. Route path is otherwise authoritative for app id. | Remove special launch header/query/body extraction; return `{ applicationId }`. |
| 2026-04-25 | Code | `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Inspect gateway normalization. | Gateway rejects direct mismatched `requestContext.applicationId`, then trims/pass-throughs launch id. No gateway behavior uses launch id. | Keep app-id validation; remove launch normalization. |
| 2026-04-25 | Code | `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts`, `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | Inspect worker context. | Worker passes context to handlers; event/artifact handlers synthesize `{ applicationId, launchInstanceId: null }`. No worker lifecycle depends on launch id. | Synthesize/pass `{ applicationId }` only. |
| 2026-04-25 | Command | `rg -n "launchInstanceId|requestContext" applications/... --glob '!**/vendor/**'` | Check built-in sample authored source. | Brief Studio only logs current bootstrap launch; Socratic Math UI displays launch/request context diagnostics. Sample backend source does not use launch id. | Rename/remove frontend diagnostics and refresh generated assets. |
| 2026-04-25 | Code | `applications/*/application.json`, `applications/*/backend/bundle.json`, `applications/*/scripts/build-package.mjs` | Inspect samples and generation. | Samples and generation scripts hardcode frontend SDK contract `"2"`; committed `ui/vendor` and `dist/importable-package` contain generated old v2 code. | Update hardcoded compatibility and regenerate. |
| 2026-04-25 | Doc | `autobyteus-web/docs/applications.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`, `autobyteus-server-ts/docs/modules/application_backend_gateway.md`, `autobyteus-server-ts/docs/modules/application_sessions.md` | Inspect terminology/documentation. | Docs already say the id is ephemeral in places, but still use `launchInstanceId`, requestContext launch id, and header/query propagation; host docs link to a stale `application-bundle-iframe-contract-v1.md` file while describing v2. | Update docs to v3 and iframe-specific language; rename/remove stale doc path if chosen. |
| 2026-04-25 | Command | `for d in ...; [ -d "$d/node_modules" ]` | Check whether validation can run immediately. | No `node_modules` directories existed at workspace root or package roots. | Validation engineer/implementation may need dependency setup. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User clicks `Enter application` in `ApplicationShell.vue` after setup gate passes.
- Current execution flow:
  1. `ApplicationShell.vue` calls `applicationHostStore.startLaunch(applicationId)`.
  2. `applicationHostStore` ensures backend readiness through `/applications/:applicationId/backend/ensure-ready`, increments a per-app generation, and creates `launchInstanceId`.
  3. `ApplicationSurface.vue` builds an iframe descriptor and waits for a matching ready event.
  4. `ApplicationIframeHost.vue` appends v2 launch hints to the iframe URL, validates raw `ready` messages by source/origin/application/launch id, and posts the bootstrap envelope supplied by `ApplicationSurface`.
  5. `startHostedApplication(...)` in the bundle reads v2 query hints, emits ready, validates the bootstrap envelope against query hints, creates an application client, and hands off to app UI.
  6. Application client calls carry `requestContext` to REST gateway/body and route headers.
  7. Server REST/gateway/engine/worker passes context to app handlers.
- Ownership or boundary observations:
  - `ApplicationSurface.vue` is the real host-side bootstrap owner after backend-ready state exists.
  - `ApplicationIframeHost.vue` is an internal bridge, not the lifecycle owner.
  - `startHostedApplication(...)` is the bundle-side startup owner.
  - Backend gateway/engine owns app handler invocation, but only durable `applicationId` matters there.
- Current behavior summary: The id is an ephemeral iframe bootstrap discriminator, but it leaks into backend context and UI/docs as if it were an application instance/session identity.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | Canonical iframe URL/postMessage contract. | Duplicates `launchInstanceId` in launch hints, ready payload, bootstrap `launch`, and bootstrap `requestContext`. | Own the single v3 `iframeLaunchId` shape and remove duplicate launch/request-context representation. |
| `autobyteus-application-sdk-contracts/src/index.ts` | Public SDK contract exports and `ApplicationRequestContext`. | Request context includes optional launch id. | Tighten request context to durable app identity only. |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Manifest type definitions. | Frontend SDK compatibility is hardcoded to `"2"`. | Bump to v3 because hosted frontend contract changes. |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | Bundle-side startup owner. | Checks both bootstrap launch and request-context launch. | Check `bootstrap.iframeLaunchId` instead; request context only app id. |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | App client REST transport. | Adds `x-autobyteus-launch-instance-id`. | Remove launch-correlation header emission. |
| `autobyteus-web/stores/applicationHostStore.ts` | Host launch readiness/generation state. | Uses `launchInstanceId` terminology. | Rename state to `iframeLaunchId`; lifecycle remains route-visit/reload-scoped. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Host-side bootstrap lifecycle owner. | Builds bootstrap with `launch` and `requestContext.launchInstanceId`. | Build v3 bootstrap with top-level `iframeLaunchId` and requestContext app id only. |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | Iframe bridge for raw URL/message/postMessage. | Validates and emits launch id. | Rename bridge payloads/emits/logging; keep source/origin/app/id checks. |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Route phase and technical details. | Shows hidden technical detail `Launch instance id`. | Remove host UI detail exposure. |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | REST gateway entrypoint. | Reads launch id from body/header/query. | Remove special iframe id ingestion; route app id remains authoritative. |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Gateway service and app-id validation. | Normalizes launch id but never uses it. | Keep app-id check, return context with app id only. |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | App handler context construction. | Event/artifact handlers create launch id `null`. | Construct `{ applicationId }` only. |
| `applications/brief-studio/*`, `applications/socratic-math-teacher/*` | Built-in sample source and generated packages. | Source and generated files include old terminology and SDK compatibility `"2"`. | Update source/build scripts/manifests and regenerate runtime/vendor/dist outputs. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-25 | Probe | Checked `node_modules` at workspace and package roots. | Dependencies are not installed in this ticket worktree. | No tests were run during solution design; validation will need dependency setup. |

## External / Public Source Findings

No external/public sources were needed. The requirement is governed by local source code and local contract files.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not used during investigation.
- Required config, feature flags, env vars, or accounts: None for source investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: None.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The current `launchInstanceId` is route-visit/reload-scoped, generated in the web host after backend readiness; it is not returned by the server and is not used to find a worker/session/run.
2. Stale protection depends on comparing application id, origin/source, contract version, and the current launch discriminator. This safety requirement is compatible with a pure rename/tightening to `iframeLaunchId`.
3. Backend context propagation currently overstates the id's authority: REST and frontend transport promote the iframe discriminator into backend request context, even though backend gateway and worker only need application id.
4. Package compatibility must be considered because hosted bundle startup code is vendored into sample UI packages. A host using v3 query hints would break old v2 vendored startup code; a frontend SDK compatibility bump avoids silent runtime incompatibility.
5. Generated sample directories are tracked and contain old contract output, so implementation must refresh them, not only hand-authored source.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatible dual public contract paths should be retained for the replaced `launchInstanceId` behavior.
- `ApplicationBackendDefinitionContractVersion` can remain v2; the affected compatibility gate is frontend SDK/iframe bootstrap compatibility.
- Event names and channel names can remain stable because the payload contract version changes.
- Server REST route `:applicationId` is authoritative; request context app id mismatch protection remains relevant for direct gateway calls/tests.
- Existing old packages declaring frontend SDK `"2"` will become intentionally unsupported under the clean-cut compatibility bump.

## Open Unknowns / Risks

- Large generated sample diffs are likely.
- Dependency setup may be needed before package tests/builds can run in this worktree.
- Any out-of-repo app package built against frontend SDK v2 must rebuild and update manifests to v3.

## Notes For Architect Reviewer

The requirement is a good idea. The design should be accepted only if it keeps one authoritative iframe id shape, removes iframe identity from backend request context, preserves stale-iframe safety, and explicitly rejects old v2/`launchInstanceId` compatibility branches.
