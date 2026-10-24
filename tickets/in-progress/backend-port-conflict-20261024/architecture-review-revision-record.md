# Architecture Review Revision Record

## Revision Index
| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | 1 / first independent Large/High review | SR-001, SR-002 | N/A | Fail — Design Impact | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | 2 / D2 correction re-review | SR-001, SR-002, SR-003 | Fail — Design Impact | Pass | AR-001, AR-002, AR-003 resolved |

| ARCH-REV-003 | 3 / implementation continuity finding and in-round settlement clarification | SR-001 through SR-005 | Pass (D2 only) | Pass (D3.1) | AR-001..003 retained resolved; IMP-DI-001 resolved |

## Revision Entries
### ARCH-REV-001 — Missing Windows cleanup entry and small completeness corrections
- Canonical design review report: `design-review-report.md` in this ticket directory.
- Review round and trigger: 1, Solution Designer's D1 Ready package; reviewed 2026-10-24.
- Triggering role/report: Solution Designer, `solution-handoff.md`; no prior findings.
- Relevant solution revisions: SR-001 approved R1, SR-002 D1.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail — Design Impact.
- Baseline established: approved behavior and POSIX/native ownership defects confirmed from source and supplied baseline evidence. Host scope, runtime-reference copy, early drain, bounded identity-aware cleanup, awaited quit and typed conflict recovery are directionally sound. Windows managed-tree termination is not a defined invocation of the backend-owned cleanup; D1 needs that concrete platform path. Derived status consumer inventory and touched-file dead factory removal need small amendments.

#### Prior Finding Resolution
None.

- New/remaining findings: AR-001 (High, Windows graceful shutdown entry); AR-002 (Low, status consumer dispositions); AR-003 (Low, unused cached factory accessor removal).
- Material classification changes: none; Large/High retained. All findings Design Impact within approved scope. No new behavior, prerequisite or follow-up Task proposed.
- Material premise: MP-001, supported Windows Quit/Restart path; source/primary-contract reasoning, not live Windows validation.
- Recommended recipient: Solution Designer via configured Fail/Design Impact rule. No implementation handoff.
- Remaining risks: identity/leader-adoption continuity, WSL association, collective deadline enforcement, updater continuation and changed-build product validation. Historical Nuxt ancestry remains unknown.
- Review evidence boundary: HEAD d34e2d029c86b3183e95aa9d38f47053f117b657; source/dependency inspection only; no new process probe, changed build, installation, merge or release. Raw upstream logs and authoritative requirements/design left unchanged.


### ARCH-REV-002 — D2 resolves the platform entry and completeness findings
- Canonical design review report: `design-review-report.md` in this ticket directory.
- Round/trigger: 2, Solution Designer's D2/SR-003 re-review request, 2026-10-24.
- Triggering role/report: Solution Designer, `solution-handoff.md`; ARCH-REV-001 findings AR-001..003.
- Related solution revisions: SR-001/R1 unchanged Approved; SR-002/D1 historical; SR-003/D2 reviewed.
- Prior authoritative decision: Fail — Design Impact.
- Current authoritative decision: **Pass**.
- Delta: Windows now uses child-associated IPC into a single backend shutdown owner shared with signals. Startup-stage cancellation, cleanup-authority transfer, a noncircular settled barrier, completion-plus-exit and bounded force ordering are explicit. Consumer and dead-code inventories are complete. Unaffected round-1 source evidence is retained; no production changes occurred between reviews.

#### Prior Finding Resolution
| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open / High | Resolved in design | SR-003, D2 Windows Managed-Child Shutdown Entry; E-015/016; P-006 | Independently traced runtime prerequisites/ownership transfer sites and ELECTRON_RUN_AS_NODE env; reviewed exact captured-child ready/request/result/exit protocol, original deadline, startup cancellation and force-as-failure. Node primary IPC contract plus P-006 support feasibility, not product certification. |
| AR-002 | Open / Low | Resolved in design | SR-003, D2 Direct And Derived Status Consumer Dispositions; E-017 | Explicit monitor/settings and both declaration decisions; app.vue source confirms embedded RUNNING gate. Store summary and loading details have distinct presentation purposes, one shared type. |
| AR-003 | Open / Low | Resolved in design | SR-003, D2 Removal Plan; E-018 | Named cache/accessor removal; independent git grep still finds only declaration at factory:502. Explicit provider builder remains authoritative. Implementation must confirm references/build after deletion. |

