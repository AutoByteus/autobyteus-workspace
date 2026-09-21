# API-REV-001 Real Browser Journey Transcript

Execution date: 2026-09-01 UTC  
Browser surface: AutoByteus persistent Chromium `open_tab` against the production Nuxt build  
Backend: isolated built server at `127.0.0.1:8417`  
Frontend: evidence-owned static server at `127.0.0.1:3417`  
Runtime/model: Codex App Server / `gpt-5.6-sol` / reasoning effort `low`


> **Post-run factual correction:** the imported fixture did not contain
> `agent-config.json` or request `submit_task_result` / `review_task_result`.
> Automatic member exposure supplies handoff, message, and delegation tools but
> not submission/review. The task observations below therefore prove fresh task
> run creation and an insufficient fixture; they do **not** prove a production
> submission-tool defect. See `../api/post-run-task-tool-fixture-audit.md`.

## Imported package

- Imported `api-e2e-fixtures/aorg-api-rev-001-agent-package` through **Settings -> Agent Packages -> Import Package**.
- UI reported one package with four shared Agents and two flat Teams; both Orgs were discoverable in the Agent Orgs catalog.
- Before/after package hashes match; `live/package-immutability.diff` is empty.
- Evidence: `screenshots/PKG-003-import-success.png`, `package-before.sha256`, `live/package-after.sha256`.

## Standalone Team

- Definition: `aorg-research-squad`; Team run ID `aorg_e2e_research_squad_8f9556c7431a40c185ad379c0c96d262`.
- Catalog/detail exposed only `/lead`, `/analyst`, and `/verifier`, with `/lead` as coordinator and the exact ordered Team handoffs.
- Real `/lead` conversation returned `AORG-TEAM-LEAD-001` through the accepted event monitor/composer.
- `/lead` called `get_handoff_rules`, then `send_message_to` for `/analyst`; the tool returned target AgentRun `aorg_e2e_analyst_49b640a77c504650a10c03067393b9b0`, and the recipient produced `AORG-TEAM-ANALYST-MSG-001` in its raw conversation trace.
- `/lead` called `delegate_task` for `/analyst`. It created task `task_abe44eb7ebb74ad486de247a1eb84962` and fresh task AgentRun `aorg_e2e_analyst_32efe0faeee0427091dcda5348757149`; the UI showed the transient task Agent and task panel.
- **Invalid formal-lifecycle step (fixture omission):** the task assignee did not expose/call `submit_task_result`. A direct follow-up explicitly required formal submission, but only ordinary assistant text was produced; the record remained active until restart truthfully converted it to `interrupted`.
- Evidence: `screenshots/TEAM-004-task-agent-in-progress.png`, `api/team-task-agent-raw-trace.jsonl`, `api/team-task-records.json`, `api/team-messages.json`, `api/team-execution-tree.json`.

## Mixed AgentOrg

- Definition: `aorg-mixed-org`; Org run ID `aorg_e2e_mixed_org_12d450d507c447fda317be92ff257bcd`.
- Configuration used the required owned workspace and launched the complete Org with no initial focus. Once the history tree was manually expanded, the no-focus workspace asked the user to choose an Agent or Team and exposed no composer/implicit recipient.
- Exact focus results:
  - `/concierge`: `AORG-ORG-CONCIERGE-001` and `direct Org Agent confirmed`.
  - `/research-team`: entered coordinator `/research-team/lead` and returned `AORG-ORG-TEAM-COORD-001` and `mounted Team coordinator confirmed`.
  - `/research-team/analyst`: returned `AORG-ORG-NESTED-ANALYST-001` and `nested Agent focus confirmed`.
