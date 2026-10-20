# Implementation Handoff — runtime-lifecycle-review (Settings → Agent Runtimes)

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review/tickets/in-progress/runtime-lifecycle-review/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review`, branch `codex/runtime-lifecycle-design-review`, code at `52aa663edd` (IR-002 fix `52aa663edd`; IR-001 server `ef5308178d`, web `8a2db203dc`) on base `origin/personal` `aac5da3112`. The branch was fast-forwarded from the design base `dc530fdcb0` before coding; the 8 upstream commits touched only ticket docs and two e2e test files.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High). ARCH-REV-002 Pass (SR-010); ARCH-REV-003 Pass (SR-011 delta). Handoff rule for Large/High → `/software_engineering_team/code_reviewer`.
- Requirements doc: `requirements-doc.md` (Approved, SR-010; "UI note (SR-010)").
- Investigation notes: `investigation-notes.md` (E-R01…E-R22, E-A01…E-A10).
- Solution revision record: `solution-revision-record.md` (SR-001…SR-011).
- Design spec: `design-spec.md` (SR-011).
- Supplemental task artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md` (Approved, a74ecd4) with VIS-001…VIS-023 (VIS-010/011/012/021/023 no longer apply); `follow-ups.md`.
- Design review report: `design-review-report.md` (ARCH-REV-003 is the latest round).
- Architecture review revision record: `architecture-review-revision-record.md`.
- Triggering rework report: N/A (initial).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, Local Fix for CRR-001; see `implementation-revision-record.md`)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-010, SR-011, SR-012
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: CRR-001
- Related API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: CR-001, CR-002 (CR-003 settled by SR-012, no code change)

Server: a new capability `runtime-management/agent-runtimes/`. `AgentRuntimeStatusService` holds the four rows. It checks each runtime on its own: installed version through the existing resolver plus a fresh `--version`, the newest version from the vendor's source, and the sign-in state through `AgentRuntimeSignInReader`. It runs at most one update or sign-in process per runtime (`RuntimeProcessOperation`), refuses Update while that runtime's agents run, and stops its processes on server close. `AgentRuntimeSignInReader` is now the one owner of sign-in reads. The application launch-readiness adapter delegates Codex/Claude to it, built in `create-application-orchestration-services.ts`, so both composition roots use it. SR-011: the application platform exposes `hostManagement.activeAgentRuns.countByRuntimeKind`, and the studio composition adds it to the process `AgentRunManager` count. GraphQL: `agentRuntimes`, `checkAgentRuntimes`, `updateAgentRuntime`, `startAgentRuntimeSignIn`, `cancelAgentRuntimeSignIn`, studio server only.

