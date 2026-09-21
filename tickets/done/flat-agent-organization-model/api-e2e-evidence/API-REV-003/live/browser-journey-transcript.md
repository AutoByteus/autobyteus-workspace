# API-REV-003 real-user browser and lifecycle transcript

## Environment

- Tested product source: implementation `3e38be96596432df8e3f459056d908786b5371bd`
  at then-current reviewed artifact `73a2c06eb14e3c5a7d91322aae7f42dbc4de0e0a`.
- Backend: production build on `127.0.0.1:8437`, isolated `live/server-data`.
- Renderer: production-built Nuxt static output on `127.0.0.1:3437`.
- Browser: AutoByteus persistent Chromium `open_tab`, Chromium 149.
- Provider: real Codex App Server, `gpt-5.6-sol`, reasoning `low`.
- Fixture: UI-imported `api-e2e-fixtures/aorg-api-rev-002-agent-package`;
  four Agents, two flat Teams, two Orgs, explicit `submit_task_result` and
  `review_task_result` tools. Pre/post SHA-256 verification passed.

## Setup correction

The first renderer build retained shared-backend `NUXT_PUBLIC_*` variables.
Performance-resource inspection caught the mismatch before any run. The one
fixture import was removed through the UI, the renderer was rebuilt for port
8437, and all authoritative execution below used the isolated backend/data.
See `setup-isolation-note.md`.

## Package and standalone Team

1. Settings -> Import Package accepted the fixture. Agent details visibly
   exposed the explicit task lifecycle tools.
   Evidence: `screenshots/PKG-IMPORT-SUCCESS.png`,
   `screenshots/PKG-AGENT-TOOLS.png`.
2. Launched `AORG E2E Research Squad` with temporary workspace and real Codex.
   First prompt returned:
   - `AORG-TEAM-FIRST-003`
   - `Team first prompt admitted.`
   Evidence: `screenshots/TEAM-FIRST-PROMPT.png`.
3. Coordinator sent an ordinary message to `/analyst`; the analyst received it
   and returned `AORG-TEAM-MESSAGE-003 / Delivery acknowledged.` The Messages
   surface showed one delivered message.
   Evidence: `screenshots/TEAM-MESSAGE-DELIVERY.png`.
4. The first task attempt was approval-gated because this run did not enable
   automatic tool execution; it was stopped and excluded as run-mode noise.
5. With automatic tool execution enabled, formal task
   `task_fb9ec...` submitted and was accepted. A second supported task
   `task_128c82416bd54b49ba7ab14099ec60ee` submitted
   `AORG-TEAM-TASK-INITIAL-C-003 / Initial C.`, received a revision request,
   resubmitted on the same task as
   `AORG-TEAM-TASK-REVISED-C-003 / Revised C.`, and was accepted.
   Evidence: `screenshots/TEAM-TASK-REVISION-ACCEPTED.png` and
   `persistence/team/`.
6. Critical IR-012 recheck: after stopping the Team, one unique first prompt
   `AORG-TEAM-INACTIVE-FIRST-003` was sent once from the inactive surface. The
   response was `Inactive Team first prompt admitted.` No manual retry was
   needed. Evidence: `screenshots/TEAM-INACTIVE-FIRST-PROMPT.png`.

## Mixed AgentOrg

1. Launched run
   `aorg_e2e_mixed_org_0d35518a8b204de69d9e5892d769f4d7` with no initial
   focus. The accepted `Choose an Agent or Team` surface rendered, and mounted
   Team rows exposed accessible `Team status: Idle` labels.
   Evidence: `screenshots/ORG-NO-FOCUS-TEAM-STATUS.png`.
2. Direct `/concierge` focus returned
   `AORG-ORG-CONCIERGE-003 / Direct Agent conversation works.`
3. Focusing `/research-team` entered through its coordinator and returned
   `AORG-ORG-TEAM-LEAD-003 / Mounted Team conversation works.`
