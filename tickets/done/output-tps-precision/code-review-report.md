# Code Review Report — output-tps-precision

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/requirements-doc.md` (R3 / SR-004, user-approved 2026-10-14)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/investigation-notes.md` (consulted for the runtime evidence rows)
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-spec.md` (D3.1)
- Supplemental Task Artifacts Reviewed As Context: the Task screenshots and the user's card screenshot (evidence only), and the implementation browser-probe evidence in `evidence/implementation/browser-probe-1791963756/`
- Relevant Solution Revision IDs: SR-005 (design D3.1); SR-004 (requirements R3)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 3. Round 1 (CRR-001): implementation review, Pass. Round 2 (CRR-002): failure-origin review, Design Impact CR-F01. Round 3 (CRR-003): implementation review of the IR-002 rework.
- Review Entry Point (round 3): `Implementation Review`. Round 2 was `API/E2E Failure-Origin Review`.
- Review Scope: round 1 `Full Review`; round 2 `N/A` (failure-origin); round 3 `Targeted Delta Review`
- Review Scope Evidence (round 3): IR-002 touches only the Codex timing owner and its callers:
  - `codex-model-call-timing.ts` (rewritten);
  - `codex-thread-event-name.ts` (+1 constant);
  - `codex-thread.ts` (two reply-boundary calls);
  - `codex-thread-notification-handler.ts` (params pass-through);
  - `codex-thread-token-usage.ts` (input renamed);
  - the Codex test;
  - the Codex rows of two docs.

  These are the files and behavior of CR-F01. No shared interface or data shape changed: `output_throughput`, the acceptance check, the shared tracker, the contracts and the web are untouched since CRR-001. A full re-audit is therefore not triggered, and the round-1 evidence for unaffected checks carries forward.
- Trigger: round 1, implementation_engineer IR-001; round 2, api_e2e_engineer Fail API-REV-001 (API-L04); round 3, implementation_engineer IR-002 (design D3.2 / SR-006, ARCH-REV-003 Pass, binding IC-2)
- Prior Review Round Reviewed: round 2 (CRR-002, CR-F01 open)
- Latest Authoritative Round: 3
- Additional upstream reviewed in round 3: `design-spec.md` D3.2 (DS-003 Codex row, Codex pairing rule), `solution-revision-record.md` SR-006, `investigation-notes.md` "SR-006 findings", `design-review-report.md` "Round 3 Summary", `architecture-review-revision-record.md` ARCH-REV-003 (IC-2), `implementation-handoff.md` / `implementation-revision-record.md` IR-002
- Relevant revision IDs (round 3): SR-006; ARCH-REV-003; IR-002; API-REV-001
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A — not applicable
- Failing Scenario IDs: API-L04 (AC-004, REQ-002/003, SCN-002)
- Exact Failing Commands / Execution Mode: live Codex (codex-cli 0.162.1, gpt-5.6-luna) in a clean env, with a stdout-stamping wrapper: `RUN_TOKEN_TPS_LIVE_E2E=1 TPS_LIVE_RUNTIMES=codex_app_server CODEX_APP_SERVER_COMMAND=<ticket>/evidence/api-e2e/probes/stdout-stamp-wrapper.mjs … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-meter-tps-live.e2e.test.ts -t API-L04`
- Failure Evidence Paths: `evidence/api-e2e/live/codex/{API-L04-codex-tool.json,codex-wire.jsonl}`, `evidence/api-e2e/live/codex-repeat/{API-L04-codex-tool.json,codex-wire.jsonl}`

## Routing Classification Review

- Task size: Large
- Architectural risk: High
- Selected route: `Implementation Review` (round 1); `API/E2E Failure-Origin Review` (round 2)
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The implementation matches the design's surfaces: about 30 production files in autobyteus-ts, the server, two contract packages and the web; the metric's authority moves to the runtimes; and a nullable field is added to the strict stream DTOs. None of the design's escalation triggers fired: nothing is persisted, accounting does not drop the field (tested), there is no new message type, and provider requests are unchanged.

## Review Scope

- Changed implementation and behavior reviewed:
  - per-call timing and method choice in all five runtime integrations;
  - the run-side acceptance check and its call from the payload builder;
  - the stream DTO field and the server projections;
  - web store, scope, card and locales, plus removal of the browser pairing estimator;
  - docs.
- Files and areas reviewed: every file in `git diff` / `git status` except the untracked build `dist/` folders. This covers 4 new and 26 modified source files, all changed tests, the tracked contract `dist/` and the three docs. I also read the unchanged native converter (`autobyteus-stream-event-converter.ts`) and `LlmPhase` around the notification calls, and replayed the recorded Codex P5 and Grok ACP fixtures to check the boundary refinements.
- Explicit exclusions: the untracked `dist/` folders (build output from `test:integration:prepare`). The live, scripted-transport and desktop validation belongs to API/E2E.
- Checks I re-ran myself:
  - server `pnpm typecheck`: exit 0;
  - the 10 new or changed server unit files: 67/67;
  - the 5 web TPS specs: 62/62;
  - autobyteus-ts `llm-call-throughput.test.ts`: 7/7.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Each qualifying model call carries its own runtime-measured TPS (`output_throughput`) on its usage event. The run-side check accepts it or sets it to null before accounting. The web shows the newest value per exact AgentRun. TPS is real-time only: no server state, persistence or reload. The card is minimal (REQ-006).
- Design-spec behavior map verified against the implementation: Yes (DS-001 to DS-004)
- Design review report and round confirmed: ARCH-REV-002, round 2, Pass. IC-1 is applied (`Math.round(duration_seconds × 1000)`). R-2, R-3 and R-4 are applied.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `TokenUsageThroughputCard.vue` shows the "TPS" title, the value with one decimal, a model line, the end-to-end qualifier only for `end_to_end`, and "—" otherwise. It keeps one `<details>` help with the method, tokens and seconds. 16 locale keys were removed and 5 added per locale. Browser-probe screenshots confirm en, and zh-CN at 320 px | — |
| BEH-002 | Confirmed | Every adapter returns `{method, output_tokens, duration_ms}` from receipt stamps on an injected clock: native `LlmCallTiming`; Claude stamps `message_delta` before `await readContextUsage()`; Codex `CodexModelCallTiming` (end-to-end, numerator `last.outputTokens`); AGY generation or rounded provider duration; ACP `ModelCallRequestBoundary`. `createTokenUsageUpdatedPayload` calls `acceptModelCallThroughput` (the only check, ≥ 20 tokens and ≥ 250 ms, integers). The estimator is removed | — |
| BEH-003 | Confirmed | Both web intakes call `throughput.record` right after the seen-key check. The Team intake rejects a mismatched `agent_run_id` first. Scope reads `getRunTps(context.state.runId)` | — |
| BEH-004 | Confirmed | The session-local `reactive` map holds no timer or decay. A null value leaves the shown reading unchanged. There is no server state. A persisted-record test shows no TPS data (`model-call-throughput.test.ts`) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002, REQ-001,002,006,007 | User | User | See the agent's generation speed | Token tab; send a message; single-call reply | Normal | adapter → payload builder → stream → intake → scope → card | Value for that call | Requirements; Task screenshot | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, REQ-001,003,005 | User | User | Watch multi-call tool turns | Running agent | Normal | Per-call boundaries in each adapter | Latest qualifying call shown; tool time excluded | Requirements; P5 and Grok fixtures | Supported Normal Scenario | Use |
| SCN-003 | BEH-002, REQ-002,003 | System | Runtime | Model call completes | Runtime stream events | Normal | DS-003 per adapter | Method per DEC-002 | Investigation; fixtures | Supported Normal Scenario | Use |
| SCN-004 | BEH-003, REQ-004 | User | User | Inspect another agent | Team/Org member or delegated-copy selection | Normal | Team and collaboration projectors → web intakes | Own reading only | Prior ticket; transport tests | Supported Normal Scenario | Use |
| SCN-005 | BEH-004, REQ-005 | User | User | Revisit later | Idle, reload, history | Normal | Session map only | Value kept while idle; "—" after reload | User decision 2026-10-14 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | Codex refinement: any non-input `item/started` (tools included) freezes the boundary; `userMessage` and `contextCompaction` do not | SCN-002/003; DS-003 principle "frozen at the call's first output notification" | A tool-only Codex call | In P5, `commandExecution` started and completed before the call's usage update (3399 ms, 4802 ms, 6368 ms). Without the freeze, `item/completed` would move the boundary to about 0 ms before usage, and the call would get no reading | Replayed P5; `codex-model-call-timing.test.ts` | Reject (as a finding) | — | The freeze refinement itself is correct. **Round 1 residual (Hold for Evidence):** whether Codex emits usage after a long tool finishes. **Round 2: the held residual is now evidenced and promoted as C-009 (see below)** |
| C-009 | Codex call end = `thread/tokenUsage/updated` (DS-003 Codex row; `CodexModelCallTiming.completeCall` called from `resolveCodexThreadTokenUsage`) puts tool execution inside a tool-calling call's end-to-end reading | SCN-002 (Supported Normal: a user watches a multi-call turn whose tool runs for seconds); REQ-002/003; AC-004 | The user asks a Codex agent to run a shell command that takes seconds (an ordinary coding-agent turn) | Live wire, two samples: `rawResponse/completed` 3,687 / 3,183 ms → tool `item/started` → tool `item/completed` 6,885 / 6,267 ms → `thread/tokenUsage/updated` 6,888 / 6,270 ms. The adapter ends the call at the usage update, so the readings are 22.0 / 25.0 tok/s; the call's real end-to-end is 59.5 / 75.8 tok/s. About 2.9 s of tool time is included, understating the reading 2.7–3×. Single-call turns and the call after the tool are correct. An approval wait would be included the same way (it comes before `item/completed`; not separately sampled) | `evidence/api-e2e/live/codex*/codex-wire.jsonl`, which I re-parsed independently; API-L04 JSON files | Promote | This ticket | Design Impact: the DS-003 Codex row's premise "call end = the call's `thread/tokenUsage/updated`" fails live for calls that end in a tool. The implementation follows the row exactly. Solution Designer revises the Codex row. Evidence for the designer: the wire carries `rawResponse/completed` at each call's end, and the server already enables `experimentalRawEvents` (`codex-thread-manager.ts:198,224`), but `CodexThreadEventName` has no constant for it today. Not prescriptive |
| C-002 | ACP refinement: `tool_call` does not freeze; a terminal `tool_call_update` moves the boundary | SCN-002/003; DS-003 ACP row | A Grok turn with tools | Recorded `prompt`, `mcp` and `permission` fixtures show `tool_call` (pending) *after* that call's `response_completed`. Freezing on it would add tool and permission time to the next call | My condensed replay of all three fixtures | Reject (as a finding) | — | Evidence-based, and it fixes a literal error in the design row. The shared ACP layer stays runtime-neutral. Solution Designer may update the DS-003 rows for C-001/C-002 at its discretion; no rework is needed |
| C-003 | `autobyteus-ts/.../stream-event-payload-token-usage.ts` changed outside the design mapping | Design DS-002 (native payload reaches the server converter) | Native usage event | `TokenUsageUpdatedData` lists fields explicitly; without the field, the native TPS would be dropped before the server converter spreads it | Code; autobyteus-ts test covers the pass-through | Reject (as a finding) | — | Necessary and minimal |
| C-004 | `autobyteus-web/README.md` § Token Meter still describes the removed estimator ("Output TPS … estimated, last-reported … needs two compatible usage reports within one turn") | REQ-007; design Removal Plan ("Docs on report-interval TPS") | Reader of the web README | Stale doc contradicts the delivered behavior | `README.md` lines 64–68 | Promote (docs) | This ticket | Docs-only and non-blocking for source review. It goes to delivery's documentation sync (see Docs-Impact Verdict) |
| C-005 | Standalone intake records TPS before the summary check, so a payload whose `run_summary_after_event` names another run would still record for `payload.run_id` | REQ-004 | None. The server builds the summary for the same run | — | Handoff Known Risks; server payload builder | Reject | — | Not reachable on a supported path. The design deliberately keeps TPS independent of the summary |
| C-006 | Collaboration adapter casts `output_throughput` without re-validating | DS-004 boundary rule | Org/collaboration event | The payload builder already accepted or nulled the value; the strict DTO validates it again at projection | Code; transport test | Reject | — | Adding validation would duplicate the single acceptance owner |
| C-007 | A null-summary payload is not added to `seenUsageKeys`, so a Team double dispatch records the same TPS twice | BEH-003 | Persistence failure plus Team route | Same run and same value; nothing visible changes | Code | Reject | — | No consequence |
| C-008 | AGY `firstTextDeltaAtMs` entries for steps that never reach DONE stay until the next turn | DS-003 AGY | Interrupted step | Cleared at every `startTurn`; bounded per turn | Code | Reject | — | No consequence |

### Round 3 candidates (IR-002 delta)

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-009 (re-check) | The Codex call now ends at `rawResponse/completed`; the reading is held pending and paired with the next model-call usage update when `last.outputTokens` matches | SCN-002; REQ-003; D3.2 Codex pairing rule | Tool-ending Codex call | `observe` → `completeCall` at raw-response receipt → `takeForModelCallUsage` in `resolveCodexThreadTokenUsage` (model-call updates only) → payload builder | Code matches every pairing-rule bullet: replace on a later end; clear at `turn/started` and `turn/completed`; mismatch gives null; no pending gives null; reading-only updates untouched. The live wire replay through the real `CodexThread` gives 112 / 1,881 ms and 173 / 2,381 ms (sample 1), and 115 / 1,517 ms and 158 / 2,259 ms (sample 2) | Resolved | — | CR-F01 resolved |
| C-001 (retired) | Freeze on any non-input `item/started` | IC-2 (ARCH-REV-003) | — | Under D3.2, a tool's `item/started` follows the previous call's end, so freezing would put tool time into the next call | `OUTPUT_ITEM_TYPES = {reasoning, agentmessage}`; tool items never freeze; every `item/completed` is a boundary | Resolved (IC-2 satisfied) | — | My CRR-001 acceptance of C-001 applied only to D3.1's call end; it is correctly superseded |
| C-010 | The durable unit test `codex-model-call-timing.test.ts` reads the live captures from `tickets/in-progress/output-tps-precision/evidence/...` | Repository ticket lifecycle: finalized tickets live under `tickets/done/` (tracked). Precedent: the same test reads P5/P6 from `tickets/done/token-meter-accuracy/probes` | Delivery finalization moves this ticket folder to `tickets/done/` | After the move, the path no longer exists and the full server unit suite fails (ENOENT) | `git ls-files tickets` (tracked); `ls tickets/done`; test line 18 | Promote | This ticket | **Non-blocking for API/E2E** (the path is valid until finalization). Required action at delivery finalization, in the same change that moves the folder: either repoint the path to `tickets/done/output-tps-precision/...`, or copy the two wire captures (92 KB + 188 KB) into `autobyteus-server-ts/tests/fixtures/` and read them from there. Then re-run the test |
| C-011 | A Codex call with no reasoning or agentMessage item never freezes. If Codex started and completed a tool *before* that call's `rawResponse/completed`, the tool's `item/completed` would move the boundary into the call | SCN-002 | None evidenced. In both live samples the tool's `item/started` follows `rawResponse/completed` by 200–300 ms, and every sampled call emits a reasoning item | — | Live wires | Hold for Evidence | — | No finding or machinery. API/E2E may note it if a live trace ever shows a tool starting before the response completes |
| C-012 | `handleAppServerRequest(...).then(markRequestReplyBoundary)` also fires when a request is only recorded as pending (no reply yet); the real reply marks again in `approveToolAtProvider` | D3.2 "server's reply to an approval request" | User approval of a Codex tool | Both marks happen between calls (the boundary is unfrozen after `completeCall`); the later reply mark and the tool's `item/completed` both supersede it | Code | Reject | — | No wrong reading: the last boundary before the next call's output wins |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Ownership moved: adapters own measurement and method; one central acceptance check; the estimator is removed | — |
| Matches behavior-defining supplemental artifacts | Pass | REQ-006 content set; screenshots | — |
| Data-flow spine inventory preserved | Pass | DS-001 to DS-004 match the code path exactly | — |
| Ownership boundary preservation | Pass | Accounting never reads the field. The web computes no method or threshold. AGY reads `MIN_TPS_DURATION_MS` only for its own window choice (allowed by the design) | — |
| Off-spine concern clarity | Pass | `ModelCallRequestBoundary` serves Codex and ACP; `CodexModelCallTiming` serves `CodexThread` | — |
| Existing capability reuse | Pass | The usage event and streams carry the field; no new channel | — |
| Reusable owned structures | Pass | Shared boundary tracker; one `ModelCallThroughput` type imported by adapters and projections | — |
| Shared-structure tightness | Pass | Three fields; no timestamps or `tokens_per_second` carried | — |
| Repeated coordination ownership | Pass | The freeze rule lives in one tracker; validity in one check | — |
| Empty indirection | Pass | `CodexModelCallTiming` owns Codex-specific item rules and the clock, so it is not pass-through | — |
| SoC and file responsibility | Pass | Timing code sits in each runtime's own owner file or a sibling file | — |
| Ownership-driven dependencies | Pass | backends → domain/shared only; the domain check imports nothing from adapters; autobyteus-ts keeps its own copy (R-4 test) | — |
| Authoritative Boundary Rule | Pass | The card depends only on scope; scope only on `getRunTps`; no bypass | — |
| File placement | Pass | `agent-execution/domain`, `backends/shared`, `codex/thread`, `agent/loop` | — |
| Flat-vs-over-split layout | Pass | Four small new files, each with a concrete owner | — |
| Interface boundary clarity | Pass | `acceptModelCallThroughput({reportsModelCall, value})`; `getRunTps(runId)` | — |
| Naming | Pass | Names are natural; the kept web file names are justified by the design | — |
| No unjustified duplication | Pass | The native type and threshold copy is justified by the package boundary and guarded by the R-4 test | — |
| Patch-on-patch complexity | Pass | Clean replacement of the estimator | — |
| Dead code removed in touched files | Pass | Estimator, state types, 16 keys, `advanced` local and `AgentStatus` import removed. A grep finds no remaining source references | — |
| Test scenarios and assertions are clear and requirement-aligned | Pass | Recorded Codex P5/P6 and Grok fixtures replayed with an injected clock; IC-1 fractional case; persistence round-trip; AC-006 sequence | — |
| Test fixtures/helpers are reusable and coherent | Pass | `acp-fake-agent-harness` gains `now`; the probe replay helper is local to its test | — |
| No stale, duplicated or compatibility-only tests | Pass | Estimator tests removed; the probe and fixture page were rewritten (R-2) | — |
| API/E2E readiness | Pass | Scripted AGY CLI and transport e2e updated; the handoff gives exact commands | — |

## Source File Size And Structure Audit

Every changed source file is under 500 effective lines, and no change exceeds a 220-line delta. The largest files are `codex-thread.ts` (424 → 428), `tokenUsageMeterStore.ts` (465 → 459), `TokenUsageMeterPanel.vue` (449 → 449) and `llm-phase.ts` (422 → 427). The largest delta is the `tokenUsageThroughput.ts` rewrite (110 → 25 lines, 124 changed). The new files have 34–57 lines each. Result: Pass; no action.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No dual web types; estimator removed |
| No legacy old-behavior retention | Pass | No pairing fallback |
| Dead code removed in touched files | Pass | See above |
| Persisted-data decision followed (Not Affected) | Pass | The run record codec stores no TPS (tested). `legacy-token-usage-row.ts` only sets `output_throughput: null` to satisfy the payload type; no historical-schema logic |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None in source. The stale README paragraph is a docs item (C-004).

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: TPS method and meaning changed. The three docs in the design mapping were rewritten and match DEC-002 and the code: `token_meter.md` (per-runtime method table), `agent_execution_architecture.md` and server `token_usage.md` (relative links checked).
- Remaining item for delivery's documentation sync (C-004, non-blocking): `autobyteus-web/README.md` lines 64–68 still say "Output TPS … an estimated, last-reported output rate with runtime/model and timestamp. It needs two compatible usage reports within one turn, includes intervening tools/waits…". The link text says "Output TPS: method, states and runtime limits". Rewrite it to the per-call TPS meaning and link title.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 | Confirmed | The P6 replay shows that compaction updates carry no TPS and do not end a call (`codex-model-call-timing.test.ts`) |
| P-002 | Confirmed | — |
| P-003 | Confirmed | — |

No new or reclassified premises. The Codex long-tool ordering (C-001 residual) is held for RSK-002 evidence and drives no finding.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-002 is implemented exactly: adapter → builder check → untouched accounting → streams → intake after the seen-key check | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Method in adapters, validity in one check, display in the web; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | One three-field shape end to end; explicit `reportsModelCall` input; `getRunTps(runId)` | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Small owned files; `codex-thread.ts` was not grown beyond +4 lines | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | No raw timestamps or derived rate carried; one type reused | The native type copy is necessary and guarded | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear comments state each method's premise | `tokenUsageThroughput.ts` / `TokenUsageThroughputCard` keep old names (design choice to avoid churn) | — |
| 7 | API/E2E Readiness | 9.5 | Injected clocks, recorded fixtures, scripted AGY CLI and probe updated; exact commands handed off | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 (round 3; round 2 was blocked by C-009, now resolved) | Round 1: DEC-002 per runtime is implemented. Both boundary refinements are evidence-backed. IC-1 is applied | Round 3: the Codex call now ends at `rawResponse/completed`, which excludes tool and approval time (CR-F01 resolved, replayed on both live wires). Remaining drag is all held or documented: C-011 is held; with no raw events, Codex gives no reading (by design); readings for tool-ending calls appear only when the usage update is published (documented) | Re-run live API-L04 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean-cut estimator removal; no dual types | — | — |
| 10 | Cleanup Completeness | 9.0 | Source, tests, keys and three docs are clean | The README paragraph is stale (C-004, delivery docs sync) | Fix at delivery docs sync |

## Findings

Round 1 had no blocking findings. C-004 is a non-blocking docs item for delivery's documentation sync.

### CR-F01 — Codex end-to-end reading includes tool execution time (round 2, Design Impact)

- Candidate: C-009 (Promote). Scenario: SCN-002. Requirements: REQ-002, REQ-003; AC-004.
- Failure origin: **Design Impact** (an inadequate reviewed design premise). The DS-003 Codex row sets the call end at the call's `thread/tokenUsage/updated`, and the implementation does exactly that (`codex-model-call-timing.ts` `completeCall`, called from `codex-thread-token-usage.ts`). For a call that ends in a tool call, live codex-cli 0.162.1 emits that usage update only after the tool's `item/completed`. The reading therefore spans the tool's execution, against SCN-002 ("tool time never included") and REQ-003 (end-to-end = request → end of the call).
- Not an implementation defect: the code matches the reviewed design. Not an invalid test: API-L04 encodes the approved SCN-002 outcome with a bound that does not depend on which event ends the call, and that bound would accept the true durations.
- Review gap assessment: not reasonably detectable in source review. The recorded P5 (codex-cli 0.161.0) tools completed in about 1 ms, so source and fixtures could not establish the ordering. Round 1 explicitly held this premise for RSK-002 live evidence (C-001 residual) and asked API/E2E to sample it, which it did.
- Requirements note for Solution Designer: REQ-003 and SCN-002 already define the intended behavior; no change in intended behavior is needed. AC-004's wording "Codex: end-to-end from the call's request boundary to its usage update" encodes the failed premise and should be aligned with REQ-003 when the design is revised.
- Also cover: approval waits (same position, before `item/completed`), and how the next call's request boundary opens if the call end moves earlier than the usage update. The counts still come from the usage update.
- Other runtimes are unaffected per API/E2E live evidence: Claude `message_delta`, the native final chunk, AGY step DONE and Grok `response_completed` all precede tool execution.
- **Round 3 status: Resolved** by D3.2 / IR-002 (see C-009 re-check). The unit replay of both live wires gives the true durations, and IC-2 is satisfied. API-L04 live rerun pending.

### C-010 — Durable Codex test reads an in-progress ticket path (round 3, non-blocking, delivery finalization action)

`autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-model-call-timing.test.ts:18` reads `tickets/in-progress/output-tps-precision/evidence/api-e2e/live/{codex,codex-repeat}/codex-wire.jsonl`. When delivery moves the ticket to `tickets/done/`, the test will fail.

Required action, at finalization, in the same change as the move:
- either repoint the path to `tickets/done/output-tps-precision/...`, following the P5/P6 precedent;
- or copy the two captures into `autobyteus-server-ts/tests/fixtures/` and read them from there.

Then re-run the test. It does not block API/E2E.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

- Sent to: `None`

## Classification

- Round 1: N/A (Pass).
- Round 2: `Design Impact` (CR-F01).
- Round 3: N/A (Pass).

## Recommended Recipient

- Round 1: `/software_engineering_team/api_e2e_engineer`, with an informational notice to the implementation engineer.
- Round 2: `/software_engineering_team/solution_designer`. Then reimplementation, source review and an API/E2E rerun.
- Round 3: `/software_engineering_team/api_e2e_engineer` (rerun of API-L04 and the planned additions), with an informational notice to the implementation engineer.

## Residual Risks

- **RSK-002 (Codex):**
  - CR-F01 is resolved in code; it is pending the API-L04 live rerun.
  - A Codex CLI without raw events gives no Codex readings (by design, no fallback).
  - A tool-ending reading shows only when its usage update is published, after the tool (documented).
  - C-011 is held.
- **Approval wait:** handled as a boundary in code and covered by a unit test; not yet sampled live.
- **C-010:** the test path must be fixed at ticket finalization.
- **RSK-005:** resolved by API/E2E. AGY thinking is inside output. AGY cadence is fine (151 deltas, median gap 26 ms).
- **Grok:** setup phases after the first `session/prompt` count toward the first call (documented).
- **Native:** hidden reasoning without a reported count reads high (documented).
- **Docs:** C-004, the stale README paragraph.

## Latest Authoritative Result

- Review Decision: **Pass** (round 3, targeted delta review of IR-002)
- Review Entry Point: Implementation Review
- Supported Product Scenario Gate: Pass
- Material-Premise Gate: Pass (P-004 from ARCH-REV-003 is confirmed by the P6 pairing test; C-011 is held; C-012 is rejected)
- Score Summary: 9.4/10. Every category is at least 9.0; category 8 is restored to 9.0.
- Failure Origin: N/A. The round-2 Design Impact CR-F01 is resolved by D3.2 / IR-002.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - Re-run checks:
    - server typecheck: exit 0;
    - Codex unit directory plus the fold and acceptance tests: 22 files, 318/318;
    - no leftover references to `completeModelCall` or `NON_OUTPUT_ITEM_TYPES`.
  - Effective line counts: `codex-thread.ts` 429 and `codex-model-call-timing.ts` 73, both under the limits.
  - C-001 is retired per IC-2.
  - Non-blocking items for delivery: C-004 (README) and C-010 (test path at ticket finalization).
