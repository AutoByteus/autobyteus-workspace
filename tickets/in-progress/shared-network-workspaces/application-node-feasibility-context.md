# Application Nodes And Easy Setup — SR-006

## Request, Authority And Status

User asks whether the experiments cover an application on another node, suggests a fresh Docker node instead of unavailable physical LAN machines, and asks how the architecture works and whether setup is one command.

Package shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63. Approved SR-004 requirements remain unchanged; SR-006 adds evidence and explanatory rationale. Overall result **Blocked — User/External Prerequisite** for complete native Mac/real multi-machine proof; not Architecture Design Complete, implementation-ready or Terminal. Full workflow context: feasibility-blocker-handoff.md in this same canonical ticket.

## Honest Coverage Answer

Earlier FR-001–006 covered filesystem component clients, not real AutoByteus applications. FR-007 now creates **two fresh actual AutoByteus Docker application-image nodes** with the default image entrypoint and independent public API endpoints. No existing user nodes/volumes or signed-in model credentials used.

Eight checks passed: workspace registration, reciprocal ordinary/application file operations, actual product terminal shells in the selected shared cwd, explicit API directory/content refresh and private-data isolation. All exact task resources cleaned. Evidence: evidence/feasibility/fr-007/probe-result.json, run-probe.py, configuration/build/console logs; report at evidence/feasibility/feasibility-report.md.

The application image is immutable digest sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a, created2026-10-12. This proves existing-image integration feasibility, not a current-worktree build. Both nodes still run in **one Mac's Docker Desktop Linux VM**. Neither a separate Mac/Linux LAN computer nor live Codex/Claude agents/skills have been tested. Native Mac mount remains blocked on scoped admin approval. FR-007 exit0 is only its scoped experiment result; REQ-016/AC-016 remain incomplete.

## How The Candidate Works

```text
One chosen storage computer, kept available
  persistent project storage + NFS service
                  |
       same authorized NFS export
        /             |              \
Mac native mount  Linux native mount  Docker daemon NFS volumes
        |             |              |
desktop runtimes   Linux runtimes     ordinary folders in each node
```

In FR-007, the server was a disposable NFS-Ganesha container backed by an owned persistent Docker volume. Docker's daemon mounted that same export into each application container at /home/autobyteus/shared; the project was /home/autobyteus/shared/project. No filesystem service/client installation or mount command ran inside either application node. The real terminal shells used normal OS writes, and the other application read and modified the same bytes.

For the supported private-network candidate, the same mechanism would connect native Mac/Linux mounts and containers to one storage service. This is an existing-engine integration, not synchronization/copying, a custom driver, special file API or conversation/messaging system. The final service-host deployment, Mac mounting mechanism, permission policy and lifecycle must still pass evidence/design gates. The test uses trusted-host sec=sys with explicit allowlist/squashing; no password-token/cryptographic user authentication or public exposure is implied.

Official basis: [Docker daemon-created NFS volumes](https://docs.docker.com/engine/storage/volumes/), [Ganesha VFS](https://github.com/nfs-ganesha/nfs-ganesha/wiki/VFS). Documentation and this local probe do not replace native-platform/LAN proof.

## Intended One-Command Experience — NOT Available Yet

Illustrative future entrypoint, **proposed name only; do not run it as an existing capability**:

```text
autobyteus shared setup
```

One guided invocation per participating computer/Docker host:
1. Choose “Create shared storage here” or “Connect to existing storage.” Creation is performed once; other computers connect to that service.
2. Provide ordinary connection information and any required OS administrator/privacy approval. Do not ask users for protocol/export/UID/cache/Docker command assembly or passwords in chat.
3. Helper provisions/connects the selected supported service, mounts the folder, configures selected managed local Docker nodes automatically, checks correct backing storage/read/write readiness, persists configuration and prints usable paths.
4. User puts/selects a project below the printed folder. No additional manual setup inside each managed container.

Illustrative output, **not a final path decision or actual installed mount**:

```text
Shared workspace ready
This computer: /Volumes/autobyteus-shared
Docker nodes:  /home/autobyteus/shared
Both locations use the same shared storage.
```

Identical absolute paths remain preferred where safe; differing paths are permitted by the user. The current container convention is used above rather than falsely promising identical Mac paths. Persistent backing data must not live only in temporary storage. The helper may need to recreate existing containers to attach configured volumes; it must first obtain explicit interruption permission, handle active work and preserve their current image/private volumes/credentials. No hot-attach or silent image upgrade promise.

This is one **product command**, not a claim the internal orchestration is one raw NFS/Docker command. Current launcher workspace paths/apply commands only cover local binds and are not the promised shared-network setup. The new helper has not been implemented; no runnable user setup command can truthfully be supplied yet.

## Remaining Action / Boundaries

Pending directly asked user questions: scoped temporary native Mac mount under /private/tmp/ab-shared-workspace-feasibility-* with OS admin approval; real separate Linux test machine OS/access and disposable-resource permission. No answers/permission inferred from this Docker question. Separate-Mac LAN support must also be proved before that scenario is advertised.

Then complete safe native/LAN evidence, common-storage identity/admission, full launch/resume/Team/Org paths, runtime skills/sandbox compatibility, safe container recreation/pinning, production permissions and actual setup/restart/cancellation design. REQ-016 holds product implementation until a defensible working solution, not just these Docker tests. Final delivery additionally requires current source executable validation, merge and explicit user verification.

Workspace / branch: /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces / codex/shared-network-workspaces. Base origin/personal@f13bdd0eb79aacc63dffa5995b9c86f359001468; finalization target origin/personal. No merge/push/release/live mounts or user-node modifications. Product/review/implementation/E2E/delivery artifacts N/A — not yet applicable, not passed or bypassed.
