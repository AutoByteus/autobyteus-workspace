# IR-007 local implementation commands and boundaries

Run from the assigned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`. `TESTING.md` and server `AGENTS.md` select Vitest `run --no-watch`; all server selections were serialized. No API/E2E server, isolated desktop or real provider/model was launched. Node JSON-RPC children use an empty environment and controlled fixture, not a Codex binary or credential/profile config.

## Current stable selection and production checks

```bash
bash tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-007-cumulative-focused-command.sh
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
pnpm -C autobyteus-server-ts run build:full
git diff --check
python3 tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-007-finalize-evidence.py
```

The selection script is the exact final Vitest command/filter list, not a whole-unit script. The latest final seven-case fixture also waits for the actual 10s async delivery timeout, then retries only the same backend after native release. Final current output `ir-007-cumulative-selected-proof-final.log`: 141 passed /3 skipped files,1379 passed /5 skipped tests,exit0. Earlier same seven-case selection without this timeout extension is `ir-007-cumulative-selected-final.log` (same counts); they overlap completely, not summed. Typecheck `ir-007-production-typecheck.log` empty/exit0. Full build `ir-007-server-build.log` compile/assets/sanitized built-module/bootstrap succeeds without DATABASE_URL; not desktop packaging or current-array/startup acceptance. Diffcheck output empty/exit0. Hash/invariant/size audit and source inventory identify preserved versus changed files.

## Causal before / staged correction / neighbor checks

The first three attempts used the evolving new test file's initial two cases with:

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-input-terminal-release.test.ts --no-watch
```

- `ir-007-causal-before.log`: incoming source,2fail. Same AgentRun assertion; provider exact authority removed at idle, input forwarded. Second case loses terminal delivery and times out.
- `ir-007-causal-thread-only.log`: only projection correction,2fail. Native Interrupted incorrectly labelled Completed; real async terminal delivery can still be outrun.
- `ir-007-causal-after-initial.log`: full three-owner correction,2pass. Those historical outputs reflect the initial test file, not today's seven-case count.

Expanded neighbor command selected this same new file, `tests/unit/agent-execution/agent-run.test.ts`, the existing `tests/unit/agent-execution/backends/codex/thread` directory and exact `tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`, using the same `pnpm -C autobyteus-server-ts exec vitest run … --no-watch` prefix. Both `ir-007-owner-neighbors-initial.log` and `ir-007-owner-neighbors-final.log` have7files/164tests,1fail163pass. Only the new test's oracle was corrected: compact backend failure string is an AggregateError summary, whereas nested leaf is captured at the actual manager rejection; independent attachment cleanup can run on a failed native turn release. No existing assertion/source safety condition weakened. Current selected final validates the corrected/newly expanded cases.

Existing backend-only command:

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts --no-watch
```

`ir-007-backend-existing-before.log`:10pass but an existing unchanged mock lacks getThread and logs a TypeError during one event path. Not evidence that path delivered. No fixture alteration; new current real-manager suite does not use that mock.

## Wider selected failure / exact incoming comparison

`ir-007-cumulative-focused-final.log` is the earlier wider selected check with the whole Codex `events` directory instead of the single changed converter test. It reports145passed/1failed/3skipped files and1453passed/4failed/5skipped tests. The four failing TOOL_LOG strict-Team adapter assertions are retained. This was not whole-unit/API acceptance. File-resolved filter inventory is in `ir-007-check-selection-inventory.json`; current final selection keeps the original prior-round scope plus AgentRun/new regression/exact changed converter. No failing test or oracle was modified or suppressed in production code.

For baseline certification, after that run finished, only the three IR-007 source owners were temporarily replaced with their exact incoming saved bytes in a subprocess `try/finally` and restored to their exact current hashes. No git reset, unrelated rollback, running server/test overlap or model call. Commands:

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-input-terminal-release.test.ts --no-watch -t 'retains the exact reader/router/lease'
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts --no-watch
```

`ir-007-causal-before-certified.log`:1fail/6skip, actual backend accepted:true observed separately from actual downstream guard rejection, lost native authority and forwarded input. This is new controlled local evidence, NOT the missing historical backend return. `ir-007-event-baseline-comparison.log`: same4fail/1pass on exact incoming source. `ir-007-before-comparison-receipt.json` records both exit1 and all3 exact current owner hash restorations. It certifies this scoped same-failure comparison only, not an all-suite baseline or failure-origin reassignment of original FAPI-007.

## Artifact audit and source evidence limits

The first new evidence-audit script run failed its count assertion (224 vs287) because default git status collapsed untracked directories. Corrected only the artifact command to `git status --porcelain=v1 --untracked-files=all`; final287 paths/hash assertions pass. This is artifact enumeration, not a runtime/source failure.

Read-only historical evidence: only the exact UUID-matching previously recorded API-owned rollout was inspected, metadata/structural facts/terminal extracted; no other thread contents or full prompts copied. Official GitHub `rust-v0.160.0` sources were fetched read-only; two candidate obsolete message_processor paths returned404 before the actual bespoke_event_handling/thread_status files were found. Tagged source order and native persisted interruption are not historical wire delivery/backend/all-member physical proof. No old stopped API setup/script endpoint was replayed. No instance was started here, so no foreign-instance cleanup/preservation claim.

## Not run / still required

No HTTP/API/E2E journey, rebuilt desktop/UI inspection, real native provider/model or provider matrix; AGY live suites skipped. No new web mock run. Historical prior web/released-migration/non-green evidence remains unchanged. Independent source review then API/E2E owns rebuilt normal Manager and complete provider/three-root/native+MCP/recursive/private/approval/quiet/Stop/retry/reopen/restart/data/current-array/startup joins. API-REV-008 Fail67.86% (post-repository65.00%) unchanged; original FAPI-007 remains independent.
