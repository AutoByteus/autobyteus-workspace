# Code Review Report — token-meter-accuracy

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/requirements-doc.md` (Approved, SR-003 basis)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`. This includes the uncommitted AF-16 row (SR-006, evidence-only).
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/solution-revision-record.md` (SR-001–SR-005 committed; SR-006 uncommitted in the worktree)
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-spec.md` (SR-005, D-1–D-10)
- Supplemental Task Artifacts Reviewed As Context:
  - `probes/`: P2, P6 and P8 were re-read directly; P9 is the RR-2 evidence.
  - `solution-handoff.md`, including the uncommitted SR-006 integration note.
  - `autobyteus-server-ts/docs/design/data_migration_guideline.md`.
  - Repository `DESIGN.md` and `AGENTS.md`.
- Relevant Solution Revision IDs: SR-001–SR-005; SR-006 (evidence-only integration note, no design change)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md` (round 3, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003, IR-004
- Relevant Solution / Architecture / Delivery revisions for round 3: SR-008 (D-11, AC-011), ARCH-REV-004 Pass, DR-002 (finalization blocker)
- Relevant revisions for round 4: SR-009 (D-11 withdrawn), SR-010 (D-12), SR-011 (D-13, REQ-012, AC-012), ARCH-REV-005 and ARCH-REV-006 Pass
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: 4
- Round 4 Review Scope: `Full Re-Audit` of the affected area (delta `git diff ab1265c7f..fdf44f205`).
  - Why full: D-12 reverts the D-11 payload field and fold rule, D-13 adds a new frontend owner, and the delta changes the standalone freshness trigger (D-9).
  - Server: the revert is exact. `git diff 989f31780..fdf44f205` shows no change to `agent-run-token-usage.ts`, `token-usage-run-record-state.ts`, the native converter or `legacy-token-usage-row.ts` beyond the merge, and `git grep context_reading_reset` outside `tickets/` is empty.
  - Web: D-13, plus the D-9 refetch fix in `useTokenUsageWorkspaceScope.ts`.
- Round 4 reviewer-run checks at HEAD `fdf44f205`:
  - Web: store, `components/workspace/usage` and status-handler specs, 68 pass.
  - Server: `tests/unit/token-usage`, `backends/autobyteus` and `app-data-migrations`, 74 files pass.
  - Server `typecheck`: 0 errors.
- Round 3 Review Scope: `Full Re-Audit` of the affected area.
  - Why: D-11 changes a payload data shape (the new internal field `context_reading_reset`) and the fold rule in the bounded local spine DS-005.
  - What was rechecked: every structural check, against the D-11 delta (`git diff 989f31780..1d93c9002`, code commit `5b48c2b47`) and against what delivery's merge `168900db7` (origin/personal @ beb6b3b49) brought into the token-usage, Claude and native paths.
  - What was carried forward: round-1 evidence for code that neither the delta nor the merge touched.
- Round 3 reviewer-run checks at HEAD `1d93c9002`:
  - `vitest run tests/unit/token-usage tests/unit/agent-execution/backends/{autobyteus,claude} tests/unit/app-data-migrations tests/unit/startup`: 801 pass.
  - Server `typecheck`: clean.
- Round 2 Review Scope (historical): `Targeted Delta Review`
- Review Scope Evidence (round >1): the delta `git diff aa9d949e1..f78921e5f` touches only the files and behavior of CR-F-001:
  - `legacy-token-usage-row.ts`: one migration-owned conditional on three reading fields.
  - One new consolidation test case.
  - One sentence in `token_usage.md`.
  - The handoff and revision record.

  No spine, shared interface or data shape changed, and no fix is layered on an earlier fix. Round-1 evidence for all other checks is carried forward.
- Trigger: implementation engineer IR-002 (Local Fix for CR-F-001, commit `f78921e5f`)
- Prior Review Round Reviewed: 1 (CRR-001, Fail — Local Fix)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E Revision Record (failure-origin only): N/A
- Delivery Revision Record (delivery re-entry only): N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Reviewed diff: `git diff 927796780..aa9d949e1` in round 1, plus `git diff aa9d949e1..f78921e5f` in round 2. Branch `codex/token-meter-accuracy`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy`.

## Round 7 — Implementation Review of IR-006 (CRR-008, latest authoritative)

- Review Entry Point: `Implementation Review`
- Trigger: `/software_engineering_team/implementation_engineer` IR-006 (SR-014, ARCH-REV-009 Pass), responding to CRR-007 / CR-F-002.
- Review Scope: `Targeted Delta Review`, delta `git diff d35a1e5cc..3205b12f6`.
  - The delta stays inside the D-13 marks owner and the two live store entry points that call it, plus specs and a panel comment.
  - No server, contract or spine change. Round-4 evidence is carried forward.
- Reviewer-run checks at `3205b12f6`: web store, usage panel and status-handler specs, 68 pass.
- Classification preserved: Large / High.

### Prior finding recheck

- **CR-F-002: Resolved.** The mark is now a per-run boolean with no baseline.
  - Only the run's own live token-usage event with `reports_model_call === true` clears it (`clearOnLiveModelCall`).
  - It is called in `applyTokenUsageUpdated` and `applyTeamTokenUsage` after the dedupe and before the upsert, keyed by the event's own run id.
  - A reopened standalone run with no exact summary loaded therefore keeps the note through the `/compact` remainder (`false`) and through fetched summaries. The next live call clears it.
  - The new store case covers exactly the CR-F-002 path, and it replaces the old "first summary clears" assertion.
- **The flag reaches every live path** (verified):
  - The standalone socket forwards the server payload.
  - The team adapter (`teamStreamDtoAdapters.ts:67-75`) and the presentation adapter (`:142-145`) spread the payload. The strict schemas include `reports_model_call` (IR-001).
  - `tokenUsageHandler` spreads the payload into `applyTokenUsageUpdated`.
  - A team event that reaches both entry points is harmless, because the clear is idempotent.
