# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-002) | SR-001, SR-002 | N/A | Fail (Design Impact + Requirement Gap) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / Revised Architecture Design Complete (SR-003) | SR-003 | Fail | Fail (Design Impact) | AR-001–AR-003 resolved; AR-004 new |
| ARCH-REV-003 | Round 3 / Revised Architecture Design Complete (SR-004), limited to AR-004 | SR-004 | Fail | Pass | AR-004 resolved; implementation note N-1 |

## Revision Entries

### ARCH-REV-001 — Initial review: input admission model contradicts the delivery design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-review-report.md`
- Review round and trigger: Round 1. `Architecture Design Complete` (SR-002) from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md`; no prior findings.
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established:
  - **Baseline:**
    - Large / High confirmed.
    - The approval basis (Solution Designer within the direction, under the `solution-designer` SKILL step 2) is accepted.
    - Sound: the activation hook, the port placement in `AgentRun`, the system-notice reuse, and the additive seen-versions file.
  - **Contradicted:** only Codex and Claude support mid-turn append. AutoByteus, Antigravity, ACP and Grok queue input until the turn ends (AR-001).
  - **Admission model:** it claims one entry per dispatch, and reservations are sequenced early, so the preface ordering is unrealizable as specified (AR-002).
  - **Skill sources:** GitHub skill-source generation swaps read as removals (AR-003).

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (Requirement Gap, High)
  - AR-002 (Design Impact, High)
  - AR-003 (Design Impact, Medium)
- Material classification changes: None.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: R-1…R-5 in the report (re-read path permissions, history turn ID, ignore defaults, busy race, `ALL_INSTALLED` watch count); a team-config wording note.

### ARCH-REV-002 — SR-003 resolves AR-001…AR-003; native history gap (AR-004)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-review-report.md`
- Review round and trigger: Round 2. `Revised Architecture Design Complete` (SR-003) from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` SR-003 section; AR-001…AR-003.
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail`
- What changed:
  - All three prior findings are verified as resolved in the canonical requirements and design.
  - A new finding, AR-004: native AutoByteus memory ingest records the combined dispatched content as the user trace, and the server recorder skips native runs. Reopened native history would therefore show the notice inside the input, with no separate system notice.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Requirement Gap, High) | Resolved | SR-003, DEC-009 | REQ-004, AC-001 and QR-003 now state agent-message semantics per `activeTurnAppend` (append on Codex/Claude; next turn on AutoByteus/AGY/ACP/Grok), matching `claimNext`. Approved within the user's literal direction; user informed. |
| AR-002 | Open (Design Impact, High) | Resolved | SR-003, DEC-010 | DS-003 and the bounded spine combine the notice into the normalized, claimed dispatch message in `executeInputDispatch` (one dispatch, one turn). Admission order and the backend contract are unchanged, so reservations keep their order. Delivery is counted only on `forwarded`; other outcomes return the notice to pending; `takePreface` moves it to in-flight atomically. External memory records the admitted original (`onUserMessageForwarded`). |
| AR-003 | Open (Design Impact, Medium) | Resolved | SR-003, DEC-011 | Name-keyed re-resolution through `SkillService`; a generation swap reads as "updated" with the new path; the watch set is re-synced; REQ-008/009 and AC-005 updated. |

- New or remaining finding IDs: AR-004 (Design Impact, Medium).
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: a possible repeat notice after an uncertain dispatch outcome; R-1, R-4 and R-5; identifying compaction-recovery inputs (escalation trigger recorded).

### ARCH-REV-003 — SR-004 resolves AR-004 (native history); Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-review-report.md`
- Review round and trigger: Round 3, limited to AR-004. `Revised Architecture Design Complete` (SR-004) from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` SR-004 section; AR-004.
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed: AR-004 is verified as resolved in the design and code evidence. Implementation note N-1 was added (pass the ingest trace IDs to the assembler). The uncertain-dispatch residual was adopted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-003 | Resolved (ARCH-REV-002) | Resolved (unchanged) | SR-003 | Unaffected by SR-004 |
| AR-004 | Open (Design Impact, Medium) | Resolved | SR-004 | The generic `platform_input_preface` tag; native `MemoryIngestInputProcessor` → `MemoryManager.ingestSystemTaskNotification` plus the user trace with `original_content`; working context with explicit `rawTraceIds` (`memory-manager.ts:231–237`, where the content fallback would miss); server replay maps any `system_task_notification` trace (`raw-trace-to-historical-replay-events.ts:204–213`); the file mapping and the native history test are added |

- New or remaining finding IDs: None. Implementation note N-1.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty: R-1 (re-read path permissions), R-4 (busy race), R-5 (`ALL_INSTALLED` watch count), compaction-recovery input identification (escalation trigger).
