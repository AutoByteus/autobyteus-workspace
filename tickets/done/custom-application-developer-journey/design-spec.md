# Design Spec: Custom Application Developer Journey — Milestone 1

## Current-State Read

The current application runtime/import system is package-output oriented, while the current in-repo samples are mixed authoring/runnable roots.

Production package import starts from package roots containing `applications/<local-application-id>/application.json`. The server validates that runtime UI assets stay under `ui/`, backend bundle paths stay under `backend/`, the backend manifest uses contract version `1`, and the backend entry module is a prebuilt self-contained ESM module. Import and registry update are owned by `ApplicationPackageRegistryService`; application discovery and package-content validation are owned by `ApplicationBundleService` / `FileApplicationBundleProvider`. User import does not run app-owned install/build/lifecycle scripts.

Production launch is already iframe contract v3. The frontend host creates an `iframeLaunchId`, appends v3 launch hints, waits for `autobyteus.application.ui.ready`, and posts `autobyteus.application.host.bootstrap`. The app-side owner is `startHostedApplication(...)` in `@autobyteus/application-frontend-sdk`; it treats raw entry without launch hints as unsupported and creates an application client from `bootstrap.transport.backendBaseUrl`. Backend request context is only `{ applicationId }`.

Current teaching samples under `applications/brief-studio` and `applications/socratic-math-teacher` keep editable `frontend-src/` and `backend-src/` beside generated runtime `ui/` and `backend/`. Their duplicated `scripts/build-package.mjs` scripts copy/build those generated runtime folders into `dist/importable-package`. This shape is functional internally but confusing externally because `backend/` looks like source even though it is generated runnable output. There is no reusable devkit CLI, source-layout template, external package validator, or dev bootstrap host.

The target design must respect existing production import/runtime owners, preserve `startHostedApplication(...)` as the only app-authored frontend startup model, and improve only the external authoring bridge in Milestone 1.

## Intended Change

Add an external developer tooling capability centered on a new workspace package `@autobyteus/application-devkit` with CLI binary `autobyteus-app`. It owns external app project scaffolding, source-to-package assembly, preflight validation, and lightweight dev iframe bootstrap.

Milestone 1 introduces the canonical external authoring layout:

```text
my-autobyteus-app/
  package.json
  application.json
  autobyteus-app.config.mjs
  src/
    frontend/
      index.html
      app.ts
      styles.css
    backend/
      index.ts
      migrations/
      assets/
    agents/
    agent-teams/
  dist/
    importable-package/
      applications/
        <local-application-id>/
          application.json
          ui/
          backend/
          agents/
          agent-teams/
```

The source root contains editable source and config. All generated runtime/importable files go under `dist/`. Inside the generated package, the existing AutoByteus contract remains unchanged: `application.json` points to `ui/index.html` and `backend/bundle.json`; backend runtime files live under generated `backend/`.

## Terminology

- `Devkit`: the new `@autobyteus/application-devkit` package and its `autobyteus-app` CLI.
- `External app project`: a developer-owned source repository using `application.json`, `autobyteus-app.config.mjs`, `src/`, and `dist/`.
- `Source root`: the project root where the developer edits `application.json`, config, and `src/**`.
- `Generated package root`: default `dist/importable-package`, the root users import into AutoByteus.
- `Generated application root`: `dist/importable-package/applications/<local-application-id>`.
- `Runtime UI folder`: generated `ui/` under the generated application root.
- `Runtime backend folder`: generated `backend/` under the generated application root.
- `Dev application identity`: identity used by dev bootstrap. In mock mode this can default to `dev:<localApplicationId>`; in real-backend mode it must be supplied and must match the target AutoByteus backend route application id.

## Design Reading Order

Read this design from the spines first:

1. scaffold/create path,
2. pack/build path,
3. validate path,
4. dev bootstrap path,
5. production import compatibility path.

Then read subsystem allocation and file mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Milestone 1 will not add compatibility aliases that treat `frontend-src/` or `backend-src/` as accepted external devkit source roots.
- Milestone 1 will not add a second app startup model for development.
- Milestone 1 will not preserve stale v1 iframe terminology on touched user/developer-facing surfaces.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Developer runs `autobyteus-app create` | New external app project on disk | Devkit template materializer | Establishes canonical `src/` authoring and `dist/` output model. |
| DS-002 | Primary End-to-End | Developer runs `autobyteus-app pack` | Generated importable package root | Devkit package assembler | Converts source project into current AutoByteus package contract without changing production import. |
| DS-003 | Primary End-to-End | Developer/CI runs `autobyteus-app validate` | Validation report / process exit | Devkit package validator | Catches package/contract problems before distribution. |
| DS-004 | Primary End-to-End | Developer runs `autobyteus-app dev` and opens dev URL | App UI bootstraps through `startHostedApplication(...)` | Devkit dev bootstrap server | Lets developers test frontend startup through the same v3 contract without raw unsupported entry. |
| DS-005 | Primary End-to-End | User imports `dist/importable-package` into AutoByteus | Catalog/runtime availability through existing server owners | Existing `ApplicationPackageRegistryService` / `ApplicationBundleService` | Proves generated output remains compatible and import-safe. |
| DS-006 | Return-Event | Dev iframe app sends ready event | Dev host posts bootstrap envelope | Devkit dev bootstrap server using SDK contracts | The dev handshake must mirror v3 production ready/bootstrap semantics. |

