# Implementation Handoff — token-meter-accuracy

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy`, branch `codex/token-meter-accuracy`, base `origin/personal` @ `927796780`, finalization target `origin/personal`. Implementation commits: `9e8e5bf26` (feature), `a5d8d2d31` (guardrail refactor and fixture updates), `f78921e5f` (IR-002, CR-F-001), `5b48c2b47` (IR-003, D-11), plus handoff commits. Delivery merged `origin/personal` @ `beb6b3b49` into the branch (`168900db7`). IR-003 is implemented and validated on top of that merge.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large/High). ARCH-REV-003 **Pass**. The reviewer forwarded the package to the implementation engineer.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/requirements-doc.md` (Approved, SR-003 basis)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/solution-revision-record.md` (SR-001–SR-005)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-spec.md` (SR-005, D-1–D-10)
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/probes/` (P1–P8, plus the new `P9-agy-resume.jsonl` for RR-2), `solution-handoff.md`, user screenshots `user-16-running-member-zero.png` and `user-17-latest-prompt-97.png`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/architecture-review-revision-record.md` (ARCH-REV-001–003)
- Triggering rework report, revision record, or evidence: IR-002: `code-review-report.md` (CRR-001, CR-F-001). IR-003: delivery blocker DR-002 (`release-deployment-report.md`, `delivery-revision-record.md`), SR-008 / D-11, ARCH-REV-004 Pass (`design-review-report.md`).

## Current Implementation Summary

Every runtime adapter now reports one model call per observation, with the runtime's own per-call usage and context reading. The observation contract states this through two explicit facts: `reports_model_call` and the context reading, which now includes `context_compaction_threshold_tokens`. The fold applies the three D-4 rules and bumps `revision` on every save (D-9).

Claude Agent SDK:

- Usage is recorded live per main-loop call: `message_delta` usage plus the SDK's own `getContextUsage` reading.
- The emission is awaited so it always precedes the turn's `result` (D-10).
- The turn-end result contributes only the clamped `modelUsage` remainder, which covers SDK compaction calls.

Other runtimes and the meter:

- **Antigravity** records per-step usage with base-excludes-cache semantics.
- **Codex** uses `last.totalTokens` and stores its post-compaction reading.
- **Grok** reports a latest prompt.
- **Native** reports its compaction threshold.
- **Web store** orders summaries by `revision`.
- **Meter** shows the threshold marker and label, and marks a genuine over-window reading.
- **Pre-fix Claude readings** are cleared by one Prisma migration.

