# API-FIND-014 — UI-imported current package is not reloaded for restart continuation

## Classification

- Result: **Fail**.
- Preliminary origin: **Unclear; likely production startup/package-definition registration**. Focused Code Review origin analysis is required.
- Affected scenarios: `RST-TEAM-002`, `PKG-REUSE-002`, `TEAM-CONT-002`.
- Acceptance criteria: `AC-007`, `AC-009`, `AC-011`, `AC-013`, `AC-021`; user-requested real restart/history/continuation journey.
- Exact artifact: `b19c41e68c119f9a9590c5b04839454dae5f64b8` (IR-016 source `394fc27f896dac4121ef166cc0972b60e8b89ce4`, CRR-017 cumulative Pass).

## Preconditions proven

1. The retained package passed its complete `PACKAGE.sha256` contract and was imported through the real Settings > Agent Packages UI, not by editing server state.
2. Import wrote the exact local package path to isolated `agent-packages/registry.json`.
3. The initial server process repopulated its caches from 50 to 54 Agents and from 0 to 2 Teams after the UI import.
4. A real standalone Team run and one mixed AgentOrg run were launched with Codex App Server / `gpt-5.6-sol` / low reasoning. Both completed ordinary messages and a formal same-task submit -> revision -> resubmit -> accept lifecycle. The Team and Org execution packages, task sidecars and raw provider traces were durable.
5. Direct application-owned `SIGTERM` closed the first server cleanly. The second process started with the same data directory and the registered package source still present and readable.
6. The first mixed post-restart GraphQL query returned the exact Team and Org root IDs as inactive and returned the Team run with its exact members/statuses; prior task/message content rendered in the browser.

## Supported action and expected result

From the stopped standalone Team history, focus the configured `/lead` Agent and send the first continuation prompt:

`Return exactly AORG4-TEAM-RESUME-001 on the first line and a five-word acknowledgement on the second line.`

The exact existing TeamRun should materialize from its durable Team V2 snapshot, preserve prior task/message history and provider identity/content, admit the triggering prompt once, become active, and respond. A failure must be visible rather than silently discarding the action.

## Observed result

- The restart process populated only the 50 default Agents and **0 Teams**. It did not reload the one durable registered local package into the Agent/Team definition caches.
- Restoration repeatedly reached `CodexThreadBootstrapper`, which rejected the persisted configured member because `Agent definition 'aorg-lead' was not found`, then surfaced `PlatformAgentRunRestoreError: The persisted provider conversation could not be restored`.
- The exact prior Team row, history markers and accepted task remained visible and the Team stayed inactive/`Offline`.
- The triggering continuation marker never entered the visible conversation; the draft remained present; no Restore/Reconnect/Stop control or error alert/toast appeared.
- The restart log contains 22 identical missing-definition failures across the bounded/retriggered attempts. Post-failure GraphQL still returns both exact roots as inactive.
- No fixture/source mutation occurred. Final package hash check passes.

This contradicts current-package reusability plus Team persistence/restore/continuation. It is not attributable to an invalid fixture: the same exact package ran successfully before restart, its registry record and files persisted, and all hash checks pass.

## Evidence

- `API-FIND-014-package-registry-after-restart.json`
- `API-FIND-014-cache-population-comparison.log`
- `API-FIND-014-backend-restore-excerpt.log`
- `API-FIND-014-browser-observation.json`
- `API-FIND-014-post-failure-history-{request,response}.json`
- `API-FIND-014-team-persistence-after-failure.sha256`
- `API-FIND-014-fixture-current.sha256`
- `../screenshots/TEAM-RESTART-FIRST-PROMPT-RESTORE-FAILED.png`
- `../backend.log`, `../backend-restart.log`
- `../graceful-shutdown-1.log`, `../graceful-shutdown-2.log`

## Stop rule

Cumulative execution stopped at this first critical restart-continuation failure. AgentOrg Restore/continuation, refreshed 390x844 strip/drawer focus, live Stop Org terminal presentation, and later scheduled live scopes remain **Not Tested in API-REV-004**, not inferred from API-REV-003. Current repository evidence and material pre-failure API-REV-004 passes are retained separately.
