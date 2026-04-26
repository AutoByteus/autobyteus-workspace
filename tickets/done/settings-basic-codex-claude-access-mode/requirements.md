# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready.

## Goal / Problem Statement

End users currently need to know the low-level Advanced Settings key `CODEX_APP_SERVER_SANDBOX` to configure Codex filesystem sandbox/access behavior. The supplied screenshot shows `CODEX_APP_SERVER_SANDBOX=danger-full-access` rendered with the generic description `Custom user-defined setting`, which means the product-facing UI is leaking an implementation key instead of guiding the user.

For the current approved scope, add a discoverable Basic Settings control for **Codex only**. The Basic control must be a simple full-access toggle, not a three-mode selector: enabled saves `danger-full-access`; disabled saves the safe default `workspace-write`. Do not add Claude controls in this change: Claude permission modes are not the same as Codex sandbox modes, the current app does not explicitly wire a Claude sandbox setting, and product direction is to keep Claude unchanged until its sandbox/permission model is clarified separately.

## Investigation Findings

- `autobyteus-web/components/settings/ServerSettingsManager.vue` owns Server Settings -> Basics. It already uses card/block patterns for endpoint quick setup, Applications, Web Search, and Compaction.
- The Advanced table is the raw key-value editor. Unregistered keys receive the generic description `Custom user-defined setting` from `autobyteus-server-ts/src/services/server-settings-service.ts`, matching the screenshot.
- `CODEX_APP_SERVER_SANDBOX` is not registered as a predefined server setting today, but Codex runtime code already reads `process.env.CODEX_APP_SERVER_SANDBOX` in `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`.
- The current Codex runtime valid canonical values are `read-only`, `workspace-write`, and `danger-full-access`; default is `workspace-write`. The Basic UI should intentionally expose only the decision users understand: whether to enable `danger-full-access` or stay on the default `workspace-write`.
- `autobyteus-server-ts/src/config/app-config.ts` updates both in-memory config and `process.env`, and writes to `.env` when available. New Codex sessions can pick up changed sandbox mode after the setting is saved because Codex resolves the env value during session/thread bootstrap.
- `autoExecuteTools` is an approval/prompt shortcut, not a sandbox setting. In Codex it maps to approval policy `never` versus `on-request`; this must remain separate from `CODEX_APP_SERVER_SANDBOX`.
- Claude was investigated and intentionally excluded from this scope. Current Claude code maps `autoExecuteTools` to `permissionMode: bypassPermissions` or `default`; it does not read `CLAUDE_AGENT_SDK_PERMISSION_MODE`, and Claude permission mode is a tool-approval concept rather than Codex-style filesystem sandboxing. Claude also has separate sandbox concepts in upstream docs, but the app does not currently expose a clear Claude sandbox setting.
- Access-mode changes are runtime/session bootstrap settings. They should be presented as applying to future/new Codex sessions, not as changing already-active sessions in place.

## Recommendations

- Add one Basic Settings card/block for **Codex Full Access** only.
- Use a single toggle, not a selector/option-list. End users should only decide whether to enable full access.
- Toggle on saves `danger-full-access`; toggle off saves the default `workspace-write`.
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
- Exposing `read-only` as a Basic UI choice. The runtime and Advanced Settings may still accept it as a valid canonical Codex value, but the Basic journey only toggles full access on/off.

## Functional Requirements

- REQ-001: Server Settings -> Basics must expose Codex full-access mode as a discoverable normal settings block/card, not only through Advanced custom-key editing.
- REQ-002: The Codex Basic control must be a single end-user toggle for enabling full access. It must not expose `read-only` or `workspace-write` as separate Basic choices.
- REQ-003: The toggle must save only canonical backing values: on saves `danger-full-access`; off saves `workspace-write`.
- REQ-004: The toggle must initialize checked only when the persisted/effective `CODEX_APP_SERVER_SANDBOX` value is `danger-full-access`; it must initialize unchecked when the value is absent, invalid, `workspace-write`, or `read-only`.
- REQ-005: `CODEX_APP_SERVER_SANDBOX` must be registered as a predefined server setting with a specific Codex sandbox/full-access description, editable but not deletable from the predefined-settings perspective.
- REQ-006: Invalid `CODEX_APP_SERVER_SANDBOX` values must not be accepted through the server settings mutation once the key is predefined; runtime-valid values `read-only`, `workspace-write`, and `danger-full-access` remain valid for Advanced/API use.
- REQ-007: Updating Codex full-access mode from Basics must use the existing authoritative server settings store/API/mutation and then refresh settings through the existing load path.
- REQ-008: The Basic card must show copy that the setting applies to future/new Codex sessions.
- REQ-009: Existing Advanced Settings custom-key add/edit/remove behavior must continue to work for unrelated custom keys.
- REQ-010: The app-level Auto-approve Tools / `autoExecuteTools` behavior must remain unchanged and must not be presented as Codex sandbox/full-access mode.
- REQ-011: Claude must remain unchanged in this scope; no Claude selector, no Claude permission-mode resolver change, and no Claude sandbox setting should be added.

