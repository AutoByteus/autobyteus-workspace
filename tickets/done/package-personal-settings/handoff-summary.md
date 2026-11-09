# Handoff Summary — package-personal-settings (stage 1)

## Ticket

- Package: `package-personal-settings`, Project Task `autobyteus-95`, **stage 1** (UC-001..005, DEC-006). Personal tools, skills, avatar and runtime/model of agents, Teams and Orgs live in AutoByteus, outside the package files, and survive package updates. Stage 2 (UC-006, clean package writes) is not delivered here; the Task stays open for it.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
  - Architecture review ARCH-REV-002 Pass.
  - Code review CRR-001 Pass (9.3/10, no findings).
  - API/E2E API-REV-001 Pass, 95.0%.
  - Test-code review CRR-002 Pass.
- Revisions: SR-001..SR-006, ARCH-REV-001..002, IR-001, CRR-001..002, API-REV-001, DR-001
- Archived ticket folder: `tickets/done/package-personal-settings/` on `personal`

## What Changed

- Server (`f9b3e27297`, `2c4ba2c51e`):
  - **Storage.** Personal settings live in `<app-data>/agent-packages/personal-settings.json`. This covers package agents, Teams, Orgs and their team-local agents, and built-in definitions. A setting is one of: tools added or removed, skills, avatar, or default runtime/model.
  - **Reading.** Every reader gets the effective definition: the package value with the personal changes applied. That includes the editors, runs, delegated copies and admission.
  - **Saving.** A save of only personal fields writes no package file.
  - **Reset.** "Reset to the package's setting" removes the field.
  - **Updates.** Before a GitHub package update replaces the install, by click or automatically:
    - edits made in the package files are captured into personal settings;
    - the changed files are copied to `backups/<install key>/<time>/`, keeping the latest 5;
    - if the installed revision cannot be downloaded, the update stops and nothing changes.
  - **Unreadable file.** An unreadable file gives package values and a warning, and the file is kept.
- Web: in the agent, Team and Org editors, a "Personal · Reset to the package's setting" mark appears on personal fields. The automatic-update switch and confirmation texts state what is kept and what is backed up, in en and zh-CN.
- Tests:
  - `4558ba91b5`: `tests/e2e/personal-settings/package-personal-settings.e2e.test.ts`, ungated;
  - `f3e36e274c`: `personal-tools-in-runs.e2e.test.ts`, gated by `RUN_AGY_FAILURE_E2E=1` with the scripted AGY CLI;
  - `48f4443fe6`: a baseline test fix that the base made identically. The merge took the base's version.
- Docs: `GLOSSARY.md`, server `personal_settings.md` (new), `agent_packages.md` and `agent_definition.md`, and web `agent_management.md`, `agent_teams.md` and `agent_orgs.md`. See `docs-sync-report.md`.

## Integration

- `origin/personal` advanced 30 commits, from `a85bf4f38d` to `51ec39d86c`. Those commits include autobyteus-436 (node files), autobyteus-446 (closed Tasks leave run lists) and the v1.5.12 stable release.
- Before the merge, the reviewer's three documents were committed as a checkpoint (`db3cffd862`).
- Merged as `5a62a061b4`. One conflict, in `autobyteus-web/pages/__tests__/mobile-root-shell.spec.ts`. Both sides had fixed the same stale assertions, and the base's version, with its "Studio Mac" fixture name, was taken whole. `GLOSSARY.md` and `generated/graphql.ts` auto-merged; codegen check DEL-08 confirms the generated types match the integrated schema.
- Rerun on the merged state, after `pnpm install`, server prebuild and `nuxt prepare`. Evidence is in `evidence/delivery/`:

| ID | Command | Result |
| --- | --- | --- |
| DEL-01 | `pnpm -C autobyteus-server-ts typecheck` | Pass. 0 production errors; test-file errors 1182, which equals the baseline |
| DEL-02 | `test:integration:prepare` | Pass |
| DEL-03 | `package-personal-settings.e2e` plus the four E2E files that update packages (IMP-04) | Pass, 44 passed, 2 skipped |
| DEL-04 | gated `personal-tools-in-runs.e2e` (`RUN_AGY_FAILURE_E2E=1`, scripted AGY) | Pass, 7/7 |
| DEL-05 | server `vitest run tests/unit` | Pass, 881 files, 7438 tests |
| DEL-06 | server `vitest run tests/integration` | Pass, 85 files, 508 tests |
| DEL-07 | `pnpm -C autobyteus-web typecheck` | Pass. 0 production errors; test-file errors 96, which equals the baseline |
| DEL-08 | `pnpm -C autobyteus-web codegen:check` | Pass |
| DEL-09 | web guards | Pass |
| DEL-10 | `pnpm -C autobyteus-web test:nuxt --run` | Pass, 730 files, 5492 tests |

## Verification

- Judged from the evidence: sufficient. Every critical acceptance criterion of stage 1 (AC-001..AC-008) is directly proven. AC-009 belongs to stage 2.
- Files opened:
  - **API-20, real GitHub on a release build.** `personal-settings.final.json` holds the in-app tool edits, the captured `create_task` and the automatic update's captured `toolsRemoved: [search_web]`. `API-20-backups.txt` lists two backups with exactly the edited files. The registry is at HEAD `45012f0`, `UP_TO_DATE`.
  - The server E2E logs API-02..08 (7/7, three runs) and API-10 (7/7, three runs).
  - Screenshots: the English confirmation, which says personal tools, skills, avatars and runtime/model are kept and the changed files are first copied to a backup; and the editor's "Personal · Reset to the package's setting" marks on Tools and LLM config.
- Confidence: 95.0%, which meets the target, with no category below 90%. Bounded residual risks:
  - AC-004's download failure is only emulated (a 404);
  - AC-002's skill and avatar edits were proven with fake GitHub only;
  - the Org runtime/model mark with a value captured from `org-config.json` was not rendered (design R-1).
- User check: required by the Task's done-when ("…released as a beta, and the user has checked it"). It is pending on the beta; see the release report.

## Release

- Beta, per the Task's done-when (Project Task autobyteus-95: "Done when: the user has approved the model, it's implemented with tests, released as a beta, and the user has checked it", as the Solution Designer quoted it from the Task on 2026-11-09) and DEC-006. Version and publication are in `release-deployment-report.md`.

## Residual Risks, Open Questions And Follow-ups

- Design-spec note for the Solution Designer: the Derived Consumers row calls `listAdmissionEntries` "not affected". The code correctly applies personal settings there (REQ-002).
- Design risks R-1..R-3 stand.
- Follow-ups in `follow-ups.md`, unsent; the Solution Designer sends them:
  - FU-002: the unused `TeamLocalAgentMemberDetails.vue`;
  - FU-003: Update is still offered for a package with an unknown installed revision.
- Rollback: revert the merge on `personal`. Existing data is not affected, because the change only adds new files.
  - An older build ignores `personal-settings.json` and shows package values.
  - After an update under this version, a user's personal edits are in `personal-settings.json` and the backups, not in the package files. An older build would therefore show them as gone, although the data is kept.
  - `RELEASE.md` (Rollback) requires no rollback compatibility.
