# Design Spec — `list_available_agent_runtimes` and Settings → Model Routing "Agent runtimes now" (autobyteus-303)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction the user set (2026-10-24/25), user informed.
- Behavior-defining supplements: none.
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/available-agent-runtimes-tool/investigation-notes.md`
- Authorities read (2026-10-24/25): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md` (Cases 1–7), `GLOSSARY.md`, `TESTING.md`.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

- Each external agent runtime already has one stateless `AgentRuntimeStrategy` (C-01, C-02) holding its runtime-specific commands: executable, version, update, sign-in. `AgentRuntimeSignInReader` (C-07) and `RuntimeAvailabilityService` (C-08) are the owners of "signed in" and "installed". The Agent Runtimes page's `AgentRuntimeStatusService` keeps cached page rows and operations; it is not a live-read owner.
- Offered models per runtime come from one place, `ModelCatalogService.runtimeModelSelectionCatalog` (C-09). AutoByteus provider key status comes from `LlmProviderService.listProviderCredentialSettings` (C-10); provider keys are resolved through the server's secret resolver (C-11).
- Each runtime's client can make the limit read: the Codex app-server lease (C-03), the Claude SDK short control query (C-04), the ACP short process with an extension request (C-05), and the command runner (C-06).
- Opt-in agent tools follow one pattern: a contract, a local tool in `defaultToolRegistry` (it then appears in the tool picker), and an Agent Tools MCP adapter (C-12). The MCP catalog offers a static adapter only when the definition lists the tool (`agent-tool-mcp-catalog.ts:106-113`).
- No design problem in these owners; they absorb the feature by extension.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: about 30 source files across five areas: runtime-management (4 strategies + interface, Claude control query, ACP extension request, limit parsers), llm-management (provider usage readers), a new composing service, agent-tools (contract, local tool, MCP adapter), GraphQL, and the web page (section, rows, settings nav, i18n). Plus tests per reader and docs.
- Architectural risk: `High`
- Risk rationale: four new external dependency contracts, one of them marked experimental (Claude `get_usage`), one a CLI command's JSON (Antigravity), one undocumented (Grok `_x.ai/billing`); short-lived child processes spawned per call (Claude CLI, `agy`, `grok agent stdio`, plus the Codex lease) with time-outs and concurrent callers; new agent-tool and GraphQL contracts; a credential-handling path (provider keys used for balance calls). No persistence and no peer contract.
- Escalation trigger: a reader that would need tokens or a model request; any need to cache, persist or poll; any credential or identity reaching the answer or logs.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| P-01…P-05 (Measured) | `evidence/limit-probes/` | Each limit source answers in 0.2–2.7 s with 0 tokens | Live reads, no cache | UNK-001 (Grok used %) |
| C-01, C-02 (Read) | `agent-runtime-strategy.ts`, `create-agent-runtime-strategies.ts` | Strategy per runtime | `readUsageLimits` on the strategy | — |
| C-03 (Read) | `codex-agent-runtime-strategy.ts:27-46` | Lease + `client.request` | Codex reader | — |
| C-04 (Read) | `claude-sdk-client.ts:204-220, 381-431` | Short control query for models | Shared `claudeSdkControlQuery` for models and usage | Experimental API |
| C-05 (Read) | `acp-discovery-handshake.ts`, `acp-client-connection.ts:138-140`, SDK `acp.js:1272` | `extension(method)` sends the name unchanged | `runAcpExtensionRequest(profile, "_x.ai/billing")` | — |
| C-06 (Read) | `runtime-command-runner.ts` | Bounded, never throws, output not logged | Antigravity reader | — |
| C-09, C-10, C-11 (Read) | model catalog, provider service, secret resolver | Models, key status, keys | AutoByteus part | — |
| C-12 (Read) | agent-discovery tools, MCP catalog | Opt-in pattern, filtered by definition | Tool surfaces | — |
| C-13, C-14 (Read) | GraphQL, settings page | Patterns | Query + page section | — |

## Intended Change

