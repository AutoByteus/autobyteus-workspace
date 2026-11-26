# Docs Sync Report — autobyteus-657

## Scope

- Ticket: `autobyteus-657-extensions-release` (the catalog public key built into the app; RELEASE.md wording)
- Trigger: API/E2E `API-REV-001` `Pass` at 96% confidence, direct route (`task_size` `Small`, `architectural_risk` `Low`; no architecture review, no source or test-code review).
- Bootstrap base reference: `origin/personal` @ `b86817915a`
- Integrated base reference used for docs sync: `origin/personal` @ `b86817915a` (fetched at the start of delivery; it had not advanced, so the branch was already current and no merge was needed)
- Post-integration verification reference: not needed (no new base commits). The validated head was `7087d707e0`; docs sync starts from it.

## Why Docs Were Updated

- Summary: the change fills the built-in trust anchor `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM`. Two long-lived documents described the key as empty or still to be created by the founder; the change already updated them (RELEASE.md, `modules/extensions.md`). Docs sync checked them against the code and the live publication, and brought the release guide's description of the extensions repository up to date.
- Why this should live in long-lived project docs: the release guide is what a later delivery reads before every tag; it must say that the key and first releases exist (so a failing check means something changed) and which workflows the extensions repository has.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `RELEASE.md` | The release guide; the implementation changed two passages (the key wording, D-5; the catalog check's last sentence) | Updated | The implementation's passages match the requirements doc's D-5 verbatim (API/E2E read it too). Delivery removed a date from the catalog check ("Since 2026-11-26 …": a rule should not carry a date) and brought the "AutoByteus Extensions" section up to date: the repository now has a third workflow, *Check the signing key* (`gh api …/actions/workflows` lists it, active), which signs and verifies with the secret and publishes nothing. |
| `autobyteus-server-ts/docs/modules/extensions.md` | The implementation changed §3 (the catalog) | No change | It names the built-in key, its fingerprint `SHA256:75d4d2f8…ad4c`, and says the key and the repository secret change together. Delivery recomputed the fingerprint (SHA-256 of the DER public key) and it matches; the key is Ed25519 and equals the repository's `catalog-public-key.pem`. |
| `DESIGN.md` | Project design document | No change | The change adds no component, owner or contract; rule 9's second exception (the extension contract) is untouched. |
| `TESTING.md` | The testing guideline | No change | The new offline test and its fixture are described in the test's own comment; the guideline says not to describe one suite. Both typechecks ran (API-01), as the guideline asks for any TypeScript change. |
| `GLOSSARY.md` | Terms | No change | No new term. |
| `autobyteus-extensions/README.md` (the public repository, `main` @ `5427a1a`) | Its key section must agree with D-5 and RELEASE.md | No change | It already says the same (created by the approved setup script, the private key only as the secret and the founder's backup, the same fingerprint, the *Check the signing key* workflow, a key change is a coordinated change with a new app release). |
| `autobyteus-web/docs/*`, other server docs | Search for the key, `unverified`, "founder creates", "until the founder" | No change | No other live document names the empty key; the remaining `unverified` hits are the catalog status's documented value and unrelated modules. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `RELEASE.md` | Corrected (wording only; no rule changed) | The catalog check's last sentence no longer carries a date. The "AutoByteus Extensions" section names the third workflow, *Check the signing key*. | A date is the story of one ticket; the section listed two workflows where the repository has three. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Where the trust anchor came from and how it changes | The built-in key is the repository's public key, created by the approved setup script, and changes only together with the repository's secret, as a coordinated change with a new app release | `requirements-doc.md` D-5, `design-spec.md` | `RELEASE.md` (AutoByteus Extensions), `modules/extensions.md` §3, the constant's doc comment — already promoted by implementation, checked here |
| The pre-tag catalog check still applies | Rerun it before every beta and stable tag | `api-e2e-execution-coverage-report.md` | `RELEASE.md` (Extensions catalog check) — present |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM = ""` (every node `unverified`) | The repository's public key | `extension-catalog-source.ts`, `modules/extensions.md` §3, `RELEASE.md` |
| "The founder creates the key pair himself; it is never generated, printed or committed by an agent" | The D-5 wording: the setup script he approved, run on his word, possibly by an agent; no agent opens, reads, copies or commits the key | `RELEASE.md` (AutoByteus Extensions) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used; one document was corrected.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary, move the ticket to `tickets/done/`, commit, Secret Gate, finalize.
- Notes: no follow-up found. No separate `release-notes.md`: the change makes the feature that autobyteus-516's release notes describe (Settings → Extensions, install Voice Input again) work for users; it adds nothing a user would read separately, and a second file would duplicate that "What you need to do" when the notes of the release's tickets are collected.
