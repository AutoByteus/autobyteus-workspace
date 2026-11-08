# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-437 (user's decision in the 436 conversation) | FU-001 | N/A | Ready for Approval | BEH-001…007, REQ-001…011, DEC-001…010 | Five decisions for the user |
| SR-002 | Requirements | User delegated the five decisions (2026-11-08) | — | Ready for Approval | Approved | DEC-002, 003, 004, 007, 009 | Recommendations adopted |
| SR-003 | Design | Architecture investigation and design; node access contract written at the user's request | FU-002 | Approved (requirements) | Design Ready; user design approval pending | DEC-011…014; DS-001…007 | Design spec written; Large/High |
| SR-006 | Design | ARCH-REV-002 Fail (AR-003, AR-004 residuals; AR-011) | AR-003, AR-004, AR-011 | Round 2 sent | Design revised; ready for review round 3 | M-3, M-4; DS-004, DS-005, DS-007; NA-10, §2 | Fail-closed WebSocket default; all sockets registered; superseded text removed |
| SR-005 | Design | ARCH-REV-001 Fail (Design Impact, AR-001…AR-010) | AR-001…AR-010 | Design approved; review Fail | Design revised; ready for review round 2 | DS-002, DS-003, DS-004, DS-005, DS-007; NA-3, 5, 9, 10, 11, 12, 15; NAS-31…38; DEC-015 | Round 2 mechanisms M-1…M-10 |
| SR-004 | Design | User approved the design, contract and building slice 1 after review (2026-11-08) | — | Design Ready, approval pending | Design approved; Architecture Design Complete | DS-001…007, NA-1…14, NAS-01…30 | Handed to architecture review |

## Revision Entries

