# Docs Sync Report

## Scope

- Ticket: `codex-search-web-activity-visibility`
- Trigger: Delivery-stage docs synchronization after API/E2E Round 2 passed for revised Codex `search_web` lifecycle fan-out plus segment-first Activity projection.
- Bootstrap base reference: `origin/personal` at `27f368b97d4ab538d32fcd2038fae917c86cdb39`
- Integrated base reference used for docs sync: `origin/personal` at `27f368b97d4ab538d32fcd2038fae917c86cdb39` (`Already current`; no merge/rebase needed)
- Post-integration verification reference: `git diff --check` passed on 2026-05-01 after delivery docs sync. No executable post-integration rerun was required because the tracked base did not advance beyond the reviewed/validated branch state.

## Why Docs Were Updated

- Summary: The revised implementation changes the live-stream Activity projection contract and keeps the Codex `webSearch` lifecycle fan-out from the first pass. Long-lived docs now record both: eligible tool-like segment starts seed immediate Activity visibility, while lifecycle events own approval/execution/terminal state and durable traces.
- Why this should live in long-lived project docs: Future streaming and Codex event work must not reintroduce the obsolete lifecycle-only Activity invariant or duplicate segment/lifecycle Activity policy. The shared `toolActivityProjection.ts` boundary is now the durable frontend owner for live Activity projection.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Canonical Codex raw-event audit table and ownership rules. | `Updated` | Finalized the `webSearch` lifecycle spine, audit-table rows, and operational rule with segment-seeded Activity visibility clarified. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-server-ts/docs/modules/codex_integration.md` | Codex module-level event-normalization rules. | `Updated` | Added `webSearch` as an authoritative raw owner for separated transcript and lifecycle surfaces. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime-neutral tool-lane contract. | `Updated` | Clarified that segment events can seed pending frontend Activity visibility, while `TOOL_*` owns execution/terminal state and durable traces. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-web/docs/agent_execution_architecture.md` | Frontend streaming handler and Activity ownership documentation. | `Updated` | Replaced obsolete “segments do not create Activity” statements with the shared `toolActivityProjection.ts` segment/lifecycle projection contract. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/README.md` | Root Codex runtime testing/operator docs. | `No change` | No user-facing command, setting, or testing workflow changed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-server-ts/README.md` | Backend Codex testing/operator docs. | `No change` | Existing Codex E2E/debug guidance remains accurate; this fix changes normalized event fan-out and frontend projection behavior. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Internal architecture/audit documentation | Added/finalized `Web Search Lifecycle Spine`, `item/started(webSearch)` and `item/completed(webSearch)` audit rows, and an operational rule that `webSearch` lifecycle owns execution status/traces while segment events may seed pending Activity visibility. | The backend converter now maps Codex `webSearch` to both transcript and lifecycle lanes, and the audit table is the durable contract for Codex raw-event interpretation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-server-ts/docs/modules/codex_integration.md` | Module architecture documentation | Added the Codex built-in `search_web` event-normalization rule: start emits `SEGMENT_START` plus `TOOL_EXECUTION_STARTED`, and completion emits exactly one terminal lifecycle event before `SEGMENT_END`. | Future readers of the Codex integration overview need the same ownership rule without drilling into the full audit table. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime architecture documentation | Clarified the runtime-neutral lanes: segments own transcript structure and can seed pending Activity display; lifecycle events own execution/approval/terminal state, logs, result/error, and durable traces. | The refined behavior changes how the frontend consumes normalized lanes while preserving lifecycle authority for execution/traces. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture documentation | Documented `toolActivityProjection.ts` as the shared Activity projection owner; updated segment, lifecycle, and Activity store sections for segment-first seeding and lifecycle dedupe/update. | The previous doc text preserved the obsolete invariant that live transcript segment handlers do not create Activity rows. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Codex built-in web search lifecycle | Raw `item.type = webSearch` now fans out into both transcript and lifecycle lanes; lifecycle owns `search_web` execution/terminal status and traces. | Requirements doc, design spec, implementation handoff, validation report | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Segment-first Activity visibility | Eligible tool-like `SEGMENT_START` seeds/hydrates a pending Activity row so the right-side Activity appears when the middle tool card appears. | Refined requirements, design impact rework note, design spec, validation report | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Shared Activity projection ownership | Segment and lifecycle handlers must call one shared projection owner for Activity upsert, alias dedupe, argument merge, status/result/log projection, and terminal precedence. | Design spec, implementation handoff, review report | `autobyteus-web/docs/agent_execution_architecture.md` |
| Lifecycle vs display authority | Segment events provide display facts and immediate pending visibility; lifecycle events own approval/execution/terminal state and durable tool traces. | Design spec, validation report | `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Prior documentation omitted `webSearch` from the lifecycle-owned Codex item mapping. | Explicit `webSearch` lifecycle spine and audit-table rows. | `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Old lifecycle-only frontend Activity invariant: segment-created tool cards do not create Activity. | Segment and lifecycle handlers both delegate to `toolActivityProjection.ts`; eligible segments seed Activity immediately and lifecycle updates the same row. | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Duplicated/private lifecycle-only Activity projection policy. | Shared frontend `toolActivityProjection.ts` owner. | `autobyteus-web/docs/agent_execution_architecture.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A; docs were updated.
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest tracked base state and the revised reviewed/validated implementation. Repository finalization remains held until explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
