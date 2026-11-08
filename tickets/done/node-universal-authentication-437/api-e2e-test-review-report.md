# API/E2E Test Review Report — node-universal-authentication-437 (autobyteus-437), slice 1

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer, API-REV-002 (Pass, confidence 95%); test commits `960cfc0661` (round 1), `fa6ec192a0`, `8cac59f2d4`, `d115fd9c71`; reports `b51a126ace`; product under test `32e9ad944c`
- Requirements Doc / Design Spec / Contract reviewed as context: `requirements-doc.md` (SR-002), `design-spec.md` (SR-006), `autobyteus-server-ts/docs/design/node_access_model.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003)
- Original Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: `TESTING.md` § Browser probes. It allows a probe-owned backend's credential to be served through the dev proxy or attached in the probe's browser; the probes attach it. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | Added | NA-1, NA-5, NA-8, DS-004 | One owner of a probe's node credential: node env, process attachment, browser-context attachment, owner headers/sockets, pairing by invite, evidence redaction | Strips the credential from non-loopback requests; redacts own/mra/mhub/mcpg, invites, `access_token`, `peerSecret` from evidence |
| Seven round-1 probes (`remote-nodes-page`, `nodes-docker-address`, `mobile-shell`, `remote-run-title`, `remote-runs-in-tree`, `model-routing-decisions`, `node-vocabulary`) | Updated | REQ-006, REQ-010, NAS-19/23, AC-005 | Each keeps its journey; nodes start with the credential and pair by invite | Removed assertions only for removed APIs (`addPeerNode`, `resolvePeerAddress`, `peerAddressCandidates`, one-way register steps); UI cause checks (ND-03) kept |
| 34 probes + `large-runs-load-less-cases.mjs` (`fa6ec192a0`) | Updated | QR-003 (no internal caller breaks) | Mechanical: `withNodeCredential` on each `dist/app.js`, `attachToProbeProcess`, desktop contexts attached, built-in WebSockets via `ownerSocketUrl` | Phone contexts left without the desktop credential (checked: `mobile-shell`, `node-vocabulary`, `owner-scoped-file-reads`) |
| `agent-org-role-labels-probe.mjs` (`8cac59f2d4`) | Updated | pre-existing baseline | Selector `/^View ↗/` disambiguates two buttons | Baseline fix, minimal |
| `memory-search-probe.mjs` (`d115fd9c71`) | Updated | pre-existing timing | Waits for highlighted lines before counting; the check still fails at 0 | Removes a race without weakening MS-PROBE-030 |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Updated | NA-4, DEC-013 | `--allow-local-network` kept across `upgrade --all`; a node without it keeps 127.0.0.1 + Tailscale | Asserts published args and persisted state |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs kept (ND-*, NP-*, MSP-*, MS-PROBE-*); header comments updated to the pairing model |
| Assertions prove approved requirements instead of incidental details | Pass | New expectations name the requirement (NAS-23 "Pair again", DS-004 `['turnOnThere','pair']`, M-9 address choice) |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | One fixture used by 41 probes; reuses `test-support/node-access/owner-credential-attachment.mjs` from the server suites |
| Isolation and determinism appropriate for the boundary | Pass | One random credential per probe process; memory-search race removed by waiting on the element, not a sleep |
| Large files coherent and navigable | Pass | Edits are small and local in each probe |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | Assertions on removed APIs deleted with reasons (report § Durable Coverage); no skips added |
| Coverage agrees with investigation and execution evidence | Pass | API-16 ledger: 18 + 3 pass, 3 fixed, 4 pre-existing failures recorded as FU-003/FU-004 with base-branch evidence, 7 live probes not run |
| Callers and fixtures exercise an independently established scenario | Pass | Credentials stand in for the desktop main process (DS-002) and the owner's pairing (DS-004); the real attacher is proven separately in the packaged app (API-01) |
| Entry through the real trigger, real actor's steps | Pass | Nodes start with the launch credential as the desktop starts its own; epsilon's state comes from pair then remove, which the owner can do; NP-07's numbering follows the naming rule (O-3, accepted in CRR-003) |

## Findings

None.

Notes, not findings: `ownerSocketUrl` carries the owner credential in `access_token` for the probe's own Node WebSockets. That is test-only (Node's built-in WebSocket cannot set a header), and the evidence is redacted. `attachToBrowserContext` attaches to every loopback origin, broader than the Electron attacher's per-node origins; the real attacher is covered by API-01.

## Follow-ups

- Follow-ups this review added: None (FU-003 and FU-004 were added by API/E2E).

## Round 2 (CRR-006): Delivery Re-Entry, API-REV-003

- Trigger: Delivery DR-001 was blocked on the merged state. The merged base (origin/personal `31aa11b241`, merged as `3e85115f6e`; state under test `8a31d5141c`) brought autobyteus-434's phone cases MSP-21…23, whose node-side sockets carried no credential. API/E2E test commit `43e6d41eb0`; no product code changed.
- Changed durable test path: `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs` (Updated; +9/−6)

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Assertions prove approved requirements | Pass | The node's own sockets use `ownerSocketUrl`, the API-16 rule every probe now follows. The "other window" is an owner's window, which carries the owner credential in the product (DS-002). |
| Known-error rule stays narrow | Pass | Only the phone origin's own `/favicon.ico` at the origin root counts, now expected as 401 instead of 404. That is approved behavior: the root path is not exempt and is refused before any route (NA-1, NA-2). Path, origin and status are matched exactly; nothing else is relaxed. |
| Determinism / isolation | Pass | Run 2 on the merged state: MSP-21…23 pass, `mobile-shell probe: Pass`, 0 unknown browser errors, cleanup complete (`R3-API-03-mobile-shell-msp21-23.log`). Run 1 failed only on the old 404 expectation (`…-run1*`). |
| Real trigger and steps | Pass | The phone keeps its own credential; only the probe's stand-in for the owner's second window gained the owner credential. |

- Findings: none.

## Latest Authoritative Result

- Result: `Pass` (round 2, CRR-006; round 1 CRR-005 Pass stands)
- Changed durable test paths reviewed: round 2 `mobile-live-reconnect-cases.mjs`; round 1: the fixture, 7 round-1 probes, 34 probes + `large-runs-load-less-cases.mjs`, `agent-org-role-labels-probe.mjs`, `memory-search-probe.mjs`, the launcher pytest
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: test-side residuals are the 7 live probes, which were not run because they need paid inference or a signed-in CLI, and FU-003/FU-004, which are pre-existing.
