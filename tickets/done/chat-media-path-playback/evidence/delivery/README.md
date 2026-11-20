# Delivery evidence — autobyteus-572 (chat-media-path-playback)

Checks the Delivery Engineer ran on the integrated tree (`origin/personal` `b072d93d8e` merged into the ticket branch as
`367711125f`), 2026-11-20. macOS, Node v22.23.1, headless Chrome, a shared machine at load 30–60. The API/E2E evidence is in
`../api-e2e/` (index: `../api-e2e/README.md`) and is not repeated here.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log`, `DEL-01-web-typecheck.log` | both typechecks on the merged tree | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | `production errors: 0`; test-file errors 1006 in 315 files and 86 in 36 files, each equal to its baseline; `PASS` |
| `DEL-02-server-build.log`, `DEL-02-mobile-web-build.log` | server and phone bundle rebuilt after the merge | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `build exit 0` (the phone build's "Duplicated imports" lines are Nuxt auto-import notices) |
| `DEL-02-phone-probe-merged-state/` | the one relevant real-stack check | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-89,MSP-90,MSP-91,MSP-92 --output-dir <dir>` | `mobile-shell-probe.json` `"result": "Pass"`, four cases Pass, no duplicate-ID entry, no unknown browser error, cleanup `serversLeft: 0`; `command.log`; 5 screenshots (`MSP-89-insideBig-loading`, `MSP-91-outside-failed`, `MSP-91-outside-after-retry`, `MSP-91-zh-CN-loading`, `MSP-92-reference-loading`) |
| `DEL-03-server-unit.log` | the ticket's server unit files | `vitest run tests/unit/api/rest/user-file-reply.test.ts tests/unit/api/rest/workspaces.test.ts tests/unit/node-files/node-file-reader.test.ts` | `Test Files 3 passed`, `Tests 18 passed` |
| `DEL-03-web-unit.log` | the ticket's web specs and the neighbours the base changed | `NUXT_TEST=true vitest run components/fileExplorer/viewers components/mobile composables/… utils/download utils/remoteAccess utils/fileExplorer` | `Test Files 43 passed`, `Tests 337 passed` |

Hygiene (`scripts/check_repository_artifact_hygiene.py`: passed, 101 646 tracked files), the frozen-lockfile consistency check
(`pnpm install --frozen-lockfile --lockfile-only`: consistent) and the Secret Gate (`scripts/check_secrets.sh`: `PASS`) are
recorded in `../../release-deployment-report.md`.
