# API-REV-002 Real Browser / Codex / Restart Transcript

## Execution identity

- Artifact HEAD: `895665929213ddf7c276c9a89af19b975935f128`
- Reviewed source: `035f7a30217d65bace023dc7c506e47d61742b07`
- Browser: AutoByteus persistent Chromium operated through `open_tab`
- Production renderer: Nuxt static production output at `http://127.0.0.1:3427`
- Built backend: `node dist/app.js --host 127.0.0.1 --port 8427 --data-dir <API-REV-002/live/server-data>`
- Provider: real Codex App Server, `gpt-5.6-sol`, reasoning `low`, auto-approve enabled
- State: isolated SQLite/memory/package registry/temp workspace beneath `API-REV-002/live/server-data`
- Fixture: UI-imported `api-e2e-fixtures/aorg-api-rev-002-agent-package`
- Desktop viewport plus CDP-emulated `390x844` narrow viewport
- Runtime markers used the `-002` suffix rather than the manifest's planning-time `-001` suffix so this rerun is unambiguous; scenario semantics were unchanged.

`setup-isolation-note.md` records two discarded startup-only attempts. No browser
step was run until the isolated PID 4410 was ready.

## Package import and definition inspection (`PKG-001`–`PKG-005`)

1. Opened Settings in the production browser and imported the fixture directory
   through the visible filesystem import action.
2. The success UI exposed four Agents and two flat AgentTeams; the two AgentOrg
   definitions were available under Agent Orgs.
3. Opened an Agent detail. The tool list visibly included both
   `submit_task_result` and `review_task_result`; this corrects the invalid
   API-REV-001 fixture and directly answers the user's configuration question.
4. Opened Team detail. It showed three direct Agents, one coordinator, and
   ordered handoffs with no nested configured Team.
5. `PACKAGE.sha256` passed before and after execution; the imported source tree
   was not mutated.

Evidence: `PKG-002-import-success.png`, `PKG-005-agent-task-tools.png`,
`package-contract-validation*.log`.

## Standalone AgentTeam (`TEAM-001`–`TEAM-007`)

Root TeamRun:
`aorg_e2e_research_squad_406e38c2bf72449ea5685e1489282463`

1. Ran the standalone Team from its real detail/configuration flow. The browser
   opened the coordinator-led accepted Team workspace.
2. `/lead` returned `AORG-TEAM-LEAD-002`.
3. The live Agent called `get_handoff_rules` and `send_message_to` for
   `/analyst`. The analyst received the exact delivery and returned
   `AORG-TEAM-MSG-002` / `Delivery acknowledged.`
4. Delegated a formal task to `/analyst`:
   - task `task_cbd139cb628e49cdb38a5e95c5826cd8`
   - fresh AgentRun `aorg_e2e_analyst_647ecebd7ced43fdbc02ff40a4cbf9ed`
   - initial `submit_task_result` succeeded with
     `AORG-TEAM-TASK-DRAFT-002`
   - lead `review_task_result(request_revision)` succeeded
   - revision notification arrived after approximately 5m08s
   - the assignee began a second `submit_task_result` with
     `AORG-TEAM-TASK-REVISED-002`, but no tool result or second submission was
     persisted before shutdown more than one minute later.
5. A separate formal acceptance path succeeded:
   - task `task_c455f19c67fe4a9582d49019a4f822c4`
   - fresh verifier `aorg_e2e_verifier_e8de47b91a8243b2ab2ecea5c39552f6`
   - submitted `AORG-TEAM-TASK-ACCEPT-002`
   - lead accepted; the durable record is `accepted` and execution settled.
6. SIGINT while the revised submit remained unresolved stopped the process but
   returned exit 1 with `General process run supervisor close failed`.
7. After same-data restart, the still-owned Team was explicitly restored by
   root ID. Reopen correctly normalized unsupported live task recovery: the
   unfinished revision task became `interrupted` with the stated restart
   reason; the accepted task remained accepted. Historical conversation and
   task rows were visible, and `/lead` continued with
   `AORG-TEAM-AFTER-RESTORE-002` and `AORG-TEAM-LEAD-002`.
