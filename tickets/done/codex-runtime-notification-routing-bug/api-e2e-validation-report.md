# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/code-review-report.md`
- Current Validation Round: 4
- Trigger: User clarified the frontend hydration requirement: after a team is terminated, every triggered member is down, so `getTeamMemberRunProjection` must remain queryable for each member, not only the coordinator.
- Prior Round Reviewed: 3
- Latest Authoritative Round: 4

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Revised code-review pass for Codex global-notification routing fix and empty cohort cleanup | N/A | None | Pass | No | Validated focused durable tests/build/search, temporary real-thread router surface, live Codex team roundtrip, and live Claude team roundtrip. |
| 2 | User-requested lifecycle/history coverage expansion for large runtime refactor | No unresolved round-1 failures existed | None | Pass | No | Added durable Codex individual active terminate/restore/reconnect and Codex team projection after terminate/restore/continue. |
| 3 | User confirmed LM Studio/Qwen runtime is available and requested real all-runtime evidence | No unresolved failures existed; corrected prior “LM Studio not run” gap | None | Pass | No | Verified LM Studio `qwen3.6-35b-a3b`; ran AutoByteus/Qwen focused checks plus mixed and nested all-runtime E2Es. |
| 4 | User clarified terminated-team projection must be queryable for every member | No unresolved failures existed | None | Pass | Yes | Updated homogeneous team projection E2Es for AutoByteus/Qwen, Codex, and Claude to trigger two members, terminate, query each member projection while terminated, restore/continue, terminate again, and query each member projection again. |

## Correction To Earlier LM Studio Availability Statement

Round 2 said AutoByteus live E2E was not run because `RUN_LMSTUDIO_E2E` was unset. That was only a disabled test gate, not evidence that LM Studio was unavailable. Round 3 corrected this: LM Studio was reachable at `http://127.0.0.1:1234`, and `/v1/models` included `qwen3.6-35b-a3b`, matching the model shown by the user.

## Validation Basis

Round 4 validates the exact frontend safety case clarified by the user:

1. Create a simple homogeneous team with two members.
2. Trigger each member and wait for that member's assistant output token.
3. Terminate the team so all member runtimes are down.
4. Query `getTeamMemberRunProjection` for each member while the team is terminated.
5. Restore and continue each member.
6. Terminate again and query every member projection again, ensuring pre/post restore projection content remains available.

This was applied to:

- AutoByteus/Qwen homogeneous team E2E.
- Codex homogeneous team E2E.
- Claude homogeneous team E2E.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

No validation changes add compatibility wrappers, legacy branches, or fallback behavior.

## Validation Surfaces / Modes

- Repository-resident E2E tests updated in rounds 2 and 4.
- Live Codex individual-agent WebSocket/GraphQL E2E with active tool-approval termination, restore, reconnect, and follow-up streaming.
- Live homogeneous team WebSocket/GraphQL E2E for AutoByteus/Qwen, Codex, and Claude with every-member terminated-state projection queries.
- Live mixed AutoByteus/Qwen + Codex team E2E.
- Live nested AutoByteus/Qwen + Codex + Claude team E2E.
- Build/diff hygiene checks.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Branch: `codex/mixed-team-manager-simplification-analysis`
- Node: `v22.21.1`
- pnpm: `10.28.2`
- Codex CLI available: `codex-cli 0.138.0`
- Claude Code available: `2.1.131`
- LM Studio endpoint: `http://127.0.0.1:1234`
- LM Studio target model: `qwen3.6-35b-a3b`
- Runtime env gates used:
  - `RUN_LMSTUDIO_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b`
  - `RUN_CODEX_E2E=1`
  - `RUN_CLAUDE_E2E=1`

## Coverage Matrix

