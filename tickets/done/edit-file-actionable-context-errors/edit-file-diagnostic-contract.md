# `edit_file` Model Guidance And Diagnostic Contract

## Status And Authority

- Status: `Approved by user on 2026-08-06, including concise diagnostic revision`
- Type: Intended-behavior supplement
- Scope: Exact model-facing guidance, canonical simplified unified-diff-style example, and model-visible patch failure diagnostics
- Related behaviors: BEH-001 through BEH-004
- Related requirements: REQ-002 through REQ-010
- Related acceptance criteria: AC-002 through AC-011
- Approval applicability: Fully approved with `requirements.md`. The later renewed approval specifically confirms that the diagnostic must be precise, minimal, difference-focused, and non-duplicative.

## Canonical Tool Description

The native `edit_file` tool description must communicate the following text without weakening or contradicting it in provider-specific surfaces:

> Applies a context-located patch to one file using a simplified unified-diff-style format, without overwriting unrelated content. Before calling `edit_file`, read the current relevant file region unless it was just read and has not changed. Copy unchanged and removal lines exactly from that latest content; do not reconstruct them from memory. After an intervening edit or a context-match failure, read the affected region again before retrying. File paths use trusted-local semantics: absolute paths are used directly; relative paths require an explicit absolute `base_dir` and are never resolved from workspace, process, or shell `cd` state. Use this for surgical edits; use `write_file` only for a deliberate whole-file rewrite.

Provider-specific rendering may adapt quoting or markup, but it must retain every behavioral instruction above.

## Canonical `patch` Parameter Description

The native and XML `patch` field descriptions must communicate the following text without semantic drift. The example is part of the `patch` field guidance itself, not only a separate general tool example:

> Patch content in a simplified unified-diff-style format. Start every hunk with a bare `@@` line. Prefix unchanged lines with one space, removals with `-`, and additions with `+`. Copy unchanged and removal lines exactly from the latest current file content. The target file is identified by the separate `path` argument; inside `patch`, provide only bare context hunks. Do not include Git file headers (`diff --git`, `---`, or `+++`), numeric hunk coordinates, or semantic envelopes such as `*** Begin Patch` and `*** End Patch`. Include enough unchanged or removal lines to identify exactly one eligible location.
>
> Example patch:
> ```diff
> @@
> -const mode = 'old'
> +const mode = 'new'
>  const keep = true
> ```

XML-only sentinel requirements remain additional transport framing. `__START_PATCH__` and `__END_PATCH__` are not semantic patch envelopes and must remain present when the XML tool contract requires them.

When this follow-up is integrated after the approved newline-boundary change, the final-record and exact `\ No newline at end of file` instructions from that change must remain present and consistent. This follow-up must not remove or weaken them.

## Canonical Patch-Field Example Placement

The canonical example belongs directly in the model-visible `patch` field description because patch construction—not path selection—is the observed failure surface.

- Native/API schemas must include the literal multiline example in the `patch` parameter's `ParameterDefinition.description`.
- The XML schema formatter must include the same example inside the `patch` argument's schema guidance, immediately before its XML sentinel instructions. It may keep the prose portion in the XML `description` attribute and render the multiline example in that argument's instructional body so the schema remains valid.
- A separate usage-example formatter may retain additional valid examples, but those examples do not replace the required patch-field example.
- The example itself contains a bare `@@`, one removal, one addition, one unchanged line with its required leading space, and no path/header/coordinate/envelope content.

## Hunk Identity Contract

- Hunk numbering is one-based in all model-visible errors.
- A hunk-specific error states both the failing hunk number and total hunk count as `hunk <index> of <count>`.
- A multi-hunk patch remains atomic. A failure in any hunk rejects the complete edit and writes no target bytes.
- Document-level grammar errors that occur before a hunk can be identified remain document-level errors.
- Hunk-body grammar errors use `Invalid context hunk <index> of <count>:` followed by the specific reason.

## Missing-Context Diagnostic Contract

After the public `edit_file` lifecycle exhausts exact and whitespace-tolerant matching, every missing-context failure starts with:

`Could not apply context hunk <index> of <count> after exact and whitespace-tolerant matching.`

It then renders exactly one of the unique, zero, or multiple candidate shapes below. It must not echo a full expected context block, a full candidate context block, or any identical surrounding anchor line. Every final shape ends with targeted reread/retry guidance and `No file changes were written.`

### Deterministic Candidate Eligibility

A one-line-difference target is diagnostic-only and may be shown only when all of the following are true:

- the expected unchanged/removal anchor contains at least two logical lines;
- the candidate is a contiguous target window of the same line count within the hunk's currently eligible target region;
- using the existing whitespace-tolerant line comparison and existing EOF line-ending allowance, exactly one expected line differs and every other expected line matches in order; and
- exactly one target window satisfies those conditions.

The scan must classify the outcome as exactly one of `zero`, `unique`, or `multiple`. If multiple windows qualify, the public message does not need the exact count; it only states that the outcome is multiple. Zero and multiple outcomes must not display expected, actual, or candidate content. A unique diagnostic candidate must never be used to apply, relocate, or retry the patch automatically.

### Unique Candidate Shape

