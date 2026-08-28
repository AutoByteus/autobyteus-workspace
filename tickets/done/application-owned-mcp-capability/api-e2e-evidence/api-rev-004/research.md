Brief context: {"briefId":"brief-2263879a-640f-4606-8e92-d01e53a18dd5","title":"API E2E Luna Patch Proof 2026-08-27T21:31Z","observedStatus":"researching"}

# API E2E Luna Patch Proof 2026-08-27T21:31Z

## Key findings

- The Brief Studio workflow separates application-routed capabilities from Luna's built-in patch operation, so file creation must be performed by the provider patch tool rather than a configured registry tool.
- A reviewable artifact is only trustworthy when its first line preserves the exact brief-context marker returned by the application binding.
- The canonical researcher output is `brief-studio/research.md`, and publication should reference that workspace-relative path rather than an absolute filesystem location.
- The writer's handoff must be self-contained: the complete research body, marker, and relative path belong in one delivered message because the writer cannot rely on cross-workspace reads.
- The final brief should demonstrate evidence continuity by reproducing at least one complete, non-marker Key findings bullet under a Key evidence heading.

## Risks or open questions

The main operational risk is treating a successful-looking tool invocation as sufficient without checking the provider-reported result. Patch or publication failures must stop the normal sequence and be reported plainly, with no shell fallback or invented checkpoint. Another risk is marker drift: changing whitespace, field order, identity, title, or observed status can make the artifact impossible to reconcile. The workflow also depends on the writer receiving the full body verbatim; truncation or summary-only handoff would weaken reviewability. Finally, the brief's business-state transition is owned by application reconciliation after final publication, so artifact publication alone should not be described as the final review-state update.

## Recommendations or next steps

Validate the exact context marker once, then create the canonical research file through built-in `apply_patch`. Require and record patch success before publishing the same relative path. Send the writer one complete handoff containing the marker, path, and body verbatim. The writer should independently validate its single context result, match the brief identity, quote one complete finding, patch `brief-studio/final-brief.md`, publish it relatively, and report only confirmed outcomes.
