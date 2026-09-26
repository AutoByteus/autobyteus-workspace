# Design Specification — AGY Native Tools, Image Output, and Codex Preparation

## Solution And Approval Basis
- Package: `agy-runtime-image-codex-prep-20260926`; current solution round `SR-013` (proposed broad nonblocking skill-error behavior).
- Design state: **Needs Revision for AGY skill handling; not authoritative for that portion.** ARCH-REV-003 passed the SR-012 design and handed it to implementation, but the user's later instruction E-028 changes the approved invalid-skill outcome. All SR-012 `invalid_candidate`/collision/source-change hard-failure directions below are held pending renewed requirements approval. Native-image/tool boundary remains unchanged and reviewed.
- Requirements authority: `requirements-doc.md` baseline `SR-005` was approved by the user's 2026-09-26 “Okay” reply. `SR-009` nonblocking missing-skill requirements were explicitly approved by the user’s 2026-09-26 “yesss” reply in SR-010. The native-image and tool-boundary intent is unchanged; AutoByteus MCP `generate_image` remains no substitute.
- Evidence authority: `investigation-notes.md` E-001–E-027. No further exploratory AGY experiments were run after the user's request; implementation validation remains a delivery gate, not evidence already obtained.
- Workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926`, branch `task/agy-runtime-capabilities-20260926`, based on `origin/personal@ae3aba1bfb7af6fefd8c69994e0b1bc421967d60`, finalization target `origin/personal`. Agent package is a separate Git repository at `/Users/normy/autobyteus-org/autobyteus-agents`; implementation must establish its own isolated worktree/base/finalization target there before edits.
- Product supplement: `N/A — not applicable`. Architecture review: ARCH-REV-003 Pass on SR-012, F-001/F-002 resolved; that pass predates E-028 and does not approve changed skill behavior. Implementation is underway on the prior basis, with skill policy paused pending SR-013.

## SR-013 Requirement Recovery Hold
The user now wants an invalid configured `SKILL.md` to warn rather than block an otherwise healthy AGY run, extending beyond SR-012's certified-absence-only rule. The user asks whether the folder is simply copied; current code parses skill metadata before copying and applies source checks during copying. The question whether an invalid/unusable folder should be copied through or omitted with a warning is open as DEC-003; copying through may allow AGY itself to fail startup. Do not implement SR-012's invalid-candidate hard-failure contract as the final skill behavior or author a revised skill design until the SR-013 requirement is approved. The Solution Designer sent an ordinary pause clarification to the active Implementation Engineer; no new handoff or production-code edit is made here. User-deferred live-symlink updates remain out of scope.

## SR-012 Design Recovery
ARCH-REV-002/F-002 showed that current `kind:"unresolved"` does not certify true absence: a present but malformed/name-mismatched contextual skill can produce the same binding. Preserve the user-approved SR-009/SR-010 behavior, but classify configured skill resolution at the owning SkillService/resolver boundary as `resolved`, `certified_absent`, or `invalid_candidate` for AGY before the materializer chooses any warning/skip path. A present but invalid candidate is a preparation failure with existing public redaction; only certified absence logs a backend warning and permits startup. A resolved source that disappears or changes after resolution is `source_changed`, not a new absence. SR-008 native-image failure safety remains unchanged. The user separately deferred symlink/live-update behavior to a future ticket; this package retains run-scoped snapshots.

## Current-State Read
An AutoByteus message activates an AGY backend, which snapshots a custom main-agent capsule, writes a run-scoped MCP config and configured skills, then starts headless `agy`. The capsule hardcodes eight native coding tool names. AGY itself owns the execution of native tools, but this frontmatter restricts what the custom agent can call; native `generate_image` is absent. AutoByteus MCP remains a separate scoped server (E-003, E-008, E-016). The AGY stream converter already maps provider tool steps to canonical tool events. Its result wrapper currently leaves a gap between AGY's native output and the shared generated-file path extractor (E-009, E-017). On tool failure it also copies `tool_info.error` into canonical `error`/`reason`; the web tool-lifecycle handler displays that error, so a native-image failure could expose arbitrary provider text (E-021, ARCH-REV-001/F-001). Codex's declared workflow skill is unresolved because its apparent package `.codex` link is dangling and outside supported discovery locations; the actual sibling skill source is not registered as a global source. The unresolved binding fails capsule creation, and the manager hides it behind a generic preparation message (E-004–E-006, E-019–E-020). Codex/Claude instead warn and skip unresolved skills through shared reconciliation (E-023); the AGY factory already carries the run ID into capsule construction (E-025). However `unresolved` also represents present-invalid contextual candidates, and discovery can treat a present directory lacking a valid `SKILL.md` as no skill (E-026, ARCH-REV-002/F-002).

## Task Size And Architectural Risk (Mandatory)
- `task_size: Medium`. Bounded changes in existing AGY capsule/stream, shared generated-output projection, shared skill resolution, AGY skill materialization, and one agent package. No new runtime, major refactor, route family, or persistence schema.
- `architectural_risk: High`. Native tool exposure is a security and provider-compatibility boundary; AGY's actual image output schema is unverified; existing file-content projection can serve absolute paths; and the skill fix spans a separate repository and requires a truthful source-validation boundary. The design must be independently reviewed and implementation must not claim native-image success from an MCP call.
- Escalation trigger: if a supported AGY CLI cannot express default non-collaboration native tools without losing essentials, or native image output cannot be safely projected through the existing contract, return a `Design Impact`/requirement decision rather than silently narrowing the toolset or using MCP media as a substitute.

## Architecture Investigation Evidence
| Source | Observation | Design consequence |
| --- | --- | --- |
| E-012/013; [AGY custom-agent documentation](https://antigravity.google/docs/subagents?tab=cli) | Custom-agent `tools` is an explicit permitted list; local 1.2.11 selective probe exposed native image/file/web but not `invoke_subagent`/`send_message`. Prior 1.2.10 no-list and wildcard controls did not establish default parity. | Replace eight-tool constant with one version-validated AGY-native policy; do not presume an SDK-style CLI denylist or infer model exposure from `init.tools`. |
| E-016/018 | Capsule native frontmatter and MCP config are distinct; captured MCP calls use AGY `call_mcp_tool` with `ServerName`/`ToolName`. | Keep provider-native tool policy separate from AutoByteus MCP exposure; never list MCP names as native frontmatter tools. |
| E-017 | Converter preserves AGY `tool_info.output` under canonical `result.output`; shared extractor expects direct path keys. | Normalize only verified AGY-native image output at the adapter boundary, then reuse the existing `FILE_CHANGE` projection. |
| E-019/020, E-023–E-026; ARCH-REV-002/F-002 | Codex package has a broken, undiscovered absolute skill link; SkillService supports `agents/<id>/skills/<name>`. Codex/Claude reconcile `unresolved` with warnings, but that binding conflates genuine absence with present-invalid candidates. Run ID reaches capsule; manifest `skills` records only actual snapshots. | Package Codex's intended skill portably; add an AGY-facing detailed resolution outcome at the SkillService/resolver boundary before materialization. Warn/omit only `certified_absent`; fail `invalid_candidate` and source changes. Preserve Codex/Claude existing resolution behavior. |
| E-021; ARCH-REV-001/F-001 | AGY converter copies `tool_info.error` into canonical `error`/`reason`, and the existing web tool-lifecycle handler displays the canonical error. | Native-image failure needs a provider-boundary safe public mapping before canonical event publication; restricted diagnostic evidence must not ride the public event/result. |

## Intended Change
AutoByteus stops imposing an eight-coding-tool approximation on AGY. It writes a supported-version native non-collaboration tool profile into the generated main agent, retaining `generate_image` and ordinary AGY coding/web/browser/interaction tools that the CLI supports, while excluding native subagent creation/invocation/management and native inter-agent messaging. AGY continues to execute those native tools. The separately configured AutoByteus MCP server remains additive and scoped exactly as today. Native `generate_image` events are distinguished from `call_mcp_tool` events; their verified output path becomes an accessible generated artifact. Native-image failure/denial is classified at the AGY adapter before canonical events: public tool lifecycle receives only bounded static safe text, while any raw provider diagnostic stays in a restricted run-owned diagnostic record, not the public event, raw-trace projection or file-change artifact. Codex's declared workflow skill becomes resolvable from a portable package source. The SkillService/resolver certifies that a configured skill is genuinely absent across supported source locations before AGY logs a safe run-scoped warning, omits it from the capsule manifest and starts with remaining resolved skills; it does not publish a blocking user error or claim the omitted skill loaded. A present malformed/name-mismatched/unreadable candidate or a source changed after resolution does not take the warning path.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved IDs / trigger | Current evidence | Target path / spine |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/005/006; AC-001/005/006; SCN-001/004; new AGY standalone or Team/Org run | E-003, E-010, E-012/013 | Chat activation → factory → AGY native policy/capsule + scoped MCP → AGY process; DS-001. |
| BEH-003 | REQ-002; AC-001/002; SCN-001; native image call | E-001, E-009, E-017/018 | AGY tool step → AGY adapter → canonical event → file projection → existing file-content API/UI; DS-002/003. |
| BEH-002 | REQ-003/004; AC-003/004; SCN-002/003; first Codex prompt or missing skill | E-004–E-006, E-019/020, E-022–E-026 | Definition → detailed skill resolution → capsule warning/skip, snapshot, or hard failure → AGY activation → first reply; DS-004. |

## Relevant Supplemental Task Artifacts
None. User screenshots/transcript and prior AGY ticket are evidence, not behavior-defining supplements.

## Task Design Health Assessment (Mandatory)
- Change posture: bug fix and behavior correction.
- Current design issue: **Yes**. A temporary compatibility list became a broad native capability policy without owning version drift; output adaptation is incomplete; Codex has a nonportable skill reference and AGY treats expected skill absence as a fatal prerequisite, unlike Codex/Claude.
- Root cause: boundary/ownership issue for AGY-native versus MCP tool policy; local output-adapter gap; package/discovery mismatch; AGY missing-skill reconciliation gap and shared `unresolved` cause erasure (E-026).
- Refactor needed now: **Yes, bounded**. Move the AGY-native tool list into a named, version-aware policy owner and remove the `codingTools` constant. Extend the shared skill-resolution owner narrowly to certify absence for AGY without changing Codex/Claude behavior; do not refactor the general agent-tool MCP catalog or other providers.
- Residual risk: AGY may change names or output shape. Fail visibly on unsupported policy versions and validate actual native provenance/output before delivery; do not add fallback to the old eight tools.

## Terminology
- **AGY-native tool:** tool executed by the AGY runtime itself, e.g. provider `tool_name: generate_image`.
- **AutoByteus MCP tool:** configured tool reached through AGY `call_mcp_tool`; `ToolName: generate_image` does not satisfy native-image acceptance.
- **Native policy profile:** explicit frontmatter names accepted for a validated AGY CLI version; it is not a replacement implementation of those tools.

## Design Reading Order
Read the behavior map, DS-001/002/004 spines, ownership/boundary rules, then final file mapping and validation sequence. Exact provider output fields and exhaustive policy names remain validation gates, not fabricated facts.

## Legacy Removal Policy (Mandatory)
No backward-compatibility branches. Remove the eight-tool `codingTools` constant and its production use. Do not fall back from an unsupported CLI/profile to eight tools, from native image to AutoByteus media, or from a missing configured skill to a blocking failure or a falsely loaded skill. A warning-and-continue path is approved specifically for true absence, not for unsafe provenance/collision or unrelated failures. Existing run capsules remain immutable snapshots, not dynamically rewritten.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
- Stored subjects: existing AGY capsule agent Markdown/manifest, run metadata and file-change projection; representative capsule and Codex `PREPARED` metadata inspected (E-004/E-008/E-016).
- Change: new runs receive changed frontmatter and may receive generated-output projection entries; a native-image failure may create a private, bounded run-owned diagnostic file under the run memory directory. No existing stored model/schema changes. Existing capsule restore verifies its saved Markdown hash and must continue to use the old snapshot.
- Decision: **Directly Usable — No Migration** for prior run metadata/projections; **preserve existing capsules unchanged**. Current readers are version-agnostic for old projection rows and capsule content; no historical rewrite or deletion. The new private diagnostic file is optional new-run data with no existing reader/migration obligation and follows run-memory retention. New runs are required for new grants. A failed never-started Codex run may be retried/newly started after the fix; do not mutate its stored identity or claim it succeeded. A new run with an absent skill records only actually snapshotted skills in the existing manifest; the existing version-1 manifest reader/restore semantics need no migration, and restore must still fail if a previously recorded snapshot disappears or is tampered with.
- Physical/security constraint: native image path may be outside the selected workspace. Only project a path actually returned by a successful native tool and confirmed to be a regular image file; never derive a file URL from arbitrary model prose.

## Data-Flow Spine Inventory
| ID | Scope | Behaviors | Start → end | Owner / significance |
| --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001 | Chat first prompt → AGY tool availability | AGY backend factory/capsule; native versus MCP policy. |
| DS-002 | Primary end-to-end | BEH-003 | Native image request → accessible generated file | AGY adapter plus existing projection; native provenance and output. |
| DS-003 | Return/event | BEH-003 | AGY `step_update` → safe tool card/Files UI | AGY converter owns public/native-image failure boundary; canonical event pipeline remains the only UI transport. |
| DS-004 | Primary end-to-end | BEH-002 | Codex first prompt → cause-certified resolution → warning/skip true absence or snapshot resolved skill → AGY first reply; invalid candidate fails safely | SkillService/resolver, AGY materializer and capsule. |

## Primary Execution Spine(s)
- DS-001: Chat command → prepared-run activation → `AgyAgentRunBackendFactory` → native profile + run capsule / scoped MCP config → `AgyStreamProcess` → AGY native/MCP tool execution.
- DS-002: User image prompt → AGY native `generate_image` → AGY stream converter → canonical tool success with verified native output path → shared file-change projection → existing file-content endpoint / Files UI.
- DS-004: Codex first prompt → definition/source locations → SkillService/resolver detailed outcome (`resolved`, `certified_absent`, `invalid_candidate`) → AGY capsule materializer (trusted snapshot for resolved; run-scoped warning/omit for certified absence; coded hard failure for invalid) → manifest of actual snapshots → AGY backend start → canonical reply and normal status/ACK. Invalid/safety/collision/source-change/other failures follow the existing redacted preparation-error path.

## Spine Narratives (Mandatory)
DS-001 preserves provider ownership: AutoByteus configures permitted AGY-native names due the custom-agent CLI contract, but does not implement or replace them. The run-owned MCP descriptor remains independent. DS-002/003 use the existing AGY event adapter and file projection rather than treating an MCP image as native. On native-image `ERROR` or an explicit error even with provider state `DONE`, the AGY adapter classifies denial versus other failure using the raw provider signal internally, then emits only a static safe public `TOOL_DENIED` or `TOOL_EXECUTION_FAILED` event. Its `error`/`reason` cannot contain provider text, stderr, paths, URLs or credentials; failed `result.output` is null and native-image arguments are omitted from public start/terminal events. The existing web tool-lifecycle handler therefore stores/displays the safe canonical error unchanged. A private run-owned diagnostic record, keyed by run/turn/invocation, retains bounded provider state/error/output for operator analysis only; it is not projected to chat, history, raw trace, GraphQL, REST or Files. DS-004 restores intended skill distribution while treating certified absence as nonblocking; the backend warning has no public error/ACK counterpart. A named candidate directory with missing/unreadable `SKILL.md`, malformed frontmatter or name mismatch is invalid, not absent; no broad `unresolved` mapping is allowed. Existing generic public redaction continues for invalid/unsafe/unrelated preparation failures.

## Spine Actors / Main-Line Nodes
Chat/command coordinator; run manager; AGY backend factory; capsule/native profile; AGY child; AGY stream converter; canonical event pipeline; file-change projection; existing content route/UI; Codex skill resolver/materializer.

## Ownership Map
- AGY capability service: installed version/feature evidence and supported-profile selection; avoid repeated per-member CLI probes in Org activation.
- AGY native tool policy: exact version-profile names and exclusion invariant; never owns MCP authorization.
- AGY capsule: immutable per-run frontmatter/identity/skill snapshot and MCP config; no general tool catalog.
- AGY stream converter: provider event/provenance, native image output normalization and safe native-image failure classification before public canonical events; no file serving.
- AGY private diagnostic sink: bounded run-owned native-image failure evidence at `memoryDir/agy-provider-diagnostics/native-image-failures.jsonl` (mode `0700` directory/`0600` file, no symlink following, at most 32 KiB per record), keyed by run/turn/invocation. No public projection/API; a sink write failure cannot cause raw details to be used as a public fallback.
- Shared file-change processor/projection: generated-file path indexing and existing UI transport; not provider tool policy.
- SkillService/resolver: source-location precedence, candidate inspection and a cause-certified AGY resolution outcome; AGY materializer: warning/omission only for certified absence and trusted snapshots for resolved bindings, with coded failure for invalid; manager/coordinator: existing generic redaction for actual activation failures. Codex/Claude retain their existing resolver projection.

## Thin Entry Facades / Public Wrappers (If Applicable)
`AgyAgentRunBackendFactory` is the AGY activation boundary, not a second tool policy store. REST/GraphQL file-change entries remain thin projection access surfaces. The command coordinator publishes classified activation messages; it must not inspect raw skill filesystem internals.

## Removal / Decommission Plan (Mandatory)
| Item | Replacement | Scope |
| --- | --- | --- |
| `codingTools` eight-name constant in `agy-run-capsule.ts` | Version-validated `agy-native-tool-policy.ts` result | In this change. |
| Dangling Codex workflow-skill symlink under package `.codex/skills` | Supported bundled skill under `agents/codex/skills/` with source provenance | In this change for this link only; unrelated `skill-optimizer` link is out of scope. |
| AGY fatal `AGY_CONFIGURED_SKILL_UNRESOLVED` path for truly absent configured binding | Cause-certified absence from SkillService/resolver → safe backend warning plus omission, then normal AGY launch | In this change; a present invalid candidate still fails with generic public redaction. |

## Return Or Event Spine(s) (If Applicable)
DS-003: AGY `ACTIVE`/`DONE`/`ERROR` tool step → `AgyStreamEventConverter` → safe canonical tool event → existing recorder/status/file-change processors → WebSocket/history → tool card and Files. For native image calls, raw provider arguments are not placed on public start/terminal events; provider `ERROR` or explicit error produces a safe static failure/denial message and no generated-file entry, even if the overall turn reports `SUCCESS`. Restricted raw failure evidence branches to the private sink, never through the public event spine.

## Bounded Local / Internal Spines (If Applicable)
The existing AGY single-turn stream/step-index converter is retained. Within it, classify `tool_name` and normalize only the native image result; do not parse the entire assistant response or add a new polling loop. The existing file-change processor continues per-invocation context tracking.

## Off-Spine Concerns Around The Spine
| Concern | Serves owner | Responsibility |
| --- | --- | --- |
| CLI version/profile validation | AGY factory | Select supported native names, report unsupported drift safely. |
| MCP descriptor/session authority | AGY factory | Preserve configured run-scoped grants; no native tool names injected. |
| Native image path verification | AGY adapter/projection | Accept only explicit provider output; at the existing file-change owner, scope regular-image-file/path checks to AGY-native image events using run runtime kind and provider `tool_name`, so other providers' file projection is unchanged. |
| Native image failure classification | AGY stream converter | Classify native image denial/failure before public canonical event publication; emit fixed safe `error`/`reason`, null failed output and no raw arguments. |
| Private native-image diagnostics | AGY backend run-memory owner | Append bounded correlated provider evidence to private run-memory storage only; never feed it into canonical trace/UI, and keep public failure safe if private write fails. |
| Skill package provenance | Codex definition/skill resolver | Make declared skill portable and resolvable. |
| Absence certification | SkillService/configured-skill resolver | Distinguish no candidate anywhere from present invalid/unreadable/mismatched candidate across contextual and configured global roots, before AGY materializer decides to skip. |
| Missing-skill warning | AGY capsule materializer | Log bounded run ID, agent/skill identity and `skipped-missing` disposition; no source path, raw exception or public error. |

## Ownership Boundaries
The AGY CLI owns native tool execution; AutoByteus owns custom-agent exposure configuration and event adaptation. AutoByteus Agent Tools MCP owns app tools and team messaging. AGY stream conversion owns provider-specific payload interpretation and safe canonical publication; the backend supplies a narrow private-diagnostic callback bound to that run's memory directory, so the converter does not import filesystem storage. Shared projection owns provider-agnostic indexed files and never sees raw failed image output. The skill package owns distributed skill content; runtime materializer owns trusted snapshot, not source repair.

## Boundary Encapsulation Map
| Boundary | Internal mechanism | Forbidden bypass |
| --- | --- | --- |
| AGY factory/capsule | Native profile and MCP config | Agent package `toolNames` determining native AGY tools; MCP `generate_image` as native fallback. |
| AGY stream converter | `step_update.tool_info`, native output, native-image public failure classifier | Shared projection parsing arbitrary AGY-specific prose/brain internals, or public event/trace carrying raw failed provider error/output. |
| SkillService/resolver → AGY capsule materializer | Detailed source outcome from supported package/global roots, then warning/omission or trusted snapshot | Interpreting legacy `kind:"unresolved"` as proof of absence, accepting present invalid candidates as missing, claiming omitted skill loaded, or broad-catching provenance/collision failures. |

## Dependency Rules
AGY capsule depends on the AGY-native policy; policy may use the capability service's validated version, not MCP exposure. AGY converter emits canonical events consumed by shared pipeline; shared pipeline must not import AGY backend internals. For native image failure, no raw `tool_info.error`, `tool_info.output`, provider parameters or stderr may enter canonical `error`/`reason`/`result`/arguments; only safe fixed text and provider state may enter the public event. The private diagnostic sink is AGY-backend-owned and cannot be read by the shared event pipeline or public history/UI. AGY factory continues to use existing MCP session authority. Agent package content must not depend on developer-machine absolute paths. AGY absence classification must be cause-certified at SkillService/resolver, not inferred from legacy `kind:"unresolved"`: only when no candidate path exists in any supported agent-private, team-shared or configured global lookup location may `certified_absent` warn-and-skip. A named candidate directory that exists without `SKILL.md`, has unreadable/malformed or name-mismatched `SKILL.md`, or violates source safety is `invalid_candidate` and fails. A valid lower-precedence fallback must not silently erase a present invalid higher-precedence candidate in the AGY detailed path; the legacy Codex/Claude resolver path remains unchanged. Once `resolved` is returned, disappearance, replacement or mutation before/during snapshot is `source_changed` and fails, not absence. Collision, unsafe links and unrelated I/O/process errors still throw. Do not turn a broad `ENOENT`, `unresolved`, or `AGY_SKILL_*` catch into best-effort startup. A run-scoped warning contains only validated skill name, run/definition identity and disposition, no host paths, secret-bearing error text or public event. `SkillAccessMode.NONE` intentionally loads no skills and needs no missing-skill warning. Restore validates the immutable saved manifest rather than re-resolving current bindings.

## Interface Boundary Mapping
| Interface | Subject / identity | Responsibility |
| --- | --- | --- |
| `resolveAgyNativeToolProfile(cliVersion)` | Installed AGY CLI version | Return exact permitted native names excluding collaboration family or a typed unsupported diagnostic. |
| `createAgyRunCapsule(..., nativeToolNames)` | One run ID/capsule | Snapshot the selected policy with run identity; preserve hash/restore semantics. |
| `extractAgyNativeImagePath(toolName, parameters, output)` | One AGY invocation | Yield an explicit path candidate only for native `generate_image` success; never for `call_mcp_tool`. The file-change owner verifies the candidate before publishing it. |
| `classifyAgyNativeImageFailure(providerState, toolError)` | One native AGY image invocation | Return `TOOL_DENIED` with static “Antigravity denied this image-generation request. No image was added to this run.” when a denial is identified; otherwise `TOOL_EXECUTION_FAILED` with static “Antigravity image generation failed. No image was added to this run.” Never infer a cause or return raw provider text as public message. |
| `recordAgyNativeImageDiagnostic(runId, turnId, invocationId, providerInfo)` | One private run-owned failure record | Best-effort append capped at 32 KiB/record to `memoryDir/agy-provider-diagnostics/native-image-failures.jsonl`, with `0700` directory, `0600` file, no symlink following; no public reader or file-change entry. |
| `SkillService.resolveConfiguredSkillBindingsForAgentDetailed(definition)` (or equivalent resolver-owned AGY-facing API) | One configured definition and supported source roots | Return typed per-name `resolved` with trusted provenance, `certified_absent` only if every supported candidate path is absent, or `invalid_candidate` for a present invalid/unreadable/mismatched candidate. Share the existing lookup precedence/loader rather than duplicate it in AGY; keep `resolveConfiguredSkillBindingsForAgent` behavior unchanged for Codex/Claude. |
| `materializeAgyConfiguredSkills(..., runId, agentDefinitionId, detailedOutcomes)` | One new AGY run | Warn/omit only `certified_absent`; snapshot `resolved` in order and return only actual snapshots for manifest. Throw coded `invalid_candidate`, source-changed, unsafe/collision and unrelated failures. |

## Interface Boundary Check
Each interface has one subject and explicit run/version/invocation/definition identity. Do not key a native image decision on a bare `generate_image` string without AGY provider origin; in the recorded AGY MCP path, `call_mcp_tool` carries the nested MCP tool name. Public failure messages come only from the AGY native-image classifier, not a shared tool-card renderer or arbitrary provider text. Private diagnostic persistence is a separate one-way interface, not a public event field. The AGY materializer consumes a typed cause from the resolver, never reconstructs absence by filesystem guessing. No generic “tool policy” merger between provider native and MCP.

## Main Domain Subject Naming Check
`AgyNativeToolPolicy`, `AgyNativeImageResult` and `DetailedConfiguredSkillResolution` are specific; avoid ambiguous `generateImageTool` or `toolAdapter` names that conceal provenance. Existing `AgyStreamEventConverter` is correctly provider-specific.

## Existing Capability / Subsystem Reuse Check
Reuse AGY capsule/factory, MCP session authority, canonical events, file-change projection, skill resolver/materializer and status/ACK UI. Extend only their owned gaps. Do not create a second media service, second artifact transport, or separate native-image download endpoint unless actual verified AGY output makes the existing projection impossible.

## Subsystem / Capability-Area Allocation
| Area | Delta |
| --- | --- |
| AGY backend/capsule/runtime capability | Version-aware native frontmatter exposure; unchanged scoped MCP; immutable restore. |
| AGY stream adapter + shared file-change pipeline | Normalize native image output and project a real file; classify native-image failure into safe public lifecycle events, with restricted AGY-only diagnostic storage; preserve generic lifecycle for other tools. |
| Skill package/discovery | Portable Codex skill bundle and provenance; resolver-owned detailed AGY outcome over existing contextual/global locations without changing Codex/Claude legacy behavior. |
| AGY skill materialization | Run-scoped backend absence warning and omission, existing trusted snapshot and manifest; no new public error contract. |

## Draft File Responsibility Mapping
AGY capsule initially appears to own the tool list, but a separate AGY-native policy file is needed for version/exclusion invariants. The stream converter owns tool provenance and the public native-image failure boundary; a small AGY-native output normalizer can own success-path interpretation. A run-owned AGY diagnostic sink receives raw failed provider fields separately and is not a general event processor. File projection should only consume normalized explicit success path fields. The SkillService/resolver owns exact-absence certification using existing source precedence and loader; the AGY materializer owns warning only for that typed outcome and successful snapshots. Neither should delegate this to generic manager error mapping or duplicate global-root search in the capsule. The skill content belongs in the agent package's supported local skill folder, not runtime code.

## Reusable Owned Structures Check
Extract only the AGY-native version/profile type and native image output normalizer if both capsule/validation or converter/tests need them. No cross-provider shared tool-policy type: native semantics differ. Use one narrow typed detailed-resolution result for AGY; keep the existing Codex/Claude-facing projection stable. Avoid duplicating full skill content in runtime/test fixtures; use a pinned package source and minimal absent/present-invalid fixtures.

## Shared Structure / Data Model Tightness Check
One native profile has `cliVersion` and `permittedNativeToolNames` (no MCP names or redundant deny list). Canonical successful image result has explicit `file_path` only after native provenance/path validation; existing success trace may retain provider output as appropriate. Canonical failed image result has no raw output/parameters/error, only safe static message and provider state. Raw failure evidence, if captured, belongs solely to the restricted diagnostic sink, not an overlapping public trace field. Do not add both `nativeImagePath` and `filePath` to one canonical event. In the skill domain, `certified_absent` and `invalid_candidate` are mutually exclusive and must not be encoded as generic `unresolved` plus optional message text. Only the resolver/SkillService can assert the absence outcome; AGY materializer cannot re-interpret it. Legacy Codex/Claude consumers keep their existing binding contract.

## Final File Responsibility Mapping
| File/path | Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.ts` (new) | Supported CLI profile, non-collaboration exclusion invariant, exact native frontmatter names. |
| `.../capsule/agy-run-capsule.ts` (modify) | Use policy result instead of `codingTools`; keep snapshot/hash/restore. |
| `.../backend/agy-agent-run-backend-factory.ts` and `src/runtime-management/antigravity-cli-capability.ts` (modify) | Obtain validated version/profile without N redundant Org probes; safe unsupported-profile failure; pass run/definition identity to capsule warning owner. |
| `.../stream/agy-native-image-result.ts` (new if output shape warrants) and `agy-stream-event-converter.ts` (modify) | Native-versus-MCP event provenance, explicit success path candidate normalization, and safe public native-image `ERROR`/explicit-denial mapping. Scrub native-image public start arguments and failed result output; preserve raw failed evidence only via the private sink. |
| `.../stream/agy-native-image-diagnostic-sink.ts` (new) and `.../backend/agy-agent-run-backend.ts` (modify) | Correlate and append bounded native-image failure provider fields to private run memory (`0700` directory, `0600` file); sink failure logs only a safe storage code and never changes the public static message. |
| `.../events/processors/file-change/{file-change-output-path.ts,file-change-event-processor.ts}` (modify narrowly) | Consume explicit normalized AGY result field, verify a regular image file before publishing an available entry, and reuse existing generated-output projection; do not parse arbitrary prose. |
| `autobyteus-server-ts/src/skills/services/{configured-agent-skill-resolver.ts,skill-service.ts,skill-discovery.ts}` and `src/skills/domain/configured-agent-skill-binding.ts` (modify narrowly as needed) | Expose AGY-facing typed detailed outcome from the authoritative contextual/global search: resolved, certified absent or invalid candidate; detect present directory without valid manifest and loader/name failures. Preserve existing Codex/Claude binding projection and precedence behavior. |
| `.../backend/agy-agent-run-backend-factory.ts`, `.../capsule/agy-configured-skill-materializer.ts` and `agy-run-capsule.ts` (modify narrowly) | Request/pass detailed outcomes plus run/definition identity; warn-and-skip only certified absence, snapshot remaining trusted skills, record only successful snapshots, and fail invalid/source-changed outcomes. Preserve manifest v1/restore validation. No manager error-mapping change. |
| `/Users/normy/autobyteus-org/autobyteus-agents/agents/codex/skills/software-engineering-workflow-skill/` (new, separate worktree) | Portable snapshot of intended skill from canonical `autobyteus-skills` source; include all referenced files and provenance/version note. |
| `/Users/normy/autobyteus-org/autobyteus-agents/README.md` and broken Codex `.codex` link (modify/remove) | State normal bundled skill availability and nonblocking missing-skill behavior truthfully; remove misleading machine-specific Codex link. |

