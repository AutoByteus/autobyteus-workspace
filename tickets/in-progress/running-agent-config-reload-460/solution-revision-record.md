# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-460, 2026-11-13 dispatch) | N/A | N/A | Ready for Approval | BEH-001…008, REQ-001…007 | Per-runtime findings; option A recommended; DEC-001, DEC-004, DEC-005 sent to the user |
| SR-002 | Mixed | User conversation 2026-11-13 (approval and direction) | N/A | Ready for Approval | Approved; design Ready | REQ-003, REQ-008 (new), AC-011, AC-012, DEC-001, 004, 005, 007 | Approved: message on all runtimes + setup on add; removal message only; design written; Large / High |
| SR-003 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, AR-003, AR-004 | Design Ready (SR-002) | Design Ready (revised) | REQ-008, AC-004, AC-011, AC-012 | `RunWorkspaceSkills` single holder with `closed` + release order; per-name adds; Claude zero-skills case stated; added/removed in tracker terms |

## Revision Entries

### SR-001 — Per-runtime investigation and requirements baseline for live skill-list changes

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-460 (description and the 2026-11-13 comment) from `/project_task_manager`
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001…008, REQ-001…007, AC-001…010, SCN-001…005, DEC-001…006
- Scenario-basis or scenario-validity changes: N/A (baseline)
- Why this baseline was recorded: first coherent baseline for the user's decision
- Canonical sections changed: all (new)
- Supplemental artifacts added: `evidence/claude-skill-hot-reload-probe.mjs`, `evidence/claude-skill-hot-reload-probe-output.txt`, `follow-ups.md`
- Product design evidence incorporated: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending the user's answers to DEC-001, DEC-004, DEC-005
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification: N/A before design completion
- Applied handoff-rule outcome: none (approval hold in the Solution Designer's conversation with the user)
- Downstream and architecture-review impact: N/A
- Remaining gaps: U-001 (native re-listing on Codex/Grok/dsh/agy, needed only for option B); R-002 (native compaction) for design
- Next action: the user answers DEC-001, DEC-004 and DEC-005; then architecture design

### SR-002 — Approval, setup on add, and architecture design

- Phase and classification: Mixed, `Refinement` (user decisions) then design
- Triggering input: the user's conversation with the Solution Designer, 2026-11-13. Key points:
  - "is it actually possible?" (answered: yes for the skill; GitHub-type access needs a restart);
  - "we still want to materialize it";
  - removal "maybe just a simple message … your skill has been removed";
  - native system prompt not changed because of the cache; FU-006 sent to `/project_task_manager` at the user's request;
  - "let's consider add a new skill. If you think it's doable, then let's start your work".
- Triggering finding IDs: N/A
- Prior status: requirements Ready for Approval; no design
- Current status: requirements Approved (SR-002); design-spec.md Ready
- IDs affected:
  - DEC-001 decided (A + setup on add);
  - DEC-004 decided (restart; go-ahead on the recommendation);
  - DEC-005 decided (follow-up FU-005);
  - DEC-007 added (removal message only);
  - REQ-003 clarified; REQ-008 and AC-011/AC-012 added.
- Scenario-basis changes: none
- Canonical sections changed: requirements (Document Status, Requirements, AC, Scope, Decisions, Traceability, Readiness); investigation-notes (Architecture Investigation Findings); design-spec.md (new); follow-ups.md (FU-006 sent, FU-007 added)
- Supplements: unchanged
- Intended behavior changed: Yes (REQ-008 added; removal limited to a message). User-approved.
- Approval: User, 2026-11-13, conversation (quoted in the requirements doc)
- Design/review basis: first design
- Classification: `task_size: Large`, `architectural_risk: High` (mid-run shared-link lifecycle, a backend contract change for all runtimes, the restored-run seen rule, an integration grant read)
- Applied handoff-rule outcome: see `handoff-architecture-design-complete.md`
- Remaining gaps: U-001 (own-list pickup on Codex/Grok/DeepSeek/AGY; not required)
- Next action: route per the handoff rules

### SR-003 — Architecture review round 1 corrections

- Phase and classification: Design, `Design Impact`
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`, `architecture-review-revision-record.md`), Fail
- Finding IDs: AR-001 (blocking), AR-002, AR-003, AR-004
- Prior status: requirements Approved (SR-002); design Ready (SR-002)
- Current status: requirements unchanged and Approved; design Ready (SR-003)
- IDs affected: REQ-008, AC-004, AC-011, AC-012 (design only)
- Changes:
  - AR-001: the guard read the backend's `isActive()`, which on Claude and Codex stays true until cleanup ends (confirmed: `claude-session-manager.ts:129-140`, `claude-session-cleanup.ts:25-38`, `codex-agent-run-backend.ts:111-113`, `codex-thread-manager.ts:142`). `RunWorkspaceSkills` now holds a run's workspace links from preparation to release. It owns a `closed` fact and one in-flight add, and `release()` (close, await the add, release) is the only release path. Preparation lists and run-context lists are removed; `ProviderPreparationGuard.ownSkill` is removed. AGY needs no release ordering (per-run capsule, kept for resume).
  - AR-002: one name per acquisition; a failed name is logged, left out of the applied set and retried on the next save. AGY links one binding per call; its manifest lists only the names that succeeded.
  - AR-003: Claude run started with no skills: behavior stated in Risks (auto-execute approves; otherwise one approval until the next process generation); given to the live check.
  - AR-004: added and removed defined in the tracker's `skillDirs` terms; the notice is decided by the `seen` diff at delivery; AC-004 walked through.
- Canonical sections changed: design-spec (Solution basis, Task Size escalation trigger, Change Scope, Task Design Health, DS-001 and DS-003 narratives, Ownership Map, Interface Mapping, File Mapping, Removal Plan, Examples, Risks, Sequence, Guidance); investigation-notes (Architecture Investigation Findings correction); `docs/design-cases.md` Case 22 added (Recovery: design mistake the principles describe)
- Intended behavior changed: No. Approval unchanged (SR-002).
- Classification: unchanged, `Large` / `High`
- Downstream impact: architecture review round 2
- Next action: re-review by the architecture reviewer

#### SR-003 notes (no new round)

- 2026-11-13: architecture review ARCH-REV-002 `Pass` on SR-003 (informational; the reviewer handed off to `/software_engineering_team/implementation_engineer`). Recorded only; no forwarding.
- Factual correction after the pass: the design's Architecture Investigation Evidence row and one Task Design Health line still said "is active" guard. Both now point to DS-003's `closed` guard, as the reviewer noted. No design change.
