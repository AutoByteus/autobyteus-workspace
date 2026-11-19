# Ubuntu AppImage Sandbox Startup — Solution Revision Record

## Revision Index

| Revision | Phase | Trigger | Prior status | Current status | IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User's 2026-09-24 preference for no manual flag and willingness to accept a no-sandbox fallback | N/A — diagnosis-only Draft | Ready for Approval | BEH-001–004; SCN-001–004; REQ-001–005; AC-001–006 | Proposed conditional AppImage fallback; no approval or design yet |
| SR-002 | Requirements | Explicit user approval of conditional fallback on 2026-09-24 | Ready for Approval | Approved | Same IDs; no behavior changes | Approval captured; architecture phase authorized |
| SR-003 | Evidence | Discovery of builder-generated desktop default `--no-sandbox` | Approved | Approved | BEH-002 / SCN-002 current-state evidence | Corrected current behavior; approved target unchanged |
| SR-004 | Design | Post-approval packaging/runtime architecture investigation and design | Approved / no design | Approved / design Ready | BEH-001–004; REQ-001–005; AC-001–006 | Medium / High completed solution; architecture review required by rule |
| SR-005 | Design + evidence recovery | ARCH-REV-001 Blocked / F-001–F-002 | Approved / SR-004 review Blocked | Approved / revised design Ready | BEH-001–003; SCN-001–004; REQ-001–004; AC-001–005 | Removed failed-probe-as-proof premise; actual sandboxed attempt gates fallback; corrected scenario/inventory coherence; renewed review required |

| SR-006 | Requirements + evidence | 2026-10-24 resumed Task and current-release reproduction | Historical approval / API-REV-001 Blocked | Ready for Approval; current design N/A | Retained original IDs; added conditional native install and finalization IDs | Current A/B security/distribution decision pending; no source changes |

| SR-007 | Requirements + evidence | User 2026-11-17 rejects per-update admin prompts | Ready for Approval, no selection | Draft, unattended-update feasibility open | BEH-004, SCN-004, REQ-005/007, AC-006/008, DEC-007 | Assisted-DEB update recommendation withdrawn; no new mechanism approved |

## SR-001 — Conditional AppImage Fallback Proposal

- Phase/classification: Requirements / Initial Baseline.
- Triggering feedback: User rejects telling end users to supply `--no-sandbox` and would accept no sandbox by default if no perfect solution exists.
- Prior authoritative state: Diagnosis-only Draft requirements; no design spec or review.
- Current authoritative state: Requirements Ready for Approval; investigation notes extended; design N/A.
- Scenario-basis changes: Added sandbox-capable host, Node/CLI invocation, and release/update operational scenarios beyond the originally reproduced restricted-host journey.
- Why recorded: This is the first coherent solution behavior proposed for user review, not evidence of user approval.
- Canonical sections changed: `requirements-doc.md` problem, behavior, scope, REQ, AC, scenarios, quality, decisions, readiness; `investigation-notes.md` user preference, package/release facts, upstream feasibility.
- Supplements/prototype: N/A.
- Intended behavior changed from diagnosis-only state: Yes, proposed only; not approved.
- Approval impact: Explicit approval of the conditional-fallback baseline required before architecture design. User's statement is risk tolerance, not approval of REQ-002's conditional boundary. Exact approved baseline/reference N/A.
- Design/review/routing impact: No design or implementation handoff yet. Task-size/risk N/A until completed design.
- Remaining question: Does the user approve automatic fallback only when sandbox setup is unavailable, while preserving the sandbox elsewhere?
- Next action: Present the proposed behavior and security tradeoff to user for explicit approval.

## SR-002 — User Approval Of Conditional AppImage Fallback

- Phase/classification: Requirements / approval capture.
- Triggering feedback: User said, “i agree for systems user have to use --no sandbox, we provide the default no sandbox, for system like earlier ubuntu they dont even requrie, then user can start normally”.
- Prior authoritative state: Requirements Ready for Approval at SR-001; design N/A.
- Current authoritative state: Requirements Approved; design investigation begins.
- IDs affected: BEH-001–004, SCN-001–004, REQ-001–005, AC-001–006; no text changes to their intended outcomes.
- Scenario-basis changes: None.
- Approval basis: Exact SR-001 requirements baseline in `requirements-doc.md`, now marked Approved; no behavior-defining supplements.
- Intended behavior changed from SR-001: No; conditional fallback confirmed.
- Design/review impact: Architecture design now authorized; task-size/risk N/A until design complete.
- Remaining gaps: Technical packaging mechanism and validation matrix to investigate; no material product decision remains open for the in-scope fallback.
- Next action: Complete architecture investigation and proportionate design.

