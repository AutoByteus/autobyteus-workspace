# Design Spec — backend-port-conflict-20261024

## Solution And Approval Basis
- Current solution revision: SR-002; technical baseline D1; Design status: Ready.
- Requirements: R1/SR-001 Approved, user's application-shutdown confirmation plus Solution Designer's bounded within-direction decisions, recorded verbatim in requirements-doc.md. No behavior-defining supplements or Product Design request.
- Canonical investigation: /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/investigation-notes.md.
- Authorities read 2026-10-24: solution-designer references/architecture-design.md, design-principles.md; repository DESIGN.md, AGENTS.md, TESTING.md; relevant package instructions, web localization and isolated-instance docs; docs/design-cases.md. Design examples not used. No authority conflict.

## Current-State Read
E-001..014 and P-001..005 in the canonical investigation establish three independent problems: missing application-lifetime ownership of native command groups, false-success leader-only termination, and generic desktop conflict handling. Desktop quit also fails to await cleanup. Existing native background managers belong to transient agent contexts; ending an agent is intentionally not the requested cleanup boundary. Existing provider-specific cleanup remains authoritative. Historical Nuxt ancestry is unknown: the native reproduction is a real defect, not proof of that incident's origin.

## Task Size And Architectural Risk
- task_size: Large. Actual implementation spans core terminal ownership/execution, native backend factory injection, two server host shutdown compositions, desktop lifecycle and main→renderer diagnostic contract/UI. This classification is not based on artifact volume.
- architectural_risk: High. Process signalling safety, shared runtime ownership, shutdown races/time budgets and IPC contract changes are material. P-005 disproves the naive local fix.
- Escalation: inability to preserve normal agent/idle lifetimes, provider-specific leakage discovered, unsafe/unverifiable group identity, required persisted ownership, or inability to meet real orderly desktop shutdown requires Solution Designer refinement before dependent implementation. Do not expand to daemon reclamation or provider rewrites.

## Architecture Investigation Evidence
| Evidence | Exact source / probe (repo-relative unless URL) | Decision supported | Remaining uncertainty |
|---|---|---|---|
| E-001/006/014, P-001 | electron/server/baseServerManager.ts and serverStatusManager.ts under autobyteus-web; electron/launch-profile/e2eLaunchPreflight.ts; types/serverStatus.ts; stores/serverStore.ts; components/server/ServerLoading.vue | Distinct bounded conflict diagnosis on bind and client addresses; typed renderer consumer | Bind check cannot reserve port |
| E-002/003/007/010, P-002/003 | autobyteus-server-ts/src/compositions/build-studio-server.ts; standalone-application-host/start-standalone-application-host.ts; core AgentConfig, tool context and shutdown orchestrator | Host-scoped command lifetime; inject runtime reference, not customData; early shutdown drain | Full product shutdown not yet executed |
| E-008, P-005 | core terminal command-execution/process-group-observer.ts, shell-command-executor.ts; evidence/group-stop.probe.test.ts | Observe/stop group, not just leader; real absence and failure result | WSL runtime not tested |
| E-009/013 | electron/application/electronApplication.ts; electron/updater/appUpdater.ts; installed electron-updater6.8.9 BaseUpdater/MacUpdater; https://www.electronjs.org/docs/latest/api/app | Await orderly quit; preserve updater continuation | Windows OS shutdown events excluded |
| E-005, P-004 | production CodexAppServerClient + current CLI standalone command/exec | Preserve provider owner; no speculative Codex fix | Model-driven tools/historical version not covered |
| E-011/012 | task-owned lsof observation; electron/main.ts; isolated-instance guide | Advisory bounded inspector; validation after clean isolated launch | Cross-platform executable availability |

## Intended Change
Give native command processes an explicit application lifetime, stop and verify owned groups before successful backend shutdown, await that shutdown from desktop quit/restart, and explain external port conflicts without destructive repair.

## Change Scope
UC-001 and UC-002 only; BEH-001..004, REQ-001..006. Exact affected areas below. Shared status consumers: main error forwarding, getStatus snapshot, preload/type imports, renderer store and loading UI, status tests; update each together. Runtime AgentConfig copies must retain the same scope reference; server persisted AgentRunConfig is NOT changed. Standalone host and Studio both receive the host-scoped owner. Derived translations and recovery controls follow the new discriminated diagnostic.
Leave alone: ordinary agent/idle shutdown policy, tool cleanup orchestrator, provider runtime implementations, endpoint port choice, stored data, reset functionality for unrelated errors, release/install behavior except awaiting existing shutdown before explicit updater continuation. No data migration or installed binary edits. Follow-ups: None currently established; report newly found out-of-scope defects rather than quietly adding them.

