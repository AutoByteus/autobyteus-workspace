# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready.

## Goal / Problem Statement

End users currently need to know the low-level Advanced Settings key `CODEX_APP_SERVER_SANDBOX` to configure Codex filesystem sandbox/access behavior. The supplied screenshot shows `CODEX_APP_SERVER_SANDBOX=danger-full-access` rendered with the generic description `Custom user-defined setting`, which means the product-facing UI is leaking an implementation key instead of guiding the user.

For the current approved scope, add a discoverable Basic Settings control for **Codex only**. Do not add Claude controls in this change: Claude permission modes are not the same as Codex sandbox modes, the current app does not explicitly wire a Claude sandbox setting, and product direction is to keep Claude unchanged until its sandbox/permission model is clarified separately.

## Investigation Findings

- `autobyteus-web/components/settings/ServerSettingsManager.vue` owns Server Settings -> Basics. It already uses card/block patterns for endpoint quick setup, Applications, Web Search, and Compaction.
- The Advanced table is the raw key-value editor. Unregistered keys receive the generic description `Custom user-defined setting` from `autobyteus-server-ts/src/services/server-settings-service.ts`, matching the screenshot.
- `CODEX_APP_SERVER_SANDBOX` is not registered as a predefined server setting today, but Codex runtime code already reads `process.env.CODEX_APP_SERVER_SANDBOX` in `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`.
- The current Codex valid canonical values are `read-only`, `workspace-write`, and `danger-full-access`; default is `workspace-write`.
- `autobyteus-server-ts/src/config/app-config.ts` updates both in-memory config and `process.env`, and writes to `.env` when available. New Codex sessions can pick up changed sandbox mode after the setting is saved because Codex resolves the env value during session/thread bootstrap.
- `autoExecuteTools` is an approval/prompt shortcut, not a sandbox setting. In Codex it maps to approval policy `never` versus `on-request`; this must remain separate from `CODEX_APP_SERVER_SANDBOX`.
- Claude was investigated and intentionally excluded from this scope. Current Claude code maps `autoExecuteTools` to `permissionMode: bypassPermissions` or `default`; it does not read `CLAUDE_AGENT_SDK_PERMISSION_MODE`, and Claude permission mode is a tool-approval concept rather than Codex-style filesystem sandboxing. Claude also has separate sandbox concepts in upstream docs, but the app does not currently expose a clear Claude sandbox setting.
- Access-mode changes are runtime/session bootstrap settings. They should be presented as applying to future/new Codex sessions, not as changing already-active sessions in place.

## Recommendations

- Add one Basic Settings card/block for **Codex Sandbox Mode** only.
- Use a selector or option-list, not a hidden custom text field. End users should choose friendly labels/descriptions while the app saves canonical values.
- Register and validate `CODEX_APP_SERVER_SANDBOX` as a predefined server setting so Advanced Settings no longer treats it as an opaque custom key when present.
- Reuse the existing `serverSettingsStore.updateServerSetting(...)` / GraphQL mutation path as the persistence owner; do not add a parallel settings write path.
- Keep `autoExecuteTools` unchanged and clearly separate from Codex sandbox mode.
- Leave Claude UI/runtime behavior unchanged in this ticket. Treat any Claude sandbox/permission product work as a separate requirement/design task.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-001: A user opens Server Settings -> Basics and sees a clear Codex sandbox mode control without opening Advanced Settings.
- UC-002: A user can change Codex sandbox mode through the Basic control and the value persists through the existing server settings write path.
- UC-003: A user who opens Advanced Settings still sees raw settings, but `CODEX_APP_SERVER_SANDBOX` is described as a predefined Codex runtime setting rather than as a generic custom row when present.
- UC-004: A user understands that saved Codex sandbox-mode changes affect future/new Codex sessions, not already-active sessions.

## Out of Scope

- Adding a Claude Basic Settings control.
- Changing Claude permission mode behavior or wiring `CLAUDE_AGENT_SDK_PERMISSION_MODE`.
- Adding or changing Claude sandbox settings.
- Replacing or renaming the existing per-run Auto-approve Tools / `autoExecuteTools` control.
- Redesigning the entire Server Settings page.
- Introducing a parallel settings persistence path separate from existing server settings.
- Supporting non-canonical aliases in the Basic UI; the Basic UI should save canonical values.

## Functional Requirements

