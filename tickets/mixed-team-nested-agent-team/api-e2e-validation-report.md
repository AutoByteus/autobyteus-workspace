# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md`
- App-Data Migration Design Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/app-data-migration-design-rework-note.md`
- Command API Design Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/command-api-clean-cut-design-rework-note.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/review-report.md`
- Current Validation Round: 16
- Trigger: Code review Round 31 pass at HEAD `b06a74cd fix(team): remove name-based runtime targets`.
- Latest Authoritative Round: Round 16 (`Pass`)
- Repository-resident durable validation added or updated by API/E2E in this round: `No`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 14 | Code review Round 25 app-data migration pass | First-start legacy metadata upgrade, status/retry, Settings migrations UI, and degraded history/restore UX | `APPDATA-MIG-005`: empty-index workspace history leaked raw legacy-metadata error while rebuilding from disk | Fail | No | Routed Local Fix to implementation. |
| 15 | Code review Round 26 `APPDATA-MIG-005` fix plus user-requested historical fixture/E2E durability | Round 14 raw `listWorkspaceRunHistory` empty-index failure | None | Pass; validation-code re-review required | No | Added clean historical flat metadata integration fixture/test and browser proof showing `SUCCEEDED`, `Migrated 1`, `Failed 0`. |
| 16 | Code review Round 31 refresh pass after name-based runtime target removal | Round 30 findings `CR-ROUND30-001`, `CR-ROUND30-002`, `CR-ROUND30-003`; Round 15 app-data migration durability | None | Pass | Yes | Validated route/path-only application runtime-control, external-channel team binding/dispatch/output identity, run-history status identity without bare display-name fallback, and app-data migration regression durability. |

Older nested mixed-team validation rounds remain recorded in earlier versions of this report and in the cumulative artifacts. Round 16 supersedes Round 15 as the latest API/E2E result.

## Validation Basis

Round 16 validates the code-review-passed current integrated implementation state at `b06a74cd fix(team): remove name-based runtime targets`.

The validation focus came from code review Round 31:

- Application runtime-control team input must use `targetMemberRouteKey` / `targetMemberPath`; raw `targetMemberName` must be rejected before dispatch.
- External-channel team binding, dispatch, output, delivery, and callback identity must use route/path/run identity; `targetNodeName` and `entryMemberName` must not remain active accepted target fields.
- Team run-history member status must not match a member by bare visible/provider `agent_name`; duplicate visible names must stay safe because status identity uses `memberRunId` or `platformAgentRunId`.
- `agent_name` and provider-native names are allowed only as display/provider metadata, never command target authority.

Round 16 result is `Pass`. API/E2E did not add or update repository-resident durable validation code in this round; only this validation report was updated.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce backward-compatible runtime target aliases in scope: `No`
- Application runtime-control accepted legacy `targetMemberName`: `No`; focused tests cover rejection.
- External-channel accepted legacy `targetNodeName` / `entryMemberName`: `No`; scans found no active reviewed-path matches.
- Run-history status fallback by visible/provider name: `No`; focused regression covers a matching `agent_name` with mismatched run id returning safe offline status.
- Historical flat metadata handling remains isolated to app-data migration/degraded UX boundaries: `Yes`
- Reroute classification needed for implementation/design: `No`

## Coverage Matrix

