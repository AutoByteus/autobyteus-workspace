# Investigation Notes — autobyteus-318 (test and tooling hygiene, round 2)

## Investigation Meta

- Package identifier: `test-and-tooling-hygiene-318`
- Request / ticket: Project Task `autobyteus-318` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), with 12 merged Tasks (autobyteus-59, 103, 104, 112, 115, 116, 148, 220, 225, 237, 239, 257; full texts in the Task's context file `bundle-test-hygiene.md`) and the items in the Task's comments (311, 331, 316, 343).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/test-and-tooling-hygiene-318`
- Resolved base remote / branch / revision: `origin/personal` at `efd28d5c4a` (fetched 2026-11-01)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile` OK; server `prebuild`, `build`, `test:integration:prepare` OK; web `typecheck` (runs `nuxt prepare`) OK.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-01): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `TESTING.md` (full), the requirements and investigation templates.
- Authorities read (architecture reading gate; 2026-11-01): see `design-spec.md`.
- Investigation status: Complete for requirements. Items marked `Run first` are confirmed by implementation before it changes them (each needs a built stack or repeated runs).

## Initial Request And Clarifications

- Original request: the Task — check every merged item against current code, report what is fixed or no longer applies with evidence, fix what is still true; burn down the web type-check baseline by area, largest first; give the three server-importing web tests a type-checked home; remove the unused transcription URL and `@nuxtjs/apollo`; fix the stale lines; keep the type gate; prove from a clean clone; no release.
- Clarifications received: PM message 2026-11-01 (the user's addition): "An item that is already fixed, no longer applies, or is no longer worth the effort is yours to drop … Say in your report which items you dropped and why (a line each, with the evidence). Only questions that truly need the user (a change of product behavior or scope) go to him."
- User-supplied facts and constraints (from the Task and earlier user direction): test vault and test data only; no paid live suites without the user's approval (list them); live compaction runs are not required proof (user, autobyteus-294; TESTING.md L185-192); parallel teams on 345, 357, 358, 285, 337, 355 — keep to this area and resolve merge conflicts.
- Initial ambiguity: which baseline areas are "agreed" (decided in DEC-002).

## Product And Domain Understanding

- Product area: the repository's test suites, type gates, probes and test tooling (server, web, core). One product-facing removal: the unused transcription URL in web/Electron config.
- Affected actors or systems: developers and agents running tests; the web type gate inside `build:electron*`; delivery's clean-clone runs.
- Relevant terminology: *type gate* = `pnpm -C autobyteus-web typecheck` (`scripts/typecheck.mjs`; production files must have zero errors, test files ≤ `typecheck-baseline.json`); *build type policy* = the server's `tsconfig.build.json` options; *gated suite* = a test skipped unless its `RUN_*` variable is set.

## Item Triage (every item, checked against `efd28d5c4a`)

Disposition: `Keep` (still true, fixed here), `Run first` (still true by code; implementation reproduces before changing), `Drop` (with reason). A repeated failure counts once (`= T-xx`).

| ID | Source | Claim | Current state and how established | Disposition |
| --- | --- | --- | --- | --- |
| T-01 | 294 FU-003 | Three web tests import server code and are excluded from the type check | Still excluded (`nuxt.config.ts` L239-241). Measured (SD-02): a project with the web options plus the server build's `noImplicitOverride: false` and decorators gives 4 errors: `autobyteus-server-ts/src/integrations/github/github-repository-source.ts` L1 (TS1484, the web-only `verbatimModuleSyntax`), `autobyteus-server-ts/tests/fixtures/recorded-upload-labels.ts` L37, L41 (TS2345 `HistoricalReplayEvent[]` vs `EventMonitorReplayEvent[]`), `tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts` L66 (TS2353 stale `memberTeamContext`). With the plain web options: 272 errors, mostly server files under `noImplicitOverride` (TS4114/TS4115) | Keep |
| T-02 | 311 FU-003 | Web typecheck fails with 2 errors from the server fixture | = T-01 (same two lines). Today hidden by the exclusion: `pnpm -C autobyteus-web typecheck` PASS, 0 production errors, 298 test errors in 139 files (Reproduced 2026-11-01) | = T-01 |
| T-03 | 294 FU-004 | Burn down the web test baseline by area | `typecheck-baseline.json` = 298 errors (Measured): components 98, services 52, stores 46, tests 34, electron 27, composables 23, utils 13, test-support 3, layouts 2 | Keep (DEC-002) |
| T-04 | 294 FU-009 | Unused transcription WebSocket URL carried end to end | Still present (Read): `nuxt.config.ts` `serverUrls.transcriptionWsEndpoint`, `runtimeConfig.public.audio`, `utils/browserServerConfig.ts`, `stores/serverStore.ts` `urls.transcription`, `electron/server/baseServerManager.ts`, `types/serverStatus.ts`, `types/electron.d.ts`, `.env*`, `README.md`, browser probes (`composer-context-file-removal-probe.mjs`, `team-status-live-probe.mjs`, `project-manager-ux-probe.mjs`, `projects-voice-cases.mjs`, …), server-status spec fixtures. The server serves no such route (294 FU-009) | Keep |
| T-05 | 294 FU-010 | `@nuxtjs/apollo` unused | Still declared (`autobyteus-web/package.json` L164); not in `nuxt.config.ts`/`nuxt.electron.config.ts` modules; no import; only the stale `@ts-expect-error` comment in `providerSettingsApolloContract.spec.ts` L1 (baselined TS2578) (Read) | Keep |
| T-06 | 294 FU-011 | Fresh-clone Electron download race in `test:electron` | Still true (Measured): after `pnpm install --frozen-lockfile` in this fresh worktree `node_modules/electron/dist` does not exist; `electron@42.11.16` has no install script (only an `install-electron` bin), so the first `require('electron')` downloads it, and parallel vitest workers race | Keep |
| T-07 | 294 FU-012 | `real-e2e-provider-capabilities.e2e.test.ts` calls removed `openStreamingSession` | Still there: TS2551 at L223, L225 (Measured, SD-01) | Keep |
| T-08 | 294 FU-013 | `docs/modules/agent_execution.md` L716 names `openStreamingSession` | Still there (Read, grep) | Keep |
| T-09 | 294 FU-014 | `file-system-watcher.integration.test.ts` times out under full-suite load | Passes 14/14 alone (Reproduced 2026-11-01). Readiness is awaited before any action (`src/file-explorer/file-explorer.ts` L383 `waitUntilReady`), so it is not a start race. Per-action wait 8 s (L43). Cause under load not proven; the watcher has a timing log (`timingLog` in `file-system-watcher.ts`) to measure event latency | Run first (REQ-011) |
| T-10 | 311 FU-002 = 331 FU-004 = 316 FU-009 | Broken `import {` in `tests/e2e/helpers/claude-live-agent-harness.ts` | Still there: L23 `import {` followed by L24 `import { startAgentToolsMcpTestHost }` (Read). 8 test files use the harness (grep). With the two lines swapped `tsc` parses the file (Measured) | Keep |
| T-11 | 311 FU-004 | `org-owned-team-local-agent.test.ts` 2 tests call a changed API | Fails 2/18: `TypeError: Cannot destructure property 'topology' of 'input.plan'` (Reproduced) — `AgentOrgRunPlanner.build` now needs `plan` | Keep |
| T-12 | 311 FU-005 | `scoped-org-history-graphql.e2e.test.ts` L109-111 expects `llmConfig: { unsupported_setting: true }` to be refused | Fails (Reproduced). Cause: `47f44c3df6` (2026-10-29, SR-004) made the model-settings check leave undeclared keys out instead of refusing them — an intended product change; the test is stale | Keep |
| T-13 | 343 FU-001 | `'AUTOBYTEUS'` runtimeKind fixtures | Still there: web `WorkspaceAgentRunsTreePanel.spec.ts` L1040, L1047; server `workspace-run-history-graphql.e2e.test.ts` L142, L253 (Read). `RuntimeKind.AUTOBYTEUS = "autobyteus"` (`runtime-kind-enum.ts` L2). Both files pass today (the value is only echoed) | Keep |
| T-14 | 343 FU-002 | Unused `exists` helper | Still there, L50 (Read) | Keep |
| T-15 | 316 FU-010 | Header of `runtime-switch-native-built-server.e2e.test.ts` lists RS-01..RS-06 | Header L26-39 lists RS-01..06; cases RS-07 (L593), RS-08 (L632) exist (Read) | Keep |
| T-16 | 59 | `codex-interrupted-compaction.e2e.test.ts` calls removed `prepareNewAgentRun` | Still there: L112 TS2339, plus TS2554 at L61, L90, L99 (Measured, SD-01) | Keep (with T-44) |
| T-17 | 59 | terminal-websocket-lifecycle "PTY home path" fails | Reproduced with an unresolved temp `HOME` (`mktemp -d` → `/var/…`; the shell reports `/private/var/…`). TESTING.md L132-134 already prescribes the resolved path for exactly this test; with `HOME="$(cd "$(mktemp -d)" && pwd -P)"` it passes 3/3 (Reproduced) | Drop: cause known and documented |
| T-18 | 59 | Stale test title in `agent-team-collaboration-llm-contract.test.ts` | L64 "delegation always does" — `delegate_task` mode (3) gives a saved Task to an existing task agent; the assertion checks "Every call with an address creates another task agent" (Read) | Keep (title only) |
| T-19 | 59 | Isolated app does not pass `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | The user decided (autobyteus-294) that live compaction runs are not required proof; TESTING.md L177-192 records the Claude override as in-process only and compaction proof as deterministic layers | Drop: user direction |
| T-20 | 59 | TESTING.md lacks three gate names | TESTING.md L16-21 and L43: gates and commands belong in each test file's header; the three files carry them (`autobyteus-compaction-token-reading-live` L16-19, `token-usage-runtime-graphql` L18-20, `codex-compaction-token-reading` L19-20) (Read) | Drop: no longer applies |
| T-21 | 59 | `codex-compaction-token-reading` doesn't delete its run record | `afterAll` removes the test-owned root that holds its app-data (L40-51) (Read) | Drop: fixed |
| T-22 | 59 | Stale comments in `autobyteus-compaction-token-reading-live` | "a newer revision clears" has 0 hits (grep) | Drop: fixed |
| T-23 | 59 | `generated/graphql.ts` stale | Withdrawn (294 FU-005; drift 0) | Drop: withdrawn |
| T-24 | 59 = 237 | Architecture guard SR-011 fails | `tests/architecture` 8 files, 55 tests pass (Reproduced 2026-11-01); fixed in autobyteus-294 | Drop: fixed |
| T-25 | 59 | AE-006 (gemini pricing) failed in the shared e2e DB ("table token_usage_run_records does not exist") | Start-up changed since (`c76fbf90aa`, capability readiness replaces migration-id checks); not reproducible without a full server e2e run | Run first (in the full e2e run; REQ-012) |
| T-26 | 59 | Duplicated scripted-AGY helpers across e2e suites | Grew: `calledResults` in 20 files, `toolResult` 23, `liveAgyCwds` 8 (grep) | Drop: not worth it (DEC-005) |
| T-27 | 59 | Tests leave folders in the OS temp dir | No removal in `autobyteus-ts/tests/unit/prompt/prompt-builder.test.ts`, `tests/unit/agent-execution/backends/acp/acp-fake-agent-harness.ts`, the Grok `fake-grok-*` tests; removal present in the registry, capsule, workspace and skill-name tests (Read). The two AGY timing suites left nothing in a run-owned `TMPDIR` (Measured) | Keep (measure first) |
| T-28 | 103 Part 1 | task-copy-idle-lifetime intermittent (5 signatures) | Passes 1/1 with the scripted AGY CLI at load average 8–19 (Reproduced 2026-11-01). Signature 2 has a load-independent cause: the window is measured between the test's own receive times of two WebSocket frames (L170 `at: Date.now()`, L371), which carry no server time, so a late "idle" frame shortens the measured window. Signatures 1, 3, 4, 5 were seen at load averages up to 186 | Keep signature 2; drop 1, 3, 4, 5 (DEC-006) |
| T-29 | 103 Part 2 | package-auto-refresh AC-012 and DCF-E2E-007 miss 5 s bounds | Seen at load average 186, 14/14 alone twice (bundle). The bounds are product timing promises (AC bounds) | Drop (DEC-006) |
| T-30 | 103 Part 3 | run-file-change-service 2,000 ms wait timed out once | `waitForCondition` default 2,000 ms polls for an eventual condition (L32-45); no timing assertion | Keep |
| T-31 | 103 Part 4 | native-compaction-terminal-drain extra `failed` phase | Fixed: the test waits for the `failed` event before clearing phases; the comment names the cause (L13-16) (Read); passes (Reproduced) | Drop: fixed |
| T-32 | 103 | TESTING.md "Known intermittent e2e" note | Not present (grep) | Drop: gone |
| T-33 | 104 Part 1 | projects-feature 390 px cascade | Needs the probe stack | Run first |
| T-34 | 104 Part 2 | PMU-002, PMU-021 cross-case | PMU-021 cause still present: `services/fileExplorerStreaming/FileExplorerStreamingService.ts` L128-130 logs `console.error` on `onerror`, which fires when the probe's own `page.reload()` aborts the socket (bundle FU-API-004). PMU-002 needs the stack | Keep PMU-021; Run first PMU-002 |
| T-35 | 104 Part 3 | PMU-008, TMV-002 | Needs the stack | Run first |
| T-36 | 104 Part 4 | team-reload-member-freshness E-005 exact request sequence | The Team-list reload after a definitions change is intended (live definitions feed `f7fcf9055a`; one change signal for every agent definition change, `e4746ade4e`, autobyteus-324) | Run first; if it fails, update the expected sequence (DEC-007) |
| T-37 | 112 Part 1 | Golden event-sequence test keeps timing-dependent `output_throughput.method` | Still true (Read): `normalize` (L182-215) masks `duration_ms` but not `method`; `method` flips at `MIN_GENERATION_WINDOW_MS = 250` (`src/agent/loop/llm-call-throughput.ts` L17, L59). Passes today | Keep |
| T-38 | 112 Part 2 | Live cache-reuse compaction CCR-E2E-002 output variance | Live, paid, compaction; the user's direction (T-19) | Drop: user direction |
| T-39 | 115 | RightSideTabs workspace-target spec fails | Passes (with WorkspaceAgentRunsTreePanel: 2 files, 67 tests) (Reproduced) | Drop: fixed |
| T-40 | 116 | read_media_file continuation test references a removed model | The file was replaced by `read-file-media-continuation-flow.test.ts` (autobyteus-328); it passes in a clean env (Reproduced) | Drop: no longer applies |
| T-41 | 148 (1) | codex-agent-run-backend-factory integration stale | TS2339 `createBackend` ×10, `createAgentRun`, TS2554 (SD-01); hard-coded models L192-196 (`gpt-5.3-codex`, `gpt-5.4-mini`, `gpt-5.4`) | Keep |
| T-42 | 148 (2) | codex-thread-manager / codex-thread integration need `gpt-5.4-mini` | Still (L105-107) plus stale `acquireClient`/`releaseClient`/`submitInput` (SD-01); `services/codex-model-catalog.integration.test.ts` has the same `acquireClient` errors | Keep |
| T-43 | 148 (3) | codex-app-server-client-manager integration calls removed `acquireClient` | Fixed: it uses `beginAcquire(...).acquire()` (L74-104) | Drop: fixed |
| T-44 | 148 (4) | codex-live-memory-persistence, codex-interrupted-compaction call `prepareNewAgentRun` | Still: L321, L531, L681 plus TS2554 (SD-01); = T-16 for the second file | Keep |
| T-45 | 148 (5) | claude-agent-run-backend-factory open_tab cases time out | No type errors in the file (SD-01); only a live `RUN_CLAUDE_E2E` run can show it | Listed for the user's approval (live); no change unless that run fails |
| T-46 | 148 (6) | context-file-storage-runtime uses the old team layout | Reproduced with `RUN_CONTEXT_FILE_PROCESS_E2E=1` (scripted inference, free): 2 of 6 fail — the known 404 at L164 (`agent_teams/<team>/retained-task/context_files`, L133-140) and "resumes an eligible interrupted old/current corpus …: promise resolved undefined instead of rejecting" (cause to find) | Keep |
| T-47 | 220 = 257 FU-009 | project-task-index-status "one run per burst" intermittent | Passes (Reproduced). Real-time `sleep` (L23). Two earlier fixes widened its window (`cece5ce05b`, `9457972953`) | Keep (fake timers; DEC-008) |
| T-48 | 225 | claude-sdk-client integration calls `openStreamingSession`; a renamed API should not break it silently | Ported: L69 `beginStreamingSession({ resolveOptions }).open()` (Read). Nothing type-checks server tests: `pnpm -C autobyteus-server-ts typecheck` covers `src` only | Drop the port (fixed); keep "renamed API breaks the check" (REQ-010) |
| T-49 | 237 | = T-24 | | = T-24 |
| T-50 | 239 | Probes delete an existing `--output-dir` | 5 probes call `fs.rm(outputDir, { recursive: true, force: true })`: `agent-runtimes-settings-probe.mjs` L224, `embedding-settings-probe.mjs` L147, `github-integration-card-probe.mjs`, `internal-agents-probe.mjs`, `model-routing-settings-probe.mjs` (grep); TESTING.md L313 says evidence is never overwritten | Keep |
| T-51 | 257 FU-003 | delegated-launch-config-defaults | Fixed in autobyteus-294 | Drop: fixed |
| T-52 | 257 FU-005 | task-reactivation-root-visibility QR-001 hang (possible product race) | Passes 1/1 with the scripted AGY CLI (Reproduced 2026-11-01) | Run first (repeated; REQ-013) |
| T-53 | 257 FU-006 | `team-member-run-view-projection-service.import.test.ts` times out at 5 s | No explicit timeout (L9). The case asserts that importing the module does not resolve the memory dir — not import speed | Keep |
| T-54 | 357 FU-004 (Task comment 2026-11-01) | The gated LM Studio suites have rotted | `autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts`: 16 type errors (SD-01: `postUserMessage`, `createAgentRun`, TS2554); its model lookup `LLMFactory.listModelsByRuntime(LMSTUDIO)` no longer discovers LM Studio since `16b5696716` (discovery moved to the server's dynamic model sources); doubles miss `hasEffectiveSkills`, `createAgentRun` (357 API-04). `token-usage-runtime-graphql.e2e` and `autobyteus-team-runtime-graphql.e2e` share the auto-lookup. A local LM Studio server answers on 127.0.0.1:1234 (Measured) — local, no spend | Keep |
| T-55 | 357 FU-005 (Task comment) | `agent-package-folder-watcher.test.ts` "starts a registered root that is missing …" times out | Failed only "when the server unit suite runs while another heavy suite runs"; passes 3/3 alone (357 DEL-02/02b) | Drop (DEC-006: two heavy runs at once) |
| T-56 | 355 FU-1 (Task comment) | Broken import in `claude-live-agent-harness.ts` | = T-10 | = T-10 |
| T-57 | ARCH-REV-001 AR-001 (2026-11-01) | The server tests project reaches `../autobyteus-ts/src/llm/transport/local-long-running-fetch.ts`, which has one error under the server's default `lib`: TS2352 at (33,7), undici `Response` vs the DOM `Response`. `autobyteus-ts/tsconfig.json` uses `lib: ["ESNext"]` and its build is clean | Measured (`tsc --explainFiles` on the build-policy tests project, 2026-11-01). The file is reached through `test-support/live-e2e/live-e2e-harness.ts` → `autobyteus-ts/src/index.js` → `llm/index.ts` → `llm-factory.ts` → `lmstudio-provider.ts` / `api/lmstudio-llm.ts`, `api/ollama-llm.ts`. Routing the frozen snapshot test's own `src` import through the package does not remove it (still 1 production error, measured). With the type-only `as unknown as` cast, the tests project shows 0 production errors and 1,327 test errors, and the `autobyteus-ts` build stays at 0 errors (both measured, edits reverted) | Keep (design T-57) |

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-01 | Command | `pnpm -C autobyteus-web typecheck` | Gate state | PASS; Nuxt 271 + Electron 27 test errors = 298 in 139 files; 0 production | T-02, T-03 |
| 2026-11-01 | Command | `tsc -p <scratch config extending tsconfig.json with the build options, include src+tests, rootDir ..>` with the harness import swapped temporarily (reverted with `git checkout`) | Find every stale API call in server tests | 1,316 errors in 380 files (tests/unit 838, integration 299, e2e 98, app-data-migrations 49, fixtures 12, test-support 8, architecture 5, agent-work-journal 3, helpers 3, autobyteus-ts 1); `src` 0. SD-01 | T-07, T-16, T-41..T-44, REQ-010 |
| 2026-11-01 | Command | same with `tsconfig.json` options unchanged | Compare | 14,247 errors, mostly TS4111 (`noPropertyAccessFromIndexSignature`), 4,957 in `src` — `tsconfig.json` is not the build policy | Use the build policy |
| 2026-11-01 | Command | `vue-tsc -p <scratch: web tsconfig, include nuxt.d.ts + types/**/*.d.ts + the 3 tests, noImplicitOverride false, decorators>` | A home for the three tests | 4 errors (SD-02); 272 with the plain web options | T-01 |
| 2026-11-01 | Command | `env -i … vitest run` of org-owned-team-local-agent, project-task-index-status, team-member-run-view-projection import, run-file-change-service, native-compaction-terminal-drain, terminal-websocket-lifecycle, scoped-org-history-graphql, file-system-watcher, workspace-run-history-graphql, raw-trace-manifest-runtime-names-startup | Current state | Fails: org-owned (2), scoped-org (1), terminal (1, unresolved HOME); rest pass | T-11, T-12, T-17 |
| 2026-11-01 | Command | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs vitest run task-copy-idle-lifetime task-reactivation-root-visibility` with run-owned `TMPDIR` | Timing items | 7 passed, 1 skipped (live Claude); no TMPDIR residue; load 7.9/16.2/19.0 | T-28, T-52, T-27 |
| 2026-11-01 | Command | `RUN_CONTEXT_FILE_PROCESS_E2E=1 vitest run context-file-storage-runtime` | 148 (6) | 2 of 6 fail | T-46 |
| 2026-11-01 | Command | `vitest run tests/architecture` | 237 | 8 files, 55 tests pass | T-24 |
| 2026-11-01 | Command | `autobyteus-ts`: `read-file-media-continuation-flow`, `agent-loop-event-sequence` | 112, 116 | 2 files, 13 tests pass | T-37, T-40 |
| 2026-11-01 | Code | `git show --stat 47f44c3df6` | Why T-12 changed | SR-004: undeclared settings left out, not refused | T-12 |
| 2026-11-01 | Code | `.github/workflows/*.yml` | Where type checks run | No workflow runs a type check; the web gate runs inside `build:electron*`; server `typecheck` is local | REQ-010 |
| 2026-11-01 | Code | `autobyteus-server-ts/tsconfig.claude-interrupt-resume-e2e.json`, `package.json` L15 | Existing test type-check pattern | A one-off config type-checks one e2e file under the build policy | Design |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- | --- |
| Server test type check (build policy) | Stale APIs in tests | 1,316 errors; the stale removed-API class (TS2339/TS2551/TS2554 on real classes) appears in 20+ gated suites | Measured | REQ-010 (a check that stops growth) | `evidence/SD-01-server-tests-typecheck-build-policy.txt` |
| Web cross-package project | Home for three tests | 4 errors, all real (stale field, fixture type) or a flag mismatch | Measured | REQ-001 | `evidence/SD-02-web-cross-package-project.txt` |
| Fresh worktree install | Electron binary | `node_modules/electron/dist` absent after install | Measured | REQ-005 | this note |
| Terminal e2e | Unresolved vs resolved HOME | Fails vs 3/3 pass | Reproduced | T-17 dropped | this note |

- Temporary diagnostics: the harness import was swapped for the type-check measurement and reverted (`git checkout -- tests/e2e/helpers/claude-live-agent-harness.ts`); scratch configs `autobyteus-server-ts/tsconfig.scratch-318.json` and `autobyteus-web/tsconfig.scratch-318.json` were deleted (one was left by an interrupted run and removed). `git status` shows only untracked build outputs.
- Reproduction for implementation to start from: the commands in the Source Log; T-11 `vitest run tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts`; T-12 `vitest run tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts`; T-46 with `RUN_CONTEXT_FILE_PROCESS_E2E=1`.

## Live Suites That Spend Credits Or Plan Quota (listed, not run)

These would prove the repaired gated suites against real providers or signed-in CLIs. None ran; each needs the user's approval.

| Suite | Gate | Spends | Items |
| --- | --- | --- | --- |
| `tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` (Claude scenario) | `RUN_REAL_E2E=1` + test vault | Anthropic API credits | T-07 |
| `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | `RUN_CLAUDE_E2E=1` | Claude plan | T-48 |
| The 8 files using `claude-live-agent-harness.ts` | `RUN_CLAUDE_E2E=1` | Claude plan | T-10 (loading is proven without the gate) |
| `tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | `RUN_CLAUDE_E2E=1` | Claude plan | T-45 |
| `codex-agent-run-backend-factory`, `codex-thread-manager`, `codex-thread`, `services/codex-model-catalog` integration | `RUN_CODEX_E2E=1` | Codex plan | T-41, T-42 |
| `tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | `RUN_CODEX_E2E=1` | Codex plan | T-44 |
| `tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts` | `RUN_CODEX_E2E=1` | Codex plan; live compaction (not required proof, TESTING.md L185-192) | T-16 |

## Structural And Payload Surface Inventory

- Payload surfaces: `autobyteus-web/typecheck-baseline.json`; a new server test baseline (design); test fixtures; `.env*` files and README lines of the transcription URL.
- Structural surfaces: `autobyteus-web/scripts/typecheck.mjs` and `scripts/lib/typecheckGate.mjs` (the gate); `autobyteus-web/nuxt.config.ts` `typescript.tsConfig.exclude`; `autobyteus-server-ts/package.json` `typecheck`; `autobyteus-web/electron/vitest.config.ts`; web/Electron server-URL config (`serverUrls`, `urls.transcription`).
- Potential structural impacts: no API, persistence, security or migration change. Lockfile changes (removing `@nuxtjs/apollo`).

## Persisted Data And State Facts

- None affected. The transcription URL is runtime config, not stored data.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-01-server-tests-typecheck-build-policy.txt` | Solution Designer | Server test type errors under the build policy, base `efd28d5c4a` | Evidence | REQ-010, T-07, T-16, T-41..T-44 | Final | Evidence only |
| `evidence/SD-02-web-cross-package-project.txt` | Solution Designer | The three tests in their own project | Evidence | REQ-001 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-01 | Unknown | Why file-watcher events exceed 8 s under the full integration suite (T-09) | Fix must follow the cause | Implementation measures with the watcher timing log (REQ-011) | Open |
| U-02 | Unknown | The second context-file-storage failure (T-46) | Could be a stale test or a product change | Implementation finds the cause; a product defect becomes a follow-up | Open |
| U-03 | Unknown | Whether the four web probes still fail (T-33..T-36) | Weeks old | Implementation runs them first (REQ-012) | Open |
| R-01 | Risk | Parallel teams (357 dead code, 358 large runs, …) edit the same test files | Merge conflicts | Merge `origin/personal` before validation; conflicts resolved by implementation/delivery | Open |
| R-02 | Risk | The web baseline is per-file counts; other branches merging test changes can shift counts | Gate fails after merge | Re-run `typecheck` and shrink/repair after each merge (TESTING.md rerun rule 5) | Open |

## Requirement Implications

- Most items are stale tests whose product changed on purpose (T-11, T-12, T-16, T-41..T-46): fix the tests to current APIs, keep what they prove.
- The recurring class (renamed API silently breaks gated suites, 1,316 server test type errors) needs a check that stops it growing (REQ-010), as autobyteus-225 asked.
- Timing items split by cause: load-independent weaknesses are fixed (T-28 sig. 2, T-30, T-37, T-47, T-53); failures seen only at load averages of ~186 are explained by host overload, which TESTING.md's "One heavy run at a time" rule now forbids (DEC-006).

## Notes For Architecture Design

- Reuse the web gate's attribution/baseline logic for the server rather than writing a second one (design decides the location).
- The server's existing `tsconfig.claude-interrupt-resume-e2e.json` is a one-off of the same idea; a general test check makes it redundant.
- The three web tests' project must use the server build's options where the two packages' flags differ (`noImplicitOverride`, `verbatimModuleSyntax`, decorators).
