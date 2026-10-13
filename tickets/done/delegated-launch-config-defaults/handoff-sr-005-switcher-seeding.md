# Handoff — SR-005 + SR-006 Architecture Design Complete (reopened)

- Package identifier: `delegated-launch-config-defaults` (reopened)
- Result classification: `Architecture Design Complete`
- Revision: `SR-006` (includes SR-005). The combined round is classified `task_size=Medium`, `architectural_risk=Low`
- Applied handoff rule: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (direct route)
- Date: 2026-10-12

## Original Request And Reopen

- The original Task: respect configured `defaultLaunchConfig` wherever an agent or team starts. It was delivered in `v1.5.3-beta.1`.
- The Task was reopened by `/project_task_manager` at the user's request. On the Docker node `:8003` with app `1.5.3-beta.1`, the New chat Member settings for **Marketing Team** showed every member on the composer's GPT-6-Luna · Codex. The Marketing Content Creator's `claude_agent_sdk/sonnet` and the Computer Use Operator's `codex_app_server/gpt-6-astra` were not applied (Task context screenshots 37–39).

## Diagnosis (evidence in investigation-notes → Reopen Investigation)

- Ruled out:
  - the version: node image `:beta` = v1.5.3-beta.1 with the resolver; app 1.5.3-beta.1;
  - setting mismatch: "Preferred runtime/model" = `defaultLaunchConfig`;
  - usability: both runtimes enabled, both models offered;
  - team-local IDs.
- **Root cause:** the New-chat heading switcher (`chatDraftStore.retarget`) resets member overrides and never seeds members. The user typed "hell" in a plain New chat and switched the heading to Marketing Team. The same gap exists for:
  - `startForDefinition` with `carried` (Org page switcher → Team);
  - an Org start with carried settings (New-chat switcher → Org).
- The cause is a design defect in DS-006, which excluded carried starts.

## Required Change (authority: design-spec.md → Revision Notes (SR-005))

- `autobyteus-web/stores/chatDraftStore.ts`:
  - `retarget` → after the existing reset, seed the new team's members (existing `seedTeamMembers`, after `ensureTargetDefinitions`).
  - `startForDefinition` with `carried` (not `copied`) → also seed.
- `autobyteus-web/stores/agentOrgLaunchDraftStore.ts` `prepare` → when the model was carried and nothing was copied, also run `seedMembers`.
- Unchanged: "+" copies of a Team/Org run; the root/composer settings; pin semantics; server and contracts.
- Tests: the store specs listed in the design, plus one browser-probe case for the user's journey (plain New chat → typed text → heading switcher → team with member defaults → seeded rows).

## Added In SR-006 — collapsible collaborators/copies in Settings

- User request (via `/project_task_manager`, screenshots 40–42): the "Collaborators and delegated copies" list should be one collapsed row per collaborator/copy, expanding on click like Member settings, the same in running and stopped runs.
- Change (authority: design-spec.md → Revision Notes (SR-006)):
  - Replace `RunDelegatedLaunchList.vue` with a second read-only `RunMembersSection` / `RunMemberRow` section.
  - Team nodes expand to agent rows; agent rows expand to a read-only settings card.
  - Badge, source label, notes, and a note count on collapsed teams.
  - A team note is shown once.
  - Update the projection, the row component, the tests and the probe assertions.
- Required release: the same release as SR-005 (the user asked for both in one release).

## Approval Basis

- Requirements `Approved` at SR-002 (user, 2026-10-12). SR-005 changes no behavior. SR-006 refines REQ-007/AC-010 at the user's explicit request (relayed by `/project_task_manager`, screenshots 40–42). The user asked that the bug be fixed within this Task and that both items ship in one release.
- Supplements: none. Product Design: N/A — not applicable.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied/tickets/in-progress/delegated-launch-config-defaults/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied/tickets/in-progress/delegated-launch-config-defaults/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied/tickets/in-progress/delegated-launch-config-defaults/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied/tickets/in-progress/delegated-launch-config-defaults/solution-revision-record.md`
- Prior review/validation/delivery records (round 1) are in the same folder: `design-review-report.md`, `code-review-report.md`, `api-e2e-*`, `delivery-revision-record.md`, `release-deployment-report.md`.
- User screenshots: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_e2060dfd-45b7-44a4-9b04-a86df802c23c/context/` (37–42)
- Reproduction on the user's node: `reopen-evidence/` (fresh Run seeds 2 of 4; heading switch seeds none)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied`
- Branch: `codex/delegated-launch-config-defaults-r2`
- Base: `origin/personal` @ `2756d7b29`
- The ticket folder is moved back from `tickets/done/` to `tickets/in-progress/` (staged rename; uncommitted).
- Finalization target: `origin/personal`. A release decision is expected; the last release was `v1.5.3-beta.1`.

## Open Risks

- The user still needs to verify on a build with the fix, ideally by repeating the screenshot-37 journey.
- Earlier follow-up candidates are unchanged.
