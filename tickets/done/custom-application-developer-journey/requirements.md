# Requirements: Custom Application Developer Journey — Milestone 1

## Status

Design-ready

## Goal / Problem Statement

Create the first external custom-application authoring milestone for AutoByteus: an external developer can start from a clear source layout, build and validate a prebuilt importable package under `dist/`, test frontend bootstrap through the current iframe contract v3, and distribute the generated package root to users without requiring AutoByteus user import to run `npm install`, build scripts, or package lifecycle scripts.

Milestone 1 intentionally improves the author-facing folder model. Developers should edit source inputs and configuration, while generated runnable/importable artifacts live under `dist/`. The AutoByteus runtime package contract can continue to use `application.json`, `ui/`, and `backend/` inside the generated importable package.

## Investigation Findings

- The production iframe/bootstrap baseline is already v3 and uses `iframeLaunchId` / `autobyteusIframeLaunchId`; backend request context is `{ applicationId }`.
- `@autobyteus/application-frontend-sdk` already exposes `startHostedApplication(...)`, and the current hosted startup path intentionally treats raw direct entry without valid launch hints as unsupported.
- Production package import already validates prebuilt application package roots and does not run app install/build/lifecycle scripts during user import.
- Current in-repo sample apps mix authoring source folders (`frontend-src/`, `backend-src/`) with runnable generated folders (`ui/`, `backend/`) under the same app root. This works internally but is not an intuitive external developer layout.
- Current sample package scripts duplicate packaging/build logic per app; there is no reusable external devkit, CLI, source layout template, package validator, or dev bootstrap host.
- One stale frontend localization string still says `v1 ready/bootstrap handshake`; Milestone 1 should correct developer/user-facing contract vocabulary to v3.

## Recommendations

