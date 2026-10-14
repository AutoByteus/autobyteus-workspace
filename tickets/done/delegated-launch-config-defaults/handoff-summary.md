# Handoff Summary — delegated-launch-config-defaults

## Round 2 (reopened, DR-003/DR-004)

### User Verification

- 2026-10-13, the user wrote: "the task is done. verified. lets finalize and release a new beta version"
- Decisions:
  1. **Verified and accepted.** This is explicit verification of round 2.
  2. **Release:** a new beta. It shipped as `v1.5.3-beta.2` and is complete: four of four workflows, 17 assets, Docker `:beta`. See `release-deployment-report.md` → Round 2.
  3. **O-6** (390 px clipping) and the open round-1 items were not decided. They go to the Solution Designer as follow-up candidates.

### Status At The DR-003 Handoff

- Status: waiting for verification at that time. Nothing had been pushed or merged.
- Why it was reopened: in your screenshot 37, New chat switched to Marketing Team with the heading switcher, but no member was seeded from its default (SR-005). You also asked for collaborators and copies in Settings to look like Members (SR-006).
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route.
  - Architecture review, code review and test-code review: N/A — not applicable (direct route).
  - API/E2E: API-REV-004 Pass, 95%.

### State

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied`, branch `codex/delegated-launch-config-defaults-r2`, local only.
  - `0ac4e4b07`: the web fix.
  - `6cddfce4d`, `c7a443d8c`: the reopen and implementation records.
  - `50cd035c5`: checkpoint of the probe (DLP-001..010) and the API/E2E round-4 records and evidence.
  - `071033f95`: merge of `origin/personal` @ `32aca0818` (legacy Docker retirement: Docker files, scripts and Docker READMEs only). It merged without conflicts.
  - Not committed yet: the web docs (`agent_teams.md`, `agent_orgs.md`, `settings.md`), the updated release notes and these delivery records.
- Base and finalization target: `origin/personal`. Round 1 is already released in `v1.5.3-beta.1`.
- Not to be committed: the untracked `*/dist/` folders.

### What Changed

- **Heading-switcher starts now seed members (SR-005).** Every Team or Org start that does not copy a run seeds each member from its own usable default and pins it. This covers:
  - New chat → a Team;
  - Team A → Team B, which gives only B's seeds;
  - New chat → an Org;
  - the Org page → a Team.

  The composer's text and root settings are kept. **+** still copies the run's recorded member settings and seeds nothing.
- **Settings looks like Members (SR-006).** "Collaborators and delegated copies" uses the same rows as Members:
  - Each copy or collaborator is one row, collapsed by default, with its badge and "Notes: N" when it has notes.
  - Opening a Team shows its settings card, then Members, with the Coordinator chip on the copy's coordinator.
  - A team-level note appears once, which resolves O-2.
  - Rows are read-only, and the same for running and stopped runs. The old flat list is removed.
- No server, contract or persistence change.

### Validation Evidence

| Gate | Result |
| --- | --- |
| API/E2E (API-REV-004) | Pass, 95%. Probe DLP-001..010 passed 10/10 twice. A bug check shows the released stores fail DLP-008 and DLP-009. Web 4243 passed. ISO-002, an isolated app of this round with real catalogs, reproduced your screenshot-37 journey: the strategist was seeded and ran on Codex `gpt-5.6-luna` under a Claude haiku PM. Settings showed the collapsed row with "Notes: 1" |
| Delivery checks on `071033f95` (`delivery-evidence/dr-003/`) | • `autobyteus-ts` build, server prebuild and build: pass.<br>• Probe: DLP-001..010, 10/10.<br>• Web `test:nuxt`: 610 files, 4245 passed, 3 skipped.<br>• Web guards: 3/3.<br>• Licensing and path hygiene: pass.<br>• Server suites were not rerun: no server source changed in this round or in the merged base. Round-1 server evidence carries forward. |

### How To Verify

1. Start an isolated app built from this worktree:

   ```bash
   cd /Users/normy/autobyteus_org/autobyteus-worktrees/launch-defaults-not-applied
   pnpm --silent isolated-app start --build
   ```

2. Import keys only if the PM's runtime needs them:

   ```bash
   script -q /dev/null pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url "<databaseUrl>"
   pnpm --silent isolated-app restart <instanceId>
   ```

3. In **Settings → Agent Packages**, add the local path `/tmp/dlcd-r2-agents`. It is a disposable copy of `autobyteus-agents`, so your real repository is not changed.
4. In **Agent Teams → Marketing Team**, give two members their own default, for example Codex and Claude. Give a third member a model its runtime does not offer.
5. **Your journey (screenshot 37):**
   1. Open a plain New chat and type some text.
   2. Use the heading switcher to choose Marketing Team.
   3. The members line reads "2 of 4 customized". The two members show their defaults, and the third shows the "can't be used" note. Your text and the composer's model are kept.
6. **Delegation and Settings:**
   1. Start the Project Task Manager on another runtime and have it delegate a small Task to `/marketing_team`.
   2. Open the run's **Settings**. "Collaborators and delegated copies" shows one collapsed "Delegated copy" row with "Notes: 1".
   3. Open it. The team card comes first, then Members with the Coordinator chip. Members show "Agent default" or "Inherited from the run".
7. Optional, AC-015: repeat with the Software Engineering Team and Codex / Sol 6.1 on implementation-engineer and code-reviewer.
8. Stop: `pnpm --silent isolated-app stop <instanceId>`.

### Decisions Needed At Verification

1. **Release:** finalize only, or a beta (next: `v1.5.3-beta.2`), or stable?
2. **O-6, new follow-up candidate:** at 390 px, an opened copy's member cards clip their values (the same nested layout as Org placed-team members). Desktop (672 px section) and 880 px are fine. Should it be a separate ticket?
3. Still open from round 1:
   - the `RELEASE.md` `dist/` correction;
   - follow-ups DEC-006, O-1, O-3;
   - `chatDraftStore.ts` at the 500-line limit.

### Residual Risks

- An Org "+" re-seed and the fast Team → Agent switch race are covered by store tests only.
- UNK-001 is unchanged.

---

# Round 1 (released in `v1.5.3-beta.1`)

## User Verification

- 2026-10-12: the user replied "now finalize and release a new beta."
- Decisions:
  1. **Accepted for finalization.** The user did not report the AC-015 result separately. This instruction is recorded as acceptance. AC-015's setup was proven with real Claude and Codex runtimes in the packaged app (ISO-001), but not with the user's own Software Engineering Team definitions and Sol 6.1.
  2. **Release:** a new beta. It shipped as `v1.5.3-beta.1`, the next beta after stable `v1.5.2`, and is complete: four of four workflows, 17 assets, Docker `:beta`. See `release-deployment-report.md`.
  3. **`RELEASE.md` correction:** not answered. It is not changed in this ticket and stays a proposal.
  4. **Follow-up candidates:** not answered. They go to the Solution Designer as separate-ticket candidates.

## State Before Finalization (DR-002)

- After the DR-001 handoff, a round-3 API/E2E update arrived: API-REV-003 Pass (96%) and CRR-005 Pass. Only the browser probe changed; it now drives every case through the real UI (DLP-001..007).
- `origin/personal` had advanced to `449d639de`. It brought:
  - stable `v1.5.2`;
  - `token-meter-accuracy`, with a Prisma migration;
  - `claude-normal-reply-auth-error-misclassification`.
- Commits:
  - `39925ea16`: checkpoint of round 3.
  - `02de957e0`: the docs.
  - `44441f4ab`: `docs(testing)`.
  - `74f5b8efd`: the DR-001 records.
  - `7f750e1e5`: merge of `449d639de`. It merged without conflicts, and the rebuilt contract `dist/` matched what was committed.
- Checks on `7f750e1e5` all passed (`delivery-evidence/dr-002/`):
  - `autobyteus-ts` build;
  - server prebuild, typecheck and build;
  - server unit: 673 files, 5291 passed, 7 skipped;
  - ticket server E2E: 3/3;
  - contracts: team 13/13, collaboration 24/24, presentation 17/17;
  - real-UI browser probe: DLP-001..007, 7/7;
  - web `test:nuxt`: 605 files, 4216 passed, 3 skipped;
  - web guards: 3/3;
  - licensing and path hygiene.

## State For User Verification (DR-001)

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults`, branch `codex/delegated-launch-config-defaults` (local only, not pushed).
  - `55092536a`: server and the two contract packages, including their tracked `dist/`.
  - `035b208d5`: web.
  - `881c4e4ce`: dead-code removal (CR-001).
  - `823237259`, `6796e5c14`, `50b63759d`: ticket records.
  - `a33d8ad66`: checkpoint of the durable tests (server E2E, web probe and its script, mobile spec) and the review and validation records.
  - `c421f5b86`: merge of `origin/personal` @ `3514fe48e`. The merge was clean. It brought in the remote-provider removal, `RELEASE.md`, the path hygiene check and the `1.5.2-beta.2` version.
  - Not committed yet: the docs updates, the `TESTING.md` fix (it will be its own `docs(testing)` commit), and the delivery records in this folder.
