# Package Authoring — Contract Change Inquiries

**Current status:** PKG-AUTH-001 was resolved by RER-029 / AD-REV-020.
PKG-AUTH-002 is resolved by RER-033 / AD-REV-024. The user's 2026-09-12 clarification
requires treating this ticket's migration as first-run/unreleased: update existing
code, not add a migration for intermediate branch states. Historical evidence
below does not establish production deployment; latest resolution is at the end.

## PKG-AUTH-001 — User-requested simplification

- Date: 2026-09-11.
- Stable package: AORG-FLAT-TEAM-001.
- Outcome: Requirement Gap — requested authoring-contract change conflicts with
  an explicit approved field requirement; not a source defect against that requirement.
- Current requirements authority: RER-028, including REQ-026 / REQ-027 and
  AORG-CONTRACT-001's definition formats.
- Inspected worktree: `requirements/flat-agent-organization-model`, HEAD
  `14a94fc45de8bcab271e996eb7d6e8440f0d3ac5`.
- This is a bounded inquiry, not a completed architecture-design revision,
  implementation assignment, test result, or delivery decision.

## Supported authoring scenario and user direction

A package author brings an existing Agent-only Team into the current product.
After learning that its members no longer use `refType` and that its config now
requires `schemaVersion: 2`, the user requests removing the version attribute:
“we should remove the schemaVersion this attribute” because authors previously
did not have to supply it. The supplied article-writing-team screenshot shows
the earlier unversioned Team config with Agent member `refType` and handoffs.

User evidence:
`/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/software_engineering_team_570be46d520142849ac61785be03dca1/architecture_designer_6b8b3019214246e086957b3f395901bb/context_files/ctx_2ebad1bebd19__image.png`.

## Read-only source findings

