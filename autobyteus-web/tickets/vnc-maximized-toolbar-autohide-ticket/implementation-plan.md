# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: One focused UX behavior change in a single Vue component (`VncHostTile.vue`) with no backend/API/schema impact.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> design-based runtime call stack -> runtime call stack review -> refine until review-pass -> progress tracking (design doc optional)

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Runtime call stack review gate passed for all in-scope use cases.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Maximize VNC view and hide toolbar by default to reclaim vertical space.
  - Reveal toolbar when cursor reaches the top edge in maximize mode.
  - Auto-hide toolbar about 1 second after cursor leaves toolbar.
  - Keep existing `Esc` behavior to exit maximize mode.
- Touched Files/Modules:
  - `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue`
- API/Behavior Delta:
  - UI behavior only; no public API changes.
  - Toolbar switches from always-visible to auto-hidden only in maximize mode.
- Key Assumptions:
  - Maximize mode is used for active sessions where controls can be transient.
  - Top-edge reveal hotspot is sufficient discoverability for this minimal version.
- Known Risks:
  - If reveal hotspot is too small, users may miss it.
  - Timer race conditions can cause flicker if hide/show timers are not cleared consistently.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Maximize enters hidden-toolbar mode | `tickets/vnc-maximized-toolbar-autohide-ticket/design-based-runtime-call-stack.md` | `tickets/vnc-maximized-toolbar-autohide-ticket/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Top-edge reveal + delayed hide | `tickets/vnc-maximized-toolbar-autohide-ticket/design-based-runtime-call-stack.md` | `tickets/vnc-maximized-toolbar-autohide-ticket/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Escape exits maximize and restores baseline UI | `tickets/vnc-maximized-toolbar-autohide-ticket/design-based-runtime-call-stack.md` | `tickets/vnc-maximized-toolbar-autohide-ticket/runtime-call-stack-review.md` | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Small`: refine implementation plan (and add design notes if needed), then regenerate call stack and re-review.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests (and integration tests when needed) before or alongside implementation.
- One file at a time is the default: complete a file and its tests before moving on when dependency graph is clean.
- Exception rule for rare cross-referencing: allow temporary partial implementation only when necessary, and record the design smell and follow-up design change.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `tickets/vnc-maximized-toolbar-autohide-ticket/*.md` | Existing `VncHostTile` behavior understanding | Pre-implementation workflow gate from skill |
| 2 | `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue` | Plan + call stack review gate | Main behavior implementation |
| 3 | Targeted validation command(s) | Component edit | Verify no regressions in affected area |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | No | N/A |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | None |

## Step-By-Step Plan

1. Add maximize-mode toolbar visibility state and timer utilities (`reveal` and `auto-hide`) in `VncHostTile.vue`.
2. Add a slim top-edge reveal hotspot and toolbar mouse enter/leave handlers in template.
3. Update maximize/escape/unmount paths to clear timers and restore predictable toolbar state.
4. Run targeted test command(s) and update progress artifact with final verification.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue` | Toolbar hidden by default in maximize mode, reveals from top edge, hides after leave delay, Esc still exits maximize | Targeted suite runs successfully | N/A | Keep behavior minimal; no extra controls/shortcuts |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | None | Not needed | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Pending |

## Test Strategy

- Unit tests: Run targeted Nuxt Vitest command covering VNC-related or component-adjacent suites.
- Integration tests: N/A for this small UI behavior change.
- Test data / fixtures: None required.
