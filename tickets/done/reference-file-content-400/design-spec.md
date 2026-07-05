# Design Spec

## Current-State Read

The reported Team > Tasks reference preview follows the correct task-owned identity route on the frontend, but task-delegation reference creation does not enforce the same absolute-path invariant that task reference content readback already requires.

Current failing flow:

`Agent calls delegate_task with reference_files:["math_problem_train_bird.txt"] -> task input parser accepts non-empty string -> TaskDelegationInputResolver trims path -> TaskDelegationService persists TaskReferenceFile.path="math_problem_train_bird.txt" -> TeamTaskReferenceViewer requests content by teamRunId+taskId+referenceId -> TaskDelegationReferenceContentService rejects non-absolute stored path -> REST 400 -> viewer displays error`

The persisted failing task record is:

- root team run: `nested_classroom_test_team_7d4b889e2d1a4d1aaaedc5414733676a`
- task: `task_0001`
- reference id: `task-reference:0:math_problem_train_bird.txt`
- stored path: `math_problem_train_bird.txt`
- real file if workspace-resolved: `/Users/normy/.autobyteus/server-data/temp_workspace/math_problem_train_bird.txt`

Adjacent Team Communication/message references do not have this mismatch:

- `send_message_to` tool and field descriptions state that `reference_files` are absolute local file paths.
- `send-message-to-tool-argument-parser.ts` validates and rejects non-absolute reference files before dispatch.
- Team communication projection normalization uses equivalent absolute-path validation.
- `TeamCommunicationContentService` fetches by identity and then streams only absolute stored paths.

The user's clarified target is **no backward compatibility** and task references should mimic message reference files. Therefore the target design is not to resolve relative task references through workspace metadata. The target is to prevent relative task references from being persisted.

Current ownership boundaries:

- Frontend task reference viewer owns presentation and content-route construction by task identity only.
- `TaskDelegationService` / `TaskDelegationInputResolver` own task-delegation input normalization and task record creation/update invariants.
- `TaskDelegationReferenceContentService` owns task reference identity-to-readable-stream resolution and is already absolute-only.
- Agent/team communication currently owns absolute-reference validation in duplicated files.

Current coupling/fragmentation:

- Task-delegation reference input validation is weaker than task-reference readback validation.
- Agent communication and team communication maintain near-duplicate absolute reference-file validators.
- Adding task validation by copying those files would create a third duplicated policy.

## Intended Change

Make task-delegation reference files absolute-only at the authoritative task input boundary.

Target behavior:

1. `delegate_task`, `submit_task_result`, and `review_task_result` accept `reference_files` only when every entry is an absolute local filesystem path.
2. Invalid entries are rejected before task records, submissions, or review updates are persisted.
3. Task reference content readback remains absolute-only and identity-owned.
4. Existing relative task reference records remain invalid; no migration, fallback, or workspace-root resolution is added.
5. Task-delegation tool schemas and runtime instructions clearly tell agents to use absolute local file paths.
6. Existing message reference behavior remains unchanged but should reuse the same shared validation owner when practical.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Tightening
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Duplicated Policy Or Coordination
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small and local
- Evidence: Task content readback requires absolute stored paths; task inputs currently allow relative strings; message references already enforce absolute paths at input; agent/team communication validators are duplicated.
- Design response: introduce/reuse one explicit absolute-local-reference-file validation owner, route task-delegation reference normalization through it at the task input/service boundary, and update task tool guidance.
- Refactor rationale: Copying message validation into task delegation would increase duplicated policy. Supporting relative task readback would violate the user's no-backward-compatibility clarification and the design principle preferring clean-cut replacement.
- Intentional deferrals and residual risk, if any: Route-safe hashed task reference IDs remain out of scope because the reported issue is path validity, not reference ID routing. Existing relative task records stay invalid by design.

## Terminology

