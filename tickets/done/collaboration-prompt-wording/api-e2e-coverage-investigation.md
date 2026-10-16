# API/E2E Coverage Investigation — `collaboration-prompt-wording`

## Investigation Meta

- Requirements Doc: `tickets/in-progress/collaboration-prompt-wording/requirements-doc.md`
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md` (SR-001, SR-002)
- Design Spec: `.../design-spec.md`
- Supplemental Task Artifacts: `.../wording/collaboration-prompt-wording-proposal.md` (wording authority), `.../wording/collaboration-prompt-complete-views.md`, `.../wording/build-complete-views.py`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../implementation-handoff.md`; Implementation Revision Record: `.../implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- API/E2E Revision Record: `.../api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: direct validation request from `implementation_engineer` (IR-001; commits `290d32dd4b`, `a1e080be08`)
- Prior Investigation Reviewed: `N/A` (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`; Architectural risk: `Low`
- Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Text and two internal facts changed; tool behavior, exposure, storage and migration did not. To prove:

1. The prompt is chosen from an explicit `collaborationRole` decided by the real roots (Agent host, Agent task execution, Team member, Org direct agent, Org-team member, task agent team member, task agent at a configured address) and on restore (REQ-001, AC-001).
2. Rendered prompts equal the complete views on AutoByteus, Codex and Claude (REQ-002/003, AC-001), contain no own address (AC-002) and no §2 forbidden word (AC-007).
3. Task message and received-message header carry name and ID, no address (AC-003); the web still reads new and saved forms (AC-003, AC-006, wording §10.11).
4. Tool and parameter descriptions are the same native and over MCP (AC-004).
5. Each refusal/result of design T-3 is produced by the real tool with the new text and an unchanged code (AC-005).
6. The `@` note is decided for the viewer through the real streams (AC-006).
7. AC-008: with a real model on an isolated desktop instance of this build, the three journeys work and no agent replies to an address.
8. Preserved: saved `[Mentioned collaborators]` notes and headers with `sender address` still parse and display; no persisted-data change.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005.
- Real-use scenarios added from investigating the implementation:
  - ADD-1 Restore: Stop a run, reopen it by messaging it; the prompt is the same (role is re-derived on restore). Trigger: user Stop then message.
  - ADD-2 Task agent at a configured address (keeps the root's handoffs and Team Instruction, `task_agent` role). Trigger: `delegate_task` to an address that is configured in the Team/Org root.
  - ADD-3 Old stored data: a run whose stored messages carry the earlier header (`sender address`), the earlier task message (`Task delegator address`) and an earlier `@` note still renders in the desktop app. Trigger: user opens an old run.
  - ADD-4 Refusals that real use produces after Task closure (DONE/CANCELLED), a second Task to a busy task agent, a non-assigner reactivation, a run stopping. Trigger: the agent's own tool call.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 role selects prompt | Changed | design-spec Interface Boundary Mapping; handoff BEH-001 | Real-root prompt e2e (D1) — the unit snapshot builds the context by hand and cannot show that real roots assign the role |
| BEH-002/010/003/004 sections, no own address, Handoffs only with rules | Changed | wording §4-§5; AC-001/002 | Snapshot unit tests (valid) + real-root prompt e2e + live quote check |
| BEH-005/006 task message and header | Changed | wording §7.1/§7.2 | e2e through real send_message_to / delegate_task (D1/D2), desktop transcript |
| BEH-007 tool descriptions | Changed | wording §6; AC-004 | Hash-pinned unit test; MCP route integration; native vs MCP parity on a real server (D1) |
| BEH-008 refusals/results | Changed | design T-3 | Existing e2e (updated texts) + new real-tool refusal e2e for sites no e2e reaches (D2) |
| BEH-009 `@` note per viewer | Changed | wording §8; AC-006 | Real WebSocket send with mentions per viewer (D3) + desktop UI |
| Contracts parse of earlier forms | Preserved | wording §10.11 | Contracts tests + web specs + desktop old-data render |
| Tool behavior, exposure, storage | Preserved | Scope Guardrail | Existing suites unchanged and green |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | role resolution, prompt composer, refusal sites | 5573 unit pass (reported) | role from real roots; real prompt on each runtime | Server e2e (scripted AGY) + live runtimes |
| API / transport / contract | Yes | MCP/native tool descriptions, contracts package note | hash-pinned unit, MCP route integration | native vs MCP on a real server | Server e2e |
| Frontend component / state | Yes (small) | header/note/first-message parse, UserMessage comment | 53 web specs | old stored forms in the real UI | Desktop instance + probes |
| Browser integration / user journey | Yes | transcript of received messages and `@` chips | probe sources updated, not run | probes never executed | Browser probes (e) |
| Authentication / session / permissions | No | — | — | — | None |
| Desktop renderer / web-equivalent UI | Yes | same as frontend | none | rendering with new/old text | Isolated desktop instance |
| Desktop shell / Electron-specific | No | — | — | — | None (shell unchanged) |
| Process / lifecycle | Yes (restore) | role re-derived on restore | unit | Stop → reopen real run | Server e2e + desktop |
| Persisted-data transition | No (`Not Affected`) | — | contracts/web parse tests | old data in the real UI | Desktop old-data open |
| Worker / queue / distributed | No | — | — | — | None |
| External integration | Yes | real model behavior reading the new texts (AC-008) | none | model follows prompt: reports by ID, no reply to an address | Live runtime + desktop |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording` (branch `codex/collaboration-prompt-wording`, HEAD `a1e080be08`)
- Project type: pnpm TypeScript monorepo (Nuxt web + Electron, Fastify/GraphQL server, contracts packages)
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/TESTING.md`; also `AGENTS.md`, `docs/isolated-app-instances.md`
- Conflicts/unclear: none that block. Note: the handoff names `pnpm run prepare:shared` at the repo root; the script exists only in `autobyteus-server-ts` (observation only).
- Required secrets available: live Claude/Codex use the host's signed-in CLI logins (real `HOME`, plus `USER`/`LOGNAME` on macOS); no key values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global testing strategy | build/prepare first; clean env for e2e (`env -i PATH HOME TMPDIR`; real HOME + USER/LOGNAME for signed-in CLIs); gates (`RUN_*`) mean a skip is not a pass; isolated desktop instance for full journeys; never touch the user's running app or `~/.autobyteus`; stop what I start |
| `docs/isolated-app-instances.md` | isolated instance mechanics | `isolated-app start --build/--from-worktree`, own data root, ports, stop |
| test-file headers | gates | `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND`=scripted fixture; `RUN_CLAUDE_E2E=1`, `RUN_CODEX_E2E=1` for live |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| worktree install/build | worktree root | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` and `build`; `pnpm -C autobyteus-web exec nuxt prepare` (done, exit 0) | serialized | build exit 0 | none |
| server e2e (scripted AGY) | `autobyteus-server-ts` | `env -i ... RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> vitest run <file>` | test-owned server and DB per test | suite output | temp dirs removed by tests |
| live suites | `autobyteus-server-ts` | gated `vitest run` with real `HOME` | spends the user's quota; cheap Claude model | suite output | temp dirs removed by tests |
| isolated desktop instance | worktree | `isolated-app start --build` with an owned `--data-root` | real HOME so signed-in CLIs work; owned data root; never `~/.autobyteus` | instance JSON + backend health | `isolated-app stop <id>`; data root kept for evidence then removed |
| browser probes | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:<name>` with a fresh `--output-dir` | probe-owned stack | probe receipt | probe cleanup receipt |

| Data / Fixture / Identity Need | Creation Method | Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Definitions: agents, a team with handoff rules, an org with a Project Task Manager-style direct agent | public GraphQL on the owned instance (seed script in evidence/) | owned data root only | evidence kept; data root removed at the end unless the user wants it |
| Old-form stored runs (earlier header, task message, `@` note) | my own synthesized pre-change data root from the earlier validation (`cmcdv-data-root`), copied to a new owned root | synthesized by me, no real user data | removed at the end |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (design-spec persisted-data section; handoff Persisted Data Transition Check)
- Representative existing data and required behavior: a stored run with `sender address` headers, `Task delegator address` task messages and a `[Mentioned collaborators]` note opens and renders in the desktop app with the same chips/"From <Sender>:" as before (no reader migration).
- Evidence planned: contracts + web unit tests (re-run), desktop open of old-form data (F1).
- Upstream ambiguity or reroute: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/prompt/collaboration-prompt-sections.test.ts` (+ `.snap`) | rendered text per view, shared and native paths, properties | AC-001/002/007 | `Still Valid` (context built by hand; role given) | read | keep; add real-root proof (D1) |
| `tests/unit/agent-collaboration/refusal-texts-vocabulary.test.ts` | forbidden words over refusal source literals | AC-005/007 | `Still Valid` | read | keep |
| `tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts` | hash-pinned descriptions, forbidden words | AC-004 | `Still Valid` | read | keep |
| claude/codex/autobyteus bootstrapper and factory unit tests | prompt reaches each runtime | AC-001 | `Still Valid` (verify assertion strength) | to inspect | keep |
| `autobyteus-agent-presentation-contracts/tests/collaborator-mention-note.test.mjs` | compose new, parse every earlier form | AC-006, §10.11 | `Still Valid` | read | keep |
| `tests/e2e/projects/*`, `agent-definitions/agent-package-definitions-live-refresh` (updated texts) | task/refusal texts through real tools, scripted AGY | AC-003/005 | `Still Valid` after update | to run | run |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | the collaboration model on real runtimes | AC-008 (server level), AC-005 | `Still Valid` (texts updated) | to run live (Claude/Codex) | run |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | renderer journeys, real Claude | AC-003/006 | `Needs Update` (still expected `(Agent)`/`(Agent Team)`) — updated | ran: 0/4 then 4/4 | updated |
| `autobyteus-web/tests/e2e/{project-manager-ux,task-agent-monitor-visibility,task-closure-tree}-probe.mjs` | renderer journeys, scripted AGY | AC-003 | `Still Valid` (P2, P3 fail identically on the base) | ran | run |
| `autobyteus-web/utils/**/__tests__`, `services/**` specs for note/header | web parse of new/saved forms | AC-003/006 | `Still Valid` | read | run |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Evidence | Planned Artifact | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| D1 | Role from the real roots → the prompt the run actually receives equals the complete view for each §3 row, native vs MCP tool descriptions equal, restore keeps it | REQ-001/002/003/004/007, AC-001/002/004 | `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-roles.e2e.test.ts` (scripted AGY; the real composed prompt is written to the run's `agent.md`) | unit snapshots hand-build the role; only a real root can prove the role decision and restore |
| D2 | Refusals/results through real tools for T-3 sites no e2e reaches (Task closed, non-assigner, different Task, busy task agent, no Task, run stopping, user stopping) | REQ-008, AC-005 | `.../collaboration-refusal-texts.e2e.test.ts` | those texts are asserted only in unit literals |
| D3 | `@` note per viewer via real WebSocket send | REQ-009, AC-006 | `.../collaboration-mention-note-per-viewer.e2e.test.ts` | unit tests cover the composer and relation, not the stored message a real stream produces |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| P1 | `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | expected note shape `(agent)` / `(agent team)` (wording §8) and the new not-found text | first run 0/4; after the update 4/4 with real Claude | found during execution, not in the plan |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Dir / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts typecheck` | worktree | build type policy | Pass | evidence/R1-typecheck.log |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit --no-watch` | worktree | unit (702 files, 5573 tests) | Pass | evidence/R2-unit.log |
| 3 | `pnpm -C autobyteus-agent-presentation-contracts test` | worktree | contracts (17) | Pass | evidence/R4-contracts.log |
| 4 | `pnpm -C autobyteus-web test:nuxt <changed areas>` + three guards | worktree | web parse (326 tests) | Pass | evidence/R5-*.log |
| 5 | `test:integration:prepare`, `test:integration` | worktree | integration; known baseline exception | Pass (2 known failures only) | evidence/R3-integration.log |
| 6 | scripted-AGY e2e `tests/e2e/projects` + live-refresh, clean env | worktree | real roots/tools/streams | Pass (1 timing flake, green on rerun) | evidence/R6-agy-e2e.log, R6b-rerun.log |
| 6b | new `collaboration-prompt-wording.e2e.test.ts` (D1–D3) | worktree, clean env | roles/prompts from real roots, refusals, `@` per viewer | Pass (7 pass, 1 skipped for F-1) | evidence/D-final-…log |
| 7 | web probes | autobyteus-web | renderer | P1 pass (after fix), P4 pass; P2, P3 fail identically on the base | evidence/probes/ |
| 8 | live `agent-initiated-collaborators` (Claude, Codex, LM Studio) | worktree, real HOME | real model through real roots | Fail (F-3); Codex pass | evidence/L1*, L2*, L3* |

## Post-Repository Confidence Scorecard (Mandatory)

Scores after repository execution (steps 1–6b), before broader validation (probes, live runtimes, desktop):

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | AC-001/002/003/004/006/007 by tests; AC-005 partly | AC-008 needs a real model | desktop + live runtimes |
| Changed-boundary execution directness | 80% | new e2e through real roots and tools | what real runtimes are given | read back supplied prompts |
| Cross-boundary integration realism and mock gap | 75% | scripted AGY only | model behavior | live runtimes |
| Environment, configuration, identity, and fixture fidelity | 80% | clean env, owned data | real HOME runs | live runs |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | refusals partly through real tools | unreached texts, restore | more real-tool cases |
| User-surface, browser, and desktop-shell confidence | 70% | web specs | probes never run, no real window | probes + desktop |
| Durable regression coverage quality and relevance | 85% | new e2e with negative control | — | — |

- Overall post-repository confidence: 76% (simple average)
- Every critical acceptance criterion directly proven: `No` (AC-005 partly, AC-008)
- Any category below `90%`: `Yes` — all seven
- `95%` target met: `No`
- Material residual risks: AC-008, F-1, probes unexecuted

## Broader Validation Decision (Mandatory)

- Decision: `Required`; mode `Project Desktop Validation` plus live runtimes; executed (see the execution coverage report).

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent cases, long live runs, likely interruption.
- Canonical ledger path: `tickets/in-progress/collaboration-prompt-wording/api-e2e-test-case-ledger.md`

## Desktop Application Validation Decision

- Desktop framework: Electron (isolated instance of this worktree build)
- Guidance used: `TESTING.md` (Isolated desktop instance), `docs/isolated-app-instances.md`
- Web-equivalent behavior: transcript of received messages, `@` chips, sidebar/first-message summary
- Shell-specific behavior: none changed
- Effect on any already-running desktop application: `None` — own data root and ports; the user's running app is untouched. Another instance of mine from the earlier ticket (`cmcdv-data-root`) is running on ports 54255/54256 and is stopped before this build starts if ports or resources would clash.
- Not directly proven: model quality beyond the three journeys; Windows/Linux.

## Live Environment And Fixture Plan

- Startup order: build worktree → seed definitions through GraphQL → start instance with an owned data root → drive journeys with the browser-automation launcher attached to the control port → capture stored traces/messages from the data root → stop.
- Environment choices: real `HOME` (signed-in Claude/Codex CLIs), owned data root, cheap Claude model; auto-approve off where a real model could run commands outside the workspace, tools restricted to the collaboration tools.
- Health checks: instance JSON `ok:true`, backend health, sidebar renders seeded runs.
- Cleanup: stop the instance, remove owned data roots and worktree-only artifacts; keep evidence in the ticket `evidence/` folder.

## Round 2 (API-REV-002) — trigger, basis, plan, results

- Trigger: implementation round IR-002 (SR-003: F-3a task message labels the reply call, F-3b refusals a misled agent receives, F-1 delivery-scope refusal returned as a result; C-3 covered by F-3a). Authoritative basis updated: AC-005 (cross-Task/closed-Task refusals arrive as results) and AC-008 (comparative: LE-A1 ≥5 per runtime and J1/J3 ≥4 per side, branch ≥ base, no reply to the name, every failing trace kept and explained).
- Existing coverage decisions: `CPW-R2` (skipped in round 1) `Still Valid`, enabled; `CPW-R1` `Needs Update` (extended with the SR-003 texts); the live suite `agent-initiated-collaborators` `Still Valid` (texts updated by IR-002).
- Plan: repository checks (typecheck, unit, contracts, web, integration, scripted e2e, probes), then base build + base Electron app, LE-A1 batches (Claude, Codex, LM Studio, branch and base, memory folders kept), journey samplers on isolated instances (branch and base), a desktop team hand-off, supplied-prompt read-back.
- Results: see `api-e2e-execution-coverage-report.md` (authoritative) and the ledger's round 2 section. Repository checks all pass; AC-005 resolved; AC-008 met on Claude and Codex, not on the native AutoByteus runtime (LM Studio 7/20 vs 14/20; new finding F-4).
- Post-repository confidence (round 2, before broader validation): 87%. Final: 85% (see report scorecard).
- Broader validation: `Required`, executed.

## Round 3 (API-REV-003) — trigger, basis, plan, results

- Trigger: implementation rounds IR-003 + IR-004 (one commit `71db6bbdd8`; SR-004..SR-014: one "run ID" term, header without a name, own-team-first `@`, catalogue M-01..M-45) and CRR-002's required test correction (LE-A1 step attribution). Basis: AC-008 revised (Claude and Codex decide; LM Studio dropped; ≥5 LE-A1, ≥4 per journey, branch vs base, traces kept, replies use `target_agent_run_id`), plus UI "From <name>" for new and stored headers, `@` of a teammate in a task agent team of a standalone run, and catalogue refusals through the real tools.
- Existing coverage decisions: the live suite `Needs Update` (CRR-002: take the requested call's completion, wait for the delegator to go quiet) — done; `collaboration-prompt-wording.e2e.test.ts` extended (`CPW-M4`, `CPW-R3`).
- Coverage to add: `CPW-M4`, `CPW-R3` (added). Remaining unit-only: 26 catalogue entries needing Task state or stopped runs.
- Plan and results: repository checks, rebuilt branch, base worktree with the same test patch, LE-A1 batches and journey samplers on isolated instances with the user's credentials imported into each test vault, UI checks on base-written data, probes. Results are in `api-e2e-execution-coverage-report.md`: repository green; AC-008 fails on Codex (F-5, runaway echo loops, branch 10/15 vs base 15/15); Claude passes; the native runtime is inconclusive (provider failures).
- Post-repository confidence (before live work): 85%. Final: 88%.

## Round 4 (API-REV-004) — trigger, basis, plan, results

- Trigger: CRR-005 pass of IR-005 (SR-015 no-reply rule and T-5 sender address where it reaches; SR-016 lowercase "run id"; CR-001..CR-005, no behavior change).
- Basis: AC-008 as revised (no unprompted delegator send after the report; replies by sender run id or sender address; branch ≥ base). The judging runtimes were changed by the user to Claude Sonnet and DeepSeek flash, because Codex is out of usage.
- Coverage decisions: added `CPW-H1` (T-5) — header and task-message forms through the real roots; corrected `analyze-le-a1.py` (turn attribution, scripted contents excluded) per CRR-005.
- Results: all checks pass on the judging runtimes; see the execution report. Post-repository confidence 88%; final 93%.
