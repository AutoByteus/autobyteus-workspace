# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | API/E2E Engineer / initial execution round 1 | `RER-002`, `IR-001` | `N/A` | `Pass / 98%` |

## Revision Entries

### API-REV-001 — Initial provider, transport, replay, live, and browser baseline

- Triggering role, report path, and round: API/E2E Engineer; `/home/autobyteus/workspace/autobyteus-workspace/tickets/in-progress/codex-command-failure-detail/api-e2e-execution-coverage-report.md`; round `1`
- Triggering scenarios: `SCN-001/002/003`, `API-SCN-001/002/003/004`, `BE2E-CODEX-FAIL-001/002`
- Related revisions: requirements `RER-002`; implementation `IR-001`; architecture/source-review/delivery revisions `N/A — direct initial route`
- Why recorded: first completed API/E2E result for package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901`; no prior result or confidence may be inferred.
- Coverage decisions/durable paths changed:
  - added `autobyteus-server-ts/tests/integration/agent-execution/codex-command-failure-transport.integration.test.ts`
  - updated `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
  - updated `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts`
  - added `autobyteus-web/tests/e2e/fixtures/codex-command-failure-detail.page.vue`
  - added `autobyteus-web/tests/e2e/codex-command-failure-detail-probe.mjs`
  - updated `autobyteus-web/package.json` and `autobyteus-web/README.md`
- Scenarios added/rechecked: cross-transport standalone/Team equality; current writer/local GraphQL replay; real App Server exit-23 failure/persistence/idle; desktop and 390px center/Activity rendering; precedence/fallback and adjacent regression suites.
- Command/environment delta: built workspace contracts; ran focused and broader server Vitest, focused Nuxt Vitest, Prisma/source compilation, an env-gated Codex 0.152.0 live test, and a self-starting Chromium 149 probe with owned cleanup.

#### Prior Failure Resolution

None — `API-REV-001` is the initial baseline. Test-harness failures encountered inside this round were resolved before the authoritative pass: standalone raw source fields are legitimate extras; GraphQL singleton lifecycle became test-owned; the replay conversation shape assertion was aligned to its public fields; the live bootstrapper fixture was aligned to the current constructor; browser selectors/interactions were corrected. Attempt evidence is retained under the ticket probe directory.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; `probes/api-e2e/` evidence.
- Prior result/confidence: `N/A`
- Current result/confidence: `Pass / 98%`
- New or remaining failure IDs: none for this package. An unrelated pre-existing live steered-input assertion remains a separate baseline test-maintenance issue and is not a package failure.
- Recommended recipient: `/software_engineering_team/delivery_engineer`, subject to `get_handoff_rules`
- Remaining risk/untested scope: no material release blocker; no fully live model-driven Team-to-full-routed-UI duplication, no Electron shell run because those changed seams are directly proven/inapplicable respectively.
