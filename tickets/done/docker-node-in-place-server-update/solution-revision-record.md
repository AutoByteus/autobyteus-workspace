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
| SR-009 | Mixed (Evidence + Design) | Delivery Completed, step 2 (DR-002); RU-23, CR2-N1 | RU-23, CR2-N1 | Step 2 in delivery | Step 2 finalized; design delta for step 3 | REQ-011, REQ-012 (protected) | Receipt verified; step-3 delta to review |
| SR-010 | Evidence | ARCH-REV-004 Pass (step 3) | N/A | Step 3 at review | Step 3 at implementation | — | Pass recorded; no forwarding |
| SR-011 | Evidence | Delivery Completed, step 3 + beta v1.5.11-beta.6 (DR-003) | CR3-N1 | Step 3 in delivery | Step 3 finalized and released (beta) | AC-011 GitHub part closed | Receipt verified; step 4 to review |
| SR-012 | Evidence | ARCH-REV-005 Pass (step 4) | N/A | Step 4 at review | Step 4 at implementation | — | Pass recorded; no forwarding |
| SR-013 | Evidence | Delivery Completed, step 4 (DR-004) | CR4-N1 | Step 4 in delivery | Steps 1–4 finalized; waiting for 285, 287 | AC-007 pending | Result `Blocked: Waiting For Prerequisite` to the PTM; follow-ups sent |
| SR-014 | Evidence | Delivery Completed, beta v1.5.11-beta.7 (DR-005) | N/A | Steps 1–4 finalized; waiting | Steps 1–4 released (beta.7); first real in-place update proven; waiting | AC-001..AC-006 proven on published versions | Receipt verified |
| SR-015 | Evidence | The user's own nodes on the in-place path (delivery engineer's read-only check) | N/A | Waiting | Waiting | RU-23/N-4 resolved on the real nodes | Recorded; FU-009 added |
| SR-016 | Requirements (scope) | The PTM's closing decision, 2026-11-01 | N/A | Waiting for 285, 287 | Closed; step 5 moved to 285 | REQ-010 (resume part), AC-007 | Ticket archived; follow-ups sent |

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

### SR-009 — Step 2 receipt verified; design delta for step 3

- Trigger: `Delivery Completed` for build step 2, DR-002 (delivery engineer, 2026-10-30)
- Verification: `delivery-receipt-verification-step2.md`. The merge is `a0f4b491f7`; `origin/personal` is at `6b34f900b6`; there was no release, by the RELEASE.md default.
- Design delta for step 3, within the approved requirements (no behavior beyond REQ-011/REQ-012):
  - RU-23: `UpdateService` refuses with `NO_PACKAGES_VOLUME` when `/home/autobyteus/server-packages` is not its own mount. C2/C1 status carries the new optional `updateBlocker`, so the row shows the reason. The step-3 release notes tell launcher users to reinstall the launcher.
  - CR2-N1: launcher `status` shows the starter's state, so `needsNewImage` is visible there.
- Classification unchanged: Large / High. The delta changes C1/C2 by an optional field (frozen-contract rule), so it goes to architecture review.
- Follow-ups: FU-006 (PowerShell fresh-port pick) is recorded and will be sent when the ticket leaves the team.
- Next action: architecture review of the step-3 scope with this delta.

### SR-010 — ARCH-REV-004 Pass for step 3 recorded

