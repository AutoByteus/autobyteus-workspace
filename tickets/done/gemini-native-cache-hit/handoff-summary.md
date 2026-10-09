# Handoff Summary — gemini-native-cache-hit

## User Verification

- Verified by the user on 2026-10-09: "finalize, no need to release new version. i just tested. it works".
- Decisions:
  1. Finalize into `origin/personal`.
  2. **No release.** The workspace version stays `1.4.99-beta.8`.
  3. OBS-002 is left with Solution Designer as a separate Project Task candidate.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit`, branch `codex/gemini-native-cache-hit` (local only). Commits:
  - `dd4b3de4a`: the fix (AGY converter semantic and 3.1 Pro prices) plus unit tests.
  - `871f01cb3`: baseline test-isolation fix in two pre-existing token-usage E2Es (TESTING.md Rule 9).
  - `88e5c6002`: durable E2E coverage (AGY transport replay, 3.1 Pro pricing via GraphQL, upgrade continuation).
  - `8105060a1`: API/E2E artifacts and logs.
  - `02f2759ed`: merge of `origin/personal` @ `f47cfd1ab` (delegate-to-existing-copy and beta.8).
  - `78df53634`: merge of `origin/personal` @ `e350a194b` (ticket docs only).
  - `54eab3d8f`: API-REV-002, the live AC-003 Token Meter check in an isolated desktop instance (evidence only, no code).
  - Not yet committed:
    - the delivery docs edits (`token_usage.md`, `provider_model_catalogs.md`);
    - the delivery artifacts;
    - Solution Designer's OBS-002 note in `investigation-notes.md`.
- Base and finalization target: `origin/personal`. The ticket branch contains `origin/personal` @ `e350a194b`, re-checked after `54eab3d8f` (0 behind).
- Classification: `task_size=Small`, `architectural_risk=Low`. Route: direct (no architecture, code or test-code review; recorded `Not Applicable`).
- Not to be committed: the untracked `*/dist/` folders.

## What Changed

- **AGY usage accounting** (`agy-stream-event-converter.ts`, one value):
  - AGY input is read as `base_excludes_cache`: gross = input + cache reads, miss = input.
  - The hit rate is now like-for-like with native Gemini, and AGY turns are no longer rejected as regressed when cache reads outgrow input.
  - This applies to every model run through AGY.
- **Gemini 3.1 Pro Preview prices** (`supported-model-definitions.ts`):
  - ≤200K: 2.00 / 0.20 / 12;
  - >200K: 4.00 / 0.40 / 18 (input / cached input / output incl. reasoning).
  - 3.8 Flash is unchanged.
- **Native Gemini runtime:** unchanged. The investigation found no defect there (REQ-003 was removed at the user's direction).
- **Historical data:** fix-forward (DEC-001 and DEC-002). No rows are rewritten and there is no migration.
- **Docs:** `token_usage.md` has a new AGY section, and `provider_model_catalogs.md` has the 3.1 Pro price table (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture / code / test-code review | Not Applicable (direct low-risk route) |
| Implementation | IR-001, unit tests on the converter and catalog |
| API/E2E | API-REV-001 Pass (95%):<br>• AE-001 replays 11 verbatim AGY 1.2.16 results through the real server (WS and GraphQL).<br>• AE-002..004/006 cover 3.1 Pro tier prices and the 200,000 / 200,001 boundary through GraphQL, with 3.8 Flash unchanged.<br>• AE-005 covers upgrade continuation for both pre-fix stored shapes.<br>• AE-007: a missing cache read gives `not_reported`.<br>• TP-001 fail-before: 8 cases fail on the pre-fix values.<br>• TP-002 live: 3 turns of AGY 1.3.2 through the real server. |
| Live AC-003 (API-REV-002, Pass 96%) | LV-001 used an isolated desktop instance built from `78df53634`, with the installed `agy` 1.3.2 and Gemini 3.8 Flash (Low), over 2 composer turns. Both replies were correct.<br>• Turn 1: AGY reported input 67,632 and cache read 24,458. The Token Meter showed gross 92,090, hit 26.6%, uncached 67,632 and cache hits 24,458. The pre-fix code would have shown gross 67,632.<br>• Turn 2: gross 120,018, hit 20.4%, 2 reports, no regression flag, `price_missing`.<br>• The new coverage was rechecked on `78df53634`: 16 files / 136 tests.<br>• Evidence: `live-check/ac-003-live-receipt.json`, `live-check/ac-003-token-meter-after-turn-2.png`. The instance was stopped and its data removed. |
| Delivery, on the integrated state `02f2759ed` | • `pnpm -C autobyteus-server-ts typecheck`: clean.<br>• Focused unit (converter, AGY fixture routing, `tests/unit/token-usage`): 19 files / 201 tests pass.<br>• `tests/e2e/token-usage`: 13 files / 40 tests pass.<br>• AGY fake-CLI transport E2Es (token-usage plus 6 sibling suites sharing the fixture changed on both sides): 7 files, 38 pass, 1 skipped (browser gate).<br>• `autobyteus-ts tests/unit/llm`: 399/400. The one failure is the known pre-existing OBS-002 Gemini retry timeout, which also fails on base.<br>• `78df53634` only added ticket docs, so no rerun was needed.<br>• Logs: `delivery-logs/post-merge-*.log`. |

## How To Verify

AC-003 (the live AGY Token Meter check) has already passed in an isolated desktop instance (API-REV-002, see `live-check/`). What remains is your explicit acceptance. To see it yourself, start an isolated app built from this worktree. It uses separate data and does not touch your own app.

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit
pnpm --silent isolated-app start --build
```

1. **AGY (AC-003).** Start an agent on the Antigravity CLI runtime with a Gemini model, and run a few turns with some tool use, so the context passes about 6K tokens and AGY reports cache reads. Open the Token Meter for the run.
   - Expected: gross input ≥ cache read.
   - Expected: cache miss > 0, so the hit rate is below 100% (not the earlier ≈99% with 0 misses).
   - Expected: the cost stays "price missing" for AGY model ids.
2. **3.1 Pro prices (AC-005), optional.** Run a native Gemini 3.1 Pro Preview agent for one turn. The Token Meter cost should use 2.00 / 0.20 / 12 per 1M tokens for a prompt under 200K.

Stop the app with `pnpm --silent isolated-app stop`.

## Decisions At Verification (resolved 2026-10-09)

1. Release: **none**. The change is finalized to `origin/personal` without a new version.
2. OBS-002 (pre-existing `GeminiLLM` user-retry extras overriding compaction's single attempt) is outside this ticket. Solution Designer holds it as a separate Project Task candidate. No action is needed for this delivery.

## Residual Risks

- AGY's usage format could change in a future AGY version. The `agy-token-usage-transport` replay will catch it on the fixture side only.
- Historical AGY rows keep inflated hit rates and lack turns that were rejected as regressed. Historical 3.1 Pro costs keep the old prices (accepted, DEC-001 and DEC-002).
- TP-002 left one 3-turn "OK" conversation (`b9bcb5e8-633a-446d-9c98-8123fe72c609`) in the user's own AGY CLI store. It is harmless and can be deleted from AGY if you want.
