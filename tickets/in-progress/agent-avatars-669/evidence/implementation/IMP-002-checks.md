# IMP-002 — Implementation checks

- Date: 2026-11-28, at `5a2ff965e6`; the probe commit adds only the probe script and the ticket files.
- Every check ran with `env -i PATH HOME TMPDIR USER`, one heavy run at a time.

| Check | Result |
| --- | --- |
| `pnpm check:contract-dist` (root) | PASS: the tracked dist of 3 contract packages matches its source |
| `pnpm -C autobyteus-collaboration-stream-contracts test` | 40 of 40 pass |
| `pnpm -C autobyteus-server-ts typecheck` | PASS: production 0 errors; tests 972 in 299 files (baseline 972 in 299) |
| `pnpm -C autobyteus-server-ts test:unit` | `Test Files 1117 passed | 5 skipped (1122)`, `Tests 9308 passed | 9 skipped (9317)` |
| `pnpm -C autobyteus-web typecheck` | PASS: production 0 errors; tests 85 in 35 files (baseline 85 in 35) |
| `pnpm -C autobyteus-web codegen:check` | `generated/graphql.ts is current` |
| `pnpm -C autobyteus-web guard:web-boundary` | Passed |
| `pnpm -C autobyteus-web guard:localization-boundary` | Passed |
| `pnpm -C autobyteus-web audit:localization-literals` | Passed with zero unresolved findings |
| `NUXT_TEST=true npx vitest run` (web, all) | `Test Files 3 failed | 818 passed (821)`, `Tests 3 failed | 6396 passed | 2 skipped (6401)`: the 3 below, none this ticket's |
| `pnpm -C autobyteus-web test:electron` | `Tests 1 failed | 542 passed (543)`: the 1 below, not this ticket's |

## Failures that are not this ticket's

- **`scripts/__tests__/mobileBuildChecks.spec.ts`, demo coverage:** `SetUsageLimitSwitchEnabled` is unanswered.
  - It is defined in `graphql/mutations/modelRoutingMutations.ts` on the base, and neither the base demo nor
    `unreachable-operations.json` lists it.
  - None of these files changed on this branch.
  - This ticket's three new queries are answered by the demo (`demo/graphql/definitions.ts`); before that, the same spec
    named them too.
- **`tests/integration/app-font-size-fixed-px-audit.integration.test.ts`:** `components/settings/nodes/NodeRow.vue`
  line 39 `text-[11px]`. The file is unchanged here; the class is the same on `ea787a37b1`.
- **`tests/integration/voice-input-extension.integration.test.ts`:** `ENOTEMPTY` removing its temporary extension folder
  under the full suite's load. It passes alone (2 of 2).
- **Electron `server/__tests__/PortOwnerInspectorFaults.spec.ts`:** `ENOENT` on its child-pid file under load. It passes
  alone (11 of 11).

## Specs changed because the design changed what they pin

- **Avatar state:** `useRunHistoryAvatarState.spec.ts` is rewritten. The broken-image maps are gone (design "Removal"), and
  that behavior is now `DefinitionAvatar.spec.ts`'s.
- **Row specs** read pictures through the definition avatar store now (a mocked `useDefinitionAvatarStore`):
  - `RunListRow.org.spec.ts`;
  - `WorkspaceAgentOrgDisclosure.spec.ts`;
  - `RunSectionPanel.spec.ts`: a member's picture comes from the run tree's `definitionId`;
  - `WorkspaceHistoryWorkspaceSection.spec.ts`;
  - `WorkspaceHistoryFamilyPublication.spec.ts`: the avatar queries are answered behind the same enrichment promise.
- **Specs that count requests:** `RunListRow.agent.spec.ts` and `agentOrgHistoryApollo.spec.ts` mock the avatar store, so
  its own light read does not count as the tree's or the history's I/O.
- **Cache fixtures:** `definitionMutationCache.spec.ts` and `agentOrgDefinitionCache.spec.ts` add `userAvatarUrl`, the
  new selected field.
- **The editors' clear (W-6):**
  - `AgentTeamDefinitionForm.spec.ts`: after a reset, the save sends `avatarUrl: null`. The package's picture is shown, not
    saved as the user's.
  - `AgentOrgAuthoringActions.spec.ts`: an explicit clear sends `null`; the fixture marks the picture as the user's own.
- **`WorkspaceDelegatedRunRow.spec.ts`:** the Team slot is the same 16px slate slot. Its exact class list is now a subset
  check, because `DefinitionAvatar` adds `overflow-hidden` and `flex-shrink-0`.
- **Row fixtures:** `MobileRunList.spec.ts`, `useMobileRunOpening.spec.ts` and `useMobileSubjectRestore.spec.ts` add
  `avatarUrl: null` to their phone rows.
- **E2E page fixtures:** the three that build `WorkspaceHistoryAvatarBindings` use its new three fields.
