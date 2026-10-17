# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (supersedes SR-001/SR-002, the personal-preference approach, which is withdrawn)
- Package identifier: `imported-team-defaults-edit`
- Request: Project Task `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900` (URGENT, 2026-10-14)
- Requirements owner: Solution Designer
- Date: 2026-10-14
- Approval state and reference:
  - The user decided (2026-10-14): "Let's make it as they're just, all of them are editable … No need to store in personal for individual … I wanna keep it simple for now."
  - This follows the user's reasoning that package content (tools, skills, and the tested runtime/model combination) belongs in the package the author publishes.
  - It replaces the Task's "external package files stay untouched" and the earlier personal-setting direction.
- Approved baseline: `SR-003`
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem:** saving an imported (registered-package) Team or Org fails with "… is external_read_only; cannot be written by the server runtime", while imported Agents save fine (their edits are written into the package folder).
- **Desired outcome:** imported Teams and Orgs are editable and savable from the app exactly like imported Agents. Saves are written into the package folder, including the default runtime/model, which becomes the package's default for everyone using it.
- **Observable success:** Agent Teams → Software Engineering Team → Edit → set Claude Agent SDK / claude-sonnet-5-5 / thinking xhigh → Save succeeds. `team-config.json` in `autobyteus-agents` contains the new `defaultLaunchConfig`, and new runs and delegated copies use it.

## Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Imported Team save/delete refused by the source-class rule | Allowed, written into the package folder with the existing atomic save and revision check | Org-owned Teams still change only through their parent Org save; revision conflicts still reported |
| BEH-002 | Imported Org save/delete refused | Allowed, likewise | Atomic Org package save |
| BEH-003 | Imported Agent saves write into the package | Unchanged | — |
| BEH-004 | Launch precedence | Unchanged: explicit launch choice > agent default > team default > inherited | — |

## Scope

### In Scope

- UC-001: edit and save an imported Team, all fields the edit page offers.
- UC-002: the same for an imported Org.
- UC-003: delete of imported Teams/Orgs, consistent with imported Agents (already deletable).

### Out Of Scope

- Personal/private settings (withdrawn).
- Moving the avatar out of packages.
- Cleaning the extra empty fields the Agent save writes (`skillScope`, empty processor lists, `avatarUrl: null`): a follow-up candidate.
- GitHub-installed packages getting edits overwritten by a later package update: a known limitation, the same as for Agents today.
- `implementation_repository` sources stay non-writable.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| REQ | Requirement | BEH | Priority |
| --- | --- | --- | --- |
| REQ-001 | Definitions from registered agent packages (local folder or GitHub install) are writable by the app for Teams and Orgs, as they already are for Agents. Saves use the existing atomic package save, revision check, validation and filesystem-writability check. | BEH-001, BEH-002 | Must |
| REQ-002 | A saved default runtime/model is used by new runs and delegated copies/collaborators per the existing precedence. Definitions refresh after the save, as for app-data definitions. | BEH-004 | Must |
| REQ-003 | Error messages no longer call registered packages read-only. A real filesystem permission problem still fails with the existing "read-only at source path" message. | BEH-001 | Must |

## Acceptance Criteria

| AC | REQ | Trigger | Expected |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | Save the SE Team default (and other fields) on a registered package | Succeeds; `team-config.json`/`team.md` in the package are updated |
| AC-002 | REQ-001 | The same for an Org in a registered package | Succeeds; the Org package is updated atomically |
| AC-003 | REQ-001 | Concurrent edit (stale revision) | `DEFINITION_REVISION_CONFLICT`, as for app-data definitions |
| AC-004 | REQ-001 | Edit an Org-owned Team directly | Still refused ("only through the parent AgentOrg save") |
| AC-005 | REQ-002 | After AC-001, start the team; the PM delegates the team | Uses the saved default by precedence |
| AC-006 | REQ-003 | Package folder not writable on disk | Existing "read-only at source path" error |
| AC-007 | — | The user checks on a beta | The Team default edit works |

## Data Continuity

- No app data changes. Package files are edited by explicit user saves only.

## Decisions

| DEC | Decision | Owner |
| --- | --- | --- |
| DEC-001 | All registered-package definitions are editable; no personal settings (keep it simple) | User |
| DEC-002 | Delete follows the same rule as save, consistent with Agents | Solution Designer |
| DEC-003 | Rename the source class `external_read_only` → `registered_package`, since "read-only" would be false | Solution Designer |
