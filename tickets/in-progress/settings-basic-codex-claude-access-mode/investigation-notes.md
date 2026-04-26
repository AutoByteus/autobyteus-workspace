# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated worktree and draft artifacts created.
- Current Status: Requirements are user-approved and design-ready for Codex-only scope.
- Investigation Goal: Determine how Codex and Claude access/sandbox settings are currently modeled, surfaced, and persisted, then define the approved Codex-only Basic Settings change without inventing unsupported Claude controls.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The visible request is a settings UI improvement, but correct implementation crosses frontend settings UI, server settings metadata/validation, and Codex runtime normalization.
- Scope Summary: Add a discoverable Basic Settings card for Codex sandbox mode, backed by validated predefined server setting metadata and the existing Codex runtime env setting. Leave Claude unchanged.
- Primary Questions Resolved:
  - Where does Server Settings -> Basics define its blocks/cards?
  - Why does `CODEX_APP_SERVER_SANDBOX` show as `Custom user-defined setting`?
  - What are the valid Codex sandbox/access values and current runtime default?
  - Does Claude have the same product problem in a clear enough way to include now?
  - What owner should define Codex sandbox-mode validation/resolution so UI and runtime stay aligned?

## Request Context

User supplied a screenshot of an Advanced Settings row for `CODEX_APP_SERVER_SANDBOX` with value `danger-full-access` and generic description `Custom user-defined setting`. User described the UX problem: end users cannot reasonably know which advanced key to use. User initially suggested adding one extra Basic Settings block/toggle for Codex and maybe Claude, then clarified after analysis that the current scope should be Codex only because Claude permission/sandbox semantics are unclear.

