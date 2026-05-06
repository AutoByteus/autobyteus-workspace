# Design Spec

## Current-State Read

The server-owned media tools are centralized under `autobyteus-server-ts/src/agent-tools/media`. Tool entrypoints are defined by `MEDIA_TOOL_MANIFEST`; each entry parses arguments and delegates to `MediaGenerationService`. `MediaGenerationService.generateImage`, `editImage`, and `generateSpeech` all use `MediaPathResolver` before provider interaction:

- `generateImage` resolves `output_file_path` and optional `input_images`.
- `editImage` resolves `output_file_path`, `input_images`, and optional `mask_image`.
- `generateSpeech` resolves `output_file_path`.

Original source used `resolveSafePath` from `autobyteus-ts/src/utils/file-utils.ts` for both media outputs and local media inputs. That helper allows only workspace, Downloads, and OS temp. The first design removed that policy for outputs only. The user then clarified that output-only removal is incomplete because a generated image saved to an external path commonly becomes a later `edit_image` input path. Therefore the same application-level allowlist must be removed from local `input_images` and `mask_image` paths as well.

The current local implementation in the task worktree has already changed output path behavior and tests, but still leaves local input images/masks on `resolveSafePath`. That implementation should be kept as a base and revised.

Codex and Claude runtime integrations both route media calls through `MEDIA_TOOL_MANIFEST` and `MediaGenerationService`, so a media resolver/schema change covers all runtime exposures. The generic `resolveSafePath` helper remains correct for unrelated tools and should not be changed globally.

## Intended Change

Remove the workspace/Downloads/temp application-level allowlist from all local media paths owned by the server media tools:

- `output_file_path` for `generate_speech`, `generate_image`, and `edit_image`.
- local filesystem paths and `file:` URLs in `input_images` for `generate_image` and `edit_image`.
- local filesystem paths and `file:` URLs in `mask_image` for `edit_image`.

Target behavior:

- Absolute local paths are normalized and accepted regardless of workspace/Downloads/temp location.
- `file:` URLs are converted to local paths and then normalized with the same media local path policy.
- Relative local paths continue to resolve under the active workspace root.
- Relative paths that escape the workspace via traversal are rejected; callers should provide absolute paths for intentional external locations.
- URL and data URI input references still pass through unchanged.
- Local input image/mask paths still must exist and be files.
- Tool schema descriptions stop advertising old allowlist/safe-local-path wording.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, but only a local resolver refactor.
- Evidence: All relevant media path fields already converge on `MediaPathResolver`; user clarified that media output paths must be reusable as media input paths; current paused implementation still uses `resolveSafePath` for inputs and is therefore incomplete.
- Design response: Give `MediaPathResolver` a media-specific local path normalization helper used by both output and local input/mask resolution. Remove media resolver dependency on `resolveSafePath`. Keep generic `resolveSafePath` unchanged for non-media consumers.
- Refactor rationale: Without the local helper, output and input policies can drift. A small private helper inside the existing resolver tightens ownership without introducing a new subsystem.
- Intentional deferrals and residual risk, if any: No UI confirmations or configurable path policy are added. Residual risk is broader media-tool local file read/write access bounded by explicit arguments and OS/runtime permissions.

## Terminology

- `Local media path`: a local filesystem path or `file:` URL supplied to a media path parameter.
- `Remote/data media reference`: an `http:`, `https:`, or `data:` input image reference; these are not local paths.
- `External absolute media path`: an absolute local path outside the run workspace, Downloads, and system temp.
- `Workspace-contained relative media path`: a relative media path that resolves under the run workspace without traversal escape.

## Design Reading Order

