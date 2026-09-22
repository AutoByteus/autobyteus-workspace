# Solution Revision Record

Package: `OFFLINE-ORG-TEAM-WORKSPACE-20260922`

## Revision index
| Revision | Phase | Trigger | Prior status | Current status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User request for analysis, 2026-09-22 | N/A | Ready for Approval | BEH-001–006, REQ-001–007, AC-001–006, SCN-001–004 | Analysis complete; proposed requirements awaiting explicit approval |
| SR-002 | Requirements | Screenshot scope confirmation + “continue please” | Ready for Approval | Approved | BEH-001,002,006, REQ-001,002, AC-001,002, DEC-001,002 | Approved baseline; existing UI location confirmed |
| SR-003 | Design | Approved SR-002 + additional E20–E30 architecture investigation | Approved requirements; no design | Architecture Design Complete | All BEH/REQ/AC/SCN IDs | Medium / High; rule-selected /architecture_reviewer |
| SR-004 | Design Impact | ARCH-REV-001 / AR-F001; source trace AR-P001 and E31–E36 | SR-003 review Fail — Design Impact | Revised Architecture Design Complete; re-review pending | BEH-004, REQ-005, AC-005; SCN-001/004 | Explicit unavailable Files target and whole tree/editor gate; Medium / High retained |

## SR-001 — Stopped mounted-Team workspace edit
- Classification: Initial Baseline; no previous task requirements or design.
- Trigger: user wants a Team in an offline Org to switch workspace, with all children inheriting and later messages using it; suspects migration unnecessary.
- Investigation: pinned latest origin/personal in isolated branch; examined launch resolver/persistence, existing stopped model editor/API, root lifecycle gate, memory layout, restore/provider cwd wiring, task sources, and canonical UI adoption; isolated current-owner probe passed.
- Finding IDs: E01–E19; DEC-001/002; RISK-001–004 in investigation notes.
- Current requirements: Ready for Approval. Design: N/A — not started, no approved basis.
- Scenario basis: supported launch→stop→Settings→Send, with new workspace-edit action explicitly requested; historical tasks kept separate.
- Canonical sections: initial complete requirements and investigation baseline. Supplement added: non-normative `evidence/current-owner-probe.json`.
- Intended behavior: new proposed Team workspace edit, all configured child propagation, continuity and no project-file move. Root/global preference editing excluded. Distinct saved child paths explicitly overwritten by proposed “all children” rule, pending confirmation.
- Approval: none; original request asked for analysis. SR-001 requires explicit approval before design.
- Product artifacts and behavior-defining supplements: N/A — not requested/applicable.
- Prior review artifacts: N/A — not applicable. No invalidated architecture review.
- Task-size/risk: N/A until completed approved design; bounded cross-layer feasibility found, not a trivial UI unlock.
- Routing: see `analysis-result.md`; routine approval hold, no implementation-ready claim.
- Remaining gaps: user confirmation of SR-001 scope; real provider cross-directory resume validation remains future technical work.
- Next action: user review/clarification/explicit requirements approval; then Solution Designer architecture phase if requested to proceed.

## SR-002 — User confirmation and screenshot surface
- Phase/classification: Requirements / Refinement and approval capture.
- Trigger: USER-20260922-SCOPE, user identifies mounted-Team Workspace Directory in screenshot, confirms all Team Agents update, then asks “continue please” after interrupted turn.
- Prior status: SR-001 Ready for Approval, design N/A. Current: Approved requirements SR-002; architecture phase authorized.
- Changed sections: requirements status, UI surface, decision resolution and readiness; investigation screenshot/approval evidence.
- Intended behavior changed: No; confirms proposed mounted-Team/all-configured-children scope. Scenario IDs unchanged; all prior preservation constraints remain.
- Supplement: evidence/user-subteam-workspace-control.png copied from user attachment; existing-surface reference only, not pixel-perfect Product final design. No Product request.
- Approval basis: SR-001 behavior as confirmed and clarified into SR-002; exact user wording in requirements USER-20260922-SCOPE. Approval is not implementation completion or finalization authorization.
- Design/review: N/A before design completion; no prior reviewed design invalidated.
- Size/risk: N/A before completed design.
- Remaining risk: provider cross-directory resume validation, no newly open product decisions.
- Next: additional architecture investigation and design, then rule-selected handoff.

