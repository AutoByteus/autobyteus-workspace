# Docs Sync Report

## Scope

- Ticket: `org-member-switch-performance`
- Trigger: API/E2E Validation Pass, API-REV-001 (direct route; task_size `Small`, architectural_risk `Low`; SR-003, IR-001). Architecture, source and test-code review: `N/A — not applicable`.
- Bootstrap base reference: `origin/personal` @ `26b555126ebcda7d9fa80d728e24475baba7acb8`
- Integrated base reference used for docs sync: `origin/personal` @ `278fc7ee8eccf3fdcbdbbe9696f8689e8b1c89c0`. Merged into the ticket branch as `169971bfa9af1f4658077223ff6539f1d608e71b`.
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: The Messages panel no longer lists every reference under every message. Each message shows a file count. Only the selected message lists its references: the first 20, then "Show all N files". The Section now computes message rows once. AgentOrg `referenceId` is a lazy, memoized getter. The long-lived docs still described the old unbounded hierarchy and named a removed panel component.
- Why this should live in long-lived project docs: Bounded rendering is user-visible behavior. The lazy-identity rule is an invariant: a future consumer that reads `referenceId` over all references would bring back the multi-second switch cost. That rule must be visible outside the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Owns the Team Communication/reference rules and the frontend owner table | `Updated` | Added the bounded-reference rule and the single-rows rule. Replaced the removed `TeamCommunicationPanel.vue` row with the actual Collaboration Section and Panel. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Describes `CollaborationMessagesSection` and the AgentOrg sidecar reference identity | `Updated` | Added a bounded-rendering and on-demand identity paragraph. Added a note to the AgentOrg sidecar bullet that the ID is lazy and never persisted. |
| `autobyteus-web/docs/settings.md` | Contains an older copy of the Sidecar Store section | `No change` | It does not describe reference-list rendering or AgentOrg identity, so nothing it says is contradicted by this change. Its duplication of architecture content is pre-existing. |
| `autobyteus-web/docs/content_rendering.md`, `autobyteus-web/docs/file_explorer.md` | Mention reference viewer / panel names | `Needs follow-up` (pre-existing) | They name `TeamCommunicationReferenceViewer` / `TeamCommunicationPanel`, which predate this ticket. The viewer is unchanged by this ticket, so no behavior claim is made stale by it. |
| `autobyteus-web/docs/remote_access.md` | Mobile reference opening | `No change` | Mobile is out of scope and unchanged. |
| `autobyteus-server-ts/docs/modules/agent_run_collaboration.md`, `run_history.md`, `features/artifact_file_serving_design.md` | Server reference route and ID contract | `No change` | The server contract is unchanged. The client still produces byte-identical IDs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Behavior rule + owner table | New "Reference rows are bounded" and "rows computed once" rules. Owner table now lists `CollaborationMessagesSection.vue` and `CollaborationMessagesPanel.vue`. | Final implemented behavior; the old row named a removed component |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture invariant | Visible-bounded rendering; `projectAgentOrgReference` memoized `referenceId` getter; a warning against all-reference ID consumers | Keeps the performance invariant durable |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Bounded reference rendering | Count per row; refs only under the selected message; 20 + Show all; reset rules | `design-spec.md`, `requirements-doc.md` (DEC-001 Option A) | `agent_artifacts.md` |
| Lazy AgentOrg reference identity | ID = sha256(messageId\0path) on first read, memoized, never persisted. Do not iterate it over all references. | `design-spec.md`, `investigation-notes.md` (profile attribution) | `agent_execution_architecture.md` |
| Single list computation | Section owns `rows`; Panel takes a required `rows` prop | `design-spec.md` | both docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Panel-internal `listMessages()` / `displayMessages` | Section `rows` computed + required `rows` prop | `agent_artifacts.md`, `agent_execution_architecture.md` |
| Eager per-reference SHA-256 in `projectAgentOrgReference` | Memoized `referenceId` getter | `agent_execution_architecture.md` |
| Inline reference rows for every message | Count indicator + selected-message bounded list | `agent_artifacts.md` |
| Doc owner row `components/workspace/team/TeamCommunicationPanel.vue` (already removed before this ticket) | `components/workspace/collaboration/CollaborationMessages{Section,Panel}.vue` | `agent_artifacts.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user-verification hold.
- Notes: Other stale names in `agent_artifacts.md` predate this ticket and are not corrected here: the `teamCommunicationStore`, `TeamCommunicationReferenceViewer` and hydration-service rows and the mermaid nodes. The same applies to `content_rendering.md` and `file_explorer.md`. This is a separate docs-hygiene candidate.