- **F-API-002-01:** remains resolved; the remainder never clears.
- **Ordering premises still hold:**
  - Native: the compaction call's own usage (`true`) arrives before completion (LIVE-006), so it cannot clear a later mark.
  - Claude: manual `/compact` gives only a `false` remainder, and auto-compaction is followed by a main-loop `true` call carrying the reading.
  - Codex and AGY are excluded by runtime kind.
- **Child isolation:** each call is keyed by the event's run id, so a collaborator's calls do not clear the host's note (tested).

### Candidate gate (round 7)

| Candidate | Disposition | Reason |
| --- | --- | --- |
| A live call event without `run_summary_after_event` (persistence unavailable) returns before the clear | Reject | The value it would carry never reaches the meter either, so the note stays truthful. Recorded in the handoff |
| A mark persists until the next call, including across an idle session | Reject | This is the approved AC-012 semantics; it is a live-session hint |
| The store stays at 499 lines by condensing two one-line helpers | Non-blocking note (C-14) | Guardrail pressure persists; follow-up R-3 (`project_task_7257984e-…`) is the structural fix and should land before the next store change |

### Latest Authoritative Result (round 7)

- Review Decision: `Pass`. No open findings. Score 9.3 / 10; every category ≥ 9.0.
- Residual: RR-7 (a counted Claude call whose context read timed out clears the note while the value is still the pre-compaction one). Accepted.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`, for a rerun of DESK-004d and the AC-012 cases, including the reopened standalone Claude `/compact`. `/software_engineering_team/implementation_engineer` receives an informational notice.

## Round 6 — Implementation Review of IR-005 (CRR-007)

- Review Entry Point: `Implementation Review`
- Trigger: `/software_engineering_team/implementation_engineer` IR-005 (SR-012 / SR-013, ARCH-REV-008 Pass), responding to CRR-006 / F-API-002-01.
- Review Scope: `Targeted Delta Review`, delta `git diff 3f5963143..d35a1e5cc`.
  - The delta stays inside the D-13 marks owner: `tokenUsageCompactionMarks.ts`, a comment in the panel, and the store and panel specs. No server, contract or spine change.
  - The round-4 evidence for the other checks is carried forward.
- Reviewer-run checks at `d35a1e5cc`: web store, usage panel and status-handler specs, 68 pass.
- Classification preserved: Large / High.

### Prior finding recheck

- **F-API-002-01 (DESK-004d shape) is resolved for the case where the run's exact summary is already loaded.**
  - The mark now stores the exact-run `usageReportCount`. A reading-less, call-less save (the Claude manual `/compact` remainder) keeps the note; the next counted call clears it.
  - D-9 `revision` stays the freshness key only.
  - The SR-012 / SR-013 rationale for using the call count ("has a model call happened since the mark") is sound and explicit.

### New finding

#### CR-F-002 — The note is still lost when the mark has no exact-run baseline (standalone Claude run, `/compact` as the first event of the session)

- **Severity:** Medium (blocking)
- **Classification:** `Design Impact`
- **Protects:** REQ-012 / AC-012 (Claude SDK branch, manual `/compact`); the same user-visible failure as F-API-002-01.
- **Scenario: Supported Normal Scenario.**
  - The user reopens an existing Claude SDK standalone run from history or after an app restart. The Token tab shows the persisted roll-up's high "Latest prompt".
  - The user's first action is `/compact`, to free context before continuing.
  - That is a coherent goal on the normal chat input. Reopening and continuing runs is a supported product flow, and Claude manual `/compact` was established in CRR-006.
- **Forward path:**
  1. For `standalone_agent`, `useTokenUsageWorkspaceScope.hydrateIdentity` fetches only the roll-up (`fetchStandaloneRunSummary` → `standaloneRunSummaries`). The host's exact summary `runSummaries[host]` is filled only by live `TOKEN_USAGE_UPDATED` events in this app session (`tokenUsageHandler.ts` → `applyTokenUsageUpdated`). Team, Org and agent-run kinds hydrate their exact summaries, so they are not affected.
  2. The `/compact` turn emits compacting, then compacted, then the remainder `claude_sdk_result` (DESK-004d), with no earlier token event.
  3. At "compacted", `markCompactionCompleted(host)` reads `exactRunModelCalls(host)`, which is `null`, so the mark is `null`.
  4. The remainder upserts `runSummaries[host]` with count N, which is not `null`, so `isAwaitingPostCompactionReading` turns false and the note never renders.
  5. The same happens after a resume-opened process: the series-restart result admits 0 but is still saved and published.
- **Evidence:**
  - `tokenUsageCompactionMarks.ts` (equality against a `null` baseline).
  - `useTokenUsageWorkspaceScope.ts:107-133` (standalone hydration is roll-up only).
  - `tokenUsageMeterStore.ts:401-416`.
  - The store spec "keeps a mark made before any exact summary until the first one arrives" encodes exactly this clearing, asserting `false` after the first summary whatever its call count.
- **Why the design owns it:** D-13 § Owner takes the baseline from the run's exact summary and assumes it exists. For a standalone host it may not. Choosing the baseline source is a design decision with data-flow cost.
- **Proportionate options** (owner decides):
  - **(a)** Clear on a live `TOKEN_USAGE_UPDATED` for the run with `reports_model_call: true`, an event-sourced "a call happened" signal that needs no baseline. Also handle the team live path.
  - **(b)** Hydrate the standalone host's exact summary as well (`fetchAgentRunSummary(host)`), so the baseline is known. This costs one extra query per standalone open and has a race if the remainder lands before the fetch returns.
  - **(c)** With a `null` baseline, clear only on a summary whose `latestPromptTokens` differs from the value shown at mark time. The roll-up's host reading is available, but this is weaker.

  (a) looks the most direct.
- **Required tests:** a mark with no exact summary is followed by a remainder (count N, no call); the note is kept and the next counted call clears it. Replace the current "first summary clears" assertion.

### Classification and routing

- Review Decision: `Fail`
- Classification: `Design Impact` (CR-F-002)
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Note: this gap also existed under the round-4 revision rule. It was masked by F-API-002-01, and I did not catch it in CRR-005 either.
- Non-blocking: RR-7 has narrowed to a Claude call whose context read timed out. That is accepted.

## Round 5 — API/E2E Failure-Origin Review (CRR-006)

- Review Entry Point: `API/E2E Failure-Origin Review`
- Review Scope: `N/A` (failure-origin round). The source audit and scorecard of CRR-005 are not repeated.
- Trigger: `/software_engineering_team/api_e2e_engineer`, API-REV-002 (round 2), result `Fail`.
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md` § Round 2
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` § Round 2 (DESK-004d)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (API-REV-002)
- Failing Scenario IDs: F-API-002-01 / DESK-004d; REQ-012 / AC-012 (Claude SDK branch)
- Exact Failing Commands / Execution Mode: isolated desktop build of `352ba13ee` (IR-004 product source at `fdf44f205`), Claude Haiku 5.5, a user message `/compact`. The public agent WebSocket was traced and the meter DOM sampled.
- Failure Evidence Paths:
  - `api-e2e-evidence/round2/desktop/DESK-004d-claude-compact-completed-trace.json`
  - `…/DESK-004d-claude-compact-turn.json`
  - `…/DESK-004d-claude-compact-ui.json`
- Project testing guideline applied: `TESTING.md`; no conflict.
- Classification preserved: Large / High.

### Failing scenario still represents approved behavior

- **Yes.** REQ-012 / AC-012 are user-approved (SR-011): "Native or Claude SDK run; compaction completes while the meter is open" → the value stays greyed with "Compacted — updates on the next model call" until the next model call.
- **Scenario basis: Supported Normal Scenario.**
  - Actor and goal: a user frees context in a Claude SDK run.
  - Entry surface: the normal chat input; the Claude SDK handles `/compact` natively.
  - AutoByteus owns the resulting operation in production code: `ClaudeCompactionOperationTracker` recognizes the SDK's `system/status` and `system/compact_boundary` frames and emits `COMPACTION_STATUS` "compacted".
  - The live E2E suite exercises the same path (completed and user-stopped `/compact`). It confirms the established path; it is not the source of validity.

### Evidence and production path

1. The trace (one run) shows, in order:
   - `COMPACTION_STATUS` compacting at 819 ms;
   - compacted at 3,707 ms;
   - `TOKEN_USAGE_UPDATED claude_sdk_result` at 3,715 ms (no reading, `reports_model_call: false`, revision +1);
   - `TURN_COMPLETED`.

   The turn file (another run) shows the same shape: the only usage is the remainder (accounting 23,584, call count unchanged at 1, revision 3). The UI file holds one retained sample (20,687, 1 call, not muted, no note). That sample is thin evidence on its own, but it matches the deterministic code path below.
2. **Web, `handleCompactionStatus`:** on "completed" it calls `markCompactionCompleted(runId)`, which records the exact-run revision R.
3. **Server:** the result path runs `reconcileClaudeSdkResult` → `applyTokenUsageContribution`. The revision is bumped on every save (D-9), so R+1 is published with `run_summary_after_event`.
4. **Web:** `upsertRecordBackedAgentRunSummary` stores R+1. `isAwaitingPostCompactionReading` requires the exact revision to equal R, so it returns false about 8 ms after the mark, and the note never renders.
5. **Why this is systematic, not rare:**
   - A manual `/compact` turn makes no main-loop model call.
   - The Claude summariser emits no stream events (P3), so there is no `claude_sdk_call` observation.
   - Every completed manual Claude compaction therefore ends with a reading-less remainder result after `compact_boundary`.

### Failure-origin classification

- Implementation defect: **No.** IR-004 implements D-13 as specified: "Any newer revision clears the mark", from D-13 § Owner.
- Invalid or stale test, fixture, environment or execution issue: **No.** This is a real isolated build exercised through the real product path.
- **Design Impact: Yes.** Two parts of D-13 do not hold for the supported Claude manual `/compact` scenario:
  - D-13 § Trigger's reachability premise: "the first observation after a completed compaction is the next agent call carrying a reading … Claude's turn-end remainder arrives after that call's reading".
  - RR-7's "rare" classification of the remainder-only path (design review report, round 6).

  The clear rule (any newer exact-run revision) is therefore inadequate for one of the two runtimes REQ-012 targets.
- **Earlier review gap: partly yes.** In CRR-005, I accepted RR-7 as a documented residual without validating its "rare" premise. The source evidence was available:
  - `reconcileClaudeSdkResult` always saves, so every result bumps the revision.
  - A manual `/compact` turn has no main-loop call.
  - My C-12 analysis considered only the reverse ordering.

  The architecture review shared the same premise.
- **Not affected:**
  - Native (DESK-004a/c, LIVE-006): nothing bumps the revision between completion and the next call.
  - Codex: no note, by design.
  - D-12 / AC-011.
  - The D-9 refetch fix.
  - Failed and stopped compactions.

### Proportionate correction direction (for the owner; not prescribed)

- The note should clear on evidence of a new reading or a new model call, not on any save.
- The candidate from API/E2E fits the facts the web already holds: clear when the exact-run summary's `usageReportCount` advances past its value at the mark (a model call happened). A newly reported `latestPromptTokens` would also qualify.
- Using `usageReportCount` here answers "did a call happen since the mark", which is a different question from D-9 freshness ordering. That separation should be stated explicitly.
- The Claude residual then narrows to a call whose context read timed out.
- The Solution Designer decides, and confirms whether RR-7 and the D-13 § Trigger text need revision.

### Latest Authoritative Result (round 5)

- Review Decision: `Fail` — failure origin confirmed
- Failure Origin: `Design Impact`. D-13 clear rule and RR-7 premise. Partly an earlier review gap (CRR-005 accepted RR-7 without validation).
- Recommended Recipient: `/software_engineering_team/solution_designer`
- After correction: architecture re-review (as the owner routes), implementation, code review, then API/E2E rerun of DESK-004d and the AC-012 cases, then user checks.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. About 50 production files across six packages are changed. They cover the shared observation contract, accounting semantics, a persisted-schema change with a data update, and the Claude SDK frame mix.

## Review Scope

- Changed implementation and behavior reviewed:
  - **Claude SDK:** per-call usage, the context read, the awaited emission (D-10), the turn-end remainder and the tolerant reconciler state.
  - **Other adapters:** AGY per-step usage, Codex `last.totalTokens` and the reading-only save, the Grok prompt and the native threshold.
  - **Fold and pipeline:** the D-4 rules, revision bumped on every save (D-9), facet gating, the aggregate and summary `revision`.
  - **Persistence:** the Prisma column, the clear of pre-fix Claude readings, readiness, and the legacy consolidation payload.
  - **Transport:** the strict shared contracts and their `dist`, GraphQL, and the team/collaboration projectors.
  - **Web:** store freshness guards, the team partial count, and the meter threshold and overflow display.
  - **Docs:** `token_usage.md`.
- Files / areas reviewed: every non-generated production file in the diff, including the full reconciler, tracker, fold, record-state, accumulator, aggregate, AGY converter (`agentResponse`), Codex resolver, legacy payload builder, store and panel. Tests were read for the D-10 order test, R-001, P2/P3/P4/P6 fixture tests, the migration test and the contract tests.
- Reviewer-run checks (2026-10-09, branch HEAD `aa9d949e1`):
  - Targeted server unit suites (`tests/unit/agent-execution/backends/{claude,antigravity,codex,autobyteus}`, `tests/unit/token-usage`, readiness and migration tests): 88 files, 1,035 pass / 6 skipped.
  - Server `typecheck`: clean.
  - Web store and panel specs: 30 pass.
  - Both contract-package test scripts pass. The rebuilt `dist` matches the committed files (no working-tree diff).
- Reviewer-run checks (round 2, HEAD `f78921e5f`):
  - `vitest run tests/unit/app-data-migrations tests/unit/token-usage tests/unit/startup`: 70 files, 470 pass.
  - Server `typecheck`: clean.
- Explicit exclusions: the deterministic and opt-in live E2E suites and desktop verification. These belong to API/E2E and delivery.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001–REQ-011, DEC-001–DEC-005, SCN-001–SCN-004).
- Design-spec behavior map verified against the implementation: Yes. The implementation follows D-1–D-10. Its deviations from the design wording are all within intent and justified:
  - The AGY key prefix `agy_step:` avoids digest collisions with the released keys `agy:<conv>:<num_turns>` on continued runs.
  - The Codex identity includes `last.totalTokens`, without which the P6 compaction update would be suppressed as a replay.
  - Dead `selectedDetails` state was removed (Core Principle 7).
- Design review report and round confirmed: ARCH-REV-003 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `claude-sdk-client.ts` sets `includePartialMessages`. `ClaudeSdkStreamingSession.readContextUsage()` (summary detail, 2 s race, threshold only when `isAutoCompactEnabled`) feeds `ClaudeCallUsageTracker.observe` (reading → latest prompt / window / percent / threshold), which emits `claude_sdk_call`. The result observation carries no reading, so the fold's `latestReading` rule keeps the last call's reading. | — |
| BEH-002 | Confirmed | `ClaudeSession.handleFrame` awaits the tracker for `stream_event` and returns before `turnTracker.observe`. The fold's `claude_sdk_call` branch runs `recordClaudeSdkCall` (live sums) and the generic additive pricing. `reconcileClaudeSdkResult` contributes `max(0, delta − live)`, a restart admits 0, and live sums are consumed per session. The series-restart mark stays on the result path. The test with P4 frames and a 10 ms delayed read orders 4 calls before the result, with totals equal to `modelUsage`. | — |
| BEH-003 | Confirmed | `agy-stream-event-converter.ts` `agentResponse` emits `callUsage` on DONE with usage (`per_call`, `base_excludes_cache`, prompt = input + cache read, window null). The result usage mapping is removed. P8 shows usage only on `agent_response` DONE steps, summing to the cumulative result; P9 confirms resume uniqueness. | — |
| BEH-004 | Confirmed | `codex-thread-token-usage.ts`: prompt = `last.totalTokens`, and `reports_model_call` = last input + output > 0. In the fold, a non-advancing update with a reading is saved with `reports_model_call: false`; without a reading it is suppressed. The `contributes` gate keeps totals untouched, because the zeroed fields cover every `TOKEN_USAGE_TOKEN_FIELDS` entry. | — |
| BEH-005 | Confirmed (round 3: D-11 / AC-011) | `llm-phase.ts` reports `compactionTokenBudget?.triggerThresholdTokens ?? null`; this survived the merge (`llm-phase.ts:218`). The native bridge sets `reports_model_call: true`. Round 3 path: `llm-phase-summary-port.ts:165-177` reports each summary attempt (`autobyteus_compaction`, prompt and percent null, window present, no threshold) → the converter sets `context_reading_reset` for that ingestion kind only → the payload builder defaults the flag to `false` → `applyTokenUsageContribution` makes prompt and percent null for the latest reset observation, keeps the window and threshold (or takes the reported non-null values), and still counts the call, tokens, cost and revision → `hasCurrentPrompt` hides the context card until the next agent call reports a reading. | — |
| BEH-006 | Confirmed | `grok-build-call-usage.ts`: prompt = input + cache read + cache creation, `reports_model_call: true`. Grok is the only ACP profile, so no ACP usage producer is left without the flag. | — |
| BEH-007 | Confirmed | The strict contracts carry `revision`, the threshold and `reports_model_call`. The team and collaboration projectors map them. The web guards compare `revision`, and the team partial count increments only for model calls. Standalone roll-ups update only from fetches (`<` guard). | — |
| BEH-008 | Confirmed | The counting artefact is removed at the source, the aggregate's Claude read-time derivation is removed, and the Prisma migration clears pre-fix Claude readings. The panel shows the over-window mark with a clamped bar. Round 2: `legacyRowToCurrentPayload` gives `claude_agent_sdk` ledger rows null readings, so a direct upgrade from a ledger era no longer rebuilds them (CR-F-001 resolved). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-008 | User | User watching a run | Read the context fill | Token tab context card | Normal | adapter → fold → summary → meter | Runtime's own figure, marked if over the window | requirements; P1–P4, P7 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, BEH-003, BEH-007 | User | User watching a running member | Live usage | Token tab, running member | Normal | DS-001 / DS-003 → DS-004 | Usage, model and runtime after the first call | requirements; screenshot 16 | Supported Normal Scenario | Use |
| SCN-003 | BEH-001, BEH-002, BEH-004 | System | Runtime compaction | Runtime compacts | Context crosses the threshold | Normal | Claude remainder; Codex reading-only save | Totals include the summariser; the reading drops | P3, P6 | Supported Normal Scenario | Use |
| SCN-004 | BEH-003–BEH-006 | System | Runtime per-call usage | Each model call | Adapter event | Normal | DS-003 | Correct gross, cache and prompt | P5–P8 | Supported Normal Scenario | Use |
| SCN-CR-01 | DEC-005 (a), REQ-009, AC-002 | Operational | User upgrading an older install | Upgrade to this release from a ledger-era release (v1.3.77–v1.4.52) | Desktop/server startup: Prisma `migrate deploy`, then registered app-data migrations | Explicit Edge | `20260819…_add_token_usage_run_records` and `20261009120000_token_meter_context_readings` (clears an empty table), then `TokenUsageRunRecordsV1AppDataMigration` folds ledger rows through `legacyRowToCurrentPayload` (`latest_prompt_tokens` passed through, `legacy-token-usage-row.ts:290`), then `applyTokenUsageContribution` stores the last ledger reading | Pre-fix Claude turn-sum readings persist on consolidated rows, which are mostly finished runs that never receive a new call | `data_migration_guideline.md:122-124` ("every released source shape stays supported until a release explicitly declares a minimum upgrade-from version"); no such declaration exists; the existing test "normalizes direct-upgrade rows…" in `token-usage-run-records-v1-app-data-migration.test.ts:170`; ledger-era Claude prompt = turn-level `input + cache creation + cache read` since `fb3914b1c` (first tag v1.3.77); run records first in v1.4.53; implementation handoff § Known Risks acknowledges the path | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Pre-fix Claude readings survive a direct upgrade from a ledger-era release | SCN-CR-01; DEC-005 (a); REQ-009 / AC-002 | Operational upgrade within the supported range | Prisma clear runs before the consolidation, which re-imports ledger readings. Historical Claude runs show the multi-call sum, possibly over 100 %, permanently | See SCN-CR-01 | **Promote** → CR-F-001 (round 2: resolved) | A one-line disposition in the migration-owned legacy payload builder plus a test. No runtime code changes |
| C-02 | Accumulator imports `tokenUsageObservationContributes` from `token-usage-run-record-state.ts` (a fold internal) as well as the fold itself | Design boundary map (fold → record-state; accumulator → fold) | Engineering contract | Pure stateless predicate over the authoritative payload; no state bypass; the same rule the fold applies | `token-usage-run-accumulator.ts:6,54` | Promote as **non-blocking recommendation** | Optional: have the fold result expose `contributes`. No score below 9.0 |
| C-03 | A Codex update without `last` now yields no reading and no model call (previously the cumulative input) | BEH-004 | None at the pinned version | Codex 0.161.0 always sends `last` (P5–P7) | Probes | Reject | Technically possible but unsupported at the pinned contract; REQ-001 forbids deriving the value |
| C-04 | A Claude process crashing mid-turn leaves live sums pending, and the summariser tokens of that turn are not admitted | BEH-002 | Process crash | The resume result re-anchors and consumes the live sums | Handoff § Known Risks | Reject (accepted residual) | Infrastructure failure is out of scope by default; the bounded undercount is in the same class as the existing restart approximation |
| C-05 | `message_delta` without a paired `message_start` is dropped with a warning | BEH-002 | None observed | Its tokens still reach the turn-end remainder through `modelUsage` | P2 frame order | Reject | Not reachable in the observed SDK frame order; the totals invariant is still covered by the remainder |
| C-06 | The partial team aggregate merges `api_cost_status` and currency from non-call events | BEH-007 | Codex compaction or Claude result live event | Zeroed events carry the same priced status as calls (enriched payload or `applyPolicy`); the aggregate is replaced on refetch | `tokenUsageMeterStore.ts:139-215`; fold `zeroTokenUsageContribution` | Reject | No evidenced wrong display |
| C-11 (round 4) | The standalone roll-up refetch watched the host's `usageReportCount`. A reading-only save (Codex compaction) or a Claude turn-end remainder never changes it, so the standalone panel stayed stale | MP-02 / D-9; REQ-006 / AC-006, REQ-004 | Codex compaction or a Claude turn end while a standalone run is focused | `useTokenUsageWorkspaceScope.ts` watch → no `fetchStandaloneRunSummary` → stale roll-up | Code at `ab1265c7f`; the new panel test fails under the old rule | **Review gap, now resolved** by IR-004 | The watcher now keys on the host's exact `revision`. A D-9 freshness consumer my round-1 search missed (I searched `stores/`, `services/` and `components/` but not `composables/`); it was not caught in round 1 |
| C-12 (round 4) | The compaction mark could show the note over a fresh reading if that reading arrived before the "completed" status | AC-012 | Ordering of COMPACTION_STATUS vs TOKEN_USAGE on the live socket | Egress forwards both immediately and in order: only content is coalesced (`agent-stream-content-cadence-scheduler.ts`). For Claude the summariser emits no stream events and the next call follows `compact_boundary`; native summary usage precedes completion. Codex, which reports its reading before completion (P6), is excluded by runtime kind | Code; P3, P6; design D-13 | Reject | Not reachable for the in-scope runtimes. The reverse order clears the note early, which is the documented accepted residual RR-7 |
| C-13 (round 4) | A reconnect or history load could replay a completed compaction and mark wrongly | AC-012 scope limit | — | `handleCompactionStatus` runs only from live `dispatchAgentStreamMessage` (standalone, team, Org, collaboration); the server has no connect-time compaction snapshot | Code search | Reject | Not reachable |
| C-14 (round 4) | `tokenUsageMeterStore.ts` stays at 499 lines because `normalizedStatus` was condensed rather than by extracting the merge code | Size guardrail | Engineering contract | The marks went into a small owned file as the design allows; the merge extraction is follow-up R-3 (`project_task_7257984e-…`) | Line counts | Promote as **non-blocking note** | R-3 should land before the next change to the store |
| C-08 (round 3) | `context_reading_reset` is described as "server-internal", but the standalone agent socket forwards the whole payload, so the flag is visible there | D-11; strict live contracts | None: no consumer reads it, and the strict team and collaboration contracts do not carry it | Same existing whole-payload forwarding as `ingestion_kind`; no behavior consequence | Implementation handoff § Known Risks; contract tests pass with no `dist` diff | Reject | No consequence; the handoff records it |
| C-09 (round 3) | A failed summary attempt also hides the reading until the next call | AC-011 alternate outcome (approved) | Native compaction attempt failure | Unknown is shown, never a false value | requirements AC-011; design D-11 | Reject | Approved accepted edge |
| C-10 (round 3) | Window and threshold values are now converted with `nullableBigInt` even for non-latest observations | Fold robustness | None | The payload builder already normalizes these to non-negative safe integers (`asNonNegativeInt`) or null, so the conversion cannot throw | `agent-run-token-usage.ts` builder | Reject | Not reachable |
| C-07 | `claude-session.ts` (487) and `tokenUsageMeterStore.ts` (499) are near the 500-line limit; reconciler change is +137/−88 (>220 delta) | Size guardrail | Engineering contract | The reconciler rewrite is design-mandated and remains a single cohesive owner (258 lines). Both near-limit files are under 500. The query-options extraction is a verified pure move (getters `model`/`workingDirectory`/`permissionMode` read the same `sessionConfig`) | Line counts; diff | Reject as a finding (recorded pressure) | No action now. Future store growth should split by concern |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The contract gained exactly `reports_model_call` and the threshold; obsolete paths were removed; no new subsystem | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Fixtures rebuilt from P2/P3/P4/P6; P8 shape confirmed | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001–DS-005 traced in code; D-10 order preserved by the awaited pump, the dispatch queue and `serializeRun` | — |
| Ownership boundary preservation and clarity | Pass | The tracker owns pairing and emission; the fold owns accounting; the reconciler owns the Claude state; SDK access stays behind the session handle | — |
| Off-spine concern clarity | Pass | The context read is behind `readContextUsage`; pricing is unchanged | — |
| Existing capability/subsystem reuse check | Pass | Reconciler, fold, transports and contracts are extended; only the designed tracker is new | — |
| Reusable owned structures check | Pass | The flat reading group is kept per the design | — |
| Shared-structure/data-model tightness check | Pass | `claude_sdk_main_loop_usage` and `selectedDetails` removed; `usage_report_count` and `revision` are distinct | — |
| Repeated coordination ownership check | Pass | One fold owner for the call, reading and contribution rules | — |
| Empty indirection check | Pass | `claude-session-query-options.ts` owns option assembly (a moved concern, not a pass-through) | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | No cycles; the tracker never touches the turn tracker | — |
| Authoritative Boundary Rule check | Pass (non-blocking note) | C-02: the accumulator imports one pure predicate from record-state | Optional: expose `contributes` on the fold result |
| File placement check | Pass | The new files sit in `backends/claude/session/` | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `readContextUsage`, `claude_sdk_call` key and `reports_model_call` are singular | — |
| Naming quality and naming-to-responsibility alignment check | Pass | — | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | Main-loop type, validator and field, `selectedCacheSplit`, AGY result mapping, aggregate Claude branch and `selectedDetails` removed; repository search finds only a negative test assertion. The deferred projector `stream_event` path is listed as follow-up per the design | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The D-10 delayed-read test asserts order and totals; R-001 transcript equality; P6 reading-only revision | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `tests/fixtures/claude-sdk-usage/claude-sdk-probe-frames.ts` | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Obsolete main-loop and context-summary tests removed | — |
| API/E2E readiness for the next workflow stage | Pass | Round 2: CR-F-001 is resolved and covered by a consolidation test. API/E2E hints are in the implementation handoff | — |
| Round 4: D-12 revert and D-13 re-audit | Pass | D-12: an exact revert of IR-003; the upstream test is adapted to "reading kept" (911,000 / 91.1 %, window and threshold, 2 calls, totals and cost, revision +1, next call replaces); a converter case checks that compaction is a model call. D-13: the marks have one owner (`createTokenUsageCompactionMarks`, instantiated by the meter store, which owns summaries); a pure read, safe in `computed`; the trigger fires only on a newly completed operation (failed, stopped and repeated completions are excluded); the panel scopes by runtime kind and keys by the card's run (the host for a roll-up); the over-window mark is hidden while the note shows. No server, storage or contract change; en and zh-CN strings. The store, handler and panel tests cover mark, clear, Team member, no-summary-yet, repeat and new operation, and Codex no-note | — |
| Round 3: D-11 re-audit (ownership, interface, data-model tightness, dead code, tests) | Pass (superseded: D-11 withdrawn in SR-009 / SR-010 and reverted in IR-004) | The adapter owns the meaning (the converter maps the ingestion kind to the explicit fact); the fold has no ingestion-kind branch; one singular field with a safe default; the shared live contracts are unchanged; the upstream test is adapted, not weakened (its assertions are kept, plus revision, restore and converter cases). A mutation that disables the rule fails 2 of 3 cases (per the implementer) | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | 499 | Pass (at limit) | Pass (+12/−5) | Pass | Pass | Pressure | Split by concern on next growth |
| `…/claude/session/claude-session.ts` | 487 | Pass | Pass (+28/−40) | Pass | Pass | — | — |
| `…/claude/client/claude-sdk-client.ts` | 460 | Pass | Pass | Pass | Pass | — | — |
| `…/workspace/usage/TokenUsageMeterPanel.vue` | 431 | Pass | Pass | Pass | Pass | — | — |
| `…/token-usage/projections/claude-sdk-model-usage-reconciler.ts` | 258 | Pass | Flag (+137/−88), justified | Pass (single owner; design-mandated rewrite) | Pass | — | — |
| `…/claude/session/claude-call-usage-tracker.ts` (new) | 106 | Pass | Pass | Pass | Pass | — | — |
| `…/claude/session/claude-session-query-options.ts` (new, pure move) | ~45 | Pass | Pass | Pass | Pass | — | — |
| Other changed source files | ≤ 380 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The tolerant reconciler decoder is the design-approved generic reader |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Round 2: DEC-005 (a) is applied at both migration boundaries that produce run records (the Prisma SQL clear and the ledger consolidation) |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The ledger-era knowledge stays inside the registered `token-usage-run-records-v1` migration |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | The second disposition point is recorded in the handoff as within DEC-005 intent |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None in changed scope. The out-of-scope follow-ups (the `claude-text-segment-projector.ts` partial path and the stale `generated/graphql.ts` drift) are recorded in the handoff.

## Docs-Impact Verdict

- Docs impact: `Yes`, and done. `token_usage.md` has its adapter, fold and compaction sections rewritten, with the RR-3 note. Pricing sections are untouched (REQ-011).
- Why: semantics changed for Claude, AGY, Codex and Grok, and for the fold rules.
- Files or areas likely affected: `autobyteus-server-ts/docs/modules/token_usage.md`. `origin/personal` changed the same file (+34 lines) since the base, so delivery must integrate it.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-01 (per-call vs result order) | Confirmed | D-10 implemented; the delayed-read test passes |
| MP-02 (non-call observations must update the live meter) | Confirmed | Revision guards; reading-only save; team partial count |
| MP-03 (non-first-party Claude pricing) | Confirmed (unsupported, non-blocking) | — |
| MP-04 (strict contracts) | Confirmed | Schemas updated; `dist` in sync; contract tests pass |

### `CR-MP-01` — Ledger-era Claude readings are consolidated after the Prisma clear

- Origin: `New`
- Related approved requirement or established contract: DEC-005 (a); REQ-009 / AC-002; `data_migration_guideline.md` § supported upgrade range.
- Relevant behavior ID(s): BEH-008
- Coherent product goal or governing event: a user on an older release upgrades the app; history must show truthful values.
- Scenario validity: `Supported Explicit Edge Scenario`
- Initiating basis kind: `Operational` / `Contract`
- Independent trigger or governing contract: the supported-upgrade-range rule; no minimum upgrade-from version is declared.
- Support evidence:
  - The guideline, lines 122–124.
  - The registered `TokenUsageRunRecordsV1AppDataMigration`, with its direct-upgrade test.
  - Claude ledger readings existed from v1.3.77 (`fb3914b1c`), computed as turn-level input + cache creation + cache read.
- Forward path: startup → Prisma migrations (the clear runs on an empty `token_usage_run_records`) → app-data consolidation → `legacyRowToCurrentPayload` (passes `latest_prompt_tokens`, window and percent for every runtime) → `applyTokenUsageContribution` (`latestReading`) → persisted Claude row with a pre-fix reading.
- Lifecycle preconditions and material consequence: the install holds ledger rows from v1.3.77–v1.4.52. Consolidated finished Claude runs keep the multi-call-sum reading indefinitely, which is the artefact REQ-009 forbids and DEC-005 (a) clears.
- Reachability: `Reachable`
- Review consequence / proportionate response: CR-F-001, a `Local Fix` in the migration-owned builder. Resolved in round 2 (IR-002, `f78921e5f`).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001–DS-005 are clean in code; D-10 is enforced and tested | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.0 | The tracker, fold and reconciler have clear owners; SDK access goes through the handle | C-02: the accumulator reaches one record-state predicate | Expose `contributes` on the fold result (optional) |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Two explicit contract facts; `revision` is separate from the call count; strict DTOs are aligned | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.0 | The tracker and query-options extraction are well placed | The store is at 499 lines | Split the store by concern before further growth |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | Main-loop field and `selectedDetails` removed; one meaning per field | — | — |
| `6` | `Naming Quality and Local Readability` | 9.5 | `ClaudeCallUsageTracker`, `reports_model_call`, `tokenUsageObservationContributes` | — | — |
| `7` | `API/E2E Readiness` | 9.0 | Strong fixture coverage; checks green. Round 2 adds a consolidation test for the direct-upgrade path | Live and desktop runs are still pending (API/E2E stage) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.0 | Totals, order, reading rules, Codex and AGY are correct for the runtime paths | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut removal; tolerant reader only | — | — |
| `10` | `Cleanup Completeness` | 9.0 | Obsolete paths removed. Round 2: DEC-005 is applied at both migration boundaries | Follow-ups (dormant projector path, `generated/graphql.ts` drift) are recorded but out of scope | — |

## Findings

No open findings.

### CR-F-001 — DEC-005 clear is bypassed on a direct upgrade from a ledger-era release

- **Round 2 status: Resolved** (IR-002, `f78921e5f`). Verified:
  - `legacyRowToCurrentPayload` nulls the prompt, window and percent only when `runtime_kind === "claude_agent_sdk"`. Totals, costs and counts are unchanged.
  - The consolidation validation does not compare readings, so it still succeeds.
  - The new test consolidates a released ledger and asserts the outcome. The Claude row (reading 402.5 %) ends with null readings, exact totals and one report. The Codex row keeps 92,942 / 258,400 / 35.97.
  - The handoff records both disposition points. `token_usage.md` has one sentence. No runtime code changed.
- Severity: Medium (was blocking in round 1)
- Classification: `Local Fix`
- Protects: DEC-005 (a) (user-approved disposition), REQ-009 / AC-002 (no counting artefact above 100 %), BEH-008; `data_migration_guideline.md` § supported upgrade range.
- Candidate / premise: C-01, CR-MP-01 (Supported Explicit Edge Scenario, Reachable).
- Evidence:
  - The clear in `prisma/migrations/20261009120000_token_meter_context_readings/migration.sql` runs during Prisma deploy, before the registered `TokenUsageRunRecordsV1AppDataMigration`.
  - `legacy-token-usage-row.ts:290-292` copies the ledger `latest_prompt_tokens`, `effective_context_window_tokens` and `context_window_usage_percent` for every runtime kind.
  - `applyTokenUsageContribution` stores the latest ledger reading.
  - Ledger-era Claude rows (releases v1.3.77–v1.4.52) carry turn-level sums.
  - The implementation handoff's Known Risks names this path and chose "no machinery". That choice contradicts the approved DEC-005 disposition within the supported upgrade range.
- Required action:
  1. In the migration-owned `legacyRowToCurrentPayload`, give `claude_agent_sdk` ledger rows `latest_prompt_tokens`, `effective_context_window_tokens` and `context_window_usage_percent` = `null`, the same disposition as the Prisma clear. Totals, costs and counts stay unchanged.
  2. Extend `tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts`, or the legacy fold test, with a ledger Claude row that carries a reading. Assert null readings on the consolidated row, unchanged totals and counts, and that a non-Claude row keeps its reading.
  3. Update the handoff: remove the "no machinery" risk and record this second disposition point as a deviation within DEC-005 intent. No runtime code knows about pre-fix rows, so the design's current-only rule holds.
- Why proportionate: one conditional plus one test, both inside an existing registered migration owner. Old shapes stay inside migrations, and no runtime branch is added.

### Non-blocking recommendations

- C-02: consider returning `contributes` from `foldTokenUsageObservation`, so the accumulator depends only on the fold boundary.
- Store size pressure: `tokenUsageMeterStore.ts` is at 499 effective lines.

### Non-blocking recommendations (round 2 status)

Both remain open and non-blocking. The implementation engineer kept the Local Fix minimal.

## Classification

N/A — Pass. Round 1 was a `Local Fix` (CR-F-001), now resolved.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary). `/software_engineering_team/implementation_engineer` receives an informational pass notification.

## Residual Risks

- RR-1 (accepted), RR-3 (docs note present), RR-4 (identity tradeoff) and RR-5 (fixtures) are unchanged. RR-2 is verified by P9.
- A Claude crash mid-turn leaves a bounded undercount of that turn's summariser tokens (accepted, C-04).
- Integration (SR-006 / AF-16): `origin/personal` has moved to the gemini-native-cache-hit merge, which conflicts in `agy-stream-event-converter.ts` and also changed `token_usage.md`. Delivery should resolve both in favor of D-5 and keep the upstream catalog prices.
- `generated/graphql.ts` base drift (only token-usage hunks applied) is a recorded follow-up.
- Live Claude, Codex and AGY E2E and desktop verification are not yet run (API/E2E and delivery).

## Latest Authoritative Result

- Round 4 (CRR-005, IR-004 / D-12 + D-13): `Pass`. No open findings.
  - Score 9.3 / 10; every category ≥ 9.0.
  - Behavior basis: BEH-005 is re-confirmed as D-12 (the reading is kept through native compaction, and compaction calls are counted with their tokens and cost). AC-012 is confirmed for native and Claude SDK; Codex and AGY show no note.
  - Recorded review gap (C-11): the round-1 review missed the standalone refetch watcher in `composables/`, which still used `usageReportCount`. IR-004 fixed it with a mutation-checked test.
  - Next: validation of the D-12/D-13 scope, including a standalone Codex reading-only refetch. AC-011 and AC-012 user checks follow, then delivery.
- Round 3 (CRR-004, IR-003 / D-11): `Pass` (superseded; D-11 withdrawn and reverted). No new findings. Score 9.3 / 10, unchanged; every category ≥ 9.0. `token-usage-run-record-state.ts` is now 205 effective lines. Next: affected-scope API/E2E validation per SR-008, then delivery resumes. AC-011 (user checks a native compaction in the desktop app) remains with delivery. The worktree also holds uncommitted Solution Designer and architecture edits (SR-008 / ARCH-REV-004 artifacts) for delivery to commit.
- Review Decision: `Pass` (round 3, CRR-004; round 2, CRR-002)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (CR-MP-01 was Reachable; its finding CR-F-001 is resolved)
- Score Summary: 9.3 / 10; every category is ≥ 9.0.
- Failure Origin (when applicable): N/A
- Recommended Recipient (when applicable): `/software_engineering_team/api_e2e_engineer`
- Notes:
  - The runtime implementation is sound and well tested.
  - DEC-005 now holds across the supported upgrade range.
  - Task size `Large` and architectural risk `High` are preserved.
  - For API/E2E:
    - run the deterministic `tests/e2e` token-usage and migration suites;
    - run the opt-in live Claude (including auto-compaction), Codex and AGY suites;
    - check the meter live for team, delegated and Org members;
    - migrate a copy of a released-shape profile.

    See the implementation handoff § API / E2E.
