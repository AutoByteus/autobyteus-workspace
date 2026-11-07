# Design Review Report — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Review Round Meta

- Upstream Requirements Doc: [requirements-doc.md](requirements-doc.md) (`Approved` SR-011; SR-012 DEC-019…021; SR-013 DEC-022…024 and wording fixes)
- Upstream Investigation Notes: [investigation-notes.md](investigation-notes.md) (E-01…E-27, U-001…U-005)
- Upstream Solution Revision Record: [solution-revision-record.md](solution-revision-record.md) (SR-001…SR-013)
- Reviewed Design Spec: [design-spec.md](design-spec.md) (SR-013, status `Ready`, user approval `Obtained`)
- Supplemental Task Artifacts Reviewed: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-step-phone-pairing/ui-ux-spec.md` (Approved; VIS-001…034); [follow-ups.md](follow-ups.md); [solution-handoff.md](solution-handoff.md) ("Round 2")
- Relevant Solution Revision IDs: `SR-011`, `SR-012`, `SR-012a`, `SR-013`
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: revised package after ARCH-REV-001 `Fail`, from the Solution Designer (run `solution_designer_03f4f2aaf88941a0a3030151229dc1fa`), head `101608a9de`
- Prior Review Round Reviewed: `1` (ARCH-REV-001)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: the round-1 code reads still hold (base `677f61de0b` unchanged; round 2 changed only ticket documents, `git diff 4bd116d379..101608a9de`). Re-read for round 2: `remote-access-pairing-service.ts:154-160` (`pruneExpiredSessions` drops consumed sessions); `MainActivity.kt:196-216` (a new `AutoByteusWebView` per opened entry, which suits a bridge registered per origin); Android `androidx.webkit` `WebViewCompat.addWebMessageListener` documentation (origin rules, main-frame flag).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1; round 2 adds a library dependency (`androidx.webkit`) and an opaque session ID, still High.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Round 2's requirement edits (REQ-008, AC-001/002/005, DEC-001/003/006 notes, DEC-022…024) stay within the approved screens. DEC-022 and DEC-024 are two small copy decisions recorded by the Solution Designer within the user's direction. DEC-023 settles the shared-intent question raised in ARCH-REV-001.
- Relevant existing behavior and evidence confirmed: Yes (round 1 citations, plus the re-reads above).
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (AR-010 → REQ-004, TR-005/TR-006).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: round-1 statements re-verified. New statement: "a consumed session is kept until it expires … today it is deleted at once, line 134". True, but `pruneExpiredSessions` (line 156) also deletes consumed sessions and runs before the lookup (line 108), so it must change too (implementation note under AR-010's non-blocking list).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Fail | Needs Correction | AR-010: a remote node in a container cannot report its remembered local-network answer |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | Entry-form table, failed exchange and reasons are defined |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | Bridge limited by origin and main frame; `NodeReachability` owns list checks |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | The rationale now states installed apps' behavior honestly |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX spec (Product, VIS-001…034) | Pass | Pass | Pass | Pass | Pass | Superseded row and first-launch line noted in the requirements doc (DEC-019, DEC-024) |
| follow-ups.md | Pass | Pass | Pass | Pass | Pass | FU-001 still says "address list in the QR". Cosmetic, non-blocking |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged | — |
| Root-cause classification is explicit and evidence-backed | Pass | Unchanged | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Unchanged; `default-route.ts` replaces `local-network-identity.ts` | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Target Mapping updated | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Desktop/remote window → tabs | Pass | Pass | Pass | Pass | Pass | Pass | Pass (way-composition table per node kind; AR-010 is in the read contract, not the spine) |
| DS-002 | Docker window → tabs | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Show QR code → QR | Pass | Pass | Pass | Pass | Pass | Pass | Pass (discard by opaque `sessionId`) |
| DS-004 | App entry forms → page | Pass | Pass | N/A | Pass | Pass | Pass | Pass (save on the page's `paired` message; the page reports, the flow saves) |
| DS-005 | Page `?pairing=` → session | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Sheet › Switch node → list | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Phones list | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Bounded: interfaces → facts | Pass | Pass | N/A | Pass | Pass | Pass | Pass (rule 2 per DEC-003; default-route order) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `NodeNetworkService` | Pass | Pass | Pass | Pass | — |
| `RemoteAccessPairingService` | Pass | Pass | Pass | Pass | Ownership Map still says "discard by code" (nit, non-blocking) |
| `phoneAccessStore` | Pass | Pass | Pass | Pass | — |
| `NodeConnectionFlow` | Pass | Pass | Pass | Pass | — |
| `ShellBridge` | Pass | Pass | Pass | Pass | Allowed origin = the open entry's origin; main frame only; opaque-origin previews get no object |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web components → store → composer / api | Pass | Pass | Pass | Pass | — |
| Server routes → services → stores | Pass | Pass | Pass | Pass | — |
| Page → shell bridge client → web-message object | Pass | Pass | Pass | Pass | — |
| Android `ShellBridge` → activity callbacks on the UI thread | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /rest/remote-access/network` | Pass | Pass | Pass | Low | Fail (AR-010: a container reports `localNetwork: null`, so the remembered `this-computer` answer has no read path) |
| `PUT /rest/remote-access/network/local-networks/:networkId` | Pass | Pass | Pass | Low | Pass |
| `POST /pairing-sessions` (+ `connectionWay`, returns `sessionId`) | Pass | Pass | Pass | Low | Pass |
| `DELETE /pairing-sessions/:sessionId` | Pass | Pass | Pass | Low | Pass. Nit: the route-policy pattern `pss_[0-9a-f]+` makes a malformed ID fall to the default class. `^/rest/remote-access/pairing-sessions/[^/]+$`, as for devices, is simpler. Non-blocking |
| `GET /status` without `serverName` | Pass | Pass | Pass | Low | Pass |
| Shell bridge (web messages: hello / paired / showNodeList / startScan) | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| In-container fact, status check, settings events, JSON store, QR image, scanner | Pass | Pass | N/A | Pass | Unchanged |
| Origin-limited native bridge | Pass | Pass | Pass | Pass | `androidx.webkit`: library only, manifest unchanged |
| Log redaction | Pass | Pass | N/A | Pass | No secret in a path any more |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `remote-access` | Pass | Pass | Pass | Pass | — |
| Web `stores` / `utils/phoneAccess` / `components/settings/phone` | Pass | Pass | Pass | Pass | The store picks the QR name (DEC-016) |
| Web mobile + `utils/remoteAccess` | Pass | Pass | Pass | Pass | — |
| Android `shell` / `ui` / `web` / `connection` | Pass | Pass | Pass | Pass | `NodeReachability` added |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| IPv4 ranges | Pass | Pass | Pass | Pass | — |
| Wire types | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodeNetwork` | Fail | Pass | Pass | N/A | Fail | `configuredBaseUrl` fixed (only loopback dropped). AR-010: `localNetwork` is `null` for a container although that node keeps an allowed answer under `this-computer` |
| Pairing session (`+connectionWay`, `sessionId`) | Pass | Pass | Pass | N/A | Pass | — |
| Device record, page session | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass` (POST answer `sessionId`, `androidx.webkit` build entry added).

