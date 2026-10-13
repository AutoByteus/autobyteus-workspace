# Requirements — Node2 Prisma Engine Startup Recovery

## Document Status
- Status: Approved; baseline R2; current revision SR-002 (user-prioritized operational slice O1).
- Package: docker-node2-prisma-engine-mismatch; Task project_task_3466c3eb-4f04-4ca8-b487-dbcf4c90da14.
- Requested by: /project_task_manager; AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d.
- Requirements owner/date: Solution Designer / 2026-10-13.
- Approved by: Solution Designer within supplied user direction, user informed in current conversation: “I’m keeping the correction narrow: make startup use engines matching its installed Prisma CLI, then recover only node2 with a backup first. No cache/data deletion, changes to 8001, or image release.”
- Direction: user “yes please ... what is the reason”; subsequent “could you have a look at the 8001 docker envionement ... working fine”; direct “Can you directly fix the engine on Node 2? ... Is it possible?” permits node2-specific repair, not blame or wider rollout.
- Exact approval: R2 / SR-002, all requirements/ACs below with current-slice sequencing; no normative external supplement. Evidence supplements factual, not alternative requirements.
- Authorities read: solution-designer skill, requirements-engineering.md and requirements/investigation/revision templates; base AGENTS.md, DESIGN.md, TESTING.md, server AGENTS.md.

## Problem And Desired Outcome
Node2 retains original storage but Prisma migration startup selects an incompatible root-home engine despite matching bundled engines. Restore actual backend readiness safely, explain cause/provenance against confirmed healthy8001, and correct automatic engine discovery for supported package layouts without upgrading dependencies or changing migration semantics.
Actors: node2 user; server startup; engineering/delivery operators; manager reconciling operation project_task_177e099f-3d40-4f21-a905-68e61e07c0ad.
Success: compatible engine selection, regression proof, node2 HTTP readiness with verified original mounts/settings/data continuity, working node left running; source correction delivered through repository workflow. Readiness is not a declaration that every historical run or unrelated service is healthy.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | System / SCN-001,002 | Package-local search misses pnpm root virtual store; cache platform/mtime ignores revision (E-005..008). | Automatically select engines belonging to installed CLI, never force unrelated cache revision. | Platform preferences, complete explicit override pair, operational DATABASE_URL, migration deploy/baseline/error propagation. |
| BEH-002 | Operational / SCN-003 | Node2 FATAL,8003 resets; original mounts retained (E-001..003,006). | Recover only node2 with matching installed engines and safe backup before data-affecting action. | All original storage/settings;8001 and other workloads not modified. |
| BEH-003 | Operational / SCN-004 | 8001 HTTP200; identical image/code, different retained engines; cache writer unknown (E-006..010). | Explain root/cache purpose, real differences, why startup exposes bug and limits of historical attribution. | No invented DB corruption, fetched-image change, malicious actor or historical cause. |

## Scope Guardrail
| Use case | Supported scope | Scenarios |
| --- | --- | --- |
| UC-001 | Start server with compatible Prisma CLI/engine resolution | SCN-001,002 |
| UC-002 | Data-preserving repair/readiness of restored node2 | SCN-003 |
| UC-003 | Read-only diagnosis/provenance and8001 comparison | SCN-004 |
Out of scope: volume/cache/workspace reset/deletion/prune, schema reset, unsupported downgrade, migration bypass, broad upgrades/refactor, shared-network workspaces, legacy Dockerfiles, installer apostrophe bug, changes/restarts/recreation/upgrades to nodes0/1/build/user workloads, model inference, secret contents, image publication/release/wider rollout without separate decision.
Non-goals: proving all old run history usable, reconstructing unrecorded actor history, certifying every platform or runtime provider.
Preserved boundary: BEH-001..003; REQ-003..006; AC-003..006. Automatic discovery fix does not redefine custom-engine operator responsibility. No new failure gate auditing historical data.
Review authority: findings protect approved REQ/AC/BEH; new policy/compatibility/operational scope is Requirement Gap requiring Solution Designer recovery and applicable approval. Out-of-scope findings become accountable follow-ups, not ticket growth.

