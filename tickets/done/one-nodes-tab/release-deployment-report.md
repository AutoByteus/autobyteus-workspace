# Delivery / Release / Deployment Report — one-nodes-tab

## Release / Publication / Deployment Scope

Finalize `codex/one-nodes-tab` into `origin/personal` and publish a beta (the user's decision, 2026-10-23). No hosted deployment exists.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `be315bcf1c` (as merged into `e84a0d6253`).
- Deviations from the guide and why: none from RELEASE.md. One from the generic delivery order: the merge and the beta come **before** the user's AC-711 check. Delivered as option B: the check needs this server code on the user's own Docker nodes, and the user chose to get it through a beta (`autobyteus-docker upgrade --all --tag beta`). Every other acceptance criterion was verified from the evidence before the merge. A problem the check finds is fixed forward in the next beta.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/one-nodes-tab/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: written when this delivery round completes (`DR-001`).
- Current delivery revision ID: `DR-001` (in progress)
- Notes: verification is waiting for the user's AC-711 check.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `ca1f09e52a`
- Latest tracked remote base reference checked: `origin/personal` `be315bcf1c` (fetched 2026-10-23)
- Base advanced since bootstrap or previous refresh: `Yes` (26 commits: autobyteus-269 remote run titles and v1.5.8, autobyteus-259 task comments, a TESTING.md change)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`: `8788ec0e0d` committed the code reviewer's uncommitted CRR-006 records
- Integration method: `Merge` (`git merge --no-ff origin/personal`, `e84a0d6253`)
- Integration result: `Completed`, no conflicts. Files changed on both sides: `autobyteus-server-ts/docs/modules/remote_collaboration.md`, `remote-delegation-two-server.e2e.test.ts`, `autobyteus-web/package.json`; all were auto-merged into separate hunks.
- Post-integration executable checks rerun: `Yes`. Rerun plan (TESTING.md § Rerun by impact):
  - **Validated commit**: `02fd7bcd9a`/`77d2dc27b2`.
  - **Diff since then**: `git diff --name-only 8788ec0e0d e84a0d6253`.
  - **Shared foundations**: unchanged (no lockfile, schema/migration, `autobyteus-ts`, contracts or build config). The only fixture change is `tests/fixtures/task-execution-resource-fixtures.ts` (task resources), which the ticket's cases do not use.
  - **Rerun**:
    - API-06, the two-server E2E: its file and the code it drives changed (`remote-message-receiver.ts`, `remote-collaboration-composition.ts`, `agent-run-service.ts`, `team-run-service.ts` from 269).
    - Server remote-collaboration unit folder: 269 changed `remote-message-receiver`.
    - The typechecks and the server `dist` (rule 5).
  - **Smoke**: the ticket's web specs and guards, run because `generated/graphql.ts` and the localization indexes merged.
  - **Still valid**:
    - API-07 (NP-*) and API-08 (ND-*): they drive the settings operations and `peerNodeOffer`/`peerNodeAvailability`, and no node page, connector, store or settings server code changed. 269's change applies only to an accepted work packet.
    - API-09 (EL-*): no Electron, registry or node code changed.
    - API-05: its suites are unaffected; the merged server suites were green on `origin/personal`.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DLV-01 server typecheck | `pnpm -C autobyteus-server-ts typecheck` | exit 0 | `evidence/delivery/DLV-01-server-typecheck.log` |
| DLV-02 server build (`dist` for E2E) | `pnpm -C autobyteus-server-ts build` | exit 0, bootstrap smoke passed | `DLV-02-server-build.log` |
| DLV-03 server unit, remote collaboration + baseline-fixed test | `vitest run tests/unit/remote-collaboration tests/unit/projects/project-task-index-status.test.ts` | 19 files / 131 tests passed | `DLV-03-server-unit-remote-collaboration.log` |
| DLV-04 two-server E2E (API-06 rerun) | as API-06, `env -i`, resolved temp HOME, `REMOTE_E2E_EVIDENCE_DIR=evidence/delivery/DLV-04-e2e-receipt` | 30/30 passed (29 + 269's RC-30), 313 s | `DLV-04-server-e2e-two-server.full.log`, `DLV-04-e2e-receipt/` |
| DLV-05 the ticket's web specs (17 files) | `NUXT_TEST=true pnpm exec vitest run <ticket spec files>` | 17 files / 118 tests passed | `DLV-05-web-node-specs.log` |
| DLV-06 web guards | `guard:web-boundary`, `guard:localization-boundary` | both passed | `DLV-06-web-guards.log` |

- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (as of `be315bcf1c`; re-checked before the final merge)

## Verification

- Evidence judged: `Sufficient` for every critical acceptance criterion. AC-711 is a `User Check` defined in the approved requirements.
- Evidence relied on: execution report API-REV-003 (95% final confidence, no category below 95%), its Acceptance-Criteria Proof and Cases, the receipts opened directly (below), and the integrated-state reruns DLV-01…06.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-701 | NP-01, `API-07-…-run5/remote-nodes-page-probe.json` | `tabs` without a remote collaboration tab; `fresh.alphaSwitch: false`, `after: {alphaSwitch: true, status: On}` | Proven |
| AC-702 | NP-02 (verdict Pass); EL-01 and EL-07 in `API-09-…-run3/API-09-electron-journey.json` (Pass) | one row per node; release-shaped registry rewritten without the dropped fields, with `serverInstanceId` | Proven |
| AC-703 | EL-02 | `afterAdd: {windows: 1, dialog: 0}`, entry has `serverInstanceId`; `afterOpen: 2` | Proven |
| AC-704 | NP-05; ND-01 in `API-08-…-run2/nodes-docker-address-probe.json`; EL-04 | kappa registered alpha; both directions `✓ Working`; each side's offers list the other's helper. Docker: `onDocker[0].baseUrl: http://host.docker.internal:<port>` with `docker → this node ✓ Working` (probe and desktop) | Proven |
| AC-705 | NP-09 | `reachableOff: {alphaHasKappa: false, kappaPeers: [], kappaSwitch: true, listed: 1}`; lambda stopped: partial result reported | Proven |
| AC-706, AC-710 | NP-03 | per-row lines and fixes (gamma refused, delta off, epsilon not registered, zeta different node, theta 20 s) | Proven |
| AC-707 | ND-02, ND-03, EL-06 | hint text with `host.docker.internal:<port>`, Use this saved exactly one `ChangePeerAddress` with it | Proven |
| AC-708 | NP-08 | invalid-name rule text; `taken: "Another node is already named Beta."`; peer and entry both renamed; the other side's name untouched | Proven |
| AC-709 | NP-10 | mu removed on both sides and from the list; beta stopped → `✓✗✓` with the "still registered there" sentence | Proven |
| AC-713 | NP-11, NP-12, API-06 and DLV-04 | `offRequests: 0`, `quietRequests: 0`; offers only from this node's server; two-server E2E 30/30 on the integrated state | Proven |
| REQ-706 / SCN-A02 | NP-07 | `rowLine.line: "⚠ Turned on here, but not finished on mu. mu already has a node named Embedded Node."`, Try again → `onMu.name: "Embedded Node 2"` | Proven |
| AC-712 | docs review | see `docs-sync-report.md` | Proven (delivery review) |
| AC-711 | — | requires the user's own desktop and Docker nodes (TESTING.md rule 2 forbids agents testing against them); everything else around it is proven with test-owned nodes, a container and an isolated desktop | **User Check — pending** |

- More evidence requested: `None`.
- User check needed: `Yes`. AC-711 is defined as a user check in the approved requirements. Every other part was proven on test-owned nodes; only the user's own desktop and Docker nodes remain.
- User check reference: asked 2026-10-23. The user chose to check on a beta ("release a new beta please"). The check is pending on that beta; it is reported back before the terminal return.
- Re-verification after later re-integration: `Not needed` yet.

## Release Decision

- Decision: `Beta`
- Decided by: the user, 2026-10-23: "release a new beta please" (RELEASE.md § Release Decision). Release notes: GitHub generated notes (pre-release tags always use them), so no ticket `release-notes.md` is required.

## Docs Sync Result

- Docs sync artifact: `tickets/done/one-nodes-tab/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: web `docs/settings.md`, server `docs/modules/remote_collaboration.md` (one delivery correction), design-spec § Run Rules reconciliation.

## Ticket State Transition

- Ticket moved to `tickets/done/one-nodes-tab`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/done/one-nodes-tab` (on `personal` after the merge)

## Repository Finalization

- Ticket branch: `codex/one-nodes-tab` (local, not pushed), at `e84a0d6253` plus the docs-sync commit.
- Finalization target: `origin` `personal` (RELEASE.md), via `finalize/one-nodes-tab` in the ticket worktree.
- Repository finalization status: not started (waiting for verification).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (desktop registry); `peers.json` unchanged in shape.
- Delivery action required: `None`.
- Result and evidence: EL-01, EL-07, NP-02.

## Rollback Criteria

Revert the merge on `personal` and cut a new release (RELEASE.md § Rollback). No app-data migration. An older build's `normalizeLoadedNode` (checked at `ca1f09e52a`) treats `capabilities`/`capabilityProbeState` as optional and ignores the extra `serverInstanceId`, so the older build reads the new registry. A rollback is possible.

## Final Status

- Verification complete: `No` (AC-711 user check pending)
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `No` (decision pending)
- Applicable safe cleanup complete or not required: `No`
- Unresolved blocker: waiting for the user's AC-711 check and release decision
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No`
