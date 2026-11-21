# Design Review Report — autobyteus-15

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`, approved SR-001.
- Upstream Investigation Notes: `investigation-notes.md`, SR-002, F-01–09/A-F01–08.
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-001/002.
- Reviewed Design Spec: `design-spec.md`, SR-002, DS-001–004.
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review.md`, `follow-ups.md`; no normative supplements.
- Relevant Solution Revision IDs: SR-001 requirements; SR-002 design.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-001**.
- Current Review Round: **1**, 2026-11-21.
- Trigger: Architecture Design Complete from Solution Designer.
- Prior Review Round Reviewed: N/A; first completed review of this ticket.
- Latest Authoritative Round: this report.
- Current-State Evidence Basis: worktree `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-auto-restart`, branch `feature/managed-ubuntu-auto-restart`, HEAD `7841e5302075f72f9fdd8fd3aad743a154ce76b4`, base `7591aa307fac13c7ca8d2bdf8059054e22cf597a`. Read native managed session, shutdown/composition, updater/policy/record, server recorder and its tests, background-task domain/Codex reader, application scope/contracts, REST registration/permissions and node-access contract. Applied DESIGN.md, TESTING.md (including changes since prior review), root/web/server AGENTS and shared design guidance. No implementation or GUI validation run.

## Routing Classification Review

- Task size: **Medium**, bounded extensions/refactoring of existing application/updater/server owners. The file inventory is larger than the design's approximate count, but not a new subsystem.
- Architectural risk: **High**, unattended stop/activation, new busy-query contract and concurrent Quit/input/settings behavior.
- Classification rationale reviewed: accepted.
- Independent Architecture Review required by classification: **Yes**.
- Classification evidence or correction required: no routing correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Contradicted in target alignment**, not missing approval. The intended behavior and current production paths are understood; DS-001–004 do not yet enforce all approved boundaries.
- Approved intent: opt-in managed Ubuntu restarts itself at the defined safe moment, without a second click; intentional Quit stays closed. Mac timing, manual install/opt-out and trust boundaries remain unchanged.
- Scope guardrail confirmed: managed Ubuntu lifecycle, own-node busy observation and copy; no privilege/signing/launcher change, release, user-install mutation, draft-persistence feature or Mac timing change.
- Every blocking Design Impact finding maps approved authority: **Yes**, AR-001–003 below.
- Material intent ambiguity: none needed to fix the findings. Do not reinterpret the five-minute rule or require a new global admission lock.

Opened current-source evidence (paths relative to repository root):

