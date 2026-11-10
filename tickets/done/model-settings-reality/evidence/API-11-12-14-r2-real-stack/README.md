# API-11 / API-12 / API-14 / API-14b / API-19 — round 2 (code dfa0faa76, SR-004): real-stack journeys, both CLI modes

- Probe (durable since round 2): `autobyteus-web/tests/e2e/model-list-journeys-probe.mjs` (replaces the ticket-owned `probes/real-stack/model-list-journeys-probe.mjs` of round 1; same journeys plus API-14b, API-19, the restart before the return message in API-12, and the `--cli scripted` mode).
- Commands (worktree root; `PATH=/tmp/pnpm-shim:$PATH`):
  - `scripted-cli/`: `node autobyteus-web/tests/e2e/model-list-journeys-probe.mjs --output-dir <fresh> --browser-executable /usr/bin/chromium --cli scripted`
  - `real-cli/`: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node autobyteus-web/tests/e2e/model-list-journeys-probe.mjs --output-dir <fresh> --browser-executable /usr/bin/chromium --cli real`
- Commit: code `dfa0faa76` (server `dist` rebuilt from it) + the probe at `be161036e` plus the uncommitted API-19/restart additions (committed with this evidence) · ENV-2 (see the round-1 README `../API-11-12-14-real-stack/README.md`) · 2026-11-10. Real CLIs: SDK-bundled `2.1.280`, system `2.1.322`.
- `evidence.json`: per-case details, CLI versions, cleanup receipt; `run.log`: console; `*.png`: support only (the proof is the values in `evidence.json`).
- Results: scripted: API-11, API-12, API-14, API-19, API-14b Pass. Real CLIs: the same five Pass (API-14 failed in round 1: `../API-11-12-14-real-stack/`).
- API-12 in this round also restarts the backend between the save back onto the first runtime and a message to the worker (TESTING.md Rule 10): `afterMessage {"runtimeKind":"autobyteus","pending":false}` and the chat shows `NATIVE-REPLY-1`, `NATIVE-REPLY-2`.
