# Requirements R3 — Completed Node2 Operational Recovery

## Document Status / Approval
- Status Approved; exact baseline R3 / SR-003; package docker-node2-prisma-engine-mismatch.
- Current Task project_task_3466c3eb-4f04-4ca8-b487-dbcf4c90da14; Requested by /project_task_manager, AgentRun project_task_manager_a5f6d9d306e54970bafdad895bdf731d.
- Owner/date Solution Designer /2026-10-13. Approved by USER: exact message in delivery-evidence/dr-002/user-acceptance-scope-change.json, explicitly accepts working node2/current ticket done and requests deeper work in a SEPARATE follow-up if source cause is found. Solution Designer integrates that approval and informs user in current conversation: “Node2 is now running successfully on8003 ... keep this ticket limited to completed recovery ... separate follow-up”.
- This supersedes prior R2 SAME-Task O2 continuation. Prior R1/R2 intent/history retained in solution-revision-record.md and committed historical versions; no fabricated prior pass or waived source fix.
- Follow-up registered TODO project_task_6b8c9612-c94b-4d62-8053-00ef94bd94df; manager owns dispatch. Deeper obligation MOVED, not completed/canceled/waived. Registration is not delegation/implementation start.
- Current technical approval/review applicability: executed O1 mechanism unchanged from reviewed R2/D1-O1 / ARCH-REV-001. Administrative scope partition only; D1.1 updates finalization/Task boundary, not live/source behavior. No review/repair/API replay required solely for this split.
- Authorities read: solution-designer skill/requirements-engineering/templates, current AGENTS/DESIGN/TESTING/serverAGENTS and startup/migration policies. Integrated policies diff against bootstrap empty, checked2026-10-13.
- Approval supplement: exact user acceptance/scope message above; factual evidence inventory remains investigation-owned.

## Problem And Desired Outcome
Original node2 backend startup selected an incompatible persisted cached Prisma engine despite matching installed binaries. CURRENT ticket outcome is safely restored usable node2 with original storage/settings and honest cause/control evidence. No application source change is required to close this recovery ticket after final repository/documentation/cleanup gates.
Already achieved by Delivery DR-001/002: matching explicit pair, normal migration/startup, repeated8003 HTTP200/statusok, original mounts/settings/key and other workloads preserved, node left running, user acceptance. Repository finalization remains pending; no Terminal/Task DONE until finalized receipt verified.
Further automatic-discovery/source/provenance investigation and conditional durable correction belong ONLY to separate follow-up above. Current pin survives restart of same container, NOT recreation from unfixed image; this limitation stays explicit.

## Behavior / Scenarios / Actors
| ID | Kind/scenarios | Historical current failure → delivered desired outcome | Preserved boundary / evidence |
| --- | --- | --- | --- |
| BEH-001 | System/Contract SCN-001 | Automatic package-local search missed root pnpm engines and picked incompatible cache; O1 reuses existing complete explicit pair to select installed5.22/605. Automatic discovery itself is NOT fixed by this ticket. | Installed CLI/platform preference/canonical DB/deploy/P3005/true error propagation unchanged. E-005..013,014. |
| BEH-002 | Operational SCN-003 | Before FATAL/reset; after protected pair pin normal startup and actual8003ready, original storage retained. | Backup before startup writes; no reset/deletion,8001/other workloads untouched, working user node retained. E-014. |
| BEH-003 | Operational SCN-004 | HTTP-confirmed healthy8001 same image/code but cached605 vs node2c299; facts/limits explained. Deeper writer/source work moves to follow-up. | No guessed writer/tool/blame/different-image or DB-corruption claim. E-006..012,015. |
Actors: user wants usable restored node; Delivery owns protected live correction/finalization; SD scope/receipt authority; manager owns Task status/follow-up dispatch/restoration-operation reconciliation. No UI/Product design (N/A).

