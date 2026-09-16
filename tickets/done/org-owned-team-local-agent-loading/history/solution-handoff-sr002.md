# Architecture Design Complete — ORG-LOCAL-AGENT-20260916-001

## Result / authority
SR-001 Approved user requirements; SR-002 / DS-001 Ready; task_size Medium / architectural_risk Low. User explicitly requested continuation after agreed source-grounded ownership explanation. This is the NEW application fix ticket, not the completed external package conversion or reopened delivery ticket. Current rule lookup pending; no handoff success yet.

## Original problem / outcome
Self-contained Northstar/Classroom Agent Orgs are recognized at startup but excluded because an Org-owned Team's Team-local Agents cannot be resolved. Software Development Department references shared Teams and avoids that path. Real file-provider validation and user log reproduce failure despite Agent files existing. Current code also treats Team catalog cache as exhaustive for owned exact reads; mounted Team instructions consume this path. Fix both reads without changing ownership/IDs/visibility or extracting shared definitions.

## Design / scope
Reuse exact Org-owned source index from existing Team source locator; pass explicit Org roots from Agent local read and Team exact read; remove inline Team read duplication. Add tagged Team identity classification without decoding paths; mirror current Agent cache bypass for exact owned Team reads. Preserve all update/delete guards and mutation lookup contexts, shared/application/direct Org reads, current schemas and laziness. No new resolver subsystem, arbitrary nested Teams, provider lifecycle change, migration, data repair, startup optimization or external package rewrite. If implementation reveals material semantic impact, return design finding rather than widening scope.

## Evidence / verification limits
Pinned fresh feature base65fc02a99d0a9608ba4da195cf108dc8aef255e7; historical personal5645b49d6 reference supports owner-aware lookup but is not copied topology. Designer read source/tests/logs/configs only, no test execution or success. Prior external structural conversion results do not prove real loader admission. Prior L-001 not assumed resolved. Required production-backed temporary fixture chain includes source index/file providers/admission, cached normal reads, same-name isolation and missing-dependency controls, byte preservation and unchanged mutation boundaries. API should validate isolated ordinary import/reload/catalog/detail and mounted member launch/Send without provider starts during reads. No manual resolver injection as substitute.

## Workspace / Git / safety
Work only in /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading on codex/org-owned-team-local-agent-loading. Canonical ticket below. Eventual merge target origin/requirements/flat-agent-organization-model, NOT personal. Designer files currently uncommitted; no push/merge authorization implied. Do not modify user's running Electron/server/conversations or production data. Keep private Classroom project/evidence private; commit synthetic equivalents only. External packages are reference-only, no new edits authorized by this ticket. Do not replay prior definition task or delivery.

## Canonical artifacts (absolute)
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/bootstrap-handoff.md

## Relevant external evidence (read only)
- /Users/normy/autobyteus_org/solution-designer-reports/startup-migration-warnings-20260916/package-conversion-request.md
- /Users/normy/autobyteus_org/autobyteus-agents/.codex/artifacts/northstar-operating-company-agent-org/implementation-handoff.md
- /Users/normy/autobyteus_org/autobyteus-private-agents/.codex/artifacts/nested-classroom-test-agent-org/implementation-handoff.md
No independent architecture/source/API review reports exist for this NEW package. Next expected result: bounded implementation and owned validation, then normal route. No requirement decision outstanding.

## Selected current route
get_handoff_rules returned four rules. Sole applicable rule: Architecture Design Complete with task_size Medium / architectural_risk Low -> `/software_engineering_team/implementation_engineer`. Direct implementation route; no independent architecture-review requirement for this classification. Only that recipient is to be notified. Transport success must be established by send_message_to result, not this pre-dispatch document.
