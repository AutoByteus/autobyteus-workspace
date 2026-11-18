# API/E2E Execution Coverage Report — openai-gpt-6-1-terra (autobyteus-336)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md`, `API-REV-001`; progress log `api-e2e-test-progress.md`
- Round and trigger: round 1, IR-001 (direct low-risk route)
- Deviations from the plan: the probe's first run (run 1) asked the token usage summary for two fields that type does not have (`status`, `output`); run 2 repeated the same runs with the corrected query. Run 1's receipt is kept.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-gpt-6-1-terra/tickets/in-progress/openai-gpt-6-1-terra/evidence/` (files `API-*`)

## Routing Classification

- Task size `Small`, architectural risk `Low`, input route `Direct Low-Risk`, successful-output route `Delivery`, test-code review `Not Required — direct low-risk route` (no durable test code changed by API/E2E).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `fb1c738f19` (code `2d076b0ce7`) | macOS 26.5 arm64 | in-process studio server (real GraphQL and `/ws/agent/<runId>`), `autobyteus-ts` dist built by the implementation's prebuild (contains `gpt-6.1-terra`); Node 22; `codex-cli 0.166.0` | test vault; test-owned data root; real HOME/USER/LOGNAME and a throwaway `CODEX_HOME` (auth symlink, `model_reasoning_effort = "medium"`); fixtures: green `picture.png`, `recording.m4a` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..005 (repository) | catalog unit, existing rows, live call, Codex surface | Reused: IMP-01..IMP-07 | (IMP) | Pass | (IMP) | (IMP) | only ticket documents changed after `2d076b0ce7` |
| API-02 | AC-001 | server catalog as Settings reads it | temporary probe (`API-02-04-terra-probe.e2e.test.ts.txt`, deleted from the tree): `ensureProviderModelCatalog(OPENAI)`, then `providerModelCatalogSnapshots(runtimeKind: "autobyteus")` with the web's fields | ENV-1 | Pass | `API-02-04-terra-receipt.json` (`catalog`), `API-02-04-terra-server.log` | OpenAI list `gpt-5.4, gpt-5.4-mini, gpt-5.5, gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra, gpt-6-astra, gpt-6-luna, gpt-6-sol, gpt-6.1-terra`; terra `maxContextTokens 1050000`, `maxInputTokens 922000`, `maxOutputTokens 128000`; `reasoning_effort` `default "medium"`, `enum ["none","low","medium","high","xhigh","max"]` | the server lists models alphabetically, so terra is last there; AC-001's "first" is the `autobyteus-ts` catalog order (IMP-01) |
| API-03 | AC-001, AC-002 | native AutoByteus run on terra | same probe: plain agent with `read_file` on `gpt-6.1-terra`: "Reply with exactly: terra-ok"; the green image; an audio file; then `getAgentRunTokenUsageSummary(runId)` | ENV-1 | Pass | `API-02-04-terra-receipt.json` (`native`) | answers `terra-ok`, `Green` (`{"path":".../picture.png"}` → `SUCCEEDED`), `I couldn't hear it; audio input isn't supported.` (`The selected model does not support audio input…`); summary `latestModelIdentifier "gpt-6.1-terra"`, `apiCostStatus "estimated"`, `estimatedApiStandardInputCost 0.000015` (15 tokens × $1/M), `estimatedApiCacheReadInputCost 0.0005418` (10,836 × $0.05/M), `estimatedApiCacheCreationInputCost 0.0091725` (7,338 × $1.25/M), `estimatedApiOutputCost 0.00042` (84 × $5/M), `estimatedApiTotalCost 0.0101493`, `missingPriceDimensions []` | every cost component equals tokens × terra's price |
| API-04 | AC-002, AC-004 | Codex runtime run on terra | same probe: the Codex runtime catalog, then a run on `gpt-6.1-terra` (reasoning medium from `CODEX_HOME`): "Reply with exactly: codex-terra-ok"; its token usage summary | ENV-1 | Pass | `API-02-04-terra-receipt.json` (`codexCatalog`, `codex`) | Codex catalog includes `gpt-6.1-terra`; answer `codex-terra-ok`; summary `latestRuntimeKind "codex_app_server"`, `latestModelIdentifier "gpt-6.1-terra"`, `apiCostStatus "estimated"`, `estimatedApiStandardInputCost 0.008871` (8,871 × $1/M), `estimatedApiOutputCost 0.000045` (9 × $5/M), `estimatedApiTotalCost 0.008916` | one small paid turn (the optional Codex run) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | IMP-01, IMP-06 (catalog order and values; `read_file` capabilities), API-02 (server list), API-03 (image read, audio refused) | Proven |
| AC-002 | Yes | IMP-01 (both tiers), API-03 (native cost estimate), API-04 (Codex cost estimate) | Proven; the 272K tier is proven by the unit test only (a live run above 272K input tokens was not made) |
| AC-003 | Yes | TESTING.md "Live Codex model" bullet, commit `a379763339` | Proven |
| AC-004 | Yes | IMP-07 (both defaults, overrides kept; surface test 4/4 on terra), API-04 | Proven |
| AC-005 | Yes | IMP-02 (32 rows identical), IMP-03, IMP-04 | Proven |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | IMP-01..07, API-02..04 | the 272K tier only by unit test | a run above 272K input tokens (costly, not needed) |
| Changed-boundary execution directness | 85% | 96% | the server catalog, a native and a Codex run priced from the catalog | — | — |
| Cross-boundary integration realism and mock gap | 85% | 96% | real OpenAI and Codex calls through the server | — | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | test vault, throwaway `CODEX_HOME`, test-owned data root | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | audio refusal on terra; unchanged existing rows | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | the Settings list is the server catalog query the web uses (API-02); no web code changed | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | catalog unit test asserts every value and both tiers (IMP-01) | — | — |

- Overall final confidence: 95.5% (simple average of the six applicable categories); no category below 90%; every critical criterion proven.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Mode: `Live API` (the server's GraphQL and agent WebSocket, OpenAI and Codex). Browser: not needed (no web change; the list is the server catalog the web queries).

## Compatibility / Legacy Scope Check

No compatibility or legacy behaviour in scope; no model removed.

## Durable Coverage Changed In The Codebase

None by API/E2E.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| temporary probe `zz-api336-terra.e2e.test.ts` | Yes | deleted after each run; kept as evidence text | removed |
| in-process server data roots, temp HOME, throwaway `CODEX_HOME`, fixtures `/tmp/ab336` | Yes | removed | removed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Residual risks: the 272K price tier is proven by the unit test, not a live run; the server's model list is alphabetical (terra appears last in Settings), unchanged behaviour.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer`
