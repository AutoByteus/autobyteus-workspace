# CRR-002 independent source re-review evidence

## Basis and outcome

Source **7886aeb78449fa54a09ce715fc6e0d74134b386f**, after IR-001 source **3eb43f0dc457fb5d5960eee62618d8d497e42e9b**; reviewed package HEAD **c948605e2aa5e9dac77b69819eb8f366226c4112**. Base **046279298f53fb98d7688ee9dc2b2ba0fa827685**. Trigger CRR-001 CR-001/002; Large/High unchanged. Canonical report and cumulative revision record are two directories above this evidence directory.

**Pass at source-review boundary. CR-001/CR-002 resolved.** No implementation/durable-test edits by reviewer. The preexisting shared facade prerequisite is not waived; downstream execution must address it. No live generation, provider calls, credential/private-history access or full-suite result.

## Independent executions (2026-09-26)

From the task worktree; commands exited without watcher:

    pnpm -C autobyteus-ts exec vitest run tests/unit/agent/streaming tests/unit/agent/loop/llm-phase-compaction.test.ts tests/unit/agent/loop/llm-phase-memory-compaction-configuration.test.ts tests/unit/memory/pending-compaction-executor.test.ts --no-watch

core-status.log: exit 0, **12 files / 81 tests pass**.

    pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-compaction-boundary.test.ts tests/unit/agent-execution/compaction tests/unit/agent-memory --no-watch

server-boundary-history.log: exit 0, **18 files / 119 tests pass**.

    pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch

shared-harness-residual.log: exit 1, **16 tests pass / 1 fails**.

The last failure remains “adapts the raw product backend through the canonical AgentRun event facade”: **AgentRun provider input normalizer is required**, agent-run.ts:77 via shared harness wrapper line94. CRR-001 already independently reproduced the same failure at unchanged base; the IR-002 wrapper is unchanged. The other 14 baseline failures were not rerun. See parent residual-comparison.json, baseline-residuals.log and README for exact baseline recipe/limits.

The new setup tests mock discovery, provider availability and backend construction; they execute the injected production direct config factory but stop before generation and bypass the facade. The third test runs the real source renderer over the retained Unicode fixture. These observations close the retired-dependency defect; they do not prove full backend readiness or semantic quality.

## Source and evidence checks

- Reviewed all eight IR-002 source/test paths and result/caller contract. BaseLLM sendMessages executes capture before/after hooks; capture does not replace generation, construction configuration or accepted summary.
- Harness now compares parsed response Markdown with validated strict-v5 snapshot and next parent request. One request/response per completed operation, current metadata, archive presence/no category artifacts, exact continuation/tool/Unicode checks replace retired child/lineage behavior.
- Current payload explicitly models six direct fields, including null diagnostics. No manufactured retired live fields; historical readers/budget logging untouched.
- removal-audit.txt: actual source diff/stat, no scoped retired-symbol matches, preserved scenario registrations, current wrapper, diff whitespace check.
- input-and-source-audit.json: eight changed source/test paths and SHA-256 values match submitted delta; prior pinned requirements/design/supplements unchanged; cumulative scope **179 paths**.
- source-audit.md/.json: full current per-file matrix, **71** surviving changed production files and **27** removed; max **492**. Delta production files **79/252** nonempty. Only >220 production changes are the two already-reviewed removals; test support is exempt.
- Hash/size checks used SHA-256, nonblank-line count and git diff --name-only/--numstat from reviewed base to current source. An initial inventory assertion included intervening ticket-only artifacts; corrected by excluding tickets/ for the source inventory, not by excluding source paths.
- Retained CRR-001 probes are historical; the expected deleted-template failure is deliberately not rerun against the fixed source.

## Evidence not rerun / limits

IR-002 implementation reports web status/history 4 files/61 tests, contracts 2 tests, core/server builds and syntax-only harness/caller transpilation passing; these are supporting upstream results, not new reviewer runs or full test typecheck. No rendered UI delta; IR-001 synthetic rendering limitations remain. Unchanged persistence/provider/startup/restore review and CRR-001 focused/fault evidence carry forward; no actual crash/power-loss or remote cancellation assurance added.

API/E2E owns target executable coverage including first/repeated semantic fidelity, explicit failure/retry, settings/status/history and inherited validation prerequisites. Source Pass is not API/E2E or Delivery Pass. No push, merge, release, generated SDK cleanup or external WIP integration.
