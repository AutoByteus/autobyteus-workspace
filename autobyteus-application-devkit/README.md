# @autobyteus/application-devkit

Developer tooling for building custom AutoByteus application packages.

## Quickstart

```bash
pnpm dlx --package @autobyteus/application-devkit autobyteus-app create my-app --id my-app --name "My App"
cd my-app
pnpm install
pnpm build
pnpm validate
pnpm dev
```

The generated source project uses editable `src/frontend` and `src/backend` inputs. Generated runnable package output is written under `dist/importable-package/applications/<app-id>/` with the existing AutoByteus runtime `ui/` and `backend/` folders.

## Commands

- `autobyteus-app create <dir> --id <local-id> --name <name>` creates the canonical Milestone 1 starter.
  Local application ids must start with a letter or number and contain only letters, numbers, underscores, or hyphens.
- `autobyteus-app pack [--project-root <path>] [--out <path>]` builds `dist/importable-package`.
- `autobyteus-app validate [--package-root <path>]` checks a generated package root before distribution.
- `autobyteus-app dev [--host standalone|studio] [options]` watches and repacks through the real package owner. Standalone is the default; Studio uses its public local-package import/reload API.
- `autobyteus-app start [--project-root <path>] [--package-root <path>] [--data-dir <path>] [--host <bind-host>] [--port <n>] [--public-base-url <origin>]` validates and runs an existing build without packing it.

`dev`, `dev --host studio`, and `start` all use real runtime hosts. Mock bootstrap and backend behavior are test fixtures only and are never selected as a command fallback.

The server package owns `startStandaloneApplicationHost` and its
`buildStandaloneApplicationServer` assembly boundary. The devkit owns project
build, validation, watch, and host-process orchestration; it does not construct
the server's `ApplicationPlatformRuntime` or start agent/team runs itself.

## Atomic package publication

`pack` and both `dev` host modes assemble and validate a package in a uniquely
named staging directory before publishing it by rename. Generated metadata,
including the package README, names the final canonical package root rather than
the temporary staging root. Failed assembly or validation preserves the
previous package; successful publication removes staging/previous scratch
directories. Hosts treat the published package as immutable input.

## Safety boundary

User import of `dist/importable-package` remains prebuilt-only: AutoByteus validates package files and does not run app install/build/lifecycle scripts during import. Backend code from the package is still executed when the application launches in the existing worker runtime; this devkit is not an arbitrary-code sandbox.

See `../docs/custom-application-development.md` for the full external developer journey.
