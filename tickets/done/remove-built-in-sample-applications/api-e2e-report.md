# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/tickets/in-progress/remove-built-in-sample-applications/review-report.md`
- Current Validation Round: `3`
- Trigger: `Resumed API/E2E validation on 2026-04-21 after review round 4 passed the stale linked-local settings-presence reconciliation fix and returned the cumulative cleanup package.`
- Prior Round Reviewed: `2`
- Latest Authoritative Round: `3`

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Review round 2 passed RBSA-LF-001 and returned the cleanup package for API/E2E | N/A | 0 | Pass | No | Focused maintained tests, typecheck, build, and a real empty-built-in live startup/catalog check all passed. |
| 2 | Review round 3 passed stale linked-local removal hardening and returned the cumulative cleanup package | None | 1 | Fail | No | Focused maintained reruns still passed, live settings-missing/registry-present stale removal passed, but the live settings-present/registry-missing stale linked-local removal failed with `Application package not found`. |
| 3 | Review round 4 passed the settings-presence reconciliation fix and returned the cumulative cleanup package | `RBSA-E2E-005` | 0 | Pass | Yes | Prior blocking live stale-removal failure is resolved. Both live stale linked-local drift cases now pass, along with focused maintained tests, typecheck, and build. |

## Validation Basis

- Requirements exercised directly across rounds: `R-001` through `R-010`.
- Acceptance criteria exercised directly across rounds: `AC-001` through `AC-007`.
- Round-3 design / review focus exercised directly: linked-local package-root settings must preserve configured roots long enough for stale reconciliation after the filesystem root disappears, so removal can still clear a settings-present / registry-missing stale package.
- Implementation handoff signal rechecked: downstream validation should sanity-check live package-registry refresh/startup behavior with an empty built-in payload and verify stale imported-package removal from Settings when either settings or registry persistence has drifted missing and the local path is gone.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Focused server unit validation for bundled-source-root resolution, bundle discovery diagnostics, protected root settings, empty built-in package-row behavior, package-registry refresh behavior, and stale linked-local package removal guardrails.
- Server typecheck and full server build validation.
- Live executable backend startup with a clean data directory and real GraphQL mutations/queries against the running Fastify server.
- Live filesystem mutation of package roots and registry persistence to reproduce supported stale linked-local drift cases.

## Platform / Runtime Targets

- Node.js local runtime on macOS host.
- `autobyteus-server-ts` Fastify server.
- Clean worktree-local app data under:
  - round 1: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/empty-builtin-round1-live/server-data`
  - round 2: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round2-live/server-data`
  - round 3: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round3-live/server-data`

## Lifecycle / Upgrade / Restart / Migration Checks

- Round 1 cold startup with an empty built-in payload root completed successfully.
- Rounds 2 and 3 cold startup with clean data dirs completed successfully before the stale linked-local removal probes ran.
- Rounds 2 and 3 exercised two live stale linked-local removal drifts on the real GraphQL boundary:
  - settings missing / registry present / filesystem root missing
  - settings present / registry missing / filesystem root missing
- No app-restart or migration-between-versions scenario was required by this cleanup ticket.

## Coverage Matrix

| Scenario ID | Requirement / Design Anchor | Boundary | Method | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| `RBSA-E2E-001` | `R-008`, `R-009`, `AC-006`, `AC-007` | Bundled built-in source-root resolution and stable empty built-in steady state | Focused unit tests + live startup/materialization check | Pass | The built-in source resolves to the server-owned `autobyteus-server-ts/application-packages/platform` root only, and the managed built-in applications root stays empty except for `.gitkeep`. |
| `RBSA-E2E-002` | `R-004`, `R-005`, `AC-002` | Package registry and discovery behavior with zero built-in apps | Focused unit tests + live GraphQL queries | Pass | `applicationPackages` is empty, `listApplications` is empty, and `applicationPackageDetails('built-in:applications')` still exposes the platform-owned built-in package details with `applicationCount: 0`. |
| `RBSA-E2E-003` | `R-001`, `R-003`, `R-010`, `AC-001` | No implicit shipping of repo-root sample apps as built-ins | Focused unit tests + live startup/catalog check | Pass | On a real server boot inside the worktree, repo-root authoring apps did not appear in `listApplications`; this indicates the removed built-in payloads were not recreated from `applications/`. |
| `RBSA-E2E-004` | `R-002`, `R-006`, `R-007`, `AC-004`, `AC-005` | Built-in infrastructure remains usable while current shipped built-in set is empty | Focused maintained unit tests + live built-in package details query | Pass | The built-in infrastructure remains present and queryable even though the current shipped built-in set is empty. |
| `RBSA-E2E-005` | Review rounds 3-4 stale-removal hardening | Linked-local package removal when settings still persist the package root, registry persistence is already missing, and the filesystem root is gone | Focused maintained unit rerun + live GraphQL import/remove drift probe | Pass | The raw configured setting now remains reconcilable long enough for the stale linked-local package to stay discoverable at `applicationCount: 0`, and `removeApplicationPackage(...)` clears the lingering settings-only package. |
| `RBSA-E2E-006` | Review round 3 stale-removal hardening | Linked-local package removal when settings are already deleted, registry persistence remains, and the filesystem root is gone | Focused maintained unit rerun + live GraphQL import/remove drift probe | Pass | The real GraphQL `removeApplicationPackage(...)` call succeeds and clears the stale registry-only package. |

## Test Scope

- Ticket-owned server cleanup only.
- Rechecked the maintained focused unit suite that review round 4 relied on.
- Re-ran real backend startup and live GraphQL stale-removal probes because the implementation handoff explicitly called out stale imported-package removal and startup/package-registry sanity checks.

## Validation Setup / Environment

- Local Fix ownership recheck:
  - `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications diff -- autobyteus-server-ts/tests/e2e/applications/application-packages-graphql.e2e.test.ts`
- Focused maintained unit rerun command:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts exec vitest run tests/unit/application-packages/application-package-root-settings-store.test.ts tests/unit/application-packages/application-package-service.test.ts tests/unit/application-bundles/bundled-application-resource-root.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/agent-packages/agent-package-root-settings-store.test.ts`
- Typecheck:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Build:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts build`
- Live backend command (round 3):
  - `env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" LANG="en_US.UTF-8" AUTOBYTEUS_SERVER_HOST="http://127.0.0.1:8019" node /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/autobyteus-server-ts/dist/app.js --data-dir /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round3-live/server-data --host 127.0.0.1 --port 8019`
