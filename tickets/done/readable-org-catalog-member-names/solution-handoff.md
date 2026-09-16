# Architecture Design Complete — ORG-CATALOG-NAMES-20260916-001
SR-002 / DS-001 Ready; SR-001 requirements explicitly Approved. Small / Low after completed design, not inherited prior-ticket classification.

## Original request / approval
New separate ticket: Org list chips must show actual Agent/Team definition names, not internal owned IDs, same as shared refs. User confirmed “jaaa. do the same i would say, because it makes it readable right?” and “for both agent and agent team inside agent org thanks”. Pending/read failure may temporarily use readable member-role fallback; definitions themselves have names. Approved REQ/AC001–003 / SCN001/002, no Product prototype.

## Evidence / target / preservation
User screenshots and source confirm list drops memberName/scope and loads no owned references; public-only lookup falls back to raw ID. Existing exact query/owner validation supports names; prior completed launch ticket does not cover this list. DS-001 adds one card member-chip component, immediate-member read operation inside existing service with shared private validated read core, actual Experience integration/explicit reload refresh. Full graph loader still validates children for detail/launch. Both shared/owned Agents and Teams use actual definition names; no ID decoding, owned catalog insertion, package changes or runtime activation. Same-revision referenced rename + Reload and late removal/response covered. Preserve Run/View Details/order/icons/search and prior launch correctness.

## Workspace / source basis
/Users/normy/autobyteus_org/autobyteus-worktrees/readable-org-catalog-member-names
Branch codex/readable-org-catalog-member-names, freshly fetched base origin/requirements/flat-agent-organization-model755831eb8fe185ee9a32f6a77ebabdf773350cc0. Eventual target same feature branch, NOT personal. New ticket; earlier ORG-LOCAL-AGENT remains finalized. Only Designer docs/screenshots authored. No production/test changes, no test/runtime Pass. Existing base untracked files untouched. No user server/Electron restart, private package access, provider input, commit/push/merge/rebuild/release authority.

## Expected output / verification
Implement exact bounded DS-001 and cumulative implementation handoff. Durable real component/service/query-boundary tests must fail on owned direct Agent/Team list bug without seeding public arrays. Include shared controls, fallback/aria, wrong owner, reload/name change, late response, no child reads for Team label and full-loader preservation. Rendered UI loop applies; API actual isolated list/Reload/navigation read-only verification must use synthetic packages, preserve bytes and zero activation. Current result has no blocker; risks are limited async name adoption and existing helper preservation, not new ownership/data policy. Escalate material backend/cache/security/lifecycle need. Independent architecture/source review not claimed.

## Cumulative package
All under /Users/normy/autobyteus_org/autobyteus-worktrees/readable-org-catalog-member-names/tickets/in-progress/readable-org-catalog-member-names:
requirements-doc.md ApprovedSR001; investigation-notes.md exact sources/limits; design-spec.md DS001; solution-revision-record.md SR001–002; bootstrap-handoff.md historical bootstrap; evidence/user-org-list.png and user-org-list-detail.png current user evidence. No external Product or new specialist artifacts yet. Those screenshots are not permission to change surrounding layout/content or copy private packages.

## Routing
Complete result persisted before get_handoff_rules. Record sole most-specific applicable rule after lookup; transport success requires tool confirmation. No duplicate delegation.

Current rules evaluated: sole applicable Architecture Design Complete / Small / Low -> /software_engineering_team/implementation_engineer. Selected direct implementation route. No Product request, Large/High review or Delivery gap; no additional recipient. No independent review Pass implied.
