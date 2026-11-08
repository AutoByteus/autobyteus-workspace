# Solution Revision Record — autobyteus-434

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after investigation and reproduction | N/A | N/A | Approved (Solution Designer within the direction, user informed) | BEH-001…008, REQ-001, 002, 004, 005 (REQ-003 dropped), AC-001…006 | Requirements approved; design next |
| SR-002 | Design | Architecture design on the approved SR-001 basis; PM confirmed the order bug stays in this ticket | N/A | Requirements Approved, no design | Design Ready; Medium / High | REQ-001, 002, 004, 005; DS-001…004 | `design-spec.md` written; routed by the handoff rules |
| SR-003 | Design | ARCH-REV-001 Fail (Design Impact) | AR-001, AR-002, N-1, N-2, N-3 | Design Ready (SR-002), review Fail | Design Ready; Medium / High | REQ-001, 002, 005; AC-002, AC-003; DS-002, DS-003 | Agent catch-up before open; per-owner scheduler adoption; re-review requested |
| SR-004 | Design | ARCH-REV-002 Fail (Design Impact) | AR-001(c), N-4…N-7 | Design Ready (SR-003), review Fail | Design Ready; Medium / High | REQ-001, 002; AC-002, AC-003; DS-003 | Agent Connect Rule; every open calls connected(); FU-002; re-review requested |

## Revision Entries

### SR-001 — Live-update stall on lost connection and duplicated user message on load

