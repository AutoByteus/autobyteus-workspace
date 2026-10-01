# API/E2E Test Review Report — cross-scope-agent-mentions

## Review Meta

- Review Round: 2 (re-review of TR-001; round 1 = CRR-006, Fail)
- Trigger: API-REV-003, the TR-001 Local Fix (test code and counts only). Round 1 was triggered by API-REV-002, which passed on IR-004 @ `bcff48200` (SR-010).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-008, including REQ-014/AC-016)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-010)
- Supplemental Task Artifacts Reviewed As Context: SR-008 UI spec `…/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-004)
- Original Code Review Report: `code-review-report.md` (round 5 Pass, CRR-005)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (round-2 section)
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (round 2, authoritative)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002, API-REV-003)
- Delivery Revision Record Reviewed As Context: `N/A`
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: TR-001. Resolved; see Findings.
- Supported Product Scenario Basis Confirmed: `Yes`. The scenarios are UXJ-001–005, AC-003–016, RS-003 (host crash, then cleanup) and AC-013 (preserved).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Added (API-REV-001), rewritten (API-REV-002) | AC-003/004/005/006/011/012/014/015/016; DI-001 | Live standalone collaborator journey per runtime (gated `RUN_*_E2E`), plus the collaborator-Team authored-handoff case | One long journey per runtime is justified by live setup cost. The steps are commented with AC IDs. |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Added (API-REV-001), rewritten (API-REV-002) | UXJ-001–005, VIS-001–015, AC-006/008/011/013/016, RS-003 | Real browser → Nuxt → backend → runtime probe with 14 ordered cases (A01–A05, T01–T02, O01–O02, F01, L01–L02, P01, N01) | Large but coherent: one surface, with case IDs and a producer/prerequisite map. See TR-001. |
| `autobyteus-web/package.json` | Updated | — | `test:e2e:cross-scope-agent-mentions` script | Fine |
| `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | Updated | CR-001/CR-002 path (`terminateAgentRun` ends the root first) | The stale `lifecycleService: {}` stub now provides `terminateCollaborationRoot` | Minimal and correct; the comment explains it |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` | Updated | REQ-012 (always-on tools attach Agent Tools MCP) | The obsolete `mcpServers: []` assertion now expects the Agent Tools entry; the fake reports MCP ready | Requirement-aligned and documented |
| `autobyteus-server-ts/tests/fixtures/grok-acp/fake-acp-agent.mjs` | Updated | REQ-012 | Opt-in `FAKE_ACP_REPORT_MCP_READY` emits the real CLI's `server_status` notification for configured servers | Opt-in, so other replays are unchanged |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-improver-session-service.test.ts` | Updated | REQ-012 helper exclusion | Asserts `launchPurpose: "server_helper"` | Fine |

