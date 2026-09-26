# Architecture Review Revision Record

Package: `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction`.
The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 — `Architecture Design Complete` (`SR-002`) | `SR-001`, `SR-002` | N/A | Fail | `AR-001`, `AR-002` |
| ARCH-REV-002 | Round 2 — revised package (`SR-003`) | `SR-001`, `SR-003` | Fail | Pass | `AR-001`, `AR-002` (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of the Projects slice-1 architecture

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-review-report.md`
- Review round and trigger: Round 1. Triggered by the `/solution_designer` handoff `handoff-to-architecture-review-sr-002.md` (`task_size=Large`, `architectural_risk=High`).
- Triggering role, report path, and finding IDs: `solution_designer`; `design-spec.md` (`SR-002`); no prior findings.
- Relevant solution revision IDs: `SR-001` (approved requirements), `SR-002` (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- Baseline established:
  - The behavior basis (`BEH-001`–`BEH-006`) is confirmed against the code at `1676bede9`.
  - The spine inventory, ownership, boundaries, the persisted-data decision (`Not Affected`) and the bounded capability refactor all pass.
  - Two targeted design gaps remain: `AR-001` (link-candidate policy for the reused `WorkspaceSelector`) and `AR-002` (Advanced-settings capability refresh parity in `stores/serverSettings.ts`).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `AR-001` (Medium), `AR-002` (Low)
- Material classification changes: None. The routing classification is confirmed.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - `P-002` (transient `skill_ws_*` candidates) is `Unclear`, but the `AR-001` fix covers it.
  - Implementation notes are listed under Residual Risks in the report.

### ARCH-REV-002 — Re-review of the SR-003 fixes for AR-001 and AR-002

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-review-report.md`
- Review round and trigger: Round 2. Triggered by `handoff-to-architecture-review-sr-003.md` from `/solution_designer`.
- Triggering role, report path, and finding IDs: `solution_designer`; `design-spec.md` (`SR-003`); `AR-001`, `AR-002`.
- Relevant solution revision IDs: `SR-001` (requirements approval, unchanged), `SR-003`
- Prior authoritative decision: `Fail` (`ARCH-REV-001`)
- Current authoritative decision: `Pass`
- What changed:
  - The behavior basis was reconfirmed; requirements are unchanged and no renewed approval is needed.
  - `DS-003`, `DS-004`, the new `DS-004b`, the affected file mapping rows, the Removal Plan, the examples and the Change Sequence were re-verified against the code.
  - All other round 1 verdicts are carried forward.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | `SR-003`; design-spec `DS-003`, Ownership Map, Reuse Check, mapping rows (`ProjectWorkspaceLinkDialog`, `linkableWorkspaces.ts`, `WorkspaceSelector.vue`), Concrete Examples, Sequence step 5 | See evidence below |
| AR-002 | Open (Low) | Resolved | `SR-003`; design-spec `DS-004b`, Removal Plan row, `stores/serverSettings.ts` mapping row, example, Sequence step 4 | See evidence below |

`AR-001` evidence:
- The Projects-owned pure policy keeps only `agent_ws_` ids with `kind === 'filesystem'` and `isTemp !== true` that are not already linked.
- The opt-in `candidateWorkspaceIds` prop defaults to `null`, which leaves the 7 run-config callers and `WorkspaceSelector.spec.ts` unchanged (count verified).
- The dialog passes `autoSelectDefault=false`, and the selector's auto-select paths honor it (verified).
- Excluding instead of disabling already-linked workspaces is justified: `SearchableSelect` has only a component-level `disabled` prop (verified).
- The server re-validates inside the locked updater.

`AR-002` evidence:
- `CAPABILITY_STORE_BY_SETTING_KEY` maps `ENABLE_APPLICATIONS` and `ENABLE_PROJECTS` and replaces the hard-wired branch at L56 and L413–416.
- SI is excluded on purpose.
- Tests: the L387 regression, the Projects refresh, and the SI no-refresh case.

- New or remaining finding IDs: None
- Material classification changes: None (still `Large` / `High`)
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty: See Residual Risks in the report (capability extraction regression, the `null`-default guard on the selector prop, stale client candidates handled by server re-validation, codegen dependency).
