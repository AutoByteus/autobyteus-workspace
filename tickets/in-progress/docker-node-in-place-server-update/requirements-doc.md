# Requirements Document — autobyteus-305 (Docker nodes update their server in place)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005` (design revised after ARCH-REV-001; requirements approved at `SR-003`; editorial fixes at SR-005 per AR-012; DEC-016 revised within the direction at SR-004)
- Package identifier: `docker-node-in-place-server-update`
- Request / ticket: Project Task `autobyteus-305` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Docker nodes: let the server update itself inside its container …" (DESIGN FIRST)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-25
- Requirements owner: Solution Designer
- Date: 2026-10-26
- Approved by and reference: `User`, 2026-10-30, in the Solution Designer conversation: "Yeah, yeah, I feel like you're recommended. These are good. You're recommended are good. Yeah, I accept that." (accepting the recommendations for DEC-001, DEC-002, DEC-003, DEC-006, DEC-007, DEC-018); DEC-004 and DEC-005 decided by the user earlier the same day (quotes in their rows); DEC-010..DEC-017 by the Solution Designer within the direction, user informed
- Exact approved requirements baseline / solution revision: this document at `SR-003`
- Behavior-defining supplements and their approved versions: `options-report.md` at `SR-003`
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, base `origin/personal` @ `9d59ab82ec` (fast-forwarded 2026-10-30; first base `d74f75a51a`), target `personal`

## Problem And Desired Outcome

