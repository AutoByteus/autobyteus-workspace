# Implementation Handoff — imported-team-defaults-edit

**Current round: IR-002 (Local Fix IMPL-F-001 from failure-origin review CRR-001 of API-F-001; `Small` / `Low`, direct
route unchanged).** IR-001 was the initial baseline. Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit`, branch `codex/imported-team-defaults-edit`
(base `origin/personal` @ `c285adf6bf`). Commits: see "Commits".

## IR-002 — IMPL-F-001: package saves keep relative links

- **Defect (API-F-001, CRR-001):** the shared package writer staged a save with
  `fs.cp(canonicalPath, stagePath, { recursive: true, errorOnExist: true })`, which turns relative symlinks into
  absolute paths of this machine; the staged copy then replaced the folder. Before IR-001 only app-data folders reached
  it; registered packages (git checkouts such as the SE Team) have such links.
- **Fix:** `definition-package-transaction.ts` stages with `verbatimSymlinks: true`, so links are copied as authored. The
  same transaction serves Team and Org saves. Nothing else changes.
- **Tests:** `registered-package-definition-writes.test.ts` +2: the writer keeps a relative file link and a relative
  directory link unchanged (`readlink` returns the same string, the link still resolves) after a commit; a registered
  Team save keeps the package's relative link. Both fail with the previous `fs.cp` options (negative check done).
- **Checks:** `tsc -p tsconfig.build.json --noEmit` clean; affected unit/integration suites 91 files / 659 tests passed;
  `tests/e2e/agent-team-definitions/registered-package-definition-edit.e2e.test.ts` (scripted AGY,
  `RUN_AGY_FAILURE_E2E=1`) 8/8 pass, including RPE-008 (`implementation-evidence/ir-002/rpe-e2e.log`).
- **For re-validation:** RPE-008 and the full RPE file, and a UI re-save on the kept instance `iso-60463-5627`
  (package copy `/private/tmp/ited-pkg`) where `git status` shows only the intended files.
- **Follow-ups (not in this fix):** O-3 (a process whose cwd is inside the swapped folder is left in a deleted
  directory); BASE-001 (stale `agent-team-definitions-graphql.e2e.test.ts`).

## Upstream basis

- Design: `design-spec.md` SR-003 (`Ready`); requirements `requirements-doc.md` SR-003 (approved by the user 2026-10-14:
  registered-package Teams/Orgs are editable like Agents; no personal settings).
- Investigation: `investigation-notes.md`; history: `solution-revision-record.md`.
- Independent architecture review: N/A — not applicable (direct route; `design-review-report.md` reviewed the withdrawn SR-001).
- Supplements / Product Design: N/A — not applicable.

## Routing classification

- `task_size=Small`, `architectural_risk=Low` — confirmed. One source-class rename (server only; the class is computed at
  read time and not exposed through GraphQL or the web), one rule change, tests and docs. No new persistence, contract,
  API or concurrency. Route: direct API/E2E (per `get_handoff_rules`). Design impact: none.

## Change

| Item | Files |
| --- | --- |
| `DefinitionSourceClass` `external_read_only` → `registered_package`; `DefinitionMutationOwner` `external_project` → `package_author` (no alias; nothing persisted uses it) | `collaboration-definition-admission/domain/definition-source-descriptor.ts`, `agent-package-definitions/domain/registered-package-roots.ts`, `agent-package-definition-types.ts`, `agent-team-definition/providers/file-agent-team-definition-provider.ts`, `agent-team-definition/services/agent-team-definition-service.ts`, `agent-org-definition/providers/file-agent-org-definition-provider.ts`, `agent-org-definition/services/agent-org-definition-service.ts` |
| `assertDefinitionSourceWritableByRuntime` refuses only `implementation_repository` ("… is part of the app's implementation and cannot be changed from the app."); `server_data` and `registered_package` pass | `definition-source-descriptor.ts` |
| Admission `ownerAction` for load issues of a registered package: "Update this registered package (its folder or source repository) to the current definition format." (same meaning) | `collaboration-definition-admission/services/definition-admission-service.ts` |
| Unchanged: Team/Org update and delete still call the rule; then the existing filesystem check (Teams: `ensureWritableTeamSourcePaths`, "read-only at source path"), the atomic package transaction with the revision check and validation, and the folder reload. Org-owned Teams are still refused outside their Org save. No web change (the source class is not sent to the web; the edit pages already send full payloads). | — |

## Behavior trace

| REQ / AC | Path | Evidence |
| --- | --- | --- |
| REQ-001 / AC-001 | Edit page → `updateAgentTeamDefinition` → service (revision, validation) → provider: rule passes → filesystem check → atomic transaction → reload | `registered-package-definition-writes.test.ts` (Team default runtime/model and description written to `team-config.json`/`team.md` in the package; team-local Agent kept); `registered-package-team-update-graphql.integration.test.ts` (GraphQL mutation writes the package and the hosted catalog serves the saved default) |
| REQ-001 / AC-002, UC-003 | Org provider update/delete | Org default saved into `org-config.json` and Org deleted; `org-avatar-delete.test.ts` (avatar edit saved and delete in a registered package) |
| AC-003 | Atomic transaction revision check | Stale revision → `DEFINITION_REVISION_CONFLICT` (provider and GraphQL); stored content unchanged |
| AC-004 | `findAgentOrgOwnedDefinitionSource` refusal | Org-owned Team in a registered Org: update and delete refused ("atomic parent AgentOrg save") |
| REQ-002 / AC-005 | Definition catalog reload after save; launch precedence unchanged | GraphQL test: `agentTeamDefinitionService.getDefinitionById` (what launch/delegation reads) returns the saved default. Running a Team/delegation on it is left to API/E2E. |
| REQ-003 / AC-006 | Filesystem check after the rule | Package folder `chmod 0555` → "… is read-only at source path …" (skipped as root) |
| Rule | `assertDefinitionSourceWritableByRuntime` | `server_data`, `registered_package` pass; `implementation_repository` refused; `registered_package` owner is `package_author` |

Negative check: with the previous rule restored, 6 of the 7 new tests fail (the Org-owned refusal passes under both).

## Tests changed

- New: `tests/unit/collaboration-definition-admission/registered-package-definition-writes.test.ts` (6),
  `tests/integration/agent-team-definition/registered-package-team-update-graphql.integration.test.ts` (1).
- Updated to the new rule: `org-avatar-delete.test.ts` (registered-package avatar edit and delete now succeed),
  `tolerant-team-package-reading.test.ts` (dropped the update-refused assertion; the test keeps checking that reads never rewrite).
- Renamed value in fixtures: package-definitions reloader/store/watcher/layout tests, `definition-load-issues.test.ts`,
  `definition-admission-service.test.ts`.

## Local checks

- `tsc -p tsconfig.build.json --noEmit` clean (after building `autobyteus-ts`, the SDK packages and the Prisma client in this fresh worktree).
- `vitest run tests/unit/{collaboration-definition-admission,agent-package-definitions,agent-team-definition,agent-org-definition,agent-definition,api/graphql,agent-tools,compositions,app-data-migrations} tests/integration/{collaboration-definition-admission,agent-definition,agent-team-definition} tests/architecture`:
  all pass (143 files; the 5 failures in that run are the next item).
- `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` fails 5/6 for reasons outside this change.
  The file is unchanged on this branch and is out of date with the current schema: it queries the removed
  `TeamMember.refType`, imports a missing `buildTeamLocalTeamDefinitionId`, and expects an older validation message.
- Web: no code change (docs only).

## Docs

- Server: `docs/modules/agent_team_definition.md` (source table row and the rule), `agent_orgs.md`, `agent_definition.md`.
- Web: `docs/agent_teams.md`, `docs/agent_orgs.md`.

## Known risks / residuals

- Edits to a GitHub-installed package are overwritten by a later package update (same as Agents; documented).
- Agent saves still add empty fields to `agent-config.json` (follow-up, out of scope).
- Stale e2e file above: follow-up candidate for the Task manager.

## Downstream coverage hints (API/E2E)

- AC-001/AC-005 end to end: register a package root holding the Software Engineering Team, save Claude Agent SDK /
  claude-sonnet-5-5 / thinking xhigh through the Team edit flow, then start the Team and have the PM delegate the Team; both
  use the saved default by precedence. AC-002 for an Org. AC-007 is the user's check on a beta.

## Upstream Artifact Package

- Requirements doc: `tickets/in-progress/imported-team-defaults-edit/requirements-doc.md`
- Investigation notes: `tickets/in-progress/imported-team-defaults-edit/investigation-notes.md`
- Solution revision record: `tickets/in-progress/imported-team-defaults-edit/solution-revision-record.md`
- Design spec: `tickets/in-progress/imported-team-defaults-edit/design-spec.md` (SR-003)
- Supplemental task artifacts: N/A — not applicable
- Design review report: N/A — not applicable (direct route; the existing report covers withdrawn SR-001)
- Implementation revision record: `tickets/in-progress/imported-team-defaults-edit/implementation-revision-record.md` (IR-001, IR-002)
- API/E2E: `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`; failure-origin review: `code-review-report.md` (CRR-001)

## Commits

- See `git log origin/personal..codex/imported-team-defaults-edit`.
