# Handoff Summary — delegated-copies-slow-open

## What Changed For Users

- **Rows appear right away.** A standalone Agent run with many delegated copies (for example, a Project Task Manager hub with 50 Teams) now shows its copy rows right away. They come from one view request per hub, not two requests per copy. On the 50-Team / 300-agent fixture, rows took 7.3–9.1 s on the base and take about 50–70 ms on the fix.
- **A copy loads when opened.** Opening a copy loads only that copy, with exactly 1 projection request and 1 artifact request, and takes about 60 ms. Reopening it makes no requests.
- **Live behavior is unchanged.** Live status, a copy's complete conversation (including output it produced before being opened), sending to a copy (which wakes a stopped one), held or queued input, and new delegations all behave as before.
- **Load failures are recoverable.** A failed load is logged with the hub and copy; selecting the copy again retries.

## Classification And Route

- `task_size=Medium`, `architectural_risk=High`
- Route: reviewed. Architecture review → implementation → source review (CRR-001, CRR-003) → API/E2E (API-REV-001, API-REV-002) → test-code review (CRR-002, CRR-004) → delivery.

## Integrated State

- Ticket branch `codex/delegated-copies-slow-open`. Integration merge `6507c08527` merges `origin/personal` @ `2763e7c678` (IR-002, after the DR-001 blocker). Product code is unchanged since `2cb21ab41e`.
- Integration method: `Merge`. Checked base revision: `origin/personal` @ `2763e7c678`, re-fetched at DR-002 start; it had not moved.
- Post-integration checks:
  - API-REV-002 on the merged build: all AC-001..AC-009 re-proven, 95.0%.
  - Delivery reruns on `d16d8a8103`:
    - web collaboration / run-hydration specs: 21 files, 173/173;
    - server ticket GraphQL E2E plus `standalone-agent-run-root` unit tests: 7 files, 45/45.

## Verification

- Verified from the evidence; no user check was needed. The table is in `release-deployment-report.md` (Verification).

## Release Decision

- `No release`. None was requested, and that is the `RELEASE.md` default. The change ships with the next beta or stable release.

## Known Residuals (accepted, documented)

- CAND-003: an actively streaming copy could use up its three load retries. Not reproduced (L-009).
- R-004: up to two loads when a copy is opened under a hub that is not the selected run (L-005).
- R-E: there is no separate loading UI while a copy loads.
- The desktop shell was not rerun on the merged state; the merge changed no shell code.
- Follow-ups already filed: FU-1..FU-4, and TFU-1..TFU-4 = autobyteus-161..164. OBS-1 is tracked as autobyteus-161.

## Durable Artifacts

- Docs sync: `docs-sync-report.md`
- Delivery: `release-deployment-report.md`, `delivery-revision-record.md`
- Validation: `api-e2e-execution-coverage-report.md`, `evidence/`
