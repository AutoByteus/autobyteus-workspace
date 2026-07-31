# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-compactor-prompt-content-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001` through `DR-005`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-007`
- Current Investigation Round: `7`
- Trigger: `CRR-009` source-review `Pass` for `IR-003` / `SR-010` at commit `c6c60b9996d61ef373236b66437844cd8b315af8`; validate natural model-chosen counts, exact canonical prompt/history composition, full accepted publication and mixed prompt-audit lineage, preserved SR-004 boundaries, and realistic product compactor quality.
- Prior Investigation Reviewed: This file, rounds 1–6 / `API-REV-001`–`API-REV-006`
- Latest Completed Authoritative Investigation: This file, round 7

## Round 7 Natural Semantic Sizing And Canonical History Investigation

### Approved Delta And Changed Boundaries

- Current reviewed basis: `SR-010`, `ARCH-REV-006 Pass`, `IR-003`, `CRR-009 Pass`. The integrated implementation commit under validation is `c6c60b9996d61ef373236b66437844cd8b315af8`.
- Prompt boundary: `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` must byte-equal the user-approved supplement. It removes the fixed 1–3 episode / 20-fact policy, instructs the model to choose the smallest sufficient episode structure and the facts actually required, retains the exact six-field JSON object, and introduces no ticket-specific token ceiling or internal storage/lineage terminology.
- Operation-message boundary: `WorkingContextCompactionPromptBuilder` returns exactly one renderer-owned `<conversation_history>` block. `CompactionConversationHistoryRenderer` uses `WorkingContextFinalizer` before labels, so adjacent compatible earlier-summary and retained/current user constituents are one canonical `User:` turn; assistant, complete tool protocol, selected media, reserved-boundary escaping, deterministic head/tail bounds, redaction, and source input immutability remain intact.
- Accepted-output boundary: parser, result normalizer, accepted builder, lineage-record normalizer/store, committer, current-head loader/projector, and typed origin resolver must retain every structurally valid natural output item. At least one episode, per-entry character bounds, exact fields, cleanup, deduplication, noise filtering, positive salience, unique IDs, safe archives, scope/predecessor integrity, and complete output existence remain enforced.
- Audit boundary: new accepted records write `promptContractVersion: 2`; immutable supported predecessor value `1` remains directly usable in a mixed `1 -> 2` chain without content decoding or rewrite; unsupported value `3` fails validation.
- Preserved boundaries: R(n)-only archive membership, manager-owned publication, lineage-tail current authority, message-only v5 snapshots, startup reset/fail-closed start, trusted interruption recovery, Event Monitor active-only behavior, Work Evidence separation, scope/provider/launch configuration, and no compatibility reader/alias/state pointer.

### Existing Coverage Validity Decisions

| Path / Scenario | Decision | Investigation Basis / Required Maintenance |
| --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts` | `Needs Update` | Stale assertions expect two consecutive `User:` labels and injected JSON/count policy. Replace with exact builder-equals-renderer, one canonical user turn, reserved-boundary escaping, assistant/Tool/media preservation, source non-mutation, and history-only negative assertions. Its incomplete-protocol mutation changes metadata while leaving messages complete; make the actual message protocol incomplete. |
| `autobyteus-ts/tests/unit/memory/compaction-response-parser.test.ts` | `Needs Update` | Stale 3/20 truncation and error text failed discovery. Prove >3/>20 retention while preserving configured per-entry clamps, exact-field checks, required arrays, and at-least-one episode. |
| `autobyteus-ts/tests/unit/memory/compaction-result-normalizer.test.ts` | `Needs Update` | Stale fourth-episode drop failed discovery. Prove natural episode/fact retention plus deterministic order, dedupe, noise filtering and positive salience. |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` | `Needs Update` | Existing substring expectations describe the superseded prompt (`someone`, manual pasted-history guidance, `episodic_summary`). Replace with an exact full-file golden and explicit absence of fixed-count/internal-policy leakage. |
| `autobyteus-ts/tests/unit/memory/file-compaction-lineage-store.test.ts` | `Needs Update` | Existing chain/current-tail/integrity coverage remains valid but uses only audit 1 and one output item. Add 4/25 head membership, mixed 1/2 preservation, exact projection, and unsupported-audit immutable rejection. |
| `autobyteus-ts/tests/unit/memory/compaction-lineage-resolver.test.ts` | `Needs Update` | Existing direct/root typed integrity scenarios remain valid. Extend the predecessor/head audit values to 1/2 and resolve the tail episode plus twenty-fifth fact recursively. |
| `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` | `Needs Update` | Existing real manager/tool-safe publication remains valid. Expand deterministic runner output to 4 episodes/25 facts and assert archive/output/lineage version 2/current projection/origin instead of relying only on the implementation probe. |
| `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts` | `Still Valid / Recheck` | Runtime request/compaction/retry and current-user continuation remain requirement-linked and count-neutral; add only audit/current projection assertions if the focused publication test does not cover them directly. |
| Startup reset, v5 snapshot/bootstrap, trusted interruption, Event Monitor, Work Evidence, scope, launch/provider and server-start suites recorded in API-REV-001/002 | `Still Valid / Recheck` | SR-010 preserves these boundaries; execute the focused affected selections and current builds rather than rewriting unchanged contracts. |
| SCN-017/018 server live compactor journeys | `Needs Update / Re-execute` | Harness already uses the real product `ServerCompactionAgentRunner` and dynamically compares the installed definition to `agent.md`, but API-REV-006 prompt hash/semantic output is superseded. Re-run with the new exact prompt and inspect phase separation/continuation anchors without exact episode/fact counts. |

### Discovery Evidence And Initial Plan

