# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: Frontend-only behavior alignment between two existing workspace pick flows; no API/schema/storage changes.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Runtime review gate: `Implementation can start = Yes` (see `tickets/workspace-add-native-folder-picker/runtime-call-stack-review.md`).

## Preconditions

- Runtime call stack written: Yes
- Runtime call stack review completed for scope minimum rounds: Yes
- Unresolved blocking findings: No

## Implementation Steps

1. Add shared Electron folder dialog helper:
- `composables/useNativeFolderDialog.ts`

2. Reuse shared helper in existing agent workspace selector:
- `components/workspace/config/WorkspaceSelector.vue`

3. Update left panel workspace plus behavior:
- `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- Electron embedded: open native folder picker and create workspace from selected path.
- Non-Electron or missing picker API: keep current inline manual path flow.
- Picker-selected path failure: show inline recovery state with editable path.

4. Expand workspace left-panel unit tests:
- `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`

## Verification Plan

- `pnpm test:nuxt components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts --run`
- `pnpm test:nuxt components/workspace/config/__tests__/WorkspaceSelector.spec.ts --run`

## Out of Scope

- Changing backend workspace creation behavior.
- Modifying workspace creation GraphQL contracts.
- UX redesign of inline add form outside picker consistency.
