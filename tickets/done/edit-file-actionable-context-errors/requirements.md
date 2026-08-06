# Requirements Doc

## Status

`Design-ready`

## Goal / Problem Statement

Make `edit_file` easier for language models to use and self-correct safely. Its model-facing contract must clearly identify the patch as a simplified unified-diff-style format, tell the model to obtain and copy exact current context before editing, show one canonical bare-hunk example, and return bounded hunk-specific diagnostics when context matching fails. These improvements must preserve strict matching, unique location requirements, ordered multi-hunk behavior, and atomic no-partial-write safety.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The native and XML `edit_file` descriptions explain bare `@@` syntax but do not call it simplified unified-diff-style, do not tell the model to read current content before editing, do not warn against reconstructing context from memory, and do not place the agreed minimal example directly in the `patch` field guidance. | Tell the model to read the current relevant region unless it is already current, copy unchanged/removal lines exactly, re-read after intervening edits or match failures, and place the exact simplified unified-diff-style bare-hunk example directly in the model-visible `patch` field description. | Separate `path`/optional `base_dir`, XML sentinel framing, bare `@@`, prefix meanings, unique anchor requirement, and `write_file` guidance remain supported. | REQ-002, REQ-003, REQ-004 / AC-002, AC-003, AC-004 |
| BEH-002 | When one hunk in a multi-hunk patch cannot be found, `edit_file` returns only `Could not find the context hunk in the eligible target region` plus generic retry advice. It does not identify the failed hunk or show the likely one-line context mistake. | Report one-based hunk index/total and exhausted strategies. When exactly one one-line-difference target exists, report its range, mismatch line, diagnostic-only status, and only the mismatching expected/actual excerpts; collapse identical surrounding lines. For zero or multiple candidates, report only that state. End with targeted re-read/retry guidance and the no-write truth. | Exact then whitespace-tolerant matching remains the only application policy; candidate evidence is diagnostic-only; full context remains available through `read_file` rather than being echoed in the error. | REQ-001, REQ-005, REQ-006, REQ-007, REQ-008 / AC-001, AC-005, AC-006, AC-007, AC-008 |
| BEH-003 | Ambiguous and hunk-body grammar errors state a reason but omit hunk identity; ambiguity does not report the number of eligible matches. | Identify every identifiable failing hunk as `hunk <index> of <count>`; ambiguity reports its match count and asks for more unique current context; hunk-body grammar errors keep their specific reason. | Document-level grammar errors remain document-level; no ambiguous location is selected. | REQ-005, REQ-009 / AC-009, AC-010 |
| BEH-004 | Patch application is pure/atomic before `editFile` writes, and no-match or ambiguous errors cause no file change. | Preserve that safety and state it explicitly in model-visible patch failures. Diagnostics must never change match eligibility or trigger automatic fuzzy application. | Ordered eligible regions, exact-first/whitespace retry, no-partial-write behavior, path security, provider transport, and ToolPhase outer error prefix remain unchanged. | REQ-010, REQ-011 / AC-005 through AC-012 |

## Investigation Findings

The user-reported failure is retained as `call_2b7ce326e1ae4cc3ba576f18` in Daily Assistant run `daily_assistant_b2c1cd14f5304d6a8dab124548c73b0b`, turn 3. DeepSeek read `renderer.ts` lines 1-75 immediately before the edit and no intervening write occurred. Its second of four hunks nevertheless copied `private readonly particles = new Particles()` as `private particles = new Particles()`. Exact audit found hunks 1, 3, and 4 match; hunk 2 does not. The constructor was not different, contrary to DeepSeek's post-error explanation.

The public error hid that distinction, so the model guessed and fell back to a Python replacement. A deterministic probe found exactly one eligible two-line target window for hunk 2 where one line matched and one line differed: target lines 13-14. This establishes a bounded diagnostic candidate without using it for application.

Current ownership is locally coherent: `context-patch.ts` owns grammar, hunk order, matching, and pure assembly; `edit-file.ts` owns read/retry/write and the native tool schema; the XML schema/example formatters own XML presentation; ToolPhase adds the outer invocation prefix. The change pressure is missing diagnostic structure plus incomplete model guidance, not a need to weaken matching or refactor transport.

