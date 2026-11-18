# Result — autobyteus-305: steps 1–4 delivered; step 5 waits for autobyteus-285 and -287

- Package: `docker-node-in-place-server-update`; Task `autobyteus-305` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Classification: `Blocked` — `Waiting For Prerequisite`: **autobyteus-285** (restart-and-resume step 1: record mid-turn runs and resume them) and **autobyteus-287** (step 3: the update click carries the resume choice). autobyteus-284 is delivered (in `personal` since `e4bebdc858`).
- Current SR: SR-013. Requirements approved at SR-003 (the user); design SR-005 + SR-009, reviewed ARCH-REV-001..005.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update` @ `8e463448be` (= `origin/personal`), target `personal`. The ticket folder stays in `tickets/in-progress/`.

## Delivered

| Step | What | Merge into `personal` | Release |
| --- | --- | --- | --- |
| 1 | Signed server package; image runs it; per-architecture assets | `eec6522b27` | — |
| 2 | Starter, per-node `server-packages` volume, version on `/rest/node-update` | `a0f4b491f7` | — |
| 3 | In-place update by command (`autobyteus-docker update`), verification, data copy and rollback | `0a223aa397` | **v1.5.11-beta.6** (the user's request; 23/23 assets, 4/4 workflows) |
| 4 | Desktop: version and "Update to <version>" on the Nodes page | `db0881a96e` | not released (prepared `release-notes.md`) |

Receipts: `delivery-receipt-verification-step{1,2,3,4}.md`.

## Remaining (step 5)

- After 285 and 287: the update's stop uses the bounded shutdown (284, delivered) and mid-turn runs continue automatically (DEC-015, the user's 2026-10-30 decision).
- AC-007 and the done-when demo, "mid-turn runs come back", remain.
- Also still to show: the first real in-place update between two published versions, possible from the next release after 1.5.11-beta.6.

## Follow-ups sent with this result

FU-001..FU-008 (`follow-ups.md`). FU-007 is already resolved (DR-003). The urgent row (FU-007) needs no action.

## Next action

The PTM gives the Solution Designer the word when 285 and 287 are delivered. Step 5 then resumes on this package.

## PTM reply (2026-10-31)

- Steps 1–4 were verified by the PTM.
- Follow-up homes: FU-002, FU-004, FU-006 → autobyteus-344; FU-003, FU-005, FU-008 → autobyteus-345; FU-001 → a comment on autobyteus-306; FU-007 needs no action.
- Order of the prerequisites: 284 is delivered; autobyteus-339 (update-restart reliability) lands before 285 (automatic resume); 287 follows 285. The PTM reports when 285 and 287 are delivered.