- Phase and classification: `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Project Task autobyteus-434 and its four user clues (2026-11-08); reproduction runs 3–5 (`evidence/repro-run-*`); read-only measurement of the user's real run on the desktop node.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements Approved; design not yet written.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all of the requirements doc at SR-001.
- Scenario-basis or scenario-validity changes: N/A (baseline).
- Why this baseline or revision was recorded: first coherent baseline.
- Canonical requirements, investigation and design sections changed: created `requirements-doc.md`, `investigation-notes.md`, `follow-ups.md`.
- Supplemental artifacts added, changed or removed: `evidence/repro/phone-live-repro.mjs` and its runs (evidence only).
- Product design evidence or product decisions incorporated: N/A.
- Intended behavior changed: `Yes` (new: reconnect without giving up, re-sync on becoming visible, stored message id for external runtimes).
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved by the Solution Designer within the Task's direction (fix a real stall; the order bug kept per the PM's direction; no `Needs user` decision: no new UI, no Android permission, no 403/416 change, no release, no data rewrite); the user informed in the Solution Designer's conversation on 2026-11-08; baseline = `requirements-doc.md` at SR-001.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification and rationale changes: N/A (before design).
- Applied handoff-rule outcome / result-file reference: none yet.
- Downstream and architecture-review impact: N/A.
- Remaining gaps, assumptions or blocked decisions: ASM-001 (WebView visibility events) to validate on the emulator; FU-001 recorded.
- Next action: architecture design.

### SR-002 — Architecture design

- Phase and classification: `Design` (completes the solution on the unchanged SR-001 requirements)
- Triggering evidence: architecture investigation (investigation notes, Architecture Investigation Findings; design spec Current-State Read with file/line citations); PM message 2026-11-08 (keep the order bug here, send FU-001 at the end, no beta alert).
- Triggering finding IDs: N/A
- Prior status: requirements Approved, no design. Current: design `Ready`.
- IDs affected: REQ-001, REQ-002, REQ-004, REQ-005; BEH-002 extended in design to agent runs (catch-up by stored projection, DS-003), within REQ-001's wording.
- Scenario-basis changes: None.
- Why recorded: design completed.
- Canonical sections changed: created `design-spec.md`; investigation notes unchanged except as cited.
- Supplements: None new.
- Intended behavior changed: `No`.
- Approval impact: none (SR-001 approval applies); design approval by the user not required by the direction.
- Affected design/review basis: N/A (first design).
- Post-design classification: `task_size: Medium`, `architectural_risk: High` (lifecycle of four live run streams, agent re-sync during live events, additive persisted fields); see design spec.
- Applied handoff-rule outcome / result-file reference: `handoff-sr-002.md`; rule "Large or High risk → independent architecture review" → sent to `/software_engineering_team/architecture_reviewer` (delivered 2026-11-08).
- Downstream and architecture-review impact: per the handoff rules.
- Remaining gaps: ASM-001 (Android WebView visibility) for validation; FU-001.
- Next action: hand off.

### SR-003 — Design revision for ARCH-REV-001

- Phase and classification: `Design Impact` (technical design only; approved intent unchanged)
- Triggering report: `design-review-report.md` ARCH-REV-001 (Fail, Design Impact), 2026-11-08.
- Triggering finding IDs: AR-001 (a, b, c), AR-002 (a, b, c), N-1, N-2, N-3; premises P-001 (Reachable), P-002 (Unclear, adopted as a recommendation), P-003 (Reachable).
- Prior status: design Ready (SR-002), review Fail. Current: design Ready (SR-003).
- IDs affected: REQ-001, REQ-002, REQ-005; AC-002, AC-003; DS-002, DS-003 (DS-001, DS-004 unchanged).
- Scenario-basis changes: None.
- Changes:
  - AR-001: the agent catch-up runs before the socket opens (load stored state → commit → open), so no live event can race it and no revision-guard loop or conflict end state is needed. A narrow `loadRunStoredState` reads only the projection and file changes; the commit keeps config and status. `onReconnected` is dropped: only scheduler-driven attempts catch up.
  - AR-002: a per-owner adoption table states the success point (snapshot accepted for Team, Org and collaboration; socket open after catch-up for the agent), the failure call sites, the re-sync mechanics (Org retires the generation, then recovers), the owner-initiated connect, `requestRecovery`, and the persistent-failure report. `WebSocketClient` becomes a plain socket (`RECONNECTING` removed); one schedule starting at 1 s.
  - N-1: recorded as established. N-2: `agentRunStore.ts` must not grow, so construction moves into a factory; `TeamStreamingService.ts` ≤ 500 lines with a named extraction. N-3: stated.
- Canonical sections changed: `design-spec.md` (most sections rewritten where AR-001/AR-002 touch them; the persisted-data, DS-004 and behavior-map sections keep SR-002's content); `investigation-notes.md` (Architecture Investigation Findings, SR-003 additions).
- Intended behavior changed: `No`.
- Approval impact: none (SR-001 approval applies).
- Affected design/review basis: ARCH-REV-001 covered SR-002; it applies to the unchanged parts (it passed the scheduler ownership, `pageResumeSignal`, the removals, DS-004 and the no-migration decision). The re-review covers AR-001, AR-002 and the sections they touch.
- Post-design classification: unchanged, `Medium` / `High` (about 12 production files now).
- Applied handoff-rule outcome: `handoff-sr-003.md`; the rule "revised architecture package, High risk → independent architecture review" routes it to `/software_engineering_team/architecture_reviewer`.
- Remaining gaps: ASM-001; FU-001; the agent read-to-open window (design Risks).
- Next action: re-review.

### SR-004 — Design revision for ARCH-REV-002

- Phase and classification: `Design Impact` (technical design only; approved intent unchanged)
- Triggering report: `design-review-report.md` ARCH-REV-002 (Fail), 2026-11-08: AR-001(c) open (P-004 Reachable, P-005 Unclear); N-4…N-7. AR-002, AR-001(a)/(b) and N-1…N-3 resolved.
- Prior status: design Ready (SR-003), review Fail. Current: design Ready (SR-004).
- Changes:
  - **Agent Connect Rule:** a connect request for an agent stream in a loss streak runs the catch-up attempt (waiting), or does nothing (held, attempting). Only an idle stream connects without catch-up. This covers the history read's `reconcileDiscoveredActiveRuns`, the real owner-initiated caller (verified, `runHistoryLoadActions.ts:288-345`, `:147`).
  - **P-005:** every success point calls `connected()`, whoever started the connect.
  - **N-4:** `isRecovering()` replaces `isWaiting()`.
  - **N-6:** `dropConnection(reason)` for the re-sync.
  - **N-7:** every attempt exit ends in one scheduler call.
  - **N-5:** FU-002 (dead `activeRunRecoveryCoordinator.ts`, verified by grep).
  - The step-5 tests are added.
- Intended behavior changed: `No`. Approval impact: none.
- Classification: unchanged, `Medium` / `High`.
- Applied handoff-rule outcome: `handoff-sr-004.md`; the rule "revised package, High risk" routes it to `/software_engineering_team/architecture_reviewer`.
- Next action: re-review of the agent row, DS-003, the Agent Connect Rule and the step-5 tests.

### Review result on SR-004 (no new SR round)

- ARCH-REV-003 passed SR-004 (2026-11-08), confirming `task_size: Medium` and `architectural_risk: High`. The reviewer handed the package to `/software_engineering_team/implementation_engineer`. This SR-004 record does not repeat that handoff.
- N-8 (stale wording): corrected in `design-spec.md` as an editorial fix. The `agentRunStore.ts` file row now says `requestConnect()`, and the common rule names the Agent Connect Rule for agent streams. Neither intended behavior nor design substance changed.
- N-9 (the accepted redundant load): kept as stated.
