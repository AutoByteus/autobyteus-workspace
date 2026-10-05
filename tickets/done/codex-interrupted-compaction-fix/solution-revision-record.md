# Solution revision record — codex-compaction-analysis

## SR-001 — experiments complete; Draft baseline
- Phase: Requirements investigation. Trigger U01. Prior N/A → Draft.
- Evidence C01–C12: source paths; full real-data analysis (1,100 runs; 4,103 started vs 4,071 completed = 4,071 archives; 32 abandoned; the "extra" markers are legacy duplicate files); live app-server probes (manual API, `/compact` text, auto with lowered limit, interrupt auto/manual, empty thread).
- Findings: rotation correct; abandoned compactions never closed (stuck "started"); `/compact` text faked by the model while a real API exists.
- Proposed REQ-C01–C04 and DEC-C01–C04; no approval. Design/review N/A.
- Next: the user decides; approval; design.

## SR-002 — narrowed to the interrupted-compaction fix; approved; design complete
- Trigger: U02 (value question) and U03 (bootstrap fix ticket; approval given). Package renamed codex-compaction-analysis → codex-interrupted-compaction-fix (same worktree and evidence).
- Requirements Draft → Approved: REQ-C01 (close abandoned compactions on every turn ending) and REQ-C04 (no regression). REQ-C02 (/compact) deferred to a later cross-runtime ticket; REQ-C03 (historical display) rejected as not valuable.
- Architecture evidence C13–C16. Design: design-spec.md. Classification task_size Medium, architectural_risk Low.
- Next: handoff per rules.