- Introduce a reusable `@autobyteus/application-devkit` package with a CLI binary such as `autobyteus-app`.
- Establish this canonical external authoring layout:

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
      agents/
      agent-teams/
    dist/
      importable-package/
        applications/
          <app-id>/
            application.json
            ui/
            backend/
            agents/
            agent-teams/
  ```

- Keep `ui/` and `backend/` as generated runtime folders inside the importable package only; do not present them as authoring roots in the external journey.
- Keep production import unchanged and prebuilt-only.
- Provide a dev bootstrap host for frontend testing that supplies the same v3 launch hints and bootstrap payload shape consumed by `startHostedApplication(...)`.
- Keep full integrated backend source hot-reload and registry/marketplace distribution out of this milestone.

## Scope Classification

Large

## Scope Classification Rationale

The milestone crosses new tooling, package layout, dev server/bootstrap behavior, validation, docs, and stale contract vocabulary cleanup. It reuses existing runtime/import owners instead of redesigning production import or backend worker execution.

## In-Scope Use Cases

| use_case_id | Use Case | Primary Actor | Expected Result |
| --- | --- | --- | --- |
| UC-001 | Scaffold or copy a custom application template | External app developer | Developer gets a project using the new `src/` authoring and `dist/` output model. |
| UC-002 | Build an importable package | External app developer | Developer runs one devkit command that emits `dist/importable-package/applications/<app-id>/...`. |
| UC-003 | Validate source/package compatibility before distribution | External app developer / CI | Devkit validates manifest paths, generated UI assets, backend bundle manifest, backend entry, SDK contract versions, package root shape, and source/output separation. |
| UC-004 | Test frontend startup locally through iframe contract v3 | External app developer | Developer opens a dev URL where app code runs unchanged through `startHostedApplication(...)` and receives v3 launch hints/bootstrap. |
| UC-005 | Import generated package safely in AutoByteus | End user | User imports only `dist/importable-package`; AutoByteus performs validation without install/build/lifecycle execution. |
| UC-006 | Install SDKs from an external repo | External app developer | Project dependencies and docs identify installable SDK/devkit packages rather than monorepo workspace-only paths. |

## Out of Scope

- Full backend source hot-reload inside devkit.
- A complete local clone of AutoByteus application engine, storage, orchestration, runtime-control, or worker lifecycle inside devkit.
- Marketplace/registry/release-channel design for custom app distribution.
- Sandboxing or trust isolation for arbitrary third-party backend code beyond the existing prebuilt-import safety boundary.
- Changing production application package discovery away from generated `applications/<app-id>/application.json` package roots.
- Backward-compatible support for new external templates using the old `frontend-src/` / `backend-src/` authoring layout.

## Functional Requirements

| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| REQ-001 | Provide a canonical external source/output layout that separates source from generated artifacts. | External app projects use editable `src/frontend`, `src/backend`, optional `src/agents`, optional `src/agent-teams`, and generate all runnable/importable output under `dist/`. |
| REQ-002 | Provide a reusable devkit CLI package for external application authors. | Developers can use `autobyteus-app` commands without copying per-sample build scripts. |
| REQ-003 | Provide a template/scaffold for the canonical Milestone 1 layout. | Developers can create or copy a working starter app that uses published SDK package names and the `src`/`dist` model. |
| REQ-004 | Build generated UI artifacts into the package runtime `ui/` folder. | `autobyteus-app pack` emits `dist/importable-package/applications/<app-id>/ui/index.html` and bundled frontend assets. |
| REQ-005 | Build generated backend artifacts into the package runtime `backend/` folder. | `autobyteus-app pack` emits `backend/bundle.json`, `backend/dist/entry.mjs`, and configured migrations/assets under the generated application package root. |
| REQ-006 | Preserve the existing production application package contract. | Generated packages remain importable by the current AutoByteus package discovery/import flow without requiring production runtime contract changes. |
| REQ-007 | Preserve production import safety. | End-user import validates prebuilt package roots and does not run app-owned install/build/lifecycle scripts. |
| REQ-008 | Provide source/package validation. | Devkit validation reports actionable failures for malformed manifests, invalid paths, missing generated files, unsupported SDK contract versions, backend bundle shape errors, and source/output misuse. |
| REQ-009 | Provide frontend dev bootstrap through iframe contract v3. | `autobyteus-app dev` serves a host/dev page that appends v3 launch hints and sends a v3 bootstrap payload to app code using `startHostedApplication(...)`. |
| REQ-010 | Keep one frontend startup model across production and development. | App-authored frontend code uses `startHostedApplication(...)` unchanged in production and dev bootstrap modes. |
| REQ-011 | Keep dev bootstrap terminology aligned with iframe contract v3. | New devkit APIs, docs, generated code, and touched UI strings use `iframeLaunchId` / `autobyteusIframeLaunchId`; no new `launchInstanceId` surface appears. |
| REQ-012 | Clarify SDK/devkit external install path. | Template and docs use external package names for `@autobyteus/application-sdk-contracts`, `@autobyteus/application-frontend-sdk`, `@autobyteus/application-backend-sdk`, and `@autobyteus/application-devkit`. |
| REQ-013 | Document trust and safety limits precisely. | Docs state that Milestone 1 import safety means no install/build/lifecycle execution during user import, while app backend code is still executed at application launch by the existing worker runtime. |
| REQ-014 | Correct stale v1-facing iframe/bootstrap copy in touched user/developer-facing strings. | Existing `v1 ready/bootstrap handshake` text is updated to v3 terminology. |

## Acceptance Criteria

| acceptance_criteria_id | Criteria | Expected Outcome |
| --- | --- | --- |
| AC-001 | A starter template or scaffold command creates the canonical layout. | Generated/copied starter contains `application.json`, `autobyteus-app.config.mjs`, `src/frontend`, `src/backend`, and no root-level generated `ui/` or `backend/` authoring outputs. |
| AC-002 | `autobyteus-app pack` writes only to `dist/` by default. | Running the pack command produces `dist/importable-package/applications/<app-id>/application.json`, `ui/`, and `backend/` without writing generated runtime folders beside source. |
| AC-003 | The generated package validates through devkit validation. | `autobyteus-app validate --package-root dist/importable-package` succeeds for the starter output and fails with clear messages for missing `ui/index.html`, missing `backend/bundle.json`, missing `backend/dist/entry.mjs`, unsupported contract versions, or unsafe path escapes. |
| AC-004 | The generated package remains compatible with current AutoByteus import expectations. | The package root contains top-level `applications/<app-id>/application.json`; manifest paths point to generated `ui/` and `backend/` folders; current import/discovery validation remains the authoritative production gate. |
| AC-005 | Dev bootstrap uses iframe contract v3. | The dev host URL includes `autobyteusContractVersion=3`, `autobyteusApplicationId`, `autobyteusIframeLaunchId`, and `autobyteusHostOrigin`; bootstrap payload contains top-level `iframeLaunchId` and `requestContext: { applicationId }`. |
| AC-006 | The starter frontend code uses `startHostedApplication(...)` unchanged. | The same application-authored startup call works under dev bootstrap and under production iframe bootstrap. |
| AC-007 | Production import remains prebuilt-only. | No AutoByteus user-import path is changed to run app package `npm install`, build scripts, or lifecycle scripts. |
| AC-008 | External dependency documentation is present. | Docs and template package metadata show external package names and expected version ranges for SDK/devkit packages. |
| AC-009 | Trust-boundary wording is explicit. | Developer docs distinguish prebuilt-import safety from sandboxing arbitrary app backend code. |
| AC-010 | Stale v1 bootstrap copy is removed from touched surfaces. | Active user/developer-facing copy no longer says `v1 ready/bootstrap handshake` for the current application iframe flow. |

## Constraints / Dependencies

- The iframe launch ID contract refactor is complete and is the baseline dependency.
- Production app import must remain prebuilt-artifact based.
- Developer-owned build/dev commands may run in the developer environment; user import must not.
- Direct raw app URLs remain unsupported for production. Dev direct URLs must be mediated by a dev bootstrap host/session.
- Dev mode must not ask app authors to replace `startHostedApplication(...)`.
- The current production package contract expects generated runtime folders named `ui/` and `backend/` inside each generated application package root.
- Source edits are now authorized for Milestone 1 after user approval in chat on 2026-04-26.

## Assumptions

- Milestone 1 may add a new workspace package for the devkit.
- The template can target a simple framework-free frontend plus TypeScript backend first; framework-specific templates can follow later.
- Devkit can use bundled build tooling such as esbuild for Milestone 1 package output.
- Full backend hot-reload is not required to make Milestone 1 useful; pack/import or configured real backend transport can cover backend integration testing until a later milestone.

## Risks / Open Questions

- SDK packages may need release/publish workflow follow-up before external developers can install them from a public registry.
- Devkit validation may initially duplicate some server-side validation logic; the server import path remains authoritative until shared validation extraction is explicitly designed.
- Backend package bundling must avoid accidentally depending on source repo `node_modules` at runtime.
- Dev bootstrap can validate frontend startup and transport wiring but cannot fully reproduce AutoByteus storage/runtime-control/orchestration without a running AutoByteus backend or later backend-dev-mode work.

## Requirement-To-Use-Case Coverage

| requirement_id | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003 |
| REQ-002 | UC-001, UC-002, UC-003, UC-004 |
| REQ-003 | UC-001, UC-006 |
| REQ-004 | UC-002, UC-003, UC-005 |
| REQ-005 | UC-002, UC-003, UC-005 |
| REQ-006 | UC-002, UC-005 |
| REQ-007 | UC-005 |
| REQ-008 | UC-003, UC-005 |
| REQ-009 | UC-004 |
| REQ-010 | UC-004, UC-005 |
| REQ-011 | UC-004, UC-006 |
| REQ-012 | UC-001, UC-006 |
| REQ-013 | UC-005, UC-006 |
| REQ-014 | UC-004, UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| acceptance_criteria_id | Scenario Intent |
| --- | --- |
| AC-001 | Scaffold/template layout scenario. |
| AC-002 | Package command output-root scenario. |
| AC-003 | Devkit validation success/failure scenario. |
| AC-004 | Production import compatibility scenario. |
| AC-005 | Dev bootstrap v3 contract scenario. |
| AC-006 | Shared startup entrypoint scenario. |
| AC-007 | Import safety regression scenario. |
| AC-008 | External install documentation scenario. |
| AC-009 | Security/trust wording review scenario. |
| AC-010 | Contract-vocabulary cleanup scenario. |

## Approval Status

Milestone 1 scope approved by user in chat on 2026-04-26 after discussion of the first milestone and the improved `src/` to `dist/` source/output folder model.