1. Data-flow spine from tool invocation to media path resolution and provider use.
2. Ownership split: media operation orchestration vs media path policy.
3. Local resolver refactor inside `MediaPathResolver`.
4. Schema/test updates.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old workspace/Downloads/temp allowlist behavior from media local paths, not just outputs.
- Do not add compatibility flags or runtime-specific dual behavior.
- Do not change `resolveSafePath` globally; in this task, the obsolete piece is its use for media local paths, not the helper itself.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime media tool invocation | Provider uses inputs and generated media is written/returned | `MediaGenerationService` with `MediaPathResolver` owning path policy | Shows one resolver change covers all three tools and runtimes. |
| DS-002 | Bounded Local | Local media path string or `file:` URL | Normalized local media path or validation error | `MediaPathResolver` | Core refactor point for outputs, inputs, and masks. |
| DS-003 | Bounded Local | Remote/data input reference | Original remote/data reference | `MediaPathResolver` | Confirms URL/data behavior remains unchanged. |
| DS-004 | Return-Event | Provider response URL | `{ file_path }` result and generated-output projection | `MediaGenerationService`; file-change projection | Ensures external absolute outputs remain representable downstream. |
| DS-005 | Primary End-to-End | `generate_image` external output | Later `edit_image.input_images` using the same path | `MediaPathResolver` | Captures the clarified workflow requirement. |

## Primary Execution Spine(s)

`Runtime tool exposure -> MEDIA_TOOL_MANIFEST entry -> MediaGenerationService operation -> MediaPathResolver local/remote path resolution -> Provider client generation/edit/speech -> downloadFileFromUrl write -> { file_path } result`

Generate-then-edit spine:

`generate_image output_file_path external absolute -> { file_path } external absolute -> edit_image input_images includes same file_path -> MediaPathResolver validates existing local file -> provider edit call`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The runtime exposes the configured media tool, the manifest parses arguments, and the media service resolves media paths before invoking the provider and writing generated media. | Runtime exposure, manifest, media service, path resolver, provider client, writer/result | `MediaGenerationService` coordinates; `MediaPathResolver` owns path policy | Model resolution, cleanup, schema generation |
| DS-002 | A local media path is trimmed, `file:` converted if needed, normalized as an unrestricted absolute path or workspace-contained relative path, then returned to the caller. | Raw local path, workspace root, normalized local path | `MediaPathResolver` | Node `path`/URL conversion, traversal check |
| DS-003 | Remote/data media inputs bypass local filesystem normalization and pass through unchanged. | Input reference, URL/data recognizer | `MediaPathResolver` | None |
| DS-004 | Provider returns media URL/data/file, the service writes it to the resolved output path, returns `{ file_path }`, and generated-output projection can show relative or absolute path. | Provider response, writer, result, projection | `MediaGenerationService`; file-change builder | Artifact type inference |
| DS-005 | An image generated to an external absolute output path becomes a valid later edit input path because local input resolution uses the same unrestricted absolute media path policy. | Generated output, returned file path, edit input, input validation | `MediaPathResolver` | Existence/is-file check |

## Spine Actors / Main-Line Nodes

- Runtime media tool exposure: local registry, Codex dynamic tool, or Claude MCP surface.
- `MEDIA_TOOL_MANIFEST`: names/parses tool inputs and dispatches to service methods.
- `MediaGenerationService`: owns operation sequencing, provider client lifecycle, and result shape.
- `MediaPathResolver`: owns media-specific path interpretation for outputs, inputs, and masks.
- Provider client: generates/edits image or generates speech.
- `downloadFileFromUrl`: writes generated media to the resolved output path.

## Ownership Map

| Owner | Owns | Notes |
| --- | --- | --- |
| `MediaGenerationService` | Media operation sequencing, provider client lifecycle, final result shape | Should call resolver for all media path policy. |
| `MediaPathResolver` | Local/remote media path interpretation and validation | Must own both write-destination normalization and read-source normalization. |
| `resolveSafePath` in `autobyteus-ts` | Generic workspace/Downloads/temp safe path policy for unrelated tools | No longer used for media local paths after this change. |
| `downloadFileFromUrl` | Parent directory creation, media transfer/copy/write cleanup | Does not own path allowlist. |
| Tool schema builder | User-visible argument contract text | Must describe unrestricted absolute local media paths. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Codex dynamic media tool handler | `MEDIA_TOOL_MANIFEST` + `MediaGenerationService` | Adapts Codex dynamic tool calls | Local media path policy |
| Claude media MCP tool handler | `MEDIA_TOOL_MANIFEST` + `MediaGenerationService` | Adapts Claude SDK MCP tool definitions | Local media path policy |
| Local registry media tool | `MEDIA_TOOL_MANIFEST` + `MediaGenerationService` | Exposes server-owned tools through AutoByteus registry | Local media path policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `resolveSafePath` use in `resolveOutputFilePath` | It enforces old output allowlist | Media-specific local path normalizer inside `MediaPathResolver` | In This Change | Current paused implementation already does this. |
| `resolveSafePath` use in `resolveInputImageReference` | It blocks external generated outputs from being reused as edit inputs | Same media-specific local path normalizer plus input existence/is-file check | In This Change | Main requirement gap. |
| Schema wording `safe local file paths` for `input_images` | It implies old media input allowlist | Updated input descriptions | In This Change | Use readable local file path wording. |
| Old output allowlist schema wording | It documents obsolete behavior | Updated output descriptions | In This Change | Current paused implementation partly handles this. |
| Tests expecting external local media inputs to be rejected solely by allowlist | They encode obsolete behavior | Tests for external existing input acceptance and missing/non-file rejection | In This Change | Do not lose validation, change the reason for rejection. |

