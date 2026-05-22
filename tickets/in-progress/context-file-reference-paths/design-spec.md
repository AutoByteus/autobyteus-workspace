# Design Spec

## Current-State Read

Frontend agent input already carries attached context files as structured attachment records. Websocket, GraphQL, and application-host entrypoints convert those records into `AgentInputUserMessage.contextFiles`. The loss is not at the attachment-ingress boundary; it is at runtime input construction.

Current runtime construction has three in-scope paths:

1. Native AutoByteus runtime: `AgentInputPipeline` runs input processors, then `buildLLMUserMessage` converts `AgentInputUserMessage` into provider-neutral `LLMUserMessage`. Server `UserInputContextBuildingProcessor` resolves local files and finalized `/rest/.../context-files/...` locators to absolute local paths before `buildLLMUserMessage`, but `buildLLMUserMessage` currently copies text unchanged and only places media URIs into `image_urls`/`audio_urls`/`video_urls`.
2. Codex runtime: `CodexThread.sendTurn` bypasses `AgentInputPipeline` and calls `toCodexUserInput`. That mapper converts image context files into `localImage`/image input items, but it does not include those image paths in the text item.
3. Claude Agent SDK runtime: `ClaudeSession.sendTurn` bypasses `AgentInputPipeline` and sends/caches only `message.content`; `message.contextFiles` are not rendered. Because it bypasses `UserInputContextBuildingProcessor`, it must use `ContextFileLocalPathResolver` through the shared utility's `resolveUri` callback to turn finalized `/rest/.../context-files/...` locators into absolute local paths.

Existing inter-agent `send_message_to.reference_files` behavior is out of scope. If an agent explicitly passes `reference_files`, that path already works; if not, that is agent reasoning. This ticket changes only the initial user/runtime message constructed from frontend context-file attachments.

## Intended Change

Add one small current-user-context-file reference text utility and use it only in the three runtime input construction boundaries above. For current user messages with local context files, the utility appends a `Reference files:` section containing deduped absolute local paths that are already present or can be resolved by the relevant runtime path resolver. Both Codex and Claude direct runtime adapters must pass `ContextFileLocalPathResolver.resolve(...)` as the resolver callback for finalized context-file locators.

The same context files must continue to flow to raw multimodal/runtime-specific payload fields exactly as before.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small targeted extraction for the three user/runtime input paths
- Evidence: `multimodal-message-builder.ts` omits text path references while preserving media arrays; `codex-user-input-mapper.ts` omits image paths from text; `claude-session.ts` ignores context files.
- Design response: Add a shared current-context-file reference block utility in the agent message layer, then call it from native, Codex, and Claude user-message construction. For Claude, call it with `ContextFileLocalPathResolver.resolve(...)` before content validation/cache/execution.
- Refactor rationale: The same path filtering/dedupe/append logic is needed in three in-scope runtime input constructors; a tiny shared utility prevents inconsistent behavior without touching inter-agent delivery. Server direct runtimes supply resolver callbacks so the utility stays storage-agnostic.
- Intentional deferrals and residual risk, if any: Codex relative path resolution remains deferred because the mapper currently lacks workspace-root context and the requested behavior is about server-side absolute paths. Claude raw multimodal support remains out of scope. Inter-agent `send_message_to` behavior remains unchanged.

## Terminology

