# Handoff Summary — cross-node-file-transfer-587 (autobyteus-587)

## Summary Meta

- Ticket: `cross-node-file-transfer-587` (Project Task `autobyteus-587`): files attached to a cross-node message or delegation are copied to the receiving node; every cross-node send names its node.
- Date: `2026-11-22`
- Classification: `task_size: Large`, `architectural_risk: High`.
- Route: architecture review (ARCH-REV-001 Fail, ARCH-REV-002 Pass) → implementation (IR-001 … IR-007) → source review (CRR-001 … CRR-011, a full re-audit at IR-007) → API/E2E (API-REV-001 … API-REV-005, 96%) → test-code review (CRR-003 … CRR-012) → delivery (DR-001, after three rerouted attempts).
- Current Status: `Verified from evidence / finalized on personal; no release` (the commits are in `release-deployment-report.md`).
- Branch: `codex/cross-node-file-transfer-587`, base `origin/personal` @ `fbe714f8bb`; merged with `origin/personal` four times (`3be417f8df`, `575c4ec9ed` autobyteus-22, `bcd05494cb` autobyteus-591, `dc6e6e550b` at the end). Code `e327ba2467` (IR-001) and the later implementation commits up to IR-007 (`11b7ed5444`).

## Delivery Summary

- **Files cross nodes as copies.** `delegate_task` and `send_message_to` with `reference_files` to an agent on another node upload each file first, in signed pieces of at most 8 MiB, checked on arrival (size and SHA-256), once per content (a file the node holds is not sent again; a broken upload resumes). The message or work packet is delivered only when every file arrived (all or nothing), and the tool call waits (`files_sent` in its result).
- **The receiver keeps its own copy.** The bytes are stored once under `<data>/received_files/<sha256>` and each receiving agent gets a read-only hard link (a copy where a link cannot be made) at `<its own folder>/received_files/<sender's run ID>/<name>`; the message names those paths. Deleting a run's history deletes its names; a sweep (at startup and after each delete) frees stored bytes no run links once untouched for 24 hours, and abandoned partial uploads. Memory Sync never exports `received_files`.
- **Limits and rules.** Only files inside the sending agent's workspace (links resolved), regular files, at most the receiving node's per-file limit (new server setting `AUTOBYTEUS_RECEIVED_FILE_MAX_MB`, default 2048, allowed 1–4096) and 4 GiB per call. Files are opened once, with device and inode matched.
- **Saved Tasks travel with their files (DEC-009).** `delegate_task` with `task_id` and `node` starts a new remote Agent or Team copy from a saved Task; a saved Task given to an existing remote copy needs `node`. The Task's own context files go with it (to the Agent, or a Team's coordinator): the one exception to the workspace rule.
- **Every cross-node send names its node (RF-14, DEC-006).** One owner, `PeerRunNodes`, answers `NODE_REQUIRED` (with the node to pass), `NODE_MISMATCH` and `NODE_NOT_PAIRED`. The order on the node path: peer → `PeerRunNodes` → upload → autobyteus-591's `admitPeerRun` → delivery. A refused file or a failed upload reopens a closed Task's run nothing; a damaged piece reads "damaged or refused in transit".
- **Tool-call time.** Codex (`tool_timeout_sec: 3600`) and Claude (`timeout: 3_600_000`) get an hour for the Agent Tools server; AutoByteus has no limit.
- **Also in this ticket:** the 461 contract model is complete (`counterpart`, `copiedFrom`, the no-node rule, 591's continuation, DEC-009's S25), so the gated contract stories pass again; autobyteus-22's and 591's cases were reconciled with this ticket's in the two-server suite (this ticket's cases are RC-55 … RC-61).
- Docs: from the code commits `collaboration_model.md` (CM-10, CM-11, CM-14), `remote_collaboration.md`, `agent_communication.md`, `agent_tools.md`, `GLOSSARY.md`, web `settings.md` (verified by delivery); at delivery `remote_collaboration.md` (saved-Task paragraphs), `projects.md`, `memory_sync.md`, `agent_artifacts.md`; `TESTING.md` gained a row delivery proposed (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery. No user check is needed: every critical acceptance criterion (AC-001 … AC-008, AC-010, AC-012) is directly proven on built servers over real HTTP; AC-009 is proven for Codex, Claude and AutoByteus and is an accepted unverified risk for AGY, Grok and ACP (DEC-008).
- Key evidence (under `evidence/API-R5/` unless named):
  - `API-06/API-06-two-server.log` and `remote-two-server-receipt.json`: `Tests 61 passed (61)`. RC-56: the 20 MiB `.mp4` in three pieces at offsets 0, 8388608, 16777216, then `delegated-runs`, then the `work_packet`; every file read-only, 2 links, equal to the store. RC-57: unsigned, wrongly signed and tampered pieces 401, an oversize piece 413, a content mismatch refused. RC-58: a cut link names `render.mp4`, delivers nothing, and the next send resumes at 8388608. RC-59: uploaded once, kept once, freed by the next cleanup. RC-60: a saved Task's two context files to a new Agent and to a new Team (the coordinator's folder). RC-61: the node path's order.
  - `stories/`: the gated contract stories §5.1 (S0 … S27 with S18/S19/S25), §5.2, §5.3 pass (run 2; run 1 differed only at S25's peer-start workspace note, extended to that team).
  - `API-04`: whole `test:integration` 517 passed; `API-05`: whole `pnpm test:e2e` 574 passed; `API-08`: collaboration-prompt-wording 14/14; `msp/`: MSP-08 and MSP-93 on the rebuilt phone bundle; `API-12`: fresh clone with typechecks; tracked imports pass.
- Integrated state (`evidence/DEL-post-integration/`): the last merge (`dc6e6e550b`, packaging only) → `pnpm install --frozen-lockfile`, both typechecks at baseline (server 1000/313, web 86/36), the server rebuilt, the whole two-server E2E file 61/61, 949 targeted server unit tests. The whole unit suite (8821, `IMP-29`) ran on the reviewed code.
- Final confidence 96%, no category below 94%.
- Secret Gate PASS; artifact hygiene and licensing PASS.

## Residual Risks For The User

- **Both nodes need this release** (DESIGN.md rule 9, no version handling). A node on this release refuses a message or delegation request from an older peer as malformed (`files` is required), and every cross-node `send_message_to` needs `node`, a visible change for agents. The release notes tell users to update paired nodes together.
- **DEC-010 (accepted):** any file an agent attached to a Task as a context file can reach another node when the Task is delegated there: a deliberate, visible step, limited to allowed types; the delegation result and the receiving node's message name every file. Hard links inside a workspace to a file outside it pass the workspace rule (same inode, a path inside); making one is a deliberate act.
- **DEC-008 (accepted):** the tool-call limits of Antigravity, Grok and ACP-based runtimes are unmeasured (FU-001); a transfer longer than theirs fails cleanly (all or nothing) and can be retried or sent in smaller parts.
- **Cleanup is not periodic.** A file freed by a history delete leaves the store at a cleanup after 24 hours untouched: the next startup, or a later delete.
- The largest file tested was 20 MiB, not 300 MB (the same pieces, resume and verify paths). The narrow race between placing a file and committing the log line, if a Task closes in between, remains.
- `task-delegation.ts` is at 498 effective lines, just under the 500-line limit.
- **Red on the base, not caused by this ticket:** autobyteus-22's own gated TF-04 (interrupt acknowledgement) fails identically on `6533d7be04` without this ticket's code (FU-005, urgent).

## Follow-ups

`follow-ups.md`: still open for the Solution Designer to send: FU-001 (AGY/Grok/ACP limits), FU-005 (autobyteus-22's TF-04, urgent), FU-009 (a damaged signed JSON body is worded "not paired" by the older 401 mapping), FU-010 (delivery: `remote_collaboration.md` still says remote messages stay out of every run view, true only for Team and Org views since autobyteus-565). FU-002, FU-003, FU-004, FU-006 and FU-007 were resolved in this ticket; FU-008 was sent as Task autobyteus-601 (a product-wide security module, the founder's direction).

## Release

- No release. No release was asked for, and RELEASE.md's default is no release. `release-notes.md` holds the user-facing notes, including the one action users need (update paired nodes together).
