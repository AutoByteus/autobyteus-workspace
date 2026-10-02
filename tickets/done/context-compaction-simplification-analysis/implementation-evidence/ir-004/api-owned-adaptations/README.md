# API-owned pending state — narrow IR004 caller adaptation

Ownership coordination: API owner confirmed no concurrent edits/campaign and permitted
mechanical CompressionStrategy caller adaptation only; nine-path successful-test review
is still due later. No live test or acceptance score was run here.

api-owner-comparison.json pins all nine before/after SHA256 hashes. Six are exactly
unchanged. Three touched paths:

1. test-support/live-e2e/live-e2e-harness.ts: one predicate changes from numeric
   `Summary budget: N tokens` prefix to the unchanged introduction plus separator.
   Source/request equality, well-formed Unicode, all-exit observation, topology,
   persistence and semantic guards retained. Reverse mechanical preimage matches
   the entry hash; .before and exact one-hunk .patch retained here.
2. server tests/unit/secret-management/live-e2e-compaction-boundary.test.ts: builder
   import/class/method rename and remove numeric prefix in the constructed request
   fixture. Unicode/source-equality assertions are unchanged. Reverse preimage
   matches entry hash; .before and .patch retained. Current8checks pass with no model.
3. server tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts:
   direct summarizer -> operation-scoped strategy; caller builds prepared text;
   compression yields body; optional success observation supplies existing report
   diagnostics. First/repeated input and semantic assertions, scanner, two-success
   call guard and no-invented-plan check remain. Current source is copied in
   ../new-source-snapshot/. Before hash pinned; full exact before bytes were NOT
   retained in this round, so no hash-verified full before/after diff is claimed
   for this file. Review this adaptation from source and prior API ownership evidence.
   Not live-executed; do not interpret its two-call guard as new retry/provider budget.

No restored arbitrary emoji/literal-character assertions or weakened evidence guards.
This accounting concerns only IR004 changes; cumulative git diff includes prior pending
API changes and must not be misattributed wholesale to implementation.
