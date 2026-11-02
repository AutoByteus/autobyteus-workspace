# Release Report — beta (release-beta-20261102)

## Status: Blocked before tagging (no tag, no release, nothing published)

## Project Release Guide
- `RELEASE.md` on `origin/personal` @ `84ea944ac5` (23-asset table, release smoke with per-runtime models, beta user-action notes). Deviations: none.

## Release Decision
- `Beta`, requested by the user ("let delivery engineer release a new beta"), via the Solution Designer. Expected version `v1.5.11-beta.11` (`release_versions.py next-beta`).

## Checks before tagging (merged `personal` @ `84ea944ac5`, clean worktree, `pnpm install --frozen-lockfile`, `prebuild`)
| Check | Result |
| --- | --- |
| `check_licensing.py`, `check_repository_artifact_hygiene.py` | pass |
| `scripts/check_secrets.sh v1.5.11-beta.10..HEAD` (137 commits) | PASS |
| `python3 scripts/release_smoke.py` | PASS 13 of 13; models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`; live 273s |
| Build-only desktop run `pnpm release:test --ref personal` (run 41416112093) | **FAILED**, all five build jobs |
| Full server unit suite | not part of the guide's checks; the flaky watcher test (FU-C3) did not come up in the release checks |

## User-action notes
- Tickets since beta.10: autobyteus-318, autobyteus-358 (large-runs-load-less), autobyteus-97, autobyteus-348. None has a `## What you need to do` section, so the generated notes would stand alone. The GraphQL clean cut of 348 is for API clients and is not a user action in the guide's sense; add it to the beta notes only if the user wants it.

## Failure: cause (found, not guessed)
- Every build job stops in `pnpm typecheck` (inside `pnpm build:electron:*`), at "Production files must have no type errors": `../autobyteus-server-ts/src/...: error TS2307: Cannot find module 'autobyteus-ts/agent/message/agent-input-user-message.js'` (and `…/sender-type.js`, `…/platform-input-preface-metadata.js`, `…/system-task-notification-metadata.js`), about 392 errors in the "cross-package tests" project.
- autobyteus-318 (commit `dd47f30810`, "type-check the three cross-package tests in their own project") added `autobyteus-web/tsconfig.cross-package-tests.json`, which compiles the server's `src`. The server's `src` imports `autobyteus-ts` subpaths through `autobyteus-ts/package.json` `exports` (`./dist/...`), and `dist/` is untracked.
- The web gate's `prepare:shared-types` builds only `@autobyteus/application-sdk-contracts`, not `autobyteus-ts`. A release runner starts from `pnpm install` alone, so `autobyteus-ts/dist` does not exist there. On a developer machine `dist/` is already built, which is why the web typecheck passes locally (it did, with 0 production errors, in tickets 316, 348 and 345).
- It is the same class as the `v1.5.9-beta.14` case study in `RELEASE.md`.

## Not done, by the guide
- No tag, no version commit, no push of anything but this record. "If it fails, nothing is published and no version number is used up."

## Proposed fix (a code change; for the Solution Designer to route)
- Make the web gate build what its cross-package project reads: `prepare:shared-types` in `autobyteus-web/package.json` should also build `autobyteus-ts` (the existing `prepare:shared` script already builds `autobyteus-ts`, `@autobyteus/application-sdk-contracts` and `@autobyteus/application-backend-sdk`). Then prove it as the guide says: a clean clone with `pnpm install --frozen-lockfile` only, `pnpm -C autobyteus-web typecheck`, and a new build-only run `pnpm release:test --ref personal` until it passes. The release then resumes from "Cutting The Release".
- A durable guard is worth considering in the same change: a check that fails when a package project reads another workspace package's `dist/` that its prepare step does not build (what beta.14's lesson asks for).
