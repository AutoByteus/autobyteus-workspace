# Design Review Report — agent-tool-results-omit-empty (autobyteus-260)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/tickets/in-progress/agent-tool-results-omit-empty/requirements-doc.md` (Approved, SR-006)
- Upstream Investigation Notes: `…/investigation-notes.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001–SR-007)
- Reviewed Design Spec: `…/design-spec.md` (SR-007, status Ready)
- Supplemental Task Artifacts Reviewed: `evidence/SD-measure-sizes-*`, `evidence/SD-measure-summary-*`, `evidence/SD-first-line-lengths-*`, `evidence/SD-task-file-shape-inventory-*`, `evidence/SD-codex-0.164-mcp-result-to-model.txt`, `evidence/first-team-*` (historical)
- Relevant Solution Revision IDs: SR-006 (requirements approval), SR-007 (design), SR-008 (DEC-019 / REQ-013 / AC-011: context files named `{name, path}` in acknowledgements)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: round 1, the Solution Designer's handoff (Large / High, 2026-10-25); round 2, the SR-008 delta taking the ARCH-REV-001 residual into this ticket (2026-10-25); round 3, the SR-009/SR-010 delta adding `get_project_task`, worker read scope, the first-message Task line, and dropping `task_ids` (2026-10-25)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Pass)
- Latest Authoritative Round: 3
- Round 3 scope: requirements-doc at SR-010 (REQ-007 changed; REQ-014–REQ-017, AC-006 changed, AC-012–AC-015, BEH-006, UC-007, SCN-007, DEC-020–DEC-024) and the design-spec section "`get_project_task` (SR-010 addition)" with DS-007 / DS-008, its interface, file-mapping, sequence (5b) and risk rows. Round-1 and round-2 verdicts stay valid for everything SR-010 does not touch. For round 3 I opened `root-task-execution-resource-scope.ts:30-78`, `task-execution-resource-service.ts:242-262`, `root-task-execution-lifecycle.ts:135-216`, `task-execution-input.ts:30-100`, `task-assignment-eligibility.ts:70-78`, `member-task-command-capability.ts`, `member-execution-context.ts`, `autobyteus-agent-tool-resolver.ts:60-140`, `runtime-agent-tool-exposure.ts:60-80`, `projects/services/task-references.ts`, and the remote work-packet callers (`team-run-message-delivery.ts:88-99`, `standalone-root-message-delivery.ts:160-172`).
- Round 2 scope: the SR-008 delta only (requirements-doc REQ-013, AC-011, DEC-019 and the Preserved Behavior Boundary line; design-spec BEH-005 row, tightness row, manifest row, ack example). All other verdicts below come from round 1 and remain valid, because nothing else in SR-007 changed.
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty`, branch `codex/agent-tool-results-omit-empty`, base `origin/personal@fc06a7355d` (no source changes). Opened: `autobyteus-server-ts/src/agent-tools/**` (every native tool, MCP provider and MCP helper), `agent-communication/services/send-message-to-tool-result-contract.ts`, `agent-team-execution/task-delegation/task-delegation-result-contract.ts`, `startup/agent-tool-loader.ts`, `projects/{domain/models.ts, stores/project-store.ts, services/project-task-service.ts, search/project-task-search-service.ts, changes/project-change-messages.ts}`, `api/graphql/types/project-tasks.ts`, `app-data-migrations/{app-data-migration-runner.ts, app-data-migration-registry.ts, migrations/project-task-keys-v1/}`, `agent-execution/events/processors/file-change/*`, `autobyteus-ts/src/{tools/register-tools.ts, tools/terminal/tools/*, tools/search-tool.ts, llm/prompt-renderers/native-tool-payload-format.ts}`, `autobyteus-web/{utils/projects/taskSummary.ts, types/project.ts, services/agentStreaming/**, utils/toolDisplaySummary.ts}`, `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `docs/modules/agent_communication.md:128-142`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three packages plus one skill repository; every platform tool result contract on two routes (including advertised MCP `outputSchema`s for `send_message_to` and `delegate_task`); a persisted-data migration over every Project `task.json`; a new required field on GraphQL and the strict change-feed schema.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. Contract, persistence and blast-radius impact are each sufficient for `High`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes. REQ-001–REQ-012, AC-001–AC-010, DEC-001–DEC-018; user approval recorded at SR-006, with DEC-018 added at SR-007 as details within the direction.
- Relevant existing behavior and evidence confirmed: yes (see the opened sources above and the statements below).
- Scope guardrail confirmed: in-scope UC-001–UC-006; out of scope: third-party/application tool payloads, Temp-task titles, meaning search over titles, error texts, text-returning core tools; preserved behavior: non-empty fields keep name and meaning except the four listed changes, `false`/`0` stay, refusals keep `code`/`message`; review authority: findings cite REQ/AC/preserved IDs.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (none is blocking).
- Remaining material ambiguity: none blocking. See AR-001–AR-004 for implementation-level gaps that follow directly from approved requirements.
- Statements about existing code the design relies on, opened at their cited lines:
  - Serializers: compact `JSON.stringify` in `project-task-native-tools.ts:11,16,17`, `project-task-tools-mcp-adapter-provider.ts:11-12`, `get-handoff-rules.ts:38`, `get-handoff-rules-mcp-adapter-provider.ts:31`, `agent-discovery-refusal.ts:38`, `agent-discovery-mcp-result.ts:11`, `publish-artifacts-tool.ts:150`, `send-message-to-tool-result-contract.ts:38`; pretty in the four definition tools (`get-agent-definition.ts:63`, `list-agent-definitions.ts:48`, `get-agent-team-definition.ts:62`, `list-agent-team-definitions.ts:46`) and through `toJsonString(value, 2)` in `browser-tool-serialization.ts:26`, `task-delegation-tool-serialization.ts:45`, `media-tool-serialization.ts:3`, `publish-artifacts-mcp-adapter-provider.ts:50,53`. Confirmed.
  - `send_message_to` null rule: `send-message-to-tool-result-contract.ts:17,33,47`; `agent-team-collaboration-llm-contract.ts:13`; `docs/modules/agent_communication.md:128-141`. Confirmed.
  - Only `send_message_to` and `delegate_task` advertise an MCP `outputSchema` (`send-message-to-mcp-adapter-provider.ts:34`, `task-delegation-tools-mcp-adapter-provider.ts:37`). `DelegateTaskResultSchema` already has optional-absent fields and `launch_notes` `min(1)`, so the rule cannot make a valid result invalid. Confirmed.
  - Native renderer: `native-tool-payload-format.ts:21-41`, where strings pass through and objects are compact-stringified. Confirmed.
  - Codex reads `structuredContent.error` / `.message` (`codex-tool-payload-parser.ts:477-483`). Confirmed. The Codex 0.164 model view (only `structuredContent`) is confirmed from the evidence excerpt.
  - Store: `project-store.ts:50-57` (the tolerant reader requires `taskKey` and `description`), `:63-65` (exact writer). Service: `project-task-service.ts:53-56` (`normalizeDescription`), `:247` (worker view from `description`), `:289` (delegated input), 494 lines. Registry: `ProjectTaskKeysV1AppDataMigration` at line 131. Search exact tier: `project-task-search-service.ts:80-81`. `models.ts:14` and web `types/project.ts:26` hold the "no title" comments. Confirmed.
  - Runner: a `requiredOnStartup` failure is recorded and startup continues; a prerequisite that has not reached terminal success raises `AppDataMigrationPrerequisiteError` (`app-data-migration-runner.ts:80-100,140-156`). Confirmed.
  - Both update paths: GraphQL `updateTask` (`project-task-service.ts:122-139`, full-form: `UpdateProjectTaskInput.description` is already `String!`, `project-tasks.ts:145`) and tool `updateTaskById` (`:146-183`). Temp-task refusals follow the `TASK_*_INVALID` pattern (`:159-164`), so `TASK_TITLE_INVALID` matches it. Confirmed.
  - A consumer the design does not name: the file-change processor reads a generated-output path from a media tool's result object (`file-change-output-path.ts:23-30,59-71`). It reads the required `output_file_path` argument first (`media-tool-parameter-schemas.ts:33-39`, `required: true`) and uses the result object only as the last fallback. Native media results changing from an object to text therefore changes no behavior. Verified; no finding.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | AR-002, AR-003 (non-blocking) |
| BEH-002 | User + Contract | Pass | Pass | Pass | Confirmed | AR-001 (non-blocking) |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | AR-004 (non-blocking) |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | Search tool text names `title` and the exact tier on title (in AR-002) |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | Round 2: acks included (REQ-013); who builds the ack's `path`: AR-005 (non-blocking) |

Round 2 basis for SR-008:
- DEC-019 is within the approved direction. It applies DEC-004's reasoning (agents read files by path) to the second place the same context-file subject appears in this ticket, and it removes a second name that this change would otherwise introduce (Principle 15; ticket-scope: introduced by the change). The Preserved Behavior Boundary now lists it, and the user was informed. Verified: no agent tool takes a stored filename (`grep storedFilename src/agent-tools`: only the ack mapping at `project-task-tool-manifest.ts:54` and the `create_task` text at `project-task-tool-contract.ts:16`).
- Consumers of the ack's `attachedContextFiles`: only tool texts and docs (`docs/modules/{projects,agent_tools_mcp_server}.md`, `autobyteus-web/docs/projects.md`), which the design already updates. The web app does not read it. The only `autobyteus-agents` hits are historical evidence files of another ticket, not skill text.
- Path source: `create_task` builds its ack from a `ProjectTaskView` whose `contextFiles` already carry `localPath` (`project-task-views.ts:19-23`). `update_task` builds its ack from `TaskAcknowledgementView.attachedContextFiles: ProjectTaskContextFile[]`, which has no path (`models.ts:56`, `project-task-service.ts:181`). See AR-005.

### Round 3 basis for SR-010 (`get_project_task`)

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-003 (changed) | Contract | Pass (short entries only; no `task_ids`) | Pass | Pass | Confirmed | AR-004's `task_ids: []` item is obsolete |
| BEH-005 (now via `get_project_task`) | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Contract | Pass | Pass | Pass (DS-008 builder citation: AR-007) | Confirmed | AR-006, AR-007, AR-008 (non-blocking) |

Statements the design relies on, opened at their cited lines:
- `ownerOf` (`root-task-execution-resource-scope.ts:48-53`) answers through `TaskExecutionResourceService.ownerOf(chain)` (`task-execution-resource-service.ts:242-250`). It walks the caller's containment chain and returns the first copy's **current** Task, or `null`. When no owner is found, it throws `TASK_AGENT_RESOURCES_UNAVAILABLE` if any Task's resource data is unreadable (`assertAllReadable`, `:259-262`). Confirmed: the answer is explicit and fails closed, not inferred from a missing lookup (Principle 13).
- Agents a worker delegated to share the worker's Task. A described delegation by an owned sender joins `{role: "delegated", creator: owner.execution}` (`root-task-execution-lifecycle.ts:155-162`). An owned sender cannot use `task_id` (`:150`, `:191`). Confirmed: one Task per chain, as REQ-015 describes.
- Exposure is opt-in: `enabledProjectTaskToolNames` filters the definition's requested names (`runtime-agent-tool-exposure.ts:75`). Confirmed (AC-014).
- Native binding: the resolver has bound branches before its generic `defaultToolRegistry.createTool(name)` fallthrough (`autobyteus-agent-tool-resolver.ts:83-95`, `:123-136`). Confirmed that the pattern exists. See AR-008 for the difference from the discovery tools.
- Key resolution: `TaskReferences.projectTask` resolves a long ID, then a key in lower case (`task-references.ts:33-41`). `readProjectTask(projectId, reference)` can reuse it and refuse a match in another Project with `TASK_NOT_FOUND`. Confirmed (AC-012).
- First message: the new-copy path builds `buildTaskAssigneeWorkPacket` → `buildTaskWorkText` (`root-task-execution-lifecycle.ts:169`). The existing-copy path builds **`buildExistingCopyTaskMessage`** (`:213`, `task-execution-input.ts:80-93`), not `buildTaskWorkText` as the design states. See AR-007. Remote work packets (`team-run-message-delivery.ts:97`, `standalone-root-message-delivery.ts:170`) carry described work only (a saved Task is never given to a peer run, `root-task-execution-lifecycle.ts:193-197`), so "described work passes none" holds there.
- A copy can hold several open Tasks. `openTaskReferencesOf` (`task-assignment-eligibility.ts:70-78`) and the existing-copy message ("Your Tasks … are still open; name the Task key in each report", `task-execution-input.ts:70-73`) show this is a supported normal state. `ownerOf` names only the copy's current Task. See AR-006.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-measure-sizes-*`, `SD-measure-summary-*` | Pass | Pass | Pass | Pass (481,648 B → ≈31,126 B; QR-001 ≤10% holds at 6.5%) | Pass | — |
| `evidence/SD-first-line-lengths-*` | Pass | Pass | Pass | Pass (200-character cut) | Pass | — |
| `evidence/SD-task-file-shape-inventory-*` | Pass | Pass | Pass (keys only, 4 shapes, 376 files; Temp tasks separate) | Pass | Pass (design evidence) | — |
| `evidence/SD-codex-0.164-mcp-result-to-model.txt` | Pass | Pass | Pass | Pass (DEC-006) | Pass | — |
| `evidence/first-team-*` | Pass | Pass | N/A (historical) | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior change plus feature; eight triggers evaluated | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination`: about ten owners, three rules, plus hand-written omission in three places; verified by grep | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor now; no deferrals | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership map, removal plan, guard test, `task-text.ts` split for the 494-line service | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 native route | Primary | Pass | Pass | N/A | Pass | Pass (the adapter calls manifest, then rule; renderer passes text) | Pass | Pass |
| DS-002 MCP route | Primary | Pass | Pass | N/A | Pass | Pass (the provider calls manifest, then helper(value), which applies the rule) | Pass | Pass |
| DS-003 agent writes title | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 user writes title | Primary | Pass | Pass | N/A | Pass | Pass (+ return spine through the change feed) | Pass | Pass |
| DS-005 title migration | Primary | Pass | Pass | N/A | Pass | Pass | Pass (frozen validator and derivation inside the migration) | Pass |
| DS-006 list / search | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Rule (bounded local) | Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `tool-result-json.ts` | Pass | Pass | Pass (guard test) | Pass | Guard rule detail: AR-003 |
| `toAgentToolsMcpStructuredJsonResult(value)` | Pass | Pass | Pass | Pass | Removes the two hand-built envelopes |
| `ProjectTaskService` | Pass | Pass | Pass | Pass | Title only through create/update |
| `ProjectStore` | Pass | Pass | Pass | Pass | Reader requires `title`; exact writer |
| Migration folder | Pass | Pass | Pass | Pass | Existing boundary test |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server → `autobyteus-ts/tools/tool-result-json.js` | Pass | Pass | Pass | Pass | Server already imports `autobyteus-ts/tools/*` |
| core tools → rule | Pass | Pass | Pass | Pass | — |
| migration ↔ current code | Pass | Pass | Pass | Pass | Sealed both ways |
| renderer filtering, family serializers, first-line fallback | Pass | Pass (forbidden) | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `toToolResultJson(value): string` | Pass | Pass | Pass | Low | Pass |
| `omitEmptyToolResultFields<T>(value: T): T` | Pass | Pass | Pass | Low | Pass (the return type is imprecise: AR-004) |
| `toAgentToolsMcpStructuredJsonResult(value, {isError?})` | Pass | Pass | Pass | Low | Pass |
| `create_task` + required `title` | Pass | Pass | Pass | Low | Pass |
| `update_task` + optional `title` (Project Tasks only) | Pass | Pass | Pass | Low | Pass |
| `list_project_tasks` (round 3: short entries only, no `task_ids`) | Pass | Pass | Pass | Low | Pass |
| `get_project_task(project_id, task_id)` (round 3) | Pass (one Project Task) | Pass (read-only) | Pass (compound Project + Task; key resolved within the Project) | Low | Pass (fail-closed scope: AR-008) |
| `MemberTaskCapability.ownedTaskOf(caller)` (round 3) | Pass | Pass (read-only query beside the commands; the rename removes "Command", Principle 15) | Pass (`CollaborationMemberExecutionIdentity`, root-asserted like the commands) | Low | Pass |
| `TaskReadScope` built once by `taskReadScopeOf`, checked once in the manifest (round 3) | Pass | Pass (one owner for the policy, Principle 13) | Pass | Low | Pass |
| GraphQL `title: String!` / `TaskWorkerTaskView.title: String` (null = Temp task) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Result JSON | Pass | Pass | Pass (`json-utils.ts` is server-only; core tools must reach the rule) | Pass | Old file removed |
| MCP envelope | Pass | Pass (extend) | N/A | Pass | — |
| Task text rules | Pass | Pass (beside `task-comments.ts`) | Pass | Pass | — |
| Migration mechanism | Pass | Pass (`project-task-keys-v1` pattern, no import) | Pass | Pass | — |
| Guard | Pass | Pass (`tests/architecture/*`) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/agent-tools` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/projects` | Pass | Pass | Pass | Pass | — |
| `app-data-migrations/migrations/project-task-titles` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web` projects | Pass | Pass | Pass | Pass | Temp-task label chosen by kind, not by a missing title |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Result serialization (about 10 owners) | Pass | Pass | Pass | Pass | "Must not become a general JSON utility" is stated |
| Title / description validation (create + 2 update paths + ad-hoc create) | Pass | Pass | Pass | Pass | — |
| Short / full entries | Pass | Pass (inside the manifest) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectTask.title` | Pass | Pass | Pass | N/A | Pass | — |
| Context file in agent results (`contextFiles` in full entries, `attachedContextFiles` in acks): `{name, path}` | Pass | Pass | Pass (one helper, `contextFileEntry`, builds both; SR-008) | N/A | Pass | `path` is absent when `localPath` cannot be resolved, by the rule; this matches full entries |
| `TaskWorkerTaskView.title` | Pass | Pass | Pass | N/A | Pass | — |
| `TaskAcknowledgementView` | Pass | Pass | Pass | N/A | Pass | Not in the inventory: AR-001 |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`, with AR-001. The inventory covers views, GraphQL, the strict change-feed schema, search, the worker view, the web store and labels, the delegated input and the MCP output schemas. It omits `TaskAcknowledgementView`, which builds the `update_task` acknowledgement that REQ-009 requires to carry `title`.

Each domain word keeps one meaning (Principle 15): `Pass`. "title" and "summary" are separated, with a `GLOSSARY.md` entry. Round 2: the ack/list `displayName`/`name` pair is resolved by SR-008 (DEC-019); one context-file shape is used across the family's agent results.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/tool-result-json.ts` | Pass | Pass | Pass | Pass | — |
| `projects/domain/task-text.ts` | Pass | Pass | Pass | Pass | Keeps the service ≤ 500 lines (escalation trigger set) |
| `project-task-tool-contract.ts` / `-manifest.ts` | Pass | Pass | Pass | Pass | Text inventory: AR-002 |
| `migrations/project-task-titles/` | Pass | Pass | N/A | Pass | — |
| `tests/architecture/agent-tool-result-boundaries.test.ts` | Pass | Pass | N/A | Pass | Rule detail: AR-003 |
| `autobyteus-web/utils/projects/taskText.ts` | Pass | Pass | Pass | Pass | Replaces `taskSummary.ts` |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/tool-result-json.ts` | Pass | Pass | Low | Pass | Beside `base-tool.ts` |
| `projects/domain/task-text.ts` | Pass | Pass | Low | Pass | — |
| `migrations/project-task-titles/` | Pass | Pass | Low | Pass | No version in the name (DESIGN rule 8) |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `json-utils.ts`, three family serializers, pretty-printing | Pass | Pass | Pass | Pass | Grep confirms tool callers only |
| Hand-written empty spreads in the manifest | Pass | Pass | Pass | Pass | — |
| `summaryOf` / `SUMMARY_MAX_CHARS`, `meaningSearch` ready object | Pass | Pass | Pass | Pass | — |
| `send_message_to` rejected `target_agent_run_id: null` | Pass | Pass | Pass | Pass | Schema, LLM text and doc |
| Two hand-built MCP envelopes | Pass | Pass | Pass | Pass | — |
| Web `taskSummary.ts` helpers + spec, "no title" comments | Pass | Pass | Pass | Pass | — |
| Manifest doc comment `project-task-tool-manifest.ts:45` ("`projectId` is null …") | Fail (not named) | Pass | Pass | Pass (minor; AR-002) | Becomes false with the rule |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Title read fallback | No | Pass | Pass | Rejected in favour of the migration (DEC-009 a) |
| `summary` beside `title` | No | Pass | Pass | — |
| `target_agent_run_id: null` | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `projects/<id>/tasks/<id>/task.json` gains required `title` | `Migration Required` | Pass (4-shape inventory, 376 files, reader/writer read) | Pass (guideline § 3: a new required fact only old data can supply; user chose DEC-009 a) | Pass: startup-only, prerequisite keys-v1, per-file atomic replace, re-read validation, per-Task dispositions, retry skips titled files, frozen classifier, no current-code import, rollback handled by release note (guideline § 4) | Pass | Implementation note: the frozen classifier must accept exactly what the pre-title `readTaskFile` (`project-store.ts:50-57`) accepts. A stricter one would hide Tasks the app lists today. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Rule → server adapters → Tasks → migration → web → docs/skill → evidence | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Rule semantics | Yes | Pass | Pass | Pass | Arrays keep positions; `0`/`false` kept |
| Adapter / MCP envelope | Yes | Pass | Pass | Pass | — |
| List short / full, search hit, refusal | Yes | Pass | Pass | Pass | — |
| Card preview | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A `project-task-keys-v1` failure holds the title migration back for every Project

- Related approved requirement or established contract: QR-002, AC-004; data migration guideline § 1 ("gate narrowly").
- Relevant behavior ID(s): BEH-002 (SCN-005).
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger: an upgrade from a pre-key release, during which keys-v1 runs in the same startup.
- Support evidence: keys-v1 returns `FAILED` only on a write or validation failure or on a Task already holding a different key (`project-task-keys-v1-app-data-migration.ts:30,114-128`). The runner then raises `AppDataMigrationPrerequisiteError` for the titles migration (`app-data-migration-runner.ts:140-156`).
- Forward path: keys-v1 `FAILED` → titles not run → the reader requires `title` → keyed Tasks of other Projects are not listed until a restart succeeds.
- Lifecycle preconditions and consequence: the trigger requires a filesystem failure or a pre-existing conflicting key. Both are outside the guideline § 5 operating assumptions; neither is a supported workflow. The user's data has already completed keys-v1 (every file has `taskKey`). A restart retries both.
- Reachability: `Not Reachable` (in supported workflows).
- Review consequence: no finding and no machinery. The prerequisite is needed for ordering: without it, unkeyed Tasks would be skipped and stay untitled after keys-v1 retries. Recorded under Residual Risks.

### `MP-002` — A worker's sub-work agent on a peer node has no Task owner there (round 3)

- Related approved requirement or established contract: REQ-015 (worker scope; "a caller that works on no Task may read any Project Task on this node").
- Relevant behavior ID(s): BEH-006.
- Initiating basis kind: `User` (agent).
- Independent product-supported initiating trigger: a worker on Task A delegates described sub-work to an agent on a peer node (remote delegation, `remote-delegation.ts:69`), and that agent's definition lists `get_project_task`.
- Support evidence: remote delegation is a released capability; the peer runs the agent in its own root.
- Forward path: the peer's root has no Task side for A, so `ownerOf` there is `null` → scope `any` → the agent may read the peer node's own Project Tasks.
- Lifecycle preconditions and consequence: the agent reads Tasks of the peer node, never A, which lives on the owning node. That is exactly what a non-worker on that node may do (REQ-015), and the scope is a focus rule (DEC-022), not an access boundary. `list_project_tasks` and `search_project_tasks` are unscoped for every caller.
- Reachability: `Reachable`, with low consequence.
- Review consequence: no finding and no machinery. Recorded under Residual Risks.

### `MP-003` — `ownedTaskOf` raises when resource data is unreadable (round 3)

- Related approved requirement or established contract: REQ-015 ("any other Task is refused with no data").
- Relevant behavior ID(s): BEH-006.
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger: an unreadable `agent_run_resources.json`. The product contains this today (`TaskExecutionResourceService.damaged`; DESIGN rule 7).
- Forward path: `ownerOf` finds no owner and `assertAllReadable` throws (`task-execution-resource-service.ts:248`).
- Consequence: if the scope builder caught this as "no owner", a worker would read any Task (fail-open).
- Reachability: `Reachable`.
- Review consequence: AR-008 (guidance). The error is the tool's refusal, never `any`. No new machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 3, SR-010). The behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported premise. AR-001–AR-008 are non-blocking (AR-004's `task_ids: []` item is obsolete). Each follows directly from an approved requirement and is carried to implementation as guidance.

## Findings

### AR-001 — `update_task` acknowledgement title is missing from the derived-consumer inventory

- Type: Design Impact, non-blocking; severity Low.
- Protects: REQ-009 ("`create_task` / `update_task` acknowledgements … carry `title`").
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: `create_task` builds its ack from a `ProjectTaskView` (`project-task-tool-manifest.ts:159`), which will carry `title`. `update_task` builds its ack from `TaskAcknowledgementView` (`project-task-service.ts:171,180-182`; `models.ts:43-60`), which the design's models row and derived-consumer list do not name. TypeScript will not flag the omission.
- Required update (implementation): add `title` to `TaskAcknowledgementView` for Project Tasks (absent for a Temp task), set it in `updateTaskById`, and emit it in `taskAcknowledgement`. Cover both acks in the per-tool tests.
- Proportionality: one field on one type; no new behavior.
- Recipient: implementation engineer, as guidance.

### AR-002 — Tool texts and comments that state a now-absent `null` or `summary` are not inventoried

- Type: Design Impact, non-blocking; severity Low.
- Protects: REQ-002 ("tool descriptions match the new shapes"), REQ-008, REQ-011 / AC-009, DEC-018 (1).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: `project-task-tool-contract.ts:17` (`update_task`: "projectId is null for a Task with no Project"); `:14` (`list_project_tasks`: "partOf, a taskId or null", "Returns descriptions … context-file references"); `:15` (`search_project_tasks`: "a one-line summary (the description's first line)", "exact: the description or a comment contains the query"); `:16` (`create_task`: return list without `title`); `project-task-tool-manifest.ts:45` (doc comment "`projectId` is null"). The design names only the `send_message_to` text explicitly.
- Required update (implementation): rewrite these sentences to the new shapes (absent means none; `title`; the exact tier includes the title; short/full forms and `task_ids`). Review every platform tool description for "null"/"[]" statements as part of AC-001.
- Recipient: implementation engineer, as guidance.

### AR-003 — The guard test's rule is not concrete enough to separate result serialization from legitimate `JSON.stringify` uses

- Type: Design Impact, non-blocking; severity Low.
- Protects: AC-002.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: `src/agent-tools/**` also uses `JSON.stringify` for non-result purposes: `browser/browser-bridge-client.ts:163` (request body), `mcp/agent-tools-mcp-routes.ts:151` (HTTP body), `mcp/agent-tools-mcp-schema-mapper.ts:35` and `mcp/agent-tools-mcp-result-mapper.ts:107` (clones), and `mcp/configured-mcp/configured-mcp-tool-result-normalizer.ts:43,53` (third-party results, out of scope). The design forbids "`JSON.stringify` of a tool result", but a source-scanning test cannot see intent.
- Required update (implementation): give the guard an explicit rule. Fail on (a) any import of the removed serializers or `json-utils`; (b) `JSON.stringify(` in `src/agent-tools/**` and `send-message-to-tool-result-contract.ts`, except a named allow-list of the files above; (c) a `structuredContent:` literal outside `agent-tools-mcp-structured-json-result.ts`. Record the allow-list with a reason per file in the test.
- Recipient: implementation engineer, as guidance; code review checks it.

### AR-004 — Two interface details to fix at implementation

- Type: Design Impact, non-blocking; severity Low.
- Protects: REQ-001 (rule semantics), REQ-007 (`task_ids`).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence and update:
  - `omitEmptyToolResultFields<T>(value: T): T` returns a JSON round-tripped value: Dates become strings and class instances with `toJSON` become plain objects. Declare it as returning a JSON value (for example `unknown` or a `JsonValue` type), not `T`.
  - (Obsolete since round 3: SR-010 drops `task_ids`, DEC-021.) ~~`task_ids: []` is unspecified.~~
- Recipient: implementation engineer, as guidance.

### AR-005 — The `update_task` acknowledgement's `path` must come from `ProjectTaskService`, not from the manifest reaching the context store (round 2)

- Type: Design Impact, non-blocking; severity Low.
- Protects: REQ-013 / AC-011 (`path` reads the saved file), and the boundary in which the tool manifest depends only on `ProjectTaskService` (Principle 3).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: the manifest row in the design spec says the ack's attached files "take [their path] from the saved-context view, as full entries do", but it does not name who builds that view on the update path. `updateTaskById` returns stored `ProjectTaskContextFile`s without a path (`project-task-service.ts:181`; `models.ts:56`). Only the service's `ProjectTaskViews` resolves `localPath` (`project-task-views.ts:19-23`). `src/agent-tools/**` imports no context store today.
- Required update (implementation), in call order:
  1. `ProjectTaskService.updateTaskById` maps the attached files through its views (as `ProjectTaskViews.projectTask` does), so `TaskAcknowledgementView.attachedContextFiles` becomes `ProjectTaskContextFileView[]`, carrying `localPath`.
  2. The manifest's single `contextFileEntry` maps `{name: displayName, path: localPath}` for both acks and full entries.
  3. The manifest never imports or calls the context store.

  Also add the `create_task` text at `project-task-tool-contract.ts:16` ("`attachedContextFiles [{storedFilename, displayName}]`") to the AR-002 rewrites, and cover AC-011 on both tools.
- Proportionality: a type change on one field plus the existing view mapping; no new owner.
- Recipient: implementation engineer, as guidance.

### AR-006 — A worker holding several open Tasks can read only its current one; the approved text does not state this (round 3)

- Type: Unclear, non-blocking; severity Low.
- Protects: REQ-015 / AC-013, DEC-022.
- Scope status: Within Approved Scope. Changes approved behavior: No. DEC-022, decided by the user, ties the scope to `ownerOf`, which names the copy's current Task.
- Evidence: an existing copy can be given Task B while its Task A stays open. Its message then says "Your Task A is still open; name the Task key in each report" (`task-execution-input.ts:70-73`, `root-task-execution-lifecycle.ts:203`). `ownerOf` returns the current Task, B (`task-execution-resource-service.ts:244-246`). So `get_project_task A` is refused with "You work on B; you can read only that Task", although REQ-015's wording ("its run … holds that Task's assignment") also fits A. The design does not trace this kind of caller (Principle 1, several kinds).
- Required update: Solution Designer: state the consequence in REQ-015 / DEC-022 ("own Task" = the Task the run currently works on, as `ownerOf` answers; earlier still-open Tasks are refused), or put it to the user if it is not what was meant. Implementation: add the two-open-Tasks case to the AC-013 tests.
- Proportionality: a sentence in the requirements and one test. Widening the scope to all open Tasks would be new behavior and needs the user.
- Recipient: Solution Designer (record), implementation engineer (test).

### AR-007 — The existing-copy first message is built by `buildExistingCopyTaskMessage`, not `buildTaskWorkText` (round 3)

- Type: Design Impact, non-blocking; severity Low.
- Protects: REQ-017 / AC-015 (both the new-copy and the existing-copy message name `Task: <key> in Project <projectId>` and the `get_project_task` sentence).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: `root-task-execution-lifecycle.ts:213` builds the existing-copy content with `buildExistingCopyTaskMessage({taskReference, …})` (`task-execution-input.ts:80-93`, header "New Task assigned to you: <key>. …"). The design's First message bullet and DS-008 route both paths through `buildTaskWorkText`.
- Required update (implementation): one Task-line helper in `task-execution-input.ts` (`Task: <key> in Project <projectId>` plus the sentence). `buildTaskWorkText` uses it when given `task`, and `buildExistingCopyTaskMessage` always uses it, taking `projectId` from `resolveAssignment`. Keep the existing-copy header and its other-open-Tasks sentence. Test both in AC-015.
- Recipient: implementation engineer, as guidance.

### AR-008 — Worker scope must fail closed on both routes (round 3)

- Type: Design Impact, non-blocking; severity Medium.
- Protects: REQ-015 / AC-013 ("any other Task is refused with no data").
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence and required update, in call order:
  1. **Error is not "none".** `ownedTaskOf` (through `ownerOf`) throws `TASK_AGENT_RESOURCES_UNAVAILABLE`, wrapped as a `TaskDelegationError` by `ask()`, when no owner is found while resource data is damaged (MP-003). `taskReadScopeOf` must let that error end the call as a refusal, never map it to `{kind: "any"}`. Map it through `projectTaskToolError`, so that `code` stays `TASK_AGENT_RESOURCES_UNAVAILABLE` and not the generic `PROJECT_OPERATION_FAILED`.
  2. **No unscoped native instance.** Unlike the discovery tools, whose unbound instance fails for lack of a lister, an unbound `get_project_task` means `any`. Place the resolver's bound branch before the generic `defaultToolRegistry.createTool(name)` fallthrough (`autobyteus-agent-tool-resolver.ts:123-136`). Do not register `get_project_task` in `registerProjectTaskTools` as a plain class that `createTool` could instantiate with no member context. Follow `ensure…Registered` plus `createBound…` (`list-available-agents-tool.ts`).
  3. **Tests:** a worker on each route (native bound tool; MCP provider with `session.sender.memberExecutionContext`) refused for another Task; damaged resource data → refusal, not data.
- Proportionality: ordering and error mapping in code the design already adds; no new owner.
- Recipient: implementation engineer, as guidance; code review checks it.

## Classification

`Pass`. There is no failure classification. AR-001–AR-005, AR-007 and AR-008 are non-blocking `Design Impact` guidance. AR-006 is a non-blocking `Unclear` item for the Solution Designer to record.

## Recommended Recipient

Implementation engineer (primary pass rule); Solution Designer informed.

## Residual Risks

- ASM-001, a hidden consumer of an empty field. Mitigated by per-family tests on both routes. Verified here: the web `open_tab` handler (`browserToolExecutionSucceededHandler.ts`) reads a non-empty `tab_id`, and the file-change processor prefers arguments over the media result object.
- AGY/Grok handling of the two MCP copies is unknown; this design leaves it unchanged.
- MP-001 (Not Reachable): a keys-v1 failure on a pre-key upgrade holds titles back for every Project until a restart succeeds.
- Rollback after the migration hides Tasks that an older build saves (it drops `title`). The release notes must say rolling back is not supported (guideline § 4).
- MP-002 (round 3): a worker's sub-work agent on a peer node is on no Task there, so it reads that node's Tasks like any non-worker. Accepted; the scope is a focus rule (DEC-022).
- A worker can still see every Task's short entry through `list_project_tasks` / `search_project_tasks` when its definition lists them. `get_project_task`'s scope limits full reads only, as approved.
- (Resolved in round 2 by SR-008 / DEC-019.) The vocabulary pair inside the Project Task family: acks now use `{name, path}` like full entries.
- `project-task-service.ts` sits at the 500-line limit. The `task-text.ts` move is required, and the escalation trigger is set.
- Doc anchors: `autobyteus-web/docs/settings.md:811` and `agent_execution_architecture.md:592` link to `projects.md#task-summaries-in-the-workspaces-tree`. Keep the anchor, or update the links when `projects.md` changes.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Not Reachable; MP-002 Reachable, low consequence, no machinery; MP-003 Reachable, handled by fail-closed ordering, AR-008)
- Notes: ARCH-REV-003 on SR-010 (on top of ARCH-REV-001 / -002). Non-blocking AR-001–AR-008 go to implementation as guidance; AR-006 also to the Solution Designer to record.
