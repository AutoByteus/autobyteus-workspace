> SR-028 approval alignment: exact v5/output format remains approved. The current `requirements-doc.md` and `design-spec.md` own three strategy-internal attempts and held-A-then-B recovery; older single-call/failure wording here describes the original format proposal, not a competing execution policy. Numeric target removal is approved; provider hard cap remains.

# Output extraction and sufficient detail

> Current approval: included in the SR-012 scope explicitly approved by the user (“Correct. approve”), captured in SR-013. Historical proposal labels below describe earlier rounds; implementation remains pending.

- Package / revision: `context-compaction-simplification-analysis` / `SR-008/prompt-v5`.
- Owner: Solution Designer. Date: 2026-09-26.
- Status: response to user feedback; proposed prompt/output refinement, not an implemented or approved final architecture. Data-continuity decision remains separate.
- Canonical proposed literal: [proposed-compaction-prompt.md](proposed-compaction-prompt.md); [previous literal](history/proposed-compaction-prompt.sr007.md); [exact diff](history/prompt-v4-to-v5.diff).

## User concern and correction

The user points out two real model-response concerns in ordinary automatic compaction: commentary outside the requested summary, and summaries containing too few useful entries. The earlier statement that a dedicated call makes the whole returned body safe to use was too strong: that describes the desired response, not a guaranteed property of free-form generation.

There is also a genuine flaw in our adaptation. The original asked for the smallest number of **episodes**, then separately asked for as many facts as the work requires. Changing that to the smallest number of **bullets** broadens the minimization instruction to every output item. Those are not equivalent. The corrected draft asks for enough specific bullets and retains the original anti-repetition guidance, without minimizing item count.

## Evidence from the current implementation

Source: `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` at `046279298f53fb98d7688ee9dc2b2ba0fa827685`.

- Current JSON extraction tries the full response, fenced JSON and balanced JSON-object candidates. Thus the shipped path already accounts for extra prose rather than merely assuming it will not occur.
- It requires six named arrays and at least one nonempty episode. The other five arrays may be empty. It does **not** require multiple entries in each array.
- Multiple distinct valid objects are rejected. Shape validation establishes a parseable object, not semantic completeness.
- The normalizer cleans/deduplicates entries and filters some operational-noise facts; it is not a missing-information checker.

The user's experience that array structure encourages fuller output is plausible and is not disproved by those facts. It should not, however, be described as a guarantee enforced by the current parser. No live comparative quality test was run here.

## Proposed extraction contract

Keep one Markdown summary, but place it inside exactly one `<compaction_summary>` / `</compaction_summary>` block. These are proposed OUTPUT boundaries, distinct from the existing INPUT history separators. The stored continuation payload is the Markdown inside the block, not the tags or surrounding chat.

The runtime would extract one complete, unambiguous, nonempty block and ignore prose outside it. A missing closing marker, empty body or multiple/ambiguous blocks is a failed candidate, not an invitation to guess or silently accept the whole response. Existing failure/retry behavior and the prior valid context are preserved. The heading/output-budget checks remain small format/context checks; there is no six-category normalization, storage or projection stage.

A closing marker is **not** proof of complete generation or adequate factual coverage. Provider-reported truncation must still be rejected where surfaced; the earlier completion-metadata investigation remains relevant. Exact extraction/validation implementation is architecture work, not code delivered by this document. No repair-agent loop is introduced by this format contract. The approved SR-028 retry policy is specified by the canonical requirements/design, not by this output-format supplement.

If stronger provider-enforced structure is later preferred, a single JSON `summary` string containing Markdown is another possible transport envelope; it would not imply episodic/semantic storage. It is not selected in this draft, and provider-wide structured-output availability has not been verified. Do not introduce two output modes or restore the old six-array pipeline on that basis.

## Proposed detail contract

- Preserve enough concrete items for continuation; do not optimize for the fewest bullets.
- Keep distinct meaningful constraints, decisions, progress, blockers, requests and references rather than collapsing them into vague statements.
- Keep all six headings; `(none)` is valid only when the supplied history has nothing relevant for that section.
- Avoid arbitrary fixed minimum counts: three meaningful constraints should not become five invented or repetitive ones. A complex history may need many bullets.
- Format/heading/item-count checks cannot establish that every important fact survived. Evaluate coverage of known important source information across first and repeated summaries, separately from extraction correctness.

The six headings and existing coverage instructions still provide a checklist. This change removes pressure toward too few bullets; it does not claim prompting alone guarantees thoroughness.

## Illustrative checks for later validation — not executed tests

1. Valid block preceded by “Here is the summary”: only its Markdown body becomes the candidate.
2. Missing/empty/ambiguous block or known token-truncated generation: candidate fails; baseline remains current.
3. History contains five distinct unresolved tasks: summary must preserve those tasks rather than merely say “several tasks remain.”
4. History has no relevant artifact references: `(none)` is acceptable; no padding or invented paths.
5. A previous summary carries a still-applicable restriction: it remains across subsequent compaction.

These are ordinary variations of SCN-001/003/005, not new user-operated summary submission or file-corruption scenarios. No implementation or model-output experiment was performed this round.


## SR-022 approved request-envelope clarification

The approved system prompt-v5 text and output/tag/detail contract stay byte-identical. User explicitly removes the additional numeric target line from the history request: delete `Summary budget: ${input.summaryBudgetTokens} tokens.\n\n`, pass the existing rendered history without it. Do not replace it with a numeric word target or minimum/maximum bullet count. Provider hard output cap, known-incomplete rejection and host full-context budget validation remain. This supplement describes approved future request behavior; current source has not yet been changed. The unapproved semantic-fidelity v6 candidate is unrelated and stays parked.

Rationale: the expanded ASM-022-01 in requirements/design explains the expected natural compression of long histories, the removal of repetition and intermediate detail, and the user’s practical experience. Summary detail follows continuation needs rather than a numeric quota. Provider hard cap and existing fit/completion safeguards remain separate.
