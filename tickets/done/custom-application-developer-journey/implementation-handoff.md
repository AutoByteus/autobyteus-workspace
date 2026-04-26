# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/design-review-report.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey/tickets/in-progress/custom-application-developer-journey/review-report.md`

## What Changed

- Added new workspace package `@autobyteus/application-devkit` with the `autobyteus-app` CLI and package-local build/test setup.
- Implemented `create`, `pack`, `validate`, and `dev` command paths:
  - `create` materializes the canonical `src/frontend`, `src/backend`, `src/agents`, `src/agent-teams`, and `dist/`-only output model.
  - `pack` builds frontend assets with esbuild into generated `ui/`, bundles backend source into generated `backend/dist/entry.mjs`, writes `backend/bundle.json`, copies migrations/assets/agents/teams, and validates the generated package.
  - `validate` performs developer preflight checks for package root shape, manifest versions, manifest path containment, generated UI/backend files, backend manifest fields, SDK compatibility, and optional backend directories.
  - `dev` serves a local iframe-contract v3 host, generated frontend assets, and mock backend routes; real-backend mode requires explicit `--application-id` and uses it consistently in launch hints, bootstrap application identity, and `requestContext.applicationId`.
- Added the starter template under `autobyteus-application-devkit/templates/basic/**` using external SDK package names and a single `startHostedApplication(...)` frontend startup path.
- Added durable external guide `docs/custom-application-development.md` and SDK README discoverability links that make the devkit `src/` to `dist/importable-package` model canonical for external authors.
- Updated stale web localization copy from `v1 ready/bootstrap handshake` to iframe contract v3 terminology.
- Added `autobyteus-application-devkit` to `pnpm-workspace.yaml` and updated `pnpm-lock.yaml`.


## Local Fix Update — CR-001

- Extracted shared local application id validation in `autobyteus-application-devkit/src/validation/local-application-id.ts` and reused it in template creation, source manifest reads for pack/dev, and package validation diagnostics.
- Added path-owner enforcement that `generatedApplicationRoot` is a direct child of `dist/importable-package/applications/` before any pack writes.
- Extended source/output overlap checks to all configured source roots, including `source.agentsDir` and `source.agentTeamsDir`.
- Added package-local tests for unsafe ids (`../escaped`, `a/b`), direct generated-root containment, package validation of unsafe manifest ids, and agents/team source overlap preserving a sentinel file before output cleanup.

## Key Files Or Areas

- New devkit package:
  - `autobyteus-application-devkit/package.json`
  - `autobyteus-application-devkit/src/cli.ts`
  - `autobyteus-application-devkit/src/commands/*.ts`
  - `autobyteus-application-devkit/src/config/*.ts`
  - `autobyteus-application-devkit/src/paths/application-project-paths.ts`
  - `autobyteus-application-devkit/src/package/*.ts`
  - `autobyteus-application-devkit/src/validation/*.ts`
  - `autobyteus-application-devkit/src/dev-server/*.ts`
  - `autobyteus-application-devkit/src/template/template-materializer.ts`
  - `autobyteus-application-devkit/templates/basic/**`
  - `autobyteus-application-devkit/tests/application-devkit.test.mjs`
- Workspace/dependency registration:
  - `pnpm-workspace.yaml`
  - `pnpm-lock.yaml`
- Docs:
  - `docs/custom-application-development.md`
  - `autobyteus-application-sdk-contracts/README.md`
  - `autobyteus-application-frontend-sdk/README.md`
  - `autobyteus-application-backend-sdk/README.md`
- Localization:
  - `autobyteus-web/localization/messages/en/applications.ts`
  - `autobyteus-web/localization/messages/zh-CN/applications.ts`

## Important Assumptions

- `esbuild` is acceptable as the Milestone 1 bundler for frontend and backend package output.
- External applications should install the frontend/backend SDK packages in their project; devkit package-local frontend/backend SDK devDependencies exist only for local template tests.
- The production server import path remains authoritative; the new devkit validator is a preflight validator only.
- Existing internal sample apps are intentionally not migrated in this implementation.
- Dev mock backend is intentionally minimal and is for startup/transport-shape testing, not full application engine behavior.

## Known Risks

- Public package publishing/release automation may still be needed before fully external consumers can install these packages from a registry.
- Backend bundling is validated for the starter/simple package path; broader third-party dependency patterns may need follow-up hardening.
- Devkit validation duplicates parts of server import validation and can drift until a future shared-validation extraction is designed.
- Internal samples still show the older `frontend-src` / `backend-src` pattern; docs now mark the new devkit template as canonical for external authors.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - No `frontend-src` / `backend-src` fallback defaults were added to the devkit.
  - The template uses only `startHostedApplication(...)` for frontend startup.
  - The initially larger validator was split into narrower validation files; largest changed source file is currently `autobyteus-application-devkit/src/dev-server/dev-bootstrap-server.ts` at 202 lines.

## Environment Or Dependency Notes

- Ran `pnpm install` in `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-application-developer-journey` to register the new workspace package and update `pnpm-lock.yaml`.
- `node_modules/` and generated devkit build/test artifacts are ignored and not intended for review.
- Devkit build output `autobyteus-application-devkit/dist/` was removed after checks; package build regenerates it.

## Local Implementation Checks Run

Implementation-scoped checks only:

- `pnpm install` — passed; updated lockfile, with existing peer/build-script warnings from the broader workspace.
- `pnpm --filter @autobyteus/application-devkit test` — passed; now covers create layout, pack/validate success, missing `ui/index.html` diagnostic, unsafe ids rejected before writes, generated application root direct-child guard, agents/team source-output overlap rejected before cleanup, package validation of unsafe manifest ids, and dev bootstrap v3 identity shape.
- `pnpm --filter @autobyteus/application-sdk-contracts test` — passed.
- `pnpm --filter @autobyteus/application-frontend-sdk test` — passed.
- `pnpm --filter @autobyteus/application-backend-sdk build` — passed.
- `pnpm --filter @autobyteus/application-devkit build && node autobyteus-application-devkit/dist/cli.js --help` — passed CLI smoke check.
- `grep -R "v1 ready/bootstrap\|launchInstanceId\|autobyteusLaunchInstanceId" ...` over touched SDK/devkit/docs/localization areas — passed with no matches.
- `git diff --check` — passed.
- Source line-size guard: `find autobyteus-application-devkit/src -type f -name '*.ts' -print0 | xargs -0 wc -l | sort -nr | head` — passed; largest changed devkit source file remains 202 lines.

## Downstream Validation Hints / Suggested Scenarios

- Run `autobyteus-app create`, `pack`, and `validate` from the built devkit in a clean temp project and inspect generated `dist/importable-package/applications/<app-id>/` shape.
- Exercise validation failure scenarios for missing `backend/bundle.json`, missing `backend/dist/entry.mjs`, unsupported manifest/backend contract versions, and manifest path escape attempts.
- Start `autobyteus-app dev` and verify the host iframe URL contains `autobyteusContractVersion=3`, `autobyteusApplicationId`, `autobyteusIframeLaunchId`, and `autobyteusHostOrigin`.
- Verify real-backend dev mode rejects `--backend-base-url` without `--application-id` and uses the explicit id in bootstrap `application.applicationId` and `requestContext.applicationId`.
- Import a generated starter package through the existing AutoByteus user import path to confirm production import remains prebuilt-only and authoritative.

## API / E2E / Executable Validation Still Required

- API/E2E validation of real AutoByteus import and browser-hosted dev-mode behavior is still required downstream.
- Broader executable validation for malformed package fixtures and real-backend dev mode should be owned by `api_e2e_engineer` after code review.
