# Solution Revision Record — remote-node-runtime-sign-in

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from the Project Task (2026-10-21) | N/A | N/A | Approved (Solution Designer within the direction, user informed) | BEH-001…BEH-006, REQ-001…REQ-007, AC-001…AC-009 | Requirements approved |
| SR-002 | Design | Architecture design on SR-001 | N/A | N/A (no design) | Design Ready; Medium / Low | All | Design complete; routed by handoff rules |
| SR-003 | Evidence | User conversation 2026-10-21 (UD-001) | N/A | Approved (SD within direction) | Approved, scope confirmed by the user | DEC-002, FU-002 | Scope confirmed; FU-002 withdrawn; no REQ/AC/design change |
| SR-004 | Evidence | User conversation 2026-10-21 (UD-002) | N/A | Approved, scope confirmed | Approved, scope confirmed | FU-002 | FU-002 reinstated as a follow-up to send; no REQ/AC/design change |

## Revision Entries

### SR-001 — Remote-node sign-in through the node's own browser

- Phase and classification: Requirements, Initial Baseline
- Triggering input: Project Task from `/project_task_manager` (run `project_task_manager_21a48907070a400cb84ae3c055534692`) with three user screenshots
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: Approved
- IDs affected: BEH-001…BEH-006, UC-001…UC-003, REQ-001…REQ-007, AC-001…AC-009, SCN-001…SCN-006, DEC-001…DEC-006
- Scenario basis: SCN-001…SCN-004, SCN-006 Supported Normal; SCN-005 Supported Explicit Edge (any reachable AutoByteus node may be registered)
- Why recorded: first coherent baseline, used for approval
- Sections: all of `requirements-doc.md`; `investigation-notes.md` E-01…E-11
- Supplements: `evidence/SD-probe-remote-signin.sh` (evidence only)
- Product design: none requested
- Intended behavior changed: Yes (new behavior relative to the shipped `runtime-lifecycle-review` D-3/REQ-007 for sign-in only; Update unchanged)
- Approval: Solution Designer within the Task's direction ("sign it in on a Docker/remote node … using the node's own browser (seen through VNC) or another workable flow"); no `Needs user` decision; the user was informed in the Solution Designer's conversation on 2026-10-21 and in the handoff file
- Design/review basis invalidated: N/A
- Classification: N/A before design
- Remaining gaps: R-01/R-02 (real-account completion) for final verification
- Next action: architecture design

### SR-002 — Design: node fact + node access

- Phase and classification: Design, Initial Baseline
- Trigger: approved SR-001
- Prior status: N/A
- Current status: `design-spec.md` Ready
- IDs affected: all REQ/AC
- Sections: `design-spec.md` (new); `investigation-notes.md` A-01…A-04
- Intended behavior changed: No
- Approval impact: none (design realizes SR-001 unchanged)
- Classification: task_size Medium (two subsystems, ~10 source files, existing owners); architectural_risk Low (one additive read-only GraphQL field owned by `AgentRuntimeStatusService`, no persistence/concurrency/deployment/security-boundary change, own node untouched)
- Applied handoff-rule outcome: recorded in `handoff.md`
- Downstream impact: implementation starts from a failing web unit test (design-spec Guidance); real Docker check uses `evidence/SD-probe-remote-signin.sh` on a branch-built image
- Remaining gaps: R-01, R-02, R-03 (design-spec Risks)
- Next action: route per handoff rules

### SR-003 — User confirms scope; headless follow-up withdrawn

- Phase and classification: Evidence, Refinement (clarification)
- Trigger: user in the Solution Designer conversation, 2026-10-21: asked why the Docker node (which has a display) gets no Sign in; answered: the container is correct (`DISPLAY=:99`, `BROWSER` bridge, Chromium) and the cause is the web gate `isOwnNode = isEmbeddedWindow` (`AgentRuntimesManager.vue` line 97, `AgentRuntimeRow.vue` line 69). User: "this feature should be available for all node. not just embeded node"; after hearing the scope (every node with a screen; headless stays status only): "thats fine for now. no need for the follow up."
- IDs affected: DEC-002 (now user-confirmed), UD-001 (new), FU-002 (withdrawn, not sent)
- Intended behavior changed: No; REQ-001…REQ-007 and AC-001…AC-009 unchanged
- Approval impact: the SR-001 basis now also carries the user's explicit confirmation (UD-001)
- Design impact: none; `design-spec.md` SR-002 stands; implementation continues
- Next action: none until a downstream result returns

### SR-004 — Headless sign-in recorded as a follow-up

- Phase and classification: Evidence, Refinement (clarification)
- Trigger: user, 2026-10-21 (UD-002): "you can actually create a follow up. no need to do it for now"
- IDs affected: FU-002 (reinstated: Not sent, to be sent with FU-001 when the ticket leaves the team), UD-002 (new), DEC-002 wording
- Intended behavior changed: No; REQ/AC and design unchanged
- Approval impact: none
- Next action: none until a downstream result returns