| Scenario ID | Requirement / Concern | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-001 | Codex global notifications skip without user-visible errors | Focused durable router unit test from implementation; revalidated in round 1 | Pass | Round 1 report. |
| VAL-002 | Routeable Codex notifications still deliver | Durable unit + live Codex E2E | Pass | Round 1 report. |
| VAL-003 | Codex no-identity diagnostics remain server-side | Durable unit + temporary real-thread validation | Pass | Round 1 report. |
| VAL-004 | Codex canonical-`cwd` client reuse | Durable unit tests | Pass | Round 1 report. |
| VAL-005 | Claude non-regression after no-op cohort deletion | Unit + live E2E | Pass | Round 1 plus later Claude live E2Es. |
| VAL-006 | Individual Codex active stop/restore gap | New durable E2E in `agent-runtime-graphql.e2e.test.ts` | Pass | `terminates an active Codex approval run, restores it, reconnects, and continues streaming` passed. |
| VAL-007 | Codex team projection after terminate/restore/continue gap | Updated durable E2E in `codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Codex every-member test passed in Round 4. |
| VAL-008 | AutoByteus/Qwen every-member terminated team projection | Updated durable E2E in `autobyteus-team-runtime-graphql.e2e.test.ts` | Pass | Round 4 AutoByteus/Qwen log. |
| VAL-009 | Codex every-member terminated team projection | Updated durable E2E in `codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Round 4 Codex log. |
| VAL-010 | Claude every-member terminated team projection | Updated durable E2E in `claude-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Round 4 Claude log. |
| VAL-011 | Mixed AutoByteus/Qwen + Codex restore/continue runtime/model/workspace preservation | Existing durable E2E | Pass | Round 3 mixed log. |
| VAL-012 | Nested AutoByteus/Qwen + Codex + Claude routing, metadata, restore | Existing durable E2E | Pass | Round 3 nested log. |

## Tests Implemented Or Updated

Repository-resident durable validation updated in API/E2E:

1. `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
   - Round 2 added Codex-only test: `terminates an active Codex approval run, restores it, reconnects, and continues streaming`.
2. `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`
   - Round 4 updated projection test to `serves every team member projection after terminate, restore, and continue`.
   - The test now triggers both `coordinator` and `reviewer`, terminates the team, and queries projection for both members while terminated.
3. `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
   - Round 2 filled Codex team projection-after-restore coverage.
   - Round 4 updated it to `serves every team member projection after terminate, restore, and continue in codex team runtime`.
   - The test now triggers both `professor` and `student`, waits for each assistant output token, terminates the team, and queries projection for both members while terminated.
4. `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
   - Round 4 updated projection test to `serves every team member projection after terminate, restore, and continue in claude team runtime`.
   - The test now triggers both `professor` and `student`, waits for each assistant output token, terminates the team, and queries projection for both members while terminated.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated in API/E2E: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` (this report and cumulative package are routed back to `code_reviewer`)
- Post-validation code review artifact: Pending code-reviewer re-review of validation-code changes and Round 4 evidence update.

## Validation Logs

Round 4 all-member terminated projection logs:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round4-all-members-terminated-projection/autobyteus-team-every-member-terminated-projection.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round4-all-members-terminated-projection/codex-team-every-member-terminated-projection.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round4-all-members-terminated-projection/claude-team-every-member-terminated-projection.log`

Round 3 real-runtime logs:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round3-real-runtime-matrix/autobyteus-agent-active-terminate-restore.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round3-real-runtime-matrix/autobyteus-agent-history-projection.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round3-real-runtime-matrix/autobyteus-team-active-terminate-restore.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round3-real-runtime-matrix/autobyteus-team-history-projection.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round3-real-runtime-matrix/mixed-autobyteus-codex.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/done/codex-runtime-notification-routing-bug/validation-logs/round3-real-runtime-matrix/nested-autobyteus-codex-claude.log`

## Passed

Round 4 focused commands:

1. `RUN_LMSTUDIO_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts -t "serves every team member projection after terminate, restore, and continue" --no-watch`
   - Result: 1 test passed; 4 skipped.
2. `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts -t "serves every team member projection after terminate, restore, and continue in codex team runtime" --no-watch`
   - Result: 1 test passed; 4 skipped.
3. `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "serves every team member projection after terminate, restore, and continue in claude team runtime" --no-watch`
   - Result: 1 test passed; 4 skipped.
4. `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   - Result: passed.
5. `git diff --check`
   - Result: passed.

Round 3 real-runtime checks also passed, including AutoByteus/Qwen individual/team focused checks, mixed AutoByteus/Qwen+Codex, and nested AutoByteus/Qwen+Codex+Claude.

## Failed

None.

## Not Tested / Out Of Scope

- Packaged Electron visual verification.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` remains unsuitable as a gate because of the known pre-existing TS6059 rootDir/tests configuration issue; `tsconfig.build.json` passed.

## Blocked

None.

## Cleanup Performed

- E2E suites cleaned up their temporary app-data/workspace directories and test definitions through existing teardown.
- No temporary validation source files were created.

## Classification

N/A — validation-code expansion and real-runtime validation passed; no failure classification required.

## Recommended Recipient

`code_reviewer`

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round 4 supersedes Round 3 by adding the exact every-member terminated-state projection coverage requested by the user. Homogeneous AutoByteus/Qwen, Codex, and Claude team tests now trigger each member and query every member projection after team termination. No validation failures are open.
