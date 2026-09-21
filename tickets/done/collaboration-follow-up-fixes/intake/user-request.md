# User-requested new-ticket intake: status, navigation and attachment access

## Request and ownership
The user explicitly requests Requirements Engineer bootstrap ONE new ticket to resolve all three accepted/deferred issues below, based on the finalized current task branch. This is a new requirements intake, not a reopening of AORG-FLAT-TEAM-001 and not a new API validation result. Requirements owns the ticket name, isolated branch/worktree, investigation, acceptance criteria and approval/routing.

Latest user direction:
> Yes, yeah, I think if you are you're able to route to requirements engineer You can ask a requirement engineer to bootstrap a new ticket, you know to resolve these issues. Of course, based on the current branch, use the current branch as the base branch and to create another ticket.

The preceding clarification explicitly confirmed all three issues, including the two earlier accepted exceptions. Acceptance closed the old package; it did not mean they were fixed.

## Base (verified locally at request preparation)
- Repository/worktree: /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model
- Base branch: `requirements/flat-agent-organization-model`
- Published tracking branch: `origin/requirements/flat-agent-organization-model`
- Observed finalized HEAD: `345d8e0befabe68052ff0e42d0ec9a560ef85326`
- DR010 terminal verification records exact remote match at finalization.
- Do NOT use the tool cwd's `personal` branch as the base. Do not reopen or mutate the finalized ticket or reset existing data. Verify the intended base tip when creating the new ticket, preserving any later legitimate changes.
- Archived original ticket: /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model

## Bounded scope and observed evidence
1. **USER-pre-message-member-lifecycle — status before first message.**
   Newly created standalone Team members were already Idle/green before any message, unlike original-personal Offline/unstarted behavior. Investigate the normal user Run/configure/new-conversation flow and distinguish actual worker lifecycle from display state; do not merely recolor genuinely active workers. The user's intended experience is truthful gray/Offline for members that have not started. Do not extrapolate the original observed standalone Team scope to every Org member without verification.
2. **LIVE-PUB-mounted-navigation — unexpected context switch.**
   One mounted Team publication inside an Org navigated the UI to a prior Team. A separate later update did not reproduce; non-reproduction is not a fix. Establish a normal user reproduction and requirement that background publication does not silently steal the user's selected conversation/context.
3. **API-FIND-040 — immediate text attachment Open returns 404.**
   Normal GUI Agents catalog → Run → DeepSeek V4 Flash → draft upload text → first Send → actual model reply → click sent file. The chip targeted an obsolete draft URL (404). Ordinary reload/reselect changed it to a finalized URL (200) with exact original bytes. Expected: Open works immediately after successful Send without requiring reload. Bounded access issue, not durable file loss. Observed on one native-runtime standalone desktop first Send; no independent narrow/Org/task failure inferred. Introduced-versus-preexisting origin was not determined.

Separate-link opening for uploaded text/JSON is accepted original-personal behavior and is NOT itself a requested defect. Do not replace it with Files-tab opening as part of this request. Image testing was explicitly excluded from the prior scope; do not silently add image/model/provider work to this text-file correction.

## Evidence and validation expectations
Prefer genuine user journeys via the frontend for reproductions and acceptance, with backend/network observation as corroboration. Use focused durable regression tests where appropriate; avoid repeating the prior entire ticket's testing by default. Keep these three issues separate in the new requirements and establish cause before claiming a refactoring regression.
No new test execution, source change, branch creation, package reopening or root-cause assignment was performed for this intake.

Primary files:
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/known-issues.md
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/handoff-summary.md
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/delivery-evidence/dr-010/terminal-verification.json
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/api-e2e-evidence/API-REV-038/live/USER-pre-message-status-source-comparison.json
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/api-e2e-evidence/API-REV-038/live/USER-two-known-issues-accepted.json
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/api-e2e-evidence/API-REV-038/live/LIVE-PUB-mounted-result.json
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/api-e2e-evidence/API-REV-038/live/LIVE-PUB-mounted-confirm-result.json
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/api-e2e-evidence/API-REV-038/live/API-FIND-040-summary.json
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/api-e2e-evidence/API-REV-038/live/NATIVE-file-only-result.json
- /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/done/flat-agent-organization-model/api-e2e-evidence/API-REV-038/live/USER-context-file-open-destination.json

Historical embedded paths may still use tickets/in-progress; DR010 reference-resolution.json maps that prefix to this archived tickets/done location. Preserve original evidence bytes. API38's original Fail85.6 remains historical; CRR091 user acceptance, CRR092 test-code Pass and DR010 delivery completion establish accepted closure, not fixes.

## Communication route
Fresh API get_handoff_rules lists validation-outcome routes only; none matches a new user-requested ticket intake. This is an ordinary direct message explicitly requested by the user to the existing Requirements Engineer, not re-routing API38's old outcome or delegating a task. Exact canonical recipient `/requirements_engineer` is confirmed by the department roster and DR010 terminal delivery receipt. Attach only this brief, the known-issues list and final delivery summary.
