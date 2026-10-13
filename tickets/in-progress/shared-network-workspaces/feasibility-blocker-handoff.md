# Shared Workspaces — Interim Feasibility Blocker / SR-008

## Classification And Exact Missing Prerequisites

- Outcome: **Blocked — incomplete feasibility/design evidence**, including external native Mac/real multi-computer prerequisites and a designer-owned shared runtime-skill lifecycle gap. NOT Architecture Design Complete, implementation-ready or Terminal.
- Package: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63; current evidence SR-008; Approved intended behavior SR-004.
- Owner: /software_engineering_team/solution_designer; original delegator /project_task_manager, AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d.
- Owned technical gap: prevent runtime-generated skill cleanup on one node from breaking another node’s active native skill access; experimentally validate a coherent design remedy. This finding belongs to Solution Designer, not a new product approval or a user/delegator fix request.
- Missing1: explicit approval for a temporary native Mac NFS mount under /private/tmp/ab-shared-workspace-feasibility-* backed only by a disposable loopback Docker service, administrator approval via OS, cleanup afterwards. Native NoUI attempts return EPERM; no cached noninteractive sudo. No password requested in chat.
- Missing2: a real separate Linux computer/private-network target, OS/version/access method and permission to use disposable test resources. Local Docker namespaces are not another physical machine.
- Both questions have been asked directly to the user through request_user_input_async; replies pending. Do not treat preselected options or the delegator's own answer as permission/user approval.

## User Request And Current Approved Direction

User wants ordinary whole project workspaces backed by one shared filesystem across home/private-network Mac/Linux/Docker computers. Files written through native agents/CLI tools on one node are accessible/readable/modifiable on other participating nodes without copies or attachments.

Latest user explicitly requests one very easy setup command, password only if needed, output a usable shared folder, no additional separate configuration inside managed Docker nodes, and same mount place when practical (tmp/opt are examples, not mandates; different paths explicitly acceptable). User asks for investigation/experiments until finding a working solution, then implementation. Do not lock in historical NFS/JuiceFS suggestions, public-service scope or manually administered Linux-server prerequisite.

The designer approved SR-004 intended behavior within this clarified direction after readiness: exact requirements/AC/scenarios and exact informing message in approval-record-sr004.md. This is not fabricated direct user approval of every technical detail/technology and grants no silent live storage/node changes.

## What Was Actually Done

Eleven task-owned rounds: FR-001–006 components, FR-007 application-image, FR-008/009 actual native agents, FR-010/011 causal ownership probes. Candidate: NFS-Ganesha service on persistent task Docker volume, native Linux NFS client, Docker local-driver NFS volumes for ordinary zero-capability UID10001 containers. No user AutoByteus node/volume used as a test target, and no production source implementation. FR-001–007 and causal rounds use no models/auth; FR-008/009 use real native models/quota and isolated OAuth copies from read-only existing login sources, at the user’s explicit instruction to execute actual agents.

Component FR-006:14 local component passes,1 watcher observation,1 native Mac blocked; process exit2 deliberately prevents green full-platform proof. Working cases include reciprocal text/binary operations, chmod/execute/symlinks/exclusive-create/rename,40 concurrently written distinct files, advisory locking with explicit release, client allowlist/read-only denial, sequential Git, restart persistence/reconnect and pause/recovery. Docker clients did not run mount commands or require mount privileges inside their containers: daemon-provided native volumes are a promising automatic-container integration boundary.

All Linux clients/application nodes were in this Mac's Docker Desktop VM. Actual Codex/Claude core round trips are now demonstrated in FR-009 (details below); no real second computer, native Mac mount, rendered UI/current-worktree build or implemented user setup command is demonstrated. FR-007 remains the earlier scoped application/API/PTY layer. Mac NetFS NoUI attempts returned errno1/EPERM. Do not call AC-016 or final validation passed.

