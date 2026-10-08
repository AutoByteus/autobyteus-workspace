# Investigation Notes — agpl-dual-licensing

## Investigation Meta

- Package identifier: `agpl-dual-licensing`
- Request / ticket: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-08: "Relicense AutoByteus so that nobody can take the source, change it, keep it closed and sell it."
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing` / `codex/agpl-dual-licensing`
- Resolved base remote / branch / revision: `origin` (`git@github.com-ryan:AutoByteus/autobyteus-workspace.git`) / `personal` (remote HEAD branch) / `a0ded874b0d65f8cda668e440469a0cb6b64126d` (fetched 2026-10-08)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from freshly fetched `origin/personal`; ticket folder `tickets/in-progress/agpl-dual-licensing/` created.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-08); templates `requirements-doc-template.md`, `investigation-notes-template.md`, `solution-revision-record-template.md` (2026-10-08)
- Investigation status: Requirements and architecture investigation complete (2026-10-08).
- Authorities read (architecture reading gate; 2026-10-08): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md`, project `TESTING.md` (validation planning); `templates/design-spec-template.md`

## Initial Request And Clarifications

- Original request (user via Project Task Manager, 2026-10-08, urgent): "We need to limit any other company or personals they use to take our product source code and then they do not open source it and they do not buy license and then they close source and then they sell it … they change it and then sell it. We don't want that happen." Anyone using the product must either open-source their work or buy a license. Team to determine the best license and apply it.
- Direction already agreed with the user: AGPL-3.0 public license + commercial license from the copyright holder (Grafana/Mattermost model); the team confirms or proposes better.
- Clarifications received in this conversation (2026-10-08):
  - User: "BingQ is a member, no worries. it has nothing to do with her" → BingQ is a team member; her contributions require no consent/rewrite/removal for relicensing. (Recorded as user decision `DEC-005` = resolved.)
  - User: "its our product license itself. thanks" → the work is the product's own license; no third-party contributor rights question applies.
- Initial ambiguity: SDK/contract package license, commercial-licensing contact, copyright-holder legal name, CLA mechanism, how to handle the proprietary Claude Agent SDK dependency.

## Product And Domain Understanding

