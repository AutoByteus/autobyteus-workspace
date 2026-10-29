# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident you are, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/` unless absolute.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-003 Pass (reviewed route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-04 (real Grok) is `Blocked`: the Grok account is at its free usage limit.
  - API-06 and API-07 (browser) are `Not Tested` this round. API-05 failed, and the fix may change the run stream and the web; they run in the next round, on the fixed code.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. On this `Fail` the failure-origin review comes first; the new test (`tool-list-reopen-failure.e2e.test.ts`) is attached.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `9e21e20f8a` (code `c8f6319838`) | macOS (Darwin 25.5.0), Node v22.23.1 | Studio server through `startStudioE2eRuntimeServer` (vitest e2e), real Codex `codex app-server` 0.165.x, model `gpt-5.6-luna` | Clean env (`env -i PATH HOME USER LOGNAME TMPDIR`), throwaway `CODEX_HOME` (empty `config.toml`, symlinked `auth.json`, removed after the run); AutoByteus data in a temp folder, removed |
| ENV-2 | `9e21e20f8a` | same | Real Grok CLI `grok 1.0.70 (f50904eaee6c) [stable]`, model `grok-4.7` | Clean env, user's Grok sign-in; temp data folder |
| ENV-3 | `9e21e20f8a` | same | Studio server (vitest e2e); scripted ACP agent (`tests/fixtures/grok-acp/fake-acp-agent.mjs`) as `GROK_BUILD_COMMAND` through a per-run wrapper | Clean env; temp data folder; no provider |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | all (repository layer) | server typecheck/unit/integration, autobyteus-ts, web, architecture | Reused: implementation handoff IR-002 / IR-003 checks (`evidence/local-checks.log`) and the code reviewer's architecture rerun (58/58, `code-review-report.md` CRR-003) | — | Pass | (implementation rows) | (implementation rows) | Ran on `c8f6319838`; `git diff --name-only c8f6319838 9e21e20f8a` touches only `tickets/` |
| API-02 | AC-001, AC-003, AC-004 (native, Claude, AGY) | real runtimes through the real server | Reused: `evidence/real-runs/` (native, AGY, Claude after CR-002) | — | Pass | (implementation rows) | (implementation rows) | IR-003 changed only the Team-member observer, not the single-run paths these exercise |
| API-03 | AC-002, AC-003, AC-004, REQ-006, DEC-004 (Codex) | real Codex through the real server: GraphQL save, run WebSocket, Agent Tools MCP, thread reopen | `env -i PATH HOME USER LOGNAME TMPDIR CODEX_HOME=<throwaway> RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=codex_app_server LIVE_TOOL_LIST_MODEL=gpt-5.6-luna LIVE_TOOL_LIST_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/live-tool-list-updates.e2e.test.ts --no-watch` (from the worktree root) | ENV-1 | Pass | `evidence/api-e2e/API-03-codex-live-run.log`, `evidence/api-e2e/API-03-live-tool-list-codex_app_server.json` | "Tests  1 passed (1)"; turn 2 notice "Now available: list_project_tasks.", reply "DONE-2 OKAPI-8545" (codeword from turn 1: conversation kept across the reopen); turn 3 notice "No longer available: list_projects.", reply "DONE-3"; seen record `['delegate_task','list_project_tasks','send_message_to']` | Codex limit checked first without a model turn (`account/rateLimits/read`: `ordinaryUsageAllowed: true`) |
| API-04 | AC-002, AC-003 (Grok) | real Grok | Same command with `LIVE_TOOL_LIST_RUNTIME=grok_build LIVE_TOOL_LIST_MODEL=grok-4.7 LIVE_TOOL_LIST_TURN_TIMEOUT_MS=120000`; then, in an empty folder, `grok -p "Reply with exactly: OK" --model grok-4.7` | ENV-2 | Blocked | `evidence/api-e2e/API-04-grok-live-blocked.log` | "Timed out waiting for DONE-1"; "You’ve reached your free Grok Build usage limit for now." | Provider limit, not product behavior. The Grok reopen path itself runs in API-05 (scripted agent, real server). The run showed no error for the refused prompt: FU-003 |
| API-05 | AC-007, REQ-010, SCN-004b, AC-008 | real server, run WebSocket (what the web renders), Grok reopen (new `grok agent stdio` process, `session/load`) | `env -i PATH HOME USER LOGNAME TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts --no-watch`. Steps: two Grok runs A, B (different definitions); A message 1; save A's definition with `list_project_tasks` added; make the next agent process stop before `session/load`; A message 2; B message 1; A message 3 | ENV-3 | **Fail** | `evidence/api-e2e/API-05-reopen-failure-e2e.log`, `evidence/api-e2e/API-05-failed-send-frames.jsonl` | Log: "AssertionError: the run's stream shows the failed message: expected [] to deeply equal [ { code: StringMatching{…}, …(1) } ]"; server "ACP_REOPEN_FAILED: … Error: ACP connection closed". Frames for message 2: `AGENT_INPUT_STATE` entry `"state": "queued"`, `AGENT_COMMAND_ACK` `"accepted": true`, `AGENT_INPUT_STATE` `"entries": []`, `AGENT_STATUS` `"status": "idle"`; no `ERROR` | See Failure Detail below. With that check soft (run 3), it was the only failure: message 2 not sent (A's processes `[initialize, session/new, session/prompt]`, `[initialize]`), no notice, B untouched (one process, no `session/load`), message 3 reopened (`[initialize, session/load, session/prompt]`) with "Now available: list_project_tasks." and the message sent |
| API-06 | AC-001, AC-003, AC-006, REQ-007, SCN-001b | browser probe | — | — | Not Tested | — | — | Deferred to the next round (the API-05 fix may change the stream and the web) |
| API-07 | code review hint (Claude approved events) | browser, Claude run view | — | — | Not Tested | — | — | Same |

