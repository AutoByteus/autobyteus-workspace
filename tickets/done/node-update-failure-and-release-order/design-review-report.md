# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order/tickets/in-progress/node-update-failure-and-release-order/requirements-doc.md` (Approved, SR-001)
- Upstream Investigation Notes: `.../investigation-notes.md`
- Upstream Solution Revision Record: `.../solution-revision-record.md`
- Reviewed Design Spec: `.../design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts Reviewed: None exist (inventory: None); `follow-ups.md` (FU-001) and `handoff-architecture-design-complete.md` read
- Relevant Solution Revision IDs: `SR-001` (requirements basis), `SR-002` (design revision)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer handoff of SR-002 (design-only revision answering ARCH-REV-001; requirements unchanged at SR-001; `Medium` / `High`)
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail — AR-001, AR-002, AR-003)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree at `6225a734a3` (`origin/personal`). Opened: `autobyteus-web/electron/nodeAutoUpdate/{decideNodeAutoUpdate,nodeAutoUpdater,nodeAutoUpdateRecord,nodeAutoUpdateIpc,nodeUpdateClient}.ts`, `shared/nodeAutoUpdateTypes.ts`, `stores/nodeAutoUpdateStore.ts`, `stores/nodeServerUpdateStore.ts`, `components/settings/nodes/{NodeServerUpdate,NodeAutoUpdate}.vue`, `electron/application/electronApplication.ts:448-456`, `electron/preload.ts:93-95`, both typings, `.github/workflows/release-desktop.yml:1-80,584-706`, `.github/workflows/release-server-docker.yml:1-60,140-175,290-400`, `autobyteus-server-ts/docker/starter/release-source.mjs:13-15`, root `DESIGN.md` (rules, anti-patterns). Round 2: the SR-002 design-spec sections (DS-001/DS-002 spines and narratives, `recheckFailure` interface row, `NodeServerUpdate.vue` and test rows, RELEASE.md row, Concrete Examples), the SR-002 entry, the handoff's Round 2 section and the `docs/design-cases.md` diff (Case 10). The code read in round 1 is unchanged (worktree still at `6225a734a3`; only `docs/design-cases.md` and the ticket folder differ).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: two concerns, each inside one existing owner; risk High for the changed release publish order (deployment behavior, RSK-001/002), a new window→main IPC command, a new record removal path and a second writer to the record (concurrency).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The classification holds.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. REQ-001–007, AC-001–009, DEC-001–006.
- Relevant existing behavior and evidence confirmed: Yes. `reconcileNodeAutoUpdate` returns null for any non-`PENDING` entry (`decideNodeAutoUpdate.ts:19`); `decideNodeAutoUpdate` skips V on `AUTO_FAILED` at V (`:50`); passes read only switch-on nodes (`nodeAutoUpdater.ts:102-114`); IPC has only get-state/mark-read (`nodeAutoUpdateIpc.ts:15-19`); `autoReported` hides the card notice for an ended entry of the same version (`NodeServerUpdate.vue:97-98,139`); `publish-release` uploads binaries and the four updater files in one softprops step (`release-desktop.yml:668-706`); server package upload order archive→description→signature (`release-server-docker.yml:384-391`).
- Scope guardrail confirmed: Yes (UC-001–004; out of scope DEC-002/003 items; Preserved Behavior Boundary; Review Authority).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (round 1: AR-001 → REQ-002/AC-003; AR-002 → REQ-003 and the Preserved Behavior Boundary). Round 2: no new blocking finding.
- Remaining material ambiguity: None in the requirements.
- Statements about existing code the design relies on, opened at their cited lines: all checked statements hold. The softprops globs pick exactly the four updater files named in the spec (`release-artifacts/latest-mac.yml`, `**/latest-linux*.yml`, `**/latest.yml`), and `macos-*/latest-mac.yml` is not matched. Package names `autobyteus-server-${NORMALIZED_TAG}-linux-${ARCH}` with `NORMALIZED_TAG="${RELEASE_TAG#v}"` (`release-server-docker.yml:84,346`) match `descriptionName` (`release-source.mjs:13-15`). One cited dependency source (electron-updater `GitHubProvider.js`, SRC-08) is not in this worktree (no `node_modules`). I accept it as read elsewhere. Note: `package.json:146` declares `^6.8.9` while the copy read was 6.8.3. That doesn't affect the design.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass (SR-002: the recheck holds `checking` and re-reads after the await; the pass's version scope is stated) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (SR-002: one `immediate` watch on the combined answer/entry key) | Confirmed | — |
| BEH-003 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Operational | Pass | Pass | Pass | Confirmed | — |

The basis is confirmed, and every relevant row is `Confirmed` at SR-002.

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec, Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` ×2; SRC-03/06/12, RUN-01/02, MEAS-01, confirmed in code | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `No`; owners correct and small | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Extensions land in the existing owners; `nodeAutoUpdater.ts` 170 lines | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Pass → record clear → broadcast | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Card answer → main recheck → record clear → card | Pass | Pass (SR-002: the trigger is re-evaluated on every change of either input, so arrival order does not matter) | Pass (IPC/preload facade → `NodeAutoUpdater.recheckFailure`) | Pass | Pass (`NodeAutoUpdater` drives steps 1–8 in order, holding `checking`; the card only triggers) | Pass | Pass |
| DS-003 | Tag → builds → binaries → wait → updater files → desktops | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Bounded: wait step | 120 × 30 s poll | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `NodeAutoUpdater` | Pass (`recheckFailure`, `nodesChanged`, timers) | Pass (IPC gets a bound `recheck` function only) | Pass (forbidden: IPC → `record.remove`/client) | Pass | The IPC still receives `record` for get-state/mark-read as today; no new bypass |
| Renderer → main | Pass (preload `recheckNodeAutoUpdate(entryId)`) | Pass | Pass (window sends only an ID; no status, no write, no `requestUpdate`) | Pass | Keeps 356 REQ-006 |
| `publish-release` job | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `nodeAutoUpdateIpc.ts` | Pass | Pass | Pass | Pass | The `recheck` callback is a command into the owner, not a mechanism reaching another collaborator |
| `decideNodeAutoUpdate.ts` | Pass | Pass (stays pure) | Pass | Pass | — |
| Renderer store/card | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `isSupersededFailure(entry, status)` | Pass | Pass | Pass | Low | Pass |
| `NodeAutoUpdateRecord.remove(entryId)` | Pass | Pass | Pass | Low | Pass (callers re-read before removing) |
| `NodeAutoUpdater.recheckFailure(entryId)` | Pass | Pass | Pass | Low | Pass (sequence 1–8 written out, SR-002) |
| IPC `node-auto-update:recheck` / preload | Pass | Pass | Pass | Low | Pass |
| `nodeAutoUpdateStore.recheck(entryId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Node status read | Pass | Pass (`NodeUpdateClient.getStatus`) | N/A | Pass | — |
| "Runs V or newer" | Pass | Pass (C1 `target.relation`, `update-status.mjs:73-84`; no desktop comparator) | N/A | Pass | — |
| Window notification | Pass | Pass (`node-auto-update:changed`) | N/A | Pass | — |
| Per-node serialization | Pass | Pass (the recheck holds the existing `checking` set) | N/A | Pass | Reuse, no new machinery |
| Workflow step test | Pass | Pass (`test_release_channel_workflow_steps.py` helpers) | N/A | Pass | — |
| "Has server packages" | Pass | Pass (`system-level.json` test, same as server workflow) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `electron/nodeAutoUpdate/` | Pass | Pass (extend) | Pass | Pass | — |
| Renderer store + card | Pass | Pass (extend) | Pass | Pass | Combined-key trigger (SR-002) |
| `release-desktop.yml` | Pass | Pass (extend) | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Six package file names (desktop wait vs server upload) | Pass | N/A | N/A | Pass | Two shell lines; the step test pins them to the `descriptionName` grammar |
| Superseded rule (pass vs recheck) | Pass | Pass (one pure function) | Pass | Pass | Renderer does not copy the rule |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodeAutoUpdateEntry` | Pass | Pass | Pass | N/A | Pass | Unchanged |