Web: Settings → **Agent Runtimes** after API Keys (`section=agent-runtimes`). `AgentRuntimesManager.vue` holds the card, header, node line, Check again, loading, error, remote note and live region. `AgentRuntimeRow.vue` holds one row with its update and sign-in outcomes. `useAgentRuntimes` follows the Embedding pattern: a check on open, then one read-only query polled every 2 s while busy and every 10 s when idle, reset when the node binding changes. Copy is in en and zh-CN.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"; SR-011 keeps Large/High.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the implementation adds a GraphQL contract, starts vendor processes from the server, fetches vendor sources, moves sign-in detection used by application launch readiness in both roots, and adds an application-platform read. That is about 30 source files across server runtime-management, application-platform, GraphQL, compositions and web Settings.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: one raised and resolved during implementation. Application agents were not in the count, so I asked the Solution Designer; that became SR-011, which passed ARCH-REV-003. No escalation trigger fired: the resolvers, `Terminal.vue`, the model menu and the execution backends are unchanged. `codex login` opening the browser from a piped process is still unverified on a real install (see Known Risks).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001/005, AC-001/006) | Four rows with installed state, version, sign-in state | `AgentRuntimesManager.vue` `onMounted → useAgentRuntimes.check()` → `checkAgentRuntimes` → `AgentRuntimeStatusService.checkAll()` → `check(row)`: `strategy.resolveExecutable()` (existing resolvers unchanged) → `readRuntimeVersion()` (fresh `--version`) → `signInReader.read(kind, {cwd: os.homedir()})` → `list()` → `agentRuntimes` | Done. `checkAll` returns once the installed versions are read, so the first render already knows them (spec: skeleton, then "installed versions known at once"). Newest-version and sign-in reads finish per row afterwards |
| BEH-002 (REQ-002, AC-002) | Independent update check from each vendor's source; failure keeps the version | strategies' `readLatestVersion`: Codex GitHub `releases/latest` (`rust-v` stripped), Claude `downloads.claude.ai/claude-code-releases/<autoUpdatesChannel>` (`CLAUDE_CONFIG_DIR` or `~/.claude`, default `latest`), Grok `grok update --check --json`, Antigravity manifest `<os>_<arch>.json`; `fetchRuntimeSource` 10 s time-out | Done. Each row runs its own promise and writes only while its check generation is current. A failure marks only `checkFailed`. A row that is checking or has a running operation is skipped by a user check |
| BEH-003 (REQ-003, AC-003/004) | Vendor update with progress, result and re-check; blocked while agents run | `startUpdate` → `RuntimeProcessOperation([exe, "update"])` → `list()` puts the latest output line into `step` → on exit a fresh `--version`; exit 0 with a newer version gives `succeeded` plus an automatic re-check that keeps it (AR-006); anything else gives `failed` with the ANSI-stripped 4 KB output. Agent rule: `countRunningAgents` = process `AgentRunManager` + `hostManagement.activeAgentRuns.countByRuntimeKind` (SR-011) | Done. A Homebrew-style "exit 0, same version" counts as failed with the vendor's text |
| BEH-004 (REQ-004, AC-005) | Not installed + official link + restart hint, no install action | strategy `installInstructionsUrl` (DEC-004); `AgentRuntimeRow.vue` link + `settings.agentRuntimes.restartHint` ("After installing, restart AutoByteus." / "安装后请重启 AutoByteus。") | Done (SR-010 UI note) |
| BEH-005 (REQ-005/006/008, AC-006/007/009/011) | Sign-in state per runtime; Sign in for Codex and Grok; command-line hint for Claude and Antigravity; no secrets | Reader per strategy: Codex `account/read` (rule `account != null` → signedIn; else `requiresOpenaiAuth !== true` → notRequired; else signedOut); Claude `auth status --json`, JSON read whatever the exit code (signed out = `{"loggedIn": false}` + exit 1, IR-002/CR-001), plain-text "logged in" fallback only at exit 0, `describeFailure` text; Grok `grok models` ("You are not authenticated."); Antigravity `listAntigravityModels` classification. `startSignIn` → `[codex, "login"]` / `[grok, "login", "--oauth"]` with a 10-minute time-out → on exit reads the account: signedIn clears the operation, otherwise `didNotFinish`. Cancel → SIGTERM, then SIGKILL after 3 s | Done. Sign-in output is never kept, returned or logged. GraphQL carries no `detail`. Adapter mapping keeps today's rules and texts (see Known Risks for the Claude time-out text) |
| BEH-006 (REQ-007, AC-010) | Remote node window: status only | `isOwnNode = windowNodeContextStore.isEmbeddedWindow`; the row renders no actions, sign-in hint or blocked line when remote; the manager shows the remote note | Done (UI-only gate per E-R10) |
| Preserved | Runtime lookup, execution, model menu, `RuntimeAvailabilityService`, Antigravity/Grok application readiness ("unsupported") | not touched | Confirmed by `git diff --name-only aac5da3112..HEAD`: no source change under `src/agent-execution/`, `runtime-availability-service.ts`, the four resolver files or `Terminal.vue`. The only test touched there is `grok-build-runtime-registration.test.ts`, which now passes the adapter its new `signInReader` argument |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):
- NEW `runtime-management/agent-runtimes/agent-runtime-status-service.ts`: the service, `AgentRuntimeError`, and the configure/get accessor.
- NEW `agent-runtime-sign-in-reader.ts` (`SignInReading`, reader), `agent-runtime-strategy.ts` (contract), `agent-runtime-types.ts`, `runtime-process-operation.ts`, `runtime-command-runner.ts`, `runtime-version.ts`, `runtime-source-fetch.ts`.
- NEW `strategies/{codex,claude,antigravity,grok}-agent-runtime-strategy.ts` and `strategies/create-agent-runtime-strategies.ts`.
- NEW `api/graphql/types/agent-runtimes.ts`; MODIFY `api/graphql/schema.ts`.
- NEW `compositions/agent-runtime-status-composition.ts`; MODIFY `compositions/build-studio-server.ts` (compose after the API services; close first in `closeStudioProcessResources`).
- MODIFY `application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts`: Codex/Claude through `signInReader`; local `runCommand`, `describeFailure`, `commandRunner` and the `codexClientManager` dependency removed.
- MODIFY `application-platform/runtime/create-application-orchestration-services.ts`: builds the reader.
- MODIFY `application-platform/execution/application-execution-scope-kernel-builder.ts` (`activeAgentRuns` narrow reader, AR-008), `application-execution-scope.ts` (`countActiveAgentRuns`), `runtime/application-platform-runtime-contracts.ts` (`activeAgentRuns`), `runtime/build-application-platform-runtime.ts` (binding).

