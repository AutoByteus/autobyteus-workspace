# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/requirements-doc.md` (Approved, SR-003 hybrid)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/investigation-notes.md` (HF-01..HF-08; AF-01..AF-18)
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: `problem-report.md` (evidence only), `handoff-architecture-design-complete.md`, `evidence/baseline-before/ac-001-64ff1474.json` (base: task stopped at 60 s), `evidence/hybrid/ac-001-2e190584.json` (implementer)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/code-review-report.md` (CRR-003, Pass, 9.5/10; N-001)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: Code review pass CRR-003 (SR-003 hybrid, IR-003) from `/software_engineering_team/code_reviewer`, 2026-10-08
- Prior Investigation Reviewed: Round 1 (SR-002 removal), stopped by the Solution Designer before any result; no API/E2E result was recorded. Its plan, decisions and the two untracked test files assumed the removal and are superseded here. Its executed evidence (`evidence/api-e2e/r1-*`, `e2e-idle-r1/r2.log`) is historical only.
- Latest Authoritative Investigation: Round 2

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Hybrid (SR-003). A delegated copy (Agent or Team, members, helpers) is not idle-shut-down while any of its agents' runtime reports a running background task (Claude registry, AGY monitor), with no time limit (REQ-001). When the last task ends (completed/failed/stopped) the grace period restarts, also without a following turn (REQ-002). Copies with nothing running keep today's idle shutdown, grace setting and wake-on-message; Codex, AutoByteus and ACP report no tasks (REQ-003). DONE, root stop/fail-stop and server stop still stop a copy and its tasks without waiting (REQ-004). The LLM text and docs state the rule (REQ-005). SR-002 is fully reverted outside `tickets/` (REQ-006). Implementation: `AgentRunBackend.hasRunningBackgroundTasks()` read by `AgentRunTermination.tryPrepareIfQuiescent` (fire-time quiet check); terminal `BACKGROUND_TASK_UPDATED` → root → `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded` → `armLive`.

Critical ACs: AC-001 (Claude), AC-002 (AGY), AC-003 (Team member), AC-004 (end without a turn), AC-005 (Claude end + turn), AC-006 (quiet copies unchanged on every runtime), AC-007 (DONE/root stop not deferred). AC-008 is a review/diff check, re-run here.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-005.
- Real-use scenarios added from the implementation:
  - RU-001: the operator setting stored in the server settings store (data-dir `.env`), as an operator sets it, at its 60 s minimum, rather than only a process env override. Trigger: server startup.
  - RU-002: a delegated AGY worker receives a follow-up message while its daemon runs. The turn's idle arms a new grace period that must also be skipped. Trigger: user message to the copy.
  - RU-003: a Task DONE issued by the delegator (agent tool `create_or_update_task`) and a user root stop while a copy's step still runs.
  - RU-004: the quiet copy is woken by the delegator's `send_message_to(run ID)` after idle shutdown (restore relaunch with its provider conversation).
- Unsupported/contrived scenarios (not tested): a malformed runtime payload (code review C-02); a daemon killed from outside AutoByteus. AGY 1.3.1 writes no exit message for it (observed, see below), so the copy stays live until DONE/stop. That is the accepted QR-002 residual and not a REQ-002 scenario (the design's "task ends" is the runtime's own end report).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Claude task keeps copy live | Changed | REQ-001, AC-001 | Live Claude E2E |
| BEH-002 AGY step keeps copy live | Changed | REQ-001, AC-002 | Scripted-AGY E2E in 3 roots + live AGY E2E |
| BEH-003 re-arm on task end | Added | REQ-002, AC-004/005 | Scripted-AGY (no turn), live AGY (no turn), live Claude (turn) |
| BEH-004/006/007 quiet copies unchanged | Preserved | REQ-003, AC-006 | Scripted-AGY quiet copy + wake in 3 roots; mixed LM Studio/Codex/Claude E2E |
| BEH-008 explicit stops | Preserved | REQ-004, AC-007 | Scripted-AGY DONE + root stop with running step in 3 roots; existing closure/reactivation suites |
| Team copy via member quiet checks | Changed | AC-003 | Scripted-AGY Team copy in 3 roots |
| LLM contract / docs / revert | Changed | REQ-005/006, AC-008 | grep + diff |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Quiet predicate, lifecycle hook, backend contract | Unit + integration with fakes | Real roots and runtimes | Server E2E |
| API / transport / contract | Yes | `BACKGROUND_TASK_UPDATED` / `AGENT_STATUS` on root views | Unit | Real WS frames in 3 views | Server E2E |
| Frontend component / state | No | Docs only | — | — | — |
| Browser integration / user journey | No | No rendered or client change | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Runtime processes kept or terminated by idle shutdown | Fakes | Real CLI processes | Process liveness in scripted + live E2E |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | Yes | Grace schedule + serialized shutdown queue + async monitor poll | Unit (fake timers) | Real timers and poll | Scripted E2E with real timers |
| External integration | Yes | Claude CLI frames, AGY exit-message files | Unit parsers | Real CLI behavior | Live Claude and AGY E2E |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks` (HEAD `330cc5cef`)
- Project type: pnpm monorepo; Fastify/TypeScript server (Vitest); Nuxt/Electron web.
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/TESTING.md` (no closer `TESTING*.md`).
- Conflicting, missing, or unclear project instructions: N-001. `TESTING.md` had no row for the kept Claude delegated E2E; added in this round (with the two new suites).
- Required environment variables or secrets available: `Yes`. Local `claude` 2.1.283, `agy` 1.3.1 and `codex` 0.161.0 logins; LM Studio at `127.0.0.1:1234` (`qwen/qwen3.8-27b`). No secret values recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Root guideline | Server vitest commands; scripted AGY gate `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture>`; `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`; fixture modes must coexist (`agy-failure-cli-routing.test.ts`); rule 2 (no user app/data); rule 9 (base failures) |
| `tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts` | Disposable `HOME` pattern | `vi.hoisted` HOME before provider modules load (AGY brain root resolves at import) |
| `tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` | Real AGY daemon exit contract | Daemon prompt `(IsDaemon true)`; a self-exiting daemon yields `exited with code N` |
| `src/.../agy-task-exit-message-reader.ts` | Exit-message format | `<HOME>/.gemini/antigravity-cli/brain/<conv>/.system_generated/messages/*.json`, `sourceMetadata.tool.stepIndex`, `finished with result: … exited with code N` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` per suite | Private temp data dir | GraphQL | `app.close()`, temp dir removed |
| Scripted AGY CLI | `tests/fixtures/agy-failure-cli.mjs` | `ANTIGRAVITY_CLI_COMMAND` | One process per running agent | `init` | Root terminate; leftover check in `afterAll` |
| Real CLIs / LM Studio | user PATH / localhost | Existing logins | User quota | `--version` | Suites terminate their runs |
| Temporary base worktree | `/tmp/idle-shutdown-base-check` | `git worktree add --detach … 3a2496c95`, dependency symlinks | Sensitivity and base-failure comparison only | — | `git worktree remove --force`, `prune` (done) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Grace 60 s | Data-dir `.env` (scripted); `vi.stubEnv` (live, as the kept Claude test does) | Private | Temp removed |
| AGY exit messages | Fixture writes under the suite's disposable `HOME` | Never touches `~/.gemini` | HOME removed |
| Live AGY brain files | Real `agy` writes its own conversations under `~/.gemini` | Read-only inspection of the test's own conversation | Owned by AGY |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| Unit: lifecycle, agent-run, Claude registry/backend, AGY monitor/backend, Org idle-shutdown, standalone root, contract/parity | Hybrid unit cases + restored base cases | AC-001..AC-007 | Still Valid | Read diff | Run |
| Integration `task-delegation-tool-lifecycle`, `mixed-team-run-backend` | Team root hybrid with doubles | AC-002/003/004 | Still Valid | Diff | Run |
| `tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts` | AC-001/AC-005 live | AC-001, AC-005 | Still Valid | Read | Run live |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Base form (identical to base): quiet AutoByteus/Codex/Claude copies shut down after 60 s, wake, approval wait not shut down, Org Team, root stop/reopen | AC-006, AC-007 | Still Valid | `git diff` empty vs base | Run live |
| Scripted-AGY suites: reactivation, closure, ad-hoc, change feed, context files | DONE / reactivation / root stop / restore unchanged; share the fixture I extend | AC-007, BEH-008, fixture coexistence | Still Valid | TESTING.md | Run |
| `tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Fixture mode coexistence | Fixture | Needs Update | New route | Add case |
| Round-1 untracked `task-copy-idle-lifetime.e2e.test.ts` | Asserted SR-002 (no shutdown ever) | — | Replace | SR-003 | Rewritten for the hybrid |
| Round-1 untracked `agy-delegated-background-task.e2e.test.ts` | Asserted SR-002 | — | Replace | SR-003 | Rewritten for the hybrid |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-HYB-A/T/O | Per root (Agent, Team, Org), at once, grace stored at 60 s: Agent copy and Team copy with a 100 s AGY step are not shut down while it runs and are shut down one grace after it exits (no turn); quiet copy shut down after one grace and woken by the Manager (restore relaunch); DONE and root stop stop running-step copies at once. Process liveness plus `offline` | AC-002, AC-003, AC-004, AC-006, AC-007 | `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` (gated like the sibling scripted-AGY suites) | The only real-root/real-timer/real-monitor proof for all three roots; unit tests use fakes |
| FIX-001 | Fixture route `BACKGROUND_STEP:{"seconds":N}` (open daemon step, exit message after N s) | E2E-HYB enabler | `tests/fixtures/agy-failure-cli.mjs` + routing unit case parsed by the production reader | Deterministic background end without a model |
| LIVE-AGY | Real AGY worker daemon (180 s) outlives two grace periods (with a follow-up turn), same process; own exit → `completed` → offline one grace later | AC-002, AC-004, RU-002 | `autobyteus-server-ts/tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts` (gated `RUN_AGY_BACKGROUND_E2E=1 RUN_CLAUDE_E2E=1`) | Real AGY exit-message contract with the hybrid; AC-002 otherwise unit-only |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC | Notes |
| --- | --- | --- | --- | --- |
| DOC-001 | `TESTING.md` | Rows for the Claude (N-001) and AGY delegated live E2Es and the scripted hybrid E2E | N-001 | — |
| FIX-001 | `agy-failure-cli-routing.test.ts` | New routing case | Fixture coexistence | — |

## Durable Coverage To Remove

None. The round-1 SR-002 versions of the two new files were never committed; they are replaced in place.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/agent-execution tests/unit/standalone-agent-run-root tests/unit/services tests/unit/projects tests/unit/agent-tools tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/integration/agent-team-execution tests/integration/standalone-agent-run-root tests/integration/agent-execution tests/integration/agent --no-watch` | worktree | Unit/integration | Pass relative to base: 2732 passed, 56 failed; base 57 failed; 0 new; the extra base failure is the `ba0437e00`-fixed test | `evidence/api-e2e/r2-focused.log`, `r2-focused.json`, `r2-focused-base.log`, `r2-focused-base.json` |
| 2 | `vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | worktree | Fixture route + coexistence | Pass (16) | console |
| 3 | AC-008 diff + grep | — | Revert completeness, contract text | Pass | report |
| 4 | Scripted E2E-HYB (`task-copy-idle-lifetime`) | gated scripted AGY | AC-002/003/004/006/007 in 3 roots | Pass (2nd run; 1st failed on a test-ordering bug, fixed) | `r2-e2e-idle-1.log`, `r2-e2e-idle-2.log`, `e2e-idle/task-copy-idle-lifetime.json` |
| 5 | Same suite on base source | temp base worktree | Sensitivity | Fails as expected in all 3 roots ("offline while its step runs") | `r2-e2e-idle-base.log` |
| 6 | Claude live (`claude-delegated-background-task`) | `RUN_CLAUDE_E2E=1` | AC-001, AC-005 | Pass | `r2-live-claude.log`, `live-claude/` |
| 7 | AGY live (`agy-delegated-background-task`) | `RUN_AGY_BACKGROUND_E2E=1 RUN_CLAUDE_E2E=1` | AC-002, AC-004 | Pass (run 3; run 1 used an externally killed daemon, run 2 had a wrong marker-path assertion) | `r2-live-agy-1/2/3.log`, `live-agy/` |
| 8 | Scripted suites: reactivation, closure, ad-hoc, change feed, context files | gated scripted AGY | AC-007 / BEH-008, fixture coexistence | Pass (4+1 skipped, 3, 3, 7, 1) | `r2-<suite>.log`, `r2-scripted-summary.txt` |
| 9 | `mixed-task-delegation` | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.8-27b CODEX_E2E_TOOL_MODEL=gpt-5.6-luna` | AC-006 on AutoByteus/Codex/Claude | Pass (4/4); attempt 1 refused by the test's stale default Codex model list | `r2-live-mixed.log`, `r2-live-mixed-2.log` |
| 10 | Full `tests/unit` | worktree | Regression | Pass relative to base: 4977 passed, 43 failed in 15 out-of-scope files (known base set) | `r2-unit-full.log`, `.json` |
| 11 | E2E-HYB rerun with failed exit (code 3) on the Agent copy | gated scripted AGY | REQ-002 `failed` end | Pass | `r2-e2e-idle-3.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — several long-running live cases with real model quota.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Repository evidence alone (unit/integration with fake backends and fake timers, before the server E2Es):

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | Every AC has a unit/integration case | Real roots/runtimes | Server E2E in 3 roots; live CLIs |
| Changed-boundary execution directness | 75% | Quiet predicate and hook exercised | Fakes for monitor/registry, timers | Real monitor + timers |
| Cross-boundary integration realism and mock gap | 75% | Real lifecycle with fake adapters | Real CLI end reporting | Live Claude/AGY |
| Environment, configuration, identity, and fixture fidelity | 80% | Setting read path unit-tested | Real settings store | Grace from data-dir `.env` |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Unit for stop paths | Real process stops | DONE/root stop with running step, process liveness |
| User-surface, browser, and desktop-shell confidence | N/A | No rendered/client/shell change | — | — |
| Durable regression coverage quality and relevance | 85% | Focused unit cases | No server-level guard | New 3-root E2E with base sensitivity |

- Overall post-repository confidence: 78%
- Calculation method: simple average of the 6 applicable categories
- Every critical acceptance criterion directly proven: `No` (only through fakes)
- Any applicable category below `90%`: `Yes` — all; broader validation required
- Default clean-confidence target of `95%` met: `No`
- Final scores after broader validation: execution coverage report (95.2%).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Selected execution mode: `Live API` / `Lifecycle` (real server with scripted and real CLIs, real timers, process liveness)
- Specific confidence gap: real runtime processes, timers and AGY exit-message polling across all three root kinds
- Why: the defect and the fix live at the process/timer boundary
- Browser-specific decision: `Not Required`. No rendered or client change; root views are proven at the WebSocket boundary.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Server stop while a task runs (AC-007 third trigger) | Covered by unit (`terminate()` / root fence never consult the background term) and process-level root stop here; whole-server shutdown uses the same root termination | Low | — |
| Claude member of a delegated Team (AC-003 on Claude) | AC-003 proven on AGY in 3 roots plus unit; the per-member quiet check is runtime-neutral | Low | — |
| Externally killed AGY daemon | AGY 1.3.1 writes no exit message (observed); copy stays live until DONE/stop | Accepted QR-002/DEC-005 | Note to delivery/Solution Designer as a residual |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Post-repository confidence: see report
- Broader validation decision: `Required` (executed)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: —