| ID | Source | Established fact |
| --- | --- | --- |
| E-01 | `autobyteus-web/electron/application/managedUpdateSession.ts:43–148` | Current stage/generation checks, ordinary quit vs manual reopen, asynchronous stop/activation/status and terminal failure paths. |
| E-02 | `autobyteus-web/electron/application/electronApplication.ts:79–108,384–395,493–500`; `applicationShutdown.ts` | Session receives only `will-quit`; shared stop awaits server and browser runtime; window-close handling is distinct from stop. |
| E-03 | `autobyteus-web/electron/updater/appUpdater.ts:125–164,490–543`; `appUpdateAutomaticPolicy.ts` | Native policy handles before-quit bookkeeping, not managed Quit intent; managed events already persist automatic attempts/failures; current policy excludes managed installs. |
| E-04 | `autobyteus-server-ts/src/restart-resume/busy-run-recorder.ts:83–128`; `tests/unit/restart-resume/busy-run-recorder.test.ts:141–155` | Reminder records intentionally omit inspection timeouts/non-snapshots; the test explicitly expects a slow run to be left out. |
| E-05 | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:195–218`; `agent-background-task-view.ts`; `backends/codex/thread/codex-thread.ts:123–153` | Background inspection distinguishes snapshot, event-stream, unsupported and unavailable. Codex inspection has a five-second budget and can return incomplete/inspection_failed; absence of streamed tasks is not proof of no snapshot tasks. |
| E-06 | `autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts:125–131`; runtime contracts `:72`; runtime builder `:312–314`; `compositions/agent-runtime-status-composition.ts:19–48` | Process and application scopes are distinct run managers; extension of application-owned counting is appropriate. |
| E-07 | `autobyteus-server-ts/src/api/rest/index.ts:30–73`; `api/security/node-route-permissions.ts`; `docs/design/node_access_model.md:71–85` | New REST endpoints inherit credential requirement and owner/phone access. No exemption or permission row is needed for the proposed count. |
| E-08 | `autobyteus-web/electron/updater/appUpdateNotificationRecord.ts:100–140,189–214`; `electron/launch-profile/managedRestartChannel.ts:6–27` | Existing persisted outcome/block format and fixed-FD reopen mechanism can be reused without migration or native protocol changes. |

Electron input-event has an actual native observer implementation; a broad typings union alone was not the review basis. Physical keyboard/mouse delivery across the app's views on Wayland still needs the planned packaged validation. [Pinned Electron input observer](https://github.com/electron/electron/blob/v42.11.16/shell/browser/api/electron_api_web_contents.cc#L3929-L3933), [webContents event contract](https://www.electronjs.org/docs/latest/api/web-contents#event-input-event)

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Automatic update / safety / failures / copy | Fail | Pass — SR-001 and E-01/03–08 | Fail — stale quiet decision and lossy inspection contract | Needs Correction | AR-001/002; keep existing activation/outcome boundaries. |
| BEH-002 | Intentional Quit | Fail | Pass — REQ-004 and E-01/02 | Fail — observes Quit only after windows close | Needs Correction | AR-003. |
| BEH-003 | Manual click | Pass | Pass — E-01/03 | Pass for preserved activation; shared Quit interception needs AR-003 | Confirmed | Keep manual consent separate; test shared ending. |
| BEH-004 | Opt-out/channel invalidation | Pass | Pass — E-01/03 | Pass — cancel/watch token plus generation/channel recheck | Confirmed | Retain cancellation during in-flight observation. |
| BEH-005 | Other platforms | Pass | Pass — native policy source | Pass — managed modes stay excluded from native immediate install path | Confirmed | Existing native suites/copy unchanged. |

## Supplemental Artifact Coherence Verdict

No normative supplements. Handoff and FU-001 are clear and consistent on scope/approval/routing. FU-001 remains an out-of-scope Mac timing question, not required work. One core-artifact inconsistency is included in AR-001: design's blanket resumption mitigation conflicts with the requirements' explicit non-reliance on resumption and does not cover application runs.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Current posture assessment present | Pass | Behavior Change, intentional previous quit-only policy | None |
| Root cause explicit/evidence-backed | Pass | `automatic` currently couples consent, record kind, ending and stop-failure policy | None |
| Refactor decision explicit | Pass | Split consent/ending; extract shared busy facts; move managed composition | None |
| Decision supported by concrete design | Pass with contract correction | File map and examples are actionable; reminder omission cannot become safe-zero | AR-002 |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Check/download/verified stage → watch → session stop/activate → R + exit 76 → launcher → automatic outcome | Pass | Pass | Pass | Pass | Pass | Pass | Fail — admission consumes stale safe result (AR-001/002) |
| DS-002 | Watch → authenticated own-node query → composition → process/application observation → result | Pass | Pass | Pass | Pass | Pass | Pass | Fail — incomplete inspection not represented (AR-002) |
| DS-003 | User Quit → Electron lifecycle → session → settled activation → closed | Pass | Pass | Pass | Pass | Fail — starts at late will-quit | Pass | Fail — AR-003 |
| DS-004 | Quiet check → async count → notify or retry; token cancellation | Pass | Pass | N/A | Pass | Fail — no post-await quiet check | Pass | Fail — AR-001 |

Session should remain the activation/ending owner. SafeRestartMoment owns the entire observation/revalidation loop, not activation. Server owns completeness of its busy observation. Electron lifecycle wiring must deliver Quit intent before closing windows, not invent it from absence of a reopen request.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ManagedUpdateSession | Pass | Pass | Pass | Pass structurally | Only owner may stop/activate/reopen. AR-001/003 repair inputs/order. |
| Busy-query boundary | Pass | Pass | Pass | Fail semantically | An authoritative safe-zero requires complete observation, AR-002. |
| Application scope | Pass | Pass | Pass | Pass | Exposes count, not its private manager. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Explicit? | Direction Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Session → watch/shutdown/writer/channel | Pass | Pass | Pass | Pass | No watcher/renderer activation call. |
| Main → own-node HTTP → count composition → each manager | Pass | Pass | Pass | Pass | No reading reminder JSON or server internals from main. |
| Recorder/count → shared observation | Pass | Pass | Pass | Fail contract, not direction | Share facts, not lossy consumer policy (AR-002). |

Composition/collaborator rule: **Pass**. Managed dependencies constructed together; credential read per call. Existing process manager singleton is resolved at composition boundary and throws if absent (`agent-run-manager.ts:86–90`); application manager stays injected through host contract. No new process binding or hidden cycle.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Clear? | Responsibility Singular? | Identity Shape Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `finish(..., {consent, ending})` | Pass | Pass | Pass | Low | Pass — explicit dimensions; ensure ending covers every exit. |
| `watch(onSafe)/cancel()` | Pass | Pass | Pass | Low | Fail — callback currently promises more freshness than its sequence supplies (AR-001). |
| `countBusyRuns`, application count, `GET /rest/busy-runs` | Pass | Pass | Pass | Low | Fail — complete zero vs unknown absent (AR-002). |
| `fetchBusyRunCount` | Pass | Pass | Pass | Low | Pass locally — null on failed HTTP is useful, but cannot recover information the server drops. |

Empty-indirection check: **Pass**. HTTP function is an I/O boundary; timing owner and managed composition have real responsibilities. No extra generic service/framework needed to address findings.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Checked? | Reuse/Extension Sound? | New Support Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stage/activation/reopen/outcome | Pass | Pass | N/A | Pass | Existing session/writer/channel/record retained. |
| Busy observation | Pass | Fail as specified | Pass | Fail | Recorder is best-effort; safety predicate must preserve unknown (AR-002). |
| Quiet period | Pass | Pass | Pass | Pass structurally | Distinct from native installer readiness; AR-001 corrects loop. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Clear? | Reuse/Extend/Create Decision Sound? | Supports Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron application/updater/server transport | Pass | Pass | Pass | Pass | Session, input, timing and HTTP are separate bounded concerns. |
| Agent execution / application scope / REST | Pass | Pass | Pass | Pass | Shared observation without exposing scope internals; completeness contract needs correction. |
| Renderer/localization | Pass | Pass | Pass | Pass | Copy only, no new restart authority. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Evaluated? | Shared File Choice Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Busy predicate/inspection | Pass | Pass | Pass | Fail — AR-002 | Shared observation must retain unavailable/timeout; recorder and admission apply different policies. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Controlled? | Core/Variant Choice Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| consent / ending | Pass | Pass | Pass | Pass | Pass | Cleaner than overlapping booleans. |
| activation mode union | Pass | Pass | Pass | Pass | Pass | Native vs managed-restart vs channel-unavailable managed-quit. |
| Busy count / inspection result | Fail | Pass | Pass | Fail | Fail | A number must not silently encode incomplete observation as zero. |

Derived consumers: **Pass** inventory — state store, three copy consumers, native policy, updater, recorder, process/application counts named. Domain vocabulary: **Pass** with planned glossary changes. Correct “recorder and count must agree” to shared busy meaning, not identical omission policy.

## File Responsibility Mapping Verdict

| File | Responsibility Singular/Clear? | Matches Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `managedUpdateSession.ts`, `managedUpdates.ts`, `electronApplication.ts` | Pass | Pass | Pass | Pass | Root shrinks; lifecycle correctness is AR-003, not another coordinator. |
| `userInputActivity.ts`, `safeRestartMoment.ts`, `embeddedBusyRuns.ts` | Pass | Pass | Pass | Pass | Observation, timing and transport separated. |
| `busy-runs.ts`, recorder, application scope, count composition/REST | Pass | Pass | Pass | Pass | Revise observation result/policy at these existing boundaries. |
| Updater/types/components/locales/docs/glossary | Pass | Pass | N/A | Pass | Scoped derived changes, no new UI flow. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Clear? | Folder Matches Owner? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing Electron/server/application-platform folders | Pass | Pass | Low | Pass | No new broad shared folder or misplaced data owner. |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece Named? | Replacement Owner Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Overloaded automatic flag and old managed-only timing assertions | Pass | Pass | Pass | Pass | Clean replacement, all session callers updated. |
| Recorder inline busy derivation | Pass | Pass | Pass | Pass with AR-002 | Remove duplication, preserve reminder behavior and its tests. |
| Old managed copy / composition block | Pass | Pass | Pass | Pass | No permanent parallel policy. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual Path Retained? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Managed auto behavior | No | Pass | Pass | Quit-only retained only for current missing-channel capability, an approved scenario, not version compatibility. |
| REST/current app contract | No | Pass | Pass | Co-released main/server; no old-server compatibility required. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Reader/Semantic Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Notification outcomes and blocked version | Not Affected | Pass — E-08 | Pass | N/A | Pass | Existing automatic attempt/failure/read tracking used. |
| Settings/profile/server data | Not Affected | Pass | Pass | N/A | Pass | No schema or migration requested. |
| Reminder record | Existing output preserved | Pass — E-04 | Pass | N/A | Pass only with AR-002 policy separation | Do not silently change recorder persistence to fix admission. |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup/Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server extraction then route | Pass | Pass | Pass | Fail until unknown semantics specified |
| Session split then watcher/composition | Pass | Pass | Pass | Fail until AR-001/003 specified |
| Copy/tests/docs and isolated guest | Pass | Pass | Pass | Pass plan; no evidence claimed |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Consent/ending split | Yes | Pass | Pass | Pass | Concrete three call forms. |
| Safe callback | Yes | Fail completeness | Pass | Fail | No input recheck after await; AR-001. |
| Quit during restart | Yes | Fail ordering | Pass | Fail | Uses late event; AR-003. |
| Unknown count | Yes | Pass at HTTP edge only | Pass | Fail | Missing server inspection outcomes; AR-002. |

## Material Premise Validation

These refine already-approved SCN-002/003/004 and unknown-state handling; no new scenario or threat policy.

### MP-001 — input during the asynchronous safe-moment query
- Authority / behavior: REQ-002, AC-003; BEH-001; User.
- Independent trigger: user resumes typing/mouse use in an AutoByteus window while a verified update waits (SCN-003).
- Forward path: watch sees five-minute quiet → fetch awaits node/inspection (up to five-second HTTP timeout) → input updates lastInputAt → response count=0 → current DS-004 calls onSafe → session checks stage/settings but not input → shutdown starts.
- Preconditions/consequence: valid pending stage and zero busy runs; input is recent when the automatic stop starts. No artificial hidden-state mutation required.
- Reachability: **Reachable**. Correct post-await ordering within the watcher; AR-001.

### MP-002 — supported snapshot background work is not observed within budget
- Authority / behavior: REQ-002, AC-002, unknown-busy design rule; BEH-001; System/Contract.
- Independent trigger: a Codex run executes background shell work while otherwise idle, explicitly within REQ-002's protected work.
- Forward path: snapshot-only background inspection → new route delegates to extracted recorder inspection → one-second budget expires before the existing up-to-five-second reader completes → recorder semantics omit candidate → numeric sum can be zero → automatic restart interrupts work.
- Existing contract evidence: E-04/05 and recorder timeout test; no assumption of hostile corruption or arbitrary runtime failure needed. The supported reader also returns unavailable; that is not an empty snapshot.
- Reachability: **Reachable**. Preserve observation completeness through count; AR-002.

### MP-003 — intentional Quit is received before will-quit
- Authority / behavior: REQ-004, AC-004, SCN-004; BEH-002; User.
- Independent trigger: user invokes Quit while an automatic activation is awaiting completion.
- Forward path: app.quit → before-quit → closing windows → later will-quit. In the interval, activation/status continuation can complete and write R/exit76; current wiring has not told the session about Quit.
- Evidence: E-01/02/03; Electron distinguishes these events and exit bypasses both. [Electron lifecycle contract](https://www.electronjs.org/docs/latest/api/app#event-before-quit), [pinned Quit/Exit implementation](https://github.com/electron/electron/blob/v42.11.16/shell/browser/browser.cc#L112-L151)
- Reachability: **Reachable**. Latch intent at the earlier observed request and honor it through terminal settlement; AR-003. This does not demand processing an OS input that arrives after process exit.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Fresh safe-moment result | User input can resume during HTTP; count can age during inspection | AR-001/002 | Open |
| Quit observation/settlement | will-quit is not receipt of the Quit request | AR-003 | Open |
| ASM-001 | Actual Wayland input delivery across views not yet tested | Keep packaged input proof; source contract is plausible, not a GUI pass | Downstream validation, not an additional blocker |

## Review Decision

**Fail — Design Impact.** Three bounded corrections are required before dependent implementation. Ownership/refactoring direction is sound; the issue is lifecycle/observation semantics, not a need for broader architecture.

## Findings

### AR-001 — quiet eligibility is stale after the busy query
- Type/severity: **Design Impact / High**; Within Approved Scope.
- Authority: REQ-002, AC-002/003, QR-001; BEH-001. Changes approved behavior: **No**.
- Evidence: DS-004 (`design-spec.md:175`) checks quiet only before awaiting the count. The exhaustive safe-callback rechecks at `:356` check stage/generation/settings/block, not input. MP-001 establishes ordinary reachability.
- Concrete consequence: automatic shutdown can begin while the user is actively typing, despite the five-minute rule.
- Required update: SafeRestartMoment owns quiet check → asynchronous busy observation → current watch-token AND fresh input/quiet revalidation → immediate notification, otherwise rearm. The session then performs its existing synchronous intent/stage/consent rechecks before starting shutdown. Specify rechecking live run status after awaited server inspections too, so known mid-read transitions are not discarded. Name the admission boundary explicitly; do not justify stale observations by future resumption.
- Correct related tradeoff `:345`: the recorder does not cover application-owned runs (E-04), and the approved requirements explicitly do not rely on resume. Remove the blanket “so it is not lost” claim. Any intended relaxation of safe timing must go through Solution Designer's requirements authority, not be assumed by implementation. No distributed lock/new work-admission subsystem is prescribed by this finding.
- Evidence to add: controlled pending-query case with fresh keyboard/mouse input and zero reply must defer; once the new quiet period holds it restarts without a click. Also cover a run turning busy during inspection before the count completes.
- Proportionate response/recipient: local loop/contract correction in DS-001/002/004, `/solution_designer`.

### AR-002 — best-effort reminder inspection is not a safe zero-busy result
- Type/severity: **Design Impact / High**; Within Approved Scope.
- Authority: REQ-002, AC-002, QR-001; BEH-001 and specified unknown-means-wait behavior. Changes approved behavior: **No**.
- Evidence: DS-002 and `countBusyRuns(...): Promise<number>` reuse bounded recorder inspection; E-04 explicitly omits non-snapshot/timeouts and catches errors. E-05 has first-class unavailable outcomes. Client HTTP failure → null cannot detect a successful but incomplete numeric count. MP-002.
- Concrete consequence: ordinary idle Codex background work can be omitted and returned as zero, authorizing an interrupting restart. The design never specifies changing this inherited omission policy for safety admission.
- Required update: share busy facts/inspection, but preserve completeness/unavailable outcomes. Count composition and application count must refuse to certify zero when a required observation is unresolved; propagate unknown (or an explicit failed route result that main already maps to null). Distinguish supported-empty, event-stream, unsupported and unavailable; do not turn unsupported capability into permanent busy by accident. Keep recorder's best-effort omission/output unchanged under its own consumer policy. Define this across both managers, not only at HTTP transport.
- Evidence to add: slow snapshot exceeding one second, unavailable/inspection_failed, genuine empty snapshot and application-owned background run; unknown defers, later confirmed idle proceeds; recorder regression test keeps prior behavior.
- Proportionate response/recipient: refine extracted observation contract and its consumers, no new record/schema/framework, `/solution_designer`.

### AR-003 — Quit intent is captured after the window-closing interval
- Type/severity: **Design Impact / High**; Within Approved Scope.
- Authority: REQ-004, AC-004, DEC-003; BEH-002. Changes approved behavior: **No**.
- Evidence: DS-003/example `:318` latches quitRequested in willQuit; E-02 wires that to Electron will-quit only. E-03's before-quit handler only updates native-policy bookkeeping. MP-003 and Electron lifecycle/source establish an earlier request boundary.
- Concrete consequence: user Quit can already be in progress while writer completion sees quitRequested=false, writes reopen and exits76, reopening against the user's action.
- Required update: composition delivers the early Quit request (e.g. before-quit) to the managed session; session latches/cancels the watch before asynchronous window closing. Keep one activation transaction and do not interrupt a writer dispatch. Session selects the final closed/reopen outcome only after settlement, honoring the latched Quit in success, confirmed-old and failure settlement; do not leave a received Quit parked indefinitely in failed-restart. Distinguish its own terminal quit/pass-through from an independent request; do not start a second shutdown/activation. Launcher protocol stays unchanged.
- Evidence to add: before-quit received while activation/status is pending, with will-quit intentionally delivered later: no R/exit76, exactly one activation; also failed settlement after captured Quit and ordinary no-Quit restart. A unit test calling willQuit directly is insufficient to prove event ordering.
- Proportionate response/recipient: correct composition/event order and session ending, `/solution_designer`.

## Classification

**Design Impact**, not an unapproved feature request. Medium / High classification unchanged. If correction changes intended safe-moment semantics, obtain the appropriate renewed approval before returning a revised design.

## Recommended Recipient

`/solution_designer` only. Do not forward this failed package to implementation.

## Residual Risks

- Actual packaged old→new signed automatic restart, busy deferral followed by no-click reopening, input quiet period and intentional Quit still require AC-011 guest evidence. No suite, build or live desktop claim is made here.
- Retain opt-out/channel/stage invalidation, block persistence, unknown activation no-second-server behavior and other-platform regression checks. Source reading supports the split, not completed executable behavior.
- Preserve no-release/no-user-installation modification boundaries; use disposable test trust and data only.
- FU-001 remains the existing out-of-scope Mac timing question; no new follow-up created.

## Latest Authoritative Result

- Review Decision: **Fail — ARCH-REV-001**.
- Material-Premise Gate: **Pass** — all finding premises are independently reachable within approved scenarios.
- Notes: SR-001/002, Medium / High. **AR-001, AR-002, AR-003 open**; revise then return for independent re-review.
