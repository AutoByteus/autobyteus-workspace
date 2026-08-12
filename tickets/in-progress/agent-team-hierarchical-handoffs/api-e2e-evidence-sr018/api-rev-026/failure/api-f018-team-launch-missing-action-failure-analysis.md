# API-F-018 — Real Team Launch Calls a Missing Store Action

## Result

- API/E2E revision: `API-REV-026`
- Scenario: `API-LIVE-026-TEAM-LAUNCH-001`
- Result: **Fail**
- Preliminary classification: **Local Fix — implementation source**
- Requested confirmation owner: `code_reviewer`
- Candidate implementation owner after confirmation: `implementation_engineer`

## Required behavior

From the real Agent Teams catalog, selecting **Run**, choosing the AutoByteus runtime and `gpt-5.6-luna`, and pressing **Run Team** must enter the Team workspace with an exact immutable Team launch draft. This is the unresolved downstream closeout for `API-F-017` after `IR-032` / `CRR-057`, and it is a prerequisite for the mandatory AutoByteus/Codex/Claude imported-Team matrix.

## Execution and observed behavior

1. Repository coverage and production builds passed before browser execution:
   - frontend maintained selection: `48 files / 343 tests`;
   - server retained selection: `74 files / 523 tests`, plus `7` capability-gated files / `20` declared skips that were not counted as provider proof;
   - server production TypeScript and `build:full`/sanitized bootstrap;
   - Nuxt production build.
2. A new disposable runtime and SQLite target were materialized with ambient `DATABASE_URL` and `DATABASE_URL_TEST` absent.
3. Prisma migrations and actual TTY `pnpm secrets:import` targeted only `autobyteus-server-ts/db/api-rev-026-live-20260812-1.db`.
4. `startBuiltTestServer` started the built server at `60226`; PID `lsof` proved the exact disposable database and no operational database reference. Nuxt ran at `31226`.
5. The staged nested-classroom package imported through public GraphQL and all required runtime/model capabilities were present.
6. Real Chrome successfully selected the imported Team, runtime, model, auto approval, and pressed **Run Team**.
7. Instead of entering the Team chat, Nuxt rendered Error 500: `teamContextsStore.createRunFromTemplate is not a function`.
8. No root TeamRun was created and no provider call occurred. The browser then timed out waiting for the Team message input.

Expected: Team workspace and message input become visible, preserving the immutable launch draft.

Observed: the real launch stops at Error 500 before TeamRun or provider execution.

## Failure-origin evidence

- `RunConfigPanel.vue:375` calls `teamContextsStore.createRunFromTemplate()`.
- `agentTeamContextsStore.ts` exposes no `createRunFromTemplate` action; its actions begin with `addTeamContext` and `removeTeamContext`.
- The actual launch owner is `agentTeamRunStore.launchDraft(...)`, reached by `sendMessageToFocusedMember(...)` when a Team draft is selected.
- The passing `RunConfigPanel.spec.ts` hid this runtime mismatch by inventing `teamContextState.createRunFromTemplate: vi.fn()` in its store mock and asserting that fake action was called.
- The failing call predates IR-032, but it is on the exact current critical launch path that IR-032 and CRR-057 explicitly required API/E2E to execute. It is therefore a current product defect, not a stale test expectation or environment failure.

## Evidence

- Browser screenshot with exact Error 500: `../live/browser/autobyteus-failure.png`
- Browser result: `../live/browser/autobyteus-browser-row.json`
- Browser log: `../live/browser/autobyteus-browser-row.log`
- Source and test-boundary audit: `api-f018-team-launch-missing-action-source-audit.log`
- Safe target proof: `../../environment/safe-target-preflight.log`, `../../environment/safe-server-ready.json`, and `../../environment/server-pid-lsof.log`
- Cleanup proof: `../../environment/final-cleanup-verification.log`

## Stop decision and remaining scope

This is a common launch-boundary failure, so API/E2E stopped without spending Codex or Claude calls. Codex, Claude, standalone Agent, restore/reconnect, and real mobile reference journeys remain **Not Tested**, not skipped or passed. The current durable package remains unreviewed until an overall API/E2E Pass.

## Safety and cleanup

- The operational database was not inspected, targeted, copied, migrated, repaired, rolled back, or deleted.
- The protected `60004/31004` stack was absent and untouched.
- Owned `60226/31226` listeners were stopped.
- The disposable runtime, database, and vault key were removed.
- Source fixture hashes remained unchanged.
- Both historical operational-database incident disclosures remain preserved.