## SR-003 — Desktop Entry Current-State Correction

- Phase/classification: Evidence-only clarification during architecture investigation.
- Trigger: Inspection of actual v1.4.78 mounted AppImage `autobyteus.desktop` and installed electron-builder 25.1.8 `AppImageTarget.js`.
- Prior/current requirements status: Approved / Approved; design still in progress.
- IDs affected: BEH-002 and SCN-002 current-state evidence only; REQ-002/AC-002 desired behavior unchanged.
- Correction: Existing desktop-integrated launch already passes `--no-sandbox` unconditionally, while direct AppImage launch does not. Earlier user report that older Ubuntu required no manual flag did not prove desktop startup was sandboxed.
- Approval impact: None; user's conditional target still applies to both launch entrypaths. Approved baseline SR-001 and approval SR-002 remain valid.
- Design impact: Must handle builder-generated desktop argument as well as direct invocation; a pure binary wrapper without desktop-entry correction is insufficient.
- Review/routing impact: Remains in architecture design; no review handoff yet.
- Next action: Resolve concrete AppImage packaging mechanism, including desktop and direct entrypaths.

## SR-004 — Completed Conditional AppImage Launch Design

- Phase/classification: Design / Architecture Design Complete.
- Trigger: SR-002 approval followed by architecture investigation; SR-003 current-state correction included.
- Prior authoritative state: Requirements Approved, design N/A/in progress.
- Current authoritative state: Requirements Approved unchanged; `design-spec.md` Ready for independent review.
- IDs affected: BEH-001–004, SCN-001–004, REQ-001–005, AC-001–006.
- Approval basis/impact: Exact SR-001 requirements baseline approved in SR-002; no new behavior or behavior-defining supplement and no renewed approval required.
- Evidence: Installed electron-builder 25.1.8 AppImage target/desktop default and afterPack hook order; current `afterPack`, `build.ts`, Linux server manager, release workflow, updater and actual v1.4.78 AppImage. See canonical `investigation-notes.md`.
- Design result: AppImage-only pre-Electron launcher with conditional namespace probe, private desktop marker, Node-mode bypass, startup diagnostic and release validation; no unconditional Linux disablement, new installer, or host policy changes.
- Design-health decision: Narrow refactor now: split current Mac-only `afterPack` implementation into Mac-owned helper and make `afterPack` target-aware dispatcher.
- Task-size/risk: Medium / High. Medium code footprint within existing packaging ownership; High due changed Chromium security and release-entrypoint behavior.
- Review/routing impact: Architecture Design Complete, requires independent architecture review under configured High-risk rule; previous architecture-review artifacts N/A.
- Remaining gaps: Packaged behavior on Ubuntu 20/22 and 24/26, x64/ARM64, Node-mode server startup and updater must be validated downstream. If conditional probe cannot satisfy approved REQ-002, return a Design Impact rather than unconditionally disable sandbox.
- Next action: Apply handoff rules with cumulative package.

## SR-005 — Review Recovery: Actual Sandbox Failure Gate And Evidence Coherence