- Trigger: the architecture review `ARCH-REV-004`, **Pass** for SR-005 plus the SR-009 delta (RU-23 gate and `updateBlocker`, CR2-N1), Large / High.
- The reviewer routed step 3 to `/software_engineering_team/implementation_engineer` itself, with non-blocking notes: N-2 (`updateBlocker` is computed by UpdateService's one gate rule) and N-3 (the launcher `status` tolerates a node without a starter). The Solution Designer does not forward it again.
- Intended behavior and design: unchanged.
- Next action: implementation of build step 3.

### SR-011 — Step 3 receipt and beta v1.5.11-beta.6 verified

- Trigger: `Delivery Completed` for build step 3, plus beta v1.5.11-beta.6 at the user's request (DR-003, 2026-10-30)
- Verification: `delivery-receipt-verification-step3.md`. The merge, tag, 23 assets, 4/4 workflows and Docker tags were checked with `git` and `gh`. Step 1's open AC-011 GitHub check is closed.
- Intended behavior and design: unchanged. CR3-N1 and the stale `previous` observation go to step 4 implementation.
- Next action: step 4 (desktop) via architecture review, on the reviewed design SR-005/SR-009.

### SR-012 — ARCH-REV-005 Pass for step 4 recorded

- Trigger: the architecture review `ARCH-REV-005`, **Pass** (SR-005 + SR-009 basis applies to step 4; SR-010 and SR-011 checked), Large / High.
- Placement of the carried items:
  - CR3-N1 stays in `SelfCheck`, with its output going to the starter log only (AC-012);
  - the stale-`previous` cleanup is optional, and if done it goes in `PackageStore.choose`.
- Note N-4 passed to implementation: map `inPlaceUpdate: "error"` and a failed GET to row states.
- The reviewer routed step 4 to `/software_engineering_team/implementation_engineer` itself; the Solution Designer does not forward it again.
- Intended behavior and design: unchanged.
- Next action: implementation of build step 4.

### SR-013 — Step 4 receipt verified; waiting for autobyteus-285 and -287

- Trigger: `Delivery Completed` for build step 4 (DR-004)
- Verification: `delivery-receipt-verification-step4.md`
- Result: `result-waiting-for-prerequisite.md`, classified `Blocked: Waiting For Prerequisite` (285, 287), returned to `/project_task_manager` with FU-001..FU-008.
- Product choices put to the user (not blocking): no confirmation before "Update to <version>" (CR4-N1, per SCN-001); nodes on images from before step 2 show "Not reachable." until the launcher is reinstalled and `upgrade --all` runs.
- Next action: resume step 5 when the PTM reports 285 and 287 delivered.
- 2026-10-31, SR-013 addendum: the PTM confirmed steps 1–4 and placed the follow-ups (FU-002/004/006 → autobyteus-344; FU-003/005/008 → autobyteus-345; FU-001 → comment on 306; FU-007 none). Prerequisite order: 339, then 285, then 287. Still waiting.

### SR-014 — Beta v1.5.11-beta.7 and the first real in-place update verified

- Trigger: `Delivery Completed`, DR-005: beta v1.5.11-beta.7, at the user's request ("there is no beta release for this? i think we need a beta release"); Grok waived by the user ("yes Waive grok").
- Verified 2026-10-31 with `git` and `gh`:
  - the tag `v1.5.11-beta.7` points to `8faae96899`;
  - the release is a pre-release with 23 assets;
  - all four runs (`41171202589`, `41171202588`, `41171202636`, `41171202581`) succeeded;
  - `:beta` = `sha256:8bcf8eabfafe…`;
  - `origin/personal` @ `a977b2c1bc`.
- The first real in-place update, from published beta.6 to published beta.7, on a test-owned container (`evidence/DEL-14-first-real-in-place-update-beta6-to-beta7.log`):
  - the starter resolved the version from GitHub and verified the package with the production key;
  - it ran the self-check, switched and confirmed, and succeeded in 103 s;
  - the server now runs from `/home/autobyteus/server-packages/packages/1.5.11-beta.7`, in the same container and image.
  - That proves "updates to the desktop's version without a new image" on published versions.
- Still open: step 5 (AC-007, mid-turn runs come back), waiting for 339 → 285 → 287.
- 2026-10-31, SR-014 addendum: the user confirmed DEC-016 by leaving it to the Solution Designer's recommendation ("I trust like you can really make really good like recommendations"). Each node keeps its own `<node>-server-packages` volume: about 0.94 GB per release on his 3-node machine, versus 1.4 GB today. Agent data was never part of the question; it always stays per node.

### SR-015 — The user's own nodes moved onto the in-place path

- Trigger: the delivery engineer's read-only check, 2026-10-31, at the user's request. The user runs desktop 1.5.11-beta.7, reinstalled the launcher and ran `autobyteus-docker upgrade --all` (track `beta` kept).
- Evidence: `autobyteus-server-0/1/2` all run the published `:1.5.11-beta.7`/`:beta` image (`sha256:8bcf8eabfafe…`), each with its `<node>-server-packages` volume mounted. C1 `GET /rest/node-update?target=1.5.11-beta.7` answers `available`, `version 1.5.11-beta.7`, `relation same`, with no blocker.
- Effect: RU-23 and N-4 are resolved on the real nodes; they are ready for an in-place update at the next release. Until step 5, an update stops mid-turn runs; the user was told to update while idle.
- Follow-up FU-009 added (launcher self-version notice); it will be sent when the ticket leaves the team.
- Still waiting for 339 → 285 → 287 (step 5).
- 2026-10-31, SR-015 addendum: DEC-019 decided by the Solution Designer on the user's direction ("just make the UI clean"): no confirmation before "Update to <version>". Step 4 as delivered is unchanged.
- 2026-10-31: the design spec records the field "User approval of the design: Obtained (SR-003)", per the skill update (autobyteus-agents-79). No other change.

### SR-016 — Ticket closed; step 5 moved to autobyteus-285

- Trigger: `/project_task_manager`, 2026-11-01: the user asked why 305 was still open. The PTM's decision: steps 1–4 are delivered and released (beta.6 and beta.7, then carried in beta.8 and beta.9), so 305 closes. Step 5 / AC-007 (mid-turn runs come back on a Docker node after an in-place update) moves into autobyteus-285's done-when.
- Scope change: REQ-010's resume part and AC-007 leave this ticket; nothing is dropped, the work continues in 285. The user is informed in the Solution Designer conversation.
- Delivered: step 1 `eec6522b27`, step 2 `a0f4b491f7`, step 3 `0a223aa397`, step 4 `db0881a96e`. Done-when items met on real releases: an update to the desktop's version without a new image (DEL-14, REL-04), and a failed update leaving the old version running (step 3 API/E2E).
- Follow-ups: FU-001..FU-008 placed earlier (344, 345, a note on 306; FU-007 none). FU-009 (launcher self-version notice) is sent with this closure.
- Archived to `tickets/done/docker-node-in-place-server-update/`.

