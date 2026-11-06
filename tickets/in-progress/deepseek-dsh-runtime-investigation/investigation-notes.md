# Investigation Notes

## Investigation Meta

- Package identifier: `deepseek-dsh-runtime-investigation` (Project Task `autobyteus-387`)
- Request / ticket: autobyteus-387, "DeepSeek dsh as another agent runtime: find out what it is, how easy it is to support, and whether it speaks ACP"; extended by the user on 2026-11-06 to building the runtime in this ticket (see Initial Request And Clarifications)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`
- Repository mode: `Git`
- Task worktree / branch: same path, branch `codex/deepseek-dsh-runtime-investigation`
- Resolved base remote / branch / revision: `origin/personal` at `3ef5e33eec` (fetched 2026-11-05)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md "Finalization Target")
- Bootstrap result: worktree created from the refreshed base; ticket folder `tickets/in-progress/deepseek-dsh-runtime-investigation/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (re-read after the 2026-11-06 skill update), `references/handoff.md`, `references/project-documents.md` (2026-11-06 update), 2026-11-05/06
- Investigation status: Complete for requirements and architecture design

## Initial Request And Clarifications

- Original request (user, 2026-11-05, through the Project Task Manager): "i want to support deepseek dsh as another runtime as well. i am not sure how easy it is. but if they also support acp that would be nice. create the ticket, and send to one a software engineering agent team to investigate."
- Task constraints: keys never travel through the environment, chat or logs; isolated tests only; no change to stored data; ask before using any key.
- Clarifications received in the Solution Designer conversation (user's words):
  - Key route: "you meant for dsh, we could use our own address, but the proxy forward to api deepseek com, thats wonderful if it works".
  - The old `.env` key: "you can simply remove the deepseek api key in the .env file, and test again" (done, see RT-020).
  - Live tests: "call the real api please"; "for experiments you have to go with real api"; "no need to test switching to v4 pro, you can use flash to test".
  - Proceed: "so for dsh acp it works? if works, then i would say, lets go with the ticket".
  - Raw traces: "the problem is that without compaction the raw trace file will become bigger and bigger you know".
  - dsh churn and scope (2026-11-06): "the DSH is changing fast … if something breaks, let's say, we will just report a bug and no worry … But if you think like it's doable for DSH, then we do it now in this ticket."
- User-supplied facts: the DeepSeek key is in the application vault and in the test vault.
- Initial ambiguity: what "dsh" is (resolved: DeepSeek Harness, below).

## Product And Domain Understanding

- Product area: agent runtimes (the server's `agent-execution` backends and `runtime-management`), credential proxy, agent memory (raw traces, Work Journal).
- Affected actors or systems: a user who runs AutoByteus agents and picks a runtime; the server's run lifecycle; the DeepSeek API; the dsh program.
- Existing purpose: AutoByteus runs one agent definition on several runtimes (native, Claude, Codex, Antigravity, Grok Build). External runtimes keep their own model context; AutoByteus keeps raw traces, the Work Journal, token usage and the runtime switch.
- Terminology: **dsh** = DeepSeek Harness, DeepSeek's open-source agent program. **ACP** = Agent Client Protocol. **Run pass**, **credential proxy**, **delivery definition**: `GLOSSARY.md:153-172`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-05 | Web | WebSearch "DeepSeek dsh command line coding agent", "DeepSeek CLI agent ACP Agent Client Protocol" | Identify the product | `deepseek-ai/deepseek-harness` on GitHub; `@deepseek-ai/dsh-acp` | Clone the source |
| 2026-11-05 | Web | https://github.com/deepseek-ai/deepseek-harness | Ownership, licence | Owned by the `deepseek-ai` organisation; README "developed by DeepSeek AI"; developer preview with "COMPATIBILITY-BREAKING CHANGES"; MIT | — |
| 2026-11-05 | Code | `git clone --depth 1` into `/tmp/ab387-ext/dsh-src` (commit `fcc0ad46`, 2026-11-04) | Read the real dependency | Packages `acp/acp`, `bundle/acp-app`, `bundle/base`, `credentials/*`, `llm/llm-deepseek*`, `compaction/compaction-basic`, `core/system-prompt`, `skill/skill-filesystem`, `mcp/mcp-client` read below | — |
| 2026-11-05 | Command | `npm view @deepseek-ai/dsh` | Version, engines | `0.2.2-rc.1` latest (published 2026-11-04), `engines.node >=24.9.0`, MIT, releases every few days | — |
| 2026-11-05 | Code | dsh `LICENSE`, `SAFETY.md`, `BRAND_GUIDELINES.md` | Terms of use | MIT; not security-audited; avoid "DeepSeek Harness" as a project *name* (nominative reference to the product is not a project name) | DEC-016 |
| 2026-11-05 | Code | dsh `packages/acp/acp/README.md`, `src/index.ts`, `src/session.ts`, `src/updates.ts`, `src/mcp.ts`, `src/codec.ts`, `src/model-control.ts` | ACP surface | See External Contracts | — |
| 2026-11-05 | Code | dsh `packages/bundle/acp-app/cordis.patch.yml`, `packages/bundle/base/cordis.patch.yml` | Default composition | ACP profile = base + acp-app; default route `deepseek-official`/`deepseek-v4-flash`; sandbox `workspace-write` + approval `ask` (`base/cordis.patch.yml:240-276`) | — |
| 2026-11-05 | Code | dsh `apps/cli/README.md`, `apps/cli/reference/README.md` | Launch, profiles, patches | `dsh --profile acp`; layer order bundles → profile patch → `$DSH_HOME/cordis.patch.yml` → `--patch`; profiles auto-initialise under `$DSH_HOME/profiles/<name>` | — |
| 2026-11-05 | Code | dsh `packages/credentials/credentials-local/README.md`, `llm/llm-deepseek-api-key/README.md`, `llm/llm-deepseek/src/config.ts:115-119` | Key handling | Lookup order: stored file `$DSH_HOME/.credentials.yaml` > launch environment `DEEPSEEK_API_KEY` > `<cwd>/.env` > `$DSH_HOME/.env`; endpoint from `$DEEPSEEK_BASE_URL`, default `https://api.deepseek.com/anthropic`; a non-official endpoint serves the built-in model list without a listing call | DEC-007 |
| 2026-11-05 | Code | dsh `packages/session/session-log-deepseek/README.md` | Privacy | Default ON: each official-API request carries the session log (`dsh_session_log`); `enabled: false` stops it | DEC-004 |
| 2026-11-06 | Code | dsh `packages/compaction/compaction-basic/README.md:68-88`, `src/region.ts`, `packages/llm/llm-deepseek/src/adapter.ts:150-152` | Compaction | Compaction writes `compaction/start`, `/summary`, `/end` to dsh's own session log; one extra model request per summary; the adapter adds `x-deepseek-harness-compact: 1` when the request purpose is compaction | DEC-009 |
| 2026-11-06 | Code | dsh `packages/llm/llm-deepseek/README.md:63` | Long steps | `streamIdleTimeoutMs` 300 000 per outstanding stream read | DEC-010 |
| 2026-11-06 | Code | dsh `packages/llm/llm-deepseek/src/models.ts` | Models | Built-in list `deepseek-flash` (V4.1-Flash, text+image) and `deepseek-v4-pro` (text); window 1 048 576 | — |
| 2026-11-06 | Code | dsh `packages/core/system-prompt/README.md:46-112`, `src/index.ts:52-75,291,484-493` | Instruction delivery | `personaPrefix`/`personaSuffix` are templates; unknown `{{name}}` throws and fails assembly; only a plugin section can set `interpolate: false` | DEC-017 |
| 2026-11-06 | Code | dsh `packages/skill/skill-filesystem/README.md:60-75` | Skills | Roots `<projectRoot>/.dsh/skills`, `<projectRoot>/.agents/skills` (projectRoot = nearest `.git` ancestor), `customSkillDirs`, user roots; `includeDefaultRoots: false` keeps only configured roots | DEC-008 |
| 2026-11-06 | Code | dsh `packages/mcp/mcp-client/README.md:74-78` | MCP naming | Tools appear as `mcp__<serverName>__<tool>` | — |
| 2026-11-06 | Code | dsh `packages/shell/shell-env/README.md`, `shell/bash-local/README.md:103` | Shell environment | Shell calls get `DSH_*` facts; the subprocess service scrubs ambient credentials | DEC-012 |
| 2026-11-05/06 | Code | AutoByteus files listed in Relevant Codebase And Technical Facts | Current owners | — | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User creates a run of an agent and selects a runtime | No current supported behavior for dsh. For Grok: run config → `AgentRunManager` picks the Grok factory (`agent-run-manager.ts:404`) → shared `AcpAgentRunBackendFactory.createBackend` (`acp-agent-run-backend-factory.ts:103-117`) → `AcpSessionLauncher.open` (`acp-session-launcher.ts:76-130`) spawns one process, `initialize`, `session/new` with `_meta` | One agent process and ACP session per run | Code | High |
| BEH-002 | User | User sends a message to an idle run | `AcpAgentRunBackend.dispatchUserInput` (`acp-agent-run-backend.ts:130-155`) → `AcpAgentSession.startTurn` (`acp-agent-session.ts:120-134`); updates converted by `AcpSessionUpdateConverter.convertUpdate` (`acp-session-update-converter.ts:89-101`): thought/message chunks, `tool_call`, `tool_call_update`; other updates (incl. `usage_update`) ignored | Mid-turn input refused (`acp-agent-run-backend.ts:131-136`); permissions answered once (`acp-permission-bridge.ts`) | Code | High |
| BEH-003 | User | User stops a running turn | `AcpAgentSession.cancel` (`acp-agent-session.ts:137-143`): pending permissions `cancelled`, then `session/cancel` | Turn ends interrupted | Code | High |
| BEH-004 | System | Server restart, run restored on next use | `restoreBackend` (`acp-agent-run-backend-factory.ts:119-132`) opens with `mode: "load"`; launcher requires `loadSession` (`acp-session-launcher.ts:101-102`, `acp-agent-capabilities.ts:44-49`); instructions are not re-sent (`acp-agent-run-backend-factory.ts:126`) | Restore needs `session/load` | Code | High |
| BEH-005 | User | User opens the model list for a runtime / starts a run with a model | Grok: `discoverGrokBuildModels` via `runAcpDiscoveryHandshake` (initialize only) (`grok-build-capability.ts:115-120`, `acp-discovery-handshake.ts:59-63`); model + effort passed as CLI args (`grok-build-launch-profile.ts`) | — | Code | High |
| BEH-006 | System | Run start | Composed prompt (`composeSharedCarpenterPrompt`) delivered via `sessionProfile.newSessionMeta` (`acp-agent-run-backend-factory.ts:105-114`); Grok puts it in `_meta.rules` (`grok-build-session-profile.ts`) | Delivered at `session/new` only | Code | High |
| BEH-007 | System | Run start with configured skills | `WorkspaceSkillMaterializer.materializeConfiguredWorkspaceSkills` links skills under `<workspace>/<runtime folder>` (`acp-agent-run-backend-factory.ts:138-146`; Grok `.grok/skills`, `grok-workspace-skill-materializer.ts`) | Released on run release | Code | High |
| BEH-008 | System | Run start | Agent Tools MCP descriptor activated (`acp-agent-run-backend-factory.ts:187-204`), passed as HTTP MCP server (`grok-build-session-profile.ts` `mcpServers`) | — | Code | High |
| BEH-009 | System | Run preparation with integrations | `IntegrationRunAccess.environmentForRun` issues a run pass and shell variables (`integration-run-access.ts:29-46`); proxy route `/r/<pass>/<integrationId>/<route>` (`credential-proxy-routes.ts:33-133`) adds the vault token; pass revoked at release (`agent-run-resource-manager.ts:124`) | GitHub only; token never in a shell | Code, `docs/modules/credential_proxy.md` | High |
| BEH-010 | System | Provider reports a compaction | Profile effect → `converter.compaction` → `COMPACTION_STATUS` with `provider_compaction_boundary`; completion `rotation_eligible: true` (`grok-build-compaction-status-payload.ts:48-97`) → `ProviderCompactionBoundaryRecorder.rotateActiveRawTracesBeforeBoundary` (`provider-compaction-boundary-recorder.ts:57-67`) | `raw_traces_active.jsonl` rotates only on compaction or runtime switch (`docs/modules/agent_memory.md:508-517`) | Code, doc | High |
| BEH-011 | System | Model call finishes | Grok `_x.ai/session_notification response_completed` → `buildGrokBuildCallUsagePayload` (`grok-build-call-usage.ts:17-53`) → `TOKEN_USAGE_UPDATED` per call | — | Code | High |
| BEH-012 | System | No ACP frame for 300 s | `ACP_TURN_IDLE_TIMEOUT_MS = 300_000`, armed when no tool call is open (`acp-agent-session.ts:19, 312-321`) | Run fails `ACP_TURN_IDLE_TIMEOUT` | Code | High |
| BEH-013 | User | User opens Settings → Agent Runtimes | `AgentRuntimeStrategy` per runtime (`agent-runtime-strategy.ts:20-48`); sign-in routes `browser`/`commandLine` (`agent-runtime-types.ts:16`); web offers sign-in for `BROWSER` (`agentRuntimesPresentation.ts:31-33`) | — | Code | High |
| BEH-014 | System | Work Journal render; runtime switch | Per-runtime translation registry (`runtime-translation.ts:72-78`), generic fallback; runtime switch archives raw traces and adds a handover notice (`runtime-switch-recorder.ts:25`) | Runtime-generic except the translation | Code | High |
| BEH-015 | Operational | Server startup | `AppConfig.loadEnvironmentInternal` calls `dotenv.config` on the data-dir `.env` (`app-config.ts:234-245`), so every key in that file enters `process.env` and every agent child process | Provider keys reach agents (FU-001) | Code + RT-019 | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `runtime-management/acp/acp-agent-launch-profile.ts` | `command()`, `args({model, reasoningEffort})`, `env(base)`, `normalizeModels(initialize)` | dsh needs per-run launch inputs (instructions file, owned home) | Launch request must carry the run's launch facts |
| `runtime-management/acp/acp-agent-capabilities.ts:44-49` | Restore requires `loadSession` | dsh restore must work (REQ-004) | Restore by `session/resume` when only resume is advertised |
| `runtime-management/acp/acp-client-connection.ts:142-150` | `newSession`, `loadSession` | — | Add `resumeSession`, `setSessionConfigOption` (SDK 1.5.0 has both: `acp.d.ts:1591,1623`) |
| `runtime-management/acp/acp-discovery-handshake.ts:21-76` | Short process: initialize, extension request; cwd `os.tmpdir()` | dsh models need a session | Add an options-discovery operation on the short process |
| `agent-execution/backends/acp/session/acp-agent-session.ts` | State machine, permissions, idle timer, ext effects | Usage, compaction, liveness from model traffic | A second effect source (model traffic) through the same effect application |
| `agent-execution/backends/acp/acp-agent-session-profile.ts:31-86` | `AcpExtEffect` = usage / mcp_status / compaction; profile hooks | Effects also come from the proxy | Effect type renamed for its two sources |
| `agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | Create/restore sequencing | Instructions on every launch | Composed prompt in both create and restore |
| `agent-execution/backends/shared/workspace-skill-materializer.ts` | Workspace skill links with collision policy and cleanup | Skills for dsh | Reuse with folder `.dsh/skills` |
| `credential-proxy/*` | Integration-only proxy: route `/r/<pass>/<integrationId>/<route>`, pass registry, forwarder | Model calls through the proxy | New model-route family; forwarder streaming; observation |
| `credential-proxy/credential-proxy-forwarder.ts:46,154-157` | `TEXT_CONTENT` matches `text/event-stream`; text bodies buffered for redaction | SSE must stream | Model route never buffers or redacts |
| `credential-proxy/credential-proxy-forwarder.ts:91-94,120` | Auth `bearer`/`basic` into `authorization` | DeepSeek uses `x-api-key` | New auth kind |
| `credential-proxy/run-pass-registry.ts:5-54` | One pass per run with integration grants | Model route on the same run pass | Holder gains the model route grant |
| `credential-proxy/credential-proxy-local-server.ts:30` | Listens on `127.0.0.1` port 0 | No fixed port collision | — |
| `secret-management/domain/secret-id.ts:16-18`, `catalog/provider-credential-catalog.ts:58-62` | `agentRuntime` consumer only for `claude_agent_sdk` → `provider.anthropic.api-key` | dsh reads `provider.deepseek.api-key` through the proxy | Add the dsh consumer mapping |
| `agent-memory/services/provider-compaction-boundary-recorder.ts:57-67` | Rotates on rotation-eligible boundary | REQ-010 | dsh emits the same payload |
| `agent-execution/domain/agent-run-token-usage.ts:13-20` | Open unions for runtime/ingestion kinds | — | New values, no schema change |
| `agent-work-journal/rendering/runtimes/runtime-translation.ts:72-78` | Translation registry | REQ-014 | Add dsh translation |
| `available-agent-runtimes/available-agent-runtimes-report.ts:22`, `runtime-management/runtime-kind-enum.ts:1-15`, `agent-runtimes/agent-runtime-types.ts:4-16`, `runtime-availability-service.ts:109-154`, `llm-management/services/model-catalog-service.ts:44,77,175`, `run-model-selection-service.ts:14,57`, `agent-run-manager.ts:404`, `agent-run-restore-context-factory.ts:19`, `run-history/services/agent-run-resume-config-service.ts:80`, `application-launch-host-capability-validator.ts:123`, `application-provider-credential-readiness-adapter.ts:76`, `mcp-effective-tool-result-projector.ts:3`, `agent-provider-factory-builder.ts:216` | Runtime registration points (server) | REQ-001, REQ-013 | One entry each |
| `autobyteus-agent-presentation-contracts/src/agent-runtime-names.ts:10`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts:17`, `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts:24,166`, `autobyteus-web/types/availableAgentRuntimes.ts:31`, `types/agentRuntimes.ts:23`, `utils/existingRunModelHelp.ts:5`, `components/settings/model-routing/modelRoutingPresentation.ts:10`, `services/activity/runActivityPresentation.ts:15`, `components/settings/agent-runtimes/*` | Runtime registration points (contracts, web) | REQ-001, REQ-013 | One entry each |
| `agent-execution/backends/acp/input/acp-prompt-builder.ts:5-13` | No image blocks; files by path | Images reach dsh as paths | Unchanged |
| `config/app-config.ts:234-245` | Loads the whole data-dir `.env` into `process.env` | FU-001 | Outside this ticket; dsh launch removes nothing it does not own (DEC-012 makes the key irrelevant) |
| `agent-execution/backends/acp/backend/acp-agent-run-backend.ts:34-53,191-259` (SR-003, architecture review AR-001) | Third `open` caller: reopen after an Agent Tools change, `mode: "load"`, input holds no instructions; ends via `AcpSessionLauncher.end` | REQ-006 on reopen | Backend holds the instructions; reopen is a restore form |
| `acp-session-launcher.ts:135-147` and `acp-agent-run-backend-factory.ts:82-92` (AR-002) | Two copies of ending an owner | — | One end owner with a stated order |
| `agent-provider-factory-builder.ts:155-174`, `general-process-run-supervisor.ts:234-245`, `application-execution-scope-kernel-builder.ts:102-141`, `start-standalone-application-host.ts:264`, `build-studio-server.ts:209,316,355` (AR-003) | `createForExecution` takes explicit dispositions; studio passes the proxy host's access; application scopes and the standalone host pass `null`; the studio builds its application runtime in the same process as its proxy host | REQ-009 in every composition | Disposition per composition; refuse before spawn without access (DEC-020) |
| `model-catalog-service.ts:68-77,363`, `runtime-availability-service.ts:109-154`, `application-launch-host-capability-validator.ts:76-86` (AR-003) | Catalog and availability are process singletons without DI; validator refuses unavailable runtimes with their reason | REQ-005/013 | Process relay slot set by the composition |
| dsh `llm-deepseek/src/transport.ts:9-45`, `adapter.ts:155-166` (AR-004) | Failure text only from an object `error`; 401/403 or `authentication_error`/`permission_error` → `AUTH` (not retried); ≥500 → `SERVER` (retried) | AC-009 alternate | Anthropic error envelope for relay refusals |
| `GLOSSARY.md:236-262` (AR-006) | Model Routing / Model Router terms | Vocabulary | "provider relay" |
| dsh `docs/deepseek-llm-api-wire-extensions.md:41-72,158-160` (AR-007) | `dsh_plugin_packages` = active npm package names and versions; never model input | — | DEC-019 |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- AutoByteus-owned dsh home patch (`cordis.patch.yml`) and instructions plugin (`autobyteus-agent-instructions.mjs`), written by the server.
- Per-run instructions file.

### Structural Surfaces

- New runtime owner (dsh launch/session profiles, backend factory binding, availability strategy, model catalog).
- Shared ACP layer: restore by resume, config-option selection, launch request, model-traffic effects.
- Credential proxy: second route family for runtime model calls, streaming, observation; secret consumer.
- Contracts: runtime kind in presentation, collaboration-stream and team-stream contracts; web runtime maps.

### Potential Structural Impacts To Investigate

- API or external-contract change: new runtime kind value in three contract packages and GraphQL enums (present).
- Persistence schema or invariant change: run metadata `runtimeKind` gains a value; raw-trace manifest `runtime_kind` gains a value (present; no migration, see design).
- Security or privacy boundary change: vault key leaves the server only through the proxy to `api.deepseek.com` (present).
- Concurrency or lifecycle change: one dsh process per run; proxy observation bound to a run's session (present).
- Deployment: users install dsh with npm (Node ≥ 24.9) (present).

## Runtime, Probe, Or Reproduction Findings

All probes ran in `/tmp/ab387-ext` with `env -i`, `HOME`/`DSH_HOME` under `/tmp`, no inherited `DEEPSEEK_API_KEY`. Real-API runs read the DeepSeek key from the test vault into the forwarder's memory only. Scripts: `probes/`; frames: `evidence/`.

| ID | Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| RT-001 | `dsh-acp-probe.mjs`, keyless | initialize, `session/new`, prompt | `protocolVersion 1`, `sessionCapabilities {close, list, resume}`, `mcpCapabilities.http`, `authMethods []`; `configOptions` model + `reasoning_effort` (off/low/high/max); prompt fails "no API key for provider route deepseek-official" | Reproduced | REQ-004/005 | `evidence/p1-keyless-new-prompt.jsonl` |
| RT-002 | same, new process | list, load, resume, set option | `session/load` → `-32601 Method not found`; `session/resume` restores after restart; `set_config_option reasoning_effort max` applied | Reproduced | REQ-004/005 | `evidence/p2-keyless-restart-resume.jsonl` |
| RT-003 | fake endpoint `mock-anthropic.mjs` | tool turn | `tool_call` (title = tool name, `kind: other`, `rawInput`), `tool_call_update` with content; whole committed messages, no deltas; `usage_update {used, size}` | Reproduced | REQ-002/011 | `evidence/p3-*` |
| RT-004 | fake endpoint | in-workspace bash | runs without approval | Reproduced | DEC-005 | `evidence/p4-inside.jsonl` |
| RT-005 | fake endpoint | write outside workspace | sandbox denies with escalation hint; `/tmp` areas are writable | Reproduced | DEC-005 | `evidence/p5-*, p6-*` |
| RT-006 | fake endpoint | escalation allow / reject | `session/request_permission` (`toolCall.toolCallId` only, `allow-once`/`reject-once`); allow runs; reject fails the call with a stop instruction | Reproduced | REQ-002 | `evidence/p7-*, p8-*` |
| RT-007 | `pass-forwarder.mjs` | pass check + key swap | right pass forwarded with swapped key; wrong pass → dsh "turn failed: invalid run pass" | Reproduced | REQ-009 | `evidence/p9-*` |
| RT-008 | `vault-forwarder.mjs`, real API, flash | tool turn with `--patch` persona | 200 streamed; `bash` then `read`; persona followed; session-log off removes `dsh_session_log` | Reproduced | REQ-002/006/015 | `evidence/p10-*` |
| RT-009 | real API | restore in new process | `session/resume` answer recalls the file | Reproduced | REQ-004 | `evidence/p11-*` |
| RT-010 | real API | skill in `<ws>/.dsh/skills`, ws = git root | found and followed via `skill` tool | Reproduced | REQ-007 | `evidence/p12-*` |
| RT-011 | real API | same, ws = subfolder of a repo | not found | Reproduced | REQ-007, DEC-008 | `evidence/p13-*` |
| RT-012 | real API + `mcp-http-server.mjs` | `customSkillDirs`; HTTP MCP with header | skill found; MCP connected during `session/new`, header on every request, `server/discover` tried first then `initialize`; call `mcp__autobyteus_agent_tools__lookup_order {"order_id":"42"}` without approval | Reproduced | REQ-007/008 | `evidence/p14-*` |
| RT-013 | real API | cancel during `sleep 60` | `stopReason cancelled` ~11 ms after `session/cancel`; command killed; next prompt works | Reproduced | REQ-003 | `evidence/p15-*` |
| RT-014 | real API, threshold ratio 0.007 | forced compaction | 4 compactions (3 applied, 1 refused "summary is not smaller"), 2–3.5 s each; no ACP frame; `usage_update.used` rose despite compaction (9 870 → 10 144) | Reproduced | REQ-010 | `evidence/p16-*` |
| RT-015 | real API, route `deepseek-flash` | image prompt block | `promptCapabilities.image: true`; answer "Red." | Reproduced | DEC-011 | `evidence/p17-*` |
| RT-016 | real API, effort `max` | long reasoning | 179 s with no ACP frame while upstream streamed; 92k chars reasoning | Measured | REQ-012 | `evidence/p18-*` |
| RT-017 | real API, request fingerprints | compaction requests | exactly the 4 compaction requests carry `x-deepseek-harness-compact: 1`; all carry `x-deepseek-harness-session-id` = ACP session id | Reproduced | REQ-010 | `evidence/p19-*` |
| RT-018 | real API, owned home + plugin | home-level patch, literal instructions, env skills dir, shell env | instructions with `{{agent_name}}` preserved literally and followed; skill from env dir; shell sees `DEEPSEEK_BASE_URL` and `AUTOBYTEUS_DSH_*` but not `DEEPSEEK_API_KEY` | Reproduced | REQ-006/007/009 | `evidence/p20-*`, `probes/owned-home.cordis.patch.yml` |
| RT-019 | `ps eww` parent chain (value-free) | where agent keys come from | server process started without the keys; Claude child has them; names present in `~/.autobyteus/server-data/.env` | Reproduced | FU-001 | conversation record; names only |
| RT-020 | `sed` on the user's `.env` (user-requested) | remove `DEEPSEEK_API_KEY` | one line removed; after the app restart the variable is gone from agent processes | Reproduced | — | conversation record |
| RT-021 | real API, stream usage tap | usage fields | `message_start` and `message_delta` carry `input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens` | Reproduced | REQ-011 | `evidence/p21-*` |
| RT-022 | `--dump-config` with `--patch` | patch composition | `disabled: true` and full-config replacement apply per row | Reproduced | REQ-015 | — |

- Temporary diagnostics: None in the repository. Probe forwarders ran outside it; ten were left running after the runs (a script bug, fixed) and were stopped on 2026-11-06; their logs show only the probes' own requests and no refusals.
- Reproduction for implementation to start from: `probes/live-run-home.sh` with `probes/owned-home.cordis.patch.yml` and `probes/dsh-plugin/autobyteus-agent-instructions.mjs` (real API through `probes/vault-forwarder.mjs`, test vault).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | dsh as a runtime, ideally on ACP | Direct | REQ-001 | — |
| User | Key from the vault through our proxy | Direct | REQ-009 | — |
| User | Raw traces must not grow without compaction | Direct | REQ-010 | — |
| User | dsh churn handled as bugs, not guards | Direct | DEC-003/014 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| dsh ACP server | `@deepseek-ai/dsh` 0.2.2-rc.1 | ACP v1; `session/new`, `list`, `resume`, `close`, `set_config_option`, `prompt`, `cancel`; `request_permission` allow/reject once; no `session/load`, modes, commands, plans, terminals, client fs, elicitation, additional directories | dsh `packages/acp/acp/README.md`, RT-001/002 | Developer preview; breaking changes expected (DEC-003) |
| dsh updates | `src/updates.ts` | Committed messages and thoughts only; tool title = tool name, `kind: other`; `usage_update {used, size}` (context occupancy) | RT-003 | — |
| dsh credential and endpoint | `credentials-local`, `llm-deepseek` | Stored file wins over launch environment; `DEEPSEEK_BASE_URL` | Source Log | A stored key in a dsh home would bypass the pass (DEC-007) |
| dsh composition | CLI reference | Home patch `$DSH_HOME/cordis.patch.yml`; `!!js` expressions; plugin rows by path | RT-018 | — |
| DeepSeek API | `https://api.deepseek.com/anthropic/v1/messages` | Anthropic Messages SSE; header `x-api-key`; usage in `message_start`/`message_delta` | RT-008/021 | — |
| ACP SDK | `@agentclientprotocol/sdk` 1.5.0 (server dependency) | `ClientSideConnection.resumeSession`, `setSessionConfigOption` | `acp.d.ts:1591,1623` | — |
| Node.js | dsh `engines.node >=24.9.0` | User installs dsh with npm on Node 24.9+ | `npm view` | User machine default Node 22 (Homebrew 25 present) |

## Persisted Data And State Facts

- Affected stored subject: run metadata `runtimeKind`; raw-trace manifest `runtime_kind`; token-usage records `runtime_kind`/`ingestion_kind`; dsh's own session store inside the AutoByteus-owned dsh home.
- Location and representative shape: as for Grok (`grok_build`), a new string value.
- Current readers and writers: `runtimeKindFromString` (`runtime-kind-enum.ts:17`); token usage open unions.
- Required semantics: existing values unchanged.
- Acceptable loss: dsh's session store is the runtime's own; losing it loses only restore of dsh runs.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The UI delta is a runtime entry and a key-state line on existing surfaces.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/` (`dsh-acp-probe.mjs`, `mock-anthropic.mjs`, `pass-forwarder.mjs`, `vault-forwarder.mjs`, `mcp-http-server.mjs`, `live-run.sh`, `live-run-home.sh`, `*-steps.mjs`, `dsh-plugin/`, `*.cordis.patch.yml`, `skill-fixture/`, `instructions-fixture.md`) | Solution Designer | Reproduce every RT finding. Note: `vault-forwarder.mjs` also deletes `dsh_session_log` and `dsh_plugin_packages` from request bodies; that is probe-only behavior, the product relay never alters bodies (design spec, DEC-019) | Investigation | REQ-002…REQ-015 | Current | Evidence; not behavior-defining |
| `evidence/` (`p1`…`p21`) | Solution Designer | Recorded frames and forwarder logs (no key material) | Investigation | as RT rows | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | dsh changes break the integration | Developer preview | User: report as a bug (DEC-003) | Accepted |
| RSK-002 | Risk | The compaction header is in code, not documented | REQ-010 depends on it | Pinned behaviour verified by a live test; breakage is a bug (DEC-003) | Accepted |
| RSK-003 | Risk | A refused summary (RT-014) still reports completion | One extra raw-trace rotation | Harmless: rotation only archives settled records | Accepted |
| RSK-004 | Unknown | dsh process memory per run | Many concurrent runs | Measure during validation | Open (validation) |
| RSK-005 | Risk | Users on Node < 24.9 | dsh does not start | Availability shows dsh's own failure | Accepted |
| RSK-006 | Risk | 386 (Antigravity ACP) changes the shared ACP layer in parallel | Merge overlap | Resolve at merge (Task direction) | Open |

## Architecture Investigation Findings

- Execution spine for ACP runtimes: `AgentRunManager → AcpAgentRunBackendFactory → AcpSessionLauncher → AcpAgentProcess/AcpClientConnection → AcpAgentSession → AcpSessionUpdateConverter → AcpAgentRunBackend.publish` (files above).
- The shared launch profile is pure per call (`args`, `env`), with no per-run facts beyond model and effort.
- The shared session applies effects only from agent extension notifications (`acp-agent-session.ts:180-204`).
- The credential proxy owns passes, the loopback listener and forwarding; its vocabulary and grants are integration-specific (`GLOSSARY.md:153-172`).
- Restore metadata: the ACP session id is the platform agent run id (`agent-run-restore-context-factory.ts:19`).
- One dsh process per run serves exactly one session (dsh supports several; Grok precedent `grok-build-launch-profile.ts` `--no-leader`).

## Requirement Implications

- dsh speaks ACP; a session profile on the shared ACP backend, plus four standard-ACP or proxy additions, carries it (no new backend).
- Key handling and raw-trace rotation both hinge on routing dsh's model traffic through the credential proxy.
- Instructions must be literal and re-supplied on every launch.

## Notes For Architecture Design

- Approved scenario IDs: SCN-001…SCN-010 (requirements doc).
- Verified constraints: no `session/load`; instructions via plugin section; owned dsh home; pass in `x-api-key`; compaction header; stream usage shape; idle silence up to minutes.