## Primary Execution Spine(s)

- DS-001: `CLI create command -> Template Materializer -> Token Renderer -> Project Filesystem -> External App Project`
- DS-002: `CLI pack command -> Config Loader -> Source Project Reader -> Frontend/Backend Builders -> Package Assembler -> Generated Package Validator -> dist/importable-package`
- DS-003: `CLI validate command -> Package Root Resolver -> Package Validator -> Validation Reporter -> Exit Code`
- DS-004: `CLI dev command -> Dev Build/Asset Resolver -> Dev Bootstrap Server -> Host Page/Iframe -> startHostedApplication(...) -> App Business UI`
- DS-005: `Generated Package Root -> Existing Package Import Service -> Existing Bundle Validation -> Existing Catalog Refresh -> Existing Runtime Launch Path`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The developer creates a source project from an embedded template. The devkit copies versioned template files, substitutes app id/name/package metadata, and leaves the project with editable `src/**` plus generated-output-free root. | CLI create, template materializer, external app project | Devkit template materializer | Token validation, safe target directory handling, package metadata generation. |
| DS-002 | The developer packs a source project. The devkit reads config and `application.json`, bundles frontend into generated `ui/`, bundles backend into generated `backend/dist/entry.mjs`, writes `backend/bundle.json`, copies optional agents/teams/migrations/assets, and validates the generated package. | CLI pack, config loader, project reader, builders, package assembler, validator | Devkit package assembler | esbuild invocation, path normalization, output cleanup, manifest consistency, source/output separation. |
| DS-003 | The developer or CI validates a generated package. The devkit scans package roots, validates manifest/backend paths and contract versions, verifies required files, and returns actionable diagnostics without importing into AutoByteus. | CLI validate, package validator, reporter | Devkit package validator | Diagnostic formatting, JSON/text output option if implemented, path escape protection. |
| DS-004 | The developer tests frontend startup through a dev host. The devkit serves a host page that loads the generated or built UI in an iframe with v3 launch hints. The app emits ready through the frontend SDK; the dev host verifies the ready event and posts a v3 bootstrap payload. | CLI dev, dev server, host page, iframe bridge, app SDK startup | Devkit dev bootstrap server | Dev identity resolution, mock vs real backend transport, static asset serving, ready timeout, browser URL logging. |
| DS-005 | The user imports the package generated by DS-002. Existing server import validates and registers the package exactly as today. No production import path invokes devkit build logic or app scripts. | Generated package, existing import service, bundle validation, catalog refresh | Existing server package/bundle services | Trust-boundary docs, package root compatibility, import safety regression. |
| DS-006 | During dev mode, the app-side SDK emits `autobyteus.application.ui.ready`; the dev host responds with `autobyteus.application.host.bootstrap` carrying top-level `iframeLaunchId` and `requestContext: { applicationId }`. | Ready event, bootstrap envelope | Devkit dev bootstrap server with SDK contracts | Origin checks, iframe generation identity, contract version validation. |

## Spine Actors / Main-Line Nodes

- `autobyteus-app` CLI: command entry facade for devkit operations.
- Devkit config loader: resolves source root, output root, entrypoints, supported backend exposures, and optional copy roots.
- Template materializer: creates canonical starter source projects.
- Package assembler: owns source-to-generated-package sequencing.
- Frontend builder: builds/copies source frontend into generated `ui/`.
- Backend builder: builds source backend into generated self-contained ESM entry under `backend/dist/`.
- Backend bundle manifest writer: writes generated `backend/bundle.json` from config and contract constants.
- Package validator: validates generated package root shape and contracts.
- Dev bootstrap server: owns dev host page, static serving, v3 ready/bootstrap simulation, and dev transport identity.
- Existing production package/bundle services: remain authoritative for user import/discovery.
- Existing frontend SDK startup: remains authoritative for app-side startup.

## Ownership Map

