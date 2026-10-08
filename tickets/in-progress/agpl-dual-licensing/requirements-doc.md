# Requirements Document — agpl-dual-licensing

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `agpl-dual-licensing`
- Request / ticket: Project Task from `/project_task_manager` (2026-10-08) — relicense AutoByteus so nobody can modify it, keep it closed and sell it without open-sourcing or buying a commercial license
- Requirements owner: Solution Designer
- Date: 2026-10-08
- Approval state and reference: **Approved** by the user in this conversation on 2026-10-08: "i trust you can pick the best for me … i trust you make the most reasonalbe decisions. lets go" followed by "approved". The user delegated DEC-001…DEC-004 and DEC-006…DEC-008 to the Solution Designer, which resolved them as recorded in Open Decisions (all recommendations adopted; DEC-003/DEC-004 resolved from repository evidence).
- Exact approved requirements baseline / solution revision: SR-001 baseline, plus the SR-002 decision resolutions and the evidence-only REQ-007 Dockerfile clarification (no intended-behavior change)
- Behavior-defining supplements and their approved versions: None. Evidence in [investigation-notes.md](investigation-notes.md)

> Not legal advice. A lawyer should review the final license wording, the additional permission, the CLA text and the commercial terms before they are published (REQ-011).

## Problem And Desired Outcome

- Problem: The public repository and every package are Apache-2.0, a permissive license that lets anyone take AutoByteus, modify it, keep the changes closed and sell the result, which is exactly what the owner wants to prevent.
- Affected actors or systems: the copyright holder (AutoByteus), third-party companies and individuals, third-party application builders, outside contributors, and recipients of desktop, Docker and mobile builds.
- Desired outcome: From the relicensing commit onward, the AutoByteus product is offered under AGPL-3.0-only. Anyone who distributes it, or offers a modified version to users over a network, must publish their complete source under AGPL. Anyone who wants to keep it closed must buy a commercial license from the copyright holder. The SDK used by third-party app builders stays permissive so apps are not forced to be AGPL.
- Observable definition of success: Every repository license statement, package manifest, release artifact and contribution path consistently states the new licensing. No Apache-2.0 claim remains except the deliberate allowlist. A CLA gate protects future dual-licensing rights, and a dependency-compatibility result is reported.

## Recommended License Choice (for approval, DEC-001)

**AGPL-3.0-only for the product, plus a commercial license sold by the copyright holder.** This is the model Grafana (2021) and Mattermost use.

Why this fits "open-source it or buy a license" best:

| Option | Blocks "modify, keep closed, sell"? | Covers hosted/SaaS use of a modified version? | Still OSI open source? |
| --- | --- | --- | --- |
| Apache-2.0 (today) | No | No | Yes |
| GPL-3.0 | Only for distributed copies | **No** | Yes |
| **AGPL-3.0 + commercial** | **Yes** | **Yes** | **Yes** |
| BSL / FSL / Elastic / PolyForm (source-available) | Yes, and also blocks selling even with source published | Yes | **No** |

