# API/E2E Coverage Investigation — claude-sdk-background-task-lifecycle

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/requirements-doc.md` (SR-004, Approved)
- Investigation Notes: `.../tickets/in-progress/claude-sdk-background-task-lifecycle/investigation-notes.md`
- Solution Revision Record: `.../tickets/in-progress/claude-sdk-background-task-lifecycle/solution-revision-record.md`
- Design Spec (required on every route): `.../tickets/in-progress/claude-sdk-background-task-lifecycle/design-spec.md`
- Supplemental Task Artifacts: `.../probe-evidence/probe-results.md`, `probe.mjs`, `probeD.mjs` (evidence only)
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `.../implementation-handoff.md` (IR-001, commit `b041e34df`)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `N/A` (not a delivery re-entry)
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Complete (IR-001) from `implementation_engineer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Every Claude **turn** query built by `ClaudeSdkClient.buildQueryOptions` must carry `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` and `BASH_MAX_TIMEOUT_MS=1800000`. These values win over inherited or caller values. Model-discovery and capacity probes do not receive them. `BASH_DEFAULT_TIMEOUT_MS` is not set. The session/turn lifecycle is unchanged.

The following must be proven:

- AC-001 / AC-005: unit-level env assertions.
- AC-002: a live agent asked to run `sleep 20; echo done > marker` "in the background" runs it in the foreground. There is no `run_in_background`, the marker exists, and the result is reported in the same turn.
- AC-003 (optional): a timeout overrun shows as a visible timeout, not auto-backgrounding.
- AC-006: the Bash maximum timeout is 30 min, not 10 min.
- AC-004: the docs paragraph (review).
- QR-001: the behavior holds with both the PATH `claude` and the SDK-bundled CLI.
- Regression: model discovery still works.

