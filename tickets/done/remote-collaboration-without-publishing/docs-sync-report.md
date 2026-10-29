# Docs Sync Report — autobyteus-245 (Remote collaboration without publishing)

## Scope

- Ticket: `remote-collaboration-without-publishing` (autobyteus-245, part of autobyteus-25). Classification `Medium` / `High`, reviewed route.
- Trigger: CRR-002 (test-code review Pass) after API-REV-001 (Pass, 95%), handed to delivery by the code reviewer.
- Bootstrap base reference: `origin/personal` `786055f3d7`.
- Integrated base reference used for docs sync: `origin/personal` `786055f3d7`. The base had not advanced; the branch was already current.
- Post-integration verification reference: not rerun, because the branch was already current (`release-deployment-report.md` § Initial Delivery Integration Refresh).

## Why Docs Were Updated

- Summary: the implementation updated the long-lived docs in `63f6635b6d`. Delivery checked each statement against the final code and found them accurate, so delivery made no further edit.
- Why this lives in long-lived docs: publishing is gone. Which Agents a peer can start, and how such a run launches (`defaults_only`), is now a rule of the collaboration model and of the shared launch resolver, not a node setting.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-12 rewritten | No change | Every shared Agent at the catalog address; own default, temp workspace, auto-approve; no usable default is refused. This matches `NodeCatalogPort.launchBase()` and RC-04/05. |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Module rules | No change | The following match the code: `NodeCatalogPort` path and base; receiver order `catalogDefinitionAt` → `catalogTaskSourceOf` (`remote-delegation-receiver.ts:35/45`); the codes (`remote-refusal-codes.ts`); the refusal `targetName`; `address`; the GraphQL list without publish fields; `AUTOBYTEUS_TEMP_WORKSPACE_DIR`; the leftover file neither read nor written (RC-03/04). |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `defaults_only` launch base | No change | `CollaboratorNoDefaultLaunchError` text equals the one the agent reads (`remote-refusals.ts:33`, RC-04). |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` `node` | No change | Any shared Agent at the catalog address. |
| `autobyteus-web/docs/settings.md` | Remote Collaboration tab | No change | Matches the rendered card (API-22). |
| Repository-wide search | Stale publishing words | No change | No remaining `publishedAgents`/`publishAgent`/`PublishedAgentService`/`published-agents.json` in docs, server or web code. The other "publish" matches are unrelated: stream publishing, Org member identity, release text. |

## Docs Updated

None by delivery. The implementation's update (`63f6635b6d`) was verified.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Remote availability | No publish step; any shared Agent at its catalog address; Teams refused until autobyteus-247 | `requirements-doc.md`, `design-spec.md` (SR-005) | CM-12; `remote_collaboration.md` |
| `defaults_only` launch base | No inherited layer; temp workspace and auto-approve from the base; no-default and cannot-run refusals | `design-spec.md` | `agent_communication.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `PublishedAgentService`, `PublishedAgentStore`, `PublishedLaunchCheck`, `published-agents.json`, GraphQL `publishedAgents`/`publishAgent`/`updatePublishedAgent`/`unpublishAgent`, the web publish section | `NodeCatalogPort` with the catalog admission and the `defaults_only` resolver; the web availability note | `remote_collaboration.md`, CM-12, `settings.md` |
| Contract field `publishedAddress` | `address` | `remote_collaboration.md` § Between nodes |

## No-Impact Decision

Not applicable: docs were updated, by the implementation.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification record, archive, finalization.