- `Task reference file`: a file path supplied through task-delegation `reference_files` and stored on task records/submissions/reviews.
- `Message reference file`: a file path supplied through `send_message_to.reference_files` and stored on Team Communication messages.
- `Explicit absolute local reference file path`: a non-empty, local filesystem path string that is absolute and safe to persist as a reference-file attachment.
- `Stored reference path`: the normalized path persisted on a reference record.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spines
2. ownership and authoritative boundaries
3. shared validation owner
4. file responsibilities and removals
5. test and migration/refactor sequence

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent calls task-delegation tool with reference files | Task record/submission/review persists only absolute reference paths or rejects input | Task Delegation Input Boundary | Prevents new invalid task reference records. |
| DS-002 | Primary End-to-End | User clicks task reference in Team > Tasks | File content stream or existing invalid-path error | Task Delegation Reference Content | Confirms readback remains identity-owned and absolute-only. |
| DS-003 | Bounded Local | Raw `reference_files` input | Normalized absolute path list or validation error | Absolute Local Reference File Validator | Single policy used by task and message reference surfaces. |
| DS-004 | Return-Event | Invalid task reference file input | Tool error result and no persistence | Task Delegation Tool/Service Error Serialization | Ensures relative paths fail early and visibly. |

## Primary Execution Spine(s)

- Task reference creation spine:
  `Agent tool call -> Task tool parser -> TaskDelegationService/TaskDelegationInputResolver -> Absolute Local Reference File Validator -> Task record/submission/review ledger persistence -> task lifecycle notification/work packet`
- Task reference preview spine:
  `Task reference row click -> TeamTaskReferenceViewer content URL -> Task Delegation REST route -> TaskDelegationReferenceContentService -> absolute stored path check/readable stream -> FileViewer preview/error`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | An agent supplies task `reference_files`. The tool surface parses shape, the task-delegation input boundary validates the reference-file invariant, and only normalized absolute paths reach task persistence. | Tool call, task input boundary, validator, ledger persistence | Task Delegation Input Boundary | Tool schema text, error serialization, dedupe/normalization. |
| DS-002 | The frontend requests content by stored task identity. The backend resolves the task reference and streams only if the stored path is absolute/readable; old relative records remain invalid. | Viewer route, REST route, content service, filesystem stream | Task Delegation Reference Content | MIME lookup, readable file checks. |
| DS-003 | A shared validator normalizes explicit reference-file inputs and rejects empty, relative, protocol, route-template, null-byte, or relative-segment paths. | Raw path list, normalized path list, validation error | Absolute Local Reference File Validator | Existing message wrapper compatibility. |
| DS-004 | Invalid task inputs become tool-level validation errors before task ledger mutation. | Validation error, tool serializer, no persistence | Task Delegation Tool/Service Error Serialization | Error wording consistency. |

## Spine Actors / Main-Line Nodes

- `delegate_task`, `submit_task_result`, `review_task_result` tool surfaces
- `task-delegation-tool-input-parsers.ts`
- `TaskDelegationToolService` / tool manifest execution callback
- `TaskDelegationService`
- `TaskDelegationInputResolver`
- shared absolute local reference-file validator
- `TaskDelegationLedger` / task record persistence
- `TeamTaskReferenceViewer.vue`
- `TaskDelegationReferenceContentService`

## Ownership Map

