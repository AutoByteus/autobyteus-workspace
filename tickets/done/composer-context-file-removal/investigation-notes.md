# Investigation Notes

## Investigation Meta

- Package identifier: `composer-context-file-removal`
- Request / ticket: Project Task `project_task_9261def1-bb86-494f-aa1a-bbd643e2f9a4` — "Composer context files can't be removed in some runs: Clear All and the per-file delete do nothing (seen on a delegated team member)". Delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal` / `codex/composer-context-file-removal`
- Resolved base remote / branch / revision: `origin/personal` @ `46e94fdea86ad9af7d8884e690721b373d754cea` (fetched 2026-10-09)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; ticket folder `tickets/in-progress/composer-context-file-removal/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-09); `AGENTS.md` (repo root). Design gate (2026-10-09): `references/architecture-design.md`, `design-principles.md`, `DESIGN.md` (repo root), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`, `TESTING.md` (outline).
- Investigation status: Root cause confirmed in code and against the live desktop server. Requirements ready for approval.

## Initial Request And Clarifications

- Original request: see ticket. User attached an image in the composer of the **solution designer of a delegated Software Engineering Team copy** under the Project Task Manager (standalone agent) run (19.png). Clear All and per-image delete did nothing. In the Project Task Manager run itself (20.png) attach/remove works. User has hit "can't delete a context file" before, elsewhere, and cannot pin down when.
- Clarifications received: none yet.
- User-supplied constraints: files must always be removable wherever they can be attached; a run that can't accept input must not allow attaching; any error must be visible, never silent; tests for the failing combinations; user verifies in the desktop app including the 19.png case.
- Initial ambiguity: suspected dependence on run kind / state / draft ownership.

## Product And Domain Understanding

- Product area: desktop/web composer ("Context Files" tray above the message box) in agent, team, Org and delegated-copy run views.
- Terms:
  - *Uploaded attachment*: a file sent to the server (`POST /rest/context-files/upload`) and stored as a **draft** under a draft owner until the message is sent (then finalized). Created by pasting an image/file, the `+` file picker, or dropping OS files in a browser (non-Electron) window.
  - *Path attachment*: a workspace/native path locator (file-explorer drag, Electron native-file drop, pasted path text). Never uploaded.
  - *Draft owner*: the descriptor under which drafts are stored; one of `agent_draft`, `team_member_draft`, `org_member_draft`, `agent_collaboration_member_draft`.
  - *Delegated child of a standalone run*: an Agent copy or a member of a Team copy created by `delegate_task` from a standalone agent run (e.g. the Project Task Manager). Its target kinds are `agent_run_task_agent` / `agent_run_task_team_member`; its draft owner is `agent_collaboration_member_draft(hostRunId, agentRunId)`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | User | 19.png, 20.png (task context) | Symptom | Fails on delegated team member (`software engineering team` copy under PTM); works on PTM standalone run | — |
| 2026-10-09 | Code | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | Composer UI | `+` disabled only when `!target`; per-file remove → `removeItem`; Clear All → `clearCurrentTargetAttachments`; no error rendering | — |
| 2026-10-09 | Code | `autobyteus-web/composables/useContextAttachmentComposer.ts` | Attach/remove logic | `removeItem`: uploaded draft + no `draftOwner` → `console.warn` + return; delete throws → `console.error` + return (item stays). `clearCurrentTargetAttachments`: failed or owner-less drafts are kept. `uploadFiles`: no owner → silent return; failure → `console.error`, placeholder vanishes | Silent failure paths |
| 2026-10-09 | Code | `autobyteus-web/stores/contextFileUploadStore.ts` | Delete call | `deleteDraftAttachment` → `DELETE buildDraftContextFileEndpoint(owner, storedFilename)`; sets `store.error` (never rendered) and rethrows | — |
| 2026-10-09 | Code | `autobyteus-web/utils/contextFiles/contextFileOwner.ts` | Endpoint builder | `agent_collaboration_member_draft` → `/drafts/agent-collaborations/:host/agent-runs/:agent/context-files/:file` | — |
| 2026-10-09 | Code | `autobyteus-web/composables/agentInput/useComposerTarget.ts` (`resolveDraftOwner`) | Owner per run kind | `host` targets → `agent_collaboration_member_draft`; `root` → Org; standalone agent → `agent_draft`; standalone team → `team_member_draft(rootRunId, memberAddress)`; `read_only` → `null` except Org direct agent / Org team member | — |
| 2026-10-09 | Code | `autobyteus-web/stores/agentRunCollaborationStore.ts` `childTargetFor` | Delegated-child target | Always `access: 'live'` ("a child is always addressable") → owner always present, independent of run state | State-independent failure |
| 2026-10-09 | Code | `autobyteus-server-ts/src/api/rest/context-files.ts` | Server routes | GET+DELETE exist for agent, team-member and Org drafts. For `agent-collaborations` drafts **only GET is registered — no DELETE route** | **Root cause** |
| 2026-10-09 | Command | `git log -- src/api/rest/context-files.ts` | Origin | Agent-collaboration routes added in `c2f69edde` (2026-09-30, "standalone Agent runs host collaborators") without DELETE | — |
| 2026-10-09 | Code | `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts`, `agent-org-context-files.integration.test.ts`, `tests/unit/context-files/context-file-agent-collaboration-owner.test.ts` | Coverage | DELETE covered for team-member and Org drafts; none for agent drafts' REST delete in isolation beyond team, none for agent-collaboration drafts | Test gap |
| 2026-10-09 | Code | `autobyteus-web/stores/agentOrgContextsStore.ts` `accessFor`/`activeTargetFor`; `services/agentOrgExecution/agentOrgExecutionContext.ts` `selectedTarget`; `components/workspace/{agent,team}/*Surface.vue` | Read-only composer visibility | Composer hidden for read-only targets except Org targets that are `submissionPending` or `agent_org_direct_agent`/`agent_org_team_member`. Org task agent / Org task team member while `submissionPending` → composer visible, `draftOwner = null` | Secondary edge |
| 2026-10-09 | Code | `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts` | Mobile composer | Mobile remove/clear is local-only (no server call) → unaffected | Out of scope |
| 2026-10-09 | Code | `autobyteus-server-ts/src/context-files/domain/context-file-upload-policy.ts` | Draft lifecycle | `CONTEXT_FILE_DRAFT_TTL_MS = 24h`; expired drafts pruned by `cleanupExpiredDrafts` | Safety net for orphaned drafts |
| 2026-10-09 | Runtime | Live desktop server `127.0.0.1:29695` (see probes) | Reproduce | Collab DELETE → 404 "Route not found"; agent/team DELETE → 204 | Confirms root cause |
| 2026-10-09 | Data | `~/.autobyteus/server-data/draft_context_files/` | Stranded drafts | Only two draft files remain, both under `agent-collaborations/project_task_manager_7c8d…/agent-runs/{solution_designer_65bf…, api_e2e_engineer_53e1…}` (15:36 and 14:34) | Second earlier occurrence = "hit it before" |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Product Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Remove/Clear an uploaded file in the composer of a delegated child of a standalone run (Agent copy or Team-copy member) | Click × or Clear All → client DELETE `/rest/drafts/agent-collaborations/...` → server 404 | Nothing visible happens; file stays in the tray and on disk; only a console error | Code + live probe + stranded files + 19.png | High |
| BEH-002 | User | Same on standalone agent, New chat, standalone team / sub-team member, Org direct/team/task members (live) | DELETE route exists → 204 → item removed | Works | 20.png, live probe, integration tests | High |
| BEH-003 | User | Remove a path attachment (workspace/native path) in any composer | Local list removal only | Works everywhere | Code (`isDraftUploadedContextAttachment` false → no server call) | High |
| BEH-004 | User | Attach an uploaded file where the composer is visible but the target has no upload owner (Org task agent / Org task team member while its previous message is still pending) | `+` stays enabled; picker/paste/drop call `uploadFiles` → silent return | Nothing happens, no message | Code | Medium (edge; not runtime-reproduced) |
| BEH-005 | User | Remove/Clear an uploaded draft in a composer whose target has no upload owner (same edge as BEH-004, or a pasted foreign draft locator) | `removeItem` warns to console and returns; Clear All keeps it | Silent no-op | Code | Medium |
| BEH-006 | User | Upload fails (unsupported type, server error, network) | Placeholder disappears; `console.error` only | Silent failure | Code | High |
| BEH-007 | System | Server draft TTL | `cleanupExpiredDrafts` on each upload/read/delete | Draft files older than 24h are deleted | Code | High |

## Reproduction Matrix (Code-Traced + Live-Probed)

Removal behaviour depends only on (a) the **draft owner kind** the composer target resolves to and (b) whether the attachment is **uploaded** vs a **path**. Run state does not matter for delegated children because their target is always `live`.

| Run kind (UI) | Target kind | Draft owner | Upload (paste / + / browser drop) | Remove × / Clear All of uploaded file | Path attachments | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Standalone agent run (e.g. Project Task Manager), any state | `standalone_agent` | `agent_draft` | Works | **Works** | Works | 20.png; live probe 204 |
| New chat (not yet a run) | chat draft target | `agent_draft` | Works | **Works** | Works | `chatDraftComposerTarget.ts` |
| Standalone team member / sub-team member, live | `standalone_team_member` | `team_member_draft` | Works | **Works** | Works | live probe 204; integration test |
| Standalone team member, read-only | — | — | Composer hidden | N/A | N/A | `TeamWorkspaceSurface.vue` |
| Org direct agent / Org team member (live, continuable, read-only) | `agent_org_direct_agent` / `agent_org_team_member` | `org_member_draft` | Works | **Works** | Works | Org integration test DELETE 204 |
| Org task agent / Org task team member, live | `agent_org_task_*` | `org_member_draft` | Works | **Works** | Works | same |
| Org task agent / Org task team member, read-only while message pending | `agent_org_task_*` | `null` | **Silent no-op** (BEH-004) | **Silent no-op** for uploaded drafts (BEH-005) | Works | Code |
| **Delegated Agent copy** under a standalone run — active, idle, offline, after restart, Task DONE/CANCELLED (while viewable) | `agent_run_task_agent` | `agent_collaboration_member_draft` | Works | **FAILS — DELETE 404, silent** | Works | Code; live 404 |
| **Delegated Team-copy member** under a standalone run (19.png) — same states | `agent_run_task_team_member` | `agent_collaboration_member_draft` | Works | **FAILS — DELETE 404, silent** | Works | 19.png; stranded files; live 404 |
| Mobile composer (any) | — | — | — | Works (local only) | Works | `useMobileFileContextCoordinator.ts` |

Why the user "can't pin down when": it fails only for delegated children of a **standalone agent** run (not Org-delegated ones), and only for **uploaded** files (pasted images, `+` picker); path attachments dragged from the file explorer or dropped natively in Electron remove fine.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- |
| `curl GET /rest/drafts/agent-collaborations/project_task_manager_7c8d…/agent-runs/solution_designer_65bf…/context-files/ctx_33c4d39b2190__image.png` | 19.png file still exists | 200 | Upload succeeded under collab owner | live server 29695 |
| `curl -X DELETE …/agent-collaborations/…/context-files/ctx_000000000000__probe.png` (non-existent name; non-destructive) | Delete for collab owner | `404 {"message":"Route DELETE:/rest/drafts/agent-collaborations/... not found"}` | Root cause confirmed | live |
| `curl -X DELETE /rest/drafts/agent-runs/probe_nonexistent_run/context-files/ctx_000000000000__probe.png` | Control | 204 | Agent route exists | live |
| Upload + DELETE + GET for `agent_draft` and `team_member_draft` probe owners | Control | upload ok, DELETE 204, GET 404 | Agent/team removal works | live; probe files removed |
| `find ~/.autobyteus/server-data/draft_context_files -type f` | Stranded drafts | Only `agent-collaborations/...` files remain | Only collab owner strands files | data dir |

Full UI-click reproduction across every run kind was not performed in the desktop app (no desktop-automation tool in this role); the matrix is derived from code tracing plus the live server probes above. Downstream validation must exercise the UI paths (AC list).

## Relevant Codebase And Technical Facts

| Path | Current Responsibility | Requirement Implication | Design Question |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | Draft/final REST routes | Missing DELETE for agent-collaboration drafts | Add the route with the same owner validation and error mapping as the GET |
| `autobyteus-server-ts/src/context-files/services/context-file-read-service.ts` `deleteDraftFile` | Validates owner, unlinks, ENOENT → false | Already owner-generic | Reuse |
| `autobyteus-web/composables/useContextAttachmentComposer.ts` | Attach/remove/clear | Silent failure paths (BEH-004..006) | Where to hold a visible composer error; local-removal policy (DEC-001) |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | Composer tray UI | No error display; `+` enablement ignores upload authority | Render error; gate upload affordances on `draftOwner` |
| `autobyteus-web/composables/agentInput/useComposerTarget.ts` | Resolves draft owner | Defines when uploads are allowed | No change expected |
| `autobyteus-web/stores/contextFileUploadStore.ts` | Upload/delete/finalize calls, global `error` (unused by UI) | Error is global, not per-composer | Design decides error ownership |

## Structural And Payload Surface Inventory

- Payload surfaces: draft files under `server-data/draft_context_files/<owner path>/context_files/`.
- Structural surfaces: one REST route (DELETE for agent-collaboration drafts); web composer composable + component.
- Potential structural impacts: API addition (new DELETE route, same shape as siblings); no persistence schema change; no migration; no security boundary change (`/rest/drafts/` already allowed by remote-access policy, `src/api/security/remote-access-route-policy.ts:44`).

## Persisted Data And State Facts

- Affected subject: draft context files. Existing stranded drafts are reclaimed by the 24h TTL; no migration needed.
- Must preserve: finalized (sent) attachments; other composers' drafts.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `…/context/ctx_fdb96bdf2570__19.png` | User | Failing case screenshot | BEH-001, AC-001 | Reference | N/A (evidence) |
| `…/context/ctx_7c27c5fc527b__20.png` | User | Working case screenshot | BEH-002 | Reference | N/A (evidence) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether a delegated child remains viewable/composable after its Task is DONE/CANCELLED | Matrix completeness | Downstream validation; the fix is owner-based so it applies in any viewable state | Open (non-blocking) |
| RSK-001 | Risk | Other silent failures in composer may exist outside attach/remove (send errors) | Scope creep | Out of scope | Recorded |

## Architecture Investigation Findings (SR-003)

| Source | Observation | Design implication |
| --- | --- | --- |
| `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` `buildDraftContextFileLocator` | One switch builds the draft locator for each owner kind; there is no inverse parser | Add the inverse (`parseDraftContextFileLocator`) next to it so build/parse live in one owner |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | Draft routes hand-registered per kind: 4 GET, 3 DELETE (collab DELETE missing); error mapping differs per route (agent/team GET throw 500 on bad owner; Org maps NotFound→404; DELETEs map all errors→400) | Replace with one `GET /drafts/*` and one `DELETE /drafts/*` that parse via the codec; one error mapping |
| `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | Repeats the same 4 draft regexes to map a locator to a local file for runtimes | Use the same codec (removes a third copy) |
| `autobyteus-server-ts/src/context-files/services/context-file-read-service.ts` `deleteDraftFile` / `getDraftFilePath` | Already owner-generic (validate owner → layout path → unlink/stat) | Reuse unchanged |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts:314-318` | REST routes registered under prefix `/rest` | Wildcard handler parses `request.url` path (which includes `/rest`) — locator form |
| `grep "/drafts" autobyteus-server-ts/src` | No other route under `/rest/drafts/` | Wildcard cannot shadow another route |
| `autobyteus-web/stores/contextFileUploadStore.ts` + `utils/contextFiles/contextFileOwner.ts#buildDraftContextFileEndpoint` | Client re-derives delete URL from the composer's current owner (4th copy of the locator shape) | Delete at the attachment's own locator; remove `buildDraftContextFileEndpoint` |
| `autobyteus-web/composables/useContextAttachmentComposer.ts#resolveAttachmentFetchUrl` + `authorizedFetch` | Already resolves a locator to an authorized node URL for reading a draft (paste-clone path) | Reuse for DELETE so read and delete use the same address |
| `contextFileUploadStore.error` | Written, never read by any component | Dead state; replace with composer-local visible error |
| `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts#parseDraftUploadedContextAttachmentLocator` | Client already parses a draft locator to its owner (all 4 kinds) | Use it for the "own draft only" rule (REQ-003) |

## Requirement Implications

- Primary fix: agent-collaboration draft deletion must exist server-side (BEH-001).
- Visibility: remove/clear/upload failures must be shown in the composer (BEH-005, BEH-006).
- Attach gating: upload affordances must not silently no-op where uploads are not accepted (BEH-004).

## Notes For Architecture Design

- Map SCN-001..SCN-004. Verify route parity (GET/DELETE) for every draft owner kind with a parity test so a future owner kind cannot ship without DELETE.
- Decide error ownership (per composer instance vs global store) and DEC-001 outcome.

## Out-Of-Scope Baseline Note (2026-10-09)

- Reported by `/software_engineering_team/implementation_engineer`: `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` — two content-cadence cases fail on `origin/personal` @ 46e94fdea independent of this ticket (log `/tmp/ccfr-server-int.log`).
- Triage: known defect **PB-001**, already documented in commit `c29d502d6` (2026-10-08) and accepted by the user as a documented exception in `tickets/done/base-test-suite-green/release-deployment-report.md` (lines 25, 32, 107; "recommended as a separate ticket"). Cause per that record: `AgentRun` publishes `AGENT_INPUT_STATE` after every canonical batch and the content cadence scheduler flushes pending content before it. The test capture filters `AGENT_INPUT_STATE` out of the trace, which is why no flush-triggering frame appears in it.
- Disposition: not in this ticket's scope; no Project Task found for PB-001 in the project's tasks (grep of task.json). Accepted exception for this ticket's validation.
