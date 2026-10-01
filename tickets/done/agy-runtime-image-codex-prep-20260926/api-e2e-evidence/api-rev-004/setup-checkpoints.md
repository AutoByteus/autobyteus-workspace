# API-REV-004 setup checkpoints
- First backend startup failed before readiness: inherited shell `APP_ENV=production`, `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29695`, and `DATABASE_URL=file:/Users/normy/.autobyteus/server-data/db/production.db` overrode isolated `.env` (dotenv did not override). Prisma reported `database is locked` during migration persistence initialization. No successful server launch or browser/API action followed that attempt. Do not infer a production-data change or use that database. Corrective action: explicitly override all three process environment variables and use an isolated SQLite URL under the owned temp app-data directory before retry.

## Corrected owned process setup and exact commands
- From `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926` (current integrated HEAD `ee0e2c313`), all exit 0:
  - `autobyteus-application-sdk-contracts/node_modules/.bin/tsc -p autobyteus-application-sdk-contracts/tsconfig.build.json`
  - `autobyteus-application-backend-sdk/node_modules/.bin/tsc -p autobyteus-application-backend-sdk/tsconfig.build.json`
  - `autobyteus-server-ts/node_modules/.bin/tsc -p autobyteus-server-ts/tsconfig.build.json`
  - `node autobyteus-server-ts/scripts/copy-build-assets.mjs`
- From `autobyteus-server-ts`, with `D=/tmp/agy-browser-api-rev-004-zw14bL`, explicitly set `APP_ENV=test AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:18080 DB_TYPE=sqlite DATABASE_URL=file:$D/db/test.db AUTOBYTEUS_AGENT_PACKAGE_ROOTS='' AUTOBYTEUS_TEMP_WORKSPACE_DIR=$D/workspace`; then `node dist/app.js --data-dir "$D" --host 127.0.0.1 --port 18080 > backend-isolated.log 2>&1`. Startup log confirms isolated SQLite, public URL and listener.
- From `autobyteus-web`, explicitly set `BACKEND_NODE_BASE_URL=http://127.0.0.1:18080`, `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:18080/graphql`, `BACKEND_REST_BASE_URL=http://127.0.0.1:18080/rest`, and all `BACKEND_*_WS_ENDPOINT` values to corresponding `ws://127.0.0.1:18080` endpoints; then `./node_modules/.bin/nuxt dev --host 127.0.0.1 --port 13080 > frontend.log 2>&1`.
- Readiness `curl -H 'content-type: application/json' -d '{"query":"query { __typename }"}' http://127.0.0.1:18080/graphql` returned HTTP 200; `curl http://127.0.0.1:13080/workspace` returned HTTP 200. `agy --version` returned 1.2.11.
- Chrome/CUA used for all UI interactions (Settings package import, run configuration, chat turns and rendered card inspection). Browser result tab marked deliverable for user inspection. No browser HTTP/GraphQL script was used to bypass product UI.
