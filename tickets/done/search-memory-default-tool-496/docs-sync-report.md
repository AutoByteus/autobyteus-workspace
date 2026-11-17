# Docs Sync Report

## Scope

- Ticket: `search-memory-default-tool-496` (Project Task `autobyteus-496`): every agent run has `search_memory` from the platform
- Trigger: API/E2E validation `Pass` (API-REV-001, 95%) on the direct low-risk route (`task_size=Small`, `architectural_risk=Low`; no architecture review, no source code review)
- Bootstrap base reference: `origin/personal` @ `a781007713`
- Integrated base reference used for docs sync: `origin/personal` @ `e4f4b3e176` (two new base commits, both only `tickets/done/delegated-copies-outlive-delegator-461/*`), merged into the ticket branch as `26c2bc2528`
- Post-integration verification reference: `evidence/DEL-01-post-integration-checks.log` (server and web typecheck at baseline; the 12 changed unit files, 186/186)

## Why Docs Were Updated

- Summary: the shared exposure rule now adds `search_memory` to every run (`PLATFORM_GIVEN_TOOL_NAMES`). Four places in the long-lived docs said the opposite ("an agent gets the tool only when its definition selects it", "a standalone run receives its explicitly configured effective tool set", "application-owned runs … keep their explicitly configured set") or showed `search_memory` as a tool that can be removed.
- Why this should live in long-lived project docs: the exposure rule is the one place every runtime reads; a reader deciding what an agent can call must find it in the exposure and memory-search docs, not in the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | Holds no statement about the tool exposure or `search_memory`. The change adds one constant to the existing shared rule, with no new owner or pattern. |
| `TESTING.md` | The ticket adds a gated live suite | Updated | Its two statements that gated suites use `RUN_*` gates were no longer accurate: the new suite is gated by `SEARCH_MEMORY_LIVE_E2E=<runtime>` (two older suites already use `*_LIVE_E2E`). Reworded to "the gate their file header names". No rule changed. |
| `RELEASE.md` | Release guide | No change | No release step, check or workflow is touched; no persisted data or migration is involved. |
| `AGENTS.md` (root) | Pointers to the three documents | No change | |
| `autobyteus-server-ts/docs/modules/memory_search.md` | Canonical doc of the tool and its entry points | Updated (implementation, verified here) | Entry Points: every agent run has the tool, once when also listed; a search covers every run on the node, the asking run left out. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Defines the session's effective tool set | Updated (implementation, verified here) | The effective set includes the platform-given `search_memory`. |
| `autobyteus-server-ts/docs/modules/tool_list_updates.md` | Its notice example showed `search_memory` removed | Updated (implementation, verified here) | Example changed to `open_tab`; one sentence describes the upgrade notice. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | "Runtime Exposure Resolution" is the canonical description of the exposure rule | Updated (delivery) | Added the platform-given step to the rule; corrected "Application-owned runs … keep their explicitly configured set". |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | "Tool Contract" says what a standalone run receives | Updated (delivery) | A standalone run receives its configured set plus `search_memory`. |
| `autobyteus-server-ts/docs/modules/codex_integration.md`, `agent_team_execution.md` | Mention the exposure rule | No change | They describe team collaboration tools and list the file only. |
| Ticket-local `design-spec.md`, `requirements-doc.md` | Source of the change | No change | Not long-lived docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/memory_search.md` | Behavior | Entry Points: every run has `search_memory` | The tool is no longer opt-in |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Behavior | The session's effective tool set includes `search_memory` | `tools/list` and `tools/call` follow it |
| `autobyteus-server-ts/docs/modules/tool_list_updates.md` | Correction | Example uses `open_tab`; one sentence on the restore notice | `search_memory` can no longer be removed |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Behavior | New paragraph on `PLATFORM_GIVEN_TOOL_NAMES`; application-owned runs get the platform-given tools | Canonical exposure description |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Correction | Standalone run gets `search_memory` too | Its statement was no longer true |
| `TESTING.md` | Description | Gated suites: gate is named in the file header (usually `RUN_*`) | The new suite uses `SEARCH_MEMORY_LIVE_E2E=<runtime>` |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Platform-given tools | One list, added in the shared exposure rule for every run and every runtime; no backend adds it | `design-spec.md`, `implementation-handoff.md` | `agent_tools.md` (Runtime Exposure Resolution) |
| Node-wide search for every agent | The tool searches every run on the node, minus the asking run, whichever agent asks. Privacy limits and scopes are deferred | `requirements-doc.md` DEC-001, QR-002; `follow-ups.md` FU-001, FU-004 | `memory_search.md` (Entry Points). The follow-ups stay in the ticket until the later memory-scope work. |
| Upgrade notice | A run restored after the upgrade hears "Now available: search_memory." once | `requirements-doc.md` AC-003; API-06 | `tool_list_updates.md` |
| Gated live suite | `SEARCH_MEMORY_LIVE_E2E=<agy\|autobyteus\|claude\|codex\|grok>`; the header has the commands | `api-e2e-execution-coverage-report.md` | The test file header (TESTING.md points gated suites to their headers) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "An agent gets `search_memory` only when its definition selects it" | The platform gives it to every run | `memory_search.md` Entry Points; `agent_tools.md` |
| The withdrawn SR-001…SR-003 design (own-definition scope, `memorySearchEnabled` switch, native exposure holder) | Nothing was built; the user decided node-wide, no switch | `follow-ups.md` FU-002, FU-004 (the design at `cf29ff1cd8` is the starting point) |

## No-Impact Decision

Not used: docs impact is `Updated`.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification record, ticket move, secret gate, finalization into `origin/personal`
- Notes:
  - Follow-ups: FU-001…FU-005 were recorded upstream. Delivery found no further problem outside the ticket. The `RUN_*` wording in TESTING.md was fixed here because this ticket adds a gated suite that the wording no longer described.
  - `TESTING.md` is the API/E2E engineer's document. The edit changes a description to match files that already exist; it sets no rule.
