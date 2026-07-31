# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-revision-record.md`
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-006`
- Current Execution Round: `6`
- Trigger: user-directed validation through the actual built-in Memory Compactor agent, with the same canonical product prompt under managed DeepSeek and local no-key LM Studio Qwen at the durable five-percent ratio.
- Prior Round Reviewed: `API-REV-005` / `Pass` / `96%`; `TCR-001` resolved
- Latest Authoritative Round: This file, round 6
- Integrated implementation state exercised: `e13e6b2481fd8922c186e967dfe846d98d20d95d` plus the cumulative API/E2E-owned durable test delta.

## Round 6 Canonical Product Compactor Execution

- Product-path correction: the shared live harness no longer injects a test-owned compactor prompt or runner. It uses the default `ServerCompactionAgentRunner`, persisted built-in definition `autobyteus-memory-compactor`, and real `AgentRunService` child runs.
- Prompt identity: both live logs show the canonical built-in system prompt and its SHA-256 `53966da264796e0a74c6f17304644bdacaf8ae3c2bfa87012d7545fc71759dcf`. Every completed event has definition ID `autobyteus-memory-compactor`, the requested model, and a nonblank real child run ID.
- DeepSeek: `Pass`, server E2E 2/2. Effective context `1,000,000`; exact five-percent trigger `49,936`; prompt samples `[1142, 14436, 14609, 56156, 43340, 43616]`; one completed compaction; exactly two reads, one write, zero failed tools; exact nine-field artifact after source deletion.
- LM Studio Qwen: `Pass`, server E2E 2/2. Actual model `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234`; effective context `262,144`; trigger `13,043`; prompt samples `[1125, 14516, 14816, 3312, 3511, 3757]`; two recurrent completed compactions with distinct child run IDs; exactly two reads, one write, zero failed tools; exact artifact after source deletion.
- Projection/continuation proof: both runs directly captured the current compacted-memory user constituent, exact next current-user constituent, and complete final parent-model invocation. Selected Part A anchors were present in current `M(n)`, retained Part B anchors remained in natural history, and all nine final output fields were exact.
- Human quality judgment: both outputs were continuation-ready and retained all task-critical facts. DeepSeek was more concise. Qwen was more verbose and represented work still pending at the compaction boundary as open, but did not repeat the unsupported “escalating retry pressure” inference seen under the former shortened test prompt. Neither authoritative output fabricated a task-critical fact.
- Result/confidence: `Pass / 98%`. The principal API-REV-004/005 mock gap is closed; their lower-level evidence remains historical mechanics evidence.

## Round 5 TCR-001 Local-Fix Execution

- Finding: the outer branch in `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` permitted up to two recoverable failed tools although the shared harness requires zero and API-REV-004 returned zero.
- Correction: `expect(result.recoverableToolFailureCount).toBe(0)`.
- Focused command: `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` after documented interactive import into the canonical test DB/vault.
- Result: `Pass`; current server/shared build passed; the selected server E2E passed 2/2; DeepSeek crossed the exact five-percent threshold, completed one compaction, succeeded at two reads and one write, returned `recoverableToolFailureCount: 0`, and passed the exact outward zero assertion plus the existing artifact/projection assertions.
- Evidence: `evidence/api-e2e/api-rev-005-deepseek-exact-zero-real-compaction.log`.
- Environment: two initial import attempts correctly failed because they did not expose a real interactive confirmation TTY. The authoritative third import configured nine recognized secret IDs value-safely; `api-rev-005-secret-import-03.log` is authoritative.
- Cleanup/security: owned DB/vault/runtime/temp/process state removed; source assignment preserved; 120 evidence files scanned against 12 credential-like values in three encodings with zero matches.
- Prior finding resolution: `TCR-001 Resolved`.
- Current result/confidence: `Pass / 96%`. API-REV-004 mechanics/quality evidence remains valid; this round changes only the stale durable outward assertion and directly proves it.

## Investigation And Execution Basis

- Investigation completed before final execution: `Yes`; the canonical investigation records the five-percent delta, projected-context quality assertion, and Round-6 requirement to execute the actual built-in compactor agent.
- Existing coverage decision: `Update`. The shared server live-E2E harness is the correct common product surface for both managed-vault DeepSeek and keyless LM Studio Qwen. The lower-level core LM Studio test remains useful mechanics coverage but is not the authoritative product-prompt quality witness.
- User correction accepted: five percent is the current quality-test ratio. The former two-percent runs remain historical API-REV-003 evidence, not the current authoritative quality result.
- Important composition finding: the manager compacts a settled prefix, not all active context. In both final runs Part A was selected into `M(n)` while Part B correctly remained in retained natural tool history. The current assertion checks selected-input anchors inside the compacted-memory constituent, every Part A/B anchor across the actual final outbound invocation, and the exact current-user constituent.
- Reroute required before or during execution: `No`. Intermediate failures were bounded API/E2E-owned asynchronous model discovery, fixture sizing, timeout, and assertion corrections; the approved implementation mechanics did not fail.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`.
- Compatibility-only runtime behavior observed: `No`.
- Approved discard/rebuild transition retained: `Yes`.
- Durable coverage retained only for compatibility behavior: `No`.
- No v4 reader, gate, manifest, alias, fallback, or state pointer was restored.

