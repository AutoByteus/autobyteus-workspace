# Requirements Document

## Document Status
- Status: Ready for Approval — scope recheck requested by user
- Package identifier: fix-legacy-docker-workspace-builds
- Request: Project Task b2b611bb-9a5d-49da-b1dc-fc1c8f80d42a; delegated by /project_task_manager on 2026-10-12
- Requirements owner: Solution Designer
- Date: 2026-10-12
- Current requirements baseline: R1 repair proposal held at SR-003; prior R1 / SR-001 approval retained historically, no removal approved
- Approved by: Solution Designer within the direction (user informed).
- Approval reference: 2026-10-12 conversation notice beginning “I’ve approved the repair requirements within the requested scope”; exact basis R1 / SR-001, REQ-001..004, AC-001..006, DEC-001..003; no behavior-defining supplements.
- Behavior-defining supplements: N/A — not applicable
- Authorities read: solution-designer/SKILL.md; references/requirements-engineering.md; requirements-doc-template.md; investigation-notes-template.md; solution-revision-record-template.md; task worktree AGENTS.md, DESIGN.md, TESTING.md; autobyteus-server-ts/AGENTS.md (2026-10-12). DESIGN.md is byte-identical to the shared checkout; the refreshed base's shorter TESTING.md is authoritative for this task.

## Problem And Desired Outcome
Both named Dockerfiles omit workspace dependencies required by the current server and web packages. A developer building the documented personal Docker stack is blocked during installation. Restore actual build and normal startup of both images from refreshed origin/personal; preserve license artifacts and documented deployment roles; reduce recurrence with a cheap dependency-aware check and a repeatable real-image build/start check. Final delivery is into personal after explicit user verification, not a new public release.

## Stakeholders, Actors, And Outcomes
Developer/operator: build and start the two documented images without missing workspace packages or runtime links. Maintainer: discover dependency-packaging drift early without adding expensive always-on release work. Recipient: receives the existing AGPL files and OCI label.

## Relevant Scenarios And Journeys
| ID | Actor / kind | Goal / trigger / starting condition | Product-level sequence and outcome | Alternate / error | Validity / independent evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Developer / Operational | Build a lightweight backend node from the current checkout; root-context docker build of remote-server | Build image → start its ordinary entrypoint with owned fresh data → backend health/GraphQL respond and bundled mobile entry page is served | Failed build/start is nonzero and retains diagnostics; no silently substituted image | Supported Normal Scenario; docker/compose.personal-test.yml remote-server, docker/README.md, attached BAS-001 | REQ-001,002,003 / AC-001,003,004 |
| SCN-002 | Developer / Operational | Build main server+web+browser stack; root-context docker build of allinone and documented Compose settings | Build image → start ordinary base-image/supervisor lifecycle → backend and web reachable; existing browser services remain available | Missing backend or web is failure, not a partial pass | Supported Normal Scenario; docker/README.md, README.md personal Docker section, Compose main-allinone | REQ-001,002,003 / AC-002,003,004 |
| SCN-003 | Maintainer / Operational | Verify Docker wiring after adding/changing a required workspace package | Invoke inexpensive check → sees omissions in input/build/runtime wiring; invoke documented real-image check when Docker available → build/start failures produce nonzero status | Check requires no provider keys; unavailable Docker is explicit failure/blocked, not a pass | Supported Normal Scenario; user's explicit cheap-check request; existing scripts/tests/test_docker_build_context_sources.py | REQ-004 / AC-005 |
| SCN-004 | Operator / Operational | Restart the repaired image using the same supported data mount | Start with owned data → stop/restart same image/data → still ready and state retained under ordinary readers | No volume reset or migration invented to make a check pass | Supported Normal Scenario; existing entrypoints and personal-docker down/up volume semantics | REQ-002 / AC-006 |

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational / SCN-001,002 | Both builds fail pnpm workspace package lookup; runtime lists also omit the same packages | Both build and start with complete dependency payloads | Distinct remote-server versus allinone roles and existing startup interfaces | investigation-notes.md E-001..004 |
| BEH-002 | Contract / SCN-001,002 | Dockerfiles already declare root LICENSE, LICENSING.md, NOTICE and AGPL OCI license label | Repaired built images contain identical files and existing label | Licensing content, label and package license boundaries unchanged | E-002,003 |
| BEH-003 | Operational / SCN-003 | Existing script checks COPY source existence and hardcodes only team-stream wiring; no legacy image CI builds | Dependency-aware cheap check and repeatable actual build/start check | Existing monorepo release surface unchanged; do not claim static proof equals successful startup | E-004,005 |
| BEH-004 | Operational / SCN-004 | Entry scripts keep existing data/.env; script removal is not authorized | Repaired image restarts without resetting data | Same data roots/configuration and existing volumes, browser profile conventions | E-003,006 |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Build and run the remote backend image | SCN-001,004 |
| UC-002 | Build and run the personal allinone image | SCN-002,004 |
| UC-003 | Detect workspace-packaging regression and repeat image smoke checks | SCN-003 |
### Out Of Scope
Removing either image or personal-docker.sh (user decision only); changing LLM-provider removal or runtime functionality; altering monorepo released-image architecture, provider CLI installs, public release/tag/publish flows; desktop/mobile application redesign; unrelated seeding/node-registration repairs; changing the Chrome/VNC security model or credentials.
### Non-Goals
Automatic support for every conceivable new workspace layout/build command; adding a dependency-packaging framework; guaranteeing startup performance, full browser/model journeys or all target architectures. No paid model calls or user data needed.
### Preserved Behavior Boundary
BEH-001,002,004; REQ-002,003; AC-003,004,006. Keep both image names/build paths and existing script/Compose interfaces.
### Review Authority
Blocking corrections cite an approved REQ/AC/BEH. New product policies, security model changes, migrations or compatibility promises are Requirement Gaps requiring user approval; adjacent concerns are non-blocking separate-ticket candidates. Reviewer suggestions do not amend this basis.