### Failure Detail (API-05)

- Expected (REQ-010, AC-007; design-spec "Return Or Event Spine(s)", failure bullet): the message whose reopen failed "shows as failed with that error, as any failed message does": "Couldn't give this run its new tools (<cause>). Send your message again to retry, or stop and resume the run."
- Observed on a single Grok run: the reopen fails (`ACP connection closed`), and the dispatch returns `RUNTIME_SESSION_REOPEN_FAILED` with that message. The run's stream then only drops the queued entry (`AGENT_INPUT_STATE` `entries: []`) and goes `idle`. The `SEND_MESSAGE` ack was already sent at admission with `accepted: true`. No `ERROR` frame and no rejected ack follow. To the user, the message vanishes with no error.
- Why the web shows nothing: `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts` shows an error only for an `ERROR` frame (`case 'ERROR'` → `handleError`) or a `SEND_MESSAGE` ack with `accepted: false` (`:152-163`). `AGENT_INPUT_STATE` only reconciles the queue.
- Where it stops on the server: `agent-run-input-admission-state.ts:218-230` `failEntry` notifies the lifecycle observer. `AgentRunCommandCoordinator.applyInputLifecycle` (`agent-run-command-coordinator.ts:169-176`) then calls `registry.markFailed(…)`, which only records the command state (`agent-run-command-registry.ts:82-90`, `transitionTerminal`). Nothing is published to the run's stream. The design assumed this path "shows it the way it shows every failed message today, on single runs" (design-spec, failure bullet). That holds for Team members, which IR-003 made publish a run `ERROR`, but not for single runs.
- Scope: this affects Codex and Grok single runs alike, since both return the same failed dispatch. Any other post-admission dispatch failure on a single run likely goes through the same silent path. I did not separately reproduce that on base; the reviewer decides whether that part is pre-existing.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (immediate runtimes get the change, notice, card) | Yes | API-01, API-02 | Proven (server and component level). The rendered card in a real run is planned in API-06 for the next round | — |
| AC-002 (Codex/Grok at the next message, conversation kept) | Yes | API-03 (real Codex), API-05 (Grok reopen through the real server, scripted agent), API-01 | Proven for Codex. Grok: proven with the scripted agent; the real Grok CLI is blocked (API-04) | — |
| AC-003 (removed tool refused) | Yes | API-02, API-03, API-01 | Proven | — |
| AC-004 (never offered) | Yes | API-02, API-03 | Proven | — |
| AC-005 (no change, no noise) | No | API-01 | Proven (repository) | — |
| AC-006 (restored run hears the change) | No | API-01 | Proven (repository integration); the browser journey is planned in API-06 | — |
| AC-007 (failed reopen: message fails with the plain message, not sent, next message retries, nothing else stopped) | Yes | API-05 | **Not Proven**: on single runs the failure is not shown. Not sent, no notice, other run untouched, and retry are proven. Team members: API-01 (`team-member-reopen-failure` integration) | — |
| AC-008 (only the changed definition's runs) | No | API-05 (run B untouched), API-01 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | 50% | API-01…API-05 | AC-007 fails on single runs | Fix, then rerun API-05 |
| Changed-boundary execution directness | 90% | 90% | API-03 real Codex; API-05 real server + stream | Real Grok CLI blocked | Rerun API-04 when Grok has credit |
| Cross-boundary integration realism and mock gap | 85% | 85% | API-03; API-05 replays recorded Grok ACP traffic | Grok scripted, not live | Same |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Clean env, throwaway CODEX_HOME, recorded fixtures | Grok fixtures recorded without MCP servers (ready status emulated) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 50% | 50% | API-05 | The user-visible failure is missing | Fix |
| User-surface, browser, and desktop-shell confidence | 50% | 50% | stream frames (API-05) | API-06/API-07 not run; card not rendered in a real run yet | Next round |
| Durable regression coverage quality and relevance | 90% | 90% | new `tool-list-reopen-failure.e2e.test.ts` | Asserts the user-visible outcome independent of the fix's frame choice | Test-code review |

- Overall post-repository confidence: 72%
- Overall final confidence: 72%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-007)
- Any final applicable category below `90%`: `Yes`: requirement proof, integration realism, failure evidence, user surface
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: AC-007 single-run display; real Grok unproven; browser journeys pending

