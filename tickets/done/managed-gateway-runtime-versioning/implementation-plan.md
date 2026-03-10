# Implementation Plan

- Ticket: `managed-gateway-runtime-versioning`
- Last Updated: `2026-03-10`
- Scope: `Medium`

## Solution Sketch

- Keep managed gateway runtime install/update semantics centered on `artifactVersion`.
- Make release automation set `autobyteus-message-gateway/package.json` version to the requested workspace release version before manifest sync and tagging.
- Make release CI validate:
  - `autobyteus-web/package.json` version matches tag
  - `autobyteus-message-gateway/package.json` version matches tag
  - bundled managed-gateway manifest matches tag via existing manifest-check command
- Preserve current runtime update behavior for same-version restart and newer-version install/activate paths.

## Architecture Sketch

- Release helper boundary:
  - owns synchronized version bump for desktop and gateway packages
  - owns manifest sync invocation during local release prep
- Release workflow boundary:
  - owns fail-fast validation before managed gateway asset publication
- Runtime boundary:
  - keeps existing installer/update logic and consumes synchronized `artifactVersion`
- UI boundary:
  - continues to render active version and release tag from status

## Planned Tasks

1. `T-001` Release helper synchronization
   - Modify `scripts/desktop-release.sh`
   - Add gateway package version read/write helpers
   - Bump gateway package version alongside desktop version
   - Stage gateway package manifest in the release commit

2. `T-002` Release workflow enforcement
   - Modify `.github/workflows/release-messaging-gateway.yml`
   - Validate gateway package version against the tag
   - Run bundled managed-gateway manifest drift check for the tag

3. `T-003` Verification updates
   - Add or update tests/command checks covering synchronized versioning behavior
   - Update release-oriented expectations where needed

4. `T-004` Docs sync
   - Update release instructions if behavior or required files changed

## Planned Verification

- Unit / command-level:
  - release helper behavior around synchronized version bumps
  - manifest drift check command for the target release tag
- API / E2E:
  - existing managed gateway update e2e remains valid for newer `artifactVersion`
- Workflow / config sanity:
  - `bash -n scripts/desktop-release.sh`
  - workflow syntax / behavior validation through targeted checks

## Risks

- Release helper may unexpectedly stage or mutate files beyond the intended package manifests and bundled manifest.
- Workflow validation must remain compatible with both tag-triggered and manual-dispatch release paths.
- Existing release tests may need targeted updates if they assumed gateway package version remained static.