- REQ-001: Server Settings -> Basics must expose Codex sandbox mode as a discoverable normal settings block/card, not only through Advanced custom-key editing.
- REQ-002: The Codex control must use end-user wording for all valid Codex modes while saving only the canonical backing values `read-only`, `workspace-write`, or `danger-full-access`.
- REQ-003: The Codex control must initialize from the persisted/effective `CODEX_APP_SERVER_SANDBOX` value when it is valid, and from the default `workspace-write` when no valid value is present.
- REQ-004: `CODEX_APP_SERVER_SANDBOX` must be registered as a predefined server setting with a specific Codex sandbox description, editable but not deletable from the predefined-settings perspective.
- REQ-005: Invalid `CODEX_APP_SERVER_SANDBOX` values must not be accepted through the server settings mutation once the key is predefined.
- REQ-006: Updating Codex sandbox mode from Basics must use the existing authoritative server settings store/API/mutation and then refresh settings through the existing load path.
- REQ-007: The Basic card must show copy that the setting applies to future/new Codex sessions.
- REQ-008: Existing Advanced Settings custom-key add/edit/remove behavior must continue to work for unrelated custom keys.
- REQ-009: The app-level Auto-approve Tools / `autoExecuteTools` behavior must remain unchanged and must not be presented as Codex sandbox mode.
- REQ-010: Claude must remain unchanged in this scope; no Claude selector, no Claude permission-mode resolver change, and no Claude sandbox setting should be added.

## Acceptance Criteria

- AC-001: Server Settings -> Basics includes a Codex Sandbox Mode card/block.
- AC-002: The Codex selector initializes to the persisted/effective valid value when present and to `workspace-write` when no valid value is present.
- AC-003: Changing Codex mode from Basics calls `updateServerSetting('CODEX_APP_SERVER_SANDBOX', <canonicalValue>)`, refreshes settings through the store behavior, and displays the saved state.
- AC-004: Backend tests prove `CODEX_APP_SERVER_SANDBOX` accepts `read-only`, `workspace-write`, and `danger-full-access` and rejects invalid values.
- AC-005: Backend tests prove `CODEX_APP_SERVER_SANDBOX` is listed/described as a predefined server setting when present/effective, not as `Custom user-defined setting`.
- AC-006: Component tests prove the Basic Codex card renders all three modes, preserves user edits across settings refresh when unsaved, and calls the existing server settings store with canonical values.
- AC-007: Server Settings Manager tests prove the Codex card is rendered in the Basics area without regressing existing quick cards, Applications, Web Search, or Compaction.
- AC-008: Existing Advanced Settings tests for custom rows and system-managed rows remain passing.
- AC-009: Product copy in the Basic card communicates that Codex sandbox changes apply to new/future Codex sessions.
- AC-010: No Claude Basic Settings selector is rendered and no Claude runtime behavior is changed by this ticket.

## Constraints / Dependencies

- Must reuse current server settings persistence and the Pinia `serverSettingsStore` update/reload path.
- Must align visually with existing Basic settings cards (`ApplicationsFeatureToggleCard`, `CompactionConfigCard`, and endpoint cards).
- Must not duplicate runtime authority: backend validation/resolution is authoritative for accepted values; the frontend only presents canonical options and user-facing copy.
- Must preserve current behavior when `CODEX_APP_SERVER_SANDBOX` is not configured.
- Must keep Codex sandbox mode separate from `autoExecuteTools` approval behavior.

## Assumptions

- The user's phrase "access mode for codecs" refers to Codex access/sandbox mode, specifically the shown `CODEX_APP_SERVER_SANDBOX` key.
- The expected Basic area is `Server Settings -> Basics` in `autobyteus-web/components/settings/ServerSettingsManager.vue`.
- It is acceptable for this setting to affect new Codex sessions only.
- Product has approved Codex-only scope for this ticket and has explicitly deferred Claude.

## Risks / Open Questions

- OQ-001: Exact end-user copy for the three Codex modes should be concise enough to fit the Basic card while still warning about `danger-full-access`.
- OQ-002: If product later wants a single binary toggle instead of a three-mode selector, a new design decision will be needed for how to represent `read-only` and `workspace-write`.
- OQ-003: If future runtime-decoupling work moves Codex sandbox normalization, implementation must reconcile the shared constants/normalizer before finalization.

## Requirement-To-Use-Case Coverage

- REQ-001, REQ-002, REQ-003, REQ-006, REQ-007 -> UC-001, UC-002, UC-004
- REQ-004, REQ-005 -> UC-002, UC-003
- REQ-008 -> UC-003
- REQ-009 -> UC-001, UC-004
- REQ-010 -> scope guard for all use cases

## Acceptance-Criteria-To-Scenario Intent

- AC-001 through AC-003 verify the Basic UI, default/effective value behavior, and persistence path.
- AC-004 and AC-005 verify backend authority and Advanced Settings metadata behavior.
- AC-006 and AC-007 verify frontend component behavior and page integration.
- AC-008 guards Advanced Settings regressions.
- AC-009 verifies end-user copy for new-session scope.
- AC-010 guards the approved Codex-only scope.

## Approval Status

Approved by the user on 2026-04-26 after clarification. The approved scope is Codex only; Claude is explicitly deferred/unchanged.