- Authoritative commands discovered: core uses direct `pnpm exec vitest run ... --no-watch` and `pnpm build`; server `AGENTS.md` requires `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; root scripts provide `pnpm test:e2e`, `pnpm test:e2e:real:preflight`, `pnpm test:e2e:real`, and documented `pnpm secrets:import`.
- Focused pre-maintenance discovery executed five directly affected core unit files. Result: `3 failed / 2 passed` files and `5 failed / 20 passed` tests. Every failure is a stale fixed-count/canonical-turn expectation: parser expected 3/20 and obsolete error text, normalizer expected the fourth episode to be dropped, builder expected two user labels and injected prompt schema, and the incomplete-protocol test mutated only unit metadata while keeping a complete message protocol.
- Evidence: `evidence/api-e2e/api-rev-007-stale-focused-discovery.log`.
- No discovery failure is classified as an implementation defect. The approved SR-010 behavior requires replacing these assertions rather than restoring fixed caps or duplicate operation policy.
- Durable coverage plan: update the seven affected paths above and add no parallel compatibility suite. If exact full prompt coverage fits cleanly in the existing built-in-template file, update it rather than add a redundant file.
- Repository execution plan: narrow updated prompt/parser/normalizer/lineage/resolver tests; integration accepted-publication/runtime tests; complete current core memory suite; focused server template/launch/reset/scope/presentation tests; core/server builds; broader root E2E as warranted by post-repository confidence.
- Broader-validation decision at investigation gate: `Required`. The user explicitly requested semantic quality through the actual built-in compactor, and the prompt itself is the changed provider-facing behavior. Re-run both managed DeepSeek and keyless LM Studio Qwen at five percent, inspect exact installed prompt identity, output phase separation, current projected memory, retained active history, new current-user constituent, exact continuation, tools, lineage/audit version, and logs. Do not assert a preferred item count or perfect future semantics.
- Browser/desktop decision: `Not Applicable`. SR-010 changes backend/core prompt, parsing, persistence audit, and generated history; no renderer, browser API, IPC, preload, window, or packaging boundary changed.

### Round 7 Maintenance Completed

- Updated `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` to byte-check the complete approved `agent.md` and reject fixed count/internal contract text.
- Updated the core prompt builder, summarizer, parser, normalizer, lineage store, lineage resolver, and manager/tool-lifecycle coverage. The deterministic accepted-publication path now carries `4` episodes and `25` facts through archive/output publication, prompt audit `2`, current-tail projection, and typed direct/root origin resolution.
- Added mixed immutable prompt-audit coverage for a supported `1 -> 2` chain and immutable rejection of unsupported audit `3`.
- Updated the shared live harness and outer server E2E to require audit `2` for every completed real compaction without imposing an episode/fact count.
- Repaired stale server fixtures rather than production behavior:
  - current `episodes` output replaced removed `episodic_summary` fixtures;
  - the parent-fallback integration now uses the current `createLLM` injection and registered provider metadata;
  - two token-usage migration E2Es now expect the approved required-migration aggregate rejection on `FAILED`, then prove the persisted result and successful unresolved-row retry.
- API/E2E changed test/harness code only. No production source, compatibility reader, alias, cap, or legacy output contract was added.

### Round 7 Final Execution And Quality Decision

- Focused natural-contract selection: `6 files / 28 tests` passed.
- Complete current core memory suite: `33 files / 150 tests` passed. Runtime/manager lifecycle selection: `3 files / 15 tests` passed.
- Focused server compactor selection: `3 files / 17 tests` passed. Broader affected server selection: `15 files / 88 tests` passed.
- Full deterministic server E2E after stale required-migration repair: `50 files / 174 tests` passed; `14 files / 49 tests` were explicitly environment-gated and skipped.
- Current core/shared/server build and sanitized built-in bootstrap smoke passed.
- Managed DeepSeek at exact five percent completed one real product-child compaction, chose `1` episode and `8` facts, wrote audit `2`, performed exactly two reads and one write with zero failures, and produced the exact continuation artifact. Its summary was concise, phase-correct, and retained every selected anchor.
- Local LM Studio Qwen at exact five percent completed two recurrent real product-child compactions, chose `1` episode / `3` facts and then `1` episode / `0` facts, wrote audits `[2, 2]`, performed exactly two reads and one write with zero failures, and produced the exact continuation artifact. Its first boundary correctly recorded pending work; the current head replaced that state with the successful read and all selected anchors. It was slower and sparser than DeepSeek but continuation-ready.
- Both real journeys used built-in definition `autobyteus-memory-compactor`, the approved `2,788`-byte file (`SHA-256 944dbdbd3db1146f80fdb7fe5ec2817422eec74f8eca3f4743a336169a2a8348`), extracted system-prompt hash `73aaff91c63d2b68b91467f00302bfe2940c0037b9e08d1fa6373d1f96274dc7`, the default `ServerCompactionAgentRunner`, nonblank child run IDs, actual current-memory projection, retained natural history, and the exact new current-user constituent.
- Result: `Pass / 98%`. Natural output quantity is now model-chosen, structural preservation above the old caps is directly proven, and two realistic models continued exactly. Residual uncertainty is model-dependent language quality/latency, not a known implementation failure.

### Round 7 Authoritative Evidence

| Surface | Result | Evidence |
| --- | --- | --- |
| Focused natural contract | Pass: 6 files / 28 tests | `evidence/api-e2e/api-rev-007-natural-contract-focused-02.log` |
| Core memory and runtime | Pass: 33 files / 150 tests; runtime selection 3 files / 15 tests | `evidence/api-e2e/api-rev-007-core-memory-broad-02.log`; `api-rev-007-core-runtime-broad-02.log` |
| Server prompt, runner, affected integration | Pass: prompt/harness 16/16; compactor 17/17; affected 88/88 | `evidence/api-e2e/api-rev-007-server-prompt-harness-unit-01.log`; `api-rev-007-server-compactor-focused-02.log`; `api-rev-007-server-affected-broad-01.log` |
| Required-migration stale E2E repair | Pass: 4/4; full deterministic E2E 174 passed / 49 gated skips | `evidence/api-e2e/api-rev-007-required-migration-stale-e2e-fix-01.log`; `api-rev-007-root-deterministic-e2e-02.log` |
| Build/bootstrap | Pass | `evidence/api-e2e/api-rev-007-core-server-build-01.log` |
| Managed DeepSeek real compaction | Pass 2/2; one compaction; 1 episode / 8 facts; audit 2; exact continuation | `evidence/api-e2e/api-rev-007-deepseek-natural-compactor-five-percent.log` |
| Local Qwen real compaction | Pass 2/2; two compactions; natural sparse counts; audits 2/2; exact continuation | `evidence/api-e2e/api-rev-007-lmstudio-qwen36-natural-compactor-five-percent.log` |
| Cleanup/security | Pass; owned DB/vault/temp/model/process state removed; 20 evidence files scanned against 12 values in three encodings, zero matches | `evidence/api-e2e/api-rev-007-cleanup.log`; `api-rev-007-secret-leak-scan.log` |

## Round 6 Canonical Product Compactor Agent Validation

- Coverage-validity decision: `Needs Update`, completed. API-REV-004/005 proved compaction mechanics, actual context projection, tools, persistence and continuation, but their live runner supplied a shortened test-owned compactor prompt. That evidence remains valid for those mechanics; it was not a fair evaluation of the product Memory Compactor's semantic quality.
- Correct product boundary: the shared server harness now omits `compactionAgentRunnerFactory`. The default `ServerCompactionAgentRunner` launches a real visible child run from persisted built-in definition `autobyteus-memory-compactor` through `AgentRunService`, using the parent's resolved model when the built-in definition has no default launch config.
- Canonical-prompt proof: the harness loads `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md`, verifies that the persisted built-in instruction is byte-for-byte equal, and records SHA-256 `53966da264796e0a74c6f17304644bdacaf8ae3c2bfa87012d7545fc71759dcf`. Both authoritative logs show the real child system prompt, definition ID, model identifier, and distinct nonblank compaction run ID(s).
- Live-task proof: each parent agent reads coherent incident evidence through real tools, naturally crosses the exact five-percent context-derived threshold, deletes its source evidence, receives a new user instruction, and must use compacted memory plus retained natural history to write one exact nine-field JSON artifact. The contract requires exactly two successful reads, one successful write, zero failed tools, exact selected-memory anchors, exact retained-history anchors, and the exact new current-user constituent.
- DeepSeek result: `deepseek-v4-flash` used effective context `1,000,000`, threshold `49,936`, prompt samples `[1142, 14436, 14609, 56156, 43340, 43616]`, and one completed product-compactor run. It retained the exact customer, rollback, safety and verification values, combined them with retained Part B and the new constraint, and wrote the exact artifact. Its memory was concise and continuation-ready. It recorded the response as pending at the compaction boundary and mentioned truncation/no blockers; those statements were accurate at that boundary and were resolved by active continuation. No task-critical fact was fabricated.
- LM Studio Qwen result: `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234` used effective context `262,144`, threshold `13,043`, prompt samples `[1125, 14516, 14816, 3312, 3511, 3757]`, and two recurrent completed product-compactor runs. The current tail contained three continuation-relevant episodes plus the exact selected Part A anchors; Part B remained in natural history; the current user was exact; and the final artifact was exact. The earlier custom-prompt claim of “escalating retry pressure” did not appear. Qwen was more verbose and slower, and it described the at-boundary response as open work, but its task-critical memory was faithful and sufficient for exact continuation.
- Comparative quality judgment: both canonical-product journeys are good for continuation. DeepSeek is slightly more concise and focused; Qwen is more verbose but did not lose the required facts. This is a model-output assessment, not a claim that arbitrary future summaries will be semantically perfect.
- `gpt-5.4-mini` context note: project runtime/catalog metadata and the earlier API-REV-002 live log use an effective context window of `400,000` tokens and maximum output of `128,000`. This is a project configuration/observation, not a universal deployment guarantee.
- Round 6 result: `Pass / 98%`. The former test-owned compactor-prompt mock gap is closed for both live providers. No implementation or compatibility behavior changed.

### Round 6 Authoritative Evidence

| Command / Mode | Result | Evidence |
| --- | --- | --- |
| Documented `pnpm secrets:import` dry-run and interactive import into the canonical ignored test DB/vault | Pass; nine recognized IDs configured without value output | `evidence/api-e2e/api-rev-006-secret-import-dry-run.log`; `api-rev-006-secret-import.log` |
| Canonical-product preflight for DeepSeek and keyless LM Studio Qwen | Pass; both scenarios ready; Qwen discovered from the local LM Studio model catalog | `evidence/api-e2e/api-rev-006-real-compactor-preflight-02.log` |
| `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` | Pass 2/2; one canonical product compaction; exactly three successful tools and zero failed; exact artifact and projection | `evidence/api-e2e/api-rev-006-deepseek-product-compactor-five-percent-02.log` |
| `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Pass 2/2; two recurrent canonical product compactions; exactly three successful tools and zero failed; exact artifact and current-tail projection | `evidence/api-e2e/api-rev-006-lmstudio-qwen36-product-compactor-five-percent-03.log` |
| Focused harness unit, server typecheck/build/bootstrap smoke | Pass: unit 15/15; typecheck/build/bootstrap pass | `evidence/api-e2e/api-rev-006-live-harness-unit-02.log`; `api-rev-006-server-product-compactor-tsc-01.log`; `api-rev-006-server-build.log` |
| Cleanup and credential-value scan | Pass; no owned DB/key/temp/process/model state; 13 Round-6 evidence files scanned against 12 credential-like values with zero matches | `evidence/api-e2e/api-rev-006-cleanup.log`; `api-rev-006-secret-leak-scan.log` |

### Round 6 Durable Coverage Decisions

