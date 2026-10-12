# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-006) | SR-005, SR-006 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004, AR-005, AR-006 |
| ARCH-REV-002 | Round 2 / Revised Architecture Design Complete (SR-007) | SR-005, SR-007 | Fail (Design Impact) | Pass | AR-001…AR-006 resolved; implementation notes N-1…N-4 |
| ARCH-REV-003 | Round 3 / Revised Architecture Design Complete (SR-008; CR-004 from CRR-003) | SR-005, SR-008 | Pass | Pass | No new findings; implementation notes N-5, N-6 added |
| ARCH-REV-004 | Round 4 / Revised Architecture Design Complete (SR-009; CRR-006 CR-005…CR-011 plus user naming direction) | SR-005, SR-009 | Pass | Pass | No new findings; implementation note N-7 added (mandatory) |

## Revision Entries

### ARCH-REV-001 — Initial review: catalog is not yet the single team/org authority

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md`
- Review round and trigger: Round 1. `Architecture Design Complete` from `/software_engineering_team/solution_designer` (Large/High).
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md`; no prior findings.
- Relevant solution revision IDs: SR-005, SR-006
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established:
  - **Baseline.** The routing classification and the behavior basis are confirmed.
  - **Sound core, no change needed:** the catalog/sync/monitor/hub structure, the removal of the caches and fresh path, and the persisted-data decision `Not Affected`.
  - **Gaps found:**
    - admission keeps a parallel disk inventory for teams/orgs, and its diagnostics query is unaddressed;
    - publication omits admission-dependent subjects;
    - last good excludes nested definitions;
    - the monitor has no runtime root-missing / in-place replacement transition;
    - catalog initial population and the built-in bootstrapper sequence are unstated.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (High)
  - AR-002 (High)
  - AR-003 (Medium)
  - AR-004 (High; Requirement Gap path if the narrowing is intended)
  - AR-005 (Medium)
  - AR-006 (Low)
- Material classification changes: None (task_size Large / architectural_risk High confirmed).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - platform-specific chokidar behavior on the root rename swap (P-004);
  - the Linux watch count, to be measured.

### ARCH-REV-002 — SR-007 resolves AR-001…AR-006; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md`
- Review round and trigger: Round 2. `Revised Architecture Design Complete` (SR-007) from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` / `solution-revision-record.md` SR-007; AR-001…AR-006.
- Relevant solution revision IDs: SR-005, SR-007
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: All prior findings were verified as resolved in the canonical `design-spec.md`, not only in the revision record. The behavior basis was reconfirmed; the requirements edits are editorial. A new premise, P-006 (org-owned teams in admission enumeration), was recorded as mandatory implementation note N-1 rather than as design rework: the design implies it, and existing regression tests guard it. N-2…N-4 are minor implementation notes.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-007 | `design-spec.md` § Return Or Event Spine(s): subject-expansion table (agent → agent, agent_team, agent_org; agent_team → agent_team, agent_org, agent). Example "Team created before its agents". Matches the admission-filtered list resolvers. |
| AR-002 | Open (High) | Resolved | SR-007, DSN-002 | DS-003 (teams/orgs) and Ownership Map: admission enumerates catalog units via the services. The registry is narrowed to application-owned sources (its dead `implementationPackageRoots` option is verified to be used only by tests). The duplicate rule moves into the readers with the same semantics. The missing-root example keeps teams/orgs listed and launchable. Org-owned team enumeration is detailed in N-1. |
| AR-003 | Open (Medium) | Resolved | SR-007 | One `definitionDiagnostics(subject: DefinitionSubject!)` that includes admission unavailability and `usingLastGood`. `definitionAdmissionDiagnostics`, its type and test are removed; no live consumer (grep verified). |
| AR-004 | Open (High) | Resolved | SR-007, DSN-003 | Definition units (team plus local agents; org plus owned agents/teams); nested exact IDs come from catalog nodes; recursive reconcile rules; nested last-good example. REQ-007 is not narrowed. |
| AR-005 | Open (Medium) | Resolved | SR-007 | Root state machine: runtime missing/reappear transitions; dev+ino identity re-arm through events and `syncRoots`; each status change publishes `agent_package`; AC-012 tests for rename-away/restore and the rename swap. The Linux event shape is a residual validation item. |
| AR-006 | Open (Low) | Resolved | SR-007 | DS-004 and bounded spine: the first `settle()` awaits a shared initial `reloadAll` in both hosts; the monitor is armed before the first scan; bootstrapper order is write → `refreshCache()` → resolve → defaults. |

- New or remaining finding IDs: None blocking. Implementation notes N-1 (mandatory: admission enumerates org-owned team nodes), N-2 (application-owned team-local agents stay in the visible list), N-3 (nested writes reconcile their owning unit), N-4 (de-duplicate identical resolved paths before the duplicate rule).
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty: the Linux root-rename event shape (run AC-012 on Linux); the Linux watch count; DSN-002's visible effect, to be documented.

### ARCH-REV-003 — SR-008 nested-issue web surface (CR-004); Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md`
- Review round and trigger: Round 3, a delta review. `Revised Architecture Design Complete` (SR-008) from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Code Reviewer, `code-review-report.md` CRR-003, CR-004. It is the failure-origin `Design Impact` from API-REV-001 DESK-002: a nested last-good issue had no web surface.
- Relevant solution revision IDs: SR-005, SR-008
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The SR-008 delta was reviewed against the implementation branch @ `a28465175`.
  - It confirms that `AgentList.vue` filters `TEAM_LOCAL` agents (existing behavior), so ARCH-REV-002 accepted an SR-007 example that assumed a nonexistent Agents-page card. That acceptance was a review gap.
  - DSN-004 (owning Team/Org card) applies REQ-009 and the approved UI section without new behavior.
  - The unit-wide `catalogIssues` contract is tight and scoped to the Team and Org types.
  - Unusable nested nodes stay visible in the subject notice, because `listIssueEntries` walks nested nodes.
  - FU-001 is correctly out of scope.
  - Implementation notes N-5 (source unit issues per unit through the services, not per node subject) and N-6 (one mapper) were added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-006 | Resolved (ARCH-REV-002) | Resolved (unchanged) | SR-007 | Unaffected by SR-008 |
