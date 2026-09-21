# AORG-FLAT-TEAM-001 Corrected API-REV-002 Real-System Test Manifest

This is the corrected executable plan for the next completed
API/E2E result after `API-REV-001`. It preserves the cumulative real Team/Org
scenario IDs while correcting the task-lifecycle tool fixture identified by
`CRR-009` and adding the approved mounted-Team status and strict Restore cases.

## Execution gate

Gate cleared by requirements `RER-021`, architecture `AD-REV-007` /
`ARCH-REV-005`, implementation `IR-011`, and source review `CRR-011 / Pass` at
artifact HEAD `895665929213ddf7c276c9a89af19b975935f128`. Every Agent now
explicitly requests `submit_task_result` and `review_task_result` in
`agent-config.json`; verify those exact tool names in the imported definition
before any formal task assertion.

## Test principles

- Import this package through **Settings -> Agent Packages** with AutoByteus
  `open_tab`; do not seed it directly into the server's package registry.
- Use an isolated real server database/data root and the production-built web
  client. Use Codex App Server with `gpt-5.6-sol`, reasoning `low`.
- Exercise both standalone AgentTeam and AgentOrg behavior. A passing Org run
  cannot substitute for Team compatibility evidence.
- Use the ordinary user surfaces for launch, focus, message, task inspection,
  history, stop, restore, and continued conversation. API/SQLite/filesystem
  inspection supplements the UI; it does not replace it.
- Preserve exact root kind, root ID, AgentRun/TeamRun ID, configured address,
  task identity, command target, and reference-file ownership in evidence.
- Record deterministic markers in the DOM, strict WebSocket/API projection,
  server log, and persisted history where applicable.
- Hash the complete imported package before import and after all runs. Product
  activity must not change a byte in this external read-only package.
- Stop owned processes and close owned tabs. Never stop or mutate an unowned
  server, database, browser tab, package root, or workspace.

## Definition inventory

- Shared Agents: `aorg-lead`, `aorg-analyst`, `aorg-verifier`, `aorg-concierge`
- Flat Teams: `aorg-research-squad`, `aorg-support-pair`
- AgentOrgs: `aorg-mixed-org`, `aorg-direct-agents-org`
- Runtime default: `codex_app_server`
- Model default: `gpt-5.6-sol`, reasoning `low`

### `aorg-research-squad`

- direct Agent placements: `/lead`, `/analyst`, `/verifier`
- exact coordinator: `/lead`
- ordered handoffs: `/lead -> /analyst`, then `/analyst -> /verifier`

### `aorg-support-pair`

- direct Agent placements: `/dispatcher`, `/specialist`
- exact coordinator: `/dispatcher`
- ordered handoff: `/dispatcher -> /specialist`

### `aorg-mixed-org`

- direct Agent: `/concierge`
- Team placements: `/research-team`, `/support-team`
- representative mounted Agent addresses: `/research-team/lead`,
  `/research-team/analyst`, `/support-team/dispatcher`
- no Org coordinator
- ordered Org handoffs: `/concierge -> /research-team`, then
  `/research-team/lead -> /support-team`

### `aorg-direct-agents-org`

- direct Agents: `/lead`, `/verifier`
- no Team placement and no coordinator

## Detailed scenario matrix

### A. Package, admission, catalog, and authoring

| ID | Preconditions / Action | Expected observable result | Required evidence |
| --- | --- | --- | --- |
| `PKG-001` | Parse and validate all four Agents, both Team V2 definitions, and both Org V1 definitions before import. | Exact schemas, references, coordinators, defaults, addresses, and saved handoff order are accepted. | retained parser output and pre-import hashes |
| `PKG-002` | Import the absolute local package through Settings with `open_tab`. | One imported package row appears; 4 shared Agents and 2 Teams are reported; both Orgs become discoverable. | desktop screenshot, DOM text, server log |
| `PKG-003` | Open both Team and both Org details. | Team pages show Agent-only members and exact coordinator; Org pages show direct Agents/Teams, no coordinator, exact addresses and ordered From/To/When. | DOM snapshots/screenshots |
| `PKG-004` | Attempt any available edit/delete path for an imported definition. | Read-only dependency fails closed or the mutation action is unavailable; no partial write. | UI/API response plus before/after hash/stat |
| `PKG-005` | Inspect every imported Agent configuration and one live configured/task execution. | `submit_task_result` and `review_task_result` are explicitly configured for every possible assignee/reviewer; automatic handoff/message/delegation tools remain present in member context. | imported detail/API plus real tool inventory/trace |
| `ADM-001` | Present unversioned, wrong-version, recursive, unresolved, and family-mismatched controlled packages to normal admission. | Each invalid definition is excluded with root/path/identity, expected version, and reason; no retired parser/fallback or source write. | bounded admission log/API output and hashes |
| `ADM-002` | Start with one valid external Team, one invalid external Team, and an Org depending on the invalid Team. | Valid definitions and server/history remain usable; invalid Team/dependent Org are unavailable with actionable diagnostics; startup is not globally blocked. | health/catalog/API/log evidence |
| `AUTH-TEAM-001` | Create and edit a server-owned flat Team through the UI. | Only Agents are selectable, one direct coordinator is required, ordered handoffs save atomically, and the Team remains independently runnable. | UI plus persisted `team-config.json` |
| `AUTH-ORG-001` | Create and edit a server-owned Org through the UI. | Direct Agents/reusable Teams are selectable; no Org coordinator; handoff address eligibility and order are preserved. | UI plus persisted `org-config.json` |
| `AUTH-ORG-002` | Create an Org through GraphQL with hidden category/instructions/avatar/default-launch/revision data, then edit only visible fields through the UI. | Partial update omits hidden fields; all hidden durable values and optimistic revision behavior remain intact. | before/after GraphQL and file diff |

