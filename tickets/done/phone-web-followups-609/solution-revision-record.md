# Solution Revision Record

## SR-001 (2026-11-22)

- Trigger: autobyteus-609 from `/project_task_manager`, with the PM comment absorbing autobyteus-575.
- Prior status: N/A. Current status: requirements Approved; design Ready.
- Affected IDs: BEH-A … BEH-J, REQ-A … REQ-J, AC-A … AC-J, SCN-A … SCN-J, DEC-001 … DEC-008.
- Canonical sections: all sections of `requirements-doc.md`, `investigation-notes.md` and `design-spec.md` (new).
- Approval: Solution Designer within the direction; user informed in conversation 2026-11-22. DEC-002 (links only), DEC-005 ("Stopped") and DEC-007 (re-read on stop) were named to the user.
- Design: D-A … D-J, classified `Large` / `High`:
  - GraphQL `summaryArgs` becomes JSON
  - a shared contract export
  - REST workspace lookup
  - build inputs
- Routing impact: independent architecture review.
- Remaining gaps: FU-001 (the unknown hop for MSP-59), FU-002 (two status icon owners).

## SR-002 (2026-11-22)

- Trigger: ARCH-REV-001, Fail, Design Impact (`design-review-report.md`).
  - AR-001 (blocking): D-I's re-read cannot work, because the task view answers `inactive` for a stopped run. The existing 2 s retry is unbounded for a stopped run.
  - N-1 (non-blocking): resolve the root through the workspace metadata when `workspaceRootPath` is empty.
  - Non-blocking: two E consumers were missing.
- Prior status: requirements Approved (SR-001); design Ready, then failed review. Current status: requirements Approved (SR-002); design Ready.
- Affected IDs: REQ-I (runtime scope: streaming runtimes; no 2 s polling of a stopped run), QR-1, ASM-1 (corrected), DEC-007, AC-I (unchanged outcome), Out of scope (Codex snapshot list).
- Canonical sections changed:
  - requirements: REQ-I, QR-1, ASM-1, DEC-007, Out of scope
  - design: evidence table, behavior map row, DS-I in the inventory, spine, narrative and local spine, ownership, off-spine concerns, dependency rules, interface table, reuse, file mapping, example, tradeoffs, risks, implementation guidance; E derived consumers; H root fallback
  - investigation notes: the SR-002 evidence section
- Approval: Solution Designer within the direction (the outcome of REQ-I is unchanged; scope narrowed to the runtimes the report and the fix concern). User informed 2026-11-22.
- Design: D-I now ends running rows as `run_ended` in the task store when the panel view observes the run go from live to Offline. No read, and no polling while stopped. A re-read happens when the run is live again.
- Classification: unchanged, `Large` / `High`.
- Routing impact: architecture review of SR-002.
- Design case: added to `docs/design-cases.md` Case 5 (ASM-1 validated against `list()`, not the read used).
- Remaining gaps: FU-001, FU-002.

Review note: ARCH-REV-002 passed SR-002 (2026-11-22, `design-review-report.md`). The reviewer routed it to `/implementation_engineer`. N-2 is recorded as FU-003.

## SR-003 (2026-11-22)

- Trigger: implementation question on REQ-F. On the phone, 576's relative link in a Markdown file opens nothing visible (MSP-44 phone `opened:false` ×3).
- Kind: evidence clarification. No intended behavior of this ticket changes, and the design is unchanged.
- Affected IDs: REQ-F (phone part recorded, not asserted), DEC-009 (new), investigation notes F (corrected).
- Approval: Solution Designer within the direction; user informed. No renewed review: the design and its scope are unchanged.
- Remaining gaps: FU-004 (new), plus FU-001…FU-003.
- Accepted from implementation: the MSP-44 fixture uses `../../out.md` (leaves the root; `../out.md` from `headings-480/` is inside it), and MSP-46 now follows only the missing heading (`other.md` in a conversation is a run-relative file link under D-H, covered by its own case).

## SR-004 (2026-11-23)

- Trigger: CRR-002 (failure-origin review of API-REV-001 F-1): Design Impact. A stopped call reads "Failed" once the run is read back from the node.
- Prior status: design Ready (SR-002), implemented at 255a0b0ada; API/E2E round 1 failed. Current status: requirements Approved (SR-004); design Ready.
- Affected IDs: AC-D (read-back made explicit; Codex excluded), DEC-010 (new), REQ-D (unchanged wording).
- Canonical sections changed: requirements AC-D, DEC-010; design evidence row, Change Scope (D-D2 consumers, follow-ups), the new D-D2 section; investigation notes SR-004 section.
- Approval: Solution Designer within the direction (REQ-D already requires the status wherever it is shown); user informed.
- Design: D-D2.
  - One node rule `isInterruptedToolResult` reads what each writer stores. The replay and the work journal read it.
  - Conversation entries carry the node's `toolStatus`, and the web's `inferToolStatus` is removed.
  - Read-side only; persisted data Not Affected.
- Classification: unchanged, `Large` / `High`.
- Routing: implementation, then a targeted source review of the replay and the shared rule, then API/E2E (MSP-102, the whole phone probe, the server suites, the fresh-start build), as CRR-002 lists.
- Design case: docs/design-cases.md Case 26, "again in autobyteus-609".
- Remaining gaps: FU-001 … FU-004, FU-008.

## SR-005 (2026-11-23)

- Trigger: ARCH-REV-003 (Pass of SR-004), with two non-blocking items: N-3 (DEC-010's basis was false) and N-4 (dead view providers).
- Kind: requirements correction (AC-D widened back to every runtime, DEC-010 corrected) and a design addition (remove the dead Codex view provider, a file D-A touched). The routing is unchanged: the Pass stands, and the design adds only a removal.
- Affected IDs: AC-D, DEC-010; design Change Scope, SR-005 section; FU-008 withdrawn, FU-009 new.
- Approval: Solution Designer within the direction (the corrected AC-D is REQ-D's original scope); user informed.
- Sent to `/implementation_engineer` directly, as the reviewer had already handed off SR-004.
