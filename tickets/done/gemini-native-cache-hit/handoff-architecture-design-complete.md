# Handoff — Architecture Design Complete (gemini-native-cache-hit)

- Result: `Architecture Design Complete`
- Package identifier: `gemini-native-cache-hit`
- Current solution revision: `SR-002`
- Classification: `task_size = Small`, `architectural_risk = Low` (rationale in `design-spec.md` › Task Size And Architectural Risk)
- Route applied: handoff rule "Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (direct implementation; no independent architecture review). Architecture review artifacts: `N/A — not applicable`.

## Original Request

A Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-09: "Raise the Gemini cache hit on the native AutoByteus runtime toward what the Antigravity (AGY) CLI runtime achieves." The task's done-when conditions were:

- the gap is explained;
- native is comparable to AGY on the same model;
- the Token Meter prices cached Gemini input correctly;
- the work is covered by tests and verified by the user.

## Outcome Of Investigation (Live Evidence)

- The native Gemini runtime is correct. It uses a stable prefix and reaches 92–95% warm hit when the exact production requests are replayed.
- The apparent gap comes mostly from **AGY usage ingestion**. AGY's `input_tokens` excludes cache reads, but we ingest it as `gross_includes_cache`. That clamps miss to 0 (a fake ≈99% hit) and drops cache reads from gross. On the corrected basis, AGY 3.8 Flash high is 86.6% against native's 83.2%.
- **The Gemini 3.1 Pro catalog prices are wrong.** The catalog has 2.25/0.225/18 and 4.5/0.45/27; Google's official prices are 2.00/0.20/12 (≤200K) and 4.00/0.40/18 (>200K).

## Approved Scope (user approval 2026-10-09: "just fix them in this ticket")

1. REQ-002: AGY usage is declared `input_token_semantic: "base_excludes_cache"` in `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` (around line 230).
2. REQ-004: Gemini 3.1 Pro Preview prices in `autobyteus-ts/src/llm/supported-model-definitions.ts` (around lines 295–312) are set to base `pricing(2.0, 12.0, {cachedInputReadTokenPricing: 0.2})`, tier `prompt_le_200k` 2.0/12.0/0.2, tier `prompt_gt_200k` 4.0/18.0/0.4. 3.8 Flash stays unchanged.
3. REQ-005: Fix-forward. Existing stored rows are not rewritten and there is no migration.
4. Focused unit tests (see design › Final File Responsibility Mapping), including:
   - a ledger case where AGY usage of input 6,110 and cache_read 307,003 gives gross 313,113 and miss 6,110;
   - a spanning-series fold case with an old-shape checkpoint (accounting = reported, miss = standard = 0) that must not be flagged as regressed;
   - a catalog test of the 3.1 Pro tier values, with 3.8 Flash unchanged.

Out of scope: native Gemini runtime changes, explicit context caching, AGY model pricing, historical repair, the Anthropic caching Task (`e08c9081`), and the Claude Agent SDK Token Meter Task (`cb40258d`).

## Constraints

- Do not change `resolveTokenUsageComponentBasis`, the run fold, or `GeminiLLM`.
- No version-specific or AGY-specific branch in the token-usage domain.
- Never commit credentials. The isolated lab vault at `~/.autobyteus/investigations/gemini-cache-lab/` is outside the repository. The probe script `probes/gemini-cache-lab.mjs` needs `LAB_DATABASE_URL`; it is evidence and optional for validation.
- Follow `TESTING.md`: focused `autobyteus-ts` and `autobyteus-server-ts` unit tests, plus `pnpm -C autobyteus-server-ts typecheck`.
- AC-003 (live AGY check through the Token Meter) is for user verification later.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit`, branch `codex/gemini-native-cache-hit`
- Base: `origin/personal` @ `927796780562482b900926fa7ab0d50109820e01`; finalization target `origin/personal`
- Dependencies are installed and the server dist is built (from the investigation).

## Artifacts (absolute paths)

- Requirements (Approved, SR-002): `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/solution-revision-record.md`
- Evidence probes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/probes/`
- Architecture review artifacts: `N/A — not applicable` (direct route)

## Open Risks

- AGY conversations spanning the upgrade get a one-time miss catch-up, and their pre-upgrade cache reads stay out of gross (accepted fix-forward).
- A future AGY CLI usage-format change.

## Next Expected Action

Implementation Engineer implements the two fixes and their tests, then proceeds per its own workflow and handoff rules.