- Live round-3 proof script:
  - `node /Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round3-live/live-stale-remove-proof.mjs`

## Tests Implemented Or Updated

- No repository-resident durable validation code was added or updated in this API/E2E round.
- Round-3 executable validation added only a temporary live proof script against the running local backend.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `None`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Round-1 live empty-built-in proof:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/empty-builtin-round1-live/live-empty-builtin-proof.json`
- Round-2 live stale-removal proof:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round2-live/live-stale-remove-proof.json`
- Round-3 live stale-removal proof:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round3-live/live-stale-remove-proof.json`

## Temporary Validation Methods / Scaffolding

- Clean isolated backend startups under `.local/empty-builtin-round1-live`, `.local/stale-remove-round2-live`, and `.local/stale-remove-round3-live`.
- One-off GraphQL proof scripts persisted under the round-2 and round-3 `.local/` folders.
- No temporary repository changes were made.

## Dependencies Mocked Or Emulated

- Focused unit tests use their normal local test doubles.
- The live proofs used the real Fastify server, real GraphQL resolver boundary, real server settings persistence, real package-registry persistence, and real on-disk package roots.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | `RBSA-E2E-005` settings-present / registry-missing / filesystem-root-missing stale linked-local removal | `Local Fix` | Resolved | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications/.local/stale-remove-round3-live/live-stale-remove-proof.json` | In round 3, `applicationPackages` retains the stale linked-local package at `applicationCount: 0`, `applicationPackageDetails(packageId)` still resolves it, and `removeApplicationPackage(packageId)` clears the lingering settings-only package. |

## Scenarios Checked

- `RBSA-E2E-001`
- `RBSA-E2E-002`
- `RBSA-E2E-003`
- `RBSA-E2E-004`
- `RBSA-E2E-005`
- `RBSA-E2E-006`

## Passed

- `git diff -- autobyteus-server-ts/tests/e2e/applications/application-packages-graphql.e2e.test.ts` returned an empty diff, confirming the ticket still does not own edits in the stale broader E2E suite.
- The focused maintained unit vitest batch passed (`5` files, `29` tests).
- Server `tsc --noEmit` passed.
- Server build passed.
- Round-3 live backend startup with a clean data dir passed.
- `RBSA-E2E-005` passed live: after deleting the linked-local registry record while leaving `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` intact and deleting the package filesystem root, the stale package remained discoverable through GraphQL and `removeApplicationPackage(...)` cleared it successfully.
- `RBSA-E2E-006` passed live: after deleting `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`, leaving the linked-local registry record in place, and deleting the package filesystem root, the real GraphQL `removeApplicationPackage(...)` mutation succeeded and cleared the stale registry-only package.

## Failed

- None.

## Not Tested / Out Of Scope

- Full frontend/browser UX, because this ticket is a server-owned built-in cleanup and stale registry/settings removal change.
- The broader untouched `autobyteus-server-ts/tests/e2e/applications/application-packages-graphql.e2e.test.ts` suite, which remains out of scope for this ticket because the package does not modify that file.

## Blocked

- None.

## Cleanup Performed

- Stopped the temporary backend process on port `8019`.
- Verified no listener remained on port `8019` after cleanup.
- Left temporary proof artifacts under `.local/` for inspection.

## Classification

- `Pass`

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

- The implementation handoff's legacy/removal check remained clean: no backward-compatibility behavior was introduced and the duplicate built-in sample payloads remain removed.
- Round-1 empty-built-in proof remains valid.
- The round-3 live proof demonstrates the formerly failing settings-only stale linked-local removal path is now fixed on the real GraphQL boundary.
- In the successful settings-present stale case, the server clears the raw setting by updating `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` to the empty string rather than deleting the setting row outright; this still removed the stale path and did not leave the package discoverable.
- No repository-resident durable validation changed in this round.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `Round 3 passed. Focused maintained tests, typecheck, and build all passed, and the live stale linked-local removal proof now passes for both supported drift cases. The prior blocking settings-present / registry-missing / filesystem-root-missing failure is resolved on the real GraphQL boundary, and no repository-resident durable validation changed in this round.`