Failures retained: Ganesha startup RPC registration/dependency failure; explicit-subnet Docker IP configuration prerequisite; denied export hidden as ENOENT (authorized client verified same existing path); immediate implicit-lock-release assertion failed under short leases. Later30s-lease/explicit-release/timing probe passed, but original root cause/universal instantaneous release not proved. inotify delivered0 remote events while fresh normal file reads worked. Restart+checks21.559s; pause blocked IO until restored. Actual product <=10s readiness and safe setup lifecycle remain unimplemented/unproved.

Prototype permission policy is coarse trusted-host sec=sys, explicit IP allowlist and All_Squash to service UID/GID10001; NOT selected final authentication/isolation/TLS policy or public-service support. Kerberos/keytab warnings remain in logs without a Kerberos claim.

## Constraints, Non-Goals And Risks

Preserve ordinary CLI filesystem access, whole projects, current runtime sandbox/approval policies, private app/auth/database/memory state and existing project/mount/volume data. No silent local/temp fallback, public service/SDK, auto merge, agent wake/context ingestion or resuming parked collaboration Task project_task_6f01dae7-41fe-4645-94f6-f3ba1ce54069. No automatic project migration or unapproved live-node/container recreation.

Remaining architecture investigation includes complete production launch/resume/action paths, actual shared-storage identity/admission, runtime skill-link ownership/collisions/cleanup across node-private sources, sandbox access, explorer refresh and a safe one-command lifecycle/distribution. Current launcher start_node can pull an image and force-remove containers; do not blindly reuse it on active user nodes. No authoritative design-spec or final task_size/architectural_risk classification yet; known security/deployment/concurrency impacts must not be labeled Low without evidence.

## Safety And Cleanup

All exact recorded task containers/volumes/networks removed and absence audited. No owned Mac mounts remain; compiled temp probe removed; exact task image removed after original OCI digest/label verification. Shared build cache not globally pruned. Existing user AutoByteus nodes/data/auth/mounts untouched. Dedicated worktree retained for continuation.

## Workspace, Base And Finalization

- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces.
- Branch: codex/shared-network-workspaces.
- Resolved base: origin/personal @ f13bdd0eb79aacc63dffa5995b9c86f359001468, refreshed2026-10-13.
- Finalization target: origin/personal; RELEASE.md required before any future merge/release. No integration merge/push/release/finalization performed.
- Shared default checkout/historical May worktree not used for authoring or modified.

## Canonical Absolute Artifacts And Sources

- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-doc.md — Approved SR-004 behavior/ACs, executed evidence SR-008.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/approval-record-sr004.md — exact within-direction approval/user informing message.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/investigation-notes.md — canonical factual evidence/authorities.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/solution-revision-record.md — cumulative SR-001–008 history.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/feasibility/feasibility-report.md — actual probe outcomes/limitations/failures.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/feasibility/experiment-index.json — FR-001–011 index; each round's run-probe.py, configuration, result.json and console/build logs retained in that directory.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/feasibility/cleanup-audit.json — exact resource absence/image/temp cleanup.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-approval-request.md — cumulative intake, historical holds and current update.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/setup-revision-context.md — historical SR-003 user setup clarification; superseded by current canonical requirements.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/feasibility-recommendation.md — historical SR-002 sketch, not selected architecture.
- /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/feasibility-blocker-handoff.md — this full interim result/context.
- Historical October1 transcript: /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63/context/ctx_721eefd2bded__shared-filesystem-conversation-2026-10-01.txt.
- Primary sources: https://docs.docker.com/engine/storage/volumes/ ; https://github.com/nfs-ganesha/nfs-ganesha/wiki/VFS ; upstream Ganesha core/config links and local Xcode NetFS.h authority in canonical investigation/source-references. Generic docs are not native Mac/cross-machine proof.
- Product UI/UX, design-spec, independent architecture/code review, implementation, API/E2E, delivery: N/A — not requested/not yet applicable, not passed or bypassed.

