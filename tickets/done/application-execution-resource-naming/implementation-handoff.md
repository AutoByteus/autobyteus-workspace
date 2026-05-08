# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/design-spec.md`
- No-migration design rework summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/solution-design-rework-no-migration.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/design-review-report.md`
- Code review / blocker context: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/review-report.md`
- Latest API/E2E validation report / Local Fix context: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/api-e2e-validation-report.md`
- Delivery blocker context only: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/delivery-blocker-reroute.md`
- Supplemental prior workflow artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/future-state-runtime-call-stack.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/future-state-runtime-call-stack-review.md`

## What Changed

- Completed the clean-cut semantic rename from the app-selectable `ApplicationRuntimeResource*` concept to `ApplicationExecutionResource*` across SDK contracts, backend SDK contracts, server orchestration, REST/GraphQL surfaces, web setup UI, first-party apps, generated/vendor/dist outputs, tests, and docs.
- Renamed the bundle/shared discriminator from `owner` to `source` in public/in-memory execution-resource refs and summaries.
- Renamed manifest/setup/start-run fields to the target vocabulary: `executionResourceSlots`, `allowedExecutionResourceKinds`, `allowedExecutionResourceSources`, `defaultExecutionResourceRef`, and `executionResourceRef`.
- Renamed backend runtime-control methods to `listAvailableExecutionResources` and `getConfiguredExecutionResource`.
- Removed old resource configuration/resolver files and added execution-resource equivalents.
- Updated first-party app manifests/backend code and regenerated package/vendor outputs.
- Removed the user-requested ticket workflow state artifact; no ticket-local `workflow-state.md` remains.
- Fixed prior local review findings:
  - CR-001: old public manifest keys now fail at the manifest boundary instead of being silently ignored.
  - CR-002: active frontend utility variables now use source terminology.
- Completed the architecture-approved no-migration rework:
  - configured execution-resource rows that still contain old execution-resource JSON keys are destructively reset by deleting those rows, so the app becomes not configured and must be reconfigured;
  - run-binding rows whose summaries still contain old execution-resource JSON keys are dropped with their member rows and a warning, so old local run state is not hydrated, converted, or exposed;
  - CR-004 fixed: stale-shape detection now uses JSON-path key checks instead of broad SQL substring matching, so valid new refs/summaries with identity values such as `localId: "owner"` or `definitionId: "resourceRef"` are preserved;
  - the old store conversion helpers and the old store conversion test file are gone;
  - durable replacement tests now prove reset/drop behavior and false-positive preservation behavior.
- Fixed API/E2E Round 3 Local Fix:
  - corrected `ApplicationLaunchSetupPanel.vue` to pass the slot editor's actual `availableResources` prop using `:available-resources="availableResources"`;
  - added durable web coverage that mounts the real `ApplicationExecutionResourceSlotEditor` from the parent and verifies available execution resources render instead of crashing from an undefined prop.

## Key Files Or Areas

- SDK contracts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-application-sdk-contracts/src/execution-resources.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-application-sdk-contracts/src/manifests.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-application-sdk-contracts/src/index.ts`
- Manifest parsing / bundle model:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts`
- Server orchestration and storage:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-resolver.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-orchestration/stores/application-execution-resource-configuration-store.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts`
- Durable stale-state test replacement:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/tests/unit/application-orchestration/application-execution-resource-stale-state.test.ts`
  - Removed `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/tests/unit/application-orchestration/application-execution-resource-store-migrations.test.ts`.
- API/web:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/api/rest/application-backends.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/api/graphql/types/application.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-web/components/applications/setup/ApplicationExecutionResourceSlotEditor.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-web/utils/application/applicationLaunchProfile.ts`
- First-party apps:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/applications/brief-studio/application.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/applications/brief-studio/backend-src/services/brief-run-launch-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/applications/socratic-math-teacher/application.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts`

## Important Assumptions

- The latest architecture-reviewed requirement is authoritative: no public or private old execution-resource shape compatibility/conversion is allowed.
- Manifest version remains `3`; the v3 shape is a clean-cut replacement with execution-resource field names.
- Physical SQLite column names such as `resource_owner` may remain private storage implementation details, but active JSON/public/in-memory shapes are new-only.
- The latest API/E2E report is active Local Fix context, not a passing validation sign-off. Prior passing API/E2E/delivery evidence remains superseded blocker context only.

## Known Risks

- Broad public rename touches many generated/vendor/dist files; downstream review and validation should still verify stale generated artifacts do not remain.
- The API/E2E live Brief Studio browser flow still needs to be rerun by API/E2E after code review; implementation-level focused web tests now cover the prop binding that caused the Nuxt 500.
- Existing local platform state using old execution-resource JSON keys will be reset/dropped by design. Users/developers must reconfigure affected application setup, and old run-binding local state cannot be recovered through this code path.
- External SDK consumers need migration/release notes because old public type/method/manifest names are intentionally removed rather than aliased.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Naming Refactor / Cleanup.
- Reviewed root-cause classification: Boundary Or Ownership Issue and Shared Structure Looseness caused by overloaded `runtime` terminology and the inaccurate `owner` discriminator.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes after the no-migration design correction.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): Yes; the downstream no-migration clarification was routed through solution/design and architecture review, then implemented here.
- Evidence / notes: The implementation now has a single authoritative execution-resource shape in public/in-memory code. Old public names reject at boundaries. Old stored setup/run-binding JSON is reset/dropped, not converted or exposed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` for non-generated/non-vendor source implementation files.
- Notes:
  - Store conversion helpers named in the blocker are gone: `migrateOwnerToSource`, `migrateRunBindingSummaryJson`, and `normalizeStoredExecutionResourceRef` are absent.
  - The old store conversion test file is absent.
  - Broad stale-state SQL substring predicates such as `LIKE '%"owner"%'` / `LIKE '%"resourceRef"%'` are absent from active orchestration store source/tests.
  - Old-shape strings that remain in active store source are JSON-path key predicates for deletion/reset, not substring value matching or conversion.
  - Old-shape strings that remain in tests are negative/reset/drop coverage and false-positive preservation coverage, not success conversion coverage.
  - Search confirmed no ticket-local `workflow-state.md` remains for this ticket.

