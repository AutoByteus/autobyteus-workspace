# Browser Settings Journey Evidence

- Surface: actual browser tab against Nuxt dev server and built Fastify backend.
- Browser tab: AutoByteus browser tab `1b9331`.
- Frontend: `http://127.0.0.1:64230/settings`.
- Backend: `http://127.0.0.1:64229`, started from `autobyteus-server-ts/dist/app.js`.
- Isolation: owned `/tmp/scsp-browser-e2e.SE0B4O`; backend and frontend launched with `env -i` plus only non-secret operational variables. No repository `.env.test`, default Store, credential file, or ambient provider variable was read.
- Inputs: synthetic canaries only.

## Observations

1. Initial AutoByteus state was `Not Configured`; API-key input was `type=password`, empty, and Save was disabled.
2. First save produced `Configured`; input was cleared, changed to `Enter new key to update...`, Save became disabled, Remove became enabled, and the canary was absent from rendered text.
3. Replacement save preserved `Configured`, cleared the input, and left no canary in rendered text.
4. Remove returned to `Not Configured`, cleared the input, disabled Save, removed the Remove action, and left no canary in rendered text.
5. A further save was made to exercise restart/reopen.
6. A clean restart using the same documented `--data-dir` and sanitized environment **failed** before listen with Prisma `P1012: Environment variable not found: DATABASE_URL`. This is reproducible because `AppConfig.initSqlitePath()` returns when `DATABASE_URL` exists in parsed config data but does not republish that operational value into the Prisma child environment after the change to non-process-wide config parsing.
7. With an explicit non-secret `DATABASE_URL=file:/tmp/scsp-browser-e2e.SE0B4O/db/production.db` workaround, the server restarted, the browser showed `Configured` after reload with an empty password field, and removal succeeded. This workaround confirms Store persistence but does not make the documented restart path pass.
8. Owned backend/Nuxt logs had 0 files containing the synthetic canary marker.

## Screenshots

- Configured, value-free: `20-browser-settings-configured.png`
- Removed, value-free: `20-browser-settings-removed.png`

Screenshots are supporting evidence; the structural assertions above were read from live DOM state.
