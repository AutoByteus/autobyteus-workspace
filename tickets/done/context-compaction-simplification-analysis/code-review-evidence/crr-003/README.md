# CRR-003 — API-F001 focused failure-origin review

Confirmed Local Fix, API/E2E-owned shared harness setup. No implementation or durable-test changes by reviewer; no new execution round, source scorecard or broad test audit.

Inspected API-REV-001 API-C01.log (exact command and exit1, 19 pass/1 fail), execution report, investigation, ledger/revision and prerequisite-triage.json. Reused reviewer CRR-001 unchanged-base test reproduction and CRR-002 residual rerun; no redundant test rerun. API-C02–07 results and confidence73.6% remain attributed to API/E2E, not independently recertified.

Independent read-only source verification in origin-audit.json:
- Shared wrapper block is byte-identical at base046279298f53fb98d7688ee9dc2b2ba0fa827685; entire AgentRun file is also byte-identical.
- All seven inspected source/test paths are unmodified relative to current HEAD.
- Root test:e2e:real and registered DeepSeek/local Qwen compaction scenarios call the shared wrapper after backend creation. Existing setup-only tests stop before it.
- AgentRun options require providerInputNormalizer; wrapper supplies only context/backend, so constructor fails before dispatch. Production GeneralProcessRunSupervisor constructs the normalizer and AgentRunManager passes it to AgentRun; dispatch then normalizes before backend input.
- The real normalizer preserves message/dispatch semantics while resolving context-file local paths. Current construction contract applies; weakening the domain guard or restoring compactor APIs is not a remedy.

Supported basis: existing ENG-001 validation contract, approved SR-012 REQ-001/005/006, AC-001/002/006/007, SR-013 validation mapping. No new user workflow or production failure scenario inferred from the unit test.

Bounded owner action: repair test-support composition/fixture wiring to honor the current input-normalizer contract; verify actual facade input/normalization, event projection and termination instead of stopping in mocked backend construction. Re-execute API-C01 first, then complete the remaining API/E2E coverage and broader validation. Do not count this repair as live semantic quality or repeat-compaction proof.

CR-001/CR-002 stay resolved; CRR-002 source Pass/9.40 unchanged. The prerequisite was already caught and disclosed in CRR-001/002, so this is neither an undiscovered review gap nor a runtime-only defect. Baseline reproduction prevents false compaction-regression attribution, not the obligation to repair the active validation harness.

No live calls, secrets/private histories, browser or process-stop tests; no source/durable-test edit, service changes, commit/push/merge/release. API-F001 remains open until owner correction and rerun.
