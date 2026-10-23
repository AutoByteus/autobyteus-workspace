# API/E2E Test Review Report — one-nodes-tab

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 2 (`API-REV-002`) Pass; durable test code changed (`8adb0650cb`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006)
- Investigation Notes Reviewed As Context: as cited by the design
- Solution Revision Record Reviewed As Context: SR-006, SR-007
- Design Spec Reviewed As Context: `design-spec.md` (§ Naming Rule, § Loopback Hint Surface, § Run Rules, DS-004)
- Supplemental Task Artifacts Reviewed As Context: `ui-ux-spec.md` (copy and transitions)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003
- Implementation Revision Record Reviewed As Context: IR-003
- Original Code Review Report: `code-review-report.md` (CRR-004, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: Pass (round 2)
- Final Validation Confidence: 95% (API/E2E's)
- Prior unresolved test-review findings rechecked: none (first round)
- Project testing guideline applied: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/TESTING.md`. No conflicts. The probes follow its rules: owned stacks, a clean env for servers, a test-owned container on `127.0.0.1` with no volumes, a read-only `dist` mount with an image-diff receipt, `docker rm -f -v`, and browser errors fail the run.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` | Updated (replaced) | AC-701…710, AC-713, REQ-711/712, § Naming Rule; 267 REQ-503 | The one Manage Nodes list in a real browser against owned servers (NP-01…NP-12) | 705 lines, one surface, navigable (a header lists the cases; one `runCase` per case). The old RNP cases drove the removed tab and input. RNP-09 is narrowed to REQ-503 because DS-001/DS-004 approve window probes. |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` | Added | AC-704, AC-707, REQ-708, REQ-713, § Loopback Hint Surface | Addresses between a host node and a test-owned Docker node (ND-01…ND-05) | 432 lines |
| `autobyteus-web/package.json` | Updated | — | Script `test:e2e:nodes-docker-address` | Follows the existing `test:e2e:*` pattern |

- No durable test file changed: `No`
- `evidence/api-e2e/API-09-electron-journey.mjs` is ticket-owned evidence, not durable code (TESTING.md § headless). Not reviewed as test code.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs mapped to AC/REQ in each header; one `runCase` per case |
| Assertions prove approved requirements instead of incidental details | Fail | Exact approved copy, peers.json on both sides, request audit. But ND-05's name assertion is bypassed by operator precedence (TR-001), and ND-02's stated precondition is not asserted (TR-002). |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `startServer`, `register`, `peersOf`, `line`, `dialogSteps`, `addNode`. The two probes repeat a small harness; that's acceptable for standalone scripts. |
| Isolation and determinism fit the boundary | Pass | Free ports, temp roots, owned frontend and container, cleanup receipts. Timing bounds are generous (theta 19–28 s; fast rows < 8 s); the black-hole copy accepts both the timeout and the unreachable wording. |
| Large files coherent and navigable | Pass | Each file covers one surface |
| No stale, duplicated, disabled or compatibility-only tests | Pass | The old tab's cases are removed; the no-contact assertion is narrowed with its reason |
| Coverage agrees with the investigation and evidence | Pass | API-07 run 5 and API-08 run 1 receipts match the cases |
| Test callers exercise independently established scenarios | Pass | The setup goes through each server's own settings API, as its owner's window would. A server is restarted on a fresh data root (a recreated node, AR-003). A black-hole listener stands in for an unreachable host. The localStorage list is seeded in the release's shape (REQ-711). |
| Each test enters through the real trigger and steps | Pass | The page is driven through the form, the switches, the fixing buttons and the dialog. The NP-07 race uses mu's own API, which is a supported owner action. |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `nodes-docker-address-probe.mjs:339`, ND-05 (REQ-713) | `expect(deskRow.name === 'Embedded Node' && deskRow.url?.startsWith('host.docker.internal:') \|\| deskRow.url?.startsWith('gateway.docker.internal:'), …)` parses as `(name && host) \|\| gateway`. Whenever the URL is `gateway.docker.internal:` (the state the probe's own setup tries to create), the row's name is not checked. Run 1 had `name: "Embedded Node"`, so the behavior held, but the assertion does not guard it. | Parenthesize: `name === 'Embedded Node' && (host \|\| gateway)` (or drop the gateway branch with TR-002). | Local Fix — `api_e2e_engineer` |
| TR-002 | `nodes-docker-address-probe.mjs:324-328`, ND-02 (AC-707 "Use this") | The setup comment says desk's address is changed to `gateway.docker.internal` "so Use this visibly changes it back". In API-08 run 1 that change failed (`PEER_UNREACHABLE`, `timeout`; `gatewayChange.peersAfter` still `host.docker.internal`). The probe records but does not assert it, so ND-02's `peerAfter` equals the starting value and does not show a change. ND-02 still proves Use this through the single `ChangePeerAddress` save with the suggested address (`saves`). | Either remove the gateway setup and its comment, and keep the save-request assertion as the proof; or make the precondition real (an address the container resolves and that answers as desk) and `assert` it before ND-02. | Local Fix — `api_e2e_engineer` |

No source defect is revealed. `remote-nodes-page-probe.mjs` has no findings.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Fail`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs`, `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs`, `autobyteus-web/package.json`
- Unresolved finding IDs: TR-001, TR-002
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: both fixes are test-code only, in `nodes-docker-address-probe.mjs`. After the fix, rerun API-08 (the Docker probe) only; API-03/05/06/07/09 are unaffected. Then this review runs again before delivery.