## Scope Guardrail
| UC | Current authorized use case | Scenarios |
| --- | --- | --- |
| UC-002 | Data-preserving node2 compatible-engine operational recovery and actual readiness | SCN-003 |
| UC-003 | Existing read-only control diagnosis/cause report and honest remaining limits | SCN-004 |
UC-001 startup is preserved contract in current ticket, NOT authorization to change automatic engine discovery. Moved follow-up UC-001 source correction + deeper UC-003 investigation.
Out of scope CURRENT ticket: source/test/dependency/image/launcher/recipe refactor/fix, full cache provenance reconstruction, all-volume/cache/workspace deletion/reset/prune, schema reset/downgrade/error/ledger/migration bypass, other-node/build mutation/restart/upgrade, secret/history/environment dump/model work, release/tag/publication/wider rollout. Any such release/live decision remains separate.
Non-goals: certifying every historical run/provider/platform/browser; reconstructing missing audit history; making temporary pin survive container recreation. Follow-up must address durable selection if source cause established.
Preserved behavior: BEH-001..003 / REQ-003..006 and operational007 / AC-003..006; no user-data loss accepted. Ordinary already-shipped startup DB/log/migration writes need not be byte-identical; preservation proof scope truthful. No new historical audit/startup gate.
Review authority: blocking finding traces approved REQ/AC/BEH; new product/migration/security/compatibility/wider operation is Requirement Gap through SD, not silent scope growth. Out-of-scope defects become accountable follow-ups.

## Requirements / Disposition
Stable IDs retained; moved rows are NOT current-ticket completion criteria.
| REQ | Current requirement/disposition | Behavior / rationale |
| --- | --- | --- |
| REQ-001 | MOVED to follow-up: determine/fix automatic discovery layout so engines belong to installed CLI. | BEH-001; automatic bug uncorrected here. |
| REQ-002 | MOVED to follow-up: matching-revision/platform automatic cache fallback, no arbitrary cached overrides. | BEH-001; not proven/waived by explicit pair. |
| REQ-003 | CURRENT preserved complete explicit override pair, runtime target, canonical DB, migrate deploy/P3005 and actual failure safety. No source change. | BEH-001; existing supported input. |
| REQ-004 | CURRENT protected node2-only recovery: original four named volumes/two binds/settings/data/sign-ins/workspace retained; affected backup before normal startup; leave working node running. | BEH-002; user preservation direction. |
| REQ-005 | CURRENT owned isolated validation; user node checks are diagnosis/authorized operational verification, not test targets. No other-node mutation, secrets/models. | BEH-002,003; TESTING/user constraints. |
| REQ-006 | CURRENT report proven cause/8001 contrast and attribution limits, actual backend readiness not container status. DEEPER writer/source history moved to follow-up. | BEH-002,003; user accepted bounded recovery. |
| REQ-007 | CURRENT finish operational-recovery evidence/archive/isolated personal finalization/cleanup, no release; source fix/regressions/current-build proof MOVED to follow-up. | BEH-001,002; latest user explicit scope partition. |

## Acceptance Criteria / Traceability
| AC | REQ/SCN | Current expected outcome / verification | Disposition |
| --- | --- | --- | --- |
| AC-001 | 001,002 /001,002 | Root virtual-store compatible automatic discovery with wrong cache present. | MOVED; new-task regression/current-build proof, no current source pass. |
| AC-002 | 002 /002 | Expected-revision cache only; platform/partial/unknown identity cases. | MOVED; source defect proof/correction in follow-up. |
| AC-003 | 003 /001 | Complete matching explicit pair/canonicalDB normal migrate semantics preserved; no source delta. | CURRENT owned-image+Delivery effective-pair/native/startup proof. Changed-source unit/typecheck portion moved. |
| AC-004 | 004,005 /003 | Private verified affected backup, original mounts/settings/key continuity, migration+HTTP200/statusok, other workloads unchanged, node left running and explicit user acceptance. | CURRENT deliveredDR-001/002 evidence; no all-history/DB-byte identity claim. |
| AC-005 | 005,007 /001,003 | Same unmodified image/pair validated on owned free-loopback/private-home/data stack; owned cleanup, no release. | CURRENT config-only validation legitimate; changed-source/worktree/regression portions moved. |
| AC-006 | 006 /004 | Current evidence-backed8001comparison/cause/cache-origin limitations retained; no invented historical writer. | CURRENT delivered brief/evidence; deeper work MOVED. |
Current REQ003→UC002/preserved001/BEH001/AC003;004→UC002/BEH002/AC004;005→UC002,003/BEH002,003/AC004,005;006→UC003/BEH003/AC006;007→UC002/BEH002/AC005 and finalization. Moved001/002/source007→follow-up UC001/BEH001/AC001,002/source003,005. Supplement context follow-up-context.md and inventory in investigation notes.

