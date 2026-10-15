# API/E2E Coverage Investigation — imported-team-defaults-edit

- Round: `API-001` against implementation `IR-001` (commit `b5caa04c45`, base `origin/personal@c285adf6bf`)
- Route: direct (`Small` / `Low`); upstream package read in full: requirements-doc (SR-003), investigation-notes, design-spec (SR-003),
  solution-revision-record, implementation-handoff, implementation-revision-record. Architecture review: N/A — not applicable (direct route).
- Authorities: `TESTING.md`, `AGENTS.md`, the `api-e2e-engineer` skill.

## What changed (system boundaries touched)

| Boundary | Change | Who sees it |
| --- | --- | --- |
| Definition source rule (`assertDefinitionSourceWritableByRuntime`) | `registered_package` (was `external_read_only`) now passes; `implementation_repository` still refused | Team/Org update and delete in a registered package folder |
| Team/Org providers | Unchanged order: Org-owned check → rule → filesystem check → atomic transaction (revision, validation) → reload | GraphQL `updateAgentTeamDefinition`, `updateAgentOrgDefinition`, `deleteAgentTeamDefinition` |
| Admission `ownerAction` | Text only, same meaning | Load-issue display |
| Web | Docs only; the edit pages already send full payloads | Team/Org edit pages |

## Existing coverage found

| Layer | Test | Covers | Gap |
| --- | --- | --- | --- |
| Unit | `registered-package-definition-writes.test.ts` (new, 6) | Rule; Team/Org update+delete on a provider; stale revision; Org-owned refusal; chmod error | Providers only; no HTTP, no package registration, no runtime |
| Integration | `registered-package-team-update-graphql.integration.test.ts` (new, 1) | GraphQL Team save into the package; catalog serves the default | Hand-built schema/services; no Org; no delegation; no real server |
| E2E | `delegated-launch-config-defaults.e2e.test.ts` | Delegated copies honor the Team default (app-data Teams) | Not on a registered package; not after an edit |
| E2E | `agent-team-definitions-graphql.e2e.test.ts` | Team CRUD over GraphQL | **Stale on base** (5/6 fail): nested-Team features removed by `37d05c7f71` (flat Orgs); see "Pre-existing failure" |
| Web | none for package Teams | — | The real edit page Save on a package Team; launch form prefill after it |

## Planned coverage

1. **New server E2E** `tests/e2e/agent-team-definitions/registered-package-definition-edit.e2e.test.ts` (real Studio HTTP/GraphQL/WS server,
   the package registered with the real `importAgentPackage` LOCAL_PATH mutation, full edit-page payloads, scripted AGY for the runtime):
   RPE-001..RPE-007 (AC-001..AC-006, UC-003), including a reload race check (two consecutive saves with the returned revision) and the
   delegated copy before and after a second edit.
2. **Mutation check:** restore the old rule; the new E2E must fail.
3. **Repository suites:** server `typecheck`, full `tests/unit` + `tests/architecture`, `test:integration` (the package-related folders and
   the full suite), the implementer's new tests.
4. **Real UI on an isolated desktop instance** built from this worktree (fresh data dir), with a **copy** of the user's real
   `autobyteus-agents` package (no `.git`; a git baseline so every write is diffable; the original checkout is never registered or touched):
   register the copy in Settings, edit the Software Engineering Team default runtime/model in the Team edit page (the screenshot-48 flow),
   Save; check the success, the package diff, the run launch form prefill (AC-005 "start the team"), an Org save, a stale-tab conflict, and a
   chmod folder error in the UI.
5. AC-007 remains the user's beta check.

## Pre-existing failure (TESTING.md Rule 9)

`tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` fails 5/6 on this branch and is unchanged by it. Causes:
- it queries `TeamMember.refType` and writes `refType` members, removed when Teams became agent-only (`37d05c7f71 feat: add flat agent organizations`);
- it imports `buildTeamLocalTeamDefinitionId` (team-local sub-Teams were removed in the same line of work);
- it expects "Coordinator member name must match", but the input now fails GraphQL validation earlier.
Four of the five failing cases test nested-Team behavior that no longer exists. The fix is a rewrite of a 1390-line file, too large for
this urgent Small ticket, so it is **reported as a follow-up** to the Task manager (Solution Designer). The behavior this ticket needs from it
(Team GraphQL save) is covered by the new E2E.
