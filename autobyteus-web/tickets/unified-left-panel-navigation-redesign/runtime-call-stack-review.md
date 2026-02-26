# Runtime Call Stack Review

Use this document as the quality gate for runtime-call-stack completeness and separation-of-concerns.

## Review Basis

- Runtime Call Stack Document:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/unified-left-panel-navigation-redesign/design-based-runtime-call-stack.md`
- Source Design Basis:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/unified-left-panel-navigation-redesign/proposed-design.md`

## Deep Review Iteration Log

### Iteration 1 to 5 (Prior)

- Prior rounds resolved shell-level two-layer navigation and host-boundary route ownership.
- Result at end of iteration 5: pass for then-modeled use cases.

### Iteration 6 (Current Round: Page-Level Secondary Navigation Audit)

Findings identified during this new round:

- `F-006` (Gap, blocking before redesign update): `/agents` still modeled/implemented with page-level sidebar (`ResponsiveMasterDetail` + `AI Agents` local nav), causing perceived two-level navigation.
- `F-007` (Gap, blocking before redesign update): `/prompt-engineering` still used `PromptSidebar` for section switching.
- `F-008` (Gap, blocking before redesign update): `/tools` still used `ToolsSidebar` for section switching.
- `F-009` (SoC/naming smell): memory index controls were represented via `MemorySidebar`, conflating domain content panel with navigation component semantics.
- `F-010` (Coverage gap): runtime call stacks did not explicitly model in-content section-switch flows for Agents/Prompt/Tools.

Design updates applied in this round:

- Added explicit design deltas `C-009` to `C-022`.
- Regenerated runtime call stacks to include in-content section-switch use cases and memory panel semantics.
- Clarified architecture decision: keep multi-route pages, but only one persistent global left panel.

### Iteration 7 (Post-Update Re-Review)

- Re-reviewed updated proposed design + regenerated call stacks.
- No unresolved blocking gaps remain in the modeled design.
- Separation of concerns is clean at the architectural boundary level.

### Iteration 8 (Strict Top-Level Purity Correction)

- New UX correction request: remove same-level duplication on the right content (`Agents` page must not offer `Agent Teams` switch if `Agent Teams` is already top-level left nav).
- Design and implementation correction applied:
  - `Agent Teams` moved to dedicated route host `/agent-teams`.
  - `AppLeftPanel` route mapping updated to `agentTeams -> /agent-teams?view=team-list`.
  - Runtime action links updated accordingly.
- Re-review result: pass, no new SoC regressions.

## Per-Use-Case Review

| Use Case | Business Flow Completeness (`Pass`/`Fail`) | Gap Findings | Structure & SoC Check (`Pass`/`Fail`) | Dependency Flow Smells | No Legacy/Backward-Compat Branches (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- |
| Top-level app navigation from `AppLeftPanel` | Pass | None | Pass | None | Pass | Pass |
| Dedicated Agent Teams route from top-level navigation (`/agent-teams`) | Pass | None | Pass | None | Pass | Pass |
| Prompt Engineering section switching (content-header controls) | Pass | None | Pass | None | Pass | Pass |
| Tools section switching (content-header controls) | Pass | None | Pass | None | Pass | Pass |
| Memory index selection + inspector flow (domain panel semantics) | Pass | None | Pass | None | Pass | Pass |
| Running instance selection outside workspace | Pass | None | Pass | None (host-owned routing) | Pass | Pass |
| Running instance selection inside workspace | Pass | None | Pass | None | Pass | Pass |
| New run creation from running section | Pass | None | Pass | None | Pass | Pass |

## Findings

- None (current iteration final state).

## Resolved Findings History

- [F-001] Dependency: risk of route ownership leakage from running panel. Resolved by host-owned routing + semantic emits.
- [F-002] Gap: missing top-level menu use-case coverage. Resolved in prior iteration.
- [F-003] Gap: missing direct `Agent Teams` top-level mapping use case. Resolved in prior iteration.
- [F-004] Gap: missing settings-bottom behavior use case. Resolved in prior iteration.
- [F-005] Gap: `Agents` canonical route mapping ambiguity. Resolved in prior iteration.
- [F-006] Gap: `/agents` still had local sidebar-level navigation. Resolved by `C-009` + `C-010` design updates.
- [F-007] Gap: `/prompt-engineering` still had local sidebar-level navigation. Resolved by `C-011` + `C-012` design updates.
- [F-008] Gap: `/tools` still had local sidebar-level navigation. Resolved by `C-014` + `C-015` design updates.
- [F-009] SoC/Naming: memory domain panel labeled as navigation sidebar. Resolved by `C-016` + `C-017` design updates.
- [F-010] Coverage: missing runtime traces for new in-content section-switch flows. Resolved by call stack regeneration in this iteration.
- [F-011] UX purity gap: duplicated same-level `Agents/Agent Teams` switching in right content. Resolved by dedicated `/agent-teams` route host and updated left-panel mapping.

## Gate Decision

- Implementation can start: `Yes`
- Blocking gaps remaining: `No`
- Separation-of-concerns regressions remaining: `No`
