# Mobile Shell Scope Analysis

## Status

Completed on 2026-05-21 after user concern that the implementation may be drifting from a mobile UI/shell improvement into shared/core functionality.

## Principle Being Checked

Mobile is an add-on shell for phone UX. It may change mobile layout, mobile flow, mobile copy, and mobile UI/session state. It must reuse the existing core frontend logic and must not change backend contracts, runtime/model semantics, agent/team execution, `activeContextStore.send()` semantics, desktop `RunConfigPanel`, or desktop/web composer behavior.

## Changed File Surface Observed

### Mobile-only / expected scope

- `autobyteus-web/components/mobile/MobileRunSetup.vue`
- `autobyteus-web/components/mobile/MobileChat.vue`
- `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts`
- `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts`
- `autobyteus-web/composables/mobile/useMobilePendingTeamRunAttachments.ts`
- `autobyteus-web/stores/mobileWorkStore.ts`
- mobile component tests
- deletion of `MobileLaunchSummary.vue`
- deletion of `MobileTeamLaunchFocusPicker.vue`

### Shared UI seam / caution scope

- `autobyteus-web/components/agentInput/AgentUserInputForm.vue`
- `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
- `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.spec.ts`

No backend, API, runtime/model core stores, agent/team run stores, or `activeContextStore` source files were observed in the changed-file surface.

## Behavior Implemented By The Current Change

1. Mobile Start new removes the setup `First message` textarea.
2. Mobile Start new removes setup `First message target` for teams.
3. Mobile Start new removes/deletes `MobileLaunchSummary` and replaces it with compact readiness copy.
4. Mobile create action uses configuration-only data and calls a create-only coordinator.
5. Mobile coordinator no longer calls `activeContextStore.send()`.
6. Agent draft attachments move to the created agent context.
7. Team draft attachments move to mobile pending state keyed by `teamRunId` until first Chat send.
8. Mobile Chat passes a send-time bridge for team runs so pending attachments flush to the selected focused leaf immediately before the existing send path runs.

## Scope Compliance Assessment

| Area | Assessment | Evidence / Reason |
| --- | --- | --- |
| Mobile setup UX | Pass | Prompt, first-message target, and summary are removed from mobile setup. |
| Create-only mobile coordinator | Pass | Coordinator removes direct `activeContextStore.send()` call and no longer accepts prompt in the draft. |
| Backend/API/core runtime | Pass | No backend/API/runtime/model source files are changed. |
| Core send semantics | Pass with caution | `activeContextStore.send()` is not modified. Shared textarea invokes optional pre-send callback before the existing send call. |
| `mobileWorkStore` update | Pass with boundary condition | Store is mobile-owned and already holds mobile current context/draft attachments. New pending state is acceptable only as mobile UI/session state. |
| Shared composer/monitor changes | Caution / allowed only as no-op seam | Shared files add optional `beforeSend` props with no mobile imports. This is acceptable only if kept generic, optional, and proven no-op for desktop/web when absent. |
| Desktop/web behavior | Needs validation coverage | Focused tests for the shared composer seam pass; downstream review should still verify desktop config/composer behavior remains unchanged. |

## Design Tightening Applied

The requirements, investigation notes, design spec, and rework note were updated to make these guardrails binding:

- This task remains a mobile-shell UX/session change.
- `mobileWorkStore` may hold pending team-run attachments only as mobile session state.
- Pending mobile attachment policy must not move into `activeContextStore`, agent/team run stores, runtime/model stores, backend persistence, or API contracts.
- Shared composer/monitor files are fallback-only.
- If shared composer/monitor files are touched, the only allowed shape is an optional no-op callback/slot seam with no mobile imports, no mobile store dependency, and identical desktop/web behavior when absent.
- Code review and validation must treat shared composer changes as a no-regression hot spot.

## Required Downstream Actions

1. Implementation must either justify the shared composer seam as necessary because the normal composer owns the only send button, or replace it with a mobile-only interception if a clean one exists.
2. Implementation handoff must classify files as:
   - mobile-only changes;
   - mobile-only store/session changes;
   - shared no-op seam changes.
3. Code review must verify:
   - no mobile imports or mobile store dependencies in shared composer/monitor files;
   - no behavior change when `beforeSend` is absent;
   - no change to `activeContextStore.send()` semantics;
   - no backend/API/runtime/model/core-store changes;
   - desktop/web tests or focused checks cover no-regression.
4. API/E2E validation should include a mobile team scenario with pending draft attachments and a desktop/web composer smoke check.

## Focused Test Evidence Run During Analysis

Command:

```bash
pnpm --dir autobyteus-web test:nuxt run \
  components/agentInput/__tests__/AgentUserInputTextArea.spec.ts \
  components/mobile/__tests__/MobileContextSelectionRegression.spec.ts \
  components/mobile/__tests__/MobileUxRefinement.spec.ts \
  components/mobile/__tests__/MobileRemoteAccessShell.spec.ts
```

Result: 4 files passed / 43 tests passed.

## Conclusion

The implementation is broadly following the mobile-shell principle. The only scope-sensitive area is the shared composer/monitor optional `beforeSend` seam. It is acceptable only as a minimal generic no-op seam; downstream implementation and code review must either justify it or remove it in favor of a clean mobile-only interception.