- Product area: Repository-wide licensing of the AutoByteus monorepo (desktop app, server, agent framework, messaging gateway, mobile apps, Docker images, application SDKs/devkit, wire-contract packages, sample applications).
- Affected actors: copyright holder (AutoByteus / owner), third-party companies or individuals reusing the source, third-party application builders using the SDK, outside contributors, end users of distributed builds.
- Terminology: *Copyleft* (derivative works must use same license), *network copyleft* (AGPL §13: offering a modified version to users over a network obliges source offer), *dual licensing* (copyright holder offers AGPL and separately a commercial license), *CLA* (contributor license agreement granting the holder the rights needed to relicense contributions).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Command | `git fetch origin --prune; git remote show origin` | Base resolution | Remote HEAD = `personal` at `a0ded874b` | — |
| 2026-10-08 | Command | `git ls-files \| grep -iE '(^\|/)(LICENSE\|NOTICE\|COPYING\|CONTRIBUTING\|CLA)(\.[a-z]+)?$'` | License-file inventory | `LICENSE`, `NOTICE` at root; `LICENSE` in `autobyteus-ts`, `autobyteus-web` (full Apache text, identical to root, md5 `61c3ee…`) and in the three `*-stream/presentation-contracts` packages (one-line stub `Apache License 2.0`). No CONTRIBUTING/CLA anywhere. | Design: replace/add files |
| 2026-10-08 | Command | jq over every tracked `package.json` excluding `tickets/` | `license` field inventory | See BEH-002 table. 12 packages say `Apache-2.0`; 5 have no field | — |
| 2026-10-08 | Command | `git grep -niE 'apache\|\blicen[cs]e'` (excluding tickets, lockfile, LICENSE) | Leftover claims | Only README §License (l.677–682), NOTICE, package.json fields. Third-party: `autobyteus-android/gradlew{,.bat}` (Gradle wrapper, Apache-2.0, upstream), `autobyteus-web/public/THIRD_PARTY_NOTICES/noVNC-*.txt` | Keep third-party files |
| 2026-10-08 | Doc | `README.md` l.677–682 | Public claim | "This repository is licensed under Apache License 2.0 … Commercial use and modification are allowed." | Rewrite |
| 2026-10-08 | Doc | `NOTICE` | Attribution | "Copyright (c) 2026 AutoByteus contributors … as required by the Apache License 2.0." | Rewrite |
| 2026-10-08 | Code | `autobyteus-web/build/scripts/build.ts` l.217–250 | Desktop packaging | electron-builder `extraResources` ships server, icons, noVNC notice, isolated-launch marker; **the AutoByteus LICENSE is not shipped**; no `copyright` option; no About/legal UI found (`grep -i licen` over components/pages/localization: none) | Design: ship LICENSE |
| 2026-10-08 | Code | `docker/Dockerfile.allinone`, `docker/Dockerfile.remote-server`, `.github/workflows/release-server-docker.yml` | Docker packaging | Images (Docker Hub `autobyteus/autobyteus-server`) do not COPY root LICENSE and set no OCI `licenses` label | Design: add |
| 2026-10-08 | Command | `npm view <pkg>` for all 8 non-private packages | Published npm status | All 404: **no AutoByteus package has ever been published to npm**, so no npm artifact carries the old license | — |
| 2026-10-08 | Code | `jq .files` on publishable packages | Pack contents | All list `LICENSE` in `files`, but `application-backend-sdk`, `application-frontend-sdk`, `application-sdk-contracts`, `application-devkit` have **no LICENSE file** (packed tarball would omit it) | Design: add |
| 2026-10-08 | Code | `autobyteus-application-devkit/src/package/backend-builder.ts` l.56–64; `templates/basic/package.json` | How apps consume SDK | App backends are bundled by esbuild with `bundle: true` (only `node:*` external) — **SDK code is compiled into every third-party application bundle**. `autobyteus-app create` copies `templates/basic` files into the developer's own project | SDK license decision |
| 2026-10-08 | Code | `jq .dependencies` of SDK/contract packages | Dependency direction | backend/frontend SDK → only `application-sdk-contracts`; devkit → `autobyteus-server-ts` (for `dev`/`start` hosts), esbuild, chokidar, playwright-core; stream contracts → zod + presentation contracts | Devkit license note |
| 2026-10-08 | Doc | `applications/brief-studio/README.md`; grep for sample ids in server/web build | Sample apps | `applications/*` are in-repo teaching samples, `private: true`, not shipped with the product | Permissive candidate |
| 2026-10-08 | Command | `pnpm licenses list --prod --json -r` (main checkout, same commit, saved `/tmp/agpl-licenses-prod.json`) | Dependency compatibility | MIT 396, ISC 64, Apache-2.0 36, BSD-3 25, BSD-2 10, BlueOak 8, Unlicense 2, Python-2.0 1, 0BSD 1, MPL-2.0 1 (`@novnc/novnc`), (MPL-2.0 OR Apache-2.0) 1 (dompurify), (CC-BY-4.0 AND MIT) 1 (Font Awesome free icons), Unknown 4 | See compatibility table |
| 2026-10-08 | Code | `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.3.280…/LICENSE.md` | Unknown license | "© Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements …" — **proprietary**; dependency of `autobyteus-server-ts` (in-process import) | DEC-006 |
| 2026-10-08 | Code | `@mistralai/mistralai` LICENSE, `khroma` license | Unknown license | Apache-2.0 and MIT respectively (field missing in package.json only) | Compatible |
| 2026-10-08 | Web | `npm view @whiskeysockets/baileys@6.7.21`; `raw.githubusercontent.com/WhiskeySockets/libsignal-node/master/package.json` | Gateway (not in pnpm workspace) | Baileys MIT, depends on `libsignal` git dep licensed **GPL-3.0**; wechaty + puppet-service Apache-2.0 | GPL-3.0 is compatible with AGPL-3.0 (§13 of both); it was an existing tension under Apache distribution |
| 2026-10-08 | Command | `git shortlog -sne HEAD`; blame of BingQ files | Copyright control | Authors: owner identities + AutoByteus agents; BingQ 13 commits, feature reverted (`revert-session-discovery-ui`), 15 test lines remain | **User 2026-10-08: BingQ is a team member; not relevant** |
| 2026-10-08 | Command | `gh repo view AutoByteus/autobyteus-workspace`; `gh release list` | Public status | Repo is **PUBLIC**; GitHub detects `apache-2.0`; releases through `v1.4.97` (2026-10-08) were published under Apache-2.0 | Past releases stay Apache |
| 2026-10-08 | Code | `.github/workflows/release-{desktop,server-docker,android,ios}.yml` | Release outputs | Desktop (GitHub releases), Docker Hub, Android, iOS (App Store Connect/TestFlight) | Owner as licensor may distribute in App Store; third parties cannot add App Store terms to AGPL code |
| 2026-10-08 | Web | grafana.com/blog/2021/04/20/grafana-loki-tempo-relicensing-to-agplv3 | Precedent | Grafana moved core to AGPLv3; plugins, agents and certain libraries remained Apache-2.0 | Supports SDK-permissive split |
| 2026-10-08 | Web | github.com/contributor-assistant/github-action (search) | CLA tooling | CLA Assistant Lite action stores signatures in repo; last push 2024-05 | Design chooses tooling |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Behavior | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Public repo + root LICENSE | Whole repo offered under Apache-2.0 | Anyone may modify, close-source and sell | `LICENSE`, `gh repo view` | High |
| BEH-002 | Contract | `package.json` `license` | `Apache-2.0`: root, server-ts, web, ts, message-gateway, application-{backend,frontend}-sdk, application-sdk-contracts, application-devkit, agent-presentation/collaboration-stream/team-stream contracts. None: `applications/brief-studio`, `applications/socratic-math-teacher`, devkit `templates/basic`, gateway `tools/wechaty-sidecar`, `autobyteus-web/modules/electron` | Metadata matches Apache claim where set | jq inventory | High |
| BEH-003 | Contract | README/NOTICE | README states Apache-2.0 and "Commercial use and modification are allowed"; NOTICE references Apache-2.0, holder "AutoByteus contributors" | — | README l.677, NOTICE | High |
| BEH-004 | Operational | Release workflows | Desktop installers, Docker images do not contain the AutoByteus license text | License is only discoverable via the repo | build.ts, Dockerfiles | High |
| BEH-005 | Operational | Contribution | No CONTRIBUTING, no CLA, no CI CLA check | Outside contributions land under inbound=outbound Apache-2.0 (Apache §5) | ls-files | High |
| BEH-006 | Contract | App SDK consumption | SDK code bundled into third-party app bundles; devkit template copied into developer projects | SDK license propagates into apps | backend-builder.ts | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `LICENSE` (root) | Verbatim Apache-2.0 | Replace with verbatim AGPL-3.0 text so GitHub detects it | Keep LICENSE verbatim; put additional permission/commercial notice in separate file |
| `autobyteus-ts/LICENSE`, `autobyteus-web/LICENSE` | Copies of Apache | Replace with AGPL | — |
| `autobyteus-server-ts/`, `autobyteus-message-gateway/` | No LICENSE | Add AGPL | — |
| `autobyteus-{agent-presentation,collaboration-stream,team-stream}-contracts/LICENSE` | One-line stub | Becomes full Apache-2.0 text if kept permissive | — |
| `autobyteus-application-{backend-sdk,frontend-sdk,sdk-contracts,devkit}` | No LICENSE although `files` lists it | Add per approved license | — |
| `applications/*` | Samples, no license field | Per DEC-002 | Per-directory LICENSE |
| `autobyteus-android`, `autobyteus-ios`, `docker`, `scripts`, `docs` | Covered only by root LICENSE | AGPL via root | Android/iOS have no package.json; Gradle/Xcode metadata has no license field to change (verify in design) |
| `autobyteus-android/gradlew*` | Upstream Gradle wrapper (Apache-2.0) | Deliberately keep third-party header | — |
| `autobyteus-web/public/THIRD_PARTY_NOTICES/` | noVNC MPL-2.0 notice | Keep | — |
| `tickets/**` | Historical task records | Historical; not license claims about current code | Leave unchanged |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: root `LICENSE`, `NOTICE`, `README.md` §License; 5 package LICENSE files; ~17 `package.json`; new CONTRIBUTING/CLA/commercial-licensing notice; electron-builder config; two Dockerfiles; release workflow metadata.
- Readers: GitHub license detection, npm/pnpm metadata, end users, distributors, contributors.

