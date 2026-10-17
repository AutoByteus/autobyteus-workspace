# Approval Record — SR-012

- Package: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
- Date: 2026-10-13. Approver: Solution Designer within the user's explicit latest direction, under skill step2.
- Baseline: canonical requirements-doc.md SR-012, REQ-001–019/AC-001–019; supported SCN-001–006/008–013; SCN-007 excluded; no behavior-defining supplements.
- Readiness: intended/preserved behavior, stable scope/ACs and verification intent explicit; no Needs user decision within this approved baseline. Technology feasibility and implementation readiness are separate.
- User basis (latest exact excerpts): “I don't want to have a setup tool. I want to have a service”; “working on native Mac and working on Linux … working inside Docker”; “the setup should be as simple as possible”; “you should design a solution and then implement it now.” Preceding direction explicitly selected a configurable source folder and hosting choices.
- Decision: all-three-mode scope and service-first experience are settled by this direction, not held for redundant generic approval. First use configures as part of a persistent service; normal OS/disruption approvals remain mandatory. Engine/security/source qualification not implied by user confidence in earlier experiments.
- Exact informing conversation message:

I’ve recorded your direction: **one persistent shared-folder service**, with a simple first-run flow, native Mac/Linux or Docker hosting, and a configurable storage folder. Selected local Docker nodes must need no separate setup commands.

I’m checking the new hosting modes now. The existing agent tests remain valid, but they don’t prove those additional modes yet.

- Sequencing: separate async question proposes moving physical two-computer proof from preimplementation to predelivery because remote access is absent. No answer as of this record; REQ-016/AC-016 unchanged. No physical proof waiver is approved.
- Exclusions preserved: no public service/SDK/custom filesystem, parked agent collaboration, private-state sharing, new GUI, project migration or live changes without approval.
- Prior approvals SR-004/SR-009 preserved at their own basis. SR-011 proposal is superseded, not retroactively approved. Evidence-only SR-010 unaffected. No completed design/review/implementation/delivery claim.
