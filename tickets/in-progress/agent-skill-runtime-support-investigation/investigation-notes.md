# Investigation Notes

- Ticket: `agent-skill-runtime-support-investigation`
- Last Updated: `2026-03-10`
- Scope Triage: `Medium`

## Question

1. Can an agent-level configured custom skill already be used by the Codex runtime and the Claude runtime, and does the current Codex app server integration already support that?
2. After the configured-skill implementation, should our Codex app-server integration keep one global client, one client per session, or a narrower boundary that better matches Codex app-server `cwd`-scoped usage?

## Findings

### 1. Agent definitions already store configured skills

- The backend `AgentDefinition` model includes `skillNames: string[]`.
  - Evidence: `autobyteus-server-ts/src/agent-definition/domain/models.ts:1-50`
- The backend create flow persists `skillNames`.
  - Evidence: `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:154-196`
- The frontend agent form exposes a Skills selector and submits `skillNames`.
  - Evidence: `autobyteus-web/components/agents/AgentDefinitionForm.vue:249-257`
  - Evidence: `autobyteus-web/components/agents/AgentDefinitionForm.vue:423-440`
- Frontend docs explicitly state that selected `skillNames` are sent to the backend `AgentDefinition`.
  - Evidence: `autobyteus-web/docs/skills.md:161-169`

### 2. Native AutoByteus runtime already uses configured agent skills

- `AgentRunManager` resolves each configured `skillName` to a concrete skill root path and passes those paths into `AgentConfig`.
  - Evidence: `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:313-376`
- `AgentConfig` includes skill paths and enables the mandatory `AvailableSkillsProcessor`.
  - Evidence: `autobyteus-ts/src/agent/context/agent-config.ts:22-27`
  - Evidence: `autobyteus-ts/src/agent/context/agent-config.ts:44-45`
  - Evidence: `autobyteus-ts/src/agent/context/agent-config.ts:91-94`
- `AvailableSkillsProcessor` injects skill catalog/details into the system prompt from the configured skills.
  - Evidence: `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:22-27`
  - Evidence: `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:42-47`
  - Evidence: `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:56-105`
- The native agent bootstrap actually runs system prompt processors.
  - Evidence: `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts:24-31`
  - Evidence: `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts:35-75`

### 3. Codex runtime integration does not currently consume configured agent skills

- The runtime create/restore contract has `skillAccessMode`, but the Codex adapter does not use it. Only the native AutoByteus adapter forwards it into the native runtime manager.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts:24-35`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts:58-87`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts:47-59`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts:74-92`
- Codex runtime metadata is built only from agent instructions loaded from `agent.md` or the agent description fallback. It does not include `skillNames` or resolved skill paths.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts:9-44`
  - Evidence: `autobyteus-server-ts/src/agent-definition/utils/prompt-loader.ts:9-20`
- Codex session startup only converts runtime metadata into `baseInstructions`, `developerInstructions`, and dynamic tools.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:372-424`
- Codex thread start/resume only sends `baseInstructions`, `developerInstructions`, and `dynamicTools` to app server.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts:12-37`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts:39-79`
- Codex turn input mapping only emits `text`, `image`, and `localImage` items. It never emits app-server `skill` items.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts:129-167`
- Repository search across `autobyteus-server-ts/src/runtime-execution` found no `skillNames` or Codex `skills/list` / `skills/config/write` usage.

### 4. Codex app server itself does support skills

- Official OpenAI Codex app-server docs expose `skills/list` and `skills/config/write`.
  - Source: `https://developers.openai.com/codex/app-server`
  - Evidence: API overview lines listing `skills/list` and `skills/config/write`
- Official docs also show `turn/start` can explicitly invoke a skill by including `$<skill-name>` in text and a `{"type":"skill","name","path"}` input item.
  - Source: `https://developers.openai.com/codex/app-server`
  - Evidence: `turn/start` skill invocation example

### 5. Claude runtime integration does not currently consume configured agent skills

- Claude create/restore follows the same pattern as Codex: it resolves only instruction metadata and passes that into the runtime service.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts:45-57`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts:73-91`
- Claude runtime sends a prompt string built from team/agent/runtime instructions only.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts:7-56`
  - Evidence: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:345-350`
