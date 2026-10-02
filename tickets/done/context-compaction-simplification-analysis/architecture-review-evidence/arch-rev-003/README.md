# ARCH-REV-003 — independent architecture evidence

2026-09-30. Isolated worktree `context-compaction-simplification-analysis`.
Entry HEAD `5cb7b049ae3158108bff2cb70ed80e89540586d9`; source lineage IR003
`ebaf3a78eff2d3147dc3f4f2eb63bf119d6547ad`, last-refreshed base `8caa610ff438c288d9aca9f2efe2c33924fbf517`.
No fresh remote check. The canonical design review report, not this evidence index,
owns the completed decision. Review-entry snapshots are evidence, not alternate authorities.

## Scope

SR028 prepared-text strategy replacement, three internal attempts/single-attempt
SDK transport, held A/later B permission/FIFO, active recoverable error, stop and
live stream/UI projection. Prior ARCH002/current-frozen snapshot, staged archive
commit, no-import/current-parent constraints checked for preservation. Prior
specialist evidence is reused only within its recorded scope.

## Independent source findings / rejected premises

- `LLMRequestAssembler.prepareRequest` lines53–56 excludes compaction on tool
  continuations; `LlmPhase` sets that identity from tool batches. Current durable
  assembler test asserts no executor call/no signed-history reset on that path.
  SR028's new continuation-paused branch therefore needs supported-path evidence
  or removal, not changing the safe point merely to justify the branch.
- `parseCompactionSummary` requires one marked block and returns its inner body;
  current direct summarizer already returns that inner body. SR028 says direct
  strategy returns parsed body but host also checks framing/parser. Asked owner
  to make the two representations/validators explicit for AC015 substitution.
- Initially investigated a reserve-before/release-after user-B scenario. Forward
  trace **rejects it**: Team/Org SEND_MESSAGE -> root command -> configured handle
  postMessage -> AgentRun.postUserMessage. Reservations found are collaboration
  non-user delivery -> RootCommunicationEngine -> reserve/commit/release. A bare
  reserve API is not evidence of user-recovery ingress. No release-epoch machinery
  is justified. Correction sent immediately to Solution Designer; origin filtering
  of non-user messages remains required.
- AgentRun's FIFO/dispatch queue and early lifecycle buffering can retain A;
  native backend lacks active-turn append, so B normally waits. Current phase
  turns preparation failure into final/isError/completed and loses that hold;
  target explicitly replaces it. Runtime execution scope already races abort,
  and worker stop interrupts active turn. Existing server prepareTermination
  awaits quiescence first; target correctly requires held-turn interrupt first.
- Native status projects any active turn as running; generic lifecycle error
  retires it; UI Error marks current assistant complete. Target names all three
  corrections, typed block/resume, and revisioned transient pending projection.
- SDK primary source: OpenAI and Anthropic per-request `maxRetries` supersedes
  default2; Gemini apiCall reads clientOptions.httpOptions.retryOptions and
  computes retries=attempts-1; Mistral chatComplete uses request options.retries
  before client retryConfig. Existing Ollama chat and AutoByteus sendMessage local
  paths inspected. Target fake-transport tests remain necessary; no claim these
  invocation controls or the strategy loop are already implemented.

## Fresh characterization checks (unchanged source)

Run from the isolated worktree, following root TESTING.md/server AGENTS.md:

```sh
env -u RUN_REAL_E2E pnpm -C autobyteus-ts exec vitest run tests/unit/agent/llm-request-assembler.test.ts tests/unit/agent/loop/llm-phase-compaction.test.ts tests/unit/memory/compaction/compaction-summary-parser.test.ts --no-watch
env -u RUN_REAL_E2E pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/input/agent-run-input-admission-state.test.ts tests/unit/agent-execution/agent-run.test.ts --no-watch
```

- Core `core-characterization.log/.exit`: **2 files /10 tests PASS**, exit0.
  The third supplied parser-test filter did not match an existing file; it did
  not run and is not counted. Parser conclusion is from source, not that filter.
- Server `server-characterization.log/.exit`: **2 files /45 tests PASS**, exit0,
  standard repository test-owned Prisma setup retained. Existing FIFO, append
  capability, reservation, early-terminal and termination behavior only.
- Total55 existing tests. No new source/durable tests, no target retry/hold tests,
  no SDK fake-transport execution here, no model calls, browser/desktop journey,
  private history/vault/credential read, whole-suite/typecheck or process-crash test.

## Audits and evidence limits

`input-audit.json` pins current sources and ticket artifact hashes/status;
`reference-check.json` resolves all378 SR028 references (0 missing). Exact v5
SHA256 `2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7`.
Final audit records owner changes during clarification, unchanged source/API
paths/prompt, and review-only outputs. No commit/push/merge/release or cleanup.

API005 interrupted; historical last-complete API004 Fail90.7; F005 accepted known
nonblocking/not fixed and Qwen STOPPED; F004 historical cause unknown; F006 corrected
(CRR007). SR022 four-call diagnostic, including its fidelity failure, not rescored.
Nine API durable paths' eventual successful-test review and inherited/integrated
acceptance gates remain. No new provider budget, prompt-v6/default/support change
or Delivery advancement.

## In-round corrections and final review

SR029 explicitly separates provider-envelope extraction from untagged strategy
body validation and removes the unsupported pre-continuation/release paths.
Independent inspection of its distinct post-response caller then identified
ARCH-F002 (High Design Impact; MP007): old final/IDLE/different-turn retry was
inconsistent with already-approved error/fresh-admission behavior. The retained
`post-response-premise.md` is the original prospective finding evidence, not the
final resolution status.

SR030 corrects both actual safe points using one pending gate with held_turn and
next_turn positions. Consumed A's actual response/hooks/settlement complete once;
run error and dispatch gate survive with no active turn. Fresh user grants one
next FIFO turn; no prequeued/during-operation credit, no replay; retry failure can
hold the newly unsent turn. Source-derived status/queue/scheduler interfaces,
stop/cancel, early fact/ACK and target test obligations independently rechecked.
ARCH-F002 is resolved **at design level**, not executed/implemented here. Approved
requirements and v5 unchanged. Final completed result: canonical report/history
**ARCH-REV-003 Pass**, SR030 / Approved SR028. Routing receipt follows confirmation.

Audit authoring note: first SR030 reference check assumed SR028's JSON key
`references` and stopped with KeyError before writing output. Reran against the
actual cumulative-index shape. This was an audit script assumption, not a missing
artifact or product/test failure. Existing missing guessed source paths were
resolved by source search; no finding based on path guesses.

Primary Pass handoff confirmed accepted=true / DELIVERED to sole
/implementation_engineer, AgentRun implementation_engineer_d565b3adf8074d59878dc089de6d3df1;
414 cumulative reference files. Rules/selection/list/receipt retained. No second
informational recipient under governing single-recipient contract; stage stopped.