Each domain word keeps one meaning and each concept one name: `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server new and changed files (incl. `default-route.ts`) | Pass | Pass | Pass | Pass | One read serves the network ID and the address order |
| Web files | Pass | Pass | N/A | Pass | — |
| Android files (incl. `ShellBridge.kt`, `NodeReachability.kt`, `build.gradle.kts`) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped paths | Pass | Pass | Low | Pass | Unchanged layout, plus `shell/NodeReachability.kt` |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Round-1 removals | Pass | Pass | Pass | Pass | Unchanged, verified in round 1 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| QR payload, status `serverName`, candidates route | No | Pass | Pass | Rationale corrected |
| Old WebView without `WEB_MESSAGE_LISTENER` | No (a refusal screen, not a second path) | Pass | Pass | Residual risk below |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `allowed-local-networks.json` | Not Affected | Pass | Pass | N/A | Pass | — |
| `paired-devices.json` + `connectionWay` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| `/mobile` session + `nodeName` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| Android `saved_nodes` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Now written only after `paired` |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server → desktop web → `/mobile` → Android → glossary | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Way composition per node kind | Yes | Pass | Pass | Pass | Table per kind. The Docker example's `:18001` is stale against the 8443…8542 rule (nit) |
| Android entry forms | Yes | Pass | N/A | Pass | — |
| Bridge | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### P-001…P-003 (round 1)

Rechecked: P-001 is closed by the origin-limited, main-frame-only bridge. P-002 is closed by default-route order and the extra exclusions. P-003 is closed by the 8443…8542 range.

### P-004 — A remote node in a container, reached at a private address, forgets the "Allow" answer

- Related approved requirement: REQ-004 ("The answer is remembered for that network … If the network cannot be recognised, the answer is remembered per computer"), TR-005/TR-006, AC-002.
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: `User`
- Trigger: the user opens Phone Setup in the window of a node on another machine. That node runs the documented Docker image (`docker/entrypoint.sh`), and the desktop reaches it at a private IPv4 address. UC-003 is a supported normal scenario.
- Forward path: the composition table's "Remote node in a container" row → Same Wi-Fi or LAN way from the desktop's base URL, network ID `this-computer`, answer kept by that remote node → the user presses "Allow and show QR code" → `PUT <remote>/network/local-networks/this-computer {allowed:true}` → stored → next time `GET <remote>/network` returns `localNetwork: null` for a container (Interface Boundary Mapping), so the store has no `allowed` to read.
- Consequence: the question returns every time, and the "Wi-Fi/LAN allowed on this network" row (TR-005/TR-006) cannot be shown, contrary to REQ-004.
- Reachability: `Reachable`
- Review consequence: AR-010.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Fail`: one small but contract-level contradiction remains (AR-010). All ARCH-REV-001 findings are resolved.

