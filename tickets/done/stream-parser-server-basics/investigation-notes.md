# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Re-entered after code-review Design Impact; revised design ready for architecture review
- Investigation Goal: Understand how Server Settings → Basics cards read/write server configuration and how `AUTOBYTEUS_STREAM_PARSER` is represented so a first-class XML toggle can be added cleanly.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The feature is localized, but code review found a source-size design impact requiring Server Settings UI extraction in addition to backend predefined metadata/validation and test coverage.
- Scope Summary: Add a Server Settings → Basics card that toggles the XML override for `AUTOBYTEUS_STREAM_PARSER`, preserve Advanced control, and split the oversized Server Settings manager so changed source files pass the hard size gate.
- Primary Questions To Resolve:
  - Which frontend components own Server Settings → Basics cards? Resolved: `ServerSettingsManager.vue` renders the card grids; standalone cards live under `components/settings/`.
  - What is the authoritative data source and save path for server settings? Resolved: `stores/serverSettings.ts` via GraphQL queries/mutations.
  - How does Advanced settings store arbitrary key/value config? Resolved: same `serverSettingsStore` and GraphQL boundary; custom keys are deletable unless registered as predefined by backend.
  - What clear/delete semantics are used for environment-like settings? Resolved: predefined settings are not deletable; common Basics cards save canonical default values instead of deleting.
  - Is there existing backend validation or typing for `AUTOBYTEUS_STREAM_PARSER`? Resolved: no server predefined metadata exists yet; runtime supports values in `autobyteus-ts`.

## Request Context

User reports AutoByteus supports `AUTOBYTEUS_STREAM_PARSER`, and they can currently set it to `xml` only through Server Settings → Advanced. They want one configuration card in Server Settings → Basics, following existing Basics card conventions, with a single default-off toggle that turns XML stream parsing on/off.

