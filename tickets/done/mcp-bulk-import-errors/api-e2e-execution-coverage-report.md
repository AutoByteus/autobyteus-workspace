# API/E2E Execution Coverage Report — mcp-bulk-import-errors

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route)
- Deviations from the plan:
  - The desktop journey's first run had two driver faults: an inexact "Back" locator, and expecting the Bulk Import button while the view correctly stayed open. The driver was fixed and the whole journey rerun with fresh ids; only the complete rerun counts.
  - The full server e2e had two failing files outside this ticket (O-1).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors/tickets/in-progress/mcp-bulk-import-errors/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `d0cbafdb46` (code `df15c4385d` + `c5161eddc8`) | macOS 26 arm64, node v22.23.1, pnpm 10.28.2 | core and server built in the worktree; in-process and built-server e2e | clean env |
| ENV-2 | same | same | web suite (vitest/nuxt) | — |
| ENV-3 | same | same | packaged worktree build, two isolated instances: A `iso-57326-0a8e`, B `iso-57434-3c52` | own ports and data roots; B's own window driven over CDP (attach only); dummy values; server shapes synthesized from the user's kinds of servers |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001 (unit), AC-003, AC-005, AC-006, AC-004 (component) | core and server units, integration, typecheck, web specs, guards, dev-stack render | Reused IMP-00…IMP-06, IMP-08…IMP-10 | — | Pass | (handoff) | `Tests  2096 passed`; `Tests  6174 passed`; `Tests  23 passed` | code unchanged since `c5161eddc8`. Red proofs: IMP-00 and the store spec |
| API-01 | AC-001, AC-002, preserved 179/181 | GraphQL e2e (3 files) | build, then `vitest run` of the three files | ENV-1 | Pass | `API-01-graphql-e2e.log` | `Tests  6 passed (6)`; `✓ starts with WebSocket-era entries in mcps.json and registers the valid entry next to them` | the moved loader rule keeps the 181 stored-entry tolerance |
| API-02 | regression | full server e2e | `pnpm test:e2e` | ENV-1 | Pass for this ticket; 2 out-of-scope failures | `API-02-server-e2e-full.log` | `Test Files  2 failed \| 89 passed \| 91 skipped (182)`; `rootTeam.taskExecutions[0] is missing required field(s): source.` | O-1: the fixtures of `memory-collaboration-graphql` and `team-task-event-current-contract` lack `source`, required since `65ae647bc9` (autobyteus-197) in this branch's base. This branch touches neither the tests nor the schema |
| API-03 | regression | full web suite | `pnpm -C autobyteus-web test:nuxt --run` | ENV-2 | Pass | `API-03-web-full.log` | `Test Files  642 passed \| 2 skipped (644)`; `Tests  4571 passed \| 5 skipped (4576)` | — |
| API-04 | AC-002, REQ-004, AC-006, SCN-A1, SCN-A2 | install A writes `mcps.json`; its content pasted into B's Bulk Import in B's window; files compared; B restarted | see the evidence header | ENV-3 | Pass | `API-04-05-desktop-bulk-import-journey.txt`, `API-05-full-import-of-a-mcps-json.png` | toast `MCP server configurations imported: 8.`; `stillOnView: false`; `listShowsAll: true`; `A entries 8 \| identical in B 8 \| differing []`; after restart `servers … 10 \| … 10 \| identical True`; file byte-identical | A's file is the app's own format: 6 stdio entries (env, `uv --directory`, prefix, disabled) and 2 HTTP entries (headers; token), no `transport_type` |
| API-05 | AC-001, AC-004, REQ-002, REQ-005, AC-005 (UI), SCN-A3, SCN-A4 | B's window: mixed paste, none imported, invalid JSON, missing `mcpServers` | same driver | ENV-3 | Pass | `API-04-05-desktop-bulk-import-journey.txt`, `API-05-mixed-partial.png`, `API-05-list-after-partial.png`, `API-05-none-imported.png`, `API-05-whole-input-*.png` | mixed: `Imported 1; 4 failed. See the entries below.`, 4 items (websocket, empty, `must be a dictionary`, token+Authorization), `listInViewport: true`, `stillOnView: true`, `listRefreshedShowsMixedOk2: true`; none: `No servers were imported; 2 failed…`; whole input: `SyntaxError: Unexpected end of JSON input` / `Error: JSON must contain a top-level 'mcpServers' object.` with no list; `dummyInDom: false`; `pageErrors: []` | Logs of both instances: `test-dummy` 0. Server log lines for failed entries are value-free |
| API-06 | safety | instances, repo, scan | `isolated-app stop` ×2; ignored-set diff; grep | local | Pass | `API-04-05-…txt` (Stop, Logs) | `"forced": false`, `"dataRootRemoved": true` for both | two stray files from other tests and the build were removed (O-2) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 counts plus named failures with reasons; no secret values | Yes | API-01, API-05 (UI and logs), API-R01 | Proven |
| AC-002 the app's `mcps.json` imports completely; saved shapes equal | Yes | API-01 (in-process round trip), API-04 (packaged, cross-install) | Proven |
| AC-003 explicit type and alias as today | No | API-R01 (IMP-02) | Proven |
| AC-004 view: list shown, stays open, list refreshed, toasts; full success navigates | Yes | API-05, API-04, API-R01 (IMP-08, IMP-10 with zh-CN DOM) | Proven |
| AC-005 whole-input errors as today | No | API-05 (UI), API-R01 (unit) | Proven |
| AC-006 loading `mcps.json` gives the same configs | Yes | API-04 (restart), API-01 (181 stored entries), API-R01 | Proven |