Web (`autobyteus-web/`): NEW `components/settings/agent-runtimes/{AgentRuntimesManager.vue, AgentRuntimeRow.vue, agentRuntimesPresentation.ts}`, `composables/settings/useAgentRuntimes.ts`, `graphql/queries/agentRuntimesQueries.ts`, `graphql/mutations/agentRuntimesMutations.ts`, `types/agentRuntimes.ts`, `localization/messages/{en,zh-CN}/agentRuntimesSettings.ts`; MODIFY `pages/settings.vue` and `localization/messages/{en,zh-CN}/{index,settings}.ts`.

Tests: NEW `tests/unit/runtime-management/agent-runtimes/{agent-runtime-strategies,agent-runtime-status-service,runtime-process-operation}.test.ts`, `tests/unit/api/graphql/agent-runtimes-resolver.test.ts`, web `components/settings/agent-runtimes/__tests__/AgentRuntimesManager.spec.ts`; MODIFY the adapter test (fake reader, mapping cases), `application-platform-lifecycle.test.ts`, `grok-build-runtime-registration.test.ts`, `application-execution-scope.test.ts` (count case).

Placement differences from the design's file map, made for size and ownership; no new owner:
- The copy lives in its own catalog `agentRuntimesSettings.ts`, beside `embeddingSettings.ts`, not in `settings.ts` (already 429 lines). Only the menu label is in `settings.ts`.
- Studio wiring lives in `compositions/agent-runtime-status-composition.ts`, like the existing `*-composition.ts` files, so `build-studio-server.ts` grows by only 14 lines.
- `runtime-source-fetch.ts` and `strategies/create-agent-runtime-strategies.ts` are small helpers the design's table implied ("Latest-version HTTP fetch"; "built from the strategies").

## Important Assumptions

- UI interpretations where the approved spec and its prototype disagree, or the spec is silent:
  1. **Table vs stacked switch** (settled: SR-012 keeps the container-width switch). The spec says the table applies at ≥ 640 px viewport. Beside the Settings menu, that leaves the fixed 46rem grid too little room between roughly 640 px and 1100 px windows: the Updates column collapsed and overlapped Account (seen at 739 px, evidence IMP-10a). The row now switches on the list's own width (`@container agent-runtimes (min-width: 58rem)`, the repo's local pattern in `ProjectTaskBoard.vue`). The grid values, copy and styling are unchanged. The table appears at the spec's 1440 px and 1280 px windows; narrower content stacks as VIS-022. This keeps the spec's "no horizontal overflow" rule. Please confirm, or route to Product if the 640 px viewport rule must stay literal.
  2. **Desktop cell labels.** They are screen-reader-only on the table layout, as the spec's accessibility section says. The prototype hid them from assistive tech with `sm:hidden`.
  3. **Remote node.** No sign-in hint, following the UXJ-010 text ("no Update, no Sign in, no sign-in hint"). The prototype code showed the hint on remote; VIS-019 shows no signed-out row.
  4. **First sign-in read still running.** The Account cell shows a small spinner and "Checking…" (existing `checking` copy). The prototype resolved instantly, so the spec has no copy for this state. Re-checks keep the previous reading instead.
  5. **Update progress.** It shows the vendor's latest output line (design DS-002), not the prototype's four illustrative steps, which the spec marks illustrative. Before the first line it shows the command only.
  6. **Sign in during an update.** Sign in is disabled while that runtime updates, since the server allows one operation per runtime.
  7. **Account "–" for DEC-008.** Codex `notRequired` maps to `NOT_APPLICABLE` and shows "–" with no button, as for a missing runtime.
