# Handoff Summary — imported-team-defaults-edit

## Verification

- **Verified from evidence (delivery, 2026-10-14)** for AC-001..AC-006, from API-002 (Pass, 96%). Evidence opened and judged:
  - Server E2E `registered-package-definition-edit.e2e.test.ts`: 8/8, twice (`api-e2e-evidence/api-002/server-e2e-run{1,2}.log`).
    - One case per AC: RPE-001 Team save; RPE-003 Org; RPE-002 revision conflict; RPE-004 Org-owned refusal; RPE-006 a real `delegate_task` copy launching on the saved default; RPE-005 unwritable folder.
  - Real UI on an isolated build of IR-002, with a copy of the user's `autobyteus-agents`:
    - The Software Engineering Team saves Claude Agent SDK / `sonnet` / thinking xhigh with no error (`ui-03`, `ui-04`).
    - The package diff writes exactly that `defaultLaunchConfig` (`ui-package-copy-diff-final.patch`).
    - `git status` shows only `team-config.json`, `team.md`, `org-config.json` and `org.md` (`ui-package-copy-git-status-final.txt`).
    - All 39 definition links stay relative.
    - Run prefills claude-sonnet-5-5 · Claude SDK · Xhigh.
- **AC-007 ("The user checks on a beta")** is the user's own check, written into the approved requirements. It is asked after the beta is published.
- Release decision: **beta**. AC-007 requires a beta, and the package came marked "URGENT, beta release is waiting".

## State

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit`, branch `codex/imported-team-defaults-edit`. Base `origin/personal` @ `c285adf6bf`, current; no merge needed.
- Commits:
  - `b5caa04c45`: IR-001;
  - `60366696ec`: E2E and API-001 evidence;
  - `3936c29b8b`: IR-002 symlink fix;
  - `d395c2cd4b`: API-002 evidence.
- Delivery adds a docs note (`agent_team_definition.md`), these records and the archive.
- Classification: `Small` / `Low`, direct route.

## Checks

- Base current, so no integration rerun was needed. Delivery changed docs only.
- `check_licensing.py` and `check_repository_artifact_hygiene.py` pass.
- API-002 suites on this state: typecheck clean; unit and architecture 698 files pass; integration 73 pass, plus the 2 known `agent-status-websocket` exceptions.

## Follow-Ups For The Solution Designer

- BASE-001: `agent-team-definitions-graphql.e2e.test.ts` has been stale on base since `37d05c7f71`. It fails 5/6 and needs a rewrite.
- O-3: a folder-swap save leaves a process whose working directory is inside the folder in the replaced directory.
- O-1: refusing to delete an Org-owned Team says "application-owned".
- O-4: the read-only message names the parent folder.
