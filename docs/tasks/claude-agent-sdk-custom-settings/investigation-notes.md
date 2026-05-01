# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design produced from evidence
- Investigation Goal: Determine how AutoByteus currently launches Claude Agent SDK / Claude Code, why user Claude Code settings are not picked up, and what product/server/UI design should enable custom Claude settings reliably.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The behavior crosses Claude SDK option construction, runtime model discovery, server settings persistence/validation, Docker/home-directory behavior, and frontend Server Settings → Basics UI.
- Scope Summary: Improve Claude runtime configuration so selecting Claude can honor user-configured Claude Code settings, with a Claude Code configuration card in server Basics analogous to Codex.
- Primary Questions To Resolve:
  1. Where does AutoByteus map a selected Claude runtime/model to Claude Agent SDK options?
  2. Does that path pass `settingSources`, `env`, `model`, `cwd`, or executable path options?
  3. What server settings model/API/UI already exists for Codex configuration?
  4. What durable configuration surface is safest for Claude Code custom gateway/model/env settings?
  5. What upstream Claude Agent SDK contract should the implementation rely on?

## Request Context

The user previously configured Claude Code CLI to use DeepSeek through custom Claude settings and confirmed the CLI shows Claude Code v2.1.126 using `deepseek-v4-flash`. The user reports AutoByteus/Claude Agent SDK does not pick up that model change and asks whether codebase improvements can make Claude selection use the custom Claude settings configuration. The user also suggests adding a Claude Code configuration card in server Basics, similar to Codex, if that makes configuration easier.