- Task-delegation tool parsers own raw tool argument shape validation: object shape, required fields, enum values, and conversion to task input DTOs.
- `TaskDelegationService` and `TaskDelegationInputResolver` own domain-level task input normalization and invariants before ledger mutation.
- The shared absolute local reference-file validator owns reusable path-string normalization and safety checks for explicit reference-file attachments.
- `TaskDelegationReferenceContentService` owns content readback by task identity and absolute stored path only.
- Team Communication remains the owner of message projection/readback; it can reuse the shared validator but must not depend on task-delegation internals.
- Frontend viewer owns no filesystem path authority.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamTaskReferenceViewer.vue` | Task Delegation Reference Content route/service | Supplies task-owned REST URL to the generic viewer. | Path resolution or fallback to workspace file routes. |
| `task-delegation-tool-input-parsers.ts` | TaskDelegationService/InputResolver for domain invariants | Converts raw model tool args into typed task inputs. | Final reference-file domain policy if service boundary can also receive inputs. |
| Agent/team communication reference wrapper files | Shared validator | Preserve existing import names while removing duplicated implementation. | Divergent absolute-path policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Permissive task `reference_files` normalization that only trims strings | It allows records content readback rejects. | Shared absolute local reference-file validator via `TaskDelegationInputResolver`. | In This Change | Applies to delegate, submit, and review reference files. |
| Vague task tool descriptions: “file/artifact paths or references” | It does not communicate absolute-only invariant. | Absolute-local-path wording matching `send_message_to`. | In This Change | Update schemas, manifest text if needed, and runtime instructions. |
| Workspace-relative task reference readback design/prototype | User rejected backward compatibility; clean-cut design is required. | Absolute-only input validation. | In This Change | Do not add workspace-root resolver or relative fallback. |
| Duplicated explicit reference validators in agent/team communication | Adding task validation would otherwise create a third copy. | Shared absolute local reference-file validation owner. | In This Change | Wrappers may remain as thin compatibility exports if that reduces churn. |
| Historical relative record repair/migration | Not required and would preserve legacy behavior. | No action; invalid stored paths remain invalid. | In This Change | Record as explicit rejection. |

## Return Or Event Spine(s) (If Applicable)

- Invalid task input return spine: `Validator error -> TaskDelegationError(VALIDATION_ERROR) or parser error -> tool error serialization -> model/user sees invalid reference_files message -> no ledger persistence`.
- Invalid historical readback return spine: `Stored relative path -> TaskDelegationReferenceContentError(INVALID_REFERENCE_PATH) -> REST 400 -> viewer error`.
- Missing/unavailable absolute file return spine: `Absolute stored path missing/not-file -> REFERENCE_CONTENT_UNAVAILABLE -> REST 404 -> viewer error`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Absolute Local Reference File Validator
  - Chain: `raw unknown/list -> array check -> string check -> display normalization -> local/protocol check -> absolute check -> invalid segment check -> dedupe -> normalized absolute list | validation error`
  - Why this matters: task, agent communication, and team communication must not maintain divergent path rules.
- Parent owner: TaskDelegationInputResolver
  - Chain: `task reference_files -> shared validator -> TaskDelegationError on invalid -> normalized strings -> TaskReferenceFile record builder`
  - Why this matters: domain invariants are enforced before task ledger mutation.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool parameter wording | DS-001 | Tool parser/service | Tell agents absolute paths are required. | Reduces invalid tool calls. | Prompt wording alone cannot enforce invariant. |
| Error serialization | DS-004 | Tool surface | Convert domain/parser errors into tool result strings. | Existing user/model feedback path. | Validation policy would be hidden in transport formatting. |
| MIME lookup | DS-002 | Content service | Choose response content type for readable files. | Existing preview behavior. | Would pollute validation with filesystem concerns. |
| File readability check | DS-002 | Content service | Distinguish invalid path from unavailable/unreadable content. | Existing REST behavior. | Validator would become a filesystem reader. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Absolute reference-file validation | Agent/Team Communication validators | Extract shared owner and reuse | Existing logic is correct but duplicated; task needs same policy. | Existing files are communication-owned and should not become task dependencies directly. |
| Task input normalization | Task Delegation `TaskDelegationInputResolver` | Extend | Existing domain boundary before record creation. | N/A |
| Task reference content readback | Task Delegation content service | Reuse unchanged | Already absolute-only and identity-owned. | N/A |
| Workspace metadata | Run History metadata | Do not use | No relative fallback in refined design. | N/A |
| Frontend file explorer | Files tab | Do not use | Task reference preview must stay task-identity-owned. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Task Delegation | Task lifecycle inputs, records, submissions, reviews, reference metadata. | DS-001, DS-002, DS-004 | Task Delegation Input Boundary / Content Service | Extend | Add absolute reference validation before persistence. |
| Reference Files / Explicit Local Reference Validation | Normalizing and validating explicit absolute local reference path lists. | DS-003 | Task + Message reference owners | Create New small shared owner | No filesystem reads. |
| Agent Communication | `send_message_to` references. | DS-003 | Message tool surface | Reuse shared validator | Behavior unchanged. |
| Team Communication | Message projection and content readback. | DS-002, DS-003 | Message projection/content | Reuse shared validator | Behavior unchanged. |
| Frontend Team Tasks | Reference selection and preview shell. | DS-002 | UI route wrapper | Reuse unchanged | No fallback path authority. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/reference-files/absolute-local-reference-files.ts` | Reference Files | Absolute local reference-file validation | Normalize/validate explicit absolute local reference path lists; return normalized list or validation error. | Pure reusable policy, no task/message lifecycle or filesystem reads. | Uses `agent-run-file-path-identity` normalization/absolute checks. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Task Delegation | Task input domain invariant | Enforce absolute reference files for delegate inputs and expose reference normalization used by service paths. | Existing task input authority. | Calls shared validator. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Task Delegation | Task lifecycle orchestration | Continue routing delegate/submit/review reference files through input resolver before ledger mutation. | Existing lifecycle owner. | Uses input resolver. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Task tool surface | Raw shape parser | Keep raw zod shape validation; optionally normalize early only if it preserves service authority. | Tool-surface concern only. | May share error wording if needed. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Task tool surface | Tool schema descriptions | State absolute local path requirement for all task `reference_files`. | Existing parameter description owner. | N/A |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Task tool surface | Tool-level descriptions/execution wiring | Mention absolute reference requirement where tool descriptions discuss `reference_files`. | Existing manifest owner. | N/A |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Team execution | Runtime instruction composition | Add explicit task-delegation reference_files guidance. | Existing runtime instruction owner. | N/A |
| `autobyteus-server-ts/src/agent-communication/services/agent-communication-reference-files.ts` | Agent Communication | Message reference wrapper | Replace duplicated implementation with shared validator exports/adapters. | Preserves current imports while removing duplicate logic. | Shared validator. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-reference-files.ts` | Team Communication | Message projection reference wrapper | Replace duplicated implementation with shared validator exports/adapters. | Preserves current imports while removing duplicate logic. | Shared validator. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Absolute local reference path validation and normalization | `src/services/reference-files/absolute-local-reference-files.ts` | Reference Files / Explicit Local Reference Validation | Same policy is needed by agent communication, team communication, and task delegation. | Yes | Yes | Generic file read/authorization service. |
| Reference validation error shape | Same file | Reference Files | Keeps index/reason semantics consistent. | Yes | Yes | Transport-specific error formatter. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskReferenceFile.path` | Yes after design: normalized absolute local filesystem path. | N/A | Medium today because relative paths can be stored. | Enforce absolute before record creation/update. |
| Shared validation result | Yes: `ok` list or indexed reason. | Yes | Low | Keep independent from task/message error classes. |
| Message reference path | Yes: normalized absolute local filesystem path. | N/A | Low | Preserve behavior through shared validator. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/reference-files/absolute-local-reference-files.ts` | Reference Files | Absolute local reference-file validation | Validate/dedupe/normalize explicit absolute local reference file lists. | Centralizes repeated policy. | Agent-run file path identity helpers. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Task Delegation | Task input invariant | Convert invalid task references into `TaskDelegationError("VALIDATION_ERROR", ...)`; return normalized absolute strings. | Existing domain input owner. | Shared validator. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Task Delegation | Task lifecycle owner | Ensure delegate/submit/review paths still call resolver before `normalizeTaskDelegationReferenceFiles()` and ledger mutations. | Existing orchestration owner. | Input resolver. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts` | Task Delegation | Reference content owner | Keep absolute stored path validation and file streaming. | Existing content boundary. | N/A |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Task Tool Surface | Parameter docs | Absolute-path wording for delegate/submit/review `reference_files`. | Existing schema owner. | N/A |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Task Tool Surface | Tool descriptions | Absolute-path wording where tool descriptions mention references. | Existing manifest owner. | N/A |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Team Execution | Runtime instructions | Tell agents to provide absolute paths and use `realpath` when needed. | Existing instruction owner. | N/A |
| `autobyteus-server-ts/src/agent-communication/services/agent-communication-reference-files.ts` | Agent Communication | Wrapper for existing imports | Delegate validation to shared owner. | Reduces churn while removing duplicated logic. | Shared validator. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-reference-files.ts` | Team Communication | Wrapper for existing imports | Delegate validation to shared owner. | Reduces churn while removing duplicated logic. | Shared validator. |

## Ownership Boundaries

`TaskDelegationInputResolver` is the task-side authoritative boundary for reference-file input validity. Any path that reaches task ledger mutation should have passed through it. Tool parser validation can reject malformed raw shapes, but must not become the only owner of the absolute-path invariant.

The shared validator owns only path-list validation. It must not know about task IDs, message IDs, team runs, REST codes, ledger state, or filesystem readability.

`TaskDelegationReferenceContentService` remains the authoritative readback boundary. It must not infer workspace roots or call workspace file explorer APIs.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationInputResolver.normalizeReferenceFiles` | Shared validator, domain error mapping | TaskDelegationService delegate/submit/review flows | Ledger receives raw `input.reference_files`. | Extend resolver method/error details. |
| Shared absolute local reference validator | Path display normalization, absolute/local/segment checks, dedupe | Task resolver, agent communication wrapper, team communication wrapper | Each subsystem copies validator logic. | Add shared options or result fields. |
| `TaskDelegationReferenceContentService.resolveContent` | Task reference lookup, absolute-path check, readability, stream | REST route | Frontend/workspace file explorer fallback reads task references. | Extend content service if needed, not route bypass. |

