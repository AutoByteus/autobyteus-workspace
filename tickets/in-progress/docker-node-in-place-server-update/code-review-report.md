# Code Review Report — autobyteus-305, build step 4 (desktop: node version and "Update to <version>")

This report holds the latest result (step 4, CRR-007). Earlier results are in `code-review-revision-record.md`: step 1 (CRR-001/002), step 2 (CRR-003/004) and step 3 (CRR-005/006). Steps 1–3 are merged (`origin/personal` base `1bed6deeaf`).

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-003), with SCN-001, DEC-018, REQ-003, REQ-007, REQ-011, AC-001, AC-009, AC-010
- Design Spec Reviewed As Context: `design-spec.md` (SR-005 + SR-009): DS-001, DS-005, C1, the row states, Concrete Examples
- Supplemental Task Artifacts Reviewed As Context: `handoff-step-4.md`; `tickets/done/one-nodes-tab/requirements-doc.md` REQ-706 (for Q-1)
- Design Review Report Reviewed As Context: ARCH-REV-005 Pass (N-4: `inPlaceUpdate: "error"` and a failed GET)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-004)
- Relevant revision IDs: SR-005, SR-009, ARCH-REV-005, IR-004
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-007`
- Current Review Round: `4` (first for step 4)
- Review Scope: `Full Re-Audit` of the step-4 delta: a new desktop store and component, the C1 POST, and the starter's self-check (CR3-N1); 18 files beyond any prior finding
- Prior Review Round Reviewed: CRR-005 (step 3, Pass), CRR-006 (tests, Not Applicable)
- Failure-origin fields: N/A

Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, `1bed6deeaf...6412b7e4fd` (code in `deead7bf05`).

## Routing Classification Review

- `Large` / `High`, confirmed: a C1 request surface that restarts a remote node, cross-version contract use (C1 frozen), and a desktop surface. Route `Implementation Review`; independent review required: `Yes`.

## Review Scope

- Reviewed:
  - `autobyteus-web/stores/nodeServerUpdateStore.ts`, `components/settings/nodes/NodeServerUpdate.vue`, the `NodeRow.vue` mount;
  - en and zh-CN texts; `dockerNodeLauncherCommands.ts` (`update --all`);
  - server `node-update-routes.ts` (POST) and `starter-client.ts` (`requestUpdate`);
  - starter `self-check.mjs` (CR3-N1);
  - the tests: `NodeServerUpdate.spec.ts`, `nodeServerUpdateStore.spec.ts`, `NodeRow.spec.ts`, `node-update-routes.test.ts`, `update-flow.test.mjs`.
- Context: the `NodeRow.vue` confirmation comment and REQ-706 of `one-nodes-tab`; IMP4-06 evidence and the result screenshot.
- Exclusions: step 5 (resume).

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`. No newly discovered behavior.

