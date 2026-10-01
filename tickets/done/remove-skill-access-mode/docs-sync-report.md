# Docs Sync Report — remove-skill-access-mode

## Scope

- Ticket: `remove-skill-access-mode` (`task_size=Large`, `architectural_risk=High`, route `Reviewed`)
- Trigger: post-API/E2E test-code review pass `CRR-003` from `code_reviewer`, 2026-09-30 (related: `SR-005`, `ARCH-REV-003`, `IR-002`, `CRR-002`, `API-REV-001`)
- Bootstrap base reference: `origin/personal@57df63f07`
- Integrated base reference used for docs sync: `origin/personal@5c6fb95ea` (fetched 2026-09-30; 7 new commits, merged as `6920ea67e`)
- Post-integration verification reference: merge `6920ea67e`; see `handoff-summary.md` "Delivery checks"

## Why Docs Were Updated

- Summary: the implementation commits already updated 13 long-lived docs. A search of the integrated tree found three server module docs that still described run-level skill access. They were corrected in `56817443b`.
- Why this should live in long-lived project docs: the rule "the agent definition is the only skill authority" and the read-and-ignore treatment of stored values are lasting contracts for anyone adding a launch input, a runtime backend or a run-history reader.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Said legacy values "are rejected after startup migration" | `Updated` | `56817443b`. Now: no run-level setting; stored values are ignored; GraphQL input naming the field fails schema validation |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Listed skill access as a run-configuration concern | `Updated` | `56817443b` |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Said the planner validates "configured skill access" | `Updated` | `56817443b`. `validateRootInheritedSkillAccess` was deleted by the ticket |
| `autobyteus-server-ts/docs/modules/run_history.md`, `skills.md`, `agent_definition.md`, `application_orchestration.md`, `antigravity_cli_runtime.md`, `grok_build_runtime.md` | Updated by the implementation; checked against the final code | `No change` | Accurate. `run_history.md` keeps the released-migration description and states the later removal |
| `autobyteus-ts/docs/skills_design.md` | Updated by the implementation | `No change` | Accurate |
| `autobyteus-web/docs/agent_execution_architecture.md`, `agent_management.md`, `settings.md` | Updated by the implementation | `No change` | `agent_management.md` states that Daily Assistant edits are replaced on startup |
| `autobyteus-web/docs/chat.md` | Changed by the merged base; mentions the Daily Assistant seed | `No change` | `skillScope: ALL_INSTALLED` matches the template |
| `docs/custom-application-development.md`, the two application SDK `README.md` files | Updated by the implementation | `No change` | State that the launch contract carries no skill setting |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` (capsule manifest) | The AGY capsule `manifest.json` also stored the field | `No change` | The doc does not list manifest fields, so nothing there is wrong. The gap is in the ticket's requirements/design records; see "Delivery Continuation" |
| `autobyteus-server-ts/tickets/in-progress/claude-session-team-context-separation/proposed-design.md` | Still mentions the field | `No change` | Another ticket's working artifact, not a long-lived doc |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Correction | Replaced the "legacy values are rejected after migration" sentence | REQ: stored values load and are ignored |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Correction | Skills are owned by each member's agent definition, not by run configuration | Agent definition is the only skill authority |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Correction | Removed "configured skill access" from the planner's validation list | The validation no longer exists |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Single skill authority | No launch input, Team setting or runtime backend may widen or suppress skills | `requirements-doc.md`, `design-spec.md` | `agent_execution.md`, `agent_team_definition.md`, `skills.md` |
| Reader-absorbed removal | Stored values are ignored on read and dropped on the next save; no migration | `design-spec.md` | `run_history.md`, `agent_execution.md` |
| Frozen released-migration shapes | Released migrations read the field only through `app-data-migrations/legacy/` | `design-spec.md`, `implementation-design-impact-DI-001.md` | `run_history.md` |
| Built-in agents are platform-owned | Every built-in is overwritten from its template at startup (DEC-002) | `requirements-doc.md` | `agent_definition.md`, `autobyteus-web/docs/agent_management.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Run-level `skillAccessMode` (`PRELOADED_ONLY` / `NONE`) in launch inputs, GraphQL, SDK and stream contracts | Agent definition `skillScope` / `skillNames` | `skills.md` "Historical context", `agent_execution.md` |
| `FlatTeamTopologyPlanner.validateRootInheritedSkillAccess` | Nothing; there is no value to validate | `agent_team_execution.md` |
| Copy-if-missing sync for Daily Assistant | Overwrite from template on every startup | `agent_definition.md` "Built-In Agent Sync" |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: user verification hold, then finalization into `personal`.
- Notes: the requirements' "Persisted data affected" line and the design's persisted-data section do not name the AGY capsule `manifest.json`. The code handles it and a unit test covers it (`agy-run-capsule.test.ts`). This is a record correction owned by `/solution_designer`; it does not change intended behavior and does not block delivery.