## Validation Confidence Scorecard

| Category | Final | Support | Residual |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | all ACs proven, the key ones in the packaged product | — |
| Changed-boundary execution directness | 97% | GraphQL e2e; the packaged renderer with the packaged server | — |
| Cross-boundary integration realism and mock gap | 96% | two real installs; real file round trip; restart | — |
| Environment, configuration, identity, and fixture fidelity | 95% | packaged build; realistic file shapes | dummy values instead of the user's file (by rule) |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | every per-entry failure kind, none imported, both whole-input errors, restart | — |
| User-surface, browser, and desktop-shell confidence | 95% | the app's own window: DOM assertions and screenshots | zh-CN by DOM only (IMP-10); narrow widths and dark theme not inspected |
| Durable regression coverage quality and relevance | 95% | the ticket's GraphQL e2e, view and store specs (red first) | — |

- Overall final confidence: 95.9%. No category below 90%. Every critical AC proven.
- Broader validation decision: `Required`, executed (full suites; Project Desktop Validation with two isolated instances).

## Observations (not failures of this ticket)

- **O-1 (pre-existing, from autobyteus-197; route as a follow-up):** `pnpm test:e2e` fails in `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` (`rootTeam.taskExecutions[0] is missing required field(s): source.`) and `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` (TASK_EXECUTION_STARTED payload: `source` expected object, received undefined).
  - Commit `65ae647bc9` made `source` required in the task-execution record schema and in the stream contract without updating these test fixtures.
  - This branch changes neither the tests nor the schema, so `origin/personal` fails the same way. The fix belongs to that feature's owner: add the `source` shape to the fixtures.
- **O-2 (pre-existing, seen before):** a server e2e test writes `autobyteus-server-ts/workspaces.json`, and the Electron build leaves `autobyteus-server-ts/autobyteus-web/resources/server/node_modules`. Both were removed after the runs.
- **O-3 (implementation follow-up):** the unrelated `generated/graphql.ts` drift of about 400 lines.

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Instances A and B | `isolated-app stop` | not forced; data roots removed; ports released; no process left |
| Scratch `<L>` (drivers, A's file copy, results, logs) | removed after the evidence was written | done |
| Stray files (O-2) | removed | done |
| Packaging outputs (`electron-dist`, `build/icons`, `resources`, `dist`) | left as untracked build outputs | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: `None`
- Next recipient: Delivery Engineer. Please route O-1 as a follow-up to the Task manager.
- Durable coverage changed by API/E2E: none (the ticket's own tests were validated; the desktop driver is temporary and its source is in the evidence).