- Phase/classification: Design Impact and evidence correction / revised Architecture Design Complete.
- Triggering report/round/findings: Architecture Reviewer Round 1 `ARCH-REV-001`, `design-review-report.md`, decision Blocked/Unclear; F-001/MP-001 and F-002. Reviewer-owned report and `architecture-review-revision-record.md` remain unchanged as review history.
- Prior authoritative state: SR-001 requirements Approved by SR-002; SR-004 design submitted for review and Blocked. No implementation or packaged validation.
- Current authoritative state: Same approved requirements; revised `design-spec.md` Ready for renewed independent review; investigation notes corrected and extended.
- IDs affected: BEH-001–003, SCN-001–004, REQ-001–004 and AC-001–005. No intended behavior or behavior-defining supplement changed; REQ-005/AC-006 release boundary remains preserved.
- Evidence and rationale: The local Ubuntu 26.04 host has an `unshare` mapping denial, and the actual AppImage separately aborts with Chromium sandbox FATAL/exit 133 before bootstrap. F-001 correctly observed that absent/failed `unshare` alone cannot prove Chromium needs no-sandbox on a capable host. New `evidence/probe-classifier-current-host.txt` records exact probe/policy output; current Ubuntu package inventories corroborate ordinary `unshare` availability but do not justify fallback.
- Design correction: Positive `unshare` remains only a fast path. Negative, absent, timed-out, or ambiguous probe runs the actual packaged Electron ELF once without `--no-sandbox`; only a prompt exit 133 with the exact observed Chromium startup sandbox FATAL permits one retry with the flag. A capable host with a false-negative/missing external probe stays sandboxed, with launcher signal/status forwarding. Unrelated failures never authorize downgrade. Exact mechanism/tests/risks are in `design-spec.md`.
- Evidence correction: The canonical investigation scenario table now uses approved SCN-001–004 identities; manual flag and typo are diagnostic probes without scenario IDs. A current supplemental artifact inventory replaces the obsolete in-progress status. This resolves F-002 without changing the requirement authority.
- Approval impact: None. The user's SR-002 approval of conditional fallback remains current; the revised mechanism narrows security risk rather than broadening fallback. Any future blanket or broader fallback would require renewed approval.
- Task size/risk: Medium / High unchanged. Added one supervised attempt and focused lifecycle tests within the same AppImage launcher boundary; Chromium security/deployment risk remains High.
- Review/routing impact: ARCH-REV-001 remains Blocked historically; renewed independent architecture review is required before implementation. No direct implementation route.
- Remaining gaps: New package has not been built; exact fatal classifier, signal forwarding, desktop marker, x64/ARM64, capable/restricted Ubuntu, renderer isolation, Node mode and updater/relaunch require downstream verification. If supported Ubuntu's sandbox failure signature differs, return a design impact rather than inject a generic flag.
- Next action: Apply current handoff rule to the revised cumulative package and send to Architecture Reviewer.

## SR-006 — Reopen For Current Release And Security/Distribution Decision (2026-10-24)

- Phase/classification: Requirements + evidence / Requirement Gap relative to old selected fallback, explicit user-requested reassessment.
- Trigger: Project Task `project_task_1cc6e385-5adf-43b1-b800-d7793933018a`, delegated by `/project_task_manager`; current user wants no repeated flag and asks how other Electron/Linux applications handle this. Old API-REV-001 was Blocked, not delivered. Historical approval is expressly not a new decision.
- Prior state: SR-005 design + old requirements approved historically; ARCH-REV-002 and CRR-002 later passed; API-REV-001 blocked matrix. Early old design/progress wording was superseded by those later reports.
- Current state: canonical resumed requirements **Ready for Approval**, investigation current; current design **N/A / not authorized**. Historical design and specialist records archived unchanged under `history/2026-09-24/`.
- Workspace: new isolated `fix/ubuntu-appimage-sandbox-startup` from freshly fetched origin/personal `1138e8fbefadeb3b30fdb88eb4a5a09beaf372ea`, root `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup`; final target origin/personal, no release.
- IDs: retained BEH-001–004, SCN-001–004, UC-001–004, REQ-001–005, AC-001–006; added conditional native-install BEH-005/SCN-005/UC-005, excluded diagnostic SCN-006, evidence/finalization REQ-006/AC-007, new decisions DEC-003–006. Old DEC-001/002 explicitly historical.
- Evidence: current no-flag v1.5.8-beta.4 and v1.5.9-beta.3 failures reproduced with private roots; kernel audit confirms AppArmor userns capability denial. Latest mounted desktop still has unconditional no-sandbox; namespace/sysctl and setuid fallback limits measured. Packaging/main paths unchanged between reported beta and current base although Electron updated. Ubuntu22/24 actual runtime comparison remains untested.
- Supplemental changes: copied old complete ticket, preserved old production source candidate as unapplied patch; new `evidence/sr-006/` diagnostic script/logs; `approval-request-sr006.md` for full decision context. No Product package.
- Intended behavior changed: **Proposed, not approved**. A recommends native Ubuntu installed path with scoped namespace permission, portable AppImage guidance rather than silent downgrade. B retains portable conditional compromise only if explicitly newly approved. Neither selected yet.
- Approval impact: old SR-002 not applicable to current A/B decision; exact current approved baseline **none**. User must choose DEC-003 in this conversation. Solution Designer decided fresh-base/selective reuse, current architecture/OS proof and no-publication/data boundaries within direction and informed user during investigation.
- Affected design/review basis: old design and passes remain historical; no current implementation handoff. Complete requirements approval then architecture gate/investigation/design and classification. No alpha builder upgrade assumed.
- Classification: N/A before completed design; historical Medium/High not reused as current route.
- Handoff result: **routine approval hold**, no downstream routing. Result context `approval-request-sr006.md`; not a Blocked handoff or Terminal.
- Gaps: user choice; current-source build, actual capable-host renderer security, representative Ubuntu24, native ARM64, real update/relaunch, finalization/cleanup all still pending. No old or stub Pass promoted.
- Next action: ask user directly, record exact approval then continue. Do not ask delegator to decide for user.

