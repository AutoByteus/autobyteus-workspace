# Design Spec — agpl-dual-licensing, Slice 1 (licence text)

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: [requirements-doc.md](requirements-doc.md), status `Approved`. Approved by the user on 2026-10-08 ("i trust you can pick the best for me … lets go", then "approved"). Decisions DEC-001…DEC-008 resolved; DEC-004 contact set by the user to `ryan.zheng.work@gmail.com`.
- Slice direction: user 2026-10-08, "lets first work on the license file itself. because its urgent." This design covers **Slice 1** only (see Scope Split). Slice 2 is approved scope but not yet designed.
- Behavior-defining supplements: None
- Design status: `Ready` (Slice 1)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/investigation-notes.md`
- Authorities read (design reading gate, 2026-10-08): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md` (root), project `TESTING.md`; `templates/design-spec-template.md`. `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: None

> Not legal advice. The licence wording, the §7 additional permission and the commercial terms must be reviewed by a lawyer before the change is published (REQ-011).

## Scope Split

| Slice | Requirements | Content | Status |
| --- | --- | --- | --- |
| **Slice 1 — licence text (this design)** | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-011; REQ-009 reported from existing investigation; REQ-010 verified manually in this slice | Root `LICENSE`, per-package `LICENSE` files, `package.json` licence fields, new `LICENSING.md`, rewritten `NOTICE` and README "License" section | Ready for implementation |
| Slice 2 — distribution and contributions | REQ-007 (licence copy inside desktop app / Docker / gateway package, macOS About line), REQ-008 (CONTRIBUTING + CLA; enforcement form still to be confirmed with the user: manual vs bot), REQ-010 automated check | Packaging config, CLA documents, checker script | Not started; requires its own design round (SR) after Slice 1 |

Slice 1 is self-consistent on its own: after it merges, every licence statement in the repository says the same thing. Slice 2 adds no new licence terms; it only carries the same text into binaries and protects future contributions.

## Current-State Read

- Every licence statement in the repository is Apache-2.0 (BEH-001…003): root `LICENSE` (an Apache variant without the appendix, not byte-identical to apache.org), copies in `autobyteus-ts/` and `autobyteus-web/`, one-line stubs `Apache License 2.0` in the three `*-contracts` packages, no `LICENSE` in `autobyteus-server-ts`, `autobyteus-message-gateway`, the four app-SDK/devkit packages or `applications/*`; `NOTICE` and README l.677–682 cite Apache. See investigation notes, Source Log.
- These are static text and metadata files. No runtime code, test or build step reads the `license` field or the `LICENSE` text (`git grep -i apache` outside tickets matched only the files listed below plus third-party `gradlew*`). The only build consumer is npm/pnpm packing (`files` lists `LICENSE` in the eight publishable packages), which simply includes the file.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: about 30 files, all content payload (licence texts, a Markdown page, NOTICE, one README section, `license` fields in JSON). There are no runtime modules, tests, build scripts, CI or packaging configuration in this slice. Content-heavy guardrail applied: file count is payload, not structure.
- Architectural risk: `Low`
- Risk rationale: No structural surface changes. There is no API, persistence, security boundary, concurrency, deployment or ownership change, and no code reads these files at runtime. The legal consequence is real, but it belongs to the user's approved decision and the lawyer review, not to code architecture.
- Escalation trigger: if implementation finds any code, test, build or packaging step that reads, validates or copies these licence files or fields, or if any change outside the files listed below becomes necessary, stop and return a Design Impact.

## Architecture Investigation Evidence

| Source / Command | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| `curl https://www.gnu.org/licenses/agpl-3.0.txt \| shasum -a 256` | gnu.org | 661 lines, sha256 `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0` | Verbatim AGPL text for all AGPL `LICENSE` files (GitHub detection needs verbatim) | Implementation re-downloads and re-verifies |
| `curl https://www.apache.org/licenses/LICENSE-2.0.txt \| shasum -a 256` | apache.org | sha256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`; repo root `LICENSE` differs (missing appendix, `https` URL) | Use official text, not the repo's variant, for Apache components | Same |
| `git grep -I -l -E 'Apache[- ]2\.0\|Apache License\|apache\.org/licenses'` excluding tickets | repo | 22 files, listed in the File Mapping, plus third-party `autobyteus-android/gradlew{,.bat}` | Complete edit list; nothing else claims Apache | — |
| jq over first-party `package.json` | repo | Inventory in investigation notes (BEH-002) | `license` field edits | — |
| `autobyteus-application-devkit/templates/basic/package.json` | devkit | The *developer's* future app manifest | Leave untouched; the developer chooses their app's licence | — |

## Intended Change

Relicense the product to **AGPL-3.0-only** with a commercial alternative from the copyright holder **Yu Zheng (AutoByteus)**, contact **ryan.zheng.work@gmail.com**. Keep the app-building SDK, devkit, wire-contract packages and sample apps under **Apache-2.0**. Add one plain-language `LICENSING.md` that is the human-readable authority for the component map, the commercial option, the earlier-release statement and the §7 additional permission for the proprietary Claude Agent SDK.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger Or Governing Contract | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-003 / AC-001, AC-002 | Repository root `LICENSE`, GitHub licence detection | Apache variant | Verbatim AGPL v3 in root and in the 4 AGPL package dirs | DS-001 |
| BEH-002 | Contract | REQ-004 / AC-003 | `package.json` `license` | 12× Apache-2.0, 5× none | Mapped value per component | DS-001 |
| BEH-003 | Contract | REQ-005, REQ-006 / AC-004 | README, NOTICE | "Commercial use and modification are allowed" | Dual-licence statement + `LICENSING.md` | DS-001 |
| BEH-006 | Contract | REQ-002 / AC-002, AC-006 | SDK consumption by app builders | Apache, partly missing LICENSE files | Apache-2.0 kept; official full text in each of 9 dirs | DS-001 |
| BEH-007 | Contract | REQ-005 / AC-004 | Proprietary `@anthropic-ai/claude-agent-sdk` | No statement | §7 additional permission in `LICENSING.md` | DS-001 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (contract/licence change)
- Current design issue found: `No`
- Structural triggers: none fire. *Repeated coordination*, *responsibility overload* and *shared-structure looseness* could only arise if licence text were generated or validated in code. Nothing does that in this slice (the automated checker is Slice 2). *Duplication:* the AGPL text is copied into 5 locations and the Apache text into 9. That is the standard per-package convention and is required for packing (`files: ["LICENSE"]`); it is not policy duplication. `LICENSING.md` is the single human-readable authority for the component map.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: grep and jq inventories above. No reader of these files exists in code.
- Design response: direct text and metadata replacement.
- Intentional deferrals and residual risk: Slice 2 items. Until Slice 2 ships, desktop and Docker binaries built from the new source still carry no licence text (as today). This is acceptable because the source repository states the licence and the user has prioritised Slice 1.

## Terminology

- **AGPL component**: everything in the repository except the Apache component list.
- **Apache component**: `autobyteus-application-backend-sdk`, `autobyteus-application-frontend-sdk`, `autobyteus-application-sdk-contracts`, `autobyteus-application-devkit`, `autobyteus-agent-presentation-contracts`, `autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`, `applications/brief-studio`, `applications/socratic-math-teacher`.

## Legacy Removal Policy (Mandatory)

- The Apache claims for AGPL components are removed outright: the root `LICENSE` text, the copies in `autobyteus-ts` and `autobyteus-web`, the `license` fields, the NOTICE wording and the README sentence. The one-line Apache stubs in the contracts packages are replaced by the official full text.
- No dual statement such as "Apache or AGPL" is kept for AGPL components. The only historical reference is the factual sentence that releases ≤ v1.4.97 remain under Apache-2.0.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored data.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End (contract) | BEH-001…003, 006, 007 | Reader (person, GitHub, npm/pnpm) opens the repository or a package | Reader knows which licence applies, what it requires and how to buy a commercial licence | Copyright holder via root `LICENSE` + `LICENSING.md` | Single coherent licensing statement |

## Primary Execution Spine(s)

`Reader / GitHub / package manager -> root LICENSE (AGPL) -> LICENSING.md (component map, commercial option, §7, earlier releases) -> component LICENSE + package.json license -> NOTICE / README pointers`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A reader lands on the repo. GitHub shows AGPL-3.0 from the root `LICENSE`. The README "License" section summarises the dual licence and links to `LICENSING.md`, which maps every component to its licence, explains AGPL obligations in plain words, offers the commercial licence, states the §7 permission and the earlier-release fact. Each package dir carries its own `LICENSE`, and its `package.json` names the SPDX id for tools. | root LICENSE, LICENSING.md, package LICENSE/manifest | `LICENSING.md` (human authority) / `LICENSE` (legal text) | NOTICE (attribution pointer), third-party notices (unchanged) |

## Spine Actors / Main-Line Nodes

Root `LICENSE`; `LICENSING.md`; per-component `LICENSE` + `package.json`.

## Ownership Map

- Root `LICENSE`: the verbatim legal AGPL text only. Nothing else is added to it, so GitHub detection keeps working.
- `LICENSING.md`: owns the component map, plain-language summary, commercial contact, earlier-release statement, §7 additional permission, copyright line and the not-legal-advice note.
- `NOTICE` and README section: short pointers. They must not restate the component map in detail; they link to `LICENSING.md`.
- Per-package `LICENSE` and `license` field: the package-level copy for packing and tooling.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| README "License" section | `LICENSING.md` | First thing visitors read | The component list or the §7 text |
| `NOTICE` | `LICENSING.md` | Conventional attribution file | Licence terms |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Apache text in `/LICENSE`, `autobyteus-ts/LICENSE`, `autobyteus-web/LICENSE` | Product is AGPL | Verbatim AGPL | In This Change | — |
| One-line stubs in the three contracts `LICENSE` | Not a valid licence text | Official Apache-2.0 text | In This Change | — |
| README "Commercial use and modification are allowed …" | Contradicts the goal | New section | In This Change | — |
| NOTICE Apache wording | Wrong licence | New NOTICE | In This Change | — |

## Return Or Event Spine(s)

N/A, static documents.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Third-party notices (`autobyteus-web/public/THIRD_PARTY_NOTICES/`, Gradle wrapper headers) | DS-001 | Licence statement | Keep upstream licences | Legal attribution | Editing them would misstate third-party licences. **Do not touch** |

## Ownership Boundaries

`LICENSE` files hold legal text only. `LICENSING.md` holds explanation and the additional permission. Pointers link and never duplicate.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Callers | Forbidden Bypass | Fix |
| --- | --- | --- | --- | --- |
| `LICENSING.md` | Component map, §7, commercial contact | README, NOTICE | README or NOTICE restating the full map or §7 text | Link to `LICENSING.md` |

## Dependency Rules

Pointers (README, NOTICE) → `LICENSING.md` → `LICENSE` texts. Never add explanatory text into a verbatim `LICENSE` file.

## Interface Boundary Mapping

N/A, no code interfaces.

## Interface Boundary Check

N/A.

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Licensing explanation | `LICENSING.md` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Third-party notices | `THIRD_PARTY_NOTICES/` | Reuse unchanged | Already correct |
| Apache text | repo root `LICENSE` | **Do not reuse** | Not byte-identical to official text; use apache.org text |

## Subsystem / Capability-Area Allocation

Repository root (licence authority) and each package root (package copy). No code subsystem.

## Draft File Responsibility Mapping / Reusable Owned Structures / Shared Structure Tightness

N/A beyond the final mapping below; there are no code structures.

## Final File Responsibility Mapping

| File | Action | Content |
| --- | --- | --- |
| `LICENSE` | Modify (replace) | Verbatim AGPL v3 (sha256 `0d96a4ff…abcb0`) |
| `autobyteus-ts/LICENSE`, `autobyteus-web/LICENSE` | Modify (replace) | Verbatim AGPL v3 |
| `autobyteus-server-ts/LICENSE`, `autobyteus-message-gateway/LICENSE` | Add | Verbatim AGPL v3 |
| `autobyteus-agent-presentation-contracts/LICENSE`, `autobyteus-collaboration-stream-contracts/LICENSE`, `autobyteus-team-stream-contracts/LICENSE` | Modify (replace stub) | Official Apache-2.0 text (sha256 `cfc7749b…3d30`) |
| `autobyteus-application-backend-sdk/LICENSE`, `autobyteus-application-frontend-sdk/LICENSE`, `autobyteus-application-sdk-contracts/LICENSE`, `autobyteus-application-devkit/LICENSE`, `applications/brief-studio/LICENSE`, `applications/socratic-math-teacher/LICENSE` | Add | Official Apache-2.0 text |
| `package.json` (root), `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, `autobyteus-web/package.json`, `autobyteus-message-gateway/package.json` | Modify | `"license": "AGPL-3.0-only"` |
| `autobyteus-web/modules/electron/package.json`, `autobyteus-message-gateway/tools/wechaty-sidecar/package.json` | Modify | Add `"license": "AGPL-3.0-only"` |
| `applications/brief-studio/package.json`, `applications/socratic-math-teacher/package.json` | Modify | Add `"license": "Apache-2.0"` |
| 7 Apache component `package.json` | Unchanged | Already `Apache-2.0` |
| `autobyteus-application-devkit/templates/basic/package.json` | Unchanged | Developer-owned template |
| `LICENSING.md` | Add | See content specification below |
| `NOTICE` | Modify (rewrite) | See below |
| `README.md` §"License" (l.677–682) | Modify | See below |
| `autobyteus-android/gradlew*`, `autobyteus-web/public/THIRD_PARTY_NOTICES/**`, `tickets/**` | Unchanged | Third-party / historical |

Edit `package.json` files minimally: change or insert only the `license` key, keep formatting and key order, and do not reformat the file. Do not run `pnpm install`; the lockfile is unaffected.

### `LICENSING.md` content specification (normative points; wording may be polished)

1. **Title and summary.** "AutoByteus is dual-licensed: under the GNU Affero General Public License v3.0 only (AGPL-3.0-only), or under a commercial license from the copyright holder."
2. **Copyright line.** `Copyright (C) 2026 Yu Zheng (AutoByteus)`.
3. **Component table.** AGPL-3.0-only: everything not listed as Apache (name at least `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web` incl. the desktop app, `autobyteus-message-gateway`, `autobyteus-android`, `autobyteus-ios`, Docker, scripts, docs). Apache-2.0: the nine Apache components, each with one line on why ("used to build your own AutoByteus applications; your application may use any license").
4. **What AGPL means in practice (plain words).** You may use, study, modify and share. If you distribute AutoByteus or a modified version (installer, Docker image, bundled product), or let others use a modified version over a network, you must make your complete corresponding source available under AGPL-3.0. Internal use without distribution and without offering it to outside users does not trigger publication.
5. **Commercial license.** To build closed-source products or services on AutoByteus without the AGPL obligations, obtain a commercial license: contact **ryan.zheng.work@gmail.com**.
6. **Earlier releases.** Versions released up to and including v1.4.97 were published under the Apache License 2.0 and remain available under it. The AGPL-3.0-only / commercial terms apply from the commit that introduced this file onward.
7. **Additional permission under AGPL section 7.** Use this text (lawyer to review):
   > If you modify this Program, or any covered work, by linking or combining it with the Claude Agent SDK (the npm package `@anthropic-ai/claude-agent-sdk` and its platform-specific companion packages published by Anthropic PBC), or a modified version of that library, containing parts covered by the terms of that library's license, the licensors of this Program grant you additional permission to convey the resulting work. Corresponding Source for a non-source form of such a combination shall not include the source code for the parts of that library used.
8. **Third-party components** keep their own licences (point to `autobyteus-web/public/THIRD_PARTY_NOTICES/` and each dependency's own licence).
9. **Note.** "This page is a summary, not legal advice. The license texts in `LICENSE` files govern."

Do not mention a CLA in Slice 1 (it does not exist yet). Slice 2 adds the CONTRIBUTING/CLA pointer.

### `NOTICE` content specification

```
AutoByteus
Copyright (C) 2026 Yu Zheng (AutoByteus)

AutoByteus is licensed under the GNU Affero General Public License v3.0 only
(see LICENSE) or, alternatively, under a commercial license from the copyright
holder. Some SDK, devkit and contract packages are licensed under the Apache
License 2.0. See LICENSING.md for details.

Repository: https://github.com/AutoByteus/autobyteus-workspace
Third-party components retain their own licenses and notices.
```

### README "License" section content specification

Replace l.677–682 with a short section. It says AutoByteus is dual-licensed: open source under AGPL-3.0-only (link `./LICENSE`), with a one-sentence explanation of the obligation, or commercial (contact ryan.zheng.work@gmail.com). It adds one sentence that the app SDK/devkit/contract packages are permissively licensed so applications built on them may use any licence, one sentence that releases ≤ v1.4.97 remain Apache-2.0, and a link to `./LICENSING.md`. Remove "Commercial use and modification are allowed."

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping. No new folders.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| repo root | Licence authority | Yes | Low | `LICENSE`, `LICENSING.md`, `NOTICE` side by side |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Root LICENSE | Exact gnu.org text, nothing added | AGPL text with a commercial note or §7 appended at the top | GitHub detection and clean legal text |
| package.json edit | Change only the `"license"` value | Reformat the whole JSON | Minimal diff, no churn |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep Apache in parallel ("Apache OR AGPL") for core | Softer transition | Rejected | AGPL-3.0-only; earlier releases already stay Apache by law |
| Keep repo's Apache variant text for SDKs | Already present | Rejected | Official apache.org text |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Download both official texts, verify sha256 against this spec, write all `LICENSE` files.
2. Edit the `license` fields.
3. Add `LICENSING.md`, rewrite `NOTICE` and the README section.
4. Verify (Implementation Guidance §Verification), then commit as one commit, e.g. `chore(license): relicense to AGPL-3.0-only with commercial option`.

## Key Tradeoffs

- AGPL-3.0-only vs -or-later: `-only` keeps future licence terms in the holder's control.
- Per-package licence copies duplicate text but are needed for packing and clarity.
- Slice 1 before Slice 2: the binaries carry no licence text for a while (as today) in exchange for an immediate, consistent source licence.

## Risks

- **Legal wording:** needs lawyer review before publishing (REQ-011).
- **Holder name** "Yu Zheng (AutoByteus)" and the public Gmail contact: the user may correct them at verification. Each is a single string in `LICENSING.md`, `NOTICE` and README.
- **Proprietary Claude SDK redistribution terms:** a pre-existing question, outside this scope.

## Guidance For Implementation

**Verification (no runtime tests are needed; per TESTING.md, choose the smallest layer that proves the change. These are text checks):**
- `shasum -a 256` of the 5 AGPL files equals `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0`; the 9 Apache files equal `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` (AC-001, AC-002).
- jq over all first-party `package.json` (excluding `tickets/`, devkit template) matches the mapping (AC-003).
- `git grep -I -l -E 'Apache[- ]2\.0|Apache License|apache\.org/licenses' -- . ':(exclude)tickets/**' ':(exclude)**/tickets/**'` returns only the Apache component dirs, `LICENSING.md`, `NOTICE`, `README.md` (the SDK/earlier-release sentences) and `autobyteus-android/gradlew*` (AC-009 manual form).
- `pnpm -C autobyteus-ts pack --dry-run` and `pnpm -C autobyteus-application-backend-sdk pack --dry-run` list `LICENSE` (AC-006 spot check).
- `git diff --stat` shows only the files in the mapping.
- After merge (delivery): `gh repo view AutoByteus/autobyteus-workspace --json licenseInfo` reports `agpl-3.0`.

**Dependency-compatibility result (REQ-009)** is already complete in the investigation notes. Delivery includes that table in the final report; no implementation work is needed.
