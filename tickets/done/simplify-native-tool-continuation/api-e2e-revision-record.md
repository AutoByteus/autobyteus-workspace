# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `CRR-001` / API-E2E round 1 | `SOL-REV-001`, `AR-REV-001`, `IMP-REV-001`, `CRR-001` | N/A | Pass / 97.3% |
| API-REV-002 | `code_reviewer` / `CRR-002` / API-E2E round 2 | `API-REV-001`, `CRR-002`, `TR-001` | Pass / 97.3% | Fail / 94.8% |
| API-REV-003 | `code_reviewer` / `CRR-004` / API-E2E round 3 | `API-REV-002`, `IR-002`, `CRR-003`, `CRR-004` | Fail / 94.8% | Pass / 97.5% |
| API-REV-004 | User verification / `DR-003` integrated state / API-E2E round 4 | `API-REV-003`, `CRR-005`, `DR-003` | Pass / 97.5% | Pass / 98.2% |
| API-REV-005 | `code_reviewer` / `CRR-007` / API-E2E round 5 | `API-REV-004`, `SR-002`, `ARCH-REV-002`, `IR-003`, `CRR-007`, `DR-004` | Pass / 98.2% | Pass / 98.8% |

## Revision Entries

### API-REV-001 — Native-loop coverage modernization and real managed-provider validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/code-review-report.md`; API/E2E round 1.
- Triggering finding/scenario IDs: no `CRR-001` findings; downstream scenarios API-E2E-001–010, LIVE-NATIVE-001, LIVE-NOTOOL-001 and SECRET-IMPORT-001.
- Related revisions: `SOL-REV-001`, `AR-REV-001`, `IMP-REV-001`, `CRR-001`.
- Why recorded: initial completed API/E2E baseline after classifying and replacing retired-architecture coverage, then executing deterministic repository checks and real product AgentRuns with explicitly imported managed secrets.
- Durable coverage delta: 2 files added, 27 updated, 5 deleted/replaced. Canonical path-level delta: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/durable-coverage-diff.txt`.
- Scenarios added/changed/removed: unified handler gate; runner final-batch ownership; pure builder/null request/media carrier; historical-read/no-new-marker; package contraction; provider-native histories; compaction; approval/external result; real trace corpus. Removed factory/pass-through/built-in memory processor and old class/builder expectations.
- Command/environment delta: used the audited `pnpm secrets:import` dry-run and TTY-confirmed actual import with `/Users/normy/.autobyteus/server-data/.env` into an isolated encrypted worktree vault; both selected scenarios were READY; real OpenAI no-tool and DeepSeek native/compaction AgentRuns executed.

#### Prior Failure Resolution

None. This is the first completed API/E2E result. During the round, the first live DeepSeek attempt was rejected because the model returned invalid compactor JSON; the unchanged rerun passed and both observations remain in the canonical report/logs.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, durable coverage paths, and `durable-coverage-diff.txt`.
- Prior result/confidence: N/A.
- Current result/confidence: `Pass / 97.3%`.
- New or remaining failure IDs: None.
- Recommended recipient: `code_reviewer` for proportional review of durable test-code changes.
- Remaining risks: live model stochasticity; only DeepSeek and OpenAI were called live; unrelated existing image-client/raw-env test debt; unknown external package consumers; historical cards remain by approved no-migration policy.

### API-REV-002 — TR-001 correction exposes missing retained root export

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/api-e2e-test-review-report.md`; API/E2E round 2.
- Triggering finding/scenario IDs: `TR-001`, `API-E2E-004` / AC-012.
- Related revisions: `API-REV-001`, `CRR-002`.
- Why recorded: the proportional review correctly found that the positive package contract was asserted only via internal subpaths. The requested root-namespace assertion was added and executed.
- Coverage decision changed: `autobyteus-ts/tests/unit/legacy-tool-calling-public-surfaces-removed.test.ts` now asserts root identity for `LlmStreamingResponseHandler`, `ToolSchemaProvider`, `SegmentEvent`, `BaseToolExecutionResultProcessor`, and `ToolExecutionResultProcessorRegistry` while retaining all negative alias/path assertions.
- Execution delta: focused contract test, core package build, compiled `dist/index.js` root probe, and diff/source-ownership check only. Real provider/API/E2E was not rerun because it cannot improve a static export result and `CRR-002` did not request it.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `TR-001` | Local Fix / API-E2E durable proof gap | Test-code gap corrected: positive `publicApi` assertions now cover all five minimum retained contracts. Execution exposed a separate production package-contract failure rather than a remaining assertion gap. | `validation-logs/round2/root-contract-focused.log`; corrected test path |

