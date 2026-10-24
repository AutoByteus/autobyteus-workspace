# Delivery / Release / Deployment Report — fastify5-and-spreadsheet-parser

## Release / Publication / Deployment Scope

Finalize the verified ticket branch into `origin/personal`. No release, publication or deployment: none was requested (see Release Decision).

- Classification (unchanged): `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, blob `a816ab03cc` (last changed in `83e8e12125`).
- Deviations from the guide and why: `None`.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/fastify5-and-spreadsheet-parser/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/fastify5-and-spreadsheet-parser/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `ddd6fdcdf6`
- Latest tracked remote base reference checked: `origin/personal` `72048f5b87`, fetched 2026-10-24 at delivery start
- Base advanced since bootstrap or previous refresh: `Yes`, by 12 commits. They are the agent-input-delivery-simplification merge (server collaboration code and docs), `docs/design-cases.md`, and the v1.5.9-beta.6 bump of `autobyteus-web/package.json`.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed`. The ticket branch had no uncommitted tracked changes. The only untracked paths were build output (`*/dist/`), which must not be committed.
- Integration method: `Merge` (`git merge origin/personal`), giving `2b166a2f9f`
- Integration result: `Completed`, with no conflicts. The only file both sides changed is `autobyteus-web/package.json` (version field against dependency), and git merged it automatically.
- Post-integration executable checks rerun: `Yes`
  - `evidence/DLV-01`: `pnpm install --frozen-lockfile`, server `prebuild`, `typecheck` and `build`, all exit 0. fastify 5.12.7, mercurius 16.12.1.
  - `evidence/DLV-02`: the ticket's durable server tests (studio HTTP contract, phone-access e2e, studio listener), `Tests 7 passed (7)`.
  - `evidence/DLV-03`: server `test:unit`, `Test Files 817 passed | 4 skipped (821)`, `Tests 6805 passed | 7 skipped (6812)`. The base's collaboration change touches this suite.
  - `evidence/DLV-04`: web `ExcelViewer.spec.ts` with the real parser, `Tests 10 passed (10)`.
  - `evidence/DLV-05`: artifact hygiene, licensing and the secret gate on `origin/personal..codex/fastify5-and-spreadsheet-parser` (14 commits), all pass.
  - All runs used `env -i PATH HOME=<temp> TMPDIR`, as API/E2E did.
- Post-integration verification result: `Passed`
- No-rerun rationale (only if no new base commits were integrated): N/A. One reduced scope: the gateway, root `pnpm-lock.yaml` and Docker inputs are unchanged by the base, so IMP-10, IMP-16, IMP-20 and API-08 still hold for them.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (checked again before finalization; see Repository Finalization)
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof and Cases (API-REV-001, final confidence 95%, no category below 95%);
  - the evidence files listed below, opened and checked line by line;
  - the post-integration rerun `DLV-01`..`DLV-05`.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 | API-R1 → `IMP-12-root-audit-base-vs-branch.log` | `REMOVED` lists all eight fastify, find-my-way, `@fastify/static` and busboy highs named in the AC, plus every `undici@5.28.3` and mercurius advisory. `ADDED (in branch, not in base):` is followed by nothing, and the targeted-package query returns `none`. The highs that remain (dompurify, body-parser and others) were present on base too. They are FU-007 and FU-001 | Proven |
