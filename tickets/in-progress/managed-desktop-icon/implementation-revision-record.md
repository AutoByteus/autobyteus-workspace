# Implementation revision record — managed desktop icon

| Revision | Trigger | Classification / related | Result |
|---|---|---|---|
| IR-001 | Approved SR-001, DS-001.1, ARCH-REV-001 Pass | Initial baseline; Medium / High confirmed | Source ready for independent review |

### IR-001 — stable menu artwork and desktop identity

Prior result, findings, CRR, API-REV and DR: N/A. [Architecture review](design-review-report.md) selected a bounded native presentation owner and the existing verified-managed Electron composition point. At source 960fb46ad0, BEH-001–004: canonical launch installs the exact packaged icon, converges predecessor and current entries onto one desktop ID, and sets that identity before windows. Removal only after authorization, with exact content checks. Operator docs updated; BEH-005 delivery pending, not an implementation claim. No intentional scope or privilege change. See [current handoff](implementation-handoff.md) for production paths, clean/package boundaries and outstanding independent packaged guest scenarios. Initial visual probe revealed the expected asynchronous GNOME index delay; no cache forcing or new runtime branch was introduced.