## Relevant Behavior And Production-Path Map
| ID / kind | Requirement / AC | Trigger and current evidence | Target path / preserved outcome |
|---|---|---|---|
| BEH-001 System | REQ-001/005, AC-001/002/006 | Startup conflict E-001/006/014 P-001 | DS-001 port guard → structured failure → store/UI; normal startup retained |
| BEH-002 User | REQ-002/005, AC-001/003 | Restart while external listener lives P-001 | DS-001/003; no port-owner signal, fresh retry after manual resolution |
| BEH-003 System | REQ-003/004/005, AC-004/005 | App quit/restart with native work P-002/003/005 | DS-002/003 host-scope drain; agent-stop preview lifetime unchanged |
| BEH-004 Contract | REQ-004/006, AC-002/005/006 | Every entry | Ownership-only signalling, no data writes/reset, isolated tests and finalization |

## Relevant Supplemental Task Artifacts
Canonical inventory is in investigation-notes.md. evidence/*.probe.test.ts, native-signal-child.ts and probe.config.mjs reproduce baseline facts P-001..005; logs retain failures as well as narrowed successes. They intentionally assert bugs and are NOT durable passing regression proof. Historical attachment is read-only context, no ownership authority. No Product supplements.

## Task Design Health Assessment
- Posture: Bug Fix with application-lifetime behavior completion.
- Design issue: Yes. Boundary Or Ownership Issue + Missing Invariant; local group-termination defect as well.
- Structural triggers: lifetime outlives context owner (E-003/004); signal delivery substituted for achieved cleanup (P-005); async operation not awaited at application boundary (E-009); shared status shape cannot express recovery semantics (E-006). Adding calls in every agent shutdown would duplicate policy and violate R1.
- Refactor needed now: Yes, narrowly. Introduce one native command scope owned by host; correct the existing process observation mechanism; extract port diagnostic machinery from 491-line BaseServerManager and native configuration assembly from 509-line factory as needed to keep changed owners under500 lines. No generic process supervisor framework.
- Deferrals/residual risk: arbitrary process-group escape, crashes/power loss and ancestry of pre-existing processes remain explicitly outside R1. No silently deferred in-scope cleanup gap.

## Terminology
Owned command group: process execution target + process group established by a native command this host launched, with current identity evidence. Port owner: advisory OS observation only; never cleanup authority. Command scope: runtime-only host lifetime, distinct from agent lifetime and background-output records.

## Legacy Removal Policy / Removal Plan
| Remove | Reason | Replacement |
|---|---|---|
| Blanket catch-as-port-busy and string-matched conflict policy | Mislabels non-address errors, loses recovery meaning | Endpoint availability error with discriminant |
| Leader-only escalation and stop-success-on-signal/removal | P-005 false success; inspection failure is not absence | Verified owned-group stop result |
| Fire-and-forget will-quit stop and ineffective recursive8s timer | Electron does not await it | One cached application shutdown + quit continuation |
| Newly redundant factory/config/port assembly after extraction | One responsibility per owner; no duplicate path | Focused owned files below |
No compatibility wrapper, parallel old cleanup route or message-text fallback for the new conflict case. Existing generic errors remain generic, not a compatibility route.

## Persisted Data / State Transition Decision
Not Affected. Scope, command identities and diagnostics are in-memory only. No migration, marker, persistence journal, historical process adoption or user-data reset. Fresh process starts with fresh ownership. All prior stored schemas/readers remain untouched.

## Data-Flow Spine Inventory / Primary Execution Spines
| Spine | Scope / behavior | Chain in call order | Governing owner |
|---|---|---|---|
| DS-001 | Startup/retry; BEH-001/002 | UI restart → ServerStatusManager → BaseServerManager stop/start → endpoint availability → child launch/health → snapshot | BaseServerManager for one startup generation; StatusManager only publishes |
| DS-002 | Native commands; BEH-003/004 | Tool → context manager / shell executor → NativeCommandProcessScope reservation → spawn → register owned group → output/adoption | NativeCommandProcessScope owns process lifetime; existing manager owns tool background records |
| DS-003 | Shutdown; BEH-003/004 | Desktop quit/restart → cached stopServer → backend signal → Fastify preClose → commandScope.close → ordinary lifecycle/resources → final error/success → child exit → desktop continuation | Each host owns its whole shutdown; commandScope owns its bounded group drain |
| DS-004 | Return/event; BEH-001/002 | typed startup failure → StatusManager snapshot/event → preload → serverStore → ServerLoading translations | StatusManager snapshot; renderer presentation only |

## Spine Narratives / Ownership Map
DS-001 retains current generation cancellation and readiness logic. Availability checks both required IPv4 client127.0.0.1 and bind0.0.0.0 addresses (sequential temporary binds with guaranteed close). Only EADDRINUSE enters conflict polling; other errno fails honestly. At expiry do one bounded owner lookup, not a repeated OS-command loop. Recheck after a failed launch only after its owned child has exited; a live own backend is not diagnosed as external. Guards do not claim to reserve the endpoint.

DS-002 registers ownership at command spawn, not only when a tool finishes. NativeCommandProcessScope is created once per host, passed through process provider factory → native factory → explicit AgentConfig.nativeCommandProcessScope → context → manager/executor. AgentConfig.copy retains that reference. It is not serializable initialCustomData. Core standalone consumers may own their own explicitly constructed scope; no process-global registry. An unhosted manager's local scope is its own lifecycle, not a server fallback. Hosted factories require the supplied host scope. Both start_background_process and run_bash use it; in-flight shell commands are registered before their result/adoption. Ending an agent or losing its context does not release a live group.

DS-003 freezes new native command admissions, drains owned groups early in Fastify preClose, then executes ALL existing lifecycle/provider/resource cleanup. Native drain returns a report instead of throwing in preClose; final onClose aggregates/throws incomplete cleanup after other cleanup attempts. Startup-failure cleanup also closes the scope even if app/hooks were not fully created. Studio and standalone use the same small host-shutdown integration helper, not two versions of the policy. Direct backend SIGTERM then exits nonzero on incomplete cleanup through server-runtime's existing error boundary. Desktop observes termination, not a successful kill call.

DS-004 serializes only plain diagnostic data. All snapshots (including getStatus) carry the same current value. Restart/starting/running clears previous details. Stale async diagnosis cannot overwrite a newer generation. UI does not parse error prose to choose recovery.

## Bounded Local Spines / Concrete Termination Contract
Parent owner: NativeCommandProcessScope; states open → closing → closed, one shared close promise. Acquire an admission before spawn; register resulting ChildProcess/target identity before releasing the reservation. Closing rejects new admissions, includes already admitted in-flight starts, and has a total3s default budget (not3s per command). Do not allow late adoption to create an untracked survivor after closing.

ProcessGroupObserver remains the OS mechanism. Replace its unsafe raw-pid-only stop contract with an owned identity handle and structured outcome: stopped/already-exited/unconfirmed, reason and surviving known identities. Target includes host or exact WSL distro; equal numeric PIDs in different targets are not interchangeable. At spawn/adoption capture available birth identity (POSIX ps start-time identity with fixed locale; WSL equivalent) and process-group membership; retain live anchors as leader exits. A running ChildProcess handle is an additional ownership anchor. Before each signal, confirm live matching owned anchor(s) and current group; never signal a stale PID/group solely because its old number is present. An empty successful group observation means gone; an observation failure is unknown. Retire records only on confirmed absence, not leader exit alone. If all anchors are lost and identity cannot be re-established, fail closed rather than reclaim a numeric group.

Take a fresh group snapshot before TERM, so a child that outlives the leader remains a known anchor (P-005). Signal verified group, allow500ms graceful period, re-observe group members even if leader exited, then KILL remaining verified group and poll to deadline. Batch observations by execution target and drain groups concurrently; enforce bounded inspection subprocess timeouts (≤500ms within remaining budget), output limits and signal failures. Keep error detail, never translate inspection denial into empty. Same mechanism serves explicit stop_background_process and timeout/abort; keep their external tool semantics except that failed/unconfirmed stop is no longer falsely successful. Background output records may remain per-agent; process ownership is retained by scope independently. No per-process port scan, shell interpolation of command text, or global process-name kill.

Native stop cannot guarantee hostile daemon escape or eliminate all OS TOCTOU. Unsupported identity inspection must give a precise incomplete result, not silently downgrade to arbitrary kill. Existing WSL identity marker must be registered as soon as parsed; a close during marker acquisition cannot report clean success without confirmed child/group exit. These are required failure tests.

## Desktop Shutdown Contract
Extract a small cached shutdown coordinator under electron/application. In will-quit, preventDefault until stop settles; subsequent quit attempts reuse it. Broadcast app-quitting once; after success mark complete and resume app.quit once without recursion. Cache a Promise, not only a boolean that lets later callers return before shutdown finishes. Ordinary closing the last macOS window is still not app quit.

BaseServerManager.stopServer keeps managed-child-only authority. Use20s graceful backend budget then owned-child force termination and2s confirmation budget; no unbounded close wait. Child exit and pipe close are distinct; inherited pipe handles must not masquerade as a live backend. Nonzero cleanup exit, forced fallback or unconfirmed exit is an explicit shutdown failure, not clean restart success; StatusManager must not launch a replacement within that failed restart attempt. A later explicit retry can proceed with fresh port diagnosis. Extend equivalent Windows managed-tree stop confirmation without signalling advisory port owners.

Application stop attempts backend AND browser-runtime teardown even when one fails, aggregates failures and flushes logs.30s total desktop quit ceiling leaves bounded completion headroom; on failure/ceiling record incomplete shutdown and use nonzero exit rather than claim clean success. No recursive timer calling app.quit. Under the normal verified path, quit only follows cleanup. Forced OS kill is outside R1.

Explicit AppUpdater install continuation must await the same application stop before invoking existing quitAndInstall, because the installed updater may start installation before emitting quit. Add a prepare-for-install callback at its composition boundary; failed preparation becomes existing install error, no installation. This is lifecycle preservation only: tests use a mocked updater, no download/install. Normal auto-install-on-quit stays behind final quit; do not call app.exit(0) to bypass it. Preserve existing isolated updater-disabled behavior.

## Diagnostic Interface / UI
Extend shared ServerStatusSnapshot with optional diagnostic union: {kind:'port-conflict', port, owners: [{pid, executable?}], inspection:'available'|'unavailable', observedAt} and {kind:'shutdown-incomplete', message}. Unknown startup errors use existing message without diagnostic. Own type in types/serverStatus.ts; no duplicate renderer representation. PortConflictError holds the typed data for main-process transport; generic text stays for logs.

Port inspector is advisory/read-only: execFile lsof -nP -iTCP:<validated integer> -sTCP:LISTEN -Fpc on macOS/Linux,1000ms deadline/32KiB cap, de-duplicate valid PID/executable records, cap displayed list and string length, strip control characters. No full arguments or secrets. Unsupported OS, missing binary, permission denial, malformed/empty/racing output returns unavailable and safe guidance; do not add Windows PowerShell machinery absent need. The bind result, not inspector success, establishes conflict. Current identity is a snapshot, never a kill recommendation by number alone.

ServerLoading shows port and available executable/PID, explains Restart controls its managed backend and cannot stop another application's listener, asks user to verify and stop/reconfigure that application then retry, and states resetting server data will not free a port. Do not offer reset in conflict branch; preserve generic recovery branch. Accessible text, wrapping long names, escaped interpolation, English and zh-CN manual catalog keys. Keep technical details optional but actionable diagnosis always visible. No automatic port switch, shell command, or destructive action.

## Off-Spine Concerns / Boundaries / Dependency Rules
| Concern | Owner served | Boundary / prohibition |
|---|---|---|
| OS observation/signalling | commandScope | Existing ProcessGroupObserver; only verified handles may authorize stop; diagnostic PID cannot become one |
| Port inspection | endpoint guard | New port-owner inspector; read-only and bounded; renderer cannot execute it |
| Localization/display | ServerLoading | Existing localization runtime/manual catalogs; no shell/HTML interpretation |
| Shutdown logging | host/application | Aggregate truthful result; no command arguments or false clean message |
| Fixture management | validation harness | Exact task-owned PIDs/groups/data roots only; never installed app or29695 |
Core has no Electron/server dependency. Server composes core scope; core AgentConfig only carries runtime reference. Thin tool wrappers call managers; they must not add app-lifetime policy. Host integration helper encapsulates preClose/final report and fallback close; upstream hosts must not independently replicate stop loops. Desktop owns exit continuation, updater receives only its preparation callback. No port-to-cleanup dependency. Public scope close/admission API is authoritative; observer is internal mechanism.

## Interface / Naming / Shared Structure Checks
Scope admission/track/close uses owned command handles; background tool stop uses its manager's record identity; inspector query uses port; snapshot uses plain diagnosis. Each has one subject and explicit identity, no ambiguous generic selector. Scope results discriminate confirmed absence from unconfirmed; no duplicated boolean success beside outcome. Naming consistently NativeCommandProcessScope (all native command lifetime, including in-flight), OwnedCommandGroup, PortConflictDiagnostic. Risk Low for naming/selector ambiguity after this separation; process races remain High implementation risk. No persisted or serialized scope references.

## Capability Reuse / Allocation And File Responsibility Mapping
Draft allocation: core terminal lifetime, backend host composition, desktop startup/quit, renderer recovery. Reusable structures: owned group identity/outcome belong to terminal command-execution, diagnostic union to existing shared status type. Final mapping below replaces the draft; no generic utils or new framework. Existing terminal/host/server/application folders express the actual boundaries; flat small mechanisms within them are clearer than a new hierarchy.

| Target path (repo-relative) | Change / owner / responsibility | Must not contain |
|---|---|---|
| autobyteus-ts/src/tools/terminal/command-execution/native-command-process-scope.ts (new) | Host-lifetime admissions, owned handle registry, bounded close | Agent/desktop policy or port inspection |
| same folder/process-group-observer.ts and process-identity.ts | Verified identity, group inspection and signalling outcomes | Swallowed observation errors as absence |
| same folder/shell-command-executor.ts | Register in-flight command ownership and adoption continuity | Host shutdown orchestration |
| autobyteus-ts/src/tools/terminal/background-process-manager.ts, background-process-context.ts | Per-agent output/control records connected to supplied scope | Global server scope or per-agent app cleanup |
| autobyteus-ts/src/agent/context/agent-config.ts, agent-context.ts (+ context interface where required), src/index.ts | Typed runtime scope reference and export/copy | Serialized customData/service cloning |
| autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts; src/agent-execution/providers/agent-provider-factory-builder.ts; backends/autobyteus/autobyteus-agent-run-backend-factory.ts | Mandatory hosted scope injection; extract focused native config assembly if adding lines | Ownership discovery via global context registry |
| autobyteus-server-ts/src/compositions/native-command-shutdown.ts (new) | Shared early drain/final report hookup and startup-failure close | Provider-wide redesign |
| autobyteus-server-ts/src/compositions/build-studio-server.ts; src/standalone-application-host/start-standalone-application-host.ts | Create scope, compose injection, wire all exit paths | Copied group loops |
| autobyteus-web/electron/server/backendPortAvailability.ts and portOwnerInspector.ts (new) | Bounded availability/conflict type, advisory lookup | Process termination |
| autobyteus-web/electron/launch-profile/e2eLaunchPreflight.ts | Reuse errno-preserving address guard; retain isolation rejection | Isolated-profile bypass |
| autobyteus-web/electron/server/baseServerManager.ts, windowsServerManager.ts, serverStatusManager.ts | Startup generation, bounded owned-child stop, typed snapshots | Render copy or arbitrary PID kill |
| autobyteus-web/electron/application/applicationShutdown.ts (new), electronApplication.ts | Awaited single quit/stop continuation, deadlines | Provider process internals |
| autobyteus-web/electron/updater/appUpdater.ts | Await injected preparation before existing install continuation | Changed update feed/release policy |
| autobyteus-web/types/serverStatus.ts; preload.ts / electron/types.d.ts if signatures need update | Single serialized diagnostic contract | Runtime owner handles |
| autobyteus-web/stores/serverStore.ts; components/server/ServerLoading.vue; localization/messages/{en,zh-CN}/ manual catalogs | Fresh diagnostic state, visible safe localized recovery | Full command args, reset-as-conflict-remedy |
| Corresponding package test directories; docs/design-cases.md | Durable regression and design provenance | Baseline bug assertions presented as fix evidence |

## Concrete Shape Guidance
Good: application scope → verified group drain → final report; agent.stop leaves background preview lifetime alone. Bad: for every listener on backend port, kill(pid). Good: leader gone + live known child → verify group and escalate; bad: leader absent → return success. Good: {kind:'port-conflict',port,owners}; bad: renderer message.includes('5000ms').

## Backward-Compatibility Rejection Log
Rejected: retain old catch-all port-timeout alongside typed branch; retained stale-pid kill fallback; app cleanup via both agent hook and host scope. Clean replacement per removal table. N/A persisted compatibility: no stored changes. Generic unrelated startup errors, unhosted core usage and existing provider owners are distinct supported concerns, not parallel legacy routes.

## Change / Refactor Sequence
1. Turn baseline P-003/P-005 into normal package failing regressions; add identity/inspection failure and admission-race tests. Implement owned group observation/stop and scope; wire both native command entry forms.
2. Inject scope through runtime config/factories and both hosts, remove false cleanup success, retain all existing cleanup on failure. Test clone identity and ended-agent retention.
3. Implement awaited desktop quit/stop budgets and updater preparation, preserve cancellation/update continuation; focused tests before real app launch.
4. Extract endpoint guard/inspector and typed status propagation; update UI/catalogs atomically. Test errno/address/lookup/generation failures.
5. Package builds/typechecks and changed-build isolated desktop verification; code review and API/E2E own independent outcomes. Delivery finalizes only with evidence, no release.

## Verification Guidance (Not A Validation Result)
- Baseline command/config in investigation notes; passing those bug-asserting probes is not acceptance. Durable tests must require actual child and listener absence.
- Core real-process cases: start_background_process, run_bash adopted child, foreground command admitted at shutdown, ended/idle originating agent, multiple groups, leader exits first/child TERM-resistant, empty group, repeated close. External sentinel remains live. Verify every owned PID/group and port after completion; finally cleans only fixtures.
- Fault injection: failed/malformed/timed-out observation, recycled/mismatched identity, missing WSL marker, signal denial, pending spawn, no-close pipe, nonzero backend cleanup exit. No false clean outcome, no unrelated signal, deadlines bounded collectively.
- Server integration: actual Studio and standalone close plus SIGTERM harness with private data root/no paid provider, scope injected through production factory. Verify other cleanup still attempted after native failure. Ordinary agent stop preserves preview until host shutdown. Existing Codex/AGY/Claude shutdown tests remain controls; no new universal provider claim.
- Desktop: source-current build, private approved e2e profile roots and OS-assigned ports. Start clean (preflight rejects initial conflicts), then stop only test backend, install owned external426 listener and invoke actual Restart Server; verify visible PID/name/guidance/no reset, retry while fixture survives, remove it and recover RUNNING. If harness needs a lifecycle seam, keep it test-owned and do not weaken isolation. Also reproduce owned-command background lifecycle with actual restart AND app.quit, data sentinel intact. Screenshot/UI assertions from changed build, not installed app.
- Address variants: IPv6 wildcard reported case and IPv4 loopback initial probe finding; non-EADDRINUSE and owner lookup unsupported/empty/race/timeout; stale status clearing. UI English/zh-CN, long/control-character names and unavailable identity.
- Updater tests mock quitAndInstall and prove preparation ordering/failure; no actual update. Current source/lockfile Electron behavior checked; Windows/WSL unsupported runtime evidence reported explicitly, not called certified.
- Run relevant core/server/web suites and localization checks per TESTING.md; isolated builds may require workspace dependency order. Dependency install/nuxt setup already done; use clean env and no inherited private credentials.

## Key Tradeoffs / Risks
Explicit runtime scope adds limited plumbing but prevents orphaned per-agent state and preserves user-approved agent lifetimes. Verified cleanup can report failure where old code said success; that honesty is necessary.20s graceful desktop stop accommodates existing server teardown (historical clean exit took~7.7s), while native drain has its own early3s bound. Process inspection has OS race/permission limits; no certainty claim for arbitrary escaped daemons. A bind test can race launch; endpoint recheck is diagnosis, not reservation. macOS runtime evidence is not Windows certification. Installing this change is outside task, so installed app behavior will not change until a later authorized build/install.
