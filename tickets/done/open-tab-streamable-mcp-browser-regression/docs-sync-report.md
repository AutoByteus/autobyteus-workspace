# Docs Sync Report

## Scope

- Ticket: `open-tab-streamable-mcp-browser-regression`
- Trigger: API/E2E validation passed for the Streamable MCP `open_tab` Browser panel regression; delivery-stage docs sync was performed against the current integrated branch state.
- Bootstrap base reference: `origin/codex/streamable-mcp-runtime-tools` at `c572fcd686513045f53c01c34f3198dd565fd8a4`
- Integrated base reference used for docs sync: `origin/codex/streamable-mcp-runtime-tools` at `c572fcd686513045f53c01c34f3198dd565fd8a4`
- Post-integration verification reference: No new base commits were integrated; upstream API/E2E verification remains the executable authority, with docs-only delivery edits applied afterward.

## Why Docs Were Updated

- Summary: Updated long-lived runtime documentation to make the browser-tool exception to raw MCP result-envelope preservation explicit. The implemented behavior restores the canonical browser contract: known browser tool successes, especially `open_tab`, must stream a direct browser result object with `result.tab_id` before renderer Browser focus handling.
- Why this should live in long-lived project docs: Future Codex/Claude Agent Tools MCP work needs to understand that browser result canonicalization is a server/runtime converter responsibility, not renderer presentation logic, and that unknown non-AutoByteus MCP traffic should remain raw.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/browser_sessions.md` | Canonical Browser ownership and runtime adapter contract for Browser shell focus. | Updated | Added Codex-specific `open_tab` direct `result.tab_id` example matching Claude note. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime event converter and Agent Tools MCP family ownership overview. | No change | Already states browser tools normalize successful results into the standard browser result object before terminal lifecycle events. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Server-owned tool family contracts and result shape notes. | No change | Existing media/browser family-contract notes remain compatible; no browser-specific section was needed here. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex MCP lifecycle mapping and event payload contract. | Updated | Replaced overly broad raw MCP result-shape wording with family-specific result canonicalization and browser exception language. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex runtime Agent Tools MCP documentation. | Updated | Clarified Codex preserves invocation/arguments while applying family result contracts; `open_tab` must expose direct `result.tab_id`. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory trace contract for normalized Agent Tools MCP lifecycle events. | Updated | Clarified memory stores normalized application-facing result payloads; browser/media canonical contracts replace raw MCP envelopes. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/browser_sessions.md` | Runtime adapter contract clarification | Codex note now explicitly says `mcp__autobyteus_agent_tools__open_tab` streams as `open_tab` with direct `result.tab_id` before renderer consumption. | Aligns Browser docs with implemented Codex fix and existing Claude language. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex event mapping clarification | Generalized raw MCP result preservation into family-specific canonicalization; documented browser direct-result exception. | Prevents future Codex work from re-leaking raw MCP browser envelopes. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex integration clarification | Documented family-specific result contracts and direct browser `open_tab` result requirement; unknown MCP traffic remains raw. | Keeps Codex runtime docs truthful after Streamable MCP browser fix. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory persistence contract clarification | Changed wording from preserving MCP text-content result shape to storing normalized application-facing result payloads, including browser `tab_id` and media `{ file_path }`. | Memory traces are written from normalized lifecycle events, so docs must not imply browser envelopes remain authoritative. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Browser MCP result canonicalization | Known browser tool success results are unwrapped at the server runtime-converter boundary and expose direct browser result objects before renderer focus handling. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/browser_sessions.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Normalized memory trace payloads | Memory records normalized application-facing lifecycle results rather than blindly preserving raw MCP envelopes for families with public result contracts. | `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/agent_memory.md` |
| Boundary for unknown MCP traffic | Browser normalization is allowlisted to known AutoByteus browser tools; unknown non-AutoByteus MCP results remain raw. | `design-spec.md`, `code-review-report.md` | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Implicit documentation assumption that Agent Tools MCP result payloads always preserve raw MCP content envelopes. | Family-owned normalized result contracts for known first-party tools, including direct Browser result objects. | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/modules/agent_memory.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after confirming the ticket branch was already current with `origin/codex/streamable-mcp-runtime-tools`; no code behavior changed during docs sync.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
