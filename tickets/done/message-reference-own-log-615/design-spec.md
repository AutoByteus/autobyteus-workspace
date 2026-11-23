# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001. The founder approved the fix and its direction on 2026-11-23; the decisions within it are the Solution Designer's.
- User approval of the design: `Not required` (the founder said to continue on the proposals)
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md`, with `root-cause-report.md`
- Authorities read (read in this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md`, `autobyteus-server-ts/docs/design/node_access_model.md` (NA-7)
- Conflicts: none

## Current-State Read

One fact, "the messages of the view of run X", is derived in four places.
- **The server's message page** derives it correctly (`ParticipantMessagesReader.rootRecords`, `participant-messages-reader.ts:79-93`): it composes X's own log with each open run below it (`composeRunViewMessages`).
- **The three server reference readers** derive it again, each from one log only:
  - `AgentOrgReferenceContentService.resolveCommunication`, for the standalone and Org routes;
  - `TeamCommunicationProjectionService.resolveReference` with `TeamCommunicationContentService`, for the Team route.
  They also duplicate the readable-file check and the reference ID rule.
- **The web** derives it a fourth time, three times by hand (`agentRunCollaborationContext.ts:109-110`, `teamCollaborationMessagesView.ts:41-42`, `agentOrgExecutionContext.ts:323-324`, plus `test-support/teamWorkspaceContextView.ts:70`). The message list uses `participantMessagesView({ key })`, while the links ignore `key`.
- **When 461 moved delegated runs' messages to their own logs,** only the first place was updated. A file can therefore be listed but never found (root-cause report).

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Medium`.
  - Server: one reader extracted from an existing class, one new reader, one route replacing three, and the removal of two services and three route files.
  - Web: one builder moved into its owner, three builders removed, the viewer's error codes, localization.
  - Tests across both.
- **Architectural risk:** `High`.
  - A REST contract changes: three routes become one (a clean cut, DESIGN.md rule 9).
  - An ownership boundary is restructured: the view composition is extracted from the participant reader and shared.
  - The file-serving boundary (QR-001) moves to a new owner.
  - Bounded: no persistence, no permission rule change (NA-7 covers the new route), no concurrency change.
- **Escalation trigger:** a remaining caller of a removed route or service, or a stored reference URL. Return a `Design Impact`.

## Intended Change

| Where | Change |
| --- | --- |
| Server | One view reader for "the messages of the view of run X". The message page and one reference reader both use it, behind one route with the query's identity, `(rootKind, rootRunId)`. |
| Web | One reference-link builder, inside `participantMessagesView`, from the same `key` |
| Viewer | Reads the server's error code |

## Change Scope (Mandatory)

- **In scope:** UC-001.
- **Derived consumers:**

  | Consumer | Decision |
  | --- | --- |
  | `ParticipantMessagesReader` (GraphQL `collaborationParticipantMessages`) | Uses the extracted view reader; its result is unchanged |
  | `CollaborationMessagesPanel.vue:153` | Calls `messages.referenceContentPath`, unchanged; the value now comes from the owner |
  | `CollaborationMessageReferenceViewer.vue` | Reads `code` on 404 |
  | `RunMessagesFeed` (live) | Unchanged: live messages carry the same IDs and paths, and the link is built from the list's key |
  | The phone | Uses the web; no native change |

- **Deliberately left alone:**
  - context-file routes (`/agent-collaborations/:hostRunId/agent-runs/:agentRunId/context-files/…`, etc.);
  - Task reference files;
  - `getCollaborationRecordsSnapshot` (still used by `RunRecordsSource`);
  - the web's lazy reference ID mirror (the client side of the ID contract).
- **Follow-ups:** none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Target path |
| --- | --- | --- |
| BEH-001, BEH-002, BEH-005 | REQ-001; AC-001, AC-002 | DS-001 |
| BEH-003 | REQ-003; AC-004 | DS-001, final step |
| BEH-004 | REQ-002, REQ-004; AC-003, AC-005 | DS-001, DS-002 |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Bug Fix` with a structural correction.
- **Current design issue found:** `Yes`.
- **Structural triggers:**
  - **Derived data** fires: one fact is derived in four places. Response: one server owner (the view reader) and one web owner (`participantMessagesView`). The others are removed.
  - **Repeated coordination** fires: three reference readers and three routes do one job. Response: one reader and one route.
  - **Several kinds or forms** fires: standalone, Team and Org roots, and delegated agents and teams, each traced. They all go through `(rootKind, rootRunId)` and `RunRecordsSource`, which already reads each kind.
  - **Hidden dependency** fires: the reference reader reaches the route through the same process binding the GraphQL page reader uses (`setProcessParticipantMessagesReader`).
    - The collaboration composition sets it before the server listens.
    - A missing one throws.
    - It hides no cycle.
    - The new route reads it per request, as the resolver does.
  - **Empty indirection** checked: the extracted view reader is not a forwarder. It owns the composition of logs and has two real consumers.