## Requirements
| ID | Requirement | BEH | Criticality | Rationale / source |
| --- | --- | --- | --- | --- |
| REQ-001 | Both named image builds from repository-root context succeed on the task's refreshed personal basis; required workspace dependencies are available at installation, compilation and runtime. | BEH-001 | Must | User request, BAS-001 |
| REQ-002 | Under existing supported startup configuration, remote-server serves backend/GraphQL and bundled mobile assets; allinone serves backend, development web and existing browser-service endpoints. Preserve entrypoints, ports, environment controls, data locations and restart continuity. | BEH-001,004 | Must | User request and documented deployment roles |
| REQ-003 | Each final image retains /app/LICENSE, /app/LICENSING.md and /app/NOTICE byte-identical to source, plus org.opencontainers.image.licenses=AGPL-3.0-only. | BEH-002 | Must | User explicitly requests existing licensing contract; not a legal-policy redesign |
| REQ-004 | Provide an inexpensive check that discovers newly required workspace dependency packaging omissions from current manifests, plus a documented repeatable local image build/start check that returns nonzero on failure and cleans only its owned test resources. | BEH-003 | Must within cheap scope | Existing Python checks make this proportionate; real image check is opt-in, no recurring CI cost imposed |

## Acceptance Criteria
| ID | Requirements / behavior / scenario | Trigger / observable expected outcome | Important failure outcome | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 / BEH-001 / SCN-001 | Clean root-context build of tracked remote-server Dockerfile exits 0; ordinary entrypoint on disposable data answers /rest/health and real GraphQL query; mobile entry page/assets served from /mobile/ | Workspace lookup, module resolution or startup failures fail check | Actual Docker build/run, retained logs and HTTP assertions |
| AC-002 | REQ-001,002 / BEH-001 / SCN-002 | Clean root-context build of tracked allinone Dockerfile exits 0; ordinary supervisor lifecycle with documented Compose-equivalent environment yields healthy backend, web HTTP page, noVNC HTTP and existing Chrome debug endpoint | Server-only readiness is not image startup success; retain web/supervisor failures | Actual Docker build/run, service status and HTTP assertions |
| AC-003 | REQ-003 / BEH-002 / SCN-001,002 | Both built images expose exact OCI license label and source-matching hashes for all three /app files | Label declaration-only inspection is insufficient | docker inspect and in-image byte/hash checks |
| AC-004 | REQ-001,002 / BEH-001,002 / SCN-001,002 | Current contracts resolve from built package dependencies in each final image; launch controls/image roles and existing licensing payload remain intact | Missing package/runtime symlink target fails | Package import/link assertions plus real startup; monorepo wiring checks remain green |
| AC-005 | REQ-004 / BEH-003 / SCN-003 | Dependency-aware no-Docker check passes repaired source, detects original omissions and a fixture adding a new required workspace package, and identifies missing builder source/build/runtime stage. Real-image check has documented command, nonzero failure behavior and ownership cleanup | A check that hardcodes only the two newly missing packages does not qualify; static success is not build certification | Tests of checker, including fixture/mutation checks; execute script on actual images |
| AC-006 | REQ-002 / BEH-004 / SCN-004 | Stop/restart owned containers with same data storage; health/web recover and a public-API-created disposable setting/state remains | No reset/migration/default-data overwrite used to pass | Lifecycle smoke and public API readback; no user data |

## UI, Interaction, And Experience Requirements
Applicable: No new UX design. Product artifacts, normative visual references and Product approval: N/A — not applicable. Existing web page reachability is startup proof, not a new design request.

