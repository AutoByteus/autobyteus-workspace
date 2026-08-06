# Requirements Doc

## Status

`Design-ready`

## Goal / Problem Statement

Correct AutoByteus `edit_file` context-patch handling so an unterminated outer `patch` argument cannot silently concatenate the final changed logical line with the next untouched file line. The contract must work provider-neutrally, preserve explicit EOF-without-newline behavior through the existing marker, and keep valid patch/file behavior exact.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | `applyContextPatch` treats the absence of a terminal line separator on the outer patch string as the absence of a target-file separator. When the final patch body record is an addition followed by untouched file content, both are silently joined. | Treat every prefixed patch body record as one complete logical line even when the outer patch string is not line-terminated. Preserve line separation when untouched file content follows. | Unchanged/removal context still locates a unique eligible region; unrelated bytes remain unchanged; tool success remains truthful. | REQ-001, REQ-002, REQ-003 / AC-001, AC-002, AC-003 |
| BEH-002 | The parser supports `\ No newline at end of file`, but also uses an unterminated outer patch string as an implicit second way to request a target without a final newline. | The exact no-newline marker is the only way patch syntax removes a logical line terminator from changed target content. Outer patch-string termination is transport framing, not target-file semantics. | Explicit marker behavior, files whose untouched final line already lacks a newline, and already terminated patches remain supported. | REQ-002, REQ-004 / AC-004, AC-005, AC-006 |
| BEH-003 | OpenAI-compatible native tool-call streaming preserves the model/provider patch string, including its internal newlines and lack of terminal newline. | Continue transporting tool arguments without provider-specific mutation; apply the corrected invariant only in the provider-neutral context-patch semantic owner. | Provider adapters, streaming delta assembly, tool dispatch, path resolution, and filesystem ownership remain unchanged. | REQ-005 / AC-001, AC-007 |

## Investigation Findings

The retained current Skill Optimizer run used `deepseek-v4-flash-0731` through the OpenAI-compatible runtime and contains 21 `edit_file` calls. All 21 recorded patch arguments lack a terminal `LF`/`CRLF`; 14 end with an addition line. The exact first problematic writer call (`call_fad098d549d341a5b63aa021`) reproduces the reported joined bullets when replayed through the current `applyContextPatch` against the pre-run file.

This is not universal across all retained DeepSeek evidence. An older mixed benchmark corpus contains 232 DeepSeek-labeled edit calls: 170 terminated patches and 62 unterminated patches, with only one unterminated final addition. That corpus spans different model variants, prompts, schemas, and experiments, but it confirms the latest run's 21/21 termination shape is not an invariant DeepSeek behavior. The correction must therefore handle both shapes provider-neutrally.

No evidence supports the model's inference that runtime patch application *dropped a newline that had been present*. The tool-call argument already lacked one, and the inspected transport path concatenates/decodes argument deltas without trimming. The actual defect is in `context-patch.ts`: it interprets outer argument termination as target-content semantics, then joins the unterminated final addition directly with the next untouched original line.

The repair cascade is also explained exactly: each repair patch replaced one joined pair with two addition lines, but its final addition was again unterminated, so it joined the next untouched bullet. The run repeated that pattern until a hunk ended with unchanged context or a later formatting edit restored a boundary.

A deterministic candidate-contract probe passed LF, CRLF, already-terminated, and explicit-no-newline-marker cases. No additional credentialed provider run was necessary because the current retained run already supplies stronger live evidence than a new synthetic prompt.

