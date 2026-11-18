# Solution Revision Record — autobyteus-524 round 2 (`native-follow-ups-524-r2`)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Round 2 scope set by the founder (2026-11-18): FU-006, FU-007 | 515 FU-006/FU-007 (+ family rows) | N/A (round 1 = `native-follow-ups-524`, finalized `c0869d58e9`) | Requirements Approved (within direction); design Ready; Small / Low | BEH-001/002; REQ-001…003 | Direct route to implementation |
| SR-002 | Design | Implementation IR-001 / DI-001 | DI-001 | Design Ready (SR-001) | Design Ready (revised); Small / Low | DS-001; REQ-003 protected | Caller of the shutdown stop moved to the process-shutdown owner; back to implementation |

## Revision Entries

### SR-001 — Round 2: hide `dsh` in the runtimes E2E; no OS-watch close at shutdown

- Phase and classification: Mixed, `Initial Baseline`
- Triggering user feedback: the founder in the Solution Designer's conversation, 2026-11-18: approval mode "every tool asks ... make it simple" (FU-004/FU-005: no change; no Claude change) and "only do the two and three" (FU-006, FU-007)
- Triggering finding IDs: 515 FU-006, FU-007; family: 496 FU-006 (=512), 483 FU-002 (=517), 448 FU-001/FU-009 (=526), 493 FU-003/FU-005 (=527)
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements Approved; design Ready
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001/002, REQ-001…003, AC-001…004, SCN-001/002, DEC-001/002
- Scenario-basis or scenario-validity changes: N/A
- Why this baseline or revision was recorded: round 2 of the Task
- Canonical requirements, investigation and design sections changed: all created
- Supplemental artifacts added, changed or removed: `evidence/built-server-stop-probe.mjs`, `built-server-stop-probe-with-timings.mjs`, `RF-002-stop-step-timings.jsonl`, `RF-003-watcher-close-timings.jsonl`
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: `Yes` (faster stop; test isolation)
- Approval impact: Solution Designer within the founder's scope; founder informed 2026-11-18
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: `Small` / `Low`
- Applied handoff-rule outcome / result-file reference: rule "Small or Medium and Low" → `/implementation_engineer`; `handoff-implementation.md`
- Downstream and architecture-review impact: none
- Remaining gaps, assumptions or blocked decisions: ASM-001
- Next action: implementation

### SR-002 — The exit decision moves to the process-shutdown owner (DI-001)

- Phase and classification: Design, `Design Impact`
- Triggering report: implementation IR-001 / DI-001 (`implementation-revision-record.md`), the design's own escalation trigger
- Triggering finding IDs: DI-001
- Prior authoritative requirements/design status: requirements Approved; design SR-001 Ready
- Current authoritative requirements/design status: requirements unchanged; design revised, Ready
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: none changed; REQ-003 protected (SR-001's wiring would have left OS watches open in every in-process test server and in a failed startup that runs on)
- Why: SR-001 counted the callers of `feed.close()` / `skillUpdateNotices.close()` (one function) but not the callers of that function, `closeProcessResources` (`build-studio-server.ts:302, 451, 504`): Fastify's `onClose` runs it for the 120 test files' in-process servers. Verified at `0570c47fd9`.
- Canonical sections changed: design spec Solution basis, Current-State Read, Task Size rationale, escalation trigger, Intended Change, Change Scope, Primary Execution Spine, Ownership Map, Final File Mapping, Examples, Change Sequence step 2; investigation notes Source Log (the wrong caller row corrected)
- Design case added: `docs/design-cases.md` Case 23 (a caller check that stopped one level up)
- Intended behavior changed: `No`
- Approval impact: none (design-only)
- Post-design classification: unchanged, `Small` / `Low`
- Applied handoff-rule outcome: reply to `/implementation_engineer` (DI-001 returns to the same implementation round)
- Next action: implementation of FU-007 on SR-002
