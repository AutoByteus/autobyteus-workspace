# Docs Sync Report — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Scope

- Ticket: `available-agent-runtimes-tool` (Project Task autobyteus-303)
- Trigger: code review CRR-006 Pass (proportional test-code review after API/E2E API-REV-002 Pass); Large / High, reviewed route
- Bootstrap base reference: `origin/personal` @ `a2faf424d6`
- Integrated base reference used for docs sync: `origin/personal` @ `a2faf424d6` (not advanced; the ticket branch was already current)
- Post-integration verification reference: `evidence/delivery/DEL-01-server-e2e-rerun.log` (6/6 on `e1450c9754`)

## Why Docs Were Updated

- Summary: the implementation already wrote the durable docs for the new tool, the read service, provider usage, the Claude zero-token control query and the Model Routing page. Delivery checked them against the final code and fixed four gaps: two `agent_tools.md` lists of explicitly selected tools and MCP adapter families that left out the new tool, and the two test sections (server `agent_runtimes.md`, web `settings.md`) that did not name the new E2E file and browser probe, while they name them for neighbouring features.
- Why this should live in long-lived project docs: the tool, its availability rules, step caps, failure wording and the page are product behavior that the Model Router (autobyteus-32) builds on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Owns the read service ("Available Agent Runtimes") | Updated | Implementation's section checked against `available-agent-runtimes-service.ts` (caps 4/6/8/8 s, provider list 4 s, provider steps 8 s; failure wording; Codex hold). Delivery added the new E2E file to Tests |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Owns the tool and the Agent Tools MCP catalog | Updated | Implementation's "Agent Runtimes Tool" section is accurate (unavailable text matches `list-available-agent-runtimes-contract.ts:14`). Delivery added the tool to the explicitly selected list (it is not availability-gated: `isAvailable: () => true`) and to the adapter-family list |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Provider usage readers; Claude model discovery change | No change | Provider table and Claude control-query paragraph match `provider-usage/*` and `claude-sdk-control-query.ts` |
| `autobyteus-web/docs/settings.md` | Owns Settings pages | Updated | Implementation's "Settings: Model Routing" matches the page and `settings.vue`. Delivery added its tests (component spec, browser probe with its `pnpm` script) |
| `GLOSSARY.md` | "Agent runtime" vs LLM runtime vocabulary | No change | Implementation's entries are accurate |
| `docs/design-cases.md` | Design lessons recorded by the team | No change | autobyteus-303 cases (AR-001, AR-003, CR-003, SR-007) already added |
| `autobyteus-server-ts/docs/modules/agent_definition.md`, `agent_communication.md` | Mentions of tool lists and `RuntimeAvailabilityService` | No change | Not affected: the daily assistant does not get the new tool; `RuntimeAvailabilityService` still exists for launch checks |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Correction | The explicitly selected tool list and the MCP adapter-family list now include `list_available_agent_runtimes` | Both lists were incomplete after this change |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Test listing | Tests names `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` (AAR-01…06) and what it stubs | The new durable E2E was not discoverable from the module doc |
| `autobyteus-web/docs/settings.md` | Test listing | Model Routing names `ModelRoutingManager.spec.ts` and `tests/e2e/model-routing-settings-probe.mjs` (`pnpm test:e2e:model-routing-settings`) | Same pattern as the Agent Runtimes and Embedding sections |

Implementation-written docs (verified, unchanged by delivery): `GLOSSARY.md`, `agent_runtimes.md` "Available Agent Runtimes", `agent_tools.md` "Agent Runtimes Tool", `llm_management.md` "Provider Usage" and the Claude discovery paragraph, `settings.md` "Settings: Model Routing", `docs/design-cases.md`.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Available agent runtime | Installed and not known to be signed out; AutoByteus per provider kind | requirements REQ-002, design spec | `GLOSSARY.md`, `agent_runtimes.md` |
| Read steps, caps and deadlines | Parallel per runtime, step caps, `ReadDeadline`, "timed out" vs "could not be read" | design spec SR-006/SR-007 | `agent_runtimes.md` |
| Single-flight reads and the Codex hold | Concurrent callers share one read; known gap FU-003 | design spec SR-006 | `agent_runtimes.md` |
| Zero-token sources per runtime and provider | Codex, Claude `get_usage`, Antigravity `/usage`, Grok `_x.ai/billing`; DeepSeek, Kimi, Anthropic, xAI | investigation notes A-15…A-19 | `agent_runtimes.md`, `llm_management.md` |
| Claude discovery sends no user turn | Control query with an input that never yields | design-cases AR-001 | `llm_management.md`, `docs/design-cases.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Claude model discovery with a string prompt ("Enumerate supported models only.") | `withClaudeControlQuery` (`claude-sdk-control-query.ts`) | `llm_management.md` |
| Per-runtime "installed" via `RuntimeAvailabilityService` for this read | `strategy.readVersion(...) !== null` (the Agent Runtimes page's rule) | `agent_runtimes.md`; `docs/design-cases.md` Case 2 |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive and finalization
- Notes: no follow-up found by delivery.
