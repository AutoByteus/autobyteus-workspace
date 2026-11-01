# Closure — autobyteus-305 (Docker nodes update their server in place)

- Closed 2026-11-01 at `/project_task_manager`'s request (the user asked why the Task was still open).
- **Step 5 moved to autobyteus-285.** "Mid-turn runs come back on a Docker node after an in-place update" (REQ-010's resume part, AC-007) is now part of autobyteus-285's done-when. This ticket no longer waits for 285 or 287.

## Delivered into `personal`

| Step | What | Merge | First release |
| --- | --- | --- | --- |
| 1 | Signed server package, per architecture; the image runs it | `eec6522b27` | v1.5.11-beta.6 |
| 2 | Starter, per-node `<node>-server-packages` volume, `/rest/node-update` status | `a0f4b491f7` | v1.5.11-beta.6 |
| 3 | In-place update by command, with verification, data copy and rollback | `0a223aa397` | v1.5.11-beta.6 |
| 4 | Desktop: node version and "Update to <version>" on the Nodes page | `db0881a96e` | v1.5.11-beta.7 |

- Real in-place updates between published versions: beta.6 → beta.7 (`evidence/DEL-14-…`), and beta.7 → beta.8 through the Nodes page request (`tickets/done/release-v1.5.11-beta.8/evidence/REL-04-…`).
- The user's own nodes moved onto the in-place path on 2026-10-31 (SR-015).

## Follow-ups

FU-001..FU-009 in `follow-ups.md`, with homes: FU-002/004/006 → autobyteus-344; FU-003/005/008 → autobyteus-345; FU-001 → a note on autobyteus-306; FU-007 none; FU-009 sent 2026-11-01.

## Records

`requirements-doc.md` (SR-016), `design-spec.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001..SR-016), the review, implementation, API/E2E and delivery records per step, and `delivery-receipt-verification-step{1..4}.md`.
