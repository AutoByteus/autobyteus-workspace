# API/E2E Coverage Investigation — `task-card-compact-summary`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/design-spec.md` (SR-002; Small/Low)
- Supplemental Task Artifacts:
  - evidence screenshot `evidence/temp-tasks-full-content-2026-10-07.png`;
  - the prior UI/UX spec (unchanged) `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md`.
- Design Review Report: `N/A — not applicable` (direct low-risk route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Ledger: not used (few cases; recorded in the execution report)
- Round: 1. Trigger: IR-001 from `/implementation_engineer` (direct API/E2E)

## Routing Classification

- `Small` / `Low`; input `Direct Low-Risk`; successful output `Delivery`
- Test-code review: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Cards on both boards show a summary (the first non-empty line) in at most 2 lines and a preview (the remaining lines) in at most 2 lines, each cut with an ellipsis.
- **Fix:** remove the conflicting `block` utility so `line-clamp-2` applies.
- **Bounds:** card text is bounded at 300 characters before rendering; one-line labels (the card `aria-label`, the delete confirmation) at 120 characters with "…".
- **Unchanged:** search and the Task pages keep the full text, and short text renders exactly as before (AC-001..006).
- **Persisted data:** Not Affected.

## Supported Scenarios And Real Usage

- **Designer scenario:** UC-001, scanning boards whose Tasks have agent-written long briefs.
- **Added (real use):**
  - a long Task that also has context files and a worker line;
  - non-Latin text without spaces (CJK);
  - one pasted unbroken token (a path or URL);
  - a narrow window (390 px);
  - deleting a Task with a short summary.
- Contrived/unsupported: none.

## Changed Surface And Boundary Classification

| Surface | Affected | Evidence | Gap | Mode |
| --- | --- | --- | --- | --- |
| Frontend component/state | Yes (`ProjectTaskRow`, `taskSummary`, `ProjectTaskDetail` label) | Unit 14 + 5 | Rendering | Browser |
| Browser journey | Yes (both boards, Task pages, delete dialog) | PMU-013 | Edges (files, CJK, token, 390), short-text visual parity | Browser (PMU-014 + temporary parity) |
| Desktop renderer | Same renderer (Electron Chromium) | — | Packaged build/guards | Packaged build (+ short desktop check if feasible) |
| Backend/API/persistence/shell | No | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root of the worktree). It covers the web unit tests and the browser dev-path probe `test:e2e:project-manager-ux`.
- Pre-existing failure: `pages/__tests__/org-definition-navigation.spec.ts`. It is unrelated: it imports none of the changed files, and the change only touches `components/projects/*` and `utils/projects/*`.
- The user's running app is not touched; the probe uses a private stack.

## Existing Durable Coverage Inventory

| Path | Intent | Decision | Action |
| --- | --- | --- | --- |
| `utils/projects/__tests__/taskSummary.spec.ts` (14) | Bounds, word boundary, surrogates, short text unchanged | Still Valid | Keep |
| `components/projects/__tests__/ProjectTaskRow.spec.ts` (5) | Both task shapes, no conflicting display utility, short text | Still Valid | Keep |
| Probe PMU-013 | Real-length fixtures, ≤ 2 + 2 lines on both boards at 1440/1024, labels, search, full text | Still Valid. **Its final file (row bound 200 px) was never run**: the 13/13 run used 160 px | Re-run |
| Probe PMU-001..012 | Prior journeys | Still Valid | Regression run |

## Durable Coverage To Add / Update

| Case | Behavior | Artifact | Why |
| --- | --- | --- | --- |
| PMU-014 (add) | A long Task with a context file and a worker line (both visible inside the card); CJK hard cut (exactly 300 characters, 2 lines); a 5,000-character unbroken token (2 lines, no horizontal overflow); 1440/1024/**390**; long text shows **exactly** 2 lines; AC-003 short half (full short summary in the delete confirmation); full text and file on the Task page | `project-manager-ux-probe.mjs` | Handoff hints and unexercised edges |
| Probe `goto` (update) | Wait until no GraphQL request is in flight before a full navigation | same | PMU-014 showed an intermittent harness artifact: a reload aborting the app shell's late reads (`net::ERR_ABORTED`, "Failed to fetch agent definitions") |

## Temporary Executable Validation

| Case | Method | Proves | Why not durable |
| --- | --- | --- | --- |
| PARITY | Temporary copy of the probe renders 5 short-card shapes at 1440/1024 with fixed names: once with the base `ProjectTaskRow.vue` + `taskSummary.ts` swapped in, once with the fix. PIL pixel diff | AC-006 "render exactly as before" | It needs the base source swapped into the worktree, which is not a repeatable repository test |

## Confidence (post-repository)

Unit and implementer evidence only: 80%. The rendering edges and visual parity were unproven, and the final PMU-013 file had not been run.

## Broader Validation Decision

- `Required`: Browser (probe), plus the packaged build (guards) and an optional desktop check.

## Not Tested / Deferred

| Behavior | Reason |
| --- | --- |
| zh-CN copy | No copy change |
| Reduced motion | Not affected |
