# Solution Handoff — daily-assistant-delegation-target (autobyteus-455)

- Status / classification: `Architecture Design Complete`; `task_size: Small`; `architectural_risk: Low` → direct implementation route (handoff rule: Small/Medium and Low → `/software_engineering_team/implementation_engineer`)
- Current SR: `SR-001`
- Package identifier: `daily-assistant-delegation-target`
- Task: `autobyteus-455` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on the user's word
- Priority: **first priority**. The user is waiting for this fix to hand Task miscellaneous-1 to his Daily Assistant. That Task's deadline is 2026-11-10 23:59 Berlin. A release (beta) only on the user's word.
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-delegation-target`, `codex/daily-assistant-delegation-target`
- Base: `origin/personal` @ `310fc27452be3d3f44459c89f59c70d8ff40ea02`; finalization target `origin/personal` (RELEASE.md)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-delegation-target/tickets/in-progress/daily-assistant-delegation-target/`

## Original request (condensed)

The PM's `delegate_task` to `/daily_assistant` was refused, and the Daily Assistant is in no `list_available_agents` list (local or the two Docker peers). Find why. If it is a rule, the user thinks it is wrong for the Daily Assistant: make it addressable, keep the self-delegation/loop guard, and keep the Model Router internal. Tests: delegation from the PM, the local list and a peer's list. Constraints: no change to the user's data, tests on isolated nodes, DESIGN.md/TESTING.md.

## Result

- Cause (Read + Reproduced with the existing unit tests): `collaborator-candidate-policy.ts` L68-69 / L211-214 excludes every built-in (the Daily Assistant and the Model Router) from the single eligibility policy behind `@`, `list_available_agents`, `delegate_task` and a peer's list/delegation. The rule comes from the `@` menu design (cross-scope-agent-mentions REQ-001, 2026-09-30). Delegation inherited it; no one decided it for delegation.
- Fix (design-spec.md): each built-in in the registry gets a `collaborationEligible` flag: the Daily Assistant `true`, the Model Router `false`. The policy and the web New-chat mirror (renamed, contract-pinned) exclude only ineligible built-ins. Tests, two live probes and three module docs are updated as listed. The copy workspace (autobyteus-97), launch rules and the Daily Assistant template stay unchanged.
- Approval: requirements approved by the Solution Designer within the Task's direction. The user was informed through the first report to the PM (cause, fix, DEC-002 `@` follows the same rule, DEC-004 workspace per autobyteus-97, timing).

## Expected output

Implementation per design-spec.md, with server and web unit tests. Then API/E2E on isolated nodes: AC-001…AC-006. Real `delegate_task('/daily_assistant')` with a saved Task from a PM-like agent, the copy reporting back (RSK-001), and a second isolated node as peer for AC-004.

## Open risks

- RSK-001: a delegated Daily Assistant copy must be able to reply to its delegator; this is general delegated-copy tooling, to verify in API/E2E.
- Docker peers list their own Daily Assistant only after they run a release with this fix.

## Route record

- 2026-11-10: `get_handoff_rules` → Small/Low rule → `/software_engineering_team/implementation_engineer`.
- Follow-ups: None (`follow-ups.md` not created).