## Changed Boundary And Evidence Matrix

Evidence paths are relative to `tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e`.

| Scenario ID | Behavior / Requirement | Execution Surface | Result | Authoritative Evidence |
| --- | --- | --- | --- | --- |
| SCN-001–SCN-016 | Current-only lineage/reset/restore/interruption/resolver/recurrent authority/presentation/Event Monitor/Work Evidence | API-REV-001/002 deterministic, lifecycle, API and provider evidence; current builds | Pass, unchanged | Prior canonical evidence plus `api-rev-006-server-build.log` |
| SCN-017 | Local Qwen meaningful five-percent compaction through the canonical product child agent, actual projected current tail and continuation | Server live-E2E, LM Studio, default `ServerCompactionAgentRunner`, real built-in definition/model/tools/files | Pass | `api-rev-006-lmstudio-qwen36-product-compactor-five-percent-03.log` |
| SCN-018 | Managed DeepSeek meaningful five-percent compaction through the canonical product child agent, actual projected context, continuation and exact-zero failed-tool contract | Current test DB/vault resolver, server live-E2E, default product runner, real built-in definition/provider/tools/files | Pass | `api-rev-006-deepseek-product-compactor-five-percent-02.log` |
| SCN-017/018 preflight | Documented managed-provider setup plus keyless local-model discovery without ambient secret sourcing | `.env.test`, `pnpm secrets:import`, canonical ignored test DB/vault, LM Studio model catalog | Pass | `api-rev-006-secret-import.log`; `api-rev-006-real-compactor-preflight-02.log` |

## Current-Round Execution

| Order | Command / Mode | Working Directory / Configuration | Result | Evidence |
| --- | --- | --- | --- | --- |
| 0 | Documented importer dry-run and real-TTY import into canonical ignored test DB/vault | Repository root; owner source read-only | Pass; nine recognized IDs configured without value output | `api-rev-006-secret-import-dry-run.log`; `api-rev-006-secret-import.log` |
| 1 | Canonical-product scenario preflight | Root; DeepSeek managed resolver plus local LM Studio catalog | Pass; both scenarios ready; no secret required for Qwen | `api-rev-006-real-compactor-preflight-02.log` |
| 2 | `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` | Root; `deepseek-v4-flash`; exact ratio `0.05`; default product runner | Pass: build + server E2E 2/2; one canonical child compaction; 3 tools/0 failed; exact artifact/projection | `api-rev-006-deepseek-product-compactor-five-percent-02.log` |
| 3 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Root; local Qwen; no API key; exact ratio `0.05`; default product runner | Pass: server E2E 2/2; two recurrent canonical child compactions; 3 tools/0 failed; exact artifact/current tail | `api-rev-006-lmstudio-qwen36-product-compactor-five-percent-03.log` |
| 4 | Focused shared-harness unit | Server | Pass: 15/15 | `api-rev-006-live-harness-unit-02.log` |
| 5 | Server product-compactor typecheck and full build/bootstrap smoke | Server/current core | Pass | `api-rev-006-server-product-compactor-tsc-01.log`; `api-rev-006-server-build.log` |
| 6 | Owned-state/model cleanup and exact/URL/base64 credential-value scan | Worktree + owner-authorized source read-only | Pass; no DB/key/temp/process/Qwen loaded state remains; 13 files/12 values/zero matches | `api-rev-006-cleanup.log`; `api-rev-006-secret-leak-scan.log` |

Execution setup note: the first preflight treated asynchronous model discovery as an array, the first Qwen live run used an incorrect resolved-model property, and the next Qwen run exceeded the original 300-second parent wait after the real child compactor had completed. The fixture and wait were corrected without weakening behavior. The first DeepSeek product run completed correctly but a raw-row exclusion assertion matched a semantic mention of `record_type`; it was narrowed to raw JSON row syntax. These are retained API/E2E-owned setup/assertion corrections, not implementation failures.