- `autobyteus-app` CLI owns only argument parsing, command dispatch, error presentation, and process exit codes. It is a thin entry facade.
- Devkit config loader owns config defaults, config file loading, path normalization, and path containment checks for source/output separation.
- Template materializer owns starter project file creation and token substitution. It does not own packaging or validation policy.
- Package assembler owns the pack sequence and generated package layout. It delegates concrete frontend/backend builds and validation to owned sub-components.
- Frontend builder owns browser bundle output under generated `ui/`; it does not own iframe bootstrap behavior.
- Backend builder owns Node ESM bundle output under generated `backend/dist/`; it does not own application engine execution.
- Backend bundle manifest writer owns generated backend manifest fields and SDK compatibility constants.
- Package validator owns local developer preflight diagnostics; it does not replace server import validation.
- Dev bootstrap server owns developer-only iframe host/bootstrap behavior; it does not own production `ApplicationSurface` / `ApplicationIframeHost` behavior.
- Existing `ApplicationPackageRegistryService` and `ApplicationBundleService` remain production import/discovery authorities.
- Existing `startHostedApplication(...)` remains app frontend startup authority.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `autobyteus-application-devkit/src/cli.ts` | Command implementations under `src/commands/*` | Single CLI binary entrypoint. | Build policy, validation rules, dev bootstrap state. |
| `autobyteus-app create` | Template materializer | User-facing command for project creation. | Package assembly or dev server behavior. |
| `autobyteus-app pack` | Package assembler | User-facing command for package output. | Production import/discovery authority. |
| `autobyteus-app validate` | Package validator | User-facing preflight command. | AutoByteus registry/import mutation. |
| `autobyteus-app dev` | Dev bootstrap server | User-facing dev startup command. | Production host launch behavior or backend worker runtime. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Stale `v1 ready/bootstrap handshake` localization copy | Current contract is v3; stale copy misleads developers/users. | Updated strings in `autobyteus-web/localization/messages/en/applications.ts` and `zh-CN/applications.ts`. | In This Change | Use v3 terminology. |
| External documentation of root-level `frontend-src/` / `backend-src/` as canonical layout | Milestone 1 canonical external layout is `src/frontend` and `src/backend` with generated outputs under `dist/`. | New external developer docs and devkit template. | In This Change | Existing internal samples may remain as internal examples, but docs must not present their layout as the new external default. |
| Any devkit compatibility fallback for `frontend-src/` / `backend-src` | Supporting old names would preserve the confusing layout in the new tooling. | `autobyteus-app.config.mjs` defaults to `src/frontend` and `src/backend`; users can configure explicit paths only if needed, but the starter/default path is clean. | In This Change | If configurable paths are allowed, docs should still label `src/` as canonical. |
| App-authored raw-entry dev workaround | Dev mode must not ask app authors to bypass `startHostedApplication(...)`. | Dev bootstrap server. | In This Change | Raw `ui/index.html` remains unsupported outside a host/dev bootstrap context. |
| Sample-specific build-script pattern as external guidance | Duplicate per-app scripts are not reusable developer product. | `@autobyteus/application-devkit` pack/validate commands. | In This Change | Actual sample script removal can be a follow-up unless implementation migrates samples. |

## Return Or Event Spine(s) (If Applicable)

- DS-006 dev ready/bootstrap event flow:
  `Iframe UI -> createApplicationUiReadyEnvelopeV3 -> Dev Host Message Listener -> Ready Validator -> createApplicationHostBootstrapEnvelopeV3 -> Iframe UI -> startHostedApplication(...) beginStartup`

This mirrors production message semantics while remaining developer-local.

## Bounded Local / Internal Spines (If Applicable)

- Package assembly bounded local spine inside package assembler:
  `Resolve config -> Clean output root -> Build UI -> Build backend -> Write manifests -> Copy optional app-owned resources -> Validate generated package -> Report output path`
  - Why it matters: output cleanup and validation must be sequenced so stale generated files do not mask build failures.

- Dev server bounded local spine inside dev bootstrap server:
  `Start HTTP server -> Serve host page -> Serve UI assets -> Receive ready message -> Validate identity/origin/version -> Post bootstrap -> Surface timeout/error`
  - Why it matters: dev mode should test the same app startup assumptions as production.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Config defaulting/path normalization | DS-001, DS-002, DS-003, DS-004 | Devkit command owners | Resolve source/output paths and prevent source/output overlap. | Every command needs consistent project paths. | Each command would duplicate subtle path logic and drift. |
