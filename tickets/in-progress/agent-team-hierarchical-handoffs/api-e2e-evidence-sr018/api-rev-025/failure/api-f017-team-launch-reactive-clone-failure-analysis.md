# API-F-017 — Existing AgentTeam Cannot Open Its Run Configuration

## Result

- API/E2E revision: `API-REV-025`
- Scenario: `API-LIVE-025-TEAM-LAUNCH-001`
- Result: **Fail**
- Preliminary classification: **implementation defect / Local Fix**
- Recommended owner after focused failure-origin review: `implementation_engineer`
- Current HEAD: `f7e825cc64a862555b0e26ea529599fe85d2f8b5`

## Expected Behavior

From the real `/agent-teams?view=team-list` frontend, clicking **Run** on the imported **Nested Classroom Test Team** must open `/workspace` with the Team run configuration form. The user must then be able to choose AutoByteus, Codex App Server, or Claude and start the Team.

## Observed Behavior

The browser navigates to `/workspace`, then Nuxt renders an Error 500 page:

`DataCloneError: Failed to execute 'structuredClone' on 'Window': #<Object> could not be cloned.`

The production stack points to:

1. `cloneConfig` in `autobyteus-web/stores/teamRunConfigStore.ts:37`;
2. `createDraft` / `setTemplate` in the same store;
3. `prepareTeamRun` in `autobyteus-web/composables/useRunActions.ts`;
4. the real Team card Run action.

No TeamRun was created, no provider was invoked, and the runtime/model form never became available. This is a common frontend launch boundary, so continuing the AutoByteus, Codex, Claude, standalone, or mobile reference rows would not establish the required current Team behavior.

## Reproduction

Execution mode: real headless Google Chrome against the current Nuxt development frontend and checked disposable built server.

1. Open `http://127.0.0.1:31225/agent-teams?view=team-list`.
2. Confirm the imported `Nested Classroom Test Team` card is visible.
3. Click its exact **Run** button.
4. Observe `/workspace` fail before `#team-run-runtime-kind` is rendered.

The first automation attempt was invalidated by a transient Vite `Outdated Optimize Dep` reload and is retained separately. The frontend was restarted after dependency optimization. The second attempt is the authoritative product failure and contains no browser console resource error.

## Failure Origin Evidence

- `AgentTeamDefinition` records are held in a Pinia `ref`, so the definition passed from the rendered Team card is a Vue reactive proxy.
- `setTemplate` passes that definition through `buildTeamRunTemplate` and then `createDraft`.
- `createDraft` calls `freezeConfig`, whose `cloneConfig` implementation directly invokes `structuredClone(config)`.
- The real browser proves the produced configuration still contains a non-cloneable reactive value. Existing unit tests seed plain non-reactive fixture objects, so their passing result does not exercise this browser boundary.
- This behavior is neither allowed by SR-018 nor a requirement/design ambiguity. A normal existing Team must remain runnable from the frontend. No route/path compatibility, relaxed identity parsing, or alternate launch authority is requested.

## Evidence

- Authoritative structured result: `../live/browser/autobyteus-browser-row.json`
- Screenshot: `../live/browser/autobyteus-failure.png`
- Command log: `../live/browser/autobyteus-browser-row.log`
- Screenshot SHA-256: `c8476807b271bc8b04d562a7463fb70310adc45a703aa3722a0a55dd3461f5cb`
- Structured result SHA-256: `c56f7b3112dde837d6b09297c61427f21e3f6a79ddec8b71f1ca28631d9d5b36`
- Safe-target proof: `../environment/safe-target-preflight.log`, `../environment/server-pid-lsof.log`, and `../environment/failure-time-isolation.log`
- Cleanup: `../environment/post-failure-cleanup.log`

## Environment Safety

- The server was started only through `test-support/live-e2e/test-runtime-bootstrap.mjs` and opened exactly `autobyteus-server-ts/db/api-rev-025-live-20260812-1.db`.
- The owned process had zero open references to `/Users/normy/.autobyteus/server-data/db/production.db`.
- `pnpm secrets:import` imported configured identifiers into the disposable target without recording secret values.
- The disposable runtime/database and owned `60225/31225` processes were removed after failure capture.
- The operational database was not inspected, copied, targeted, migrated, repaired, rolled back, or deleted.
- Protected `60004/31004` listeners were absent at both preflight and cleanup after the reported power loss; API/E2E did not start, stop, repoint, or reuse them.

## Required Recheck After Source Correction

1. Add or update durable coverage that passes a real Pinia-reactive `AgentTeamDefinition` through the exact Run-card/`prepareTeamRun`/Team config draft boundary.
2. Rerun the real existing-Team Run click and prove the form renders.
3. Resume the safe AutoByteus row first, then Codex `gpt-5.6-luna` medium and authenticated Claude.
4. Complete standalone Agent and real mobile structured-reference rows.
5. Return the full repository-resident durable coverage package for proportional review only after an overall API/E2E Pass.
