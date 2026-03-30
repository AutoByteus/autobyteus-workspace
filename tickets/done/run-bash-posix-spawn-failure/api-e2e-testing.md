# API/E2E Testing

## Testing Scope

- Ticket: `run-bash-posix-spawn-failure`
- Scope classification: `Small`
- Workflow state source: `tickets/done/run-bash-posix-spawn-failure/workflow-state.md`
- Requirements source: `tickets/done/run-bash-posix-spawn-failure/requirements.md`
- Call stack source: `tickets/done/run-bash-posix-spawn-failure/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`

## Coverage Rules

- Every critical requirement maps to at least one executable scenario.
- Every in-scope acceptance criterion (`AC-*`) maps to at least one scenario.
- Every in-scope use case maps to at least one scenario.
- All relevant spines (`DS-001`, `DS-002`, `DS-003`) are covered.
- Stage 7 evidence is based on targeted automated scenarios only; no manual-only closure was used.

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | foreground terminal startup recovers to a working backend after PTY failure conditions | `AV-001` | Passed | 2026-03-22 |
| `AC-002` | `R-002` | repeated calls do not surface a stale `Session not started` error | `AV-002` | Passed | 2026-03-22 |
| `AC-003` | `R-003` | background startup succeeds under the same recovery policy | `AV-003` | Passed | 2026-03-22 |
| `AC-004` | `R-004` | XML argument parsing decodes encoded command text | `AV-004` | Passed | 2026-03-22 |
| `AC-005` | `R-004`, `R-005` | invocation adapter emits decoded `run_bash` command text | `AV-005` | Passed | 2026-03-22 |
| `AC-006` | `R-006` | directly relevant targeted regressions stay green after the fix | `AV-006` | Passed | 2026-03-22 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `autobyteus-ts/tools/terminal` | `AV-001`, `AV-002`, `AV-006` | Passed | includes broken-helper baseline recovery and repeated-call stability |
| `DS-002` | Primary End-to-End | `autobyteus-ts/tools/terminal` | `AV-003`, `AV-006` | Passed | background startup shares the same recovery policy |
| `DS-003` | Bounded Local | `autobyteus-ts/agent/streaming/adapters` | `AV-004`, `AV-005`, `AV-006` | Passed | XML command normalization validated at parser and invocation boundaries |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | `DS-001` | Requirement | `AC-001` | `R-001` | `UC-001` | API | confirm `run_bash` succeeds from the broken `spawn-helper` baseline | PTY bootstrap repair and/or fallback produces a working foreground command | `chmod 644 node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper` followed by `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/integration/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/terminal-tools.test.ts` | Passed |
| `AV-002` | `DS-001` | Requirement | `AC-002` | `R-002` | `UC-002` | API | prevent stale failed-session reuse after startup failure | repeated calls remain stable and no stale `Session not started` error appears | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/tools/terminal/terminal-session-manager.test.ts tests/integration/tools/terminal/terminal-tools.test.ts` | Passed |
| `AV-003` | `DS-002` | Requirement | `AC-003` | `R-003` | `UC-003` | API | keep background startup aligned with foreground recovery | background process startup and lifecycle remain functional | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/tools/terminal/background-process-manager.test.ts tests/integration/tools/terminal/terminal-tools.test.ts tests/integration/tools/terminal/direct-shell-session.test.ts` | Passed |
| `AV-004` | `DS-003` | Requirement | `AC-004` | `R-004` | `UC-004` | API | decode XML entities once at parse boundary, including realistic chained shell commands | `parseXmlArguments(...)` returns decoded leaf text for multi-step commands and leaves plain chained commands unchanged | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts` | Passed |
| `AV-005` | `DS-003` | Requirement | `AC-005` | `R-004`, `R-005` | `UC-004` | API | preserve decoded command text into `run_bash` invocation creation through the parser flow | invocation adapter and full streaming flow emit decoded chained commands for `<tool name="run_bash">`, while custom `<run_bash>` keeps plain chained commands unchanged | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/agent/streaming/parser/invocation-adapter.test.ts tests/integration/agent/streaming/full-streaming-flow.test.ts tests/integration/agent/streaming/parser/streaming-parser.test.ts tests/unit/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.test.ts tests/unit/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.test.ts` | Passed |
| `AV-006` | `DS-001`, `DS-002`, `DS-003` | Requirement | `AC-006` | `R-006` | `UC-005` | API | ensure the full targeted regression set remains green, including the packaged install path used by release staging | targeted suite passes after the fix, build-time manifest verification stays green, and a packed `autobyteus-ts` tarball both ships the lifecycle script and survives a real `npm install` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/tools/terminal/node-pty-bootstrap.test.ts tests/unit/tools/terminal/pty-session.test.ts tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/terminal-session-manager.test.ts tests/unit/tools/terminal/background-process-manager.test.ts tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts tests/unit/agent/streaming/parser/invocation-adapter.test.ts tests/integration/tools/terminal/pty-session.test.ts tests/integration/tools/terminal/direct-shell-session.test.ts tests/integration/tools/terminal/terminal-tools.test.ts && pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/integration/agent/streaming/full-streaming-flow.test.ts tests/integration/agent/streaming/parser/streaming-parser.test.ts tests/unit/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.test.ts tests/unit/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.test.ts tests/unit/package/package-manifest.test.ts && pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts build && pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts pack --pack-destination <tmp> && npm install --prefix <tmp-install> --no-audit --no-fund <tarball>` | Passed |

## Failure Escalation Log

- None.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - this validation depends on local access to the installed `node-pty@1.1.0` package and the ability to toggle the `spawn-helper` mode bit.
- Compensating automated evidence:
  - the test run was executed after forcing the helper back to `0644`, which reproduces the original native failure condition before the fix.
- Residual risk notes:
  - PTY-specific UI/TUI edge cases are outside the scope of this fix; the validated contract is ordinary `run_bash` execution and background-process management.
  - the XML parser path now includes realistic chained-command coverage for both encoded `<tool name="run_bash">` input and plain custom `<run_bash>` input.
  - the release-stage Windows failure was reproduced as a packaged-install contract issue and is now covered by packed-tarball inspection plus a real `npm install` of the generated tarball.
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - The validation evidence includes both the direct root-cause condition (`spawn-helper` forced to `0644`) and the strengthened parser normalization cases for realistic chained commands.
  - Reopened Stage 6 release-blocker validation also covers the packaged `autobyteus-ts` tarball path used by Windows release staging.