- `ContextFile`: existing `autobyteus-ts` value object containing `uri`, `fileType`, `fileName`, and metadata.
- `Reference file path`: a local absolute filesystem path shown in the initial runtime-visible user message so an agent can later copy it into explicit handoff metadata if needed.
- `Reference files block`: the text section headed `Reference files:` followed by bullet paths.
- `Runtime input boundary`: the owner that turns `AgentInputUserMessage` into the native/Codex/Claude provider input shape.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: for in-scope current-user-context-file paths, use only the standard `Reference files:` block. Do not add parallel headings such as `Attached files:`. Do not modify existing inter-agent builders for this ticket.
- Codex local-file `Context file: <path>` lines should not remain as a second local-path format when those files are eligible for the new `Reference files:` block. Non-local informational URI lines may remain only for values that are not local reference files.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Frontend user sends text + context files | Native runtime LLM request + memory trace includes media and `Reference files` text | Native runtime input composition (`buildLLMUserMessage`) | Covers AutoByteus multimodal runtimes and provider-neutral history/memory behavior |
| DS-002 | Primary End-to-End | Frontend user sends text + context files | Codex app-server turn input contains image items and text reference paths | Codex runtime input mapper | Covers direct Codex image/raw input path loss |
| DS-003 | Primary End-to-End | Frontend user sends text + context files | Claude SDK turn text includes reference paths | Claude session turn sender | Covers direct runtime that only uses text in current implementation |
| DS-004 | Bounded Local | Raw context-file URI/locator | Deduped local absolute path list + appended user-message section | Current-context-file reference utility | Centralizes path filtering, dedupe, and append behavior for the three in-scope input paths |

## Primary Execution Spine(s)

- DS-001 Native: `Frontend composer -> Websocket/GraphQL/Application input -> AgentInputUserMessage -> UserInputContextBuildingProcessor -> buildLLMUserMessage -> LLMRequestAssembler/provider renderer`
- DS-002 Codex: `Frontend composer -> Websocket/Application input -> AgentInputUserMessage -> toCodexUserInput -> Codex app-server turn/start`
- DS-003 Claude: `Frontend composer -> Websocket/Application input -> AgentInputUserMessage -> ClaudeSession.sendTurn + ContextFileLocalPathResolver callback -> Claude SDK query`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Native runtime receives the same context files, path-normalizes them through existing processors, then builds one `LLMUserMessage` whose content has the reference block and whose media arrays are unchanged. | Composer input, `AgentInputUserMessage`, input processor pipeline, `LLMUserMessage` | `buildLLMUserMessage` | Context-file local path resolver before builder, current-context-file reference utility, memory ingest |
| DS-002 | Codex runtime maps the same message directly into app-server input items. Image items remain raw/multimodal, while the text item now also carries local file paths. | Composer input, `AgentInputUserMessage`, Codex input item list | `toCodexUserInput` | Context-file local path resolver, current-context-file reference utility |
| DS-003 | Claude runtime prepares one text string from the input message and context file paths before caching and executing the turn. Because it bypasses native input processors, finalized context-file locators are resolved through `ContextFileLocalPathResolver` before the utility filters/appends paths. | Composer input, `AgentInputUserMessage`, Claude turn content | `ClaudeSession.sendTurn` | Context-file local path resolver, current-context-file reference utility |
| DS-004 | The utility receives context-file path candidates and produces one deterministic appended block, so runtime owners do not implement their own path filtering or duplicate sections. | Path candidates, normalized path list, text block | Shared current-context-file reference utility | Optional URI resolver callback supplied by server runtimes |

## Spine Actors / Main-Line Nodes

- Frontend composer/input service
- Backend input command handlers (`agent-stream-handler`, `agent-team-stream-handler`, GraphQL converter, application host)
- `AgentInputUserMessage`
- Native `buildLLMUserMessage`
- Codex `toCodexUserInput`
- Claude `ClaudeSession.sendTurn`
- Current-context-file reference utility

## Ownership Map