### B. Standalone AgentTeam — fresh execution and compatibility

| ID | Preconditions / Action | Expected observable result | Required evidence |
| --- | --- | --- | --- |
| `TEAM-001` | Run `aorg-research-squad` from Team detail; use Codex/GPT-5.6 and an owned workspace. | Configuration-first launch creates one Team V2 root and three direct Agent runs; coordinator focus is `/lead`; no nested configured Team exists. | UI, GraphQL, server log, Team V2 package |
| `TEAM-002` | Send marker `AORG-TEAM-LEAD-001` to `/lead`. | Accepted Agent conversation/event monitor renders ordinary user/assistant rows with streaming/status/tool behavior; no raw protocol JSON. | DOM/screenshot, stream and persisted conversation |
| `TEAM-003` | Ask `/lead` to call `get_handoff_rules`, then `send_message_to` `/analyst` with marker `AORG-TEAM-MSG-001`. | Rules are sender-bound and ordered; exact existing `/analyst` AgentRun receives the message; Team communication panel preserves exact sender/receiver/reference identity. | tool result, communication event/UI, server log |
| `TEAM-004` | Ask `/lead` to `delegate_task` a bounded marker task to `/analyst`; assignee submits; lead accepts. | A fresh task Agent execution is created under the Team aggregate, distinct from configured membership; task progresses delegated -> submitted -> accepted and appears in task UI. | tool envelopes, task UI, strict Team snapshot/history |
| `TEAM-005` | Repeat a task with a requested revision before acceptance. | Revision request does not complete the task; resubmission preserves task ID/review owner and later acceptance settles it. | task lifecycle UI/API/history |
| `TEAM-006` | Focus `/analyst`, a task execution, and `/lead` again; send marker `AORG-TEAM-FOCUS-001`. | Selection and composer target are exact; task inspection does not corrupt configured focus; accepted Team workspace remains usable. | selected-row/header/composer/task evidence |
| `TEAM-007` | Stop the Team using its established root control. | Confirmation/placement match the accepted Team UI; whole Team and task children terminate without orphan AgentRuns; history remains. | UI, lifecycle API, process/server log |

### C. AgentOrg — full scope, accepted Agent/Team surfaces, routing, and tasks

