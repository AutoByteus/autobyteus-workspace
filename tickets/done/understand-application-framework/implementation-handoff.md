# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/application-context-api-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/framework-understanding.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/design-review-report.md`

## Implementation Review Local Fix

- Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/code-review-report.md`
- Round-1 finding `CR-001` is resolved. `startAgentRunBinding` now requires both an `AGENT` launch payload and resolved `AGENT` resource; `startAgentTeamRunBinding` independently requires `AGENT_TEAM` for both. Payload-kind rejection occurs before resource resolution, and resolved-resource rejection occurs before run creation, persistence, observer attachment, or initial input.
- Added six focused launch-boundary tests: valid standalone-agent routing, valid team routing, both opposite launch-kind calls, and both wrong resolved-resource kinds. Negative cases assert no run creation or binding persistence side effect.

## API/E2E Failure Local Fix

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/done/understand-application-framework/api-e2e-execution-coverage-report.md`
- Focused failure-origin finding `CR-002` is resolved. The two affected public/current documents now use the approved named capability and pending-launch-request vocabulary at exactly the three reported locations.
- The unrelated `runtime-control route key` wording in `autobyteus-web/docs/agent_teams.md` remains unchanged, as required.
- This rework changes documentation only. No executable source, durable API/E2E test, fixture, generated package, schema, or migration file was changed by the fix.

## What Changed

- Replaced the public application-backend `runtimeControl` surface with the exact v3-only `agentExecution`, `agentResources`, and `publishedArtifacts` capability contract.
- Split launch into typed `startAgent` and `startAgentTeam` paths, renamed the durable correlation to `launchRequestId`, and added application-scoped `findByLaunchRequestId` lookup while retaining the existing orchestration authorities.
- Enforced each explicit start method's own subject kind at the runtime launch boundary for both its payload and resolved execution resource.
- Replaced the worker/host reverse call with a discriminated `{ capability, operation, input }` protocol and strict host dispatch.
- Advanced backend definition/manifest/template validation from v2 to v3 and added explicit early v2 rejection coverage.
- Extracted and exported the exact nine-field `ApplicationPublishedArtifactSummary`, re-exported it through the backend SDK, and regenerated checked-in declarations.
- Changed current platform binding and event-journal DDL/serialization directly to launch-request naming. Removed the old-column ALTER/stale-summary cleanup from the binding store; no schema version, transform service, compatibility reader, or reset behavior was added.
- Renamed both built-in apps' pending correlation repositories and baseline SQL directly, updated their services to the new capabilities, and rebuilt their executable backends and importable packages.
- Updated current documentation, focused unit/integration fixtures, and repository terminology. No frontend, iframe, HTTP, WebSocket, or output-streaming behavior was added.
- Corrected the final three stale current-documentation references: SDK capability ownership and pending launch requests in `autobyteus-web/docs/applications.md`, plus agent execution/resources in `autobyteus-server-ts/docs/modules/application_backend_gateway.md`.
- Removed all halted partial migration work: no `ApplicationPlatformSchemaMigrationService`, no Brief `006`/Socratic `004` rename migration, and no ticket diff in `ApplicationMigrationService` or `ApplicationStorageLifecycleService`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Exact three-capability handler context; preserve request/storage/notification members | Contract and backend SDK exports; `application-worker-runtime.ts`; worker/host protocol | Implemented v3-only context; old public type/property removed. |
| `BEH-002` | Explicit standalone-agent/team starts and unchanged shared lifecycle operations | `application-worker-runtime.ts` -> `application-engine-host-service.ts` -> `application-orchestration-host-service.ts` -> `application-run-binding-launch-service.ts` | Separate typed launch paths reach existing agent/team authorities; runtime payload/resource subject guards reject cross-method kinds before side effects; input/observer/termination behavior retained. |
| `BEH-003` | Move resource discovery/configuration under `agentResources` | Worker capability adapter and host dispatcher delegate to existing orchestration resource resolver/configuration service | Implemented without changing resource filters, slot resolution, or authority. |
| `BEH-004` | Move durable artifact reads under `publishedArtifacts` and export the exact item type | Contract/backend SDK; worker adapter; orchestration host; existing published-artifact projection service | Implemented exact nine-field summary and existing list/revision behavior. |
| `BEH-005` | Rename cross-database correlation to launch request and preserve recovery | Binding contract/store/journal; both built-in pending-launch-request repositories and correlation services | Non-empty unique launch ID is persisted, echoed, app-scoped, and nullable lookup drives interrupted-handoff reconciliation; no idempotent launch promise added. |
| `BEH-006` | Atomic v3 source/package/current-schema cutover | Manifest parsers/writers/template, current platform DDL, baseline app SQL, generated backends/importable packages | Implemented one canonical v3/fresh-schema path. v2 is rejected before handler invocation. No legacy product path exists. |
| `BEH-007` | Keep runtime output streaming out of scope | No frontend/transport/stream changes | Preserved absence as required. |