- Claude V2 session creation config only includes model, executable path, permission mode, cwd, env, `allowedTools` for `send_message_to`, and optional tool approval hooks. It does not configure SDK skill loading.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts:141-155`
- Repository search across `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk` found no `settingSources`, no `"Skill"` allowed tool, and no agent-definition skill mapping.

### 6. Claude Agent SDK itself does support skills

- Official Anthropic docs state that SDK skills are filesystem-based `SKILL.md` artifacts.
- They require explicit `settingSources` / `setting_sources` to load filesystem skills.
- They also require `"Skill"` in `allowedTools` / `allowed_tools`.
- Once configured, Claude automatically discovers and invokes relevant skills.
  - Source: `https://platform.claude.com/docs/en/agent-sdk/skills`

### 7. The `thread ... is not materialized yet` failure is emitted by Codex app server, not invented by our projection layer

- Our Codex projection path only forwards `thread/read` and treats `thread not loaded` plus `not materialized yet` as transient provider-side errors.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts:18-77`
- The exact error text is covered in a unit test as a provider error shape:
  - `Codex app server RPC error -32600: thread 123 is not materialized yet; includeTurns is unavailable before first user message`
  - Evidence: `autobyteus-server-ts/tests/unit/runtime-execution/codex-app-server/codex-thread-history-reader.test.ts:50-74`
- Practical meaning: Codex has issued a thread id, but `thread/read` still cannot return turn history with `includeTurns: true` because the first user message has not been materialized into readable thread history yet.

### 8. The Codex baseline failure reproduces even when AutoByteus is removed from the loop

- Existing baseline non-skill Codex E2E already failed with the same symptom after a normal `continueRun` request:
  - `turn/start` returned a real `turnId`
  - `getRunProjection` stayed empty
  - repeated `thread ... is not materialized yet; includeTurns is unavailable before first user message`
  - Evidence command: `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.3-codex-spark RUNTIME_RAW_EVENT_DEBUG=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "returns non-empty run projection conversation for completed codex runs" --no-watch`
- A direct raw Codex app-server repro outside AutoByteus produced the same sequence:
  - start `codex app-server`
  - `initialize`
  - `thread/start`
  - wait for `codex/event/mcp_startup_complete`
  - `turn/start` returned `{"status":"inProgress","id":"..."}`
  - ten consecutive `thread/read` calls still returned `thread ... is not materialized yet`
- That direct repro used an ad hoc Node script executed from the shell in a temporary workspace; no AutoByteus runtime, GraphQL, projection, or skill wiring participated in the failing `thread/read`.

### 9. The current strongest root-cause hypothesis is shared Codex state-db contention in the environment

- While the failing Codex E2E was running, `lsof +D /Users/normy/.codex` showed multiple concurrent Codex processes opening the same `state_5.sqlite` files:
  - the desktop app (`/Applications/Codex.app/...`)
  - the desktop app's bundled `codex app-server`
  - the spawned test `codex app-server`
  - another Codex CLI process
- The failing E2E and the direct raw repro both logged repeated Codex warnings:
  - `failed to read backfill state at /Users/normy/.codex: error returned from database: (code: 5) database is locked`
  - `state db record_discrepancy: find_thread_path_by_id_str_in_subdir, falling_back`
- This lines up with the materialization failure: `turn/start` is accepted, but Codex does not make the first user turn readable via `thread/read`.
- Current confidence statement:
  - High confidence the configured-skill implementation is not the cause.
  - Medium confidence the immediate blocker is Codex-side persistence/materialization behavior under shared `~/.codex` state.
  - Lower confidence on whether that is an upstream Codex bug, an unsupported shared-state scenario, or a machine-local contention condition.

### 10. Our current Codex client boundary is global, not `cwd`-scoped

- `CodexAppServerProcessManager.getClient(cwd)` currently caches one singleton client/process and returns it for all later calls, even when the requested `cwd` changes.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts`
- The current unit test explicitly expects that `/tmp/a` and `/tmp/b` reuse the same started client.
  - Evidence: `autobyteus-server-ts/tests/unit/runtime-execution/codex-app-server/codex-app-server-process-manager.test.ts`
- This is weaker than the way Codex app-server documentation frames work:
  - app-server requests and skills are `cwd`-aware,
  - Codex worktree guidance recommends separate worktrees for parallel independent tasks,
  - local environment guidance assumes setup per worktree/directory.