- Updated `test-support/live-e2e/live-e2e-harness.ts` to remove the test-owned compactor runner/prompt and assert the canonical built-in definition, prompt hash, real child-run metadata, recurrent current-tail projection, exact tools and continuation artifact.
- Updated `test-support/live-e2e/live-e2e-scenarios.mjs` and `test-support/live-e2e/live-e2e-scenarios.d.mts` with the keyless `lmstudio.qwen36.compaction-agent-flow` scenario and nullable secret metadata.
- Updated `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` for local no-secret preflight, product-compactor result assertions and model-specific timeouts.
- Updated `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` for dynamic keyless LM Studio coverage and registration guards.
- Retained `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts` as lower-level real-provider/runner/projection coverage; it is no longer cited as the authoritative product-compactor quality evaluation because it intentionally owns a shortened prompt.
- No production source or compatibility path changed.

## Round 5 TCR-001 Exact-Zero Failed-Tool Contract Fix

- Triggering review: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-test-review-report.md`, round 4 / `CRR-006`, finding `TCR-001`.
- Finding classification: bounded `Local Fix` owned by API/E2E. API-REV-004's successful execution and `Pass / 96%` confidence were not invalidated.
- Validity decision: `Needs Update`. `test-support/live-e2e/live-e2e-harness.ts` already rejects any failed tool and returns `recoverableToolFailureCount: 0`; the authoritative DeepSeek run also returned zero. The outer E2E assertion `toBeLessThanOrEqual(2)` was stale and weaker than the reviewed scenario contract.
- Durable correction: `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` now asserts `recoverableToolFailureCount` is exactly `0`.
- Focused execution: the documented encrypted-vault import was repeated, followed by the exact selected `deepseek.compaction-agent-flow` through `pnpm test:e2e:real`. The current-code server build passed, the real test passed 2/2, the five-percent compaction completed once, three tools succeeded, and the exact-zero outward assertion passed with `recoverableToolFailureCount: 0`.
- Setup note: two non-authoritative import attempts could not satisfy the CLI's real-TTY requirement; the third used the documented interactive confirmation path and configured nine recognized secret IDs without printing values. This was execution setup, not product or test failure.
- Cleanup: the canonical test DB/key/sidecars, generated test runtime, temp workspaces, and owned processes were removed. The owner source file was preserved. 120 retained evidence files were scanned against 12 credential-like source values in exact, URL-encoded and base64 forms with zero matches.
- Round 5 result: `Pass / 96%`. `TCR-001` is resolved; no confidence recalculation is needed because API-REV-004 evidence already returned zero and this round strengthens and directly executes the durable outward contract.

### Round 5 Focused Evidence

| Command / Mode | Result | Evidence |
| --- | --- | --- |
| Interactive documented `pnpm secrets:import` into canonical ignored test DB/vault | Pass; nine recognized IDs configured without value output | `evidence/api-e2e/api-rev-005-secret-import-03.log` |
| `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` | Pass: build; server E2E 2/2; one five-percent compaction; three successful tools; exact zero failed tools; exact artifact/projection | `evidence/api-e2e/api-rev-005-deepseek-exact-zero-real-compaction.log` |
| Cleanup and credential-value scan | Pass; no owned state/process remains; 120 files / 12 values / zero matches | `evidence/api-e2e/api-rev-005-cleanup.log`; `api-rev-005-secret-leak-scan.log` |

## Round 4 Five-Percent Projected-Memory And Continuation-Quality Delta

- User correction accepted: two percent produced too little selected history and encouraged repeated low-value compaction churn. Five percent is the current durable live-test ratio. It requires a more substantial coherent history before compaction and gives a materially better continuation-quality witness.
- Quality question to prove: after one meaningful compaction, does the actual next outbound model invocation contain (1) the exact projected compacted-memory user region, (2) retained natural continuation that has not yet been compacted, and (3) the exact new current-user instruction, and can the agent use that combined context to complete a real follow-up?
- Composition rule confirmed during investigation: the compaction manager selects only a settled prefix. In the final five-percent journeys Part A is the selected `R(n)` and must appear in `M(n)`; Part B remains in retained natural tool history and must remain in the same final outbound invocation. Requiring Part B inside `M(n)` would incorrectly demand premature compaction. The quality assertion therefore checks selected-input anchors in `M(n)`, all Part A/B anchors across the actual outbound invocation, and the exact current-user constituent separately.
- Durable coverage decision: `Update`, not add another suite. The existing environment-gated LM Studio test and managed-vault DeepSeek scenario now use exact `compaction_ratio=0.05`, capture primary-model invocations with working-context provenance, print value-safe quality evidence, assert actual projected constituents, and require exact continuation output. The managed journey additionally requires exactly two successful reads, one successful write, and zero failed tools.
- Qwen fixture/result: Part A has 40 operational records; Part B has 100. The prompt crossed `13,043` tokens at `14,525`, completed exactly one compaction over two selected blocks/four raw traces, performed a post-compaction third `read_file`, and returned the exact nine-field continuation JSON after the source evidence was deleted.
- DeepSeek fixture/result: Part A has 180 operational records; Part B has 570. Prompt usage crossed `49,936` at `56,153`, completed exactly one compaction over two selected blocks/four raw traces, and produced the exact nine-field artifact through two successful reads and one successful write after both evidence files were deleted.
- Actual projection result: both models projected Part A through the dedicated user-role compacted-memory constituent, retained Part B elsewhere in natural history, supplied the final instruction through the exact current-user constituent, and exposed all eight learned anchor values in the final outbound invocation. Both agents then produced the exact combined continuation result.
- Human quality assessment:
  - DeepSeek preserved the task-critical customer, rollback, safety, verification and path concisely enough for exact continuation. It also stated an incidental shard range that is not supported by the complete generated fixture. Quality is good for task continuation, not perfectly faithful in low-value filler.
  - Qwen preserved all task-critical Part A values and the continuation succeeded exactly, but the compaction was verbose, mislabeled finished/filler observations as critical/open work, and inferred “escalating retry pressure” from cyclic `0..4` queue-depth samples. It is usable for continuation but less precise and trustworthy than DeepSeek.
- Calibration evidence is retained rather than hidden: oversized DeepSeek data caused recurrent replacement/output failures; smaller data did not reach five percent; Qwen initially mishandled write-tool requests despite retaining the facts. These were test/model calibration observations. The final durable journeys prove a single meaningful five-percent compaction and correct continuation without weakening a selected failure into a skip.
- Round 4 result: `Pass / 96%`. Mechanics, projection, and task-critical continuation pass directly. The reduced confidence versus API-REV-003 truthfully reflects observed external-model semantic noise and unsupported incidental inferences; the result does not claim perfect summary quality.

### Round 4 Completed Repository And Live Evidence

| Order | Command / Mode | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Documented `pnpm secrets:import` dry-run and confirmed TTY import into canonical ignored test DB | Current `.env.test` + encrypted-vault provider setup; no ambient secret dependency | Pass; nine recognized secrets configured without value output | `evidence/api-e2e/managed-five-percent-secret-import-dry-run-01.log`; `managed-five-percent-secret-import-execution-03.log` |
| 2 | Managed `deepseek.compaction-agent-flow` at exact five percent | Real DeepSeek agent/compactor, actual primary invocation, real reads/write, archive/output/lineage, exact continuation | Pass: 2/2; context `1,000,000`; threshold `49,936`; one compaction; three successful tools; zero failures | `evidence/api-e2e/managed-deepseek-v4-flash-five-percent-real-compaction-07.log` |
| 3 | Opt-in LM Studio Qwen compaction test at exact five percent | Local no-key agent/compactor, actual primary invocation, real reads, post-compaction tool continuation and exact response | Pass: 1/1; context `262,144`; threshold `13,043`; one compaction; three successful reads; zero failures | `evidence/api-e2e/lmstudio-qwen36-five-percent-real-compaction-04.log` |
| 4 | Default-safe Qwen collection, managed harness unit, core build and server typecheck | Environment gating, five-percent constants/result contract, current package compilation | Pass/skip as designed; unit 14/14; builds pass | `evidence/api-e2e/lmstudio-qwen36-five-percent-default-safe-01.log`; `managed-five-percent-harness-unit-02.log`; `core-five-percent-build-03.log`; `server-five-percent-tsc-04.log` |
| 5 | Owned-state cleanup and credential-value scan | Remove canonical test DB/vault/runtime/temp state; preserve owner source; scan retained evidence | Pass; no owned state/process remains; 114 files scanned against 12 values with zero matches | `evidence/api-e2e/api-rev-004-cleanup.log`; `api-rev-004-secret-leak-scan.log` |

### Round 4 Durable Coverage Decisions And Result

- Updated five-percent/projected-quality paths:
  - `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts`
  - `test-support/live-e2e/live-e2e-harness.ts`
  - `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts`
  - `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts`
- No production source or compatibility path changed in this round.
- Final broader-validation decision: `Required — completed`.
- Final confidence: `96%`; every applicable category is at least `93%`.
- Residual risk: task-critical continuation is directly proven, but generated memory may include verbose categorization or unsupported incidental trend/range inferences. This is model-semantic quality variability, visible in retained evidence and not concealed by the exact-output assertion.

## Round 3 Real Local-Model Compaction Coverage Delta

- Question to prove: whether one real agent can execute a meaningful tool-based task, naturally cross a two-percent compaction threshold, compact with the same real local model, retain task-critical facts, and continue through another real tool call to a correct artifact.
- Selected surface: `autobyteus-ts` AgentFactory/runtime, native LM Studio OpenAI-compatible transport, `qwen/qwen3.6-35b-a3b`, real file tools, real file-backed memory/lineage stores, current structured-JSON strategy, and an LLM-backed `CompactionAgentRunner`.
- Configuration: exact `compactionRatio=0.02`; API tool-call mode; explicit opt-in gate so ordinary deterministic CI does not depend on a running local model.
- Meaningful-task fixture: an isolated incident-analysis workspace containing substantial structured evidence. The first turn must read the evidence through real tools. The original evidence becomes unavailable before the follow-up so the final artifact cannot be produced by rereading it; the follow-up supplies a new constraint and requires a real write tool.
- Required mechanics assertions: model/runtime identity, positive discovered context, computed two-percent threshold, observed prompt-token usage at or above threshold, `requested -> started -> completed`, valid execution metadata, non-empty archive/output/lineage, no failed phase, and post-compaction agent continuation.
- Required quality assertions: the final artifact preserves exact critical facts learned only before compaction, incorporates the new post-compaction constraint, and is created through the real tool path after compaction.
- Existing durable coverage decision:
  - `agent-runtime-compaction.test.ts`: `Needs Update`. Round-3 default-safe execution exposed a retained `episodic_summary` runner fixture and obsolete labeled-prompt assertion; both contradict the exact `episodes` response and natural one-boundary prompt already approved in REQ-005/REQ-010.
  - `memory-compaction-strategy-tool-lifecycle.test.ts`: `Needs Update`. Round-3 default-safe execution exposed both the removed `episodic_summary` fixture and a stale relative `read_file` invocation that no longer supplies the tool's required path context. Preserve the lifecycle purpose while changing only those obsolete expectations/setup and the removed prompt-label assertion.
  - `memory-tool-call-flow.test.ts`: `Still Valid` as a local-provider tool probe, but it does not compact and currently tolerates provider failures.
- New coverage decision: `Add Durable Coverage` as a credential-free, environment-gated LM Studio E2E. It must skip only when explicit opt-in/configuration is absent; once selected, unavailable model behavior, missing tool calls, compaction failure, or quality loss must fail rather than warn-and-return.
- Environment discovery: LM Studio responds at `http://localhost:1234`; native discovery advertises `qwen/qwen3.6-35b-a3b` with `max_context_length=262144` and tool-use capability. No API key is required. At investigation time the model is available for just-in-time loading and has no preloaded instance.
- Managed-provider correction after user review:
  - `autobyteus-ts/tests/integration/agent/deepseek-single-agent-flow.test.ts` is `Stale / Remove`: it reads `DEEPSEEK_API_KEY` from ambient process state and constructs `DeepSeekLLM` without the required injected `ProviderApiKeyResolver`. That bypasses the current one-database encrypted-vault architecture and, when selected, reaches the runtime error path rather than proving current provider use.
  - Replacement ownership is the existing server real-E2E framework (`test-support/live-e2e/**` plus `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts`). It reads the fixed non-secret `.env.test`, uses the documented `pnpm secrets:import` against the explicit canonical test database, launches the isolated test runtime, and resolves provider keys through `SecretManagementProviderApiKeyResolver`.
  - Existing `deepseek.agent-flow` is `Needs Update`: its managed-secret boundary is current, but its one-word/no-tool turn does not prove the meaningful tool and compaction behavior requested in this round.
  - Add `deepseek.compaction-agent-flow` durable opt-in coverage through that same managed-vault framework. It must run `deepseek-v4-flash` at exact `compaction_ratio=0.02`, execute real file tools on substantial task evidence, observe the real token-budget and compaction lifecycle events, delete the source evidence, and verify exact retained non-identifier/non-timestamp task facts in a post-compaction artifact. Provider absence may skip only at the framework preflight; once configured and selected, a runtime or quality failure is a failure.