| Scenario ID | Scenario | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| ROUTE-TARGET-001 | Application runtime-control posts to team members with route/path targets and rejects raw `targetMemberName` | SDK build + application orchestration focused tests | Pass | `pnpm -C autobyteus-application-sdk-contracts build` passed. Focused backend suite includes `application-orchestration-host-service.test.ts` and `brief-studio-imported-package.integration.test.ts`; combined suite passed 12 files / 67 tests. |
| ROUTE-TARGET-002 | External-channel TEAM binding/setup/dispatch/output uses route/path/run identity | Backend unit + GraphQL/E2E focused tests | Pass | Focused suite covered channel facade, binding service, ingress service, output parser/delivery runtime/service, reply callbacks, setup GraphQL E2E, and team open-delivery E2E; 12 files / 67 tests passed. |
| ROUTE-TARGET-003 | Run-history member status does not fall back to bare provider/display `agent_name` under duplicate visible names | Backend run-history focused tests | Pass | `team-run-history-service.test.ts` passed in the 12-file suite; regression title `does not use bare agent_name as a team member status identity fallback` is present and passed. |
| ROUTE-TARGET-004 | Removed name-based active target fields are absent from reviewed command/identity paths | Targeted source scans | Pass | No `targetNodeName`, `entryMemberName`, snake_case equivalents, or run-history `agent_name === member.memberName` fallback matches. `targetMemberName` remains only as an explicit rejection diagnostic in `ApplicationOrchestrationHostService`. |
| APPDATA-MIG-009 | Prior API/E2E historical-format migration durability still passes on latest integrated state | Backend app-data focused tests | Pass | `team-run-metadata-member-tree-history.integration.test.ts`, `team-run-metadata-member-tree-migration.test.ts`, and `app-data-migration-runner.test.ts` passed: 3 files / 9 tests. |
| STATIC-ROUND31-001 | Type/schema/localization/static checks remain clean | Typecheck/prisma/localization/git | Pass | Server `tsc --noEmit`, `prisma validate`, frontend localization audit, `git diff --check`, `git diff --cached --check`, and `git diff --check origin/personal...HEAD` all passed. |

## Commands And Evidence

Focused route/path target and external-channel validation:

```bash
pnpm -C autobyteus-application-sdk-contracts build

pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/application-orchestration/application-orchestration-host-service.test.ts \
  tests/integration/application-backend/brief-studio-imported-package.integration.test.ts \
  tests/unit/external-channel/runtime/channel-team-run-facade.test.ts \
  tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts \
  tests/unit/external-channel/runtime/channel-output-event-parser.test.ts \
  tests/unit/external-channel/services/channel-binding-service.test.ts \
  tests/unit/external-channel/services/channel-ingress-service.test.ts \
  tests/unit/external-channel/services/channel-run-output-delivery-service.test.ts \
  tests/unit/external-channel/services/reply-callback-service.test.ts \
  tests/unit/run-history/services/team-run-history-service.test.ts \
  tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts \
  tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts \
  --reporter=dot
# Result: 12 files / 67 tests passed.
```

App-data migration regression durability recheck:

```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts \
  tests/unit/app-data-migrations/team-run-metadata-member-tree-migration.test.ts \
  tests/unit/app-data-migrations/app-data-migration-runner.test.ts \
  --reporter=dot
# Result: 3 files / 9 tests passed.
```

Static checks:

```bash
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false
pnpm -C autobyteus-server-ts exec prisma validate
pnpm -C autobyteus-web audit:localization-literals
git diff --check
git diff --cached --check
git diff --check origin/personal...HEAD
# Result: all passed.
```

No-legacy scans:

```bash
rg -n "targetNodeName|entryMemberName|target_node_name|entry_member_name" \
  autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-application-sdk-contracts/src applications \
  --glob '!**/dist/**' --glob '!**/node_modules/**' --glob '!**/.nuxt/**'
# Result: no matches.

rg -n "targetMemberName" \
  autobyteus-application-sdk-contracts/src autobyteus-server-ts/src/application-orchestration autobyteus-server-ts/src/external-channel \
  --glob '!**/dist/**' --glob '!**/node_modules/**'
# Result: only explicit rejection diagnostic in ApplicationOrchestrationHostService.

rg -n "candidate\.agent_name|agent_name\s*===\s*member\.memberName|member\.memberName\s*===\s*candidate\.agent_name|memberRouteKey \|\| memberName|\|\| member\.memberName" \
  autobyteus-server-ts/src/run-history autobyteus-server-ts/tests/unit/run-history autobyteus-web/services/runHydration autobyteus-web/stores \
  --glob '!**/dist/**' --glob '!**/node_modules/**'
# Result: no matches.
```

## Failures / Send-Backs

None.

## Handoff Decision

Round 16 passed with no repository-resident durable validation code added or updated by API/E2E after code review Round 31. Per workflow, the cumulative package is ready for `delivery_engineer`.