## SR-003 — Completed architecture design
- Phase/classification: Design / Initial Design on approved SR-002.
- Trigger: screenshot confirmation and “continue please”; additional E20–E30 investigation after approval.
- Prior: Approved SR-002 requirements, design N/A. Current: Approved requirements unchanged, Ready design; Architecture Design Complete.
- IDs: BEH-001–006, REQ-001–007, AC-001–006, SCN-001–004. Scenario validity unchanged.
- Canonical changes: design-spec.md initial full design; investigation architecture evidence and risk/transition decisions; current requirement revision pointer only.
- Intended behavior changed: No. Exact approval remains SR-002 / USER-20260922-SCOPE. Screenshot copy is current-surface evidence, not a new normative Product supplement.
- Decisions: one composed stopped-Org save, server-owned configured-child propagation, independent workspace/model drafts, guarded metadata publication, unchanged schema-v1 and restore/task owners. No migration, project-file move or session reset.
- Refactor: broaden/rename Org config contract and shared editor orchestration, remove old Org model-only aggregate aliases; actual model planners and standalone APIs retained.
- Classification: task_size=Medium; architectural_risk=High for changed API/persistence invariant, filesystem-target publication and real-provider continuation uncertainty. Content volume not used for classification.
- Prior review artifacts: N/A — not applicable. Design ready for rule-selected independent review; not a pass or implementation result.
- Remaining risks: real cross-directory native/Codex/Claude continuation and browser/configuration behavior require downstream execution; no claimed passes. No product decision or workspace blocker remains.
- Result/routing: solution-handoff.md; get_handoff_rules selected `/architecture_reviewer` for architectural_risk=High; only that recipient is to be notified.
- Next expected output: independent architecture review; reviewer owns its pass/failure result and onward route.

## SR-004 — Complete the unavailable Files target boundary
- Phase/classification: Design / Design Impact recovery. Trigger: Architecture Reviewer ARCH-REV-001, round 1, AR-F001 (Medium, blocking) and material premise AR-P001. Report and review history are sibling `design-review-report.md` and `architecture-review-revision-record.md`.
- Prior: approved requirements SR-002, design SR-003 reviewed **Fail / Design Impact**. Current: approved requirements unchanged, revised SR-004 **Architecture Design Complete**, ready for independent re-review. AR-F001 is addressed in design, not independently closed; previous review is not retroactively a Pass.
- Affected IDs: BEH-004 / REQ-005 / AC-005, related REQ-004 and SCN-001/004. Supported edge within the existing target-correctness contract, not a new scenario/scope request. Intended behavior and behavior-defining supplements unchanged; exact approval remains SR-002 / USER-20260922-SCOPE. No renewed approval required.
- Investigation: E31–E36 confirms null→undefined in parent, missing-ID fallback in tree/composable/editor, retained draft after ordinary History selection, editor write routing and existing unmount cleanup. Source-traced only; no live reproduction or executable pass claimed.
- Core design sections revised: DS-002 production-path map, spine inventory/narrative, current-state/design-health assessment, owner/dependency/interface mapping, explicit tri-state Files contract/lifecycle, removal policy, capability/file allocation, concrete example, sequencing, tests and risks. Canonical publication includes retry of unresolved paths on read/reopen. Requirements changed only current cumulative revision pointer.
- Decision: RightSideTabs maps missing selected Org workspace to null; FileExplorerLayout consumes null by omitting/unmounting **both tree and editor**, including their action/shortcut lifecycle. Omitted target retains existing defaulting elsewhere. No launch-draft clearing, global workspace rewrite, new config transaction, schema/data migration, history mutation or runtime changes.
- Regression intent: retain unrelated draft A; normal History selects stopped Org; Save B with metadata failure; assert unavailable placeholder, no A file display/new reads/writes, cleanup when Files was already mounted, tab reactivation still unavailable, and canonical metadata retry to explicit B. Draft/conversation identity and Terminal null behavior remain protected.
- Classification: task_size=Medium, architectural_risk=High retained. Delta adds two existing presentation owners plus focused tests/text, not a new subsystem. Existing aggregate save, propagation, atomic readback and provider risks persist.
- Artifacts updated: design-spec.md, investigation-notes.md, requirements-doc.md pointer, this history and full solution-handoff.md. Reviewer-owned artifacts remain unchanged. Original screenshot/probe/historical analysis preserved.
- Remaining risks: independent closure of AR-F001; implementation/browser/API-E2E and real native/Codex/Claude cross-directory resume still required. No source implementation, review pass or validation completion is claimed.
- Result/routing: see solution-handoff.md; fresh get_handoff_rules lookup after persistence selected only `/architecture_reviewer` for revised Architecture Design Complete / High risk. Next expected output is independent re-review of SR-004 against approved SR-002 and explicit disposition of AR-F001; reviewer owns onward routing.
