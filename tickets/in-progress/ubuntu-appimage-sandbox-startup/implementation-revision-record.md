# Implementation Revision Record

## Revision Index
| Revision | Trigger | Finding | Classification | Related revisions | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / ARCH-REV-002 intake | IMP-DI-001 | Design Impact | SR-012/013/014; ARCH-REV-002 | Dependent implementation held for DS-003 delta review |
| IR-002 | ARCH-REV-003 Pass plus designer clarifications | IMP-DI-001 resolved; U1/U2 clarification | Large / High | SR-012/014; ARCH-REV-003 | Implementation Complete — Ready for Code Review; acceptance pending |

## IR-001 — First-install input acquisition
- Initial baseline; prior authoritative result N/A; triggering upstream finding IDs N/A (AR-001–003 resolved).
- Received `design-review-report.md` and `architecture-review-revision-record.md`, round ARCH-REV-002 Pass, DS-002 / SR-013, approved requirements SR-012.
- Intake identified IMP-DI-001: final-byte sidecars required by provisioner had no first-launch acquisition path for a lone downloaded AppImage. Affects BEH-001/005, REQ-001/003, AC-001/003/004.
- Source/design trace in `evidence/IMP-01-first-install-input-trace.txt` at ead5fafcb474ee1a9b4001fe0422f73b008c412f. No runtime failure claim.
- Designer supplied DS-003 / SR-014 in response and explicitly requested dependent implementation hold until delta review passes. Current result: Design Impact, recovery pending review, not implementation complete.
- Delta: implementation handoff, this record and intake evidence only; no production source or system changes. Reviewer-owned report/record preserved.
- task_size Large / architectural_risk High unchanged. CRR, API-REV and DR: N/A.
- Next recipient: Solution Designer per handoff rule, with these documents as the intake record. No duplicate request for already underway review.
- Remaining limits: all source implementation, native provisioning/package proof and final acceptance matrix remain outstanding. No keys, user-data testing or release authorized.

## IR-002 — Protected install, authenticated updates and managed quit ownership
- Prior result: IR-001 Design Impact. ARCH-REV-003 / DS-003 resolved initial-record acquisition. Approved requirements remain SR-012. No outstanding design hold.
- Triggering authorities: design-review-report.md and architecture-review-revision-record.md ARCH-REV-003; designer manual-install-failure-clarification.md (703b1bef5c) and stage-lifetime-clarification.md (e76616b482), both explicitly authorized within U1/U2. CRR/API-REV/DR N/A.
- Code delta: native Go launcher/sealed bootstrap/provisioner/nonroot writer/client with canonical signed same-inode identity; build hook/desktop Exec/readiness; managed session as sole quit owner; managed immediate/native install paths removed; distinct durable manual refusal and typed receipt-loss recovery; public/build-only/production signing boundaries; localized existing notification/setting copy; owned menu preservation and docs/glossary. BEH-001–005, REQ-001–005/007, AC-001–006/008 paths in current handoff. REQ-006/AC-007 remains Delivery-owned.
- Main commits: 73c7e24c24, 4c58622f6a, f1a88a2672, 4c6950c757. Final source delta after 4c6950c757 removes duplicate test execution from the production-key step and clarifies environment-scoped key administration; IMP-19 statically checks it. Final evidence/handoff commit follows this record.
- Validation: IMP-09/11/12/15/16/17 units and both typechecks. Cumulative current managed/updater/record Electron tests 67; 16 component/store checks including corrected selector rerun; 12 JS golden vectors, 3 packaging CLI tests and Go package/ownership tests. Full local x64 build after repairing missing host build tools, final native delta repackage and signed-byte/layout/metadata verification IMP-18. Packaged Node arguments/signals/exits verified. Real affected components inspected interactively at wide/narrow en/zh in owned preview (IMP-14).
- Native VM witness IMP-05/06 used an older inert payload and separate one-shot tty grants for install/removal. NOT final production GUI/auth/sandbox/update acceptance. Real host matrix, native ARM64, clean CI, two genuine signed updates without cached grants and synthetic data continuity remain mandatory downstream.
- Current result: Implementation Complete — Ready for independent Code Review, **Large / High confirmed**. Source/handoff are current authority. No release, tag, branch push, publication, production-key access or user-data testing. No permission fallback introduced.
- Cleanup: preview route/browser/server removed/stopped; prior owned guest installation removed and VM stopped. Disposable tooling/assets retained for downstream reuse, named in handoff. Generated SDK outputs are not part of the change.
