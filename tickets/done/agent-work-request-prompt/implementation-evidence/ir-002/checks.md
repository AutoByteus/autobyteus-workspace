# IR-002 local checks
All commands ran in the assigned isolated worktree, after the exact R2 correction.

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts tests/unit/agent-tools/team-communication/send-message-to.test.ts tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts tests/unit/agent-collaboration/execution/member-instance-scope.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts --no-watch
```
Result: exit 0; 90 tests in 8 unit files pass; no skipped tests; no snapshot-update mode. Output in unit-tests.log (trailing whitespace normalized).

```sh
pnpm -C autobyteus-server-ts exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts src/agent-run-collaboration/prompt/standalone-collaboration-instruction.ts src/agent-communication/services/send-message-to-tool-contract.ts
```
Result: exit 0; no diagnostics; focused typecheck only.

`git diff --check`: passed. Self-review: production diff is exactly one replaced sentence; contract assertion, Codex substring, standalone snapshot and docs literal agree with R2. Only collaboration prompt hash changed. Delivery's existing eight-line documentation addition preserved unchanged. No provider calls or integration/E2E execution this round; prior API-REV-001 evidence covers R1 only.