## Exact Stale-State Behavior Chosen

- Configured execution-resource setup state:
  - `ApplicationExecutionResourceConfigurationStore` deletes rows from `__autobyteus_resource_configurations` only when `resource_ref_json` structurally contains old top-level keys detected by JSON path (`$.owner` or `$.resourceRef`).
  - Valid new refs whose string identity values happen to be `owner` or `resourceRef` are preserved.
  - After deletion of actual stale rows, `getConfiguration(...)` returns `null`, `listConfigurations(...)` omits the stale row, and the application must be reconfigured through the new execution-resource setup flow.
- Run-binding state:
  - `ApplicationRunBindingStore` uses one shared JSON-path predicate for stale count, binding-member deletion, and binding deletion: top-level `$.resourceRef` or nested `$.executionResourceRef.owner`.
  - Valid new summaries whose string identity values happen to be `owner` or `resourceRef` are preserved.
  - A warning is emitted when stale rows are dropped.
  - After deletion of actual stale rows, `getBinding(...)`, `getBindingByIntentId(...)`, and `listBindings(...)` do not expose those stale summaries.

## Environment Or Dependency Notes

- Ran `pnpm install` earlier in this worktree because it initially had no `node_modules`.
- Web tests rely on Nuxt generated metadata; `.nuxt` was prepared earlier via `pnpm -C autobyteus-web exec nuxi prepare`.
- `pnpm -C autobyteus-server-ts typecheck` is not the reliable server check for this repository state because it includes test files outside `tsconfig` `rootDir` and reports baseline TS6059 rootDir errors. The implementation check uses `tsconfig.build.json` typechecking instead.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

Earlier implementation checks:
- `pnpm -C autobyteus-application-sdk-contracts build` — Pass.
- `pnpm -C autobyteus-application-backend-sdk build` — Pass.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` — Pass.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Pass.
- Focused server tests — Pass: 6 files, 23 tests.
- Focused web tests — Pass: 5 files, 14 tests.
- First-party app backend typechecks — Pass.
- `pnpm -C autobyteus-application-sdk-contracts test` — Pass: 4 tests.
- First-party app package rebuilds passed:
  - `pnpm -C applications/brief-studio build`
  - `pnpm -C applications/socratic-math-teacher build`
- Full server build passed:
  - `pnpm -C autobyteus-server-ts build`

Local-fix re-entry checks after code review CR-001/CR-002:
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-bundles/file-application-bundle-provider.test.ts --reporter dot` — Pass: 1 file, 14 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Pass.
- `pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts stores/__tests__/applicationStore.spec.ts --reporter dot` — Pass: 2 files, 9 tests.

