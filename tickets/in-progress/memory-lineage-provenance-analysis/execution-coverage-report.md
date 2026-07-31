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
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-compactor-prompt-content-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001` through `DR-005` (prior delivered baseline retained as evidence)
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-007`
- Current Execution Round: `7`
- Trigger: `CRR-009 Pass` for `IR-003` / `SR-010` natural compactor at implementation commit `c6c60b9996d61ef373236b66437844cd8b315af8`.
- Prior Round Reviewed: `API-REV-006 / Pass / 98%`; no unresolved failure ID.
- Latest Authoritative Round: This file, round 7.

## Investigation And Execution Basis

- Coverage investigation artifact: `coverage-investigation.md`, round 7.
- Investigation completed before durable coverage changes or final execution: `Yes`.
- Investigation plan followed: `Yes`. Directly affected stale fixed-count and duplicate-prompt assertions were replaced; preserved SR-004 surfaces were re-executed; broader deterministic and real-model journeys were completed.
- Existing coverage decisions revised during execution, with evidence:
  - Three server compactor fixtures used removed `episodic_summary` output or obsolete resolver injection. They were updated to the current schema/injection boundary; focused compactor coverage then passed 17/17.
  - Two token-usage startup E2Es expected continued startup after a required migration `FAILED`. They were corrected to the approved fail-closed aggregate rejection, persisted-attempt evidence, and successful unresolved-row retry. The focused correction passed 4/4 and the full deterministic E2E passed 174 tests.
  - These were API/E2E-owned stale-test corrections, not production defects.
- Reroute required before or during execution: `No`.
- Notes: API/E2E changed test and shared test-harness code only. No production source, compatibility reader, cap, alias, legacy output, or runtime fallback was added.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`.
- Durable coverage added or retained only for compatibility-only behavior: `No`.
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`.
- Upstream recipient notified: `N/A`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-019 | Natural model-chosen output; exact canonical prompt/history; full accepted publication above old 3/20 caps; prompt audit 2 and mixed 1 -> 2 (`BEH-002/003/008/011`, `REQ-004/010/012`, `AC-006/016`) | Prompt template, history renderer/builder, parser/normalizer, accepted builder, archive/output/lineage/projection/origin | Core/server unit and integration suites | Durable | Pass | `api-rev-007-natural-contract-focused-02.log`; `api-rev-007-core-memory-broad-02.log`; `api-rev-007-server-prompt-harness-unit-01.log` |
| SCN-001–SCN-016 | Current-tail authority, R(n)-only archive, v5 structural/tool/media restore, reset/startup fail-close, trusted interruption, retry non-mutation, scope/provider, Event Monitor/Work Evidence | Preserved SR-004 lifecycle and presentation boundaries | Complete memory suite, affected server suite, full deterministic root E2E, builds/bootstrap | Durable | Pass | `api-rev-007-core-memory-broad-02.log`; `api-rev-007-server-affected-broad-01.log`; `api-rev-007-root-deterministic-e2e-02.log`; `api-rev-007-core-server-build-01.log` |
| SCN-017 | Keyless LM Studio Qwen, exact five-percent real product compaction and continuation with model-chosen counts | Built-in definition -> product runner -> real child -> lineage/current projection -> next parent turn | Real server E2E, LM Studio `qwen/qwen3.6-35b-a3b` | Live | Pass | `api-rev-007-lmstudio-qwen36-natural-compactor-five-percent.log` |
| SCN-018 | Managed DeepSeek, exact five-percent real product compaction and continuation with model-chosen counts | Managed vault resolver -> built-in product runner -> real child -> lineage/current projection -> next parent turn | Real server E2E, `deepseek-v4-flash` | Live | Pass | `api-rev-007-deepseek-natural-compactor-five-percent.log` |
| SCN-017/018 setup | Documented secret import, managed/local model discovery, no ambient private-env sourcing | Test database/vault and local model catalog | Repository CLI/preflight | Temporary | Pass | `api-rev-007-secret-import-dry-run.log`; `api-rev-007-secret-import.log`; `api-rev-007-real-compactor-preflight.log` |