- Frontend composer owns collecting and sending attachment locators; it must not own backend filesystem path rendering.
- Backend command handlers own translating transport payloads into `ContextFile` records; they must not own runtime-specific prompt formatting.
- `UserInputContextBuildingProcessor` owns native runtime context-file path normalization and readable text-context injection.
- `buildLLMUserMessage` owns native conversion to `LLMUserMessage`, including appending current context-file reference paths after processors have normalized them.
- `toCodexUserInput` owns Codex-specific input item mapping and must call the current-context-file reference utility for text references.
- `ClaudeSession.sendTurn` owns the Claude turn content string and must call the current-context-file reference utility with `ContextFileLocalPathResolver.resolve(...)` before content validation, caching, and execution.
- The new shared utility owns heading/bullet format, dedupe, local-path normalization, optional URI resolver application, and idempotent append for current user context files only.
- Existing inter-agent `send_message_to` builders own agent-authored handoff messages and are not changed.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunCommandCoordinator.postUserMessage` | Runtime-specific `AgentRunBackend.postUserMessage` | Command dedupe/status handoff | Reference-file text formatting |
| `TeamRun.postMessage` | Team backend/member runtime | Team target selection and runtime dispatch | Reference block policy |
| Websocket `SEND_MESSAGE` handlers | Agent/team run command owners | Transport decoding and acknowledgement | Provider prompt formatting |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Codex ad hoc local `Context file: <path>` line for local context files | Would create a second path-reference format alongside `Reference files:` for the same user-context-file subject | Current-context-file reference utility | In This Change | Non-local informational URI lines may remain only for values ineligible as local reference files |
| Any newly introduced provider-specific reference headings | Would fragment the user-context-file path convention | Current-context-file reference utility | In This Change | Do not create `Attached files:` / `Context files:` duplicates |

## Return Or Event Spine(s) (If Applicable)

Not in scope. Existing inter-agent message delivery and `send_message_to.reference_files` behavior remain unchanged.

## Bounded Local / Internal Spines (If Applicable)

- DS-004 utility local flow: `ContextFile/paths -> optional resolver -> local absolute path normalizer -> first-seen dedupe -> section builder -> idempotent append`.
- Parent owner: shared current-context-file reference utility in `autobyteus-ts/src/agent/message/`.
- Why it matters: This small local flow prevents the three in-scope runtime input constructors from implementing inconsistent path filtering and block formatting.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context-file local path resolution | DS-001, DS-002, DS-003 | Runtime input composers | Resolve finalized REST locators to local paths and reject unresolved/non-local values. Native gets this before the builder; Codex and Claude direct runtime adapters pass the resolver callback into the utility. | Current stored uploads are not initially absolute paths | Adapters would emit `/rest/...` routes as fake filesystem paths or omit resolvable uploaded files |
| Current-context-file block rendering | DS-001, DS-002, DS-003, DS-004 | Runtime input boundaries | Consistent heading, bullets, dedupe, idempotent append | Three in-scope runtime paths need the same current-user-message behavior | Divergent formats make later agent reasoning less reliable |
| Media payload mapping | DS-001, DS-002 | Native/Codex runtime owners | Keep image/audio/video raw inputs | The requested text path block must not replace multimodal input | Initial agent loses image/media visibility |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Resolve context file REST locators | `ContextFileLocalPathResolver` in `autobyteus-server-ts/src/context-files/services/` | Reuse | Already owns draft/final context-file locator-to-path rules; direct Codex and Claude runtime adapters must use it via the utility callback | N/A |
| Build LLM-visible current context-file reference block | Agent message subsystem with `AgentInputUserMessage` and `ContextFile` | Extend | This is user-message content rendering policy, not storage or transport | N/A |
| Native multimodal conversion | `buildLLMUserMessage` | Extend | Existing owner for native `ContextFile` -> `LLMUserMessage` | N/A |
| Codex input conversion | `toCodexUserInput` | Extend | Existing owner for direct Codex input items | N/A |
| Claude turn content | `ClaudeSession.sendTurn` | Extend | Existing owner for cached/sent Claude user content | N/A |
| Inter-agent reference-file builders | Existing `send_message_to` / inter-agent delivery | Reuse unchanged | User clarified it is not the target | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` agent message subsystem | Current-context-file reference utility, native LLM message builder update | DS-001, DS-004 | Native runtime, direct runtime adapters via package import | Extend | Best cross-runtime location available to server package |
| Server context-files subsystem | REST/final locator resolution | DS-001, DS-002, DS-003 | Native processor, Codex mapper, and Claude session | Reuse | Do not duplicate storage-layout rules; Claude must use the resolver callback because it bypasses native preprocessing |
| Server Codex backend | Codex app-server item mapping | DS-002 | Codex runtime | Extend | Calls current-context-file utility with server resolver |
| Server Claude backend | Claude turn text composition and finalized context-file locator resolution via callback | DS-003 | Claude runtime | Extend | Calls current-context-file utility with `ContextFileLocalPathResolver.resolve(...)` before content validation/cache/execution |
| Inter-agent/Team Communication | Explicit agent-authored reference metadata | Out of scope | Existing team handoffs | Reuse unchanged | No modifications in this ticket |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/context-file-reference-section.ts` | Agent message subsystem | Current-context-file reference utility | Normalize local reference paths, collect from context files, build/append `Reference files:` section | One cohesive formatting/normalization concern for user-attached context files | N/A |
| `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | Agent message subsystem | Native LLM conversion | Append context-file references while preserving media arrays | Existing native conversion owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Codex backend | Codex input mapper | Use resolver + utility; preserve image item mapping | Existing direct runtime mapping owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude backend | Claude turn sender | Use utility with `ContextFileLocalPathResolver.resolve(...)` before cached/sent content | Existing text send/cache owner and the right direct-runtime resolver callback owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Current context-file local path collection and `Reference files:` append | `autobyteus-ts/src/agent/message/context-file-reference-section.ts` | Agent message subsystem | Native, Codex, and Claude need identical current-user-message behavior | Yes | Yes | A general inter-agent handoff formatter or storage resolver |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Context-file reference utility options | Yes | Yes | Low | Only include optional `resolveUri` callback, not runtime-specific fields |
| Reference path list | Yes | Yes | Low | List contains local absolute filesystem paths only; remote URLs and unresolved locators are excluded |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/context-file-reference-section.ts` | Agent message subsystem | Current-context-file reference utility | `collectContextFileReferencePaths`, `buildReferenceFilesSection`, `appendReferenceFilesSection`, local path normalization/dedupe for current user context files | Cohesive text/path rendering policy | N/A |
| `autobyteus-ts/src/agent/message/index.ts` | Agent message subsystem | Public message exports | Export the utility functions | Existing barrel export | Yes |
| `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | Agent message subsystem | Native LLM input conversion | Use utility for content; keep media arrays unchanged | Existing conversion owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | Codex backend | Codex input mapper | Resolve/collect local context file reference paths, append to text input, preserve image items | Existing direct Codex boundary | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude backend | Claude turn sender | Append local context-file references to content before validation/cache/execution using `ContextFileLocalPathResolver.resolve(...)` as the utility callback | Existing direct Claude boundary and resolver handoff point | Yes |
| Tests listed in Guidance | Test suites | Validation | Cover utility/native/Codex/Claude behavior and non-modification of inter-agent builders | Focused coverage | Yes |

