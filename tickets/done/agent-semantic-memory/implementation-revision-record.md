# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 1 (Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-001 | Implemented; ready for code review |

## Revision Entries

### IR-001 — Semantic memory: setting, folder owner, instructions, runtime write access, form and detail

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/agent-semantic-memory/design-review-report.md`, round 1 (Pass, no findings; notes N-1, N-2).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete at the commits named in `implementation-handoff.md`; implementation-scoped checks pass; classification Large/High confirmed.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed design.
- Approved behavior or requirement IDs affected: BEH-001..BEH-005; REQ-001..REQ-009; AC-001..AC-008 (AC-001..AC-004 real-runtime parts left to API/E2E).
- Implementation delta: as designed. Server: `semanticMemoryEnabled` on `AgentDefinition`, `agent-config.json` read/write/merge, both readers, service create/patch and `PERSONAL_FIELDS` (N-1); `cloneAgent`/`personalEditsOf` moved to `agent-definition-edits.ts`; fifth personal setting `SEMANTIC_MEMORY` (record, service apply/setEdited/reset/capture, package-edit capture values, GraphQL enum); `AgentMemoryLayout.getAgentSemanticMemoryDirPath` and the new `AgentSemanticMemory` owner; composer section (contract §2) with required `semanticMemoryPath`; wiring in AutoByteus, Codex, Claude, ACP, Antigravity backends; `buildCodexSandboxWorkspaceWriteConfig` as the one owner of `sandbox_workspace_write` (integration builder emits `shell_environment_policy` only); Claude `additionalDirectories` through session config → query options → SDK client; GraphQL `semanticMemoryEnabled`/`semanticMemoryPath` and input fields. Web: `AgentSemanticMemoryField.vue`, form wiring, detail card, store/GraphQL documents/generated types, en + zh-CN strings (including the personal-settings note). Docs: glossary and module docs.
- Changed files or areas: see `implementation-handoff.md` Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` Checks Run (IMP-01..IMP-09).
- Next recipient or routing: Code Reviewer (Large/High route), per `get_handoff_rules`.
- Remaining limitations or risks: real-runtime write access (AC-002) and cross-Project/team reads (AC-003, AC-004) are not run here; DeepSeek harness asks an escalation with auto-execute off (FU-007); pre-existing failures FU-010..FU-012.
