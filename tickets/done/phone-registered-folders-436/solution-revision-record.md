# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-436 + user comments 2026-11-09) | FU-001 | N/A | Ready for Approval | BEH-001…006, REQ-001…008, DEC-001…006 | Waiting for the user's DEC-001 |
| SR-005 | Design | Design for the approved simple version | — | Requirements approved | Architecture Design Complete (Medium/High) | DS-001, DS-002; NAS-39, NAS-40 | Handed to architecture review |
| SR-004 | Requirements | User chose no folder limit: the phone opens any file read-only (2026-11-09) | — | Ready for Approval | Approved | All REQ/AC rewritten; DEC-001 = S | Folder list dropped |
| SR-003 | Evidence + Requirements | Resumed 2026-11-09 (user: "since the authentication is done now … work on the ticket for the files on the worktree") | — | On hold | Ready for Approval | DEC-001 | Base moved to 34ea6e36bb; DEC-001 restated after slice 1 |
| SR-002 | Evidence + Requirements | User conversation 2026-11-08 (network exposure, peer authentication, universal authentication) | FU-001 | Ready for Approval | Ready for Approval, on hold | DEC-001 | User chose universal authentication first (own Task); FU-001 sent |

## Revision Entries

### SR-001 — Phone folder list baseline; node reach corrected

- Phase and classification: Requirements, `Initial Baseline`
- Triggering evidence: Task autobyteus-436, its two user comments; PROBE-01
- Triggering finding IDs: FU-001
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not started
- IDs affected: all (baseline)
- Scenario-basis changes: SCN-004 valid only if DEC-001 = option 2
- Why recorded: the first coherent baseline brought to the user; it challenges the Task's premise (the node already lets a phone read any folder)
- Canonical sections changed: requirements-doc.md (all), investigation-notes.md (all)
- Supplements: `probes/abx436-phone-file-reach.probe.e2e.test.ts`, `evidence/PROBE-01-phone-file-reach.log`
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: not approved; DEC-001 needs the user
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: result returned to the user in the Solution Designer's conversation and to `/project_task_manager` (see `handoff-investigation-result.md`)
- Remaining gaps: DEC-001; the user's word to build
- Next action: on the user's answer, record approval, then architecture design

### SR-002 — Network exposure measured; user chooses universal authentication first

- Phase and classification: Evidence + Requirements, `Refinement`
- Trigger: the user's questions in the Solution Designer's conversation, 2026-11-08
- Finding IDs: FU-001 (extended)
- Prior status: requirements Ready for Approval
- Current status: Ready for Approval, on hold until universal authentication's first step (ordering awaits the user's confirmation)
- Evidence added (follow-ups.md FU-001): the user's desktop node listens on `*:29695` (all addresses), Docker nodes on `*:8001`, `*:8003`, macOS firewall off (measured read-only); the Mac has global IPv6 addresses (node IPv4-only; Docker on IPv6); peer requests carry no secret, only a public node ID (read); desktop → remote node has no credential (read); Tailscale Serve arrives as loopback (read); terminal without credential (read, not reproduced)
- Decision: DEC-001 → the user's direction: universal authentication for every endpoint and every client kind (desktop gets its key at start; phones and peers by pairing; no key, no access) as its own Task first
- Intended behavior of this ticket changed: No (the folder list stays as proposed); its order and the meaning of "allowed" follow the authentication Task
- Approval impact: not approved; on hold
- Handoff: user's direction sent to `/project_task_manager` for a new Task (FU-001)
- Next action: the PM creates the authentication Task; on the user's confirmation, this ticket depends on it

### SR-003 — Resumed on top of 437 slice 1

- Trigger: the user's word, relayed by the PM (2026-11-09): "Since the authentication [is] done now, right, then I think we can work on the ticket for the files on the worktree, file display, do you remember?"; 437 slice 1 delivered (`ec2380485c`, beta.9)
- Evidence: investigation-notes "Resumed 2026-11-09": strangers are out (NA-1, NA-3); the phone's own credential still reaches any folder (route permissions), limits are 441
- DEC-001 restated for the user: option 1 (folder list for the phone's links and a read-only node route for listed folders; full limit in 441) or option 2 (also enforce now: phone file reads limited and no typed folder for a new phone run)
- Next action: the user's answer; then approval record, design, classification, route

### SR-004 — New baseline: the phone opens any file read-only (folder list dropped)

- Phase and classification: Requirements, `Requirement Gap` resolved by the user (intended behavior changed)
- Trigger: the user's answers, 2026-11-09: "What is your suggestion since now we have good authentication so I think we can make these things simpler right" → the Solution Designer recommended dropping the folder list → "Yes I also think so let's drop this limitation now just can just open any files now yeah from the phone it's just limited it to read only I guess right" (confirmed read-only)
- Prior: SR-001…SR-003 folder-list baseline (design A), Ready for Approval, never built
- Current: requirements-doc.md rewritten (REQ-001…006, AC-001…006, DEC-001 = S); approved by the user
- Intended behavior changed: Yes (approved); the Task's constraint "do not widen what a phone can read without the user's explicit decision" is met by this explicit decision
- Next action: design

### SR-005 — Design (Medium / High)

- design-spec.md: read-only node-file route (`GET /rest/node-files/content?path=`, owner and phone), `NodeFileReader`, phone `openNodeFile` + `useMobileNodeFile`; contract NAS-39, NAS-40 and §5 updated
- Classification: task_size Medium, architectural_risk High (a security-contract route) → architecture review
- Handoff: `handoff-architecture-review.md`

### Review note — ARCH-REV-001 Pass (informational)

- Architecture review: Pass, no blocking findings (`design-review-report.md`); the reviewer sent the package to `/software_engineering_team/implementation_engineer`. R-1, R-2 went to implementation.
- R-3 (optional, for the Solution Designer) applied: the contract's §5 row notes that "any file" includes the node's own data folder (peer secrets, MCP gateway token), already reachable through workspaces and covered by the approved non-goal, as input for autobyteus-441. No behavior change.
