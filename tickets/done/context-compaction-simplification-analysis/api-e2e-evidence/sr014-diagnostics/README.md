# SR-014 diagnostic clarification packet — API/E2E owner

**Evidence-only return to ongoing Solution Designer investigation. Not a new completed acceptance/validation round. API-REV-002 Fail82.9% and API-F005/API-F004 Open remain unchanged.** Dates:2026-09-26 UTC / finishing2026-09-27 Europe/Berlin.

## Findings

1. Executed exactly **four direct diagnostic generations A,B,B,A**, with the frozen failed-sample previous summary/correction, no newly generated first summary. All four accepted bodies invent completion of requested APPROVAL-73 plan work. Both temperature0 observations fail that same fidelity obligation. Other required constraints/corrections/references/approval/unrun/active-work facts are retained. See `semantic-adjudication.md`, `direct-comparison.json`, and all four D*.jsonl files. Four mechanical test completions are not semantic Pass.
2. Final outgoing SDK JSON actually captured: A temperature0.7; B0; generation cap8192 and the same model/messages in all four. No other serialized field differs; four fresh invocation IDs, each complete/stop/input1203. No retry/substitute call. Discovery matches Qwen qwen3_5_moe,4bit,262144 context/loaded instance. Remote sampling defaults/template/thinking configuration/backend version and original historical failed wire remain unknown. Temperature0 did not eliminate this error here; **no general causal remedy, support restriction, deterministic or reliability claim**.
3. Executed exactly **one full-flow observation**, original fixture/assertions, parent0/1024, compactor null/null→0.7/8192. Registered file reports2Pass:4turns,4tools,1summary;8parent+1compactor actual requests. Wire finish reasons and full synthetic requests/responses retained. This is additional scoped positive evidence, **not original API-F004 closure**.
4. **Full-flow environment deviation:** temporary observation Vitest config omitted normal Prisma setup/global setup. Worker logs `TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED`; absent in the retained prior positive log. Generation settings and assertions match, but full environment equivalence/SQL token-usage persistence is NOT established. No substitute attempt was run. Do not call this a fully equivalent original-environment reproduction.
5. **Capture limitation:** Vitest interleaved headers/progress into the large all-exit stdout JSON. Five exact fragments concatenate to a valid observation (8parent requests/responses,1summary request/response, events, stage passed/error null). Original log untouched; `extract-full-observation.py`, fragment/hash audit and reconstructed JSON distinguish reconstruction from pristine capture. `full-wire.jsonl` was independently appended directly and does not require reconstruction. No historical failed error is inferred. Test support captures provider-bearing backend/post/wait/assertion exits before termination/deletion/generic wrapping; no claim to exercise every pre-generation setup failure or real cleanup failure.

## Bounds, prerequisites and execution

`manifest.json` was persisted before edits/generation, defines max4 A/B/B/A and max1 full flow, hashes authority/frozen input, and retains API-REV-002's previous durable-file audit. Source/approved prompt/default/support unchanged. Test-owned settings alone changed; null/null restored before full flow, then owned storage removed.

Working directory for commands below:
`/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`