What the user must understand and accept:
1. **Internal use is not covered.** No open-source license can force publication when a company modifies AutoByteus purely for internal use and never distributes it or offers it to outside users. Only source-available licenses (BSL, FSL, ELv2, PolyForm) restrict that, and then AutoByteus is no longer "open source."
2. **AGPL forbids closed versions, not selling.** A company may still sell or host AutoByteus, even a modified version, if it publishes its full source under AGPL. Stopping that as well would require a source-available license.
3. **Past releases stay Apache-2.0.** Everything already published under Apache-2.0 (up to and including `v1.4.97`) stays Apache-2.0 for anyone who obtained it. The change applies from the relicensing commit onward.
4. **The name is protected separately.** A license protects code. The "AutoByteus" name and logo are protected by trademark, which is outside this task.
5. **Dual licensing needs copyright control.** The owner must hold the rights to all the code. User decision (2026-10-08): BingQ is a team member, so no consent is needed. Future outside contributions need a CLA.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001, SCN-002 | Whole repository is Apache-2.0; GitHub detects `apache-2.0` | Product components are AGPL-3.0-only; GitHub detects AGPL-3.0 | Third-party files keep their own licenses | Source log: LICENSE, `gh repo view` |
| BEH-002 | Contract | SCN-001, SCN-003 | 12 `package.json` declare `Apache-2.0`; 5 have no field | Every first-party `package.json` declares its component's approved license | — | jq inventory |
| BEH-003 | Contract | SCN-001, SCN-004 | README says "Commercial use and modification are allowed"; NOTICE cites Apache | README, NOTICE and a licensing document state the dual-licensing model, the component map and the commercial contact | — | README l.677, NOTICE |
| BEH-004 | Operational | SCN-005 | Desktop installers and Docker images contain no AutoByteus license text | Each release artifact carries the applicable license text | Existing noVNC third-party notice packaging | build.ts, Dockerfiles |
| BEH-005 | Operational | SCN-006 | No CONTRIBUTING, no CLA, no CI check | Outside contributors must accept a CLA before a PR can be merged; owner and agent identities are exempt | Normal owner/agent workflow unaffected | ls-files |
| BEH-006 | Contract | SCN-003 | SDK code is bundled into every app; devkit template is copied into developer projects | SDK, devkit (incl. templates), app-SDK contracts and sample apps stay Apache-2.0 (per DEC-002) | App builders can still ship closed or commercial apps | backend-builder.ts |
| BEH-007 | Contract | SCN-002 | Proprietary `@anthropic-ai/claude-agent-sdk` combined into an Apache server | Licensing states how this proprietary library may be combined with the AGPL server (per DEC-006) | Claude runtime support unchanged | Dependency table |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Copyright holder (AutoByteus) | Prevent closed commercial forks; sell commercial licenses | Clear AGPL + commercial terms; rights to relicense all code | Not legal advice; lawyer review |
| Third-party reuser | Use/modify/redistribute | Knows they must publish source under AGPL or buy a license | Past Apache releases still Apache |
| App builder (SDK user) | Build and ship apps, possibly closed | SDK stays permissive (DEC-002) | — |
| Outside contributor | Contribute | Knows and accepts CLA before merge | — |
| End user of builds | Know their rights | License text present in desktop app and Docker image | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Repository and product components state AGPL-3.0-only + commercial option consistently | SCN-001, SCN-004 |
| UC-002 | SDK/interface components state Apache-2.0 consistently (per DEC-002) | SCN-003 |
| UC-003 | Release artifacts (desktop, Docker, npm-packable packages) carry correct license text | SCN-005 |
| UC-004 | Contribution path requires a CLA for outside contributors | SCN-006 |
| UC-005 | Third-party dependency compatibility is checked and reported, with the proprietary SDK handled per DEC-006 | SCN-002 |

### Out Of Scope

- Drafting the commercial license agreement itself (pricing, terms). This task adds only a notice and a contact.
- Trademark policy or registration for "AutoByteus".
- Relicensing other AutoByteus repositories (e.g. `autobyteus-agents`, `autobyteus_mcps`). A separate task if wanted.
- Rewriting historical `tickets/**` records that mention the old license.
- Changing any runtime behavior, API or dependency.
- Re-examining whether redistributing `@anthropic-ai/claude-agent-sdk` is allowed under Anthropic's own terms. That question already exists under Apache-2.0 and is reported only as a risk.

### Non-Goals

- Restricting purely internal, never-distributed use, which needs a source-available license (see DEC-001).
- Per-file SPDX headers across all source files (DEC-008 recommends against).
- In-app "source code" link or About/legal screen (not required of the copyright holder; can be a later ticket).
- Publishing packages to npm.

### Preserved Behavior Boundary

