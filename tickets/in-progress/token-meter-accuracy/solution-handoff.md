# Solution Handoff — token-meter-accuracy

- Result: `Architecture Design Complete`
- Package identifier: `token-meter-accuracy`
- Request: Project Task `project_task_cb40258d-0311-4675-bdd4-8ff49253b576` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Current solution revision: `SR-005` (round 3 after ARCH-REV-002)
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy`, branch `codex/token-meter-accuracy`, base `origin/personal` @ `927796780`, finalization target `origin/personal`
- Classification: `task_size = Large`, `architectural_risk = High` (rationale in `design-spec.md` § Task Size And Architectural Risk)
- Route applied: handoff rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`

## Original Request (summary)

Token Meter accuracy, observed on Claude Agent SDK, suspected to be a general module problem. (A) "Latest prompt" context fill shows 97 % and sometimes >100 % without compaction; (B) a running delegated team member shows 0 tokens, unknown model/runtime, 0 model calls. Review the module end to end, find shared root causes, explain compaction per runtime, fix across runtimes (Claude Agent SDK, native AutoByteus, Codex, Antigravity) and run kinds (standalone, team member, delegated, Org). Coordinate with the Anthropic and Gemini caching tasks on shared meter code. Done when the latest prompt is true on every runtime, running members show usage/model/runtime, tests cover it, and the user verifies in the desktop app.

## User Direction And Approval

- 2026-10-09: "We should use the statistics from the agent SDK itself" / "use their data as much as possible … you need to do enough experiments" → REQ-001.
- 2026-10-09 approval: "I trust your decisions … decisions should be reflecting the truth … I will approve your reasonable decisions and then use the design principles to work on it now." → requirements Approved (SR-002); DEC-001–DEC-005 delegated to evidence.
- SR-003: DEC-002 revised from (a) to (b) under that delegation on evidence AF-10. Auxiliary Haiku is 0.03 % of Claude SDK spend but present in 290/314 runs and unpriced in the catalog, so including it would make nearly every run's cost partially unpriced. Reported to the user with this result.

## Root Causes (evidence: investigation notes P1–P8, AF-01–AF-15)

1. Claude SDK latest prompt = `result.usage`, which the SDK documents and our probe P1 proves is the **sum of every main-loop call in the turn**. 197 of 341 user runs show >100 % (max 6,759 %).
2. Claude SDK and Antigravity usage only at turn end. On the user's delegated SD, the first record appeared 4.5 minutes and ~60 tool calls after start. Attribution itself is correct.
3. Antigravity input misread as cache-inclusive (cache reads 75.7 M vs "gross" 5.2 M).
4. Codex post-compaction update stores nothing (input 0, total = new context size).
5. Shared module cause: the observation contract does not distinguish "model call", "reconciliation" and "context reading". The fold counts every observation as a call and lets a null reading erase the latest one.

## Compaction Per Runtime (for the user explanation)

Claude SDK: threshold = window − 33k (Opus 5.5: 967,000 / 1M = 96.7 %), checked before each prompt; a failed attempt can leave the context legitimately above it (P3). Codex: at turn start when the previous context ≥ limit (≈ 90 % of 272k; not reported). Antigravity: internal, not reported. Native: 80 % × input budget when enabled. The user's "~80 %" matches native, not the Claude SDK.

## Design Summary

See `design-spec.md` D-1…D-8: Claude per-call usage from SDK `message_delta` (with `includePartialMessages`, stream events consumed before the turn tracker) plus the SDK's own `getContextUsage` reading. The turn-end result contributes only the `modelUsage` remainder (SDK compaction calls). An explicit `reports_model_call` fact and a "reading present" rule are added in the fold. Antigravity moves to per-step usage with base-excludes-cache. Codex uses `last.totalTokens`. Grok gets a latest prompt. Native reports its compaction threshold. A new nullable `context_compaction_threshold_tokens` column is added, with a one-time clear of pre-fix Claude readings. The meter gets a threshold marker and an overflow mark.

## Coordination / Ownership (REQ-011)

Pricing catalog values and `TokenCostCalculator` stay with the Anthropic prompt-caching task (`worktrees/anthropic-prompt-caching`) and the Gemini caching task (`worktrees/gemini-native-cache-hit`, no artifacts yet). This task owns runtime usage adapters, the observation contract, fold/reconciler/analytics counting, latest-context fields and the meter context card. `docs/modules/token_usage.md`: this task edits the adapter/fold sections only. The Project Task Manager should relay this split to those tasks.

## Artifacts (absolute paths)

- Requirements (Approved, SR-003): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/solution-revision-record.md`
- Probes and raw outputs: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/probes/`
- User screenshots: `…/user-16-running-member-zero.png`, `…/user-17-latest-prompt-97.png` (same folder)
- Prior architecture review artifacts (round 1, reviewed SR-001–SR-003): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/architecture-review-revision-record.md`

## Open Risks

R-001 partial-message frames vs text projection; R-002 double counting between per-call and turn-end; R-003 overlap with caching tasks. Mitigations are in the design spec.

## Round 2 Changes (SR-004)

- ARCH-F-001 → D-9: run summaries carry `revision` (Σ record revisions; the fold increments it on every save). The web store guards use `revision`; the team live-partial aggregate counts only `reports_model_call` events. Store, DTO, GraphQL and aggregate files are mapped, with a Codex compaction example.
- ARCH-F-002 → D-10: awaited per-call emission inside the awaited frame pump; emission order = dispatch order = fold order; session test with P4 frames and a delayed context read.
- RR-1 position: no extra guard. Non-first-party Claude routes are not a supported AutoByteus configuration, and per-call pricing is by exact Anthropic catalog identity. RR-2: validation item. RR-3: docs note. RR-4/RR-5: accepted and covered.

## Round 3 Changes (SR-005)

- ARCH-F-003: the strict shared contract schemas (team-stream run summary DTO, presentation run summary DTO, presentation live `token` event) are mapped with their tests. A contracts-first step rebuilds their `dist` before the server and web steps, and a web mapper test is added.

## Next Expected Action

Independent architecture review round 3 of the package above.

## Review Outcome

- ARCH-REV-003 (SR-005): **Pass**. ARCH-F-001, ARCH-F-002 and ARCH-F-003 resolved (report: `design-review-report.md`). The architecture reviewer forwarded the cumulative package to `/software_engineering_team/implementation_engineer` (delivery confirmed). Informational; no further Solution Designer handoff.

## Integration Note For Delivery (SR-006, AF-16)

`origin/personal` now contains gemini-native-cache-hit (3913a75d6, 033a6d780). When integrating:
- resolve the single conflict in `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` in favor of this branch (per-step `base_excludes_cache` usage; the result emits no usage);
- adapt the upstream converter test that asserts result-usage semantics to per-step usage;
- keep the upstream fold test and the Gemini 3.1 Pro catalog prices.
