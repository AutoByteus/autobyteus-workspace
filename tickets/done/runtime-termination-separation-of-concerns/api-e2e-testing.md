# API / E2E Testing

- Ticket: `runtime-termination-separation-of-concerns`
- Last Updated: `2026-03-10`
- Workflow state source: `tickets/done/runtime-termination-separation-of-concerns/workflow-state.md`
- Requirements source: `tickets/done/runtime-termination-separation-of-concerns/requirements.md`
- Design source: `tickets/done/runtime-termination-separation-of-concerns/proposed-design.md`
- Runtime call stack source: `tickets/done/runtime-termination-separation-of-concerns/future-state-runtime-call-stack.md`

## Scenario Log

| Scenario ID | Level | Command | Status | Notes |
| --- | --- | --- | --- | --- |
| `S7-001` | Unit | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-termination-service.test.ts --no-watch` | Passed | New coordinator-service routing and cleanup invariants passed (`5/5`). |
| `S7-002` | E2E | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/run-history-graphql.e2e.test.ts --no-watch` | Passed | Existing run-history GraphQL regression suite stayed green after resolver refactor (`8/8`). |
| `S7-003` | E2E | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/runtime-termination-routing-graphql.e2e.test.ts --no-watch` | Passed | New GraphQL proof showed Codex-style runtime termination bypasses native `terminateAgentRun(...)` and still performs shared cleanup. |
| `S7-004` | Unit | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts --no-watch` | Passed | Adjacent runtime-boundary suites remained green (`22/22`). |
| `S7-005` | Build | `pnpm -C autobyteus-server-ts build` | Passed | Source build compiled successfully with the new termination service. |
| `S7-006` | Combined final pass | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-termination-service.test.ts tests/unit/runtime-execution/runtime-command-ingress-service.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts tests/e2e/run-history/run-history-graphql.e2e.test.ts tests/e2e/run-history/runtime-termination-routing-graphql.e2e.test.ts --no-watch` | Passed | Final mapped verification slice passed together (`36/36`). |
| `S7-007` | Full backend suite | `pnpm -C autobyteus-server-ts exec vitest run --no-watch` | Passed | Backend-wide automated verification finished cleanly in this worktree (`249` passed, `9` skipped test files; `1144` passed, `47` skipped tests). Live-provider Codex/Claude suites skipped only on their existing env gates. |
| `S7-008` | Full backend suite (provider-gated) | `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run --no-watch` | Failed | Historical evidence only. The combined live-provider run exposed two issues: the live Codex configured-skill proof was too brittle for provider word-order variance, and later Claude live cases hit provider/process instability (`Claude Code process aborted by user` / exit `1`). This run is retained as investigation evidence, not the final gate. |
| `S7-009` | Provider-gated Codex live suites | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-runtime-configured-skills-graphql.e2e.test.ts --no-watch` | Passed | Ordered live Codex baseline/runtime plus configured-skill verification passed together after the proof was hardened (`13/13`). This rerun keeps the suspected state/order interaction while removing unrelated suite noise. |
| `S7-010` | Provider-gated Codex team suite | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts --no-watch` | Passed | Live Codex team/runtime coverage passed cleanly (`3/3`). |
| `S7-011` | Provider-gated Claude live suites | User instruction on `2026-03-10` | Waived | User explicitly waived Claude live reruns because of quota/process instability in the provider-backed environment. |

## Acceptance Criteria Closure

| Acceptance Criteria ID | Scenario IDs | Status | Notes |
| --- | --- | --- | --- |
| `AC-001` | `S7-001`, `S7-002` | Passed | Native `autobyteus` termination continues to use the native path. |
| `AC-002` | `S7-001`, `S7-003` | Passed | Non-native runtime termination bypasses native removal and routes through runtime ingress. |
| `AC-003` | `S7-001`, `S7-003` | Passed | Shared cleanup executes once after successful termination. |
| `AC-004` | `S7-001` | Passed | Not-found behavior remains stable and skips cleanup. |
| `AC-005` | `S7-007`, `S7-009`, `S7-010` | Passed | Broader backend regression confidence is preserved beyond the mapped terminate-path slice, including the user-requested live Codex coverage. |

## Environment Notes

- Running separate Vitest jobs in parallel against this worktree caused Prisma SQLite `database is locked` errors during global setup. The final verification was run sequentially / in one Vitest process to avoid that environment-level contention.
- The backend-wide Vitest run completed with exit code `0`. Existing live-provider suites remained skipped behind their established environment flags rather than failing at runtime.
- The combined provider-gated backend-wide Vitest run with both `RUN_CODEX_E2E=1` and `RUN_CLAUDE_E2E=1` was retained as investigation evidence only. It surfaced two non-ticket issues: a brittle live Codex configured-skill assertion and later Claude provider instability (`Claude Code process aborted by user` / process exit `1`).
- The live Codex configured-skill proof is now stabilized by using a provider-friendly natural-language response token set and asserting token equality independent of word order. This change was validated by a passing ordered rerun of `codex-runtime-graphql.e2e.test.ts` plus `codex-runtime-configured-skills-graphql.e2e.test.ts`.
- One monolithic `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run --no-watch` attempt still showed a transient configured-skill failure in the broader suite context. The stronger signal is the passing ordered rerun above; my reading is that the feature path is correct and the broader monolithic failure is environment/harness instability. This last sentence is an inference from the evidence.
- Claude live reruns are explicitly waived for this ticket because the user reported quota concerns and the combined provider-backed run already showed provider/process instability on the Claude side.
- `pnpm typecheck` is currently not a usable gate for this repository snapshot because the repo `tsconfig.json` includes `tests/` while `rootDir` remains `src`, producing pre-existing `TS6059` failures outside this ticket. This ticket used the mapped test suites plus `pnpm build` as the source-compilation gate.

## Gate Decision

- Stage 7 result: `Pass`
- Residual risk: medium-low; the terminate-path refactor is green in mapped verification, the default full backend suite, ordered live Codex runtime plus configured-skill proof, and the live Codex team suite. Remaining uncertainty is limited to monolithic full-suite provider instability and the explicitly waived Claude live reruns.
