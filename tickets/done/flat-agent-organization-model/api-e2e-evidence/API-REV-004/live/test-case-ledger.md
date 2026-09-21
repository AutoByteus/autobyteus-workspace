# API-REV-004 Live Test-Case Ledger

Updated immediately after each real-system test case. This file is the restart-safe execution memory for the cumulative browser/API/lifecycle run.

## Environment identity

- Artifact HEAD: `b19c41e68c119f9a9590c5b04839454dae5f64b8`
- Backend: built `autobyteus-server-ts/dist/app.js`, isolated data directory under this evidence tree, `env -i` launch to prevent inherited production DB/package-root overrides.
- Frontend: production static `autobyteus-web/dist/public`, browser through AutoByteus `open_tab`/page tools.
- Runtime/model: Codex App Server / `gpt-5.6-sol`, low reasoning, automatic tool approval, isolated Temp Workspace.
- Fixture package: `api-e2e-fixtures/aorg-api-rev-002-agent-package`, imported through Settings > Agent Packages UI; 4 Agents, 2 flat Teams, 2 Orgs; explicit `submit_task_result` and `review_task_result` access.

## Completed cases

### LIVE-001 — Real package import and registry reload — PASS

- Imported the owned fixture through the production Settings > Agent Packages browser UI.
- The catalog exposed the four fixture Agents and both Team definitions.
- Backend cache reload recorded 54 Agents / 2 current Team definitions.
- Evidence: `screenshots/PKG-UI-IMPORT-CORRECTED.png`, `backend-initial.log`, isolated `.env`.

### LIVE-002 — Standalone Team fresh start, first prompt, message, and full task lifecycle — PASS

- Started `AORG E2E Research Squad` from production UI.
- TeamRun: `aorg_e2e_research_squad_f31d9af7d57f48088bb3f6b6e4e4e709`.
- First prompt returned exact marker `AORG4C-TEAM-FIRST-001`.
- Ordinary message used exact marker `AORG4C-TEAM-MESSAGE-001`.
- Task `task_f9da5f6543574dcbb1dbe5f48b2c194`: submitted `AORG4C-TEAM-TASK-INITIAL-001`, revision requested, same task resubmitted with `AORG4C-TEAM-TASK-REVISED-001`, then accepted.
- Final response preserved exact task ID, revised marker, and accepted status.
- Evidence: `screenshots/TEAM-FRESH-LIFECYCLE-CORRECTED.png` and persisted Team history beneath `server-data/memory`.

### LIVE-003 — AgentOrg fresh start, identities, ordinary mounted-Team routing, full mounted task lifecycle — PASS

- Configuration-first launch produced OrgRun `aorg_e2e_mixed_org_773e984c322c42b7bcb27e6234b54f28`.
- Verified no implicit focus; root owns Stop Agent Org; no public Reconnect and no mounted-Team Stop control.
- Exact durable member identities were assigned for direct Agent, both mounted Teams, and all Team members.
- Collapsed aggregate status was exposed as `research team. Team status: Idle` and `support team. Team status: Idle`.
- Ordinary message `AORG4C-ORG-TEAM-MESSAGE-001` routed to `/research-team` and rendered in its coordinator conversation.
- Mounted task `task_89edbace8d704e8d9d2a0096cbf4099b` assigned to `/research-team/analyst`: initial submission `AORG4C-ORG-MOUNTED-TASK-INITIAL-001`, one revision, same-task revised submission `AORG4C-ORG-MOUNTED-TASK-REVISED-001`, accepted.
- Concierge returned exact marker `AORG4C-ORG-CONCIERGE-001`, task ID, revised marker, and accepted status.
- Durable sidecar contains four exact lifecycle updates and `accepted`; Org tree retains `settledAt=2026-09-02T07:05:56.888Z`.
- Evidence: `screenshots/ORG-MOUNTED-TASK-CORRECTED.png`, `persistence/org-task-record-before-restart.json`, `persistence/org-tree-before-restart.json`.

### LIVE-004 — Pre-shutdown two-family GraphQL/history snapshot — PASS

- One real GraphQL response returned the active AgentOrg and standalone AgentTeam families together.
- Exact Org/Team/member run IDs, mounted addresses, runtime/model configuration, active states, task execution identity, and settled timestamp matched the UI-created runs.
- Evidence: `api/pre-shutdown-request.json`, `api/pre-shutdown-response.json`.

