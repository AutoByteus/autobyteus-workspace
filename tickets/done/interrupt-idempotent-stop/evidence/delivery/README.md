# Delivery evidence — autobyteus-533 (interrupt-idempotent-stop)

Checks the Delivery Engineer ran on the integrated tree (`origin/personal` `53b72018ad` merged into the ticket branch as
`ac410ad30b`, then the case-ID renumbering commit; `DEL-06` after the second merge, `b1684a5378`), 2026-11-18. macOS 26.5.2, Node v22.23.1, headless Chrome, a shared machine
at load 40–50. The API/E2E evidence is in `../api-e2e/` (index: `../api-e2e/README.md`) and is not repeated here.

**Phone case IDs.** API/E2E's evidence and reports name this ticket's phone cases `MSP-75…79`. The merge brought in other
tickets' `MSP-75…78` (autobyteus-526, autobyteus-517), and the phone probe fails a case ID used twice, so delivery renumbered
this ticket's cases (the probe file's own convention, as for `MSP-73`): `MSP-75→80` (standalone run), `76→81` (Team member),
`77→82` (Org member, Org Team member), `78→83` (delegated agent, delegated Team member), `79→84` (peer run on a second node).
Only the IDs, the screenshot names and the comments changed. `DEL-05` runs them under the new IDs beside the base's cases.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log`, `DEL-01-web-typecheck.log` | both typechecks on the merged tree | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | `production errors: 0`; test-file errors 1008 in 315 files and 87 in 37 files, each equal to its baseline; `PASS` |
| `DEL-02-server-build.log` | server rebuilt after the merge | `pnpm -C autobyteus-server-ts build` | exit 0 |
| `DEL-02-desktop-probe-merged-state/` | the one relevant real-stack check | `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <dir>` | `evidence.json` `"result": "Pass"`, SGD-01…08 Pass, no browser error, no send stall; `command.log`; 3 screenshots (`SGD-01-gap0`, `SGD-03`, `SGD-07-b-refused`) |
| `DEL-03-server-stop-unit.log` | Stop-related server unit files | `vitest run` the three backend tests, `tests/unit/services/agent-streaming`, `tests/unit/agent-execution/domain` | `Test Files 32 passed`, `Tests 304 passed` |
| `DEL-03-web-stop-unit.log` | Stop-related web specs | `NUXT_TEST=true vitest run services/runInterrupt services/agentStreaming services/agentOrgExecution services/runSubmission components/agentInput …` | `Test Files 48 passed`, `Tests 523 passed` |
| `DEL-03-server-integration-agent-websocket.log` | the websocket integration file | `test:integration:prepare`, then `vitest run tests/integration/agent/agent-websocket.integration.test.ts` | `Tests 8 passed (8)` |
| `DEL-04-hygiene-lockfile-build-inputs.log` | hygiene, lockfile, build inputs | `scripts/check_repository_artifact_hygiene.py`; `pnpm install --frozen-lockfile --lockfile-only`; the build-input path list | passed; consistent; `autobyteus-web/package.json` (one script line) is the only build-input path |
| `DEL-05-phone-probe-merged-state/` | the renumbered phone cases beside the base's cases | `pnpm -C autobyteus-web build:mobile-web`, then `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-75,MSP-76,MSP-77,MSP-78,MSP-80,MSP-81,MSP-82,MSP-83,MSP-84` | `mobile-shell-probe.json` `"result": "Pass"`, MSP-75…78 (base) and MSP-80…84 (this ticket) all Pass, no duplicate-ID entry, no unknown browser error; `DEL-05-mobile-web-build.log` (exit 0); 3 screenshots |
| `DEL-06-second-refresh/` | after a second base refresh (`origin/personal` `2eb195603a`, merge `b1684a5378`) | both typechecks; `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web test:e2e:stop-generation` | typechecks at baseline `PASS`; build exit 0; `stop-generation-evidence.json` `"result": "Pass"`, SGD-01…08 Pass |