- `checkAgentRuntimes` returns after the installed-version reads, each at most 10 s and running in parallel. Newest versions and sign-in states arrive per row afterwards.
- The sign-in read on the page uses the home folder as cwd (design). Application readiness keeps the workspace root for Codex and the server's cwd for Claude, which Claude ignores.

## Known Risks

- **Claude time-out reason text (application readiness).** The shared runner times out after 10 s with "Command timed out after 10000ms.", where the old adapter used 5 s and "Credential readiness command timed out after 5000ms.". Only that case's reason text and time differ; every other rule and text is unchanged (adapter tests).
- **AR-008 coverage.** The unit test proves the wiring: Application Team members' `FlatTeamExecutionFactory` uses the same `AgentRunManager` the scope counts, and the count is per kind. It does not run a live Application team. A real Application team run with a scripted runtime (TESTING.md `agy-failure-cli.mjs`) is left to API/E2E.
- `codex login` opening the browser from a piped, non-terminal process is unverified on the current Codex version. It is the design's escalation trigger, to be checked on the user's machine with his consent. If the browser doesn't open, the row times out to "Sign-in didn't finish. Try again." after 10 minutes. Grok's signed-in `grok models` output is also unverified; any exit 0 without the signed-out phrase counts as signed in.
- Vendor sources: the Claude download host and the Antigravity manifest are undocumented (R-02), and GitHub allows 60 unauthenticated requests per hour. Each failure shows Check failed for that row only. All three answered on 2026-10-20 (IMP-10).
- Remote/own-node gating is UI-only, as E-R10 accepts.
- Web code has no type check: `autobyteus-web` has no typecheck script and no `vue-tsc`. Vitest compiles TS without type checking.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: Duplicated Policy Or Coordination (Codex/Claude sign-in detection)
- Reviewed refactor decision: `Refactor Needed Now` (bounded: detection moves to the reader)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes` for the running-agent count only, which became SR-011 and passed ARCH-REV-003. The refactor decision itself was not challenged.
- Evidence / notes: the adapter now depends on `AgentRuntimeSignInReader` and `LlmProviderService` only. No caller reaches a strategy or `RuntimeProcessOperation` except through the service or reader. `agent-runtimes/` imports neither run manager; the studio composition supplies the count port.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. The adapter's `runCommand`, `CommandResult`, `describeFailure`, `commandRunner` option, `readCodexReadiness` and `readClaudeReadiness` are gone, and so is its now-unused `codexClientManager` dependency. In the web composable I dropped an `actionError` state I had drafted, because nothing displayed it. Callers updated: three tests.
- Dead code found elsewhere, added to `follow-ups.md`: None. FU-005 is a failing guard, not dead code.
- Shared structures remain tight: `Yes`. `AgentRuntimeOperation` is a discriminated union per kind and state; `SignInReading` keeps `detail` server-side; the GraphQL operation type is flat with nullable fields, as the design specified.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. The largest changed files are `pages/settings.vue` (433 effective lines, +17), the `settings.ts` catalogs (429, +1), `build-studio-server.ts` (385, +14) and `agent-runtime-status-service.ts` (286). No file crosses 500, and no change delta exceeds 220.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec "Persisted Data / State Transition Decision").
- Implementation follows it: `Yes`. All new state is in server memory. The only file read besides vendor commands is Claude's `settings.json`, and only for `autoUpdatesChannel`.
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` and `pnpm -C autobyteus-web exec nuxt prepare` were run in the worktree. No dependency or lockfile change.
- The untracked `autobyteus-application-{sdk-contracts,backend-sdk}/dist/` folders are build outputs from `prepare:shared` and are not committed (TESTING.md).
- The rendered check used `pnpm dev`, whose state lives in `<worktree>/.autobyteus/development/` (worktree-owned), with fake runtimes in `/tmp/rlr-fakes`. Both stack processes are stopped (`pgrep` empty; the server logged "Server closed cleanly").

