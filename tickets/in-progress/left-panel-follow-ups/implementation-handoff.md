# Implementation Handoff: left-panel-follow-ups (autobyteus-388)

Branch `codex/left-panel-follow-ups`, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups`, base `origin/personal` `d6bcff577b`.

| Commit | What |
| --- | --- |
| `aeb160833e` | The SR-001 package as received |
| `ee1178617c` | DEC-001: the web's unused `CreateAgentRun` document and its generated types removed; one docs sentence |
| `2903fba48a` | DEC-002: `WorkspaceAgentRunsTreePanel` renamed to `RunSectionPanel` (component, specs, importers, docs, localization) |
| `00339421ed` | DEC-003: the open Projects view re-reads when the run history's set of root runs changes; tests; docs; PLN-08 |
| the evidence commit after `00339421ed` (see `git log`) | This handoff, IR-001 and `evidence/implementation/` |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low, on the direct implementation route.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups/tickets/in-progress/left-panel-follow-ups/requirements-doc.md`
- Investigation notes: `.../left-panel-follow-ups/investigation-notes.md` (E-01…E-07)
- Solution revision record: `.../left-panel-follow-ups/solution-revision-record.md` (SR-001)
- Design spec: `.../left-panel-follow-ups/design-spec.md`
- Design review report and architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../left-panel-follow-ups/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`. Other revision IDs: `N/A`.
- Triggering finding IDs: N/A (autobyteus-385 FU-001/FU-005, FU-003, FU-004)

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section: design-spec.md "Basis"
- Classification confirmed or changed: `Confirmed`
- Evidence:
  - There is no contract change: the server's `createAgentRun` is untouched, and only a web document that nothing imported is removed.
  - The rename is mechanical: the typecheck and the full suite pass.
  - There is one web-store trigger, with no server, feed or data change.
  - The escalation trigger did not fire: the comparison changes only when runs are added or removed. IMP-01 shows that a status change and a reorder read nothing.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001, DEC-001 | Keep GraphQL `createAgentRun`; remove the web's dead document; one docs sentence | `autobyteus-web/graphql/mutations/agentMutations.ts` (the `CreateAgentRun` document removed); `generated/graphql.ts` regenerated with `pnpm codegen:local`; `autobyteus-server-ts/docs/modules/agent_execution.md` "One-call creation" | Done. Codegen removed exactly the `CreateAgentRunMutation*` types, `CreateAgentRunDocument` and `useCreateAgentRunMutation` (−38 lines). `codegen:check` reports the file current, and `git grep CreateAgentRun\b` finds nothing in the web (IMP-04). The server code, tests and probes are untouched |
| REQ-002, DEC-002 | Rename the run section host; no behavior change | Renamed (git history follows): `components/workspace/history/RunSectionPanel.vue`, `__tests__/RunSectionPanel.spec.ts`, `__tests__/RunSectionPanel.regressions.spec.ts`. Updated: `AppLeftPanel.vue` and its two specs, the `layouts/__tests__` default and drawer specs, `HistoricalTeamLazyHydration.integration.spec.ts`, `WorkspaceHistoryFamilyPublication.spec.ts`, `workspaceSelectionComposition.spec.ts`, `runListStore.ts` (comment), `RunListPanel.vue` (two keys), and four docs (`workspace_layout`, `settings`, `agent_execution_architecture`, `agent_orgs`). The localization namespace `…history.RunSectionPanel.*` in en and zh-CN (`workspace.ts`, `workspace.generated.ts`); `this_workspace` removed from both generated catalogs | Done. No test or DOM id carried the old name. The only remaining mentions are in ticket history and recorded evidence logs (`frontend-execution-evidence/`, `test-results/`), which stay as recorded. The renamed specs pass (58 + 3 tests). The localization guards pass |
| REQ-003, DEC-003, AC-003 | The open Projects view follows runs added or removed elsewhere, within one history poll | `stores/projectRunsStore.ts`: a computed `listedRootRunIds` (sorted agent, team and Org root run ids from `runHistoryStore.workspaceGroups` and `agentOrgHistory`) and a watch on `[shown > 0, ids]`. The first value after showing sets the baseline; a change while shown calls `read` for every loaded Project (`snapshots` keys); hiding clears the baseline. `read`'s in-flight and queued handling collapses repeats | Done. IMP-01: an added agent run, a removed one, an added Team or Org run each re-read P and Q once. A status change and a reorder, the view hidden, and the first value after showing read nothing. IMP-06: PLN-08 lists the Project 4.7 s after the API starts its run, with the view open. IMP-07: fails on the base |
| AC-004 | Tests; suites pass | as above | Done here up to finalization |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- DEC-001: `autobyteus-web/graphql/mutations/agentMutations.ts`, `autobyteus-web/generated/graphql.ts`, `autobyteus-server-ts/docs/modules/agent_execution.md`.
- DEC-002: the files listed in the trace (21 files, three of them renamed).
- DEC-003:
  - `autobyteus-web/stores/projectRunsStore.ts`;
  - `stores/__tests__/projectRunsStore.spec.ts`;
  - `docs/projects.md` (re-read trigger 5);
  - `tests/e2e/projects-left-navigation-probe.mjs` (PLN-08: no view switch; listed within 12 s, one 5 s poll plus the read).

## Important Assumptions

- The run section polls the history every 5 s in every view (E-07), so a run started anywhere shows as a new root run id within one poll.
- The Projects view's read window is 6 per agent. A new run in an agent that already has 6 pushes the oldest out, which still changes the set.

## Known Risks

- **One redundant read when switching from Runs to Projects.** The baseline is taken when the view is shown, while the history still holds the Runs view's complete read. The next poll, with a window of 6, changes the set, so every Project is read once more on top of the show's own read. It is collapsed if still in flight. This is bounded and rare.
- **Re-read cost.** One `projectRunHistory` read per loaded Project, per change in the set, only while the Projects view is shown (design Risks).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: three small follow-ups. Reviewed refactor decision: the rename is the refactor (FU-003).
- Implementation matched the reviewed assessment: `Yes`. If challenged, routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The old component name, file and localization keys are removed, with no aliases.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. That covers the web's `CreateAgentRun` document and types, and the `this_workspace` key.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Source files within size guardrails: `Yes`. `projectRunsStore.ts` grows by 24 lines to about 210, and the renamed component is unchanged in size.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. Implementation follows it: `Yes`. Deviation: `None`.

## Environment Or Dependency Notes

- In this fresh worktree I ran TESTING.md's setup: `pnpm -C autobyteus-server-ts prebuild`, `nuxt prepare`, and `pnpm -C autobyteus-server-ts build` for the probe's `dist/app.js`.
- Everything ran under `env -i PATH HOME=<fresh dir> TMPDIR`, one heavy run at a time.
- The probe owned its data root, ports, backend, Nuxt and Chrome. Its `cleanup` shows the frontend terminated, the backend exited with 0, and the data root removed.

## Checks Run

The evidence folder is `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups/tickets/in-progress/left-panel-follow-ups/evidence/implementation/`. Each `.log` has a header. All checks ran on macOS 26.5.2 with Node v22.23.1 and pnpm 10.28 (corepack); IMP-06 and IMP-07 also used headless Chrome.

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run stores/__tests__/projectRunsStore.spec.ts`, red with the base store, then green | red: `00339421ed` with `projectRunsStore.ts` from `d6bcff577b`; green: `00339421ed` | `projectRunsStore` with the real `runHistoryStore`; Apollo faked | REQ-003, AC-003 | Pass (red 2 failed / 8 passed, then green 10/10) | `IMP-01-project-runs-store-red-green.log` | Red: `× … a run added to the history while shown re-reads every loaded Project once`, `× … a run removed, or a Team or Org run added, also re-reads`; Green: `Tests  10 passed (10)` |
| IMP-02 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run` | `00339421ed` | Whole web suite, including the renamed specs | REQ-002, REQ-003, AC-004 | Pass | `IMP-02-web-suite.log`, `IMP-02-web-suite.full.log.gz` | `RunSectionPanel.spec.ts (58 tests)`, `RunSectionPanel.regressions.spec.ts (3 tests)`, `Test Files  702 passed (702)`, `Tests  5165 passed \| 2 skipped (5167)` |
| IMP-03 | `cd autobyteus-web && pnpm typecheck; pnpm -s guard:web-boundary; pnpm -s guard:localization-boundary; pnpm -s audit:localization-literals` | `00339421ed` | Web types, boundaries, localization catalogs after the namespace rename | REQ-002 | Pass | `IMP-03-web-typecheck-guards.log` | `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`, three `Passed` lines |
| IMP-04 | `pnpm -s codegen:local` after removing the document; `node ./scripts/codegen-local.mjs --check`; `git grep -n 'CreateAgentRun\b' -- autobyteus-web ':!**/tickets/**'` | `ee1178617c` (codegen); `00339421ed` (check, grep) | Server schema → web generated types | REQ-001 | Pass | `IMP-04-codegen-createagentrun.log` | `generated/graphql.ts is current.`; `(no matches; git grep exit=1)`; the `ee1178617c` diff: `generated/graphql.ts \| 38 ---` |
| IMP-05 | `pnpm -C autobyteus-server-ts build` (for the probe) | `00339421ed` | Server build | — | Pass | `IMP-05-server-build.log` | `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.` |
| IMP-06 | `pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <evidence>/IMP-06-pln-fix --cases PLN-01,…,PLN-08` | `00339421ed` | Real Nuxt dev + built backend (AGY scripted CLI) + headless Chrome; the Projects view and the run section | AC-003 (PLN-08); REQ-002 (the renamed host in every case) | Pass (PLN-01…08) | `IMP-06-pln-fix.log`, `IMP-06-pln-fix/evidence.json`, screenshots, logs | `PLN-08: Pass`; `evidence.json` PLN-08 `"lateProjectListedMs":4698,"lateProjectListed":true`; `cleanup` `"dataRootRemoved":true` |
| IMP-07 | The same with `projectRunsStore.ts` from the base | `00339421ed` with `projectRunsStore.ts` from `d6bcff577b` | As IMP-06 | AC-003 ("fails on the base") | Fail on PLN-08, as expected (PLN-01…07 pass) | `IMP-07-pln-base.log`, `IMP-07-pln-base/evidence.json` | `PLN-08: Fail — Timed out: Project with a run started elsewhere listed within one poll while the view stays open` |

- Not run, and why:
  - **PLN-09 and PLN-10:** unrelated to these changes beyond the rename, which the full suite and PLN-01…08 cover.
  - **The server suites:** no server code changed, only a docs sentence. The suites that use `createAgentRun` are untouched.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces:**
  - the Projects view's listing of runs started elsewhere (DEC-003);
  - the run section host's name, which the user doesn't see (DEC-002).
- **Rendered and inspected:** PLN-01…08 in real headless Chrome, against a real backend. Screenshots are in `IMP-06-pln-fix/`, including `PLN-08-*`.
- **Issues found and corrected:** none.
- **Limitations:**
  - The listing delay depends on the 5 s poll: the run was listed 4.7 s after its start.
  - No visual change was made, so there is no new reference screenshot.

## Lightweight Implementation Self-Review (direct route)

- **The watch:** it sees both visibility and the id set, so hiding resets the baseline. A history change while hidden reads nothing, and showing again takes a fresh baseline; the show itself reads everything.
- **Node rebinding:** it clears the snapshots. While shown, `loadAll` runs, and the next set change re-reads only the loaded Projects.
- **The id string:** sorted and newline-joined. A reorder or a status change produces the same string, so Vue's watch does not fire.
- **The rename:** typecheck, the suite, the guards and the PLN probe all pass. A `git grep` outside the history folders finds no old name.

## Downstream Coverage Hints / Suggested Scenarios

- With the Projects view open, start a run under a Project from another window or through the API: it is listed within one poll. Archive it elsewhere: it leaves within one poll.
- With the Projects view open, stop a run elsewhere: there is no extra read, because the set is unchanged.
- Switch views Runs → Projects → Workspaces → Projects: no stale listing.
- Server: the one-call `createAgentRun` keeps working (its existing suites).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E's own validation of AC-003 and of the views after the rename. PLN-08 (IMP-06) can be reused.
