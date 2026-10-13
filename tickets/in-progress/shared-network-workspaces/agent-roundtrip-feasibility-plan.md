# Instructed Agents On Shared Storage — SR-007

## Authority And Honest Status

Package: shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63. Owner: Solution Designer. User clarifies that proof must include selecting a workspace when starting an agent, instructing it to write, then instructing an agent on another node to read through the same path. This is the existing Approved SR-004 SCN-002 / REQ-003/012 / AC-002, not new product scope or proof that it already passed.

**Planned, not executed.** FR-007 used real application workspace/file APIs and terminal PTY shells, but did not create instructed agents. Eight scoped passes do not establish agent-run/native-runtime compatibility. A terminal launched by the test is not a model-selected tool call; scripted runtimes would likewise prove only their own transport boundary, not native Codex/Claude behavior. No new experiment or credential access occurred in SR-007.

## Complete Agent Round Trip

Use fresh test-owned application nodes with the same backing storage mounted at the same absolute path for the initial two-Docker-node case. Example project root from FR-007: /home/autobyteus/shared/project. Create/select the normal registered workspace on **both** nodes and supply it through the actual agent-start flow; do not rely on manually giving a shell its cwd as a substitute. No alternate local/temp workspace fallback is acceptable.

Four observable checks in one end-to-end round trip:

1. **Agent A writes.** Start a real agent on node A with the shared project selected. Send an instruction to create an ordinary test file containing a fresh unpredictable nonce. Observe the runtime's actual file/tool operation and successful completion/close; record the actual cwd/path. Use sync/close evidence when claiming the committed-file timing contract.
2. **Agent B reads.** Start a separate real agent on node B with the same project selected. Give only the file location and an instruction to open/read it, not the nonce, copied contents, attachments or A's transcript. Observe a native file/tool read and assert its exact output against independently recorded expected bytes.
3. **Agent B modifies.** Instruct B to modify the existing file (e.g. append another fresh marker) through normal runtime tools. Observe actual modification/completion, not merely a reply saying it was done.
4. **Agent A reopens.** Instruct A to perform a fresh read of the same path, without supplying B's new contents. Assert it sees B's exact modification. Independently read/hash the backing file and each mounted location to confirm there is one shared data object, not copied lookalikes.

Record both node/run IDs, image/source revision, runtime/version, selected workspace IDs and actual roots/cwd, mount/export identity, redacted prompts/tool traces, timings and exact content/hash assertions. A model reply alone is insufficient. Native CLI/tool operations must not be replaced with an AutoByteus-only sharing API. No cross-node messaging/delegation, automatic context ingestion or agent wakeup is required: the experimenter independently instructs each agent.

## Coverage And Execution Boundaries

- AC-002 already requires at least Codex and Claude Code native/runtime tools. Use the actual supported production launch paths with isolated test homes/credentials and normal sandbox policy; exercise relevant skill materialization/cleanup rather than silently proving only no-skills behavior and claiming all compatibility.
- Fresh two-Docker-node agent success would strengthen local application/runtime proof. It would **not** prove a native Mac desktop agent, a second physical LAN host, the productized setup command, safe existing-node reconfiguration, outage admission or all remaining ACs.
- Real native-platform/LAN coverage remains required. Matching absolute paths are used in this initial Docker test. Earlier user permission for different host paths where necessary is not revoked by this illustrative same-path example.
- Never test against live user AutoByteus nodes/volumes or modify CLI configuration/credentials. Native runtime authentication or provider access, if needed, must use the repository's isolated test-home/import process; do not request passwords/tokens in chat, claim missing access exists, or use scripted transport as native-runtime signoff.
- No implementation-ready route before REQ-016/AC-016. The next overall prerequisites remain scoped Mac native-mount authorization and separate Linux-machine access. Resource/model availability for this agent experiment must be established honestly, not assumed from storage success.

Canonical requirements/evidence/history/result: requirements-doc.md, investigation-notes.md, solution-revision-record.md, evidence/feasibility/feasibility-report.md and feasibility-blocker-handoff.md in this ticket. This plan is an investigation supplement, not a competing requirements/design or final API/E2E artifact.
