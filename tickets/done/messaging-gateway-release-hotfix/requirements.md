# Requirements

- Ticket: `messaging-gateway-release-hotfix`
- Status: `Design-ready`
- Scope: `Small`

## Problem Statement

The `Release Messaging Gateway` workflow for tag `v1.2.31` failed after the desktop release was cut. The failure message is `serializeManifest is not defined` inside `autobyteus-message-gateway/scripts/build-runtime-package.mjs`.

## Requirements

| ID | Requirement |
| --- | --- |
| R-001 | The gateway runtime packaging script must complete without referencing undefined helpers during release packaging. |
| R-002 | The fix must preserve the manifest-sync and manifest-drift validation behavior introduced for the desktop release path. |
| R-003 | The fix must allow publishing or updating the missing messaging gateway assets for the existing `v1.2.31` release tag without requiring another desktop app release unless technically unavoidable. |

## Acceptance Criteria

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| AC-001 | R-001 | Running `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --release-tag v1.2.31` exits successfully. |
| AC-002 | R-002 | Running the manifest-only sync and drift-check modes still succeeds for `v1.2.31`. |
| AC-003 | R-003 | The repository contains a documented path to publish the `v1.2.31` messaging gateway assets from the fixed code, and that path is executed if available. |

## Notes

- The hotfix is limited to the gateway packaging/release path.
- No user-facing runtime behavior or managed-gateway API contracts should change.