- Practical interpretation:
  - one client per session/thread is unnecessary overhead because Codex app server supports multiple threads on one connection,
  - one global client for unrelated workspaces is the wrong isolation boundary,
  - one client per canonical `cwd` / worktree is the best-fit integration model.

### 11. Runtime-native local projection fallback is still structurally weak

- `AgentStreamHandler.forwardRuntimeEvent(...)` is currently the practical path that forwards runtime-native events into `RunHistoryService.onRuntimeEvent(...)`.
  - Evidence: `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- Without a websocket subscriber, runtime-native runs do not currently build a useful local raw-trace fallback, so `local_memory_projection` remains weak for Codex and Claude runs.
  - Evidence: `autobyteus-server-ts/src/run-history/services/run-history-service.ts`
  - Evidence: `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-projection-provider.ts`
- This is a real repository weakness, but it is a broader follow-up than the immediate Codex app-server client-boundary correction.

### 12. Best-fit Codex follow-up improvement for this ticket

- Immediate implementation target:
  - replace the one-global-client process-manager behavior with a client registry keyed by canonicalized `cwd`,
  - reuse one app-server client for multiple threads in the same workspace/worktree,
  - avoid one-client-per-session overhead,
  - release per-`cwd` clients when no callers still hold them.
- Near-term follow-up still recommended, but not folded into this code slice:
  - runtime-native raw-trace persistence independent of websocket subscribers.

## Answer

### Current repository status

- Native `autobyteus` runtime: `Yes`, already supported.
- Codex runtime in this repo: `Yes`, now wired through workspace-local repo-skill materialization under `.codex/skills/`.
- Claude runtime in this repo: `Yes`, now wired through selected-skill prompt injection scoped to the agent-configured skills.

### Underlying runtime capability

- Codex app server: `Yes`, official app-server protocol supports skills.
- Claude Agent SDK: `Yes`, official SDK supports skills.

### Practical conclusion

The feature was feasible and is now implemented in the repository for both runtimes. The decisive Codex-specific finding from investigation was that custom skills work as repo-scoped workspace skills under `.codex/skills/`, not as direct turn-level path attachments. The repository now follows that contract and keeps the Codex client boundary scoped by canonical `cwd`.

## Codex Client-Boundary Recommendation

- Recommended boundary: one Codex app-server client/process per canonical `cwd` / workspace path.
- Reuse rule:
  - reuse the same client for multiple threads/runs that share the same workspace/worktree path,
  - do not reuse one global client across different workspace paths,
  - do not create one client per session/thread by default.
- Basis:
  - this best matches the official `cwd` / worktree framing in the Codex documentation while keeping process count reasonable.

## Implemented Outcome

### Codex

- Resolve configured `agentDef.skillNames` to concrete skill directories.
- Materialize the selected skills into workspace-local repo skill bundles under `.codex/skills/`.
- Preserve source `agents/openai.yaml` when present, and synthesize a minimal Codex-facing `agents/openai.yaml` when absent.
- Use conflict-safe directory aliases while relying on skill metadata/frontmatter names for the discovered skill name.
- Refresh leftover AutoByteus-owned workspace skill bundles from the current source contents before reuse.
- Stop depending on direct turn-level `skill` attachments or user-text mutation as the primary custom-skill mechanism.

### Claude

- Resolve the selected agent-configured skills during shared runtime bootstrap.
- Inject only those selected skills into the Claude turn preamble with absolute root-path guidance for skill-relative files.
- Preserve `NONE` suppression and unresolved-skill skip behavior.

## Verification Outcome

- Baseline Codex live projection passes.
- Codex live configured-skill execution passes and shows workspace-local `.codex/skills` materialization plus cleanup.
- Claude live configured-skill execution passes.
- Shared runtime bootstrap, Codex runtime wiring, Claude runtime wiring, and Codex `cwd`-scoped client reuse are covered by the refreshed unit suites.

### 13. Historical intermediate result after the canonical-`cwd` client fix

- Rerunning the baseline Codex live projection test after the canonical-`cwd` client fix now passes: the run projection materializes a non-empty assistant conversation.
  - Evidence command: `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.3-codex-spark pnpm exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "returns non-empty run projection conversation for completed codex runs" --no-watch`
- At this intermediate point, rerunning the Codex configured-skill live E2E no longer died at bootstrap, but it still failed functionally:
  - the run reaches `RUNNING` and then `IDLE`,
  - the assistant replies with the plain bootstrap/default answer (`READY`),
  - the configured-skill response token is absent.
  - Evidence command: `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.3-codex-spark pnpm exec vitest run tests/e2e/runtime/codex-runtime-configured-skills-graphql.e2e.test.ts --no-watch`
- Current repository behavior for Codex sends native `skill` input items, but it does not add any explicit textual reference to those configured skills in the turn text.
  - Evidence: `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts`
- Official Codex app-server documentation's skill invocation example includes both:
  - a `skill` input item, and
  - a text prompt that explicitly references `$<skill-name>`.
  - Source: `https://developers.openai.com/codex/app-server`