- No durable test file changed: `No`
- No removals.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The server `it` titles name the journey and DI-001. Probe cases carry IDs plus titles with AC/VIS references. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions cover entry identities and launch settings at the ack, Offline status, no delivery before the turn, briefing and report as communication messages, `inter_agent_message` first with no task notice, same run IDs after Stop, extra copy with the task notice, and candidates. In A01, DI-001 is honestly recorded as an observation; the server E2E asserts it deterministically. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared `gql`/`waitFor`/`poll`/`sendTurn` helpers; probe page helpers keyed on the product's `data-test` attributes; one seeding step |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Owned temp data roots, free ports, sanitized env and full cleanup. Live tests are gated per runtime and use polling with bounded timeouts. Probe case dependencies are explicit (`NEEDS`/`PRODUCER`). |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | Both files cover one feature surface, organized by case ID |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The stale Grok `mcpServers: []` and lifecycle stub were updated, not disabled. The SR-007 collaborator tests were already replaced in IR-004. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass (round 2) | The runner records `Not Applicable` with its reason (lines 1042–1044), prints it, excludes it from the pass count and adds `evidence.summary`. The coverage report now reads "12 Pass + 2 Not Applicable (L01/L02) on Claude; L01/L02 Pass on AGY" (lines 70, 190, 226). Re-run evidence `r2-browser-tr001/`: summary `{pass:1, fail:0, notApplicable:1}`, L01 `Not Applicable`, N01 `Pass`. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | P01 deletes `collaborators` from stored trees to reproduce the released-build shape (a real predecessor). A04 reproduces a pre-RD-004 trace without `sender_id`. F01 uses the real Settings change to make the model unavailable. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Browser `@` menu and composer sends, real stream SEND_MESSAGE with `mentions`, GraphQL Stop/Delete/Archive, real runtime process kill for the host-crash cases, and a real backend restart |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 (Low) — **Resolved (round 2, API-REV-003)** | `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs`: F01, L01, L02 when their environment is absent | Case bodies return `{ notApplicable }` (lines 728, 820–821, 851, 913). The runner then records `result: 'Pass'` (line 1042), prints `Pass` and counts the case toward the total. So a Claude run reports L01/L02 (and F01 without LM Studio) as passed although nothing ran. The coverage report's "14/14 Pass (Claude)" inherits this; its notes column admits L01/L02 were not applicable. | Record a distinct `Not Applicable` result (with the reason) for a case that returns `notApplicable`, print it as such, and keep it out of the pass count without failing the exit code. Correct the coverage report rows to state run versus not-applicable counts per runtime (for example "12 Pass + 2 Not Applicable on Claude; L01/L02 Pass on AGY"). Re-run one quick case selection to show the new output (for example `--cases N01,L01` on Claude). | `Local Fix` → `/software_engineering_team/api_e2e_engineer` |

Optional, non-blocking (round 1): `void execFileSync` was removed in round 2. The import is kept because the crash cases use `execFileSync` (line 812), which is correct.

## Round 3 — Evidence Addendum (API-REV-004, real Electron instance)

- Trigger: the user asked for real tests in an isolated Electron instance. API/E2E ran D0–D3, BI-1…4 and RESTORE + RS-1…4 on Claude `haiku` with the public agent package. The result is Pass at 96%.
- Durable test scope: unchanged since API-REV-003, verified with `git status`; the 7 paths are the same. The driver `api-e2e-evidence/r3-desktop/desktop-journeys.mjs` is a temporary evidence driver, not durable test code, so it is not reviewed as a test. The test-code result stays `Pass`.
- Reviewer check of the evidence:
  - `desktop-journeys-report.json`: every final phase passed, with 0 page errors.
  - The four `*-error.png` files (D1, D2b, SNAP, RESTORE) are earlier driver attempts. `D1-error.png` and `RESTORE-error.png` show correct product states: the collaborator Team added Offline and briefed, and after restart the collaborator rows remain with "From Product Prototyper:" on replay. They point to driver timing, not product failures. The coverage report does not say this explicitly; it should state that the attempts were driver retries.
  - Raw `solution_designer`-style names on configured Team members after restore are pre-existing configured-member naming (F-03 covered collaborator surfaces), so not a finding.
- **OBS-D3: resolved, not a product issue.** The user confirmed they clicked the desktop UI manually during D3, which explains the view change; all desktop checks pass. The original hold note is kept for history:
  - **OBS-D3 (Hold for Evidence, `Unclear`).** During D3 the focused view moved from delivery engineer to marketing content creator without a click. It was seen once, not reproduced, and its cause is not established. There is not enough evidence to classify it as a product defect, so it drives no finding. Carry it to delivery as an open observation; if it recurs, run a failure-origin review.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 7 paths above (2 added, 5 updated, 0 removed). Round 2 re-checked the probe change.
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer` (round 3: unchanged, with the API-REV-004 evidence; OBS-D3 was explained by a manual user click and is closed)
- Notes:
  - TR-001 is resolved.
  - The source review stays Pass (CRR-005), and API/E2E stays Pass at 95% (API-REV-003).
  - The worktree holds API/E2E's uncommitted durable test files plus the uncommitted ticket folder, for delivery to finalize.
