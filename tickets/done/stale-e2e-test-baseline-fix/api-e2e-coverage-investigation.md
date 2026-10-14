# API/E2E Coverage Investigation — stale-e2e-test-baseline-fix

- Task: `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900` (scope extended by the user); request from `/software_engineering_team/solution_designer`
  (`autobyteus-delivery-receipts/imported-team-defaults-edit/stale-e2e-test-fix-request.md`).
- Route: direct, test-only baseline fixes (TESTING.md Rule 9). Small / Low. No product change, no release.
- Worktree `autobyteus-worktrees/stale-e2e-test-fix`, branch `codex/stale-e2e-baseline-fix`, base `origin/personal@50b7436229`.
- Parent `imported-team-defaults-edit` is merged and released as beta `v1.5.4-beta.2`; not reopened.

## Failures on the clean base (`evidence/before-fix.log`)

7 of 10 cases fail in the two files:

| File | Case | Cause |
| --- | --- | --- |
| `agent-team-definitions-graphql.e2e.test.ts` | create/update/list templates/delete | queries the removed `TeamMember.refType`; update mutation has no `expectedRevision` (now required); nested Team members |
| same | TEAM_LOCAL round trip | `refType`; no `expectedRevision` |
| same | 2 nested-Team cases | import the removed `buildTeamLocalTeamDefinitionId`; test sub-Teams/departments that the flat model removed (`37d05c7f71`) |
| same | coordinator validation | sends `refType`, so GraphQL input validation fails before the service message is reached |
| same | schema contract | passes (unchanged) |
| `agent-package-private-skills.e2e.test.ts` | Codex materialization | `bootstrapForCreate` takes a `ProviderPreparationGuard` (`028cca2312`); the client manager is leased with `beginAcquire` (the mock exposed `acquireClient`/`releaseClient`) |
| same | AutoByteus config | `createBackend` is private (`54eaac53a`); the public path is `beginPreparation(request).prepare()` |

The other 2 private-skills cases pass and are unchanged.

## Overlap with existing coverage

`registered-package-definition-edit.e2e.test.ts` (RPE-001..008) already covers registered-package Team/Org saves, stale revisions over a package, Org-owned Team refusal, the unwritable-folder error and delegated copies. The rewrite therefore stays on **app-data** definitions and does not repeat those cases.

## Decisions

- `agent-team-definitions-graphql`: rewrite to the flat model. Dropped the two nested-Team cases (the feature no longer exists). Kept the Team CRUD/template/team-local/contract/validation coverage in current shape, and added what the flat model now makes unique:
  - the update carries the revision it loaded (and the schema requires it);
  - a Team member names an Agent only (no member type): `refType` is refused;
  - an Org of an Agent and a Team (create → update with revision → delete) over the same GraphQL surface (no other E2E covers Org definition CRUD).
  The test builds the real Org and admission services (as `agent-packages-graphql.e2e.test.ts` does), because the E2E helper fails any unprovided service.
- `agent-package-private-skills`: minimal API updates only (guard, lease mock, `beginPreparation`). The Codex lease mock now serves `skills/list`, so every configured skill is exposed in the workspace as before.
