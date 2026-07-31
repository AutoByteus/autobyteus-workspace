# API/E2E Revision Record

The canonical coverage investigation and execution coverage report remain authoritative. This record is the concise chronological index of completed API/E2E validation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`; `code-review-report.md`; execution round 1 | SR-004, ARCH-REV-004, IR-002, CRR-002 | N/A | Pass / 97% |
| API-REV-002 | User follow-up after DR-001; execution round 2 | SR-004, ARCH-REV-004, IR-002, CRR-003, DR-001 | Pass / 97% | Pass / 98% |
| API-REV-003 | User follow-up after DR-001; execution round 3 | SR-004, ARCH-REV-004, IR-002, CRR-003, DR-001 | Pass / 98% | Pass / 98% |
| API-REV-004 | User correction after API-REV-003; execution round 4 | SR-004, ARCH-REV-004, IR-002, CRR-003, DR-001 | Pass / 98% | Pass / 96% |
| API-REV-005 | `CRR-006` / `TCR-001`; focused local-fix round 5 | SR-004, ARCH-REV-004, IR-002, CRR-006, DR-001 | Pass / 96% | Pass / 96% |
| API-REV-006 | User-directed canonical product-compactor validation; execution round 6 | SR-004, ARCH-REV-004, IR-002, CRR-006, DR-001 | Pass / 96% | Pass / 98% |

## Revision Entries

### API-REV-001 — Current-only memory lineage, reset, and recurrent live compaction baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`; API/E2E execution round 1.
- Triggering finding or scenario IDs: CRR-002 source-review `Pass`; validate SCN-001 through SCN-016 and close the stale memory-suite, lifecycle, API/process and provider-realism gaps recorded in the implementation handoff.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-002; delivery revision `N/A`.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result for implementation commit `394885c1090cfc8313f2864a2dbca541575bec2f`. No earlier API/E2E result or confidence existed.
- Coverage decisions or durable test paths changed:
  - Updated 24 existing durable test files to the approved current-only schema/owner contract.
  - Added 7 durable test files for lineage store/resolver/presentation, reset migration, startup gate, server scope and origin service.
  - Removed `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts` because its only purpose was to protect the deleted v4 runtime gate/compatibility behavior.
  - Added no production source or compatibility path.
- Scenarios added, changed, removed, or rechecked: SCN-001 through SCN-016 were mapped and passed. The critical added/replaced evidence covers manager-owned C1/C2 publication, R(n)-only archives, 1,000-record bounded current tail, typed direct/root resolver integrity, strict v5 restore, required reset/startup failure gating, interrupt/reset/follow-up recovery, retry non-mutation, natural prompt and Work Evidence goldens, active-only Event Monitor, and explicit scope/provider wiring.
- Commands, environment, fixture, or broader-validation delta:
  - Reproduced the stale-suite baseline before maintenance, then passed the final 33-file/148-test core memory suite and 12-test AgentRuntime integration suite.
  - Passed focused resolver/1,000-tail, migration/startup, scope/origin, Work Evidence, affected server, GraphQL and current-contract E2E suites.
  - Passed current core/server builds and actual built-server startup/restart checks.
  - Ran full deterministic E2E; 47 files/164 tests passed and 14 files/49 tests skipped. One unrelated managed-gateway spawn failure immediately passed its exact 2-test isolated rerun.
  - Used the documented `pnpm secrets:import` against an isolated SQLite/vault target authorized by the user, then passed a real OpenAI `gpt-5.4-mini` built-server/GraphQL/WebSocket C1/C2 journey with a parent-run low compaction ratio.
  - The live journey published two linked lineage records, two distinct non-empty archives, bounded episode/semantic outputs with provider/model metadata, and schema-v5 current context; all owned live state was removed.

#### Prior Failure Resolution