- **Deliberate deviations:** none.
- **Root cause classification:** `Duplicated Policy Or Coordination`: "the messages of a view" has no single owner.
- **Refactor needed now:** `Yes`, the extraction and the removals below.

## Terminology

- **View of run X:** X's own message log composed with the logs of the open runs below it, under `isMessageOfView` (461 SR-072; `run-view-messages.ts`). This is unchanged; it now has one reader.

## Legacy Removal Policy (Mandatory)

- **Obsolete:** the three routes, two content services, `resolveReference`, the duplicated ID rule, the hand-written web links. All are listed below.
- **Compatibility wrappers kept:** `None`.

## Persisted Data / State Transition Decision

- `Not Affected`: reference URLs are built at display time and never stored (`attachment-link-conversion.ts:20`).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Click a reference in the Messages tab | The file, or a coded refusal shown honestly | `MessageReferenceContentReader` (server); `participantMessagesView` (web) |
| DS-002 | Primary (unchanged result) | Load a participant's page | The page | `ParticipantMessagesReader` over the shared view reader |

## Primary Execution Spine(s)

**DS-001:**

`Click → CollaborationMessagesPanel → referenceContentPath(key) → GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content → MessageReferenceContentReader.resolve → RunViewMessagesReader.read(view) → find the message → find the reference by ID → readable-file check → stream (sendUserFile)`

On a refusal: `404 { code } → the viewer's text for that code`.

**DS-002:**

`GraphQL collaborationParticipantMessages → ParticipantMessagesReader.read → RunViewMessagesReader.read(view) → filter, page, counterparts (unchanged)`

## Ownership Map

| Owner | Owns |
| --- | --- |
| `RunViewMessagesReader` (new, `run-history/services/run-view-messages-reader.ts`) | `read(view): Promise<RunViewMessages>`: the body of today's `ParticipantMessagesReader.rootRecords`, moved as is (own records plus `openRunsBelow`, composed with `composeRunViewMessages`) |
| `ParticipantMessagesReader` | The page, scope, cursor and counterparts. It depends on `RunViewMessagesReader` instead of `records` + `delegatedRunAgents` for records; it still takes `delegatedRunAgents` for `CounterpartIdentities` where needed. |
| `MessageReferenceContentReader` (new, `run-history/services/message-reference-content-reader.ts`) | `resolve({ rootKind, rootRunId, messageId, referenceId })`: the view, then the message, then the reference, then the file. The one reference ID rule is used through `projectTeamReferenceFile(messageId, path, createdAt).referenceId` (`team-reference-file-projection.ts`). It owns the readable-file check, the mime type and the codes `REFERENCE_NOT_FOUND`, `INVALID_REFERENCE_PATH`, `REFERENCE_CONTENT_UNAVAILABLE`, `REFERENCE_CONTENT_FORBIDDEN`. It serves only a path named by a message of the view (QR-001). |
| Route `api/rest/collaboration-message-references.ts` (new) | Parses `rootKind` with `collaborationRootKindSchema`; maps codes to statuses (404, 400, 404, 403) with a body `{ detail, code }`; sends with `sendUserFile` and `cache-control: no-store` |
| `participantMessagesView` (web) | Also returns `referenceContentPath(messageId, referenceId)`, built from `input.key`: `collaboration-messages/${rootKind}/${rootRunId}/messages/${messageId}/references/${referenceId}/content`, each segment URL-encoded |
| `CollaborationMessageReferenceViewer.vue` | On 404, reads `code` from the JSON body. `REFERENCE_NOT_FOUND` shows the new detail text; anything else shows today's. |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `api/rest/agent-collaboration-references.ts`, `api/rest/team-communication.ts`, `api/rest/agent-org-references.ts`, and their registration (`api/rest/index.ts:11-13, 56-58`) | Readers of one log | The one route |
| `services/team-communication/team-communication-content-service.ts` | Same | `MessageReferenceContentReader` |
| `agent-org-execution/services/agent-org-reference-content-service.ts` | Same; its duplicated ID rule (`:32-33`) | Same |
| `TeamCommunicationProjectionService.resolveReference` (`team-communication-projection-service.ts:65-77`) and `projectMessage`, if then unused | Same | Same |
| The web builders (`agentRunCollaborationContext.ts:109-110`, `teamCollaborationMessagesView.ts:41-42`, `agentOrgExecutionContext.ts:323-324`) and `test-support/teamWorkspaceContextView.ts:70` | Hand-written links | `participantMessagesView` |
| Tests of the removed services and routes | Tests of removed code | Rewritten against the new reader and route; cases that assert real behavior are kept |

