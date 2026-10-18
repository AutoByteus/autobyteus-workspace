# API/E2E Test Review Report — delegated-copies-slow-open

## Review Meta

- Review Round: 2
- Trigger: round 1 — API/E2E Pass (API-REV-001), durable test commit `2a53bc59d0`; round 2 — API/E2E Pass on the merged state (API-REV-002, DR-001 integrated rerun), durable test commit `06faf2b346`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: through the design spec (no new reading needed)
- Solution Revision Record Reviewed As Context: SR-004 (no change since CRR-001)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: N/A (baseline probes unchanged)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002 (unchanged)
- Implementation Revision Record Reviewed As Context: IR-001, IR-002 (product code unchanged since `2cb21ab41e`)
- Original Code Review Report: `code-review-report.md` (CRR-003, round 2 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: DR-001 (trigger of the integrated rerun)
- API/E2E Result: Pass
- Final Validation Confidence: 95.0% (round 2)
- Prior unresolved test-review findings rechecked: None open (round 1 had no findings; note N-1 unchanged)
- Project testing guideline(s) applied: `TESTING.md` (root), as recorded in the coverage investigation. No conflicts with this skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-005, MP-001; AC-004's failure alternate for L-011)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Added | SCN-003; REQ-004, AC-009, D-3, R-B | `agentRunCollaborationMemberFileChanges` over real GraphQL on hubs made by real Agent roots: live list while running, stored list after stop, rejections | Gated `RUN_AGY_FAILURE_E2E=1`, like the other scripted-AGY suites; disposable HOME |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | Supports the above | Additive `GENERATE_IMAGE:<path>` directive that streams the own-MCP `generate_image` step shape | Existing suite still passes with it (API-12) |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Added | SCN-001..SCN-004; AC-001..AC-008, QR-001/QR-002, FU-4, CAND-003 | Large-hub seed (public APIs + scripted AGY) and per-build measurement and live journeys on a probe-owned stack or an isolated desktop instance | 810 lines, one coherent surface |
| `autobyteus-web/package.json` | Updated | REQ-008 | Script `test:e2e:delegated-copies-large-hub` | — |

- No durable test file changed: `No`

### Round 2 Change (`06faf2b346`)

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Updated (+17/−4) | REQ-008 / AC-008 seed; OBS-1 observation | The seed's "hub log complete" wait, `messageLogObservation` and `hubMessageLogBytes` read the merged base's append-only hub log instead of `communication_messages.json` | Reader mirrors `run-history/store/message-log.ts#read`: sealed `communication_messages_<6 digits>.jsonl` in index order (zero-padded, so name order = index order), then `_active.jsonl`; only `\n`-terminated lines; first occurrence per `messageId`. Nothing else in the probe changed. Proven by a fresh full seed: `storedReports: 250`, `storedFiles: ["communication_messages_active.jsonl"]` (`evidence/R2-API-04-seed/probe-output.txt`) |

Round 2 checks: scenario and intent unchanged; the reader reads the server's real layout rather than an assumed one, on test-owned data only; no stale reference to the old JSON path remains in the probe. A strict server reader throws on an invalid complete line while the probe's `JSON.parse` also throws, so a corrupted test log fails loudly in both. Calling `hubLog()` three times in one observation is redundant but harmless for a seed step.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Server E2E: three named cases (running, rejections, stopped). Probe: case IDs `S-API`, `S-00n`, `S-ROWS`, `L-001..L-011`, each with a requirement-tagged description; header documents seed/measure modes |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Server: exact entry shape, equality with the generic query, the server-written `file_changes.json`, hub-scoped error text. Probe live cases assert AC-007 request counts (L-002), the queued input after opening (L-004), status agreement (L-008), the failure/retry alternate (L-011), and Task locate under 5 s (L-006). See note N-1 on the `S-00n` cases |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Server test reuses `collaboration-root-harness` and `until`; probe has local helpers (`runCase`, `timedClick`, `coldOpenWorkspace`, `opsSince`) used throughout |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Server: own harness, disposable HOME restored in `afterAll`; cases share one `beforeAll` and run in file order by design (stop is last). Probe: free ports, fresh output dir enforced, copied seed per run, private HOME, cleanup receipts incl. port-closed checks; Nuxt warm-up outside measurements |
| Large files remain coherent and navigable | Pass | The probe covers one surface (a large hub) with sectioned code |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | The skip is the standard environment gate, documented in the file |
| Coverage agrees with the coverage investigation and execution evidence | Pass | API-02 log (server E2E), API-05/06/07/11/15 evidence and timing summary match the cases |
| Test callers and fixtures exercise an independently established scenario | Pass | Every case maps to an approved scenario or AC; L-011's network failure exercises AC-004's explicit failure outcome |
| Each test enters through the real trigger and follows the real steps | Pass | Hubs, delegations, Teams, Tasks, messages and unrelated runs are created through public GraphQL/WebSocket APIs and scripted AGY turns, not file writes; journeys use real row clicks, the composer, Task locate and reloads. L-004's queued input comes from a second client, which a reload or second window produces in real use |

Note N-1 (non-blocking, no finding): the `S-00n` cases record `opsUntilRows` and the T-3 request counts but do not assert them, because the same cases must also run on the base build. The probe header calls this the regression check, so a regressed build would still report `Pass` there. REQ-008's guard does not depend on it: `agentRunCollaborationLazyChildren.spec.ts` (5 vs 50 Teams; one view request, zero member requests) asserts it in the normal web suite, and the live probe cases assert the open counts. A future edit could assert the counts when `--label` is not `base*`, as L-010 already does.

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| TFU-1 (OBS-1) | A running hub's live collaboration view lists only part of its stored message log (e.g. 11 of 252 messages) | `evidence/OBS-1-live-view-message-gap.txt` | The base build `5ceb43039a` behaves the same; no acceptance criterion of this ticket depends on it | Find why a running standalone hub's live collaboration view (snapshot) carries only part of the stored hub message log, and make the live view's Team-tab messages match the stored log |
| TFU-2 (OBS-2) | A hub click issues `GetAgentRunCollaboration` twice on the fix build (once on base): one extra ~2.7 MB view per hub click | `evidence/OBS-2-hub-click-double-view-request.txt` (base vs fix request logs) | The second trigger comes from code this ticket did not touch (likely `useAgentRunCollaborationSync` / `syncHost` firing twice on host selection while the store dedupes only an inspection in flight). The base's slow staging absorbed it; the fix's 50 ms inspection exposes it. REQ-002/AC-003 and QR-002 are met (hub click → conversation 350–390 ms), so the ticket works without it | Find the duplicate `syncHost`/`inspect` trigger on standalone-run selection (`useAgentRunCollaborationSync`, `agentRunCollaborationStore.inspect`) and make one hub selection read the collaboration view once; add a request-count assertion |
| TFU-3 (OBS-3) | A copy whose messages are 60 KB single unbroken tokens takes ~86 s of client-side processing when opened | `evidence/OBS-3-unbroken-token-conversation.txt` | The base build froze on the same content; the rendering/processing path is outside this ticket | Profile client-side conversation processing/rendering for messages made of very long unbroken tokens and remove the super-linear step |
| TFU-4 (from the implementation handoff) | `autobyteus-web/generated/graphql.ts` is behind the server schema (`Delegated*` types and mutations, `defaultLaunchConfig` fragment fields); only this ticket's query was spliced in | `implementation-handoff.md` → Environment Or Dependency Notes (Codegen) | Pre-existing drift unrelated to this ticket | Regenerate `autobyteus-web/generated/graphql.ts` from the current server schema (printed in-process, not from a running user app) and fix any resulting type errors |

- Sent to: `/project_task_manager` (the "Requested by" agent in the requirements doc), one message for TFU-1..TFU-4 on 2026-10-18; recorded as Tasks autobyteus-161..164. Round 2: no new follow-up (OBS-1 still reproduces on the append-only logs, 14 of 252 messages, already autobyteus-161).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four round-1 paths; round 2: `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` (`06faf2b346`)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: round 2 (CRR-004) Pass; the probe change is correct and minimal. N-1 is an optional improvement, not a finding. The code-review report's CAND-006 rationale was factually corrected in CRR-002 (see the revision record); the correction does not change CRR-001's result.
