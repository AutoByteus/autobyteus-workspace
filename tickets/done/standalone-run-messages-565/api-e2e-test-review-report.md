# API/E2E Test Review Report — standalone-run-messages-565 (autobyteus-565)

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 1 (API-REV-001) Pass. Tests in `bae91e808f`; documents and evidence in `cde58e8ca6`. Code under test: `5b45e9222b`, with no `src` change after `ffec4d785d`/`143edb93f8`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001 … REQ-007, AC-001 … AC-006, DEC-001 … DEC-005)
- Investigation Notes Reviewed As Context: not reopened (not needed)
- Solution Revision Record Reviewed As Context: not reopened (SR-004 unchanged)
- Design Spec Reviewed As Context: `design-spec.md` § Concrete Examples (forms 1–7), § Paging Order
- Supplemental Task Artifacts Reviewed As Context: None (none exist)
- Architecture Review Revision Record Reviewed As Context: N/A for this review
- Implementation Revision Record Reviewed As Context: IR-001 (no change since)
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.4%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md`:
  - server E2E and gated runtime layers;
  - browser probes against a probe-owned real stack, and the phone bundle for phone behavior;
  - old-release data synthesized small, in test-owned data roots.
  - Conflicts or discrepancies: none found.
- Supported Product Scenario Basis Confirmed: `Yes`. UC-001 … UC-004 and REQ-006 (forms 2, 4, 5, 6, 7, and older lines per AC-006).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (+RC-50; RC-05, 06, 08, 20, 47, 48 updated; log helpers, page helpers) | AC-002 … AC-006, REQ-002 … REQ-007; forms 4–7 | Remote collaboration between real servers | Old-rule assertions (G-1 "unrelated in no view", seven-field lines, `pastParticipants`) rewritten to the approved rule |
| `autobyteus-server-ts/tests/e2e/node-access/node-access-model.e2e.test.ts` | Updated | Wire contract (`sender.address`) | Node access gate | Body now valid for the gate to judge credentials, not shape |
| `autobyteus-server-ts/tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` | Updated | REQ-006 (past participants) | Startup after upgrade | `pastParticipants` → `counterparts` with `kind: "past"` |
| `autobyteus-server-ts/tests/e2e/helpers/built-studio-roots.ts` | Updated | Page shape | Shared helper | Type follows the new DTO |
| `autobyteus-web/tests/e2e/standalone-messages-probe.mjs` | Added | AC-001 … AC-004, DEC-001/003/004 | Desktop Messages of a standalone run on a real two-node stack | SMP-01 … SMP-04 |
| `autobyteus-web/package.json` | Updated | — | Probe script entry | `test:e2e:standalone-messages` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (MSP-08) | AC-001 … AC-004 on the phone bundle | Phone shell | "No Messages for a standalone agent" replaced by the approved menu, chip and paging |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` | Updated | REQ-006 | Team/Org lists | Asserts these lists fit one page, so it fails loudly rather than comparing a page with the whole tab |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Updated | Page shape | Live probe's message reader | Reads every page |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Updated (L-012) | DEC-003, DEC-004 | Large hub probe | Tab "Messages"; first page plus live messages; not run (stale seed, FU-003) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | RC titles name ACs/forms; the probe header lists SMP-01 … 04 with their ACs; the suite header adds a 565 paragraph |
| Assertions prove approved requirements | Pass | Each claim is checked on its own artifact: exact line keys and `counterpart` values on both nodes, exact live parties, `remote` counterparts with the node name, each message live exactly once, and pages of 50 with `hasMore`, no duplicates, the one order and the whole log covered. Old lines are checked by kind; Team lists hold no remote or unrelated rows; desktop/phone rows carry the chip only on remote rows |
| Fixtures, setup, helpers reuse repetition | Pass | `teamTab` gains `before`; `allPages`, `checkPages`, `sendMany` (one turn of `CALL_TOOLS`); the log helpers return the counterparts they assert |
| Isolation and determinism | Pass | The two-server suite stays sequential with shared `ids`, as before. Older lines are appended only to stopped, test-owned runs. The probe owns its servers, data root and cleanup. Bulk sends are 30 ms apart, so send order is the stored order |
| Large files coherent and navigable | Pass | One surface per file; the probe is one journey of four cases |
| No stale, duplicated, disabled or compatibility-only tests | Pass | The old negative assertions ("no Messages for a standalone agent", "unrelated in no run view", the seven-key lines) were replaced by the approved behavior, not dropped. The not-run L-012 is updated and its stale seed recorded (FU-003) |
| Coverage agrees with investigation and evidence | Pass | Two-server 50/50 (`API-06`); probe 4/4 (`API-07`); MSP-08 (`API-08`); large-runs-load-less 5/5; gated helper suites 4/4 (`API-11`) |
| Callers exercise an independently established scenario | Pass | Every case is an approved AC or form. The older-line case reproduces the released log shape (the persisted-data decision in design § Persisted Data) |
| Real triggers and steps | Pass | Agents send through their own `send_message_to` (scripted CLI); the owner opens tabs, clicks Load more and reloads in a real browser at 1440 px and on the phone bundle; stored reads go through GraphQL as the window does. The one synthetic setup, appending old-shape lines to stopped runs, stands for data an older release wrote; that is the only way to produce it |

## Findings

None.

Observations, not findings:
- SMP-04 starts the "Load more while a message arrives" send before the click but does not force the two to overlap. The ordering itself is proven at the server (RC-50) and in the store's unit cases.
- `assertBothLogs`'s `otherOf` takes an unused second parameter.

## Follow-ups

- Follow-ups this review added: None. FU-003, the stale large-hub probe seed, was recorded by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the ten paths above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: UNK-001 is closed by the two-server run. The founder's own PM (2,506 messages, `ryan-ai-linux`) remains his to look at.
