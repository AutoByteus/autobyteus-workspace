# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction, user informed (requirements doc, Document Status)
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/deepseek-dsh-runtime-investigation/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md` (2026-11-06); project `DESIGN.md` (root), `GLOSSARY.md` (entries `:153-172`), `autobyteus-server-ts/docs/modules/credential_proxy.md`, `agent_memory.md` (Archive, Rotation), `grok_build_runtime.md`, `secret_management.md` (2026-11-05/06); `references/design-examples.md`: not used
- Project design-principle conflicts or discrepancies: None. `DESIGN.md` rule 9 (no cross-version compatibility) concerns AutoByteus components; dsh is an external program, and the user decided its changes are handled as bugs (DEC-003).

## Current-State Read

The shared ACP backend carries Grok Build: `AcpAgentRunBackendFactory` prepares workspace, skills and Agent Tools, then `AcpSessionLauncher` spawns one agent process from a pure `AcpAgentLaunchProfile` (`args({model, reasoningEffort})`, `env(base)`), initialises ACP and opens a session with `session/new` (with the profile's `_meta`) or `session/load` (`acp-session-launcher.ts:76-130`, `acp-agent-capabilities.ts:44-49`). `AcpAgentSession` owns the session state machine, permissions, the 300 s idle timer and the effects of agent extension notifications (usage, MCP readiness, compaction) (`acp-agent-session.ts:19,180-204,312-321`). Instructions are delivered only at `session/new` (`acp-agent-run-backend-factory.ts:105-114,126`).

The credential proxy forwards integration calls only: one loopback listener on port 0, route `/r/<pass>/<integrationId>/<route>/…`, one pass per run in `RunPassRegistry` with integration grants, vault tokens resolved per call, buffered and redacted text bodies (`credential-proxy-routes.ts`, `credential-proxy-forwarder.ts:46,91-94,154-157`, `run-pass-registry.ts`). Passes are revoked when a run is released (`agent-run-resource-manager.ts:124`).

dsh (0.2.2-rc.1) speaks ACP v1 with `session/resume` but not `session/load`; it reports no per-call usage or compaction over ACP; its persona fields are templates that throw on unknown `{{…}}`; it resolves its key from `$DSH_HOME/.credentials.yaml` before the launch environment and its endpoint from `DEEPSEEK_BASE_URL`; it marks compaction requests with `x-deepseek-harness-compact: 1` (investigation notes, RT-001…RT-022).

No current design issue blocks this change. The shared layer lacks four standard or runtime-neutral seams (restore by resume, config-option selection, per-run launch facts, effects from model traffic), and the proxy lacks a runtime model route. Each extends an existing owner.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: a new runtime owner (dsh launch/session profiles, home, discovery, availability strategy, Work Journal translation, tool projection); four seams in the shared ACP layer used by Grok; a second route family in the credential proxy with streaming and per-run observation; a new secret consumer; runtime-kind registration in about 25 places across server, three contract packages and web. Estimate ~15 new server files, ~30 modified files, plus tests.
- Architectural risk: `High`
- Risk rationale: security boundary (the vault key is forwarded by a new proxy route); shared-contract changes (ACP launch profile, session profile effect types, runtime kind in stream contracts); concurrency and lifecycle (per-run proxy observation bound to a session; a child process per run); an external developer-preview dependency.
- Escalation trigger: any need to give dsh the key itself, to read dsh's private session files, or to change Grok's observable behavior returns to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| RT-001/002 | `evidence/p1-*, p2-*` | `resume` only; `configOptions` from `session/new`/`resume` | Restore by resume; config-option selection; options discovery | — |
| RT-007/008/018 | `evidence/p9-*, p10-*, p20-*` | Proxy with pass works; shells see `DEEPSEEK_BASE_URL` but not `DEEPSEEK_API_KEY` | Model route; pass in `x-api-key` | — |
| RT-014/017/021 | `evidence/p16-*, p19-*, p21-*` | No ACP compaction; compaction header; stream usage fields | Proxy observation → effects | Header is code, not docs (RSK-002) |
| RT-016 | `evidence/p18-*` | 179 s silent while streaming | Activity effect | — |
| RT-018 | `probes/owned-home.cordis.patch.yml`, `probes/dsh-plugin/` | Owned home patch + plugin section preserves `{{…}}`; `!!js process.env` works | dsh home owner; instructions plugin | — |
| RT-010…012 | `evidence/p12-*…p14-*` | Project-root discovery misses nested workspaces; `customSkillDirs` works; MCP naming | Skills via `customSkillDirs`; projection | — |
| Code | `acp-agent-launch-profile.ts`, `acp-session-launcher.ts:76-130`, `acp-agent-session.ts`, `acp-agent-session-profile.ts` | Seams listed in Current-State Read | Shared-layer changes | — |
| Code | `credential-proxy/*`, `secret-id.ts:16-18`, `provider-credential-catalog.ts:58-62`, `secret-management-service.ts:50,106` | Proxy and vault owners | Model route; consumer | — |
| Code | registration list (investigation notes) | ~25 places | Change inventory | — |

## Intended Change

Add DeepSeek Harness as an ACP runtime on the shared ACP backend. Its model calls go through a new runtime model route of the credential proxy, which adds the vault key, streams the reply and reports each call to the run's session. The session turns those reports into token usage, compaction boundaries and liveness. Extend the shared ACP layer with restore by `session/resume`, config-option selection, per-run launch facts and model-traffic effects.

## Change Scope (Mandatory)

- In scope: UC-001…UC-008. Areas: `runtime-management/acp` (launch profile contract, capabilities, client connection, discovery), `agent-execution/backends/acp` (session, launcher, factory, profile contract), `agent-execution/backends/grok` (contract adaptation only), new `agent-execution/backends/deepseek-harness`, new `runtime-management/deepseek-harness`, `credential-proxy` (model routes, pass registry, forwarder auth/streaming, host, local server), `secret-management` (consumer), runtime registration points, `agent-work-journal` translation, contracts and web runtime maps, docs.
- Derived consumers: runtime kind union → GraphQL enum, stream contract schemas (`agent-org-execution-dtos.ts:17`, `team-execution-view-dtos.ts:24,166`), web maps — each adds the value; `RunPassHolder` → route handlers read the new field, `IntegrationRunAccess` keeps grants semantics; `AcpSessionEffect` → Grok profile and its tests updated to the renamed type.
- Deliberately left alone: integration route behavior and activity log; Grok's observable behavior; the native runtime's DeepSeek models; image prompt blocks; data-dir `.env` loading (FU-001); Antigravity (autobyteus-386).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, AC-001 | Run created with runtime `deepseek_harness` | Grok path (BEH-001 notes) | New runtime on the same path | DS-001 |
| BEH-002 | User | REQ-002/008, AC-001/002/008 | User message | Shared session (BEH-002 notes) | dsh tool projection | DS-002 |
| BEH-003 | User | REQ-003, AC-003 | Stop | `AcpAgentSession.cancel` | Unchanged mechanism | DS-002 |
| BEH-004 | System | REQ-004, AC-004 | Restore | `mode: "load"` only | Restore method by capability; resume for dsh | DS-004 |
| BEH-005 | User | REQ-005, AC-005 | Model list / run start | Grok initialize discovery | Options discovery; config-option selection | DS-005, DS-001 |
| BEH-006 | System | REQ-006, AC-006 | Every launch | `_meta` at new only | Instructions file + plugin at every dsh launch | DS-001, DS-004 |
| BEH-007 | System | REQ-007, AC-007 | Run start | Workspace materializer | `.dsh/skills` + `customSkillDirs`, default roots off | DS-001 |
| BEH-009 | System | REQ-009, AC-009 | Run preparation; each model call | Integration proxy | Model route with pass in `x-api-key` | DS-001, DS-002 |
| BEH-010/011/012 | System | REQ-010/011/012, AC-010/011/012 | Each model call | Ext effects only | Model-traffic effects | DS-003 |
| BEH-013 | User | REQ-013, AC-013 | Agent Runtimes page | Strategies | dsh strategy, `apiKeySetting` route | DS-006 |
| BEH-014 | System | REQ-014, AC-014 | Journal render | Translation registry | dsh translation | — |
| BEH-015 | System | REQ-015, AC-015 | Every launch | — | Home patch rows | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/owned-home.cordis.patch.yml` | Verified home patch | REQ-006/007/015 | Starting point for `deepseek-harness-home-files.ts` | Evidence |
| `probes/dsh-plugin/autobyteus-agent-instructions.mjs` | Verified plugin | REQ-006 | Starting point for the plugin source | Evidence |
| `probes/vault-forwarder.mjs` | Verified forwarding, SSE usage tap | REQ-009/010/011 | Behavior the model route must match | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers that fire:
  - Capability-area reuse (Principle 4): proxy forwarding, pass lifecycle, vault resolution, skill materialization, compaction-boundary recording, usage events, discovery short process all exist → extended, not duplicated.
  - Several kinds or forms (Principle 1): the proxy serves two subjects (integration calls, runtime model calls) → separate route family and grant field, shared forwarder; restore has two forms (`load`, `resume`) → one capability rule.
  - Vocabulary drift (Principle 15): `AcpExtEffect` would carry effects not from extensions → renamed `AcpSessionEffect`; glossary entries for credential proxy and run pass widened; new term "runtime model route".
  - Split sequence (Principle 13): the launcher owns the launch sequence including the model-access step and the observer subscription; the session applies effects itself; the proxy only reports.
  - Derived data (Principle 11): `RunPassHolder` change → integration route handler, model route handler, `DefaultIntegrationRunAccess` (each decided in Change Scope).
  - Ruled out: Responsibility overload — `acp-agent-session.ts` grows from 333 to about 400 lines; `credential-proxy-routes.ts` stays integration-only (model routes in their own file).
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No` (the renames above are part of the feature, not a separate refactor)
- Evidence: Current-State Read citations.
- Design response: extend owners as listed.
- Refactor rationale: the owners are healthy; the additions are seams they lacked.
- Intentional deferrals and residual risk: none.

## Terminology

- **Runtime model route** (new glossary term): an app-owned proxy route for one runtime's model calls (DeepSeek Harness → `https://api.deepseek.com/anthropic/v1/messages`), granted by the runtime, not by skills. Not an integration.
- **Credential proxy** (glossary entry widened): forwards an allowed run's calls to an integration or to its runtime's model provider, adding the credential.
- **Run pass** (glossary entry widened): one per run; in a run's proxy address for integrations (`/r/<pass>/…`), in the API-key header for a runtime model route.
- **Model call observation**: what the proxy reports about one forwarded model call (started, stream activity, finished with usage).
- **dsh home**: the AutoByteus-owned `DSH_HOME` for dsh runs.

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: `AcpAgentLaunchProfile.args`/`env` (replaced by `runLaunch`/`discoveryLaunch`); `AcpExtEffect`/`AcpExtNotificationContext` names; launcher mode `"load"` (replaced by `"restore"`).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: run metadata `runtimeKind`, raw-trace manifest `runtime_kind`, token-usage `runtime_kind`/`ingestion_kind`; new files under `<appData>/runtimes/deepseek-harness/`.
- Relevant change: new string values; new runtime-owned folder.
- Normal reader/writer behavior: `runtimeKindFromString` (`runtime-kind-enum.ts:17`); open unions (`agent-run-token-usage.ts:13-20`).
- Required semantics and invariants under direct use: existing values unchanged.
- Constraints: dsh home holds dsh's own session store (no key: DEC-007); per-run folders removed at release.
- Decision: `Not Affected` for existing data (new values only).
- Rationale: no existing record changes meaning or shape.
- Supported AC: AC-016/017.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/005/006/007/009/015 | Run creation | Bound backend with open dsh session | `AcpAgentRunBackendFactory` / `AcpSessionLauncher` | Where every per-run fact reaches dsh |
| DS-002 | Primary End-to-End | BEH-002/003/009 | User message | Turn events published | `AcpAgentRunBackend` / `AcpAgentSession` | The turn, including model calls through the proxy |
| DS-003 | Return-Event | BEH-010/011/012 | Proxy forwards a model call | Usage / compaction / liveness applied in the session | `RuntimeModelProxyRoute` → `AcpAgentSession` | Replaces the missing ACP signals |
| DS-004 | Primary End-to-End | BEH-004/006 | Restore | Resumed session | `AcpSessionLauncher` | dsh restore |
| DS-005 | Primary End-to-End | BEH-005 | Model list request | `ModelInfo[]` | `DeepSeekHarnessModelCatalog` | dsh models |
| DS-006 | Primary End-to-End | BEH-013 | Agent Runtimes page | Status row | `AgentRuntimeStatusService` + dsh strategy | Readiness |
| DS-007 | Bounded Local | BEH-002/004/012 | Session event | State transition / idle timer | `AcpAgentSession` | `opening_resume`; activity refresh |

## Primary Execution Spine(s)

- DS-001: `Run config → AgentRunManager → AcpAgentRunBackendFactory.createBackend → prepare (workspace, WorkspaceSkillMaterializer → <ws>/.dsh/skills, Agent Tools MCP) → AcpSessionLauncher.open → RuntimeModelRunAccess.prepareForRun (pass + model route grant, vault key present) → DeepSeekHarnessLaunchProfile.runLaunch (DeepSeekHarnessHome.ensure, run instructions file) → AcpAgentProcess.spawn(dsh --profile acp) → initialize → session/new → AcpAgentSession.applyConfigSelection (model, reasoning_effort) → RuntimeModelRunAccess.observe(runId → session) → backend bound`
- DS-002: `User message → AcpAgentRunBackend.dispatchUserInput → AcpAgentSession.startTurn → dsh → RuntimeModelProxyRoute (/m/deepseek/…, pass in x-api-key) → CredentialProxyForwarder (x-api-key = vault key, streamed) → api.deepseek.com → SSE → dsh → session/update → AcpSessionUpdateConverter (DeepSeek Harness tool projection) → AcpAgentRunBackend.publish`
- DS-004: `Restore → AcpAgentRunBackendFactory.restoreBackend (composes instructions) → AcpSessionLauncher.open(restore) → prepareForRun → runLaunch → spawn → initialize → capabilities.restoreMethod = resume → AcpAgentSession.openResume → applyConfigSelection → observe`
- DS-005: `ModelCatalogService → DeepSeekHarnessModelCatalog → discoverDeepSeekHarnessModels → runAcpSessionOptionsDiscovery(discoveryLaunch, <dsh home>/discovery) → initialize → session/list(cwd) → session/resume (newest) or session/new → configOptions → session/close → normalizeDeepSeekHarnessModels`
- DS-006: `Agent Runtimes page → AgentRuntimeStatusService → DeepSeekHarnessAgentRuntimeStrategy (dsh --version; npm view @deepseek-ai/dsh version; vault status for provider.deepseek.api-key)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Creation prepares the run's workspace facts, then the launcher asks the proxy for the run's model access, asks the dsh profile for the launch (which ensures the dsh home and writes the run's instructions file), spawns dsh, opens the session, applies the chosen model and effort, and binds the proxy's observations of this run to the session | run, launch, session, run pass | `AcpSessionLauncher` | dsh home files, skill materialization |
| DS-002 | A message starts a turn; dsh calls DeepSeek through the proxy, which checks the pass, adds the key and streams back; dsh's updates become AutoByteus events | turn, model call | `AcpAgentSession` | tool projection |
| DS-003 | For each forwarded call the proxy reports start (with purpose from the compaction header), stream activity, and finish with DeepSeek's usage; the session gives each report to its profile, which returns effects; the session applies them (usage event with its call ordinal, compaction status, idle refresh) | model call observation, effect | `AcpAgentSession` (applies), dsh session profile (interprets) | SSE usage reading |
| DS-004 | Restore repeats DS-001 with the stored session id; the launcher picks `session/resume` because dsh advertises no `loadSession` | session | `AcpSessionLauncher` | — |
| DS-005 | A short dsh process lists the one discovery session, resumes it or creates it, reads its options and closes it | model option | `DeepSeekHarnessModelCatalog` | normalisation |
| DS-006 | The page reads version, latest version and key state | runtime status | status service | — |

## Spine Actors / Main-Line Nodes

`AgentRunManager`, `AcpAgentRunBackendFactory`, `AcpSessionLauncher`, `RuntimeModelRunAccess`, `DeepSeekHarnessLaunchProfile`, `AcpAgentProcess`/`AcpClientConnection`, `AcpAgentSession`, `RuntimeModelProxyRoute`, `CredentialProxyForwarder`, `AcpAgentRunBackend`, `DeepSeekHarnessModelCatalog`, `DeepSeekHarnessAgentRuntimeStrategy`.

## Ownership Map

- `AcpSessionLauncher` (extended): the launch sequence: model access (only when the launch profile names a model route), launch, spawn, initialize, open (new / restore by capability), config selection, observer subscription; records every handle on the owner, including the launch (for `release()`) and the observer unsubscribe.
- `AcpAgentSession` (extended): adds `opening_resume`, `applyConfigSelection`, `onModelTraffic`; owns ordinals, turn gating and the idle timer for all effects.
- `AcpAgentSessionProfile` (contract extended): pure hooks `configSelection`, optional `interpretModelTraffic`.
- `AcpAgentLaunchProfile` (contract changed): `command()`, `modelRouteId`, `runLaunch(request)`, `discoveryLaunch()`, `normalizeModels`.
- `RuntimeModelRunAccess` (new, credential proxy): issues the run's pass with the model route grant, checks the vault key is configured, gives the route's base URL, registers and removes per-run observers. Public boundary for backends.
- `RuntimeModelProxyRoute` (new): the `/m/<routeId>/…` handler: loopback gate, pass from `x-api-key`, grant check, path/method check, key resolution, forwarding, observation. Internal to the proxy.
- `RunPassRegistry` (extended): one pass per run holding integration grants and an optional model route grant.
- `DeepSeekHarnessHome` (new): the AutoByteus-owned dsh home and per-run folders; writes the home patch and plugin when their content differs.
- `DeepSeekHarnessLaunchProfile` (new): dsh command, args and environment for run and discovery launches.
- `deepSeekHarnessSessionProfile` (new): no `_meta`, HTTP Agent Tools MCP, no readiness wait (dsh connects MCP during `session/new`, RT-012), tool projection, config selection, model-traffic interpretation, compaction payload.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `createDeepSeekHarnessAgentRunBackendFactory` | `AcpAgentRunBackendFactory` | Binds dsh profiles and deps (as `createGrokBuildAgentRunBackendFactory`) | Any sequencing |
| `CredentialProxyHost.modelRunAccess` | `RuntimeModelRunAccess` | Composition entry | Route policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `AcpAgentLaunchProfile.args`, `.env`, `AcpLaunchSelection` | Run and discovery launches need different facts | `runLaunch(AcpRunLaunchRequest)`, `discoveryLaunch()` | Grok profile and `acp-discovery-handshake.ts` migrate |
| `AcpExtEffect`, `AcpExtNotificationContext` names | Effects also come from model traffic | `AcpSessionEffect`, `AcpSessionEffectContext` | Rename in all users |
| Launcher mode `"load"`, `AcpAgentCapabilities.requiredFor({restore})` → `loadSession` | Restore has two forms | Mode `"restore"`; `restoreMethod()` | — |
| Factory comment "not re-sent on load" (`acp-agent-run-backend-factory.ts:126`) | Instructions now go to every launch request | — | — |

## Return Or Event Spine(s) (If Applicable)

DS-003: `RuntimeModelProxyRoute (call started / chunk / finished) → ModelCallObservers(runId) → listener bound by AcpSessionLauncher → AcpAgentSession.onModelTraffic → profile.interpretModelTraffic(observation, context) → AcpAgentSession.applyEffects → AcpSessionUpdateConverter.usage / .compaction / refreshIdleTimer → AcpAgentRunBackend.publish → (COMPACTION_STATUS) ProviderCompactionBoundaryRecorder`.

## Bounded Local / Internal Spines (If Applicable)

- `AcpAgentSession` state machine: `created → opening_new | opening_resume | opening_load → ready → prompting ⇄ cancelling → ready`, any → `failed`/`closed`. Model-traffic effects, like extension effects, apply only `isInTurn()` except none (dsh has no MCP status); activity refreshes the idle timer only in a turn.
- Proxy stream tap (inside `RuntimeModelProxyRoute`): `upstream chunk → reader.push(chunk) → activity (throttled to one report per second) → end → finished(usage)`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `AnthropicMessagesStreamReader` | DS-003 | `RuntimeModelProxyRoute` | Read usage and stop reason from Messages SSE without changing bytes | Usage source | Protocol parsing inside the route handler |
| `ModelCallObservers` | DS-003 | `RuntimeModelRunAccess` | Per-run listener registry | Route → session delivery | Session reaching into the proxy |
| `DeepSeekHarnessHome` | DS-001/005 | dsh launch profile | Files on disk | Composition | Launcher writing runtime files |
| `deepseek-harness-home-files.ts` | DS-001 | `DeepSeekHarnessHome` | Patch and plugin text | One place for dsh composition | Scattered literals |
| dsh tool projection | DS-002 | session profile | Tool name → AutoByteus tool | Cards | Converter knowing dsh |
| dsh call usage / compaction payload builders | DS-003 | session profile | Payloads | Same shapes as Grok | — |
| dsh Work Journal translation | — | translation registry | Journal lines | REQ-014 | — |

## Ownership Boundaries

- Backends depend on `RuntimeModelRunAccess` only (never on `RunPassRegistry`, the forwarder or observers).
- The proxy reports observations; it never builds AutoByteus events or knows sessions.
- The dsh profile owns everything dsh-specific; the shared ACP layer knows no dsh name.
- The secret value is revealed only inside `CredentialProxyForwarder` when the upstream header is set.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RuntimeModelRunAccess` | `RunPassRegistry`, `ModelCallObservers`, vault status check | `AcpSessionLauncher`, dsh discovery | Launcher reading the pass registry | Extend `RuntimeModelRunAccess` |
| `CredentialProxyHost` | listener, routes, forwarder | composition (`agent-provider-factory-builder.ts`) | — | — |
| `AcpSessionLauncher` | process, connection, session open | factory, backend reopen | Factory spawning directly | — |
| `AcpAgentSession` | converter, bridge, timers, effects | launcher, backend | Observer calling the converter | — |

## Dependency Rules

- `agent-execution/backends/*` → `credential-proxy` (`RuntimeModelRunAccess`, `IntegrationRunAccess`, observation type) — allowed (exists today for integrations).
- `credential-proxy` → `agent-execution` — forbidden.
- `runtime-management/deepseek-harness` → `credential-proxy` (base URL, discovery placeholder) — allowed; → `agent-execution` — forbidden.
- Shared ACP files → no import from `grok` or `deepseek-harness` folders.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `RuntimeModelRunAccess.prepareForRun({runId, agentDefinitionId}, routeId)` → `{ baseUrl, apiKey }` | a run's model access | Grant model route on the run's pass; refuse when the vault key is not configured (`RuntimeModelKeyMissingError`, message names Settings → API Keys) | run identity + route id | `apiKey` is the pass |
| `RuntimeModelRunAccess.routeBaseUrl(routeId)` | a route's address | Base URL without pass (discovery) | route id | — |
| `RuntimeModelRunAccess.observe(runId, listener)` → unsubscribe | a run's model calls | Deliver observations | run id | One listener per run generation |
| `POST /m/<routeId>/<path>` (`x-api-key: <pass>`) | one model call | Forward with the vault key | pass + route id | Errors JSON `{error, message}`: `NOT_LOOPBACK`, `RUN_PASS_INVALID`, `MODEL_ROUTE_NOT_ALLOWED`, `PATH_NOT_ALLOWED`, `MODEL_KEY_NOT_SET`, `UPSTREAM_UNREACHABLE` |
| `AcpAgentLaunchProfile.runLaunch(AcpRunLaunchRequest)` → `AcpLaunch` | one run process launch | Args, env, `release()` | `{runId, workingDirectory, composedPrompt, model, reasoningEffort, modelAccess}` | Grok ignores prompt/access |
| `AcpAgentLaunchProfile.discoveryLaunch()` → `AcpLaunch` | discovery process | Args, env | — | — |
| `AcpAgentSessionProfile.configSelection(selection, configOptions)` | session options | `[{configId, value}]` to apply | `{model, reasoningEffort}` | Grok `[]` |
| `AcpAgentSessionProfile.interpretModelTraffic?(observation, context)` | effects | Pure | observation + `AcpSessionEffectContext` | Grok absent |
| `AcpClientConnection.resumeSession`, `.setSessionConfigOption`, `.listSessions`, `.closeSession` | ACP methods | Standard calls with timeouts | ACP params | `listSessions`/`closeSession` used by discovery only |
| `SecretConsumerIdentity {kind: "agentRuntime", runtimeKind: "deepseek_harness", credentialSlot: "apiKey"}` | vault binding | → `provider.deepseek.api-key` | — | `provider-credential-catalog.ts` |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `prepareForRun` | Yes | Yes | Low | — |
| `/m/<routeId>` vs `/r/<pass>/<integrationId>` | Yes | Yes | Low | Separate families by subject |
| `runLaunch` / `discoveryLaunch` | Yes | Yes | Low | Split by launch kind |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Runtime kind | `deepseek_harness` / "DeepSeek Harness" | Yes | Yes | Low | — |
| Effect | `AcpSessionEffect` (was `AcpExtEffect`) | Yes | Yes | Low | Rename |
| Route | runtime model route | Yes | Glossary updated | Medium | Glossary entry |
| Pass | run pass | Yes | Glossary widened | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Forward with credential | `CredentialProxyForwarder` | Extend | Add `x-api-key` auth, drop caller `x-api-key`; model route sets `redactsTextBodies: false`, `buffersRequestBody: false` | — |
| Pass lifecycle | `RunPassRegistry`, release at `agent-run-resource-manager.ts:124` | Extend | One pass per run (glossary) | — |
| Key | vault consumer catalog | Extend | Claude precedent | — |
| Skills | `WorkspaceSkillMaterializer` | Reuse | Profile folder `.dsh/skills` | — |
| Compaction rotation | `ProviderCompactionBoundaryRecorder` via `COMPACTION_STATUS` | Reuse | Same payload shape | — |
| Usage events | `converter.usage` | Reuse | Same payload shape | — |
| Discovery process | `withShortAcpProcess` | Extend | Options discovery | — |
| Observation delivery | — | Create New (`ModelCallObservers`) | No per-run push channel from the proxy exists | Integrations have no observers |
| dsh home | — | Create New | Runtime-owned files | No runtime home owner exists |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy` | model routes, pass grant, observation, forwarding | DS-001/002/003 | launcher, session | Extend | new `model-routes/` folder |
| `runtime-management/acp` | launch contract, capabilities, connection, discovery | DS-001/004/005 | launcher | Extend | — |
| `agent-execution/backends/acp` | session, launcher, factory, profile contract | DS-001…DS-004 | — | Extend | — |
| `runtime-management/deepseek-harness` | launch profile, home, capability/discovery | DS-001/005/006 | — | Create New | Mirrors `grok/` |
| `agent-execution/backends/deepseek-harness` | session profile, projection, payloads, factory binding | DS-002/003 | — | Create New | Mirrors `backends/grok/` |
| `secret-management` | consumer | DS-001/002 | proxy | Extend | — |
| registration points, contracts, web, journal | runtime kind | all | — | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft except the shared `deepseek-harness-identity.ts` below).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Model call observation type | `credential-proxy/model-routes/model-call-observation.ts` | credential proxy | Proxy produces, dsh profile consumes | Yes | Yes | An AutoByteus event type |
| dsh identity constants (runtime kind, label, provider route `deepseek-official`, model route id `deepseek`) | `runtime-management/deepseek-harness/deepseek-harness-identity.ts` | dsh runtime | Used by launch profile, catalog, strategy, session profile | Yes | Yes | A config bag |
| Usage payload builder | Grok and dsh builders stay separate | — | Different ingestion kinds and sources; ~40 lines each | — | — | A generic multi-runtime builder with flags |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RunPassHolder` (+ `modelRouteId: string \| null`) | Yes | Yes | Low | — |
| `ModelCallObservation` (`started {callId, purpose}`, `activity {callId}`, `finished {callId, purpose, httpStatus, usage \| null, stopReason \| null}`) | Yes | Yes | Low | — |
| `AcpSessionEffect` (+ `{kind: "activity"}`) | Yes | Yes | Low | — |
| `AcpRunLaunchRequest` | Yes | Yes | Low | `modelAccess` null when the profile has no route |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/model-routes/runtime-model-routes.ts` | proxy | definitions | The app-owned model routes: `deepseek` → origin `https://api.deepseek.com`, basePath `/anthropic`, allows `POST /anthropic/v1/messages`, auth `x-api-key`, no buffering/redaction, consumer `agentRuntime/deepseek_harness/apiKey`, stream reader `anthropic-messages` | One table | `DeliveryRoute` |
| `credential-proxy/model-routes/runtime-model-proxy-routes.ts` | proxy | `RuntimeModelProxyRoute` | `/m/<routeId>/…` handler and its checks; tap → observers; purpose from `x-deepseek-harness-compact` (route-declared `purposeHeader`) | One route family | forwarder |
| `credential-proxy/model-routes/anthropic-messages-stream-reader.ts` | proxy | off-spine | SSE usage/stop reading | One protocol | — |
| `credential-proxy/model-routes/model-call-observation.ts` | proxy | type | Observation union | Shared type | — |
| `credential-proxy/model-routes/runtime-model-run-access.ts` | proxy | `RuntimeModelRunAccess` | Interface + default impl + `ModelCallObservers` | Boundary and its registry | `RunPassRegistry` |
| `credential-proxy/run-pass-registry.ts` | proxy | modify | `modelRouteId` on holder; `grantModelRoute` | — | — |
| `credential-proxy/credential-proxy-forwarder.ts` | proxy | modify | `x-api-key` auth; drop caller `x-api-key`; stream bodies when the route does not redact | — | — |
| `credential-proxy/delivery-definitions.ts` | proxy | modify | `DeliveryRoute.auth` adds `"x-api-key"` | — | — |
| `credential-proxy/credential-proxy-local-server.ts`, `credential-proxy-host.ts` | proxy | modify | Register model routes; expose `modelRunAccess` | — | — |
| `secret-management/domain/secret-id.ts`, `catalog/provider-credential-catalog.ts` | secrets | modify | dsh consumer | — | — |
| `runtime-management/acp/acp-agent-launch-profile.ts` | ACP | modify | New contract | — | — |
| `runtime-management/acp/acp-agent-capabilities.ts` | ACP | modify | `restoreMethod()`, `requiredFor({restore, mcp})` with `restore` satisfied by load or resume | — | — |
| `runtime-management/acp/acp-client-connection.ts` | ACP | modify | `resumeSession`, `setSessionConfigOption`, `listSessions`, `closeSession` with timeouts | — | — |
| `runtime-management/acp/acp-discovery-handshake.ts` | ACP | modify | `discoveryLaunch()`; `runAcpSessionOptionsDiscovery(profile, {cwd}, options)` | — | — |
| `agent-execution/backends/acp/acp-agent-session-profile.ts` | ACP | modify | Renames; `activity` effect; `configSelection`; `interpretModelTraffic?` | — | observation type |
| `agent-execution/backends/acp/session/acp-agent-session.ts` | ACP | modify | `openResume`, `applyConfigSelection`, `onModelTraffic`, `applyEffects` (extracted) | — | — |
| `agent-execution/backends/acp/session/acp-session-launcher.ts` | ACP | modify | Sequence of DS-001/004; `runtimeModelAccess` dep; owner gains `launch`, `modelTraffic` | — | — |
| `agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | ACP | modify | Compose instructions for create and restore; pass to launcher | — | — |
| `agent-execution/backends/grok/*` | Grok | modify | Contract adaptation: `runLaunch`/`discoveryLaunch` (same args/env as today), `configSelection: []`, renamed types; no behavior change | — | — |
| `runtime-management/deepseek-harness/deepseek-harness-identity.ts` | dsh | constants | IDs and labels | Shared constants | — |
| `runtime-management/deepseek-harness/deepseek-harness-home.ts` | dsh | `DeepSeekHarnessHome` | `<appData>/runtimes/deepseek-harness/{home,runs/<runId>,discovery}`; `ensure()`; run folder create/remove | One owner of the files | — |
| `runtime-management/deepseek-harness/deepseek-harness-home-files.ts` | dsh | content | Home patch YAML and plugin source (from `probes/`) | One composition | — |
| `runtime-management/deepseek-harness/deepseek-harness-launch-profile.ts` | dsh | launch profile | `command()` (`DEEPSEEK_HARNESS_COMMAND` or `dsh`), `modelRouteId: "deepseek"`, run/discovery launches, `normalizeModels` (unused: options discovery) | — | identity |
| `runtime-management/deepseek-harness/deepseek-harness-capability.ts` | dsh | probe + discovery | `probeDeepSeekHarnessCli`, `discoverDeepSeekHarnessModels`, `normalizeDeepSeekHarnessModels`, diagnostics | As Grok's capability file | — |
| `runtime-management/agent-runtimes/strategies/deepseek-harness-agent-runtime-strategy.ts` | runtimes | strategy | Version, latest (`npm view @deepseek-ai/dsh version`), sign-in from vault status, usage limits not reported, update `npm install -g @deepseek-ai/dsh@latest`, install URL `https://github.com/deepseek-ai/deepseek-harness` | — | — |
| `llm-management/services/deepseek-harness-model-catalog.ts` | catalog | catalog | As `grok-build-model-catalog.ts` | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-session-profile.ts` | dsh | session profile | Hooks | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-tool-projection.ts` | dsh | projection | `bash` → `run_bash` (exit code from `[exit code: N]`), `write` → `write_file`, `edit`/`apply_patch` → `edit_file`, `mcp__<server>__<tool>` → canonical Agent Tools name via `normalizeAgentToolsMcpToolNameForEvent` + `projectMcpToolResultForApplication` (provider `deepseek_harness`), others by name | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-model-traffic.ts` | dsh | interpretation | Observation → effects: compaction `started`/`completed`/`failed`, usage per finished call, activity | — | payload builders |
| `agent-execution/backends/deepseek-harness/deepseek-harness-call-usage.ts`, `…-compaction-status-payload.ts` | dsh | payloads | Usage (`ingestion_kind` `deepseek_harness_call` / `deepseek_harness_compaction_call`, `model_provider` `DEEPSEEK`); compaction payload as Grok's with `provider: "deepseek_harness"`, `source_surface: "deepseek_harness.proxy_compaction_<phase>"` | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-agent-run-backend-factory.ts` | dsh | facade | Binding | — | — |
| `agent-work-journal/rendering/runtimes/deepseek-harness-translation.ts` | journal | translation | `bash`, `read`, `write`, `edit`, `apply_patch`, `glob`, `grep`, `web_fetch`, `web_search` | — | journal helpers |
| Registration files (investigation notes list), `GLOSSARY.md`, docs (`docs/modules/deepseek_harness_runtime.md` new; `credential_proxy.md`, `agent_runtimes.md`, `secret_management.md` updated) | various | modify | One entry each | — | — |
| web: runtime maps, `agentRuntimesPresentation.ts`/`AgentRuntimeRow.vue` (route `API_KEY_SETTING` hint), localization | web | modify | Runtime entry and key hint | — | — |

## Applied Patterns (If Any)

- Strategy: launch/session profiles per ACP agent (existing).
- Registry: `ModelCallObservers` (per-run listener lookup).
- Adapter: `AnthropicMessagesStreamReader`.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/credential-proxy/model-routes/` | Folder | proxy | Runtime model routes | Second subject of the proxy, separate from integrations | Integration logic, AutoByteus events |
| `autobyteus-server-ts/src/runtime-management/deepseek-harness/` | Folder | dsh runtime | Process, home, discovery | Mirrors `runtime-management/grok/` | Session/event logic |
| `autobyteus-server-ts/src/agent-execution/backends/deepseek-harness/` | Folder | dsh backend | Session profile and payloads | Mirrors `backends/grok/` | Process spawning |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `credential-proxy/model-routes/` | Off-Spine Concern | Yes | Low | — |
| `runtime-management/deepseek-harness/` | Persistence-Provider | Yes | Low | — |
| `agent-execution/backends/deepseek-harness/` | Main-Line Domain-Control | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| dsh run environment | `DSH_HOME=<appData>/runtimes/deepseek-harness/home`, `DEEPSEEK_API_KEY=<run pass>`, `DEEPSEEK_BASE_URL=http://127.0.0.1:<proxy>/m/deepseek`, `AUTOBYTEUS_DSH_INSTRUCTIONS_FILE=<appData>/…/runs/<runId>/instructions.md`, `AUTOBYTEUS_DSH_SKILLS_DIR=<workingDirectory>/.dsh/skills` (all other inherited variables as for Grok; `DSH_PERMISSION_MODE` removed) | Real key in `DEEPSEEK_API_KEY`; pass in the URL path; user's `~/.dsh` | QR-001, DEC-007/012 |
| Base URL and request path | dsh appends `/v1/messages` to its base URL (RT-008: base `…/anthropic` → request `/anthropic/v1/messages`). Base `http://127.0.0.1:<proxy>/m/deepseek` → request `/m/deepseek/v1/messages` → caller path `/v1/messages` → route basePath `/anthropic` → upstream `https://api.deepseek.com/anthropic/v1/messages`, checked by `allows(POST, /anthropic/v1/messages)` (`buildUpstreamUrl`, `credential-proxy-forwarder.ts:83-89`) | Base URL containing `/anthropic` and a route basePath adding it again | A path mistake would send calls to the wrong upstream path or be refused |
| Home patch (verified, RT-018) | rows: `system-prompt.personaPrefix: ''`; insert `autobyteus-agent-instructions` (plugin file beside the patch, `instructionsFile: !!js process.env.AUTOBYTEUS_DSH_INSTRUCTIONS_FILE`); `skill-filesystem {includeDefaultRoots: false, customSkillDirs: !!js "[process.env.AUTOBYTEUS_DSH_SKILLS_DIR]"}`; `session-log-deepseek.enabled: false`; disable dsh's subagent, subagent-fork, subagent-control, workflow, team, goal, plugin-manager and ask-user rows (exact ids confirmed with `dsh --profile acp --dump-config`) | Persona template with the AutoByteus prompt | Plugin must skip when `instructionsFile` is unset (discovery) |
| Model-traffic effects | `started{purpose: compaction}` → compaction started; `finished{compaction, 200, stop}` → completed (rotation); `finished{compaction, non-200}` → failed; `finished{turn}` → usage; `activity` → idle refresh | Inferring compaction from `usage_update.used` | RT-014 shows `used` can rise |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `args`/`env` beside `runLaunch` | Fewer Grok edits | Rejected | Grok migrates in this change |
| Alias `AcpExtEffect` | Fewer edits | Rejected | Rename |
| dsh version gate / feature probes | dsh churn | N/A (DEC-003) | — |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Shared ACP layer: launch contract (`runLaunch`/`discoveryLaunch`), capabilities restore rule, connection methods, session (`openResume`, `applyConfigSelection`, effects rename + `onModelTraffic`), launcher sequence, factory instructions on restore. Migrate Grok. Grok tests green (AC-016).
2. Credential proxy: pass registry field, forwarder auth/streaming, model routes, observers, `RuntimeModelRunAccess`, host/server wiring; vault consumer. Integration tests green (AC-017).
3. dsh runtime: identity, home + files, launch profile, capability/discovery, catalog, strategy, session profile, projection, model-traffic, payloads, factory binding; registration points; contracts; web; Work Journal translation.
4. Docs and glossary.
5. Live gated E2E against the real API with the test vault (flash), covering AC-001…AC-015, and the key-absence scan (QR-001).

## Key Tradeoffs

- Proxy-observed compaction vs reading dsh's own log: the proxy is our code on a stable wire point; dsh's log is a private, compressed, versioned format.
- AutoByteus-owned dsh home vs the user's: required for the pass to win (stored key would outrank it) and for isolation; costs a second dsh profile tree on disk.
- Plugin vs persona field: the plugin is the only literal path; it is ~10 lines of JS written by the server.
- One process per run: isolation; memory cost unmeasured (RSK-004).

## Risks

- RSK-001/002 (dsh changes; compaction header): accepted, handled as bugs (DEC-003).
- RSK-003: a refused summary still rotates once.
- RSK-004: process memory per run — measure in validation.
- RSK-006: overlap with autobyteus-386 in the shared ACP layer — resolve at merge.
- Security: the model route forwards only `POST /anthropic/v1/messages` to `api.deepseek.com`, only for a live pass with the model route grant, only from loopback.

## Guidance For Implementation

- Reproduction to start from: `probes/live-run-home.sh` with `probes/owned-home.cordis.patch.yml`, `probes/dsh-plugin/autobyteus-agent-instructions.mjs` and `probes/vault-forwarder.mjs` (test vault); the product path must reproduce the same frames with the real proxy.
- Throttle activity observations (one per second per call) so the idle timer, not the event stream, absorbs chunk rates.
- Never log the pass, the base URL with port and path together with a pass, or any header value of a forwarded call.
- Live tests use flash (`deepseek-v4-flash`) and the test vault (TESTING.md, Test Vault).
