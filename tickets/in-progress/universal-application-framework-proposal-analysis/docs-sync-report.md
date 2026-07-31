# Docs Sync Report

## Scope

- Ticket: `universal-application-framework-proposal-analysis`
- Trigger: `CRR-034` proportional durable-test review Pass following `SR-013`, `ARCH-REV-011`, `IR-018`, `CRR-033`, and `API-REV-012`
- Bootstrap base reference: `origin/personal@6caf809303294252c109420b238588f0c68aca6a`
- Previously integrated base: `origin/personal@dfc0468b137cd231b79ff8096fa46750611b06e2`
- Current integrated base: `origin/personal@80d6693c1b0df5abdfd2c3dc0ec01ff885425847`
- Current integrated candidate: `f25a9646ebb153714bc486cf14519f3530e1f83d`
- Integration/check evidence: `evidence/delivery/dr-005-base-refresh-and-integration.log`, `evidence/delivery/dr-005-post-integration-check.log`, and `evidence/delivery/dr-005-delivery-audit.log`

## Why Docs Were Updated

SR-013 / IR-017 materially simplified the internal application-framework ownership model while preserving the already-approved dual-host product behavior. Long-lived server module docs were updated with the implementation so maintainers can understand the current four-projection runtime boundary, package command/reconciliation ownership, acyclic application-engine construction, worker recovery, artifact delivery ordering, and exact run/resource cleanup without consulting ticket history.

IR-018 changes no public or developer-facing boundary. It corrects stop-all continuation so inactive-run pruning errors are retained while every remaining exact run is still attempted; the current lifecycle documentation already states that contract, so no additional long-lived edit was required for IR-018.

## Long-Lived Docs Reviewed

| Doc Path | Result | Current Truth |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` | Updated by IR-017; delivery-verified | `ApplicationPlatformRuntime` exposes exactly four immutable projections: `lifecycle`, `rest`, `realtime`, and `hostManagement`. Package registry, command, refresh, and reconciliation owners are explicit. |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Updated by IR-017; delivery-verified | Launcher owns ensure/start/restart/stop; controller owns attached workers and invocation. Accepted artifact delivery drains before engine stop; run/resource/session/observer cleanup ordering is explicit. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Updated by IR-017; delivery-verified | Per-run FIFO/independent artifact lanes ensure the worker before controller delivery, lifecycle journals remain separate, and recovery/reentry ownership is current. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Updated by IR-017; delivery-verified | Application session scope is established early; shutdown drains accepted artifact work, stops exact runs, revokes scope, and detaches owned observers. |
| `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md` | Updated by IR-017; delivery-verified | Gateway docs depend on narrow launcher/controller contracts rather than the removed broad engine host. |
| Prior server/web/devkit/external-authoring docs from DR-002/DR-003 | No additional change | Dual-host composition, portable package defaults/Studio overrides, application launch behavior, scoped Agent Tools publication, shutdown, and atomic package contracts remain accurate. |
| v1.4.32 model/pricing docs integrated from `origin/personal` | No application-framework change | `.github` release notes and `autobyteus-ts` LLM/provider-model docs independently describe GPT-5.6 pricing and Claude Opus 5 support. |
| Electron packaging docs | No change | DR-005 followed the existing local unsigned macOS ARM64 process; no packaging policy changed. |

## Durable Design / Runtime Knowledge Promoted

| Topic | Current Durable Contract | Requirements / Review Basis | Long-Lived Location |
| --- | --- | --- | --- |
| Narrow host boundary | Hosts consume only the immutable `lifecycle`, `rest`, `realtime`, and `hostManagement` projections; private construction owners do not leak outward. | `BEH-010`, `REQ-010`, `AC-019`, `CR-019` | Applications module docs |
| Package ownership | Registry owns current state/query, command service owns import/reload/remove and rollback, refresh coordinator owns ordered catalog refresh, and reconciliation is a stable late dependency rather than a later-bound callback. | `AC-020`, `CR-020` | Applications module docs |
| Acyclic execution construction | Application session scope and exact run identity/resource owners exist before run managers; engine launcher/controller/context/event owners are constructed without permanent bind-once proxies. | `AC-021`–`AC-022`, `CR-021` | Engine, Sessions, Gateway docs |
| Artifact delivery and worker recovery | Accepted artifact commands use FIFO per run and independent lanes, call `ensureReady()` before controller delivery, and drain while worker recovery remains available before engine stop. | `SV-C52`–`SV-C55`, API-REV-012 | Engine and Orchestration docs |
| Exact cleanup and continuation | Exact identity is removed before resource/session/observer cleanup; replacement runs are protected; cleanup failures aggregate only after all retained exact runs are attempted. | `AC-023`, `CR-022`, IR-018, API-REV-012 | Engine and Sessions docs |
| Retained dual-host behavior | One immutable package runs in Studio and standalone with portable defaults, sparse Studio overrides, scoped publication/handoff, route separation, remount/recovery, deterministic shutdown, and atomic package parity. | Cumulative requirements; API-REV-012 | Prior DR-002/DR-003 doc set retained |

## Removed / Replaced Components Recorded

| Removed Boundary | Current Owner(s) | Documentation Result |
| --- | --- | --- |
| Broad `ApplicationEngineHostService` | `ApplicationEngineController`, `ApplicationEngineLauncher`, state/context/event collaborators | Removed from current source and module docs; narrow owners documented. |
| `BindOncePublishedArtifactPublisher` and `BindOnceApplicationEngineEventHandler` | Early stable session/publication/run construction and direct engine/event collaborators | Removed without compatibility aliases; current acyclic path documented. |
| Broad overloaded `ApplicationPackageService` and temporal callbacks | Registry, command service, refresh coordinator, catalog reconciliation service | Split responsibilities documented in Applications module. |
| Mixed outward `ApplicationPlatformRuntime` internals | Four immutable host projections | Exact current outward contract documented. |
| Cleanup that could abort before later runs | Failure-preserving active-run snapshot plus manager aggregation | IR-018 restores the documented attempt-all contract. |

## Documentation Audit Result

- Retired broad engine host, bind-once implementations, and broad package service are absent from current source and long-lived server module docs.
- All five IR-017 module docs contain the current narrow owners and relevant lifecycle/order semantics.
- The newly integrated v1.4.32 base changes only its independently owned model/pricing documentation and release history; it has no application-framework documentation impact.
- DR-005 local Electron packaging changes no durable build policy; `electron-test-build-report.md` records the concrete verification artifact.

Evidence: `evidence/delivery/dr-005-delivery-audit.log`.

## Delivery Continuation

- Result: `Pass`
- Next action: user to test the current v1.4.32 macOS ARM64 Electron package for candidate `f25a9646ebb153714bc486cf14519f3530e1f83d` and provide explicit approval/completion or a concrete issue.
- Finalization state: held. No ticket archival, final ticket commit, push, target merge, release, deployment, or cleanup may occur before explicit user verification.

## Blocked Or Escalated Follow-Up

- Classification: `N/A`
- Recommended recipient: `N/A`
- Documentation blocker: `N/A`