## Expected Next Output And Routing

Resolve the designer-owned runtime skill lifecycle finding through safe architecture investigation/proof, and after scoped native Mac approval/separate-machine access complete native/cross-machine experiments. Resolve integration/security/identity/setup evidence, complete authoritative design and classify actual size/risk. Only then get applicable completed-design route; REQ-016 forbids premature product implementation. This Task is unfinished; do not mark DONE or treat this as a terminal result.

Previous SR-005 handoff-rule lookup/recipient decision (2026-10-13): get_handoff_rules returned only completed high-risk/large architecture -> architecture_reviewer, completed small/medium Low architecture -> implementation_engineer, and delivery receipt evidence-gap -> delivery_engineer. NONE matches this Blocked/User-External-Prerequisite result: design is not complete and this is not a returned delivery receipt. No review/implementation route is taken. Per collaboration fallback, return the specific blocker/context to the original requesting Project Task Manager's exact AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d using send_message_to, with this same absolute file attached. No delegate_task bypass; no other recipient notified.


## SR-006 User Follow-up, Application Proof And Setup Explanation

User asks whether another application node was covered, suggests a fresh Docker node, and asks how the architecture works and whether it is normally one command. Approved intent remains SR-004; this is evidence-only, not permission for the pending privileged Mac mount or existing live-node modification.

FR-007, run ab-sf-fr007-23556918: two fresh default-entrypoint AutoByteus Docker nodes from pinned existing image sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a (created2026-10-12), with independent private data/CLI-home/workspace/browser volumes and loopback API ports. No user credentials or paid models. Owned Ganesha export plus independent daemon-created NFS4.1 volumes at /home/autobyteus/shared/project; no mount/configuration commands inside the application nodes. Nodes use current launcher's root/SYS_ADMIN/seccomp configuration, not claimed zero-capability clients.

Eight scoped checks passed (exit0): real API endpoint readiness; mounted topology and isolated homes; public workspace registration; ordinary fs A write -> API B read/modify -> ordinary A read; API A/B reciprocal file edits; real application terminal WebSocket PTYs in the selected shared cwd reciprocal write/read/modify; explicit API directory/content reload retrieves remote addition; private app-data marker stays node-local. Scoped image result is NOT latest worktree source validation, model/agent proof, native Mac mount or real LAN proof. Old FR-006 watcher/privilege/failure limitations remain relevant.

All owned FR-007 containers,13 named volumes, network and matching service-image tag removed/absence checked; original application image preserved. Prior cleanup records preserved and augmented. No live user nodes/storage/mounts/LAN exposure changed.

Candidate explanation: one persistent/available storage computer running a supported NFS service; native Mac/Linux mounts and Docker daemon-managed NFS volumes reach the same authorized export. Product helper wraps create/connect, permissions, mount, selected managed Docker integration, readiness, persistence and usable path output. Illustrative command autobyteus shared setup is **proposed and not implemented**. One invocation per participating computer/Docker host; no extra commands inside managed nodes. Existing container recreation may be needed and requires explicit interruption approval/image/private-state preservation. Identical paths are best-effort, not substitute proof of common storage. No final engine/security/deployment/design classification is claimed.

New full user-requested explanatory supplement: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/application-node-feasibility-context.md. New exact commands/config/build/console/result evidence: same canonical ticket/evidence/feasibility/fr-007/. Approval/requirements unchanged; current investigation/report/history/index/cleanup updated to SR-006. Original request/sources/approval/workspace/base/risks/next output above still apply.

Current result remains Blocked — User/External Prerequisite for complete native Mac/multi-machine proof. Questions already asked directly remain unanswered; do not substitute delegator permission. Next native platform/LAN testing needs scoped Mac administrator-test approval and separate Linux computer access. Then finish runtime/setup/security/identity investigation and formal design before any implementation-ready route; REQ-016/AC-016 still not met. No merged/delivered/DONE claim.