User-provided screenshot shows Server Settings → Basics with existing cards such as Codex full access, Featured catalog items, Web Search Configuration, and Compaction config.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/stream-parser-server-basics`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/stream-parser-server-basics/tickets/done/stream-parser-server-basics`
- Current Branch: `codex/stream-parser-server-basics`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/stream-parser-server-basics`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-08.
- Task Branch: `codex/stream-parser-server-basics` created from `origin/personal` at `7738faa4956cd9925825e24baae77bb1a47a81a4`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Work must happen in the dedicated task worktree, not the original `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-08 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch -vv --no-abbrev && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository state and base branch | Starting checkout was `personal` tracking `origin/personal`; remote default resolves to `origin/personal`. | No |
| 2026-05-08 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree | Completed successfully. | No |
| 2026-05-08 | Command | `git worktree add -b codex/stream-parser-server-basics /Users/normy/autobyteus_org/autobyteus-worktrees/stream-parser-server-basics origin/personal` | Create dedicated ticket worktree/branch | Created task branch from `origin/personal` at `7738faa4956cd9925825e24baae77bb1a47a81a4`. | No |
| 2026-05-08 | Command | `rg -n` search for Server Settings, parser, and featured catalog terms across `autobyteus-web`, `autobyteus-server-ts`, and `autobyteus-ts` | Locate settings UI and runtime parser references | Found `ServerSettingsManager.vue`, `stores/serverSettings.ts`, `server-settings-service.ts`, parser docs, and `autobyteus-ts/src/utils/tool-call-format.ts`. | No |
| 2026-05-08 | Code | `autobyteus-web/components/settings/ServerSettingsManager.vue` lines 13-180, 413-940 | Determine Basics card layout and state sync | Basics renders endpoint quick cards followed by standalone cards. Existing quick save/icon classes and settings-store watchers are available. Standalone cards are imported at lines 419-423 and rendered at lines 155-158 plus Web Search/Compaction. | Add new card import/render and test stub. |
| 2026-05-08 | Code | `autobyteus-web/components/settings/CodexFullAccessCard.vue` lines 1-136 | Identify closest boolean-to-string setting pattern | Component maps a switch to string values, treats only target value as on, preserves dirty state across store refresh, and saves via `store.updateServerSetting`. | Reuse pattern for Streaming parser card. |
| 2026-05-08 | Code | `autobyteus-web/stores/serverSettings.ts` lines 124-377 | Verify frontend authoritative settings boundary | Store owns settings state, `getSettingByKey`, fetch/reload with bound-backend readiness, update/delete mutations, and reload-after-save. | New card should use this store only. |
| 2026-05-08 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts` lines 30-340 | Verify backend metadata/validation/persistence owner | `ServerSettingsService` registers predefined settings, validates/normalizes predefined values, persists via `AppConfig.set`, exposes settings with descriptions/editable/deletable metadata, and rejects deletion of predefined settings. | Register `AUTOBYTEUS_STREAM_PARSER` as predefined with validation. |
| 2026-05-08 | Code | `autobyteus-server-ts/src/api/graphql/types/server-settings.ts` lines 48-103 | Verify GraphQL settings boundary | `getServerSettings`, `updateServerSetting`, and `deleteServerSetting` delegate to `ServerSettingsService`. | No new GraphQL API required. |
| 2026-05-08 | Code | `autobyteus-server-ts/src/config/app-config.ts` lines 438-503 | Verify persistence side effects | `AppConfig.set` updates `configData`, `process.env`, and `.env`; `delete` removes both process/env-file entries. | Saved setting affects future runtime reads through `process.env`. |
| 2026-05-08 | Code | `autobyteus-ts/src/utils/tool-call-format.ts` lines 5-26 | Identify runtime-supported parser values and default | `AUTOBYTEUS_STREAM_PARSER`; valid values: `xml`, `json`, `sentinel`, `api_tool_call`; unset/invalid resolves to `api_tool_call`. | Backend should validate same value set; Basics off should save `api_tool_call`. |
| 2026-05-08 | Code | `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts` lines 35-107 | Verify runtime effect of parser values | `api_tool_call` uses provider-native tool schema path; `xml`/`json`/`sentinel` select parser-backed handlers; provider fallback is XML for Anthropic and JSON otherwise when not API-tool-call. | UI copy should say changes apply to future streamed responses/handlers. |
| 2026-05-08 | Code | `autobyteus-web/components/settings/__tests__/CodexFullAccessCard.spec.ts` lines 60-129 | Identify focused card-test pattern | Tests cover rendering one switch, initialization for absent/invalid/valid values, dirty preservation, and save values. | Mirror for Streaming parser card. |
| 2026-05-08 | Code | `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts` lines 50-149 | Identify placement-test pattern | Manager test stubs child cards and verifies standalone card stubs render in Basics. | Add new stub/assertion. |
| 2026-05-08 | Code | `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts` | Identify backend predefined-setting tests | Existing tests cover exposed metadata, normalization, invalid value rejection, deletion rejection, and side effects. | Add stream parser cases. |
| 2026-05-08 | Code | `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Identify GraphQL settings e2e pattern | Existing Codex/media tests verify predefined metadata through GraphQL, persistence to `process.env`/`.env`, and invalid-value rejection. | Add stream parser GraphQL e2e case and env cleanup. |
| 2026-05-08 | Doc | `autobyteus-web/docs/settings.md` lines 199-245 | Identify durable settings docs | Server Settings docs list Basics cards and Advanced predefined settings. | Delivery/docs pass should add Streaming parser card. |
| 2026-05-08 | Doc | `autobyteus-ts/docs/tool_call_formatting_and_parsing.md`, `autobyteus-ts/docs/streaming_parser_design.md` | Verify public/internal stream parser semantics | Docs already describe `AUTOBYTEUS_STREAM_PARSER` values and default `api_tool_call`. Some older section text says `xml (default)` in a local bullet, but the later Configuration section and code say unset defaults to `api_tool_call`. | Avoid changing runtime semantics; consider docs cleanup only if delivery sees durable-doc impact. |
| 2026-05-08 | Other | `tickets/done/stream-parser-server-basics/review-report.md` | Read code-review Design Impact return | Code review failed on `CR-001`: changed `ServerSettingsManager.vue` has `886` effective non-empty lines, above the hard `500` line source-size gate. Functional implementation was otherwise coherent. | Yes: revise design for source-size-safe split. |
| 2026-05-08 | Command | `python3 - <<'PY' ... count ServerSettingsManager.vue lines ... PY` | Verify source-size evidence locally | Current `ServerSettingsManager.vue` has `1005` physical lines and `886` effective non-empty lines. Quick template is about `238` non-empty lines and script is about `487` non-empty lines. | Yes: extract Basics endpoint/search/card composition. |
| 2026-05-08 | Code | `autobyteus-web/components/settings/StreamingParserCard.vue` | Confirm functional card implementation before rework | Card is focused and below size limits; code review found no functional blocker. | Keep. |
| 2026-05-08 | Code | `autobyteus-server-ts/src/config/stream-parser-setting.ts`, `autobyteus-ts/src/utils/tool-call-format.ts` | Confirm backend/runtime helper implementation before rework | Runtime constants are exported and reused server-side; code review found no blocker. | Keep. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User opens `pages/settings.vue`, selects Server Settings → Basics, which mounts `ServerSettingsManager` with `sectionMode="quick"`.
- Current execution flow:
  1. `ServerSettingsManager.onMounted` calls `store.fetchServerSettings()` and `store.fetchSearchConfig()`.
  2. `serverSettingsStore.fetchServerSettings()` waits for bound backend readiness, runs `GET_SERVER_SETTINGS`, and stores returned settings.
  3. Existing cards read relevant keys from `serverSettingsStore.settings` using `getSettingByKey` or local maps.
  4. Existing cards save by calling `serverSettingsStore.updateServerSetting(key, value)`, which runs the GraphQL mutation and then reloads settings.
  5. Advanced renders `store.settings` directly and allows editing/removing based on backend `isEditable`/`isDeletable` metadata.
