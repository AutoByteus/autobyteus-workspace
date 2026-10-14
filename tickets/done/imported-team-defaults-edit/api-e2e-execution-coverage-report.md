# API/E2E Execution and Coverage Report — imported-team-defaults-edit

- **Current round: `API-002` against `IR-002` (`3936c29b8b`, Local Fix IMPL-F-001 for API-F-001 via CRR-001). Result: `Pass`.**
- Previous round: `API-001` against `IR-001` (`b5caa04c45`) — `Fail` (API-F-001), kept below as history.
- Route: direct, `Small` / `Low`; base `origin/personal@c285adf6bf`. No durable test-code review required by policy (Small/Low direct).
- Evidence: `api-e2e-evidence/` (API-001) and `api-e2e-evidence/api-002/` (this round). Ledger: `api-e2e-test-case-ledger.md`.

## API-002 — re-validation of the fix (Pass)

Fix reviewed: `definition-package-transaction.ts` now stages with `fs.cp(..., { recursive: true, errorOnExist: true, verbatimSymlinks: true })`; nothing else in source changed. Implementer added 2 writer-level tests (file and directory relative links keep their `readlink` value; registered Team save keeps the link).

| Check | Result | Evidence (`api-e2e-evidence/api-002/`) |
| --- | --- | --- |
| API-F-001 resolved (API) | `registered-package-definition-edit.e2e.test.ts` **8/8, twice**; RPE-008 receipt: link `../../../../../shared/design-examples.md` before and after the save. Cleanup receipts clean | `server-e2e-run{1,2}.log`, `server-e2e-run*/registered-package-definition-edit.json` |
| API-F-001 resolved (real UI) | Isolated instance rebuilt from IR-002 (`iso-61838-d542`; fix verified in the bundled server). Package copy restored to its git baseline first (`git checkout -- .`). Import → SE Team edit: Claude Agent SDK / Sonnet 5.5 / thinking xhigh → Save succeeds, no error. **`git status`: only `team-config.json` and `team.md`**. All 39 definition links still relative (0 absolute) and resolve | `ui-01…`, `ui-03…`, `ui-04-se-team-saved.png`, `ui-package-copy-git-status.txt`, `ui-package-copy-diff.patch` |
| AC-005 (UI) on the fixed build | Run on the Team prefills claude-sonnet-5-5 · Claude SDK · Xhigh | run-script output (recorded in the ledger) |
| AC-002 (UI) on the fixed build | AutoByteus Org description save succeeds; `git status` adds only `org-config.json`, `org.md` | `ui-07-org-saved.png`, `ui-package-copy-git-status-final.txt`, `ui-package-copy-diff-final.patch` |
| Typecheck | `tsc -p tsconfig.build.json --noEmit` clean | `typecheck.log` |
| Unit + architecture | 698 files passed, 4 skipped (incl. `registered-package-definition-writes.test.ts` 8 tests) | `unit-suite.log` |
| Integration | 73 passed, 18 skipped; only the 2 known-exception `agent-status-websocket` cases fail; `registered-package-team-update-graphql` passes | `integration-suite.log` |

Baseline note: the package copy contains 82 absolute links before any save, all in the repository's own `.claude/skills` folder (outside every definition); the app never touched them.

### Confidence (API-002)

| Category | Score | Basis |
| --- | --- | --- |
| Requirement/AC coverage | 96% | AC-001..AC-006 executed at API and real UI; AC-007 is the user's beta check |
| Correctness of the change | 96% | API-F-001 fixed and proven at writer, API and UI levels; mutation check of the rule (API-001) still applies |
| Regression safety | 97% | Typecheck, unit, architecture, integration green except the known exception |
| Realistic-system evidence | 95% | Rebuilt isolated desktop instance with a copy of the real package; real delegation path with scripted AGY |
| **Overall** | **96% — Pass** | No category below 90% |