- Import/environment evidence discovered before the managed test edit:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/autobyteus-server-ts/.env.test` contains only `APP_ENV`, `DB_TYPE`, `DATABASE_URL`, and `AUTOBYTEUS_SERVER_HOST`; it intentionally contains no provider secret.
  - The documented importer is the sole credential transition path and requires explicit `--source` plus absolute `--database-url`; dry-run is value-free and non-mutating, while execution initializes/migrates the named DB/vault after direct-TTY confirmation.
  - A dry-run and confirmed execution against the canonical ignored test DB configured nine recognized secrets without printing values. The existing managed `deepseek.agent-flow` then passed 2/2 through the current resolver and normal AutoByteus backend; retained evidence paths are `managed-secret-test-db-import-dry-run-01.log`, `managed-secret-test-db-import-execution-01.log`, and `managed-deepseek-v4-flash-agent-flow-01.log`.
- Cleanup: use only a test-owned temporary workspace/memory directory, remove it in teardown, clean up LLM instances, restore registries/environment variables, and do not stop or unload the user-owned LM Studio service/model.
- Managed-secret cleanup: after the selected managed-provider executions, stop only the runner-owned built server, remove its generated runtime, and delete the API/E2E-owned canonical test DB, sibling vault key, and SQLite sidecars. Never edit or delete the user source assignment file.
- Round 3 result: `Pass / 98%`.

### Round 3 Completed Repository And Live Evidence

| Order | Command / Mode | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm secrets:import ... --dry-run`, then confirmed import into the canonical ignored test database | Documented `.env.test` + encrypted-vault provider setup; no ambient secret dependency | Pass; nine recognized secrets configured without value output | `evidence/api-e2e/managed-secret-test-db-import-dry-run-01.log`; `managed-secret-test-db-import-execution-01.log` |
| 2 | `pnpm test:e2e:real -- --scenarios=deepseek.agent-flow` | Existing managed-secret DeepSeek agent path remains viable | Pass: 2/2 | `evidence/api-e2e/managed-deepseek-v4-flash-agent-flow-01.log` |
| 3 | Managed `deepseek.compaction-agent-flow` | Real DeepSeek V4 Flash agent and compactor at exact 2%; two reads, one write, recurrent compaction, exact retained artifact | Pass: context `1,000,000`; threshold `19,974`; three completed compactions; three tool successes; zero tool failures | `evidence/api-e2e/managed-deepseek-v4-flash-real-compaction-08.log` |
| 4 | Opt-in LM Studio Qwen agent compaction test | Local no-key `qwen/qwen3.6-35b-a3b`, real file tools, exact 2% budget, one completed compaction, post-compaction constraint/read/write continuation | Pass: 1/1; context `262,144`; threshold `5,217`; exact final artifact | `evidence/api-e2e/lmstudio-qwen36-real-compaction-06.log` |
| 5 | Default-safe focused compaction/lineage selection | Current exact schema, lineage authority, retry, natural prompt, tool protocol; live Qwen test skips unless explicitly selected | Pass: 14 files / 64 tests; one live test skipped | `evidence/api-e2e/core-compaction-lineage-default-safe-04.log` |
| 6 | Managed live-E2E harness unit plus server build | Scenario registration, value-safe execution boundary, current shared/server compile/bootstrap | Pass: 14/14; build Pass | `evidence/api-e2e/managed-live-e2e-focused-final-03.log` |
| 7 | Cleanup and secret-value scan | Remove owned database/vault/runtime/temp state; preserve source assignment file; retain no credential value | Pass; zero owned process/temp match; 70 evidence files scanned against 13 credential-like source values with zero matches | `evidence/api-e2e/api-rev-003-cleanup.log`; `api-rev-003-secret-leak-scan.log` |

### Round 3 Durable Coverage Decisions And Result

