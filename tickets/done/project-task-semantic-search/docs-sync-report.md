# Docs Sync Report — project-task-semantic-search (autobyteus-71)

## Scope

- Ticket: `project-task-semantic-search` (Project Task autobyteus-71), `task_size=Large`, `architectural_risk=High`, reviewed route.
- Trigger: delivery DR-002, after IR-004 (latest-base merge), CRR-006 Pass, API-REV-003 Pass (95%) and CRR-007 (test-code review Not Applicable, no durable test changed in round 3).
- Bootstrap base reference: `origin/personal` @ `55bff1f5ee`.
- Integrated base reference used for docs sync: `origin/personal` @ `2b04a9971d`, merged into the ticket branch as `600d079b9c` (IR-004). Rechecked at DR-002 start: `origin/personal` was still `2b04a9971d` and is an ancestor of the ticket HEAD.
- Post-integration verification reference: API-REV-003 on `600d079b9c`; delivery smoke rerun of `tests/e2e/projects` on the delivery HEAD (see the release/deployment report).

## Why Docs Were Updated

- Summary: the change adds a new server layer (local embeddings), Project Task search (board, GraphQL, `search_project_tasks` agent tool) and a server setting for the embedding model. The implementation updated the long-lived docs as part of the change. Delivery reviewed them against the merged state, where the base removed `create_or_update_project` and added Task adoption.
- Why this should live in long-lived project docs: future readers need the embedding layer's boundary and its runtime rules (download, verification, readiness, model switch, storage and footprint), the search contract for agents, and the board behavior. None of that should live only in ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/embeddings.md` | New layer doc | No change (already accurate) | Default Granite Small English R2; catalog and per-model scale table; Hugging Face download with SHA-256 and `.part` files; the no-proxy limitation (RSK-002); `onnxruntime-web` pruning; readiness; model switch without restart. Matches API-L02a/L02g/L01 r3 |
| `autobyteus-server-ts/docs/modules/projects.md` | Project Task Search section; Delete section in the merged state | No change | Delete says both deletes tell search to forget entries without failing or waiting. The base's adoption section separately documents the adoption revert on Task/Project delete. They are consistent with API-L02e r3 and IMP-12 |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Tool list conflicted in the merge | No change | IR-004 resolution lists seven tools (base six plus `search_project_tasks`) with no `create_or_update_project`; the `search_project_tasks` contract matches the packaged contract (API-L02a r3) |
| `autobyteus-server-ts/docs/modules/search.md` | Search overview | No change | Points to the embedding layer and Project Task search |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | No change | Lists `embeddings.md` |
| `autobyteus-web/docs/projects.md` | Board search UX | No change | Preparing/unavailable states, Retry, locate-while-searching, matches API-L02b/L02c/L02h r3 |
| `autobyteus-server-ts/docker/README.md` | Docker nodes download the model on first meaning search | No change | No new port, volume, variable or launcher step. Egress and proxy behavior is documented once, in `embeddings.md`. Exact search works offline (API-L01 r3) |
| `autobyteus-web/docs/electron_packaging.md` | Packaging prunes `onnxruntime-web` browser builds | No change | The pruning script and its validation are documented in `embeddings.md` and run inside the existing build (API-L02a r3) |
| Repository-wide grep for `create_or_update_project` in `autobyteus-server-ts/docs`, `autobyteus-web/docs`, `README.md` | Merge must not reintroduce the removed tool | No change | No matches |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/embeddings.md` | New (by the change) | Embedding layer boundary, catalog, default model, download/verification, runtime, readiness, storage, switch | New layer |
| `autobyteus-server-ts/docs/modules/projects.md` | Updated (by the change) | Project Task Search section; delete clears search entries | New capability |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Updated (by the change, merge-resolved in IR-004) | `search_project_tasks` in the tool list and its contract | New agent tool |
| `autobyteus-server-ts/docs/modules/search.md`, `README.md` | Updated (by the change) | Link to meaning search and the module index entry | Navigation |
| `autobyteus-web/docs/projects.md` | Updated (by the change) | Board search behavior and states | New UX |

Delivery made no further doc edits: the reviewed docs already match the merged, validated state.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Embedding layer boundary | `EmbeddingIndex` is the only public boundary; consumers give items; the layer imports nothing from Projects | `design-spec.md` | `embeddings.md` |
| Model catalog and default | Granite Small English R2 by default; per-model cost at scale; a setting switches models without restart | `model-evaluation-report.md`, `solution-revision-record.md` (SR-007) | `embeddings.md` |
| Readiness and failure | Preparing/unavailable states, exact-match fallback, Retry | `requirements-doc.md` (AC-010, AC-011) | `embeddings.md`, `projects.md`, `web/docs/projects.md` |
| Persisted data | `embeddings.sqlite` is discard-or-rebuild; existing data unaffected | `design-spec.md` | `embeddings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Board filtering by exact text only | Exact plus meaning search | `autobyteus-web/docs/projects.md`, `projects.md` |
| (Base change, not this ticket) `create_or_update_project` | `create_project` / `update_project` | `agent_tools_mcp_server.md` (merged list, no stale mention) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, handoff summary, archive and finalization.
- Notes: none.
