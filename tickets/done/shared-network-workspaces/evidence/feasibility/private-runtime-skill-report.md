# Private Runtime Skill Capability — SR-009

## Result And Boundary

**FR-014: 12 scoped checks passed, exit 0; exact owned resources cleaned.** This is a task-owned prototype using the unmodified native Claude SDK, not an integrated AutoByteus fix, current-source build, rendered UI, native Mac mount, physical LAN, finished setup command or final independent validation. FR-009/011's production shared-link bug is not patched or erased.

The tested alternative keeps configured skill bundles private to each native session/node, while its cwd remains the ordinary shared project. Closing a peer and removing only its private bundle does not remove another node's skill. A resumed native session also loads its replacement private bundle after its previous bundle is deleted.

## Actual Nodes

All nodes are disposable containers in this one Mac's Docker Desktop Linux VM, not separate physical LAN computers. Common mounted project: `/home/autobyteus/shared/project`.

| Role | Actual node | Storage/private path | Evidence |
| --- | --- | --- | --- |
| Linux filesystem service | `ab-sf-fr014-c4570f6f-storage-server` | Persistent owned volume `/export`; Ganesha/VFS NFS4.1 | Same candidate as earlier component rounds; explicit allowlist and all-squash test mapping, not final security selection |
| Native session A | `ab-sf-fr014-c4570f6f-app-a` | Independent NFS volume; private plugin `/home/autobyteus/data/feasibility-runtime/a` | Public workspace registration; native cwd/plugin init; API test port 57505 |
| Native session B | `ab-sf-fr014-c4570f6f-app-b` | Independent NFS volume; private plugin `/root/.claude/task-fixtures/b` | Public workspace registration; native cwd/plugin init; API test port 57522 |
| Resumed native B | Same B node | Replacement private plugin `/root/.claude/task-fixtures/b-resumed`; prior bundle deleted | Same native session ID `81298d0c-4198-437f-ad75-2f032f027f74`; actual resume/init/native Skill/Read/Write |

Immutable AutoByteus image: `sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a`. Unmodified bundled Claude Agent SDK `0.3.280`, types SHA256 `b7ac9c0ed0db5c1792a5394e72c75d69d85f4ce9edc0279487ec55d32eabfa76`. Native returned model: `claude-haiku-5-5`, requested alias `haiku`. Actual inference/quota was used for six turns because the user requested actual native-agent proof. No local model loaded.

## What Ran

Internal investigator command: `python3 tickets/in-progress/shared-network-workspaces/evidence/feasibility/fr-014/run-probe.py`. **Not the user setup command.** It builds an owned service image, starts fresh application-image nodes/private volumes, publicly registers the mounted workspace, creates task skill fixtures via the public skill API, stages private fixture-only plugins and invokes the unmodified SDK directly. It does not patch production `dist` or launch these candidate sessions through AutoByteus `createAgentRun`. Earlier FR-009 is the actual application-run API/WS evidence; neither layer substitutes for the other.

| Check | Node(s) | Actual result |
| --- | --- | --- |
| Application/API readiness | A, B | Separate public GraphQL endpoints ready |
| Mount/private state topology | Service, A, B | Separate daemon-managed NFS mounts to one export; fresh private homes/data |
| Workspace registration | A, B | Public API root/id registered at the common project |
| Native auth isolation | A, B | Only necessary Claude OAuth streamed from exact read-only Mac Keychain item to fresh private homes; no credential values or host scratch file retained |
| Native skill discovery | A, B | Public SDK control initialization/discovered command names, then actual system/init cwd/plugins/skills on first turn; different private plugin paths plus project-owned skill both discovered |
| A native Skill + Read + Write | A -> shared storage | Private helper's unpredictable content published, exactly one newline; independent client/backing bytes/hash match |
| B native fresh Read | B | Reads A content without copied content in prompt |
| B native Skill + private Read + Edit | B -> shared storage | Appends its own distinct private helper content while preserving A bytes |
| A native fresh Read | A | Sees exact B modification without B content supplied in prompt |
| Peer cleanup | A closes, B remains active | A bundle deleted; B bundle/assets survive; shared project-owned SKILL hash unchanged |
| Active B after peer cleanup | B | Native Skill and fresh Read of previously unread private asset, then exact shared output; not a cached prose-only answer |
| B resume after old bundle removal | B | Same session resumes, current plugin discovered, new helper nonce freshly read and published; not a remembered old private path |

