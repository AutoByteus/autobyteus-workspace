# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `CRR-001` / API-E2E round 1 | `SOL-REV-001`, `AR-REV-001`, `IMP-REV-001`, `CRR-001` | N/A | Pass / 97.3% |
| API-REV-002 | `code_reviewer` / `CRR-002` / API-E2E round 2 | `API-REV-001`, `CRR-002`, `TR-001` | Pass / 97.3% | Fail / 94.8% |
| API-REV-003 | `code_reviewer` / `CRR-004` / API-E2E round 3 | `API-REV-002`, `IR-002`, `CRR-003`, `CRR-004` | Fail / 94.8% | Pass / 97.5% |

## Revision Entries

### API-REV-001 — Native-loop coverage modernization and real managed-provider validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/in-progress/simplify-native-tool-continuation/code-review-report.md`; API/E2E round 1.
- Triggering finding/scenario IDs: no `CRR-001` findings; downstream scenarios API-E2E-001–010, LIVE-NATIVE-001, LIVE-NOTOOL-001 and SECRET-IMPORT-001.
- Related revisions: `SOL-REV-001`, `AR-REV-001`, `IMP-REV-001`, `CRR-001`.
- Why recorded: initial completed API/E2E baseline after classifying and replacing retired-architecture coverage, then executing deterministic repository checks and real product AgentRuns with explicitly imported managed secrets.
- Durable coverage delta: 2 files added, 27 updated, 5 deleted/replaced. Canonical path-level delta: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/in-progress/simplify-native-tool-continuation/durable-coverage-diff.txt`.
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

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/in-progress/simplify-native-tool-continuation/api-e2e-test-review-report.md`; API/E2E round 2.
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

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/in-progress/simplify-native-tool-continuation/code-review-report.md` (`CRR-004`); API/E2E round 3.
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
