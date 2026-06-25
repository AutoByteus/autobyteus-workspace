# API/E2E Execution Coverage Report — Round 4 Codex/Claude Browser Screenshot Evidence

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 4
- Trigger: User asked why there were no Codex/Claude runtime screenshots for token input/output display.
- Prior Round Reviewed: Rounds 1, 2, and 3 in this same report.
- Latest Authoritative Round: Round 4

## Round History

| Round | Trigger | Prior Unresolved Failures / Gaps Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review pass; API/E2E coverage requested | N/A | No implementation failures | Pass for deterministic coverage only | No | Did not invoke real runtimes or browser frontend. |
| 2 | User required real runtime E2E for AutoByteus+LM Studio qwen3.5, Codex, and Claude | Rechecked skipped real-runtime gap | No implementation failures; one over-strict assertion corrected | Pass | No | Real backend runtime E2E passed for AutoByteus, Codex, and Claude. |
| 3 | User required real browser frontend stack test | Rechecked missing browser/frontend real-stack gap | No implementation failures | Pass | No | Backend + frontend were started and AutoByteus seeded browser UI displayed token usage correctly. |
| 4 | User required Codex/Claude runtime screenshots | Rechecked missing browser screenshots for Codex and Claude | No implementation failures | Pass | Yes | Real Codex and Claude runtime runs were created through backend GraphQL/WebSocket and screenshotted in the Nuxt Usage panel. |

## Correction / Answer To The Screenshot Gap

The reason there was no Codex/Claude browser screenshot before Round 4 is that Round 2 stopped at the real backend/runtime boundary and Round 3 used seeded AutoByteus data for the browser boundary. That was incomplete evidence for the user's intended E2E validation. Round 4 corrects that gap: Codex and Claude were exercised as real runtimes, then the resulting persisted runs were opened in the real frontend and screenshotted on the Usage tab.

## Execution Basis

Round 4 used the same README-style local stack shape as Round 3, but did not manually seed token ledger rows. Instead, it created real Codex and Claude agent runs through the backend GraphQL API and drove a real agent WebSocket turn for each run. The server emitted `TOKEN_USAGE_UPDATED`, persisted one ledger event for each run, GraphQL returned the summary, and the Nuxt frontend displayed the run-specific Usage panel.

- Backend: built server launched with `node autobyteus-server-ts/dist/app.js --data-dir <temp-data-dir> --host 127.0.0.1 --port 18001`.
- Frontend: Nuxt dev server launched with `pnpm -C autobyteus-web dev --port 13001`, pointed at backend `http://127.0.0.1:18001`.
- Runtime creation: temporary script used backend GraphQL + `/ws/agent/:runId`, sent one message per runtime, waited for `TOKEN_USAGE_UPDATED`, polled GraphQL summary, then terminated the run.
- Browser: local frontend opened `/workspace?workspaceExecutionKind=agent&workspaceExecutionRunId=<runId>`, clicked the Usage tab, asserted rendered token values, and retained screenshots.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Coverage investigation updated before Round 4 browser execution: `Yes`
- Round 4 decision: Codex/Claude backend runtime evidence and AutoByteus browser evidence were valid but insufficient without Codex/Claude browser screenshots.
- Reroute required from investigation: `No`

## Runtime Runs And Backend GraphQL Evidence

### Codex App Server

- Run ID: `browser_token_codex_38f6236a_9722_4d3c_afcf_babf_a17e5225154143008230707cce6c5f92`
- Runtime kind: `codex_app_server`
- Model identifier: `gpt-5.4-mini`
- Ingestion source: `codex_thread_token_usage`
- Ledger event count: `1`
- Input/output/total tokens: `12695 / 26 / 12721`
- Cost state: `estimated`, total estimated cost `0.009638250000000001 USD`
- Raw/cache/reasoning preservation observed: cached input tokens and reasoning output tokens were present in the runtime payload.

Backend GraphQL verification returned:

```text
runId=browser_token_codex_38f6236a_9722_4d3c_afcf_babf_a17e5225154143008230707cce6c5f92
inputTokens=12695
outputTokens=26
totalTokens=12721
estimatedApiInputCost=0.00952125
estimatedApiOutputCost=0.000117
estimatedApiTotalCost=0.009638250000000001
apiCostStatus=estimated
latestModelIdentifier=gpt-5.4-mini
latestRuntimeKind=codex_app_server
eventCount=1
```

### Claude Agent SDK

- Run ID: `browser_token_claude_ece5cfa0_3c4b_48bf_957e_051_db1036c10d274b4e9405ed1c8bf4abb0`
- Runtime kind: `claude_agent_sdk`
- Model identifier: `sonnet`
- Ingestion source: `claude_sdk_result`
- Ledger event count: `1`
- Input/output/total tokens: `22270 / 39 / 22309`
- Cost state: `price_missing`, estimated cost fields `null`
- Raw usage preservation observed in runtime payload; frontend correctly kept the cost display unpriced rather than zero.