See `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-edit-newline-boundary/tickets/in-progress/deepseek-edit-newline-boundary/trace-and-probe-evidence.md`.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-edit-newline-boundary/tickets/in-progress/deepseek-edit-newline-boundary/trace-and-probe-evidence.md` | Sanitized raw-trace analysis and deterministic contract probe | REQ-001 through REQ-005 | AC-001 through AC-007 | Complete evidence; approval N/A | Establishes the exact failure boundary, rules out transport trimming, reproduces the observed call, and validates the proposed invariant. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor posture: `Likely Not Needed`
- Evidence basis: The existing provider-neutral semantic owner is correct, but it lacks a distinction between patch-document framing and target-file newline semantics. Its current EOF test institutionalizes the ambiguity despite an existing explicit no-newline marker.
- Requirement or scope impact: Correct the invariant locally in `context-patch.ts`; align schema/docs/tests. Do not modify provider/runtime transport or add content-specific repair heuristics.

## Recommendations

Normalize an unterminated patch document at the `context-patch.ts` parse boundary using its detected line-ending style (`CRLF` when the patch uses CRLF, otherwise `LF`). Perform this before hunk parsing so the final prefixed body record is complete. Retain the exact `\ No newline at end of file` marker as the sole opt-out that removes the preceding line terminator.

Update the API and XML model-facing descriptions plus durable documentation to state the rule. Replace the conflicting implicit-EOF test with explicit-marker behavior and add the exact mid-file joined-line regression at the pure semantic and real `edit_file` disk boundaries.

## Scope Classification

`Small`

## In-Scope Use Cases

- Apply an unterminated patch whose final addition is followed by untouched LF file content.
- Apply the same shape to CRLF patch/file content.
- Replace the final line of a file and explicitly preserve no terminal newline through `\ No newline at end of file`.
- Apply an already line-terminated patch without behavioral change.
- Preserve a file's existing no-final-newline state when the patch edits an earlier region and leaves the final original line untouched.
- Present one provider-neutral patch-newline contract through API and XML schemas/documentation.

## Out of Scope

- Provider/model-specific patch rewriting or DeepSeek-only branches.
- Post-edit heuristics that scan Markdown bullets or guess where prose should wrap.
- Broad changes to context matching, numeric-header normalization, whitespace retry, path authorization, or write atomicity.
- Supporting additional patch envelopes or dialects.
- Rewriting the Skill Optimizer's previously edited article-writing files.
- Changing raw trace persistence or historical run data.

## Functional Requirements

- `REQ-001`: The retained evidence shall identify the first boundary at which intended logical-line separation and produced file bytes diverge, using the relevant current run and an exact deterministic replay.
- `REQ-002`: `context-patch.ts` shall treat every valid prefixed hunk body record as a complete logical patch line even when the outer patch string lacks a terminal line separator.
- `REQ-003`: When an unterminated final addition is followed by untouched original content, the applied result shall contain the correct line separator between them, following the patch document's line-ending style.
- `REQ-004`: The exact `\ No newline at end of file` marker shall remain the sole syntax for removing a changed logical line's terminator; an unterminated outer patch argument without that marker shall not implicitly request a no-newline target.
- `REQ-005`: The correction shall remain provider-neutral and owned by `context-patch.ts`; OpenAI-compatible delta conversion, API/XML streaming, tool invocation/dispatch, `editFile` path/I/O lifecycle, and other providers shall not gain newline-repair branches.
- `REQ-006`: API schema, XML schema, relevant examples/documentation, and error/contract wording shall consistently explain final patch-record and explicit no-newline behavior.
- `REQ-007`: Durable coverage shall include the exact mid-file failure shape, LF and CRLF variants, explicit EOF no-newline marker, already-terminated patches, earlier-region edits of files whose untouched EOF lacks a newline, and the existing safety/atomicity behaviors.

## Acceptance Criteria

- `AC-001`: The investigation package records the relevant run/model, exact failing tool-call ID, `21/21` unterminated patch-argument count, `14/21` final-addition count, production path, and exact replay result without exposing secrets or unrelated raw prompt content.
- `AC-002`: Replaying the patch shape `@@\n <anchor>\n+<inserted>` against `<anchor>\n<following>\n` produces `<anchor>\n<inserted>\n<following>\n`, not `<inserted><following>` on one line.
- `AC-003`: The exact recorded `call_fad098d549d341a5b63aa021` patch, or a sanitized byte-equivalent fixture, no longer joins the inserted visualization-load bullet to the following pre-existing bullet.
- `AC-004`: Replacing an unterminated EOF line with exact `\ No newline at end of file` markers produces a target with no final newline.
- `AC-005`: Replacing a final line without the marker produces a normal line terminator even if the outer patch string is unterminated; the model-facing contract documents this clean-cut rule.
- `AC-006`: CRLF patch input uses CRLF for the synthesized final patch-record terminator, while already terminated LF/CRLF patches retain their expected bytes.
- `AC-007`: Provider streaming/argument tests continue to prove patch bytes are transported without trimming; no provider-specific semantic branch or patch preprocessor is added.
- `AC-008`: Focused context-patch/edit-file/schema/streaming tests, the relevant broader file-tool suite, build/typecheck, and `git diff --check` pass.

## Constraints / Dependencies

- Authoritative task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-edit-newline-boundary`.
- Task branch: `codex/deepseek-edit-newline-boundary`, based on refreshed `origin/personal` commit `09e22b343f770b84d536dc9a97d0f1c2f6652814`.
- Raw memory remains read-only external evidence and must not be copied wholesale or modified.
- Alibaba credentials must not be logged or committed. No new credentialed run is currently needed.
- The target contract must not rely on Markdown-specific content detection.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing workspace files and historical raw memory under `$HOME/.autobyteus/server-data/memory`.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all existing files/traces; no schema or migration is introduced.
- Unacceptable data loss or corruption: Modification of historical traces, unrelated workspace content, or silent alteration outside matched hunks.
- Relevant availability, maintenance-window, or rollout constraints: None.
- Related requirement and acceptance-criteria IDs: REQ-001 through REQ-007; AC-001 through AC-008.

