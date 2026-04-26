# @autobyteus/application-devkit

Developer tooling for building custom AutoByteus application packages.

## Quickstart

```bash
pnpm dlx --package @autobyteus/application-devkit autobyteus-app create my-app --id my-app --name "My App"
cd my-app
pnpm install
pnpm exec autobyteus-app pack
pnpm exec autobyteus-app validate --package-root dist/importable-package
pnpm exec autobyteus-app dev
```

The generated source project uses editable `src/frontend` and `src/backend` inputs. Generated runnable package output is written under `dist/importable-package/applications/<app-id>/` with the existing AutoByteus runtime `ui/` and `backend/` folders.

## Commands

- `autobyteus-app create <dir> --id <local-id> --name <name>` creates the canonical Milestone 1 starter.
  Local application ids must start with a letter or number and contain only letters, numbers, underscores, or hyphens.
- `autobyteus-app pack [--project-root <path>] [--out <path>]` builds `dist/importable-package`.
- `autobyteus-app validate [--package-root <path>]` checks a generated package root before distribution.
- `autobyteus-app dev [--project-root <path>] [--port <n>] [--application-id <id>] [--backend-base-url <url>]` serves a local iframe-contract v3 bootstrap host.

Real-backend dev mode requires `--application-id`; the same id is used in iframe launch hints, bootstrap `application.applicationId`, and `requestContext.applicationId`.

## Safety boundary

User import of `dist/importable-package` remains prebuilt-only: AutoByteus validates package files and does not run app install/build/lifecycle scripts during import. Backend code from the package is still executed when the application launches in the existing worker runtime; this devkit is not an arbitrary-code sandbox.

See `../docs/custom-application-development.md` for the full external developer journey.
