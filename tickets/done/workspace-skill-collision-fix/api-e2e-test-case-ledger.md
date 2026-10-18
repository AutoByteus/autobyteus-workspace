# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix` (branch `codex/workspace-skill-collision-fix`)
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope: many independent cases across three paid live runtimes, an AGY scripted suite and an isolated desktop instance; interruption-prone
- Last updated: 2026-10-18
- Validated implementation commit: `810408bcee`. Merge `c59da62e70` (v1.5.6-beta.3 base: skill-update-notice text formatting + web version) arrived during the run; rerun-by-impact in the execution report. Test commits: `1f9aae5817` (baseline fix), `1c69409a85` (new coverage).

Evidence folder: `tickets/in-progress/workspace-skill-collision-fix/evidence/`

## Planned Cases

| Case ID | Case / Journey | AC IDs | Surface | Command / Entry | Order |
| --- | --- | --- | --- | --- | --- |
| API-01 | Typecheck + AC-106 leftover search | AC-106, AC-107 | repo | `pnpm -C autobyteus-server-ts typecheck`; grep over `src` | 1 |
| API-02 | Server unit (backends, then full) and integration suites | AC-103, AC-104, AC-105, AC-107 | repo | `vitest run tests/unit/agent-execution/backends`; `test:unit`; `test:integration` | 2 |
| API-03 | Live Codex `skills/list` with the user's absolute `.codex/skills` link (new case) + restored live bootstrapper cases | AC-101, AC-103 | real `codex app-server` | `RUN_CODEX_E2E=1 vitest run tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | 3 |
| API-04 | Non-gated skills E2E (package private skills incl. brand-new run with/without links; GitHub skill sources) | AC-101, AC-105, AC-107 | server E2E | `vitest run tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` | 4 |
| API-05 | Live server: new run + restore in linked workspace, skill used — Claude / Codex / Grok | AC-101, AC-102 | real server + CLIs | `tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` per gate | 5 |
| API-06 | Live server: brand-new lazily activated team member with configured skill — Claude / Codex / Grok | AC-105 | real server + CLIs | same file | 6 |
| API-07 | Live server: different same-named workspace skill refused (configured) / used (all-installed) — Claude / Codex / Grok | AC-104 | real server + CLIs | same file | 7 |
| API-08 | AGY smoke (linked skills, scripted CLI) | AC-107 (BEH-104) | real server, scripted AGY | `RUN_AGY_FAILURE_E2E=1 … agy-linked-skills-transport.e2e.test.ts` | 8 |
| API-09 | Gated RUN_CLAUDE_E2E suites (session manager, backend factory, websocket interrupt/resume) | AC-107 | real Claude SDK | `RUN_CLAUDE_E2E=1 vitest run …` | 9 |
| API-10 | Gated RUN_CODEX_E2E integration suites (backend factory, thread manager, thread, client manager) | AC-107 | real codex | `RUN_CODEX_E2E=1 vitest run …` | 10 |
| API-11 | Temporary probe: Grok native discovery of `.grok/skills` | AC-101 (Grok fidelity) | real `grok agent` ACP | `evidence/10-grok-skills-list-probe.mjs.txt` | 11 |
| API-12 | Post-merge rerun-by-impact (typecheck, unit subsets, skills E2E) on `c59da62e70` | AC-107 | repo | see report | 12 |
| API-13 | Isolated desktop instance journey: import package, new run + continue per runtime in linked workspace | AC-101, AC-102 | packaged worktree build | `pnpm --silent isolated-app start --build` | 13 |

## Execution Events

