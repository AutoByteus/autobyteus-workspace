# Solution Revision Record — docker-node-in-place-server-update (autobyteus-305)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-305, PTM message 2026-10-26) | N/A | N/A | Ready for Approval | BEH-001..BEH-007, REQ-001..REQ-014, AC-001..AC-012, DEC-001..DEC-017 | Presented to the user with `options-report.md` |
| SR-002 | Mixed (Evidence + Requirements) | The user, 2026-10-30: "origin personal has been updated a lot … do a real analysis"; update the worktree to the latest base | N/A | Ready for Approval | Ready for Approval | REQ-001, REQ-009, QR-001, ASM-001 (evidence); REQ-015, AC-013 (new); PRQ-001/002 (Task keys) | Base fast-forwarded to `9d59ab82ec`; numbers re-measured; feasibility reproduced; re-presented |
| SR-003 | Requirements | The user's approval, 2026-10-30 | N/A | Ready for Approval | Approved | DEC-001..DEC-007, DEC-018; REQ-014 removed | Requirements approved; architecture design starts |
| SR-004 | Design | Architecture design after approval (SR-003) | N/A | Approved; design N/A | Approved; design Ready | DEC-016 revised (per-node volume); design D-*/C1–C4 | `design-spec.md` written; Large / High |
| SR-005 | Design (+ editorial requirements) | ARCH-REV-001 Fail (`design-review-report.md`) | AR-001..AR-012 | Design Ready (SR-004) | Design Ready (revised) | REQ-003, REQ-006, DEC-005, SCN-001 (editorial); design | All findings resolved; re-review |
| SR-006 | Evidence (editorial) | ARCH-REV-002 Pass with note N-1 | N-1 | Design Ready (SR-005) | Design Ready | DEC-016 wording; design file rows | Wording aligned; no behavior or design change |
| SR-007 | Evidence | Delivery Completed, step 1 (DR-001) | N/A | Step 1 in delivery | Step 1 finalized | PRQ-001 delivered | Receipt verified; steps 2–5 continue |
| SR-008 | Evidence | ARCH-REV-003 Pass (step 2) | N/A | Step 2 at review | Step 2 at implementation | — | Pass recorded; no forwarding |

## Revision Entries