Design-escalation triggers: a real run still shows `run_in_background` or `[killed]`, or a user-settings `env` override is found in practice.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001: background Bash unavailable | Changed | REQ-001, AC-001/002, probe D | Unit env test (exists) plus live CLI tool-schema check plus live agent journey |
| BEH-005: no auto-backgrounding on timeout | Changed | REQ-001/002, AC-003 | Optional live overrun probe |
| BEH-003: foreground Bash, ceiling raised 10→30 min | Changed/Preserved | REQ-004, AC-005/006 | Unit env test (exists) plus live CLI tool-schema/clamp check |
| Model discovery excludes policy | Preserved | Design "Ownership" | Unit test (exists) plus live `listModels` regression |
| Turn lifecycle / events / approval | Preserved | Design | Live journey exercises the real session → event → websocket path |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ClaudeSdkClient.buildQueryOptions` env merge | Unit tests with a mocked SDK `query` | Whether the real CLI honors the env (the mock bypasses the CLI) | Live CLI |
| API / transport / contract | No (preserved) | Websocket agent stream unchanged | Existing E2E | — | Live websocket journey exercises it anyway |
| Frontend component / state | No | — | — | — | None |
| Browser integration / user journey | No | Backend-only | — | Tool cards render existing events; no new UI | None |
| Authentication / session / permissions | Indirect | Env merge after the auth env builder (cli / api-key) | Unit tests | — | Live run in cli auth mode |
| Desktop renderer / web-equivalent UI | No | — | — | — | None |
| Desktop shell / Electron-specific | No | — | — | — | None |
| Process / lifecycle | Yes | Claude CLI child process env and Bash tool behavior at turn end | Probes A/D (SDK 0.3.231, not via AutoByteus code) | Real AutoByteus path on SDK 0.3.280 / CLI 2.1.280 and 2.1.281 | Live E2E through websocket + real SDK |
| Persisted-data transition | No | `Not Affected` | — | — | None |
| Worker / queue / distributed | No | — | — | — | None |
| External integration | Yes | Claude Code CLI documented env contract | CLI docs | CLI version drift (REQ-003) | Live CLI tool-schema capture on both CLIs |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle` (branch `codex/claude-sdk-background-task-lifecycle`, HEAD `b041e34df`)
- Project type: Node/TypeScript pnpm monorepo; the server is Fastify + vitest.
- Conflicting or unclear instructions: none.
- Required secrets available: `Yes`. Local Claude CLI auth (OAuth/subscription) is used by the existing live tests. The API-key vault is not needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Test commands | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-server-ts/package.json` | Scripts | `pretest` → `prepare:shared`. Prisma generate is needed before backend tests (already done) |
| `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Existing live Claude E2E pattern | Gated by `RUN_CLAUDE_E2E=1` and `claude --version`. Uses the real `ClaudeSdkClient` → `ClaudeSessionManager` → `ClaudeAgentRunBackend` → `AgentRun` → `AgentStreamHandler` → `/ws/agent/:runId` |
| `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Existing live client integration | Same gate; covers `listModels`, a live turn and session messages |
| `src/runtime-management/claude/client/claude-sdk-executable-path.ts` | CLI resolution | `CLAUDE_CODE_EXECUTABLE_PATH` / `CLAUDE_CODE_PATH` / `CLAUDE_CLI_PATH`, then PATH `claude` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| PATH Claude CLI | — | `/Users/normy/.local/bin/claude` | 2.1.281 | `claude --version` | Child process per turn, closed by the SDK |
| SDK-bundled CLI | — | `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280/.../claude` | 2.1.280 | `--version` | Same |
| In-test Fastify + websocket | server-ts | Created by the test on port 0 | Ephemeral | CONNECTED message | `app.close()` in `finally` |
| Local capture HTTP endpoint (AC-006) | server-ts | Created by the test on 127.0.0.1:0 | Answers `/v1/messages` with a 400 after capturing the request body. No real API call | listen resolves | `server.close()` in `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Temp workspace + marker file | `fs.mkdtemp(os.tmpdir())` | Isolated | `fs.rm` in `finally` |
| Claude identity | Local CLI auth; model `haiku` | The capture test uses a dummy `ANTHROPIC_API_KEY`, so no real credential reaches the capture server | None |
| Inherited env | This agent runs inside Claude Code, so its env contains `CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_MESSAGING_*`, etc. | Run live tests with those unset (`env -u`) to mimic a server process | N/A |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`. No persisted-data evidence is needed.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`: cli/auto env, api-key env, policy override, discovery excludes policy | Env merge semantics | AC-001, AC-005, design ownership | Still Valid | 18/18 pass (re-run: 26/26 across the client folder) | Keep |
| `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` (live, gated) | listModels, live turn, session messages | Regression: discovery + turns | Still Valid | To run | Run as a regression check |
| `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` (live section) | Interrupt/resume through the websocket | Preserved lifecycle | Still Valid | To run | Run as a regression check |
| Unit `tests/unit/agent-execution/backends/claude/**` | Session/backend with a mocked client | Preserved lifecycle | Still Valid (1 pre-existing base failure) | Implementation handoff | Re-run; confirm the failure is pre-existing |

## Stale Or Obsolete Coverage Decisions

