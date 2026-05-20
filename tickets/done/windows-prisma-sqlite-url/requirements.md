# Windows Prisma SQLite URL Startup Fix

Status: Design-ready

## Problem

The installed Windows AutoByteus desktop app starts Electron but the embedded backend never becomes healthy. Logs show Prisma migration fails before the server starts:

`Failed to open SQLite database. The filename, directory name, or volume label syntax is incorrect. (os error 123)`

The generated runtime config contains:

`DATABASE_URL=file:/C:/Users/happy/.autobyteus/server-data/db/production.db`

## Requirements

- On Windows, generated Prisma SQLite URLs must be accepted by Prisma migration/runtime code.
- First-run `.env` generation and process startup environment generation must use the same valid URL format.
- Existing non-Windows URL behavior must remain unchanged.
- The installed local runtime config should be repaired by a standalone script/tutorial, not by product runtime legacy handling, so the user can retry startup without waiting for a future installer build.

## Acceptance Criteria

- Unit tests cover Windows and POSIX SQLite URL formatting.
- The user-local `C:\Users\happy\.autobyteus\server-data\.env` no longer contains the invalid `file:/C:/...` database URL.
- A clean migration/startup retry is possible without deleting unrelated user data.
- A project-level Windows repair script and README exist for already-affected installs.

## Non-Goals

- Do not change the database location.
- Do not delete user data unless migration/startup still fails with evidence of data corruption after URL repair.
- Do not introduce legacy fallback support for the invalid URL shape in product runtime code.
