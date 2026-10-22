# IMP-07 rendered UI check (implementation self-validation, not a probe or sign-off)
# Stack: test-owned data root under /tmp (removed afterwards), its own SQLite DB (prisma migrate deploy), backend
#   autobyteus-server-ts/dist/app.js of this worktree's build, Nuxt dev (pnpm dev) bound to it; headless Chrome via playwright-core.
# Seed: IMP-07-ui-scripts/seed.sh through tests/fixtures/project-task-tool-writer.mjs (the built create_task / update_task),
#   including add_comment by key in two letter cases, a combined status + comment, and a blank comment (refused).
# Check: IMP-07-ui-scripts/ui-check.mjs at 1440x900 and 760 px; results in IMP-07-ui-run1/result.json, screenshots beside it.
# Source: working tree equal in source to e014c349b8 (no source change after the run); macOS; 2026-10-22
# Result: 5/5 Pass, no browser errors:
#   task-page-thread, add-comment-live, empty-and-refused, board-search-comment, narrow-760
