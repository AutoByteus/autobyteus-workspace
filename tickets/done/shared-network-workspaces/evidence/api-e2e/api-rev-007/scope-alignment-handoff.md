# API007 user-directed single-VM test-plan alignment

Result: **Requirement/acceptance alignment request; no new product defect and no new API
Pass/Fail/Blocked verdict.** API006 Blocked67.86 remains the last completed historical result.
Personal work only. Production IR009/d3c88f37c30ee74a89a95a4f6906992667c9b875 unchanged.
Input ApprovedSR024/ReadySR024/ARCH008 docs437c20b536b852574afb8258d4562b35b24658a1.

## Exact conversation since your handoff

User: “I think you don't have to test the two virtual machines, right? Only one virtual
machine maybe is enough. But you need to test the one virtual machine with two Docker
nodes. What do you think?” Then: “Because if testing two virtual machines is not so easy,
why do we test two virtual machines right?”

API response:
“For testing two Docker nodes sharing files, one VM is enough. It can test reciprocal
reads/writes, exact contents, visibility, concurrency, permissions and node restart/
preservation. The reason for two VMs was different: proving Mac↔Linux interoperability
across separate OS kernels. Two containers in one VM cannot establish that. I recommend
completing the one-VM, two-Docker-node tests first, and deferring cross-OS qualification
separately—not making difficult VM networking hold up those useful tests. That narrows
the current acceptance scope; it does not mean cross-OS testing passed.”

User acceptance:
“Yeah, sorry, then please make your test cases, yeah, update your test cases that you wanna
test and then make sure we do full testing. I think the test ledger, right? That's a test
ledger or test like, yeah, thanks.”

## Work completed / requested owner action

Canonical coverage investigation and ledger now contain the comprehensive **L01–L26** plan:
one owned Ubuntu24.04/ext4 VM, two public-launcher managed Docker application nodes A/B;
native Linux and Docker-on-Linux storage tested sequentially. Source/native path controls,
both reciprocal actor directions, all CRUD/list/metadata/exclusive-create/symlink/execute,
<=5s warmed publication, independent-file concurrency, coordinated Git/same-file edits,
documented locks/permissions/private separation, public setup/reconnect/restart/node
preservation/source-replacement refusal/drained detach, actual APIs/healthy previews,
Guide/local regressions, source/build identity and cleanup all remain required.

Initially select A only with B unselected as preservation control, drain/detach and select
both for main matrix. No third application node required. Infrastructure storage/registry
containers are not agent nodes. All L01–L26 functional rows are Not Tested in API007;
prior evidence will be mapped narrowly. “Full testing” means this explicit agreed case set,
not all product platforms/agents/release qualification. Same-daemon NFS volume may share a
kernel mount; do not pretend independent NFS clients/physical computers were proven.

Please record this explicit user-approved current proof/topology change in authoritative
requirements/acceptance alignment and return directly to API to execute the ledger.
Literal SR024 IV-F01–F04 still requires distinct Mac/Linux peers and both-OS clients and
must not be silently reinterpreted by the test owner. Defer those cross-OS/independent-
kernel/physical-network/external-computer-join claims, NOT Passed; keep public join parser/
refusal regression scope truthful. Existing Mac source/reboot proof remains scoped valid.
Linux choice is the simplest owned one-VM Docker execution environment, not a product
support change. No new technical mechanism, architecture/source rereview, implementation
dispatch, approval questionnaire, delivery, TaskDone or release requested. This is the
user's accepted narrowing after API explained exactly what it cannot establish.

## Preparation, interruption and cleanup

- E7/input-audit.json preserves1618 incoming refs,23 retained candidates and286 old dist files.
- SHA-verified Tart2.41.0 --net-fd capability downloaded; never executed a two-VM peer test.
- Current full tracked server image build succeeded; image
  sha256:a790be37c80041d93f510dff82552b4272965aaa570bd7937f225d0bfa3d91d2,
  tag ab-nfs-api007-server:current. This is build evidence, not file/API proof.
- Mac test clone boot/package preparation only, no NFS/managed-node setup; stopped/deleted.
- Linux preparation advanced during interruption before stop. Exact Linux VM subsequently
  stopped; corrective receipt scope-change-cleanup-correction.json governs. Initial cleanup
  purpose text prematurely said no running VM; retained, not concealed.
- Retained stopped Linux clone ab-nfs-api007-linux-b72ac1ef and private cache under
  /var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab-nfs-api007-ejvzqfh7;
  current image/tag retained for resumed testing. API owns final L26 cleanup. No guest,
  download orchestrator or new test app is intentionally running after the correction.
- Public Mac image cache, prior candidate bytes and untracked dist trees untouched.
  No host bridge/firewall/OS edits, user nodes, credentials or paid inference.

Fresh rule: Requirement Gap/Design Impact/Unclear upstream acceptance issue -> only
/software_engineering_team/solution_designer. Not a failure-origin or successful-test
review. Complete cumulative index attached; do not duplicate dispatch.