- Ownership or boundary observations:
  - `ServerSettingsManager` owns the page/card composition and advanced table presentation.
  - Individual cards own their local draft state and user interaction semantics.
  - `serverSettingsStore` owns frontend settings transport/cache/reload concerns.
  - `ServerSettingsService` owns backend setting metadata, validation, normalization, and persistence to `AppConfig`.
  - `autobyteus-ts` runtime owns interpretation of `AUTOBYTEUS_STREAM_PARSER` while constructing future streaming handlers.
- Current behavior summary: `AUTOBYTEUS_STREAM_PARSER` can be added manually as a custom Advanced setting; it has no Basics card and no server predefined metadata/validation.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift after code-review re-entry
- Refactor posture evidence summary: Functional boundaries remain correct, but `ServerSettingsManager.vue` is an oversized changed source file. The design must now extract Basics composition, endpoint quick setup, and Web Search form logic into focused components before implementation can pass code review.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ServerSettingsManager.vue` | Existing Basics page already composes standalone server behavior cards. | Additive card placement is healthy. | Add component import/render. |
| `CodexFullAccessCard.vue` | Existing env-backed boolean toggle maps to string values and saves through store. | New card should reuse this pattern; no new state owner required. | Implement similarly. |
| `serverSettingsStore.ts` | Existing update path already reloads settings and handles bound backend readiness. | Card should not use direct GraphQL or local persistence. | Use store. |
| `ServerSettingsService` | Existing predefined setting registration validates Codex sandbox and featured catalog settings. | First-class parser setting should be registered here. | Add metadata/validation. |
| `tool-call-format.ts` | Runtime has a clear key/value set and default. | UI can be a thin persisted-setting control; no runtime refactor needed. | Keep runtime unchanged. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | Settings navigation and section mode selection | Mounts `ServerSettingsManager` for Server Settings. | No change expected. |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Oversized Server Settings page composition, quick endpoint cards, Advanced table, search config section | Direct import/render of `StreamingParserCard` leaves this changed file above the hard source-size gate. | Refactor: keep manager as shell/Advanced owner and extract Basics composition, endpoint cards, and Web Search card. |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Friendly Basics toggle for `CODEX_APP_SERVER_SANDBOX` | Best implementation pattern for boolean-to-string env setting. | Mirror structure and state logic. |
| `autobyteus-web/stores/serverSettings.ts` | Frontend server settings cache and GraphQL mutation boundary | Exposes `getSettingByKey`, `updateServerSetting`, `deleteServerSetting`, `reloadServerSettings`. | New card should depend only on this store for persistence. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Backend settings metadata, validation, persistence, visibility | No `AUTOBYTEUS_STREAM_PARSER` predefined setting today. | Add predefined metadata/validation. |
| `autobyteus-server-ts/src/api/graphql/types/server-settings.ts` | GraphQL settings resolver | Delegates generic settings operations to service. | No new GraphQL field/mutation required. |
| `autobyteus-server-ts/src/config/app-config.ts` | Env-file/process.env persistence | `set` updates `process.env` and `.env`. | Saved parser values affect future runtime reads. |
| `autobyteus-ts/src/utils/tool-call-format.ts` | Runtime env parsing for tool-call format | Valid values and `api_tool_call` default. | Backend validation should align. |
| `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts` | Runtime streaming handler selection | Uses `api_tool_call` or parser-backed strategies based on resolved format. | No runtime change required. |
| `autobyteus-web/localization/messages/en/settings.ts` / `zh-CN/settings.ts` | Product-owned settings UI copy | Existing card copy lives here. | Add new card copy. |
| `autobyteus-web/components/settings/__tests__/CodexFullAccessCard.spec.ts` | Pattern for card tests | Covers key scenarios needed here. | Add analogous Streaming parser tests. |
| `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts` | Backend settings service tests | Covers predefined metadata/validation patterns. | Add stream parser tests. |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | GraphQL settings persistence tests | Covers predefined settings through real GraphQL schema. | Add stream parser e2e. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-08 | Code trace | Static trace from `ServerSettingsManager` → `serverSettingsStore` → GraphQL → `ServerSettingsService` → `AppConfig` | Existing settings card save path persists to `process.env` and `.env` then reloads settings. | New card can use the same path. |
| 2026-05-08 | Code trace | Static trace from `AUTOBYTEUS_STREAM_PARSER` in `tool-call-format.ts` → `StreamingResponseHandlerFactory` | `xml` forces parser-backed XML handling; `api_tool_call` uses provider-native schema stream path. | Off should map to `api_tool_call`; runtime behavior applies to future handler construction. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design; implementation can use existing Vitest suites.
- Required config, feature flags, env vars, or accounts: None beyond test-controlled `.env`/`process.env` for backend e2e.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Git worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. `AUTOBYTEUS_STREAM_PARSER` already has runtime behavior; the missing piece is product-facing configuration.
2. Server Settings Basics has the correct conceptual UI extension point and a close analog in `CodexFullAccessCard`, but its current implementation file is too large for direct edits.
3. Backend should not leave this first-class setting as a deletable custom setting; registering predefined metadata keeps Basics and Advanced coherent.
4. The implementation should avoid a full mode selector in Basics because the user asked for a single XML on/off toggle and Advanced remains the expert surface.
5. The safest off value is `api_tool_call`, because the main runtime resolver defaults to that when unset/invalid and docs identify it as provider-native tool calls.

## Constraints / Dependencies / Compatibility Facts

- Changed source implementation files must remain at or below `500` effective non-empty lines; current direct manager edit violates this.
- `ServerSettingsService.deleteSetting` rejects predefined settings; after registration, disabling should not depend on deletion.
- `serverSettingsStore.updateServerSetting` interprets a successful mutation by checking whether the returned string includes `successfully` and then reloads raw settings.
- Existing `getAvailableSettings` includes persisted config keys and predefined runtime-effective values, filtering API keys but not other keys.
- `resolveToolCallFormat()` accepts uppercase only indirectly by lowercasing at runtime; backend persistence should normalize to lowercase for consistency.
- Existing invalid persisted values can exist from before validation; the UI should render them as off and backend should reject future invalid replacement values.

## Open Unknowns / Risks

- Whether product prefers title text `Streaming parser`, `Stream parser`, or `XML streaming parser`. Design uses `Streaming parser` with toggle label `Use XML streaming parser`.
- Server Settings UI extraction must preserve current quick endpoint, Web Search, and Advanced behavior while moving ownership into smaller files.
- Whether future product asks for a full Basics selector. Current request is explicitly a single toggle, so selector is out of scope.
- `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` contains one older bullet saying `xml (default)` under parser strategies while code and later docs say unset defaults to `api_tool_call`; this task should not change runtime semantics, but delivery/docs sync may choose to clarify if touched.

## Notes For Architect Reviewer

- The design intentionally uses the existing generic settings boundary, not a new typed GraphQL mutation, because this mirrors `CodexFullAccessCard` and the subject is a simple env-backed runtime setting.
- The design intentionally adds backend predefined metadata/validation because the setting is becoming first-class and should no longer appear as an opaque custom key once saved.
- The design intentionally maps off to `api_tool_call` rather than delete/blank because predefined settings are non-deletable and `api_tool_call` is the documented canonical provider-native/default value.
- Re-entry design now requires extracting `ServerSettingsBasicsPanel.vue`, `ServerSettingsEndpointCards.vue`, and `WebSearchConfigurationCard.vue` before implementation returns to code review.
