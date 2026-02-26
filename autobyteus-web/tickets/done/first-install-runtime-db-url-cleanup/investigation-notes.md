# Investigation Notes - first-install-runtime-db-url-cleanup

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/electron/server/macOSServerManager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/electron/server/serverRuntimeEnv.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/electron/server/services/AppDataService.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/config/app-config.ts`
- Packaged app env in build artifact: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/.env`
- Runtime startup logs from clean HOME smoke runs under `/tmp/ab-fresh-*` and `/tmp/ab-lan-check-*`

## Key Findings
- Packaged `.env` can contain machine-specific `DATABASE_URL` values.
- Startup is safe only if Electron injects runtime DB env before server process initialization.
- Current fix path does inject runtime `DATABASE_URL` early via server manager env merge.
- Clean install startup is successful when launching packaged app with brand-new HOME.
- GraphQL `agentDefinitions` resolves successfully on clean install (empty array, no fetch error).
- Embedded server listens on `*:29695`; LAN endpoint `http://192.168.2.158:29695/rest/health` is reachable.
- `DB_NAME` is legacy/deprecated for current Prisma connection path; `DATABASE_URL` is sufficient.

## Unknowns / Risks
- OS firewall policy can block LAN access even when server binds all interfaces.
- Existing installed users may still carry old copied `.env`; runtime env override mitigates this at process launch.

## Implications
- Keep runtime env injection as authoritative source for DB path.
- Remove legacy `DB_NAME` references to prevent future drift and dual-source confusion.
