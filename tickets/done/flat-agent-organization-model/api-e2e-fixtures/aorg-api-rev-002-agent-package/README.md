# AORG API-REV-002 Corrected Real-User Agent Package

This deterministic local-path package is the corrected input for the
`AORG-FLAT-TEAM-001` API-REV-002 cumulative rerun after `RER-021`,
`AD-REV-007`, `ARCH-REV-005`, `IR-011`, and `CRR-011` cleared every upstream
gate. It is intentionally imported through the
AutoByteus **Settings -> Agent Packages -> Import Package** UI.

It contains four shared Agents, two exact flat AgentTeam Config V2 definitions,
and two exact AgentOrg Config V1 definitions. The AgentOrg definitions reuse the
same Team identities rather than copying them. The same package is deliberately
used for standalone Team, mixed Org, direct-Agent Org, message-routing, fresh
Agent/Team task, shutdown/restart, history/restore, and continued-conversation
journeys so cross-family identity can be compared without fixture drift.

The package is read-only from the product's point of view. Tests must hash it
before and after authoring/runtime journeys and prove zero product writes.

See `TEST-MANIFEST.md` for the detailed scenario matrix, deterministic markers,
restart/migration coverage, required evidence, and critical stop conditions.


## CRR-009 Task-Lifecycle Fixture Correction

Every Agent definition now has `agent-config.json` that explicitly requests
`submit_task_result` and `review_task_result`. All four Agents can appear as a
fresh task assignee or delegator/reviewer through the retained Team/Org
placements, so the tools are configured on all four rather than inferred from a
single planned path. `delegate_task`, `send_message_to`, and
`get_handoff_rules` remain automatic member-context tools.

Before API-REV-002 execution, this package was prepared and hashed but had not
been imported or executed. Formal Team/Org submission, revision,
resubmission, and acceptance must be proven by real tool calls; tool presence
alone is not a pass.
