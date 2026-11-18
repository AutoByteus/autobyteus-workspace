# DEL-01 post-integration checks (delivery, 2026-11-01)

State: ticket branch `codex/packaging-dependencies-build` after merging `origin/personal` @ `0295553657` (merge `a960adf64f`, no conflicts; 11 incoming commits: autobyteus-355 release smoke and RELEASE.md/release-notes template, autobyteus-305 closure). No overlap with this ticket's files (it touches the release smoke scripts, RELEASE.md, `.github/release-notes/template.md`, live-model-choice test helpers; not `release-desktop.yml`, the packaging scripts, manifests or the Dockerfile).

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done (lockfile up to date) |
| Python source checks | `python3 -m unittest scripts.tests.test_declared_imports scripts.tests.test_install_from_lockfile` | `Ran 15 tests … OK` |
| Declared imports | `node scripts/check-declared-imports.mjs <package>` for server, web, ts | `Imports are declared:` for all three |
| Server architecture tests | `pnpm exec vitest run tests/architecture/server-package-contents.test.ts tests/architecture/web-generated-graphql-current.test.ts` | `Tests  6 passed (6)` |
| `--before` spec | `pnpm exec vitest run scripts/__tests__/npm-before.spec.ts` (web) | `Tests  10 passed (10)` |
| Generated GraphQL current | `pnpm -C autobyteus-web codegen:check` | `autobyteus-web/generated/graphql.ts is current.` |
| Web typecheck | `pnpm -C autobyteus-web typecheck` | PASS (production errors 0; test-file baseline 297 unchanged) |
| Secret Gate, hygiene, licensing | see the release/deployment report | pass |

Why no rebuild of the build-only desktop run: the incoming commits do not touch `release-desktop.yml`, the prepare scripts, manifests, lockfile or the Dockerfile, so the five-job run 41282003912 (API-01, on `92ff204d33`) still describes the packaging path. A build-only run is required by RELEASE.md before a tag; none is cut here.
