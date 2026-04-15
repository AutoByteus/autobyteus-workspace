# Brief Studio

Brief Studio is the canonical teaching sample for AutoByteus application bundles.

This directory is the **repo-local runnable application root**:

- `application.json` anchors the app root
- `ui/` contains the in-place frontend bundle assets
- `backend/` contains the in-place runnable backend bundle assets refreshed by the build
- `agents/` and `agent-teams/` contain the application-owned runtime definitions
- `backend-src/`, `scripts/`, `package.json`, and `tsconfig.backend.json` are authoring helpers beside the runnable payload

## What this sample teaches

- a two-member application-owned team: `researcher` and `writer`
- app-owned queries, commands, event handlers, repositories, and services
- app-owned SQL migrations that run only against `app.sqlite`
- artifact-centric `publish_artifact` runtime publishing with platform-owned provenance
- durable at-least-once event handling with app-owned idempotency via `processed_events`
- frontend query/command/notification calls through `@autobyteus/application-frontend-sdk`

## Important ownership boundary

`backend-src/services/brief-projection-service.ts` is the single app-owned owner of:

- `brief_id = brief::<applicationSessionId>`
- `processed_events` event claiming by `eventId`
- atomic projection into app-owned tables inside one `app.sqlite` transaction

Unexpected producer identities are rejected there explicitly; they are not silently coerced.

## Build the runnable root and packaging mirror

From the repo root:

```bash
pnpm install
pnpm --dir applications/brief-studio build
```

That build refreshes:

- the in-place runnable payload under this root:
  - `ui/vendor/application-frontend-sdk.js`
  - `backend/bundle.json`
  - `backend/dist/**`
  - `backend/migrations/**`
- the packaging-only import mirror under:
  - `applications/brief-studio/dist/importable-package`

## Test Brief Studio in the desktop app

If you are testing the packaged Electron app, use Brief Studio as an **imported application package**.

Current expected user flow:

1. Launch the desktop app.
2. If the **Applications** module is hidden, go to:
   - `Settings -> Server Settings`
   - enable the **Applications** feature toggle
3. Go to:
   - `Settings -> Application Packages`
4. If Brief Studio was already imported earlier from the same path, remove the existing package entry first so the desktop app rereads the rebuilt package contents.
5. Import the local package path:
   - `applications/brief-studio/dist/importable-package`
6. Open:
   - `Applications -> Brief Studio`
7. Launch a session and use the sample app UI plus the host Execution view together.

Important clarification:

- `applications/brief-studio/` is the canonical repo-local runnable root for development.
- `applications/brief-studio/dist/importable-package/` is the package root you import when testing package-management and desktop-app flows.
- The desktop package should not require app authors to read source code to discover this flow; this README is the app-local operator/developer entry point.

## Do you need to build first?

It depends on **which shape you have**.

### Case 1: repo-local development inside this workspace

If you place an app under:

- `applications/<application-id>/`

then that directory must already be a **runnable app root** with the runtime payload present, including files such as:

- `application.json`
- `ui/`
- `backend/bundle.json`
- `backend/dist/**`
- `backend/migrations/**`
- `agents/`
- `agent-teams/`

So:

- if those runnable artifacts are already present, placing the folder under `applications/` is enough
- if you only changed authoring sources such as `backend-src/`, you must rebuild first

For Brief Studio, rebuild with:

```bash
pnpm --dir applications/brief-studio build
```

### Case 2: desktop app / imported package flow

For the packaged desktop app, the host does **not** build raw app source code for you.

The thing you import is a **package root**, not just an unbuilt source folder.

For Brief Studio, import:

- `applications/brief-studio/dist/importable-package`

So:

- if you already have a built/importable package, the user only imports it
- if you only have source files, the app author must build the package first

### Practical rule

- **App authoring**: build first
- **End-user package import**: import the built package; no extra build step inside AutoByteus
- **Repo-local runnable development**: direct child under `applications/` is fine, but only if the runnable artifacts are already there

## Repo-local vs packaging-only roots

- `applications/brief-studio/` is the canonical repo-local runnable root.
- `applications/brief-studio/dist/importable-package/applications/brief-studio/` is a packaging-only mirror for import/provision flows.
- Repo-local discovery should use the direct child root under `applications/`, not the nested mirror.
- The repo-local `applications/` container is authoritative for built-in app identity; registering the same physical root again as an additional package root should be treated as a duplicate, not as a second competing package owner.

## Start here if you want to copy the sample

If you want to understand how to build your own AutoByteus application, read these in order:

- app manifest: `application.json`
- app-local UI: `ui/`
- backend entry: `backend-src/index.ts`
- projection owner: `backend-src/services/brief-projection-service.ts`
- review workflow owner: `backend-src/services/brief-review-service.ts`
- app schema: `backend-src/migrations/001_create_brief_tables.sql`
- generated importable package: `dist/importable-package/`

Recommended reading path:

1. `application.json` — app identity, runtime target, UI, backend manifest
2. `agents/` and `agent-teams/` — app-owned runtime definitions
3. `backend-src/index.ts` — backend definition boundary
4. `backend-src/services/brief-projection-service.ts` — artifact event projection + idempotency owner
5. `backend-src/repositories/` — app-owned persistence boundary
6. `ui/` — frontend calls through `@autobyteus/application-frontend-sdk`
