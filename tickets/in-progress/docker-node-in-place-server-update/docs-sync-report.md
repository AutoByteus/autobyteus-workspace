# Docs Sync Report — autobyteus-305, build step 1 (signed server package)

## Scope

- Ticket: autobyteus-305, Docker nodes update their server in place (`docker-node-in-place-server-update`). Delivers **build step 1 of 5** (design-spec "Change / Refactor Sequence": each step is reviewed and merged on its own).
- Trigger: code reviewer CRR-002 Pass (post-API/E2E test-code review), after API-REV-001 Pass (95%), CRR-001 Pass, IR-001, ARCH-REV-002 Pass, SR-005.
- Bootstrap base reference: `origin/personal` @ `9d59ab82ec`
- Integrated base reference used for docs sync: `origin/personal` @ `e4bebdc858` (merged into the ticket branch as `a85cf65c52`; brings autobyteus-284, bounded shutdown)
- Post-integration verification reference: `evidence/DEL-01-post-integration-checks.log`, `evidence/DEL-02-integrated-image-start.log`, `evidence/DEL-02-integrated-image-build-excerpt.log`

## Why Docs Were Updated

- Summary: implementation already changed the long-lived docs for step 1 (DESIGN.md rule 9 exception, GLOSSARY terms, RELEASE.md 23 assets + secret + level check, TESTING.md package-layout test node, Docker README). Delivery checked them against the integrated state and fixed the three wording notes from code review (CR-N1 docs side, CR-N2, CR-N3).
- Why this should live in long-lived project docs: the release asset set, the signing secret, the system-level rule and the package layout change how every future release and Docker change is made, not only this ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Rule 9 exception (C1–C4) added by implementation | No change | Matches DEC-007 and the design spec |
| `GLOSSARY.md` | New Nodes terms | Updated | CR-N3: "built-in server package" is the published folder only for default-variant images |
| `RELEASE.md` | 23 assets, `SERVER_PACKAGE_SIGNING_KEY`, system-level check, Server Docker row | No change | Accurate on the integrated state; the base's 284 merge did not touch it |
| `TESTING.md` | Docker test-node rule rewritten for the package layout (own commit `5c33c1b7b0`) | No change | IMP-08 ran the recipe |
| `autobyteus-server-ts/docker/README.md` | Release automation and package description | Updated | CR-N2: Desktop **or** Android workflow creates the release; CR-N1 docs side: way-out command needs `-f publish_zh=true` for zh |
| `.github/workflows/release-server-docker.yml` (comment only) | Same wording as the README | Updated | CR-N2 comment; no step body changed (actionlint and 174 script tests rerun, DEL-01) |
| `README.md` (root) Docker section | Mentions launcher volumes and `/app/autobyteus-server-ts/workspace` | No change | The workspace volume stays mounted by design (FU-004); the new launcher volume comes in step 2, which updates this section |
| `autobyteus-server-ts/README.md` Docker section | Same volume list; `docker build -f …Dockerfile.monorepo` | No change | Still accurate |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `GLOSSARY.md` | Wording | "Built-in server package": for a default-variant image it is the folder the release publishes; a `zh` image builds its own and publishes none | CR-N3 (design DS-004 form 3) |
| `autobyteus-server-ts/docker/README.md` | Wording | The package job waits for the release that the Desktop Release or the Android APK Release workflow creates; the old-ref way-out command adds `-f publish_zh=true` for zh | CR-N2; docs side of CR-N1 |
| `.github/workflows/release-server-docker.yml` | Comment | Same Desktop-or-Android wording above "Wait for the GitHub release" | CR-N2 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Server package and its release assets | Each default release publishes per architecture the archive, description and signature, taken from the pushed image | design-spec DS-004, implementation-handoff | `RELEASE.md`, Docker README, GLOSSARY (implementation) |
| System level | Any edit to the image's system part needs a level raise in `system-level.json` | design-spec DS-004 | `RELEASE.md` Workflow Reference, Docker README (implementation) |
| Rule 9 exception | Only C1–C4 stay stable across versions | DEC-007 | `DESIGN.md` (implementation) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `/app/autobyteus-server-ts` server layout | `/opt/autobyteus/server-package` (built-in server package) | GLOSSARY, Docker README, TESTING.md |
| `bootstrap.sh`, `AUTOBYTEUS_WORKSPACE_ROOT`, `AUTOBYTEUS_SKIP_SYNC` | Nothing (dead) | Docker README (variables removed) |
| Base image by floating tag (`BASE_IMAGE_TAG`) | Digest pinned in `system-level.json` | RELEASE.md, Docker README |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, then repository finalization into `personal` (no release).
- Notes: CR-N1's code side (the workflow's error message should print `-f publish_zh=true` for a zh run) is a step-body change. It is not taken in delivery and stays with implementation for step 2, as `implementation-handoff.md` records.
