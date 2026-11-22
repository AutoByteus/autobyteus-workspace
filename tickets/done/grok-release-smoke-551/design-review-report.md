# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-release-smoke-551/tickets/in-progress/grok-release-smoke-551/requirements-doc.md` (SR-001, Approved by the User 2026-11-22; DEC-003 → (a))
- Upstream Investigation Notes: `.../grok-release-smoke-551/investigation-notes.md`
- Upstream Solution Revision Record: `.../grok-release-smoke-551/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `.../grok-release-smoke-551/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: `evidence/SD-probes-2026-11-22.md` (P1–P17) and probe scripts; `follow-ups.md` (FU-001, FU-002)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `.../grok-release-smoke-551/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Solution Designer `handoff-architecture-review-001.md` (Medium / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `codex/grok-release-smoke-551` @ `df00f97aaa`. Read:
  - `acp-client-connection.ts:28-34, 145-185, 214-262`: the bounds, and the 517 inbound stage with its per-frame containment. `routeExt` drops connection-wide notifications at `:258-262`.
  - `acp-discovery-handshake.ts` (whole); `grok-build-launch-profile.ts:70-101`; `grok-build-capability.ts:11, 115`.
  - Callers of the short-process helpers: `grok-agent-runtime-strategy.ts:43` (billing, with a deadline), `deepseek-harness-capability.ts:182`.
  - `model-catalog-service.ts:166-210`; `run-model-selection-service.ts:30-60, 135-160` and its callers.
  - `claude-sdk-setting-sources.ts:1-5`; `acp-layer-neutrality.test.ts:8-16`.
  - Live-suite bounds: `grok-build-live-runtime.e2e.test.ts:25, 69, 478`; `workspace-skill-links-live.e2e.test.ts:61, 143`; `grok-build-compaction-live.e2e.test.ts:31, 85`.
  - Grok's own log `~/.grok/logs/unified.jsonl`: fields `ts`, `pid`, `src`, `msg` and the `ctx` keys `had_real_catalog`/`model_count` only, for all 13 starts with `had_real_catalog: false`.

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `High`
- Classification rationale reviewed: workspace trust widens what Grok runs load (a security boundary), and the shared ACP connection gains a connection-wide listener and a start-up bound shared with DeepSeek. Four source files in two existing subsystems.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: 90 s start-up bounds for Grok discovery and run start (REQ-001); discovery reports the catalog Grok announces after its refresh (REQ-002); Grok runs load the workspace's `.grok/skills` with nothing written to the user's trust list (REQ-003); the smoke passes Grok (REQ-004).
- Relevant existing behavior and evidence confirmed:
  - Bounds: 15 s for discovery (`acp-discovery-handshake.ts:8, 39`) and 30 s for `initialize`. The 30 s constant is reused for extension requests, `set_config_option`, `session/list` and `session/close` (`acp-client-connection.ts:148, 152, 173, 178, 183`).
  - Discovery stops Grok right after `initialize` (`acp-discovery-handshake.ts:70-74`).
  - Run and discovery processes get the same environment (`grok-build-launch-profile.ts:83-101`).
  - Connection-wide notifications are dropped (`acp-client-connection.ts:258-262`).
- Scope guardrail confirmed: UC-001..UC-003. Out of scope: 567's smoke retry, Grok's slow step, 550, the quota. Preserved: the BEH preserved columns and the other runtimes' trust.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none raised).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: checked at their lines, all accurate. Line drift only: the drop rule sits at `:258-262` in this worktree, the spec says `:256-260`/`:257-259`. The claim that DeepSeek "only inherits the shared bounds" is true, and the short-process bound reaches two more callers (residual 2).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (P3; beta.3/4) | Pass (DS-001; probes 10 s, short process 90 s, `initialize` 90 s) | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass (DS-002; create, restore and team members all go through `AcpSessionLauncher` → `initialize`) | Confirmed | — |
| BEH-003 | User/System | Pass | Pass (P4–P7, P15, P16; MP-001) | Pass (DS-001/DS-003: listener before `initialize`, wait ≤ 3 s, never past the bound) | Confirmed | — |
| BEH-004 | User/System | Pass | Pass (P8–P12, P17) | Pass (trust only in `runLaunch`; discovery and billing processes untrusted) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-probes-2026-11-22.md` + scripts | Pass | Pass | Pass | Pass | Pass (evidence, no approval) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | Mode 1 local defect plus a constant whose name said less than it did; Modes 2 and 3 missing invariants, each with an owner | — |
| Refactor decision is explicit | Pass | `No` | — |
| Refactor decision is supported by the concrete design sections | Pass | Each change lands in its existing owner (connection, short-process helper, Grok capability, Grok launch profile) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary: catalog read | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary: run launch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local: short process with follow-up wait | Pass | Pass (listener first; end on first match / window / bound − 250 ms; never a time-out of its own) | N/A | Pass | Pass | Pass | Pass |
| Return/event: connection-wide notification → listeners | Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AcpClientConnection` | Pass | Pass | Pass | Pass | Listener API beside `onClose`; the inbound stage stays private |
| `runAcpDiscoveryHandshake` | Pass | Pass | Pass | Pass | The capability neither spawns nor listens itself |
| Grok capability | Pass | Pass | Pass | Pass | Owns the method name, the window and the meaning |
| Grok launch profile | Pass | Pass | Pass | Pass | Owns the env, including run trust |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Grok → shared ACP | Pass | Pass (shared ACP never names Grok; the neutrality test guards it) | Pass | Pass | |

Owners receive collaborators; the connection listener is a notification listener (the emitter behaves the same without one); no process-wide lookup (Principle 16): `Pass`

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AcpClientConnection.onConnectionNotification(listener)` | Pass | Pass | Pass (method name) | Low | Pass |
| `runAcpDiscoveryHandshake(profile, followUp, options)` → `{ initialize, followUp }` | Pass | Pass | Pass | Low | Pass |
| `normalizeGrokBuildModels(modelState)` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `N/A` (no interface, port, adapter or wrapper added).

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Notification routing | Pass | Pass (extends the 517 inbound stage, inside its per-frame containment) | N/A | Pass | |
| Short process with a bound | Pass | Pass | N/A | Pass | |
| Per-process Grok env | Pass | Pass | N/A | Pass | |
| Test agent | Pass | Pass (`acp-fake-agent-harness.ts`) | N/A | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/acp` | Pass | Pass | Pass | Pass | |
| `runtime-management/grok` | Pass | Pass | Pass | Pass | |

Kinds and forms: run create, restore and team member (all through `runLaunch`); discovery and the billing short process (`discoveryLaunch`, untrusted); DeepSeek (inherits the bounds, registers no listener). All traced.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Model-state normalization (`initialize` vs `models/update`, same shape per P16) | Pass | Pass (one normalizer) | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Handshake result `{ initialize, followUp }` | Pass | Pass | Pass | N/A | Pass | |

Derived consumers (Principle 11): `Pass` (one handshake caller; normalizer callers change with it).

One vocabulary (Principle 15): `Pass` — `AGENT_START_TIMEOUT_MS`/`REQUEST_TIMEOUT_MS` replace a name that said less than it did. "Follow-up notification" is local to the helper. "Workspace trust" is Grok's own term.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `acp-client-connection.ts` | Pass | Pass | N/A | Pass | |
| `acp-discovery-handshake.ts` | Pass | Pass | N/A | Pass | |
| `grok-build-capability.ts` | Pass | Pass | N/A | Pass | |
| `grok-build-launch-profile.ts` | Pass | Pass | N/A | Pass | |
| `docs/modules/grok_build_runtime.md` | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new files (test fixtures excepted) | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `INITIALIZE_TIMEOUT_MS` | Pass | Pass | Pass (rename at all six uses, no alias) | Pass | |
| Connection-wide drop rule | Pass | Pass | Pass | Pass | |
| Dead code in touched files | Pass | N/A | Pass | Pass | To be confirmed with the unused-export check |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Bounds rename; normalizer signature | No | Pass | Pass | Alias and optional `followUp` both rejected in the log |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AutoByteus data; user's Grok trust list | Not Affected | Pass (P9/P12: nothing persisted by the env switch; `--trust` rejected) | Pass | N/A | Pass | |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1-5 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Grok side of the handshake; wait end; trust env | Yes | Pass | Pass | Pass | |

## Material Premise Validation (Only When Needed)

### `MP-001` — A Grok process with no session open announces its refreshed catalog to the ACP client

- Related approved requirement: REQ-002, AC-003
- Initiating basis kind: `System` — the first Grok start after ≥ 6 h idle (expired sign-in, P15), when the server reads Grok's models. The discovery handshake sends only `initialize`; it opens no session.
- Why it needed checking: P16 observed `_x.ai/models/update` 216 ms after `initialize` in a probe that also opened a session, and P7/P14 show no announcement with a fresh cache and no session. So the probes alone left open whether a no-session process announces.
- Evidence (my read of Grok's log, timing/message fields only): of the 13 starts with `had_real_catalog: false`, three lived long enough after the refresh. These are pids 7354 (2026-11-20), 2940 (11-16) and 94677 (11-17). None logged a session (no `sid`, no session messages). Each logged `auth: initialize() built auth_methods for ACP response`, then `model catalog: fetch succeeded {model_count: 1}` and `model catalog: notifying clients {model_count: 1}` about 0.17–0.23 s after the `initialize` answer (e.g. 7354: answer 05:43:08.189, notify 08.361). The other ten ended before the fetch completed.
- Reachability: `Reachable` on log evidence. The ACP frame itself was not captured in a no-session process (residual 4).
- Review consequence: none; the design's wait (≤ 3 s, listener attached before `initialize`) covers the observed ~0.2 s.

### `MP-002` — Trust also loads the user's own Grok/Claude hooks and project permission rules (P17), beyond the effects named when DEC-003 was approved

- Related decision: DEC-003 (User, (a)). Its stated reason: give Grok "the same trust the other runtimes already have".
- Check: AutoByteus Claude runs load `user`, `project` and `local` settings (`claude-sdk-setting-sources.ts:1-5`). That is the user's own hooks and the project's permission rules and hooks. So P17's wider list is the same set Claude runs already load.
- Reachability: `Reachable` (every Grok run).
- Review consequence: within the approved decision's reason; no Requirement Gap. RSK-002 and the module doc record it.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (primary pass rule); Solution Designer informational.

## Residual Risks

1. **Every Grok run start pays the wait.** Run creation validates its model through a full catalog read with no deadline (`run-model-selection-service.ts:49`), and the catalog is not cached (`grok-build-model-catalog.ts:8-9`). So each Grok run start adds the 3 s window in the normal case (no announcement). A team launch shares one read per runtime and folder (`withSharedCatalog`, `:144-152`). This is within REQ-002's "a few seconds to a discovery", but Key Tradeoffs names only model-list reads. Suggestion: state it there and in the module doc.
2. **Shared short-process bound.** `DISCOVERY_TIMEOUT_MS` 15 → 90 s also applies, when no deadline is given, to DeepSeek's session-options discovery (`deepseek-harness-capability.ts:182`) and to Grok's billing request (`grok-agent-runtime-strategy.ts:43`, which passes the 8 s runtimes-report deadline, so it is unchanged in practice). A hung DeepSeek discovery fails later. That is within "inherits the shared bounds" and the deferred-to-design choice.
3. **Live-suite bounds (a fact the requirements asked to verify; the design does not record it).** I checked them:
   - `beforeAll` catalog reads have 120 s (`grok-build-live-runtime.e2e.test.ts:69`, `grok-build-compaction-live.e2e.test.ts:85`). That covers the worst case of 2 × 10 s probes + 90 s + 3 s.
   - Run steps have 180–240 s (`:25`, `workspace-skill-links-live.e2e.test.ts:61`). A run start under the worst seen 34.6 s start-up is about 34.6 + 3 + 34.6 s (discovery, then the run's own `initialize`).
   - One 15 s wait, for org `ROOT_LIFECYCLE` (`grok-build-live-runtime.e2e.test.ts:478`), predates this change. API/E2E should watch it at load.
4. **MP-001 wire frame:** the no-session announcement rests on Grok's log, not a captured frame. The AC-003 live stale case (first start after ≥ 6 h idle) is the proof, with DEC-004 as fallback.
5. RSK-001 (announcement later than 3 s under load), RSK-002 (trust scope, user-approved), RSK-003 (Grok-owned names) as recorded.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: three causes, each fixed in its existing owner. The shared ACP layer stays neutral: the method name and window come from the Grok capability. The connection-wide listener sits inside the 517 stage's per-frame containment. Trust is scoped to run processes, and its wider effects match Claude runs. The bounds keep a hung agent bounded.