- `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts`: `Added`. Explicitly selected only; a selected unavailable model or quality/mechanics failure fails rather than skips.
- `test-support/live-e2e/live-e2e-harness.ts`, scenario declarations, server real-E2E test, and its unit guard: `Updated` to add the managed-vault DeepSeek 2% quality journey.
- `autobyteus-ts/tests/integration/agent/deepseek-single-agent-flow.test.ts`: `Removed` because it depended on ambient `DEEPSEEK_API_KEY`, instantiated the provider without its required resolver, and was replaced by the current one-database/vault harness.
- `memory-compaction-strategy-tool-lifecycle.test.ts` and `runtime/agent-runtime-compaction.test.ts`: `Updated` after final default-safe execution exposed residual pre-clean-cut fixtures (`episodic_summary`, absent runner provider/runtime metadata, absent direct-test lineage authority, obsolete prompt label, and a stale relative file-tool call). Both now protect the approved current contract and pass.
- Qwen evidence includes one failed exploratory recurrent-quality run: after three compact/replace cycles it preserved the Part B/new constraint but substituted Part A at the final tool artifact. The final durable Qwen scenario therefore proves one real compaction plus continuation, while the separate DeepSeek durable scenario directly proves three recurrent compactions with exact output. The model-quality observation is retained rather than hidden; it is not an implementation failure or an approved acceptance-criterion failure.
- Final broader-validation decision: `Required — completed`.
- Final confidence: `98%`; every applicable category is at least `96%`. Residual uncertainty is bounded external-model semantic variability, not mechanics, storage, lineage, context budgeting, managed-secret resolution, or continuation.

## Round 2 Targeted Coverage Delta

- Question to prove: whether the live logs expose the correct model context budget, apply the configured low compaction ratio correctly, and show successful compaction lifecycle behavior for more than one provider.
- Selected surface: freshly built server process, GraphQL model catalog and run creation, real agent WebSocket, managed-secret resolution, real OpenAI and DeepSeek provider calls, runtime compactor launch, and detailed `compaction_budget_evaluated` server telemetry.
- Models: `gpt-5.4-mini` and `deepseek-v4-flash`.
- Run-local configuration: `compaction_ratio=0.0001`, `max_tokens=1024`; DeepSeek thinking disabled for the bounded probe. The low ratio was applied only to each parent run, not process-global state.
- Required log assertions: model context equals catalog metadata; reserved output, context-derived input cap, safety margin, input budget and threshold satisfy the production arithmetic; prompt tokens meet the threshold; `override_active=false`; `compaction_required=true`.
- Required behavior assertions: each real-provider turn streams `requested -> started -> completed`, emits no failed phase, selects and compacts one raw-backed block, completes the turn, and reports the same provider model through compactor execution metadata.
- Durable coverage decision: `Use Temporary Executable Probe Only`. This is credential-gated provider telemetry over behavior already protected by durable deterministic tests; no new test file should embed private-provider credentials.
- Round 2 result: `Pass`. Retained value-safe evidence: `evidence/api-e2e/live-provider-compaction-debug-telemetry-01.log`.

## Current Requirement And Design Basis

The validation basis is SR-004 and ARCH-REV-004, implemented through IR-002 and source-reviewed in CRR-002. The critical behavior is the current-schema-only native memory path:

1. A normal successful compaction requires non-empty newly selected raw-backed `R(n)`, archives exactly those active raw records, persists one-to-three episodes plus at most twenty semantics, then appends one reference-only lineage record. The valid lineage tail is the sole current-compaction authority.
2. Recurrent compaction is `M(n) = compact(M(n-1) + R(n))`. `M(n-1)` is visible to the compactor but is not re-archived; only the bounded complete `M(n)` is current.
3. The typed run-scoped resolver must distinguish direct from recursive roots, return `not_found` for unknown typed IDs, and fail integrity validation for broken current-format chains.
4. Finalized WorkingContext and schema-v5 snapshot own messages, media/tool payloads, and message-local constituent ranges only. No snapshot/state/manifest field owns compaction or output identity.
5. The required startup reset deletes exactly four pre-lineage derived files while preserving raw evidence. Required failures are durably recorded, aggregate across attempted migrations, reject `startConfiguredServer`, and prevent built-in bootstrap, app construction, and listen.
6. A supported native interruption writes a trusted raw `operation_boundary`; after the reset removes the snapshot, no-snapshot/no-lineage bootstrap restores that fence with raw/turn provenance, excludes untrusted variants, retains active natural history, writes valid v5, and carries the fence into the next follow-up request.
7. Compactor input is one natural, reasoning-free, ID-free, reserved-boundary-safe conversation block. Native compaction and generated Work Evidence share only the condensed readable value/tool-body policy; their source models and envelopes remain separate.
8. Event Monitor remains active-only, Work Evidence remains archive-plus-active, and external runtimes remain evidence-only for this ticket.

