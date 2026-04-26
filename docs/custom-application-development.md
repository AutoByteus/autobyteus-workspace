# Custom Application Development — Milestone 1

Milestone 1 gives external AutoByteus application authors a reusable devkit, a canonical source layout, a package validator, and a local iframe-contract v3 dev host.

## Installable packages

External projects should depend on these package names:

- `@autobyteus/application-devkit` for the `autobyteus-app` CLI.
- `@autobyteus/application-frontend-sdk` for `startHostedApplication(...)`.
- `@autobyteus/application-backend-sdk` for `defineApplication(...)`.
- `@autobyteus/application-sdk-contracts` for shared manifest, iframe, backend, and request-context types.

Publishing/release automation for those packages may still be handled separately; this repository now treats these names as the canonical external install path.

## Canonical project layout

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
        <app-id>/
          application.json
          ui/
          backend/
          agents/
          agent-teams/
```

Developers edit `src/**`, `application.json`, and `autobyteus-app.config.mjs`. The runtime `ui/` and `backend/` folders are generated only inside `dist/importable-package/applications/<app-id>/` because the production AutoByteus package contract still expects those names.

Do not use root-level `frontend-src/`, `backend-src/`, generated `ui/`, or generated `backend/` as the external default layout. Existing repository samples may still use older internal authoring roots until they are explicitly migrated.

## Create a starter

```bash
pnpm dlx --package @autobyteus/application-devkit autobyteus-app create my-autobyteus-app --id my-autobyteus-app --name "My AutoByteus App"
cd my-autobyteus-app
pnpm install
```

The starter frontend calls `startHostedApplication(...)` once. It does not include a dev-only alternate startup path.

Local application ids must start with a letter or number and contain only letters, numbers, underscores, or hyphens. The id becomes the generated package directory name under `applications/<app-id>/`.

## Pack an importable package

```bash
autobyteus-app pack
```

Default output:

```text
dist/importable-package/applications/<app-id>/application.json
dist/importable-package/applications/<app-id>/ui/index.html
dist/importable-package/applications/<app-id>/backend/bundle.json
dist/importable-package/applications/<app-id>/backend/dist/entry.mjs
```

Import `dist/importable-package` into AutoByteus. Do not import the source repository root.

## Validate before distribution

```bash
autobyteus-app validate --package-root dist/importable-package
```

The devkit validator checks package-root shape, application manifest v3 fields, generated UI files, backend bundle manifest v1 fields, backend entry file presence, SDK contract versions, and manifest path containment. It is a preflight tool for developers and CI; the server import/discovery validation remains the authoritative production gate.

## Local frontend dev bootstrap

```bash
autobyteus-app dev
```

The dev host serves the generated frontend through iframe contract v3. The iframe URL includes:

- `autobyteusContractVersion=3`
- `autobyteusApplicationId`
- `autobyteusIframeLaunchId`
- `autobyteusHostOrigin`

When the app emits `autobyteus.application.ui.ready`, the dev host posts `autobyteus.application.host.bootstrap` with top-level `iframeLaunchId` and `requestContext: { applicationId }`.

For a real AutoByteus backend transport, pass the exact backend application id explicitly:

```bash
autobyteus-app dev \
  --application-id 'application-local:%2Fworkspace__my-autobyteus-app' \
  --backend-base-url 'http://127.0.0.1:43123/rest/applications/application-local:%2Fworkspace__my-autobyteus-app/backend'
```

Real-backend dev mode uses the same id in launch hints, bootstrap `application.applicationId`, and `requestContext.applicationId`. Without real backend URLs, dev mode uses a local mock backend for startup and transport-shape testing.

## Trust and safety boundary

AutoByteus user import of a generated package is prebuilt-only: import validation reads files and does not run app-owned `npm install`, build scripts, or package lifecycle scripts. This is not a sandbox guarantee. Application backend code is still executed later by the existing application worker runtime when the user launches the application.
