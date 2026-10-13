# Actual Agent Round Trips And Runtime Gap — SR-008

## Result: Core Journey Demonstrated, Not Overall 100% / Implementation-Ready

User explicitly requests executing the complete instructed-agent journey now. FR-008–011 were executed, not merely planned. FR-009 completed **four actual native-model agent round trips /16 core stages** through the real application workspace/run APIs and agent WebSockets. The same path and underlying NFS storage worked. An additional peer-termination skill read failed; FR-011 causally reproduced its ownership problem three times without models.

Do not call this full Task completion, GUI/Desktop/LAN/setup proof or a wholly green suite: FR-009 exited1 on the skill failure; FR-011 exited2 to flag a reproduced product gap. Approved intended behavior remains SR-004. Native Mac, physical separate Linux/LAN and setup/design/source-build/delivery gates remain incomplete.

## Topology And Real Runtime Evidence

- Two fresh test-owned default-entrypoint application nodes, immutable AutoByteus image sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a. No live user node used as the application test target. This is existing-image feasibility, not a current-worktree build.
- Both nodes register/select `/home/autobyteus/shared/project` via public workspace and `createAgentRun` APIs, carrying both the normal workspace ID and root. Runtime resume metadata, Codex native command cwd and Claude native `pwd` output confirm the root. This is an API/WS journey, **not rendered frontend workspace-selection/Electron evidence**.
- Separate daemon-managed NFS4.1 volumes connect to one owned Ganesha export/data volume. Independent Node/Python assertions read both mounted paths and the backing `/export/project` file; exact text and SHA256 match. Those assertion reads are not the writer/reader agents' substitutes.
- Actual CLIs: Codex0.162.1 / Claude Code2.1.296. Actual returned model selection: `gpt-5.6-luna` / `haiku`. Native provider/model inference was used at the user's explicit request, consuming normal runtime quota; no scripted CLI, mocked model or paid-provider-zero-use claim.
- Credential safety: only native OAuth credential material was streamed into fresh private test homes. FR-008 used a node-0 copy that proved expired for Claude; FR-009 used the existing current Mac Claude Keychain item and node-0 Codex credential. No credential values/archive or host scratch credential files retained; source CLI configuration/Keychain not edited. No source-node agent was launched. Owned credential volumes removed. Retained evidence scanned for obvious provider-secret value patterns.

## Four Core Experiments

| Pair | Writer A / Reader B | Configured skill | A native writes | B native reads | B native modifies | A fresh native reopens |
| --- | --- | --- | --- | --- | --- | --- |
| pair1 | Codex / Claude | None | PASS | PASS | PASS | PASS |
| pair2 | Claude / Codex | Same named fixture on both nodes | PASS | PASS | PASS | PASS |
| pair3 | Codex / Codex | Same named fixture on both nodes | PASS | PASS | PASS | PASS |
| pair4 | Claude / Claude | Same named fixture on both nodes | PASS | PASS | PASS | PASS |

Each writer receives a fresh unpredictable value and writes/syncs/closes a uniquely named file using its actual native tools. B's read prompt contains the path, **not A's value**, no attachments and no copied transcript. B appends a different fresh marker while preserving the original bytes. A's reopen prompt does **not** supply B's new value. Successful native tool output reveals the exact values; independent assertions verify the complete two-line file in all three views.

Codex normalized `run_bash` events carry native `commandExecution` items, `pluginId:null`, actual cwd and exitCode0—not an AutoByteus MCP file API. Claude events include native Bash/Read/Skill. Native tool receipts and mounted/backing hashes are audited in `native-agent-proof-audit.json`.

FR-009 has20 named PASS cases (four topology/setup cases plus16 stages), but also a fatal extra peer-stop failure. Eight fresh agent runs were successfully terminated, including final cleanup. Do not add these checks to earlier storage checks and claim all acceptance criteria passed.

## Actual Failure And Causal Diagnosis

After pair4 A was terminated, the surviving Claude B was instructed to read its configured skill and the shared test file again. Its native Read of:

`/home/autobyteus/shared/project/.claude/skills/shared-probe-e70d3907/SKILL.md`

failed with file-not-found. The driver stops on a native tool failure; this is evidence of the broken access, **not proof that a model could never improvise a workaround**. Core project text remained correct. Codex's post-stop checks succeeded by reading its **private source manifest directly**, so they do not prove shared skill-link survival or cross-host portability.

FR-011 reproduces the cause using the immutable image's **unmodified** production `WorkspaceSkillMaterializer` in two independent server-node processes, with source fixtures created through public skill APIs. Both processes acquire a descriptor/holder for the same shared symlink. A releases its holder and unlinks it. B still has a holder, its private source manifest still exists, but its shared manifest becomes ENOENT. Three repetitions show disappearance after approximately1.039/1.041/1.039s under the configured one-second NFS metadata cache. This is an application ownership/lifecycle gap, not competing source-file edits or storage losing project data.

Current source corroboration: `workspace-skill-materializer.ts` process-local Map/holder registry and release451–489; `workspace-skill-links.ts` conditional unlink; Claude bootstrap79–91 and cleanup skill-release stage. A process-local last-holder decision cannot establish that another node no longer uses a shared entry.

FR-010 initially asserted B disappearance immediately and failed because B briefly retained the cached link. Retained as a harness-timing failure; FR-011 first verifies A's unlink then polls B up to5s rather than assuming instantaneous cache invalidation.

**Design impact owned by Solution Designer:** choose and experimentally validate a safe boundary for runtime-generated skill publication/discovery and cleanup on shared projects. Preserve native CLI behavior, workspace-owned entries, private source/auth state and independent agent stop/restart. Do not “fix” by world-writable permissions, changing filesystem engine alone, disabling all cleanup, forcing no-skills/single-agent use, copying credentials into shared storage or promising an unvalidated distributed holder service. No product source patch or final design decision was made in these experiments.

## Auth Failure Retained / Not Shifted To User Unnecessarily

FR-008 Codex A wrote successfully. Claude B failed before any file tool with “OAuth session expired and could not be refreshed.” This is an authentication prerequisite failure of that copied source, not shared storage failure. The current Mac login was available, so FR-009 continued without asking the user for passwords/tokens or modifying the user's login. [Official Claude authentication documentation](https://code.claude.com/docs/en/authentication) was consulted as a primary source; actual success/failure is from the probe, not generic documentation.

## Cleanup And Durable Evidence

All exact task containers, named/private credential and NFS volumes, networks and rebuilt service-image tags for FR-008–011 removed/absence checked. Source user containers/images and Mac mounts remain untouched; no native Mac mount attempted this round. No local model loaded. Shared Docker build cache not globally pruned.

- `fr-008/`: runner/driver/config/build/console/result, first native write/failed Claude read receipts and failure-origin.json.
- `fr-009/`: runner/driver/config/build/console/result and19 actual turn receipts (16 core plus3 peer-stop probes).
- `fr-010/`, `fr-011/`: causal worker/runner/config/build/console/result; no model/auth use. FR-010 timing failure preserved; FR-011 repeated gap.
- `native-agent-proof-audit.json`, cumulative experiment-index.json and cleanup-audit.json.

Pending complete-proof gates: designer-owned runtime skill integration remedy/validation; scoped native Mac mount authorization; actual separate Linux computer access; native Mac desktop and real LAN journey, rendered UI if claimed, safe one-command setup, correct storage identity/admission/failure handling, source-build final validation, merge and explicit user verification. No “100%,” completed architecture, implementation-ready handoff or delivery claim.