Final user-approved direction: **only add Codex for the current scope; keep Claude unchanged**.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/in-progress/settings-basic-codex-claude-access-mode`
- Current Branch: `codex/settings-basic-codex-claude-access-mode`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` completed successfully on 2026-04-26 before worktree creation.
- Task Branch: `codex/settings-basic-codex-claude-access-mode`, tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Do not use the original shared checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` for authoritative changes; use the task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-26 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref --short refs/remotes/origin/HEAD` | Discover original workspace, branch, remote, and default branch | Original checkout is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal...origin/personal`; remote default is `origin/personal`. | No |
| 2026-04-26 | Command | `git fetch --prune origin && git worktree list --porcelain` | Refresh tracked refs and identify existing dedicated worktrees | Fetch succeeded; no exact existing worktree for this task found. | No |
| 2026-04-26 | Command | `git worktree add -b codex/settings-basic-codex-claude-access-mode /Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode origin/personal` | Create dedicated task branch/worktree from refreshed base | Worktree created at HEAD `81f6c823` from `origin/personal`. | No |
| 2026-04-26 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Follow solution designer workflow | Requires dedicated worktree, requirements doc, investigation notes, design spec after approval, and architecture review handoff. | No |
| 2026-04-26 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Load canonical design guidance | Design must be spine-led, ownership-led, avoid boundary bypass, and reuse existing capability areas. | No |
| 2026-04-26 | Command | `rg -n "CODEX_APP_SERVER_SANDBOX|CLAUDE_AGENT_SDK_PERMISSION_MODE|bypassPermissions|danger-full-access|read-only|workspace-write|acceptEdits|permissionMode" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web autobyteus-ts -S` | Find runtime setting references and current implementation points | Codex env key is read in Codex bootstrapper. Claude env key appears in docs/tickets only, not active source. Claude active code uses `permissionMode` derived from `autoExecuteTools`. | No |
| 2026-04-26 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts` | Inspect server settings metadata/visibility/update behavior | Predefined settings do not include `CODEX_APP_SERVER_SANDBOX`. Unknown keys are described as `Custom user-defined setting`, editable, and deletable. `updateSetting` currently accepts any key/value unless the key is registered non-editable. | Yes: add predefined registration and value validation for Codex sandbox key. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/config/app-config.ts` | Verify persistence side effects | `AppConfig.set` writes `configData`, updates `process.env`, and updates `.env` when possible. Saved settings can affect future runtime bootstraps that read `process.env`. | No |
| 2026-04-26 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Inspect Codex sandbox behavior | `normalizeSandboxMode()` reads `process.env.CODEX_APP_SERVER_SANDBOX`, accepts `read-only`, `workspace-write`, `danger-full-access`, and falls back to `workspace-write`. `buildThreadConfig()` passes that sandbox into new Codex thread config. | Yes: centralize/reuse validation metadata or delegate resolver to shared Codex sandbox setting owner. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Inspect Codex thread config type | `CodexSandboxMode` union defines the same three values. | Yes: avoid duplicating this union across runtime and server settings validation. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | Inspect Codex restore/history path | Resume path also calls `normalizeSandboxMode()` for sandbox. | Yes: shared normalizer must preserve both create and resume behavior. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Inspect remote Codex thread call | Thread manager passes `config.sandbox` to `thread/start` and `thread/resume`. | No |
| 2026-04-26 | Code | `autobyteus-web/components/settings/ServerSettingsManager.vue` | Inspect Basic and Advanced settings UI | Basics renders endpoint quick cards, `ApplicationsFeatureToggleCard`, Web Search, and `CompactionConfigCard`. Advanced renders raw table for `store.settings`. | Yes: add a normal Basic card/block using current styling. |
| 2026-04-26 | Code | `autobyteus-web/components/settings/CompactionConfigCard.vue` | Find pattern for user-friendly env-backed settings | Compaction card maps friendly inputs to env-backed settings via `serverSettingsStore.updateServerSetting`. Good pattern for the new Codex card. | No |
| 2026-04-26 | Code | `autobyteus-web/stores/serverSettings.ts` | Inspect frontend settings persistence owner | Store fetches/reloads settings through GraphQL and updates one setting through `UPDATE_SERVER_SETTING`, then reloads settings. | No |
| 2026-04-26 | Code | `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts`, `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | Inspect frontend test style | Tests mount with testing Pinia, stub child cards, and assert store calls. New card should have focused component tests; manager test should assert card placement/stub. | No |
| 2026-04-26 | Code | `autobyteus-server-ts/tests/unit/services/server-settings-service.test.js` | Inspect backend test style | Existing tests cover server settings list/update/delete. New tests should extend this suite for Codex setting validation and metadata. | No |
| 2026-04-26 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Evaluate whether Claude belongs in current scope | Current code maps `autoExecuteTools` to `bypassPermissions`/`default`; it does not read `CLAUDE_AGENT_SDK_PERMISSION_MODE`. `permissionMode` is passed to SDK as permission/tool approval behavior, not Codex-style sandbox selection. | No for current ticket; Claude deferred. |
| 2026-04-26 | Code | `autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts` | Inspect AutoByteus-native `autoExecuteTools` semantics | `autoExecuteTools` bypasses the pending approval queue and enqueues tool invocation execution immediately. | No |
| 2026-04-26 | Doc | `README.md` and `autobyteus-server-ts/README.md` runtime sandbox sections | Verify documented operator knobs | Docs list Codex sandbox env values. Docs also mention Claude permission-mode env values, but current active code does not implement the Claude env read. | Codex docs may need UI mention during delivery; Claude docs are outside this scope unless delivery identifies direct impact. |
| 2026-04-26 | Web | Anthropic Agent SDK permissions docs: `https://platform.claude.com/docs/en/agent-sdk/permissions` | Verify what Claude permission mode semantically means | Official docs describe permission modes as control over tool-use permission behavior. This is not equivalent to Codex filesystem sandbox mode. | No; used only to decide Claude out of current scope. |
| 2026-04-26 | Web | Claude Code settings docs: `https://code.claude.com/docs/en/settings` and sandboxing docs: `https://code.claude.com/docs/en/sandboxing` | Check whether Claude has separate sandbox concepts | Claude has sandbox settings separate from permission defaults. The app does not currently expose a clear Claude sandbox setting. | No; separate future requirement if product wants Claude sandbox UI. |
| 2026-04-26 | Command | `sed`/`rg` reads of current artifacts and relevant files during final Codex-only scope update | Refresh current code/artifact state before design | Confirmed only ticket artifacts are currently untracked; no source edits made by solution design stage. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User opens `Settings -> Server Settings -> Basics` or `Advanced` via `ServerSettingsManager.vue`.
- Current settings execution flow:
  1. `ServerSettingsManager.vue` mounts and calls `serverSettingsStore.fetchServerSettings()` and `fetchSearchConfig()`.
  2. `serverSettingsStore` queries GraphQL `getServerSettings`.
  3. `ServerSettingsResolver.getServerSettings()` delegates to `ServerSettingsService.getAvailableSettings()`.
  4. `ServerSettingsService` returns predefined settings when present/effective and treats any unknown key from config data as a custom setting.
  5. Advanced raw table renders every returned setting row. Basics renders only hardcoded quick cards and specialized cards; it does not include Codex sandbox mode.
