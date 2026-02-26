# Investigation Notes

## Stage

- Understanding Pass: `Completed`
- Last Updated: `2026-02-20`

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tickets/in-progress/persistence-provider-file-mode/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tickets/in-progress/persistence-provider-file-mode/future-state-runtime-call-stack.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tickets/in-progress/persistence-provider-file-mode/future-state-runtime-call-stack-review.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/startup/migrations.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/config/app-config.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/persistence/file/store-utils.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/package.json`
- `rg -n "from \"@prisma/client\"" src`
- `pnpm ... run build:full`
- `pnpm ... run build:file`
- `pnpm ... run build:file:package`
- `PERSISTENCE_PROVIDER=file pnpm exec vitest run tests/e2e/...`
- `PERSISTENCE_PROVIDER=sqlite pnpm exec vitest run tests/e2e/...`

## Key Findings

1. Ticket location/state
- The ticket already exists at `tickets/in-progress/persistence-provider-file-mode`, so no move was required.

2. Workflow artifact completeness
- Existing artifacts: `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`.
- Missing mandatory workflow artifacts: `investigation-notes.md` and `requirements.md`.

3. Current code baseline
- Startup still runs migrations unconditionally via `src/app.ts:startServer()` -> `runMigrations()`.
- `src/startup/migrations.ts` is Prisma-specific and contains Prisma error recovery paths.
- SQL repositories/providers across active persisted domains still import `@prisma/client`.

4. Deep review finding impacting Android/edge objective
- Existing ticket design covered Prisma-free compile graph (`build:file`) but did not fully specify a Prisma-free install/runtime dependency profile.
- `package.json` currently has hard dependencies on `repository_prisma` and `@prisma/client`.
- For Android/edge deployment, compile-only decoupling is insufficient unless packaging/runtime dependency behavior is also explicitly defined and verified.

5. Deep review finding impacting use-case sufficiency
- Existing use-case set was file-profile heavy and did not explicitly model SQL-profile startup/provider regression path.
- Because requirements already preserve SQL profiles, missing explicit SQL regression use case weakens call-stack completeness for profile-selection behavior.

6. Build-graph validation finding
- `build:file` compilation success alone was insufficient to prove Prisma-free file profile artifacts.
- `tsc --listFilesOnly` initially still included SQL/prisma modules due literal lazy-import paths and one SQL type-only import.
- Resolved by removing SQL type-only coupling in `artifact-service` and replacing literal SQL dynamic-import paths with runtime-computed import paths in registries/proxy set; subsequent file-build graph check no longer included SQL/prisma modules.

7. Endpoint verification finding
- File-profile e2e initially failed with `ENOENT` and JSON parse corruption in prompt file persistence under concurrent test workers.
- Root cause: shared `*.tmp` filename and in-process-only lock map in file store utilities.
- Resolved by adding cross-process file lock files and unique temp filenames in `store-utils.ts`.
- After resetting persistence test data, file-profile and SQL-profile endpoint smoke suites passed.

8. Runtime regression finding (team send GraphQL 400)
- Reproduced frontend-reported failure by sending the same `sendMessageToTeam` mutation shape used by web store:
  - `targetMemberName` in `SendMessageToTeamInput`
  - `workspaceRootPath` in `TeamMemberConfigInput`
- Backend returned GraphQL validation errors before resolver execution:
  - unknown input field `targetMemberName` (backend expected `targetNodeName`)
  - unknown input field `workspaceRootPath` on `TeamMemberConfigInput`
- Root cause: backend schema contract in personal worktree drifted behind frontend/generated schema contract.

9. Enterprise comparison finding
- Compared `enterprise` branch backend resolver (`src/api/graphql/types/agent-team-instance.ts`).
- Enterprise contract includes `targetMemberName` and `workspaceRootPath`.
- Personal branch was missing these compatibility fields; the fix aligns personal branch behavior with enterprise contract expectation.

10. Post-fix verification
- Backend schema now exposes both:
  - `SendMessageToTeamInput.targetMemberName` (plus `targetNodeName` compatibility)
  - `TeamMemberConfigInput.workspaceRootPath`
- Verified by GraphQL introspection query.
- Replayed frontend-shaped mutation:
  - no GraphQL validation failure (`HTTP 200` with resolver response),
  - payload with local LM Studio model successfully created team and returned success.

## Constraints

- Must preserve SQL profiles (`sqlite`/`postgresql`) when selected.
- Must not retain legacy compatibility branches in the new architecture.
- Must support deployment scenarios where Prisma binary/toolchain is not available.

## Open Questions

1. Packaging approach for file profile
- Should file profile artifacts use a dedicated package manifest (no Prisma deps), or keep one manifest with optional dependencies and profile-aware install/build scripts?

2. Runtime guard behavior
- Should startup fail fast with explicit guidance when `PERSISTENCE_PROVIDER=file` is selected but SQL-only dependencies are accidentally present/required?

3. CI matrix scope
- What is the minimum required CI gate to treat file profile as deployable to Android/edge (compile, startup smoke, selected API smoke)?

4. Legacy test expectations
- Should proxy/registry internal-shape tests (that inspect `.provider` and exact class identity) be updated now to reflect lazy-loader semantics, or moved to a dedicated follow-up ticket?

## Implications For Requirements/Design

- Requirements must include explicit acceptance criteria for Prisma-free install/startup in file profile, not just Prisma-free compilation.
- Design/use cases must add a packaging/install use case and trace it to runtime-call-stack and review gate.
- Requirements/design/runtime-call-stack should include one explicit SQL-profile regression guard use case.
- Review gate must enforce two consecutive clean rounds after the last write-back before declaring `Go Confirmed`.
