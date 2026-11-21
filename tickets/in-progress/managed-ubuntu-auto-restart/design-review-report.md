# Design Review Report — autobyteus-15

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`, approved SR-001.
- Upstream Investigation Notes: `investigation-notes.md`, F-01–09/A-F01–12; current behavior evidence retained from round 1, with SR-003/004 clarifications.
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-001–004.
- Reviewed Design Spec: `design-spec.md`, SR-004, DS-001–004 (spine IDs).
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review.md`, `follow-ups.md`; no normative supplements.
- Relevant Solution Revision IDs: SR-001 requirements; SR-002 original design; SR-003/004 corrections.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-002**.
- Current Review Round: **2**, 2026-11-21.
- Trigger: SR-003 re-review of AR-001–003; SR-004 supplied during this round to complete cross-owner observation finalization.
- Prior Review Round Reviewed: ARCH-REV-001 Fail at 7841e53020. All three findings rechecked against canonical design and unchanged source, not just revision claims.
- Latest Authoritative Round: this report.
- Current-State Evidence Basis: worktree `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-auto-restart`, branch `feature/managed-ubuntu-auto-restart`, HEAD `f36286782f5b1f822dbdd834c84c28519e7c8c56`, base `7591aa307fac13c7ca8d2bdf8059054e22cf597a`. Read native managed session, shutdown/composition, updater/policy/record, server recorder and its tests, background-task domain/Codex reader, application scope/contracts, REST registration/permissions and node-access contract. Applied DESIGN.md, TESTING.md (including changes since prior review), root/web/server AGENTS and shared design guidance. Production source and requirements are unchanged since round 1; only solution/review documents changed. No implementation or GUI validation run.

## Routing Classification Review

- Task size: **Medium**, bounded extensions/refactoring of existing application/updater/server owners. The file inventory is larger than the design's approximate count, but not a new subsystem.
- Architectural risk: **High**, unattended stop/activation, new busy-query contract and concurrent Quit/input/settings behavior.
- Classification rationale reviewed: accepted.
- Independent Architecture Review required by classification: **Yes**.
- Classification evidence or correction required: no routing correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**. Approved behavior and production paths remain unchanged; SR-003/004 now enforce the previously missing observation and Quit boundaries.
- Approved intent: opt-in managed Ubuntu restarts itself at the defined safe moment, without a second click; intentional Quit stays closed. Mac timing, manual install/opt-out and trust boundaries remain unchanged.
- Scope guardrail confirmed: managed Ubuntu lifecycle, own-node busy observation and copy; no privilege/signing/launcher change, release, user-install mutation, draft-persistence feature or Mac timing change.
- Every prior blocking finding maps approved authority: **Yes**. AR-001–003 resolved; no new findings.
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
| BEH-001 | Automatic update / safety / failures / copy | Pass | Pass — SR-001 and E-01/03–08 | Pass — fresh quiet, joint finalization, busy/unknown preserved | Confirmed | Implement and prove AC-001–003/007–011. |
| BEH-002 | Intentional Quit | Pass | Pass — REQ-004 and E-01/02 | Pass — early request latch, all-settlement ending | Confirmed | Prove actual before-quit/will-quit order, not only direct session calls. |
| BEH-003 | Manual click | Pass | Pass — E-01/03 | Pass — manual activation and shared early Quit interception | Confirmed | Keep manual consent separate; test shared ending. |
| BEH-004 | Opt-out/channel invalidation | Pass | Pass — E-01/03 | Pass — cancel/watch token plus generation/channel recheck | Confirmed | Retain cancellation during in-flight observation. |
| BEH-005 | Other platforms | Pass | Pass — native policy source | Pass — managed modes stay excluded from native immediate install path | Confirmed | Existing native suites/copy unchanged. |

## Supplemental Artifact Coherence Verdict

