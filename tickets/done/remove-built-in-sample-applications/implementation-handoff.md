# Implementation Handoff

## Upstream Artifact Package

- Requirements doc:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/requirements.md`
- Investigation notes:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/investigation-notes.md`
- Design spec:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/design-spec.md`
- Design review report:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/design-review-report.md`

## What Changed

- Tightened the built-in materializer/source-root boundary so bundled built-in payload resolution now targets the server-owned built-in payload root under `autobyteus-server-ts/application-packages/platform/applications/`, not repo-root `applications/`.
- Removed the built-in Brief Studio and Socratic Math Teacher payload trees from `autobyteus-server-ts/application-packages/platform/applications/` and preserved the empty built-in applications root with `.gitkeep`.
- Kept `applications/brief-studio` and `applications/socratic-math-teacher` as the only current in-repo authoring/sample roots.
- Updated docs/readmes/settings copy to state that the current built-in application set may legitimately be empty and that repo-root `applications/` is authoring-only.
- Hardened imported-package removal under `ApplicationPackageRegistryService` so stale removable rows are reconciled across package-root settings and registry persistence instead of assuming both surfaces are still synchronized.
- API/E2E Local Fix: `ApplicationPackageRootSettingsStore` now preserves the raw configured linked-local roots from `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` for reconciliation even after the filesystem path disappears, so settings-present / registry-missing stale package rows remain discoverable and removable through the live GraphQL boundary.
- Added focused regression coverage for:
  - bundled source-root resolution preferring the server-owned built-in payload root,
  - application/agent package root settings excluding that server-owned built-in payload root,
  - empty built-in application roots remaining a valid steady state, and
  - application-package listing hiding the built-in row when the built-in app count is zero, and
  - stale imported local package removal succeeding when either package-root settings or registry persistence has already drifted missing while the filesystem path is gone.
- Reverted the ticket-owned edits in the stale `autobyteus-server-ts/tests/e2e/applications/application-packages-graphql.e2e.test.ts` suite so this cleanup package no longer owns unrelated application-session import breakage in that broader E2E file.

## Key Files Or Areas

- Source boundary changes:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts`
- Built-in payload removal:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/application-packages/platform/applications/.gitkeep`
  - removed:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/application-packages/platform/applications/brief-studio/**`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher/**`
- Docs/readmes:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/docs/modules/applications.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-web/docs/settings.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/applications/brief-studio/README.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/applications/socratic-math-teacher/README.md`
- Focused validation updates:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/tests/unit/application-bundles/bundled-application-resource-root.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/tests/unit/application-bundles/file-application-bundle-provider.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/tests/unit/application-packages/application-package-root-settings-store.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/tests/unit/agent-packages/agent-package-root-settings-store.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/tests/unit/application-packages/application-package-service.test.ts`

## Important Assumptions

- The authoritative packaged built-in source remains the server-owned payload root under `autobyteus-server-ts/application-packages/platform/applications/`.
- Repo-root `applications/` is authoring-only and must not be implicitly reclassified as built-in content by materialization or discovery.
- An empty built-in payload is a valid steady state and should continue to produce an empty managed built-in root.
- Future built-in promotion is still a separate explicit packaging decision and is not implemented in this ticket.
- Imported-package removal remains an authoritative reconciliation cleanup at the registry-service boundary, not a requirement that operators manually fix settings/registry drift first.

## Known Risks

- The broader `application-packages-graphql.e2e.test.ts` suite still carries stale scaffolding outside this ticket, but this implementation package no longer modifies that file; its broader repair remains out of scope for this cleanup ticket.
- Focused unit coverage now protects both the source-root/materializer boundary regression and stale imported-package removal reconciliation, but downstream review should still specifically sanity-check live package-registry refresh/startup behavior with an empty built-in payload.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Changed source implementation files remain small: `bundled-application-resource-root.ts` is 29 lines and the `application-package-registry-service.ts` edit stayed bounded to the existing removal owner.
  - I explicitly routed the source-root ambiguity upstream as `Design Impact` before round-2 clarified the boundary.

## Environment Or Dependency Notes

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications install` was required earlier in this worktree because dependencies were not yet installed.
- Focused unit-test logs still include an ambient warning about a nonexistent external application-package root from `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`; it did not affect the ticket-specific assertions.
- This API/E2E Local Fix specifically closes the live stale linked-local removal gap where the raw settings entry outlived both the filesystem root and registry row.
- A standalone `tsc --noEmit` initially failed before shared workspace build outputs were prepared; after `pnpm -C .../autobyteus-server-ts build` ran the shared package prebuilds, `tsc --noEmit` passed.
- The earlier Local Fix touched only the stale E2E test ownership in the cumulative package (by reverting the ticket-owned edits).
- Round-3 implementation added one bounded registry-service removal change and expanded the focused unit regression coverage accordingly.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts exec vitest run tests/unit/application-bundles/bundled-application-resource-root.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-packages/application-package-root-settings-store.test.ts tests/unit/application-packages/application-package-service.test.ts tests/unit/agent-packages/agent-package-root-settings-store.test.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts build`

## Downstream Validation Hints / Suggested Scenarios

- Re-review `BuiltInApplicationPackageMaterializer` / bundled-source resolution against the round-3 authoritative boundary: built-ins must resolve from the server-owned payload root only.
- Verify package-registry presentation with an empty built-in payload: built-in details still resolve, but the default list hides the empty platform-owned row.
- Verify stale imported-package removal from Settings when either package-root settings or registry persistence has already drifted missing and the local path no longer exists, including the live settings-present / registry-missing / filesystem-root-missing linked-local case.
- Sanity-check that server startup / package-registry refresh no longer recreates Brief Studio or Socratic inside `autobyteus-server-ts/application-packages/platform/applications/`.
- If broader executable validation is desired downstream, application-packages GraphQL coverage should be handled through the current maintained validation paths rather than the stale untouched E2E suite unless that suite is separately modernized.

## API / E2E / Executable Validation Still Required

- Code review still required on the cumulative implementation package.
- API/E2E still required after code review passes.
- Broader executable validation of live startup/package-refresh behavior with an empty built-in payload remains downstream work, not implementation sign-off.
