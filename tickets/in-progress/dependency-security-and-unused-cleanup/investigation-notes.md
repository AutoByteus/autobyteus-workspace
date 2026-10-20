# Investigation Notes — Dependency security advisories and unused dependencies

## Investigation Meta

- Package identifier: `dependency-security-and-unused-cleanup`
- Request / ticket: Project Task `autobyteus-229`, delegated by `/project_task_manager` on 2026-10-20
- Workspace root / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`, branch `codex/dependency-security-and-unused-cleanup`
- Resolved base: `origin/personal` @ `3b2c86ca9e` (fetched 2026-10-20; v1.5.8-beta.3)
- Finalization target: `origin/personal`
- Bootstrap: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile` done; blocker: none
- Current solution revision ID: `SR-002`
- Authorities read (2026-10-20): `requirements-engineering.md`, `ticket-scope.md`, `finding-the-cause.md` (new), `SKILL.md` (updated); design gate: `architecture-design.md` (updated), `design-principles.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md` (finalization), `templates/design-spec-template.md` (updated)
- Investigation status: Complete for design
- How findings were established: each row of the Source Log names `Read`, `Reproduced` or `Measured`.

## Initial Request And Clarifications

- Part 1: fix the advisories of `tar`, `undici`, mercurius' `undici` (verify them first); run `pnpm dedupe`; run `pnpm audit`, fix other high/critical that are small and safe, list the rest without silent widening.
- Part 2 (the user, 2026-10-20): "check whether any library is not used; if there are libraries which are not used, remove them as part of this cleanup, not just these three, there may be other libraries we don't need." Remove clearly unused; report doubtful ones.
- Done when: advisories fixed or explained; unused removed with evidence; no pending dedupe; builds, server and `autobyteus-ts` suites, packaged smoke (and Docker if it installs these) pass; finalized on `personal`. A beta is the user's decision; recommend in the report.

## Source Log

