# Handoff — Architecture Design Complete (URGENT, direct route)

- Package: `imported-team-defaults-edit`
- Revision: SR-003
- Classification: `task_size=Small`, `architectural_risk=Low` → `/software_engineering_team/implementation_engineer`
- Date: 2026-10-14

## Request

URGENT Task `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900`: saving an imported Team's default runtime/model fails with "external_readonly", while member edits work. Release as a beta; the user checks it.

## Approved Direction (user, 2026-10-14)

"Let's make it as they're just, all of them are editable … No need to store in personal for individual … keep a simple solution for now." Teams/Orgs from registered agent packages become writable exactly like Agents already are; saves go into the package folder. The earlier personal-preference design (SR-001/SR-002) is withdrawn.

## Change (authority: design-spec.md SR-003)

- Rename the source class `external_read_only` → `registered_package` (mutation owner `package_author`).
- `assertDefinitionSourceWritableByRuntime` allows `server_data` and `registered_package`.
- Team/Org update and delete then pass. The existing atomic transaction, revision check, validation and filesystem checks are unchanged. Org-owned Teams are still changed only through their Org.
- Tests and docs per the design.

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/solution-revision-record.md`
- Prior review of the withdrawn design: `design-review-report.md` (ARCH-REV-001, SR-001). Not applicable to SR-003.
- Supplements / Product Design: N/A — not applicable

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit`, branch `codex/imported-team-defaults-edit`
- Base `origin/personal` @ `c285adf6bf`; target `origin/personal`
- Release: beta (Task)

## Risks / Follow-ups

- GitHub-installed packages: edits are overwritten by updates (the same as Agents).
- Agent saves add empty fields to `agent-config.json`.
- Avatar and personal overrides: future.
