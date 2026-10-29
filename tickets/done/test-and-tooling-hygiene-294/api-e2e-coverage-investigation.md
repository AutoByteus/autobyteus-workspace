# API/E2E Coverage Investigation — test-and-tooling-hygiene-294 (autobyteus-294)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-005, approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-005)
- Design Spec (required on every route): `design-spec.md` (SR-005; § Group C table governs)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001..FU-010); `evidence/` (SD-*, IMP-*)
- Design Review Report: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, round 2, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 3
- Trigger: round 1, code review pass CRR-002 (2026-10-27); round 2, code review pass CRR-004 of the IR-003 packaging fix (`75e9f323f0`), after Desktop Release `40640209395` (v1.5.9-beta.14) failed in all five build jobs (DR-001), 2026-10-28
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file, round 3 (§ Round 3 below; rounds 1-2 unchanged)

All paths are in the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294/tickets/in-progress/test-and-tooling-hygiene-294/`. Code under test: branch `codex/test-and-tooling-hygiene-294`, code commit `256cee925e` (HEAD `54ed02d56d` adds ticket documents only), base `origin/personal` `2f48d85d4d`.

## Current Requirement And Design Basis

A hygiene ticket: the checks TESTING.md names must be green and deterministic, the web gets a shrink-only type gate that the desktop build runs, listed dead code goes, and four small product bugs (BEH-032), the Agent mutation's `internal` field (BEH-002), the Fastify deprecation (BEH-018) and the invisible class icons (BEH-028) are fixed. No persistence, server API or concurrency change. The implementation ran the narrow checks (IMP-01..IMP-19); the handoff's "Not run" list is what this stage must execute: the two browser probes (AC-014, AC-028), the packaged isolation probe through `build:electron:mac` (AC-016, AC-009), the Codex and Claude gated live runs (AC-027, the cancel-queued contract), the team-run-v1 upgrade E2E (AC-018), the gateway checks and Docker build (AC-021), full server `test:integration` and `pnpm test:e2e`, the desktop pages with former class icons (AC-029) and a clean clone (AC-032). No live compaction run (DEC-025).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (a ticket role runs the TESTING.md layers), SCN-002 (Agent create/edit, icon buttons, BEH-032 screens), SCN-003 (server start).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1: a ticket role clones the branch fresh and runs the layers in TESTING.md order (install → prebuild → `nuxt prepare` → suites); before `test:integration:prepare`, a Brief Studio E2E file fails loudly (the real clean-clone path of AC-024).
  - SCN-A2: a release build on macOS (`build:electron:mac`) runs the new type gate before packaging.
  - SCN-A3: the user opens the packaged desktop app (worktree build, isolated instance) and uses Settings → MCP Servers (Add Server, Add Argument, Bulk Import) and an agent detail page; icons render.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): SCN-005 (hand-edited released-shape saved tree restored at runtime).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001, 005 architecture + Work Journal in `test:unit` | Changed | handoff trace; IMP-02 | full `test:unit` on a clean clone |
| BEH-002 Agent mutation `internal` | Changed | IMP-03, IMP-16 | spec in `test:nuxt`; real mutation path exercised by probes that edit agents is incidental only |
| BEH-003, 009, 010, 011, 016, 022, 023, 026 test repairs | Changed | IMP-09..IMP-14, IMP-18 | rerun the E2E files (server source changed after several IMP runs) and the full `pnpm test:e2e`; gated ones with their gates |
| BEH-004 live harness native command scope | Changed | IMP-02 | `test:unit` (secret-management); no live run |
| BEH-006, 020, 024, 025 removals | Removed | `git grep` | grep checks + typecheck/unit/gateway build/test + Docker build |
| BEH-007 web type gate | Added | IMP-05, IMP-06 | `typecheck` on a clean clone; gate inside `build:electron:mac` |
| BEH-012 Agent Runtimes probe | Changed | SD-14 | run the probe on macOS |
| BEH-014 packaged launch | Preserved | — | run `test:e2e:electron:isolation` |
| BEH-018 Fastify | Changed | IMP-12 | built-server start; backend logs of the probes |
| BEH-019 sanitisation | Added | IMP-17 | spec in `test:nuxt` |
| BEH-027 PT-E2E-013 offline | Changed | handoff (not run) | run the projects probe, read `meaningSearch.state` and `<node>-outside-network.log` |
| BEH-028 icons | Changed | IMP-13 (Nuxt dev in Chrome) | desktop app (isolated instance of the worktree package) |
| BEH-030, 031 docs | Changed | read | read |
| BEH-032 four bug fixes | Changed | IMP-08 | specs in `test:nuxt` |
| CR-001 Apollo binding | Changed | IMP-19 | every probe and the desktop app run the real plugin binding |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes (small) | Fastify options, Claude spawn env, removed tools | server unit/integration, typecheck | gated real Claude/Codex paths | gated live runs (small input) |
| API / transport / contract | Yes | Agent mutation fragment; GraphQL used by probes | spec with the real Apollo cache | real server response through the real client | browser probes |
| Frontend component / state | Yes | ~45 production web files (type fixes), BEH-032, icons, Apollo binding | `test:nuxt` | rendered app | probes, desktop instance |
| Browser integration / user journey | Yes | Agent Runtimes settings, Projects board | probes are the layer | — | Browser probe |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | icons, Apollo binding in the packaged renderer | IMP-13 (Nuxt dev) | the packaged (generated) renderer | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes (build chain) | `build:electron:mac` runs `typecheck` | IMP-07 guards | the real build chain | packaged isolation probe |
| Process / lifecycle | Yes (test harness) | live harness scope, packaged launch | unit | packaged launch | packaged isolation probe |
| Persisted-data transition | No (`Not Affected`) | — | team-run-v1 upgrade E2E stays green | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Codex app server lease API; Claude CLI cancel-queued; GitHub head reads stubbed; outside network refused | gated tests | real CLIs | gated live runs |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-294`
- Project type and runtime stack: pnpm workspace; Node 22.23.1, pnpm 10.28.2; Fastify/GraphQL server (`autobyteus-server-ts`), Nuxt 3.21 + Electron (`autobyteus-web`), message gateway; macOS 26.5 arm64 (10 cores).
- Project testing guideline path(s): `/TESTING.md` (worktree copy, including this ticket's four `docs(testing)` changes). No closer `TESTING*.md`.
- Conflicting, missing, or unclear project instructions: TESTING.md says rerun everything when the lockfile changes; this branch changes the lockfile, so every IMP result is treated as rerun-by-impact unless it ran on `256cee925e`-equivalent code (see Planned Cases). The machine was under heavy load at start (load average 30–60), which affects timing only; one heavy run at a time.
- Required environment variables or secrets available: `Yes` for the signed-in `codex` (0.164.0, `~/.codex/auth.json` present) and `claude` CLIs on the real HOME; no provider keys are needed elsewhere.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/TESTING.md` | testing guideline | layers and commands; clean env `env -i PATH HOME=<resolved temp> TMPDIR` for E2E; real HOME + USER/LOGNAME for signed-in CLIs; serialize builds and dev servers; probes own their stack, fresh `--output-dir`; Rule 9; rerun-by-impact; no live compaction run |
| `/AGENTS.md`, `/RELEASE.md` | repo instructions | stage paths explicitly; no `git add -A` |
| `autobyteus-web/package.json` | scripts | `typecheck`, `test:nuxt`, `test:electron`, guards, `build:electron:mac` (now with `pnpm typecheck`), `test:e2e:agent-runtimes-settings`, `test:e2e:projects`, `test:e2e:electron:isolation` |
| `autobyteus-server-ts/package.json` | scripts | `typecheck`, `test:unit`, `test:integration:prepare`, `test:integration`, `build` |
| `/package.json` | scripts | `pnpm test:e2e` = `vitest --run tests/e2e` in the server |
| `autobyteus-message-gateway/package.json`, `docker/Dockerfile` | gateway | `build`, `typecheck`, `test`; Dockerfile builds from the repo root context and copies only manifests and `src` |
| probe headers (`agent-runtimes-settings-probe.mjs`, `projects-feature-probe.mjs`, `electron-launch-profile-probe.mjs`) | probe prerequisites | current server build (or drop `--skip-server-build`); `result.json` / evidence JSON in `--output-dir`; isolation probe builds via `build:electron:mac` unless `--skip-build` |
| `docs/isolated-app-instances.md` | desktop instance | `pnpm --silent isolated-app start --from-worktree`; ports and `instanceId` from its JSON; `stop <instanceId>` |
| gated test headers (Codex routing E2E, Claude integration, DLC/SUN/multi-image) | gates | `RUN_CODEX_E2E=1` (signed-in codex, real HOME); `RUN_CLAUDE_E2E=1`; `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND=<abs agy-failure-cli.mjs>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| clean clone | `$TMPDIR/ab294-clone-*` | `git clone --branch codex/test-and-tooling-hygiene-294 <worktree> …`; `pnpm install --frozen-lockfile`; server `prebuild`; `nuxt prepare` | separate from the worktree, so its `.nuxt/` and builds never collide | install exit 0 | `rm -rf` after the run |
| server build (worktree) | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` | needed by probes | exit 0 | build output is untracked |
| probe stacks | `autobyteus-web` | the probe scripts | probe-owned ports, data roots, Nuxt dev, headless Chrome | probe logs | probe cleanup receipt |
| packaged Electron app | `autobyteus-web` | `test:e2e:electron:isolation` (builds via `build:electron:mac`) | long build | probe evidence JSON | probe cleanup; `electron-dist/` untracked |
| isolated desktop instance | repo root | `pnpm --silent isolated-app start --from-worktree` | CDP on loopback | JSON `ok: true` | `isolated-app stop <id>`; `list` empty |
| gateway Docker image | repo root | `docker build -f autobyteus-message-gateway/docker/Dockerfile -t ab294-gateway-test .` | test-owned tag | exit 0 | `docker rmi ab294-gateway-test` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| E2E data | test-owned temp server/DB per suite | clean env, temp HOME | suites clean up |
| scripted AGY CLI | `tests/fixtures/agy-failure-cli.mjs` | no provider calls | none |
| Codex sign-in | real HOME `~/.codex` (read by the CLI) | never edit `~/.codex`; the test makes a small real call | `cleanup:codex-e2e-history` is not needed unless the test leaves runs (checked after) |
| Claude sign-in | real HOME | small `haiku` calls | none |
| desktop instance data | auto-created private data root | never the user's `~/.autobyteus` | removed by `stop` |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`. The team-run-v1 production upgrade E2E (AC-018) still runs to show existing upgrade coverage is green without the removed assertion.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `server tests/architecture/*` (7 files) | boundary lists match source | REQ-001 / AC-001 | Still Valid | handoff, CRR | run in `test:unit` |
| `server tests/agent-work-journal/*` | Work Journal | REQ-005 / AC-005 | Still Valid | — | run in `test:unit` |
| `server tests/unit/secret-management/*` | live boundary unit tests | REQ-004 / AC-004 | Still Valid | — | run in `test:unit` |
| `server tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | spawn env via `vi.stubEnv` | REQ-023 / AC-025 | Still Valid | — | `test:unit` |
| `claude-sdk-client.integration.test.ts` cancel-queued | live Stop contract | REQ-023 (deviation 6) | Still Valid (moved off `env`) | diff | run gated |
| `codex-standalone-send-message-global-routing.e2e.test.ts` | routing via lease API | REQ-025 / AC-027 | Still Valid | — | run gated |
| `codex-app-server-client-manager.integration.test.ts` | manager lease | deviation 6 | Still Valid | — | run gated (optional) |
| DLC / SUN / multi-image E2E | as REQ-009..011 | AC-011..013 | Still Valid | IMP-10/11/14 | rerun gated (server source changed after) |
| archive E2E, running-agents E2E, Brief Studio ×3 | REQ-003, 021, 022 | AC-003, 023, 024 | Still Valid | IMP-18, IMP-09 | in full `pnpm test:e2e` |
| `team-run-v1-production-upgrade.e2e.test.ts` | upgrade without the removed log line | REQ-016 / AC-018 | Still Valid | diff | run single file, then in full E2E |
| `agent-runtimes-settings-probe.mjs` | ARP-01..12 | REQ-012 / AC-014 | Still Valid | SD-14 | run |
| `projects-feature-probe.mjs` | PT-E2E-001..; 013 offline | REQ-026 / AC-028 | Still Valid | — | run |
| `electron-launch-profile-probe.mjs` | packaged isolation | REQ-014 / AC-016 | Still Valid | — | run (with build) |
| web specs (BEH-002, 019, 032, typecheckGate, apollo plugin, ProviderModelBrowser) | as listed | AC-002, 020, 034, 008 | Still Valid | IMP-03/08/17/19 | `test:nuxt` |
| all other server/web/gateway tests | regression | Preserved Behavior | Still Valid | — | full suites |

## Planned Cases

Rerun by impact: the code under test is `256cee925e`. Since the IMP checks, the branch changed the lockfile, server `src` (`6fa5f443c6`) and web (`256cee925e`); per TESTING.md (lockfile is a shared foundation) the suites are rerun, once, on a clean clone (which also proves AC-032). Reused: only checks whose code has not changed since they ran and that are not cheaper to observe again inside a broader case.

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-032, AC-024 (first half) | clean clone setup | Existing Test | clone the branch to a temp dir; `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild`; `pnpm -C autobyteus-web exec nuxt prepare`; then, before `test:integration:prepare`, one Brief Studio E2E file in a clean env | the TESTING.md install order from nothing; the loud prerequisite failure where it really happens |
| API-02 | AC-006, AC-025 | server `src` types | Existing Test | clone: `pnpm -C autobyteus-server-ts typecheck` | regression gate |
| API-03 | AC-001, 004, 005, 006, 025, 026 | server unit + architecture + Work Journal | Existing Test | clone: `pnpm -C autobyteus-server-ts test:unit` | |
| API-04 | UC-001 | server integration | Existing Test | clone: `test:integration:prepare` then `test:integration` | full, not run before |
| API-05 | AC-002, 020, 034, AC-008 (gate spec), BEH-028 specs | web unit/component | Existing Test | clone: `pnpm -C autobyteus-web test:nuxt --run` | |
| API-06 | preserved | Electron main | Existing Test | clone: `pnpm -C autobyteus-web test:electron --run` | 49 tracked specs |
| API-07 | AC-007, QR-002 | web type gate | Existing Test | clone: `pnpm -C autobyteus-web typecheck` (after vitest finished) | |
| API-08 | AC-009 chain, DEC-006 | web guards | Existing Test | clone: the three guards | |
| API-09 | AC-021 | gateway | Existing Test | clone: gateway `pnpm install --frozen-lockfile` (own workspace), `build`, `typecheck`, `test`; `docker build` from the repo root with the gateway Dockerfile | |
| API-10 | AC-006, 021, 025, 026, 029 (grep half) | repository content | Temporary Probe | `git grep` / `git ls-files` checks at `256cee925e` | read-only checks, not a test |
| API-11 | AC-008 | gate fail-closed | Reused | IMP-06 | `scripts/typecheck.mjs`, `scripts/lib/typecheckGate.mjs` unchanged since `55d6c1d5b0` (`git diff --name-only`); plus API-07 shows the baseline still exact |
| API-12 | AC-019 | built server start | Reused + observed | IMP-12; plus FSTDEP/request-log grep over every probe backend log (API-14, API-15) | server `src` unchanged since `6fa5f443c6` where IMP-12 ran |
| API-13 | — | server build for probes | Existing Test | worktree: `pnpm -C autobyteus-server-ts build` | TESTING.md: probes need a current build |
| API-14 | AC-014 | Agent Runtimes settings, real stack | Existing Test | `pnpm -C autobyteus-web test:e2e:agent-runtimes-settings --skip-server-build --output-dir=<fresh>` | |
| API-15 | AC-028 | Projects board, offline backends | Existing Test | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=<fresh>` | |
| API-16 | AC-018 | upgrade E2E | Existing Test | clean env: `vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | |
| API-17 | AC-011 | DLC gated | Existing Test | clean env, `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>` per header | server `src` changed after IMP-10 |
| API-18 | AC-012 | SUN gated | Existing Test | same, per header | same |
| API-19 | AC-013 | multi-image gated | Existing Test | same, per header | same |
| API-20 | UC-002; AC-003, 023, 024 (second half) | full server E2E | Existing Test | clean env: `pnpm test:e2e` | full, not run before |
| API-20 (run 2) | same | each tracked server E2E file alone | Temporary Probe | `/tmp/ab294-scripts/run-e2e-per-file.mjs`: `pnpm exec vitest run <file>` per file, clean env, 900 s deadline per file, one summary line per file | Added after run 1: the full `pnpm test:e2e` (sequential files) hung silently in one file and was stopped at the 2 h tool limit after 62/207 files; the per-file run names a hanging file and runs the rest. Same tests and command as the suite, file by file; not durable because it is a diagnosis aid, not a new layer |
| API-21 | AC-027 | Codex routing, real codex | Existing Test | real HOME/USER/LOGNAME: `RUN_CODEX_E2E=1 vitest run tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | |
| API-22 | deviation 6 | Codex manager integration | Existing Test | `RUN_CODEX_E2E=1 vitest run <codex-app-server-client-manager.integration.test.ts>` | optional, gated |
| API-23 | deviation 6 / REQ-023 | Claude cancel-queued | Existing Test | `RUN_CLAUDE_E2E=1 vitest run <claude-sdk-client.integration.test.ts> -t "cancels a queued"` | small real input (TESTING.md Gates) |
| API-24 | AC-016, AC-009 | packaged build + isolation | Existing Test | `pnpm -C autobyteus-web test:e2e:electron:isolation --output-dir=<fresh>` (builds via `build:electron:mac`, log shows `pnpm typecheck`) | |
| API-25 | AC-029 | desktop app, former class icons | Journey | `pnpm --silent isolated-app start --from-worktree` on the API-24 package; over CDP open Settings → MCP Servers (Add Server, Add Argument, Bulk Import) and an agent detail page; assert an `svg` inside each former icon site; screenshots; `stop` | real packaged renderer, not Nuxt dev |
| API-26 | AC-031, AC-033 | docs | Temporary Probe | read `agent_tools_mcp_server.md` against `default-agent-tool-mcp-adapter-providers.ts`; read TESTING.md | read checks |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`).

## Durable Coverage To Add

None planned. The implementation added the durable coverage the design asks for; this stage executes it.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-04 | `autobyteus-server-ts/tests/app-data-migrations/remove-built-in-project-task-manager/remove-built-in-project-task-manager-startup.integration.test.ts` ("removes the installed copy once, …") | expected built-in list `["autobyteus-daily-assistant"]` → `["autobyteus-daily-assistant", "autobyteus-model-router"]` | Found by API-04 run 1 (added after the initial plan). Validity: `Needs Update` — the file is unchanged by this branch; its list predates `930597c730` (autobyteus-32, 2026-10-26), which made the Model Router a built-in that the bootstrap always installs. The case's intent (the Project Task Manager is not reinstalled; one PTM visible; user data preserved) is unchanged and still asserted exactly. In scope: UC-001 requires `test:integration` green and AC-032 runs it on a clean clone; TESTING.md Rule 9 baseline fix, commit `dfef14abc6`. |
| API-20 | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` (`useIsolatedWorkspaceConfig`, 4 cases) | the partial config double also answers `get()` with `undefined` | Found by API-20 run 1. Validity: `Needs Update` — unchanged by this branch; `d384968700` (autobyteus-32) made `listVisibleWorkspaces()` read the show-internal-agents setting via `appConfigProvider.config.get()`, which the double lacked ("Unable to fetch workspaces at this time."). `undefined` = no setting configured, the production default; assertions unchanged. In scope: UC-002 (server E2E green). Rule 9 baseline fix, commit `a001e645c7`. |
| API-20 | `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` (E-003, the two `agents/` folder listings) | new `INSTALLED_BUILT_IN_FOLDERS` (`autobyteus-daily-assistant`, `autobyteus-model-router`) for the folder listings; `BUILT_IN_IDS` unchanged for the catalog and `@`-candidate assertions | Found by API-20 run 2. Same cause as the API-04 integration test (`930597c730`); the Model Router is internal, so only the folder listing changes. Rule 9 baseline fix, commit `bce2f8b4e3`. |
| API-23 | `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` (shared `openLiveSession` helper, `RUN_CLAUDE_E2E`) | `client.openStreamingSession(options)` → `client.beginStreamingSession({ resolveOptions: () => options }).open()`; `session.close()` → `session.requestClose()` | Found by API-23 runs 1-2. `Needs Update`: `028cca2312` (2026-10-05, on base) changed both APIs; this ticket edited the file (deviation 6) but the helper still used the removed calls. Assertions unchanged. In scope: the file is changed by this ticket and the reviewer named its run. Rule 9 baseline fix, commit `e60f4d89a0`. The same stale call in `real-e2e-provider-capabilities.e2e.test.ts` (untouched, real-provider gate) is FU-012. |
| API-24 | `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` (E2E-PKG-004, case occupied-port; `runRawPackagedFailure`) | expected `is unavailable` → both `EADDRINUSE: address already in use` and `:<occupied port>`; the helper accepts a list of substrings | Found by API-24 run 1. Same cause as implementation commit `2fd4461897` (unit spec): `f34ad8749f` (on base) moved the listener preflight to the shared port check, which fails with the listener's own error. The new expectation names the problem and the port, so it is no weaker. In scope: AC-016. Rule 9 baseline fix, commit `6af8819ede`. |

## Durable Coverage To Remove

None planned (the removals are the implementation's, reviewed in CRR-001).

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron + generated Nuxt renderer.
- Testing guideline used: TESTING.md (packaged harness, isolated instance), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: icons, Apollo binding, BEH-032 screens (probes + specs).
- Shell-specific: the type gate inside `build:electron:mac`; packaged launch isolation (API-24).
- Chosen approach: packaged isolation probe (builds the mac package through the gated chain), then an isolated instance of that package for the icon pages (API-25).
- How the run avoids disturbing the running app: isolated profile, own data root and ports; only our instance is stopped.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order: clone suites (API-01..09) → server build (API-13) → probes (API-14, API-15) one at a time → single E2E files (API-16..19) → full E2E (API-20) → gated live (API-21..23) → packaged build + isolation (API-24) → isolated instance (API-25).
- Environment choices: E2E with `env -i PATH HOME=<resolved temp> TMPDIR`; live Codex/Claude with real HOME, USER, LOGNAME.
- Evidence: logs with headers, probe `result.json` excerpts, screenshots, DOM checks.
- Owned processes to clean: clone dir, probe stacks (self-cleaning), Docker image, isolated instance.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Agent Runtimes probe on Linux (AC-014 "and Linux when available") | no Linux host here | Low (SD-14 shows the same two fixes; Linux adds only ARP-08) | No | none |
| Live real-model compaction | DEC-025 | — | No | — |
| BEH-032 (a)/(c) phone views and (d) custom-provider loading state rendered in a running app | needs a running team on a phone layout or a provider whose model load is pending; AC-034's stated verification is the component/store specs, which enter through the real triggers (picker emit, mount) and fail on the base (IMP-08) | Low | No | none |
| The real-provider capabilities E2E's stale Claude call | untouched gated real-provider suite, needs vault keys | Low | No | FU-012 |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — one update (Durable Coverage To Update, API-04 baseline fix)
- Reroute Required Before Validation Execution: `No`
- Notes: one heavy run at a time on a loaded machine.

## Round 2 — IR-003 packaging fix (rerun)

- Upstream added this round: `release-deployment-report.md` (DR-001), `implementation-handoff.md` / `implementation-revision-record.md` (IR-003, IMP-20), `code-review-report.md` § Round 3 (CRR-004), RELEASE.md § Build-only release run (`aca8655bdd`). Ticket folder moved to `tickets/done/test-and-tooling-hygiene-294/`.
- Code delta since round 1 (`ecd7dc2d0f..4f27c2514d`, outside the ticket folder): `autobyteus-web/package.json` (`prepare:shared-types`; `typecheck` and `typecheck:update-baseline` run it first; version bump), `scripts/typecheck.mjs` (header comment), `docs/electron_packaging.md`, TESTING.md, RELEASE.md. Production code, the gate's rules and the baseline are unchanged.
- Real-use scenario (SCN-A2, refined): a release runner checks out the ref, runs `pnpm install --no-frozen-lockfile` only, then `pnpm build:electron:<target>` in `autobyteus-web` (`.github/workflows/release-desktop.yml`): macOS ARM64 and Intel on `macos-14`, Linux x64 on `ubuntu-22.04`, Linux ARM64 on `ubuntu-24.04-arm`, Windows on `windows-2022`. All five chains run the same `guards && pnpm typecheck` prefix.
- New evidence read before planning (diagnosis, recorded as API-31):
  - In run `40640209395` only the Linux and Windows jobs failed with TS2307 (Nuxt `292 errors`). **Both macOS jobs failed differently: `[typecheck] FAIL: Nuxt app (tsconfig.json): the compiler ended by signal SIGABRT`** after about 34 s. DR-001 and IR-003 attribute all five to the missing contracts `dist/`.
  - Locally, the Nuxt vue-tsc program (contracts built, no build outputs present) runs out of V8 heap ("Reached heap limit … JavaScript heap out of memory") under `--max-old-space-size` 1792, 2560 and 3072 MB, and passes (271 errors, the baseline) only at this 64 GB Mac's default of 4144 MB. A 7 GB `macos-14` runner gives Node a default old space of about a quarter of its memory (~1.75 GB); the 16 GB Linux and Windows runners get the 4 GB maximum, which is why only they reached the type errors.
  - Separately, after a local desktop build the gate sweeps in `autobyteus-web/resources/server` (`prepare-server`'s output, 866 MB) and `electron-dist/` (2.4 GB): the Nuxt project includes `../**/*` and excludes neither, so the next `pnpm typecheck` (and so the next `build:electron:*` in that worktree, or a CI retry of the macOS job after a notarization failure) fails: 3951 errors from `resources/server`, and out of memory at the default 4 GB.

### Round 2 Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-27 | AC-007, AC-009, AC-016 precondition; IR-003 | the gate on a fresh checkout in the release job's order, default heap (models the 16 GB Linux/Windows runners) | Existing Test | fresh clone of `4f27c2514d` (no build outputs, no `*/dist/`); `pnpm install --no-frozen-lockfile`; `pnpm -C autobyteus-web typecheck` | the fix's own claim |
| API-28 | same | the same gate under the `macos-14` runner's default heap | Temporary Probe | same clone: `NODE_OPTIONS=--max-old-space-size=1792 pnpm -C autobyteus-web typecheck` | emulates the 7 GB macOS runner (the gate passes its environment to vue-tsc); not durable: a host-memory emulation |
| API-29 | preserved | web unit and Electron suites after the script change | Existing Test | same clone: `pnpm -C autobyteus-web test:nuxt --run`, then `test:electron --run` | the reviewer's ask |
| API-30 | AC-007, AC-009 | the gate after a local desktop build | Existing Test | worktree with `resources/server` and `electron-dist/` from API-24: `pnpm -C autobyteus-web typecheck` | a second local build or a CI retry meets this state |
| API-31 | DR-001 | the failed release run's five gate outputs | Temporary Probe | `gh run view 40640209395 --job <id> --log`, `[typecheck]` lines per job | read-only evidence of what each runner did |
| — | AC-016 on CI | build-only release run (RELEASE.md) | Not run here | needs the fix pushed to `personal`; delivery runs it before tagging | pushing and release runs are delivery's |

### Round 2 Investigation Decision

- Proceed To API/E2E Execution: `Yes` (done; result in the execution report § Round 2)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required: `Yes`, as execution failures F-1 and F-2 (failure-origin review by the Code Reviewer), not as an upstream gap.

## Round 3 — IR-004 (CR-002 heap, CR-003 build-output excludes)

- Upstream added: `code-review-report.md` CRR-005/CRR-006 (CR-002, CR-003), `implementation-handoff.md` IR-004 (IMP-21, IMP-22). Pending upstream: the user's suggestion to take the gate out of the GitHub pipeline (Requirement Gap at the Solution Designer); this round validates the gate as it stands.
- Code delta since round 2 (`0a81db3a37..1f5a4a19df`): `autobyteus-web/nuxt.config.ts` (excludes `../resources/**`, `../electron-dist/**`, `../dist-mobile/**`, `../.output/**`), `autobyteus-web/scripts/typecheck.mjs` (Nuxt compiler spawned with `--max-old-space-size=4096`; a signal failure quotes V8's `FATAL ERROR` line).
- Rerun by impact: the gate (F-1, F-2 paths) and `test:nuxt` (its Nuxt config changed). `test:electron` uses `electron/vitest.config.ts`, which does not read `nuxt.config.ts`: round 2 API-29 stays valid for it. Server, E2E, probes and live CLIs: unchanged code, round 1 stays valid.

### Round 3 Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-30 (rerun) | AC-007, AC-009 (F-2) | the gate after a local desktop build | Existing Test | worktree with `resources/server` and `electron-dist/` from API-24: `pnpm -C autobyteus-web typecheck`; then the same under `NODE_OPTIONS=--max-old-space-size=1792` | F-2 path and the heap flag on the same tree |
| API-27/API-28 (rerun) | AC-007, AC-009, AC-016 (F-1) | fresh clone, release-job order | Existing Test | fresh clone of `1f5a4a19df`; `pnpm install --no-frozen-lockfile`; `pnpm -C autobyteus-web typecheck` (default) and with `NODE_OPTIONS=--max-old-space-size=1792` | the macOS runner heap no longer reaches the compiler |
| API-32 | AC-009, AC-016 (F-1 memory fit) | the gate inside a 7 GB memory ceiling | Temporary Probe | `docker run --memory=7g --memory-swap=7g node:22-bookworm`: clone `1f5a4a19df` inside, `corepack` pnpm 10.28.2, `pnpm install --no-frozen-lockfile`, then (a) control: unflagged `vue-tsc -p tsconfig.json` (expect the default cgroup-sized heap to abort, as on `macos-14`), (b) `pnpm -C autobyteus-web typecheck` with peak memory read from the container's cgroup | emulates the 7 GB runner's physical memory and default heap; Linux, not macOS: the gate's memory profile is the compiler's, which does not depend on the OS; not durable (host emulation) |
| API-29 (rerun, test:nuxt) | preserved | web unit suite after the Nuxt config change | Existing Test | same fresh clone, TESTING.md order (`pnpm -C autobyteus-server-ts prebuild`), `pnpm -C autobyteus-web test:nuxt --run` | config changed |
| — | AC-016 on CI | build-only release run on `macos-14` and the four other runners | Not run here | needs a pushed ref (delivery or the user) | push is not this role's |

### Round 3 Investigation Decision

- Proceed To API/E2E Execution: `Yes` (done; result in the execution report § Round 3)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required: `No`