SR-006 rule lookup/recipient decision (2026-10-13): current get_handoff_rules again returns only completed architecture -> architecture_reviewer or implementation_engineer based on final classification, and delivery receipt evidence-gap -> delivery_engineer. NONE applies to this evidence-only/Blocked external-prerequisite outcome. No downstream route taken. Return changed evidence and the precise unresolved prerequisite to the original requester using exact AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d with this same absolute file attached, per collaboration fallback; answer the current user's architecture/setup question directly. No duplicate review/implementation request and no delegate_task bypass. Stop after required message delivery.


## SR-007 — Actual Agent Scenario Reconfirmed, Not Yet Tested

User asks how tests were done and describes the complete journey: start/select shared workspace for agent A on one node, send a writing instruction; start/select the same mounted workspace for B on another node and send a reading instruction using the same path. This is exactly existing Approved SCN-002/REQ-003/012/AC-002. Evidence-only clarification, no changed requirement approval or inferred permission for live resources/credentials. Initial two-Docker-node experiment should use identical absolute roots; cross-host best-effort path convention remains unchanged.

Truthful result: previous FR-007 used real application servers with workspace/file APIs and real PTY shells, NOT instructed agents/native Codex/Claude. No new experiment occurred in SR-007; AC-002 remains unproved. Explicit correction/explanation given directly to the user; no assertion that agents have already passed.

Planned four checks in one agent round trip: actual selected registered workspace/production launch; A writes an unpredictable fixture; B reads using native tools without file content supplied in its prompt; B modifies; A freshly reads the change. Record tool traces, actual cwd/path, node/run/runtime IDs, common mount/export identity and independent exact-byte/hash assertions. Model prose alone, a scripted CLI or manually selected terminal cwd is not native agent proof. Full native CLI requirement remains Codex and Claude per AC-002; actual test-home auth/provider access/skill/sandbox behavior must be established safely.

New supplement (Planned, not executed; owner Solution Designer): /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/agent-roundtrip-feasibility-plan.md. Canonical requirements evidence/investigation/history updated; original scope, sources, Approved SR-004 basis, prior experiments/cleanup, workspace/base/finalization and exact native Mac/real Linux prerequisites above still apply. No mounts, nodes, credentials, models, product code or live user data touched this round. No new pass count or implementation-ready claim.

SR-007 rule lookup/recipient decision (2026-10-13): get_handoff_rules returns only completed architecture routes and a delivery-receipt evidence-gap route; NONE matches this evidence clarification/current external-prerequisite blocker. No downstream review/implementation handoff. Return the current coverage clarification and precise unchanged native Mac/separate Linux prerequisites to original requesting AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d with this same absolute file attached, per collaboration fallback, then stop. Answer current user directly; no duplicate collaborator route or delegate_task bypass.


## SR-008 — Actual Native-Agent Execution And Remaining Owned Finding

Latest user explicitly instructs performing complete experiments now, rather than leaving the instructed-agent test planned. Requirements remain Approved SR-004; this does not grant permission to declare 100%, alter live mounts/storage, assume physical test access or bypass design/review/delivery.

FR-008 actual Codex writer succeeds; copied Claude login expires/refresh fails before file tools. FR-009 uses current existing Mac Claude login and node-0 Codex OAuth streamed/read only into fresh owned private homes (no values/host scratch retained, source config/Keychain not edited). Actual native Codex0.162.1/gpt-5.6-luna and Claude2.1.296/haiku inference/normal quota used. Both nodes select/register /home/autobyteus/shared/project via normal public workspace/run APIs; real agent WebSockets, not scripted runtimes or terminal-only substitutes.

