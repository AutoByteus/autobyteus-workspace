# API/E2E Test-Case Ledger — token-meter-accuracy

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy` (HEAD `f78921e5f` at start)
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: many independent cases, long live runs (Claude auto-compaction, desktop builds) and interruption risk.
- Last updated: 2026-10-09

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | Direct model-call fixtures carry `reports_model_call` (5 files, 15 cases) | AC-009, D-4 | GraphQL + SQL (deterministic) | `vitest run tests/e2e/token-usage` | 1 | Fixture update |
| E2E-002 | Claude per-call + remainder → SQL → GraphQL (P4, P3 frames through the real tracker) | AC-001, AC-002, AC-004, AC-008 | Tracker → accumulator → SQL → GraphQL | `vitest run tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts` | 2 | Replaces 2 stale cases |
| E2E-003 | Ledger-era Claude row consolidated → null readings via GraphQL | DEC-005, CR-F-001 | Real app-data migration + GraphQL | `vitest run tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | 3 | Added assertion |
| R-04..R-06 | Unit/integration/web/contract regression gates | all | Repository | see investigation | 4 | |
| LIVE-001 | Claude streaming lifecycle: every turn counted once (per-call + remainder + restart) | AC-003, AC-004, D-10 | Real Claude CLI/SDK through the server session | `RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` | 5 | |
| LIVE-002 | Real Claude/Codex turn → WS + GraphQL (Claude per call, live before idle, reading = last call prompt; Codex `last.totalTokens`) | AC-001, AC-003, AC-006 | Real runtime + WS + GraphQL | `RUN_RUNTIME_TOKEN_USAGE_E2E=1 vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts -t "codex|claude"` | 6 | |
| LIVE-003 | Claude auto-compaction: remainder carries the summariser, no extra call | AC-004, SCN-003 | Real Claude CLI | `RUN_CLAUDE_E2E=1 RUN_CLAUDE_AUTO_COMPACTION_E2E=1 …` + usage probe | 7 | ~300K haiku tokens |
| LIVE-004 | Codex compaction: reading-only save (post-compaction size, same call count, revision +1) | AC-006 | Real Codex app server | probe with a lowered `model_auto_compact_token_limit` | 8 | |
| LIVE-005 | AGY per-step usage: gross = input + cache read; latest prompt; per-call count | AC-005 | Real AGY CLI | live probe through the server | 9 | |
| DESK-001 | Standalone Claude run in the real app: meter live mid-turn, latest prompt = SDK reading, threshold label | AC-001, AC-003, AC-008 | Isolated desktop (worktree build) | `isolated-app start --build` + CDP | 10 | |
| DESK-002 | Team member / delegated copy / Org member mid-turn meter | AC-003, REQ-008 | Isolated desktop | same instance | 11 | |
| DESK-003 | Released 1.4.99-beta.8 profile → worktree build: Claude readings cleared, totals intact, continued run refreshes | DEC-005, BEH-008, AC-009 | Isolated desktop on an owned data root | `isolated-app start --app /Applications/AutoByteus.app --data-root …`, then the worktree build | 12 | |

