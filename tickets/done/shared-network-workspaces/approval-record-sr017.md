# Requirements Approval — SR-017

Package shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63. Date2026-10-13. Owner Solution Designer. Approved artifact: requirements-doc.md, current SR017 section and REQ001–020/AC001–020, including DEC012–014. No behavior-defining supplement or external Product-owned specification.

## Authority and distinction

After the designer presented the three concrete hosting/security/validation-sequence choices and their consequences, the user said:

> Come on, instead of like you ask me for the choice, you provide your suggestion, find the reasonable answers, and then you pick the solutions, okay? That's your skill in your skill. Thanks. You use reasoning to find the most reasonable solution and then you do it. You don't have to ask me.

This is explicit authority to choose the presented reasonable v1 solution, not a fabricated Yes answer to each question. **Solution Designer approves this baseline under that direction**, recording the decisions and informing the user rather than reopening the questionnaire. Earlier SR012/SR015 approvals remain historical, not silently extended to this change.

Exact informing message in this conversation:

> I’ll make those decisions and proceed:
>
> - **Mac storage server:** native NFS.
> - **Linux storage server:** native or Docker.
> - **Clients:** Mac, Linux and Docker agent nodes, using `/Volumes/autobyteus-shared`.
> - **V1 access:** unencrypted NFS restricted to the explicitly selected trusted private network—not public access.
> - **Validation:** real two-computer testing remains mandatory before delivery, rather than blocking implementation.
>
> This avoids the unreliable Docker-on-Mac storage-server route while keeping your Mac’s Docker agent nodes included. I’ll record these choices and complete the design for handoff.

## Decisions and rationale

- DEC012: native Mac, native Linux and Docker-on-Linux storage hosting; native Mac/Linux and Docker agent clients on either OS. Defer Docker Desktop exporting a Mac source as a storage server: VFS handles fail FR038 and alternate UNFS native-client Git fails FR053/055. Mac desktop+Docker-agent usability is retained, not deferred. Platform-specific mature engines keep the product simple without inventing a portable filesystem.
- DEC013: plaintext NFS with explicitly selected trusted private address/range, all clients mapped to a nonroot data identity. No public/wildcard export, personal account system or encryption claim. The tradeoff was explained before delegation; working-first does not justify root data access, world-writable source or shared credentials.
- DEC014: existing actual native-Mac/Linux-container/agent evidence supports architecture and implementation; independent physical Mac/Linux/Docker and finished-command proof remain mandatory **before delivery**. No available independent Linux machine is inferred and no final proof is waived.
- Stable root chosen by designer: `/Volumes/autobyteus-shared`, ordinary project subfolder e.g. `/Volumes/autobyteus-shared/project`; actual alternatives may be reported if safely necessary. Identical names alone do not establish storage identity.

Whole projects including coordinated Git, same backing files, one first-use command, no extra managed-container setup, native runtime/private-state correctness, bounded diagnostics, source preservation, Nodes NFS Guide, merged delivery and explicit user verification remain. No Git prerequisite for using a folder, public service/SDK, notifications or parked collaboration Task work.

Approval does not authorize live user source/mount/node/firewall changes, unattended disruption, data loss, release, implementation from an incomplete design or bypassing independent review. Normal setup collects ordinary administrative inputs/consent at execution time. No further product-choice answer is currently needed.
