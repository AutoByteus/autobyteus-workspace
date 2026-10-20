# Docs Sync Report — autobyteus-191 (Remote delegation, slice 1: text only)

## Scope

- Ticket: `cross-node-agent-communication` (autobyteus-191), slice 1. Classification `Large` / `High`, reviewed route (architecture review, code review, API/E2E, test-code review).
- Trigger: CRR-007 (test-code review Pass) after API-REV-003 (Pass, 95%), handed to delivery by the code reviewer.
- Bootstrap base reference: `origin/personal` `5de6a698b9`.
- Integrated base reference used for docs sync: `origin/personal` `3b2c86ca9e` (merged into the ticket branch as `4f03cce09d`).
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh (server typecheck, full server unit suite, web guards, full web suite, two-server E2E on the integrated state).

## Why Docs Were Updated

- Summary: the change already carried its long-lived docs (a new module doc, the collaboration model rules CM-10 … CM-12, tool, root and Nodes-tab docs). Delivery checked them against the final code (`7a5a9af077` plus the base merge). One rule was missing: how the Team and Org package validators admit messages that have a remote endpoint (SR-017, the F-002 fix). One older module doc showed the tree link shape without the remote `nodeId`.
- Why this should live in long-lived project docs: the validator rule decides whether a Team or Org run with remote messages loads at all after a restart, and it is not visible from the module that owns remote collaboration. Without the note, a future change to the validators or the index could reintroduce F-002.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | New module doc; asked by the code reviewer to verify the SR-017 rule and the view exclusion | Updated | The view statement matches the code: `services/agent-streaming/public-message-scope.ts` `isPublicMessage` is used by all three view projectors, and the engine passes `publishToRootView = false` for remote messages (`root-communication-engine.ts`; the Team, Org and standalone adapters publish only when it is true). Added the § Package admission bullet (SR-017). |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-10 … CM-12 and the on-disk link shape with `nodeId` / `delegatedFrom` | No change | Matches the stores and the E2E receipts (RC-05 … RC-07 exact keys). |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` `node` parameter | No change | Matches the tool contract and the RC-02/04/09 texts. |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Receiving node: `delegatedFrom`, idle shutdown, back-link | No change | Matches RC-05, RC-12, RC-13. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | States the Team tree link shape and the current-package admission | Updated | Link shape now says a remote link adds `nodeId` and has no own file here, with a pointer to the module doc. |
| `autobyteus-server-ts/docs/modules/run_history.md`, `agent_orgs.md` | Package admission / history scan | No change | They describe the package catalog generically and do not restate the message-endpoint rule; the rule now lives in `remote_collaboration.md`. |
| `autobyteus-web/docs/settings.md` | Nodes → Remote Collaboration tab and the switch | No change | Auto-merged with the base's Notification Center section without overlap; both sections read correctly after the merge. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Added rule | § In the roots, new bullet "Package admission": the Team/Org validators check message endpoints against `agentRunIdsOfTree` (tree agents and remote runs); both endpoints in the set, distinct, at least one an agent of the tree; the execution index stays local-only. | SR-017 / F-002 rule was only in ticket artifacts. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Clarification | Tree link shape notes the remote `nodeId` and links to Remote Collaboration. | The shape there omitted remote links. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Package admission with remote endpoints | Validators use the store's endpoint set, not the local-only index; at least one endpoint must be a tree agent | `design-spec.md` (SR-017), `design-review-report.md` (ARCH-REV-007), `implementation-handoff.md` (IR-004) | `remote_collaboration.md` § Package admission |
| Remote link shape in Team trees | A link with `nodeId` points to another node's run | `design-spec.md` § On-Disk Data Model | `agent_team_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `index.requireAgent` for both message endpoints in `validateTeamRunStatePackage` / `validateAgentOrgStatePackage` | Endpoint-set check through `agentRunIdsOfTree` plus "at least one tree agent" | `remote_collaboration.md` § Package admission |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, then finalization.
- Notes: The optional C-9 tidy-up (a type and a constant between import lines in `root-task-execution-lifecycle.ts`) and the three CRR-007 test-file notes were not applied: delivery does not change reviewed source or tests after validation, and none of them changes behavior. A follow-up was not opened for them because they are style notes that the reviewer marked optional.