## Ownership Boundaries

The utility owns only local path selection and text block rendering for current user-attached context files. It must not read the filesystem, know context-file storage layout, or decide runtime media mapping. Server-specific runtime owners may supply a resolver callback such as `ContextFileLocalPathResolver.resolve(...)` before the utility performs local absolute path filtering. Codex and Claude direct runtime owners must do so for finalized context-file locators because they bypass native input preprocessing.

Runtime adapters remain authoritative for their provider input shapes. They call the utility for text augmentation but continue to own raw image/audio/video input mapping.

Existing inter-agent `send_message_to` behavior remains authoritative for agent-authored handoff reference metadata and must not be modified by this ticket.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Current-context-file reference utility | Heading/bullet formatting, path dedupe, idempotent append for user context files | Native builder, Codex mapper, Claude session | Hard-coded variant reference sections in those three runtime paths | Add small exported utility functions with resolver callback support |
| `ContextFileLocalPathResolver` | Context-file REST route parsing and storage layout lookup | Server direct runtime mappers/session senders that receive `/rest/...` locators, including Codex and Claude | Reimplement route regex/storage path derivation in Codex/Claude or omit resolvable locators | Extend resolver API if needed |
| `buildLLMUserMessage` | Native `AgentInputUserMessage` -> `LLMUserMessage` conversion | Native input pipeline and memory ingest | Provider renderers re-reading `AgentInputUserMessage.contextFiles` | Strengthen builder output |
| Existing `send_message_to` / inter-agent builders | Agent-authored explicit references | Agents/tooling that intentionally send references | Changing them for frontend context-file attachment behavior | Out of scope |

