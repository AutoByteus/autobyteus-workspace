# API-F-020 — Real Codex task-Team peer call rejects at the current bound session

## Classification

- Result: **Fail**
- Preliminary owner: implementation source, subject to focused `code_reviewer` failure-origin review
- Trigger: CRR-061 required a deterministic capability probe plus current real provider rows after reclassifying voluntary LLM omission as nonblocking prompt/model variance.
- Critical scenario: `API-LIVE-028-CODEX-TASK-PEER-BOUND-001`
- Requirement links: R-023, R-026, R-047, R-048; BEH-005/DS-010 distinction retained.

## Expected

Inside the real active task Team, the Codex-bound `student_one` session calls `send_message_to` with `recipient_address: "./student_two"` and exact content `TASK_PEER_CODEX`. The request should resolve and deliver exactly once within the same nonempty ordered task-Team chain, and `student_two` should reply through the same scope. No persistent substitution/fallback is permitted.

## Observed

The stronger user-authorized staged `student_one/agent.md` caused Codex to make the actual production tool call. The current bound session recorded:

- tool: `send_message_to`
- arguments: `{ "recipient_address": "./student_two", "content": "TASK_PEER_CODEX" }`
- result: `TOOL_EXECUTION_FAILED`
- exact rejection: `Team execution is invalid: task TeamRun 'team_local_team_nested_classroom_test_student_st_83bff45debba4967abefd82deff5277f' has a foreign, reordered, truncated, wrong-parent, or wrong-Team binding.`

The public task record independently proves that the task was active under root `nested_classroom_test_team_3dd794cd902b4177841607a68c41cfcd`, with exact task-Team address `[team_local_team_nested_classroom_test_student_st_83bff45debba4967abefd82deff5277f]` and coordinator receiver `/StudentStudyGroup/student_one`. The task remained active with no submission/review. The provider returned a concise inability message rather than fabricating success. The browser row terminated the root successfully.

## Boundary distinction

`API-F-019` is resolved as directed by CRR-061: the temporary production-bound capability probe constructs a real active task Team, invokes the production AutoByteus bound tool and reverse MCP bound tool, and proves exact same-root/same-chain task-scoped request/reply with no persistent fallback. AutoByteus's fresh live omission remains nonblocking model election.

`API-F-020` is different and stronger: Codex actually elected and invoked the required tool through its real live task-scoped session, and production rejected its live binding. The deterministic constructed probe did not reproduce this provider/materialized-binding mismatch. This is a functional runtime failure requiring source-origin review.

## Execution and evidence

- Browser mode: real headless Google Chrome against checked disposable server/frontend `127.0.0.1:60228 / 31228`.
- Runtime/model: `codex_app_server / gpt-5.6-luna / medium`.
- Browser row: `live/browser/codex-browser-row.json` and log.
- Filtered exact bound-session trace: `capability/api-f020-codex-task-peer-bound-session-trace.json`.
- Public record snapshot: `capability/api-f020-codex-public-records.json`.
- Deterministic CRR-061 capability pass: `capability/task-team-bound-tool-capability.log` and copied temporary test.
- Staged test-only Agent instructions: `live/staged-student-one-agent-md.log`; private source fixture remained byte-identical.

## Remaining rows

Claude Team, standalone Agent matrix, selected-active-Team config real inspection, and real mobile path are **Not Tested** after fail-fast on the critical Codex task peer capability. They are not passing skips.