## SR-007 — Fully Unattended Updates After Opt-In (2026-11-17)
- Phase/classification: Requirements refinement / Requirement Gap in prior recommendation.
- Trigger: User rejects administrator involvement on each automatic update; explicitly means unattended upgrades after opt-in, like their desired Mac experience.
- Prior/current authority: SR-006 Ready for Approval with no selection → SR-007 Draft. No current design; old historical approvals remain inapplicable.
- Affected: BEH-004, SCN-004, REQ-005/007, AC-006/008, DEC-007; common security/data constraints unchanged.
- Canonical changes: remove permission for recurring install authorization as an acceptable automatic path; add unattended outcome and real nonroot/no-cached-auth verification, safe activation and opt-out; record initial setup/privileged trust/hosting uncertainties.
- Evidence: upstream LinuxUpdater elevation handling and Ubuntu documented unattended-upgrades with explicit third-party-origin policy. Read only; no AutoByteus runtime proof or new release/base refresh.
- Approval: user established desired unattended behavior, not a DEB selection, privileged service, hosted repository or trust policy. Overall requirements are not approved.
- Supplements: approval-request-sr006.md marked superseded for current readiness; no new behavior-defining supplement.
- Classification/routing: N/A before completed design; normal requirements conversation, no downstream handoff.
- Remaining gaps: unattended mechanism feasibility and authorization scope, distribution selection, all actual implementation/validation/finalization. No production changes or security bypass performed.
- Next action: explain that DEB can participate in an unattended system with preauthorized update infrastructure, but ordinary electron-updater elevation alone does not meet the user's goal; refine before approving/designing.

## SR-008 — 2026-11-18: AppImage-first scoped permission experiment
SR-007 Draft → Draft. User asked for AppImage unattended opt-in upgrades and a reversible configuration trial before changing format. Current authority added to requirements; previous A/B options historical. SCN-001/002/004/005; BEH-001/002/004/005; REQ-001–003/005/007. Ubuntu 26/currently downloaded x64 baseline reproduced; exact-path profile parsed but not loaded. No approval of permanent privilege, fallback, DEB or architecture. Next: user's interactive execution, inspect renderer, replacement and removal controls; then separately verify real updates and resolve path trust. No implementation/release handoff.

## SR-009 — Scoped trial result
User-run SR-008 external prerequisite cleared. See investigation SR-009 and evidence/sr-009. REQ-001/002/003 and partial AC-004 supported on one host, not final acceptance. REQ-005/007, AC-006/008 still need genuine update proof. No approval/design/routing change; Draft remains. Next investigate actual updater and permanent path trust.

## SR-010 — First-start experience and security decision
User accepts one-time system password prompt for scoped setup and expects no repeated involvement. Draft → Draft, current first-run intended behavior confirmed; previous SR-009 proof stands. REQ-001–003/005/007, AC-001/004/008 updated. Bundled updater path semantics read. Security/operational choice (account-writable path exception vs protected installation with authenticated unattended updates) remains material. No design/implementation approval or release.

