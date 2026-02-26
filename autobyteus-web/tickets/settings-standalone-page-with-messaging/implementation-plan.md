# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Multi-file cross-cutting refactor across route hosts, global nav chrome, layout composition, and settings IA.
  - Includes explicit `Remove` operations and test decommissioning.
- Workflow Depth:
  - `Medium` -> proposed design doc -> proposed-design-based runtime call stack -> runtime call stack review (minimum 3 rounds) -> implementation plan -> progress tracking.

## Plan Maturity

- Current Status: `Implementation-Completed`
- Notes: Design gate passed and scoped implementation tasks (T-001..T-006) have been executed with focused tests passing.

## Preconditions (Must Be True Before Finalizing This Plan)

- Runtime call stack review artifact exists: Yes
- All in-scope use cases reviewed: Yes
- No unresolved blocking findings: Yes
- Minimum review rounds satisfied: Yes (`Medium` >= 3)
- Final gate decision in review artifact is `Implementation can start: Yes`: Yes

## Runtime Call Stack Review Gate (Required Before Implementation)

| Round | Use Case | Call Stack Location | Review Location | Naming Naturalness | File/API Naming Clarity | Business Flow Completeness | Structure & SoC Check | Unresolved Blocking Findings | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UC-001..UC-005 | `tickets/settings-standalone-page-with-messaging/proposed-design-based-runtime-call-stack.md` | `tickets/settings-standalone-page-with-messaging/runtime-call-stack-review.md` | Pass | Pass | Fail | Fail | Yes | Fail |
| 2 | UC-001..UC-005 | same | same | Pass | Pass | Fail | Pass | Yes | Fail |
| 3 | UC-001..UC-005 | same | same | Pass | Pass | Pass | Pass | No | Pass |
| 4 | UC-001..UC-005 | same | same | Pass | Pass | Pass | Pass | No | Pass |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Review rounds completed: 4
  - Final review round: 4
  - Final review gate line (`Implementation can start`): Yes

## Principles

- Preserve host-boundary ownership:
  - Layout owns chrome/back affordance.
  - Page owns section/query state.
- No backward-compat route retention for removed `/messaging` host.
- Apply global nav consistency updates in full and collapsed variants in the same change set.
- Update/remove affected tests in same PR.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `layouts/settings.vue` | none | New standalone shell is foundational. |
| 2 | `pages/settings.vue` | 1 | Binds to new layout and introduces messaging section state. |
| 3 | `components/AppLeftPanel.vue` | 2 | Remove messaging top-level mapping in full nav. |
| 4 | `components/layout/LeftSidebarStrip.vue` | 3 | Keep collapsed nav in sync with full nav IA. |
| 5 | `pages/messaging.vue` | 2-4 | Remove old host only after new IA wiring exists. |
| 6 | tests (`pages/__tests__/settings.spec.ts`, `components/__tests__/AppLeftPanel.spec.ts`, new `layouts/__tests__/settings.spec.ts`, remove `pages/__tests__/messaging.spec.ts`) | 1-5 | Lock intended IA and prevent regressions. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-001 | No | layout test + manual settings entry |
| C-002 | Modify | T-002 | No | settings page tests |
| C-003 | Remove | T-005 | Yes | reference scan + route behavior checks |
| C-004 | Modify | T-003 | No | AppLeftPanel tests |
| C-005 | Modify | T-004 | No | collapsed-nav assertions |
| C-006 | Modify | T-006 | No | settings tests |
| C-007 | Remove | T-006 | Yes | test cleanup validation |
| C-008 | Modify | T-003 | No | AppLeftPanel tests |
| C-009 | Add | T-001 | No | settings-layout test |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-005 | `pages/messaging.vue` | Remove | Delete route host; ensure no runtime nav refs remain. | Low |
| T-006 | `pages/__tests__/messaging.spec.ts` | Remove | Delete obsolete host-route test. | Low |

## Step-By-Step Plan

1. T-001: Add standalone settings layout with top-left back button to `/workspace`.
2. T-002: Update settings page to use new layout and add `messaging` section view.
3. T-003: Remove messaging nav item/mapping from `AppLeftPanel` and update tests.
4. T-004: Remove messaging nav item/mapping from `LeftSidebarStrip`.
5. T-005: Remove standalone `/messaging` page host.
6. T-006: Update/add/remove impacted tests and run focused suite.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `layouts/settings.vue` | Settings renders outside global left panel chrome with working back affordance. | `layouts/__tests__/settings.spec.ts` passes. | Manual: settings has back arrow, no app left panel. | New file |
| `pages/settings.vue` | Includes messaging section and supports query selection. | `pages/__tests__/settings.spec.ts` updated and passing. | Manual: messaging appears under settings sections. | Modify existing section union/types. |
| `components/AppLeftPanel.vue` | No messaging top-level item or route map branch. | `components/__tests__/AppLeftPanel.spec.ts` passing with updated assertions. | Manual: no messaging in full left nav. | Keep Settings footer nav. |
| `components/layout/LeftSidebarStrip.vue` | No messaging icon entry or route map branch. | Add/adjust source assertions if test added. | Manual: no messaging in collapsed left nav strip. | Keep settings button. |
| `pages/messaging.vue` | Removed from codebase. | Obsolete tests removed. | Manual: no top-level messaging route entry point via nav. | no compatibility alias. |

## Test Strategy

- Unit/source tests:
  - `pnpm test:nuxt pages/__tests__/settings.spec.ts --run`
  - `pnpm test:nuxt components/__tests__/AppLeftPanel.spec.ts --run`
  - `pnpm test:nuxt layouts/__tests__/settings.spec.ts --run` (new)
- Focused regression:
  - `pnpm test:nuxt pages/__tests__/messaging.spec.ts --run` should be removed from suite as part of decommission.
- Manual checks:
  - Open Settings from left panel footer.
  - Verify back arrow returns to `/workspace`.
  - Verify Messaging exists only inside Settings.
  - Verify Messaging is absent in both full and collapsed global nav.