## Five-Percent Real Compaction Observations

### Local LM Studio Qwen 3.6

- Model identifier: `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234`.
- Context window observed: `262,144` tokens. With `max_tokens=1,024` and safety margin `256`, input budget was `260,864`; exact five-percent trigger was `13,043`.
- Prompt samples were `[1125, 14516, 14816, 3312, 3511, 3757]`; two `requested -> started -> completed` cycles produced recurrent current-only replacement with distinct real child run IDs.
- Product-compactor identity: both completed events reported definition `autobyteus-memory-compactor`, model `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234`, and canonical prompt hash `53966da264796e0a74c6f17304644bdacaf8ae3c2bfa87012d7545fc71759dcf`.
- Real task sequence: read Part A once, read Part B once, then use memory plus retained continuation to write the exact final artifact after both evidence files were deleted. Exactly two reads and one write succeeded; zero tools failed.
- Actual projection: current `M(n)` contained three continuation-relevant episodes and the exact customer/rollback/safety/verification values; Part B's exact owner/mitigation/rejection/channel values remained in retained natural history; the current-user constituent exactly matched the final instruction; all eight learned anchors were present in the final invocation.
- Continuation result: exact nine-field JSON, including the new constraint `preserve auditable rollback proof`.
- Human quality judgment: task-critical retention and continuation were good. Qwen was verbose and preserved the at-boundary pending response as open work, but that state was accurate when each compaction occurred and natural history subsequently resolved it. The unsupported “escalating retry pressure” inference from the former shortened-prompt run did not recur. Qwen is continuation-ready here, though less concise than DeepSeek.

### Managed DeepSeek V4 Flash

- Model identifier: `deepseek-v4-flash` through `SecretManagementProviderApiKeyResolver`.
- Context window observed: `1,000,000` tokens. With `max_tokens=1,024` and safety margin `256`, input budget was `998,720`; exact five-percent trigger was `49,936`.
- Prompt samples were `[1142, 14436, 14609, 56156, 43340, 43616]`. It crossed the threshold once and completed one `requested -> started -> completed` product-child lifecycle.
- Product-compactor identity: the completed event reported definition `autobyteus-memory-compactor`, model `deepseek-v4-flash`, a nonblank child run ID, and the same canonical prompt hash.
- Real task sequence: two reads and one final write; all three succeeded and zero failed. Both evidence files were deleted before the write. The exact nine-field JSON artifact passed.
- Actual projection: the dedicated compacted-memory constituent accurately retained task-critical Part A values; Part B was correctly present in retained natural history; the new current-user instruction was exact; and the final outbound invocation contained all eight learned anchors.
- Human quality judgment: better focused than Qwen and fully sufficient for exact continuation. It categorized the not-yet-emitted response as unresolved and mentioned that the tool output had been truncated, both accurate at the compaction boundary. Active continuation then resolved the pending response. No task-critical value was invented.

### Context-Size Log Check

- API-REV-002's real `gpt-5.4-mini` run and current curated project metadata use an effective context of `400,000` tokens; the curated maximum output is `128,000`. This is project runtime/catalog evidence, not a general claim about every similarly named deployment.
- Current round logs correctly show Qwen `262,144`, DeepSeek `1,000,000`, the context-derived budgets, five-percent thresholds, below/above-threshold samples, lifecycle phases, child definition/model/run provenance, and full canonical child prompt. The printed projected constituents come from actual parent invocation capture rather than reconstructed persistence alone.

## Calibration And Negative Evidence

| Evidence | Observation | Classification |
| --- | --- | --- |
| `api-rev-006-real-compactor-preflight.log` | Initial preflight called `.some` on asynchronous model discovery | API/E2E setup correction |
| `api-rev-006-lmstudio-qwen36-product-compactor-five-percent-01.log` | Initial local scenario used the wrong property from the resolved model entry | API/E2E fixture correction |
| `api-rev-006-lmstudio-qwen36-product-compactor-five-percent-02.log` | The real Qwen child compactor completed after the original 300-second parent wait | API/E2E timeout calibration; corrected to a bounded local-model allowance |
| `api-rev-006-deepseek-product-compactor-five-percent-01.log` | Product run and artifact were correct, but raw-row exclusion matched a semantic mention of the term `record_type` | API/E2E assertion correction; final check rejects raw JSON-row syntax |
| `managed-deepseek-v4-flash-five-percent-real-compaction-01.log`, `-02.log` | Oversized 720-record Part B caused recurrent compactions and exact-output/projection failures | Test calibration; not authoritative pass |
| `managed-deepseek-v4-flash-five-percent-real-compaction-03.log`, `-04.log` | 260/420 Part B records did not reach the five-percent threshold | Test calibration |
| `managed-deepseek-v4-flash-five-percent-real-compaction-05.log` | Single compaction and exact artifact, but the first assertion wrongly required retained Part B inside `M(n)` | API/E2E assertion correction; clarified correct composition |
| `lmstudio-qwen36-five-percent-real-compaction-01.log`, `-02.log`, `-03.log` | Qwen repeated relative-path/write mistakes or returned exact JSON instead of using write; one run retained all facts despite tool noncompliance | External-model/tool behavior plus test task calibration |
| API-REV-003 Qwen recurrent evidence | Three two-percent replacements lost Part A in one exploratory run | External-model semantic variability; reason not to overstate confidence |