Tools are real native Skill/Read/Write/Edit. Prototype permission mode remains `default` with a task-owned allow callback restricted to Read of the project/private bundle and Write/Edit of the project; no Bash/network/unrelated home/delegation tools. No claim this callback implements the product's future permission owner. Project-owned `.claude/skills/workspace-owned/SKILL.md` remains byte-identical; no generated skill link is published to the shared project.

## Retained Failures

- **FR-012, exit 1:** harness awaited `system/init` on an idle streaming session before a first user turn; timed out after 160 seconds. Four setup cases passed, no model turn submitted. FR-013 demonstrates the correct readiness observation: public `initializationResult()` and `supportedCommands()`, then assert native system/init on the first turn. This is not claimed as a filesystem/SDK bug.
- **FR-013, exit 1:** native Skill/Read/Write execute, but native Write omitted the fixture's terminal newline; exact-byte assertion fails. Five prior checks passed. Native tool input proves the missing LF, not NFS corruption. FR-014 makes the one-newline byte contract explicit in skill/prompt, rather than weakening byte assertions or treating the prior round as passed.
- Old FR-008 expired login, FR-009 peer-stop bug, FR-010 cache-timing failure and FR-011 causal negative proof remain historical evidence.

Exact source, configuration, image build/console/results, initialization, six turn receipts and cleanup are in `fr-012/`, `fr-013/`, `fr-014/`. Negative failure origins are separately retained in FR-012/013. No historical result overwritten.

## Architecture Implication, Not A Completed Design

Favor a native runtime's explicit **private** skill-discovery input over mutating the common project or inventing distributed temporary-link holders. The [official SDK plugin documentation](https://code.claude.com/docs/en/agent-sdk/plugins) describes local plugin paths, namespaced skills and initialization evidence. The [official skill documentation](https://code.claude.com/docs/en/agent-sdk/skills) distinguishes discovery from filesystem permissions. Installed SDK types and actual native receipts establish the tested version's capability; documentation alone was not proof.

Still investigate/design: production preparation guard and close/drain ownership; immutable managed catalog generations/supporting resources; safe staging and symlink boundaries; configured versus ALL_INSTALLED workspace collision policy; logical/bare skill names versus native plugin namespace; catalog duplicates/unresolved sources; Codex and other enabled runtimes; restore and concurrent preparation. Do not silently change existing project-owned skill policy, share CLI homes, disable cleanup or restrict sharing to skill-free agents. Production behavior remains unchanged so far.

## Setup Runtime Capability

`desktop-helper-runtime-capability.json`: existing installed desktop executable runs a read-only built-in Node program using its already-supported Electron Node mode: Darwin arm64, Node v24.16.0, user uid501, native `/sbin/mount_nfs` present, exit0. No server modules, app data, mount, administrator prompt or UI instance involved. This supports an obtainable desktop-distributed helper without requiring this Mac user to install Node separately; it is not a new packaged helper/one-command/mount proof. Linux/bootstrap distribution remains to design.

## Safety And Open Gates

All owned containers, 13 volumes per round, networks and matching service image tags removed/absence checked. Keep original application image; no global prune. Native credential copies were confined to deleted private volumes, source Keychain/user CLI config unchanged. `sr009-resource-audit.json` and cumulative cleanup audit recheck exact ownership/absence. No live user node or storage/mount changed.

The user's new direction is recorded separately: filesystem service **Linux, Docker eligible**, Mac/Linux clients and automatic managed Docker participation. Still no native Mac-mounted client, independent physical LAN computer, finished one-command setup, production/source/UI validation, design-complete classification, merged delivery or user verification. REQ-016/AC-016 are not met by FR-014's scoped success.