Implementation shows that each removed item has no other caller (`grep` and typecheck) before deleting it.

## Interface Boundary Mapping

| Interface | Identity | Notes |
| --- | --- | --- |
| `GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content` | `rootKind` ∈ `agent`, `agent_team`, `agent_org` (the query's schema); `rootRunId` | The same identity as `collaborationParticipantMessages`. NA-7: owner and phone, as the old routes. |
| `RunViewMessagesReader.read(view: RootExecutionIdentity)` | the root identity | Two consumers |
| `MessageReferenceContentReader.resolve(input)` | root identity + message ID + reference ID | — |
| `participantMessagesView(...).referenceContentPath` | `key` | — |

## Dependency Rules

- The route depends on `MessageReferenceContentReader` through a process getter (`getMessageReferenceContentReader()`), set beside `setProcessParticipantMessagesReader` in `compositions/collaboration-composition.ts:355`. It throws when missing. This is the pattern the GraphQL reader already uses, and the conditions are recorded above.
- `MessageReferenceContentReader` → `RunViewMessagesReader` → `RunRecordsSource` and `DelegatedRunAgentsReader`, all passed in by the composition.
- The web viewer gets the link only from the context view.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/run-history/services/run-view-messages-reader.ts` | Add |
| `autobyteus-server-ts/src/run-history/services/participant-messages-reader.ts` | Use the view reader |
| `autobyteus-server-ts/src/run-history/services/message-reference-content-reader.ts` | Add |
| `autobyteus-server-ts/src/api/rest/collaboration-message-references.ts` | Add |
| `autobyteus-server-ts/src/api/rest/index.ts` | Register the one route; remove the three |
| `autobyteus-server-ts/src/compositions/collaboration-composition.ts` | Create the view reader once; pass it to both readers; bind the reference reader |
| The removed files listed above | Remove |
| `autobyteus-web/services/collaborationMessages/participantMessageRows.ts` | Add `referenceContentPath` |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts`, `services/teamExecution/teamCollaborationMessagesView.ts`, `services/agentOrgExecution/agentOrgExecutionContext.ts`, `test-support/teamWorkspaceContextView.ts` | Remove the hand-written links; use the owner's |
| The type of `CollaborationMessagesContextView` | `referenceContentPath` comes from the owner's `Pick` |
| `autobyteus-web/components/workspace/collaboration/CollaborationMessageReferenceViewer.vue` | Codes |
| `autobyteus-web/localization/messages/en/workspace.ts`, `zh-CN/workspace.ts` | The `reference_not_found_detail` text (DEC-003) |
| `docs/design-cases.md` | Case 28 (already written by the Solution Designer in this worktree) |
| `autobyteus-server-ts/docs/modules/*` and `autobyteus-web/docs/*` that describe these routes | Updated by delivery's docs sync |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| The link | `messages.referenceContentPath(id, ref)` with the path derived from the `key` that loaded the list | A context writing `team-runs/${rootRunId}/…` |
| Server lookup | `(await views.read(view)).messages.find(m => m.messageId === id)` | `getCollaborationRecordsSnapshot(rootRunId)` alone (one log) |
| Viewer | `404 + code REFERENCE_NOT_FOUND → "This file's message could not be found in this conversation."` | Every 404 reads "deleted or moved" |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the three routes as aliases | Rejected: DESIGN.md rule 9; no stored URL depends on them |
| A server-side search of every run for a message ID | Rejected: it widens what one URL reaches and hides a client defect |

## Change / Refactor Sequence

1. Extract `RunViewMessagesReader`; the participant reader uses it. Its tests stay green.
2. `MessageReferenceContentReader` with unit tests:
   - a message in its own log;
   - a message in a run below (root ↔ delegated);
   - a delegated team's own view;
   - not found;
   - reference not on the message;
   - file missing;
   - unreadable;
   - relative path.
3. The route and its E2E test; remove the three routes and the services; rewrite their tests.
4. The web builder in `participantMessagesView`; remove the three plus test-support; unit tests per context (standalone root, delegated task agent, delegated task team member, Org member, root's own tab).
5. Viewer codes and localization.
6. A built-app check: open a reference in a delegated task team's Messages tab (synthetic run tree), and one context file.
7. Docs (delivery).

## Risks

- RSK-001: one view read per click (QR-002), the same as one list page.

## Guidance For Implementation

- Start from a failing test: a synthetic tree with a root and a delegated task team, and a message stored in the team's log. The reference request through today's route answers 404.
- Synthetic data only. Never call the founder's running server.