Negative/calibration runs are retained and disclosed. They were not converted into skips, and final authoritative runs use explicit exact mechanics, projection and continuation assertions.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | SCN-001–016 prior direct proof plus SCN-017/018 canonical product-child projection, tools and exact continuation | Normal publication crash atomicity remains explicitly out of scope |
| Changed-boundary execution directness | 94% | 99% | Real server backend, default product runner, persisted built-in agent, providers, tools, files, budget, archive/output/lineage and captured invocation | None material for approved mechanics |
| Cross-boundary integration realism and mock gap | 93% | 98% | Both local no-key and managed-secret flows launch the actual `autobyteus-memory-compactor` through `AgentRunService` | Parent test agent/fixture remains test-owned, as intended |
| Environment, configuration, identity and fixture fidelity | 95% | 98% | Documented importer, canonical test DB/vault, real LM Studio/DeepSeek, exact canonical prompt/definition/model/run identity | External provider/service availability and local-model performance vary |
| Failure, edge-case, lifecycle and recovery evidence | 94% | 95% | Prior retry/reset/integrity evidence, recurrent Qwen current-tail replacement, strict zero failures, and retained negative setup/calibration evidence | Generated-language quality is not exhaustively benchmarked |
| User-surface, browser and desktop-shell confidence | N/A | N/A | No UI, browser, renderer, preload, IPC, window or packaging boundary changed | N/A |
| Durable regression coverage quality and relevance | 97% | 98% | Canonical prompt hash/child provenance, five-percent ratio, projected constituent checks, recurrent replacement, exact continuation and dynamic preflight | Proportional test-code review remains downstream |

- Overall post-repository confidence: `95%`.
- Overall final confidence: `98%` (simple mean of six applicable final categories, rounded to the nearest whole percent).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default 95% target met: `Yes`.
- Confidence-limiting residual risk: external-model semantic quality and latency. Task-critical facts and continuation pass exactly under both canonical-product runs, but one scenario cannot prove arbitrary future summary quality.

## Broader Validation Decision And Execution

- Decision: `Required — completed`.
- Selected modes: real local-model and managed-provider parent-agent lifecycles, each launching the real built-in child compactor through the default server runner.
- Confidence gap addressed: the former two-percent evidence compacted too little history, and API-REV-004/005 used a shortened test-owned compactor prompt. Five percent, coherent evidence, actual invocation capture, and canonical child definition/prompt/model/run provenance close both gaps.
- Browser/desktop: `Not applicable`; no UI or shell boundary changed.
- Environment setup: Qwen required no key. DeepSeek used `.env.test` plus documented encrypted-vault import/resolution; no process sourced the owner-private assignment file.

## Lifecycle / Upgrade / Persisted-Data Checks

- Approved persisted-data decision: `Discard or Rebuild` for pre-lineage derived state; current v5/lineage output is directly usable.
- API-REV-001 remains authoritative for reset/startup/no-snapshot/interruption coverage. Round 6 adds canonical-product child-agent quality under two real models, including recurrent current-tail replacement under Qwen.
- Version-specific runtime branch, dual read/write or compatibility fallback observed: `No`.

## Durable Test Changes

### Updated In Round 6

| Path | Change | Result |
| --- | --- | --- |
| `test-support/live-e2e/live-e2e-harness.ts` | Removed test-owned compactor runner/prompt; verifies persisted canonical instruction/hash and real child metadata; supports keyless local model discovery; asserts exact tools/projection/current tail/continuation | DeepSeek and Qwen live Pass |
| `test-support/live-e2e/live-e2e-scenarios.mjs` | Registered `lmstudio.qwen36.compaction-agent-flow` | Live Pass |
| `test-support/live-e2e/live-e2e-scenarios.d.mts` | Allows no-secret live scenario metadata | Unit/typecheck Pass |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Local no-secret preflight, canonical-child assertions and bounded model-specific timeout | Both live scenarios Pass 2/2 |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Dynamic keyless LM Studio scenario and registration guards | Pass 15/15 |