None.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-POL-01 | The real CLI started via `ClaudeSdkClient.startQueryTurn` advertises Bash without `run_in_background` and with a 30 min ceiling (PATH CLI and bundled CLI) | AC-001, AC-006, REQ-003 guard, QR-001 | `tests/integration/runtime-management/claude/client/claude-sdk-client-runtime-policy.integration.test.ts` (gated `RUN_CLAUDE_E2E=1`) | The unit tests only check the env object. This detects a CLI/SDK bump that drops or renames either switch (REQ-003). It needs no model call |
| E2E-BG-01 | A live agent "in the background" request runs in the foreground and reports in the same turn through the websocket | AC-002, REQ-001/002, SCN-001 | `tests/e2e/runtime/claude-agent-background-bash-policy.e2e.test.ts` (gated `RUN_CLAUDE_E2E=1`) | The acceptance criterion names the AutoByteus server path. It follows the existing live Claude E2E pattern |
| (shared) | Resolves the PATH and SDK-bundled CLI candidates; builds a standalone env without parent Claude Code session vars | QR-001 | `tests/helpers/claude-cli-executable-candidates.ts` | Used by both live files for the two-CLI matrix |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/runtime-management/claude/client --no-watch` | server-ts | AC-001/005 env merge | Pass (26/26) | console |
| 2 | `pnpm exec vitest run tests/unit/runtime-management/claude/client tests/unit/agent-execution/backends/claude --no-watch` | server-ts | Preserved session lifecycle (mocked) | Pass, 130/131. 1 pre-existing failure, also on base | ledger C1 |
| 3 | `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/runtime-management/claude/client/claude-sdk-client-runtime-policy.integration.test.ts --no-watch` | server-ts, inherited Claude session env unset | AC-001/005/006 at the real CLI, QR-001 | Pass (2/2: CLI 2.1.281 + 2.1.280) | `api-e2e-evidence/c2-c3-pol-01-fix.log` |
| 4 | `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/e2e/runtime/claude-agent-background-bash-policy.e2e.test.ts --no-watch` | server-ts, model `haiku`, local CLI auth | AC-002, QR-001 | Pass (2/2) | `api-e2e-evidence/c4-c5-bg-01-fix.log` |
| 5 | `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/runtime-management/claude/client tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch` | Same | Regression: discovery, turns, resume, MCP, live interrupt | Pass for all live cases (7/7). 3 mocked-SDK websocket tests fail identically on base (pre-existing) | `api-e2e-evidence/c6-*.log` |
| 6 | Commands 3 and 4 with `claude-sdk-client.ts` reverted to `9267d11c8` | Temporary revert, restored with `git checkout` | The tests discriminate | Pass as control: both new tests fail on base. BG-01 reproduces `run_in_background: true` → `[killed]` | `api-e2e-evidence/c7-*` |
| 7 | Temporary AC-003 overrun probe (deleted) | Live | BEH-005 / AC-003 | Pass | `api-e2e-evidence/c8-ac003-overrun-probe.log` |
| 8 | Temporary user-settings `env` probe (deleted) | Temp `CLAUDE_CONFIG_DIR` | Design residual risk | Confirmed: a settings `env` overrides the policy (documented, accepted risk) | `api-e2e-evidence/c9-user-settings-env-probe.log` |
| 9 | `pnpm exec tsc -p tsconfig.json --noEmit` (non-TS6059 errors) | server-ts | New test files typecheck | Pass (0 errors) | console |
| 10 | Commands 3 and 4 without `RUN_CLAUDE_E2E` | Default run | Gate hygiene | Pass (4 skipped) | console |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are several independent live cases, each taking minutes, and a credible interruption risk.
- Canonical ledger path: `.../api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Unit client + backend suites | AC-001, AC-005 | Unit | vitest | 1 | pass counts |
| C2 | E2E-POL-01 on PATH CLI 2.1.281 | AC-001, AC-006, QR-001 | Real CLI → captured API request | vitest (gated) | 2 | Bash schema without `run_in_background`, 30 min max |
| C3 | E2E-POL-01 on bundled CLI 2.1.280 | Same | Same | `CLAUDE_CODE_EXECUTABLE_PATH=<bundled>` | 3 | Same |
| C4 | E2E-BG-01 on PATH CLI | AC-002 | Websocket → real SDK/CLI/model | vitest (gated) | 4 | Tool args, marker, same-turn result |
| C5 | E2E-BG-01 on bundled CLI | AC-002, QR-001 | Same | Same, with the env override | 5 | Same |
| C6 | Regression: live client integration + websocket interrupt E2E | Preserved behavior | Live | vitest (gated) | 6 | pass |
| C7 | Control on base (fix reverted) | Test discrimination | Live | Stash `src` change | 7 | E2E-POL-01 / E2E-BG-01 fail |
| C8 | AC-003 overrun probe | AC-003, BEH-005 | Live | Temporary probe | 8 | Visible timeout, no background |

## Post-Repository Confidence Scorecard