- All runtime behavior, build success and release workflows stay functionally unchanged apart from the added license files and labels.
- Third-party notices (noVNC MPL-2.0, Gradle wrapper Apache-2.0 headers) stay as they are.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite a requirement, acceptance criterion or preserved-behavior ID.
- New policy, threat model, compatibility promise or operational contract is a `Requirement Gap` that needs explicit user approval.
- Reviewer comments do not amend this basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The root `LICENSE` is the verbatim GNU AGPL v3 text, and the repository's default license is AGPL-3.0-only for every component not listed under REQ-002 (incl. `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web` + electron module, `autobyteus-message-gateway` + wechaty sidecar, `autobyteus-android`, `autobyteus-ios`, `docker`, `scripts`, `docs`). | BEH-001 | Must | Core goal | DEC-001 |
| REQ-002 | These components remain Apache-2.0, each with its own full Apache-2.0 `LICENSE` file: `autobyteus-application-backend-sdk`, `autobyteus-application-frontend-sdk`, `autobyteus-application-sdk-contracts`, `autobyteus-application-devkit` (incl. `templates/`), `autobyteus-agent-presentation-contracts`, `autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`, `applications/*` samples. | BEH-006 | Must | Apps bundle the SDK and copy the template. AGPL here would force all apps to be AGPL | DEC-002 |
| REQ-003 | Every AGPL component directory that is a separately packaged unit (`autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, `autobyteus-message-gateway`) contains the AGPL `LICENSE` text. | BEH-001 | Must | Package-level clarity; `files` packing | DEC-001 |
| REQ-004 | Every first-party `package.json` (outside `tickets/`) declares `"license"` as `AGPL-3.0-only` or `Apache-2.0` matching REQ-001/REQ-002. | BEH-002 | Must | Machine-readable metadata | — |
| REQ-005 | One licensing document states, in plain language, the dual-licensing model, the component-to-license map, that releases up to and including `v1.4.97` remain Apache-2.0, the commercial-licensing option and contact, and any additional permission under DEC-006. README "License" section and `NOTICE` are rewritten to match and link to it. "Commercial use and modification are allowed" is removed. | BEH-003, BEH-007 | Must | Public statement | DEC-003, DEC-004 |
| REQ-006 | Copyright and licensor are named consistently as the approved legal holder (DEC-003) in NOTICE, the licensing document and the CLA. | BEH-003 | Must | Dual licensing needs a named licensor | DEC-003 |
| REQ-007 | Desktop app packages, the messaging-gateway runtime package and every AutoByteus runtime Docker image (the released `autobyteus-server-ts/docker/Dockerfile.monorepo` plus `docker/Dockerfile.allinone`, `docker/Dockerfile.remote-server`, `autobyteus-message-gateway/docker/Dockerfile`) include the AutoByteus license text and licensing document. Docker images also declare `org.opencontainers.image.licenses`. The macOS app shows the copyright/licence line in its About panel. | BEH-004 | Must | Recipients of binaries must receive the license | — |
| REQ-008 | A `CONTRIBUTING.md` and a CLA text exist. The CLA grants the copyright holder a copyright and patent license to contributions, including the right to sublicense or relicense them under other terms (e.g. commercial). A CI check blocks merging a PR from an outside contributor until they accept the CLA. Owner and AutoByteus agent identities are exempt. | BEH-005 | Must | Preserve dual-licensing rights | DEC-007 |
| REQ-009 | A dependency-compatibility result covering all production dependencies (workspace + message-gateway) is reported in the delivery result, and every AGPL-incompatible item is listed with its handling. | BEH-007 | Must | Asked by user | — |
| REQ-010 | No first-party file outside `tickets/**` claims Apache-2.0 for AGPL components. Remaining Apache-2.0 mentions are limited to the REQ-002 components, third-party files (`autobyteus-android/gradlew*`, `THIRD_PARTY_NOTICES/`), the pre-change-release statement in REQ-005 and lockfile/third-party metadata. A repeatable check proves this. | BEH-001–BEH-003 | Must | "No leftover claims" | — |
| REQ-011 | Every result for this task, and the licensing document, state that the wording and the commercial terms need lawyer review and that the team is not giving legal advice. | — | Must | User instruction | — |
| REQ-012 | Builds, tests and release workflows continue to succeed. Only license files, metadata, docs, packaging includes and the CLA workflow change. | — | Must | Preserve behavior | — |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Trigger | Observable Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Inspect root `LICENSE` after merge | Text is byte-identical to the official AGPL-3.0 text; GitHub repo `licenseInfo.key` = `agpl-3.0` | Any modification of the verbatim text fails | diff vs gnu.org text; `gh repo view` after merge |
| AC-002 | REQ-002, REQ-003 | BEH-001, BEH-006 | List per-package LICENSE files | REQ-003 dirs contain AGPL text; REQ-002 dirs contain full Apache-2.0 text | Missing or stub file fails | Script check |
| AC-003 | REQ-004 | BEH-002 | jq over all first-party `package.json` | Each `license` equals its component's mapped value; none missing | — | Script check |
| AC-004 | REQ-005, REQ-006 | BEH-003, BEH-007 | Read README, NOTICE, licensing doc | Dual-licensing model, component map, past-release note, commercial contact, named holder, DEC-006 permission (if approved), lawyer note present. Old "Commercial use and modification are allowed" absent | — | Review |
| AC-005 | REQ-007 | BEH-004 / SCN-005 | Build desktop package and Docker images | License + licensing doc present in installed app resources and in the image filesystem. Image label `org.opencontainers.image.licenses` = `AGPL-3.0-only` | — | Package/image inspection |
| AC-006 | REQ-002, REQ-003 | SCN-003, SCN-005 | `pnpm pack` each publishable package | Tarball contains the correct LICENSE and `license` field | — | pack listing |
| AC-007 | REQ-008 | BEH-005 / SCN-006 | PR from a non-allowlisted account | CLA check fails until the CLA is accepted, then passes. Owner/agent PRs pass without signing | — | CI run evidence |
| AC-008 | REQ-009 | SCN-002 | Delivery result | Compatibility table with every license family and each incompatible item's handling | — | Review |
| AC-009 | REQ-010 | BEH-001–003 | Run the leftover-claim check | Zero unexpected Apache-2.0 claims | Allowlisted items reported | Script exit code |
| AC-010 | REQ-012 | — | Run normal build/test checks touched by packaging changes | Pass as before | — | Existing commands |
| AC-011 | REQ-011 | — | Read results and licensing doc | Lawyer-review / not-legal-advice note present | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Third-party company | Take source, modify, sell closed | Clones public repo after relicensing | Repo AGPL | Modifies, distributes or hosts | Must publish full source under AGPL or buy commercial license | Uses old Apache release ≤ v1.4.97 → still Apache for that copy | Supported Normal | User goal | REQ-001,004,005 / AC-001,003,004 |
| SCN-002 | Contract | Distributor | Redistribute desktop/Docker build containing proprietary Claude SDK | Downloads release | Server bundles SDK | Redistributes | Licensing states whether combining is permitted (DEC-006) | — | Supported Normal | Dependency table | REQ-009 / AC-008 |
| SCN-003 | User | App builder | Build and ship an app (maybe closed) | `autobyteus-app create`, `pack` | SDK Apache | Bundles SDK into app | App license free to choose | If DEC-002 = AGPL SDK → app must be AGPL | Supported Normal | backend-builder.ts | REQ-002 / AC-002,006 |
| SCN-004 | User | Prospective commercial licensee | Buy a license | Reads README/licensing doc | — | Finds contact | Can reach holder | — | Supported Normal | — | REQ-005 / AC-004 |
| SCN-005 | Operational | End user / recipient | Know license of binary | Installs desktop / pulls image | — | Inspects | License text present | — | Supported Normal | build.ts | REQ-007 / AC-005 |
| SCN-006 | Operational | Outside contributor | Contribute PR | Opens PR | No CLA signed | CI check | Must accept CLA before merge | Owner/agents exempt | Supported Normal | — | REQ-008 / AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A (not applicable) for all Product design fields.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-010 / AC-009 | Compliance | Repeatable automated check of license consistency | Repo | Script exit 0 |
| QR-002 | REQ-012 / AC-010 | Compatibility | No build/test regressions | Touched packaging | Existing checks |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GNU AGPL v3 text | Verbatim | gnu.org | — |
| GitHub license detection | Needs verbatim root LICENSE | GitHub docs | Additional text in LICENSE would break detection |
| `@anthropic-ai/claude-agent-sdk` (proprietary) | Combination terms per DEC-006 | LICENSE.md in package | Lawyer review |
| CLA tooling (GitHub) | Blocks merge until CLA is accepted | — | Tool chosen in design |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| [investigation-notes.md](investigation-notes.md) | Evidence, option analysis, dependency table | All | Current | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | All commit identities other than BingQ are the owner or owner-operated agents; BingQ is a team member (user, 2026-10-08) | Copyright control | User statement | Accepted |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Public license for the product | Core goal | **Decided: AGPL-3.0-only + commercial license** | Solution Designer (delegated by user 2026-10-08) | Resolved |
| DEC-002 | SDK/interface packages license | AGPL SDK would force every distributed app to be AGPL | **Decided: Apache-2.0** for application-backend-sdk, application-frontend-sdk, application-sdk-contracts, application-devkit (incl. templates), agent-presentation/collaboration-stream/team-stream contracts, `applications/*` samples. Everything else AGPL-3.0-only | Solution Designer (delegated) | Resolved |
| DEC-003 | Legal name of copyright holder/licensor | Named in NOTICE, licensing doc, CLA, About panel | **Decided: `Yu Zheng (AutoByteus)`**. Evidence: macOS signing identity `Developer ID Application: YU ZHENG (7Y86YBQ7B4)` (individual, not organisation); GitHub org `AutoByteus` lists no company; user: "its our product license itself". Easy to change later | Solution Designer (delegated); user may correct at verification | Resolved |
| DEC-004 | Commercial-licensing contact | Buyers must know where to go | **Decided by user 2026-10-08: `ryan.zheng.work@gmail.com`** ("i dont have this email, my email is ryan.zheng.work@gmail.com"); replaces the earlier evidence-based pick `team@autobyteus.com`, which the user does not have | User | Resolved |
| DEC-005 | BingQ's contributions | Copyright control | **Resolved 2026-10-08 by user:** BingQ is a team member; no action needed | User | Resolved |
| DEC-006 | Proprietary Claude Agent SDK combined into AGPL server | Third parties redistributing builds could not comply | **Decided: narrow AGPL §7 additional permission** for `@anthropic-ai/claude-agent-sdk` and its platform companion packages | Solution Designer (delegated) | Resolved |
| DEC-007 | CLA form and enforcement | Future relicensing rights | **Decided: one CLA (individuals and entities) granting copyright + patent licence with right to relicense; enforced by an in-repo GitHub check on PRs; owner account and bots exempt** | Solution Designer (delegated) | Resolved |
| DEC-008 | Per-file SPDX headers | Churn vs clarity | **Decided: no** per-file headers | Solution Designer (delegated) | Resolved |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-002 | BEH-006 | AC-002, AC-006 | SCN-003 |
| REQ-003 | UC-001 | BEH-001 | AC-002, AC-006 | SCN-001 |
| REQ-004 | UC-001, UC-002 | BEH-002 | AC-003 | SCN-001, SCN-003 |
| REQ-005 | UC-001 | BEH-003, BEH-007 | AC-004 | SCN-001, SCN-004 |
| REQ-006 | UC-001 | BEH-003 | AC-004 | SCN-004 |
| REQ-007 | UC-003 | BEH-004 | AC-005 | SCN-005 |
| REQ-008 | UC-004 | BEH-005 | AC-007 | SCN-006 |
| REQ-009 | UC-005 | BEH-007 | AC-008 | SCN-002 |
| REQ-010 | UC-001 | BEH-001–003 | AC-009 | SCN-001 |
| REQ-011 | UC-001 | — | AC-011 | — |
| REQ-012 | All | — | AC-010 | — |

## Architecture Phase Input

- Approved scenarios: SCN-001 to SCN-006 (once approved).
- Constraints: verbatim root LICENSE; no runtime change; third-party notices preserved; historical tickets untouched.
- Deferred to design: licensing-doc file name/layout, exact NOTICE text, CLA tool and signature storage, the leftover-claim check implementation, packaging hook points (electron-builder `extraResources`, Docker COPY/LABEL, gateway packaging).
- Technical facts to verify: Gradle/Xcode license metadata; gateway release packaging; electron-builder default LICENSE handling.
- Risks: GitHub detection; CLA bot exemption for agent identities.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-08)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
