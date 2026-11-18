# API/E2E Execution Coverage Report — package-personal-settings (autobyteus-95, stage 1)

The run record and the result. The plan is in `api-e2e-coverage-investigation.md`; the history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after the code reviewer's implementation-review pass (CRR-001) of code `2c4ba2c51e` (ticket commit `4e7c74b274`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - **API-10f, API-10g (added).** The reviewer's item 3 names Team and Org members at run start. The planned API-10 covered a standalone run, a running agent and delegated copies, so a directly started Team run and an Org run were added.
  - **API-11, API-M1..M4 (added).** A typecheck of the new files and four mutation controls.
  - **API-20 automatic pass.** Upstream has no commit after HEAD, so the automatic pass ran after rolling the install back to the old commit a second time (same faithful method, instance stopped). It also needed **Check again**, because the last check was not yet due.
  - **AC-002's skill and avatar.** Set in API-02 (fake GitHub), not in the real-GitHub journey (API-20), which changed tools and runtime/model. The capture path is the same for all four fields (unit tests, API-03).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/evidence/api-e2e/` (instance files in `instance/`, receipts in `receipts/`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `2c4ba2c51e` (HEAD `4e7c74b274` + this round's tests `4558ba91b5`, `f3e36e274c`) | macOS 26.5.2 arm64 | Node 22.23.1, Vitest 4.0.18 | `env -i PATH HOME=<resolved temp> TMPDIR`; API-10 with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`) |
| ENV-2 | fresh clone of `4e7c74b274` (API-01), `build:electron:mac -- --arm64` with the release env, unsigned, 1.5.12-beta.10 | macOS 26.5.2 arm64 | `isolated-app start --app /private/tmp/pps/fresh/repo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app --data-root /private/tmp/pps/inst/data` (iso-50039-1ebc, iso-50528-3fee) | Own data root; real `github.com`/`codeload.github.com`, unauthenticated; scripted `codex` (`agent-runtimes-fake-cli.mjs`, models `gpt-5.6-luna,gpt-5.6-terra`) through the data root's `.env`; driven by CDP (real mouse events) at the instance's control port; en, then zh-CN |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | — | server typecheck | Reused IMP-01 | — | Pass | (IMP-01) | — | Code unchanged since `2c4ba2c51e` |
| API-R02 | REQ-001..006, AC-001..005, AC-007 (unit) | contract, store, service, capture with every failure rule | Reused IMP-02, IMP-02b | — | Pass | (IMP-02, IMP-02b) | — | same |
| API-R03 | REQ-003 | GraphQL integration | Reused IMP-03 | — | Pass | (IMP-03) | — | same |
| API-R04 | AC-004 (legacy record), DS-003 step 1 | affected server E2E | Reused IMP-04 | — | Pass | (IMP-04) | `37 passed \| 2 skipped` | Legacy record: the update stops with the remedy text |
| API-R05 | AC-005, AC-008 (web) | web typecheck, guards, unit/component, codegen | Reused IMP-05..IMP-08 | — | Pass | (IMP-05..08) | — | same |
| API-R07 | built-ins across restart, AC-005 | rendered editors | Reused IMP-09a/b | — | Pass | (IMP-09a/b) | — | same commit |
| API-01 | build inputs | Fresh-start build | `git clone --no-local`, checkout `4e7c74b274`, `pnpm install --frozen-lockfile`, release build, verify Prisma and packaged terminal runtime | ENV-2 | Pass | `API-01-fresh-start-build.log` | `schema-engine-darwin-arm64 present`, `[terminal-runtime] ok …`, `DONE`, exit 0 | Signing-policy step not run (runner certificate) |
| API-02 | AC-002 (click), REQ-003, REQ-005 | server E2E, fake GitHub, real installer and update pipeline | `vitest run tests/e2e/personal-settings/package-personal-settings.e2e.test.ts` | ENV-1 | Pass | `API-02-08-package-personal-settings.e2e.run{1,2,3}.log`, `receipts/API-02-08-receipt.run1.json` | Exact settings record; install hashes unchanged after saves; after the update the settings bytes are unchanged, no backups, effective writer tools `[read_file, tool_r2, generate_image]` | Agent: tool added/removed, skill, avatar, runtime/model; Team: avatar, runtime/model |
| API-03 | AC-003 | same | same file | ENV-1 | Pass | same | exact captured record; one backup with 3 files; effective values equal the AC-002 shape | An existing personal avatar wins over a file edit |
| API-04 | AC-002/003 (automatic) | same, fake clock | same file | ENV-1 | Pass | same | `AUTO_UPDATED`; the edit captured; a second backup | — |
| API-06 | DEC-008, RUS-002 | same | same file | ENV-1 | Pass | same | 5 backups kept; the oldest removed | — |
| API-05 | AC-004 | same | same file (installed archive answers 404) | ENV-1 | Pass | same | click: `UPDATE_FAILED`, install, settings and backups unchanged; automatic: `AUTO_FAILED` | — |
| API-07 | AC-005 | same | same file | ENV-1 | Pass | same | reset of writer `TOOLS` and crew `AVATAR`: field removed, package value back | — |
| API-08 | AC-007 | same | same file | ENV-1 | Pass | same | `{not json` at start → base values, `PERSONAL_SETTINGS_FILE_UNREADABLE` warning, file kept; next save → one `.unreadable-<time>` copy, valid record | — |
| API-10a | AC-006, AC-001 | gated server E2E, scripted AGY, Agent Tools MCP | `vitest run tests/e2e/personal-settings/personal-tools-in-runs.e2e.test.ts` | ENV-1 | Pass | `API-10-personal-tools-in-runs.e2e.run{1,2,3}.log`, `receipts/API-10-receipt.run1.json` | baseline run lists `list_project_tasks`; after the save, a new run lists `create_task`, not `list_project_tasks` | Local git package |
| API-10b | DS-004, RUS-001 | running agent | same file | ENV-1 | Pass | same | `update_task` appears in the running agent's `LIST_TOOLS` without a restart | — |
| API-10c | AC-006 | delegated Agent copy | same file | ENV-1 | Pass | same | copy tools `[create_task, delegate_task, list_projects, send_message_to, update_task]` | Read through the host's `agentRunCollaborationMemberProjection` |
| API-10d | AC-006 | delegated Team copy, team-local coordinator | same file | ENV-1 | Pass | same | coordinator tools include personal `create_project` | — |
| API-10f | AC-006 | Team run started directly | same file | ENV-1 | Pass | same | `/lead` has `create_project`; `/worker` has `create_task`, `update_task`, not `list_project_tasks` | Added this round |
| API-10g | AC-006 | Org run (package agent + package Team) | same file | ENV-1 | Pass | same | `/worker` and `/crew/lead` as above | Added this round |
| API-10e | AC-001 | local checkout | same file | ENV-1 | Pass | same | `git status --porcelain` empty; exact `personal-settings.json` | — |
| API-11 | regression | server typecheck incl. tests | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-11-server-typecheck.log` | production 0; tests 1182 = baseline | — |
| API-M1 | test strength | capture skipped (`captureFromPackageEdits` never called) | same file as API-02 | ENV-1 | Pass (caught) | `API-M1-mutation-capture-skipped.log` | API-03, 04, 06 fail; others pass | Restored |
| API-M2 | test strength | `KEPT_BACKUPS = 6` | same | ENV-1 | Pass (caught) | `API-M2-mutation-kept-backups-6.log` | only API-06 fails | Restored |
| API-M3 | test strength | personal-settings publisher disconnected | API-10 file | ENV-1 | Pass (caught) | `API-M3-mutation-publisher-disconnected.log` | only API-10b fails | Restored |
| API-M4 | test strength | personal settings not applied to team-local agents | API-10 file | ENV-1 | Pass (caught) | `API-M4-mutation-team-local-not-applied.log` | only API-10d, 10f, 10g fail | Restored |
| API-20 (click) | AC-002, AC-003, REQ-005 | packaged instance, real GitHub | Import `AutoByteus/autobyteus-agents`; stop; install its older commit `83531bb` from codeload with that revision in the registry; editor: remove `run_bash`, add `list_tabs`, Codex / `gpt-5.6-terra`, Save; edit `agents/computer-use-operator/agent-config.json` (+`create_task`) and its `agent.md`; Settings → Agent Packages → Update | ENV-2 | Pass | `instance/API-2x-06…`, `-07…`, `-09-after-update-click.png`, `instance/API-20-*.json\|txt` | After Save: only `personal-settings.json` written, 684 install files byte-identical. After Update: "Agent package updated." / "Up to date."; record = in-app edits + captured `create_task`; backup `20261109T090303Z` with both edited files; `agent-package-evaluation` skill arrived; install == HEAD `45012f0` archive (`diff -r`) | `agent.md` is replaced (not a personal setting), kept in the backup |
| API-20 (automatic) | AC-002, AC-003 (automatic) | same | Stop; roll back to `83531bb` again; remove `search_web` from the team-local `software-engineering-team/agents/code-reviewer` config; start; Check again; Notification Center → switch on → Turn on | ENV-2 | Pass | `instance/API-2x-13-center-en-auto-updated.png`, `instance/API-20-*` | `AUTO_UPDATED` after ~65 s, row "Updated automatically to 45012f0"; record adds `agent:team-local-agent:software-engineering-team:code-reviewer: {toolsRemoved:[search_web]}`; second backup `20261109T090631Z`; earlier personal values kept; install == HEAD | — |
| API-21 | AC-008, REQ-009 | Notification Center switch and confirmation | en: read off text, confirmation, on text; zh-CN (Settings → Language): on text, off text, confirmation (cancelled) | ENV-2 | Pass | `instance/API-2x-12-confirm-en.png`, `-13-…`, `-15-confirm-zh.png` | en: "Your personal tools, skills, avatars and runtime/model are kept; other local changes are replaced, with a backup." and the confirmation's "…the changed files are first copied to a backup."; zh-CN: "你的个人工具、技能、头像和运行时/模型会被保留；其他本地更改会被替换，并保留备份。" and "…被更改的文件会先复制到备份中。" | Matches the catalogs exactly |
| API-22 | AC-005, UI runtime/model | agent editor, scripted Codex models | Mark after Save (en and zh-CN); zh-CN reset link next to LLM config; restart | ENV-2 | Pass | `instance/API-2x-07-launch-mark.png`, `-16-editor-zh-marks.png`, `-17-editor-zh-after-reset.png` | "Personal · Reset to the package's setting" on Tools and LLM config only; zh-CN "个人 · 恢复为智能体包的设置" and note; after reset: `defaultLaunchConfig` removed from the record, effective `null`, runtime select empty, Tools mark only; install unchanged; after `restart` all personal values kept | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-10a, API-10e (local git package, Agent Tools MCP tools), API-20 (GitHub install unchanged by saves), API-R02 | Proven | — |
| AC-002 | Yes | API-02 (all five edits, click), API-04 (automatic), API-20 click and automatic (real GitHub; tools and runtime/model) | Proven | — |
| AC-003 | Yes | API-03, API-04, API-06, API-20 (shared and team-local configs, real archives) | Proven | — |
| AC-004 | Yes | API-05 (click and automatic), API-R04 (legacy record), API-R02 | Proven (download failure emulated; real GitHub not made to fail) | — |
| AC-005 | Yes | API-07, API-22 (rendered reset), API-R05, API-R07 | Proven | — |
| AC-006 | Yes | API-10a..10d, API-10f, API-10g | Proven | — |
| AC-007 | Yes | API-08, API-R02 | Proven | — |
| AC-008 | Yes | API-21 (en and zh-CN rendered), API-R05 | Proven | — |
| Built-ins across restart | No | API-R07 (IMP-09a/b) | Proven by reuse | — |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | all ACs above | AC-002's skill/avatar not repeated on real GitHub | — |
| Changed-boundary execution directness | 85% | 96% | API-02..10 real server chain; API-20..22 packaged app | — | — |
| Cross-boundary integration realism and mock gap | 75% | 94% | real GitHub archives and revisions (API-20) | AC-004 download failure only with a fake 404 | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | fresh-clone release build; own data root | older install shaped by replacing the managed install (no older import path exists); scripted Codex; unsigned build | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | API-05, 06, 08, restart in API-22, R-04 legacy | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | API-20..22 in en and zh-CN | Org runtime/model rendering (design R-1) not exercised in the instance | An `org-config.json` edit before an update |
| Durable regression coverage quality and relevance | 85% | 96% | 2 new suites (14 cases), 3 stable runs each, 4 mutation controls each failing only the owning cases | — | — |

- Overall post-repository confidence: 82%
- Overall final confidence: 95.0% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: as in the table above (all low).

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (packaged isolated instance of the fresh-clone build) + `Live API` (real studio server E2E)
- Confidence gap addressed:
  - real GitHub archives of real revisions for the installed-revision download, backup and capture;
  - the editors' marks and reset in the packaged renderer;
  - REQ-007 texts rendered in both languages;
  - the automatic pass in the shipped scheduler.
- Browser validation needed: No (the packaged desktop window was driven directly).

## Desktop Application Validation

- Approach executed: isolated instances (`--app <fresh-clone bundle>`, `--data-root`, `stop`/`start`, `restart`).
- Cases: API-20 (Settings → Agent Packages, Notification Center), API-21, API-22.
- Effect on any already-running desktop application: `None`. Only instances started by this run; no "Install and restart"; the scripted `codex` was confirmed before start (`codex-cli 0.150.0`), and no runtime Update was pressed.
- Not directly proven: the Org editor's runtime/model mark with a captured Org value (component spec only, design R-1).

## Persisted-Data Transition Checks

- Approved: `Not Affected` for existing data (new files `personal-settings.json`, `backups/`).
- Representative data: an unreadable file at start (API-08); a registry record of a real older install (API-20); a legacy record with no installed revision (API-R04).
- Approved transition followed: `Yes`. Version-specific branch or fallback observed: `No`.

## Compatibility / Legacy Scope Check

- Backward compatibility in requirements/design: only the legacy-record stop (REQ-006), proven by API-R04. Known: FU-003 (the row still offers Update, which always stops).
- Durable coverage retained only for compatibility: `No`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/personal-settings/package-personal-settings.e2e.test.ts` | Added (`4558ba91b5`) | API-02..08 | Ungated; fake GitHub serves head read, metadata and archives per revision; schema built once per process; `PERSONAL_SETTINGS_E2E_EVIDENCE_DIR` receipt |
| `autobyteus-server-ts/tests/e2e/personal-settings/personal-tools-in-runs.e2e.test.ts` | Added (`4558ba91b5`), extended (`f3e36e274c`) | API-10a..10g | Gated like the sibling scripted-AGY suites; `PERSONAL_TOOLS_E2E_EVIDENCE_DIR` receipt |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub (server E2E) | `fetch` stub (head read, REST metadata, codeload archives, 404 for an "unavailable" revision) | Deterministic revisions and failures | Real archives covered in API-20 |
| Agent runtime (API-10) | scripted AGY CLI (`linked_skills`, `LIST_TOOLS` answered from the run's Agent Tools MCP session) | No model needed to read a run's tools | MCP tools are real; only the model is scripted |
| Codex models (API-22) | `agent-runtimes-fake-cli.mjs` as `codex` via the data root `.env` | Runtime/model picker needs a configured runtime; no vendor account | Model list content only |
| Time (E2E) | Vitest fake `setTimeout`/`Date` | The automatic pass waits a minute | Real tick in API-20 (~65 s) |
| An older install | managed install replaced by the older commit's codeload archive and its revision in the registry, app stopped | The app imports only HEAD | Same files an older import would have written |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Instances iso-49664-6110, iso-49922-f668, iso-50039-1ebc, iso-50528-3fee | Yes | `isolated-app stop`; `list` shows none | Done |
| Scripted `codex` and its state | Yes | no process left (`pgrep`) | Done |
| Mutations M1..M4 in `src` | Yes | `git checkout --` after each; `git status` shows no `src` change | Done |
| `/private/tmp/pps` (fresh clone, data root, archives, scripts, logs) | Yes | Removed at hand-off | Done |
| Real network | — | GitHub REST: only the one import's metadata requests; then head reads (checks) and codeload archives (quota-free) | — |

## Preliminary Classification (On `Fail`)

N/A

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: None.
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes:
  - **Test-side fixes during the round** (no product change):
    - the first fixture gave two agents of one package the same skill names (`SKILL_NAME_CONFLICT`, correct product behavior);
    - delegated copies must be read through the host's collaboration projection, not `getRunProjection`.
  - **Observation (not this ticket).** The server-written `server-data/.env` ends without a newline, so a line appended with `>>` joins its last line. I hit this while preparing the instance. It is pre-existing and harmless for the app itself.
  - **Follow-ups.** None new. FU-003 is confirmed as known.
