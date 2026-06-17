# Docs Sync Report

## Scope

- Ticket: `newest-glm-kimi-models`
- Trigger: Delivery-stage docs sync after code-review Round 5 passed and API/E2E Round 3 refresh passed.
- Bootstrap base reference: `origin/personal` at `e6fd96e265d3c2f9010a5580d7fdd6ba36c3c424`, recorded as the bootstrap base branch in `investigation-notes.md`.
- Integrated base reference used for docs sync: `origin/personal` at `e6fd96e265d3c2f9010a5580d7fdd6ba36c3c424` after delivery `git fetch origin --prune` on `2026-06-17`; the ticket branch was already current with the tracked base, so no merge or rebase was needed.
- Post-integration verification reference: `tickets/done/newest-glm-kimi-models/delivery-git-diff-check.log` (`git diff --check`, passed), `tickets/done/newest-glm-kimi-models/delivery-untracked-whitespace-scan.log` (untracked source/artifact whitespace scan, passed), and `tickets/done/newest-glm-kimi-models/delivery-ts-build.log` (`pnpm --dir autobyteus-ts build`, passed).

## Why Docs Were Updated

- Summary: Long-lived LLM/provider docs now record the final integrated behavior for GLM 5.2 and Kimi K2.7 Code support: `glm-5.2` replaces active `glm-5.1`; Kimi keeps `kimi-k2.6` as the general-purpose model, adds `kimi-k2.7-code` for coding/agentic workflows, and removes active `kimi-k2-thinking` support.
- Why this should live in long-lived project docs: The change alters the built-in model catalog, direct provider defaults, provider-specific request-shaping rules, and frontend thinking-control interpretation. Future contributors need the active model IDs and adapter-owned request constraints in canonical docs rather than only in ticket artifacts or tests.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Canonical provider model catalog and provider-specific model/request constraints. | `Updated` | Records `glm-5.2`, retained `kimi-k2.6`, added `kimi-k2.7-code`, removed active `glm-5.1` / `kimi-k2-thinking`, GLM thinking schema, and Kimi K2.7 Code fixed sampling/tool-choice constraints. |
| `autobyteus-ts/docs/llm_module_design.md` | Canonical TypeScript LLM architecture and provider-specific request-shaping rules. | `Updated` | Adds GLM 5.2 thinking/effort mapping, Kimi K2.6 retained behavior, Kimi K2.7 Code always-on-thinking/fixed-constraint behavior, and GLM 5.2 frontend thinking controls. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Node.js LLM module design summary and latest-model support list. | `Updated` | Records `glm-5.2`, Kimi K2.6/K2.7 Code split, and adapter-owned request-shaping responsibilities. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Streaming/tool-call design doc for OpenAI-compatible provider adapter normalization. | `Updated` | Clarifies that Kimi K2.6 and Kimi K2.7 Code have distinct adapter-owned tool-workflow request legality rules before the shared request path. |
| Active source/docs reference scan excluding ticket artifacts | Delivery validation that stale model IDs are not documented as active support outside ticket history. | `No change` | `rg` found removed IDs only in negative assertions or docs explicitly stating they are no longer active built-ins. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Catalog/runtime docs | Added `glm-5.2`, retained `kimi-k2.6`, added `kimi-k2.7-code`, recorded removal/no-alias policy for `glm-5.1` and `kimi-k2-thinking`, and documented GLM/Kimi adapter constraints. | This is the canonical model catalog and provider-specific request behavior reference. |
| `autobyteus-ts/docs/llm_module_design.md` | Architecture docs | Updated provider-specific model rules, OpenAI-compatible adapter normalization text, and frontend thinking-control table for GLM 5.2. | The implementation changes provider defaults/request mapping and frontend schema-driven thinking behavior. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Runtime overview docs | Updated latest-model support list and provider adapter ownership notes for GLM 5.2 and Kimi K2.7 Code. | Node.js consumers and contributors need current active IDs and provider constraints. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Streaming/tool-call behavior docs | Updated Kimi provider-normalization guidance to distinguish K2.6 tool-safe disabling from K2.7 Code always-on-thinking/fixed-constraint normalization. | The API/E2E pass validated K2.7 Code streamed reasoning/tool-continuation behavior, so streaming docs should not imply only K2.6 rules. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| GLM active built-in replacement | `glm-5.2` is now the active built-in GLM model and `new GlmLLM()` defaults to it; `glm-5.1` is not retained as an active row, alias, or fallback. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| GLM thinking request mapping | GLM exposes flat UI/schema keys (`thinking_type`, `reasoning_effort`) but `GlmLLM` converts them to provider-native request fields and omits stale effort values when thinking is disabled. | `requirements.md`, `design-spec.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| Kimi K2.6 / K2.7 Code model split | `kimi-k2.6` remains the general-purpose Kimi model; `kimi-k2.7-code` is a separate coding/agentic model; `kimi-k2-thinking` is removed from active built-ins. | `requirements.md`, `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| Kimi provider request legality | K2.6 keeps Moonshot-safe tool-workflow thinking/temperature normalization; K2.7 Code keeps thinking on and normalizes fixed sampling/tool-choice fields locally in `KimiLLM` before the shared OpenAI-compatible builder. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md`, `autobyteus-ts/docs/api_tool_call_streaming_design.md` |
| Kimi K2.7 Code streaming/tool continuation | API/E2E validated streamed K2.7 Code reasoning through a tool-call continuation path; shared generic reasoning extraction remains supported while Kimi-specific replay requirements are covered by the provider adapter/test path. | `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-round2-kimi-integration.log`, `api-e2e-round2-unit-factory-tests.log`, prior `api-e2e-streaming-boundary-tests.log` | `autobyteus-ts/docs/api_tool_call_streaming_design.md`, `autobyteus-ts/docs/provider_model_catalogs.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Active GLM `glm-5.1` built-in/default. | Active GLM `glm-5.2` catalog row, `GlmLLM` default, GLM 5.2 metadata, and GLM 5.2 thinking schema. | `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| Active Kimi `kimi-k2-thinking` built-in. | `kimi-k2.6` remains for general-purpose Kimi use; `kimi-k2.7-code` is added for coding/agentic workflows. | `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/llm_module_design.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| Single Kimi request-normalization description centered only on K2.6. | Separate K2.6 and K2.7 Code request-legality rules owned by `KimiLLM`. | `autobyteus-ts/docs/provider_model_catalogs.md`, `autobyteus-ts/docs/api_tool_call_streaming_design.md` |
| Frontend thinking-control assumption that GLM only exposes `thinking_type`. | GLM 5.2 exposes `thinking_type` and `reasoning_effort` through schema-driven controls. | `autobyteus-ts/docs/llm_module_design.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `Docs updated`
- Rationale: `N/A`

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync remains current after API/E2E Round 3 refresh and after confirming the ticket branch is current with latest tracked `origin/personal`. Delivery is paused at the user-verification hold; ticket archival, committing, pushing, merging to `personal`, release, deployment, and cleanup have not been performed.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