- Base and finalization target: `origin/personal` (see `RELEASE.md`).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` folders of the application SDKs and `brief-studio`.

## What Changed

- **Delegated copies and collaborators** (`delegate_task` and `send_message_to` to an available agent or team) run each agent on the first usable layer: its agent default, then its team's default, then the run root's settings.
  - Runtime, model and model settings are taken together from one layer.
  - Workspace and auto-approve still come from the run.
- **Fallbacks are visible.** A configured default that cannot be used is skipped, and a note names the agent, the default, the reason and what it runs on instead.
  - The note appears in the `delegate_task` result (`launch_notes`), in the `send_message_to` bring-in result and in Settings.
  - When no layer is usable, the delegation fails as before and nothing is added.
- **Recorded values.** Copies and collaborators keep the values and source they started with, through restore, extra copies and teammate delegation. Older runs restore unchanged and show "Source not recorded". No migration is needed.
- **Launch forms.** New chat for a Team, mobile run setup and the Org launch page seed each member (and each Org placed team) from its own usable default.
  - Changing the main model does not move seeded members.
  - Resetting a member's model or row, or Reset all, makes it follow the main settings again.
  - An unusable default shows a note on the row.
- **Settings.** A read-only section, "Collaborators and delegated copies", lists each collaborator and open copy and its agents, with runtime, model, source and any note.
- **Unchanged:** single-agent start, delegation to a configured member, and application launch baselines (DEC-006).
- **Docs:** six server module docs, three web docs and `TESTING.md` (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-002 Pass |
| Code review | CRR-001 Fail (CR-001, dead code); CRR-002 Pass, 9.3/10 |
| API/E2E | API-REV-003 Pass, 96% (round 3: all browser-probe cases on the real UI). API-REV-002 Pass, 95%. AC-001..AC-014 proven directly. The AC-015 setup was also run with real Claude, Codex and native runtimes in a packaged isolated app (ISO-001) |
| Test-code review | CRR-003 Fail (TR-001); CRR-004 Pass; CRR-005 Pass (round-3 probe) |
| Delivery checks after the merge (`c421f5b86`) | • `autobyteus-ts` build, server prebuild, typecheck and build: pass.<br>• Server unit: 671 files, 5265 passed, 7 skipped. The count fell from 5277 because the base removed the remote-provider tests.<br>• Ticket server E2E (scripted AGY, clean env): 3/3.<br>• Contracts: 11/11 and 24/24.<br>• Web `test:nuxt`: 605 files, 4199 passed, 3 skipped.<br>• Web guards: 3/3.<br>• Licensing and path hygiene: pass.<br>• Logs: `delivery-evidence/dr-001/` |

## How To Verify (AC-015)

This uses a disposable app built from this worktree, with its own data. It does not touch your own app.

1. Start it:

   ```bash
   cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults
   pnpm --silent isolated-app start --build
   ```

2. Add your provider keys if the PM's runtime needs any. The output gives `instanceId` and `databaseUrl`:

   ```bash
   script -q /dev/null pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url "<databaseUrl>"
   pnpm --silent isolated-app restart <instanceId>
   ```

3. Add the agent package. I made a disposable copy of `autobyteus-agents` at `/tmp/dlcd-ac015-agents`. Add that path as a local package in **Settings → Agent Packages**. Editing defaults there does not change your real `autobyteus-agents` repository.
4. In **Agent Teams → Software Engineering Team**, set the default runtime/model of **implementation-engineer** and **code-reviewer** to **Codex / Sol 6.1**. Leave the other members without a default.
5. Start **Project Task Manager** on a different runtime/model (for example Claude). Ask it to delegate a small Task to the Software Engineering Team.
6. Check:
   - The run's **Settings** shows "Collaborators and delegated copies". Implementation-engineer and code-reviewer show Codex / Sol 6.1 with "Agent default". The other members show the PM's runtime/model with "Inherited from the run".
   - When the implementation-engineer or code-reviewer starts work, it runs on Codex.
   - Optional fallback check: give one member a default that cannot be used, for example a model Codex does not offer. That member runs on the PM's runtime/model. The `delegate_task` result in Activity shows a `launch_notes` line, and Settings shows the note.
   - Optional: **Run** the Software Engineering Team from Agent Teams. The member drawer shows the two seeded members as customized with Codex / Sol 6.1.
7. Stop it: `pnpm --silent isolated-app stop <instanceId>`.

## Decisions Needed At Verification

1. **Release:** finalize only (merge to `personal`), a beta (next: `v1.5.2-beta.3`), or a stable release? The last tags are `v1.5.2-beta.2` and stable `v1.5.1`.
2. **`RELEASE.md` correction:** it says "Never commit build output: `*/dist/`", but the three contract packages track their `dist/`. Should I add the same exception as in `TESTING.md` (a separate `docs(release)` commit)?
3. **Follow-up candidates.** These go to the Solution Designer unless you decide otherwise:
   - DEC-006: align the order of application launch baselines.
   - O-1: the note appears only inside the collapsed raw `delegate_task` result.
   - O-2: Settings repeats a team-level note on each member.
   - O-3: Settings shows raw address names.
   - "As configured in this run" is shown for copies without a recorded source.
   - Two web files are near the 500-line limit.

## Residual Risks

- UNK-001 (out of scope): an installed but signed-out Codex or Claude passes the checks and fails at the agent's first turn.
- Settings for a saved Team or Org run shows a copy started while Settings is open only after a refresh.
- The redundant stale-seed guards in mobile setup are not tested individually.
