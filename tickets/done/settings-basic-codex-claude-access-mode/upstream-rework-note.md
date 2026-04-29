# Upstream Rework Note

## Date

2026-04-26

## Trigger

User clarified after the initial design/implementation flow that the Basic Codex UI should be simpler than the original three-mode selector.

User direction: `danger-full-access` is the only decision end users need in Basics; use one toggle to enable `danger-full-access` because users do not understand the other Codex sandbox values.

## Superseded Direction

The previous design exposed all three Codex sandbox modes in Basic Settings:

- `read-only`
- `workspace-write`
- `danger-full-access`

That direction is now superseded for the Basic UI.

## Revised Direction

- Basic Settings must show one Codex full-access toggle.
- Toggle on saves `CODEX_APP_SERVER_SANDBOX=danger-full-access`.
- Toggle off saves `CODEX_APP_SERVER_SANDBOX=workspace-write`.
- The toggle is checked only when the effective/persisted value is `danger-full-access`.
- `read-only` remains runtime-valid and can remain accepted by backend/Advanced/API paths, but it is intentionally not exposed in Basics.
- Claude remains unchanged/out of scope.

## Artifact Updates

Updated artifacts:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-basic-codex-claude-access-mode/tickets/done/settings-basic-codex-claude-access-mode/design-spec.md`

## Known Implementation Impact

Current branch state already contains an implementation of the earlier selector shape, including `autobyteus-web/components/settings/CodexSandboxModeCard.vue` and localized option copy for all three modes. That implementation is now stale relative to the revised requirements and should be reworked after architecture review accepts this revised design.
