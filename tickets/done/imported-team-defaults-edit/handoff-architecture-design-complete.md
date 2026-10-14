# Handoff — Architecture Design Complete (URGENT)

- Package: `imported-team-defaults-edit`
- Revision: SR-002 (response to ARCH-REV-001; see design-spec.md → Revision Notes (SR-002))
- Classification: `task_size=Medium`, `architectural_risk=High`
- Rule: High → `/software_engineering_team/architecture_reviewer`
- Date: 2026-10-14

## Request

URGENT Project Task `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900`: editing an imported Team's default runtime/model fails with "external_readonly", while a member edit works. Make team-level (and Org) defaults editable; never write into the package; keep precedence; release as a beta for the user to check.

## Diagnosis

- Team/Org writes are refused by the `external_read_only` source policy.
- Agent writes bypass it and write into the user's package checkout. Verified: uncommitted `agent-config.json` changes in `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/*`.

## Approved Direction (user)

Launch defaults are personal settings kept in the app, never in the package. Quote: "it should be kept in the app … if we … commit the repository … everybody will just inherit that value … this kind of setting belongs to individual user themselves" (2026-10-14).

## Design Summary (design-spec.md)

- A `agent-launch-preferences.json` store in server data.
- A service-level overlay (`preference ?? package default`) for package-sourced Agents, Teams and Orgs.
- A split update:
  - a default-only Save writes the preference;
  - other imported Team/Org fields are refused with `DEFINITION_PACKAGE_READ_ONLY`;
  - Agent `defaultLaunchConfig` stops being written into packages, while other agent fields keep today's path.
- An audit of readers that bypass the services.

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/solution-revision-record.md`
- Prior review: `design-review-report.md` (ARCH-REV-001) and `architecture-review-revision-record.md`
- Supplements / Product Design: N/A — not applicable

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit`, branch `codex/imported-team-defaults-edit`
- Base `origin/personal` @ `c285adf6bf`; target `origin/personal`
- Release: beta (the Task requires it)

## Risks

- Readers bypassing services.
- The user's existing uncommitted package edits remain package values (non-goal).
