# Handoff Summary — delegated-copy-model-change

## Final: User Verification And Release (DR-003)

- User verification: the user replied on 2026-10-13, "anyway, its done. my answer is yes". This accepts the ISO-002 / DCP-005 evidence images, whose paths were given to the user, as their check.
- Release: beta `v1.5.3-beta.4`, at the user's request ("so all working right? then release beta"). It is complete: four of four workflows, 17 assets, Docker `:beta`. See `release-deployment-report.md` → DR-003.

## Verification (Delivery Judgement From Evidence)

### DR-002: Verified From Evidence

- Status: **verified from evidence** (2026-10-13). The user was not asked, because nothing needs the user's own accounts or nodes.
- API-REV-002 Pass and CRR-004 Pass (test-code review, no findings) closed the DR-001 gap. Evidence opened and judged by delivery:
  - **DCM-008**, server E2E, 6/6 ×2 (`api-e2e-evidence/server-e2e/r2-dcm-run-{1,2}.log`). The reviewer of a Team copy ran once, then got its own choice:
    - the record is on that member only (team and other members `null`);
    - it resumed on the choice with its own `--conversation`, and its first turn is still in the conversation;
    - the coordinator relaunched on its own model, and a never-started member started on the started model;
    - in a combined Team + member Save, the coordinator and the follower take the Team choice and the reviewer keeps its own and its conversation.
  - **DCP-005**, browser probe (`r2-browser-probe-run-2/DCP-005-*.png`): only the member changed; the other rows are identical; the member shows the new model with no source label; its next turn resumed on it. Full probe 15/15, 0 browser errors.
  - **ISO-002**, packaged app with real runtimes (`r2-isolated-instance/`). This is the AC-010 scenario:
    - A PM on Claude haiku delegated a review team.
    - Settings shows only `code_reviewer` changed, to GPT-6-Luna on Codex, with no source label; lead and writer stay on claude-haiku-5-5 "Inherited from the run".
    - The code reviewer's conversation holds the turn before and the turn after the change.
    - The usage ledger shows `/review_team/code_reviewer` on `codex_app_server/gpt-6-luna` and `/review_team/lead` on `claude-haiku-5-5`.
- Together with the round-1 evidence (agent copies, Team choices, collaborators, refusals, restart), every critical acceptance criterion is directly proven. Final confidence is 95% (round 1) and was reconfirmed by API-REV-002.
- Release decision: no release. The user did not ask for one on this ticket, and `RELEASE.md` defaults to no release. A release is available on request.

### DR-001: Evidence Gap (Resolved In DR-002)

- Status: **evidence gap sent back to API/E2E** (DR-001). Nothing has been pushed or merged. The user is not asked to verify (updated delivery skill: delivery verifies from evidence).
- Proven by evidence:
  - Agent copies: stop, choice, resume and restart (DCM-001/004/005, DCP-001/003/004), including a real Codex resume in the same thread (ISO-001).
  - Team-level choices reaching followers, and never-started members (DCM-002/005/006, DCP-002).
  - A collaborator Agent (DCM-005).
  - Refusals: `COPY_RUNNING`, validation and capacity (DCM-007, DCP-004, ISO-001).
- **Missing: a per-member choice inside a Team copy.** This is REQ-001 "any member of a Team copy", and the AC-010 scenario: change the code reviewer of a delegated SE team copy.
  - It is covered only by unit tests of records and projections (`copy-launch-selection.test.ts`, `launch-selection-dto-projection.test.ts`).
  - No server E2E, browser or desktop journey shows one member of a Team copy edited in Settings and saved with `{agentRunId: <member>}`, then that member resuming on the new model while its teammates keep theirs.
- Requested from API/E2E: a durable server E2E case and a browser-probe case for that journey, plus a real-runtime run of the same journey on an isolated instance if reachable.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change`, branch `codex/delegated-copy-model-change` (local only).
  - `71d51a1608`, `312653734c`: IR-001 server and web.
  - `810742c628`, `0fb29b6d8c`: IR-002 (live Save choices, per-instance copy launch in member contexts, split oversized files).
  - `aaf6f010f1`: baseline fix of the SR-011 architecture guard (TESTING.md Rule 9, its own commit).
  - `01ff6e8273`, `b3928c649f`, `d7c2030592`: ticket records.
  - `c841412d6b`: delivery checkpoint, with paths staged explicitly:
    - server E2E DCM-001..007;
    - probe DCP-002..004, with the header case list completed;
    - `test:e2e:delegated-copy-model-change`;
    - review and API/E2E records and evidence.
  - Not committed yet: the delivery docs edits (web `settings.md`, `agent_execution_architecture.md`) and the delivery records in this folder.
- Base and finalization target: `origin/personal`. The branch is current with `origin/personal` @ `a609de982a`. It was re-fetched at delivery start with no new commits, so no merge was needed.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` folders.

## What Changed