Add a live, read-only answer "what can run on this node now": one service composes, per agent runtime, installed + signed-in state (existing owners), offered models (existing catalog) and usage limits (a new `readUsageLimits` on each runtime's strategy, and per-provider readers for AutoByteus). The answer is exposed as the opt-in tool `list_available_agent_runtimes` and the GraphQL query `availableAgentRuntimes`, shown on a new Settings → Model Routing page section "Agent runtimes now".

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Areas: `runtime-management/agent-runtimes` (strategy interface, four strategies, limit parsers, the composing service), `runtime-management/claude/client` (shared control query), `runtime-management/acp` (extension request), `llm-management/provider-usage` (new: AutoByteus provider readers), `agent-tools/agent-runtimes` (new tool) + MCP adapter registration, `api/graphql/types` (new query), composition wiring, web Settings (nav entry, Model Routing manager, section, row, presentation helper, i18n en + zh-CN), docs (server module doc, GLOSSARY "agent runtime").
- Derived consumers: `AgentRuntimeStrategy` gains a method → its four implementations and every test double of the interface (status-service and sign-in-reader tests) must implement it; no other reader of strategies changes. `ClaudeSdkClient` model discovery moves onto the shared control query → `listModels` behavior unchanged (its tests stay green).
- Deliberately left alone: Agent Runtimes page and `AgentRuntimeStatusService` (cached rows, operations, update notifications); model catalogs; agent run paths; GLM (FU-003 of autobyteus-32).
- Follow-ups: none new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..008, 010; AC-001..009, 011, 012 | Tool call | none | Live answer | DS-001 |
| BEH-002 | User | REQ-009; AC-010 | Settings → Model Routing | none | Section shows the answer | DS-002 |
| BEH-003 | System | REQ-004, 005, 008 | Inside DS-001 | none | Limit readers | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/limit-probes/` | Probe scripts and results | REQ-004, 005 | Fixtures for reader tests (redacted: no account IDs, emails, names) | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers: *Capability-area reuse* fires (installed, sign-in, models, keys) → reused owners. *Several kinds or forms* fires (five runtimes; AutoByteus providers; tool on five runtimes via local tool + MCP) → each traced (C-03…C-06, C-10, C-12). *Responsibility overload* checked: `claude-sdk-client.ts` is 438 lines; adding usage directly would approach the 500-line limit and duplicate the short control query → extract the shared control query. *Derived data*: per-model `blocked` is derived once in the composing service from the reader's mapping. *Repeated coordination* ruled out: one composer owns parallel reading and time-outs.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No` beyond the small extraction of the Claude control query (keeps the client under the size limit and gives model discovery and usage one helper).
- Evidence: C-01…C-14.
- Design response: extend owners; one new composing service.
- Intentional deferrals: none.

## Terminology

- **Agent runtime** (added to GLOSSARY): what runs an agent (`RuntimeKind`): AutoByteus, Claude Agent SDK, Codex, Antigravity, Grok. Not the LLM runtime (`LLMRuntime`: where an AutoByteus model is served).
- **Available agent runtime**: installed on the node and not known to be signed out (REQ-002).
- **Usage limit**: a runtime's or provider's own limit (window, remaining percent, reset time, blocked). Not a launch "usable" check.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the private `tryGetSupportedModelsFromQueryControl` of `ClaudeSdkClient` moves into the shared control query (no second copy).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `Not Affected`: live reads only; nothing is stored.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Agent calls `list_available_agent_runtimes` (any runtime) | Tool result (JSON text) | `AvailableAgentRuntimesService` | The tool |
| DS-002 | Primary End-to-End | BEH-002 | User opens the page / Check again | Section rendered | Same service via GraphQL | The page |
| DS-003 | Bounded Local | BEH-003 | Service asks one runtime | Runtime entry or "limits unknown" | The runtime's strategy / provider reader | Per-runtime reading |

## Primary Execution Spine(s)

- DS-001: `Agent (AutoByteus local tool | Agent Tools MCP adapter) → listAvailableAgentRuntimesFor() → AvailableAgentRuntimesService.read() → [per runtime in parallel: RuntimeAvailabilityService → AgentRuntimeSignInReader → ModelCatalogService.runtimeModelSelectionCatalog → strategy.readUsageLimits] + [AutoByteus: LlmProviderService.listProviderCredentialSettings → ModelCatalogService → ProviderUsageReaders] → AvailableAgentRuntimesReport → JSON text`
- DS-002: `ModelRoutingManager.vue → AgentRuntimesNowSection.vue → GraphQL availableAgentRuntimes → AvailableAgentRuntimesService.read() → report → rows`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The tool takes no input. The service reads every agent runtime in parallel. An external runtime is left out when not installed or known signed out; otherwise its models and limits are read, each step bounded by a time-out. AutoByteus lists the providers whose key is configured (or local providers with models), with their models and, where a reader exists, their balance or block. The service maps limits to models, marks blocked models, and returns one report; the tool renders it as JSON. | tool surfaces, service, strategies, provider readers | `AvailableAgentRuntimesService` | parsers, time-out helper |
| DS-002 | The page section queries the same report on open and on "Check again" and renders runtime rows. | section, query | same | presentation helper |
| DS-003 | A strategy reads its runtime's limit source and returns `UsageLimitsReading`: `read` (limits + runtime-specific details), `not_reported`, or `unknown` (reason). It never throws to the service. | strategy, parser | strategy | client helpers |

## Spine Actors / Main-Line Nodes

Tool surfaces; `AvailableAgentRuntimesService`; four `AgentRuntimeStrategy` implementations; AutoByteus `ProviderUsageReader`s; `availableAgentRuntimes` resolver; page section.

## Ownership Map

- `AvailableAgentRuntimesService`: the "available" rule (REQ-002), parallel reading with per-reader time-outs (REQ-010), the AutoByteus provider rule, mapping limits to models and deriving `blocked`, the report shape, and the "never fails as a whole" rule (REQ-007).
- `AgentRuntimeStrategy.readUsageLimits(executable, cwd)`: how one runtime reports its limits and which models each limit applies to.
- `ProviderUsageReader` (one per readable AutoByteus provider): how one provider reports balance/block, using the provider key from the secret resolver.
- Tool surfaces and GraphQL resolver: thin; no rules.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `AutoByteusListAvailableAgentRuntimesTool`, MCP adapter | service | Runtime-neutral tool | Filtering, mapping |
| `availableAgentRuntimes` GraphQL query | service | Page | Same |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| `ClaudeSdkClient.tryGetSupportedModelsFromQueryControl` (`claude-sdk-client.ts:381-431`) | Same short control query needed for usage | `claude-sdk-control-query.ts` `withClaudeControlQuery(...)` used by `listModels` and `readUsage` | Behavior of `listModels` unchanged |

## Return Or Event Spine(s) (If Applicable)

N/A (request/response).

## Bounded Local / Internal Spines (If Applicable)

- Parent `AvailableAgentRuntimesService.read()`: `for each runtime kind (parallel) → installed? → signIn (signedOut → omit) → models → limits (time-out 15 s → unknown) → map limits to models → entry` then `AutoByteus → keyed/local providers → models grouped by provider_id → reader per provider (time-out 10 s) → provider entries` → `report {checkedAt, agentRuntimes[]}` (order: Codex, Claude, Antigravity, Grok, AutoByteus).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why |
| --- | --- | --- | --- | --- |
| Limit parsers (`codex-usage-limits.ts`, `claude-usage-limits.ts`, `antigravity-usage-limits.ts`, `grok-usage-limits.ts`) | DS-003 | strategies | Raw answer → `UsageLimitsReading`; drop identities | Pure, unit-tested from fixtures |
| `claude-sdk-control-query.ts` | DS-003 | Claude client | Short control query lifecycle | Shared by models and usage |
| `runAcpExtensionRequest` | DS-003 | Grok strategy | `initialize` + one extension request, process always stopped | Reuses ACP handshake |
| `withTimeout` (existing helper if present, else local) | DS-001 | service | Bound each read | QR-001 |

## Ownership Boundaries

- The service is the only caller of `readUsageLimits` and of provider readers. Strategies never call each other or the catalog.
- Provider keys are resolved inside the provider readers through the server's resolver and never leave them.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AvailableAgentRuntimesService.read()` | strategies, readers, catalog, sign-in, availability | tool surfaces, GraphQL | Tool or page calling a strategy or reader directly | Add to the report |

## Dependency Rules

- `agent-tools/agent-runtimes` → `runtime-management/agent-runtimes/available-agent-runtimes-service` only.
- Service → `runtime-management` (strategies, sign-in, availability), `llm-management` (catalog, provider service, `provider-usage`).
- `llm-management/provider-usage` → `secret-management` resolver; never → `runtime-management`.
- Strategies → their runtime's client modules only.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `AgentRuntimeStrategy.readUsageLimits(executable: string, cwd: string): Promise<UsageLimitsReading>` | one runtime | its limits | runtime kind (strategy) | Never throws |
| `ProviderUsageReader.read(provider: LlmProviderDescriptor, models: ModelInfo[]): Promise<ProviderUsageReading>` | one AutoByteus provider | balance / block | provider ID | Registry by `LLMProvider` |
| `AvailableAgentRuntimesService.read(): Promise<AvailableAgentRuntimesReport>` | this node | the report | — | — |
| Tool `list_available_agent_runtimes()` | this node | JSON text of the report | — | Description states the "available" rule |
| GraphQL `availableAgentRuntimes: AvailableAgentRuntimesReport` | this node | same report | — | Typed common fields; `details: JSON` |

Shapes (TypeScript, `available-agent-runtimes-report.ts`):

```ts
type UsageLimit = {
  label: string;                        // "Weekly limit", "Claude and GPT models · weekly", "5-hour session"
  window: "five_hour" | "weekly" | "monthly" | "billing_period" | "other";
  appliesTo: { kind: "runtime" } | { kind: "models"; modelIds: string[] };
  remainingPercent: number | null;      // null = not reported for this limit
  resetsAt: string | null;              // ISO-8601
  blocked: boolean;
};
type UsageLimitsReading =
  | { state: "read"; limits: UsageLimit[]; details: Record<string, unknown> } // details: plan, tier, credits, period
  | { state: "not_reported" }
  | { state: "unknown"; reason: string };
type AvailableModel = { id: string; name: string; contextTokens: number | null; blocked: boolean };
type ExternalAgentRuntimeEntry = {
  runtimeKind: "codex_app_server" | "claude_agent_sdk" | "antigravity_cli" | "grok_build";
  name: string; signIn: "signed_in" | "not_required" | "unknown";
  limits: UsageLimitsReading; models: AvailableModel[];
};
type ProviderUsageReading =
  | { state: "balance"; amount: string; currency: string; blocked: boolean }
  | { state: "blocked"; reason: string }
  | { state: "ok" } | { state: "not_reported" } | { state: "unknown"; reason: string };
type AutoByteusRuntimeEntry = {
  runtimeKind: "autobyteus"; name: "AutoByteus";
  providers: { providerId: string; name: string; usage: ProviderUsageReading; models: AvailableModel[] }[];
};
type AvailableAgentRuntimesReport = { checkedAt: string; agentRuntimes: (ExternalAgentRuntimeEntry | AutoByteusRuntimeEntry)[] };
```

Mapping rules per reader (each in its parser):

| Runtime | Limits | Applies to |
| --- | --- | --- |
| Codex | each window of each `rateLimitsByLimitId` entry: remaining = 100 − `usedPercent`; blocked when used ≥ 100 or `rateLimitReachedType` set; details: plan | `normalModelSlug` → that model; else runtime |
| Claude | `limits[]`: session → five_hour, weekly_all → weekly, weekly_scoped → weekly for the model whose display name matches `scope.model.display_name`; remaining = 100 − percent; blocked at 100; `rate_limits_available` false → `not_reported`; details: subscription type | scoped → matched model, else runtime |
| Antigravity | each group bucket (not `disabled`): remaining = 100 × `remaining_fraction`; blocked at 0; label "<group> · <window>" | models whose display name starts with a family in the group description ("Models within this group: Gemini Flash, Gemini Pro") or with the group name; most specific match wins (Argon before Gemini); unmatched group → runtime |
| Grok | billing period (`currentPeriod`): remaining = 100 − `creditUsagePercent` when present, else null; details: tier, period, on-demand, prepaid | runtime |
| DeepSeek | `balance_infos[0]`: amount, currency; blocked when `is_available` false | provider |
| Kimi | `available_balance`; blocked when ≤ 0 | provider |
| Anthropic API | `count_tokens` on the provider's first offered model: 200 → `ok`; 400 with "credit balance" → `blocked` | provider |
| xAI API | `/v1/api-key`: any of `api_key_blocked`, `api_key_disabled`, `team_blocked` → `blocked`, else `ok` | provider |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `readUsageLimits` | Yes | Yes | Low | — |
| `ProviderUsageReader.read` | Yes | Yes | Low | — |
| report union | Yes (AutoByteus entry differs) | Yes (`runtimeKind`) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Agent runtime | `list_available_agent_runtimes`, `AvailableAgentRuntimesService` | Yes | Yes (GLOSSARY addition) | "runtime" = `LLMRuntime` too | Always "agent runtime" |
| Usage limit | `UsageLimit`, `readUsageLimits` | Yes | Yes | "usable" (launch check) | Different word kept |
| Page | Model Routing | Yes | Yes (grows in autobyteus-32) | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Installed | `RuntimeAvailabilityService` | Reuse |
| Signed in | `AgentRuntimeSignInReader` | Reuse |
| Models | `ModelCatalogService.runtimeModelSelectionCatalog` | Reuse |
| AutoByteus keys | `LlmProviderService.listProviderCredentialSettings` | Reuse |
| Provider keys | server secret resolver | Reuse |
| Per-runtime commands | `AgentRuntimeStrategy` | Extend |
| Short ACP process | `runAcpDiscoveryHandshake` | Extend (`runAcpExtensionRequest`) |
| Short Claude control query | `ClaudeSdkClient` model discovery | Extract + reuse |
| Tool surfaces | agent-discovery pattern | Reuse pattern |
| Provider usage | — | Create New (`llm-management/provider-usage`) |
| Composer | — | Create New (`AvailableAgentRuntimesService`) |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `runtime-management/agent-runtimes` | strategies + parsers + service + report types | Extend |
| `runtime-management/claude/client`, `runtime-management/acp` | client helpers | Extend |
| `llm-management/provider-usage` | provider readers | Create New |
| `agent-tools/agent-runtimes` + `agent-tools/mcp/providers` | tool surfaces | Create New / Extend |
| `api/graphql/types` | query | Extend |
| web `components/settings/model-routing`, `pages/settings.vue`, i18n | page | Create New / Extend |

## Draft File Responsibility Mapping

Folded into the final mapping (one extraction: the Claude control query).

## Reusable Owned Structures Check

| Structure | File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Report and limit types | `runtime-management/agent-runtimes/available-agent-runtimes-report.ts` | service | Used by parsers, readers, tool, GraphQL | Yes | Yes | A place for rules |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `UsageLimit` | Yes (`remainingPercent` only; no used %) | Yes | Low | — |
| `AvailableModel.blocked` | Derived once in the service | Yes | Low | Parsers do not set it |

## Final File Responsibility Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `server/src/runtime-management/agent-runtimes/agent-runtime-strategy.ts` | Modify | `readUsageLimits` |
| `.../agent-runtimes/strategies/{codex,claude,antigravity,grok}-agent-runtime-strategy.ts` | Modify | Call their reader + parser |
| `.../strategies/create-agent-runtime-strategies.ts` | Modify | Pass Claude client |
| `.../agent-runtimes/usage-limits/{codex,claude,antigravity,grok}-usage-limits.ts` | New | Parsers (pure) |
| `.../agent-runtimes/available-agent-runtimes-report.ts` | New | Types |
| `.../agent-runtimes/available-agent-runtimes-service.ts` | New | Composer |
| `server/src/runtime-management/claude/client/claude-sdk-control-query.ts` | New | Short control query |
| `.../claude/client/claude-sdk-client.ts` | Modify | `listModels` via control query; `readUsage()` |
| `server/src/runtime-management/acp/acp-discovery-handshake.ts` | Modify | `runAcpExtensionRequest` |
| `server/src/llm-management/provider-usage/{provider-usage-reader,deepseek,kimi,anthropic,xai}-provider-usage.ts` | New | Provider readers + registry |
| `server/src/agent-tools/agent-runtimes/{list-available-agent-runtimes-contract,list-available-agent-runtimes-tool,register-agent-runtimes-tools}.ts` | New | Tool |
| `server/src/agent-tools/mcp/providers/list-available-agent-runtimes-mcp-adapter-provider.ts` + `default-agent-tool-mcp-adapter-providers.ts` | New / Modify | MCP |
| `server/src/api/graphql/types/available-agent-runtimes.ts` + schema | New / Modify | Query |
| `server/src/compositions/agent-runtime-status-composition.ts` (or a sibling composition) + tool registration call site | Modify | Wiring (service bound for tool and resolver) |
| `web/components/settings/model-routing/{ModelRoutingManager,AgentRuntimesNowSection,AvailableAgentRuntimeRow}.vue`, `availableAgentRuntimesPresentation.ts`, GraphQL document | New | Page |
| `web/pages/settings.vue`, `web/localization/messages/{en,zh-CN}/…` | Modify | Nav entry, texts |
| `server/docs/modules/agent_runtimes.md` (or the existing runtime module doc), `GLOSSARY.md` | Modify | Docs |

## Applied Patterns (If Any)

- Strategy (existing `AgentRuntimeStrategy`, new `ProviderUsageReader` registry): one variant per runtime/provider behind one contract; the service selects.

## Target Subsystem / Folder / File Mapping

As above; parsers live in `agent-runtimes/usage-limits/` so strategies stay small.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk |
| --- | --- | --- | --- |
| `agent-runtimes/usage-limits` | Off-spine parsers | Yes | Low |
| `llm-management/provider-usage` | Off-spine readers | Yes | Low |
| `agent-tools/agent-runtimes` | Transport | Yes | Low |
| `web/components/settings/model-routing` | UI | Yes | Low |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Tool answer (abridged) | `{"checkedAt":"…","agentRuntimes":[{"runtimeKind":"codex_app_server","name":"Codex","signIn":"signed_in","limits":{"state":"read","limits":[{"label":"Weekly limit","window":"weekly","appliesTo":{"kind":"runtime"},"remainingPercent":0,"resetsAt":"2026-10-30T19:57:53Z","blocked":true}],"details":{"plan":"pro"}},"models":[{"id":"…","name":"…","contextTokens":400000,"blocked":true}]}, …]}` | used % and remaining % both; account IDs | One meaning per field; privacy |
| Failure | `{"runtimeKind":"claude_agent_sdk", …, "limits":{"state":"unknown","reason":"Claude usage could not be read (time-out)."}}` | whole tool error | REQ-007 |
| Blocked derivation | service: `model.blocked = limits.some(l => l.blocked && applies(l, model))` | each parser setting `blocked` on models | One owner of derived data |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the old private Claude control-query method beside the shared helper | Fewer edits | Rejected | Shared helper only |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Report types; parsers with fixture tests (from `evidence/limit-probes/`, redacted).
2. Claude control-query extraction (model discovery tests green), `readUsage`; ACP `runAcpExtensionRequest`.
3. `readUsageLimits` on the interface and four strategies; update test doubles.
4. Provider usage readers + registry (fake HTTP tests).
5. `AvailableAgentRuntimesService` (fake owners: availability, sign-in, catalog, readers; time-out and failure tests).
6. Tool contract, local tool, registration, MCP adapter; GraphQL query; composition wiring.
7. Web page section, nav entry, i18n; component tests.
8. Docs and GLOSSARY.

## Key Tradeoffs

- **Live reads, no cache:** always current; each call spawns up to three short processes (~3 s in parallel). A cache would add invalidation for no demonstrated need (DESIGN.md best practice 6).
- **Unmapped limit → whole runtime:** may hide a usable model; never shows a blocked one as usable.
- **Include "sign-in unknown" runtimes:** avoids hiding a working runtime on a status hiccup; the answer says so.

## Risks

- RSK-001 external formats change (Claude experimental, Antigravity CLI JSON, Grok undocumented) → reader returns `unknown`; tests pin today's formats.
- RSK-002 concurrent calls spawn concurrent short processes; bounded by time-outs; validation measures a few parallel calls.
- RSK-003 Grok used % unconfirmed (UNK-001) → `remainingPercent` null until present.

## Guidance For Implementation

- Reproduction to start from: `None` (new behavior). Fixtures: redact `accountId`, `email`, names, IDs from the probe outputs before committing them.
- Never send a model request; the Anthropic check is `count_tokens` only.
- Never log raw reader output or keys; errors carry short classified reasons.
- Validate on a Docker node too (TESTING.md isolated instance / the user's Docker node for the final check).
