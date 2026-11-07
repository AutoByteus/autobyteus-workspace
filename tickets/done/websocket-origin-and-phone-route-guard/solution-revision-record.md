# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-403) | N/A | N/A | Approved (user, 2026-11-06) | BEH-001…008, REQ-001…008, AC-001…010 | Approved with DEC-001 = B, DEC-010 = keep |
| SR-002 | Design | Architecture design on the SR-001 basis | N/A | Requirements Approved; no design | Design Ready; Medium / High | All | Architecture Design Complete |
| SR-003 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, AR-003 | Design Ready (SR-002), review Fail | Design Ready; Medium / High | BEH-002, BEH-003; REQ-003…REQ-006; AC-004, AC-006 | Architecture Design Complete (revised) |

## Revision Entries

### SR-001 — Origin rule for every node WebSocket, phone WS allow-list; HTTP question to the user

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-403 (FU-001, FU-002 of autobyteus-394) from `/project_task_manager`
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Approved`; design starting
- IDs affected: all (baseline)
- Scenario basis: SCN-001…SCN-009 recorded; SCN-002 conditional on DEC-001
- Why recorded: first coherent baseline brought to the user
- Canonical sections: requirements-doc.md (all), investigation-notes.md (all), follow-ups.md (FU-001…FU-003)
- Supplements: `evidence/origin-probe/` added
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: approved by the user in the Solution Designer conversation, 2026-11-06. The user asked for the problem and recommendation, then for why the phone limit; recommendation "B and keep"; user: "thanks. i trust your professinoalism. because you understand my project". Baseline: SR-001 with DEC-001 = B (HTTP in scope) and DEC-010 = keep.
- Supplement approvals: N/A
- Design/review basis: N/A
- Classification: N/A (before design)
- Handoff: none yet
- Downstream impact: N/A
- Remaining gaps: None
- Next action: architecture design

### SR-002 — Architecture design: one origin gate, one WebSocket authorization rule

- Phase and classification: Design, `Refinement` (first design)
- Trigger: approved SR-001
- Prior status: requirements Approved, no design; current: design-spec.md `Ready`
- IDs affected: BEH-001…008, REQ-001…008, AC-001…010; spines DS-001…DS-003
- Canonical sections changed: design-spec.md (new); investigation-notes.md (Architecture Investigation Findings; meta)
- Supplements: `evidence/origin-probe/fastify-gate-probe.mjs`, `route-pattern-probe.mjs` added
- Intended behavior changed: No
- Approval impact: none; SR-001 approval applies unchanged
- Classification: task_size `Medium`, architectural_risk `High` (security boundary every request crosses; new refusal contracts and setting)
- Handoff: see handoff.md
- Remaining gaps: None
- Next action: route per handoff rules

### SR-003 — Design revision for ARCH-REV-001

- Phase and classification: Design, `Design Impact`
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`, round 1, Fail), findings AR-001, AR-002, AR-003; all verified against the code
- Prior status: design Ready (SR-002), review Fail; current: design Ready (SR-003)
- Changes:
  - AR-001: the MCP gateway's narrower origin rule for `/mcp/gateway` is recorded as deliberate and kept. The forbidden-bypass statement now forbids admitting an origin the node rule refuses. DS-001 shows the hook order (gateway hook → CORS → gate → route authorization), with the plugin registered after `registerMcpGatewayRoutes`. `studio-server-http-contract.integration.test.ts` must stay green unchanged.
  - AR-002: the request gate logs one redacted line (code, URL, origin for origin refusals) for every refusal it replies with, incl. `/graphql` and peer WS phone refusals; AC-006 test extended.
  - AR-003: the peer WS refuses a phone query credential with `PHONE_ACCESS_ROUTE_REFUSED`; existing peer HTTP bearer refusal unchanged; test case added.
  - Non-blocking: call-site count corrected to 13; CORS delegator in callback form.
- Canonical sections changed: design-spec.md (Current-State Read, evidence, Change Scope, DS-001/DS-002, ownership, boundary map, reuse, off-spine, file and test mapping, sequence, guidance); investigation-notes.md (architecture findings)
- Intended behavior changed: No. Requirements SR-001 approval applies unchanged (each point traces to REQ-003…REQ-006 / AC-004, AC-006).
- Classification: unchanged, `Medium` / `High`
- Review impact: re-review of AR-001…AR-003 by the architecture reviewer
- Next action: hand back to the architecture reviewer