### SR-001 — Requirements baseline and options report

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-305 (the user, 2026-10-25) and the Project Task Manager's message of 2026-10-26
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- IDs affected: all (baseline)
- Scenario basis: SCN-001, SCN-002, SCN-006, SCN-007 supported normal; SCN-003..SCN-005 supported explicit edge (the user's supply-chain and failure rules)
- Why recorded: first coherent baseline presented for the user's approval
- Canonical sections: whole `requirements-doc.md`; `investigation-notes.md` source log, behaviors, facts F-01..F-16, probes
- Supplemental artifacts added: `options-report.md`; `evidence/layer-diff.py` and outputs; `follow-ups.md` (FU-001, FU-002)
- Product design evidence: none (not requested)
- Intended behavior changed: N/A (baseline)
- Approval impact: not approved; DEC-001..DEC-007 need the user; DEC-010..DEC-017 decided by the Solution Designer within the direction
- Behavior-defining supplement versions: `options-report.md` at SR-001
- Affected design/review basis: N/A
- Post-design task-size/risk classification: N/A (expected Large / High after design)
- Applied handoff-rule outcome: none yet (approval hold in the Solution Designer's conversation)
- Downstream impact: build step 5 depends on PRQ-001 (autobyteus-284) and PRQ-002 (restart-and-resume steps 1 and 3)
- Remaining gaps: ASM-001 (Linux build size), U-02 (release asset ordering)
- Next action: the user answers the seven questions; then approval is recorded and architecture design starts

### SR-002 — Re-analysis on the latest base, measured feasibility

- Phase and classification: Mixed, `Refinement` (evidence-led; one requirement added within the direction)
- Triggering input: the user, 2026-10-30, in the Solution Designer conversation: "The origin personal branch has been updated a lot. Can you do a real analysis? … First make your … ticket work tree up to date. Use the latest origin personal base." Also the skill update of 2026-10-27 (feasibility evidence per requirement).
- Triggering finding IDs: N/A
- Prior status: requirements `Ready for Approval` at SR-001 (not approved)
- Current status: requirements `Ready for Approval` at SR-002 (not approved); design not started
- IDs affected: REQ-001 and REQ-009 (feasibility now Reproduced), QR-001 (target ≤ 0.35 GB from the measured 313 MB), ASM-001 (Confirmed), U-01 (Resolved), new U-03 / REQ-015 / AC-013 (partial release: no server build published for the requested version), PRQ-001/002 (Task keys autobyteus-284, -285, -287 recorded by the PTM)
- Scenario-basis changes: none
- Why recorded: worktree fast-forwarded 452 commits (`d74f75a51a` → `9d59ab82ec`); every relied-on surface re-checked (unchanged: Docker files, launcher, workflows, route policy, remote access, desktop server packaging, DESIGN.md); per-upgrade download re-measured on the newest releases for both architectures (1.38–1.44 GB); system base proven identical across 23 releases; a real Linux server build measured (313 MB compressed) and started healthy on the published image (7 s); 284 status checked (code review passed, not merged)
- Canonical sections changed: investigation notes (Meta, re-analysis source log, U-01, U-03, supplement inventory, requirement implications); requirements (status, base, problem numbers, Feasibility Evidence column, REQ-015, AC-013, QR-001, ASM-001, traceability, prerequisites); options report (§2 numbers, feasibility, industry practice; §4 partial release; §5 dependency status)
- Supplemental artifacts added: `evidence/layer-diff-output-2026-10-30.txt`, `evidence/arm64/`, `evidence/amd64/`, `evidence/idx-1.5.1*.json`, `evidence/linux-server-build-measure.sh`, `evidence/linux-server-build-result-2026-10-30.txt`
- Intended behavior changed: `Yes`, by one addition within the direction (REQ-015, a refusal case; decided by the Solution Designer); the seven `Needs user` questions are unchanged
- Approval impact: none given yet; DEC-001..DEC-007 still need the user
- Behavior-defining supplement versions: `options-report.md` at SR-002
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: none (approval hold in the conversation)
- Remaining gaps: U-02 (release asset upload ordering), trimming of the server build (step 1)
- Also applied: the Task comment of 2026-10-30 (the user's restart-chain decision: after an update restart, busy agents continue automatically, no human involved) → REQ-010, AC-007, DEC-015, options report §4 step 10.
- Also: DEC-005 revised after the user's concern about the data copy's size (2026-10-30): copy only when the update brings a data migration (measured: 3 of 23 releases since v1.5.8); DEC-018 button wording added. Then the user (2026-10-30): the copy should be gone once the new version works → the copy is deleted as soon as the new version is confirmed working.
- User decision recorded: DEC-005 approved by the user, 2026-10-30. Still open: DEC-001..DEC-004, DEC-006, DEC-007, DEC-018.
- User decision recorded: DEC-004 by the user, 2026-10-30 (no owner switch; REQ-014 removed, AC-009 revised).
- Next action: the user answers the remaining questions

### SR-003 — Requirements approved by the user

- Phase and classification: Requirements, approval
- Triggering input: the user, 2026-10-30, in the Solution Designer conversation: "Yeah, yeah, I feel like you're recommended. These are good. You're recommended are good. Yeah, I accept that."
- Prior status: `Ready for Approval` (SR-002 plus the same-day revisions of DEC-004, DEC-005 and DEC-018)
- Current status: requirements `Approved` at SR-003; design not started
- IDs affected: DEC-001, DEC-002, DEC-003, DEC-006, DEC-007, DEC-018 approved as recommended; DEC-004 (no owner switch; REQ-014 removed, AC-009 revised) and DEC-005 (copy only with a data migration, deleted once the new version works) decided by the user the same day
- Intended behavior changed: `No` beyond the recorded same-day decisions
- Approval reference: the quote above; who approved: the user
- Behavior-defining supplement versions: `options-report.md` at SR-003
- Downstream impact: architecture design (reading gate) starts; build step 5 waits for autobyteus-284, -285, -287
- After approval, same day: DEC-011 discussed (manual image build considered); the user kept an image every release for simplicity (DEC-011 decided; FU-003 records the manual-image idea).
- Next action: architecture investigation and `design-spec.md`

### SR-004 — Architecture design

- Phase and classification: Design, `Initial Baseline` of the design (plus one Solution Designer decision revised within the direction)
- Trigger: requirements approved at SR-003; the user, 2026-10-30: "So yeah, let's do it."
- Prior status: requirements `Approved`; design not started
- Current status: requirements `Approved` (unchanged intended behavior); design `Ready`
- IDs affected: DEC-016 revised (one `<node>-server` volume per node instead of a shared one: the data copy holds the vault and must not be visible to other nodes' agents); QR-001 wording ("once per node"); all REQ/AC mapped in the design's behavior map
- Canonical sections changed: `design-spec.md` (new); investigation notes (Architecture Investigation Findings A-01..A-13); `follow-ups.md` FU-004
- Intended behavior changed: `No` (DEC-016 is a technical placement decision; the user is informed in the conversation)
- Post-design classification: `task_size: Large`, `architectural_risk: High` (supply chain, cross-version contracts C1–C4, new process owner, data copy and restore, CI secret and write permission)
- Next action: hand off as the handoff rules say (architecture review expected for Large / High)

### SR-005 — Design revised for ARCH-REV-001

- Phase and classification: Design, `Design Impact` (AR-001..AR-011), plus `Requirement Gap` that is editorial only (AR-012)
- Trigger: the architecture review `ARCH-REV-001`, Fail (`design-review-report.md`, `architecture-review-revision-record.md`)
- Prior status: design `Ready` (SR-004)
- Current status: design `Ready` (revised); requirements `Approved` (SR-003 basis; editorial fixes only)
- IDs affected:
  - Design: boot outcome `NEEDS_NEW_IMAGE`; `ServerSupervisor` as the one owner of the child, with the exit-case table; data-copy order and space check before the stop; version, architecture and asset-name binding (`DESCRIPTION_MISMATCH`); consumers of the old layout; workflow forms and zh; tracks and the IMAGE_REF table; removal additions; one version owner (the starter) and `AUTOBYTEUS_STARTER_SOCKET`; frozen `cli.mjs` and `server-package.json`; SelfCheck environment; the volume renamed `<node>-server-packages`.
  - Requirements, editorial: the REQ-006 row repaired; DEC-005 reasoning matches the user's decision; SCN-001 alternate updated; REQ-003 wording now matches AC-009 and DEC-004.
  - Investigation: current-behavior IDs renamed `CUR-001..CUR-007`.
- Intended behavior changed: `No`. AR-012 is editorial; the REQ-003 wording now states what DEC-004 and AC-009 already approved.
- Verification: the reviewer's cited facts were re-checked at `9d59ab82ec` (AUTOBYTEUS_WORKSPACE_ROOT readers, `.env.example`, the three tests, TESTING.md:193-196, `/app/src` readers, `releases.atom` with 10 entries).
- Residual: DEC-016's changed download figure is put to the user for confirmation (non-blocking).
- Classification unchanged: Large / High.
- Next action: re-review by the architecture reviewer.

### SR-006 — ARCH-REV-002 Pass recorded; wording note N-1 applied

- Trigger: the architecture review `ARCH-REV-002`, **Pass** for SR-005, Large / High (`design-review-report.md`). The reviewer routes implementation (build step 1) to `/software_engineering_team/implementation_engineer` itself; the Solution Designer does not forward it again.
- N-1 (non-blocking) applied:
  - DEC-016 names `<node>-server-packages`;
  - the file rows for `starter.mjs`, `starter-client.ts` and `system-level.json` match the design;
  - the sequence example uses `supervisor.beginUpdate()`/`stop()`;
  - the Legacy Removal Policy list matches the Removal plan.
- Intended behavior changed: `No`. Design decisions changed: `No` (editorial).
- Open with the user: confirmation of DEC-016's download figure (non-blocking).
- Next action: implementation of build step 1; before `gh secret set SERVER_PACKAGE_SIGNING_KEY`, the user is told.

### SR-007 — Step 1 delivery receipt verified

- Trigger: `Delivery Completed` for build step 1, DR-001 (delivery engineer, 2026-10-30)
- Verification: `delivery-receipt-verification-step1.md`. The merge is `eec6522b27`; `origin/personal` is at `77fb8bf2d1`; reviews and evidence are present; there was no release, by the RELEASE.md default.
- PRQ-001 (autobyteus-284) is delivered, in the base. PRQ-002 (285, 287) is still open.
- Intended behavior and design: unchanged.
- Next action: build step 2 on the reviewed design SR-005.

### SR-008 — ARCH-REV-003 Pass for step 2 recorded

- Trigger: the architecture review `ARCH-REV-003`, **Pass** (SR-005 basis applies to step 2; SR-006 and SR-007 checked), Large / High.
- The reviewer routed step 2 to `/software_engineering_team/implementation_engineer` itself, with one non-blocking note: supervisord's `stopwaitsecs` must be above the server's 10 s shutdown bound. The Solution Designer does not forward it again.
- Intended behavior and design: unchanged.
- Next action: implementation of build step 2.
