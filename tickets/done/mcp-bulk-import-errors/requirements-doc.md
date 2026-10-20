# Requirements Document — MCP bulk import: per-entry reasons and the app's own entry shape

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mcp-bulk-import-errors`
- Request / ticket: Project Task `autobyteus-190`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's message to the user, 2026-10-20 ("autobyteus-190 requirements approved within the Task's direction …").
- Exact approved baseline: SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem:
  - Bulk-importing MCP servers tells the user only how many entries failed, not which ones or why.
  - It rejects entries in the app's own `mcps.json` format (no `transport_type`).
  - The web view misreads the result, so after an import the server list does not refresh and a partial import looks like a failure.
- Desired outcome:
  - The import result lists each failed entry with its reason, in the API and in the import view.
  - Entries in the app's own format import.
  - The view refreshes and reports full, partial and failed imports correctly.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Only counts; reasons in the server log only (F-1) | Counts plus a list of `{ serverId, reason }` for failed entries | Counts, `success`, `message`, server log lines |
| BEH-002 | Entries without `transport_type` fail (F-2) | Transport inferred: `url` → streamable HTTP, `command` → stdio; an explicit `transport_type` still wins | Explicit types; unsupported types rejected (e.g. `websocket`) |
| BEH-003 | The view reads `imported_count` (F-3) | Reads `importedCount`/`failedCount`; refreshes the list when anything was imported | Toast on completion |
| BEH-004 | Whole-input errors (bad JSON, no `mcpServers`) return `success:false` and a message | Unchanged | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Bulk import with some invalid or unsupported entries |
| UC-002 | Bulk import of entries in the app's own `mcps.json` format (e.g. copied from another machine's `mcps.json`) |

### Out Of Scope

- Discovering or registering tools at import time (import stays save-only).
- Secrets handling (FU-2).
- The single-server form.
- A new import format.

### Non-Goals

No retry or "fix in place" UI for failed entries.

### Prerequisites

None.

### Preserved Behavior Boundary

BEH-004; explicit `transport_type`, the `transportType`/`toolNamePrefix` aliases, `websocket` rejection (autobyteus-181); file loading of `mcps.json` behaves exactly as today.

### Review Authority

Standard (`ticket-scope.md`).

## Requirements

| ID | Requirement | Behaviors | Priority |
| --- | --- | --- | --- |
| REQ-001 | The bulk import result keeps `success`, `message`, `importedCount` and `failedCount`, and adds a list of failed entries, each with the entry's server id and the reason it failed. | BEH-001 | Must |
| REQ-002 | Reasons never contain env, header or token values. | BEH-001 | Must |
| REQ-003 | An entry without `transport_type` is treated as streamable HTTP if it has a non-empty `url`, as stdio if it has a non-empty `command`, and fails with a reason naming both options if it has neither. An explicit `transport_type` (or `transportType`) is used as given. The rule is the same one the app uses when it loads its own `mcps.json`. | BEH-002 | Must |
| REQ-004 | Importing the content of an `mcps.json` written by the app imports every entry. | BEH-002 | Must |
| REQ-005 | The import view shows the failed entries with their reasons and stays open when any entry failed, so the user can read and fix them. It refreshes the server list whenever at least one entry was imported, and its toast distinguishes full success, partial and none. English and Chinese. | BEH-001, BEH-003 | Must |
| REQ-006 | Whole-input errors behave as today. | BEH-004 | Must |

## Acceptance Criteria

| AC ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | Import `{ok: stdio}, {bad: websocket}, {empty: {}}` | `importedCount 1, failedCount 2`; failures name `bad` (unsupported transport, listing the valid ones) and `empty` (needs `command` or `url`); no secret values even when entries carry env/headers | Server unit + GraphQL e2e |
| AC-002 | REQ-003, REQ-004 | Import an `mcps.json` produced by the app (stdio with env, HTTP with headers/token), without `transport_type` | All imported; the saved shapes equal the originals | Server e2e (save → read back) |
| AC-003 | REQ-003 | Explicit `transport_type` and the `transportType` alias | As today | Core unit |
| AC-004 | REQ-005 | Web: a partial import | The failure list is shown, the view stays open, the list is refreshed, an info toast; full success navigates as today | Web component test + localization guards |
| AC-005 | REQ-006 | Bad JSON; missing `mcpServers` | `success:false`, message, empty failure list | Server unit |
| AC-006 | Preserve | Load the app's `mcps.json` at startup | Same configs as before | Existing file-provider tests + one for the shared rule |

## Scenarios

| ID | Actor | Goal | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Import servers from another tool or machine | Settings → MCP → Bulk Import | Sees exactly which entries failed and why | Supported Normal |
| SCN-002 | User | Move the app's `mcps.json` to another install | Paste into Bulk Import | All entries import | Supported Normal |

## UI, Interaction, And Experience Requirements

Applicable, small: a failure list under the import button. No Product Design was requested; follow the view's existing styling.

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Result shape | Add `failures: [ImportMcpServerConfigFailure { serverId, reason }]`. Additive, so existing clients keep working. No per-entry success list (the counts cover it) | Solution Designer | Decided |
| DEC-002 | Where the inference rule lives | In the core parser (`parseMcpConfigDict`), which owns "what an MCP config dict means". The file loader then drops its own copy. One rule for import and load | Solution Designer | Decided |
| DEC-003 | Stay on the view after failures? | Yes. Navigating away hides the reasons the user needs. Full success keeps today's navigation | Solution Designer | Decided |
| DEC-004 | Dead `applyAndRegisterConfigsFromJson` | Remove it and its integration test (Core Principle 7). Making import also discover tools would change behavior (and hang-at-start waits), so it's out of scope | Solution Designer | Decided |
| DEC-005 | Fix the web field names (F-3)? | Yes: the same feature, and the new view behavior depends on it (`ticket-scope.md`, "This ticket") | Solution Designer | Decided |

## Traceability

| REQ | UC | AC |
| --- | --- | --- |
| REQ-001, REQ-002 | UC-001 | AC-001 |
| REQ-003, REQ-004 | UC-002 | AC-002, AC-003, AC-006 |
| REQ-005 | UC-001, UC-002 | AC-004 |
| REQ-006 | UC-001 | AC-005 |

## Readiness Check

All checks: Yes. All decisions are within the direction. Approval recorded. Ready for design.
