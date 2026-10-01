# Product Design Request — cross-scope-agent-mentions

- Result classification: `Product Design Requested`
- Purpose: `New Request`
- Package ID: `cross-scope-agent-mentions`; current SR: `SR-001`
- From: `/software_engineering_team/solution_designer`
- Date: 2026-09-30
- Approval state: Requirements **Draft**, not approved. The user wants to see the UI first
  before deciding.
- Workspace (Solution Designer, git): `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions`,
  branch `codex/cross-scope-agent-mentions`, base `origin/personal` @ `57df63f079363ccab4f2301213f9d8a3458f72fa`,
  finalization target `personal`. Product's own repository/ticket lifecycle is Product-owned.

## User's Requested Outcome (user's words)
"send request to product prototyper, i need to work on the ui first. working with ui
is easier for me to see them"

The user wants to see and shape the UI for this feature before approving requirements.

## Background
The user's original idea: when they start a standalone AgentTeam (e.g. Software
Engineering Team) and later need UI help, they cannot reach Product Prototyper because
it is not in the same run. Only an AgentOrg launched up front allows that. They proposed
a hidden global default Org so `@` in any chat can reach any Agent/Team.

After analysis, the recommended (not yet approved) direction is: **each run acts as its
own growable scope**. In a live chat, the user `@`-mentions a shared catalog Agent or Team.
The message goes to the agent the user is talking to. That agent brings the mentioned
collaborator into the current run (as a delegated child). The collaborator then appears
under the run and can exchange messages with run members. Full reasoning is in
`investigation-notes.md` (E-01…E-05, alternatives A–D, recommendations Q1–Q5).

## Focused Decisions / Experience To Explore
1. `@` in a **live run** composer (today `@` exists only on the New chat page, where it
   picks what to launch). How the menu, the mention chip in the composer and the chip in
   the sent message look and behave.
2. How the user understands that the mention goes to the focused agent, which will
   bring the collaborator in (recommended Q1 option b). Compare it visibly with sending
   straight to the collaborator (option a) if that helps the user decide.
3. How an **added collaborator** appears in the left sidebar run tree under a standalone
   Team run and under an Org run, distinguishable from configured members. Includes
   status (Offline/idle/running) and focusing it to chat directly.
4. How messages between run members and the collaborator appear in the right-panel
   **Org** tab.
5. States: already-available/duplicate mention (SC-005), failure to add (SC-006),
   empty `@` results, and how inherited settings (runtime/model/workspace) are shown.

## Requirements Context
- Scenarios: SC-001…SC-007; behaviors B-001…B-004; REQ-001…REQ-007; AC-001…AC-006
  (all Draft) in `requirements-doc.md`.
- Critical journey: in a running standalone Software Engineering Team, focused on
  solution designer, the user types "…please talk to @Product Team to fix the UI first"
  → sends → the solution designer brings Product Team in → Product Team appears under the
  run → Org tab shows their messages → the user can click the product prototyper and chat.
- Existing product context: the user's screenshot of the current desktop app (left
  Workspaces tree with Orgs, center chat with composer, right panel tabs Files/Org/
  Terminal/Activity). Current `@` menu: `autobyteus-web/composables/chat/useChatComposerOptions.ts`,
  `components/chat/ChatMessageInput.vue`, `components/chat/ChatNewSurface.vue`, `docs/chat.md`.

## Constraints / Non-Goals
- No hidden global Org; no global run directory for agents.
- Orgs are not `@`-mentionable (no coordinator to receive).
- No linking to runs that already exist in other roots (deferred).
- The collaborator is confined to the current run; other runs cannot see it.
- New chat `@` launch-target behavior is preserved.
- Authored Org definitions and handoff rules are unchanged; no automatic handoff rules.

## Open Questions
- Q1–Q5 (investigation notes): recommended answers, pending user approval. The UI
  result should help the user decide.
- Naming for the concept in UI (e.g. "added", "guest", "invited" member). User-facing
  wording is open.

## Expected Output
A Product Design result the user can review and confirm. Returned to Solution Designer
with its artifact paths, user decisions and any approval reference. Solution Designer
will then reconcile requirements and obtain approval before architecture design.

## Artifacts
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/solution-revision-record.md`
- User screenshot: `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/a1b8d09c-a6f5-489a-98a3-a2a477297e3b/images/1.png`

## Route
Matched rule: `Product Design Requested` → `/product_team/product_prototyper` (2026-09-30).