No-migration rework / CR-004 local-fix checks:
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-execution-resource-stale-state.test.ts --reporter dot` — Pass: 1 file, 4 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Pass.
- Focused server regression sweep — Pass: 6 files, 32 tests.
  ```bash
  pnpm -C autobyteus-server-ts exec vitest run \
    tests/unit/application-orchestration/application-execution-resource-stale-state.test.ts \
    tests/unit/application-orchestration/application-execution-resource-configuration-service.test.ts \
    tests/unit/application-orchestration/application-execution-resource-resolver.test.ts \
    tests/unit/application-orchestration/application-orchestration-host-service.test.ts \
    tests/unit/application-bundles/file-application-bundle-provider.test.ts \
    tests/unit/api/rest/application-backends-execution-resource-configurations.test.ts \
    --reporter dot
  ```
- Search evidence:
  - `rg "migrateOwnerToSource|migrateRunBindingSummaryJson|normalizeStoredExecutionResourceRef|store migrations|migrates saved setup|migrates run-binding|owner to source|resourceRef/owner to executionResourceRef|migration success" autobyteus-server-ts/src/application-orchestration/stores autobyteus-server-ts/tests/unit/application-orchestration` returns no forbidden helper/test-success hits.
  - `find autobyteus-server-ts/tests/unit/application-orchestration -name '*migration*execution-resource*' -o -name 'application-execution-resource-store-migrations.test.ts'` returns no files.
  - `rg "LIKE '%\"owner\"%'|LIKE '%\"resourceRef\"%'" autobyteus-server-ts/src/application-orchestration/stores autobyteus-server-ts/tests/unit/application-orchestration` returns no broad substring stale predicates.
  - Key-specific predicate search shows JSON-path predicates only (`$.owner`, `$.resourceRef`, `$.executionResourceRef.owner`).
  - False-positive preservation tests cover valid new setup refs and run-binding summaries with identity values `owner` and `resourceRef`.

API/E2E Round 3 Local Fix checks:
- `pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts --reporter dot` — Pass: 1 file, 2 tests.
- `pnpm -C autobyteus-web exec vitest run components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts stores/__tests__/applicationStore.spec.ts components/applications/setup/__tests__/ApplicationTeamLaunchProfileEditor.spec.ts --reporter dot` — Pass: 4 files, 14 tests.
- `rg ":available-execution-resources=|availableExecutionResources" autobyteus-web/components autobyteus-web/pages autobyteus-web/stores` — no old prop binding/identifier remains in active web app areas; focused `rg` confirms the parent now binds `:available-resources="availableResources"`.
- I did not restart the full live server/frontend stack in implementation rework because API/E2E owns the live README validation environment; the new focused web test mounts the real slot editor and catches the exact undefined-prop crash path.

## Downstream Validation Hints / Suggested Scenarios

- Public old manifest/API keys reject with clear diagnostics: `resourceSlots`, `allowedResourceOwners`, `allowedResourceKinds`, `defaultResourceRef`, `resourceRef`, and public `owner` refs.
- Current new execution-resource setup/list/configure/start-run flow still works.
- Stale configured-resource store rows with old keys are reset to not-configured and require setup reconfiguration.
- Stale run-binding summaries with old keys are dropped/ignored and not exposed through binding read/list APIs.
- First-party Brief Studio and Socratic Math Teacher packages contain new `execution-resources` artifacts and no old `runtime-resources` artifacts.

## API / E2E / Executable Validation Still Required

Yes. Superseded API/E2E and delivery evidence must not be reused as current sign-off. After code review of this local fix, API/E2E must rerun the live Brief Studio README validation flow plus realistic application setup/import/launch flows and explicit no-migration stale-state scenarios.
