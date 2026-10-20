# API/E2E Coverage Investigation — mcp-bulk-import-errors

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001; Small / Low)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct route)
- Latest Authoritative Investigation: this file

Paths are relative to the ticket folder in `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors` (branch `codex/mcp-bulk-import-errors`). Code: `df15c4385d` (core, server, web) plus `c5161eddc8` (web polish). HEAD `d0cbafdb46` adds ticket files only.

## Current Requirement And Design Basis

- REQ-001 / REQ-002 / AC-001: the import result keeps its counts, `success` and `message`, and adds `failures { serverId, reason }`. Reasons carry no env, header or token values.
- REQ-003 / REQ-004 / AC-002, AC-003, AC-006:
  - one transport rule in the core parser: explicit type or alias wins; else `url` → streamable HTTP, `command` → stdio; neither → a reason naming both;
  - the app's own `mcps.json` imports completely, and the saved shapes equal the originals;
  - the loader uses the same rule.
- REQ-005 / AC-004: the view lists failures, stays open on partial or none, refreshes the list when anything was imported, toasts by counts (en and zh-CN), and navigates on full success.
- REQ-006 / AC-005: whole-input errors are unchanged.
- Preserved: explicit types, aliases, `websocket` rejection (181), and `mcps.json` loading behavior (including the 181 WebSocket-era entries being skipped).

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (mixed import from another tool), SCN-002 (move the app's `mcps.json` to another install).
- Added:
  - SCN-A1 — the real product, end to end. Install A writes its `mcps.json` through the product (servers added through GraphQL as the form does). Its file content is pasted into the Bulk Import view of a fresh install B, in the packaged desktop app's own window. B's saved file must equal A's for every entry, and B must keep them after a restart (load path through the same rule).
  - SCN-A2 — a realistic exported file, synthesized from the user's real server shapes (read earlier for command shape and env key names only): several `uv --directory … run …` stdio servers, one with env keys and `tool_name_prefix`; HTTP with headers, HTTP with token, a disabled entry. Dummy values only.
  - SCN-A3 — whole-input errors in the real window: invalid JSON; JSON without `mcpServers`.
  - SCN-A4 — reasons from the other per-entry checks in a mixed paste: a string entry ("must be a dictionary"); token plus Authorization (179 conflict, value-free).
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Repository Evidence | Not Exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain logic (core parser, service) | Yes | transport inference, per-entry results | IMP-00 red, IMP-02, IMP-05 | — | — |
| API / GraphQL contract | Yes (additive) | `failures` field | IMP-07 (in-process) | packaged server | isolated instance |
| Persisted data (`mcps.json` load) | Yes (rule moved) | loader no longer infers | IMP-05 transport-rule test | real startup on imported entries | isolated instance restart |
| Frontend component / store | Yes | view behavior; store field fix | IMP-08 (component), IMP-10 (dev stack) | the packaged renderer with the packaged server | isolated instance, the app's own window over CDP |
| Localization | Yes | 3 new strings × 2 locales | IMP-09, IMP-10 (zh-CN DOM) | — | — |
| Desktop shell | No (renderer and server only) | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root).
  - Browser and desktop: an isolated instance (`pnpm --silent isolated-app start --build`, `--from-worktree` for a second instance of the same build), driven with assertions through its control port (`controlPort`, CDP on loopback).
  - Never the user's app or data. Stop what you start. A skip is not a pass.
- Driver: `playwright-core` (present in `autobyteus-web`), `chromium.connectOverCDP(http://127.0.0.1:<controlPort>)`. Attach only; never launch or close the app through it.
- Secrets: none; dummy values only.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-bulk-import.e2e.test.ts` (new) | GraphQL mixed import; `mcps.json` round trip | AC-001, AC-002 | Under validation | Rerun |
| `autobyteus-server-ts/tests/unit/.../mcp-config-service.test.ts`, `file-provider.transport-rule.test.ts`, core `config-service.test.ts` | service, loader rule, parser | AC-001, AC-003, AC-005, AC-006 | Still Valid (IMP-02, IMP-05) | Reuse |
| `autobyteus-web/components/tools/__tests__/McpBulkImportView.spec.ts`, `stores/__tests__/toolManagementStore.mcpImport.spec.ts` | view, store | AC-004 | Still Valid (IMP-08) | Reuse; plus the full web suite |
| `…/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` (181) | websocket import rejection; WebSocket-era `mcps.json` entries skipped at startup | preserved | Still Valid | Rerun (the loader rule moved) |
| `…/mcp-http-auth-remote-server.e2e.test.ts` (179) | import with headers and token; conflict rejection | preserved | Still Valid | Rerun |
| `mcp-config-service.integration.test.ts` dead `applyAndRegister` case | removed with the dead method | — | Stale / Removed by implementation (DEC-004) | none |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001 (unit), AC-003, AC-005, AC-006, AC-004 (component) | units, integration, typecheck, web specs, guards, dev-stack render | Reused | IMP-00…IMP-06, IMP-08…IMP-10 | code unchanged since `c5161eddc8` |
| API-01 | AC-001, AC-002, preserved 179/181 | GraphQL e2e files: bulk import, 181 redirect/transport (WebSocket-era entries), 179 auth | Existing Test | `env -i … vitest run <3 files>` (after the server build) | independent rerun, including the loader rule's preserved cases |
| API-02 | regression | full server e2e | Existing Test | `pnpm test:e2e` | the parser and loader are shared foundations |
| API-03 | regression | full web suite | Existing Test | `pnpm -C autobyteus-web test:nuxt --run` | the store and `generated/graphql.ts` changed |
| API-04 | AC-002, REQ-004, AC-006, SCN-A1, SCN-A2 | two isolated instances of one packaged build: A writes a realistic `mcps.json` through GraphQL; its content is pasted into B's Bulk Import in B's own window; B's file compared with A's; B restarted and servers listed | Journey | `isolated-app start --build` (A), `isolated-app start --from-worktree` (B), CDP driver, `isolated-app restart` (B) | the real product path the user takes |
| API-05 | AC-001, AC-004, REQ-002, SCN-A3, SCN-A4 | B's window: a mixed paste (ok, websocket, empty, string entry, token+Authorization with dummy values) and whole-input errors | Journey | same driver | the failure list, stay-open, refresh, toasts, no values in DOM or logs |
| API-06 | AC-009-style safety | instances stopped, repo state, scan | Temporary Probe | ignored-set diff, `ps`, grep | — |

- Test progress log: `Yes`
- Durable coverage by API/E2E: none planned. The journey is a desktop UI check; the GraphQL behavior it relies on already has the ticket's durable e2e.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-Only? |
| --- | --- | --- | --- |
| zh-CN screenshot; narrow widths; dark theme | zh-CN is covered by DOM (IMP-10); the layout uses the view's existing styling | Low | No |
| The unrelated `generated/graphql.ts` drift (about 400 lines) | outside scope; the implementation lists it as a follow-up | None for this ticket | No |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes by API/E2E: `No`. Reroute: `No`.
