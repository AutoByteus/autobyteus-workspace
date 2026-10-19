# Implementation Revision Record — task-keys-and-dependencies

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 1 (Pass) | N/A (REC-001–REC-004 applied as guidance) | `Initial Baseline` | SR-001, ARCH-REV-001 | SR-001 implemented and locally checked; held (not handed downstream) on the Solution Designer's instruction pending SR-002 |
| IR-002 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 Pass on SR-001 + SR-002 + SR-003) | N/A (REC-001–REC-008 applied as guidance) | `Initial Baseline` (scope extension of IR-001 before any downstream round) | SR-001, SR-002, SR-003, ARCH-REV-001, ARCH-REV-003 | Full package implemented and locally checked; ready for Code Review |
| IR-003 | Code Reviewer, `code-review-report.md`, CRR-001 round 1 (Fail, Local Fix) | CR-001, CR-002 | `Local Fix` | SR-003, ARCH-REV-003, CRR-001 | Both fixed; targeted-delta source review requested |
| IR-004 | Delivery Engineer, `delivery-revision-record.md` / `release-deployment-report.md`, DR-001 (Blocked, Local Fix) | DR-001 items 1–4 (merge conflict with project-tool-split; TESTING.md Rule 9 items (a) and (b)) | `Local Fix` | SR-003, ARCH-REV-003, CRR-002, API-REV-001, CRR-003, DR-001 | Merged up to `origin/personal@66429d6f31`; conflicts resolved keeping both features; three baseline test fixes; Rule 9 causes recorded; merged-state checks pass |

## Revision Entries

