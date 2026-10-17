# API/E2E Test Case Ledger — imported-team-defaults-edit

Rounds: `API-001` (IR-001, `b5caa04c45`) — Fail; **`API-002` (IR-002, `3936c29b8b`) — Pass** (see the API-002 rows at the end). Status: `Pass` / `Fail` / `Not run` with the reason.

| ID | Requirement / AC | Layer | Scenario | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| RPE-001 | AC-001, REQ-001, REQ-003 | Server E2E (real HTTP/GraphQL; package imported via `importAgentPackage` LOCAL_PATH) | Team edit page full-payload save of default runtime/model + description; then a second save with the returned revision 1.5 s later | Saved into the package `team-config.json`/`team.md`; members and team-local Agents unchanged; nothing in app data; second save passes (no watcher race); no "read-only" text | Pass (2/2 runs) | `api-e2e-evidence/server-e2e-run{1,2}.log`, `server-e2e-run*/registered-package-definition-edit.json` |
| RPE-002 | AC-003 | Server E2E | Save with a stale revision | `DEFINITION_REVISION_CONFLICT`; package files byte-identical | Pass | same |
| RPE-003 | AC-002 | Server E2E | Org edit page full-payload save of the Org default + description | Saved into `org-config.json`/`org.md`; Org-owned Team kept | Pass | same |
| RPE-004 | AC-004 | Server E2E | Direct update and delete of an Org-owned Team of the package | Update refused ("atomic parent AgentOrg save"); delete refused (`success:false`); files byte-identical | Pass (see observation O-1 on the delete text) | same |
| RPE-005 | AC-006, REQ-003 | Server E2E | Package Team folder `chmod 0555`, then save | "… is read-only at source path …"; content unchanged | Pass | same |
| RPE-006 | AC-005, REQ-002 | Server E2E (real Team root, WebSocket, scoped MCP `delegate_task`; scripted AGY) | A running Manager delegates the package Team; the user edits the default again; a new copy is delegated | Copy 1 records `team_default` AGY/`rpe-saved-model`, no notes, coordinator launched with `--model rpe-saved-model`; copy 2 records and launches `rpe-edited-model` | Pass | same |
| RPE-007 | UC-003 | Server E2E | Delete a package Team | `success:true`; the folder is removed; the definition is gone | Pass | same |
| RPE-008 | AC-001, REQ-001 | Server E2E | A team-local skill reference that is a relative link to a Team-shared file; save the Team | The link stays `../../../../../shared/design-examples.md` | **Fail** (rewritten to an absolute path = API-F-001); passes with `verbatimSymlinks: true` (probe, reverted) | `server-e2e-run3.log`, `server-e2e-probe-verbatim-symlinks.log` |
| RPE-M | Rule regression | Mutation check | Old rule restored (`sourceClass !== "server_data"` refused) | The new E2E fails (6/7; RPE-004 passes under both, as designed) | Pass (detected) | `api-e2e-evidence/server-e2e-mutation-old-rule.log` |
| UI-001 | AC-001 | Isolated desktop instance, real UI | Register a copy of the real `autobyteus-agents`; Software Engineering Team edit page: Claude Agent SDK / Sonnet 5.5 / xhigh; Save | Success; package diff shows only the intended change | **Fail** (save succeeds and the default is written, but 8 relative skill links become absolute = API-F-001) | `ui-03`, `ui-04`, `ui-package-copy-diff.patch` |
| UI-002 | AC-005 | Isolated desktop instance, real UI | Run the Software Engineering Team after UI-001 | The launch form is prefilled with the saved default | Pass (claude-sonnet-5-5 · Claude SDK · Xhigh) | `ui-05-se-team-run-form.png` |
| UI-003 | AC-002 | Isolated desktop instance, real UI | AutoByteus Org edit page description save (the page has no runtime/model section) | Success; `org.md` updated | Pass (O-2 key-order noise) | `ui-06`, `ui-07`, diff |
| UI-004 | AC-003 | Isolated desktop instance, real UI | `team.md` changed on disk while the edit page is open, then Save | Conflict or fresh data | Pass (the page live-refreshes from disk, so no stale save is reachable; conflict proven by RPE-002) | `ui-08-stale-edit-live-refresh.png` |
| UI-005 | AC-006 | Isolated desktop instance, real UI | Team folder `chmod 0555`; Save | "read-only at source path" message | Pass (O-4: names the parent folder) | `ui-09-unwritable-folder.png` |
| REPO-001 | all | Repository | Server typecheck | Clean | Pass | `api-e2e-evidence/typecheck.log` |
| REPO-002 | all | Repository | Server `tests/unit` + `tests/architecture` | Pass | Pass (698 files, 4 skipped) | `api-e2e-evidence/unit-suite.log` |
| REPO-003 | all | Repository | Server `test:integration` | Pass, except the known `agent-status-websocket` exception | Pass (73 passed; only the 2 known-exception cases fail) | `api-e2e-evidence/integration-suite.log` |
| BASE-001 | — | Pre-existing | `agent-team-definitions-graphql.e2e.test.ts` | Fails 5/6 on the branch, unchanged by it; stale since flat Orgs | Reported as follow-up (Rule 9: too large) | `api-e2e-coverage-investigation.md` |
| AC-007 | — | User | Beta check | — | Not run (user-owned) | — |

## API-002 re-validation (IR-002, `3936c29b8b`)

| ID | Requirement / AC | Layer | Scenario | Expected | Status | Evidence (`api-e2e-evidence/api-002/`) |
| --- | --- | --- | --- | --- | --- | --- |
| RPE-001..008 | AC-001..AC-006, UC-003 | Server E2E | Full file | 8/8 | Pass (2 runs); RPE-008 link unchanged | `server-e2e-run{1,2}.log` |
| UI-001r | AC-001 | Rebuilt isolated instance, real UI | Package copy restored to baseline; SE Team default Claude Agent SDK / Sonnet 5.5 / xhigh; Save | Success; only `team-config.json`, `team.md` change; links stay relative | Pass | `ui-04-se-team-saved.png`, `ui-package-copy-git-status.txt` |
| UI-002r | AC-005 | Real UI | Run the Team | Prefilled with the saved default | Pass | run-script output |
| UI-003r | AC-002 | Real UI | Org description save | Only `org-config.json`, `org.md` added to the diff | Pass | `ui-07-org-saved.png`, `ui-package-copy-git-status-final.txt` |
| REPO-001r..003r | all | Repository | Typecheck; unit + architecture; integration | Green except the known exception | Pass (698 unit files; 73 integration files) | `typecheck.log`, `unit-suite.log`, `integration-suite.log` |