The user then clarified that investigation should include active probes/tests, such as running Claude Code and running SDK code with environment variables, not just static reading. This investigation includes both source inspection and live SDK probes.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings`
- Current Branch: `codex/claude-agent-sdk-custom-settings`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-01.
- Task Branch: `codex/claude-agent-sdk-custom-settings`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: The original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had untracked `docs/future-features/`; this task uses an isolated worktree to avoid touching that state.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-01 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap current repository state | Current checkout is git repo on `personal`, tracking `origin/personal`, with untracked `docs/future-features/`. | No |
| 2026-05-01 | Command | `git fetch origin --prune` | Refresh base branch refs before worktree creation | Remote refresh succeeded. | No |
| 2026-05-01 | Command | `git worktree add -b codex/claude-agent-sdk-custom-settings /Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings origin/personal` | Create dedicated task worktree/branch | Dedicated task branch created from `origin/personal`. | No |
| 2026-05-01 | Command | `cat .../solution-designer/SKILL.md`, `cat .../design-principles.md`, templates | Follow team solution-designer workflow | Required artifact templates and design principles loaded. | No |
| 2026-05-01 | Command | `command -v claude; claude --version; python3 mask/inspect ~/.claude/settings.json; env | grep ...` | Probe local Claude Code install and active user config without exposing secrets | `claude` resolves to `/Users/normy/.local/bin/claude`, version `2.1.126`; `~/.claude/settings.json` exists with `ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`, `ANTHROPIC_AUTH_TOKEN=<configured>`, and DeepSeek model aliases; shell env has `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `KIMI_API_KEY` configured but no `ANTHROPIC_BASE_URL` shown in shell env. | No |
| 2026-05-01 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Locate the Claude Agent SDK boundary and option construction | `buildQueryOptions(...)` passes `model`, `pathToClaudeCodeExecutable`, `permissionMode`, `cwd`, `env`, resume/MCP/tools, and only sets `settingSources: ["project"]` when `enableProjectSkillSettings` is true. Model discovery also omits `settingSources`. | Yes: design shared settings resolver. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-auth-environment.ts` | Understand process environment passed to SDK | Default `CLAUDE_AGENT_SDK_AUTH_MODE` resolves to `cli`; CLI mode deletes `ANTHROPIC_API_KEY`, `CLAUDE_CODE_API_KEY`, and `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR`, but does not load `~/.claude/settings.json` itself. | Yes: settings sources must load file env. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-executable-path.ts` | Check executable path override behavior | Existing env override keys are `CLAUDE_CODE_EXECUTABLE_PATH`, `CLAUDE_CODE_PATH`, and `CLAUDE_CLI_PATH`; default discovers `claude`. This can remain but should be owned by a launch config resolver. | No |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Trace runtime turn execution | `executeTurn(...)` calls `sdkClient.startQueryTurn(...)`, passing `enableProjectSkillSettings` only when materialized skills exist. | Yes: ensure project source is additive. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Trace session config bootstrap | `buildClaudeSessionConfig(...)` receives model directly from `runContext.config.llmModelIdentifier`; no Claude settings-source policy is resolved here. | No: keep policy at SDK client/launch config boundary. |
| 2026-05-01 | Code | `autobyteus-server-ts/src/llm-management/services/claude-model-catalog.ts` and `model-catalog-service.ts` | Determine model picker source for Claude runtime | Claude catalog delegates to `ClaudeSdkClient.listModels()`, so omitted `settingSources` affects the UI model picker/catalog too. | Yes |
| 2026-05-01 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts`, `autobyteus-web/components/settings/ServerSettingsManager.vue`, `CodexFullAccessCard.vue`, `autobyteus-web/stores/serverSettings.ts` | Inspect existing Server Settings → Basics card and persistence pattern | `CodexFullAccessCard` uses `updateServerSetting` for `CODEX_APP_SERVER_SANDBOX`; predefined settings can validate allowed values. Basics grid imports card components directly. | Yes: add Claude Code card using same pattern. |
| 2026-05-01 | Code | `autobyteus-server-ts/docker/README.md`, `autobyteus-server-ts/docker/Dockerfile.monorepo` | Check containerized Claude Code auth/config behavior | Docker image installs Claude Code, runs with `HOME=/root`, persists `/root`, and docs instruct `claude auth login` inside container; host credential folders are not mounted by default. User settings source in Docker means `/root/.claude/settings.json`. | Yes: docs/UI copy should mention active home/config path. |
| 2026-05-01 | Web | `site:docs.claude.com ... settingSources Claude Agent SDK` → `https://docs.claude.com/en/docs/agent-sdk/typescript` | Verify current upstream Agent SDK contract | Official docs say `settingSources` controls `user`, `project`, `local`; `user` maps to `~/.claude/settings.json`; omitted/undefined means SDK loads no filesystem settings; programmatic options override filesystem settings. | No |
| 2026-05-01 | Web | `https://docs.claude.com/en/docs/claude-code/sdk/sdk-overview` | Verify Agent SDK/Claude Code relationship and settings behavior | Official docs say Agent SDK is built on the agent harness that powers Claude Code and features work from same filesystem locations only when relevant `settingSources` are explicitly set. | No |
| 2026-05-01 | Web | `https://docs.anthropic.com/en/docs/claude-code/settings` | Verify Claude Code settings env behavior | Official docs say environment variables can be configured in `settings.json`; this supports user's `env` block pattern. | No |
| 2026-05-01 | Setup | `mkdir /tmp/claude-agent-sdk-probe-0271 && npm install @anthropic-ai/claude-agent-sdk@0.2.71 zod@4.3.6` | Install the exact SDK version used by `autobyteus-server-ts/package.json` for live probes without mutating repo dependencies | SDK installed in `/tmp`; package version confirmed `0.2.71`; types confirm omitted `settingSources` means no filesystem settings. | No |
| 2026-05-01 | Probe | `/tmp/claude-agent-sdk-probe-0271/probe.mjs` with SDK `query(... maxTurns:0 ...)`, cases with/without `settingSources` and AutoByteus-like env | Observe initialization/model list behavior without a full model turn | No `settingSources`: models are Anthropic defaults (`default`, `sonnet[1m]`, `opus[1m]`, `haiku`) or reduced defaults under AutoByteus-like env. With `settingSources:["user"]`: models include `deepseek-v4-flash` and aliases display as DeepSeek. | No |
| 2026-05-01 | Probe | `/tmp/claude-agent-sdk-probe-0271/probe-turn.mjs`, tiny `deepseek-v4-flash` turn with AutoByteus-like env | Prove actual turn behavior, not only initialization | Current AutoByteus-like options without user settings failed to produce token and returned Claude subscription/access error; adding `settingSources:["user"]` with the same env/model succeeded and returned the exact probe token. | No |

