# Stage 7 Executable Validation: MCP JSON View Preview/Save Source-of-Truth UX

## Validation Round Meta

- Current Validation Round: `2`
- Trigger Stage: `Stage 10 user-requested validation re-entry`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

## Testing Scope

- Ticket: `mcp-json-view-preview-save`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/mcp-json-view-preview-save/workflow-state.md`
- Requirements source: `tickets/in-progress/mcp-json-view-preview-save/requirements.md`
- Call stack source: `tickets/in-progress/mcp-json-view-preview-save/future-state-runtime-call-stack.md`
- Design source: `tickets/in-progress/mcp-json-view-preview-save/implementation.md` solution sketch
- Interface/system shape in scope: `Browser UI` component action behavior with mocked Pinia side-effect boundary
- Platform/runtime targets: Nuxt/Vue component test runtime via Vitest/jsdom; live Nuxt dev frontend against Electron-started backend at `127.0.0.1:29695`
- Lifecycle boundaries in scope: `None`

## Validation Asset Strategy

- Durable validation assets added/updated in the repository: `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts`
- Temporary validation methods/setup: local ignored `node_modules` and `.nuxt` symlinks used only to execute tests in the isolated ticket worktree.
- Cleanup expectation for temporary validation: ignored symlinks are not tracked; keep local only for repeated validation in this worktree.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Gate Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | No | Targeted Vitest passed 7 component tests. |
| 2 | User-requested live frontend/backend validation | Yes | No | Pass | Yes | Nuxt dev frontend exercised against Electron-started backend at `127.0.0.1:29695`; live JSON Preview and Save passed; temporary saved server was deleted. |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001/R-002 | JSON View preview parses current textarea and calls preview with JSON-derived STDIO payload | AV-001, AV-009 | Passed | 2026-06-18 |
| AC-002 | R-001/R-003 | JSON View save parses current textarea and calls configure with JSON-derived payload | AV-002, AV-010 | Passed | 2026-06-18 |
| AC-003 | R-001/R-002/R-003 | Form View preview/save behavior remains form-derived | AV-003 | Passed | 2026-06-18 |
| AC-004 | R-006 | Standard STDIO MCP JSON shape works | AV-001 | Passed | 2026-06-18 |
| AC-005 | R-006 | Standard HTTP MCP JSON shape works and preserves headers | AV-004 | Passed | 2026-06-18 |
| AC-006 | R-006 | Transport and tool-name-prefix aliases are accepted | AV-004, AV-009, AV-010 | Passed | 2026-06-18 |
| AC-007 | R-007 | Invalid/unsupported JSON blocks action without stale form fallback | AV-005 | Passed | 2026-06-18 |
| AC-008 | R-004 | Existing persistence/schema path remains unchanged | AV-006, AV-010 | Passed | 2026-06-18 |
| AC-009 | R-008 | Edit mode preserves existing server ID | AV-007 | Passed | 2026-06-18 |
| AC-010 | R-005 | Apply JSON to Form remains optional and still works | AV-008 | Passed | 2026-06-18 |

## Spine Coverage Matrix

| Spine ID | Spine Scope | Governing Owner | Scenario ID(s) | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `McpServerFormModal.vue` | AV-001, AV-002, AV-003, AV-004, AV-006, AV-007, AV-009, AV-010 | Passed | User action reaches correct Pinia store/backend boundary with expected payload. |
| DS-002 | Bounded Local | `McpServerFormModal.vue` | AV-001, AV-004, AV-005, AV-007, AV-008, AV-009, AV-010 | Passed | JSON text is parsed/validated/normalized into action payload or recoverable error. |
| DS-003 | Primary End-to-End | `McpServerFormModal.vue` | AV-008 | Passed | Optional conversion populates Form View, then Form preview path works. |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode | Platform / Runtime | Lifecycle Boundary | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001, DS-002 | Requirement | AC-001, AC-004 | R-001, R-002, R-006 | UC-001 | Browser UI | Vitest/jsdom | None | JSON preview must not require Apply JSON to Form | `previewMcpServer` receives STDIO payload from textarea JSON | `McpServerFormModal.spec.ts` | ignored symlinks for worktree test runtime | `pnpm test:nuxt run components/tools/__tests__/McpServerFormModal.spec.ts` | Passed |
| AV-002 | DS-001, DS-002 | Requirement | AC-002 | R-001, R-003 | UC-002 | Browser UI | Vitest/jsdom | None | JSON save must use active JSON input | `configureMcpServer` receives JSON-derived payload | `McpServerFormModal.spec.ts` | same | same | Passed |
| AV-003 | DS-001 | Requirement | AC-003 | R-001, R-002, R-003 | UC-003 | Browser UI | Vitest/jsdom | None | Form View must remain intact | Form fields drive preview payload | `McpServerFormModal.spec.ts` | same | same | Passed |
| AV-004 | DS-001, DS-002 | Requirement | AC-005, AC-006 | R-006 | UC-001, UC-002 | Browser UI | Vitest/jsdom | None | HTTP inference/aliases/headers must map correctly | HTTP payload uses `STREAMABLE_HTTP`, prefix alias, and headers | `McpServerFormModal.spec.ts` | same | same | Passed |
| AV-005 | DS-002 | Requirement | AC-007 | R-007 | UC-004 | Browser UI | Vitest/jsdom | None | Invalid/multi JSON must not call stale action payloads | Preview/save actions are blocked with error feedback | `McpServerFormModal.spec.ts` | same | same | Passed |
| AV-006 | DS-001 | Requirement | AC-008 | R-004 | UC-002 | Other | Static diff + component behavior | None | No backend/schema/storage contract drift | Only frontend component/test changed before docs; store/GraphQL/backend persistence unchanged | git diff review + component tests | N/A | `git diff --name-only origin/personal -- autobyteus-server-ts autobyteus-ts autobyteus-web/graphql autobyteus-web/generated` | Passed |
| AV-007 | DS-001, DS-002 | Requirement | AC-009 | R-008 | UC-001, UC-002 | Browser UI | Vitest/jsdom | None | Edit-mode disabled ID semantics must hold in JSON View | Payload uses existing server ID, not pasted JSON key | `McpServerFormModal.spec.ts` | same | same | Passed |
| AV-008 | DS-002, DS-003 | Requirement | AC-010 | R-005, R-006 | UC-005 | Browser UI | Vitest/jsdom | None | Apply JSON to Form should be optional and consistent | Conversion populates form and subsequent preview uses form payload | `McpServerFormModal.spec.ts` | same | same | Passed |
| AV-009 | DS-001, DS-002 | Requirement | AC-001, AC-004, AC-006 | R-001, R-002, R-006 | UC-001 | Browser UI | Nuxt dev + Electron-started backend | None | Live JSON View preview should parse pasted JSON and call real backend preview instead of hidden form state | UI displayed `Discovered Tools` with `codex_live_speak` from pasted JSON server ID/prefix | Browser automation against `http://127.0.0.1:3000/settings?section=mcp-servers` | Nuxt dev proxied to `http://127.0.0.1:29695`; backend verified via `/rest/health` | Start frontend: `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 BACKEND_GRAPHQL_WS_ENDPOINT=ws://127.0.0.1:29695/graphql pnpm dev --host 127.0.0.1 --port 3000`; then browser automation | Passed |
| AV-010 | DS-001, DS-002 | Requirement | AC-002, AC-006, AC-008 | R-001, R-003, R-004, R-006 | UC-002 | Browser UI | Nuxt dev + Electron-started backend | None | Live JSON View save should persist JSON-derived config without Apply JSON to Form or sync-on-save side effect | `codex_live_save` appeared in MCP server list with prefix `codex_save`, then cleanup delete mutation removed it | Browser automation + GraphQL cleanup verification | Temporary server created with sync unchecked, then deleted via `deleteMcpServer`; follow-up `mcpServers` query listed only original servers | Same frontend command plus GraphQL cleanup query | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type | Durable In Repo | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts` | Browser/UI component test | Yes | AV-001 through AV-005, AV-007, AV-008 | Tests active-view source-of-truth behavior, JSON parser aliases, invalid input, edit ID preservation, optional conversion, and Form View regression. |
| Live Nuxt frontend against Electron-started backend | Browser/UI live validation | No (execution evidence only) | AV-009, AV-010 | Started Nuxt dev with proxy to `http://127.0.0.1:29695`, used browser automation to run JSON View Preview/Save flows, and cleaned up the temporary saved server. |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required | Cleanup Status |
| --- | --- | --- | --- | --- |
| Symlinked `autobyteus-web/node_modules` and `.nuxt` from the main checkout into the ticket worktree | The isolated git worktree did not have dependencies or Nuxt generated types, but the main checkout already did. | AV-001 through AV-008 plus frontend startup | No tracked cleanup required | Ignored local symlinks only; not part of git status. |
| Nuxt dev server on `127.0.0.1:3000` proxied to Electron backend `127.0.0.1:29695` | User requested live frontend/backend validation | AV-009, AV-010 | Yes | Dev server stopped after validation; temporary saved MCP server deleted. |

## Prior Failure Resolution Check

N/A for round 1; no prior failures.

## Failure Escalation Log

None.

## Feasibility And Risk Record

- Any infeasible scenarios: `No`
- Environment constraints: isolated worktree lacked `node_modules`/`.nuxt`; resolved with ignored local symlinks.
- Compensating automated evidence: N/A; all scenarios executable.
- Residual risk notes: Component tests mock the store boundary and do not run a live backend, which is appropriate because backend/schema/persistence are intentionally unchanged.
- Human-assisted execution steps required: `No`
- User waiver for infeasible acceptance criteria recorded: `N/A`
- Temporary validation-only scaffolding cleaned up: `N/A` (ignored local symlinks retained for continued validation only)

## Stage 7 Gate Decision

- Latest authoritative round: `2`
- Latest authoritative result: `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion: `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes: Targeted command passed: `pnpm test:nuxt run components/tools/__tests__/McpServerFormModal.spec.ts` (7 tests; re-run at 2026-06-18 08:59 CEST). `git diff --check` passed. Additional live frontend/backend validation passed on 2026-06-18: JSON View Preview displayed `codex_live_speak`; JSON View Save created `codex_live_save`; cleanup delete mutation succeeded and follow-up query confirmed only original servers remained.
