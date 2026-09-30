# Antigravity CLI Runtime

## Scope and ownership

`antigravity_cli` is an Agent runtime available to standalone Agents, flat
Team members, and direct or Team-nested AgentOrg members. The shared provider
factory is wired into both General Process and Application execution scopes;
the live Team/Org validation cited below exercised the General Process path.
The existing `AgentRunManager` creates and restores it through
`AgyAgentRunBackendFactory`; Team and Org orchestration retain their normal
root topology, exact member addresses, run IDs, scoped Agent Tools sessions,
and persisted execution trees. The runtime does not implement AGY-native
subagent orchestration. AutoByteus, Codex, and Claude retain their separate
provider paths.

Availability depends on the installed `agy` CLI. Model discovery is owned by
the runtime-aware model catalog rather than a Codex fallback. Discovery checks
required CLI features and a usable model catalog, not the CLI release version.
New run capsules use the fixed native-tool allowlist below. Existing saved
capsules are not silently rewritten. Actual capability or protocol
incompatibilities can still fail; version-independent admission does not
guarantee compatibility with every future CLI release.

`listAntigravityModels` is the single capability-and-model discovery entry
point: bounded `--help` validation followed by `models`, with no `--version`
admission request. New and restored backends both use the factory's existing
model-availability assertion. The capsule owns `AGY_NATIVE_TOOL_NAMES`
directly; there is no CLI-version profile, resolver, or injected profile DTO.
The capsule manifest's schema version remains `1`: it is not a CLI release
number. Removing version admission does not regenerate saved Markdown,
manifest hashes, or provider conversation bindings.

AGY feature and model discovery on backend request paths uses one
bounded asynchronous child-process owner. A slow CLI can still delay the
request that needs its answer, but it does not synchronously block unrelated
health requests. Probe timeout, process, authentication/network, unsupported
capability, and unparseable/empty catalog failures are classified into safe
diagnostics; raw child stderr, paths, commands, and credentials are not sent
to GraphQL or the browser. A successfully read catalog that lacks the selected
model is a different, ordinary model-unavailable result. Discovery is fresh
for each operation, not a process-global model cache.

At AgentOrg creation, the service resolves and validates every root, Team,
and Agent placement in order through one `RunModelSelectionService.validateMany`
operation. Equivalent runtime/workspace placements share catalog evidence
only within that request; distinct contexts are validated separately. The
first invalid placement retains its exact Org address in the failure. A safe
AGY discovery diagnostic travels through the existing GraphQL result and the
web launch alert; the launch state clears rather than spinning indefinitely.
Org creation configures and persists the execution tree but does not start
every member's provider conversation. Member activation remains lazy.

## Run-owned project and workspace

Each new run creates an `agy-project` capsule under its own memory directory.
The capsule contains the generated **main** agent, a manifest binding the
AutoByteus run ID and real workspace path, enabled AutoByteus-configured
skills, and a run-scoped AutoByteus Agent Tools MCP configuration. It snapshots
the composed Agent/Team/Org identity before the first real user input. It does
not write generated configuration into the selected workspace or global AGY
configuration.

The AGY process uses the capsule as its primary project and receives the real
selected workspace as an added directory. The generated agent identifies that
real path as the task workspace. This is model-directed task targeting, **not**
a filesystem sandbox or proof that every relative provider action will land
there. User/provider-owned workspace skills and MCP configurations may still
be visible alongside the AutoByteus-configured skills of the agent definition.

Before writing the run-scoped MCP configuration, activation reads (never
modifies) the selected workspace's `.agents/mcp_config.json` and the global
`~/.gemini/config/mcp_config.json` to detect a user-defined server with the
AutoByteus Agent Tools server name. A missing file, or an empty or
whitespace-only file, means "no servers", which matches how `agy` itself treats
them. A file whose content cannot be parsed as JSON fails activation with
`Cannot inspect AGY MCP collision at '<path>'`, and a same-name server fails
with `AGY_MCP_NAME_COLLISION`.

