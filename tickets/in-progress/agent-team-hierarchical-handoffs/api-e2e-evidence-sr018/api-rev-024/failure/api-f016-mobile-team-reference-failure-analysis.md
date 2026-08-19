# API-F-016 — Mobile Team reference viewer loses the canonical root TeamRun ID

## Result

- API/E2E round: `API-REV-024`
- HEAD: `209daad0c74eeb78cc3631b26bdd53f197c10d56`
- Scenario: `API-MOBILE-REFERENCE-024-001`
- Requirements/boundary: SR-018 `R-051`/`R-052`, exact frontend `TeamExecutionState` root identity; mobile Team message reference navigation.
- Expected: opening a structured Team communication reference passes the exact current root TeamRun ID (`team-1`) plus message/reference identity to `MobileTeamReferenceViewer`.
- Observed: the rendered viewer identity begins with an empty TeamRun segment, `:message-1:ref-1:0`, rather than `team-1:message-1:ref-1:0`.
- Preliminary classification: implementation `Local Fix`; no design or requirement ambiguity.

## Direct reproduction

From `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-web`:

```sh
pnpm exec vitest run components/mobile/__tests__/MobileTeamMessages.spec.ts
```

Result: `1 passed / 1 failed`. The message/reference list itself renders, but the exact viewer identity fails.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr018/api-rev-024/failure/api-f016-mobile-team-reference-focused.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr018/api-rev-024/failure/api-f016-mobile-team-reference-source-audit.log`

## Failure origin evidence

`AgentTeamContext` now contains exactly `topology` and `executions`. Its canonical root owner is `executions.getRootTeamRunId()`. `MobileTeamMessages.vue` correctly uses that owner when selecting message perspective, but its viewer prop still reads removed `activeTeamContext.teamRunId`. At runtime that expression is `undefined`, which Vue passes as an empty rendered prop.

The maintained assertion is current rather than compatibility coverage: it requires the exact root identity already carried by the current aggregate. No route/path/name fallback or relaxed parser is requested. The bounded correction is to source the viewer prop from the canonical execution aggregate.

## Execution stop and safety

This valid common frontend defect stops API-REV-024 before production builds and real browser/provider execution. AutoByteus, Codex, Claude, restore/restart, and standalone runtime rows are `Not Tested` in this round. No test server, frontend server, browser, vault import, migration process, or database was started. The operational home-folder database was not inspected or targeted, and the protected `127.0.0.1:60004` / `31004` stack was untouched.