| ID | Preconditions / Action | Expected observable result | Required evidence |
| --- | --- | --- | --- |
| `ORG-001` | Run `aorg-mixed-org` from detail with Codex/GPT-5.6 and an owned workspace. | Run goes directly to Org configuration; workspace is required; full scope launches with no initial focus and no entry selector/coordinator. | config and unfocused screenshots, GraphQL/log |
| `ORG-002` | Select `/concierge`, `/research-team`, `/research-team/analyst`, and `/support-team` in turn. | Direct Agent focus is exact; Team row enters through its exact coordinator; nested Agent focus is exact; mounted Team uses the accepted Team workspace without standalone root controls. | header/sidebar/composer DOM and screenshots |
| `ORG-003` | Send `AORG-ORG-CONCIERGE-001` to `/concierge`. | The same accepted Agent monitor/composer used by standalone Agent/Team renders the completed turn; no raw `AGENT RUN`, `MEMBER INPUT`, JSON envelope, duplicate header/composer, or member-header `Stop Org`. | DOM negative/positive assertions, screenshot, stream/log/history |
| `ORG-004` | From `/concierge`, inspect handoff rules and `send_message_to` `/research-team`; from `/research-team/lead`, send to `/support-team`. | Org-root rules precede Team-local lists; a Team destination reaches its configured coordinator; exact canonical identities and references remain. | tool results, communication UI/events |
| `ORG-005` | From `/concierge`, delegate a fresh Agent task to `/research-team/analyst`; submit and accept. | Task Agent may reuse the configured recipient address but has a distinct AgentRun/task identity; task-bearing snapshot and UI remain correlated. | task UI, GraphQL/WS snapshot, server/persistence |
| `ORG-006` | From `/concierge`, delegate a fresh Team task to `/research-team`; Team coordinator submits and delegator accepts. | A fresh task TeamRun starts through `/research-team/lead`, remains under the Org aggregate, and never becomes permanent membership or a standalone registered root. | task UI, run IDs, history/package tree |
| `ORG-007` | Request one task revision, resubmit, then accept; inspect task references from delegator and recipient. | Exact review owner, lifecycle, and absolute reference ownership survive every transition. | task events/detail/reference viewer/API |
| `ORG-008` | While snapshot hydration or activation-checkpoint recovery is pending, leave the Org for another supported workspace and later return. | Release is terminal for the retired context: no stale publication, context resurrection, replacement socket, orphan subscription, or wrong-root mutation; return creates a fresh owned service. | browser console/network state and correlated server log |
| `ORG-009` | Introduce a controlled current-generation malformed/miscorrelated/gapped frame through the supported deterministic harness, then recover. | Last committed view stays visible; invalid candidate never publishes; exact checkpoint hydration atomically replaces it; no JSON fallback. | strict stream test/probe and UI recovery state |
| `ORG-010` | Stop the active Org from its history root row while different/no members are focused. | Root action remains focus-independent; entire Org terminates in reverse; mounted Teams expose no independent stop; history remains. | root-row UI, lifecycle API/log |

### D. Server shutdown, restart, history, restore, and continued work

| ID | Preconditions / Action | Expected observable result | Required evidence |
| --- | --- | --- | --- |
| `RST-001` | Keep one Team and one Org run with completed messages/tasks, then gracefully stop the owned server without deleting its data root. | Shutdown attempts all roots/children and closes sockets/processes; strict Team V2 and Org V1 packages remain readable. | shutdown log, port/process check, package inventory |
| `RST-002` | Restart the same server/database/data root and reload the production web client. | Mixed history lists both roots with explicit `root_subject_kind`; no family inference or duplicate root; prior messages/tasks are visible. | GraphQL/history UI and strict package reads |
| `RST-003` | Reopen/restore the Team root and focus its prior configured/task rows. | Same Team/root/member/task identities and conversation are reconstructed; no Org path is used. | UI, API, Team V2 files |
| `RST-004` | Send `AORG-TEAM-RESUME-001` after Team restoration. | Conversation continues in the same Team/member history with a new completed turn. | DOM/stream/persisted history |
| `RST-005` | Reopen/restore the Org root and inspect direct Agent, mounted Team, task Agent, and task Team rows. | Exact Org topology, task bindings, focus targets, prior conversations, references, and statuses are restored without standalone mounted-Team registration. | UI, strict Org snapshot/API/files |
| `RST-006` | Send `AORG-ORG-RESUME-001` after Org restoration and complete another task/message transition. | The same AgentOrg root continues through accepted surfaces; new events append after restored sequence and persist. | DOM/WS/history/server log |
| `RST-007` | Stop both restored roots, restart the server again, and reopen history. | Rows remain inspectable and inactive; no child process/socket resurrects; user can explicitly restore only through supported action. | second-restart UI/API/process evidence |

### D2. Strict real-provider Restore variants

| ID | Preconditions / Action | Expected observable result | Required evidence |
| --- | --- | --- | --- |
| `RESTORE-001` | Launch a direct-Agent Org, converse only with `/lead`, leave `/verifier` system-instruction-only, stop the Org, restart/refresh history, and invoke the inactive-row Restore action. | `/verifier` receives a different valid Codex provider ID; the exact replacement is durable before publication; the complete Org becomes active. | pre/post strict Org tree, provider/process log ordering, active history/UI |
| `RESTORE-002` | After `RESTORE-001`, focus the previously conversed `/lead`. | Exact prior provider identity and conversation content remain; Restore does not replace a conversed binding. | pre/post provider ID, DOM/history/raw trace |
| `RESTORE-003` | In an isolated copy of the stopped package, remove the required prior binding evidence and request Restore. | Restore fails closed with no partially active Org, no guessed replacement, and no mutated original fixture. | bounded response/log, tree/hash comparison, active-run query |
| `RESTORE-004` | In a separate isolated copy, make the retained binding/tree unreadable or mismatched and request Restore. | Strict validation rejects the package before publication; unrelated history remains usable. | bounded response/log, history/API, zero-write comparison |