- Implementation cycle: `Rework` (IR-006 makes the D-13 mark a boolean cleared only by a live model-call event, per SR-014; IR-005 count rule, superseded; IR-004 D-12 and D-13; IR-003 D-11, withdrawn; IR-002 Local Fix for CR-F-001; IR-001 initial baseline)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-revision-record.md`
- Current implementation revision ID: `IR-006`
- Related solution revision IDs: `SR-014` (cumulative SR-001–SR-014)
- Related architecture-review revision IDs: `ARCH-REV-009` (cumulative ARCH-REV-001–009)
- Related code-review revision IDs: `CRR-001`, `CRR-002`, `CRR-004`, `CRR-005`, `CRR-006`, `CRR-007`
- Related API/E2E revision IDs: `API-REV-002` (Fail: F-API-002-01 / DESK-004d)
- Related delivery revision IDs: `DR-002`
- Triggering finding IDs: `CR-F-001` (IR-002); DR-002 (IR-003, superseded); D-11 withdrawal and REQ-012 (IR-004); F-API-002-01 / DESK-004d via CRR-006 (IR-005); CRR-007 CR-F-002 (IR-006)

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: about 50 production files across 6 packages (server, core, web, two contract packages, docs). The change touches the shared observation contract, accounting semantics (live per-call plus remainder), a persisted-schema addition with a data update, and the Claude SDK option that changes the frame mix.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High)
- New design impact or escalation trigger: `None`. The three escalation triggers were checked:
  - **Per-call sums vs `modelUsage` deltas:** P2 and P4 reconcile exactly, with a zero remainder. P3's only remainders are the SDK compaction calls; all are non-negative, and turn 3's input of 45,481 is the summariser.
  - **Visible chat output with partial messages:** unchanged. The R-001 test projects identical text with and without stream events, because stream events never reach the turn tracker.
  - **Other readers of the cleared Claude readings:** none. `latest_prompt_tokens`, window and percent are read only by the run aggregate, GraphQL, live DTOs and the meter.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Claude latest prompt, window and threshold from the SDK reading after each call | `claude-sdk-client.ts` (`includePartialMessages`); `claude-sdk-streaming-session.ts` `readContextUsage()` (summary detail, 2 s timeout, threshold only when `isAutoCompactEnabled`); `claude-call-usage-tracker.ts`; `claude-session.ts` `handleFrame` routing; result observation carries no reading (`claude-session-token-usage.ts`) | P4: readings 6,546 / 6,784 / 6,936 / 7,088 per call; the result keeps the last call's reading; P2: threshold 967,000 of 1,000,000 |
| BEH-002 | Per-call contribution plus turn-end remainder, no double count | Tracker emits `claude_sdk_call` (key `claude_sdk_call:<session>:<message.id>`); fold `claude_sdk_call` branch → `recordClaudeSdkCall` (live sums) plus generic additive pricing; `reconcileClaudeSdkResult` remainder `max(0, delta − live)`, restart admits 0 (`claude_sdk_series_restart_rebaselined`), clamp flag `claude_sdk_live_exceeds_cumulative`; awaited emission (D-10) | P4 totals equal `modelUsage` with 4 calls and remainder 0; P3 remainder = compaction summariser; the session test with a 10 ms delayed read orders 4 calls before the result (a mutation to fire-and-forget fails it) |
| BEH-003 | AGY per-step usage, gross = input + cache read, latest prompt shown | `agy-stream-event-converter.ts` `agentResponse` → `callUsage` (`agy_step`, `per_call`, `base_excludes_cache`, key `agy_step:<conversation>:<step_index>`); `result` usage mapping and `agy_provider_reported_cumulative_usage` removed | P8b step: prompt 171,566 (81,507 + 90,059); RR-2 verified (P9) |
| BEH-004 | Codex context = `last.totalTokens`; compaction reading stored | `codex-thread-token-usage.ts` (latest prompt, `reports_model_call`, identity includes `last.totalTokens`); `codex-agent-run-backend.ts`; fold non-advancing update with a reading saves a reading-only record | P6: 68,630 stored, call count unchanged, revision +1 |
| BEH-005 | Native unchanged plus threshold | `autobyteus-ts` `llm-phase.ts` / `notifiers.ts` / `stream-event-payload-token-usage.ts`; `autobyteus-stream-event-converter.ts` sets `reports_model_call: true` | Enabled compaction reports 123,148; disabled reports null |
| BEH-006 | Grok latest prompt | `grok-build-call-usage.ts` (input + cache read + cache write; `reports_model_call: true`) | 120 + 2,000 + 40 = 2,160 |
| BEH-007 | Attribution preserved; live within one call for every run kind | Strict contract schemas plus team and collaboration projectors carry `revision`, threshold and `reports_model_call`; GraphQL fields; web guards on `revision`; team partial aggregate counts only model calls | Standalone, team-member and collaboration paths parse through the strict schemas (contract and transport tests) |
| BEH-008 | Only genuine overflow above 100 %, marked | Claude counting artefact removed at the source; Prisma migration clears pre-fix Claude readings; aggregate's Claude read-time derivation removed; panel over-window mark with clamped amber bar | P3 failed compaction shows 94.6 % with the threshold at 67,000; P7 Codex 100.3 % is marked |

| BEH-005 (D-12, AC-011) | A native compaction summary call counts as a model call with its tokens and cost; it carries no reading, so the previous prompt, percent, window and threshold stay until the agent's next call (D-4 unchanged). IR-003's D-11 reset is reverted | `autobyteus-stream-event-converter.ts` keeps `reports_model_call: true` only; no reset field anywhere (`git grep context_reading_reset` outside tickets is empty) | Upstream compaction test adapted: 2 calls, totals and cost as upstream, reading kept (911,000 / 91.1 %, window, threshold), revision +1, the next call replaces the reading; converter test: compaction usage is a model call |
| REQ-012 (D-13, AC-012) | After a completed compaction on native or Claude SDK, the meter keeps the previous reading muted with "Compacted — updates on the next model call" until the run's next live model call. No note for Codex or AGY, after failed or stopped compactions, or after a reload | `stores/tokenUsageCompactionMarks.ts` holds a per-run boolean mark with no baseline (IR-006, SR-014). `tokenUsageMeterStore` exposes `markCompactionCompleted` / `isAwaitingPostCompactionReading` and clears through `clearOnLiveModelCall` after the `seenUsageKeys` dedupe in both live entry points, `applyTokenUsageUpdated` and `applyTeamTokenUsage`, only when the event's own `reports_model_call` is true. `agentStatusHandler.ts` `handleCompactionStatus` marks on a newly completed operation. `TokenUsageMeterPanel.vue` mutes percent, bar and tokens and shows the note for `autobyteus`/`claude_agent_sdk`, keyed by the card's run (the host for a standalone roll-up). `shell.tokenUsage.compactedAwaitingReading` (en, zh-CN) | Handler: completed marks; failed and stopped never; a repeated completion of the same operation doesn't re-mark; a new operation does. Store: a mark made with no exact summary loaded (reopened standalone) survives a remainder event (`false`) and fetched summaries, and the next live `true` event clears it on the agent path and on the team path (idempotent with a replay and with both entry points); a child's live call doesn't clear the host mark. Panel: the note survives a remainder event, a fetched summary and a child's call, and the host's next live call clears it; none for Codex or AGY |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Pricing catalog values and `TokenCostCalculator` are untouched (REQ-011). Docs edits are limited to the fold/adapter/frontend-contract sections of `token_usage.md`.

## Key Files Or Areas

- Shared contracts (built `dist` committed): `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts`, `autobyteus-agent-presentation-contracts/src/token-usage-presentation-dto.ts`, `.../agent-presentation-message-dtos.ts`, with their tests.
- Payload contract: `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`, `claude-sdk-usage.ts`.
- Fold and projections: `src/token-usage/projections/{token-usage-run-fold,token-usage-run-record-state,claude-sdk-model-usage-reconciler,token-usage-analytics-contribution,token-usage-run-aggregate}.ts`, `services/token-usage-run-accumulator.ts`.
- Persistence: `prisma/schema.prisma`, `prisma/migrations/20261009120000_token_meter_context_readings/migration.sql`, `domain/token-usage-run-record.ts`, `repositories/sql/token-usage-run-record-codec.ts`, `startup/token-usage-current-schema-readiness.ts`.
- Claude: `runtime-management/claude/client/{claude-sdk-client,claude-sdk-streaming-session}.ts`, new `backends/claude/session/claude-call-usage-tracker.ts`, `claude-session.ts`, `claude-session-token-usage.ts`, new `claude-session-query-options.ts` (pure move out of `ClaudeSession` for the size guardrail).
- Adapters: AGY converter, Codex resolver and backend, Grok builder, native bridge; core `autobyteus-ts` LlmPhase/notifier/payload.
- Live DTOs and GraphQL: team websocket projector, collaboration presentation event/adapter/projector, `team-agent-event.ts`, `api/graphql/types/token-usage-stats.ts`.
- Legacy app-data migration payload builder: `token-usage-run-records-v1/legacy-token-usage-row.ts` sets `reports_model_call: true` (every ledger row was one counted report) so its count validation holds.
- Web: `stores/tokenUsageMeterStore.ts`, `types/tokenUsageMeter.ts`, `services/agentStreaming/tokenUsageRunSummaryMapper.ts`, `graphql/queries/token_usage_meter_queries.ts`, `generated/graphql.ts` (token-usage hunks only), `components/workspace/usage/TokenUsageMeterPanel.vue`, `localization/messages/{en,zh-CN}/shell.ts`.
- Docs: `autobyteus-server-ts/docs/modules/token_usage.md`.
- Test fixtures from probes: `autobyteus-server-ts/tests/fixtures/claude-sdk-usage/claude-sdk-probe-frames.ts` (P2/P3/P4).

## Important Assumptions

- ASM-001 / RR-5: SDK 0.3.280 frame shapes (`stream_event.event.message_start.message.{id,model,usage.cache_creation}`, `message_delta.usage`) match the SDK typings (`SDKPartialAssistantMessage`). The probes logged summaries of these frames, so the fixtures rebuild the real shape.
- Main-loop Claude calls use the agent's selected model (subagent tools are disallowed), so live sums are kept per session, not per model.
- P2's mid-turn readings in the fixture follow the rule P4 measured (reading = that call's prompt). P2 itself read the context only after `result`, at 5,659, which matches.

## Known Risks

- D-12: during and after a native compaction the meter shows the pre-compaction reading until the agent's next call (by design; AC-011). D-13 marks it as pre-compaction on native and Claude SDK while the session is live.
- D-13 RR-7 (accepted): a counted Claude call whose context read timed out still clears the note while the value is pre-compaction. Events without a model call never clear it.
- D-13 live-event rule: a live model-call event that carries no `run_summary_after_event` (persistence unavailable) is ignored before the dedupe point, so it does not clear the note. The value it would have carried never reached the meter.
- D-13 is a live-session hint. After an app reload before the next call, no note is shown and the stored pre-compaction value stays.
- While the note is shown, the over-window mark is hidden: it would describe the stale pre-compaction value.

- RR-1 (accepted): per-call Claude pricing uses the API response model's exact Anthropic catalog identity. Checked: Opus 5.5, Sonnet 5 and Fable 5.1 resolve to trusted prices. Haiku 4.5 calls stay `price_missing` because the catalog has no entry (AF-10).
- RR-4 (accepted): a dated API response model id would split per-call identity from the turn-end canonical identity.
- A Claude process that crashes mid-turn leaves its live sums pending. The next resume-opened result re-anchors and consumes them. Compaction-call tokens inside that crashed turn are not admitted (bounded undercount; same class as the existing restart approximation).
- The legacy consolidation reuses the current `applyTokenUsageContribution`. It now keeps the previous reading when a later ledger row has none, where it used to erase it. Totals and the report-count validation are unchanged.
- Codex `cacheWriteInputTokens` stays unmapped (out of scope).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (plus threshold display).
- Reviewed root-cause classification: Shared Structure Looseness (observation contract) plus a Local Implementation Defect per adapter.
- Reviewed refactor decision: `Refactor Needed Now` (bounded).
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: the contract gained exactly the two facts; obsolete paths were removed; no new subsystem was added. The only structural addition beyond the design is `claude-session-query-options.ts`, a pure extraction to keep `claude-session.ts` at 487 effective lines (it was 499 at base and reached 518 before the extraction).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The reconciler's tolerant state decoder is the design-approved generic reader (guideline §3), not a version branch.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed: `Yes`. Removed:
  - `ClaudeSdkMainLoopUsage`, `isClaudeSdkMainLoopUsage` and every `claude_sdk_main_loop_usage` reference, including `zeroTokenUsageContribution`, the persistence-transformer error branch and `isClaudeSdkResultIdentity`. Only a negative test assertion remains.
  - `selectedCacheSplit`, the main-loop restart delta and its flags.
  - The aggregate's Claude `latestContext` branch.
  - AGY result usage and its flag.
  - The reconciler's `selectedDetails` state and `selectedClaudeSdkDetailsFromState`, which only tests read.
  - The `incrementReport`/`incrementRevision` parameters.
  - Obsolete tests: `claude-sdk-context-summary.test.ts`, the main-loop split test, the main-loop restart tests, and the partial-stream-text session test (replaced by the R-001 test).
- Dead code found elsewhere, listed as follow-up:
  - `claude-text-segment-projector.ts` partial `stream_event` text path (≈l.167-205) and `"stream_event"` in `claude-turn-tracker.ts` content kinds. They are unreachable because `ClaudeSession.handleFrame` returns before the turn tracker for every `stream_event` frame. The design explicitly deferred this.
  - `autobyteus-web/generated/graphql.ts` on the base is stale against the server schema (Projects `workspaceRootPath` and `archiveStoredAgentRunGroup` drift, unrelated). Only token-usage hunks were applied here.
- Shared structures remain tight: `Yes`. The context reading stays flat in the established snake_case contract, per the design.
- Canonical shared design guidance was reapplied: `Yes`.
- Changed source implementation files stayed within size guardrails: `Yes`. `claude-session.ts` is 487 and `tokenUsageMeterStore.ts` 499 effective non-empty lines. The largest delta is the reconciler (+137/−88, rewritten as designed).
- Notes, deviations from the design wording (all within intent):
  - The AGY idempotency key uses the prefix `agy_step:` (ingestion kind `agy_step`) instead of `agy:`. Released AGY result keys were `agy:<conversation>:<num_turns>`, so the design's key would collide with recorded digests on a continued run.
  - The Codex idempotency identity appends `last.totalTokens`. A mid-turn compaction repeats the cumulative total, and without this it would be suppressed as a replay (REQ-006).
  - A Codex update without `last` now has no reading and no model call. Previously it fell back to the cumulative total's input.
  - The reconciler's "prior history unattributed" check now keys on `revision > 0`, since result-only records count no calls.
  - `latest_selected_raw_model_id` is read from the reconciler state, not gated on `latestRuntimeKind`.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required` for pre-fix Claude SDK readings; `Directly Usable — No Migration` for the new column and the reconciler state.
