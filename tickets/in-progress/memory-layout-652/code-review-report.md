# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-001; the behavior is the founder-approved autobyteus-608 design)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001)
- Design Spec Reviewed As Context: `design-spec.md` (D-2, D-3, D-4)
- Supplemental Task Artifacts Reviewed As Context:
  - the 608 UI/UX spec, `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/memory-layout-balance-608/ui-ux-spec.md`, which includes "Card grids: 1 / 2 (≥768) / 3 (≥1280) columns", "name … truncates" and VIS-004/005;
  - its runnable reference (`personal` `e918b746`);
  - `follow-ups.md`.
- Relevant Solution Revision IDs: SR-001
- Design Review Report / Architecture Review Revision Record: N/A (direct route, Medium / Low)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin). The code tested is `7bf21db56e`.
- Trigger: API/E2E round 1 (API-REV-001, commit `a6ebe0c7de`) failed AC-001 with F-1 and F-2.
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record Reviewed: yes (API-REV-001)
- Failing Scenario IDs: SMV-121 (F-1), SMV-120 (F-2)
- Exact Failing Commands: `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir <fresh>` (the server built)
- Failure Evidence Paths:
  - `evidence/api-e2e/API-003-semantic-memory-probe/` (SMV-121 screenshot, `smv3-checks.json`);
  - `evidence/api-e2e/API-010-rendered-views/results/overflow-390x844.json`, `header-1440x900.json`, and `compare/`.

## Routing Classification Review

Medium / Low, direct route; this round is a failure-origin exception. Classification confirmed.

## Failure-Origin Analysis

### CR-001 (F-1): on a phone, the Memory card grids are as wide as their longest line

- **Where:**
  - `components/memory/AgentMemoryPage.vue:28` (episode cards, measured);
  - `GroupMemoryPage.vue:24` (member cards);
  - `MemoryBrowse.vue:47` (owner cards).

  All three use `grid gap-3.5 md:grid-cols-2 xl:grid-cols-3`.
- **Cause:** below 768 px there is no column template. The one implicit column is `auto`-sized and takes its content's width (computed 561 px), so the DC-006 one-line meta (`min-w-0 truncate` path · time) cannot shrink it. The base wrapped the path (`break-all`), so this change introduced the overflow.
- **Consequence (VIS-005, 390×844):**
  - cards end at 695 px;
  - the page scrolls sideways (scrollWidth 581, clientWidth 340);
  - the times are off screen.

  The scenario is supported: real workspace paths are long.
- **Governing artifacts:** the 608 spec's written rule is "Card grids: 1 / 2 (≥768) / 3 (≥1280) columns", and VIS-005 shows the cards inside the window with the path cut. The implementation copied the runnable reference, which has the same three grids without a base column (FU-003). The reference's screenshots used short data. The written spec and the normative VIS govern.
- **Required action (Local Fix):**
  - Give each of the three grids the spec's one-column base, `grid-cols-1`, which is `repeat(1, minmax(0, 1fr))`, so a card can shrink and its `truncate` lines cut inside it.
  - Add an assertion to the specs or the probe (SMV-121 already reproduces it).

### CR-002 (F-2): the owner page's name is cut beside its "Also works in …" subtitle

- **Where:** `AgentMemoryPage.vue:6-7`. The `h1` (`min-w-0 truncate`) and the subtitle (`hidden min-w-0 truncate lg:inline`) are flex items of `MemoryPageHeader`'s left group (`MemoryPageHeader.vue:3`), and they shrink together.
- **Consequence:**
  - "Project Task Man…" at 1440 (157 of 172 px) and "Project…" at 1280 (89 of 172 px);
  - Research Assistant gets 90 of 153 px at 1280 (SMV-120).

  VIS-004 shows the name whole.
- **Governing artifacts:**
  - the spec says the name "truncates" for long names (the "Long names" row);
  - VIS-004 shows a normal name whole beside the subtitle;
  - so the subtitle must give way first.

  The runnable reference has the same markup (FU-003).
- **Required action (Local Fix):**
  - Let the subtitle take only the space left: make it `min-w-0 flex-1 basis-0 truncate`, still `hidden … lg:block`. Keep the `h1` at its content width (`min-w-0 truncate`, default `flex: 0 1 auto`).
  - Then the name stays whole while it fits, and it truncates only when it alone exceeds the row (the spec's long-name rule).
  - SMV-120 checks it.
- **Why not a Design Impact:** no layout choice is open. The VIS and the spec already settle the priority (the name over the subtitle); only the markup misses it.

## Classification

`Local Fix` (CR-001, CR-002), owned by `/implementation_engineer`. A follow-up for the design reference is recorded as FU-003 in `follow-ups.md`, for the Solution Designer to send.

## Not Affected

API-REV-001's other results hold:
- AC-001 at 1440 and 1280 apart from F-2;
- AC-002…AC-007;
- the org, imported-source, search and keyboard journeys;
- the web suite (6290 passed).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Failure Origin: implementation, `Local Fix` (CR-001, CR-002). Both are faithful copies of the runnable reference's defects, against the written spec and the normative VIS.
- Recommended Recipient: `/implementation_engineer`. Then API/E2E reruns SMV-120 and SMV-121 and the VIS comparisons. On this direct route no code review of the fix is required.