None — no prior completed API/E2E result exists for this revision.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 97%`
- New or remaining failure IDs: `None`
- Recommended recipient: `code_reviewer` for proportional changed-test review.
- Remaining risks, blocked evidence, or untested scope:
  - Process termination between normal multi-file publication writes remains explicitly out of scope; no journal/recovery contract exists.
  - Subjective long-form provider summary quality is not evaluated; the live run proves real transport, valid schema and recurrent publication.
  - Browser/Electron execution is inapplicable because no UI, renderer, preload, IPC, window or packaging boundary changed.
  - An ultra-low process-global trigger ratio also applies to built-in compactor agents; the successful live test intentionally scoped the ratio to the parent run and does not claim the global form is safe.
  - Proportional review of changed durable test code remains the next required workflow gate.

### API-REV-002 — Detailed compaction budget logs and real OpenAI/DeepSeek provider matrix

- Triggering role, report path, and round: User-requested follow-up after `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/delivery-revision-record.md` (`DR-001`); API/E2E execution round 2.
- Triggering finding or scenario IDs: no failure finding; verify whether compaction logs expose correct context/budget behavior and expand live coverage from OpenAI to DeepSeek V4 Flash.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-003, DR-001.
- Why this coverage/execution revision was recorded: API-REV-001 retained lifecycle/publication counts but not the detailed token-budget log fields. The user also requested another real provider because compaction is a critical feature.
- Implementation/integrated commit executed: `e13e6b2481fd8922c186e967dfe846d98d20d95d`.
- Coverage decisions or durable test paths changed: `None`. Credential-backed provider telemetry remained a temporary executable probe; no production source or durable test changed.
- Scenarios added, changed, removed, or rechecked: rechecked the live provider/log portion of SCN-002, SCN-007, SCN-010 and SCN-011 with real `gpt-5.4-mini` and `deepseek-v4-flash`.
- Commands, environment, fixture, or broader-validation delta:
  - Reused the user-authorized documented secret import against an isolated SQLite/vault target.
  - Started the freshly built integrated server with detailed compaction logs enabled.
  - Created each parent run through GraphQL, connected the real agent WebSocket, and used run-local `compaction_ratio=0.0001` plus `max_tokens=1024`; no process-global low ratio was used.
  - OpenAI logged prompt `226`, effective context `400000`, input budget `398720`, trigger `39`, and `compaction_required=true`.
  - DeepSeek logged prompt `220`, effective context `1000000`, input budget `998720`, trigger `99`, and `compaction_required=true`.
  - Both streamed exactly the required `requested -> started -> completed` lifecycle, compacted one selected raw-backed block, reported matching compactor runtime/model metadata, emitted no failed phase, and completed the turn.
  - Recomputed the production budget arithmetic from the retained fields and scanned captured raw output against actual credential values; no value leak was observed.
  - Removed the database, vault key, runtime, workspaces, processes, sockets and temporary probe.

#### Prior Failure Resolution

None — API-REV-001 was already `Pass`. This round closes the bounded detailed-log and second-provider evidence gap requested by the user.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/live-provider-compaction-debug-telemetry-01.log`
- Prior result and confidence: `Pass / 97%`
- Current result and confidence: `Pass / 98%`
- New or remaining failure IDs: `None`
- Recommended recipient: `code_reviewer` for a proportional test-code review result of `Not Applicable` because no durable test changed.
- Remaining risks, blocked evidence, or untested scope:
  - Process termination between normal multi-file publication writes remains explicitly out of scope; no journal/recovery contract exists.
  - The probe validates schema/bounds/lifecycle, not subjective long-form summary quality; a valid DeepSeek result may contain zero semantic facts.
  - Browser/Electron remains inapplicable because no UI or shell boundary changed.
  - The successful low trigger remains parent-run scoped; it does not claim an ultra-low process-global ratio is production-safe.

### API-REV-003 — Durable two-percent agent compaction quality and continuation