## Applied Patterns (If Any)
Versioned provider adapter, run-owned immutable capsule, canonical event projection, resolver-owned cause-certified missing-skill classification, and provider-boundary safe image-failure mapping. These reuse existing patterns rather than a new runtime abstraction.

## Target Subsystem / Folder / File Mapping
Keep `backend`, `capsule`, `stream` separation under `backends/antigravity`; keep general file-change interpretation under `events/processors/file-change`. Put Codex skill under supported agent-private `agents/codex/skills` in the separate package repo. No new top-level subsystem/folder is justified.

## Folder Boundary Check
AGY `capsule` owns configuration; `stream` owns provider events; shared `file-change` owns projection; `agents/codex/skills` owns package payload. Mixed-layer risk is low if image-specific path parsing stays at AGY boundary and generic projection remains generic. Do not place all logic in factory or file-change processor.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
| Good | Avoid |
| --- | --- |
| Native AGY step `tool_name: generate_image`, `state: DONE`, explicit image path → canonical `result.file_path` plus success output → regular-file/image verification → `FILE_CHANGE`. | Treating `call_mcp_tool` with `ToolName: generate_image` as native; deriving a path from assistant prose or marking tool `DONE` as proof a file exists. |
| Native image `ERROR`, raw `tool_info.error="permission denied: /private/path?token=secret"` → private correlated diagnostic; public `TOOL_DENIED` with `error`/`reason="Antigravity denied this image-generation request. No image was added to this run."`, `arguments={}`, `result={provider_state:"ERROR",output:null}` → existing tool card shows only safe text; no `FILE_CHANGE`. | Copying raw error, output, stderr, provider parameters or host path into canonical event/WebSocket/history/tool card; showing success because the overall turn ended `SUCCESS`. |
| Supported profile includes native image/file/web/browser names and excludes `invoke_subagent`, `define_subagent`, `manage_subagents`, `send_message`, related native collaboration names. | Old eight-tool list; `tools: [*]`; inserting AutoByteus MCP names/`call_mcp_tool` into native frontmatter. |
| No candidate directory in supported contextual/global roots for `software-engineering-workflow-skill` → resolver `certified_absent` → backend warning `AGY configured skill skipped: run=<id>, agent=codex, skill=software-engineering-workflow-skill, disposition=skipped-missing`; no snapshot entry; AGY starts and answers if otherwise healthy. | Mapping any legacy `unresolved` directly to warning, emitting a public prerequisite error, logging raw host paths/secrets or claiming the missing skill loaded. |
| A local-package `agents/codex/skills/software-engineering-workflow-skill/SKILL.md` exists but has malformed frontmatter or declares another name → resolver `invalid_candidate` → AGY preparation fails under existing generic public redaction; backend may log a bounded reason code. | Warning/skip and first-turn success as if no skill existed; falling back to a global same-name skill to hide the present invalid candidate. |
| Resolver returns `resolved`, then source is removed/replaced before copy → `source_changed` hard failure. | Broad-catching `ENOENT` during snapshot and reclassifying it as an ordinary absent configured skill. |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| Keep eight-tool fallback when version/profile unknown | Rejected: silently violates native parity. Fail safely with supported-version explanation. |
| Use AutoByteus MCP image if AGY-native image unavailable | Rejected: wrong provenance and user explicitly disallowed substitution. |
| Rewrite old capsule frontmatter on resume | Rejected: breaks immutable identity/restore hash; new run required. |
| Preserve machine-specific absolute Codex skill symlink as fallback | Rejected: nonportable, undiscovered, dangling locally. |

