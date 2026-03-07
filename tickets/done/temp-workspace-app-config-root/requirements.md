# Requirements

## Metadata

- Ticket: `temp-workspace-app-config-root`
- Status: `Design-ready`
- Owner: `Codex`
- Branch: `codex/temp-workspace-app-config-root`
- Last Updated: `2026-03-07`

## Problem Statement

The user observed that the Electron app is presenting the existing temporary workspace path on macOS as a path under `/var/folders/.../T/autobyteus/temp_workspace`. The user expected the temp workspace to live under the server data folder instead, and suspects a bug in the server-side app-config path resolution.

## Investigation Goal

Determine why the temp workspace root resolves to `/var/folders/...` on macOS, whether that behavior is intentional or a bug, and how the server-side app config influences the final path shown in the Electron UI.

## In-Scope

- Server-side app config resolution for temp workspace directories.
- How the workspace manager consumes app config to create/cache the temp workspace.
- How the Electron UI ends up showing that path for the selected temp workspace.
- Whether the default behavior matches current documented intent.

## Out Of Scope

- Changing temp workspace behavior before the root-cause analysis is complete.
- Non-server temporary directories unrelated to workspace selection.
- Packaging/runtime issues unrelated to workspace root resolution.

## User Expectations To Validate

- Temp workspace should be inside the server data folder rather than an OS temp folder.
- Server-side app config should be the authoritative source for this behavior.
- The displayed path in the UI should match the intended server configuration.

## Initial Acceptance Criteria

- `AC-001`: Identify the server-side code path that determines the temp workspace root.
- `AC-002`: Explain why macOS currently shows `/var/folders/.../T/autobyteus/temp_workspace`.
- `AC-003`: State whether the current behavior is intentional or inconsistent with the intended server data model.
- `AC-004`: If inconsistent, identify the concrete configuration or code path that should change.

## Confirmed Findings

- `F-001`: Electron passes the server data directory into the backend process via `--data-dir`, so the server does know its app data root.
- `F-002`: `AppConfig.getTempWorkspaceDir()` does not default to `<dataDir>/temp_workspace`; it defaults to `path.join(os.tmpdir(), "autobyteus", "temp_workspace")` when `AUTOBYTEUS_TEMP_WORKSPACE_DIR` is unset.
- `F-003`: On macOS, `os.tmpdir()` resolves under `/var/folders/.../T`, which explains the path shown in the UI.
- `F-004`: The UI is showing the backend-provided absolute workspace path, not inventing a random temp location on its own.
- `F-005`: Current implementation and tests intentionally encode OS-temp-root behavior, but the server README claims `temp_workspace/` is created under the app data dir. That is an implementation-versus-documentation inconsistency.

## Requirement Direction

- `R-001`: The product must choose one canonical rule for the default temp workspace root.
- `R-002`: If the intended behavior is "temp workspace lives under server data", the default server-side path should resolve to `<appDataDir>/temp_workspace` when no override is configured.
- `R-003`: If the intended behavior is "temp workspace lives under OS temp", server documentation must be corrected to reflect that explicitly.
- `R-004`: The resolved temp workspace root shown in the UI must continue to come from the backend's canonical workspace root.

## Selected Design-Ready Direction

- Selected rule: the default temp workspace root is `<appDataDir>/temp_workspace`.
- Override rule: `AUTOBYTEUS_TEMP_WORKSPACE_DIR` remains supported.
  - Absolute override values remain absolute.
  - Relative override values remain relative to `appDataDir`.
- Required implementation updates:
  - Update the default branch in `AppConfig.getTempWorkspaceDir()`.
  - Update unit and E2E expectations that currently hard-code `os.tmpdir()/autobyteus/temp_workspace`.
  - Update server documentation so it matches the implemented behavior.

## Preferred Fix Direction

- Preferred based on the current documentation and user expectation:
  - Change the default branch of `AppConfig.getTempWorkspaceDir()` to resolve under `this.dataDir`, not `os.tmpdir()`.
- Acceptable fallback if OS-temp isolation is the real product intent:
  - Keep code as-is and update the README plus any product-facing descriptions so they stop implying server-data ownership.

## Open Questions

- Does the team want default temp workspaces to be durable under `server-data`, or intentionally ephemeral under the OS temp root?
- If the code changes to server-data-relative defaulting, should existing installs be migrated automatically or only affect newly created temp workspaces?

## Resolution For This Ticket

- Existing installs do not require a migration step because the temp workspace root is resolved lazily at runtime from current config.
- After the fix, newly resolved default temp workspaces should land under the active server data directory automatically.