| Contract constants | DS-002, DS-003, DS-004, DS-006 | Manifest writer, validator, dev server | Use shared SDK versions and iframe constants. | Prevent hardcoded stale versions. | Stale v1/v2 vocabulary could reappear. |
| Build tool invocation | DS-002, DS-004 | Package assembler | Invoke esbuild or equivalent with source root cwd and configured entries. | Separates build mechanics from package layout. | Assembler becomes a build-tool blob. |
| Diagnostic formatting | DS-003 | Validator | Convert validation failures to readable CLI output. | Needed for CI/developer usability. | Validator logic gets mixed with terminal presentation. |
| Static asset serving | DS-004 | Dev bootstrap server | Serve generated/built UI assets. | Necessary for iframe dev bootstrap. | Dev server core gets mixed with file copy/build logic. |
| Mock backend transport | DS-004 | Dev bootstrap server | Provide minimal backendBaseUrl endpoints when no real AutoByteus backend is supplied. | Allows startup testing without full backend. | Could be mistaken for production backend behavior. |
| Real backend identity checks | DS-004 | Dev bootstrap server | Require/surface `--application-id` when targeting real AutoByteus backend transport. | Backend gateway requires requestContext application id to match route. | App calls fail with confusing backend request-context mismatch. |
| External docs | DS-001..DS-005 | Developer journey | Explain layout, commands, safety boundary, and install path. | Tooling needs an understandable workflow. | Users infer old sample layout or overtrust import safety. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Iframe contract constants and builders | `@autobyteus/application-sdk-contracts` | Reuse | Already authoritative for v3 query names, envelope types, validators/builders. | N/A |
| App frontend startup | `@autobyteus/application-frontend-sdk` | Reuse | `startHostedApplication(...)` already owns app-side startup. | N/A |
| Production import/discovery | `autobyteus-server-ts/src/application-packages` and `src/application-bundles` | Reuse unchanged | Already authoritative for user import safety and catalog refresh. | N/A |
| External project creation/build/validate/dev bootstrap | None | Create New | No reusable devkit/scaffold exists; sample scripts are app-local and duplicated. | Server runtime owners should not own external developer tooling. |
| Manifest/package preflight validation | Server validators exist but are internal to server import | Create New in devkit for Milestone 1 | External CLI must run without importing the private server package. | Future shared extraction possible, but Milestone 1 should not couple devkit to server internals. |
| Docs for external app authoring | Existing server/web/SDK module docs | Extend | Existing docs explain internals and SDK usage but not the full external journey. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `@autobyteus/application-devkit` | CLI, template materialization, config, package assembly, validation, dev bootstrap. | DS-001..DS-004, DS-006 | Devkit command owners | Create New | New workspace package. |
| `@autobyteus/application-sdk-contracts` | Shared contract constants/types/builders. | DS-002..DS-006 | Devkit, SDK, production host/server | Reuse | Do not duplicate iframe constants. |
| `@autobyteus/application-frontend-sdk` | App-side startup and frontend client. | DS-004, DS-006 | App author | Reuse | Template imports `startHostedApplication(...)`. |
| `@autobyteus/application-backend-sdk` | Backend definition helper/types. | DS-002, DS-005 | App backend author | Reuse | Template imports `defineApplication(...)`. |
| Existing server application packages/bundles | Production package import/discovery validation. | DS-005 | AutoByteus user import | Reuse unchanged | No production import build/install behavior. |
| External developer docs | Source/output model, commands, install path, safety boundary. | DS-001..DS-005 | External developers/users | Extend/Create | Add durable docs and devkit README. |
| Web localization | User-facing application strings. | DS-004, DS-014 cleanup | Existing app UI | Extend | Fix stale v1 text. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-devkit/src/cli.ts` | Devkit | CLI facade | Parse args, dispatch commands, map errors to exit codes. | One binary entrypoint. | Command result types. |
| `autobyteus-application-devkit/src/commands/create.ts` | Devkit | Create command | Validate args and call template materializer. | Command-level argument ownership. | Config defaults. |
| `autobyteus-application-devkit/src/commands/pack.ts` | Devkit | Pack command | Load config and call package assembler. | Command-level orchestration. | Pack result. |
| `autobyteus-application-devkit/src/commands/validate.ts` | Devkit | Validate command | Resolve package root and call validator/reporter. | Command-level validation entry. | Validation result. |
| `autobyteus-application-devkit/src/commands/dev.ts` | Devkit | Dev command | Load config, prepare dev assets, start server. | Command-level dev entry. | Dev options. |
| `autobyteus-application-devkit/src/config/application-devkit-config.ts` | Devkit | Config model | Typed config/defaults for source paths, output paths, backend manifest settings, dev options. | One config contract. | Contract constants. |
| `autobyteus-application-devkit/src/config/load-application-devkit-config.ts` | Devkit | Config loader | Load `autobyteus-app.config.mjs`, merge defaults, normalize paths. | Keeps IO/loading separate from config shape. | Config model. |
| `autobyteus-application-devkit/src/paths/application-project-paths.ts` | Devkit | Path resolver | Resolve source/output/generated application paths and containment checks. | Shared path policy across commands. | Config model. |
| `autobyteus-application-devkit/src/package/package-assembler.ts` | Devkit | Package assembler | Sequence pack operation and generated package layout. | Main DS-002 owner. | Builders, validator. |
| `autobyteus-application-devkit/src/package/frontend-builder.ts` | Devkit | Frontend builder | Build/copy `src/frontend` into generated `ui`. | Browser build concern. | Project paths. |
| `autobyteus-application-devkit/src/package/backend-builder.ts` | Devkit | Backend builder | Bundle `src/backend/index.ts` into `backend/dist/entry.mjs`. | Node backend build concern. | Project paths. |
| `autobyteus-application-devkit/src/package/backend-bundle-manifest-writer.ts` | Devkit | Manifest writer | Generate backend `bundle.json`. | Keeps manifest generation from build invocation. | SDK constants. |
| `autobyteus-application-devkit/src/package/resource-copier.ts` | Devkit | Package resource copier | Copy migrations/assets/agents/agent-teams into generated application root. | Copy policy is separate from bundling. | Project paths. |
| `autobyteus-application-devkit/src/validation/package-validator.ts` | Devkit | Package validator | Validate generated package root and application roots. | Main DS-003 owner. | Validation result, manifest path checks. |
| `autobyteus-application-devkit/src/validation/manifest-paths.ts` | Devkit | Manifest path validator | Normalize/validate manifest relative paths under `ui/` and `backend/`. | Shared path rule between app/backend manifests. | Validation diagnostics. |
| `autobyteus-application-devkit/src/validation/validation-result.ts` | Devkit | Validation model | Diagnostic/result types and helpers. | Shared by validator and CLI reporter. | N/A |
| `autobyteus-application-devkit/src/dev-server/dev-bootstrap-server.ts` | Devkit | Dev server | HTTP server, host page route, asset serving, ready/bootstrap handling. | Main DS-004 owner. | SDK iframe contracts. |
| `autobyteus-application-devkit/src/dev-server/dev-host-page.ts` | Devkit | Host page renderer | Render HTML/JS host shell with iframe and handshake code. | Keeps generated host page out of server IO. | SDK constants injected. |
| `autobyteus-application-devkit/src/dev-server/mock-backend-routes.ts` | Devkit | Mock backend | Minimal mock backend endpoints for startup tests. | Clear mock boundary. | None. |
| `autobyteus-application-devkit/src/template/template-materializer.ts` | Devkit | Template materializer | Copy embedded starter template and replace tokens. | Main DS-001 owner. | Template variables. |
| `autobyteus-application-devkit/templates/basic/**` | Devkit | Starter template | Canonical source layout. | Durable scaffold source. | SDK package names. |
| `docs/custom-application-development.md` | Docs | External journey doc | Full developer journey and safety boundary. | External guide not tied to one SDK README. | CLI/SDK names. |
| SDK READMEs | SDK docs | Package-specific docs | Link external guide and clarify install usage. | Keep package docs discoverable. | N/A |
| `autobyteus-web/localization/messages/*/applications.ts` | Web localization | User-facing strings | Fix stale v1 copy. | Existing localization owner. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Devkit source/output path resolution | `src/paths/application-project-paths.ts` | Devkit | Used by pack, validate, dev, and create. | Yes | Yes | Generic path helper with no project meaning. |
| Config defaults and source path names | `src/config/application-devkit-config.ts` | Devkit | Commands and template need one config contract. | Yes | Yes | Kitchen-sink config with production runtime state. |
| Validation diagnostics | `src/validation/validation-result.ts` | Devkit | Validator and CLI reporter share result shape. | Yes | Yes | Mixed logging/validation side-effect object. |
| Manifest path normalization | `src/validation/manifest-paths.ts` | Devkit | App manifest and backend manifest both need containment/prefix checks. | Yes | Yes | Replacement for server authoritative validation. |
| Backend bundle manifest generation | `src/package/backend-bundle-manifest-writer.ts` | Devkit | Pack and tests need deterministic manifest output. | Yes | Yes | Place for backend build logic. |
| Dev application identity | Config/dev options type | Devkit | Dev host needs explicit identity in mock vs real backend modes. | Yes | Yes | Production application identity abstraction. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationDevkitConfig` | Yes | Yes | Medium | Keep application identity in `application.json`; config should own paths/build options, not duplicate manifest id/name. |
| `ResolvedApplicationProjectPaths` | Yes | Yes | Low | Keep source root, output package root, generated application root explicit. |
| `ValidationDiagnostic` | Yes | Yes | Low | Include `severity`, `code`, `message`, and optional `path`; do not include mutable reporter state. |
| `DevBootstrapOptions` | Yes | Yes | Medium | Separate `devApplicationId` from `localApplicationId`; require explicit `applicationId` when using real backend transport. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `pnpm-workspace.yaml` | Workspace | Workspace package registration | Add `autobyteus-application-devkit`. | Workspace discovery. | N/A |
| `autobyteus-application-devkit/package.json` | Devkit | Package metadata | Name, bin, exports, scripts, package files/deps. | Package boundary. | N/A |
| `autobyteus-application-devkit/tsconfig.json` and `tsconfig.build.json` | Devkit | TS config | Build/test TS settings. | Existing SDK package pattern. | N/A |
| `autobyteus-application-devkit/README.md` | Devkit docs | CLI/package guide | CLI quickstart and command reference. | Package-specific docs. | External guide. |
| `autobyteus-application-devkit/src/cli.ts` | Devkit | CLI facade | Dispatch create/pack/validate/dev. | One binary entrypoint. | Command results. |
| `autobyteus-application-devkit/src/commands/*.ts` | Devkit | Command owners | One file per command. | Keeps command argument parsing separate. | Config/results. |
| `autobyteus-application-devkit/src/config/*.ts` | Devkit | Config owner | Config shape/loading/defaults. | Shared project config. | SDK constants. |
| `autobyteus-application-devkit/src/paths/application-project-paths.ts` | Devkit | Path policy | Resolve canonical paths and source/output containment. | Single path policy owner. | Config. |
| `autobyteus-application-devkit/src/package/*.ts` | Devkit | Package assembly | Build/copy/generate package outputs. | Source-to-dist concern. | Project paths, SDK constants. |
| `autobyteus-application-devkit/src/validation/*.ts` | Devkit | Preflight validator | Validate generated package shape. | Dev validation concern. | SDK constants. |
| `autobyteus-application-devkit/src/dev-server/*.ts` | Devkit | Dev bootstrap | Serve dev host/assets/mock backend and v3 handshake. | Dev mode concern. | SDK iframe builders/validators. |
| `autobyteus-application-devkit/src/template/*.ts` and `templates/basic/**` | Devkit | Template owner | Materialize starter project. | Scaffold concern. | Config/template variables. |
| `autobyteus-application-devkit/tests/*.test.mjs` | Devkit validation | Executable checks | Cover scaffold, pack/validate, dev bootstrap contract. | Package-local tests. | Built package. |
| `docs/custom-application-development.md` | Project docs | External guide | End-to-end developer journey. | Durable external docs. | Devkit README. |
| `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-frontend-sdk/README.md`, `autobyteus-application-backend-sdk/README.md` | SDK docs | SDK package docs | Link external guide and install path. | Discoverability. | N/A |
| `autobyteus-web/localization/messages/en/applications.ts`, `zh-CN/applications.ts` | Web localization | Existing copy owner | Change stale v1 handshake text to v3. | Contract vocabulary cleanup. | N/A |

