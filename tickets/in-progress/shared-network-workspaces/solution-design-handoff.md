# Acceptance Alignment Handoff — SR025 / resume API007

**Approved SR025 / DEC017. Acceptance-topology alignment complete; resume testing directly.**
Package shared-network-workspaces / AutoByteus NFS; Task
project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63. Original requester /project_task_manager
(run project_task_manager_a5f6d9d306e54970bafdad895bdf731d).

## Settled user direction, not a test-review gate

User accepted ONE VM with TWO Docker nodes after API explicitly explained that this defers
Mac↔Linux/separate-kernel qualification, not Pass. Exact exchange:
`evidence/api-e2e/api-rev-007/scope-alignment-handoff.md`; recorded approval:
`approval-record-sr025.md`. User additionally objected here to tester→Designer verification
loops. The outdated SR024 wording is now corrected in canonical requirements/design.
No further approval question, architecture/source review or implementation dispatch.
**API/E2E owns test execution, ledger, evidence validity, confidence and verdict.**

Original goal remains a guided persistent service sharing the actual chosen source through
ordinary files, preserving source/private/selected-node state, lifecycle and healthy APIs/
previews. Product platform targets are unchanged; this narrows current proof/acceptance.

## Current required scope

Execute the comprehensive API-owned **L01–L26** active ledger in
`api-e2e-test-case-ledger.md`, mapped to requirements DEC017 / IV-F01–F06 / AC001–020:
- One owned Ubuntu/ext4 VM, two actual public-launcher managed Docker application nodes A/B.
- Native Linux (LN) and Docker-on-Linux (LD) storage sequentially. Initially A-only with B
  unselected for preservation, drain/detach then select A+B. No third app node needed.
- Public setup, actual original NFS source/mount/nonroot identities; both A→B and B→A plus
  native/source controls. Exact text/binary/Unicode/empty/1KiB/1MiB; all operations/listing/
  metadata, <=5s committed fresh visibility, concurrent independent files, coordinated
  Git/same-file edits, exclusive create, documented locks/symlinks/execute/permissions.
- Private-state/config/image/volume preservation, restart/upgrade/recreation, ordinary VM
  reboot availability before manual reconnect/start, Stop/policy controls, repeat/reconnect,
  real source replacement refusal/exact restoration, busy/drain refusal and safe detach.
- Actual filesystem GraphQL/REST/terminal and healthy media/HTML-relative-assets previews,
  reload/reopen/unsaved-buffer preservation, Guide/local regressions, complete cleanup.
- Keep every required case; reuse prior evidence only at justified exact build/mode/path
  scope. Record all failures, skips and limits. Setup/build success is not functional Pass.

Two node processes may share a daemon/kernel NFS mount. Record that limitation; do not
claim independent NFS clients, kernels or physical hosts. Plain host bind mounts, copied
reads, manual product mount/export/state repairs or security relaxation are not substitutes.
Tests/harness updates are appropriate; no production-code change is requested. An actual
new defect uses normal failure-origin routing, not silent scope reduction.

## Deferred, not Passed

DEC017/IV-D04 explicitly defers Mac/native-Mac/managed-Mac-client cross-node matrix,
Mac↔Linux, independent-kernel/client interoperability, external-computer public join and
independent-host allowlist denial. Public join parser/refusal and local permission/privacy
regressions remain required. API006 Macguest TCP22 timeout/TCP2049 no-route remains evidence
of missing old-topology proof, NOT a fixed defect or Pass; it no longer holds this agreed
one-VM matrix. Existing native-Mac boot/source-replacement evidence stays narrowly valid.

IV-D01 physical/private LAN, IV-D02 authenticated-agent/tool/asset/peer-close/restore/artifact
journeys and IV-D03 personal commands remain deferred. No agent-profile/physical-access
questionnaire for these file tests. IV-R01 publication/signing/notarization/advertised-
platform/public-bootstrap gates unchanged. No release, new credentials/cost, host bridge/
firewall/OS/live-node authority. D001 outage hardening deferred/not fixed; IMP-D001 current
private-source/AGY policy and existing PM-owned FUP001 unchanged.

## Source, workspace and custody

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`, branch
`codex/shared-network-workspaces`, base origin/personal@f13bdd0eb79aacc63dffa5995b9c86f359001468,
finalization origin/personal. Input commit a6c274d96f75008ac560715795c9bac90e2a3cfd.
Source **d3c88f37c30ee74a89a95a4f6906992667c9b875 / IR009**, technicalSR023/ARCH007 unchanged.
Cumulative Large/High; no new architecture package. ARCH008 accepted earlier SR024 only;
CRR013 source Pass100, API006 historical Blocked67.86 and API007 preparation/build-only are
separate authorities. No CRR014 or completed new API verdict/test-review result.

API007 reports current image sha256:a790be37c80041d93f510dff82552b4272965aaa570bd7937f225d0bfa3d91d2,
tag ab-nfs-api007-server:current. No functional proof from that build. Mac clone retired;
Linux clone ab-nfs-api007-linux-b72ac1ef stopped after interruption. Corrective
`evidence/api-e2e/api-rev-007/scope-change-cleanup-correction.json` governs over premature
initial cleanup text. Reusable clone/cache/scratch at
`/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab-nfs-api007-ejvzqfh7` and image remain
API-owned for resumption/final L26 cleanup; recheck their actual state before resuming.
Designer did not touch these resources. Old public caches/23 candidates/286 dist files
remain outside Designer changes. No runtime tests or specialist artifact edits this round.

## Expected output and later gates

Resume API007 now; update API-owned current authority pointers to ApprovedSR025 and execute
L01–L26. Emit truthful coverage investigation/ledger/report/history/raw evidence/cleanup.
Do not send back routine test steps/results for Designer permission. Return upstream only
for a genuine unresolved requirement/design decision, not the settled topology. After
success apply your fresh rules for selected proportional cumulative af9f23/durable test-code
review, then Delivery integration/docs/available candidate entrypoint/verification/
finalization/cleanup. No immediate Delivery/TaskDone/all-platform-Pass/release claim.

Ticket root `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
Full1644 incoming references retained in evidence/acceptance-revision/sr025/package-index.json
plus current owned alignment files. Prior owned docs are immutable in git at input commit;
old solution history exact prefix. Current requirements, approval025, investigation, design,
solution history and this handoff govern. Prior approvals/reviews retain their actual scope;
API007 ledger remains API owned. Product supplement N/A; delivery not yet performed.

## Routing

Fresh designer rules match NONE: no new architecture package awaiting independent review,
no Low-risk implementation package and no delivery receipt. Return this resolved request
ONLY to `/software_engineering_team/api_e2e_engineer` under the no-match caller contract
and the user's explicit direct-API instruction. Technical design/review stays unchanged;
this is not review bypass. No architecture/source/implementation/Delivery/PM duplicate.
The exact rules/evaluation are in evidence/acceptance-revision/sr025/routing.json.
Dispatch success depends on send_message_to confirmation, not this pre-dispatch record.