No normative supplements. Handoff and FU-001 are clear and consistent on scope/approval/routing. FU-001 remains an out-of-scope Mac timing question, not required work. The previous blanket resumption mitigation was removed; current design explicitly acknowledges application runs have no reminder and does not rely on it. SR-001 requirements are unchanged. SR-004 is recorded in the cumulative solution history and handoff.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Current posture assessment present | Pass | Behavior Change, intentional previous quit-only policy | None |
| Root cause explicit/evidence-backed | Pass | `automatic` currently couples consent, record kind, ending and stop-failure policy | None |
| Refactor decision explicit | Pass | Split consent/ending; extract shared busy facts; move managed composition | None |
| Decision supported by concrete design | Pass | File map/examples now preserve observation completeness and separate recorder policy from restart admission | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Check/download → verified stage → safe watch → session checks/intent → stop → writer → launcher handback → automatic outcome | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Main query → credentialed route → composition awaits both inspections concurrently → synchronous finalization in each owner → sum busy/unknown | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | app.quit → before-quit → session latch/cancel → window closing/will-quit → single in-flight transaction settles → closed or exit1 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Quiet check → async busy answer → fresh token/quiet check → busy/unknown check → same-turn session admission, or rearm | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Session remains the activation/ending owner. SafeRestartMoment owns the complete observation/revalidation loop, not activation. Server composition drives inspection then finalization, with no asynchronous gap between the two owners' finalizers. Each scope retains its manager and finalizes its own inspection. New/replaced run objects lacking a result are unknown; vanished runs are ignored. The main-side admission boundary rechecks stage/intent/consent after fresh quiet validation without another await. This is sampled observation plus an explicit admission point, not an atomic server/main admission lock; it does not promise continued idleness throughout shutdown.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ManagedUpdateSession | Pass | Pass | Pass | Pass | Only owner may stop/activate/reopen; early Quit and fresh observation feed it. |
| Busy-query boundary | Pass | Pass | Pass | Pass | Only busy=0 and unknown=0 certifies the observed safe result. |
| Application scope | Pass | Pass | Pass | Pass | Exposes inspect/finalize operations and their result, not its private manager. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Explicit? | Direction Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Session → watch/shutdown/writer/channel | Pass | Pass | Pass | Pass | No watcher/renderer activation call. |
| Main → own-node HTTP → count composition → each manager | Pass | Pass | Pass | Pass | No reading reminder JSON or server internals from main. |
| Recorder/count → shared observation | Pass | Pass | Pass | Pass | Share facts with unknown intact; recorder retains its own lossy consumer policy. |

Composition/collaborator rule: **Pass**. Managed dependencies constructed together; credential read per call. Existing process manager singleton is resolved at composition boundary and throws if absent (`agent-run-manager.ts:86–90`); application manager stays injected through host contract. No new process binding or hidden cycle.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Clear? | Responsibility Singular? | Identity Shape Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `finish(..., {consent, ending})` | Pass | Pass | Pass | Low | Pass — explicit dimensions; ensure ending covers every exit. |
| `watch(onSafe)/cancel()` | Pass | Pass | Pass | Low | Pass — token/quiet revalidated after await before same-turn notification. |
| `inspectBackgroundWork`/`finalizeBusyRuns`, application inspect/finalize, `GET /rest/busy-runs` | Pass | Pass | Pass | Low | Pass — busy/unknown preserved across both scopes and route. |
| `fetchBusyRuns` | Pass | Pass | Pass | Low | Pass — validated pair or null; no dropped uncertainty. |