### IR-001 — SR-001 baseline: readable Task keys and "depends on"

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, round 1 (Pass, ARCH-REV-001).
- Triggering finding IDs: N/A. Non-blocking REC-001 (strip `taskKeys` from `ProjectService.toView`), REC-002 (allocation keeps the Project's `updatedAt`, publishes nothing), REC-003 (checklist item 8 answer) applied; REC-004 needs no code.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result (at the time): SR-001 complete with local checks passing. Not routed downstream: on 2026-10-17 the Solution Designer announced the user-approved scope extension SR-002 and asked that SR-001 not be handed downstream alone.
- Related solution revision IDs: SR-001. Architecture review: ARCH-REV-001. Code review / API-E2E / delivery: N/A.
- Why recorded: first implementation of the approved SR-001 package; the foundation of IR-002.
- Approved behavior or requirement IDs affected: BEH-001–BEH-010 (SR-001 meaning); REQ-001–REQ-017.
- Implementation delta: server key allocation, prefix reservation, dependency storage/validation/cleanup, GraphQL/feed fields, startup key migration; web types, codegen fields, stores, draft, 5 new components, 6 integrated components, localization, docs; tests in both packages.
- Local validation: server unit 709 files pass, typecheck pass; web 1 pre-existing failure (see handoff); Projects e2e updated and passing.
- Next recipient or routing: held for SR-002 (no handoff sent).
- Remaining limitations: superseded by IR-002.

### IR-002 — SR-002 / SR-003: keys as the agent-facing Task ID, tool dependencies, retired prefixes, key URLs

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-003 Pass on the combined package (SR-001 base, SR-002 extension, SR-003 corrections).
- Triggering finding IDs: N/A. REC-001–REC-004 (still apply), REC-007 (follow SR-003 over older SR-002 lines) and REC-008 (unresolvable `depends_on` reference → `TASK_DEPENDENCY_INVALID`, pinned by a test) applied.
- Classification: `Initial Baseline` of the combined package (no downstream round has happened yet).
- Prior authoritative result: IR-001 (SR-001 only, held).
- Current authoritative result: the full package implemented; local checks in `implementation-handoff.md`.
- Related solution revision IDs: SR-001, SR-002, SR-003. Architecture review: ARCH-REV-001, ARCH-REV-003. Code review / API-E2E / delivery: N/A.
- Why recorded: the user-approved scope extension (SR-002) and its corrections (SR-003) on top of IR-001.
- Approved behavior or requirement IDs affected: BEH-010 (changed), BEH-011 (new); REQ-003 (retired prefixes), REQ-017–REQ-022; AC-020, AC-022–AC-027.
- Implementation delta:
  - Server: retired key prefixes (`ProjectsLayout.retiredTaskKeyPrefixesFile`, `ProjectStore.deleteProject` writes it under the catalog lock before removing `project.json`; reservation checks current ∪ retired); `ProjectStore.findTaskByKey`; new service-owned `TaskReferences` (`projectTask` = resolveProjectTaskReference: long ID, else key, case-insensitive; `byId` for canonical paths); `updateTaskById` = resolveTaskReference (Temp-task ID first, then `projectTask`), `dependsOn` references via `TaskDependencyWrites.idsOf` (REC-008), ack `taskReference` / `dependsOnTaskIds`; `resolveAssignment(reference)` returns `{taskId, taskReference, description, referenceFiles}`; refusal builders take references, deleted current Task → "a deleted Task"; lifecycle resolves first (REC-005), uses only the stored ID inward and the key in texts; tool contract `depends_on`, descriptions; manifest returns keys and `dependsOn`; `DELEGATE_TASK_ID_DESCRIPTION`.
  - Web: `utils/projects/taskPagePath.ts`; `useProjectTaskPage(projectId, taskReference, pageSuffix)` resolves key (any case) or long ID and `router.replace`s to the key URL; `ProjectTaskDetail` / `ProjectTaskEditor` take `taskReference`; detail context client created once from the resolved `taskId`, delete uses it; every Task link through `taskPagePath`.
  - Docs: server `docs/modules/projects.md`, `docs/modules/agent_team_execution.md`, `docs/design/collaboration_model.md` (CM-6); web `docs/projects.md`.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run".
- Next recipient or routing: Code Review (Large / High), per handoff rules.
- Remaining limitations or risks: see `implementation-handoff.md` "Known Risks" and follow-ups.

### IR-003 — CRR-001 Local Fix: collapse tool dependency references; key wording

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-001 round 1 (Fail, Local Fix, 9.3/10).
- Triggering finding IDs: CR-001, CR-002.
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 (`update_task depends_on` stored duplicate IDs when references named the same Task more than once; stale "display only" wording).
- Current authoritative result: duplicates collapse on every path; wording matches REQ-018/019/022.
- Related solution revision IDs: SR-003. Architecture review: ARCH-REV-003. Code review: CRR-001. API-E2E / delivery: N/A.
- Why recorded: review findings on the implementation.
- Approved behavior or requirement IDs affected: REQ-007 ("Duplicates are collapsed"), REQ-020, AC-024; REQ-018, REQ-019, REQ-022 (docs/comment only).
- Implementation delta:
  - CR-001: `TaskDependencyWrites.idsOf` returns `normalizeDependsOn(ids)`, so the resolved stored IDs are unique in submitted order on both tool create and update (a repeated key, another letter case of it, and the long ID all name one Task).
  - CR-002: `autobyteus-server-ts/docs/modules/projects.md` "Key" bullet and `autobyteus-web/types/project.ts` `taskKey` comment: the long ID stays the stored identity (files, GraphQL arguments, feed scope, run resources); the key is the agent-facing and Task page URL ID.
- Changed files or areas: `autobyteus-server-ts/src/projects/services/task-dependency-writes.ts`; `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/project-task-keys-tools.test.ts` (new case "collapses repeated references…"); `autobyteus-server-ts/docs/modules/projects.md`; `autobyteus-web/types/project.ts`.
- Local validation and result: `tests/unit/agent-tools` + `tests/unit/projects` 60 files / 535 tests pass; server typecheck pass.
- Next recipient or routing: Code Reviewer (targeted-delta source review), per handoff rules.
- Remaining limitations or risks: none new.

### IR-004 — DR-001 Local Fix: merge the latest `personal`, keep both tool sets, Rule 9 failures

- Triggering role, report path, and round: `/software_engineering_team/delivery_engineer`, `delivery-revision-record.md` and `release-deployment-report.md`, DR-001 (Blocked, Local Fix).
- Triggering finding IDs: DR-001 items 1–4:
  1. merge `origin/personal`;
  2. resolve the conflict with project-tool-split (`create_project`, `update_project`, deprecated `create_or_update_project`) keeping Task keys and `depends_on`;
  3. rerun the overlapping suites;
  4. TESTING.md Rule 9: (a) `team-run-v1-production-upgrade` e2e (FU-API-002); (b) gated `task-copy-idle-lifetime` e2e.
- Classification: `Local Fix`. Task size `Large`, architecture risk `High`: rechecked, unchanged.
- Prior authoritative result: CRR-003 / API-REV-001 validated package on base `c600028072`; `personal` had moved on and the merge conflicted.
- Current authoritative result: branch merged up to `origin/personal@66429d6f31`; both features present; all merged-state checks pass (handoff "Local Implementation Checks Run").
- Related solution revision IDs: SR-003. Architecture review: ARCH-REV-003. Code review: CRR-002, CRR-003. API-E2E: API-REV-001. Delivery: DR-001.
- Why recorded: integration rework before finalization.
- Approved behavior or requirement IDs affected: none changed. BEH-010 / REQ-017–REQ-020 re-checked against the merged tool contract.
- Implementation delta:
  - `6c1fa46436` merge of `origin/personal@a716a4632e`. Conflicts resolved in:
    - `src/agent-tools/project-tasks/project-task-tool-contract.ts`: kept this ticket's `dependsOnDefinition` and the base's module-level `p` and `workspacesDefinition`;
    - `docs/modules/projects.md`: one tools table with `create_project`, `update_project`, deprecated `create_or_update_project`, and `create_task` / `update_task` with `depends_on` and keys;
    - `docs/modules/agent_tools_mcp_server.md`: the same, as bullets.
  - `08ce2f0483` merge of `origin/personal@66429d6f31` (remove-nested-task-team and its baseline fixes): no conflicts.
  - Baseline test fixes (TESTING.md Rule 9), each its own commit:
    - `fa49138794`: `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`. The ledger check derives the new rows from the migrations that ran, instead of a hardcoded `beforeRows.length + 4`. This ticket's migration is one of those rows.
    - `9eeb58fb9d`: `tests/architecture/application-framework-boundaries.test.ts`. Asserts flat Teams by the team node type (`children: readonly TeamRunAgentNode[]`). remove-nested-task-team (`065430dd61`) replaced the factory's runtime message with that type, and the test still asserted the message, so it failed on `origin/personal`.
    - `361eea070d`: `autobyteus-web/tests/e2e/projects-feature-probe.mjs` waits for the shell to show the docked left panel (wide) or the left strip (narrow) after `setViewportSize`, then measures. Before this fix it measured the previous viewport's layout, a race. PT-E2E-005 or -006 failed at 390 px with a 70 px page next to the 320 px docked panel. Because the cases share one page, PT-E2E-007, -008, -009 and -011 then failed in turn. Fails the same way on clean `origin/personal@66429d6f31`; with the fix, all cases pass on both the base and this branch.
  - Rule 9 causes reported, not fixed (outside this ticket):
    - (a) remaining `team-run-v1-production-upgrade` failures, 3 of 4, also on clean `66429d6f31`. The ENOENT on `agent_teams/<root>/team_run_execution_tree.json`, the team-resume `TEST_GRAPHQL_REQUEST_FAILED` and `restoreAgentTeamRun success:false` all come from `20260901_agent_org_flat_team_families_v1` (flat-agent-organization-model, `37d05c7f71`). That migration turns the nested released Team into an AgentOrg run, so the test's Team V2 final-state assertions predate it. Owner: the flat-agent-organization-model / migration owner.
    - (b) `task-copy-idle-lifetime`: `origin/personal` `45291d105f` added a TESTING.md "Known intermittent e2e" note naming its causes, already reported to the idle-shutdown and AGY model-discovery owners. The delivery logs show two of them: a 3 s `agy --help` discovery limit under load, and 15 s stop deadlines. A run on a quiet host (load 5–9) showed the third: the Team and Org copies shut down 58,171 ms after the test saw the step exit, against a 59,000 ms lower bound. The Agent root passed. Fails on base too; this ticket does not touch idle shutdown.
- Changed files or areas: merge resolution files above; the three test files above; ticket artifacts.
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run" (merged state).
- Next recipient or routing: Code Reviewer, per handoff rules (Large / High).
- Remaining limitations or risks: the two reported Rule 9 failures above stay open with their owners.
