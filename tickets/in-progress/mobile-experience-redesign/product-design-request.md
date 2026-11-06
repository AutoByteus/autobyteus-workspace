# Product Design Request — mobile-experience-redesign (autobyteus-277)

- Classification: `Product Design Requested`, purpose `New Request`.
- From: Solution Designer, Software Engineering Team (run `solution_designer_acd8b3385f2a491897565fc9f80b0a97`).
- Date: 2026-11-06.
- Project Task: `autobyteus-277`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, requested by `/project_task_manager` for the user.
- Engineering ticket folder (read-only for you): `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/`. Code base: `origin/personal` @ `e00581d485`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign` (branch `codex/mobile-experience-redesign`).
- Canonical requirements: `requirements-doc.md` (Draft; your design and the user's confirmation make it ready). Evidence: `investigation-notes.md`.

## The user's request, in his words

- 2026-11-06: "currently the mobile experience is really bad. for example, i can not see the task agent or agent team, many problems, ui experience also not good enough. could you create a ticket and ask software engineering team after finishing investigation, and delegate a task to product team".
- The Task (2026-10-23), condensed from him:
  1. Delegated runs are not visible: the phone shows the Project Task Manager but not the task agents or agent teams under it; the desktop shows them under the delegator.
  2. The UI needs improvement: navigation and use are hard on a phone. A phone screen is much smaller than a computer's, so the layout must make very good use of the space.
  3. Remote collaboration: now that one node can send a task to another, the phone could do far more when he is outside: start work on a node, see and talk to delegated runs on any node.
- His earlier rules for mobile (earlier mobile tickets): "if desktop/web does not need a control or explanatory label, mobile should not invent that extra complexity"; mobile is "a responsive version of the web product, not a reduced MVP"; Start new = configure the run, create it, then send the first message from the normal Chat composer.
- He will check on his own Android phone and name the worst problems with screenshots. He approves the UI.

## What the design must answer

1. **Information architecture and navigation for a phone.** Today: Home (status card, Recent work, four tiles), a "Switch work" bottom sheet (Recent / Agents / Teams / Workspaces), and a work shell with a header (Home, context title, Switch) and five bottom tabs (Chat, Runs, Files, Artifacts, Activity). The run list exists three times (Home Recent, Runs tab, Switch sheet). Design one navigation for one-hand use and large touch targets (≥ 44×44 CSS px), for the few things he does outside: see what is running, answer a question, approve, start a task, read results.
2. **The run list with its delegation tree** (REQ-001, REQ-002). The runs and order are settled: the desktop Runs view of autobyteus-385 (every non-archived Agent, Team and Org run, newest first by last activity, newest 5 then "Show older (N)"). Under an Agent run: its task agents and task teams; under a Team run: its members (and their delegated work); under an Org run: its members; each with its live state. Design how that tree reads and expands on a narrow screen (depth, indentation, what a row shows, states).
3. **What a tap does** (REQ-003, decided): it opens that agent's conversation with its composer (follow, send, answer, approve). Design the run screen: how the user knows where he is in the tree (a delegated child of which run), how he moves to a sibling or back to the delegator, how a team's member focus works.
4. **Remote runs** (REQ-004, decided in substance by 278): a run on another node sits under its delegator with the node's name; it opens and is talked to like a local one, with 278's limits (text-only composer, no files or terminal); an unreachable node shows a clear state and never blocks the list. Keep the "no difference between local and remote" feeling.
5. **Nodes on the phone** (REQ-008, **the user decides, DEC-003**). Please show him the options in the design so he can choose:
   - **A (recommended).** Through the paired node only: remote delegated runs as in point 4; remote work is started by asking an agent on the paired node to delegate (e.g. the Project Task Manager), as on the desktop; optionally a read-only list of the peers the paired node knows, with reachability and what each offers.
   - **B.** A, plus moving between several nodes the phone is paired with (the Android shell already keeps a list of saved nodes; the web shell would get a "switch node" entry that returns to it). Each node is paired with its own QR.
   - **C.** Starting a run directly on a peer node from the phone through the paired node. No API exists; it would be its own engineering Task.
6. **What is NOT on mobile** (REQ-009, **the user decides through your design, DEC-004**). Today not on mobile: terminal, VNC, browser, settings, updates, folder picker, applications, Projects. My recommendation: keep runs and their tree, conversation, start work, results (artifacts and files, read); leave out the desktop panel's Workspaces and Projects groupings, definition editing, settings, terminal, VNC, browser, applications. A left-out feature is simply absent, with no explanatory filler.
7. **Start work** (REQ-006): reachable from the main screen in one tap; keeps configure → create → first message in Chat.

## Feasibility of each element (design nothing visible on an unproven claim)

| Element | Status |
| --- | --- |
| Runs, order, fold, delegated rows, members, live states (local) | Proven: desktop owners exist (`runListStore`, `agentRunCollaborationStore`, team and Org trees) |
| Remote rows, node name, reachability, open and talk | Proven: autobyteus-278, through the paired node |
| Opening any child's conversation with a composer | Proven: the desktop's target resolver |
| Read-only peer list with what each peer offers (option A extra) | Proven: `peerNodeOffer` on the paired node |
| Switching between several paired nodes (option B) | Proven at the shell's storage level; needs a small shell entry point |
| Starting a run directly on a peer (option C) | **Not available**; would be a new server capability |
| A "needs you" marker on runs waiting for an approval or an answer (DEC-005) | **Unproven** for runs the phone does not stream; you may propose it, marked optional, and engineering checks it before it becomes a requirement |
| Push notifications | Out of scope |

## Established constraints and non-goals

- The work is in the `/mobile` web shell (`autobyteus-web/components/mobile/*`); the Android shell only if option B is chosen; no new Android permissions.
- iOS is paused; the shared web shell must stay iOS-safe (WKWebView).
- The phone talks only to its paired node over Tailscale (Serve HTTPS or trusted private HTTP); pairing and troubleshooting stay.
- The desktop is unchanged.
- No secrets, tokens or pairing codes in screenshots.
- Not in scope: the iOS App Store question, remote files and terminal, push notifications, editing definitions.

## Existing product context (for your baseline)

- Entry: `autobyteus-web/pages/mobile.vue` → `components/mobile/MobileRemoteAccessShell.vue`.
- Screens: `MobileHome.vue`, `MobileWorkShell.vue`, `MobileContextSwitcher.vue`, `MobileRuns.vue`, `MobileChat.vue`, `MobileFiles.vue`, `MobileArtifacts.vue`, `MobileActivity.vue`, `MobileRunSetup.vue`, `MobileTeamMemberFocusBar.vue`, `MobileTroubleshooting.vue`, `MobilePairingBootstrap.vue`.
- Desktop references: the Runs view `components/runList/RunListPanel.vue`, `RunListRow.vue`, delegated rows `components/workspace/history/AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`; remote chip `components/workspace/remote/RemoteNodeChip.vue`, `RemoteRunNotice.vue`.
- Approved desktop designs to stay consistent with: autobyteus-385 `workspace-tree-vs-chooser` (`/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/ui-ux-spec.md`, and the row design in `left-panel-super-agents`), autobyteus-278 `remote-runs-in-tree` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-runs-in-tree/ui-ux-spec.md`).

## What I need back

- The user-confirmed UI/UX spec with its runnable reference and final screenshots at phone size, the design repository, branch and revision.
- The user's decisions on DEC-003 (nodes) and DEC-004 (not on mobile), in his words.
- The worst problems he named, with his screenshots (secrets removed).
- Anything optional you propose (e.g. a "needs you" marker), marked as such.