## Requirements
| ID | Requirement | Behavior / priority / decision |
| --- | --- | --- |
| REQ-001 | Automatic startup discovery supports actual workspace/packaged layouts and prefers the installed CLI's engine pair. | BEH-001 / Must / DEC-001 |
| REQ-002 | Cache fallback may select only the installed CLI's expected engine revision and compatible platform. If identity is unavailable or no matching pair exists, do not inject arbitrary cached overrides; retain normal Prisma resolution/error behavior. | BEH-001 / Must / DEC-001 |
| REQ-003 | Preserve both explicit engine overrides, supported platform selection, canonical database target, migration deploy, existing P3005 baseline handling and genuine migration failure safety. | BEH-001 / Must / DEC-002 |
| REQ-004 | Repair node2 only; back up affected data/settings before data-affecting remediation; retain all four named volumes and both host binds, data/settings/sign-ins and workspace continuity; no acceptable user-data loss. Leave ready node2 running. | BEH-002 / Must / user direction |
| REQ-005 | Validation uses isolated test-owned resources; user node checks are approved read-only diagnosis or final operational verification, not test targets. No mutation/restart of8001 or other workloads, secret content output or model work. | BEH-002,003 / Must / TESTING/user constraints |
| REQ-006 | Report evidenced cause/history/8001 comparison and cache provenance limits. Actual backend readiness must be verified, not inferred from container status; distinguish schema success from all historical-data usability. | BEH-002,003 / Must / user clarification |
| REQ-007 | Deliver narrow tested source fix/regression coverage via engineering workflow. Node2-only compatible-engine repair need not wait for public image release; no publication/rollout is implied. If publication or broader live changes become necessary, obtain separate decision. | BEH-001,002 / Must / DEC-003 |

## Acceptance Criteria
| ID | REQ / scenarios | Observable outcome / alternate | Verification intent |
| --- | --- | --- | --- |
| AC-001 | 001,002 /001,002 | Real pnpm workspace layout resolves CLI-matching bundled pair even with incompatible cached pair; discovery does not scan unrelated engine packages as authority. | Regression fixtures + installed-image isolated proof. |
| AC-002 | 002 /002 | Expected-revision cache works when bundled pair absent; newer-mtime wrong revision/wrong arch/partial pair cannot win; unknown CLI identity leaves arbitrary cache unused. | Focused unit matrix; database-free RPC in isolated reproduction. |
| AC-003 | 003 /001,002 | Complete explicit pair and DATABASE_URL respected; target preferences preserved; deploy/P3005/real-error propagation unchanged. | Existing and targeted startup tests/typecheck. |
| AC-004 | 004,005 /003 | Safe affected-data/config backup receipt, original mounts/settings/workspaces retained, node2 migration/start/readiness HTTP200/status ok; other container IDs/images/start/mounts unchanged; restored node left running. | Delivery-only operational pre/post checks plus user verification; no claim of byte-identical DB if normal startup writes. |
| AC-005 | 005,007 /001..003 | Current worktree build validated on owned container/free loopback port/private data; regression reproduction fails baseline and passes correction; only owned resources cleaned. No release/tag/wider node action without decision. | Implementation/source/API/delivery records. |
| AC-006 | 006 /004 | Source history + HTTP-confirmed8001 engine/cache comparison + metadata/image-origin distinction recorded; exact writer unknown reported if unprovable. | Cause brief linked to factual evidence. |

## Relevant Scenarios And Journeys
| ID | Kind / actor / goal | Trigger / starting condition / steps | Outcome / supported alternate | Validity / independent basis |
| --- | --- | --- | --- | --- |
| SCN-001 | System / startup / open normal server | Supported Docker/packaged startup with installed Prisma; config initializes, schema deploy occurs, repository/services/transports start. | Compatible runtime; real schema/deployment failure retains existing fail behavior. | Supported Normal Scenario / supervisor/startup docs, runtime source, healthy8001. |
| SCN-002 | Contract / read-only packaged startup / compatible engine availability | Existing read-only packaging may rely on revision-matched prepopulated cache if bundled native pair absent. | Matching cache used; absent matching pair leaves Prisma's normal failure/default resolution rather than wrong-engine override. | Supported Explicit Edge Scenario / released linux-appimage-prisma-erofs evidence, existing fallback contract. |
| SCN-003 | Operational / user / restore node2 without loss | User approves targeted correction after normal installed-launcher recreation retaining storage; back up affected state, apply compatible-engine selection, resume startup, verify readiness/preservation. | Working original-storage node; later distinct data/startup failures reported without reset/bypass. | Supported Explicit Edge Scenario / current user authorization and observed FATAL. |
| SCN-004 | Operational / user / understand why8001 works | Authorized read-only control comparison; inspect identity, HTTP readiness, resolver/package/cache metadata/log facts and history; explain. | Concrete cause plus attribution limits, no other-node mutation. | Supported Normal Scenario / direct request, E-006..010. |
Manipulating DB/schema, deleting cache to make tests green, arbitrary malicious file corruption: Technically Possible but Unsupported/Contrived; not premises for new machinery.