## Findings

### AR-010 — A container node has no read path for its remembered local-network answer (Design Impact, Low, blocking)

- Protected authority: REQ-004 (remembered answer, per computer when unrecognised), TR-005/TR-006, AC-002; BEH-003.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`.
- Evidence: the composition table row "Remote node in a container" says the answer is kept by that node under `this-computer`. The Interface Boundary Mapping and `NodeNetwork` give a container `localNetwork: null`. Premise P-004.
- Required update: make the contract say how the store reads that answer. For example, a container's `NodeNetwork.localNetwork` is `{ networkId: 'this-computer', addresses: [], allowed }`, which the local-Docker path (DS-002) ignores because it uses the host facts. Or add an explicit allowed read. Update the interface row and the type comment to match.
- Proportionate: a one-row contract fix; no new mechanism.
- Recipient: Solution Designer.

### Non-blocking notes (fix with AR-010 or in implementation)

- N-1: `pruneExpiredSessions` (`remote-access-pairing-service.ts:156`) deletes consumed sessions before the lookup (line 108). Keeping a consumed session until expiry, so that reuse answers CONSUMED, needs that line changed too. Name it in the Target Mapping row.
- N-2: Ownership Map, `RemoteAccessPairingService`: "discard by code" → "discard by `sessionId`".
- N-3: Route policy: classify `^/rest/remote-access/pairing-sessions/[^/]+$` as owner (as devices), not only `pss_[0-9a-f]+`.
- N-4: Concrete Examples: the Docker composition example still shows `https://<dns>:18001`; per the 8443…8542 rule it is `https://<dns>:<8443+k>`.
- N-5 (recommendation): the Serve port by position "ordered by port" shifts when a node with a lower port is added. The shown command for an existing node would then change, and running it could replace another node's Serve mapping. Ordering by the entry's `createdAt` makes additions never shift existing nodes. Optional Advanced text only (REQ-008, Should).
- N-6: follow-ups.md FU-001 text still says "address list in the QR".

## Classification

- `Design Impact` (AR-010).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- U-001 / U-004 / U-005 on Linux are read, not run; covered by fixtures and one real Linux host check.
- U-003: renderer status fetch on the packaged build (existing path).
- U-006: Tailscale Serve accepting `--https=8443…8542` (optional text only).
- A phone whose Android System WebView lacks `WEB_MESSAGE_LISTENER` (pre-2020 WebView, no Play updates) gets "Update Android System WebView" instead of its pages. This touches REQ-017 for such phones only. Low reachability on minSdk 26 with Play-updated WebView; the visible text is outside the spec and is accepted as a technical refusal.
- `addWebMessageListener` origin rules for `http://<IPv4>:<port>` origins: the implementation confirms against the androidx.webkit reference ([WebViewCompat](https://developer.android.com/reference/kotlin/androidx/webkit/WebViewCompat)).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (P-004 Reachable; P-001…P-003 closed)
- Notes: round 2 resolves AR-001…AR-009. Only AR-010, a one-row contract fix, blocks. Notes N-1…N-6 can ride along. `task_size = Large`, `architectural_risk = High`.