- Followed server AGENTS.md/README and repository test-runtime-bootstrap explicit isolated target path. Existing successful API-B01 built source unchanged; no new build/fullsuite/typecheck/browser run claimed.
- No-provider instrumentation command: `pnpm -C autobyteus-server-ts exec vitest run --config ../tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/sr014-diagnostics/vitest-instrumentation.config.ts --no-watch` → final **2files7Pass**. Initial4 checks passed before generation; extended actual SDK fetch check5Pass before first generation; incremental SSE/partial-disconnect checks7Pass before full flow. Forced post failure observed before terminate/delete, original error rethrown, arbitrary error text/headers/raw reasoning excluded. Counter rejects substitute direct requests.
- Probe-author errors retained: temporary package imports failed before any tests/provider generation; fake SDK response lacked JSON content-type; immediately errored stream discarded its queued content before observation. Corrected temporary probe fixtures and reran no-provider checks. A premature ledger5Pass checkpoint is explicitly corrected; the eventual verified result is separate. No live sample slot was consumed by the import-only failure or replaced by another generation.
- Owned server: `node .../sr014-diagnostics/owned-server.mjs`, normal built-server repository bootstrap with unique runtime/db and loopback57025; no private vault copied, empty test vault, local model only. PID64555; now stopped/removed.
- Direct: `node .../sr014-diagnostics/run-diagnostic.mjs` → underlying server-root Vitest command/config and sanitized environment in `direct-execution.json`. `direct.log`/result and four per-sample JSONL retain every output/error (no provider errors in completed four).
- Full: `node .../sr014-diagnostics/run-diagnostic.mjs --full` → actual registered provider-capabilities test file with temporary observation setup. `full-execution.json`, `vitest-full.config.ts`, `full.log`, `full-wire.jsonl`, `full-comparison.json` record exact execution and environment deviation. No additional full-flow attempt.
- Owner regression: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/secret-management/live-e2e-compaction-boundary.test.ts tests/unit/secret-management/live-e2e-compaction-observation.test.ts --no-watch` → **3files26Pass**, previous24 plus2 new observation tests. Not a full validation rerun.

Generator bounds are exhausted. Do not rerun diagnostics without a new bounded investigation decision. Runner per-experiment files use exclusive creation, not silent overwrite. The output parser/reconstruction is deterministic offline evidence processing, not another model call.

## Owner changes and audit

Three diagnostic owner paths; no production source/approved prompt/model support change:

- Updated `test-support/live-e2e/live-e2e-harness.ts`: stage/error plus sanitized synthetic request/response/role-tool event observation from finally before cleanup/outer wrapping. Existing fixture/request controls/assertions remain unchanged. Full captures can be consumed through existing evidenceObserver; stdout is not guaranteed a pristine large JSON record.
- Added `test-support/live-e2e/live-e2e-safe-error.ts`: fixed category/code/condition allow-lists, bounded causes; never arbitrary exception message/stack/headers.
- Added `autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-observation.test.ts`: no-provider post-error preservation/cleanup order and safe-error redaction.

Six other API-REV-002 durable paths match prior hashes. Two new paths make **nine cumulative API-owned durable paths**, not seven newly reviewed files. Original API-REV-002 audit/patch/samples remain historical and unchanged; current hashes/authority pins in `final-audit.json`, cumulative harness HEAD diff in `cumulative-harness-diff.patch`. Proportional successful-test review still required on eventual validation success; this packet does not claim that review.

Temporary diagnostic tests/configs/observers/live launcher/extractor stay in this evidence directory; not registered production/default behavior or an evaluation framework. No criterion relaxed; no runtime semantic repair/validator. Narrow alarm unchanged; full-body manual adjudication catches Current-state false completion outside that alarm's narrow examples.

## Cleanup and state

`owned-server-cleanup.json` + `final-audit.json`: server stopped; port57025 closed; runtime/database/root key/WAL/SHM and full-flow temporary directory absent. No browser started. Shared LMStudio not stopped/reconfigured/unloaded; model was already loaded on discovery, natural provider TTL remains. User desktop PID46779 untouched/running. No secrets/headers/raw reasoning/private history collected; only synthetic generation contents and reasoning token counts. Worktree HEADc948605 unchanged; no production delta, commit/push/merge/release, external WIP or untracked SDK cleanup. Eventual origin/personal finalization remains Delivery-owned.

Cumulative SR-012 approval→SR-013 design→ARCH-REV-001→IR-001/002→CRR-001/002/003/004→API-REV-001/002 remains active. Large/High unchanged; sourcePass9.40 unchanged; ProductN/A—not requested; DRN/A. Current record is diagnostic clarification to SR-014, not API-REV-003 or a Delivery request. Solution Designer owns remedy investigation and any explicit approval for changed intended behavior.

## Coordination routing

After evidence persistence, get_handoff_rules re-fetched. No new validation Pass/Fail, pre-execution upstream gap, or Delivery result is being issued; the existing failure-origin route already reached Solution Designer via CRR-004. No new formal rule-based handoff applies to this bounded diagnostic reply. Return facts to the **existing /solution_designer** execution by ordinary send_message_to as requested. Do not duplicate a Code Reviewer failure handoff, infer approval or rescore. Ordinary diagnostic reply confirmed **accepted=true / DELIVERED** to /solution_designer, exact run **solution_designer_e86db51ce2a24b15abe56a98c9c8114f**; coordination-receipt.json retained. No other recipient notified.