### Updated In Round 5

| Path | Change | Result |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Tightened `recoverableToolFailureCount` from `<= 2` to exact `0` for TCR-001 | Focused real DeepSeek E2E Pass 2/2 |

### Updated In Round 4

| Path | Change | Result |
| --- | --- | --- |
| `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts` | Five-percent threshold, larger coherent history, primary invocation/provenance capture, actual memory/current-user assertions, exact post-compaction continuation | Pass selected; skip by default |
| `test-support/live-e2e/live-e2e-harness.ts` | Five-percent managed flow, tuned single-compaction fixture, primary invocation/provenance capture, exact projection/continuation and zero-failed-tool assertions | Pass live/unit/build |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Five-percent result and projected-context contract | Pass live |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Five-percent scenario description/guard | Pass |

### Cumulative API/E2E Durable Delta

- Added: `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts`.
- Updated: the five Round-6 paths above, the Round-4 lower-level path, and current-contract lifecycle/runtime compaction fixtures recorded in API-REV-003.
- Removed: `autobyteus-ts/tests/integration/agent/deepseek-single-agent-flow.test.ts` because it used ambient `DEEPSEEK_API_KEY`, omitted the required resolver and did not compact. Managed-vault agent/compaction scenarios replace it.
- Production source changed by API/E2E: `No`.

## Dependencies Mocked Or Emulated

- No LLM, compactor runner, compactor prompt, or file tool was mocked in the authoritative Round-6 SCN-017/018 journeys.
- Both paths use the default product `ServerCompactionAgentRunner`, persisted built-in `autobyteus-memory-compactor`, real child `AgentRunService`, and the same canonical prompt. The parent test agent/fixture is intentionally test-owned.
- Deterministic core tests retain runner doubles for exact retry/failure invariants; the live paths close the provider/tool/projection gap.

## Result Summary

| Result | Scenarios | Summary |
| --- | --- | --- |
| Pass | SCN-001–SCN-018 | Approved mechanics remain green; DeepSeek completed one and Qwen two recurrent five-percent canonical-product compactions, exposed correct actual context composition, and continued to exact results |
| Residual quality risk | Generated compacted text | Task-critical facts were exact; Qwen was more verbose and both models described boundary-time pending work, but arbitrary semantic quality remains probabilistic |
| Out Of Scope | Normal publication crash atomicity | Requirements add no journal/recovery contract |
| Out Of Scope | Browser/Electron | No UI or shell boundary changed |

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| `autobyteus-server-ts/db/test.db`, key and SQLite sidecars | Removed after final validation | Complete |
| `autobyteus-server-ts/tests/.tmp` and compaction temp workspaces | Removed after harness teardown and final audit | Complete |
| Owned Vitest/live-E2E processes | Completion plus process audit | None remains |
| `/Users/normy/.autobyteus/server-data/.env` | Read-only importer source | Preserved |
| LM Studio loaded Qwen instance | Explicit unload through local API after validation | Zero loaded instances |
| Retained Round-6 evidence | Exact, URL-encoded and base64 scan against credential-like source values | 13 files scanned; 12 source values; zero matches |

## Preliminary Classification

`N/A` — current result is `Pass`. The bounded semantic/latency residual remains disclosed because two successful models and one task cannot establish universal compaction quality.

## Recommended Recipient

`code_reviewer` for proportional review of the added/updated durable test code and cumulative stale-test removal rationale.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `98%`
- Default 95% target met: `Yes`
- Any applicable category below 90%: `No`
- Broader validation decision: `Required — completed`
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `code_reviewer` for proportional test-code review
- Notes: API-REV-006 is authoritative. TCR-001 remains resolved. Five percent is the durable live-test ratio. Qwen observed context `262,144`, trigger `13,043`, and two recurrent product-child compactions; DeepSeek observed context `1,000,000`, trigger `49,936`, and one. The earlier real `gpt-5.4-mini` log and curated project metadata use `400,000`. Both live journeys used the actual persisted `autobyteus-memory-compactor`, default product runner, canonical prompt hash, real child run IDs, exact-zero failed tools, and directly inspected projected memory, retained continuation and exact new user input.