Evidence paths in this report are under `tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/` unless absolute.

## Additional Repository Coverage Execution

| Order | Command / Selection | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused prompt/parser/normalizer/lineage/resolver selection | `autobyteus-ts`; Vitest, no watch | SCN-019 exact natural contract | Pass: 6 files / 28 tests | `api-rev-007-natural-contract-focused-02.log` |
| 2 | Complete current memory suite | `autobyteus-ts`; `tests/unit/memory` | SCN-001–016 and SCN-019 core state | Pass: 33 files / 150 tests | `api-rev-007-core-memory-broad-02.log` |
| 3 | Runtime/manager selection | `autobyteus-ts`; real runtime orchestration with deterministic model doubles | Manager publication, retry/current-user continuation | Pass: 3 files / 15 tests | `api-rev-007-core-runtime-broad-02.log` |
| 4 | Prompt/harness and focused server compactor selections | `autobyteus-server-ts`; Vitest, no watch | Exact prompt, harness contract, product runner/output collector/fallback | Pass: 16/16 and 17/17 | `api-rev-007-server-prompt-harness-unit-01.log`; `api-rev-007-server-compactor-focused-02.log` |
| 5 | Affected server selection | `autobyteus-server-ts`; 15 affected files | Reset/startup, scope/provider, launch and presentation boundaries | Pass: 15 files / 88 tests | `api-rev-007-server-affected-broad-01.log` |
| 6 | Focused required-migration correction and full deterministic root E2E | repository root | Required `FAILED` aggregate fail-close and broad integration | Pass: 4/4; final 50 files / 174 tests, with 14 files / 49 explicitly environment-gated skips | `api-rev-007-required-migration-stale-e2e-fix-01.log`; `api-rev-007-root-deterministic-e2e-02.log` |
| 7 | Core/shared/server build, runtime dependency preparation, Prisma and sanitized built-in bootstrap smoke | repository packages | Compile, package and bootstrap integration | Pass | `api-rev-007-core-server-build-01.log` |
| 8 | `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` | root; documented imported test vault; exact ratio `0.05` | SCN-018 | Pass: server E2E 2/2 | `api-rev-007-deepseek-natural-compactor-five-percent.log` |
| 9 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | root; keyless local LM Studio; exact ratio `0.05` | SCN-017 | Pass: server E2E 2/2 | `api-rev-007-lmstudio-qwen36-natural-compactor-five-percent.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | 99% | +1 | Exact prompt golden, 4/25 accepted path, mixed audit, both real continuations | Natural language quality is probabilistic |
| Changed-boundary execution directness | 99% | 99% | 0 | Direct parser/store/manager tests and actual product runner | None material |
| Cross-boundary integration realism and mock gap | 96% | 98% | +2 | Real managed and local models, files, child runs, tools, lineage and next parent invocation | Only two model families sampled |
| Environment, configuration, identity, and fixture fidelity | 97% | 98% | +1 | Documented import, canonical test DB/vault, real model identifiers and prompt hashes | Managed provider availability is external |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | 97% | 0 | Full deterministic E2E, audit 3 rejection, fail-closed migration, retry non-mutation | Normal-publication process-crash atomicity is expressly out of scope |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | N/A | No browser/UI/IPC/shell boundary changed | N/A |
| Durable regression coverage quality and relevance | 98% | 98% | 0 | Existing suites updated without parallel compatibility coverage | Proportional test-code review remains the next gate |

- Overall post-repository confidence: `97%`.
- Overall final confidence: `98%`.
- Calculation method: rounded mean of the six applicable categories, with direct requirement proof and realistic changed-boundary evidence weighted as gate requirements.
- Confidence change produced by broader validation: `+1 percentage point`; real product child agents closed model/prompt/continuation uncertainty.
- Every critical acceptance criterion directly proven: `Yes`.
- Any final applicable category below `90%`: `No`.
- Default final confidence target of `95%` met: `Yes`.
- Confidence-limiting residual risks: model-dependent semantic density/latency; only two realistic models; expressly out-of-scope process termination between normal publication writes.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required`; real server-side product journey for managed DeepSeek and keyless LM Studio Qwen because the provider-facing compactor prompt changed.
- Material deviation from the planned mode or rationale: `None`.
- Confidence gap or residual risk actually addressed: canonical built-in prompt identity, real `ServerCompactionAgentRunner`, model-chosen episode/fact quantity, recurrent lineage publication, current-memory projection, active-history retention, new current-user composition, successful tools, exact downstream continuation and log inspection.
- Startup order, commands, and readiness results: documented secret import dry-run/interactive import -> scenario preflight -> DeepSeek -> Qwen -> deterministic/build follow-up -> cleanup. Both preflights were ready.
- Environment choices: private source file remained read-only and was never sourced; managed credentials were imported through `pnpm secrets:import`; Qwen used local LM Studio without an API key; `.env.test` remained unmodified.
- Seed data: each parent agent received a coherent incident task, read source evidence through real file tools, crossed the exact five-percent context-derived trigger, lost the source file, then used compacted memory plus retained active history and a new user constraint to produce an exact nine-field artifact.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Installed prompt identity | Persisted built-in instruction equals the approved 2,788-byte file and product runner launches real child IDs | Full-file SHA `944dbdbd3db1146f80fdb7fe5ec2817422eec74f8eca3f4743a336169a2a8348`; extracted prompt SHA `73aaff91c63d2b68b91467f00302bfe2940c0037b9e08d1fa6373d1f96274dc7`; nonblank child IDs | Both live logs | Pass |
| DeepSeek compaction | Cross 5%; model chooses sufficient structure; audit 2; preserve selected anchors and continue exactly | Context 1,000,000; trigger 49,936; samples `[1141,14434,14606,56152,43313,43587]`; one compaction; 1 episode / 8 facts; exactly two reads, one write, zero failed tools; exact artifact | `api-rev-007-deepseek-natural-compactor-five-percent.log` | Pass |
| Qwen recurrent compaction | Cross 5%; recurrent replacements remain current-only; no forced count; continue exactly | Context 262,144; trigger 13,043; samples `[1126,14518,14894,3109,3309,3557]`; two compactions; 1 episode / 3 facts then 1 episode / 0 facts; audits `[2,2]`; exactly two reads, one write, zero failed tools; exact artifact | `api-rev-007-lmstudio-qwen36-natural-compactor-five-percent.log` | Pass |
| Quality/phase judgment | Current memory contains the facts/state needed at each boundary while retained Part B and the new user message remain outside the selected prefix | DeepSeek was concise and phase-correct. Qwen's first head correctly recorded the pending read; its second head correctly replaced that with the successful read and retained all selected anchors. Both were continuation-ready; Qwen was slower and sparser. | Captured compactor output, projected memory constituent, natural retained history and exact final invocation in both logs | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed: `Not Applicable`.
- Browser-tested web-equivalent behavior and evidence: `N/A`; no UI behavior changed.
- Shell-specific or lifecycle behavior and evidence: repository server/startup lifecycle was covered by deterministic E2E and build/bootstrap smoke; no desktop shell was involved.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: none applicable.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 (25F84), arm64 host.
- Runtime and relevant framework versions: Node.js `v22.23.1`; pnpm `10.28.2`; repository-pinned Vitest/TypeScript/Prisma dependencies.
- Browser / engine and version: `N/A`.
- Locale/timezone/accessibility: not material to backend/core validation; executing environment timezone Europe/Berlin.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: current SR-004 reset/discard baseline plus directly usable current lineage records. Prompt audit `1` and `2` are supported immutable audit values in one current-schema chain; this is not a legacy content decoder.
- Representative existing data exercised: predecessor audit `1`, new head audit `2`, 4 episodes/25 facts, recurrent live audit `2` records, unsupported audit `3`, and required migration `FAILED`/retry state.
- Direct-use, discard/rebuild, or migration result: mixed `1 -> 2` traversal and exact head projection passed; audit `3` rejected without mutation; startup remained fail-closed on required migration failure and succeeded after unresolved-row retry.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`.
- Residual untested persisted-data risk: process termination between normal publication writes is outside the approved scope.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` | Updated | Exact approved prompt file; no fixed-count/internal leakage | Pass 16/16 combined selection | Full-file golden |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts` | Updated | Builder equals renderer; one canonical User turn; escaping/tool/media/non-mutation | Pass | History-only operation prompt |
| `autobyteus-ts/tests/unit/memory/compaction-response-parser.test.ts` | Updated | Retain 5 episodes/25 facts; retain structural bounds | Pass | Removed stale 3/20 expectation |
| `autobyteus-ts/tests/unit/memory/compaction-result-normalizer.test.ts` | Updated | Retain 4 episodes/25 facts with cleanup/dedupe/salience | Pass | Natural count |
| `autobyteus-ts/tests/unit/memory/file-compaction-lineage-store.test.ts` | Updated | Mixed 1 -> 2, exact head/current projection, reject audit 3 | Pass | Immutable audit metadata |
| `autobyteus-ts/tests/unit/memory/compaction-lineage-resolver.test.ts` | Updated | Direct/root mixed-audit integrity and tail output | Pass | Typed origin |
| `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` | Updated | Manager-owned 4/25 accepted commit through archive/output/lineage | Pass | Publication path |
| `autobyteus-ts/tests/unit/memory/agent-compaction-summarizer.test.ts` | Updated | History-only operation prompt | Pass | Removed duplicate-schema expectation |
| `test-support/live-e2e/live-e2e-harness.ts` | Updated | Every real completed lineage record uses audit 2; no count policy | Pass both live models | Shared durable harness |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Updated | Live audit 2, natural nonempty episodes, exact-zero failed tools | Pass both live selections | No preferred/max count |
| `autobyteus-server-ts/tests/integration/agent-execution/compaction/compaction-agent-parent-fallback.integration.test.ts` | Updated | Current schema/provider resolver injection | Pass | Stale fixture repair |
| `autobyteus-server-ts/tests/unit/agent-execution/compaction/compaction-run-output-collector.test.ts` | Updated | Current `episodes` result schema | Pass | Stale fixture repair |
| `autobyteus-server-ts/tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts` | Updated | Current `episodes` result schema | Pass | Stale fixture repair |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts` | Updated | Required-migration failure aggregate and retry | Pass | No compatibility restored |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Updated | Required-migration failure aggregate and retry | Pass | No compatibility restored |