The repository checks here already include the gated live suites (commands 3-5). They exercise the real CLI and model, so the post-repository and final scores coincide. The execution report carries the final scorecard.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC-001/005 (unit + real CLI), AC-002 (live, both CLIs), AC-003 (live probe), AC-006 (the CLI's own advertised max, 1800000), AC-004 (docs paragraph present and accurate) | AC-006 is proven through the advertised schema/description, not a >30 min clamp run (as the AC allows) | A 30 min wait, explicitly not required |
| Changed-boundary execution directness | 95% | The real `ClaudeSdkClient.startQueryTurn` → real CLI; the captured Messages request shows the effective tool contract | None material | — |
| Cross-boundary integration realism and mock gap | 95% | Websocket → AgentStreamHandler → AgentRun → ClaudeAgentRunBackend → ClaudeSession → real SDK 0.3.280 → real CLI → real model | Only `haiku` and one run per CLI (model compliance can vary) | Repeat runs; other models |
| Environment, configuration, identity, and fixture fidelity | 95% | cli auth mode, both CLI executables, inherited parent-session env stripped, conflicting caller env overridden, user-settings override characterized | api-key auth mode is proven only in unit tests. The merge is the same object spread after `resolveSpawnEnvironment` | Live api-key run (needs a vault key) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Timeout overrun → visible failure in the turn, command terminated; base control reproduces `[killed]`; interrupt/resume live regression passes | — | — |
| User-surface, browser, and desktop-shell confidence | 95% | No UI change. The websocket stream the UI renders (TOOL_EXECUTION_* / TURN_COMPLETED / SEGMENT_CONTENT) is asserted directly | No browser rendering run (unchanged components) | Browser run: low gain |
| Durable regression coverage quality and relevance | 95% | Unit env tests (default CI) plus two gated live tests that detect CLI contract drift (REQ-003) and the AC-002 journey; the base control proves they discriminate | The live tests are gated (`RUN_CLAUDE_E2E=1`), the repository's convention for every Claude live test | — |

- Overall post-repository confidence: 95%
- Calculation method: simple average of the 7 categories
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: RSK-A, a user-settings `env` override (confirmed mechanism, documented, not present here). RSK-B, other CLI-process-scoped tools (Monitor/ScheduleWakeup/CronCreate) are still advertised, which is out of scope (builtin tool restriction ticket).

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` / `CLI`, using the real Claude CLI through the AutoByteus server-side stack (websocket → AgentRun → Claude backend → real `ClaudeSdkClient`)
- Specific gap: the unit tests mock the SDK `query` and cannot prove that the CLI honors the env on the pinned SDK 0.3.280 / CLI 2.1.280 and the PATH CLI 2.1.281.
- Browser-specific decision: Not required. The change is backend-only CLI spawn env. Tool events are the existing websocket contract, rendered by unchanged UI, and the websocket stream the UI consumes is asserted directly.

## Desktop Application Validation Decision

- Not applicable: no renderer or shell change.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| C7 | Revert the `src` change temporarily and run the new tests | Tests discriminate | Control only |
| C8 | Live probe: `sleep 40` with explicit `timeout` 5000 | BEH-005 visible timeout | Optional AC; depends on model compliance and CLI wording, so it's too brittle for durable coverage |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Actual 30-min command run | AC-006 explicitly does not require a 30 min wait | Low: the ceiling is proven from the CLI's own advertised schema | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Design escalation trigger "real run still shows `run_in_background` or `[killed]`" | Not fired | C2–C5: none on either CLI | — |
| Design escalation trigger "user-settings `env` override found in practice" | Not fired (the mechanism is confirmed, but no such config exists in practice; design already accepted and documented this risk) | C9; `~/.claude/settings.json` has no `env` block | Reported as a residual risk in the Pass handoff |
| Other CLI-process-scoped tools still advertised (Monitor, ScheduleWakeup, CronCreate, Workflow) | Out of scope (REQ-001 is Bash-only; builtin tool list owned by `claude-sdk-builtin-tool-restriction`) | C2/C3 tool capture | Reported as a residual risk |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (completed)
- Repository-Resident Durable Coverage Added: `Yes` (two gated live test files + one shared test helper)
- Post-repository confidence: 95%
- Broader validation decision: `Required`, executed as live CLI/agent runs inside the gated suites; `Pass`
- Reroute Required: `No`
