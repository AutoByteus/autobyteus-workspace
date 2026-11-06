# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revision of SR-002 after architecture review ARCH-REV-001, round 1: AR-001…AR-007)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` approved at SR-001, unchanged in intent; SR-003 adds two Solution Designer decisions within the direction (DEC-019, DEC-020), user informed. Approval by the Solution Designer within the direction (requirements doc, Document Status).
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/deepseek-dsh-runtime-investigation/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md` (2026-11-06); project `DESIGN.md` (root), `GLOSSARY.md` (`:153-172`, `:236-262`), `autobyteus-server-ts/docs/modules/credential_proxy.md`, `agent_memory.md` (Archive, Rotation), `grok_build_runtime.md`, `secret_management.md` (2026-11-05/06); `references/design-examples.md`: not used
- Project design-principle conflicts or discrepancies: None. `DESIGN.md` rule 9 concerns AutoByteus components; dsh is an external program whose changes the user handles as bugs (DEC-003).

## Current-State Read

The shared ACP backend carries Grok Build. `AcpAgentRunBackendFactory` prepares workspace, skills and Agent Tools, then `AcpSessionLauncher.open` spawns one agent process from a pure `AcpAgentLaunchProfile` (`args({model, reasoningEffort})`, `env(base)`), initialises ACP and opens a session with `session/new` (with the profile's `_meta`) or `session/load` (`acp-session-launcher.ts:76-130`, `acp-agent-capabilities.ts:44-49`). `open` has three callers: create and restore in the factory (`acp-agent-run-backend-factory.ts:110-114,127-130`) and the backend's reopen after an Agent Tools change (`acp-agent-run-backend.ts:191-205,219-232`, `mode: "load"`, no instructions). Ending what an `AcpPreparationOwner` holds has two copies: `AcpSessionLauncher.end` (`acp-session-launcher.ts:135-147`, used by reopen, `acp-agent-run-backend.ts:252-259`) and the factory's `releaseResources` (`acp-agent-run-backend-factory.ts:82-92`). `AcpAgentSession` owns the state machine, permissions, the 300 s idle timer and the effects of agent extension notifications (`acp-agent-session.ts:19,180-204,312-321`). Instructions reach the agent only at `session/new` (`acp-agent-run-backend-factory.ts:105-114,126`).

The credential proxy forwards integration calls only: a loopback listener on port 0, route `/r/<pass>/<integrationId>/<route>/…`, one pass per run in `RunPassRegistry` with integration grants (`issue` rebuilds the holder, `run-pass-registry.ts:25-34`), vault tokens per call, buffered and redacted text bodies, refusals as `{error, message}` (`credential-proxy-routes.ts`, `credential-proxy-forwarder.ts:46,91-94,154-162`). Passes are revoked at run release (`agent-run-resource-manager.ts:124`). Agent backends are built per composition by `createForExecution` with an explicit `integrationRunAccess` disposition (`agent-provider-factory-builder.ts:155-174`): the studio's general process passes the proxy host's access (`build-studio-server.ts:355`); the application execution scope (`application-execution-scope-kernel-builder.ts:110,135`) and the standalone host (`start-standalone-application-host.ts:264`) pass `null`. The studio builds its application platform runtime in the same process as its proxy host (`build-studio-server.ts:209,316`). `ModelCatalogService` and `RuntimeAvailabilityService` are process singletons without injected dependencies (`model-catalog-service.ts:68-77,363`; `runtime-availability-service.ts:109-154`); the application launch validator refuses a runtime whose availability is disabled with its reason (`application-launch-host-capability-validator.ts:76-86`).

dsh (0.2.2-rc.1) speaks ACP v1 with `session/resume`, not `session/load`; reports no per-call usage or compaction over ACP; its persona fields are templates that throw on unknown `{{…}}`; it resolves its key from `$DSH_HOME/.credentials.yaml` before the launch environment and its endpoint from `DEEPSEEK_BASE_URL`; it marks compaction requests with `x-deepseek-harness-compact: 1`; it reads a failure's text only from an object `error` in the response body (dsh `llm-deepseek/src/transport.ts:22-25`) (investigation notes RT-001…RT-022).

No current design issue blocks this change. The duplicated end sequence is folded into one owner as part of the change (AR-002).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: a new runtime owner (dsh launch/session profiles, home, discovery, availability strategy, Work Journal translation, tool projection); four seams in the shared ACP layer used by Grok plus one end owner; a provider-relay route family in the credential proxy with streaming and per-run observation; a new secret consumer; disposition wiring in three compositions; runtime-kind registration in about 25 places across server, three contract packages and web. About 16 new server files, ~35 modified files, plus tests.
- Architectural risk: `High`
- Risk rationale: security boundary (the vault key is forwarded by a new proxy route family); shared-contract changes (ACP launch and session profile contracts, effect types, runtime kind in stream contracts); concurrency and lifecycle (per-run, per-generation observation bound to a session; a child process per run); an external developer-preview dependency.
- Escalation trigger: any need to give dsh the key itself, to read dsh's private session files, or to change Grok's observable behavior returns to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| RT-001/002 | `evidence/p1-*, p2-*` | `resume` only; `configOptions` from `session/new`/`resume` | Restore by resume; config-option selection; options discovery | — |
| RT-007/008/018 | `evidence/p9-*, p10-*, p20-*` | Proxy with pass works; shells see `DEEPSEEK_BASE_URL` but not `DEEPSEEK_API_KEY`; an Anthropic error envelope shows its message in dsh ("turn failed: invalid run pass") | Provider relay; pass in `x-api-key`; refusal envelope | — |
| dsh source | `llm-deepseek/src/transport.ts:9-45`, `adapter.ts:155-166` | Message read only from object `error.message`; 401/403 or `authentication_error`/`permission_error` → `AUTH` (not retried); ≥500 → `SERVER` (retried) | Refusal envelope with status and type (AR-004) | — |
| RT-014/017/021 | `evidence/p16-*, p19-*, p21-*` | No ACP compaction; compaction header; stream usage fields | Proxy observation → effects | Header is code, not docs (RSK-002) |
| RT-016 | `evidence/p18-*` | 179 s silent while streaming | Activity effect | — |
| RT-018 | `probes/owned-home.cordis.patch.yml`, `probes/dsh-plugin/` | Owned home patch + plugin preserves `{{…}}`; `!!js process.env` works | dsh home owner; instructions plugin | — |
| RT-010…012 | `evidence/p12-*…p14-*` | Project-root discovery misses nested workspaces; `customSkillDirs` works; MCP naming | Skills via `customSkillDirs`; projection | — |
| Code | `acp-agent-run-backend.ts:34-53,191-259`; `acp-session-launcher.ts:76-147`; `acp-agent-run-backend-factory.ts:76-132` | Three `open` callers; two end copies | DS-004 forms; DS-008 end owner (AR-001/002) | — |
| Code | `agent-provider-factory-builder.ts:155-174`; `general-process-run-supervisor.ts:234-245`; `application-execution-scope-kernel-builder.ts:102-141`; `start-standalone-application-host.ts:264`; `build-studio-server.ts:209,316,355`; `model-catalog-service.ts:68-77,363` | Compositions and process singletons | Dispositions; process relay slot (AR-003) | — |
| Code | `GLOSSARY.md:236-262` | Model Routing / Model Router terms | "provider relay" vocabulary (AR-006) | — |

## Intended Change

Add DeepSeek Harness as an ACP runtime on the shared ACP backend. Its model calls go through a provider relay of the credential proxy, which adds the vault key, streams the reply unchanged and reports each call to the run's session. The session turns those reports into token usage, compaction boundaries and liveness. Extend the shared ACP layer with restore by `session/resume`, config-option selection, per-run launch facts (instructions on every launch, including reopen), model-traffic effects, and one owner for ending a run's agent process.

## Change Scope (Mandatory)

- In scope: UC-001…UC-008. Areas: `runtime-management/acp` (launch contract, capabilities, client connection, discovery), `agent-execution/backends/acp` (session, launcher incl. end, factory, backend reopen, profile contract), `agent-execution/backends/grok` and `runtime-management/grok` (contract adaptation only), new `agent-execution/backends/deepseek-harness`, new `runtime-management/deepseek-harness`, `credential-proxy` (provider relays, pass registry, forwarder auth, host, local server, process slot), `secret-management` (consumer), compositions (`agent-provider-factory-builder.ts`, `general-process-run-supervisor.ts`, `build-studio-server.ts`, `build-application-platform-runtime.ts`, application execution scope and kernel builder, standalone host), `AgentRunManager`, runtime registration points, `agent-work-journal` translation, contracts, web runtime maps, docs and glossary.
- Derived consumers: runtime kind union → GraphQL enum, stream contract schemas (`agent-org-execution-dtos.ts:17`, `team-execution-view-dtos.ts:24,166`), web maps — each adds the value. `RunPassHolder` (+ `providerRelayId`) → integration route handler (ignores it), relay handler (reads it), `DefaultIntegrationRunAccess` (keeps grants semantics; `issue`/`clearGrants` preserve the relay grant). `AcpSessionEffect` → Grok profile and tests renamed. `AcpPreparationOwner` (+ `launch`, `providerCalls`) → its end paths: `AcpSessionLauncher.end` (the one owner) and its two callers, the backend reopen and the factory release (which calls `end`, then skill cleanup). `AcpAgentLaunchProfile` → Grok launch profile, Grok capability (calls `normalizeGrokBuildModels` directly), `acp-discovery-handshake.ts`.
- Deliberately left alone: integration route behavior, refusal bodies and activity log; Grok's observable behavior; the native runtime's DeepSeek models; image prompt blocks; data-dir `.env` loading (FU-001); Antigravity (autobyteus-386).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, AC-001 | Run created with runtime `deepseek_harness` in the studio (agents, Teams, Orgs, applications) | Grok path | New runtime on the same path; refused before spawn without relay access (DEC-020) | DS-001 |
| BEH-002 | User | REQ-002/008, AC-001/002/008 | User message | Shared session | dsh tool projection | DS-002 |
| BEH-003 | User | REQ-003, AC-003 | Stop | `AcpAgentSession.cancel` | Unchanged mechanism | DS-002 |
| BEH-004 | System | REQ-004, AC-004 | Restore; reopen after an Agent Tools change | `mode: "load"` only | Restore method by capability; resume for dsh; reopen is the third restore form | DS-004 |
| BEH-005 | User | REQ-005, AC-005 | Model list / run start | Grok initialize discovery | Options discovery; config-option selection | DS-005, DS-001 |
| BEH-006 | System | REQ-006, AC-006 | Every launch (create, restore, reopen) | `_meta` at new only | Instructions file + plugin at every dsh launch | DS-001, DS-004 |
| BEH-007 | System | REQ-007, AC-007 | Run start | Workspace materializer | `.dsh/skills` + `customSkillDirs`, default roots off | DS-001 |
| BEH-009 | System | REQ-009, AC-009 | Run preparation; each model call | Integration proxy | Provider relay with pass in `x-api-key`; Anthropic error envelope | DS-001, DS-002 |
| BEH-010/011/012 | System | REQ-010/011/012, AC-010/011/012 | Each model call | Ext effects only | Provider-call effects | DS-003 |
| BEH-013 | User | REQ-013, AC-013 | Agent Runtimes page; application launch validation | Strategies, availability | dsh strategy; unavailable without relay access | DS-006 |
| BEH-014 | System | REQ-014, AC-014 | Journal render | Translation registry | dsh translation | — |
| BEH-015 | System | REQ-015, AC-015 | Every launch | — | Home patch rows | DS-001 |
| — | System | REQ-001/010/011 | Run release; reopen | Two end copies | One end owner, stated order | DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/owned-home.cordis.patch.yml` | Verified home patch | REQ-006/007/015 | Starting point for `deepseek-harness-home-files.ts` (with the `customSkillDirs` empty-list guard) | Evidence |
| `probes/dsh-plugin/autobyteus-agent-instructions.mjs` | Verified plugin | REQ-006 | Starting point for the plugin source | Evidence |
| `probes/vault-forwarder.mjs` | Verified key swap, streaming and SSE usage tap | REQ-009/010/011 | The relay must match it in key swap, streaming and usage reading only. The probe also removed two request fields; the relay never alters bodies (session-log upload is turned off by the home patch, DEC-004; the plugin inventory field stays, DEC-019) | Evidence |
| `probes/pass-forwarder.mjs` | Verified refusal text in dsh | REQ-009 | Its Anthropic error envelope is the relay's refusal shape | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No` (one duplicate in a touched file, folded in below)
- Structural triggers that fire:
  - Capability-area reuse (Principle 4): proxy forwarding, pass lifecycle, vault resolution, skill materialization, compaction-boundary recording, usage events, discovery short process → extended, not duplicated.
  - Several kinds or forms (Principle 1): the proxy serves two subjects (integration calls, runtime provider calls) → separate route family and grant field, shared forwarder. Restore has three forms (factory restore, backend reopen, and Grok's load vs dsh's resume) → one capability rule and one instructions source. Compositions are three kinds (studio general process, application scope, standalone host) → explicit disposition each.
  - Repeated coordination (Principle 13): ending an owner exists twice (`acp-session-launcher.ts:135-147`, `acp-agent-run-backend-factory.ts:82-92`) → one owner, `AcpSessionLauncher.end`.
  - Behavior by absence (Principle 13): "skip model access when absent" would fall back to dsh's own key resolution → explicit refusal rule (DEC-020).
  - Vocabulary drift (Principle 15): `AcpExtEffect` would carry non-extension effects → `AcpSessionEffect`; "model route" would read as Model Routing → "provider relay"; dsh's "provider route" → `DSH_PROVIDER_ROUTE` constant; glossary entries for credential proxy and run pass widened.
  - Split sequence (Principle 13): the launcher owns launch and end sequences; the session applies effects itself; the proxy only reports.
  - Derived data (Principle 11): `RunPassHolder`, `AcpPreparationOwner`, `AcpAgentLaunchProfile` consumers listed in Change Scope.
  - Ruled out: Responsibility overload — `acp-agent-session.ts` grows from 333 to ~400 lines; `acp-session-launcher.ts` from 148 to ~220; `credential-proxy-routes.ts` stays integration-only.
