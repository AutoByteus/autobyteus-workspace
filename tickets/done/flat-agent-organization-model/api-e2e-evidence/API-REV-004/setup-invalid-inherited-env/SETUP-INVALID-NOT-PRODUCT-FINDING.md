# Excluded setup attempt — inherited process environment overrode isolated `.env`

The first API-REV-004 live attempt is excluded from product-result attribution.
The backend was given `--data-dir`, so file/memory state was isolated, but it
inherited the parent process's global `DATABASE_URL` and
`AUTOBYTEUS_AGENT_PACKAGE_ROOTS`. `dotenv` correctly did not override existing
process values. Consequently the first restart read the global DB and only the
global package roots even though the isolated `.env` and package registry had
been updated by UI import. The observed missing `aorg-lead` restore is an
API/E2E environment error, not API-FIND-014.

Corrective action: stop all owned processes, retain this attempt as excluded
evidence, create a fresh API-REV-004 live data root, and start every backend
process with `env -i` plus only HOME/USER/SHELL/TERM/LANG/PATH. The server then
loads the owned `.env`; the initial run begins without the fixture root, the UI
import adds it, and the restart must reload it from the same isolated `.env` and
isolated SQLite DB.