## Ownership Boundaries

- Devkit may depend on SDK contract/frontend/backend packages, but SDK packages must not depend on devkit.
- Devkit may generate package files matching production import contracts, but it must not call or import private server package/bundle services.
- Production server import remains authoritative. Devkit validation is preflight-only.
- Dev bootstrap server may emulate iframe handshake and provide mock/real transport URLs, but it must not alter production `ApplicationSurface` or `ApplicationIframeHost` behavior.
- External app source identity lives in `application.json` (`id`, `name`, resource slots). Devkit config owns paths/build settings, not duplicate app identity.
- Generated runtime folders `ui/` and `backend/` belong under generated package root, not source root.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `autobyteus-app pack` / package assembler | frontend builder, backend builder, manifest writer, resource copier | Developers/CI needing package output | Manually copying template internals into `dist/` in docs/tests. | Add config/options to pack. |
| `autobyteus-app validate` / package validator | manifest/path/file checks | Developers/CI needing preflight validation | Calling internal manifest-path helpers as CLI entrypoints. | Add validator option/reporting. |
| `autobyteus-app dev` / dev bootstrap server | host page, static server, mock routes, v3 message handling | Developers needing local frontend bootstrap | Opening raw generated `ui/index.html` directly. | Add dev server options. |
| Existing server `ApplicationPackageRegistryService` | settings/registry updates, bundle validation, catalog refresh | AutoByteus user import | Devkit mutating AutoByteus app registry directly. | Add server API later if needed. |
| Existing `startHostedApplication(...)` | launch hints, ready/bootstrap, client creation | App-authored frontend code | Template adding a parallel dev-only startup path. | Add dev host capability, not app-side fork. |

