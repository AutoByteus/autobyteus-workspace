# Handoff Summary — agent-package-auto-refresh

Current for delivery round **DR-003**, the SR-009 renamed package. The DR-001 summary (pre-rename) is superseded.

## User Verification

- Verified by the user on 2026-10-12: "finalize, no need to release a new version".
- Decisions:
  1. **Accepted as done.**
  2. **No release.** The change ships with the next release.
  3. **Rehearsal video:** not answered, so the default applies. Both recordings are kept as ticket evidence, as the code reviewer requested (each under 50 MB).

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh`. Branch: `codex/agent-package-auto-refresh`. Pushed and merged into `personal` as `b57d85ad9` (DR-004); the local worktree has since been removed.
  - Product and test history runs through `705e699b1`:
    - IR-001…IR-003;
    - SR-009 rename IR-004, `e89085f3e`;
    - DCF-E2E-010, `705e699b1`.
  - Earlier delivery commits from DR-001 stay in the branch history: `ff9d81048`, merge `8187bac0f`, and docs `061ea7ab3`, which IR-004 renamed.
  - `6193ecd84`: DR-003 checkpoint of the SR-009 records, API-REV-003 and CRR-007/008 reviews, the round-3 evidence and the DR-001/002 delivery records.
  - `6bf957f72`: merge of `origin/personal` @ `37e972199` (72 commits, up to v1.5.2-beta.3: token-meter accuracy, the remote-provider removal, `RELEASE.md`, `TESTING.md` additions). No conflicts. The base changed the Prisma schema, so the worktree's Prisma client was regenerated (`prebuild`) before the checks.
  - `93ee56a5e`: docs commit for the N-7 web note.
  - The delivery documents and `delivery-evidence/dr-003/` are not committed yet; they will be committed at finalization.
- Base and finalization target: `origin/personal` (see `RELEASE.md`). The branch contains the latest `origin/personal` (`37e972199`, fetched 2026-10-12).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Large evidence to note before push:
  - `api-e2e-evidence/round3/desktop/round3-human-journey.mp4` (46 MB, authoritative recording);
  - `api-e2e-evidence/round3-rehearsal/round3-human-journey.mp4` (25 MB, non-authoritative rehearsal).

  Both are under GitHub's 50 MB per-file warning, and earlier tickets also committed recordings. Say so if you want the rehearsal video left out.
- Not committed: the untracked `*/dist/` folders.

## What Changed

- **Server: agent package definitions** (`src/agent-package-definitions/`).
  - All agent, team and org definitions from registered agent packages are loaded in one place, and every reader uses it: delegation, `list_available_agents`, `@`, the GraphQL lists, admission, and run create and restore.
  - A watcher on each package folder detects definition changes. They are applied after 1 s of quiet (3 s at most), and any read applies pending changes first.
  - Each definition, nested ones included, keeps its last working version when an edit breaks it.
  - Changed lists are announced on `/ws/agent-package-definitions` as `agent_package_definitions_changed {changedLists}`.
  - The cache providers, the fresh read path, `definitionAdmissionDiagnostics` and the three per-page refresh mutations are removed.
- **GraphQL:**
  - `AgentDefinition.loadIssue`;
  - `AgentTeamDefinition.loadIssues` and `AgentOrgDefinition.loadIssues`;
  - `definitionProblems(kind)`;
  - one `reloadAgentPackageDefinitions` mutation;
  - `AgentPackage.autoRefresh` (`WATCHING`, `FOLDER_MISSING`, `UNAVAILABLE`).
- **DSN-002:** a Team or Org whose ID exists in more than one package is unavailable everywhere. `@` and `list_available_agents` no longer offer it.
- **SR-008:** a nested definition's load issue shows on the owning Team or Org card.
- **SR-009 / N-7:** application-package agents and Teams are read on demand. They are not watched and get no badge. A malformed one is logged and skipped.
- **Web:**
  - Loaded lists and package rows reload live.
  - Cards show a load issue badge, and lists show a definition problems notice.
  - Package rows show "Auto-refreshing", "Folder not found" or "Not auto-refreshing — reason".
- **Docs:** `autobyteus-server-ts/docs/modules/agent_package_definitions.md` plus updates to the server packages, definitions, orgs, communication and architecture docs and the web Agents, Teams, Orgs and Settings docs. `TESTING.md` is unchanged, because the command lives in the test file header as `TESTING.md` requires. See `docs-sync-report.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass (SR-009 records in `architecture-review-revision-record.md`) |
| Code review | CRR-007 Pass (round 6, full re-audit, 9.3/10); CR-001…CR-011 resolved. Test-code review CRR-008 Pass, no findings |
| API/E2E | API-REV-003 Pass (96%). DCF-E2E-001…010 ×3. A recorded 67-minute desktop journey on the renamed build used only real clicks and typing (HUMAN-001…012, N7-001), with real Codex agents and a phone-paired `/mobile` client |
| Delivery, on the merged code (`6bf957f72`) | • Prisma `prebuild`, then server typecheck: clean.<br>• Server unit: 673 files, 5322 tests pass.<br>• Renamed E2E (gated): 10/10.<br>• Web: 605 of 606 files pass. The one failure is the voice-input integration test, which timed out at 5 s under full-suite load and passes 2/2 alone; this ticket doesn't touch it.<br>• Sibling E2E: 38 pass. The 7 failures are the same 7 known base failures.<br>• Repository hygiene and licensing checks pass.<br>• Logs: `delivery-evidence/dr-003/` |