## Quality And Non-Functional Requirements
QR-001 Reliability/operability: REQ-001,002,004 / AC-001,002,004..006. No missing graph payload; cheap checks run without Docker or provider credentials; real Docker checks use fresh test-owned resources and nonzero failure signaling.
QR-002 Compliance payload: REQ-003 / AC-003. Verify concrete files and label, not legal interpretation.

## Data Continuity And Acceptable Loss
Persisted/external data affected by intended change: No schema or semantics change. Preserve existing volumes and configuration paths; no migration. Disposable smoke data may be created and removed only by its owning check; loss of user data or other stacks' data is never permitted.

## External Contracts And Dependencies
Existing Node 22 bases; allinone autobyteus/chrome-vnc:zh default; repository pnpm workspace manifests/lockfile; existing Prisma and Nuxt compilation. Availability/download issues are external limits to record, not excuses to fake passes. Licensing contents/labels are already authoritative in source. No provider key needed.

## Supplemental Artifacts
investigation-notes.md links the attached prior API/E2E BAS-001 report, validation-only Dockerfile and container log, and historical AGPL UD-002 report. Evidence only; no behavior-defining supplement to approve. Independent architecture review: N/A pending completed classification.

## Assumptions And Decisions
| ID | Question / evidence | Reasoning and recommendation | Owner / state |
| --- | --- | --- | --- |
| DEC-001 | Keep or remove the images? Both remain documented in Docker README and Compose; remote-server is a backend node, not the removed AutoByteus LLM provider. | Keep and repair both. There is no evidence of obsolescence warranting a scope/deletion decision. | User / Reopened at SR-003; Needs user DEC-004 |
| DEC-002 | Fully automatic inclusion or bounded correction with dependency-derived checking? Monorepo itself has explicit package lists, not dynamic packaging. | Prefer proven existing ownership and a dependency-aware guard over a new assembly framework. New required packages must be caught before users build; automatic arbitrary new builds/layouts remain a non-goal. | Solution Designer / Decided within direction |
| DEC-003 | CI versus script? Existing inexpensive Python test harness; release workflow publishes a different image; recurring Docker builds add compute and scope. | Extend cheap script coverage and add a repeatable opt-in image build/start smoke command; no release/CI resource-policy change. | Solution Designer / Decided within direction |
| ASM-001 | Docker/base registry reachable | Docker Desktop server 29.0.1 responds; actual base-image pull/build readiness to be proven by downstream owners. | Implementation/API-E2E / Open execution risk, not intent ambiguity |

## Traceability / Architecture Phase Input
UC-001 → REQ-001..003 → AC-001,003,004,006 → SCN-001,004.
UC-002 → REQ-001..003 → AC-002..004,006 → SCN-002,004.
UC-003 → REQ-004 → AC-005 → SCN-003.
Architecture must verify the complete workspace install/build/runtime link path, contract dependency ordering, inherited allinone supervisor lifecycle and .dockerignore's exclusion of dist. Packaging/check implementation details intentionally deferred to architecture; no application runtime changes required.

## Readiness Check
Current/desired/preserved behavior evidence-backed and explicit: Yes. Scope/non-goals: Yes. Testable linked REQ/ACs: Yes. Scenario validity: Yes. Decisions reasoned/visible: Yes. UI/Product supplements: N/A. Current material Needs user decision: DEC-004 (retain/repair versus retire); R1 approval remains historical. Proposed retirement is described in usage-investigation.md but not approved. Forward/design readiness: No — user scope decision pending; do not implement the held R1 repair option or any removal.

## SR-003 — User Requested Usage / Relevance Check
The user interrupted before implementation handoff and requested that we first identify these images and whether they are used. Current-machine Docker inventory shows only seven public-launcher monorepo :beta nodes, not the personal developer stack. See usage-investigation.md for current paths, historical purposes and evidence limitations. DEC-001's preservation choice is reopened for user scope direction; no product deletion or requirement change is approved.

DEC-004 (Needs user; owner User): retain/repair the personal-docker.sh developer harness, or retire it and its two Dockerfiles/Compose/wrapper/docs references? Reasoning: it is not used by current local nodes or publishing; the released monorepo+launcher retain backend remote-node support. Recommend retirement if the user no longer needs its web-in-Docker test workflow; otherwise repair. All R1 REQ/AC content above remains the repair option, not authority for deletion. Content/forward readiness: on hold pending this scope decision.

## SR-004 — Updated Decision Recommendation
DEC-004 remains Needs user. Latest user evaluation suggests monorepo is sufficient; evidence now confirms that monorepo supports BOTH pipeline publication and local source builds (existing server docker-start.sh/build.sh). Recommend retaining that entire current pathway and retiring the old personal developer harness, not repairing its unused variants. See usage-investigation.md SR-004 for exact proposed scope and preserved paths. Approval prompt must clearly cover deletion/reference cleanup; user uncertainty/preferences are not fabricated as explicit removal authorization.
