# Solution Revision Record — autobyteus-318

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-318 (with 12 merged Tasks and comment items) | N/A | N/A | Requirements Approved; Design Ready | BEH-001..BEH-010; REQ-001..REQ-016 | Triage of 56 items; design; Large / Low |
| SR-002 | Design | ARCH-REV-001 (Fail, Design Impact) | AR-001; R-1..R-4 | Design Ready (SR-001) | Design Ready | BEH-006, BEH-001, BEH-008; REQ-010, REQ-001, REQ-014 | File classification rule stated; T-57 removes the out-of-package error; recommendations adopted |
| SR-003 | Design | Implementation Design Impact on T-28 sig. 2 (2026-11-01) | T-28 | Design Ready (SR-002) | Design Ready | BEH-007; REQ-008; AC-008 | Window measured from the scripted CLI's own clock (fixture logs turn end / background exit and SIGTERM); lower bound tightened to GRACE_MS; product time stamps rejected |
| SR-004 | Design | ARCH-REV-003 (Fail, Design Impact) | AR-002, AR-003 | Design Ready (SR-003) | Design Ready | BEH-007; REQ-008; AC-008 | Fixture log gated by AGY_FAKE_PROCESS_LOG; SIGTERM logged then re-raised outside interrupt_resend; times recorded before the observable write; lower bound GRACE_MS − 250 ms |

## Revision Entries

### SR-001 — Triage, requirements baseline and design

- Phase and classification: `Initial Baseline`
- Triggering evidence: the Task (description and the comments through 2026-11-01, including 355 FU-1 and 357 FU-004/FU-005), `bundle-test-hygiene.md`, the 294 follow-ups, the 311 and 343 follow-up files, and the PM's message of 2026-11-01 (drop authority).
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status:
  - requirements `Approved`;
  - design `Ready`.
- IDs affected: all (initial).
- Scenario basis: SCN-001..SCN-006, all Supported Normal Scenarios (operational tooling).
- Why recorded: first coherent baseline.
- Sections: all four documents created; evidence SD-01, SD-02.
- Supplements: none behavior-defining.
- Product design: N/A
- Intended behavior changed: `No` for the product, apart from removing the unused transcription URL and the unused dependency (both dead).
- Approval:
  - who: the Solution Designer within the direction, user informed 2026-11-01;
  - what: dropped items per DEC-001 under the PM's message.
- Design and review basis: N/A (first design).
- Classification:
  - `task_size = Large`: many files across server tests, web tests and config, Electron, shared tooling and docs;
  - `architectural_risk = Low`: no runtime, contract, persistence, security or concurrency change; the gate keeps its behavior.
- Handoff: recorded in `handoff-architecture-review.md`.
- Downstream impact: architecture review (Large).
- Remaining gaps:
  - U-01 (watcher latency), U-02 (second context-file failure), U-03 (probe state): investigation-first items for implementation;
  - live paid suites listed, not run.
- Next action: architecture review.

### SR-002 — Architecture review ARCH-REV-001 resolved

- Phase and classification: `Design Impact`
- Trigger: `design-review-report.md` ARCH-REV-001, Fail.
- Finding IDs: AR-001 (blocking); R-1..R-4 (non-blocking).
- Prior status: design `Ready` (SR-001). Current status: design `Ready`; requirements unchanged and `Approved` (SR-001).
- IDs affected: BEH-006, REQ-010, AC-010, QR-001 (AR-001); REQ-014 (R-1); REQ-001 (the rule statement for the web project).
- Changes:
  - **AR-001:** `design-spec.md` gets a new "File Classification Rule": each gate attributes paths relative to its package. Test files are defined only by the package's own rule. Every other reached file, including another package's source, is production at 0 errors.
  - **T-57** (Per-Item Design and sequence step 1): a type-only cast correction in `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` L33 removes the one out-of-package error. The review named the frozen snapshot test as the path, but `tsc --explainFiles` shows `test-support/live-e2e/live-e2e-harness.ts` → `autobyteus-ts/src/index.js` reaches it; rerouting that test's import left the error (measured). With the cast, the gate has 0 production errors (measured). The investigation notes get T-57.
  - **R-1:** a fresh per-run default output dir, and a refusal message (DS-005, T-50).
  - **R-2:** `isTestFile` lives in each package's config.
  - **R-3:** a risk entry.
  - **R-4:** runner fail-closed tests in the kept spec.
