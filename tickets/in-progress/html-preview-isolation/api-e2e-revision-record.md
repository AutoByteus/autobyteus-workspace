# API/E2E Revision Record — html-preview-isolation (autobyteus-417)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 `Pass`; round 1 | SR-004 (requirements/design wording), ARCH-REV-001, IR-001, CRR-001 | N/A | `Pass` / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: isolated previews proven on the real desktop app, node and phone web app

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001 `Pass`), round 1
- Triggering finding or case IDs: N/A (initial validation); residual risks R-1…R-4 (ARCH-REV-001) and CAND-04 carried
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-001, IR-001, CRR-001
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: none (existing unit specs IMP-02/03 and 403's server E2E judged sufficient as durable coverage; real-app journeys kept as a committed evidence harness)
- Cases added, changed, removed, or rechecked: API-01…API-05 reused (IMP-02/03/05/06-07/08); API-06 existing server E2E; API-10…API-16 new journeys/probes
- Commands, environment, fixture, or broader-validation delta: isolated desktop instance of the worktree build (ENV-1), headless Chrome tab and phone emulation (ENV-2), server E2E (ENV-3); scripted AGY runtime through the instance data root `.env`

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95.4% (no category below 92%)
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review: no repository test code changed)
- Remaining risks, blocked evidence, or untested scope: SCN-003 and team/collaboration reference previews covered through the shared `HtmlPreviewer` blob branch, not their own journeys; phone on Chrome emulation only. R-1 (real relative image) closed: `img-relative` `loaded 3x3` in the real app. R-2 (no-Origin GET) closed: GET mutation refused (405 trusted client, `REMOTE_ACCESS_ROUTE_UNSUPPORTED` 404 from the LAN), no definition created. R-3/CAND-04 measured: the workspace preview reloads by itself on file change (contradicts FU-003's premise; Notes in the report). R-4 (Electron version) closed: pinned 42.11.16 in the packaged build.