- Design-spec decision reference: § Persisted Data / State Transition Decision (1) and (2).
- Implementation follows the approved decision: `Yes`. The DEC-005 clear has two migration-owned disposition points; no runtime code knows about pre-fix rows:
  1. Released run records: one Prisma SQL migration (`ALTER TABLE` plus `UPDATE` of `latest_runtime_kind = 'claude_agent_sdk'` rows) runs through the existing deploy step.
  2. Ledger-era direct upgrades (releases v1.3.77–v1.4.52, CR-F-001): the Prisma deploy runs before the `token-usage-run-records-v1` app-data consolidation, which builds run records from ledger rows. Its migration-owned `legacyRowToCurrentPayload` (`legacy-token-usage-row.ts`) now passes null prompt, window and percent for `claude_agent_sdk` ledger rows. Totals, costs and report counts are unchanged; other runtimes keep their readings.
- Direct-use evidence: the tolerant reconciler decoder reads a released state (`version`, `selectedDetails`, no `live`), drops the unused keys on re-encode, and treats missing live sums as empty (unit test).
- Migration checks: `tests/unit/startup/token-meter-context-readings-migration.test.ts` applies every released migration to a temp SQLite DB and seeds a released-shape Claude row (402.5 %) and a Codex row. After the migration the Claude readings are null, the count query is 0, the Codex reading and all totals, counts and revisions are untouched, and the current repository and summary read the migrated row. The readiness test fails closed without the new column. `token-usage-run-records-v1-app-data-migration.test.ts` "consolidates released Claude SDK ledger readings as unavailable…" consolidates a released ledger with a Claude turn (reading 4,025,193 / 1,000,000 / 402.5 %) and a Codex call. The Claude row has null readings with exact totals and one report; the Codex row keeps 92,942 / 258,400 / 35.97. A mutation that disables the null fails the test. The migration-list fixtures in three migration test helpers include the new migration.
- Deviation from the reviewed transition decision: `None` in intent. The second disposition point (ledger consolidation) applies the same approved DEC-005 (a) clear at the other migration boundary that produces run records; the design named only the Prisma SQL step.