| 2026-05-01 | Other | User clarification after initial design handoff | Refine UX requirement | User does not want a complicated Server Basics settings-source selection. User expects that when users change Claude Code settings they intend Claude-backed sessions to use those settings automatically. | Update requirements/design to automatic default and simple status/help card. |
| 2026-05-01 | Other | Final user direction: "let us use what you suggested" after discussing no settings page | Lock product direction | Use automatic Claude Code settings inheritance; no settings-page selector/toggle. Runtime should load user/project/local; catalog should load user. | Design updated. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: A frontend/user launch config selects `runtimeKind: "claude_agent_sdk"` and an `llmModelIdentifier`; server `AgentRunManager` creates a Claude backend via `ClaudeAgentRunBackendFactory`.
- Current execution flow:
  1. `ClaudeAgentRunBackendFactory.createBackend(...)`
  2. `ClaudeSessionBootstrapper.bootstrapForCreate(...)`
  3. `buildClaudeSessionConfig({ model: runContext.config.llmModelIdentifier, ... })`
  4. `ClaudeSessionManager.createRunSession(...)`
  5. `ClaudeSession.sendTurn(...)`
  6. `ClaudeSession.executeTurn(...)`
  7. `ClaudeSdkClient.startQueryTurn(...)`
  8. `ClaudeSdkClient.buildQueryOptions(...)`
  9. `@anthropic-ai/claude-agent-sdk.query({ prompt, options })`
  10. Claude Code executable process / bundled runtime contacts provider.
- Ownership or boundary observations:
  - `ClaudeSdkClient` is the concrete boundary that translates AutoByteus runtime intent into Claude Agent SDK options.
  - `ClaudeSessionBootstrapper` owns run/session context bootstrap but currently should not own low-level SDK filesystem settings policy.
  - `ClaudeModelCatalog` delegates model discovery to `ClaudeSdkClient`, so catalog and turns need the same launch/settings resolver.
  - Server settings are already the durable runtime configuration source for Codex sandbox mode.