Configured skill bindings carry the resolver's winning source provenance.
For an agent-private skill in a Team, or a team-shared skill, AGY trusts only
that owning Team package root; a standalone private skill uses its Agent
package root, and a global fallback uses only the global skill's own root.
The capsule materializer snapshots regular files and file links that resolve
to existing regular files **within** that root as ordinary private files.
It rejects links that escape the root, dangling/cyclic/directory links,
nonregular targets, collisions, or a source changed during copying; a failed
candidate is removed. It does not dereference unchecked links into the real
task workspace or retain symlinks in the capsule.
Restore uses the already checked capsule bytes rather than re-resolving
possibly edited source links. The actual Team-local Solution Designer skill's
two links into its Team `shared/` directory passed a disposable full-Org
first prompt and distinct-backend same-member browser continuation, with
ordinary exact-byte capsule files and an unchanged selected workspace.

For AGY configured skills, a missing source or semantically invalid
`SKILL.md` (including malformed/unreadable content or a mismatched name) is
warned about with a sanitized identity/reason and omitted; other valid skills
and an otherwise healthy startup continue. Merely copying a skill does not
claim the provider loaded it. Unsafe provenance, source mutation, escaping or
invalid links, protected destination collisions, and unrelated provider
startup failures still fail closed. The one exception is a skill name that
already exists in the user's `<workspace>/.agents/skills/` when the run's
`workspaceCollisionPolicy` is `prefer_workspace` (an `ALL_INSTALLED` agent):
AGY leaves the workspace skill in place, omits its own copy and logs
`skipped-workspace-owned`. With `fail` (a configured agent) it still fails with
`AGY_SKILL_NAME_COLLISION` (see `skills.md`, Rule 1). A Codex definition may name
`software-engineering-workflow-skill`, but this server change does not bundle
or guarantee that content in `autobyteus-agents`. If it is absent from the
selected source and global fallback roots, AGY warns, omits it, and can answer
the first turn without claiming the skill loaded. If a run depends on an
independently available skill, verify the selected definition's source identity
and actual content rather than assuming a same-name package checkout is
current. Live updates to already-running skill links are not provided by this
AGY capsule snapshot.

`AgyStreamProcess` communicates over stdin/stdout stream-JSON pipes, not a PTY.
The created provider `init.conversation_id` is stored as
`platformAgentRunId`, distinct from the AutoByteus AgentRun ID. Restore reuses
the saved capsule and workspace, verifies the capsule snapshot, and requires
the resumed `init.conversation_id` to equal the saved provider ID **before**
input is admitted. Missing/changed workspace or mismatched provider ID fails
closed; there is no latest-conversation guess or fake bootstrap message.

## Tools, permissions, and events

AutoByteus exposes its selected run-scoped Agent Tools through the existing
loopback MCP authority. Team/Org `send_message_to` therefore uses the same
exact sender/recipient run identities and addresses as other external members;
it is not an unscoped provider-global tool endpoint.

For **new** AGY capsules, the native custom-agent allowlist is exactly
`view_file`, `write_to_file`, `replace_file_content`, `grep_search`, `list_dir`,
`find_by_name`, `run_command`, and `generate_image`. This is an allowlist of
model-exposed native names, not the CLI's broader `init.tools` registry.
AGY-native collaboration/subagent/messaging and native `call_mcp_tool` are not
granted in that frontmatter. Separately configured, run-scoped AutoByteus MCP
remains available through its own authority; an MCP image tool is not proof of
native `generate_image` exposure.

For a new editable AGY launch selection, the web draft defaults
`autoExecuteTools` to true; a later explicit off choice is retained, including
Team/Org member overrides. True maps to AGY's broad headless permission flag.
False uses its normal headless permission policy, where an action can be
denied. AGY headless runs provide no interactive approval-response command:
AutoByteus cannot turn a denial into a pending chat approval. These semantics
do not change the default for non-AGY runtimes.