8. After a normal Team stop, entering a new prompt in the inactive Team surface
   performed the lazy restore but lost that triggering prompt:
   `AORG-TEAM-UI-LAZY-RESTORE-002` is absent from every durable Team trace.
   Immediate retry after the Team became active succeeded and persisted
   `AORG-TEAM-UI-AFTER-LAZY-RESTORE-002`.
9. Stopped the Team normally again before cleanup.

Results: ordinary conversation/message, fresh task identity, initial submission,
acceptance, restart/history, and retry pass. Revision resubmission/shutdown fail
(`API-FIND-008`). Inactive lazy restore drops the first input
(`API-FIND-009`).

Evidence: `TEAM-002-tasks-review-accept.png`,
`TEAM-RESTORE-002-history-task-checkpoint.png`,
`revision-task-trace-excerpt.log`, `revision-reactivation-evidence.log`,
`revision-resubmission-timeout-evidence.md`, `shutdown-error-excerpt.log`,
`team-lazy-restore-first-message-evidence.log`, and same-data Team packages.

## Direct-Agent AgentOrg restore (`ORG-001`–`ORG-003`, `RESTORE-001`–`RESTORE-004`)

Root OrgRun:
`aorg_e2e_direct_agents_org_71932050c9304dd58bdd7fdb06622ef2`

1. Ran the Org from configuration using Codex/GPT-5.6-Sol and the isolated temp
   workspace. Full scope launched with no initial focus; exact sidebar focus was
   required before recipient messaging.
2. Focused `/lead` and obtained `AORG-DIRECT-LEAD-BEFORE-RESTORE-002`.
   `/verifier` remained system-instruction-only.
3. Captured `direct-org-tree-pre-restart.json`, then stopped the server and
   restarted it against the same isolated data.
4. Used the required browser path: Agent Orgs -> Run -> Refresh history ->
   expanded workspace/Org -> inactive row -> **Restore**. Restore succeeded and
   published the complete Org.
5. Compared the strict Org V1 trees:
   - `/lead` stable logical AgentRun and provider ID retained exactly:
     `01a05e8e-a282-7b60-b055-f1019baf036d`
   - `/verifier` stable logical AgentRun retained, while its system-only provider
     binding durably changed from
     `01a05e8e-a2df-7663-8db9-db68f443c724` to
     `01a05e91-caa4-76c0-9852-d9f694288970`
   - both members were active only after the complete restored tree existed.
6. `/lead` retained the prior conversation and continued with
   `AORG-DIRECT-LEAD-AFTER-RESTORE-002`; the rebound verifier responded with
   `AORG-DIRECT-VERIFIER-AFTER-RESTORE-002`.
7. Stop Org later returned the whole direct Org to inactive/offline state.

Result: Pass. This directly closes prior `API-FIND-005`/`CR-FIND-009` and proves
conversation-preserving identity reuse plus durable replacement for the retained
system-instruction-only member.

Evidence: `RESTORE-001-inactive-row-after-restart.png`,
`RESTORE-002-conversation-continuity.png`, `direct-org-tree-pre-restart.json`,
`direct-org-tree-after-restore.json`.

## Mixed AgentOrg, mounted Team task, and status (`ORG-004`–`ORG-010`, `STATUS-001`–`STATUS-003`)

Root OrgRun:
`aorg_e2e_mixed_org_b38932216a9846059d16a80b8a622b60`

1. Full scope launched with null focus. The history tree contained exact sibling
   `/concierge`, `/research-team`, and `/support-team` placements. Clicking a
   mounted Team expanded it and focused its coordinator
   `/research-team/lead`.
2. The mounted Team row exposed an accessible aggregate such as
   `research team. Team status: Idle`, including while collapsed.