## Dependency Rules

- `autobyteus-ts` message subsystem may depend on Node path/URL utilities and its own `ContextFile` type.
- `autobyteus-ts` must not depend on `autobyteus-server-ts` context-file storage services.
- `autobyteus-server-ts` runtime adapters may import the utility from `autobyteus-ts`; Codex and Claude direct runtime paths must supply `ContextFileLocalPathResolver.resolve(...)` as the callback for finalized context-file locators.
- Provider-specific renderers must not implement their own current-context-file reference block formatting.
- Websocket/GraphQL/application transport entrypoints must continue to build `AgentInputUserMessage` only; they must not own prompt/reference formatting.
- Existing inter-agent message/reference-file files must not be changed for this ticket.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `collectContextFileReferencePaths(contextFiles, options?)` | Current user context-file reference path list | Convert `ContextFile[]` to deduped local absolute paths | `ContextFile[]`; optional `resolveUri(uri)` | Excludes unresolved/non-local values |
| `buildReferenceFilesSection(paths)` | Current context-file reference block text | Produce heading and bullets without leading message content | `string[]` local paths | Utility for current context-file text only |
| `appendReferenceFilesSection(content, paths)` | User message content augmentation | Append section exactly once for provided path set | `content: string`, `paths: string[]` | Idempotent exact-suffix check |
| `appendContextFileReferenceSection(content, contextFiles, options?)` | Context-file message augmentation | Convenience combining collect + append | `content`, `ContextFile[]`, optional resolver | Used by native/Codex/Claude paths |
| `toCodexUserInput(message)` | Codex runtime input | Build app-server input items | `AgentInputUserMessage` | Calls utility; preserves `localImage` |
| `ClaudeSession.sendTurn(message)` | Claude runtime text turn | Resolve finalized context-file locators via callback, then cache and execute user text | `AgentInputUserMessage` | Calls utility with `ContextFileLocalPathResolver.resolve(...)` before content validation/cache/execution |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Context-file reference utility functions | Yes | Yes | Low | Keep resolver callback URI-in/string-out only |
| `toCodexUserInput` | Yes | Yes | Low | Do not add storage-layout parsing beyond resolver callback |
| `ClaudeSession.sendTurn` | Yes | Yes | Low | Use `ContextFileLocalPathResolver` as a callback; do not move route parsing into Claude session |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Current context-file reference utility | `context-file-reference-section.ts` | Yes | Low | Avoid vague `helper`/`utils` naming |
| Native builder | `buildLLMUserMessage` | Yes | Low | Extend behavior without renaming |
| Codex mapper | `toCodexUserInput` | Yes | Low | Extend behavior without renaming |
| Claude sender | `sendTurn` | Yes | Low | Local private variable can be `contentWithContextFileReferences` |

## Applied Patterns (If Any)