| CR-004 (downstream, code review) | Open (CRR-003, Design Impact) | Design resolved; implementation and re-review pending | SR-008, DSN-004 | `design-spec.md` BEH-004 row, Interface Mapping (`catalogIssues`, `DefinitionUnitIssue`), File Mapping (badge list, Team/Org cards), Removal Plan, Examples, and § SR-008 Verification Additions |

- New or remaining finding IDs: None. Implementation notes N-1…N-6 (N-1 mandatory).
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - FU-001 is a follow-up candidate.
  - The CRR-001/002 source-review Pass is superseded. Source review (with the nested-surface trace) and API/E2E re-runs are required after implementation.

### ARCH-REV-004 — SR-009 naming and application-package store change; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md`
- Review round and trigger: Round 4, a delta review. `Revised Architecture Design Complete` (SR-009) from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Code Reviewer, `code-review-report.md` CRR-006 (CR-005…CR-011), plus the user's naming direction. DSN-005 confirmed by the user on 2026-10-11.
- Relevant solution revision IDs: SR-005, SR-009
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Reviewed `design-spec.md` § Naming (SR-009, authoritative) and the SR-009 Removal Plan rows against branch HEAD `061ea7ab3`.
  - The rename map covers CR-005…CR-011 as a clean cut with no aliases. CR-008's suggested `definitionIssue` became the more specific, user-confirmed `loadIssue`.
  - Public contract changes are renames or a consolidation of the three identical refresh mutations. All consumers are in-repo; `dist-mobile`, `resources/server` and `electron-dist` are build outputs.
  - The readiness `prepare()` reload existed only to refresh store entries. Its validation stays.
  - Moving application-package agents/teams to on-demand list reads keeps the lists the same, provided per-definition isolation is kept: mandatory note N-7, because application-package reads throw on malformed files.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-006 | Resolved | Resolved (unchanged) | SR-007 | Unaffected; names change only |
| CR-005…CR-011 (downstream, code review) | Open (CRR-006, must fix) | Design resolved; implementation and re-review pending | SR-009, DSN-005 | `design-spec.md` § Naming rename map and Removal Plan; verification search list |

- New or remaining finding IDs: None. Implementation notes N-1 and N-7 are mandatory; N-2…N-6 still apply (N-5/N-6 under the new names).
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - Application-package entries lose load issues and live publication. That is out of scope and matches base.
  - Delivery stays paused (DR-002). Its docs sync must be redone under the new names.
