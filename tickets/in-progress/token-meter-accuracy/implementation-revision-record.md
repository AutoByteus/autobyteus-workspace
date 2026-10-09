# Implementation Revision Record — token-meter-accuracy

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass, `design-review-report.md`, round 3 | N/A | `Initial Baseline` | SR-005, ARCH-REV-003 | Implementation complete; local checks green; ready for Code Review |

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
