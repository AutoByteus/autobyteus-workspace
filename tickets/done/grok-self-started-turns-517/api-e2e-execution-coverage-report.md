# API/E2E Execution Coverage Report — grok-self-started-turns-517

## Round

- Coverage investigation: `tickets/in-progress/grok-self-started-turns-517/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/grok-self-started-turns-517/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/grok-self-started-turns-517/api-e2e-test-progress.md`
- Round and trigger: round 1; code review pass CRR-002 (reviewed route, Medium/High)
- Prior round reviewed: None
- Deviations from the investigation's plan: None. The new gap case was also repeated 3 times alone (timing-based).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/evidence/` (API-* files; IMP-* from implementation)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `cc2701af8a` + this round's test additions (committed after) | macOS 26.5.2 arm64; load 51–71 from other work | Node 22.23.1; in-process studio server; scripted Grok CLI (`tests/fixtures/grok-acp/fake-acp-agent.mjs` replaying the recorded `prompt` opening plus `grokProviderTurnScript` rows) | no provider, no credentials |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-004; items 0–3 (unit) | ACP connection (wire order, malformed frames, handler errors, permission requests), session rules over the real connection, Grok signals, memory | Reused: IMP-05, IMP-07 | — | Pass | (handoff) | (handoff) | HEAD differs from IMP-05's content only by the removed unused type; IMP-07 reran the session cases and the typecheck on it |
| API-R2 | AC-004 | Grok compaction replay; DeepSeek scripted provider (real dsh) | Reused: IMP-03 | — | Pass | (handoff) | (handoff) | the connection change on both ACP agents |
| API-R3 | AC-005 | live Grok 1.0.89 | Reused: IMP-04 | — | Pass | (handoff) | (handoff) | notice `system.grok_provider_turn`, "Background task … completed (exit code: 0)", `TURN_COMPLETED`; no code change since but the type removal |
| API-01 | AC-001, AC-002, AC-003, AC-004, AC-006 | real server, WebSocket, GraphQL, scripted Grok | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-01-grok-replay/vitest.log` | `Tests  10 passed (10)`: the 6 existing cases (catalog, list_dir turn and usage, permission request → run_bash approval, denied run_bash, authentication error, process exit mid-turn) and the 4 provider-turn cases | `Hook timed out in 60000ms` in `afterAll` (`app.close()` stall under the FSEvents backlog, autobyteus-517 FU-002; the implementation's control shows it on the existing cases alone) |
| API-02 | AC-006 (gap variant) | the hand-over's narrowest window through AgentRun | new case "keeps a message sent in the hand-over's gap …" (in API-01's run) and 3 runs alone with `-t "hand-over's gap"` | ENV-1 | Pass | `API-01-grok-replay/vitest.log`, `API-02-gap-case-repeat.log` | ✓ "keeps a message sent in the hand-over's gap (after Grok ended the input prompt, before its response) held through Grok's own turn (AC-006)"; repeat `Tests  1 passed \| 9 skipped` ×3 | The message's `AGENT_COMMAND_ACK` (accepted) comes before the input turn's end, so it arrived while Grok had ended the input prompt and queued its own but before the response; it is answered only after Grok's own turn ended; no failure; 2 `session/prompt` |
| API-03 | — | typechecks after the test additions | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-03-typechecks.log` | `(baseline 1006 in 315 files)` `PASS`; `(baseline 86 in 36 files)` `PASS` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R1 (session unit), API-01 (order a), API-R3 (live) | Proven | — |
| AC-002 | Yes | API-R1, API-01 (held during Grok's turn; Stop → `session/cancel` → interrupted) | Proven | — |
| AC-003 | Yes | API-R1 (memory unit), API-01 (notice in `getRunProjection` after the run) | Proven | — |
| AC-004 | Yes | API-R1 (connection and ACP units), API-R2 (Grok compaction replay, DeepSeek scripted provider), API-01 (the 6 existing Grok replay cases) | Proven | — |
| AC-005 | No (waivable) | API-R3 | Proven (live run passed; not waived) | — |
| AC-006 | Yes | API-R1, API-01 (order b), API-02 (gap variant b') | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 97% | every AC directly; the live run | — | — |
| Changed-boundary execution directness | 92% | 96% | the real connection under the session units; the real server and AgentRun in the E2E | the gap case's timing is set by the scripted agent | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | scripted frames are the probes' recorded orders; live Grok (IMP-04) | DeepSeek live not run (scripted dsh is the real binary over a scripted provider) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | real CLI paths, recorded fixtures, clean data roots | Grok versions change (RSK-004 for the SDK) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 95% | Stop, process exit mid-turn, authentication error, malformed frames, handler errors, the gap | RSK-001 not designed for; RSK-003 not producible | — |
| User-surface, browser, and desktop-shell confidence | 90% | 92% | stream events identical in shape to Claude's provider turns; the web renders this sender generically | no browser run of a Grok provider turn | a browser probe on a scripted Grok run |
| Durable regression coverage quality and relevance | 92% | 96% | four provider-turn E2E cases incl. the gap; connection and session units | — | — |

- Overall post-repository confidence: 90.6%
- Overall final confidence: 95.1%
- Calculation method: simple average of the seven final scores.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: RSK-001 (a client prompt at the instant Grok wakes; not designed for), RSK-003 (provider content before the input response; not produced by Grok), RSK-004 (SDK upgrades: rerun the connection cases and ACP suites).

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond the E2E and the reused live run
- Execution mode: `None` beyond server E2E
- Gap considered: browser rendering of the provider turn. The web receives the same event types and shapes as Claude's provider turns (TURN_STARTED without a user message, `SYSTEM_TASK_NOTIFICATION`, segments, TURN_COMPLETED); `SystemTaskNotificationSegment.vue` renders this sender generically (it special-cases only skill, tool-list and runtime-switch senders); history uses the same projection. Expected gain small.
- Cases that exercise the real changed boundary: API-01, API-02 (real server, real connection, real session, AgentRun, WebSocket, GraphQL projection), API-R3 (real Grok).

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`; compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/grok-fake-cli.ts` (`orderBGap`) | Added: the hand-over-gap frame order | API-02 | — |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` ("keeps a message sent in the hand-over's gap …") | Added | API-02 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Grok CLI (E2E) | scripted ACP agent replaying the probes' recorded frame orders | deterministic orders, no Grok usage; the live run is IMP-04 | the gap's timing is the script's |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, fixtures, data roots | Yes | the suite's teardown (its `afterAll` close stalls under load and is cut by the hook timeout) | no process left |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: None.
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Medium/High: proportional test-code review of the added test code)
- Notes: the code reviewer's own report edits were uncommitted in the worktree when this round started; this round committed only its own files.