- Root cause classification: `No Design Issue Found` (the end duplicate is `Duplicated Policy Or Coordination` local to a touched file, removed here)
- Refactor needed now: `No` separate refactor; the end-owner consolidation is part of this change.
- Evidence: Current-State Read citations.
- Design response: extend owners as listed; one end owner.
- Refactor rationale: owners are healthy; the additions are seams they lacked.
- Intentional deferrals and residual risk: none.

## Terminology

- **Provider relay** (new glossary entry): the credential proxy's app-owned forwarding of one runtime's model-provider calls, granted by the runtime (DeepSeek Harness → DeepSeek's Messages API). Not Model Routing or the Model Router, and not an integration. Code: `ProviderRelay`, relay id `deepseek`, path `/relay/<relayId>/…`.
- **Credential proxy** (glossary entry widened): forwards an allowed run's calls to an integration, or a runtime's calls to its model provider through a provider relay, adding the credential.
- **Run pass** (glossary entry widened): one per run; in a run's proxy address for integrations (`/r/<pass>/…`), in the `x-api-key` header for a provider relay; carries the run's integration grants and its provider relay grant.
- **Provider call observation**: what a provider relay reports about one forwarded call (started, stream activity, finished with usage).
- **dsh home**: the AutoByteus-owned `DSH_HOME` for dsh runs.
- **dsh provider route**: dsh's own name for its model route (`deepseek-official`); held only as `DSH_PROVIDER_ROUTE` in the dsh identity file.

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: `AcpAgentLaunchProfile.args`/`env`/`normalizeModels` and `AcpLaunchSelection`; `AcpExtEffect`/`AcpExtNotificationContext` names; launcher mode `"load"` (factory restore and backend reopen); the factory's own end sequence in `releaseResources`.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: run metadata `runtimeKind`, raw-trace manifest `runtime_kind`, token-usage `runtime_kind`/`ingestion_kind`; new files under `<appData>/runtimes/deepseek-harness/`.
- Relevant change: new string values; new runtime-owned folder.
- Normal reader/writer behavior: `runtimeKindFromString` (`runtime-kind-enum.ts:17`); open unions (`agent-run-token-usage.ts:13-20`).
- Required semantics and invariants under direct use: existing values unchanged.
- Constraints: dsh home holds dsh's own session store and no key (DEC-007); per-run folders removed when the launch is released (DS-008); home files written atomically (temporary file, then rename).
- Decision: `Not Affected` for existing data (new values only).
- Rationale: no existing record changes meaning or shape.
- Supported AC: AC-016/017.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/005/006/007/009/015 | Run creation | Bound backend with open dsh session | `AcpSessionLauncher` (sequence), called by `AcpAgentRunBackendFactory` | Where every per-run fact reaches dsh |
| DS-002 | Primary End-to-End | BEH-002/003/009 | User message | Turn events published | `AcpAgentSession` | The turn, including model calls through the relay |
| DS-003 | Return-Event | BEH-010/011/012 | Relay forwards a provider call | Usage / compaction / liveness applied | `AcpAgentSession` (applies); relay reports | Replaces the missing ACP signals |
| DS-004 | Primary End-to-End | BEH-004/006 | Restore (factory) or reopen (backend) | Resumed or loaded session | `AcpSessionLauncher` | Three restore forms |
| DS-005 | Primary End-to-End | BEH-005 | Model list request | `ModelInfo[]` | `DeepSeekHarnessModelCatalog` | dsh models |
| DS-006 | Primary End-to-End | BEH-013 | Agent Runtimes page / launch validation | Status / availability | dsh strategy and availability provider | Readiness |
| DS-007 | Bounded Local | BEH-002/004/012 | Session event | State transition / idle timer | `AcpAgentSession` | `opening_resume`; activity refresh |
| DS-008 | Bounded Local | REQ-001/010/011 | Reopen or run release | Owner empty | `AcpSessionLauncher.end` | One end order |

## Primary Execution Spine(s)

- DS-001: `Run config → AgentRunManager → AcpAgentRunBackendFactory.createBackend (prepare: workspace, WorkspaceSkillMaterializer → <ws>/.dsh/skills, Agent Tools MCP; composes instructions) → AcpSessionLauncher.open(new, instructions) → ProviderRelayAccess.prepareForRun (pass + relay grant; vault key configured) → DeepSeekHarnessLaunchProfile.runLaunch (DeepSeekHarnessHome.ensure; run instructions file) → AcpAgentProcess.spawn(dsh --profile acp) → initialize → session/new → AcpAgentSession.applyConfigSelection (model, reasoning_effort) → ProviderRelayAccess.observe(runId, session listener) → AcpAgentRunBackend (holds the instructions for reopen)`
- DS-002: `User message → AcpAgentRunBackend.dispatchUserInput → AcpAgentSession.startTurn → dsh → ProviderRelayRoute (/relay/deepseek/…, pass in x-api-key) → CredentialProxyForwarder (x-api-key = vault key, body and reply streamed unchanged) → api.deepseek.com → SSE → dsh → session/update → AcpSessionUpdateConverter (dsh tool projection) → AcpAgentRunBackend.publish`
- DS-004, three forms, one launcher path `AcpSessionLauncher.open(restore, instructions) → prepareForRun → runLaunch → spawn → initialize → capabilities.restoreMethod() (load preferred, else resume) → AcpAgentSession.openLoad | openResume → applyConfigSelection → observe`:
  - Factory restore: `AcpAgentRunBackendFactory.restoreBackend` composes the instructions from the current definition (as at creation) and hands them to the launcher and to the backend.
  - Backend reopen (Agent Tools change, retried failed reopen): `AcpAgentRunBackend.reopenWithCurrentTools → AcpSessionLauncher.end(owner) → AcpSessionLauncher.open(restore, the backend's instructions)`. The reopen re-sends the instructions the backend was built with; it does not recompose (the run's definition change that triggers a reopen is its tool list).
  - Grok: same path; `restoreMethod()` is `load`; its launch ignores the instructions (it keeps them in its session).
- DS-005: `ModelCatalogService → DeepSeekHarnessModelCatalog → discoverDeepSeekHarnessModels → (process relay access absent → "unavailable" diagnostic) → runAcpSessionOptionsDiscovery(discoveryLaunch, <dsh home>/discovery) → initialize → session/list(cwd) → session/resume (newest) or session/new → configOptions → session/close → normalizeDeepSeekHarnessModels`
- DS-006: `Agent Runtimes page / application launch validator → RuntimeAvailabilityService (dsh provider: process relay access present and dsh --version works) / AgentRuntimeStatusService → DeepSeekHarnessAgentRuntimeStrategy (dsh --version; npm view @deepseek-ai/dsh version; vault status for provider.deepseek.api-key)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Creation prepares workspace facts and composes the instructions; the launcher asks the proxy for the run's relay access (refusing the launch if the composition has none), asks the dsh profile for the launch (home ensured, instructions file written), spawns dsh, opens the session, applies model and effort, and binds this generation's observer to the session; the backend keeps the instructions for a later reopen | run, launch, session, run pass | `AcpSessionLauncher` | dsh home files, skill materialization |
| DS-002 | A message starts a turn; dsh calls DeepSeek through the relay, which checks the pass, adds the key and streams back unchanged; dsh's updates become AutoByteus events | turn, provider call | `AcpAgentSession` | tool projection |
| DS-003 | For each forwarded call the relay reports start (purpose from the compaction header), throttled stream activity, and finish with DeepSeek's usage, synchronously at upstream end; the session hands each report to its profile, which returns effects; the session applies them | provider call observation, effect | `AcpAgentSession` (applies), dsh session profile (interprets) | SSE usage reading |
| DS-004 | Restore and reopen use the same launcher path with the stored session id and the run's instructions; the launcher picks resume because dsh advertises no `loadSession` | session | `AcpSessionLauncher` | — |
| DS-005 | A short dsh process lists the one discovery session, resumes or creates it, reads its options and closes it | model option | `DeepSeekHarnessModelCatalog` | normalisation |
| DS-006 | Availability needs the relay in this process and a working `dsh`; the page reads version, latest version and key state | runtime status | availability service, status service | — |
| DS-008 | Ending a generation removes its observer, closes the session, stops the process and releases the launch (run folder), then clears the handles | owner | `AcpSessionLauncher.end` | — |

## Spine Actors / Main-Line Nodes

`AgentRunManager`, `AcpAgentRunBackendFactory`, `AcpSessionLauncher`, `ProviderRelayAccess`, `DeepSeekHarnessLaunchProfile`, `AcpAgentProcess`/`AcpClientConnection`, `AcpAgentSession`, `ProviderRelayRoute`, `CredentialProxyForwarder`, `AcpAgentRunBackend`, `DeepSeekHarnessModelCatalog`, `DeepSeekHarnessAgentRuntimeStrategy`.

## Ownership Map

- `AcpSessionLauncher` (extended): the launch sequence (relay access when the launch profile names a relay, launch, spawn, initialize, open new or restore by capability, config selection, observer subscription) and the end sequence (DS-008). Records every handle on the owner as soon as it exists: `launch` (for `release()`), `providerCalls` (the unsubscribe), process, connection, session.
- `AcpAgentRunBackend` (extended): holds the run's instructions (`instructions: string`, input) and passes them on reopen.
- `AcpAgentSession` (extended): `opening_resume`, `applyConfigSelection`, `onProviderCall`; owns ordinals, turn gating and the idle timer for all effects.
- `AcpAgentSessionProfile` (contract extended): pure hooks `configSelection`, optional `interpretProviderCall`.
- `AcpAgentLaunchProfile` (contract changed): `agentLabel`, `command()`, `providerRelayId: string | null`, `runLaunch(request)`, `discoveryLaunch(request)`.
- `ProviderRelayAccess` (new, credential proxy): grants the relay on the run's pass, checks the vault key is configured, gives the relay's base URL, registers and removes per-generation observers. The public boundary for backends and dsh discovery.
- `ProviderRelayRoute` (new, internal to the proxy): the `/relay/<relayId>/…` handler.
- `RunPassRegistry` (extended): one pass per run holding integration grants and an optional relay grant; `issue` and `clearGrants` keep the relay grant.
- Process relay slot (new, credential proxy): the process's `ProviderRelayAccess` or none, set by the composition that owns the proxy host; read by the dsh catalog and availability provider.
- `DeepSeekHarnessHome` (new): the AutoByteus-owned dsh home and per-run folders; writes the home files atomically when their content differs.
- `DeepSeekHarnessLaunchProfile` (new): dsh command, args and environment for run and discovery launches.
- `deepSeekHarnessSessionProfile` (new): no `_meta`, HTTP Agent Tools MCP, no readiness wait (dsh connects MCP during `session/new`, RT-012), tool projection, config selection, provider-call interpretation, compaction payload.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `createDeepSeekHarnessAgentRunBackendFactory` | `AcpAgentRunBackendFactory` | Binds dsh profiles and deps (as Grok's) | Any sequencing |
| `CredentialProxyHost.providerRelayAccess` | `ProviderRelayAccess` | Composition entry | Route policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `AcpAgentLaunchProfile.args`, `.env`, `AcpLaunchSelection` | Run and discovery launches need different facts | `runLaunch(AcpRunLaunchRequest)`, `discoveryLaunch(AcpDiscoveryLaunchRequest)` | Grok profile and `acp-discovery-handshake.ts` migrate |
| `AcpAgentLaunchProfile.normalizeModels` | Dead on the shared contract: only `grok-build-capability.ts:119` calls it, through the profile | `normalizeGrokBuildModels` called directly; dsh normalisation in `deepseek-harness-capability.ts` | AR-005 |
| `AcpExtEffect`, `AcpExtNotificationContext` names | Effects also come from provider calls | `AcpSessionEffect`, `AcpSessionEffectContext` | Rename in all users |
| Launcher mode `"load"` in the factory restore (`acp-agent-run-backend-factory.ts:127-130`) and the backend reopen (`acp-agent-run-backend.ts:226-232`); `AcpAgentCapabilities.requiredFor({restore})` → `loadSession` | Restore has two methods | Mode `"restore"`; `restoreMethod()`; `requiredFor({restore})` satisfied by load or resume | AR-001 |
| The factory's own end sequence in `releaseResources` (`acp-agent-run-backend-factory.ts:84-88`) | Duplicate of `AcpSessionLauncher.end` | `releaseResources` calls `AcpSessionLauncher.end(owner)`, then skill cleanup | AR-002 |
| Factory comment "not re-sent on load" (`acp-agent-run-backend-factory.ts:126`) | Instructions go to every launch | — | — |

## Return Or Event Spine(s) (If Applicable)

DS-003: `ProviderRelayRoute (started / throttled activity / finished at upstream end, synchronously) → ProviderCallObservers(runId) → this generation's listener (bound by AcpSessionLauncher) → AcpAgentSession.onProviderCall → profile.interpretProviderCall(observation, context) → AcpAgentSession.applyEffects → converter.usage / converter.compaction / refreshIdleTimer → AcpAgentRunBackend.publish → (COMPACTION_STATUS) ProviderCompactionBoundaryRecorder`.

## Bounded Local / Internal Spines (If Applicable)

- DS-007 `AcpAgentSession`: `created → opening_new | opening_load | opening_resume → ready → prompting ⇄ cancelling → ready`, any → `failed`/`closed`. Provider-call effects apply only `isInTurn()`; activity refreshes the idle timer only in a turn.
- DS-008 `AcpSessionLauncher.end(owner)`, parent owner the launcher, called by the backend reopen (`endSessionAsReopen`), the factory release (`releaseResources`, then skill cleanup) and open failures: `providerCalls() (unsubscribe this generation's listener) → session.close() → connection.close() (or process.stop()) → launch.release() (removes runs/<runId>) → clear handles`. Each step runs even if an earlier one failed; errors are aggregated as today. The observer is removed first so no call of the ending process reaches a closed session; the run folder is removed last, after the process that reads it has stopped.
- Relay stream tap (inside `ProviderRelayRoute`): `upstream chunk → reader.push(chunk) → activity (at most one report per second per call) → upstream end → finished(usage) delivered synchronously`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `AnthropicMessagesStreamReader` | DS-003 | `ProviderRelayRoute` | Read usage and stop reason from Messages SSE without changing bytes | Usage source | Protocol parsing inside the route handler |
| `ProviderCallObservers` | DS-003 | `ProviderRelayAccess` | Per-run, per-generation listener registry | Route → session delivery | Session reaching into the proxy |
| Relay refusal envelope | DS-002 | `ProviderRelayRoute` | Anthropic Messages error bodies | dsh shows only that shape | Integration `{error, message}` shape reused |
| `DeepSeekHarnessHome` | DS-001/005 | dsh launch profile | Files on disk | Composition | Launcher writing runtime files |
| `deepseek-harness-home-files.ts` | DS-001 | `DeepSeekHarnessHome` | Patch and plugin text | One place for dsh composition | Scattered literals |
| dsh tool projection | DS-002 | session profile | Tool name → AutoByteus tool | Cards | Converter knowing dsh |
| dsh call usage / compaction payload builders | DS-003 | session profile | Payloads | Same shapes as Grok | — |
| dsh Work Journal translation | — | translation registry | Journal lines | REQ-014 | — |

## Ownership Boundaries

- Backends and dsh discovery depend on `ProviderRelayAccess` only (never on `RunPassRegistry`, the forwarder or observers).
- The proxy reports observations; it never builds AutoByteus events or knows sessions.
- The dsh profile owns everything dsh-specific; the shared ACP layer knows no dsh name.
- The secret value is revealed only inside `CredentialProxyForwarder` when the upstream header is set.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ProviderRelayAccess` | `RunPassRegistry`, `ProviderCallObservers`, vault status check | `AcpSessionLauncher`, dsh discovery and availability (through the process slot) | Launcher or catalog reading the pass registry | Extend `ProviderRelayAccess` |
| `CredentialProxyHost` | listener, routes, forwarder | studio composition | — | — |
| `AcpSessionLauncher` | process, connection, session open and end | factory (create, restore, release), backend (reopen) | Factory or backend closing the owner's handles directly | — |
| `AcpAgentSession` | converter, bridge, timers, effects | launcher, backend | Observer calling the converter | — |

## Dependency Rules

- `agent-execution/backends/*` → `credential-proxy` (`ProviderRelayAccess`, `IntegrationRunAccess`, observation type) — allowed (exists for integrations).
- `credential-proxy` → `agent-execution` — forbidden.
- `runtime-management/deepseek-harness` and `llm-management` → `credential-proxy` process slot and `ProviderRelayAccess` — allowed; → `agent-execution` — forbidden.
- Shared ACP files → no import from `grok` or `deepseek-harness` folders.
- Compositions: the disposition passed to `createForExecution` and the process slot are set from the same `ProviderRelayAccess` by the composition that owns the proxy host; no other code sets the slot.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ProviderRelayAccess.prepareForRun({runId, agentDefinitionId}, relayId)` → `{ baseUrl, apiKey }` | a run's relay access | Grant the relay on the run's pass; refuse when the vault key is not configured (`ProviderRelayKeyMissingError`, message names Settings → API Keys) | run identity + relay id | `apiKey` is the pass |
| `ProviderRelayAccess.relayBaseUrl(relayId)` | a relay's address | Base URL without pass (discovery) | relay id | — |
| `ProviderRelayAccess.observe(runId, listener)` → unsubscribe | one generation's provider calls | Deliver observations to this listener; the returned function removes exactly this listener and nothing registered later | run id + listener identity | A reopen's new listener survives the old generation's late unsubscribe |
| `POST /relay/<relayId>/<path>` (`x-api-key: <pass>`) | one provider call | Forward with the vault key, body and reply unchanged | pass + relay id | Refusals below |
| Relay refusal body | refusal | `{"type":"error","error":{"type":<type>,"code":<code>,"message":<text>}}` | — | `NOT_LOOPBACK` 403 `permission_error`; `RUN_PASS_INVALID` 401 `authentication_error`; `RELAY_NOT_ALLOWED` 403 `permission_error`; `PATH_NOT_ALLOWED` 404 `not_found_error`; `RELAY_KEY_NOT_SET` 403 `permission_error` ("The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys."); `UPSTREAM_UNREACHABLE` 502 `api_error` |
| `AcpAgentLaunchProfile.runLaunch(AcpRunLaunchRequest)` → `AcpLaunch {args, env, release()}` | one run process launch | Args, env, release | `{runId, workingDirectory, instructions, model, reasoningEffort, relayAccess: {baseUrl, apiKey} \| null}` | Grok ignores `instructions`/`relayAccess` |
| `AcpAgentLaunchProfile.discoveryLaunch({relayBaseUrl \| null})` → `AcpLaunch` | discovery process | Args, env | — | Grok ignores the argument |
| `AcpSessionOpenRequest` | an open | `mode: "new" \| "restore"`, `instructions` (both modes) | — | Backend reopen passes its held `instructions` |
| `AcpAgentSessionProfile.configSelection(selection, configOptions)` | session options | `[{configId, value}]` | `{model, reasoningEffort}` | Grok `[]` |
| `AcpAgentSessionProfile.interpretProviderCall?(observation, context)` | effects | Pure | observation + `AcpSessionEffectContext` | Grok absent |
| `AcpClientConnection.resumeSession`, `.setSessionConfigOption`, `.listSessions`, `.closeSession` | ACP methods | Standard calls with timeouts | ACP params | `listSessions`/`closeSession` for discovery |
| `createForExecution({ …, integrationRunAccess, providerRelayAccess })` | per-composition backends | Explicit disposition, required like `integrationRunAccess` | `ProviderRelayAccess \| null` | AR-003 |
| `SecretConsumerIdentity {kind: "agentRuntime", runtimeKind: "deepseek_harness", credentialSlot: "apiKey"}` | vault binding | → `provider.deepseek.api-key` | — | `provider-credential-catalog.ts` |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `prepareForRun` | Yes | Yes | Low | — |
| `/relay/<relayId>` vs `/r/<pass>/<integrationId>` | Yes | Yes | Low | Separate families by subject |
| `runLaunch` / `discoveryLaunch` | Yes | Yes | Low | Split by launch kind |
| `observe` | Yes | Yes (run + listener) | Low | Identity-scoped unsubscribe |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Runtime kind | `deepseek_harness` / "DeepSeek Harness" | Yes | Yes | Low | — |
| Effect | `AcpSessionEffect` (was `AcpExtEffect`) | Yes | Yes | Low | Rename |
| Relay | provider relay (`ProviderRelay`, `/relay/…`) | Yes | Glossary entry added; distinct from Model Routing | Low | Glossary entry names the distinction |
| dsh's route | `DSH_PROVIDER_ROUTE` (`deepseek-official`) | Yes | dsh-only | Low | Kept in the dsh identity file |
| Pass | run pass | Yes | Glossary widened | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Forward with credential | `CredentialProxyForwarder` | Extend | Add `x-api-key` auth, drop the caller's `x-api-key`; relay sets `redactsTextBodies: false`, `buffersRequestBody: false` (already streams, `:158-162`) | — |
| Pass lifecycle | `RunPassRegistry`, release at `agent-run-resource-manager.ts:124` | Extend | One pass per run (glossary) | — |
| Key | vault consumer catalog | Extend | Claude precedent | — |
| Skills | `WorkspaceSkillMaterializer` | Reuse | Folder `.dsh/skills` | — |
| Compaction rotation | `ProviderCompactionBoundaryRecorder` via `COMPACTION_STATUS` | Reuse | Same payload shape | — |
| Usage events | `converter.usage` | Reuse | Same payload shape | — |
| Discovery process | `withShortAcpProcess` | Extend | Options discovery | — |
| Owner end | `AcpSessionLauncher.end` | Extend | One owner (AR-002) | — |
| Observation delivery | — | Create New (`ProviderCallObservers`) | No push channel from the proxy exists | Integrations have no observers |
| Process access for singletons | — | Create New (process relay slot) | `ModelCatalogService`/availability are process singletons without DI | Threading DI into the singletons is a broader refactor; a slot set by the one composition is enough |
| dsh home | — | Create New | Runtime-owned files | No runtime home owner exists |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy` | provider relays, pass grant, observation, forwarding, process slot | DS-001/002/003/005/006 | launcher, session, dsh catalog | Extend | new `provider-relays/` folder |
| `runtime-management/acp` | launch contract, capabilities, connection, discovery | DS-001/004/005 | launcher | Extend | — |
| `agent-execution/backends/acp` | session, launcher, factory, backend reopen, profile contract | DS-001…DS-004, DS-008 | — | Extend | — |
| `runtime-management/deepseek-harness` | launch profile, home, capability/discovery | DS-001/005/006 | — | Create New | Mirrors `grok/` |
| `agent-execution/backends/deepseek-harness` | session profile, projection, payloads, factory binding | DS-002/003 | — | Create New | Mirrors `backends/grok/` |
| `secret-management` | consumer | DS-001/002 | relay | Extend | — |
| compositions | dispositions, process slot | DS-001/005/006 | — | Extend | studio, application platform runtime/scope, standalone host |
| registration points, contracts, web, journal | runtime kind | all | — | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (extraction changed the draft only by the shared dsh identity file).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Provider call observation type | `credential-proxy/provider-relays/provider-call-observation.ts` | credential proxy | Relay produces, dsh profile consumes | Yes | Yes | An AutoByteus event type |
| dsh identity constants (runtime kind, label, `DSH_PROVIDER_ROUTE`, relay id `deepseek`) | `runtime-management/deepseek-harness/deepseek-harness-identity.ts` | dsh runtime | Used by launch profile, catalog, strategy, session profile | Yes | Yes | A config bag |
| Usage payload builder | Grok and dsh builders stay separate | — | Different ingestion kinds and sources | — | — | A generic multi-runtime builder with flags |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `RunPassHolder` (+ `providerRelayId: string \| null`) | Yes | Yes | Low | `issue`/`clearGrants` keep the field |
| `ProviderCallObservation` (`started {callId, purpose}`, `activity {callId}`, `finished {callId, purpose, httpStatus, usage \| null, stopReason \| null}`) | Yes | Yes | Low | — |
| `AcpSessionEffect` (+ `{kind: "activity"}`) | Yes | Yes | Low | — |
| `AcpRunLaunchRequest` | Yes | Yes | Low | `relayAccess` null when the profile names no relay |
| `AcpPreparationOwner` (+ `launch: AcpLaunch \| null`, `providerCalls: (() => void) \| null`) | Yes | Yes | Low | Ended only by `AcpSessionLauncher.end` |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/provider-relays/provider-relays.ts` | proxy | definitions | `deepseek` → origin `https://api.deepseek.com`, basePath `/anthropic`, allows `POST /anthropic/v1/messages`, auth `x-api-key`, no buffering/redaction, consumer `agentRuntime/deepseek_harness/apiKey`, purpose header `x-deepseek-harness-compact`, stream reader `anthropic-messages` | One table | `DeliveryRoute` |
| `credential-proxy/provider-relays/provider-relay-proxy-routes.ts` | proxy | `ProviderRelayRoute` | `/relay/<relayId>/…`: loopback gate, pass from `x-api-key`, relay grant, path/method, key, forward, tap → observers, refusal envelope; never alters bodies; logs no pass or header value | One route family | forwarder |
| `credential-proxy/provider-relays/anthropic-messages-stream-reader.ts` | proxy | off-spine | SSE usage/stop reading | One protocol | — |
| `credential-proxy/provider-relays/provider-call-observation.ts` | proxy | type | Observation union | Shared type | — |
| `credential-proxy/provider-relays/provider-relay-access.ts` | proxy | `ProviderRelayAccess` | Interface + default impl + `ProviderCallObservers` | Boundary and its registry | `RunPassRegistry` |
| `credential-proxy/provider-relays/provider-relay-process-access.ts` | proxy | process slot | `setProcessProviderRelayAccess(access)` (composition only), `getProcessProviderRelayAccess()` | One process fact | — |
| `credential-proxy/run-pass-registry.ts` | proxy | modify | `providerRelayId`; `grantProviderRelay`; `issue`/`clearGrants` keep it | — | — |
| `credential-proxy/credential-proxy-forwarder.ts`, `delivery-definitions.ts` | proxy | modify | `x-api-key` auth kind; drop caller `x-api-key` | — | — |
| `credential-proxy/credential-proxy-local-server.ts`, `credential-proxy-host.ts` | proxy | modify | Register relay routes; expose `providerRelayAccess` | — | — |
| `secret-management/domain/secret-id.ts`, `catalog/provider-credential-catalog.ts` | secrets | modify | dsh consumer | — | — |
| `runtime-management/acp/acp-agent-launch-profile.ts` | ACP | modify | New contract (no `normalizeModels`) | — | — |
| `runtime-management/acp/acp-agent-capabilities.ts` | ACP | modify | `restoreMethod()`; `requiredFor({restore, mcp})` | — | — |
| `runtime-management/acp/acp-client-connection.ts` | ACP | modify | `resumeSession`, `setSessionConfigOption`, `listSessions`, `closeSession` | — | — |
| `runtime-management/acp/acp-discovery-handshake.ts` | ACP | modify | `discoveryLaunch()`; `runAcpSessionOptionsDiscovery(profile, {cwd, relayBaseUrl}, options)` | — | — |
| `agent-execution/backends/acp/acp-agent-session-profile.ts` | ACP | modify | Renames; `activity`; `configSelection`; `interpretProviderCall?` | — | observation type |
| `agent-execution/backends/acp/session/acp-agent-session.ts` | ACP | modify | `openResume`, `applyConfigSelection`, `onProviderCall`, `applyEffects` (extracted) | — | — |
| `agent-execution/backends/acp/session/acp-session-launcher.ts` | ACP | modify | DS-001/004 sequence with the refusal rule; DS-008 `end` with stated order; `providerRelayAccess` dep | — | — |
| `agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | ACP | modify | Compose instructions for create and restore, hand them to launcher and backend; `releaseResources` → `AcpSessionLauncher.end` then skill cleanup | — | — |
| `agent-execution/backends/acp/backend/acp-agent-run-backend.ts` | ACP | modify | Input `instructions`; reopen with `mode: "restore"` and `instructions` | — | — |
| `agent-execution/backends/grok/*`, `runtime-management/grok/*` | Grok | modify | Contract adaptation: `runLaunch`/`discoveryLaunch` with today's args/env, `providerRelayId: null`, `configSelection: []`, renamed types; capability calls `normalizeGrokBuildModels` directly; no behavior change | — | — |
| `agent-execution/providers/agent-provider-factory-builder.ts` | composition | modify | Required `providerRelayAccess` disposition; dsh factory | — | — |
| `agent-execution/services/agent-run-manager.ts` | composition | modify | `deepSeekHarnessBackendFactory` field and selection | — | — |
| `…/general-process-run-supervisor.ts`, `compositions/build-studio-server.ts` | composition | modify | Studio: `providerRelayAccess = credentialProxyHost.providerRelayAccess`; set the process slot once the host is created | — | — |
| `application-platform/runtime/build-application-platform-runtime.ts`, `application-platform/execution/application-execution-scope.ts`, `…-kernel-builder.ts` | composition | modify | Thread `providerRelayAccess` (studio: the host's; standalone: `null`) into `createForExecution` | — | — |
| `standalone-application-host/start-standalone-application-host.ts` | composition | modify | `providerRelayAccess: null`; slot not set | — | — |
| `runtime-management/deepseek-harness/deepseek-harness-identity.ts` | dsh | constants | IDs and labels | Shared constants | — |
| `runtime-management/deepseek-harness/deepseek-harness-home.ts` | dsh | `DeepSeekHarnessHome` | `<appData>/runtimes/deepseek-harness/{home,runs/<runId>,discovery}`; atomic `ensure()`; run folder create/remove | One owner of the files | — |
| `runtime-management/deepseek-harness/deepseek-harness-home-files.ts` | dsh | content | Home patch YAML and plugin source (from `probes/`) | One composition | — |
| `runtime-management/deepseek-harness/deepseek-harness-launch-profile.ts` | dsh | launch profile | `command()` (`DEEPSEEK_HARNESS_COMMAND` or `dsh`), `providerRelayId: "deepseek"`, run/discovery launches | — | identity |
| `runtime-management/deepseek-harness/deepseek-harness-capability.ts` | dsh | probe + discovery | `probeDeepSeekHarnessCli`, `discoverDeepSeekHarnessModels`, `normalizeDeepSeekHarnessModels`, diagnostics (`DEEPSEEK_HARNESS_RELAY_UNAVAILABLE`, `…_CLI_UNAVAILABLE`, `…_DISCOVERY_FAILED`, `…_CATALOG_INVALID`) | As Grok's | — |
| `runtime-management/runtime-availability-service.ts` | availability | modify | dsh provider: unavailable with reason "DeepSeek Harness needs the AutoByteus credential proxy, which this host does not run." when the process slot is empty; else the CLI probe | — | — |
| `runtime-management/agent-runtimes/strategies/deepseek-harness-agent-runtime-strategy.ts` | runtimes | strategy | Version, latest (`npm view @deepseek-ai/dsh version`), sign-in from vault status, usage limits not reported, update `npm install -g @deepseek-ai/dsh@latest`, install URL `https://github.com/deepseek-ai/deepseek-harness` | — | — |
| `llm-management/services/deepseek-harness-model-catalog.ts` | catalog | catalog | As `grok-build-model-catalog.ts`; reads the process slot | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-session-profile.ts` | dsh | session profile | Hooks | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-tool-projection.ts` | dsh | projection | `bash` → `run_bash` (exit code from `[exit code: N]`), `write` → `write_file`, `edit`/`apply_patch` → `edit_file`, `mcp__<server>__<tool>` → canonical Agent Tools name via `normalizeAgentToolsMcpToolNameForEvent` + `projectMcpToolResultForApplication` (provider `deepseek_harness`), others by name | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-provider-calls.ts` | dsh | interpretation | Observation → effects: compaction `started`/`completed`/`failed`, usage per finished call, activity | — | payload builders |
| `agent-execution/backends/deepseek-harness/deepseek-harness-call-usage.ts`, `…-compaction-status-payload.ts` | dsh | payloads | Usage (`ingestion_kind` `deepseek_harness_call` / `deepseek_harness_compaction_call`, `model_provider` `DEEPSEEK`); compaction payload as Grok's with `provider: "deepseek_harness"`, `source_surface: "deepseek_harness.relay_compaction_<phase>"` | — | — |
| `agent-execution/backends/deepseek-harness/deepseek-harness-agent-run-backend-factory.ts` | dsh | facade | Binding | — | — |
| `agent-work-journal/rendering/runtimes/deepseek-harness-translation.ts` | journal | translation | `bash`, `read`, `write`, `edit`, `apply_patch`, `glob`, `grep`, `web_fetch`, `web_search` | — | journal helpers |
| Registration files (investigation notes list), `GLOSSARY.md`, docs (`docs/modules/deepseek_harness_runtime.md` new; `credential_proxy.md`, `agent_runtimes.md`, `secret_management.md` updated) | various | modify | One entry each | — | — |
| web: runtime maps, `agentRuntimesPresentation.ts`/`AgentRuntimeRow.vue` (route `API_KEY_SETTING` hint), localization | web | modify | Runtime entry and key hint | — | — |

## Applied Patterns (If Any)

- Strategy: launch/session profiles per ACP agent (existing).
- Registry: `ProviderCallObservers`.
- Adapter: `AnthropicMessagesStreamReader`.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/credential-proxy/provider-relays/` | Folder | proxy | Provider relays | Second subject of the proxy, separate from integrations | Integration logic, AutoByteus events |
| `autobyteus-server-ts/src/runtime-management/deepseek-harness/` | Folder | dsh runtime | Process, home, discovery | Mirrors `runtime-management/grok/` | Session/event logic |
| `autobyteus-server-ts/src/agent-execution/backends/deepseek-harness/` | Folder | dsh backend | Session profile and payloads | Mirrors `backends/grok/` | Process spawning |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `credential-proxy/provider-relays/` | Off-Spine Concern | Yes | Low | — |
| `runtime-management/deepseek-harness/` | Persistence-Provider | Yes | Low | — |
| `agent-execution/backends/deepseek-harness/` | Main-Line Domain-Control | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| dsh run environment | `DSH_HOME=<appData>/runtimes/deepseek-harness/home`, `DEEPSEEK_API_KEY=<run pass>`, `DEEPSEEK_BASE_URL=http://127.0.0.1:<proxy>/relay/deepseek`, `AUTOBYTEUS_DSH_INSTRUCTIONS_FILE=<appData>/…/runs/<runId>/instructions.md`, `AUTOBYTEUS_DSH_SKILLS_DIR=<workingDirectory>/.dsh/skills`; other inherited variables as for Grok; `DSH_PERMISSION_MODE` removed | Real key in `DEEPSEEK_API_KEY`; pass in the URL; the user's `~/.dsh` | QR-001, DEC-007/012 |
| No relay access | `AcpSessionLauncher.open` with a profile whose `providerRelayId` is set and `providerRelayAccess === null` throws `AgentCreationError("PROVIDER_RELAY_UNAVAILABLE: DeepSeek Harness needs the AutoByteus credential proxy, which this host does not run.")` before spawning | Skipping the access step and launching dsh with the inherited environment | dsh would resolve a key outside the vault (P-001, DEC-020) |
| Base URL and request path | dsh appends `/v1/messages` to its base URL (RT-008; dsh `messages-api.ts:14-17`). Base `http://127.0.0.1:<proxy>/relay/deepseek` → request `/relay/deepseek/v1/messages` → caller path `/v1/messages` → basePath `/anthropic` → upstream `https://api.deepseek.com/anthropic/v1/messages`, checked by `allows(POST, /anthropic/v1/messages)` (`credential-proxy-forwarder.ts:83-89`) | Base URL containing `/anthropic` and a basePath adding it again | A path mistake sends calls to the wrong path or is refused |
| Refusal seen by the user | Vault key removed during a run → relay answers 403 `{"type":"error","error":{"type":"permission_error","code":"RELAY_KEY_NOT_SET","message":"The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys."}}` → dsh fails the turn with that message (code `AUTH`, not retried) | `{error, message}` (dsh shows "DeepSeek Messages request failed (403)") | AR-004 |
| Home patch (verified, RT-018) | rows: `system-prompt.personaPrefix: ''`; insert `autobyteus-agent-instructions` (plugin file beside the patch, `instructionsFile: !!js process.env.AUTOBYTEUS_DSH_INSTRUCTIONS_FILE`, the plugin adds nothing when unset); `skill-filesystem {includeDefaultRoots: false, customSkillDirs: !!js "process.env.AUTOBYTEUS_DSH_SKILLS_DIR ? [process.env.AUTOBYTEUS_DSH_SKILLS_DIR] : []"}`; `session-log-deepseek.enabled: false`; disable dsh's subagent, subagent-fork, subagent-control, workflow, team, goal, plugin-manager and ask-user rows (exact ids confirmed with `dsh --profile acp --dump-config`) | Persona template with the AutoByteus prompt; `[undefined]` skill roots in discovery | Discovery launches set neither variable |
| Reopen | Agent Tools change → next turn start → `endSessionAsReopen` (`AcpSessionLauncher.end`: unsubscribe gen 1 → close → stop → release gen 1 folder) → `open({mode: "restore", instructions: this.input.instructions, sessionId})` → gen 2 folder written, listener gen 2 | Reopen without instructions; unsubscribe keyed by run id removing gen 2 | AR-001/002 |
| Provider-call effects | `started{compaction}` → compaction started; `finished{compaction, 200}` → completed (rotation); `finished{compaction, non-200}` → failed; `finished{turn}` → usage; `activity` → idle refresh | Inferring compaction from `usage_update.used` | RT-014 shows `used` can rise |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `args`/`env`/`normalizeModels` beside the new contract | Fewer Grok edits | Rejected | Grok migrates in this change |
| Alias `AcpExtEffect` | Fewer edits | Rejected | Rename |
| Keep the factory's end copy | Fewer edits | Rejected | One end owner |
| dsh version gate / feature probes | dsh churn | N/A (DEC-003) | — |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Shared ACP layer: launch contract (`runLaunch`/`discoveryLaunch`, no `normalizeModels`), capabilities restore rule, connection methods, session (`openResume`, `applyConfigSelection`, effects rename + `onProviderCall`), launcher (refusal rule, DS-008 `end`), factory (instructions on restore, release via `end`), backend reopen (`restore` + instructions). Migrate Grok. Grok tests green (AC-016).
2. Credential proxy: pass registry field, forwarder auth, provider relays, observers, refusal envelope, `ProviderRelayAccess`, process slot, host/server wiring; vault consumer. Integration tests green (AC-017).
3. Compositions: `providerRelayAccess` disposition in `createForExecution`; studio (host access + slot), application platform runtime/scope (threaded), standalone host (`null`); `AgentRunManager` field.
4. dsh runtime: identity, home + files, launch profile, capability/discovery, catalog, availability provider, strategy, session profile, projection, provider calls, payloads, factory binding; registration points; contracts; web; Work Journal translation.
5. Docs and glossary.
6. Live gated E2E against the real API with the test vault (flash) on the product relay, covering AC-001…AC-015 including a reopen (Agent Tools change mid-run) and the key-absence scan (QR-001).

## Key Tradeoffs

- Relay-observed compaction vs reading dsh's own log: our code on a stable wire point vs a private, compressed, versioned format.
- AutoByteus-owned dsh home vs the user's: required for the pass to win and for isolation; costs a second dsh profile tree on disk.
- Plugin vs persona field: the plugin is the only literal path; ~10 lines of JS written by the server.
- Process slot vs injecting into singletons: the slot is one process fact set by the one composition that owns the proxy; injecting into `ModelCatalogService` and `RuntimeAvailabilityService` would change unrelated catalog construction.
- One process per run: isolation; memory cost unmeasured (RSK-004).

## Risks

- RSK-001/002 (dsh changes; compaction header): accepted, handled as bugs (DEC-003).
- RSK-003: a refused summary still rotates once.
- RSK-004: process memory per run — measure in validation.
- RSK-006: overlap with autobyteus-386 in the shared ACP layer — resolve at merge.
- Security: the relay forwards only `POST /anthropic/v1/messages` to `api.deepseek.com`, only for a live pass with the relay grant, only from loopback. An agent with integrations sees its pass in integration URLs and could call the relay itself: it then gets model calls on the user's key, never the key (REQ-009 holds).

## Guidance For Implementation

- Reproduction to start from: `probes/live-run-home.sh` with `probes/owned-home.cordis.patch.yml`, `probes/dsh-plugin/autobyteus-agent-instructions.mjs` and `probes/vault-forwarder.mjs` (test vault); the product path must reproduce the same frames through the product relay (which does not strip fields).
- Deliver `finished` synchronously from the tap at upstream end; throttle only `activity` (one per second per call). Otherwise the last call's usage can arrive after the turn and be dropped (`acp-agent-session.ts:195-197`).
- Never log the pass, a URL together with a pass, or any header value of a forwarded call.
- Write the home patch and plugin atomically (temporary file in the same folder, then rename).
- Live tests use flash (`deepseek-v4-flash`) and the test vault (TESTING.md, Test Vault).
