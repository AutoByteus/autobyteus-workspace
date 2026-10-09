# Docs Sync Report

## Scope

- Ticket: `gemini-native-cache-hit`
- Trigger: API/E2E validation Pass (API-REV-001, 95%) from `/software_engineering_team/api_e2e_engineer`, direct low-risk route (`task_size=Small`, `architectural_risk=Low`; architecture, code and test-code review `Not Applicable`)
- Bootstrap base reference: `origin/personal` @ `927796780562482b900926fa7ab0d50109820e01`
- Integrated base reference used for docs sync: `origin/personal` @ `f47cfd1ab` (beta.8), merged into the ticket branch as `02f2759ed`. A later advance to `e350a194b` (ticket docs only) was merged as `78df53634`
- Post-integration verification reference: `delivery-logs/post-merge-*.log` (see `release-deployment-report.md` › Initial Delivery Integration Refresh)

## Why Docs Were Updated

- Summary: two value contracts changed, and both are documented in long-lived docs:
  1. AGY `result.usage` input is now `base_excludes_cache` (gross = input + cache read, miss = input).
  2. Gemini 3.1 Pro Preview catalog prices are now Google's official prices for both tiers.
- Why this should live in long-lived project docs:
  - `token_usage.md` › Runtime Adapter Semantics already describes how each runtime's usage is read (Codex, Claude), but had no AGY entry. Without one, the next reader would not know that AGY input excludes cache reads. That was the exact misreading this ticket fixed.
  - `provider_model_catalogs.md` documents the 3.8 Flash schedule but had no 3.1 Pro prices.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | It owns the input-semantic basis and the per-runtime adapter semantics | Updated | New `### Antigravity CLI (AGY)` subsection |
| `autobyteus-ts/docs/provider_model_catalogs.md` | It owns the Gemini LLM catalog and pricing notes | Updated | 3.1 Pro tier price table added |
| `autobyteus-ts/docs/llm_module_design.md` | It describes `gross_includes_cache` / `base_excludes_cache` generically | No change | The generic description is still accurate; no AGY or price specifics |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | AGY runtime owner doc | No change | It does not describe usage. Token accounting is owned by `token_usage.md`, which now has the AGY section |
| `TESTING.md` | Durable test surfaces | No change by delivery | Already updated by API/E2E (`88e5c6002`) with the `agy-token-usage-transport` suite and `usage_report` case. The merge with base kept that text unchanged |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | New subsection | AGY cumulative per-process `result.usage` → `cumulative_snapshot` with series key `<conversation-id>` and idempotency key `agy:<conversation-id>:<num_turns>`. `input_tokens` excludes `cache_read_tokens`, so the basis is `base_excludes_cache` (gross / miss / read mapping). Missing cache read → `not_reported`. Applies to every AGY model, and AGY model ids stay `price_missing`. Records the pre-fix defect and the fix-forward decision (no rewrite of older rows) | REQ-002, REQ-005 / DEC-001 |
| `autobyteus-ts/docs/provider_model_catalogs.md` | New paragraph and table | 3.1 Pro `prompt_le_200k` 2.00 / 0.20 / 12 and `prompt_gt_200k` 4.00 / 0.40 / 18 (output includes reasoning), Global prices checked 2026-10-09. Names the replaced prices; captured costs are not repriced | REQ-004, REQ-005 / DEC-002 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AGY usage semantics | AGY `input_tokens` excludes cache reads; usage is cumulative per process; the cache hit rate is comparable to native Gemini on the gross basis | `investigation-notes.md` F1, `api-e2e-logs/tp-002-live-agy-usage.json` | `token_usage.md` |
| Historical AGY rows | Pre-fix rows over-state the hit rate, under-count gross input and miss turns rejected as regressed. Fix-forward only | `requirements-doc.md` DEC-001, AE-005 | `token_usage.md` |
| 3.1 Pro pricing | Official tier prices; the tier boundary is at 200,000 inclusive | `investigation-notes.md` F5, AE-002..004 | `provider_model_catalogs.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| AGY input as `gross_includes_cache` | `base_excludes_cache` | `token_usage.md` › Antigravity CLI (AGY) |
| 3.1 Pro prices 2.25 / 0.225 / 18 and 4.50 / 0.45 / 27 | 2.00 / 0.20 / 12 and 4.00 / 0.40 / 18 | `provider_model_catalogs.md` › Gemini LLM Models |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs were updated)
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then the user-verification hold
- Notes: The docs describe the integrated state `78df53634` plus these docs edits.