- Canonical artifacts updated: coverage investigation, execution coverage report, this revision record, durable coverage diff, target contract test, and round 2 logs.
- Prior result/confidence: `Pass / 97.3%`.
- Current result/confidence: `Fail / 94.8%`.
- New or remaining failure IDs: `API-E2E-F-001` — `publicApi.ToolSchemaProvider` / compiled `dist/index.js` export is missing although AC-012 explicitly retains it.
- Preliminary classification: bounded `Local Fix` in production package-index composition, likely implementation-owned; `code_reviewer` must confirm failure origin and final owner.
- Recommended recipient: `code_reviewer` for focused failure-origin review.
- Remaining risks: round 1 residual risks remain; they do not explain or mitigate the deterministic AC-012 failure.

### API-REV-003 — IR-002 focused package-contract refresh passes

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/code-review-report.md` (`CRR-004`); API/E2E round 3.
- Triggering finding/scenario IDs: resolved `CR-001`, prior `API-E2E-F-001`, `API-E2E-004`, AC-012.
- Related revisions: `API-REV-002`, `IR-002`, `CRR-003`, `CRR-004`.
- Why recorded: refreshes the formal downstream result after source re-review approved IR-002's one-line canonical root export.
- Coverage decision: unchanged. The corrected positive `publicApi` assertion remains authoritative and was rerun without weakening or further edit.
- Execution delta: focused 35-case contract test, core build/runtime dependency verification, compiled five-symbol exact-identity probe, and IR-002 one-path/one-insertion integrity audit. Round 1 real-provider/API/E2E evidence was preserved because the reviewed source delta has no runtime tool-loop effect.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-E2E-F-001` / `CR-001` | Local Fix / implementation package-index omission | Resolved by IR-002. The unchanged focused test passes 35/35 and compiled `dist/index.js` exposes the exact canonical `ToolSchemaProvider` identity with the other four required retained contracts. | `validation-logs/round3/root-contract-focused.log`, `core-build.log`, `compiled-root-contract-probe.log`, `diff-integrity.log` |

- Canonical artifacts updated: coverage investigation, execution coverage report, this revision record, durable coverage diff metadata, and round 3 evidence logs.
- Prior result/confidence: `Fail / 94.8%`.
- Current result/confidence: `Pass / 97.5%`.
- New or remaining failure IDs: None.
- Recommended recipient: `code_reviewer` for proportional re-review of the corrected durable test before delivery.
- Remaining risks: round 1 live-model/provider breadth, unrelated image-client/raw-environment debt, unknown external consumers, and approved historical-card retention remain unchanged.


### API-REV-004 — Exact compaction percentage and real post-compaction verification

