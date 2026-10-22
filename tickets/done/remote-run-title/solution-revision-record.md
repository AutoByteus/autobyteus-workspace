# Solution Revision Record — remote-run-title (autobyteus-269)

## Revision Index

| SR | Date | Phase | Summary |
| --- | --- | --- | --- |
| SR-001 | 2026-10-22 | Requirements | Reproduced; baseline for approval |
| SR-002 | 2026-10-22 | Requirements | Approved |
| SR-003 | 2026-10-22 | Design | Design complete; Small / Low; direct |
| SR-004 | 2026-10-22 | Design | Window title rule (CRR-001 Design Impact) |

## Revision Entries

### SR-001 — Reproduced; requirements baseline (2026-10-22)

- Trigger: the PTM's delegation of autobyteus-269.
- Prior status: N/A. Current status: `Ready for Approval`.
- The cause was reproduced on two isolated servers (F-03).
- Open: DEC-601, DEC-602 (the user).

### SR-002 — Approved (2026-10-22)

- The user's decisions: DEC-601 is one rule for every run, the title is the content of its first message (for a delegated task, its description without the packet header); DEC-602 (a), existing runs are left as they are.
- Status: `Ready for Approval` → `Approved` (the user, quoted in the requirements doc).
- Next: design.

### SR-003 — Design complete (2026-10-22)

- Design: [design-spec.md](design-spec.md). `RemoteMessageReceiver` records an accepted work packet's content as the run's title through the new by-ID `recordRunTitle` on `AgentRunService` and `TeamRunService`, which apply the catalogs' first-non-empty rule. No migration.
- Classification: `Small` / `Low`. Route: direct implementation.

### SR-004 — Window title rule (2026-10-22)

- Trigger: API-REV-001 F-001 and the code reviewer's failure-origin review CRR-001 (Design Impact, Medium). An active peer-started Agent row showed the packet wrapper: the window replaced the stored title with the live first user message (`runTreeLiveStatusMerge.ts:46-51`, `useStandaloneRunTitle.ts:28`).
- Corrected: investigation F-04 (wrong premise); added F-08 (stored skill-tagged titles keep the skill instruction).
- Design:
  - the stored title wins when it has a value, in the sidebar and the header;
  - the live summary only fills an empty stored title;
  - a stored title is shown through the same cleaning as the live one, a single-line skill instruction form owned by `skillRequestInstruction`, so active user-started rows are unchanged;
  - option (b), packet projection as `system_task_notification`, is rejected as wider.
  - Validation adds window unit tests and a durable sidebar browser probe.
- Intended behavior changed: No. It realizes the approved rule (the title is the first message's content; the server is the one source; user-started titles unchanged). The one visible side effect, a stopped skill-tagged run reading as it did while active, is a consistency gain and is stated to the user.
- Classification: still `Small` / `Low`. Route: back to implementation (direct). API-01 stays valid (server unchanged).