- Triggering role, report path, and round: User-requested follow-up after `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/delivery-revision-record.md` (`DR-001`); API/E2E execution round 3.
- Triggering finding or scenario IDs: no prior failure finding; add SCN-017 and SCN-018 to prove meaningful real tool work, exact `compaction_ratio=0.02`, retained quality, and post-compaction continuation with local Qwen and managed DeepSeek.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-003, DR-001.
- Why this coverage/execution revision was recorded: API-REV-002 proved token arithmetic and lifecycle at an ultra-low trigger but did not perform a realistic multi-tool quality/continuation task or leave durable agent-level live coverage.
- Implementation/integrated commit executed: `e13e6b2481fd8922c186e967dfe846d98d20d95d` plus the API/E2E-owned durable test delta.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts`.
  - Updated `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` and `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts` to the exact current response/metadata/lineage/tool/prompt contract.
  - Updated `test-support/live-e2e/live-e2e-harness.ts`, `live-e2e-scenarios.d.mts`, `live-e2e-scenarios.mjs`, the server real-provider E2E file, and its unit guard for managed DeepSeek compaction.
  - Removed `autobyteus-ts/tests/integration/agent/deepseek-single-agent-flow.test.ts`; it used ambient `DEEPSEEK_API_KEY` and omitted the required resolver. The managed-vault agent/compaction scenarios are its replacement.
- Scenarios added, changed, removed, or rechecked:
  - SCN-017: local `qwen/qwen3.6-35b-a3b` completed one real two-percent compaction, retained exact pre-compaction facts, incorporated a post-compaction constraint, and created the exact final artifact through real file tools.
  - SCN-018: managed `deepseek-v4-flash` completed three recurrent two-percent compactions and the exact retained post-compaction artifact through two reads and one write.
  - Rechecked the current compaction/lineage default-safe selection, managed harness unit boundary, and full server build.
- Commands, environment, fixture, or broader-validation delta:
  - Used the documented `pnpm secrets:import` into the canonical ignored test database/vault; `.env.test` remained non-secret and no process sourced the owner-private assignment file.
  - Qwen context was `262,144`, input budget `260,864`, and trigger `5,217`.
  - DeepSeek context was `1,000,000`, input budget `998,720`, and trigger `19,974`.
  - Final focused evidence: core 14 files / 64 tests passed with the live Qwen case skipped by default; managed harness 14/14 and full server build passed.
  - Removed the imported DB/key/runtime/temp state, preserved the source assignment file, and found zero source credential values across 70 retained evidence files.

#### Prior Failure Resolution

None — API-REV-002 was already `Pass`. Within this round, intermediate harness/tool-argument/budget/persistence assertions were corrected before the authoritative live passes. One exploratory three-cycle Qwen run exposed external-model quality loss; the final Qwen scenario proves one exact compaction/continuation, and the final DeepSeek scenario independently proves three exact recurrent compactions.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `Pass / 98%`
- Current result and confidence: `Pass / 98%`
- New or remaining failure IDs: `None`
- Recommended recipient: `code_reviewer` for proportional changed-test review.
- Remaining risks, blocked evidence, or untested scope:
  - External-model semantic quality is variable. Qwen passed the final one-compaction continuation but lost Part A in one retained exploratory three-cycle run; DeepSeek passed the final three-compaction recurrent case.
  - Process termination between normal publication writes remains explicitly out of scope.
  - Browser/Electron remains inapplicable because no UI or shell boundary changed.
  - Proportional review of the added/updated/removed durable test delta is the next required workflow gate.

### API-REV-004 — Five-percent projected-memory and continuation quality

- Triggering role, report path, and round: User correction after API-REV-003; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`; API/E2E execution round 4.
- Triggering finding or scenario IDs: SCN-017 and SCN-018; two percent compacts too little history for the desired quality witness, so rerun at exact five percent and inspect the actual compacted-memory user region, retained continuation, exact new user message and downstream task result.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-003, DR-001.
- Why this coverage/execution revision was recorded: API-REV-003 proved real compaction, but its two-percent fixture encouraged small/recurrent replacements and its assertions judged retained output without directly validating the final provenance-composed outbound request. The user correctly requested a more meaningful quantity and direct continuation-quality inspection.
- Implementation/integrated commit executed: `e13e6b2481fd8922c186e967dfe846d98d20d95d` plus the cumulative API/E2E-owned durable test delta.
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts` to exact five percent, larger history, primary invocation/provenance capture, actual projected-memory/current-user assertions, a real post-compaction read and exact continuation response.
  - Updated `test-support/live-e2e/live-e2e-harness.ts` to exact five percent, a tuned single-compaction fixture, primary invocation/provenance capture, actual projection checks, exact final artifact and zero failed tools.
  - Updated `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` and `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` for the five-percent/projected-context result contract.
  - Added no production source or compatibility behavior.
- Scenarios added, changed, removed, or rechecked:
  - SCN-017: local Qwen crossed a `13,043`-token five-percent trigger at `14,525`, completed one compaction, performed three successful reads including a post-compaction read, projected selected Part A into `M(n)`, retained Part B in natural history, supplied the exact new current-user region and returned the exact nine-field JSON.
  - SCN-018: managed DeepSeek crossed a `49,936`-token trigger at `56,153`, completed one compaction, succeeded at two reads plus one write with zero failures, projected the same correct context composition and wrote the exact nine-field artifact after source deletion.
  - Rechecked default-safe Qwen collection, managed scenario unit contract, core build and server build-config typecheck.
- Commands, environment, fixture, or broader-validation delta:
  - Used the documented `.env.test` plus `pnpm secrets:import` path into the canonical ignored test DB/vault; no process sourced `/Users/normy/.autobyteus/server-data/.env`.
  - Captured value-safe compactor output, the actual projected compacted-memory constituent, the exact current-user constituent and final continuation result in both authoritative live logs.
  - Corrected an intermediate false assertion: Part B was not selected into `R(n)` and therefore correctly remained in retained natural history rather than `M(n)`. The final assertion verifies all anchors across the complete outbound invocation.
  - Retained calibration failures for oversized/undersized fixtures and Qwen tool noncompliance rather than hiding them.

#### Prior Failure Resolution

None — API-REV-003 was already `Pass`. This revision supersedes its two-percent quality setting and closes the direct projected-context inspection gap requested by the user.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/lmstudio-qwen36-five-percent-real-compaction-04.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/managed-deepseek-v4-flash-five-percent-real-compaction-07.log`
- Prior result and confidence: `Pass / 98%`
- Current result and confidence: `Pass / 96%`
- New or remaining failure IDs: `None`
- Recommended recipient: `code_reviewer` for proportional changed-test review.
- Remaining risks, blocked evidence, or untested scope:
  - Task-critical retention and exact continuation pass for both models, but generated compacted memory is not perfectly faithful in incidental filler. Qwen inferred escalation from cyclic samples and was verbose; DeepSeek misstated a low-value shard range. This external-model semantic risk explains the lower confidence.
  - Process termination between normal publication writes remains explicitly out of scope.
  - Browser/Electron remains inapplicable because no UI or shell boundary changed.
  - Proportional review of the cumulative durable test delta is the next workflow gate.

