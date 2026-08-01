# Docs Sync Report

## Scope

- Ticket: `universal-application-framework-proposal-analysis`
- Trigger: `CRR-038` proportional durable-test review Pass following `SR-016`, `ARCH-REV-014`, `IR-019`–`IR-021`, `CRR-037`, and `API-REV-013`
- Prior integrated base: `origin/personal@80d6693c1b0df5abdfd2c3dc0ec01ff885425847`
- Current integrated base: `origin/personal@ea6d6b011035d71dc9594d61ad035470985fca8e`
- Reviewed handoff anchor: `5071b429672e0bf3108f45c30d6747a2ae6331b6`
- Delivery safety checkpoint: `981a9a393f643e35d77daa0ca7e1a864edb54f66`
- Current integrated candidate: `fe7147cb7abd764ed5781cbf0febdb1b0e1af5a2`
- Integration/check evidence: `evidence/delivery/dr-006-base-refresh-and-integration.log`, `evidence/delivery/dr-006-post-integration-check.log`, and `evidence/delivery/dr-006-delivery-audit.log`

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
| v1.4.33 base docs | No application-framework change | `autobyteus-ts` LLM/media-recovery docs, provider catalog docs, `autobyteus-web/docs/browser_sessions.md`, and release history are independently complete. |
| Electron packaging docs | No policy change | DR-006 followed the existing documented personal macOS ARM64 build path; only the concrete verification artifact changed. |

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
- The integrated full server build and exact architecture/runtime matrix pass `32` files / `130` tests.
- The six newly integrated base commits change independent v1.4.33 LLM/media-recovery, browser-session, release, and ticket-history documentation; they introduce no application-framework contract conflict.
- The local Electron build changes no durable packaging policy; `electron-test-build-report.md` records the current v1.4.33 artifact.

Evidence: `evidence/delivery/dr-006-delivery-audit.log`.

## Delivery Continuation

- Result: `Pass — updated and audited on the integrated state`
- Next action: user to test the current v1.4.33 macOS ARM64 Electron package for candidate `fe7147cb7abd764ed5781cbf0febdb1b0e1af5a2` and provide explicit approval/completion or a concrete issue.
- Finalization state: held. No ticket archival, final ticket commit, push, target merge, release, deployment, or cleanup may occur before explicit user verification.

## Blocked Or Escalated Follow-Up

- Classification: `N/A`
- Recommended recipient: `N/A`
- Documentation blocker: `N/A`
