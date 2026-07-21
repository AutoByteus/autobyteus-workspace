# Docs Sync Report

## Scope

- Ticket: `agent-run-history-performance`
- Trigger: Delivery resumed after the user-approved active-trace earlier-paging refinement, implementation/source review, API/E2E round 4 evidence, and the user-requested latest-base refresh for host testing.
- Bootstrap base reference: `origin/personal` at `75a4c97f26d1c33152a97940938124bf271e2653`
- Integrated base reference used for latest docs sync: `origin/personal` at `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`, merged by `1470cb353e07a1de8b38cbb131ae49108478bcf0` on 2026-07-21.
- Post-integration verification reference: `evidence/delivery-post-refresh-check-20260721.txt`; server focused GraphQL 1 file / 6 tests passed and frontend focused Event Monitor 7 files / 36 tests passed.

## Why Docs Were Updated

- Summary: Replaced the obsolete archive-inclusive Event Monitor history description and documented the active-only newest-100 backend projection, completed-first frontend rolling window, semantic presentation-revision contract, active-trace-only fixed-50 earlier paging, bounded browse state, recent-window usage scope, and copy-control removal.
- Why this should live in long-lived project docs: These are runtime invariants and user-visible limitations that future projection, streaming, attachment, Activity, and Event Monitor work must preserve. They should not remain discoverable only from a ticket artifact.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical execution, projection, hydration, and Event Monitor behavior | `Updated` | Added the durable bounded-window and active-trace browsing contracts and corrected stale archive-inclusive wording. |
| `autobyteus-web/docs/settings.md` | Mirrored long-lived execution/settings reference | `Updated` | Kept the corresponding runtime and paging section semantically identical to the canonical architecture document. |
| `autobyteus-web/README.md` | User/developer startup and Electron behavior | `No change` | Build/startup, ports, configuration, and packaging are unchanged by this ticket. |
| `autobyteus-web/docs/electron_packaging.md` | Desktop bundle/runtime boundary | `No change` | No Electron main/preload/IPC/package behavior changed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Runtime architecture correction and extension | Active-file-only projection; newest-100 post-normalization bound; fixed-50 active-trace paging; closed central-only page DTO; generation-bound cursor; isolated 300-visual browse state; semantic witness/revision; pinned/non-pinned UX; no copy/export replacement | Makes the canonical execution document match the integrated implementation. |
| `autobyteus-web/docs/settings.md` | Mirrored runtime reference correction and extension | Same bounded Event Monitor and active-trace browse contract plus stale archive wording correction | Prevents the mirrored reference from preserving contradictory behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Backend projection boundary | Normal Event Monitor projection reads only `raw_traces_active.jsonl`, reconstructs lifecycle evidence, then selects the newest 100; archives remain untouched | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | Both updated docs |
| Rolling presentation bound | Conversation presentation and Activity are capped at 100 with completed-first eviction and deterministic oldest-mutable fallback | `requirements-doc.md`, `design-spec.md`, `history-window-ui-ux-spec.md` | Both updated docs |
| Semantic revision authority | Bounded shallow pre/post witnesses, not transport effects/timestamps/object identity, decide whether unseen activity exists | `design-spec.md`, `implementation-handoff.md`, round-3 `code-review-report.md` | Both updated docs |
| Integrated attachment semantics | Equal retained unsupported member-echo metadata is revision-neutral; executable attachment add/refresh/remove changes rendered presentation | Round-2 `api-e2e-coverage-investigation.md`, execution report, LIVE-002 durable test | Both updated docs |
| User-visible scope | Pinned bottom follows; non-pinned view stays stable and exposes a localized keyboard action; usage totals are recent-window-only | `history-window-ui-ux-spec.md`, execution report | Both updated docs |
| Active-trace browse boundary | Explicit earlier browsing stays within `raw_traces_active.jsonl`, uses server-fixed additions of at most 50, transports central-only typed values, and expires rather than crossing a compaction boundary | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | Both updated docs |
| Browse-state bound and identity | Browse state is separate from canonical live/Activity state, mounts at most 300 visuals, releases farthest newer pages, and uses stable event/subvisual identities for anchors, keys, and disclosure ownership | `design-spec.md`, `history-window-ui-ux-spec.md`, round-4 execution evidence | Both updated docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Archive-inclusive normal Event Monitor replay | Active-only newest-100 projection plus explicit active-trace-only earlier paging | `Bounded Recent Event Monitor Window` in both updated docs |
| Handler-effect/timestamp-style unseen authority | Bounded semantic presentation witness and revision | Same section |
| Workspace conversation copy control and eager full-conversation derivation | Removed with no replacement export action | Same section |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Documentation now matches the latest-base integrated active-trace paging state. The user explicitly requested ticket-branch publication for host verification; archival, target-branch merge/push, release, deployment, and cleanup remain on verification hold.

## Blocked Or Escalated Follow-Up

Representative live snapshot execution remains `Blocked` because safe Mode S requires explicit permission to quiesce the user-owned port-8000 server. The user instead requested host-side testing. This does not block publishing the ticket branch, but it remains recorded as an API/E2E coverage limitation rather than a Pass.
