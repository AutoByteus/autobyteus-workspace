# Implementation Revision Record — token-meter-accuracy

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass, `design-review-report.md`, round 3 | N/A | `Initial Baseline` | SR-005, ARCH-REV-003 | Implementation complete; local checks green; ready for Code Review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 round 1 (Fail — Local Fix) | CR-F-001 | `Local Fix` | SR-005, ARCH-REV-003, CRR-001 | Ledger-era consolidation nulls Claude SDK readings; consolidation test added; returned for targeted delta review; **Pass** in CRR-002 (round 2, targeted delta), forwarded by Code Reviewer to API/E2E |
| IR-003 | Delivery blocker DR-002 → Solution Designer SR-008 (D-11) → Architecture Reviewer ARCH-REV-004 Pass | DR-002 native-compaction reading conflict | `Design Impact` (implemented design delta) | SR-008, ARCH-REV-004, DR-002, CRR-001/002 | Native compaction usage resets the context reading; upstream test adapted; returned for code review; **Pass** in CRR-004 (round 3, no findings), forwarded by Code Reviewer to API/E2E for affected-scope validation |
| IR-004 | Solution Designer SR-010 (D-12) and SR-011 (D-13) → Architecture Reviewer ARCH-REV-005/006 Pass | User withdrawal of D-11; user request REQ-012 / AC-012 | `Design Impact` (implemented design delta) | SR-010, SR-011, ARCH-REV-005, ARCH-REV-006 | D-11 reverted (D-12), compacted note added (D-13), standalone roll-up refetch moved to revision; returned for code review; **Pass** in CRR-005 (round 4, no open findings), forwarded by Code Reviewer to API/E2E |

## Revision Entries

### IR-001 — Per-call runtime usage, context readings and revision freshness

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`, round 3 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: design D-1–D-10 implemented on branch `codex/token-meter-accuracy` in commits `9e8e5bf26` and `a5d8d2d31`, plus the handoff commit. Local implementation checks pass (see handoff).
- Related solution revision IDs: SR-005 (cumulative SR-001–SR-005).
- Related architecture-review revision IDs: ARCH-REV-003 (ARCH-F-001/002/003 resolved).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001–BEH-008; REQ-001–REQ-011; AC-001–AC-009 (AC-010 is user verification).
- Implementation delta:
  - Shared contracts (step 2): `revision` and `context_compaction_threshold_tokens` on both strict summary schemas; `reports_model_call` and the threshold on the live token event; `dist` rebuilt.
  - Observation contract and fold (D-4, D-9): `reports_model_call` and the threshold on the payload. The fold counts calls only for model-call observations. It updates the latest identity only on the latest call and the latest reading only from an observation that carries one. It bumps `revision` on every save. Facets are written only when an observation contributes. Summaries carry Σ record revisions.
  - Persistence (D-7): nullable `context_compaction_threshold_tokens` column, one Prisma migration that also clears pre-fix Claude SDK readings, codec/schema/readiness updates.
  - Claude (D-1, D-2, D-3, D-10): `includePartialMessages`; `ClaudeSdkStreamingSession.readContextUsage()` (≤2 s, null on failure); the new `ClaudeCallUsageTracker`; `ClaudeSession.handleFrame` awaits it for `stream_event` frames, which never reach the turn tracker. The result observation is reconciliation only. The reconciler keeps per-session live sums and contributes a clamped remainder. A series restart admits nothing. The state decoder is tolerant. The `claude_sdk_main_loop_usage` field, validator and type and the `selectedCacheSplit`/main-loop restart delta are removed.
  - AGY (D-5): per-step `DONE` usage as `agy_step` model calls (`base_excludes_cache`, prompt = input + cache read); cumulative `result` mapping removed.
  - Codex (D-6): latest prompt = `last.totalTokens`; `reports_model_call` = last input + output > 0; reading-only save on a non-advancing update.
  - Grok: latest prompt = input + cache read + cache write. Native: threshold from `compactionTokenBudget.triggerThresholdTokens`, `reports_model_call: true` in the server bridge.
  - Live DTOs/GraphQL: team and collaboration projections carry the threshold and model-call fact; GraphQL `contextCompactionThresholdTokens` and `revision`.
  - Web (D-8, D-9): store guards on `revision` (l.288/l.304 reject `<=`, l.389 rejects `<`); team partial aggregate adds a call only for `reports_model_call`; `revision` validated; mapper/types/query/generated types; context card threshold marker and label, over-window mark with clamped amber bar, tooltip text.
  - Docs: `token_usage.md` adapter/fold sections rewritten (including the RR-3 note).
  - Guardrail refactor: `claude-session-query-options.ts` extracted from `ClaudeSession` (pure move).
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: contracts 17 + 10 pass; server unit 5,118 pass / 7 skipped; server token-usage integration 24 pass; core related 75 pass; web Nuxt suite 4,009 pass / 5 skipped; typecheck clean; rendered panel inspected in a browser; RR-2 verified with a real resumed AGY conversation. Full server integration suite: 338 pass / 68 skipped / 2 known-exception failures (TESTING.md content-cadence cases).
- Next recipient or routing: Code Reviewer (Large/High route), per `get_handoff_rules`.
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks.

### IR-002 — DEC-005 clear at the ledger-consolidation boundary

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`, CRR-001 round 1.
- Triggering finding IDs: CR-F-001 (Medium, blocking).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001. On a direct upgrade from a ledger-era release (v1.3.77–v1.4.52), the Prisma clear ran against an empty run-record table. The later `token-usage-run-records-v1` consolidation then stored each Claude run's last ledger reading, a turn-level sum. IR-001 recorded this as a "no machinery" risk.
- Current authoritative result: the migration-owned `legacyRowToCurrentPayload` passes null `latest_prompt_tokens`, `effective_context_window_tokens` and `context_window_usage_percent` for `claude_agent_sdk` ledger rows. Totals, costs, counts and non-Claude readings are unchanged.
- Related solution revision IDs: SR-005.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: it applies the approved DEC-005 (a) clear at the second migration boundary that produces run records. The data-migration guideline keeps released source shapes supported, and no minimum upgrade-from version is declared.
- Approved behavior or requirement IDs affected: DEC-005 (a), REQ-009 / AC-002, BEH-008.
- Implementation delta: `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-row.ts` (a `claudeSdkReading` guard on the three reading fields). Test: a new case in `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts`. Handoff: the "skip-version" risk was removed and the second disposition point recorded under the Persisted Data Transition Check. No runtime code changed.
- Local validation and result:
  - The new consolidation test passes, and a mutation that disables the guard fails it.
  - `vitest run tests/unit/app-data-migrations tests/unit/token-usage tests/unit/startup`: 70 files, 470 pass.
  - Server typecheck clean.
