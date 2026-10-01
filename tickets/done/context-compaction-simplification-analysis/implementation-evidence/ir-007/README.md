# IR007 — terminal native compaction activity

Implementation-local evidence for Approved SR033 / Ready SR034 / ARCH-REV004. Current worktree and `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/implementation-handoff.md` are authoritative. **Completed approved-design delta for source review; Large/High. Not acceptance or Delivery.**

## Current delta / baseline

31 source/test paths:22 production +9 implementation tests. `source-inventory.json`, `source.patch`, `source-before/`, `source-size-check.json`. Preimages of newly added tests, where present, are intermediate local edits, not an executed baseline. Entry/current hashes and all1736 incoming pins: `entry-audit.json`, `final-audit.json`. Ten API durable paths unchanged: `api-owner-preservation.json`. Full received/current reference package: `reference-index.json`; existence check: `reference-check.json`.

## Fresh completed local commands

**312 Pass /27 files**, disjoint final groups; earlier reruns are overlapping, not additive. Tests use local fixtures and repository owners, not real inference.

### core-regression-final

`pnpm -C autobyteus-ts exec vitest run tests/unit/memory/pending-compaction-executor.test.ts tests/unit/memory/direct-llm-compression-strategy.test.ts tests/unit/memory/memory-manager-compaction-coordinator.test.ts tests/unit/llm/api/compaction-single-attempt-transport.test.ts tests/unit/agent/runtime/agent-runtime.test.ts tests/integration/agent/runtime/agent-runtime-compaction.test.ts --no-watch`

Exit 0; 106 Pass /6 files. Logs: `core-regression-final.log` / `.exit`.

### server-regression-final

`pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-execution/agent-run-compaction-races.test.ts tests/unit/agent-execution/agent-run-compaction-recovery.test.ts tests/unit/agent-execution/root-recovery-command.test.ts tests/unit/agent-execution/native-compaction-terminal-drain.test.ts --no-watch`

Exit 0; 39 Pass /6 files. Logs: `server-regression-final.log` / `.exit`.

### web-regression-final

`pnpm -C autobyteus-web test:nuxt stores/__tests__/nativeCompactionActivity.spec.ts stores/__tests__/nativeCompactionTermination.spec.ts stores/__tests__/nativeOrgCompactionTermination.spec.ts components/workspace/agent/__tests__/CompactionStatusRow.spec.ts components/progress/__tests__/CompactionActivityItem.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentActivityStore.spec.ts stores/__tests__/agentRunStore.spec.ts stores/__tests__/agentOrgContextsStore.spec.ts stores/__tests__/retainedOrgActivityTermination.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/runHydration/__tests__/runProjectionActivityHydration.spec.ts services/eventMonitor/__tests__/recentEventMonitorWindow.spec.ts services/teamExecution/__tests__/teamExecutionViewState.spec.ts services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts --run`

Exit 0; 167 Pass /15 files. Logs: `web-regression-final.log` / `.exit`.

### core-typecheck-final

`pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json`

Exit 0; Production typecheck completed. Logs: `core-typecheck-final.log` / `.exit`.

### server-typecheck-final

`pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json`

Exit 0; Production typecheck completed. Logs: `server-typecheck-final.log` / `.exit`.

### web-tsc-8gb

`NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec tsc --noEmit -p tsconfig.json`

Exit 2; Plain tsc, NOT vue-tsc; no same-command baseline or overall pass. Five changed-test .vue resolution diagnostics; no changed production TS path diagnostic. Vue SFC typecheck not established. Logs: `web-tsc-8gb.log` / `.exit`.

Owned `git diff --check` exit0. Source limits: all22 production files at/below500 nonempty lines; no IR007 file delta exceeds220 changed lines. Core/server final noEmit checks run after final production edits. No emit/build of generated outputs in this round. No full-suite/API/E2E invocation, provider call, acceptance score, or broad installed-app launch.

## Iterations and non-green evidence (not deleted or rescored)

- Backend initial fixture used a nonexistent event enum/incorrect emit shape; changed to actual `AGENT_COMPACTION_STATUS_UPDATED` `{payload,agent_id}`. Next old-pump test assumed microtasks drained a queue that polls every10ms; changed to observed listener arrival via `vi.waitFor`. Real AgentEventStream/queue remains under test; no mocked replacement pump.
- The initial actual-AgentRun diagnostic timed out awaiting a never-settling **first automatic compaction**, before the backend committed-shutdown entry. It is not reclassified as Pass or as a pump deadlock. `shutdown-preparation-diagnostic.md` describes the unchanged preparatory quiescence path, the distinct held/recovering target witness, and limits. AgentRun/manager policy is untouched.
- In the corrected recovery witness, comparing memory before interruption to memory after stop rejected the legitimate preexisting interruption system note. Corrected no-late-commit oracle compares after confirmed stop against after late provider release; parent dispatch/FIFO/final event assertions remain. `lock-drain*.log` retains both failures and final passes.
- Real mounted Org ActivityFeed exposed missing gray-tone handling in adjacent CompactionActivityItem; production component fixed, both rendered consumers tested. Frozen-view mutation was invalid test setup (actual view replacement tested instead). Nuxt Icon stub did not expose icon props in DOM; exact icon tested through shared presenter, real SVG then inspected in browser. Existing Team unit mock updated with the two new activity-store public methods, without weakening existing assertions.
- Initial broader characterization:11Fail/74Pass/6files +1 unhandled mock error. Three Team mock failures corrected and final Team suite passes28. **Eight untouched `retainedActivityTermination.spec.ts` tests still carry an observed failure**: its setup strict-parses a Team snapshot missing required `recoverableBlock` and `agent_input_states`, before termination. Fixture/contracts are unchanged by IR007; this is a source-traced setup mismatch, **not an executed baseline comparison, waiver, or passing suite**. The final scoped total does not include that failed suite. Preserve for downstream owner triage.
- Web plain tsc default heap OOM/SIGABRT (`web-tsc.log`),8GB retry exit2/7078 diagnostics (`web-tsc-8gb.log`). Five diagnostics in changed tests are `.vue` module-resolution errors; no changed production TypeScript path reported. This is not a Vue SFC typecheck and not comparable to inherited6836; no broad typecheck claim. Do not replace or waive the inherited diagnostic gate.

## Rendered result

See `rendered-result-check.md`, actual component preview files, saved DOM/interaction results and two images. Browser feedback is synthetic component presentation only, not Terminate/API/reconnect/saved-hydration proof. CUA/native pipe failure was overcome using the available browser connector; no claim that the full app was inspected. Only owned Vite PID and owned tab stopped/closed; other tabs/services untouched.

## Preserved acceptance state

API006 incomplete; authored reload/reconnect/hydration/durable-native provenance claims and interim90.7 withdrawn. Latest completed API005Fail78.6; API004Fail90.7 historical. F007 actual product closure and346 scoped repository Pass retained as API-owned evidence, not rerun here. Ten-path successful-test review pending. Other14 residuals,7baselinecontract failures, historical webtypecheck6836/fullsuite/current fidelity/fullTeamOrgUI/physicaldrag/consumed-toolfullUI/crash/Delivery/user gates unwaived. F005 accepted known/nonblocking NOT fixed/Pass; QwenSTOP; F004unknown; F006corrected; SR022 exhausted1fidelityFail/3scopedusable;v6unapproved. No withdrawn same-ID machinery or new provider budget.
