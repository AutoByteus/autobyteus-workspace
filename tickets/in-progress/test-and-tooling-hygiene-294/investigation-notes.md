# Investigation Notes — test-and-tooling-hygiene-294 (autobyteus-294)

## Investigation Meta

- Package identifier: `test-and-tooling-hygiene-294`
- Request / ticket: Project Task `autobyteus-294` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): description (253 FU-001..FU-004) plus ten comments carrying items from nine tickets (290, 204/280, 14, 297, 296, 303, 273, 260, 244, the user's decision from 308) and 185 (2026-10-27).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/test-and-tooling-hygiene-294`
- Resolved base remote / branch / revision: `origin/personal`; first `ec92b3c02a` (2026-10-26), fast-forwarded on 2026-10-27 to `9bb873104b` (87 commits: autobyteus-32, autobyteus-185). Items were re-run on `9bb873104b` where the new base could change them (architecture, definition cache, compaction, Work Journal, the autobyteus-14 list, vue-tsc, codegen). The gated E2E, probe and Fastify/DOMPurify measurements ran on `ec92b3c02a`. Of the files those measurements and readings rely on, the 87 commits change only three (`git diff --stat ec92b3c02a 9bb873104b -- <path>`, checked per path): `remote-delegation-two-server.e2e.test.ts` (new cases; its `fetch` helpers L218-246 unchanged), `build-studio-server.ts` (the Fastify option now at L372) and `root-task-execution-lifecycle.ts` (`d384968700`, autobyteus-32: new-copy preparation split out; `acquireAtHead` / `stopForUser` unchanged).
- Rebase at the user's request (2026-10-27): fast-forwarded to `2f48d85d4d` (11 commits, autobyteus-313 Model Routing, release beta.13). Re-run there after `pnpm install`, `test:integration:prepare` and `nuxt prepare` (all exit 0): architecture + secret-management (same 2 + 3 failures, same causes, SD-16), definition cache spec (same 3, SD-16), vue-tsc full 507 / scoped 376 = 105 production + 271 test files (SD-17, SD-18), codegen drift 0 lines (SD-19). The 313 commits change none of the other measured files except `remote-delegation-two-server.e2e.test.ts` (7 lines, its `fetch` helpers unchanged); the Fastify option lines are unchanged (`build-studio-server.ts` L372, `build-standalone-application-server.ts` L20, `agent-tools-mcp-local-server.ts` L32). Current base: `2f48d85d4d`.
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile`, server `prebuild`/`build`, `test:integration:prepare` and `nuxt prepare` all exit 0 on both bases.
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate, 2026-10-26, re-read after the skill update 2026-10-27): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; repository `AGENTS.md`, `TESTING.md`.
- Investigation status: complete for requirements; architecture notes appended in the design phase.

## Initial Request And Clarifications

- Original request: the Task (see Meta) and the PM's message of 2026-10-26: "do the items in your own order, but put these FIRST because every delivery meets them on personal: (1) the architecture test … lacks the agent_runtimes registration; (2) the stale 308 fixtures … One user decision sits in it: the TESTING.md rule 9 versus skill conflict raised by autobyteus-303: put it to him directly. Prove from a clean clone. No release unless asked; clean up your worktree and branch." Message of 2026-10-27: fold in 185's FU-010, FU-011, FU-006, FU-012 after the two first items.
- User-supplied facts and constraints: the user's decision to remove the agent-management and agent-team-management tools (comment of 2026-10-26); "do not weaken the assertions"; the web type errors "may be split by area and baselined where a fix is large, with a plan".
- Initial ambiguity: several premises in the comments proved inaccurate (see Corrections below).

## Corrections To Premises In The Task

| Premise | Evidence | Established |
| --- | --- | --- |
| 244 FU-008: 308 "added `internal` to the Agent query and mutation selections"; only the spec fixture is stale | `graphql/mutations/agentDefinitionMutations.ts` `AgentDefinitionMutationFields` lacks `internal`; with only the fixture fixed, 1 case still fails: "Creation must not publish a row missing fields required by its catalog query: expected ['internal'] to deeply equal []". Fixture + fragment: 10/10 | Reproduced (temporary edits, reverted) |
| 253 FU-004: Team members are read "with memberAddress" | Team member file changes are `GET /rest/team-runs/:teamRunId/agent-runs/:agentRunId/file-change-content` and `getTeamMemberFileChanges(teamRunId, agentRunId)`; `memberAddress` is for Org and hub members only (`src/api/rest/run-file-changes.ts` L96-129) | Read; Reproduced (temporary edit passes 2/2) |
| 253 FU-001: 892 type errors | 253 ran `npx vue-tsc` (it pulled its own TypeScript). With the repository's TypeScript 5.9.3 and vue-tsc 3.3.13 (latest): 506. With the scope corrected (no server `src`, no `electron/`, `build/`) and the undeclared Apollo/graphql packages resolvable: 373 (103 production, 270 test files) | Measured (on `2f48d85d4d`: 507 full; 376 scoped = 105 production + 271 test files, SD-17/18) |
| 260 FU-001: `generated/graphql.ts` is ~1,650 lines behind | Generating from the schema printed from today's server build gives a byte-identical file (0 lines differ) | Measured |
| 290 FU-004: the SR-011 list lacks `agent-memory-explorer-service.ts` | Fixed by 253 W-01 (`68eb520da9`); the list now lacks `internal-agent-visibility.ts` (308) instead | Reproduced |
| 290 FU-006: the packaged-launch probe builds for Linux on macOS | Fixed by 253 W-06 (`62b653823f`): `hostElectronBuildScript` picks `build:electron:mac` on darwin | Read |
| 14: "24 tests fail before and after" | All 24 pass on `9bb873104b` in the clean environment after `test:integration:prepare` (application-backend 14 files 34/34; phone-access + update notifications 2 files 5/5) | Reproduced (SD-09) |
| 32 FU-009 (comment of 2026-10-27): SUN-E2E-003 "depends on the GitHub repository apar-sun-e2e/skills which no longer exists" | `apar-sun-e2e/skills` is the suite's fixture name (`agy-skill-update-notice-roots.e2e.test.ts` L42); the suite stubs GitHub's API and archive host (L140-156); only the head read added by `95a608c456` reached the real github.com, which answers "not found". With the head-read stub every GitHub request stays local and the case passes (6.5 s) — the local-fixture route 32 suggests. 32 FU-006/007/008/010 are H-02, H-09, H-11, H-04 | Reproduced (temporary edit) |
| 273 FU-004: 82 `.test.js` files | 62 `.test.js` + 3 `tests/setup/*.js` = 65 tracked `.js` under `tests/` (244 removed some) | Measured |

## Source Log (selected)

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 10-26 | Command | `vitest run tests/architecture/application-framework-boundaries.test.ts` | 2 failed: tool-unit list lacks `agent_runtimes` (`agent-tool-loader.ts` L73-77, from `5135bb73dc`/303); SR-011 getter list lacks `internal-agent-visibility.ts` (`813f7208d2`/308) (SD-01) |
| 10-27 | Command | `vitest run tests/architecture` on `9bb873104b` | same 2 of 54 fail; the folder runs in no package script (SD-06) |
| 10-26 | Command | `vitest run stores/__tests__/definitionMutationCache.spec.ts` | 3 Agent cases fail (SD-02); cause above |
| 10-26 | Command | `env -i … vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | 4/6 fail `getAgentDefinitionsWithTeamLocal is not a function`; mock L71-79 offers only `getAgentDefinitionById`; with the method added (`async () => []`) 6/6 (SD-03) |
| 10-27 | Command | `vitest run tests/unit/secret-management` | 3 fail with `Native command host scope is required` (`autobyteus-agent-run-backend-factory.ts` L118, required since `f34ad8749f`); cause: `test-support/live-e2e/live-e2e-harness.ts` L588 and L708 construct the factory without `nativeCommandProcessScope` — the shared live harness itself, so `pnpm test:e2e:real` is affected too (SD-07) |
| 10-27 | Command | `vitest run tests/agent-work-journal` | 6 files pass, perf file skipped by its gate, 6.3 s; the folder runs in no package script (`test:unit` = `tests/unit tests/app-data-migrations`) (SD-08) |
| 10-26 | Code / git | `git grep` of the 10 tool names and module paths; `git log -S registerAgentManagementTools` | the registration callers were removed in `eef765b901` (2026-03-03, "remove legacy management tool groups"); only the tools' own files and tests (`.ts` and `.test.js` twins), the SR-011 list (10 entries), `docs/modules/agent_definition.md` L11 and L144, `agent_team_definition.md` L190 and a comment in `internal-agent-visibility.ts` L12 name them. The web matches (`AgentCreate.vue`, `AgentDetail.vue`, `AgentTeamDetail.vue`, generated localization) are i18n keys of UI labels only |
| 10-26 | Command / API | `git ls-files 'tests/**/*.js'`; GitHub API commits for `tests/setup/prisma-env.js` in `AutoByteus/autobyteus-server-ts` at `345bee2f72` | 65 files, all added to this repository by the flatten `b1c89884e6`; upstream they came with `802033fe0e` "Migrate autobyteus-server to TypeScript" (2026-02-03): compiled output committed beside the sources. 64 have a `.ts` twin; `tests/integration/agent/agent-team-websocket.integration.test.js` has none (an old compiled test). No config or script references them (`vitest.config.ts` includes `tests/**/*.test.ts`, setup files are `.ts`); `prisma-test-config.js` equals its `.ts` |
| 10-26 | Code | `claude-sdk-client.ts` L57-62, L245, L352-358; `claude-session-query-options.ts` | `env` is set only by `claude-sdk-client.test.ts` (L100-214); production options never set it; in cli mode an explicit `env` is returned unchanged, skipping `buildClaudeSdkSpawnEnvironment` (auth policy, 1-hour cache default) |
| 10-26 | Probe | `/tmp` Fastify probe (old option, `logController: new LogController({ disableRequestLogging: true })`, none) | old: FSTDEP023 printed, 0 request log lines; new: no warning, 0 lines; none: 2 lines. Fastify 5.12.7 exports `LogController` |
| 10-26 | Probe | `evidence/SD-15-purify-probe.mjs` with happy-dom 15.11.7 and 21.0.4 (latest), DOMPurify 3.4.7 | both happy-dom versions keep `javascript:` hrefs, `onerror`, `<script>` after the first removal; upgrading does not fix it |
| 10-26 | Probe | temporary jsdom/happy-dom spec over `useMarkdownSegments` (removed) | jsdom: `<img src="x"><a>a</a><div style>…` (stripped); happy-dom: `href="javascript:…"`, `<iframe>`, `onclick` survive. markdown-it runs with `html: true`, so DOMPurify is the only defence; production sanitises correctly |
| 10-26 | Code / git | `autobyteus-message-gateway/scripts/{build-runtime-package,release-manifest}.mjs`; `git show 40f769e0d9` | the manifest they write (`autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json`) no longer exists; `40f769e0d9` (2026-09-24) removed external messaging, the managed gateway and the gateway release workflow; only `package.json` `build:runtime-package` and `.gitignore` `.runtime-package-stage` reference them |
| 10-26 | Command | three gated E2E files with `RUN_AGY_FAILURE_E2E=1` and the scripted AGY CLI (SD-04) | DLC 2/3 fail; SUN 1/3 fail; multi-image 1/2 fail — as reported |
| 10-26 | Measured | DLC receipt (`SD-04b-dlc-received-member-shape.json`) | every Team-copy member has a complete `launchConfiguration`; `followsTeam: true` and the team default for members without a usable own default; `launchSource` null for `lead`, `inherited` with its fallback for the four others — exactly autobyteus-197 D-5 (`tickets/done/delegated-copy-restore-from-own-file/design-spec.md` L153, L434, L443) |
| 10-26 | Code | 197 design L185, L201, L234-235; `tests/app-data-migrations/delegated-copy-own-file-complete-v1/…test.ts` L71-200 | released catalog Team copies (members without launches) are converted by the startup migration (F-T1, F-T2), which its own test covers; the current team-tree validator rejects a file in the released shape at runtime |
| 10-26 | Command | SUN-E2E-003 with `headReadRepository/headReadResponse` for `apar-sun-e2e/skills` (temporary) | passes (6.5 s) |
| 10-26 | Command | multi-image E2E with owner-scoped team reads (temporary) | 2/2 |
| 10-26 | Code | `agent-runtimes-running-agents.e2e.test.ts` L185-222; `agent-runtime-status-service.ts` `checkAll` L142-150, re-check L342-345 | RA-04's loop presses Check only while the newer release is not shown; when RA-03's automatic re-check already read it, no user check clears RA-03's SUCCEEDED operation and L222 fails (296 measured 1 in 6) |
| 10-26 | Code | `codex-standalone-send-message-global-routing.e2e.test.ts` L567; `codex-app-server-client-manager.ts` | `getClient` no longer exists; the lease API is `beginAcquire(cwd)` → `acquire()` / `release()`; release with no other holder closes the client |
| 10-26 | Code | `projects-feature-probe.mjs` L573-584; `embedding-model-files.ts` L12, L134; `relevance.ts` | the probe never asserts meaning search; its backend can download the real model from huggingface.co (global `fetch`), and the meaning tier may then return the nearest Tasks for "unmatched"; there is no setting that turns meaning search off; precedent for a probe-owned `--import` fetch stub: `model-routing-provider-usage.mjs` |
| 10-26 | Command | `pnpm -C autobyteus-web test:e2e:agent-runtimes-settings -- --skip-server-build` on base (SD-05) | ARP-01, 04, 09, 11 fail, as 303 reported |
| 10-27 | Command | same probe with two temporary edits (Codex source `https://github.com/openai/codex/releases/latest` answered with GitHub's 302 to the tag; `open()` after ARP-07's locale reset), reverted (SD-14) | 11 Pass, ARP-08 Not applicable on macOS: all four causes proven. ARP-01: Codex's check went to the real github.com and outlasted Antigravity's 6 s hold; ARP-04/11 expect the scripted 0.163.0; ARP-09: ARP-07 writes `en` but the page stays zh-CN until a reload, which on Linux ARP-08's `open()` performs and on macOS ARP-08 skips |
| 10-26 | Code | `remote-delegation-two-server.e2e.test.ts` L218-246, L1567 | every test request goes through a few `fetch` helpers; no watchdog today |
| 10-26 | Code | `team-run-v1-production-upgrade.e2e.test.ts` L1496-1498, L1457-1461 | the dead `not.toContain("startup continues with strict current-package admission")` (line removed by `c76fbf90aa`/280) guards "the V2 migration stays clean", which L1457-1461 already assert (`SUCCEEDED`, attempts 1, `errorMessage: null`) |
| 10-26 | Code | `root-task-execution-lifecycle.ts` L345-470 | EXC-E2E-004 (14's diagnosis: the next assignment's restore at the queue head meets a member the DONE's in-flight Stop fenced → `TASK_EXECUTION_RESTORE_FAILED`) sits in the Stop-drain / wake sequencing of the Task lifecycle: a product race, not a test defect |
| 10-26 | Code | `mcp-runtime-tool-matrix.e2e.test.ts` L141-178 | a failing cell reports only `summary` (task status and wire flags) and the last 20 frames of a failing turn, not the run's tool events |
| 10-26 | Code | `git grep i-heroicons-` (75 uses, 30 files); `package.json`; `tailwind.config.js` plugins | no Tailwind/UnoCSS icon plugin and no `@iconify-json/heroicons` exist, so the classes render nothing; they predate the flatten. The app's icon mechanism is `@iconify/vue` `<Icon icon="heroicons:…">` (304 uses, 159 files). `@iconify/vue` 5.0.0 loads icon data from `api.iconify.design` at runtime and no collection is registered offline |
| 10-26 | Code | `application_orchestration.md` L165-183; `application-engine-launcher.ts` L45-66, L140-168; `application-agent-tool-catalog.ts` L74-89 | documented: removal → persisted-only `QUARANTINED`, entrypoints reject with availability detail, its tools leave the catalog; a worker crash → engine detached, state `failed`; the next `ensure-ready`/tool call/pending event boots a fresh worker (by reading); a reentry resets a crashed worker. What happens to the live run itself on removal is not documented |
| 10-26 | Code | `default-agent-tool-mcp-adapter-providers.ts`; `agent_tools_mcp_server.md` L242-258 | the doc lacks `list_available_agents`, `list_peer_nodes`, `list_available_agent_runtimes` and the model-routing tool (`submit_launch_choices`) |
| 10-26 | Code | Brief Studio E2E files (`application-reload-repair`, `application-import-codex-launch`, `agent-runtimes-running-agents`) L32-45 | `describe.skipIf(!packageBuilt)`; `scripts/integration-test-prerequisites.mjs` (253) now builds the package without the bin-link second install (`prepare` packs with the devkit CLI directly) but the E2E files still skip silently and TESTING.md's E2E row names no prerequisite |
| 10-27 | Command | `vue-tsc` 3.3.13 + TypeScript 5.9.3 (`/tmp` install) `--noEmit -p tsconfig.json` (SD-10) | 506 errors in 37 s: web app 412 (123 production, 289 tests), `../autobyteus-server-ts` 55, `electron/` 35 (all specs), `build/` 4 |
| 10-27 | Command | scoped probe (temporary `tsconfig.zz-probe.json`: Nuxt paths + Apollo/graphql resolvable; excludes `electron/`, `build/`, server, the 3 cross-package tests), removed (SD-12) | 373: 103 production (top: `toolManagementStore.ts` 19, `skillStore.ts` 11, `NotificationRow.vue` 6), 270 tests |
| 10-27 | Code | `.nuxt/tsconfig.json` include `../**/*`; `electron/tsconfig.json`; `build/tsconfig.json` | the Nuxt project sweeps in `electron/` and `build/`, which have their own projects; `tsc -p electron/tsconfig.json --noEmit` and `tsc -p build/tsconfig.json --noEmit` exit 0 (SD-11). Server `src` enters only through 3 web tests importing server code: `UserMessageStoredUploadNames.spec.ts`, `acceptedInputIdentity.spec.ts`, `tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts` |
| 10-27 | Code | TS2307 errors | web code imports `@apollo/client/core`, `graphql`, `@vue/apollo-composable` (and `vite`, `vue-bundle-renderer` in `modules/electron/index.ts`) without declaring them; they reach Vite only as `@nuxtjs/apollo`'s dependencies (`^3.13.8`, `^16.11.0`, `^4.2.2`; resolved 3.14.0, 16.12.0, 4.2.2). `MarketplaceFilter.vue`, `RemoteAgentCard.vue`, `RunningAgentCard.vue`, `WorkspaceConfigForm.vue` import modules that do not exist and are rendered nowhere (also not under Nuxt auto-import names): dead components |
| 10-27 | Measured | schema printed from `dist` (`evidence/SD-13-print-schema-probe.mjs`), then `graphql-codegen` to `/tmp`; repeated on `2f48d85d4d` (SD-19) | 0 lines differ from `generated/graphql.ts` on both bases; importing the schema logs "AgentFactory (Singleton) initialized." to stdout, and a print to a pipe followed by `process.exit` was cut at 64 KiB (measured on the rebase), so a script must write the schema to a file; the codegen config lacks `vueCompositionApiImportFrom: 'vue'`, so the file imports Vue 2's `@vue/composition-api` (2 TS2307); all production imports from it are type-only, `ServerMigrationsManager.spec.ts` imports an enum and passes |

## Runtime, Probe, Or Reproduction Findings

All logs are in `evidence/` (ANSI stripped). Temporary diagnostics: the edits listed in the Source Log as "temporary" (fixture/fragment, mock, head-read stub, owner reads, probe stub and reload, `tsconfig.zz-probe.json`, Markdown injection spec, the schema print script copied into the server folder) — each made in this worktree only, run once, and reverted or deleted before writing these notes (`git status` shows no tracked change). No diagnostic is committed except the evidence files.

Reproductions for implementation to start from: every failing test above fails today with its command in the Source Log; `evidence/SD-14-arp-diagnostic-result.json` shows the probe green with the two probe fixes.

## External Contracts, Standards, And Dependencies

| Dependency | Version | Relevant behaviour | Evidence |
| --- | --- | --- | --- |
| Fastify | 5.12.7 | `disableRequestLogging` top-level option deprecated (FSTDEP023), removed in 6; `logController: new LogController({ disableRequestLogging })` is the replacement | probe; `node_modules/fastify/lib/warnings.js` L70-75 |
| happy-dom | 15.11.7 (installed), 21.0.4 (latest) | DOMPurify traversal stops after the first removal in both | SD-15 probe |
| vue-tsc / TypeScript | 3.3.13 (latest) / 5.9.3 (repo) | `npx vue-tsc` without a pinned TypeScript fails or pulls another TypeScript; the gate must pin both | SD-10 |
| `@iconify/vue` | 5.0.0 | loads icons from public Iconify APIs on demand | `node_modules/@iconify/vue/dist/iconify.mjs` |
| GitHub releases/latest | — | the node reads Codex's latest tag from the 302 `location` (`github-repository-client.ts` L36-58) | read |

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `evidence/SD-*` | Solution Designer | reproductions and measurements cited above | Final |
| `follow-ups.md` | any role | items outside this ticket | Started |

No behavior-defining supplement.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| U-1 | Unknown | the live run's fate on package removal (ended or kept) is undocumented | the new e2e observes and records it; if it contradicts the documented quarantine contract, it returns to the Solution Designer as a product finding |
| U-2 | Unknown | RC-12 may not recur during validation | the watchdog stays, so the next occurrence is diagnosable; "observe first" is the Task's direction |
| R-1 | Risk | fixing 105 production type errors touches many stores/components; a wrong type fix can change behaviour | design requires behaviour-preserving fixes only (types, narrowing, dead code) and the full web suite; anything behavioural becomes a finding |
| R-2 | Risk | declaring `@apollo/client`, `graphql`, `@vue/apollo-composable` changes the lockfile importers | pin to the versions already resolved, so no resolution changes |

## Requirement Implications

- Two premises changed the requirements: the 308 web finding is a product gap (the mutation fragment), and the type-check count and scope differ from 253's figure.
- Three items need no code change today (the autobyteus-14 24 tests, 260's codegen drift, 290's packaged-launch build); they get a check or a script, not a fix.
- One item is a product race outside a test hygiene ticket (EXC-E2E-004): reported as a follow-up with its cause.

## Architecture Investigation Findings

Read and measured on `2f48d85d4d`, 2026-10-27, after requirements approval.

| Source | Finding | Design use |
| --- | --- | --- |
| temporary `electron/tsconfig.zz-probe.json` (specs included, removed) (SD-20) | 27 errors, all in Electron specs; Electron production 0 | Electron project checked with its specs, specs baselined |
| `autobyteus-web/package.json` L40-45 | `build:electron*` already runs the web guards, `transpile-electron` (tsc) and `tsc -p build/tsconfig.json` | the gate joins this chain |
| `node_modules/fastify/fastify.d.ts` L20, L48, L137 | `LogController` is exported in the types; `logController?:` is a server option | H-18 |
| `git grep "from '@iconify/vue'"` | 134 local `import { Icon } from '@iconify/vue'` | H-28 follows the local import pattern |
| `ToastContainer.vue` L13, `ToolCard.vue` L35-37, `ToolList.vue` L64, `ProviderModelBrowser.spec.ts` L147 | computed icon class strings and one spec selecting by class | H-28 conversion rules |
| `scripts/guard-web-boundary.mjs` | a package-dependency guard | no icon rule added there |
| `live-e2e-harness.ts` L560-612, L690-720, L1095-1129 | two factory constructions; each method has a `finally` that terminates the backend and closes the workspace | H-04 placement |
| `project-task-search.ts` L62, L104-112 | `searchProjectTasks` returns `meaningSearch` status | H-27 asserts it |
| `autobyteus-message-gateway/README.md` | no mention of the removed scripts | H-20 |