Backend GraphQL verification returned:

```text
runId=browser_token_claude_ece5cfa0_3c4b_48bf_957e_051_db1036c10d274b4e9405ed1c8bf4abb0
inputTokens=22270
outputTokens=39
totalTokens=22309
estimatedApiInputCost=null
estimatedApiOutputCost=null
estimatedApiTotalCost=null
apiCostStatus=price_missing
latestModelIdentifier=sonnet
latestRuntimeKind=claude_agent_sdk
eventCount=1
```

## Browser Screenshot Evidence

| Runtime | URL Shape | Rendered Browser Assertions | Screenshot Artifact | Result |
| --- | --- | --- | --- | --- |
| Codex App Server | `http://127.0.0.1:13001/workspace?workspaceExecutionKind=agent&workspaceExecutionRunId=browser_token_codex_38f6236a_9722_4d3c_afcf_babf_a17e5225154143008230707cce6c5f92` | Header chip displayed `12.7k tok · 0,0096 $ est`; Usage panel displayed `INPUT 12.695`, `OUTPUT 26`, `TOTAL 12.721`, cost cards, `Price status estimated`, `Latest model: gpt-5.4-mini`, `Runtime: codex_app_server`, `Events: 1`. | `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png` | Pass |
| Claude Agent SDK | `http://127.0.0.1:13001/workspace?workspaceExecutionKind=agent&workspaceExecutionRunId=browser_token_claude_ece5cfa0_3c4b_48bf_957e_051_db1036c10d274b4e9405ed1c8bf4abb0` | Header chip displayed `22.3k tok · unpriced`; Usage panel displayed `INPUT 22.270`, `OUTPUT 39`, `TOTAL 22.309`, unpriced cost cards, `Price status price_missing`, `Latest model: sonnet`, `Runtime: claude_agent_sdk`, `Events: 1`. | `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png` | Pass |
| AutoByteus + LM Studio | Round 3 seeded browser URL for `browser_token_usage_run_001` | Usage panel displayed `INPUT 321`, `OUTPUT 45`, `TOTAL 366`, `Runtime: autobyteus`, `Price status price_missing`, and qwen3.5 LM Studio model identifier. | `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png` | Pass |

## Coverage Matrix — Round 4

| Scenario ID | Behavior / Boundary | Execution Method | Result |
| --- | --- | --- | --- |
| APIE2E-014 | Codex App Server real runtime run persists token usage and frontend browser displays input/output/total tokens, model/runtime, and price status. | Real backend GraphQL/WebSocket agent turn, GraphQL summary verification, Nuxt browser Usage tab screenshot. | Pass |
| APIE2E-015 | Claude Agent SDK real runtime run persists token usage and frontend browser displays input/output/total tokens, model/runtime, and unpriced status. | Real backend GraphQL/WebSocket agent turn, GraphQL summary verification, Nuxt browser Usage tab screenshot. | Pass |

## Scenarios Checked — Round 4

### Passed

1. Backend startup from README path on port 18001
   - Result: Pass. Server started with a fresh temp data directory and applied migrations.
2. Frontend startup from README path on port 13001
   - Result: Pass. Nuxt served the frontend and proxied GraphQL/rest/ws endpoints to the temp backend.
3. Real Codex runtime agent turn
   - Result: Pass. WebSocket received token usage, ledger/GraphQL summary returned positive input/output/total tokens, and browser Usage panel displayed those values.
4. Real Claude runtime agent turn
   - Result: Pass. WebSocket received token usage, ledger/GraphQL summary returned positive input/output/total tokens, nullable price fields, and browser Usage panel displayed those values as unpriced.
5. Browser screenshots retained for both runtimes
   - Result: Pass. Screenshot files are listed above and visually confirm the token input/output UI for Codex and Claude.

### Failed

- None attributable to the implementation.

### Not Tested / Residual Scope

| Scenario | Reason | Risk / Follow-Up |
| --- | --- | --- |
| New repository-resident screenshot E2E harness | Round 4 used a temporary realistic stack/browser probe; no screenshot harness exists in the repository. | If product wants permanent screenshot regression coverage, add a durable browser test harness in a separate scoped change. |
| Additional provider live API calls beyond the configured runtimes | Round 4 targeted the user's requested Codex/Claude screenshot gap; Round 2 already covered AutoByteus+LM Studio qwen3.5. | Provider SDK schema drift remains possible for providers not exercised here. |

### Blocked

- None.

## Cleanup Performed

- Temporary runtime/browser scripts and local stack data were removed after execution.
- Backend/frontend dev processes were stopped after screenshots were captured.
- Browser tab was closed after evidence capture.

## Classification

- No execution failure requiring reroute.
- No repository-resident durable coverage was added/updated/removed in Round 4.
- Durable coverage changes from earlier API/E2E rounds still require code-review re-review before delivery.

## Recommended Recipient

- `code_reviewer`

## Evidence / Notes