### Structural Surfaces

- No runtime module, API, persistence or security boundary change. Packaging config (electron-builder `extraResources`, Dockerfile COPY/LABEL) and a new CI workflow (CLA check) are the only build/CI touch points.

### Potential Structural Impacts To Investigate

- API / persistence / security / concurrency change: Confirmed absent.
- Deployment: CI gains a CLA check workflow; release artifacts gain license files. Present, low.

## External Contracts, Standards, And Dependencies

### License options assessed against the goal

| Option | Stops "modify, keep closed, sell"? | Covers SaaS/hosted use? | Stays OSI open source? | Fit |
| --- | --- | --- | --- | --- |
| Apache-2.0 / MIT (current) | No | No | Yes | Opposite of goal |
| GPL-3.0 | Yes for distributed copies | **No** (hosting a modified server needs no source release) | Yes | Gap: AutoByteus ships a remote server/Docker image |
| **AGPL-3.0 + commercial license** | **Yes** for distribution and for modified versions offered over a network | **Yes** (§13) | **Yes** | **Best fit** — exactly "open-source it or buy a license" |
| SSPL | Yes, extends to whole service stack | Yes | No (OSI rejected) | Overreach, poor acceptance, unnecessary |
| BSL 1.1 / FSL / Elastic-2.0 / PolyForm | Forbids competing commercial use even *with* source published | Yes | **No** (source-available) | Only if the user also wants to forbid selling an open-source fork |
| Commons Clause add-on | Ambiguous wording | — | No | Not recommended |

