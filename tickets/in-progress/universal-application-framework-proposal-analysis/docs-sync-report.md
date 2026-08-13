# Docs Sync Report

> **DR-009 current authority:** docs sync is blocked because the merge of
> `origin/personal@54890a07f74e941a7a12b6daaa26364f4c927b72` is paused on three
> semantic conflicts. The DR-008 integrated-state statements below are retained
> as the protected pre-refresh snapshot, not as a current handoff. No new
> long-lived documentation decision will be made before Solution Designer
> analysis. See `latest-base-integration-conflict-report.md`.

## Scope

- Ticket: `universal-application-framework-proposal-analysis`
- Trigger: `CRR-038` proportional durable-test review Pass following `SR-016`, `ARCH-REV-014`, `IR-019`–`IR-021`, `CRR-037`, and `API-REV-013`
- Prior integrated base: `origin/personal@ea6d6b011035d71dc9594d61ad035470985fca8e`
- Current integrated base: `origin/personal@8b8ae4c304928b391bdd5466b2262f87d43cf272`
- Reviewed handoff anchor: `5071b429672e0bf3108f45c30d6747a2ae6331b6`
- Delivery safety checkpoint: `a1bd2018d419a977b90c236061555b33df9bafd9`
- Current integrated candidate: `9987c2c10fdc74416b55baa8bd123ab31afe3285`
- Integration/check evidence: `evidence/delivery/dr-008-base-refresh-and-integration.log`, `evidence/delivery/dr-008-post-integration-check.log`, and `evidence/delivery/dr-008-delivery-audit.log`

## Why Docs Were Updated

SR-016 / IR-019 adds a durable, executable contributor contract for the already-passed application framework without changing production behavior. Long-lived server documentation now names `AFB-001` through `AFB-005`, identifies the sole executable checker, describes the governed TS/JS/Vue source families and seven project-profile families, records fail-closed project/manifest resolution, and documents the exact application-scoped construction obligations and remediation rules.

IR-020 and IR-021 correct checker completeness for direction categories, external Vue script resolution, and external-script target governance. They do not change the approved policy meaning, so the IR-019 long-lived documentation remains the accurate current contract without further edits.

## Long-Lived Docs Reviewed

| Doc Path | Result | Current Truth |
| --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Updated by IR-019; delivery-verified | Points maintainers to the sole test-only AFB-001–AFB-005 checker and the canonical application policy. |
| `autobyteus-server-ts/docs/modules/applications.md` | Updated by IR-019; delivery-verified | Defines the five rule families, governed TS/JS/Vue sources, seven project-profile families, fail-closed resolution, own-manifest rule, external Vue source handling, nineteen construction owners, exact general-process exceptions, and remediation. |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Retained; delivery-verified | Launcher/controller split, recovery, artifact drain, and exact runtime ownership remain current. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Retained; delivery-verified | Artifact ordering, recovery/reentry, and lifecycle ownership remain current. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Retained; delivery-verified | Application session scope, shutdown, and exact resource cleanup remain current. |
| `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md` | Retained; delivery-verified | Gateway depends on narrow application runtime owners and remains consistent with AFB-001/AFB-002. |
| Prior server/web/devkit/external-authoring docs from DR-002 through DR-005 | No additional change | Dual-host behavior, portable packages, Studio overrides, publication/handoff, deterministic shutdown, and atomic packaging remain accurate. |
| v1.4.35 base docs | No application-framework conflict | Current-only compaction lineage/provenance, strict v5 native snapshot migration, external-runtime snapshot removal, memory/run-history/work-trace docs, and v1.4.34/v1.4.35 release history are independently complete. |
| Electron packaging docs | Prior DR-008 result retained | DR-008 followed the documented personal macOS ARM64 build path, but that v1.4.35 package is no longer a current verification input. |

## Durable Design / Runtime Knowledge Promoted

