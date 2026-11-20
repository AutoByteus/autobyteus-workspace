# Docs Sync Report — standalone-run-messages-565 (autobyteus-565)

## Scope

- Ticket: `standalone-run-messages-565` (autobyteus-565), `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review ARCH-REV-001 Fail, ARCH-REV-002 Pass; source review CRR-001 Pass; API/E2E API-REV-001 Pass; test-code review CRR-002 Pass).
- Trigger: the code reviewer's CRR-002 Pass (test-code review after API/E2E), which delivers the package.
- Bootstrap base reference: `origin/personal` @ `a728fbcad3`.
- Integrated base reference used for docs sync: `origin/personal` @ `ca4317a386`, merged into the ticket branch as `09e8c7270c` (65 base commits, no conflicts). Delivery docs edits started only after this merge.
- Post-integration verification reference: the merged state `09e8c7270c`; commands and results in `release-deployment-report.md` § Initial Delivery Integration Refresh and `evidence/DEL-post-integration/`.

## Why Docs Were Updated

- Summary: every agent run that has a collaboration view (every run but an application-owned one) now has a Messages list that holds every message its own agent sent or received, whatever the other side (a task agent or team, another run of this node, a run on another node), live and stored, 50 at a time newest first with "Load more", with the other agent named by address and, across nodes, a node chip. A message with an unrelated run or another node is published to the view of an Agent run that is one of its two runs and to no Team, Org or ancestor view (`MessageViewScope`, one rule live and stored). A cross-node message request carries `sender.address`, its accepted answer `receiverAddress`; each side's log line records the other agent (`counterpart`). A standalone run opens on Activity (it used to open on Team when it had delegated).
- Why this should live in long-lived project docs: the collaboration model is the canonical contract (DESIGN.md: changes to messaging or run storage "follow it or update it in the same change"); the module docs are what the next change to the message feed, the participant read or the peer routes reads first; the web docs are what the next change to the right panel and the phone menu reads first.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket follows rules 3 (global work), 7 (visible failure) and 9 (both nodes run one release) and adds no rule. |
| `TESTING.md` | New probe, changed gated suites, a contracts package change | No change | A new probe is found through its `package.json` script (`test:e2e:standalone-messages`), which TESTING.md says is how probes are found (it keeps no per-probe descriptions); the fresh-start build and the tracked contracts `dist/` check it requires were run by API/E2E (API-12) and again on the merged state (delivery, `DEL-03`). No command in it stopped working. |
| `RELEASE.md` | Finalization and release rules | No change | Followed as written; the base's own edit (iOS Xcode 27 wording) is not this ticket's. |
| `GLOSSARY.md` | Defers collaboration words to `collaboration_model.md` § 1 | No change | The ticket adds no new glossary word. |
| `docs/design-cases.md` | Design cases | No change | The ticket adds no case; the base's cases are untouched by it. |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | The canonical contract | No change by delivery (already updated in the code commit) | Verified against the code: CM-9 (the `counterpart` record, older lines named from what is known), CM-13 (unrelated and cross-node messages are in the view of an Agent run that is one of the two runs, never in a Team, Org or ancestor view; `MessageViewScope` live and stored), § 5 rows; and the engine table with the publication rule and the `relation` values `same_run`, `related`, `unrelated`, `remote` (`message-publication.ts`, `root-communication-engine.ts`). |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | The router's cross-run path | No change by delivery (already updated) | Step 4 now says the receiver's accept publishes an unrelated message as `unrelated` into the Agent runs' own views, replacing 492's "stays out of run views (`publishToViews: false`)". |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Peer routes | No change by delivery (already updated) | `sender: {agentRunId, address}`, `receiverAddress`, the strict reader's malformed-answer text ("it answered without the receiving agent"), the `remote` publication, `RemoteRunChannel.peerName`: verified in `remote-requests.ts`, `peer-gateway.ts`, `peer-client.ts`, `remote-run-channel.ts`. |
| `autobyteus-server-ts/docs/modules/run_history.md` | The participant-messages read (§ frontend restore) | Updated | It said the read is `collaborationParticipantMessages(rootKind, rootRunId, agentRunId)` loaded when the Team tab is shown; the query now takes `before` (the previous page's last message), loads when the Team or, for a standalone run, Messages tab is shown, and returns a page of 50. |
| `autobyteus-web/docs/chat.md` | Right panel, the Messages tab | No change by delivery (already updated) | The "Messages (autobyteus-565)" bullet and "a standalone run's Messages tab" wording match `useRightSideTabs.ts` (Activity default; `teamMembers` slot labelled Messages for `rootKind: 'agent'`). Its "contextual default tab … Activity for a standalone run, Team members for a collaboration scope" still holds. |
| `autobyteus-web/docs/agent_execution_architecture.md` | The collaboration context and the participant-messages owner | Updated | The code commit's two edits verified (`AgentRunCollaborationContext`, `collaborationParticipantMessages(…, before)`, `counterparts`, `liveCounterparts`); delivery changed "Messages with closed runs stay in the Team tab" to name an Agent run's Messages tab. |
| `autobyteus-web/docs/agent_artifacts.md` | The participant-messages owner row | No change by delivery (already updated) | Row says the Team (or Messages) tab, 50 at a time, newest first, "Load more". |
| `autobyteus-web/docs/remote_access.md` | The phone's ⋮ views | Updated | It said "Messages (members of a Team or Org only)" and "lists the member's messages": false after this change. Now: every run with a messages view (a Team's or Org's member and every standalone run but an application-owned one), a standalone run's list is every message its agent sent or received, 50 at a time with a "Load more" row and a node chip. Verified in `MobileMessages.vue` (`loadMore`, `RemoteNodeChip`) and the MSP-08 evidence. |
| `autobyteus-web/docs/workspace_layout.md` | The right-tool order | Updated | The slot "3. Team members, when applicable" now says a standalone run has Messages in that slot and Activity stays its default (`useRightSideTabs.ts`). |
| `autobyteus-web/docs/terminal.md` | The right-side tab table | Updated | The `teamMembers` row said label "Team", visibility "Team mode". It is "Team" for a Team, "Org" for an Org run and "Messages" for a standalone run, shown for a run with a collaboration view (`useRightSideTabs.ts`: the label and `requires: 'messages'`). |
| `autobyteus-web/docs/agent_teams.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `docs/ios_mobile_access.md`, `docs/android_mobile_access.md`, `autobyteus-ios/README.md` | Statements about the Team tab or the phone's ⋮ views | No change | Their "Team tab" statements are about Team and Org runs, which keep that tab; the phone docs list "Messages" among the ⋮ views without limiting it to Teams. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Update (code commit `ffec4d785d`) | CM-9, CM-13 and the § 5 rows; the engine table and publication rule | The contract |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Update (code commit) | Cross-run step 4 | Unrelated messages now reach the Agent runs' own views |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Update (code commit) | `sender.address`, `receiverAddress`, `counterpart`, `remote` publication | Two message fields |
| `autobyteus-web/docs/chat.md`, `agent_execution_architecture.md`, `agent_artifacts.md` | Update (code commit) | Messages tab and phone menu, paging, counterparts | The web surfaces |
| `autobyteus-server-ts/docs/modules/run_history.md` | Update (delivery) | The query's `before`, the page size, the standalone Messages tab | The query changed |
| `autobyteus-web/docs/remote_access.md` | Update (delivery) | The phone's Messages scope and paging | It said Teams and Orgs only |
| `autobyteus-web/docs/agent_execution_architecture.md` | Update (delivery) | "Team tab" names an Agent run's Messages tab | Closed runs' messages |
| `autobyteus-web/docs/workspace_layout.md` | Update (delivery) | Right-tool slot 3 | Messages for a standalone run |
| `autobyteus-web/docs/terminal.md` | Update (delivery) | The `teamMembers` row | Label and visibility |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One rule for which view shows a message | `MessageViewScope` decides, for the live feed and the stored read alike; `relation` is `same_run`, `related`, `unrelated` or `remote`; an `unrelated` or `remote` message is in the view of an Agent run that is one of its runs and in no Team, Org or ancestor view | `design-spec.md` DS-001 … DS-004, DEC-003, DEC-005 | `collaboration_model.md` (CM-13, engine table), `agent_communication.md` |
| Naming the other agent | The log line records `counterpart {address, nodeId}` so a reload names it without scanning run folders; older lines are named from a linked run's Task entry, the run's own file, else the run ID | `design-spec.md` DS-002, DEC-002 | `collaboration_model.md` CM-9, `remote_collaboration.md` |
| The cross-node message fields | `sender.address` in the request, `receiverAddress` in the answer, read strictly; both nodes run one release | `design-spec.md`, DESIGN.md rule 9 | `remote_collaboration.md` |
| Paging | The participant read returns 50 per page newest first with a `before` cursor and `hasMore`; the phone and the desktop add "Load more"; live messages merge by ID | `design-spec.md` DS-003, DEC-004 | `run_history.md`, `agent_execution_architecture.md`, `agent_artifacts.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Messages for members of a Team or Org only" (the phone), "no Messages for a standalone agent" | Messages for every run with a collaboration view | `remote_access.md`, `chat.md` |
| A standalone run's "Team" tab, which showed only while it had a delegated run and opened by default | The "Messages" tab on every such run; the default is Activity | `chat.md`, `workspace_layout.md`, `terminal.md` |
| `publishToViews: false` for an unrelated message (492 DEC-014) | The `relation` and `MessageViewScope` rule | `collaboration_model.md`, `agent_communication.md` |
| `isPublicMessage` (`public-message-scope.ts`) | `MessageViewScope` | `collaboration_model.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from the evidence (done, `release-deployment-report.md` § Verification), commit, archive, finalize.
- Notes: no out-of-scope doc problem found by docs sync, so `follow-ups.md` keeps FU-001 … FU-003 (implementation and API/E2E).