Facts that apply to every OSI option:
1. No open-source license can force publication for purely internal use of a copy that is never distributed and never offered to outside users. AGPL §13 applies when a *modified* version is offered to users over a network.
2. AGPL lets anyone sell or host AutoByteus (including modified versions) **if** they publish their full source under AGPL. Only a source-available license can stop that too.
3. Releases already published under Apache-2.0 (≤ `v1.4.97`) remain Apache-2.0 for anyone who obtained them; the change applies to code from the relicensing commit onward.
4. A license protects code, not the name. The "AutoByteus" name/logo is protected by trademark, which is separate.
5. Dual licensing requires the licensor to hold rights to all code; future outside contributions need a CLA granting relicensing rights (DCO is insufficient).
6. `-only` vs `-or-later`: `AGPL-3.0-only` keeps the license text under the holder's control (Grafana uses AGPL-3.0-only).

### Third-party dependency compatibility with AGPL-3.0

| Dependency / License | Where | Compatible? | Note |
| --- | --- | --- | --- |
| MIT, ISC, BSD-2/3, 0BSD, Unlicense, BlueOak-1.0.0, Apache-2.0, Python-2.0 (argparse) | all workspaces | Yes | Apache-2.0 is GPLv3/AGPLv3-compatible one-way |
| MPL-2.0 `@novnc/novnc` | web/desktop | Yes | MPL-2.0 §3.3 Secondary License; keep existing MPL notice |
| (MPL-2.0 OR Apache-2.0) dompurify | web | Yes | — |
| CC-BY-4.0 + MIT Font Awesome free icons | web | Yes | FSF: CC-BY-4.0 GPLv3-compatible; keep attribution |
| GPL-3.0 `libsignal` (via Baileys) | message-gateway | Yes | GPL-3.0 ↔ AGPL-3.0 §13 combination allowed; actually resolves an existing tension of shipping GPL code inside an "Apache-2.0" gateway |
| **Proprietary `@anthropic-ai/claude-agent-sdk` (+ platform binary packages)** | server-ts (bundled in desktop/Docker) | **Not AGPL-compatible as a combined work for third-party redistributors** | Copyright holder can still ship it (it is the licensor). Third parties redistributing an AGPL build that includes it cannot supply its source. Standard remedy: an AGPL §7 additional permission for that named library (DEC-006). The SDK's own redistribution terms are a pre-existing, separate question |
| Electron/Chromium (MIT, BSD, LGPL parts) | desktop | Yes | — |

## Persisted Data And State Facts

- Affected stored or external subject: None (no runtime data). N/A.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. N/A.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `/tmp/agpl-licenses-prod.json` | Solution Designer | Raw `pnpm licenses` output | Evidence only, disposable | REQ-009 | Scratch | Not behavior-defining; regenerate in validation |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Risk | License wording, additional permission, CLA text and commercial terms are not legal advice | Enforceability | Lawyer review before publication (user) | Open, stated in all results |
| U-001 | Unknown | Exact legal name of the copyright holder/licensor (person vs company) | LICENSE/NOTICE/CLA/commercial notice name the licensor | User (DEC-003) | Open |
| U-002 | Unknown | Commercial-licensing contact | Notice must tell people how to buy | User (DEC-004) | Open |
| A-001 | Assumption | All non-BingQ commit identities (normy, Ryan Zheng, ryan-zheng, AutoByteus agents, Codex) are the owner or owner-operated agents | Copyright control for dual licensing | User confirmed BingQ is a member; owner identities self-evident | Accepted |

## Architecture Investigation Findings

Recorded 2026-10-08 after requirements approval.