- Next recipient or routing: Code Reviewer (targeted delta review), per `get_handoff_rules`.
- Remaining limitations or risks: non-blocking C-02 (the accumulator imports `tokenUsageObservationContributes` from record-state) is left as is to keep this a minimal Local Fix. `tokenUsageMeterStore.ts` is at 499 effective lines, unchanged here.

### IR-003 — Native compaction usage resets the context reading (D-11)

- Triggering role, report path, and round: delivery blocker DR-002 (`/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/release-deployment-report.md`, `delivery-revision-record.md`). The Solution Designer answered with SR-008 / D-11, and the Architecture Reviewer passed it in ARCH-REV-004 (`design-review-report.md`, round 4).
- Triggering finding IDs: DR-002. After the `origin/personal` merge (`168900db7`, which brought in compaction-prompt-cache-reuse), native compaction summary calls (`autobyteus_compaction`) report null readings. Under D-4 a stale reading (e.g. 91.1 %) would stay until the agent's next call.
- Classification: `Design Impact`, resolved upstream and implemented here as a design delta.
- Prior authoritative result: IR-002 (CRR-002 Pass).
- Current authoritative result:
  - A server-internal observation fact, `context_reading_reset`, is added; the payload builder defaults it to `false`.
  - The native bridge sets it only for `ingestion_kind === "autobyteus_compaction"` and keeps `reports_model_call: true`.
  - In `applyTokenUsageContribution`, a latest observation with the fact sets prompt and percent to null and keeps window and threshold (taking payload values when non-null). The call, its tokens and cost still count, and the save bumps `revision`.
  - The fold does not branch on ingestion kind; D-4 is otherwise unchanged.
- Related solution revision IDs: SR-008.
- Related architecture-review revision IDs: ARCH-REV-004.
- Related code-review revision IDs: CRR-001, CRR-002 (prior rounds).
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: DR-002.
- Why this revision is recorded: it implements the D-11 design delta that unblocks delivery re-integration.
- Approved behavior or requirement IDs affected: BEH-005 (clarified), REQ-010, AC-011 (user verification of native compaction), REQ-009.
- Implementation delta: commit `5b48c2b47`. Files changed:
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`
  - `src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
  - `src/token-usage/projections/token-usage-run-record-state.ts`
  - `src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-row.ts` (explicit `false`, a type completion)
  - `tests/unit/token-usage/projections/token-usage-compaction-ingestion.test.ts`: the upstream case now builds payloads as the converter does; added a reset-keeps-window/threshold case, a no-fact-keeps-reading case, a next-call-restores case and a converter case.
  - `docs/modules/token_usage.md`: native section and the D-4 exception.