`AgyStreamEventConverter` converts provider steps to canonical AgentRun events.
The ordinary recorder, WebSocket stream, run-history projection, conversation,
and Activity/Event Monitor remain the only product event path; there is no
second AGY trace archive. An AGY tool `DONE` step without explicit error is
represented as canonical tool success (green) by the approved provider-step
convention. `ERROR` or explicit permission denial is failed/denied and
non-green, even if the overall turn succeeds. A `DONE` step does **not** prove
that an underlying shell command exited zero: retain provider state/output and
do not invent an exit code.

AGY turns have no idle timeout. A turn ends only on AGY `result`, AGY process
exit/error or a stream protocol violation, or user Stop/Terminate; the 60 s
startup readiness timeout is the only clock. This matters for background
commands: while a background `run_command` step is still running, AGY withholds
later step updates, so a healthy, working AGY can send nothing for many minutes
and then deliver the withheld steps together with `result`. A daemon step (for
example a dev server started with `IsDaemon`) never reports `DONE`. When
`result` arrives while a started tool step is still unfinished, the converter
closes it before the turn's completion or turn error as canonical success with
`provider_state: "RUNNING"` and output `Started as a background task; still
running when the turn ended.`. User Stop and process death before `result`
still interrupt open tool steps instead.

Each step closed this way is also reported to `AgyBackgroundTaskMonitor`, which
shows it as a running background task (`BACKGROUND_TASK_UPDATED`, id
`<conversation>/task-<stepIndex>`, kind `shell` for `run_command`, description
from `CommandLine`). AGY's stream never reports a daemon's exit, but AGY 1.2.13
writes `<brain>/<conversation>/.system_generated/messages/<uuid>.json` when one
exits, with `sourceMetadata.tool.stepIndex` and `The command exited with code N`
in `content`. While any task runs, the monitor polls `messages/*.json` every 2 s
(reads go through `agy-brain-file.ts`: 64 KiB bound, no symlinks, confined to
the conversation) and marks the task `completed` (exit code 0) or `failed`
(other codes) with the reported result text as summary. Files it cannot parse
yet are retried; files of any other shape are remembered and ignored. When the
backend stops AGY (Stop, Terminate, process close, listener failure) every task
still running becomes `stopped`, and those snapshots are delivered before the
stop resolves. An unreadable or changed message format therefore leaves a task
running until AGY stops and never produces a false completion. Non-daemon
background commands keep their turn open and never become background tasks.

Stopping AGY also stops its background commands. AGY (observed with 1.2.12)
starts each background command in its own session/process group, shared by the
whole command tree, and such a group survives a SIGTERM of AGY alone. Whenever
AutoByteus itself stops a live AGY process, `AgyStreamProcess.stop()` does the
following. This covers user Stop, run/Team/Org Terminate, app/server shutdown,
and a stream/protocol failure while AGY is still running.

1. It lists the process table once (`ps -A -o pid=,ppid=,pgid=`, 2 s timeout)
   through the private `agy-background-process-groups` helper.
2. It selects the process groups led by a live descendant of AGY. AGY's own
   group, the server's group and pgid ≤ 1 are excluded, so nothing outside the
   run's background groups is signalled.
3. It sends SIGTERM to those groups, then SIGTERM to AGY.
4. About 1.5 s later it sends SIGKILL to the same groups. This timer is unref'd.

A normal turn end never stops AGY, so daemons keep running between turns. A
helper failure is logged as `AGY_BACKGROUND_GROUP_STOP_FAILED` and AGY is still
stopped. There is no background-process tracking. Documented limits:

- If AGY exits on its own (crash), its background groups are already orphaned
  and are not found.
- Commands that detach themselves further (`setsid` inside the command, Docker
  containers, system services) are not found.
- Windows keeps the previous behavior (AGY only).
- A daemon that ignores SIGTERM can outlive an app quit, because the delayed
  SIGKILL may not run before the process exits.
- A hard-killed server (no graceful shutdown) leaves AGY and its daemons
  running.