- Current behavior summary: AutoByteus launches SDK in isolation mode except project settings for materialized skills, so `~/.claude/settings.json` gateway env is not loaded for normal Claude turns or model discovery. This differs from the user's interactive `claude` CLI behavior.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Larger Requirement
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor posture evidence summary: Refactor needed at the SDK boundary because both query turns and model discovery need identical settings-source policy. Patching only turn execution would leave model picker/catalog mismatched.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User report | CLI `claude` uses `deepseek-v4-flash`; Agent SDK path does not. | There is a mismatch between interactive CLI configuration and SDK launch policy. | Address SDK launch policy. |
| Official SDK docs | Omitted `settingSources` means no filesystem settings. | Current code's omission is not a provider bug; AutoByteus must opt into user/project/local sources. | Implement explicit resolver. |
| `claude-sdk-client.ts` | Query turns set only project source when skills exist; catalog sets no source. | Policy is incomplete and duplicated/implicit. | Centralize. |
| Live SDK probe | Adding `settingSources:["user"]` makes DeepSeek appear and a DeepSeek turn succeed. | The proposed fix is technically viable with current SDK version. | Add tests. |
| Server settings service | Predefined validated settings exist. | A Claude configuration card can persist a validated settings-source setting without a new persistence system. | Extend settings service and UI. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Loads SDK module, builds query options, starts turns, discovers models, wraps SDK control | Missing user/local settings-source policy in both runtime and catalog paths. | This remains authoritative SDK boundary but should delegate launch config policy to a resolver. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-auth-environment.ts` | Builds spawn env according to Claude SDK auth mode | Does not and should not parse filesystem settings; only controls process env. | Keep as auth-env concern and compose it from launch config resolver. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-executable-path.ts` | Resolves usable Claude executable path | Existing env overrides are good; should remain part of launch config snapshot. | Reuse. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Owns Claude turn execution and tool/server construction | Decides when project skill settings are needed. | Continue passing an `includeProjectSettings` signal; do not hardcode full sources here. |
| `autobyteus-server-ts/src/llm-management/services/claude-model-catalog.ts` | Provides Claude runtime model catalog | Uses `ClaudeSdkClient.listModels()`. | Catalog must share resolver with runtime. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Predefined/custom server settings, validation, persistence | Good place to add `CLAUDE_AGENT_SDK_SETTING_SOURCES` metadata/validation. | Extend. |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Server Settings quick/basic and advanced UI | Imports `CodexFullAccessCard`; quick grid can add a Claude card. | Add `ClaudeCodeSettingsCard`. |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Simple settings card pattern | Provides save/dirty/error pattern for server setting. | Reuse pattern, not component internals. |
| `autobyteus-server-ts/docker/README.md` | Documents container runtime/auth | Notes `HOME=/root` and persisted `/root`; important for user settings. | Update docs if implementation changes. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-01 | Probe | `claude --version` | `2.1.126 (Claude Code)` at `/Users/normy/.local/bin/claude`. | SDK can use the same local binary via existing path resolver. |
| 2026-05-01 | Probe | Masked Python parse of `~/.claude/settings.json` | User config has DeepSeek `ANTHROPIC_BASE_URL`, configured auth token, and model aliases. | Loading `user` settings should be sufficient to reproduce CLI gateway behavior. |
| 2026-05-01 | Probe | SDK `query()` initialization with no `settingSources` | Models were default Claude/Anthropic aliases, not DeepSeek; with AutoByteus-like env, no DeepSeek model appeared. | Current AutoByteus-like SDK isolation explains missing model change. |
| 2026-05-01 | Probe | SDK `query()` initialization with `settingSources:["user"]` | Models included `deepseek-v4-flash`, and alias display names mapped to `deepseek-v4-flash`. | Explicit user settings source solves model discovery. |
| 2026-05-01 | Probe | Tiny SDK turn with AutoByteus-like env and `model:"deepseek-v4-flash"`, no `settingSources` | Did not return requested token; output included Claude subscription/access error. | Without user settings, SDK uses a non-DeepSeek auth/provider path. |
| 2026-05-01 | Probe | Same tiny SDK turn but with `settingSources:["user"]` | Returned exact token from `deepseek-v4-flash`. | Same env/model succeeds when user settings are loaded. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `https://docs.claude.com/en/docs/agent-sdk/typescript`
  - Version / tag / commit / freshness: Live docs consulted 2026-05-01; local package version `@anthropic-ai/claude-agent-sdk@0.2.71` types match the docs.
  - Relevant contract, behavior, or constraint learned: `settingSources` values are `user`, `project`, `local`; `user` maps to `~/.claude/settings.json`; omitted/undefined means no filesystem settings are loaded; programmatic options override filesystem settings.
  - Why it matters: AutoByteus must explicitly pass `settingSources` to reuse user Claude Code config.
- Public API / spec / issue / upstream source: `https://docs.claude.com/en/docs/claude-code/sdk/sdk-overview`
  - Relevant contract: Agent SDK is built on the agent harness that powers Claude Code, but filesystem-based features require explicit settings sources.
  - Why it matters: Confirms the mental model: same engine, isolated SDK instance unless configured.
- Public API / spec / issue / upstream source: `https://docs.anthropic.com/en/docs/claude-code/settings`
  - Relevant contract: Claude Code supports environment variables in `settings.json`.
  - Why it matters: Validates the user's `env` block setup as a supported Claude Code configuration shape.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static code investigation. Live SDK probes used the user's existing Claude Code/DeepSeek configuration and network access.
