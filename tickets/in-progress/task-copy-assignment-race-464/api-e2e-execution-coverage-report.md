# API/E2E Execution Coverage Report — task-copy-assignment-race-464

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; code review Pass CRR-001 on IR-001 (source `c29edfb1f7`, review commit `3da0b47f31`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: API-04b added (Rule 9 diagnosis of API-04's one failure).
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/evidence/api-e2e/`. `API-04-scripted-agy-gated-set.full.log` (7.6 MB) stays in the worktree uncommitted; its excerpt is committed next to it.

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `3da0b47f31` (source `c29edfb1f7`) + temporary probe files, removed after each run | macOS (Darwin 25.5.0) | Node v22.23.1; autobyteus-ts and server unit/integration (Vitest) | In-memory doubles; temp folders |
| ENV-2 | `e5d5a7aac5` (source `c29edfb1f7` + API-02's test edit) | as ENV-1 | as ENV-1; server `dist/` from IMP-04 | Unit and typecheck |
| ENV-3 | `e5d5a7aac5` | as ENV-1 | Server `dist/` from IMP-04; `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Clean env `env -i PATH HOME=<resolved temp> TMPDIR`; scripted AGY, no provider; machine load 7–19 during API-04 (implementation's IMP-07 ran at 34–59) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | BEH-003, REQ-004 (code review C-01) | Real native autobyteus-ts agent stopped while a tool call waits forever (stand-in for a copy's `delegate_task`/`send_message_to` waiting on a root-queue step behind its release) | Temporary `autobyteus-ts/tests/integration/agent/zz-api01-probe-stop-during-hanging-tool.test.ts` (content in the log); `NO_COLOR=1 pnpm -C autobyteus-ts exec vitest run <it> --no-watch --reporter=verbose` | ENV-1 | Pass | `API-01-native-stop-during-hanging-tool.log` | `C01_PROBE removeAgent=true elapsedMs=77 running=false status=shutdown_complete`; `Tests  1 passed (1)` | The probe asserts the turn is active inside the tool before the stop. `AgentFactory.removeAgent(id, 10)` (the server's native stop, `autobyteus-agent-run-backend.ts:309`) returns in 77 ms: the turn races each tool execution against its abort signal (`tool-phase.ts:172` → `racePromiseWithAbort`), so the stop does not wait for the tool. A `release` step at the queue head therefore cannot hold-and-wait on its copy's own queued tool call; the other runtimes kill their process (code review C-01). C-01's bounded stall does not occur. Probe file removed |
| API-02 | BEH-003, REQ-004, D1 | `RootTaskExecutionLifecycle.releaseTaskExecutions` around root termination and fail-stop | New `describe("a closure release around root termination …")` in `tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts`; `NO_COLOR=1 pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch --reporter=verbose` | ENV-1 | Pass | `API-05-focused-unit-and-typecheck.log` (the file inside the focused run), `API-03-mutation-probe.log` (M2) | `✓ … a release queued when the root terminates still runs and stops its copy`; `✓ … a release requested after termination runs directly …`; `✓ … after root fail-stop runs directly …` | Durable (commit `e5d5a7aac5`). Three cases: a release queued behind a held release when admission closes still runs (`stopped: true`, `fenced`, `closed` published); a release after `closeExternalAdmission()` or `enterRootFailStop()` runs directly. Without them nothing pins D1's `!accepting` rule (API-03 M2) |
| API-03 | REQ-003, AC-001, AC-003, D1–D3 | Mutation check: each part of the fix reverted alone in `root-task-execution-lifecycle.ts` | `python3 mutate.py <file> <M>` (script in the log), run `root-task-existing-copy-assignment`, `root-task-reactivation`, `remote-messaging-owners` unit files, `git checkout -- <file>`; for M1…M4 | ENV-1 | Pass | `API-03-mutation-probe.log` | M1 (release outside the queue): `Tests  4 failed`; M2 (always queued): `Tests  2 failed` (API-02's after-termination and after-fail-stop cases); M3 (assignment commit after its step): `Tests  3 failed`; M4 (reactivation commit after its step): `Tests  1 failed`; `## Restored: git diff --stat src = []` | Every part of the fix is pinned by a test; M2 only by API-02 |
| API-04 | AC-004, AC-005, QR-001 | Every `RUN_AGY_FAILURE_E2E` gated suite (60 files) | `env -i PATH HOME=<resolved temp> TMPDIR NO_COLOR=1 RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run --no-watch $(grep -rlE RUN_AGY_FAILURE_E2E tests/e2e \| sort)` | ENV-3 | Pass for the in-scope files (1 out-of-scope failure) | `API-04-scripted-agy-gated-set-summary.log` | `Test Files  1 failed \| 57 passed \| 2 skipped (60)`; `✓ EXC-E2E-004 QR-001: DONE of the copy's Task and its next assignment as parallel tool calls in one Manager turn, both orders`; `✓ …task-existing-copy-assignment.e2e.test.ts (9 tests \| 2 skipped)`; `'already active or reserved' lines: 0` | Every delegation suite passed: `task-existing-copy-assignment`, `task-reactivation-root-visibility`, `teammate-delivery-task-closure-race`, `task-copy-idle-lifetime`, `delegated-copy-*`, `task-agent-several-tasks`, `ad-hoc-task-delegation`, and the rest. The one failure is CM-E2E-2 of `collaboration-model-contract`, a stale text assertion since autobyteus-435 (API-04b, FU-001) |
| API-04b | Rule 9 diagnosis | `collaboration-model-contract.e2e.test.ts` alone | Same env, the file alone | ENV-3 | Fail (out of scope) | `API-04b-collaboration-model-contract-alone.log` | `Tests  1 failed \| 2 passed (3)`; `Received: "{"error":{"code":"COLLABORATION_SELF_TARGET_REJECTED","message":"/manager is your own address; you can't delegate to yourself. …"}` | Deterministic. Cause: `collaborator-errors.ts:69` self-delegation words changed by autobyteus-435 (`432d1c3af2`, in base `c8f303af70`); the test's `expectRefused` (`:199`) still requires `send_message_to` for the self case (`:278`). This branch changes neither file. Follow-up FU-001 |
| API-05 | AC-005 | Focused unit folders and server typecheck with API-02 | `NO_COLOR=1 pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration tests/unit/remote-collaboration tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/standalone-agent-run-root --no-watch`; `pnpm -C autobyteus-server-ts typecheck` | ENV-2 | Pass | `API-05-focused-unit-and-typecheck.log` | `Test Files  143 passed (143)`, `Tests  1237 passed (1237)` (IMP-02's 1234 + 3); `test-file errors: 1181 in 365 files (baseline 1181 in 365 files)`, `[typecheck] PASS` | — |
| API-06 | AC-006 | Module docs | Read `git diff c8f303af70 c29edfb1f7 -- autobyteus-server-ts/docs` | ENV-1 | Pass | this row | `projects.md` step 3: "One step of the root's queue … resumes and commits … A DONE's release of the copy runs in the same queue: one that comes first is settled before the commit; one that comes after finds the copy open, stops nothing and publishes no `closed`."; `agent_team_execution.md`: the queue serializes "the closure release of hosted copies … and the reopening step … together with its commit … remote copies are fenced outside the queue" | Steps renumbered 3–5; no stale step reference in `projects.md` |
| API-07 | AC-001…AC-005, REQ-003 | Implementation checks | Reused: IMP-01 (D4 fails on base), IMP-02 (focused unit), IMP-03 (typecheck), IMP-05 (`test:unit`), IMP-06 (`test:integration`), IMP-07 (EXC-E2E-004 3/3 under load 34–59), IMP-08 (gated delegation suites), IMP-09 (full `pnpm test:e2e`) | — | Pass | — | — | All at `c29edfb1f7`; `git diff --name-only c29edfb1f7 3da0b47f31` lists ticket documents only. Checked: IMP-01 `Tests  3 failed \| 51 passed (54)` with "…is already active or reserved"; IMP-07 `✓ EXC-E2E-004` in 3 runs; IMP-09 `Test Files  123 passed \| 124 skipped (247)`. API-02 adds a unit test only, which API-05 covers; `test:unit` and the full E2E stay valid |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-07 (IMP-01 fails on base, IMP-02 passes), API-03 (M1, M3 caught) | Proven | — |
| AC-002 | Yes | API-07 (IMP-02), API-05 | Proven | — |
| AC-003 | Yes | API-07 (IMP-01, IMP-02), API-03 (M4 caught) | Proven | — |
| AC-004 | Yes | API-07 (IMP-07: alone, 3 runs under load 34–59), API-04 (inside the 60-file gated set) | Proven | — |
| AC-005 | Yes | API-07 (IMP-05, IMP-06, IMP-08, IMP-09), API-04, API-05, API-01, API-02 | Proven (API-04's one failure is out of scope, FU-001) | — |
| AC-006 | No | API-06 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | API-07, API-03, API-04 | — | — |
| Changed-boundary execution directness | 95% | 95% | D4 at the lifecycle; EXC-E2E-004 through real HTTP/WS/scoped MCP (IMP-07, API-04) | The race needs load to show end to end; the deterministic D4 cases cover the interleaving | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | Scripted AGY copies on a real server; real native agent stop (API-01) | Native copies are not driven end to end in a gated E2E (no scripted native delegation suite); API-01 covers the stop semantics that matter | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | Clean env; rebuilt `dist` (IMP-04); load 34–59 (IMP-07) and 7–19 (API-04) | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | API-01 (C-01), API-02 (termination, fail-stop), API-03, D4 both orders | C-02 (a release queued at fail-stop is rejected) out of scope | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Server runtime ordering only; no UI | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | D4 cases fail on base; API-03 shows each part of the fix pinned; API-02 pins D1's state rule | — | — |

- Overall post-repository confidence: 95%
- Overall final confidence: 95%
- Calculation method: simple average of the six applicable categories (95 each)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: C-02 / MP-002 (out of scope; logged, repeated DONE retries); RSK-001 (a hosted stop waits its queue turn; accepted in the design, and API-01 shows the stop itself does not wait for an in-flight tool)

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Execution mode: `None`
- Confidence gap or residual risk it addresses, and the expected gain: none; the changed boundary is the server's per-root queue, exercised end to end by the gated E2E on a real server.
- Browser validation needed, and why or why not: No. No UI, transport, text or result changes (REQ-004).
- If `Not Required`: the cases that already exercise the real changed boundary: API-04, API-07 (IMP-07, IMP-08, IMP-09), API-01.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the `!accepting` direct release is the design's explicit state rule; API-02 pins it)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts` (describe "a closure release around root termination", 3 cases) | Added | API-02 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | Scripted `tests/fixtures/agy-failure-cli.mjs` | TESTING.md "Runtimes without a model" | Transport, not inference |
| Native LLM (API-01) | Scripted `BaseLLM` emitting one tool call | No provider needed for stop semantics | — |
| Root adapter / registries (D4, API-02) | `root-task-copy-resume-fixtures.ts` modelling the registry's "already active or reserved" refusal | Deterministic interleaving | End-to-end proof by API-04 / IMP-07 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/agent/zz-api01-probe-stop-during-hanging-tool.test.ts` | Yes | Deleted after the run; content kept in the log | `git status` clean for `autobyteus-ts` |
| Mutation script `/tmp/api03-mutation/mutate.py` and the four `src` mutations | Yes | `git checkout -- <file>` after each; script deleted; content in the log | `git diff --stat src` empty |
| Test-owned data roots and servers of API-04 | Yes (suites) | Suites' own teardown | No leftovers reported |
| `API-04-scripted-agy-gated-set.full.log` | Yes | Kept in the worktree, not committed | Excerpt committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (reviewed High route: proportional test-code review of API-02)
- Notes: FU-001 (stale CM-E2E-2 self-delegation text since autobyteus-435) is recorded in `follow-ups.md`; it does not block this ticket.
