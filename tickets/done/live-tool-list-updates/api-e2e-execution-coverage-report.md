# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident you are, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/` unless absolute.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, code review CRR-005 Pass after the API-05 rework (IR-004, SR-010 / ARCH-REV-010)
- Prior round reviewed: round 1 (API-REV-001, Fail on API-05)
- Round 3 (delivery-stage Local Fix IR-005, CRR-007): `137ce572aa` changes only `SystemTaskNotificationSegment.spec.ts`; the branch was fast-forwarded to `origin/personal`. No source file changed since `5ee923081a` (`git diff --stat 5ee923081a 1c454e1ec1 -- '*/src/*' autobyteus-ts` is empty), and this round's tests are unchanged since `db27b28223`. So the round 2 results stand; API-05 was rerun on `1c454e1ec1` as a check (`API-05-round3-rerun.log`, "Tests  1 passed (1)"). The real Codex run (API-03) was rerun on `6823d55920`, the merge into `personal`: Pass. The guards and the spec are the implementation's checks (IR-005, `evidence/ir-005-localization-guard-fix.log`).
- Deviations from the investigation's plan, and why:
  - API-07 ran at the server level: a real Claude run's stream frames with auto-execute on and off, instead of a browser journey. The web renders tool rows per invocation id from these frames, so the frames are the direct evidence for "no extra rows".
  - API-04 (real Grok) is owed. The Grok account is at its free usage limit, and the user's credits are back tomorrow, when it runs.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `9e21e20f8a` (code `c8f6319838`) | macOS (Darwin 25.5.0), Node v22.23.1 | Studio server through `startStudioE2eRuntimeServer` (vitest e2e); real `codex app-server` 0.165.x, `gpt-5.6-luna` | Clean env (`env -i PATH HOME USER LOGNAME TMPDIR`); throwaway `CODEX_HOME` (empty `config.toml`, symlinked `auth.json`, removed); temp data folder |
