# API/E2E Revision Record — agy-docker-node-availability-diagnostics

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / `implementation-handoff.md` / round 1 | SR-003, IR-001 | N/A | Blocked / 94.3% (AC-006 completion leg: external Antigravity quota) |
| API-REV-002 | implementation_engineer / IR-002 (`56b11aeae`) / round 2 | SR-003 (SR-004 pending), IR-002 | Blocked / 94.3% | Blocked / 94.3% (sign-in text re-confirmed; AC-006 still quota-blocked; Requirement Gap record for the new text) |
| API-REV-003 | API/E2E (LIVE-006 re-run after quota reset) + user verification / round 3 | SR-005, IR-002 | Blocked / 94.3% | Pass / 96.1% |

## Revision Entries

### API-REV-001 — Baseline: Docker-node live validation; durable GraphQL E2E added; AC-006 run completion blocked by provider quota

- Triggering role, report path and round: implementation_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/implementation-handoff.md`, round 1.
- Triggering finding or case IDs: N/A (initial).
- Related revision IDs: SR-003 (design), IR-001 (implementation `87b246c7d`); ARCH-REV / CRR / DR: N/A.
- Why recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` (API-001). All existing relevant tests are `Still Valid`.
- Cases: API-001, REPO-001..004, LIVE-001..008, DOCS-001. LIVE-006 was widened to five models after a quota error. LIVE-008 was corrected after run-1: its "AGY is current runtime" premise is not reachable, because New chat falls back when the last-used runtime is disabled.
- Commands and environment: see the execution report. The test-owned Docker node ran the user nodes' image with this branch's server `dist` mounted read-only (whole-`dist` diff = only the changed module). It used the real `agy` 1.3.3, a sign-in token streamed from node 8001's container, Nuxt dev and headless Chrome. Everything has been cleaned up.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, this record.
- Prior result and confidence: N/A
- Current result and confidence: `Blocked`, 94.3%. Every changed behavior passes, live included. AC-006's "run streams and completes" was not observable: the only signed-in Antigravity account returns `429 Individual quota reached` on every model.
- New or remaining failure IDs: none (no `Fail`).
- Recommended owner: the user, for the external dependency (quota reset or another account, or explicit acceptance of the residual). The API/E2E engineer reruns LIVE-006 when that is available.
- Remaining risks:
  - successful AGY turn not observed (unchanged code path);
  - Electron shell not exercised (no shell change);
  - RSK-001 upstream wording drift (accepted).

### API-REV-002 — Re-confirm the shortened sign-in reason (IR-002)

- Triggering role, report path and round: implementation_engineer, `implementation-revision-record.md` IR-002 (commit `56b11aeae`), round 2.
- Triggering change: `AGY_SIGN_IN_REQUIRED` message is now "Not signed in on this node. Run `agy` to sign in." (user's choice); only that string and its expectations/doc quotes changed.
- Coverage decisions: unchanged. `agy-runtime-availability-graphql.e2e.test.ts` now expects the new text; the implementation updated the expected string and I re-verified it. The probe's expected text was made configurable (`AGY_SIGN_IN_TEXT`, default = new text).
- Cases rechecked: API-001, REPO-001..004, LIVE-001, LIVE-002, LIVE-003, LIVE-004, LIVE-005, LIVE-007, LIVE-008. All Pass. There was one unrelated Grok unit timeout under heavy machine load; it passes 5/5 on rerun. LIVE-006 was not re-run (quota).
- Environment delta: fresh test node from the same image with the `56b11aeae` server dist, mounted read-only.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| LIVE-006 (AC-006 completion) | Blocked: external quota | Unchanged; awaiting the user's decision (SR-004) or a quota reset | round-1 `live/run-2/` |

- Canonical artifacts updated: investigation (round 2, Requirement Gap row), execution report (Round 2 delta, latest result), ledger (events 17–22), this record.
- Prior result and confidence: Blocked / 94.3%
- Current result and confidence: Blocked / 94.3%
- New or remaining failure IDs: none
- Recommended owner: Solution Designer. It holds the AC-006 user decision, and should record the new text in REQ-001/SCN-001/DEC-005 and the design.
- Remaining risks: AC-006 completion leg; Electron shell not exercised; RSK-001 wording drift.
- Status note (no new validation round): the Requirement Gap was resolved by the Solution Designer as SR-005. The requirements and design now carry the new text, verified. LIVE-006 is on hold until the user's SR-004 decision.

### API-REV-003 — AC-006 proven after the quota reset; final Pass

- Trigger: the provider's Gemini quota reset (≈ 2026-10-13 04:50 local), and the user's report that the fix works in the isolated desktop app.
- Related revision IDs: SR-005 (requirements and design, new text), IR-002 (`56b11aeae`).
- Cases rechecked: LIVE-006 only. Real Antigravity run on a fresh test Docker node with `gemini-3.8-flash-low`: reply `PONG-7731` streamed in 5.2 s, status Idle, projection has the assistant reply, run `runtimeKind=antigravity_cli`. Pass.
- Coverage decisions: unchanged.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| LIVE-006 (AC-006 completion) | Blocked: external quota | Resolved: Pass after the quota reset; no residual-risk acceptance needed | `api-e2e-evidence/live-r3/run-1/` |
| Requirement Gap: sign-in text not in the approved basis | Requirement Gap | Resolved by SR-005 | requirements-doc.md, design-spec.md |

- Canonical artifacts updated: execution report (Round 3 delta, final scorecard, latest result), ledger, investigation meta, this record.
- Prior result and confidence: Blocked / 94.3%
- Current result and confidence: **Pass / 96.1%**
- New or remaining failure IDs: none
- Recommended owner / next: delivery_engineer (direct low-risk route; test-code review Not Required)
- Remaining risks: RSK-001 upstream sign-in wording drift (falls back to the generic text, accepted); the Electron shell was exercised only by the user's manual check (no shell code changed).