- The Agent/Team event monitor, composer, Team message/task tabs, and history-root Stop Org control matched the accepted shared surfaces. No raw `AGENT RUN`, `MEMBER INPUT`, protocol JSON cards, member-level Stop Org, or standalone mounted-Team stop was present.
- `/research-team/lead` delegated to `/research-team/analyst`. The real runtime created task `task_b77b569aeef2410c9eb3b0a723f18f9d` and fresh task AgentRun `aorg_e2e_analyst_d7edab2bdbd846b6a631b8027d988ee1` under the Org package.
- **Invalid formal-lifecycle step (fixture omission):** the fresh Org task assignee searched for `submit_task_result` but could not call it; it returned ordinary text and the strict task record remained `active` with no updates.
- **Usability discrepancy:** on two launches the already-mounted Org history panel remained collapsed because its one-time mount expansion occurred before the new run existed. The user had to manually expand workspace -> Org -> run before an exact member could be focused.
- Evidence: `screenshots/ORG-005-direct-agent-conversation.png`, `api/org-task-agent-raw-trace.jsonl`, `api/org-task-records.json`, `api/org-messages.json`, `api/org-execution-tree.json`.

## API and strict identity

- `listCollaborationRootHistory` returned explicit `AgentTeamRootHistoryObject` / `AgentOrgRootHistoryObject` variants and `root_subject_kind` values with exact Team V2 and Org V1 identities.
- The two-family projection captured Team and Org conversation/activity/message/task data from the real runs.
- A deliberately mismatched Org member-address/AgentRun query failed closed: `AgentRun ... at '/research-team/analyst' was not found in AgentOrg ...`.
- Evidence: `api/list-root-history.response.json`, `api/two-family-projections.response.json`, `api/strict-identity-negative.response.json`.

## Shutdown, restart, history, and restore

- Gracefully stopped the owned backend while Team and Org histories contained real conversations and tasks. Health and the owned listener disappeared; owned Codex children exited.
- The open Org browser context failed closed with: `Live Agent Org updates are out of sync. Reconnect to load a verified complete conversation before sending another message.`
- Restarted the built backend against the same data root. Mixed Team/Org history and packages remained readable.
- Team reopen preserved its conversation, message, task, and identities. A continued prompt returned `AORG-TEAM-RESUME-001` and `The post-restart conversation resumed.` The unsupported live task was explicitly recorded as interrupted rather than silently resumed.
- **Expected fail-closed stale stream:** Reconnect did not reactivate the gracefully stopped Org and returned `Active AgentOrg '<id>' was not found.` A fresh history query correctly reconciled the row inactive. The supported next action is explicit Restore from that refreshed inactive row, not Reconnect.
- Created and ran `aorg-direct-agents-org`, sent a real message to `/lead`, stopped the complete Org, and used its supported Restore action.
- **Failure:** restore prepared the prior lead conversation but failed on the never-messaged `/verifier` provider thread with `Codex app server RPC error -32600: no rollout found for thread id ...`. The UI returned Error 500 and the Org remained inactive, avoiding a partially active root.
- Evidence: `screenshots/RST-002-org-fail-closed.png`, `screenshots/RST-005-team-history-resume-task-interrupted.png`, `screenshots/RST-007-org-restore-provider-failure.png`, `live/restart-failure-excerpts.log`, `live/server-restart.log`.

## Release and cleanup

- Navigating away released Team sessions and file-explorer context. The retained route-release snapshot had closing sockets but no `ESTAB` connection; final cleanup had no listeners, owned backend/static PID, browser tab, or Codex child.
- The imported package remained byte-identical.
- Evidence: `live/context-release-excerpts.log`, `live/post-route-release-sockets.log`, `cleanup/owned-resource-cleanup.log`, `live/package-immutability.diff`.

## Scope stopped after critical failures

Formal task submission/review is critical but was not validly configured; the unsupported automatic-reactivation expectation was corrected after `CRR-009`, while idle-member Org Restore independently failed. After the invalid task step and critical Org failures were retained, the evidence was sufficient for focused origin review, the run did not claim the remaining fresh task-Team/revision-acceptance, every controlled invalid-admission cohort, every nontrivial process migration cohort, or a true `390x844` browser viewport. Durable repository suites cover those boundaries indirectly; they remain explicitly unproven by this live round.
