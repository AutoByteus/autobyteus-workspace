# API/E2E Test Progress

Working log while tests run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-09 09:34 | API-01 | Started | — | fresh-start build: /private/tmp/pps/scripts/fresh-start-build.sh, log /private/tmp/pps/API-01.log |
| 2026-11-09 09:44 | API-01 | Completed | Pass | fresh clone 4e7c74b274: frozen install, build:electron:mac --arm64, Prisma + terminal runtime verified; signing not run |
| 2026-11-09 09:44 | API-02..08 | Started | — | package-personal-settings.e2e first run |
| 2026-11-09 09:46 | API-02..08 | Failed (test) | — | first run: import refused `SKILL_NAME_CONFLICT` "Duplicate skill names: design, review" — my fixture gave two agents of one package the same agent-local skills; every other failure cascaded |
| 2026-11-09 09:47 | API-02..08 | Fixed (test) | — | fixture: only `writer` has `skills/design`, `skills/review`; `reviewer` has none |
| 2026-11-09 09:48 | API-02..08 | Completed | Pass | `7 passed`; 3 stability runs with receipts `7 passed` each |
| 2026-11-09 09:50 | API-M1, API-M2 | Completed | Pass (caught) | M1 capture skipped → API-03/04/06 fail; M2 `KEPT_BACKUPS = 6` → API-06 fails; source restored |
| 2026-11-09 09:51 | API-10 | Failed (test) | — | API-10c/10d: `getRunProjection` refuses a delegated copy ("Run package … is unavailable"): copies are read through the host's `agentRunCollaborationMemberProjection` |
| 2026-11-09 09:52 | API-10 | Completed | Pass | after the reader fix `5 passed`; 3 stability runs; receipts list real project tool names |
| 2026-11-09 09:55 | API-M3 | Completed | Pass (caught) | personal-settings publisher disconnected → only API-10b fails (timeout); restored |
| 2026-11-09 09:56 | API-11 | Completed | Pass | typecheck: production 0; tests 1182 = baseline |
| 2026-11-09 09:57 | — | Interrupted | — | host app restarted (update to 1.5.12); state checked: source clean, tests committed (`4558ba91b5`), no instance |
| 2026-11-09 09:59 | API-20 | Started | — | isolated instance of the API-01 bundle, own data root `/private/tmp/pps/inst/data`, scripted `codex` via the data root `.env`; real import of `AutoByteus/autobyteus-agents` |
| 2026-11-09 10:00 | API-20 | Setup error (mine) | — | my `.env` append joined the server's last line (no trailing newline): package root path broken; repaired, restarted |
| 2026-11-09 10:01 | API-20/22 | Progress | — | old commit `83531bb` installed faithfully; editor: removed `run_bash`, added `list_tabs`, Codex/`gpt-5.6-terra`, Save → settings file only, 684 install files byte-identical; marks on Tools and LLM config |
| 2026-11-09 10:03 | API-20 | Completed (click) | Pass | file edits in `computer-use-operator`; Update by click → record captured, backup `20261109T090303Z` with both edited files, new skill arrived, install == HEAD archive |
| 2026-11-09 10:06 | API-20/21 | Completed (automatic) | Pass | rolled back to `83531bb`, team-local `code-reviewer` config edited; Check again; switch on in the Notification Center (en texts read) → `AUTO_UPDATED 45012f0` after ~65 s; backup `20261109T090631Z`; install == HEAD |
| 2026-11-09 10:07 | API-21, API-22 | Completed | Pass | zh-CN: switch texts (on/off), confirmation, editor note, marks, reset link; reset of runtime/model → field removed, mark gone, install unchanged; restart keeps all personal values |
| 2026-11-09 10:08 | — | Cleanup | — | instance stopped; `list` empty; no scripted `codex` left |
| 2026-11-09 10:11 | API-10f, API-10g | Completed | Pass | added: Team run started directly, Org run; `7 passed`, 3 stability runs |
| 2026-11-09 10:13 | API-M4 | Completed | Pass (caught) | personal settings not applied to team-local agents → only API-10d/10f/10g fail; restored; typecheck again = baseline |