- Current Codex runtime flow:
  1. Codex create/restore paths build or resume a Codex thread.
  2. Codex bootstrap/history code calls `normalizeSandboxMode()`.
  3. `normalizeSandboxMode()` reads `process.env.CODEX_APP_SERVER_SANDBOX`, accepts `read-only`, `workspace-write`, or `danger-full-access`, and falls back to `workspace-write` on missing/invalid value.
  4. `CodexThreadManager` sends the resolved sandbox value to the Codex app server `thread/start` or `thread/resume` request.
- Ownership or boundary observations:
  - Existing settings persistence owner is `ServerSettingsService` + `AppConfig`; frontend should not bypass it.
  - Basic user-friendly cards are presentation/adaptation owners that map friendly inputs to server setting writes through `serverSettingsStore`.
  - Codex sandbox resolution currently lives inside Codex bootstrapper as local constants; server settings cannot validate against those constants without duplication or extraction.
  - `autoExecuteTools` is the current app-level approval shortcut, not a sandbox control.
- Current behavior summary: Codex access mode is technically configurable via raw key-value setting because `AppConfig.set` updates `process.env`, but the UI exposes it as an advanced custom key with no validation. Claude is intentionally out of current scope because current app semantics map `autoExecuteTools` to Claude permission mode and do not expose a clear Claude sandbox setting.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Server Settings page Basics/Advanced composition | Basics card layout already exists; Advanced raw table shows all server settings. | Add a new Codex card to Basics; keep Advanced raw table unchanged except through better backend metadata. |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | Friendly card for env-backed runtime compaction settings | Saves canonical values through `serverSettingsStore.updateServerSetting`. | Use as the pattern for a new Codex sandbox card. |
| `autobyteus-web/stores/serverSettings.ts` | Frontend authoritative server settings fetch/update/reload store | Existing `updateServerSetting` handles persistence and reload. | Reuse this store; no new frontend persistence path. |
| `autobyteus-web/localization/messages/en/settings.ts`, `autobyteus-web/localization/messages/zh-CN/settings.ts`, generated catalogs | Settings UI copy catalogs | Compaction card uses localization messages; generated catalogs are committed. | Add localized copy for the new Codex card if the component follows current localized-card pattern. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server settings list/update/delete metadata owner | Codex sandbox key is not predefined; unknown rows use generic custom description; no value validation. | Extend this owner to register and validate `CODEX_APP_SERVER_SANDBOX`. |
| `autobyteus-server-ts/src/config/app-config.ts` | Env/config data persistence | `set` updates `process.env` and `.env`. | Future Codex sessions can read saved values without restart. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex run bootstrap and sandbox normalization | Reads `CODEX_APP_SERVER_SANDBOX`; default/valid values are local constants. | Keep runtime behavior but centralize/delegate value metadata for validation. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | Codex thread resume from history | Uses `normalizeSandboxMode()` for resumed threads. | Preserve the exported normalizer contract or update imports cleanly. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Codex thread config type | `CodexSandboxMode` union defines all accepted values. | Move or import the type from the shared Codex sandbox setting module to avoid duplicate runtime/server definitions. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Codex app-server thread request adapter | Passes `config.sandbox` through to `thread/start`/`thread/resume`. | No change expected besides typed value source. |
| `README.md`, `autobyteus-server-ts/README.md` | Operator docs | Codex env knob is documented; Claude docs are less aligned with current active source. | Delivery should decide whether to mention the new Basic UI for Codex. Claude docs are not an implementation target in this scope. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-26 | Static trace | `rg -n "CODEX_APP_SERVER_SANDBOX" autobyteus-server-ts/src ...` | Active code reads the Codex env key in Codex bootstrapper; resume path reuses `normalizeSandboxMode()`. | Codex Basic UI can persist the key now, but validation/metadata should be added. |
| 2026-04-26 | Static trace | `rg -n "Custom user-defined setting" ...` and code read | `ServerSettingsService` assigns this description to unknown keys. | Screenshot is explained by missing predefined registration for `CODEX_APP_SERVER_SANDBOX`. |
| 2026-04-26 | Static trace | `rg -n "CLAUDE_AGENT_SDK_PERMISSION_MODE" -S .` | Active source contains no runtime read of the Claude env key; README and historical ticket artifacts mention it. | Claude setting UI is not appropriate in current Codex-only scope. |