## Acceptance Criteria

- AC-001: Server Settings -> Basics includes a Codex Full Access card/block with one toggle.
- AC-002: The toggle initializes checked only when the persisted/effective value is `danger-full-access`; it initializes unchecked for absent, invalid, `workspace-write`, or `read-only` values.
- AC-003: Turning the toggle on from Basics calls `updateServerSetting('CODEX_APP_SERVER_SANDBOX', 'danger-full-access')`, refreshes settings through the store behavior, and displays the saved on state.
- AC-004: Turning the toggle off from Basics calls `updateServerSetting('CODEX_APP_SERVER_SANDBOX', 'workspace-write')`, refreshes settings through the store behavior, and displays the saved off state.
- AC-005: Backend tests prove `CODEX_APP_SERVER_SANDBOX` accepts runtime-valid values `read-only`, `workspace-write`, and `danger-full-access` and rejects invalid values.
- AC-006: Backend tests prove `CODEX_APP_SERVER_SANDBOX` is listed/described as a predefined server setting when present/effective, not as `Custom user-defined setting`.
- AC-007: Component tests prove the Basic Codex card renders one full-access toggle, preserves user edits across settings refresh when unsaved, and calls the existing server settings store with the canonical on/off values.
- AC-008: Server Settings Manager tests prove the Codex card is rendered in the Basics area without regressing existing quick cards, Applications, Web Search, or Compaction.
- AC-009: Existing Advanced Settings tests for custom rows and system-managed rows remain passing.
- AC-010: Product copy in the Basic card communicates that Codex full-access changes apply to new/future Codex sessions.
- AC-011: No Claude Basic Settings selector is rendered and no Claude runtime behavior is changed by this ticket.

## Constraints / Dependencies

- Must reuse current server settings persistence and the Pinia `serverSettingsStore` update/reload path.
- Must align visually with existing Basic settings cards (`ApplicationsFeatureToggleCard`, `CompactionConfigCard`, and endpoint cards).
- Must not duplicate runtime authority: backend validation/resolution is authoritative for accepted values; the frontend only presents canonical options and user-facing copy.
- Must preserve current behavior when `CODEX_APP_SERVER_SANDBOX` is not configured.
- Must keep Codex sandbox/full-access mode separate from `autoExecuteTools` approval behavior.
- Basic UI intentionally collapses Codex runtime modes into one full-access decision; off means the default `workspace-write`.

## Assumptions

- The user's phrase "access mode for codecs" refers to Codex access/sandbox mode, specifically the shown `CODEX_APP_SERVER_SANDBOX` key.
- The expected Basic area is `Server Settings -> Basics` in `autobyteus-web/components/settings/ServerSettingsManager.vue`.
- It is acceptable for this setting to affect new Codex sessions only.
- Product has approved Codex-only scope for this ticket and has explicitly deferred Claude.

## Risks / Open Questions

- OQ-001: Exact end-user copy for the full-access toggle must be concise enough to fit the Basic card while still warning that `danger-full-access` disables filesystem sandboxing.
- OQ-002: If product later wants to expose `read-only`, a new design decision will be needed because the approved Basic journey intentionally hides it.
- OQ-003: If future runtime-decoupling work moves Codex sandbox normalization, implementation must reconcile the shared constants/normalizer before finalization.

## Requirement-To-Use-Case Coverage

- REQ-001, REQ-002, REQ-003, REQ-004, REQ-007, REQ-008 -> UC-001, UC-002, UC-004
- REQ-005, REQ-006 -> UC-002, UC-003
- REQ-009 -> UC-003
- REQ-010 -> UC-001, UC-004
- REQ-011 -> scope guard for all use cases

## Acceptance-Criteria-To-Scenario Intent

- AC-001 through AC-004 verify the Basic toggle UI, checked/unchecked value behavior, and persistence path.
- AC-005 and AC-006 verify backend authority and Advanced Settings metadata behavior.
- AC-007 and AC-008 verify frontend component behavior and page integration.
- AC-009 guards Advanced Settings regressions.
- AC-010 verifies end-user copy for new-session scope.
- AC-011 guards the approved Codex-only scope.

## Approval Status

Approved by the user on 2026-04-26 after clarification. The approved scope is Codex only; Claude is explicitly deferred/unchanged. Updated user direction on 2026-04-26 further simplifies the Codex Basic UI to one `danger-full-access` toggle; off maps to `workspace-write`.
