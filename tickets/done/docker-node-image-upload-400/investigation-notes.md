# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause confirmed; requirements basis approved; solution package ready for architecture review
- Investigation Goal: Identify the exact cause of image-bearing message HTTP 400 responses on the Docker-backed node exposed at `localhost:8001`, distinguish environment/configuration/version defects from code defects, and establish a correction scope.
- Scope Classification: `Small`
- Scope Classification Rationale: the uploaded file reaches draft storage successfully; the failure is one incorrect logical owner identity at the existing web-to-context-file finalization boundary.
- Scope Summary: correct the Team send path so a nested Agent's context-file final owner uses its exact containing TeamRun ID rather than the root TeamRun ID; preserve server validation, storage, Docker behavior, and direct-root/text paths.
- Primary Questions Resolved:
  - Port 8001 is owned by `autobyteus-server-0`; it uses the same current Docker image as other default server nodes.
  - Upload succeeds; `POST /rest/context-files/finalize` returns HTTP 400.
  - Backend detail is `Unable to resolve context-file owner member '<nested address>' for TeamRun '<root department run ID>'.`
  - The web send owner passes the root TeamRun ID, while the established server contract requires the target Agent's containing TeamRun ID.

## Request Context

The user reported that an AutoByteus UI connected to the Docker node at `http://localhost:8001` can send text but receives Axios HTTP 400 whenever one image is attached. The same user can attach and submit images through the current embedded node. The affected UI was running a Software Development Department with nested Requirements, Product, and Software Engineering Teams.

