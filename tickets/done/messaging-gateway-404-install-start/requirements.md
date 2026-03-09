# Requirements

## Metadata

- Ticket: `messaging-gateway-404-install-start`
- Status: `Design-ready`
- Owner: `Codex`
- Branch: `codex/messaging-gateway-404-install-start`
- Last Updated: `2026-03-09`

## Status History

- `Draft` - bootstrap from user report and screenshot
- `Design-ready` - investigation confirmed stale managed messaging release manifest drift

## Problem Statement

After installing the latest desktop version, clicking `Install and Start Gateway` in the managed messaging gateway settings returns `HTTP 404 Not Found` instead of starting the gateway runtime.

## User Intent

- Identify why the managed messaging gateway install/start action now fails with `HTTP 404 Not Found`.
- Determine whether the regression is caused by recent release packaging, routing, or gateway lifecycle changes.
- Fix the failure so the install/start action works again in the latest desktop build.

## Initial Evidence

- User report: latest installed app shows `HTTP 404 Not Found` immediately after clicking `Install and Start Gateway`.
- Screenshot evidence shows the failure in the `Messaging` settings page, with runtime state still `Disabled` and no active version installed.

## In Scope

- Desktop-managed messaging gateway lifecycle flow.
- Frontend action wiring for install/start/refresh/update runtime controls.
- Electron/main-process bridge or local HTTP proxy involved in managed gateway actions.
- Backend/server routes used by the managed messaging gateway lifecycle.
- Release/runtime packaging differences if they affect route availability.

## Out Of Scope

- Provider-specific messaging configuration after gateway installation succeeds.
- Unrelated messaging session setup flows.
- Broad messaging UX changes unrelated to the `Install and Start Gateway` failure.

## Scope Triage

- Scope: `Small`
- Rationale:
  - Root cause is isolated to release-manifest synchronization and release guardrails.
  - No product-surface redesign is needed.
  - Expected implementation is limited to release automation/scripts plus targeted validation.

## Confirmed Findings

- `F-001`: The packaged server resolves managed gateway artifacts from the bundled checked-in `release-manifest.json`.
- `F-002`: The checked-in manifest on `origin/personal` still references `v1.2.26`.
- `F-003`: The `v1.2.26` managed gateway asset URLs return `HTTP 404`.
- `F-004`: The `v1.2.30` GitHub release contains the correct managed gateway assets and a correct published `release-manifest.json`.
- `F-005`: Desktop release automation does not currently enforce synchronization between the desktop release tag and the checked-in managed messaging manifest.

## Design-Ready Requirements

- `R-001`: Desktop release preparation must sync `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` to the same release tag as `autobyteus-web/package.json`.
- `R-002`: The sync path must be lightweight and deterministic; it must not require a full release publish to refresh the checked-in manifest.
- `R-003`: Desktop release validation must fail if the checked-in managed messaging manifest release tag does not match the desktop release tag being built.
- `R-004`: The fix must preserve the current managed runtime artifact format and release asset naming.
- `R-005`: Validation must prove that the synced manifest points at the release tag being prepared, preventing the stale-asset 404 recurrence.

## Acceptance Criteria

- `AC-001`: The root cause is documented as stale managed messaging release-manifest drift, not a missing runtime route.
- `AC-002`: Running the desktop release preparation path for a target version updates the checked-in managed messaging manifest to the same release tag.
- `AC-003`: The desktop release workflow fails fast if `autobyteus-web/package.json` and the checked-in managed messaging manifest target different release tags.
- `AC-004`: Automated validation covers the manifest sync and/or drift detection path.
- `AC-005`: The fix leaves the managed gateway runtime asset URLs pointing at the current release tag rather than a prior tag.

## Selected Fix Direction

- Add a lightweight manifest-sync step to the desktop release preparation flow.
- Add a release-time validation gate in the desktop release workflow that compares the checked-in managed messaging manifest release tag against the desktop release tag.
