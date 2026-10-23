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
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`, `IR-003`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: `4` (Implementation Review, Targeted Delta Review of CR-005; round 3 was the API/E2E failure-origin review)
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): the delta `780e846d4a..23f3feb193` touches only the CRR-001 finding files: `nodeListStore`, `nodeChangeDialogStore`, the connector, a new connector-wiring file, `remoteCollaborationStore`, `AddNodePanel`, `NodeList`, `NodeConnectionDetails`, `nodeChangePlan`, and their specs. No server, Electron, shared interface or data-shape change. History rebuilt for CR-004: `e16d848e0f` has the same tree as `5fc0ad389a`.
- Trigger: implementation engineer, IR-002 (CRR-001 local fixes)
- Prior Review Round Reviewed: `1` (CRR-001, Fail)
- Latest Authoritative Round: `4`
- Failure-origin fields (round 3):
  - Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
  - Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
  - API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (`API-REV-001`)
  - Failing Scenario IDs: API-07 / NP-07 (SCN-702 naming race; REQ-706; design § Naming Rule 4; VIS-015)
  - Exact Failing Command: `pnpm -C autobyteus-web exec node tests/e2e/remote-nodes-page-probe.mjs --output-dir=<evidence>/API-07-remote-nodes-page-run4` (source `23f3feb193`)
  - Failure Evidence: `evidence/api-e2e/API-07-remote-nodes-page-run4/remote-nodes-page-probe.json` (`cases.NP-07.rowLine`), `NP-07-mu-row-try-again.png`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. Three subsystems change (server remote-collaboration and its GraphQL contract, the desktop registry's persisted shape, the web Nodes page with a new two-node write coordination). No correction.

## Review Scope

- Changed implementation and behavior reviewed: round 1 covered branch `codex/one-nodes-tab` against `origin/personal` `ca1f09e52a`. Round 2 covers the rebuilt history `9457972953` (baseline fix), `e16d848e0f` (implementation), `780e846d4a`, `23f3feb193` (CRR-001 fixes), `93bbf71965` (IR-002 docs).
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
| Ownership boundary preservation | Pass (round 2) | `nodeListStore` holds the unfinished step per row (`setUnfinishedStep`/`unfinishedStepOf`) and runs rename and change address through the connector; the dialog store holds only the confirmation's plan | — (CR-003 resolved) |
| Off-spine concern clarity | Pass | probe, error text, classifier, container check each serve one owner | — |
| Existing capability reuse | Pass | `/rest/remote-access/status`, `ServerAddressCandidateService`, offers store, 267 disclosure reused | — |
| Reusable owned structures | Pass | `NodeSettingsFailure` shared by the store and the API; plan types in `nodeChangePlan.ts` | — |
| Shared-structure tightness | Pass | `NodeRow` keeps `windowAddress` and `peer.baseUrl` apart; `PeerRefusal` extends the port type on the remote-collaboration side | — |
| Repeated coordination ownership | Pass | one connector for all plan kinds; one run rule table | — |
| Empty indirection | Pass | `nodeCollaborationApi` is a typed edge; `changeAddress` is one step (`[changeAddressHere(address)]`) | — (CR-002 resolved) |
| Separation of concerns / file responsibility | Pass | `nodeRowStatus.ts` pure derivation; components small | — |
| Ownership-driven dependency (no unjustified cycles) | Pass (round 2) | No store imports `nodeChangeDialogStore`; it depends on `nodeListStore` one way. The connector's wiring sits in `services/nodeCollaboration/windowNodeCollaborationConnector.ts` and resolves stores lazily | — (CR-003 resolved) |
| Authoritative Boundary Rule | Pass | components never call GraphQL; resolver never calls `PeerClient`; this node never written through `nodeCollaborationApi` | — |
| File placement | Pass | `components/settings/nodes/`, `services/nodeCollaboration/` as designed | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `addPeerNode({nodeId,name,baseUrl})`, `resolvePeerAddress(nodeId, baseUrls)`, `identify {nodeId, serverInstanceId}` explicit | — |
| Naming quality | Pass | `serverInstanceId` vs desktop `nodeId` kept distinct | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass (round 2) | `loaded`/`loadError` removed; `load()` throws and keeps the last list; `open` tolerates a failure; the connector's `loadPeers` failure goes to the existing catch paths | — (CR-001 resolved) |
| Test scenarios clear and requirement-aligned | Pass | connector, list store, row status and resolver specs are named by REQ/AC/TR | — |
| Test fixtures/structure coherent | Pass | — | — |
| No stale or compatibility-only tests | Pass | removed specs go with their components; the `loadError` assertions are gone; new `nodeChangeDialogStore.spec.ts`, `AddNodePanel.spec.ts` | — |
| API/E2E readiness | Pass | History split: `9457972953` touches only `project-task-index-status.test.ts`; `e16d848e0f` carries the removals (same tree as `5fc0ad389a`); IMP-09 web 4733 passed, IMP-10 guards pass, IMP-11 rendered recheck | — (CR-004 resolved) |

## Source File Size And Structure Audit

All changed implementation-source files are under 500 effective lines. Files over the 220 delta are new and single-purpose.

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stores/nodeListStore.ts` | 0 | 273 (round 2) | Pass | Over; one owner (rows, asks, add, open, the row's changes without confirmation, the unfinished step) | Pass | Pass | — | — |
| `services/nodeCollaboration/nodeCollaborationConnector.ts` | 0 | 224 | Pass | Over; one owner (plan + run) | Pass | Pass | — | — |
| `services/nodeCollaboration/windowNodeCollaborationConnector.ts` (new, round 2) | 0 | 36 | Pass | Pass | Pass (the window's wiring of the connector) | Pass | — | — |
| `stores/nodeChangeDialogStore.ts` | 0 | 73 (round 2) | Pass | Pass | Pass | Pass | — | — |
| `components/settings/nodes/NodeRow.vue` | 0 | 209 | Pass | Pass | Pass | Pass | — | — |
| `electron/application/electronApplication.ts` | 395 | 405 | Pass | Pass | Pass | Pass | — | — |
| `localization/messages/{en,zh-CN}/settings.ts` | 495 | 482 | Pass (shrank) | Pass | Pass | Pass | — | — |
| `stores/nodeStore.ts` | 282 | 299 | Pass | Pass | Pass | Pass | — | — |
| `stores/remoteCollaborationStore.ts` | 90 | 76 | Pass | Pass | Pass | Pass | — | — |
| server `peer-directory.ts` | 101 | 140 | Pass | Pass | Pass | Pass | — | — |
| server `peer-address-resolver.ts` | 0 | 97 | Pass | Pass | Pass | Pass | — | — |
| other changed sources | — | ≤ 180 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | no tab alias, no old `addPeerNode` input |
| No legacy old-behavior retention | Pass | old form, chip, probe and peer section removed |
| Dead code removed in touched files | Pass | CR-001 resolved in round 2 |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`: `normalizeLoadedNode` projects a valid `serverInstanceId`, drops the probe fields; `identify` no-op writes nothing |
| No dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics match design | Pass | no migration |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| None remaining (round 2). `loaded`/`loadError` were removed (CR-001). | — | — | — | — |

## Docs-Impact Verdict

- Docs impact: `Yes` (done): web `docs/settings.md`, server `docs/modules/remote_collaboration.md`.
- Design-text reconciliation at docs sync: design-spec § Run Rules `changeAddress` row (A1, CR-002).

## Additional Material Premise Validation

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: `9.3/10` (`93/100`) in round 2 (8.9 in round 1); a simple average, not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 | DS-001…005 readable in code; tokens per row; run rules in one table; DS-003 now flows dialog → list one way | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.2 | The list store owns the rows, their changes without confirmation and the unfinished step (as the design says); the dialog store owns only the confirmation; the server and AR-005 write paths are clean | The connector's wiring is a module singleton that resolves stores lazily, which is acceptable for a stateless connector | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit identities, typed error extensions, `identify`; `addNode` returns `confirm` | — | — |
| 4 | Separation of Concerns and File Placement | 9.2 | Small, single-purpose files; wiring in `services/nodeCollaboration/` | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | `NodeRow`, `NodeSettingsFailure`, `PeerRefusal` tight | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Domain names throughout | Dense one-liners in the connector and row status | Optional |
| 7 | API/E2E Readiness | 9.3 | Clean commit split; coverage hints precise; E2E input updated; IMP-09/10/11 green | Electron/Docker/E2E not yet exercised (the next stage's job) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | Traced paths match REQ/AC; Change address is one server-checked step with the hint's details | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.3 | Removal plan done; dead state removed | — | — |

## Findings

Round 2: all four findings are **Resolved** (verification in `code-review-revision-record.md`, CRR-002). Their round-1 text stays below for history.

### CR-003 — `nodeListStore` ↔ `nodeChangeDialogStore` cycle; partial result not where the design puts it (Medium, Local Fix) — Resolved

- Basis: design § Product Package Mapping (TR-704/705/712: "partial result kept per row in `nodeListStore` until the next ask"); § Ownership Map (connector stateless; `nodeListStore` owns rows and derived warnings); § Dependency Rules (list store does not depend on a dialog); Principles 3 and 9.
- Evidence: `nodeListStore` → dialog store: `views` reads `unfinishedStepOf` (l.97), `close` → `cancel` (l.178), `addNode` → `request` (l.219), `renameNode` / `changeAddress` → `runSilently` (l.251, 259). Dialog store → list store: `targetOf` (l.50), `request` → `askAgain` (l.69, 74), `finishRun` → `askAll`/`askAgain` (l.86-87). The connector instance lives in the dialog store, so rename and change address, which have no dialog, run through it.
- Consequence: one flow's state and triggers are split across two stores that call each other. Neither is the authoritative owner of the row's change state. The design's placement of the partial result is not followed.
- Proportionate response (one direction: dialog → list):
  - Put the connector's wiring in its own file under `services/nodeCollaboration/` (it stays stateless).
  - Let `nodeListStore` own rename and change address through the connector, and keep the per-row unfinished step (set by the dialog store after a run).
  - Return `{ ok: true, key, confirm: boolean }` from `addNode` and let `AddNodePanel` open the confirmation.
  - Let `NodeList` cancel the dialog on unmount.
- Tests: update the list-store and dialog specs; no behavior change.

### CR-001 — Dead store state `loaded` and `loadError` (Low, Local Fix) — Resolved

- Basis: Principle 7 (code only its own tests read).
- Evidence: `stores/remoteCollaborationStore.ts:28-40`; only `remoteCollaborationStore.spec.ts:26,29` reads `loadError`; nothing reads `loaded`.
- Response: remove both and the spec assertions. The approved package has no "peers could not be loaded" state, so there is no use to add.

### CR-002 — Change address probes the same address twice (Low, Local Fix) — Resolved

- Basis: SCN-704 (TR-711, AC-707); DESIGN.md rule 5; Principle 13. A1 is accepted. Once only the typed address is resolved, `resolveHere` does exactly what `PeerDirectory.changeAddress` does next.
- Evidence: `planChangeAddress` → `[resolveHere(firstAddress), changeAddressHere]` (`nodeCollaborationConnector.ts:139-150`). `PeerDirectory.changeAddress` probes the same address, refuses a different node with `PEER_IDENTITY_MISMATCH` + `address`, and an unreachable one with `reason`, `address`, `loopbackInContainer` (`peer-directory.ts:74-87,120-130`). `failureText` words `PEER_IDENTITY_MISMATCH` as `address.different`, and `addressHintOf` needs only `loopbackInContainer` + `address`.
- Response: the `changeAddress` plan is `[changeAddressHere]` with the typed address. Update the connector spec. The design § Run Rules row is reconciled at docs sync (with A1).

### CR-004 — Baseline-fix commit carries this ticket's removals (Low, packaging, Local Fix) — Resolved

- Basis: the handoff and revision record present `d62efda0ff` as a separate, test-only baseline fix (TESTING.md rule 9).
- Evidence: `git show d62efda0ff --stat`: the test change plus 9 deleted ticket files (`RemoteCollaborationCard.vue` + spec, `RemoteCollaborationPeersSection.vue`, `CurrentWindowNodeCard.vue`, `nodeCapabilityProbe.ts` + spec, `nodeHostValidation.ts` + spec). `5fc0ad389a` contains none of them. The branch is not pushed.
- Response: split the history so `d62efda0ff`'s replacement holds only `project-task-index-status.test.ts`, and the deletions sit with the implementation. Update the handoff's commit IDs.

## Follow-ups

- Follow-ups this review added: None.

## Classification

- Round 2: none (Pass). Round 1 was a `Local Fix` (implementation-owned) for CR-001…CR-004, now resolved.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review passes). An informational notice goes to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Not exercised before API/E2E: the Electron shell (Open, IPC `identify`), a node in Docker (AC-704/707 end to end), the agents delegating after connect, and the server integration/E2E suites (handoff § Not run).
- RSK-701/702/703 as accepted in the design.
- Design text: § Run Rules `changeAddress` row (A1/CR-002) to reconcile at docs sync.

## Round 3 — API/E2E Failure-Origin Review (NP-07)

- **Approved behavior still holds.** REQ-706 asks for one line with one fixing button for "a step not finished". Design § Naming Rule 4 words a run-time `PEER_NAME_TAKEN` as "<node> already has a node named X". The failing expectation ("mu already has a node named Embedded Node.") is that approved text.
- **Scenario basis.** Supported Explicit Edge Scenario. The design names the name race explicitly (§ Naming Rule 4).
  - Trigger: the owner presses Turn on in the confirmation after the other node gained a peer with the planned name.
  - The probe adds that peer through mu's own settings API, which is a supported owner action on mu.
  - The path is the normal production path: `nodeChangeDialogStore.confirm` → `connector.run` (`registerThere` fails with `PEER_NAME_TAKEN`) → `finishRun` → `nodeListStore.setUnfinishedStep` → `rowViewOf` → `NodeRow` partial line.
- **Origin: implementation defect.** The source is unchanged since review (`git diff 23f3feb193 HEAD` touches no web source).
  - `nodeRowStatus.ts:144` builds the `partial` line with the step's `error` but not its `name`.
  - `NodeRow.vue:172` calls `failureText(t, line.error, { node: name })` without `name`.
  - `failureText` words `PEER_NAME_TAKEN` with `context.name ?? ''` (`nodeConnectionErrorText.ts:67`).
  - The dialog (`errorOf`, `name: line.step.name`) and the details (`NodeConnectionDetails.vue:62`, `name: step.name`) pass the name and are right. That matches the evidence: the dialog and "What happened" text are correct, and only the row line is empty.
- **Not the test.** The probe's expectation is the approved copy, and the setup is a supported action.
- **Review gap: yes.** This was detectable in source review. I read `NodeRow.lineText` and § Naming Rule 4 in round 1, and `failureText`'s dependence on `context.name` was visible there. `NodeRow.spec.ts` covers the partial line only with `PEER_UNREACHABLE`. Affected score: Runtime Correctness 9.2 → 8.8 until fixed.
- **New finding CR-005 (Low, Local Fix, implementation):** the row's "not finished" line for a refused name omits the name.
  - Fix: carry the failed step's `name` with the partial line (for example `name: unfinished.name` on `RowLine`, or the step itself), and pass it to `failureText` in `NodeRow.vue`.
  - Add a `NodeRow.spec.ts` case for VIS-015 with `PEER_NAME_TAKEN`.
- **Rerun after the fix:** source review as a targeted delta, then the web unit suite and API-07. The other API/E2E cases stay valid for this text-only change.
- **Out of scope:** the API/E2E engineer's observation that a container connect to a black hole times out at about 10 s (Node's connect timeout) while the copy says "No answer within 20 seconds". The bound is "at most 20 s" (REQ-712), so this is not a failure. It is not a finding here.

## Round 4 — Targeted Delta Review (CR-005)

- Scope: `git diff 71fd1a5235 02fd7bcd9a`. It touches 4 files and only CR-005's lines: `nodeRowStatus.ts`, `NodeRow.vue` and their two specs. No other source changed.
- CR-005: **Resolved.**
  - `lineOf` puts `stepName: unfinished.name` on the `partial` line (`RowLine.stepName`, documented).
  - `NodeRow.lineText` passes it to `failureText` as `name`. In the race, the step's `name` is the planned, now-taken name, which the approved text needs.
  - New specs: `NodeRow.spec.ts` VIS-015 with `PEER_NAME_TAKEN` (full line and Try again), and `nodeRowStatus.spec.ts` (the line carries `stepName`).
  - IMP-12 web suite: 4736 passed. IMP-13 guards pass.
- Scores: Runtime Correctness back to 9.2. The round-2 scorecard stands (9.3/10, every category ≥ 9.0).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4, Targeted Delta Review)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10; every category is at 9.0 or above.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001…CR-005 resolved. API/E2E reruns the web suite and API-07 (NP-07). The proportional test-code review of `remote-nodes-page-probe.mjs` and `nodes-docker-address-probe.mjs` follows a passing run. Docs sync should still update the design's § Run Rules `changeAddress` row.
