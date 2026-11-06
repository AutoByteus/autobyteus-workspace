# Design Spec — Follow-ups of autobyteus-385 (autobyteus-388)

## Basis

- Solution revision `SR-001`. Requirements are `requirements-doc.md` (REQ-001…REQ-003, AC-001…AC-004, DEC-001…DEC-003), approved within the direction. Investigation: E-01…E-07.
- Task size `Small`; architectural risk `Low`. There is no contract change: one unused web document is removed, a component is renamed, and one web-store trigger is added. No data change.
- Escalation trigger: the root-run comparison re-reads Projects on every poll (it must change only when runs are added or removed).

## Change 1 — DEC-001: keep `createAgentRun`; remove the dead web document

- Remove `CreateAgentRun` from `autobyteus-web/graphql/mutations/agentMutations.ts`.
- Regenerate `generated/graphql.ts` with the project's codegen (`pnpm -C autobyteus-web codegen:local`, or the command the web docs name). If codegen needs a server schema it cannot reach, remove exactly the `CreateAgentRunMutation*` types and the document constant by hand, and say so in the handoff.
- `createAgentRun` on the server, its docs and every test and probe using it stay. Add one sentence to `autobyteus-server-ts/docs/modules/agent_execution.md`'s "One-call creation" paragraph: it is the supported one-call API for tests, scripts and integrations, while the chat uses `prepareAgentRun`.

## Change 2 — DEC-002: rename the run section host

- `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` becomes `components/workspace/history/RunSectionPanel.vue`, with `git mv` so history follows.
- Its specs follow: `WorkspaceAgentRunsTreePanel.spec.ts` becomes `RunSectionPanel.spec.ts`, and `.regressions.spec.ts` likewise.
- Update every importer and mention (E-04): `AppLeftPanel.vue`, its specs, `layouts/__tests__`, the other specs, `runListStore.ts` (comment) and the four web docs.
- Localization: rename the namespace `workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.*` to `…RunSectionPanel.*` in en and zh-CN, both `workspace.ts` and `workspace.generated.ts`. Update the users (`RunSectionPanel.vue`, `RunListPanel.vue:211-212`) and remove the unused `this_workspace`. Follow the localization guards' rules for generated catalogs.
- Rename test ids and DOM ids only where they carry the old name. None do today (E-04).
- No behavior change.

## Change 3 — DEC-003: the open Projects view follows runs started elsewhere

The owner is `stores/projectRunsStore.ts`, which already owns when Projects are re-read and already imports `useRunHistoryStore`.

1. Add a computed `listedRootRunIds`: a sorted, joined string of the root run ids in `runHistoryStore` (the agent runs in `workspaceGroups`, and team runs and Org runs from the store's history). Use the store's existing getters; do not build a second projection.
2. Watch it. Then:
   - when the Projects view is shown (`shown.value > 0`) and a previous value exists, and the value changed, call the existing `read` for every loaded Project (`snapshots` keys);
   - the first value after showing only records the baseline.

   `read`'s in-flight and queued handling already collapses repeats. This window's own start, archive and stop triggers stay; a duplicate read is collapsed.
3. Update the store's doc comment and the matching docs (`autobyteus-web/docs/projects.md`, the re-read list around :537). Add: "and when the run history poll shows a run added or removed by anyone".

**Spine:** `RunSectionPanel 5 s poll → runHistoryStore (root runs) → projectRunsStore.listedRootRunIds changes → read(each loaded Project) → projectRunHistory → snapshot → Projects tree`.

## Tests

**Web units:**
- `projectRunsStore`:
  - a new root run id in the history store while shown re-reads every loaded Project once;
  - an unchanged set (a status change only) reads nothing;
  - while hidden, nothing is read;
  - the first value after showing reads nothing extra.
- The renamed component specs pass under their new names.
- The localization guards pass.
- `agentMutations` has no `CreateAgentRun` (by the typecheck and a grep in the handoff).

**Browser probe:** the existing `test:e2e:projects-left-navigation` PLN-08 (a run created through the API under a Project). Its expectation becomes "listed within one poll while the view stays open". It must fail on the base (as autobyteus-385 recorded) and pass here.

**Server:** unchanged; the suites that use `createAgentRun` pass.

## Risks

- **Re-read cost.** One `projectRunHistory` read per loaded Project, per change in the set of runs, only while the Projects view is shown. Runs are started or removed rarely.
- **The rename touches many files.** It is mechanical, and the typecheck and the suites catch misses.