1. At immutable earlier Team baseline
   `5fb16658e7bd2aefd750f99eb596a17382e161ac`,
   `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
   reads the earlier config through `normalizeTeamConfigRecord`, including
   member `refType`, without the current explicit schema-version admission.
2. Current `agent-team-definition/providers/agent-team-definition-config-v2.ts`
   requires exact top-level keys including numeric `schemaVersion: 2` and exact
   member keys `memberName`, `ref`, `refScope`. Its provider uses that strict codec.
3. Current `agent-org-definition/providers/agent-org-definition-config-v1.ts`
   similarly declares numeric `schemaVersion: 1` for Org authoring. The Org
   member kind remains meaningful (`agent` versus `agent_team`), unlike Team.
4. REQ-026 explicitly requires both authored version fields and rejection of
   unversioned definitions. This is not merely an incidental implementation
   detail that Architecture can remove while claiming unchanged requirements.

## Technical assessment and bounded Requirements request

The explicit field supplies a format discriminator at definition admission.
It is a design/contract choice, not an intrinsic necessity for hand-authored
configuration. A single strict current-shape codec selected by the Team/Org
package family can be forward-only without a user-entered version field.
Removing the field must not be confused with accepting all retired shapes,
restoring Team member `refType`, or reintroducing configured nesting.

Requirements Engineering should reconcile the user's requested Team authoring
simplification with REQ-026 and the contract supplement. Applying the same
authoring simplification to `org-config.json` is Architecture's consistency
recommendation; the screenshot is a Team example, not separate explicit
approval of every related format decision. Do not expand this inquiry into
changes to other required/defaultable fields.

Preserve saved Team/Org execution-tree schema versions, root/file/path
boundaries, runtime migration ownership, and the two external repositories'
read-only status. No user direction here asks to remove versions from runtime
data. After approved re-entry, Architecture must assess current versioned
server-owned definitions, import/export and admission consumers, diagnostics,
and the bounded persisted-definition transition. No normal dual parser or
external-project rewrite is authorized by this inquiry.

## Result boundary

No requirements, contract, source, tests, or existing design artifacts changed.
Unrelated Delivery-owned dirty documentation/builds/evidence were preserved.
Only this Architecture-owned inquiry is persisted for the Requirements handoff.
The requested authoring correction is pending upstream reconciliation; no
change to the running product or expanded validation pass is claimed.

## Approved Re-entry And AD-REV-020 Design Resolution

**Current disposition:** RER-029 at
`0f5014405eb028123afb37013b722acb2d12fe22` explicitly approves removal from
both files. PKG-AUTH-001's Requirements question is closed. The earlier
Team-only/open recommendation paragraphs above are retained historical inquiry
context, not current scope. AD-REV-020 / DS-031–033 specify the response, pending
independent Architecture Review. No engineering pass is implied.

### Additional read-only evidence, 2026-09-11

Source is the unchanged reviewed IR-038 artifact preserved at `14a94fc45`;
subsequent `7ef792130` and `0f5014405` are inquiry/Requirements-only commits.
Current workspace/branch confirmed with git status, log and rev-parse. Other
owners' dirty delivery docs/reports/evidence are present and not staged here.

- Normal `agent-team-definition-config-v2.ts` and
  `agent-org-definition-config-v1.ts` own exact key sets and build functions.
  Their file providers serialize all definitions through these builders.
- `agent-org-owned-definition-source-index.ts:43–52` parses the parent Org
  before enumerating its owned sources. A migration cannot rely on the new
  normal parser's source index to find Teams inside prior-version parents.
- `collaboration-definition-admission/services/definition-admission-service.ts`
  validates raw config before subject services and dependencies; its result and
  `api/graphql/types/definition-admission.ts` expose expectedSchemaVersion.
  These require a coherent field-free current-family diagnostic, not just a
  serializer edit. `file-application-bundle-provider.ts` directly validates Team
  configs and must use the same current codec.
- `agent-packages/services/agent-package-service.ts` imports linked local or
  GitHub source roots through registration/cache refresh. Its
  `utils/package-root-summary.ts` validates physical package structure; it is
  not a second semantic config parser. No separate export command is added by
  this design. Current provider bytes and existing supported file/package
  roundtrip paths must remain consistent.
- `app-data-migration-runner.ts:56–77` skips SUCCEEDED and warning-success
  migrations. Registry orders the family migration after Team Run V2.
  `agent-org-flat-team-families-v1-app-data-migration.ts:87–101` emits numeric
  definition versions; its later execution-tree envelope is separate. Old
  definition validation must be migration-local when the normal codec changes.
- Both executable startup compositions invoke runPending before exposing
  current services. They permit bounded failures and rely on strict current
  per-item admission; no blanket new capability gate is needed for this delta.
- `DefinitionPackageTransaction` already owns ordinary save journal recovery
  through read/commit, with a supplied package validator. The design reuses that
  recovery for any preexisting normal transaction before a migration file write;
  it creates no migration journal or new recovery state.

### Bounded physical/record inventory

Read-only Python Path/glob/JSON and sqlite3 `mode=ro` probes (no writes):

| Source | Observed facts | Interpretation |
| --- | --- | --- |
| `applications/brief-studio/agent-teams/brief-studio-team/team-config.json` | version 2, two members | Repository-owned source/build removal; not runtime mutation |
| `applications/socratic-math-teacher/agent-teams/socratic-math-team/team-config.json` | version 2, one member | Same source/build cohort |
| `/home/autobyteus/data/agent-teams/classroomsimulation/team-config.json` | no version; two refType:agent members; SHA256 prefix 3f246e7135ac | Older shape exists, not an otherwise-current unversioned config; no inference it is admitted/launchable |
| `/home/autobyteus/data` direct Team/Org/Org-owned Team definition globs | One config found | Bounded actual path sample, not a universal deployed cutover inventory |
| `/tmp/autobyteus-dr008-user-test-20260911/server-data` and `/root/.autobyteus/server-data` same globs | Zero configs found | Empty writable sample roots do not prove absence of registered external packages |
| DR-008 `agent-package` source root | Two Org configs version 1 and two Team configs version 2 | Registered test package evidence, not writable data-root migration authority; preserve other-owner fixtures |
| `/home/autobyteus/data/db/production.db` migration status | Team tree migrations and 20260901 family SUCCEEDED; 20260905 summary SUCCEEDED_WITH_WARNINGS | Distinct state records; no manual resets or assumption old family will rerun |
| DR-008 server-data `db/production.db` migration status | Team tree migrations, family and summary SUCCEEDED | Same completed-entry skip consequence; DB query does not validate a new authoring implementation |

No external public/private project was mutated or reclassified as server-owned.
The coexistence of an older data-root config and a completed family status does
not establish why that file is there or authorize status reset/runtime replay.
An unsupported source is reported intact by the new pass. Cutover enumerates
actual owned paths under the configured data root; captured counts are not a
hard-coded migration cohort. No secret data/provider traces were read for this
probe and no running Delivery app was stopped or reconfigured.

### Result and self-validation boundary

AD-REV-020 isolates exact prior version validation within migrations, keeps
20260901 historical outputs fixed, adds one ordered definition-only pass for
already-completed installations, and uses zero-write current-field-free skips.
Both current family codecs and diagnostics become version-free; runtime/schema
versions and task/UI behavior stay unchanged. Self-validation VAL-046–050 covers
actual authoring/roundtrip, strict rejections, migration ordering, owned child
inventory, external zero writes, retry/status and no runtime rewrite. Real
source/file/runner/browser tests and fresh Delivery remain downstream work.


## PKG-AUTH-002 — Org Authored Reference Scope Naming

- Date: 2026-09-12. Stable package: AORG-FLAT-TEAM-001.
- Trigger: Code Reviewer relayed the user's explicit request to route the
  `agent_org_owned` versus `team_local` naming concern upstream. The requested
  Org config literal is `org_local`, symmetric with unchanged Team `team_local`.
- Outcome: Requirement Gap — user-requested authored-contract revision, not a
  discovered failure against the current approved contract or CRR-071.
- Canonical current authority remains RER-032, including AORG-CONTRACT-001's
  Current AgentOrg Definition rule 4, which explicitly specifies `agent_org_owned`.
- Inspected source/artifact: IR-047 / 56fb8983fba0fb6a35b031aa6124f9ca07b0aab1,
  code-review-reported CRR-071 Pass under AD-REV-023 / ARCH-REV-020. Workspace and
  branch remain the canonical isolated worktree. Existing validation keeps its
  artifact-specific scope; this inquiry declares no retroactive failure/whole-package hold.
- This is not a completed AD revision, source assignment, new CR-FIND or approved
  Requirements revision. No new Product/visual design is requested.

### Requested Behavior And Preserved Boundaries

Normal Org package member `refScope` would use exactly
`shared | org_local | application_owned`; Team remains
`shared | team_local | application_owned`. The local scope still means a reference
resolved to the same exact definition bundled under its owning Org, not a changed
root owner, topology or reference identity. This request alone does not authorize
renaming `ownershipScope`, internal source-descriptor `kind`, opaque
`agent-org-owned-agent` / `agent-org-owned-team` identity prefixes or directories.

Requirements Engineering should reconcile this user direction in the canonical
requirements, investigation, contract and revision record and record its approval
basis. Do not impose a fresh UI prototype gate for a config literal. Preserve
otherwise valid existing owned definition meaning through the approved transition
boundary; external public/private repositories remain separate-owner/read-only.
Do not silently accept both literals forever or infer runtime migration replay.
Architecture selects the detailed transition only after approved re-entry.

### Read-Only Source Evidence / Initial Impact Inventory

Paths below are relative to `autobyteus-server-ts/src/` at the inspected artifact.

1. `agent-org-definition/providers/agent-org-definition-config.ts:89–99` admits
   `agent_org_owned` and rejects `org_local`. Its builder at 135 onward emits
   `member.refScope` through the same parser. `file-agent-org-definition-provider.ts`
   uses that codec for package validation, read and write. Editing only docs or one
   example would leave current admission rejecting the user's proposed file.
2. `agent-org-definition/domain/agent-org-definition.ts:8` types the member scope.
   `api/graphql/types/agent-org-definition.ts:68–80` maps it to/from the exposed
   authoring enum. Its representation must be considered in the approved design,
   not changed with an indiscriminate global literal replacement.
3. `agent-org-definition/providers/agent-org-owned-definition-source-index.ts:55`
   filters authored `member.refScope`. Lines 8/68 instead describe internal source
   `kind`; identical old strings in these distinct contracts do not make them a
   single authorized rename. The index still needs exact definition-to-path correlation.
4. `agent-org-definition/utils/agent-org-owned-definition-id.ts` creates opaque
   tagged definition IDs separately. Preserve them and their referenced meaning.
   Agent/Team provider and GraphQL converter ownership fields are separate concerns.
5. `agent-team-definition/providers/agent-team-definition-config.ts:95–103`
   already uses the requested unchanged Team scope vocabulary.
6. `app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts:99`
   emits the earlier Org scope from legacy `team_local`. Current/pending/completed
   definition-transition paths must be assessed separately from immutable earlier
   outputs and runtime migration cohorts; no source/runner status was changed here.
7. Existing admission and Team-definition service tests reference owned Org sources.
   Future approved implementation must inventory all relevant normal create/update/
   save/import/export consumers, package fixtures and examples, tests and docs.
   This read-only source search is an initial impact map, not an exhaustive owned,
   external or persisted/runtime inventory and not a migration plan.

### Handoff And Work Protection

Requested recipient: Requirements Engineering under the Requirement Gap rule.
Preserve ref resolution, identities, ownership and flat topology, then return the
approved cumulative revision for Architecture impact/transition assessment and
conditional review. The current parent classification is Large/High; no completed
focused design classification is claimed for this inquiry.

Only this Architecture-owned note changed. Requirements/contract/design/source,
external configs, runtime files, tests and other owners' dirty reports were not
edited or staged. Read-only source checks and `git diff --check` are not source,
API/E2E or Delivery validation. The previous stream-warning defect has its own
Code Review/Implementation route and is not reclassified by this naming request.

## PKG-AUTH-002 Approved Resolution — AD-REV-024

- Authority: RER-033@f84c5299f10898f49acff6a0e481d1cd61c769a9, REQ-037 /
  AC-035–036 / SCN-023–024 / DEC-025. All four canonical Requirements files were
  read-only and checked unchanged against that commit. No Product gate.
- User's direct correction on 2026-09-12: the migration is still on this ticket,
  has not been deployed, and must be treated as never run in production; update
  existing code directly. This is rollout evidence, not a new authored behavior.
- The earlier local DB reads in PKG-AUTH-001 and subsequent test-output configs
  are retained facts about those environments, **not evidence of a released
  migration**. The earlier inference requiring immutable numeric outputs plus a
  new release-upgrade pass was too broad. DS-039 corrects that premise; the
  preliminary extra scope-migration proposal was withdrawn before completion.
- Workspace/branch unchanged; source at IR-047 artifact 56fb8983f; previous
  design/review AD-REV-023 / ARCH-REV-020 Pass retain recorded scope. No new
  source failure, provider/test/browser result or deployment action is claimed.

### Current Source And Data Evidence

Paths are relative to the canonical worktree. Inspected using targeted source
reads, git diff, Python JSON/path reads and SHA256; no source/data mutation.

| Source | Evidence and design consequence |
| --- | --- |
| `autobyteus-server-ts/src/agent-org-definition/providers/agent-org-definition-config.ts:89–99,135+`; domain member type | Normal old-scope validator and same-codec builder must change together to org_local. Other exact keys/defaults remain. |
| `agent-org-definition/providers/file-agent-org-definition-provider.ts` under server src | Revisioned transaction/read/write consumes the codec; normal hash is content-derived and may change when config bytes change, not definition ID. |
| `agent-org-definition/providers/agent-org-owned-definition-source-index.ts:55,68` | Authored filter changes; internal kind stays agent_org_owned. Exact matching uses unchanged ID builder and owned physical child, never prefix parsing. |
| `agent-org-definition/utils/agent-org-owned-definition-id.ts` | Opaque agent-org-owned-agent/team refs remain exactly valid. |
| `api/graphql/types/agent-org-definition.ts:8,68–80`; `autobyteus-web/stores/agentOrgDefinitionStore.ts:15` | Existing uppercase enum can remain with exhaustive explicit mapping to current lowercase domain. No wider API/client ownership rename needed. |
| `collaboration-definition-admission/services/definition-admission-service.ts:150+`; source registry; package service | Existing package/ID/path/reason/owner-action result and dependency gate; registration is not semantic success. External ownership stays read-only even for installed local copies. |
| `app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts:87–101,155–251` | Existing definition generators still emit numeric versions/old local scope. Update these initial outputs directly; strict target validation and writeRequired decisions must cover flat/direct-owned/prospective/cleanup paths. Runtime orgTreeTarget is separate and unchanged. |
| `app-data-migrations/migrations/collaboration-definition-authoring-shape-app-data-migration.ts:14–75` | Existing registered ID/inventory currently removes only version and skips every unversioned file. Modify candidate equality/transform in place so old-scope unversioned Org also reaches final output; no new entry. |
| `app-data-migrations/legacy/collaboration-definition-versioned-config.ts` | Prior helper strips version then invokes normal codec; updating only the normal Org codec breaks known owned preservation. Tighten/rename to pure authoring-transition candidate; do not freeze old writers or add a normal compatibility parser. |
| Registry / runner / owned-definition-package-inventory / atomic writer | Reuse actual existing order, pending/failed retry, owner-contained physical scan and ordinary transaction recovery. Status records are not reset for this authoring change. |

Server source paths abbreviated after the first row above remain under
`autobyteus-server-ts/src/`. Existing production migration conventions were read;
normal startup retry, strict current target and bounded capability failure apply.
No new framework or arbitrary corruption/power-mode matrix is introduced.

Bounded repeatable inventory on 2026-09-12:
- `/home/autobyteus/data/agent-orgs`: absent.
- `/root/.autobyteus/server-data/agent-orgs`: present, zero direct config matches.
- `autobyteus-server-ts/applications/*/agent-orgs/*/org-config.json`: zero matches.
- Saved **test output** at
  `api-e2e-evidence/API-REV-028/migration-process-corrected/one-level-catalog/server-data/agent-orgs/api28-migration-org/org-config.json`
  (relative to ticket): 399 bytes, SHA256
  `e455c5d6192e812dcf752c2f7e70a12ff129c5e9ff34319e4532c992654209c3`;
  unversioned, director/shared plus delivery/agent_org_owned with exact ref
  `agent-org-owned-team:api28-migration-org:delivery`; child directory exists.
  It proves earlier code's output representation, not a production cohort.
- This is not an exhaustive deployment inventory. No external repository,
  runtime-package inventory, database mutation or running app was involved.
  Actual startup inventories configured owned roots; approved otherwise-current
  preservation is a requirement independent of claims about deployed counts.

### Architecture Decision And Validation Boundary

DS-038 changes only authored scope/current mapping; DS-039 updates both existing
unreleased migration implementations directly, producing final definitions in
one transform and preserving approved owned sources; DS-040 retains existing
status/availability semantics. No new scope migration is added. Earlier released
migrations outside this ticket remain historical; runtime tree versions and the
original family runtime transformation do not change. Source/helper-only old
shape knowledge never leaks into normal admission.

First-run tests must begin from fresh isolated pre-ticket data, not infer a
new production upgrade from a developer's already-completed test database.
Ordinary interruption/restart/idempotence of the final implementation remains
required. Retained test and Delivery datasets are not rewritten. VAL-059–063
plus corrected VAL-047/048 cover these obligations at design level only.

Focused Medium/High; cumulative Large/High. Architecture Design Complete with
independent review selected. Four architecture documents only are changed;
Requirements, source/tests, other-owner dirty reports and evidence are preserved.
