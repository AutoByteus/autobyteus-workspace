# Lazy configured restore validation package

Import this directory through `importAgentPackage` with `sourceKind: LOCAL_PATH` **only into a test-owned server**. Contains one shared Agent, a flat three-member Team, and a coordinator-free Org with three direct Agents plus that mounted Team. All names use the AORG Validation prefix. No credentials, runtime IDs, launch defaults, user data or legacy schema versions are supplied.

Choose an actually available runtime/model at launch. Fresh launches should prepare no configured Agent before work. Send marker A to worker/direct/team worker, retain used and never-used members, keep browser open across restart of the owned server, send marker B to one retained member, then explicitly address another member. Verify exact local/provider IDs and history, actual backend candidate/run counts and rendered status. Never treat Idle as model reasoning. Peer/task tools are for explicit single-call probes only; no autonomous workflow. Attachment probes must use test-owned files.

Durable fixture for AC-001–005 of AORG-FOLLOWUP-20260914-001; execution evidence and limitations live in the ticket API/E2E report, not this package.