Derived consumers of a changed structure listed with a decision for each: `Pass` (`NodeAutoUpdate.vue`, `NodeServerUpdate.vue` `autoEntry`/`autoReported`/refresh watch, no other reader).

One vocabulary: `Pass` ("superseded failure", "updater files", "server package files" defined; no glossary conflict).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `decideNodeAutoUpdate.ts` | Pass | Pass | N/A | Pass | — |
| `nodeAutoUpdateRecord.ts` | Pass | Pass | N/A | Pass | — |
| `nodeAutoUpdater.ts` | Pass | Pass | N/A | Pass | `recheckFailure` holds `checking` (SR-002) |
| `nodeAutoUpdateIpc.ts`, `electronApplication.ts`, preload, typings, `shared/nodeAutoUpdateTypes.ts` | Pass | Pass | N/A | Pass | Wiring reorder (updater before IPC) is explicit |
| `nodeAutoUpdateStore.ts` | Pass | Pass | N/A | Pass | — |
| `NodeServerUpdate.vue` | Pass | Pass | N/A | Pass | One watch, cell part, `immediate`, combined key (SR-002) |
| `release-desktop.yml`, new step test, `RELEASE.md`, two web docs | Pass | Pass | N/A | Pass | RELEASE.md row now names the Android-fails / 30-min / 60-min case and its recovery |
| `docs/design-cases.md` | Pass | Pass | N/A | Pass | Case 10 instance for AR-002, written by the Solution Designer in SR-002; listed in Change Scope |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All touched paths | Pass | Pass | Low | Pass | No new folders |
| `scripts/tests/test_desktop_release_server_package_wait.py` | Pass | Pass | Low | Pass | Beside the existing step tests |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `latest*.yml` lines in both softprops `files` lists | Pass | Pass | Pass | Pass | No dual upload |
| Dead code in touched `nodeAutoUpdate` files | Pass | N/A | Pass | Pass | `git grep` evidence recorded; none found |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Updater file upload | No | Pass | Pass | — |
| Record reader | No | Pass | Pass | Tolerant reader unchanged |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<userData>/node-auto-updates.json` | `Directly Usable — No Migration` | Pass (shape unchanged; `toEntry` tolerant read; `retain` already removes entries) | Pass | N/A | Pass | Stale beta.7 entries clear via the normal rule, or are replaced by the next pending request |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Node record + IPC + card | Pass | N/A | Pass | Pass |
| Workflow split + step test + RELEASE.md | Pass | N/A | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Clearing / not clearing | Yes | Pass | Pass | Pass | — |
| Publish order | Yes | Pass | Pass (wait before softprops → circular wait) | Pass | — |
| Card trigger timing | Yes | Pass | Pass | Pass | First-view example traces the key through each step (SR-002) |
| Recheck vs pass | Yes | Pass | Pass | Pass | SR-002 example |

## Material Premise Validation

### `P-001` — On a window's first Nodes-page view, the card's first answer from the node arrives before the window knows the automatic entry

- Related approved requirement: REQ-002, AC-003 (switch on or off).
- Relevant behavior IDs: BEH-002.
- Initiating basis kind: `User`.
- Independent trigger: the user opens the desktop app and goes to Settings → Nodes (the product's only surface for the failure), with a node whose record says `AUTO_FAILED` for V and that runs V (SCN-001; RUN-01/02 is this exact state).
- Support evidence: Nodes page, supported user action "open the page".
- Forward path (as designed at SR-001): `NodeServerUpdate.vue:80` `updates.watch` → `nodeServerUpdateStore.watch` sets `status: null, connection: 'unknown'` (`nodeServerUpdateStore.ts:110`) → the cell `div` renders only when `entry.connection !== 'unknown'` (`NodeServerUpdate.vue:2`) → node answer: `status` becomes `V|succeeded` → the design's watch on `${status.version}|${status.update?.state}` fires now, and `autoEntry` is still null because the only caller of `nodeAutoUpdateStore.initialize` is `NodeAutoUpdate.vue:84` (`onMounted`), and that component mounts inside the cell `div` (`:31`) only after this answer. So "entry `AUTO_FAILED`" is false and nothing is rechecked → `initialize` loads the `AUTO_FAILED` entry → the status key does not change, so the design's watch stays quiet. The existing entry watch (`:92-95`) ignores an ended outcome read first.
- Lifecycle preconditions and consequence: the window's first view of the page; `nodeServerUpdateStore.unwatch` deletes the entry on unmount (`:115-120`), so later views in the same window do recheck. On the first view, a switch-off node keeps "Automatic update failed" for as long as the page stays open. A switch-on node keeps it until the next pass (up to 60 min), and the pass clears it only when the desktop still runs V (AR-003).
- Reachability: `Reachable`.
- Review consequence: AR-001 (blocking Design Impact in round 1). Resolved in SR-002: the combined-key watch fires again when the entry loads (`V|succeeded|undefined|undefined` → `V|succeeded|V|AUTO_FAILED`).

### `P-002` — A pass writes a new `PENDING` entry while a card recheck for the same node is awaiting the node

- Related approved requirement: REQ-003; Preserved Behavior Boundary ("`AUTO_UPDATED` and `PENDING` handling unchanged"; one attempt per version).
- Relevant behavior IDs: BEH-001.
- Initiating basis kind: `System` (the pass timer: first at 2 min after start, then hourly, `nodeAutoUpdater.ts:8-9,95-100`), meeting a user-driven recheck. The record owner already serializes per-node work with `checking` (`:111-115`), so per-node exclusion is an existing contract of this owner, not a new posture.
- Forward path (as designed at SR-001): desktop updated itself to V+1 (supported electron-updater path); entry `AUTO_FAILED` for V; node runs V (updated by the card or the host command), switch on. The user opens the Nodes page → card recheck: the design reads the entry and checks `checking`/`follows`, then awaits `getStatus(baseUrl, V)` (up to 10 s, `nodeUpdateClient.ts:4`). The design does not say the recheck adds itself to `checking`. A pass's `checkNode` then starts (`:112` sees no guard) → `?target=V+1` → relation `newer` → `requestUpdate` → `record.set(PENDING V+1)` + follow. The recheck's answer (`relation same` for V) → `isSupersededFailure(entry read before the await)` → true → `record.remove` deletes the new `PENDING` entry.
- Consequence: the follow sees `outcome !== 'PENDING'` (`:150`) and stops; the update's outcome is never recorded (no "Updated automatically to V+1", or a failure is lost). With no entry, a later pass can request V+1 again after a real failure, breaking the one-attempt rule.
- Reachability: `Reachable` (needs only the product's own timer and page; low frequency).
- Review consequence: AR-002 (round 1). Resolved in SR-002: the recheck holds `checking` for steps 4–8, so a pass's `checkNode` returns at once (`nodeAutoUpdater.ts:112`), and step 7's re-read protects an entry stored meanwhile. The fix reuses the owner's existing guard and adds no new machinery.

### `P-003` — A card recheck arrives while a pass already holds `checking` for the node, after the desktop has moved to V+1

- Related approved requirement: REQ-002, AC-003.
- Relevant behavior IDs: BEH-002.
- Initiating basis kind: `System` (pass timer) meeting `User` (Nodes page open).
- Forward path: desktop runs V+1; the entry is `AUTO_FAILED` for V; the node already runs ≥ V+1. The pass's `checkNode` is awaiting `?target=V+1` when the card's recheck arrives. Step 1 returns because `checking` holds the ID. The pass then sees relation `same`/`older`: it doesn't clear (`target.version ≠ V`, AR-003) and doesn't request. The card's key doesn't change, so it doesn't recheck again.
- Consequence: the stale line stays until the card's key next changes (the next page view resets the answer: `nodeServerUpdateStore.ts:110,115-120`). This is only cosmetic, with no effect on the record's rules (`decideNodeAutoUpdate.ts:50` ignores entries of another version).
- Reachability: `Reachable`, but narrow: an overlap of milliseconds to at most 10 s with the pass at 2 min after start and then hourly.
- Review consequence: non-blocking residual risk. DESIGN.md's "Premature complexity for hypothetical … concurrency" applies: no queued retry is required. Record it if it is seen.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The basis is confirmed, ARCH-REV-001's findings are resolved in SR-002, and nothing in scope rests on an unsupported premise. The design is ready for implementation.

## Findings

None open. The ARCH-REV-001 findings are resolved in SR-002 (verified against the current `design-spec.md`):

- AR-001 (High) — Resolved. DS-002, the `NodeServerUpdate.vue` row (one watch, cell part, `immediate: true`, key `${status?.version}|${status?.update?.state}|${autoEntry?.version}|${autoEntry?.outcome}`, recheck only when a status is present and the outcome is `AUTO_FAILED`), the first-view example, and required test case (d).
- AR-002 (Medium) — Resolved. The `recheckFailure` interface row gives the sequence 1–8: guard check → `AUTO_FAILED` read → node lookup → hold `checking` → `getStatus(?target=V)` → stopped/no-status return → re-read and conditional remove + emit → `finally` release. The recheck-vs-pass example and required test case (c) cover it.
- AR-003 (Low) — Resolved. The DS-001 narrative and the Not-cleared example state the pass's version scope; test case (a) covers a pass at V+1.

## Classification

N/A — Pass.

## Recommended Recipient

Implementation Engineer (primary); Solution Designer informed.

## Residual Risks

- RSK-001 / RSK-002 as recorded: a late or failed server package job now also holds the desktop updater files back; the real asset order is visible only on the next tag (delivery checks `createdAt` per AC-005).
- The card's address and the entry's `baseUrl` may differ; the main process then cannot confirm and the failure stays (as passes today). Accepted in the spec.
- The server job's own 30-minute wait for the release is unchanged. If Android fails and the desktop builds take more than 30 min, the server job fails, and the desktop publish then fails after its 60-min wait. This is intended (REQ-005), and the SR-002 RELEASE.md row names the case and its recovery.
- P-003: a recheck dropped because a pass holds the guard leaves the line until the card's next key change. This is cosmetic and narrow; no machinery is required.
- REQ-006 mentions "the zh variant's runs". Desktop Release has no zh variant, so only the `system-level.json` condition applies. This is harmless and needs no change.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 and P-002 are resolved by SR-002; P-003 is a non-blocking residual; nothing in scope rests on an unsupported premise)
- Notes: SR-002 is ready for implementation. DS-003 (release order), the persisted-data decision, the ownership model, the IPC boundary and the removal plan are unchanged from round 1 and still pass. The node-side tests (a)–(d) and the workflow step test are the design's required proofs. Delivery checks the real asset order on the next tag (AC-005, RSK-002).
