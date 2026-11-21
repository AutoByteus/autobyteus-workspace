# Investigation Notes — cross-node-file-transfer-587 (autobyteus-587)

## Investigation Meta

- Package: `cross-node-file-transfer-587`; Project Task `autobyteus-587`, delegated by `/project_task_manager` for the founder.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587`, branch `codex/cross-node-file-transfer-587`, base `origin/personal` `fbe714f8bb` (fetched 2026-11-21); target `origin/personal`.
- Current solution revision: `SR-001`.
- Authorities read (requirements gate; read in full in this conversation, 2026-11-18): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`.
- Status: requirements investigation complete; architecture investigation after approval.

## Request

Founder (2026-11-21, via the PM): cross-node `delegate_task` and `send_message_to` refuse `reference_files`, so agents on two machines cannot hand each other videos, screenshots, PDFs, reports or datasets. Principle: like two colleagues on independent machines, no hidden magic: attached files are streamed over the authenticated peer connection to the receiving node, and the recipient gets its own local paths. Shared storage (NFS + a skill) stays separate and explicit. Consider SHA-256 deduplication and retention; size caps, path/symlink validation, checksums, clean errors; align with autobyteus-566.

## Source Log

| Source | Finding |
| --- | --- |
| `src/agent-collaboration/execution/remote/remote-delegation.ts:44` | `delegate_task` with `node` refuses `reference_files` ("Files (reference_files) can't be sent to an agent on another node yet") |
| `src/agent-collaboration/execution/communication/root-communication-engine.ts:180` | A message to a remote endpoint (linked or `node`) refuses files: `REMOTE_ATTACHMENTS_NOT_SUPPORTED` |
| `docs/modules/agent_tools.md` § delegate_task | Local `reference_files` must be normalized absolute existing files (no dirs, URLs, `..`); any such path on this node is accepted |
| `src/remote-collaboration/channel/peer-request-signature.ts`; `src/api/security/node-access-plugin.ts:69-92` | Every peer request is HMAC-signed over method, path, nodes, time, nonce and the body's SHA-256; the gate hashes the body while it streams (`preParsing`) and compares after parsing (`preValidation`): a route must consume its whole body before its handler runs |
| `src/api/rest/memory-sync.ts:66-128`; `src/memory-sync/hub/memory-hub-staged-file-store.ts`; `src/memory-sync/source/memory-file-stager.ts`; `memory-sync-transfer-limits.ts` | Existing node-to-node file transfer: files staged by SHA-256 name (`<memory>/memory-sync-staging/<source>/<sha256>.partial`), status `GET` (received bytes; skip/resume), `PUT` pieces of at most 8 MiB with `offset`, verify size and SHA-256, place by rename, sweep stale partials |
| `src/context-files/` ; `GLOSSARY.md` § Context Files | Context-file storage per run (`context_files/`), path containment helper; limits: audio/video 2048 MiB, other files 25 MiB (settings) |
| `src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts:17,36` | Our MCP descriptor for Codex sets only `startup_timeout_sec`; the per-tool-call timeout is the runtime's default (not measured yet: UNK-001) |

## Relevant Existing Behavior

| ID | Behavior | Evidence |
| --- | --- | --- |
| BEH-001 | Cross-node delegation refuses files | `remote-delegation.ts:44` (Read) |
| BEH-002 | Cross-node messages (linked or `node`) refuse files | engine `:180` (Read) |
| BEH-003 | Local `reference_files`: any normalized absolute file of the node; the recipient reads it in place; messages' references are served to the UI from the stored path | `agent_tools.md`; message log `referenceFiles` (Read) |
| BEH-004 | Node-to-node file staging exists for Memory Sync | memory-sync files (Read) |

## Requirement Implications

- The peer gate's body check makes one-request streaming of a large file impossible without buffering; the Memory Sync pattern (bounded, signed, resumable pieces into a content-addressed staging area) fits the gate unchanged.
- A cross-node transfer moves data off the machine: which local files an agent may send is a security decision.
- A large transfer takes minutes inside one tool call; runtime tool-call timeouts are unknown (UNK-001).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| UNK-001 | Unknown | Per-tool-call timeouts of Codex, Claude and the other runtimes for `send_message_to`/`delegate_task` over Agent Tools MCP | Measure in design; DEC-003 depends on it |
| UNK-002 | Unknown | autobyteus-566 (Cloud & Multi-Node Security Architecture): its decisions are not in this repository yet | Align when it lands; this ticket stays within NA-* rules |
| RSK-001 | Risk | Exfiltration by a prompt-injected agent | DEC-001 |

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `reference-files-contract.md` (RFC-001) | Solution Designer | Contract of reference files on both tools, all routes | Ready for Approval |

## Contract Investigation (2026-11-21)

- Existing contracts: the living canonical contract is `autobyteus-server-ts/docs/design/collaboration_model.md` (CM rules; § 3 run storage; § 4 remote runs: "Later steps add attachment transfer (today `reference_files` are local paths)"); mechanics in `docs/modules/agent_communication.md` (local references: team route persists them as Team Communication references; direct route passes them in input metadata) and `remote_collaboration.md` (wire). Historical ticket contracts (ATC-001) are not living. No file contract exists.
- Agent folders: `AgentMemoryLayout` (`agent-memory/store/agent-memory-layout.ts:90-175`): standalone `agents/<runId>`, Team member `agent_teams/<teamRunId>/<agentRunId>`, Org via `getRootedAgentRunDirPath`; run discovery walks only `agents`, `agent_teams`, `agent_orgs` (`agent-memory/services/run-folder-discovery.ts:73-75`).

## Architecture Investigation Findings

Added after approval.
