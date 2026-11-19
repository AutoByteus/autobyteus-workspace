# Ubuntu AppImage Sandbox Startup — Solution Revision Record

## Revision Index

| Revision | Phase | Trigger | Prior status | Current status | IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User's 2026-09-24 preference for no manual flag and willingness to accept a no-sandbox fallback | N/A — diagnosis-only Draft | Ready for Approval | BEH-001–004; SCN-001–004; REQ-001–005; AC-001–006 | Proposed conditional AppImage fallback; no approval or design yet |
| SR-002 | Requirements | Explicit user approval of conditional fallback on 2026-09-24 | Ready for Approval | Approved | Same IDs; no behavior changes | Approval captured; architecture phase authorized |
| SR-003 | Evidence | Discovery of builder-generated desktop default `--no-sandbox` | Approved | Approved | BEH-002 / SCN-002 current-state evidence | Corrected current behavior; approved target unchanged |
| SR-004 | Design | Post-approval packaging/runtime architecture investigation and design | Approved / no design | Approved / design Ready | BEH-001–004; REQ-001–005; AC-001–006 | Medium / High completed solution; architecture review required by rule |
| SR-005 | Design + evidence recovery | ARCH-REV-001 Blocked / F-001–F-002 | Approved / SR-004 review Blocked | Approved / revised design Ready | BEH-001–003; SCN-001–004; REQ-001–004; AC-001–005 | Removed failed-probe-as-proof premise; actual sandboxed attempt gates fallback; corrected scenario/inventory coherence; renewed review required |

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
