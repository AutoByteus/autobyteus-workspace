# CRR-015 — Focused failure-origin review

**Fail — API009-F001 confirmed, Local Fix to Implementation; earlier CRR014 review gap.**
Canonical authority: ../../code-review-report.md and cumulative ../../code-review-revision-record.md. Separate successful-test report unchanged.

- entry-* preserve previous canonical authorities, incoming4,196 file pins and Git state.
- check-evidence.py reads only captured API product evidence and current source; writes this directory's observations/pins. It does not change API evidence or rerun the product.
- captured-observations.json confirms exact snapshots, real new renderer, one raw/history/live input and two displayed bubbles per child, no held parent request.
- captured-response-probe-command.json/log/exit: independent rerun,2Fail expected1/received2, not an accepted result.
- reviewed-source-pins/prior-review-source-comparison/upsert-head-comparison establish19unchanged pinned paths plus one current helper equal to unchanged HEAD. No pre-merge regression claim.
- write-report.py wrote only reviewer authorities and this README; final-audit records preservation. Reference index carries all incoming references plus this review's artifacts and additional relevant source.

No production/durable-test correction, full structural review, new provider/app campaign or Git mutation. Original API assertion script was inspected but not run because it writes API-owned output. Prior overwritten IR009 logs remain CRR014 replacement evidence, not originals. All historical limitations remain canonical.
