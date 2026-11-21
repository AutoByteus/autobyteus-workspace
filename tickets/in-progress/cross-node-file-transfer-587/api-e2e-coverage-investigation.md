# API/E2E Coverage Investigation — cross-node-file-transfer-587 (autobyteus-587)

## Investigation Meta

- Requirements Doc: `tickets/in-progress/cross-node-file-transfer-587/requirements-doc.md` (Approved, SR-008; supplement `reference-files-contract.md` RFC-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-009)
- Supplemental Task Artifacts: `reference-files-contract.md` (RFC-001, approved)
- Design Review Report / Architecture Review Revision Record: present (ARCH-REV-002 Pass; the reviewer's uncommitted worktree edits are left untouched)
- Implementation Handoff: `implementation-handoff.md` (IR-001); Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `code-review-report.md`, `code-review-revision-record.md` (CRR-001 Pass, no findings)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 1; Trigger: CRR-001 Pass (code `e327ba2467`, documents up to `17ee6b7858`)
- Prior Investigation Reviewed: None

## Current Requirement And Design Basis

RFC-001: a file attached to a cross-node `delegate_task` or `send_message_to` is copied to the receiving node. Only files inside the sending agent's workspace (links resolved; folders refused; RF-3). The per-file limit is the receiver's `AUTOBYTEUS_RECEIVED_FILE_MAX_MB` (default 2048 MiB), with 4 GiB per call (RF-4). Each content is uploaded once (status, then signed raw `PUT` pieces of at most 8 MiB, resumable, RF-11). Delivery is all or nothing, and the call waits and reports `files_sent` (RF-5, RF-6). The receiver verifies before any root sees the request, then places read-only hard links at `<agent folder>/received_files/<sender run ID>/<name>`; the same sender's same name is replaced (RF-7). Each node's log line names its own paths (RF-8, RF-9). A run's history delete removes its copies; the node's bytes go when no run links them and they are 24 h untouched, and a partial upload after 24 h (RF-10). Memory Sync skips `received_files` (DEC-007). Every cross-node send names its node (RF-14: `NODE_REQUIRED`, `NODE_MISMATCH`). Persisted data: new data only.

## Supported Scenarios And Real Usage

- Designer scenarios: UC-001 … UC-004; entry forms 1–8 of the design; route table rows 4–6.
- Added from the implementation: RU-1, the founder's success journey (delegate with a video and a PDF, the task agent replies with a rendered file). RU-2: a broken link mid-upload, then the agent's retry, which resumes. RU-3: a newer version of a file sent again (RF-7). RU-4: the same handbook to two runs, then both histories deleted. RU-5: two PMs exchange a file by `node` (`run-messages`).
- Contrived (not tested): none recorded. The narrow race (a Task closing between placement and the log commit) is a recorded residual risk, not a supported scenario.

## Changed Surface And Boundary Classification

| Surface | Affected | Changed boundary | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- | --- |
| API / transport / contract | Yes | two peer routes; `files` on messages/work packets/run-messages; raw-body signing | unit + in-process two nodes (HTTP and the gate's signature check replaced, IMP-04) | the real gate hashing an octet-stream body; the scoped 8 MiB body limit; real HTTP | two built servers (gated E2E) |
| Authentication | Yes | piece route behind NA-9 | unit | real gate on raw bodies | two-server E2E |
| Persisted data | Yes (new) | node store, per-agent links, sweep | unit | real filesystem link counts, history delete through the app's mutation | two-server E2E |
| Process lifecycle / distributed | Yes | upload before start/delivery; a broken link | unit | real broken connection mid-upload | two-server E2E with the capturing proxy |
| Message rule (RF-14) | Yes | `NODE_REQUIRED`, `NODE_MISMATCH` | unit, in-process | real built routing on both nodes, with a third node | two-server E2E |
| Browser / desktop | No (server-only; a settings doc page) | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-file-transfer-587`, branch `codex/cross-node-file-transfer-587`, base `fbe714f8bb`, which already contains autobyteus-492 and 565.
- Testing guideline: `TESTING.md` (root). Applicable: server tests + server E2E for API journeys; both typechecks; gated scripted-AGY suites; fresh-start build. No change to tool exposure (`reference_files` existed; results gain `files_sent`), so the whole-suite rule for tool exposure does not apply. The whole `test:integration` and `pnpm test:e2e` still run, because the peer wire changed.
- Changed build inputs: `autobyteus-server-ts/typecheck-baseline.json`. The implementation's IMP-05 ran a fresh-clone install with both typechecks on `e327ba2467`; it is reused.
- Secrets: N/A.

## Existing Durable Coverage Inventory

| Path / Test | Current assertion | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| two-server suite: every `send_message_to` to a linked remote run without `node` (37 calls in RC-05 … RC-19, RC-42's embedded report) | delivered without `node` (CM-11) | RF-14, DEC-006 | Needs Update | pass `node` (beta's or alpha's name for the other node) |
| two-server RC-06/RC-22 (a teammate of the delegator without `node`) | delivered unlinked (492 DS-006) | RF-14 | Needs Update | first `NODE_REQUIRED` naming the node, nothing sent; then with `node`, delivered |
| two-server RC-08/RC-22 (another root to a peer run alpha's Task records know, without `node`) | 492's not-running text | RF-14, design DS-005 | Needs Update | `NODE_REQUIRED` naming the node |
| two-server RC-09 | "Files … can't be sent to an agent on another node yet" | REQ-001 | Replace | the file refusals that remain (outside the workspace, a link leading out, a folder); saved Tasks still refused |
| two-server forged bodies (`inboundMessage`, RC-08, RC-48), RC-20 audit, `CapturingProxy` | bodies without `files`; JSON-only proxy that re-encodes bodies as text | wire | Needs Update | `files: []`; the audit learns `files`, the status route and pieces; the proxy forwards raw bytes and can tamper |
| `node-access-model.e2e.test.ts` `peerMessage` | a signed `messages` body without `files` answered 200 | wire | Needs Update | `files: []` |
| web `mobile-shell-probe.mjs` MSP-08 (565) | the PTM wakes its linked remote run without `node` | RF-14 | Needs Update | `node: PEER` |
| `collaboration-contract-stories.e2e.test.ts` §5.1 (S18/S19: beta's lead messages M on alpha without `node`) | delivered / refused CLOSED as the 461 model says | RF-14 | Unclear until run | run; if the drivers need `node`, update the drivers (the model's outcome with `node` is the same) |
| 461 contract model `model.py`/`stories.py` (authority of `contract-states.json`) | `send_by_run_id` without node; its cross-node branch admits a linked message without node (CM-11) | RF-14 (found in round 2, CRR-002 T-001) | Needs Update | the model states RF-14; S18/S19 pass node; fixture regenerated; model probe (API-11) |
| `collaboration-prompt-wording.e2e.test.ts` | prompt and refusal texts | wording (reply instruction names the node) | Unclear until run | run |
| Unit/integration suites changed by the implementation | — | — | Still Valid | reused (IMP-03, IMP-04) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-004, AC-005 (unit), AC-007 (unit), AC-008, AC-009 (Codex/Claude configs, DEC-008 (b)), AC-011, AC-010 (in-process) | server unit, in-process two nodes | Reused | IMP-01, IMP-03, IMP-04, IMP-05 | ran on `e327ba2467`; no `src` change since |
| API-02 | — | typechecks of my test edits | Existing Test | `pnpm -C autobyteus-server-ts typecheck`, `pnpm -C autobyteus-web typecheck` | E2E/probe edits |
| API-04 | wire, all | whole `test:integration` | Existing Test | `pnpm -C autobyteus-server-ts test:integration` | peer wire changed |
| API-05 | wire, all | whole ungated E2E | Existing Test | `env -i … pnpm test:e2e` | peer wire changed |
| API-06 | AC-001, AC-002, AC-003, AC-005, AC-006, AC-007, AC-010, RF-7, RF-11, RF-12, RF-14, QR (gate) | two (and three) built servers through capturing proxies | Durable | gated two-server suite (RC-51 … RC-54 new; RF-14 and wire updates) | UNK |
| API-07 | RF-14 contract | contract stories | Existing Test | gated `collaboration-contract-stories.e2e.test.ts` | cross-node steps |
| API-08 | wording | prompt wording suite | Existing Test | gated `collaboration-prompt-wording.e2e.test.ts` | reply instruction changed |
| API-09 | RF-14 on the phone stack | phone bundle | Durable (updated) | `test:e2e:mobile-shell --cases=MSP-08` | my 565 case uses a linked remote run |
| API-10 | — | tracked imports | Existing Test | checker | new test code |
| API-11 | RF-14 in the contract model | 461 model, stories, fixture | Durable (updated, round 2) | export `--check`, walkthrough, model probe | T-001 |

- Test progress log: `Yes`.

## Not Tested / Infeasible / Deferred (planned)

| Behavior | Reason | Risk | User-only? | Follow-up |
| --- | --- | --- | --- | --- |
| AC-009 on AGY, Grok and ACP runtimes | DEC-008 (c): accepted unverified risk (needs signed-in CLIs) | low, bounded (all or nothing) | No | FU-001 |
| AC-009 on Codex and Claude end to end | DEC-008 (b): the materialized configs (unit) are the decided evidence | low | No | — |
| A 300 MB video (the success definition's size) | 20 MiB (three pieces) exercises the same piece, resume and verify paths; a 300 MB run adds disk and time only | low | No | — |
| Memory Sync export of a node with received files (AC-011) | needs a Memory Hub; the path policy and scanner are unit-tested (IMP-03) | low | No | — |

## Investigation Decision

- Proceed: `Yes`. Durable coverage added/updated: `Yes`. Reroute: `No`.