### SR-001 — No key, no access: baseline

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: Task autobyteus-437 and its PM comments; autobyteus-436 PROBE-01 and SR-002 evidence
- Prior status: N/A; current: Ready for Approval; design not started
- Why recorded: first baseline brought to the user
- Intended behavior changed: N/A (baseline)
- Approval impact: not approved; DEC-002, DEC-003, DEC-004, DEC-007, DEC-009 need the user
- Handoff: none (approval hold in the Solution Designer's conversation); PM informed
- Next action: on the user's answers, record approval, architecture investigation (UNK-001…005), design, classification, architecture review

### SR-002 — Requirements approved (the user delegated the five decisions)

- Phase and classification: Requirements, `Refinement` (approval)
- Trigger: the user's message, 2026-11-08: "you can provide reasonable solution for the decisions for me"
- Prior status: Ready for Approval; current: Approved
- Decisions: DEC-002 = B-recommended option ("keys + this computer and Tailscale by default; local-network switch off; Docker on this computer by default"), DEC-003 = setup code, DEC-004 = one invite code + signed peer requests, DEC-007 = token for local MCP clients too, DEC-009 = two slices, autobyteus-436 after slice 1
- Intended behavior changed: No (the recommendations as written in SR-001)
- Approval: user, by delegation; he can change any decision
- Next action: architecture reading gate, investigation of UNK-001…005, design spec, classification; the user approves the design before it is built (Task: "build in slices on the user's word")

### SR-003 — Design (slice 1, "no key, no access")

- Phase and classification: Design (+ requirement refinements DEC-011…014 within the approved decisions)
- Evidence: PROBE-02 (Docker client addresses), PROBE-03 (Electron header attachment), architecture investigation rows in investigation-notes.md
- Design: design-spec.md (DS-001…DS-007): one gate (admission → credential → route permission), `node-access` subsystem, launch credential and setup codes, peer pairing with signed requests, network admission, launcher publishing
- Classification: task_size Large, architectural_risk High → architecture review
- Intended behavior changed: No (refinements realize DEC-002 and DEC-004)
- Approval: requirements approved (SR-002); design approval by the user pending (Task: build on his word)
- Contract: `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-14, NAS-01…NAS-30), registered in `DESIGN.md` and `docs/design/README.md`, at the user's request (2026-11-08)
- Next action: user's design approval, then handoff to architecture review

### SR-004 — Design approved by the user; handed to architecture review

- Trigger: the user's answer "Yes approved" (2026-11-08) to "send the design and contract to the architecture review, and slice 1 gets built once the review passes"
- Prior status: design Ready, user approval pending; current: approved; `Architecture Design Complete`
- Classification: task_size Large, architectural_risk High (design-spec.md)
- Intended behavior changed: No
- Handoff: `get_handoff_rules` → Large/High rule → `/software_engineering_team/architecture_reviewer`; result file `handoff-architecture-review.md`
- Next action: architecture review; on Fail/Blocked, findings return to the Solution Designer

### SR-005 — Design revised for ARCH-REV-001 (round 2)

- Phase and classification: Design, `Design Impact` (all ten findings accepted; none changes approved behavior)
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`), Fail
- Resolutions (design-spec "Round 2 Mechanisms"): AR-001 → M-1 launch credential removed from the node's environment by its first module (NA-15, NAS-31); AR-002 → M-2 setup codes on demand through a local control socket, never in files or logs (NA-5, NA-10, NAS-32, NAS-33; DEC-015 refines DEC-003); AR-003 → M-3 the hook decides `/ws/*`, one wrapper delivers close codes; AR-004 → M-4 open-socket registry closes revoked sockets (NA-11, NAS-37; §5 corrected); AR-005 → M-5 MCP gateway token service and owner routes, panel shows the token (NA-12); AR-006 → M-6 admission on the client address with subnets, Tailscale also by local address (NA-3; RSK-005); AR-007 → M-7 signature binds sender and receiver, not before process start, gate owns body integrity (NA-9, NAS-36, NAS-38); AR-008 → M-8 existing containers recreated by `setup-code`/`start`/`upgrade`, LAN-reached server nodes guided to Tailscale or the setting (NAS-34, NAS-35); AR-009 → M-9 invites carry address candidates, resolved by `PeerAddressResolver`, re-pairing updates unpaired rows; AR-010 → M-10 corrections
- Intended behavior changed: No. The user-visible additions (Nodes page network-refused guidance, MCP token shown with Regenerate, `setup-code` restarting an old container once) realize DEC-003, DEC-007, DEC-012 and DEC-013 as approved; DEC-015 records the setup-code refinement
- Contract updated: `node_access_model.md` NA-1…NA-15, NAS-01…NAS-38
- Approval impact: none (user approval of SR-004 covers the approved behavior; no new behavior)
- Next action: architecture review round 2

### SR-006 — Round 3: WebSocket fail-closed default, every socket in the registry, stale text removed

- Trigger: ARCH-REV-002 (Fail, Design Impact): AR-003 residual, AR-004 residual, AR-011
- AR-003: the hook refuses `/ws/*` upgrades with an HTTP status by default; only routes marked by `registerGatedWebSocketRoute` (`routeOptions.config.gatedWebSocket`) get close-code delivery; the architecture test asserts every WebSocket route is wrapped or one of `/graphql`, `/rest/remote/run-observations` (M-3)
- AR-004: GraphQL subscription sockets register in Mercurius `subscription.context(socket, request)` and leave in `onDisconnect`; the run-observation route registers its socket on open and removes it on close (M-4)
- AR-011: DS-004, DS-005, DS-007 narratives, `SetupCodeService`, the boundary map, the `createPeerInvite` row and the signature example now match M-1…M-10; contract NA-10 no longer mentions a setup code file (setup codes are memory-only hashes); contract §2 states the WebSocket refusal forms
- Intended behavior changed: No. Approval impact: none
- Next action: architecture review round 3 (focused re-check)

### Review note — ARCH-REV-003 Pass (informational)

- Architecture review round 3: Pass, no open findings (`design-review-report.md`). The reviewer sent the package to `/software_engineering_team/implementation_engineer`; no Solution Designer handoff.
- The one wording leftover the reviewer noted (M-3's second bullet predating the fail-closed bullet) was aligned in design-spec.md; meaning unchanged (implementation follows the fail-closed bullet, as the reviewer said).
