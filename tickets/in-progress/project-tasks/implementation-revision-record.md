# Implementation Revision Record

Package: `PROJ-TASKS-20260926-001` — `project-tasks`. The current code and `implementation-handoff.md` remain authoritative; this record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer` — `design-review-report.md` round 1 (`ARCH-REV-001`, Pass) | N/A | `Initial Baseline` | `SR-003`, `SR-004`, `ARCH-REV-001`; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Implemented in `8d3de39a6` (server) and `e8fca7771` (web); ready for code review |

## Revision Entries

### IR-001 — Description-only Project Tasks and the two-pane Projects page

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, round 1 (`ARCH-REV-001` Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Design Change Sequence steps 1–8 are implemented. Step 9, the e2e probe, is partly done: the released cases are adapted to the two panes and all 13 pass; new Task-specific browser cases are left to API/E2E. Step 10 (docs sync) belongs to delivery; only the `docs/projects.md` file list was corrected to drop the removed components (review note 3).
- Related solution revision IDs: `SR-003` (requirements), `SR-004` (design)
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-016` (`REQ-004` withdrawn); `AC-001`–`AC-012`; `QR-001`–`QR-003`.
- Implementation delta: see `implementation-handoff.md` › Reviewed Behavior Implementation Trace and Key Files.
- Changed files or areas:
  - Server:
    - `autobyteus-server-ts/src/projects/{domain/models.ts,domain/project-errors.ts,stores/project-store.ts,services/project-service.ts,services/project-task-service.ts}`
    - `src/api/graphql/{schema.ts,types/projects.ts,types/project-tasks.ts}`
  - Web:
    - `autobyteus-web/pages/projects.vue`, `pages/projects/{index,[id]}.vue`
    - `components/projects/*` (6 new; `ProjectDetail` reworked; `ProjectsList`/`ProjectCard` removed)
    - `stores/{projectTaskStore,projectStore}.ts`
    - `utils/projects/*` (4 new)
    - `graphql/**/project*`, `generated/graphql.ts`, `types/project.ts`
    - `localization/messages/{en,zh-CN}/projects.ts`
    - `docs/projects.md` (file list only)
    - `tests/e2e/projects-feature-probe.mjs`
  - Plus specs.
- Local validation and result:
  - Server: 8 changed-area files pass, and the released `tests/e2e/projects` passes with the `ENABLE_*` environment variables scrubbed.
  - Web: Projects components, stores and utils pass: 62 plus 37 tests. Adjacent suites pass.
  - Full web suite: 3208 passed; 13 failed in 6 files, identical on base `e06080b00`.
  - Both localization guards pass.
  - `vue-tsc` shows no errors in changed files.
  - The adapted e2e probe passes 13/13.
  - Live dev-app check in en and zh-CN.
- Next recipient or routing: per `get_handoff_rules` (Medium/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` › Known Risks.
- Downstream review status: `CRR-001` Pass (round 1, no findings); package routed by `/code_reviewer` to `/api_e2e_engineer`.