- Triggering role, report path, and round: user verification request after delivery `DR-003`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/delivery-revision-record.md`; API/E2E round 4.
- Triggering finding/scenario IDs: supplemental `LIVE-COMPACTION-PCT-001`; no upstream source/test finding.
- Related revisions: `API-REV-003`, `CRR-005`, `DR-003`.
- Why recorded: the user requested current, explicit proof that compaction fires at the configured percentage and that tool/continuation behavior remains correct after compaction, using the existing `autobyteus-ts` E2E.
- Coverage decision: existing durable coverage was sufficient and was executed unchanged. No repository-resident source, test, fixture, or harness was added, updated, or removed in round 4.
- Execution delta:
  - exact token-budget plus deterministic lifecycle/failure matrix passed 3 files / 9 tests;
  - existing real LM Studio `qwen/qwen3.6-35b-a3b` compaction E2E passed 1/1;
  - managed DeepSeek preflight was READY through the encrypted vault previously imported by audited `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`;
  - first DeepSeek attempt was strictly rejected for one invalid-JSON compactor response; unchanged rerun passed 2/2;
  - value-safe audits matched exact 5% thresholds: LM Studio `floor((262144 - 1024 - 256) * 0.05) = 13043`; DeepSeek `floor((1000000 - 1024 - 256) * 0.05) = 49936`.
- Post-compaction result: both real paths completed a compaction and continued correctly. LM Studio preserved exact retained facts, succeeded later tool execution and returned the exact nine-field JSON. DeepSeek succeeded three tools, preserved projected memory/current user and the exact retained artifact, emitted ordered trace pairs, and emitted no continuation marker.

#### Prior Failure Resolution

No prior API/E2E failure was open. The round 4 first-attempt DeepSeek invalid-JSON event is not hidden: that individual execution remained failed; a clean unchanged rerun passed and independent real LM Studio execution passed. It is retained as provider-model stochasticity risk, not treated as a source regression.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, and `validation-logs/round4/`.
- Prior result/confidence: `Pass / 97.5%`.
- Current result/confidence: `Pass / 98.2%`.
- New or remaining failure IDs: None.
- Recommended recipient: `code_reviewer` to record proportional test-code review `Not Applicable` for round 4 because no durable coverage changed, then return the cumulative package to delivery.
- Remaining risks: managed compactor invalid-JSON stochasticity; not every provider called live; unrelated image-client/raw-environment debt; unknown external consumers; approved historical-card retention.

### API-REV-005 — IR-003 exact five-minute completion-timeout validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/code-review-report.md` (`CRR-007`); API/E2E round 5.
- Triggering finding/scenario IDs: BEH-011 / REQ-013 / AC-016 / DS-014; `API-E2E-011`; no `CRR-007` finding IDs.
- Related revisions: `API-REV-004`, `SR-002`, `ARCH-REV-002`, `IR-003`, `CRR-007`, `DR-004`.
- Why recorded: refreshes the authoritative downstream result after IR-003 changed the omitted server compaction-agent completion timeout from two minutes to exactly five minutes while preserving the existing explicit override and lifecycle owners.
- Coverage decision:
  - updated `autobyteus-server-ts/tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts` with a deterministic omitted/default and explicit-override matrix;
  - retained `compaction-run-output-collector.test.ts` unchanged;
  - revised the investigation and bounded `compaction-agent-parent-fallback.integration.test.ts` to the integrated base's current batch/lifecycle observation API after its initial pre-compaction stale-fixture failure.
- Durable coverage delta: 2 updated, 0 added, 0 removed. Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/durable-coverage-diff.txt` and `validation-logs/round5/api-durable-coverage-round5.diff`.
- Execution delta:
  - focused runner passed 7/7 in 19 ms;
  - collector plus corrected parent-fallback integration passed 12/12 on rerun;
  - broader server compaction unit matrix passed 4 files / 26 tests;
  - full server/shared build and sanitized built-in bootstrap passed;
  - source/diff/cleanup and final artifact-consistency checks passed, with no API/E2E production edit, no five-minute timer sleep, exact durable hashes and no owned residue.
- Direct result: omitted/default construction passed exactly `300_000` to `waitForFinalOutput`; explicit `17` remained authoritative; immediate timeout-shaped rejection retained typed `CompactionAgentRunnerError` metadata, exactly one unsubscription, an empty listener set and exactly one child termination.
- Broader validation decision: `Not Required`. The only changed boundary is the resolved collector timeout argument. Current server parent integration and actual short-timer collector behavior pass, and round 4 real LM Studio/DeepSeek compaction evidence remains valid because IR-003 changes no provider, prompt, token-budget formula, strategy, context or continuation behavior.

#### Prior Failure Resolution

No prior API/E2E failure was open. One diagnostic failure arose during this round:

| Scenario / Failure Reference | Initial Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| `ROUND5-PARENT-FIXTURE` | API/E2E-owned stale integrated-base fixture; failed before compaction because `subscribeToEvents` no longer exists | Investigation revised before edit; fixture now uses `subscribeToSourceEventBatches` and `getLifecycleSnapshot().phase`, preserving all original product assertions; rerun passed 12/12 | `validation-logs/round5/api-compaction-collector-and-parent-fallback.log`, `api-compaction-collector-and-parent-fallback-rerun.log` |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, `durable-coverage-diff.txt`, two durable test paths, and round 5 API/E2E logs.
- Prior result/confidence: `Pass / 98.2%`.
- Current result/confidence: `Pass / 98.8%`.
- New or remaining failure IDs: None.
- Recommended recipient: `code_reviewer` for proportional review of the two changed durable test paths before delivery resumes.
- Remaining risks: a genuinely stalled child may remain allocated three minutes longer before existing cleanup; no real scenario intentionally sleeps five minutes; round 4 managed-compactor invalid-JSON stochasticity, live-provider breadth, unknown external consumers and approved historical-card retention remain unrelated residuals.