Empty-indirection check: **Pass**. HTTP function is an I/O boundary; timing owner and managed composition have real responsibilities. No extra generic service/framework needed to address findings.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Checked? | Reuse/Extension Sound? | New Support Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stage/activation/reopen/outcome | Pass | Pass | N/A | Pass | Existing session/writer/channel/record retained. |
| Busy observation | Pass | Pass | Pass | Pass | Shared facts, different consumer policies; recorder unchanged. |
| Quiet period | Pass | Pass | Pass | Pass | Distinct from native installer readiness; corrected observation loop. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Clear? | Reuse/Extend/Create Decision Sound? | Supports Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron application/updater/server transport | Pass | Pass | Pass | Pass | Session, input, timing and HTTP are separate bounded concerns. |
| Agent execution / application scope / REST | Pass | Pass | Pass | Pass | Shared observation without exposing scope internals; completeness now explicit. |
| Renderer/localization | Pass | Pass | Pass | Pass | Copy only, no new restart authority. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Evaluated? | Shared File Choice Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Busy predicate/inspection | Pass | Pass | Pass | Pass | Shared observation retains all unavailable/timeout cases; recorder and admission apply different policies. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Controlled? | Core/Variant Choice Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| consent / ending | Pass | Pass | Pass | Pass | Pass | Cleaner than overlapping booleans. |
| activation mode union | Pass | Pass | Pass | Pass | Pass | Native vs managed-restart vs channel-unavailable managed-quit. |
| Busy/unknown counts and run-object inspection map | Pass | Pass | Pass | Pass | Pass | Pair exposes uncertainty; run-object key prevents a replaced run inheriting an older observation. |

Derived consumers: **Pass** inventory — state store, three copy consumers, native policy, updater, recorder, process/application counts named. Domain vocabulary: **Pass** with planned glossary changes. Shared busy meaning no longer implies identical omission policy. The inspection map is an in-memory result returned to its owning scope, not persisted data or a new runtime registry.

## File Responsibility Mapping Verdict

| File | Responsibility Singular/Clear? | Matches Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `managedUpdateSession.ts`, `managedUpdates.ts`, `electronApplication.ts` | Pass | Pass | Pass | Pass | Root shrinks; early Quit feeds the existing session, not another coordinator. |
| `userInputActivity.ts`, `safeRestartMoment.ts`, `embeddedBusyRuns.ts` | Pass | Pass | Pass | Pass | Observation, timing and transport separated. |
| `busy-runs.ts`, recorder, application scope, count composition/REST | Pass | Pass | Pass | Pass | Two-phase observation/finalization remains at existing ownership boundaries. |
| Updater/types/components/locales/docs/glossary | Pass | Pass | N/A | Pass | Scoped derived changes, no new UI flow. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Clear? | Folder Matches Owner? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing Electron/server/application-platform folders | Pass | Pass | Low | Pass | No new broad shared folder or misplaced data owner. |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece Named? | Replacement Owner Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Overloaded automatic flag and old managed-only timing assertions | Pass | Pass | Pass | Pass | Clean replacement, all session callers updated. |
| Recorder inline busy derivation | Pass | Pass | Pass | Pass | Remove duplication, preserve reminder behavior and its tests. |
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
| Reminder record | Existing output preserved | Pass — E-04 | Pass | N/A | Pass — consumer policies separated | Do not silently change recorder persistence to fix admission. |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup/Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server extraction then route | Pass | Pass | Pass | Pass — unknown semantics and scope finalization specified |
| Session split then watcher/composition | Pass | Pass | Pass | Pass — fresh quiet and early Quit/settlement specified |
| Copy/tests/docs and isolated guest | Pass | Pass | Pass | Pass plan; no evidence claimed |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Consent/ending split | Yes | Pass | Pass | Pass | Concrete three call forms. |
| Safe callback | Yes | Pass | Pass | Pass | Concrete post-await quiet/token recheck. |
| Quit during restart | Yes | Pass | Pass | Pass | Early latch, terminal pass-through, unknown outcome exit1. |
| Unknown count and cross-owner finalization | Yes | Pass | Pass | Pass | Promise.all inspections then both synchronous finalizers; complete outcome table. |

## Material Premise Validation

The reachability rulings of ARCH-REV-001 remain valid. The corrected design now handles those supported cases; no new premise expands approved scope.

