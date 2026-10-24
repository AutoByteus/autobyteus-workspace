# API/E2E Test Review Report — node-vocabulary (autobyteus-290)

## Review Meta

- Review Round: 1
- Trigger: API-REV-001 Pass (95%) on code `127fc4806e`. API/E2E commits: `b631d63023` (baseline probe fixes), `383b1500a2` (coverage), `149c350dce` (reports and evidence). Large/High, so a proportional test-code review is required.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-901 … 905, REQ-906, REQ-911, REQ-913)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: SR-008
- Design Spec Reviewed As Context: `design-spec.md` (§ Stored Names Migration, § Hold-back chains)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-002 … FU-007), `GLOSSARY.md`
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-006
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- API/E2E Result: Pass.
  - **API-01:** two-server E2E 37/37 (run 2).
  - **API-03:** upgrade E2E 3/3, and again from a fresh clone (API-10).
  - **API-04:** a temporary probe of a real upgrade from released `c78ffb15a2`, 27/27.
  - **API-05:** the node-vocabulary browser probe, 5/5.
  - **API-07:** the packaged desktop app over a released list.
  - **API-08:** the iOS simulator and Android emulator over the released keys.
  - **API-06:** renamed probes, with one pre-existing failure (FU-005).
  - **API-09:** the word list.
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: the worktree's `TESTING.md` (as the coverage investigation records), including § Browser probes on harness noise. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-V1, SCN-V2, AC-905, REQ-906's exception)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/node-vocabulary-stored-names-startup.e2e.test.ts` | Added (383) | AC-903, AC-905, REQ-911, REQ-913 | A node upgraded over released data, between two real built servers | NV-01 … NV-03 |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` (+ `package.json` script) | Added (379) | SM-7, SM-8, REQ-913 UI, REQ-910 label | The window over released browser data, held-back states, the label | NVP-01 … NVP-05 |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (+13) | REQ-906 exception | RC-26: an agent selecting only `list_available_nodes` gets no discovery tool and keeps `delegate_task` | — |
| `autobyteus-web/tests/e2e/remote-run-title-probe.mjs` | Updated (baseline) | — | `addPeerNode` sends `nodeId` (one-nodes-tab contract) | Baseline fix |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` | Updated (baseline) | — | Vite re-optimization noise treated as harness; re-type when the composer re-mounts | Baseline fix; see note 1 |
| `autobyteus-web/tests/e2e/task-agent-sibling-sidebar-probe.mjs` | Updated (baseline) | — | Answers `getTeamMemberFileChanges` (since 278) and routes the update-notifications socket (since 210) | Baseline fix |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | NV-01 … 03 and NVP-01 … 05 name their requirements; the header explains how the released data is made |
| Assertions prove approved requirements | Pass | **NV-01:** the same node IDs, `node-identity.json` equal to `{nodeId, createdAt}` of the released file, one backup each, no `serverInstanceId` / `compatibilityVersion` on the wire, peers recognized both ways (offer and availability), the hub authenticates the same `memorySyncSourceId`, only the new file is synced into the same import, and a third start leaves every stored file's hash unchanged. **NV-02:** 503 with the exact body, no new identity file, the damaged file byte-identical, a log line naming it, refusals both ways with `NODE_IDENTITY_NOT_MIGRATED`, the rest working, then restored and migrated. **NV-03:** ingestion 503, reads refuse with the text, only local memory listed, the file untouched, then restored and migrated and syncing again. **RC-26:** the former tool name selects nothing, and other tools stay |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `paths`, `toReleasedIdentity`, `toReleasedMemorySync`, `storedState`, `forgetMigrations`, `migrationStatus` (E2E); `recordError` with phase, `redact` (probe) |
| Isolation and determinism | Pass | Temp roots removed in `afterAll` / `finally`; servers SIGTERM, then SIGKILL; the probe records `cleanup`. The shared two-node sequence in NV-01 … 03 is declared in the header. `sqlite3` is a documented prerequisite |
| Large files coherent | Pass | One surface each |
| No stale/duplicated/compat-only tests | Pass | The baseline fixes realign probes with contracts that changed in earlier tickets (one-nodes-tab, 278, 210); each is commented |
| Coverage agrees with investigation/evidence | Pass | `API-03-run3.log`, `API-05-run4/node-vocabulary-probe.json`, `API-04/api04-released-upgrade.json`. The last shows converted keys equal to what this build writes fresh, which supports the E2E's synthesized released shapes |
| Callers exercise an established scenario | Pass | The released data comes from a real pairing and sync through public APIs, then is turned back to the frozen released names. The migration records are removed, as a released build never ran them. API-04 covers the real released-build upgrade independently |
| Real trigger, no setup real use doesn't produce | Pass | Synthesizing released files from current ones is the documented reproduction of an upgrade, backed by API-04's real one. The damaged files stand for REQ-913's explicit edge |

## Findings

None.

Non-blocking notes (no action required for this ticket):
1. **Generic Nuxt error filter in two remote probes.** The baseline fix in `remote-runs-in-tree-probe.mjs` (and the same filter in the other remote probe) accepts Nuxt's generic "error caught during app initialization" anywhere in the run. That would also hide a real initialization error. Tie it to a run where the "504 (Outdated Optimize Dep)" line also occurred, or to that error's cause. The probes' UI assertions would still catch a broken app, so this is not blocking.
2. **Loose "states the reason" check in NV-03.** It matches `/MEMORY_SYNC_NOT_MIGRATED|waiting for its data migration|503/`, where a bare `503` would pass for any 503. The other NV-03 assertions pin the exact 503 body.
3. **Unscoped 503 filter in the node-vocabulary probe.** Its expected-error filter accepts `503 | Service Unavailable` in every phase. It is narrow in practice, because the probe produces 503s on purpose, but it isn't scoped by phase like its other harness rules.

## RC-12 (FU-007): Judgment

- **Observation:** RC-12 (247 AC-304, idle shutdown and restore) timed out once in six runs; the latest full run passed 37/37.
- **Origin check:**
  - This ticket's change in the path is `PeerClient.call`. It moves the own-node-ID lookup ahead of the request and adds the hold-back refusal; the request keeps its time-bounded `fetchJson`.
  - The hang outlasted a bounded wait until beta restarted, while beta answered other requests.
  - Nothing in this ticket's diff removes a bound or adds an unbounded await on that path.
- **Decision:** a pre-existing intermittent problem, not shown to come from this change, and no in-scope AC fails because of it (AC-902's suites pass). It stays the recorded follow-up **FU-007**; no failure-origin review now.

## Follow-ups

- Follow-ups this review added: None. API/E2E recorded FU-004 … FU-007.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the six listed above, plus `autobyteus-web/package.json`.
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Release note: "`list_available_nodes` is now `list_peer_nodes`; agents that use it need the new name selected."
  - AC-904 is the user's check.
