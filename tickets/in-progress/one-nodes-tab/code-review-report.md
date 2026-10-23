# Code Review Report — one-nodes-tab

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (read where the design cites it)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001 … SR-007)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007, Ready)
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` (TR-701…715, State Behavior); `evidence/implementation/IMP-08-rendered-check.md` and its screenshots
- Relevant Solution Revision IDs: `SR-006`, `SR-007`
- Design Review Report Reviewed As Context: `design-review-report.md` (Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer, IR-001 ready for source review (Large / High)
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Failure-origin fields: `N/A`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Three subsystems change (server remote-collaboration and its GraphQL contract, the desktop registry's persisted shape, the web Nodes page with a new two-node write coordination). No correction.

## Review Scope

- Changed implementation and behavior reviewed: branch `codex/one-nodes-tab` against `origin/personal` `ca1f09e52a` (commits `d62efda0ff`, `5fc0ad389a`, `086c84ded3`).
- Files / areas reviewed:
  - server `remote-collaboration` (`transport-failure-reason`, `peer-client`, `peer-address-resolver`, `peer-directory`, `remote-node-discovery`, `peer-refusal`, `remote-collaboration-settings-error`, `remote-collaboration-services`), `server-addressing/runs-in-container.ts`, the GraphQL resolver;
  - Electron `nodeRegistryStore.ts`, `nodeRegistryTypes.ts`, `electronApplication.ts`, `types/node.ts`;
  - web `stores/{nodeListStore,nodeRowStatus,nodeChangeDialogStore,nodeStore,remoteCollaborationStore,remoteCollaborationOffersStore}.ts`, `services/nodeCollaboration/*`, `utils/{nodeIdentityProbe,nodeSettingsError,nodeConnectionErrorText}.ts`, `components/settings/nodes/*.vue`, `NodeManager.vue`;
  - the key specs (connector, list store, row status, resolver), removals, commit contents.
- Explicit exclusions: localization copy wording beyond A3 (guards passed, IMP-07); pixel fidelity against every VIS image (IMP-08 covers rendering); Electron shell, Docker node and E2E (API/E2E's stage). Recorded checks were not rerun (none of the code they exercise changed after they ran).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: one list joined by node ID without merging stores (DEC-701); one confirmed plan carried out by the window on both nodes (DEC-702/704); switch-off strict (DEC-709 b); named causes and Docker loopback hint (REQ-707/708).
- Design-spec behavior map verified against the implementation: yes, DS-001 … DS-005 traced through the code (below).
- Design review report and round confirmed: ARCH-REV-003, Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none blocking. The handoff's A1–A4 are within the approved requirements (see § Implementation Assumptions).

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-703 | Confirmed | `nodeListStore.rows` groups desktop entries by `serverInstanceId` (first-created first), joins `remoteCollaborationStore.peers`, adds peer-only rows, excludes this node; `ask` → `learn` → `nodeStore.identifyNode` → re-key → `askAgain`. |
| BEH-701/702 | Confirmed | `AddNodePanel` → `nodeListStore.addNode`: address check against every row (AR-008), 1.5 s probe race (TR-702), node-ID check, `nodeStore.addRemoteNode` without `openNodeWindow`, confirmation only when reachable and the switch is on. |
| BEH-704 | Confirmed | `nodeChangeDialogStore.request` → `connector.plan` (facts from both nodes, naming rule) → `resolveAhead` → `run` with `STOP_ON_FAILURE`; this node via its stores, the other node via `nodeCollaborationApi`, the list via `nodeStore`. |
| BEH-705 | Confirmed | `transportFailureReason`; `PeerClient.fetchServerInstanceId` → classified `PEER_UNREACHABLE`; `PeerAddressResolver` (order, early match, attempts, `loopbackInContainer`); `PeerDirectory.probe` adds `loopbackInContainer`; extensions spread in `settingsError`; web `failureText`/`addressHintOf`. |
| BEH-706 | Confirmed | `NodeManager.vue` tabs without Remote Collaboration; `ThisNodeCard.vue` switch and rules. |
| BEH-707 | Confirmed | `ask` → `offers.ask` only while the switch is on; tokens per row; offers under the bar via the 267 disclosure. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-701 | REQ-702…704, AC-703 | User | Owner | Add a node | Add form | Normal | DS-002 | One row; confirmation when on and reachable | requirements | Supported Normal | Use |
| SCN-702 | REQ-705/706, AC-704…706 | User | Owner | Collaborate both ways; finish; stop | Row switch, fixing buttons | Normal | DS-003, DS-004 | Both registered; partial result visible | requirements | Supported Normal | Use |
| SCN-703 | REQ-702/711, AC-702 | User | Owner | See existing nodes once | Tab opens | Normal | DS-001 | One row per node | requirements, measured data | Supported Normal | Use |
| SCN-704 | REQ-707/708, AC-707 | User | Owner | Fix a wrong address | Change address, plan result | Normal | DS-003 error path, DS-005 | Cause named, Docker hint | requirements | Supported Normal | Use |
| SCN-706 | REQ-710, AC-708/709 | User | Owner | Rename / remove | Row actions | Normal | connector `rename`/`remove` | One name / gone | requirements | Supported Normal | Use |
| CT-ENG | Design § Ownership Map, § Dependency Rules, Principles 3/7/9 | Contract | — | Engineering contract | — | — | — | — | design-spec, design-principles | Governing contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `nodeListStore` and `nodeChangeDialogStore` depend on each other; rename and change address (not dialogs) run through the dialog store; the per-row partial result lives in the dialog store, not `nodeListStore` as the design says | CT-ENG (design § Product Package Mapping TR-704/705/712: "partial result kept per row in `nodeListStore`"; § Dependency Rules; Principles 3, 9) | — (structural) | Every SCN-702/704/706 flow crosses both stores in both directions (6 calls list → dialog, 5 dialog → list) | `nodeListStore.ts:97,178,219,251,259`; `nodeChangeDialogStore.ts:50,69,74,86-87` | Promote | This ticket | CR-003 |
| C-02 | `remoteCollaborationStore.loaded` and `loadError` are written but no product code reads them | CT-ENG (Principle 7) | — | Dead state introduced by this change; only its spec reads `loadError` | grep: no reader outside `remoteCollaborationStore.spec.ts` | Promote | This ticket | CR-001 |
| C-03 | After A1, the `changeAddress` plan's `resolveHere` probes the one typed address, then `changeAddressHere` (`PeerDirectory.changeAddress`) probes it again with the same checks and the same error details | SCN-704; DESIGN.md rule 5; Principle 13 | Owner saves Change address | Two identical sequential identity probes per save; the second carries everything the first does (`PEER_IDENTITY_MISMATCH`, `reason`, `address`, `loopbackInContainer`) | `nodeCollaborationConnector.ts:139-150`; `peer-directory.ts:74-87,120-130`; `nodeConnectionErrorText.ts:53-60` | Promote | This ticket | CR-002 (Low) |
| C-04 | Commit `d62efda0ff`, described and handed off as a test-only baseline fix, also contains this ticket's removals (9 files, −793 lines: `RemoteCollaborationCard.vue` + spec, `RemoteCollaborationPeersSection.vue`, `CurrentWindowNodeCard.vue`, `nodeCapabilityProbe.ts` + spec, `nodeHostValidation.ts` + spec); `5fc0ad389a` does not | CT-ENG (packaging; handoff states the baseline fix is separate, TESTING.md rule 9) | — | Reverting or isolating the baseline fix would carry the ticket's deletions; the implementation commit alone does not build its own removal plan | `git show d62efda0ff --stat`; branch not pushed | Promote | This ticket | CR-004 (Low, packaging) |
| C-05 | Peer-only row the window cannot reach: "it → this node" detail shows the window probe's cause with an empty host (`inOf` uses `row.windowAddress`, the probe used `peer.baseUrl`) | Needs a peer of this node with no desktop entry at an address this window can't reach | Not established: in the user's setups every such peer has a desktop entry (joined by ID) | — | `nodeRowStatus.ts:84-87` | Reject | — | Not a supported normal path; recorded only |
| C-06 | Slow node (>1.5 s) is added without a confirmation even with the switch on | TR-702 (≤ 1.5 s) | — | As specified | ui-ux-spec TR-702 | Reject | — | Spec'd behavior |
| C-07 | Window reads the other node's capability/peers while this node's switch is off | TR-701; design § Window Probes While The Switch Is Off; DS-004 | — | Approved | design | Reject | — | Approved behavior |
| C-08 | `resolveAddress` errors on the bound client reach `uiErrorStore` | — | — | Debug panel only (`showDebugErrorPanel`); pre-existing for the old peer form | `plugins/30.apollo.client.ts`, `app.vue:11` | Reject | — | No product consequence |

## Implementation Assumptions (handoff A1–A8)

- **A1 (Change address checks the typed address alone): accepted.** With the window address (or candidates) after it, AC-707's own Given (Change address `http://127.0.0.1:<port>` in a Docker window → the hint), VIS-026 and TR-711's "A different node answers there…" could not happen. It follows the approved requirements; the design § Run Rules row is what needs to read differently. It makes the `resolveHere` step redundant (CR-002). Design text to reconcile at docs sync: § Run Rules `changeAddress` row.
- **A2 (naming drops `scheme://`): accepted.** Matches the design's own examples (`localhost-8003`).
- **A3 (four copy keys for unscripted causes): accepted.** REQ-707 requires a cause for each; en and zh-CN both present; guards pass.
- **A4 (window probe reports `refused` only on loopback): accepted.** Browsers expose no cause; server-side requests carry full causes.
- **A5–A8:** A5's split is where CR-003 sits; A6–A8 accepted.

None of these needs the Solution Designer before API/E2E.

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | `NodeManager.vue` 343 → 112 effective lines; one projection owner, one coordination owner | — |
| Matches approved supplemental artifacts | Pass | TR-701/702/703/711/713 traced; IMP-08 | — |
| Data-flow spine inventory clarity | Pass | DS-001…DS-005 map onto `nodeListStore.open/ask/addNode`, `connector.plan/run`, `PeerAddressResolver.firstMatch` | — |
| Ownership boundary preservation | Fail | C-01: the per-row partial result sits in `nodeChangeDialogStore`, not `nodeListStore` (design § Product Package Mapping); rename and change address run through the dialog store | CR-003 |
| Off-spine concern clarity | Pass | probe, error text, classifier, container check each serve one owner | — |
| Existing capability reuse | Pass | `/rest/remote-access/status`, `ServerAddressCandidateService`, offers store, 267 disclosure reused | — |
| Reusable owned structures | Pass | `NodeSettingsFailure` shared by the store and the API; plan types in `nodeChangePlan.ts` | — |
| Shared-structure tightness | Pass | `NodeRow` keeps `windowAddress` and `peer.baseUrl` apart; `PeerRefusal` extends the port type on the remote-collaboration side | — |
| Repeated coordination ownership | Pass | one connector for all plan kinds; one run rule table | — |
| Empty indirection | Pass with note | `nodeCollaborationApi` is a typed edge, not empty. The `changeAddress` `resolveHere` step duplicates the next step (CR-002) | CR-002 |
| Separation of concerns / file responsibility | Pass | `nodeRowStatus.ts` pure derivation; components small | — |
| Ownership-driven dependency (no unjustified cycles) | Fail | C-01: `nodeListStore` ↔ `nodeChangeDialogStore` cycle | CR-003 |
| Authoritative Boundary Rule | Pass | components never call GraphQL; resolver never calls `PeerClient`; this node never written through `nodeCollaborationApi` | — |
| File placement | Pass | `components/settings/nodes/`, `services/nodeCollaboration/` as designed | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `addPeerNode({nodeId,name,baseUrl})`, `resolvePeerAddress(nodeId, baseUrls)`, `identify {nodeId, serverInstanceId}` explicit | — |
| Naming quality | Pass | `serverInstanceId` vs desktop `nodeId` kept distinct | — |
| No unjustified duplication | Pass with note | CR-002 | CR-002 |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Fail | C-02: `loaded`, `loadError` | CR-001 |
| Test scenarios clear and requirement-aligned | Pass | connector, list store, row status and resolver specs are named by REQ/AC/TR | — |
| Test fixtures/structure coherent | Pass | — | — |
| No stale or compatibility-only tests | Pass | removed specs go with their components; `loadError` assertion goes with CR-001 | — |
| API/E2E readiness | Pass with note | ready once the local fixes land; commit packaging (CR-004) | CR-004 |

## Source File Size And Structure Audit

All changed implementation-source files are under 500 effective lines. Files over the 220 delta are new and single-purpose.

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stores/nodeListStore.ts` | 0 | 239 | Pass | Over; one owner (rows, asks, add, open) | Fail (C-01) | Pass | Local Fix | CR-003 |
| `services/nodeCollaboration/nodeCollaborationConnector.ts` | 0 | 223 | Pass | Over; one owner (plan + run) | Pass | Pass | — | CR-002 touches `planChangeAddress` |
| `stores/nodeChangeDialogStore.ts` | 0 | 123 | Pass | Pass | Fail (C-01) | Pass | Local Fix | CR-003 |
| `components/settings/nodes/NodeRow.vue` | 0 | 209 | Pass | Pass | Pass | Pass | — | — |
| `electron/application/electronApplication.ts` | 395 | 405 | Pass | Pass | Pass | Pass | — | — |
| `localization/messages/{en,zh-CN}/settings.ts` | 495 | 482 | Pass (shrank) | Pass | Pass | Pass | — | — |
| `stores/nodeStore.ts` | 282 | 299 | Pass | Pass | Pass | Pass | — | — |
| `stores/remoteCollaborationStore.ts` | 90 | 84 | Pass | Pass | Pass | Pass | Local Fix | CR-001 |
| server `peer-directory.ts` | 101 | 140 | Pass | Pass | Pass | Pass | — | — |
| server `peer-address-resolver.ts` | 0 | 97 | Pass | Pass | Pass | Pass | — | — |
| other changed sources | — | ≤ 180 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | no tab alias, no old `addPeerNode` input |
| No legacy old-behavior retention | Pass | old form, chip, probe and peer section removed |
| Dead code removed in touched files | Fail | CR-001 |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`: `normalizeLoadedNode` projects a valid `serverInstanceId`, drops the probe fields; `identify` no-op writes nothing |
| No dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics match design | Pass | no migration |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `remoteCollaborationStore` state `loaded`, `loadError` | DeadCode | Written in `load()`; no reader outside `stores/__tests__/remoteCollaborationStore.spec.ts` | Introduced by this change, read only by its own test (Principle 7) | Remove both and the spec assertions, or show a load failure where the approved package asks for one (it has none) |

## Docs-Impact Verdict

- Docs impact: `Yes` (done): web `docs/settings.md`, server `docs/modules/remote_collaboration.md`.
- Design-text reconciliation at docs sync: design-spec § Run Rules `changeAddress` row (A1, CR-002).

## Additional Material Premise Validation

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: `8.9/10` (`89/100`); a simple average, not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.2 | DS-001…005 readable in code; tokens per row; run rules in one table | The DS-003 flow hops between two stores | CR-003 |
| 2 | Ownership Clarity and Boundary Encapsulation | 8.3 | Server boundaries and AR-005 write paths are clean | Partial result owned by the dialog store against the design; rename/change address via the "dialog" store; store cycle | CR-003 |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit identities, typed error extensions, `identify` | — | — |
| 4 | Separation of Concerns and File Placement | 8.8 | Small, single-purpose files; pure row derivation | Dialog store mixes dialog state with connector wiring for non-dialog operations | CR-003 |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | `NodeRow`, `NodeSettingsFailure`, `PeerRefusal` tight | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Domain names throughout | Dense one-liners in the connector and row status | — |
| 7 | API/E2E Readiness | 8.8 | Handoff's coverage hints precise; E2E input updated | Commit packaging (CR-004) | CR-004 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | Traced paths match REQ/AC; A1 fixes a real AC-707 gap | Redundant probe in Change address | CR-002 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut | — | — |
| 10 | Cleanup Completeness | 8.6 | Removal plan done | Dead `loaded`/`loadError` | CR-001 |

## Findings

### CR-003 — `nodeListStore` ↔ `nodeChangeDialogStore` cycle; partial result not where the design puts it (Medium, Local Fix)

- Basis: design § Product Package Mapping (TR-704/705/712: "partial result kept per row in `nodeListStore` until the next ask"); § Ownership Map (connector stateless; `nodeListStore` owns rows and derived warnings); § Dependency Rules (list store does not depend on a dialog); Principles 3 and 9.
- Evidence: `nodeListStore` → dialog store: `views` reads `unfinishedStepOf` (l.97), `close` → `cancel` (l.178), `addNode` → `request` (l.219), `renameNode` / `changeAddress` → `runSilently` (l.251, 259). Dialog store → list store: `targetOf` (l.50), `request` → `askAgain` (l.69, 74), `finishRun` → `askAll`/`askAgain` (l.86-87). The connector instance lives in the dialog store, so rename and change address, which have no dialog, run through it.
- Consequence: one flow's state and triggers are split across two stores that call each other. Neither is the authoritative owner of the row's change state. The design's placement of the partial result is not followed.
- Proportionate response (one direction: dialog → list):
  - Put the connector's wiring in its own file under `services/nodeCollaboration/` (it stays stateless).
  - Let `nodeListStore` own rename and change address through the connector, and keep the per-row unfinished step (set by the dialog store after a run).
  - Return `{ ok: true, key, confirm: boolean }` from `addNode` and let `AddNodePanel` open the confirmation.
  - Let `NodeList` cancel the dialog on unmount.
- Tests: update the list-store and dialog specs; no behavior change.

### CR-001 — Dead store state `loaded` and `loadError` (Low, Local Fix)

- Basis: Principle 7 (code only its own tests read).
- Evidence: `stores/remoteCollaborationStore.ts:28-40`; only `remoteCollaborationStore.spec.ts:26,29` reads `loadError`; nothing reads `loaded`.
- Response: remove both and the spec assertions. The approved package has no "peers could not be loaded" state, so there is no use to add.

### CR-002 — Change address probes the same address twice (Low, Local Fix)

- Basis: SCN-704 (TR-711, AC-707); DESIGN.md rule 5; Principle 13. A1 is accepted. Once only the typed address is resolved, `resolveHere` does exactly what `PeerDirectory.changeAddress` does next.
- Evidence: `planChangeAddress` → `[resolveHere(firstAddress), changeAddressHere]` (`nodeCollaborationConnector.ts:139-150`). `PeerDirectory.changeAddress` probes the same address, refuses a different node with `PEER_IDENTITY_MISMATCH` + `address`, and an unreachable one with `reason`, `address`, `loopbackInContainer` (`peer-directory.ts:74-87,120-130`). `failureText` words `PEER_IDENTITY_MISMATCH` as `address.different`, and `addressHintOf` needs only `loopbackInContainer` + `address`.
- Response: the `changeAddress` plan is `[changeAddressHere]` with the typed address. Update the connector spec. The design § Run Rules row is reconciled at docs sync (with A1).

### CR-004 — Baseline-fix commit carries this ticket's removals (Low, packaging, Local Fix)

- Basis: the handoff and revision record present `d62efda0ff` as a separate, test-only baseline fix (TESTING.md rule 9).
- Evidence: `git show d62efda0ff --stat`: the test change plus 9 deleted ticket files (`RemoteCollaborationCard.vue` + spec, `RemoteCollaborationPeersSection.vue`, `CurrentWindowNodeCard.vue`, `nodeCapabilityProbe.ts` + spec, `nodeHostValidation.ts` + spec). `5fc0ad389a` contains none of them. The branch is not pushed.
- Response: split the history so `d62efda0ff`'s replacement holds only `project-task-index-status.test.ts`, and the deletions sit with the implementation. Update the handoff's commit IDs.

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Local Fix` (implementation-owned): CR-001, CR-002, CR-003, CR-004. No upstream requirement or design revision is needed. CR-003 brings the code back to the design's placement; CR-002 follows from the accepted A1.

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` (source review identifies an implementation-owned Local Fix / packaging defect). After the fixes: source review again (Targeted Delta Review), then API/E2E.

## Residual Risks

- Not exercised before API/E2E: the Electron shell (Open, IPC `identify`), a node in Docker (AC-704/707 end to end), the agents delegating after connect, and the server integration/E2E suites (handoff § Not run).
- RSK-701/702/703 as accepted in the design.
- Design text: § Run Rules `changeAddress` row (A1/CR-002) to reconcile at docs sync.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 8.9/10. Below 9.0: Ownership 8.3, Separation of Concerns 8.8, API/E2E Readiness 8.8, Cleanup 8.6.
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: the server side, the registry and the behavior paths are sound. A1–A4 are accepted, and none needs the Solution Designer. The four findings are bounded local fixes.
