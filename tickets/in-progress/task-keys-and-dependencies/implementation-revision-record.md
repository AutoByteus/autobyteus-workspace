# Implementation Revision Record — task-keys-and-dependencies

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 1 (Pass) | N/A (REC-001–REC-004 applied as guidance) | `Initial Baseline` | SR-001, ARCH-REV-001 | SR-001 implemented and locally checked; held (not handed downstream) on the Solution Designer's instruction pending SR-002 |
| IR-002 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 Pass on SR-001 + SR-002 + SR-003) | N/A (REC-001–REC-008 applied as guidance) | `Initial Baseline` (scope extension of IR-001 before any downstream round) | SR-001, SR-002, SR-003, ARCH-REV-001, ARCH-REV-003 | Full package implemented and locally checked; ready for Code Review |
| IR-003 | Code Reviewer, `code-review-report.md`, CRR-001 round 1 (Fail, Local Fix) | CR-001, CR-002 | `Local Fix` | SR-003, ARCH-REV-003, CRR-001 | Both fixed; targeted-delta source review requested |

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
