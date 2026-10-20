# Solution Revision Record — mcp-sdk-v2-migration

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-182) | N/A | N/A | Ready for Approval | BEH-001…010; REQ-001…012; AC-001…011 | Presented to the user with DEC-001, DEC-002 |
| SR-002 | Requirements | User approval in the Solution Designer conversation, 2026-10-20 | N/A | Ready for Approval | Approved | DEC-001, DEC-002; REQ-013, AC-012 added | Approved with the user's condition |
| SR-003 | Design | Architecture investigation and design | N/A | No design | Design Ready; `Medium` / `High` | DS-001…003; all REQ/AC mapped | Architecture Design Complete → architecture review |
| SR-004 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002; RR-001/MP-001, FU-003 (non-blocking) | Design Ready (SR-003) | Design Ready; `Medium` / `High` (unchanged) | BEH-008, BEH-009; REQ-007/AC-007, REQ-008/AC-008; R-003 | Corrected → architecture re-review |

## Revision Entries

### SR-001 — Requirements baseline for the v2 client migration

- Phase and classification: Requirements, `Initial Baseline`
- Triggering evidence: Task `autobyteus-182` from `/project_task_manager` (2026-10-20); investigation and probes of 2026-10-20 (`investigation-notes.md`, `probes/`)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not yet created
- IDs affected: BEH-001…BEH-010, REQ-001…REQ-012, AC-001…AC-011, SCN-001…SCN-005, DEC-001…DEC-009
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline for the user's approval of the migration plan (Task Done-when)
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md` (requirements investigation)
- Supplements: `probes/` (evidence only)
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline). Differences from today proposed for approval: DEC-003 (error wording), DEC-004 (all pages listed)
- Approval impact: pending the user's approval; DEC-001 and DEC-002 marked `Needs user`
- Supplement approvals: none needed
- Design/review basis: N/A
- Classification: N/A before design
- Handoff: none yet; approval asked in the Solution Designer conversation
- Downstream impact: none until approval
- Remaining gaps: the user's answers to DEC-001 and DEC-002
- Next action: on approval, architecture investigation and `design-spec.md`, then classification and routing

### SR-002 — User approval with a condition

- Phase and classification: Requirements, `Refinement` (approval)
- Trigger: the user's reply in the Solution Designer conversation, 2026-10-20: "I think you understand that you did a deep investigation, right? So I trust that you can make a good plan. Of course, if something is broken because we upgraded library and the but the protocol is no longer compatible, then of course we have to improve, right? We might have to update our protocol to conform to the newest, but if you think that it will work, then I trust your reasonable decision." This followed my recommendations and two explanations ("what is your recommendations…", "what does this mean").
- Prior status: `Ready for Approval`; current: `Approved`
- IDs affected: DEC-001 decided (now, before FU-3), DEC-002 decided (`legacy`, with the condition); REQ-013 and AC-012 added for the condition; Out Of Scope wording aligned
- Intended behavior changed: No, apart from the explicit condition (a protocol-caused failure is fixed in this ticket)
- Approval: the user, 2026-10-20; exact approved baseline: `requirements-doc.md` at SR-002
- Supplements: none
- Design/review basis: N/A (no design yet)
- Follow-ups recorded: FU-001 (opt into 2026-07-28 negotiation)
- Next action: architecture design

### SR-003 — Architecture design

- Phase and classification: Design, `Initial Baseline` of the design
- Trigger: approved requirements SR-002; architecture investigation 2026-10-20 (investigation notes, Architecture Investigation Findings; `probes/v2-test-server-shapes-probe.mjs`)
- Prior status: no design; current: `design-spec.md` `Ready`
- IDs affected: BEH-001…010 mapped to DS-001…003; REQ-001…013 / AC-001…012 mapped to files and tests
- Canonical sections: `design-spec.md` (new); `investigation-notes.md` (Architecture Investigation Findings, meta, R-006); `follow-ups.md` (FU-001, FU-002)
- Intended behavior changed: No
- Approval impact: none (design within SR-002)
- Classification: `task_size=Medium`, `architectural_risk=High`. High because of the blast radius (a major-version library under every runtime's MCP path), new runtime packages in the packaged app and Docker image, and the residual uncertainty R-002/R-003, which only validation settles. Wire protocol, ownership, contracts and persistence are unchanged.
- Handoff: `get_handoff_rules` → rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer` (see `handoff-sr-003.md`)
- Remaining gaps: none for design; R-002/R-003 are validation items
- Next action: independent architecture review

### SR-004 — Design corrections after ARCH-REV-001

- Phase and classification: Design, `Design Impact` (evidence and design text; no requirement change)
- Trigger: `/software_engineering_team/architecture_reviewer` ARCH-REV-001 = Fail (`design-review-report.md`, `architecture-review-revision-record.md`); finding IDs AR-001 (Medium), AR-002 (Low); non-blocking RR-001/MP-001, the AC-001 comment note, FU-003
- Prior status: design `Ready` at SR-003; current: design `Ready` at SR-004
- AR-001 (accepted):
  - The DS-002 narrative, the Change Scope "left alone" reason and the evidence rows now describe the real path: the routes' `mcp-protocol-version` check answers a v2 `auto` client's `server/discover` (`2026-07-28`) with HTTP 400 + `-32600` before any dispatcher.
  - New probe `probes/route-protocol-header-auto-fallback-probe.mjs` with that exact check: the client falls back to `initialize`, legacy era, 2025-11-25, list and call work.
  - The AC-007 tests run against the real routes and assert era, version, list and call; the 400-then-`initialize` assertion is optional.
- AR-002 (accepted, one correction):
  - The Removal Plan names every O-002 item with line evidence and adds `callSdkFunction` (only caller L345).
  - The reviewer's note that the `asObject` import becomes unused is not correct: it is still used at L478 (`tryGetSupportedModelsFromQueryControl`). The import stays, and this is recorded in the Removal Plan.
  - The AC-008 grep is narrowed (Change Sequence step 7). The AC-008 Verification wording in `requirements-doc.md` is aligned: this is wording only, no behavior change, no renewed approval.
- Non-blocking items taken:
  - RR-001 added to R-003 (design Risks, investigation notes); the parity run records each server's `outputSchema` `$schema`.
  - AC-001 now says the grep also catches v1 names in code comments, which must be reworded, and that "the lockfile" is the root `pnpm-lock.yaml` (FU-003 leaves `autobyteus-ts/pnpm-lock.yaml` alone).
- Intended behavior changed: No. The requirements basis stays SR-002 (user-approved); AC-001/AC-008 wording clarified only
- Classification: unchanged, `task_size=Medium`, `architectural_risk=High` (confirmed by the review)
- Authorities: the design principles were re-read after the 2026-10-20 update notices. The changes restore requirement wording strength and do not affect this design.
- Handoff: `get_handoff_rules` → the architecture-review rule (High risk) → `/software_engineering_team/architecture_reviewer` for re-review of AR-001/AR-002 (`handoff-sr-004.md`)
- Next action: architecture re-review

#### Review outcome for SR-004 (informational)

- 2026-10-20: ARCH-REV-002 = **Pass** (`design-review-report.md`, `architecture-review-revision-record.md`). AR-001 and AR-002 are resolved; the reviewer withdrew the round-1 `asObject` claim. The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`. The Solution Designer does not repeat that handoff.