| Date | How | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-10-20 | Measured | `pnpm audit --json` / `--prod --json` (base) → `evidence/SD-00`, `SD-01` | All: 18 critical, 217 high (215 moderate, 40 low). Prod: 3 critical, 91 high, in 30 packages |
| 2026-10-20 | Measured | `probes/fixability.mjs` (reads each finding's parent range from the installed parent manifest, `npm view` versions, semver) → `evidence/SD-02` | Prod: 23 rows in-range; 10 not. Dev-only: 28 in-range, 24 not |
| 2026-10-20 | Read | `npm view electron-updater@6.8.9`, `express-rate-limit@8.7.1`; `vue` resolved via `nuxt ^3.21` | Three "not in-range" prod rows clear through an in-range **parent** update: `builder-util-runtime` (electron-updater 6.8.9 pins 9.7.0), `ip-address` (express-rate-limit 8.7.1: `^10.2.0`), `@vue/server-renderer` (vue 3.5.44) |
| 2026-10-20 | Read | `npm view electron@42 version` | 42.11.16 latest in 42; advisories fixed by 42.10.0 |
| 2026-10-20 | Reproduced | `probes/mercurius-load-probe.mjs` → `evidence/SD-04` | Mercurius 13.4.1 with `graphiql: true, subscription: true` (as `src/api/graphql/index.ts`): query OK, GraphiQL 200, 535 modules loaded, **0** under `undici`; `@fastify/static` loaded |
| 2026-10-20 | Read | `mercurius/lib/*.js` requires | No `require('undici')`; `lib/routes.js` L4/L393 loads `@fastify/static` when `ide`/`graphiql` is on |
| 2026-10-20 | Read | `npm view mercurius` (16.12.0), `mercurius@14.0.0` deps | `@fastify/static ^10`, `@fastify/websocket ^11`: Fastify 5 line |
| 2026-10-20 | Measured | `pnpm update -r --depth Infinity fast-uri protobufjs proxy-addr` (then reverted) | Targets fixed (audit empty for them); lockfile +182/−111, incl. neighbours (`express` 5.3.0, `hono` 4.13.13, `h3`) → the lockfile diff needs review |
| 2026-10-20 | Measured | `probes/unused-scan.mjs` and `unused-scan-strict.mjs` (all 16 manifests) → `evidence/SD-03` | Candidates listed there |
| 2026-10-20 | Measured | `npx knip@5 --workspace autobyteus-ts|autobyteus-server-ts` → `SD-03` | `autobyteus-ts`: `dotenv`, `ts-node` unused. Server: unlisted `jsdom`, `@autobyteus/application-backend-sdk` (tests). Whole-repo knip crashes in the web vitest/Nuxt config, so the web was checked by hand |
| 2026-10-20 | Read | web hand checks (grep in every non-generated file; `nuxt.config.ts` L111-115 modules, L236-242 postcss; `codegen.ts` L9-12) | Unused: `chart.js`, `vue-chartjs` (the trend chart is custom SVG, `TokenUsageTrendChart.vue` L94-97), `diff-match-patch`, `html2canvas`, `jsonrepair`, `markdown-it-katex` (math uses `@mdit/plugin-katex` + `katex`, `useMarkdownSegments.ts` L3-6), `markdown-it-prism`, `@nuxtjs/apollo` and `nuxt-electron` (not in `modules`), `@vitejs/plugin-vue` (nuxt brings its own; not a peer of `@nuxt/test-utils`), `concurrently` (docs only), `xmldom`. Used through config: the three `@graphql-codegen/*` plugins (`codegen.ts`), `postcss`, `autoprefixer` |
| 2026-10-20 | Reproduced | SR-002, ARCH-REV-001 AR-001: remove only `@nuxtjs/apollo`, `pnpm install` → `evidence/SD-08` | **Correction:** `@nuxtjs/apollo` is not unused. It is the only lockfile provider of `@apollo/client` and `@vue/apollo-composable`, which web code imports undeclared (`plugins/30.apollo.client.ts`, `utils/apolloClient.ts`, `generated/graphql.ts`). Without it, both leave the tree. Node can't resolve them from `autobyteus-web` even today; Nuxt/Vite find them in `node_modules/.pnpm/node_modules` (`probes/import-provider-check.mjs`, `evidence/SD-07`). My name scans couldn't see this |
| 2026-10-20 | Measured | `probes/import-provider-check.mjs` on base (`evidence/SD-07`) and after the corrected trial (`SD-08`) | Identical: no bare import of a changed package loses its provider. Pre-existing `MISSING` entries are unaffected, e.g. `@vue/composition-api` in `generated/graphql.ts` (RR-003) and fixture strings |
| 2026-10-20 | Measured | SR-002 trial (`evidence/SD-08`) | The loop alone left `lodash-es` 4.17.23 (under `@mermaid-js/parser`); naming the parents `mermaid`, `@mermaid-js/parser` (and `electron-updater`, `vue`, RR-002) clears it. Prod: 0 critical / 13 high, all explained |
| 2026-10-20 | Read | `autobyteus-web/components/fileExplorer/MonacoEditor.vue` L9, L123 | `@monaco-editor/loader` `loader.init()` with no `loader.config` anywhere: Monaco comes from the loader's CDN; the `monaco-editor` package is never imported → doubtful (FU-006) |
| 2026-10-20 | Measured | `tsc -p <config with types: []>` vs normal, per package | Without `@types/node`: team-stream, agent-presentation, collaboration-stream, frontend-sdk (after building siblings) 0 = 0 errors → unused. Backend SDK 11 vs 8, brief-studio 51 vs 40 → used |
| 2026-10-20 | Read | `autobyteus-ts` grep `dotenv|ts-node` | Only a test label string "dotenv file" and a regex in `scripts/verify-runtime-dependencies.mjs` L62 |
| 2026-10-20 | Read | `autobyteus-web/build/scripts/generateIcons.ts` L1-4; `package.json` `generate:icons` | `sharp`, `to-ico` used only by the manual icon generator (dev) |
| 2026-10-20 | Read | `components/fileExplorer/viewers/ExcelViewer.vue` L44 | `xlsx` parses user spreadsheets at run time; no npm fix (SheetJS publishes 0.20.x outside npm) |
| 2026-10-20 | Read | `autobyteus-web/electron/extensions/voice-input/voiceInputRuntimeSupport.ts` L176-178 | `tar.x` extracts the downloaded voice-input runtime (Electron main) |
| 2026-10-20 | Read | `autobyteus-message-gateway/package.json`, `docker/Dockerfile` L15-23 | Not a workspace package, no lockfile; its Dockerfile runs `pnpm install --frozen-lockfile --filter autobyteus-message-gateway...` against the root workspace that doesn't list it; `npm install --package-lock-only` fails (`edgesOut` null, likely the `baileys` git deps) → not audited here (FU-007). Its own deps: `fastify ^4.29.1` (same Fastify 4 advisories), `@fastify/cors`, `@whiskeysockets/baileys` 6.7.21 |

## Relevant Existing Behavior

| Behavior | Path | Evidence |
| --- | --- | --- |
| Runtime use of the named packages | `tar` (Electron main, voice-input), `undici` (`autobyteus-ts/src/llm/transport/local-long-running-fetch.ts`), mercurius' `undici` (never loaded) | Read / Reproduced above |
| Packaging | desktop: `prepare-server.sh` (pnpm deploy, mac/linux), `prepare-server.mjs` (npm, Windows); Docker `Dockerfile.monorepo` `pnpm install --no-frozen-lockfile` | autobyteus-182/224 notes |

## Persisted Data And State Facts

None affected.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `evidence/SD-00-pnpm-audit-base-high-critical-all.txt` | SD | Every high/critical at base (the raw JSON is reproducible with `pnpm audit --json` at `3b2c86ca9e`) | Final |
| `evidence/SD-01-audit-base-prod-high-critical.txt` | SD | Prod high/critical by package | Final |
| `evidence/SD-02-fixability.txt` | SD | In-range classification | Final |
| `evidence/SD-03-unused-scans.txt` | SD | Unused scans + knip | Final |
| `evidence/SD-04-mercurius-undici-not-loaded.txt` | SD | Reproduction for DEC-003 | Final |
| `probes/` (`fixability.mjs`, `unused-scan*.mjs`, `mercurius-load-probe.mjs`, `audit-summary.py`) | SD | Rerunnable after the change | Final |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-001 | Risk | In-range updates still regress something (semver slips), e.g. `axios` 1.13 → 1.20, `vue` 3.5.28 → 3.5.44, express/hono for the Claude SDK peer | Full validation matrix (AC-005…008); diagnose any failure (TESTING.md Rule 9) | Validation |
| R-002 | Risk | Electron 42.4.1 → 42.11.x changes desktop behavior | Packaged harness + isolated instance (AC-007) | Validation |
| R-003 | Risk | New advisories published between investigation and delivery | AC-001/002 allow adding them to the findings with evidence | Accepted |
| R-004 | Risk | Removing a dependency used only through a path the scans can't see | Each removal hand-checked (config, scripts, dynamic import); builds and suites | Validation |

## Architecture Investigation Findings

- No source owner changes; the change is manifests + root lockfile.
- The mechanism is `pnpm update -r --depth Infinity <names>` for in-range packages (transitive included), direct specifier edits for `tar`, `undici`, `electron`, then `pnpm dedupe`. The probe showed that neighbours move too, so the design adds a lockfile-review step.

## Requirement Implications

- Clearing everything is a multi-ticket program (Fastify 5, toolchain majors, `xlsx`). This ticket does the safe, mechanical part and turns the rest into explicit, prioritized follow-ups.