- Shared formatter/normalizer: used as a small owned structure under the agent message subsystem.
- Adapter pattern remains in runtime-specific mappers; adapters call the utility but still own provider-specific payloads.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/context-file-reference-section.ts` | File | Agent message subsystem | Current context-file path normalization/dedupe and text section rendering | User-message rendering policy near `AgentInputUserMessage` and `ContextFile` | Filesystem reads, server storage layout, provider API calls, inter-agent delivery logic |
| `autobyteus-ts/src/agent/message/index.ts` | File | Agent message barrel | Export utility functions | Existing public message export point | New logic |
| `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | File | Native LLM message builder | Append context-file references and preserve media arrays | Existing `AgentInputUserMessage` -> `LLMUserMessage` owner | Provider-specific formatting |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts` | File | Codex runtime mapper | Call utility with server resolver; preserve image item mapping | Existing Codex adapter boundary | Inter-agent reference formatting |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | File | Claude runtime sender | Append reference-file block before content validation/cache/execution using `ContextFileLocalPathResolver.resolve(...)` callback | Existing Claude turn content owner and direct-runtime resolver handoff point | Context-file route parsing logic; it should delegate to resolver |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | File | Server docs | Note finalized context-file locators can be resolved and rendered as `Reference files` in runtime user text | Durable docs for context-file behavior | Inter-agent handoff internals |
| `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md` or `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | File | Runtime docs | Note current-turn context files produce an LLM-visible reference block in user input | Existing runtime-flow docs | Product UI details |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/` | Main-Line Domain-Control / message model | Yes | Low | Current context-file reference rendering is message-content policy near `AgentInputUserMessage` and `ContextFile` |
| `autobyteus-server-ts/src/context-files/services/` | Off-Spine Concern / storage resolver | Yes | Low | Remains server storage/locator owner only |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/` | Adapter | Yes | Low | Codex-specific payload item mapping remains here |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/` | Adapter/runtime session | Yes | Low | Claude-specific text turn execution remains here |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Native content output | `Please analyze\n\nReference files:\n- /Users/normy/run/context_files/proof.png` plus `image_urls: ['/Users/.../proof.png']` | Only `image_urls` with no text path | Later agent can see and copy the path |
| Codex input output | `[{ type: 'text', text: 'Please analyze\n\nReference files:\n- /abs/proof.png' }, { type: 'localImage', path: '/abs/proof.png' }]` | `{ type: 'text', text: 'Please analyze' }` plus localImage only | Preserves multimodal input and path discoverability |
| Utility ownership | Runtime input constructor calls `appendContextFileReferenceSection(...)` | Every runtime writes its own ``\n\nReference files:\n${...}`` | Prevents duplicate/divergent current-user-message formatting |
| Claude finalized locator | A Claude message with context file URI `/rest/runs/run-1/context-files/proof.png` uses `ContextFileLocalPathResolver.resolve(...)` and sends text containing `Reference files:\n- /absolute/.../proof.png` | Claude passes the unresolved `/rest/...` URI to the utility and the utility drops it | Ensures browser-uploaded context files work in the direct Claude path |
| Scope boundary | Existing `send_message_to.reference_files` stays untouched | Refactoring inter-agent builders while fixing frontend attachments | Matches user clarification and avoids scope creep |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Codex `Context file: <path>` for local files and also add `Reference files:` | Avoids changing existing Codex text wording | Rejected | Standardize local user-attached file paths into `Reference files:` only |
| Add separate provider-specific `Attached files:` sections | Each adapter could be patched locally | Rejected | One current-context-file reference utility |
| Scan user/inter-agent message prose and auto-create `reference_files` metadata | Would make later references automatic | Rejected | Agent must explicitly pass `reference_files`; this ticket only makes paths visible in original user text |
| Refactor existing inter-agent reference-file builders | Initially considered to reuse format | Rejected for this ticket | Leave inter-agent behavior unchanged |

## Derived Layering (If Useful)

- Transport layer: websocket/GraphQL/application input builders produce `AgentInputUserMessage` and stop.
- Message layer: current-context-file reference utility and native `buildLLMUserMessage` own native message content transformation.
- Runtime adapter layer: Codex and Claude call message-layer utility while preserving provider-specific payload details.
- Inter-agent layer: unchanged and out of scope.

## Migration / Refactor Sequence

1. Add `autobyteus-ts/src/agent/message/context-file-reference-section.ts` with:
   - local path normalization (`file://` -> local path; POSIX/Windows absolute path acceptance; reject HTTP(S), data URLs, empty values, unresolved `/rest/...` locators, null bytes),
   - first-seen dedupe,
   - `Reference files:` section builder,
   - idempotent append helpers,
   - context-file collector with optional `resolveUri` callback.
