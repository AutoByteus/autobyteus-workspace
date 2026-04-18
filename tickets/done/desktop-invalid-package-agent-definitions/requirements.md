# Requirements - desktop-invalid-package-agent-definitions

## Status
Design-ready

## Goal
Restore the desktop Agents surface after installing the current packaged AutoByteus release, so one invalid entry under runtime `application-packages` does not break agent-definition loading for the whole app.

## Problem Summary
- User-installed desktop app version `1.2.78` starts successfully but the Agents page fails with `Unable to fetch agent definitions at this time.`
- Live desktop log evidence on `2026-04-17` shows the GraphQL resolver fails because backend package loading throws:
  - `Invalid package /Users/normy/.autobyteus/server-data/application-packages/platform/applications/Visual Studio Code.app/Contents/Resources/app/node_modules.asar`
- The failure propagates through `agentDefinitions` and `agentTeamDefinitions`, so one invalid package currently poisons core catalog loading.

## Confirmed Root Cause
- `resolveBundledApplicationResourceRoot(...)` walks upward from packaged server app root and accepts the first parent that appears to contain an `applications` directory.
- On macOS, the filesystem is case-insensitive by default. When the walk reaches `/`, the check against `/applications` resolves to the system `/Applications` folder.
- Built-in package materialization therefore copies the host machine's macOS `/Applications` directory into:
  - `/Users/normy/.autobyteus/server-data/application-packages/platform/applications`
- That injects editor app bundles such as `Visual Studio Code.app` and `Z Code.app` into the built-in platform package, and later catalog loading fails when it encounters non-AutoByteus internals such as `node_modules.asar`.

## User-Facing Outcome Required
- Desktop Agents and Agent Teams load normally even if one invalid application package or nested non-package artifact exists under runtime application-package storage.
- Built-in platform package discovery only reads actual AutoByteus bundled application assets, never the host machine's `/Applications` directory.

## In Scope
- Investigate the current packaged desktop failure using live `server-data` and desktop logs.
- Trace application-package discovery/loading that reaches the invalid `Visual Studio Code.app/.../node_modules.asar` path.
- Implement the minimal safe server/web/electron fix needed to stop invalid package contents from breaking agent-definition loading.
- Add focused regression coverage for the discovered failure mode.

## Out of Scope
- Broad redesign of application package import architecture beyond what is required to prevent this failure.
- Cleanup of unrelated invalid user data unless required for validation.

## Acceptance Criteria
1. The backend no longer throws `Invalid package ... node_modules.asar` while listing agent definitions for the reproduced local data shape.
2. One malformed or non-package path under application-package storage does not make `agentDefinitions` or `agentTeamDefinitions` fail globally.
3. Valid agent definitions still load when an invalid package entry exists alongside them.
4. Focused automated coverage exists for the failure mode or the closest authoritative boundary that prevents regression.
5. On macOS, case-insensitive filesystem lookup must not let `/applications` be treated as a valid bundled AutoByteus application root when the only real directory is the system `/Applications`.

## Constraints
- Preserve existing valid application package behavior.
- Do not require manual deletion of user `server-data` as the primary remediation.

## Initial Evidence
- Desktop log: `/Users/normy/.autobyteus/logs/app.log`
- Runtime data root: `/Users/normy/.autobyteus/server-data`
- Failing path: `/Users/normy/.autobyteus/server-data/application-packages/platform/applications/Visual Studio Code.app/Contents/Resources/app/node_modules.asar`
