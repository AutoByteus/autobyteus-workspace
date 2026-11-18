# Docs Sync Report — test-and-tooling-hygiene (autobyteus-253)

## Scope

- Ticket: `autobyteus-253` test-and-tooling-hygiene (`task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk`; review gates `Not Applicable` on this route)
- Trigger: API/E2E validation `Pass` (`API-REV-001`), head `d53b94a7ff` (code `af81b3d7d2`)
- Bootstrap base reference: `origin/personal` @ `8b34e8ae10`
- Integrated base reference used for docs sync: `origin/personal` @ `1138e8fbef`, merged into the ticket branch as `f7c9648821`
- Post-integration verification reference: `evidence/DR-01-ac016-clean-clone.txt` (clean clone of `f7c9648821`)

## Why Docs Were Updated

- Summary: the implementation already updated the three long-lived docs that describe what this ticket changed. Delivery reviewed them against the final integrated code and found them accurate. Delivery made no further doc edit.
- Why this should live in long-lived project docs: the watcher catch-up is new product behavior. It has a constant, a log code and a known limit. A future reader of the agent package module needs all three.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_package_definitions.md` | The watcher and reloader changed (W-02) | Updated (by implementation) | The "Catch-up for dropped events" paragraph matches the code: `PACKAGE_CATCH_UP_DELAY_MS = 300`, `reconcilePackageFolder`, the `getWatched()` self-check, `AGENT_PACKAGE_FOLDER_UNWATCHED`, a quiet re-arm, and the accepted limit (RISK-001, with Reload as the recovery) |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Dead tests for deleted `src/prompt-engineering` were removed (W-10) | Updated (by implementation) | It names only Carpenter code that exists. Inbound links from `agent_definition.md`, `agent_execution.md`, `agent_team_execution.md`, `collaboration_model.md` and `modules/README.md` still resolve |
| `autobyteus-web/docs/electron_packaging.md` "Build Commands" | Stale `npx ts-node` commands (W-07) | Updated (by implementation) | Every command exists in `autobyteus-web/package.json` (API-16) |
| `README.md` "Packaged Electron API/E2E testing" | Harness default build changed (W-06) | No change | "builds the current host package by default" is now true |
| `autobyteus-web/README.md` build section | Same scripts | No change | Already lists `build:electron:mac|linux|linux:x64|linux:arm64|windows` |
| `TESTING.md` | LM Studio suite, harness, server E2E layer | No change | Its commands and rules still hold. The LM Studio default model note still applies |
| `RELEASE.md` | Hygiene check edited (exclusion list removed) | No change | It describes the checks, not the removed exclusion |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none by delivery) | — | — | The implementation's doc edits are accurate on the integrated state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Watcher catch-up for dropped OS events | macOS can drop directory events just after a watch arms and while chokidar adds a watch. After 300 ms of quiet, the watcher asks for one package re-read, which announces only real changes. It also re-arms once when a folder on disk is not watched | `design-spec.md` (SR-002), `investigation-notes.md` OBS-W1…W6 | `autobyteus-server-ts/docs/modules/agent_package_definitions.md` (already there) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `tests/**/prompt-engineering/**` (36 dead files), the three `vitest.config.ts` exclusions and `EXCLUDED_DEAD_TEST_DIRS` in the hygiene check | Nothing (the source was deleted 2026-03-06) | `prompt_engineering.md` says the old prompt lookup no longer exists |
| Memoizing `buildGraphqlSchema` mock in `update-notifications-live.e2e.test.ts` | `type-graphql` `^2.0.0-rc.4` (its `initCache` clears its caches) | Server `package.json` and the lockfile; no doc named the mock |
| `npx ts-node build/scripts/build.ts` commands | `pnpm -C autobyteus-web build:electron*` | `electron_packaging.md` |

## No-Impact Decision

- Not applicable. The docs were updated during implementation and verified here.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then verification, finalization and the beta release the user asked for
- Notes: no follow-up was needed for the docs. FU-001…FU-004 in `follow-ups.md` come from earlier stages and are not about docs.