| AC-002 | API-R3 → `IMP-07`, `IMP-09`, `IMP-11`/`IMP-13`, `IMP-15`; API-03/03b; `DLV-01`..`03` | IMP-09: 6770 pass. IMP-11: `1 failed \| 420 passed`, and IMP-13 then shows the failing listener test fixed with `Tests 1 passed (1)`. API-03 has one e2e failure, `phone-access…:212:44 expected 503 to be 200`, which also happens on base. API-03b shows the `configureNodeIdentityCapability(true)` diff and `Tests 2 passed (2)`. Post-merge: unit 6805 pass, typecheck and build exit 0 | Proven |
| AC-003 | API-01 → `API-01-studio-http-contract-test.log`; API-04 → `API-04-live-http-base-vs-branch.log` | The branch has `Tests 4 passed (4)`. The two MCP cases also pass on base. The `cors:false` mutation fails at `:151:39`, so the test catches that regression. In the API-04 diff from base to branch, no MCP gateway line differs | Proven |
| AC-004 | API-01, API-04, API-08 | API-04's LAN-client lines are the same on base and branch, apart from `/graphiql*` and the GraphQL WebSocket. API-08 states `IDENTICAL to API-04 branch LAN-client lines` | Proven |
| AC-005 | API-04, API-08, API-01 | `GET /graphiql`, `/graphiql/main.js` and `/graphiql/config.js` all return `status=404` on loopback and LAN, inside the container and from the host (DEC-001). `POST /graphql` returns `status=200`. The GraphQL WebSocket now acks `connection_ack`; on base it timed out (OBS-1, a fix with no consumer) | Proven |
| AC-006 | API-05 → `API-05-upload-limits-base-vs-branch.log`; API-08 | `/rest/upload-file` at `LIMIT+1` returns `status=413` on both. `/rest/context-files/upload` at `LIMIT+1` returns `status=400` on both. No file is left behind, and the log ends `NO DIFFERENCE`. The container gives `413` too | Proven |
| AC-007 | API-07 → `API-07-packaged-app-journey.log` | The packaged app from a clean clone runs `fastify@5.12.7 … mercurius@16.12.1`. The run streamed: `"SEGMENT_CONTENT": 19`, `"TURN_COMPLETED": 1`, and the reply "The fastify five check passed successfully." `"graphqlRequests": 169`, all `200` | Proven |
| AC-008 | API-08 → `API-08-server-container.log` | `# build exit: 0`. `GET /rest/health \| status=200`. The GraphQL `POST` returns 200. `WS /graphql … first=connection_ack` and `WS /ws/projects \| first type=connected`. `error-level (level 50) entries: 0` | Proven |
| AC-009 | API-R4 → `IMP-10-gateway-install-typecheck-test-audit.log` | `typecheck exit: 0`, `Tests 268 passed (268)`, `No known vulnerabilities found`, `audit exit: 0`. The base did not touch the gateway | Proven |
| AC-010 | API-R5 → `IMP-20-gateway-image-no-context-secrets.log` | The search for `.env*` files and `memory` dirs in `/app` returns nothing (`(end)`), and the `DUMMY-CR001` search returns `none`. `health status code: 200`, with `fastify@5.12.7` | Proven |
| AC-011 | API-R2 → `IMP-16-clean-clone-frozen-install-cold-store.log`; API-08 | `install exit: 0`. `xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` with `integrity: sha512-oLDq3jw7…`. API-08 bundles `xlsx-0.20.3`. IMP-12 shows no xlsx advisory on the branch | Proven |
| AC-012 | API-R6 → `IMP-02-web-excel-viewer-spec.log`; `DLV-04` | The xlsx, biff8 (`.xls`), xlsm and CSV cases (URL and streamed content), the sheet tabs, and fetch error with Retry all pass with the real parser: 10/10 before the merge and 10/10 after | Proven |
| AC-013 | API-R6 → IMP-02 (and IMP-03 mutation); API-07 | The spec "keeps markup in cell text inert…" and "shows hyperlinked cells as their text without a link" pass. In the packaged app the DOM for both files has `"tags": ["table","tbody","td","tr"]`, `"attrs": []`, `"anchors": 0`, `"pwned": null` and `"hashUnchanged": true` | Proven |
| AC-014 | API-07 → journey log and `API-07-packaged-app/API-07-xls-viewer.png` | `generated-sample.xlsx` and `.xls` both render cell text in the packaged app built from a clean clone, and their content fetch returns `status 200` | Proven |

- More evidence requested: `None`.
- User check needed: `No`. The REQ-003 Termux part has no AC. API/E2E could not reach a device, and the same server build is proven on Node 22 in two runtimes. It is recorded as a residual risk, not a user check.
- User check reference, when needed: N/A
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by:
  - the requirements' stakeholder row: "User — Owns scope and release … release only on request";
  - `handoff-sr-003.md`: "No release unless asked";
  - the default in `RELEASE.md` ("No release … the default when the user does not ask for one").
  - The change ships with the next beta or stable release, and one can be cut from `personal` on request.

## Docs Sync Result

- Docs sync artifact: `tickets/done/fastify5-and-spreadsheet-parser/docs-sync-report.md`
- Docs sync result: `Updated`. The docs were updated in the code commits and checked accurate at delivery. Delivery made no edits.
- Docs updated: `autobyteus-message-gateway/README.md`, `autobyteus-web/docs/content_rendering.md`
- No-impact rationale (if applicable): N/A

## Ticket State Transition

- Ticket moved to `tickets/done/fastify5-and-spreadsheet-parser`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/done/fastify5-and-spreadsheet-parser/` (on `personal` after the merge)

## Version / Tag / Release Commit

Not applicable: there is no release. `autobyteus-web/package.json` stays at the base's `1.5.9-beta.6`. No tag was created.

## Repository Finalization

Filled in after finalization; see DR-001 in `delivery-revision-record.md`.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`

## Release Notes Summary

- Release notes status: `Not required`. There is no release. The notes for the next stable release are written by that release's delivery.

## Deployment Steps

None. This repository deploys no hosted service (`RELEASE.md` Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none. The ticket changes no stored data, schema or migration.
- Delivery action required: `None`

## Verification Checks

- Before finalization, on the merged ticket state `2b166a2f9f`: `DLV-01`..`DLV-05`.
- On the finalize merge: the Secret Gate again, as `RELEASE.md` requires, and the hygiene check on the archived paths.

## Rollback Criteria

- Revert the merge on `personal`. There is no data migration and no release, so the revert alone restores the previous state.
- Signs that would justify a revert:
  - an MCP client or trusted-network peer gets a different status or CORS outcome than before;
  - an upload limit regresses;
  - a spreadsheet the viewer used to open no longer opens.
- A developer who relied on `/graphiql` now gets 404. That is DEC-001, not a regression.

## Final Status

Filled in after finalization; see DR-001.