## Return Or Event Spine(s) (If Applicable)

`Provider response URL -> MediaGenerationService.writeGeneratedMediaFromUrl(outputPath) -> { file_path: outputPath } -> generated-output FILE_CHANGE projection`

Workspace-contained outputs project as relative paths; external absolute outputs project as normalized absolute paths. No projection change is required.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MediaPathResolver`
  - Local media path internal spine: `raw path or file URL -> trim/validate -> file URL conversion if needed -> absolute branch OR relative branch -> normalized local path`.
  - Absolute branch: `path.resolve(localPath)` with no workspace/Downloads/temp allowlist.
  - Relative branch: `path.resolve(workspaceRoot, localPath)` plus containment check.
- Parent owner: `MediaPathResolver`
  - Input reference internal spine: `raw input reference -> URL/data pass-through OR local media path normalization -> exists/isFile check`.
- Parent owner: `MediaPathResolver`
  - Output path internal spine: `raw output path -> local media path normalization -> write destination returned`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Model resolution | DS-001 | `MediaGenerationService` | Choose configured/fallback media model | Existing provider selection concern | Would mix provider policy with path policy. |
| Schema generation | DS-001, DS-002 | Tool manifest/registry | Describe arguments for runtime/tool users | Contract must match behavior | Stale schema misleads users/models. |
| File-change projection | DS-004 | Run event processors | Display/persist generated output references | UI/history needs artifact paths | Path policy should not be duplicated here. |
| Generic safe path utility | None for revised media paths | Unrelated tools | Workspace/Downloads/temp safe path policy | Still useful elsewhere | Global changes would over-broaden unrelated tools. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Media local path normalization | `agent-tools/media` / `MediaPathResolver` | Extend | Existing owner already governs media paths | N/A |
| Input existence/is-file validation | `MediaPathResolver` | Reuse | Existing input validation remains useful | N/A |
| Generated output projection | Agent execution file-change processing | Reuse | Already supports external absolute paths | N/A |
| Shared unrestricted local path helper | None | Do not create | Scope is media-specific; private helper is enough | Existing media resolver is the right owner. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/media` | Media tool contracts, schema, parsing, path resolution, generation service | DS-001, DS-002, DS-003, DS-005 | `MediaGenerationService`, `MediaPathResolver` | Extend | Primary change area. |
| `autobyteus-ts/utils` | Shared safe-path and download utilities | DS-004 | `downloadFileFromUrl`; unrelated consumers | Reuse unchanged | `resolveSafePath` no longer media-local path owner. |
| Runtime backends (`codex`, `claude`) | Tool exposure adapters | DS-001 | Runtime handlers | Reuse unchanged | Inherit media behavior. |
| Agent execution file changes | Generated-output projection | DS-004 | File-change processors | Reuse unchanged | No refactor needed. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-tools/media/media-tool-path-resolver.ts` | `agent-tools/media` | `MediaPathResolver` | Shared private local media path normalization; input/output resolver methods | Existing path-policy owner for media tools | Private local helper only. |
| `src/agent-tools/media/media-tool-parameter-schemas.ts` | `agent-tools/media` | Schema builder | Update output/input/mask descriptions | Existing schema owner | Optional constants for wording. |
| `tests/unit/agent-tools/media/media-tool-path-resolver.test.ts` | Tests | Resolver behavior coverage | External output/input/file URL acceptance; relative containment; missing/non-file rejection | Existing focused test | N/A |
| `tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Tests | E2E media behavior | Update old input rejection expectations and common chain coverage | Existing media e2e owner | N/A |
| `tests/unit/agent-tools/media/register-media-tools.test.ts` | Tests | Schema coverage | Assert no old allowlist/safe wording remains | Existing schema-adjacent test | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Local media path normalization | Private helper in `media-tool-path-resolver.ts` | `agent-tools/media` | Used by output and local input/mask paths | Yes | Yes | A global unrestricted path helper for unrelated tools. |
| Path description wording | Constants in `media-tool-parameter-schemas.ts` if useful | `agent-tools/media` | Output/input/mask descriptions should stay aligned | Yes | Yes | Divergent copy with stale allowlist wording. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MediaToolExecutionContext.workspaceRootPath` | Yes | N/A | Low | Still required for relative path resolution. |
| `output_file_path` | Yes | Yes | Low | One field remains write destination. |
| `input_images` / `mask_image` | Yes | Yes | Low | Local paths, file URLs, URLs, and data URIs remain one input-reference concept; local path behavior changes. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-path-resolver.ts` | `agent-tools/media` | `MediaPathResolver` | Authoritative media path interpretation: unrestricted absolute local media paths, workspace-contained relative media paths, URL/data pass-through, input existence checks | Existing media path owner; local helper prevents drift | Private helper; Node `path`; `fileURLToPath`. |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | `agent-tools/media` | Schema builder | User/model-visible media path parameter descriptions | Existing schema owner | Existing schema helpers. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-tool-path-resolver.test.ts` | Tests | Resolver tests | Unit coverage for output, input, mask-local helper behavior through public methods | Existing focused test | N/A |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Tests | E2E media tests | Integration coverage for media path normalization expectations | Existing media e2e owner | N/A |
| `autobyteus-server-ts/tests/unit/agent-tools/media/register-media-tools.test.ts` | Tests | Tool registration/schema tests | Schema contract coverage | Existing registration/schema coverage | N/A |

## Ownership Boundaries

`MediaGenerationService` remains the authoritative operation coordinator; it must not embed path policy. `MediaPathResolver` is the authoritative media path owner for outputs, inputs, and masks. Runtime backend adapters are thin wrappers and must not fork media path behavior. The shared `resolveSafePath` helper is no longer a media-local path authority for this feature; it remains available to unrelated tools.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MediaPathResolver.resolveOutputFilePath` | Local media path normalization for write destinations | `MediaGenerationService` | `MediaGenerationService` using `path.resolve` or `resolveSafePath` directly | Strengthen resolver. |
| `MediaPathResolver.resolveInputImageReference(s)` | URL/data pass-through, file URL conversion, local media path normalization, existence/is-file checks | `MediaGenerationService`, input path preprocessor | Runtime adapters normalizing image paths independently | Strengthen resolver/preprocessor through same owner. |
| `MEDIA_TOOL_MANIFEST` | Tool parse/execute contract | Local registry, Codex, Claude adapters | Runtime-specific media implementations | Add manifest/service capabilities. |