### API-REV-005 — TCR-001 exact-zero failed-tool outward contract

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-test-review-report.md`; `CRR-006` proportional review round 4; API/E2E focused execution round 5.
- Triggering finding or scenario IDs: `TCR-001`; SCN-018.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-006, DR-001.
- Why this revision was recorded: API-REV-004 execution returned zero failed tools and the shared harness rejected nonzero failures, but the outer server E2E result assertion still accepted `recoverableToolFailureCount <= 2`. Code review classified that mismatch as a bounded API/E2E-owned Local Fix.
- Implementation/integrated commit executed: `e13e6b2481fd8922c186e967dfe846d98d20d95d` plus the cumulative API/E2E durable test delta.
- Coverage decisions or durable test paths changed:
  - Updated only `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` in this round.
  - Replaced the permissive upper bound with `expect(result.recoverableToolFailureCount).toBe(0)`.
  - Production source, shared harness behavior, scenario registration and compatibility scope are unchanged.
- Scenarios rechecked: SCN-018 managed DeepSeek five-percent real compaction and outward result contract.
- Commands, environment, fixture, or broader-validation delta:
  - Reimported provider secrets through the documented interactive CLI into the canonical ignored test DB/vault.
  - Ran `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` against current code.
  - Current build and server E2E passed; 2/2 tests passed; one five-percent compaction completed; three tools succeeded; the result contained `recoverableToolFailureCount: 0`; exact artifact and actual projected-memory/current-user checks remained green.
  - Removed the test DB/key/runtime/temp state and verified no owned process remained.
  - Scanned 120 evidence files against 12 credential-like source values in exact, URL-encoded and base64 forms; zero matches.

#### Prior Failure Resolution

- `TCR-001`: `Resolved`. The outer durable result contract now matches the shared harness and canonical execution evidence by requiring exact zero failed tools. The focused real-provider run passed the tightened assertion.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-005-deepseek-exact-zero-real-compaction.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-005-cleanup.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-005-secret-leak-scan.log`
- Prior result and confidence: `Pass / 96%`; proportional test review `CRR-006 Fail — Local Fix`.
- Current result and confidence: `Pass / 96%`.
- New or remaining failure IDs: `None`; `TCR-001` resolved.
- Recommended recipient: `code_reviewer` for proportional re-review of the one-line durable test correction.
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-004 — external-model incidental semantic imprecision, explicitly out-of-scope normal-publication process-crash atomicity, and inapplicable browser/Electron execution.