## External / Public Source Findings

- Anthropic Agent SDK permissions docs (`https://platform.claude.com/docs/en/agent-sdk/permissions`, checked 2026-04-26): Claude permission modes govern tool-use permission behavior. This supports not describing Claude permission mode as Codex-style sandboxing.
- Claude Code settings and sandboxing docs (`https://code.claude.com/docs/en/settings`, `https://code.claude.com/docs/en/sandboxing`, checked 2026-04-26): Claude has separate sandbox concepts/settings from permission defaults. The current app does not expose a clear Claude sandbox setting, so Claude should remain out of this scope.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation command in the source log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. `autoExecuteTools` is already used as an auto-approval intent. It is separate from Codex sandbox mode and must remain unchanged.
2. Codex already has runtime support for the requested sandbox setting but lacks product-facing Basic UI and predefined server setting metadata/validation.
3. `CODEX_APP_SERVER_SANDBOX` valid canonical values are `read-only`, `workspace-write`, and `danger-full-access`; default is `workspace-write`.
4. Persisting through current settings APIs updates `process.env`, so future Codex sessions can pick up changes without server restart.
5. Existing Basic cards provide a clear implementation pattern: local user-friendly state, canonical value serialization, `serverSettingsStore.updateServerSetting`, and refresh.
6. Claude permission mode is not the same as Codex sandboxing and is not a target for this ticket after user clarification.

## Constraints / Dependencies / Compatibility Facts

- Existing `autoExecuteTools` behavior is an approval/prompt shortcut and is separate from Codex sandbox. It should not be renamed or treated as sandbox access.
- Invalid values currently can be saved for any custom key; predefined Codex sandbox key needs explicit validation to avoid UI/runtime drift.
- Existing active Codex runs should not be expected to change mode after a settings save.
- Advanced Settings custom rows must remain usable for unrelated custom settings.
- Claude must remain unchanged in this scope.

## Open Unknowns / Risks

- Product copy for `danger-full-access` must be direct enough to warn that it disables filesystem sandboxing.
- If product later asks for a binary toggle instead of a three-mode selector, a follow-up requirement/design change will be needed.
- Future runtime-decoupling work may have an alternate location for Codex sandbox settings; implementation should reconcile before final delivery if such changes are present.

## Notes For Architect Reviewer

Architecture review should focus on the Codex sandbox-mode ownership boundary. The target should have one server-side source for Codex sandbox key/default/valid-value validation used by both server settings metadata and Codex runtime normalization, while the frontend card remains a thin friendly adapter over the existing server settings store. Avoid a design where the UI hardcodes accepted values that the backend does not validate, and avoid adding Claude controls in this approved Codex-only scope.