The provider-native `generate_image` ACTIVE/DONE step becomes the ordinary
STARTED/SUCCEEDED tool-card lifecycle, with matching invocation and turn IDs.
Its provider `parameters` (including the prompt) are shown as ordinary public
tool arguments. AGY's stream DONE step carries no output or path, so on native
image DONE the converter asks the off-spine `agy-step-output-reader` for AGY's
own persisted step output,
`~/.gemini/antigravity-cli/brain/<conversation>/.system_generated/steps/<step>/output.txt`.
The reader makes one synchronous bounded read (≤16 KiB, opened without
following a final symlink) and parses the `Generated image is saved at <abs>`
line. It accepts the reported path only when it is a regular, non-symlink file
whose realpath lies inside that conversation's brain directory. On success the
SUCCEEDED result is `{ provider_state: "DONE", output: <AGY output text>,
file_path: <absolute path> }`. The shared `FileChangeEventProcessor` then
projects exactly one `generated_output` Artifacts entry, which is served by the
ordinary run file-change content route. AGY still owns image storage.
AutoByteus does not copy, move or retain the bytes, and it never infers a file
from assistant prose.

If the step output is missing, unsafe, oversized, worded differently, or
reports a path that is missing or outside the conversation (for example, a
pre-layout conversation or a changed AGY version), the tool stays a truthful
success with `output: null` and no Artifacts entry. The server then logs one
content-free warning, `AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=<runId>
step=<n> reason=<code>`. Reason codes are `INVALID_IDENTITY`, `OUTPUT_MISSING`,
`OUTPUT_UNSAFE`, `OUTPUT_TOO_LARGE`, `PATH_NOT_FOUND_IN_OUTPUT`,
`PATH_OUTSIDE_CONVERSATION`, `IMAGE_MISSING`, `READ_FAILED` and
`RESOLVER_FAILED`. Neither the reader nor the converter lets a lookup failure
throw into the backend event queue. The step-output layout is undocumented AGY
internals, validated only against AGY 1.2.12. The gated live e2e tests
(`agy-native-image-step-output`, `agy-native-image-app-chat`) are the drift
detectors. Native image ERROR or explicit denial is a non-green failed/denied tool event with fixed
safe public wording and a bounded private diagnostic. A failed or unknown
terminal provider result emits a safe turn error, not a successful turn or a
raw provider response. Successful turns retain ordinary assistant text and
completion ordering; no image-specific finalization barrier is used.

## Persistence and validation boundary

Existing run metadata, provider-binding, execution-tree, and canonical trace
shapes support AGY runs. The version-independent admission change requires no
persisted-data migration or reset; existing saved capsules remain authoritative. Capsule deletion follows ordinary
run-memory retention, while provider-side conversations remain provider-owned.
The reviewed live transport coverage exercises real AGY Team and direct/nested
Org members through HTTP GraphQL/WebSocket, scoped MCP delivery, public member
projection/trace, and quiescent stop/restore. A separate opt-in real-process
browser journey starts Team and Org members in backend process A, cleanly stops
A, starts process B against the same data, then selects the same Team member,
direct Org member, and nested Org member in a fresh browser. Each selected
conversation displays its old reply before a new send and both old and new
replies afterward, with exact identities retained in public projections. This
proves clean process-restart continuation for those paths, not arbitrary
mid-turn termination, crash/SIGKILL recovery, an Electron-shell run, or
compatibility with every AGY CLI version.

The full-size Org browser regression used one root, three Teams, and fourteen
Agents (18 AGY placements) against the real built backend. It observed an
active persisted tree, one delayed real CLI catalog discovery for equivalent
placements, and responsive concurrent health. Separate timeout, nonzero
discovery, and valid-catalog/missing-slug controls showed finite addressed,
safe browser alerts and reset launch controls. These are browser/equivalent-
backend checks, not proof that a packaged Electron shell was manually tested.
The later actual-Solution-Designer member test also verified a first AGY
provider binding and visible answer after lazy activation, then old and new
answers after backend A→B restoration. Backend A exited 1 on SIGTERM with a
generic supervisor-close error, so this test is **not** a clean-shutdown
claim; the subsequent B-side restore/continuation passed. It does not prove
the user's normal Org or the superseded Electron package is fixed.