- Practical interpretation:
  - the canonical-`cwd` client fix removed one real Codex execution blocker,
  - but Codex skill item attachment alone is not sufficient for the desired configured-skill behavior in live execution here,
  - the remaining repository-side gap is Codex turn delivery: configured skills need an explicit reference hint in the text path, not only a native `skill` attachment.

### 14. Direct raw Codex probing shows that a text-path `$skill-name` hint still does not make path-attached custom skills execute

- A direct raw `codex app-server` probe using:
  - first turn: text containing `$probe-skill` plus a native `{"type":"skill","name","path"}` attachment,
  - second turn: the trigger prompt with the same `$probe-skill` hint and native `skill` attachment,
  still did **not** execute the custom skill.
- Observed behavior:
  - bootstrap turn completed normally and replied `READY` / `READY.`,
  - follow-up trigger turn completed normally but replied with the plain user text (`PROBE_TRIGGER`) instead of the skill response token.
- Practical meaning:
  - the previous `v3` design assumption was wrong,
  - explicit `$skill-name` text plus a direct `skill` attachment is still insufficient for custom configured-skill execution in the current Codex app-server version.

### 15. Codex discovers and successfully executes custom skills when they are repo-scoped workspace skills under `.codex/skills`

- Raw `skills/list` probing showed that a custom skill becomes discoverable when it lives under the active workspace at `.codex/skills/<skill-dir>/` and includes both:
  - `SKILL.md`
  - `agents/openai.yaml`
- The same probe did **not** surface the custom skill when it lived only in an arbitrary external temp directory passed via `extraSkillDirs`; the current app-server build ignored that attempt for custom discovery.
- A direct raw `codex app-server` execution probe then confirmed the repo-scoped custom skill behavior:
  - workspace-local repo skill at `.codex/skills/probe-skill/`
  - `agents/openai.yaml` with `policy.allow_implicit_invocation: true`
  - first turn `Reply with READY.` -> `READY`
  - second turn `Use $probe-skill. PROBE_TRIGGER` -> `PROBE_RESPONSE`
  - third turn `PROBE_TRIGGER` -> `PROBE_RESPONSE`
- Practical meaning:
  - Codex does support custom skills for this use case,
  - but the working integration contract is repo-scoped workspace skill discovery, not direct turn-level path attachments alone.

### 16. The Codex integration design must shift from turn-level skill attachments to workspace-local repo-skill materialization

- The correct Codex-side strategy is now:
  - resolve configured skills through `SkillService`,
  - materialize them into the active workspace under `.codex/skills/<generated-or-conflict-safe-name>/`,
  - preserve or synthesize `agents/openai.yaml`,
  - let Codex discover them as repo-scoped skills during session startup,
  - stop depending on turn-level native `skill` attachments and user-text mutation as the primary custom-skill mechanism.
- This also explains why the current live configured-skill proof stayed incomplete:
  - the repository was still using the wrong Codex skill-delivery mechanism.

### 17. Workspace-local repo-skill materialization now proves the final Codex contract end to end

- After implementing workspace-local skill materialization, live provider-backed Codex configured-skill execution passes.
  - Evidence command: `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.3-codex-spark pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-configured-skills-graphql.e2e.test.ts --no-watch`
- Live provider-backed Claude configured-skill execution also passes after the shared runtime-context wiring.
  - Evidence command: `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-configured-skills-graphql.e2e.test.ts --no-watch`
- A direct raw `skills/list` probe showed that Codex uses the skill metadata/frontmatter name, not the directory alias, as the discovered skill name. That makes conflict-safe generated directory names workable for AutoByteus-owned mirrored bundles.
- A final unit follow-up also fixed a repository-owned robustness gap: if an AutoByteus-owned mirrored workspace skill bundle is left behind, the materializer now refreshes it from the source skill contents instead of silently reusing stale files.