## Dependency Rules

Allowed:

- `@autobyteus/application-devkit` may depend on `@autobyteus/application-sdk-contracts` for constants/types/builders.
- Starter template may depend on `@autobyteus/application-frontend-sdk` and `@autobyteus/application-backend-sdk`.
- Devkit may use build tooling such as `esbuild` internally for package output.
- Docs may link from SDK READMEs to the external developer guide.

Forbidden:

- SDK packages must not import devkit.
- `autobyteus-server-ts` and `autobyteus-web` production runtime must not depend on devkit for import/launch behavior.
- Devkit must not support new external default source roots named `frontend-src` / `backend-src`.
- Devkit must not run app install/build scripts during user import; user import is outside devkit and remains server-owned.
- Dev mode must not require app code to bypass or replace `startHostedApplication(...)`.
- Real-backend dev mode must not send a requestContext application id that differs from the backend route application id.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-app create <dir> --id <local-id> --name <name>` | Starter project | Materialize canonical template. | Local application id and display name. | Creates source project only. |
| `autobyteus-app pack [--project-root <path>] [--out <path>]` | Source-to-package assembly | Generate importable package root. | Project root path; local app id read from `application.json`. | Default output `dist/importable-package`. |
| `autobyteus-app validate [--package-root <path>]` | Generated package preflight | Validate package root. | Package root path. | Default `dist/importable-package`. |
| `autobyteus-app dev [--project-root <path>] [--port <n>] [--application-id <id>] [--backend-base-url <url>] [--backend-notifications-url <url>] [--mock-backend]` | Dev bootstrap session | Serve dev host and bootstrap app iframe. | Local app id from manifest; dev/prod application id explicit depending on transport mode. | Real backend mode should require or strongly validate `--application-id`. |
| `autobyteus-app.config.mjs` | Build/dev config | Declare source paths, output paths, backend target/exposures, optional copy roots. | Paths relative to project root. | Avoid duplicating app id/name. |
| `application.json` | Application manifest source | Declare app manifest v3 fields and resourceSlots. | Local application id. | Copied unchanged into generated application root except formatting if implementation normalizes. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `create` | Yes | Yes | Low | Keep only template materialization. |
| `pack` | Yes | Yes | Low | Reads app identity from manifest; no backend runtime identity. |
| `validate` | Yes | Yes | Low | Accepts package root only. |
| `dev` | Mostly | Needs care | Medium | Split mock vs real backend options and document required `--application-id` for real backend. |
| `autobyteus-app.config.mjs` | Yes | Yes | Medium | Keep identity out of config; place paths/build options in config. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| New dev tooling package | `@autobyteus/application-devkit` | Yes | Low | Use consistently in docs. |
| CLI binary | `autobyteus-app` | Yes | Low | Avoid alternate names like `app-dev`. |
| Source frontend folder | `src/frontend` | Yes | Low | Do not introduce `frontend-src` in new template. |
| Source backend folder | `src/backend` | Yes | Low | Do not use root `backend` as source. |
| Generated package root | `dist/importable-package` | Yes | Low | Docs should say this is the import target. |
| Generated runtime UI | `ui/` under package app root | Existing but acceptable | Medium | Explain as generated runtime contract folder. |
| Generated runtime backend | `backend/` under package app root | Existing but ambiguous | Medium | Explain as generated runtime contract folder, not source. |

## Applied Patterns (If Any)

- CLI facade: `src/cli.ts` is a thin entry wrapper around command owners.
- Template materializer: controlled project creation from embedded template files.
- Package assembler: a manager-style owner with explicit lifecycle/sequencing for source-to-dist packaging.
- Validator: preflight validation with diagnostics, intentionally separate from CLI reporting.
- Dev server/adapter: developer-only host that adapts iframe contract v3 into a local browser test surface.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-devkit/` | Folder | Devkit package | External app authoring tooling. | Peer to existing SDK packages. | Production server import/runtime code. |
| `autobyteus-application-devkit/src/commands/` | Folder | CLI command layer | Command argument handling and command-level orchestration. | Separates entry commands from core owners. | Build/validation internals. |
| `autobyteus-application-devkit/src/config/` | Folder | Config owner | Config types/defaults/loading. | Cross-command shared concern. | App manifest identity duplication. |
| `autobyteus-application-devkit/src/paths/` | Folder | Path policy owner | Source/output path resolution. | Prevents command-level path drift. | Generic unrelated filesystem helpers. |
| `autobyteus-application-devkit/src/package/` | Folder | Package assembler | Build/copy/generate package output. | Owns DS-002. | Dev HTTP server behavior. |
| `autobyteus-application-devkit/src/validation/` | Folder | Package validator | Package preflight validation. | Owns DS-003. | Production registry mutation. |
| `autobyteus-application-devkit/src/dev-server/` | Folder | Dev bootstrap server | Dev host page, iframe, bootstrap, mock backend. | Owns DS-004/DS-006. | Production host components. |
| `autobyteus-application-devkit/src/template/` | Folder | Template materializer | Project creation from templates. | Owns DS-001. | Packaging logic. |
| `autobyteus-application-devkit/templates/basic/` | Folder | Starter template | Canonical starter files. | Source of `create` command materialization. | Generated output files under root `ui/` or `backend/`. |
| `docs/custom-application-development.md` | File | External docs | End-to-end external app development guide. | Central durable guide. | Internal-only module details unless needed. |
| `autobyteus-web/localization/messages/en/applications.ts` | File | Localization | v3 copy cleanup. | Existing owner. | New devkit docs. |
| `autobyteus-web/localization/messages/zh-CN/applications.ts` | File | Localization | v3 copy cleanup. | Existing owner. | New devkit docs. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-application-devkit/src/commands` | Transport/entry | Yes | Low | CLI command handling only. |
| `autobyteus-application-devkit/src/package` | Main-Line Domain-Control | Yes | Medium | Keep builders/writers separate so assembler does not become a blob. |
| `autobyteus-application-devkit/src/validation` | Off-Spine Concern | Yes | Low | Preflight diagnostics only. |
| `autobyteus-application-devkit/src/dev-server` | Main-Line Domain-Control + adapter | Yes | Medium | Dev server includes HTTP and iframe adapter; keep host page/mock routes as separate files. |
| `autobyteus-application-devkit/templates/basic` | Persistence/static provider | Yes | Low | Template source files only. |
| Generated external app `src/` | Source authoring | Yes | Low | Developer edits here. |
| Generated external app `dist/` | Generated output | Yes | Low | User imports from here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| External source layout | `src/frontend/app.ts`, `src/backend/index.ts`, `dist/importable-package/applications/my-app/ui/app.js`, `dist/importable-package/applications/my-app/backend/dist/entry.mjs` | Root `frontend-src/`, `backend-src/`, generated `ui/`, generated `backend/` all as peers | Prevents confusion between source and generated runtime output. |
| App startup | Template frontend calls `startHostedApplication({ rootElement, onBootstrapped })` once. | Template checks `if (dev) startDevApplication(); else startHostedApplication(...)`. | Keeps one app startup model. |
| Dev real backend identity | `autobyteus-app dev --application-id application-local:%2F...__my-app --backend-base-url http://127.0.0.1:43123/rest/applications/<encoded-id>/backend` | Dev host sends `requestContext: { applicationId: 'dev:my-app' }` to a real backend route for a different id. | Backend gateway rejects mismatched request context. |
| Package import target | User imports `dist/importable-package`. | User imports source repo root. | Production import expects prebuilt generated package roots. |
| Backend safety wording | “Import does not run install/build/lifecycle scripts; backend code executes when the app launches.” | “Imported apps are safe/untrusted sandboxed code.” | Avoids overpromising security. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept `frontend-src/` and `backend-src/` as default devkit roots | Existing samples use those names. | Rejected | New template/default config uses `src/frontend` and `src/backend`; old sample layout is not the external default. |
| Add dev-only alternate frontend startup helper | Could make raw direct URLs easier. | Rejected | Dev host supplies v3 launch hints/bootstrap to existing `startHostedApplication(...)`. |
| Change production package contract to `frontend/` instead of `ui/` | More intuitive naming. | Rejected for Milestone 1 | Keep production runtime/import contract unchanged; improve source layout and generated-output docs. |
| Use devkit validator as production import authority | Would reduce duplicated validation. | Rejected for Milestone 1 | Existing server import remains authoritative; devkit validation is preflight. |
| Keep stale v1 handshake copy | Small text-only risk. | Rejected | Update to v3 wording. |