Residual: AC-007 (user's beta check); BASE-001 and O-1..O-5 below remain follow-ups/observations (O-3 acknowledged by the implementer as a follow-up).

---

# History — API-001 (Fail)

## Failing finding

### API-F-001 — A Team save rewrites relative symlinks in the package as absolute, machine-specific paths (Local Fix)

- **Where:** `src/collaboration-definition-admission/providers/definition-package-transaction.ts:90`.
  `commit` stages the save by copying the whole definition folder:
  `fs.cp(canonicalPath, stagePath, { recursive: true, errorOnExist: true })`. Node's `fs.cp` resolves symlinks unless
  `verbatimSymlinks: true` is set, so each relative link is rewritten to an absolute path. The staged copy then replaces the folder.
- **Why it is this ticket's:** before IR-001 only app-data folders reached this writer. Registered packages are users' git checkouts,
  and the real Software Engineering Team has relative links in its team-local skills
  (`references/design-examples.md -> ../../../../../shared/design-examples.md`).
- **Observed through the real UI** (isolated desktop instance; a copy of the user's `autobyteus-agents` in `/private/tmp`, git baseline).
  Saving only the Team default produced 8 extra modified files in `git status`. Each link became
  `/private/tmp/ited-pkg/autobyteus-agents/agent-teams/software-engineering-team/shared/design-*.md`
  (`api-e2e-evidence/ui-package-copy-diff.patch`, `ui-package-copy-git-status.txt`).
  - In the user's checkout these links would point to `/Users/normy/...`.
  - If committed and pushed (the package is installable from GitHub), they break for every other install and after the folder moves.
  - This also fails AC-001's intent: "`team-config.json`/`team.md` in the package are updated", and nothing else should change.
- **Durable reproduction:** new `RPE-008` in `tests/e2e/agent-team-definitions/registered-package-definition-edit.e2e.test.ts`:
  - fails now: `Expected "../../../../../shared/design-examples.md"`, received the absolute path (`server-e2e-run3.log`);
  - passes with `verbatimSymlinks: true` added to that `fs.cp`: 8/8 (`server-e2e-probe-verbatim-symlinks.log`). I only probed this and reverted it; the source is unchanged.
- **Suggested fix (implementation-owned):** add `verbatimSymlinks: true` at line 90. A unit test on `DefinitionPackageTransaction`
  is optional, since RPE-008 already covers it. Org saves use the same transaction and get the same fix (the copied package's Orgs have no links).

## Passing coverage

| Area | Result | Evidence |
| --- | --- | --- |
| AC-001 / REQ-001 (API) | RPE-001: full edit-page payload saves the default runtime/model and description into `team-config.json`/`team.md`; team-local Agents unchanged; nothing in app data; a second save 1.5 s later with the returned revision passes (no folder-watcher race, the design's escalation trigger) | `server-e2e-run{1,2,3}.log`, JSON receipts |
| AC-001 (real UI) | The Software Engineering Team edit page (the screenshot-48 flow): Claude Agent SDK / Sonnet 5.5 / thinking on, reasoning effort xhigh → **Save succeeds**, no error | `ui-03-se-team-edit-default-set.png`, `ui-04-se-team-saved.png`, `ui-package-copy-diff.patch` |
| AC-002 | RPE-003: Org default and description saved into `org-config.json`/`org.md`. UI: AutoByteus Org edit page description save succeeds and writes `org.md` (the Org edit page has no runtime/model section) | `ui-06-org-edit.png`, `ui-07-org-saved.png` |
| AC-003 | RPE-002: stale revision → `DEFINITION_REVISION_CONFLICT`, files byte-identical. UI: changing `team.md` on disk while the edit page is open refreshes the page from disk (live package refresh), so a stale save is not reachable in normal use; the conflict is proven at the API | `ui-08-stale-edit-live-refresh.png` |
| AC-004 | RPE-004: Org-owned Team update refused ("atomic parent AgentOrg save"); delete refused; files byte-identical | E2E logs |
| AC-005 / REQ-002 | RPE-006: a running Manager's real `delegate_task` of the package Team → the copy records `team_default` with the saved model, no notes; its coordinator launches with `--model` = the saved model; after another save a new copy uses the new model. UI: **Run** on the Team prefills claude-sonnet-5-5 · Claude SDK · Xhigh | `ui-05-se-team-run-form.png` |
| AC-006 / REQ-003 | RPE-005 and UI: unwritable folder → "Failed to update agent team definition: Team definition 'software-engineering-team' is read-only at source path '…/agent-teams'."; nothing written; a successful save and its result contain no "read-only"/"external" text | `ui-09-unwritable-folder.png` |
| UC-003 | RPE-007: package Team deleted from its folder | E2E logs |
| Mutation check | Old rule restored → 6/7 cases fail (RPE-004 passes under both, as designed) | `server-e2e-mutation-old-rule.log` |
| Package registration (UI) | Settings → Agent Packages → Import Package (local path): imported, 15 Teams / 49 team-local Agents, "Local Path", auto-refreshing | `ui-00…`, `ui-01-package-imported.png` |

## Repository suites

| Command (clean env `env -i PATH HOME TMPDIR USER`) | Result |
| --- | --- |
| `tsc -p tsconfig.build.json --noEmit` | Clean (`typecheck.log`) |
| `vitest run tests/unit tests/architecture` | 698 files passed, 4 skipped (`unit-suite.log`) |
| `pnpm test:integration` (after `test:integration:prepare`) | 73 passed, 18 skipped; only failures: the 2 known-exception `agent-status-websocket` cadence cases (`integration-suite.log`) |
| New E2E, `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs` | Runs 1–2: 7/7. Run 3 (with RPE-008): 7 pass, RPE-008 fails = API-F-001. Cleanup receipts: data, package, HOME removed; no leftover processes |
| `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | 5/6 fail, pre-existing (BASE-001 below) |

## Pre-existing failure (Rule 9) — reported, not fixed

`agent-team-definitions-graphql.e2e.test.ts` has been stale since `37d05c7f71` (flat Orgs):
- it queries `TeamMember.refType`;
- it imports the removed `buildTeamLocalTeamDefinitionId`;
- 4 of its 5 failing cases test nested Teams, which no longer exist;
- the validation case expects a message that GraphQL input validation now pre-empts.

Fixing it means rewriting a 1390-line file, too large for this urgent ticket. **Follow-up for the Task manager.** The Team save path it covered is now covered by RPE-001..007.

## Observations (non-blocking; outside the Change Scope unless the designer decides otherwise)

- **O-1:** Deleting an Org-owned Team through GraphQL is refused with "Deleting application-owned team definitions is not supported." The text says "application-owned" for every non-shared scope (`agent-team-definition-service.ts:319`, unchanged).
- **O-2:** Even with API-F-001 fixed, a save rewrites the definition files in the shape the app writes them. In the real package this:
  - drops the legacy `refType` keys from members;
  - reorders `avatarUrl` in `org-config.json`;
  - drops `team.md`'s trailing newline.

  These are one-time diff noise in the user's checkout; the content is correct.
- **O-3:** The atomic save replaces the whole definition folder (stage + rename). A terminal or process whose current directory is inside that folder is left in a deleted directory. I hit this while testing (`getcwd: cannot access parent directories`). Agents are not affected (they use direct writes).
- **O-4:** The AC-006 message names the parent folder (`…/agent-teams`), not the Team folder that is unwritable.
- **O-5:** The saved model identifier is `sonnet`. That is the Claude Agent SDK runtime's identifier for Sonnet 5.5 (canonical name `claude-sonnet-5-5`), so it is correct.

## Confidence

| Category | Score | Basis |
| --- | --- | --- |
| Requirement/AC coverage | 95% | AC-001..AC-006 executed at API and UI; AC-007 user-owned |
| Correctness of the change as delivered | 70% | API-F-001 corrupts links in real packages |
| Regression safety (suites) | 97% | Typecheck, unit, architecture, integration green except the known exception |
| Realistic-system evidence | 95% | Isolated desktop instance from this worktree with a copy of the real package; real delegation path with scripted AGY |
| **Overall** | **Fail** (below the 90% floor in one category) | Re-validate after the Local Fix: RPE-008 plus a UI re-save of the package copy with a clean `git status` beyond the intended files |

## Environment and cleanup

- **Isolated instance:** `iso-60463-5627` (fresh temp data root, built from this worktree). The user's app, `~/.autobyteus` and the real
  `autobyteus-agents` checkout were never touched; only the `/private/tmp/ited-pkg` copy was registered. No secrets were imported (no live inference needed).
- API-001 instance `iso-60463-5627` stopped (data root removed) before the rebuild. API-002 instance `iso-61838-d542` stopped and the package copy `/private/tmp/ited-pkg` removed at the end of API-002.
