# Investigation Notes

## Observed Failure

- Installed app log: `C:\Users\happy\.autobyteus\logs\app.log`.
- Electron starts and repeatedly checks backend health, but backend exits during startup.
- Failing backend step: Prisma migration deploy.
- Log evidence:
  - Prisma datasource: `file:/C:/Users/happy/.autobyteus/server-data/db/production.db`.
  - Error: `Failed to open SQLite database`.
  - Windows error: `The filename, directory name, or volume label syntax is incorrect. (os error 123)`.
  - Server exits with code `1`.

## Root Cause

The Windows runtime SQLite URL generator normalizes backslashes to `/`, then prepends an additional `/` when the normalized path does not start with `/`.

For `C:\Users\happy\.autobyteus\server-data\db\production.db`, this emits:

`file:/C:/Users/happy/.autobyteus/server-data/db/production.db`

Prisma's schema engine then sees a Windows path equivalent to `/C:/...`, which is invalid on Windows and causes `os error 123`.

## Source Locations

- `autobyteus-web/electron/server/serverRuntimeEnv.ts`: process environment path used when Electron starts the embedded server.
- `autobyteus-web/electron/server/services/AppDataService.ts`: first-run `.env` generation path.
- `autobyteus-server-ts/src/config/app-config.ts`: server fallback path generation when `DATABASE_URL` is absent.

## Triage

This is a code/runtime URL-formatting bug, not corrupt data. Deleting `server-data` would regenerate the same bad `DATABASE_URL` unless the code or installed runtime is patched.
