# Solution Revision Record — cross-node-file-transfer-587 (autobyteus-587)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-587; investigation 2026-11-21 | — | N/A | Ready for Approval | BEH-001…003, REQ-001…008, AC-001…008, DEC-001…005 | DEC-001…003 put to the founder |
| SR-002 | Requirements | The founder's answers, 2026-11-21 | DEC-001…003 | Ready for Approval | Approved | REQ-004, DEC-001…003 | Workspace files only; 2 GiB per file, 4 GiB per call; the call waits |
| SR-003 | Requirements | The founder: "design the contract file first … make the contract complete" (2026-11-21) | — | Approved | Ready for Approval (supplement) | all; RFC-001 | Contract RFC-001 written: rules, routes, refusals, wire, storage, examples |
| SR-004 | Requirements | The founder: "always … add the node parameter … similar to delegate task"; "Yes include in this ticket" (2026-11-21) | DEC-006 | Ready for Approval (supplement) | Ready for Approval (supplement) | REQ-009, AC-010, RFC-001 RF-14, row 6, refusals | `node` required for every cross-node message |
| SR-005 | Requirements | The founder's approval of RFC-001, 2026-11-21 | — | Ready for Approval (supplement) | Approved | RFC-001 (storage layout, RF-7, vocabulary) | Contract approved: folders by sender run ID, same-sender replacement, node-level `<data>/received_files/` |
| SR-006 | Design | Architecture design | — | Approved | Approved; design Ready | all | `OutgoingFiles`, `ReceivedFiles`, two peer routes, RF-14 routing, runtime timeouts; Large/High |
| SR-007 | Design | The founder: validate each use case yourself, then send for review (2026-11-21) | G-1, G-2, G-3 | Design Ready | Design Ready (self-validated) | DS-002, DS-003, DS-005 | Remote input builder lists received files; raw-body signing; RF-14 owners named |
| SR-008 | Mixed | ARCH-REV-001 (Fail) | AR-001 … AR-006 | Design Ready; review Fail | Approved (DEC-007 (a), founder); design Ready for ARCH-REV-002 | DEC-005, DEC-007, DEC-008; DS-002, DS-004, DS-005; removal plan | Order on the receiving node; sweep grace; dead send path; NODE_MISMATCH via the Task entry; evidence decision; Memory Sync question to the founder |

## Revision Entries

### SR-001 — Files across nodes (baseline)

- Trigger: Task autobyteus-587 (founder via the PM, 2026-11-21).
- Shaping findings: two refusal points; the peer gate checks a body's hash after parsing, so files travel in bounded signed pieces (the Memory Sync staging pattern); sending moves data off the machine (DEC-001); runtime tool-call timeouts unknown (DEC-003, UNK-001).
- Approval: pending. Next: the founder's answers, then design.

### SR-002 — Approved

- Trigger: the founder, 2026-11-21: "the agent can only send files in its own workspace" (DEC-001, narrowed from the recommendation: received files are forwarded by copying them into the workspace first), "size limits I agree" (DEC-002), "the tool call will need to wait" (DEC-003 (a)). DEC-004 (one stored copy per node, removed when no run that received it is left) explained to him again on request.
- Approval: `User`; baseline SR-002. Next: architecture design.

### SR-003 — Reference files contract (RFC-001)

- Trigger: the founder, 2026-11-21: design the contract file first, check existing contract files, make clear where storage is when cross-node is used, make the contract complete.
- Found: the canonical collaboration contract (`collaboration_model.md`) has no file rules; no file contract exists. RFC-001 written as a behavior-defining supplement; after delivery its rules become CM-14.
- Approval: pending the founder (supplement). Requirements SR-002 unchanged.

### SR-004 — `node` always names another node

- Trigger: the founder asked why a reply to a linked run needs no `node`, preferred symmetry with `delegate_task`, and approved including it here (2026-11-21).
- Changes: REQ-009, AC-010, DEC-006; RFC-001 RF-14, route row 6, refusals `NODE_REQUIRED`, `NODE_MISMATCH`, example. Replaces autobyteus-191's "follow-ups never name the node" (CM-11 to be updated).
- Approval: DEC-006 by the founder; RFC-001 as a whole still awaits his approval.

- 2026-11-21 (within SR-004): RFC-001 § 3 Storage Layout added (store `<memory>/received-file-store/<sha256>`, `.partial`, per-agent `received_files/<sender's run ID>/<file name>`); RF-7: the same sender's same-named file replaces the earlier one (founder: "we definitely need to replace the existing one"); folder by sender run ID (Solution Designer's recommendation, explained to the founder); examples updated.

### SR-005 — Contract approved

- Trigger: the founder, 2026-11-21: "Great I think it's clear now you can work now", then: the node-level received files "not in memory folder … in the roots like a server data folder".
- Changes: RFC-001 § 3 Storage Layout and vocabulary: `<data>/received_files/<sha256>` (beside `memory/`; one disk, `app-config.ts:333-335`); folder named `received_files` (founder); per-agent `received_files/<sender's run ID>/<file name>`; same sender's same-named file replaces.
- Approval: `User`; requirements SR-005 with RFC-001 as its approved supplement. Next: architecture design.

### SR-006 — Design

