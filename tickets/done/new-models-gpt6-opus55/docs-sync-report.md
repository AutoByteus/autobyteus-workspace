# Docs Sync Report — new-models-gpt6-opus55

## Current authority and integration

- `task_size=Large`, `architectural_risk=High`; cumulative independent architecture, source, API/E2E and durable test-code review route.
- Latest scope: approved SR-014/AC-015, DS-018, ARCH-REV-009 Pass, IR-005 at `f04c4389c`, CRR-009 source Pass, API-REV-006 Pass / 95%, CRR-010 test-code Pass. Earlier SR-011/SR-012, API-REV-005/CRR-008 and original model-catalog/signed-turn reviews remain cumulative history, not the latest context-display result.
- Latest-base refresh before delivery edits: `git fetch origin personal`; `origin/personal@0f54978ba34165c476dcba67ce1d31ab27257108` is an ancestor of `HEAD=f04c4389cd3ec7eb5d78bdf8a08b8327e2b90c68`. No new base commit was integrated, so no extra post-integration rerun is required. API-REV-006 validated the new head; a fresh README-guided Linux ARM64 Electron build and VNC smoke subsequently passed; see `evidence/delivery-api006-current-electron-check.txt`.

## Long-lived docs synchronized

| Doc | Current result | Durable truth |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Updated for AC-015 | The selected raw Claude SDK result provides a positive, safe context capacity; a safe full prompt sum includes base plus cache buckets; percent is derived from these values. An old same-record prompt/capacity with null stored percent is read-derived without SQL mutation. Unknown/invalid capacity remains unavailable; no model-name 1M assumption. Earlier selected-only checkpoints, configured pricing and migration documentation retained. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Updated for AC-015 | Active selected raw-model context binding and read-only old-row percentage repair described alongside existing SDK session/token boundary. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Updated for AC-015 | Existing Token Meter's one-decimal label and exact progress use server-provided percent; `22,135 / 1,000,000` renders `2.2%` label and `2.2135%` progress. Unknown capacity is not fabricated. |
| `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` | Prior updates retained | Catalog, pricing and signed active-turn memory knowledge remains accurate; AC-015 does not change these owners. |
| `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/modules/llm_management.md`, production migration conventions | Reviewed; no edit | Dynamic catalogs, management and generic migration rules remain accurate; Codex context percent is unchanged. |

AC-015 itself needs **no new migration** or backfill. The cumulative SR-011 selected-model feature **still requires** the nullable `claude_sdk_usage_state_json` migration (`20260923130000_add_claude_sdk_usage_state`); do not confuse the no-new-migration delta with no migration for the release package. No selected token, cache or configured-cost calculation changed. The inaccurate IR-004 duplicate-decoder statement remains excluded from docs/acceptance evidence.

## Validation and remaining limits

API-REV-006 passed 11 server context/SQL/GraphQL cases, 23 web stream/card cases, one real CLI-default selected SDK query, server build, 28 Codex/GPT/pricing regressions, boundary guard and nine generic Chromium Token Statistics journeys. CRR-010 accepted the three changed durable tests. The generic browser probe is **not** a combined live SDK→browser selected-meter journey. The prior packaged Electron was stale for AC-015; a fresh current-source build and VNC backend/window smoke passed. Explicit selected-meter user verification is still pending; see `evidence/delivery-api006-current-electron-check.txt`. Whole-web typecheck and I-44 command safety remain unverified; no new direct paid API call occurred in API-REV-006; direct OpenAI live remains untested. Docs sync **Pass** on the current integrated source. The user subsequently explicitly verified the rebuilt Electron app and requested finalization plus a new release; no documentation rework was needed for that acceptance signal.
