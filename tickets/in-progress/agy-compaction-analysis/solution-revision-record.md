# Solution revision record — agy-compaction-analysis

## SR-001 — experiments complete; Draft baseline
- Phase: Requirements investigation. Trigger: U01 (user asks for complete experiments on AGY compaction before judging feasibility). Prior: N/A. Current: Draft.
- Evidence: A01–A16 (source, real AGY data across 501 conversations, live stream-json/print/TUI probes, automatic-compaction probe, binary/changelog inspection).
- Findings: no usable manual compaction (`/compact` is faked by the model in headless mode and absent in the TUI); automatic compaction is reported in the stream as one `checkpoint` step_update (state DONE, duration, step_index) that AutoByteus drops; the transcript holds the summary; older AGY "CHECKPOINT 0" steps are not compactions.
- Proposed REQ-A01–A05 and DEC-A01–A05 recorded; no approval. Design/review/classification N/A.
- Next: the user decides DEC-A01–A05; then approval and design.

## SR-002 — approved; reproducibility proven; design complete
- Trigger: U02 (certainty) → A17 repeat (two compactions, steps 9 and 18, each streamed once); U03 approval; U04 (100% proof) → version gate at the proven version 1.2.16.
- Requirements Draft → Approved (REQ-A01, A02, A04 as version gate, A05; REQ-A03 = duration only). DEC-A01 leave `/compact` unchanged; DEC-A02 observe automatic compaction only; DEC-A03 duration only; DEC-A04 version gate ≥ 1.2.16; DEC-A05 replay + scripted fake-CLI E2E + opt-in live E2E.
- Design: design-spec.md. Classification task_size Medium, architectural_risk Low.
- Next: handoff per rules.