### E. GraphQL, streaming, persistence, migration, and responsive product checks

| ID | Preconditions / Action | Expected observable result | Required evidence |
| --- | --- | --- | --- |
| `API-001` | Query definitions, active runs, locations, and mixed history for both families. | Generic results carry `root_subject_kind`; Team-only contracts keep exact Team V2 wire; family/path/schema mismatches fail closed. | saved GraphQL request/response corpus |
| `API-002` | Capture live Team and Org stream handshakes/snapshots/events/ACKs for the marker/task journeys. | Exact family, root ID, run IDs, target, sequence, command type, and task/reference correlation are preserved. | bounded WS transcript or deterministic recorder |
| `PERSIST-001` | Inspect fresh/stopped/restored packages. | Team uses exact Team V2 file/path/root; Org uses exact Org V1 file/path/root/sidecars; no generic durable root or Team-inside-Team package exists. | manifest, schema validation, hashes |
| `MIG-001` | Launch a real isolated server over a native flat Team V2 cohort. | Migration is a byte/path/mtime no-op for the native Team package. | before/after filesystem manifest and startup log |
| `MIG-002` | Launch over a valid one-level organization-like historical Team cohort with supported sidecars/tasks. | Complete preflight precedes writes; exact Org V1 target is produced; task hosts/state preserved; retired source cleaned after strict reread. | source/target manifests and log |
| `MIG-003` | Launch over an unsupported deeper configured topology. | Bounded failure occurs before any migration write; earlier sibling/source packages remain byte-faithful; compatible startup scope remains usable where specified. | zero-write diff, health/log |
| `MIG-004` | Pre-create the exact prospective target representing an interruption, retain source, then relaunch normally. | Ordinary startup recognizes exact output, completes cleanup, succeeds without journal/backup/recovery machinery. | pre/post tree and relaunch log |
| `MIG-005` | Exercise destination collision and invalid current package readiness. | Affected definition/root is unavailable with exact diagnostic; unrelated compatible definitions/history remain available. | catalog/health/log/API |
| `UI-001` | Execute package, Team, Org, task, history, and restored-conversation journeys at desktop size. | Approved three-panel layout, event monitor/input, task panels, focus markers, and root stop placement match accepted product surfaces. | screenshots and semantic DOM assertions |
| `UI-002` | Repeat critical Team and Org unfocused/focused/task/history states at `390x844`. | Collapsed navigation/panels remain readable/reachable; no overlay collision or document-level horizontal overflow. | narrow screenshots, width/scroll assertions |
| `STATUS-001` | Observe an active mounted Team expanded while its exact descendant Agents enter initializing/running/idle states. | Team row shows one accessible aggregate dot in the established status position and follows `running > initializing > error > idle > offline`; descendant dots remain exact. | timestamped desktop DOM/screenshots plus live status projection |
| `STATUS-002` | Collapse the mounted Team while it remains active, then change/focus descendants. | Aggregate dot remains visible and reactive while descendant rows are hidden; siblings/direct Org Agents do not contribute. | collapsed DOM/screenshot plus controlled status projection |
| `STATUS-003` | Stop the whole Org and reopen the historical row, both expanded and collapsed. | Historical/terminal authority is truthful; no stale running/initializing aggregate survives; mounted Team has no independent Stop/Restore/archive control. | stopped/history desktop+narrow DOM/screenshots and lifecycle API |
| `CLEAN-001` | Finish all scenarios. | Imported package hashes match baseline; owned ports/processes/tabs are closed; only retained evidence and isolated data remain. | cleanup log and final hash comparison |

## Deterministic runtime markers

- `AORG-TEAM-LEAD-001`
- `AORG-TEAM-MSG-001`
- `AORG-TEAM-FOCUS-001`
- `AORG-TEAM-RESUME-001`
- `AORG-ORG-CONCIERGE-001`
- `AORG-ORG-AGENT-TASK-001`
- `AORG-ORG-TEAM-TASK-001`
- `AORG-ORG-RESUME-001`

Every prompt requests the marker verbatim on the first line and a bounded
second-line acknowledgement. Tool prompts explicitly name the exact canonical
recipient and expected lifecycle; the validator records returned task/run IDs
rather than inferring identity from labels.

## Stop conditions

Stop the broader run and classify/reroute immediately if any critical path:

- renders raw/opaque events or a duplicate AgentOrg workspace;
- targets an implicit/wrong Agent, coordinator, root, task, or reference;
- mutates an external package;
- loses Team/Org history or cannot continue after restart;
- resurrects a released context/socket;
- writes before migration preflight or requires normal legacy fallback; or
- leaves an owned provider process/root active after whole-root stop.