- Codex screenshot: `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png`
- Claude screenshot: `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png`
- AutoByteus screenshot from Round 3: `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png`

## Latest Authoritative Result

- Result: `Pass`
- Notes: Real Codex and Claude runtime runs now have browser screenshot evidence for token input/output display. Together with Round 2 and Round 3, all three requested runtimes have real runtime/frontend evidence.

---

# API/E2E Execution Coverage Report — Round 3 Browser Frontend Stack Test

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 3
- Trigger: User required a real browser frontend test with backend/frontend startup and seeded agent/token-usage data.
- Prior Round Reviewed: Rounds 1 and 2 in this same report.
- Latest Authoritative Round: Round 3

## Round History

| Round | Trigger | Prior Unresolved Failures / Gaps Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review pass; API/E2E coverage requested | N/A | No implementation failures | Pass for deterministic coverage only | No | Did not invoke real runtimes or browser frontend. |
| 2 | User required real runtime E2E for AutoByteus+LM Studio qwen3.5, Codex, and Claude | Rechecked skipped real-runtime gap | No implementation failures; one over-strict assertion corrected | Pass | No | Real backend runtime E2E passed for AutoByteus, Codex, and Claude. |
| 3 | User required real browser frontend stack test | Rechecked missing browser/frontend real-stack gap | No implementation failures | Pass | Yes | Backend + frontend were started, seeded agent/ledger data was loaded, and browser UI displayed ledger-backed token usage correctly. |

## Execution Basis

Round 3 proves the frontend/browser boundary that was still missing after the real runtime backend E2E. The test used the README-documented local development topology:

- Backend: built server launched with `node autobyteus-server-ts/dist/app.js --data-dir <temp-data-dir> --host 127.0.0.1 --port 18000`.
- Frontend: Nuxt dev server launched with `pnpm -C autobyteus-web dev --port 13000`, with `BACKEND_NODE_BASE_URL=http://127.0.0.1:18000` and websocket endpoints pointed at the same backend.
- Seed: temporary app data directory received one historical agent run metadata/raw-trace pair and one SQL `token_usage_ledger_events` row.
- Browser: local frontend tab opened `http://127.0.0.1:13000/workspace?workspaceExecutionKind=agent&workspaceExecutionRunId=browser_token_usage_run_001` and interacted with the rendered UI.

The seeded ledger row intentionally used nullable cost fields with `apiCostStatus=price_missing` to verify the UI shows unpriced state instead of fabricated zero cost.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Coverage investigation updated before local stack/browser final execution: `Yes`
- Round 3 decision: store/build/server E2E coverage was valid but insufficient; a temporary executable browser probe was required.
- Reroute required from investigation: `No`

## Seeded Test Data

- Run ID: `browser_token_usage_run_001`
- Agent definition: `autobyteus-memory-compactor` / `Memory Compactor`
- Workspace: temporary filesystem workspace under `/tmp/autobyteus-browser-e2e-workspace-*`
- Model identifier: `qwen3.5-27b:lmstudio@127.0.0.1:1234`
- Runtime kind: `autobyteus`
- Ledger event count: `1`
- Input/output/total tokens: `321 / 45 / 366`
- Cost state: `estimated_api_* = null`, `api_cost_status = price_missing`
- Context pressure: `500 / 4096`, `12.207%`

Backend GraphQL pre-browser verification returned:

```text
runId=browser_token_usage_run_001
inputTokens=321
outputTokens=45
totalTokens=366
estimatedApiTotalCost=null
apiCostStatus=price_missing
latestModelIdentifier=qwen3.5-27b:lmstudio@127.0.0.1:1234
latestRuntimeKind=autobyteus
eventCount=1
latestContextInputTokens=500
effectiveContextBudgetTokens=4096
contextPressurePercent=12.207
```

## Coverage Matrix — Round 3

| Scenario ID | Behavior / Boundary | Execution Method | Result |
| --- | --- | --- | --- |
| APIE2E-011 | Nuxt frontend loads seeded historical agent run through real backend history/resume GraphQL and shows the selected run. | Browser tab opened `/workspace?workspaceExecutionKind=agent&workspaceExecutionRunId=browser_token_usage_run_001`. | Pass |
| APIE2E-012 | Browser UI displays ledger-backed token usage summary, unpriced/null cost semantics, latest model/runtime, event count, and context pressure. | Clicked Usage tab and asserted rendered DOM text. | Pass |
| APIE2E-013 | Header token usage chip appears after summary fetch and opens the Usage tab from another tab. | Clicked Terminal, then clicked header chip `366 tok · unpriced`, and asserted Usage panel reopened. | Pass |

## Scenarios Checked — Round 3

### Passed

1. Backend startup from README path
   - Command shape: `node autobyteus-server-ts/dist/app.js --data-dir <temp-data-dir> --host 127.0.0.1 --port 18000`
   - Result: Pass. Server started on `http://127.0.0.1:18000`; fresh temp SQLite DB applied all 14 migrations including `20260624090000_add_token_usage_ledger_events`; temp workspace created.
