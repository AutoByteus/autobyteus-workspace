# Architecture Review Revision Record — mobile-experience-redesign (autobyteus-277)

The latest `design-review-report.md` is authoritative. This record keeps the chronological review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` (Large, High) | SR-003 | N/A | Fail | AR-001…AR-008 |
| ARCH-REV-002 | Round 2 / SR-004 design revision for ARCH-REV-001 | SR-003, SR-004 | Fail | Pass | AR-001…AR-008 (all resolved) |
| ARCH-REV-003 | Round 3 / SR-005 revision after API-REV-001 and CRR-003 (scoped) | SR-005 | Pass | Fail | AR-009, AR-010 (new) |

## Revision Entries

### ARCH-REV-001 — Initial review: the open path needs a defined sequence and a single navigation writer

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/design-review-report.md`
- Review round and trigger: round 1, the Solution Designer's handoff of 2026-11-06 (`solution-handoff.md`, ticket docs at `2230858ab6`).
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md`; no prior findings.
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact).
- What changed in the review result or what baseline was established:
  - **Confirmed:**
    - the behavior basis;
    - the classification (Large / High);
    - the persisted-data decision (`Not Affected`);
    - the removal plan;
    - DS-001, DS-002 and DS-005…DS-009.
  - **Failed:** DS-003, DS-004 and the run-screen local spine.
    - The order of the push relative to the async open and the opening state are undefined (AR-001; MP-001 Reachable, MP-002 Unclear).
    - Org opening has two writers of `screen` and a shared → phone import (AR-002).
    - The open Org is lost on Back (AR-003; MP-003 Reachable).
  - **Low corrections:** AR-004…AR-008.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High), AR-002 (Medium), AR-003 (Medium), AR-004…AR-008 (Low).
- Material classification changes: none.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: where the collaboration sync is mounted; R-001 and R-002; Product spec cosmetics (Residual Risks in the report).

### ARCH-REV-002 — Re-review of SR-004: all round-1 findings resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/design-review-report.md`
- Review round and trigger: round 2. The Solution Designer's SR-004 revision (commit `f4e5eb6634`), then a basis-only update at `407f0ee8e9` that pins the Product spec at `e6ca7b6098` (text fixes only over `976457a4`).
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md`; AR-001…AR-008.
- Relevant solution revision IDs: `SR-003` (requirements, unchanged), `SR-004` (design).
- Prior authoritative decision: `Fail` (ARCH-REV-001).
- Current authoritative decision: `Pass`.
- What changed in the review result: the scoped re-review covered DS-003, DS-004, the pending-open and run-screen local spines, and AR-001…AR-008. All now pass. Unaffected verdicts are kept from round 1.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-004; E-28, E-29, E-31 | `mobileRunOpeningStore` owns the pending open. Order: `begin` → `openRun` → shared action → `commit`/`fail`. The run screen's `opening` state comes from the pending state. All required parameters are named. Fail → list; recovery uses the desktop toast (global `ToastContainer`, `app.vue:12`; copy at `workspace.ts:40-42`). `reopenSelected` is removed |
| AR-002 | Open (Medium) | Resolved | SR-004 | `useMobileNavigation` is the only writer of `/mobile`'s query. The pure `agentOrgRouteQuery` serves both shells. The mobile subject action does no navigation. No shared → phone import; no mobile `stop` branch |
| AR-003 | Open (Medium) | Resolved | SR-004; E-30 | `openRun` replaces the list entry with the subject's Org keys. The disclosure gets `useRouteSelectedAgentOrg` and `hasSelectedChild` |
| AR-004 | Open (Low) | Resolved | SR-004 | `defaultExpansion` `{ orgRuns: true, orgTaskTeams: false }` on the phone; the desktop default is unchanged |
| AR-005 | Open (Low) | Resolved | SR-004 | Per-kind name rule, with citations; the desktop headers keep their titles |
| AR-006 | Open (Low) | Resolved | SR-004 | `onOpenAgentRun` in the selection actions; `RunListRow` and `RunDefinitionGroups` adopt it (`RunDefinitionGroups.vue:362-366` confirmed) |
| AR-007 | Open (Low) | Resolved | SR-004; E-32 | Callers, contracts and types are listed at their call sites. `onCreateRun`'s only caller is `WorkspaceAgentRunsTreePanel.vue:256` (confirmed) |
| AR-008 | Open (Low) | Resolved | SR-004 | The 401 rule reads the load composable's returned result; there is no second `fetchTree` |

- New or remaining finding IDs: none open.
- Material classification changes: none (Large / High).
- Recommended recipient: Implementation Engineer.
- Remaining risks or uncertainty, non-blocking (report Residual Risks):
  - the attribution window of the pending-open commit (a one-line guard);
  - after a failed open, the list entry keeps the rewritten keys;
  - the Org `mode` key is derived from the history item on the phone;
  - stale design-spec text about where the collaboration sync is mounted;
  - R-001 and R-002.

### ARCH-REV-003 — Scoped re-review of SR-005: the listed-root refresh needs bounded work

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/design-review-report.md`
- Review round and trigger: round 3. API/E2E round 1 failed (API-REV-001); CRR-003 classified F-01…F-09; the Solution Designer revised the design as SR-005 (commit `a525b439fe`).
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` "Round 3 (SR-005)"; `code-review-report.md` CRR-003, F-01…F-09.
- Relevant solution revision IDs: `SR-005`.
- Prior authoritative decision: `Pass` (ARCH-REV-002).
- Current authoritative decision: `Fail` (Design Impact).
- What changed in the review result:
  - **Pass:**
    - F-01, the Org first member through `select` (E-34 confirmed);
    - F-02, one guarded id helper;
    - F-06, the `useTaskWorkerTasks` gate split, plus remote titles;
    - F-07, kept as on the desktop;
    - F-09, Android insets (`androidx.core` present; no permission);
    - the TESTING.md rule.
  - **Fail:** F-08's `refreshListedRoots`. Its "child not stopped" trigger fires on every poll, and each `read` is a full `publish`: the member-loader generation resets, the message lists reload, the remembered child re-hydrates. MP-004 is reachable (AR-009).
  - **Low:** the canonical design sections still say "no Android changes" and omit the SR-005 shared changes (AR-010).
  - Round-2 verdicts are kept for the unchanged sections.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-008 | Resolved (ARCH-REV-002) | Resolved (unchanged) | SR-004 | SR-005 does not touch their sections |

- New or remaining finding IDs: AR-009 (Medium, blocking), AR-010 (Low).
- Material classification changes: none (Large / High).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty, non-blocking:
  - Org task rows show no summary, as on the desktop;
  - `TeamLaunchDraft.ts:106` is unlisted;
  - possible double inset padding;
  - the ARCH-REV-002 carry-overs.
