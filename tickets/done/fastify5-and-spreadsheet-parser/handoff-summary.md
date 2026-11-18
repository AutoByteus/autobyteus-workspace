# Handoff Summary — fastify5-and-spreadsheet-parser

## State For Finalization

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`
- Ticket branch: `codex/fastify5-and-spreadsheet-parser`
- Base / finalization target: `origin/personal`. Bootstrap base `ddd6fdcdf6`. When delivery started, the base had moved 12 commits ahead to `72048f5b87`. Those commits are the agent-input-delivery-simplification merge (server collaboration code and docs), `docs/design-cases.md`, and the v1.5.9-beta.6 version bump in `autobyteus-web/package.json`. The ticket branch had no uncommitted work, so no checkpoint was needed. The base was merged as `2b166a2f9f` with no conflicts.
- Overlap with the base: only `autobyteus-web/package.json`. The base changed the `version` field and this ticket changed the `xlsx` dependency, and git merged the two automatically. The base did not change `pnpm-lock.yaml`, the gateway, the viewer, or any Fastify composition or route file.
- Candidate: the ticket branch HEAD that contains this file.
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed. Every gate passed: ARCH-REV-002 (architecture), CRR-002 (source), API-REV-001 (95%) and CRR-003 (test code).

## What Changed

- **Server on Fastify 5** (autobyteus-248, `bbd88fd3ea`, `29aeb5d721`):
  - fastify 4.29.1 → 5.12.7, mercurius 13 → 16.12.1, `@fastify/cors` 11, `/multipart` 10, `/websocket` 11.
  - Routes, CORS on the MCP routes, remote-access policy and upload limits behave as they did on base.
  - GraphiQL is turned off everywhere (DEC-001), so `/graphiql*` now returns 404. `POST /graphql` is unchanged.
  - As a side effect, GraphQL-over-WebSocket now completes its handshake. It was broken on base, but no product client uses it (OBS-1).
- **Message gateway** (`5c7ab7426c`, `25a45ee5d3`):
  - Moved to Fastify 5.
  - It is now its own pnpm workspace with its own lockfile, pinned pnpm and `onlyBuiltDependencies`. Its audit is clean.
  - The Docker image builds again. It installs only from the gateway's lockfile and copies only the build inputs, so operator secrets and session state stay out of the image (CR-001).
- **Spreadsheet viewer** (autobyteus-249, `195db3c42e`):
  - The parser is now SheetJS CE 0.20.3, from the `cdn.sheetjs.com` tarball with its integrity pinned in the lockfile (DEC-002).
  - The viewer sanitises its output down to table structure, so cell content can no longer inject markup or attributes.
  - Hyperlinked cells show as plain text (DEC-008).
  - `.xls`, `.xlsx`, `.xlsm` and CSV all still open.
- **Tests:**
  - new durable `tests/integration/api/studio-server-http-contract.integration.test.ts` (`8e5967e393`);
  - phone-access e2e baseline fix (`09baa03b86`);
  - viewer spec rewritten against the real parser;
  - studio listener test addresses the wildcard host explicitly.
- **Docs:** `autobyteus-message-gateway/README.md` (Install section) and `autobyteus-web/docs/content_rendering.md`, both written during implementation and checked at delivery. See `docs-sync-report.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Requirements | SR-004, approved 2026-10-24 (user delegated DEC-001/DEC-002 to the recommendations) |
| Architecture review | ARCH-REV-002 Pass (AR-001, AR-002 from ARCH-REV-001 resolved) |
| Implementation | IR-001, IR-002 (CR-001 fix) |
| Source review | CRR-002 Pass |
| API/E2E | API-REV-001 Pass, 95%. Covered the audit diff, real HTTP base vs branch, upload limits, a packaged desktop app from a clean clone, the server container, the gateway image and the viewer |
| Test-code review | CRR-003 Pass |
| Delivery, post-merge (`2b166a2f9f`) | `pnpm install --frozen-lockfile`, server `prebuild`, `typecheck` and `build`: all exit 0, with fastify 5.12.7 and mercurius 16.12.1 (`evidence/DLV-01`). Durable server tests (HTTP contract, phone-access e2e, studio listener): 7/7 pass (`DLV-02`). Server unit suite: 817 files, **6805 pass, 0 fail** (`DLV-03`). Web ExcelViewer spec with the real parser: 10/10 (`DLV-04`). Artifact hygiene, licensing and the secret gate on the 14 ticket commits: all pass (`DLV-05`) |

The post-merge rerun was chosen to match what the base changed. The base changed server collaboration code, so the full server unit suite ran, plus the ticket's durable server tests. The lockfile, the gateway and the Docker inputs did not change, so their earlier evidence (IMP-10, IMP-16, IMP-20, API-08) still holds.

## Verification

Verified from the evidence. Each of the 14 critical ACs is directly proven, and the evidence files were checked line by line. The table is in `release-deployment-report.md`. No user check is needed. The Termux part of REQ-003 has no AC and stays a residual risk.

## Release Decision

**No release.** None was requested: the requirements say "release only on request" and `handoff-sr-003.md` says "No release unless asked". No release is also the default in `RELEASE.md`. The change ships with the next release. A beta or stable release can be cut from `personal` on request.

## Residual Risks (accepted)

- Termux was not run, because there is no device. Fastify 5 supports Node ≥20, and the same server build ran on Node 22 both in the packaged app and in Docker.
- The phone's mobile web viewer was not driven in a phone browser. It uses the same component and the same sanitiser bundle that were proven.
- FU-008: Fastify 5.12 prints the `FSTDEP023` deprecation twice at startup. It is log only and no behavior changes.
- Cold installs need `cdn.sheetjs.com` to be reachable (DEC-002). The integrity pin makes the install fail if the tarball is changed or tampered with.

## Follow-ups

FU-001..FU-008 are in `follow-ups.md`, for the Solution Designer to send. FU-001 (body-parser) and FU-003 (CSP) are marked urgent.
