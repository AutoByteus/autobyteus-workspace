# Requirements Document — Shared Network Workspaces

## Document Status

- Status: **Draft — SR-003 automated-setup refinement; NOT Approved**.
- Package identifier: `shared-network-workspaces` / `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
- Requirements baseline / current solution revision: SR-003, 2026-10-13. Supersedes the unapproved SR-001 documented-setup proposal; SR-002 remains historical feasibility reasoning.
- Requirements owner: Solution Designer.
- Approved by / approval reference / exact approved baseline: **N/A — pending the user's explicit approval**.
- Behavior-defining supplements: None. Investigation and the historical transcript are evidence, not intended-behavior authorities.
- Authorities read: bundled solution-designer SKILL.md; references/requirements-engineering.md; requirements/investigation/revision templates; task-worktree AGENTS.md, DESIGN.md, TESTING.md and applicable server/web AGENTS.md, all on 2026-10-13.
- Canonical evidence: [investigation-notes.md](investigation-notes.md).
- Approval request: [requirements-approval-request.md](requirements-approval-request.md).

## Problem And Desired Outcome

Independent AutoByteus nodes do not currently share workspace storage across computers merely because each has a folder called “shared.” The user wants ordinary project folders backed by one shared filesystem, reachable over a trusted private network from Mac, Linux and Docker nodes. Existing runtime CLIs, shells and filesystem tools must operate on those folders normally, without copying files, attaching them to messages or switching to an AutoByteus-only file API.

The setup is now a product capability: a non-technical user runs one guided setup command per participating computer, grants necessary OS/disruption approvals, and receives a tested usable shared path. Users must not assemble NFS/client/container configuration themselves. Documentation supports this workflow rather than replacing it.

Observable success: on real Mac and Linux computers, including a Docker node, a runtime writes a file in a shared project; another node reads and modifies that same file; the originating node observes the modification. Participants use the agreed common path and the same backing storage. Failure/permissions behavior is validated, setup is documented, changes are merged, and the user explicitly verifies the result before finalization.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Evidence-backed current behavior | Proposed desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Launcher shares a local host folder with its local managed containers; no network storage provisioning was located in the inspected launcher/workspace paths. | One guided product setup invocation creates or joins the supported shared storage, configures the participating computer and selected managed Docker nodes, verifies usability and prints the agreed shared path. | Local-only workspace setup still works. | EV-003, EV-004 |
| BEH-002 | User/System | SCN-002 | Workspace selection supplies an absolute root; Codex, Claude and ACP receive filesystem working directories. | Whole ordinary projects can be used in the shared folder via existing runtime file operations. | Runtime-specific tool, sandbox and approval policies remain authoritative; cwd is not confinement. | EV-005, EV-006 |
| BEH-003 | Contract | SCN-002, SCN-003 | Matching workspace IDs/paths do not verify shared backing storage; no cross-machine consistency guarantee currently exists at this integration boundary. | The same files are accessible after successful publication/close; supported operations and concurrent-access limits are explicit. | No automatic merging, waking or conversation ingestion. | EV-001, EV-005, EV-009–EV-012 |
| BEH-004 | Operational | SCN-004 | Workspace metadata creation is not a mount/readability check; runtime resolver fallback may choose a temp path after resolution failure. | Configured shared work must not silently run in a local fallback directory when the mount is missing, incorrect, inaccessible or unavailable. | Unconfigured ordinary local workspaces and unrelated nodes are not globally blocked. | EV-005, EV-006 |
| BEH-005 | Operational | SCN-001, SCN-005 | App data, CLI homes and browser profiles are private per Docker node. | Permissions and setup/cleanup preserve private state and all existing user storage. | No sharing or deleting server databases, memories, credentials or runtime homes. | EV-004, EV-007 |
| BEH-006 | User/System | SCN-006 | Explorer snapshots and watcher streams are separate; remote network events are not proven to arrive through the current watcher. | Users can deliberately reload directory/file state to observe remote changes; watcher limitations are explained and verified. | Local explorer behavior remains supported; shared files do not imply notifications. | EV-008 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal / responsibility | Required outcome | Constraint |
| --- | --- | --- | --- |
| Workspace user | Put projects in the shared folder and select them on each node | One ordinary project filesystem | No per-file copying/API migration |
| Agent / underlying runtime | Operate on selected workspace | Native file operations with normal permissions | No claim that cwd limits all writes |
| Non-technical desktop/Docker user | Join sharing without filesystem administration | One guided setup invocation and usable path | No manual export/fstab/UID/Docker command assembly |
| Storage owner | Create/authorize storage, keep it available and back it up | Guided setup for supported service-host role and clear responsibilities | No public exposure; approved live changes only |
| Delivery Engineer / user | Verify actual topology and finish safely | Real multi-machine evidence, merge and explicit user verification | Single-host mocks are not completion evidence |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Create or join shared storage through managed setup on Mac/Linux and expose it to selected managed Docker nodes | SCN-001/008/009 |
| UC-002 | Select whole shared projects and read/write them using existing agents/CLIs | SCN-002 |
| UC-003 | Work concurrently within the documented shared-project policy | SCN-003 |
| UC-004 | Diagnose missing/wrong/disconnected mounts, permissions and recovery | SCN-004 |
| UC-005 | Safely set up, reconnect, detach and document storage without losing user data | SCN-005 |
| UC-006 | Observe remote files through a deliberate explorer reload | SCN-006 |

### Out Of Scope

- Public hosted filesystem service, tenancy, billing, SDK product, custom filesystem driver/storage engine.
- The parked cross-node collaboration Task `project_task_6f01dae7-41fe-4645-94f6-f3ba1ce54069`: discovery, cross-node delegation/messaging, automatic agent wakeups, conversation ingestion or attachment synchronization.
- Sharing private server/runtime data, credentials, databases or internal agent memories.
- Automatic migration or relocation of existing projects, replacing user mounts, changing live network/security settings without approval.
- A new graphical in-app installation/mount-management wizard. The user requested command-based automation, not a GUI design project. The automated setup command and required permission handling are IN scope.
- Hot-attaching arbitrary mounts to already-running containers without recreation; the older May dynamic-mount draft does not authorize this feature.
- Simultaneous same-file merge/coordination engine unless DEC-003 selects it and this baseline is revised.
- Windows and arbitrary storage backends beyond the selected, tested reference setup.

### Non-Goals

- No offline editing followed by later reconciliation; network outages may stall or fail operations.
- No instantaneous visibility for an already-open reader, universal zero-latency change stream, high-availability/storage-performance SLA or seamless hot-remount guarantee.
- No promise that OS/architecture-specific dependencies, executables and build outputs are portable between Mac and Linux simply because their files are shared.
- No automatic backup-management subsystem; identify operator backup/recovery responsibilities and safe procedures.

### Preserved Behavior Boundary

BEH-001/002/005/006: local-only and node-specific workspace functionality, runtime authorization policies and per-node private state remain supported. Opt-in sharing does not convert existing ordinary workspaces or move their contents. Removing a workspace registration is not permission to delete or unmount shared data.

### Review Authority

Blocking design/implementation findings must cite an approved REQ, AC or preserved BEH. New product behavior, security model, compatibility or migration obligations are Requirement Gaps requiring renewed approval, not reviewer-authorized expansion. Adjacent concerns remain recommendations/separate-ticket candidates.

## Requirements

All rows are proposed; approval is pending. Technology names are evaluation leads, not requirements.

| ID | Requirement | Behavior | Priority | Rationale / decision |
| --- | --- | --- | --- | --- |
| REQ-001 | Support one automated, documented private-network reference setup with Mac and Linux clients, including Docker execution; each participant accesses the same backing filesystem rather than independent copies. | BEH-001/003 | Must | User request; DEC-001 |
| REQ-002 | Use one agreed absolute shared root on participating hosts and containers. Proposed convention: `/Volumes/autobyteus-shared/<project>`. Setup must expose the actual path/storage relationship and reject mistaken joins; path-based IDs alone are not proof of storage identity. | BEH-001/003 | Must | DEC-001 Needs user |
| REQ-003 | Whole project folders, including source and Git working trees, remain ordinary workspaces accessible through normal CLI/native/runtime filesystem operations, without a special sharing API. Existing sandbox settings must permit the selected shared root without silently relaxing unrelated permissions. | BEH-002 | Must | User request; EV-006 |
| REQ-004 | Support directories, text/binary read/write/modify, file removal, same-filesystem atomic rename/replace, exclusive creation, relative symlinks within projects and executable mode handling. Explain flush/close and cross-client cache semantics; verify small committed-file visibility against AC-003. | BEH-002/003 | Must | Ordinary-project use, DEC-004 |
| REQ-005 | Proposed concurrency policy: simultaneous access to different files is supported; users coordinate modifications of one file and Git branch/index operations. Describe advisory locking support and validate claimed cross-client locks/exclusive-create behavior. Do not claim locks force arbitrary writers to cooperate. | BEH-003 | Must | DEC-003 Needs user |
| REQ-006 | Deliver one guided setup command per participating computer. Within that flow, perform supported dependency/configuration, service creation or connection, filesystem mounting, permission setup, selected managed local Docker integration and readiness checks, then print a copyable usable shared path and concise status. Users must not manually edit filesystem configuration or compose additional mount/Docker commands. Required administrator/privacy or disruption approvals remain explicit; never silently alter mounts or interrupt runs. | BEH-001/004/005 | Must | DEC-002 — user explicit automated-setup direction, 2026-10-13; overall baseline not approved |
| REQ-007 | For configured shared-workspace admission/use, distinguish ready from missing mount, wrong storage, permission denial and unavailable/indeterminate checks. New shared runs and ordinary shared file actions must not be admitted to an unrelated local/temp directory. Diagnostics must conclude within 10 seconds without globally blocking unrelated workspace/node operations. | BEH-004 | Must | Explicit missing-mount safety; DEC-005 |
| REQ-008 | During loss of storage/network access, operations may stall or fail according to the published filesystem contract but must not silently report a local substitute as successful shared access. Recovery reconnects to the same storage and confirms content before new work; uncertain in-flight writes are reported truthfully. | BEH-004 | Must | User failure boundary; DEC-005 |
| REQ-009 | Establish an explicit authorized-participant permission model for this trusted private network, including Mac/Linux identity mapping and the actual container execution UID/GID. Do not default to public exports, world-writable permissions or disabling root restrictions merely to make tests pass. Keep private server/runtime state outside the shared mount. | BEH-005 | Must | Request boundaries + current data isolation |
| REQ-010 | Setup/apply/reconnect/detach must preserve existing projects, mounts, node-specific folders, named volumes and credentials. Reject occupied/incorrect mount locations rather than hide data. Document backup and recovery duties, stopping workspace activity before deliberate detach and any container recreation; clean up only task-owned test resources. | BEH-005 | Must | No live storage modification without approval |
| REQ-011 | Provide a documented deliberate reload/reopen path that retrieves remote directory and file changes; verify actual watcher behavior and state limitations. Automatic remote watcher notifications are not required by this baseline. | BEH-006 | Must | Minimal useful ordinary-workspace experience; DEC-006 |
| REQ-012 | Validate and document the real reference topology, runtime compatibility, consistency, permissions, outage/recovery, setup and cleanup; completion additionally requires merged changes and explicit user verification. | All | Must | Delegated definition of done |
| REQ-013 | Make the supported setup entrypoint obtainable from the desktop distribution or a single supported bootstrap invocation, including desktop-only computers without Docker. Do not require users to separately install a Docker-only launcher or understand filesystem tooling before normal setup. Exact command spelling/distribution is a design decision, not an existing capability claim. | BEH-001 | Must | User non-technical desktop-user example; DEC-008 |
| REQ-014 | Re-running setup/retrying after partial failure must reuse the same intended sharing configuration without duplicate mounts, services, exports or data loss; cancellation/denied approval leaves a truthful incomplete status and preserves existing state. Persist the approved connection configuration for supported restart/login recovery; no repeated manual mounting/configuration required. Availability still depends on the network/storage host. | BEH-001/004/005 | Must | Setup “that's it” direction; safe lifecycle extension within direction |
| REQ-015 | Distinguish creating the shared-storage service once from connecting each participating computer. Guide either supported role with ordinary user choices and connection information, not protocol/UID/export/cache settings. Creation must produce usable connection information for authorized joining; connection information alone must not bypass storage access controls. The service-host location/platform must be settled under DEC-007; no assumption of a user-administered Linux server. | BEH-001/003/005 | Must | Automated solution rather than a command collection; DEC-007 |

## Acceptance Criteria

| ID | Requirements | Behavior / scenario | Preconditions / trigger | Observable result | Failure/alternate | Verification intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | 001,002,006 | 001/003; SCN-001 | Approved setup on two real computers: Mac and Linux, with one Docker node; agreed common root | All clients access the same backing storage and project; path and mount/backing identity evidence recorded | Identical paths backed by independent local storage are rejected/not counted | Real cross-machine topology and reciprocal nonce/content checks, not merely directory IDs |
| AC-002 | 003,012 | 002; SCN-002 | Agents on different nodes select the same shared project | At least Codex and Claude Code use native/runtime tools: A writes, B reads and modifies, A reads B's modification; actual cwd and content recorded | Scripted transport tests alone do not prove live CLI behavior; other runtime compatibility claims require their own evidence | Live runtime/native tools plus shared filesystem content assertions; other enabled runtimes checked proportionately |
| AC-003 | 004 | 002/003; SCN-002 | Healthy reference LAN/storage; writer successfully flushes/syncs and closes a <=1 MiB text or binary fixture | New opens on other participating clients obtain exact committed content within 5 seconds; record timings and configured cache settings | Already-open descriptors and in-progress/non-atomic writes have documented limitations; failed sync/close is not success | Assertions in both host and container directions, repeated with unique fixtures |
| AC-004 | 004,005 | 002/003; SCN-003 | Approved test project and permission identities | mkdir, create/read/modify/delete, rename/replace, exclusive creation, relative symlink and chmod/execute succeed across clients; coordinated Git operations on Mac then Linux succeed | Published lock support matches tests; local-only locks are not advertised as cross-client protection | Functional operation matrix; advisory locking/exclusive-create probes and Git status/edit/add/commit sequence |
| AC-005 | 005 | 003; SCN-003 | Two nodes operate at once within DEC-003 policy | Independent files remain intact and cross-readable; same-file and shared Git-state limitations are clear | No implicit merge/notification or shared independent Git branches is claimed | Concurrent different-file content assertions; documentation review |
| AC-006 | 007,008 | 004; SCN-004 | Test-owned absent/wrong/inaccessible mount or deliberately interrupted service/network | New shared work is not admitted as ready or redirected locally; diagnostics return within 10 seconds; unrelated local workspace remains usable | In-flight filesystem calls may remain pending/fail; report uncertain writes rather than successful publication | Controlled failure tests in test-owned topology; fallback directory/content assertions |
| AC-007 | 008,010 | 004/005; SCN-004/005 | Restore interrupted access, then follow documented recovery/recreation route if necessary | Same storage and pre-existing content confirmed; cross-node roundtrip works again | Changed/mistaken storage must not be accepted automatically; no automatic loss of uncertain files | Recovery roundtrip and preservation assertions |
| AC-008 | 009 | 005; SCN-001/005 | Agreed authorized host/user/container identities | Authorized participants can read and modify; unauthorized tested identities are denied; new file ownership/modes are recorded | No public/wildcard export or permissive root shortcut in supported recipe; private state remains local | Real Mac/Linux/container permission tests and configuration review |
| AC-009 | 010 | 005; SCN-005 | Test-owned nonempty mount target, existing volumes/folders and active work | Setup refuses hiding/replacing existing storage; safe apply/detach preserves user files/volumes and states required stop/recreate steps | No destructive resets, recursive deletion or forced unmount over live work; no unapproved edits to real mounts | Isolated lifecycle/preservation tests and setup documentation walkthrough |
| AC-010 | 011 | 006; SCN-006 | Remote node creates/modifies/removes a fixture | Documented deliberate explorer reload/reopen shows fresh directory/file state; watcher behavior recorded | No claim of automatic remote events if unsupported; open unsaved edits are not silently overwritten | Changed-build browser/product journey plus live remote modifications as applicable |
| AC-011 | 012 | All | Implementation/review/validation completed | Delivery records exact builds/versions/topology, reproducible commands, constraints, docs, merge evidence and the user's explicit verification | Simulated-only, unavailable hardware, skipped runtime tests or missing user verification are gaps, not Completed | Team downstream validation and Delivery gates |
| AC-012 | 006,013,015 | 001/004/005; SCN-001/008 | Supported fresh desktop-only or Docker-equipped computer; chosen create/join role and authorized connection | One supported setup invocation, guided choices and necessary OS approvals result in configured, verified sharing and a copyable common path; zero manual export/fstab/protocol/UID configuration or follow-up Docker/mount commands | Missing privilege, unsupported platform or unavailable service yields clear incomplete/error status, not a ready local replacement; exact syntax is illustrative until implemented | End-to-end guided setup walkthrough on actual Mac/Linux targets; record prompts/actions/configuration and printed path |
| AC-013 | 006,009,010,013 | 001/005; SCN-008 | Mac desktop with existing managed local Docker node(s); shared storage on approved host, with another computer participating | Same setup flow detects and offers the applicable nodes, confirms any needed stop/recreate, preserves their named volumes/auth/private data, verifies shared-path read/write under actual execution identities and prints host/container mapping | Declining disruption does not stop runs or report that node ready; unmanaged/remote-daemon containers remain untouched unless separately approved | Real Mac Desktop plus managed-Docker setup and cross-machine content roundtrip; Linux-host Docker alone is not substitute proof |
| AC-014 | 014,010 | 001/004/005; SCN-009 | Successful or partially failed/cancelled setup; repeat invocation and supported login/restart | Intended configuration is reused without duplicate resources or data loss; reconnects to the same storage when available without manual mount/config commands | Unavailable/changed storage remains unready and requires safe recovery; no fallback local copy; cancellation/denied privileges leave preserved state and truthful progress | Repeat/cancel/retry/restart functional and preservation checks in approved test-owned environment |
| AC-015 | 006,015 | 001/003/005; SCN-001 | Approved supported storage host, creation flow then another Mac/Linux joining flow | Storage owner configures service through guided setup once; authorized second computer connects using supplied connection information in its own single setup invocation; same backing files proved | Unsupported host role is explained before destructive/privileged work; join information does not grant unintended access | Two-computer create/join setup and authorization/path/content assertions, once DEC-007 settled |

## Relevant Scenarios And Journeys

All target scenarios await approval of SR-003; user has explicitly set automated-setup direction but has not approved the complete baseline. “Supported” describes request-backed scope, not a claim that implementation already exists.

| ID | Kind / actor / goal | Trigger and start | Product-level sequence | Expected outcome / alternate | Validity and independent basis | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/Operational; non-technical user/storage owner; create or join storage | User invokes product setup on approved supported host | Choose create/connect and connection information; approve required OS changes; setup configures service/client/path and selected Docker integration; verify; print usable path | One shared project without manual filesystem/Docker administration; report missing/wrong storage, privilege denial or cancellation truthfully | Supported Normal Scenario — task plus explicit 2026-10-13 one-command clarification; exact host scope/approval pending | 001/002/006/009/013/015; 001/008/012/015 |
| SCN-002 | User/System; agent/runtime; use files | User starts native runtime in selected mounted project and asks another node to use its output | A performs normal writes and closes; B opens, reads and changes; A reopens | Exact shared content; no copies/attachments; ordinary project operations | Supported Normal Scenario — task done condition and October-1 user lines 2/38/56 | 003/004/012; 002/003 |
| SCN-003 | Contract; two nodes; concurrent project access | Different nodes work in one project | Write separate files concurrently; deliberately coordinate same-file and Git operations | Independent outputs accessible, no automatic merge promise | Supported Normal Scenario — multi-node goal; precise policy Needs user (DEC-003) | 004/005; 004/005 |
| SCN-004 | Operational event; unavailable/incorrect mount | Network/service loss, missing mount, wrong join or permissions | Attempt shared work; observe unavailable/error/stall; restore same storage; verify then resume | No unrelated local substitute; uncertain writes reported; safe recovery | Supported Explicit Edge Scenario — task explicitly assigns mount-failure behavior and no-local-copy boundary | 007/008; 006/007 |
| SCN-005 | Operational; admin; safe setup/detach | Approved attach/apply/detach or cleanup | Check location and authorized identity; stop relevant activity; apply supported lifecycle; preserve storage/private node state | Existing content and credentials retained; reject occupied mount target | Supported Explicit Edge Scenario — task explicitly requires permissions and safe setup/cleanup | 009/010; 008/009 |
| SCN-006 | User; observe another node's changes | Remote modification with explorer already open | Use documented deliberate reload/reopen; inspect current files | Fresh content without relying on unproven remote watcher events | Supported Normal Scenario — ordinary workspace access goal; EV-008 | 011; 010 |
| SCN-007 | System; automatic agent wake/context update | Hypothetical remote file write | Auto-ingest or notify agents | Not part of this task | Technically Possible but Unsupported/Contrived for this package — separate parked collaboration Task; expressly excluded | N/A |
| SCN-008 | User; Mac desktop + existing managed Docker user; easy connection | User invokes setup on their Mac with Docker nodes already installed | Setup detects compatible local managed nodes; user selects/accepts integration and any disruption; setup applies/verifies; prints the usable shared path | Desktop and selected Docker nodes share the same backing project with other computers, without extra mount/Docker commands; declined/unavailable nodes clearly unready | Supported Normal Scenario — current user explicitly describes desktop plus installed Docker node, not an invented edge case | 006/009/010/013; 012/013 |
| SCN-009 | Operational/User; setup retry or machine restart | Repeat setup after cancellation/failure or restart after completed setup | Read approved intended configuration; retry/reconnect and verify expected storage; preserve unrelated state | No duplicate resources/data loss or repeated manual mounting; unavailable storage stays unavailable | Supported Normal Scenario — ordinary managed-setup lifecycle, designer refinement within user “setup, that's it” direction | 014/010; 014 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes for guided command-based setup, diagnostics and existing workspace/explorer interactions; no new graphical product design requested.
- Product-owned UI/UX artifacts, ticket, revision, runnable visuals and user confirmation: **N/A — not requested / not applicable**.
- User-directed experience: one guided setup invocation per computer, simple create/connect choices, necessary OS/disruption approvals, automatic supported provisioning/mount/Docker configuration, verification and copyable shared path. Filesystem administration is hidden behind the product. Protocols, UID/GID, export rules and mount options are not normal user inputs. Reuse existing workspace selection and deliberate explorer reload. Failure/incomplete state must be understandable; do not display ready on an indeterminate check. Example command names or terminal transcripts are explanatory, not a separately approved visual/interaction specification.
- Needs user: DEC-001 path, DEC-003 concurrency and DEC-007 actual storage-host location/platform. DEC-002 is now settled by explicit user direction: automated command-based setup, not documents-first or necessarily a GUI wizard. No Product handoff is invented.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Constraint | Scope / intent |
| --- | --- | --- | --- | --- |
| QR-001 | 004 / 003 | Consistency | <=5s committed-file visibility for <=1 MiB fixtures | Healthy validated reference topology; not general throughput/HA SLA |
| QR-002 | 007 / 006 | Reliability/operability | <=10s diagnostic/admission answer; no unrelated global block | Filesystem operations themselves may stall per engine contract |
| QR-003 | 009 / 008 | Security/privacy | Authorized participant tests pass; private-state isolation retained | Trusted private network, no public multi-tenant guarantee |
| QR-004 | 010 / 009 | Data continuity | No unapproved loss/reset/hidden pre-existing mount data | Existing user projects, mounts, named volumes and credentials |
| QR-005 | 001/003/012 / 001/002/011 | Compatibility | Actual Mac, Linux and Docker evidence with stated versions | No blanket OS/backend-version promise |
| QR-006 | 006/013/015 / 012/013/015 | Usability/operability | One supported setup invocation per host; zero manual filesystem configuration edits or extra mount/Docker command assembly | Guided ordinary inputs and required OS/disruption approvals allowed; real Mac desktop+Docker setup is required |

## Data Continuity And Acceptable Loss

- External project data affected: Yes once setup is authorized; actual contents/volume unknown. No data has been moved or touched.
- Preserve existing project contents, existing mounts and all per-node server/runtime/auth state. No automatic relocation/migration.
- Acceptable loss: Only task-owned disposable fixtures/resources. No loss of existing user data is authorized. In-flight uncommitted writes may be uncertain during outage; document and investigate, never silently classify them durable.
- Backup/recovery and storage reliability remain explicit administrator responsibilities. Shared accessibility is not replication, backup or disaster recovery.
- Real host identities, target directory, backup status and authorized live setup actions must be established before modification/testing.

## External Contracts And Dependencies

| Dependency | Required boundary | Evidence | Remaining uncertainty |
| --- | --- | --- | --- |
| Selected existing filesystem | Ordinary project operations and stated consistency/failure contract | EV-009–EV-012 | Engine/version/configuration selected after approval; real tests required |
| OS mount client and permissions | Mount where runtime actually executes | EV-010–EV-012 | Storage-host location/platform (DEC-007); installation privilege; identity mapping; native Mac hosting feasibility is separate from client support |
| Docker daemon and Desktop bridge | Actual mounted storage visible inside container, agreed path | EV-011 | Docker host/bridge versions; Desktop network/FUSE paths not yet verified |
| Runtime CLI/tool policy | Native filesystem operations and sandbox compatibility | EV-006 | Available signed-in runtime test identities; no policy relaxation by implication |

## Supplemental Artifacts

`investigation-notes.md` and `solution-revision-record.md` are canonical evidence/history. `requirements-approval-request.md` persists this conversation's approval hold. The attached October-1 transcript and May-21 draft are historical evidence only. No behavior-defining supplement or external Product design package exists. [feasibility-recommendation.md](feasibility-recommendation.md) is historical SR-002 reasoning, not an approved design; its Linux-host/doc-led assumptions must be re-evaluated against SR-003 automated setup. [setup-revision-context.md](setup-revision-context.md) persists the user clarification and revised direction; canonical requirements here remain the intended-behavior authority.

## Assumptions

| ID | Assumption | Need / validation owner | Status |
| --- | --- | --- | --- |
| ASM-001 | Participating hosts/admins are trusted and authorized for the shared project, over LAN/VPN/private network | Confirm host resources/security baseline with user before live setup | Direction established; exact resources unknown |
| ASM-002 | Necessary OS approvals and explicitly confirmed Docker disruption are compatible with one guided setup invocation; silent privilege bypass/disruption is not | Setup workflow validation; ask user if a supported platform demands substantial manual administration | Designer refinement within direction, whole baseline pending |
| ASM-003 | Same-file and Git operations can be coordinated by users without a new enforcement subsystem | DEC-003, user | Pending |
| ASM-004 | Real Mac/Linux and Docker resources plus Codex/Claude runtime access are available for validation | User supplies target hosts; validation owner records unavailable capabilities honestly | Unknown; approval itself does not grant live modification |

## Decisions

| ID | Question | Evidence / reasoning, then recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Common mount convention? | Matching paths aid reuse but do not prove sharing. A new Mac `/agentfs` root is not an ordinary writable-root assumption; `/Volumes` is already in Desktop's default shared roots. Recommend `/Volumes/autobyteus-shared/<project>` on all hosts/containers, with coordinated configuration of another common root if needed. Network mount/bridge validation remains mandatory. | User | Needs user |
| DEC-002 | Who owns initial setup? | User explicitly rejects a collection of technical commands and requires one product setup command that finishes with a usable path. AutoByteus must orchestrate supported provisioning, mounting, permissions, managed local Docker integration and verification; docs are supplementary. Keep necessary OS/disruption approvals rather than silently bypassing them. A graphical wizard is not requested. | User direction, 2026-10-13 one-command clarification | Decided — automated command-based setup direction; not approval of the complete SR-003 baseline |
| DEC-003 | Concurrent shared working-copy policy? | A common filesystem cannot merge arbitrary competing edits; Git branch/index are shared state. Recommend concurrent different files, user-coordinated same-file and Git operations. Whole projects remain in scope, not merely artifacts/documents. | User | Needs user |
| DEC-004 | Visibility bar and commit boundary? | Fresh reopen is feasible under documented cache semantics; already-open/in-progress reads have different guarantees. Recommend <=5s for successfully synced/closed <=1MiB fixtures on the healthy reference network, plus reporting actual settings/timings. Not an arbitrary whole-repository speed SLA. | Solution Designer within direction | Decided for proposed baseline; not yet approved |
| DEC-005 | Failure boundary? | CLI file operations bypass AutoByteus APIs; a readiness check alone cannot instantly cancel all in-flight I/O or guarantee atomic multi-call writes. Require unavailable/indeterminate admission within10s, no local/temp substitute, and documented stall/error/recovery semantics; do not promise instantaneous global runtime termination. | Solution Designer within direction | Decided for proposed baseline; not yet approved |
| DEC-006 | Remote explorer refresh? | Current native watcher is not proof of network-client remote events. Recommend guaranteed deliberate reload/reopen and verification/documentation of automatic events, not a new cross-node notification feature. | Solution Designer within direction | Decided for proposed baseline; not yet approved |
| DEC-007 | Which computer stores/hosts the files? | Requiring a separately administered Linux server can defeat the user's easy Mac desktop+Docker setup. Recommend that the flow offer create on a supported chosen computer or connect to existing storage; clarify whether the user's Mac should host or another computer already will. Native Mac NFS service exists as a feasibility lead, but its protocol, permissions/privacy and bridge behavior are not validated; no Mac-hosting guarantee/mandatory Linux-host restriction is approved. | User for actual location/platform scope; designer for technology | Needs user / feasibility refinement |
| DEC-008 | How does a desktop user obtain the setup command? | A desktop-only user should not install a Docker-only tool or filesystem client manually first. Recommend a desktop-distributed helper or one supported bootstrap that reaches the same guided setup workflow. Exact command name/package form is implementation design, not user taste and not an existing CLI claim. | Solution Designer within direction | Decided for proposed baseline; not yet approved |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| 001 | 001 | 001/003 | 001 | 001 |
| 002 | 001 | 001/003 | 001 | 001 |
| 003 | 002 | 002 | 002 | 002 |
| 004 | 002/003 | 002/003 | 003/004 | 002/003 |
| 005 | 003 | 003 | 004/005 | 003 |
| 006 | 001 | 001/004/005 | 001/012/013/015 | 001/008 |
| 007 | 004 | 004 | 006 | 004 |
| 008 | 004/005 | 004 | 006/007 | 004/005 |
| 009 | 001/005 | 005 | 008 | 001/005 |
| 010 | 005 | 005 | 007/009 | 005 |
| 011 | 006 | 006 | 010 | 006 |
| 012 | All | All | 002/011 | All supported |
| 013 | 001 | 001 | 012/013 | 001/008 |
| 014 | 001/005 | 001/004/005 | 014 | 009 |
| 015 | 001 | 001/003/005 | 012/015 | 001 |

## Architecture Phase Input

- Approved scenario/behavior basis: **None yet**. SR-003 proposes SCN-001–006, SCN-008 and SCN-009; SCN-007 remains excluded.
- Preserve normal CLI filesystem access, shared backing identity, no unsafe fallback, existing local workspaces, private state and safe cleanup.
- Defer engine, protocol/options, permission mechanism, helper packaging, managed provisioning/mount lifecycle and file layout to architecture after approval. Select technology against the one-command product experience and actual service-host scope; do not defend NFS/Linux solely because SR-002 mentioned them. Mac Desktop with existing managed Docker is a required user journey, not an optional Linux-only substitute.
- Verify complete launch/resume/file-operation production paths (including standalone, Team and Org users), shared-root admission, Docker lifecycle and bridge behavior, explorer reload, runtime skill publication/cleanup and path portability.
- Known feasibility risks: per-node skill symlinks currently materialized inside project; process-local ownership is not distributed ownership. Native runtime reads/writes cannot be intercepted solely by our file API. Mount disappearance/remount/container caching need real tests. No blanket hard-error-on-every-open or immediate-stop guarantee.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: Yes, inspected code/docs; running user's containers not verified.
- Desired/preserved behavior and scope explicit: Yes.
- Requirements/AC testable and traceable: Yes for proposed reference setup; exact supported versions/configuration still architecture work.
- Supported scenarios and independent evidence covered: Yes.
- Product-owned final visual basis: N/A.
- Material assumptions and decisions visible: Yes.
- Content ready for approval: **No — Draft refinement**. Automated command-based setup is explicit, but DEC-007 service-host platform/location and its feasibility must be settled enough to state a coherent supported creation/join scope. DEC-001/003 also remain open. No approved-basis design may proceed.
- Remaining decision gaps: Storage-host location/platform (DEC-007), common path (DEC-001), concurrency policy (DEC-003); real Mac Desktop/Docker plus remote Linux resources and live-setup authorization. Setup experience (DEC-002) is no longer open.

### Approved Basis Ready For Design

- Approval recorded: **No**.
- Exact approved requirement/supplement basis: **None**.
- Ready for architecture: **No**. Await explicit user approval of the settled baseline; no implementation handoff.