## Quality / Data / Dependencies
- Reliability (QR-001→REQ-001..003/AC-001..003): identity/platform-matched resolution; no arbitrary cache injection; preserve true migration errors.
- Privacy/safety (QR-002→REQ-004..006/AC-004..006): zero data loss; no secret contents in evidence; no writes to control node.
- Operability (QR-003→REQ-007/AC-005): node2-local reversible compatible-engine correction, explicit release boundary.
Data continuity: existing user data directly retained; no new format transformation approved. Normal startup may execute already-shipped pending schema/app-data migrations; back up affected data first and report dispositions. No new migration or historical schema rewrite authorized. Untouched root-home credentials/browser/workspace must not be copied into Git evidence. Unknown integrity/later startup limits remain for Delivery verification; engine RPC proof is DB independent.
External contracts: installed Prisma CLI expects its @prisma/engines-version revision; upstream cache/overrides and repository startup ordering. No dependencies/lockfile upgrade.
UI/Product: N/A — no requested UI/UX change, no Product artifacts or behavior-defining visual supplements.

## Decisions / Assumptions
| ID | Reasoning then decision | Owner / status |
| --- | --- | --- |
| DEC-001 | Same image works8001 with matching cache; node2 misses installed engines and selects wrong revision. Repair automatic identity-aware discovery, not dependency upgrades/cache deletion. | Solution Designer / Decided within direction |
| DEC-002 | Existing custom overrides and migration failure safety are intentional operational contracts; preserve them, restrict only automatic discovery. No new cache corruption/security-verification framework. | Solution Designer / Decided |
| DEC-003 | User explicitly asks direct node2 engine repair; matching binaries already installed. Prefer narrowly pinning existing compatible pair for node2 while durable source fix follows review. No image release is needed to make this repair; if that changes, stop for release decision. | Solution Designer / Decided |
| ASM-001 | Correct-engine selection explains observed RPC failure, but later migration/startup readiness is not yet proven. | Verified mismatch only; Delivery owns full readiness, return findings if blocked. |
No material Needs user decision for R1. No hypothesis that destroy altered image or data, or that a specific person/tool wrote the cache.

## Traceability / Supplements / Architecture Input
REQ-001,002→UC-001/BEH-001/AC-001,002/SCN-001,002; REQ-003→UC-001/BEH-001/AC-003/SCN-001,002; REQ-004→UC-002/BEH-002/AC-004/SCN-003; REQ-005→UC-001..003/BEH-002,003/AC-004,005/SCN-001..004; REQ-006→UC-002,003/BEH-002,003/AC-004,006/SCN-003,004; REQ-007→UC-001,002/BEH-001,002/AC-005/SCN-001..003.
Factual supplements inventoried in investigation-notes.md: operator Task context and investigation-evidence, cause-comparison.md. No independent intended behavior or normative supplement.
Architecture must verify realpath-based CLI dependency resolution, packaged dependency layouts, cache identity boundaries and node2-local no-release recovery; preserve migration owners/schema/app-data ordering. Defer exact resolver/file design and operational mechanism to approved architecture.
Readiness gate: current evidence, desired/preserved behavior, guardrail, linked measurable REQ/AC/scenarios, privacy/data continuity, decisions and supplemental applicability all checked Yes; Product N/A. R2 ready and approved for current operational-slice design; no implementation/validation/delivery completion claimed.

## R2 — Restore Usability First (User-Prioritized Slice O1)
User subsequently directs: “node2 ... could you fix it directly make sure the server can be started” and “after that we start to dig deeper why two engines. make sure the docker can be used first”. This supersedes R1 sequencing, not preservation safeguards.
- Approved by Solution Designer within this explicit user direction, user informed in current conversation: “Node2 recovery comes first. The immediate change will only pin startup to its already-installed matching engines, with a data backup; deeper investigation and the durable source correction follow afterward.”
- CURRENT O1: REQ-003..006 and operational portion REQ-007; AC-003 (explicit override preservation),004,005 (isolated operational proof),006 (already-observed comparison with remaining origin investigation deferred). SCN-003 current production change; SCN-001 preserved startup contract; SCN-004 evidence complete enough for repair.
- DEFERRED O2: REQ-001,002, durable-source portion REQ-007 and AC-001,002 plus changed-source validation portion AC-003,005; further history/provenance investigation AFTER node2 usable. Not waived, canceled, completed or authority for source implementation in O1. O2 requires completed design and applicable route; current delivery receipt must return to Solution Designer to resume O2, not mark original Task DONE.
- No source/dependency/image/launcher edits in O1; existing installed explicit engine override contract is permitted for node2 only. No image publication or recreation needed. Scope remains narrow; if backup/normal startup reveals a distinct blocker, report precisely rather than reset, bypass migrations or mutate other nodes.
