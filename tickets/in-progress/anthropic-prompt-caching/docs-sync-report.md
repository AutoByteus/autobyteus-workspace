# Docs Sync Report

## Scope

- Ticket: `anthropic-prompt-caching`. Native AutoByteus-runtime Anthropic prompt caching, the prefix-bound reasoning guard, the provider-native history boundary, interrupt notes placed after the history, Token Meter cache pricing, Sonnet 5 pricing and the `@anthropic-ai/sdk` 0.132.1 upgrade.
- Trigger: CRR-002 Pass (proportional test-code review) from `/software_engineering_team/code_reviewer`, after API-REV-001 Pass.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`. Route: reviewed (ARCH-REV-003, CRR-001, API-REV-001, CRR-002).
- Bootstrap base reference: `origin/personal` @ `927796780`.
- Integrated base reference used for docs sync: `origin/personal` @ `e350a194b` (merged into the ticket branch as `a89fe62cc`).
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh; logs in `delivery-evidence/dr1-*.log`.

## Why Docs Were Updated

- Summary:
  - The implementation commit `80845f45e` already updated the five canonical design/module docs. CRR-001 reviewed them against the code.
  - Delivery re-read them against the integrated state, and they are still accurate.
  - Delivery added one missing entry: the durable gated live E2E now has a row in the TESTING.md command map, next to the other live provider E2Es.
- Why this should live in long-lived project docs:
  - Prompt-cache prefix stability is a cross-cutting invariant. Any future change to memory, the request assembler, tool schemas or the system prompt can silently break the cache or cause 400s on kept thinking.
  - The live E2E is the only check that proves it end to end. Future validators need to find it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Anthropic adapter: cache markers, 1h TTL, compaction not cached, provider-native history policy | Updated (in `80845f45e`) | Matches `anthropic-llm.ts`, `anthropic-prompt-renderer.ts`, `anthropic-native-history-policy.ts` |
| `autobyteus-ts/docs/agent_memory_design.md` | Thinking retained across turns (per-turn strip removed); prefix-bound strip on tools/system change or restore; opaque provider-native turns | Updated (in `80845f45e`) | Matches `memory-manager.ts`, `retained-reasoning-prefix-binding.ts` |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | Interrupt boundary note now goes after the history, not into `system` | Updated (in `80845f45e`) | Matches `llm-request-assembler.ts` |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Sonnet 5 price row; Anthropic cache price dimensions | Updated (in `80845f45e`) | Matches `anthropic-supported-model-definitions.ts` |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Meter prices cache reads and 5m/1h writes separately | Updated (in `80845f45e`) | Matches the server pricing tests |
| `TESTING.md` | Durable live E2E discoverability | Updated (delivery) | New row "Anthropic prompt-caching live E2E" |
| `DESIGN.md` | Provider-specific logic stays in the LLM layer (REQ-013) | No change | The existing principles already cover it; the ticket applied them |
| Files the integrated base changed (`projects.md`, `agent_tools.md`, …) | Merge overlap check | No change | Base changes are in Tasks/projects. No file overlaps with this ticket |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Command map row | Adds the gated command for `autobyteus-anthropic-prompt-caching-live.e2e.test.ts`: env gate, clean-env invocation, cost, optional variables, and the strict-mode control | Makes the durable live check findable and repeatable |
| The five docs above | Design/module docs | Already part of `80845f45e` (reviewed in CRR-001) | Canonical behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Cache prefix invariant | Tools and system stay byte-identical within a run, and history is append-only. Only compaction, a tools/system change or a restore may break the prefix. | `design-spec.md`, `requirements-doc.md` REQ-002 | `agent_memory_design.md`, `llm_module_design_nodejs.md` |
| Prefix-bound thinking | Kept thinking is bound to its request prefix. A change to tools/system, or a restore, strips all thinking once; otherwise nothing is stripped. | REQ-012, probes P2/P3 | `agent_memory_design.md` |
| Interrupt note placement | The interrupt note goes after the history and never into the top-level `system`. | REQ-010 | `agent_runtime_loop_and_interrupt.md` |
| Provider-native boundary | Memory and agent code treat provider output as a tagged opaque value. Provider rules live in `src/llm/`. | REQ-013 | `llm_module_design_nodejs.md` |
| Meter cache pricing | Cache reads and 5m/1h writes are priced separately, and the meter matches Anthropic's raw usage. | REQ-006 | `token_usage.md`, `provider_model_catalogs.md` |
| Live strict-mode validation | How to prove the above against Anthropic's strict preserved-thinking check | `api-e2e-execution-coverage-report.md` | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Per-turn removal of earlier tool-cycle thinking at each new independent turn | Retention plus a one-time prefix-bound strip (tools/system change or restore) | `agent_memory_design.md` |
| Interrupt boundary note folded into the top-level system prompt | A SYSTEM-role note appended after the history | `agent_runtime_loop_and_interrupt.md` |
| Anthropic-specific history handling in memory/agent code | Provider-native history policy behind a provider-neutral interface (`src/llm/provider-native/`) | `llm_module_design_nodejs.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then hold for explicit user verification (AC-007).
- Notes: Docs were synced on the integrated state `a89fe62cc`. The `TESTING.md` edit is a delivery-owned change, committed at finalization.