## Dependency Rules

Allowed:

- Task-delegation input resolver may depend on the shared absolute local reference-file validator.
- Task-delegation service may depend on input resolver and task reference record builder.
- Agent communication and team communication reference wrapper files may depend on the shared validator.
- Shared validator may depend on Node `path` and existing agent-run file path identity helpers.
- Frontend task viewer may depend on `teamRunId`, `taskId`, and `referenceId` only.

Forbidden:

- Do not add workspace-root resolution to task reference content readback.
- Do not let the frontend pass `reference.path` as content authority.
- Do not create task-specific, agent-communication-specific, and team-communication-specific copies of the same validator.
- Do not migrate or rewrite old task records.
- Do not relax `send_message_to.reference_files`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegate_task({ target, description, reference_files? })` | Task creation | Create delegated task with optional absolute local reference files. | `reference_files: string[]` where each entry is absolute local path. | Relative paths rejected. |
| `submit_task_result({ message, reference_files? })` | Task result submission | Submit result with optional absolute local reference files. | Same. | Rejected before update. |
| `review_task_result({ task_id, decision, comment?, reference_files? })` | Task review | Review result with optional absolute local reference files. | Same. | Rejected before review mutation. |
| `normalizeExplicitAbsoluteLocalReferenceFiles(raw)` | Shared validation | Validate/dedupe/normalize explicit references. | unknown/raw array -> result. | No filesystem checks. |
| `GET /team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content` | Task reference content | Stream stored absolute reference content. | task identity triple. | Unchanged route. |

## API / Data Contract Examples

Good task input:

```json
{
  "target": { "kind": "team", "name": "StudentStudyGroup" },
  "description": "Solve the attached problem.",
  "reference_files": ["/Users/normy/.autobyteus/server-data/temp_workspace/math_problem_train_bird.txt"]
}
```

Bad task input:

```json
{
  "target": { "kind": "team", "name": "StudentStudyGroup" },
  "description": "Solve the attached problem.",
  "reference_files": ["math_problem_train_bird.txt"]
}
```

Expected bad-input outcome: validation error, no task record created.

## Persistence / Data Shape

- New/updated task records should only persist normalized absolute local paths in `referenceFiles[].path`.
- `referenceId` generation can remain unchanged for this scope, but it will now be based on normalized absolute paths for new references.
- Existing records with relative paths are not migrated and may remain unreadable/invalid through the task reference content endpoint.

## Validation / Error Semantics

Shared validator rejects:

- missing/non-array `reference_files` when the caller expects an array;
- non-string entries;
- empty strings after trimming;
- null bytes;
- protocol/URL paths such as `file://...` or `https://...`;
- non-absolute paths;
- `.` or `..` path segments;
- route-template-shaped segments such as `:id`, `{id}`, or similar existing invalid segment checks.

