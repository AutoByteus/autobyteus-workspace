# Design Spec — `list_available_agent_runtimes` and Settings → Model Routing "Agent runtimes now" (autobyteus-303)

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (earlier designs in `history/`; SR-004 added the per-runtime limits note, SR-005 separates it from the sign-in mark, see § SR-004 Addition)
- Approved requirements baseline: `requirements-doc.md` SR-005 (SR-005: separate `signIn` and `limitsNote` fields; SR-004: optional per-runtime note, decided by the Solution Designer at the user's request to allow runtime-specific output); SR-003 (text aligned for ARCH-REV-002 AR-006), approved by the Solution Designer within the direction the user set (2026-10-24/25), user informed. SR-002 applies the user's "only useful information" (2026-10-25) and clarifies failure states for ARCH-REV-001.
- Behavior-defining supplements: none.
- Design status: `Ready`
- Review basis: ARCH-REV-001 findings AR-001…AR-005 and ARCH-REV-002 findings AR-002 (narrowed) and AR-006 are resolved below (§ Review Findings Resolution).
- Canonical investigation-notes path: `tickets/in-progress/available-agent-runtimes-tool/investigation-notes.md`
- Authorities read (2026-10-24/25): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md` (Cases 1–7), `GLOSSARY.md`, `TESTING.md`.
- Project design-principle conflicts or discrepancies: none.

## SR-004 Addition — optional per-runtime `note`

The user asked (2026-10-25) that runtimes need not all return the same JSON and left the shape to the Solution Designer. Decision: keep the common core (limits: name / remaining % / reset; models with `blocked`), because every runtime's useful facts fit it (checked against P-01…P-04) and both code (page, autobyteus-32 selection order) and agents compare runtimes through it. Add one optional free-text `note` per runtime, written by its strategy only when a runtime-specific fact changes how to read its limits. Today's two cases:

- Codex: a window used up while credits allow running (DEC-007) → "Weekly limit used up; running on paid credits."
- Grok: `creditUsagePercent` absent → "Grok does not report how much of the period is used."

The note never carries plans, account data or vendor texts verbatim. It is returned as `limitsNote` next to `limits`; the sign-in mark is a separate field `signIn: "not checked"` (ARCH-REV-004 AR-007: one meaning per field). The page shows `limitsNote` under the runtime's limits and the sign-in mark on the runtime row.

## Review Findings Resolution (ARCH-REV-001)

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 (Claude query writes a prompt) | Verified (C-15): the SDK writes a string prompt to the CLI as a `user` message and drops falsy `maxTurns`. The shared `withClaudeControlQuery` opens the query with an idle input that never yields; `listModels` moves to it with rows unchanged; `MODEL_DISCOVERY_PROBE_PROMPT` removed; tests added | § Claude control query, Removal Plan, Guidance |
| AR-002 (20 s not bounded; models failure undefined) | Fixed per-step caps inside one per-runtime budget (install 4 s → sign-in 6 s → models ‖ limits 8 s each = 18 s); each cap is passed down so the process itself stops; entries for sign-in time-out and models failure; timeline | § Per-runtime read, Interface Mapping, Examples |
| AR-003 (installed differs per runtime) | Verified (C-16): one install rule `strategy.readVersion(executable, {deadline}) !== null` (the Agent Runtimes page's rule); `RuntimeAvailabilityService` not used | Ownership Map, Reuse table |
| AR-004 (type placement) | `ProviderUsageReader` and `ProviderUsageReading` live in `llm-management/provider-usage/provider-usage-reader.ts`; the report imports them | File mapping |
| AR-005 (two blocked shapes) | One `ProviderUsageReading` read form with `blockedReason`; the service blocks a provider's models when it is set | Interface Mapping |
| ARCH-REV-002 AR-002 (cap is a deadline, not per command) | Verified (C-19). A step's cap is a `ReadDeadline` (an end time) for the whole call: every command, probe, handshake and request inside the step gets `min(its usual time-out, time left)`; nothing starts once it has passed. New option name `deadline`; Grok's existing `timeoutMs` keeps its per-probe meaning. Codex calls race the deadline and release the lease. Test: a slow second command ends by the cap and its process is stopped | § Read deadline, Bounded spine, Guidance |
| ARCH-REV-002 AR-006 (requirement text) | Requirements SR-003: UI states without plan or limit-level blocked badge; one model field `blocked: {until, by}`; REQ-004 says runtime credits are not shown, while an AutoByteus provider's money balance is (it is that provider's limit) | requirements-doc |
| Non-blocking: `cwd` | Codex: home folder; Claude: `process.cwd()` as today's discovery; Antigravity/Grok: as today's commands (server cwd / `os.tmpdir()` for ACP) | Interface Mapping |
| Non-blocking: composition | `compositions/agent-runtime-status-composition.ts` builds and binds the service; called by `build-studio-server.ts:349`, the one builder of the desktop's server and of Docker nodes (`index.ts`) | File mapping |
| Non-blocking: MCP `isAvailable` | `() => true`: the MCP catalog already offers it only to definitions that list it (`agent-tool-mcp-catalog.ts:106-113`) | Facades |

## Current-State Read

- Each external agent runtime has one stateless `AgentRuntimeStrategy` (C-01, C-02) with its executable, version, update and sign-in commands; the Agent Runtimes page decides "installed" as `readVersion(...) !== null` (C-16). `AgentRuntimeSignInReader` (C-07) owns sign-in.
- Offered models per runtime come from `ModelCatalogService.runtimeModelSelectionCatalog` (C-09); AutoByteus provider key status from `LlmProviderService.listProviderCredentialSettings` (C-10); provider keys from the server secret resolver (C-11).
- Each runtime's client can make the limit read: the Codex app-server lease (C-03), a Claude SDK control query (C-04, corrected by C-15), the ACP short process with an extension request (C-05), and the command runner (C-06).
- Today's Claude model discovery writes a real user prompt ("Enumerate supported models only.") to the CLI on every catalog read (C-15). This design's shared control query removes that.
- Opt-in agent tools: contract + local tool in `defaultToolRegistry` + Agent Tools MCP adapter (C-12).
- No design problem in these owners; they absorb the feature by extension.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: about 32 source files across runtime-management (strategy interface + four strategies, four parsers, the composing service, Claude control query, ACP extension request), llm-management (catalog time-out pass-through, provider usage readers), agent-tools, GraphQL, composition, and web (page section, nav, i18n); tests per reader; docs.
- Architectural risk: `High`
- Risk rationale: four new external contracts (one experimental, one CLI JSON, one undocumented); short child processes per call under time-outs; new agent-tool and GraphQL contracts; a credential path (provider keys for balance calls); a change to how Claude model discovery talks to the CLI. No persistence and no peer contract.
- Escalation trigger: a reader that would need tokens or a model request; any need to cache, persist or poll; any credential or identity reaching the answer or logs; a step that cannot be given a process-level time-out.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| P-01…P-05 (Measured) | `evidence/limit-probes/` | Each limit source answers in 0.2–2.7 s with 0 tokens | Live reads, no cache | UNK-001 |
| C-01…C-14 (Read) | see investigation notes | Owners and patterns | Extend owners | — |
| C-15 (Read, verified 2026-10-25) | `@anthropic-ai/claude-agent-sdk@0.3.280/sdk.mjs`: `if(typeof n==="string")t.write(…{type:"user",…})`; `if(p)G.push("--max-turns",p.toString())`; `claude-sdk-client.ts:395-398` | A string prompt is sent as a user turn; `maxTurns: 0` is dropped | Idle-input control query (AR-001) | — |
| C-16 (Read, verified 2026-10-25) | `agent-runtime-status-service.ts:180-190` | Installed = `readVersion` not null | One install rule (AR-003) | — |
| C-17 (Read) | `runtime-version.ts:19-22`; `grok-agent-runtime-strategy.ts:9,31`; `antigravity-cli-capability.ts:5-6,95`; `acp-discovery-handshake.ts:7,23-26`; `codex-model-catalog.ts:18-26`; `claude-model-catalog.ts:24` | Existing steps have fixed internal time-outs (3–15 s) | Pass a `timeoutMs` down each step (AR-002) | — |
| C-19 (Read, verified 2026-10-25) | `antigravity-cli-capability.ts:95-99`; `grok-build-capability.ts:12,80-86`; `codex-model-catalog.ts:18-45` | Antigravity runs `--help` then `models`; Grok's `timeoutMs` bounds each probe, then a 15 s handshake; Codex releases the lease only after an untimed request settles | Deadline per step; Codex race (ARCH-REV-002 AR-002) | — |
| C-18 (Read) | `compositions/build-studio-server.ts:75,349`; `index.ts`; `startup/agent-tool-loader.ts:69` | One server builder for desktop and Docker nodes; tool registration loader | Composition and registration points | — |

## Intended Change

Add a live, read-only answer to "what can run on this node now". One service composes, per agent runtime: installed (strategy `readVersion`), signed in (sign-in reader), offered models (catalog) and usage limits (new strategy `readUsageLimits`; per-provider readers for AutoByteus). The answer keeps only useful information (limits: name, remaining %, reset; models: id, name, context size, blocked). It is exposed as the opt-in tool `list_available_agent_runtimes` and the GraphQL query `availableAgentRuntimes`, shown on Settings → Model Routing → "Agent runtimes now".

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Areas: `runtime-management/agent-runtimes` (strategy interface, four strategies, `usage-limits/` parsers, report types, service), `runtime-management/claude/client` (control query; `listModels` moved onto it), `runtime-management/acp` (extension request), `runtime-management/antigravity-cli-capability.ts` and `runtime-version.ts` (time-out parameter), `llm-management/services/*-model-catalog.ts` and `model-catalog-service.ts` (optional time-out pass-through), `llm-management/provider-usage` (new), `agent-tools/agent-runtimes` (new) + MCP provider list, `api/graphql/types` (new query) + schema, `compositions/agent-runtime-status-composition.ts`, `startup/agent-tool-loader.ts`, web Settings (nav entry, Model Routing manager, section, row, presentation helper, i18n en + zh-CN), docs (runtime module doc, GLOSSARY "agent runtime").
- Derived consumers:

| Changed structure | Consumer | Decision |
| --- | --- | --- |
| `AgentRuntimeStrategy` (+ `readUsageLimits`; optional `{deadline}` on `readVersion`, `readSignIn`) | four implementations; status service and sign-in reader (call without options → today's time-outs); every test double | Implement; doubles updated |
| `ClaudeSdkClient.listModels` (now on the idle-input control query) | `ClaudeModelCatalog` → launch model lists, model selection validation | Rows unchanged; existing tests stay green; no prompt written |
| Catalog `listModels(..., {deadline})` optional | launch paths, run model validation | Default = today's time-outs; unchanged |
| `MODEL_DISCOVERY_PROBE_PROMPT` | only `claude-sdk-client.ts` (C-15 grep) | Removed |

- Deliberately left alone: Agent Runtimes page and `AgentRuntimeStatusService` behavior; `RuntimeAvailabilityService` (its `spawnSync` is FU-001); agent run paths; GLM (FU-003 of autobyteus-32).
- Follow-ups: FU-001 (reviewer's, `RuntimeAvailabilityService` `spawnSync`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..005, 007, 008, 010; AC-001..009, 011, 012 | Tool call | none | Live lean answer | DS-001, DS-003 |
| BEH-002 | User | REQ-009; AC-010 | Settings → Model Routing | none | Section shows the answer | DS-002 |
| BEH-003 | System | REQ-004, 005, 008 | Inside DS-001 | none | Limit readers | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/limit-probes/` | Probe scripts and results | REQ-004, 005 | Fixtures for reader tests (redacted: no account IDs, emails, names); P-02 is the idle-input shape | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`, local: Claude model discovery writes a user prompt (C-15).
- Structural triggers: *Capability-area reuse* (sign-in, models, keys) → reused owners; *Several kinds or forms* (five runtimes, AutoByteus providers, tool on five runtimes) → each traced, and "installed" uses one rule for all (AR-003); *Responsibility overload* (`claude-sdk-client.ts` 438 lines) → extract the shared control query; *Derived data* → per-model blocked derived once in the service; *Behavior by absence* → an empty model list is an explicit "unknown" rule, not "no models".
- Root cause classification: `Local Implementation Defect` (the Claude discovery prompt) plus a feature on healthy owners.
- Refactor needed now: `Yes`, small: the Claude control query extraction and its idle input.
- Evidence: C-15, C-01…C-14.
- Design response: below.
- Intentional deferrals: none.

## Terminology

- **Agent runtime** (added to GLOSSARY): what runs an agent (`RuntimeKind`): AutoByteus, Claude Agent SDK, Codex, Antigravity, Grok. Not the LLM runtime (`LLMRuntime`).
- **Available agent runtime**: installed on the node and not known to be signed out (REQ-002).
- **Usage limit**: a runtime's or provider's own limit. Not the launch "usable" check.

## Legacy Removal Policy (Mandatory)

- Obsolete: `ClaudeSdkClient.tryGetSupportedModelsFromQueryControl` and `MODEL_DISCOVERY_PROBE_PROMPT` (replaced by the idle-input control query).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `Not Affected`: live reads only; nothing is stored.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Agent calls `list_available_agent_runtimes` (any runtime) | Tool result (JSON text) | `AvailableAgentRuntimesService` | The tool |
| DS-002 | Primary End-to-End | BEH-002 | User opens the page / Check again | Section rendered | Same service via GraphQL | The page |
| DS-003 | Bounded Local | BEH-001, BEH-003 | Service reads one runtime | Runtime entry | Service (order, caps); strategy / provider reader (each step) | Per-runtime read |

## Primary Execution Spine(s)

- DS-001: `Agent (AutoByteus local tool | Agent Tools MCP adapter) → AvailableAgentRuntimesService.read() → [per external runtime, in parallel: strategy.readVersion → AgentRuntimeSignInReader.read → (ModelCatalogService.runtimeModelSelectionCatalog ‖ strategy.readUsageLimits)] + [AutoByteus: LlmProviderService.listProviderCredentialSettings + ModelCatalogService → ProviderUsageReader per provider, in parallel] → report → JSON text`
- DS-002: `ModelRoutingManager.vue → AgentRuntimesNowSection.vue → GraphQL availableAgentRuntimes → AvailableAgentRuntimesService.read() → report → rows`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The tool takes no input. The service reads all runtimes in parallel, each within its fixed budget (DS-003). It lists AutoByteus providers whose key is configured (or local providers with models), each with its models and usage. It derives each model's `blocked`, drops everything not useful, and returns one report. | service, strategies, catalog, sign-in reader, provider readers | `AvailableAgentRuntimesService` | parsers, control query, ACP extension request |
| DS-002 | The section queries the same report on open and on "Check again" and renders rows. | section, query | same | presentation helper |
| DS-003 | install (≤ 4 s) → sign-in (≤ 6 s) → models ‖ limits (≤ 8 s each); each step receives its cap as a deadline for the whole call (every command inside shares it), so its processes stop; each failure gives the REQ-007 entry. | service | service | — |

## Spine Actors / Main-Line Nodes

Tool surfaces; `AvailableAgentRuntimesService`; four `AgentRuntimeStrategy` implementations; `ModelCatalogService`; `AgentRuntimeSignInReader`; `ProviderUsageReader`s; GraphQL resolver; page section.

## Ownership Map

- `AvailableAgentRuntimesService`: the per-runtime step order and caps (REQ-010); the install rule `readVersion !== null` (AR-003); the "available" rule and the `signIn: "not checked"` mark (REQ-002, DEC-002); the AutoByteus provider rule; the REQ-007 failure entries (including "an empty model list is `unknown: no models could be read`", since an available, signed-in runtime always offers at least one model); mapping limits to models and deriving each model's `blocked`; the lean report.
- `AgentRuntimeStrategy.readUsageLimits`: how one runtime reports its limits, which models each applies to, and whether it is exhausted (with the runtime's own rules, e.g. Codex credits, DEC-007).
- `ProviderUsageReader` (one per readable AutoByteus provider): how one provider reports balance and block, using its key from the secret resolver.
- `withClaudeControlQuery`: the short Claude control query lifecycle (idle input, time-out, close).
- Tool surfaces and GraphQL resolver: thin.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `AutoByteusListAvailableAgentRuntimesTool` (local), MCP adapter (`isAvailable: () => true`, the catalog already limits it to definitions that list it) | service (bound by the composition; unbound → the tool answers "not available on this server") | Runtime-neutral tool | Filtering, mapping |
| `availableAgentRuntimes` GraphQL query | service | Page | Same |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| `ClaudeSdkClient.tryGetSupportedModelsFromQueryControl` (`claude-sdk-client.ts:381-431`) | Same control query needed for usage; today's form writes a prompt | `claude-sdk-control-query.ts` `withClaudeControlQuery` | `listModels` rows unchanged |
| `MODEL_DISCOVERY_PROBE_PROMPT` (`agent-execution/backends/claude/claude-runtime-shared.ts:2`) | Dead once discovery uses the idle input (only use: `claude-sdk-client.ts:13,396`) | — | Remove the constant; keep the file's other exports |

## Return Or Event Spine(s) (If Applicable)

N/A (request/response).

## Bounded Local / Internal Spines (If Applicable)

DS-003 inside `AvailableAgentRuntimesService.read()`, per external runtime (all runtimes in parallel):

```
install   strategy.readVersion(exe, {deadline: in 4 s})       null / time-out → not installed → left out
sign-in   signInReader.read(kind, {cwd, deadline: in 6 s})     signedOut → left out
                                                              unknown / time-out → listed with signIn: "not checked"
then in parallel:
  models  catalog.runtimeModelSelectionCatalog(kind, cwd, {deadline: in 8 s})
                                                              throw / time-out / [] → models "unknown: <reason>"
  limits  strategy.readUsageLimits(exe, cwd, {deadline: in 8 s})
                                                              unknown → limits "unknown: <reason>"; not_reported → "not reported"
```

AutoByteus: `listProviderCredentialSettings("autobyteus")` and `runtimeModelSelectionCatalog("autobyteus")` (local list), then every keyed provider's reader in parallel with `AbortSignal.timeout(8000)`.

The service also races each step against its cap + 500 ms as a backstop and records "timed out"; the deadline passed into the step is what stops its child processes (`runRuntimeCommand` kill, ACP `close`, Claude query `close`; Codex: the request is abandoned and the shared app-server lease released).

### Read deadline (ARCH-REV-002 AR-002)

`runtime-management/read-deadline.ts`:

```ts
type ReadDeadline = Readonly<{ endsAt: number }>;            // epoch ms
createReadDeadline(ms: number): ReadDeadline;
timeLeft(deadline): number;                                  // ≥ 0
commandTimeout(deadline, usualMs): number;                   // min(usualMs, timeLeft); 0 → do not start, report time-out
raceDeadline<T>(work: Promise<T>, deadline): Promise<T>;    // rejects with a time-out at endsAt (for calls without a process, e.g. Codex requests)
```

- One meaning per name: `deadline` = the end time of a whole step; `timeoutMs` (existing, e.g. `GrokBuildProbeOptions.timeoutMs`, `runRuntimeCommand(…, timeoutMs)`) = the bound of one command.
- Steps with several commands share their step's deadline: `listAntigravityModels` (`--help`, then `models`); `discoverGrokBuildModels` (`--version`, `agent --help`, then the ACP handshake); `readSignIn` for Antigravity (same as models); `runAcpExtensionRequest` (`initialize`, then the request); `withClaudeControlQuery` (open, then the control call).
- Codex: `listModels`, `account/read` and `account/rateLimits/read` run `raceDeadline(client.request(…))`; the lease is released in `finally` as soon as the race ends (the shared app-server keeps running; the abandoned request's late answer is ignored).
- Provider readers get `AbortSignal.timeout(timeLeft(deadline))` from the service (provider-usage does not import runtime-management).
- Callers without a deadline (launch paths, Agent Runtimes page) keep today's time-outs.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility |
| --- | --- | --- | --- |
| Parsers `usage-limits/{codex,claude,antigravity,grok}-usage-limits.ts` | DS-003 | strategies | Raw answer → `UsageLimitsReading`; identities and vendor texts dropped |
| `claude-sdk-control-query.ts` | DS-003 | `ClaudeSdkClient` | Idle-input control query, time-out, close |
| `runAcpExtensionRequest(profile, method, {deadline})` | DS-003 | Grok strategy | `initialize` + one extension request; process always stopped |

## Ownership Boundaries

- The service is the only caller of `readUsageLimits`, of provider readers and of the time-out options for this feature.
- Provider keys stay inside provider readers.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `AvailableAgentRuntimesService.read()` | strategies, sign-in reader, catalog, readers, caps | tool surfaces, GraphQL | Tool or page calling a strategy, catalog or reader directly |

## Dependency Rules

- `agent-tools/agent-runtimes` → the service only.
- Service → `runtime-management` (strategies, sign-in reader), `llm-management` (catalog, provider service, `provider-usage`).
- `llm-management/provider-usage` → `secret-management` resolver; never → `runtime-management`.
- Strategies → their runtime's client modules only.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Notes |
| --- | --- | --- | --- |
| `AgentRuntimeStrategy.readVersion(exe, options?: {deadline})` | runtime | installed version | Default = today |
| `AgentRuntimeStrategy.readSignIn(exe, cwd, options?: {deadline})` | runtime | sign-in | Default = today; `AgentRuntimeSignInReader.read(kind, {cwd, deadline?})` passes it |
| `AgentRuntimeStrategy.readUsageLimits(exe, cwd, {deadline}): Promise<UsageLimitsReading>` | runtime | its limits | Never throws |
| `ModelCatalogService.runtimeModelSelectionCatalog(runtime, workspace?, options?: {deadline})` → each catalog's `listModels(…, options?)` | runtime | offered models | Default = today |
| `withClaudeControlQuery(input: {deadline, env?}, use)` | one short Claude CLI | control calls | Idle input; closes in `finally` and at time-out |
| `ProviderUsageReader.read(provider, models, {signal})` (in `llm-management/provider-usage/provider-usage-reader.ts`) | one provider | usage | Registry by `LLMProvider` |
| `AvailableAgentRuntimesService.read(): Promise<AvailableAgentRuntimesReport>` | this node | the report | — |
| Tool `list_available_agent_runtimes()`; GraphQL `availableAgentRuntimes` | this node | the report | Tool returns JSON text |

`cwd`: Codex sign-in, catalog and limits get the home folder (as `agent-runtime-sign-in-reader.ts:27` documents); Claude's control query keeps `process.cwd()` as today's discovery; Antigravity commands run as today's commands; Grok's ACP process uses `os.tmpdir()` as the discovery handshake does.

Internal types (`runtime-management/agent-runtimes/usage-limits/usage-limits-reading.ts`):

```ts
type RuntimeUsageLimit = {
  name: string;                    // "Weekly", "5-hour", "Claude and GPT models · weekly", "Billing period"
  remainingPercent: number | null; // null = not reported for this limit
  resetsAt: string | null;         // ISO-8601
  exhausted: boolean;              // cannot run now under this limit (runtime's own rules, e.g. Codex credits)
  appliesTo: { kind: "runtime" } | { kind: "models"; modelIds: string[] };
};
type UsageLimitsReading =
  | { state: "read"; limits: RuntimeUsageLimit[]; note?: string } // note: one short sentence, only when a runtime-specific fact changes how to read its limits
  | { state: "not_reported" }
  | { state: "unknown"; reason: string };
```

Provider usage (`llm-management/provider-usage/provider-usage-reader.ts`), one blocked form (AR-005):

```ts
type ProviderUsageReading =
  | { state: "read"; balance: { amount: string; currency: string } | null; blockedReason: string | null }
  | { state: "not_reported" }
  | { state: "unknown"; reason: string };
```

Report, the lean answer (`runtime-management/agent-runtimes/available-agent-runtimes-report.ts`):

```ts
type UsageLimitView = { name: string; remainingPercent: number | null; resetsAt: string | null };
type ModelBlock = { until: string | null; by: string };    // by = limit name or provider reason
type AvailableModel = { id: string; name: string; contextTokens?: number; blocked?: ModelBlock };
type ExternalAgentRuntimeEntry = {
  runtime: "codex_app_server" | "claude_agent_sdk" | "antigravity_cli" | "grok_build";
  name: string;
  signIn?: "not checked";           // present only when the sign-in step could not tell (DEC-002)
  limits: UsageLimitView[] | "not reported" | `unknown: ${string}`;
  limitsNote?: string;               // the strategy's note, only with read limits (SR-004)
  models: AvailableModel[] | `unknown: ${string}`;
};
type AutoByteusProviderEntry = {
  provider: string;                                       // display name
  balance?: string;                                       // "0.14 USD"
  blocked?: string;                                       // reason
  limits?: "not reported" | `unknown: ${string}`;
  models: AvailableModel[];
};
type AutoByteusEntry = { runtime: "autobyteus"; name: "AutoByteus"; providers: AutoByteusProviderEntry[] };
type AvailableAgentRuntimesReport = { checkedAt: string; agentRuntimes: (ExternalAgentRuntimeEntry | AutoByteusEntry)[] };
```

Derivation (service only): a model is `blocked` when any `exhausted` limit applies to it (`until` = the latest such `resetsAt`, `by` = that limit's name), or when its provider's `blockedReason` is set (`until: null`, `by` = reason). A limit that maps to no model applies to the whole runtime (DEC-003).

Reader rules (each in its parser; vendor texts, plans, credits, account data dropped):

| Runtime / provider | Limits | Applies to | Exhausted |
| --- | --- | --- | --- |
| Codex (note: credits case above) | each window of each `rateLimitsByLimitId` entry: name from `windowDurationMins` ("5-hour", "Weekly", else "<n>-minute"); remaining = 100 − `usedPercent`; `resetsAt` from Unix seconds | `normalModelSlug` → that model; else runtime | used ≥ 100 or `rateLimitReachedType` set, **and** no credits (`credits.hasCredits` false and not `unlimited`) (DEC-007) |
| Claude | `limits[]`: session → "5-hour", weekly_all → "Weekly", weekly_scoped → "Weekly · <model>"; remaining = 100 − percent; `rate_limits_available` false → `not_reported` | scoped → model whose display name matches `scope.model.display_name`, else runtime | percent ≥ 100 |
| Antigravity | each non-`disabled` bucket: "<group> · weekly" / "<group> · 5-hour"; remaining = 100 × `remaining_fraction` | models whose display name starts with a family listed in the group description, or with the group name; most specific match wins; unmatched → runtime | remaining ≤ 0 |
| Grok (note: used % absent) | "Billing period": `resetsAt` = `currentPeriod.end`; remaining = 100 − `creditUsagePercent` when present, else null | runtime | remaining ≤ 0 |
| DeepSeek | balance from `balance_infos[0]` | provider | `is_available` false → `blockedReason` "no balance left" |
| Kimi | `available_balance` (currency from response, else CNY/USD per host) | provider | ≤ 0 → "no balance left" |
| Anthropic API | `count_tokens` on the provider's first offered model (free) | provider | 400 "credit balance" → "credit balance too low"; 200 → no block |
| xAI API | `/v1/api-key` | provider | `api_key_blocked` / `api_key_disabled` / `team_blocked` → "API key blocked" / "disabled" |
| Others | — | — | `not_reported` |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `readUsageLimits`, `ProviderUsageReader.read` | Yes | Yes | Low | — |
| Report union | Yes | Yes (`runtime`) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Agent runtime | `list_available_agent_runtimes`, `AvailableAgentRuntimesService` | Yes | Yes (GLOSSARY) | "runtime" = `LLMRuntime` too | Always "agent runtime" |
| Usage limit | `RuntimeUsageLimit`, `readUsageLimits` | Yes | Yes | "usable" (launch check) | Kept apart |
| Model block | `blocked: {until, by}` | Yes | Yes | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Installed | `AgentRuntimeStrategy.readVersion` (the Agent Runtimes page's rule) | Reuse (AR-003); `RuntimeAvailabilityService` not used |
| Signed in | `AgentRuntimeSignInReader` | Reuse (+ optional time-out) |
| Models | `ModelCatalogService.runtimeModelSelectionCatalog` | Reuse (+ optional time-out) |
| AutoByteus keys | `LlmProviderService.listProviderCredentialSettings` | Reuse |
| Provider keys | server secret resolver | Reuse |
| Per-runtime commands | `AgentRuntimeStrategy` | Extend |
| Short ACP process | `runAcpDiscoveryHandshake` | Extend (`runAcpExtensionRequest`) |
| Short Claude control query | `ClaudeSdkClient` discovery | Extract + correct (idle input) |
| Tool surfaces | agent-discovery pattern | Reuse pattern |
| Provider usage | — | Create New |
| Composer | — | Create New |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `runtime-management/agent-runtimes` (+ `usage-limits/`) | strategies, parsers, service, report | Extend |
| `runtime-management/claude/client`, `runtime-management/acp`, `antigravity-cli-capability.ts`, `runtime-version.ts` | client helpers, time-outs | Extend |
| `llm-management/services` | catalog time-out pass-through | Extend |
| `llm-management/provider-usage` | provider readers and their types | Create New |
| `agent-tools/agent-runtimes` + MCP providers | tool | Create New / Extend |
| `api/graphql/types`, `compositions`, `startup` | query, binding, registration | Extend |
| web `components/settings/model-routing`, `pages/settings.vue`, i18n | page | Create New / Extend |

## Draft File Responsibility Mapping

Folded into the final mapping.

## Reusable Owned Structures Check

| Structure | File | Owner | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- |
| Internal limit types | `usage-limits/usage-limits-reading.ts` | strategies | Yes | Yes | Output shape |
| Provider usage types | `llm-management/provider-usage/provider-usage-reader.ts` | provider readers | Yes | Yes (one blocked form) | — |
| Report (lean output) | `available-agent-runtimes-report.ts` | service | Yes (no details part) | Yes | A place for rules |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `RuntimeUsageLimit` | Yes (`remainingPercent` only; `exhausted` = cannot run now) | Yes | Low | — |
| `ProviderUsageReading` | Yes (`blockedReason` the only blocked form) | Yes | Low | — |
| `AvailableModel.blocked` | Derived once in the service | Yes | Low | Parsers never set it |

## Final File Responsibility Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `server/src/runtime-management/agent-runtimes/agent-runtime-strategy.ts` | Modify | `readUsageLimits`; optional `{deadline}` on `readVersion`, `readSignIn` |
| `.../agent-runtimes/strategies/{codex,claude,antigravity,grok}-agent-runtime-strategy.ts`, `create-agent-runtime-strategies.ts` | Modify | Readers via parsers; pass time-outs; Claude client dependency |
| `.../agent-runtimes/agent-runtime-sign-in-reader.ts` | Modify | Optional `deadline` pass-through |
| `.../agent-runtimes/runtime-version.ts` | Modify | Optional `deadline` |
| `server/src/runtime-management/read-deadline.ts` | New | `ReadDeadline` and its helpers |
| `.../agent-runtimes/usage-limits/{usage-limits-reading,codex-usage-limits,claude-usage-limits,antigravity-usage-limits,grok-usage-limits}.ts` | New | Types, parsers |
| `.../agent-runtimes/available-agent-runtimes-report.ts` | New | Lean output types |
| `.../agent-runtimes/available-agent-runtimes-service.ts` | New | Composer (caps, rules, derivation) |
| `server/src/runtime-management/claude/client/claude-sdk-control-query.ts` | New | Idle-input control query |
| `.../claude/client/claude-sdk-client.ts` | Modify | `listModels` via control query (+ time-out); `readUsage()` |
| `server/src/agent-execution/backends/claude/claude-runtime-shared.ts` | Modify | Remove `MODEL_DISCOVERY_PROBE_PROMPT` |
| `server/src/runtime-management/acp/acp-discovery-handshake.ts` | Modify | `runAcpExtensionRequest` |
| `server/src/runtime-management/antigravity-cli-capability.ts` | Modify | Optional `deadline` on `listAntigravityModels` (`--help` and `models` share it) |
| `server/src/runtime-management/grok/grok-build-capability.ts` | Modify | Optional `deadline` on `discoverGrokBuildModels` (probes and handshake share it); `GrokBuildProbeOptions.timeoutMs` keeps its per-probe meaning |
| `server/src/llm-management/services/{model-catalog-service,codex-model-catalog,claude-model-catalog,antigravity-model-catalog,grok-build-model-catalog}.ts` | Modify | Optional `{deadline}` pass-through; Codex `listModels` races it and releases the lease |
| `server/src/llm-management/provider-usage/{provider-usage-reader,provider-usage-readers,deepseek-provider-usage,kimi-provider-usage,anthropic-provider-usage,xai-provider-usage}.ts` | New | Types + registry + readers |
| `server/src/agent-tools/agent-runtimes/{list-available-agent-runtimes-contract,list-available-agent-runtimes-tool,register-agent-runtimes-tools}.ts` | New | Tool |
| `server/src/agent-tools/mcp/providers/list-available-agent-runtimes-mcp-adapter-provider.ts`, `default-agent-tool-mcp-adapter-providers.ts` | New / Modify | MCP |
| `server/src/startup/agent-tool-loader.ts` | Modify | Load `registerAgentRuntimesTools` |
| `server/src/api/graphql/types/available-agent-runtimes.ts` + schema | New / Modify | Query (typed fields; union/strings as JSON where simplest) |
| `server/src/compositions/agent-runtime-status-composition.ts` | Modify | Build + bind the service from the same strategies and sign-in reader; close with the handle |
| `web/components/settings/model-routing/{ModelRoutingManager,AgentRuntimesNowSection,AvailableAgentRuntimeRow}.vue`, `availableAgentRuntimesPresentation.ts`, GraphQL document | New | Page |
| `web/pages/settings.vue`, `web/localization/messages/{en,zh-CN}/…` | Modify | Nav entry, texts |
| server runtime module doc, `GLOSSARY.md` | Modify | Docs |

## Applied Patterns (If Any)

- Strategy: existing `AgentRuntimeStrategy` (one per runtime) and new `ProviderUsageReader` registry (one per provider); the service selects.

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk |
| --- | --- | --- | --- |
| `agent-runtimes/usage-limits` | Off-spine parsers + types | Yes | Low |
| `llm-management/provider-usage` | Off-spine readers + types | Yes | Low |
| `agent-tools/agent-runtimes` | Transport | Yes | Low |
| `web/components/settings/model-routing` | UI | Yes | Low |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Tool answer (abridged, values from the 2026-10-24/25 probes):

```json
{ "checkedAt": "2026-10-25T10:00:00Z",
  "agentRuntimes": [
    { "runtime": "codex_app_server", "name": "Codex",
      "limits": [ { "name": "Weekly", "remainingPercent": 0, "resetsAt": "2026-10-30T19:57:53Z" } ],
      "models": [ { "id": "…", "name": "…", "contextTokens": 400000,
                    "blocked": { "until": "2026-10-30T19:57:53Z", "by": "Weekly" } } ] },
    { "runtime": "claude_agent_sdk", "name": "Claude",
      "limits": [ { "name": "5-hour", "remainingPercent": 13, "resetsAt": "2026-10-24T21:10:00Z" },
                  { "name": "Weekly", "remainingPercent": 78, "resetsAt": "2026-10-31T16:00:00Z" } ],
      "models": [ { "id": "…", "name": "…" } ] },
    { "runtime": "antigravity_cli", "name": "Antigravity",
      "limits": [ { "name": "Claude and GPT models · weekly", "remainingPercent": 0, "resetsAt": "2026-10-26T10:22:39Z" },
                  { "name": "Gemini models · 5-hour", "remainingPercent": 99, "resetsAt": "2026-10-24T21:45:12Z" } ],
      "models": [ { "id": "claude-sonnet-5-5-medium", "name": "Claude Sonnet 5.5 (Medium)",
                    "blocked": { "until": "2026-10-26T10:22:39Z", "by": "Claude and GPT models · weekly" } },
                  { "id": "gemini-3.8-flash-high", "name": "Gemini 3.8 Flash (High)" } ] },
    { "runtime": "grok_build", "name": "Grok",
      "limits": [ { "name": "Billing period", "remainingPercent": null, "resetsAt": "2026-10-29T00:00:00Z" } ],
      "models": [ { "id": "grok-4.7", "name": "Grok 4.7", "contextTokens": 256000 } ] },
    { "runtime": "autobyteus", "name": "AutoByteus",
      "providers": [ { "provider": "DeepSeek", "balance": "0.14 USD", "models": [ … ] },
                     { "provider": "Anthropic", "blocked": "credit balance too low",
                       "models": [ { "id": "…", "name": "…", "blocked": { "until": null, "by": "credit balance too low" } } ] },
                     { "provider": "OpenAI", "limits": "not reported", "models": [ … ] } ] } ] }
```

Timeline (AR-002), worst case and measured typical:

```
              0s        4s           10s                      18s   ≤20s
worst case    |install--|--sign-in---|--models ‖ limits-------|done |answer
Grok typical  |0.1s|~1s sign-in (grok models)|~1s models ‖ ~1s billing|        ≈ 2–3 s
Antigravity   |0.1s|~1.8s sign-in (agy models)|~1.8s models ‖ ~2.7s /usage|    ≈ 5 s
Codex         |0.1s|<1s account/read|<1s model/list ‖ 0.65s rateLimits|        ≈ 2 s
```

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Claude control query | `query({ prompt: idleInput(), options: { cwd, env, pathToClaudeCodeExecutable, settingSources, permissionMode: "plan" } })`; `idleInput()` yields nothing and completes when closed | `prompt: "Enumerate supported models only.", maxTurns: 0` | A string is sent as a user turn; `maxTurns: 0` is dropped (C-15) |
| Failure | `"models": "unknown: Antigravity model list timed out"` | `"models": []` | "No models" would be a guess (REQ-007) |
| Blocked derivation | service sets `model.blocked` from exhausted limits / provider block | parsers setting `blocked` on models | One owner of derived data |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the old Claude discovery query beside the new helper | Fewer edits | Rejected | One idle-input helper |
| Keep the runtime-specific details part | Earlier design | Rejected (user: only useful information) | Lean report |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Internal limit types and parsers with fixture tests (from `evidence/limit-probes/`, redacted).
2. `withClaudeControlQuery` (idle input, time-out) and `listModels` on it; remove `MODEL_DISCOVERY_PROBE_PROMPT`; `readUsage`. `runAcpExtensionRequest`.
3. `read-deadline.ts`; optional `{deadline}` on `readVersion`, `readSignIn`, `listAntigravityModels`, `discoverGrokBuildModels`, catalogs (Codex races it); `readUsageLimits` on the interface and four strategies; test doubles.
4. Provider usage readers + registry.
5. `AvailableAgentRuntimesService` (caps, rules, derivation, lean report).
6. Tool, MCP adapter, registration, GraphQL query, composition binding.
7. Web section, nav entry, i18n.
8. Docs, GLOSSARY.

## Key Tradeoffs

- **Live reads, no cache:** always current; ≤ 3 short processes per runtime per call.
- **Fixed caps instead of a dynamic remaining-time budget:** simple and checkable (sum = 18 s); typical reads finish in 2–5 s.
- **Unmapped limit → whole runtime:** may hide a usable model, never shows a blocked one as usable.
- **Lean answer:** plan, credits and similar facts only influence `blocked`; the router gets exactly what it decides on.

## Risks

- RSK-001 external formats change → `unknown`; fixtures pin today's formats.
- RSK-004 an abandoned Codex app-server request may still answer later; its answer is ignored (no child process to stop).
- RSK-002 concurrent calls spawn concurrent short processes; bounded by caps; validation measures a few parallel calls.
- RSK-003 Grok used % unconfirmed (UNK-001) → `remainingPercent` null.

## Guidance For Implementation

- Reproduction to start from: a unit test on today's `ClaudeSdkClient.listModels` asserting the query's `prompt` is not a string fails now and must pass after step 2.
- Tests: a step with two commands whose second one is slow (fake `agy`: `--help` fast, `models` hangs) ends by the step's deadline and its process is killed; a Codex fake whose request never settles releases the lease at the deadline; `withClaudeControlQuery` passes a non-string prompt whose iterator never yields (fake SDK records it) and closes on time-out; AC-011 with slow fakes on every step (each step receives its cap); REQ-007 entries per failing step; output contains no keys, emails or IDs (AC-009); the Anthropic reader calls only `count_tokens`.
- Live checks (validation): Claude `get_usage` answer's `session.total_cost_usd` is 0 for the reading session, and the account's 5-hour utilization does not move across repeated reads; whole answer ≤ 20 s.
- Never log raw reader output or keys; reasons are short and classified.
- Validate on a Docker node too.