| Behavior / AC | Status | Implementation Path And Evidence |
| --- | --- | --- |
| BEH-002, AC-001, DEC-018 | Confirmed | Row → `nodeServerUpdateStore.watch` → GET `/rest/node-update?target=<appUpdateStore.currentVersion>`. "Update to <version>" + "Same version as this app" appear only for `available`, no `updateBlocker`, and `relation: "newer"`. Click → POST → poll every 2 s → steps → result. IMP4-06: about 70 s to "Updated to 1.5.11-beta.6.", same container and image; screenshot S4-04 |
| REQ-007, AC-010 | Confirmed | POST only in `requestUpdate`, called only from the button's `@click`; GET polls only while an update runs. IMP4-06: 30 s, no request |
| REQ-003, AC-009 | Confirmed | C1 POST in `TRUSTED_NETWORK_OWNER` (phones 403 for GET and POST; no starter request logged). `requestedFrom` = `normalizeClientAddress(socket.remoteAddress)`, logged by the starter (`172.17.0.1`) |
| REQ-011, BEH-007, DS-005 | Confirmed | Version, steps, result, `updateBlocker`, starter message. "Restarting…" for up to 5 min without an answer, then "Not reachable" with 10 s polls until the node answers |
| N-4 (ARCH-REV-005) | Confirmed | `inPlaceUpdate: "error"` → "Version unknown", the C1 `message`, no button, and the normal poll pace while an update runs. A failed GET outside an update → "Not reachable" |
| CR3-N1 | Confirmed | Self-check: "it exited with code N before answering its health check" when the candidate exited; its last 40 output lines go to the starter log only; the pipes are drained (flowing `data` listeners) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | AC-001, AC-010, DEC-018 | User | The user | Bring a node to the desktop's version | Nodes page row button | Normal | DS-001 | Same container, new version; row shows it | IMP4-06 | Supported Normal | Use |
| SCN-001 alt | REQ-008, RU-23 | User | The user | See why an update is not offered or did not happen | Nodes page row | Explicit Edge | GET `updateBlocker` / update `refused`/`failed` | Message, launcher command for NEEDS_NEW_IMAGE | S4-02 screenshot; unit tests | Supported Explicit Edge | Use |
| AC-009 | REQ-003 | User | Phone | Attempt an owner action | C1 GET/POST with a phone credential | Explicit Edge | route policy | 403 | IMP4-06 | Supported Explicit Edge | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Trigger | Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CC-01 | Extra C1 POST answers: 409 `IN_PLACE_UPDATE_UNAVAILABLE`, 502, 400; starter 202/409/400 relayed as they are | C1 frozen (additive rule) | — | A new optional code and statuses; the desktop treats every non-202 as a refusal and shows the `message` (unknown code → message, as the frozen rule requires) | `node-update-routes.ts`; store `requestUpdate` | Reject (as a defect) | — | Confirmed |
| CC-02 | Which results the row shows | DS-005; REQ-011 | — | "Updated to" only for an update this window followed. A refused or failed update shows when followed, or when it targeted this app's version, so the user learns why the offered update did not happen. A refusal of this window's own click shows first | `NodeServerUpdate.vue` `notice` | Reject (as a defect) | — | Confirmed: avoids stale success lines on other windows, keeps the reason for the offered version |
| CC-03 | Step texts: `checking`/`downloading`/`preparing` each their own; `restarting`/`confirming`/`rollingBack` → "Restarting…"; unknown → "Updating to <version>…" | Frozen step names (CRR-005 CC-02); design row texts | — | Matches the design's four texts; an unknown future step still reads sensibly | `STEP_KEYS` | Reject (as a defect) | — | Confirmed |
| CC-04 | During confirm, the row shows the trial's version ("Server 1.5.11-beta.6 · Restarting…") | C2 status truth (CRR-005 CC-05) | — | The progress text says the update is not finished; the result follows | screenshots S4-03 | Reject (as a defect) | — | Confirmed |
| CC-05 | NEEDS_NEW_IMAGE copy command built from code + target version | AC-005; design row state | — | Same command the starter's message names (`upgrade --all --tag <version>`); not parsed from free text | `commandFor` | Reject (as a defect) | — | Confirmed |
| CC-06 | Q-1: no confirmation before the update, while `NodeRow.vue` says "every button that changes another node opens the confirmation first (REQ-706)" | Approved basis: this ticket's SCN-001 ("Click → progress") and DEC-018 versus one-nodes-tab REQ-706 | — | REQ-706 (`tickets/done/one-nodes-tab/requirements-doc.md:98`) is about the connection-details row's fixing buttons (Turn on there, Register this node there, Try again, Turn on). There, "the confirmation" is the collaboration dialog. It does not govern a button from another ticket. This ticket's approved scenario goes from the click straight to progress | REQ-706 text; `NodeRow.vue:189` | Reject as a conflict. Recorded as an optional product refinement (CR4-N1) | — | The implementation follows the approved basis. Whether a node restart should ask first is a product choice the Solution Designer may raise with the user; it does not block |
| CC-07 | A remote node on a server without C1 (a release before step 2) shows "Not reachable" under a connected row | Rule 9; ARCH-REV-005 N-4 | Desktop at step 4, node on an old release | The answer is a 404 JSON, not a status, so the row shows "Not reachable". This is the decided generic state, with no special handling for old nodes (rule 9) | store `isStatus`; N-4 | Reject: decided by design review | — | — |
| CC-08 | A store GET answer arriving after a newer one can overwrite it | DS-005 polling | Overlapping requests during an update | The poll timer set by the newer answer still fires, so the row corrects itself on the next poll (≤ 2 s) | store `refresh` | Reject: transient, self-correcting | — | — |
| CC-09 | The copy button shows "Copied" when `navigator.clipboard` is absent | — | Browser without the clipboard API | The desktop (Electron) has it; the button only appears for a NEEDS_NEW_IMAGE result | `copy()` | Reject: not reachable in the supported desktop | — | — |
| CC-10 | Node requests use plain `fetch` to the node's base URL | Capability reuse | — | Remote nodes are reached without credentials on the trusted network; `normalizeNodeBaseUrl` reused; no node HTTP client exists for REST status | grep of stores | Reject (as a defect) | — | Confirmed |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Design health preserved | Pass | Server stays a thin relay; the desktop owns presentation only | — |
| Matches behavior-defining artifacts | Pass | DEC-018 texts, row states, DS-005 timings (2 s, 5 min, 10 s), N-4 | — |
| Data-flow spine clarity | Pass | Row → store → C1 → C2 → `UpdateService`; one return spine by polling | — |
| Ownership boundaries | Pass | Store owns asking, requesting and polling; the component owns presentation; the target comes only from `appUpdateStore.currentVersion` (the one owner) | — |
| Off-spine concerns | Pass | Launcher guide card command separate | — |
| Capability reuse | Pass | `normalizeNodeBaseUrl`, `nodeListStore.reachedAddressOf`, `normalizeClientAddress`, the route class | — |
| Reusable owned structures | Pass | `NodeServerStatus` and `NodeUpdateState` mirror C1 in one place | — |
| Shared-structure tightness | Pass | The entry holds only `address`, `status`, `connection`, `followed`, `requesting` and `refusal` | — |
| Repeated coordination | Pass | — | — |
| Empty indirection | Pass | — | — |
| SoC / file responsibility | Pass | Store 176 lines, component 123 | — |
| Dependency direction | Pass | The desktop calls C1 only, never the socket or GitHub (design rule) | — |
| Authoritative Boundary Rule | Pass | The component goes through the store; the server through `StarterClient` | — |
| File placement | Pass | `stores/`, `components/settings/nodes/` | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | C1 POST `{ version }` exact version only; explicit answers | — |
| Naming / one vocabulary | Pass | "Update to <version>" for in-place; the guide card says `update` versus `upgrade` | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed | Pass | — | — |
| Tests clear and requirement-aligned | Pass | Store spec: no POST without a click, polling, restart grace, unreachable, N-4. Component spec: each row state. Server: POST answers and route class. Starter: the self-check exit message | — |
| Fixtures coherent | Pass | — | — |
| No stale tests | Pass | `NodeRow.spec.ts` adjusted for the new child | — |
| API/E2E readiness | Pass | Real-app proof scripts kept (`IMP4-proof-drive.mjs`, `-guide.mjs`) | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `stores/nodeServerUpdateStore.ts` | new | 176 | Pass | Pass | Pass | Pass | — |
| `components/settings/nodes/NodeServerUpdate.vue` | new | 123 | Pass | Pass | Pass | Pass | — |
| `components/settings/nodes/NodeRow.vue` | 223+ | +6 | Pass | Pass | Pass | Pass | — |
| `src/node-update/node-update-routes.ts` | 38 | 66 | Pass | Pass | Pass | Pass | — |
| `starter/self-check.mjs` | 60 | about 85 | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Old nodes get the generic state (rule 9, N-4); C1 additions are optional fields and codes under the DEC-007 rule |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision | Pass | No stored data in the desktop |
| No dual paths | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- `Yes`, partly done: the Docker guide card lists `update --all`. The desktop update behaviour may deserve a user-docs line (`autobyteus-web` docs for the Nodes page); for delivery's docs sync.