| Premise | Independent supported trigger / forward path | Reachability | Current consequence |
| --- | --- | --- | --- |
| MP-001 | SCN-003 user resumes input while the pending safe-moment HTTP query awaits; input changes lastInputAt before reply | Reachable | SR-003 post-await quiet/token recheck rearms instead of notifying. |
| MP-002 | REQ-002 snapshot background work cannot be fully inspected within budget or returns unavailable; current server reader explicitly represents those outcomes | Reachable | SR-004 maps every unavailable reason, timeout and thrown read to unknown; both scopes finalize after all inspections. Missing/replaced observations are unknown, not idle. |
| MP-003 | SCN-004 user invokes Quit while activation/status is pending: before-quit precedes window closing and will-quit | Reachable | SR-003 latches before window closing; all transaction settlement endings honor it; no second activation. |

Electron lifecycle/source evidence retained: [before-quit contract](https://www.electronjs.org/docs/latest/api/app#event-before-quit), [pinned Quit/Exit implementation](https://github.com/electron/electron/blob/v42.11.16/shell/browser/browser.cc#L112-L151). New source detail checked during this round: `codex-thread.ts:141` can return inactive for a changed thread, so inactive is not a known-empty result for a still-live run; SR-004 correctly preserves unknown. Run-object keys and both-owner finalization protect the already-approved changing-work scenario, not a new compatibility or threat policy.

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking architecture. ASM-001 remains a packaged validation obligation, not a claim that guest keyboard/mouse delivery was proven by this review. Requirements SR-001 remain unchanged.

## Review Decision

**Pass — ARCH-REV-002.** SR-004 is ready for implementation. AR-001–003 are resolved in the authoritative design. This is not an implementation, test, delivery or release pass.

## Findings

None remaining. Prior-finding resolution:

| Finding | Status | Independently verified correction |
| --- | --- | --- |
| AR-001 | Resolved | DS-004 post-await token/quiet revalidation; same-turn session checks/admission; SR-004 waits for both scope inspections before synchronous finalization; new/replaced runs do not silently disappear. Blanket resume mitigation removed. |
| AR-002 | Resolved | `{busy, unknown}` through server/application/main; run-object keyed inspection map; all unavailable reasons including inactive and missing entries are unknown; unsupported/complete empty remain distinct; recorder one-second omission policy retained, safety six-second inspection and main ten-second timeout explicit. |
| AR-003 | Resolved | before-quit delivery, latch and watcher cancellation, passingQuit for own terminal quit, one settlement helper for success/confirmed-old/stage-gone/cancelled baseline; unknown outcome with latched Quit exits1 instead of parking in failed-restart. |

SR-003 initially finalized per owner and treated inactive as idle. Clarifications were requested during this ongoing round; canonical SR-004 fixes both. There was no separate completed review result on SR-003 alone. Required tests explicitly cover input during pending query, cross-owner delayed observation, new/replaced run objects, unknown→known-idle, recorder regressions and actual Electron Quit event order.

## Classification

No failure classification. **Medium / High** retained. The fixes enforce the approved five-minute/busy-work/Quit contracts without changing intended behavior, so no renewed product approval is required.

## Recommended Recipient

Primary `/implementation_engineer`; after successful delivery, informational `/solution_designer` according to the returned handoff rules.

## Residual Risks

- Actual packaged old→new signed automatic restart, busy deferral followed by no-click reopening, input quiet period and intentional Quit still require AC-011 guest evidence. No suite, build or live desktop claim is made here.
- Retain opt-out/channel/stage invalidation, block persistence, unknown activation no-second-server behavior and other-platform regression checks. Prove the two-phase observation and all Quit settlement paths, not just a passing quiet timer. Source reading supports the design, not completed executable behavior.
- Preserve no-release/no-user-installation modification boundaries; use disposable test trust and data only.
- FU-001 remains the existing out-of-scope Mac timing question; no new follow-up created.

## Latest Authoritative Result

- Review Decision: **Pass — ARCH-REV-002**.
- Material-Premise Gate: **Pass** — supported premises remain established and now have coherent target paths.
- Notes: approved SR-001 / cumulative design SR-004, Medium / High, f36286782f. **AR-001, AR-002, AR-003 resolved**. Ready for implementation; executable guest proof remains downstream work.