- Intended behavior changed: `No`. The probe default folder name is test tooling inside REQ-014's intent.
- Approval impact: none; SR-001 approval stands.
- Classification: unchanged, `Large` / `Low` (the reviewer accepted it).
- Handoff: `handoff-architecture-review.md` (updated) → `/software_engineering_team/architecture_reviewer` for re-review.
- Remaining gaps: U-01..U-03 (investigation-first for implementation).
- Next action: architecture re-review.

## Review Pass Record

- 2026-11-01: ARCH-REV-002 **Pass** on SR-001 + SR-002 (Large / Low). Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- The reviewer confirmed the AR-001 resolution (`test-support/live-e2e/live-e2e-harness.ts` L14 imports `autobyteus-ts/src/index.js`).
- R-5 (non-blocking): a one-line comment beside the T-57 cast; the reviewer passed it to implementation.
- The reviewer handed off to `/software_engineering_team/implementation_engineer`; no forwarding by the Solution Designer.

### SR-003 — T-28 signature 2: measure the idle window from the fixture's clock

- Phase and classification: `Design Impact` (anticipated by the SR-001 design: "if no server-recorded time exists, return a Design Impact").
- Trigger: the implementation engineer's message (run `implementation_engineer_0a36a51cb0b8448fa275297f88b72e40`, HEAD `351265ce41`). The server records no idle-arm or shutdown time; options (a) product time stamp, (b) fixture process times, (c) drop.
- Decision: (b), extended to both ends.
  - `agy-failure-cli.mjs` already logs SIGTERM with `at` (L47-57). It also controls when it ends a turn and when it writes a background exit message.
  - With both ends from the fixture's clock, `SIGTERM − start ≥ GRACE_MS` by construction, so the lower bound tightens to `GRACE_MS`.
  - (a) rejected: a product contract change for a test (DESIGN.md "Start with supported behavior").
  - (c) not needed: (b) fixes the cause cheaply and strengthens the check.
- Intended behavior changed: `No` (test-only). Requirements unchanged (REQ-008 "measured from server-recorded times" is met in spirit by times independent of frame delivery; AC-008 wording updated below).
- Classification unchanged: Large / Low.
- Handoff: revised package → architecture reviewer (rule for a revised Large package), which routes to implementation.

### SR-004 — ARCH-REV-003 on T-28 signature 2

- Phase and classification: `Design Impact`
- Trigger: `design-review-report.md` ARCH-REV-003, Fail. The direction was confirmed; two specification gaps remained.
- **AR-002, verified.** In `agy-failure-cli.mjs` the lifecycle log and SIGTERM handler exist only inside `if (interruptResend)` (L46-57), and the test runs `linked_skills` without `AGY_FAKE_PROCESS_LOG` (L195-196).
  - Fix: the log is gated by `AGY_FAKE_PROCESS_LOG` alone.
  - Outside `interrupt_resend` the SIGTERM handler logs, then re-raises the signal, so the process ends at once with the same observable result as today.
  - The exit delay stays specific to `interrupt_resend`.
  - The test sets the variable and restores it.
- **AR-003, accepted.**
  - Times are recorded before the write that makes the event observable.
  - The lower bound is `GRACE_MS − 250 ms`: it covers one-tick early timer firing plus whole-millisecond clock reads from two processes, and is still 4× tighter than `GRACE_MS − 1 s`.
- Premise checked: the quiet copy's process is alive while idle (test L366), so SIGTERM marks the shutdown.
- Intended behavior changed: `No`. Classification unchanged: Large / Low.
- Handoff: architecture reviewer (re-review).
- 2026-11-01: ARCH-REV-003 **Fail** on SR-003 (AR-002, AR-003; T-28 sig. 2 only), resolved in SR-004.
- 2026-11-01: ARCH-REV-004 **Pass** on SR-001..SR-004 (Large / Low); R-1..R-5 stand. The reviewer handed off to `/software_engineering_team/implementation_engineer`; no forwarding by the Solution Designer.