- Local validation and result:
  - The compaction test passes (3); a mutation that disables the rule fails 2.
  - Typecheck clean.
  - Server unit: 5,263 pass / 7 skipped. Token-usage integration: 24 pass.
  - Contracts: 17 + 10 pass, no `dist` diff.
- Next recipient or routing: Code Reviewer, per `get_handoff_rules` (SR-008 route: code review → affected-scope validation → delivery resumes finalization).
- Remaining limitations or risks: the accepted D-11 edge (a failed summary attempt also hides the reading). The flag is visible but unused on the standalone socket, which forwards whole payloads. AC-011 needs user verification in the desktop app.

### IR-004 — Keep the reading through native compaction (D-12) and show the "Compacted" note (D-13)

- Triggering role, report path, and round: the Solution Designer issued SR-010 (D-12, which withdraws D-11 at the user's direction) and SR-011 (D-13, user-approved REQ-012 / AC-012). The Architecture Reviewer passed both as ARCH-REV-005 (round 5) and ARCH-REV-006 (round 6), recorded in `design-review-report.md`.
- Triggering finding IDs: the user's stated behaviour (the reading stays unchanged during compaction) and the user's request for the note.
- Classification: `Design Impact`, resolved upstream and implemented here as a design delta.
- Prior authoritative result: IR-003 (D-11, CRR-004 Pass), now withdrawn.
- Current authoritative result:
  - D-12: IR-003 (`5b48c2b47`) is reverted in the converter, payload contract, fold and legacy payload builder. Native compaction usage is a model call with tokens and cost and carries no reading, so the D-4 rule keeps the previous reading. The upstream compaction test asserts the kept reading.
  - D-13: frontend-only compaction marks keyed to the exact-run revision. The handler marks on a newly completed compaction. The panel shows the muted previous value with the note for native and Claude SDK only, keyed by the card's run (the host for a standalone roll-up).
- Related solution revision IDs: SR-010, SR-011.
- Related architecture-review revision IDs: ARCH-REV-005, ARCH-REV-006.
- Related code-review revision IDs: CRR-004 (IR-003, superseded).
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: DR-002.
- Why this revision is recorded: it implements the D-12/D-13 design delta.
- Approved behavior or requirement IDs affected: BEH-005, BEH-001, REQ-010, REQ-012, AC-011, AC-012; D-9 (refetch fix).
- Implementation delta:
  - `2cd590603`: the D-12 revert, the adapted `token-usage-compaction-ingestion.test.ts` and the native-section statement in `token_usage.md`. The bullet that lists native compaction as a readingless observation was already present after the merge.
  - `d6a89cbdd`: D-13.
    - New `autobyteus-web/stores/tokenUsageCompactionMarks.ts`.
    - `stores/tokenUsageMeterStore.ts`: instantiates the marks and exposes them. `normalizedStatus` was condensed to stay at 499 effective lines, within the guardrail.
    - `services/agentStreaming/handlers/agentStatusHandler.ts`.
    - `components/workspace/usage/TokenUsageMeterPanel.vue`.
    - The `compactedAwaitingReading` key in en and zh-CN.
    - Tests: handler, store and panel specs.
  - Same commit, implementation-owned fix to my IR-001 D-9 work: `composables/useTokenUsageWorkspaceScope.ts` refetched the standalone roll-up when the host's `usageReportCount` changed. A reading-only save (Codex compaction) or a Claude turn-end remainder changes only the revision, so the standalone panel stayed stale. It now watches the host's exact revision, with a test that fails under the old rule.
- Local validation and result: see `implementation-handoff.md` § Local Implementation Checks Run, IR-004 block.
- Next recipient or routing: Code Reviewer, per `get_handoff_rules`. SR-011 route: code review → validation → AC-011/AC-012 user checks → delivery.
- Remaining limitations or risks:
  - RR-7: a Claude observation without a reading can clear the note early.
  - The note is a live-session hint only.
  - The over-window mark is hidden while the note shows.
  - AC-011 and AC-012 need user checks in the desktop app.

