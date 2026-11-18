# Handoff — Architecture Design Complete, SR-014 (autobyteus-32, Model Router core)

- Package: `delegated-runtime-model-routing`, Project Task **autobyteus-32** in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (parts done: autobyteus-303 tool, autobyteus-308 internal agents)
- From: Solution Designer (run `solution_designer_ab383b2a28394f6ba52dde1f7083f5bd`); To: Architecture Reviewer (held the SR-010/SR-012 review for the UI design)
- Date: 2026-10-26; Solution revision **SR-014** (supersedes `handoff-architecture-review-router.md`, SR-010)
- Classification: `Architecture Design Complete`, task_size **Large**, architectural_risk **High**

## Request and goal

Model routing for delegated work (Task autobyteus-32, user 2026-10-09/11/24): when a fresh delegated copy has agents no usable default covers, the node's built-in, internal Model Router agent (one long-lived conversation per node, off by default behind a switch) chooses a runtime and model per agent for the Task from live facts (`list_available_agent_runtimes`, autobyteus-303) and its own knowledge file; choices are validated, visible (delegation result, run Settings rows, Model Routing page), with clear fallbacks (this node: the delegating run's launch + note; peer: refusal). Task re-read with `get_project_task` on 2026-10-26: no new comments; Done-when unchanged.

**Task's Done-when (carry to every later handoff):** "The user has approved the approach. A delegated team can run its members on different runtimes/models as chosen for the Task (e.g. Solution Designer on the Claude runtime, Implementation Engineer on Codex). The choice is visible, fallbacks are clear, it's covered by tests, and **the user has verified it in the desktop app**."

## What changed since SR-010/SR-012 (your preliminary points are in force: design-spec § SR-012)

The Product Team designed the UI first (user's request); the user approved it on 2026-10-26 and made these decisions on the way (requirements SR-013/SR-014):
1. No editable task-kind list: the router writes a short free-text kind (1–40 chars, grouped ignoring case); the request lists labels already used.
2. No knowledge area/edit/undo on the page: the router keeps `knowledge.md` in **its own internal workspace** (DEC-023, user) and writes it with its file tools; taught by talking to it; the server includes the file (first 16 KB) in every routing request. Knowledge store and knowledge tools removed.
3. Router file tools under auto-approve: evidence A-29 showed SR-012's "no shell/file tools" was not enforced on Codex/Claude. New general run option `AgentRunConfig.toolConfinement: "workspace"` — Codex sandbox `workspace-write`; Claude no shell tools + writes outside the workspace denied in the tool-use coordinator; AutoByteus: tool list; Antigravity/Grok unconfined (user accepted; FU-005).
4. Internal workspaces: a workspace under `<appData>/internal-workspaces/` is internal and left out of the Workspaces list while internal agents are hidden (A-30) — general rule, nothing router-specific in the web app.
5. Routing requests are system notices (sender `system.model_router`, skill-update-notice pattern, A-31); the router's run is an ordinary agent run.
6. Decision records carry the Task identity (taskId, taskKey, projectId, title); Decisions grouped by Task with a server-side source filter; each node records only copies resolved on it (A keeps a peer copy's launches on the link, B records it).
7. Status with reason codes (UI translates); statistics with source totals, "not routed", router failures; GraphQL reduced to `modelRoutingStatus`, `modelRoutingDecisions(before, limit, source)`, `modelRoutingStatistics(period)`, `setModelRoutingEnabled`, `setModelRouterLaunch`, `openModelRouterConversation`.

## Approval basis

- `requirements-doc.md` **SR-014**: Approved, including the UI. The user's own decisions (rounds 2–22, DEC-023) and UI approval are quoted there; details within that direction decided by the Solution Designer, user informed 2026-10-26.
- Supplement `launch-selection-order.md` SR-014.
- Normative Product UI/UX specification (linked, Product-owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md`, screenshots `…/visual-references/VIS-001..026`, runnable reference at `/Users/normy/autobyteus_org/autobyteus-web-design` (`ui-reference-runbook.md`, section delegated-runtime-model-routing; `mock-boundaries.md`, section Model Routing). Design revision `ce3e417`, record `205aff6`.

## Artifacts (absolute paths)

- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/launch-selection-order.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md (A-01…A-31)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-spec.md (SR-014)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/solution-revision-record.md (SR-001…SR-014)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/follow-ups.md (FU-001…FU-005)
- Earlier versions: …/history/ (design-spec-sr005, sr010, sr013; requirements-doc-sr006, sr008, sr012, sr013; launch-selection-order-sr004, sr012, sr013)

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, branch `codex/delegated-runtime-model-routing`, at `origin/personal` `d74f75a51a` (contains 303 and 308); ticket documents uncommitted; finalization target `origin/personal`.
- Fold into this ticket's coverage (do not delete): branch `codex/available-agent-runtimes-live-agents` (`2245f1a427`, `6a3d942539`, `f2e159710d`) and its worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-live-agents`.

## Points for the review

- The router conversation: one long-lived system-owned run per node in its internal workspace; restore/create rule; requests as system notices appended to an active turn (A-21, A-31); sessions by `requestId`; 40 s budget; failed carrying turn fails its sessions.
- `toolConfinement` as a general run option (domain, run metadata, Codex, Claude) and its limits (RSK-006, FU-005).
- Internal-workspace rule in `WorkspaceManager.listVisibleWorkspaces`; opening the router's run by ID while its workspace is hidden (RSK-007).
- Launch resolution inside the root gate waiting for a report read and a routing (RSK-003, FU-002).
- Lifecycle split so the Task text and identity exist before placement.
- New persisted data (decision log JSONL with Task identity, conversation state, router workspace) and launch-source/link/run-config extensions; no migration.
- Peer contract (Task text/identity in start; launches with reason and kind in the answer; refusal texts; 50 s start bound).

## Constraints

Prove from a clean clone; no release unless asked; synthesized data in tests; real provider keys only from the test vault `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (TESTING.md), never `.env`, the app's vault, the user's running AutoByteus or `~/.autobyteus`; clean up. The user's desktop check is part of Done-when.

## Next expected action

Independent architecture review of SR-014; on Pass, the reviewer's route to implementation.

## Route taken

- 2026-10-26: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_0fda00a36595499d940b4fb4017ee06f`), delivered. The Product Team's design was delegated without a Task of its own (this copy works on a delegated Task), so there is no design Task to close.
