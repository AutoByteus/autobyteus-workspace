# API/E2E Revision Record — chat-composer-menus-open-upward

The coverage investigation and the execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer / `implementation-handoff.md` / round 1 | SR-004, IR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Initial validation of upward-opening new-chat composer menus

- Triggering role, report path, and round: Implementation Engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/implementation-handoff.md`, round 1
- Triggering finding or scenario IDs: N/A (initial)
- Related revision IDs: SR-004; IR-001; ARCH-REV N/A; CRR N/A; DR N/A
- Why this baseline was recorded: first completed API/E2E result for the package
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/chat-composer-menus-open-upward-probe.mjs` (U01–U06) and the `test:e2e:chat-composer-menus-open-upward` script in `autobyteus-web/package.json`
  - Updated T06 in `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` (stale `6vh` and 14vh-baseline assertions replaced by the current padding)
- Scenarios added, changed, removed, or rechecked: R1, R2, U01–U06, N01 (negative control), T01–T07
- Commands, environment, fixture, or broader-validation delta: browser dev-path probes on an owned backend and Nuxt dev server; 9 agents, 12 skills, 14 workspaces; real runtime catalogs; real Claude Agent SDK runs for U06, T02, T03

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md` (events 1–14)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96% (no category below 93%)
- New or remaining failure IDs: none
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks, blocked evidence, or untested scope: OBS-1 (Model menu runtime rows overflow below about 330px of window height when the page is scrolled; by-design list without a scroll region), OBS-2 (at 1024px wide the left-opening flyout sits about 19px under the sidebar; same on base), OBS-3 (`docs/chat.md:91` stale, Delivery). Packaged Electron window and typecheck not exercised.