When exactly one candidate qualifies, render:

1. Its full one-based candidate target range.
2. The absolute one-based target line containing the mismatch.
3. The label `diagnostic only; not applied`.
4. Exactly two evidence lines: `-` plus the submitted expected logical line excerpt and `+` plus the current target logical line excerpt.
5. A reread instruction naming the candidate target range, followed by exact-context retry guidance and the no-write statement.

Do not add `Expected`, `Candidate`, or `Difference` blocks around those two lines, and do not render the identical lines that established the one-line-difference candidate.

### Zero Candidate Shape

When no candidate qualifies, render no source excerpts or target locations:

```text
Could not apply context hunk <index> of <count> after exact and whitespace-tolerant matching.
No one-line-difference target was found in the eligible region.
Read the current target region for hunk <index> and retry with exact unchanged/removal context. No file changes were written.
```

### Multiple Candidate Shape

When two or more candidates qualify, render no source excerpts or candidate locations:

```text
Could not apply context hunk <index> of <count> after exact and whitespace-tolerant matching.
Multiple one-line-difference targets were found in the eligible region; none was selected or applied.
Read the current target region for hunk <index> and retry with more unique exact unchanged/removal context. No file changes were written.
```

### Difference-Focused Evidence Bounds

- Remove only one terminal `LF` or `CRLF` from each mismatching logical line before excerpting; displayed content otherwise preserves the exact submitted/target characters.
- Each completed evidence line, including its one-point `-`/`+` prefix and any ellipses, is at most 200 Unicode code points. The payload after the prefix is therefore at most 199 points.
- If a logical line contains at most 199 code points, show it completely after the prefix.
- For a longer line, apply the existing whitespace-tolerant `trim()` normalization used by candidate matching and define `differenceOffset` as the Unicode code-point length of the normalized lines' longest common prefix. Map that offset back into each exact untrimmed logical line by adding that line's `trimStart()` code-point count. If one normalized line ends at `differenceOffset`, treat its focus as the boundary immediately after its final normalized code point.
- From each exact logical line, choose a contiguous window of at most 197 source code points that contains its mapped differing code point or end boundary. Use `start = clamp(focus - 98, 0, max(0, sourceLength - 197))` and `end = min(sourceLength, start + 197)` in Unicode code-point indexes.
- Prepend `…` to the excerpt when `start > 0`; append `…` when `end < sourceLength`. With the `-`/`+` prefix, 197 source points and two ellipses total exactly 200 points.
- The focus position or boundary must remain inside the selected window, so leading-prefix truncation cannot hide the first difference that caused the whitespace-tolerant line mismatch.
- Coverage must count final physical lines by Unicode code point (for example, `Array.from(line).length`), use astral Unicode, cover differences near the beginning/middle/end and insertion/deletion boundaries, and assert both the 200-point maximum and visibility of the focused difference.

## Canonical Missing-Context Example

For the retained Daily Assistant failure, the inner `PatchApplicationError.message` must have this concise shape. Minor platform newline differences are allowed; the text and information must not semantically drift.

```text
Could not apply context hunk 2 of 4 after exact and whitespace-tolerant matching.
Unique one-line-difference target at lines 13-14 (diagnostic only; not applied); mismatch at line 13:
-  private particles = new Particles()
+  private readonly particles = new Particles()
Read target lines 13-14 and retry with exact unchanged/removal context. No file changes were written.
```

The existing ToolPhase prefix remains outside this inner message, for example:

```text
Error executing tool 'edit_file' (ID: <invocation-id>): PatchApplicationError: <inner message above>
```

## Ambiguous-Context Diagnostic Contract

An ambiguous full match must report exhausted strategies, hunk identity, and the exact eligible match count; display no source content or target locations; state that no location was selected or applied; and end with unique-context and no-write guidance:

```text
Could not apply context hunk 1 of 1 after exact and whitespace-tolerant matching: unchanged/removal context matched 2 eligible target locations. No location was selected or applied.
Read the current target region for hunk 1 and retry with more unique exact unchanged/removal context. No file changes were written.
```

No expected/candidate/difference content is displayed for ambiguity because multiple full exact/whitespace-tolerant matches are the complete actionable fact.

## Hunk-Body Grammar Diagnostic Examples

Hunk-scoped grammar failures must identify the hunk without inventing target candidates. Canonical reason shapes include:

```text
Invalid context hunk 2 of 3: contains no addition or removal.
```

```text
Invalid context hunk 2 of 3: requires at least one unchanged or removal line as a safe location anchor.
```

The existing specific unsupported-line and no-newline-marker reasons remain authoritative, prefixed by the same hunk identity when the parser can identify the hunk.

## Safety And Preservation Rules

- Diagnostics do not change strict or whitespace-tolerant match eligibility.
- Diagnostics do not change ordered-hunk eligibility or unique-location requirements.
- Diagnostics do not introduce fuzzy patch application.
- Diagnostics do not weaken write-after-complete-success behavior.
- Diagnostics do not expose content outside the target file, currently eligible region, and stated output bounds.
- Path authorization, protected-path checks, provider transport, XML sentinel parsing, and the ToolPhase outer error prefix remain unchanged.