## Round 2 Planned Cases (API-REV-002)

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R2-GATE | Repository gates on the merged base | all, AC-011 unit, AC-012 unit | Repository | see investigation § Round 2 | 1 | — |
| LIVE-006 | Native LM Studio compaction: call counted, reading kept, frame order | AC-011, D-12, D-13 risk | Studio server + real native runtime + LM Studio | new gated E2E | 2 | — |
| LIVE-R2 | Claude/Codex live token paths on the merged base | AC-001, AC-003, AC-004, AC-006 | Live E2E | existing suites | 3 | — |
| DESK-004 | Note / no-note / D-9 roll-up in the packaged app | AC-011, AC-012, REQ-012, D-9 | Isolated desktop (temp CODEX_HOME) | `isolated-app start --build` | 4 | — |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01/R-02 | 2026-10-09 13:58 | Completed | `vitest run tests/e2e/token-usage tests/e2e/app-data-migrations` on branch and base (both built) | Branch = base except changed contract | Branch: 22 failures. Base: 5 (the same 5 app-data-migration cases also fail on the branch) | Fail (expected pre-update) | `api-e2e-evidence/logs/e2e-initial-*.log` | E2E-001/002/003 updates; Rule 9 investigation of the 5 base failures |
| 2 | E2E-001 | 14:00 | Completed | `reports_model_call: true` added to direct model-call fixtures; `vitest run tests/e2e/token-usage` | 15 cases pass with unchanged assertions | Pass | Pass | `api-e2e-evidence/logs/R03-e2e-token-usage-migrations.log` | — |
| 3 | E2E-003 | 14:00 | Completed | Ledger Claude row added to the real consolidation case | GraphQL: Claude readings null, totals exact, count 1; Codex ledger reading kept | Pass | Pass | same | — |
| 4 | Baseline (analytics) | 14:05 | Completed | Analytics cleanup clears all facets; `--sequence.shuffle.files --sequence.seed=3` | Analytics passes in any file order | Base fails 2 cases with seed 3; branch passes seeds 1–4 | Pass | commit `7f27bbbf5` | — |
| 5 | E2E-002 | 14:10 | Completed | Replaced Claude SDK GraphQL E2E (3 cases); mutation checks | P2 per-call + zero remainder; P3 summariser remainder; migrated record refresh | 3/3 pass. Mutation "remainder without live subtraction" → 2 fail (caught). Mutations "result counts as call" / "result carries the turn sum" survive because the reconciler independently nulls the result's call flag and readings (defence in depth) | Pass | commit `0a5290aa8` | — |
| 6 | R-03..R-06 | 14:20 | Completed | E2E token-usage + migrations; typecheck; server unit (11 dirs); integration token-usage; contract packages; web token-usage specs | Green except the known base failures | E2E 39/44 (5 base); typecheck clean; unit 2,135 pass / 6 skipped; integration 24/24; contracts 17/17 + 10/10; web 220/220 | Pass | `api-e2e-evidence/logs/R0*.log` | — |
| 7 | Baseline (Org continuation) | 14:25 | Completed | Fixture uses `beginPreparation` via `createBackendPreparation` | Both cases pass | Base fails (`factory.beginPreparation is not a function`); fix passes on base copy and branch | Pass | commit `97e46624c` | — |
| 8 | Baseline (TeamRun V1 upgrade) | 14:30 | Completed | Diagnosis only | — | Later `agent-org-flat-team-families-v1` migration moves the converted package to `memory/agent_orgs/<id>/agent_org_run_execution_tree.json`; the test still asserts the TeamRun V2 intermediate (+4 ledger rows; restoreAgentTeamRun). Unrelated to token usage; too large for this change | N/A (reported) | `api-e2e-evidence/logs/e2e-initial-base.log` | Report to owner as a separate item |
| 9 | LIVE-001 | 14:45 | Completed | `RUN_CLAUDE_E2E=1 vitest run …claude-agent-streaming-session-lifecycle.e2e.test.ts -t "counts every completed turn"` after harness baseline fix | Calls counted live; result remainder only; restart rebaselines; D-10 order | Pass on PATH CLI 2.1.295 and SDK-bundled CLI. Per-turn: calls + remainder = SDK delta; restart turns `[call, null]` + `claude_sdk_series_restart_rebaselined` | Pass | `api-e2e-evidence/logs/LIVE-001-claude-lifecycle-usage.log`; commit `ccb52b171` | Full lifecycle file running (R-001 frame-mix regression) |
| 10 | LIVE-001b | 14:55 | Completed | Whole `claude-agent-streaming-session-lifecycle.e2e.test.ts` (RUN_CLAUDE_E2E) | R-001: partial messages do not change lifecycle behavior | 16/16 pass on both CLIs (turns, mid-turn input, Stop, terminate, crash, restore, image) | Pass | `logs/LIVE-001b-claude-lifecycle-full.log` | — |
| 11 | DESK-001 | 15:15 | Completed | Isolated worktree build `iso-50464-4235`; Opus 5.5; drive-run + UI sampling | Live per-call meter; reading = SDK; threshold | UI Running 3 → 4 calls (19,882 → 19,984); Idle 5 / 20,086 of 1,000,000, "Auto-compacts at 967.000"; result after the last call; totals 99,639 = Σ calls | Pass | `desktop/DESK-001-*` | — |
| 12 | DESK-003 | 15:00–15:45 | Completed | Installed 1.4.99-beta.8 on an owned data root (`iso-49868-6032`), then the worktree build on the same root (`iso-53133-0ae8`), restart | Claude readings cleared; totals intact; continued run refreshes; relaunch no-op | Released turn-sum 83,608 → NULL; 85,092 / 1 / rev 1 kept; Codex 11,251 kept; continued Claude 4 calls + rebaselined result, 170,599; Codex 11,213 = last.totalTokens; relaunch identical | Pass | `desktop/DESK-003-*` | — |
| 12b | DESK-002 | 15:30–15:40 | Completed | Team member / team delegated copy / Org member on `iso-50464-4235` | Live within one call; strict contracts | Team member UI Running 3 calls; 5/5 team frames strict-parse; copy first call 4.8 s, summaries 0 → 3 mid-turn; Org 5/5 presentation frames strict-parse, revision 4 → 5 on the result | Pass | `desktop/DESK-002-*` | Org/copy UI mid-turn pending → DESK-002b |
| 13 | LIVE-002 | 15:55 | Completed | `RUN_RUNTIME_TOKEN_USAGE_E2E=1 … -t "codex-app-server\|claude\|Claude"` after the Studio-server rework | Claude per call + reading; Codex last.totalTokens; multi-call live | 3/3 pass (LM Studio spec skipped) | Pass | `logs/LIVE-002-*.log`; commit `9b4ad5d4d` | — |
| 14 | LIVE-003 | 16:05 | Completed | `RUN_CLAUDE_E2E=1 RUN_CLAUDE_AUTO_COMPACTION_E2E=1 … -t "pairs every auto compaction"` | Summariser in the remainder; totals = SDK modelUsage; reading drops | Failed compaction turn remainder 83,594; completed compaction remainder 183,805, no extra call; reading 181,307 → 12,191; Σ = cumulative | Pass | `logs/LIVE-003-*.log`; commit `81703b021` | — |
| 15 | LIVE-004 / LIVE-005 | 16:15–16:30 | Completed | Codex compaction suite (temp `CODEX_HOME`); AGY multi-step + cached turn on the isolated build | Reading-only save; AGY gross = input + cache read | Codex 41,095 / 64,507 readings, delta 0, count unchanged, revision +1; AGY 4,426 + 77,693 = 82,119, run 128,325 + 155,377 = 283,702; UI "context limit unavailable" | Pass | `logs/LIVE-004-*.log`, `live/LIVE-005-*`; commit `e7f9da408` | — |
| 16 | DESK-002b | 16:50 | Completed | Rebuilt instance `iso-54042-ac01`; Org manager and an Org-hosted delegated copy watched in the UI | Mid-turn UI for Org member and copy | Org manager Running 1 → 4 calls with readings, Idle 5; copy 0/unknown → after the first call 1 call, model and runtime → 4 Running → Idle 5 | Pass | `desktop/DESK-002b-*` | — |
| 17 | R-07 / cleanup | 16:40–17:00 | Completed | Final deterministic gate; stop owned instances; remove owned worktrees, data root and temp workspaces | Only known base failures; clean | 41 pass / 28 skipped / 3 base TeamRun V1 fail; all owned resources removed; foreign instances untouched | Pass | `logs/R07-final-e2e-gate.log` | — |
| 18 | R2-GATE | 2026-10-12 06:00–06:20 | Completed | E2E token-usage + app-data-migrations; server unit/integration; typecheck; web; contracts on HEAD `352ba13ee` | Green except known base cases | E2E 48/51 (3 TeamRun V1 base); unit 2,252; integration 24/24; web 485/485; contracts pass | Pass | `round2/logs/R2-*.log` | — |
| 19 | LIVE-006 | 06:15–06:45 | Completed | LM Studio attempt (model removed by the user mid-run: "Model unloaded by user"), then DeepSeek via clean env | Compaction call counted; reading kept; order; smaller next reading | Pass on DeepSeek (timeline in report) | Pass | `round2/logs/LIVE-006-*.log`; `88f03cb27` | — |
| 20 | LIVE-R2 | 06:20–06:40 | Completed | LIVE-001 usage, LIVE-002, LIVE-004 | Pass | Claude ×2 and Codex pass; one Codex statistics flake traced to the test window and fixed | Pass | `round2/logs/LIVE-R2-*.log`; `be39baf40` | — |
| 21 | DESK-004a | 06:30 | Completed | Isolated build, native standalone DeepSeek, UI sampling at 120 ms | Note shown, value kept and greyed, cleared by the next call | As expected; the note held across the idle gap | Pass | `round2/desktop/DESK-004a-*` | — |
| 22 | DESK-004d | 06:35–06:45 | Completed | Claude Haiku 5.5 `/compact`, UI sampling + frame trace | Note after completed `/compact` | Never shown: the remainder-only result (revision +1) arrives 8 ms after "compacted" | **Fail** | `round2/desktop/DESK-004d-*` | F-API-002-01 → failure-origin review |
| 23 | DESK-004c | 06:45 | Completed | Native team member | Note shown and cleared | As expected | Pass | `round2/desktop/DESK-004c-*` | — |
| 24 | DESK-004e | 06:50 | Completed | Codex compaction with a temporary `CODEX_HOME` | No note; roll-up refetch shows the post-compaction reading with the same call count | 16,980 at 3 calls, no note | Pass | `round2/desktop/DESK-004e-*` | — |
| 25 | AGY | 06:55 | Completed | Live AGY 1.3.3 → quota error; fake-CLI transport suite | Per-step usage | Live: Blocked (quota 22 h); fake-CLI: Pass | Blocked / Pass | `round2/desktop/DESK-004g-*`, `round2/logs/AGY-R2-*` | — |
| 26 | DESK-004f | 07:00 | Completed | INTERRUPT at compaction `started` | No note | "stopped", value unmuted, no note | Pass | `round2/desktop/DESK-004f-*` | — |
| 27 | Cleanup | 07:05 | Completed | Stop `iso-52182-47fb`; remove the desktop worktree, temporary `CODEX_HOME`, key file and workspaces | Clean | Clean; foreign instances and the user's LM Studio untouched | Pass | report § Round 2 | — |

## Re-entry And Reconciliation

- Last durably recorded event: 17
- Last completed case and result: R-07 final gate and cleanup — Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none (handoff)
- Interruption, context-compression, or rerun note: LIVE-001 needed two harness baseline fixes before it reached Claude; a team-driver id-matching bug was fixed and the member phase rerun; DESK-002b was added for UI mid-turn proof
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: —