## Derived Layering (If Useful)

- Entry layer: CLI commands.
- Devkit domain/control layer: template materializer, package assembler, validator, dev bootstrap server.
- Adapter/provider layer: filesystem operations, esbuild invocation, HTTP serving.
- Shared contract layer: SDK contracts package.
- Production runtime layer: existing server/web application owners, unchanged.

## Migration / Refactor Sequence

1. Add `autobyteus-application-devkit` to the workspace with package metadata, TypeScript config, and CLI entrypoint.
2. Implement config/path model and source/output containment checks.
3. Add embedded `templates/basic` using the canonical external layout and SDK package names.
4. Implement `create` command and template materializer.
5. Implement package assembly:
   - clean generated output root,
   - copy/validate `application.json`,
   - build frontend into generated `ui/`,
   - bundle backend into generated `backend/dist/entry.mjs`,
   - generate `backend/bundle.json`,
   - copy optional migrations/assets/agents/agent-teams,
   - validate output.
6. Implement validator command and package validator diagnostics.
7. Implement dev command and dev bootstrap server:
   - serve generated/dev UI assets,
   - render host page with iframe launch hints,
   - handle v3 ready/bootstrap,
   - support mock backend and configured real backend transport with explicit application id.
8. Add devkit tests for create, pack/validate, invalid package diagnostics, and dev bootstrap payload shape.
9. Add external developer docs and README links.
10. Update stale v1 localization strings to v3.
11. Run targeted builds/tests for SDK contracts/frontend SDK/devkit and relevant web localization/test checks.