### API-REV-006 — Canonical built-in compactor agent under DeepSeek and LM Studio Qwen

- Triggering role, report path, and round: user-directed follow-up; API/E2E execution round 6. The user required the live quality test to respect the actual Memory Compactor agent, use a meaningful five-percent task, inspect logs and compacted/current-user content, and compare managed DeepSeek with keyless LM Studio Qwen.
- Triggering finding or scenario IDs: SCN-017 and SCN-018. API-REV-004/005 live journeys injected a shortened test-owned compactor prompt/runner, so they were direct mechanics/projection evidence but not a fair canonical product-compactor quality comparison.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-004, IR-002, CRR-006, DR-001.
- Why this revision was recorded: close the live compactor-runner/prompt mock gap and make the actual built-in child agent the authoritative DeepSeek/Qwen quality witness.
- Implementation/integrated commit executed: `e13e6b2481fd8922c186e967dfe846d98d20d95d` plus the cumulative API/E2E durable test delta.
- Coverage decisions or durable test paths changed:
  - Updated `test-support/live-e2e/live-e2e-harness.ts` to omit `compactionAgentRunnerFactory`, use the default `ServerCompactionAgentRunner`, verify persisted built-in definition `autobyteus-memory-compactor` and byte-exact canonical instruction, record prompt SHA-256 and real child model/run provenance, support local model discovery, and assert current-tail projection, exact tools and continuation.
  - Updated `test-support/live-e2e/live-e2e-scenarios.mjs` and `test-support/live-e2e/live-e2e-scenarios.d.mts` with keyless `lmstudio.qwen36.compaction-agent-flow` and nullable secret metadata.
  - Updated `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` for local no-secret preflight, canonical-child assertions and bounded model-specific timeouts.
  - Updated `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` for dynamic keyless LM Studio scenario coverage and registration guards.
  - Retained the lower-level core Qwen test as runner/projection evidence, but no longer treat its shortened prompt as authoritative product quality evidence.
  - Added no production source or compatibility behavior.
- Scenarios added, changed, removed, or rechecked:
  - SCN-017: local `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234`, effective context `262,144`, exact five-percent trigger `13,043`, two recurrent canonical product-compactor child runs, exact current-tail projection, exactly two reads/one write/zero failed tools, exact nine-field continuation artifact.
  - SCN-018: managed `deepseek-v4-flash`, effective context `1,000,000`, trigger `49,936`, one canonical product-compactor child run, exact projected-memory/retained-history/current-user composition, exactly two reads/one write/zero failed tools, exact artifact.
  - Both scenarios recorded canonical prompt SHA-256 `53966da264796e0a74c6f17304644bdacaf8ae3c2bfa87012d7545fc71759dcf`, definition ID `autobyteus-memory-compactor`, requested model identity and nonblank real child run ID(s).
