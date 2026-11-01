# Merged Tasks: packaging, dependencies and build (merged into autobyteus-345). Full original texts, unchanged.

Index: autobyteus-227: Prune devDependencies from the packaged macOS/Linux server, and ship only runtime content (FU-007 of autobyteu; autobyteus-230: Remove the dead nested `autobyteus-web/.github` workflow (FU-001 of autobyteus-224; small, not urgent); autobyteus-231: Make the Docker image install from the committed lockfile (FU-003 of autobyteus-224; not urgent); autobyteus-169: Docker image: drop the ~136 MB of browser-only onnxruntime-web files that the desktop build already prunes; autobyteus-201: Electron build: don't leave server node_modules under autobyteus-server-ts/autobyteus-web/resources; autobyteus-164: Web: regenerate `generated/graphql.ts` from the current server schema (it is behind); autobyteus-168: Server downloads (embedding models first) should honour HTTP(S)_PROXY settings; autobyteus-251: Declare the packages our code imports, then drop `@nuxtjs/apollo` (FU-005 of autobyteus-229; not urgent)


---

## autobyteus-227: Prune devDependencies from the packaged macOS/Linux server, and ship only runtime content (FU-007 of autobyteus-182 and FU-002 of autobyteus-224; not urgent)

(created 2026-10-20, status TODO)

Prune devDependencies from the packaged macOS/Linux server, and ship only runtime content (FU-007 of autobyteus-182 and FU-002 of autobyteus-224; not urgent)

Problem 1 (autobyteus-182 FU-007): the packaged macOS server (`AutoByteus.app/Contents/Resources/server`) ships every `autobyteus-server-ts` devDependency: the packaged `package.json` keeps all of them and `node_modules` holds them (vitest, typescript, prisma, @types/*, and after autobyteus-182 also the v2 test packages `@modelcontextprotocol/server`/`node`/`client`/`core`). On macOS `prepare-server-dispatch.mjs` runs `prepare-server.sh`, which deploys with `pnpm deploy --legacy` and never prunes dev packages. Only the Windows path `prepare-server.mjs` resets `devDependencies` to `prisma` (lines 247-250) and runs `npm prune --omit=dev` (line 271).
Evidence: evidence/API-15-packaged-contents-{before,after}.txt of autobyteus-182: base `dc530fdcb0` packaged app has 9/9 server devDependencies, `node_modules` 772M; the branch has 13/13, 787M.

Problem 2 (autobyteus-224 FU-002): the packaged macOS server also ships the tracked non-runtime content of `autobyteus-server-ts`: `tests/`, `tickets/` (internal ticket notes), `docs/`, `canuse-ok.txt`, `AGENTS.md`, `vitest.config.ts` and `tsconfig*.json`. `autobyteus-server-ts/package.json` has no `files` field, so the deploy copies the whole package folder. Evidence: `ls <app>/Contents/Resources/server` of the autobyteus-224 branch build (2026-10-20); `git ls-files autobyteus-server-ts/canuse-ok.txt autobyteus-server-ts/tickets` lists them as tracked. Internal ticket notes should not ship in a product.

What: make `prepare-server.sh` drop dev packages as `prepare-server.mjs` does (keep `prisma` if bundled client generation needs it); decide what the packaged server needs (`dist`, `prisma`, needed `scripts`, `package.json`, licenses) and restrict the deploy (a `files` field or an allowlist); remove stray tracked files such as `canuse-ok.txt` if unused; check Linux and the Docker image too. Then confirm with `verify-packaged-server-startup.mjs` and a packaged smoke run that the server starts and MCP works.
Done when: the packaged macOS/Linux server contains no dev packages and no non-runtime content it does not need, is smaller, and the packaged smoke checks pass; finalized on personal.


---

## autobyteus-230: Remove the dead nested `autobyteus-web/.github` workflow (FU-001 of autobyteus-224; small, not urgent)

(created 2026-10-20, status TODO)

Remove the dead nested `autobyteus-web/.github` workflow (FU-001 of autobyteus-224; small, not urgent)

`autobyteus-web/.github/workflows/desktop-tag-build.yml` is a leftover of the archived standalone `AutoByteus/autobyteus-web` repository. GitHub runs only the root `.github` workflows, and the root `release-desktop.yml` owns desktop releases. The file still names `AutoByteus/autobyteus-desktop-releases` as its target. Evidence: last touched by the flatten commit `b1c89884e6` (2026-02-26); `gh repo view AutoByteus/autobyteus-web` shows it archived, last pushed 2026-02-26.
What: confirm that nothing references it, then delete it (the same cleanup as `autobyteus-ts/.github` in autobyteus-224). Look for other such nested leftovers of archived standalone repositories at the same time and list them.
Done when: removed and finalized on personal. Attached: autobyteus-224-follow-ups.md (row FU-001).


---

## autobyteus-231: Make the Docker image install from the committed lockfile (FU-003 of autobyteus-224; not urgent)

(created 2026-10-20, status TODO)

Make the Docker image install from the committed lockfile (FU-003 of autobyteus-224; not urgent)

Problem: `autobyteus-server-ts/docker/Dockerfile.monorepo` copies the root `pnpm-lock.yaml` and only 9 of the 13 workspace manifests (lines 15-24), then runs `pnpm install --no-frozen-lockfile` (line 26), so pnpm re-resolves: 90 lockfile lines change. For example the image's `@modelcontextprotocol/sdk@1.32.1` gets `eventsource-parser` 3.1.1 while the lockfile pins 3.0.6. Image builds can pick up dependency versions that no committed lockfile records, and builds on different days can differ. This also matters for security: what we scan and review is not what ships.
Evidence: `evidence/API-04-docker-install-context.log` and `evidence/API-04-docker-image.txt` of autobyteus-224 (same on the base commit). Attached: autobyteus-224-follow-ups.md (row FU-003).
What: copy every workspace manifest the lockfile's importers name (or filter the install to the server's dependency closure), switch to `pnpm install --frozen-lockfile`, and confirm the image builds and the server starts (MCP stdio and HTTP work in it). Consider the desktop release workflow's `--no-frozen-lockfile` in `release-desktop.yml` as a related finding; report it, do not change it without saying so.
Done when: the image installs exactly the lockfile versions and the server starts, finalized on personal.


---

## autobyteus-169: Docker image: drop the ~136 MB of browser-only onnxruntime-web files that the desktop build already prunes

(created 2026-10-18, status TODO)

Docker image: drop the ~136 MB of browser-only onnxruntime-web files that the desktop build already prunes

Follow-up FU-5 of autobyteus-71 (local semantic search for Project Tasks), from its Solution Designer, 2026-10-18. Low priority. Evidence: autobyteus-delivery-receipts/project-task-semantic-search/.

## What
The Docker image keeps about 136 MB of browser-only onnxruntime-web files that the desktop build prunes.

## Direction
Reuse the desktop prune keep-list (`autobyteus-web/scripts/prepare-server.mjs`) in `Dockerfile.monorepo` (one list for both, not a copy), and smoke-test one embedding inside the built image so the pruning cannot break meaning search.

## Done when
The image no longer contains those files, a smoke test of one embedding passes in the image, merged; ships with the next release.


---

## autobyteus-201: Electron build: don't leave server node_modules under autobyteus-server-ts/autobyteus-web/resources

(created 2026-10-19, status TODO)

Electron build: don't leave server node_modules under autobyteus-server-ts/autobyteus-web/resources

Follow-up O-3 from the autobyteus-193 delivery (MCP run-session cleanup, merge a66eee725f), from its Solution Designer, 2026-10-19. Small build hygiene; low priority. Evidence: autobyteus-193-delivery-receipt-verification.md (autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/; the ticket is archived in tickets/done/mcp-run-session-cleanup/ on personal).

## What
Building the Electron app leaves `autobyteus-server-ts/autobyteus-web/resources/server/node_modules` behind (a folder under the server package, from the build's server preparation step; it was noticed while the packaged app was built for the process-count check).

## Direction
Find which step writes there and make the build either write to its own build directory or clean it up; make sure it is ignored by Git (and by the licensing and release checks) if it must exist. Do not change what the packaged app contains.

## Done when
A desktop build leaves nothing under autobyteus-server-ts/autobyteus-web (shown by a clean `git status --ignored` after the build), the packaged app is unchanged, merged; no release needed unless bundled.


---

## autobyteus-164: Web: regenerate `generated/graphql.ts` from the current server schema (it is behind)

(created 2026-10-18, status TODO)

Web: regenerate `generated/graphql.ts` from the current server schema (it is behind)

Follow-up TFU-4 from the code review of autobyteus-93 (delegated-copies-slow-open, test review CRR-002), 2026-10-18; the same finding was made independently by the autobyteus-71 implementation (FU-6 of autobyteus-71), by the code review of autobyteus-171 (FU-CR-002: a full codegen run against the current schema shows the drift) and, 2026-10-20, by the autobyteus-190 delivery (O-3: about 400 lines of unrelated drift). Outside all those tickets: this is earlier drift; they spliced in only their own queries.

## What
`autobyteus-web/generated/graphql.ts` lacks the `Delegated*` types and mutations (delegated-launch operations) and the `MeaningSearch*` types, and its `defaultLaunchConfig` fragment fields are out of date compared with the server schema; about 400 lines of unrelated drift as of 2026-10-20.

## Evidence
`implementation-handoff.md` → "Environment Or Dependency Notes (Codegen)" in the ticket folder of delegated-copies-slow-open (now tickets/done/ on personal); the autobyteus-71 ticket (tickets/done/project-task-semantic-search/); the autobyteus-171 code review (tickets/done/task-part-of/code-review-report.md, Follow-ups); the autobyteus-190 delivery (tickets/done/mcp-bulk-import-errors/).

## Direction
Regenerate `generated/graphql.ts` from the current server schema, printed in-process or read from a schema file, not from a running user app (never point the generator at the user's running app or data; for example `BACKEND_GRAPHQL_BASE_URL=<schema file> pnpm -C autobyteus-web codegen`), commit the full result, check that nothing depends on the stale types, and fix any type errors that follow. Check how the codegen is meant to be run and document or script it if it is not (the drift suggests nobody runs it; four tickets have now found it independently).

## Done when
The generated file matches the current server schema, the web typecheck and tests pass, merged; no release needed unless bundled.


---

## autobyteus-168: Server downloads (embedding models first) should honour HTTP(S)_PROXY settings

(created 2026-10-18, status TODO)

Server downloads (embedding models first) should honour HTTP(S)_PROXY settings

Follow-up FU-2 of autobyteus-71 (local semantic search for Project Tasks), from its Solution Designer, 2026-10-18. Low priority unless a user reports it. Evidence: autobyteus-delivery-receipts/project-task-semantic-search/ (receipt verification and handoff summary).

## What
Where: `autobyteus-server-ts/src/embeddings/models/embedding-model-files.ts`. The server's `fetch` ignores `HTTPS_PROXY`, so behind a proxy meaning search shows "unavailable" (exact search still works). It is the same limitation as the other server downloads.

## Direction
Make server downloads (embedding models first, then the other server downloads that use `fetch`) honour the usual `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` settings. Keep the checksum verification of the model files. Prove it with a proxy-only test environment (no direct internet access), not by assumption; test with test data only.

## Done when
A model download works through a proxy in a proxy-only test environment, a test covers it, merged; ships with the next release.


---

## autobyteus-251: Declare the packages our code imports, then drop `@nuxtjs/apollo` (FU-005 of autobyteus-229; not urgent)

(created 2026-10-20, status TODO)

Declare the packages our code imports, then drop `@nuxtjs/apollo` (FU-005 of autobyteus-229; not urgent)

Undeclared imports work today only through other packages (pnpm's hidden hoist): `autobyteus-server-ts` tests import `jsdom` and `@autobyteus/application-backend-sdk`; `autobyteus-web` code imports `@apollo/client`, `@vue/apollo-composable`, `graphql` and `graphql-tag`. The two Apollo packages come only from `@nuxtjs/apollo`, an alpha Nuxt module the web does not register. Evidence: SD-03, SD-07, SD-08 and ARCH-REV-001 AR-001 of autobyteus-229 (attached follow-ups file, row FU-005); the team kept `@nuxtjs/apollo` as a doubtful dependency and reported it.
What: add `@apollo/client`, `@vue/apollo-composable`, `graphql`, `graphql-tag` to `autobyteus-web` and `jsdom` plus the backend SDK (`workspace:*`) to the server's devDependencies, then remove `@nuxtjs/apollo`; prove with `probes/import-provider-check.mjs` (from autobyteus-229's ticket), web build and tests, and the packaged app.
Done when: every import is declared, `@nuxtjs/apollo` is gone, builds, tests and the packaged app pass, finalized on personal.