## How To Verify

Start an isolated app built from this worktree. It has its own data and does not touch your running AutoByteus:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh
pnpm --silent isolated-app start --build
```

1. In Settings → Agent Packages, import a local package folder (a copy, if you prefer). The row shows **Auto-refreshing**.
2. With the Agents page open, add a new agent folder to the package (copy an existing one and change its ID). The card appears within a few seconds without Reload, and the agent is offered in `@`.
3. Break that agent's `agent-config.json`. The card stays and shows **Using last working version**; expand it for the file and reason. Fix the file, and the badge clears.
4. Break a team-local agent under `agent-teams/<team>/agents/<agent>/`. The **Team card** shows the badge, and the Team stays usable. Do the same inside an org, and check the **Org card**.
5. Rename the package folder away. The row shows **Folder not found**, and the definitions stay listed. Rename it back, and the row returns to **Auto-refreshing**.
6. Optional: ask the Project Task Manager to have the Agent Package Creator create an agent and delegate to it.
7. Stop the app with `pnpm --silent isolated-app stop <instanceId>`.

You can also watch the recording of API/E2E's journey: `api-e2e-evidence/round3/desktop/round3-human-journey.mp4`.

## Decisions Needed At Verification

1. **Accept as done?**
2. **Release:** finalize only (the default per `RELEASE.md`), a beta `v1.5.2-beta.4`, or a stable version? The current version is `v1.5.2-beta.3`.
3. **Rehearsal video:** keep `round3-rehearsal/round3-human-journey.mp4` (25 MB, non-authoritative) in the commit, or leave it out?

## Residual Risks (non-blocking)

- Linux evidence comes from the container probe only (about 603 inotify watches). A watch limit shows **Not auto-refreshing**, and Reload works.
- GitHub Update was validated against controlled HTTP only.
- Detection can be slow under heavy load (REQ-018 scope; the 5 s bound holds).
- FU-001 (out of scope, same as base): `@` collaborator candidates are not filtered by admission availability.
- Optional follow-ups:
  - rename the pre-existing `CollaboratorDefinitionCatalog` / `TeamLocalDefinitionSubject`;
  - trim TN-1;
  - make the test header name DCF-E2E-009/010.
- 83 stale compiled `tests/**/*.test.js` files remain in `autobyteus-server-ts`.
- Base failures reported to their owners: `agent-team-definitions-graphql` ×5, `agent-package-private-skills` ×2.