Critical acceptance criteria are `AC-003` through `AC-009`, `AC-011`, `AC-012`, `AC-014`, and `AC-015`. The required scenario set is `SCN-001` through `SCN-016`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / active raw evidence and Event Monitor | Preserved | REQ-001/002/008; AC-001/002 | Retain active-only projection/cursor coverage and prove no new snapshot/archive fallback. |
| BEH-002–003 / accepted compaction publication | Changed | REQ-003–005; AC-003/005/006; SCN-002/010/011 | Replace strategy-mutation fixtures with manager-owned accept/commit and exact archive/output/lineage assertions. |
| BEH-004 / typed origin resolution | Added | REQ-006; AC-004/012; SCN-012 | Add durable direct/root, dedup, not-found, and integrity scenarios. |
| BEH-005 / exact-head recurrent context | Changed | REQ-007; AC-007; SCN-003–007 | Replace mixed retrieval expectations and cover C1/C2 plus long-chain bounded current output. |
| BEH-006 / reset, v5, no-snapshot recovery | Changed | REQ-008; AC-008/009; SCN-008 | Remove gate/v4/rebuild fixtures; add current-only restore, exact reset, runner aggregation, real startup non-exposure, and trusted interruption recovery. |
| BEH-007 / explicit scope/provider wiring | Changed | REQ-009; design scope map | Cover standalone/team-member scope and provider resolution failure before acceptance. |
| BEH-008 / reachable failure/retry | Preserved and tightened | AC-011; SCN-013 | Prove runner/parser failure is pre-write and pending compaction ID is reused. |
| BEH-009 / compactor conversation | Changed | REQ-010; AC-014; SCN-015 | Replace obsolete labels/reasoning/call-ID assertions with one-boundary natural golden. |
| BEH-010 / shared presentation | Changed | REQ-011; AC-015; SCN-016 | Add redaction/serialization/omission/no-outcome goldens in core and Work Evidence. |
| External runtime evidence | Preserved | AC-010; SCN-009 | Reuse existing cross-runtime storage coverage; no native compaction claim. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Memory planning, proposal, acceptance, persistence, lineage, restore, rendering | Core Vitest unit/integration | Current suite is stale and lacks new owners | Durable integration |
| API / transport / contract | Yes, internal | Server origin service, compactor launch metadata, startup promise | Server unit/integration | No public GraphQL/UI provenance API is in scope | Server executable integration |
| Frontend component / state | No | No UI source changed | Existing projection coverage only | None introduced | None |
| Browser integration / user journey | No material web boundary | Interrupt command originates in UI, but changed behavior is core/server persistence and recovery | Existing UI/server command routing and backend interrupt coverage | Browser would not directly prove disk lineage/reset semantics | Not selected |
| Authentication / session / permissions | No | No auth behavior changed | Existing server suites | None material | None |
| Desktop renderer / web-equivalent UI | No | No renderer change | N/A | N/A | None |
| Desktop shell / Electron-specific integration | No | Startup change is server process, not Electron shell | Server lifecycle path | Electron adds no unique evidence for this ticket | None |
| Process / lifecycle | Yes | Required migrations gate real server startup; interrupt/reset/bootstrap/follow-up | Runner and runtime tests | Real caller non-exposure and reset-spanning resume missing | Lifecycle integration |
| Persisted-data transition | Yes | Four derived files discarded; raw evidence direct-use | Migration and file-store code | Exact product-path deletion/failure/idempotence evidence missing | Filesystem lifecycle |
| Worker / queue / distributed coordination | No | None | N/A | N/A | None |
| External integration | Optional credentialed evidence added | LLM compactor is exercised with deterministic runner doubles and through an imported-vault OpenAI run | Existing runner adapters plus built-server/WebSocket execution | Subjective provider summary quality is not an acceptance criterion | Credential-backed lifecycle |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis`
- Project type and runtime stack: pnpm TypeScript monorepo; Node `v22.23.1`; pnpm `10.28.2`; core/server Vitest `4.0.18`; Fastify server; file-backed memory; Prisma test setup for server suites.
- Conflicting, missing, or unclear project instructions: The core package has no `test` script but owns `vitest.config.ts`; use `pnpm exec vitest`. Server `AGENTS.md` requires `vitest run --no-watch` for non-watch execution. No browser or desktop execution is required because the changed boundary is backend/process/file persistence.
- Required environment variables or secrets available: `N/A` for deterministic scope. Server tests use `.env.test` and isolated test SQLite. External-provider credentials are not needed and unconfigured capabilities must not be represented as passed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| workspace `README.md` | Monorepo development/E2E | `pnpm test:e2e`; real-provider E2E is separately gated; development state must not be used for tests. |
| workspace `package.json` | Root scripts | `pnpm test:e2e` filters server `tests/e2e`. |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `autobyteus-server-ts/README.md` | Environment and lifecycle | Tests use `.env.test` and `tests/.tmp`; deterministic E2E is separate from `pnpm dev`; unavailable external capabilities are not passes. |
| `autobyteus-server-ts/vitest.config.ts` | Server runner | Node environment, forks, non-parallel files, Prisma setup/global setup. |
| `autobyteus-ts/vitest.config.ts` | Core runner | Node environment, `tests/setup.ts`, 20-second test timeout. |
| implementation handoff environment notes | Worktree dependency setup | Temporary `node_modules` symlinks to the main workspace are acceptable and must be removed after execution. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Core package | `autobyteus-ts` | temporary dependency symlink; `pnpm build`; `pnpm exec vitest run ... --no-watch` | File-backed tests use temp dirs | build/test exit status | tests remove temp dirs; remove symlink |
| Server package | `autobyteus-server-ts` | temporary dependency symlink; build current core; server Vitest | `.env.test`, test-owned SQLite and temp dirs | test/global setup success | Vitest teardown; remove symlink |
| Real server startup boundary | Server Vitest process | invoke exported `startConfiguredServer` with hoisted module doubles around non-target setup | Must prove migration gate without opening a port on failure | promise rejection + spy order | no listener starts; mocks reset |
| Native runtime interrupt journey | Core Vitest integration | deterministic controllable LLM + real AgentRuntime/MemoryManager/file stores | No external provider; owned temp app data | runtime reaches idle/interrupted/follow-up | stop runtime; remove temp dir |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Standalone/team-member memory trees | Temp filesystem fixtures | Exact four derived files plus byte-recorded raw files/manifests | Test teardown recursive delete |
| Migration statuses | In-memory repository fixture | No production DB | Test-local |
| Current compaction chains | FileMemoryStore + FileCompactionLineageStore in temp dirs | Deterministic raw IDs and output rows | Test teardown recursive delete |
| Interrupted native turn | Existing controllable LLM/runtime harness | No provider/network access | Runtime stop and temp-dir removal |
| Work Evidence package | Existing projection service temp fixture | Generated files only under temp dir | Test teardown recursive delete |

## Persisted Data Transition Coverage Basis

- Approved decision: Raw evidence and current-format state are `Directly Usable — No Migration`; pre-lineage episode/semantic/snapshot/manifest are `Discard or Rebuild`.
- Design-spec and implementation-handoff references: design-spec `Persisted Data / State Transition Decision`, `Migration Plan`; implementation handoff `Persisted Data Transition Check`; REQ-008/AC-009.
- Representative existing-data setup and required behavior: standalone plus direct/nested team-member run directories containing all four obsolete derived files, active raw trace, completed archive raw trace, and raw manifest; missing-target rerun; forced deletion/discovery failure.
- Evidence planned: exact file deletion/preservation, byte comparison, idempotent skips, `FAILED` not warning-success, durable attempted results, typed runner throw, real `startConfiguredServer` rejection, and bootstrap/build/listen non-invocation.
- Migration-specific completion/recovery scenarios: `N/A` because the approved outcome is discard/rebuild, not content migration. The required app-data migration is the lifecycle boundary implementing the discard.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts` | v4 gate/reset/manifest behavior | Removed by REQ-008 | Stale / Remove | Import fails because production owner was deleted intentionally | Remove with no compatibility replacement; replace at startup migration/v5 boundary |
| `.../working-context-snapshot-serializer.test.ts` | v4 superset tolerance and loose message shape | AC-008/009 current-only v5 | Replace | Current serializer rejects pre-v5 and requires finalized provenance | Rewrite for v5 structural/tool/media/emoji ranges and strict invalid cases |
| `.../working-context-snapshot-bootstrapper.test.ts` and integration restore | schema gate, v4 cache, rebuild from old memory | AC-008/009; CR-PREM-001 | Replace | Old mocks omit lineage; assertions require removed paths | Rewrite for valid v5, absent-lineage active bootstrap, trusted boundary, untrusted exclusion, head-without-snapshot failure |
| `.../compacted-memory-context-projector.test.ts` | top-K retriever owns current projection | AC-007/008 | Replace | Retriever call is intentionally gone | Assert exact passed tail bundle and canonical composed user output |
| `.../working-context-compaction-prompt-builder.test.ts` | section labels, work notes, call IDs, unmatched result | AC-014 | Replace | All five assertions encode removed prompt contract | Rewrite as SCN-015 golden |
| parser/normalizer/summarizer tests | `episodic_summary`, tolerant extras, old metadata | AC-003/006/011 | Needs Update | Exact `episodes` contract rejects old shape | Update current schema, bounds, strict rejection, metadata hash/provider |
| planner tests | old `headMessages` plan shape | AC-007/014 | Needs Update | New plan keeps system in `units` and separates compacted-memory raw refs | Update expected units/R(n)-only archive |
| strategy registry/structured strategy tests | `compact()` with store mutation | proposal ownership | Replace | Strategy now exposes `propose()` only | Update construction and IDless/no-write assertions |
| pending executor tests | replacement context returned by strategy; manager without lineage | AC-003/011 | Replace | New baseline/accept/commit path requires real lineage/store | Rebuild around real file-backed manager and current proposal; cover retry non-mutation |
| file store and snapshot persistence tests | compacted manifest / loose provenance | AC-003/008 | Needs Update | Imports deleted source | Remove obsolete assertions and use current provenance/store APIs |
| tool protocol repairer tests | loose message provenance helper | AC-005/007/008 | Needs Update | Helper deleted; behavior remains | Port to current provenance API |
| existing raw archive, manager, tool, working-context tests that pass | active/archive/tool behavior | AC-001/003/007 | Still Valid | 85 tests passed in discovery run | Retain; strengthen current manager path separately |
| existing AgentRuntime interruption integration | native interrupt fence and follow-up without reset | CR-PREM-001 | Still Valid, Extend | Real runtime path exists | Add reset-spanning no-snapshot bootstrap/follow-up |
| server app-data migration runner tests | duplicate/stale/list behavior | AC-009 | Still Valid, Extend | Runner suite lacks aggregate required-result gate | Add all-attempt persistence and startable status cases |
| server Work Evidence projection tests | archive+active, reasoning omission, tool correlation | AC-015 | Still Valid, Extend | Existing path is direct but lacks long/redaction/no-outcome goldens | Add SCN-016 golden |
| Event Monitor projection and cursor tests | active-only source and cursor expiry | AC-002 | Still Valid | Existing run-history unit/E2E paths target active reader | Execute focused suites and retain |
| cross-runtime memory persistence tests | evidence-only external runtime | AC-010 | Still Valid | No changed semantic compaction claim | Execute relevant integration |