| Seq | Case ID | Event | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | API-01 | Completed | typecheck 0; no private-path symbols in `src` | typecheck exit 0; only hit is unrelated local var `privateSkill` (package-private skill) in `configured-agent-skill-resolver.ts` | Pass | `evidence/01-typecheck.log`, `evidence/02-ac106-search.log` |
| 2 | API-02 | Completed | green | backends unit 85 files / 1070 tests; full unit 716 files / 5830 tests; integration 76 files / 396 tests (first integration run contended with my concurrent gated run on the shared test DB → 10 SQLite token-usage failures + corrupted test DB; removed the worktree-owned `tests/.tmp` DB and reran alone: green) | Pass | `evidence/03-unit-backends.log`, `04-test-unit.log`, `05-test-integration.log`, `05a-test-integration-contended-run.log` |
| 3 | API-03 | Completed | real `skills/list` reports the linked skill; nothing materialized; link untouched | first run: restored beta.1 cases failed (stale test: removed `getClient()`, no guard, pre-D-19 assertion) → baseline test fix; final: 4/4 pass; Codex lists the link at real path `<package>/agents/solution-designer/skills/<s>/SKILL.md`, scope `repo` | Pass | `evidence/06-codex-live-bootstrapper.log` |
| 4 | API-04 | Completed | green | 35/35 (pre- and post-merge) | Pass | `evidence/15-post-merge-e2e-skills.log` |
| 5 | API-05 | Completed (Claude) | run starts, link intact, code from skill; restore + continue answers from skill | `Skill` tool used; LINKCODE then RESTORECODE | Pass | `evidence/07-live-skill-links-claude.log` |
| 6 | API-06/07 | Completed (Claude) | member folder absent before, member answers; collision refused; all-installed uses workspace copy | member folder absent before first message, created after; refusal "Workspace skill path collision for Claude skill…"; OWNCODE | Pass | `evidence/07-live-skill-links-claude.log` |
| 7 | API-05/06/07 | Completed (Codex, model gpt-5.6-luna) | as above | `run_bash` reads the skill; LINKCODE, RESTORECODE, member OK, refusal, OWNCODE | Pass | `evidence/08-live-skill-links-codex.log` |
| 8 | API-05/06/07 | Completed (Grok, model grok-4.7) | as above | all assertions pass; Grok found the skill by searching the workspace (`grep`, `read_file`) | Pass (with observation → API-11) | `evidence/09-live-skill-links-grok.log` |
| 9 | API-11 | Completed | — | Grok 1.0.62 `_x.ai/skills/list` and `grok inspect` list no workspace `.grok/skills` skills (real folder or link); "Project trusted: no". Same Grok code as beta.1 → out of scope; follow-up sent to `/project_task_manager` | Observation | `evidence/10-grok-native-skill-discovery-probe.txt` |
| 10 | API-08 | Completed | 8/8 | 8/8 | Pass | `evidence/11-agy-linked-skills-smoke.log` |
| 11 | API-09 | Completed | green | first run 11 failures, all stale test fixtures predating beta.1 (`createBackend` removed; stub lacked `resolveSkillScope`/`deactivateForRun`) → baseline test fix; final: session manager 9/9, websocket interrupt/resume 9/9, backend factory 6/8. The 2 remaining (`open_tab` / browser tool surface via Agent Tools MCP) time out because the fixture never exposes Agent Tools MCP (`activateForRun → not_exposed`, unchanged since beta.1; agent has no skills) → out of scope | Pass for in-scope cases; 2 out-of-scope | `evidence/12-claude-gated-suites.log`, `12b-claude-backend-factory-gated.log` |
| 12 | API-10 | Completed | — | 21/21 fail before any skill code: hard-coded retired models (`gpt-5.4-mini`, `gpt-5.4`, `gpt-5.3-codex`) and removed APIs (`createBackend`, `acquireClient`, `getClient`), identical in beta.1 → out of scope (follow-up); skill path for Codex proven by API-03 and API-05..07 | Out of scope | `evidence/13-codex-gated-integration.log` |
| 13 | API-12 | Completed | green on `c59da62e70` | typecheck 0; unit subsets 168 files / 1800 tests; skills E2E 35/35 | Pass | `evidence/14-post-merge-typecheck-unit.log`, `15-post-merge-e2e-skills.log` |
| 14 | API-13 | Started | — | building the worktree app (`isolated-app start --build`, merged HEAD) with a throwaway `CODEX_HOME` → `iso-60176-ff92` | — | — |
| 15 | API-10b | Completed | — | Codex live memory-persistence and interrupted-compaction E2E: 6/6 fail on the removed `manager.prepareNewAgentRun` (removed in `028cca2312`, before beta.1) → out of scope | Out of scope | `evidence/13b-codex-live-e2e.log` |
| 16 | API-13 | Completed | import package; new run and continue on each runtime answers from the skill | package imported in the UI. The workspace was registered via the instance GraphQL `createWorkspace`, because the native folder picker can't be automated. New runs: Claude (`Skill`), Codex (`cat .codex/skills/…/SKILL.md`) and Grok (search) each answered `DESKTOP-NEW-7Q4`. After an app restart, each run reopened from history and "continue" answered `DESKTOP-CONT-9K2`. Instance log: 0 ENOENT, 0 collision. F2 observed: the Claude link was removed at the app restart and recreated by the next run. | Pass | `evidence/16-desktop-01..08-*.png`, `16-desktop-instance-log-excerpt.txt` |
| 17 | cleanup | Completed | — | instance stopped (data root removed, record gone); temp fixtures removed | — | — |

## Re-entry And Reconciliation

- Last durably recorded event: 17 (cleanup)
- Cases not finished: none
- Reconciled into execution coverage report: `Yes`, see `api-e2e-execution-coverage-report.md` "Acceptance-Criteria Proof" and "Additional Repository Coverage Execution"