- Design spec written (Ready): upload before start/delivery (`OutgoingFiles`, one owner for both tools), `<data>/received_files` with pieces, verify, place as read-only hard links with same-sender replacement, link-count cleanup after history delete and at start (`ReceivedFiles`), receiving roots place in their accept step, RF-14 refusals, Codex/Claude tool timeouts set (AGY/Grok/ACP measured), docs.
- Classification: `Large` / `High`. Next: architecture review.

### SR-007 — Self-validation (founder's delegation)

- Trigger: the founder, 2026-11-21: "validate each use case based on your data flow spine … then you just send for review by yourself" (the design approval the Task asks for is delegated to this validation plus the architecture review).
- Findings fixed: G-1 remote input builder omitted the reference block; G-2 raw-body signing and a raw `PeerClient` call; G-3 RF-14 refusal owners (root `deliverExact`, CrossRun peer-run branch, `sendToPeerRun`).
- Next: architecture review.

### SR-008 — ARCH-REV-001 fixes

- AR-001: Memory Sync would copy received files to the hub: DEC-007 put to the founder (recommend: skip `received_files/`).
- AR-002: the engine drives accept checks, then placement (port), then the log; work packets: verify, `readyHost`, place, post.
- AR-003: sweep removes only unlinked entries untouched for 24 h; `status` and completion touch entries.
- AR-004: `RemoteMessageSend.send` / `RemoteMessageSendInput` in the removal plan.
- AR-005: `peerRunAdmission` answers `NODE_MISMATCH` from the Task entry's node.
- AR-006: DEC-005 corrected; RFC-001 marked Approved in the notes; DEC-008 evidence decision (Codex/Claude config evidence; AGY/Grok/ACP accepted, FU-001).
- Residuals: one open of the validated file; offset mismatch answers `receivedBytes`.
- Next: the founder's DEC-007, then ARCH-REV-002.
- 2026-11-21 (SR-008): the founder decided DEC-007 (a): "memory sync should not copy files … we cut a tons of duplicated files". AC-011 added; design: path-policy rule. Next: ARCH-REV-002.

### SR-009 — ARCH-REV-002 Pass; AR-007 wording

- ARCH-REV-002: Pass for SR-008 (`eac8cf3814`); the reviewer handed off to `/implementation_engineer`.
- AR-007 (Low): DS-001 and DS-002 spine lines now show the receiving order of § Ownership Map; DS-005 names `peerRunAdmission`; entry form 6b (wrong `node` from a non-linking root) added. No design change.

### SR-010 — Code review CRR-008 (full re-audit after the autobyteus-591 merge)

- Trigger: CRR-008 (Fail): CR-587-01 (Design Impact), CR-587-02 … 04 (Local Fix), CR-587-05 (scope), FU-007 (Requirement Gap), AC-002/AC-007 wording; recommendation: one owner of RF-14.
- Founder (2026-11-21): FU-007 → DEC-009 (a saved Task's files travel to another node, to the Agent or a Team's coordinator, as a new copy or to an existing copy; RF-3 exception for the Task's own context files); confirmed the R1 order after the explanation of the run's assignment ("you already figured out the correct order").
- Changes: design § Revision SR-010 (R1 order; R2 `PeerRunNodes`; R3 saved Tasks; R4 fixes; R5 tests); requirements DEC-009, AC-012, AC-002 and AC-007 wording; RFC-001 RF-3 exception, route rows 4b, 4c; follow-ups FU-002/3/4/6/7 resolved into this ticket.
- Classification unchanged (`Large` / `High`). Next: architecture review of the revision, then implementation and API/E2E.

### SR-011 — ARCH-REV-003 Pass; AR-008, AR-007

- ARCH-REV-003: Pass for SR-010 (`beb161d299`); handed off to `/implementation_engineer`.
- AR-008: RF-14 applied to the third form (a saved Task given to an existing copy on another node takes `node`), per the founder's rule with no exception; RFC-001 RF-14 and row 4c, DEC-006, AC-012, design R3 note. The implementer told before building 4c.
- AR-007: DS-001, DS-002, DS-005 lines now show the SR-010/011 shapes.
- Residual for the founder (reviewer's note): an agent can attach a file to a Task itself (`create_task`/`update_task` `context_files`), and the RF-3 exception then lets it travel — the same visible-step model as copying into the workspace.

### SR-012 — Code review CRR-009: CR-587-08 decided

- Trigger: CRR-009 (Fail): CR-587-08 (security Requirement Gap), CR-587-06/07 (Local Fix), CR-587-05 (API/E2E, scope confirmed at SR-010); recommendation: a read-only closed pre-check before the upload.
- CR-587-08 → DEC-010 (c): accepted and recorded; the founder delegated the choice (2026-11-22). No intended behavior or design change.
- Recommendation not taken: keep SR-010 R1's order (one owner of the closed rule, `admitPeerRun`); a non-assigner's message with files to a closed peer run uploads, then is refused, and its bytes are swept after 24 h (rare; costs only bandwidth).
- Note for implementation: `task-delegation.ts` is at 498 non-empty lines; any addition there splits the file (DESIGN.md size rule).
- Next: implementation applies CR-587-06/07; API/E2E CR-587-05; then code review.
- 2026-11-22 (SR-012): the founder discussed (1) one rule with no exception for a Task's files and (2) no workspace rule at all (security from pairing and signing), then confirmed the decisions as made (DEC-001 workspace rule, DEC-009 exception, DEC-010 (c)). No change.