2. Seeded backend GraphQL summary verification
   - Command: GraphQL POST to `http://127.0.0.1:18000/graphql` for `getAgentRunTokenUsageSummary(runId: "browser_token_usage_run_001")`.
   - Result: Pass. Returned 321 input, 45 output, 366 total, `price_missing`, model `qwen3.5-27b:lmstudio@127.0.0.1:1234`, runtime `autobyteus`, event count 1.
3. Frontend startup from README path
   - Command shape: `BACKEND_NODE_BASE_URL=http://127.0.0.1:18000 ... pnpm -C autobyteus-web dev --port 13000`
   - Result: Pass. Nuxt served `http://127.0.0.1:13000/` and proxied `/graphql`/`/rest` to the backend.
4. Browser rendered seeded run and Usage tab values
   - URL: `http://127.0.0.1:13000/workspace?workspaceExecutionKind=agent&workspaceExecutionRunId=browser_token_usage_run_001`
   - Result: Pass. DOM assertions all passed:
     - seeded run/history text visible;
     - header chip displayed `366 tok · unpriced`;
     - Usage panel displayed `INPUT 321`, `OUTPUT 45`, `TOTAL 366`;
     - input/output/total costs displayed `unpriced`;
     - price status displayed `price_missing`;
     - latest model displayed `qwen3.5-27b:lmstudio@127.0.0.1:1234`;
     - runtime displayed `autobyteus`;
     - events displayed `1`;
     - latest context pressure displayed `12.2%` and `500 / 4.096 context tokens`.
5. Header chip opens Usage tab
   - Result: Pass. After switching to Terminal, clicking the `366 tok · unpriced` header chip reopened the Usage panel and preserved the same summary values.

### Non-Final / Corrected Attempt

1. First backend startup attempt inherited pre-existing process environment variables (`AUTOBYTEUS_SERVER_HOST` / `DATABASE_URL`) because the server config gives process environment precedence over `.env`.
   - Result: Restarted after unsetting those variables and adding an explicit temp `DATABASE_URL=file:<temp-data-dir>/db/production.db`.
   - Classification: local test-environment startup correction, not product failure.

### Failed

- None attributable to the implementation.

### Not Tested / Residual Scope

| Scenario | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Browser visual diff/pixel assertions | The browser test used DOM text/state assertions plus one retained screenshot, not pixel comparison. | Delivery/product QA can do visual polish review if desired. |
| Full durable browser automation committed to the repo | Current repo does not have a Playwright/browser E2E harness for this surface; this round used a temporary real-stack browser probe as requested. | Could be added later if the team wants durable browser E2E coverage in CI. |

### Blocked

- None.

## Browser Evidence

- Screenshot artifact retained: `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png`
- Browser DOM assertion result: `allPassed=true` for loaded seeded run, header chip, Usage panel title, input/output/total tokens, unpriced costs, price status, latest model, runtime, event count, and context pressure.

## Cleanup Performed

- Closed browser tab.
- Stopped Nuxt frontend dev server with SIGINT.
- Stopped backend server with SIGINT; server closed cleanly.
- Removed temporary seed script.
- Removed temporary backend data directory and seeded workspace directory.
- Removed temporary ticket env helper file.
- Screenshot artifact was retained for evidence.

## Classification

- Result: `Pass`
- No implementation failure requiring reroute.
- No repository-resident durable browser test code was added in Round 3. However, because Round 2 already updated repository-resident durable runtime E2E coverage and the authoritative coverage reports changed again, the cumulative package still returns to `code_reviewer` before delivery.

## Recommended Recipient

- `code_reviewer`

## Latest Authoritative Result

- Result: `Pass`
- Latest authoritative round: `Round 3`
- Notes: The frontend/browser gap is now covered by a real local-stack browser test. Backend + frontend were started, seeded agent data was loaded through real backend GraphQL, and the browser UI rendered the token usage summary and unpriced semantics correctly.

---

# Historical API/E2E Execution Coverage Report — Round 2 Real Runtime E2E Correction

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 2
- Trigger: User rejected round 1 as not real E2E because Codex and Claude were skipped and AutoByteus runtime was not tested live despite configured runtimes.
- Prior Round Reviewed: Round 1 in this same report.
- Latest Authoritative Round: Round 2

## Round History

| Round | Trigger | Prior Unresolved Failures / Gaps Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review pass; API/E2E coverage requested | N/A | No implementation failures | Pass for deterministic coverage only | No | Did not invoke real AutoByteus, Codex, or Claude runtimes; this was a coverage gap for the user's E2E expectation. |
| 2 | User required real runtime E2E for AutoByteus+LM Studio qwen3.5, Codex, and Claude | Rechecked the skipped/hard-deferred real-runtime gap | No implementation failures; one over-strict test assertion corrected | Pass | Yes | Real runtime E2E now executes all three configured runtimes and verifies websocket token usage plus ledger-backed GraphQL summary/statistics. |

## Execution Basis