- Commands, environment, fixture, or broader-validation delta:
  - Imported configured managed-provider credentials with the documented `pnpm secrets:import` command into the canonical ignored test DB/vault; no process sourced `/Users/normy/.autobyteus/server-data/.env`.
  - Preflighted both scenarios; LM Studio used its local model catalog and required no secret.
  - Ran selected DeepSeek and Qwen scenarios separately through `pnpm test:e2e:real`; both server E2E selections passed 2/2.
  - Ran the focused shared-harness unit suite (15/15), product-compactor typecheck, full server build and built-in bootstrap smoke.
  - Unloaded the local Qwen instance, removed the test DB/key/sidecars/runtime/temp workspaces, verified no owned processes, preserved the source file and `.env.test`, and scanned 13 Round-6 evidence files against 12 credential-like values in exact, URL-encoded and base64 forms with zero matches.

#### Prior Failure Resolution

- `TCR-001`: remains `Resolved`; both current live results returned and asserted `recoverableToolFailureCount: 0`.
- No new production failure. Retained non-authoritative attempts were bounded API/E2E-owned corrections: asynchronous model-discovery usage, resolved-model property selection, Qwen's original 300-second wait, fixture sizing, and a raw-row exclusion assertion that matched a semantic mention of `record_type`.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-006-deepseek-product-compactor-five-percent-02.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-006-lmstudio-qwen36-product-compactor-five-percent-03.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-006-live-harness-unit-02.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-006-server-build.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-006-cleanup.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-006-secret-leak-scan.log`
- Prior result and confidence: `Pass / 96%`.
- Current result and confidence: `Pass / 98%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional review of the cumulative durable test delta.
- Remaining risks, blocked evidence, or untested scope:
  - Both models retained task-critical facts and continued exactly, but natural-language compaction quality and latency remain model-dependent; one realistic task is not a general evaluation corpus.
  - Process termination between normal publication writes remains explicitly out of scope.
  - Browser/Electron remains inapplicable because no UI or shell boundary changed.

### API-REV-007 — Natural compactor sizing, canonical history, and prompt-audit 2

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`; `CRR-009 Pass`; API/E2E execution round 7.
- Triggering finding or scenario IDs: `SCN-019` newly records the SR-010 natural-count/canonical-history/audit transition; `SCN-001`–`SCN-018` were rechecked as preserved or realistic continuation coverage. No open prior failure ID existed.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-010`, `ARCH-REV-006`, `IR-003`, `CRR-009`; prior delivery baseline `DR-001`–`DR-005` retained as upstream evidence.
- Why this coverage/execution revision was recorded: IR-003 removes fixed 1–3 episode / 20-fact policy, makes the renderer/finalizer the sole canonical history owner, preserves every structurally valid natural output through accepted publication, writes prompt audit value 2, and directly reads supported immutable audit 1/2 chains. Existing durable tests contained stale fixed-count, duplicate-prompt, removed-schema, old-injection, and fail-open migration expectations.
- Implementation/integrated commit executed: `c6c60b9996d61ef373236b66437844cd8b315af8` plus the API-REV-007 test/harness-only delta.
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` for the exact approved full-file prompt golden and fixed-count/internal-policy absence.
  - Updated core builder, summarizer, parser, normalizer, lineage store/resolver, and manager/tool-lifecycle tests for exact renderer ownership, canonical one-User-turn reconstruction, boundary/media/tool preservation, input non-mutation, 4+/20+ accepted output, mixed audit 1 -> 2, audit 3 rejection, exact current projection and typed origins.
  - Updated the shared live harness and outer server E2E to require prompt audit 2 for every completed record without a preferred/max output count.
  - Updated three server compactor fixtures to current output/resolver contracts and two required-migration E2Es to the approved fail-closed aggregate/retry contract.
  - Round-7 durable delta: `15 Updated`, `0 Added`, `0 Removed`; production source unchanged.