## Dependency Rules

- `MediaGenerationService` may depend on `MediaPathResolver`; it must not bypass it for output, input, or mask path policy.
- `MediaPathResolver` may depend on Node `path`, Node `fs`, `fileURLToPath`, and `downloadFileFromUrl`.
- `MediaPathResolver` must not use `resolveSafePath` for server-owned media local paths after this change.
- Runtime-specific Codex/Claude media adapters must continue to call manifest/service boundaries and must not fork path behavior.
- Do not change `autobyteus-ts/src/utils/file-utils.ts` to make all `resolveSafePath` consumers unrestricted.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MediaPathResolver.resolveOutputFilePath(outputFilePath, context)` | Media output local path | Resolve a media write destination | local path string + `workspaceRootPath` context | Absolute unrestricted; relative workspace-contained. |
| `MediaPathResolver.resolveInputImageReference(inputImage, context)` | Media input reference | Resolve/pass-through and validate an image source reference | URL/data/file/local string + `workspaceRootPath` context | Absolute local unrestricted but must exist and be file. |
| Media tool `output_file_path` parameter | Media write destination | User/model-supplied destination | string | Description must match new behavior. |
| Media tool `input_images` / `mask_image` parameters | Media input references | User/model-supplied image sources | string array / optional string | Description must match new behavior. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveOutputFilePath` | Yes | Yes | Low | Use shared local media path helper. |
| `resolveInputImageReference` | Yes | Yes | Low | Use shared local media path helper plus input validation. |
| `output_file_path` schema | Yes | Yes | Low | Update description. |
| `input_images` / `mask_image` schemas | Yes | Yes | Low | Update descriptions. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Media path owner | `MediaPathResolver` | Yes | Low | Keep name. |
| Output path method | `resolveOutputFilePath` | Yes | Low | Keep name. |
| Input image method | `resolveInputImageReference` | Yes | Low | Keep name. |
| Private helper | `resolveLocalMediaPath` or similar | Yes | Low | Keep private to resolver. |

