# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-520) | N/A | N/A | Approved | BEH-001..008, REQ-001..009, AC-001..010 | Approved by the Solution Designer within the direction, user informed |
| SR-002 | Design | Architecture design on SR-001 | N/A | No design | Ready | REQ-001..009 | Design spec ready; Medium / High |
| SR-003 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, S-1, S-2 | Ready (SR-002), review Fail | Ready | REQ-003, REQ-005, BEH-004, BEH-005, BEH-007 | Index check reads `version_tag` from prepare-release; dry-run check before any push; package jobs read checked digests via `needs`; timings are GitHub's run record |

## Revision Entries

### SR-001 — Requirements baseline: native per-architecture Server Docker build, no layer cache, build-only mode

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-520 (founder's request of 2026-11-17 relayed by the beta.9 delivery engineer; FU-002 of autobyteus-519)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Approved`
- IDs affected: SCN-001..004, BEH-001..008, UC-001..004, REQ-001..009, AC-001..010, DEC-001..007
- Scenario-basis changes: N/A (baseline); SCN-003 build-only is new and supported by the Task
- Why recorded: first coherent baseline
- Sections: all of `requirements-doc.md`; `investigation-notes.md` created
- Supplements: None
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline). Evidence corrected the Task's leads: the "existing build-only mode" is the Desktop's, so the Server Docker workflow needs its own (REQ-005); a registry cache was considered and not adopted on measured data (DEC-001); a `$BUILDPLATFORM` split is not needed (DEC-007); the package job's release wait goes to 60 min (DEC-005)
- Approval: approved by the Solution Designer within the Task's direction (no `Needs user` decision; no scope, cost, security or irreversible decision; the release itself still needs the founder's word); the user was informed in this conversation on 2026-11-17
- Supplement approvals: N/A
- Design/review basis invalidated: N/A
- Classification: N/A before design
- Handoff: N/A
- Downstream impact: architecture design may start
- Remaining gaps: U-001 native arm64 build time (validated by AC-001)
- Next action: architecture design

### SR-002 — Design: build matrix on native runners, merge by digest, package from the checked digest

- Phase and classification: Design, `Initial Baseline` (design)
- Trigger: approved SR-001
- Triggering finding IDs: N/A
- Prior status: requirements Approved, no design
- Current status: requirements Approved (unchanged), design `Ready`
- IDs affected: DS-001..004 mapped to BEH-001..008
- Scenario-basis changes: None
- Why recorded: completed design
- Sections: `design-spec.md` created; investigation notes extended (Architecture Investigation Findings)
- Supplements: None
- Product design evidence: N/A
- Intended behavior changed: `No`
- Approval: SR-001 basis unchanged; design approval not required by the direction
- Supplement approvals: N/A
- Design/review basis invalidated: N/A
- Classification: `task_size=Medium`, `architectural_risk=High` (release/deployment pipeline publishing public tags and signed packages; parallel job graph; guarantee mechanism changed from tag to checked digest; new registry-pushing mode)
- Handoff: recorded in `handoff-architecture-design-complete.md`
- Downstream impact: route per handoff rules
- Remaining gaps: U-001; R-001, R-002 accepted
- Next action: hand off `Architecture Design Complete`

### SR-003 — Design revision for ARCH-REV-001: version tag from prepare-release, check before push, checked digests through `needs`, run timings from GitHub

- Phase and classification: Design, `Design Impact`
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`, round 1, Fail)
- Triggering finding IDs: AR-001 (Medium), AR-002 (Low); suggestions S-1, S-2 adopted
- Prior status: requirements Approved (SR-001); design Ready (SR-002), review Fail
- Current status: requirements Approved (SR-001 basis, REQ-005 wording clarified); design `Ready`
- IDs affected: REQ-003, REQ-005; BEH-004, BEH-005, BEH-007; AC-001, AC-004; DS-001, DS-003
- Scenario-basis changes: None
- Why recorded: resolve review findings
- Sections changed: design-spec Primary Execution Spines, Spine Narratives, Ownership Map, Off-Spine Concerns, Boundary Encapsulation Map, Interface Boundary Mapping, target job layout, Concrete Examples, Change Sequence steps 4, 6, 7; requirements-doc REQ-005 wording
- Resolution:
  - AR-001: `prepare-release` writes `version_tag` (the first line of `tags`: `IMAGE:<normalized_tag>` or `IMAGE:<normalized_tag>-zh`); `publish-image` inspects `version_tag` after pushing `tags`, never a name rebuilt from `normalized_tag`; tests add default/zh stable/beta `version_tag` cases and a zh index-check case.
  - AR-002: option (a). Build-only timings are GitHub's own job and step timings, read with `gh run view <run-id> --json jobs` (as AC-001 already verifies); the "per-job timing table" claim is removed; no extra job or `actions: read`.
  - S-2: the dry-run index is checked in both modes before any tag is pushed; publish mode checks the pushed version tag again.
  - S-1: `publish-image` outputs `amd64_digest`/`arm64_digest` after the checks; package jobs read them through `needs` and no longer download the artifact.
- Supplements: None
- Intended behavior changed: `No` (REQ-005's "reports its step timings" now names where the timings are; the intent, timings available for the before/after comparison, is unchanged)
- Approval impact: none; SR-001 approval applies
- Design/review basis invalidated: SR-002 review basis; re-review of SR-003 needed
- Classification: unchanged, `Medium` / `High`
- Handoff: `handoff-architecture-design-complete.md` (SR-003 section)
- Downstream impact: architecture re-review
- Remaining gaps: U-001; R-001, R-002 accepted
- Next action: hand SR-003 to `/architecture_reviewer`

#### Review outcome recorded on SR-003 (2026-11-17)

- ARCH-REV-002: `Pass` on SR-003 (`design-review-report.md`, `architecture-review-revision-record.md`); AR-001 and AR-002 resolved, S-1 and S-2 adopted; classification `Medium` / `High` confirmed. The reviewer handed the package to `/implementation_engineer`; no forwarding by the Solution Designer.
- Editorial correction (no design change): design-spec Change Sequence step 3 said "digest download" for the package job; it now matches the target layout (checked digest from `needs.publish-image.outputs`), as the reviewer's note to implementation already says.
