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
the runtime-aware model catalog rather than a Codex fallback. New run capsules
use a native-tool profile validated against AGY CLI **1.2.11**; a different CLI
version fails safely until its exact tool exposure is validated. Existing
saved capsules are not silently rewritten.

AGY version, feature, and model discovery on backend request paths uses one
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
be visible; `skillAccessMode: NONE` only prevents materialization of
AutoByteus-configured skills.

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
task workspace or retain symlinks in the capsule. `skillAccessMode: NONE`
skips configured-skill materialization without inspecting the source.
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
startup failures still fail closed. The packaged Codex definition needs its
`software-engineering-workflow-skill` in the **selected** current agent package
root; an older same-name package checkout can shadow that skill. Check the
definition's source identity and package revision before rollout rather than
assuming any root named `autobyteus-agents` is current. Live updates to
already-running skill links are not provided by this AGY capsule snapshot.

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

For **new** AGY 1.2.11 capsules, the native custom-agent allowlist is exactly
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

The provider-native `generate_image` ACTIVE/DONE step becomes the ordinary
STARTED/SUCCEEDED tool-card lifecycle, with matching invocation and turn IDs.
AGY may report DONE without output or a path; that is a truthful native-tool
success with `output: null`, not an AutoByteus-owned image artifact. AGY owns
image storage. AutoByteus does **not** find/copy/serve/index/render/retain
image bytes or paths, nor infer a file from assistant prose. Native image
ERROR or explicit denial is a non-green failed/denied tool event with fixed
safe public wording and a bounded private diagnostic. A failed or unknown
terminal provider result emits a safe turn error, not a successful turn or a
raw provider response. Successful turns retain ordinary assistant text and
completion ordering; no image-specific finalization barrier is used.

## Persistence and validation boundary

Existing run metadata, provider-binding, execution-tree, and canonical trace
shapes support newly created AGY runs; no old released AGY population or
persisted-data migration is required. Capsule deletion follows ordinary
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
