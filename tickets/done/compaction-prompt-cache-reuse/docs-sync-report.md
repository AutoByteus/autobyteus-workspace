# Docs Sync Report

## Scope

- Ticket: `compaction-prompt-cache-reuse`. Compaction runs on the agent's own model. Cached-mode catalog models (Anthropic, DeepSeek) summarize with a cached conversation request; all other models use the transcript summary on their own model. The output limit is raised and fitted for summary requests, with a nine-heading summary contract and one parser. Gemini takes its system prompt from the request. The compaction-model setting is removed, and compaction usage is metered.
- Trigger: CRR-014 (test review Not Applicable) after IR-008, CRR-013 Pass and API-REV-006 Pass, resuming from the DR-001 Local Fix.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Bootstrap base reference: `origin/personal` @ `e50826755`.
- Integrated base reference used for docs sync: `origin/personal` @ `6314c4ee2` (merge `fffdc5c2f`; unchanged at DR-002).
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary:
  - Implementation updated seven canonical docs. Delivery re-read them on the integrated state, after the base merge and IR-008.
  - They are accurate:
    - Cached mode is described as "the Anthropic and DeepSeek models", and IR-008 made that true again for the base-added Sonnet 5.5 / Haiku 5.5.
    - The removed setting is described consistently as inert.
  - Delivery added one thing. The base's rewritten `TESTING.md` keeps per-suite commands in the test file header. The new gated suite's header lacked its exact command, so delivery added it, as a header comment only.
- Why this should live in long-lived project docs: the compaction path and the per-model mode are architecture that future model additions must follow. The merge itself showed this: newly added catalog models silently took the default mode.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/agent_memory_design.md` | Summarizer, port, per-model mode, fallback, removed setting | No change (updated in implementation) | Accurate after IR-008 |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | `LLMModel.compactionSummaryMode`; merged with the base's Claude 5.5 catalog text | No change | Both sides are coherent after the merge |
| `autobyteus-ts/docs/llm_module_design.md` | Same topic, language-neutral | No change | — |
| `autobyteus-server-ts/docs/ARCHITECTURE.md`, `docs/modules/agent_memory.md` | Server compaction wiring, inert `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` | No change | — |
| `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md` | The setting is removed from the UI; merged with base edits | No change | Merged cleanly; coherent |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Base-added Sonnet/Haiku 5.5 rows | No change | Compaction mode is documented by rule, not per row |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Compaction usage metering | No change | Covered in `agent_memory.md` and `agent_memory_design.md` |
| `TESTING.md` (base rewrite) | Where suite commands live | No change | Its rule points to file headers |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` header | Suite documentation per `TESTING.md` | Updated (delivery) | Exact `env -i` command and optional variables |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-compaction-cache-reuse-live.e2e.test.ts` header | Suite run command | Adds the clean-env command and the optional model and timeout variables | `TESTING.md` keeps commands in suite headers |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target Doc |
| --- | --- | --- | --- |
| Per-model summary mode | A new catalog model defaults to `'transcript'`. Adding an Anthropic or DeepSeek model needs `compactionSummaryMode: 'cached_conversation'`, and the catalog test enforces it | REQ-002, DR-001, IR-008 | `agent_memory_design.md`, `llm_module_design_nodejs.md` |
| Same-model compaction | No compaction-model setting; fallback to the transcript summary on the same model | REQ-001, REQ-004 | `agent_memory_design.md`, `agent_memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Compaction-model setting (`AUTOBYTEUS_COMPACTION_MODEL_SETTINGS`, server and web) | The agent's own model; the old key is inert | `agent_memory_design.md`, `ARCHITECTURE.md`, `agent_memory.md`, web `settings.md` |
| A separate uncached summarizer with its own system prompt | The cached conversation summary request, with transcript fallback on the same model | `agent_memory_design.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then the user-verification hold (AC-003 report acceptance, AC-007).
