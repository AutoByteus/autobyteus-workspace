# Handoff — Architecture Design Complete (autobyteus-32, Model Router core)

- Package: `delegated-runtime-model-routing`, Project Task **autobyteus-32** (parts done: autobyteus-303 tool, autobyteus-308 internal agents)
- From: Solution Designer; To: Architecture Reviewer
- Date: 2026-10-26; Solution revision SR-010
- Classification: `Architecture Design Complete`, task_size **Large**, architectural_risk **High**

## Request and goal

Model routing for delegated work (Task autobyteus-32, user 2026-10-09/11/24): when a fresh delegated copy has agents no usable default covers, the node's built-in, internal Model Router agent (one long-lived conversation per node, off by default behind a switch) chooses a runtime and model per agent for the Task, from live facts (`list_available_agent_runtimes`, autobyteus-303) and its knowledge note; choices are validated, visible (delegation result, run Settings, Model Routing page Decisions/Overview), with clear fallbacks (this node: delegating run's launch + note; peer: refusal). The Task was re-read with `get_project_task` on 2026-10-26 (no new comments).

## Approval basis

- `requirements-doc.md` SR-010 (SR-009 approved by the Solution Designer within the user's direction, user informed 2026-10-26; SR-010 narrows DEC-022 on cost evidence A-22, user informed). User decisions: DEC-001, 003, 015…021 (incl. the split: learning from outcomes is its own later Task).
- Behavior-defining supplement: `launch-selection-order.md` SR-007 (approved with the requirements; § 2/§ 4 aligned with SR-010).

## Artifacts

- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md
- …/launch-selection-order.md
- …/investigation-notes.md (A-01…A-27; probes A-15…A-19)
- …/design-spec.md (SR-010)
- …/solution-revision-record.md
- …/follow-ups.md (FU-001 router outcome feedback → now a later Task; FU-002 routing outside the root gate; FU-003 GLM)
- History of earlier rounds: …/history/

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, branch `codex/delegated-runtime-model-routing`, at `origin/personal` `d74f75a51a` (contains 303 and 308); ticket documents uncommitted; target `origin/personal`.
- To fold into this ticket's coverage (do not delete): branch `codex/available-agent-runtimes-live-agents` (`2245f1a427`, `6a3d942539`, `f2e159710d`) and its worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-live-agents`.

## Points for the review

- The router conversation: one long-lived system-owned run per node; restore/create; requests appended to an active turn (A-21); sessions by `requestId`; 60 s; sender checks on the decision and knowledge tools.
- Launch resolution inside the root gate now may wait for a report read and a routing (RSK-003, FU-002).
- Lifecycle split so the Task text exists before placement.
- New persisted stores (knowledge note, decision log JSONL, conversation state) and launch-source/link extensions; no migration.
- Peer contract (Task text in start; launches in answer; refusal texts).

## Constraints

Prove from a clean clone; no release unless asked; synthesized data in tests (the live router check uses the test vault / signed-in runtimes per TESTING.md); clean up.

## Next expected action

Independent architecture review; on Pass, the reviewer's route to implementation.

## Route taken

- 2026-10-26: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