- Scenarios added, changed, removed, or rechecked:
  - `SCN-019`: exact 2,788-byte prompt; builder byte-equals renderer; one canonical User turn; reserved boundary/tool/media behavior; 5 episodes/25 facts through parser, 4 episodes/25 facts through normalization and accepted manager publication; archive/output/lineage/current projection/origin; new audit 2; mixed 1 -> 2; unsupported 3 rejection.
  - `SCN-001`–`SCN-016`: recurrent current authority, R(n)-only archive, v5 snapshot/tool/media restore, reset/fail-closed startup, trusted interruption, retry non-mutation, scope/provider/launch, Event Monitor and Work Evidence rechecked through complete memory, affected server and full deterministic root E2E coverage.
  - `SCN-018`: managed `deepseek-v4-flash`, exact 5% trigger 49,936 at effective context 1,000,000, one product compaction, model-chosen 1 episode/8 facts, audit 2, exactly two reads/one write/zero failed tools, exact continuation.
  - `SCN-017`: keyless local `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234`, exact 5% trigger 13,043 at effective context 262,144, two recurrent product compactions, model-chosen 1 episode/3 facts then 1 episode/0 facts, audits `[2,2]`, exact tools/current projection/continuation.
- Commands, environment, fixture, or broader-validation delta:
  - Focused natural contract passed 6 files/28 tests; complete core memory passed 33/150; runtime selection passed 3/15; prompt/harness passed 16/16; focused server compactor passed 17/17; affected server passed 88/88.
  - The final deterministic root E2E passed 50 files/174 tests with 14 files/49 tests explicitly gated; current core/shared/server build and sanitized built-in bootstrap smoke passed.
  - Used documented `pnpm secrets:import` into the canonical ignored test DB/vault; never sourced or modified the owner-private assignment file; `.env.test` remained unchanged. Qwen required no API key.
  - The installed full-file prompt SHA was `944dbdbd3db1146f80fdb7fe5ec2817422eec74f8eca3f4743a336169a2a8348`; the frontmatter-stripped system-prompt SHA recorded by both live child runs was `73aaff91c63d2b68b91467f00302bfe2940c0037b9e08d1fa6373d1f96274dc7`.
  - Removed the imported DB/key/sidecars, runtime/temp workspaces and loaded Qwen model; verified no owned process; scanned 20 Round-7 evidence logs against 12 nonblank API-key values in exact, URL-encoded and base64 forms with zero matches.

#### Prior Failure Resolution

- No unresolved prior failure existed. `TCR-001` remains resolved: both current live journeys returned and asserted zero failed tools.
- Initial round-7 failures were bounded API/E2E-owned stale coverage, not implementation failures: fixed-count/duplicate-prompt expectations, three removed-schema/injection fixtures, and two required-migration E2Es expecting startup after `FAILED`. All were corrected and passed focused plus broader reruns.
- No new failure ID remains.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-natural-contract-focused-02.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-core-memory-broad-02.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-core-runtime-broad-02.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-server-prompt-harness-unit-01.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-server-compactor-focused-02.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-server-affected-broad-01.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-root-deterministic-e2e-02.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-core-server-build-01.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-deepseek-natural-compactor-five-percent.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-lmstudio-qwen36-natural-compactor-five-percent.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-cleanup.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/api-rev-007-secret-leak-scan.log`
- Prior result and confidence: `Pass / 98%` (`API-REV-006`).
- Current result and confidence: `Pass / 98%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional review of the 15 updated durable test/harness paths.
- Remaining risks, blocked evidence, or untested scope:
  - Model-chosen semantic density and latency are probabilistic. Qwen was slower and sparser than DeepSeek, but both current journeys preserved all continuation anchors and exact task completion.
  - The two-model live sample is strong boundary evidence, not a general compaction-quality benchmark corpus.
  - Process termination between normal publication writes remains explicitly outside approved scope.
  - Browser/Electron is inapplicable because no UI, renderer, IPC, preload, or desktop-shell boundary changed.