| ENV-2 | `9e21e20f8a` and `5ee923081a` | same | real Grok CLI `grok 1.0.70 (f50904eaee6c) [stable]`, `grok-4.7` | Clean env, the user's Grok sign-in (account at its free usage limit); temp data folder |
| ENV-3 | `5ee923081a` (code `011275b49a`); round 1 at `9e21e20f8a` | same | Studio server (vitest e2e); scripted ACP agent (`tests/fixtures/grok-acp/fake-acp-agent.mjs`) as `GROK_BUILD_COMMAND` through a per-run wrapper | Clean env; temp data folder; no provider |
| ENV-4 | `5ee923081a` | same | Studio server (vitest e2e); real Claude Agent SDK, `haiku` | Clean env with the real HOME for the Claude sign-in; temp data folder |
| ENV-5 | `5ee923081a` plus this round's probe files (committed with this round) | same | Browser probe stack: headless Chrome (playwright-core) → Nuxt dev → built backend `autobyteus-server-ts/dist/app.js` (built from `5ee923081a`), scripted AGY CLI (`agy-failure-cli.mjs`, `linked_skills`) | Probe-owned temp data root, HOME, SQLite DB and free ports; viewport 1512×952, `en-US`; removed after the run |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | all (repository layer) | server typecheck/unit/integration, autobyteus-ts, web, architecture | Reused: IR-004 block in `evidence/local-checks.log` (typecheck 0; unit 7,336; integration 461, 0 failed; new `single-run-unsent-input-failure.integration.test.ts`) and the code reviewer's architecture rerun on `5ee923081a` (58/58, CRR-005); web and autobyteus-ts from IR-002/IR-003 | — | Pass | (implementation rows) | (implementation rows) | IR-004 changed only the server input-failure path (`git diff --name-only c8f6319838 011275b49a`: server src/tests/docs); web and autobyteus-ts are untouched since IR-002/IR-003 |
| API-02 | AC-001, AC-003, AC-004 (native, Claude, AGY) | real runtimes through the real server | Reused: `evidence/real-runs/` | — | Pass | (implementation rows) | (implementation rows) | IR-003/IR-004 touched no single-run apply path |
| API-03 | AC-002, AC-003, AC-004, REQ-006, DEC-004 (Codex) | real Codex through the real server | `env -i PATH HOME USER LOGNAME TMPDIR CODEX_HOME=<throwaway> RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=codex_app_server LIVE_TOOL_LIST_MODEL=gpt-5.6-luna LIVE_TOOL_LIST_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/live-tool-list-updates.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-03-codex-live-run.log`, `API-03-live-tool-list-codex_app_server.json` | "Tests  1 passed (1)"; turn 2 notice "Now available: list_project_tasks.", reply "DONE-2 OKAPI-8545"; turn 3 "No longer available: list_projects." | Round 1 Pass. Rerun in round 3 on `6823d55920` (the merge into `personal`; no non-ticket change since `1c454e1ec1`), codex-cli 0.166.0, when the user's Codex limit was back: Pass. `API-03-round3-codex-live-run.log`, `API-03-round3-live-tool-list-codex_app_server.json`: "Tests  1 passed (1)", reply "DONE-2 OKAPI-4865", notices "Now available: list_project_tasks." and "No longer available: list_projects." |
| API-04 | AC-002, AC-003 (real Grok) | real Grok CLI | Same command with `LIVE_TOOL_LIST_RUNTIME=grok_build LIVE_TOOL_LIST_MODEL=grok-4.7` | ENV-2 | Not Tested (owed) | `API-04-grok-live-blocked.log`, `API-04-grok-limit-stream-frames.log` | "You’ve reached your free Grok Build usage limit for now."; `ERROR {"code": "ACP_PROMPT_FAILED", "message": "Rate limited: API error (status 429 Too Many Requests): subscription:free-usage-exhausted …` | The account is out of free usage. The user's credits are back tomorrow; it runs then and is added here. The frame capture also closes FU-003: the refusal reaches the user's stream 1.26 s after the message |
| API-05 | AC-007, REQ-010, SCN-004b, AC-008 | real server, run WebSocket (what the web renders), Grok reopen (new `grok agent stdio` process, `session/load`) | `env -i PATH HOME USER LOGNAME TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts --no-watch`. Two Grok runs A, B; A message 1; save A's definition with `list_project_tasks` added; the next agent process stops before `session/load`; A message 2; B message 1; A message 3 | ENV-3 | Pass | `API-05-round2-rerun.log`; round 1: `API-05-reopen-failure-e2e.log`, `API-05-failed-send-frames.jsonl` | "✓ fails the message with the plain message, touches no other run, and retries at the next message"; "Tests  1 passed (1)"; server "ACP_REOPEN_FAILED: … Error: ACP connection closed" | Round 1 Fail resolved by IR-004. The test is unchanged since `ff1aaa2d60` |
| API-06 | AC-001, AC-003, AC-006, REQ-006, REQ-007, SCN-001b | browser: Agents → Edit → Tools → Save Changes while the run is open; the run's conversation | `pnpm -C autobyteus-web test:e2e:tool-list-updates --output-dir <fresh dir>` (case `TLU-001`; the server built first: `pnpm -C autobyteus-server-ts build`). Chat from the Agents page (tools: list_projects); `CALL_TOOL` list_projects; Edit: add list_project_tasks, Save; call it; Edit: remove list_projects, Save; call it; stop the run; Edit: add list_projects back, Save; call it in the restored run | ENV-5 | Pass | `API-06-tool-list-browser-probe.json`, `API-06-TLU-001-card-added.png`, `API-06-TLU-001-card-removed.png`, `API-06-TLU-001-card-restored.png`, `API-06-replay-trace-order.log` | JSON `cardsAfterRestore`: "Tools updatedNow available: list_project_tasks.", "Tools updatedNo longer available: list_projects.", "Tools updatedNow available: list_projects."; `refusedCall.error`: "Tool is not enabled for this session", code -32602; `browserErrors: []`; screenshot `card-removed`: "An Error Occurred / Tool is not enabled for this session" below the card | First attempt failed on the probe's own label read (`innerText` returns the CSS-uppercased "TOOLS UPDATED"; the card was shown, screenshot); fixed in the probe (textContent). After a reload, the second card is shown above its message (failed turn, no reply): FU-004, existing replay behavior |
| API-07 | Code review hint: Claude's approved events for Agent Tools (`agent_tools_enabled`) | real Claude run's stream frames | Temporary vitest e2e (the live test's setup, one turn "Call the list_projects tool once, then reply with exactly: DONE-1", frame capture), run with `autoExecuteTools` true and false; removed after the run | ENV-4 | Pass | `API-07-claude-tool-frames.log` | Both runs: `SEGMENT_START`, `TOOL_EXECUTION_STARTED`, `TOOL_APPROVED`, `SEGMENT_END`, `TOOL_EXECUTION_SUCCEEDED`, all with one id `toolu_…`; reason `auto_execute_tools_enabled` vs `agent_tools_enabled`; no `TOOL_APPROVAL_REQUESTED`; projection one `tool_call` | With auto-execute off, an Agent Tools call shows exactly as an auto-executed tool: one row, no approval prompt |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (immediate runtimes get the change; notice; card) | Yes | API-06 (UI edit → card → tool works, AGY), API-02, API-01 | Proven | — |
| AC-002 (Codex/Grok at the next message, conversation kept) | Yes | API-03 (real Codex), API-05 (Grok reopen through the real server), API-01 | Proven. The real Grok CLI run (API-04) is owed tomorrow | — |
| AC-003 (removed tool refused) | Yes | API-06 ("Tool is not enabled for this session"), API-02, API-03 | Proven | — |
| AC-004 (never offered) | Yes | API-02, API-03 | Proven | — |
| AC-005 (no change, no noise) | No | API-01; API-06 (no card before any change) | Proven | — |
| AC-006 (restored run hears the change) | No | API-06 (stopped run, edit, restore: third card, tool works), API-01 | Proven | — |
| AC-007 (failed reopen: plain failed message, not sent, retry, nothing else stopped) | Yes | API-05; Team members: API-01 (`team-member-reopen-failure`) | Proven | — |
| AC-008 (only the changed definition's runs) | No | API-05 (run B untouched), API-01 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | API-01…API-07 | Real Grok CLI owed | API-04 tomorrow |
| Changed-boundary execution directness | 90% | 95% | real Codex/Claude/AGY runs; real server + stream; real browser | Grok CLI scripted | API-04 |
| Cross-boundary integration realism and mock gap | 85% | 90% | API-05 replays recorded Grok ACP traffic; scripted AGY calls the real Agent Tools endpoint | The real Grok CLI's handling of a reloaded session with new MCP servers | API-04 |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean env, throwaway CODEX_HOME, probe-owned stack | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | API-05 (failure, retry, other run), API-06 (refusal, restore) | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | API-06 (card, edit path, refusal display), API-07 | Failed-message display covered by the stream frame plus the existing web `ERROR` handling, not rendered in the browser; reload placement FU-004 (cosmetic, existing) | — |
| Durable regression coverage quality and relevance | 90% | 95% | `tool-list-reopen-failure.e2e.test.ts`, probe case `TLU-001` | — | Test-code review |

- Overall post-repository confidence: 88%
- Overall final confidence: 94%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` through AutoByteus's own boundaries. The real Grok CLI part of AC-002 is owed (API-04)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%); the gap is the real Grok CLI run, which API-04 closes tomorrow
- Confidence-limiting residual risks: the real Grok CLI on `session/load` with changed MCP servers

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed (API-06, API-07); one part owed (API-04)
- Execution mode: `Browser` (API-06), `Live API` (API-03, API-07; API-04 owed)
- Confidence gap or residual risk it addresses, and the expected gain: the user's real path (edit while a run is open → card → tool works/refused → restore), Claude row noise, and the real Grok CLI
- Browser validation needed, and why or why not: yes, for the card and the edit path; done (API-06)
- If `Blocked`: API-04 only. The Grok account is out of free usage ("subscription:free-usage-exhausted"); the user's credits are back tomorrow

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `seen_tool_names.json`, additive, Directly Usable — No Migration
- Representative existing data used: runs created without the record; the record written by the current code and read back on restore (API-06)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-03 (record written), API-06 (stopped run restored with the record: one card naming only the change; `API-06-replay-trace-order.log` shows `{"version": 1, "toolNames": […]}`), API-01
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
| `autobyteus-server-ts/tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts` | Added (round 1, `ff1aaa2d60`; unchanged) | API-05 | — |
| `autobyteus-web/tests/e2e/tool-list-update-cases.mjs` | Added | API-06 | — |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated: registers `TLU-001`; sets `AGY_FAKE_TOOL_LOG` and passes `agyToolCalls` (the scripted agent's tool-call log) | API-06 | — |
| `autobyteus-web/package.json` | Updated: `test:e2e:tool-list-updates` | API-06 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Grok CLI (API-05) | Recorded ACP fixtures (`prompt.jsonl`, `load.jsonl`) replayed by `fake-acp-agent.mjs`; a per-run wrapper picks the fixture per process and stops one process before `session/load` | The failure must be forced; real Grok is out of free usage | The real CLI's reload with new MCP servers (API-04, owed) |
| AGY CLI (API-06) | `agy-failure-cli.mjs` (`linked_skills`): calls the real Agent Tools MCP endpoint for `CALL_TOOL:{…}` | The probe stack runs without credentials; AGY's real run is covered by API-02 | The model's choice of tools is typed by the user, not decided by a model |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Throwaway `CODEX_HOME` (API-03) | Yes | removed | Done |
| Temp data folders (API-03…05, API-07, FU-003 capture) | Yes | removed by the tests' `afterAll` | Done |
| Temporary frame-capture tests (`tmp-claude-approved-frames`, `tmp-grok-limit-frames`) | Yes | deleted after the runs; never committed | Done |
| Probe stacks (API-06, two runs and one `--keep` rerun) | Yes | Chrome closed, backend and Nuxt stopped (SIGTERM receipts in the evidence JSON); the `--keep` root removed after its trace was copied | Done |
| `autobyteus-server-ts/dist/` (rebuilt for the probe) | Yes | build output; not committed | Kept (build output) |
| `/tmp/ab324e2e/` scratch | Yes | evidence copied into the ticket | Kept (scratch) |

## Preliminary Classification (On `Fail`)

N/A: no failure this round. Round 1's API-05 failure is resolved (see the revision record).

## Latest Authoritative Result

- Result: `Pass` for every case that can run now. The real Grok CLI run (API-04) is owed: it runs tomorrow, when the user's credits are back, and its result is added here and sent on.
- Criteria not proven, or parts only the user can check: None outside API-04's real-CLI part of AC-002
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Notes: FU-003 closed (not a defect). FU-004 added (reload placement of a card after a failed turn; existing replay behavior).
