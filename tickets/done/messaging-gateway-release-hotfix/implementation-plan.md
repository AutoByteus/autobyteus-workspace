# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: the failure is isolated to one script helper reference and recovery is a single release workflow dispatch.

## Solution Sketch

- Use case `UC-001`: build the runtime package for a release tag without undefined helper failures.
- Use case `UC-002`: sync and validate the checked-in release manifest without regressing the previous 404 fix.
- Use case `UC-003`: publish the messaging gateway assets for existing tag `v1.2.31` from fixed code on `personal`.
- Target architecture shape: keep helper ownership in `release-manifest.mjs`, but remove the dangling local call site by reusing a shared exported serializer or by serializing inline in the helper module path.
- Touched files:
  - `autobyteus-message-gateway/scripts/build-runtime-package.mjs`
  - `autobyteus-message-gateway/scripts/release-manifest.mjs`
  - `tickets/in-progress/messaging-gateway-release-hotfix/*`

## Requirement Traceability

| Requirement | Acceptance Criteria | Use Case |
| --- | --- | --- |
| R-001 | AC-001 | UC-001 |
| R-002 | AC-002 | UC-002 |
| R-003 | AC-003 | UC-003 |

## Runtime Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence: isolated helper regression, no API or architectural change, clear workflow-dispatch recovery path.

## Step-By-Step Plan

1. Export or otherwise reuse the manifest serializer so `writeReleaseManifest(...)` cannot reference an undefined symbol.
2. Re-run the runtime-package build and manifest-only modes for `v1.2.31`.
3. Push the fix and manually dispatch `Release Messaging Gateway` for `v1.2.31` from `personal`.
