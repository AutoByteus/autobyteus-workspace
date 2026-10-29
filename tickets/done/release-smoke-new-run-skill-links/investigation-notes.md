# Investigation Notes

## Investigation Meta

- Package identifier: `release-smoke-new-run-skill-links`
- Request / ticket: Project Task `autobyteus-149` (follow-up F6 of autobyteus-142 `workspace-skill-collision-fix`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links`, branch `codex/release-smoke-new-run-skill-links`
- Resolved base remote / branch / revision: `origin/personal` at `cba6b851227352d6bcefd5a8543ef8e5ba9f550d` (fetched 2026-10-19; "chore(release): bump workspace release version to 1.5.6-beta.8")
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md "Finalization Target")
- Bootstrap result: worktree created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/release-smoke-new-run-skill-links/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-19); `AGENTS.md`, `RELEASE.md`, `TESTING.md` (2026-10-19, at `cba6b85122`). Architecture gate files: see "Architecture Investigation Findings".
- Investigation status: Complete for requirements and architecture

## Initial Request And Clarifications

- Original request (from `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Release smoke checks: add 'same-skill link in the workspace' and 'brand-new run of an agent with configured skills' scenarios." The v1.5.6-beta.2 regression (runs refused with same-skill links under `.claude/skills` / `.codex/skills`, and brand-new runs failing with ENOENT on the missing memory folder) shipped in two betas and was found only by the user, because no release check starts a new agent run in a workspace like the user's.
- Direction: make these scenarios part of the checks that run before a release. Keep the cost of live-provider runs in mind: use a cheap model, or the scripted fixtures where a live run is not needed. Coordinate with autobyteus-65 (CI gating) and autobyteus-148 (stale gated live suites); do not duplicate them. The team decides where the check belongs (RELEASE.md / TESTING.md / a test suite), following the design principles.
- Done when: before a release, a start of a brand-new run and of a run in a workspace with same-skill links is checked on the runtimes the product supports; this is documented where the release rules live; the tests are merged.
- Clarifications received: none needed.

## Product And Domain Understanding

- Product area: release process (RELEASE.md) and the server's runtime test suites.
- Affected actors: whoever cuts a release (Delivery Engineer acting for the user); the user, who receives betas through the desktop auto-updater.
- Terms:
  - **Same-skill link**: a workspace entry `<ws>/.claude/skills/<s>`, `.codex/skills/<s>` or `.grok/skills/<s>` that is a link to the configured package skill's own folder.
  - **Brand-new run**: a run whose memory folder does not exist yet (a new standalone run, or a team member that starts lazily on its first message).
  - **Scripted runtime**: a test-owned CLI stand-in started through the runtime's command override. It runs the real server path without a model.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Doc | `RELEASE.md` "Checks Before Tagging" | Where the release rules live | Only two checks before tagging: `check_licensing.py` and `check_repository_artifact_hygiene.py`. No runtime or agent-run check exists. | The new check goes here |
| 2026-10-19 | Doc | `TESTING.md` "When this file may be updated", "Test layers", "Gates" | Where test layers are documented | Add a row only for a new layer, tool or command. Suite details go in the test file header. "A skip is not a pass." "Real-provider runs spend the user's credits: run them only when the change needs real-provider proof." | One layer row for the new command; suite details stay in headers |
| 2026-10-19 | Code | `.github/workflows/` | Is there CI that runs tests? | Only the four release workflows exist; none runs server E2E or a runtime CLI. CI gating is autobyteus-65 (board: "Catch stale server tests: type-check tests/ + run server E2E in CI") | The live check cannot run in CI (no CLI logins); it is a local pre-tag step |
| 2026-10-19 | Code | `package.json` (root) | Existing command shape | `test:e2e`, `test:e2e:real[:preflight]` (provider-key capability runner `test-support/live-e2e/run-live-e2e.mjs`), `release`, `release:test`, `release:manual-dispatch` | `test:e2e:real` covers API-key providers, not runtime CLIs or skills; a new command is needed |
| 2026-10-19 | Code | `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` | Supported runtimes | Five: `autobyteus`, `claude_agent_sdk`, `codex_app_server`, `antigravity_cli`, `grok_build` | All five are in scope |
| 2026-10-19 | Code | `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` (from autobyteus-142) | Existing live scenarios | Gated per runtime (`RUN_CLAUDE_E2E`, `RUN_CODEX_E2E`, `RUN_GROK_E2E`). Real Studio server, test-owned package, workspace and app data. Per runtime: new run + restore in a linked workspace; brand-new lazily started team member; different same-named skill refused / all-installed preference. A runtime whose gate is set but whose CLI is missing is silently dropped (`enabled` needs `commandReady`). Codex preferred models `gpt-5.4-mini`, `gpt-5.5-mini` are stale; with none available it falls back to `available[0]` (any model, cost unknown). | Reuse as the live tier; fix silent drop and model fallback |
| 2026-10-19 | Data | `tickets/done/workspace-skill-collision-fix/evidence/07..09-live-skill-links-*.log` | Cost/time of the live tier | Claude haiku 38 s, Codex `gpt-5.6-luna` 38 s, Grok `grok-4.7` 57 s; 3 tests each; about five short turns per runtime | Live tier cost is small |
| 2026-10-19 | Code | `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts:556` | Existing zero-cost brand-new-run check | Non-gated. Calls the Claude and Codex bootstrappers directly (mocked Codex client) for a brand-new team member, with and without same-skill links. Not through `createAgentRun`; no Grok, AGY or AutoByteus | Stays as is; not the release check |
| 2026-10-19 | Code | `tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` | Existing AGY zero-cost coverage | Gated `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`. Real server; `prepareAgentRun` + first WebSocket message; scripted CLI reports capsule skills (`READ_SKILLS`). Cases E01..E08 cover all-installed and named-skill failures, teams, orgs, delegation. No case with an imported package agent's configured skill in a workspace holding same-skill links | Add the release-smoke AGY scenario here or beside it (design) |
| 2026-10-19 | Code | `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | Existing AutoByteus zero-cost coverage | Non-gated. In-process `AutoByteusAgentRunBackendFactory` with a deterministic LLM; memory folder `dataRoot/memory/<runId>` not created beforehand | Pattern for the AutoByteus scripted scenario |
| 2026-10-19 | Code | `src/runtime-management/claude/client/claude-sdk-executable-path.ts` (`CLAUDE_CODE_EXECUTABLE_PATH`), `codex/client/codex-app-server-launch-config.ts` (`CODEX_APP_SERVER_COMMAND`), `grok/grok-build-launch-profile.ts` (`GROK_BUILD_COMMAND`), `antigravity-cli-capability.ts` (`ANTIGRAVITY_CLI_COMMAND`) | Can scripted CLIs replace live ones? | Each runtime has a command override. Scripted stand-ins exist for AGY (full) and Grok (recorded replay); the Claude and Codex stand-ins (`claude-owned-sdk-cli.mjs`, `codex-owned-terminal-cli.mjs`) are protocol peers for lifecycle tests and answer no turn or `skills/list` | Codex decides materialization from the real CLI's `skills/list` (beta.1 preflight), so a scripted Codex would decide the very behavior under test. Live is needed for Claude/Codex/Grok |
| 2026-10-19 | Command | `claude --version`, `codex --version`, `grok --version`, `agy --version` | Release machine CLIs | Claude Code 2.1.302, codex-cli 0.163.0, grok 1.0.62, agy 1.4.2 installed and on PATH | — |
| 2026-10-19 | Doc | `TESTING.md` "Antigravity CLI (`agy`) sign-in state" | Live AGY feasibility | No isolated signed-in recipe is known; live AGY runs on the host login and adds conversations to the user's `agy` history | AGY uses the scripted CLI |
| 2026-10-19 | Data | `task-plans/board.md` (main checkout) | Related Tasks | autobyteus-149 = this Task; autobyteus-148 = repair stale gated suites (Codex backend-factory/thread/client suites, Claude open_tab fixture); autobyteus-65 / `project_task_7ea7804f…` = type-check tests and run server E2E in CI; autobyteus-150 = F2/F3 (user's same-skill Claude link removed at run end; AGY refuses `.agents/skills/<name>`), needs the user's decision | Do not repair 148's suites; do not add CI; do not assert F2/F3 behavior |
| 2026-10-19 | Data | `tickets/done/workspace-skill-collision-fix/` (requirements, API/E2E ledger, coverage report) and `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/workspace-skill-collision-fix/EVIDENCE-INDEX.md` | Scenario basis | SCN-101..104 of autobyteus-142; desktop journey API-13 needed a manual workspace registration (native folder picker cannot be automated) | Desktop journey stays out of the routine smoke |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | RELEASE.md "Checks Before Tagging" | Before tagging, the release owner runs the licensing and hygiene checks on the merged `personal` state, then cuts the tag | No agent run is started before a release; the regression class of autobyteus-142 is not checked | RELEASE.md | High |
| BEH-002 | Operational | Gated live suites (TESTING.md "Gates") | `workspace-skill-links-live` runs only when a ticket chooses to run it; it silently drops a runtime whose CLI is missing and may pick any model | Not part of any release step | test file header and code | High |
| BEH-003 | System | Run start (createAgentRun / first message / lazy team member) | Server prepares skills for the runtime (workspace-link materializer for Claude/Codex/Grok, capsule links for AGY, prompt/catalog for AutoByteus) and starts the runtime | Correct since autobyteus-142 (v1.5.6-beta.3) | autobyteus-142 evidence | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `RELEASE.md` "Checks Before Tagging" | Pre-tag checks | Home of the release rule | Add the smoke command there |
| `TESTING.md` "Test layers" | Layer/command index | One row for a new command | Separate `docs(testing)` commit |
| `workspace-skill-links-live.e2e.test.ts` | Live scenarios for Claude/Codex/Grok | Live tier | Fail on missing CLI and on missing cheap model when run as the smoke |
| `agy-linked-skills-transport.e2e.test.ts` + `tests/fixtures/agy-failure-cli.mjs` | Scripted AGY over the real server | AGY scripted tier | Where the AGY scenario lives |
| `configured-skill-on-demand-loading.e2e.test.ts` | Native runtime with a deterministic LLM | AutoByteus scripted tier pattern | Where the AutoByteus scenario lives |
| `startStudioE2eRuntimeServer` (`tests/e2e/helpers/studio-runtime-test-server.ts`) | In-process real server for E2E | No build needed for these suites | Runner does not need `dist/` |
| `tests/.tmp/` (server) | Test DB location; ignored by `autobyteus-server-ts/.gitignore` | The release script needs a clean worktree; smoke output must not leave untracked files | Runner writes its report outside the worktree or to an ignored path |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- RELEASE.md, TESTING.md, server E2E test files, a new runner script, root `package.json` script.
- Readers: the release owner (Delivery Engineer) and validation agents.

### Structural Surfaces

- No production source is affected. Test harness only (`autobyteus-server-ts/tests/e2e/...`, a runner under `scripts/` or `test-support/`).

### Potential Structural Impacts To Investigate

- API or external-contract change: absent.
- Persistence schema or invariant change: absent.
- Security or privacy boundary change: absent (tests use test-owned data; Codex uses a throwaway `CODEX_HOME`; Claude/Grok use the host login, as today).
- Concurrency or lifecycle change: absent in product; runner must run suites serially (shared test DB contention seen in autobyteus-142, `05a-…contended-run.log`).
- Deployment/ownership change: release procedure gains a step. Confirmed present.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Read of autobyteus-142 logs | Live tier timing/cost | ≈40–60 s and ≈5 short turns per runtime on cheap models | Live tier is affordable before every tag | `tickets/done/workspace-skill-collision-fix/evidence/07..09` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via autobyteus-142) | Found a start-blocking regression in two betas himself | Strong | The check must run before betas too, not only stable releases | — |
| PTM direction | Cheap model or scripted fixtures; coordinate with 65/148 | Strong | Cost constraint; no CI work; no repair of other stale suites | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Code CLI | 2.1.302 | Host login, real `HOME` | `claude --version` | Login may expire on the release machine |
| Codex CLI | 0.163.0 | `skills/list` native discovery decides materialization; throwaway `CODEX_HOME` with a link to `auth.json` | autobyteus-142 E06 | Model catalog changes over time |
| Grok CLI | 1.0.62 | Only `grok-4.7` offered; does not list workspace `.grok/skills` natively (F7 / autobyteus-144) | autobyteus-142 E09/E10 | — |
| Antigravity CLI | 1.4.2 | No isolated signed-in recipe | TESTING.md | — |

## Persisted Data And State Facts

- Not applicable: no product data is read or written. Tests use test-owned temp roots only.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. No UI.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/tickets/done/workspace-skill-collision-fix/` | autobyteus-142 team (finalized) | Scenario basis and live suite origin | Read-only | all | Final | Evidence only |
| `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/workspace-skill-collision-fix/` | Delivery (finalized) | Durable evidence of the live scenarios | Read-only | all | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | A CLI login on the release machine is expired when a release is cut | The smoke fails or would be skipped | Smoke fails with a clear "runtime not ready" reason; the user may waive explicitly (DEC-004) | Accepted |
| RSK-002 | Risk | Live LLM answers are stochastic | A false failure blocks a release | Short deterministic prompts ("reply with only the code"); one retry of a failed live case is allowed by design decision; repeated failure is a real failure | Design |
| RSK-003 | Risk | The pinned cheap model is retired | Smoke fails | Fails with the available model list; pin is updated with an env override or a code change | Accepted |
| UNK-001 | Unknown | Whether Grok writes session files under `~/.grok` during the live run | Host side effects | Same as autobyteus-142 live runs; record in the delivery report | Accepted |

## Architecture Investigation Findings

Authorities read for the architecture gate (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repo root), `references/design-examples.md` (Example 11 consulted for scope), `templates/design-spec-template.md`.

- Entry point today: none. A release owner follows RELEASE.md by hand; the existing checks are plain commands.
- Runner precedent: `test-support/live-e2e/run-live-e2e.mjs` starts a built server and runs vitest with `createSanitizedTestEnvironment` — it targets provider API keys, needs `dist/`, and scans evidence for secret canaries. The skill-link suites start the server in-process and do not need `dist/`. Reusing that runner would couple two unrelated checks; a small separate runner is cleaner.
- The suites run under vitest from `autobyteus-server-ts`; vitest's JSON reporter (`--reporter=json --outputFile=<path>`) gives per-test status (`passed`/`failed`/`skipped`/`pending`), which lets the runner prove "nothing skipped".
- Clean environment: TESTING.md requires `env -i PATH HOME USER LOGNAME TMPDIR` for live CLI suites; real `HOME` is needed for the Claude/Grok logins. The AGY scripted suite ran with an empty `HOME` in autobyteus-142 (E11).
- Serial execution is needed: parallel suites contend on the shared test DB (`05a-…contended-run.log`).
- Codex model catalog: `providerModelCatalogSnapshots(runtimeKind)`; the cheapest current model used across tickets is `gpt-5.6-luna`.
- The release script refuses an unclean worktree (RELEASE.md "Cutting The Release"), so the runner must not write into tracked or unignored paths.

## Requirement Implications

- The check must be one command a release owner runs before every tag, with a clear pass/fail and per-runtime result; a skipped or missing runtime is not a pass.
- Claude, Codex and Grok need the real CLI (the behavior under test depends on the CLI's own skill discovery); AGY and AutoByteus can and should use scripted fixtures (zero cost; no isolated AGY login).
- The cost bound is the cheapest model per runtime at low reasoning effort, with a handful of short turns.

## Notes For Architecture Design

- Map SCN-001..SCN-004 to: live suite (Claude/Codex/Grok), AGY scripted suite, AutoByteus scripted suite, runner, RELEASE.md, TESTING.md.
- Keep autobyteus-148's suites and autobyteus-65's CI out of the change.
- Do not assert F2/F3 behavior (autobyteus-150).