## Additional Material Premise Validation

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10`

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001 and DS-005 visible in one store | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One target owner, one request site, thin relay | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | C1 POST explicit; additive codes | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Store and component split by concern | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Tight entry and status types | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Texts follow DEC-018; comments explain the reasons | — | — |
| 7 | API/E2E Readiness | 9.3 | Real app proven on the main path | zh-CN render, "Downloading…" and the long-down path only unit-tested | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | AC-001, AC-009, AC-010 proven in the real app | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Generic state for old nodes, no special path | — | — |
| 10 | Cleanup Completeness | 9.5 | CR3-N1 closed | — | — |

## Findings

No blocking findings.

Non-blocking note:

- **CR4-N1** (CC-06, product refinement for the Solution Designer): Q-1 is not a conflict with an approved rule. REQ-706 covers the connection-details fixing buttons, and this ticket's SCN-001 goes from the click straight to progress, as implemented. Whether "Update to <version>", which restarts the node and loses its mid-turn runs until step 5, should ask for a confirmation first is an optional product choice. If the user wants it, it is a small addition to `NodeServerUpdate.vue`. No action is required for this review.

Assumptions the implementation asked about, all confirmed:
- the extra C1 POST answers (CC-01);
- which results the row shows (CC-02);
- the step-text mapping (CC-03);
- the trial version during confirm (CC-04);
- the copy command built from the code and the version (CC-05).

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E engineer (primary); implementation engineer informed.

## Residual Risks

- zh-CN rendering, "Downloading…", and the Restarting… → Not reachable → recovered path in the real app are unit-tested only.
- Desktops on step 4 see "Not reachable" under nodes on releases before step 2 (decided, N-4).
- Mid-turn runs are lost on update until step 5 (PRQ-002).
- Production key and GitHub source: first release only.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`; Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: suggested coverage, on test-owned nodes only, never `autobyteus-server-0/1/2`:
  - the real desktop app: a failed update with a rollback (the row shows the reason, the button stays);
  - a NEEDS_NEW_IMAGE refusal with the copy command;
  - a slow source showing "Downloading…";
  - a long restart showing Restarting… → Not reachable → recovered;
  - an update started from the host while the row is shown;
  - a zh-CN render;
  - a node on a pre-starter image (generic state).
