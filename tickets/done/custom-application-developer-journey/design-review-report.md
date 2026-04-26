# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` for Custom Application Developer Journey — Milestone 1.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis:
  - Reviewed supplied requirements, investigation notes, and design spec.
  - Read architecture reviewer shared design guidance at `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/architecture-reviewer/design-principles.md`.
  - Spot-checked repo state in `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey`.
  - Confirmed workspace package layout in `pnpm-workspace.yaml`, root `package.json`, and existing SDK package metadata.
  - Confirmed iframe contract v3 in `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` and `startHostedApplication(...)` behavior in `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts`.
  - Confirmed manifest/package validation constraints in `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`, `autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts`, and `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts`.
  - Confirmed production package import prebuilt package-root behavior in `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` and `autobyteus-server-ts/src/application-packages/utils/application-package-root-summary.ts`.
  - Confirmed current in-repo sample layout in `applications/brief-studio` and `applications/socratic-math-teacher`.
  - Confirmed stale v1 copy in `autobyteus-web/localization/messages/en/applications.ts` and `autobyteus-web/localization/messages/zh-CN/applications.ts`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | 0 | Pass | Yes | Design is concrete, spine-led, and implementable against the current codebase. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/design-spec.md` for Milestone 1 of the external custom-application developer journey.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | No prior findings. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Scaffold/create | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Pack/build importable package | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Validate generated package | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Dev bootstrap | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Production import compatibility | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Dev ready/bootstrap return event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `@autobyteus/application-devkit` | Pass | Pass | Pass | Pass | Correct new boundary for external tooling; avoids putting CLI/build/dev-server concerns into runtime SDKs or server import owners. |
| `@autobyteus/application-sdk-contracts` | Pass | Pass | Pass | Pass | Correct shared owner for manifest/backend/iframe constants and builders. |
| `@autobyteus/application-frontend-sdk` | Pass | Pass | Pass | Pass | Correct app-side startup owner; design preserves `startHostedApplication(...)`. |
| `@autobyteus/application-backend-sdk` | Pass | Pass | Pass | Pass | Correct template backend authoring dependency. |
| Existing server application packages/bundles | Pass | Pass | Pass | Pass | Production import/discovery remains authoritative and unchanged. |
| External developer docs | Pass | Pass | Pass | Pass | Cross-package guide is justified because the journey spans SDK, devkit, packaging, import, and safety wording. |
| Web localization | Pass | Pass | Pass | Pass | Stale v1 copy belongs to existing localization owners. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Source/output path resolution | Pass | Pass | Pass | Pass | Central path policy is necessary to prevent command drift and path escapes. |
| Config defaults/source path names | Pass | Pass | Pass | Pass | Config owner keeps identity out of config and paths/build options in config. |
| Validation diagnostics | Pass | Pass | Pass | Pass | Result shape separated from CLI presentation. |
| Manifest path normalization | Pass | Pass | Pass | Pass | Devkit preflight can duplicate server constraints without becoming production authority. |
| Backend bundle manifest generation | Pass | Pass | Pass | Pass | Manifest writer is separate from backend build invocation. |
| Dev application identity options | Pass | Pass | Pass | Pass | Separate local/mock identity and real-backend application id are called out. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationDevkitConfig` | Pass | Pass | Pass | Pass | Pass | Design keeps application identity in `application.json`, reducing duplicate id/name drift. |
| `ResolvedApplicationProjectPaths` | Pass | Pass | Pass | N/A | Pass | Explicit source root, output root, and generated application root are enough. |
| `ValidationDiagnostic` | Pass | Pass | Pass | N/A | Pass | Diagnostic shape is tight and side-effect free. |
| `DevBootstrapOptions` | Pass | Pass | Pass | Pass | Pass | Mock and real-backend identity modes are distinct enough for implementation. |
| Manifest/backend contract constants | Pass | Pass | Pass | N/A | Pass | Design relies on existing SDK constants rather than new parallel literals. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stale v1 localization copy | Pass | Pass | Pass | Pass | Exact localization files are named. |
| External docs presenting `frontend-src` / `backend-src` as canonical | Pass | Pass | Pass | Pass | New external guide/template becomes canonical; existing samples may remain internal. |
| Devkit fallback defaults for `frontend-src` / `backend-src` | Pass | Pass | Pass | Pass | New default template/source roots are clean-cut `src/frontend` and `src/backend`. |
| App-authored raw-entry dev workaround | Pass | Pass | Pass | Pass | Dev host supplies v3 launch hints/bootstrap instead. |
| Sample-specific build scripts as external guidance | Pass | Pass | Pass | Pass | Replaced for the external journey by `autobyteus-app pack/validate`; physical sample migration can remain follow-up. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `pnpm-workspace.yaml` | Pass | Pass | N/A | Pass | Adds workspace package discovery only. |
| `autobyteus-application-devkit/package.json` | Pass | Pass | N/A | Pass | Package metadata/bin/dependencies owner. |
| `autobyteus-application-devkit/tsconfig*.json` | Pass | Pass | N/A | Pass | Matches existing SDK package pattern. |
| `autobyteus-application-devkit/README.md` | Pass | Pass | Pass | Pass | Package-specific quickstart and CLI reference. |
| `autobyteus-application-devkit/src/cli.ts` | Pass | Pass | Pass | Pass | Thin CLI facade only. |
| `autobyteus-application-devkit/src/commands/*.ts` | Pass | Pass | Pass | Pass | One command per file; command parsing separate from internals. |
| `autobyteus-application-devkit/src/config/*.ts` | Pass | Pass | Pass | Pass | Config model/loading/defaulting owner. |
| `autobyteus-application-devkit/src/paths/application-project-paths.ts` | Pass | Pass | Pass | Pass | Correct shared path policy owner. |
| `autobyteus-application-devkit/src/package/*.ts` | Pass | Pass | Pass | Pass | Source-to-dist assembly/build/copy concerns. |
| `autobyteus-application-devkit/src/validation/*.ts` | Pass | Pass | Pass | Pass | Preflight validation only. |
| `autobyteus-application-devkit/src/dev-server/*.ts` | Pass | Pass | Pass | Pass | Dev bootstrap host/assets/mock routes; production host remains untouched. |
| `autobyteus-application-devkit/src/template/*` and `templates/basic/**` | Pass | Pass | Pass | Pass | Scaffold/template materialization. |
| `autobyteus-application-devkit/tests/*.test.mjs` | Pass | Pass | N/A | Pass | Package-local executable validation. |
| `docs/custom-application-development.md` | Pass | Pass | N/A | Pass | Cross-package external journey guide; creating root `docs/` is acceptable. |
| SDK README files | Pass | Pass | N/A | Pass | Discoverability and install-path clarification. |
| `autobyteus-web/localization/messages/*/applications.ts` | Pass | Pass | N/A | Pass | Stale copy cleanup only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Devkit -> SDK contracts | Pass | Pass | Pass | Pass | Devkit should reuse constants/types/builders. |
| Template -> frontend/backend SDKs | Pass | Pass | Pass | Pass | Correct author-facing dependency direction. |
| SDK packages vs devkit | Pass | Pass | Pass | Pass | SDKs must not import devkit. |
| Production server/web vs devkit | Pass | Pass | Pass | Pass | Production import/runtime must not depend on devkit. |
| Devkit validator vs server import validation | Pass | Pass | Pass | Pass | Devkit is preflight-only; server remains authoritative. |
| Dev mode real-backend identity | Pass | Pass | Pass | Pass | Design forbids mismatched request context and route application id. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-app pack` / package assembler | Pass | Pass | Pass | Pass | Developers/CI depend on command boundary, not builder internals. |
| `autobyteus-app validate` / package validator | Pass | Pass | Pass | Pass | Validator helpers are internal. |
| `autobyteus-app dev` / dev bootstrap server | Pass | Pass | Pass | Pass | Raw `ui/index.html` direct entry remains unsupported. |
| Existing `ApplicationPackageRegistryService` | Pass | Pass | Pass | Pass | Devkit must not mutate production registry/import state. |
| Existing `startHostedApplication(...)` | Pass | Pass | Pass | Pass | Template must not add a parallel dev startup path. |
| Existing server bundle validators | Pass | Pass | Pass | Pass | Devkit validation does not displace import-time authority. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-app create <dir> --id <local-id> --name <name>` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-app pack [--project-root] [--out]` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-app validate [--package-root]` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-app dev [--project-root] [--port] [--application-id] [--backend-base-url] [--backend-notifications-url] [--mock-backend]` | Pass | Pass | Pass | Medium | Pass |
| `autobyteus-app.config.mjs` | Pass | Pass | Pass | Medium | Pass |
| `application.json` source manifest | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-devkit/` | Pass | Pass | Low | Pass | Peer to SDK packages, not nested in server/web. |
| `src/commands` | Pass | Pass | Low | Pass | CLI command handling only. |
| `src/config` | Pass | Pass | Low | Pass | Shared config contract/loading. |
| `src/paths` | Pass | Pass | Low | Pass | Project path policy owner. |
| `src/package` | Pass | Pass | Medium | Pass | Main assembly owner with builders/writers split to avoid a blob. |
| `src/validation` | Pass | Pass | Low | Pass | Preflight diagnostics only. |
| `src/dev-server` | Pass | Pass | Medium | Pass | Dev bootstrap server includes HTTP + iframe adapter; subfiles are named. |
| `src/template` and `templates/basic` | Pass | Pass | Low | Pass | Template materialization/static template source. |
| External app `src/` | Pass | Pass | Low | Pass | Developer-authored source. |
| External app `dist/` | Pass | Pass | Low | Pass | Generated importable output. |
| `autobyteus-web/localization/messages/*/applications.ts` | Pass | Pass | Low | Pass | Existing localization location. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Iframe contract constants/builders | Pass | Pass | N/A | Pass | Reuse SDK contracts. |
| App-side frontend startup | Pass | Pass | N/A | Pass | Reuse frontend SDK. |
| Production import/discovery | Pass | Pass | N/A | Pass | Reuse unchanged server owners. |
| External project creation/build/validate/dev bootstrap | Pass | Pass | Pass | Pass | New devkit package is justified; sample scripts are duplicated app-local code. |
| Manifest/package preflight validation | Pass | Pass | Pass | Pass | New devkit validator acceptable for Milestone 1 because server validators are private production import internals. |
| External app authoring docs | Pass | Pass | N/A | Pass | Existing docs are module/runtime oriented, not full external authoring journey. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| External default source roots | No | Pass | Pass | No `frontend-src` / `backend-src` defaults in new template/devkit. |
| Frontend startup | No | Pass | Pass | One startup model through `startHostedApplication(...)`. |
| Production package `ui/` / `backend/` contract | Yes | Pass | Pass | Retained intentionally as out-of-scope production contract, not legacy authoring layout. |
| Server import validation authority | Yes | Pass | Pass | Retained intentionally; devkit validator is not a compatibility layer. |
| v1 iframe copy | No | Pass | Pass | Stale copy is explicitly removed from touched localization. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Add devkit workspace package | Pass | Pass | Pass | Pass |
| Config/path model before commands | Pass | Pass | Pass | Pass |
| Template/create before pack/dev | Pass | Pass | Pass | Pass |
| Pack/build/generate/validate sequence | Pass | Pass | Pass | Pass |
| Dev bootstrap implementation after contracts/assets | Pass | Pass | Pass | Pass |
| Docs/README/localization updates | Pass | Pass | Pass | Pass |
| Tests/build checks | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| External source/output layout | Yes | Pass | Pass | Pass | Good and avoided shapes are concrete. |
| App startup | Yes | Pass | Pass | Pass | Shows single `startHostedApplication(...)` model. |
| Dev real backend identity | Yes | Pass | Pass | Pass | Example clarifies the route/request-context mismatch hazard. |
| Package import target | Yes | Pass | Pass | Pass | Dist import root is explicit. |
| Backend safety wording | Yes | Pass | Pass | Pass | Avoids overpromising sandboxing. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Public SDK/devkit publishing workflow | External install may need registry/release automation beyond this repo change. | Track as follow-up if package publishing is needed; not required for Milestone 1 implementation readiness. | Residual risk, non-blocking. |
| Current internal sample docs still show old source roots | Existing sample READMEs can still expose `frontend-src` / `backend-src`; new external docs must not present them as canonical. | Implementation should make SDK READMEs and new external guide point authors to the devkit template first; sample migration can stay follow-up unless chosen by implementer. | Residual risk, non-blocking. |
| Real-backend dev identity enforcement | If real-backend mode silently defaults to mock/dev ids, application clients can report a different app identity from the backend route. | Implementation must require `--application-id` when real backend URLs are supplied and use that same id in launch hints, bootstrap `application.applicationId`, and `requestContext.applicationId`. | Residual risk, non-blocking because design already states the rule. |
| Backend bundle self-containment | Server expects a prebuilt self-contained ESM entry; bundling mistakes can leave source `node_modules` dependencies. | Implementation/tests must validate generated backend `entry.mjs` and manifest paths. | Residual risk, non-blocking. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Real-backend dev mode must be enforced exactly as designed: no implicit mock/dev application id when real backend transport URLs are configured.
- Existing internal sample apps may continue to use the old source/runnable peer layout; docs and SDK README links must make the new devkit template the external canonical path.
- Devkit validation duplicates server import validation for Milestone 1; server import must remain authoritative until a future shared-validation extraction is explicitly designed.
- Backend bundling must produce genuinely self-contained ESM output for the starter/template path.
- Public package publishing/release automation may be needed after this milestone before fully external users can install the SDK/devkit from a registry.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design passes architecture review. The main ownership boundaries, data-flow spines, file responsibilities, dependency rules, migration sequence, and examples are sufficient for implementation. No requirement/design-impact findings need upstream rework before coding starts.