## Derived Layering (If Useful)
Chat/activation → AGY provider adapter/capsule → AGY CLI; provider events → canonical events → existing trace/file projection/UI. Skill package and MCP session authority remain off-spine dependencies to activation.

## Change / Refactor Sequence
1. In the server worktree, add the AGY-native policy owner and integrate it into capsule construction. Use the current CLI capability version evidence; version/profile mismatch must fail with a safe explicit error, not eight-tool fallback. Preserve current MCP config and identity/restore behavior. Cover representative native categories, exclusion family, standalone and Team/Org, and profile drift with automated tests.
2. At the AGY stream boundary, first implement native-image public failure classification/redaction and the restricted diagnostic sink. Scrub native-image start arguments so a later failure cannot leave raw parameters on a public tool card. For `ERROR` or any explicit error (including `DONE`), classify denial versus failure privately, emit only fixed safe `error`/`reason`, null failed output, and no generated artifact; do not pass arbitrary provider error/output or stderr to canonical events. Test the existing web tool card, WebSocket ACK/status, persisted/reloaded trace and Files against malicious marker paths/URLs/tokens for both failure and denial; test private correlation, file permissions/bounds and safe behavior when diagnostic writing fails. Then adapt successful native `generate_image` output only from AGY `step_update`; add native-vs-MCP provenance fixtures using existing recorded MCP shape, verify path extraction, real image bytes, absolute-path serving and no fabricated artifact. If AGY's actual native output shape differs, refine the provider adapter before claiming AC-001; do not implement a broad generic text scraper.
3. In a separate isolated agent-package worktree, bundle/pin the intended Codex workflow skill in the supported `agents/codex/skills` location, remove the broken Codex link and update package README. Preserve `skillNames`. Check all referenced skill files and package validation.
4. First extend the SkillService/configured-skill resolver boundary with a typed AGY-facing outcome over supported contextual and global roots. Certify absence only when no candidate directory exists; distinguish present directory without a valid `SKILL.md`, unreadable/malformed/name-mismatched manifest and other invalid candidates. Preserve the existing Codex/Claude-facing resolver behavior. Then pass detailed outcomes plus run/definition identity into AGY capsule materialization: warn/omit only certified absence, snapshot resolved skills, fail invalid candidates; treat resolved-source disappearance/mutation after resolution as `source_changed`, not absence. Keep existing generic public redaction for hard failures. Test missing-only and mixed resolved/missing first turns; present malformed/name-mismatched/no-manifest contextual and global candidates; valid fallback not hiding present invalid AGY source; source-change race, `SkillAccessMode.NONE`, manifest v1/restore and status/ACK separation. Do not add a manager-level missing-skill error mapping.
5. Run server/package checks and API/E2E/native-provenance validation as normal implementation/delivery verification (not further exploratory design experiments). Verify a real AGY-native image, returned file bytes and path, configured MCP coexistence, and lack of provider-native collaboration calls. If verification contradicts the contract, return to Solution Designer with evidence; do not weaken approved behavior.