| Source / Command | Observation | Design implication |
| --- | --- | --- |
| `.github/workflows/release-server-docker.yml` l.172–189 | The **released** Docker image is built from `autobyteus-server-ts/docker/Dockerfile.monorepo` (context `.`); runtime stage `FROM autobyteus/chrome-vnc`, `WORKDIR /app`, no LICENSE copy, no labels | Add LICENSE/LICENSING.md COPY + OCI label to this file (REQ-007 wording corrected; evidence-only) |
| `docker/compose.personal-test.yml`, `autobyteus-message-gateway/docker/docker-compose.yml` | `docker/Dockerfile.allinone`, `docker/Dockerfile.remote-server`, `autobyteus-message-gateway/docker/Dockerfile` are built with repo-root context for personal/test/gateway deployments | Same COPY + label |
| `autobyteus-message-gateway/scripts/build-runtime-package.mjs` l.212–216 | Gateway runtime tarball is staged by `pnpm deploy` of the gateway package (no `files` field) | npm/pnpm pack always includes a top-level `LICENSE`; adding `autobyteus-message-gateway/LICENSE` ships it. Verify in validation |
| `autobyteus-web/build/scripts/build.ts` l.217–250, 308–318 | electron-builder config: `extraResources` list already carries the noVNC notice via a constant; no `copyright`; sanitize helper only drops null entries | Add LICENSE + LICENSING.md extraResources entries and `copyright` string in the same config owner |
| `autobyteus-web/build/scripts/noVncThirdPartyNotice.ts` | Existing pattern: notice packaging paths defined as a small constant module | Mirror for first-party licence packaging (`productLicensePackaging.ts`) |
| `.github/workflows/release-desktop.yml` l.91 | Release workflow already runs `python3 scripts/check_repository_artifact_hygiene.py` as a repository-policy gate | Run the new licence-consistency check in the same place |
| `scripts/check_repository_artifact_hygiene.py`, `scripts/tests/test_*.py` (unittest, importlib loading) | Established pattern for repository-policy checkers: stdlib-only Python + unittest tests | New `scripts/check_licensing.py` + `scripts/tests/test_check_licensing.py`; CLA logic likewise in Python |
| `gh pr list --state all` | Only one PR ever (#1 by owner, 2026-03-07); `personal` is not branch-protected; owner (`ryan-zheng-teki`, admin) and agents push directly | CLA check only matters for outside PRs; owner direct-push workflow must stay unaffected → enforcement via a ruleset with admin bypass, not plain protection |
| `/tmp/cla-action` clone of `contributor-assistant/github-action` (HEAD `58daaf8`, 2026-03-23; latest tag `v2.6.1` 2024-09-26) | README: **"no longer actively maintained … archived"**; `runs.using: node20`; allowlist matches committer *name* (spoofable for unlinked commits) | Reject third-party CLA action; implement a small in-repo checker using only `actions/checkout` + Python stdlib + GitHub REST |
| `autobyteus-android/*.gradle.kts`, `autobyteus-ios/project.yml` | No licence metadata fields | Covered by root LICENSE; nothing to edit |
| `autobyteus-application-devkit/templates/basic/package.json` | Template for the *developer's own* app (`private: true`, no licence) | Do not add a licence field; developer chooses. Checker excludes it |
| `autobyteus-web/modules/electron/package.json` | Internal nested manifest with no name/licence | Add `"license": "AGPL-3.0-only"` for consistency (checker covers every first-party manifest) |

## Requirement Implications

- AGPL-3.0 matches the stated goal more precisely than GPL (SaaS gap) or source-available licenses (which also block open-source forks and lose "open source" status).
- Because SDK code is bundled into every app and the devkit template is copied into user projects, an AGPL SDK would force every distributed third-party app to be AGPL → SDK/devkit/templates should stay permissive unless the user wants that.
- The proprietary Claude Agent SDK dependency needs an explicit decision.
- Release artifacts currently carry no AutoByteus license text; requirements must include them.

## Notes For Architecture Design

- Verify the Gradle/Xcode project metadata for any license fields; verify gateway release packaging (`autobyteus-message-gateway/docker`, release manifest) for license inclusion.
- Decide file layout: verbatim AGPL `LICENSE`, separate `LICENSING.md` (or similar) for the component map, commercial option and §7 additional permission; NOTICE rewrite; CLA text + CI check; allowlist owner/agent identities.
- Provide a repeatable check (script or test) proving no stray `Apache-2.0` claims outside the deliberate allowlist.