4. Focusing `/research-team/analyst` returned
   `AORG-ORG-NESTED-ANALYST-003 / Nested Agent focus works.`
5. Two initial ordinary-message attempts used invalid `/analyst` and failed
   closed. After retrieving the exact handoff rules, the lead used
   `/research-team/analyst`; the analyst received it and returned
   `AORG-ORG-TEAM-MESSAGE-003 / Mounted message delivered.` This is a harness
   address correction, not a product finding.
6. Supported mounted-Team task
   `task_a74ec579d8d34fb58ca5788856b5486b` submitted
   `AORG-ORG-TASK-INITIAL-003 / Org initial.`, received a revision request,
   resubmitted `AORG-ORG-TASK-REVISED-003 / Org revised.`, and was accepted.
   The exact durable sidecar records the full sequence.
7. After acceptance, the same legitimate task-assignee provider turn completed
   its required handoff. Settlement then rejected the task AgentRun/member
   identity and fail-stopped root task persistence authority. This is
   `API-FIND-012`; see `failures/API-FIND-012-correlated-observation.md`.
8. Browser hard reload showed the Org inactive. Refresh -> expand workspace ->
   expand Org -> Restore loaded exact prior conversation and accepted task
   history. Continuation returned
   `AORG-ORG-RESTORED-RESUME-003 / Restored conversation resumed.`
   Evidence: `screenshots/ORG-RESTORE-TASK-HISTORY.png`.

## Corrected narrow interaction and Stop Org

1. Chromium device metrics were set to exactly `390x844`; DOM measurements
   were `innerWidth=390`, `innerHeight=844`, `scrollWidth=390`.
2. The visible primary navigation strip's Agent Orgs button opened the transient
   left drawer. Through drawer -> Org tree, selected direct `/concierge`,
   mounted `/research-team`, and nested `/research-team/verifier`. Header and
   composer changed to each exact target. This passes the CR-FIND-014 corrected
   interaction; no dedicated member picker is required.
   Evidence: `screenshots/NARROW-ORG-DRAWER-VERIFIER-390x844.png` and
   `screenshots/NARROW-ORG-VERIFIER-FOCUS-390x844.png`.
3. Stop on the active Org history root changed the route to configuration,
   removed the active run ID, rendered no Connecting/Reconnect surface, and
   retained `scrollWidth=390`. This passes the former API-FIND-010 recheck.
   Evidence: `screenshots/NARROW-STOP-ORG-CONFIGURATION-390x844.png`.

## Real process restart, history, restore, and continuation

1. Sent application-owned `SIGTERM` to the original backend Node process. It
   logged `Received SIGTERM` and `Server closed cleanly`, then restarted on the
   exact same data root.
2. Refresh -> inactive Org row -> Restore succeeded. Exact prior conversation
   and accepted task history rendered. The continued prompt returned
   `AORG-ORG-PROCESS-RESTART-003 / Process restart continuation works.`
   Evidence: `screenshots/NARROW-ORG-PROCESS-RESTART-TASKS-390x844.png`.
3. The two standalone Team V2 directories and Team history index entries were
   still durable. Generic collaboration history returned both Team root IDs.
   However, the refreshed user workspace history returned
   `teamDefinitions: []`, rendered `No task history in this workspace.`, and
   exposed no Team row to Restore. Therefore Team history/tasks/conversation
   could not be loaded or continued through the supported user surface after
   restart. This is `API-FIND-013`; see
   `failures/API-FIND-013-team-history-after-restart.md`.
4. Stopped the restored Org again. Before final shutdown, generic history
   reported all roots inactive. Final real `SIGTERM` exited cleanly.

## Cleanup

- Closed browser tab 5.
- Stopped backend and static renderer; ports 8437/3437 and owned processes are
  absent.
- Removed generated build output; retained only isolated data/evidence.
- Shared package registry/config contains no fixture reference.
- Post-run fixture hashes passed.

Evidence: `cleanup-verification.log` and
`repository/package-contract-validation-post-run.log`.
