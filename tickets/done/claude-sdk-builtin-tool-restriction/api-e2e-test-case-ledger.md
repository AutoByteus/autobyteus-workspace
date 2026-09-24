# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction` (`12261026b`)
- Coverage investigation: `tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-revision-record.md`
- Ledger scope and reason it is required: 13 independent cases, including a long-running real-CLI E2E probe executed twice (two CLI executables)
- Last updated: 2026-09-24

## Planned Cases

| Case ID | Case / Journey | REQ / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-001 | SDK client option contract | AC-001, AC-002, AC-006 | unit | `vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | 1 | |
| VAL-002 | Claude/runtime regression units | AC-004, AC-005 | unit | `vitest run tests/unit/runtime-management tests/unit/agent-execution/backends/claude` | 2 | |
| VAL-003 | Base repro of the 2 failures | — | unit | same two files with base `claude-sdk-client.ts` | 3 | |
| VAL-004 | Build typecheck | — | build | `tsc -p tsconfig.build.json --noEmit` | 4 | |
| VAL-005 | Docs policy | AC-007 | docs | review | 5 | |
| VAL-006 | Team run ping turn tool surface / no agent listing / skill listed | AC-003, AC-004, AC-005 | real server → real CLI → fake API | temp probe | 6 | |
| VAL-007 | Forced native calls fail; Read/Skill/MCP succeed; AutoByteus delivery | AC-003, AC-004, AC-005 | same | temp probe | 7 | |
| VAL-008 | Receiving member turn policy | AC-003, AC-004 | same | temp probe | 8 | |
| VAL-009 | Next-turn resume keeps policy + history | UC-001 | same | temp probe | 9 | |
| VAL-010 | Pre-change session resumed with the new tool set | Persisted Data, REQ-001/003 | real SDK/CLI | temp probe | 10 | |
| VAL-011 | Model discovery unaffected | AC-006 | GraphQL → CLI | temp probe | 11 | |
| VAL-012 | VAL-006..011 with bundled pinned CLI 2.1.280 | QR-001 | same | temp probe + `CLAUDE_CODE_EXECUTABLE_PATH` | 12 | |
| VAL-013 | SDK 0.3.281 re-check | R-001 | real SDK 0.3.281 | `probe4.mjs` | 13 | |

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next / Unresolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | VAL-001 | 2026-09-24 05:48 | Completed | `pnpm exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | all pass | 18/18 pass | Pass | `probe-evidence/api-e2e-r1-sdk-client-unit.log` | — |
| 2 | VAL-002 | 2026-09-24 05:50 | Completed | `pnpm exec vitest run tests/unit/runtime-management tests/unit/agent-execution/backends/claude` | only pre-existing failures | 145/147; fails: codex-app-server-client env test, claude-session "switches an opened but unconfirmed first query to exact resume after interrupt" | Pass (task scope) | `probe-evidence/api-e2e-r2-claude-runtime-unit.log` | VAL-003 |
| 3 | VAL-003 | 2026-09-24 05:52 | Completed | base `9267d11c8` `claude-sdk-client.ts` temporarily restored, two files rerun, HEAD restored (`git status` clean for src) | same failures | same 2 fail on base (27/29) | Pass (pre-existing confirmed) | `probe-evidence/api-e2e-r3-base-failures.log` | — |
| 4 | VAL-004 | 2026-09-24 05:58 | Completed | `pnpm exec tsc -p tsconfig.build.json --noEmit` | exit 0 | exit 0 | Pass | `probe-evidence/api-e2e-r4-tsc-build.log` | — |
| 5 | VAL-005 | 2026-09-24 05:58 | Completed | review `docs/modules/agent_execution.md` L438-454 | new policy; no "Do not replace … tools allowlist" | new paragraph lists both lists, MCP unaffected, discovery separate, re-verify on SDK upgrade; stale guidance absent (grep empty) | Pass | commit diff | — |
| 6 | VAL-006..011 | 2026-09-24 06:05 | Started | temp probe `tests/.tmp/claude-builtin-tool-policy.fake-api.probe.test.ts`, PATH `claude` 2.1.281 | — | — | — | — | — |
| 7 | VAL-006..011 | 2026-09-24 06:06 | Checkpoint | same | — | Harness errors: `TeamMemberInput.refType` no longer exists (the gated live team E2E is stale too, OBS-1); fake API keyed off the last message, but CLI 2.1.281 appends a `system`-role message. VAL-011 discovery worked; VAL-010 resumed tools already exactly 10 | Not final | `probe-evidence/api-e2e-r5-probe-path-cli.log` | fix harness |
| 8 | VAL-006..011 | 2026-09-24 06:08 | Checkpoint | harness fixed | — | All real-path assertions met. Two probe-assertion corrections: the skill listing shows names only (check the name), and assistant-role leak hits are the probe's own forced `Agent` args | Not final | same | adjust assertions |
| 9 | VAL-006..011 | 2026-09-24 06:10 | Completed | PATH `claude` 2.1.281 | 10 built-ins + 3 MCP; no listing; 6 forced names fail; Read/Skill/MCP succeed; delivery to /pong; pong + next turn same; pre-change session resumes with 10; discovery OK | as expected (2/2 tests) | Pass | `probe-evidence/api-e2e-real-server-claude-code-2.1.281-PATH.json` | RR-1 noted (old listing replayed from pre-change history) |
| 10 | VAL-012 | 2026-09-24 06:11 | Completed | same probe, `CLAUDE_CODE_EXECUTABLE_PATH`=bundled 2.1.280 | same as seq 9 | identical (2/2) | Pass | `probe-evidence/api-e2e-real-server-claude-code-2.1.280-bundled.json`, `api-e2e-r6-probe-bundled-cli.log` | — |
| 11 | VAL-013 | 2026-09-24 06:12 | Completed | `probe4.mjs` with `PROBE_NM=/tmp/sdk281/node_modules` and `impl-build-query-options.json`, sanitized env | 10 + 3 MCP; forced 5 fail; Read/MCP ok | as expected | Pass | `probe-evidence/api-e2e-probe4-sdk-0.3.281-summary.txt` | — |

## Re-entry And Reconciliation

- Last durably recorded event: seq 11
- Last completed case and result: VAL-013 Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: none (temp probe removed; transcripts cleaned)
- Reconciled into execution coverage report: `Yes` (`api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation)