## Assumptions

- The exact existing `\ No newline at end of file` marker remains accepted immediately after a prefixed hunk line.
- Patch line-ending style can be determined from `CRLF` presence; patches with ordinary LF use LF.
- A patch cannot contain a valid hunk without at least one separator after its `@@` header, so LF is a safe default when no CRLF is present.

## Risks / Open Questions

- Cleanly removing the implicit “unterminated outer patch means no target EOF newline” behavior changes one current test and may affect callers that relied on that undocumented ambiguity. This is intentional: the explicit marker remains the unambiguous supported path and compatibility dual semantics are not retained.
- Mixed-EOL patches/files remain governed by current patch-content semantics; this task only ensures the synthesized final patch-record terminator follows the patch's detected style.
- The user approved the clean-cut marker-only contract on 2026-08-05; downstream work must not reintroduce the implicit outer-string behavior as compatibility logic.

## Requirement-To-Use-Case Coverage

| Use Case | Requirement IDs |
| --- | --- |
| Exact trace/replay diagnosis | REQ-001 |
| Unterminated final addition before untouched content | REQ-002, REQ-003, REQ-007 |
| Explicit no-final-newline target | REQ-004, REQ-006, REQ-007 |
| LF/CRLF/already-terminated behavior | REQ-002, REQ-003, REQ-007 |
| Provider-neutral ownership | REQ-005, REQ-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Auditable, secret-safe root-cause evidence |
| AC-002 | Minimal deterministic regression |
| AC-003 | Sanitized exact observed failure |
| AC-004 | Explicit target EOF without newline |
| AC-005 | Clean-cut default logical-line behavior |
| AC-006 | LF/CRLF byte fidelity |
| AC-007 | Transport preservation and ownership boundary |
| AC-008 | Focused and broader regression execution |

## Approval Status

Approved by the user on 2026-08-05. The locked clean-cut contract is: **outer patch-string termination is framing; only the explicit no-newline marker controls whether changed target content lacks a line terminator.**