Task delegation maps validator failures to task validation errors with wording equivalent to:

`reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path must be absolute.`

## Testing / Coverage Plan

Implementation-scoped tests should include:

- Shared validator unit tests:
  - accepts Unix absolute paths;
  - accepts/dedupes normalized equivalent absolute paths where current behavior expects it;
  - rejects relative paths, protocol/URL paths, null bytes, route-template segments, and `.`/`..` segments;
  - preserves existing message validator behavior.
- Task delegation input/service tests:
  - `delegate_task` rejects relative `reference_files` before ledger/record creation;
  - `submit_task_result` rejects relative references before submission persistence;
  - `review_task_result` rejects relative references before review persistence;
  - absolute references still create expected `TaskReferenceFile` records.
- Existing task content service/route tests:
  - absolute stored path still streams content;
  - non-absolute stored path still maps to `INVALID_REFERENCE_PATH`/400.
- Message reference tests:
  - `send_message_to.reference_files` still rejects relative paths after shared-validator extraction.

## Migration / Refactor Sequence

1. Add shared absolute local reference-file validator with unit tests.
2. Refactor agent communication and team communication reference validation wrappers to delegate to the shared validator; keep public export names where useful to reduce churn.
3. Update `TaskDelegationInputResolver.normalizeReferenceFiles()` to call the shared validator and throw `TaskDelegationError("VALIDATION_ERROR", ...)` on invalid references.
4. Verify `TaskDelegationService` delegate/submit/review flows all pass reference files through the resolver before ledger mutation.
5. Update task tool schemas, manifest descriptions, and runtime instructions to state absolute local paths are required.
6. Add task-delegation tests for rejection and absolute success.
7. Ensure no workspace-relative task reference resolver, workspace metadata dependency, or historical migration path is introduced.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Resolve relative task references against team workspace metadata | Would make the existing reported record preview successfully. | Rejected | User explicitly said no backward compatibility; reject relative inputs before persistence instead. |
| Migrate historical relative task records to absolute paths | Could repair old records. | Rejected | Historical repair is out of scope; old relative records remain invalid. |
| Keep both relative and absolute task reference semantics | Would preserve runtime convenience. | Rejected | Clean-cut absolute-only contract matching message references. |
| Add frontend fallback to Files tab/workspace route | Would hide backend mismatch. | Rejected | Frontend must not own path authority for task references. |
| Copy message validators into task delegation | Fast local patch. | Rejected | Would create a third duplicated absolute-reference policy. Extract/reuse shared validator instead. |