Four pairs Codex->Claude, Claude->Codex, Codex->Codex, Claude->Claude complete all16 native write/read/modify/fresh-reopen stages. Last three exercise a configured skill. Reader prompts contain only path, not writer’s random fixture contents; originating reread prompt omits B’s new marker. Native tool traces/cwd/pwd and independent exact bytes/SHA256 in both mounts/backing confirm one underlying shared data object. Eight fresh runs terminated successfully. This is API/WS existing-image proof, NOT rendered UI, current source build, native Mac/LAN or final product command/delivery.

Do not report overall green/100%: FR-009 has20 named passes but exits1 when stopping one Claude agent removes the shared .claude/skills/shared-probe-e70d3907 link used by another; the surviving native Read fails. The harness stops at that failed operation; no claim the model cannot improvise recovery. Codex peer-stop probes use private source directly and do not prove shared-link lifetime. Project contents remain correct.

Root cause/proof: process-local WorkspaceSkillMaterializer Map/holders and last-local-holder cleanup authorizes unlink on a shared project. Claude bootstrap publishes these paths; session cleanup releases them. FR-010 immediate B-disappearance assertion fails due one-second cache, retained. FR-011 imports the immutable image’s unmodified component into independent node processes, public skill fixtures, verifies A unlink then polls B. Three repetitions: B still holds descriptor/private source, shared path ENOENT after1.039/1.041/1.039s. FR-011 exit2 flags reproduced product gap, not feature success.

New full evidence supplement: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/feasibility/real-agent-roundtrip-report.md; proof audit at same evidence/feasibility/native-agent-proof-audit.json; exact FR-008–011 source/config/build/console/results/turn/causal receipts indexed. Historical plan/context annotated with actual result; Approved intended behavior unchanged. No final product code patch, design-spec, size/risk classification or independent validation artifact.

All exact owned test containers, private credential/NFS/data volumes, networks and matching service-image tags removed/absence audited for all four new rounds. No local model loaded, source login edited, source-node test run, native Mac mount or user storage/node recreation. Source application image retained. No merge/release/DONE or implementation-ready claim.

Next required action: Solution Designer owns choosing/testing a safe native runtime skill-publication/discovery/cleanup boundary without silently restricting sharing to no-skills or one agent. Native Mac admin-test approval and real separate Linux access remain directly asked external prerequisites. Then finish complete topology/setup/runtime/security/identity evidence/design and proper route. No need to ask user to choose technical filesystem/ownership machinery; any actual security/scope/cost change needing them uses requirements recovery.

SR-008 current handoff-rule decision (2026-10-13): get_handoff_rules returns only Architecture Design Complete -> architecture_reviewer or implementation_engineer based on final size/risk, and a returned delivery receipt evidence-gap -> delivery_engineer. NONE applies to this incomplete-feasibility/owned-design-finding/external-prerequisite result. No downstream review/implementation route and no delegate_task bypass. Return this precise actual result/context to original requesting AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d with the same absolute file attached; the runtime remedy remains Solution Designer-owned, not a request for PM to implement it. Answer user truthfully with demonstrated core scope and remaining gaps, then stop after required delivery.

Final exact resource recheck supplement: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/feasibility/sr008-final-resource-audit.json:72 exact owned container/volume/network/image-tag checks all absent; original application image retained unchanged; no global pruning. This supports cleanup, not any missing native Mac/LAN/setup or design proof.

User-requested table presentation clarification, same SR-008: all four core pairs used writer/origin container ab-sf-fr009-e70d3907-app-a and reader/editor container ab-sf-fr009-e70d3907-app-b, both on this same Mac's Docker Desktop VM, same /home/autobyteus/shared/project path. Report/proof audit now have explicit node columns/fields; test-only ports60521/60525 and run IDs remain in the raw ledger. No new experiments or changed outcome/approval. This current request is directly from the user for a corrected table, not a new workflow handoff; current get_handoff_rules again returns only completed-architecture/receipt-gap routes; NONE matches this presentation-only clarification. Return the corrected table directly to the requesting user, with no duplicate already-delivered PM blocker notification or downstream handoff.