- Problem: a Docker node carries the system (OS, Node, Chromium, agent CLIs) and the server in one image. Every release therefore needs a new image, and moving a node to the desktop's version means pulling it and recreating the container. Measured on the registry (2026-10-30, newest releases): each upgrade downloads **1.38–1.40 GB (arm64) and 1.41–1.44 GB (amd64)**, of which the server's own new code is about 7 MB; the rest is the agent CLIs reinstalled on every build (0.85–0.89 GB, growing) and a node_modules that includes desktop build tools (0.53 GB). The system base (Ubuntu, Chromium, desktop; 1.16 GB) was byte-identical across all 23 releases of 2026-10-23 to 2026-10-30. Recreating the container also drops anything installed in it outside the volumes.
- Affected actors or systems: the user and his Docker nodes; a friend running a node on his own machine; the desktop app; each Docker node; the release pipeline.
- Desired outcome: a Docker node replaces its server build inside the same container, on the user's action (from the desktop or by command), with a build it has verified; a new image is needed only when the system layer changes, and the node says so clearly; a failed update leaves the old version running; runs that were mid-turn come back.
- Observable definition of success: on a real Docker node, from a clean clone: the node updates to the desktop's version without a new image; a failed update (bad signature, incompatible build, a build that fails to start) leaves the old version running and serving; runs that were mid-turn come back after the update.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-006 | `autobyteus-docker upgrade --all` pulls the image and recreates every node whose image changed, keeping named volumes | Stays the way to move to a new system layer (new image) | Saved track (`latest`/`beta`), named volumes kept, `--tag`/`--image` retargeting | F-04 |
| BEH-002 | User | SCN-001 | After a desktop update, nodes stay on the old version until the user runs BEH-001 on their machine | The desktop shows each Docker node's version next to its own and offers "Update to this app's version" on the user's click | Rule 9 otherwise unchanged: mismatched versions are the user's to fix | F-05, F-06, F-12 |
| BEH-003 | System | SCN-001, SCN-002 | No current supported behavior (no in-place update) | The node fetches the named version's server build, verifies it, checks it fits this image, prepares it while the old version keeps serving, then switches with a short restart | — | — |
| BEH-004 | System | SCN-003, SCN-004 | No current supported behavior | Any failure before the switch changes nothing; a failure of the new version after the switch brings the old version back | Data volume content (DEC-005) | F-11 |
| BEH-005 | System | SCN-005 | No current supported behavior; the image is the only source of the server | A build that needs a newer system layer is refused before anything changes, with "this update needs a new Docker image" and the command to get it | — | F-01, F-15 |
| BEH-006 | System | SCN-007 | A restart loses mid-turn runs (until the 283 chain is built) | After an in-place update, mid-turn runs come back through restart-and-resume | Stop/terminate fences of the 283 chain | F-13 |
| BEH-007 | User | SCN-001 | A node does not report its release version | Each Docker node reports its version, its last update result and whether a new image is needed | — | F-06 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user (desktop + nodes on his machine) | Keep nodes at the desktop's version with one action | Update from the app without pulling images | Nothing updates without his action |
| A friend's node (another machine) | Decide about his own node | Can always update by command on his machine; sees in the node's log who requested an update | Same verification |
| A Docker node | Run only verified builds | Never runs unverified code; never left without a working version | Data never lost |
| Agents on a node | — | Cannot trigger an update through any tool | Nothing exposed to agents |
| The release pipeline | Publish signed server builds | Each release publishes a build per architecture with a signature | No release in this ticket unless asked |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The user updates a Docker node to the desktop's version from the desktop | SCN-001 |
| UC-002 | The node owner updates a node by command on the host machine (to a named version or the newest on the node's track) | SCN-002 |
| UC-003 | An update that fails at any step leaves the old version running and says what failed | SCN-003, SCN-004 |
| UC-004 | A build that needs a newer system layer is refused with a clear "new image needed" | SCN-005 |
| UC-005 | Moving to a new image (system-layer change) keeps working and keeps the node on the newest version it already ran | SCN-006 |
| UC-006 | Runs that were mid-turn come back after an in-place update | SCN-007 |
| UC-007 | Each release publishes signed server builds that nodes can verify | SCN-001, SCN-002 |

### Out Of Scope

- Keeping software installed in the container and browser logins across image upgrades (autobyteus-306, bookmarked).
- Updating agent CLIs on Docker nodes (DEC-006: proposed as a separate Task).
- Automatic node updates of any kind (DEC-002).
- In-place updates of the desktop's embedded server (the desktop updater owns it) and of non-Docker remote servers.
- Authentication between nodes and apps (autobyteus-300).
- The restart-and-resume mechanism itself (autobyteus-283 chain); this ticket uses it.
- A public release (only on request).

### Non-Goals

- Downgrading a node.
- Keeping more than one earlier build per node.
- Changing how the image is built beyond separating the server build from the system layer.

### Preserved Behavior Boundary

- BEH-001 preserved; launcher commands and volume names keep their meaning; named volumes are never removed.
- Rule 9 for every contract except the node-update contract (DEC-007).
- Phones never trigger owner actions (route class `TRUSTED_NETWORK_OWNER`).
- The user's 210 rule: the app (here: a node's server) is never updated automatically.

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| PRQ-001 | Bounded, awaited shutdown: today stopping a busy run waits without limit (autobyteus-284 RC-1), so the switch could hang | REQ-010, AC-007 | `/project_task_manager` / autobyteus-284 | delivered: in `origin/personal` @ `e4bebdc858`, integrated into this ticket's branch 2026-10-30 |
| PRQ-002 | Restart-and-resume step 1 (record mid-turn runs, resume them) and step 3 (an update click carries the resume choice) of the autobyteus-283 plan | REQ-010, AC-007 | `/project_task_manager` / autobyteus-285 (step 1) and autobyteus-287 (step 3); both created, not dispatched, depend on 284 | sent; dependency recorded by the PTM 2026-10-26 |