3. From `/concierge`, called `delegate_task` for `/research-team`:
   - task `task_7f673f3a838e469bb6c813025f6d11ef`
   - fresh task TeamRun `aorg_research_squad_249a22c3e42c489d8226f8a320eb5490`
   - fresh task-Team coordinator submitted `AORG-ORG-TASK-TEAM-002`
   - an intentionally early review failed closed as `not awaiting review`
   - after submission, the exact delegator accepted it
   - Org task sidecar persisted status `accepted`; task Team tree settled.
4. While `/research-team/lead` executed `run_bash sleep 15`, the expanded Team
   aggregate read Running and the exact Agent read running. Collapsing the Team
   preserved `Team status: Running`. After the response
   `AORG-MIXED-TEAM-LEAD-002`, the aggregate returned to Idle.
5. Stop Org made configured mounted Teams, their Agents, and historical task
   descendants Offline. The row correctly retained only Org-level Restore; no
   mounted-Team lifecycle action appeared.
6. Failure: after normal Stop Org, the selected Org URL/main pane remained
   `Connecting to Agent Org...` even though the history row was inactive with
   Restore and the server rejected the former active root as not found. The
   active route/context did not settle to the accepted inactive presentation
   (`API-FIND-010`).

Result: mounted-Team delegation/submit/accept, status aggregation, collapsed
visibility, exact focus, and whole-root stop pass. Terminal stopped-context UI
fails.

Evidence: `org-task-team-records.json`,
`ORG-TASK-TEAM-002-accepted-settled.png`,
`STATUS-001-mixed-org-no-focus-collapsed-team-status.png`,
`STATUS-002-collapsed-team-running.png`,
`STATUS-003-stopped-org-team-offline.png`.

## Two-family history, persistence, stream, and release (`API-001/002`, `PERSIST-001`)

1. Real `listCollaborationRootHistory` returned explicit `root_subject_kind` for
   native `agent_team` and `agent_org` roots after package admission.
2. Org and Team data remained in their strict separate memory families; direct
   Org tree, Org task sidecar, Team task records, and raw Agent traces agree on
   root/member/task identity.
3. On first restart the Team with unresolved live work was not generically
   listed as reopenable. Direct `restoreAgentTeamRun` by exact ID succeeded,
   normalized the unsupported live task, and then made the Team visible in
   generic history.
4. Final history lists all three roots inactive. Final clean SIGINT after roots
   were inactive exited 0; no owned socket, provider process, or tab remained.

Evidence: `graphql-history-after-restart.json`,
`graphql-team-restore-after-failed-shutdown.json`,
`graphql-history-after-team-restore.json`, `final-history-active-state.json`,
`cleanup-verification.log`.

## Narrow browser (`UI-001/002`)

1. Applied `390x844` Chromium device metrics to the same real `open_tab` tab.
2. Team workspace, AgentOrg catalog, and active Org rendered without document or
   body horizontal overflow.
3. CRR-012 correction: the test inspected the focused-member header and the
   `New Agent` plus control while the transient left drawer was closed. It did
   not activate the visible accessible primary-navigation strip, which is the
   approved collapsed-navigation opener and should expose
   `AgentOrgRunHistoryPanel` inside the drawer. Therefore zero treeitems in the
   closed state does not establish a UI defect.
4. Corrected result for exact narrow member/Team switching: `Not Tested`. A
   permitted rerun must use strip -> drawer -> Org tree -> exact different
   Agent/Team focus. No dedicated member picker is expected or requested.
5. Restored desktop metrics before final stop/cleanup.

Evidence: `NARROW-TEAM-390x844.png`, `NARROW-ORG-CATALOG-390x844.png`,
`NARROW-ORG-ACTIVE-390x844.png`, semantic DOM snapshots recorded during the run.

## Cleanup

- Stopped Team and Org roots; final history reports every root inactive.
- Final backend SIGINT exited cleanly; stopped static web server.
- Ports 8427/3427 have no listeners; recorded PIDs 4136/4237 are absent.
- Closed both owned tabs; `list_tabs` returned an empty list.
- Revalidated every fixture checksum after the run.
- Retained only ticket evidence and isolated data for audit.

Evidence: `cleanup-verification.log`, `package-contract-validation-post-run.log`.
