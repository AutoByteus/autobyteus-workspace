# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-spec.md`
- Supplemental Task Artifacts: `memory-compactor-prompt-spec.md`, `prompt-confusion-root-cause.md`, `compaction-output-contract-decision.md`, and the seven upstream evidence artifacts inventoried in `investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/solution-revision-record.md` (`SR-001`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/code-review-revision-record.md` (`CRR-002`; implementation source review remains Pass, proportional test review finding `CR-TEST-001` routed here)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: proportional test-review `CRR-002` / `CR-TEST-001`, after API-REV-001 execution passed but the source-tool-tail predicate was found to overstate its proof
- Prior Investigation Reviewed: `API-REV-001` canonical investigation and execution artifacts
- Latest Authoritative Investigation: this file
- Sequencing record: this artifact was first written before API-REV-001 durable edits/execution. Round 2 rechecked the existing investigation and `CR-TEST-001` before the bounded harness correction and final rerun; this file now records the latest state.

## Current Requirement And Design Basis

Validation covers `BEH-001` through `BEH-006`, `REQ-001` through `REQ-010`, and `AC-001` through `AC-013`. The critical behaviors are sender-neutral raw/context composition; byte-exact target-agent prompt framing and sole renamed wrapper; the preserved six-array response; validate-all candidate selection and ambiguity rejection; exactly one content-specific correction child; one parent terminal lifecycle; no canonical mutation before acceptance; unchanged projection; zero tools; prompt-contract-3 writes; and direct non-rewriting reads of versions 1/2/3. `memory-compactor-prompt-spec.md` is the exact prompt authority. The approved persisted-data decision is `Directly Usable — No Migration`.

The source review found no implementation defect. API-REV-001 closed the realistic-provider, stale live-E2E version, repair atomicity, sender-format, zero-tool, and mixed-lineage evidence gaps. The first proportional test review then found `CR-TEST-001`: the harness reported a source-tool **tail** while only searching for a source tool anywhere in the task. API-REV-002 corrected that API/E2E-owned predicate without reopening the implementation review.

## Changed Behavior Summary

| Behavior | Coverage Consequence | Final Evidence State |
| --- | --- | --- |
| `BEH-001` input and target-history prompt | Preserve raw/context tests and inspect the persisted actual child user trace, including a rendered source-tool tail. | Unit/integration/exact evidence pass; corrected wrapper-scoped final-role/native-`read_file` predicate passed the API-REV-002 DeepSeek rerun. |
| `BEH-002` response boundary | Exercise validate-all, ambiguity, production wrong-task negatives, and earlier successful positives. | Parser units and retained production-output probe pass. |
| `BEH-003` attempt/parent lifecycle | Prove recovery and exhaustion deterministically; do not depend on a provider to emit invalid content. | Summarizer/runtime tests pass; exactly one correction and terminal parent behavior are directly exercised. |
| `BEH-004` accepted commit/projection | Prove one accepted commit on recovery and byte/state equality on exhaustion. | Runtime atomicity snapshot and tool-lifecycle integrations pass; live continuation artifact passes. |
| `BEH-005` compactor authority | Make the canonical live definition's zero-tool invariant explicit. | Built-in definition, runner/collector, and live DeepSeek checks pass. |
| `BEH-006` prompt provenance | Replace stale live version 2 expectation with 3 and retain mixed 1/2/3 reads. | Lineage file unit and live DeepSeek v3 write pass. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Boundary | Direct Repository Evidence | Broader Mode / Result |
| --- | --- | --- | --- | --- |
| Domain/backend | Yes | prompt, parser, retry, input composition | focused units and runtime integrations | real DeepSeek canonical flow passed |
| API/transport | Yes | server child-run creation, public assistant content, events | runner/collector and parent-fallback integration | live product runner passed |
| Frontend/browser/desktop | No | none | N/A | not required |
| Process/lifecycle | Yes | one/two children below one parent operation | recovery/exhaustion integration | live child lifecycle passed |
| Persisted data | Yes | v3 writes; 1/2/3 direct reads | file-store and runtime commit tests | live v3 lineage passed |
| External provider | Yes | actual model interprets realistic tool-tail prompt | mocks cannot close this gap | DeepSeek passed; optional LM Studio was unstable for unrelated main-agent/local-inference reasons |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness`
- Stack: pnpm TypeScript monorepo; Node/Vitest; Fastify; Prisma/SQLite; AutoByteus agent runtime; managed live-provider harness.
- Test authority: `autobyteus-server-ts/AGENTS.md` requires `vitest run ... --no-watch`; the root/server READMEs define `pnpm test:e2e`, `pnpm test:e2e:real:preflight`, and `pnpm test:e2e:real`.
- TypeScript authority: package builds are authoritative; the general server `pnpm typecheck` is known upstream to include tests below `rootDir: src` and is not the project validation command.
- Initial live state: the worktree had no `autobyteus-server-ts/db/test.db`, vault key, or persistent live runtime.
- Final secret readiness: `Yes`. At the user's explicit direction, the documented generic importer previewed and imported `/Users/normy/.autobyteus/server-data/.env` into the isolated worktree test database only. The value-free preview planned nine creates; the TTY-confirmed import configured nine secret IDs. No production database was targeted and no secret value was printed.
- Live readiness: DeepSeek and `qwen/qwen3.6-35b-a3b` preflighted `READY`.
- Cleanup: the isolated test DB, adjacent vault key, and `tests/.tmp/live-e2e-runtime` were removed; the authorized source remained untouched/readable; no owned server/test process remained.

| Component | Setup / Command | Readiness / Safety | Cleanup |
| --- | --- | --- | --- |
| deterministic tests | package-local Vitest `run --no-watch` | test-owned temp roots and SQLite setup | hooks/project setup |
| isolated managed vault | `pnpm secrets:import -- --source ... --database-url file:/.../db/test.db --dry-run`, then TTY-confirmed apply | absolute target; value-free output; nine IDs configured | DB/key removed |
| live server | root live-E2E scripts | owned loopback process and isolated app data | runner stop plus verified runtime removal |
| DeepSeek | `deepseek.compaction-agent-flow` | managed secret resolved from isolated vault | client/runner cleanup |
| LM Studio | `lmstudio.qwen36.compaction-agent-flow` | unowned local service/model preflighted READY | no unowned process stopped |

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration`.
- Representative data: immutable schema-v1 lineage containing prompt contracts 1 then 2, followed by a new version-3 record.
- Result: direct mixed `1 -> 2 -> 3` read and exact v3 head projection passed; unsupported 4 remains fail-closed; live DeepSeek produced `[3]` without a compatibility branch or rewrite.
- Migration completion/recovery: N/A.

## Existing Durable Coverage Inventory And Final Decisions

| Path / Scenario | Initial Decision | Final Action / Result |
| --- | --- | --- |
| core prompt builder, parser, summarizer, structured strategy, pending executor, lineage store units | Still Valid | retained; 40/40 focused tests passed |
| server template, input processor, runner, collector units | Still Valid | retained; 27/27 tests passed |
| core input pipeline, tool continuation, multimodal builder, native history renderer | Still Valid | retained; 21/21 tests passed |
| runtime compaction integration | Needs Update | strengthened exact in-memory/on-disk atomicity; 2/2 tests passed inside the 8-test integration group |
| tool lifecycle and native continuation integrations | Still Valid | retained; core integration group 8/8 passed |
| parent fallback integration | Still Valid | retained; 5/5 passed |
| mixed lineage file store | Still Valid | retained; direct 1/2/3 and unsupported-4 coverage passed |
| canonical real-provider E2E/harness | Needs Update | v2 -> v3; added child framing/source-tool-tail/zero-tool proof; after `CR-TEST-001`, tail proof was corrected to wrapper-only final-role `Tool:` plus successful native `read_file` arguments/result shape; DeepSeek rerun passed |
| server settings GraphQL compaction E2E | Needs Update discovered during broad execution | stale string argument no longer matched `LLMRequestAssembler`'s `LLMUserMessage` contract; fixture updated, preserving its current-user projection assertion; isolated 10/10 passed |
| custom core LM Studio compaction E2E | Out Of Scope | not target evidence because it bypasses the canonical built-in/server prompt boundary |

## Stale Or Obsolete Coverage Decisions

| Scenario | Obsolete Assertion / Fixture | Why Stale | Replacement |
| --- | --- | --- | --- |
| canonical live E2E | current writes have prompt contract 2 | approved new writes are v3; v2 is read-only history | same flow requires v3, plus mixed 1/2/3 file coverage |
| server-settings compaction E2E | pass a raw string to `prepareRequest` | assembler now accepts `LLMUserMessage`; the raw string yielded an empty projected current-user body and invalidated the test rather than production | construct `LLMUserMessage({content})`; original projection assertions retained and pass |

No durable coverage was removed.

## Durable Coverage Added Or Updated

| Scenario ID | Path | Change | Requirement / Result |
| --- | --- | --- | --- |
| `API-E2E-001` | `test-support/live-e2e/live-e2e-harness.ts` | inspect the persisted accepted child user trace for exact framing; separately extract only the target wrapper and require its final rendered role to be a successful native `read_file` Tool with arguments/result | REQ-001; AC-001/002; corrected live rerun pass |
| `API-E2E-002` | harness + live E2E test | require canonical built-in definition `toolNames.length === 0` and report/assert tool-free | REQ-009; AC-012; live pass |
| `API-E2E-003` | harness + live E2E test | current-write contract `2 -> 3` | REQ-010; AC-013; live pass |
| `API-E2E-004` | core runtime compaction integration | snapshot pending state, working context, episode/semantic rows, archive, lineage, snapshot, and canonical files at each exhausted attempt | REQ-006/007; AC-009/010; deterministic pass |
| `API-E2E-005` | server-settings GraphQL E2E | use typed `LLMUserMessage` so current-user projection coverage remains valid | REQ-001/008; AC-001/011; isolated pass |

## Repository Coverage Execution Plan And Results

| Order | Command / Mode | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | core focused prompt/parser/summarizer/strategy/executor/lineage units | direct model-response and provenance owners | Pass — 40/40 | `api-e2e-evidence/core-focused-unit-tests.log` |
| 2 | server focused template/input/runner/collector units | exact prompt, sender-neutral input, child authority | Pass — 27/27 | `api-e2e-evidence/server-focused-unit-tests.log` |
| 3 | core input/provider unit group | sender/tool/media/provider formatting | Pass — 21/21 | `api-e2e-evidence/core-input-provider-unit-tests.log` |
| 4 | core compaction/tool/native-continuation integrations | recovery, exhaustion atomicity, commit/projection | Pass — 8/8 | `api-e2e-evidence/core-compaction-integration-tests.log` |
| 5 | server parent-fallback integration | production server child fallback/error metadata | Pass — 5/5 | `api-e2e-evidence/server-compaction-integration-tests.log` |
| 6 | changed live test without live flag | compilation and skip gate | Pass — file compiled; intentionally skipped | `api-e2e-evidence/live-e2e-test-compile-skip-final.log` |
| 7 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts build` | package integration/bootstrap | Pass / Pass | `core-build.log`; `server-build.log` |
| 8 | retained output parser probe | two incident wrong-task outputs and two prior successes | Pass — rejected 2/2 at extraction; accepted 2/2 (4 and 3 episodes) | `production-output-parser-probe.log` |
| 9 | exact prompt/tail probe | approved byte equality and preserved six-array tail | Pass | `exact-prompt-contract-probe.log` |
| 10 | `pnpm test:e2e` broad suite | unrelated regression signal plus relevant server-settings compaction scenario | Mixed — 177 passed, 50 skipped, 4 failed and one suite load failure; related stale fixture repaired afterward | `deterministic-e2e-suite.log` |
| 11 | isolated server-settings GraphQL E2E after fixture repair | selected compaction strategy and current-user projection | Pass — 10/10 | `server-settings-compaction-e2e-fixed.log` |
| 12 | value-safe managed-provider preflight | isolated vault and provider/model readiness | Pass — 18/18 preflight tests; both compaction scenarios READY | `live-provider-preflight.log` |
| 13 | live DeepSeek canonical compaction | actual provider, tools, child, lifecycle, persistence, v3, projection | Pass — 2/2 including preflight | `live-deepseek-compaction-e2e.log` |
| 14 | optional live LM Studio and one rerun | secondary local-model evidence | Non-blocking Fail — first exact main-agent tool sequence differed; rerun had a 300s local compactor transport timeout before later compactions completed | `live-lmstudio-compaction-e2e*.log` |
| 15 | `git diff --check` | API-REV-001 patch hygiene | Pass | `git-diff-check.log` |
| 16 | changed live file after `CR-TEST-001` correction, live flag absent | TypeScript transform/import and skip gate | Pass — file compiled; intentionally skipped | `api-rev-002-live-e2e-compile-skip.log` |
| 17 | `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` after isolated import | corrected wrapper-scoped final-role/native-tool tail predicate at real provider boundary | Pass — 2/2; one completed compaction; corrected tail boolean true | `api-rev-002-live-deepseek-compaction-e2e.log` |
| 18 | API-REV-002 cleanup | isolated DB/key, test DB/runtime, process audit | Pass | `api-rev-002-cleanup.log` |
| 19 | `git diff --check` after API-REV-002 artifact updates | patch hygiene | Pass | `api-rev-002-git-diff-check.log` |
| 20 | exact authorized-source-value and credential-pattern scan | evidence value safety | Pass | `api-rev-002-value-safety-scan.log` |

### Broad-Suite Failure Classification

The initial full deterministic E2E command was deliberately broader than the changed boundary. It exposed the stale, relevant server-settings fixture, which was locally repaired and then passed in isolation. The remaining failures are in unchanged, unrelated coverage: a removed Codex bootstrap-strategy import in `agent-package-private-skills.e2e.test.ts`, an incomplete `appConfigProvider` mock in the media catalog case, and an incomplete `providerNameReader` mock in two token-usage backfill cases. No implementation/API-E2E diff touches those paths or their production owners. They are recorded as pre-existing broader-suite debt, not claimed as passes and not used to prove this task.

The optional LM Studio attempts also do not contradict this change: the first failed on the primary fixture agent's model-selected tool count, after compactions completed; the rerun failed because a local compactor child exceeded the existing 300-second runner timeout, an explicitly out-of-scope transport failure, before later operations completed. The incident-aligned managed DeepSeek scenario passed every task-specific assertion.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Support | Remaining Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 98% | direct units/integrations/probes cover AC-001–013 | schema-valid semantic completeness remains model-dependent |
| Changed-boundary execution directness | 98% | production prompt/parser/attempt/commit/input/lineage owners executed | none material |
| Cross-boundary integration realism and mock gap | 97% | real DeepSeek, native tools, persisted child trace, actual server runner | optional LM Studio local inference was unstable |
| Environment, configuration, identity, and fixture fidelity | 97% | documented isolated vault, absolute target, loopback server, synthetic real files, cleanup | external provider/service availability varies |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | validate-all negatives, one repair, recovery, repeated exhaustion and full atomicity | live provider pass did not require content repair; deterministic runtime did |
| User-surface, browser, and desktop-shell confidence | N/A | no UI/shell boundary changed | N/A |
| Durable regression coverage quality and relevance | 98% | four narrow durable paths; `CR-TEST-001` corrected with wrapper-scoped last-role/native-result semantics and re-executed | proportional re-review remains required |

- Overall post-repository confidence: `97.5%` (simple mean of six applicable categories)
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below 90%: `No`
- Default clean-confidence target met: `Yes`
- Material residual risks: probabilistic factual quality of otherwise schema-valid summaries; intentionally terminal transport failure; optional local-model timing/tool-selection variability; unrelated broad-suite debt listed above.

## Broader Validation Decision

- Decision: `Required — Completed`
- Selected mode: `Live API` through the canonical server live-E2E harness.
- Rationale: the reported production defect depended on a real provider interpreting realistic tool-tail history. Fakes could not prove the actual processed child input or provider behavior.
- Result: DeepSeek `deepseek-v4-flash` passed again in API-REV-002 at the product boundary with one completed compaction, prompt contract `[3]`, three exact successful tools, no tool failure, canonical child framing/corrected wrapper-scoped final-`read_file`-tool-tail/zero-tool true, persisted memory, exact retained artifact, and projected current-user region all verified.
- Browser decision: not required because no frontend/browser/desktop owner changed.

## Live Environment, Fixture, And Cleanup Result

- Startup order: API-REV-001 completed the full sequence. API-REV-002 ran the corrected live-file compile/skip gate, importer dry run, TTY-confirmed isolated import, and required DeepSeek rerun; no optional LM Studio rerun was needed for the bounded finding.
- Environment: worktree `db/test.db` only; adjacent generated vault key; tracked credential-free `.env.test`; loopback owned server; DeepSeek `thinking_type` disabled, temperature zero, ratio 0.05.
- Fixtures: harness-generated synthetic incident JSONL; native `read_file`/`write_file`; exact retained anchors; persisted accepted child trace.
- Evidence output: value-safe readiness/results, hashes, booleans, counts, phases, and synthetic fixture content only; no secret value.
- Cleanup: API-REV-002 removed the isolated DB/key, test DB/journal, and persistent live runtime; no owned process remained; the authorized source stayed untouched/readable. See `api-e2e-evidence/api-rev-002-cleanup.log`.

## Temporary Executable Validation

| Scenario ID | Probe | Result | Retention |
| --- | --- | --- | --- |
| `API-PROBE-001` | built parser over captured failed/successful production outputs | Pass | log retained; no general test embeds user evidence |
| `API-PROBE-002` | byte compare approved prompt/current file and base/current six-array tail | Pass | log retained; durable exact template test already exists |

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk / Follow-up |
| --- | --- | --- |
| factual completeness of every schema-valid summary | not structurally decidable; live anchors provide bounded evidence | residual model-quality risk |
| retry for first-attempt provider/transport failure | explicitly excluded by approved design | remains terminal by design |
| browser/Electron presentation | unaffected | none |
| optional LM Studio journey as a clean second-provider pass | external local model deviated/timed out twice | recorded truthfully; DeepSeek is the required incident-aligned real-provider proof |
| unrelated broad-suite failures | unchanged, outside requirements and production diff | repository debt, not a task blocker |

## Investigation Decision

- Proceeded To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — four files updated in API-REV-001; the existing live harness path received the bounded `CR-TEST-001` correction in API-REV-002; none added or removed.
- Final API/E2E result: `Pass`
- Post-repository/final confidence: `97.5%`
- Broader validation: `Required — Completed`
- Reroute required for implementation failure: `No`
- Required next recipient: `code_reviewer` for proportional re-review of the corrected live harness before delivery.