## Key Tradeoffs

- Keeping production `ui/` / `backend/` package contract avoids risky server import/runtime changes, but docs must clearly explain those are generated runtime folders.
- Creating a devkit validator duplicates some server validation, but avoids coupling external tooling to private server internals. Server import remains authoritative.
- Dev mode focuses on v3 frontend bootstrap and optional real backend transport, not a full local backend engine. This delivers a useful first milestone while deferring full backend hot reload.
- A template plus CLI improves onboarding more than only documentation, but it adds a new package and tests.

## Risks

- Public SDK/devkit publishing may need release automation outside this implementation.
- esbuild bundling behavior must produce backend output that is truly self-contained for supported template cases.
- Real-backend dev mode identity mismatch can cause confusing errors unless CLI/docs make application id requirements explicit.
- Current internal sample apps may still show the old layout; docs must clearly state the new external template is canonical.
- The generated frontend bundle must work in browser iframe context with the SDK packages bundled correctly.

## Guidance For Implementation

- Prefer small, package-local tests in `autobyteus-application-devkit/tests` using `node --test`, following the current SDK packages' lightweight test style.
- Keep CLI command files thin; place real behavior in owned package/config/validation/dev-server files.
- Use shared constants from `@autobyteus/application-sdk-contracts` for manifest/backend/iframe versions.
- Do not import `autobyteus-server-ts` from devkit.
- Validate path containment with resolved absolute paths and normalized POSIX manifest-relative paths.
- Default output must be `dist/importable-package`; do not generate root-level `ui/` or `backend/` in the external starter flow.
- Template `application.json` should point to generated runtime paths (`ui/index.html`, `backend/bundle.json`) because it is copied into the generated application root.
- Template frontend must call `startHostedApplication(...)` and not include a raw-direct dev path.
- Template backend must export `defineApplication({ definitionContractVersion: '2', ... })`.
- Update docs to instruct users to import `dist/importable-package`, not the source repo root.
- Make safety wording precise: prebuilt import safety is not arbitrary code sandboxing.