## Key Files Or Areas

- Public contracts and SDK: `autobyteus-application-sdk-contracts/src/index.ts`, `autobyteus-application-backend-sdk/src/index.ts`, their checked-in `dist` declarations, and package READMEs.
- Package tooling: `autobyteus-application-devkit/src/**`, basic backend template, manifest parser/writer tests, and server bundle manifest parser.
- Worker/host boundary: `autobyteus-server-ts/src/application-engine/runtime/protocol.ts`, worker runtime/bridge/entry, and engine host service.
- Orchestration/current persistence: orchestration host, run-binding launch service, binding store, and execution-event journal store.
- Built-in applications: Brief Studio and Socratic Math Teacher backend source, renamed baseline SQL/repositories, regenerated `backend/**`, vendored declarations, and `dist/importable-package/**`.
- Tests/docs: focused application bundle/engine/orchestration/app-owned tests plus server/application development documentation.

## Important Assumptions

- The application feature remains unreleased and has no supported application data to preserve.
- Existing pre-release application storage is disposable and is outside the product contract; tests and downstream validation start from isolated fresh state.
- Backend definition contract v3 is a source/package compatibility marker, not a platform database schema version.
- `ApplicationOrchestrationHostService` and its focused launch/resource/artifact services remain behavioral authorities.

## Known Risks