| Topic | Current Durable Contract | Requirements / Review Basis | Long-Lived Location |
| --- | --- | --- | --- |
| Executable application boundaries | One test-only checker enforces `AFB-001`–`AFB-005`; it is not part of Studio or standalone startup. | `BEH-011`, `REQ-011`, `AC-024`, `UC-028`; SR-016 / ARCH-REV-014 | Architecture overview and Applications module |
| Transport and presentation directions | Runtime transport surfaces use exact projections/inputs; GraphQL and Studio presentation cannot reach private server application internals. | `AFB-001`, `AFB-002`, `CR-023` | Applications module policy table |
| Package and bundle ownership | Package/bundle owners do not depend outward on API/presentation/assembly/private runtime; the catalog-refresh reconciliation seam is exact. | `AFB-003`, `CR-023` | Applications module policy table |
| Acyclic application construction | Nineteen named construction owners require explicit application-scoped inputs; omission, `null`, `undefined`, and opaque spread cannot select process-global defaults. | `AFB-004`, `AR-010`, `CR-023` | Applications module injection families |
| Governed application/template imports | Brief, Socratic, and devkit-template source uses only local/SDK/Node/own-manifest dependencies; unresolved governed imports fail closed. | `AFB-005`, `AR-011`, `CR-023` | Applications module project/manifest section |
| Vue external scripts | Both the SFC external-source edge and imports/bindings inside the resolved script are governed; diagnostics preserve SFC/source identity. | `CR-024`, `CR-025`, IR-020/IR-021 | Applications module plus executable checker |
| Retained dual-host behavior | Studio and standalone retain real publication, recipient-name handoff, projection, remount/recovery, route separation, exact package parity, and cleanup. | Preserved `AC-001`–`AC-023`; API-REV-013 | Prior application module and external-authoring docs |

## Test/Dependency Documentation Boundary

- `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` is the sole durable policy owner.
- `@vue/compiler-sfc` is a direct `autobyteus-server-ts` development dependency used only to parse Vue SFCs in the test gate; `pnpm-lock.yaml` contains the matching importer integration.
- No production source, route, schema, persisted data, package format, or runtime dependency changed in SR-016 / IR-019–IR-021.
- Legitimate policy changes require architecture, documentation, test-table, and fixture review together; a broad allow-list or compatibility wrapper is not an accepted update path.

## Removed / Replaced Components Recorded

| Removed Boundary | Current Owner(s) | Documentation Result |
| --- | --- | --- |
| Broad `ApplicationEngineHostService` | `ApplicationEngineController`, `ApplicationEngineLauncher`, state/context/event collaborators | Remains absent from source and current module docs. |
| `BindOncePublishedArtifactPublisher` and `BindOnceApplicationEngineEventHandler` | Early stable session/publication/run construction and direct engine/event collaborators | Remain removed without compatibility aliases. |
| Broad overloaded `ApplicationPackageService` and temporal callbacks | Registry, command service, refresh coordinator, catalog reconciliation service | Explicit split remains documented. |
| Mixed outward `ApplicationPlatformRuntime` internals | Four immutable host projections | Exact outward contract remains documented and is protected by AFB-001. |

## Documentation Audit Result

- The architecture pointer, canonical Applications module, and executable checker all contain `AFB-001` through `AFB-005`.
- The Applications module records project/manifest resolution, Vue external scripts, the AFB-004 injection families, exact process exceptions, and corrective guidance.
- The executable policy contains nineteen construction owners and uses the direct test-only Vue parser declared in the server manifest and lockfile.
- Retired broad-host and bind-once source paths remain absent; current controller, launcher, runtime, and projection-contract owners remain present.
- The 29 newly integrated commits carry independently reviewed/released v1.4.34/v1.4.35 memory lineage, natural compaction, external-runtime snapshot removal, strict v5 migration, documentation, and release history; the merge retained the application AFB pointer without conflict.
- The integrated full server build and exact architecture/runtime matrix pass `32` files / `130` tests against the new memory/runtime base.
- The prior local Electron build changed no durable packaging policy; `electron-test-build-report.md` preserves its v1.4.35 artifact and packaged migration-owner evidence as a superseded snapshot.

Evidence: `evidence/delivery/dr-008-delivery-audit.log`.

## Delivery Continuation

- Result: `Blocked — DR-009 latest-base merge unresolved; no current integrated state exists for docs sync`
- Next action: Solution Designer to analyze the v1.4.50-base semantic conflicts and return revised design artifacts or an evidence-backed no-design-change decision with precise resolution guidance.
- Finalization state: held. No user verification, Electron rebuild, ticket archival, final ticket commit, push, target merge, release, deployment, or cleanup may occur before integration and the required downstream gates complete.

## Blocked Or Escalated Follow-Up

- Classification: `Unclear / Design Impact`
- Recommended recipient: `solution_designer` — message delivered successfully
- Documentation blocker: unresolved latest-base merge; long-lived docs cannot be synchronized truthfully before the combined behavior is decided
