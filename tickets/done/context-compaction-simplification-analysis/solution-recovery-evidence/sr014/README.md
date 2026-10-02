# SR-014 recovery investigation evidence

CRR-004 returns API-F005 (confirmed fidelity failure, remedy Unclear) and API-F004 (separate under-evidenced continuation failure). Read the canonical reports; no score/acceptance is overridden here. Requirements SR-012, exact prompt-v5 and SR-013 architecture remain authoritative.

## Executed no-provider investigation

From `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`:

```sh
pnpm -C autobyteus-server-ts exec vitest run --config ../tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr014/vitest.config.ts --no-watch
```

`recovery-probes.log`: **1 file / 2 tests PASS**, Vitest 4.0.18. Discovery `fetch` is stubbed to synthetic metadata; availability/settings imports are isolated. Actual model-provider/default-config, compaction-config function, request builder and history prompt builder execute. No request reaches LMStudio or any external provider, no private history accessed, no services started, no durable test/production changes. The printed discovery URL describes the intercepted call, not network traffic.

- `configuration-reconstruction.json`: default LMStudio discovery constructs LLMConfig temperature0.7/maxTokensnull; compaction resolves maxTokens8192; OpenAI-compatible request contains temperature0.7/max_completion_tokens8192. Model has no discovered maxOutputTokens cap. No explicit top_p/seed/tools/stop. This is current source reconstruction with synthetic model metadata, **not a retained historical wire request or remote effective-default capture**. Parent fixture0/1024 is independent. Existing explicit temperature0 override is supported and leaves outputcap8192; no claim that it is better/deterministic/a fix.
- `frozen-repeated-input.json`: actual retained failed sample's first summary + exact correction, rendered by current production builder with approved system prompt and unchanged3000-token summary target. Contains source/hash rather than another newly generated prior summary. This freezes a confounding variable for comparison. Failed output hash retained. Not a model replay/reproduction.
- `source-and-input-audit.json`: source/authority/report/retained-input hashes and current HEAD. Prompt hash remains2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7.

## Evidence interpretation

The request to add APPROVAL-73 is present; no subsequent work evidence appears. The returned Completed work claim is unsupported regardless of valid tags/complete status. Prompt already prohibits this. A plausible hypothesis is confusion between updating a summary's stated requirements and updating the target task's plan, but **no prompt-caused mechanism is established**. Model sampling/provider-owned defaults remain competing uncertainties; do not choose a production remedy from two outputs or the0.7 setting alone.

API-F004 cannot be reconstructed from its missing parent response/low-level exception. Later logging is after postAndWait and before artifact read: capture on all terminal paths/finally before cleanup is needed for a bounded future attempt. Generic exception wrapping is a known evidence-loss point, not proof of the original failure cause. Do not relax safety redaction or assert an ENOENT/token-limit/provider error.

Next evidence request and predeclared limits: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/recovery-investigation-plan.md`. No production prompt/default/model-support change is approved by this investigation.