## Key Tradeoffs
- An explicit supported-version native profile is less automatic than inheriting future AGY tools, but is the documented CLI custom-agent control that keeps essential native tools while excluding native collaboration. Unknown versions fail visibly, not silently.
- A pre-execution denial hook would preserve visibility of unwanted collaboration tools and is not equivalent to removing them from exposure; do not use it as the primary policy. The SDK `disabled_tools` API is not the CLI integration.
- Bundling the 31-file intended skill adds package payload and requires provenance/sync discipline, but makes Codex self-contained and avoids host-specific global settings/symlinks. Only cause-certified absence remains a nonblocking warning under the approved policy. The user deferred live symlink updates to a future ticket; do not replace AGY snapshots here.
- Existing file projection avoids a second artifact system; AGY-specific output normalization keeps provider parsing out of shared projection.

## Risks
- Exact full AGY native list and native image output structure are not yet proven for every accepted CLI version. No more exploratory AGY experiments now; automated implementation validation is a release gate. If validation cannot establish parity, stop/return a finding.
- Existing `init.tools` is registry inventory, not proof the selected custom agent may invoke every name. Do not use it alone to claim acceptance.
- Generated image may live under AGY's brain directory outside the workspace; verify realpath/regular file/content and avoid publishing arbitrary provider/model text as an indexed file. Preserve existing file-content authorization expectations.
- Package skill duplication can drift from canonical `autobyteus-skills`; pin source revision and document update ownership. Separate Git worktrees/finalization needed.
- Warnings and error messages must not expose stderr, MCP endpoint, stack or arbitrary absolute host paths. Missing-skill warnings are backend-only and contain run/agent/skill/disposition rather than raw filesystem causes; invalid-candidate and source-change failures retain generic public redaction and bounded backend reason codes. A false `certified_absent` from a present contextual/global candidate would violate AC-004; test all supported source locations and preserve Codex/Claude behavior. Native image raw failure evidence is private run-memory data, bounded and file-permission restricted; never use it as a public fallback if recording fails.

## Guidance For Implementation
No production code was changed in this design round. Test tool-call **provenance**, not merely an image file appearing; a native AGY call must be `tool_name: generate_image`, while recorded MCP uses `call_mcp_tool`. Do not conflate automatic approval with tool availability. Update the AGY runtime documentation and package README after code behavior is verified. Independent review should scrutinize complete native categories/exclusion names, provider-version handling, native image output path safety, resolver-certified absence versus present-invalid/source-changed boundary across contextual/global roots, Codex/Claude non-regression, manifest/restore continuity, and whether the bundled Codex skill is the intended exact source.