- **Stop one copy.** A running delegated copy or collaborator has the run's red stop icon on its sidebar row and on its Settings row.
  - Stopping interrupts its turn and stops the copies it started. It stays restorable, and the run keeps running.
  - Server: `stopDelegatedExecution`. While a copy is being stopped, a message into or from it is refused (`TASK_EXECUTION_STOPPING`).
- **Change its model while stopped.** In Settings, a stopped copy's Agent, Team or member rows edit the model and its settings. Runtime, approval and workspace stay locked. A Team choice moves the members that follow the team.
  - The choice is validated like stopped-run model switching (catalog, settings schema, AutoByteus capacity).
  - It is recorded per instance (`userLaunchSelection` / `userTeamLaunchSelection`). No migration is needed.
  - It is saved only while the copy is stopped; otherwise Save is refused with `COPY_RUNNING`.
  - Live views receive the saved choice without a reload.
- **Resume.** The next message, from the user or an agent, resumes the copy in the same conversation on the chosen model. The choice survives idle shutdown, stop and reopen of the root, and app restart. The definitions, other copies and later copies are not affected.
- **Docs:**
  - server `agent_communication.md` (new section) and `run_history.md`;
  - web `settings.md` and `agent_execution_architecture.md`;
  - the probe header.
  - See `docs-sync-report.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass |
| Code review | CRR-002 Pass, 9.2/10 (CR-001..CR-003 resolved) |
| API/E2E | API-REV-001 Pass, 95%. Results:<br>• Server unit: 686 files, 5424 tests.<br>• Typecheck.<br>• Architecture: 44/44.<br>• Contracts: 16/16, 27/27.<br>• Web: 615 files, 4291 tests; guards.<br>• Server E2E: DCM 5/5 ×2, plus five related delegation suites.<br>• Integration: 371 passed; the only 2 failures are the known TESTING.md cadence exception.<br>• Probe: 14/14 (including DCP-001..004).<br>• ISO-001 (packaged app, real runtimes): a Codex copy stopped, was switched from `gpt-5.6-luna` to `gpt-6-luna`, and resumed in the same Codex thread. A native capacity refusal recorded nothing. |
| Test-code review | CRR-003 Pass, no findings |
| Delivery | • Base current (`a609de982a`), so no integration rerun was needed. The only delivery change to test code is a header comment, and `node --check` passes.<br>• `check_licensing.py` and `check_repository_artifact_hygiene.py` pass. |

## How To Verify (AC-010), kept for reference; delivery verifies from evidence

1. Start an isolated app built from this worktree (its own data; your app is not touched):

   ```bash
   cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change
   pnpm --silent isolated-app start --build
   ```

2. Import your provider keys into it, using the `databaseUrl` and `instanceId` from step 1:

   ```bash
   script -q /dev/null pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url "<databaseUrl>"
   pnpm --silent isolated-app restart <instanceId>
   ```

3. In **Settings → Agent Packages**, add the local path `/tmp/dcm-agents`. It is a disposable copy of `autobyteus-agents`.
4. Start **Project Task Manager** and ask it to delegate a small Task to the Software Engineering Team.
5. While the copy runs:
   - its sidebar row and its row in the PM run's **Settings** show the red stop icon;
   - its model controls are locked with "Stop this copy to change its model."
6. Click **Stop** on the copy. The PM run keeps running.
7. In **Settings → Collaborators and delegated copies**, open the copy, then **code-reviewer**. Change its model, for example to another Codex or Claude model, and **Save**. The row now shows the new model, with no source label.
8. Send the copy (or the code reviewer) a message, or let the PM message it. It resumes in the same conversation, and the code reviewer's next turn runs on the new model. The Token Meter or usage shows that model.
9. Optional (AC-005): stop the PM run and reopen it, or restart the instance. Settings still shows your choice, and the next turn uses it.
10. Stop the instance: `pnpm --silent isolated-app stop <instanceId>`.

## Decisions Needed At Verification

1. **Release:** finalize only (merge to `personal`), a beta (next: `v1.5.3-beta.4`), or stable? The last tags are `v1.5.3-beta.3` and stable `v1.5.2`.
2. **Follow-up candidates.** These go to the Solution Designer unless you decide otherwise:
   - O-1: after a `COPY_RUNNING` refusal, the locked row still shows the unsaved model.
   - O-2: a resumed Codex copy said no delegation tool was available. This is outside this ticket.
   - O-3: the Save bar says "applies when this run resumes", even for copies of a running run.
   - `configured-agent-execution-support.ts` naming.
   - Files near the 500-line limit.
   - REQ-008 user-sent path without a durable case.

## Residual Risks

- Another client's open Settings needs a Refresh to show the change.
- Stop interrupts work in progress by design.
- Copies recorded before delegators existed are not stopped with their starter.
- A stopped standalone Agent-run Save writes two files; a metadata failure is reported.
- There is no dedicated idle-shutdown case; the shared restore path is covered.