## Applied Patterns (If Any)

No new architectural pattern is introduced. This is a local policy refactor inside an existing owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-path-resolver.ts` | File | `MediaPathResolver` | Media output/input/mask path resolution and generated media write wrapper | Existing media path-policy owner | Provider/model selection, runtime adapter logic. |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | File | Schema builder | Media tool argument schema descriptions | Existing schema owner | Runtime-specific behavior. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-tool-path-resolver.test.ts` | File | Resolver tests | Focused media path policy coverage | Existing resolver test | Provider integration tests. |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | File | E2E media coverage | Cross-tool/runtime media behavior | Existing e2e owner | Low-level-only assertions beyond needed expectations. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/register-media-tools.test.ts` | File | Tool registration/schema tests | Contract/schema coverage | Existing registration/schema coverage | Path resolver implementation assertions. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-tools/media` | Mixed Justified | Yes | Low | Compact media subsystem already groups contracts, service, path resolver, schema, and manifest coherently. |
| `src/agent-execution/backends/*/media` | Transport/runtime adapter | Yes | Low | No change expected; adapters stay thin. |
| `autobyteus-ts/src/utils` | Shared utility | Yes | Medium if changed | Do not loosen generic safe-path utility. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Absolute media output | `resolveOutputFilePath('/Users/normy/job/generated.png', ctx) -> '/Users/normy/job/generated.png'` | Throwing because path is outside temp workspace/Downloads/temp | Fixes original failure. |
| Generated output reused as edit input | `resolveInputImageReference('/Users/normy/job/generated.png', ctx) -> same path` when file exists | Throwing because path is outside temp workspace/Downloads/temp | Fixes clarified workflow. |
| File URL input | `resolveInputImageReference('file:///Users/normy/job/generated.png', ctx) -> '/Users/normy/job/generated.png'` when file exists | Applying old safe-path allowlist after file URL conversion | Covers common local file URL shape. |
| Relative media path | `outputs/generated.png -> <workspace>/outputs/generated.png` | `../generated.png` silently escaping workspace | Keeps relative semantics predictable. |
| Missing local input | Missing `/Users/normy/job/missing.png` still throws missing/non-file error | Accepting nonexistent input into provider call | Keeps useful validation. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Config flag to keep old media path allowlist | Could preserve old behavior | Rejected | Remove old allowlist for media local paths. |
| Dual behavior by path field | Earlier design kept input restricted while output unrestricted | Rejected after clarification | Use one media local path policy for outputs and local inputs/masks. |
| Dual behavior by runtime backend | Could make Codex/Claude differ from local tools | Rejected | Keep one manifest/service/resolver behavior. |
| Changing `resolveSafePath` globally | Quick way to remove media errors | Rejected | Implement media-specific resolver behavior only. |

## Derived Layering (If Useful)

- Runtime adapter layer: local registry, Codex dynamic tool, Claude MCP tool.
- Media operation layer: manifest + `MediaGenerationService`.
- Media path policy layer: `MediaPathResolver`.
- Shared utility layer: `downloadFileFromUrl`; generic `resolveSafePath` remains for unrelated safe-path consumers.