Round 2 supersedes the round 1 limitation that real runtime E2E was skipped/deferred. The durable runtime E2E now covers these real configured runtimes through the GraphQL create-run path and `/ws/agent/:runId` websocket:

- AutoByteus runtime using LM Studio qwen3.5-family model: `qwen3.5-27b:lmstudio@127.0.0.1:1234`.
- Codex App Server runtime using configured Codex model override: `gpt-5.4-mini`.
- Claude Agent SDK runtime using configured Claude model override: `sonnet`.

Each scenario creates a real agent definition/run, sends a real user message, waits for `AGENT_COMMAND_ACK`, waits for a runtime-emitted `TOKEN_USAGE_UPDATED`, asserts positive reported/accounting token totals and the expected runtime/ingestion kind, waits for idle, then verifies persisted `getAgentRunTokenUsageSummary` and `usageStatisticsInPeriod` GraphQL projections.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Coverage investigation updated before durable coverage edits and final execution: `Yes`
- Round 2 decision: `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` needed update from hard-skipped Codex-only coverage to environment-gated AutoByteus/Codex/Claude real runtime coverage.
- Reroute required from investigation: `No`

## Durable Coverage Updated In Round 2

- Repository-resident durable coverage added/updated/removed after code review: `Yes`
- Updated path:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
- What changed:
  - Replaced the hard `describe.skip` Codex-only runtime test with `RUN_RUNTIME_TOKEN_USAGE_E2E=1` environment-gated runtime coverage.
  - Added AutoByteus runtime coverage selecting LM Studio/qwen3.5-family model and requiring `autobyteus_llm_phase` ingestion.
  - Added Codex App Server runtime coverage requiring `codex_thread_token_usage` ingestion.
  - Added Claude Agent SDK runtime coverage requiring `claude_sdk_result` ingestion.
  - Added ledger-backed GraphQL summary/statistics assertions after each real runtime turn.
  - Added cleanup for runtime sockets/apps/temp workspaces and token ledger rows.

## Prior Failure / Gap Resolution

| Prior Round / Attempt | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- | --- |
| Round 1 | Real AutoByteus runtime token usage | Coverage Gap | Resolved | AutoByteus+LM Studio qwen3.5 real runtime case passed and persisted token usage to GraphQL. |
| Round 1 | Real Codex runtime token usage | Coverage Gap | Resolved | Codex App Server real runtime case passed and persisted token usage to GraphQL. |
| Round 1 | Real Claude runtime token usage | Coverage Gap | Resolved | Claude Agent SDK real runtime case passed and persisted token usage to GraphQL. |
| Round 2 first execution | Test asserted `latest_context_input_tokens` was non-null | Coverage-code assertion issue, not implementation failure | Resolved | All three runtimes emitted token usage; assertion was corrected to allow nullable field while requiring token totals. Final rerun passed. |

## Coverage Matrix — Round 2

| Scenario ID | Behavior / Boundary | Durable Coverage | Result |
| --- | --- | --- | --- |
| APIE2E-008 | AutoByteus runtime with LM Studio qwen3.5-family model emits token usage, pipeline enriches/persists it, GraphQL summary/statistics expose tokens/status. | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Pass |
| APIE2E-009 | Codex App Server runtime emits real per-turn token usage and persists it to ledger/GraphQL. | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Pass |
| APIE2E-010 | Claude Agent SDK terminal result usage/modelUsage emits real token usage and persists it to ledger/GraphQL. | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Pass |
| APIE2E-TEMP-004 | Server build sanity after runtime E2E coverage edit. | `pnpm -C autobyteus-server-ts run build:full` | Pass |
| APIE2E-TEMP-005 | Whitespace/diff sanity after runtime E2E coverage edit. | `git diff --check origin/personal` | Pass |

## Scenarios Checked — Round 2

### Passed