## Broader Validation Decision (Mandatory)

- Decision: `Required` (API-06, API-07, in the next round)
- Execution mode: `Browser` (probe-owned stack)
- Confidence gap or residual risk it addresses, and the expected gain: the rendered "Tools updated" card, the Agents → Edit → Save path while a run is open, the failed message's display after the fix, and Claude approved-event noise
- Browser validation needed, and why or why not: yes, for the user surface; deferred because the API-05 fix may change it
- If `Blocked`: the real Grok CLI (API-04): free usage limit reached; a direct one-line `grok -p` confirmed it

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `seen_tool_names.json`, additive, Directly Usable — No Migration
- Representative existing data used: runs created without the record (each new run starts without it), and the API-03 record written by the current code
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-03 (record `{version: 1, toolNames: [...]}` read back), API-01 (restore integration)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts` | Added | API-05 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

The new test fails today on its first visibility check, by design: it asserts what the user must see. It is not gated and needs no provider.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Grok CLI (API-05) | Recorded ACP fixtures (`prompt.jsonl`, `load.jsonl`) replayed by `fake-acp-agent.mjs`; a per-run shell wrapper picks the fixture per process and stops one process before `session/load` | The failure must be forced; real Grok is at its limit | The agent's own handling of a reloaded session with new MCP servers is not exercised (API-04) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Throwaway `CODEX_HOME` (API-03) | Yes | removed | Done |
| Temp AutoByteus data folders (API-03…05) | Yes | removed by the tests' `afterAll` | Done |
| Scripted Grok processes | Yes | ended with the runs; `pgrep -fl fake-grok-cli` empty afterwards | Done |
| `/tmp/ab324e2e/` (scratch logs, rate-limit script, `grokprobe`) | Yes | kept until handoff; evidence copied into the ticket | Kept (scratch) |
| Temporary frame-dump `console.log` in the API-05 test (diagnostic run 2) and `expect.soft` (run 3) | Yes | reverted; the committed test has neither | Done |

## Preliminary Classification (On `Fail`)

- `Design Impact`: the design says the single-run failure shows "the way it shows every failed message today, on single runs and Team members alike, because it is the same command-failure path". On single runs, that path publishes nothing to the run's stream. Making it visible means choosing the display path (for example a run `ERROR` as for Team members, or a failed input state), which is a design decision. It could be a bounded `Local Fix` if the reviewer finds an existing single-run failure channel the backend should have used.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-007 (single runs). Real Grok (API-04) is blocked by the provider limit. API-06 and API-07 are not run yet.
- Preliminary classification and recommended owner: `Design Impact`, Solution Designer, via the code reviewer's failure-origin review
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes: FU-003 (a Grok provider refusal showed no error) is recorded in `follow-ups.md`.