## Derived Layering (If Useful)

- UI layer: Team Tasks selection and task-owned URL wrapper.
- Tool surface layer: raw task-delegation tool schemas/parsers and runtime instructions.
- Domain/control layer: TaskDelegationService/InputResolver.
- Shared policy layer: absolute local reference-file validator.
- Persistence/content layer: task ledger/records and task reference content service.

Layering is explanatory only; authoritative ownership remains the deciding design rule.

## Observability / Debuggability

- Preserve existing tool error serialization for validation failures.
- Validation errors should identify the failing `reference_files` index when possible.
- Existing REST 400 for invalid stored task reference paths remains useful for historical bad records.

## Risks / Tradeoffs

- Existing relative task records will not preview. This is an accepted tradeoff under the clarified no-backward-compatibility requirement.
- Agents may need one extra `realpath` call before delegating tasks with newly created files. Tool/runtime guidance should make this explicit.
- Shared validator extraction could cause broad test churn if export names are changed too aggressively. Prefer wrapper exports where they reduce unrelated changes while still removing duplicated implementation.

## Implementation Checklist

- [ ] Add `src/services/reference-files/absolute-local-reference-files.ts`.
- [ ] Refactor agent communication reference validation wrapper to use shared validator.
- [ ] Refactor team communication reference validation wrapper to use shared validator.
- [ ] Enforce shared validation in `TaskDelegationInputResolver.normalizeReferenceFiles()`.
- [ ] Confirm all `TaskDelegationService` reference-file paths flow through the resolver before persistence.
- [ ] Update task tool parameter schema descriptions.
- [ ] Update task tool manifest description if it mentions optional `reference_files` without absolute-path wording.
- [ ] Update member runtime task delegation instructions.
- [ ] Add/update unit tests for validator, task delegation input behavior, and message no-regression.
- [ ] Do not add workspace-relative readback, metadata resolver, migration, or frontend fallback.

## Open Questions

None blocking. The user explicitly resolved the prior compatibility question: no backward compatibility.

## Downstream Handoff Notes

Implementation should start from the clean worktree state plus these artifacts. A previous workspace-relative resolver draft was removed from the worktree and must not be revived for this scope.
