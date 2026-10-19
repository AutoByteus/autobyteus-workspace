# Design Spec — Authentication for remote (streamable HTTP) MCP servers

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction of Task `autobyteus-179` (user informed 2026-10-19 in the Solution Designer conversation).
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers/tickets/in-progress/mcp-http-auth-headers/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers/DESIGN.md` (the only `DESIGN*.md`), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2, `TESTING.md`. `design-examples.md` not used.
- Conflicts or discrepancies: none.

## Current-State Read

A remote MCP server's settings live in one config type, `StreamableHttpMcpServerConfig` (`autobyteus-ts`). It is built from the GraphQL input (save, preview), from `mcps.json` (startup load) or from imported JSON. One client class, `HttpManagedMcpServer`, created only by `McpServerInstanceManager`, opens the SDK transport for registration, preview and every tool call. Agents on every runtime reach external MCP tools only through that path. The ownership is healthy. There are three local defects:

1. `HttpManagedMcpServer` passes `{ url, headers }`, but the SDK reads `requestInit.headers` (BEH-001, probe P-001).
2. The config type keeps `token`, but nothing turns it into a header, and `toStandardEntry` does not persist it (BEH-002).
3. The web form's Form → JSON serializer leaves out headers (BEH-003).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: about 8 production and test files across three packages. Each change is a few lines inside its existing owner: one config method and validation, one transport option, one persistence field, one web serializer line, one hint string in two locales, plus tests and a docs note. No new owner, module, API or schema.
- Architectural risk: `Low`
- Risk rationale: no GraphQL or contract change (`token` and `headers` already exist in input and output). The persistence change is an additive optional key that current and older readers accept (Directly Usable, no migration). No concurrency or deployment impact. Security: credentials go only to the URL the user configured, which is the intended contract. The saved token is stored exactly like headers and env values already are. Moving all of them into the vault is FU-2, by the user's ordering.
- Escalation trigger: if implementation finds another component that builds HTTP transports or persists HTTP configs, or a runtime that receives raw external HTTP configs, or if the SDK cannot take headers via `requestInit`, return a Design Impact.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported |
| --- | --- | --- | --- |
| Probes P-001/P-002 | `jira-mcp-server-presets/probes/*.mjs` | Header missing with current code; present with `requestInit.headers` | Transport fix shape |
| SDK dist | `@modelcontextprotocol/sdk@1.30.0 …/client/streamableHttp.js` L25-73 | `requestInit.headers` merged into all requests and the SSE GET | One option covers every request |
| Code search | `server-instance-manager.ts` L100-101; grep `StreamableHTTPClientTransport` | Single client owner | Fix in one place covers all runtimes |
| Code | `file-provider.ts` `toStandardEntry` / `parseEntry` | Writer drops `token`; reader spreads | Add `token` to the writer only |
| Code | `McpServerFormModal.vue` `updateJsonFromForm` | Headers missing from JSON view | Add headers |

## Intended Change

The configured credentials reach the server: headers via the SDK's `requestInit`, and the token saved and sent as `Authorization: Bearer <token>`. Giving both a token and an `Authorization` header is rejected. The JSON view keeps headers, and the form explains how the token is sent.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Areas: the core HTTP MCP config and client (`autobyteus-ts/src/tools/mcp`); MCP file persistence (`autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`); the web MCP form and its two locale entries; tests; and the docs note in `autobyteus-server-ts/docs/modules/mcp_server_management.md`.
- Deliberately left alone:
  - GraphQL schema and converter, which already carry `token` and `headers`.
  - Secret storage and returning values to the UI (FU-2).
  - The WebSocket transport (not a product path).
  - The external-toy integration test `autobyteus-ts/tests/integration/tools/mcp/http-managed-mcp-server.test.ts`, which stays as is.
  - Stdio servers.
- Follow-ups:
  - FU-2 (vault), as already planned.
  - New observation O-001: the WebSocket MCP transport likely drops headers the same way and is persisted in the stdio shape by `toStandardEntry`. It is not reachable from the product today; record it for the Project Task Manager as a cleanup candidate (remove or fix when WebSocket is offered).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Evidence | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-006; AC-001, AC-006, AC-007 | Save/preview/startup load of an HTTP server; agent tool call | P-001; transport options | Headers sent on every request | DS-002, DS-003 |
| BEH-002 | User | REQ-002, REQ-005; AC-002, AC-005, AC-007 | Form Token field | `toStandardEntry`, no reader | Persisted; sent as Bearer | DS-001, DS-002 |
| BEH-003 | User | REQ-004; AC-004 | Form → JSON switch | `updateJsonFromForm` | Headers included | DS-001 (web part) |
| BEH-004 | User | REQ-003; AC-003 | Save/preview/import with both | none today | Rejected by config validation | DS-001, DS-003 |
| BEH-005 | User | REQ-006; AC-006 | Unauthenticated server | existing tests | Unchanged | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/probes/probe-headers.mjs`, `probe-headers-control.mjs` | Reproduction and control | Basis for the real-SDK test shape |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No`
- Structural triggers considered:
  - Repeated coordination: no, there is one client owner.
  - Authoritative boundary: no bypass, since every caller goes through `McpServerInstanceManager`.
  - Shared-structure tightness: `token` and an `Authorization` header are two inputs for one request header. This is resolved by the explicit conflict rule (REQ-003), not by a second representation.
  - Responsibility overload: no, each touched file gains a few lines within its concern.
- Root cause classification: `Local Implementation Defect` (wrong SDK option; writer omits a field; serializer omits a field) plus a `Missing Invariant` (the token never mapped to a header).
- Refactor needed now: `No`
- Evidence: investigation notes Source Log.
- Design response: let the config type own the effective request headers; let the client pass them in the SDK's documented option; persist the token; serialize headers in the JSON view.
- Intentional deferrals: secrets in plain text (FU-2, R-001).

## Terminology

- *Effective request headers*: the configured `headers`, plus `Authorization: Bearer <token>` when a token is set.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope:
  - the ignored `headers` key and the redundant `url` key in the transport options;
  - the constructor fallback `new sdk.Transport(transportOptions)` (single-argument form), which is unreachable with SDK 1.30, whose constructor is `(url, opts)`;
  - the mock-only assertion of `{url, headers}` in the unit test.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `<appDataDir>/mcps.json` HTTP entries `{url, headers?, enabled?, tool_name_prefix?}`; a handful per user.
- Change: the writer adds an optional `token` string when set.
- Reader: `parseEntry` spreads the entry; `StreamableHttpMcpServerConfig` accepts `token`. Older builds accept and ignore it.
- Invariants: existing entries have no `token`, because the writer never wrote one, so they mean exactly what they meant. A stored entry with both `token` and an `Authorization` header cannot be produced by this build (saving rejects it). On load, such an entry is skipped by `getAll()`'s existing per-entry tolerance, consistent with the guideline's "contain bad data" rule.
- Decision: `Directly Usable — No Migration`.
- Rationale: additive optional field with a tolerant reader. Guideline §2 answers: (1) no migration needed; (2) availability is unaffected; (3) source shape is the current writer's output, with no token; (4) N/A; (5) the existing atomic `updateJsonFile`; (6) no legacy interpretation; (7) no extra I/O; (8) no cross-feature references; (9) AC-002 save → reload test; (10) the guideline was consulted, no mechanism added.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-002/003/004 | MCP form (Form or JSON tab) | `mcps.json` entry | `McpConfigService.configureMcpServer` | Save keeps everything the user entered |
| DS-002 | Primary | BEH-001/002/005 | Startup load, registration, or an agent tool call | Remote MCP server receives authenticated requests | `HttpManagedMcpServer` | Credentials reach the server |
| DS-003 | Primary | BEH-001/004 | Preview or JSON/bulk import | Tool list or saved config | `McpConfigService` (preview / apply) | Same rule and headers before saving |

## Primary Execution Spine(s)

- DS-001: `McpServerFormModal (form/JSON) → GraphQL configureMcpServer → createDomainConfigFromInput → StreamableHttpMcpServerConfig (validate) → McpConfigService.configureMcpServer → FileMcpServerConfigProvider.toStandardEntry → mcps.json`
- DS-002: `mcps.json / saved config → McpConfigService.loadAllAndRegister / discoverAndRegisterToolsForServer → McpToolRegistrar → McpServerInstanceManager → HttpManagedMcpServer.createClientSession(requestHeaders) → SDK StreamableHTTPClientTransport → remote server`. Tool calls follow the same route, `agent (any runtime; Claude/Codex via autobyteus_agent_tools) → registry MCP tool → McpServerInstanceManager → HttpManagedMcpServer.callTool`.
- DS-003: `GraphQL previewMcpServerTools / import → parseMcpConfigDict or createDomainConfigFromInput → StreamableHttpMcpServerConfig (validate) → McpToolRegistrar.listRemoteTools → HttpManagedMcpServer`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | The form (either tab) produces one input with `url`, `token`, `headers`. The server builds the config (rejecting token + Authorization) and persists all three fields. | Form, resolver, config, service, file provider | `McpConfigService` | Localized hint text |
| DS-002 | When connecting, the client asks the config for its effective request headers and gives them to the SDK as `requestInit.headers`. The SDK attaches them to every POST and SSE GET. | Service, registrar, instance manager, client, SDK | `HttpManagedMcpServer` | None |
| DS-003 | Preview and import build the same config, so the same rule and headers apply before anything is saved. | Resolver/import, config, registrar, client | `McpConfigService` | None |

## Spine Actors / Main-Line Nodes

`McpServerFormModal`, `McpServerResolver`, `StreamableHttpMcpServerConfig`, `McpConfigService` (server), `FileMcpServerConfigProvider`, `McpServerInstanceManager`, `HttpManagedMcpServer`, SDK transport.

## Ownership Map

- `StreamableHttpMcpServerConfig` owns the meaning of the HTTP settings: validation (including the token/Authorization conflict and blank-token normalization) and the derived effective request headers.
- `HttpManagedMcpServer` owns translation to the SDK transport (adapter); it does not interpret token semantics itself.
- `FileMcpServerConfigProvider` owns the stored shape.
- `McpServerFormModal` owns the editing views and their round-trip.

## Thin Entry Facades / Public Wrappers

N/A: none added or changed.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `transportOptions.url` and top-level `headers` in `http-managed-mcp-server.ts` | Dead: the SDK reads neither (dist L25-33) | `{ requestInit: { headers: config.requestHeaders() } }` | In This Change | — |
| Fallback `new sdk.Transport(transportOptions)` in the catch branch | Dead: SDK 1.30's constructor is `(url, opts)`, so the first form never throws for that reason | Single `new sdk.Transport(new URL(config.url), options)` | In This Change | Keep the `sdkLoader` test seam |
| Mock assertion `toEqual({ url, headers })` in `tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | It asserts the bug | A real-SDK test against an in-process server | In This Change | — |
| WebSocket transport header handling / stdio-shaped persistence | Not a product path | — | Follow-up (O-001) | Report only |

## Return Or Event Spine(s)

N/A: request and response only; the error path is unchanged (BEH-005).

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Token hint text (en, zh-CN) | DS-001 | `McpServerFormModal` | Explain the Bearer scheme and where Basic goes | REQ-005 | — |

## Ownership Boundaries

Callers outside `autobyteus-ts` never build SDK transports. The server and web depend only on the config type and the GraphQL contract.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `StreamableHttpMcpServerConfig` | token → header derivation, conflict rule | client, server resolver, file provider | Composing `Authorization` from `token` anywhere else (resolver, file provider, web) | Add to the config type |
| `HttpManagedMcpServer` | SDK option shape | `McpServerInstanceManager` | Other modules constructing `StreamableHTTPClientTransport` | — |

## Dependency Rules

- The web form must not compute the Authorization header; it sends `token` and `headers` as entered.
- The server must not merge the token into `headers` when persisting. `token` and `headers` stay separate fields, as the user entered them.
- No logging of `headers`, `token` or `requestHeaders()` values. The conflict error message names fields only.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `StreamableHttpMcpServerConfig.requestHeaders(): Record<string, string>` (new) | One HTTP MCP server config | Effective request headers (copy) | The config instance | Returns `headers` plus `Authorization: Bearer <token>` when a token is set |
| Constructor validation (extended) | Same | Throw when the token is set and any header name equals `authorization` case-insensitively | — | Message: "Streamable HTTP MCP server '<id>' sets both 'token' and an 'Authorization' header; use one of them." |
| `FileMcpServerConfigProvider.toStandardEntry` (modified) | Stored entry | Writes `token` when non-null | server_id key | — |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `requestHeaders()` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Effective headers | `requestHeaders()` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Header derivation | `autobyteus-ts/src/tools/mcp/types.ts` config type | Extend | Owns HTTP settings |
| Validation | Same constructor | Extend | Existing validation home |
| Hint text | Web localization `tools.generated.ts` | Extend | Existing message catalogue |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-ts` MCP tools | Config semantics, SDK adapter | DS-002, DS-003 | Extend |
| Server MCP server management | Persistence | DS-001 | Extend |
| Web tools UI | Form round-trip, hint | DS-001 | Extend |

## Draft File Responsibility Mapping

See the final mapping; no extraction was needed.

## Reusable Owned Structures Check

N/A: no repeated structure appears; the header derivation lives in one method.

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `StreamableHttpMcpServerConfig` (`url`, `token`, `headers`) | Yes | Yes | Medium (token vs Authorization header) | Conflict rule makes them mutually exclusive for `Authorization` |

## Final File Responsibility Mapping

| File | Owner | Change |
| --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/types.ts` | Config type | Normalize the token (trim; blank → `null`); reject token + `authorization` header; add `requestHeaders()` |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | SDK adapter | `new sdk.Transport(new URL(config.url), { requestInit: { headers: config.requestHeaders() } })`; remove the dead fallback and keys |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | Test | Replace the mock assertion with real-SDK tests: an in-process MCP server (SDK `McpServer` + `StreamableHTTPServerTransport`, `127.0.0.1`, port 0) that answers 401 without the expected header. Cases: header → connect, list, call OK and the server saw it on each request; token → same with `Bearer`; no credentials against an open server → OK; wrong value → error. Dummy values only. |
| `autobyteus-ts/tests/unit/tools/mcp/types.test.ts` | Test | Conflict rule (any case), blank token, `requestHeaders()` |
| `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` | Persistence | Write `token` when set |
| `autobyteus-server-ts/tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` (or a focused file-provider test) | Test | Save an HTTP server with token and headers → reload → both present |
| `autobyteus-web/components/tools/McpServerFormModal.vue` | Form | Include `headers` (when non-empty) in `updateJsonFromForm`; add the hint under the Token field |
| `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts` | Test | Form → JSON keeps headers; hint renders |
| `autobyteus-web/localization/messages/en/tools.generated.ts`, `…/zh-CN/tools.generated.ts` | Messages | New hint key, e.g. `token_hint`: "Sent as 'Authorization: Bearer <token>'. For other schemes (for example Basic), add an Authorization header in the JSON view instead." |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Docs | Short note on `headers` and `token` semantics and the conflict rule (delivery may refine during docs sync) |

## Applied Patterns

Adapter (`HttpManagedMcpServer` translates the config into SDK options), unchanged.

## Target Subsystem / Folder / File Mapping

Existing files only; see the final mapping. No new folders.

## Folder Boundary Check

N/A: no placement changes.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| SDK options | `new Transport(new URL(url), { requestInit: { headers } })` | `new Transport(url, { url, headers })` | The SDK ignores top-level `headers` |
| Token | Config `{url, token: "t"}` → request header `Authorization: Bearer t` | Merging the token into stored `headers` | Keeps what the user entered; one derivation owner |
| Conflict | `{token: "t", headers: {authorization: "Basic x"}}` → error naming both fields | Silently preferring one | "Nothing silently dropped" |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the single-argument transport constructor fallback | Old SDK shapes | Rejected | Single documented constructor |
| Also pass top-level `headers` "just in case" | Defensive | Rejected | `requestInit.headers` only |

## Change / Refactor Sequence

1. `types.ts`: token normalization, conflict validation, `requestHeaders()`, with unit tests.
2. `http-managed-mcp-server.ts`: the SDK option fix and removal of the dead fallback, with the real-SDK test (red first against the current code, then green).
3. `file-provider.ts`: persist the token, with a save/reload test.
4. Web: JSON view headers, hint and locales, with a component test; then the localization guards.
5. Docs note.
6. Build `autobyteus-ts` so the server consumes the change; run the server unit, integration and typecheck suites.

## Key Tradeoffs

- Keeping the Token field (versus removing it): it already exists end to end, and Bearer is the common scheme. Cost: one more field stored in plain text until FU-2.
- Rejecting the conflict (versus precedence): a little more friction, but no silent override.

## Risks

- R-001: plain-text token until FU-2 (accepted).
- R-002: an SDK option change, caught by the real-SDK test.

## Guidance For Implementation

- Never log header or token values; keep the conflict message value-free.
- The real-SDK test must not mock the SDK. Use port 0 and close the server in `afterEach`/`afterAll`.
- Build `autobyteus-ts` (`pnpm -C autobyteus-ts build`) before server tests, which import the package output.
- No real credentials or external servers.
- Validation (API/E2E) should cover AC-007: a selected agent calls a tool of a header-protected local server through the AutoByteus server, on the native runtime at least, and Claude or Codex when the environment allows.
