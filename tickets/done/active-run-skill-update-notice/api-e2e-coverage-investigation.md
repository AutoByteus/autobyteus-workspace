# API/E2E Coverage Investigation — `active-run-skill-update-notice`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/requirements-doc.md` (SR-003 approved; design SR-004)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`; Solution Handoff: `…/solution-handoff.md`
- Design Spec: `…/design-spec.md` (SR-004)
- Supplemental Task Artifacts: `…/follow-up-tasks.md` (FT-1…FT-3), `…/implementation-evidence/` (rendered screenshots)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-003 Pass); Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-003, § CRR-003 Resolution); Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-004 Pass, § Round 4); Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: CRR-004 Pass (APE-001 / CR-005 resolved by `53074d2ac`) from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: round 1 (API-REV-001, Fail)
- Latest Authoritative Investigation: this file (round 2; see § Round 2 Delta)

(All `…/` paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/`.)

## Routing Classification

- Task size: `Large`; Architectural risk: `High`
- Input route: `Reviewed`; Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

When files in a skill folder used by a run change (1 s quiet, 3 s cap), each affected run gets one platform notice:

- **Busy runs:** via `AgentRun.postUserMessage`. It arrives inside the current turn on Codex/Claude, and as the next turn on AutoByteus, AGY, ACP and Grok.
- **Idle runs:** combined into the provider message of the next external input (one turn).
- **Restored runs**, including after an app restart: diffed against `<memoryDir>/seen_skill_versions.json`.

Further requirements:

- The notice is shown and recorded as a system notice (sender `system.skill_update_notifier`; web label "Skill updated").
- Skills are keyed by name and re-resolved through the current catalog:
  - a moved folder (a new GitHub generation) means updated, with the new path;
  - a name that no longer resolves means no longer available.
- Noise is ignored.
- Only used skill folders are watched.
- Failures are isolated.

Critical ACs: AC-001 (REQ-001/003/004/007), AC-007/AC-010 (REQ-011).

## Supported Scenarios And Real Usage

- **Designer scenarios:** SCN-001…SCN-006 (SCN-006, the self-improvement loop, is primary).
- **Real-use scenarios added:**
  - **RU-01, the real skill PR merge:** a real `git merge` of a branch that edits two skills (Project Task Manager and Agent Package Creator) into the imported local package checkout. This is the actual trigger of SCN-006, and also QR-001 timing on a real burst.
  - **RU-02, delegated copy shut down after idle:** the idle-shutdown grace expires, the skill changes, then the Manager messages the copy by run ID. This is the real AC-003 copy path, different from a user-stopped run.
  - **RU-03, app closed while the skill changes:** a desktop stop with the data root kept, a skill edit, a restart from the same data root, then the stopped run is continued (AC-003, second half).
  - **RU-04, a GitHub skill-source Update:** Check, then Update publishes a new generation folder while a run uses the skill (AC-005b).
  - **RU-05, `ALL_INSTALLED` on the user's real installed skill set:** the 5 configured skill sources, including `autobyteus_mcps` (R-5 watch count and first snapshot).
- **Technically Possible but Unsupported/Contrived (not tested):**
  - runs inside application execution scopes (out of Change Scope; follow-up);
  - mid-turn on non-append runtimes (FT-1…FT-3).

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 detection → batch → per-run notice | Added | REQ-001/003/008–010/012 | Integration (existing) + new E2E roots + desktop merge |
| BEH-002 busy run via agent-message path | Added | REQ-004/011/013 | Live E2E (existing Codex/Claude/AutoByteus) + Grok live (add) + desktop Codex |
| BEH-003 idle/restored: combined with next input; never woken | Added | REQ-005/006 | Scripted AGY (existing) + new copy shutdown/restore + desktop restart |
| BEH-004 system notice presentation/history | Added | REQ-007 | Live projections (existing) + desktop rendered |
| `AgentRun.executeInputDispatch` preface | Changed (every input of every runtime) | DS-003 | Full server baselines + all sibling runtime E2E families touched by input dispatch |
| `autobyteus-ts` memory ingest preface | Changed | N-1 | autobyteus-ts unit baseline |

## Changed Surface And Boundary Classification

| Surface | Affected | Changed Boundary | Repository Evidence | Not Exercised | Candidate Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | tracker, watcher, diff, notice builder, preface dispatch | unit + integration (fake backends, real `AgentRun`) | — | — |
| API / transport | Yes | `SYSTEM_TASK_NOTIFICATION` on the agent WS; history projections | scripted AGY E2E; live E2E (3 runtimes) | team/org/delegated roots on the wire; Grok | new gated E2E; Grok live |
| Frontend | Yes | segment label | spec | real rendered journey | desktop |
| Browser/user journey | Yes | conversation shows notice; agent re-reads | dev-stack screenshots | real PR merge journey | desktop (AC-010) |
| Process / lifecycle | Yes | watcher start/stop with runs; restore across app restart; idle shutdown | integration; AGY restore | copy idle shutdown; real app restart | E2E + desktop |
| Persisted data | Yes (additive file) | `seen_skill_versions.json` | integration | real app restart | desktop |
| External integration | Yes | 6 runtimes; GitHub sources | live 3 + scripted AGY | Grok/ACP live; GitHub generation in a live server | Grok live; E2E with controlled GitHub |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice` (`codex/active-run-skill-update-notice` @ `4bd93a32f`, local)
- Guideline: root `TESTING.md` (unchanged by this branch); no closer `TESTING*.md`.
- Secrets: present in the environment (values not recorded): `OPENAI_API_KEY` (AutoByteus live), `GROK_API_KEY`, a logged-in Codex CLI, the Claude CLI and the Grok CLI. The isolated desktop instance uses Codex through the CLI login, so no key file is needed. The implementer's assumption was corrected by evidence from the previous ticket's desktop runs.

| Instruction | Learned |
| --- | --- |
| `TESTING.md` | baselines; gated live suites; scripted AGY; isolated desktop (Rules 1–6); fix base failures (Rule 9) |
| `docs/isolated-app-instances.md` | `--build`, `stop --keep`, `--data-root` for the app-restart case |
| Live suite header | `RUN_SKILL_NOTICE_E2E=1`, `SKILL_NOTICE_E2E_RUNTIMES` |

## Existing Durable Coverage Inventory

| Path | Intent | Decision | Action |
| --- | --- | --- | --- |
| `tests/unit/agent-execution/agent-run-input-preface.test.ts` | preface take/settle, recovery guard | Still Valid | run |
| `tests/unit/skill-update-notices/*` | parts, watcher | Still Valid | run |
| `tests/integration/skill-update-notices/*` | AC-002/004/005/006/007/008/009, CR-001/002 | Still Valid | run |
| `tests/e2e/runtime/agy-skill-update-notice-transport.e2e.test.ts` | AGY next turn, stop pending, idle combined, AC-003 stop/continue | Still Valid | run gated |
| `tests/e2e/runtime/skill-update-notice-live.e2e.test.ts` | Codex/Claude append, AutoByteus next turn, R-1 re-read, idle combined, history | Still Valid; Needs Update to add Grok (ACP) | extend |
| autobyteus-ts `platform-input-preface-memory.test.ts` | N-1 | Still Valid | run |
| web `SystemTaskNotificationSegment` spec | label | Still Valid | run |

## Durable Coverage To Add / Update

| Case ID | Behavior | Evidence Basis | Artifact | Why |
| --- | --- | --- | --- | --- |
| SUN-E2E-001 | AC-007 on the wire: Team member A (uses X) and member B (no X); Org member (uses X); a delegated copy (uses X). Change X; each gets its next input. A, the Org member and the copy get exactly one notice in that same turn; B gets none | REQ-002, REQ-011, AC-007 | new gated scripted-AGY E2E `tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts` | Roots are covered only by integration with fake backends |
| SUN-E2E-002 | RU-02: a delegated copy shut down after idle (60 s grace); X changes; the copy stays offline (no launch); the Manager's message restores it; one combined turn with the notice | REQ-006, AC-003, QR-003 | same file | Copy shutdown/restore is untested at the wire |
| SUN-E2E-003 | RU-04 / AC-005b: a GitHub source Update publishes a new generation. The next input carries "updated" with the new `SKILL.md` path, not "no longer available". A later edit in the new folder gives another notice | REQ-009, AC-005b | same or a sibling file (controlled GitHub HTTP) | Integration only |
| SUN-LIVE-GROK | AC-001 next-turn class on ACP/Grok live (busy → next turn; idle combined; re-read) | REQ-004, REQ-011 | extend `skill-update-notice-live.e2e.test.ts` with runtime `grok` (temporary `GROK_HOME`) | ACP not run live |
| FIX-ECHO | Fixture route `ECHO_INPUT` in `linked_skills` (reply with the exact input AGY got) | supports SUN-E2E-001/002 | `tests/fixtures/agy-failure-cli.mjs` | read-only, additive |

## Repository Coverage Execution Plan

| Order | Command | Proves | Result |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts build`; `env -i … pnpm -C autobyteus-ts exec vitest run tests/unit` | core preface/memory | Pass (299 files) |
| 2 | server `typecheck`, `test:unit`, `test:integration:prepare` + `test:integration` | server baselines | Pass (typecheck clean; unit 683; integration 74, only the 2 documented cases fail) |
| 3 | web `test:nuxt --run` | web | Pass (610 files) |
| 4 | gated scripted AGY: existing + new | AGY class, roots, copy restore, GitHub generation | Pass (×3) |
| 5 | live: Codex, Claude, AutoByteus (existing) + Grok (new) | AC-001 per runtime | Pass |
| 6 | sibling runtime E2E touched by input dispatch (AGY interrupt-resend, context files, ad-hoc delegation, task copy idle lifetime) | regression | Pass (34 tests) |

## Test-Case Ledger Decision

- Ledger required: `Yes` (many cases, live model runs, a long desktop journey). Path: `…/api-e2e-test-case-ledger.md`.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Mode: `Project Desktop Validation`, human-like on an isolated instance of a worktree build, with real Codex agents.
- Gap: AC-010 (primary journey), RU-01 (QR-001 on a real merge), RU-03 (app restart), rendered notice, and the R-5 real `ALL_INSTALLED` cost.
- Plan:
  1. Copy the user's `autobyteus-agents` as a git repository and import it through Settings.
  2. The Project Task Manager (Codex) delegates to the Agent Package Creator; the copy goes idle.
  3. The Agent Package Creator commits a skill change on a branch (its "PR").
  4. While the Project Task Manager is busy, I merge with `git merge` (user approval).
  5. Observe one "Skill updated" notice inside the turn and a re-read.
  6. The idle copy gets the notice with its next task.
  7. App-restart case.
  8. Measure R-5 with the user's 5 skill sources registered read-only.

## Temporary Executable Validation Plan

| Case | Method | Why not durable |
| --- | --- | --- |
| R-5 measure | watch handles and first snapshot on the user's real installed skill folders (read-only) | machine/config specific |
| DESK-* | isolated desktop journey with real Codex, recorded | real models, packaged build |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Owner |
| --- | --- | --- | --- |
| APE-001: watch handles are not released when the last run using a skill ends (QR-002, REQ-012, DS-001) | `Local Fix` (confirmed as CR-005) | desktop MEAS-001; `api-e2e-evidence/ape-001-unwatch-probe*` | **Resolved** in `53074d2ac`; verified in round 2 |

## Investigation Decision

- Proceed: `Yes`. Durable coverage will be added (one new gated E2E file, the live-suite Grok extension, an additive fixture route).
- Broader validation: round 1 `Required`, executed, `Fail` (APE-001). Round 2 `Required`, executed, `Pass`; see the execution report.

## Round 2 Delta (API-REV-002)

- Delta under test: `53074d2ac` (+ docs `f181b9b13`). `SkillFolderWatcher` keeps one chokidar instance per watched skill folder; a folder leaving the watch set has its instance closed and its pending change dropped; folders still used keep their instance. Changed durable tests: `skill-folder-watcher.test.ts` (per-folder fakes; real-chokidar descriptor-release test) and the service integration test (open-watch accounting, R-5 close on run end).
- Affected boundaries: watcher handle lifecycle (QR-002, REQ-012, R-5) and, because every notice starts at the watcher, change detection for all runtimes (AC-001/002/003/005b/007).
- Not affected: preface composition, delivery classes, persistence, roots targeting logic, web rendering. Round-1 evidence for these stays valid; a proportional subset is rerun because detection now passes through new code.

| Rerun | Purpose | Method |
| --- | --- | --- |
| RR-001 probe on a fresh build | APE-001 reproduction case | `ape-001-unwatch-probe.mjs` on rebuilt `dist` |
| RR-002 pre-fix control | prove the measure detects the defect | the same probe on the `c9e100778` watcher transpiled alone |
| RR-003 Linux inotify | QR-002 on Linux (the unit test only asserts closes there) | new `rerun/ape-001-linux-inotify-probe.mjs` in `node:22-slim` (Docker, linux arm64), fixed and pre-fix; also checks kept and re-watched folders still report |
| RR-004 notice suites + typecheck | changed durable tests | `vitest run tests/unit/skill-update-notices tests/integration/skill-update-notices`; `typecheck` |
| RR-005 server unit | regression | `test:unit` |
| RR-006 roots + transport E2E | real-watcher detection at the wire, re-watch of a new GitHub generation | gated scripted AGY |
| RR-007 live Codex | real-watcher detection on a live runtime | `RUN_SKILL_NOTICE_E2E=1 SKILL_NOTICE_E2E_RUNTIMES=codex_app_server` |
| MEAS-002 desktop | the round-1 failing measurement, plus notice and re-watch in the product | isolated instance at `f181b9b13`; the same 5 real sources read-only plus a test-owned source; two `ALL_INSTALLED` chats each followed by a skill edit and a UI terminate; `lsof` sampling |

- Not rerun (unaffected by the delta): AC-010 PR-merge journey, app-restart case, Claude/Grok/AutoByteus live, web, autobyteus-ts, integration suite beyond the notice files.

## Round 3 Delta (API-REV-003, delivery re-entry DR-001)

- Trigger: CRR-006 Pass (round 5) from `/software_engineering_team/code_reviewer`. The DR-001 fix is implementation-owned, so it returns through API/E2E before delivery re-integration.
- Code under test: `141268a74`. Fix: IR-004 `f977849b2`, on delivery head `98360b8a3`, which merges `origin/personal@a609de982` (web only) and the docs sync.
- What changed:
  - `SeenSkillVersionsStore.write` never creates the run's memory folder (`stat`, temp file opened `wx`) and returns `written | folder_missing | aborted`.
  - `RunSkillTracker` serializes a run's writes and retries `folder_missing` while the run is tracked (1 s, 5 s, 15 s, then 60 s).
  - Release stops writing and cancels the retry.
  - `close()` awaits tracking and writes, with the close order watcher → service → tracker.
- Boundaries affected:
  - the seen record's existence and timing for runtimes whose memory folder appears with the first trace (Codex, Claude);
  - restore after a change (AC-003), which depends on that record;
  - delete-after-release (no re-created folder);
  - the integration teardown flake (`ENOTEMPTY`).
- Not affected: the watcher (round 2), delivery classes, rendering. The web-only merge from `origin/personal` is delivery's integration and is covered by its checks.

| Case | Purpose | Method |
| --- | --- | --- |
| R3-001 typecheck + build | — | `typecheck`; `build` |
| R3-002 notice unit + integration ×5 | flake gone; 3 DR-001 cases and 2 store cases | five consecutive `vitest run tests/unit/skill-update-notices tests/integration/skill-update-notices` |
| R3-003 roots + transport E2E ×2 | SUN-E2E-002 (copy restore) and AC-003 rely on the record | gated scripted AGY |
| R3-004 live restore, Codex and Claude (new durable case) | the record appears after the first trace within the retry schedule; terminate → change → continue gives one notice and a re-read; `deleteStoredRun` → the folder stays deleted (22 s, longer than the 1 + 5 + 15 s schedule) | `skill-update-notice-live.e2e.test.ts`, new `it.each`; both live cases run for Codex and Claude |
| R3-005 server unit | regression of the composition close order and tracker | `test:unit` |

- Durable coverage to add: one live case in `skill-update-notice-live.e2e.test.ts` (the gated live suite). No live test covered restore or delete with a real runtime-created folder.
- Broader validation: the live runs (R3-004) plus an isolated desktop journey on the AutoByteus runtime (R3-006). That journey uses keys imported with `pnpm secrets:import` from the user-designated source `/Users/normy/.autobyteus/server-data/.env`, because the vitest live suite resets its test database on every run.
- Execution revision (user direction, 2026-10-17):
  - Codex has no token budget left, so later live work uses the Claude Agent SDK and AutoByteus runtimes; Codex results recorded before that point stand.
  - API keys go through the importer into the test vault, never through environment variables.
  - The AutoByteus live-suite attempt that took its key from the environment was stopped before completion and is not counted.

| Case | Purpose | Method |
| --- | --- | --- |
| R3-006 desktop restore and delete on AutoByteus | the same DR-001 path on the AutoByteus runtime, through the UI | `iso-54264-fe7b` built at `141268a74`; importer dry run, then import, then restart; Daily Assistant on AutoByteus `gpt-5.5`; a test-owned skill source; terminate → edit → continue; delete from history in the UI → folder removed; a skill edit after the delete → folder not re-created (75 s) |
