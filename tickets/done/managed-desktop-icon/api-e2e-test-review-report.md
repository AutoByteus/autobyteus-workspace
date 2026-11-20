# Managed desktop icon — API/E2E test-code review

**CRR-002 · Pass.** The probe distinguishes an installed launcher from a running window that GNOME actually associates with that launcher. Its operator instructions correctly require separate visual evidence for the branded tile. No actionable finding.

## Basis and scope

First proportional review after [API-REV-001](api-e2e-revision-record.md) passed (QA confidence 97.1%; required live validation completed). Reviewed QA commit `84d2564185` against [CRR-001](code-review-report.md) at `d2cb84cde6`, on `fix/managed-desktop-icon` → `personal`. Medium / High, unchanged. Context: [SR-001 requirements](requirements-doc.md), [investigation](investigation-notes.md), [solution history](solution-revision-record.md), [DS-001.1](design-spec.md), [ARCH-REV-001](architecture-review-revision-record.md), [IR-001](implementation-revision-record.md), the [coverage investigation](api-e2e-coverage-investigation.md) and [execution report](api-e2e-execution-coverage-report.md). No prior unresolved findings or delivery revision. [Project testing guideline](../../../TESTING.md) applied: observe the actual user surface, and distinguish supporting metadata from user-visible proof. No conflict.

| Durable path | Change | Responsibility |
| --- | --- | --- |
| `test-support/managed-desktop-identity/shell-probe.js` | Added | Observe the real packaged app's normal windows in Shell and assert their association with the installed desktop ID (AC-002; new and upgraded launch paths). |
| `test-support/managed-desktop-identity/README.md` | Added | Specify guest setup, real user triggers, and which visual claims the probe cannot make. |

No other durable test additions, updates or removals; no product edits in the QA delta. The ticket's session observer, JSON, logs and screenshots are measurement evidence, not reusable test code.

## Proportional checks

| Check | Result and evidence |
| --- | --- |
| Scenario grouping, naming and navigability | Pass. One named function checks one live desktop boundary; the short README covers both backends and both supported window counts without duplicating the test. |
| Assertions prove the requirement | Pass. The registered desktop file and icon must match, but neither can make the test pass on its own. The probe checks the exact positive count, observed client type and WindowTracker ID of **every** normal window for the supplied main PID. WM class is diagnostic only. |
| Helpers and fixtures | Pass. The same read-only observation serves both users, backends and counts. No mock tracker, fake desktop ID assignment or product hook. |
| Isolation and determinism | Pass within the stated guest profile. The operator uses the Electron main PID, lets indexing settle naturally, and removes the observer or guest. A transient anonymous window is not credited. The probe does not edit registration, Shell state or favorites. |
| Stale, duplicated or disabled tests | Pass. Neither addition replaces existing coverage; the opt-in live check addresses an observation native/file tests cannot make. |
| Agreement with execution | Pass. [Live controls](evidence/API-04-probe-controls.log) passed for one and two windows on both native Wayland and XWayland; wrong backend and count failed. [Final state](evidence/API-04-final-state.log) identifies the tested probe. Painted artwork, favorite retention and absence of a second tile are supported separately by guest captures, not inferred from IDs. |
| Supported scenario and real trigger | Pass. Approved first and upgraded launches and multi-window Dock association establish the scenario independently of the helper. The operator launches the installed app and opens a real second node-bound window before measuring; the helper neither creates nor assigns the windows. Cleanup and preservation are separately evidenced in API-04. |

## Disposition

**Pass → Delivery Engineer.** Changed durable scope fully reviewed; no unresolved findings or follow-ups. The diff and positive/negative execution evidence were sufficient; no suite or guest rerun. The result does not expand coverage to standalone Xorg, instantaneous index updates or production trust. QA proved AC-001–004 within its documented scope. AC-005 (integrated docs, merge and finalization) remains Delivery's gate. No release or publication.
