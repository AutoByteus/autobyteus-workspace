# SR-024 — Content-to-content CompressionStrategy

Package context-compaction-simplification-analysis; Solution Designer; 2026-09-30. **Bounded requirements clarification confirmed by user; cumulative retry/error/message amendment still Draft.** Design Needs Revision, not Architecture Design Complete or implementation-ready.

## User direction and settled contract

After the text-in/text-out explanation, user agrees and asks to name the abstraction CompressionStrategy, accepting “the content you want to compress” and producing “the content you get as output,” rather than naming its input prefix text. This confirms the content transformation boundary (REQ010 / DEC02101), not the unresolved retry/error/message decisions.

Conceptual content operation:

```ts
interface CompressionStrategy {
  compress(content: string): Promise<string>;
}
```

This shows the content contract, not the final execution-control signature. The caller selects/prepares the context prefix and passes the resulting text as content. Strategy returns compressed text; the direct LLM implementation performs summarization and returns normalized Markdown under existing approved content/output rules. Prefix/suffix, working nodes, trace storage and prior-summary bookkeeping do not enter its input abstraction. Cancellation and optional diagnostics remain separate execution concerns. No numeric prompt budget or separate duplicate prior summary; no binary/lossless/general-purpose compression product or second production algorithm is implied.

Current code still takes structured units and renders internally, as established in E23-4. Implementation must move shared rendering before the strategy call to realize this seam; not implemented here. Runtime selection/admission/retry/acceptance/commit/parent dispatch remain their own responsibilities. AC015 includes independent substitution and simple text-content tests without working-context construction.

## Authority, artifacts and remaining work

Canonical `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/requirements-doc.md` captures confirmed REQ010/DEC02101 and amended AC015. `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/strategy-boundary-analysis.sr021.md` now uses content terminology and caller-owned rendering. `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/design-spec.md` records the current approval/status but remains Needs Revision. Exact prompt `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/proposed-compaction-prompt.md`, output-format-and-coverage.md and ASM02201 remain unchanged. No renewed approval is needed for numeric-target removal or for the boundary just confirmed.

Remaining requirements questions: retry eligibility/permanent-error early stops (DEC02102), and original failed user message versus later user input (DEC02103). Architecture subsequently finalizes controls/metadata/provider-attempt ownership and status/UI integration. Do not infer those decisions from agreement on content naming. Full cumulative context, source pins, previous approvals, current reports and all historical supplements remain in `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-documentation-cleanup.sr023.md`, solution-revision.sr021.md, solution-revision.sr022.md, investigation-notes.md and solution-revision-record.md. Prior edited docs are in history/*before-sr024.md.

SR012 core/SR017 no retired-settings import/SR020 disposition/SR022 no numeric target and preservation remain. API005 interrupted; API004Fail90.7 last completed, F005 accepted nonblocking/not fixed and Qwen stopped, F004 historical cause unknown, F006 resolved, SR022Q01 retained. No rescore or new calls. Eventual nine-path successful-test review and inherited suite/typecheck/browser/retry/resume/crash/Delivery gates remain. Product N/A; Delivery not reached; cumulative Large/High retained, not a new completed-design classification.

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch codex/context-compaction-simplification-analysis; HEAD5cb7b049/sourceebaf3a78/base8caa610f, last-refreshed origin/personal as recorded. Finalization origin/personal is Delivery-owned. Documentation only; no source/test/provider/private-data access, fetch/rebase, commit/push/merge/release or cleanup. Next action: return the clarified contract to user; complete remaining policy decisions before affected design/review. Fetch handoff rules after persistence; no forward-ready result claimed.

## Verification and routing result

Exact prompt-v5 hash remains2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7; production-source diff empty. Fresh get_handoff_rules after persistence returns only completed-architecture and Delivery-receipt routes, none matching this requirements clarification with separate policy decisions pending. No handoff/message/delegation; return settled content contract to user.