Discovery evidence: `pnpm exec vitest run tests/unit/memory tests/integration/memory --no-watch` reproduced the handoff baseline exactly: `17` failed / `14` passed files and `28` failed / `85` passed tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/discovery-core-memory-suite-before.log`.

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `compacted-memory-schema-gate.test.ts` | runtime gate clears/accepts old derived state | Startup reset is sole historical filename owner; no runtime gate exists | REQ-008, AC-009, design removal plan | Reset migration + strict v5/bootstrap tests | Direct unit replacement of the deleted class would protect invalid compatibility |
| snapshot serializer v4 case | direct v4 superset read | Pre-v5 is discarded, never decoded | REQ-008, AC-008/009 | v5 strict root/message provenance cases | No tolerant legacy reader |
| snapshot restore rebuild cases | old-row/top-K/full-corpus fallback | Absent lineage means no memory; head requires exact rows/snapshot | REQ-007/008 | no-lineage active bootstrap + head integrity tests | No archive replay or inferred memory |
| prompt labels/work notes/call IDs | mechanical prompt/storage grammar | Natural context, no reasoning/IDs, one XML boundary | REQ-010, AC-014 | SCN-015 current golden | Old assertions are explicitly forbidden |
| `episodic_summary` and stale extras | tolerant old compactor response | Exact current schema only | REQ-005, clean-cut removal log | current parser/normalizer tests | No alias compatibility |
| strategy `compact()` and direct store mutation | strategy owns persistence/replacement | Strategy is IDless proposal-only | REQ-004/005 | proposal + manager accept/commit integration | Old seam violates owner boundary |
| mixed retriever current projection | historical top-K determines current | Lineage tail lists exact current rows | REQ-007/008 | exact current loader/projector tests | Retriever remains only for unrelated recall |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| SCN-002/007/010/011 | C1/C2 accept/commit, R(n)-only archive, exact tail, 1–3/20 bounds, 1,000-record bounded head | AC-003/006/007 | core lineage/accepted-compaction integration tests | Central persistence invariant is new |
| SCN-012 | direct/root resolver, dedup, typed not-found, broken record/archive/output/cycle | AC-004/005/012 | core lineage resolver tests | New query boundary |
| SCN-008 | exact reset + runner + caller non-exposure + startable statuses | AC-008/009 | server migration/runner/startup tests | Critical lifecycle gate |
| SCN-008 / CR-PREM-001 | real native interrupt fence across snapshot deletion and no-lineage bootstrap into follow-up | AC-009 plus preserved safety contract | core AgentRuntime integration extension | Critical rework premise |
| SCN-015 | natural compactor prompt golden | AC-014 | core prompt/renderer tests | Old suite asserts the opposite |
| SCN-016 | shared renderer and Work Evidence golden | AC-015 | core presentation tests + server projection test | Shared low-level policy and separate envelopes |
| SCN-001/014 | active-only Event Monitor/cursor retained | AC-002 | execute existing run-history focused tests; add only if a gap is found | Preserved boundary must not regress |
| Scope/provider | standalone/team-member scope and provider failure before accepted output | REQ-009 | server factory/resolver tests | Product wiring changed |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| SCN-003–007 | existing planner/projector/manager/snapshot tests | current plan shape, exact bundle, canonical ranges/media/tool | AC-007/008 | Preserve valid tool/media cases |
| SCN-013 | pending executor, strategy, parser/summarizer | proposal/accept/commit and same-ID retry with zero file/context mutation | AC-011 | Use real file-backed seams where possible |
| SCN-015 | prompt builder | one XML block, escaped source tags, no reasoning/IDs, Tool result/error, long values | AC-014 | Golden should assert order and forbidden text |
| SCN-016 | Work Evidence projection | long message/args/result/error, secrets, short value, no-outcome, file/manifest/source invariants | AC-015 | Keep existing timestamped lowercase envelope |
| SCN-008 | snapshot/bootstrap/restore | valid v5 + strict failure shapes + trusted active recovery | AC-008/009 | Do not add v4 support |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts` | Production owner and behavior intentionally removed | REQ-008; design removal plan | Replaced by reset migration and current-only restore coverage |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 0 | `pnpm exec vitest run tests/unit/memory tests/integration/memory --no-watch` | `autobyteus-ts`; discovery before test maintenance | Existing-suite validity | Expected discovery failure: 17 failed / 14 passed files; 28 failed / 85 passed tests | `evidence/api-e2e/discovery-core-memory-suite-before.log` |
| 1 | Focused changed core suites, then the whole current memory suite | `autobyteus-ts`; worktree core | SCN-002–008, SCN-010–013, SCN-015–016 | Pass: final 33 files / 148 tests | `evidence/api-e2e/core-memory-suite-current-02.log` |
| 2 | `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts --no-watch` | `autobyteus-ts`; deterministic controllable LLM, real runtime/file stores | SCN-008 trusted interrupt/reset/bootstrap/follow-up plus runtime regression | Pass: 1 file / 12 tests | `evidence/api-e2e/core-agent-runtime-integration-current-02.log` |
| 3 | lineage/resolver and 1,000-tail focused suites | `autobyteus-ts` | SCN-007 and SCN-012 long-chain current-tail/direct-root/integrity | Pass: 18 focused tests; final 1,000-tail test 8/8 | `evidence/api-e2e/lineage-resolver-suite-01.log`; `evidence/api-e2e/lineage-1000-current-output-01.log` |
| 4 | migration/runner/startup-gate/scope/origin/Work Evidence focused suites | `autobyteus-server-ts`; current worktree core | SCN-008, SCN-016, scope/provider wiring | Pass: 7 migration, 1 startup-gate, 8 scope/origin, and focused Work Evidence scenario | `evidence/api-e2e/server-migration-suite-01.log`; `server-startup-migration-gate-02.log`; `server-scope-origin-suite-01.log`; `work-evidence-presentation-01.log` |
| 5 | broader affected server unit/integration selection | `autobyteus-server-ts`; current worktree core linked and built | Migration, origin, launch/provider, presentation, Event Monitor/current integration regression | Pass: 12 files / 62 tests | `evidence/api-e2e/server-affected-unit-integration-current-core-02.log` |
| 6 | memory/run-history GraphQL E2E selection | `autobyteus-server-ts`; isolated Prisma/temp app data | SCN-001, SCN-014, memory view/explorer and active-only projection | Pass: 4 files / 18 tests | `evidence/api-e2e/server-memory-run-history-graphql-e2e-01.log` |
| 7 | current-contract server-settings and guarded migration E2E | `autobyteus-server-ts` | Registered strategy uses manager accept/commit; required failure aggregates | Pass: 2 files / 12 tests | `evidence/api-e2e/server-stale-e2e-current-contract-fix-01.log` |
| 8 | `pnpm build` (core); `tsc -p tsconfig.build.json --noEmit`; `pnpm build` (server) | core/server with worktree core resolution | Compile/package/bootstrap integration | Pass | `evidence/api-e2e/core-build.log`; `server-typecheck-current-core.log`; `server-build-current-core.log` |
| 9 | actual-built-server secret/startup E2E | `autobyteus-server-ts`; freshly built server | Successful required migrations remain startable across real process startup/restart | Pass: 2 files / 8 tests | `evidence/api-e2e/server-actual-startup-secret-e2e-current-build-01.log` |
| 10 | `pnpm test:e2e` | root; full deterministic server E2E after current build | Broad API/process/filesystem regression | 47 files / 164 tests passed, 14 files / 49 tests skipped; one unrelated managed-gateway process-spawn flake failed, then its isolated 2-test file passed immediately | `evidence/api-e2e/root-test-e2e-current-03.log`; `server-managed-gateway-recovery-rerun-01.log` |
| 11 | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/.../autobyteus-server-ts/db/api-e2e-live-compaction.db --dry-run`, then the same command with TTY confirmation | root; isolated owned SQLite database and adjacent vault key | Project-authoritative credential provisioning without ambient `.env` fallback or value output | Pass: dry run planned 9 creates; execution configured 9 secrets | `evidence/api-e2e/live-provider-secret-import-dry-run.log`; `live-provider-secret-import-execution.log` |
| 12 | temporary credential-backed built-server/WebSocket compaction journey | Fresh current server build; OpenAI `gpt-5.4-mini`; parent-run `llmConfig.compaction_ratio=0.0001`; isolated runtime/database/workspace | Real provider C1/C2, manager publication, recurrent predecessor, archive/output/lineage, v5 snapshot, and streamed product events | Pass: 2 turns, 2 linked lineage records, 2 distinct non-empty archives, 1 episode and 4 semantics per record, v5 snapshot | `evidence/api-e2e/live-provider-compaction-journey-01.log` |
| 13 | canonical-product DeepSeek agent compaction journey at five percent | Server live-E2E; encrypted-vault DeepSeek; default `ServerCompactionAgentRunner`; real built-in child agent | Canonical prompt/definition/model/run provenance, one compaction, exact projection/tools/continuation quality | Pass: server E2E 2/2; 3 tools/0 failed; exact artifact | `evidence/api-e2e/api-rev-006-deepseek-product-compactor-five-percent-02.log` |
| 14 | canonical-product LM Studio Qwen agent compaction journey at five percent | Server live-E2E; local no-key Qwen; default `ServerCompactionAgentRunner`; real built-in child agent | Same canonical prompt plus recurrent current-tail replacement and exact continuation | Pass: server E2E 2/2; two compactions; 3 tools/0 failed; exact artifact | `evidence/api-e2e/api-rev-006-lmstudio-qwen36-product-compactor-five-percent-03.log` |
| 15 | focused live-harness unit, server typecheck/build/bootstrap, cleanup and leak scan | Current worktree; canonical test DB/vault removed after execution | Durable scenario validity, compile/package/bootstrap, owned-state and credential hygiene | Pass: unit 15/15; build/typecheck/bootstrap pass; no retained runtime/model state or credential matches | `evidence/api-e2e/api-rev-006-live-harness-unit-02.log`; `api-rev-006-server-product-compactor-tsc-01.log`; `api-rev-006-server-build.log`; `api-rev-006-cleanup.log`; `api-rev-006-secret-leak-scan.log` |

Execution-maintenance notes:
- The first root E2E attempt could not build two workspace SDK packages because their package-local dependencies were not linked in the worktree. Temporary links to the installed main-workspace dependency trees were added; both SDK builds passed, and the links were removed after execution.
- The first actual-server E2E broad run used a stale server `dist`; a fresh server build made all startup-secret scenarios pass. This was an execution setup issue, not a product defect.
- Two server E2E assertions were stale under the approved current contract: one created a lineage-less manager/old `compact()` strategy, and one expected `runPending()` to return a failed required result instead of throwing the typed aggregate. Both were updated and pass.
- `tsc -p tsconfig.json --noEmit` is not a usable repository check because that file includes `tests` while fixing `rootDir` to `src`, causing TS6059 for the entire test tree. The authoritative build config and full server build pass.
- An initial live setup applied the `0.0001` trigger through the documented process-global environment override. That also affected the built-in Memory Compactor agents and recursively triggered their own compaction, so the owned server was stopped and its runtime deleted. The successful target journey scoped the same low ratio to the parent run's supported `llmConfig`; compactor agents retained their normal threshold. This is recorded as a test-setup correction, not as evidence that a process-global ultra-low ratio is production-safe.

## Post-Repository Confidence Scorecard (Mandatory)

This score reflects focused and broad repository evidence before the two selected lifecycle journeys were counted as broader validation.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | All SCN-001–016 have mapped durable coverage and affected suites are green | Reset-spanning interrupt and real startup exposure still needed direct lifecycle execution at this gate | Execute selected lifecycle journeys |
| Changed-boundary execution directness | 93% | Real file stores, manager accept/commit, resolver, serializer, migration and GraphQL paths execute | Caller/process sequencing had not yet been counted | Execute real runtime and server-start caller |
| Cross-boundary integration realism and mock gap | 90% | Core integration and server API tests cross store/service/GraphQL boundaries | Provider is deterministic and startup failure uses controlled non-target doubles | Execute actual built-server success plus exported caller failure path |
| Environment, configuration, identity, and fixture fidelity | 94% | Project Vitest configs, Prisma, temp app data, standalone/team scopes | Worktree dependencies required temporary links | Build current packages and preserve setup evidence |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | Retry non-mutation, integrity errors, deletion failure, wrong/blank boundaries and v5 failures are durable | Full interrupt/reset/follow-up sequencing remained | Execute lifecycle journey |
| User-surface, browser, and desktop-shell confidence | N/A | No UI, renderer, browser, preload, IPC, window or packaging behavior changed | None material to this ticket | N/A |
| Durable regression coverage quality and relevance | 96% | Stale compatibility assertions were replaced, not bypassed; current scenarios use exact contracts | Proportional test-code review is downstream | Code-review stage |

- Overall post-repository confidence: `93%`
- Calculation method: Simple mean of the six applicable categories, rounded to the nearest whole percent. The N/A UI/desktop category is excluded.
- Every critical acceptance criterion directly proven: `No` at this intermediate gate; the two selected lifecycle journeys remained.
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks at this gate: caller/process sequencing for required migration failure; cancellation fence survival across actual reset/no-snapshot bootstrap and follow-up.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — completed during execution rounds 1 and 2.
- Selected execution mode: `Lifecycle` plus broader `API/process E2E`, an imported-vault credential-backed built-server/WebSocket recurrent compaction journey, and a follow-up detailed OpenAI/DeepSeek budget/lifecycle matrix.
- Specific confidence gap or residual risk addressed: real native interruption through trusted raw boundary, reset, no-snapshot/no-lineage bootstrap and follow-up; exported `startConfiguredServer` non-exposure on required failure; actual built-server startability; API projections over active memory; and real-provider C1/C2 execution through product creation, streaming, compactor launch, publication, and persisted v5 state.
- Why the selected mode materially improved confidence: these paths cross runtime eventing, file persistence, bootstrap, migration, application construction, server process, GraphQL, WebSocket, managed-secret resolution, and provider boundaries that isolated helper tests cannot prove.
- Expected confidence after selected validation: at least 95% overall with no applicable category below 90%.
- Browser-specific decision and rationale: Browser validation was not selected. The changed state is backend/process/file persistence, UI interrupt routing is unchanged, and a browser cannot observe lineage/reset/provenance ownership more directly than the durable runtime and server lifecycle paths.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists elsewhere in the product but is not a changed boundary.
- Relevant instructions: workspace/server READMEs and server `AGENTS.md`.
- Web-equivalent behavior: no renderer change; memory/run-history GraphQL boundaries were exercised directly.
- Shell-specific or lifecycle behavior: no preload/IPC/window/package behavior changed; server lifecycle was validated without launching Electron.
- Chosen validation approach: core/server lifecycle plus GraphQL/process E2E.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron wrapping was not run and causes no material deduction for this backend-only change.

## Live Environment And Fixture Plan

Completed as planned:
- built current core/shared SDKs and the current server;
- used deterministic controllable LLM/runtime fixtures, real file-backed memory stores, isolated SQLite/app-data roots and actual built-server child processes;
- used the project importer to copy configured provider credentials value-safely from the user-authorized owner-private source into a test-owned SQLite/vault pair, then executed two real OpenAI-backed native turns with a parent-scoped low compaction ratio;
- on the integrated `DR-001` candidate, repeated the detailed budget/lifecycle check with real OpenAI `gpt-5.4-mini` and DeepSeek `deepseek-v4-flash` turns, GraphQL/WebSocket transport, and parent-scoped low ratios;
- used standalone, direct team-member and nested team-member scopes;
- captured Vitest/build logs under `evidence/api-e2e`;
- stopped owned child processes, removed the live database/vault/runtime/workspace and owned test databases/temp workspace/dependency links, removed the temporary probe, and restored the main workspace's server-to-core link.

## Temporary Executable Validation Plan And Results

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Retention Decision |
| --- | --- | --- | --- |
| Structural clean-cut audit | Source/diff inspection plus current-only suite | No v4 gate/manifest/state-pointer compatibility was restored | Material result retained here and in reports; no scratch harness retained |
| Package resolution | Temporary worktree dependency links, then current core/server builds | Tests/builds resolved the implementation under review rather than stale main-core output | Links removed; setup evidence retained |
| Broad process E2E | Root `pnpm test:e2e` and isolated rerun of a non-target flaky process suite | All target API/lifecycle scenarios passed; unrelated transient spawn failure was non-reproducible | Logs retained |
| Credential-backed live compaction | Temporary value-safe built-server/GraphQL/WebSocket harness over an isolated imported vault | Two real provider turns published C1/C2 with correct predecessor, separate archives, bounded outputs, provider/model metadata and v5 snapshot | Harness and live state removed; value-free summary/import logs retained |
| Two-provider detailed telemetry | Temporary value-safe integrated built-server/GraphQL/WebSocket harness with detailed compaction logs | OpenAI and DeepSeek used their catalog contexts in correct budget arithmetic and each streamed requested/started/completed | Harness and live state removed; `live-provider-compaction-debug-telemetry-01.log` retained |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Process termination between archive/output/lineage/snapshot writes | Explicitly out of scope; no supported journal/recovery contract | Known non-atomic residual | None for this ticket |
| Generalized compaction quality across arbitrary tasks/models | Round 6 directly evaluates one coherent continuation task with the canonical compactor under DeepSeek and Qwen, but cannot prove all semantic inputs | Bounded external-model variability | Extend with a separate evaluation corpus if product-wide semantic benchmarking is desired |
| Frontend provenance screen | Explicitly out of scope and no UI was added | None | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | SR-004/ARCH-REV-004/CRR-002 remained coherent; all target scenarios passed | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes`; round 6 removes the live test-owned compactor prompt/runner shortcut, adds a keyless LM Studio server scenario, and proves both models through the canonical built-in child agent. Round 5 tightened the outer assertion to exact zero failed tools. The cumulative earlier delta still includes one added lower-level local-model test, current-contract fixture updates, and one stale ambient-secret test removal.
- Post-repository confidence: `95%` before the selected five-percent live journeys.
- Final confidence after canonical-product DeepSeek/Qwen validation: `98%`.
- Broader validation decision: `Required — completed`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: API-REV-006 is authoritative. TCR-001 remains resolved. Five percent is the durable quality ratio. Both final live journeys launched the real persisted `autobyteus-memory-compactor` through the default product runner with canonical prompt hash `53966da264796e0a74c6f17304644bdacaf8ae3c2bfa87012d7545fc71759dcf`. DeepSeek completed one compaction; Qwen completed two recurrent compactions. The actual outbound request was inspected by provenance constituent: selected Part A was in current `M(n)`, Part B remained in natural retained history, and the exact new user request was separate. Both models continued to the exact artifact; DeepSeek was more concise, while Qwen was more verbose but task-faithful.
