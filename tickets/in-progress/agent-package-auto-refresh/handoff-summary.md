# Handoff Summary — agent-package-auto-refresh

## User Verification

- Status: **ON HOLD (DR-002)**. CRR-006 requires a public-contract rename. This summary describes the pre-rename DR-001 state and must not be used for verification. Nothing is pushed or merged.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh`. Branch: `codex/agent-package-auto-refresh` (local only, not pushed).
  - Implementation and test commits run from `9777af682` to `33d290187` (IR-001…IR-003, API-REV-002 test commits).
  - `ff9d81048`: delivery checkpoint of the API-REV-002 and CRR-005 records and the API/E2E evidence.
  - `8187bac0f`: merge of `origin/personal` @ `beb6b3b49` (44 commits, including Claude Sonnet/Haiku 5.5, v1.5.1, compaction cache reuse, delegated-copy Task locator and the `TESTING.md` rewrite). There was one conflict, in a doc comment of `autobyteus-web/services/projects/projectChangeFeed.ts`. It was resolved by keeping the shared `NodeChangeFeed` lifecycle and adding the base's Task-worker retainer wording. The base's `useTaskWorkerTaskStore().applyChange` delivery merged cleanly.
  - `061ea7ab3`: docs sync.
  - Not committed yet: the delivery documents (this file, `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`, `delivery-evidence/`).
- Base and finalization target: `origin/personal`. The branch contains the latest `origin/personal` (`beb6b3b49`, fetched 2026-10-11).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (architecture, code and test-code review).
- Not to be committed: the untracked `*/dist/` folders.

## What Changed

- **Server: one live definition catalog** (`src/definition-catalog/`).
  - Every reader uses it: delegation, `list_available_agents`, `@`, the GraphQL lists, admission, and run create and restore.
  - A file watcher on each registered package root detects definition changes. They are applied after 1 s of quiet (3 s at most), and any read applies pending changes first.
  - Each definition, nested ones included, keeps its last good version when an edit breaks it.
  - Changes are published on `/ws/definition-catalog`.
  - The cache providers, the fresh read path and `definitionAdmissionDiagnostics` are removed.
- **GraphQL:**
  - `AgentDefinition.catalogIssue`;
  - `AgentTeamDefinition.catalogIssues` and `AgentOrgDefinition.catalogIssues`;
  - `definitionDiagnostics(subject)`;
  - `AgentPackage.autoRefresh`;
  - `refreshAgentOrgDefinitionCatalog`.
- **DSN-002:** a Team or Org whose ID exists in more than one package is unavailable to every reader. `list_available_agents` and `@` no longer offer it.
- **Web:**
  - Loaded lists reload live; Settings → Agent Packages rows too.
  - Cards show an issue badge. Nested definition issues appear on the owning Team or Org card (SR-008).
  - Lists show a notice for definitions that cannot be used.
  - Package rows show "Auto-refreshing", "Folder not found" or "Not auto-refreshing — reason".
  - The projects feed now shares the extracted `NodeChangeFeed`.
- **Docs:** new `autobyteus-server-ts/docs/modules/definition_catalog.md`. Updated: server `ARCHITECTURE.md`, `agent_packages.md`, `agent_definition.md`, `agent_team_definition.md`, `agent_orgs.md`, `agent_communication.md`, and web `agent_management.md`, `agent_teams.md`, `agent_orgs.md`, `settings.md`. `TESTING.md` is unchanged: the new E2E command lives in the test file header, as the rewritten `TESTING.md` requires (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass |
| Code review | CRR-004 Pass (round 4, full re-audit, 9.3/10). Test-code review CRR-005 Pass, no findings |
| API/E2E | API-REV-002 Pass (95%). Isolated desktop: DESK-001…007 pass. These cover the Agent Package Creator journey with real Codex, nested Team and Org badges appearing and clearing, a second client, reconnect, and "Folder not found". MEAS-001: about 604 watched handles, 0 under skills, idle CPU about 0.05% |
| Delivery, on the merged code (`8187bac0f`) | • Server typecheck: clean.<br>• Server unit: 672 files, 5306 tests pass.<br>• New `definition-catalog-live-refresh.e2e` (gated command): 9/9.<br>• Web `test:nuxt`: 606 files, 4195 tests pass.<br>• Sibling E2E (agent-definitions, agent-team-definitions, skill-name catalog): 37 pass. 7 fail; these are the same 7 that already fail on the base and are reported to their owners (`agent-team-definitions-graphql` ×5, `agent-package-private-skills` ×2).<br>• Logs: `delivery-evidence/` |

## How To Verify

Start an isolated app built from this worktree. It has its own data and does not touch your running AutoByteus:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh
pnpm --silent isolated-app start --build
```

1. In Settings → Agent Packages, import a local package folder. Copy one first if you don't want your real package touched. The row shows **Auto-refreshing**.
2. With the Agents page open, add `agents/<new-id>/agent.md` and `agent-config.json` to that folder; copying an existing agent folder works. The card appears within a few seconds without Reload, and the agent is offered in `@`.
3. Break that agent's `agent-config.json` (for example, delete a closing brace). The card stays and shows **Using last working version**; expand it for the file and reason. Fix the file, and the badge clears.
4. Break a team-local agent's config under `agent-teams/<team>/agents/<agent>/`. The **Team card** shows the badge, and the Team is still usable. If your package has an org, do the same under `agent-orgs/<org>/…` and check the **Org card**.
5. Rename the package folder away. The row shows **Folder not found**, and the definitions stay listed. Rename it back, and the row returns to **Auto-refreshing**.
6. Optional: ask the Project Task Manager to have the Agent Package Creator create a new agent and delegate to it. This is the journey from the original request.
7. Stop the app with `pnpm --silent isolated-app stop <instanceId>`.

## Decisions Needed At Verification

1. **Accept as done?**
2. **Release:** finalize only, or also publish a beta (`v1.5.2-beta.1`) or a stable version? The current version is `v1.5.1`.

## Residual Risks (non-blocking)

- Detection can be slow under heavy load. A lookup about 40 ms after the last write can come before the monitor sees the change. REQ-018 covers detected changes only, and the 5 s QR-003 bound holds.
- Linux evidence comes from the container probe only: 603 inotify watches. A watch limit shows **Not auto-refreshing**, and Reload works.
- GitHub Update was validated against controlled HTTP only.
- Optional cleanup R-2: deduplicate the "kind folders listable" check in the sync and the monitor.
- FU-001 (out of scope, same as base): `@` collaborator candidates are not filtered by admission availability.
- 83 stale compiled `tests/**/*.test.js` files remain tracked in `autobyteus-server-ts` (follow-up).
- The header of `definition-catalog-live-refresh.e2e.test.ts` names DCF-E2E-001…008 but not DCF-E2E-009 (cosmetic; the command is unchanged).