## SR-011 — Protected installation chosen
User agreed to the proposed installed copy at a specific location like other Ubuntu applications. Current product direction at top of requirements supersedes open SR-010 location question. UC-001/002/004/005; REQ-001–003/005/007. No new test, no global security or release authorization. Feasibility of protected unattended updates remains open, not a request for another location approval.

## SR-012 — Approved baseline and DS-001
Prior Draft → Approved for design/implementation subject to independent architecture review. User authorized proceeding with one-time scoped protected installation; designer informed user of consolidated approval after SR-012 mechanism feasibility. All BEH/REQ/AC preserved or revised to chosen path, historical A/B material archived. Design DS-001 Large/High, first-install and update trust/OS matrix explicit risk gates. No new release or host modification. Refreshed personal source. See design-spec, investigation notes and probe evidence.

## SR-013 — DS-002 / ARCH-REV-001 recovery
Design-only revision from Fail to ready for independent re-review, not a claimed reviewer pass. SR-012 intended behavior and approval unchanged. AR-001 bounded Noble VM witness and explicit one-shot credential/resource custody; AR-002 verified-stage vs manual restart vs normal quit including opt-out, stop and recovery ownership; AR-003 signed record and same-inode committed identity, two successive upgrades/refusal. REQ-001/003/005/007; AC-001/003/004/006/008. Investigation, inventory, historical labels refreshed. Large/High unchanged. No implementation/release.

Informational receipt: ARCH-REV-002 passed SR-013 / DS-002; reviewer delivered primary handoff to implementation. No duplicate route or release.

## SR-014 — DS-003 exact-release sidecars at initial enrollment
Implementation intake: lone AppImage cannot embed its final-byte attestation. Bounded Design Impact on L2 / REQ-001/003, AC-001/003/004; SR-012 approval unchanged. DS-003 specifies build-pinned release identity, normal-user bounded GET, refusal before auth, filename-independent matching and independent root re-verification. ARCH-REV-002 covers DS-002; re-review this delta before implementing it. Large/High unchanged.

Informational receipt: ARCH-REV-003 passed DS-003 / SR-014 on the SR-012 requirements. Reviewer delivered primary implementation handoff; IR-001 hold cleared. No duplicate forwarding or release.

DS-003 implementation clarification (same reviewed U2/manual path): manual-install-failure-clarification.md. No changed intent or architecture route.

DS-003 implementation clarification: stage-lifetime-clarification.md specifies transaction-lifetime expiry (not a wall-clock TTL), loss recovery and retry eligibility without changing approved quit/security rules. No new product decision.

## SR-015 — API-08 disposition, approved behavior unchanged
User via Project Task Manager requests architecture-proof decision. Retain native ARM64 packaging gate; reject credential-bearing whole-workflow dispatch, authorize only an already-permitted isolated native Linux validation route. Details in api-08-native-linux-disposition.md, implementation handoff and API-REV-001. DS-003 runtime shape, SR-012 and CRR-002 unchanged; API-08 Not Tested. API/E2E to continue independent x64 matrix and two signed upgrades; no new production design review/implementation handoff or support change.

## SR-016 — DS-004: explicit managed restart after old process exit
Trigger: API-REV-002 Fail / CRR-003 origin → IR-004 Design Impact F-API-02, IMP-29..32; F-API-01 local fix remains pending independent recheck. Previously ARCH-REV-003 Pass on DS-003; not a pass for this changed mechanism. Correct writer commit and failed Electron-launched successor distinguish installation from restart. Revise DS-002 step 3 in the active spec and add DS-004 transport, shutdown, canonical re-entry and real-package checks. Existing AppRun starts one fixed canonical successor on explicit manual intent and confirmed outcome after old exit. Automatic ordinary quit still never reopens. No new privileged or public channel. Investigation SR-016 and project design case 21 updated. UC/SCN/BEH-004, REQ-005/007, AC-006/008; SR-012 still Approved. Product behavior, support and release authority unchanged. **Architecture Design Complete / Large / High → independent delta review** before dependent implementation; independent validation not recovered, no delivery. SR-015 native CI method retained; previous scoped pass is not a waiver for revised native code.
