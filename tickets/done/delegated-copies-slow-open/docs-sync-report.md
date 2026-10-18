# Docs Sync Report — delegated-copies-slow-open

## Scope

- Ticket: `delegated-copies-slow-open` (Project Task e6985045). Classification `Medium` / `High`, reviewed route.
- Trigger: delivery round 2 (DR-002). The code reviewer handed over the integrated state: CRR-003 Pass, API-REV-002 Pass 95.0%, CRR-004 Pass.
- Bootstrap base reference: `origin/personal` @ `5ceb43039a`
- Integrated base reference used for docs sync: `origin/personal` @ `2763e7c678`, merged into the ticket branch by `6507c08527` (IR-002). Re-fetched at delivery start; it had not moved.
- Post-integration verification reference: API-REV-002 on `05ab1c4790` (code = `2cb21ab41e`), plus the delivery reruns on `d16d8a8103` (see `release-deployment-report.md`)

## Why Docs Were Updated

- Summary:
  - A standalone run's delegated copies no longer load all their details up front. The rows come from the run's collaboration view alone.
  - A copy's conversation, activities and artifacts load only when it is opened, through one projection request and one new hub-scoped artifact query (`agentRunCollaborationMemberFileChanges`).
  - The ticket's docs commit `54e5356ae6` updated the web architecture and chat docs and the server's standalone-root and artifact module docs. Delivery reviewed them against the merged state.
  - After the merge, the web architecture text also names the base's content-batch event (`agent_presentation_batch`) among the live events that retry an in-flight load. That matches the merged code: `dispatchPresentation` reaches every child's context, and the batch case is covered by `2cb21ab41e`, CRR-003 and API-REV-002 L-002.
- Why this should live in long-lived project docs: the load-on-open rule, and the store as the single owner of in-flight loads, are durable architecture. They replace a documented guarantee: "Collapsing does not defer child hydration … stage complete child contexts". The new hub-scoped query is public server API.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Agent-root collaboration publication and child hydration | Updated (`54e5356ae6`) | Auto-merged with the base's batching edits. The text is accurate on the merged state, including batch events and retry semantics |
| `autobyteus-web/docs/chat.md` | Delegated-run Artifacts loading | Updated (`54e5356ae6`) | Accurate: hub-scoped query, load on open, failure logged and retried on reopen |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | New GraphQL query and its active/stored rule | Updated (`54e5356ae6`) | Auto-merged with the base's edits. Accurate |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Artifact listing paths | Updated (`54e5356ae6`) | Auto-merged. Accurate |
| `autobyteus-web/docs/projects.md` (Delegated Team disclosure) | Disclosure contract the ticket preserves | No change | It describes disclosure only and links to the architecture doc for loading |
| `autobyteus-web/docs/agent_teams.md` (History, Restore) | Mentions `getRunFileChanges` per member with its projection | No change | Describes Agent Team roots, which are out of this ticket's Change Scope and unchanged |
| `autobyteus-server-ts/docs/modules/run_history.md` | Message-log storage read by copy projections | No change | The base's `append-only-message-logs` owns this text. The ticket does not change storage |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Replaced section | The "Collapsing does not defer child hydration" paragraph became "Disclosure and loading are separate" plus the When / What / Ownership / Shown-content rules | The old paragraph describes the removed up-front staging |
| `autobyteus-web/docs/chat.md` | Rewritten bullet | Delegated-run Artifacts now load on open through the hub-scoped query | The old text named `getRunFileChanges` and failing the whole hydration |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Added | `agentRunCollaborationMemberFileChanges`, tree-scoped location, active-versus-stored rule | New public query |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Added bullet | Hub-scoped listing for delegated copies, shared projection method | New listing path |

Delivery made no additional doc edits; the four updates above were already on the ticket branch.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Rows from the view alone | Row cost does not grow with the number of copies: no per-copy request before rows | `design-spec.md`, `requirements-doc.md` (AC-001/AC-002) | `autobyteus-web/docs/agent_execution_architecture.md` |
| Load on open, store-owned | One in-flight load per (published context, child). A load ends `superseded` on republish, retries on live events (at most 3), and a failure is logged and retried on reselect | `design-spec.md`, `implementation-handoff.md` | same |
| Hub-scoped artifact query | Cost is independent of other stored runs. Live projection while active, stored file otherwise | `design-spec.md` (D-3), API-02 | `standalone_agent_run_root.md`, `agent_artifacts.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Up-front staging of every child context (projection + `getRunFileChanges` per copy) before publication | View-only publication plus on-demand `agentRunCollaborationChildHydration.ts` | `autobyteus-web/docs/agent_execution_architecture.md` |
| `AgentRunCollaborationContext.addContextsForNewChildren` / `commitTree` | New children arrive through a fresh view snapshot (`checkpoint_required`) | same |
| Run-id `getRunFileChanges` for a delegated copy's Artifacts in the web | `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` | `autobyteus-web/docs/chat.md`, `standalone_agent_run_root.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive the ticket, repository finalization (no release)