The exact diagnostic text, candidate states, evidence-window bounds, and examples are authoritative in `/Users/normy/autobyteus_org/autobyteus-worktrees/edit-file-actionable-context-errors/tickets/in-progress/edit-file-actionable-context-errors/edit-file-diagnostic-contract.md` and summarized below. Its concise ARCH-FIND-002 revision was approved by the user on 2026-08-06.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/edit-file-actionable-context-errors/tickets/in-progress/edit-file-actionable-context-errors/edit-file-diagnostic-contract.md` | Intended-behavior contract for exact model guidance, canonical example, deterministic diagnostic eligibility/bounds, and error templates | REQ-002 through REQ-010 | AC-002 through AC-011 | Fully approved by user on 2026-08-06, including concise diagnostic revision | Pins the model-visible text and diagnostic outcomes so design/implementation do not invent them. |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor posture: `Needed, owner-local`
- Evidence basis: `PatchApplicationError` currently carries only a message; hunk identity is discarded between parsing/matching and the public retry boundary. Establishing a truthful total for hunk-body errors requires a document scan before indexed body validation. The exact tool/parameter wording is also duplicated across native/XML presentation and has no shared owner. Existing semantic, I/O, presentation, and ToolPhase boundaries remain correctly separated.
- Requirement or scope impact: Enrich the existing semantic failure structure, extract one shared edit-contract source, add one bounded public renderer, align existing model-facing surfaces/docs, and add focused coverage. Do not add provider/model branches, fuzzy application, a new path format, or a broad tool-error framework.

## Recommendations

Keep diagnostic data with the patch semantic owner and render the final exhausted-retry message at the `editFile` boundary, where exact and whitespace-tolerant attempts plus no-write outcome are known. Give parsed hunks stable one-based identity. For missing context, show actual target content only when one unique same-length eligible window differs in exactly one line and all other lines match under existing whitespace-tolerant/EOF comparison. Show only the mismatching expected/actual excerpts, not identical anchor lines or repeated expected/candidate blocks. Center bounded long-line excerpts on the first code-point difference that remains after the matcher's whitespace trim so truncation cannot hide the reason. Distinguish zero, unique, and multiple candidate outcomes without selecting or exposing a non-unique target.

Own the exact semantic wording/example once in the file-tool capability, consume it from native and XML presentations, place the canonical bare-hunk example directly in the `patch` field guidance, and preserve XML sentinel instructions immediately after the XML field example. Keep strict application behavior unchanged.

## Scope Classification

`Small`

## In-Scope Use Cases

- A model that has not recently read a target region learns to read current relevant content before constructing `edit_file` context.
- A model that already has current content avoids a redundant read but copies unchanged/removal lines exactly rather than reconstructing them from memory.
- A model re-reads the affected region after an intervening edit or a context-match failure.
- A missing later hunk in a multi-hunk patch identifies its position and shows a unique, bounded one-line-difference target when deterministically available.
- A missing hunk with no qualifying candidate states that outcome and gives explicit re-read guidance without echoing submitted context.
- A missing hunk with multiple qualifying diagnostic candidates states that none was selected or applied and asks for more unique exact context without displaying candidate content.
- An ambiguous hunk reports its index/total and eligible match count without choosing a location.
- A hunk-body grammar failure reports its hunk index/total and specific reason.
- Native and XML model surfaces show the same simplified unified-diff-style semantics while XML retains required sentinel framing.

## Out of Scope

- Automatically applying, relocating, or retrying against a closest/fuzzy candidate.
- Levenshtein, embedding, or semantic similarity used to authorize file changes.
- Weakening strict/whitespace matching, unique-location requirements, ordered hunk eligibility, or atomic writes.
- Replacing the separate `path` argument with Codex-style `*** Update File` envelopes or full Git unified diffs.
- Provider/model-specific instructions or DeepSeek-only branches.
- Changing ToolPhase's outer `Error executing tool ...` prefix.
- Rewriting the Daily Assistant's game files or historical trace.
- Reopening the validated newline-boundary behavior; integration must preserve it.

## Functional Requirements

- `REQ-001`: Retain secret-safe evidence of the exact Daily Assistant read, failed patch, four-hunk audit, absence of an intervening write, and deterministic one-line-difference candidate result.
- `REQ-002`: The native tool description shall communicate the exact read-current/copy-exact/re-read workflow, simplified unified-diff-style identity, trusted-local path behavior, surgical-edit purpose, and `write_file` boundary specified in the diagnostic contract.
- `REQ-003`: Native and XML `patch` parameter descriptions shall communicate bare `@@`, the space/`-`/`+` prefixes, exact current-context copying, separate-path semantics, prohibited Git headers/numeric coordinates/semantic envelopes, and unique-location anchoring as specified in the diagnostic contract.
- `REQ-004`: The native/API `patch` parameter description shall contain the exact multiline bare replacement example from the diagnostic contract. The XML `patch` field's schema guidance shall contain the same example immediately before its sentinel instructions. A separate usage example shall not be treated as a substitute.
- `REQ-005`: Every error attributable to a parsed hunk shall identify the one-based failing hunk index and total hunk count. Document-level errors that cannot be assigned to a hunk shall remain document-level.
- `REQ-006`: After `edit_file` exhausts exact and whitespace-tolerant matching for a missing hunk, the final inner error shall use the concise candidate-state-specific shape and targeted correction/no-write text specified by the missing-context diagnostic contract. It shall not echo full expected or candidate context blocks.
- `REQ-007`: A target candidate may be displayed only when the expected anchor contains at least two lines and exactly one eligible same-length window has exactly one nonmatching line under existing whitespace-tolerant/EOF comparison. It shall be diagnostic-only and shall never alter application behavior.
- `REQ-008`: For one unique diagnostic candidate, output shall contain only its target range, absolute mismatch line, diagnostic-only label, and the mismatching expected/actual evidence. Identical surrounding lines shall be collapsed rather than echoed. Each final prefixed evidence line shall be at most 200 Unicode code points including its `-`/`+` prefix and any ellipses; long excerpts shall use the contract's deterministic focus window around the first differing code-point position after existing whitespace-tolerant normalization. When zero or multiple candidates qualify, no expected/actual or candidate content shall be displayed.
- `REQ-009`: Ambiguous context shall concisely report exhausted strategies, hunk identity, and the exact eligible full-match count; display no source content or locations; state that none was selected or applied; and request more unique exact context. Identifiable hunk-body grammar errors shall report hunk identity plus their specific reason.
- `REQ-010`: Every public patch application failure shall preserve and truthfully state the no-file-write outcome. Diagnostics shall not weaken matching, matching order, eligible-region sequencing, uniqueness, or atomicity.
- `REQ-011`: Durable coverage shall include the exact concise retained failure shape and absence of repeated identical context; missing first/later hunks; distinct unique/zero/multiple candidate states; ambiguity count; hunk-body grammar identity; difference-focused long-line windows and final physical-line bounds; native/XML wording and example; no partial write; successful exact and whitespace-tolerant edits; and unchanged ToolPhase prefix behavior.
- `REQ-012`: Integration shall preserve the approved final-record/no-newline-marker contract and transport-owner boundaries from the separate newline-boundary change.

## Acceptance Criteria

- `AC-001`: Investigation evidence names run `daily_assistant_b2c1cd14f5304d6a8dab124548c73b0b`, call `call_2b7ce326e1ae4cc3ba576f18`, the immediate read call, hunk audit results `match/fail/match/match`, the omitted `readonly`, and the unique target lines 13-14 without copying unrelated prompt content or secrets.
- `AC-002`: The registered native tool description contains the approved instructions to read current relevant content unless already current, copy exact unchanged/removal lines, avoid reconstructing from memory, and re-read after intervening edits or match failure.
- `AC-003`: Native and XML patch descriptions identify the format as simplified unified-diff-style and explicitly prohibit `diff --git`, `---`/`+++`, numeric hunk coordinates, and `*** Begin/End Patch` semantic envelopes while retaining the separate path and XML sentinel distinction.
- `AC-004`: Inspecting the native/API `patch` field description and XML `patch` field schema guidance finds the canonical `@@` example with exact removal/addition lines and the required leading-space unchanged line. The example appears in the patch field itself, contains no path/file header/numeric coordinate, and precedes rather than replaces XML sentinel instructions.
- `AC-005`: Replaying the exact four-hunk failure through `edit_file` produces the concise canonical message: `hunk 2 of 4`, exhausted exact/whitespace strategies, unique target lines `13-14`, mismatch at line `13`, `diagnostic only; not applied`, only `private particles...` versus `private readonly particles...`, targeted reread of lines `13-14`, and `No file changes were written`. It does not repeat the identical `private time = 0` line or emit full expected/candidate blocks; the target file remains byte-identical.
- `AC-006`: A later-hunk no-match with zero qualifying candidates reports the correct hunk index/total, exhausted strategies, `No one-line-difference target was found in the eligible region.`, targeted current-region reread/exact-context retry guidance, and no-write truth without displaying expected, actual, or candidate content.
- `AC-007`: A no-match with two or more qualifying one-line-difference windows reports that multiple targets were found and none was selected or applied, asks for more unique exact unchanged/removal context, displays no target or source content, and writes nothing.
- `AC-008`: For mismatching logical lines longer than the evidence budget, each final `-`/`+` evidence line is at most 200 Unicode code points including prefix and ellipses. A code-point-aware excerpt window includes the first differing position after the existing whitespace-tolerant trim comparison, uses leading/trailing `…` when source content is omitted, and therefore cannot truncate away the actual difference.
- `AC-009`: An ambiguous multi-hunk case reports the correct hunk index/total, exhausted strategies, and exact eligible match count; states that no location was selected or applied; asks for more unique exact unchanged/removal context; displays no source content; and writes nothing.
- `AC-010`: Hunk-body failures such as no change or no safe anchor report `Invalid context hunk <index> of <count>` plus the specific canonical reason; unsupported document headers remain document-level.
- `AC-011`: Exact matching, whitespace-tolerant fallback, ordered hunks, EOF allowance, newline-marker/final-record behavior after integration, protected paths, and successful writes remain behaviorally unchanged.
- `AC-012`: Focused semantic/I/O/schema/formatter/ToolPhase tests, relevant broader file-tool coverage, build/typecheck, and `git diff --check` pass.

## Constraints / Dependencies

- Authoritative task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/edit-file-actionable-context-errors`.
- Task branch: `codex/edit-file-actionable-context-errors`, based on refreshed `origin/personal` commit `09e22b343f770b84d536dc9a97d0f1c2f6652814`.
- Separate predecessor worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-edit-newline-boundary`; that validated change is not yet on `origin/personal` at bootstrap. Delivery must refresh and integrate the finalized target before this follow-up is finalized.
- Raw memory is read-only external evidence and must not be copied wholesale, modified, or exposed beyond bounded relevant excerpts.
- Diagnostics may expose only bounded content from the already-authorized target file and eligible region.
- XML sentinel tags are transport framing and must not be prohibited by semantic-wrapper wording.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing workspace files and agent memory traces.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing files/traces; no schema or migration.
- Unacceptable data loss or corruption: Partial writes, approximate edits, edits at an ambiguous/wrong location, historical trace mutation, or unbounded diagnostic leakage.
- Relevant availability, maintenance-window, or rollout constraints: None.
- Related requirement and acceptance-criteria IDs: REQ-001 through REQ-012; AC-001 through AC-012.

## Assumptions

- A current relevant region may come from a recent `read_file` call or another exact, still-current source such as content just written by the same agent; an unconditional redundant read is not required.
- One-line-difference candidate detection is sufficient for the observed self-correction case and intentionally conservative for this scope.
- Existing whitespace-tolerant matching uses trimmed line equality; diagnostics reuse that comparison only to describe a failed patch, never to create another application path.
- One-based target line numbers are computed from the actual target content read by `editFile`.

## Risks / Open Questions

- The diagnostic contract adds only the unique candidate's bounded mismatch excerpts to errors. This stays within the same authorized target-file boundary, but tests must enforce non-duplication, focus-window, and final physical-line caps.
- Better guidance cannot prevent every model transcription error; the actionable error is required because the observed model had already read the file and still omitted `readonly`.
- The follow-up branches from a base that does not yet contain the newline-boundary candidate. No code from that candidate may be silently lost during later integration.
- Precision is a locked requirement: public failures must isolate novel actionable evidence and must not regress to repeated full expected/candidate/difference blocks.

## Requirement-To-Use-Case Coverage

| Use Case | Requirement IDs |
| --- | --- |
| Read current content and copy exact context | REQ-002, REQ-003, REQ-004 |
| Exact observed later-hunk mismatch | REQ-001, REQ-005, REQ-006, REQ-007, REQ-008, REQ-010, REQ-011 |
| Missing context with no unique candidate | REQ-005, REQ-006, REQ-007, REQ-008, REQ-010, REQ-011 |
| Multiple diagnostic candidates | REQ-007, REQ-008, REQ-010, REQ-011 |
| Ambiguous exact/whitespace context | REQ-005, REQ-009, REQ-010, REQ-011 |
| Hunk-body grammar correction | REQ-005, REQ-009, REQ-011 |
| Preserve safe patch application and predecessor behavior | REQ-010, REQ-011, REQ-012 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Auditable exact failure cause and candidate evidence |
| AC-002 | Read/copy/re-read workflow reaches native models |
| AC-003 | Precise format/envelope semantics across native and XML surfaces |
| AC-004 | One valid minimal example is visible exactly where the model constructs the patch argument |
| AC-005 | Exact DeepSeek self-correction diagnostic and atomicity |
| AC-006 | Concise zero-candidate handling without source echo |
| AC-007 | Concise multiple-candidate handling without target selection or source echo |
| AC-008 | Difference-focused Unicode window and final-line bounds |
| AC-009 | Actionable ambiguity without unsafe selection |
| AC-010 | Hunk-specific grammar feedback |
| AC-011 | No matching, newline, security, or write regression |
| AC-012 | Executable and static validation |

## Approval Status

Fully approved by the user on 2026-08-06. The initial approval covers the model guidance and canonical example directly in the model-visible `patch` field. The renewed response `yes please. be at least try to be precise right? or try to be precise. thanks. lets go` approves the ARCH-FIND-002 concise diagnostic revision in BEH-002, REQ-006/REQ-008/REQ-009/REQ-011, AC-005 through AC-009, and the corresponding intended-behavior supplement sections. All preserved safety and integration behavior remains locked.