- API/E2E reported all operational executable and fresh-schema scenarios passing, but its final inventory found the now-corrected documentation gap. Source review and the API/E2E inventory/regression rerun remain required; the implementation checks below are not API/E2E sign-off.
- The API/E2E engineer retained one non-reproducing existing lifecycle polling timing observation; the exact affected file subsequently passed three consecutive runs and the full suite passed without a code change.
- External or locally retained v2 application packages will not load until rebuilt against v3, by design.
- The repository-level server `pnpm typecheck` command remains unusable because baseline `tsconfig.json` sets `rootDir: src` while including `tests`; it emits TS6059 for the existing test tree. The build-specific TypeScript configuration and full server build pass.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Refactor`
- Reviewed root-cause classification: `Boundary Or Ownership Issue` and `Shared Structure Looseness`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `Yes` — the initial migration-based implementation was halted and returned when the approved basis changed; implementation resumed only after corrected round-4 review passed.
- Evidence / notes: The public/IPC aggregation was split while the orchestration boundary remained authoritative. The exact artifact summary was extracted once. Redundant current persistence correlation columns and old cleanup/ALTER logic were removed rather than retained as parallel shapes.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Active source/generated/docs inventory contains none of the removed context/intent tokens. v2 literals remain only in explicit rejection tests and the current documentation statement that v2 is rejected.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Discard or Rebuild`
- Design-spec decision reference: `design-spec.md` — `Persisted Data / State Transition Decision` and `Fresh-Storage Cutover Plan`
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: Current platform DDL creates only `launch_request_id`; built-in baseline Brief `004` and Socratic `002` create only pending-launch-request names; focused temporary-storage unit tests passed. No product deletion/reset path was added.
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework`
- Node.js: `v22.23.1`
- pnpm: `10.28.2`
- Dependencies were provisioned with `pnpm install --frozen-lockfile` before implementation checks.
- Prisma client generation was run with `pnpm exec prisma generate --schema ./prisma/schema.prisma` before server compilation.

## Local Implementation Checks Run

- `pnpm install --frozen-lockfile` — passed.
- `pnpm --filter @autobyteus/application-sdk-contracts test` — passed, 4 tests.
- `pnpm --filter @autobyteus/application-backend-sdk build` — passed.
- `pnpm --filter @autobyteus/application-devkit test` — passed, 13 tests including explicit v2 manifest rejection.
- `pnpm --filter @autobyteus-example/brief-studio-authoring typecheck:backend` — passed.
- `pnpm --filter @autobyteus-example/socratic-math-teacher-authoring typecheck:backend` — passed.
- Both built-in application `build` scripts — passed and regenerated checked-in backends/importable packages.
- `pnpm exec tsc -p tsconfig.build.json --noEmit` in `autobyteus-server-ts` — passed after final source changes.
- `pnpm run build:full` in `autobyteus-server-ts` — passed after final source changes, including built-in agent bootstrap smoke check.
- Focused server unit run across 13 changed application bundle/engine/orchestration/app-owned/storage files — passed, 13 files and 80 tests. The final orchestration-host refactor was additionally rerun separately: 1 file and 6 tests passed.
- `CR-001` focused rework check: build-config TypeScript compilation plus launch-service, orchestration-host, and engine-host unit tests — passed, 3 files and 16 tests. This includes 6 new launch-service tests covering both valid routes and all method/payload/resource kind mismatches.
- `pnpm run build:full` after `CR-001` rework — passed, including the built-in agent bootstrap smoke check.
- `git diff --check` — passed.
- Repository inventory for removed public/current tokens — clean outside ticket history; prohibited migration service and appended rename SQL files are absent; storage lifecycle/migration service production files have no ticket diff; platform schema metadata remains version `1`.
- `CR-002` exact conceptual inventory (`runtime[- ]control|pending[- ]binding[- ]intent`) across the two affected current documents — passed with no matches.
- `CR-002` broader active removed-token inventory across SDK, devkit, server, built-in applications, web, and root docs — passed with no matches outside excluded dependency/generated caches and ticket history.
- `CR-002` diff hygiene — passed: protected `autobyteus-web/docs/agent_teams.md` is unchanged from base; prohibited platform/appended migration artifacts remain absent; generic migration/lifecycle production services remain unchanged from base; `git diff --check` passed.
- No build or executable test was rerun for `CR-002` because the bounded fix modifies documentation only.
- `pnpm typecheck` in `autobyteus-server-ts` — failed on the pre-existing TS6059 configuration issue (`rootDir` is `src` while `tests` is included). Its prerequisite shared builds passed, and `tsconfig.build.json` compilation/full build passed.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — this is a backend contract, worker/host, orchestration, persistence-definition, package, and documentation refactor. Frontend/iframe behavior is explicitly unchanged and no rendered surface was modified.

## Downstream Coverage Hints / Suggested Scenarios

- Initialize isolated fresh platform storage and assert binding/event-journal tables contain `launch_request_id`, no old correlation column, current binding JSON, and working application-scoped lookup.
- Replay each built-in app's baseline SQL into a fresh `app.sqlite`; verify the renamed pending table/columns and full launch/finalize/reconcile flow.
- Exercise both `startAgent` and `startAgentTeam` across the real worker/host boundary, including initial input, later `sendInput` metadata/context files/member targeting, get/list/find/terminate.
- Exercise resource list/configuration and artifact list/revision reads across the worker/host boundary, including existing failure/not-found behavior.
- Verify both manifest discovery and worker definition load reject explicit v2 fixtures before handler execution, while regenerated built-in v3 packages load.
- Run the changed application backend HTTP/GraphQL/WebSocket integration suites to confirm external routes/transports are unchanged.
- Repeat the old-token/generated-output inventory from the integrated execution state.

## API / E2E / Executable Coverage Re-execution Still Required

Yes. After implementation-source review passes, `api_e2e_engineer` must rerun the failed inventory and relevant regression checks, refresh its execution evidence and confidence assessment, and return successful durable test changes for proportional test-code review.