## Checks Run

Evidence: `tickets/in-progress/runtime-lifecycle-review/evidence/`. IMP-01…07 ran on `8a2db203dc`. Rerun plan for IR-002 (`git diff --name-only 8a2db203dc 52aa663edd`: Claude strategy, status service, and their two tests):
- IMP-01 and the affected parts of IMP-04 → rerun as IMP-12.
- IMP-05, IMP-06 and IMP-07 → still valid; no architecture, web or shared file changed.
- IMP-10 → still valid for the UI. The changed Claude reading now reaches the existing "Not signed in" + hint rendering (IMP-07); its real-vendor input is IMP-11.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` (the `typecheck` script's command; its `prepare:shared` hook ran earlier the same day) | 8a2db203dc | macOS arm64, node per header | all server `src` | all | Pass | `IMP-01-server-typecheck.log` | `EXIT 0` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` (whole `tests/unit`, including the new agent-runtimes, resolver/composition, adapter, scope-count and lifecycle tests) | 8a2db203dc | macOS arm64, unit isolation | server | BEH-001…006, AC-002…007, 009, 011 (unit level) | Pass | `IMP-04-server-unit-excerpt.log` (full: `IMP-04-server-unit-full.log`, 1.3 MB) | `Test Files  756 passed \| 4 skipped (760)`, `Tests  6252 passed \| 7 skipped (6259)`, `EXIT 0`; new files: strategies 22, status service 15, process operation 6, resolver/composition 2; adapter 14; scope 9 |
| IMP-05 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture --no-watch` | 8a2db203dc | macOS arm64 | server boundaries (AFB guards, orchestration call shapes) | — | Pass except 1 baseline case | `IMP-05-server-architecture.log` | `Tests  1 failed \| 43 passed (44)`; the failure is "guards the exact SR-011 host definition and public/general run authority", which lists `agent-memory-explorer-service.ts`, from upstream `3e3a7b08cc`, not this change (FU-005) |
| IMP-06 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | 8a2db203dc | macOS arm64 | web | REQ-001 copy | Pass | `IMP-06-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-07 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run components/settings pages/__tests__/settings.spec.ts localization` | 8a2db203dc | macOS arm64, Nuxt test env | new section + all Settings components, settings page, catalogs | AC-001…007, 009, 010 (component level) | Pass | `IMP-07-web-settings-specs.log` | `Test Files  60 passed (60)`, `Tests  303 passed (303)` |
| IMP-11 | Real Claude 2.1.302 through the strategy in an empty temporary HOME (temporary uncommitted vitest file; no account) | 52aa663edd code | macOS arm64 | `claude-agent-runtime-strategy.ts` `readSignIn` | AC-006, AC-009 (CR-001) | Pass | `IMP-11-claude-real-signed-out-probe.log` | `RAW exitCode=1`; `READING {"state":"signedOut","detail":""}` |
| IMP-12 | `tsc -p tsconfig.build.json --noEmit`; `vitest run tests/unit/runtime-management/agent-runtimes tests/unit/api/graphql/agent-runtimes-resolver.test.ts tests/unit/application-platform tests/unit/agent-execution/backends/grok/grok-build-runtime-registration.test.ts` | 52aa663edd | macOS arm64, unit isolation | Claude strategy, status service, readiness adapter, scope, resolver | CR-001, CR-002, AC-004/006/009 | Pass | `IMP-12-server-delta-recheck.log` | `TSC EXIT 0`; `Test Files  17 passed (17)`, `Tests  149 passed (149)`; strategies 24, status service 16 |
| IMP-10 | Rendered check: `pnpm dev` with fake runtime CLIs (`CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND` → `/tmp/rlr-fakes/bin/*`), browser tab on `/settings?section=agent-runtimes`; GraphQL via `curl` | working tree = IR-001 code before the "Sign in disabled while updating" polish (covered by IMP-07) | macOS arm64, Chromium tab 739 px (+ zoom 0.5 for the table) | full stack: GraphQL → service → strategies/reader → processes → UI | AC-001, 002, 003, 005, 006, 007, 009, 011 (self-check) | Pass after one layout fix | `IMP-10-rendered-check.md`, `IMP-10a…h-*.png`, `IMP-10i-signin-running-api.json` | `FAKE-SECRET` count 0 in API, server logs and dev stdout; "Updated from 0.150.0 to 0.163.0."; "Codex is signed in." |

- Not run, and why: web type check (no tool in the package); server integration and E2E suites (`test:integration`, `pnpm test:e2e`), which belong to API/E2E with the GraphQL e2e named in the design; a live Application team run for the count (AR-008, API/E2E); real update and sign-in on real runtimes (user's machine with his consent at delivery); isolated desktop instance and the remote-node window (component-tested only, IMP-07).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings menu item; Agent Runtimes card. UXJ-001…008 and UXJ-010; UXJ-009 is removed by SR-010.
- Approved references: `ui-ux-spec.md` (a74ecd4), VIS-001/003/004/005/006/008/014/019/020/022, requirements "UI note (SR-010)".
- Design system and adjacent surfaces reviewed: Embedding panel and composable, Settings page shell and menu, the prototype `AiRuntimesManager.vue` and its catalogs in the design repo.
- Surface used: `pnpm dev` (README "Local full-stack development"), headless Chromium tab.
- States inspected: default mixed table (en, zh-CN); not installed with restart hint; command-line hint; updating with the live step line; updated and re-checked; update failed with Try again; signing in with Cancel; cancel; completed sign-in with live-region announcement; Check again clearing an old failure; stacked layout at 739 px.
- Issues found and corrected: (1) the table overlapped beside the Settings menu at 739 px, fixed with a container-width switch (Assumption 1, IMP-10a → IMP-10b); (2) Vue's whitespace condensing dropped the spaces in the screen-reader texts ("Version1.4.3", "Install instructions(opens in your browser)"), fixed; (3) Sign in stayed clickable during an update although the server refuses it, now disabled.
- Not exercised in the rendered check: loading skeleton, load error with Retry, blocked by agents, did-not-finish, remote node, and focus rings. These are covered by IMP-07 component tests except focus rings, which use the prototype's classes and were not visually inspected. A 390 px viewport could not be set in this tab; the stacked layout was inspected at 739 px.

## Downstream Coverage Hints / Suggested Scenarios

- GraphQL e2e on a test-owned server with fake runtime CLIs through the four command overrides. The Codex fake must answer app-server `initialize` and `account/read` over stdio; `/tmp/rlr-fakes/fake-runtime.js` from IMP-10 is a working pattern. Cases: independent checks with one source stubbed to fail; update success, exit 0 with an unchanged version, and failure; sign-in success, cancel, and time-out with a shortened timeout if exposed; secrets absent from responses and logs (AC-011).
- AC-004 with real agent counts: a standalone agent and an Application Team member on the same runtime, using the scripted AGY CLI (`RUN_AGY_FAILURE_E2E`, `agy-failure-cli.mjs`) for the Antigravity runtime. Update must be refused (`AGENT_RUNTIME_AGENTS_RUNNING`) and the row must show the count.
- Application launch readiness: Codex and Claude readiness reasons unchanged through the reader.
- Browser probe for the section, including a narrow and a wide viewport (container switch), zh-CN, and the remote-node window.
- At delivery, with the user's consent: one real update and one real Codex or Grok sign-in on his Mac. Confirm `codex login` opens the browser from AutoByteus, and check Grok's signed-in output.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All API/E2E coverage and sign-off belong to the API/E2E engineer: GraphQL e2e, browser probe, isolated desktop instance, the remote node, live Application team agents, and AC-001…AC-011 verification. The checks above are implementation self-checks only.
