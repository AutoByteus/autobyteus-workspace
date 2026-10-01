# Docs Sync Report — unified Team/Org run-history policy

## Scope

- Ticket: `unify-agent-team-org-run-history-policy`; Medium / High, independently reviewed route.
- Trigger: CRR-004 proportional test-code Pass after CRR-003 source Pass, ARCH-REV-003 design Pass, and API-REV-002 Pass / 95%.
- Bootstrap base reference: `origin/personal@40b1783f40c072b577ad9d0c5d8fe4f5418c6c38` (recorded in `solution-handoff.md`).
- Integrated base reference used for docs sync: `git fetch origin personal` on 2026-09-24 returned the same `origin/personal@40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`; it is an ancestor of ticket HEAD `ba28b4bb7539387d9ff5a8ac90e73a1878a0c610`. No base merge or checkpoint was needed.
- Post-integration verification reference: no new base commits were integrated, so no additional executable rerun was required. API-REV-002's built service, production GraphQL, built HTTP, focused suites and authoritative build checks apply unchanged; `git diff --check` passed after docs edits.

## Why Docs Were Updated

- The server module docs still described AgentOrg read-time index/tree reconciliation and a derived-index write, and the Team execution doc named a removed deletion-only manager gate. Those statements contradicted the reviewed source.
- The shared index-row authority, missing/corrupt/orphan policy, explicit local repair, manager-lane ordering and current Team Memory same-snapshot path are durable runtime and operator contracts, not merely ticket history.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Catalog authority, readiness, lifecycle, recovery | Updated | Replaced stale Org read-time derived-write claim; documented shared core and explicit repair. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Current imported Team Memory path | Updated | Documented catalog-owner metadata query, one root-tree snapshot reused for member locations, and conditional Org adapter. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team inactive-history transition lane | Updated | Replaced obsolete `withUnmanagedHistoryDeletion` description with queue → `withInactiveHistoryMutation` across archive/unarchive/delete. |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Org migration and current-only reader boundaries | No change | Its one-time summary migration/backfill and current-runtime statements remain accurate; no Org imported-memory adapter exists in this branch. |
| `autobyteus-server-ts/scripts/repair-collaboration-run-history-index.md` | Operational repair instructions | No change | Already created with the implementation; dry-run, backup, missing-index acknowledgement, corrupt refusal and local-only limits are accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Runtime/operations | Strict index-only catalog query, family-keyed state/queue, missing/corrupt/orphan policy, inactive manager lane and repair link | Prevent normal reads being mistaken for repair or write authority. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Runtime/source boundary | Current Team same-tree location projection and imported-read-only contract; Org merge obligation explicitly N/A now | Preserve AC-003's bounded-read rule without claiming absent Org coverage. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Lifecycle contract | Current archive/unarchive/delete manager gate and queue order | Remove obsolete method and stale race model. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Team/Org history row authority | Index rows determine membership/summary/termination; admitted read queries do not reconcile or write; trees still own package/archive facts. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, API-REV-002 report | `run_history.md` |
| Recovery policy | Missing index is empty, corrupt index errors, orphan tree unlisted; explicit offline/local repair with limits. | Same plus repair execution evidence | `run_history.md`, existing repair README |
| Team archive/restore serialization | Catalog queue precedes exact-root manager lane and inactive check; failures compensate. | `design-spec.md`, implementation/code/API reports | `run_history.md`, `agent_team_execution.md` |
| Imported Team Memory | Read each admitted root tree once per request and reuse that snapshot for member path projection, with no imported writes. | SR-005, IR-002, API-REV-002 | `agent_memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| AgentOrg catalog read-time reconciliation/derived-index write and pre-create `initialize()` | Shared index-only query core and explicit lifecycle row events | `run_history.md` |
| Team `withUnmanagedHistoryDeletion` plus pre-queue archive activity check | `withInactiveHistoryMutation` under queue → exact-root manager lane | `run_history.md`, `agent_team_execution.md` |
| Per-root Team Memory member lookup via unscoped all-root `listAgents()` | Same-tree `buildFromTree` → `listTeamMemberLocationsFromTree` → `listAgentsInTree` | `agent_memory.md` |
| Team diagnostic index service/store adapter | Catalog owner for normal queries, strict index store for migration/maintenance | `run_history.md` owner description |

## Delivery Continuation

- Result: **Pass** — long-lived docs match the current integrated branch.
- Next delivery action: maintain the pre-finalization user-verification hold. Do not archive, commit final delivery, push, merge, tag, release or deploy before an explicit user signal.
- Conditional follow-up: when separate `codex/memory-team-view-slow-load` merges, switch its Org imported-memory adapter to `AgentOrgRunHistoryCatalogService.listCatalogRows()` and independently validate its no-write/one-tree-read path. Current API-REV-002 provides no coverage credit for that absent adapter.
- Subsequent DR-002 status: the user requested API-REV-003 real-browser validation after this docs-sync result. This docs decision remains the last completed docs-sync pass, but the verification handoff is suspended; reassess any new code/finding and this report before a renewed user request. Do not treat API-REV-002 as the latest final validation while API-REV-003 is open.
- DR-003 reassessment: API-REV-003 completed Pass / 95% with a documented manual Stop-generation caveat in a Codex classroom Team run. It changed no product source or durable test and confirmed persisted Team/Org history and read-only Team Memory in real browsers. The three updated long-lived docs remain accurate; no additional docs edit is warranted for this round. The runtime caveat is a separate unconfirmed interaction uncertainty, not a new history-policy contract. API-REV-003 is now the latest validation; user verification is pending.
- DR-004 formal review receipt: CRR-005 records new test-code review as Not Applicable for API-REV-003's no-change browser round; CRR-004 Pass remains applicable. This adds no documentation impact. User verification remains pending.
- DR-005 packaging note: the README-guided macOS Electron build generated local test artifacts only; it changed no product source or documented history-policy behavior. No further docs sync is needed before user testing.