## Migration / Refactor Sequence

1. Revise `media-tool-path-resolver.ts` from the paused output-only implementation:
   - keep `path` import and relative containment helper.
   - remove the `resolveSafePath` import.
   - add a private/local `resolveLocalMediaPath(rawPath, context, label)` helper.
   - helper behavior: trim/non-empty; convert `file:` URL before local normalization where applicable; absolute paths return `path.resolve`; relative paths resolve under workspace and reject traversal outside workspace.
   - `resolveOutputFilePath` should call the helper for output paths.
   - `resolveInputImageReference` should continue URL/data pass-through; for local paths or `file:` URLs, call the same helper and then check `existsSync`/`statSync().isFile()`.
2. Revise `media-tool-parameter-schemas.ts`:
   - output descriptions: relative workspace, absolute local server-writable path.
   - input descriptions: URLs, data URIs, or local file paths readable by the server process; relative local paths resolve inside workspace.
   - mask description: same local readable path semantics.
   - remove `safe local file paths` wording for media inputs.
3. Revise tests:
   - `media-tool-path-resolver.test.ts`: external absolute output acceptance; external existing input acceptance; external existing `file:` URL input acceptance; relative output/input workspace resolution; relative traversal rejection; missing local input rejection; URL/data pass-through.
   - `server-owned-media-tools.e2e.test.ts`: replace old `/etc/passwd` allowlist rejection with external existing input acceptance and missing/non-file rejection; preserve external output acceptance.
   - `register-media-tools.test.ts`: assert output/input/mask descriptions no longer mention Downloads/system temp/must be under/safe local file paths.
   - Add a direct generate-then-edit resolver-level or service-level scenario if straightforward: generated external path returned, file exists, later edit input resolves.
4. Run focused validation:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/media/media-tool-path-resolver.test.ts tests/unit/agent-tools/media/media-generation-service.test.ts tests/unit/agent-tools/media/register-media-tools.test.ts tests/e2e/media/server-owned-media-tools.e2e.test.ts`
5. Run broader TypeScript validation if implementation touches type signatures:
   - `pnpm -C autobyteus-server-ts typecheck`

## Key Tradeoffs

- One media local path policy avoids the broken generate-output-then-edit-input workflow.
- Keeping relative paths workspace-contained preserves predictable relative semantics while still allowing explicit external absolute paths.
- Not changing `resolveSafePath` avoids accidental behavior changes in unrelated tools.
- Keeping existence/is-file checks for local inputs avoids handing nonexistent paths to providers while still removing the location allowlist.

## Risks

- Media tools can now read local media files anywhere the server process can read if the path is supplied explicitly. This is an accepted clarified requirement.
- Media tools can write generated files anywhere the server process can write if the path is supplied explicitly. This is the original requested behavior.
- Runtime sandboxing may still block paths; the server should surface normal read/write errors.
- Prior architecture review report is stale because it passed an output-only design; revised design must be reviewed again before implementation resumes.

## Guidance For Implementation

Suggested private helper shape:

```ts
const resolveLocalMediaPath = (
  rawPath: string,
  context: MediaToolExecutionContext,
  pathLabel: string,
): string => {
  const normalized = rawPath.trim();
  if (!normalized) {
    throw new Error(`${pathLabel} must be a non-empty string.`);
  }

  const localPath = normalized.startsWith(LOCAL_FILE_URL_PREFIX)
    ? fileURLToPath(normalized)
    : normalized;

  const workspaceRoot = path.resolve(normalizeWorkspaceRoot(context));
  if (path.isAbsolute(localPath)) {
    return path.resolve(localPath);
  }

  const resolved = path.resolve(workspaceRoot, localPath);
  if (!isWithinOrEqualPath(workspaceRoot, resolved)) {
    throw new Error(
      `${pathLabel} '${rawPath}' escapes the workspace when resolved as a relative path; use an absolute local path for external media locations.`,
    );
  }
  return resolved;
};
```

Then:

- `resolveOutputFilePath` calls this helper and returns the result.
- `resolveInputImageReference` passes through remote/data references; otherwise calls the helper, then validates existence and file-ness.
- The resolver should no longer import `resolveSafePath`.
