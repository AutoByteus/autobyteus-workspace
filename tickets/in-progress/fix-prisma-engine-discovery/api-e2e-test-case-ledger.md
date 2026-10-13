# API/E2E Test-Case Ledger

API-REV-001; same canonical worktree/ticket as coverage investigation. Initialized before execution. Multiple independently meaningful and long-running cases; report owns final result.

| ID | Case | AC | Initial state |
| --- | --- | --- | --- |
| API001 | Repository owner/caller/build/integration | 001/002/003 | Not Tested |
| API002 | Durable harness/gate/current-build/image provenance | 004/006 | Not Tested |
| API003 | Native original-resolver negative and matching control | 004 | Not Tested |
| API004 | Current-source no-pin startup/API-created data | 004 | Not Tested |
| API005 | Same-state actual recreation/data/cache/cleanup | 004/006 | Not Tested |
| API006 | Inputs/license/hygiene/cause/safety/final gates | 005/006 | Not Tested |

## Execution events
Events below appended after each attempt/checkpoint; harness events.jsonl records native subcases immediately. Unresolved checkpoints never imply Pass.

- 2026-10-13T16:15:05.877383+00:00 API001 Started focused: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host tests/unit/secret-management --no-watch`; clean private HOME/TMPDIR.
- API001 Checkpoint focused exit0, evidence `api-rev-001/focused.log`; totals to be reconciled.

- 2026-10-13T16:15:21.762110+00:00 API001 Started typecheck: `pnpm -C autobyteus-server-ts typecheck`; clean private HOME/TMPDIR.
- API001 Checkpoint typecheck exit0, evidence `api-rev-001/typecheck.log`; totals to be reconciled.

- 2026-10-13T16:15:37.502507+00:00 API001 Started integration-prepare: `pnpm -C autobyteus-server-ts test:integration:prepare`; clean private HOME/TMPDIR.
- API001 Checkpoint integration-prepare exit0, evidence `api-rev-001/integration-prepare.log`; totals to be reconciled.

- 2026-10-13T16:16:02.904961+00:00 API001 Started integration: `pnpm -C autobyteus-server-ts test:integration`; clean private HOME/TMPDIR.

- API002 Checkpoint: durable harness syntax passes; gate off reports SKIP without Docker/build/download, NOT native-case Pass. Initial owned image dist audit:4559 entries, exactly migrations.js and migrations.d.ts.map differ; audit container removed. Final harness rebuild/audit still required.
- API001 Checkpoint integration exit1, evidence `api-rev-001/integration.log`; totals to be reconciled.
- API001 Completed first repository pass: focused197/197, typecheck/preparation Pass; integration371 Pass/2 Fail/68 Skip (91 files:72 Pass/1 Fail/18 Skip), exit1. Full unit not started by stop-on-failure runner. Two cadence failures retained; diagnosis/accountable failure-origin required, NOT waived by baseline note.
- API002 Started final durable harness rebuild/audit; API003–005 run only after their prerequisite assertions. Detailed immediate events in docker-attempt-1/events.jsonl.
- API001 diagnosis planned: inspect unchanged AgentRun input-state publication and websocket scheduler classification; temporary copy of existing two failed cases will log only scripted raw message type/timing to establish whether AGENT_INPUT_STATE flushes buffered content early. No production/source/test expectation edit. Baseline equality of involved paths will be recorded; separate product owner disposition required if confirmed.

- API001 Started cadence-diagnostic 2026-10-13T16:21:17.351729+00:00; clean private environment.
- API001 Completed cadence-diagnostic exit1; `cadence-diagnostic.log`; skips/failures retained, diagnostic does not alter assertions.

- API001 Started unit 2026-10-13T16:21:26.731650+00:00; clean private environment.
- API002 Completed Pass at16:20:41Z: current rebuild; all4559 server dist entries audited, ONLY migrations.js/d.ts.map differ; frozen read-only dist identity recorded.
- API003 Completed Pass at16:20:43Z: official checksummed c299/native baseline resolver→cache RPC-32601; current605 bundle query+schema revisions/matchingRPC27 migrations, canonical env.
- API004 Completed Pass at16:20:57Z: normal entrypoint/backend with no process pins, schema success,HTTP200/statusokx3; definition created via GraphQL.
- API005 Completed Pass at16:21:09Z: first0407073→recreated8ac4a1 distinct IDs/SAME owned HOME+data/currentdist; repeatedHTTPx3, identical API definition/wrong-cache bytes; signed out. Cleanup verified no owned containers/temp root remain. Evidence docker-attempt-1/{events.jsonl,native-proof.json,recreation-proof.json,cleanup.json}; not live user-node/image publication proof.
- API001 Completed unit exit0; `unit.log`; skips/failures retained, diagnostic does not alter assertions.
- API001 Completed final independent unit run5455Pass/7Skip,687filesPass/4Skip,exit0. API-F001 remains2 integration failures, separately diagnosed. Temporary diagnostic and private roots removed; exact testSQLite/journal cleanup in repository-cleanup.json.
- API006 Completed scope/input audit: cumulative five-path non-ticket allowlist, package delta only one script; no dependency/recipe/lock/schema/caller change. Licensing/hygiene/syntax/current+cumulative whitespace/owned-container absence results recorded final-gates.json.
- Final reconciliation: API001 Fail pending API-F001 origin; API002–006 Pass. No case running/unstarted, skips remain skips. api-e2e-execution-coverage-report.md owns authoritative API-REV001 Fail92.1%, broader Required/executed; initial/diagnostic failures retained, no waiver.