2. Export the utility from `autobyteus-ts/src/agent/message/index.ts`.
3. Update `multimodal-message-builder.ts` to append context-file references to `LLMUserMessage.content` and leave media arrays unchanged.
4. Update Codex `toCodexUserInput` to collect local context-file reference paths using `ContextFileLocalPathResolver.resolve(uri)` plus shared normalization; append the section to the text item; keep image input item creation unchanged.
5. Update Claude `sendTurn` to derive `content` through the shared context-file append helper before content validation/cache/execution, passing `ContextFileLocalPathResolver.resolve(...)` as the `resolveUri` callback. Claude must instantiate or receive the resolver as a server-side dependency and must not parse context-file storage routes directly.
6. Add/update unit tests.
7. Update durable docs where context-file runtime behavior is described.
8. Run focused package tests/typechecks relevant to changed files.

Explicit non-step: do not update `AgentInputPipeline` inter-agent conversion or `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` for this ticket.

## Key Tradeoffs

- Text-level path references are simple and immediately useful for multi-agent handoffs, but they expose local filesystem layout to model providers. This is accepted because the user explicitly requested absolute server paths.
- The utility filters to local absolute paths, so unresolved REST locators or remote URLs are omitted rather than shown. This prevents false `reference_files` candidates but means external URL attachments will not appear in the `Reference files:` section.
- Codex relative path conversion is deferred to avoid passing workspace context through mapper signatures for a behavior that specifically asks for existing server-side absolute paths.
- Existing inter-agent formatting is not deduplicated in this ticket to respect the clarified scope.

## Risks

- Absolute path exposure must be documented and visible to release/handoff.
- If a runtime receives context files before the server-side native path processor runs, native builder may not be able to resolve `/rest/...` locators by itself. Current native server pipeline runs `UserInputContextBuildingProcessor` before `buildLLMUserMessage`; direct Codex and Claude paths must use `ContextFileLocalPathResolver` callbacks and tests should cover finalized locator behavior in both direct paths.
- If future providers add their own direct runtime path, they must call the current-context-file utility; document this as a runtime adapter contract.

## Guidance For Implementation

Recommended tests:

- `autobyteus-ts/tests/unit/agent/message/context-file-reference-section.test.ts`:
  - zero paths returns no section/change,
  - multiple absolute paths preserve order,
  - duplicates dedupe,
  - `file://` normalizes,
  - HTTP/data/unresolved `/rest/...` values are ignored,
  - exact existing section is not appended twice.
- `autobyteus-ts/tests/unit/agent/message/multimodal-message-builder.test.ts`:
  - absolute image/audio/video/text context files append one `Reference files:` section while media arrays remain unchanged,
  - no context files leaves content unchanged.
- Add `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-user-input-mapper.test.ts`:
  - image context file produces both text reference block and `localImage`,
  - duplicate/local non-image files use the standard block rather than repeated `Context file:` lines,
  - unresolved URL/data values do not appear as `Reference files`.
- Update `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts`:
  - cached user content for a message with `/abs/proof.png` includes `Reference files:\n- /abs/proof.png`,
  - cached/sent user content for a message with a finalized `/rest/.../context-files/proof.png` locator includes the `ContextFileLocalPathResolver`-resolved absolute path, not the locator.
- Add a negative/scope test or review checklist item confirming existing inter-agent builders are not changed by this ticket.

Suggested validation commands after implementation:

- `pnpm -C autobyteus-ts exec vitest tests/unit/agent/message/context-file-reference-section.test.ts tests/unit/agent/message/multimodal-message-builder.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest tests/unit/agent-execution/backends/codex/thread/codex-user-input-mapper.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts`
- `pnpm -C autobyteus-server-ts run typecheck`