User evidence image:
`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f6d1310e9fc34d75957f0cf45c5dc2fc/solution_designer_5bb2d6e8f5594b70a786c6ea16f5a9e6/context_files/ctx_b35f5b9fc019__image.png`

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400`
- Current Branch: `codex/docker-node-image-upload-400`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-image-upload-400`
- Bootstrap Base Branch: `origin/personal` at `fd9b33e20ace3e7c221f931dbbcd5f4acf1df65f`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-27 before worktree creation.
- Task Branch: `codex/docker-node-image-upload-400`, created from refreshed `origin/personal` and tracking it.
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: all authoritative artifacts and any future implementation must remain in this dedicated worktree; the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout is not the task workspace.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/docker-node-runtime-evidence.md` | Durable focused runtime/root-cause evidence for the 8001 node and working comparator | Container/image identity, exact 400 events, staged files, topology mismatch, working direct-root evidence, implicated code, and focused test result | Requirements, investigation notes, future design spec | REQ-001, REQ-002, REQ-003; AC-001, AC-002, AC-003, AC-004 | Complete | N/A — evidence only | Keep aligned if later evidence changes the root-cause conclusion |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-27 | Other | User description and attached screenshot at the path recorded above | Establish symptom and affected node | Text succeeds; adding one image produces Axios HTTP 400 on port 8001; embedded-node attachment succeeds | No |
| 2026-08-27 | Other | User clarification and explicit ticket approval in the active conversation | Lock intended behavior and authorize design | Any focused Agent must accept text, an image/context file, or both regardless of nesting; the user approved the ticket after root-cause confirmation | No |
| 2026-08-27 | Command | `git fetch origin personal`; dedicated worktree creation | Establish isolated task workspace from fresh base | Worktree created successfully from refreshed `origin/personal` | No |
| 2026-08-27 | Doc | `.codex/skills/solution-designer/design-principles.md` | Apply canonical identity, ownership, and persisted-data rules | Exact boundary identity and no-fallback principles govern the correction | No |
| 2026-08-27 | Command | `docker ps --no-trunc`, `docker inspect autobyteus-server-0`, `docker inspect autobyteus-server-5`, `docker image inspect autobyteus/autobyteus-server:latest` | Identify container and compare runtime/image configuration | Port 8001 is `autobyteus-server-0`; affected and port-8006 nodes use the same digest; mounts are writable and structurally equivalent | No |
| 2026-08-27 | Log | `docker logs --timestamps --since 2h autobyteus-server-0` plus focused `rg` | Find exact failing endpoint and backend cause | Three `/rest/context-files/finalize` 400s identify nested-member resolution against the root department TeamRun | No |
| 2026-08-27 | Data | Read-only inspection of `/home/autobyteus/data/draft_context_files` | Determine whether upload or finalization fails | Three PNG drafts exist for failed nested-member attempts, proving upload succeeded | No |
| 2026-08-27 | Data | Read-only inspection of affected `team_run_execution_tree.json` | Compare root and containing TeamRun identities | Product Prototyper and Requirements Engineer have containing IDs distinct from the root department ID | No |
| 2026-08-27 | Data | Read-only inspection of embedded node tree and final `context_files` | Explain why current node works | `/solution_designer` is a direct-root member, so root and containing IDs match; submitted images are in final storage | No |
| 2026-08-27 | Data | `find /home/autobyteus/data/memory/agent_teams -path '*/context_files/*'` in the affected container | Test Docker/mount hypothesis | The affected container already holds many finalized images for direct-root Team members | No |
| 2026-08-27 | Code | `autobyteus-web/stores/agentTeamRunStore.ts:215-277` | Trace web Team send spine | Send owner builds final owner with `rootTeamRunId` before finalization | Yes — correct after approval |
| 2026-08-27 | Code | `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts`; `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` | Verify server semantics | Resolver queries `containingTeamRunId`; location service requires exact equality with the Agent execution's containing TeamRun ID | No |
| 2026-08-27 | Code | `autobyteus-web/services/teamExecution/teamExecutionViewState.ts`; `teamExecutionTreeSelectors.ts`; Team stream execution-tree DTOs | Determine correct frontend owner for identity resolution | Canonical tree contains required relationships, but the view exposes no direct AgentRun-to-containing-Team query | Yes — strengthen boundary in design |
| 2026-08-27 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-execution-view-projector.ts`; `team-run-execution-tree-location-service.ts`; web task-event mutation/view tests | Verify containing-Team semantics for configured, task-Agent, task-Team, and nested task-Team executions | A task Agent is contained by the Team whose `task_executions` array owns it; task-Team Agents use the task Team run; exact server location uses the same execution-tree invariant | No — encoded in design traversal and coverage guidance |
| 2026-08-27 | Test | Server context-file unit and integration tests | Verify established contract | Nested positive case uses child TeamRun; root TeamRun plus nested address is intentionally rejected | No |
| 2026-08-27 | Command | `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/context-files/context-file-owner-resolver.test.ts tests/integration/api/rest/context-files.integration.test.ts` using temporary dependency symlinks, then removing them | Execute focused current-source evidence without live mutation | `2` files and `9` tests passed | No |
| 2026-08-27 | Test | `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Check web regression coverage | Attachment case is direct-root; nested case has no uploaded attachment and does not assert final owner | Yes — downstream coverage investigation |
| 2026-08-27 | Code | Context-file finalization, layout, and draft cleanup services | Assess storage/migration impact | Final files use resolved owner; failed drafts expire under existing 24-hour TTL; no schema change is needed | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User submits a supported browser-uploaded context file to a direct-root Team Agent | Composer stages file -> Team send uses root ID/address -> finalization resolves direct member because root equals containing Team -> file moves to AgentRun memory -> Team WebSocket dispatch | Supported image reaches exact direct Agent; final file is run-owned | Existing final files; direct-root topology; current code |
| BEH-002 | User | User submits a supported browser-uploaded context file to a nested Team Agent | Composer stages file -> Team send supplies root ID with rooted nested address -> server exact containing-Team lookup returns no member -> HTTP 400 -> no Team WebSocket dispatch | Draft upload succeeds, but valid nested send is rejected; file remains staged | Exact logs, three staged PNGs, affected tree, source trace |
| BEH-003 | User | User submits text only to the same nested Agent | No uploaded draft requires HTTP finalization -> Team WebSocket sends exact target AgentRun -> runtime responds | Text succeeds and must remain unchanged | Screenshot, upload-store early return, runtime logs |
| BEH-004 | Contract | Team final context-file owner uses exact TeamRun/member identity | REST parses owner -> resolver calls location service with `containingTeamRunId + memberAddress` -> exact tree lookup returns physical AgentRun memory location -> finalization/read uses it | Server never guesses by basename or across Team scopes | Resolver/location code and server integration tests |

## Design Health Assessment Evidence

- Change posture: `Bug Fix`
- Candidate root cause classification: `Boundary Or Ownership Issue`
- Refactor posture evidence summary: a narrow boundary strengthening is required. The canonical Team execution view owns the execution tree and exposes root ID, AgentRun, and member address, but not the containing TeamRun query required by the final-owner boundary. The send store must not traverse or guess independently.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Web Team send store | Uses `rootTeamRunId` for final owner of every focused Agent | Incorrect identity crosses context-file boundary | Use exact containing-Team identity |
| Team execution view + DTOs | Canonical tree contains `team_run_id` at every Team node but view lacks AgentRun location query | Existing authoritative boundary is too thin | Add singular query; avoid send-store traversal |
| Backend resolver/location | Exact containing-Team/member lookup is coherent and tested | Backend owner and invariant are healthy | Keep unchanged; no fallback |
| Existing web tests | Direct-root attachment test masks mismatch; nested test has no uploaded draft | Cross-topology contract gap allowed regression | Add nested uploaded-attachment coverage |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Team send lifecycle and final attachment submission | Supplies root TeamRun ID as every final owner | Must consume exact execution location before finalization |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Authoritative reactive Team execution read model | Exposes root ID, AgentRun, member address, tree, and focus but not containing TeamRun by AgentRun | Correct boundary to expose missing query |
| `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` | Canonical tree traversal/projection | `collectExecutionAgents` drops containing-Team identity while traversing | Internal projection/query should retain it for every execution kind |
| `autobyteus-web/utils/contextFiles/contextFileOwner.ts` | Typed client owner descriptors/builders | Final `teamRunId` means containing TeamRun to server | Call site must pass exact semantic value; no parallel shape needed |
| `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts` | Logical final owner to physical Team Agent location | Correctly delegates exact lookup | No production change expected |
| `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` | Exact Agent location from active/stored V2 tree | Filters exact containing TeamRun and address | Established invariant to preserve |
| `autobyteus-server-ts/src/context-files/services/context-file-finalization-service.ts` | Moves staged file to resolved final storage | Failure occurs before file move | No storage/migration change expected |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Web Team send coverage | No nested uploaded-attachment final-owner assertion | Coverage gap to evaluate/fill downstream |
| `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts` | REST exact-identity coverage | Proves containing-Team success and root+nested rejection | Preserve as server boundary coverage |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-27 | Trace | `docker logs --timestamps --since 2h autobyteus-server-0` | 400s at `04:49:38`, `04:50:30`, and `04:52:42` UTC; all owner-resolution failures for nested members against root TeamRun | Deterministic identity bug, not transient upload failure |
| 2026-08-27 | Probe | Read-only container `find` under `draft_context_files` | Failed PNGs of 538300, 792233, and 405417 bytes were staged | Multipart upload, size, and write path succeeded |
| 2026-08-27 | Probe | Read-only execution-tree traversal | Product Prototyper containing run is `product_design_prototyping_team_25c...`; request used root `software_development_department_644...` | Exact mismatch reproduces backend error |
| 2026-08-27 | Probe | Embedded-node tree and file inspection | `/solution_designer` root and containing IDs match; two images are final files | Comparator differs by topology, not attachment or Docker capability |
| 2026-08-27 | Test | Focused server test execution | `2` files, `9` tests passed; root+nested is intentional negative case | Server contract healthy; fix belongs to web identity selection |

## External / Public Source Findings

N/A. Local runtime, source, and durable tests fully establish the defect.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: running `autobyteus-server-0` for read-only inspection; repository tests use temporary filesystem/SQLite fixtures.
- Required config, feature flags, env vars, or accounts: none beyond the running node and repository test configuration.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: dedicated worktree; temporary dependency-directory symlinks to the unchanged shared installation for focused tests, removed afterward.
- Cleanup notes: dependency symlinks removed; test DB is under ignored `autobyteus-server-ts/tests/.tmp`; container was not changed or restarted.


### Reproduction Sufficiency Decision

The user authorized an additional frontend-driven reproduction if useful. A new pre-fix frontend launch was not required for design certainty because the retained evidence already comes from three real supported UI attempts on the affected node, not synthetic calls: each browser upload staged a valid PNG, each send issued the same failing finalization request, and exact container logs plus the current execution tree identify the identity mismatch. Focused server tests independently confirm the boundary contract. Starting another frontend would repeat the deterministic pre-fix failure without resolving an open design question. Live browser validation of the corrected build remains downstream API/E2E scope.

## Findings From Code / Docs / Data / Logs

### Root Cause

`agentTeamRunStore.sendMessageToFocusedMember` builds the final Team-member context-file owner with `rootTeamRunId`. `ContextFileOwnerResolver` correctly interprets this field as the exact containing TeamRun and calls `TeamRunExecutionTreeLocationService.findAgent({ containingTeamRunId, memberAddress })`. For a direct-root Agent, both identities coincide. For a nested Agent, they differ, so the exact lookup returns `null` and REST returns HTTP 400.

### Why It Appears Node-Specific

The current embedded conversation targets `/solution_designer` in a root Software Engineering Team. The 8001 conversation targets `/product_design_prototyping_team/product_prototyper` in a nested Product Team under a root Software Development Department. The embedded node succeeds because its topology masks the root/containing substitution; the Docker node exposes it.

### Why It Is Not Temporary

The same mismatch failed three times for two nested Teams. The backend error is deterministic, and the current client always constructs the same incorrect final owner for nested members. Restarting or retrying cannot change that identity.

### Test Gap

The server suite correctly rejects a root TeamRun ID paired with a nested member. The web attachment send test uses a direct-root member, while the nested send test uses an empty attachment list, so no assertion connects frontend final-owner construction to the server's nested identity contract.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: staged files under `<app-data-dir>/draft_context_files/team-runs/<draft-or-root-id>/members/<encoded-address>/context_files/<storedFilename>`; final files under `<memory-dir>/agent_teams/<root>/<ancestor-team-runs...>/<agent-run>/context_files/<storedFilename>`. Three current failed PNG drafts were observed; many final files exist.
- Relevant code-model, serialization, semantic, or physical-store change: none required. Only the existing final owner value changes from root TeamRun to containing TeamRun for nested Agents.
- Normal readers and writers, including unknown/extra-field behavior: finalization/read resolve the exact logical owner through the V2 tree; draft cleanup deletes files older than 24 hours.
- Representative direct-read or compatibility evidence: existing direct-root files remain valid because root and containing IDs match; the nested server integration test finalizes/reads with the containing TeamRun ID.
- Required semantics and invariants preserved by direct use: `Yes` — exact containing TeamRun plus rooted address resolves the same physical AgentRun.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: do not rewrite/delete Team state or final files; abandoned failed drafts are disposable under existing TTL.
- Concrete benefit, cost, and risk of migration if it remains a candidate: no migration benefit exists; rewriting files would add risk without changing semantics.
- Existing migration framework or lifecycle constraints: N/A.

## Constraints / Dependencies / Compatibility Facts

- Final Team-member context-file identity is containing TeamRun ID plus canonical rooted member address.
- Root TeamRun remains the Team stream/navigation identity and may differ from final storage owner's containing TeamRun.
- The frontend canonical tree represents configured Agents, task Agents, task Teams, and nested task-Team members; the query must cover all focusable Agent kinds.
- Server exact-match behavior remains strict; root fallback or basename guessing is prohibited.
- No compatibility wrapper or dual owner shape is required because the incorrect nested caller never produced a successful final record.

## Open Unknowns / Risks

- Exact implementation shape remains for design, but the preferred boundary is clear: Team execution view exposes a singular AgentRun-to-containing-Team query backed by selector traversal.
- Unrelated historical unrooted-locator 500 logs are outside scope.
- The three failed drafts will expire under existing TTL if not otherwise removed; preserving abandoned drafts is not an approved requirement.

## Notes For Architecture Reviewer

Requirements basis approved on 2026-08-27. Expected design is a small web boundary correction with no server, Docker, schema, or migration change. Review should protect exact hierarchical identity and reject fallback/guessing proposals.