## Environment Or Dependency Notes

- The worktree needed `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-ts build` (the server consumes core `dist`), `pnpm -C autobyteus-web exec nuxt prepare`, and a contract-package `dist` rebuild (done through each package's `test` script).
- No running server is needed for web codegen. The schema was printed from the built server (`dist/api/graphql/schema.js`) and codegen ran against that file; only the token-usage hunks were kept.
- Untracked build output (`autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`) was intentionally not committed (TESTING.md).

## Local Implementation Checks Run

IR-006 (D-13 boolean mark, SR-014):

- `NUXT_TEST=true vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts` → 68 pass.
- Mutations:
  - clearing on any live event regardless of `reports_model_call` fails 4 D-13 cases;
  - removing the team entry point's clear fails the Team case.
- Full Nuxt suite: 601 files, 4,190 pass / 5 skipped.
- `tokenUsageMeterStore.ts` stays at 499 effective lines. Two one-line helpers (`rate`, `mergeUniqueStrings`) were condensed. Follow-up R-3 (extracting the live-partial aggregate) remains the structural fix for this file.
- Panel markup is unchanged since IR-004, so the IR-004 rendered check still applies. No server change.

IR-005 (D-13 clear rule, SR-012/SR-013):

- `NUXT_TEST=true vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts` → 68 pass.
- A mutation that keys the marks to `revision` again fails 4 D-13 cases, including the manual `/compact` remainder case (DESK-004d).
- Full Nuxt suite: 601 files, 4,190 pass / 5 skipped.
- Panel markup is unchanged from IR-004; only the clear rule changed, so the IR-004 rendered check still applies. No server change.

IR-004 (D-12 revert plus D-13), on top of the delivery merge `168900db7`:

- Server:
  - `git grep context_reading_reset` outside tickets is empty.
  - Typecheck clean.
  - `test:unit`: 669 files, 5,263 pass / 7 skipped.
  - `vitest run tests/unit/token-usage tests/unit/agent-execution/backends/autobyteus tests/unit/app-data-migrations`: 546 pass.
- Web, targeted:
  - `agentStatusHandler.spec.ts`: 30 pass.
  - `tokenUsageMeterStore.spec.ts`: 16 pass.
  - Panel specs: 22 pass.
  - A mutation that restores the count-based roll-up refetch fails the new refetch test.
- Web, full Nuxt suite: 601 files, 4,190 pass / 5 skipped.
- Rendered check: Nuxt dev with a temporary, uncommitted preview page rendering the real panel, inspected in a browser tab. The page, the process and the port were removed or released afterwards.
  - Native compacted at 340 px: muted 91.1 %, slate-300 bar, muted tokens, note on one line, no overflow.
  - Claude compacted at 760 px: note and muted bar.
  - The next exact revision clears the note and restores the blue bar.
  - Codex with a mark: no note.

IR-003 (D-11, since reverted), on top of the delivery merge `168900db7`:

- `vitest run tests/unit/token-usage/projections/token-usage-compaction-ingestion.test.ts` → 3 pass. A mutation that disables the reset rule fails 2.
- `pnpm -C autobyteus-server-ts typecheck` → clean.
- `pnpm -C autobyteus-server-ts test:unit` → 669 files, 5,263 pass / 7 skipped.
- `vitest run tests/integration/token-usage` → 24 pass.
- Contract packages rebuilt and tested: 17 + 10 pass, with no `dist` diff.
- Frontend unchanged: an unknown prompt already hides the context card (`hasCurrentPrompt`).

Earlier rounds (IR-001/IR-002):

Implementation-scoped only; not API/E2E sign-off.

- `pnpm -C autobyteus-agent-presentation-contracts test` → 17 pass; `pnpm -C autobyteus-team-stream-contracts test` → 10 pass (both rebuild `dist`).
- `pnpm -C autobyteus-server-ts typecheck` → clean.
- `pnpm -C autobyteus-server-ts test:unit` → 668 files, 5,118 pass / 7 skipped. New or rewritten:
  - `claude-sdk-call-usage-fold.test.ts` (P2/P3/P4 reconciliation, readings, threshold, overflow, replay, restart, clamp, tolerant decoder).
  - `token-usage-model-call-fold.test.ts` (P6 Codex reading-only save and revision, suppression, reading/identity rules, facet count, roll-up revision sum, Grok prompt).
  - Claude session per-call/D-10/unavailable-read/subagent tests and the R-001 transcript test.
  - AGY per-step tests, Codex `last.totalTokens` expectations, native converter and transport, readiness, and the migration test.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage --no-watch` → 24 pass (shared fixtures now mark observations as model calls).
- Full server integration baseline (`pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration`) → 70 files, 338 pass / 68 skipped / 2 fail. Both failures are the two content-cadence window cases in `tests/integration/agent/agent-status-websocket.integration.test.ts`. TESTING.md lists them as the known exception (a reported product defect: `AGENT_INPUT_STATE` flushes the cadence buffer early). They are unrelated to token usage and not caused by this change.
- `autobyteus-ts`: `vitest run tests/unit/agent/loop/llm-phase-memory-compaction-configuration.test.ts tests/unit/agent/streaming` → 75 pass; `tsc -p tsconfig.build.json --noEmit` clean; `pnpm build` ok.
- `autobyteus-web`: `NUXT_TEST=true vitest run` → 590 files, 4,009 pass / 5 skipped. New tests:
  - Store spec: revision race, reading-only acceptance, standalone `<` rule, team partial model-call count, revision validation, mapper keeps `revision` and threshold.
  - Panel spec: threshold marker and label, no threshold, overflow mark with clamped amber bar.
- RR-2 (real AGY 1.3.2, `gemini-3.8-flash-low`, one short prompt): resuming P8's conversation `3cc6783f…` in a new CLI process continued `step_index` at 10 (P8 used 0–9). The cumulative result 86,497 = 61,009 + 12,665 + 12,823. Evidence: `probes/P9-agy-resume.jsonl`. No process-generation key component is needed.
- Pricing probe (temporary test, removed): `resolvePolicy` for `ANTHROPIC` + `claude-opus-5-5` / `claude-sonnet-5` / `claude-fable-5-1` → trusted; `claude-haiku-4-5` → missing.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: right-panel Token Meter, "Latest prompt" context card (standalone run focus).
- Approved references: requirements UI section (threshold marker and label, over-window mark, tooltip; states: known window, unknown window, over window, threshold present/absent); DEC-004 (a).
- Existing design system reviewed: the existing context card (blue progress bar, slate text, amber used for cost-assumption notes). The additions reuse those tokens: slate-600 marker, amber-500/700 for overflow.
- Testing guideline / rendered surface used: Nuxt dev server (`nuxi dev`, port 3917) with a temporary, uncommitted preview page that seeded the real stores and rendered the real `TokenUsageMeterPanel` inside the app layout. Inspected through a browser tab with DOM geometry checks. The page, the dev server process and the port were removed or released afterwards.
- States, layouts, viewports and interactions inspected:
  - Claude Opus: marker at 96.7 %, label "Auto-compacts at 967,000".
  - Claude failed compaction at 340 px: 94.6 %, fill past the marker at 67 %, no overflow mark.
  - Codex 100.3 %: amber percent, mark "Over the runtime's window", fill clamped to the full bar.
  - AGY unknown window: tokens with "context limit unavailable", no bar or marker.
  - Native at 760 px: marker at 19.96 %, label on the same row.
  - Tooltip text checked. No horizontal overflow at narrow widths.
- Visual issue found and corrected: at panel widths around 340–420 px the threshold label wrapped to the left edge, away from the marker near the bar's right end. It now right-aligns (`ml-auto`), so on wrap it sits under the bar's end.
- Remaining limitations: the browser screenshot bridge returned no image bytes, so evidence is DOM/geometry inspection, not screenshots. Team-member and Org panels share the same card component; I did not render them separately. Not verified in the packaged desktop app or in zh-CN rendering; strings were added for both locales.

## Downstream Coverage Hints / Suggested Scenarios

- Claude SDK live (AC-001, AC-003, AC-004, AC-008), standalone and team member:
  - During a multi-call turn, the meter shows ≥1 model call, model and runtime before the turn ends.
  - The latest prompt equals the SDK's context; the threshold label shows (Opus 5.5: 967,000).
  - After the turn, totals equal `modelUsage` for the selected model.
  - The updated opt-in E2E is `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` "counts every completed turn's usage exactly once…". Its assertions were rewritten for per-call plus remainder and it has not been run here.
- Claude auto-compaction (`RUN_CLAUDE_AUTO_COMPACTION_E2E=1`): the remainder carries the summariser; no extra call is counted.
- Codex compaction (AC-006): the post-compaction reading appears live with an unchanged call count (`revision` advance through the store).
- AGY (AC-005): per-step live usage; gross = input + cache read; latest prompt shown with "context limit unavailable"; a restored conversation keeps unique step keys.
- Delegated copy and Org member (REQ-008): usage visible within one call.
- Migration on a released-shape profile copy (never the user's live profile): Claude readings cleared, totals intact.
- Deterministic server E2E suites under `tests/e2e/token-usage/` and `tests/e2e/app-data-migrations/` build payloads that may need `reports_model_call`. Their direct-payload fixtures were not run here. The shared helper `tests/helpers/token-usage-run-record-fixtures.ts` now defaults it to `true`.
- `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` (opt-in real LM Studio/Codex/Claude) asserts runtime usage semantics that changed for Claude (per call) and Codex (`last.totalTokens`).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E owner: run and adjust the deterministic `pnpm test:e2e` token-usage and migration suites, plus the opt-in live Claude, Codex and AGY suites above, against this branch's build.
- Isolated desktop instance verification of the meter on Claude SDK, Codex, AGY and native runs (AC-010 is explicit user verification by delivery).
