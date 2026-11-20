# Handoff Summary — standalone-run-messages-565 (autobyteus-565)

## Summary Meta

- Ticket: `standalone-run-messages-565` (Project Task `autobyteus-565`): every standalone agent run gets a Messages list.
- Date: `2026-11-20`
- Classification: `task_size: Large`, `architectural_risk: High`.
- Route: architecture review (ARCH-REV-001 Fail, ARCH-REV-002 Pass at SR-004) → implementation (IR-001) → source review (CRR-001 Pass, 9.4/10) → API/E2E (API-REV-001 Pass, 95.4%) → test-code review (CRR-002 Pass) → delivery (DR-001).
- Current Status: `Verified from evidence / finalized on personal; no release` (the commits are in `release-deployment-report.md`).
- Branch: `codex/standalone-run-messages-565`, base `origin/personal` @ `a728fbcad3`; the delivery refresh merged `origin/personal` @ `ca4317a386` as `09e8c7270c` (65 commits, no conflicts). Code commits `56e39312b0` (pins), `ffec4d785d` (implementation), `143edb93f8` (integration test); tests `bae91e808f`.

## Delivery Summary

- **Messages for every agent run.** A run that has a collaboration view (every run but an application-owned one) lists every message its own agent sent or received: with its task agents and teams (open or closed Task), other runs on this node, and runs on other nodes. On the desktop it is the right panel's **Messages** tab, on the phone **Messages** in the ⋮ menu. Live messages appear without a reload.
- **Naming the other agent.** The row shows the other agent's address (for example `project task manager`); an agent on another node also carries a chip with this node's name for that node. A message's log line now records the other agent (`counterpart: {address, nodeId}`), so a reload still names it. Older lines are named from a linked run's Task entry, else the run's own file, else the run ID with no chip.
- **Paging.** The participant read returns the newest 50, then 50 older ones per **Load more** (`before` cursor, `hasMore`). A reload brings the list back to its newest page; a live message during Load more appears once.
- **One view rule.** `MessageViewScope` decides which views show a message, for the live feed and the stored read. An unrelated or cross-node message is in the view of an Agent run that is one of its two runs and in no Team, Org or ancestor view. Team and Org lists keep their rows (AC-005). This replaces 492's `publishToViews: false`.
- **Two message fields cross nodes.** A message request carries `sender: {agentRunId, address}`, its accepted answer `receiverAddress`; both are read strictly.
- **A standalone run opens on Activity.** A run that had delegated used to open on its Team tab; its tab is now Messages and the default Activity, as the design decided. Selecting a run it delegated keeps the chosen tab.
- Removed: `isPublicMessage` (`public-message-scope.ts`), the `publishToViews` flag, "no Messages for a standalone agent".
- Docs: from the code commit `collaboration_model.md`, `agent_communication.md`, `remote_collaboration.md`, web `chat.md`, `agent_execution_architecture.md`, `agent_artifacts.md` (verified by delivery); at delivery `run_history.md`, `remote_access.md`, `workspace_layout.md`, `terminal.md` and one line in `agent_execution_architecture.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery. No user check is needed: every critical acceptance criterion (AC-001 … AC-006) is directly proven, on equivalent data, by API/E2E; the founder's own PM is not a gate (below).
- Key evidence (under `evidence/`):
  - `API-06/API-06-vitest.log` and `API-06-receipt.json`: the two-server suite `Tests 50 passed (50)`. RC-05 `counterparts` on both nodes (beta's line records `/delegator` on alpha's node, alpha's line `/publisher` on beta's node), RC-50 `ownPages [{size: 50, hasMore: true}, {size: 9, hasMore: false}]`, `ownLog 59`, an older unlinked line named by run ID with `address: null`, an older linked line named `/publisher` on `beta-node`, RC-20 `receiverAddress: 34` accepted answers.
  - `API-07/`: the desktop probe SMP-01 … SMP-04 Pass with no browser errors. `SMP-02-first-page.png` shows the Messages tab beside Files, Terminal and Activity, "50+ Messages" and the detail pane.
  - `API-08/`: the phone bundle, MSP-08 Pass: ⋮ items Artifacts, Files, Messages, Activity, Settings; 50 rows, Load more, a remote row with its chip, a plain row without. `MSP-08-standalone-messages-first-page.png`.
  - `API-09/`: large-runs-load-less 5/5 (Team and Org lists unchanged).
  - `API-12/`: fresh-start build; the contracts `dist/` reproduces exactly from a fresh build.
- Integrated state (`evidence/DEL-post-integration/`, merged state `09e8c7270c`): `pnpm install --frozen-lockfile` and `codegen:check` pass (both sides changed `autobyteus-web/package.json` and `generated/graphql.ts`); both typechecks PASS (server `1006 in 315`, web `86 in 36`, each equal to its baseline); the contracts `dist/` unchanged by a rebuild and 39/39 contracts tests; 29 web files / 261 tests of the touched areas; 481 server unit files / 3857 tests of the touched areas plus `tests/architecture`; the server rebuilt and the whole two-server suite `Tests 50 passed (50)`, receipt cleanup `rootRemoved: true, serversStopped: true, leftoverAgy: [], errors: []`.
- Final confidence 95.4%, no category below 95%.
- Secret Gate PASS; artifact hygiene and licensing PASS.

## Residual Risks For The User

- **The founder's own PM** (2,506 messages, `ryan-ai-linux`) was not looked at: his data and nodes, which TESTING.md forbids using. It is his to look at once both of his nodes run this release. The 2,500-message page was measured on a fixture (first page 50 rows in 5.5 to 9.3 ms). Messages stored before this release show the other agent by run ID without a chip when no Task entry or run file names it (DEC-002).
- **Both nodes need this release** (DESIGN.md rule 9). A node on this release refuses a message request from an older peer (no `sender.address`: a malformed request) and reads an older peer's accepted answer (no `receiverAddress`) as a failure, so with an older peer a message may be delivered while its sender is told it failed. No version handling exists, by the rule.
- **Not run:** the large-hub probe's Messages case (L-012: its seed reads a field removed by autobyteus-461, FU-003) and `cross-scope-agent-mentions` (needs a signed-in Claude or Codex runtime). Their edits are the same paging loop that ran in API-06 and API-07.
- **Application-owned runs** have no Messages (no collaboration view exists); proven at unit level only.
- **Environment-bound tests outside the change** fail by time on a loaded machine (FSEvents, close hooks): the same kind as autobyteus-492's FU-005; none reaches code this ticket changed.

## Follow-ups

`follow-ups.md`: FU-001 (a web settings test fails on the base), FU-002 (a folder-watcher unit test times out when the OS delivers no file events), FU-003 (the large-hub probe's seed reads a removed field). Docs sync found none. The Solution Designer sends them. FU-002's file was changed by the base's autobyteus-526 round 2 (the test now drives its own events), so the Solution Designer should check whether FU-002 still stands before sending it.

## Release

- No release. No release was asked for, and RELEASE.md's default is no release. `release-notes.md` holds the user-facing notes for whichever release includes this change.