### LIVE-005 — Corrected 390x844 strip -> transient drawer -> Org tree focus — PASS

- CDP emulation confirmed `innerWidth=390`, `innerHeight=844`, and document `scrollWidth=390` (no horizontal overflow).
- The visible collapsed primary-nav strip contained the approved Agent Orgs opener.
- Clicking that strip button opened the transient navigation drawer containing the live AgentOrg history tree.
- Drawer showed direct Agent, mounted Team rows with aggregate Idle statuses, configured nested members, and historical task row.
- Expanded `research team`, then selected `/research-team/analyst`; header changed to `analyst`. Selected `/concierge`; header changed to `concierge - 7D65`.
- Evidence: `process/cdp-narrow-390x844.log`, `screenshots/NARROW-ORG-DRAWER-390x844.png`, `screenshots/NARROW-ORG-ANALYST-FOCUS-390x844.png`, `screenshots/NARROW-ORG-CONCIERGE-FOCUS-390x844.png`.

### LIVE-006 — Graceful shutdown with active standalone Team and AgentOrg — PASS

- Sent direct application-owned SIGTERM to backend PID 61855.
- Backend logged `Received SIGTERM` and `Server closed cleanly` in under one second.
- No AggregateError or owned child remained under the stopped server PID.
- Evidence: `graceful-shutdown-1.log`, `backend-initial.log`.

### LIVE-007 — Isolated restart, migration/startup, first mixed inactive history query — PASS

- Restarted with `env -i` and the exact prior isolated data directory; Prisma reported 24 migrations and no pending migration.
- Startup loaded the same isolated database and cache populations of 54 Agents / 2 Teams.
- Before opening a new browser tab, GraphQL returned both retained root families together as inactive.
- Standalone Team members were all `offline`; Org retained exact mounted Team/member identities and settled task identity/timestamp.
- Evidence: `backend-restart.log`, `api/first-post-restart-mixed-history-request.json`, `api/first-post-restart-mixed-history-response.json`.


### LIVE-008 — Standalone Team inactive-history selection and exact first continuation after restart — PASS

- The first post-restart API snapshot had already established this exact TeamRun inactive with all configured members Offline.
- Through the real browser history tree, expanded Temp Workspace -> Teams -> `AORG E2E Research Squad` -> retained run and loaded its prior conversation, ordinary message, task submission/revision/resubmission/acceptance activity.
- Sent the first continuation after restart to the retained `/lead`: `Return exactly AORG4C-TEAM-RESUME-001 on the first line and a five-word acknowledgement on the second.`
- The retained coordinator responded exactly `AORG4C-TEAM-RESUME-001` followed by the five-word acknowledgement `Acknowledged, resuming the team validation.`
- Post-continuation GraphQL shows the same TeamRun ID active while the AgentOrg remains inactive; no duplicate TeamRun was created.
- Evidence: `screenshots/TEAM-POST-RESTART-CONTINUATION.png`, `api/post-team-continuation-request.json`, `api/post-team-continuation-response.json`, `backend-restart.log`.


### LIVE-009 — AgentOrg stopped history, selection-driven restore, focus, identity, persistence, continuation — PASS

- Opened the exact inactive OrgRun in `mode=history`; center rendered the terminal `Stopped Agent Org` state and instructed selection of a historical member to continue.
- Historical tree showed direct Agent Offline, both mounted Teams with aggregate Offline statuses, and settled task Agent `aorg_e2e_analyst_c3fbe579693345a98cf04485b42eb88d` as Offline. It exposed neither Stop Agent Org nor Reconnect nor an obsolete standalone Restore button.
- Selecting historical `/concierge` invoked the supported selection-driven whole-Org restore. The route changed to the same OrgRun in active mode and the concierge header became live.
- The same OrgRun became active as a complete Org. Direct `/concierge`, mounted `/research-team` coordinator, nested `/research-team/verifier`, and the historical settled task row were all rendered with exact contextual identities; no mounted-Team lifecycle control appeared.
- Provider identity comparison: the real-conversation `/concierge` and `/research-team/lead` retained their exact pre-shutdown provider IDs; system-instruction-only configured members retained AgentRun IDs and acquired different new provider IDs. The settled historical task retained its original identity and `settledAt`.
- The task sidecar before/after restore is byte-identical (`fc1669...` both) and still contains one task, two submissions, one revision, one acceptance, status `accepted`.
- Prior conversation/task activity rendered, including both mounted-task markers and the accepted notification.
- Sent `AORG4C-ORG-RESUME-001` to restored `/concierge`; it returned the exact marker and five-word acknowledgement `Acknowledged and ready to resume.`
- Evidence: `screenshots/ORG-STOPPED-HISTORY-OFFLINE.png`, `screenshots/ORG-POST-RESTART-RESTORE-CONTINUATION.png`, `api/post-org-restore-request.json`, `api/post-org-restore-response.json`, `persistence/provider-identity-restore-comparison.txt`, `persistence/org-restore-hashes.txt`, `persistence/org-task-record-after-restore.json`, `persistence/org-tree-after-restore.json`.


