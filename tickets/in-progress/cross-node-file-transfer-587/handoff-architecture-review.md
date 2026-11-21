# Handoff — Architecture Design Complete: cross-node-file-transfer-587 (autobyteus-587)

- Result: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High` → architecture review.
- Package: `cross-node-file-transfer-587`; Project Task `autobyteus-587`, delegated by `/project_task_manager` for the founder. Revision `SR-006`.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587`, branch `codex/cross-node-file-transfer-587`, base `origin/personal` `fbe714f8bb`; target `origin/personal`. No release without the founder's word.
- Request: cross-node `delegate_task` and `send_message_to` carry `reference_files`: copied over the authenticated peer connection; the recipient gets its own local paths; no hidden sharing (NFS stays separate).
- Approved basis (founder, 2026-11-21, his words in the requirements and the contract): workspace files only; 2 GiB per file (node setting), 4 GiB per call; the call waits; received files belong to the receiving run, deleted with its history; folders by sender run ID with same-sender replacement; node-level bytes at `<data>/received_files/`; `node` required for every cross-node send (RF-14, replaces CM-11's rule).
- Behavior-defining supplement: `reference-files-contract.md` (RFC-001, Approved) — please review the design against it.
- Evidence: two refusal points; the peer gate checks a body's hash after parsing (bounded pieces); Memory Sync's staging precedent; memory always inside `<data>`; runtime timeouts (Claude `timeout`, Codex `tool_timeout_sec` configurable; AGY/Grok/ACP unknown).
- Please review especially: upload-before-start ordering and the all-or-nothing rule; `ReceivedFiles` placement (replace by atomic rename, read-only hard links, copy fallback) and link-count cleanup; RF-14 refusals and where the known node comes from; the entry-form table.
- Documents: this file, `requirements-doc.md`, `reference-files-contract.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `follow-ups.md` (none).
- Route: `get_handoff_rules` 2026-11-21 → `/architecture_reviewer` (Large or High).
