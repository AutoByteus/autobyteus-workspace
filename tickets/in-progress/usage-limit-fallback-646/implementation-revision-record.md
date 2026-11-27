# Implementation Revision Record — autobyteus-646

## IR-001 — SR-004 … SR-008 implemented; on hold for ARCH-REV-003 (in progress, not handed off)

- **Basis:**
  - design-spec.md § SR-004 Revisions R-1 … R-10 (SR-005 cause, SR-006 `agent_history`, SR-007/SR-008 the continue notice);
  - ARCH-REV-002 Pass (since withdrawn).
- **Built:**
  - the run event hub (C-1);
  - the usage-limit detector and C-4;
  - the exhaustion view (C-3);
  - the roots' `switchAgentRuntime` (R-1) and the `RunRuntimeSwitcher`;
  - `FallbackChooser` (router C-7, history C-8);
  - `submit_runtime_switch` (the router template is unchanged until R-6 approval);
  - the switch listener and the switch records (C-2);
  - delegation exhaustion plus the history layer (R-2, R-8);
  - the setting, GraphQL and the web toggle;
  - docs;
  - the built-server E2E UL-01 … UL-07.
- **Implementation questions raised and answered:**
  - IQ-002: the history layer's origin, answered by SR-006;
  - IQ-003: the continue message showed as a user row, answered by SR-007;
  - IQ-004: R-9's notice-only input would hold back the hand-over, answered by SR-008 / R-10 (`presentAsNotice` tag).
- **Evidence:**
  - `evidence/IMP-01-server-unit.log` (1100 files pass);
  - `evidence/IMP-02-server-integration.log` (92 files pass);
  - `evidence/IMP-03-usage-limit-switch-e2e.log` with its receipt (7/7 pass).
  - IMP-01/02 ran before the R-10 change; the full suites are re-run at handoff.
- **Hold (architecture reviewer, ARCH-REV-003 Fail, 2026-11-27).** Until the Solution Designer revises, these held parts stay as built and are not reworked:
  - R-1: the root `switchAgentRuntime`, `TeamMemberRuntimeSwitchCommitter`, `StandaloneStoppedRunSelectionUpdater` use (AR-006);
  - the listener's in-flight set (AR-007);
  - the usage-limit classification in the detector (AR-008);
  - log retention (AR-009).
- **Not handed off.** The package goes to code review after the revised design is implemented.
