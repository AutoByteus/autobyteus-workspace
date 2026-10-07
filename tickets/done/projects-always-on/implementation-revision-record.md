# Implementation Revision Record — `projects-always-on`

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `solution_designer` / `handoff-implementation.md` / SR-002 → SR-003 (direct route) | N/A | `Initial Baseline` | SR-002, SR-003 | Implementation complete; routed to direct API/E2E |

## Revision Entries

### IR-001 — Projects always on; Projects tab in the right panel; baseline fixes

**Trigger and classification**
- Triggering role, report path, and round: `/solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/handoff-implementation.md`. SR-002 (flag removal) was revised mid-implementation to SR-003 (+ Projects tab; Medium / Low).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: implementation complete for REQ-001..011 and AC-001..011.

**Related revisions**
- Solution: `SR-002`, `SR-003`.
- Architecture review, code review, API/E2E and delivery: `N/A`.

**Why this baseline is recorded:** it is the first implementation handoff for the approved package.

**Approved behavior or requirement IDs affected:** BEH-001..004 and the SR-003 tab (REQ-006..011).

**Implementation delta**
- **Flag removal:**
  - Server: the capability files are deleted; the schema and settings registration are updated.
  - Web: the store, documents, card, copy, middleware entry and settings map entry are deleted. Navigation uses the runtime gate only. `generated/graphql.ts` is regenerated.
- **Tab:**
  - The tool order puts `projects` first, and `useRightSideTabs` shows it on desktop and keeps it across scope changes.
  - Right panel render and strip icon.
  - `projectsPanelStore`; `ProjectsPanel`, picker and in-tab Task detail.
  - Board `compact` and row `activation="select"` modes.
  - en/zh-CN copy.
- **Probes:** PMU-015; PT-E2E-001/010/015 rewritten; the navigation probe updated (no Projects toggle; waits for the initial mount).
- **Docs:** web `projects.md`, `settings.md`, `workspace_layout.md`, `AGENTS.md`; server `projects.md`.
- **Baseline fixes (TESTING.md rule 9),** separate commits:
  - the rule itself;
  - web: `org-definition-navigation`, `workspaceSelectionComposition`, the navigation probe selector, seven stale specs, the token statistics rem font sizes, `WorkspaceHistoryFamilyPublication`;
  - contracts: the root execution view tests;
  - server: six unit specs.

**Changed files or areas:** see `implementation-handoff.md` › Key Files Or Areas.

**Local validation and result**
- Full web suite: **582 files / 3900 tests pass, exit 0** (after the tab).
- Contracts: 22/22.
- Server: tsc clean; unit and e2e Projects suites pass.
- Localization guard and audit pass; `vue-tsc` shows no errors in changed files.
- Browser:
  - PMU-001..015 Pass;
  - PT-E2E-001..016 Pass (run 2; run 1 hit an intermittent PT-E2E-006 narrow-layout failure that cascaded; the base passes);
  - navigation B-001..005 Pass twice.

**Next recipient or routing:** `get_handoff_rules` → direct API/E2E (Medium / Low).

**Remaining limitations or risks**
- The intermittent PT-E2E-006.
- 49 server baseline failures in 19 files, reported as their own item with first-level causes.
- `vue-tsc` dependency-typing errors outside changed files.
- The packaged desktop was not run.