- Required config, feature flags, env vars, or accounts: Existing local `~/.claude/settings.json` and configured token values; secrets were masked and not written into artifacts.
- External repos, samples, or artifacts cloned/downloaded for investigation: None. A temporary npm package install was made under `/tmp/claude-agent-sdk-probe-0271`.
- Setup commands that materially affected the investigation:
  - `npm install @anthropic-ai/claude-agent-sdk@0.2.71 zod@4.3.6` in `/tmp/claude-agent-sdk-probe-0271`.
  - Temporary probe scripts `probe.mjs` and `probe-turn.mjs` in `/tmp/claude-agent-sdk-probe-0271`.
- Cleanup notes for temporary investigation-only setup: `/tmp/claude-agent-sdk-probe-0271` may be removed after design/review; it is outside the repository.

## Findings From Code / Docs / Data / Logs

1. Root cause is not that the Agent SDK cannot use Claude Code settings. It can use them when `settingSources` includes `user`.
2. Root cause is AutoByteus currently treating Claude Agent SDK as isolated by omission of settings sources in its SDK boundary.
3. The bug/behavior affects both runtime execution and model catalog/listing; both call through `ClaudeSdkClient`.
4. Existing code already forces the system `claude` binary with `pathToClaudeCodeExecutable`, so bundled-vs-system executable is not the primary issue in this repo.
5. Existing auth env logic intentionally deletes `ANTHROPIC_API_KEY` in CLI auth mode; this is compatible with user settings loading because `ANTHROPIC_AUTH_TOKEN` can be provided from `settings.json` by Claude Code after `user` source is enabled.
6. Server Basics has an established pattern for small runtime-control cards.

## Constraints / Dependencies / Compatibility Facts

- `@anthropic-ai/claude-agent-sdk` package version in lockfile is `0.2.71`.
- `settingSources` accepted values are `user`, `project`, `local`; invalid values should not be passed to SDK.
- Programmatic `model` overrides filesystem defaults. If a user wants the Claude Code default model from settings, the selected AutoByteus model should be `default` or the discovered gateway-backed model should be selected.
- Current `ServerSettingsService.getVisibleSettingKeys()` only hides keys ending in `_API_KEY`; it does not hide `_TOKEN` keys. The new card should avoid broad secret display and not add raw token fields.
- Docker user config path differs from host path: with `HOME=/root`, user settings are `/root/.claude/settings.json` inside the container.

## Open Unknowns / Risks

- Whether to default to `user` only or `user,project,local`. Evidence favors `user` default plus adding `project` only when project skills are materialized; loading `local` globally may surprise users.
- Whether a future masked secret editor should manage `ANTHROPIC_AUTH_TOKEN` or gateway-specific tokens. That is outside this change unless explicitly requested.
- Whether the UI model picker should auto-refresh after changing Claude settings-source values. The implementation should at least invalidate/reload runtime models after save if practical.

## Notes For Architect Reviewer

- The design should keep the authoritative SDK boundary in `runtime-management/claude/client`. Avoid scattering settings-source decisions into `ClaudeSession`, `ClaudeModelCatalog`, and UI callers.
- The project-skill behavior currently uses `settingSources:["project"]`. The new design must make this additive over the configured/default sources, not a replacement that drops `user`.
- The model catalog is part of the same runtime behavior. If only turn execution changes, the user can still fail to select gateway-backed models from the UI.

## User Simplification Refinement (2026-05-01)

After reviewing the first design direction, the user clarified that the Server Settings → Basics surface should not ask normal users to choose among multiple Claude Agent SDK settings sources. The user's product expectation is: if someone changed Claude Code settings, they almost certainly want Claude-backed AutoByteus sessions to use those settings. Therefore the refined design should default to automatic `user` settings loading and keep any UI card status/help-oriented rather than selector-oriented. An advanced operator override can exist for isolation, but it should not be part of the normal Basics flow.

## Final User Direction Refinement (2026-05-01)

The user approved the simplified automatic-inheritance recommendation: do not add a settings-page selector/toggle. The final product intent is that user-level Claude Code settings should be loaded automatically because changing those settings is itself the user intent signal, and project/local Claude Code settings should be loaded for project/workspace runs because providing a project signals project-level customization should apply. The design was revised to backend-only behavior: runtime settings sources `user,project,local`; catalog settings source `user`; no Server Settings UI control.
