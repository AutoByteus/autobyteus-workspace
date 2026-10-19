# Docs Sync Report — search-model-settings (autobyteus-146)

## Scope

- Ticket: `search-model-settings` (Project Task autobyteus-146), `task_size=Medium`, `architectural_risk=High`, reviewed route.
- Trigger: delivery DR-002, after the Solution Designer's SR-008 / DEC-015 clarification of REQ-007 and AC-015 (DR-001 O-5).
- Bootstrap base reference: `origin/personal` @ `8d40ba3b6c`.
- Integrated base reference used for docs sync: `origin/personal` @ `fc93276e6f`, merged as `f9de3d57d7` (DR-001). It was rechecked at DR-002 and had not moved.
- Post-integration verification reference: `evidence/delivery/DR-001-*` (typecheck, server unit, `tests/e2e/projects`, web settings and projects suites, all on the merge).

## Why Docs Were Updated

- Summary: the change itself documented the Embedding settings panel, the embedding layer's model management and index status, and index-after-write. Delivery reviewed those docs on the merged state and made two small additions:
  - the DEC-015 cadence for server-started indexing;
  - the base's new "part of" writes among the marks that load no model.
- Why this should live in long-lived project docs: readers of the panel and the indexing rules need to know when an open panel shows background work, and which writes can and cannot load a model.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | New "Server Settings: Embedding" section (by the change) | Updated (delivery) | Added the DEC-015 sentence: server-started indexing shows at the next 10 s refresh, then 2 s polling; opening shows the current state at once |
| `autobyteus-server-ts/docs/modules/embeddings.md` | Model management, statuses, index status, Index after writes (by the change) | Updated (delivery) | Added "part of" to the marks that load no model. The base's relation writes publish the same `taskChanged` mark, and the run syncs only when a description is not indexed or has changed |
| `autobyteus-server-ts/docs/modules/projects.md` | Search section mentions index after writes (by the change); base added "part of" | No change | Merged text is consistent: about 3 s after a write, no search |
| `autobyteus-web/docs/projects.md` | Pointer to Settings → Embedding (by the change) | No change | Accurate |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | New section (change) + one sentence (delivery) | Embedding panel: data, polling, actions, components; the DEC-015 cadence | New UI; SR-008 clarification |
| `autobyteus-server-ts/docs/modules/embeddings.md` | Extended (change) + one phrase (delivery) | Model management, statuses, collection status, index after writes; "part of" marks | New boundary; merged base behavior |
| `autobyteus-server-ts/docs/modules/projects.md` | Updated (change) | Index after writes in the search section | REQ-011 |
| `autobyteus-web/docs/projects.md` | Updated (change) | Link to Settings → Embedding | Navigation |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Status caches inputs, never results | Index status is computed fresh at every read, from cached per-Project fingerprints that a post-commit mark makes dirty (DEC-012) | `design-spec.md`, `requirements-doc.md` DEC-012 | `embeddings.md` |
| Index after writes | 3 s grouped background run, only when the model is on disk; never a download, never blocks or fails a write | REQ-011, DEC-014 | `embeddings.md`, `projects.md` |
| Panel cadence | 2 s while shown work runs, 10 s idle; server-started work appears at the next idle refresh | REQ-007, DEC-015 | `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Model choice only through Advanced's raw setting | Settings → Server Settings → Embedding (the raw setting still works) | `settings.md`, `embeddings.md` |
| A created or edited Task indexed only at the next search | Indexed in the background after the write (search-time check stays the safety net) | `embeddings.md`, `projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization (no release requested).