## Tests Removed As Stale Or Obsolete

None in API-REV-007. Stale assertions were replaced in their existing owner suites.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
- Paths added or updated: the 15 paths listed above (`15 Updated`; `0 Added`).
- Paths removed: `None`.
- Added or updated paths attached for proportional test-code review: `Yes`, in the cumulative handoff.
- Diff or repository evidence supplied for removed paths: `N/A`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `evidence/api-e2e/api-rev-007-stale-focused-discovery.log` | Pre-maintenance stale-test evidence | Retained | 3 failed/2 passed files; failures classified as stale expectations |
| `evidence/api-e2e/api-rev-007-root-deterministic-e2e-01.log` | Initial broad run | Retained | Exposed exactly two stale required-migration E2Es |
| `evidence/api-e2e/api-rev-007-core-memory-runtime-broad-01.log` | Non-authoritative combined attempt | Retained | Contains pre-correction summarizer failure; superseded by clean memory/runtime logs |
| `evidence/api-e2e/api-rev-007-cleanup.log` | Cleanup evidence | Retained | Owned state removed; source and `.env.test` preserved |
| `evidence/api-e2e/api-rev-007-secret-leak-scan.log` | Credential-value scan | Retained | 20 evidence files; 12 values; exact/URL/base64; zero matches |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Canonical ignored server test DB/vault populated by `pnpm secrets:import` | Resolve managed DeepSeek without ambient environment sourcing | Import and DeepSeek preflight/pass | DB, key and sidecars removed |
| Local LM Studio Qwen model load | No-key realistic second model | Two recurrent product compactions passed | Model unloaded; loaded count zero |
| Live task workspaces/files | Real file tools and continuation | Exact read/write/artifact contract passed | Temporary roots removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| LLM in deterministic core/server suites | Existing deterministic test doubles | Exact parser, manager, failure and persistence behavior must be stable | Closed by real DeepSeek/Qwen journeys |
| External provider/local model in live suites | Not mocked | N/A | Real models, runner, files and tools used |
| Browser/desktop shell | Not used | No changed UI/shell boundary | None applicable |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | SCN-019 | Exact natural prompt/history and >3/>20 accepted publication with audit 2/mixed lineage directly passed. |
| Pass | SCN-001–SCN-016 | Preserved current-only lineage/snapshot/reset/interruption/startup/provider/presentation boundaries passed current deterministic execution. |
| Pass | SCN-017 | Keyless Qwen completed two recurrent five-percent compactions and exact continuation with natural counts. |
| Pass | SCN-018 | Managed DeepSeek completed one five-percent compaction and exact continuation with natural counts. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/db/test.db`, vault key and sidecars | API/E2E-created | Removed | Pass |
| Runtime/test temp workspaces | API/E2E-created | Removed / verified absent | Pass |
| LM Studio Qwen load | API/E2E-triggered | Unloaded | Pass; loaded count 0 |
| Owned server/test processes | API/E2E-created | Verified none remained | Pass |
| `/Users/normy/.autobyteus/server-data/.env` | User-owned source | Read only; never sourced or changed | Preserved |
| Repository `.env.test` | Repository-owned | Verified unmodified | Preserved |
| API-REV-007 evidence | Required retained evidence | Scanned against 12 nonblank API-key values in exact/URL/base64 form | Pass: 20 files, zero matches |

## Preliminary Classification

- `Pass`; no new production, design, requirement, environment, or durable-test failure ID remains.
- The two required-migration assertions and three compactor fixtures were bounded API/E2E-owned stale-test corrections completed before the final authoritative run.

## Recommended Recipient

`code_reviewer` for the separate proportional review of the 15 updated durable test/harness paths. API/E2E execution and final confidence remain `Pass / 98%`.

## Evidence / Notes

- DeepSeek chose `1` episode / `8` facts; Qwen chose `1` episode / `3` facts and then `1` episode / `0` facts. These counts are observations, not pass criteria.
- Quantity is model-chosen. The durable proof asserts full preservation of structurally valid 4+/20+ output rather than reintroducing a preferred count.
- Both live logs were inspected for the generated compacted result, projected memory, retained active history, exact new user message, tool results, audit version, child identity, current-only replacement, and exact continuation artifact.
- Residual model-quality risk is bounded but not eliminated: Qwen was slower and semantically sparser than DeepSeek, while both retained all required continuation anchors in these journeys.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `98%`.
- Default `95%` confidence target met: `Yes`.
- Any final applicable confidence category below `90%`: `No`.
- Broader validation decision: `Required and completed` through real managed DeepSeek and keyless LM Studio Qwen server journeys.
- Critical acceptance criteria lacking direct proof: `None`.
- Required next recipient: `code_reviewer` for proportional test-code review.
- Notes: no production source changed in API-REV-007; natural-language compaction density/latency remains model-dependent; normal-publication process-crash atomicity remains explicitly outside approved scope.