### LIVE-010 — Explicit Stop Agent Org terminal presentation and root isolation — PASS

- From the restored active Org, clicked the sole root `Stop Agent Org` control in the history row.
- The stop completed immediately and routed to the exact Org configuration surface: `rootSubjectKind=agent_org&definitionId=aorg-mixed-org&mode=configuration`; no transient `Connecting` state and no public Reconnect/Restore control appeared.
- The retained history run changed to the gray Stopped indicator. Direct Agent, all mounted-Team configured members, both Team aggregate rows, and historical task Agent all rendered Offline.
- Post-stop GraphQL shows the exact OrgRun inactive while the independently resumed standalone TeamRun remains active, proving whole-Org stop did not terminate the separate Team family.
- Evidence: `screenshots/ORG-EXPLICIT-STOP-TERMINAL-CONFIGURATION.png`, `api/post-explicit-stop-request.json`, `api/post-explicit-stop-response.json`, `backend-restart.log`.


### LIVE-011 — Valid-server-error bounded automatic recovery/exhaustion/clear authority — PASS

- Re-executed the exact production AgentOrg streaming-service boundary: `corepack pnpm test:nuxt services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts`.
- All 13/13 deterministic tests passed. Direct cases prove that a valid server ERROR remains private while checkpointed automatic recovery is available; repeated current-generation errors perform the bounded retry sequence; only exhaustion publishes one error; a later complete verified snapshot clears it.
- The same cohort also proves established-stream close recovery/focus preservation, strict pre-CONNECTED snapshot ordering, fresh task activation hydration, exact command ACK ownership, retired-socket frame isolation, and context-release fences against late hydration/reconnect.
- Across real fresh, stopped-history, restored, and explicitly stopped browser surfaces, no public `Reconnect` control appeared. This aligns the real UI with the private automatic recovery authority rather than manufacturing an unsafe live ERROR trigger.
- Evidence: `repository/web-stream-recovery-exact.log`, prior real screenshots and DOM assertions in LIVE-003/LIVE-009/LIVE-010.


### LIVE-012 — Final source immutability, persistence, graceful shutdown, and cleanup — PASS

- Revalidated all 18 fixture-package checksums after UI import, Team/Org execution, restart, restore, continuation, and explicit stop: 18/18 `OK`; source fixture was not mutated.
- Working-tree boundary audit found no API/E2E production-source edits; the only tracked API-owned changes are the five durable integration-test files. Generated SDK/Brief Studio build outputs remain separately identified.
- Closed the real browser tab, then sent direct application-owned SIGTERM to restarted backend PID 64858 while the standalone Team remained active and the Org was explicitly stopped.
- Ordered runtime shutdown completed in about 240 ms with `Server closed cleanly`, no AggregateError, and no owned child under the stopped backend.
- Stopped the owned production static-web process. Ports 8457 and 3457 are closed and AutoByteus reports zero persistent browser tabs.
- Evidence: `persistence/fixture-source-immutability-check.log`, `persistence/api-e2e-working-tree-boundary.txt`, `graceful-shutdown-final.log`, `backend-restart.log`, `web-cleanup.log`.

## Excluded setup artifacts (not product findings)

- `setup-invalid-inherited-env/`: an earlier environment incorrectly inherited production `DATABASE_URL` and package roots; excluded and rerun with `env -i`.
- `setup-harness-not-product/`: a short detached `nohup` restart was reaped by the command runner and the already-open browser attempted a reconnect during that brief listener. Excluded; the canonical restart uses an owned persistent PTY and performs GraphQL before opening the browser.

## Pending cases