- New/remaining finding IDs: None.
- Material classification changes: none; Large/High remains appropriate. R1 unchanged; no new product policy or Task proposed.
- Material-premise gate: Pass. MP-001 remains a supported Windows form of orderly Quit/Restart, now addressed by the target path.
- Recommended recipient: Implementation Engineer under the configured primary pass rule.
- Remaining risk/evidence boundaries: process identity and WSL group association, startup-stage cancellation/finally handling, result/disconnect/exit ordering, deadline enforcement, updater continuation, status freshness, real server and changed desktop proof. No installed app use, Windows certification, implementation, merge or release is claimed.
- Reviewed package commit: 0f4750aab6c5a150d0db665c22d75734468eeb87. Only reviewer-owned report/history changed in this round; upstream evidence/design/requirements remain untouched.


### ARCH-REV-003 — Continuous ownership and bounded terminal settlement
- Canonical report: `design-review-report.md` in this ticket directory.
- Round/trigger: 3, Solution Designer's D3/SR-004 package following Implementation Engineer IR-001/IMP-DI-001; review continued on D3.1/SR-005 after a concrete settlement question. Reviewed 2026-10-24.
- Related revisions: SR-001/R1 unchanged Approved; SR-002/003 historical; SR-004 anchor correction and SR-005 exceptional completion reviewed.
- Prior authoritative decision: Pass for D2 only (ARCH-REV-002). This was not approval of D3.
- Current authoritative decision: **Pass for D3.1**.
- Delta: actual fast-shell survivor observations disprove snapshot-only ownership continuity. The revised launcher establishes a gated persistent exclusive anchor before user code; scope owns stop/release and empty-group retirement. POSIX Node/IPC and WSL bash/setsid mechanisms retain separate command and anchor lifetimes. SR-005 explicitly assigns terminal completion to launcher, stop/fallback to scope and public TerminalResult mapping to executor, without circular waits or equating completion with cleanup.

#### Prior Finding Resolution
| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved in D2 | Remains resolved | SR-003 retained in D3.1 | Captured-child Windows IPC, shared startup-aware shutdown owner, result-plus-exit and bounded force remain explicit; native anchor correction does not bypass this path. |
| AR-002 | Resolved in D2 | Remains resolved | SR-003 retained consumer table | ServerMonitor/ServerSettingsManager and both ambient declarations still dispositioned; typed store/status behavior unchanged. |
| AR-003 | Resolved in D2 | Remains resolved | SR-003 retained removal plan | Dead cache/accessor removal still explicit; no production source change invalidates independent reference evidence. |
| IMP-DI-001 | Open implementation Design Impact on D2 | Resolved in design | IR-001; SR-004/005; E-019..021; P-007/008 | Independently read current executor/resolver and IMP-02 actual adopted survivor/non-overlap evidence. Verified gated fixed anchor, independent group/session/birth proof, result versus lease lifetime, retirement and no numeric recovery. Candidate tests support local feasibility, not production or WSL success. |

- In-round question: forced group KILL can remove RESULT emitter; who settles the public tool? Solution Designer accepted the underspecification and added SR-005 before the completed verdict. Launcher once-only terminal latch and STARTED failure, scope pre-signal intent/bounded finishStop without waiting for completion, executor truthful timeout/interruption/failure mapping and partial output are now canonical. No new open AR finding assigned.
- Material-premise gate: Pass; MP-002 traces ordinary run_bash survivor/timeout triggers through production code, not backwards from the proposed anchor. MP-001 Windows orderly entry remains supported.
- Classification: Large/High retained, Pass. No requirement change, prerequisite or follow-up Task established.
- Remaining risks: actual WSL and Electron packaging, admission/retirement/force races, terminal/control framing and output ordering, collective budgets, startup cancellation, updater continuation and complete UI/host acceptance. Tests must assert cleanup independently from command completion. Existing old-defect probes are not regression success.
- Recommended recipient: Implementation Engineer via configured primary pass rule, carrying D3.1 and current review artifacts; do not use ARCH-REV-002 as authorization for the changed mechanism.
- Reviewed package commit: fb0de461cd551f3426b653f89c3516395efca9f8. Source/doc/primary-contract review and supplied evidence review only; no new runtime test/build, production edit, installed-app operation, merge or release. Only reviewer-owned report/history changed; upstream and implementation artifacts preserved.