Build steps 1–4 do not need them; only step 5 (and the "mid-turn runs come back" part of the final demo) waits.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A Docker node can replace its server build inside its running container, without a new image and without recreating the container | BEH-003 | Must | The user's request | Reproduced 2026-10-30: a server built from a clean clone outside the image, mounted read-only into the published image, started healthy in 7 s (`evidence/linux-server-build-result-2026-10-30.txt`) | Task; DEC-001 |
| REQ-002 | An update always names an exact target version and is accepted only when it is newer than the version the node runs | BEH-003 | Must | No downgrade onto migrated data (RELEASE.md rollback rule) | N/A | DEC-010 |
| REQ-003 | The user can start an update from the desktop ("Update to <version>", DEC-018) and by a command on the host machine; no agent tool starts one (agents with a shell can reach the node like any client on it, as DEC-004 and AC-009 accept) | BEH-002, BEH-003 | Must | Trigger rule; nothing exposed to agents | Read: route class `TRUSTED_NETWORK_OWNER` already refuses phone credentials | DEC-002, DEC-004 |
| REQ-004 | A node runs a server build only after verifying it came from AutoByteus' release and is unaltered | BEH-003 | Must | Supply-chain rule | Reproduced 2026-10-26: Ed25519 verify in the image's Node 22 (genuine true, tampered false) | DEC-003 |
| REQ-005 | Until the switch, the old version keeps running and serving; any failure before the switch (download, verification, compatibility, preparation) changes nothing on the node | BEH-004 | Must | "A failed update leaves the old version running" | N/A (ordering) | Task |
| REQ-006 | If the new version does not come up healthy after the switch, the node brings the old version back; when the update brought a data migration, on the data as it was before the update (DEC-005) | BEH-004 | Must | Same; data safety | Measured: data volumes 0.13–1.35 GB, so one copy is affordable; restore proven in step 3 | DEC-005 |
| REQ-007 | No automatic node updates; nothing updates without the user's action | BEH-002 | Must | The user's rule (210) | N/A | DEC-002 |
| REQ-008 | A build declares the system layer it needs; a node refuses a build its image cannot run and says that a new image is needed, with the command | BEH-005 | Must | "The node says clearly when a new image is needed" | Measured: the image exposes Node ABI 127, arch, glibc 2.39; a build can declare them | Task |
| REQ-009 | Each release publishes, per architecture, the server build, its description and its signature; the image contains the same build as its built-in version | BEH-003 | Must | Source of builds; new nodes start current | Reproduced: `pnpm deploy --legacy` + `prisma generate` gives a working build (313 MB compressed, arm64) | DEC-003, DEC-011 |
| REQ-010 | An in-place update stops the old version within a bounded time, and the runs that were mid-turn continue automatically after the update, with no human involved (the user's restart-chain decision of 2026-10-30) | BEH-006 | Must | Done-when | Depends on PRQ-001/002 (not delivered) | PRQ-001, PRQ-002 |
| REQ-011 | Each Docker node reports its version, the progress and the result of the last update, and whether a new image is needed; the desktop shows them | BEH-007 | Must | The user must see what happened | N/A | DEC-017 |
| REQ-012 | Moving a node to a new image keeps it on the newest version it already ran (an image's built-in version never replaces a newer installed one) | BEH-001 | Must | No downgrade through an image | N/A | DEC-012 |
| REQ-013 | Update logs and reports contain no secrets | — | Must | The user's rule | N/A | Task |
| REQ-014 | Removed at SR-002 by the user's decision (DEC-004): no owner switch for network update requests. Each update request is logged with the client address it came from | BEH-003 | — | — | N/A | DEC-004 |
| REQ-015 | When no server build was published for the requested version (a partial release), the node refuses with that reason and nothing changes | BEH-003 | Must | Partial releases happen (v1.5.9-beta.14) | N/A | DEC-010 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003, REQ-011 | SCN-001 | Node at version A (image with the starter), desktop at B > A; user clicks "Update to this app's version" | The node runs B in the same container (same container ID, same image ID); the desktop shows B and "updated" | — | Real Docker node, two locally built signed versions |
| AC-002 | REQ-003 | SCN-002 | Host command `update` for a node, with a version or without (newest on the node's track) | Same as AC-001 | Unknown version → refused, nothing changes | Real Docker node |
| AC-003 | REQ-004, REQ-005 | SCN-003 | The build or its description is altered, or signed with another key | Update refused before anything changes; old version keeps serving without a restart; reason shown | — | Tampered archive and wrong-key cases |
| AC-004 | REQ-006 | SCN-004 | A verified build that fails to start or to become healthy | The old version runs again on its pre-update data; result "failed after switch, old version restored"; the failed build is not retried by itself | — | A test build that exits at start, and one that fails after migrations |
| AC-005 | REQ-008 | SCN-005 | A build that needs a newer system layer than the image has | Refused before anything changes; "this update needs a new Docker image" with the launcher command | — | Build marked for a newer system layer |
| AC-006 | REQ-012, BEH-001 | SCN-006 | Node at installed version C; `upgrade --all` to an image whose built-in version is older than C, or newer | Older built-in: the node keeps C. Newer: the node runs the image's version | C incompatible with the new image and built-in older → node refuses to start an older version and says which image is needed | Real Docker node |
| AC-007 | REQ-010 | SCN-007 | Runs mid-turn when the update is clicked | The old version stops within the bounded time; after the update the runs continue by themselves (no prompt, no click), as restart-and-resume defines | — | Real Docker node, after PRQ-001/002 |
| AC-008 | REQ-002 | SCN-001 | Target version equal to or older than the running one | Refused; nothing changes | — | Unit + real node |
| AC-009 | REQ-003 | SCN-001, SCN-002 | A phone credential; an agent's tools; any network request | Phone: refused. Agents: no update tool exists. A network request from a desktop is accepted and logged with its client address | — | Route tests, tool list check, log check on a real node |
| AC-010 | REQ-007 | — | Desktop updated; nodes older | Nothing changes on any node until the user acts | — | Real node observation |
| AC-011 | REQ-009 | SCN-001 | A release build (or a release-workflow dry run) | Per architecture: build archive, description and signature published; the image's built-in build is byte-identical to the published one | — | Workflow dry run, comparison |
| AC-012 | REQ-013 | all | Logs of a full update and of each failure case | No tokens, keys or credentials in logs or reports | — | Log scan |
| AC-013 | REQ-015 | SCN-001, SCN-002 | Requested version has no published server build | Refused: "no server build was published for X"; nothing changes | — | Local release source without that version |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The user | Bring his Docker nodes to the desktop's version after a desktop update | Desktop Nodes page: "Update to <version>" on a node (DEC-018) | Node older than the desktop | Click → progress (downloading, verifying, preparing, restarting) while the node keeps working → node back at the desktop's version | Same container, new version, runs come back | Refused (version not newer, no package published, new image needed); failed with the old version running | Supported Normal Scenario | The user's request (Task) | REQ-001..REQ-004, REQ-011, AC-001, AC-008..AC-010 |
| SCN-002 | Operational | The node owner on the host machine | Update a node without the desktop (headless, a friend's machine) | `autobyteus-docker update` | Node with the starter | Same as SCN-001 | Same | Same | Supported Normal Scenario | Task ("or by command") | REQ-003, AC-002 |
| SCN-003 | System | — | A downloaded build does not verify or does not fit | During an update | — | Download → verification or compatibility fails | Nothing changes; old version keeps serving; reason shown | — | Supported Explicit Edge Scenario (supply-chain rule) | Task constraints | REQ-004, REQ-005, AC-003 |
| SCN-004 | System | — | The new version does not come up | After the switch | — | New version exits or never becomes healthy | Old version back on its pre-update data; reported | — | Supported Explicit Edge Scenario (the user's failure rule) | Task constraints | REQ-006, AC-004 |
| SCN-005 | System | — | A release needs a newer image | During an update | Build needs a newer system layer | Check → refuse | "New Docker image needed" + command | — | Supported Explicit Edge Scenario | Task ("the node says clearly") | REQ-008, AC-005 |
| SCN-006 | Operational | The node owner | Move to a new system layer | `autobyteus-docker upgrade --all` | Node already updated in place | Pull, recreate, start | Node runs the newest version it may run | Image older than installed version | Supported Normal Scenario | BEH-001 | REQ-012, AC-006 |
| SCN-007 | System | — | Runs were mid-turn at the update | SCN-001/002 | Runs mid-turn | Bounded stop → switch → start → resume | Runs come back | As restart-and-resume defines | Supported Normal Scenario | Done-when; 283 plan | REQ-010, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small: Nodes page)
- Linked UI/UX or interaction supplement: none yet; Product Design not requested. The UI for build step 4 is proposed in the design; Product Design can be asked if the user wants.
- Product ticket record and folder, design repository revision, UI/UX confirmation, visual baseline: `N/A — not applicable`
- Required states: node version beside the app's version; "Update to <version>" with "Same version as this app" when the node is older (DEC-018); progress steps; result (updated / refused with reason / failed, old version running); "new Docker image needed" with the command.
- Product decisions that need the user: none beyond DEC-002 and DEC-004.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | An in-place update downloads only the server package, once per node: ≤ 0.35 GB per release (measured working package 313 MB arm64; today 1.38–1.44 GB per machine) | linux/arm64 and amd64 | Re-measure the published asset in step 1 and in the demo |
| QR-002 | REQ-005, REQ-010 | Reliability | The node stops serving only for the switch: bounded stop + data copy (DEC-005) + start | — | Time the demo |
| QR-003 | REQ-004 | Security | Signature checked with a key fixed in the image; unsigned, altered or wrongly signed builds never run | — | AC-003 |
| QR-004 | REQ-013 | Privacy | No secrets in logs | — | AC-012 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (indirectly: a new version may migrate data at its first start; a copy of the data folder may be taken, DEC-005).
- Must be preserved: the whole data volume; the root home, Chromium profile and workspace volumes; host bind mounts. A data copy is taken only for an update that brings a data migration (DEC-005) and exists only during the switch: deleted once the new version is confirmed working.
- Acceptable: deleting server builds older than the previous one; deleting the pre-update data copy once the new version is confirmed working.
- Constraints: data volumes here are 0.13–1.35 GB; a data copy needs that much free space and some seconds of downtime.
- Unknowns: none beyond DEC-005.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GitHub release assets | Host the per-architecture builds, descriptions and signatures | RELEASE.md, workflows | Asset count grows (17 → 23); upload ordering (U-02) |
| Signing key | Private key as a CI secret the user creates once; public key in the image | DEC-003 | Key custody |
| 283 chain | Bounded shutdown; record and resume | PRQ-001/002 | Timing of other teams |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `options-report.md` | Options, recommended design (proposal), build order, questions | All | Presented at SR-001 | In the approval basis |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A Linux server build is ≈ 0.3 GB compressed | Bandwidth claim | Measured 2026-10-30: 313 MB (arm64) | Confirmed |
| ASM-002 | The user installs the first image with the starter the old way, once | There is no in-place path before the starter exists | — | Inherent |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | In-place update, or the middle way (keep image upgrades, make them smaller and add an "upgrade this node" button)? | Direction of the whole ticket | `options-report.md` §2 | The middle way can cut the download too, but only the in-place way avoids recreating the container, brings the old version back by itself, and lets the desktop update a node on another machine (the desktop cannot run Docker on a friend's machine). Recommend **in-place**, and take the cheap image fix with it (server-only node_modules in the image). | User | Approved by the user, 2026-10-30 (recommendation accepted) |
| DEC-002 | Who triggers an update? | Control and surprise downtime | User only; desktop on its own; opt-in automatic | The user decided in 210 that the app is never updated automatically; a node's server is the same kind of thing. Recommend **only on the user's action** (click in the desktop, or the host command); the desktop shows when a node is older but never starts an update itself; no automatic option. | User | Approved by the user, 2026-10-30 (recommendation accepted) |
| DEC-003 | Where do builds come from, and how are they verified? | Supply-chain safety | GitHub release assets; Docker registry; integrity only (SHA-256) or a signature | GitHub release assets are plain downloads (no API quota), already where every release lives; the registry needs a token dance and has pull limits. A SHA-256 next to the file proves only that the file matches what the same place says. Recommend **GitHub release assets, signed with an AutoByteus Ed25519 key**: the private key is a new GitHub Actions secret you create once (we give you the command), the public key is baked into the image, and the node checks the signature with Node's built-in crypto (tested in today's image). A key change then needs a new image. | User | Approved by the user, 2026-10-30 (recommendation accepted) |
| DEC-004 | Same-machine node versus a friend's node | Who may update whose node | Same rule for all; an owner switch "Accept update requests from connected apps" | The node's API trusts the network today (autobyteus-300 will add real authentication); anyone who can reach a node can already run agents on it, so pressing Update adds no new power; only signed, newer builds are accepted; a failure brings the old version back; each request is logged with where it came from. A switch would add a setting and its tests without real protection. Decision: **same mechanism for every node, no switch**; phones are always refused. | User, 2026-10-30: "Yeah, I think we drop it. We don't have to add extra complexity." | Decided by the user |
| DEC-005 | What if the new version starts, changes the data, then fails? | "Never lose data"; "a failed update leaves the old version running"; the user worried the data folder is big (2026-10-30) | (A) copy the data volume only when the update brings a data migration; (B) never copy; (C) always copy (the SR-001 proposal). Measured 2026-10-30: only 3 of the 23 releases since v1.5.8 added data migrations; RELEASE.md: without a migration the old version runs on the data as left | Only a migration makes the old version unable to read the data, so only then is a copy needed. **(A):** each package lists its data migrations; when the new version brings migrations the running one does not have, the node checks free space before stopping anything (refusing with a clear message when there is not enough), copies the data volume after the stop, restores it only if the new version does not come up, and deletes it as soon as the new version is confirmed working; a copy exists only during the switch | User | Decided by the user, 2026-10-30: "I think this is, from my opinion, actually quite a good approach" (copy only with a data migration; deleted once the new version runs) |
| DEC-006 | Agent CLIs (Codex, Claude Code, Antigravity, Grok) on in-place nodes stay at the image's versions | Today every image refresh brings the newest CLIs | Accept + separate Task; keep rebuilding images for CLIs | Recommend: **accept for this ticket**; a separate Task lets Settings → Agent Runtimes update CLIs on Docker nodes into a volume (fits with 306). Until then, an image upgrade refreshes them. | User | Approved by the user, 2026-10-30 (recommendation accepted) |
| DEC-007 | DESIGN.md rule 9 says no cross-version contracts; an update is a newer desktop talking to an older node | The update cannot work otherwise | Exception; or none | Recommend **one narrow, documented exception**: the node-update contract (the node's version/status and the update request) and the build description format stay unchanged across versions; everything else stays clean-cut. Written into DESIGN.md rule 9. | User | Approved by the user, 2026-10-30 (recommendation accepted) |
| DEC-010 | Target version | Safety | — | Always an exact version: the desktop's, the command's `--version`, or (command without version) the newest on the node's saved track; only newer than running. | Solution Designer | Decided |
| DEC-011 | Does CI still build and publish a Docker image every release? | CI time (35–47 min per release, measured), how new nodes start, how CLIs stay fresh | (A) image every release, the server package taken from it; (B) image by hand only, package every release (needs a forgotten-image guard, a package start test on the published image, `new-container` updating at once, new tag semantics) | A is simpler and safer now: one build makes both the image and the package, so they cannot drift; no guard, no manual step to forget; new nodes start current; new images keep bringing fresh CLIs; `:beta`/`:latest` keep their meaning. B saves CI time but adds three mechanisms; it can be a later, separate Task once in-place updates are proven (FU-003). Decision: **(A)** | User, 2026-10-30: "maybe we make it simple for now. We still like every time build the Docker image" (after considering a manual image build); Solution Designer agreed | Decided by the user |
| DEC-012 | Where builds live | Data-folder rule | Data volume; new volume | A new named volume for server builds, not the data volume (software stays out of his data folder); kept by recreate/destroy like the others. The image's built-in build never replaces a newer installed one. | Solution Designer | Decided |
| DEC-013 | How many builds kept | Disk | — | The running one and the previous one. | Solution Designer | Decided |
| DEC-014 | First move to the starter | No in-place path exists yet | — | One last `upgrade --all` installs the image with the starter and adds the volume. | Solution Designer | Decided |
| DEC-015 | Mid-turn runs | Done-when | — | Use restart-and-resume (283 chain); after the in-place restart the busy runs continue automatically, no human involved, following the user's decision for app-update restarts (Task comment 2026-10-30, see autobyteus-285). No second resume mechanism. | User (via the restart chain), applied by the Solution Designer | Decided |
| DEC-016 | Nodes on one machine | 3 nodes download the same package 3 times | Shared builds volume; per-node volume | Revised at SR-004 (design): a shared volume would also hold each node's data copy during a migration update, and that copy contains the node's vault, visible to every other node's agents. Per-node: 313 MB per node per release (0.94 GB for 3 nodes, versus 1.4 GB today), no cross-node cleanup coordination. Decision: **one `<node>-server-packages` volume per node** | Solution Designer (user informed) | Decided |
| DEC-017 | Status visibility | — | — | The node keeps its last update result (version, step, outcome, time) and the desktop shows it. | Solution Designer | Decided |
| DEC-018 | Wording of the update action on a node row | Visible behavior | "Update to this app's version" or "Update to <version>" | The concrete version says exactly what will happen, matches the app's short concrete update buttons ("Download Update", "Install and restart") and is easy to check afterwards; the reason stays visible in a second line. Button **"Update to <version>"** (e.g. "Update to 1.5.11-beta.5") with the line **"Same version as this app"**. | User (asked 2026-10-30), recommendation by the Solution Designer | Approved by the user, 2026-10-30 (recommendation accepted) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-003 | AC-001, AC-002 | SCN-001, SCN-002 | options-report §3 |
| REQ-002 | UC-001, UC-002 | BEH-003 | AC-008 | SCN-001 | — |
| REQ-003 | UC-001, UC-002 | BEH-002, BEH-003 | AC-001, AC-002, AC-009 | SCN-001, SCN-002 | — |
| REQ-004 | UC-007 | BEH-003 | AC-003 | SCN-003 | options-report §3 |
| REQ-005 | UC-003 | BEH-004 | AC-003 | SCN-003 | — |
| REQ-006 | UC-003 | BEH-004 | AC-004 | SCN-004 | — |
| REQ-007 | UC-001 | BEH-002 | AC-010 | — | — |
| REQ-008 | UC-004 | BEH-005 | AC-005 | SCN-005 | — |
| REQ-009 | UC-007 | BEH-003 | AC-011 | SCN-001 | — |
| REQ-010 | UC-006 | BEH-006 | AC-007 | SCN-007 | PRQ-001/002 |
| REQ-011 | UC-001 | BEH-007 | AC-001 | SCN-001 | — |
| REQ-012 | UC-005 | BEH-001 | AC-006 | SCN-006 | — |
| REQ-013 | all | — | AC-012 | all | — |
| REQ-014 | — (removed) | — | — | — | DEC-004 |
| REQ-015 | UC-001, UC-002 | BEH-003 | AC-013 | SCN-001, SCN-002 | — |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001..SCN-007 (once approved).
- Constraints to preserve: BEH-001; volume names; phone refusal; rule 9 outside the DEC-007 exception; no agent-reachable trigger.
- Decisions deferred to design: starter process model under supervisord; build description fields; health definition; shared builds between nodes; release asset upload ordering; PowerShell launcher twin; desktop UI placement.
- Technical facts to verify: Linux build size (ASM-001); behavior of `docker stop` grace with the bounded shutdown; disk space check before a data copy.
- Known risks: R-01..R-04 in the investigation notes.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (the user, 2026-10-30)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-003)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none (build step 5 waits for PRQ-001/002)