## Scenario Basis
- SCN-001 Supported Normal Scenario: existing supervisor start→configuration→normal schema deployment→repository/vault/app-data→HTTP. CURRENT preserve/test supported explicit pair; automatic source change moved. Evidence actual8001and recoverednode2/startup source/policy.
- SCN-002 Supported Explicit Edge Scenario: immutable packaged native-target/cache startup, released linux-appimage-prisma-erofs evidence. MOVED source correction; not a new operational promise for current ticket.
- SCN-003 Supported Explicit Edge Scenario: user-authorized node2 recovery after retained-volume recreation→backup→compatible pair pin→normal start→actual readiness/preservation/user check. CURRENT observed and accepted; later distinct failure requires scoped recovery, no reset.
- SCN-004 Supported Normal Scenario: user asks8001read-only contrast→identity/HTTP/cache/package/log source→factual cause/limits. CURRENT existing evidence; deeper history/source work MOVED.
Synthetic arbitrary DB/cache corruption, unknown malicious writer or deleting cache to force green: Unsupported/Contrived, not current scope premise.

## Quality / Data / External Contracts
QR001→REQ003/AC003: existing migration/schema safety/platform/version-compatible explicit pair preserved. QR002→004..006/AC004..006: no data loss/reset/other-node change or secret exposure. QR003→007/AC005: truthful config-only/new-source distinction and pin lifetime/no-release boundary.
No new stored format/schema transition. Already-shipped startup writes after secure private backup allowed, no whole-history/byte-identicalDB assurance. Actual data/db/root-key/memory and custom roots resolved by Delivery, private archive checked; protected configs/key continuity and retained mounts/control identities proven. Backup retention is intentional and not automatic restore/cleanup authorization.
External contracts unchanged: installed Prisma5.22expects605, complete explicit engine override pair; repository startup ordering. Dependencies/lockfile untouched by repair. Prior upstream unrelated version/product merges NOT attributed to this fix.

## Decisions / Assumptions / Supplements
DEC-001 automatic discovery correction moves to follow-up per User; evidence retained, no new source architecture approved here. DEC-002 existing override/migration safety preserved. DEC-003 completed node2 pin no public image release. DEC-004 user explicitly accepts working recovery/current ticket completion; separate follow-up registration prevents scope loss; exact approvalDR-002, Decided by User.
InitialASM001 later readiness uncertainty resolved ONLY within delivered backend/preservation evidence and explicit user acceptance; all historical runs/platforms/cache actor origin not certified.
Supplement acceptance json is exact user authority; cause/investigation and public metadata are factual; follow-up-context is backlog handoff, not new-task approved architecture. Private backup/full logs NOT attached/Git.
Readiness: evidence, desired/preserved behavior, linked REQ/AC/scenarios, scope/data/quality/decisions/approval all Yes; UI/Product N/A. R3 approved for finalization-scope reconciliation; no new production work or review replay. Current technical D1-O1 review remains applicable unchanged; final Delivery completion/receipt still pending, original Task not patched DONE by SD.