1. `RUN_RUNTIME_TOKEN_USAGE_E2E=1 RUNTIME_TOKEN_USAGE_E2E_TIMEOUT_MS=300000 LMSTUDIO_MODEL_ID='qwen3.5-27b:lmstudio@127.0.0.1:1234' CODEX_E2E_TOOL_MODEL='gpt-5.4-mini' CLAUDE_E2E_MODEL='sonnet' pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
   - Result: Pass — 1 file, 3 tests.
   - AutoByteus + LM Studio qwen3.5 case: Pass, 53.644s.
   - Codex App Server case: Pass, 4.253s.
   - Claude Agent SDK case: Pass, 4.191s.
   - Total Vitest duration: 67.25s.
2. `pnpm -C autobyteus-server-ts run build:full`
   - Result: Pass; TypeScript build and built-in agents bootstrap smoke check passed.
3. `git diff --check origin/personal`
   - Result: Pass.

### Non-Final / Corrected Attempt

1. `RUN_RUNTIME_TOKEN_USAGE_E2E=1 ... pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` before assertion correction
   - Result: 3 runtime cases reached `TOKEN_USAGE_UPDATED`, then failed only because the test expected `latest_context_input_tokens` to be non-null while the actual event payload legitimately contained `latest_context_input_tokens: null`.
   - Classification: coverage-code assertion issue.
   - Resolution: durable test now asserts event identity/ingestion and positive reported/accounting tokens, and only requires the nullable field to be present.
2. `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts --runInBand`
   - Result: command option failure before tests ran (`Unknown option --runInBand`).
   - Classification: invocation error, not test or implementation failure.

### Failed

- None attributable to the implementation after the Round 2 coverage-code assertion correction.

### Not Tested / Residual Scope

| Scenario | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Pixel-level browser visual inspection of the Usage tab/header chip | Round 2 focused on the challenged real runtime token usage E2E. Round 1 already covered store/build/guard behavior. | Product QA/delivery can still perform a visual pass if desired. |
| Broad web typecheck baseline | Existing baseline failure was already classified in round 1/code review with no relevant token usage diagnostics. | Separate cleanup work. |

### Blocked

- None.

## Cleanup Performed

- Runtime E2E closes each WebSocket and Fastify app instance.
- Runtime E2E terminates each created agent run where possible.
- Runtime E2E deletes ledger rows for created run IDs and removes temp workspace/config directories.
- `getCodexAppServerClientManager().close()` runs after each case.
- Prisma client disconnects in `afterAll`.

## Classification

- Result: `Pass`
- No implementation failure requiring reroute.
- Repository-resident durable coverage was updated after the earlier code review, so the required next recipient is `code_reviewer` for coverage-code re-review before delivery.

## Recommended Recipient

- `code_reviewer`

## Latest Authoritative Result

- Result: `Pass`
- Latest authoritative round: `Round 2`
- Notes: The previously skipped real runtime E2E gap is resolved. AutoByteus+LM Studio qwen3.5, Codex App Server, and Claude Agent SDK all passed real runtime token usage E2E with websocket event and ledger-backed GraphQL verification.

---

# Historical API/E2E Execution Coverage Report — Round 1

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Code review round 3 passed and requested API/E2E coverage for token usage transparency.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review pass; API/E2E coverage requested | N/A | No | Pass | Yes | Durable coverage was added/updated, all targeted checks/builds passed except known broad web typecheck baseline with no relevant token usage diagnostics. |

## Execution Basis

Execution covered the reviewed no-legacy token usage transparency design across runtime normalization, server event enrichment/pricing/persistence projections, GraphQL summary/statistics reads, and frontend live/reload meter state. Real external provider calls and real Codex App Server runtime E2E remain environment-owned; this round used deterministic unit/integration/non-runtime GraphQL coverage plus production builds/guards.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `Yes`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Stale Codex and pricing tests were updated in place; no implementation/design reroute was needed.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/extensions/token-usage-tracking-extension.test.ts` | Still Valid | Retained and executed | Covers new observation builder despite old filename. |
| `autobyteus-ts/tests/integration/llm/extensions/token-usage-tracking-extension.test.ts` | Still Valid | Retained and executed | Verifies `CompleteResponse` carries provider observation without legacy local tracking fields. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Needs Update | Updated and executed | Replaced old tracker pricing proof with deterministic `LLMFactory.getModelPricingInfo` trust/missing/default-zero assertions. |
| `autobyteus-server-ts/tests/unit/startup/agent-customization-loader.test.ts` | Still Valid | Retained and executed | Confirms old token usage response processor is not registered. |
| `autobyteus-server-ts/tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts` | Still Valid | Retained and executed | Covers new replacement payload/delta logic and old processor absence from startup. |
| `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | Still Valid, Needs Expansion | Expanded and executed | Content now targets `SqlTokenUsageLedgerRepository`; added raw/cache/reasoning/status round-trip coverage. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Still Valid | Retained and executed | Proves ledger store accounting and team/member summary aggregation. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Still Valid, Needs Expansion | Expanded and executed | Added partial-price-missing statistics preservation. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Still Valid but Environment-Owned/Skipped | Not used as final evidence | Real Codex runtime test remains skipped by design. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Needs Update | Updated and executed | Asserts `per_turn`/`cumulative_snapshot`, raw usage, idempotency, and model identity. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | Needs Update | Updated and executed | Asserts ready/late `TOKEN_USAGE_UPDATED` emissions; isolates pricing lookup with a test price-provider mock. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Needs Update | Updated and executed | Added Claude token usage event conversion assertion. |
| Frontend token meter store/handler | Missing | Added and executed | New `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`. |
| Old `TokenUsageTracker` utility tests under `autobyteus-ts/tests/*/llm/utils/` | Out Of Scope for authoritative accounting | Not used as final evidence | `rg` confirms no live authoritative accounting import path uses the utility; REQ-022 allows retained non-authoritative/debug utilities only. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Temporary source searches found no live references to deleted authoritative accounting paths (`TokenUsagePersistenceProcessor`, `TokenUsageTrackingExtension`, `TokenUsageStore`, `SqlTokenUsageRecordRepository`, `TokenUsageRecordRepository`, `TokenUsageRecord`) in `autobyteus-server-ts/src`, `autobyteus-ts/src`, or `autobyteus-web`.

## Execution Surfaces / Modes

- Native runtime/package unit coverage: provider usage normalizers, observation carrying, model pricing metadata.
- Server unit coverage: token cost calculator, token event enrichment transformer, Codex thread/backend token usage, Claude session/converter token usage, old startup processor de-registration.
- Server integration/E2E coverage: ledger repository/store/statistics provider and non-runtime GraphQL summary/statistics projection.
- Frontend unit coverage: token usage meter store/stream handler live/reload/idempotency behavior.
- Build/guard coverage: `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web` production/guard paths.
- Temporary search coverage: old live accounting path retention and CR-002 chart/statistics hardcoding regressions.

## Platform / Runtime Targets

- Local macOS development worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis`
- Node/pnpm workspace as configured by the repository.
- SQLite test database reset by server Vitest setup: `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`.
- Real external provider APIs and real Codex App Server runtime: not invoked in this round.

## Lifecycle / Upgrade / Restart / Migration Checks

- Server Vitest runs reset and applied all Prisma migrations including `20260624090000_add_token_usage_ledger_events` successfully.
- `pnpm -C autobyteus-server-ts run build:full` compiled the server build output and passed the built-in agents bootstrap smoke check.
- No restart/upgrade E2E with a live desktop app was performed; not required by the reviewed coverage focus.

## Coverage Matrix

| Scenario ID | Behavior / Boundary | Durable Coverage | Result |
| --- | --- | --- | --- |
| APIE2E-001 | Native provider raw/cache/reasoning preservation; no fabricated missing tokens | `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts`; existing observation tests | Pass |
| APIE2E-002 | Trusted/missing/default-zero/partial price status semantics | `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`; `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts`; statistics partial test | Pass |
| APIE2E-003 | Server token usage event enrichment, canonical context, snapshot delta, one enriched event | `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts` | Pass |
| APIE2E-004 | Codex `last` vs `total`, ready/late event emission, idempotency, cumulative snapshot metadata | `codex-thread.test.ts`; `codex-agent-run-backend.test.ts` | Pass |
| APIE2E-005 | Claude terminal result usage/modelUsage extraction and converter mapping | `claude-session-token-usage.test.ts`; `claude-session-event-converter.test.ts` | Pass |
| APIE2E-006 | Ledger-backed GraphQL summaries/statistics, nullable/missing cost status | `token-usage-ledger-graphql.e2e.test.ts`; repository/store/statistics integration tests | Pass |
| APIE2E-007 | Frontend live/reload meter display logic, idempotency, team/member aggregation, mixed/unpriced state | `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`; web guards/build | Pass |
| APIE2E-TEMP-001 | No old live accounting path or CR-002 chart/statistics hardcoding regression | Targeted `rg` commands | Pass |
| APIE2E-TEMP-002 | Integration/build sanity across changed packages | Package builds/guards | Pass |
| APIE2E-TEMP-003 | Real Codex runtime E2E | Existing skipped runtime E2E only | Not Tested / Environment-Owned |

## Test Scope

Focused durable coverage was intentionally deterministic and bounded to changed token usage surfaces. It did not perform live API calls to OpenAI/Anthropic/Gemini or launch a real Codex App Server process. Production builds/guards provide integration evidence for generated types/templates and server bootstrap.

## Execution Setup / Environment

- Working directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis`
- Branch/worktree diff target for whitespace check: `origin/personal`
- Server test database: automatically reset/applied migrations by Vitest setup.
- No manual environment mutation was required beyond repository-local test/build commands.
- Expected non-fatal warnings observed:
  - Server tests/build: Node experimental SQLite warning.
  - Web store test: KaTeX quirks-mode warning from test environment.
  - Web build: existing large chunk-size warnings.
  - Web typecheck: broad existing baseline failure outside token usage files.

## Tests Implemented Or Updated

- Added `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts`.
- Updated `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` to use deterministic `LLMFactory.getModelPricingInfo` checks without dynamic local model discovery.
- Added `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts`.
- Added `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts`.
- Updated `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`.
- Updated `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`.
- Added `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts`.
- Updated `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts`.
- Added `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`.
- Expanded `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`.
- Expanded `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`.
- Added `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None removed in this API/E2E round | N/A | N/A | Stale Codex/pricing assertions were updated in place. The stale generated JS repository test deletion was already present in the implementation state reviewed by code review. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`
- Paths removed: None in this API/E2E round.
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` — this report is being routed to `code_reviewer` before delivery.
- Post-API/E2E coverage code review artifact: Pending code reviewer re-review.

## Other Execution Artifacts

- Web typecheck log for baseline failure triage: `/tmp/autobyteus-web-nuxi-typecheck-token-usage.log`

## Temporary Execution Methods / Scaffolding

- Temporary `rg` checks only; no repository-resident temporary scaffolding was added.
- `codex-agent-run-backend.test.ts` uses a Vitest mock for the token price provider to avoid dynamic local model discovery/network in backend unit assertions. Pricing behavior itself is covered by dedicated pricing tests.

## Dependencies Mocked Or Emulated

- Provider SDK usage payloads were emulated in normalizer tests; no external provider calls were made.
- Codex thread notifications were emulated through `CodexThread.handleAppServerNotification`; no real Codex App Server was launched.
- Claude session result payloads were emulated in focused helper/converter tests; no real Claude SDK session was launched.
- Frontend streaming token events were emulated by invoking `handleTokenUsageUpdated` with payload fixtures.
- Server GraphQL E2E used direct ledger rows and schema execution over the local test database.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Round 1 only. |

## Scenarios Checked

### Passed

1. `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api/token-usage-normalizers.test.ts tests/unit/llm/supported-model-definitions.test.ts tests/unit/llm/extensions/token-usage-tracking-extension.test.ts tests/integration/llm/extensions/token-usage-tracking-extension.test.ts`
   - Result: Pass — 4 files, 8 tests.
2. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts tests/unit/token-usage/pricing/token-cost-calculator.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts tests/unit/startup/agent-customization-loader.test.ts`
   - Result: Pass — 12 files, 66 tests.
3. `pnpm -C autobyteus-web exec vitest run stores/__tests__/tokenUsageMeterStore.spec.ts`
   - Result: Pass — 1 file, 3 tests.
4. `pnpm -C autobyteus-ts run build`
   - Result: Pass; runtime dependency verification OK.
5. `pnpm -C autobyteus-server-ts run build:full`
   - Result: Pass; built-in agents bootstrap smoke check passed.
6. `pnpm -C autobyteus-web run guard:web-boundary && pnpm -C autobyteus-web run guard:localization-boundary && pnpm -C autobyteus-web run audit:localization-literals`
   - Result: Pass; localization audit reported zero unresolved findings.
7. `pnpm -C autobyteus-web run build`
   - Result: Pass; existing large chunk-size warnings only.
8. `git diff --check origin/personal`
   - Result: Pass.
9. `rg` check for old live accounting paths in `autobyteus-server-ts/src autobyteus-ts/src autobyteus-web`
   - Result: Pass; no hits for deleted authoritative accounting paths.
10. `rg` check for CR-002 chart/statistics regressions (`totalCost ?? 0`, `Cost (€)`, `label: 'Total Cost'`, hardcoded Euro text) in relevant web files
   - Result: Pass; no hits.
11. `pnpm -C autobyteus-web exec nuxi typecheck`
   - Result: Known baseline fail, not a pass; relevant diagnostic grep for `TokenUsage|tokenUsage|token_usage|BarChart|usageMeter|TokenUsageMeter` returned no matches.

### Failed

- None attributable to this implementation or coverage round.

### Not Tested / Out Of Scope

| Scenario | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Real provider API calls for OpenAI/Anthropic/Gemini/Grok/etc. | External credentials/network/runtime are outside this deterministic coverage pass. | Provider SDK schema drift remains possible; run provider smoke tests in a credentialed release environment if required. |
| Real Codex App Server E2E | Existing runtime GraphQL E2E remains skipped/environment-owned. | Real event contract drift remains possible; enable existing skipped E2E in a configured Codex runtime environment. |
| Pixel-level visual inspection of Usage tab/header chip | Store/handler and production build cover logic/template integration; no full app runtime was launched. | Delivery/product QA can perform visual pass if required. |
| Broad web typecheck baseline | Existing repository baseline fails outside token usage surfaces. | No relevant token usage diagnostics found in grep; baseline cleanup is separate work. |

### Blocked

- None.

## Cleanup Performed

- Server test runs reset the local SQLite test database via the standard Vitest setup.
- GraphQL E2E test deletes the ledger rows it appends in `afterAll` and disconnects Prisma.
- No long-running local services were started by this round.
- No temporary repository files were left behind. The typecheck log is in `/tmp` only.

## Classification

- No execution failure requiring reroute.
- Durable coverage changes were made after the initial code review; per team rule, the next recipient is `code_reviewer` for coverage-code re-review before delivery.

## Recommended Recipient

- `code_reviewer`

## Evidence / Notes

- Coverage investigation preceded final execution and coverage edits: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/api-e2e-coverage-investigation.md`.
- The broad web typecheck failure matches the known baseline pattern already identified by code review; no token usage, BarChart, token usage statistics, or usage meter diagnostics were found in the saved typecheck log.
- The old `TokenUsageTracker` utility remains outside live authoritative accounting; it was not used as final evidence for the new ledger/cost design.

## Latest Authoritative Result

- Result: `Pass`
- Notes: API/E2E executable coverage passed for the deterministic surfaces. Repository-resident durable coverage was added/updated, so the cumulative package must return through `code_reviewer` before delivery.
